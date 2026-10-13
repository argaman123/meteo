import { Service, effect, inject, signal, untracked } from '@angular/core';
import { TimeRange, TimeService } from '../../../services/time-service';
import { clampToRange, daysToMs, hoursToMs } from '../../../utils/time';

@Service()
export class TimeBarService {
  private timeService = inject(TimeService);

  readonly view = signal<TimeRange>(this.paddedWindow());

  private keepDisplayTimeInView = effect(() => {
    const current = this.timeService.displayTime();
    untracked(() => {
      const { start, end } = this.view();
      if (current >= start && current <= end) return;
      const span = (end - start) / 2;
      this.view.set({ start: current - span, end: current + span });
    });
  });

  positionInView(unixTime: number): number {
    const { start, end } = this.view();
    return ((unixTime - start) / (end - start)) * 100;
  }

  timeInView(fraction: number): number {
    const { start, end } = this.view();
    return start + fraction * (end - start);
  }

  zoomView(anchorFraction: number, wheelDelta: number): void {
    const { start, end } = this.view();
    const span = end - start;
    const anchor = start + anchorFraction * span;
    const zoomed = clampToRange(
      span * Math.exp(wheelDelta * 0.0015),
      hoursToMs(3),
      daysToMs(20 * 365),
    );
    this.view.set({
      start: anchor - anchorFraction * zoomed,
      end: anchor + (1 - anchorFraction) * zoomed,
    });
  }

  shiftView(wheelDelta: number): void {
    this.panView(this.view(), 0.15 * Math.sign(wheelDelta));
  }

  panView(from: TimeRange, spanFraction: number): void {
    const shift = (from.end - from.start) * spanFraction;
    this.view.set({ start: from.start + shift, end: from.end + shift });
  }

  private paddedWindow(): TimeRange {
    const { start, end } = this.timeService.window();
    const span = (end - start) * 1.2;
    const center = this.timeService.now();
    return { start: center - span / 2, end: center + span / 2 };
  }
}
