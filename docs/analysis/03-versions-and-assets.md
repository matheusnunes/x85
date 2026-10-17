# 03 — Versions, feature diff and asset inventory

Scope: compares the three source snapshots of X85 under `/Users/matheusgobatonunes/Projects/x85`, inventories every asset, checks the web formats, and recommends which version the web port should start from.

| Folder | Date (file mtimes) | Build | Binary |
|---|---|---|---|
| `betaversion/` | Dec 2008 to 15 Feb 2009 | `makefile` (g++, `-lSDL -lSDL_image -lSDL_mixer -lGL -lGLU`) | `teste`, ELF 32-bit i386, not stripped |
| `X85-devcore/` | sources up to 7 Jun 2010 | Code::Blocks `X85-devcore.cbp` | `bin/Release/X85-devcore`, ELF 32-bit i386 (7 Jun 2010) |
| `X85-devcore 2/` | sources up to 25 Jul 2010 | same `.cbp` | `bin/Release/X85-devcore`, ELF 32-bit i386 (6 Aug 2010) |

Notes on the sources:
- `main.cpp`, `menu.cpp`, `funcoes_J.cpp` and `funcoes_M.h` are ISO-8859-1. The other game files are UTF-8, and the line endings are mixed CRLF/LF. Every `file:line` reference below uses the original files' line numbers. Stripping CR does not change them.
- No file inside the three version folders was modified. The scratch UTF-8 copies used for diffing live in the session scratchpad.

Tools written for this report are in `docs/analysis/tools/`. Run them with `python3 -I`:
- `asset_inventory.py <root>`: image and audio header parsing using only the standard library (dimensions, codec, rate, duration, md5).
- `png_diff.py a.png b.png [cellW cellH]`: pixel diff, with the sprite-sheet cells that changed.
- `fmp_dump.py --labels dc|dc2|beta <map.fmp>`: Mappy map dump using Chien2D semantics. Another analysis pass extended this script, and the marker tables below were produced with it.

---

## 1. Feature diff: devcore (Jun 2010) to devcore 2 (Aug 2010)

### 1.1 Engine (Chien2D 2): identical between devcore and devcore 2

All 17 `chien2d2*` and `chienaudio2*` files have identical md5 sums in `X85-devcore/` and `X85-devcore 2/`. The engine was not touched between the two devcore snapshots.

The betaversion engine differs from devcore in 6 files:

| File | Change from beta to devcore |
|---|---|
| `chien2d2_gl.cpp` | Minimum `GL_MAX_TEXTURE_SIZE` relaxed from 2048 to 1024, and `maxtexsize` made global (`X85-devcore/chien2d2_gl.cpp:31,164`). Max image check now uses `maxtexsize` instead of the hard-coded 2048 (`:452`). `C2D2GL_DesenhaSpriteEfeito` (the rotated/alpha quad used by `XDesenhaSprite`) switched from `GL_QUADS` to two `GL_TRIANGLES` (`:691-713`). Float casts added. |
| `chien2d2_gl.h` | `setaTexturizacao` is no longer `inline`. |
| `chien2d2.cpp` | `C2D2_ColidiuSprites` now returns `int` instead of `bool`. `SDLK_BACKSPACE` handling moved. Operator precedence in the bitmask bounds test fixed: `x<0 \|\| (x>=w && y<0 && y>=h)` (`:833`). The test is still logically wrong, but harmless. |
| `chien2d2.h` | Key enum reordered: **`C2D2_BACKSPACE` now comes before `C2D2_LALT`** (`chien2d2.h:55-60`). This is ABI-relevant only. |
| `chien2d2_sdl.cpp`, `chien2d2primitivas_sdl.cpp` | Signed/unsigned loop-variable fixes only. |

`chien2d2mapa.*`, `chienaudio2.*`, `chien2d2_interno.h`, `chien2d2_sdl.h` and the primitives files are identical in all three versions.

Engine behaviours the web port must reproduce:
- `CA2_TocaEfeitoTela` pans sound effects by screen x: left = (100-p)·254/200, with p = 200x/800-100 (`chienaudio2.cpp:310-336`). In Web Audio this maps to a `StereoPannerNode`.
- `CA2_TocaMusica/TocaEfeito` with id 0 is a silent no-op (`:279-283, :472-476`). This explains the "missing" sounds listed in 1.2.
- `Mix_OpenAudio(44100, S16, stereo)` (`:90`).

### 1.2 Game code changes (from `diff -u` of every game file)

**`main.cpp`** (`X85-devcore 2/main.cpp:54-61`):
- New `TELA_ABOUT` state goes to `menu_about()`.
- Entering `TELA_JOGO` now plays `music_jogo`. Leaving plays `music_menu` again.
- devcore called `menu_saves_saveslot(slotAtual)` after every game, which saved progress even on death (`X85-devcore/main.cpp:56`). devcore 2 removes this; saving now happens only when the boss dies (see `jogo.cpp` below).

**`funcoes_M.h`**:
- `TELA_ABOUT` added to the state enum (`:15`).
- `tiposave.tiro_liberado` grows from `bool[5]` to `bool[6]` (`:39`). Because of struct padding, the record stays **44 bytes**, so `saves.x85` stays 132 bytes (3 slots) and save files are binary-compatible across versions.
- New `extern music_menu, music_jogo` (`:56-57`).
- New signature `menu_recordes_insere(int, char*)`.

**`funcoes_M.cpp`**:
- **`planeta_max` cut from 8 to 5** (`:5`). The game now has 5 playable stages: Earth, Moon, Mars, Jupiter, Saturn (`dados/menu/logo.png` frames 0-4).
- `menu_recordes_insere` now takes the player's name and reads all 7 records. devcore read only 5 into a `[7]` array (`X85-devcore/funcoes_M.cpp:170`), a bug. The name argument replaces the hard-coded `"none"`.
- New saves start with weapon 1 unlocked: `tiro_liberado = {1,0,0,0,0,0}` and `planeta_atual=0` (`:261-265`). devcore used `{0,0,0,0,0}`.
- 5-element to 6-element `memcpy` of `tiro_liberado` in save and load (`:231, :245`).

