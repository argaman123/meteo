import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { WIND_SPEED_PALETTE } from '../../../../layers/model/wind';
import { MeteogramData } from '../../../../objects/meteogram-data';
import { colorScale } from '../../../../utils/color-scale';
import { msToHours } from '../../../../utils/time';
import { Quantity, Unit, convertBetween, format } from '../../../../utils/units';
import { metDirection } from '../../../../utils/wind';
import { MeteogramFrame } from '../meteogram-frame/meteogram-frame';
import { MeteogramService } from '../meteogram-service';
import { MeteogramColormap, MeteogramContours } from '../meteogram-colormap/meteogram-colormap';
import { TimeBarService } from '../../time-bar/time-bar-service';

@Component({
  selector: 'app-wind-chart',
  imports: [MeteogramColormap, MeteogramFrame],
  templateUrl: './wind-chart.html',
  host: { class: 'block h-full' },
})
export class WindChart {
  private meteogram = inject(MeteogramService);
  private timeBar = inject(TimeBarService);
  private frame = viewChild(MeteogramFrame);
  private arrowCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('arrowCanvas');

  private readonly arrowSpacingPx = 40;
  private readonly arrowRowSpacingPx = 30;
  private readonly arrowStepsHours = [1, 3, 6, 12, 24];

  protected readonly contours: MeteogramContours = {
    faintStep: 1,
    marked: [
      { level: convertBetween(25, Unit.Knots, Unit.MetersPerSecond), color: '#ffffff' },
      { level: convertBetween(45, Unit.Knots, Unit.MetersPerSecond), color: '#9ca3af' },
    ],
  };

  protected u = this.meteogram.u;
  protected v = this.meteogram.v;
  protected colorScale = colorScale(WIND_SPEED_PALETTE, 'smooth');

  protected speed = computed(() =>
    this.u.hasValue() && this.v.hasValue()
      ? MeteogramData.combine([this.u.value(), this.v.value()], Math.hypot)
      : null,
  );

  protected hoverText = (time: number, heightFt: number): string => {
    const speed = this.speed()?.valueAt(time, heightFt) ?? NaN;
    if (Number.isNaN(speed)) return format(NaN, Quantity.WindSpeed, Unit.MetersPerSecond);
    const direction = this.directionAt(time, heightFt);
    return `${format(speed, Quantity.WindSpeed, Unit.MetersPerSecond)} · ${format(direction, Quantity.Direction, Unit.MetDegrees)}`;
  };

  constructor() {
    afterRenderEffect(() => this.drawArrows());
  }

  private directionAt(time: number, heightFt: number): number {
    if (!this.u.hasValue() || !this.v.hasValue()) return NaN;
    return metDirection(
      this.u.value().valueAt(time, heightFt),
      this.v.value().valueAt(time, heightFt),
    );
  }

  private drawArrows(): void {
    const frame = this.frame();
    const { width, height } = frame?.size() ?? { width: 0, height: 0 };
    const canvas = this.arrowCanvas().nativeElement;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    const { start, end } = this.timeBar.view();
    const pixelsPerHour = width / msToHours(end - start);
    const stepHours = this.arrowStepsHours.find(
      (step) => step * pixelsPerHour >= this.arrowSpacingPx,
    );
    if (!frame || !this.u.hasValue() || stepHours === undefined) return;
    const context = canvas.getContext('2d')!;
    context.scale(devicePixelRatio, devicePixelRatio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const topFt = frame.topFt();
    const times = this.u
      .value()
      .times.filter(
        (time) => time >= start && time <= end && new Date(time).getHours() % stepHours === 0,
      );
    for (const time of times) {
      for (let y = this.arrowRowSpacingPx / 2; y < height; y += this.arrowRowSpacingPx) {
        const degrees = this.directionAt(time, (1 - y / height) * topFt);
        if (Number.isNaN(degrees)) continue;
        context.save();
        context.translate((this.timeBar.positionInView(time) / 100) * width, y);
        context.rotate(((degrees + 180) * Math.PI) / 180);
        context.beginPath();
        context.moveTo(0, 6);
        context.lineTo(0, -6);
        context.moveTo(-3.5, -2);
        context.lineTo(0, -6);
        context.lineTo(3.5, -2);
        context.strokeStyle = '#0000008c';
        context.lineWidth = 3.5;
        context.stroke();
        context.strokeStyle = '#ffffff';
        context.lineWidth = 1.6;
        context.stroke();
        context.restore();
      }
    }
  }
}
