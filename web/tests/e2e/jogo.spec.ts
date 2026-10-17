// Desktop gameplay (real time): new slot → planet 1 → ready → 5 s of fire → bomb (X) → weapon (Z); then the tab is
// hidden mid-game → pause overlay, logic frozen, no catch-up; a click resumes (Review Focus 1). FPS probe (R6).
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { abre, coletaErros, esperaEstado, estado, quadro, paraPagina, tecla, TELA, BOTAO, HOTSPOT } from './util';

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

const anexa = async (page: Page, info: TestInfo, nome: string): Promise<void> => {
  const path = info.outputPath(`${nome}.png`); // kept under test-results/ for manual inspection
  await page.screenshot({ path });
  await info.attach(nome, { path, contentType: 'image/png' });
};

/** Mocks the Page Visibility API (headless pages are always "visible") and fires visibilitychange. */
async function visibilidade(page: Page, oculta: boolean): Promise<void> {
  await page.evaluate(h => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, oculta);
}

test('gameplay: fire, bomb (X), weapon (Z); hidden tab pauses without catch-up; click resumes', async ({ page, browserName }, info) => {
  const erros = coletaErros(page);
  await abre(page);
  await page.mouse.click(640, 400);
  await page.waitForFunction(() => (window.__x85?.frame() ?? 0) > 40);
  expect(await estado(page)).toBe(TELA.MAIN);

  // new slot "pilot" (Easy) → mission
  await clica(page, ...BOTAO.start);
  await esperaEstado(page, TELA.SLOT_SELECT);
  await page.waitForTimeout(300);
  await clica(page, ...BOTAO.slot0);
  await esperaEstado(page, TELA.SLOT_INSERT);
  await page.waitForTimeout(300);
  for (const k of 'pilot') await tecla(page, `Key${k.toUpperCase()}`);
  await clica(page, ...BOTAO.easy);
  await esperaEstado(page, TELA.MISSION);
  await page.waitForTimeout(500);

  // planet 1 (Space on the mission screen = select) → game; Space dismisses "ready"
  await tecla(page, 'Space');
  await esperaEstado(page, TELA.JOGO);
  await page.waitForTimeout(800);
  await anexa(page, info, 'ready');
  await tecla(page, 'Space');
  await page.waitForTimeout(300);

  // hold Space 5 s (fire), then X = bomb (Left Ctrl alias), Z = weapon info (Left Alt alias)
  await page.keyboard.down('Space');
  await page.waitForTimeout(5000);
  await page.keyboard.up('Space');
  await anexa(page, info, 'firing');
  await tecla(page, 'KeyX');
  await page.waitForTimeout(150);
  await anexa(page, info, 'bomb');
  await tecla(page, 'KeyZ');
  await page.waitForTimeout(200);
  await anexa(page, info, 'weapon-info');
  expect(await estado(page)).toBe(TELA.JOGO);
  expect(await page.evaluate(() => window.__x85!.quads())).toBeGreaterThan(50);
  // D10: during a mission an accidental Ctrl+W / Cmd+W / reload must ask first (beforeunload guard armed)
  expect(await page.evaluate(() => {
    const ev = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(ev);
    return ev.defaultPrevented;
  })).toBe(true);

  // the logic runs at a fixed 60 Hz whatever the render rate (PassoFixo): ~120 frames in 2 s
  {
    const t0 = Date.now(), q0 = await quadro(page);
    await page.waitForTimeout(2000);
    const n = (await quadro(page)) - q0, esperado = ((Date.now() - t0) * 60) / 1000;
    expect(n).toBeGreaterThan(esperado * 0.9);
    expect(n).toBeLessThan(esperado * 1.1 + 2);
  }
  if (browserName === 'chromium') {
    // R6: measured render rate — headless chromium paces rAF at ~60 Hz; under heavy parallel load (5 projects on
    // SwiftShader) a 0.5 s window can dip, so any of the next windows within 55..65 passes
    await expect.poll(() => page.evaluate(() => window.__x85!.fps()), { timeout: 10_000, intervals: [500] })
      .toBeGreaterThanOrEqual(55);
    expect(await page.evaluate(() => window.__x85!.fps())).toBeLessThanOrEqual(65);
    await expect(page.locator('#fps')).toHaveText(/^\d+ fps$/);
  }

  // Review Focus 1: tab hidden mid-game → paused (overlay), logic frozen
  await visibilidade(page, true);
  await expect(page.locator('#pausa')).toBeVisible();
  const f0 = await quadro(page);
  await page.waitForTimeout(1000);
  expect(await quadro(page)).toBe(f0);
  // back to visible: still paused (overlay waits for a gesture), no burst of catch-up frames
  await visibilidade(page, false);
  await page.waitForTimeout(500);
  expect(await quadro(page)).toBe(f0);
  await expect(page.locator('#pausa')).toBeVisible();
  await anexa(page, info, 'paused');
  // a click resumes; the click is swallowed (not a game input) and the game goes on at 60 Hz
  await page.mouse.click(640, 400);
  await expect(page.locator('#pausa')).toBeHidden();
  const t0 = Date.now(), f1 = await quadro(page);
  await page.waitForTimeout(1000);
  const df = (await quadro(page)) - f1, dt = Date.now() - t0;
  expect(df).toBeGreaterThan(0);
  expect(df).toBeLessThanOrEqual(Math.ceil((dt * 60) / 1000) + 6); // no catch-up of the ~1.5 s spent paused
  expect(await estado(page)).toBe(TELA.JOGO);

  // D10: a gamepad-only player resumes with a pad button; Start (= Esc in game) is swallowed, so the mission goes on
  await page.evaluate(() => {
    const w = window as unknown as { __botoes: number[] };
    w.__botoes = [];
    const pad = () => ({ connected: true, axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: w.__botoes.includes(i), touched: false, value: w.__botoes.includes(i) ? 1 : 0 })) });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad()] });
  });
  const botoes = (b: number[]) => page.evaluate(v => { (window as unknown as { __botoes: number[] }).__botoes = v; }, b);
  await visibilidade(page, true);
  await visibilidade(page, false);
  await expect(page.locator('#pausa')).toBeVisible();
  await page.waitForTimeout(200);
  await botoes([9]);
  await expect(page.locator('#pausa')).toBeHidden();
  await page.waitForTimeout(200);
  await botoes([]);
  const f2 = await quadro(page);
  await page.waitForTimeout(600);
  expect(await quadro(page)).toBeGreaterThan(f2 + 20);
  expect(await estado(page)).toBe(TELA.JOGO);

  expect(erros).toEqual([]);
});
