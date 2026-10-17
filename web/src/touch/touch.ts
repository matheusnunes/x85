// Touch controls, mobile layout and OS-keyboard name entry (decision D10, spec §5.3–5.4). Web-only: nothing here
// exists in the original; everything feeds the original input model (Entrada) so the game code stays unchanged.
//  - Menus: a tap is the original mouse click, with the cursor hotspot (funcoes_M HOTSPOT) placed on the finger.
//  - Gameplay: a relative drag moves the ship's target (funcoes_J moveAlvoToque) and holds fire (Space) while the
//    finger is down; buttons BOMBA (Left Ctrl), ARMA (Left Alt) and ⏸ (confirm → Esc).
//  - Name entry: the hidden #texto input is focused on the next tap so the OS keyboard opens; what is typed there
//    reaches the game as `char` events and Backspace as a BACKSPACE key press.
import './touch.css';
import { K, type Entrada, type Evento } from '../engine/input';
import type { Encaixe } from '../engine/viewport';
import { moveAlvoToque } from '../game/funcoes_J';

export interface ToqueOpts {
  entrada: Entrada;
  /** Client (CSS px) → logical 800x600 pixel (main.ts mapaPonteiro). */
  mapear: (cx: number, cy: number) => { x: number; y: number };
  emJogo: () => boolean;
  /** The gameplay loop proper runs (not the ready screen): ⏸ is shown/active only then. Defaults to emJogo. */
  emPartida?: () => boolean;
  textoAtivo: () => boolean;
  /** Cursor hotspot (funcoes_M HOTSPOT): the mouse is put at tap − hotspot so the click point is the finger. */
  hotspot: { x: number; y: number };
  /** Re-runs the page layout (main.ts ajusta) — called when the touch UI first appears. */
  relayout?: () => void;
  /** Freezes / unfreezes the logic while the "back to menu?" confirmation is open. */
  congela?: (sim: boolean) => void;
}

/** Pure: a finger delta in CSS px → the same distance in logical px (escala = CSS px per logical px). */
export function deltaParaAlvo(dxCss: number, dyCss: number, escala: number): { dx: number; dy: number } {
  if (!(escala > 0)) return { dx: 0, dy: 0 };
  return { dx: dxCss / escala, dy: dyCss / escala };
}

/** Pure: what changed between two values of the text field — `apagar` chars removed from the end, then `inserir`. */
export function difTexto(antes: string, depois: string): { apagar: number; inserir: string } {
  let p = 0;
  while (p < antes.length && p < depois.length && antes[p] === depois[p]) p++;
  return { apagar: antes.length - p, inserir: depois.slice(p) };
}

type ItemTexto = { bs: true } | { c: string };

/**
 * Turns touch / OS-keyboard activity into input the engine can see. Chien2D edges last one poll, so a down and an
 * up queued for the same poll lose the press (input.test "down+up in the same frame"); quick taps do exactly that.
 * The sequencer holds such an up back until after the next poll. OS-keyboard edits are replayed in order, one
 * Backspace press per frame and characters batched between them. `instala` hooks Entrada.poll for that.
 */
export class Sequenciador {
  private naoVistos = new Set<string>(); // downs queued since the last poll
  private adiados: Evento[] = [];
  private fila: ItemTexto[] = [];
  private bsSegurado = false;

  constructor(private readonly e: Entrada) {}

  /** Wraps entrada.poll so `aposPoll` runs after each poll; returns the uninstaller. */
  instala(): () => void {
    const e = this.e;
    const original = e.poll;
    e.poll = (): void => { original.call(e); this.aposPoll(); };
    return () => { e.poll = original; };
  }

  tecla(k: K, baixo: boolean): void {
    this.manda(`k${k}`, baixo, baixo ? { t: 'down', k } : { t: 'up', k });
  }

  mouse(baixo: boolean, x: number, y: number): void {
    this.manda('m0', baixo, baixo ? { t: 'mdown', b: 0, x, y } : { t: 'mup', b: 0, x, y });
  }

  texto(d: { apagar: number; inserir: string }): void {
    for (let i = 0; i < d.apagar; i++) this.fila.push({ bs: true });
    for (const c of d.inserir) this.fila.push({ c });
  }

  private manda(chave: string, baixo: boolean, ev: Evento): void {
    if (baixo) { this.naoVistos.add(chave); this.e.push(ev); }
    else if (this.naoVistos.has(chave)) this.adiados.push(ev);
    else this.e.push(ev);
  }

