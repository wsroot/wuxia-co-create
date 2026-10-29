#!/usr/bin/env node
/**
 * DLCServer — catalog + content packs for 《长夜安魂曲》
 * Default port 4174 (game preview stays on 4173).
 *
 * GET  /                  → 藏经阁 UI (public/index.html)
 * GET  /designer           → 设计台 (public/designer.html)
 * GET  /catalog.json
 * GET  /packages/<id>/pack.json | content.json
 * GET  /dist-packages/<id>.tgz
 * GET  /health
 * GET  /assets/*
 * POST /api/upload        → authenticated pack publish (Bearer / X-DLC-Token)
 * DELETE /api/packs/:id   → authenticated remove (same token)
 * OPTIONS                 → CORS
 *
 * Write token: env DLC_UPLOAD_TOKEN (required for POST/DELETE). If unset → 503.
 * Publish also: drop packages/<id>/{pack.json,content.json} then `npm run regen` (or --zip).
 * No public browser upload form — agents use the API.
 */
import { createServer } from 'node:http';
import {
  existsSync,
  readFileSync,
  statSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join, dirname, normalize, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { gunzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PUBLIC = join(ROOT, 'public');
const PACKAGES = join(ROOT, 'packages');
const PORT = Number(process.env.DLC_PORT || process.env.PORT || 4174);
const HOST = process.env.DLC_HOST || '0.0.0.0';
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const BODY_LIMIT = 8 * 1024 * 1024; // 8 MiB

const MIME = {
  '.json': 'application/json; charset=utf-8',
  '.tgz': 'application/gzip',
  '.gz': 'application/gzip',
  '.zip': 'application/zip',
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-DLC-Token',
  );
  res.setHeader('Cache-Control', 'no-cache');
}

function safeJoin(base, reqPath) {
  const cleaned = normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const full = join(base, cleaned);
  if (!full.startsWith(base)) return null;
  return full;
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  cors(res);
  const buf = typeof body === 'string' ? Buffer.from(body) : body;
  res.writeHead(code, { 'Content-Type': type, 'Content-Length': buf.length });
  res.end(buf);
}

function sendJson(res, code, obj) {
  send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8');
}

function sendFile(res, filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    send(res, 404, 'not found');
    return;
  }
  const buf = readFileSync(filePath);
  const type = MIME[extname(filePath)] || 'application/octet-stream';
  cors(res);
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': buf.length });
  res.end(buf);
}

function checkAuth(req) {
  const token = process.env.DLC_UPLOAD_TOKEN;
  if (!token) {
    return {
      ok: false,
      code: 503,
      error: 'upload disabled: set env DLC_UPLOAD_TOKEN on the server',
    };
  }
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const header = String(req.headers['x-dlc-token'] || '').trim();
  const got = bearer || header;
  if (!got || got !== token) {
    return { ok: false, code: 401, error: 'unauthorized' };
  }
  return { ok: true };
}

async function readBody(req, limit = BODY_LIMIT) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) {
      const err = new Error('body too large');
      err.code = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Minimal ustar reader — only files named pack.json / content.json at archive root. */
function extractPackTar(tarBuf) {
  const out = {};
  let offset = 0;
  while (offset + 512 <= tarBuf.length) {
    const header = tarBuf.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((b) => b === 0)) break; // end blocks
    const nameRaw = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const sizeOct = header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim();
    const size = parseInt(sizeOct || '0', 8) || 0;
    const typeFlag = header[156];
    const data = tarBuf.subarray(offset, offset + size);
    offset += size;
    const pad = (512 - (size % 512)) % 512;
    offset += pad;

    // skip directories / pax / etc.
    if (typeFlag !== 0 && typeFlag !== 0x30 /* '0' */ && typeFlag !== 0x00) continue;

    const base = basename(nameRaw.replace(/\\/g, '/'));
    // reject path traversal / nested paths that aren't just the two files
    if (nameRaw.includes('..') || nameRaw.startsWith('/') || nameRaw.includes('\\')) {
      throw Object.assign(new Error('tar path traversal rejected'), { code: 400 });
    }
    const parts = nameRaw.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length > 2) {
      throw Object.assign(new Error(`unexpected tar entry: ${nameRaw}`), { code: 400 });
    }
    // allow pack.json, content.json, or <id>/pack.json etc. — only root filenames matter
    if (base === 'pack.json' || base === 'content.json') {
      out[base] = data.toString('utf8');
    } else if (base && base !== '.') {
      throw Object.assign(new Error(`unexpected file in archive: ${base}`), { code: 400 });
    }
  }
  if (!out['pack.json'] || !out['content.json']) {
    throw Object.assign(new Error('archive must contain pack.json and content.json'), { code: 400 });
  }
  return {
    pack: JSON.parse(out['pack.json']),
    content: JSON.parse(out['content.json']),
  };
}

