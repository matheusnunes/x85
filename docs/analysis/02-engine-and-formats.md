# 02 — Chien2D 2 engine semantics, Mappy FMP format, and the web "engine shim"

Target: **`X85-devcore 2/`** (the newest version). Everything under the version folders was read only.
File:line references point at `X85-devcore 2/` unless marked `dc:` (= `X85-devcore/`) or `beta:` (= `betaversion/`).
Sources are ISO-8859-1 (some UTF-8) with CRLF line endings. Line numbers are counted the usual way (one per LF).

Tools written for this report (all in `docs/analysis/tools/`, run them with `python3 -I`, and they need Pillow 12.3 for the PNGs):

| script | purpose |
|---|---|
| `fmp_dump.py` | An FMP parser that walks the file the same way `chien2d2mapa.cpp` does. It prints a text report, exports JSON and renders PNG previews. `--batch ROOT OUTDIR` runs it on all 15 maps. It is a superset of the earlier minimal `fmp_dump.py` that was already in this folder, and the old CLI (`fmp_dump.py file.fmp …`) still works. |
| `c2d2_mask_audit.py` | For every sprite sheet the game loads, it reports the frame grid, the padded GL texture size, the GL mask-index bug, and the pixels that count as solid in collision masks. |
| `c2d2_font_metrics.py` | Computes the per-glyph offsets and widths the way `C2D2_CarregaFonte` does. Output: `out/font-512.json`. |

Outputs are in `docs/analysis/tools/out/`:
- `<version>-<map>.json` (15 files)
- `<version>-<map>.png`: previews at 50 % scale with a grid line every 5 rows
- `compat-devcore-fase{6,7,8}-with-devcore2-tileset.png`
- `bgfx-*.png`: the tile graphics embedded in the FMPs
- `font-512.json`

---

## 0. Build and runtime facts that matter for fidelity

- The engine is byte-identical in `X85-devcore` and `X85-devcore 2` (every `chien2d2*`/`chienaudio2*` file passes `cmp`). `betaversion` has an older engine with only cosmetic differences (2048 max-texture test, enum order of `C2D2_BACKSPACE`, `bool` vs `int` return type of `C2D2_ColidiuSprites`).
- The shipped binary `bin/Release/X85-devcore` is an **ELF 32-bit i386 Linux** executable built with gcc `-O3` against SDL 1.2, SDL_image, SDL_mixer and GL/GLU (`X85-devcore.cbp`). Consequences:
  - `long` is 4 bytes.
  - Byte order is little-endian, the same as the maps (`lsb=1`), so no byte swapping happens.
  - `rand()` is **glibc** `rand()`, and it is never seeded: there is no `srand` anywhere. The star field (`funcoes_J.cpp:15-33`) and the boss shot choices (`funcoes_J.cpp:611, 642, 670`) therefore follow glibc's default seed-1 sequence: 1804289383, 846930886, 1681692777, …. A bit-exact port needs a JS implementation of glibc's TYPE_3 additive generator (`random_r`), not `Math.random`.
- Renderer: `main.cpp:6` calls `C2D2_Inicia(800, 600, C2D2_JANELA, C2D2_DESENHO_OPENGL, "X85")`. That means an **OpenGL** backend in an 800×600 window. Everything below describes the GL path, and §8 lists how the SDL path differs.

## 1. Init and the main-loop contract

- `C2D2_Inicia` (`chien2d2.cpp:65-86`) fills a table of function pointers from either the GL or the SDL backend.
- `C2D2GL_Inicia` (`chien2d2_gl.cpp:61-196`) does the following:
  - Creates `SDL_SetVideoMode(800,600,32,SDL_OPENGL)` with RGBA8, a 16-bit depth buffer, double buffering and `SDL_GL_SWAP_CONTROL=1`, so vsync is requested (`:107-115`).
  - Does **not** request a stencil buffer (no `SDL_GL_STENCIL_SIZE`). See clipping in §3.
  - Sets `glOrtho(0,800,600,0,-1,1)`, which gives a top-left origin with y pointing down at 1 unit = 1 px (`:148`). Depth and culling are disabled (`:142-143`).
  - Requires `GL_MAX_TEXTURE_SIZE ≥ 1024` (`:163-169`).
  - Hides the OS cursor with `SDL_ShowCursor(SDL_DISABLE)` (`:179`). The game draws its own cursor sprite (`menu.cpp:159`), so the web page needs `cursor: none` on the canvas.
- Other subsystems are started in `main.cpp:20-23`, in this order: `C2D2P_Inicia`, `CA2_Inicia`, `C2D2M_Inicia`, then `CA2_AjustaVolume(volume_music=30, volume_effects=30)` (`funcoes_M.cpp:10`).
- **The game has no central loop.** Every screen runs its own `while(!encerra){ logic; C2D2_LimpaTela(); draw…; C2D2_Sincroniza(); }`. For example, `jogo.cpp:194-360` runs logic first (`:196-278`), then `C2D2_LimpaTela` (`:284`), then the draws, then `C2D2_Sincroniza` (`:358`). Sincroniza is also where input gets polled. A JS port should turn each loop body into a `step()` that runs once per tick.
- **Single-buffer persistence trick.** `jogo_carrega` (`jogo.cpp:41-45, 116-123`) draws `loading.jpg` and calls Sincroniza. It then draws `ready.png` onto the *back* buffer and spins on `C2D2_Sincroniza()` without redrawing until Space is pressed. With GL double buffering the content of the alternate buffer is undefined, so depending on the driver this flickers or shows loading+ready. The intended image is **loading.jpg with ready.png at (180,440)**, and the port should keep that composite on screen. The splash in `main.cpp:14-17` works the same way.

## 2. Sprite sets (`C2D2_CarregaSpriteSet`, GL: `chien2d2_gl.cpp:353-543`)

