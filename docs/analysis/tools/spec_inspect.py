#!/usr/bin/env python3
"""Inspection helper for docs/analysis/01-game-spec.md (X85-devcore 2).

Usage:  python3 -I spec_inspect.py "<path to X85-devcore 2>" [images|saves|maps|all]

Read-only. Reports:
  images : every image in dados/: size, PIL mode, frame grid for the frame size
           the game passes to C2D2_CarregaSpriteSet, per-frame bounding box of
           *collision-solid* pixels using the Chien2D2 rule
           (PontoTransparente: pixel is transparent only if its 32-bit value is 0
           or opaque magenta 255,0,255,255), and the count of pixels that are
           invisible (alpha 0) but still solid for collision (RGB != 0).
  saves  : decodes dados/saves.x85 (3 x tiposave, 44 bytes each, i386 gcc layout)
           and dados/recs.x85 (7 x tiporecorde, 20 bytes each).
  maps   : decodes the marker layer (layer 0 = BODY, offbloco = 1) of every
           dados/jogo/mapas/*.fmp and lists INICIO/FIM and game markers with
           pixel coordinates exactly as C2D2M_PrimeiroBlocoMarca returns them
           (col*bw + bw/2, row*bh + bh/2).
"""
import os
import struct
import sys
from collections import Counter, defaultdict

from PIL import Image

# frame sizes passed to C2D2_CarregaSpriteSet in devcore 2 (0,0 = whole image)
FRAMES = {
    "menu/x85.jpg": (0, 0), "menu/cursor.png": (40, 40), "menu/fundo.jpg": (0, 0),
    "menu/cover.png": (0, 0), "menu/darkback.png": (0, 0), "menu/botmain.png": (262, 62),
    "menu/botback.png": (65, 445), "menu/menutxt.png": (0, 0), "menu/otherbots.png": (220, 35),
    "menu/botdelslot.png": (62, 62), "menu/slotloadcover.png": (0, 0),
    "menu/slotinsertcover.png": (0, 0), "menu/slotback.png": (0, 0),
    "menu/logo.png": (128, 128), "menu/select.png": (180, 180),
    "menu/botplanetas.png": (110, 70), "menu/red.png": (0, 0), "menu/volume.png": (65, 190),
    "menu/optionscover.png": (0, 0), "menu/about1.png": (0, 0), "menu/about2.png": (0, 0),
    "menu/trofeus.png": (50, 50), "menu/recordstab.png": (486, 52), "menu/512.png": (32, 32),
    "jogo/loading.jpg": (0, 0), "jogo/ready.png": (0, 0), "jogo/fundo1.jpg": (0, 0),
    "jogo/nave.png": (60, 60), "jogo/flame.png": (40, 40), "jogo/explo.png": (0, 0),
    "jogo/barras_energy.png": (0, 0), "jogo/barras_bomba.png": (0, 0),
    "jogo/barras_back.png": (0, 0), "jogo/barra_inf.png": (0, 0),
    "jogo/inimigos/meteoro.png": (75, 75), "jogo/mapas/tileset.png": (32, 32),
}
for n in ("tiro1", "tiro2", "tiro3", "tiro4", "tiro5", "tiro6", "bomba", "tiroini1",
          "tiroini2", "tiroini3"):
    FRAMES[f"jogo/tiros/{n}.png"] = (0, 0)
for n in ("inim1", "inim2", "inim3", "inim4", "boss1", "boss2", "boss3", "boss4", "boss5"):
    FRAMES.setdefault(f"jogo/inimigos/{n}.png", (0, 0))
for n in range(1, 7):
    FRAMES[f"jogo/itens/T{n}.png"] = (0, 0)


