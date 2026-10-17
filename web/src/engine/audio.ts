// ChienAudio 2 over Web Audio. orig: chienaudio2.cpp (SDL_mixer: 44.1 kHz stereo, 8 effect channels); 02-engine §9.
// Effects are pre-decoded AudioBuffers played on a pool of 8 voices with SDL_mixer's Mix_SetPanning gains;
// music streams through one HTMLAudioElement per track (decoding the ~3.5 MB tracks to PCM costs ~60 MB).
import { normaliza, type Manifest } from './assets';

/** Thin adapter over the platform so the mixer logic is testable without Web Audio. */
export interface AudioPort {
  agora(): number;
  /** Plays `buf` once with per-side gains; must call `onEnd` exactly once when the voice is free again. */
  tocaBuffer(buf: unknown, gainL: number, gainR: number, onEnd: () => void): void;
  /** Fetches and decodes the effect at `url` (a manifest URL). */
  decodifica(url: string): Promise<unknown>;
  /** Stops the current track and plays this one from 0 (loop = forever); if locked, starts it on unlock. */
  musica(urlM4a: string, urlOgg: string, volume: number, loop?: boolean): void;
  volumeMusica(v: number): void;
  desbloqueia(): Promise<void>;
  desbloqueado(): boolean;
  /** Optional: create the track's element early so desbloqueia() can bless it inside the user gesture (iOS). */
  preparaMusica?(urlM4a: string, urlOgg: string): void;
}

// orig: SDL_mixer default channel count (Mix_AllocateChannels is never called)
const MAX_CANAIS = 8;
// orig: chienaudio2.h:31-32 CA2_ESQUERDA / CA2_DIREITA
const CA2_ESQUERDA = -100, CA2_DIREITA = 100;
// orig: SDL_mixer MIX_MAX_VOLUME
const MIX_MAX_VOLUME = 128;
// orig: chienaudio2.cpp:101 lTela = screen->w
const L_TELA = 800;

let porta: AudioPort | null = null;
let geracao = 0;
/** normalised path -> decoded buffer (null while decoding or if decoding failed) */
let buffers = new Map<string, unknown>();
let urlsEfeitos = new Map<string, string>();
let efeitos: string[] = [];           // id-1 -> normalised path
let musicasManifest = new Map<string, { m4a: string; ogg: string }>();
let musicas: string[] = [];           // id-1 -> normalised path
let ocupado: boolean[] = [];
let volMusica = 100, volEfeitos = 100;

/** orig: chienaudio2.cpp:162-168 — 0..100 mapped to SDL's 0..128 with integer math. */
function ganhoVolume(v: number): number {
  return Math.trunc((v * MIX_MAX_VOLUME) / 100) / MIX_MAX_VOLUME;
}

function limitaVolume(v: number): number { return Math.max(0, Math.min(100, Math.trunc(v))); }

/** orig: chienaudio2.cpp:286-295 + SDL_mixer Mix_SetPanning (each side scaled by L/255, R/255) × Mix_Volume. */
export function ganhosPan(pan: number, volEf: number): [number, number] {
  let p = Math.trunc(pan);
  if (p < CA2_ESQUERDA) p = CA2_ESQUERDA; else if (p > CA2_DIREITA) p = CA2_DIREITA;
  const esquerda = Math.trunc(((100 - p) * 254) / 200);
  const direita = Math.trunc(((100 + p) * 254) / 200);
  const fx = ganhoVolume(limitaVolume(volEf));
  return [(esquerda / 255) * fx, (direita / 255) * fx];
}

/**
 * Registers every effect of the manifest synchronously and starts decoding them (Ruling R2); the promise
 * resolves when all decodes have settled. Resets all mixer state (CA2_Inicia: volume 100/100).
 */
export function initAudio(port: AudioPort, manifest: Manifest): Promise<void> {
  porta = port;
  const g = ++geracao;
  buffers = new Map(); urlsEfeitos = new Map(); efeitos = []; musicas = [];
  musicasManifest = new Map();
  ocupado = Array.from({ length: MAX_CANAIS }, () => false);
  volMusica = 100; volEfeitos = 100; // orig: chienaudio2.cpp:99 CA2_AjustaVolume(100, 100)
  for (const [k, e] of Object.entries(manifest.music)) musicasManifest.set(normaliza(k), e);
  const tarefas: Promise<void>[] = [];
  for (const [k, e] of Object.entries(manifest.sounds)) {
    const chave = normaliza(k);
    urlsEfeitos.set(chave, e.url);
    buffers.set(chave, null);
    tarefas.push(port.decodifica(e.url).then(
      b => { if (g === geracao) buffers.set(chave, b); },
      () => { /* undecodable effect stays silent, like a failed Mix_LoadWAV after load */ }));
  }
  return Promise.all(tarefas).then(() => undefined);
}

