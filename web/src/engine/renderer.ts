// Rendering backends replacing Chien2D 2's OpenGL path (chien2d2_gl.cpp, chien2d2primitivas_gl.cpp).
// 800x600 logical canvas, top-left origin, y down; straight (non-premultiplied) alpha.

export interface Quad { tex: number; sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number; alpha: number }

export interface Backend {
  criaTextura(img: TexImageSource | null, w: number, h: number): number;
  limpa(): void;
  quad(q: Quad): void;
  pontos(xy: Int32Array, n: number, r: number, g: number, b: number): void;
  fimQuadro(): void;
}

export const LARGURA_TELA = 800, ALTURA_TELA = 600;
/** Vertex layout: pos.xy, uv.xy, alpha, cor.rgb */
export const FLOATS_POR_VERTICE = 8;
const VERTICES_POR_QUAD = 6;
const MAX_QUADS = 4096;

/** Engine texture size: square POT from 16 to 1024 holding the image top-left (orig: chien2d2_gl.cpp:430-470). */
export function tamanhoTextura(w: number, h: number): number {
  const maior = Math.max(w, h);
  let t = 16;
  while (t < maior && t < 1024) t *= 2;
  return t;
}

/**
 * Writes the 6 vertices (TL,TR,BR / BR,BL,TL, as DesenhaSpriteEfeito's triangles, chien2d2_gl.cpp:661-718)
 * of a quad into `out` at float offset `off`. The texture's top-left texel always maps to (dx,dy) and its
 * bottom-right to (dx+dw, dy+dh), so negative sizes mirror the image exactly like the GL original.
 */
export function verticesQuad(q: Quad, texW: number, texH: number, r: number, g: number, b: number, out: Float32Array, off: number): void {
  const x0 = q.dx, y0 = q.dy, x1 = q.dx + q.dw, y1 = q.dy + q.dh;
  const u0 = q.sx / texW, v0 = q.sy / texH, u1 = (q.sx + q.sw) / texW, v1 = (q.sy + q.sh) / texH;
  const a = q.alpha;
  let o = off;
  const v = (x: number, y: number, u: number, t: number) => {
    out[o] = x; out[o + 1] = y; out[o + 2] = u; out[o + 3] = t; out[o + 4] = a; out[o + 5] = r; out[o + 6] = g; out[o + 7] = b;
    o += FLOATS_POR_VERTICE;
  };
  v(x0, y0, u0, v0); v(x1, y0, u1, v0); v(x1, y1, u1, v1);
  v(x1, y1, u1, v1); v(x0, y1, u0, v1); v(x0, y0, u0, v0);
}

/** Headless backend for tests and simulation: records what would be drawn. */
export class RecordingBackend implements Backend {
  quads: Quad[] = [];
  limpezas = 0;
  quadros = 0;
  pontosGravados: { xy: Int32Array; n: number; r: number; g: number; b: number }[] = [];
  private nTex = 0;
  criaTextura(_img: TexImageSource | null, _w: number, _h: number): number { return ++this.nTex; }
  limpa(): void { this.limpezas++; }
  quad(q: Quad): void { this.quads.push({ ...q }); }
  pontos(xy: Int32Array, n: number, r: number, g: number, b: number): void { this.pontosGravados.push({ xy: xy.slice(0, 2 * n), n, r, g, b }); }
  fimQuadro(): void { this.quadros++; }
}

const VS = `#version 300 es
in vec2 aPos; in vec2 aUV; in float aAlpha; in vec3 aCor;
out vec2 vUV; out vec4 vCor;
void main() {
  vUV = aUV; vCor = vec4(aCor, aAlpha);
  gl_Position = vec4(aPos.x * (2.0 / 800.0) - 1.0, 1.0 - aPos.y * (2.0 / 600.0), 0.0, 1.0);
}`;
const FS = `#version 300 es
precision highp float;
in vec2 vUV; in vec4 vCor; uniform sampler2D uTex; out vec4 cor;
void main() { cor = texture(uTex, vUV) * vCor; }`;

interface Textura { img: TexImageSource | null; w: number; h: number; lado: number; gl: WebGLTexture | null }

/**
 * WebGL2 backend: one dynamic VBO, quads batched while the texture stays the same; flushed on texture
 * switch, full buffer and fimQuadro. Points are 1x1 quads of a white texture tinted (r,g,b)/255.
 * Textures are padded into the engine's POT square (zero-filled), LINEAR filtering, CLAMP_TO_EDGE.
 */
