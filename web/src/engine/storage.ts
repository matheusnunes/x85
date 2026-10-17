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
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nome = (v: unknown): string | null => (typeof v === 'string' ? v.slice(0, NOME_MAX) : null);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** C int store of a JSON number: truncated toward zero, clamped to [lo, hi]. */
const inteiro = (v: number, lo: number, hi: number) => clamp(Math.trunc(v), lo, hi) | 0;

// orig: funcoes_M.h enum {EASY=1, NORMAL, HARD, GODMODE}; 5 planets (planeta 0..4, jogo.cpp planeta_liberado < 4)
const LEVEL_MIN = 1, LEVEL_MAX = 4, PLANETA_MAX = 4;
const PTS_MAX = 0x7fffffff;

function validaSave(v: unknown): TipoSave | null {
  if (!isRec(v)) return null;
  const n = nome(v.nome);
  if (typeof v.empty !== 'boolean' || !isNum(v.pts) || n === null || !isNum(v.level) ||
      !isNum(v.planeta_liberado) || !isNum(v.planeta_atual)) return null;
  const t = v.tiro_liberado;
  if (!Array.isArray(t) || t.length !== 6 || !t.every(x => typeof x === 'boolean')) return null;
  return { empty: v.empty, pts: inteiro(v.pts, -PTS_MAX - 1, PTS_MAX), nome: n, level: inteiro(v.level, LEVEL_MIN, LEVEL_MAX),
    planeta_liberado: inteiro(v.planeta_liberado, 0, PLANETA_MAX), planeta_atual: inteiro(v.planeta_atual, 0, PLANETA_MAX),
    tiro_liberado: [...t] as boolean[] };
}

function validaRecorde(v: unknown): TipoRecorde | null {
  if (!isRec(v)) return null;
  const n = nome(v.nome);
  if (n === null || !isNum(v.pts)) return null;
  return { nome: n, pts: inteiro(v.pts, -PTS_MAX - 1, PTS_MAX) };
}

/** Saves: a wrong-length array falls back to the 3 default slots; inside a valid array each bad slot falls back alone. */
function validaSaves(v: unknown): TipoSave[] {
  const def = savesDefault();
  if (!Array.isArray(v) || v.length !== 3) return def;
  return v.map((s, i) => validaSave(s) ?? def[i]);
}

/** Records: all-or-nothing (the ranking is one sorted table; mixing in default rows could break its order). */
function validaRecordes(v: unknown): TipoRecorde[] {
  if (!Array.isArray(v) || v.length !== 7) return recordesDefault();
  const r: TipoRecorde[] = [];
  for (const x of v) { const ok = validaRecorde(x); if (!ok) return recordesDefault(); r.push(ok); }
  return r;
}

function validaOpcoes(v: unknown): Opcoes {
  const def = padrao().opcoes;
  if (!isRec(v)) return def;
  return {
    volume_music: isNum(v.volume_music) ? inteiro(v.volume_music, 0, 100) : def.volume_music,
    volume_effects: isNum(v.volume_effects) ? inteiro(v.volume_effects, 0, 100) : def.volume_effects,
  };
}

/** D10 (web addition): per-section fallback — a corrupt section never wipes the others. Unknown version → null. */
function valida(v: unknown): Persistido | null {
  if (!isRec(v) || v.versao !== 1) return null;
  return { versao: 1, saves: validaSaves(v.saves), recordes: validaRecordes(v.recordes), opcoes: validaOpcoes(v.opcoes) };
}

/** Loads persisted data; no storage / denied / unparsable JSON / unknown version → defaults; a bad section → its defaults. */
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
