// Chien2D 2 Mappy maps reduced to what X85 uses: marker search over the pre-extracted JSON (tools/build-assets.mjs).
// orig: chien2d2mapa.cpp:95 (CarregaMapaMappy), :392 (PosicionaMapa), :424 (VelocidadeCamadaMapa), :445 (CamadaMarcas),
//       :564-637 (PrimeiroBlocoMarca / ProximoBlocoMarca); 02-engine §10.2. The map layer is never drawn by X85.
import { normaliza, type Dados, type MapaJson } from './assets';

// orig: chien2d2mapa.h:18-32 marker codes (cell value - offbloco)
export const C2D2M_INICIO = 0, C2D2M_FIM = 1, C2D2M_CHECK = 2,
  C2D2M_SOLIDO = 3, C2D2M_SOLIDO45 = 4, C2D2M_SOLIDO22A = 5, C2D2M_SOLIDO22B = 6,
  C2D2M_SOLIDO135 = 7, C2D2M_SOLIDO157A = 8, C2D2M_SOLIDO157B = 9,
  C2D2M_SOLIDO225 = 10, C2D2M_SOLIDO202A = 11, C2D2M_SOLIDO202B = 12,
  C2D2M_SOLIDO315 = 13, C2D2M_SOLIDO337A = 14, C2D2M_SOLIDO337B = 15,
  C2D2M_ESCADAV = 16, C2D2M_ESCADA_SD = 17, C2D2M_ESCADA_SE = 18,
  C2D2M_MORTE = 19, C2D2M_PROG = 20;

interface Mapa {
  path: string;
  json: MapaJson;
  // orig: C2D2M_Mapa buscaProximo / posicaoUltimo / blocoProcurado — here an index into markers[code]
  busca: [number, number][] | null;
  indice: number;
}

let dados: Dados | null = null;
let mapas: Mapa[] = [];

/** Must be called before loading maps (and again to reset the table). */
export function initMapas(d: Dados): void { dados = d; mapas = []; }

function pega(id: number): Mapa | undefined { return id > 0 ? mapas[id - 1] : undefined; }

// orig: chien2d2mapa.cpp:95 C2D2M_CarregaMapaMappy — 1-based id cached by path; 0 if the file does not exist
// (fase6-8 are absent from devcore 2 → 0). The tileset is only needed to draw the map, which X85 never does.
export function C2D2M_CarregaMapaMappy(fmp: string, _tileset: string): number {
  if (!dados) return 0;
  const chave = normaliza(fmp);
  const i = mapas.findIndex(m => m.path === chave);
  if (i >= 0) return i + 1;
  const json = dados.mapas.get(chave);
  if (!json) return 0;
  mapas.push({ path: chave, json, busca: null, indice: 0 });
  return mapas.length;
}

// orig: chien2d2mapa.cpp:445 C2D2M_CamadaMarcas — X85 always passes (0, 1); the JSON already holds code = value - 1
export function C2D2M_CamadaMarcas(_mapa: number, _camada: number, _offbloco: number): void {}

// orig: chien2d2mapa.cpp:564 C2D2M_PrimeiroBlocoMarca — first match in row-major order, tile centre in map pixels.
// A failed search returns null and leaves any previous iteration untouched (as the C code does).
export function C2D2M_PrimeiroBlocoMarca(mapa: number, marca: number): { x: number; y: number } | null {
  const m = pega(mapa);
  const pts = m?.json.markers[String(marca)];
  if (!m || !pts || pts.length === 0) return null;
  m.busca = pts; m.indice = 0;
  return { x: pts[0][0], y: pts[0][1] };
}

// orig: chien2d2mapa.cpp:601 C2D2M_ProximoBlocoMarca — next match after the last one; ends the search when exhausted
export function C2D2M_ProximoBlocoMarca(mapa: number): { x: number; y: number } | null {
  const m = pega(mapa);
  if (!m || !m.busca) return null;
  const i = m.indice + 1;
  if (i >= m.busca.length) { m.busca = null; return null; }
  m.indice = i;
  return { x: m.busca[i][0], y: m.busca[i][1] };
}

// orig: chien2d2mapa.cpp:392 C2D2M_PosicionaMapa — camera only matters for drawing the layer: no-op
export function C2D2M_PosicionaMapa(_mapa: number, _x: number, _y: number): void {}

// orig: chien2d2mapa.cpp:424 C2D2M_VelocidadeCamadaMapa — parallax divisor for drawing the layer: no-op
export function C2D2M_VelocidadeCamadaMapa(_mapa: number, _camada: number, _v: number): void {}
