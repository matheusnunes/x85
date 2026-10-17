import { test, expect } from 'vitest';
import { PassoFixo, MedidorFps } from '../../src/engine/loop';
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
