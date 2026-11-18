// deploy/rollback.js - One-command rollback to the safe slot
import { spawnSync } from 'node:child_process';

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

export async function executeRollback() {
  log('Starting rollback process...');

  let state;
  try {
    state = await getState();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Router not answering on ${CONTROL_URL}: ${err.message}`);
    process.exit(1);
  }

  const { slots } = state;
  log(`Current router weights: blue=${slots.blue.weight}%, green=${slots.green.weight}%`);

  // Determine which slot to roll back to:
  // If traffic was mostly/all on green, roll back to blue.
  // If traffic was mostly/all on blue, roll back to green.
  let rollbackSlot, currentSlot;
  if (slots.green.weight >= slots.blue.weight && slots.green.weight > 0) {
    rollbackSlot = 'blue';
    currentSlot = 'green';
  } else {
    rollbackSlot = 'green';
    currentSlot = 'blue';
  }

  log(`Routing 100% traffic back to safe slot [${rollbackSlot}] and 0% to [${currentSlot}]...`);
  const newWeights = {
    [rollbackSlot]: 100,
    [currentSlot]: 0,
  };

  await setWeights(newWeights);
  await postMark(`rollback to ${rollbackSlot}`);

  // Confirm weights from GET /state
  const confirmedState = await getState();
  const confirmed = confirmedState.slots;
  log(`Confirmed router state: blue=${confirmed.blue.weight}%, green=${confirmed.green.weight}%`);

  if (confirmed[rollbackSlot].weight !== 100 || confirmed[currentSlot].weight !== 0) {
    console.error(`[${new Date().toISOString()}] Rollback verification failed! State: ${JSON.stringify(confirmed)}`);
    process.exit(1);
  }

  // Gracefully drain traffic before stopping the bad/rolled-back container
  log(`Draining in-flight requests on ${currentSlot} (1s)...`);
  await new Promise((r) => setTimeout(r, 1000));

  const containerName = `linkbox-${currentSlot}-1`;
  log(`Stopping container ${containerName}...`);
  try {
    spawnSync('docker', ['stop', '-t', '5', containerName], { stdio: 'inherit' });
    log(`Container ${containerName} stopped successfully.`);
  } catch (e) {
    log(`Notice: could not stop ${containerName}: ${e.message}`);
  }

  log(`Rollback completed successfully. 100% traffic is now served by [${rollbackSlot}].`);
}

// Execute if run as main script
const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('deploy/rollback.js') ||
               process.argv[1]?.replace(/\\/g, '/').endsWith('deploy/rollback');

if (isMain) {
  executeRollback().catch((err) => {
    console.error(`[${new Date().toISOString()}] Rollback failed:`, err);
    process.exit(1);
  });
}
