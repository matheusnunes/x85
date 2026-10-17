// Input with Chien2D edge semantics. orig: chien2d2.h (C2D2_* key enum, C2D2_Botao, C2D2_Mouse), chien2d2.cpp C2D2_Entrada.

// orig: chien2d2.h:55 (order identical to the C enum). K_ is C2D2_K.
export enum K {
  CIMA, BAIXO, DIREITA, ESQUERDA, ESC, F1, F2, F3, F4,
  A, B, C, D, E, F, G, H, I, J, K_, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
  N0, N1, N2, N3, N4, N5, N6, N7, N8, N9,
  ENTER, ESPACO, BACKSPACE, LALT, RALT, LCTRL, RCTRL, LSHIFT, RSHIFT, ENCERRA, MAXTECLAS,
}

export interface Botao { pressionado: boolean; ativo: boolean; liberado: boolean }
// botoes: [MESQUERDO, MDIREITO, MMEIO]  (orig: chien2d2.h:62)
export interface Mouse { x: number; y: number; botoes: [Botao, Botao, Botao] }
export type Evento =
  | { t: 'down' | 'up'; k: K }
  | { t: 'mdown' | 'mup'; b: 0 | 1 | 2; x: number; y: number }
  | { t: 'mmove'; x: number; y: number }
  | { t: 'releaseAll' }
  | { t: 'char'; c: string }; // typed character (soft keyboard name entry); surfaces in `typed` for one poll

const novoBotao = (): Botao => ({ pressionado: false, ativo: false, liberado: false });

function pressiona(b: Botao): void { b.pressionado = true; b.ativo = true; b.liberado = false; }
function solta(b: Botao): void { b.pressionado = false; b.ativo = false; b.liberado = true; }

export class Entrada {
  teclas: Botao[] = Array.from({ length: K.MAXTECLAS }, novoBotao);
  mouse: Mouse = { x: 0, y: 0, botoes: [novoBotao(), novoBotao(), novoBotao()] };
  typed: string[] = [];
  private fila: Evento[] = [];

  push(e: Evento): void { this.fila.push(e); }

  /** orig: C2D2_Entrada — clear the one-frame edges, then apply the queued events in order. */
  poll(): void {
    for (const t of this.teclas) { t.pressionado = false; t.liberado = false; }
    for (const b of this.mouse.botoes) { b.pressionado = false; b.liberado = false; }
    this.typed = [];
    const fila = this.fila;
    this.fila = [];
    for (const e of fila) {
      switch (e.t) {
        case 'down': pressiona(this.teclas[e.k]); break;
        case 'up': solta(this.teclas[e.k]); break;
        case 'mdown': this.mouse.x = e.x; this.mouse.y = e.y; pressiona(this.mouse.botoes[e.b]); break;
        case 'mup': this.mouse.x = e.x; this.mouse.y = e.y; solta(this.mouse.botoes[e.b]); break;
        case 'mmove': this.mouse.x = e.x; this.mouse.y = e.y; break;
        case 'char': this.typed.push(e.c); break;
        case 'releaseAll':
          for (const t of this.teclas) if (t.ativo) solta(t);
          for (const b of this.mouse.botoes) if (b.ativo) solta(b);
          break;
      }
    }
  }
}

// --- KeyboardEvent.code -> original keys (+ aliases, spec 5.1) ---------------------------
const MAPA = new Map<string, K[]>();
function mapa(code: string, ...ks: K[]): void { MAPA.set(code, ks); }

