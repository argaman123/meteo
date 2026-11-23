import { VectorField } from '../../objects/grid';
import { Look, LookKind } from '../base/look';
import { AnimationFrame, AnimationOverlay, Overlay } from '../base/overlay';
import { inkColor } from '../map-service';

interface Crest {
  position: [number, number];
  velocity: [number, number];
  bearing: number;
  size: number;
  age: number;
  life: number;
  shown: boolean;
}

export class WaveCrests extends Look<VectorField> {
  readonly kind = LookKind.Particles;
  private readonly columns = 40;
  private readonly rows = 30;
  private last?: { field: VectorField; crests: Crest[] } = undefined;
  private icons = new Map<string, HTMLCanvasElement>();

  override release(): void {
    this.last = undefined;
    this.icons.clear();
  }

  buildLook(field: VectorField): Overlay[] {
    if (this.last?.field !== field) this.last = { field, crests: this.createCrests(field) };
    const { crests } = this.last;
    const icon = this.iconOf(inkColor());
    return [
      new AnimationOverlay(field.u.bounds, (context, frame) => {
        this.step(field, crests, frame.deltaSeconds);
        this.paint(context, frame, crests, icon);
      }),
    ];
  }

  private createCrests(field: VectorField): Crest[] {
    const crests = Array.from({ length: this.columns * this.rows }, (_, slot) => this.spawn(field, slot));
    for (const crest of crests) crest.age = Math.random() * crest.life;
    return crests;
  }

  private paint(
    context: CanvasRenderingContext2D,
    frame: AnimationFrame,
    crests: Crest[],
    icon: HTMLCanvasElement,
  ): void {
    for (const crest of crests) {
      if (!crest.shown) continue;
      const alpha = Math.round(160 * Math.sin((Math.PI * crest.age) / crest.life)) / 255;
      if (alpha <= 0) continue;
      const [x, y] = frame.toCanvas(crest.position[0], crest.position[1]);
      const height = crest.size * frame.pixelRatio;
      context.save();
      context.globalAlpha = alpha;
      context.translate(x, y);
      context.rotate((crest.bearing * Math.PI) / 180);
      context.drawImage(icon, -height, -height / 2, height * 2, height);
      context.restore();
    }
  }

  private step(field: VectorField, crests: Crest[], deltaSeconds: number): void {
    crests.forEach((crest, index) => {
      crest.age += deltaSeconds;
      crest.position = [
        crest.position[0] + crest.velocity[0] * deltaSeconds,
        crest.position[1] + crest.velocity[1] * deltaSeconds,
      ];
      const [lon, lat] = crest.position;
      if (Number.isNaN(field.u.valueAt(lon, lat, 'nearest'))) crest.shown = false;
      if (crest.age >= crest.life) crests[index] = this.spawn(field, index);
    });
  }

  private spawn({ u, v }: VectorField, slot: number): Crest {
    const [west, south, east, north] = u.bounds;
    const lon = west + (((slot % this.columns) + Math.random()) / this.columns) * (east - west);
    const lat =
      south + ((Math.floor(slot / this.columns) + Math.random()) / this.rows) * (north - south);
    const eastward = u.valueAt(lon, lat, 'bilinear');
    const northward = v.valueAt(lon, lat, 'bilinear');
    const length = Math.hypot(eastward, northward);
    const speed = 0.008 * (east - west);
    return {
      position: [lon, lat],
      velocity: [
        (eastward / length) * speed || 0,
        (northward / length) * speed * Math.cos((lat * Math.PI) / 180) || 0,
      ],
      bearing: (Math.atan2(eastward, northward) * 180) / Math.PI,
      size: 7 + (9 * Math.min(length, 4)) / 4,
      age: 0,
      life: 2 + Math.random() * 2,
      shown: length > 0,
    };
  }

  private iconOf(ink: string): HTMLCanvasElement {
    let icon = this.icons.get(ink);
    if (!icon) {
      icon = createCrestIcon(ink);
      this.icons.set(ink, icon);
    }
    return icon;
  }
}

function createCrestIcon(ink: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const context = canvas.getContext('2d')!;
  context.strokeStyle = ink;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.beginPath();
  context.arc(32, 70, 60, Math.PI * 1.33, Math.PI * 1.67);
  context.stroke();
  return canvas;
}
