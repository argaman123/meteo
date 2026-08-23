import type { Layer as DeckLayer } from '@deck.gl/core';
import { BitmapLayer } from '@deck.gl/layers';
import type { Buffer, Device, Framebuffer, Texture } from '@luma.gl/core';
import { Model } from '@luma.gl/engine';
import { Grid } from '../../objects/grid';
import { Bounds } from '../../types/wrap';
import { Control, options } from '../../utils/controls';
import { MercatorBand, contains } from '../../utils/geo';
import { AnimatedLayer, AnimatedState } from '../base/animated-layer';
import { Look, LookKind } from '../base/look';

const COUNT = 2000;
const DECAY = 0.94;
const LINE_WIDTH = 2.5;

export interface WindField {
  u: Grid;
  v: Grid;
}

export class WindParticles extends Look<WindField> {
  readonly kind = LookKind.Particles;
  readonly speed = options<number>(1, [
    { value: 0.5, label: '×0.5' },
    { value: 1, label: '×1' },
    { value: 2, label: '×2' },
  ]);
  override readonly controls: Control[] = [this.speed];

  deckLayer(id: string, field: WindField): DeckLayer {
    return new WindParticleLayer({ id, ...field, speed: this.speed });
  }
}

interface ParticleProps extends WindField {
  speed: () => number;
}

interface State extends AnimatedState {
  sim: ParticleSim;
  trails: TrailRenderer;
}

class WindParticleLayer extends AnimatedLayer<ParticleProps> {
  static override layerName = 'WindParticleLayer';
  declare state: State;

  rebuild(): void {
    const [west, south, east, north] = this.props.u.bounds;
    const midLat = (south + north) / 2;
    const viewport = this.context.viewport;
    const cssSpan = Math.abs(
      viewport.project([east, midLat])[0] - viewport.project([west, midLat])[0],
    );
    const width = Math.max(256, Math.min(4096, Math.round(cssSpan * devicePixelRatio)));
    const height = Math.max(2, Math.round((width * (north - south)) / (east - west)));
    this.state.trails?.destroy();
    this.setState({
      sim: new ParticleSim(this.props.u, this.props.v),
      trails: new TrailRenderer(this.context.device, this.props.u.bounds, width, height),
    });
  }

  override renderLayers(): DeckLayer {
    return new BitmapLayer(this.getSubLayerProps({ id: 'trails' }), {
      image: this.state.trails.texture,
      bounds: this.props.u.bounds,
      opacity: 0.85,
    });
  }

  step(deltaSeconds: number): void {
    this.state.sim.advance(deltaSeconds * this.props.speed());
    this.state.trails.paint(this.state.sim.segments);
  }

  override finalizeState(): void {
    super.finalizeState();
    this.state.trails?.destroy();
  }
}

class ParticleSim {
  readonly segments = new Float32Array(COUNT * 4);
  private readonly bounds: Bounds;
  private readonly lonSpan: number;
  private readonly cols = 40;
  private readonly rows: number;
  private cell = 0;
  private readonly headLon = new Float32Array(COUNT);
  private readonly headLat = new Float32Array(COUNT);
  private readonly age = new Float32Array(COUNT);
  private readonly life = new Float32Array(COUNT);

  constructor(
    private readonly u: Grid,
    private readonly v: Grid,
  ) {
    this.bounds = u.bounds;
    const [west, south, east, north] = u.bounds;
    this.lonSpan = east - west;
    this.rows = Math.max(1, Math.round((this.cols * (north - south)) / this.lonSpan));
    for (let i = 0; i < COUNT; i++) {
      this.spawn(i);
      this.age[i] = Math.random() * this.life[i];
    }
  }

  advance(deltaSeconds: number): void {
    const move = 0.004 * this.lonSpan * deltaSeconds;
    for (let i = 0; i < COUNT; i++) {
      this.age[i] += deltaSeconds;
      const headLon = this.headLon[i];
      const headLat = this.headLat[i];
      const u = this.u.valueAt(headLon, headLat, 'nearest');
      const v = this.v.valueAt(headLon, headLat, 'nearest');
      const speed = Math.hypot(u, v);
      if (Number.isNaN(u) || speed === 0 || this.age[i] >= this.life[i]) {
        this.respawn(i);
        continue;
      }
      const step = Math.min(25, Math.max(3, speed)) * move;
      const nextLon = headLon + (u / speed) * step;
      const nextLat = headLat + (v / speed) * step;
      if (!contains(this.bounds, nextLon, nextLat)) {
        this.respawn(i);
        continue;
      }
      this.writeSegment(i, headLon, headLat, nextLon, nextLat);
      this.headLon[i] = nextLon;
      this.headLat[i] = nextLat;
    }
  }

  private respawn(i: number): void {
    this.spawn(i);
    this.writeSegment(i, this.headLon[i], this.headLat[i], this.headLon[i], this.headLat[i]);
  }

  private writeSegment(i: number, fromLon: number, fromLat: number, toLon: number, toLat: number): void {
    this.segments[i * 4] = fromLon;
    this.segments[i * 4 + 1] = fromLat;
    this.segments[i * 4 + 2] = toLon;
    this.segments[i * 4 + 3] = toLat;
  }

  private spawn(i: number): void {
    const PRIME_STRIDE = 7919;
    const [west, south, , north] = this.bounds;
    this.cell = (this.cell + PRIME_STRIDE) % (this.cols * this.rows);
    this.headLon[i] = west + (((this.cell % this.cols) + Math.random()) / this.cols) * this.lonSpan;
    this.headLat[i] =
      north - ((Math.floor(this.cell / this.cols) + Math.random()) / this.rows) * (north - south);
    this.age[i] = 0;
    this.life[i] = 1.5 + Math.random() * 2;
  }
}