  private aposPoll(): void {
    this.naoVistos.clear();
    const adiados = this.adiados;
    this.adiados = [];
    for (const ev of adiados) this.e.push(ev);
    if (this.bsSegurado) { this.e.push({ t: 'up', k: K.BACKSPACE }); this.bsSegurado = false; }
    const prox = this.fila[0];
    if (!prox) return;
    if ('bs' in prox) {
      this.fila.shift();
      this.e.push({ t: 'down', k: K.BACKSPACE });
      this.bsSegurado = true;
    } else {
      while (this.fila.length > 0 && 'c' in this.fila[0]) {
        const it = this.fila.shift() as { c: string };
        this.e.push({ t: 'char', c: it.c });
      }
    }
  }
}

// --- visibility / layout state (module level: main.ts lays out before initToque runs) ------------------
const RESERVA_RETRATO = 260; // px below the canvas in portrait (spec §5.3)
const LATERAL_MIN = 96;      // side bar width needed for the side-bar layout

let visivel = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(pointer: coarse)').matches;
let encaixeAtual: Encaixe | null = null;
let aoLayout: (() => void) | null = null;

/** Bottom reserve for encaixa(): 260 px when the touch UI is shown (encaixa applies it in portrait only). */
export function reservaToque(): number | undefined { return visivel ? RESERVA_RETRATO : undefined; }

/** Called by main.ts after every re-fit: positions the touch controls around the canvas. */
export function posicionaToque(e: Encaixe): void {
  encaixeAtual = e;
  aoLayout?.();
}

interface Insets { t: number; r: number; b: number; l: number }

