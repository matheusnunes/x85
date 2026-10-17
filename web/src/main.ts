// Browser bootstrap: WebGL2 context, asset preload with the "X85" start splash, first-gesture audio unlock,
// the fixed 60 Hz logic clock driving principal() (main.cpp), letterboxing, fullscreen, pause overlay, FPS counter.
// orig: main.cpp:6 C2D2_Inicia (window + GL context), :14-17 splash — the rest of main() lives in game/principal.ts.
import { WebGL2Backend, type Backend, type Quad } from './engine/renderer';
import { initSprites } from './engine/sprites';
import { initMapas } from './engine/mapa';
import { carregaTudo, type Dados } from './engine/assets';
import { Entrada, attachDom, ControlePads, atalhoDoNavegador } from './engine/input';
import { bindEntrada } from './engine/c2d2';
import { initAudio, criaPortaWebAudio, portaOuSilenciosa, desbloqueiaAudio, CA2_PausaMusica, CA2_ContinuaMusica } from './engine/audio';
import { PassoFixo, iniciaLoop, type Loop } from './engine/loop';
import { encaixa, paraLogico, aplicaEncaixe, alternaTelaCheia, type Encaixe, type Margens } from './engine/viewport';
import { g, HOTSPOT } from './game/funcoes_M';
import { textoAtivo } from './game/menu';
import { principal } from './game/principal';
import { emPartida } from './game/jogo';
import { TELA_JOGO } from './game/constantes';
import { initToque, reservaToque, posicionaToque } from './touch/touch';

declare global {
  interface Window {
    /** Read-only probes for the e2e tests (Task 15) and debugging. */
    __x85?: { estado: () => number; frame: () => number; fps: () => number; quads: () => number };
  }
}

const palco = document.getElementById('palco') as HTMLDivElement;
const tela = document.getElementById('tela') as HTMLCanvasElement;
const splash = document.getElementById('splash') as HTMLDivElement;
const splashLogo = document.getElementById('splash-logo') as HTMLImageElement;
const splashTexto = document.getElementById('splash-texto') as HTMLDivElement;
const pausa = document.getElementById('pausa') as HTMLDivElement;
const fpsEl = document.getElementById('fps') as HTMLDivElement;
const sondaSegura = document.getElementById('sonda-segura') as HTMLDivElement; // padding = env(safe-area-inset-*)
const sobreLink = document.getElementById('sobre-link') as HTMLAnchorElement;
const creditos = document.getElementById('creditos') as HTMLDivElement;
const creditosFechar = document.getElementById('creditos-fechar') as HTMLButtonElement;

/** Counts the quads (sprites + 1-px points) sent per frame, for window.__x85.quads(). */
class ContaQuads implements Backend {
  private n = 0;
  ultimo = 0;
  constructor(private readonly b: Backend) {}
  criaTextura(img: TexImageSource | null, w: number, h: number): number { return this.b.criaTextura(img, w, h); }
  limpa(): void { this.b.limpa(); }
  quad(q: Quad): void { this.n++; this.b.quad(q); }
  pontos(xy: Int32Array, n: number, r: number, g_: number, b: number): void { this.n += n; this.b.pontos(xy, n, r, g_, b); }
  fimQuadro(): void { this.b.fimQuadro(); this.ultimo = this.n; this.n = 0; }
}

// --- layout -------------------------------------------------------------------------------------------
/** Safe-area insets in CSS px (status bar / notch / rounded corners), read from a probe styled with env(). */
function margensSeguras(): Margens {
  const cs = getComputedStyle(sondaSegura);
  return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}

let encaixe: Encaixe = encaixa(window.innerWidth, window.innerHeight, reservaToque(), margensSeguras());

function posicionaSobreTela(el: HTMLElement, e: Encaixe): void {
  el.style.left = `${e.esquerda}px`; el.style.top = `${e.topo}px`;
  el.style.width = `${e.largura}px`; el.style.height = `${e.altura}px`;
}

