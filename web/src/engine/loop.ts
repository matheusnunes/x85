// Fixed-step game clock. Replaces the per-screen `while(...) { ...; C2D2_Sincroniza(); }` loops of the original
// (orig: chien2d2_gl.cpp:235 C2D2GL_Sincroniza paces to >= 16 ms per frame; 02-engine §1, §5): each loop body
// becomes `passo()`, run at a fixed 60 Hz from requestAnimationFrame regardless of the display rate.

const EPS_MS = 1e-6;          // float slack so k*(1000/60) accumulations do not lose a step
const TOLERANCIA_VSYNC = 0.5; // ms: a frame within this of k whole steps counts as exactly k steps (vsync jitter)

export class PassoFixo {
  private readonly passoMs: number;
  private acumulado = 0;
  private ultimo: number | null = null;
  private _pausado = false;

  constructor(private readonly passo: () => void, hz = 60, private readonly maxPassos = 4) {
    this.passoMs = 1000 / hz;
  }

  get pausado(): boolean { return this._pausado; }

  /** Advances the clock to `agoraMs` and runs the due steps (at most maxPassos; the rest is dropped). The first tick runs 1 step. */
  tick(agoraMs: number): number {
    if (this._pausado) return 0;
    if (this.ultimo === null) {
      this.ultimo = agoraMs; this.acumulado = 0;
      this.passo();
      return 1;
    }
    let delta = agoraMs - this.ultimo;
    this.ultimo = agoraMs;
    if (delta <= 0) return 0; // timestamp older than retomar(): nothing elapsed
    const k = Math.round(delta / this.passoMs);
    if (k >= 1 && k <= this.maxPassos && Math.abs(delta - k * this.passoMs) < TOLERANCIA_VSYNC) delta = k * this.passoMs;
    this.acumulado += delta;
    let n = 0;
    while (this.acumulado + EPS_MS >= this.passoMs && n < this.maxPassos) {
      this.passo();
      this.acumulado -= this.passoMs;
      n++;
    }
    if (this.acumulado + EPS_MS >= this.passoMs) this.acumulado = 0; // long hitch: drop the backlog, no spiral
    if (this.acumulado < 0) this.acumulado = 0;
    return n;
  }

  pausar(): void { this._pausado = true; }

  /** Resumes with an empty accumulator: time spent paused/hidden is never caught up. */
  retomar(agoraMs: number): void {
    this._pausado = false;
    this.ultimo = agoraMs;
    this.acumulado = 0;
  }
}

/** Measured render rate: rAF callbacks counted over windows of >= 0.5 s (Ruling R6). */
export class MedidorFps {
  private inicio: number | null = null;
  private quadros = 0;
  private valor = 0;

  quadro(agoraMs: number): void {
    if (this.inicio === null) { this.inicio = agoraMs; this.quadros = 0; return; }
    this.quadros++;
    const dt = agoraMs - this.inicio;
    if (dt >= 500) {
      this.valor = Math.round((this.quadros * 1000) / dt);
      this.inicio = agoraMs; this.quadros = 0;
    }
  }

  /** Last completed window's rate (0 before the first window completes). */
  fps(): number { return this.valor; }

  /** Starts a new window (after the tab was hidden); keeps reporting the last value meanwhile. */
  reinicia(): void { this.inicio = null; this.quadros = 0; }
}

export interface Loop {
  /** Cancels the rAF loop and removes the visibility listener. */
  stop(): void;
  /** Measured render fps (rAF rate, 0.5 s window) — not the logic rate, which is always 60 Hz. */
  fps(): number;
}

/** rAF driver: pauses the clock while the document is hidden and resumes it without catch-up. */
export function iniciaLoop(p: PassoFixo, alvo: Window = window): Loop {
  const medidor = new MedidorFps();
  const doc = alvo.document;
  let pedido = 0;
  let ativo = true;
  const quadro = (t: number): void => {
    if (!ativo) return;
    medidor.quadro(t);
    p.tick(t);
    pedido = alvo.requestAnimationFrame(quadro);
  };
  const onVisibilidade = (): void => {
    if (doc.visibilityState === 'hidden') { p.pausar(); medidor.reinicia(); }
    else if (p.pausado) p.retomar(alvo.performance.now());
  };
  doc.addEventListener('visibilitychange', onVisibilidade);
  if (doc.visibilityState === 'hidden') p.pausar();
  pedido = alvo.requestAnimationFrame(quadro);
  return {
    stop() { ativo = false; alvo.cancelAnimationFrame(pedido); doc.removeEventListener('visibilitychange', onVisibilidade); },
    fps: () => medidor.fps(),
  };
}