**`funcoes_J.h`**: map-marker codes were split from runtime type codes (`:15-17`):
- Map markers: `BOLA=20, M_INIMIGO1..4=21..24, M_METEORO=25, M_BOSS=26, M_T1=27 … M_T6=32`.
- Runtime types: `INIMIGO1=1 … METEORO=5, BOSS1..BOSS5=6..10, T1..T6=11..16, EXPLOSAO=17`.
- **Compatibility break:** devcore had no `T1`, so its maps used 27..31 for T2..T6. devcore 2 inserted `M_T1` at 27, which shifts every item marker by one (see §6).

**`jogo.cpp`**:

| Area | devcore | devcore 2 |
|---|---|---|
| Loading | none | Loading screen `dados/jogo/loading.jpg` (control diagram) plus `ready.png` ("ready? press space to start"), with a busy-wait on SPACE (`:41-45, :116-123`) |
| Asset paths | flat `dados/jogo/*.png` | reorganized into `tiros/`, `inimigos/`, `itens/` (`:64-93`) |
| Bosses | one `BOSS` (`boss1.png`, 10 000 HP) | `BOSS1..5`, chosen by `saveAtual.planeta_atual` (`funcoes_J.cpp:366-389`), with sprites `boss1..5.png` (`jogo.cpp:80-84`) |
| Weapon select | keys **1-6** (`X85-devcore/jogo.cpp:193-229`) | **Left ALT** cycles backwards through unlocked weapons (`:230-234`) |
| Bomb key | **B** (`X85-devcore/jogo.cpp:250`) | **Left CTRL** (`:270`) |
| Fire | mouse left / SPACE | unchanged (`:264`) |
| Weapon HUD icon | separate `inf_*.png` sprites (`spInf`) | reuses the item sprite `spMarca[T1..T6]` (`:373-398`) |
| Sound | `tiro1.wav` only | adds `tiro2.wav` for TIRO2 (`:109`). TIRO3-6 still have **no sound** (ids are 0, no-op) |
| Score | written straight into `saveAtual.pts` | accumulated in `temp_pts`. Committed only when the boss dies (`:208-216`), followed by save-slot write and high-score insert. Death discards the run's points and item unlocks (reload at `:220`) |
| Stage unlock | `planeta_liberado++` (unbounded) | capped at `< 4` (`:210`) |
| End-of-stage delay | 300 frames | 200 frames (`:223`) |
| Win condition | `Boss->energia <= 0` | `Boss->tipo == INVALIDO` (`:202`) |
| Score HUD | `saveAtual.pts` | `temp_pts + saveAtual.pts` (`:278`), buffer 20 to 30 chars |

**`funcoes_J.cpp`**: gameplay constants and behaviours.

| Item | devcore | devcore 2 |
|---|---|---|
| Player start y | 150 | **400** (`:92`) |
| Player energy | 100 | **10 000** (`:99`), almost certainly a debug value left in |
| Bombs | 5 | **50** (`:102`), also debug |
| Kill score i1/i2/i3/i4/meteor/boss | 20/30/40/50/100/1000 | 200/300/400/500/1000/3000 (`:446, :472, :489, :513, :538, :565…`) |
| INIMIGO2 fire interval | 200 frames | 50 (`:477`), damage TIROINI2 15 to **5** (`:753`) |
| INIMIGO4 | moved straight down, did not shoot | circles (r=40) around a centre that **chases** the player at 200 px above them, and fires homing `TIROINI3` every 80 frames (`:499-529`) |
| METEORO | y+=4 | y+=2. Explosion offset fixed (`:531-540`) |
| BOSS1 | orbit 50×20 px, no shots | orbit plus `TIROINI1` every 30 frames, 10 000 HP (`:542-568`) |
| BOSS2 | — | orbit, `TIROINI2` every 30, 20 000 HP (`:569-595`) |
| BOSS3 | — | orbit, random TIROINI1/2 every 45, 30 000 HP (`:596-626`) |
| BOSS4 | — | orbit, random TIROINI2/3 every 40, 30 000 HP (`:627-657`) |
| BOSS5 | — | **mirrors the player**: `x = 800 - player.x`, random TIROINI1/2/3 every 25, 40 000 HP (`:658-681`) |
| Ramming | enemy removed, player knocked back `yaux += 150` | enemy takes 9999 damage, so it explodes and scores. No knockback. **Boss contact now costs 100 energy** (`:767-791`) |
| TIRO6 (fire) | piercing (`tipo=INVALIDO` commented out) | consumed on hit (`:730`) |
| Bomb | 1000 dmg every frame while visible | 1000 dmg only while `alpha >= 250`, effectively the first frames (`:733-734`) |
| Hit-score bonus `10*type + 0.1*energy` | active | commented out (`:739-740`) |
| T2 pickup | also re-enabled weapon 1 | only unlocks weapon 2 (`:793-797`) |

**`menu.cpp`**:
- New About screen. `about1.png` is a static panel; `about2.png` is the same panel glowing, pulsed with alpha (`:399-439`). The credits are drawn in the image, not in code: *Christian Isenberg, Diego Lopes Simioni, Matheus Gobato Nunes; Chien2D2 lib by Paulo Vinicius Wolski Radtke; music "Progression" by sasquamox and "Recharge" by alvys18*.
- The main-menu "about" button used to flash red and play `acess.wav` (meaning "not implemented"). It now opens About (`:192-196`).
- Music is actually loaded and played (`:98-102`). In devcore the load was commented out and `CA2_TocaMusica(0,-1)` ran, so **devcore had no music at all** (`X85-devcore/menu.cpp:89-90`).
- Mission screen: Enter changed to **SPACE** to launch (`:261`). The always-visible "final boss" planet (`i == 7`) was removed (`:279`). Back now goes to MAIN instead of SLOT_SELECT (`:302`).
- Options: the "fullscreen" (which did nothing) and "reset all" buttons are commented out. "clear records" and "clear saves" moved up (`:499-524`).

### 1.3 Bugs still present in devcore 2 (worth fixing in the port, not reproducing)

