import { test, expect } from 'vitest';
import { rand, srand } from '../../src/engine/rand';
test('glibc default sequence (seed 1)', () => {
  srand(1);
  expect([rand(), rand(), rand(), rand(), rand()]).toEqual([1804289383, 846930886, 1681692777, 1714636915, 1957747793]);
});
test('reseed restarts sequence', () => { srand(1); const a = rand(); srand(1); expect(rand()).toBe(a); });
test('seed 42 first value matches glibc; srand(0) behaves as srand(1)', () => {
  srand(42); expect(rand()).toBe(71876166);
  srand(0); const z = rand(); srand(1); expect(rand()).toBe(z);
});
