import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';

// v2 of the short-link service.

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const newCode = () => [...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join('');

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return null; }
}

const isUrl = (u) => typeof u === 'string' && /^https?:\/\/\S+$/.test(u);

export function createApp(db, config) {
  const q = {
    hit: db.prepare('UPDATE links SET hits = hits + 1 WHERE code = ?'),
    ping: db.prepare('SELECT 1'),
  };

  let stmtInsert4, stmtInsert3;
  let stmtGet4, stmtGet3;
  let stmtList4, stmtList3;

  function insertLink(code, url, expiresAt) {
    try {
      stmtInsert4 ??= db.prepare('INSERT INTO links (code, url, expires_at) VALUES (?, ?, ?)');
      return stmtInsert4.run(code, url, expiresAt);
    } catch (err) {
      if (/no such column/i.test(err.message)) {
        stmtInsert3 ??= db.prepare('INSERT INTO links (code, url) VALUES (?, ?)');
        return stmtInsert3.run(code, url);
      }
      throw err;
    }
  }

  function getLink(code) {
    try {
      stmtGet4 ??= db.prepare('SELECT code, url, hits, expires_at FROM links WHERE code = ?');
      return stmtGet4.get(code);
    } catch (err) {
      if (/no such column/i.test(err.message)) {
        stmtGet3 ??= db.prepare('SELECT code, url, hits FROM links WHERE code = ?');
        return stmtGet3.get(code);
      }
      throw err;
    }
  }

  function listLinks(limit, offset) {
    try {
      stmtList4 ??= db.prepare('SELECT code, url, hits, expires_at FROM links ORDER BY id DESC LIMIT ? OFFSET ?');
      return stmtList4.all(limit, offset);
    } catch (err) {
      if (/no such column/i.test(err.message)) {
        stmtList3 ??= db.prepare('SELECT code, url, hits FROM links ORDER BY id DESC LIMIT ? OFFSET ?');
        return stmtList3.all(limit, offset);
      }
      throw err;
    }
  }

  function getExpiryFlag() {
    try {
      const row = db.prepare("SELECT value FROM flags WHERE name = 'expiry'").get();
      return row ? (row.value === '1' || row.value === 'true') : false;
    } catch {
      return false;
    }
  }

  function setExpiryFlag(enabled) {
    try {
      db.exec('CREATE TABLE IF NOT EXISTS flags (name TEXT PRIMARY KEY, value TEXT NOT NULL)');
      db.prepare("INSERT OR REPLACE INTO flags (name, value) VALUES ('expiry', ?)").run(enabled ? '1' : '0');
    } catch (err) {
      console.error('Failed to set expiry flag:', err);
      throw err;
    }
  }

  const view = (row) => {
    const flagOn = getExpiryFlag();
    return {
      code: row.code,
      url: row.url,
      shortUrl: `${config.baseUrl}/r/${row.code}`,
      hits: row.hits,
      expiresAt: flagOn ? (row.expires_at ?? null) : null,
    };
  };

  const json = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const error = (res, status, code, message) => json(res, status, { error: code, message });

  async function handle(req, res) {
    res.setHeader('x-app-version', config.version);
    const url = new URL(req.url, 'http://x');
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET' && url.pathname === '/health') {
      q.ping.get();
      return json(res, 200, { ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/version') {
      return json(res, 200, {
        version: config.version,
        env: config.env,
        flags: {
          expiry: getExpiryFlag(),
        },
      });
    }
    // tools/check.js uses this to hold a request open during `docker stop`. Leave it in.
    if (req.method === 'GET' && url.pathname === '/__probe/slow') {
      const ms = Math.min(Number(url.searchParams.get('ms') ?? 1000), 5000);
      await new Promise((r) => setTimeout(r, ms));
      return json(res, 200, { waited: ms });
    }

    if (parts[0] === 'admin' && parts[1] === 'flags' && parts[2] === 'expiry' && parts.length === 3) {
      const token = req.headers['x-admin-token'];
      if (!config.adminToken || token !== config.adminToken) {
        return error(res, 401, 'unauthorized', 'invalid or missing admin token');
      }

      if (req.method === 'PUT') {
        const body = await readBody(req);
        if (!body || typeof body.enabled !== 'boolean') {
          return error(res, 400, 'invalid_body', 'enabled (boolean) is required in request body');
        }
        setExpiryFlag(body.enabled);
        return json(res, 200, { name: 'expiry', enabled: body.enabled });
      }

      if (req.method === 'GET') {
        return json(res, 200, { name: 'expiry', enabled: getExpiryFlag() });
      }

      return error(res, 405, 'method_not_allowed', 'method not allowed');
    }

    if (parts[0] === 'links' && parts.length === 1) {
      if (req.method === 'GET') {
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
        const offset = Number(url.searchParams.get('offset') ?? 0);
        return json(res, 200, listLinks(limit, offset).map(view));
      }
      if (req.method === 'POST') {
        const body = await readBody(req);
        if (!body || !isUrl(body.url)) return error(res, 400, 'invalid_body', 'url (http or https) is required');

        const flagOn = getExpiryFlag();
        let expiresAt = null;

        if (flagOn && body.expiresInSeconds !== undefined) {
          if (
            typeof body.expiresInSeconds !== 'number' ||
            !Number.isInteger(body.expiresInSeconds) ||
            body.expiresInSeconds <= 0
          ) {
            return error(res, 400, 'invalid_body', 'expiresInSeconds must be a positive whole number');
          }
          expiresAt = new Date(Date.now() + body.expiresInSeconds * 1000).toISOString();
        }

        const code = newCode();
        insertLink(code, body.url, expiresAt);
        return json(res, 201, view(getLink(code)));
      }
    }

    if (req.method === 'GET' && parts[0] === 'links' && parts.length === 2) {
      const row = getLink(parts[1]);
      if (!row) return error(res, 404, 'not_found', `no link ${parts[1]}`);
      return json(res, 200, view(row));
    }

    if (req.method === 'GET' && parts[0] === 'r' && parts.length === 2) {
      const row = getLink(parts[1]);
      if (!row) return error(res, 404, 'not_found', `no link ${parts[1]}`);

      const flagOn = getExpiryFlag();
      if (flagOn && row.expires_at) {
        const expTime = Date.parse(row.expires_at);
        if (!Number.isNaN(expTime) && Date.now() >= expTime) {
          return json(res, 410, { error: 'expired', message: 'link has expired' });
        }
      }

      q.hit.run(row.code);
      res.writeHead(302, { location: row.url });
      return res.end();
    }

    return error(res, 404, 'not_found', 'no such route');
  }

  return createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error(e);
      if (!res.headersSent) error(res, 500, 'internal', e.message);
      else res.end();
    });
  });
}
