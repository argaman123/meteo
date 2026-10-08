import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePause, lucidePlay, lucideSkipBack, lucideSkipForward } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { PlayerService } from '../../../services/player-service';

@Component({
  selector: 'app-loop-pill',
  imports: [HlmButton, HlmTooltip, NgIcon],
  viewProviders: [provideIcons({ lucidePause, lucidePlay, lucideSkipBack, lucideSkipForward })],
  host: { class: 'contents' },
  templateUrl: './loop-pill.html',
})
export class LoopPill {
  protected player = inject(PlayerService);
  private readonly speeds = [0.5, 1, 2, 4];

  protected cycleSpeed(): void {
    const index = this.speeds.indexOf(this.player.speed());
    this.player.speed.set(this.speeds[(index + 1) % this.speeds.length]);
  }
}
