# Reverse-engineering findings: X85 shipped binaries vs. source

> Every claim has a coordinate (VA, object offset, symbol or file offset) and says how it is known:
> **assembly** (read in `objdump -dr` output), **byte-match** (object code found byte-for-byte in the
> executable, with relocation bytes masked), **file** (read from a data file or the filesystem), or
> **inferred**. Gaps are listed in the "Not verified" column and in section 8.

## 0. Bottom line

- **Nothing is missing from the source.** In all three builds, every function in the shipped executable
  comes from the `.o` files next to it (byte-match), and every `.o` matches its `.cpp`: function sets match
  exactly, and string literals and the numeric constants checked are the same. No object file is stale.
- **Assets:** the only files a binary references that are not on disk are
  `dados/jogo/mapas/fase6.fmp`, `fase7.fmp` and `fase8.fmp` in **devcore 2**. The game cannot reach them
  through normal play (see F-B2). `inim.png` is referenced only in commented-out source. No binary refers
  to it, so it is not needed.
- **Music (devcore 2):** `music_jogo` = `./dados/sons/progression_sasquamox.ogg` and `music_menu` =
  `./dados/sons/recharge_alvys18.ogg`. Both files exist. devcore 1 loads no music.
- **Behavior the port must reproduce on purpose:** in the shipped devcore 2 binary, killing INIMIGO3 gives
  **0 points**, because the source line `score+=400;` adds to the pointer, not the score. Save files hold
  uninitialized stack bytes. devcore 1 saves contain garbage `planeta_atual` values.

## 1. Target identification

| Build | Artifact | Size | md5 / sha256 | Toolchain (`.comment`) | Notes |
|---|---|---|---|---|---|
| devcore 2 | `X85-devcore 2/bin/Release/X85-devcore` | 90,724 | `5c399e22103b42ec0423aaaaba37ea23` / `5d4c7dd6…2d472` | GCC Debian 4.4.4-7 (objects), 4.4.4-5 (crt) | ELF32 i386, stripped (`-O3 -s`, per `.cbp`) |
| devcore 1 | `X85-devcore/bin/Release/X85-devcore` | 88,324 | `3c416c57a01e3409763087301b432573` / `db86cde1…c9e21` | GCC Debian 4.4.4-3 | ELF32 i386, stripped |
| beta | `betaversion/teste` | 106,873 | `1ccc0c8d32c03fe121a0febbe574ed5b` / `c7a0ee5c…daa9` | GCC Debian 4.3.3-3 (game/engine), 4.3.2 (glibc crt) | not stripped (`.symtab` present), built by `makefile` with `cc -c` (no `-O`, no `-g`) |

No packing or obfuscation was found. Triage entropy is 6.1–6.4, the normal range for native code.

## 2. Scope and authorization
- **Context:** interoperability and preservation (web port). The owner's own college project.
- **Goal:** confirm that source and shipped binaries agree, list any missing assets, recover the save and
  record formats.

## 3. Environment and tools
- macOS host, static analysis only. **No target binary was executed.** Targets were copied to
  `/private/tmp/claude-501/-Users-matheusgobatonunes-Projects-x85/db1b6b9f-51f5-4914-bb2a-8868dfa9e839/scratchpad/re-work/{dc2,dc1,beta}`.
  No version folder was modified.
- Tools: llvm `objdump` (`-h`, `-dr --x86-asm-syntax=intel`, `-s -j`), `nm -C`, `strings`, `dwarfdump`,
  the skill's `triage.py` and `check_tools.py`, plus helper scripts in `.../re-work/notes/`:
  - `elf32.py`: a minimal ELF32 parser. `match` searches each object's function bytes in the executable's
    `.text`, with relocation bytes masked as wildcards. `strs` lists `.rodata*` strings.
  - `coverage.py`: maps every object onto the executable `.text` and reports any unexplained gaps.
  - `strcmp.py`: compares C string literals in a `.cpp` with the object's `.rodata`/`.data`, normalizing
    for `printf("…\n")` → `puts`.
  - `annot.py`: `objdump -dr` with each `.rodata` relocation resolved to its string.
  - `x85dec.py`: decoder for `recs.x85` and `saves.x85`.
- Key commands: `python3 -I notes/coverage.py dc2/X85-devcore dc2/[cfjm]*.o`;
  `python3 -I notes/strcmp.py "<ver>/<f>.cpp" <ver>/<f>.o`; `python3 -I notes/x85dec.py */*.x85`.

## 4. Static findings

