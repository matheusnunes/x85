// Mappy FMP parser mirroring Chien2D 2 (chien2d2mapa.cpp). See docs/analysis/02-engine-and-formats.md §10.

/** @param {Buffer} buf */
export function parseFmp(buf) {
  if (buf.toString('latin1', 0, 4) !== 'FORM' || buf.toString('latin1', 8, 12) !== 'FMAP') {
    throw new Error('fmp: not a FORM/FMAP file');
  }
  const total = buf.readUInt32BE(4) + 8;
  let width = 0, height = 0, tileW = 0, tileH = 0, lsb = true, haveHeader = false;
  /** @type {Int16Array | null} */
  let layer0 = null;
  let pos = 12;
  while (pos + 8 <= total && pos + 8 <= buf.length) {
    const id = buf.toString('latin1', pos, pos + 4);
    const size = buf.readUInt32BE(pos + 4);
    const d = pos + 8;
    if (id === 'MPHD') {
      lsb = buf[d + 2] !== 0;
      const s16 = (o) => (lsb ? buf.readInt16LE(d + o) : buf.readInt16BE(d + o));
      width = s16(4);
      height = s16(6);
      tileW = s16(12);
      tileH = s16(14);
      haveHeader = true;
    } else if (id === 'BODY') {
      if (!haveHeader) throw new Error('fmp: BODY before MPHD');
      const n = width * height;
      if (size < n * 2) throw new Error('fmp: BODY too short');
      layer0 = new Int16Array(n);
      for (let i = 0; i < n; i++) layer0[i] = lsb ? buf.readInt16LE(d + i * 2) : buf.readInt16BE(d + i * 2);
    }
    pos = d + size;
  }
  if (!haveHeader) throw new Error('fmp: missing MPHD');
  if (!layer0) throw new Error('fmp: missing BODY');
  return { width, height, tileW, tileH, layer0 };
}

/**
 * Marker positions (tile centre, map px) per code = cell value - offset, row-major order.
 * @returns {Record<string, [number, number][]>}
 */
export function markersOf(parsed, offset = 1) {
  const { width, height, tileW, tileH, layer0 } = parsed;
  /** @type {Record<string, [number, number][]>} */
  const out = {};
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const v = layer0[row * width + col];
      if (v <= 0) continue;
      const code = String(v - offset);
      (out[code] ??= []).push([col * tileW + Math.trunc(tileW / 2), row * tileH + Math.trunc(tileH / 2)]);
    }
  }
  return out;
}
