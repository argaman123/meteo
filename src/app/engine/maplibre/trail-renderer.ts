// TODO: UNVERIFIED CODE BELOW
import maplibregl from 'maplibre-gl';
import { rgb } from 'd3-color';
import { Quality, quality } from '../../pages/home/settings-panel/settings-controls';
import { Bounds } from '../../types/wrap';
import { MercatorBand } from '../../utils/geo';
import type { TrailOverlay } from '../base/overlay';
import { coverageOf } from './image-renderer';
import { OverlayRenderer } from './overlay-renderer';

export class TrailRenderer extends OverlayRenderer<TrailOverlay> {
  private layer: TrailLayer | null = null;

  layerIds(): string[] {
    return [this.id];
  }

  override destroy(): void {
    super.destroy();
    this.layer = null;
  }

  protected override sourceIds(): string[] {
    return [];
  }

  protected add(): void {
    this.layer = new TrailLayer(this.id, () => this.overlay);
    this.map.addLayer(this.layer);
  }

  protected update(overlay: TrailOverlay, previous: TrailOverlay): void {
    const rebuild =
      overlay.ink !== previous.ink ||
      overlay.lineWidth !== previous.lineWidth ||
      overlay.bounds.some((value, index) => value !== previous.bounds[index]);
    if (rebuild) this.layer?.reset();
    this.map.triggerRepaint();
  }
}

const FADE_VS = `#version 300 es
in vec2 corner;
out vec2 uv;
void main() {
  uv = corner * 0.5 + 0.5;
  gl_Position = vec4(corner, 0.0, 1.0);
}`;

function fadeFs(ink: string): string {
  return `#version 300 es
precision highp float;
uniform sampler2D previousFrame;
uniform float decay;
in vec2 uv;
out vec4 fragColor;
void main() {
  float alpha = floor(texture(previousFrame, uv).a * decay * 255.0) / 255.0;
  fragColor = vec4(${ink}, alpha);
}`;
}

function lineVs(width: number, height: number, lineWidth: number): string {
  return `#version 300 es
in vec2 corner;
in vec4 segment;
out float edge;
const vec2 resolution = vec2(${width}.0, ${height}.0);
const float halfWidth = float(${lineWidth}) / 2.0;
void main() {
  edge = corner.y;
  vec2 from = segment.xy * resolution;
  vec2 to = segment.zw * resolution;
  vec2 direction = to - from;
  vec2 normal = vec2(-direction.y, direction.x) / max(length(direction), 0.0001);
  vec2 position = mix(from, to, corner.x) + normal * corner.y * halfWidth;
  gl_Position = vec4((position / resolution) * 2.0 - 1.0, 0.0, 1.0);
}`;
}

function lineFs(ink: string): string {
  return `#version 300 es
precision highp float;
in float edge;
out vec4 fragColor;
void main() {
  fragColor = vec4(${ink}, 0.9 * (1.0 - smoothstep(0.5, 1.0, abs(edge))));
}`;
}

function showVs(shaderData: maplibregl.CustomRenderMethodInput['shaderData']): string {
  return `#version 300 es
${shaderData.vertexShaderPrelude}
${shaderData.define}
in vec2 mercator;
in vec2 texcoord;
out vec2 uv;
void main() {
  uv = texcoord;
  gl_Position = projectTile(mercator);
}`;
}

const SHOW_FS = `#version 300 es
precision highp float;
uniform sampler2D trails;
uniform float opacity;
in vec2 uv;
out vec4 fragColor;
void main() {
  vec4 color = texture(trails, uv);
  float alpha = color.a * opacity;
  fragColor = vec4(color.rgb * alpha, alpha);
}`;

const MESH_STEPS = 16;

interface Target {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
}

interface Resources {
  width: number;
  height: number;
  west: number;
  lonSpan: number;
  band: MercatorBand;
  normalized: Float32Array;
  targets: Target[];
  flip: number;
  fade: WebGLProgram;
  lines: WebGLProgram;
  fadeVao: WebGLVertexArrayObject;
  linesVao: WebGLVertexArrayObject;
  segmentBuffer: WebGLBuffer;
  meshVao: WebGLVertexArrayObject | null;
  meshVertexCount: number;
  buffers: WebGLBuffer[];
}

class TrailLayer implements maplibregl.CustomLayerInterface {
  readonly type = 'custom';
  readonly renderingMode = '2d';
  private map: maplibregl.Map | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private resources: Resources | null = null;
  private showPrograms = new Map<string, WebGLProgram>();
  private lastTime = performance.now();

  constructor(
    readonly id: string,
    private readonly overlayOf: () => TrailOverlay | null,
  ) {}

  onAdd(map: maplibregl.Map, gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    this.map = map;
    this.gl = gl as WebGL2RenderingContext;
  }

  onRemove(): void {
    this.reset();
    for (const program of this.showPrograms.values()) this.gl?.deleteProgram(program);
    this.showPrograms.clear();
  }

