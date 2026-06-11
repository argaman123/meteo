import { Component, computed, inject } from '@angular/core';
import { TimeStore } from '../../../stores/time-store';
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
  store = inject(TimeStore);
  stepSeconds = computed(() => this.store.stepHours() * 3600);
  currentLabel = computed(() => formatLocalTime(this.store.currentTime()));
  backLabel = computed(() => formatWindowHours(this.store.window().start));
  forwardLabel = computed(() => formatWindowHours(this.store.window().end));

  onArrow(event: Event, direction: 1 | -1): void {
    event.preventDefault();
    if (direction === 1) this.store.stepForward();
    else this.store.stepBack();
  }

  onScrub(event: Event): void {
    this.store.jumpTo(Number((event.target as HTMLInputElement).value));
  }
}

function formatWindowHours(unixSeconds: number): string {
  const hours = Math.round((unixSeconds - Date.now() / 1000) / 3600);
  return hours > 0 ? `+${hours}` : String(hours);
}
