# X85 — Gameplay & UI Specification (target: `X85-devcore 2/`, Aug 2010)

Source of truth: `X85-devcore 2/` game code — `main.cpp` (71 lines), `menu.cpp` (787), `funcoes_M.cpp` (272), `funcoes_M.h` (92), `jogo.cpp` (407), `funcoes_J.cpp` (850), `funcoes_J.h` (107). Engine files (`chien2d2*.cpp/h`, `chienaudio2.*`) were consulted only for call semantics.
Citations use `file:line`. Files are Latin-1. Line numbers match the files on disk.

The shipped binary `bin/Release/X85-devcore` (ELF i386, built 2010-08-06 18:28:52) **matches this source**. Every `.o` in `obj/Release` is newer than its `.cpp`/`.h`, and `funcoes_J.o` was rebuilt 2 s after the last edit to `funcoes_J.cpp`. Disassembly confirms `energia=0x2710` (10000), `n_bombas=0x32` (50), and the INIMIGO3 score-pointer bug (`addl $0x640, 0x20(%ebp)`).

Tooling: `docs/analysis/tools/spec_inspect.py` (run as `python3 -I spec_inspect.py "<X85-devcore 2>" images|saves|maps|font|all`) reproduces every derived number below: image grids, collision masks, save/record decoding, map markers, and font metrics.

---

## 0. Engine semantics that the game relies on (must be emulated)

| Topic | Behaviour | Ref |
|---|---|---|
| Screen | 800×600, windowed, title `"X85"`, OpenGL ortho with origin **top-left**, y down. Clear colour black. | `main.cpp:6`, `chien2d2_gl.cpp:148,173-176` |
| Frame pacing | `C2D2_Sincroniza()` sleeps until ≥16 ms since the previous call, swaps buffers with vsync requested (`SDL_GL_SWAP_CONTROL=1`), **then** polls input. All game logic is per-frame with no delta time. The effective rate is 60 Hz on a 60 Hz vsync display, or 62.5 Hz uncapped. **Port: use a fixed 60 Hz logic tick.** | `chien2d2_gl.cpp:235-249`, `:108` |
| Input edges | Each `C2D2_Botao` has `pressionado` (went down this frame), `ativo` (held) and `liberado` (released this frame). `pressionado`/`liberado` are cleared at the start of every poll. KEYDOWN sets `pressionado=ativo=true`; KEYUP sets `ativo=false, liberado=true, pressionado=false`. A tap whose down and up land in the same frame is lost. There is no key repeat (`SDL_EnableKeyRepeat` is never called). | `chien2d2.cpp:473-530` |
| Keys mapped | Arrows, Esc, F1–F4, Enter, Space, Backspace, LAlt, RAlt, LCtrl, RCtrl, LShift, RShift, a–z, 0–9. The window-close event sets `C2D2_ENCERRA`, **which the game never reads**, so closing the window does nothing. | `chien2d2.cpp:536-622` |
| Mouse | `mouse.x/y` come from motion and button events. Left/right/middle buttons use the same edge semantics. The OS cursor is hidden (`SDL_ShowCursor(SDL_DISABLE)`). | `chien2d2.cpp:626-660`, `chien2d2_gl.cpp:179` |
| `C2D2_CarregaSpriteSet(file,w,h)` | `w=h=0` makes the whole image one frame. Otherwise frames are w×h, numbered **row-major** (`idx % cols`, `idx / cols`). The same path returns the existing id (ref-counted). | `chien2d2_gl.cpp:379-427`, `:615-616` |
| `C2D2_DesenhaSprite(id,frame,x,y)` | Draws the frame at native size with top-left at (x,y). Alpha blend uses `SRC_ALPHA, ONE_MINUS_SRC_ALPHA` with GL_LINEAR filtering. An invalid id (0) or frame is a silent no-op. | `chien2d2_gl.cpp:603-646` |
| `XDesenhaSprite(id,frame,x,y,w,h,alpha)` (game helper) | Draws the frame stretched to a w×h quad at (x,y), modulated by alpha 0–255. `w==0 \|\| h==0` uses native frame size. **Negative h flips vertically** and grows upward from y. | `funcoes_M.cpp:16-37` |
| Collision `C2D2_ColidiuSprites` | Bounding-box rejection (strict `>` against widths) followed by a **pixel-perfect bitmask** test. Each bitmask is computed once at load on the **native frame**; scaling and alpha at draw time are ignored. | `chien2d2.cpp:112-160` |
| "Transparent" pixel rule | A pixel is transparent only if its raw 32-bit value is `0` (RGBA 0,0,0,0) or opaque magenta `255,0,255,255` (magenta is rewritten to 0). **A pixel with alpha 0 but non-zero RGB counts as SOLID.** JPGs and RGB PNGs are fully solid. Many sprites contain such pixels (see §6). **Port: build masks from raw PNG data at build time, because canvas `getImageData` zeroes RGB of alpha-0 pixels.** | `chien2d2.cpp:716-732`, `chien2d2_gl.cpp:502,810-832` |
| Texture limit | Images larger than 1024 px fail to load. All assets are ≤ 800 px. | `chien2d2_gl.cpp:450-457` |
| Fonts `C2D2_CarregaFonte(file,32)` | A 512×512 image holds a 16×16 grid of 32×32 glyphs; glyph index = byte value. Each glyph gets `deslocamento` (first non-transparent column) and `largura` (first fully transparent column after it, +2, minus `deslocamento`; or `32-desl`). Space width is 16. Text is drawn glyph by glyph at `pos - desl[c]`, then `pos += larg[c]`. Alignment: `ESQUERDA` uses pos=x, `DIREITA` uses pos=x−totalWidth, `CENTRALIZADO` uses pos=x−totalWidth/2 (integer division). y is the **top** of the 32-px cell. The full metrics table is printed by `spec_inspect.py font` (e.g. `a`=(9,16), `0`=(8,17), `:`=(12,10)). | `chien2d2.cpp:175-337,371-430` |
| Points primitive | `C2D2P_Pontos(pts,n,r,g,b)` draws 1-px GL points with no texture, opaque. | `chien2d2primitivas_gl.cpp:54-62`, `:45` |
| Audio init | SDL_mixer opens at 44100 Hz, S16, stereo, 2048-sample buffer, with the **default 8 mixing channels** (no `Mix_AllocateChannels`). When all 8 are busy, new effects are dropped. Volumes start at 100/100 and `main` then sets them to 30/30. | `chienaudio2.cpp:90-100` |
| `CA2_AjustaVolume(m,e)` | Clamps to 0–100. Effects use `Mix_Volume(-1, e*128/100)` (all channels); music uses `Mix_VolumeMusic(m*128/100)`. | `chienaudio2.cpp:149-170` |
| `CA2_TocaEfeito(id,pos)` | Takes pos in −100..100. Left gain `(100-pos)*254/200`, right gain `(100+pos)*254/200` (of 255). Menus always pass 0, giving 127/127 (about half amplitude per side). | `chienaudio2.cpp:278-301` |
| `CA2_TocaEfeitoTela(id,x)` | Clamps x to 0..800, computes `pos = 200*x/800 - 100`, then pans as above. An **id of 0 is a silent no-op.** | `chienaudio2.cpp:309-335` |
| `CA2_TocaMusica(id,-1)` | Loops forever and always restarts from the beginning. | `chienaudio2.cpp:474-489` |
| Map marks | `C2D2M_CamadaMarcas(map, 0, 1)` makes layer 0 (BODY) the marker layer with offset 1, so a raw cell value `v` means marker `v-1`. Mark coordinates are the **tile centre** in map pixels: `(col*bw + bw/2, row*bh + bh/2)`. The scan order is row-major from the top-left. | `chien2d2mapa.cpp:445-459,564-635` |
| `C2D2M_PROG` | **= 20** (`chien2d2mapa.h:18-32`). So `BOLA=20, M_INIMIGO1=21, M_INIMIGO2=22, M_INIMIGO3=23, M_INIMIGO4=24, M_METEORO=25, M_BOSS=26, M_T1=27 … M_T6=32`. INICIO is marker 0 and FIM is marker 1. | `funcoes_J.h:15` |
| RNG | `rand()` is **never seeded** (no `srand`), so glibc's default seed 1 makes star positions and boss shot choices identical on every launch. To be bit-exact, emulate the glibc `random()` TYPE_3 generator with seed 1. Otherwise any PRNG will do. | `funcoes_J.cpp:18,19,29,30,611,642,670` |

---

## 1. Program flow & state machine

### 1.1 Startup (`main.cpp`)
1. `C2D2_Inicia(800,600,C2D2_JANELA,C2D2_DESENHO_OPENGL,"X85")` runs; on failure it prints and exits with 1 (`main.cpp:6-10`).
2. **Splash** (`main.cpp:14-17`): loads `./dados/menu/x85.jpg` (177×38), clears to black, draws it at **(312,270)**, then calls `Sincroniza` once (one swap). There is no timer. The splash stays up only while audio initialises and `menu_carrega()` loads every menu asset. *Port: show it during preloading. A minimum duration is optional and not in the original.*
3. Starts the primitives library, audio (`CA2_Inicia`) and the map library, then calls `CA2_AjustaVolume(volume_music=30, volume_effects=30)` (`main.cpp:20-23`).
4. `menu_carrega()` loads the menu assets and **starts the menu music** looping (`menu.cpp:52-103`).
5. Sets `estado_atual = TELA_MAIN` (`main.cpp:27`).
6. Main loop (`main.cpp:29-66`). While `estado_atual != SAIR`, it sets `encerra = 0` and dispatches on the state. Each screen function loops until `encerra` becomes 1.

| State (enum `funcoes_M.h:15`) | Value | Function | Notes |
|---|---|---|---|
| `TELA_MAIN` | 0 | `menu_main()` | |
| `TELA_SLOT_SELECT` | 1 | `menu_slot_select()` | |
| `TELA_SLOT_INSERT` | 2 | `menu_slot_insert()` | |
| `TELA_MISSION` | 3 | `menu_mission()` | planet select |
| `TELA_OPCOES` | 4 | `menu_opcoes()` | |
| `TELA_RANKING` | 5 | `menu_ranking()` | |
| `TELA_ABOUT` | 6 | `menu_about()` | |
| `TELA_JOGO` | 7 | `CA2_TocaMusica(music_jogo,-1); jogo_tela(); CA2_TocaMusica(music_menu,-1);` | Music switches **before** the loading screen and switches back after the game returns. Both tracks restart from 0. (`main.cpp:57-61`) |
| `SAIR` | 8 | leaves the loop, then `CA2_Encerra(); C2D2_Encerra();` | `main.cpp:62-70` |

