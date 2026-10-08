import { Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSettings } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmPopover,
  HlmPopoverContent,
  HlmPopoverPortal,
  HlmPopoverTrigger,
} from '@spartan-ng/helm/popover';
import { LayersService } from '../../../layers/layers-service';
import { layers } from '../../../layers/registry';
import { coordinateFormat, unitControls } from './settings-controls';

@Component({
  selector: 'app-settings-panel',
  imports: [HlmButton, HlmPopover, HlmPopoverContent, HlmPopoverPortal, HlmPopoverTrigger, NgIcon],
  viewProviders: [provideIcons({ lucideSettings })],
  templateUrl: './settings-panel.html',
})
export class SettingsPanel {
  protected layersService = inject(LayersService);
  protected readonly coordinates = layers.coordinates;
  protected readonly coordinateFormat = coordinateFormat;
  protected readonly units = Object.values(unitControls);
}