### (a) Source ↔ object ↔ binary parity

| Coordinate | Finding | Evidence | Known via | Not verified |
|---|---|---|---|---|
| dc2 `.text` 0x8049d40–0x805adcc | **The binary is exactly obj/Release/*.o plus crt.** Each object lands at one consistent base: chien2d2 0x8049e00, chien2d2_gl 0x804bdf0, chien2d2_sdl 0x804d810, chien2d2mapa 0x804e1b0, primitivas 0x8050860, primitivas_gl 0x80508a0, primitivas_sdl 0x8051140, chienaudio2 0x80529f0, **funcoes_J 0x80539b0, funcoes_M 0x8055500, jogo 0x8056340, main 0x8057a00, menu 0x8057c20**. The only gaps are crt `_start` (0xc0 bytes, which pushes `main`=0x8057a00), `__libc_csu_*` (0xa0 bytes), and ≤0xf bytes of alignment padding. | `coverage.py` output | byte-match | Ten tiny engine functions (≤0x14 bytes, e.g. `CA2_PausaMusica`) match at several addresses because their bodies are identical. The expected address (base+offset) is among the hits. |
| dc2 game functions | All 40 game functions match byte-for-byte: `jogo_tela` @0x8056ce0, `jogo_carrega` @0x8056620, `jogo_atualiza_marca` @0x8054580, `menu_mission` @0x805a7a0, `menu_saves_edit` @0x8055e00, etc. | `notes/dc2_match.txt` | byte-match | — |
| dc2 symbols (nm) vs `.cpp` | Function sets are identical: main 1/1, jogo 3/3, funcoes_J 15/15, funcoes_M 11/11, menu 10/10. Globals also agree (e.g. jogo.o `loading`, `ready`, `spTiro[30]`, `spMarca[40]`; menu.o `music_menu` B+0x74, `music_jogo` B+0x78). `jogo_exibe_informacao(int)` is defined in jogo.cpp and only forward-declared there, not in a header. That is harmless. | `nm -C --defined-only`; source grep | assembly / symbols | — |
| dc2 strings | Every live string literal in main/jogo/funcoes_J/funcoes_M/menu `.cpp` appears in its `.o`, and no object has a string missing from the source. The apparent exceptions are compiler effects. `printf("Nao conseguiu iniciar a tela. Encerrando.\n")` became `puts`. In `menu_recordes_default` (funcoes_M.o +0x6de…) gcc turned `sprintf(nome,"Matheus")` etc. into immediate stores (e.g. `mov [ebp-0x94],0x6874614d` = "Math"). `char nome[15]="new"` became `mov [ebp-0x27],0x77656e` (+0xbde). Every string in the binary's `.rodata` comes from some `.o`. | `strcmp.py` | assembly | Literals inside `/* */` and `//` comments are excluded on purpose. |
| dc2 staleness | **No stale object.** Mtimes: funcoes_J.cpp 2010-08-06 18:28:49 → funcoes_J.o 18:28:51 → binary 18:28:52. jogo.cpp 07-25 22:19:58 → jogo.o 22:20:00. menu.cpp 07-25 15:28 → menu.o 20:05:52. main.cpp 07-24 → main.o 07-25 20:05:51. funcoes_M.cpp 07-25 19:04 → .o 20:05:51. Headers funcoes_J.h (07-25 18:52) and funcoes_M.h (07-24) predate all objects. Content agrees too (rows above). | `stat`, string/symbol parity | file + assembly | Objects were not recompiled from source to diff the code. Parity is shown through symbols, strings and sampled constants (section c), not a full instruction diff against a fresh compile. |
| `X85-devcore 2/jogo.o` and `X85-devcore/jogo.o` (top level, outside `obj/`) | A **stray object**, identical in both folders (md5 `57eab8ae3150aff9aad366648011af4a`). Built 2010-06-07 23:54 by GCC 4.4.4-3, unoptimized (`mov eax,[saveAtual+0x20]; cmp eax,7` at +0x6). Its strings match **devcore 1** jogo.cpp exactly (tiro_laser_azul.png, inf_*.png, has `spInf`). It is **not linked** into either Release binary: 0 of 3 functions match in dc1 or dc2. | `elf32.py match`, `strcmp.py` | byte-match | Its exact compile flags are inferred from code shape. |
| dc1 | Same result. The binary is exactly its obj/Release/*.o plus crt (funcoes_J 0x8053980, funcoes_M 0x8054ee0, jogo 0x8055d40, main 0x8057380, menu 0x8057570). Symbols match the source: menu 9/9, with no `menu_about` yet. Strings match. `planeta_max`=8 (.data). | `coverage.py`, `strcmp.py` | byte-match | — |
| beta `teste` | The binary is exactly betaversion/*.o plus crt. jogo.o is at 0x8049d94 (16/16 functions) and menu.o at 0x804cec4 (15/15). The remaining gaps are -O0 COMDAT inline sections from the engine (`.text._Z8resetaGLv`, `.text._Z22C2D2PSDL_LinhaVerticaliiij`, …), and their sizes add up to the gaps (0x82, 0x229, 0x17e). | `coverage.py`; `objdump -h` | byte-match | — |

### (b) Assets referenced vs. present

| Build | Referenced paths in `.rodata` | Missing on disk | On disk but never referenced |
|---|---|---|---|
| devcore 2 | 80 (`grep -oE '(\./)?(dados\|sons\|sprites)/…'`) | **`dados/jogo/mapas/fase6.fmp`, `fase7.fmp`, `fase8.fmp`** | `dados/sons/tiro3.wav` |
| devcore 1 | 72 | none | `dados/jogo/itempad.png`, `dados/sons/tiro3.wav` |
| beta | 55 | none | `sprites/{back-mapa.FMP, mapa.BAK, barra-back.png, fonte.png, pause.png, risco.png, inim3.png, tiro2.png}`, `dados/{fundo2-2.jpg, 512.png-old}`, `sons/explo2.mp3` |

| Coordinate | Finding | Known via | Not verified |
|---|---|---|---|
| dc2 jogo.o `jogo_carrega` +0x365 (VA 0x8056985) | `cmp dword [saveAtual+0x20],7` / `ja` / `jmp [4*eax+.rodata+0x1c]`: an 8-way switch on `saveAtual.planeta_atual` that loads `dados/jogo/mapas/fase{1..8}.fmp` with `tileset.png`. The switch has no default case. | assembly | — |
| F-B2: dc2 `planeta_max` @ .data 0x805ec74 = **5**; jogo.o +0xc8e/+0x103a `cmp …,4` | The planet menu (`menu_mission`, source lines 251–314) clamps `planeta_atual` to `< max ≤ planeta_max` = 0..4. `jogo_tela` only unlocks while `planeta_liberado < 4`. **fase6–8 are unreachable in normal play.** They would only load if `saves.x85` held `planeta_atual` 5–7. A port can drop them, or map them to a "missing level" error. | assembly + source | The menu clamp was read in source and its `planeta_max` relocations were seen in menu.o (+0x2bb0…), but the clamp arithmetic was not traced instruction by instruction. |
| dc2 menu.o `menu_carrega` +0x6bc/+0x6cd | `CA2_CarregaMusica("./dados/sons/progression_sasquamox.ogg")` → `music_jogo`. `CA2_CarregaMusica("./dados/sons/recharge_alvys18.ogg")` → `music_menu`. main.o +0xf3/+0x10d play `music_jogo` around `jogo_tela()` and then `music_menu`. Both .ogg files exist (4.19 MB and 2.81 MB). | assembly | — |
| dc1 menu.o +0x683 | `CA2_TocaMusica(music,-1)` is called, but `CA2_CarregaMusica` is never called (it is commented out in source line 89, `./dados/sons/menu.ogg`). dc1 plays a zero handle, so no music. | assembly | Runtime effect inferred (chienaudio2 presumably ignores handle 0). |
| `inim.png` | No binary references `dados/jogo/inim.png`. It appears only in commented lines (dc2 jogo.cpp:86–87, dc1 jogo.cpp:70–71). Beta references `sprites/inim.png`, which exists. | strings | — |
| dc1 maps | fase2–fase8.fmp in dc1 are byte-identical placeholders (md5 `46659b03…`). fase1 differs. The five dc2 maps are all distinct. | file hash | — |

### (c) Numeric constants: compiled vs. source (devcore 2)

All sampled constants **match the source**. Struct offsets come from the same disassembly.

| Object offset (funcoes_J.o unless noted) | Compiled | Source |
|---|---|---|
| `jogo_inicia_jogador` +0x96…+0xe2 | x=y=xaux=yaux=0x190 (400), intervalo_tiro=0, velocidade(+0x1c)=0x14 (20), tipo=1 (X85), escudo(+0x18)=100, energia(+0x14)=0x2710 (10000), tiro_atual=1, bomba_atual=7, n_bombas=0x32 (50) | identical |
| `jogo_atualiza_jogador` +0x18e0/+0x18f3/+0x19b2/+0x19e9/+0x1a70 | bounds x≤0x2cf (<720), y≤0x207 (<520), key step 0xf (15), xaux<0x32e (815), yaux<0x266 (615) | `velocidade=15`, 720, 520, 800+15, 600+15 |
| `jogo_cria_tiro` | MAXTIROS loop 0x12c (300), Tiro stride 0x1c. TIRO1: interval 4, x+0x15 (21). TIRO2: 6, +14. TIRO3: 6, +0x1d, size 5. TIRO4: 12, +0x1b+n·10, size 5. BOMBA1: size 0x320 (800) | identical |
| `jogo_inicia_marca` +0x6be…+0x794 | HP INIMIGO1–4 = 200/300/400/500, METEORO 750 (0x2ee), BOSS1–5 = 10000/20000/30000/30000/40000 | identical |
| `jogo_testa_colisao` +0x8a6, +0xa32…+0xbb7 | MAXMARCAS 0x3e8. Player-shot damage TIRO1–6 = 50/75/100/75/120/150. Bomb 1000 if alpha>0xf9 (≥250). Enemy shots 15/5/15. Contact damage 20/30/40/50 (meteor), enemy −9999, boss contact −0x64 | identical |
| `jogo_atualiza_marca` | enemy fire timers 0x64/0x32/0xb4/0x50/0x1e/0x2d/0x28/0x19 (100/50/180/80/30/45/40/25). Score adds 200, 300, 500, 1000, 3000 (3 add sites, likely tail-merged across 5 bosses) | identical, **except as below** |
| `jogo_atualiza_marca` (no `add …,0x190` anywhere) | **INIMIGO3 kill adds 0 points.** Source funcoes_J.cpp:489 is `score+=400;` (pointer, not `*score`), so the compiler dropped it. Same in dc1. | source bug, compiled faithfully |
| funcoes_J.o `.rodata.cst4` | floats 600.0, 0.5, 50.0, 100.0, 360.0, 0.08, 40.0, 20.0 (background `+=0.5`, reset −600, angle `+=0.08f` while <360) | identical |
| jogo.o +0xea6, +0x11b3 | `ymapa > -600` (`cmp edx,-599`), energy bar `-altura*586/100` (`imul -586`) | identical |
| `.data` 0x805ec70… (dc2 binary) | planeta_max=5, volume_effects=30, volume_music=30 | identical |

Not verified: `jogo_tela`'s per-frame loop was sampled only, not read in full. Also unchecked: whether the
3 `add 3000` sites cover all 5 boss cases (inferred from gcc tail merging).

### (d) beta `teste`: which sources, and DWARF

| Coordinate | Finding | Known via |
|---|---|---|
| `.debug_info` (0x17f bytes) | **The DWARF covers only glibc crt** (`init.c`, `crti.S`, producer GNU C 4.3.2). The game was compiled without `-g`, so DWARF gives no struct layouts. They were recovered from disassembly instead (section 6). `.symtab` is present: 31 game functions plus globals. | `dwarfdump --debug-info` |
| menu.o / `menu.cpp` vs `menu.cpp~` | The binary contains `./sons/menu.ogg`, which matches **menu.cpp** (line 188). `menu.cpp~` (editor backup, 2009-02-14 15:36) has `./sons/menu.wav`. That one-line change is the only difference between the two files. menu.o (02-15 16:38:27) is newer than menu.cpp (16:38:22). | strings, diff |
| jogo.o / `jogo.cpp` vs `backup-jogo.cpp` | jogo.o matches **jogo.cpp**: all strings present, 16/16 functions. `backup-jogo.cpp` (2008-12-11) is older. It has `ENERGY:`/`SHIELD:` text and `sprites/barra-back.png`/`risco.png`, all absent from the binary, and lacks `barra_vida`/`barra_escudo`/`barras_cover`, which the binary has. | `strcmp.py` |
| beta `jogo.h` | Declares 5 functions that are never defined or linked (`AtualizaExplosaoInimigo`, `CriaExplosaoInimigo`, `CriaMeteoro`, `CriaEstrelas`, `GameOver()` with no argument). These are leftovers and do not affect the build. | nm vs header |

## 5. Dynamic findings
None. By instruction, nothing was executed.

## 6. Data structures / formats recovered (i386 gcc, 4-byte int alignment, little-endian)

```
tiporecorde (all builds) — 20 bytes        (dc2 funcoes_M.o +0x6de: name @ebp-0x94, pts @ebp-0x84; fwrite(…,0x14,7))
  +0  char nome[15]   NUL-terminated; bytes after the NUL are uninitialized stack data
  +15 pad[1]
  +16 int32 pts
recs.x85 = 7 records (devcore 1/2, 140 B) | 5 records (beta, 100 B; menu.o recordesDefault fwrite(…,0x14,5))

tiposave (devcore) — 44 bytes, 3 slots = 132 B   (dc2 funcoes_M.o menu_saves_edit +0x96f… stride imul 0x2c)
  +0  bool  empty
  +1  pad[3]
  +4  int32 pts
  +8  char  nome[15]
  +23 pad[1]
  +24 int32 level           (EASY=1, NORMAL, HARD, GODMODE)
  +28 int32 planeta_liberado (highest unlocked planet index)
  +32 int32 planeta_atual    (selected planet / map index 0..7; jogo_carrega cmp [saveAtual+0x20],7)
  +36 bool  tiro_liberado[6] (dc2: [6]; dc1: [5], so +41 is padding)
  +42 pad[2]

In-game structs (dc2, from disassembly): Nave 0x34 B {tipo,x,y,xaux,yaux,energia@0x14,escudo@0x18,
velocidade@0x1c,tiro_atual@0x20,bomba_atual@0x24,n_bombas@0x28,intervalo_tiro@0x2c,sprite@0x30};
Tiro 0x1c B; Marca 0x2c B (energia @0x1c); Explo 0x14 B.
```

Decoded contents (`x85dec.py`):

| File | Contents |
|---|---|
| beta `dados/recs.x85` | Matheus 9000, Argus 8000, chucknorris 3000, magaiver 2000, loser 1000. These are exactly the `recordesDefault()` values. |
| devcore 1 `dados/recs.x85` | Matheus 9000, Argus 8000, chucknorris 3000, magaiver 2000, loser 1000, bill 600, noob 500. These are the defaults; the file was never played over. |
| devcore 2 `dados/recs.x85` (2010-08-06 18:33) | argus 195210, argus 175510, argus 134500, argus 119610, argus 104700, argus 86010, argus 81900. Older names survive past the NUL (e.g. `argus\0s\0ris`). |
| devcore 1 `dados/saves.x85` | slot0: empty=0, "christian", level 2 (NORMAL), pts 0, liberado 0, atual 0, tiros all 0. slot1/2: empty=1, "new", level 1, **planeta_atual −63 and 390 (garbage)**. dc1 `menu_saves_edit` never resets `planeta_atual`, and the file starts out empty, so the value is uninitialized stack data. |
| devcore 2 `dados/saves.x85` (2010-08-06 18:33) | slot0: empty=0, "argus", level 1 (EASY), pts 134500, planeta_liberado 4, planeta_atual 3, tiro_liberado [1,1,1,1,1,0]. slot1/2: empty=1, "new", level 1, all 0, tiro_liberado [1,0,0,0,0,0]. |

Port notes: read padding bytes and the bytes after each NUL as don't-care. Clamp `planeta_atual` to
0..planeta_max−1. dc2 `menu_saves_saveslot` writes only pts, planeta_liberado, planeta_atual and
tiro_liberado. It never rewrites `nome`, `level` or `empty`.

## 7. Behavior summary
- **What the targets do:** an SDL 1.2/OpenGL vertical shooter built on Chien2D 2 (800×600 window, title
  "X85"). The menu has slots, records, options, about (dc2 only) and a planet select. Levels are Mappy `.fmp` maps.
- **Files:** read `./dados/**`. Read and write `./dados/recs.x85` and `./dados/saves.x85` with
  `fopen(…,"wb")` and a whole-array `fwrite`. All paths are relative to the CWD.
- **Network / persistence:** none apart from those two data files.

## 8. Open questions / next steps
- To get instruction-level proof beyond symbols, strings and sampled constants: recompile the dc2 `.cpp`
  files with Debian GCC 4.4.4 `-O2 -O3 -Wall` (i386) in a container and diff them against `obj/Release/*.o`.
  This was not done.
- `jogo_tela`, `menu_mission` and `menu_slot_*` were not read in full in assembly. They are covered by the
  byte-match (binary = object) and by symbol and string parity (object = source).
- The `logo.png` frame count was not checked. `menu_mission` draws frame 8 for locked planets, so the sheet
  needs at least 9 cells of 128×128.