// TODO: UNVERIFIED CODE BELOW
const FADE_VS = `#version 300 es
in vec2 corner;
out vec2 uv;
void main() {
  uv = corner * 0.5 + 0.5;
  gl_Position = vec4(corner, 0.0, 1.0);
}`;

const FADE_FS = `#version 300 es
precision highp float;
uniform sampler2D previousFrame;
in vec2 uv;
out vec4 fragColor;
void main() {
  float alpha = floor(texture(previousFrame, uv).a * ${DECAY} * 255.0) / 255.0;
  fragColor = vec4(1.0, 1.0, 1.0, alpha);
}`;

function lineVs(width: number, height: number): string {
  return `#version 300 es
in vec2 corner;
in vec4 segment;
out float edge;
const vec2 resolution = vec2(${width}.0, ${height}.0);
const float halfWidth = float(${LINE_WIDTH * devicePixelRatio}) / 2.0;
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

const LINE_FS = `#version 300 es
precision highp float;
in float edge;
out vec4 fragColor;
void main() {
  fragColor = vec4(1.0, 1.0, 1.0, 0.9 * (1.0 - smoothstep(0.5, 1.0, abs(edge))));
}`;

class TrailRenderer {
  private readonly west: number;
  private readonly lonSpan: number;
  private readonly band: MercatorBand;
  private readonly normalized = new Float32Array(COUNT * 4);
  private readonly framebuffers: Framebuffer[];
  private flip = 0;
  private readonly segmentBuffer: Buffer;
  private readonly fadeCornerBuffer: Buffer;
  private readonly lineCornerBuffer: Buffer;
  private readonly fade: Model;
  private readonly lines: Model;

  constructor(
    private readonly device: Device,
    bounds: Bounds,
    width: number,
    height: number,
  ) {
    const [west, south, east, north] = bounds;
    this.west = west;
    this.lonSpan = east - west;
    this.band = new MercatorBand(north, south);
    this.framebuffers = [this.createFramebuffer(width, height), this.createFramebuffer(width, height)];
    this.fadeCornerBuffer = device.createBuffer({ data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]) });
    this.lineCornerBuffer = device.createBuffer({ data: new Float32Array([0, -1, 0, 1, 1, -1, 1, 1]) });
    this.segmentBuffer = device.createBuffer({ data: this.normalized });
    this.fade = new Model(device, {
      id: 'wind-trail-fade',
      vs: FADE_VS,
      fs: FADE_FS,
      topology: 'triangle-strip',
      vertexCount: 4,
      bufferLayout: [{ name: 'corner', format: 'float32x2' }],
      parameters: { depthWriteEnabled: false, depthCompare: 'always' },
    });
    this.fade.setAttributes({ corner: this.fadeCornerBuffer });
    this.lines = new Model(device, {
      id: 'wind-trail-lines',
      vs: lineVs(width, height),
      fs: LINE_FS,
      topology: 'triangle-strip',
      vertexCount: 4,
      instanceCount: COUNT,
      isInstanced: true,
      bufferLayout: [
        { name: 'corner', format: 'float32x2' },
        { name: 'segment', format: 'float32x4', stepMode: 'instance' },
      ],
      parameters: {
        depthWriteEnabled: false,
        depthCompare: 'always',
        blendColorOperation: 'add',
        blendColorSrcFactor: 'src-alpha',
        blendColorDstFactor: 'one-minus-src-alpha',
        blendAlphaOperation: 'add',
        blendAlphaSrcFactor: 'one',
        blendAlphaDstFactor: 'one-minus-src-alpha',
      },
    });
    this.lines.setAttributes({ corner: this.lineCornerBuffer, segment: this.segmentBuffer });
  }

  get texture(): Texture {
    return this.framebuffers[this.flip].colorAttachments[0].texture;
  }

  paint(geoSegments: Float32Array): void {
    for (let i = 0; i < COUNT; i++) {
      this.normalized[i * 4] = (geoSegments[i * 4] - this.west) / this.lonSpan;
      this.normalized[i * 4 + 1] = this.band.fractionOf(geoSegments[i * 4 + 1]);
      this.normalized[i * 4 + 2] = (geoSegments[i * 4 + 2] - this.west) / this.lonSpan;
      this.normalized[i * 4 + 3] = this.band.fractionOf(geoSegments[i * 4 + 3]);
    }
    this.segmentBuffer.write(this.normalized);
    const target = this.framebuffers[1 - this.flip];
    this.fade.setBindings({ previousFrame: this.texture });
    const pass = this.device.beginRenderPass({ framebuffer: target, clearColor: [0, 0, 0, 0] });
    this.fade.draw(pass);
    this.lines.draw(pass);
    pass.end();
    this.flip = 1 - this.flip;
  }

  destroy(): void {
    this.fade.destroy();
    this.lines.destroy();
    this.fadeCornerBuffer.destroy();
    this.lineCornerBuffer.destroy();
    this.segmentBuffer.destroy();
    for (const framebuffer of this.framebuffers) {
      framebuffer.colorAttachments[0].texture.destroy();
      framebuffer.destroy();
    }
  }

  private createFramebuffer(width: number, height: number): Framebuffer {
    return this.device.createFramebuffer({
      width,
      height,
      colorAttachments: [
        this.device.createTexture({
          width,
          height,
          format: 'rgba8unorm',
          sampler: {
            minFilter: 'linear',
            magFilter: 'linear',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
          },
        }),
      ],
    });
  }
}
