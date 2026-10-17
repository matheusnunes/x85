// Shared helpers for the e2e specs (Task 15). The game reads window.__x85 (main.ts): estado(), frame(), fps(), quads().
import { expect, type Page } from '@playwright/test';

/** Logical states (game/constantes.ts, orig funcoes_M.h:15). */
export const TELA = { MAIN: 0, SLOT_SELECT: 1, SLOT_INSERT: 2, MISSION: 3, OPCOES: 4, RANKING: 5, ABOUT: 6, JOGO: 7, SAIR: 8 } as const;

/**
 * Solid points (logical 800x600) of the menu buttons — the pixel of each button's mask closest to its centre
 * (same rule as tests/sim/menu.test.ts pontoSolido), buttons at the coordinates of 01-game-spec §2.
 */
export const BOTAO = {
  start: [393, 193], options: [393, 257], ranking: [393, 319], about: [393, 381], exit: [393, 443],  // botmain x=262
  slot0: [393, 257], slot1: [393, 319], slot2: [393, 381],                                         // botmain y 226/288/350
  back: [40, 316],                                                                                  // botback (8,94)
  easy: [385, 297], normal: [385, 337], hard: [385, 377], god: [385, 417],                          // otherbots x=275
  planeta: [400, 300], esquerda: [310, 485], direita: [505, 485],                                   // select / botplanetas
  painelAbout: [430, 300],
} as const satisfies Record<string, readonly [number, number]>;

/** Cursor hotspot (funcoes_M.ts HOTSPOT): the game tests clicks at mouse + HOTSPOT. */
export const HOTSPOT = { x: 8, y: 6 };

export const estado = (page: Page): Promise<number> => page.evaluate(() => window.__x85!.estado());
export const quadro = (page: Page): Promise<number> => page.evaluate(() => window.__x85!.frame());

/** Canvas CSS box: logical (x,y) → page coords. */
export async function paraPagina(page: Page, x: number, y: number): Promise<[number, number]> {
  const r = await page.locator('#tela').boundingBox();
  if (!r) throw new Error('canvas not laid out');
  return [r.x + (x * r.width) / 800, r.y + (y * r.height) / 600];
}

/** Collects page errors and console errors (WebGL driver warnings are not errors). */
export function coletaErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', e => erros.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') erros.push(`console.error: ${m.text()}`); });
  return erros;
}

/** Loads the page and waits for the "click / tap to start" splash (assets loaded). */
export async function abre(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#splash-texto')).toContainText(/Clique \/ toque/, { timeout: 30_000 });
}

/**
 * Deterministic time for desktop specs: Playwright's fake clock drives requestAnimationFrame/performance.now, so the
 * game advances only through `passa(ms)` (the logic runs at a fixed 60 Hz from rAF). Screens are then pixel-stable
 * for toHaveScreenshot and the scrolling background is at the same offset on every run.
 */
export class Relogio {
  constructor(private readonly page: Page) {}

  /** Call before page.goto(). */
  async instala(): Promise<void> { await this.page.clock.install(); }

  /** Freezes time (after the assets are loaded — fetch/decoding do not depend on the fake clock). */
  async congela(): Promise<void> {
    const agora = await this.page.evaluate(() => Date.now());
    await this.page.clock.pauseAt(agora + 2000); // margin: real time keeps flowing until the pause lands
  }

  async passa(ms: number): Promise<void> { await this.page.clock.runFor(ms); }

  /** Advances in 50 ms slices until the game reaches `alvo` (a fade-out takes ~10 frames). */
  async ateEstado(alvo: number, maxMs = 5000): Promise<void> {
    for (let t = 0; t < maxMs; t += 50) {
      if (await estado(this.page) === alvo) return;
      await this.passa(50);
    }
    expect(await estado(this.page)).toBe(alvo);
  }

  /** Mouse click with the hotspot on logical (x,y): move, press, release, each held for a few frames. */
  async clica(x: number, y: number): Promise<void> {
    const [px, py] = await paraPagina(this.page, x - HOTSPOT.x, y - HOTSPOT.y);
    await this.page.mouse.move(px, py);
    await this.passa(80);
    await this.page.mouse.down();
    await this.passa(80);
    await this.page.mouse.up();
    await this.passa(80);
  }

  /** Key press held ≥ 1 logic frame (a press and release inside one frame is dropped, as in the original). */
  async tecla(code: string): Promise<void> {
    await this.page.keyboard.down(code);
    await this.passa(80);
    await this.page.keyboard.up(code);
    await this.passa(50);
  }
}

/** Real-time key press held ≥ 70 ms (no fake clock). */
export async function tecla(page: Page, code: string, ms = 80): Promise<void> {
  await page.keyboard.down(code);
  await page.waitForTimeout(ms);
  await page.keyboard.up(code);
  await page.waitForTimeout(40);
}

/** Real-time wait for a game state. */
export async function esperaEstado(page: Page, alvo: number, timeout = 10_000): Promise<void> {
  await page.waitForFunction(a => window.__x85?.estado() === a, alvo, { timeout });
}
