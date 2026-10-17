import { test, expect, vi } from 'vitest';
import {
  ganhosPan, initAudio, CA2_CarregaEfeito, CA2_TocaEfeito, CA2_TocaEfeitoTela, CA2_AjustaVolume,
  CA2_CarregaMusica, CA2_TocaMusica, CA2_PausaMusica, CA2_ContinuaMusica, desbloqueiaAudio, portaSilenciosa, criaPortaWebAudio, portaOuSilenciosa, type AudioPort,
} from '../../src/engine/audio';

const fake = (unlocked = true) => {
  const ends: (() => void)[] = [];
  const tocados: { l: number; r: number }[] = [];
  const musicas: { m4a: string; ogg: string; vol: number; loop: boolean }[] = [];
  const volumes: number[] = [];
  let desbloqueado = unlocked;
  const port: AudioPort = {
    agora: () => 0, tocaBuffer: (_b, l, r, onEnd) => { tocados.push({ l, r }); ends.push(onEnd); }, decodifica: async () => ({}),
    musica: (m4a, ogg, vol, loop) => { musicas.push({ m4a, ogg, vol, loop: !!loop }); }, volumeMusica: v => { volumes.push(v); },
    desbloqueia: async () => { desbloqueado = true; }, desbloqueado: () => desbloqueado,
  };
  return { port, ends, tocados, musicas, volumes };
};
const man = {
  images: {}, maps: {},
  music: { './dados/sons/recharge_alvys18.ogg': { m4a: 'a.m4a', ogg: 'a.ogg' } },
  sounds: { 'dados/sons/explo.wav': { url: 'x' }, './dados/sons/click.ogg': { url: 'c' } },
} as any;

