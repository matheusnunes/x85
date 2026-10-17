# 04 — Port Strategy Research: X85 to the Web Browser

Date: 2026-10-17 · Scope: `X85-devcore 2/` (newest version; read-only) · Author: research agent

TL;DR: **Recommended: a faithful TypeScript rewrite, done as a 1:1 port of the game code onto a small "Chien2D-web" shim built on vanilla Canvas2D.** Function and variable names stay the same. Build with Vite, unit-test with Vitest, run screenshot and replay tests with Playwright.
**Runner-up: compile the original C++ with Emscripten.** It is cheap to start (we got it compiling in about 30 minutes), but it runs into a structural blocker in the SDL1-on-GL emulation. It is best kept as an optional **reference oracle** for parity testing, not as the shipping build.

---

## 0. What the code actually needs (local inspection)

Sources were converted from ISO-8859-1 to UTF-8 in a scratchpad copy and analysed there. Line counts:

| Layer | Files | Lines |
|---|---|---|
| Game logic | `main.cpp` 71, `menu.cpp` 787, `jogo.cpp` 407, `funcoes_J.cpp` 850, `funcoes_M.cpp` 272, + headers | ~2,590 |
| Chien2D 2 core | `chien2d2.cpp` 1136, `chien2d2mapa.cpp` 1453, primitives, `chienaudio2.cpp` 516 | ~3,400 |
| Chien2D backends | `chien2d2_gl.cpp` 832 (used), `chien2d2_sdl.cpp` 438 (unused), primitives GL/SDL | ~2,000 |

### 0.1 Engine API surface actually used by the game (call counts)

`C2D2_CarregaSpriteSet` 62 · `C2D2_DesenhaSprite` 48 · `C2D2_DesenhaTexto` 31 · `CA2_TocaEfeito` 19 · `CA2_TocaEfeitoTela` 12 · `C2D2_Sincroniza` 11 · `C2D2_LimpaTela` 10 · `CA2_CarregaEfeito` 9 · `C2D2M_CarregaMapaMappy` 8 · `C2D2_PegaTeclas`/`C2D2_PegaMouse` 11 · `C2D2_ColidiuSprites` 4 · `CA2_TocaMusica` 3 · `C2D2P_Ponto(s)` 4 · `C2D2M_PrimeiroBlocoMarca`/`ProximoBlocoMarca` 4 · `C2D2M_VelocidadeCamadaMapa`, `CamadaMarcas`, `PosicionaMapa` 1 each · `C2D2_DesenhaSpriteEfeito` 1 (wrapped by `XDesenhaSprite` in `funcoes_M.cpp`) · `CA2_AjustaVolume` 2 · `C2D2_CarregaFonte` 2.

**About 25 distinct engine functions.** That is the full contract a shim has to implement.

Key facts that drive the decision:

1. **Rendering is pure GL 1.x immediate mode.** `chien2d2_gl.cpp` uses `glBegin/glEnd` (13), `GL_QUADS` for sprites, `GL_TRIANGLES` for "effect" sprites, `glTexCoord2f`, `glVertex2f/2i`, `glColor4ub`, `glOrtho(0,w,h,0,-1,1)`, `glBlendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA)`, `GL_LINEAR` filtering, `GL_CLAMP` wrap. It also uses `GL_STENCIL_TEST` for `LimitaAreaDesenho`, but the game never calls that. Textures are padded to power-of-two squares (16–1024).
2. **The game depends on the GL backend.** `C2D2SDL_DesenhaSpriteEfeito` in `chien2d2_sdl.cpp` is a stub that `return false`. The game draws alpha fades, highlighted menu buttons and the scaled/flipped energy bar through `XDesenhaSprite` → `DesenhaSpriteEfeito`, so all of those would vanish on the SDL software backend. **Switching Chien2D to `chien2d2_sdl.cpp` is not a viable shortcut.**
3. **Effects in use are simple.** `XDesenhaSprite` only builds axis-aligned rectangles: position, size (which can be negative to flip, as in the energy bar `-altura_energia*586/100`) and alpha. Tint is always 255,255,255. Canvas2D `drawImage` + `globalAlpha` + `scale(1,-1)` covers all of it.
4. **The Mappy `.FMP` maps are not drawn.** The game never calls `C2D2M_DesenhaCamadaMapa`. It only uses the map's **marker layer** to extract enemy/boss spawn positions (`funcoes_J.cpp:323-327`). The visible background is a scrolling `fundo1.jpg` plus 100 procedurally placed stars. A rewrite therefore needs **an FMP marker parser and no tile renderer**. Note: `jogo.cpp:49-56` references `fase6..8.fmp`, which do not exist. They are unreachable because `planeta_liberado < 4` caps the game at 5 planets.
5. **Collision is pixel-perfect bitmask.** Masks are built at load time. `PontoTransparente` (`chien2d2.cpp:716`) treats a pixel as transparent **only** if its 32-bit value is exactly 0 or equals opaque magenta `FF00FF`. So a pixel with alpha 0 but non-zero RGB counts as *solid*, which is a quirk to reproduce. Magenta is also keyed to transparent at load (`MagentaParaPontoTransparente`).
6. **The loops block.** `main()` is a `while(estado_atual!=SAIR) switch(...)` dispatcher. Each screen (`menu_main`, `menu_mission`, `jogo_tela`, …) owns its own `while(!encerra){ …; C2D2_Sincroniza(); }` loop, 11 in total, and `jogo_carrega` busy-waits on "press space". `C2D2GL_Sincroniza` sleeps `16 - elapsed` ms with `SDL_Delay`, swaps, then polls input. So logic is **frame-locked at about 62.5 Hz** (16 ms), or 60 Hz when vsync dominates (`SDL_GL_SWAP_CONTROL=1`). There is no delta time: all speeds are pixels per frame.
7. **Input semantics.** `C2D2_Botao{pressionado, ativo, liberado}` means pressed-this-frame / held / released-this-frame. Bindings: arrows to move, Space or left mouse to fire, **Left Ctrl for bomb**, **Left Alt to cycle weapon**, Esc to go back, A–Z + Backspace for name entry, and the mouse for menus with a custom `cursor.png` (`SDL_ShowCursor` disabled). Ctrl/Alt are hostile in browsers (Ctrl+W closes the tab, Alt focuses the menu bar on Windows/Firefox) and need remapping with `preventDefault`.
8. **Audio.** SDL_mixer at 44.1 kHz stereo. Effects are WAV, plus `click.ogg` and `zoop.ogg`. Two OGG music tracks are large: `progression_sasquamox.ogg` 4.0 MB and `recharge_alvys18.ogg` 2.7 MB. `CA2_TocaEfeitoTela` pans by screen X (`Mix_SetPanning`). Music uses fade-out, pause/resume and volume.
9. **Saves.** `fopen/fread/fwrite` of raw structs to `./dados/saves.x85` (3 × `tiposave`, 44 bytes) and `./dados/recs.x85` (7 × `tiporecorde`, 20 bytes). Verified by file size: 132 B and 140 B, little-endian, with padding garbage. Layout of `tiposave`: `bool empty`+3 pad, `int pts`, `char nome[15]`+1 pad, `int level`, `int planeta_liberado`, `int planeta_atual`, `bool tiro_liberado[6]`+2 pad.
10. **RNG.** `rand()` is never seeded (no `srand`), so star field and boss-shot choices follow the C library's default sequence. This is useful for deterministic parity tests.
11. **Assets.** 9.1 MB total in `dados/` (about 6.9 MB is OGG music), all PNG/JPG/WAV/OGG/FMP. The bitmap font is `menu/512.png`, 32 px cells.

