import { Dir } from '@angular/cdk/bidi';
import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { LayersService } from '../../../layers/layers-service';
import { PlayerService } from '../../../services/player-service';
import { TimeRange, TimeService } from '../../../services/time-service';
import { clampToRange, formatLocalHour, formatLocalTime, timelineTicks } from '../../../utils/time';
import { pointerFraction } from '../../../utils/pointer';
import { LoopPill } from '../loop-pill/loop-pill';
import { TimeBarService } from './time-bar-service';

// TODO: UNVERIFIED CODE BELOW
@Component({
  selector: 'app-time-bar',
  imports: [Dir, HlmButton, HlmTooltip, LoopPill, NgIcon],
  viewProviders: [provideIcons({ lucideChevronLeft, lucideChevronRight })],
  templateUrl: './time-bar.html',
  host: {
    class: 'block',
    '(window:keydown.arrowright)': 'onArrow($event, 1)',
    '(window:keydown.arrowleft)': 'onArrow($event, -1)',
  },
})
export class TimeBar {
  protected timeService = inject(TimeService);
  private timeBarService = inject(TimeBarService);
  protected layersService = inject(LayersService);
  private playerService = inject(PlayerService);
  private scrubTime = signal<number | null>(null);
  private hoverTime = signal<number | null>(null);
  private drag: { mode: 'pending' | 'pan' | 'scrub'; startX: number; view: TimeRange } | null =
    null;

  protected shownTime = computed(() => this.scrubTime() ?? this.timeService.displayTime());
  protected timeLabel = computed(() => formatLocalTime(this.timeService.snapJump(this.shownTime())));
  protected isLive = computed(() => this.timeService.live() && this.scrubTime() === null);
  protected playingLine = computed(() => {
    const playing = this.playerService.nearestFrameTime();
    return playing === null ? null : `זמן תמונה · ${formatLocalHour(playing)}`;
  });

  protected ticks = computed(() => {
    const { start, end } = this.timeBarService.view();
    return timelineTicks(start, end).map((tick) => ({
      ...tick,
      position: this.timeBarService.positionInView(tick.time),
    }));
  });

  protected stopMarkers = computed(() =>
    this.timeService
      .timeStops()
      .map((stop) => this.timeBarService.positionInView(stop))
      .filter((position) => position >= 0 && position <= 100),
  );

  protected pastBand = computed(() => this.bandBetween(this.timeService.window().start, this.timeService.now()));
  protected futureBand = computed(() => this.bandBetween(this.timeService.now(), this.timeService.window().end));

  protected hoverPreview = computed(() => {
    const hovered = this.hoverTime();
    if (hovered === null || hovered === this.timeService.displayTime()) return null;
    const position = this.timeBarService.positionInView(hovered);
    if (position < 0 || position > 100) return null;
    return { position, label: formatLocalTime(hovered) };
  });

  protected handlePosition = computed(() => this.timeBarService.positionInView(this.shownTime()));
  protected nowPosition = computed(() => this.timeBarService.positionInView(this.timeService.now()));
  protected isHandleInView = computed(
    () => this.handlePosition() >= 0 && this.handlePosition() <= 100,
  );
  protected labelPosition = computed(() => clampToRange(this.handlePosition(), 7, 93));

  protected onArrow(event: Event, direction: 1 | -1): void {
    event.preventDefault();
    if (direction === 1) this.timeService.stepForward();
    else this.timeService.stepBack();
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.shiftKey) this.timeBarService.shiftView(event.deltaY);
    else this.timeBarService.zoomView(pointerFraction(event).x, event.deltaY);
  }

  protected onPointerDown(event: PointerEvent): void {
    const track = (event.currentTarget as HTMLElement).getBoundingClientRect();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    const handleX = track.left + (this.handlePosition() / 100) * track.width;
    const grabbedHandle = Math.abs(event.clientX - handleX) <= 10;
    this.drag = {
      mode: grabbedHandle ? 'scrub' : 'pending',
      startX: event.clientX,
      view: this.timeBarService.view(),
    };
    if (grabbedHandle) this.scrubTime.set(this.timeAt(event));
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag) {
      this.hoverTime.set(this.timeService.snapJump(this.timeAt(event)));
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
      this.timeBarService.panView(drag.view, (drag.startX - event.clientX) / track.width);
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
    if (target !== null) this.timeService.jumpTo(target);
  }

  private bandBetween(from: number, to: number): { left: number; width: number } {
    const left = this.timeBarService.positionInView(from);
    return { left, width: this.timeBarService.positionInView(to) - left };
  }

  private timeAt(event: PointerEvent): number {
    const { start: earliest, end: latest } = this.timeService.window();
    return clampToRange(this.timeBarService.timeInView(pointerFraction(event).x), earliest, latest);
  }
}
