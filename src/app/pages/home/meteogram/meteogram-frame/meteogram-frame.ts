import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TimeRange, TimeService } from '../../../../services/time-service';
import { formatLocalTime } from '../../../../utils/time';
import { Quantity, Unit, format } from '../../../../utils/units';
import { pointerFraction } from '../../../../utils/pointer';
import { MeteogramService } from '../meteogram-service';
import { TimeBarService } from '../../time-bar/time-bar-service';

@Component({
  selector: 'app-meteogram-frame',
  templateUrl: './meteogram-frame.html',
  host: { class: 'block h-full' },
})
export class MeteogramFrame {
  private time = inject(TimeService);
  private timeBar = inject(TimeBarService);
  private meteogram = inject(MeteogramService);

  readonly hoverText = input.required<(time: number, heightFt: number) => string>();
  readonly topFt = input(this.meteogram.topFt);
  readonly loading = input(false);
  readonly message = input<string | null>(null);

  private readonly labelStepFt = 5000;
  private chart = viewChild.required<ElementRef<HTMLElement>>('chart');
  readonly size = signal({ width: 0, height: 0 });
  private pointer = signal<{ x: number; y: number } | null>(null);
  private drag: { startX: number; view: TimeRange; panning: boolean } | null = null;

  constructor() {
    const observer = new ResizeObserver(([entry]) =>
      this.size.set({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    afterNextRender(() => observer.observe(this.chart().nativeElement));
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  protected nowPosition = computed(() => this.timeBar.positionInView(this.time.now()));
  protected mapTimePosition = computed(() => this.timeBar.positionInView(this.time.displayTime()));

  protected heightLabels = computed(() => {
    const topFt = this.topFt();
    const labels: { fraction: number; text: string; offset: string }[] = [];
    for (let heightFt = 0; heightFt <= topFt; heightFt += this.labelStepFt) {
      labels.push({
        fraction: heightFt / topFt,
        text: format(heightFt, Quantity.Height, Unit.Feet),
        offset: heightFt === 0 ? '0 0' : heightFt === topFt ? '0 100%' : '0 50%',
      });
    }
    return labels;
  });

  protected hover = computed(() => {
    const pointer = this.pointer();
    if (!pointer) return null;
    const time = this.timeBar.timeInView(pointer.x);
    const heightFt = (1 - pointer.y) * this.topFt();
    const top = Number.isNaN(pointer.y) ? 1 : pointer.y;
    const away = 'calc(-100% - 0.75rem)';
    return {
      left: pointer.x * 100,
      top: top * 100,
      offset: `${pointer.x > 0.6 ? away : '0.75rem'} ${top > 0.5 ? away : '0.75rem'}`,
      time: formatLocalTime(time),
      height: format(heightFt, Quantity.Height, Unit.Feet),
      value: this.hoverText()(time, heightFt),
    };
  });

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.shiftKey) this.timeBar.shiftView(event.deltaY);
    else this.timeBar.zoomView(pointerFraction(event).x, event.deltaY);
  }

  protected onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.drag = { startX: event.clientX, view: this.timeBar.view(), panning: false };
  }

  protected onPointerHover(event: PointerEvent): void {
    this.pointer.set(pointerFraction(event));
  }

  protected onLanesHover(event: PointerEvent): void {
    this.pointer.set({ x: pointerFraction(event).x, y: NaN });
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (drag && Math.abs(event.clientX - drag.startX) > 4) drag.panning = true;
    if (!drag?.panning) return;
    this.pointer.set(null);
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.timeBar.panView(drag.view, (drag.startX - event.clientX) / box.width);
  }

  protected onPointerLeave(): void {
    this.pointer.set(null);
  }

  protected onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    this.drag = null;
    if (drag && !drag.panning) this.time.jumpTo(this.timeBar.timeInView(pointerFraction(event).x));
  }
}
