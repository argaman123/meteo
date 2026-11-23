import { Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideSettings } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmDropdownMenu,
  HlmDropdownMenuRadio,
  HlmDropdownMenuRadioIndicator,
  HlmDropdownMenuTrigger,
} from '@spartan-ng/helm/dropdown-menu';
import {
  HlmPopover,
  HlmPopoverContent,
  HlmPopoverPortal,
  HlmPopoverTrigger,
} from '@spartan-ng/helm/popover';
import { LayersService } from '../../../layers/layers-service';
import { layers } from '../../../layers/registry';
import { MapService } from '../../../engine/map-service';
import { Quality, coordinateFormat, projection, quality, unitControls } from './settings-controls';

@Component({
  selector: 'app-settings-panel',
  imports: [
    HlmButton,
    HlmDropdownMenu,
    HlmDropdownMenuRadio,
    HlmDropdownMenuRadioIndicator,
    HlmDropdownMenuTrigger,
    HlmPopover,
    HlmPopoverContent,
    HlmPopoverPortal,
    HlmPopoverTrigger,
    NgIcon,
  ],
  viewProviders: [provideIcons({ lucideChevronDown, lucideSettings })],
  templateUrl: './settings-panel.html',
})
export class SettingsPanel {
  protected layersService = inject(LayersService);
  protected mapService = inject(MapService);
  protected readonly coordinates = layers.coordinates;
  protected readonly coordinateFormat = coordinateFormat;
  protected readonly units = Object.values(unitControls);
  protected readonly quality = quality;
  protected readonly projection = projection;

  protected coordinateFormatLabel = computed(() =>
    this.layersService.isLayerActive(this.coordinates)
      ? coordinateFormat.choices.find((choice) => choice.value === coordinateFormat())?.label
      : 'כבוי',
  );

  protected setQuality(value: Quality): void {
    if (value === quality()) return;
    quality.set(value);
    location.reload();
  }
}