1. **Null boss crash.** `Boss` is only set if a boss marker exists; `Boss->tipo` is dereferenced unconditionally (`jogo.cpp:163, 184-189, 202`).
2. **Weapon-cycle out-of-bounds read.** `if(tiro_atual-- < 1)` with `tiro_atual==1` yields 0, then reads `tiro_liberado[-1]` (`jogo.cpp:231-232`). It works by luck: that byte is the high byte of `planeta_atual`, which is 0.
3. **INIMIGO3 never scores.** `score+=400` increments the pointer, not the value (`funcoes_J.cpp:489`). The same bug exists in devcore (`score+=40`).
4. **`menu_recordes_insere` writes to a closed FILE\*** when the score qualifies for no slot (`funcoes_M.cpp:170-200`). It also overwrites the caller's name buffer (`strcpy(tempnome, …)` aliases `saveAtual.nome`). The loadslot that follows hides this.
5. **Debug values shipped:** energy 10000 and 50 bombs (`funcoes_J.cpp:99,102`). With energy 10000 the energy bar (`altura*586/100`) is permanently full.
6. **Difficulty is cosmetic.** `level` (EASY/NORMAL/HARD/GODMODE) is saved (`funcoes_M.cpp:259`) but never read by gameplay.
7. `jogo_carrega` loads `fase6..8.fmp`, which do **not exist** in devcore 2 (`jogo.cpp:54-56`). This is unreachable because `planeta_max=5`.
8. `C2D2M_PosicionaMapa(..., fase.yinicio)` runs before `yinicio` is read (`jogo.cpp:152-153`).
9. `jogo_carrega` busy-waits on SPACE (`jogo.cpp:119-123`). The port needs a non-blocking state.
10. Items `T1` have no movement case and no pickup case (`funcoes_J.cpp:683-687, 793-817`). No devcore 2 map places one; the comment at `jogo.cpp:178` says so.

---

## 2. betaversion (Feb 2009): a different game

### 2.1 What it is

betaversion is an earlier prototype with a separate design, menu system and art set. The only file it shares with the devcores is the font `512.png` (md5 `bd65944e`). Some enemy designs (green "green-devil", red "red-raptor", yellow "evil-drop") were later redrawn smaller as devcore `inim1/inim4/inim3`.

Game structure, from `betaversion/menu.cpp` `inicia()` state machine at `:1475-1519` (states 0-10):

- **Loading** fade over `loadfundo.jpg` (`:202-242`). Menu music is `sons/menu.ogg` (14 s loop).
- **Main menu** with five 350×60 slide-out buttons on the left (Start Game / Main Options / Records / About / exit) and a hazard-stripe `leftcover.png` (`:1311-1450`). A **ship showcase slideshow** fades through 6 frames of `naves-slide.png`, wireframe renders labelled evil-drop, green-devil, X85-1, red-raptor, X85-2, X85-3 (`:1381-1399, :1438`).
- **Play screen = ship and stage selection** (`play()`, `:653-873`). Two framed "windows" (`winds.png`) with ◄ ► arrows:
  - Ship: `dados/naves.png`, 3 frames of 140×140: X85-1, X85-2, X85-3.
  - Stage: `dados/fases.png`, 3 frames of 140×140: Earth, desert planet, ice-planet horizon.
  - A **specs panel** (`specs.png`) shows animated bars (`barspec.png`) for speed and strength per ship (X85-1 20/80, X85-2 80/20, X85-3 40/60), plus "level" 20/60/100 per stage (`:764-796`). A "go!" button starts the game.
  - **These specs are cosmetic.** `mainjogo(nave, fase)` (`jogo.cpp:861`) uses the ship only as the sprite frame (`jogo.cpp:769`). The stage only selects the scrolling background: `back.jpg` for stage 0, `back2.jpg` otherwise (`jogo.cpp:111-114`). All three stages play the same `sprites/mapa.FMP`.
- **Options** (`:877-1097`): music and effects volume bars (`backvol/barvol`), "all mute", fullscreen, clear records. Fullscreen asks to confirm, then **restarts the whole engine** in `C2D2_TELA_CHEIA` (`:1451-1460, :1529-1536`).
- **Ask dialogs** (`ask()`, `:487-650`): `ask.png` window plus `askicons.png` (3 icons, 48×48: warning, trash, monitor), with No/Yes. Three uses: "Exit the game?", "Erase all records?", "Fullscreen? must restart the game!". Music volume is halved while a dialog is open (`:541`).
- **Records** (`:1100-1218`): top **5** on `recordstab.png` (4 frames of 486×52: header, row, plain row, highlight). The first-place highlight pulses. **Trophies** (`trofeus.png`, gold/silver/bronze, 50×50) mark ranks 1-3.
- **Name entry dialog** (`recordesNome`, `:273-429`): `askname.png` text field with a blinking `|` caret, a-z plus space, backspace, Enter or OK. It is triggered after a game whose score makes the table (`recordesInsere`, `:432-480`).
- **About** (`credits()`, `:1221-1308`): drawn in code with the font. "Main Team: Alessandro, Christian Isenberg, Matheus Gobato Nunes; Chien2D2: P.V.; Musics: ???" plus `logotipos.png`.
- Window caption changes per screen (`SDL_WM_SetCaption("X85 / play")`, etc.).

Gameplay (`betaversion/jogo.cpp`):
- **The mouse controls the ship directly**: `x = mouse.x, y = mouse.y` (`:648-649`). Left button fires one 8×8 bullet (`:379-387`). **Right button holds a shield** that drains `tempoescudo` (120 frames). Picking up the shield item refills it (`:510-518, :652-655`).
- **P pauses** (`:317-319, :530-531`).
- Two parallax star layers (`:623-642`) over a vertically scrolling 800×1120 JPEG background.
- Enemies:
  - Green (`inim.png`): 100 HP, killed by one shot, 100 pts.
  - Red (`inim2.png`): 50 damage per shot, 150 pts.
  - Meteor (`meteoro.png`): 8-frame spin, 25 damage per shot, 200 pts.
  - Enemies only sway left/right on a 49-frame cycle (`:668-683`). **Enemies never shoot** (enemy-fire code is commented out, `:329-339, :589-593`).
  - INIMIGO3/INIMIGO4 are parsed from the map but **never updated, drawn or collided** (`:265-279, :553-558`).
- Items: energy (+30, max 120) and shield refill, from `itens.png`, 4×2 cells of 50×50 (red cross, shield, green "II" = unused weapon item).
- HUD (Argus revision): vertical life and shield gauges in round hazard-striped housings (`barras_cover.png`, 2 frames of 800×303, plus `barra_vida/barra_escudo`, 54×166) (`:534-549`).
- The run ends when the map scrolls out ("Congratulations !!!", `:598-606`) or energy reaches 0. Then comes the **Game Over screen** (`fundogameover.jpg`): the score counts up in steps of 50 with a `blip.wav` tick (`GameOver`, `:79-102`), followed by the record and name prompt.
- Music `sons/gameplay2.ogg` (139 s).
- No bosses, no weapons other than the basic shot, no save slots, no stage progression.