### 1.2 Transition table

| From | Trigger | To | Sound |
|---|---|---|---|
| MAIN | click button 1 (262,162) "start" | SLOT_SELECT | click |
| MAIN | click button 2 (262,226) "options" | OPCOES | click |
| MAIN | click button 3 (262,288) "ranking" | RANKING | click |
| MAIN | click button 4 (262,350) "about" | ABOUT | click |
| MAIN | click button 5 (262,412) "exit" | SAIR | **none** |
| MAIN | Esc (pressed edge) | SAIR | none |
| any other menu screen | Esc | MAIN (also from SLOT_INSERT and MISSION) | none |
| any menu with back button | click back (8,94) | MAIN; from SLOT_INSERT it goes to **SLOT_SELECT** | click |
| SLOT_SELECT | click slot k, slot not empty | load slot, then MISSION | none |
| SLOT_SELECT | click slot k, slot empty | SLOT_INSERT (`slotAtual=k`) | none |
| SLOT_INSERT | click a difficulty with a non-empty name | write slot, load slot, then MISSION | none |
| SLOT_INSERT | click a difficulty with an empty name | stay; red flash (`redAlpha=220`) | acess |
| MISSION | click select box or Space, planet unlocked | JOGO | click |
| MISSION | same, planet locked | stay; red flash (`redAlpha=210`) | acess |
| JOGO | Esc | MISSION (**no save, no reload**) | — |
| JOGO | boss dead or player dead, then 200 frames | MISSION | — |

### 1.3 Menu fade / transition model (`menu_aux`, `menu.cpp:124-160`)
Globals: `fadealpha=0`, `fadecontrol=false`, `encerra=0` (`funcoes_M.cpp:12-14`).
- Every menu loop starts with `if (estado_atual != <own state>) fadecontrol = true;` (e.g. `menu.cpp:169-170`). A click changes `estado_atual` mid-frame, so the fade begins **next** frame.
- Each frame, `menu_aux()` does:
  ```
  if Esc.pressionado: estado = (estado==TELA_MAIN) ? SAIR : TELA_MAIN
  if !fadecontrol and fadealpha > 0: fadealpha -= 25           // fade-in
  elif fadecontrol:
      if fadealpha < 250: fadealpha += 25                      // fade-out
      else: encerra = 1; fadecontrol = false
  if fadealpha > 0:
      draw fundo.jpg at (0,yfundo1) and (0,yfundo2), 800x600, alpha=fadealpha
  draw cover.png at (0,0)
  draw cursor.png frame 0 at (mouse.x, mouse.y)
  ```
- Fade-out takes 10 steps up to 250, then the screen ends on the 11th frame. The next screen starts at 250 and fades in 25/frame over 10 frames. The fade is a **dissolve into the scrolling background image**, not to black, and it is drawn **under** `cover.png` and the cursor.
- Buttons remain live during the fade. A second click can retarget `estado_atual`.
- The game screen (`jogo_tela`) has no fade. Because `fadealpha` stays at 250 while the game runs, MISSION fades in when the game returns.

### 1.4 Scrolling menu background (`menu_fundo`, `menu.cpp:105-122`)
Globals `yfundo1=0`, `yfundo2=0`, `redAlpha=0` (`menu.cpp:4-6`) persist across all menu screens.
```
if yfundo1 >= 0: yfundo1 = -600
if yfundo2 >= 600: yfundo2 = 0
yfundo1 += 1; yfundo2 += 1                   // 1 px/frame downward, seamless
if redAlpha > 0: redAlpha -= 5
draw fundo.jpg at (0,(int)yfundo1); draw fundo.jpg at (0,(int)yfundo2)
if redAlpha: draw red.png at (0,0) 800x600 alpha=redAlpha   // red "denied" flash, under all UI
```

### 1.5 Button widget (`XDesenhaBotao`, `funcoes_M.cpp:39-64`)
```
draw frame indx at (x,y)                                      // normal
draw frame indx+1 at (x,y) native size, alpha = alpha_state   // highlight (shows last frame's alpha)
hit = pixelCollide(cursor.png frame 1 at (mouse.x,mouse.y), button frame indx at (x,y))
if hit:
    if alpha_state < 250: alpha_state += 25
    if LMB.pressionado: return 1        // click (press edge)
    elif LMB.ativo:     return 2        // held (not on the press frame)
    elif LMB.liberado:  return 3
    return 0
else:
    if alpha_state > 0: alpha_state -= 25
    return 0
```
- **The cursor hotspot is a single pixel.** `cursor.png` (80×40, two 40×40 frames): frame 0 is the visible arrow drawn with its top-left at the mouse position; frame 1 holds exactly one solid pixel at **(8,6)**. A button is hovered/clicked when screen pixel **(mouse.x+8, mouse.y+6)** lies on a solid pixel of the button frame's mask.
- The highlight fades in/out at 25 per frame, from 0 to 250.
- There are no hover sounds.
- Each screen keeps its own `balpha[12]` array (re-zeroed on screen entry).

### 1.6 Game screen loop timing
See §3.1 for the exact per-frame order. The end-of-phase delay is 200 frames (about 3.3 s at 60 Hz).

---

## 2. Menu screens

Common: every screen calls `C2D2_LimpaTela()`, then `menu_fundo()`, then screen content, then `menu_aux()` (fade, `cover.png`, cursor), then `Sincroniza`. `cover.png` (800×600 RGBA) is the top and bottom chrome bar with the "X85" logo. All text uses font `./dados/menu/512.png` (size 32), loaded once into `fonte` (`menu.cpp:93`).

### 2.1 Main menu — `menu_main()` (`menu.cpp:162-208`)
Draw order:
1. Background (§1.4).
2. Five buttons from `botmain.png` (262×124, frames 262×62: 0 = normal, 1 = highlight), all frame 0, at x=262 and y = **162, 226, 288, 350, 412** (`menu.cpp:177-199`).
3. `menutxt.png` (800×600 overlay with the labels "start", "options", "ranking", "about", "exit") at (0,0), drawn **over** the buttons (`menu.cpp:201`).
4. `menu_aux()`.

Actions are listed in §1.2. Buttons 1–4 play `sombot` (click.ogg). Exit is silent.
Note: the y spacing is irregular (64, 62, 62, 62) and must be reproduced.

### 2.2 Slot select — `menu_slot_select()` (`menu.cpp:534-644`)
On entry it opens `./dados/saves.x85` "rb". If that fails it calls `menu_saves_default()` and reopens. It reads 3×`tiposave` into `vetsaves` and closes the file (`menu.cpp:541-548`).
Draw order:
1. Background.
2. `darkback.png` (0,0).
3. `slotback.png` (0,0).
4. `slotloadcover.png` (0,0), which shows the "continue" and "erase" headers and floppy icons.
5. Back button `botback.png` frame 0 at **(8,94)** (130×445 image, 65×445 frames: 0 = normal, 1 = highlight); a click goes to MAIN with the click sound.
6. Slot buttons `botmain` frame 0 at (262,**226**), (262,**288**), (262,**350**) for slots 0,1,2.
7. Delete buttons `botdelslot.png` (62×124, 62×62 frames) frame 0 at (515,226), (515,288), (515,350). Each one is **drawn and clickable only when that slot is non-empty** (`menu.cpp:618-634`).
8. Slot names: `C2D2_DesenhaTexto(fonte, 390, 238+62*i, vetsaves[i].nome, CENTRALIZADO)` (`menu.cpp:636-637`). Empty slots show "new".
9. `menu_aux()`.

Logic:
- **Slot click** (`menu.cpp:568-615`) plays no sound.
  - If `!vetsaves[k].empty`: `slotAtual=k; menu_saves_loadslot(k); estado=TELA_MISSION`.
  - Otherwise: `slotAtual=k; estado=TELA_SLOT_INSERT`.
- **Delete click** plays no sound and has no confirmation: `menu_saves_edit(k,"new",EASY,true); menu_saves_carregavetor(vetsaves)`.

### 2.3 Slot insert / name entry — `menu_slot_insert()` (`menu.cpp:646-787`)
Locals: `pisca=0`, `indxnome=0`, `nome[15]={0}`, `nometemp[15]`.

Per-frame input (before drawing):
```
if indxnome < 12:   // max 12 chars
    first match in this order, on pressionado (one char per frame max):
    A..V -> 'a'..'v', then X->'x', Y->'y', W->'w', Z->'z', Space->' '   (menu.cpp:664-690)
if Backspace.pressionado and indxnome > 0: nome[--indxnome] = '\0'
nome[indxnome] = '\0'; nometemp = nome + "|"
```
Input is lower-case only, with no digits, no shift, and no repeat. A name of only spaces counts as non-empty.

Draw order:
1. Background.
2. `darkback`, `slotback`, `slotinsertcover` (each at 0,0).
3. Back button (8,94); a click goes to **SLOT_SELECT** with the click sound.
4. Four `otherbots.png` buttons (220×70, 220×35 frames: 0 = normal, 1 = highlight), frame 0, at (275,**280**), (275,**320**), (275,**360**), (275,**400**), for EASY=1, NORMAL=2, HARD=3, GODMODE=4 (`funcoes_M.h:16`).
5. Labels, centred at x=380: "Easy" y=282, "Normal" y=322, "Hard" y=362, "GOD MODE" y=402 (`menu.cpp:775-778`).
6. The name, left-aligned at (300,205). Then **the blink**:
   ```
   if (pisca++ <= 30) draw nometemp ("name|") at (300,205) over it
   else if (pisca >= 60) pisca = 0
   ```
   This gives a 60-frame cycle: 31 frames with the bar, 29 without. The name is drawn twice while the bar is visible (slight overdraw brightening).
7. `menu_aux()`.

Difficulty click (`menu.cpp:717-772`):
- If `nome[0] != '\0'`: `menu_saves_edit(slotAtual, nome, LEVEL, empty=0); menu_saves_loadslot(slotAtual); estado = TELA_MISSION`. No sound.
- Otherwise: `redAlpha = 220`, play `acess.wav`.

**The difficulty is stored but never used anywhere in gameplay** (see §7).