function parseMultipartPack(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType || '');
  if (!m) throw Object.assign(new Error('multipart boundary missing'), { code: 400 });
  const boundary = m[1] || m[2];
  const sep = Buffer.from(`--${boundary}`);
  let pos = 0;
  while (pos < buf.length) {
    const at = buf.indexOf(sep, pos);
    if (at < 0) break;
    let start = at + sep.length;
    if (buf[start] === 0x2d && buf[start + 1] === 0x2d) break; // closing --
    if (buf[start] === 0x0d && buf[start + 1] === 0x0a) start += 2;
    else if (buf[start] === 0x0a) start += 1;

    const next = buf.indexOf(sep, start);
    let part = buf.subarray(start, next < 0 ? buf.length : next);
    if (part.length >= 2 && part[part.length - 2] === 0x0d && part[part.length - 1] === 0x0a) {
      part = part.subarray(0, part.length - 2);
    } else if (part.length >= 1 && part[part.length - 1] === 0x0a) {
      part = part.subarray(0, part.length - 1);
    }

    const dn = indexOfDoubleNewline(part);
    if (dn >= 0) {
      const headers = part.subarray(0, dn).toString('utf8');
      const body = part.subarray(dn + (part[dn] === 0x0d ? 4 : 2));
      const nameMatch = /name="([^"]+)"/i.exec(headers);
      if (nameMatch && nameMatch[1] === 'pack') return body;
    }
    pos = next < 0 ? buf.length : next;
  }
  throw Object.assign(new Error('multipart field "pack" not found'), { code: 400 });
}

function indexOfDoubleNewline(buf) {
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a && buf[i + 2] === 0x0d && buf[i + 3] === 0x0a) {
      return i;
    }
    if (buf[i] === 0x0a && buf[i + 1] === 0x0a) return i;
  }
  return -1;
}

function validatePackPair(pack, content) {
  if (!pack || typeof pack !== 'object' || Array.isArray(pack)) {
    throw Object.assign(new Error('pack must be an object'), { code: 400 });
  }
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw Object.assign(new Error('content must be an object'), { code: 400 });
  }
  const id = pack.id;
  if (typeof id !== 'string' || !ID_RE.test(id)) {
    throw Object.assign(
      new Error(`pack.id must match ${ID_RE}`),
      { code: 400 },
    );
  }
  if (pack.kind !== 'menpai' && pack.kind !== 'pack') {
    throw Object.assign(new Error('pack.kind must be menpai|pack'), { code: 400 });
  }
  if (pack.tags !== undefined) {
    if (!Array.isArray(pack.tags) || pack.tags.some((t) => typeof t !== 'string')) {
      throw Object.assign(new Error('pack.tags must be string[] if present'), { code: 400 });
    }
  }
  // Reject reserved / system-ish ids that could confuse layout
  const reserved = new Set(['assets', 'public', 'scripts', 'dist-packages', 'node_modules']);
  if (reserved.has(id)) {
    throw Object.assign(new Error(`reserved id: ${id}`), { code: 400 });
  }
  return id;
}

function writePackFiles(id, pack, content) {
  const dir = join(PACKAGES, id);
  // Ensure we never write outside packages/
  const resolved = safeJoin(PACKAGES, id);
  if (!resolved || resolved !== dir) {
    throw Object.assign(new Error('bad package path'), { code: 400 });
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'pack.json'), JSON.stringify(pack, null, 2) + '\n');
  writeFileSync(join(dir, 'content.json'), JSON.stringify(content, null, 2) + '\n');
}