  reset(): void {
    const gl = this.gl;
    const resources = this.resources;
    this.resources = null;
    if (!gl || !resources) return;
    for (const target of resources.targets) {
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
    }
    gl.deleteProgram(resources.fade);
    gl.deleteProgram(resources.lines);
    gl.deleteVertexArray(resources.fadeVao);
    gl.deleteVertexArray(resources.linesVao);
    if (resources.meshVao) gl.deleteVertexArray(resources.meshVao);
    for (const buffer of resources.buffers) gl.deleteBuffer(buffer);
  }

  prerender(): void {
    const gl = this.gl;
    const overlay = this.overlayOf();
    if (!gl || !overlay) return;
    const now = performance.now();
    if (quality() === Quality.Low && now - this.lastTime < 30) return;
    const deltaSeconds = Math.min(0.1, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    const previousFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const previousViewport = gl.getParameter(gl.VIEWPORT) as Int32Array;
    const previousProgram = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram | null;
    const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING) as WebGLVertexArrayObject | null;
    const previousTexture = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
    const blend = gl.isEnabled(gl.BLEND);
    const depth = gl.isEnabled(gl.DEPTH_TEST);
    const stencil = gl.isEnabled(gl.STENCIL_TEST);
    const scissor = gl.isEnabled(gl.SCISSOR_TEST);
    const previousArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING) as WebGLBuffer | null;
    const resources = (this.resources ??= this.createResources(gl, overlay));
    const segments = overlay.advance(deltaSeconds);
    const count = segments.length / 4;
    for (let i = 0; i < count; i++) {
      resources.normalized[i * 4] = (segments[i * 4] - resources.west) / resources.lonSpan;
      resources.normalized[i * 4 + 1] = resources.band.fractionOf(segments[i * 4 + 1]);
      resources.normalized[i * 4 + 2] = (segments[i * 4 + 2] - resources.west) / resources.lonSpan;
      resources.normalized[i * 4 + 3] = resources.band.fractionOf(segments[i * 4 + 3]);
    }