### 2.4 Mission / planet select — `menu_mission()` (`menu.cpp:212-330`, `planetas_atualiza` in `funcoes_M.cpp:66-124`)
Setup: allocates `planeta_max` (=5, `funcoes_M.cpp:5`) planets, each with `x=400, y=300, tamanho=2, alpha=0` (`menu.cpp:226-239`). These are never freed (leak).

Per frame:
```
snome = "Welcome <saveAtual.nome> !" ; spontos = "Pts: <saveAtual.pts>"   (%d)
max = (planeta_atual+4 >= planeta_max) ? planeta_max : planeta_atual+5   // always 5 with planeta_max=5
min = (planeta_atual-3 < 0) ? 0 : planeta_atual-2                        // atual 0..2 -> 0, 3 -> 1, 4 -> 2
planetas_atualiza(planets, planeta_atual, planeta_max)
clear; menu_fundo()
if XDesenhaBotao(select.png frame 0, 310, 210) == 1 or Space.pressionado:
    if planeta_atual <= planeta_liberado: play click; estado = TELA_JOGO
    else: play acess; redAlpha = 210
for i in [min, max):
    frame = (i <= planeta_liberado) ? i : 8          // logo.png frame 8 = "locked" planet
    XDesenhaSprite(logo.png, frame, p[i].x, p[i].y, p[i].tamanho, p[i].tamanho, p[i].alpha)
back button (8,94) -> MAIN (click)
if (XDesenhaBotao(botplanetas frame 0, 255,450)==1 or Left.pressionado) and planeta_atual > 0:
    play zoop; planeta_atual--
if (XDesenhaBotao(botplanetas frame 2, 450,450)==1 or Right.pressionado) and planeta_atual < max-1:
    play zoop; planeta_atual++
text snome at (100,100) ESQUERDA; text spontos at (780,100) DIREITA
menu_aux()
```
- `select.png` is 360×180 with two 180×180 frames (normal, highlight). Its top-left is (310,210), so its centre is (400,300). Planets are drawn **on top of** the select box.
- `botplanetas.png` is 220×140 with 110×70 frames: 0 = left arrow, 1 = left highlight, 2 = right arrow, 3 = right highlight.
- `logo.png` is 512×384 with 128×128 frames (4 columns × 3 rows). Frames 0–7 are eight planet graphics, frame 8 is the locked/unknown planet, and frames 9–11 are empty. Only frames 0–4 and 8 are reachable.
- The player can browse onto locked planets (shown as frame 8), but selecting one is refused.
- `planeta_atual` changes made here live only in RAM. They are written to disk only when a phase is won (§4).

`planetas_atualiza` (`funcoes_M.cpp:66-124`). The constants are `pos_x=325, pos_y=225, tamanho_centro=150, smooth=10`. All arithmetic is C integer division, truncating toward zero.
```
c = planets[atual]
c.tamanho += (150 - c.tamanho)/10 + 1   if c.tamanho < 150 ; -= (c.tamanho-150)/10 + 1 if > 150
c.x       += (325 - c.x)/10 + 1         if c.x < 325       ; -= (c.x-325)/10 + 1       if > 325
c.y       likewise toward 225
c.alpha = 255
for i = atual+1 .. max-1 (right side):
    p[i].tamanho = p[i-1].tamanho / 2
    p[i].x = p[i-1].x + p[i-1].tamanho + 20
    p[i].y = p[i-1].y + (p[i-1].tamanho - p[i].tamanho)/2
    p[i].alpha = p[i-1].alpha - 50
for i = atual-1 .. 0 (left side):
    p[i].tamanho = p[i+1].tamanho * 2          // NOTE: left planets get BIGGER (x2)
    p[i].x = p[i+1].x - p[i].tamanho - 20
    p[i].y = p[i+1].y + (p[i+1].tamanho - p[i].tamanho)/2
    p[i].alpha = p[i+1].alpha / 2
```
- Only the current planet eases. The neighbours snap relative to it each frame.
- When the selection changes, the newly current planet eases from the neighbour position it last held.
- In steady state the centre planet is 150 px at (325,225). The right neighbour is 75 px at (495,262), alpha 205; the next is 37 px at (590,281), alpha 155; and so on. The left neighbour is **300 px** at (5,150), alpha 127, followed by 600 px at (−615,0), alpha 63.
- The ×2 on the left is probably deliberate: passed planets look closer. The commented-out alternatives at lines 94–97 and 110–113 also differ. Reproduce it as-is.
- Alpha is an `int` passed as `Uint8`. With 5 planets it never goes negative, so there is no wrap.

### 2.5 Ranking — `menu_ranking()` (`menu.cpp:332-395`)
On entry it opens `./dados/recs.x85` "rb" (calling `menu_recordes_default()` and retrying if that fails) and reads 7×`tiporecorde`. **The file is never closed** (handle leak).
Draw order:
1. Background.
2. `darkback`.
3. Back button (8,94).
4. `recordstab.png` (486×156, 486×52 frames): frame 0 (header) at (200,115); frame 1 (top-3 style, left gap for the trophy) at (200,165), (200,215), (200,265); frame 2 at (200,315), (200,365), (200,415), (200,465) (`menu.cpp:368-375`).
5. `trofeus.png` (150×50, 50×50 frames: gold, silver, bronze) frames 0, 1, 2 at (190,166), (190,216), (190,266).
6. For i = 0..6: name at (255, 175+50i) ESQUERDA; `"%d"` points at (640, 175+50i) DIREITA (`menu.cpp:382-389`).
7. `menu_aux()`.

The display buffer `pontos[7][10]` overflows past 999,999,999 (cosmetic).

### 2.6 Options — `menu_opcoes()` (`menu.cpp:443-532`)
On entry: `ymusic = 422 - volume_music*172/100` and `yeffects = 422 - volume_effects*172/100`. The defaults of 30 give y = 371.
Draw order and logic per frame:
1. Background, then `darkback`, then `optionscover.png` (panel with "music", "FX" and "others" headers).
2. Back button (8,94) goes to MAIN with the click sound.
3. **Music slider**, using `volume.png` (260×190, 65×190 frames: 0 = track, 1 = fill, 2 = knob with solid rows 80–111, 3 = knob highlight):
   - Track: frame 0 at (230,240).
   - Fill: `XDesenhaSprite(volume, 1, 230, 430, 65, (ymusic-430)-1, 255)`. The negative height draws a **vertically flipped**, scaled fill from y=430 up to y=`ymusic-1`.
   - Knob: `XDesenhaBotao(volume, 2, 230, ymusic-95)`. Its visual centre is about `ymusic`. When it returns **2** (held, not on the press frame, and the hotspot is still over the knob), `volume_music = atualiza_barra(ymusic, 422, 250, mouse)`.
4. **Effects slider**: same layout at x=320 with `yeffects`. If the new value differs from the old one, play `zoop`.
5. `atualiza_barra(&y, ymax=422, ymin=250, mouse)` (`funcoes_M.cpp:126-137`):
   ```
   t = 172 ; p = ((422 - mouse.y)*100)/t
   if p >= 100: y = 250  elif p <= 0: y = 422  else: y = mouse.y
   return ((422 - y)*100)/t          // 0..100
   ```
   Note: this uses `mouse.y`, not the hotspot (`mouse.y+6`).
6. Buttons, all `otherbots` frame 0, with no click sounds:
   - (440,230) **mute** sets both volumes to 0 and recomputes `ymusic`/`yeffects`.
   - (440,270) **clear records** calls `menu_recordes_default()`.
   - (440,310) **clear saves** calls `menu_saves_default()`.

   A fullscreen button and a "reset all" button (which would set 50/50) are commented out (`menu.cpp:499-511,521-522`).
7. Labels centred at x=550: "mute" y=232, "clear records" y=272, "clear saves" y=312.
8. `menu_aux()`, then `CA2_AjustaVolume(volume_music, volume_effects)` **every frame** (`menu.cpp:529`).

Volumes are **not persisted**. They reset to 30/30 on every launch.

### 2.7 About — `menu_about()` (`menu.cpp:399-439`)
Draw order: background, `darkback`, back button (8,94), `about1.png` (534×401) at (200,100), then `about2.png` (534×401, the glow layer of the credits text) at (200,100), native size, with a pulsing alpha:
```
about_alpha = 0; inc = true
per frame: if inc: (about_alpha < 255) ? about_alpha += 5 : inc = false
           else:   (about_alpha > 1)   ? about_alpha -= 5 : inc = true
```
The cycle runs 0 to 255 in 51 frames, holds one frame, falls 255 to 0 in 51 frames, and holds one frame: a ~104-frame period.
Credits (baked into the image): main team Christian Isenberg, Diego Lopes Simioni, Matheus Gobato Nunes; Chien2D2 lib by Paulo Vinicius Wolski Radtke; music "Progression" by sasquamox and "Recharge" by alvys18.

### 2.8 Visual mock-ups
Composites built from the assets at the coordinates above are in the scratchpad (not part of the deliverable): main, mission, slots, options, about, game HUD. They confirm the coordinates line up with the artwork (e.g. the 5 main buttons fit `menutxt` labels, slot names fit `slotback` boxes).

---

## 3. Gameplay (`jogo.cpp`, `funcoes_J.cpp`)

### 3.1 Loading, "ready" and per-frame order
`jogo_tela()` (`jogo.cpp:126-362`) starts with these locals: `yfundo1=yfundo2=0` (float), `quadroFlame=24`, `altura_energia=0`, `contadormarcas=0`, `contadorfinal=0`, `temp_pts=0`, `informacao=-1`.

`jogo_carrega()` (`jogo.cpp:36-124`):
1. Load `loading.jpg` (800×600) and `ready.png` (441×68). Clear, draw `loading` at (0,0), and `Sincroniza` (shows the loading screen).
2. Load the map for `saveAtual.planeta_atual`: 0→`fase1.fmp` … 4→`fase5.fmp`, 5→`fase6.fmp`, 6→`fase7.fmp`, 7→`fase8.fmp`, always with `dados/jogo/mapas/tileset.png` (`jogo.cpp:47-57`). **`fase6`–`fase8` do not exist in devcore 2's `dados/`** (they exist in `X85-devcore/`). They are unreachable because `planeta_max=5` and unlocking is capped at index 4. If one were loaded, `fase.mapa=0`, no boss would be found, and the `Boss` NULL dereference would crash.
3. Load every game sprite and sound (§6). Sprite sets are ref-counted, so on the second and later plays only a new map actually loads.
4. Draw `ready.png` at **(180,440)** onto the back buffer (it is not cleared), then loop `{ if Space.pressionado break; Sincroniza(); }` (`jogo.cpp:116-123`).

   With double buffering this alternates the two buffers every frame: [loading] and [whatever was in the back buffer + ready]. That flickers on page-flip drivers, but blit-swap drivers show "loading + ready" stably. **Intended: `loading.jpg` with `ready.png` at (180,440), waiting for Space.**

   Only Space works here. Esc does nothing.