test('centre pan is ~-6 dB at full volume', () => { const [l, r] = ganhosPan(0, 100); expect(l).toBeCloseTo(127 / 255); expect(r).toBeCloseTo(127 / 255); });
test('volume 30 → 38/128', () => { const [l] = ganhosPan(-100, 30); expect(l).toBeCloseTo((254 / 255) * (38 / 128)); });
test('pan is clamped and truncated like the C code', () => {
  expect(ganhosPan(-500, 100)).toEqual(ganhosPan(-100, 100));
  const [l, r] = ganhosPan(1, 100); // L = trunc(99*254/200) = 125, R = trunc(101*254/200) = 128
  expect(l).toBeCloseTo(125 / 255); expect(r).toBeCloseTo(128 / 255);
  expect(ganhosPan(-100, 100)[1]).toBe(0);
});
test('9th simultaneous sound is dropped', async () => {
  const { port, ends } = fake(); await initAudio(port, man); CA2_AjustaVolume(30, 30);
  const id = CA2_CarregaEfeito('./dados/sons/explo.wav');
  const ch = Array.from({ length: 9 }, () => CA2_TocaEfeito(id, 0));
  expect(ch.slice(0, 8).every(c => c >= 0)).toBe(true); expect(ch[8]).toBe(-1);
  expect(new Set(ch.slice(0, 8)).size).toBe(8);
  ends[0](); expect(CA2_TocaEfeito(id, 0)).toBe(ch[0]); // freed channel is reused
});
test('play before unlock is a no-op', async () => {
  const { port, tocados } = fake(false); await initAudio(port, man);
  expect(CA2_TocaEfeito(CA2_CarregaEfeito('./dados/sons/explo.wav'), 0)).toBe(-1);
  expect(tocados.length).toBe(0);
});
test('ids are 1-based, cached by normalised path; unknown path → 0; id 0 is silent and returns 0', async () => {
  const { port, tocados } = fake(); await initAudio(port, man);
  const a = CA2_CarregaEfeito('./dados/sons/click.ogg');
  const b = CA2_CarregaEfeito('dados/sons/explo.wav');
  expect(a).toBe(1); expect(b).toBe(2);
  expect(CA2_CarregaEfeito('./dados/sons/explo.wav')).toBe(2);
  expect(CA2_CarregaEfeito('./dados/sons/tiro3.wav')).toBe(0);
  expect(CA2_TocaEfeito(0, 0)).toBe(0); expect(CA2_TocaEfeitoTela(0, 400)).toBe(0);
  expect(tocados.length).toBe(0);
});
test('effects not decoded yet are dropped (R2)', async () => {
  const { port, tocados } = fake();
  let resolve!: (v: unknown) => void;
  port.decodifica = () => new Promise(r => { resolve = r; });
  const pronto = initAudio(port, { ...man, sounds: { 'dados/sons/explo.wav': { url: 'x' } } });
  const id = CA2_CarregaEfeito('./dados/sons/explo.wav');
  expect(id).toBe(1);
  expect(CA2_TocaEfeito(id, 0)).toBe(-1);
  resolve({}); await pronto;
  expect(CA2_TocaEfeito(id, 0)).toBe(0);
  expect(tocados.length).toBe(1);
});
test('TocaEfeitoTela maps x (clamped 0..800) to pan', async () => {
  const { port, tocados, ends } = fake(); await initAudio(port, man); CA2_AjustaVolume(100, 100);
  const id = CA2_CarregaEfeito('./dados/sons/explo.wav');
  CA2_TocaEfeitoTela(id, -50); CA2_TocaEfeitoTela(id, 400); CA2_TocaEfeitoTela(id, 2000); CA2_TocaEfeitoTela(id, 3);
  const g = (p: number) => { const [l, r] = ganhosPan(p, 100); return { l, r }; };
  expect(tocados[0]).toEqual(g(-100)); expect(tocados[1]).toEqual(g(0)); expect(tocados[2]).toEqual(g(100));
  expect(tocados[3]).toEqual(g(-100)); // trunc(200*3/800) - 100 = -100
  ends.forEach(e => e());
});
test('volume is clamped to 0..100 and quantised to /128', async () => {
  const { port, volumes } = fake(); await initAudio(port, man);
  CA2_AjustaVolume(250, 30);
  expect(volumes.at(-1)).toBe(1);
  CA2_AjustaVolume(30, 30);
  expect(volumes.at(-1)).toBe(38 / 128);
});
test('music: 1-based id, restart with loop when vezes == -1; unknown → 0 and silent', async () => {
  const { port, musicas } = fake(); await initAudio(port, man); CA2_AjustaVolume(30, 30);
  const m = CA2_CarregaMusica('./dados/sons/recharge_alvys18.ogg');
  expect(m).toBe(1); expect(CA2_CarregaMusica('dados/sons/recharge_alvys18.ogg')).toBe(1);
  expect(CA2_CarregaMusica('./nada.ogg')).toBe(0);
  CA2_TocaMusica(0, -1);
  expect(musicas.length).toBe(0);
  CA2_TocaMusica(m, -1);
  expect(musicas).toEqual([{ m4a: 'a.m4a', ogg: 'a.ogg', vol: 38 / 128, loop: true }]);
});
test('desbloqueiaAudio unlocks the port', async () => {
  const { port } = fake(false); await initAudio(port, man);
  const id = CA2_CarregaEfeito('./dados/sons/explo.wav');
  expect(CA2_TocaEfeito(id, 0)).toBe(-1);
  await desbloqueiaAudio();
  expect(CA2_TocaEfeito(id, 0)).toBe(0);
});
test('silent port is always unlocked and frees voices immediately', async () => {
  await initAudio(portaSilenciosa(), man);
  const id = CA2_CarregaEfeito('./dados/sons/explo.wav');
  for (let i = 0; i < 20; i++) expect(CA2_TocaEfeito(id, 0)).toBe(0);
});
test('a rejected decodifica() warns with the URL and the effect stays dropped', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const { port, tocados } = fake();
    const erro = new Error('404');
    port.decodifica = async () => { throw erro; };
    await initAudio(port, { ...man, sounds: { 'dados/sons/explo.wav': { url: 'assets/dados/sons/explo.wav' } } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].join(' ')).toContain('assets/dados/sons/explo.wav');
    expect(warn.mock.calls[0]).toContain(erro);
    const id = CA2_CarregaEfeito('./dados/sons/explo.wav');
    expect(id).toBe(1);
    expect(CA2_TocaEfeito(id, 0)).toBe(-1);
    expect(tocados.length).toBe(0);
  } finally { warn.mockRestore(); }
});
test('a rejected unlock warns instead of being swallowed', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const { port } = fake(false);
    const erro = new Error('resume');
    port.desbloqueia = async () => { throw erro; };
    await initAudio(port, man);
    await expect(desbloqueiaAudio()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toContain(erro);
  } finally { warn.mockRestore(); }
});

test('CA2_PausaMusica / CA2_ContinuaMusica forward to the port (R11); ports without them are a no-op', async () => {
  const f = fake(); const chamadas: string[] = [];
  f.port.pausaMusica = () => { chamadas.push('pausa'); };
  f.port.continuaMusica = () => { chamadas.push('continua'); };
  await initAudio(f.port, man);
  CA2_PausaMusica(); CA2_ContinuaMusica();
  expect(chamadas).toEqual(['pausa', 'continua']);
  const semPausa = fake(); await initAudio(semPausa.port, man);
  expect(() => { CA2_PausaMusica(); CA2_ContinuaMusica(); }).not.toThrow();
  await initAudio(portaSilenciosa(), man);
  expect(() => { CA2_PausaMusica(); CA2_ContinuaMusica(); }).not.toThrow();
});

