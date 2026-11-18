// deploy/release.js - Automated canary release with health check and error gate
import { spawnSync } from 'node:child_process';
import { executeRollback } from './rollback.js';

const CONTROL_URL = process.env.CONTROL_URL ?? 'http://127.0.0.1:8081';

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function getState() {
  const res = await fetch(`${CONTROL_URL}/state`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${CONTROL_URL}/state`);
  return await res.json();
}

async function setWeights(weights) {
  const res = await fetch(`${CONTROL_URL}/weights`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(weights),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} setting weights: ${await res.text()}`);
  return await res.json();
}

async function postMark(text) {
  try {
    await fetch(`${CONTROL_URL}/mark`, {
      method: 'POST',
      body: text,
      signal: AbortSignal.timeout(2000),
    });
  } catch {}
}

async function waitForHealthy(containerName, maxWaitSeconds = 60) {
  log(`Waiting for ${containerName} to report healthy in Docker (max ${maxWaitSeconds}s)...`);
  const t0 = Date.now();
  while (Date.now() - t0 < maxWaitSeconds * 1000) {
    const inspect = spawnSync(
      'docker',
      ['inspect', '-f', '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}', containerName],
      { encoding: 'utf8' }
    );
    const status = (inspect.stdout ?? '').trim();
    const running = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', containerName], {
      encoding: 'utf8',
    }).stdout?.trim();

    if (running !== 'true') {
      throw new Error(`Container ${containerName} stopped running (status: ${status})`);
    }

    if (status === 'healthy') {
      log(`${containerName} reports HEALTHY!`);
      return true;
    }

    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${containerName} to become healthy`);
}

async function monitorCanaryStage(targetSlot, targetWeight, activeSlot, activeWeight, durationSeconds, maxErrors = 2, maxErrorRate = 0.05) {
  log(`Applying canary stage: target [${targetSlot}]=${targetWeight}%, active [${activeSlot}]=${activeWeight}% for ${durationSeconds}s...`);

  await setWeights({ [targetSlot]: targetWeight, [activeSlot]: activeWeight });
  await postMark(`canary stage: ${targetSlot}=${targetWeight}%, ${activeSlot}=${activeWeight}%`);

  // Record initial router counters for targetSlot
  const initialState = await getState();
  const initErrors = initialState.slots[targetSlot].errors;
  const initRequests = initialState.slots[targetSlot].requests;

  const t0 = Date.now();
  const endTime = t0 + durationSeconds * 1000;

  while (Date.now() < endTime) {
    await new Promise((r) => setTimeout(r, 1000));
    const elapsed = Math.round((Date.now() - t0) / 1000);

    const currState = await getState();
    const currErrors = currState.slots[targetSlot].errors - initErrors;
    const currRequests = currState.slots[targetSlot].requests - initRequests;
    const errorRate = currRequests > 0 ? currErrors / currRequests : 0;

    log(
      `[Canary ${targetWeight}% @ ${elapsed}s/${durationSeconds}s] ${targetSlot}: ${currRequests} reqs, ${currErrors} errors (${(errorRate * 100).toFixed(1)}%)`
    );

    // Automated Canary Gate Check:
    // If error rate exceeds threshold (>5% after 10 requests or >= 2 errors), immediately abort and rollback!
    if (currErrors >= maxErrors || (currRequests >= 10 && errorRate > maxErrorRate)) {
      console.error(`\n======================================================`);
      console.error(`[${new Date().toISOString()}] !!! AUTOMATED CANARY GATE TRIGGERED !!!`);
      console.error(
        `[${new Date().toISOString()}] Error threshold exceeded on ${targetSlot}: ${currErrors} errors in ${currRequests} requests (${(errorRate * 100).toFixed(1)}%).`
      );
      console.error(`[${new Date().toISOString()}] Halting release and executing automated rollback...`);
      console.error(`======================================================\n`);

      // 1. Immediately cut all traffic to targetSlot and restore activeSlot to 100%
      await setWeights({ [activeSlot]: 100, [targetSlot]: 0 });
      await postMark(`canary gate tripped on ${targetSlot}: auto-rollback to ${activeSlot}`);

      // 2. Allow 1s for draining, then stop the bad container
      log(`Draining traffic from bad container linkbox-${targetSlot}-1 (1s)...`);
      await new Promise((r) => setTimeout(r, 1000));
      spawnSync('docker', ['stop', '-t', '5', `linkbox-${targetSlot}-1`], { stdio: 'inherit' });

      // 3. Confirm weights
      const confirmedState = await getState();
      log(
        `Confirmed router state after auto-rollback: blue=${confirmedState.slots.blue.weight}%, green=${confirmedState.slots.green.weight}%`
      );

      throw new Error(`Canary gate tripped: ${currErrors} errors detected on ${targetSlot}`);
    }
  }

  log(`Canary stage [${targetWeight}%] completed successfully with 0 gate violations.`);
}

async function main() {
  const args = process.argv.slice(2);
  let tag = args.find((a) => !a.startsWith('-'));
  if (!tag) {
    const tagArg = args.find((a) => a.startsWith('--tag='));
    if (tagArg) tag = tagArg.split('=')[1];
  }

  if (!tag) {
    console.error('Usage: npm run release -- <tag>');
    process.exit(2);
  }
  tag = tag.replace(/^linkbox:/, '');

  log(`========================================`);
  log(`Starting release for image linkbox:${tag}`);
  log(`========================================`);

  // Step 1: Query router state and determine active and target idle slots
  let state;
  try {
    state = await getState();
  } catch (err) {
    console.error(`Router not answering on ${CONTROL_URL}: ${err.message}`);
    process.exit(1);
  }

  const { slots } = state;
  let activeSlot, targetSlot;
  if (slots.green.weight > 0 && slots.blue.weight === 0) {
    activeSlot = 'green';
    targetSlot = 'blue';
  } else if (slots.blue.weight > 0 && slots.green.weight === 0) {
    activeSlot = 'blue';
    targetSlot = 'green';
  } else {
    // If weights are split or both 0, target the slot with fewer requests/weights
    if (slots.blue.weight >= slots.green.weight) {
      activeSlot = 'blue';
      targetSlot = 'green';
    } else {
      activeSlot = 'green';
      targetSlot = 'blue';
    }
  }

  log(`Current state: active=[${activeSlot}] (${slots[activeSlot].weight}%), target idle slot=[${targetSlot}]`);

  // Step 2: Start new image in the idle target slot
  const slotEnv = targetSlot === 'blue' ? 'BLUE_TAG' : 'GREEN_TAG';
  log(`Starting linkbox:${tag} in service [${targetSlot}] via docker compose...`);

  const compose = spawnSync('docker', ['compose', 'up', '-d', '--no-deps', targetSlot], {
    stdio: 'inherit',
    env: { ...process.env, [slotEnv]: tag },
  });

  if (compose.status !== 0) {
    console.error(`Failed to start docker compose service [${targetSlot}]`);
    process.exit(1);
  }

  // Step 3: Health check first (CRITICAL REQUIREMENT 1)
  const containerName = `linkbox-${targetSlot}-1`;
  await waitForHealthy(containerName, 60);
  await postMark(`slot ${targetSlot} linkbox:${tag} is healthy`);

  // Step 4: Canary Stages (CRITICAL REQUIREMENTS 2 & 3)
  // Stage 1: 20% traffic (<= 25%) held for 12 seconds (>= 10s)
  await monitorCanaryStage(targetSlot, 20, activeSlot, 80, 12);

  // Stage 2: 50% traffic held for 10 seconds (>= 2 stages below 100%)
  await monitorCanaryStage(targetSlot, 50, activeSlot, 50, 10);

  // Step 5: Full Cutover 100% traffic to targetSlot
  log(`Promoting [${targetSlot}] to 100% traffic...`);
  await setWeights({ [targetSlot]: 100, [activeSlot]: 0 });
  await postMark(`release linkbox:${tag} to ${targetSlot} at 100% complete`);

  const finalState = await getState();
  log(
    `Final router state: blue=${finalState.slots.blue.weight}%, green=${finalState.slots.green.weight}%`
  );
  log(`Release of linkbox:${tag} completed successfully! Old slot [${activeSlot}] is left running.`);
}

main().catch((err) => {
  console.error(`[${new Date().toISOString()}] Release failed: ${err.message}`);
  process.exit(1);
});
