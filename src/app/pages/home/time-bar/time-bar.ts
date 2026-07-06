import { Dir } from '@angular/cdk/bidi';
import { Component, computed, inject, signal } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmSlider } from '@spartan-ng/helm/slider';
import { TimeService } from '../../../services/time-service';
import { formatLocalTime, snapToStep } from '../../../utils/time';

@Component({
  selector: 'app-time-bar',
  imports: [Dir, HlmButton, HlmSlider],
  templateUrl: './time-bar.html',
  styleUrl: './time-bar.css',
  host: {
    '(window:keydown.arrowright)': 'onArrow($event, 1)',
    '(window:keydown.arrowleft)': 'onArrow($event, -1)',
    '(window:pointerup)': 'onPointerUp()',
    '(window:pointercancel)': 'onPointerUp()',
  },
})
export class TimeBar {
  protected time = inject(TimeService);
  protected scrubValue = signal<number | null>(null);
  private pointerHeld = false;

  protected stepSeconds = computed(() => this.time.stepHours() * 3600);
  protected sliderValue = computed(() => [this.scrubValue() ?? this.time.currentTime()]);
  protected currentLabel = computed(() => {
    const scrub = this.scrubValue();
    const shown =
      scrub === null ? this.time.currentTime() : snapToStep(scrub, this.time.stepHours());
    return formatLocalTime(shown);
  });
  protected backLabel = computed(() => this.windowHours(this.time.window().start));
  protected forwardLabel = computed(() => this.windowHours(this.time.window().end));

  protected onArrow(event: Event, direction: 1 | -1): void {
    if (event.target instanceof Element && event.target.closest('hlm-slider')) return;
    event.preventDefault();
    if (direction === 1) this.time.stepForward();
    else this.time.stepBack();
  }

  protected onScrub(values: number[]): void {
    if (this.pointerHeld) this.scrubValue.set(values[0]);
    else this.time.jumpTo(values[0]);
  }

  protected onPointerDown(): void {
    this.pointerHeld = true;
  }

  protected onPointerUp(): void {
    this.pointerHeld = false;
    const scrub = this.scrubValue();
    if (scrub === null) return;
    this.scrubValue.set(null);
    this.time.jumpTo(scrub);
  }

  private windowHours(unixSeconds: number): string {
    const hours = Math.round((unixSeconds - Date.now() / 1000) / 3600);
    return hours > 0 ? `+${hours}` : String(hours);
  }
}
