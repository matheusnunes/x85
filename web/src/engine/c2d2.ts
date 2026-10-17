// Facade with the original Chien2D 2 / ChienAudio 2 names used by the translated game code.
// orig: chien2d2.h, chien2d2primitivas.h, chien2d2mapa.h, chienaudio2.h; 02-engine §12 (the API X85 actually uses).
import { Entrada, type Botao, type Mouse } from './input';
import { RecordingBackend } from './renderer';
import { initSprites } from './sprites';
import { initMapas } from './mapa';
import { initAudio, portaSilenciosa } from './audio';
import type { Dados } from './assets';

export * from './sprites';
export * from './font';
export * from './collision';
export * from './mapa';
export * from './audio';
export { rand, srand, RAND_MAX } from './rand';
export { K, type Botao, type Mouse, type Entrada } from './input';

// orig: chien2d2.h:36 video modes, :39 renderers, :62 mouse buttons
export const C2D2_JANELA = 0, C2D2_TELA_CHEIA = 1;
export const C2D2_DESENHO_PADRAO = 0, C2D2_DESENHO_OPENGL = 1;
export const C2D2_MESQUERDO = 0, C2D2_MDIREITO = 1, C2D2_MMEIO = 2, C2D2_MMAX = 3;

let entrada = new Entrada(); // replaced by bindEntrada(); a default keeps PegaTeclas/PegaMouse total

/** Sets the Entrada the facade reads. The returned arrays/objects are stable for a given Entrada. */
export function bindEntrada(e: Entrada): void { entrada = e; }

// orig: chien2d2.cpp:672 C2D2_PegaTeclas — indexed by K
export function C2D2_PegaTeclas(): Botao[] { return entrada.teclas; }
// orig: chien2d2.cpp:681 C2D2_PegaMouse
export function C2D2_PegaMouse(): Mouse { return entrada.mouse; }
/** Web addition: characters typed this frame through the OS keyboard (#texto on mobile); empty on desktop. */
export function C2D2_PegaDigitados(): string[] { return entrada.typed; }

// orig: main.cpp:6 C2D2_Inicia(800, 600, C2D2_JANELA, C2D2_DESENHO_OPENGL, "X85") — set up by main.ts; no-op here
export function C2D2_Inicia(_largura?: number, _altura?: number, _modo?: number, _desenho?: number, _titulo?: string): boolean { return true; }
// orig: main.cpp:20-22 subsystem init — set up by main.ts / initHeadless; no-ops here
export function C2D2P_Inicia(): boolean { return true; }
export function C2D2M_Inicia(): void {}
export function CA2_Inicia(): boolean { return true; }

// Teardown (Ruling R9): nothing to release in the browser. orig: main.cpp:68-69, chien2d2.cpp:34 C2D2_RemoveSpriteSet / :332 C2D2_RemoveFonte
export function C2D2_RemoveSpriteSet(_id: number): void {}
export function C2D2_RemoveFonte(_id: number): void {}
export function C2D2_Encerra(): void {}
export function CA2_Encerra(): void {}

/**
 * Headless engine for tests and simulation: RecordingBackend renderer, maps, a fresh Entrada and the silent
 * audio port (always unlocked). Synchronous: effect decodes settle on the next microtasks (Ruling R2).
 */
export function initHeadless(d: Dados): { backend: RecordingBackend; entrada: Entrada } {
  const backend = new RecordingBackend();
  initSprites(backend, d);
  initMapas(d);
  const e = new Entrada();
  bindEntrada(e);
  void initAudio(portaSilenciosa(), d.manifest);
  return { backend, entrada: e };
}
