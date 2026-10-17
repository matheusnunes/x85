// Headless Dados built from web/public/assets via fs (images are null; masks and maps parsed from files).
// Vitest runs from web/, so paths are relative to it.
import { readFileSync } from 'node:fs';
import { normaliza, parseMascara, type Dados, type Manifest, type MapaJson, type Mascara } from '../../src/engine/assets';

const BASE = 'public/';
const texto = (url: string): string => new TextDecoder().decode(readFileSync(BASE + url));
const binario = (url: string): ArrayBuffer => new Uint8Array(readFileSync(BASE + url)).buffer;

let cache: Dados | null = null;

export function dadosDeTeste(): Dados {
  if (cache) return cache;
  const manifest = JSON.parse(texto('assets/manifest.json')) as Manifest;
  const imagens = new Map<string, TexImageSource | null>();
  const mascaras = new Map<string, Mascara>();
  const mapas = new Map<string, MapaJson>();
  for (const [k, e] of Object.entries(manifest.images)) {
    imagens.set(normaliza(k), null);
    if (e.mask) mascaras.set(normaliza(k), parseMascara(binario(e.mask)));
  }
  for (const [k, e] of Object.entries(manifest.maps)) mapas.set(normaliza(k), JSON.parse(texto(e.url)) as MapaJson);
  cache = { manifest, imagens, mascaras, mapas };
  return cache;
}

/** In-memory Storage (localStorage stand-in) for persistence tests. */
export function memStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, String(v)); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}