test('web port: music refused during an iOS interruption starts as soon as the context resumes (no 2nd gesture)', async () => {
  // Minimal AudioContext / HTMLAudioElement stand-ins: the context starts "interrupted" and resume() takes a few
  // ticks; play() is refused while the context is not running (what iOS does after an interruption).
  const estado = { s: 'interrupted' as string };
  const plays: string[] = [];
  const no = () => ({ connect() {}, disconnect() {}, gain: { value: 1 } });
  class CtxFalso {
    get state(): string { return estado.s; }
    destination = {};
    currentTime = 0;
    createGain() { return no(); }
    createMediaElementSource() { return no(); }
    async resume(): Promise<void> { for (let i = 0; i < 3; i++) await Promise.resolve(); estado.s = 'running'; }
  }
  class AudioFalso {
    preload = ''; src = ''; loop = false; muted = false; currentTime = 0;
    canPlayType(): string { return ''; }
    pause(): void {}
    play(): Promise<void> {
      plays.push(estado.s);
      return estado.s === 'running' ? Promise.resolve() : Promise.reject(new Error('NotAllowedError'));
    }
  }
  vi.stubGlobal('AudioContext', CtxFalso);
  vi.stubGlobal('Audio', AudioFalso);
  try {
    const port = criaPortaWebAudio('');
    port.musica('a.m4a', 'a.ogg', 1, true); // requested while interrupted → pending
    expect(plays).toEqual([]);
    await port.desbloqueia();                // one gesture
    await Promise.resolve();
    expect(plays).toEqual(['interrupted', 'running']); // refused inside the gesture, started right after resume()
    expect(port.desbloqueado()).toBe(true);
  } finally { vi.unstubAllGlobals(); }
});

test('initAudio prepares every manifest track up front, so the first gesture can bless them (iOS)', async () => {
  const f = fake(false); const preparadas: string[] = [];
  f.port.preparaMusica = (m4a, ogg) => { preparadas.push(`${m4a}|${ogg}`); };
  await initAudio(f.port, { ...man, music: { './m/a.ogg': { m4a: 'a.m4a', ogg: 'a.ogg' }, './m/b.ogg': { m4a: 'b.m4a', ogg: 'b.ogg' } } });
  expect(preparadas).toEqual(['a.m4a|a.ogg', 'b.m4a|b.ogg']); // before any CA2_CarregaMusica
});

/** Web Audio / HTMLAudioElement stand-ins for criaPortaWebAudio: every play() is recorded with src + muted. */
function stubWebAudio(estadoInicial: string) {
  const estado = { s: estadoInicial };
  const plays: { src: string; muted: boolean; resolve: () => void; reject: () => void }[] = [];
  const no = () => ({ connect() {}, disconnect() {}, gain: { value: 1 } });
  class CtxFalso {
    get state(): string { return estado.s; }
    destination = {};
    currentTime = 0;
    createGain() { return no(); }
    createMediaElementSource() { return no(); }
    async resume(): Promise<void> { estado.s = 'running'; }
  }
  class AudioFalso {
    preload = ''; src = ''; loop = false; muted = false; currentTime = 0;
    canPlayType(): string { return ''; }
    pause(): void {}
    play(): Promise<void> {
      return new Promise((resolve, reject) => { plays.push({ src: this.src, muted: this.muted, resolve: () => resolve(), reject: () => reject(new Error('NotAllowedError')) }); });
    }
  }
  vi.stubGlobal('AudioContext', CtxFalso);
  vi.stubGlobal('Audio', AudioFalso);
  return { estado, plays };
}

test('web port: the first desbloqueiaAudio() blesses both manifest tracks inside the gesture (iOS menu music)', async () => {
  const { plays } = stubWebAudio('suspended');
  try {
    await initAudio(criaPortaWebAudio(''), { ...man, sounds: {}, music: {
      './dados/sons/recharge_alvys18.ogg': { m4a: 'menu.m4a', ogg: 'menu.ogg' }, './dados/sons/esprit.ogg': { m4a: 'jogo.m4a', ogg: 'jogo.ogg' } } });
    expect(plays).toEqual([]);
    const gesto = desbloqueiaAudio(); // splash tap: no CA2_CarregaMusica has run yet
    expect(plays.map(p => [p.src, p.muted])).toEqual([['menu.ogg', true], ['jogo.ogg', true]]); // synchronously, in the gesture
    await gesto;
  } finally { vi.unstubAllGlobals(); }
});

test('web port: a play() that resolves late blesses its own track, not the one current by then', async () => {
  const { plays } = stubWebAudio('running');
  try {
    const port = criaPortaWebAudio('');
    port.musica('a.m4a', 'a.ogg', 1, true);   // A.play() pending
    port.musica('b.m4a', 'b.ogg', 1, true);   // B becomes current, B.play() pending
    expect(plays.map(p => p.src)).toEqual(['a.ogg', 'b.ogg']);
    plays[0].resolve(); plays[1].reject();    // A's (stale) play succeeds, B's is refused
    await Promise.resolve(); await Promise.resolve();
    port.musica('a.m4a', 'a.ogg', 1, true);   // back to A
    await port.desbloqueia();                 // B was never blessed → must be blessed (muted play) now
    expect(plays.slice(3).map(p => [p.src, p.muted])).toEqual([['b.ogg', true]]);
  } finally { vi.unstubAllGlobals(); }
});

test('portaOuSilenciosa: a throwing Web Audio factory falls back to the silent port with a warning (boot never hangs)', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const erro = new Error('AudioContext blocked');
    const p = portaOuSilenciosa(() => { throw erro; });
    expect(p.desbloqueado()).toBe(true);
    expect(() => p.musica('a', 'b', 1)).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]).toContain(erro);
    const real = fake().port;
    expect(portaOuSilenciosa(() => real)).toBe(real);
    expect(warn).toHaveBeenCalledTimes(1);
  } finally { warn.mockRestore(); }
});
