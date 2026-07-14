import { Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import {
  HlmPopover,
  HlmPopoverContent,
  HlmPopoverPortal,
  HlmPopoverTrigger,
} from '@spartan-ng/helm/popover';
import { DecimalPipe } from '@angular/common';
import { HlmSlider } from '@spartan-ng/helm/slider';
import { LookKind } from '../../../engine/base/look';
import { Colormap } from '../../../engine/looks/colormap';
import { WindParticles } from '../../../engine/looks/wind-particles';
import { Layer } from '../../../layers/layer';
import { LayersService } from '../../../layers/layers-service';
import { layers, shortcuts } from '../../../layers/registry';

@Component({
  selector: 'app-layer-bar',
  imports: [
    HlmButton,
    HlmCheckbox,
    HlmPopover,
    HlmPopoverContent,
    HlmPopoverPortal,
    HlmPopoverTrigger,
    HlmSlider,
    NgIcon,
    DecimalPipe,
  ],
  viewProviders: [provideIcons({ lucideChevronDown })],
  templateUrl: './layer-bar.html',
  styleUrl: './layer-bar.css',
})
export class LayerBar {
  protected readonly LookKind = LookKind;

  protected readonly service = inject(LayersService);
  protected readonly layers = Object.values(layers);
  protected readonly shortcuts = Object.values(shortcuts);
  protected readonly openGroups = signal(new Set<Layer>());

  protected isGroupOpen(layer: Layer): boolean {
    return this.openGroups().has(layer);
  }

  protected toggleGroup(layer: Layer): void {
    this.openGroups.update((current) => {
      const next = new Set(current);
      if (!next.delete(layer)) next.add(layer);
      return next;
    });
  }

  protected setOpacity(look: Colormap, values: number[]): void {
    look.opacity.set(values[0]);
  }

  protected cycleSpeed(look: WindParticles): void {
    const speeds = [0.5, 1, 2];
    look.speed.set(speeds[(speeds.indexOf(look.speed()) + 1) % speeds.length]);
  }
}