def solid_matrix(img):
    """Return (w, h, solid[y][x], invisible_solid_count) per Chien2D2 rules."""
    w, h = img.size
    mode = img.mode
    if mode == "RGBA":
        px = img.load()
        raw = lambda x, y: px[x, y]
    elif mode == "P" and "transparency" in img.info:
        # SDL_image sets a colorkey; colorkey pixels are skipped by the blit and
        # stay 0 in the zeroed RGBA surface -> transparent.
        rgba = img.convert("RGBA")
        px = rgba.load()
        raw = lambda x, y: px[x, y]
    elif mode == "LA":
        rgba = img.convert("RGBA")
        px = rgba.load()
        raw = lambda x, y: px[x, y]
    else:
        # RGB / L / P without alpha: blitted into RGBA with alpha 255
        rgb = img.convert("RGB")
        px = rgb.load()
        raw = lambda x, y: (*px[x, y], 255)
    solid = [[False] * w for _ in range(h)]
    inv = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = raw(x, y)
            transparent = (r, g, b, a) == (0, 0, 0, 0) or (r, g, b, a) == (255, 0, 255, 255)
            solid[y][x] = not transparent
            if not transparent and a == 0:
                inv += 1
    return w, h, solid, inv


def bbox(solid, x0, y0, fw, fh):
    xs, ys = [], []
    for y in range(y0, y0 + fh):
        row = solid[y]
        for x in range(x0, x0 + fw):
            if row[x]:
                xs.append(x - x0)
                ys.append(y - y0)
    if not xs:
        return None, 0
    return (min(xs), min(ys), max(xs), max(ys)), len(xs)


