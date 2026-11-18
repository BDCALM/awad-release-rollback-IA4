import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(envName) {
  const candidatePaths = [
    resolve(__dirname, `../env/${envName}.env`),
    resolve(process.cwd(), `env/${envName}.env`),
    resolve(process.cwd(), '.env'),
  ];

  for (const envFile of candidatePaths) {
    if (existsSync(envFile)) {
      try {
        const content = readFileSync(envFile, 'utf8');
        for (const rawLine of content.split(/\r?\n/)) {
          const line = rawLine.trim();
          if (!line || line.startsWith('#')) continue;
          const eqIdx = line.indexOf('=');
          if (eqIdx === -1) continue;
          const key = line.slice(0, eqIdx).trim();
          let value = line.slice(eqIdx + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = value;
          }
        }
        break;
      } catch {}
    }
  }
}

const currentEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';
loadEnvFile(currentEnv);

const env = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';
const port = Number(process.env.PORT ?? 3000);
const dbPath = process.env.DB_PATH ?? (env === 'development' ? './data/app.db' : '/data/app.db');
const baseUrl = process.env.BASE_URL ?? (env === 'production' ? 'https://links.example.com' : `http://localhost:${port}`);
const adminToken = process.env.ADMIN_TOKEN ?? (env === 'production' ? '' : 'dev-secret');
const version = process.env.APP_VERSION ?? '2.0.0';

export const config = {
  env,
  port,
  dbPath,
  baseUrl,
  adminToken,
  version,
};

if (config.env === 'production') {
  if (!config.adminToken || config.adminToken.trim() === '') {
    console.error('Configuration error: ADMIN_TOKEN is required in production environment.');
    process.exit(1);
  }
  if (config.adminToken === 'dev-secret') {
    console.error('Configuration error: ADMIN_TOKEN must not use the insecure default token in production.');
    process.exit(1);
  }
}
