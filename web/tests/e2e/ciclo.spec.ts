// Desktop: the full SAIR → start splash → click → MAIN cycle (principal() returns and is started again), the
// beforeunload guard staying off in the menus (D10), WebGL context loss / restore (renderer re-uploads textures), and
// instant clicks / key taps shorter than one frame (F18).
import { test, expect, type Page } from '@playwright/test';
import { Relogio, abre, coletaErros, esperaEstado, estado, quadro, paraPagina, TELA, BOTAO, HOTSPOT } from './util';

test.skip(({ isMobile }) => isMobile, 'desktop projects only');

async function clica(page: Page, x: number, y: number): Promise<void> {
  const [px, py] = await paraPagina(page, x - HOTSPOT.x, y - HOTSPOT.y);
  await page.mouse.move(px, py);
  await page.waitForTimeout(80);
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(80);
}

/** True when a cancelable beforeunload would ask the user to confirm leaving (the D10 guard). */
const guardaSaida = (page: Page): Promise<boolean> => page.evaluate(() => {
  const ev = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(ev);
  return ev.defaultPrevented;
});

test('SAIR → start splash → click → MAIN again, without errors', async ({ page }) => {
  const erros = coletaErros(page);
  await abre(page);
  await page.mouse.click(640, 400);
  await page.waitForFunction(() => (window.__x85?.frame() ?? 0) > 40);
  expect(await estado(page)).toBe(TELA.MAIN);
  expect(await guardaSaida(page)).toBe(false); // menus close without a confirmation

  // Exit → principal() returns → the start splash comes back; the logic clock stops
  await clica(page, ...BOTAO.exit);
  await expect(page.locator('#splash')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('#splash-texto')).toContainText(/Clique \/ toque/);
  const parado = await quadro(page);
  await page.waitForTimeout(300);
  expect(await quadro(page)).toBe(parado);
  expect(await guardaSaida(page)).toBe(false);

  // a click starts a fresh principal(): splash logo frame, then the main menu (estado back to 0)
  await page.mouse.click(640, 400);
  await expect(page.locator('#splash')).toBeHidden();
  await page.waitForFunction(q => (window.__x85?.frame() ?? 0) > q + 40, parado);
  await esperaEstado(page, TELA.MAIN);
  expect(await estado(page)).toBe(0);
  // and the menu still works: Options → back
  await page.waitForTimeout(400);
  await clica(page, ...BOTAO.options);
  await esperaEstado(page, TELA.OPCOES);
  await page.waitForTimeout(400);
  await clica(page, ...BOTAO.back);
  await esperaEstado(page, TELA.MAIN);
  expect(erros).toEqual([]);
});

test('WebGL context loss → restore: frames keep advancing and drawing resumes, without errors', async ({ page }) => {
  const erros = coletaErros(page);
  await abre(page);
  await page.mouse.click(640, 400);
  await page.waitForFunction(() => (window.__x85?.frame() ?? 0) > 60);
  expect(await estado(page)).toBe(TELA.MAIN);

  const temExtensao = await page.evaluate(() => {
    const gl = (document.getElementById('tela') as HTMLCanvasElement).getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_lose_context') ?? null;
    (window as unknown as { __perda?: WEBGL_lose_context | null }).__perda = ext;
    return ext !== null;
  });
  test.skip(!temExtensao, 'WEBGL_lose_context not available in this browser');

  const perdido = page.evaluate(() => new Promise<boolean>(res => {
    const c = document.getElementById('tela') as HTMLCanvasElement;
    c.addEventListener('webglcontextlost', () => res(true), { once: true });
    (window as unknown as { __perda: WEBGL_lose_context }).__perda.loseContext();
  }));
  expect(await perdido).toBe(true);
  const q0 = await quadro(page);
  await page.waitForTimeout(500);
  expect(await quadro(page)).toBeGreaterThan(q0 + 15); // the game logic keeps running while the context is lost
  expect(await estado(page)).toBe(TELA.MAIN);

  const restaurado = page.evaluate(() => new Promise<boolean>(res => {
    const c = document.getElementById('tela') as HTMLCanvasElement;
    c.addEventListener('webglcontextrestored', () => res(true), { once: true });
    (window as unknown as { __perda: WEBGL_lose_context }).__perda.restoreContext();
  }));
  expect(await restaurado).toBe(true);
  const q1 = await quadro(page);
  await page.waitForTimeout(500);
  expect(await quadro(page)).toBeGreaterThan(q1 + 15);
  expect(await page.evaluate(() => (document.getElementById('tela') as HTMLCanvasElement).getContext('webgl2')!.isContextLost())).toBe(false);
  expect(await page.evaluate(() => window.__x85!.quads())).toBeGreaterThan(5);
  // the restored context draws the menu again (textures re-uploaded): a black canvas would compress to a few KB
  const png = await page.locator('#tela').screenshot();
  expect(png.length).toBeGreaterThan(50_000);
  // and input still works on the restored context
  await clica(page, ...BOTAO.options);
  await esperaEstado(page, TELA.OPCOES);
  expect(erros).toEqual([]);
});

test('F18: an instant click and an instant key tap (down+up inside one frame) are not lost', async ({ page }) => {
  const erros = coletaErros(page);
  const r = new Relogio(page);
  await r.instala();
  await abre(page);
  await r.congela();
  await page.mouse.click(640, 400);
  await r.passa(100);
  await r.ateEstado(TELA.MAIN);
  await r.passa(1000); // fade-in done
  // the production repro: the clock is frozen, so mousedown and mouseup reach the same poll
  const [px, py] = await paraPagina(page, BOTAO.start[0] - HOTSPOT.x, BOTAO.start[1] - HOTSPOT.y);
  await page.mouse.move(px, py);
  await r.passa(50);
  await page.mouse.down(); await page.mouse.up();
  await r.ateEstado(TELA.SLOT_SELECT, 2000);
  await r.passa(300);
  await page.keyboard.press('Escape'); // keydown + keyup in the same frame
  await r.ateEstado(TELA.MAIN, 2000);
  expect(erros).toEqual([]);
});