    const source = resources.targets[resources.flip];
    const target = resources.targets[1 - resources.flip];
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, resources.width, resources.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.disable(gl.BLEND);
    gl.useProgram(resources.fade);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, source.texture);
    gl.uniform1i(gl.getUniformLocation(resources.fade, 'previousFrame'), 0);
    gl.uniform1f(gl.getUniformLocation(resources.fade, 'decay'), Math.pow(overlay.decay, deltaSeconds * 120));
    gl.bindVertexArray(resources.fadeVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(resources.lines);
    gl.bindBuffer(gl.ARRAY_BUFFER, resources.segmentBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, resources.normalized);
    gl.bindVertexArray(resources.linesVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
    resources.flip = 1 - resources.flip;

    gl.bindVertexArray(previousVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, previousArrayBuffer);
    gl.useProgram(previousProgram);
    gl.bindTexture(gl.TEXTURE_2D, previousTexture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, previousFramebuffer);
    gl.viewport(previousViewport[0], previousViewport[1], previousViewport[2], previousViewport[3]);
    if (blend) gl.enable(gl.BLEND);
    else gl.disable(gl.BLEND);
    if (depth) gl.enable(gl.DEPTH_TEST);
    if (stencil) gl.enable(gl.STENCIL_TEST);
    if (scissor) gl.enable(gl.SCISSOR_TEST);
  }

  render(gl: WebGLRenderingContext | WebGL2RenderingContext, input: maplibregl.CustomRenderMethodInput): void {
    const context = gl as WebGL2RenderingContext;
    const overlay = this.overlayOf();
    const resources = this.resources;
    if (!overlay || !resources) {
      this.map?.triggerRepaint();
      return;
    }
    const program = this.showProgramOf(context, input.shaderData);
    resources.meshVao ??= this.createMesh(context, program, resources, overlay.bounds);
    context.useProgram(program);
    const projection = input.defaultProjectionData;
    const location = (name: string) => context.getUniformLocation(program, name);
    context.uniformMatrix4fv(location('u_projection_matrix'), false, projection.mainMatrix);
    const tile = location('u_projection_tile_mercator_coords');
    if (tile) context.uniform4f(tile, ...projection.tileMercatorCoords);
    const clipping = location('u_projection_clipping_plane');
    if (clipping) context.uniform4f(clipping, ...projection.clippingPlane);
    const transition = location('u_projection_transition');
    if (transition) context.uniform1f(transition, projection.projectionTransition);
    const fallback = location('u_projection_fallback_matrix');
    if (fallback) context.uniformMatrix4fv(fallback, false, projection.fallbackMatrix);
    context.activeTexture(context.TEXTURE0);
    context.bindTexture(context.TEXTURE_2D, resources.targets[resources.flip].texture);
    context.uniform1i(location('trails'), 0);
    context.uniform1f(location('opacity'), coverageOf(overlay.opacity));
    context.bindVertexArray(resources.meshVao);
    context.drawArrays(context.TRIANGLES, 0, resources.meshVertexCount);
    context.bindVertexArray(null);
    this.map?.triggerRepaint();
  }

  private createResources(gl: WebGL2RenderingContext, overlay: TrailOverlay): Resources {
    const [west, south, east, north] = overlay.bounds;
    const midLat = (south + north) / 2;
    const map = this.map!;
    const span = Math.abs(map.project([east, midLat]).x - map.project([west, midLat]).x);
    const pixelRatio = quality() === Quality.Low ? devicePixelRatio / 2 : devicePixelRatio;
    const width = Math.max(256, Math.min(4096, Math.round(span * pixelRatio)));
    const height = Math.max(2, Math.round((width * (north - south)) / (east - west)));
    const ink = inkVector(overlay.ink);
    const fade = createProgram(gl, FADE_VS, fadeFs(ink));
    const lines = createProgram(gl, lineVs(width, height, overlay.lineWidth * pixelRatio), lineFs(ink));
    const fadeCorners = createBuffer(gl, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    const lineCorners = createBuffer(gl, new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]));
    const probe = overlay.advance(0);
    const normalized = new Float32Array(probe.length);
    const segmentBuffer = createBuffer(gl, normalized, gl.DYNAMIC_DRAW);

    const fadeVao = gl.createVertexArray()!;
    gl.bindVertexArray(fadeVao);
    bindAttribute(gl, fade, 'corner', fadeCorners, 2, 0);
    const linesVao = gl.createVertexArray()!;
    gl.bindVertexArray(linesVao);
    bindAttribute(gl, lines, 'corner', lineCorners, 2, 0);
    bindAttribute(gl, lines, 'segment', segmentBuffer, 4, 1);
    gl.bindVertexArray(null);

    return {
      width,
      height,
      west,
      lonSpan: east - west,
      band: new MercatorBand(north, south),
      normalized,
      targets: [createTarget(gl, width, height), createTarget(gl, width, height)],
      flip: 0,
      fade,
      lines,
      fadeVao,
      linesVao,
      segmentBuffer,
      meshVao: null,
      meshVertexCount: 0,
      buffers: [fadeCorners, lineCorners, segmentBuffer],
    };
  }

  private createMesh(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    resources: Resources,
    [west, , east]: Bounds,
  ): WebGLVertexArrayObject {
    const positions: number[] = [];
    const texcoords: number[] = [];
    const corner = (column: number, row: number) => {
      const u = column / MESH_STEPS;
      const v = row / MESH_STEPS;
      const lon = west + u * (east - west);
      const lat = resources.band.latAt(v);
      const mercator = maplibregl.MercatorCoordinate.fromLngLat([lon, lat]);
      positions.push(mercator.x, mercator.y);
      texcoords.push(u, v);
    };
    for (let row = 0; row < MESH_STEPS; row++) {
      for (let column = 0; column < MESH_STEPS; column++) {
        corner(column, row);
        corner(column + 1, row);
        corner(column, row + 1);
        corner(column + 1, row);
        corner(column + 1, row + 1);
        corner(column, row + 1);
      }
    }
    const positionBuffer = createBuffer(gl, new Float32Array(positions));
    const texcoordBuffer = createBuffer(gl, new Float32Array(texcoords));
    resources.buffers.push(positionBuffer, texcoordBuffer);
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    bindAttribute(gl, program, 'mercator', positionBuffer, 2, 0);
    bindAttribute(gl, program, 'texcoord', texcoordBuffer, 2, 0);
    gl.bindVertexArray(null);
    resources.meshVertexCount = positions.length / 2;
    return vao;
  }

  private showProgramOf(
    gl: WebGL2RenderingContext,
    shaderData: maplibregl.CustomRenderMethodInput['shaderData'],
  ): WebGLProgram {
    let program = this.showPrograms.get(shaderData.variantName);
    if (!program) {
      program = createProgram(gl, showVs(shaderData), SHOW_FS);
      this.showPrograms.set(shaderData.variantName, program);
      if (this.resources?.meshVao) {
        gl.deleteVertexArray(this.resources.meshVao);
        this.resources.meshVao = null;
      }
    }
    return program;
  }
}

function inkVector(hex: string): string {
  const color = rgb(hex);
  return [color.r, color.g, color.b].map((channel) => (channel / 255).toFixed(4)).join(', ');
}

function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram()!;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`trails shader: ${gl.getShaderInfoLog(shader)}`);
    }
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`trails program: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function createBuffer(gl: WebGL2RenderingContext, data: Float32Array, usage: number = gl.STATIC_DRAW): WebGLBuffer {
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  return buffer;
}

function bindAttribute(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
  buffer: WebGLBuffer,
  size: number,
  divisor: number,
): void {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(location, divisor);
}

function createTarget(gl: WebGL2RenderingContext, width: number, height: number): Target {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const framebuffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  return { framebuffer, texture };
}