/** Call from the first user gesture (pointerdown / keydown / touchend): resumes the context, starts pending music. */
export function desbloqueiaAudio(): Promise<void> {
  return porta ? porta.desbloqueia().catch(() => undefined) : Promise.resolve();
}

// orig: chienaudio2.cpp:178 CA2_CarregaEfeito — 1-based id in load order, cached by path; 0 if the file is unknown
export function CA2_CarregaEfeito(path: string): number {
  const chave = normaliza(path);
  const i = efeitos.indexOf(chave);
  if (i >= 0) return i + 1;
  if (!urlsEfeitos.has(chave)) return 0;
  efeitos.push(chave);
  return efeitos.length;
}

function toca(id: number, pan: number): number {
  const chave = efeitos[id - 1];
  if (chave === undefined || !porta) return 0;
  if (!porta.desbloqueado()) return -1;         // no gesture yet: dropped (Review Focus 3)
  const buf = buffers.get(chave);
  if (buf === null || buf === undefined) return -1; // still decoding: dropped like a busy channel (R2)
  const canal = ocupado.indexOf(false);          // orig: Mix_PlayChannel(-1, ...) — first free channel
  if (canal < 0) return -1;                      // all 8 busy: dropped, nothing is stolen
  const [l, r] = ganhosPan(pan, volEfeitos);
  ocupado[canal] = true;
  const g = geracao;
  let livre = false;
  porta.tocaBuffer(buf, l, r, () => { if (!livre && g === geracao) { livre = true; ocupado[canal] = false; } });
  return canal;
}

// orig: chienaudio2.cpp:279 CA2_TocaEfeito — returns the channel, -1 if dropped, 0 for id 0 / unknown id
export function CA2_TocaEfeito(id: number, pan: number): number {
  return toca(id, pan);
}

// orig: chienaudio2.cpp:310 CA2_TocaEfeitoTela — x clamped to [0, 800], pan = 200*x/800 - 100
export function CA2_TocaEfeitoTela(id: number, x: number): number {
  let p = Math.trunc(x);
  if (p < 0) p = 0; else if (p > L_TELA) p = L_TELA;
  return toca(id, Math.trunc((200 * p) / 800) - 100);
}

// orig: chienaudio2.cpp:370 CA2_CarregaMusica — 1-based id, cached by path; 0 if unknown
export function CA2_CarregaMusica(path: string): number {
  const chave = normaliza(path);
  const i = musicas.indexOf(chave);
  if (i >= 0) return i + 1;
  const e = musicasManifest.get(chave);
  if (!e) return 0;
  musicas.push(chave);
  porta?.preparaMusica?.(e.m4a, e.ogg);
  return musicas.length;
}

// orig: chienaudio2.cpp:472 CA2_TocaMusica — Mix_PlayMusic: stop current, restart from 0, loop forever when vezes == -1
export function CA2_TocaMusica(id: number, vezes: number): void {
  const chave = musicas[id - 1];
  const e = chave === undefined ? undefined : musicasManifest.get(chave);
  if (!e || !porta) return;
  porta.musica(e.m4a, e.ogg, ganhoVolume(volMusica), vezes <= -1);
}

// orig: chienaudio2.cpp:149 CA2_AjustaVolume — both 0..100 (clamped), applied to music immediately, effects on next play
export function CA2_AjustaVolume(musica: number, efeitos_: number): void {
  volMusica = limitaVolume(musica);
  volEfeitos = limitaVolume(efeitos_);
  porta?.volumeMusica(ganhoVolume(volMusica));
}

/** Headless port: always unlocked, silent; voices are freed immediately. */
export function portaSilenciosa(): AudioPort {
  return {
    agora: () => 0,
    tocaBuffer: (_b, _l, _r, onEnd) => { onEnd(); },
    decodifica: async () => ({}),
    musica: () => {},
    volumeMusica: () => {},
    desbloqueia: async () => {},
    desbloqueado: () => true,
  };
}

