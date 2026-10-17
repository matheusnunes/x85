// Browser bootstrap: WebGL2 context, asset preload with the "X85" start splash, first-gesture audio unlock,
// the fixed 60 Hz logic clock driving principal() (main.cpp), letterboxing, fullscreen, pause overlay, FPS counter.
// orig: main.cpp:6 C2D2_Inicia (window + GL context), :14-17 splash — the rest of main() lives in game/principal.ts.
import { WebGL2Backend, type Backend, type Quad } from './engine/renderer';
import { initSprites } from './engine/sprites';
import { initMapas } from './engine/mapa';
import { carregaTudo, type Dados } from './engine/assets';
import { Entrada, attachDom, pollGamepads } from './engine/input';
import { bindEntrada } from './engine/c2d2';
import { initAudio, criaPortaWebAudio, desbloqueiaAudio, CA2_PausaMusica, CA2_ContinuaMusica } from './engine/audio';
import { PassoFixo, iniciaLoop, type Loop } from './engine/loop';
import { encaixa, paraLogico, aplicaEncaixe, alternaTelaCheia, type Encaixe } from './engine/viewport';
import { g, HOTSPOT } from './game/funcoes_M';
import { textoAtivo } from './game/menu';
import { principal } from './game/principal';
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
let encaixe: Encaixe = encaixa(window.innerWidth, window.innerHeight, reservaToque());

function posicionaSobreTela(el: HTMLElement, e: Encaixe): void {
  el.style.left = `${e.esquerda}px`; el.style.top = `${e.topo}px`;
  el.style.width = `${e.largura}px`; el.style.height = `${e.altura}px`;
}

function ajusta(): void {
  encaixe = encaixa(palco.clientWidth || window.innerWidth, palco.clientHeight || window.innerHeight, reservaToque());
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
  // FPS counter: top-right corner of the canvas box, kept clear of notches / rounded corners (Ruling R6)
  const direita = Math.max(0, window.innerWidth - (encaixe.esquerda + encaixe.largura));
  fpsEl.style.top = `max(${encaixe.topo + 4}px, env(safe-area-inset-top))`;
  fpsEl.style.right = `max(${direita + 6}px, env(safe-area-inset-right))`;
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
const pads = { mask: 0 };

function passoLogico(): void {
  if (pausadoJogo || congeladoToque || !gen || !entrada) return;
  pollGamepads(entrada, navigator.getGamepads ? navigator.getGamepads() : [], pads);
  entrada.poll();
  quadroLogico++;
  if (gen.next().done) voltaSplash();
}

function inicia(): void {
  if (fase !== 'pronto') return;
  fase = 'rodando';
  splash.hidden = true;
  entrada = new Entrada();
  bindEntrada(entrada);
  soltaDom = attachDom(entrada, window, mapaPonteiro);
  soltaToque = initToque(document.getElementById('touch-root') as HTMLDivElement, tela, document.getElementById('texto') as HTMLInputElement, {
    entrada, mapear: mapaPonteiro, emJogo: () => g.estado_atual === TELA_JOGO, textoAtivo: () => textoAtivo.v, hotspot: HOTSPOT,
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
  CA2_PausaMusica(); // Ruling R11
}

function retomaJogo(): void {
  if (!pausadoJogo) return;
  pausadoJogo = false;
  pausa.hidden = true;
  musicaOculta = false;
  CA2_ContinuaMusica();
  if (passo && !passo.pausado) passo.retomar(performance.now()); // no catch-up for the paused time
}

function instalaEventos(): void {
  // R12a: every gesture (re)unlocks audio — iOS may have suspended/interrupted the context. Registered first.
  const desbloqueia = (): void => { void desbloqueiaAudio(); };
  for (const t of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(t, desbloqueia, { capture: true });

  // Start gesture on the splash; while paused, any key/click/tap resumes and is swallowed (it must not reach the game).
  const gesto = (ev: Event): void => {
    if (ev instanceof KeyboardEvent) {
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

  window.addEventListener('blur', () => pausaJogo());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (fase === 'rodando' && g.estado_atual === TELA_JOGO) pausaJogo();
      else if (fase === 'rodando' && !pausadoJogo) { CA2_PausaMusica(); musicaOculta = true; }
    } else if (musicaOculta && !pausadoJogo) {
      musicaOculta = false;
      CA2_ContinuaMusica();
    }
  });

  tela.addEventListener('contextmenu', ev => ev.preventDefault()); // R12c
  palco.addEventListener('contextmenu', ev => ev.preventDefault());

  for (const t of ['resize', 'orientationchange', 'fullscreenchange', 'webkitfullscreenchange'] as const) window.addEventListener(t, ajusta);
  document.addEventListener('fullscreenchange', ajusta);
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
  void initAudio(criaPortaWebAudio('./'), dados.manifest);
  fase = 'pronto';
  mostraSplash('Clique / toque para começar', true);
}

void boot();
