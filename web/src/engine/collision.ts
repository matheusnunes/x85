// Pixel-perfect sprite collision. orig: chien2d2.cpp:112-162 (C2D2_ColidiuSprites), :896-1136 (C2D2_SobrepoeBitMasks).
// Same results as the engine except its word-combining bugs (sign extension, reused first word of B,
// out-of-row reads) are fixed: this is a clean per-pixel AND over the overlap (02-engine §6).
import type { Mascara } from './assets';
import { C2D2_PegaSpriteSet, origemQuadro } from './sprites';

/** 32 pixels of row y starting at column x (bit k = pixel x+k); pixels outside the mask read as 0. */
function palavra(m: Mascara, x: number, y: number): number {
  if (y < 0 || y >= m.h) return 0;
  const base = y * m.ldwords, wi = x >> 5, sh = x & 31;
  const w0 = wi >= 0 && wi < m.ldwords ? m.bits[base + wi] : 0;
  if (sh === 0) return w0 >>> 0;
  const w1 = wi + 1 >= 0 && wi + 1 < m.ldwords ? m.bits[base + wi + 1] : 0;
  return ((w0 >>> sh) | (w1 << (32 - sh))) >>> 0;
}

/**
 * Frame A = rect (ax0,ay0,aw,ah) of mask a; frame B = rect (bx0,by0,bw,bh) of mask b, placed at (offx,offy)
 * relative to A's top-left. True when some pixel is solid in both frames.
 */
export function colidemMascaras(a: Mascara, ax0: number, ay0: number, aw: number, ah: number,
  b: Mascara, bx0: number, by0: number, bw: number, bh: number, offx: number, offy: number): boolean {
  // Overlap in A-frame coordinates; empty → bounding boxes do not overlap
  const x0 = Math.max(0, offx), x1 = Math.min(aw, offx + bw);
  const y0 = Math.max(0, offy), y1 = Math.min(ah, offy + bh);
  if (x0 >= x1 || y0 >= y1) return false;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x += 32) {
      const n = Math.min(32, x1 - x);
      const sel = n === 32 ? 0xffffffff : (1 << n) - 1;
      if ((palavra(a, ax0 + x, ay0 + y) & palavra(b, bx0 + x - offx, by0 + y - offy) & sel) !== 0) return true;
    }
  }
  return false;
}

// orig: chien2d2.cpp:112 C2D2_ColidiuSprites — top-left positions, load-time frame size (scaling ignored)
export function C2D2_ColidiuSprites(id1: number, i1: number, x1: number, y1: number, id2: number, i2: number, x2: number, y2: number): boolean {
  const s1 = C2D2_PegaSpriteSet(id1), s2 = C2D2_PegaSpriteSet(id2);
  const o1 = origemQuadro(s1, i1), o2 = origemQuadro(s2, i2);
  if (!s1 || !s2 || !o1 || !o2) return false;
  const offx = (x2 | 0) - (x1 | 0), offy = (y2 | 0) - (y1 | 0);
  // orig: chien2d2.cpp:130-156 bounding-box reject (strict >; touching boxes then have no pixel overlap)
  if (offx >= 0 ? offx > s1.spLargura : -offx > s2.spLargura) return false;
  if (offy >= 0 ? offy > s1.spAltura : -offy > s2.spAltura) return false;
  return colidemMascaras(s1.mask, o1[0], o1[1], s1.spLargura, s1.spAltura, s2.mask, o2[0], o2[1], s2.spLargura, s2.spAltura, offx, offy);
}