function junta(base: string, url: string): string {
  if (base === '' || base.endsWith('/')) return base + url;
  return base + '/' + url;
}

interface Faixa { el: HTMLAudioElement; abencoada: boolean }

/**
 * Real implementation. Effects: BufferSource → (ChannelSplitter) → GainL/GainR → ChannelMerger → destination.
 * (StereoPannerNode is not used: SDL_mixer panning attenuates a centred sound to 127/255 per side.)
 * Music: HTMLAudioElement(loop) → MediaElementAudioSourceNode → GainNode(music volume) → destination.
 * `base` is the folder holding `assets/` (same as carregaTudo).
 */
export function criaPortaWebAudio(base = ''): AudioPort {
  const ctx = new AudioContext();
  const ganhoMusica = ctx.createGain();
  ganhoMusica.connect(ctx.destination);
  const faixas = new Map<string, Faixa>();
  const usaM4a = typeof Audio !== 'undefined' && new Audio().canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '';
  let atual: Faixa | null = null;
  let pendente = false; // `atual` was requested while locked

  const faixa = (m4a: string, ogg: string): Faixa => {
    const url = junta(base, usaM4a ? m4a : ogg);
    let f = faixas.get(url);
    if (!f) {
      const el = new Audio();
      el.preload = 'none';
      el.src = url;
      ctx.createMediaElementSource(el).connect(ganhoMusica);
      f = { el, abencoada: false };
      faixas.set(url, f);
    }
    return f;
  };
  const tocaAtual = (): void => {
    if (!atual) return;
    pendente = false;
    atual.el.play().then(() => { if (atual) atual.abencoada = true; }, () => { pendente = true; });
  };

  return {
    agora: () => ctx.currentTime,
    tocaBuffer(buf, gainL, gainR, onEnd) {
      const b = buf as AudioBuffer;
      const fonte = ctx.createBufferSource();
      fonte.buffer = b;
      const gl = ctx.createGain(), gr = ctx.createGain();
      gl.gain.value = gainL; gr.gain.value = gainR;
      const juntor = ctx.createChannelMerger(2);
      if (b.numberOfChannels >= 2) {
        const div = ctx.createChannelSplitter(2);
        fonte.connect(div); div.connect(gl, 0); div.connect(gr, 1);
      } else {
        fonte.connect(gl); fonte.connect(gr); // mono chunk: SDL_mixer duplicates it to both sides
      }
      gl.connect(juntor, 0, 0); gr.connect(juntor, 0, 1);
      juntor.connect(ctx.destination);
      let feito = false;
      const fim = (): void => { if (feito) return; feito = true; fonte.disconnect(); juntor.disconnect(); onEnd(); };
      fonte.onended = fim;
      try { fonte.start(); } catch { fim(); }
    },
    async decodifica(url) {
      const r = await fetch(junta(base, url));
      if (!r.ok) throw new Error(`falha ao carregar ${url}: ${r.status}`);
      return await ctx.decodeAudioData(await r.arrayBuffer());
    },
    preparaMusica(m4a, ogg) { faixa(m4a, ogg); },
    musica(m4a, ogg, volume, loop = true) {
      ganhoMusica.gain.value = volume;
      const f = faixa(m4a, ogg);
      for (const outra of faixas.values()) if (outra !== f) outra.el.pause();
      atual = f;
      f.el.loop = loop;
      f.el.pause();
      try { f.el.currentTime = 0; } catch { /* not seekable yet: starts at 0 anyway */ }
      if (ctx.state === 'running') tocaAtual(); else pendente = true;
    },
    volumeMusica(v) { ganhoMusica.gain.value = v; },
    async desbloqueia() {
      // Inside the user gesture: bless every known track element (iOS plays media only from gestures),
      // then resume the context and start the pending track.
      for (const f of faixas.values()) {
        if (f.abencoada || f === atual) continue;
        f.el.muted = true;
        f.el.play().then(() => { f.abencoada = true; if (f !== atual) f.el.pause(); f.el.muted = false; },
          () => { f.el.muted = false; });
      }
      if (pendente) tocaAtual();
      if (ctx.state !== 'running') await ctx.resume();
    },
    desbloqueado: () => ctx.state === 'running',
  };
}
