#!/usr/bin/env python3
"""Dump / export Mappy FMP maps exactly the way Chien2D 2 (chien2d2mapa.cpp) loads them.

Usage
-----
  python3 -I fmp_dump.py FILE.fmp [FILE2.fmp ...]          text dump (engine semantics)
  python3 -I fmp_dump.py --labels dc2 FILE.fmp              label marker codes with a game enum
                                                            (dc2 = X85-devcore 2, dc = X85-devcore, beta)
  python3 -I fmp_dump.py --json OUT.json FILE.fmp           export {width,height,tileW,tileH,layers,...}
  python3 -I fmp_dump.py --png OUT.png --tileset T.png FILE preview using an external tileset (needs Pillow)
  python3 -I fmp_dump.py --batch PROJECT_ROOT OUTDIR        run on every X85 map (report + JSON + PNGs)

Engine semantics mirrored here (file:line refer to X85-devcore 2/chien2d2mapa.cpp)
----------------------------------------------------------------------------------
* Container: bytes 0..3 must be "FORM", 8..11 "FMAP" (C2D2M_VerificaCabecalhoArquivo, :1380).
  FORM size is big-endian; chunks are parsed from offset 12 while offset < FORMsize+8 (:153-168).
  Each chunk = 4-char id + big-endian u32 size + payload (:171-177).  No padding/alignment.
* Only four chunk kinds are used (C2D2M_TipoBloco, :1408):  "MPHD", "ANDT", "BODY" and any id whose
  first three chars are "LYR" (layer number = 4th char - '0', :225).  Everything else (ATHR, EDHD,
  EPHD, CMAP, BKDT, BGFX, ...) is skipped (:272).
* MPHD (:183-207): struct overlay; byte 2 = lsb flag.  Only mapwidth, mapheight, blockwidth,
  blockheight are kept (int16, swapped when file endianness != host).
* BODY -> layer 0, LYRn -> layer n: width*height int16 cells, row-major (:209-235).
  Value 0 = empty (never drawn, :553). v > 0 = tile, drawn with sprite frame v-1 of the external
  tileset passed to C2D2M_CarregaMapaMappy (:554, :285).  v < 0 = animated block -v (ANDT).
  BKDT (block structures) and BGFX (embedded graphics) are IGNORED by the engine: the cell value is
  used directly as "tileset frame + 1".  This script additionally decodes BKDT/BGFX only to verify
  that assumption.
* ANDT (:237-269): ANISTR records (16 bytes: s8 antype, s8 andelay, s8 ancount, s8 anuser,
  s32 ancuroff, s32 anstartoff, s32 anendoff) are read backwards from the END of the chunk until
  antype == -1 (AN_END); the remainder at the start is the frame list (sizeof(long) each; 4 on the
  Win32 build).  None of the X85 maps contain ANDT.
* Markers (C2D2M_PrimeiroBlocoMarca/ProximoBlocoMarca, :564-637): with C2D2M_CamadaMarcas(map,
  layer, offbloco) a search for code c matches cells == c + offbloco, scanning row-major from cell 0
  (top-left).  The returned coordinate is the CENTRE of the tile in map pixels:
  x = col*tileW + tileW/2, y = row*tileH + tileH/2.  X85 uses layer 0 and offbloco 1 (jogo.cpp:151),
  so marker code = cell value - 1.
"""
import json
import os
import struct
import sys
from collections import Counter, OrderedDict