5. Because `break` happens before `Sincroniza`, `Space.pressionado` is still true on the first game frame, so **the first frame fires one shot** if the weapon is ready.

Setup after loading (`jogo.cpp:150-192`):
```
C2D2M_VelocidadeCamadaMapa(mapa,0,1)          // no effect: map is never drawn
C2D2M_CamadaMarcas(mapa,0,1)
C2D2M_PosicionaMapa(mapa,0,fase.yinicio)       // uses stale yinicio (global, 0 first time); irrelevant
fase.yinicio = y of INICIO marker; fase.yfinal = y of FIM marker (unused)
fase.ymapa = fase.yinicio                      // = 6384 for all 5 maps
jogo_inicia_jogador(&jogador); jogador.sprite = nave
zero tiros[300], marcas[1000], explos[100]
scan marks in this order, appending to marcas[]: M_INIMIGO1, M_INIMIGO2, M_INIMIGO3, M_INIMIGO4,
    M_METEORO, M_BOSS, M_T1..M_T6 (each in row-major map order)
Boss = first mark with tipo in BOSS1..BOSS5 (NULL if none -> crash later)
jogo_cria_estrela(estrelas,100)
```

**Per-frame order** (`jogo.cpp:194-360`). Reproduce it exactly, because many interactions depend on it.
```
1  if estado != TELA_JOGO: encerra = 1        (the rest of this frame still runs/draws)
2  if Esc.pressionado: estado = TELA_MISSION
3  end-of-phase check (§3.12)
4  if LAlt.pressionado: cycle weapon (§3.5); informacao = 180
5  jogo_atualiza_fundo  (bg scroll)
6  jogo_atualiza_estrela(vel=1)
7  jogo_atualiza_jogador (movement + death check)
8  jogo_atualiza_barras (energy bar easing)
9  jogo_atualiza_explosao
10 jogo_atualiza_tiro   (all shots move / expire)
11 jogo_atualiza_marca(marcas, fase.ymapa, ...)  (spawn/AI/enemy fire/deaths/score)
12 jogo_testa_colisao
13 if intervalo_tiro > 0: intervalo_tiro--
14 if fase.ymapa > -600: fase.ymapa -= 2
15 quadroFlame = (quadroFlame > 1) ? quadroFlame-1 : 24
16 fire:  if (LMB.ativo || Space.pressionado || Space.ativo) && intervalo_tiro <= 0 && jogador.tipo != INVALIDO:
          CA2_TocaEfeitoTela(somTiro[tiro_atual], jogador.x); jogo_cria_tiro(tiro_atual)
17 bomb:  if LCtrl.pressionado && jogador.tipo != INVALIDO && n_bombas > 0:
          CA2_TocaEfeitoTela(somTiro[BOMBA1], jogador.x); jogo_cria_tiro(BOMBA1); n_bombas--
18 spontos = sprintf("pts: %09i", temp_pts + saveAtual.pts)
19 DRAW (§3.13)
20 Sincroniza
```