export class WebGL2Backend implements Backend {
  private gl!: WebGL2RenderingContext;
  private prog: WebGLProgram | null = null;
  private vbo: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private readonly dados = new Float32Array(MAX_QUADS * VERTICES_POR_QUAD * FLOATS_POR_VERTICE);
  private nQuads = 0;
  private texAtual = -1;
  private readonly texturas: Textura[] = [];
  private readonly branca: number;
  private perdido = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.width = LARGURA_TELA; canvas.height = ALTURA_TELA;
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.perdido = true; this.nQuads = 0; this.texAtual = -1; }, false);
    canvas.addEventListener('webglcontextrestored', () => { this.iniciaGL(); for (const t of this.texturas) this.envia(t); this.perdido = false; }, false);
    this.iniciaGL();
    const px = new ImageData(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1);
    this.branca = this.criaTextura(px, 1, 1);
  }

  private iniciaGL(): void {
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, depth: false, stencil: false });
    if (!gl) throw new Error('WebGL2 indisponível');
    this.gl = gl;
    const sh = (tipo: number, src: string) => {
      const s = gl.createShader(tipo)!; gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('programa: ' + gl.getProgramInfoLog(p));
    this.prog = p;
    gl.useProgram(p);
    gl.uniform1i(gl.getUniformLocation(p, 'uTex'), 0);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.dados.byteLength, gl.DYNAMIC_DRAW);
    const passo = FLOATS_POR_VERTICE * 4;
    const attr = (nome: string, n: number, off: number) => {
      const l = gl.getAttribLocation(p, nome);
      if (l < 0) return;
      gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, passo, off * 4);
    };
    attr('aPos', 2, 0); attr('aUV', 2, 2); attr('aAlpha', 1, 4); attr('aCor', 3, 5);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.activeTexture(gl.TEXTURE0);
    gl.viewport(0, 0, LARGURA_TELA, ALTURA_TELA);
    this.texAtual = -1; this.nQuads = 0;
  }

  private envia(t: Textura): void {
    const gl = this.gl;
    t.gl = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t.gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, t.lado, t.lado, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); // zero-filled (WebGL spec)
    if (t.img) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, t.img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.texAtual = -1;
  }

  criaTextura(img: TexImageSource | null, w: number, h: number): number {
    const t: Textura = { img, w, h, lado: tamanhoTextura(w, h), gl: null };
    this.texturas.push(t);
    if (!this.perdido) { this.descarrega(); this.envia(t); }
    return this.texturas.length - 1;
  }

  private descarrega(): void {
    if (this.nQuads === 0 || this.perdido) { this.nQuads = 0; return; }
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.dados, 0, this.nQuads * VERTICES_POR_QUAD * FLOATS_POR_VERTICE);
    gl.drawArrays(gl.TRIANGLES, 0, this.nQuads * VERTICES_POR_QUAD);
    this.nQuads = 0;
  }

  private adiciona(q: Quad, r: number, g: number, b: number): void {
    if (this.perdido) return;
    const t = this.texturas[q.tex];
    if (!t) return;
    if (q.tex !== this.texAtual) {
      this.descarrega();
      this.gl.bindTexture(this.gl.TEXTURE_2D, t.gl);
      this.texAtual = q.tex;
    } else if (this.nQuads === MAX_QUADS) this.descarrega();
    verticesQuad(q, t.lado, t.lado, r, g, b, this.dados, this.nQuads * VERTICES_POR_QUAD * FLOATS_POR_VERTICE);
    this.nQuads++;
  }

  limpa(): void {
    if (this.perdido) return;
    this.descarrega();
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  quad(q: Quad): void { this.adiciona(q, 1, 1, 1); }

  pontos(xy: Int32Array, n: number, r: number, g: number, b: number): void {
    const p: Quad = { tex: this.branca, sx: 0, sy: 0, sw: 1, sh: 1, dx: 0, dy: 0, dw: 1, dh: 1, alpha: 1 };
    for (let i = 0; i < n; i++) { p.dx = xy[2 * i]; p.dy = xy[2 * i + 1]; this.adiciona(p, r / 255, g / 255, b / 255); }
  }

  fimQuadro(): void { this.descarrega(); }
}
