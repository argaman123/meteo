import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBinoculars,
  lucideBird,
  lucideCalendarDays,
  lucideChevronDown,
  lucideCloudSun,
  lucideCloudy,
  lucideDroplets,
  lucideSatellite,
  lucideWaves,
} from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { Layer } from '../../../layers/base/layer';
import { LayerGroup } from '../../../layers/base/layer-group';
import { ShortcutType } from '../../../layers/base/shortcut';
import { LayersService } from '../../../layers/layers-service';
import { menuLayers, shortcuts } from '../../../layers/registry';
import { ControlType, OptionsPresentation } from '../../../utils/controls';
import { ControlView } from './control/control';

@Component({
  selector: 'app-layer-bar',
  imports: [ControlView, HlmButton, HlmCheckbox, NgIcon, RouterLink],
  viewProviders: [
    provideIcons({
      lucideBinoculars,
      lucideBird,
      lucideCalendarDays,
      lucideChevronDown,
      lucideCloudSun,
      lucideCloudy,
      lucideDroplets,
      lucideSatellite,
      lucideWaves,
    }),
  ],
  host: { class: 'block' },
  templateUrl: './layer-bar.html',
})
export class LayerBar {
  protected readonly ControlType = ControlType;
  protected readonly OptionsPresentation = OptionsPresentation;
  protected readonly ShortcutType = ShortcutType;

  protected layersService = inject(LayersService);
  protected readonly menuItems = menuLayers;
  protected readonly shortcuts = Object.values(shortcuts);
  protected readonly groupStates = signal(new Map<Layer<unknown>, boolean>());
  protected readonly layersExpanded = signal(true);

  protected groupOf(item: Layer<unknown> | LayerGroup): LayerGroup | null {
    return item instanceof LayerGroup ? item : null;
  }

  protected layerOf(item: Layer<unknown> | LayerGroup): Layer<unknown> {
    if (!(item instanceof LayerGroup)) return item;
    const active = item.layers.find(({ layer }) => this.layersService.isLayerActive(layer));
    return active?.layer ?? item.picked();
  }

  protected showGroupLayer(group: LayerGroup, layer: Layer<unknown>): void {
    const shown = this.layerOf(group);
    group.picked.set(layer);
    if (shown === layer || !this.layersService.isLayerActive(shown)) return;
    this.layersService.hideLayer(shown);
    this.layersService.showLayer(layer);
  }

  protected isExpanded(layer: Layer<unknown>): boolean {
    return this.layersService.isLayerActive(layer) && (this.groupStates().get(layer) ?? true);
  }

  protected isLayerLoading(layer: Layer<unknown>): boolean {
    const data = this.layersService.activeLayers().get(layer);
    return data !== undefined && data() === undefined;
  }

  protected isLayerEmpty(layer: Layer<unknown>): boolean {
    const data = this.layersService.activeLayers().get(layer);
    return data !== undefined && data() === null;
  }

  protected toggleGroup(layer: Layer<unknown>): void {
    const expand = !this.isExpanded(layer);
    this.groupStates.update((current) => new Map(current).set(layer, expand));
  }

  protected hasChildRows(layer: Layer<unknown>): boolean {
    return this.isExpanded(layer) && (layer.controls.length > 0 || layer.looks.length > 0);
  }
}
