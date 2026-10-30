import { HEADER, PROGRAMS, type ProgramId } from './programs'

const VERT = `attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`

export interface ShaderLook { program: ProgramId; colors: string[]; params: [number, number, number, number] }

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader compile failed')
  return s
}

/** A tiny WebGL1 renderer: one full-screen triangle, one fragment program per look. */
export class ShaderRenderer {
  readonly gl: WebGLRenderingContext
  private programs = new Map<ProgramId, WebGLProgram>()
  private buf: WebGLBuffer

  constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true })
    if (!gl) throw new Error('WebGL unavailable')
    this.gl = gl
    this.buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  }

  private program(id: ProgramId) {
    let p = this.programs.get(id)
    if (!p) {
      const gl = this.gl
      p = gl.createProgram()!
      gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VERT))
      gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, HEADER + PROGRAMS[id]))
      gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link failed')
      this.programs.set(id, p)
    }
    return p
  }

  draw(look: ShaderLook, time: number) {
    const gl = this.gl
    if (gl.isContextLost()) return
    const p = this.program(look.program)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(p)
    const loc = gl.getAttribLocation(p, 'aPos')
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf)
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    gl.uniform2f(gl.getUniformLocation(p, 'uRes'), this.canvas.width, this.canvas.height)
    gl.uniform1f(gl.getUniformLocation(p, 'uTime'), time)
    const cols = new Float32Array(18)
    for (let i = 0; i < 6; i++) cols.set(rgb(look.colors[i] ?? look.colors[look.colors.length - 1]), i * 3)
    gl.uniform3fv(gl.getUniformLocation(p, 'uC'), cols)
    gl.uniform4fv(gl.getUniformLocation(p, 'uP'), look.params)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** Frees GPU objects. The context itself is left for the browser to reclaim with the canvas:
   *  forcing loseContext() here would leave a reused canvas permanently dead (gray). */
  dispose() {
    if (this.gl.isContextLost()) return
    for (const p of this.programs.values()) this.gl.deleteProgram(p)
    this.programs.clear()
  }
}

let thumbRenderer: ShaderRenderer | null = null
const thumbCache = new Map<string, string>()

/** Renders a look once into a shared offscreen context and returns a JPEG data URL. */
export function shaderThumb(key: string, look: ShaderLook, w = 320, h = 180) {
  const hit = thumbCache.get(key)
  if (hit) return hit
  try {
    if (!thumbRenderer) {
      const cv = document.createElement('canvas')
      cv.width = w; cv.height = h
      thumbRenderer = new ShaderRenderer(cv)
    }
    thumbRenderer.draw(look, 12)
    const url = thumbRenderer.canvas.toDataURL('image/jpeg', 0.85)
    thumbCache.set(key, url)
    return url
  } catch {
    return ''
  }
}
