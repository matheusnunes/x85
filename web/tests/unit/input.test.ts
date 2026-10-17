import { test, expect } from 'vitest';
import { Entrada, K, codeToKeys, attachDom, pollGamepads, ControlePads, atalhoDoNavegador } from '../../src/engine/input';

test('press edge lasts one poll', () => {
  const e = new Entrada(); e.push({ t: 'down', k: K.ESPACO }); e.poll();
  expect(e.teclas[K.ESPACO]).toEqual({ pressionado: true, ativo: true, liberado: false });
  e.poll(); expect(e.teclas[K.ESPACO]).toEqual({ pressionado: false, ativo: true, liberado: false });
  e.push({ t: 'up', k: K.ESPACO }); e.poll();
  expect(e.teclas[K.ESPACO]).toEqual({ pressionado: false, ativo: false, liberado: true });
  e.poll(); expect(e.teclas[K.ESPACO]).toEqual({ pressionado: false, ativo: false, liberado: false });
});
test('down+up in the same frame loses the press (engine semantics)', () => {
  const e = new Entrada(); e.push({ t: 'down', k: K.LCTRL }); e.push({ t: 'up', k: K.LCTRL }); e.poll();
  expect(e.teclas[K.LCTRL]).toEqual({ pressionado: false, ativo: false, liberado: true });
});
test('blur releases all', () => {
  const e = new Entrada(); e.push({ t: 'down', k: K.ESQUERDA }); e.poll();
  e.push({ t: 'releaseAll' }); e.poll();
  expect(e.teclas[K.ESQUERDA].ativo).toBe(false);
});
test('aliases', () => {
  expect(codeToKeys('KeyX')).toEqual(expect.arrayContaining([K.X, K.LCTRL]));
  expect(codeToKeys('AltLeft')).toEqual([K.LALT]);
  expect(codeToKeys('KeyW')).toEqual(expect.arrayContaining([K.W, K.CIMA]));
});
test('mouse buttons have edges and position', () => {
  const e = new Entrada(); e.push({ t: 'mdown', b: 0, x: 10, y: 20 }); e.poll();
  expect(e.mouse.x).toBe(10); expect(e.mouse.botoes[0].pressionado).toBe(true);
});

test('enum order matches chien2d2.h', () => {
  expect([K.CIMA, K.BAIXO, K.DIREITA, K.ESQUERDA, K.ESC, K.F1, K.F4, K.A, K.K_, K.Z, K.N0, K.N9, K.ENTER, K.ESPACO, K.BACKSPACE,
    K.LALT, K.RALT, K.LCTRL, K.RCTRL, K.LSHIFT, K.RSHIFT, K.ENCERRA, K.MAXTECLAS])
    .toEqual([0, 1, 2, 3, 4, 5, 8, 9, 19, 34, 35, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]);
  expect(new Entrada().teclas.length).toBe(K.MAXTECLAS);
});
test('full alias table', () => {
  expect(codeToKeys('ArrowUp')).toEqual([K.CIMA]);
  expect(codeToKeys('ArrowDown')).toEqual([K.BAIXO]);
  expect(codeToKeys('ArrowLeft')).toEqual([K.ESQUERDA]);
  expect(codeToKeys('ArrowRight')).toEqual([K.DIREITA]);
  expect(codeToKeys('Space')).toEqual([K.ESPACO]);
  expect(codeToKeys('ControlLeft')).toEqual([K.LCTRL]);
  expect(codeToKeys('KeyJ')).toEqual(expect.arrayContaining([K.J, K.ESPACO]));
  expect(codeToKeys('KeyK')).toEqual(expect.arrayContaining([K.K_, K.LCTRL]));
  expect(codeToKeys('KeyZ')).toEqual(expect.arrayContaining([K.Z, K.LALT]));
  expect(codeToKeys('KeyL')).toEqual(expect.arrayContaining([K.L, K.LALT]));
  expect(codeToKeys('KeyS')).toEqual(expect.arrayContaining([K.S, K.BAIXO]));
  expect(codeToKeys('KeyA')).toEqual(expect.arrayContaining([K.A, K.ESQUERDA]));
  expect(codeToKeys('KeyD')).toEqual(expect.arrayContaining([K.D, K.DIREITA]));
  expect(codeToKeys('KeyB')).toEqual([K.B]);
  expect(codeToKeys('Digit0')).toEqual([K.N0]);
  expect(codeToKeys('Digit9')).toEqual([K.N9]);
  expect(codeToKeys('Escape')).toEqual([K.ESC]);
  expect(codeToKeys('Enter')).toEqual([K.ENTER]);
  expect(codeToKeys('Backspace')).toEqual([K.BACKSPACE]);
  expect(codeToKeys('ShiftLeft')).toEqual([K.LSHIFT]);
  expect(codeToKeys('ShiftRight')).toEqual([K.RSHIFT]);
  expect(codeToKeys('F3')).toEqual([K.F3]);
  expect(codeToKeys('Unidentified')).toEqual([]);
});
test('typed chars are delivered for one poll only', () => {
  const e = new Entrada(); e.push({ t: 'char', c: 'a' }); e.push({ t: 'char', c: 'b' }); e.poll();
  expect(e.typed).toEqual(['a', 'b']); e.poll(); expect(e.typed).toEqual([]);
});
test('releaseAll releases mouse buttons too', () => {
  const e = new Entrada(); e.push({ t: 'mdown', b: 2, x: 1, y: 1 }); e.poll();
  e.push({ t: 'releaseAll' }); e.poll();
  expect(e.mouse.botoes[2]).toEqual({ pressionado: false, ativo: false, liberado: true });
});

