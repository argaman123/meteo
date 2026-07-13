import { signal } from '@angular/core';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { BitmapLayer } from '@deck.gl/layers';
import { Grid } from '../../objects/grid';
import { Bounds } from '../../types/wrap';
import { contains } from '../../utils/geo';
import { AnimatedLayer, AnimatedState } from '../base/animated-layer';
import { GeoCanvas } from '../base/geo-canvas';
import { Look, LookKind } from '../base/look';

const COUNT = 2000;
const TRAIL = 16;
const SPACING = 0.002;

class TrailCanvas {
  private readonly canvas: GeoCanvas;
  private readonly cols = 40;
  private readonly rows: number;
  private cell = 0;
  private readonly bounds: Bounds;
  private readonly lonSpan: number;
  private readonly trailLon = new Float32Array(COUNT * TRAIL);
  private readonly trailLat = new Float32Array(COUNT * TRAIL);
  private readonly sinceCrumb = new Float32Array(COUNT);
  private readonly age = new Float32Array(COUNT);
  private readonly life = new Float32Array(COUNT);
  private readonly dying = new Uint8Array(COUNT);

  constructor(
    private readonly u: Grid,
    private readonly v: Grid,
    canvasWidth: number,
    private readonly lineWidth: number,
  ) {
    this.bounds = u.bounds;
    const [west, south, east, north] = u.bounds;
    this.lonSpan = east - west;
    this.canvas = new GeoCanvas(u.bounds, canvasWidth);
    this.rows = Math.max(1, Math.round((this.cols * (north - south)) / this.lonSpan));
    for (let i = 0; i < COUNT; i++) {
      this.spawn(i);
      this.age[i] = Math.random() * this.life[i];
    }
  }

  get image(): HTMLCanvasElement {
    return this.canvas.image;
  }

  advance(deltaSeconds: number): void {
    const move = 0.004 * this.lonSpan * deltaSeconds;
    for (let i = 0; i < COUNT; i++) {
      if (this.dying[i] > 0) {
        this.dropTailCrumb(i);
        if (--this.dying[i] === 0) this.spawn(i);
        continue;
      }
      this.age[i] += deltaSeconds;
      const headLon = this.trailLon[i * TRAIL];
      const headLat = this.trailLat[i * TRAIL];
      const u = this.u.valueAt(headLon, headLat, 'nearest');
      const v = this.v.valueAt(headLon, headLat, 'nearest');
      const speed = Math.hypot(u, v);
      if (Number.isNaN(u) || speed === 0 || this.age[i] >= this.life[i]) {
        this.dying[i] = TRAIL - 1;
        continue;
      }
      const step = Math.min(25, Math.max(3, speed)) * move;
      const nextLon = headLon + (u / speed) * step;
      const nextLat = headLat + (v / speed) * step;
      if (!contains(this.bounds, nextLon, nextLat)) {
        this.dying[i] = TRAIL - 1;
        continue;
      }
      const crumbSpacing = (0.2 + 0.8 * Math.min(1, speed / 18)) * SPACING * this.lonSpan;
      this.sinceCrumb[i] += step;
      while (this.sinceCrumb[i] >= crumbSpacing) {
        this.dropTailCrumb(i);
        this.sinceCrumb[i] -= crumbSpacing;
      }
      this.trailLon[i * TRAIL] = nextLon;
      this.trailLat[i * TRAIL] = nextLat;
    }
    this.draw();
  }

  private dropTailCrumb(i: number): void {
    for (let t = TRAIL - 1; t > 0; t--) {
      this.trailLon[i * TRAIL + t] = this.trailLon[i * TRAIL + t - 1];
      this.trailLat[i * TRAIL + t] = this.trailLat[i * TRAIL + t - 1];
    }
  }

  private draw(): void {
    const context = this.canvas.begin();
    context.strokeStyle = '#ffffff';
    context.lineWidth = this.lineWidth;
    for (let t = 0; t < TRAIL - 1; t++) {
      context.globalAlpha = 0.6 * (1 - t / (TRAIL - 1));
      context.beginPath();
      for (let i = 0; i < COUNT; i++) {
        context.moveTo(
          this.canvas.toX(this.trailLon[i * TRAIL + t]),
          this.canvas.toY(this.trailLat[i * TRAIL + t]),
        );
        context.lineTo(
          this.canvas.toX(this.trailLon[i * TRAIL + t + 1]),
          this.canvas.toY(this.trailLat[i * TRAIL + t + 1]),
        );
      }
      context.stroke();
    }
  }

  private spawn(i: number): void {
    const PRIME_STRIDE = 7919;
    const [west, south, , north] = this.bounds;
    this.cell = (this.cell + PRIME_STRIDE) % (this.cols * this.rows);
    const lon = west + (((this.cell % this.cols) + Math.random()) / this.cols) * this.lonSpan;
    const lat =
      north - ((Math.floor(this.cell / this.cols) + Math.random()) / this.rows) * (north - south);
    for (let t = 0; t < TRAIL; t++) {
      this.trailLon[i * TRAIL + t] = lon;
      this.trailLat[i * TRAIL + t] = lat;
    }
    this.sinceCrumb[i] = 0;
    this.age[i] = 0;
    this.life[i] = 1.5 + Math.random() * 2;
  }
}

interface State extends AnimatedState {
  canvas: TrailCanvas;
}

export interface WindField {
  u: Grid;
  v: Grid;
}

export class WindParticles extends Look<WindField> {
  readonly kind = LookKind.Particles;
  readonly speed = signal(1);

  deckLayer(id: string, field: WindField): DeckLayer {
    return new WindParticleLayer({ id, ...field, speed: this.speed });
  }
}

interface ParticleProps extends WindField {
  speed: () => number;
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
    const width = Math.max(256, Math.min(2048, Math.round(cssSpan * devicePixelRatio)));
    const lineWidth = 1.5 * (width / cssSpan);
    this.setState({ canvas: new TrailCanvas(this.props.u, this.props.v, width, lineWidth) });
  }

  override renderLayers(): DeckLayer {
    return new BitmapLayer(this.getSubLayerProps({ id: 'trails' }), {
      image: this.state.canvas.image,
      bounds: this.props.u.bounds,
      opacity: 0.85,
    });
  }

  step(deltaSeconds: number): void {
    this.state.canvas.advance(deltaSeconds * this.props.speed());
  }
}
