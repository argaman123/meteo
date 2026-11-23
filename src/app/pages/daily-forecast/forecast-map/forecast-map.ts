import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { MapService } from '../../../engine/map-service';
import { OverlayService } from '../../../engine/overlay-service';
import { LayersService } from '../../../layers/layers-service';
import { PolygonsLayer, SECTORS } from '../../../layers/polygons/polygons-layer';
import { PlayerService } from '../../../services/player-service';
import { TimeService } from '../../../services/time-service';
import { Sector } from '../../../types/polygons';
import { formatLocalDay, formatLocalHour, minutesToMs } from '../../../utils/time';
import { HoverReadout } from '../../home/hover-readout/hover-readout';

@Component({
  selector: 'app-forecast-map',
  imports: [HoverReadout],
  providers: [MapService, OverlayService, LayersService, TimeService, PlayerService],
  host: { class: 'flex flex-col' },
  templateUrl: './forecast-map.html',
})
export class ForecastMap implements AfterViewInit, OnDestroy {
  private mapService = inject(MapService);
  private layersService = inject(LayersService);
  private timeService = inject(TimeService);
  private readonly polygons = new PolygonsLayer();
  private reloadHandle = 0;
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  readonly forecastTime = input.required<number>();
  readonly sector = input.required<Sector>();

  private followForecastTime = effect(() => this.timeService.setExactTime(this.forecastTime()));
  private followSector = effect(() => {
    this.polygons.sector.set(this.sector());
    this.mapService.fixView(SECTORS[this.sector()]);
  });

  protected readonly hour = computed(() => formatLocalHour(this.forecastTime()));
  protected readonly day = computed(() => formatLocalDay(this.forecastTime()));
  protected readonly hasNoMap = computed(
    () => this.layersService.activeLayers().get(this.polygons)?.() === null,
  );

  ngAfterViewInit(): void {
    void this.start();
  }

  ngOnDestroy(): void {
    clearInterval(this.reloadHandle);
    this.layersService.hideLayer(this.polygons);
    this.mapService.destroy();
  }

  private async start(): Promise<void> {
    await this.mapService.init(this.container().nativeElement, SECTORS[this.sector()]);
    this.layersService.showLayer(this.polygons);
    this.reloadHandle = window.setInterval(
      () => this.layersService.reloadLayer(this.polygons),
      minutesToMs(1),
    );
  }
}