### 3.2 Background & stars
- `fundo1.jpg` (800×600) is used for **every** phase. The map tiles are **never drawn**: the game only reads marks from the map, and `tileset.png` is loaded (as the map's sprite set) but never displayed.
- `jogo_atualiza_fundo` (`funcoes_J.cpp:3-13`):
  ```
  if y1 > 0: y1 = -600
  if y2 > 600: y2 = 0
  y1 += 0.5; y2 += 0.5
  ```
  Positions are floats, drawn at `(int)` (truncated toward zero), giving a seamless 0.5 px/frame downward loop.
- Stars (`funcoes_J.cpp:15-33`): 100 points, initially `x=rand()%800, y=rand()%600`. Each frame `y += 1`. If `y > 599`, then `y = rand()%1` (=0) and `x = rand()%808` (0..807, so a few are off-screen). Drawn as 1-px points with RGB (200,200,200) after both background copies (`jogo.cpp:289`).

### 3.3 Scrolling / camera & spawn model
- `fase.ymapa` starts at `yinicio` = **6384**: every map is 25×200 tiles of 32×32 (800×6400 px) with INICIO at row 199. Each frame it decreases by 2 until it would pass −600 (`jogo.cpp:257`).
- Nothing is drawn from the map. **`ymapa` acts purely as a spawn clock.**
- Spawn rule (`funcoes_J.cpp:423-430`). A mark with map position (X,Y) that is inactive becomes active on the first frame where `Y - ymapa >= -100`:
  ```
  ativo = 1; y = Y - ymapa  (screen y, always exactly -100 because Y and ymapa are even); x = X (unchanged)
  centroX = x; centroY = y
  ```
- On frame k (0-based), `ymapa = 6384 - 2k` (the value passed in before step 14). So a mark at Y spawns on frame **k = ceil((6284 - Y)/2)**. The mark's sprite **top-left** sits at the tile centre, so sprites are offset right/down of the tile.
- After spawning, marks move **only by their own AI**. Enemies with +2/frame (INIMIGO3, METEORO, INIMIGO1's centre) look "fixed to the map". Items move at +1/frame.
- Despawn (`funcoes_J.cpp:418-422`): an active mark with `y > 700` becomes `INVALIDO` (no score).
- Boss spawn frames: fase1 (Y=144) k=3070; fase2/3/5 (Y=176) k=3054; fase4 (Y=208) k=3038. That is about **51 s** at 60 Hz.

Map content (decoded by `spec_inspect.py maps`; positions are tile centres):

| Map | INICIO | FIM | INIMIGO1 | INIMIGO2 | INIMIGO3 | INIMIGO4 | METEORO | BOSS (x,y) | Item |
|---|---|---|---|---|---|---|---|---|---|
| fase1 | (368,6384) | (368,16) | 27 | 17 | 6 | 0 | 11 | (368,144) | T2 @ (624,2736) |
| fase2 | (368,6384) | (400,16) | 25 | 11 | 10 | 5 | 19 | (368,176) | T3 @ (400,2736) |
| fase3 | (368,6384) | (400,16) | 27 | 14 | 5 | 6 | 13 | (368,176) | T4 @ (368,2832) |
| fase4 | (368,6384) | (336,16) | 30 | 16 | 12 | 8 | 20 | (336,208) | T5 @ (400,3632) |
| fase5 | (368,6384) | (400,16) | 48 | 19 | 16 | 14 | 37 | (368,176) | T6 @ (368,2896) |

No map contains T1, BOLA, or CHECK.

### 3.4 Player ship
`jogo_inicia_jogador` (`funcoes_J.cpp:89-103`):

| Field | Value | Notes |
|---|---|---|
| x, y | 400, 400 | top-left of the 60×60 sprite |
| xaux, yaux | 400, 400 | movement target |
| velocidade | 20 | easing divisor |
| tipo | X85 (1) | `INVUNERAVEL` (2) is never assigned |
| escudo | 100 | **unused** |
| energia | **10000** | debug value; devcore (Jun 2010) used 100 (`X85-devcore/funcoes_J.cpp:99`) |
| tiro_atual | TIRO1 | reset every phase regardless of unlocks |
| bomba_atual | BOMBA1 | |
| n_bombas | **50** | debug value; devcore used 5 (`X85-devcore/funcoes_J.cpp:102`) |
| intervalo_tiro | 0 | |

Sprite: `nave.png` (120×60, 60×60 frames). Frame 0 is the normal ship; frame 1 is the invulnerable variant (unused).

Movement (`funcoes_J.cpp:35-79`). The step is a `static int velocidade = 15`.
```
if tipo != INVALIDO:                      // keys: pressionado || ativo
    Up    && yaux > 15       : yaux -= 15
    Down  && yaux < 615      : yaux += 15
    Right && xaux < 815      : xaux += 15
    Left  && xaux > 15       : xaux -= 15
// easing always runs (even when dead)
if x < xaux && x < 720 : x += (xaux - x)/20 + 1
elif x > xaux          : x -= (x - xaux)/20 + 1
if y < yaux && y < 520 : y += (yaux - y)/20 + 1
elif y > yaux          : y -= (y - yaux)/20 + 1
if energia <= 0 && tipo != INVALIDO: tipo = INVALIDO; jogo_cria_explosao(x, y)   // at top-left, not centre
```
- Reachable targets from the 400 start: `xaux` ∈ [10, 820], `yaux` ∈ [10, 625]. The ship position is effectively clamped to x ∈ [10, ~725] and y ∈ [10, ~525] (the `<720` and `<520` checks allow one final overshoot step of up to 6 px).
- Feel: the target moves 15 px/frame while a key is held, and the ship chases it at (distance/20 + 1) px/frame. The result is floaty acceleration and deceleration. Opposite keys cancel.
- Mouse movement is commented out (`funcoes_J.cpp:43-44`).

Flame: `flame.png` (200×200, 40×40 frames in a 5×5 grid, 25 frames) is drawn at `(x+9, y+45)` while `tipo != INVALIDO`. The frame index `quadroFlame` counts down 23, 22, …, 1, 24, 23, … (frame 0 is never shown; 24-frame cycle) (`jogo.cpp:131,259-260,292-293`).

### 3.5 Controls (game)

| Input | Action | Edge | Ref |
|---|---|---|---|
| Arrow keys | move target ±15/frame | held or pressed | `funcoes_J.cpp:49-56` |
| Space (hold) **or left mouse button (hold)** | fire current weapon at its rate | pressed / held | `jogo.cpp:264` |
| Left Ctrl | bomb | press edge | `jogo.cpp:270` |
| Left Alt | cycle weapon (descending, wraps) and show weapon info for 181 frames | press edge | `jogo.cpp:230-234` |
| Esc | abort to MISSION (no save) | press edge | `jogo.cpp:199-200` |

There is no pause. A "next weapon" key `2` is commented out (`jogo.cpp:236-240`).

Weapon cycle (`jogo.cpp:231-232`):
```
do { if (tiro_atual-- < 1) tiro_atual = 6; } while (!saveAtual.tiro_liberado[tiro_atual-1]);
```
This moves to the previous unlocked weapon, wrapping 1 → 6. The intermediate value 0 reads `tiro_liberado[-1]`, the last byte of `planeta_atual`, which is always 0, so the loop continues to 6. Port: "previous unlocked weapon, wrap to highest".

### 3.6 Player weapons
All shots live in one shared pool of **300** `Tiro` slots (player shots, bombs and enemy shots), filled first-free (`MAXTIROS`, `funcoes_J.h:5`). Spawn positions are relative to the ship's top-left. `tamanho` is the drawn size; 0 means native.

| Weapon | Name (HUD) | Interval (frames between shots) | Spawn (x,y) | Initial tamanho | Per-frame update | Draw | Damage | Fire sound |
|---|---|---|---|---|---|---|---|---|
| TIRO1 | "Blue Laser" | **4** | (x+21, y) | 0 (native 15×15) | `y -= 6` | native at (x,y) | 50 | `tiro1.wav` |
| TIRO2 | "Red Laser" | **6** | (x+14, y) | 0 (native 30×15) | `y -= 6` | native at (x,y) | 75 | `tiro2.wav` |
| TIRO3 | "Exploding Balls" | **6** | (x+29, y) | 5 | `if t<22: t++ ; y -= t/3` | t×t at (x−t/2, y) | 100 | **none** (id 0) |
| TIRO4 | "Triple Exploding Balls" | **12** | 3 shots, n=−1,0,1: (x+27+10n, y), `id=n` | 5 | `if t<20: t++ ; y -= t/3 ; x += id*2` | t×t at (x−t/2, y) | 75 each | none |
| TIRO5 | "Hyper Wave" | **6** | (x+29, y−5) | 10 | `if t<80: t++ ; if alpha>0: alpha -= 4 ; y -= t/4` | t×t at (x−t/2, y), alpha | 120 | none |
| TIRO6 | "That's FIRE BABY!" | **every frame** (interval 0) | (x+29, y−2) | 6 | `y -= t/3 + 1 ; if t<30: t++ ; if alpha>0: alpha -= 6` | **t × 2t** at (x−t/2, y), alpha | 150 | none |

Sources: creation `funcoes_J.cpp:105-208`; movement `:253-319`; draw `jogo.cpp:301-325`; damage `funcoes_J.cpp:706-737`; info text `jogo.cpp:364-407`.

- The firing cadence comes from the step order: `intervalo_tiro` is set to N at fire time, decremented at step 13, and checked at step 16. So the gap between shots is exactly N frames (TIRO1 fires on frames 0, 4, 8, …). TIRO6 fires every frame.
- **Shot expiry** (`funcoes_J.cpp:259-262`), checked *before* movement each frame:
  - Player shots (tipo < BOMBA1) become INVALIDO when `y < -100 || y > 700 || alpha < 10`. TIRO5 therefore lives about 62 frames and TIRO6 about 42 frames.
  - The bomb becomes INVALIDO when `alpha < 5`.
  - **Enemy shots (tipo > BOMBA1) are never expired** (bug, §7).
- **Collision uses the native image mask at (x,y), not the drawn quad.** TIRO3–6 are drawn centred on x and scaled, but they collide as their full native image (30×30, 30×30, 80×80, 15×30) with its top-left at (x,y). The hit area is therefore shifted right and down relative to the visual. TIRO5's mask is solid only in rows 4–44 of its 80×80 image.
- A player shot hits at most one mark: the first in array order. It is consumed on hit (except the bomb).

Bomb (BOMBA1):
- Created at (0,0), `tamanho=800`, alpha 255. It **resets `intervalo_tiro` to 0** (`funcoes_J.cpp:194-207`).
- Each frame `alpha -= 5`. It is removed after 52 frames.
- Drawn as `bomba.png` stretched to 800×600 at the bomb's alpha, in the shot layer. That puts it over the ship and background but **under** enemies, explosions and the HUD (`jogo.cpp:316-317`).
- Damage (`funcoes_J.cpp:732-735`): `bomba.png` is an 800×600 RGB image, so its mask is fully solid and it overlaps every active enemy whose solid pixels intersect the screen rectangle. It deals 1000 only while `alpha >= 250`. The bomb is created after the collision step with alpha 255, ticks to 250 next frame, and then collides, so it deals **exactly 1000 damage once to every on-screen enemy and boss**.
- It is not consumed and does not clear enemy shots.
- Sound: `bomba.wav` (3.1 s), panned by `jogador.x`.

### 3.7 Enemies, meteors & bosses
`jogo_inicia_marca` (`funcoes_J.cpp:336-411`) sets, for every mark, `angulo=90` (radians, as a float), `ativo=0`, `estado_atual=0`, `tempotiro=0`, then the type and HP:

| Type | Sprite (frame size) | HP | Score on death | Explosion at | Contact damage to player (mark gets −9999) | Ref |
|---|---|---|---|---|---|---|
| INIMIGO1 | `inim1.png` 45×45 | 200 | +200 | (x+35, y+35) | −20 | `:346-349,435-454,769-772` |
| INIMIGO2 | `inim2.png` 35×35 | 300 | +300 | (x+20, y+20) | −30 | `:350-353,457-480,773-776` |
| INIMIGO3 | `inim3.png` 45×62 | 400 | **0** (bug: `score+=400`) | (x+30, y+50) | −40 | `:354-357,482-497,777-780` |
| INIMIGO4 | `inim4.png` 45×57 | 500 | +500 | (x+30, y+42) | **none** (the case is just `break`; enemy survives) | `:358-361,499-529,781` |
| METEORO | `meteoro.png` loaded 75×75 (150×75 sheet, only frame 0 used) | 750 | +1000 | (x+30, y+30) | −50 | `:362-365,531-540,782-785` |
| BOSS1 | `boss1.png` 140×120 | 10000 | +3000 | (x, y−25) | −100 **per frame of overlap**, boss unaffected | `:369-372,542-568,787` |
| BOSS2 | `boss2.png` 120×120 | 20000 | +3000 | (x, y−25) | −100/frame | `:373-376,569-595,788` |
| BOSS3 | `boss3.png` 150×140 | 30000 | +3000 | (x, y−25) | −100/frame | `:377-380,596-626,789` |
| BOSS4 | `boss4.png` 145×120 | 30000 | +3000 | (x, y−25) | −100/frame | `:381-384,627-657,790` |
| BOSS5 | `boss5.png` 60×60 | 40000 | +3000 | (x, y−25) | −100/frame | `:385-388,658-681,791` |

- The boss type is chosen by `saveAtual.planeta_atual` (0→BOSS1 … 4→BOSS5) when the M_BOSS mark is initialised.
- When a ram sets a mark's energy to −9999, the death branch runs on the next frame's AI update. **Ramming therefore awards the kill score** (except INIMIGO3, which awards nothing anyway).
- Every enemy shot spawns at **(mark.x+22, mark.y+45)** regardless of sprite size, including bosses (`funcoes_J.cpp:210-251`).
- All enemy shot sprites are 8×8 and fully solid.

Every AI branch runs only for an active mark, once per frame, **after** the spawn check. It is not run on the spawn frame. Within each branch the order of steps matters (move, death, fire). Death sets `tipo=INVALIDO`, but the branch continues, so a dying enemy whose `tempotiro<=0` still fires one last shot that frame.

```
INIMIGO1:  y = (int)(centroY + 50*sin(angulo)); x = (int)(centroX + 100*cos(angulo))
           angulo = (angulo < 360) ? angulo + 0.08f : 0       // float precision; radians
           centroY += 2
           death check; fire TIROINI1 when tempotiro<=0 then tempotiro=100, else tempotiro--   // every 101 frames
INIMIGO2:  if player alive:
              if x < px+10: x += (px - x)/80 + 1
              if x > px+10: x -= (x - px)/80 + 1          // two independent ifs; C truncating division
              if y < py-50: y += (py - y)/80 + 1
              if y > py-50: y -= (y - py)/80 + 1
           else y += 2
           death; fire TIROINI2, tempotiro=50 (every 51 frames)
INIMIGO3:  y += 2; death (no score); fire TIROINI3 (homing), tempotiro=180 (every 181)
INIMIGO4:  y = (int)(centroY + 40*sin(a)); x = (int)(centroX + 40*cos(a)); a += 0.08f (wrap at 360 -> 0)
           if player alive: centroX += 3 if centroX < px+10; centroX -= 3 if centroX > px+10;
                            centroY += 3 if centroY < py-200; centroY -= 3 if centroY > py-200
           else y += 2   (cosmetic: y is recomputed next frame, so it hovers forever)
           death; fire TIROINI3, tempotiro=80 (every 81)
METEORO:   y += 2; death; never fires
BOSS1..4:  if y <= 50 && estado==0: y += 1                    // descends from -100 at 1 px/frame
           elif estado==0: centroY = y (=51); estado = 1
           else: y = (int)(centroY + 20*sin(a)); x = (int)(centroX + 50*cos(a)); a += 0.08f (wrap)
           fire when tempotiro<=0 (from the moment it spawns, even off-screen):
              BOSS1: TIROINI1, tempotiro=30 (every 31)
              BOSS2: TIROINI2, tempotiro=30 (every 31)
              BOSS3: rand()%2==1 ? TIROINI1 : TIROINI2, tempotiro=45 (every 46)
              BOSS4: rand()%2==1 ? TIROINI2 : TIROINI3, tempotiro=40 (every 41)
           death check (after firing)
BOSS5:     if y <= 50: y += 1           // no orbit, no estado
           x = 800 - player.x           // horizontal mirror of the player (boss5 is a 60x60 "evil twin")
           death check; then fire: r=rand()%3: 0->TIROINI3, 1->TIROINI2, 2->TIROINI1; tempotiro=25 (every 26)
Items T2..T6: y += 1.  T1: no movement (never present in maps).
```
- `px, py` are the player's top-left `x, y`.
- `angulo` starts at 90 rad and wraps to 0 once ≥ 360 rad, after 3375 frames (about 56 s alive). Because 360 is not a multiple of 2π, the orbit **jumps visibly** at that moment.
- Arithmetic: `centroY + 50*sin(a)` is computed in double, with the float angle promoted. Use `Math.fround` for the angle accumulator and truncation for the `(int)` casts.

Enemy shots (`funcoes_J.cpp:301-315`), all with alpha 255 and native 8×8 size:

| Shot | Sprite | Motion | Damage to player |
|---|---|---|---|
| TIROINI1 | `tiroini1.png` | `y += 4` | 15 |
| TIROINI2 | `tiroini2.png` | `y += 4` | 5 |
| TIROINI3 | `tiroini3.png` | homing on x: `if x < px+10: x += (px-x)/80+1; if x > px+10: x -= (x-px)/80+1`; `y += 3` | 15 |

### 3.8 Items (weapon unlocks)
- Item marks T1–T6 use sprites `itens/T1..T6.png` (40×40, fully solid masks). T2–T6 fall at 1 px/frame. Each map contains exactly one item.
- On contact with a living player (`tipo == X85`) (`funcoes_J.cpp:793-817`), item Tk sets `saveAtual.tiro_liberado[k-1] = true`, `tiro_atual = TIROk` (auto-switch), and removes the mark. No sound, no score, no info box.
- T1 has no pickup case. It would be drawn and never collected or moved.
- Unlocks persist only if the phase is then won (§4). On death they are reverted by the reload. **After an Esc abort they stay in RAM** until the next slot load (quirk).
- Progression: fase1 gives Red Laser, fase2 gives Exploding Balls, fase3 Triple, fase4 Hyper Wave, fase5 FIRE.

### 3.9 Collision (`jogo_testa_colisao`, `funcoes_J.cpp:694-821`)
All tests are pixel-perfect (§0). The loop structure must be kept, because order decides which mark absorbs a shot:
```
for i in 0..299 (tiros):
  for j in 0..999 (marcas):
    if marca[j].tipo != INVALIDO && tiro[i].tipo != INVALIDO && marca[j].ativo:
       if tiro[i].tipo <= BOMBA1 && marca[j].tipo in INIMIGO1..BOSS5
          && collide(spTiro[tiro.tipo] f0 @ (tiro.x,tiro.y), spMarca[marca.tipo] f0 @ (marca.x,marca.y)):
             apply damage table §3.6; tiro.tipo = INVALIDO unless BOMBA1
       elif tiro[i].tipo in TIROINI1..TIROINI3 && jogador.tipo == X85
          && collide(spTiro[tiro.tipo] f0 @ tiro, nave f0 @ (jogador.x,jogador.y)):
             jogador.energia -= {15,5,15}; tiro.tipo = INVALIDO
    if i == 0 && marca[j].tipo in INIMIGO1..T6 && marca[j].ativo && jogador.tipo == X85
       && collide(spMarca[marca.tipo] f0 @ marca, nave f0 @ jogador):
          contact table §3.7 / item pickup §3.8
```
- **Enemy shots can hit the player only while at least one mark is active.** The test sits inside the mark loop. With no active marks (e.g. gaps between waves), enemy bullets pass through the ship (quirk).
- Items are not hittable by shots (the range is INIMIGO1..BOSS5).
- Contact damage is checked once per mark per frame (the `i==0` pass).
- Player death happens in `jogo_atualiza_jogador` on the **next** frame (step 7).

### 3.10 Explosions (`funcoes_J.cpp:823-849`)
- Pool of 100. `jogo_cria_explosao(x,y)` takes the centre: `tamanho=30`, `alpha=255`.
- Each frame, while `alpha > 0`: `tamanho += 3`, `alpha -= 5`. When alpha reaches 0 the explosion is removed on the next frame. It grows from 30 to 183 px over 51 frames.
- Drawn as `explo.png` (200×200) stretched to t×t at (x−t/2, y−t/2) with that alpha (`jogo.cpp:335-339`).
- Death sound `explo.wav` (1.55 s) is panned by `marca.x`. The player's own death plays no sound.

### 3.11 Score
- `temp_pts` holds the score for the current run.
- Kills add per the table in §3.7 (via the `int *score` parameter).
- A per-hit score formula is commented out (`funcoes_J.cpp:738-740`).
- HUD text: `"pts: %09i"` of `temp_pts + saveAtual.pts`, at (40,0) left-aligned with the 32-px font (`jogo.cpp:278,349`). Example: `pts: 000134500`.

### 3.12 Phase end, game over, completion (`jogo.cpp:202-226`)
```
if Boss->tipo == INVALIDO || jogador.energia <= 0:          // Boss NULL -> crash (fase6-8 only)
    if contadorfinal == 0:                                   // runs once
        if Boss->energia <= 0:                                // WIN (boss killed)
            if planeta_liberado == planeta_atual && planeta_liberado < 4: planeta_liberado++
            saveAtual.pts += temp_pts
            menu_saves_saveslot(slotAtual)                    // writes pts, planeta_liberado, planeta_atual, tiro_liberado
            menu_recordes_insere(saveAtual.pts, saveAtual.nome)   // cumulative total, every win
        temp_pts = 0
        menu_saves_loadslot(slotAtual)                        // on death: reverts pts/unlocks/planeta_atual to disk
    if contadorfinal < 200: contadorfinal++ else estado = TELA_MISSION
```
- There is **no game-over screen, no "stage clear" text, and no lives.** The game keeps simulating for 200 frames (enemies move and shoot), then returns to MISSION.
- After a win, the player can keep scoring during those 200 frames, but those points are discarded.
- Completing phase 5 (index 4) unlocks nothing and shows no ending.
- Winning does not advance `planeta_atual`: the menu reopens on the same planet.
- Replaying cleared phases **farms cumulative points**, and every win inserts the new cumulative total into the records, so one player can fill the table (the existing `recs.x85` shows exactly this: all "argus").
- On death the HUD score drops back to the saved total immediately, because `temp_pts=0`.
- If the player dies in the same frame the boss dies, the win branch still runs (it checks `Boss->energia`).
- If the boss leaves the screen it counts as a loss (energia > 0). Bosses never move off-screen, so this cannot happen in practice.

### 3.13 Drawing order (game) and HUD (`jogo.cpp:284-358`)
1. Clear.
2. `fundo1.jpg` at (0,(int)y1) and at (0,(int)y2).
3. Stars.
4. Flame (if alive) at (x+9, y+45), frame `quadroFlame`.
5. Ship: `nave` frame 0 if X85, frame 1 if INVUNERAVEL. Not drawn when dead.
6. All shots in pool index order (player, bomb, enemy, interleaved).
7. All valid, active marks: frame 0 at (x,y), native size.
8. Explosions.
9. `barras_back.png` (800×600 HUD frame overlay) at (0,0).
10. Energy bar, if `energia > 0`: `XDesenhaSprite(barras_energy, 0, 6, 595, 16, -altura_energia*586/100, 255)`. That is the 16×586 bar image **flipped vertically**, growing upward from y=595, height `altura*586/100` (C truncation).

    `altura_energia` eases toward `energia` by **±1 per frame** (`funcoes_J.cpp:81-87`), starting at 0. The graphic is scaled for `energia = 100`. With the shipped `energia = 10000`, the bar fills in 100 frames and then keeps "growing" off the top of the screen for 166 s, so damage is never visible. (Intended: 100 HP, bar shows HP%.)
11. Bomb icons: `barras_bomba.png` (25×25) at (774, 116 − 26·i) for i in 0..n_bombas−1. With 50 bombs only about 5 are visible (y = 116, 90, 64, 38, 12, −14…). The icon layout fits 5 bombs.
12. Score text at (40,0).
13. Weapon info. If `informacao >= 0`: `informacao--` and draw `barra_inf.png` (400×63) at (380,5); the icon `spMarca[Tk]` at (390,15); "Weapon k" at (450,10); the description at (450,30) (all left-aligned). It shows the **current** `tiro_atual` for 181 frames after LAlt. Pickups do not trigger it.

---

## 4. Persistence

### 4.1 Structures (i386 gcc, little-endian; identical on x86_64)
`tiposave` (`funcoes_M.h:31-40`), **44 bytes**:

| Offset | Size | Field | Meaning |
|---|---|---|---|
| 0 | 1 | `bool empty` | 1 = unused slot ("new") |
| 1 | 3 | padding | garbage |
| 4 | 4 | `int pts` | cumulative score of wins |
| 8 | 15 | `char nome[15]` | NUL-terminated, ≤12 chars from UI; bytes after NUL are garbage |
| 23 | 1 | padding | |
| 24 | 4 | `int level` | difficulty 1..4 (EASY, NORMAL, HARD, GODMODE), **never read** by gameplay |
| 28 | 4 | `int planeta_liberado` | highest unlocked planet index (0..4) |
| 32 | 4 | `int planeta_atual` | planet cursor (0..4) |
| 36 | 6 | `bool tiro_liberado[6]` | unlocked weapons; [0] is always 1 |
| 42 | 2 | padding | |

`tiporecorde` (`funcoes_M.h:25-29`), **20 bytes**: `char nome[15]` at 0, 1 byte padding, `int pts` at 16.

Files are relative to the CWD: `./dados/saves.x85` (3×44 = **132 B**) and `./dados/recs.x85` (7×20 = **140 B**). Both are raw `fwrite` of the arrays with no header, version, or checksum.

### 4.2 Operations (`funcoes_M.cpp`)
| Function | Behaviour | Ref |
|---|---|---|
| `menu_recordes_default()` | Writes 7 records: Matheus 9000, Argus 8000, chucknorris 3000, magaiver 2000, loser 1000, bill 600, noob 500 | `:139-163` |
| `menu_recordes_insere(pts, name)` | Reads 7 records (no NULL check: crashes if the file is missing). Finds the first i with `pts >= rec[i].pts` (ties go **above** existing entries), shifts down, drops the 7th. **It overwrites the caller's `name` buffer** (`saveAtual.nome`) with displaced names during the shift; this is masked by the following `loadslot`. **If pts is below all 7, it calls `fwrite`/`fclose` on the already-closed read handle (use-after-free and double `fclose`), probably a glibc abort.** Reachable: with the current file (min 81 900), a new player winning fase1 with fewer total points would trigger it. | `:165-201` |
| `menu_saves_default()` | Truncates `saves.x85`, then calls `menu_saves_edit(i,"new",EASY,true)` for i = 0, 1, 2. The first call reads 0 records, so the uninitialised stack goes into the other slots, but every field is then overwritten except padding and post-NUL name bytes. | `:203-209` |
| `menu_saves_carregavetor(v)` | `fread` 3 slots (no NULL check) | `:211-217` |
| `menu_saves_saveslot(slot)` | Writes `planeta_liberado`, `pts`, `planeta_atual`, and `tiro_liberado` from `saveAtual` into `slot`. Does **not** write `nome`, `level`, or `empty`. | `:219-235` |
| `menu_saves_loadslot(slot)` | Copies `planeta_liberado`, `pts`, `planeta_atual`, `tiro_liberado`, and `nome` into `saveAtual`. Does **not** copy `level` or `empty`. | `:237-247` |
| `menu_saves_edit(slot,nome,level,empty)` | `sprintf(nome)` (format-string use; harmless with a–z), sets level, zeroes `planeta_liberado`, `planeta_atual` and `pts`, sets `tiro_liberado={1,0,0,0,0,0}`, sets `empty`, writes all 3 slots | `:249-271` |

When saves happen: only on a phase win (§3.12) and on slot create/delete/clear. Picking a planet in MISSION is not saved.

### 4.3 Current file contents (decoded with `spec_inspect.py saves`)
`saves.x85` (132 B):

| Slot | empty | pts | nome | level | planeta_liberado | planeta_atual | tiro_liberado |
|---|---|---|---|---|---|---|---|
| 0 | 0 | 134500 | `argus` | 1 (EASY) | 4 | 3 | 1,1,1,1,1,0 |
| 1 | 1 | 0 | `new` | 1 | 0 | 0 | 1,0,0,0,0,0 |
| 2 | 1 | 0 | `new` | 1 | 0 | 0 | 1,0,0,0,0,0 |

`recs.x85` (140 B), in rank order: argus 195210, argus 175510, argus 134500, argus 119610, argus 104700, argus 86010, argus 81900. Bytes after the NUL contain leftovers such as "s\0ris\0" from earlier names, which confirms the strcpy shifting.
**Port recommendation:** ship the factory defaults (records from `menu_recordes_default`, 3 "new" slots), not these dev files. Optionally offer an import of the 132/140-byte blobs. Store in `localStorage` as JSON, keeping the same field semantics.

---

## 5. Audio

| Id var | File | Real format | Duration | Loaded at | Played when | API / pan |
|---|---|---|---|---|---|---|
| `music_menu` | `sons/recharge_alvys18.ogg` | Ogg Vorbis 44.1k stereo | 123.8 s | `menu.cpp:99` | at startup (`menu.cpp:102`) and after every game (`main.cpp:60`); loops, restarts | music |
| `music_jogo` | `sons/progression_sasquamox.ogg` | Ogg Vorbis | 215.6 s | `menu.cpp:98` | entering TELA_JOGO, before the loading screen (`main.cpp:58`); loops | music |
| `sombot` | `sons/click.ogg` | **actually WAV** PCM 16-bit stereo 44.1k | 0.50 s | `menu.cpp:95` | main buttons 1–4, back buttons, mission select OK | `TocaEfeito(…,0)` centre |
| `sombot2` | `sons/zoop.ogg` | **actually WAV** | 1.10 s | `menu.cpp:96` | planet left/right; FX volume value change | centre |
| `acess` | `sons/acess.wav` | WAV mono 22.05k | 1.56 s | `menu.cpp:97` | locked planet selected; empty name on difficulty click | centre |
| `somExplo` | `sons/explo.wav` | WAV stereo 44.1k | 1.55 s | `jogo.cpp:107` | enemy/boss death | `TocaEfeitoTela(…, marca.x)` |
| `somTiro[TIRO1]` | `sons/tiro1.wav` | WAV | 0.054 s | `jogo.cpp:108` | every TIRO1 shot | pan by `jogador.x` |
| `somTiro[TIRO2]` | `sons/tiro2.wav` | WAV | 0.070 s | `jogo.cpp:109` | every TIRO2 shot | pan by `jogador.x` |
| `somTiro[BOMBA1]` | `sons/bomba.wav` | WAV mono 22.05k | 3.09 s | `jogo.cpp:112` | bomb | pan by `jogador.x` |
| — | `sons/tiro3.wav` | WAV mono 11.025k | 0.14 s | **never loaded** | — | — |

- TIRO3–TIRO6 are silent: `somTiro[3..6]` are 0, and the TIRO4/TIRO6 loads are commented out (`jogo.cpp:110-111`).
- No sound plays on: player death, item pickup, weapon switch, hover, exit, slot click, delete, mute, clear.
- Volume: `volume_music = volume_effects = 30` initially (`funcoes_M.cpp:10`). The range is 0–100, mapped linearly to SDL 0–128. It is changed only in OPTIONS (slider or mute) and is not persisted. The effects volume applies globally to all channels, including sounds already playing.
- Channel cap: 8 simultaneous effects; extras are silently dropped. Explosions and bombs are long, so in heavy fights later sounds drop. *Port: emulate the 8-voice cap for fidelity.*
- Pan model for the web: `gainL = ((100-p)*254/200)/255`, `gainR = ((100+p)*254/200)/255`, `p = 200*clamp(x,0,800)/800 - 100`. The centre is ≈0.498 per side.

---

## 6. Asset usage table (`X85-devcore 2/dados/`)

Frame grid is "image size / frame size". "Mask notes" summarises the collision-solid analysis. "alpha0-solid" means pixels with alpha=0 but RGB≠0, which count as solid.

| Asset | Loaded at | Frame w×h (image) | Frames | Used for | Mask notes |
|---|---|---|---|---|---|
| menu/x85.jpg | `main.cpp:14` | 0,0 (177×38) | 1 | splash at (312,270) | — |
| menu/cursor.png | `menu.cpp:55` | 40×40 (80×40) | 2 | f0 arrow drawn at mouse; f1 = hotspot | f1 is a single pixel at (8,6) |
| menu/fundo.jpg | `menu.cpp:56` | 0,0 (800×600) | 1 | scrolling menu bg, fade layer | — |
| menu/cover.png | `menu.cpp:57` | 0,0 (800×600) | 1 | top/bottom chrome over everything | — |
| menu/darkback.png | `menu.cpp:58` | 0,0 | 1 | dark panel (slot, options, ranking, about) | — |
| menu/botmain.png | `menu.cpp:61` | 262×62 (262×124) | 2 | main & slot buttons | solid full rect |
| menu/botback.png | `menu.cpp:62` | 65×445 (130×445) | 2 | back button at (8,94) | solid (1..62, 1..443) |
| menu/menutxt.png | `menu.cpp:63` | 0,0 | 1 | main-menu labels | — |
| menu/otherbots.png | `menu.cpp:65` | 220×35 (220×70) | 2 | difficulty / options buttons | |
| menu/botdelslot.png | `menu.cpp:68` | 62×62 (62×124) | 2 | erase-slot ✕ | |
| menu/slotloadcover.png | `menu.cpp:69` | 0,0 | 1 | slot select overlay | |
| menu/slotinsertcover.png | `menu.cpp:70` | 0,0 | 1 | name entry overlay | |
| menu/slotback.png | `menu.cpp:71` | 0,0 | 1 | slot panel | |
| menu/logo.png | `menu.cpp:75` (`:74` commented 150×150) | 128×128 (512×384) | 12 | planets 0–7, locked = 8, 9–11 empty | |
| menu/select.png | `menu.cpp:76` | 180×180 (360×180) | 2 | planet select box | |
| menu/botplanetas.png | `menu.cpp:77` | 110×70 (220×140) | 4 | ◀ (0/1), ▶ (2/3) | |
| menu/red.png | `menu.cpp:78` | 0,0 (800×600 RGB) | 1 | red "denied" flash | |
| menu/volume.png | `menu.cpp:81` | 65×190 (260×190) | 4 | slider track, fill, knob, knob-hl | knob solid rows 80–111 |
| menu/optionscover.png | `menu.cpp:82` | 0,0 | 1 | options panel | |
| menu/about1.png, about2.png | `menu.cpp:85-86` | 0,0 (534×401) | 1 each | credits text + pulsing glow | |
| menu/trofeus.png | `menu.cpp:89` | 50×50 (150×50) | 3 | gold/silver/bronze | |
| menu/recordstab.png | `menu.cpp:90` | 486×52 (486×156) | 3 | header / top-3 / other rows | |
| menu/512.png | `menu.cpp:93` (font) and `jogo.cpp:102` (same id) | 32×32 (512×512) | 256 | the only font | metrics via `spec_inspect.py font` |
| jogo/loading.jpg | `jogo.cpp:41` | 0,0 (800×600) | 1 | loading screen | — |
| jogo/ready.png | `jogo.cpp:42` | 0,0 (441×68) | 1 | "press space" at (180,440) | |
| jogo/mapas/fase1..5.fmp | `jogo.cpp:49-53` | — | — | spawn markers only | see §3.3 |
| jogo/mapas/tileset.png | `jogo.cpp:49-56` (map sprite set, 32×32 from MPHD) | 32×32 (256×160) | 40 | **loaded, never drawn** | |
| jogo/fundo1.jpg | `jogo.cpp:59` | 0,0 (800×600) | 1 | game bg (all phases) | |
| jogo/nave.png | `jogo.cpp:60` | 60×60 (120×60) | 2 | ship (f1 unused INVUNERAVEL) | 71 alpha0-solid px |
| jogo/flame.png | `jogo.cpp:61` | 40×40 (200×200) | 25 | engine flame, frames 1–24 | never collides |
| jogo/explo.png | `jogo.cpp:62` | 0,0 (200×200) | 1 | explosion | — |
| jogo/tiros/tiro1..6.png | `jogo.cpp:64-69` | 0,0 (15×15, 30×15, 30×30, 30×30, 80×80, 15×30) | 1 | player shots | tiro1/3/4/6 masks are the full rect (alpha0-solid) |
| jogo/tiros/bomba.png | `jogo.cpp:70` | 0,0 (800×600 RGB) | 1 | bomb flash and hitbox | fully solid |
| jogo/tiros/tiroini1..3.png | `jogo.cpp:71-73` | 0,0 (8×8) | 1 | enemy shots | full 8×8 |
| jogo/inimigos/inim1..4.png | `jogo.cpp:75-78` | 0,0 (45×45, 35×35, 45×62, 45×57) | 1 | enemies | |
| jogo/inimigos/meteoro.png | `jogo.cpp:79` | 75×75 (150×75) | 2 | meteor (frame 1 unused) | 163 alpha0-solid px |
| jogo/inimigos/boss1..5.png | `jogo.cpp:80-84` | 0,0 (140×120, 120×120, 150×140, 145×120, 60×60) | 1 | bosses | boss2/3/4 have 96/127/252 alpha0-solid px |
| jogo/itens/T1..T6.png | `jogo.cpp:88-93` | 0,0 (40×40) | 1 | items and HUD weapon icons | full rect |
| jogo/barras_energy.png | `jogo.cpp:96` | 0,0 (16×586) | 1 | energy bar | |
| jogo/barras_bomba.png | `jogo.cpp:97` | 0,0 (25×25) | 1 | bomb icon | |
| jogo/barras_back.png | `jogo.cpp:98` | 0,0 (800×600) | 1 | HUD frame | |
| jogo/barra_inf.png | `jogo.cpp:99` | 0,0 (400×63) | 1 | weapon info box | |
| sons/* | see §5 | | | | |
| saves.x85, recs.x85 | §4 | | | | |

**Never referenced:** `dados/sons/tiro3.wav`. All other files in `dados/` are used.
**Referenced but missing:**
- `dados/jogo/mapas/fase6.fmp`, `fase7.fmp`, `fase8.fmp` (`jogo.cpp:54-56`; unreachable).
- `./dados/jogo/inim.png` (commented out, `jogo.cpp:86-87`, for ENERGIA/ESCUDO pickups).

The `.ogg` extension on `click`/`zoop` hides WAV data. Re-encode or rename for the web.

---

## 7. Known bugs, quirks, dead code, and judgment on intent

| # | Issue | Ref | Effect in shipped build | Likely intent / port recommendation |
|---|---|---|---|---|
| 1 | Player `energia = 10000`, `n_bombas = 50` | `funcoes_J.cpp:99,102` | The player is near-invincible, the energy bar is meaningless (fills, then overflows off-screen), and only ~5 of 50 bomb icons are visible | **100 HP / 5 bombs** (Jun-2010 devcore values; the bar maths `*586/100` and the 5-icon layout confirm it). **User decision:** debug values or intended values. Suggest intended values by default, debug values as a toggle. |
| 2 | Enemy shots never expire (`&& tipo < BOMBA1` excludes them) | `funcoes_J.cpp:259` | The shared 300-slot pool slowly fills with off-screen enemy bullets. In long fights the **player's gun can stop firing**. | Despawn at `y > 700`. **User decision** (faithful vs fixed). |
| 3 | INIMIGO3 death does `score += 400` on the pointer | `funcoes_J.cpp:489` (binary: `addl $0x640,0x20(%ebp)`) | Kill worth 0. Later kills in the same frame write to `&temp_pts+1600 B`, which lands above `jogo_tela`'s frame (temp_pts is at ebp−0x2c), so it is harmless in practice | +400 |
| 4 | `menu_recordes_insere` writes to the closed FILE* when the score is below all records | `funcoes_M.cpp:170-200` | Use-after-free and double `fclose`: probable crash on a low-scoring win | Don't insert |
| 5 | `menu_recordes_insere` clobbers `saveAtual.nome` | `funcoes_M.cpp:194` | Masked by the following `loadslot` | Use a copy |
| 6 | Records get cumulative totals on every win | `jogo.cpp:213-215` | One player can fill the board | Keep (faithful), or insert once per total |
| 7 | Difficulty `level` (EASY/NORMAL/HARD/GOD MODE) is stored but never used; `loadslot` doesn't load it | `menu.cpp:717-772`, `funcoes_M.cpp:237-247` | All difficulties play identically | Unfinished. Port: keep UI as-is (no effect) unless the user wants a design. |
| 8 | INIMIGO4 contact does nothing | `funcoes_J.cpp:781` | It passes through the player harmlessly | Probably an oversight (should be −50 and destroyed?). Keep as-is. |
| 9 | Enemy-shot vs player test needs some active mark | `funcoes_J.cpp:700,743` | Bullets are harmless during lulls | Oversight; keep for fidelity, or fix |
| 10 | Collision uses the native image at the shot's (x,y), but TIRO3–6 are drawn centred and scaled | `jogo.cpp:308-315` vs `funcoes_J.cpp:704` | Hitboxes offset right/down | Keep (it defines the feel) |
| 11 | Alpha-0-but-coloured pixels count as solid | engine | Several masks are full rectangles (tiro1, T-items, enemy shots…) | Keep. Precompute masks from raw PNGs. |
| 12 | Bomb is drawn under enemies and HUD | `jogo.cpp:316-333` | — | Keep |
| 13 | Boss pointer NULL if a map lacks M_BOSS | `jogo.cpp:163,202` | Crash | Guard |
| 14 | `angulo` wraps 360 rad → 0 | `funcoes_J.cpp:438,502,552…` | Orbit jumps after ~56 s | Keep |
| 15 | Left planets ×2 bigger | `funcoes_M.cpp:116` | Large faded planet at left | Keep |
| 16 | Ready screen drawn without a clear before the swap loop | `jogo.cpp:116-123` | Flicker on some drivers | Render loading + ready stably |
| 17 | First game frame fires (Space edge carried over) | `jogo.cpp:121` | One free shot | Keep or ignore |
| 18 | Esc from the game skips `loadslot` | `jogo.cpp:199-200` | Unlocks from the aborted run stay in RAM (until the next slot load) and `planeta_atual` stays | Keep |
| 19 | Window close ignored | engine `C2D2_ENCERRA` | — | N/A for web |
| 20 | `menu_ranking` never `fclose`s | `menu.cpp:344-350` | Handle leak | N/A |
| 21 | `menu_mission` mallocs planets each entry | `menu.cpp:226-227` | Leak | N/A |
| 22 | `rand()` unseeded | — | Deterministic stars and boss patterns per launch | Optional glibc emulation |
| 23 | Weapon cycle reads `tiro_liberado[-1]` | `jogo.cpp:231-232` | Benign (byte is 0) | "previous unlocked, wrap" |
| 24 | Dying enemy still fires one shot that frame | `funcoes_J.cpp:441-453` etc. | — | Keep |
| 25 | T1 has no pickup, movement, or map presence | `funcoes_J.cpp:683-687,793` | — | Dead |

Dead or commented code:
- `BOLA` marker; `INVUNERAVEL` type and nave frame 1; `Nave.escudo`.
- `spMarca[ENERGIA]`/`[ESCUDO]` pickups (`jogo.cpp:86-87`; the constants no longer exist).
- `somTiro[TIRO4]`/`[TIRO6]` (`jogo.cpp:110-111`).
- Mouse steering (`funcoes_J.cpp:43-44`).
- Key `2` forward weapon cycle (`jogo.cpp:236-240`).
- Score-per-hit formula (`funcoes_J.cpp:738-740`).
- Fullscreen and reset-all buttons (`menu.cpp:499-511`).
- Planet name labels (`menu.cpp:216,321-324`).
- Alpha fade on TIRO3/TIRO4 (`funcoes_J.cpp:270-271,278-279`).
- Map layer velocity and `fase.xfinal`/`yfinal`.
- `fase6-8` (would need `planeta_max = 8` as in devcore, `X85-devcore/funcoes_M.cpp:5`, plus `planeta_liberado < 7` and BOSS cases 5–7).
- 8 planet graphics exist in `logo.png`.

---

## 8. Globals whose initial value matters

| Global | Initial | Ref | Why it matters |
|---|---|---|---|
| `estado_atual` | 0 (= TELA_MAIN), then set explicitly | `funcoes_M.cpp:4`, `main.cpp:27` | first screen |
| `planeta_max` | **5** | `funcoes_M.cpp:5` | number of planets, nav limit |
| `saveAtual` | all zero until a slot loads | `funcoes_M.cpp:7` | |
| `slotAtual` | 0 | `funcoes_M.cpp:8` | |
| `volume_effects`, `volume_music` | **30, 30** | `funcoes_M.cpp:10` | not persisted |
| `encerra`, `fadealpha`, `fadecontrol` | 0, 0, false | `funcoes_M.cpp:12-14` | first screen appears without a fade-in |
| `yfundo1`, `yfundo2`, `redAlpha` (menu) | 0, 0, 0 | `menu.cpp:4-6` | shared across screens |
| `fase` (global `Fase`) | zero | `jogo.cpp:11` | stale `yinicio` passed to `PosicionaMapa` (harmless) |
| `spTiro[30]`, `spMarca[40]`, `somTiro[10]` | zero | `jogo.cpp:17-18,30` | unloaded slots are id 0, so draw/sound are no-ops (TIRO3–6 silent) |
| `static int velocidade` (atualiza_jogador) | 15 | `funcoes_J.cpp:40` | movement step |
| `jogo_tela` locals | `quadroFlame=24`, `altura_energia=0`, `informacao=-1`, `contadorfinal=0`, `temp_pts=0` | `jogo.cpp:128-142` | |
| CA2 volumes | 100/100 at init, then 30/30 | `chienaudio2.cpp:32-33,100` | |
| `C2D2GL_Sincroniza::tempoAnterior` | 0 | `chien2d2_gl.cpp:238` | first frame doesn't wait |

---

## 9. Gaps & decisions needed

1. **Debug vs intended tuning** (energy 10000 vs 100, bombs 50 vs 5). The shipped binary uses the debug values. Needs a user decision.
2. **Enemy-bullet pool leak**: reproduce it (with possible gun lock-up) or despawn bullets off-screen?
3. **Crash paths** (record insert below the 7th place, NULL boss): the port must not crash. Recommend "no insert" and a guard.
4. **INIMIGO3 zero score, INIMIGO4 no contact damage, harmless bullets during lulls**: keep or fix?
5. **Difficulty selector has no effect**: keep it cosmetic, or design difficulty scaling?
6. **Exact frame rate**: 60 Hz (vsync) vs 62.5 Hz (16 ms sleep). This cannot be resolved from source; it depends on the 2010 driver. Recommend 60 Hz.
7. **Ready-screen appearance** depends on the GL driver's swap behaviour. Recommend loading.jpg + ready.png stable.
8. Bit-exact RNG and x87 float behaviour (orbit positions could differ by ±1 px). Low priority. Only matters if replays or the star layout must match.
9. Whether to ship the dev `saves.x85`/`recs.x85` (argus) or factory defaults. Recommend defaults.
