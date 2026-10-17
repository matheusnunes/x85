import { test, expect } from 'vitest';
import { padrao, carrega, grava, CHAVE } from '../../src/engine/storage';
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear(), key: () => null, length: 0 } as Storage; };
test('defaults', () => { const p = padrao(); expect(p.recordes.length).toBe(7); expect(p.recordes[0].nome).toBe('Matheus'); expect(p.saves.length).toBe(3); expect(p.saves.every(s => s.empty)).toBe(true); expect(p.opcoes).toEqual({ volume_music: 30, volume_effects: 30 }); });
test('round trip', () => { const s = mem(); const p = padrao(); p.saves[1] = { ...p.saves[1], empty: false, nome: 'argus', pts: 134500 }; grava(p, s); expect(carrega(s).saves[1].nome).toBe('argus'); });
test('corrupt JSON → defaults', () => { const s = mem(); s.setItem(CHAVE, '{oops'); expect(carrega(s)).toEqual(padrao()); });
test('throwing storage → defaults, no throw', () => {
  const s = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } } as unknown as Storage;
  expect(() => grava(padrao(), s)).not.toThrow(); expect(carrega(s)).toEqual(padrao());
});

test('defaults copy menu_recordes_default / menu_saves_default exactly', () => {
  const p = padrao();
  expect(p.recordes).toEqual([
    { nome: 'Matheus', pts: 9000 }, { nome: 'Argus', pts: 8000 }, { nome: 'chucknorris', pts: 3000 },
    { nome: 'magaiver', pts: 2000 }, { nome: 'loser', pts: 1000 }, { nome: 'bill', pts: 600 }, { nome: 'noob', pts: 500 },
  ]);
  for (const s of p.saves) {
    expect(s).toEqual({ empty: true, pts: 0, nome: 'new', level: 1, planeta_liberado: 0, planeta_atual: 0,
      tiro_liberado: [true, false, false, false, false, false] });
  }
  expect(p.versao).toBe(1);
});
test('padrao() returns independent copies', () => {
  const a = padrao(); a.saves[0].tiro_liberado[3] = true; a.recordes[0].pts = 1; a.saves[1].nome = 'x';
  const b = padrao(); expect(b.saves[0].tiro_liberado[3]).toBe(false); expect(b.recordes[0].pts).toBe(9000); expect(b.saves[1].nome).toBe('new');
});
test('no store / null store → defaults, never throws', () => {
  expect(carrega(null)).toEqual(padrao()); expect(() => grava(padrao(), null)).not.toThrow();
});
test('missing key → defaults', () => { expect(carrega(mem())).toEqual(padrao()); });
test('wrong shapes → defaults', () => {
  const bad: unknown[] = [
    null, 5, 'x', [], {}, { versao: 2, saves: [], recordes: [], opcoes: {} },
    { ...padrao(), saves: padrao().saves.slice(0, 2) },
    { ...padrao(), recordes: padrao().recordes.slice(0, 6) },
    { ...padrao(), opcoes: { volume_music: 'a', volume_effects: 3 } },
    { ...padrao(), saves: [{ ...padrao().saves[0], tiro_liberado: [true] }, padrao().saves[1], padrao().saves[2]] },
    { ...padrao(), recordes: [{ nome: 5, pts: 1 }, ...padrao().recordes.slice(1)] },
  ];
  for (const b of bad) { const s = mem(); s.setItem(CHAVE, JSON.stringify(b)); expect(carrega(s)).toEqual(padrao()); }
});
test('names are cut to 14 chars and volumes clamped on load', () => {
  const s = mem(); const p = padrao();
  p.saves[0].nome = 'abcdefghijklmnopqrst'; p.recordes[0].nome = 'x'.repeat(30);
  p.opcoes = { volume_music: 250, volume_effects: -5 };
  s.setItem(CHAVE, JSON.stringify(p));
  const r = carrega(s);
  expect(r.saves[0].nome).toBe('abcdefghijklmn'); expect(r.recordes[0].nome.length).toBe(14);
  expect(r.opcoes).toEqual({ volume_music: 100, volume_effects: 0 });
});