for (let i = 0; i < 26; i++) mapa('Key' + String.fromCharCode(65 + i), K.A + i); // letters always produce their letter
for (let i = 0; i < 10; i++) { mapa('Digit' + i, K.N0 + i); mapa('Numpad' + i, K.N0 + i); }
for (let i = 0; i < 4; i++) mapa('F' + (i + 1), K.F1 + i);
mapa('ArrowUp', K.CIMA); mapa('ArrowDown', K.BAIXO); mapa('ArrowLeft', K.ESQUERDA); mapa('ArrowRight', K.DIREITA);
mapa('Space', K.ESPACO); mapa('Escape', K.ESC); mapa('Enter', K.ENTER); mapa('NumpadEnter', K.ENTER); mapa('Backspace', K.BACKSPACE);
mapa('AltLeft', K.LALT); mapa('AltRight', K.RALT); mapa('ControlLeft', K.LCTRL); mapa('ControlRight', K.RCTRL);
mapa('ShiftLeft', K.LSHIFT); mapa('ShiftRight', K.RSHIFT);
// aliases: letter key first, then the game key
mapa('KeyW', K.W, K.CIMA); mapa('KeyS', K.S, K.BAIXO); mapa('KeyA', K.A, K.ESQUERDA); mapa('KeyD', K.D, K.DIREITA);
mapa('KeyJ', K.J, K.ESPACO);
mapa('KeyX', K.X, K.LCTRL); mapa('KeyK', K.K_, K.LCTRL);
mapa('KeyZ', K.Z, K.LALT); mapa('KeyL', K.L, K.LALT);

export function codeToKeys(code: string): K[] { return [...(MAPA.get(code) ?? [])]; }

// --- DOM -------------------------------------------------------------------------------
const PREVINE = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'AltLeft', 'AltRight',
  'ControlLeft', 'ControlRight', 'Backspace', 'Tab']);
const BOTAO_MOUSE: Record<number, 0 | 1 | 2> = { 0: 0, 2: 1, 1: 2 }; // DOM left/right/middle -> MESQUERDO/MDIREITO/MMEIO

interface TargetLike { id?: string }

