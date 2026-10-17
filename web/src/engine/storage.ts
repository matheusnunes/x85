// Saves, records and options persisted in localStorage. Never throws.
// orig: funcoes_M.cpp (menu_recordes_default :139, menu_saves_default :203, menu_saves_edit :249), funcoes_M.h tiposave/tiporecorde.

export const CHAVE = 'x85:v1';

// orig: funcoes_M.h:19 tiposave (nome is char[15] -> max 14 chars)
export interface TipoSave {
  empty: boolean; pts: number; nome: string; level: number;
  planeta_liberado: number; planeta_atual: number; tiro_liberado: boolean[] /* 6 */;
}
// orig: funcoes_M.h:13 tiporecorde
export interface TipoRecorde { nome: string; pts: number }
export interface Opcoes { volume_music: number; volume_effects: number }
export interface Persistido { versao: 1; saves: TipoSave[] /* 3 */; recordes: TipoRecorde[] /* 7 */; opcoes: Opcoes }

const NOME_MAX = 14; // orig: char nome[15]
const EASY = 1; // orig: funcoes_M.h enum {EASY=1, NORMAL, HARD, GODMODE}

// orig: funcoes_M.cpp:139 menu_recordes_default
function recordesDefault(): TipoRecorde[] {
  return [
    { nome: 'Matheus', pts: 9000 },
    { nome: 'Argus', pts: 8000 },
    { nome: 'chucknorris', pts: 3000 },
    { nome: 'magaiver', pts: 2000 },
    { nome: 'loser', pts: 1000 },
    { nome: 'bill', pts: 600 },
    { nome: 'noob', pts: 500 },
  ];
}

// orig: funcoes_M.cpp:203 menu_saves_default -> menu_saves_edit(i, "new", EASY, true) x3
function savesDefault(): TipoSave[] {
  return [0, 1, 2].map(() => ({
    empty: true, pts: 0, nome: 'new', level: EASY,
    planeta_liberado: 0, planeta_atual: 0,
    tiro_liberado: [true, false, false, false, false, false], // orig: funcoes_M.cpp:263
  }));
}

export function padrao(): Persistido {
  // the original never persisted volume (01-game-spec 8); 30/30 is the web default (D10)
  return { versao: 1, saves: savesDefault(), recordes: recordesDefault(), opcoes: { volume_music: 30, volume_effects: 30 } };
}

function obtemStore(store: Storage | null | undefined): Storage | null {
  if (store !== undefined) return store;
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nome = (v: unknown): string | null => (typeof v === 'string' ? v.slice(0, NOME_MAX) : null);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function validaSave(v: unknown): TipoSave | null {
  if (!isRec(v)) return null;
  const n = nome(v.nome);
  if (typeof v.empty !== 'boolean' || !isInt(v.pts) || n === null || !isInt(v.level) ||
      !isInt(v.planeta_liberado) || !isInt(v.planeta_atual)) return null;
  const t = v.tiro_liberado;
  if (!Array.isArray(t) || t.length !== 6 || !t.every(x => typeof x === 'boolean')) return null;
  return { empty: v.empty, pts: v.pts | 0, nome: n, level: v.level | 0,
    planeta_liberado: v.planeta_liberado | 0, planeta_atual: v.planeta_atual | 0, tiro_liberado: [...t] as boolean[] };
}

function validaRecorde(v: unknown): TipoRecorde | null {
  if (!isRec(v)) return null;
  const n = nome(v.nome);
  if (n === null || !isInt(v.pts)) return null;
  return { nome: n, pts: v.pts | 0 };
}

function valida(v: unknown): Persistido | null {
  if (!isRec(v) || v.versao !== 1) return null;
  if (!Array.isArray(v.saves) || v.saves.length !== 3) return null;
  if (!Array.isArray(v.recordes) || v.recordes.length !== 7) return null;
  if (!isRec(v.opcoes) || !isInt(v.opcoes.volume_music) || !isInt(v.opcoes.volume_effects)) return null;
  const saves: TipoSave[] = [];
  for (const s of v.saves) { const r = validaSave(s); if (!r) return null; saves.push(r); }
  const recordes: TipoRecorde[] = [];
  for (const s of v.recordes) { const r = validaRecorde(s); if (!r) return null; recordes.push(r); }
  return { versao: 1, saves, recordes,
    opcoes: { volume_music: clamp(v.opcoes.volume_music | 0, 0, 100), volume_effects: clamp(v.opcoes.volume_effects | 0, 0, 100) } };
}

/** Loads persisted data; any failure (no storage, denied, corrupt, wrong shape) yields the defaults. */
export function carrega(store?: Storage | null): Persistido {
  try {
    const s = obtemStore(store);
    const txt = s?.getItem(CHAVE);
    if (!txt) return padrao();
    return valida(JSON.parse(txt)) ?? padrao();
  } catch {
    return padrao();
  }
}

/** Saves; silently ignores quota/denied errors (the game keeps running with in-memory state). */
export function grava(p: Persistido, store?: Storage | null): void {
  try {
    obtemStore(store)?.setItem(CHAVE, JSON.stringify(p));
  } catch {
    /* storage unavailable or full: ignore */
  }
}
