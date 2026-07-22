import { Component, computed, inject, linkedSignal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { GradientLegend, Legend, LegendType } from '../../../engine/base/look';
import { LayersService } from '../../../layers/layers-service';

@Component({
  selector: 'app-legend-bar',
  imports: [HlmButton, NgIcon],
  viewProviders: [provideIcons({ lucideChevronDown })],
  templateUrl: './legend-bar.html',
})
export class LegendBar {
  protected readonly LegendType = LegendType;

  private layersService = inject(LayersService);

  protected layerLegends = computed(() => {
    const legends: { title: string; legend: Legend }[] = [];
    for (const layer of this.layersService.activeLayers().keys()) {
      for (const entry of layer.looks) {
        if (this.layersService.isLookActive(entry) && entry.look.legend) {
          legends.push({ title: layer.name, legend: entry.look.legend });
        }
      }
    }
    return legends;
  });

  protected readonly openLegend = linkedSignal(() => this.layerLegends().at(-1)?.legend ?? null);

  protected toggleLegend(legend: Legend): void {
    this.openLegend.update((current) => (current === legend ? null : legend));
  }

  protected gradientBackground(legend: GradientLegend): string {
    return `linear-gradient(to top, ${legend.stops.map((stop) => stop.color).join(', ')})`;
  }
}
