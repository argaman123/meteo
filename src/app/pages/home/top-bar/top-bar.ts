import { Component, inject, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity, lucideCamera, lucidePalette } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmDropdownMenu,
  HlmDropdownMenuRadio,
  HlmDropdownMenuRadioIndicator,
  HlmDropdownMenuTrigger,
} from '@spartan-ng/helm/dropdown-menu';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import { PerfHud } from '../../../dev/perf-hud/perf-hud';
import { MapService } from '../../../engine/map-service';
import { PlaceSearch } from '../place-search/place-search';
import { SettingsPanel } from '../settings-panel/settings-panel';

@Component({
  selector: 'app-top-bar',
  imports: [
    HlmButton,
    HlmDropdownMenu,
    HlmDropdownMenuRadio,
    HlmDropdownMenuRadioIndicator,
    HlmDropdownMenuTrigger,
    HlmTooltip,
    NgIcon,
    PlaceSearch,
    SettingsPanel,
  ],
  viewProviders: [provideIcons({ lucideActivity, lucideCamera, lucidePalette })],
  host: { class: 'block' },
  templateUrl: './top-bar.html',
})
export class TopBar {
  protected mapService = inject(MapService);
  readonly perfHud = input.required<PerfHud>();
  readonly screenshotClicked = output();
}
