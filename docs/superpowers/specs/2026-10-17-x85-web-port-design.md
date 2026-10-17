# X85 Web — Design Spec

Date: 2026-10-17 · Status: approved in chat, pending written-spec review

## 1. Intent

Bring **X85 (2010 version)** — the user's award-winning college space shooter (C++ / Chien2D 2 / SDL 1.2 / OpenGL) — to modern browsers on **desktop and mobile**, preserving its essence: the same art, sounds, music, menus, feel and numbers. Modern browser technology replaces the 2010 stack; gameplay does not get redesigned.

Success criteria:
- Every 2010 screen (main, slot select, name entry, mission/planet select, ranking, options, about, loading/ready, gameplay + HUD) exists and matches the original layout pixel-for-pixel at 800×600 logical resolution.
- Gameplay constants, spawn timing, weapon/enemy/boss behaviour follow `docs/analysis/01-game-spec.md` (with the decisions in §3), each traceable to the original `file:line`.
- Plays at a stable logical 60 Hz on desktop (Chrome, Firefox, Safari, Edge) and mobile (iOS Safari, Android Chrome), including on 120/144 Hz displays.
- Fully playable with keyboard, mouse, gamepad, and touch.
- Deployed publicly on Netlify (user's personal team); source in a GitHub repo.

## 2. Source of truth

| Topic | Document |
|---|---|
| Gameplay, menus, constants, persistence, bugs | `docs/analysis/01-game-spec.md` |
| Engine semantics, FMP format, engine-shim API table | `docs/analysis/02-engine-and-formats.md` |
| Versions, asset inventory, web audio formats | `docs/analysis/03-versions-and-assets.md` |
| Port strategy research | `docs/analysis/04-port-strategy-research.md` |
| Binary ↔ source parity, decoded data files | `docs/analysis/05-reverse-engineering.md` |

Canonical original: `X85-devcore 2/` (read-only; never modified). Binary parity is confirmed, so the source is authoritative.

## 3. Decisions

| # | Decision |
|---|---|
| D1 | Port only the 2010 version. The 2009 beta is archived in the repo but not ported. |
| D2 | Player energy **100**, **5 bombs** (June-2010 values; the August build's 10000/50 were debug leftovers). |
| D3 | **Fix all original bugs** listed in `01-game-spec.md §7` (enemy-bullet pool leak, ranking write-after-close crash, INIMIGO3 awarding 0 points, INIMIGO4 no contact damage, enemy bullets not hitting when no enemy is on screen, boss-marker null crash, etc.). Each fix is documented in a `FIXES.md` with the original `file:line`. |
| D4 | Hitboxes stay faithful: pixel-perfect masks built from raw PNG RGBA where only RGBA == 0 is empty (engine semantics, not a bug — it defines the game's feel). |
| D5 | glibc `rand()` (TYPE_3, unseeded) is reproduced so star fields and boss patterns follow the original sequences. |
| D6 | Difficulty option stays cosmetic, as in 2010 (no invented balance). |
| D7 | Only fase1–5 ship (fase6–8 are unreachable placeholders). |
| D8 | Records start from the original defaults (Matheus, Argus, chucknorris, magaiver, loser, bill, noob). |
| D9 | Zero runtime dependencies. Dev-only: Vite, TypeScript, Vitest, Playwright. |
| D10 | Additions allowed only where the platform demands them: alternate keys, gamepad, touch controls, auto-pause on focus loss, fullscreen, responsive scaling. They do not alter gameplay rules. |

## 4. Architecture

```
web/
  index.html
  src/
    engine/            ← replaces Chien2D 2 (API shaped after the subset X85 uses)
      renderer.ts      WebGL2 batched textured-quad renderer (alpha, mirror, stretch, straight-alpha blend
                       SRC_ALPHA/ONE_MINUS_SRC_ALPHA, LINEAR filter like GL backend); rect primitives
      sprites.ts       sprite sets: frame slicing (L→R, T→B; 0,0 = whole image), magenta colour-key,
                       collision bitmasks (Uint32Array) loaded from build-time mask files
      collision.ts     C2D2_ColidiuSprites equivalent (pixel-perfect on unscaled frames)
      font.ts          bitmap font from 512.png (metrics from tools/out/font-512.json)
      input.ts         per-frame button edges (pressionado/ativo/liberado), no key repeat; keyboard,
                       mouse (with original +8,+6 hotspot), gamepad, touch → unified virtual buttons
      audio.ts         Web Audio: decoded buffers, 8 effect voices (drop when full), music bus,
                       volume 0–100, unlock on first gesture
      loop.ts          fixed 60 Hz accumulator stepping generator-based screens; render once per rAF
      rand.ts          glibc rand()/srand() reimplementation
      storage.ts       localStorage persistence (versioned JSON): 3 save slots, 7 records, options
      viewport.ts      800×600 logical canvas, DPR-aware, letterbox fit, fullscreen, orientation
    game/              ← 1:1 translation, original Portuguese names kept for traceability
      main.ts          state machine (TELA_MAIN … TELA_JOGO)
      menu.ts          menu_* screens as generator functions (function* menu_main() { … yield; })
      jogo.ts          jogo_carrega / jogo_tela
      funcoes_J.ts     gameplay helpers (ship, shots, enemies, bosses, items, collisions, explosions)
      funcoes_M.ts     menu helpers (buttons, planets, slots, records)
      constantes.ts    enums/constants with original file:line comments
    touch/             on-screen controls overlay (DOM/CSS over the canvas)
  public/assets/       generated: images (PNG), masks, maps JSON, audio (AAC .m4a + Ogg)
  tools/               build-assets script: copies/renames assets, builds masks from raw PNG,
                       exports fase1–5 FMP → JSON spawn lists, converts audio (afconvert)
  tests/
    unit/              Vitest: rand, input edges, slicing, masks/collision, FMP spawn parsing,
                       storage, game rules (weapons, damage, scoring, spawn timing)
    sim/               deterministic simulations: scripted inputs → expected state at frame N
    e2e/               Playwright: screenshot each menu + HUD (desktop + mobile viewports), smoke play
```

### 4.1 Main loop

Each original blocking screen loop (`while(!encerra){ input; update; draw; C2D2_Sincroniza(); }`) becomes a generator that yields once per frame. `loop.ts` advances the active generator in fixed 1/60 s steps (accumulator, max 4 catch-up steps, then drop time) and renders on each `requestAnimationFrame`. When the tab is hidden or focus is lost during gameplay, the loop pauses (D10) and shows a minimal "PAUSADO — toque/clique para continuar" overlay.

### 4.2 Rendering

All drawing goes through a single WebGL2 batch: per-frame vertex buffer of quads, one texture bind per sprite-sheet switch, draw order identical to the original. Sprite sheets keep original images (no repacking needed at this scale); the colour-key (opaque magenta → transparent) is applied at load. Canvas backing store = 800×600 × devicePixelRatio scale; the logical projection stays 800×600. Context loss is handled by re-uploading textures.

### 4.3 Assets

Build-time script reads `X85-devcore 2/dados/` (read-only) and emits `web/public/assets/`:
- images as-is (PNG/JPG), plus `*.mask` bitmasks computed from raw RGBA;
- fase1–5 → `fase{n}.json` spawn lists (marker code = value−1, position = tile centre);
- `click.ogg`/`zoop.ogg` (actually WAV) renamed; effects kept as WAV (universally supported); music in AAC `.m4a` (primary) + Ogg fallback.

### 4.4 Persistence

`storage.ts` stores a versioned JSON blob in localStorage (`x85:v1`), mirroring `Save` (name, points, unlocked planets, current planet, unlocked shots, difficulty) and `Record` (name, points) structs. Corrupt or missing data resets to defaults (D8). Volume options persist too.

## 5. Controls

### 5.1 Desktop
Original keys stay authoritative; aliases added where browsers/OS interfere:

| Action | Original | Alias |
|---|---|---|
| Move | Arrows | WASD |
| Fire (hold) | Space / left mouse | J |
| Bomb | Left Ctrl | X, K |
| Cycle weapon | Left Alt | Z, L |
| Back / abort | Esc | — |
| Fullscreen | — | F |

`preventDefault` on game keys (arrows, space, Alt) while the canvas has focus.

### 5.2 Gamepad (Standard mapping)
Left stick / D-pad move · A (or RT) fire · B bomb · LB/RB cycle weapon · Start = Esc.

### 5.3 Touch (mobile/tablet)
- **Menus:** taps map to the original mouse model (pointer position → logical coords; the +8,+6 hotspot is *not* applied for touch, the tap point is used). Name entry (slot insert) focuses a hidden `<input>` to open the OS keyboard, feeding characters into the original text-entry logic.
- **Gameplay:** relative drag anywhere in the play area moves the ship's *target* by the finger delta (the ship keeps its original chase easing, distance/20 + 1 px/frame) — the floaty 2010 feel is preserved. While a finger is down in the play area, fire is held. Two on-screen buttons: **BOMBA** and **ARMA** (cycle weapon); a small pause/back button maps to Esc (with confirmation, since abort loses progress).
- **Layout:** landscape — canvas letterboxed, buttons in the side bars when space exists, otherwise overlaid semi-transparently at bottom corners. Portrait — canvas at top (full width), controls panel below; a gentle "gire o aparelho para jogar melhor" hint, not a block.
- Touch UI only appears on `pointer: coarse` devices or after the first touch event.

### 5.4 Mobile platform details
- Audio unlocks on the first tap (Web Audio resume), required by iOS.
- `viewport-fit=cover`, safe-area insets respected; `touch-action: none` and no long-press/selection/zoom on the game surface.
- Fullscreen API where supported (Android); on iOS, a web app manifest enables "Add to Home Screen" standalone mode.
- Performance budget: ≤ 4 ms CPU per logical frame on a mid-range phone; WebGL2 required (supported by all target browsers), with a clear message if unavailable.

## 6. Testing

- **TDD** for engine units and game rules (Vitest), deriving expected values from the spec's cited constants.
- **Deterministic simulations:** with the glibc RNG and fixed step, scripted input sequences assert spawn timing (boss at ≈51 s), damage, scoring, unlock/save behaviour, and every D3 fix.
- **Playwright:** screenshots of every menu and the in-game HUD at desktop 1280×800 and mobile (iPhone 14 portrait/landscape, Pixel 7) viewports; a smoke test that starts a game, fires, uses a bomb, and returns to menu; touch emulation for mobile flows.
- **Manual check** on a real phone before release (user).

## 7. Delivery

- **GitHub repo** `x85` (user `matheusnunes`), **private by default**: `web/`, `docs/`, and the original sources/assets of 2010 (`X85-devcore 2/`) and 2009 (`betaversion/`) as a historical archive — excluding binaries, `.o`, `obj/`, `bin/`, IDE files, `.DS_Store`, and the redundant `X85-devcore/` snapshot.
- **Netlify** (personal team "matheusnunes’s team"): static deploy of `web/dist`, with cache headers for assets.
- **Music licence check:** before the public deploy, research the licences of `recharge_alvys18.ogg` and `progression_sasquamox.ogg` (likely third-party). If unverifiable, ask the user before publishing.

## 8. Out of scope

2009 beta port; new levels/content; real difficulty balancing; online leaderboards; WebGPU renderer; localisation beyond the original texts.
