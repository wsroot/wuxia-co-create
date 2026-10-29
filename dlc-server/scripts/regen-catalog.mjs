#!/usr/bin/env node
/**
 * Scan packages/<id>/{pack.json,content.json} → catalog.json + optional zips.
 * Usage: node scripts/regen-catalog.mjs [--zip]
 */
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');
const DIST = join(ROOT, 'dist-packages');
const doZip = process.argv.includes('--zip');

function md5(buf) {
  return createHash('md5').update(buf).digest('hex');
}

async function zipDir(id, dir) {
  // Minimal zip via gzip of a tar-like concat is awkward; use store-zip of JSON files.
  // Prefer .tgz: pack.json + content.json as tar.gz via manual tar (ustar).
  mkdirSync(DIST, { recursive: true });
  const files = ['pack.json', 'content.json'].filter((f) => existsSync(join(dir, f)));
  const parts = [];
  for (const name of files) {
    const data = readFileSync(join(dir, name));
    const header = Buffer.alloc(512);
    header.write(name);
    // size octal at 124, 12 bytes
    const sizeStr = data.length.toString(8).padStart(11, '0') + '\0';
    header.write(sizeStr, 124);
    // mode
    header.write('0000644\0', 100);
    // type flag '0'
    header[156] = 0x30;
    // magic ustar
    header.write('ustar\0', 257);
    header.write('00', 263);
    // checksum
    header.fill(0x20, 148, 156);
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += header[i];
    header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148);
    parts.push(header);
    parts.push(data);
    const pad = (512 - (data.length % 512)) % 512;
    if (pad) parts.push(Buffer.alloc(pad));
  }
  parts.push(Buffer.alloc(1024)); // two zero blocks
  const tar = Buffer.concat(parts);
  const outPath = join(DIST, `${id}.tgz`);
  const gzip = createGzip();
  const ws = createWriteStream(outPath);
  await pipeline(Readable.from(tar), gzip, ws);
  const gz = readFileSync(outPath);
  return { path: outPath, size: gz.length, md5: md5(gz), file: `${id}.tgz` };
}

const entries = [];
for (const id of readdirSync(PACKAGES).sort()) {
  const dir = join(PACKAGES, id);
  if (!statSync(dir).isDirectory()) continue;
  const metaPath = join(dir, 'pack.json');
  const contentPath = join(dir, 'content.json');
  if (!existsSync(metaPath) || !existsSync(contentPath)) {
    console.warn(`skip ${id}: need pack.json + content.json`);
    continue;
  }
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  if (meta.id && meta.id !== id) {
    console.warn(`warn ${id}: pack.json id=${meta.id} ≠ folder`);
  }
  let size = 0;
  let hash = '';
  let download = `/packages/${id}/content.json`;
  if (doZip) {
    const z = await zipDir(id, dir);
    size = z.size;
    hash = z.md5;
    download = `/dist-packages/${z.file}`;
  } else {
    const buf = readFileSync(contentPath);
    size = buf.length;
    hash = md5(buf);
  }
  const tags = Array.isArray(meta.tags)
    ? meta.tags.filter((t) => typeof t === 'string' && t.trim()).map((t) => String(t).trim())
    : [];
  entries.push({
    id: meta.id || id,
    name: meta.name || id,
    kind: meta.kind === 'menpai' ? 'menpai' : 'pack',
    version: meta.version || '0.0.0',
    description: meta.description || '',
    tags,
    size,
    md5: hash,
    download,
    content: `/packages/${id}/content.json`,
    builtin: !!meta.builtin,
  });
}

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  packages: entries,
};
writeFileSync(join(ROOT, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`catalog.json: ${entries.length} packages`);
for (const e of entries) console.log(`  ${e.kind}\t${e.id}\tv${e.version}\t${e.size}B\t${e.md5.slice(0, 8)}…\t${e.download}`);
