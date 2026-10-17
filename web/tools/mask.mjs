// Collision-mask helpers. Format: LE Uint32 [w, h], then h rows of ceil(w/32) LE Uint32 words;
// bit (x & 31) (LSB-first) of word (x >> 5) is 1 when the pixel is solid.
import { decodePng } from './png.mjs';

/** @param {number} w @param {number} h @param {(x:number,y:number)=>boolean} solidAt @returns {Buffer} */
export function packMask(w, h, solidAt) {
  const wpr = Math.ceil(w / 32);
  const buf = Buffer.alloc(8 + wpr * h * 4);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  dv.setUint32(0, w, true);
  dv.setUint32(4, h, true);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solidAt(x, y)) continue;
      const off = 8 + (y * wpr + (x >> 5)) * 4;
      dv.setUint32(off, (dv.getUint32(off, true) | (1 << (x & 31))) >>> 0, true);
    }
  }
  return buf;
}

/**
 * Solid <=> (r|g|b|a) != 0 after the engine's PontoTransparente rule:
 * opaque magenta (255,0,255,255) becomes 0x00000000 (whole pixel, alpha included).
 */
export function maskFromRgba(width, height, rgba) {
  return packMask(width, height, (x, y) => {
    const i = (y * width + x) * 4;
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3];
    if (r === 255 && g === 0 && b === 255 && a === 255) return false;
    return (r | g | b | a) !== 0;
  });
}

export function pngMask(buf) {
  const { width, height, rgba } = decodePng(buf);
  return { w: width, h: height, mask: maskFromRgba(width, height, rgba) };
}

/** Dimensions from the SOF0/SOF1/SOF2 marker. */
export function jpgSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error('jpg: bad SOI');
  let p = 2;
  while (p + 4 <= buf.length) {
    if (buf[p] !== 0xff) { p++; continue; }
    const m = buf[p + 1];
    if (m === 0xff) { p++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { p += 2; continue; }
    const len = buf.readUInt16BE(p + 2);
    if (m === 0xc0 || m === 0xc1 || m === 0xc2) {
      return { h: buf.readUInt16BE(p + 5), w: buf.readUInt16BE(p + 7) };
    }
    p += 2 + len;
  }
  throw new Error('jpg: no SOF marker');
}

/** JPG pixels are all solid (the C loader gives alpha 255). */
export function jpgMask(buf) {
  const { w, h } = jpgSize(buf);
  return { w, h, mask: packMask(w, h, () => true) };
}