- **Ids and caching.** The return value is a 1-based id, and 0 means failure. Loading the same path string again returns the same id and increments a reference count (`:356-362`, `chien2d2.cpp:93-106`). The cache key is the exact path string.
- **Slicing.**
  - If `largura!=0 && altura!=0`, frames are `largura×altura`, `matrizX = imgW/largura` and `matrizY = imgH/altura`, using integer division (`:402-420`).
  - If either argument is 0, the **whole image is one frame** (`:421-427`).
  - The GL validity test has a bug: it uses `&&` (`imgW%w!=0 && imgH%h!=0`, `:404`). A sheet is only rejected when *both* dimensions are non-multiples, and any partial trailing row or column is silently ignored. The SDL backend rejects a sheet if *either* dimension is a non-multiple (`chien2d2_sdl.cpp:293`). Every X85 sheet divides evenly (see `c2d2_mask_audit.py`).
- **Frame index order.** Frames are row-major: `col = i % matrizX`, `row = i / matrizX`, and the source rect is `(col*w, row*h, w, h)` (`:618-619`). An out-of-range index or id 0 makes the call return `false` and draw nothing (`:611-616`).
- **Texture upload.** If the image is not a square power of two between 16 and 1024 in RGBA32, it is copied into the top-left of a zero-filled square POT RGBA surface of size `nextPOT(max(w,h))` (`:430-495`). Images larger than 1024 are rejected (`:452-459`).
  - 24-bit JPGs are blitted, so their alpha becomes 255.
  - RGBA PNGs are `memcpy`'d, so their alpha is preserved.
  - Afterwards **every pixel exactly equal to opaque magenta (255,0,255,255) is set to 0**, i.e. fully transparent black (`:502`, `MagentaParaPontoTransparente` `:810-832`). In X85, only `tileset.png` contains magenta (6320 px), and it is never drawn. JPG compression artifacts mean JPG "magenta" is never exact.
- **Texture parameters.** `GL_CLAMP` wrap and `GL_LINEAR` min/mag filtering (`:527-531`, re-applied on every draw at `:635-636`). There are no mipmaps.
- **Collision masks** are built at load time from the *padded* surface (`:504-515`). See §6.

## 3. Drawing

- **`C2D2_DesenhaSprite(id, frame, x, y)`** (`:608-655`) draws one textured `GL_QUAD` at integer screen position `(x,y)`, which is the **top-left corner**. The size is exactly `spLargura×spAltura` and there is no scaling. The vertex color is (255,255,255,255) and blending is `glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)` with straight (non-premultiplied) alpha (`:632-633`). At a 1:1 scale on integer coordinates, GL_LINEAR samples texel centers exactly, so the result is pixel-identical to nearest-neighbour. In Canvas2D this is `drawImage(img, sx, sy, w, h, x, y, w, h)` with default `source-over`.
- **`C2D2_DesenhaSpriteEfeito(id, frame, x[4], y[4], r,g,b,a)`** (`:661-718`) draws the same sub-texture as two `GL_TRIANGLES`:
  - Triangles are (v0,v1,v2) and (v2,v3,v0), and corners map TL→v0, TR→v1, BR→v2, BL→v3.
  - The vertex color modulates the texture (the default `GL_MODULATE`), giving `out = tex * (r,g,b,a)/255`.
  - Bilinear filtering is used, and texture coordinates sit exactly on the frame borders, so neighbouring frames or padding can bleed in at the edges when scaled.
  - The game reaches this only through `XDesenhaSprite` (`funcoes_M.cpp:16-37`). That wrapper always passes axis-aligned rectangles `(posx,posy)…(posx+w,posy+h)` with **r=g=b=255** and an `int alpha` truncated to `Uint8`, so values wrap modulo 256.
  - Canvas2D equivalent: `globalAlpha = (alpha & 255)/255` with `imageSmoothingEnabled = true`, then `drawImage(…, posx, posy, w, h)`. No color tint is ever needed.
  - **Negative height is used** for a vertical flip. Examples: the energy bar `XDesenhaSprite(barras_energy,0,6,595,16,-altura*586/100,255)` at `jogo.cpp:345`, and the volume sliders at `menu.cpp:476, 482`. GL draws the texture's top row at `posy` and its bottom row at `posy+h` (above), with no culling, so the image appears upside-down and grows upward. Canvas normalizes negative sizes without flipping, so the shim must do `translate(x,y); scale(1,-1); drawImage(…,0,0,w,-h)`.
  - `w==0 || h==0` means "use the frame size".
  - The bomb uses `XDesenhaSprite(bomba, …, 800, 600, alpha)` to fade an 800×600 RGB image as a full-screen flash.
