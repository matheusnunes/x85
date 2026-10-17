#!/usr/bin/env python3
"""Pixel-level comparison of two 8-bit RGB/RGBA non-interlaced PNGs (stdlib only).

Usage: python3 -I png_diff.py a.png b.png [cell_w cell_h]

Reports: dimensions, number of differing pixels, bounding box of the
differences and, if a cell size is given (e.g. 32 32 for a tileset, or a
sprite-sheet frame size), which cells (frame indices, row-major) differ and
which cells are fully transparent in each image.
"""
import struct
import sys
import zlib


def decode(path):
    b = open(path, "rb").read()
    assert b[:8] == b"\x89PNG\r\n\x1a\n", path
    i = 8
    idat = b""
    while i < len(b):
        n = struct.unpack(">I", b[i:i + 4])[0]
        t = b[i + 4:i + 8]
        d = b[i + 8:i + 8 + n]
        if t == b"IHDR":
            w, h, bd, ct, _, _, il = struct.unpack(">IIBBBBB", d)
        elif t == b"IDAT":
            idat += d
        i += 12 + n
    assert bd == 8 and ct in (2, 6) and il == 0, f"unsupported PNG {path}: bd={bd} ct={ct} il={il}"
    bpp = 4 if ct == 6 else 3
    raw = zlib.decompress(idat)
    stride = w * bpp
    out = bytearray()
    prev = bytearray(stride)
    p = 0
    for _ in range(h):
        f = raw[p]
        line = bytearray(raw[p + 1:p + 1 + stride])
        p += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            up = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1:
                line[x] = (line[x] + a) & 255
            elif f == 2:
                line[x] = (line[x] + up) & 255
            elif f == 3:
                line[x] = (line[x] + ((a + up) >> 1)) & 255
            elif f == 4:
                pa, pb, pc = abs(up - c), abs(a - c), abs(a + up - 2 * c)
                pr = a if (pa <= pb and pa <= pc) else (up if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        out += line
        prev = line
    px = []
    for k in range(0, len(out), bpp):
        px.append(tuple(out[k:k + bpp]) + ((255,) if bpp == 3 else ()))
    return w, h, px


def main():
    a, b = sys.argv[1], sys.argv[2]
    cw = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    ch = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    wa, ha, pa = decode(a)
    wb, hb, pb = decode(b)
    print(f"A {a}: {wa}x{ha}\nB {b}: {wb}x{hb}")
    if (wa, ha) != (wb, hb):
        print("dimensions differ; no pixel diff")
        return
    diff = [i for i in range(len(pa)) if pa[i] != pb[i]]
    print(f"differing pixels: {len(diff)} / {len(pa)} ({100 * len(diff) / len(pa):.1f}%)")
    if diff:
        xs = [i % wa for i in diff]
        ys = [i // wa for i in diff]
        print(f"diff bbox: x {min(xs)}..{max(xs)}, y {min(ys)}..{max(ys)}")
    if cw and ch:
        cols = wa // cw
        cells = {}
        for i in diff:
            x, y = i % wa, i // wa
            cells.setdefault((y // ch) * cols + x // cw, 0)
            cells[(y // ch) * cols + x // cw] += 1
        print(f"cells ({cw}x{ch}, {cols} per row) that differ: {sorted(cells)}")

        def empty_cells(px):
            res = []
            for cy in range(ha // ch):
                for cx in range(cols):
                    if all(px[(cy * ch + yy) * wa + cx * cw + xx][3] == 0
                           for yy in range(ch) for xx in range(cw)):
                        res.append(cy * cols + cx)
            return res
        print(f"fully transparent cells A: {empty_cells(pa)}")
        print(f"fully transparent cells B: {empty_cells(pb)}")


if __name__ == "__main__":
    main()