function ajusta(): void {
  encaixe = encaixa(palco.clientWidth || window.innerWidth, palco.clientHeight || window.innerHeight, reservaToque(), margensSeguras());
  aplicaEncaixe(tela, encaixe);
  posicionaSobreTela(pausa, encaixe);
  // splash: x85.jpg (177x38) at (312,270) of the 800x600 screen, as main.cpp:16 draws it
  const s = encaixe.escala;
  splashLogo.style.left = `${encaixe.esquerda + 312 * s}px`;
  splashLogo.style.top = `${encaixe.topo + 270 * s}px`;
  splashLogo.style.width = `${177 * s}px`;
  splashTexto.style.left = `${encaixe.esquerda}px`;
  splashTexto.style.width = `${encaixe.largura}px`;
  splashTexto.style.top = `${encaixe.topo + 330 * s}px`;
  splashTexto.style.fontSize = `${Math.max(13, Math.round(20 * s))}px`;
  // FPS counter: top of the canvas box, right side, its right edge at logical x = 760 so it stays clear of the
  // HUD bomb icons column (x 774..800); kept clear of notches / rounded corners (Rulings R6, R20)
  const direita = Math.max(0, window.innerWidth - (encaixe.esquerda + 760 * s));
  fpsEl.style.top = `max(${encaixe.topo + 4}px, env(safe-area-inset-top))`;
  fpsEl.style.right = `max(${direita}px, env(safe-area-inset-right))`;
  posicionaToque(encaixe); // touch controls (Task 14)
}

/** Client (CSS px) → logical 800x600 pixel. #palco is fixed at (0,0), but its rect is subtracted anyway (R12b). */
function mapaPonteiro(cx: number, cy: number): { x: number; y: number } {
  const r = palco.getBoundingClientRect();
  return paraLogico(encaixe, cx - r.left, cy - r.top);
}

function mostraSplash(texto: string, pronto: boolean): void {
  splash.hidden = false;
  splashTexto.textContent = texto;
  splashTexto.classList.toggle('pisca', pronto);
}

// --- boot --------------------------------------------------------------------------------------------
let contador: ContaQuads | null = null;
let entrada: Entrada | null = null;
let soltaDom: (() => void) | null = null;
let soltaToque: (() => void) | null = null;
let congeladoToque = false; // logic frozen while the touch "back to menu?" confirmation is open
let loop: Loop | null = null;
let passo: PassoFixo | null = null;
let gen: Generator<void, void, void> | null = null;
let quadroLogico = 0;
let fase: 'carregando' | 'pronto' | 'rodando' | 'erro' = 'carregando';
let pausadoJogo = false;   // pause overlay during TELA_JOGO (tab hidden / focus lost)
let musicaOculta = false;  // music paused because the tab was hidden outside the game
const pads = new ControlePads();
const lePads = (): (Gamepad | null)[] => (navigator.getGamepads ? navigator.getGamepads() : []);

function passoLogico(): void {
  if (pausadoJogo) {
    // D10 (web addition): gamepad-only players resume with a newly pressed pad button (A / B / LB / RB / Start)
    const gesto = pads.gestoPausa(lePads());
    if (gesto) retomaJogo(gesto);
    return;
  }
  if (congeladoToque || !gen || !entrada) return;
  pads.poll(entrada, lePads());
  entrada.poll();
  quadroLogico++;
  let fim: boolean | undefined;
  try {
    fim = gen.next().done;
  } catch (erro) {
    falhaFatal(erro); // a bug in a screen must not freeze the page silently
    return;
  }
  if (fim) voltaSplash();
}

/** Unexpected exception in the game: stop everything and show the error splash (like a failed boot). */
function falhaFatal(erro: unknown): void {
  console.error('X85: erro inesperado no jogo', erro);
  loop?.stop(); loop = null; passo = null; gen = null;
  soltaDom?.(); soltaDom = null;
  soltaToque?.(); soltaToque = null;
  pausadoJogo = false; pausa.hidden = true;
  CA2_PausaMusica();
  fase = 'erro';
  mostraSplash('Ocorreu um erro inesperado. Recarregue a página.', false);
}

