import { Component, computed, inject } from '@angular/core';
import { TimeService } from '../../../services/time-service';
import { formatLocalTime } from '../../../utils/time';

@Component({
  selector: 'app-time-bar',
  templateUrl: './time-bar.html',
  styleUrl: './time-bar.css',
  host: {
    '(window:keydown.arrowright)': 'onArrow($event, 1)',
    '(window:keydown.arrowleft)': 'onArrow($event, -1)',
  },
})
export class TimeBar {
  protected time = inject(TimeService);
  protected stepSeconds = computed(() => this.time.stepHours() * 3600);
  protected currentLabel = computed(() => formatLocalTime(this.time.currentTime()));
  protected backLabel = computed(() => this.windowHours(this.time.window().start));
  protected forwardLabel = computed(() => this.windowHours(this.time.window().end));

  protected onArrow(event: Event, direction: 1 | -1): void {
    event.preventDefault();
    if (direction === 1) this.time.stepForward();
    else this.time.stepBack();
  }

  protected onScrub(event: Event): void {
    this.time.jumpTo(Number((event.target as HTMLInputElement).value));
  }

  private windowHours(unixSeconds: number): string {
    const hours = Math.round((unixSeconds - Date.now() / 1000) / 3600);
    return hours > 0 ? `+${hours}` : String(hours);
  }
}
