#!/usr/bin/env python3
"""Audit how Chien2D 2 (OpenGL renderer) would see each X85 sprite sheet.

Usage: python3 -I c2d2_mask_audit.py "<X85-devcore 2 dir>"     (needs Pillow)

For every C2D2_CarregaSpriteSet(file, w, h) call in X85-devcore 2 it reports:
  * frame grid (matrizX x matrizY) exactly as C2D2GL_CarregaSpriteSet computes it
    (chien2d2_gl.cpp:402-427: w==0||h==0 -> whole image; frames = floor(img/frame));
  * the padded power-of-two square texture size (chien2d2_gl.cpp:430-495, 16..1024);
  * whether the GL collision-mask index bug can bite: masks are built on the PADDED surface
    (chien2d2_gl.cpp:504/515 -> chien2d2.cpp:790-889) so mask index = row*(texW/frameW)+col, while
    C2D2_ColidiuSprites indexes bmask[indice] with indice = row*matrizX+col (chien2d2.cpp:159);
    frames on row >= 1 get the wrong mask when texW/frameW != matrizX;
  * collision-mask transparency per PontoTransparente (chien2d2.cpp:716-733): a pixel is
    "transparent" ONLY if its 32-bit RGBA value is exactly 0 (or opaque magenta, which the GL loader
    already zeroed).  So alpha==0 pixels with non-zero RGB, and any partially transparent pixel,
    are SOLID for collisions.  Counts are reported per sheet.
"""
import os
import sys

from PIL import Image

LOADS = [
    # (file, w, h) from X85-devcore 2 main.cpp / menu.cpp / jogo.cpp
    ("dados/menu/x85.jpg", 0, 0),
    ("dados/menu/cursor.png", 40, 40), ("dados/menu/fundo.jpg", 0, 0), ("dados/menu/cover.png", 0, 0),
    ("dados/menu/darkback.png", 0, 0), ("dados/menu/botmain.png", 262, 62),
    ("dados/menu/botback.png", 65, 445), ("dados/menu/menutxt.png", 0, 0),
    ("dados/menu/otherbots.png", 220, 35), ("dados/menu/botdelslot.png", 62, 62),
    ("dados/menu/slotloadcover.png", 0, 0), ("dados/menu/slotinsertcover.png", 0, 0),
    ("dados/menu/slotback.png", 0, 0), ("dados/menu/logo.png", 128, 128),
    ("dados/menu/select.png", 180, 180), ("dados/menu/botplanetas.png", 110, 70),
    ("dados/menu/red.png", 0, 0), ("dados/menu/volume.png", 65, 190),
    ("dados/menu/optionscover.png", 0, 0), ("dados/menu/about1.png", 0, 0),
    ("dados/menu/about2.png", 0, 0), ("dados/menu/trofeus.png", 50, 50),
    ("dados/menu/recordstab.png", 486, 52), ("dados/menu/512.png", 32, 32),
    ("dados/jogo/loading.jpg", 0, 0), ("dados/jogo/ready.png", 0, 0),
    ("dados/jogo/mapas/tileset.png", 32, 32), ("dados/jogo/fundo1.jpg", 0, 0),
    ("dados/jogo/nave.png", 60, 60), ("dados/jogo/flame.png", 40, 40), ("dados/jogo/explo.png", 0, 0),
    *[(f"dados/jogo/tiros/{n}.png", 0, 0) for n in
      ("tiro1", "tiro2", "tiro3", "tiro4", "tiro5", "tiro6", "bomba", "tiroini1", "tiroini2", "tiroini3")],
    *[(f"dados/jogo/inimigos/{n}.png", 0, 0) for n in ("inim1", "inim2", "inim3", "inim4")],
    ("dados/jogo/inimigos/meteoro.png", 75, 75),
    *[(f"dados/jogo/inimigos/boss{i}.png", 0, 0) for i in range(1, 6)],
    *[(f"dados/jogo/itens/T{i}.png", 0, 0) for i in range(1, 7)],
    ("dados/jogo/barras_energy.png", 0, 0), ("dados/jogo/barras_bomba.png", 0, 0),
    ("dados/jogo/barras_back.png", 0, 0), ("dados/jogo/barra_inf.png", 0, 0),
]
# bomba.png is .png in code but is really an RGB image; tiros/bomba.png exists.


def pot(n):
    p = 16
    while p < n:
        p *= 2
    return p


def main(root):
    print("file | img WxH | mode | frame | grid | GL tex | mask-index bug? | magenta px | "
          "alpha0&rgb!=0 (SOLID in mask) | 0<alpha<255 (SOLID in mask)")
    for rel, w, h in LOADS:
        path = os.path.join(root, rel)
        if not os.path.exists(path):
            print(f"{rel} | MISSING")
            continue
        im = Image.open(path)
        mode = im.mode
        W, H = im.size
        fw, fh = (w, h) if (w and h) else (W, H)
        mx, my = W // fw, H // fh
        square_pot = (W == H and W in (16, 32, 64, 128, 256, 512, 1024) and mode == "RGBA")
        tex = W if square_pot else pot(max(W, H))
        colunas = tex // fw
        bug = (my > 1 and colunas != mx)
        rgba = im.convert("RGBA")
        mag = a0 = semi = 0
        raw = rgba.tobytes()
        for k in range(0, len(raw), 4):
            r, g, b, a = raw[k], raw[k + 1], raw[k + 2], raw[k + 3]
            if (r, g, b, a) == (255, 0, 255, 255):
                mag += 1
            elif a == 0 and (r or g or b):
                a0 += 1
            elif 0 < a < 255:
                semi += 1
        print(f"{rel} | {W}x{H} | {mode} | {fw}x{fh} | {mx}x{my} | {tex}x{tex} | "
              f"{'YES rows>=1 use wrong mask' if bug else 'no'} | {mag} | {a0} | {semi}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