beta bugs to be aware of:
- X85-3 is **invisible** in game. `sprites/naves.png` is 160×80, only 2 frames of 80×80, but frame 2 is requested (`jogo.cpp:117, 769`).
- Energy pickup clears `energia[0]` instead of `energia[j]` (`:507`).
- The first marker of every type is lost, because the `PrimeiroBlocoMarca` result is overwritten by the first `ProximoBlocoMarca` (`:248-303`).
- Meteor and energy sprites are drawn twice, once without the map offset (`:768-772`).
- `recordesInsere` calls `fwrite` without having opened the file for writing when there is no new record (`menu.cpp:477`).

### 2.2 `backup-jogo.cpp` vs `jogo.cpp` (beta)

`backup-jogo.cpp` (11 Dec 2008) is the pre-"Argus" HUD version. Differences:
- Old HUD: horizontal bars drawn as 2×20 `risco.png` ticks on a 242×22 `barra-back.png` at the bottom, labelled "ENERGY:" and "SHIELD:" in text.
- New HUD in `jogo.cpp` (13 Feb 2009): vertical animated gauges in `barras_cover.png` with eased fill `altura_vida/altura_escudo` (`jogo.cpp:15-21, 147-149, 534-549`).

Gameplay logic is otherwise identical.

### 2.3 `menu.cpp` vs `menu.cpp~` (beta)

One line differs. `menu.cpp~:188` loads `./sons/menu.wav`, which **does not exist**. `menu.cpp:188` loads `./sons/menu.ogg`. The `~` file is an editor backup.

### 2.4 Beta features missing from devcore 2 that may be worth preserving

| Beta feature | Where | Port effort / notes |
|---|---|---|
| **Ship selection (3 ships with speed/strength specs)** plus animated specs panel | `menu.cpp:653-873`; `dados/naves.png`, `specs.png`, `barspec.png`, `winds.png` | Art exists for the select screen only. In game, only 2 of 3 ship sprites exist (`sprites/naves.png`) and the art style (top-down, 80 px) differs from devcore 2 `nave.png` (60 px). Making specs real needs new rules. |
| Ship showcase slideshow on main menu | `naves-slide.png` (6×320²) | Easy. Pure UI. |
| Stage preview thumbnails | `fases.png` | devcore 2 already has a planet carousel (`logo.png`). |
| **Shield** (hold right mouse / timed) | `jogo.cpp:510-518`; `escudo.png` | devcore 2 has `escudo` in `Nave` but it is unused. `nave.png` frame 1 ("INVUNERAVEL") exists but is never triggered. A natural fit. |
| Energy / shield pickups | `itens.png` | devcore 2 has only weapon pickups. |
| **Pause (P)** | `jogo.cpp:317` | devcore 2 has no pause; ESC aborts the mission. |
| **Game-over score tally screen** with blip | `GameOver()`; `fundogameover.jpg`, `blip.wav` | devcore 2 just waits 200 frames. |
| **Name prompt for high scores** | `recordesNome()`; `askname.png` | devcore 2 uses the save-slot name instead. |
| Confirmation dialogs (exit, erase records) | `ask()`; `ask.png`, `askicons.png` | devcore 2 clears records and saves **without confirmation**. |
| Trophies for top 3 | both have `trofeus.png` | Already in devcore 2. |
| Parallax double star layer, larger animated explosion sheet (`explo64.png`, 8 frames) | | Polish. |
| Mouse-driven ship control | `AtualizaJogador` | Could be an optional control scheme (good for touch on the web). |
| Music tracks `menu.ogg` (14 s) and `gameplay2.ogg` (139 s) | `sons/` | **Licence unknown** (credits say "???"). |

---

## 3. Asset inventory

Full machine output: run `python3 -I docs/analysis/tools/asset_inventory.py .` from the project root. Format: path · bytes · md5[:8] · info. All PNGs are 8-bit non-interlaced (RGBA unless noted). All JPEGs are baseline 3-channel.

### 3.1 X85-devcore 2 (canonical): 71 media files, 8.33 MiB (plus 5 maps and 2 `.x85` data files: `dados/` = 9.1 MB on disk)

**`dados/menu/`**:

| File | px | Sheet layout (as loaded) / use |
|---|---|---|
| `512.png` | 512×512 | **Bitmap font**: 16×16 grid of 32×32 glyphs in Latin-1 order, white bold condensed sans with dark outline. `C2D2_CarregaFonte(...,32)` computes per-glyph widths from transparent columns. Shared by all versions. |
| `fundo.jpg` | 800×600 | Space nebula (teal/grey), scrolled vertically 1 px/frame twice for an endless loop (`menu.cpp:105-122`) |
| `cover.png` | 800×600 | Carbon-fibre top and bottom bars with the chrome "X85" logo, drawn over everything |
| `darkback.png` | 800×600 | Translucent dark panel |
| `menutxt.png` | 800×600 | Pre-rendered button labels: start / options / ranking / about / exit (thin futuristic font) |
| `botmain.png` | 262×124 | 2 frames 262×62: normal / hover (hover alpha-faded in) |
| `botback.png` | 130×445 | 2 frames 65×445: tall "back" strip with ◄ |
| `otherbots.png` | 220×70 | 2 frames 220×35 |
| `botdelslot.png` | 62×124 | 2 frames 62×62 |
| `botplanetas.png` | 220×140 | 2×2 frames 110×70 (◄ normal/hover, ► normal/hover) |
| `select.png` | 360×180 | 2 frames 180×180 (planet selection box) |
| `logo.png` | 512×384 | **4×3 grid of 128×128**: 0 Earth, 1 Moon, 2 Mars, 3 Jupiter, 4 Saturn, 5 Uranus-like, 6 Neptune, 7 "FINAL BOSS" (blue demon), 8 red "X" (locked), 9-11 empty |
| `cursor.png` | 80×40 | 2 frames 40×40: arrow, plus collision "hot-spot" frame used by `C2D2_ColidiuSprites(cursor,1,…)` |
| `red.png` | 800×600 RGB | Red flash for "locked / denied" |
| `slotback.png`, `slotloadcover.png`, `slotinsertcover.png`, `optionscover.png` | 800×600 | Screen overlays |
| `volume.png` | 260×190 | 4 frames 65×190 (slider track / fill / knob…) |
| `recordstab.png` | 486×156 | 3 frames 486×52 (header "name/score", indented row with trophy, plain row) |
| `trofeus.png` | 150×50 | 3 frames 50×50 (gold/silver/bronze) |
| `about1.png`, `about2.png` | 534×401 | Credits panel, normal and glow |
| `x85.jpg` | 177×38 | Splash logo (`main.cpp:14`) |

