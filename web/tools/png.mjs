// Minimal PNG decoder for the build pipeline: 8-bit, colour type 2 (RGB) or 6 (RGBA), non-interlaced.
import { inflateSync } from 'node:zlib';

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** @param {Buffer} buf @returns {{width:number,height:number,rgba:Uint8Array}} */
export function decodePng(buf) {
  for (let i = 0; i < 8; i++) if (buf[i] !== SIG[i]) throw new Error('png: bad signature');
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  let sawIhdr = false, sawIend = false;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len; // length + type + data + crc
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
      sawIhdr = true;
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      sawIend = true;
      break;
    }
  }
  if (!sawIhdr) throw new Error('png: missing IHDR');
  if (!sawIend) throw new Error('png: missing IEND');
  if (bitDepth !== 8) throw new Error(`png: unsupported bit depth ${bitDepth}`);
  if (colorType !== 2 && colorType !== 6) throw new Error(`png: unsupported colour type ${colorType}`);
  if (interlace !== 0) throw new Error('png: interlaced images are not supported');

  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * height) throw new Error('png: truncated image data');

  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const up = dst - stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const a = i >= bpp ? out[dst + i - bpp] : 0;
      const b = y > 0 ? out[up + i] : 0;
      const c = y > 0 && i >= bpp ? out[up + i - bpp] : 0;
      let v;
      switch (ft) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`png: bad filter type ${ft}`);
      }
      out[dst + i] = v & 255;
    }
  }
  if (bpp === 4) return { width, height, rgba: out };
  const rgba = new Uint8Array(width * height * 4);
  for (let p = 0, q = 0; p < out.length; p += 3, q += 4) {
    rgba[q] = out[p]; rgba[q + 1] = out[p + 1]; rgba[q + 2] = out[p + 2]; rgba[q + 3] = 255;
  }
  return { width, height, rgba };
}
