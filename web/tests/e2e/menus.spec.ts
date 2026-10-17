// Desktop: every menu screen reached by clicks at the 01-game-spec §2 button coordinates, screenshotted with a fake
// clock (deterministic frames); resize mid-session then click again (Review Focus 5); splash credits overlay (R19).
import { test, expect, type Page } from '@playwright/test';
import { Relogio, abre, coletaErros, estado, quadro, TELA, BOTAO } from './util';

test.skip(({ isMobile }) => isMobile, 'desktop projects only');

const foto = (page: Page) => ({ maxDiffPixelRatio: 0.02, mask: [page.locator('#fps')] });

test('menus: main → slots → name → mission, options, ranking, about + credits; resize keeps clicks exact', async ({ page }) => {
  const erros = coletaErros(page);
  const r = new Relogio(page);
  await r.instala();
  await abre(page);
  await r.congela();
  await expect(page).toHaveScreenshot('splash.png', foto(page));

  // start gesture → principal(): splash x85.jpg, then the main menu (fade-in done after ~1 s)
  await page.mouse.click(640, 400);
  await r.passa(100);
  await r.ateEstado(TELA.MAIN);
  await r.passa(1000);
  expect(await quadro(page)).toBeGreaterThan(50);
  await expect(page).toHaveScreenshot('main.png', foto(page));

  // start → slot select (all slots "new")
  await r.clica(...BOTAO.start);
  await r.ateEstado(TELA.SLOT_SELECT);
  await r.passa(600);
  await expect(page).toHaveScreenshot('slot-select.png', foto(page));

  // empty slot 1 → name entry; type "argus"
  await r.clica(...BOTAO.slot0);
  await r.ateEstado(TELA.SLOT_INSERT);
  await r.passa(400);
  for (const k of 'argus') await r.tecla(`Key${k.toUpperCase()}`);
  await r.passa(300);
  await expect(page).toHaveScreenshot('slot-insert.png', foto(page));

  // Easy → mission (planet 1 selected, "Welcome argus !")
  await r.clica(...BOTAO.easy);
  await r.ateEstado(TELA.MISSION);
  await r.passa(1500);
  await expect(page).toHaveScreenshot('mission.png', foto(page));
  const slot = await page.evaluate(() => Object.entries(localStorage).map(([, v]) => v).join(' '));
  expect(slot).toContain('"nome":"argus"');

  // back to main (Esc), then options / ranking / about via clicks, back button each time
  await r.tecla('Escape');
  await r.ateEstado(TELA.MAIN);
  await r.passa(300);

  await r.clica(...BOTAO.options);
  await r.ateEstado(TELA.OPCOES);
  await r.passa(600);
  await expect(page).toHaveScreenshot('options.png', foto(page));
  await r.clica(...BOTAO.back);
  await r.ateEstado(TELA.MAIN);
  await r.passa(300);

  await r.clica(...BOTAO.ranking);
  await r.ateEstado(TELA.RANKING);
  await r.passa(600);
  await expect(page).toHaveScreenshot('ranking.png', foto(page));
  await r.clica(...BOTAO.back);
  await r.ateEstado(TELA.MAIN);
  await r.passa(300);

  await r.clica(...BOTAO.about);
  await r.ateEstado(TELA.ABOUT);
  await r.passa(600);
  await expect(page).toHaveScreenshot('about.png', foto(page));
  await r.clica(...BOTAO.painelAbout); // D10 / R19: credits page
  await r.passa(300);
  await expect(page).toHaveScreenshot('about-credits.png', foto(page));
  await r.clica(...BOTAO.back);
  await r.ateEstado(TELA.MAIN);
  await r.passa(300);

  // Review Focus 5: resize mid-session → canvas re-letterboxed, pointer mapping still exact
  await page.setViewportSize({ width: 900, height: 700 });
  await r.passa(200);
  const caixa = await page.locator('#tela').boundingBox();
  expect(caixa!.width).toBeCloseTo(900, 0);
  expect(caixa!.height).toBeCloseTo(675, 0);
  expect(caixa!.y).toBeCloseTo(12.5, 0);
  await r.clica(...BOTAO.start);
  await r.ateEstado(TELA.SLOT_SELECT);
  await r.passa(600);
  await expect(page).toHaveScreenshot('slot-select-900x700.png', foto(page));

  expect(erros).toEqual([]);
});

test('splash "Sobre / créditos" overlay: links open in a new tab, the overlay does not start the game', async ({ page }) => {
  const erros = coletaErros(page);
  await abre(page);
  const link = page.locator('#sobre-link');
  await expect(link).toBeVisible();
  await link.click();
  const overlay = page.locator('#creditos');
  await expect(overlay).toBeVisible();
  const links = overlay.locator('a');
  await expect(links).toHaveCount(3);
  for (const a of await links.all()) {
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', /noopener/);
  }
  await expect(overlay.locator('a[href="https://www.newgrounds.com/audio/listen/348628"]')).toBeVisible();
  await expect(overlay.locator('a[href="https://www.newgrounds.com/audio/listen/347665"]')).toBeVisible();
  await expect(overlay).toContainText('alvys18');
  await expect(overlay).toContainText('SasquaMox');
  await expect(overlay).toContainText('CC BY-NC 3.0');
  await expect(page).toHaveScreenshot('splash-credits.png', { maxDiffPixelRatio: 0.02, mask: [page.locator('#fps')] });
  // clicks inside the overlay and Esc do not start the game
  await overlay.locator('.caixa').click({ position: { x: 10, y: 10 } });
  await page.keyboard.press('Escape');
  await expect(overlay).toBeHidden();
  await page.waitForTimeout(300);
  expect(await quadro(page)).toBe(0);
  await expect(page.locator('#splash')).toBeVisible();
  // a click on the splash now starts it
  await page.mouse.click(300, 300);
  await page.waitForFunction(() => (window.__x85?.frame() ?? 0) > 10);
  expect(await estado(page)).toBe(TELA.MAIN);
  expect(erros).toEqual([]);
});