**`dados/jogo/`**:

| File | px | Layout / use |
|---|---|---|
| `nave.png` | 120×60 | 2 frames 60×60: X85 ship (grey twin-prong, blue cockpit) / glowing "invulnerable" frame (unused) |
| `flame.png` | 200×200 | **5×5 grid of 40×40** engine flame, 25 frames, played 24 down to 1 (`jogo.cpp:259-260, 293`) |
| `explo.png` | 200×200 | Single cyan shock-ring, scaled up and faded procedurally (`jogo.cpp:338`, `funcoes_J.cpp:836-849`) |
| `fundo1.jpg` | 800×600 | Grey nebula, scrolled 0.5 px/frame |
| `loading.jpg` | 800×600 | Control diagram (ctrl = bomb, alt = change weapon, space = fire, arrows = move) |
| `ready.png` | 441×68 | "ready ? press space to start" |
| `barras_back.png` | 800×600 | HUD frame (left energy tube, right bomb sockets) |
| `barras_energy.png` | 16×586 | Energy fill, drawn with negative height (grows up) |
| `barras_bomba.png` | 25×25 | Bomb icon (cyan ring), stacked at x=774 |
| `barra_inf.png` | 400×63 | Weapon-info toast background |
| `inimigos/inim1..4.png` | 45×45, 35×35, 45×62, 45×57 | green-devil / small red sphere / yellow evil-drop / red raptor |
| `inimigos/meteoro.png` | 150×75 | 2 frames 75×75 (only frame 0 drawn) |
| `inimigos/boss1.png` | 140×120 | Green blob with mouth |
| `inimigos/boss2.png` | 120×120 | Red sphere in a steel ring |
| `inimigos/boss3.png` | 150×140 | Orange cone |
| `inimigos/boss4.png` | 145×120 | Red pod with steel pipes |
| `inimigos/boss5.png` | 60×60 | Red demon ship (player-sized "mirror" boss) |
| `itens/T1..T6.png` | 40×40 each | Round grey "capsule" icons showing each weapon |
| `tiros/tiro1..6.png` | 15×15, 30×15, 30×30, 30×30, 80×80, 15×30 | blue laser, twin red laser, orange ball, purple ball, green wave arc, fire. Scaled at runtime via `XDesenhaSprite` |
| `tiros/bomba.png` | 800×600 RGB | Full-screen white flash |
| `tiros/tiroini1..3.png` | 8×8 | Enemy shots: orange, teal, magenta |
| `mapas/tileset.png` | 256×160 | **Mappy marker palette**, 8×5 of 32×32 (see 3.4). **Never drawn in game**: the map layer is used only for spawn markers |
| `mapas/fase1..5.fmp` | 25×200 tiles of 32 px = 800×6400 px | Mappy FMP 1.0, one layer (BODY), markers only |

**`dados/sons/`**:

| File | Real format | Use |
|---|---|---|
| `recharge_alvys18.ogg` | Ogg Vorbis, 2 ch, 44.1 kHz, ~160 kbps nominal, **123.77 s**, 2.81 MB | **Menu music** |
| `progression_sasquamox.ogg` | Ogg Vorbis, 2 ch, 44.1 kHz, ~160 kbps, **215.64 s**, 4.19 MB | **Gameplay music** |
| `click.ogg` | **WAV PCM** (misnamed), 2 ch, 44.1 kHz, 16-bit, 0.50 s | Menu click |
| `zoop.ogg` | **WAV PCM** (misnamed), 2 ch, 44.1 kHz, 16-bit, 1.10 s | Planet arrows, volume |
| `acess.wav` | PCM, 1 ch, 22.05 kHz, 16-bit, 1.56 s | "Denied" |
| `explo.wav` | PCM, 2 ch, 44.1 kHz, 16-bit, 1.55 s | Explosions |
| `tiro1.wav` | PCM, 2 ch, 44.1 kHz, 0.05 s | Weapon 1 |
| `tiro2.wav` | PCM, 2 ch, 44.1 kHz, 0.07 s | Weapon 2 (new in dc2) |
| `tiro3.wav` | PCM, 1 ch, 11.025 kHz, 0.14 s | **Unreferenced** |
| `bomba.wav` | PCM, 1 ch, 22.05 kHz, 3.09 s | Bomb |

**Data files**:
- `dados/recs.x85`: 140 B = 7 × `tiporecorde{char nome[15]; int pts}` = 20 B each, with 1 pad byte.
- `dados/saves.x85`: 132 B = 3 × 44 B `tiposave`. Layout: `bool empty`, pad[3], `int pts`, `char nome[15]`, pad, `int level`, `int planeta_liberado`, `int planeta_atual`, `bool tiro_liberado[6]`, pad[2]. Little-endian.
- The shipped devcore 2 save holds slot 0 "argus" at 134 500 pts, planeta_liberado 4, weapons 1-5 unlocked. Every records entry is also "argus", which shows the developers played through the game.

### 3.2 X85-devcore: 64 media files, 1.50 MiB

Same menu set as devcore 2, except: no `about1/2.png`; `cursor.png` and `recordstab.png` differ (see 3.3).

Game assets are flat in `dados/jogo/`. Identical content, renamed in dc2 (same md5):

| devcore | devcore 2 |
|---|---|
| `tiro_laser_azul.png` | `tiros/tiro1.png` |
| `tiro_laser_red.png` | `tiro2.png` |
| `tiro_ball_laranja.png` | `tiro3.png` |
| `tiro_ball_roxo.png` | `tiro4.png` |
| `tiro_wave.png` | `tiro5.png` |
| `tiro_fogo.png` | `tiro6.png` |
| `bomba.png` | `tiros/bomba.png` |
| `tiro_bola_laranja.png` | `tiros/tiroini1.png` |
| `inim1..4.png`, `meteoro.png` | `inimigos/` |
| `nave`, `flame`, `explo`, `fundo1`, `barra*` | unchanged |

