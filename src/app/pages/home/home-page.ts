import { AfterViewInit, Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { PerfHud } from '../../dev/perf-hud/perf-hud';
import { MapService } from '../../engine/map-service';
import { LayersService } from '../../layers/layers-service';
import { HoverReadout } from './hover-readout/hover-readout';
import { LayerBar } from './layer-bar/layer-bar';
import { LegendBar } from './legend-bar/legend-bar';
import { TimeBar } from './time-bar/time-bar';
import { layers } from '../../layers/registry';

@Component({
  selector: 'app-home-page',
  imports: [HlmButton, PerfHud, HoverReadout, LayerBar, LegendBar, TimeBar],
  host: { class: 'block h-full' },
  templateUrl: './home-page.html',
})
export class HomePage implements AfterViewInit, OnDestroy {
  protected map = inject(MapService);
  private layers = inject(LayersService);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  ngAfterViewInit(): void {
    void this.start();
  }

  ngOnDestroy(): void {
    this.map.destroy();
  }

  private async start(): Promise<void> {
    await this.map.init(this.container().nativeElement);
    this.layers.showLayer(layers.polygons);
  }
}
