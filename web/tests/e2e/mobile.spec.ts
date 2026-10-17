// Mobile (iphone-portrait / iphone-landscape / pixel): taps through the menus, name entry through the hidden #texto
// (OS keyboard), planet 1, a drag on the canvas (pointerType "touch"), BOMBA, the ⏸ confirmation; layout checks:
// canvas fully inside the viewport, side-bar buttons never cover it, portrait controls below it; orientation change.
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { abre, coletaErros, esperaEstado, estado, quadro, paraPagina, TELA, BOTAO } from './util';

test.skip(({ isMobile }) => !isMobile, 'mobile projects only');

interface Caixa { x: number; y: number; w: number; h: number }
const caixaDe = (page: Page, sel: string): Promise<Caixa> => page.evaluate(s => {
  const r = document.querySelector(s)!.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}, sel);
const sobrepoe = (a: Caixa, b: Caixa): boolean =>
  a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

/** A tap whose hotspot lands on logical (x,y): touch.ts puts the menu cursor at finger − HOTSPOT. */
async function toca(page: Page, x: number, y: number): Promise<void> {
  const [px, py] = await paraPagina(page, x, y);
  await page.touchscreen.tap(px, py);
  await page.waitForTimeout(250);
}

/** Synthetic touch pointer event (WebKit has no CDP touch API; touch.ts reads pointer events). */
async function ponteiro(page: Page, alvo: string, tipo: string, x: number, y: number, id = 7): Promise<void> {
  await page.evaluate(([sel, t, cx, cy, pid]) => {
    const el = sel === 'window' ? window : document.querySelector(sel as string)!;
    el.dispatchEvent(new PointerEvent(t as string, { pointerType: 'touch', pointerId: pid as number, isPrimary: true, clientX: cx as number, clientY: cy as number, bubbles: true, cancelable: true }));
  }, [alvo, tipo, x, y, id] as const);
}

async function centro(page: Page, sel: string): Promise<[number, number]> {
  const c = await caixaDe(page, sel);
  return [c.x + c.w / 2, c.y + c.h / 2];
}

const foto = (page: Page) => ({ maxDiffPixelRatio: 0.02, mask: [page.locator('#fps'), page.locator('#tela')] });
const guarda = async (page: Page, info: TestInfo, nome: string): Promise<void> => {
  const path = info.outputPath(`${nome}.png`); // unmasked copy under test-results/ for manual inspection
  await page.screenshot({ path });
  await info.attach(nome, { path, contentType: 'image/png' });
};

async function confereLayout(page: Page): Promise<string> {
  const vp = page.viewportSize()!;
  const tela = await caixaDe(page, '#tela');
  expect(tela.x).toBeGreaterThanOrEqual(-0.5);
  expect(tela.y).toBeGreaterThanOrEqual(-0.5);
  expect(tela.x + tela.w).toBeLessThanOrEqual(vp.width + 0.5);
  expect(tela.y + tela.h).toBeLessThanOrEqual(vp.height + 0.5);
  expect(tela.w / tela.h).toBeCloseTo(4 / 3, 2);
  const modo = await page.evaluate(() => document.getElementById('touch-root')!.dataset.modo ?? '');
  const botoes = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.tq-bot:not(.tq-opcao)')]
    .filter(b => getComputedStyle(b).display !== 'none')
    .map(b => { const r = b.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }));
  for (const b of botoes) {
    expect(b.w).toBeGreaterThanOrEqual(64); // touch targets
    expect(b.x).toBeGreaterThanOrEqual(-0.5);
    expect(b.x + b.w).toBeLessThanOrEqual(vp.width + 0.5);
    expect(b.y + b.h).toBeLessThanOrEqual(vp.height + 0.5);
    if (modo === 'lateral' || modo === 'retrato') expect(sobrepoe(b, tela)).toBe(false);
    if (modo === 'retrato') expect(b.y).toBeGreaterThanOrEqual(tela.y + tela.h - 0.5);
  }
  for (let i = 0; i < botoes.length; i++) for (let j = i + 1; j < botoes.length; j++) expect(sobrepoe(botoes[i], botoes[j])).toBe(false);
  return modo;
}

