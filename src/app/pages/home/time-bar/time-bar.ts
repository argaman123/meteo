import { Dir } from '@angular/cdk/bidi';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { LayersService } from '../../../layers/layers-service';
import { LoopPlayer } from '../../../services/loop-player';
import { TimeService } from '../../../services/time-service';
import {
  clampToRange,
  daysToMs,
  formatLocalHour,
  formatLocalTime,
  hoursToMs,
  timelineTicks,
} from '../../../utils/time';

// TODO: UNVERIFIED CODE BELOW
interface TimelineView {
  start: number;
  end: number;
}

@Component({
  selector: 'app-time-bar',
  imports: [Dir, HlmButton, NgIcon],
  viewProviders: [
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucideChevronsLeft,
      lucideChevronsRight,
    }),
  ],
  templateUrl: './time-bar.html',
  host: {
    class: 'block',
    '(window:keydown.arrowright)': 'onArrow($event, 1)',
    '(window:keydown.arrowleft)': 'onArrow($event, -1)',
  },
})
export class TimeBar {
  protected time = inject(TimeService);
  protected layers = inject(LayersService);
  private player = inject(LoopPlayer);
  private view = signal(this.paddedWindow());
  private scrubTime = signal<number | null>(null);
  private drag: { mode: 'pending' | 'pan' | 'scrub'; startX: number; view: TimelineView } | null =
    null;

  protected shownTime = computed(() => this.scrubTime() ?? this.time.displayTime());
  protected timeLabel = computed(() => formatLocalTime(this.time.snapJump(this.shownTime())));
  protected isLive = computed(() => this.time.live() && this.scrubTime() === null);
  protected playingLine = computed(() => {
    const playing = this.player.playingTime();
    return playing === null ? null : `זמן תמונה · ${formatLocalHour(playing)}`;
  });

  protected ticks = computed(() => {
    const { start, end } = this.view();
    return timelineTicks(start, end).map((tick) => ({
      ...tick,
      position: this.positionOf(tick.time),
    }));
  });

  protected pastBand = computed(() => this.bandBetween(this.time.window().start, this.time.now()));
  protected futureBand = computed(() => this.bandBetween(this.time.now(), this.time.window().end));

  protected handlePosition = computed(() => this.positionOf(this.shownTime()));
  protected nowPosition = computed(() => this.positionOf(this.time.now()));
  protected isHandleInView = computed(
    () => this.handlePosition() >= 0 && this.handlePosition() <= 100,
  );
  protected labelPosition = computed(() => clampToRange(this.handlePosition(), 7, 93));

  private keepHandleInView = effect(() => {
    const current = this.time.displayTime();
    untracked(() => {
      const { start, end } = this.view();
      if (current >= start && current <= end) return;
      const span = (end - start) / 2;
      this.view.set({ start: current - span, end: current + span });
    });
  });

  protected onArrow(event: Event, direction: 1 | -1): void {
    event.preventDefault();
    if (direction === 1) this.time.stepForward();
    else this.time.stepBack();
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const { start, end } = this.view();
    const span = end - start;
    if (event.shiftKey) {
      const shift = span * 0.15 * Math.sign(event.deltaY);
      this.view.set({ start: start + shift, end: end + shift });
      return;
    }
    const fraction = this.fractionAt(event);
    const anchor = start + fraction * span;
    const zoomed = clampToRange(span * Math.exp(event.deltaY * 0.0015), hoursToMs(3), daysToMs(20 * 365));
    this.view.set({ start: anchor - fraction * zoomed, end: anchor + (1 - fraction) * zoomed });
  }

  protected onPointerDown(event: PointerEvent): void {
    const track = (event.currentTarget as HTMLElement).getBoundingClientRect();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const handleX = track.left + (this.handlePosition() / 100) * track.width;
    const grabbedHandle = Math.abs(event.clientX - handleX) <= 10;
    this.drag = {
      mode: grabbedHandle ? 'scrub' : 'pending',
      startX: event.clientX,
      view: this.view(),
    };
    if (grabbedHandle) this.scrubTime.set(this.timeAt(event));
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    if (drag.mode === 'pending' && Math.abs(event.clientX - drag.startX) > 4) drag.mode = 'pan';
    if (drag.mode === 'scrub') {
      this.scrubTime.set(this.timeAt(event));
      return;
    }
    if (drag.mode === 'pan') {
      const track = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const shift = ((drag.startX - event.clientX) / track.width) * (drag.view.end - drag.view.start);
      this.view.set({ start: drag.view.start + shift, end: drag.view.end + shift });
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    if (drag.mode === 'pan') return;
    const target = drag.mode === 'scrub' ? this.scrubTime() : this.timeAt(event);
    this.scrubTime.set(null);
    if (target !== null) this.time.jumpTo(target);
  }

  private bandBetween(from: number, to: number): { left: number; width: number } {
    const left = this.positionOf(from);
    return { left, width: this.positionOf(to) - left };
  }

  private positionOf(unixTime: number): number {
    const { start, end } = this.view();
    return ((unixTime - start) / (end - start)) * 100;
  }

  private timeAt(event: PointerEvent): number {
    const { start, end } = this.view();
    const { start: earliest, end: latest } = this.time.window();
    return clampToRange(start + this.fractionAt(event) * (end - start), earliest, latest);
  }

  private fractionAt(event: PointerEvent | WheelEvent): number {
    const track = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return clampToRange((event.clientX - track.left) / track.width, 0, 1);
  }

  private paddedWindow(): TimelineView {
    const { start, end } = this.time.window();
    const padding = (end - start) * 0.1;
    return { start: start - padding, end: end + padding };
  }
}
