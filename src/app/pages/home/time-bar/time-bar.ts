import { Dir } from '@angular/cdk/bidi';
import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucidePause,
  lucidePlay,
  lucideSkipBack,
  lucideSkipForward,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { LayersService } from '../../../layers/layers-service';
import { LoopPlayer } from '../../../services/loop-player';
import { TimeRange, TimeService } from '../../../services/time-service';
import { clampToRange, formatLocalHour, formatLocalTime, timelineTicks } from '../../../utils/time';
import { pointerFraction } from '../../../utils/pointer';
import { TimeBarService } from './time-bar-service';

// TODO: UNVERIFIED CODE BELOW
@Component({
  selector: 'app-time-bar',
  imports: [Dir, HlmButton, HlmTooltip, NgIcon],
  viewProviders: [
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucidePause,
      lucidePlay,
      lucideSkipBack,
      lucideSkipForward,
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
  private timeBar = inject(TimeBarService);
  protected layers = inject(LayersService);
  protected player = inject(LoopPlayer);
  private scrubTime = signal<number | null>(null);
  private hoverTime = signal<number | null>(null);
  private drag: { mode: 'pending' | 'pan' | 'scrub'; startX: number; view: TimeRange } | null =
    null;

  protected shownTime = computed(() => this.scrubTime() ?? this.time.displayTime());
  protected timeLabel = computed(() => formatLocalTime(this.time.snapJump(this.shownTime())));
  protected isLive = computed(() => this.time.live() && this.scrubTime() === null);
  protected playingLine = computed(() => {
    const playing = this.player.nearestFrameTime();
    return playing === null ? null : `זמן תמונה · ${formatLocalHour(playing)}`;
  });

  protected ticks = computed(() => {
    const { start, end } = this.timeBar.view();
    return timelineTicks(start, end).map((tick) => ({
      ...tick,
      position: this.timeBar.positionInView(tick.time),
    }));
  });

  protected stopMarkers = computed(() =>
    this.time
      .timeStops()
      .map((stop) => this.timeBar.positionInView(stop))
      .filter((position) => position >= 0 && position <= 100),
  );

  protected pastBand = computed(() => this.bandBetween(this.time.window().start, this.time.now()));
  protected futureBand = computed(() => this.bandBetween(this.time.now(), this.time.window().end));

  protected hoverPreview = computed(() => {
    const hovered = this.hoverTime();
    if (hovered === null || hovered === this.time.displayTime()) return null;
    const position = this.timeBar.positionInView(hovered);
    if (position < 0 || position > 100) return null;
    return { position, label: formatLocalTime(hovered) };
  });

  protected handlePosition = computed(() => this.timeBar.positionInView(this.shownTime()));
  protected nowPosition = computed(() => this.timeBar.positionInView(this.time.now()));
  protected isHandleInView = computed(
    () => this.handlePosition() >= 0 && this.handlePosition() <= 100,
  );
  protected labelPosition = computed(() => clampToRange(this.handlePosition(), 7, 93));

  protected onArrow(event: Event, direction: 1 | -1): void {
    event.preventDefault();
    if (direction === 1) this.time.stepForward();
    else this.time.stepBack();
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.shiftKey) this.timeBar.shiftView(event.deltaY);
    else this.timeBar.zoomView(pointerFraction(event).x, event.deltaY);
  }

  protected onPointerDown(event: PointerEvent): void {
    const track = (event.currentTarget as HTMLElement).getBoundingClientRect();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const handleX = track.left + (this.handlePosition() / 100) * track.width;
    const grabbedHandle = Math.abs(event.clientX - handleX) <= 10;
    this.drag = {
      mode: grabbedHandle ? 'scrub' : 'pending',
      startX: event.clientX,
      view: this.timeBar.view(),
    };
    if (grabbedHandle) this.scrubTime.set(this.timeAt(event));
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) {
      this.hoverTime.set(this.time.snapJump(this.timeAt(event)));
      return;
    }
    this.hoverTime.set(null);
    if (drag.mode === 'pending' && Math.abs(event.clientX - drag.startX) > 4) drag.mode = 'pan';
    if (drag.mode === 'scrub') {
      this.scrubTime.set(this.timeAt(event));
      return;
    }
    if (drag.mode === 'pan') {
      const track = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.timeBar.panView(drag.view, (drag.startX - event.clientX) / track.width);
    }
  }

  protected onPointerLeave(): void {
    this.hoverTime.set(null);
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
    const left = this.timeBar.positionInView(from);
    return { left, width: this.timeBar.positionInView(to) - left };
  }

  private timeAt(event: PointerEvent): number {
    const { start: earliest, end: latest } = this.time.window();
    return clampToRange(this.timeBar.timeInView(pointerFraction(event).x), earliest, latest);
  }

  private readonly speeds = [0.5, 1, 2, 4];

  protected cycleSpeed(): void {
    const index = this.speeds.indexOf(this.player.speed());
    this.player.speed.set(this.speeds[(index + 1) % this.speeds.length]);
  }
}
