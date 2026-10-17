#!/usr/bin/env python3
"""Compute Chien2D 2 bitmap-font metrics exactly like C2D2_CarregaFonte (chien2d2.cpp:175-325).

Usage: python3 -I c2d2_font_metrics.py FONT.png SIZE [OUT.json]       (needs Pillow)
       e.g. python3 -I c2d2_font_metrics.py "X85-devcore 2/dados/menu/512.png" 32 out/font-512.json

Font image = 16x16 grid of SIZExSIZE cells (image must be exactly 16*SIZE square, :221).
Glyph for byte c (unsigned char, Latin-1) is sprite frame c = row*16+col.
Transparent pixel = RGBA value exactly 0 or opaque magenta (PontoTransparente, :716-733; the GL
loader already turned magenta into 0).
  primeira = first column (0..SIZE-1) containing a non-transparent pixel  -> deslocamentos[c]
  if none: largura = SIZE, deslocamento = 0
  else ultima = first fully transparent column after primeira (or -1)
       if ultima >= 0: ultima += 1 (SIZE<16) | 1 (SIZE<32) | 2 (SIZE<64) | 3 (else)
                       largura = ultima-primeira if ultima <= SIZE else SIZE-primeira
       else largura = SIZE-primeira
  space (32): largura = SIZE/2, deslocamento = 0 (:319-320)
Drawing (C2D2_DesenhaTexto, :371-436): pen starts at x (LEFT), x - W (RIGHT) or x - W/2 (CENTRE),
W = sum(larguras); each glyph is drawn unscaled at (pen - deslocamentos[c], y) and pen += larguras[c].
"""
import json
import sys

from PIL import Image


def metrics(path, size):
    im = Image.open(path).convert("RGBA")
    assert im.size == (16 * size, 16 * size), f"font must be {16*size}x{16*size}, got {im.size}"
    px = im.load()

    def transp(x, y):
        p = px[x, y]
        return p == (0, 0, 0, 0) or p == (255, 0, 255, 255)

    desl = [0] * 256
    larg = [0] * 256
    for linha in range(16):
        for coluna in range(16):
            c = linha * 16 + coluna
            ox, oy = coluna * size, linha * size
            primeira = -1
            for x in range(size):
                if any(not transp(ox + x, oy + y) for y in range(size)):
                    primeira = x
                    break
            if primeira < 0:
                larg[c] = size
                desl[c] = 0
                continue
            desl[c] = primeira
            ultima = -1
            for x in range(primeira + 1, size):
                if all(transp(ox + x, oy + y) for y in range(size)):
                    ultima = x
                    break
            if ultima >= 0:
                ultima += 1 if size < 16 else 1 if size < 32 else 2 if size < 64 else 3
                larg[c] = ultima - primeira if ultima <= size else size - primeira
            else:
                larg[c] = size - primeira
    larg[32] = size // 2
    desl[32] = 0
    return desl, larg


if __name__ == "__main__":
    path, size = sys.argv[1], int(sys.argv[2])
    d, l = metrics(path, size)
    out = {"source": path.split("/")[-1], "cell": size, "grid": "16x16, glyph = byte value",
           "deslocamentos": d, "larguras": l}
    if len(sys.argv) > 3:
        with open(sys.argv[3], "w") as f:
            json.dump(out, f)
    sample = "pts: 000012345"
    print("printable glyph widths:", {chr(c): l[c] for c in range(32, 127)})
    print(f"text width of {sample!r} = {sum(l[ord(ch)] for ch in sample)} px")