// --- DOM -------------------------------------------------------------------
type Handler = (ev: Record<string, unknown>) => void;
function fakeWin() {
  const h = new Map<string, Handler[]>();
  const dh = new Map<string, Handler[]>();
  const reg = (m: Map<string, Handler[]>) => (t: string, f: Handler) => { m.set(t, [...(m.get(t) ?? []), f]); };
  const unreg = (m: Map<string, Handler[]>) => (t: string, f: Handler) => { m.set(t, (m.get(t) ?? []).filter(x => x !== f)); };
  const document = { visibilityState: 'visible', addEventListener: reg(dh), removeEventListener: unreg(dh) };
  const win = { document, addEventListener: reg(h), removeEventListener: unreg(h) };
  const fire = (t: string, ev: Record<string, unknown> = {}, doc = false) =>
    (doc ? dh : h).get(t)?.forEach(f => f(ev));
  const count = () => [...h.values(), ...dh.values()].reduce((n, a) => n + a.length, 0);
  return { win: win as unknown as Window, document, fire, count };
}
const key = (code: string, extra: Record<string, unknown> = {}) => {
  let prevented = false;
  return { ev: { code, repeat: false, target: { id: 'tela' }, preventDefault: () => { prevented = true; }, ...extra }, was: () => prevented };
};

