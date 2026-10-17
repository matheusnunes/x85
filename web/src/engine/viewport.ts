// Letterboxing of the fixed 800x600 logical screen (orig: chien2d2_gl.cpp:107 SDL_SetVideoMode(800,600) +
// glOrtho(0,800,600,0), 02-engine §1) into an arbitrary window, pointer mapping back to logical pixels,
// and fullscreen toggling. The canvas backing store always stays 800x600; only its CSS box changes.
import { LARGURA_TELA, ALTURA_TELA } from './renderer';

/** CSS box of the canvas inside its container, in CSS pixels; escala = CSS px per logical px. */
export interface Encaixe { escala: number; largura: number; altura: number; esquerda: number; topo: number }

/**
 * Fits 800x600 (4:3) inside the window, centred. When `reservaInferior` is given and the window is portrait
 * (h > w), the fit is done inside (w, h - reservaInferior) and anchored to the top (room for touch controls).
 */
export function encaixa(janelaW: number, janelaH: number, reservaInferior?: number): Encaixe {
  const retrato = reservaInferior !== undefined && janelaH > janelaW;
  const dispW = Math.max(0, janelaW);
  const dispH = Math.max(0, retrato ? janelaH - (reservaInferior ?? 0) : janelaH);
  let largura: number, altura: number;
  if (dispW * ALTURA_TELA <= dispH * LARGURA_TELA) { // width-bound
    largura = dispW; altura = (dispW * ALTURA_TELA) / LARGURA_TELA;
  } else {                                           // height-bound
    altura = dispH; largura = (dispH * LARGURA_TELA) / ALTURA_TELA;
  }
  const esquerda = (janelaW - largura) / 2;
  const topo = retrato ? 0 : (dispH - altura) / 2;
  return { escala: largura / LARGURA_TELA, largura, altura, esquerda, topo };
}

const EPS = 1e-7; // keeps exact pixel boundaries (e.g. the centre) from truncating to the pixel below

/** PointerEvent client coords (CSS px; #palco is assumed to fill the viewport from (0,0)) → logical pixel, truncated and clamped to 0..799 / 0..599. */
export function paraLogico(e: Encaixe, clientX: number, clientY: number): { x: number; y: number } {
  const lx = e.largura > 0 ? Math.trunc(((clientX - e.esquerda) * LARGURA_TELA) / e.largura + EPS) : 0;
  const ly = e.altura > 0 ? Math.trunc(((clientY - e.topo) * ALTURA_TELA) / e.altura + EPS) : 0;
  return {
    x: Math.min(LARGURA_TELA - 1, Math.max(0, lx)),
    y: Math.min(ALTURA_TELA - 1, Math.max(0, ly)),
  };
}

/** Positions the canvas (absolute inside #palco) at the fitted CSS box; the 800x600 backing store is untouched. */
export function aplicaEncaixe(canvas: HTMLCanvasElement, e: Encaixe): void {
  const s = canvas.style;
  s.position = 'absolute';
  s.width = `${e.largura}px`;
  s.height = `${e.altura}px`;
  s.left = `${e.esquerda}px`;
  s.top = `${e.topo}px`;
}

interface DocumentoWebkit { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void }
interface ElementoWebkit { webkitRequestFullscreen?: () => Promise<void> | void }

/** Enters fullscreen on `el`, or leaves it if already fullscreen. Never rejects (unsupported → no-op). */
export async function alternaTelaCheia(el: HTMLElement): Promise<void> {
  const doc = el.ownerDocument as Document & DocumentoWebkit;
  const elw = el as HTMLElement & ElementoWebkit;
  try {
    if (doc.fullscreenElement ?? doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
    } else if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
    } else {
      await elw.webkitRequestFullscreen?.();
    }
  } catch {
    /* denied or unsupported (e.g. iPhone Safari): stay windowed */
  }
}