Only in devcore:
- `boss1.png`, 93×76: a black and blue tribal demon, also used as frame 7 "FINAL BOSS" in `logo.png`. It looks like third-party clip art, so check its provenance before shipping.
- `itempad.png` 50×50 (unreferenced) and `itemt2..6.png`: 50×50 square pads, loaded as 50×50 single frames.
- `inf_laser_azul` 50×50, `inf_laser_red` 50×25, `inf_ball_laranja` / `inf_ball_roxo` 45×45, `inf_wave` 50×50, `inf_fogo` 20×40: HUD weapon icons.
- `mapas/fase6..8.fmp`.

No music file at all. Sounds are dc2's set minus `tiro2.wav` and the two OGG tracks.

### 3.3 Assets that differ between devcore and devcore 2 (same name)

| File | Dims | How it differs (`png_diff.py`) |
|---|---|---|
| `mapas/tileset.png` | 256×160 in both | 1 454 px (3.5%) differ, only in cells **27-36**. dc labels cells 27-31 "t2…t6". dc2 relabels 27-32 "t1…t6" to match the new `M_T1..M_T6` enum, and adds cells 33-36 "B2, B3, B4, B5" (per-boss markers that the code never uses: dc2 picks the boss by stage index, not by marker). Cells 0-26 are identical. Beta's tileset differs in cells 26-31 (E = energy, I, II). |
| `menu/cursor.png` | 80×40 in both | 10 px in frame 1 only (x 45-48, y 5-7): the **hot-spot/collision frame** moved slightly. The visible arrow is identical. |
| `menu/recordstab.png` | 486×156 in both | 87% of pixels: restyled from black with white outline to grey glass. Same 3-frame layout. |
| `mapas/fase1..5.fmp` | 25×200 in both | Re-authored. See 3.4. |

### 3.4 Maps (`fmp_dump.py --labels …`)

All maps are FMP 1.0, little-endian, 25×200 tiles of 32×32 (800×6400 px), with a single layer (BODY). Embedded BKDT/BGFX are ignored by the engine. Every map's ATHR still says "Primeira Fase do Jogo x85", because the header was copied from map to map. Marker cell value v means code v-1.

| Map | INICIO / FIM | i1 | i2 | i3 | i4 | meteor | boss | items (dc2 meaning) |
|---|---|---|---|---|---|---|---|---|
| dc2 fase1 | 1/1 | 27 | 17 | 6 | 0 | 11 | 1 | 1 × M_T2 (row 85) |
| dc2 fase2 | 1/1 | 25 | 11 | 10 | 5 | 19 | 1 | 1 × M_T3 |
| dc2 fase3 | 1/1 | 27 | 14 | 5 | 6 | 13 | 1 | 1 × M_T4 |
| dc2 fase4 | 1/1 | 30 | 16 | 12 | 8 | 20 | 1 | 1 × M_T5 |
| dc2 fase5 | 1/1 | 48 | 19 | 16 | 14 | 37 | 1 | 1 × M_T6 |
| dc fase1 | 1/1 | 54 | 24 | 8 | 0 | 15 | 1 | values 28-32 = dc T2,T2,T3,T4,T5,T6, mostly at **row 192, right at the start** (test placement) |
| dc fase2…fase8 | **byte-identical copies** (md5 `46659b03…`) of a slight variant of dc fase1 | 50 | 24 | 7 | 0 | 9 | 1 | same test items |
| beta mapa.FMP | 1/1 | 63 | 79 | 0 | 4 | 42 | — | value 27 = ENERGIA ×5, 28 = M_ESCUDO ×2 |

Design intent in dc2: one new weapon per stage, with difficulty rising through enemy counts. The devcore maps are placeholders.

### 3.5 betaversion: 60 media files, 5.73 MiB

`dados/` (menu):

| File | px | Notes |
|---|---|---|
| `512.png`, `512-2.png` | 512² | Fonts |
| `fundo.jpg` | 800×600 | Earth from orbit |
| `fundo2.jpg`, `fundo3.jpg`, `fundoask.jpg` | 800×600 | Hazard-stripe framed panels |
| `loadfundo.jpg` | 800×600 | |
| `black.png` | 800×600 RGB | Fade layer |
| `botmain.png` | 350×120 | 2×(350×60) |
| `botsmall.png` | 80×80 | 2×2 of 40×40: ◄ and ►, normal/hover |
| `botok.png` | 60×80 | 2×(60×40) |
| `botscheck.png` | 220×140 | 4×(220×35): unchecked/checked × normal/hover |
| `cursor.png` | 80×40 | |
| `ask.png`, `askicons.png`, `askname.png` | 358×180, 144×48 (3×48²), 240×44 | Dialogs |
| `naves.png` | 420×140 | 3×140² ships |
| `fases.png` | 420×140 | 3×140² stages |
| `naves-slide.png` | 960×640 | 3×2 of 320² |
| `specs.png`, `barspec.png`, `winds.png` | 451×167, 120×23, 180×180 | Specs panel |
| `backvol.png`, `barvol.png` | 200×70, 180×48 | Volume |
| `recordstab.png` | 486×208 | 4×52 |
| `trofeus.png` | 150×50 | |
| `leftcover.png` | 102×600 | |
| `logotipos.png` | 341×93 | |
| `recs.x85` | 100 B | 5 records |
| `512.png-old` | | Unreferenced; identical to `sprites/fonte.png` |
| `fundo2-2.jpg` | | Unreferenced |

`sprites/` (game):

| File | px | Notes |
|---|---|---|
| `back.jpg`, `back2.jpg` | 800×1120 | Scrolling backgrounds |
| `naves.png` | 160×80 | 2×80² (X85-1, X85-2) |
| `inim.png`, `inim2.png` | 65×65, 65×82 | Loaded as 65×65 |
| `inim3.png` | 65×90 | Unreferenced |
| `meteoro.png` | 400×200 | 4×2 of 100² |
| `explo64.png` | 256×128 | 4×2 of 64² |
| `itens.png` | 200×100 | 4×2 of 50² |
| `escudo.png` | 80×80 | |
| `tiro.png` | 8×8 | |
| `tiro2.png` | 20×8 | Unreferenced |
| `barras_cover.png` | 800×606 | 2×(800×303) |
| `barra_vida.png`, `barra_escudo.png` | 54×166 | |
| `fundogameover.jpg` | 800×600 | |
| `pause.png` | 400×185 | Unreferenced |
| `fonte.png` | 512² | Unreferenced |
| `risco.png`, `barra-back.png` | | Backup HUD only |
| `tileset.png` | 256×160 | |
| `mapa.FMP` | | In use |
| `back-mapa.FMP`, `mapa.BAK` | | Older revisions |