# --------------------------------------------------------------------------------------------
# Marker label tables (marker code = cell value - offbloco).  Codes 0..20 come from the engine
# enum in chien2d2mapa.h:18-32; 20+ are game enums.
# --------------------------------------------------------------------------------------------
ENGINE_CODES = {
    0: "C2D2M_INICIO", 1: "C2D2M_FIM", 2: "C2D2M_CHECK", 3: "C2D2M_SOLIDO",
    4: "C2D2M_SOLIDO45", 5: "C2D2M_SOLIDO22A", 6: "C2D2M_SOLIDO22B", 7: "C2D2M_SOLIDO135",
    8: "C2D2M_SOLIDO157A", 9: "C2D2M_SOLIDO157B", 10: "C2D2M_SOLIDO225", 11: "C2D2M_SOLIDO202A",
    12: "C2D2M_SOLIDO202B", 13: "C2D2M_SOLIDO315", 14: "C2D2M_SOLIDO337A", 15: "C2D2M_SOLIDO337B",
    16: "C2D2M_ESCADAV", 17: "C2D2M_ESCADA_SD", 18: "C2D2M_ESCADA_SE", 19: "C2D2M_MORTE",
    20: "C2D2M_PROG(=BOLA)",
}
GAME_CODES = {
    # X85-devcore 2 funcoes_J.h:15
    "dc2": {21: "M_INIMIGO1", 22: "M_INIMIGO2", 23: "M_INIMIGO3", 24: "M_INIMIGO4",
            25: "M_METEORO", 26: "M_BOSS", 27: "M_T1", 28: "M_T2", 29: "M_T3", 30: "M_T4",
            31: "M_T5", 32: "M_T6"},
    # X85-devcore funcoes_J.h:15 (no T1!)
    "dc": {21: "INIMIGO1", 22: "INIMIGO2", 23: "INIMIGO3", 24: "INIMIGO4", 25: "METEORO",
           26: "BOSS", 27: "T2", 28: "T3", 29: "T4", 30: "T5", 31: "T6", 32: "EXPLOSAO"},
    # betaversion jogo.h:45
    "beta": {21: "INIMIGO1", 22: "INIMIGO2", 23: "INIMIGO3", 24: "INIMIGO4", 25: "TIPOMETEORO",
             26: "ENERGIA", 27: "M_ESCUDO", 28: "TIROTIPO1", 29: "TIROTIPO2"},
}
# Codes each game actually searches with C2D2M_PrimeiroBlocoMarca
SEARCHED = {
    "dc2": [0, 1] + list(range(21, 33)),          # jogo.cpp:153-154, 172-183
    "dc": [0, 1] + list(range(21, 32)),
    "beta": [0, 1, 21, 22, 23, 24, 25, 26, 27],   # betaversion/jogo.cpp:217-298
}


def label(code, labels):
    if code in ENGINE_CODES and code != 20:
        return ENGINE_CODES[code]
    if labels and code in GAME_CODES.get(labels, {}):
        return GAME_CODES[labels][code]
    if code == 20:
        return ENGINE_CODES[20]
    return "?"


# --------------------------------------------------------------------------------------------
# Parser
# --------------------------------------------------------------------------------------------
class FMP:
    pass


