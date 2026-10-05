import { AfterViewInit, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideActivity, lucidePalette } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmTooltip } from '@spartan-ng/helm/tooltip';
import {
  HlmDropdownMenu,
  HlmDropdownMenuRadio,
  HlmDropdownMenuRadioIndicator,
  HlmDropdownMenuTrigger,
} from '@spartan-ng/helm/dropdown-menu';
import { PerfHud } from '../../dev/perf-hud/perf-hud';
import { MapService } from '../../engine/map-service';
import { LayersService } from '../../layers/layers-service';
import { HoverReadout } from './hover-readout/hover-readout';
import { LayerBar } from './layer-bar/layer-bar';
import { LegendBar } from './legend-bar/legend-bar';
import { LevelBar } from './level-bar/level-bar';
import { Meteogram } from './meteogram/meteogram';
import { PointMenu } from './point-menu/point-menu';
import { SettingsPanel } from './settings-panel/settings-panel';
import { SoundingTable } from './sounding-table/sounding-table';
import { TimeBar } from './time-bar/time-bar';
import { layers } from '../../layers/registry';

@Component({
  selector: 'app-home-page',
  imports: [
    HlmButton,
    HlmTooltip,
    HlmDropdownMenu,
    HlmDropdownMenuRadio,
    HlmDropdownMenuRadioIndicator,
    HlmDropdownMenuTrigger,
    NgIcon,
    PerfHud,
    HoverReadout,
    LayerBar,
    LegendBar,
    LevelBar,
    Meteogram,
    PointMenu,
    SettingsPanel,
    SoundingTable,
    TimeBar,
  ],
  viewProviders: [provideIcons({ lucideActivity, lucidePalette })],
  host: { class: 'block h-full' },
  templateUrl: './home-page.html',
})
export class HomePage implements AfterViewInit, OnDestroy {
  protected map = inject(MapService);
  private layers = inject(LayersService);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');
  private timeBar = viewChild.required(TimeBar, { read: ElementRef });
  protected perfHud = viewChild(PerfHud);
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
    this.layers.showLayer(layers.coordinates);
  }
}
