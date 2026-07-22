import { Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
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
import { Layer } from '../../../layers/base/layer';
import { LayersService } from '../../../layers/layers-service';
import { layers, shortcuts } from '../../../layers/registry';
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
    HlmPopoverPortal,
    HlmPopoverTrigger,
    HlmSlider,
    NgIcon,
    DecimalPipe,
  ],
  viewProviders: [provideIcons({ lucideChevronDown })],
  host: { class: 'block' },
  templateUrl: './layer-bar.html',
})
export class LayerBar {
  protected readonly ControlType = ControlType;
  protected readonly OptionsPresentation = OptionsPresentation;

  protected readonly layersService = inject(LayersService);
  protected readonly layers = Object.values(layers);
  protected readonly shortcuts = Object.values(shortcuts);
  protected readonly openGroups = signal(new Set<Layer<unknown>>());

  protected isGroupOpen(layer: Layer<unknown>): boolean {
    return this.openGroups().has(layer);
  }

  protected toggleGroup(layer: Layer<unknown>): void {
    this.openGroups.update((current) => {
      const next = new Set(current);
      if (!next.delete(layer)) next.add(layer);
      return next;
    });
  }

  protected hasChildRows(layer: Layer<unknown>): boolean {
    if (this.isGroupOpen(layer)) return true;
    if (!this.layersService.isLayerActive(layer)) return false;
    return layer.controls.length > 0 || layer.looks.some((entry) => this.layersService.isLookActive(entry));
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