export function attachDom(e: Entrada, target: Window,
  mapPointer: (cx: number, cy: number) => { x: number; y: number }): () => void {
  const seguradas = new Set<string>(); // codes currently held (several codes can map to one key)

  const noTexto = (ev: Event) => (ev.target as TargetLike | null)?.id === 'texto';

  const onKeyDown = (ev: Event): void => {
    const ke = ev as KeyboardEvent;
    if (!noTexto(ev) && PREVINE.has(ke.code)) ke.preventDefault();
    if (ke.repeat) return;
    seguradas.add(ke.code);
    for (const k of codeToKeys(ke.code)) e.push({ t: 'down', k });
  };
  const onKeyUp = (ev: Event): void => {
    const ke = ev as KeyboardEvent;
    seguradas.delete(ke.code);
    for (const k of codeToKeys(ke.code)) {
      let ainda = false;
      for (const c of seguradas) if (codeToKeys(c).includes(k)) { ainda = true; break; }
      if (!ainda) e.push({ t: 'up', k });
    }
  };
  const soltaTudo = (): void => { seguradas.clear(); e.push({ t: 'releaseAll' }); };
  const onVisibility = (): void => { if (target.document.visibilityState === 'hidden') soltaTudo(); };

  const mouseLike = (pe: PointerEvent) => pe.pointerType === 'mouse' || pe.pointerType === 'pen';
  const onPointerMove = (ev: Event): void => {
    const pe = ev as PointerEvent; if (!mouseLike(pe)) return;
    const p = mapPointer(pe.clientX, pe.clientY);
    e.push({ t: 'mmove', x: p.x, y: p.y });
  };
  const onPointerDown = (ev: Event): void => {
    const pe = ev as PointerEvent; if (!mouseLike(pe)) return;
    const b = BOTAO_MOUSE[pe.button]; if (b === undefined) return;
    const p = mapPointer(pe.clientX, pe.clientY);
    e.push({ t: 'mdown', b, x: p.x, y: p.y });
  };
  const onPointerUp = (ev: Event): void => {
    const pe = ev as PointerEvent; if (!mouseLike(pe)) return;
    const b = BOTAO_MOUSE[pe.button]; if (b === undefined) return;
    const p = mapPointer(pe.clientX, pe.clientY);
    e.push({ t: 'mup', b, x: p.x, y: p.y });
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', soltaTudo);
  target.document.addEventListener('visibilitychange', onVisibility);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointerup', onPointerUp);
  return () => {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('blur', soltaTudo);
    target.document.removeEventListener('visibilitychange', onVisibility);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointerup', onPointerUp);
  };
}

// --- Gamepad ---------------------------------------------------------------------------
const ZONA_MORTA = 0.35;
// mask bit -> key
const PAD_TECLAS: K[] = [K.CIMA, K.BAIXO, K.ESQUERDA, K.DIREITA, K.ESPACO, K.LCTRL, K.LALT, K.ESC];

function padMask(p: Gamepad): number {
  const b = (i: number) => !!p.buttons[i]?.pressed;
  const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
  let m = 0;
  if (ay < -ZONA_MORTA || b(12)) m |= 1 << 0;
  if (ay > ZONA_MORTA || b(13)) m |= 1 << 1;
  if (ax < -ZONA_MORTA || b(14)) m |= 1 << 2;
  if (ax > ZONA_MORTA || b(15)) m |= 1 << 3;
  if (b(0) || b(7)) m |= 1 << 4; // A / RT -> ESPACO
  if (b(1)) m |= 1 << 5; // B -> LCTRL
  if (b(4) || b(5)) m |= 1 << 6; // LB / RB -> LALT
  if (b(9)) m |= 1 << 7; // Start -> ESC
  return m;
}

/** Diff the OR of all connected pads against `prev.mask` and push down/up events. */
export function pollGamepads(e: Entrada, pads: (Gamepad | null)[], prev: { mask: number }): void {
  const mask = maskTodos(pads);
  const diff = mask ^ prev.mask;
  if (diff) {
    for (let i = 0; i < PAD_TECLAS.length; i++) {
      if (diff & (1 << i)) e.push({ t: mask & (1 << i) ? 'down' : 'up', k: PAD_TECLAS[i] });
    }
  }
  prev.mask = mask;
}

/** OR of the masks of all connected pads. */
function maskTodos(pads: (Gamepad | null)[]): number {
  let mask = 0;
  for (const p of pads) if (p) mask |= padMask(p);
  return mask;
}

// mask bits that resume the pause overlay: A/RT, B, LB/RB, Start (directions never do)
const PAD_GESTO = (1 << 4) | (1 << 5) | (1 << 6) | (1 << 7);

/**
 * D10 (web addition): the gamepad state of main.ts. `poll` feeds the game; on focus loss `ressincroniza` forgets the
 * held state (the blur releaseAll released every key) so still-held buttons are pressed again by the next poll; while
 * the game is paused `gestoPausa` watches the pads without feeding the game, so gamepad-only players can resume.
 */
export class ControlePads {
  private readonly jogo = { mask: 0 };
  private readonly emPausa = { mask: 0 };

  poll(e: Entrada, pads: (Gamepad | null)[]): void { pollGamepads(e, pads, this.jogo); }

  ressincroniza(): void { this.jogo.mask = 0; }

  /** Entering the pause: buttons already held do not count as a resume gesture. */
  pausa(pads: (Gamepad | null)[]): void { this.emPausa.mask = maskTodos(pads); }

  /** While paused: the gesture bits newly pressed since the last call (0 = keep paused). */
  gestoPausa(pads: (Gamepad | null)[]): number {
    const mask = maskTodos(pads);
    const novos = mask & ~this.emPausa.mask & PAD_GESTO;
    this.emPausa.mask = mask;
    return novos;
  }

  /**
   * The game resumed (by `gesto` = the bits gestoPausa returned, or 0 for a key/click): every held button is
   * pressed again on the next poll except the resume buttons, which are swallowed like the resume key.
   */
  retomou(gesto: number): void { this.jogo.mask = gesto; }
}

const MODIFICADORES = new Set(['AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight', 'ShiftLeft', 'ShiftRight']);

/** Browser shortcuts (F1..F24, Ctrl/Cmd+key, Alt+key) that the start/resume gesture must not consume. */
export function atalhoDoNavegador(ev: { code: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  if (/^F\d+$/.test(ev.code)) return true;
  if (MODIFICADORES.has(ev.code)) return false; // the modifier alone: handled by the caller's ignore list
  return ev.ctrlKey || ev.metaKey || ev.altKey;
}