`sons/`:

| File | Real format | Notes |
|---|---|---|
| `menu.ogg` | Vorbis, 2 ch, 44.1 kHz, 14.22 s | |
| `gameplay2.ogg` | Vorbis, 2 ch, 44.1 kHz, 139.31 s | |
| `tiro1.ogg` | Vorbis, 0.05 s | |
| `explo.ogg` | **WAV PCM misnamed**, 1 ch, 48 kHz, 1.02 s | |
| `explo2.mp3` | MPEG-2 Layer III, 1 ch, 22.05 kHz, 128 kbps, ~5.3 s | Unreferenced |
| `blip.wav` | 2 ch, 48 kHz, 0.09 s | |
| `cosmic.wav`, `cosmic2.wav` | 2 ch, 44.1 kHz, 0.11 s | |
| `switchon.wav` | 1 ch, 44.1 kHz, 2.03 s | |
| `switchoff.wav` | 1 ch, 44.1 kHz, 0.46 s | |

### 3.6 Art style (visual notes from viewing the files)

- **devcore / devcore 2** use a glossy mid-2000s "Vista/carbon" UI: carbon-fibre top and bottom bars, chrome "X85" wordmark, dark glass buttons with soft white outlines, a thin square futuristic font in pre-rendered labels, and a bold condensed bitmap font for dynamic text.
- Backgrounds are photo-like dark nebulae.
- Sprites are **pre-rendered 3D** (smooth shaded, specular highlights, no pixel art), seen top-down.
- Enemies are bright saturated primitives (green, red, orange) with a black "mouth/cockpit" hole. Bosses are scaled-up, more ornate versions of the same language.
- Weapons are soft additive-looking glows (laser streaks, glowing orbs, a green arc, a fire column).
- Planets in the mission carousel are glossy marble-like spheres.
- **beta** shares the 3D-render look but with yellow/black **hazard stripes**, a real-photo Earth, larger 80 px ships and wireframe "blueprint" ship renders. It reads more "industrial" than the clean devcore 2 look.
- Sprite sheets are simple fixed-cell grids, read row-major. Cell size is passed at load time (e.g. `flame.png` 40×40 gives 25 frames; `logo.png` 128×128 gives 12). A load size of 0×0 means "whole image = frame 0".
- Buttons follow a "frame n = normal, frame n+1 = hover" convention, with hover faded in by alpha (`XDesenhaBotao`, `funcoes_M.cpp:39-64`).

Screen mock-ups composited from the real assets at their code coordinates were inspected during this analysis: main menu, mission carousel, gameplay HUD, loading screen and About for dc2; main menu, play/selection and gameplay for beta.

---

## 4. Web compatibility of the assets