def images(root):
    dados = os.path.join(root, "dados")
    for dirpath, _, files in sorted(os.walk(dados)):
        for f in sorted(files):
            if not f.lower().endswith((".png", ".jpg")):
                continue
            p = os.path.join(dirpath, f)
            rel = os.path.relpath(p, dados)
            img = Image.open(p)
            w, h = img.size
            fw, fh = FRAMES.get(rel, (None, None))
            note = ""
            if fw is None:
                note = "  [NOT REFERENCED BY GAME CODE]"
                fw, fh = 0, 0
            if fw == 0:
                fw, fh = w, h
            cols, rows = w // fw, h // fh
            print(f"{rel}: {w}x{h} mode={img.mode} frame={fw}x{fh} grid={cols}x{rows} "
                  f"({cols*rows} frames) rem=({w % fw},{h % fh}){note}")
            if rel in ("menu/512.png", "jogo/mapas/tileset.png", "menu/fundo.jpg",
                       "jogo/fundo1.jpg", "jogo/loading.jpg", "menu/x85.jpg"):
                continue
            _, _, solid, inv = solid_matrix(img)
            if inv:
                print(f"    !! {inv} pixels have alpha=0 but RGB!=0 -> invisible yet SOLID for collision")
            for i in range(cols * rows):
                bb, n = bbox(solid, (i % cols) * fw, (i // cols) * fh, fw, fh)
                print(f"    frame {i}: solid bbox={bb} solid_px={n}")


def cstr(b):
    return b.split(b"\0")[0].decode("latin1"), b.hex()


def saves(root):
    p = os.path.join(root, "dados", "saves.x85")
    data = open(p, "rb").read()
    print(f"saves.x85: {len(data)} bytes (expected 3*44=132)")
    for i in range(len(data) // 44):
        rec = data[i * 44:(i + 1) * 44]
        empty = rec[0]
        pad0 = rec[1:4].hex()
        pts, = struct.unpack("<i", rec[4:8])
        nome, nomehex = cstr(rec[8:23])
        pad1 = rec[23:24].hex()
        level, lib, atual = struct.unpack("<iii", rec[24:36])
        tiros = list(rec[36:42])
        pad2 = rec[42:44].hex()
        print(f"  slot {i}: empty={empty} pts={pts} nome={nome!r} (raw {nomehex}) level={level} "
              f"planeta_liberado={lib} planeta_atual={atual} tiro_liberado={tiros} "
              f"pad=[{pad0}|{pad1}|{pad2}]")
    p = os.path.join(root, "dados", "recs.x85")
    data = open(p, "rb").read()
    print(f"recs.x85: {len(data)} bytes (expected 7*20=140)")
    for i in range(len(data) // 20):
        rec = data[i * 20:(i + 1) * 20]
        nome, nomehex = cstr(rec[0:15])
        pad = rec[15:16].hex()
        pts, = struct.unpack("<i", rec[16:20])
        print(f"  #{i+1}: nome={nome!r} pts={pts} (raw name {nomehex}, pad {pad})")


MARK = {0: "INICIO", 1: "FIM", 2: "CHECK", 20: "BOLA", 21: "M_INIMIGO1", 22: "M_INIMIGO2",
        23: "M_INIMIGO3", 24: "M_INIMIGO4", 25: "M_METEORO", 26: "M_BOSS", 27: "M_T1",
        28: "M_T2", 29: "M_T3", 30: "M_T4", 31: "M_T5", 32: "M_T6"}


def maps(root):
    d = os.path.join(root, "dados", "jogo", "mapas")
    for f in sorted(os.listdir(d)):
        if not f.endswith(".fmp"):
            continue
        buf = open(os.path.join(d, f), "rb").read()
        total = struct.unpack(">I", buf[4:8])[0] + 8
        i = 12
        hdr = None
        body = None
        names = []
        while i < total and i + 8 <= len(buf):
            name = buf[i:i + 4].decode("latin1")
            size = struct.unpack(">I", buf[i + 4:i + 8])[0]
            data = buf[i + 8:i + 8 + size]
            names.append(name)
            if name == "MPHD":
                lsb = data[2]
                e = "<" if lsb else ">"
                w, h, _, _, bw, bh = struct.unpack(e + "6h", data[4:16])
                hdr = (w, h, bw, bh, e)
            elif name == "BODY":
                w, h, bw, bh, e = hdr
                body = struct.unpack(e + f"{w*h}h", data[:w * h * 2])
            i += 8 + size
        w, h, bw, bh, _ = hdr
        print(f"== {f}: {w}x{h} blocks of {bw}x{bh} px -> {w*bw}x{h*bh} px; chunks={names}")
        pos = defaultdict(list)
        for k, v in enumerate(body):
            if v:
                m = v - 1
                pos[m].append(((k % w) * bw + bw // 2, (k // w) * bh + bh // 2))
        for m in sorted(pos):
            lab = MARK.get(m, f"engine/unknown {m}")
            pts = pos[m]
            ys = sorted({p[1] for p in pts})
            print(f"  marker {m:3d} {lab:11s}: {len(pts):3d}  y range {ys[0]}..{ys[-1]}")
            if m in (0, 1, 26) or len(pts) <= 12:
                print(f"      positions (x,y): {pts}")


def font(root):
    """Replicates C2D2_CarregaFonte (chien2d2.cpp:175-337) for dados/menu/512.png, size 32."""
    img = Image.open(os.path.join(root, "dados", "menu", "512.png"))
    _, _, solid, _ = solid_matrix(img)
    t = 32
    desl, larg = [0] * 256, [0] * 256
    for ch in range(256):
        lin, col = divmod(ch, 16)
        prim = -1
        for x in range(t):
            if any(solid[y + lin * t][x + col * t] for y in range(t)):
                prim = x
                break
        if prim < 0:
            larg[ch], desl[ch] = t, 0
            continue
        desl[ch] = prim
        ult = -1
        for x in range(prim + 1, t):
            if not any(solid[y + lin * t][x + col * t] for y in range(t)):
                ult = x
                break
        if ult >= 0:
            ult += 2  # tamanhoFonte 32 -> "<64" branch adds 2
            larg[ch] = ult - prim if ult <= t else t - prim
        else:
            larg[ch] = t - prim
    larg[32], desl[32] = t // 2, 0
    print("font 512.png (32px): char -> (deslocamento, largura)")
    for ch in range(32, 127):
        print(f"  {ch:3d} {chr(ch)!r}: ({desl[ch]}, {larg[ch]})")


if __name__ == "__main__":
    root = sys.argv[1]
    what = sys.argv[2] if len(sys.argv) > 2 else "all"
    if what in ("font", "all"):
        font(root)
    if what in ("images", "all"):
        images(root)
    if what in ("saves", "all"):
        saves(root)
    if what in ("maps", "all"):
        maps(root)