---

## Part A — Approaches

### A1. Compile the original C++ with Emscripten

#### Evidence: we actually built it

Toolchain: `docker run emscripten/emsdk:latest`, emcc **6.0.12** (released 2026-10-08). The build ran in a scratchpad copy; the project was not touched.

```bash
em++ -O2 -Dlinux=1 -sUSE_SDL=1 -sLEGACY_GL_EMULATION -sGL_FFP_ONLY -sASYNCIFY \
     -sALLOW_MEMORY_GROWTH --use-preload-plugins --preload-file dados \
     -Wno-everything *.cpp -o out/index.html
```

| Step | Result |
|---|---|
| Compile | **One error**: `SDL_GL_SWAP_CONTROL` is undeclared in Emscripten's SDL headers. Fixed by guarding that line with `#ifndef __EMSCRIPTEN__`. `-Dlinux=1` makes `chien2d2.h` pick `<SDL/SDL.h>` + `<GL/gl.h>` instead of `<windows.h>`. |
| Link | OK. Output sizes: `index.wasm` 111 KB (41 KB gz), `index.js` 232 KB (60 KB gz), `index.data` 9.3 MB. |
| Run 1 (headless Chromium via Playwright) | Prints `"Nao conseguiu iniciar a tela"`. Cause: Emscripten's `SDL_WasInit` **always returns 1** ([`src/lib/libsdl.js` L1370](https://github.com/emscripten-core/emscripten/blob/main/src/lib/libsdl.js)), and Chien2D aborts if video or audio is "already initialised". Patched 3 call sites. |
| Run 2 | Video init OK and textures upload. **Every `glTexParameteri(..., GL_CLAMP)` raises `WebGL: INVALID_ENUM`**, because `GL_CLAMP` (0x2900) doesn't exist in WebGL and `libglemu.js` doesn't remap it. Fix: `#define GL_CLAMP GL_CLAMP_TO_EDGE`. |
| Run 2 (cont.) | **Crash**: `Cannot read properties of null (reading 'getImageData')` in `SDL_LockSurface` ← `MagentaParaPontoTransparente` ← `C2D2GL_CarregaSpriteSet`. With `-sASSERTIONS` it trips `assert(!SDL.GL); // in GL mode we do not keep around 2D canvases and contexts` in `SDL_UnlockSurface`. |
| Run 3 (`-sSTB_IMAGE=1`) | Gets further (splash JPG loads) and then hits the same crash in `C2D2_CarregaFonte` → `CarregaSpriteSet`, which needs `SDL_CreateRGBSurface` + lock for RGBA conversion. |

**The blocker:** Emscripten's SDL 1.2 is a hand-written JavaScript shim, not real SDL. Once `SDL_SetVideoMode(SDL_OPENGL)` is called it stops backing surfaces with 2D canvases ([libsdl.js comment](https://github.com/emscripten-core/emscripten/blob/main/src/lib/libsdl.js): *"Set to true if we call SDL_SetVideoMode with SDL_OPENGL, and if so, we do not create 2D canvases & contexts for blitting"*). Chien2D's whole sprite pipeline does CPU pixel work on SDL surfaces: magenta keying, RGBA/POT padding, bitmask generation, then `glTexImage2D`. To make the SDL1 route work, `C2D2GL_CarregaSpriteSet` and `C2D2_CarregaFonte` would have to be rewritten on top of raw `stb_image` buffers. That is feasible (about 150–250 lines of C), but it means real engine surgery.

#### Options inside the Emscripten route

