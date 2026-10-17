import { test, expect } from 'vitest';
import { PassoFixo, MedidorFps, iniciaLoop } from '../../src/engine/loop';

/** A fake window whose rAF is driven by hand at `hz` (render rate). */
function janela() {
  let cb: ((t: number) => void) | null = null;
  const alvo = {
    document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    performance: { now: () => 0 },
    requestAnimationFrame(f: (t: number) => void) { cb = f; return 1; },
    cancelAnimationFrame() { cb = null; },
  };
  const roda = (hz: number, segundos: number, t0 = 0): number => {
    let t = t0;
    for (let i = 0; i < hz * segundos; i++) { const f = cb; cb = null; f?.(t); t += 1000 / hz; }
    return t;
  };
  return { alvo: alvo as unknown as Window, roda };
}
test('60 Hz on a 120 Hz display steps every other frame', () => {
  let n = 0; const p = new PassoFixo(() => n++); let t = 0;
  for (let i = 0; i < 120; i++) { p.tick(t); t += 1000 / 120; }
  expect(n).toBeGreaterThanOrEqual(59); expect(n).toBeLessThanOrEqual(61);
});
test('60 Hz on a 60 Hz display steps exactly once per frame', () => {
  let n = 0; const p = new PassoFixo(() => n++); let t = 0; const passos: number[] = [];
  for (let i = 0; i < 600; i++) { passos.push(p.tick(t)); t += 1000 / 60; }
  expect(n).toBe(600); expect(passos.every(s => s === 1)).toBe(true);
});
test('long hitch caps catch-up at 4 steps', () => { let n = 0; const p = new PassoFixo(() => n++); p.tick(0); n = 0; p.tick(5000); expect(n).toBe(4); });
test('backlog beyond the cap is dropped (no slow-motion spiral)', () => {
  let n = 0; const p = new PassoFixo(() => n++); p.tick(0); p.tick(5000); n = 0; p.tick(5000 + 1000 / 60); expect(n).toBe(1);
});
test('hidden → no catch-up after resume', () => { let n = 0; const p = new PassoFixo(() => n++); p.tick(0); p.pausar(); expect(p.tick(1000)).toBe(0); p.retomar(60_000); n = 0; p.tick(60_000 + 17); expect(n).toBe(1); });
test('pausado reflects state; a timestamp older than retomar does not go negative', () => {
  let n = 0; const p = new PassoFixo(() => n++); p.tick(0);
  p.pausar(); expect(p.pausado).toBe(true);
  p.retomar(1000); expect(p.pausado).toBe(false);
  n = 0; p.tick(990); p.tick(1000 + 1000 / 60); expect(n).toBe(1);
});
test('MedidorFps reports frames per second over a ~0.5 s window', () => {
  const m = new MedidorFps(); let t = 0;
  expect(m.fps()).toBe(0);
  for (let i = 0; i < 120; i++) { m.quadro(t); t += 1000 / 60; }
  expect(m.fps()).toBe(60);
  for (let i = 0; i < 120; i++) { m.quadro(t); t += 1000 / 30; }
  expect(m.fps()).toBe(30);
  m.reinicia(); expect(m.fps()).toBe(30); // keeps the last value until a new window completes
});
test('MedidorFps counts n frames per call (steps produced by a tick)', () => {
  const m = new MedidorFps(); let t = 0;
  for (let i = 0; i < 60; i++) { m.quadro(t, i % 2); t += 1000 / 60; } // 30 produced frames per second
  expect(m.fps()).toBe(30);
});
for (const hz of [60, 120, 144]) {
  test(`fps() reports the game frame rate (logic steps/s), ~60 on a ${hz} Hz display`, () => {
    let n = 0; const { alvo, roda } = janela(); const loop = iniciaLoop(new PassoFixo(() => n++), alvo);
    roda(hz, 3);
    expect(loop.fps()).toBeGreaterThanOrEqual(59); expect(loop.fps()).toBeLessThanOrEqual(61);
    expect(n).toBeGreaterThanOrEqual(178); expect(n).toBeLessThanOrEqual(182);
    loop.stop();
  });
}
test('fps() drops when the game cannot keep up (10 Hz rAF: at most 4 steps per frame → 40)', () => {
  const { alvo, roda } = janela(); const loop = iniciaLoop(new PassoFixo(() => {}), alvo);
  roda(10, 3);
  expect(loop.fps()).toBe(40);
  loop.stop();
});