function runRegen() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(ROOT, 'scripts/regen-catalog.mjs'), '--zip'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`regen failed (${code}): ${stderr || stdout}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function catalogEntryFor(id) {
  const catPath = join(ROOT, 'catalog.json');
  if (!existsSync(catPath)) return null;
  const cat = JSON.parse(readFileSync(catPath, 'utf8'));
  return (cat.packages || []).find((p) => p.id === id) || null;
}

async function handleUpload(req, res) {
  const auth = checkAuth(req);
  if (!auth.ok) {
    sendJson(res, auth.code, { ok: false, error: auth.error });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    sendJson(res, e.code || 400, { ok: false, error: e.message || 'bad body' });
    return;
  }

  const ct = String(req.headers['content-type'] || '').toLowerCase();
  let pack;
  let content;

  try {
    if (ct.includes('application/json')) {
      const parsed = JSON.parse(body.toString('utf8'));
      pack = parsed.pack;
      content = parsed.content;
    } else if (
      ct.includes('application/gzip') ||
      ct.includes('application/x-gzip') ||
      ct.includes('application/x-tar') ||
      ct.includes('application/octet-stream')
    ) {
      const tar = gunzipSync(body);
      ({ pack, content } = extractPackTar(tar));
    } else if (ct.includes('multipart/form-data')) {
      const fileBuf = parseMultipartPack(body, req.headers['content-type']);
      // file may be raw .tgz (gzip) or already tar — try gzip first
      let tar;
      try {
        tar = gunzipSync(fileBuf);
      } catch {
        tar = fileBuf;
      }
      ({ pack, content } = extractPackTar(tar));
    } else {
      // Heuristic: try JSON, then gzip
      const asText = body.toString('utf8').trim();
      if (asText.startsWith('{')) {
        const parsed = JSON.parse(asText);
        pack = parsed.pack;
        content = parsed.content;
      } else {
        const tar = gunzipSync(body);
        ({ pack, content } = extractPackTar(tar));
      }
    }
  } catch (e) {
    sendJson(res, e.code || 400, { ok: false, error: e.message || 'parse failed' });
    return;
  }

  let id;
  try {
    id = validatePackPair(pack, content);
    writePackFiles(id, pack, content);
    await runRegen();
  } catch (e) {
    sendJson(res, e.code || 500, { ok: false, error: e.message || 'write failed' });
    return;
  }

  const entry = catalogEntryFor(id);
  sendJson(res, 200, {
    ok: true,
    id,
    md5: entry?.md5 || null,
    catalogEntry: entry,
  });
}

async function handleDelete(req, res, id) {
  const auth = checkAuth(req);
  if (!auth.ok) {
    sendJson(res, auth.code, { ok: false, error: auth.error });
    return;
  }
  if (!ID_RE.test(id)) {
    sendJson(res, 400, { ok: false, error: 'invalid id' });
    return;
  }
  const dir = safeJoin(PACKAGES, id);
  if (!dir || !existsSync(dir)) {
    sendJson(res, 404, { ok: false, error: 'pack not found' });
    return;
  }
  try {
    rmSync(dir, { recursive: true, force: true });
    const tgz = join(ROOT, 'dist-packages', `${id}.tgz`);
    if (existsSync(tgz)) rmSync(tgz, { force: true });
    await runRegen();
  } catch (e) {
    sendJson(res, 500, { ok: false, error: e.message || 'delete failed' });
    return;
  }
  sendJson(res, 200, { ok: true, id, deleted: true });
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let path = url.pathname;

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Authenticated writes
  if (req.method === 'POST' && path === '/api/upload') {
    handleUpload(req, res).catch((e) => {
      sendJson(res, 500, { ok: false, error: e.message || 'internal error' });
    });
    return;
  }

  if (req.method === 'DELETE') {
    const m = /^\/api\/packs\/([^/]+)$/.exec(path);
    if (m) {
      handleDelete(req, res, decodeURIComponent(m[1])).catch((e) => {
        sendJson(res, 500, { ok: false, error: e.message || 'internal error' });
      });
      return;
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'method not allowed');
    return;
  }

  if (path === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'DLCServer',
      port: PORT,
      upload: Boolean(process.env.DLC_UPLOAD_TOKEN),
    });
    return;
  }

  if (path === '/catalog.json') {
    const cat = join(ROOT, 'catalog.json');
    if (!existsSync(cat)) {
      sendJson(res, 503, { error: 'catalog missing; run npm run regen' });
      return;
    }
    sendFile(res, cat);
    return;
  }

  // 藏经阁 UI
  if (path === '/' || path === '/index.html') {
    sendFile(res, join(PUBLIC, 'index.html'));
    return;
  }

  // 设计台
  if (path === '/designer' || path === '/designer.html') {
    sendFile(res, join(PUBLIC, 'designer.html'));
    return;
  }

  // Static under packages/ and dist-packages/
  if (path.startsWith('/packages/') || path.startsWith('/dist-packages/') || path === '/README.md' || path === '/UPLOAD.md') {
    const rel = path.replace(/^\//, '');
    const file = safeJoin(ROOT, rel);
    if (!file) {
      send(res, 400, 'bad path');
      return;
    }
    sendFile(res, file);
    return;
  }

  // public/ assets
  if (path.startsWith('/assets/') || path.startsWith('/public/')) {
    const rel = path.startsWith('/public/') ? path.slice('/public/'.length) : path.replace(/^\//, '');
    const file = safeJoin(PUBLIC, rel);
    if (!file) {
      send(res, 400, 'bad path');
      return;
    }
    sendFile(res, file);
    return;
  }

  send(res, 404, 'not found');
});

// Ensure catalog exists on boot
if (!existsSync(join(ROOT, 'catalog.json'))) {
  console.warn('[DLCServer] catalog.json missing — run: npm run regen');
}

server.listen(PORT, HOST, () => {
  console.log(`[DLCServer] 藏经阁 UI  http://${HOST}:${PORT}/`);
  console.log(`[DLCServer] 设计台     http://${HOST}:${PORT}/designer`);
  console.log(`[DLCServer] catalog    http://${HOST}:${PORT}/catalog.json`);
  console.log(`[DLCServer] upload     POST /api/upload (token ${process.env.DLC_UPLOAD_TOKEN ? 'set' : 'UNSET → 503'})`);
  console.log(`[DLCServer] packages dir: ${join(ROOT, 'packages')}`);
});