| Option | Notes | Verdict |
|---|---|---|
| **SDL1 built-in (`-sUSE_SDL=1`) + `LEGACY_GL_EMULATION` + `GL_FFP_ONLY`** | Smallest code change. GL emulation does support `glBegin`, `GL_QUADS` (converted, see `libglemu.js` "unsupported immediate mode" guard for mode 7), `glOrtho`, `glColor4ub` and `glTexCoord2f`. Emscripten's own console warning reads *"using emscripten GL emulation. This is a collection of limited workarounds, do not expect it to work"*. The docs say the emulation *"is by no means complete"* and recommend the ES2/WebGL subset for anything new ([OpenGL support](https://emscripten.org/docs/porting/multimedia_and_graphics/OpenGL-support.html)). `Mix_FadeOutMusic` is mapped to `Mix_HaltMusic` ("XXX ignore fading out effect"). `Mix_SetPanning` works only with WebAudio-loaded data. | Works only after the sprite-loader rewrite. Fragile. |
| **Port Chien2D to SDL2 (`--use-port=sdl2`, `sdl2_image:formats=png,jpg`, `sdl2_mixer:formats=ogg`)** | Real compiled SDL, so surfaces are real memory and the pixel code works unchanged. Requires porting about 1,500 engine lines from the SDL 1.2 API (`SDL_SetVideoMode`→`SDL_CreateWindow`+`SDL_GL_CreateContext`, `SDL_GL_SwapBuffers`→`SDL_GL_SwapWindow`, keysyms, `SDL_WM_SetCaption`, `SDL_SRCALPHA`). GL immediate mode still needs `LEGACY_GL_EMULATION`, or a rewrite of `chien2d2_gl.cpp` as a batched ES2 renderer. The ports are confirmed in `tools/ports/` (`sdl2.py`, `sdl2_image.py`, `sdl2_mixer.py` with `SUPPORTED_FORMATS = {'ogg','mp3','mod','mid'}`). | Most robust native route. Costs about 1–2 weeks. |
| **SDL3 (`-sUSE_SDL=3`)** | Marked non-experimental in emcc 6.0.10 (2026-09-21). **There are no `sdl3_image`/`sdl3_mixer` ports**, only `sdl3`/`sdl3_ttf` ([ports dir](https://github.com/emscripten-core/emscripten/tree/main/tools/ports)). | Not worth it: the API jump is bigger and the mixer is missing. |
| **Switch to `chien2d2_sdl.cpp` software backend** | Loses `DesenhaSpriteEfeito` (stub), so fades, button highlights and the energy bar break. Emscripten SDL1 software blits go through Canvas2D. | Rejected. |

#### Main loop

There are 11 nested blocking loops. Two choices:
- **`-sASYNCIFY`**. In ASYNCIFY builds `SDL_Delay` maps to `emscripten_sleep` (libsdl.js), so the loops yield. Cost: a bigger wasm and frame pacing tied to `setTimeout`, not `requestAnimationFrame`, which gives visible judder. `Sincroniza` must yield even when `espera <= 0`.
- **JSPI** (non-experimental since emcc 6.0.8) is cleaner, but browser support outside Chromium is still incomplete or unconfirmed (Firefox Nightly-only, Safari beta per secondary sources). It isn't safe for a public build in 2026.
- **Refactor to `emscripten_set_main_loop`**. Every screen loop would become a re-entrant state machine. That is the same work as the TS rewrite's scene refactor, and it would happen in C.

#### Saves and assets

`--preload-file dados` works; it is what we used. For persistence, mount **IDBFS** on `/dados` with `{autoPersist: true}` (available since 3.1.60), or patch the 4 save functions to call `EM_JS` → `localStorage`. The binary struct layout is preserved for free.

**Effort estimate (Emscripten SDL1 path):** 3–6 dev-days to "playable on Chrome desktop": sprite-loader rewrite, WasInit/GL_CLAMP/SWAP_CONTROL patches, ASYNCIFY pacing, IDBFS, key remap. Then an open-ended tail of GL-emulation and audio quirks. No mobile/touch/gamepad unless written in C or JS glue.
**Risks:** GL emulation is explicitly "do not expect it to work"; Safari Ogg decoding; ASYNCIFY judder; debugging through wasm; every future change is in 2010-era C++ with global state.

### A2. Faithful rewrite in TypeScript

#### Framework comparison for this game

Bundle sizes were measured from jsDelivr, minified then gzipped with `gzip -c | wc -c`.

| | **Vanilla Canvas2D + Chien2D shim** | **Phaser 4.2.1** (2026-07-09) | **PixiJS 8.22.0** (2026-10-01) | **KAPLAY 3001.0.19** (4000 in alpha) |
|---|---|---|---|---|
| Runtime size (gz) | **~0 KB** (shim ~5–10 KB) | ~355 KB | ~237 KB | ~70 KB |
| Fit for a 1:1 port | **Best**: the shim mirrors `C2D2_*` exactly, keeps the immediate-mode "draw every frame" model, and enables generator-based screens | Poor: scene graph, retained game objects, own loop/timestep and physics all fight the frame-locked imperative code | Medium: retained scene graph, though it can be used immediate-mode-ish via a sprite pool | Poor: opinionated component/ECS style |
| Performance needed | Trivial: 800×600, about 100 stars + 100 explosions + dozens of sprites per frame. Canvas2D handles this easily | Overkill | Overkill (WebGL/WebGPU) | Fine |
| Pixel collision | Hand-port of Chien2D bitmask (about 80 lines) | Arcade physics is AABB/circle only; needs custom code anyway | Custom | Area-based, not per-pixel |
| Tilemap | Not needed (only the FMP marker layer) | Tiled-centric; FMP unsupported | n/a | n/a |
| Audio | Web Audio directly (~150 lines) | Built-in WebAudio sound manager | Needs `@pixi/sound` | Built-in |
| Input / gamepad / touch | Own small module | Built-in keyboard/mouse/touch/gamepad | Pointer events only | Built-in |
| Maintainability | Highest traceability to the C++ (same names); no framework upgrades to chase | Phaser 3→4 broke tint APIs; another migration later is a risk | v8 minor releases still carry breaking changes (e.g. `isUniform`→`accessMode` in 8.20) | Small team, major version in alpha |
| Official agent skills | (generic canvas skills) | **Yes**: 28 official skills in `phaserjs/phaser/skills/` | **Yes**: 25 official skills in `pixijs/pixijs/skills/` | No |

**Verdict:** for *this* game, a framework brings mostly weight and impedance mismatch. The engine contract is about 25 functions, and every one maps to a few lines of Canvas2D or Web Audio. Phaser would make sense for a *reimagining* (new features, physics, mobile UI). PixiJS would make sense if we later wanted shaders, CRT effects or WebGPU. Neither is needed for fidelity.

#### Canvas2D mapping of the GL renderer

| Chien2D GL | Canvas2D |
|---|---|
| `glOrtho(0,800,600,0)` | Native canvas coordinates |
| `DesenhaSprite(id, idx, x, y)` | `drawImage(img, sx, sy, w, h, x, y, w, h)`, where `sx,sy` come from `idx % matrizX`, `idx / matrizX` |
| `DesenhaSpriteEfeito` / `XDesenhaSprite` (axis-aligned, alpha, negative size) | `globalAlpha = a/255`; negative w/h → `translate`+`scale(-1/1)`. General quads aren't needed (asserted in dev builds) |
| `GL_LINEAR` filtering | `imageSmoothingEnabled = true` (matches the original; scaled sprites were smooth) |
| `glClearColor` / `LimpaTela` | `fillRect` with the clear colour |
| `C2D2P_Ponto(s)` (`GL_POINTS`, 1 px) | `fillRect(x, y, 1, 1)` |
| `DesenhaTexto` (bitmap font `512.png`, 32 px cells) | Glyph-by-glyph `drawImage` with the same alignment rules |
| Magenta keying | Done **at build time** (see the asset pipeline below) |

### A3. Hybrid: transpile the C++ logic 1:1 onto an engine shim (the recommended shape of A2)

- Translate `main.cpp`, `menu.cpp`, `jogo.cpp`, `funcoes_J.cpp`, `funcoes_M.cpp` **file by file and function by function**, keeping Portuguese identifiers (`jogo_tela`, `marcas`, `saveAtual`, `planetas_atualiza`, `XDesenhaBotao`). Each TS function gets a `// from jogo.cpp:194` comment. Globals become one exported `g` state object, or module-level `let`s, so nothing gets restructured while porting.
- **Blocking loops become generators.** `while(!encerra){ …; C2D2_Sincroniza(); }` turns into `while(!encerra){ …; yield; }` inside `function* jogo_tela()`. The top-level `main` becomes `function* main()` with `yield* menu_main()`. The runtime advances the generator **once per fixed logic tick**. This keeps the code shape and control flow of the original almost line for line, including the "press space" busy-wait and the nested screen dispatcher. It is also *synchronous and deterministic*, so Vitest can drive N frames with no timers or DOM. (`async/await` would also work but is non-deterministic under test and harder to step.)
- C idioms: `int` math → `| 0` / `Math.trunc` where integer division matters (`altura_energia*586/100`, planet easing `/smooth +1`). `char nome[15]` → string max 14. `bool tiro_liberado[6]` → `boolean[]`. Pointers-to-struct (`Boss = &marcas[i]`) → object references.
- **`rand()` parity**: implement glibc's `random()` TYPE_3 additive generator (seed 1) as `crand()`. Unseeded `rand()` then reproduces the Linux build's star field and boss patterns exactly, which is needed for replay and screenshot parity. Swap to a seeded PRNG behind a flag later.
- Optional **oracle**: a native Linux build of the original (Docker `debian` + `libsdl1.2-dev libsdl-image1.2-dev libsdl-mixer1.2-dev mesa` + `xvfb-run`) with an input-replay patch produces golden frames to compare against Playwright screenshots. The Emscripten PoC above can serve the same role once the sprite loader is patched.

---

## Recommendation

**Go with A3, implemented as A2 on vanilla Canvas2D: a 1:1 TypeScript port with a Chien2D-web shim.**

Reasons:
1. **Fidelity is maximised because we control the shim.** Masks, magenta keying, the `pressionado/ativo/liberado` edge semantics, int math and `rand()` are all reproducible exactly. The Emscripten route *inherits* fidelity but loses it again in the GL/audio emulation layers.
2. **The engine contract is tiny** (about 25 functions), the game logic is about 2.6k lines, and the FMP map is used only for spawn markers. That makes the rewrite **roughly 1.5–3 weeks** for one developer with agent assistance: shim ~800–1,200 TS lines, logic ~2,600, FMP parser ~150, tests.
3. **Web-native features come cheap**: touch, gamepad, letterboxed scaling, fullscreen, PWA, localStorage, and proper `requestAnimationFrame` pacing. All are painful through SDL1 emulation.
4. **Smallest payload.** About 20–40 KB of JS gz plus assets, versus about 100 KB of wasm/js glue plus the emulation layers.
5. **Maintainable and testable.** Plain TS, deterministic generators, Vitest + Playwright. No 2010 C toolchain in the loop.

Runner-up: **Emscripten + SDL2 port** (most robust native route, about 1–2 weeks). Use it only if "byte-for-byte original code" is a hard requirement. The SDL1 + legacy-GL route is a viable *prototype or oracle*, not a product.

### Proposed architecture

```
x85-web/
├─ index.html                 # <canvas id="screen" width=800 height=600>, start overlay
├─ vite.config.ts             # base: './' (works on GH Pages subpath + itch.io)
├─ public/dados/...           # runtime assets (post-pipeline), same tree as original
├─ tools/
│  ├─ build-assets.ts         # magenta→alpha, bitmasks, FMP→JSON, audio transcode
│  ├─ fmp.ts                  # Mappy FORM/FMAP/MPHD/ANDT/BODY/LYR? chunk parser (big-endian chunk headers)
│  └─ import-saves.ts         # optional: decode original saves.x85 / recs.x85
├─ src/
│  ├─ main.ts                 # boot: load manifest, unlock audio, start runtime
│  ├─ runtime/loop.ts         # fixed-timestep driver that steps the game generator
│  ├─ chien2d/                # the shim — API mirrors Chien2D names
│  │  ├─ c2d2.ts              # C2D2_CarregaSpriteSet, DesenhaSprite, DesenhaSpriteEfeito, LimpaTela, DesenhaTexto, CarregaFonte
│  │  ├─ c2d2_colisao.ts      # bitmasks + C2D2_ColidiuSprites (port of SobrepoeBitMasks)
│  │  ├─ c2d2_input.ts        # teclado[], mouse, C2D2_Botao edge semantics, gamepad, touch
│  │  ├─ c2d2p.ts             # primitives (Ponto, Pontos)
│  │  ├─ c2d2m.ts             # map markers: CarregaMapaMappy, PrimeiroBlocoMarca, ProximoBlocoMarca…
│  │  └─ ca2.ts               # audio: CarregaEfeito, TocaEfeito, TocaEfeitoTela (panning), TocaMusica, AjustaVolume…
│  ├─ platform/{storage.ts, scale.ts, crand.ts}
│  └─ game/                   # 1:1 ports — same file names as the C++
│     ├─ main.ts  menu.ts  jogo.ts  funcoes_J.ts  funcoes_M.ts  types.ts (tiposave, tiporecorde, enums)
├─ tests/
│  ├─ unit/                   # Vitest: collisions, FMP parse, input edges, save codec, crand, N-frame sims
│  └─ e2e/                    # Playwright: boot, menus, replay → toHaveScreenshot
└─ .github/workflows/deploy.yml
```

**Asset pipeline** (`tools/build-assets.ts`, run by a Vite plugin or a `prebuild` script):
- Decode PNG/JPG with a raw decoder such as `fast-png` 8.x (not the browser canvas, which premultiplies alpha and can zero RGB when α=0). Then:
  - Key `FF00FF` to α=0.
  - Compute the collision bitmask with the **exact** `PontoTransparente` rule. Emit it as a compact `.bin` or base64 JSON per spriteset and frame size.
  - Write out the keyed PNG.
- Parse `faseN.fmp` and emit `faseN.markers.json` (marker type + x,y, in the order `ProximoBlocoMarca` would return them). Keep the runtime FMP parser for tests only.
- Audio: keep WAV for short SFX (or convert to OGG/Opus). For **Safari** compatibility, also emit AAC `.m4a`, or Opus-in-CAF/MP4, for the two music tracks. Safari added Ogg Vorbis/Opus playback only in 18.4 per an MDN change, and `decodeAudioData` support for Ogg is not confirmed. Pick the format per browser with `canPlayType`.
- Generate `manifest.json` (path → URL, frame size, mask).

**Fixed timestep loop** (matching frame-locked logic; see [Gaffer On Games "Fix Your Timestep!"](https://gafferongames.com/post/fix_your_timestep/)):

```ts
const STEP = 1000 / 60;                // option: 16 ms to mimic SDL_Delay(16) exactly
let acc = 0, last = performance.now();
function frame(now: number) {
  acc += Math.min(now - last, 250); last = now;    // clamp after tab switches
  while (acc >= STEP) {
    input.sample();                     // fills pressionado/ativo/liberado for THIS tick
    const r = game.next();              // runs logic+draw up to the next `yield` (= C2D2_Sincroniza)
    input.endTick();
    if (r.done) return;
    acc -= STEP;
  }
  // canvas already holds the last tick's frame (draw calls are immediate); nothing to interpolate
  requestAnimationFrame(frame);
}
```

- Pause on `visibilitychange` (the original stalls when the window is minimised).
- Draws go straight to an offscreen 800×600 canvas. Blit to the visible canvas once per rAF, so catch-up ticks don't flicker.
- Add a debug `?fps=62.5` switch to compare pacing with the original 16 ms delay.

**Web Audio** ([Chrome autoplay policy](https://developer.chrome.com/blog/autoplay): *"it will be created in the 'suspended' state, and you will need to call `resume()` after the user gesture"*):
- Show a "click / press any key to start" overlay over the X85 splash, which mirrors the original splash in `main.cpp`. On the first `pointerdown` or `keydown`, call `ctx.resume()`.
- SFX: decoded `AudioBuffer`s → `AudioBufferSourceNode` → `StereoPannerNode` (for `TocaEfeitoTela`, pan = x/800·2−1) → `GainNode` (effects bus) → destination.
- Music: `HTMLAudioElement` streamed through `MediaElementAudioSourceNode` → music `GainNode`. `Mix_FadeOutMusic` becomes `linearRampToValueAtTime`. Loop with `-1` becomes `loop = true`.
- Emulate SDL_mixer's 8-ish channels (`CA2_*` channel limits) so overlapping explosions behave the same.

**Input:**
- Keyboard: map `KeyboardEvent.code` to C2D2 indices and `preventDefault` on game keys.
  - Remap **LCTRL (bomb) → `KeyX`** and **LALT (weapon) → `KeyZ`/`KeyC`** by default, with "original bindings" as an option.
  - Name entry uses A–Z + Backspace as today. On mobile, show a hidden `<input>` to raise the virtual keyboard.
- Mouse: pointer events mapped through `getBoundingClientRect` into 800×600 space. Hide the OS cursor (`cursor: none`) and draw `cursor.png`, as the original does.
- Gamepad ([MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)): poll `navigator.getGamepads()` each tick. D-pad/stick → arrows, A → fire, B → bomb, LB/RB → weapon, Start → Esc.
- Touch (optional): left-half virtual stick, right-half fire/bomb buttons, drawn on a DOM overlay so the 800×600 frame stays pristine.

**Persistence:**
- `localStorage['x85:saves:v1']` holds `tiposave[3]` as JSON; `localStorage['x85:recs:v1']` holds `tiporecorde[7]`.
- Defaults come from the ports of `menu_saves_default`/`menu_recordes_default`.
- Wrap every access in try/catch and fall back to memory (Safari private mode, blocked storage).
- Optional "import original save" using the 44/20-byte layouts documented in §0.9.
- Add a `version` field for future migrations.

**Canvas scaling:**
- Keep a fixed 800×600 backing canvas and CSS-scale to fit, letterboxed at 4:3 (`object-fit`-like math or `aspect-ratio: 4/3` + `max-width/max-height`).
- Default to **smooth** scaling. The art is not pixel art (JPG backgrounds, linearly filtered GL quads), and 800×600 rarely integer-scales nicely (1080p = 1.8×).
- Offer an "integer / pixelated" toggle (`image-rendering: pixelated`) for purists.
- Fullscreen via `element.requestFullscreen()` on a button or F11-style key (F1–F4 are already captured by the engine).
- Use the `devicePixelRatio`-aware visible canvas only if crisp scaling becomes a requirement.

**Testing:**
- **Vitest 5** (unit, node env with an `OffscreenCanvas` stub or no-op draw recorder):
  - bitmask/collision vs hand cases;
  - FMP marker extraction vs known counts;
  - `crand()` vs glibc sequence;
  - save codec round-trip;
  - `C2D2_Botao` edge semantics;
  - **simulation tests** that step `jogo_tela()` N frames with a scripted input tape and assert on state (score, energy, boss HP).
- **Playwright 1.64** e2e:
  - boot to main menu, then click through slot select → mission → game;
  - inject a deterministic input tape via `window.__x85.replay(tape)` and `?seed=` / `?step=manual` hooks;
  - `expect(page).toHaveScreenshot()` at fixed tick counts ([Playwright visual comparisons](https://playwright.dev/docs/test-snapshots));
  - optionally compare against golden frames from the native oracle (§A3).
- CI runs both on GitHub Actions.

**Deploy:**
- Tooling: `vite build` with `base: './'` produces a static `dist/` of about 10 MB ([Vite static deploy guide](https://vite.dev/guide/static-deploy)).
- **Cloudflare Pages**: free, unlimited static bandwidth, preview deploys per branch. Best default.
- **GitHub Pages**: simplest if the repo is on GitHub; works with the relative base.
- **Vercel**: works but adds nothing for a static game.
- **itch.io**: zip of `dist/`. Limits: ≤1,000 files, ≤500 MB extracted, ≤200 MB per file, ≤240-char paths ([itch.io HTML5 docs](https://itch.io/docs/creators/html5)). We are about 70 files and 10 MB. Use "embed in page" at 800×600 with itch's fullscreen button, and publish via `butler push dist user/x85:html5`.
- **PWA (optional)**: `vite-plugin-pwa` 2.x with a precache manifest of all `dados/` assets (about 10 MB) for offline play, plus a manifest for installability (`display: fullscreen`, `orientation: landscape`).

**Pre-publication risks to clear:**
- **Licensing of the music.** `progression_sasquamox.ogg` and `recharge_alvys18.ogg` look like third-party tracks (ccMixter/Newgrounds-style names), so check their licences.
- The `512.png` font.
- The Chien2D 2 licence: it is an educational library from PUCPR (Radtke); no licence text was found in the sources or online. A TS re-implementation of its API is lower-risk than shipping its code, but confirm.

### Effort and risk summary

| Approach | Effort to playable | Fidelity | Web features | Key risks |
|---|---|---|---|---|
| **TS 1:1 + Canvas2D shim (recommended)** | 1.5–3 weeks | Very high (controlled shim, crand, exact masks) | Full | Translation slips (int math, pointer aliasing) → mitigated by sim tests + oracle; audio format on Safari |
| Emscripten + SDL2 port | 1–2 weeks (+ tail) | High (logic is native) | Partial, via JS glue | GL emulation gaps, ASYNCIFY pacing, wasm debugging, still C++ upkeep |
| Emscripten + SDL1 + legacy GL | 3–6 days to a demo, open-ended after | Medium | Poor | Proven blockers: `SDL_WasInit`, `GL_CLAMP`, surface lock in GL mode; "do not expect it to work" emulation |
| TS on Phaser 4 / PixiJS 8 | 2–4 weeks | Medium (paradigm mismatch) | Full | Framework churn, 240–355 KB gz runtime, rewriting rather than porting |

---

## Part B — Skills

The [Agent Skills open standard](https://agentskills.io) defines a skill as a folder with a `SKILL.md`; it originated at Anthropic and is supported by Claude Code. The common installer is [`vercel-labs/skills`](https://github.com/vercel-labs/skills) (`npx skills add owner/repo [--skill name] [-a claude-code] [-g]`). **Nothing was installed by this research.**

### B1. Remote skills found (verified via GitHub API on 2026-10-17)

| Skill / pack | Source | What it offers | Worth it? | Install |
|---|---|---|---|---|
| **awesome-gamedev-agent-skills**: `router`, `web-engines` (phaser-core, pixijs-rendering…), disciplines `input-systems`, `save-systems`, `audio-design`, `game-ui-ux`, `performance-optimization`, `physics-tuning` (fixed timestep), workflow `itch-publish` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (1,570★, pushed 2026-10-09; Phaser 4.2 / PixiJS 8.21 pinned) | Engine-agnostic game-dev disciplines plus an itch.io butler workflow | **Yes**, the best general pack. Use the disciplines and `itch-publish`, not the engine skills | `claude plugin marketplace add gamedev-skills/awesome-gamedev-agent-skills` then `claude plugin install router@awesome-gamedev-agent-skills` (or `npx skills add gamedev-skills/awesome-gamedev-agent-skills --skill save-systems --skill input-systems --skill audio-design --skill itch-publish`) |
| **game-creator** `game-qa` / `qa-game` (+ `game-deploy`, `game-audio`) | [PlayableIntelligence/game-creator](https://github.com/PlayableIntelligence/game-creator) (345★, pushed 2026-05-25) | Playwright QA for browser games: gameplay verification, visual regression, performance. Deploy recipes for GitHub Pages, Vercel, Netlify and itch.io | **Yes for `game-qa`**. Skip the Phaser/"viral game" pipeline, which assumes Phaser 3 and procedural assets | Install as a Claude plugin per its README, or `npx skills add PlayableIntelligence/game-creator --skill game-qa` |
| **wasm-emscripten** | [mohitmishra786/low-level-dev-skills](https://github.com/mohitmishra786/low-level-dev-skills/blob/main/skills/runtimes/wasm-emscripten/SKILL.md) (260★) | emcc flags, Asyncify, exports, memory model, wasm debugging | **Only if** the Emscripten oracle or runner-up path is pursued | `npx skills add mohitmishra786/low-level-dev-skills --skill wasm-emscripten -a claude-code` |
| **Phaser official skills** (28: `game-setup-and-config`, `scale-and-responsive`, `input-keyboard-mouse-touch`, `audio-and-sound`, `v3-to-v4-migration`…) | [phaserjs/phaser/skills](https://github.com/phaserjs/phaser/tree/master/skills) | Authoritative Phaser 4 API guidance | Only if Phaser is chosen. Not needed for the recommendation | `npx skills add phaserjs/phaser --skill scale-and-responsive` |
| **PixiJS official skills** (25: `pixijs-application`, `pixijs-assets`, `pixijs-ticker`, `pixijs-performance`…) | [pixijs/pixijs/skills](https://github.com/pixijs/pixijs/tree/dev/skills) | Authoritative PixiJS v8 guidance | Only if a WebGL renderer is added later | `npx skills add pixijs/pixijs --skill pixijs-ticker` |
| **TerminalSkills** `canvas-api`, `playwright-testing` | [TerminalSkills/skills](https://github.com/TerminalSkills/skills) (168★) | Canvas2D drawing/pixel manipulation; Playwright e2e | Nice-to-have; `canvas-api` fits the shim work | `npx skills add TerminalSkills/skills --skill canvas-api` |
| **playwright-skill** | [lackeyjb/playwright-skill](https://github.com/lackeyjb/playwright-skill) (3,210★) | General Playwright automation scripts | **Already installed locally** | n/a |
| **webapp-testing** | [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Python Playwright scripts to test local web apps | **Already installed locally** | n/a |
| Phaser community skills (`phaser-best-practices` in onmax/nuxt-skills, `phaser-gamedev` in chongdashu/phaserjs-tinyswords, babysitter phaser) | listings: [claudeskills.info](https://claudeskills.info/ja/skills/onmax/nuxt-skills/phaser-best-practices/), [tomevault](https://tomevault.io/tome/chongdashu/phaserjs-tinyswords) | Phaser 3 patterns | **No**: Phaser 3-era and superseded by the official Phaser 4 skills | — |

### B2. Already installed locally (`~/.claude/skills/`, 1,369 entries; descriptions read from SKILL.md frontmatter)

| Skill | Description (abridged) | Use for X85? |
|---|---|---|
| `game-development` (+ `web-games`, `2d-games`, `game-audio`, `game-design`) | "Game development orchestrator. Routes to platform-specific skills." `web-games` covers framework choice, autoplay and PWA; generic | Light. Principles only, no porting specifics |
| `typescript-pro` / `typescript-expert` | Advanced TS types, strictness, tooling/migration | **Yes**: shim typing, strict mode, Vite/Vitest config |
| `javascript-pro` | Modern JS, async, browser compat | Marginal |
| `legacy-modernizer` | "Refactor legacy codebases… gradual modernization" (short, generic) | Marginal; the strangler-fig idea fits the oracle approach |
| `framework-migration-legacy-modernize` | Strangler-fig orchestration for legacy systems | Marginal (enterprise-oriented) |
| `playwright-skill` | General Playwright automation | **Yes**: e2e and screenshot tests |
| `webapp-testing` | Python Playwright for local web apps | Yes, for quick ad-hoc checks |
| `e2e-testing` / `e2e-testing-patterns` / `ui-visual-validator` | Playwright visual regression, CI, visual validation | Yes, for the screenshot-parity suite |
| `javascript-testing-patterns` / `test-driven-development` | Vitest/Jest patterns, TDD loop | **Yes**: simulation tests per ported function |
| `web-performance-optimization` | Bundle size, caching, Core Web Vitals | Later (asset loading, music streaming) |
| `progressive-web-app` | PWA, service workers, Workbox, manifest | Optional offline phase |
| `cpp-pro` / `c-pro` | Modern C++ / C | Useful for **reading** the original and for the Emscripten oracle patches |
| `binary-analysis-patterns`, `reverse-engineer`, `firmware-analyst` | Binary RE / disassembly / firmware | **Not needed**: full source is available. Only relevant for inspecting the old `bin/` executables |
| `deployment-engineer`, `vercel-deployment`, `cloudflare-workers-expert` | CI/CD, Vercel (Next.js-centric), Workers/Pages | `cloudflare-workers-expert` is marginally useful for Pages; GH Actions basics are enough |

### B3. Top 5 skills to use

1. **`gamedev-skills/awesome-gamedev-agent-skills`**: `input-systems`, `save-systems`, `audio-design`, `physics-tuning` (fixed timestep), `itch-publish`. Remote; install via the plugin marketplace.
2. **`game-qa`** from PlayableIntelligence/game-creator: Playwright gameplay and visual-regression patterns for canvas games. Remote.
3. **`playwright-skill`** + **`e2e-testing`**: already installed. Used for the screenshot and replay parity suite.
4. **`typescript-expert`** (or `typescript-pro`) + **`test-driven-development`**: already installed. Used for the strict-TS shim and simulation tests.
5. **`TerminalSkills/skills` `canvas-api`**: remote; Canvas2D drawing and pixel details for the shim. If the Emscripten oracle is built, use **`wasm-emscripten`** (mohitmishra786) instead.

---

## Sources

- Emscripten OpenGL support (modes, `LEGACY_GL_EMULATION`, `GL_FFP_ONLY`, "by no means complete"): https://emscripten.org/docs/porting/multimedia_and_graphics/OpenGL-support.html
- Emscripten ports and `--use-port` syntax: https://emscripten.org/docs/compiling/Building-Projects.html
- Emscripten ports directory (sdl2, sdl2_image, sdl2_mixer, sdl3, sdl3_ttf; no sdl3_mixer/image): https://github.com/emscripten-core/emscripten/tree/main/tools/ports
- Emscripten SDL1 JS implementation (`SDL_WasInit` returns 1; GL-mode surfaces; `Mix_FadeOutMusic`→halt; `SDL_Delay`→`emscripten_sleep` with ASYNCIFY): https://github.com/emscripten-core/emscripten/blob/main/src/lib/libsdl.js
- Emscripten GL emulation (`GL_QUADS` handling, no `GL_CLAMP` remap): https://github.com/emscripten-core/emscripten/blob/main/src/lib/libglemu.js
- Emscripten ChangeLog (6.0.12 2026-10-08; SDL3 non-experimental 6.0.10; JSPI non-experimental 6.0.8; IDBFS autoPersist): https://github.com/emscripten-core/emscripten/blob/main/ChangeLog.md
- Emscripten Asyncify: https://emscripten.org/docs/porting/asyncify.html · Main loop: https://emscripten.org/docs/porting/emscripten-runtime-environment.html#browser-main-loop · IDBFS: https://emscripten.org/docs/api_reference/Filesystem-API.html#filesystem-api-idbfs
- JSPI status (secondary): https://blog.openreplay.com/jspi-javascript-wasm-bridge/ · https://v8.dev/blog/jspi-newapi
- Phaser 4 release: https://gamedev.net/news/2759-phaser-4-released/ · https://github.com/phaserjs/phaser/discussions/7274 · https://en.wikipedia.org/wiki/Phaser_(game_framework) · latest tag v4.2.1 (GitHub API)
- PixiJS: https://pixijs.com/blog/june-2026 · https://gamedev.net/news/5221-pixijs-v8200-released/ · latest tag v8.22.0 (GitHub API)
- KAPLAY: https://npmjs.com/package/kaplay · https://github.com/kaplayjs/kaplay
- Safari Ogg support (secondary/uncertain): https://https-github_com.proxy.bugsmash.io/mdn/content/pull/39592 · https://bugs.webkit.org/show_bug.cgi?id=226922 · https://www.npmjs.com/package/oggmented
- Autoplay policy: https://developer.chrome.com/blog/autoplay
- Gamepad API: https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
- Fixed timestep: https://gafferongames.com/post/fix_your_timestep/
- Vite static deploy: https://vite.dev/guide/static-deploy · Playwright snapshots: https://playwright.dev/docs/test-snapshots
- itch.io HTML5 limits: https://itch.io/docs/creators/html5
- Agent Skills standard: https://agentskills.io · skills CLI: https://github.com/vercel-labs/skills
- Skill repos: https://github.com/gamedev-skills/awesome-gamedev-agent-skills · https://github.com/PlayableIntelligence/game-creator · https://github.com/mohitmishra786/low-level-dev-skills · https://github.com/phaserjs/phaser/tree/master/skills · https://github.com/pixijs/pixijs/tree/dev/skills · https://github.com/TerminalSkills/skills · https://github.com/lackeyjb/playwright-skill · https://github.com/anthropics/skills
- Skill listings: https://claudemarketplaces.com/skills/opusgamelabs/game-creator/phaser · https://claudeskills.info/plugins/gamedev-skills/awesome-gamedev-agent-skills/ · https://skillselion.com/skills/mohitmishra786/low-level-dev-skills/wasm-emscripten

## Appendix — PoC reproduction (scratchpad only, project untouched)

- Copy: `/private/tmp/claude-501/-Users-matheusgobatonunes-Projects-x85/db1b6b9f-51f5-4914-bb2a-8868dfa9e839/scratchpad/poc/`. Patches applied there: the `SDL_GL_SWAP_CONTROL` guard and 3× `SDL_WasInit` bypass.
- Build: `docker run --rm -v $PWD:/src -w /src emscripten/emsdk:latest em++ … -o out/index.html` (flags as in §A1).
- Run: `python3 -m http.server` in `out/` + Playwright headless Chromium. The crash stack is quoted in §A1.
- Next patches needed for the PoC to boot: `#define GL_CLAMP GL_CLAMP_TO_EDGE`; rewrite `C2D2GL_CarregaSpriteSet`/`MagentaParaPontoTransparente`/`C2D2_CriaVetorBitMasks` inputs to use `stb_image` RGBA buffers instead of SDL surfaces; make `C2D2GL_Sincroniza` always yield (`emscripten_sleep(max(espera,1))`).