test('attachDom: keydown/keyup drive buttons, repeat ignored, arrows prevented', () => {
  const e = new Entrada(); const f = fakeWin(); attachDom(e, f.win, (x, y) => ({ x, y }));
  const d = key('ArrowLeft'); f.fire('keydown', d.ev); e.poll();
  expect(d.was()).toBe(true);
  expect(e.teclas[K.ESQUERDA].pressionado).toBe(true);
  f.fire('keydown', key('ArrowLeft', { repeat: true }).ev); e.poll();
  expect(e.teclas[K.ESQUERDA]).toEqual({ pressionado: false, ativo: true, liberado: false });
  f.fire('keyup', key('ArrowLeft').ev); e.poll();
  expect(e.teclas[K.ESQUERDA].liberado).toBe(true);
  const q = key('KeyQ'); f.fire('keydown', q.ev); expect(q.was()).toBe(false);
});
test('attachDom: #texto keys are not prevented', () => {
  const e = new Entrada(); const f = fakeWin(); attachDom(e, f.win, (x, y) => ({ x, y }));
  for (const c of ['Backspace', 'Space', 'ArrowLeft']) {
    const k = key(c, { target: { id: 'texto' } }); f.fire('keydown', k.ev); expect(k.was()).toBe(false);
  }
  const t = key('Tab'); f.fire('keydown', t.ev); expect(t.was()).toBe(true);
});
test('attachDom: alias release only when no other held code maps to the key', () => {
  const e = new Entrada(); const f = fakeWin(); attachDom(e, f.win, (x, y) => ({ x, y }));
  f.fire('keydown', key('ControlLeft').ev); f.fire('keydown', key('KeyX').ev); e.poll();
  f.fire('keyup', key('KeyX').ev); e.poll();
  expect(e.teclas[K.LCTRL].ativo).toBe(true); expect(e.teclas[K.X].ativo).toBe(false);
  f.fire('keyup', key('ControlLeft').ev); e.poll();
  expect(e.teclas[K.LCTRL].ativo).toBe(false);
});
test('attachDom: blur and hidden release all; visible does not', () => {
  const e = new Entrada(); const f = fakeWin(); attachDom(e, f.win, (x, y) => ({ x, y }));
  f.fire('keydown', key('ArrowUp').ev); e.poll();
  f.fire('blur'); e.poll(); expect(e.teclas[K.CIMA].ativo).toBe(false);
  f.fire('keydown', key('ArrowUp').ev); e.poll();
  f.fire('visibilitychange', {}, true); e.poll(); expect(e.teclas[K.CIMA].ativo).toBe(true);
  f.document.visibilityState = 'hidden';
  f.fire('visibilitychange', {}, true); e.poll(); expect(e.teclas[K.CIMA].ativo).toBe(false);
  // after releaseAll a fresh press works again
  f.fire('keydown', key('ArrowUp').ev); e.poll(); expect(e.teclas[K.CIMA].pressionado).toBe(true);
});
test('attachDom: mouse pointers mapped, touch ignored, detach removes listeners', () => {
  const e = new Entrada(); const f = fakeWin();
  const off = attachDom(e, f.win, (x, y) => ({ x: x / 2, y: y / 2 }));
  const p = (type: string, extra: Record<string, unknown>) => f.fire(type, { pointerType: 'mouse', button: 0, clientX: 100, clientY: 60, preventDefault() {}, ...extra });
  p('pointermove', {}); e.poll(); expect([e.mouse.x, e.mouse.y]).toEqual([50, 30]);
  p('pointerdown', { button: 2 }); e.poll(); expect(e.mouse.botoes[1].pressionado).toBe(true); // right -> MDIREITO
  p('pointerup', { button: 2 }); e.poll(); expect(e.mouse.botoes[1].liberado).toBe(true);
  p('pointerdown', { button: 1 }); e.poll(); expect(e.mouse.botoes[2].pressionado).toBe(true); // middle -> MMEIO
  p('pointerdown', { button: 0, pointerType: 'touch', clientX: 400 }); e.poll();
  expect(e.mouse.botoes[0].ativo).toBe(false); expect(e.mouse.x).toBe(50);
  off(); expect(f.count()).toBe(0);
});

// --- Gamepad ---------------------------------------------------------------
const pad = (btn: number[] = [], axes: number[] = [0, 0, 0, 0]) =>
  ({ buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: btn.includes(i), value: btn.includes(i) ? 1 : 0, touched: false })), axes } as unknown as Gamepad);
test('gamepad: stick/dpad/buttons diff into down/up', () => {
  const e = new Entrada(); const prev = { mask: 0 };
  pollGamepads(e, [pad([0, 1, 4, 9], [-0.8, 0.5, 0, 0])], prev); e.poll();
  expect(e.teclas[K.ESPACO].pressionado).toBe(true);
  expect(e.teclas[K.LCTRL].pressionado).toBe(true);
  expect(e.teclas[K.LALT].pressionado).toBe(true);
  expect(e.teclas[K.ESC].pressionado).toBe(true);
  expect(e.teclas[K.ESQUERDA].ativo).toBe(true);
  expect(e.teclas[K.BAIXO].ativo).toBe(true);
  pollGamepads(e, [pad([0, 1, 4, 9], [-0.8, 0.5, 0, 0])], prev); e.poll();
  expect(e.teclas[K.ESPACO]).toEqual({ pressionado: false, ativo: true, liberado: false });
  pollGamepads(e, [pad([], [0.2, 0.34, 0, 0])], prev); e.poll(); // inside deadzone
  expect(e.teclas[K.ESPACO].liberado).toBe(true);
  expect(e.teclas[K.ESQUERDA].liberado).toBe(true);
  expect(e.teclas[K.BAIXO].liberado).toBe(true);
  pollGamepads(e, [null, pad([7, 12, 15])], prev); e.poll(); // RT, dpad up+right, second pad, null first
  expect(e.teclas[K.ESPACO].ativo).toBe(true);
  expect(e.teclas[K.CIMA].ativo).toBe(true); expect(e.teclas[K.DIREITA].ativo).toBe(true);
  pollGamepads(e, [], prev); e.poll();
  expect(e.teclas[K.CIMA].ativo).toBe(false);
});