- **Draw order** is the order of the calls (painter's algorithm). There is no depth and no batching.
- **`C2D2_LimpaTela`** (`:257-279`) calls `glClear` and then fills the screen with an opaque quad in the clear color. The clear color defaults to black and `C2D2_TrocaCorLimpezaTela` is never called. It also resets the cached GL state.
- **Clipping.** `C2D2_LimitaAreaDesenho` uses the stencil buffer (`:296-330`), but no stencil bits were requested, so on most drivers it has no effect. X85 never calls it. The SDL backend uses `SDL_SetClipRect`.
- **Rotation or scaling APIs:** none, other than DesenhaSpriteEfeito's arbitrary quad.
- **Primitives** (`chien2d2primitivas_gl.cpp`): the only one X85 uses is **`C2D2P_Pontos(stars, 100, 200,200,200)`** at `jogo.cpp:289`. It draws `GL_POINTS` of size 1 (`:32-46, 55-63`) in RGB (200,200,200), opaque, with texturing off. The vertices sit on integer pixel corners, so the lit pixel is driver-dependent and is usually `(x, y-1)` because of the y-flipped ortho projection. In Canvas, `fillRect(x, y, 1, 1)` is good enough (±1 px).
  - Also available but unused: `C2D2P_Linha` (`GL_LINES`), `Retangulo` (`GL_LINE_LOOP`), `RetanguloPintado` (`GL_QUADS` from x1,y1 to x2,y2), and circles and ellipses.
  - `C2D2PGL_Inicia` returns `false` through `C2D2P_Inicia` (`chien2d2primitivas.cpp:21-33`, a missing `return true`). This is harmless because the return value is ignored.

## 4. Text and fonts (`chien2d2.cpp:175-465`)

- **`C2D2_CarregaFonte(file, size)`** loads the file as a sprite set with `size×size` frames. The image must be exactly `16*size` pixels square (`:221-228`). Glyph `c` is frame `(unsigned char)c`, laid out in a 16×16 grid in ASCII/Latin-1 order.
- X85 uses a single font, `dados/menu/512.png` at size 32 (512×512 RGBA). It is loaded at `menu.cpp:93` and `jogo.cpp:102`, and the second load returns the cached id.
- **Per-glyph metrics** (`:230-320`) are computed once at load time:
  - `desloc[c]` is the first column that contains a non-transparent pixel.
  - `larg[c]` is `firstAllTransparentColumnAfter - desloc + pad`, where pad is 2 for size 32. If no such column exists, it is `size - desloc`.
  - An empty glyph gets `larg = size` and `desloc = 0`. A space is `size/2 = 16`.
  - "Transparent" is the same test used for collision masks (exact RGBA 0, §6), so **semi-transparent anti-aliased pixels count as ink**.
  - Precomputed values for 512.png are in `out/font-512.json`. Examples: 'A'=18, 'i'=11, ' '=16, '0'=17. `"pts: 000012345"` is 218 px wide.
- **`C2D2_DesenhaTexto(font, x, y, text, align)`** (`:371-436`):
  - `W = Σ larg`.
  - The pen starts at `x` for `C2D2_TEXTO_ESQUERDA` (=2), at `x-W` for `C2D2_TEXTO_DIREITA` (=1), and at `x-W/2` for `C2D2_TEXTO_CENTRALIZADO` (=0), with C integer division.
  - Each glyph is drawn with `C2D2_DesenhaSprite` at `(pen - desloc[c], y)`, after which `pen += larg[c]`.
  - `y` is the top of the 32-px cell. There is no kerning, no line breaks and no scaling.

## 5. Timing (`C2D2GL_Sincroniza`, `chien2d2_gl.cpp:235-251`)

```c
static Uint32 tempoAnterior=0;
int espera = 16 - SDL_GetTicks() + tempoAnterior;  if (espera>0) SDL_Delay(espera);
tempoAnterior = SDL_GetTicks();  SDL_GL_SwapBuffers();  C2D2_Entrada();
```

- There is a **minimum of 16 ms per frame** and no frame skipping, no delta time and no catch-up. If a frame is slow, the game simply runs slower.
- With vsync on a 60 Hz display the swap also blocks, giving 60 fps. Without vsync the rate is about 62.5 fps.
- All game speeds are expressed **per frame**. Examples: map scroll is 2 px/frame (`jogo.cpp:257`), the background moves 0.5 px/frame and the stars 1 px/frame.
- For the port: run a fixed-step loop at **60 Hz** on `requestAnimationFrame` with an accumulator, and run at most one logic step per Sincroniza call. If faithful slow-down is wanted, don't catch up after a hitch.
- `C2D2_TempoSistema()` (= `SDL_GetTicks`) is not used by the game.

## 6. Collision (`C2D2_ColidiuSprites`, `chien2d2.cpp:112-162`, `:716-1136`)

- **Masks** are 1 bit per pixel and built once per frame at load time (`C2D2_PreencheVetorBitMasks`, `:857-889`). A pixel is **transparent only if its 32-bit RGBA value is exactly 0x00000000**, or opaque magenta, which the GL loader has already zeroed (`PontoTransparente`, `:716-733`). As a result:
  - pixels with alpha=0 but non-zero RGB are **solid**: nave.png has 71, meteoro 163, boss4 252, flame 1896;
  - every partially transparent pixel is **solid**;
  - JPG-based sprites such as the full-screen `bomba.png` (RGB) are solid rectangles.
  - The port must build masks with exactly this rule, `(r|g|b|a) != 0`, **not** `alpha > 0` or `alpha > 128`.
- **Test.** `ColidiuSprites(id1,f1,x1,y1,id2,f2,x2,y2)` takes top-left positions and works on **frame size only**. Scaling done by `XDesenhaSprite` is ignored, so a growing `TIRO5` collides with its 80×80 load-size mask.
  - It first does a bounding-box reject with strict `>`, so sprites that just touch are not rejected at this stage (`:130-156`).
  - It then ANDs the overlapping mask rows 32 bits at a time (`C2D2_SobrepoeBitMasks`, `:896-1136`).
  - It returns −1 (truthy) on a hit and 0 otherwise.
- **Bugs a bit-exact port would inherit.** The cleanest approach is to translate `C2D2_SobrepoeBitMasks` line by line into JS with `Uint32Array` masks. Use `>>>` where the C code shifts a `Uint32` and `>>` where it shifts an `int` (`temp`, `vquada`).
  1. When combining two words, `temp` is a signed `int`, so `temp >> (32-bit)` sign-extends (`:1020-1024, 1047-1051`). If pixel 0 of the next word is solid, the high bits fill with 1s, which can produce false positives.
  2. In the full-word loop, mask B's first word is read at `quadb + l*ldwords` **without `+c`** (`:1035`). For overlap widths of 64 px or more, B's first word is reused. This affects the bomb against bosses and TIRO5 against bosses.
  3. The `c+1` reads can run past the row, or past the end of the mask on the last row, which is undefined in C. Treating them as 0 is fine.
  4. **GL mask-index bug.** Masks are laid out with the *padded texture* column count (`texW/frameW`), but they are indexed with `row*matrizX+col`, so frames on row 1 or below can get the wrong mask. Only `flame.png` and `botdelslot.png` are affected, and the game never collides with those frames. X85 collides only with frame 0 of single-frame or single-row sheets, plus frame 1 of `cursor.png`, which is on row 0. **No effect in X85.**
- **Game usage:**
  - `funcoes_M.cpp:47`: cursor frame 1 at the mouse position against a button frame, for menu hover and click.
  - `funcoes_J.cpp:704`: player shots against enemies.
  - `funcoes_J.cpp:744`: enemy shots against the player.
  - `funcoes_J.cpp:765`: enemies and items against the player.
  - All of these test frame 0 at the positions where the objects are drawn.
- The map-level helpers `C2D2M_ColidiuBlocoCenario`, `C2D2M_AjustaDeslocamento` (slope and ladder physics) and `C2D2M_CalculaQueda` are **not used**.

## 7. Input (`C2D2_Entrada`, `chien2d2.cpp:494-666`)

- **Keyboard state** is an array `C2D2_Botao teclas[C2D2_MAXTECLAS]`, returned by `C2D2_PegaTeclas()`. Each key has three flags:
  - `pressionado`: set on the frame of a KEYDOWN and cleared at the start of the next poll;
  - `ativo`: held;
  - `liberado`: set on the frame of a KEYUP and cleared at the start of the next poll.
- Events are processed **in order** during the poll that runs after the swap (`:519-534`). If a key goes down and up within the same frame, the press is **lost**: it ends with `pressionado=false, ativo=false, liberado=true`.
- SDL key repeat is off, so there are no repeated KEYDOWN events. The browser shim must ignore `KeyboardEvent.repeat` and queue events to apply them at the frame boundary.
- **Keys that exist** (`chien2d2.h:55-60`): the arrows, ESC, F1–F4, A–Z and 0–9 (`:615-620`, using the layout-mapped `SDLK_a..z`), ENTER, SPACE, BACKSPACE, LALT/RALT, LCTRL/RCTRL, LSHIFT/RSHIFT, plus `C2D2_ENCERRA`, which is set by window close and not read by X85.
- **Keys X85 reads:**
  - arrows: ship movement (`funcoes_J.cpp:49-56`) and planet selection (`menu.cpp:305-314`);
  - ESC;
  - SPACE: fire, which checks `pressionado||ativo` (`jogo.cpp:264`), and also "continue";
  - **LALT**: cycle weapon (`jogo.cpp:230`);
  - **LCTRL**: bomb (`jogo.cpp:270`);
  - A–Z, SPACE and BACKSPACE: name entry (`menu.cpp:664-693`).
  - Browser mapping: `AltLeft`, `ControlLeft`, `Space`, `Escape` and the arrow keys need `preventDefault()`. Alt and Ctrl clash with browser shortcuts, so consider offering alternative bindings while keeping the originals.
- **Mouse** is `C2D2_PegaMouse()` and gives `x,y` in window pixels plus 3 buttons (left, right, middle) with the same three flags. Position updates on motion and on button events. The shim must map CSS pixels to the 800×600 canvas when scaled. The left button `ativo` also fires (`jogo.cpp:264`).

## 8. GL vs SDL backend differences (in case someone toggles the renderer)

| aspect | GL (used) | SDL (`chien2d2_sdl.cpp`) |
|---|---|---|
| present | `SDL_GL_SwapBuffers`, vsync requested | `SDL_Flip`, HW double buffer (`:54, :166`) |
| transparency | magenta → RGBA 0, then per-pixel alpha | colorkey magenta + `SDL_DisplayFormatAlpha` (`:306-311`) |
| filtering | GL_LINEAR; same as nearest at 1:1, bilinear when scaled | none (blit) |
| `DesenhaSpriteEfeito` | works: quad, alpha, tint | **returns false, draws nothing** (`:434-438`), so every `XDesenhaSprite` (fades, shots, explosions, bars) would vanish |
| clip area | stencil, probably a no-op (no stencil bits) | `SDL_SetClipRect`, works |
| frame-size check | lax `&&` | strict `||` |
| texture limit | 1024² after POT padding | none |

Gameplay visuals depend on `DesenhaSpriteEfeito`, so **X85 only works correctly in GL mode**. The port should treat GL output as the reference.

## 9. Audio (`chienaudio2.cpp`, SDL_mixer)

- **`CA2_Inicia`** calls `Mix_OpenAudio(44100, AUDIO_S16SYS, 2, 2048)` (`:90`), giving about 46 ms of buffer latency. `Mix_AllocateChannels` is never called, so SDL_mixer's default of **8 effect channels** applies.
- **`CA2_AjustaVolume(music, effects)`** takes values on a **0–100 scale**, clamped to 100. They map linearly to SDL's 0–128: `Mix_Volume(-1, v*128/100)` and `Mix_VolumeMusic(v*128/100)`, using integer math (`:149-170`). The equivalent gain is `floor(v*128/100)/128`. The game starts at 30/30 (`main.cpp:23`, `funcoes_M.cpp:10`) and the options screen changes the values (`menu.cpp:529`).
- **Effects** are loaded with `CA2_CarregaEfeito`, which wraps `Mix_LoadWAV`, caches by path and supports WAV and OGG.
  - `CA2_TocaEfeito(id, pan)` (`:279-302`) clamps `pan` to [−100, 100], computes `L=(100-pan)*254/200` and `R=(100+pan)*254/200`, then calls `Mix_PlayChannel(-1, chunk, 0)` (play once, first free channel) followed by `Mix_SetPanning(ch, L, R)`.
  - **When all 8 channels are busy the new sound is dropped**: PlayChannel returns −1 and SetPanning(−1) fails harmlessly. Nothing is stolen.
  - SDL_mixer's panning scales the left and right samples by L/255 and R/255. **Centered sounds therefore play at ≈0.498 gain on each side** (127/255). This is −6 dB compared with an unpanned sound, so don't use `StereoPannerNode`. Use a ChannelSplitter feeding two gains of `L/255` and `R/255`.
  - `CA2_TocaEfeitoTela(id, x)` (`:310-335`) clamps `x` to [0, 800] (`lTela = screen->w`), sets `pan = 200*x/800 - 100`, then does the same as above.
- **Music.** `CA2_CarregaMusica` wraps `Mix_LoadMUS` and is used with two OGG files. `CA2_TocaMusica(id, -1)` calls `Mix_PlayMusic(m, -1)`: it **stops the current music, restarts from 0 and loops forever**. The game calls it at `menu.cpp:102` and at `main.cpp:58` and `:60` (game music on entering a level, menu music on returning).
- **Effects the game actually plays:**
  - menu: `click.ogg`, `zoop.ogg`, `acess.wav`;
  - game: `explo.wav`, `tiro1.wav`, `tiro2.wav`, `bomba.wav`.
  - `somTiro[TIRO3..TIRO6]` are **never loaded** (`jogo.cpp:107-112`), so they are id 0, `CA2_TocaEfeitoTela(0, …)` returns 0, and **weapons 3–6 fire silently**. Keep that for fidelity.

## 10. Mappy FMP format as implemented (`chien2d2mapa.cpp`)

### 10.1 Container and chunks

- **Header.** Bytes 0–3 are `"FORM"`. Bytes 4–7 hold the FORM size as big-endian u32, and the total file length is that value + 8. Bytes 8–11 are `"FMAP"` (`:149-158`, `:1380-1401`).
- **Chunks** start at offset 12 and continue while `offset < FORMsize+8` (`:168`). Each is a 4-char id, a **big-endian u32** size, then the payload. There is no padding.
- `C2D2M_TipoBloco` (`:1408-1453`) recognizes only these ids:

| id | engine action |
|---|---|
| `MPHD` | Struct overlay of `MPHD` (`chien2d2mapa.h:59-80`): `s8 verhi, s8 verlo, s8 lsb, s8 maptype, s16 mapwidth, s16 mapheight, s16 res1, s16 res2, s16 blockwidth, s16 blockheight, s16 blockdepth, s16 blockstrsize, s16 numblockstr, s16 numblockgfx, u8 ckey8, ckeyR, ckeyG, ckeyB, s16 gapx, gapy, staggerx, staggery, clickmask, pillars`. **Only width, height, blockwidth and blockheight are kept** (`:191-205`). They are byte-swapped if `lsb` differs from the host. |
| `BODY` | Layer 0: `w*h` int16 values, row-major (`:209-220`). |
| `LYR?` | Matched on the first 3 chars only. Layer number = 4th char − `'0'`, with no bounds check (`:222-235`). |
| `ANDT` | Animations: 16-byte `ANISTR` records read **backwards from the chunk end** until `antype == -1`. The rest at the start is an array of `long` frame values (`:237-269`). |
| anything else | Skipped. In X85 files that is `ATHR`, `EDHD`, `EPHD`, `CMAP`, `BKDT` and `BGFX`. |

- **MPHD must come before BODY/LYR**, because the layer buffer size comes from it. All X85 files satisfy this.
- **The engine ignores BKDT (block structures) and BGFX (embedded tile graphics).** A cell value `v > 0` means **frame `v-1` of the external tileset PNG** that was passed to `C2D2M_CarregaMapaMappy(map, tileset)`. The tileset is loaded with `C2D2_CarregaSpriteSet(tileset, blockW, blockH)` (`:285`), and if that load fails the map load fails too (`:287-291`).
- `v == 0` is empty and never drawn (`:553`). `v < 0` is an animated block whose frame is `seq[anistr[-v].ancuroff]` (`:548-551`).
- This direct mapping holds for these files: they are FMP 1.0 with `maptype=1`, and **`BKDT[k].bgoff == k` for every block** (verified by `fmp_dump.py`). BGFX block k corresponds to tileset frame k−1, and block 0 is Mappy's blank block.
- **Up to 8 layers** (`C2D2M_MAX_CAMADAS`), up to 32 maps, 256 ANISTR and 2048 animation-sequence entries.

### 10.2 Markers ("marcas")

- `C2D2M_CamadaMarcas(map, layer, offbloco)` (`:445-459`) picks the marker layer and offset.
- `C2D2M_PrimeiroBlocoMarca(map, code, &x, &y)` (`:564-596`) scans the marker layer **row-major from cell 0 (top-left)** for the first cell equal to `code + offbloco`. It returns the **center of that tile in map pixels**, `x = col*tileW + tileW/2` and `y = row*tileH + tileH/2`, and remembers the position. `C2D2M_ProximoBlocoMarca` (`:601-637`) continues from the remembered position until there are no more matches.
- X85 calls `CamadaMarcas(mapa, 0, 1)` (`jogo.cpp:151`), so **marker code = cell value − 1**. Codes 0–20 are engine constants (`chien2d2mapa.h:18-32`):
  - INICIO=0, FIM=1, CHECK=2;
  - SOLIDO… slope variants 3–15;
  - ESCADA 16–18, MORTE=19, PROG=20.
- Game codes extend from `C2D2M_PROG`. In devcore 2 (`funcoes_J.h:15`) they are: **BOLA=20, M_INIMIGO1..4=21..24, M_METEORO=25, M_BOSS=26, M_T1..M_T6=27..32**, which means cell values 22–33.
- The **tileset image follows the same order** (`X85-devcore 2/dados/jogo/mapas/tileset.png`, 256×160, 8×5 = 40 frames of 32 px):
  - frames 0–20: the engine glyphs (Início, Fim, Check, 13 × Parede, 3 × Escada, Morte, ball);
  - 21–24: i1–i4;
  - 25: pepper (meteor);
  - 26: "boss";
  - 27–32: t1–t6;
  - 33–36: B2–B5 (no code uses these);
  - 37–39: empty.
- **How X85 uses the markers:**
  - Start and end: `fase.xinicio/yinicio` comes from INICIO and `fase.xfinal/yfinal` from FIM (`jogo.cpp:153-155`). The start y initializes `fase.ymapa`. The end marker is otherwise unused.
  - Spawns: `jogo_procura_marca` (`funcoes_J.cpp:321-334`) is called for each type in the order INIMIGO1, 2, 3, 4, METEORO, BOSS, T1…T6 (`jogo.cpp:172-183`). It appends to `marcas[]`, so **the array order is grouped by type and row-major within each type**, and this order drives update, draw and collision order.
  - The marker's tile-center (x, y) becomes the sprite's **top-left** position.
  - Activation (`funcoes_J.cpp:418-430`): `ymapa` starts at the INICIO y (6384 in every map) and drops by 2 per frame until it reaches −600 (`jogo.cpp:257`). An inactive marker becomes active when `y - ymapa >= -100`. At that moment its y is converted to screen space (`y -= ymapa`, so it lands at about −100) and from then on each type moves on its own.
  - The first marker whose type is BOSS1–5 becomes `Boss` (`jogo.cpp:184-189`). The boss type is chosen by `planeta_atual` 0–4 (`funcoes_J.cpp:366-389`).
- **The map layer is never drawn.** X85 does not call `C2D2M_DesenhaCamadaMapa`, `C2D2M_AnimaMapa` or the physics helpers. The FMP is purely a **spawn script**, and `tileset.png` is only loaded to satisfy the loader. The scrolling background comes from `fundo1.jpg` and the star points.

### 10.3 Camera, scroll and parallax (available but unused by X85)

- `C2D2M_PosicionaMapa(map, x, y)` sets the camera's top-left in map pixels (`:392-402`). `C2D2M_PosicaoXY` reads it back. X85 calls PosicionaMapa once at `jogo.cpp:152`, with a stale y and no effect.
- `C2D2M_VelocidadeCamadaMapa(map, layer, v)` (`:424-439`) acts as a parallax **divisor**. The layer is drawn from `(cam.x / v, cam.y / v)` using integer division. `v == 0` draws the layer fixed at (0,0), even though the header comment says 0 means "disabled". The default after load is 0 for every layer (`:295`), and X85 sets layer 0 to 1.
- `C2D2M_DesenhaCamadaMapa(map, layer, sx, sy, w, h)` (`:474-559`):
  - It draws **nothing at all** if `cam.x<0 || cam.y<0 || cam.x > mapPxW-w || cam.y > mapPxH-h`. That test uses the undivided camera position, there is no wrap and no clamping, and no clip rect is applied.
  - Otherwise it draws `ceil(w/tile) (+1 if sub-tile offset)` × `ceil(h/tile) (+1)` tiles at `sx + col*tw - offX` and `sy + row*th - offY`, skipping 0.
- `C2D2M_AnimaMapa` (`:660-764`) steps each ANISTR (LOOPF, LOOPR, ONCE, PPFF, PPRR) once per call. It contains an **infinite loop** on `AN_NONE`, because `continue` skips `indice++` (`:676-677`). The X85 maps have no ANDT and the function is never called.

### 10.4 Results for all 15 FMP files (`fmp_dump.py --batch`)

Common to every file: FMP 1.0, `lsb=1`, `maptype=1`, **25×200 blocks of 32×32 px (800×6400 px)**, 24-bpp BGFX, BKDT `bgoff==index`, **exactly 1 layer (BODY)**, no ANDT and no LYRn. In every map, INICIO is at map-pixel y=6384 (bottom row) and FIM at y=16 (top row). The table gives *cell value:label×count*.

| file | blocks (str/gfx) | non-zero cells | markers (value:label×count) | notable positions |
|---|---|---|---|---|
| devcore2/fase1 | 34/34 | 65 | 1:INICIO×1 2:FIM×1 22:I1×27 23:I2×17 24:I3×6 26:METEORO×11 27:BOSS×1 29:T2×1 | INICIO (368,6384); boss (368,144); T2 (624,2736) |
| devcore2/fase2 | 34/34 | 74 | +25:I4×5, METEORO×19, I1×25 I2×11 I3×10, 30:T3×1 | boss (368,176); T3 (400,2736) |
| devcore2/fase3 | 34/34 | 69 | I1×27 I2×14 I3×5 I4×6 METEORO×13, 31:T4×1 | boss (368,176); T4 (368,2832) |
| devcore2/fase4 | 34/34 | 90 | I1×30 I2×16 I3×12 I4×8 METEORO×20, 32:T5×1 | boss (336,208); FIM x=336; T5 (400,3632) |
| devcore2/fase5 | 34/34 | 138 | I1×48 I2×19 I3×16 I4×14 METEORO×37, 33:T6×1 | boss (368,176); T6 (368,2896) |
| devcore/fase1 | 33/33 | 110 | I1×54 I2×24 I3×8 METEORO×15 BOSS×1, 28:"T2"×2 29:"T3" 30:"T4" 31:"T5" 32:"T6" | test row of T2–T6 at y=6160, x=80…336 |
| devcore/fase2…**fase8** | 33/33 | 99 | I1×50 I2×24 I3×7 METEORO×9 BOSS×1, 28–32 as above | **fase2–fase8 are byte-identical copies** (same md5); fase1 differs from them in 23 cells |
| beta/mapa | 30/30 | 197 | I1×63 I2×79 I4×4 TIPOMETEORO×42 ENERGIA×5 M_ESCUDO×2 (beta enum, `beta:jogo.h:45`) | the only map beta loads (`beta:jogo.cpp:109`) |
| beta/back-mapa | 30/30 | 196 | same as mapa except METEORO×38 ENERGIA×8 (6 cells differ) | an unused backup |

Cell differences between versions of the same map: devcore2/faseN differs from devcore/faseN in 159–228 cells, so the devcore 2 maps were re-authored with a 34-block tileset. The full per-marker coordinates are in the JSON files (`markers` key).

### 10.5 JSON export format (for the JS game)

```json
{"source":"fase1.fmp","width":25,"height":200,"tileW":32,"tileH":32,
 "layers":[[...5000 ints, row-major, index=row*width+col; 0=empty; v>0 = tileset frame v-1...]],
 "layerOrder":"…","markerLayer":0,"markerOffset":1,
 "markers":{"0":{"label":"C2D2M_INICIO","points":[[368,6384]]}, "21":{"label":"M_INIMIGO1","points":[[x,y],…]}, …}}
```

- `markers` holds the engine search results: keys are marker codes (value − 1), and each point is a tile center in map pixels, in row-major order. `PrimeiroBlocoMarca` + `ProximoBlocoMarca` can therefore be replaced by `json.markers[code].points`.
- Labels follow the version's enum (dc2 / dc / beta).

## 11. Compatibility check: fase6–8 in X85-devcore 2

`X85-devcore 2/jogo.cpp:54-56` loads `fase6.fmp`–`fase8.fmp`, but those files exist only in `X85-devcore/`.

1. **Tile indices: valid.**
   - fase6–8 use cell values {1, 2, 22, 23, 24, 26, 27, 28–32}, so the highest frame is 31. The devcore 2 tileset has 40 frames (256×160 / 32²), so the map loader would accept the files (tile size 32 matches and 256 and 160 are multiples of 32).
   - The tile *images* are never drawn, so visuals are not affected.
   - The two `tileset.png` files differ only from frame 27 on: the old one has t2…t6 at 27–31, the new one has t1…t6 at 27–32 and B2–B5 at 33–36. See `compat-devcore-fase6-with-devcore2-tileset.png` next to `devcore-fase6.png`: the old "t2 t3 t4 t5 t6" test row renders as "t1 t2 t3 t4 t5".
2. **Marker codes: partly mismatched.**
   - INICIO, FIM, INIMIGO1–4, METEORO and BOSS have the same codes (21–26) in both versions.
   - **The power-ups are shifted by one.** The old enum has no T1, so T2=27 … T6=31 (`dc:funcoes_J.h:15`), while devcore 2 inserted `M_T1=27` (`funcoes_J.h:15`). Under devcore 2, the old cells 28–32 become **M_T1…M_T5**. M_T1 creates a `T1` item that `jogo_atualiza_marca` does not move and `jogo_testa_colisao` does not handle (only T2–T6 have cases, `funcoes_J.cpp:683-687, 793-817`), so it is an inert sprite. The other items would also be off by one weapon.
   - **The boss breaks for planets 5–7.** `jogo_inicia_marca` only maps `M_BOSS` to BOSS1–5 for `planeta_atual` 0–4 (`funcoes_J.cpp:366-389`), so no boss is found, `Boss` stays NULL and `jogo.cpp:202` (`Boss->tipo`) dereferences NULL. That is a crash on the first frame. The same crash happens with the actual devcore 2 tree, where the files are missing: `C2D2M_CarregaMapaMappy` returns 0, no markers are found and Boss is NULL.
3. **Fase6–8 are unreachable in devcore 2.** `planeta_max=5` (`funcoes_M.cpp:5`; it was 8 in `dc:funcoes_M.cpp:5`), so the mission menu never lets `planeta_atual` exceed 4 (`menu.cpp:251-252, 311`). Progression is also capped at `planeta_liberado < 4` (`jogo.cpp:210`). The `case 5..7` lines are dead code left over from devcore.
4. **Content:** devcore fase6–8 are just copies of devcore fase2. They are placeholders, not real levels.

**Verdict.** The indices are technically valid with the devcore 2 tileset, but the markers are not semantically compatible: the power-ups are off by one and there is no boss mapping. The levels are also unreachable and are placeholder copies. For a faithful port of devcore 2, **ship 5 levels** (devcore2 fase1–5). If more levels are wanted later, remap old cell values 28–32 to 29–33 and add boss types for planets 5–7.

## 12. Engine shim: the API X85 actually uses, its semantics, and a Web equivalent

Call sites come from grepping `main.cpp`, `jogo.cpp`, `funcoes_J.cpp`, `funcoes_M.cpp` and `menu.cpp`. `funcoes_M.cpp:21-22` also reads the engine-internal `sprites[id-1].spLargura/spAltura` directly.

| engine API (uses) | semantics to reproduce | Web equivalent |
|---|---|---|
| `C2D2_Inicia(800,600,JANELA,OPENGL,"X85")` (main:6) | 800×600, top-left origin, black, OS cursor hidden | `<canvas width=800 height=600>` with CSS scaling (`image-rendering: pixelated` optional) and `cursor:none`; `document.title="X85"` |
| `C2D2_Encerra` (main:69) | teardown | no-op |
| `C2D2_CarregaSpriteSet(path,w,h)` (≈62 calls) | 1-based id, cached by path; w/h=0 → whole image; frames row-major `floor(W/w)×floor(H/h)`; opaque magenta → transparent; build 1-bpp masks (`rgba!=0`) | preload `Image`/`ImageBitmap`; store `{img, fw, fh, cols, rows, masks[]}`; build masks from `getImageData` |
| `C2D2_DesenhaSprite(id,i,x,y)` (≈48) | unscaled blit of frame i, top-left at integer x,y, straight-alpha source-over | `ctx.drawImage(img, sx,sy,fw,fh, x,y,fw,fh)` |
| `C2D2_DesenhaSpriteEfeito` via `XDesenhaSprite(id,i,x,y,w,h,alpha)` (funcoes_M:16-37) | stretched quad (w/h=0 → frame size), negative w/h = mirror, alpha = `alpha & 255`, bilinear filtering, r=g=b=255 always | `ctx.save(); ctx.globalAlpha=(a&255)/255; ctx.imageSmoothingEnabled=true; translate/scale(±1) for negatives; drawImage(...); ctx.restore()` (WebGL if exact GL bilinear and edge bleed are wanted) |
| `C2D2_LimpaTela` (10) | fill the screen opaque black | `ctx.fillStyle='#000'; ctx.fillRect(0,0,800,600)` |
| `C2D2_Sincroniza` (11) | end of frame: ≥16 ms pacing, present, then poll input | the loop body returns; a fixed 60 Hz scheduler on `requestAnimationFrame`; latch input at the frame boundary |
| `C2D2_CarregaFonte("512.png",32)` (2) | 16×16 glyph grid, per-glyph `desloc/larg` (§4) | load the sheet plus `out/font-512.json` (or compute at load) |
| `C2D2_DesenhaTexto(f,x,y,txt,align)` (31) | ESQUERDA=2: pen=x; DIREITA=1: x−W; CENTRALIZADO=0: x−W/2 (int); glyph at pen−desloc | loop of `drawImage` per byte (Latin-1) |
| `C2D2_PegaTeclas()` / `C2D2_Botao{pressionado,ativo,liberado}` (6) | per-frame edge flags, events applied in order at the poll, no repeat | `keydown`/`keyup` (ignore `e.repeat`) into a queue processed in `poll()`; map `e.code` to the C2D2 enum |
| `C2D2_PegaMouse()` (5) | x,y in 800×600 space; L/R/M buttons with the same three flags | `pointermove/down/up` with `getBoundingClientRect` scaling |
| `C2D2_ColidiuSprites(id1,f1,x1,y1,id2,f2,x2,y2)` (4) | frame-size (unscaled) pixel-mask AND; rgba==0 is the only transparency; quirks §6 | JS port of `C2D2_SobrepoeBitMasks` on `Uint32Array` masks, or a straightforward per-row bit test (document the deviation) |
| `C2D2P_Inicia` / `C2D2P_Pontos(pts,n,r,g,b)` (1 each) | 1-px opaque points (200,200,200) | `fillRect(x,y,1,1)` per star |
| `C2D2M_Inicia` (1) | init | no-op |
| `C2D2M_CarregaMapaMappy(fmp,tileset)` (8) | parse the FMP and load the tileset; 0 on failure | `fetch('out/devcore2-faseN.json')` (no tileset needed at runtime) |
| `C2D2M_VelocidadeCamadaMapa` / `C2D2M_PosicionaMapa` (1 each) | parallax divisor and camera; no visible effect in X85 | store only, or drop |
| `C2D2M_CamadaMarcas(map,0,1)` (1) | marker layer 0, offset 1 | constant |
| `C2D2M_PrimeiroBlocoMarca` / `C2D2M_ProximoBlocoMarca` (3/1) | row-major search for value code+1 → tile-center px; iterator state | `map.markers[code].points` (already in row-major order) |
| `CA2_Inicia` / `CA2_Encerra` (1/1) | 44.1 kHz stereo mixer, 8 channels | `new AudioContext()` (resume on the first user gesture) |
| `CA2_AjustaVolume(music,fx)` 0–100 (2) | gain = floor(v·128/100)/128 for all fx channels / music | two `GainNode`s |
| `CA2_CarregaEfeito(path)` (9) | decode the WAV/OGG chunk, cached by path | `fetch` + `decodeAudioData` into an `AudioBuffer` (provide an MP3/AAC fallback for Safari's OGG gaps if needed) |
| `CA2_TocaEfeito(id,pan)` (19) / `CA2_TocaEfeitoTela(id,x)` (12) | play once on a free channel among 8, otherwise drop; L/R gains `(100∓p)*254/200/255`; Tela: p=200·clamp(x,0,800)/800−100; id 0 = silent | a voice pool of 8 (`BufferSource → ChannelSplitter → 2 Gain → ChannelMerger → fxGain`); `onended` frees the voice |
| `CA2_CarregaMusica` / `CA2_TocaMusica(id,-1)` (2/3) | stop the current music, restart from 0, loop forever | `AudioBufferSourceNode{loop:true}` → musicGain (or an `<audio loop>`); stop the previous one first |
| `rand()` (game, not the engine) | glibc TYPE_3, unseeded (seed 1) | a JS port of glibc `random_r` |

Not used by X85 (the shim may omit them): `C2D2_TrocaCorLimpezaTela`, `LimitaAreaDesenho/LiberaAreaDesenho`, `RemoveSpriteSet/Fonte`, `DimensoesTexto` (only used internally), `TempoSistema`, `C2D2P_Linha/Retangulo*/Circulo*/Elipse*`, `C2D2M_DesenhaCamadaMapa`, `AnimaMapa`, `AjustaDeslocamento`, `ColidiuBlocoCenario`, `CalculaQueda`, `GravidadeMapa`, `DimensoesMapa`, `CA2_Pausa*/Continua*/Para*/FadeMusica`.

## 13. Fidelity checklist (quick reference)

1. Fixed step at 60 Hz with no delta time. All speeds are per frame.
2. Collision masks: transparent ⇔ RGBA == 0. Alpha-0 pixels with color and semi-transparent pixels are solid. Collisions use the unscaled frame-0 masks at the draw positions.
3. `XDesenhaSprite`: alpha `& 255`, negative sizes mean a mirrored image, bilinear filtering. Plain `DesenhaSprite` is unscaled and integer-positioned.
4. Text: per-glyph widths from `font-512.json`, with integer centering.
5. Input: edge flags per frame, no key repeat, and a press+release inside one frame is lost.
6. Audio: 8 voices with dropping, −6 dB center panning, 0–100→0–128 volume, music restarts on every `TocaMusica`, weapons 3–6 silent.
7. Markers: tile-center coordinates used as the sprite top-left, array order grouped by type then row-major, activation at `y - ymapa >= -100` with `ymapa` going 6384 → −600 in steps of 2 per frame.
8. Levels: devcore2 fase1–5 only (fase6–8 are unreachable, broken and placeholders).
9. glibc `rand()` with seed 1 for the stars and boss shot selection.
10. The loading screen shows loading.jpg + ready.png until Space is pressed.