| Kind | Status in browsers (Oct 2026) | Action |
|---|---|---|
| PNG (8-bit RGB/RGBA) and baseline JPEG | Universal | Keep. Optionally pack into atlases. The 800×600 overlays (`cover`, `darkback`, `slot*`, `optionscover`, `barras_back`, `menutxt`) are mostly transparent and compress well. WebP/AVIF is optional (saves maybe 30-50% of a small total). |
| WAV PCM | Universal (`<audio>` and `decodeAudioData`) | Keep for short SFX. They total about 0.8 MB in dc2. Optionally transcode to 64-96 kbps AAC or Opus to save bytes. |
| **Misnamed WAVs** `click.ogg`, `zoop.ogg` (and beta `explo.ogg`) | `decodeAudioData` sniffs content, so they would usually work, but a server sends them as `audio/ogg` and `<audio>`/`canPlayType` logic will be confused | **Rename to `.wav`** in the port's asset pipeline. |
| Ogg Vorbis music | Chrome, Edge, Firefox: yes. **Safari: only from Safari 18.4** (macOS 15.4 / iOS 18.4, 2025) ([MacGeneration](https://www.macg.co/macos/2026/02/apple-ajoute-le-support-de-logg-vorbis-en-douce-dans-macos-et-ios-avec-une-lecture-native-306585), [MDN PR](https://https-github_com.proxy.bugsmash.io/mdn/content/pull/39592)). Older iOS/macOS cannot play it. Whether Web Audio `decodeAudioData` handles Vorbis on Safari 18.4+ is **not confirmed**: older polyfills such as [oggmented](https://www.npmjs.com/package/oggmented) exist because Safari historically failed there, and [WebKit had a similar `<audio>`-only phase for WebM Opus](https://bugs.webkit.org/show_bug.cgi?id=221745). | **Ship an AAC (`.m4a`) fallback** for both music tracks and pick with `canPlayType` (Ogg first, then m4a). AAC encoder delay causes a small gap at the loop point, so for seamless loops play music through Web Audio with `loopStart/loopEnd` trimmed, or accept a tiny gap. MP3 also works everywhere if preferred. |

**Tools available locally:**
- `ffmpeg`/`ffprobe`: **not installed**. `lame`, `oggenc` and `opusenc` are also absent.
- macOS built-ins work instead. `afinfo` reads Ogg Vorbis on this machine, and `afconvert` was verified to transcode Ogg to AAC:
  `afconvert -f m4af -d aac -b 128000 recharge_alvys18.ogg out.m4a` produced a 1.9 MB, 123.77 s file (scratch test only, nothing written to the project).
- For Opus or MP3 output, install ffmpeg (`brew install ffmpeg`).

**Sizes:**

| Version | Media total | Notes |
|---|---|---|
| devcore 2 | 8.33 MiB (71 files) | **7.0 MB of it is the two music tracks**. Images about 1.1 MB, SFX about 0.8 MB. Maps 0.59 MB, but only about 10 KB (the BODY layer) is meaningful. |
| devcore | 1.50 MiB | |
| beta | 5.73 MiB | Plus about 0.3 MB of maps |

With AAC music at 128 kbps, dc2 audio becomes about 5.3 MB (or about 3.4 MB at 96 kbps). Lazy-load the gameplay track after the menu appears.

Other port notes:
- `.fmp` maps should be pre-converted to compact JSON (`fmp_dump.py --json`). Only spawn markers matter.
- `.x85` binary saves and records should become `localStorage` JSON. The binary layouts are documented in 3.1 in case old saves need importing.
- Panning: emulate `CA2_TocaEfeitoTela` with a `StereoPannerNode`, pan = (x/400) - 1.

---

## 5. Music: what plays where (devcore 2)

| Moment | Code | File | Exists? |
|---|---|---|---|
| Load | `menu.cpp:98` `music_jogo = CA2_CarregaMusica("./dados/sons/progression_sasquamox.ogg")` | `X85-devcore 2/dados/sons/progression_sasquamox.ogg` (215.6 s) | Yes |
| Load | `menu.cpp:99` `music_menu = CA2_CarregaMusica("./dados/sons/recharge_alvys18.ogg")` | `X85-devcore 2/dados/sons/recharge_alvys18.ogg` (123.8 s) | Yes |
| App start, menus | `menu.cpp:102` `CA2_TocaMusica(music_menu,-1)` (infinite loop) | Recharge, by alvys18 | |
| Entering a stage | `main.cpp:58` `CA2_TocaMusica(music_jogo,-1)` | Progression, by sasquamox. It starts **before** the loading/ready screen. | |
| Leaving a stage | `main.cpp:60` `CA2_TocaMusica(music_menu,-1)` | Menu track restarts from the beginning | |

The credits (`about2.png`) name both artists. The file naming (`title_artist.ogg`) suggests community-licensed tracks, likely from Newgrounds or ccMixter. **Verify the licences before publishing the web port.**

In devcore, `music` was never loaded (`X85-devcore/menu.cpp:89` commented), so the game was silent. In beta, the menu plays `sons/menu.ogg` (`menu.cpp:188`, `:1482`) and gameplay plays `sons/gameplay2.ogg` (`jogo.cpp:138, 307`, with `vezes=999`).

### 5.1 Every missing file referenced by code

| Version | Reference | Status |
|---|---|---|
| devcore 2 | `jogo.cpp:54-56` `dados/jogo/mapas/fase6.fmp`, `fase7.fmp`, `fase8.fmp` | **Missing**. Unreachable while `planeta_max=5`. |
| devcore 2 | `jogo.cpp:86` `dados/jogo/inim.png` | Missing, commented out |
| devcore | `menu.cpp:89` `dados/sons/menu.ogg` | Missing, commented out (hence no music) |
| devcore | `jogo.cpp:70` `dados/jogo/inim.png` | Missing, commented out |
| betaversion | `menu.cpp~:188` `sons/menu.wav` | **Missing** (backup file only; `menu.cpp` uses `menu.ogg`, which exists) |

Every other referenced asset exists in all three versions (checked by script over all string literals).

Unreferenced assets:
- **dc2**: `dados/sons/tiro3.wav`.
- **dc**: `itempad.png`, `tiro3.wav`.
- **beta**: `512.png-old`, `fundo2-2.jpg`, `explo2.mp3`, `fonte.png`, `pause.png`, `tiro2.png`, `inim3.png`, `back-mapa.FMP`, `mapa.BAK` (plus `risco.png` and `barra-back.png`, used only by `backup-jogo.cpp`).

---

## 6. Recommendation

**Use `X85-devcore 2/` as the canonical base.**

- It is the most complete game: 5 stages, 5 distinct bosses, 6 weapons with per-stage unlocks, 3 save slots, a top-7 ranking with name, About, music, and loading/controls screens.
- Its engine is identical to devcore.
- All of its referenced assets exist (the missing fase6-8 are unreachable).
- Its maps are real, re-authored content.

Fix during the port:
- Restore balance values (energy 100, bombs 5), or make them difficulty-dependent so the unused EASY/NORMAL/HARD/GODMODE setting finally means something.
- Fix the bugs in §1.3.
- Add the missing weapon sounds for TIRO3-6, possibly reusing `tiro3.wav`.

**What to merge from the other versions, and the risks:**

| Candidate | Value | Risk / work |
|---|---|---|
| devcore `fase6.fmp`–`fase8.fmp` | **None.** They are byte-identical copies of the same placeholder map (also identical to dc `fase2-5`). | Their item markers use the **old enum**: value 28 meant T2 in dc but is `M_T1` in dc2, and so on. Loaded as-is, every pickup shifts one weapon down, and the T1 marker spawns a static, non-collectable item. Their items also sit at the start of the map (test placement). To add stages 6-8, author new maps, or copy a dc2 map and edit it. Also needed: raise `planeta_max`, the `< 4` unlock cap (`jogo.cpp:210`), and the `case 5..7` boss mapping (`funcoes_J.cpp:367-389`), which has no BOSS6-8. Planet art for 3 more stages exists in `logo.png` frames 5-7 (two planets plus "FINAL BOSS"). |
| devcore `boss1.png` (blue demon) and `logo.png` "FINAL BOSS" frame | Could be a final boss for a stage 8 | Provenance unclear (looks like third-party art) |
| devcore `inf_*.png` weapon icons | Optional alternative HUD icons | dc2 replaced them with the T1-T6 item icons. Cosmetic only. |
| beta **ship selection** | User-visible feature | The beta ships (80 px, different style), the specs UI and the cosmetic stats do not fit dc2 directly. To keep it: reuse `dados/naves.png` and `specs.png` in a new "hangar" screen, apply real speed/strength modifiers to the dc2 `Nave`, and create in-game sprites in dc2 scale. Beta has only 2 of the 3 in-game sprites. Art-style mismatch: beta hazard stripes vs dc2 carbon glass. |
| beta **shield**, **pause**, **energy/shield pickups**, **game-over tally**, **confirm dialogs** | Gameplay and UX improvements | Logic is simple to re-implement. Reuse `escudo.png`, `itens.png` frames, `blip.wav` and `fundogameover.jpg` if the style is acceptable. New map markers would need codes ≥ 33, since tileset cells 33-36 are already labelled B2-B5. |
| beta music (`menu.ogg`, `gameplay2.ogg`) | Extra tracks | Licence unknown (credits say "???") |

Overall risk summary:
- **Map-marker enum drift is the main hazard** when mixing maps across versions. Always load maps through a version-specific code table; `fmp_dump.py --labels` has all three.
- Save and record binary formats are stable across devcore and devcore 2 (44-byte and 20-byte records), but beta records hold 5 entries, not 7.
- Third-party audio and art licences (music tracks, dc boss art) must be cleared before public release.
