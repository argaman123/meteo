import { Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBinoculars,
  lucideChevronDown,
  lucideCloudSun,
  lucideCloudy,
  lucideSatellite,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
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
import { DecimalPipe } from '@angular/common';
import { HlmSlider } from '@spartan-ng/helm/slider';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import { Layer } from '../../../layers/base/layer';
import { LayersService } from '../../../layers/layers-service';
import { menuLayers, shortcuts } from '../../../layers/registry';
import { ControlType, OptionsControl, OptionsPresentation, PercentControl } from '../../../utils/controls';

@Component({
  selector: 'app-layer-bar',
  imports: [
    HlmButton,
    HlmCheckbox,
    HlmDropdownMenu,
    HlmDropdownMenuRadio,
    HlmDropdownMenuRadioIndicator,
    HlmDropdownMenuTrigger,
    HlmPopover,
    HlmPopoverContent,
    HlmSwitch,
    HlmPopoverPortal,
    HlmPopoverTrigger,
    HlmSlider,
    NgIcon,
    DecimalPipe,
  ],
  viewProviders: [
    provideIcons({
      lucideBinoculars,
      lucideChevronDown,
      lucideCloudSun,
      lucideCloudy,
      lucideSatellite,
    }),
  ],
  host: { class: 'block' },
  templateUrl: './layer-bar.html',
})
export class LayerBar {
  protected readonly ControlType = ControlType;
  protected readonly OptionsPresentation = OptionsPresentation;

  protected readonly layersService = inject(LayersService);
  protected readonly layers = menuLayers;
  protected readonly shortcuts = Object.values(shortcuts);
  protected readonly groupStates = signal(new Map<Layer<unknown>, boolean>());
  protected readonly layersExpanded = signal(true);

  protected isExpanded(layer: Layer<unknown>): boolean {
    return this.layersService.isLayerActive(layer) && (this.groupStates().get(layer) ?? true);
  }

  protected isLayerLoading(layer: Layer<unknown>): boolean {
    const data = this.layersService.activeLayers().get(layer);
    return data !== undefined && data() === undefined;
  }

  protected toggleGroup(layer: Layer<unknown>): void {
    const expand = !this.isExpanded(layer);
    this.groupStates.update((current) => new Map(current).set(layer, expand));
  }

  protected hasChildRows(layer: Layer<unknown>): boolean {
    return this.isExpanded(layer) && (layer.controls.length > 0 || layer.looks.length > 0);
  }

  protected cycleOptions(control: OptionsControl<unknown>): void {
    const index = control.choices.findIndex((choice) => choice.value === control());
    control.set(control.choices[(index + 1) % control.choices.length].value);
  }

  protected optionLabel(control: OptionsControl<unknown>): string {
    return control.choices.find((choice) => choice.value === control())?.label ?? String(control());
  }

  protected setPercent(control: PercentControl, values: number[]): void {
    control.set(values[0]);
  }
}