function inicia(): void {
  if (fase !== 'pronto') return;
  fase = 'rodando';
  splash.hidden = true;
  creditos.hidden = true;
  entrada = new Entrada();
  bindEntrada(entrada);
  soltaDom = attachDom(entrada, window, mapaPonteiro);
  soltaToque = initToque(document.getElementById('touch-root') as HTMLDivElement, tela, document.getElementById('texto') as HTMLInputElement, {
    entrada, mapear: mapaPonteiro, emJogo: () => g.estado_atual === TELA_JOGO, emPartida, textoAtivo: () => textoAtivo.v, hotspot: HOTSPOT,
    relayout: ajusta, congela: sim => { congeladoToque = sim; },
  });
  gen = principal();
  passo = new PassoFixo(passoLogico, 60);
  loop = iniciaLoop(passo, window);
}

/** principal() returned (SAIR): back to the start splash; assets stay loaded. */
function voltaSplash(): void {
  loop?.stop(); loop = null; passo = null; gen = null;
  soltaDom?.(); soltaDom = null;
  soltaToque?.(); soltaToque = null;
  pausadoJogo = false; pausa.hidden = true;
  CA2_PausaMusica();
  fase = 'pronto';
  mostraSplash('Clique / toque para começar', true);
}

function pausaJogo(): void {
  if (fase !== 'rodando' || pausadoJogo || g.estado_atual !== TELA_JOGO) return;
  pausadoJogo = true;
  pausa.hidden = false;
  pads.pausa(lePads()); // buttons held right now do not resume
  CA2_PausaMusica(); // Ruling R11
}

/** `gestoPad`: the pad buttons that resumed (swallowed); 0 when resumed by a key / click / tap. */
function retomaJogo(gestoPad = 0): void {
  if (!pausadoJogo) return;
  pausadoJogo = false;
  pausa.hidden = true;
  pads.retomou(gestoPad); // still-held pad buttons are pressed again on the next frame
  musicaOculta = false;
  CA2_ContinuaMusica();
  if (passo && !passo.pausado) passo.retomar(performance.now()); // no catch-up for the paused time
}