function criaEl<T extends keyof HTMLElementTagNameMap>(tag: T, cls: string, texto?: string): HTMLElementTagNameMap[T] {
  const el = document.createElement(tag);
  el.className = cls;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

function coloca(el: HTMLElement, x: number, y: number, w: number, h: number): void {
  el.style.left = `${Math.round(x)}px`; el.style.top = `${Math.round(y)}px`;
  el.style.width = `${Math.max(0, Math.round(w))}px`; el.style.height = `${Math.max(0, Math.round(h))}px`;
}

/**
 * Installs the touch UI into `root` (#touch-root) for one game session; returns the uninstaller (main.ts calls it
 * when principal() returns to the splash).
 */
export function initToque(root: HTMLElement, canvas: HTMLCanvasElement, input: HTMLInputElement, o: ToqueOpts): () => void {
  const seq = new Sequenciador(o.entrada);
  const desinstalaSeq = seq.instala();
  const t0 = performance.now(); // the tap that started the session must not reach the game
  const limpa: (() => void)[] = [desinstalaSeq];
  const ouve = <E extends Event>(alvo: EventTarget, tipo: string, f: (ev: E) => void, opt?: AddEventListenerOptions): void => {
    const h = f as EventListener;
    alvo.addEventListener(tipo, h, opt);
    limpa.push(() => alvo.removeEventListener(tipo, h, opt));
  };

  // --- DOM ------------------------------------------------------------------------------------------
  root.classList.add('tq');
  const sonda = criaEl('div', 'tq-sonda');            // reads env(safe-area-inset-*)
  const painel = criaEl('div', 'tq-painel');          // portrait panel below the canvas
  const giro = criaEl('div', 'tq-giro', 'Gire o aparelho para jogar melhor');
  const pad = criaEl('div', 'tq-pad');
  pad.append(criaEl('span', '', 'Arraste para mover'), criaEl('span', '', 'Segure para atirar'));
  const bomba = criaEl('button', 'tq-bot tq-acao', 'BOMBA');
  const arma = criaEl('button', 'tq-bot tq-acao', 'ARMA');
  const pausa = criaEl('button', 'tq-bot tq-pausa', '⏸');
  pausa.setAttribute('aria-label', 'Pausa / voltar ao menu');
  const dicaTexto = criaEl('div', 'tq-dica-texto', 'Toque na tela para digitar o nome');
  const confirma = criaEl('div', 'tq-confirma');
  const caixa = criaEl('div', 'tq-caixa');
  const sim = criaEl('button', 'tq-bot tq-opcao', 'Sim');
  const nao = criaEl('button', 'tq-bot tq-opcao', 'Não');
  const linha = criaEl('div', 'tq-linha');
  linha.append(sim, nao);
  caixa.append(criaEl('div', 'tq-pergunta', 'Voltar ao menu?'), criaEl('div', 'tq-aviso', 'O progresso desta fase será perdido.'), linha);
  confirma.append(caixa);
  confirma.hidden = true;
  for (const b of [bomba, arma, pausa, sim, nao]) b.type = 'button';
  const elementos = [sonda, painel, giro, pad, bomba, arma, pausa, dicaTexto, confirma];
  root.append(...elementos);
  limpa.push(() => { for (const el of elementos) el.remove(); root.className = ''; });

  const insets = (): Insets => {
    const cs = getComputedStyle(sonda);
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  };

  // --- layout ---------------------------------------------------------------------------------------
  let modo: 'retrato' | 'lateral' | 'sobre' = 'sobre';
  const layout = (): void => {
    const e = encaixeAtual;
    if (!e) return;
    const vw = window.innerWidth, vh = window.innerHeight, ins = insets();
    const lado = e.esquerda;
    if (vh > vw) modo = 'retrato';
    else modo = lado >= LATERAL_MIN && lado - Math.max(ins.l, ins.r) >= 72 ? 'lateral' : 'sobre';
    root.dataset.modo = modo;
    const M = 12;
    if (modo === 'retrato') {
      const topo = e.topo + e.altura;
      coloca(painel, 0, topo, vw, vh - topo);
      const x0 = ins.l + M, x1 = vw - ins.r - M, y0 = topo + 8, y1 = vh - ins.b - M;
      coloca(pausa, x0, y0, 64, 64);
      coloca(giro, x0 + 64 + M, y0, x1 - x0 - 2 * (64 + M), 64);
      const yb = y0 + 64 + M;
      const bot = Math.max(64, Math.min(88, Math.floor((y1 - yb - M) / 2)));
      coloca(bomba, x1 - bot, y1 - bot, bot, bot);
      coloca(arma, x1 - bot, y1 - 2 * bot - M, bot, bot);
      coloca(pad, x0, yb, x1 - bot - M - x0, y1 - yb);
    } else if (modo === 'lateral') {
      const wl = lado - ins.l;
      coloca(pausa, ins.l + (wl - 64) / 2, ins.t + M, 64, 64);
      const padTopo = ins.t + M + 64 + M;
      coloca(pad, ins.l + 8, padTopo, wl - 16, vh - ins.b - M - padTopo);
      const xr = e.esquerda + e.largura, wr = vw - ins.r - xr;
      const bot = Math.max(64, Math.min(88, wr - 16));
      const xb = xr + (wr - bot) / 2;
      coloca(bomba, xb, vh - ins.b - 16 - bot, bot, bot);
      coloca(arma, xb, vh - ins.b - 16 - 2 * bot - 16, bot, bot);
    } else {
      // overlaid on the canvas corners at 40 % opacity, clear of the HUD: energy bar (x 6..22), bomb icons (x 774, y 0..142)
      const s = e.escala, bot = 72;
      const esq = Math.max(e.esquerda, ins.l), dir = Math.min(e.esquerda + e.largura, vw - ins.r);
      const baixo = Math.min(e.topo + e.altura, vh - ins.b), cima = Math.max(e.topo, ins.t);
      coloca(bomba, esq + Math.max(M, 30 * s), baixo - M - bot, bot, bot);
      coloca(arma, dir - M - bot, baixo - M - bot, bot, bot);
      coloca(pausa, dir - 8 - 64, Math.max(cima + 8, e.topo + 155 * s), 64, 64);
    }
    // name-entry hint: over the canvas, below the difficulty buttons (menu.cpp:717-772 end at y≈430)
    coloca(dicaTexto, e.esquerda, e.topo + 455 * e.escala, e.largura, Math.max(44, 50 * e.escala));
    coloca(confirma, e.esquerda, e.topo, e.largura, e.altura);
  };
  aoLayout = layout;
  limpa.push(() => { aoLayout = null; });

  const ativa = (): void => {
    if (visivel) return;
    visivel = true;
    if (o.relayout) o.relayout(); else layout();
  };

  // OS keyboard state (handlers below)
  let anterior = '';        // last value of #texto already forwarded to the game
  let compondo = false;     // IME composition in progress (Android keyboards compose whole words)
  let ignorarAte = 0;       // its deletion was already sent from keydown → skip the matching input event

  // --- gameplay drag + menu taps ----------------------------------------------------------------------
  let arrasto: number | null = null; // pointerId of the steering finger
  let ultimo = { x: 0, y: 0 };
  const resto = { x: 0, y: 0 };      // sub-pixel remainder of the drag, in logical px
  let toqueMenu: number | null = null;
  let ultimoMenu = { x: 0, y: 0 };

  const ehUi = (alvo: EventTarget | null): boolean =>
    alvo instanceof Element && !!alvo.closest('.tq-bot, .tq-confirma, #pausa, #splash');
  const noCanvas = (cx: number, cy: number): boolean => {
    const r = canvas.getBoundingClientRect();
    return cx >= r.left && cx < r.right && cy >= r.top && cy < r.bottom;
  };
  const posMenu = (cx: number, cy: number): { x: number; y: number } => {
    const p = o.mapear(cx, cy);
    return { x: p.x - o.hotspot.x, y: p.y - o.hotspot.y };
  };
  const soltaArrasto = (): void => {
    if (arrasto === null) return;
    arrasto = null;
    seq.tecla(K.ESPACO, false);
  };
  const soltaMenu = (): void => {
    if (toqueMenu === null) return;
    toqueMenu = null;
    seq.mouse(false, ultimoMenu.x, ultimoMenu.y);
  };

  const focaTexto = (): void => {
    if (o.textoAtivo() && document.activeElement !== input) {
      input.value = ''; anterior = '';
      input.focus({ preventScroll: true });
    }
  };

  ouve<PointerEvent>(window, 'pointerdown', ev => {
    if (ev.pointerType !== 'touch') return;
    ativa();
    if (ev.timeStamp <= t0) return;
    focaTexto();
    if (ehUi(ev.target) || !confirma.hidden) return;
    if (o.emJogo()) {
      if (arrasto !== null) return;
      arrasto = ev.pointerId;
      ultimo = { x: ev.clientX, y: ev.clientY };
      resto.x = 0; resto.y = 0;
      seq.tecla(K.ESPACO, true); // fire held while the finger is down
    } else if (toqueMenu === null && noCanvas(ev.clientX, ev.clientY)) {
      toqueMenu = ev.pointerId;
      ultimoMenu = posMenu(ev.clientX, ev.clientY);
      o.entrada.push({ t: 'mmove', ...ultimoMenu });
      seq.mouse(true, ultimoMenu.x, ultimoMenu.y);
    }
  });
  ouve<PointerEvent>(window, 'pointermove', ev => {
    if (ev.pointerType !== 'touch') return;
    if (ev.pointerId === arrasto) {
      const escala = encaixeAtual?.escala ?? 0;
      const d = deltaParaAlvo(ev.clientX - ultimo.x, ev.clientY - ultimo.y, escala);
      ultimo = { x: ev.clientX, y: ev.clientY };
      resto.x += d.dx; resto.y += d.dy;
      const ix = Math.trunc(resto.x), iy = Math.trunc(resto.y);
      if ((ix !== 0 || iy !== 0) && o.emJogo()) moveAlvoToque(ix, iy);
      resto.x -= ix; resto.y -= iy;
    } else if (ev.pointerId === toqueMenu) {
      ultimoMenu = posMenu(ev.clientX, ev.clientY);
      o.entrada.push({ t: 'mmove', ...ultimoMenu });
    }
  });
  const fim = (ev: PointerEvent): void => {
    if (ev.pointerId === arrasto) soltaArrasto();
    if (ev.pointerId === toqueMenu) soltaMenu();
  };
  ouve<PointerEvent>(window, 'pointerup', fim);
  ouve<PointerEvent>(window, 'pointercancel', fim);
  ouve<TouchEvent>(window, 'touchend', () => focaTexto());
  // keep the OS keyboard open while tapping the canvas during name entry (a tap elsewhere would blur #texto)
  ouve<TouchEvent>(window, 'touchstart', ev => {
    if (o.textoAtivo() && ev.target !== input && !ehUi(ev.target) && ev.cancelable) ev.preventDefault();
  }, { passive: false });
  // --- buttons ------------------------------------------------------------------------------------
  const soltaBotoes: (() => void)[] = []; // forget held BOMBA/ARMA fingers (their pointerup may never arrive)
  const segura = (b: HTMLElement, k: K): void => {
    const ids = new Set<number>();
    soltaBotoes.push(() => { ids.clear(); b.classList.remove('tq-apertado'); });
    ouve<PointerEvent>(b, 'pointerdown', ev => {
      ev.preventDefault();
      if (!confirma.hidden) return; // the game is frozen behind the "back to menu?" dialog: a press must not queue
      if (ids.size === 0) seq.tecla(k, true);
      ids.add(ev.pointerId);
      b.classList.add('tq-apertado');
    });
    const solta = (ev: PointerEvent): void => {
      if (!ids.delete(ev.pointerId) || ids.size > 0) return;
      seq.tecla(k, false);
      b.classList.remove('tq-apertado');
    };
    ouve<PointerEvent>(b, 'pointerup', solta);
    ouve<PointerEvent>(b, 'pointercancel', solta);
  };
  segura(bomba, K.LCTRL);
  segura(arma, K.LALT);

  // focus lost: attachDom already releases every key; forget the fingers too, or a button whose pointerup was
  // swallowed would stay "held" (its next press would not send a key) and keep its pressed look
  const perdeuFoco = (): void => {
    arrasto = null; toqueMenu = null;
    for (const f of soltaBotoes) f();
  };
  ouve(window, 'blur', perdeuFoco);
  ouve(document, 'visibilitychange', () => { if (document.visibilityState === 'hidden') perdeuFoco(); });

  const fechaConfirma = (): void => {
    if (confirma.hidden) return;
    confirma.hidden = true;
    o.congela?.(false);
  };
  const emPartida = o.emPartida ?? o.emJogo;
  ouve<PointerEvent>(pausa, 'pointerdown', ev => {
    ev.preventDefault();
    if (!emPartida() || !confirma.hidden) return; // ready screen: Esc is a no-op there (jogo.cpp:115-122)
    soltaArrasto();
    confirma.hidden = false;
    o.congela?.(true);
  });
  ouve<MouseEvent>(sim, 'click', () => {
    fechaConfirma();
    seq.tecla(K.ESC, true); seq.tecla(K.ESC, false); // jogo.cpp:195 Esc → back to the mission screen
  });
  ouve<MouseEvent>(nao, 'click', () => fechaConfirma());
  limpa.push(fechaConfirma);

  // --- OS keyboard (name entry) ---------------------------------------------------------------------
  const consome = (): void => {
    const atual = input.value;
    const d = difTexto(anterior, atual);
    if (d.apagar > 0 && performance.now() < ignorarAte) { d.apagar--; ignorarAte = 0; }
    seq.texto(d);
    anterior = atual;
    if (!compondo) { input.value = ''; anterior = ''; }
  };
  // Text typed into #texto reaches the game only through `input` events (as chars) and Backspace only through the
  // sequencer, so keydown/keyup for those keys are kept from attachDom (window): a soft keyboard often sends down and
  // up in the same frame, which the engine would miss, and a physical key would otherwise count twice. Esc, Enter,
  // arrows… still propagate to attachDom.
  const ehTexto = (k: string): boolean => k.length === 1 || k === 'Backspace' || k === 'Unidentified' || k === 'Process';
  ouve<KeyboardEvent>(input, 'keydown', ev => {
    if (ev.key === 'Enter') { input.blur(); return; }
    if (!ehTexto(ev.key)) return;
    ev.stopPropagation();
    if (ev.key === 'Backspace' && !ev.repeat) {
      // an empty field fires no input event for Backspace, so it is counted here (and its input event skipped)
      seq.texto({ apagar: 1, inserir: '' });
      ignorarAte = performance.now() + 100;
    }
  });
  ouve<KeyboardEvent>(input, 'keyup', ev => { if (ehTexto(ev.key)) ev.stopPropagation(); });
  ouve<InputEvent>(input, 'input', () => consome());
  ouve(input, 'compositionstart', () => { compondo = true; });
  ouve(input, 'compositionend', () => { compondo = false; consome(); });
  limpa.push(() => { if (document.activeElement === input) input.blur(); input.value = ''; });

  // --- per-frame state: which controls show, keyboard focus -------------------------------------------
  let rodando = true;
  let estado = '';
  const quadro = (): void => {
    if (!rodando) return;
    const jogo = o.emJogo(), partida = jogo && emPartida(), texto = o.textoAtivo();
    if (!texto && document.activeElement === input) { input.blur(); input.value = ''; anterior = ''; }
    if (!jogo) { fechaConfirma(); soltaArrasto(); }
    const focado = document.activeElement === input;
    const novo = `${visivel}|${jogo}|${partida}|${texto && !focado}`;
    if (novo !== estado) {
      estado = novo;
      root.classList.toggle('tq-on', visivel);
      root.classList.toggle('tq-jogo', jogo);
      root.classList.toggle('tq-partida', partida);
      root.classList.toggle('tq-digitar', visivel && texto && !focado);
    }
    requestAnimationFrame(quadro);
  };
  limpa.push(() => { rodando = false; });
  layout();
  requestAnimationFrame(quadro);

  return () => { for (const f of limpa.reverse()) f(); };
}
