// Asset pipeline: X85-devcore 2/dados -> public/assets (+ manifest.json). Run with `npm run assets`.
// Output is committed so that deploys do not need afconvert / macOS tools.
import {
  copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { jpgMask, pngMask } from './mask.mjs';
import { parseFmp, markersOf } from './fmp.mjs';

const SRC = path.resolve('..', 'X85-devcore 2');
const DADOS = path.join(SRC, 'dados');
const OUT = path.resolve('public/assets');
const URL_PREFIX = 'assets/'; // relative to the site root (vite base './')
const SOURCES = ['main', 'menu', 'jogo', 'funcoes_J', 'funcoes_M'].map((n) => path.join(SRC, `${n}.cpp`));
const MAPS = [1, 2, 3, 4, 5]; // fase6-8 are not shipped (D7)

const norm = (p) => p.replace(/^\.\//, '');
const url = (rel) => URL_PREFIX + rel.split(path.sep).join('/');
const fail = (msg) => { console.error(`build-assets: ${msg}`); process.exit(1); };

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out.sort();
}

// ---- main --------------------------------------------------------------------------------------
const haveAfconvert = spawnSync('afconvert', ['-h'], { stdio: 'ignore' }).error === undefined;

// Keep committed m4a files so a machine without afconvert never loses them.
const keptM4a = new Map();
if (existsSync(OUT)) {
  for (const f of walk(OUT)) if (f.endsWith('.m4a')) keptM4a.set(path.relative(OUT, f), readFileSync(f));
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/** @type {{images: Record<string, any>, sounds: Record<string, any>, music: Record<string, any>, maps: Record<string, any>}} */
const byNorm = { images: {}, sounds: {}, music: {}, maps: {} }; // keyed by normalised path ("dados/...")

function emit(rel, data) {
  const dest = path.join(OUT, rel);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, data);
}

for (const file of walk(DADOS)) {
  const relFromSrc = path.relative(SRC, file); // dados/...
  const key = relFromSrc.split(path.sep).join('/');
  const ext = path.extname(file).toLowerCase();
  const buf = readFileSync(file);
  if (ext === '.png' || ext === '.jpg') {
    const { w, h, mask } = ext === '.png' ? pngMask(buf) : jpgMask(buf);
    emit(relFromSrc, buf);
    emit(relFromSrc + '.mask', mask);
    byNorm.images[key] = { url: url(relFromSrc), w, h, mask: url(relFromSrc + '.mask') };
  } else if (ext === '.wav' || ext === '.ogg') {
    const isRiff = buf.toString('latin1', 0, 4) === 'RIFF';
    const isOgg = buf.toString('latin1', 0, 4) === 'OggS';
    if (isRiff) {
      // click.ogg / zoop.ogg are WAV data despite the extension
      const rel = ext === '.wav' ? relFromSrc : relFromSrc.replace(/\.ogg$/i, '.wav');
      emit(rel, buf);
      byNorm.sounds[key] = { url: url(rel) };
    } else if (isOgg) {
      const oggRel = relFromSrc;
      const m4aRel = relFromSrc.replace(/\.ogg$/i, '.m4a');
      emit(oggRel, buf);
      if (keptM4a.has(m4aRel) && !process.env.FORCE_M4A) {
        // afconvert output is not byte-deterministic: reuse the committed file so reruns do not churn git
        emit(m4aRel, keptM4a.get(m4aRel));
      } else if (haveAfconvert) {
        const r = spawnSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '160000', file, path.join(OUT, m4aRel)]);
        if (r.status !== 0) fail(`afconvert failed for ${relFromSrc}: ${r.stderr}`);
      } else {
        fail(`afconvert missing and no existing ${m4aRel} to keep`);
      }
      byNorm.music[key] = { m4a: url(m4aRel), ogg: url(oggRel) };
    } else {
      fail(`${relFromSrc}: neither RIFF nor Ogg data`);
    }
  } else if (ext === '.fmp') {
    const m = /^fase(\d+)\.fmp$/.exec(path.basename(file));
    if (!m || !MAPS.includes(Number(m[1]))) continue; // fase6-8 not shipped
    const parsed = parseFmp(buf);
    const jsonRel = relFromSrc.replace(/\.fmp$/i, '.json');
    emit(jsonRel, JSON.stringify({
      width: parsed.width, height: parsed.height, tileW: parsed.tileW, tileH: parsed.tileH,
      markers: markersOf(parsed, 1),
    }));
    byNorm.maps[key] = { url: url(jsonRel) };
  }
  // anything else (recs.x85 / saves.x85: runtime save files) is not an asset
}

// ---- manifest: keys are the path strings exactly as written in the C++ sources -------------------
const referenced = new Set();
for (const f of SOURCES) {
  const text = readFileSync(f, 'latin1');
  for (const line of text.split(/\r?\n/)) {
    const code = line.replace(/\/\/.*$/, ''); // drop commented-out references (e.g. inim.png)
    for (const m of code.matchAll(/"((?:\.\/)?dados\/[^"]+)"/g)) referenced.add(m[1]);
  }
}

const manifest = { images: {}, sounds: {}, music: {}, maps: {} };
const used = new Set();
const missing = [];
for (const ref of [...referenced].sort()) {
  const n = norm(ref);
  if (n.endsWith('.x85')) continue; // runtime save files, not assets
  if (/\/fase[6-8]\.fmp$/.test(n)) continue; // D7
  const section = ['images', 'sounds', 'music', 'maps'].find((s) => byNorm[s][n]);
  if (!section) { missing.push(ref); continue; }
  manifest[section][ref] = byNorm[section][n];
  used.add(n);
}
if (missing.length) fail(`referenced paths without an asset:\n  ${missing.join('\n  ')}`);

// Shipped assets that no source string mentions (e.g. tiro3.wav, tiros) are still registered, "./dados/..." form.
for (const section of Object.keys(byNorm)) {
  for (const [n, entry] of Object.entries(byNorm[section])) {
    if (!used.has(n)) manifest[section]['./' + n] = entry;
  }
}
for (const s of Object.keys(manifest)) {
  manifest[s] = Object.fromEntries(Object.entries(manifest[s]).sort(([a], [b]) => (a < b ? -1 : 1)));
}
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const count = (o) => Object.keys(o).length;
console.log(
  `build-assets: ${count(manifest.images)} images, ${count(manifest.sounds)} sounds, ` +
  `${count(manifest.music)} music, ${count(manifest.maps)} maps -> ${path.relative(process.cwd(), OUT)}`,
);