def parse(path, sizeof_long=4):
    buf = open(path, "rb").read()
    m = FMP()
    m.path = path
    m.size = len(buf)
    m.chunks = []          # (id, offset, size) in file order, as the engine walks them
    m.layers = {}          # layer index -> list[int16]
    m.mphd = None
    m.athr = []
    m.bkdt = []
    m.bgfx = None
    m.andt = None
    m.warnings = []
    if buf[0:4] != b"FORM" or buf[8:12] != b"FMAP":
        raise ValueError(f"{path}: not FORM/FMAP")
    total = struct.unpack(">I", buf[4:8])[0] + 8
    m.form_size = total
    if total != len(buf):
        m.warnings.append(f"FORM size+8={total} != file size {len(buf)}")
    i = 12
    lsb = None
    while i < total:
        cid = buf[i:i + 4]
        size = struct.unpack(">I", buf[i + 4:i + 8])[0]
        data = buf[i + 8:i + 8 + size]
        name = cid.decode("latin1")
        m.chunks.append((name, i, size))
        if cid == b"MPHD":
            vh, vl, lsb_b, mtype = struct.unpack("<bbbb", data[:4])
            lsb = bool(lsb_b)
            e = "<" if lsb else ">"
            f = struct.unpack(e + "10h", data[4:24])
            ck = struct.unpack("4B", data[24:28]) if len(data) >= 28 else None
            m.mphd = OrderedDict(
                version=f"{vh}.{vl}", lsb=int(lsb), maptype=mtype, mapwidth=f[0], mapheight=f[1],
                reserved1=f[2], reserved2=f[3], blockwidth=f[4], blockheight=f[5],
                blockdepth=f[6], blockstrsize=f[7], numblockstr=f[8], numblockgfx=f[9],
                colourkey8_rgb=ck)
            m.width, m.height = f[0], f[1]
            m.tileW, m.tileH = f[4], f[5]
        elif cid == b"ANDT":
            m.andt = parse_andt(data, "<" if (lsb is None or lsb) else ">", sizeof_long)
        elif cid == b"BODY" or cid[:3] == b"LYR":
            if m.mphd is None:
                m.warnings.append(f"{name} before MPHD: engine would malloc with garbage size")
                i += 8 + size
                continue
            layer = 0 if cid == b"BODY" else cid[3] - ord("0")
            if not 0 <= layer < 8:
                m.warnings.append(f"{name}: layer index {layer} out of 0..7 (engine overflow)")
            n = m.width * m.height
            e = "<" if lsb else ">"
            if len(data) < n * 2:
                m.warnings.append(f"{name}: {len(data)} bytes < {n*2} expected (engine over-reads)")
                data = data + b"\0" * (n * 2 - len(data))
            m.layers[layer] = list(struct.unpack(e + f"{n}h", data[:n * 2]))
        # ---- chunks below are ignored by Chien2D 2, decoded here for verification only ----
        elif cid == b"ATHR":
            m.athr = [s.decode("latin1") for s in data.split(b"\0") if s]
        elif cid == b"BKDT":
            e = "<" if (lsb is None or lsb) else ">"
            bs = m.mphd["blockstrsize"] if m.mphd else 32
            for k in range(len(data) // bs):
                r = data[k * bs:k * bs + bs]
                bg, fg, fg2, fg3, u1, u2, u3, u4, u5, u6, u7, fl = struct.unpack(e + "4i2I2H4B", r[:32])
                m.bkdt.append(dict(bg=bg, fg=fg, fg2=fg2, fg3=fg3, user=(u1, u2, u3, u4, u5, u6, u7),
                                   flags=fl))
        elif cid == b"BGFX":
            m.bgfx = data
        i += 8 + size
    return m


def parse_andt(data, e, sizeof_long):
    """Mimics chien2d2mapa.cpp:237-269 (reads ANISTR backwards from the chunk end)."""
    anistr = [None]  # index 0 unused, like the engine
    n = 0
    while True:
        n += 1
        off = len(data) - 16 * n
        if off < 0:
            break
        t, d, c, u, cur, st, en = struct.unpack(e + "4b3i", data[off:off + 16])
        anistr.append(dict(antype=t, andelay=d, ancount=c, anuser=u, ancuroff=cur, anstartoff=st,
                           anendoff=en))
        if t == -1:
            break
    nseq = (len(data) - 16 * n) // sizeof_long
    fmt = e + f"{nseq}" + ("i" if sizeof_long == 4 else "q")
    seq = list(struct.unpack(fmt, data[:nseq * sizeof_long]))
    return dict(anistr=anistr, seq=seq)


def markers(m, layer=0, offbloco=1):
    """Engine marker search: {code: [(x_center, y_center), ...]} in row-major order."""
    out = OrderedDict()
    cells = m.layers.get(layer)
    if cells is None:
        return out
    for pos, v in enumerate(cells):
        code = v - offbloco
        if v == 0:
            continue
        col, row = pos % m.width, pos // m.width
        out.setdefault(code, []).append((col * m.tileW + m.tileW // 2, row * m.tileH + m.tileH // 2))
    return OrderedDict(sorted(out.items()))


# --------------------------------------------------------------------------------------------
# Reports / exports
# --------------------------------------------------------------------------------------------
def report(m, labels=None, out=sys.stdout):
    p = lambda *a: print(*a, file=out)
    p(f"== {m.path} ({m.size} bytes)")
    p(f"  chunks (engine walk order): " + ", ".join(f"{n}[{s}]" for n, o, s in m.chunks))
    for w in m.warnings:
        p(f"  WARNING: {w}")
    if m.athr:
        p(f"  ATHR: {m.athr}")
    if m.mphd:
        h = m.mphd
        p(f"  MPHD: FMP {h['version']} lsb={h['lsb']} maptype={h['maptype']} "
          f"map={h['mapwidth']}x{h['mapheight']} blocks, tile={h['blockwidth']}x{h['blockheight']} px, "
          f"depth={h['blockdepth']}bpp, blockstrsize={h['blockstrsize']}, numblockstr={h['numblockstr']}, "
          f"numblockgfx={h['numblockgfx']}")
        p(f"        map size in pixels = {m.width*m.tileW}x{m.height*m.tileH}")
    if m.bkdt:
        ident = all(b["bg"] == k for k, b in enumerate(m.bkdt))
        others = any(b["fg"] or b["fg2"] or b["fg3"] or any(b["user"]) or b["flags"] for b in m.bkdt)
        p(f"  BKDT: {len(m.bkdt)} block structures; bgoff==index for all: {ident}; "
          f"any fg/user/flags set: {others}  (engine ignores BKDT)")
    if m.bgfx is not None and m.mphd:
        bpp = max(1, m.mphd["blockdepth"] // 8)
        nb = len(m.bgfx) // (m.tileW * m.tileH * bpp)
        p(f"  BGFX: {nb} embedded {m.tileW}x{m.tileH} graphics at {m.mphd['blockdepth']}bpp (engine ignores BGFX)")
    p(f"  ANDT: {'present' if m.andt else 'absent'}")
    p(f"  layers present: {sorted(m.layers)}  (BODY = layer 0)")
    for li, cells in sorted(m.layers.items()):
        c = Counter(cells)
        nz = {k: v for k, v in c.items() if k != 0}
        p(f"  layer {li}: {len(cells)} cells, non-zero {sum(nz.values())}, distinct non-zero values "
          f"{sorted(nz)}" + (f", negative (animated) {sorted(k for k in nz if k < 0)}" if any(k < 0 for k in nz) else ""))
    mk = markers(m)
    if mk:
        p(f"  markers on layer 0 with offbloco=1 (code = value-1; x,y = tile centre in map px):")
        for code, pts in mk.items():
            ys = [y for _, y in pts]
            xs = sorted({x for x, _ in pts})
            searched = "" if not labels else ("  [searched by game]" if code in SEARCHED[labels] else "  [NOT searched by game]")
            p(f"    value {code+1:3d} code {code:3d} {label(code, labels):18s} x{len(pts):4d}  "
              f"y {min(ys)}..{max(ys)}  x-values {xs if len(xs) <= 8 else f'{len(xs)} distinct {min(xs)}..{max(xs)}'}{searched}")
        if 0 in mk and 1 in mk:
            p(f"    first INICIO at {mk[0][0]}, first FIM at {mk[1][0]}")


def to_json(m, labels=None):
    mk = markers(m)
    d = OrderedDict(
        source=os.path.basename(m.path), width=m.width, height=m.height, tileW=m.tileW, tileH=m.tileH,
        layers=[m.layers.get(i, [0] * (m.width * m.height)) for i in range(max(m.layers) + 1)] if m.layers else [],
        layerOrder="row-major, index = row*width + col; 0 = empty; v>0 = tileset frame v-1",
        markerLayer=0, markerOffset=1,
        markers=OrderedDict((str(code), dict(label=label(code, labels), points=[list(p) for p in pts]))
                            for code, pts in mk.items()),
    )
    return d


def write_json(m, path, labels=None):
    with open(path, "w") as f:
        d = to_json(m, labels)
        # keep each layer on a single line-ish: compact separators
        json.dump(d, f, separators=(",", ":"))
        f.write("\n")


def render_png(m, tileset_path, out_path, layer=0, bg=(24, 24, 32), grid=False, scale=1):
    """Render a layer with an external tileset the way C2D2M_DesenhaCamadaMapa does
    (frame = value-1, frames row-major in tileset, value 0 not drawn)."""
    from PIL import Image
    ts = Image.open(tileset_path).convert("RGBA")
    # Chien2D GL loader turns exact opaque magenta into transparent (chien2d2_gl.cpp:810-832)
    px = ts.load()
    for y in range(ts.size[1]):
        for x in range(ts.size[0]):
            if px[x, y] == (255, 0, 255, 255):
                px[x, y] = (0, 0, 0, 0)
    cols = ts.size[0] // m.tileW
    rows = ts.size[1] // m.tileH
    nframes = cols * rows
    img = Image.new("RGBA", (m.width * m.tileW, m.height * m.tileH), bg + (255,))
    cells = m.layers[layer]
    missing = Counter()
    for pos, v in enumerate(cells):
        if v == 0:
            continue
        fr = v - 1
        x, y = (pos % m.width) * m.tileW, (pos // m.width) * m.tileH
        if v < 0 or fr >= nframes:
            missing[v] += 1
            img.paste((255, 0, 0, 255), (x, y, x + m.tileW, y + m.tileH))
            continue
        tile = ts.crop(((fr % cols) * m.tileW, (fr // cols) * m.tileH,
                        (fr % cols + 1) * m.tileW, (fr // cols + 1) * m.tileH))
        img.alpha_composite(tile, (x, y))
    if grid:
        from PIL import ImageDraw
        d = ImageDraw.Draw(img)
        for gx in range(0, img.size[0], m.tileW):
            d.line([(gx, 0), (gx, img.size[1])], fill=(60, 60, 70, 255))
        for gy in range(0, img.size[1], m.tileH * 5):
            d.line([(0, gy), (img.size[0], gy)], fill=(60, 60, 70, 255))
    if scale != 1:
        img = img.resize((int(img.size[0] * scale), int(img.size[1] * scale)), Image.NEAREST)
    img.convert("RGB").save(out_path, optimize=True)
    return dict(frames=nframes, out_of_range=dict(missing))


def render_bgfx_sheet(m, out_path, cols=8):
    """Render the embedded BGFX graphics (Mappy's own copy of the tiles), block 0 first."""
    from PIL import Image
    bpp = m.mphd["blockdepth"] // 8
    tsz = m.tileW * m.tileH * bpp
    n = len(m.bgfx) // tsz
    if bpp != 3:
        return None
    img = Image.new("RGB", (cols * (m.tileW + 2), ((n + cols - 1) // cols) * (m.tileH + 2)), (40, 40, 40))
    for k in range(n):
        t = Image.frombytes("RGB", (m.tileW, m.tileH), m.bgfx[k * tsz:(k + 1) * tsz])
        img.paste(t, ((k % cols) * (m.tileW + 2), (k // cols) * (m.tileH + 2)))
    img.save(out_path)
    return n


# --------------------------------------------------------------------------------------------
# Batch mode for the X85 project
# --------------------------------------------------------------------------------------------
BATCH = [
    # (version tag, labels, relative map path, matching tileset)
    *[("devcore2", "dc2", f"X85-devcore 2/dados/jogo/mapas/fase{i}.fmp",
       "X85-devcore 2/dados/jogo/mapas/tileset.png") for i in range(1, 6)],
    *[("devcore", "dc", f"X85-devcore/dados/jogo/mapas/fase{i}.fmp",
       "X85-devcore/dados/jogo/mapas/tileset.png") for i in range(1, 9)],
    ("beta", "beta", "betaversion/sprites/mapa.FMP", "betaversion/sprites/tileset.png"),
    ("beta", "beta", "betaversion/sprites/back-mapa.FMP", "betaversion/sprites/tileset.png"),
]


def batch(root, outdir):
    os.makedirs(outdir, exist_ok=True)
    try:
        import PIL  # noqa: F401
        have_pil = True
    except ImportError:
        have_pil = False
    maps = {}
    for tag, labels, rel, ts in BATCH:
        path = os.path.join(root, rel)
        m = parse(path)
        name = os.path.splitext(os.path.basename(rel))[0]
        maps[(tag, name)] = m
        report(m, labels)
        jp = os.path.join(outdir, f"{tag}-{name}.json")
        write_json(m, jp, labels)
        print(f"  -> {os.path.relpath(jp, root)}")
        if have_pil:
            pp = os.path.join(outdir, f"{tag}-{name}.png")
            r = render_png(m, os.path.join(root, ts), pp, grid=True, scale=0.5)
            print(f"  -> {os.path.relpath(pp, root)} (tileset frames={r['frames']}, out-of-range cells={r['out_of_range']})")
        print()
    if have_pil:
        # Compatibility previews: devcore fase6-8 rendered with the devcore 2 tileset (what the
        # devcore 2 binary would load), and BGFX sheets for tileset/marker-order verification.
        for i in (6, 7, 8):
            m = maps[("devcore", f"fase{i}")]
            pp = os.path.join(outdir, f"compat-devcore-fase{i}-with-devcore2-tileset.png")
            r = render_png(m, os.path.join(root, "X85-devcore 2/dados/jogo/mapas/tileset.png"), pp,
                           grid=True, scale=0.5)
            print(f"compat preview -> {os.path.relpath(pp, root)} {r}")
        for key in (("devcore2", "fase1"), ("devcore", "fase1"), ("beta", "mapa")):
            m = maps[key]
            pp = os.path.join(outdir, f"bgfx-{key[0]}-{key[1]}.png")
            n = render_bgfx_sheet(m, pp)
            print(f"BGFX sheet ({n} blocks, block 0 = Mappy blank) -> {os.path.relpath(pp, root)}")
    else:
        print("Pillow not available: PNG previews skipped")
    return maps


def main(argv):
    labels = None
    jout = pout = tileset = None
    files = []
    it = iter(argv)
    for a in it:
        if a == "--batch":
            root = next(it)
            outdir = next(it)
            batch(root, outdir)
            return 0
        elif a == "--labels":
            labels = next(it)
        elif a == "--json":
            jout = next(it)
        elif a == "--png":
            pout = next(it)
        elif a == "--tileset":
            tileset = next(it)
        elif a in ("-h", "--help"):
            print(__doc__)
            return 0
        else:
            files.append(a)
    if not files:
        print(__doc__)
        return 1
    for f in files:
        m = parse(f)
        report(m, labels)
        if jout:
            write_json(m, jout, labels)
        if pout:
            if not tileset:
                print("--png needs --tileset")
                return 1
            print(render_png(m, tileset, pout))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
