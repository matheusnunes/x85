// glibc rand()/srand() (TYPE_3 additive feedback generator, `random_r`), bit-exact.
// The original game seeds nothing explicitly in some paths, so the module starts as srand(1).
// orig: libc rand() used throughout the C++ sources.

export const RAND_MAX = 2147483647;

const R = new Int32Array(34); // ring buffer holding the last 34 words r[i-34..i-1]
let pos = 0; // ring index of the next word to be written (= i mod 34)

/** glibc srand(): seed 0 is treated as 1; the seed is read as unsigned 32-bit then as signed word. */
export function srand(seed: number): void {
  let s = seed >>> 0;
  if (s === 0) s = 1;
  let word = s | 0;
  R[0] = word;
  for (let i = 1; i < 31; i++) {
    // Schrage: word = (16807 * word) % 2147483647 without overflow (signed 32-bit)
    const hi = Math.trunc(word / 127773);
    const lo = word % 127773;
    word = 16807 * lo - 2836 * hi;
    if (word < 0) word += 2147483647;
    R[i] = word;
  }
  for (let i = 31; i < 34; i++) R[i] = R[i - 31];
  pos = 0; // next i = 34 -> ring slot 0
  for (let i = 0; i < 310; i++) next();
}

function next(): number {
  // r[i] = r[i-31] + r[i-3]  (mod 2^32); ring slot of r[i-34] == slot of r[i]
  const a = R[(pos + 3) % 34]; // r[i-31]
  const b = R[(pos + 31) % 34]; // r[i-3]
  const v = (a + b) | 0;
  R[pos] = v;
  pos = (pos + 1) % 34;
  return v >>> 1;
}

/** glibc rand(): 0..2^31-1. */
export function rand(): number {
  return next();
}

srand(1);
