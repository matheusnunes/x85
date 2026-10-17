#!/usr/bin/env python3
"""Inventory X85 assets (images + audio) across the three versions.

Usage: python3 -I asset_inventory.py <project_root>

Pure-stdlib header parsing (no PIL / ffprobe needed):
  PNG  -> IHDR width/height/bit depth/color type
  JPEG -> SOFn width/height/components, progressive flag
  WAV  -> fmt chunk (codec, channels, rate, bits) + data length -> duration
  OGG  -> Vorbis identification header (channels, rate, nominal bitrate) +
          last page granule position -> duration
  MP3  -> first frame header (MPEG version/layer/bitrate/rate); duration
          estimated from file size / bitrate (CBR assumption)
Prints a markdown-ish TSV to stdout with md5 so cross-version identity can be
checked.
"""
import hashlib
import os
import struct
import sys

IMG = {".png", ".jpg", ".jpeg"}
AUD = {".wav", ".ogg", ".mp3"}
VERSIONS = ["betaversion", "X85-devcore", "X85-devcore 2"]
PNG_CT = {0: "gray", 2: "RGB", 3: "indexed", 4: "gray+A", 6: "RGBA"}


def png_info(b):
    w, h, bd, ct = struct.unpack(">IIBB", b[16:26])
    trns = b"tRNS" in b[:4096] if ct == 3 else False
    return f"PNG {w}x{h} {bd}-bit {PNG_CT.get(ct, ct)}{' +tRNS' if trns else ''}", (w, h)


def jpg_info(b):
    i = 2
    while i < len(b) - 9:
        if b[i] != 0xFF:
            i += 1
            continue
        m = b[i + 1]
        if m in (0xD8, 0x01) or 0xD0 <= m <= 0xD7:
            i += 2
            continue
        seg = struct.unpack(">H", b[i + 2:i + 4])[0]
        if m in (0xC0, 0xC1, 0xC2, 0xC3):
            _, h, w, nc = struct.unpack(">BHHB", b[i + 4:i + 10])
            kind = "progressive" if m == 0xC2 else "baseline"
            return f"JPEG {w}x{h} {nc}ch {kind}", (w, h)
        i += 2 + seg
    return "JPEG ?", None


def wav_info(b):
    if b[:4] != b"RIFF" or b[8:12] != b"WAVE":
        return "WAV? (bad header)"
    i = 12
    fmt = None
    data_len = None
    while i + 8 <= len(b):
        cid = b[i:i + 4]
        sz = struct.unpack("<I", b[i + 4:i + 8])[0]
        if cid == b"fmt ":
            fmt = struct.unpack("<HHIIHH", b[i + 8:i + 24])
        elif cid == b"data":
            data_len = min(sz, len(b) - i - 8)
            break
        i += 8 + sz + (sz & 1)
    if not fmt:
        return "WAV? (no fmt)"
    tag, ch, rate, byterate, _, bits = fmt
    codec = {1: "PCM", 2: "MS-ADPCM", 3: "IEEE-float", 0x11: "IMA-ADPCM", 0x55: "MP3"}.get(tag, f"tag{tag}")
    dur = data_len / byterate if (data_len and byterate) else 0
    return f"WAV {codec} {ch}ch {rate}Hz {bits}-bit {dur:.2f}s"


def ogg_info(b):
    if b[:4] != b"OggS":
        return "OGG? (bad header)"
    j = b.find(b"\x01vorbis")
    if j < 0:
        codec = "Opus" if b.find(b"OpusHead") >= 0 else "unknown"
        return f"OGG {codec}"
    ver, ch, rate, bmax, bnom, bmin = struct.unpack("<IBIiii", b[j + 7:j + 28])
    k = b.rfind(b"OggS")
    gran = struct.unpack("<q", b[k + 6:k + 14])[0]
    dur = gran / rate if rate else 0
    return f"OGG Vorbis {ch}ch {rate}Hz nominal {bnom // 1000 if bnom > 0 else '?'}kbps {dur:.2f}s"


MP3_BR = {  # MPEG1 layer III
    1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
}
MP3_SR = {3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000]}


def mp3_info(b):
    i = 0
    if b[:3] == b"ID3":
        sz = b[6:10]
        i = 10 + ((sz[0] << 21) | (sz[1] << 14) | (sz[2] << 7) | sz[3])
    while i < len(b) - 4:
        if b[i] == 0xFF and (b[i + 1] & 0xE0) == 0xE0:
            ver = (b[i + 1] >> 3) & 3
            layer = (b[i + 1] >> 1) & 3
            bri = b[i + 2] >> 4
            sri = (b[i + 2] >> 2) & 3
            chm = b[i + 3] >> 6
            if ver == 1 or sri == 3 or bri in (0, 15):
                i += 1
                continue
            br = MP3_BR[1 if ver == 3 else 2][bri]
            sr = MP3_SR[ver][sri]
            dur = (len(b) - i) * 8 / (br * 1000)
            ch = 1 if chm == 3 else 2
            vbr = b"Xing" in b[i:i + 200] or b"Info" in b[i:i + 200]
            return (f"MP3 MPEG{'1' if ver == 3 else '2'} L{4 - layer} {ch}ch {sr}Hz {br}kbps"
                    f"{' (Xing/VBR?)' if vbr else ''} ~{dur:.2f}s")
        i += 1
    return "MP3?"


def main(root):
    rows = []
    for v in VERSIONS:
        base = os.path.join(root, v)
        for d, _, files in os.walk(base):
            for f in sorted(files):
                ext = os.path.splitext(f)[1].lower()
                if ext not in IMG | AUD:
                    continue
                p = os.path.join(d, f)
                b = open(p, "rb").read()
                md5 = hashlib.md5(b).hexdigest()[:8]
                if ext == ".png":
                    info, _ = png_info(b) if b[:8] == b"\x89PNG\r\n\x1a\n" else ("NOT-PNG", None)
                elif ext in (".jpg", ".jpeg"):
                    info, _ = jpg_info(b) if b[:2] == b"\xff\xd8" else ("NOT-JPEG", None)
                elif ext == ".wav":
                    info = wav_info(b)
                elif ext == ".ogg":
                    info = ogg_info(b)
                else:
                    info = mp3_info(b)
                rows.append((v, os.path.relpath(p, base), len(b), md5, info))
    total = {}
    for v, rel, size, md5, info in rows:
        total[v] = total.get(v, 0) + size
        print(f"{v}\t{rel}\t{size}\t{md5}\t{info}")
    for v, t in total.items():
        print(f"# TOTAL {v}: {t} bytes ({t / 1048576:.2f} MiB) in {sum(1 for r in rows if r[0] == v)} files")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