test('mobile: taps, OS-keyboard name, planet 1, drag, BOMBA, ⏸ confirm; layout inside the viewport', async ({ page }, info) => {
  const erros = coletaErros(page);
  await abre(page);
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
  const vp = page.viewportSize()!;
  await page.touchscreen.tap(vp.width / 2, vp.height / 2);
  await page.waitForFunction(() => (window.__x85?.frame() ?? 0) > 40);
  expect(await estado(page)).toBe(TELA.MAIN);
  const modoMenu = await confereLayout(page);
  expect(modoMenu).toBe(vp.height > vp.width ? 'retrato' : 'lateral');
  await guarda(page, info, 'main');
  await expect(page).toHaveScreenshot('layout-menu.png', foto(page));

  // start → empty slot → name entry through #texto
  await toca(page, ...BOTAO.start);
  await esperaEstado(page, TELA.SLOT_SELECT);
  await page.waitForTimeout(300);
  await toca(page, ...BOTAO.slot0);
  await esperaEstado(page, TELA.SLOT_INSERT);
  await page.waitForTimeout(300);
  await expect(page.locator('.tq-dica-texto')).toBeVisible(); // "tap to type" hint while the keyboard is closed
  await toca(page, 600, 150);
  await expect(page.locator('#texto')).toBeFocused();
  await page.keyboard.type('Ab1 cdx', { delay: 40 });
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(300);
  await guarda(page, info, 'nome');
  await toca(page, ...BOTAO.easy);
  await esperaEstado(page, TELA.MISSION);
  const salvo = await page.evaluate(() => Object.values(localStorage).join(' '));
  expect(salvo).toContain('"nome":"ab cd"'); // lowercased, digits dropped (R15), Backspace applied
  await expect(page.locator('#texto')).not.toBeFocused();
  await page.waitForTimeout(500);

  // planet 1 → ready screen: ⏸ hidden there (Esc is a no-op on the ready screen)
  await toca(page, ...BOTAO.planeta);
  await esperaEstado(page, TELA.JOGO);
  await page.waitForTimeout(800);
  await expect(page.locator('.tq-acao').first()).toBeVisible();
  await expect(page.locator('.tq-pausa')).toBeHidden();
  expect(await page.evaluate(() => window.__x85!.tiros())).toBe(0);
  await toca(page, 400, 300); // dismiss "ready"
  await expect(page.locator('.tq-pausa')).toBeVisible();
  // touch auto-fire (D10): with no finger on the play area the ship fires by itself
  await page.waitForFunction(() => window.__x85!.tiros() >= 3, undefined, { timeout: 5000 });
  await expect(page.locator('.tq-pad')).toContainText('Tiro automático');
  // only weapon 1 unlocked in a new slot: ARMA looks inactive (it still shows the weapon info box when tapped)
  await expect(page.locator('.tq-acao', { hasText: 'ARMA' })).toHaveClass(/tq-inativo/);
  await expect(page.locator('.tq-acao', { hasText: 'BOMBA' })).not.toHaveClass(/tq-inativo/);
  await page.waitForTimeout(300);
  const modoJogo = await confereLayout(page);
  await guarda(page, info, 'jogo');
  await expect(page).toHaveScreenshot('layout-jogo.png', foto(page));

  // drag on the canvas: the ship's target follows the finger (relative); it only steers (fire is automatic)
  const [sx, sy] = await paraPagina(page, 400, 450);
  await ponteiro(page, '#tela', 'pointerdown', sx, sy);
  for (let i = 1; i <= 20; i++) { await ponteiro(page, '#tela', 'pointermove', sx - i * 5, sy - i * 4); await page.waitForTimeout(25); }
  await page.waitForTimeout(400);
  await guarda(page, info, 'arrasto');
  await ponteiro(page, '#tela', 'pointerup', sx - 100, sy - 80);

  // BOMBA (real touch tap)
  const bomba = page.locator('.tq-acao', { hasText: 'BOMBA' });
  const [bx, by] = await (async () => { const c = await bomba.boundingBox(); return [c!.x + c!.width / 2, c!.y + c!.height / 2] as const; })();
  await page.touchscreen.tap(bx, by);
  await page.waitForTimeout(120);
  await guarda(page, info, 'bomba');
  expect(await estado(page)).toBe(TELA.JOGO);

  // ⏸ → confirmation: logic frozen; BOMBA presses are ignored while it is open (Task 15 / T14 minor)
  await page.touchscreen.tap(...await centro(page, '.tq-pausa'));
  await expect(page.locator('.tq-confirma')).toBeVisible();
  const f0 = await quadro(page);
  await page.waitForTimeout(400);
  expect(await quadro(page)).toBe(f0);
  await ponteiro(page, '.tq-acao', 'pointerdown', bx, by, 11);
  await expect(bomba).not.toHaveClass(/tq-apertado/);
  await ponteiro(page, '.tq-acao', 'pointerup', bx, by, 11);
  await guarda(page, info, 'confirma');
  await page.locator('.tq-opcao', { hasText: 'Não' }).tap();
  await expect(page.locator('.tq-confirma')).toBeHidden();
  await page.waitForFunction(f => window.__x85!.frame() > f, f0);

  // a held button whose pointerup never arrives is released on blur (no dead button afterwards)
  await ponteiro(page, '.tq-acao', 'pointerdown', bx, by, 12);
  await expect(bomba).toHaveClass(/tq-apertado/);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(bomba).not.toHaveClass(/tq-apertado/);
  await expect(page.locator('#pausa')).toBeVisible(); // blur during the game → pause overlay
  await page.touchscreen.tap(vp.width / 2, Math.min(vp.height - 10, (await caixaDe(page, '#tela')).y + 50));
  await expect(page.locator('#pausa')).toBeHidden();

  // ⏸ → "Sim" → Esc → back to the mission screen
  await page.touchscreen.tap(...await centro(page, '.tq-pausa'));
  await page.locator('.tq-opcao', { hasText: 'Sim' }).tap();
  await esperaEstado(page, TELA.MISSION);
  expect(modoJogo).toBe(modoMenu);
  expect(erros).toEqual([]);
});

test('mobile: orientation change mid-menu re-fits the canvas and taps stay exact (Review Focus 5)', async ({ page }) => {
  const erros = coletaErros(page);
  await abre(page);
  const vp = page.viewportSize()!;
  await page.touchscreen.tap(vp.width / 2, vp.height / 2);
  await page.waitForFunction(() => (window.__x85?.frame() ?? 0) > 40);
  await page.setViewportSize({ width: vp.height, height: vp.width }); // rotate
  await page.waitForTimeout(300);
  const modo = await confereLayout(page);
  // landscape: side bars when the letterbox margins are ≥ 96 px, otherwise corner buttons over the canvas ("sobre")
  if (vp.height > vp.width) expect(['lateral', 'sobre']).toContain(modo); else expect(modo).toBe('retrato');
  await toca(page, ...BOTAO.ranking);
  await esperaEstado(page, TELA.RANKING);
  await page.waitForTimeout(400);
  await toca(page, ...BOTAO.back);
  await esperaEstado(page, TELA.MAIN);
  expect(erros).toEqual([]);
});