function instalaEventos(): void {
  // R12a: every gesture (re)unlocks audio — iOS may have suspended/interrupted the context. Registered first.
  const desbloqueia = (): void => { void desbloqueiaAudio(); };
  for (const t of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(t, desbloqueia, { capture: true });

  // D10 (web addition, R19): "Sobre / créditos" link on the start splash → credits overlay with links.
  // Neither the link nor the overlay starts the game; Esc or "Fechar" closes it.
  const fechaCreditos = (): void => {
    creditos.hidden = true;
    (document.activeElement as HTMLElement | null)?.blur?.(); // the next key/click on the splash starts the game
  };
  sobreLink.addEventListener('click', ev => { ev.preventDefault(); creditos.hidden = false; creditosFechar.focus({ preventScroll: true }); });
  creditosFechar.addEventListener('click', fechaCreditos);
  creditos.addEventListener('click', ev => { if (ev.target === creditos) fechaCreditos(); });
  window.addEventListener('keydown', ev => { if (ev.code === 'Escape' && !creditos.hidden) fechaCreditos(); });
  const naUiDoSplash = (ev: Event): boolean =>
    !creditos.hidden || (ev.target instanceof Element && !!ev.target.closest('#sobre-link, #creditos'));

  // Start gesture on the splash; while paused, any key/click/tap resumes and is swallowed (it must not reach the game).
  const gesto = (ev: Event): void => {
    if (fase === 'pronto' && naUiDoSplash(ev)) return;
    if (ev instanceof KeyboardEvent) {
      if (atalhoDoNavegador(ev)) return; // F5 / F11 / Cmd+R / Ctrl+L …: the browser's, never the game's
      if (ev.repeat || ['Escape', 'KeyF', 'AltLeft', 'AltRight', 'ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight', 'Tab'].includes(ev.code)) return;
    }
    if (fase === 'pronto') { ev.preventDefault(); inicia(); return; }
    if (pausadoJogo) { ev.preventDefault(); ev.stopImmediatePropagation(); retomaJogo(); }
  };
  window.addEventListener('pointerdown', gesto, { capture: true });
  window.addEventListener('keydown', gesto, { capture: true });

  // F → fullscreen (not while typing a slot name: f is a letter there)
  window.addEventListener('keydown', ev => {
    if (ev.code === 'KeyF' && !ev.repeat && !textoAtivo.v && !ev.ctrlKey && !ev.metaKey && !ev.altKey) void alternaTelaCheia(document.documentElement);
  });

  // attachDom releases every key on blur / hidden; forget the pads' held state too so a still-held button is
  // pressed again on the next poll instead of staying released (D10)
  window.addEventListener('blur', () => { pads.ressincroniza(); pausaJogo(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      pads.ressincroniza();
      if (fase === 'rodando' && g.estado_atual === TELA_JOGO) pausaJogo();
      else if (fase === 'rodando' && !pausadoJogo) { CA2_PausaMusica(); musicaOculta = true; }
    } else if (musicaOculta && !pausadoJogo) {
      musicaOculta = false;
      CA2_ContinuaMusica();
    }
  });

  // D10 (web addition): an accidental Ctrl+W / Cmd+W / reload during a mission asks for confirmation first
  window.addEventListener('beforeunload', ev => {
    if (fase === 'rodando' && g.estado_atual === TELA_JOGO) { ev.preventDefault(); ev.returnValue = true; } // returnValue: legacy browsers
  });

  tela.addEventListener('contextmenu', ev => ev.preventDefault()); // R12c
  palco.addEventListener('contextmenu', ev => ev.preventDefault());

  for (const t of ['resize', 'orientationchange'] as const) window.addEventListener(t, ajusta);
  // fullscreenchange is fired at the document (and bubbles to window): listen once, on the document only
  for (const t of ['fullscreenchange', 'webkitfullscreenchange'] as const) document.addEventListener(t, ajusta);
  window.visualViewport?.addEventListener('resize', ajusta);
}

function instalaSondas(): void {
  window.__x85 = {
    estado: () => g.estado_atual,
    frame: () => quadroLogico,
    fps: () => loop?.fps() ?? 0,
    quads: () => contador?.ultimo ?? 0,
  };
  setInterval(() => {
    const f = loop?.fps() ?? 0;
    fpsEl.textContent = f > 0 ? `${f} fps` : '-- fps';
  }, 250);
}

async function boot(): Promise<void> {
  ajusta();
  instalaEventos();
  instalaSondas();

  let backend: WebGL2Backend;
  try {
    backend = new WebGL2Backend(tela);
  } catch (erro) {
    console.error(erro);
    fase = 'erro';
    mostraSplash('Seu navegador não suporta WebGL2', false);
    return;
  }
  contador = new ContaQuads(backend);

  let dados: Dados;
  try {
    dados = await carregaTudo('./', f => { splashTexto.textContent = `Carregando… ${Math.round(f * 100)}%`; });
  } catch (erro) {
    console.error(erro);
    fase = 'erro';
    mostraSplash('Erro ao carregar os arquivos do jogo. Recarregue a página.', false);
    return;
  }
  initSprites(contador, dados);
  initMapas(dados);
  // no / blocked AudioContext: play silently rather than hang at "Carregando… 100%"
  void initAudio(portaOuSilenciosa(() => criaPortaWebAudio('./')), dados.manifest);
  fase = 'pronto';
  mostraSplash('Clique / toque para começar', true);
}

void boot();
