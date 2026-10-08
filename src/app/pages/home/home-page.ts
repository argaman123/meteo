import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { PerfHud } from '../../dev/perf-hud/perf-hud';
import { MapService } from '../../engine/map-service';
import { LayersService } from '../../layers/layers-service';
import { HoverReadout } from './hover-readout/hover-readout';
import { LayerBar } from './layer-bar/layer-bar';
import { LegendBar } from './legend-bar/legend-bar';
import { LevelBar } from './level-bar/level-bar';
import { Measure } from './measure/measure';
import { Meteogram } from './meteogram/meteogram';
import { PointMenu } from './point-menu/point-menu';
import { Quality, quality } from './settings-panel/settings-controls';
import { SoundingTable } from './sounding-table/sounding-table';
import { TimeBar } from './time-bar/time-bar';
import { TopBar } from './top-bar/top-bar';
import { layers } from '../../layers/registry';

@Component({
  selector: 'app-home-page',
  imports: [
    PerfHud,
    HoverReadout,
    LayerBar,
    LegendBar,
    LevelBar,
    Measure,
    Meteogram,
    PointMenu,
    SoundingTable,
    TimeBar,
    TopBar,
  ],
  host: { class: 'block h-full', '[class.low-quality]': 'lowQuality()' },
  templateUrl: './home-page.html',
})
export class HomePage implements AfterViewInit, OnDestroy {
  private map = inject(MapService);
  private layersService = inject(LayersService);
  protected readonly lowQuality = computed(() => quality() === Quality.Low);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private timeBar = viewChild.required(TimeBar, { read: ElementRef });
  protected timeBarHeight = signal('3.625rem');
  private timeBarObserver = new ResizeObserver(([entry]) =>
    this.timeBarHeight.set(`${entry.borderBoxSize[0].blockSize}px`),
  );
  private soundingTable = viewChild.required(SoundingTable, { read: ElementRef });
  protected soundingTableWidth = signal('0px');
  private soundingTableObserver = new ResizeObserver(([entry]) =>
    this.soundingTableWidth.set(`${entry.borderBoxSize[0].inlineSize}px`),
  );

  ngAfterViewInit(): void {
    this.timeBarObserver.observe(this.timeBar().nativeElement);
    this.soundingTableObserver.observe(this.soundingTable().nativeElement);
    void this.start();
  }

  ngOnDestroy(): void {
    this.timeBarObserver.disconnect();
    this.soundingTableObserver.disconnect();
    this.map.destroy();
  }

  private async start(): Promise<void> {
    await this.map.init(this.container().nativeElement);
    this.layersService.showLayer(layers.coordinates);
  }
}
