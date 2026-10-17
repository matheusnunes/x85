// Asset loading: manifest, images, 1-bit collision masks and map JSON (see tools/build-assets.mjs).
// Replaces the IMG_Load / Mappy file reads of Chien2D 2. All Dados maps are keyed by normaliza(path).

export interface Manifest {
  images: Record<string, { url: string; w: number; h: number; mask?: string }>;
  sounds: Record<string, { url: string }>;
  music: Record<string, { m4a: string; ogg: string }>;
  maps: Record<string, { url: string }>;
}

/** 1 bit per pixel; row y starts at word y*ldwords; bit (x&31) of word (x>>5) = solid. */
export interface Mascara { w: number; h: number; ldwords: number; bits: Uint32Array }

// Ruling R1: single owner of the loaded map type.
export interface MapaJson { width: number; height: number; tileW: number; tileH: number; markers: Record<string, [number, number][]> }

export interface Dados {
  manifest: Manifest;
  imagens: Map<string, TexImageSource | null>;
  mascaras: Map<string, Mascara>;
  mapas: Map<string, MapaJson>;
}

/** The C++ code uses both "./dados/..." and "dados/..." for the same file. */
export function normaliza(path: string): string {
  let p = path;
  while (p.startsWith('./')) p = p.slice(2);
  return p;
}

/** .mask file: LE Uint32 [w, h], then h rows of ceil(w/32) LE Uint32 words. */
export function parseMascara(buf: ArrayBuffer): Mascara {
  if (buf.byteLength < 8) throw new Error('mascara: header truncado');
  const dv = new DataView(buf);
  const w = dv.getUint32(0, true), h = dv.getUint32(4, true);
  const ldwords = Math.ceil(w / 32);
  const n = ldwords * h;
  if (buf.byteLength < 8 + n * 4) throw new Error(`mascara: esperava ${8 + n * 4} bytes, recebeu ${buf.byteLength}`);
  const bits = new Uint32Array(n);
  for (let i = 0; i < n; i++) bits[i] = dv.getUint32(8 + i * 4, true);
  return { w, h, ldwords, bits };
}

function junta(base: string, url: string): string {
  if (base === '' || base.endsWith('/')) return base + url;
  return base + '/' + url;
}

async function busca(url: string): Promise<Response> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`falha ao carregar ${url}: ${r.status}`);
  return r;
}

/** Fetches the manifest and every image/mask/map it lists. `base` is the folder holding `assets/` (e.g. "./"). */
export async function carregaTudo(base: string, onProgress?: (f: number) => void): Promise<Dados> {
  const manifest = (await (await busca(junta(base, 'assets/manifest.json'))).json()) as Manifest;
  const imagens = new Map<string, TexImageSource | null>();
  const mascaras = new Map<string, Mascara>();
  const mapas = new Map<string, MapaJson>();
  const tarefas: (() => Promise<void>)[] = [];
  for (const [k, e] of Object.entries(manifest.images)) {
    const chave = normaliza(k);
    tarefas.push(async () => {
      const blob = await (await busca(junta(base, e.url))).blob();
      imagens.set(chave, await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }));
    });
    const mask = e.mask;
    if (mask) tarefas.push(async () => { mascaras.set(chave, parseMascara(await (await busca(junta(base, mask))).arrayBuffer())); });
  }
  for (const [k, e] of Object.entries(manifest.maps)) {
    tarefas.push(async () => { mapas.set(normaliza(k), (await (await busca(junta(base, e.url))).json()) as MapaJson); });
  }
  let feitas = 0;
  onProgress?.(0);
  await Promise.all(tarefas.map(async t => { await t(); feitas++; onProgress?.(feitas / tarefas.length); }));
  return { manifest, imagens, mascaras, mapas };
}