test('gamepad: after a blur releaseAll, ressincroniza() makes a still-held button press again (D10)', () => {
  const e = new Entrada(); const c = new ControlePads();
  c.poll(e, [pad([0], [-0.8, 0, 0, 0])]); e.poll();
  expect(e.teclas[K.ESPACO].ativo).toBe(true); expect(e.teclas[K.ESQUERDA].ativo).toBe(true);
  e.push({ t: 'releaseAll' }); c.ressincroniza();          // window blur (attachDom) + main.ts re-sync
  c.poll(e, [pad([0], [-0.8, 0, 0, 0])]); e.poll();         // still held
  expect(e.teclas[K.ESPACO].ativo).toBe(true); expect(e.teclas[K.ESQUERDA].ativo).toBe(true);
  // without the re-sync the held button would stay released until pressed again
  const e2 = new Entrada(); const prev = { mask: 0 };
  pollGamepads(e2, [pad([0])], prev); e2.poll(); e2.push({ t: 'releaseAll' });
  pollGamepads(e2, [pad([0])], prev); e2.poll();
  expect(e2.teclas[K.ESPACO].ativo).toBe(false);
});

test('gamepad: while paused a newly pressed button (not a direction, not one held at pause) resumes; it is swallowed (D10)', () => {
  const e = new Entrada(); const c = new ControlePads();
  c.poll(e, [pad([1], [0, -0.8, 0, 0])]); e.poll();          // B (LCTRL) + up held when the game pauses
  e.push({ t: 'releaseAll' }); c.ressincroniza();
  c.pausa([pad([1], [0, -0.8, 0, 0])]);
  expect(c.gestoPausa([pad([1], [0, -0.8, 0, 0])])).toBe(0); // held since before the pause: no resume
  expect(c.gestoPausa([pad([1], [0.9, -0.8, 0, 0])])).toBe(0); // a direction never resumes
  expect(c.gestoPausa([])).toBe(0);                          // released...
  const novos = c.gestoPausa([pad([9], [0, -0.8, 0, 0])]);   // ...Start pressed: resume
  expect(novos).not.toBe(0);
  c.retomou(novos);
  c.poll(e, [pad([9], [0, -0.8, 0, 0])]); e.poll();
  expect(e.teclas[K.CIMA].ativo).toBe(true);                 // still-held direction re-pressed
  expect(e.teclas[K.ESC].pressionado).toBe(false);           // the resume button does not reach the game
  c.pausa([pad([0])]); expect(c.gestoPausa([pad([0, 9])])).not.toBe(0);
  c.retomou(0); c.poll(e, [pad([0])]); e.poll();             // resumed by key/click: held A pressed again
  expect(e.teclas[K.ESPACO].pressionado).toBe(true);
});

test('browser shortcuts are recognised so the start/resume gesture leaves them alone', () => {
  const k = (code: string, m: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {}) =>
    ({ code, ctrlKey: false, metaKey: false, altKey: false, ...m });
  for (const ev of [k('F11'), k('F5'), k('F1'), k('F12'), k('KeyR', { metaKey: true }), k('KeyR', { ctrlKey: true }),
    k('KeyL', { metaKey: true }), k('KeyW', { ctrlKey: true }), k('ArrowLeft', { altKey: true }), k('Tab', { altKey: true })])
    expect(atalhoDoNavegador(ev)).toBe(true);
  for (const ev of [k('Space'), k('Enter'), k('KeyA'), k('ArrowLeft'), k('AltLeft', { altKey: true }), k('ControlLeft', { ctrlKey: true }), k('MetaLeft', { metaKey: true })])
    expect(atalhoDoNavegador(ev)).toBe(false);
});
