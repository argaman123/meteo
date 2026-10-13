import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MeteogramData } from '../../../../objects/meteogram-data';
import { Bounds } from '../../../../types/wrap';
import { ColorScale } from '../../../../utils/color-scale';
import { contourLines, levelsEvery } from '../../../../utils/contours';
import { MeteogramFrame } from '../meteogram-frame/meteogram-frame';
import { TimeBarService } from '../../time-bar/time-bar-service';

// TODO: UNVERIFIED CODE BELOW

export interface MeteogramContours {
  faintStep: number;
  marked: { level: number; color: string }[];
}

@Component({
  selector: 'app-meteogram-colormap',
  templateUrl: './meteogram-colormap.html',
  host: { class: 'absolute inset-0' },
})
export class MeteogramColormap {
  private timeBarService = inject(TimeBarService);
  private frame = inject(MeteogramFrame);

  readonly data = input.required<MeteogramData>();
  readonly colorScale = input.required<ColorScale>();
  readonly contours = input<MeteogramContours | null>(null);

  private readonly resolution = 0.5;
  private colormapCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('colormapCanvas');
  private contourCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('contourCanvas');

  private contourPaths = computed(() => {
    const contours = this.contours();
    if (!contours) return [];
    const { data, times, heights } = this.data();
    const bounds: Bounds = [
      times[0],
      heights[heights.length - 1],
      times[times.length - 1],
      heights[0],
    ];
    const trace = (levels: number[]) =>
      contourLines(data, times.length, heights.length, bounds, levels);
    const values = data.filter((value) => !Number.isNaN(value));
    const faintLevels = levelsEvery(contours.faintStep)(Math.min(...values), Math.max(...values));
    return [
      ...trace(faintLevels).map((line) => ({
        ...line,
        color: '#00000040',
        width: 1,
      })),
      ...contours.marked.flatMap(({ level, color }) =>
        trace([level]).map((line) => ({ ...line, color, width: 2.5 })),
      ),
    ];
  });

  constructor() {
    afterRenderEffect(() => this.drawColormap());
    afterRenderEffect(() => this.drawContours());
  }

  private drawColormap(): void {
    const data = this.data();
    const colorScale = this.colorScale();
    const width = Math.round(this.frame.size().width * this.resolution);
    const height = Math.round(this.frame.size().height * this.resolution);
    if (width === 0 || height === 0) return;
    const canvas = this.colormapCanvas().nativeElement;
    canvas.width = width;
    canvas.height = height;
    const cols = Array.from({ length: width }, (_, x) =>
      data.timeIndex(this.timeBarService.timeInView((x + 0.5) / width)),
    );
    const topFt = this.frame.topFt();
    const rows = Array.from({ length: height }, (_, y) =>
      data.heightIndex((1 - (y + 0.5) / height) * topFt),
    );
    const image = new ImageData(width, height);
    const colorCache = new Map<number, ReturnType<ColorScale>>();
    for (let y = 0; y < height; y++) {
      const row = rows[y];
      if (row === null) continue;
      for (let x = 0; x < width; x++) {
        const col = cols[x];
        if (col === null) continue;
        const value = data.valueAtIndex(col, row);
        if (Number.isNaN(value)) continue;
        const key = Math.round(value * 10);
        let color = colorCache.get(key);
        if (!color) {
          color = colorScale(key / 10);
          colorCache.set(key, color);
        }
        const offset = (y * width + x) * 4;
        image.data[offset] = color.r;
        image.data[offset + 1] = color.g;
        image.data[offset + 2] = color.b;
        image.data[offset + 3] = 255;
      }
    }
    canvas.getContext('2d')!.putImageData(image, 0, 0);
  }

  private drawContours(): void {
    const { width, height } = this.frame.size();
    const canvas = this.contourCanvas().nativeElement;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    const context = canvas.getContext('2d')!;
    context.scale(devicePixelRatio, devicePixelRatio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const topFt = this.frame.topFt();
    for (const line of this.contourPaths()) {
      context.beginPath();
      for (const [time, heightFt] of line.path) {
        context.lineTo(
          (this.timeBarService.positionInView(time) / 100) * width,
          (1 - heightFt / topFt) * height,
        );
      }
      context.strokeStyle = line.color;
      context.lineWidth = line.width;
      context.stroke();
    }
  }
}
