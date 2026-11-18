import { config } from './config.js';
import { open } from './db.js';
import { createApp } from './app.js';

const db = open(config.dbPath);
const server = createApp(db, config);

server.listen(config.port, () =>
  console.log(`linkbox ${config.version} (${config.env}) on :${config.port}, db ${config.dbPath}`));

function gracefulShutdown() {
  server.close(() => {
    try {
      db.close();
    } catch {}
    process.exit(0);
  });
  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
