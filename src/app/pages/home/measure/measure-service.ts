import { Service, computed, effect, inject } from '@angular/core';
import { MapService } from '../../../engine/map-service';
import { LayersService } from '../../../layers/layers-service';
import { layers } from '../../../layers/registry';

@Service()
export class MeasureService {
  private map = inject(MapService);
  private layersService = inject(LayersService);
  private measurement = layers.measurement;
  readonly active = computed(() => this.layersService.isLayerActive(this.measurement));
  readonly points = computed(() => (this.active() ? this.measurement.points() : []));

  private syncDoubleClickZoom = effect(() => this.map.setDoubleClickZoom(!this.active()));

  constructor() {
    this.map.clicks.subscribe((click) => this.addPoint([click.lon, click.lat]));
    this.map.rightClicks.subscribe(() => this.hideMeasure());
  }

  showMeasure(start?: [number, number]): void {
    this.measurement.points.set(start ? [start] : []);
    if (!this.active()) this.layersService.showLayer(this.measurement);
  }

  addPoint(point: [number, number]): void {
    if (this.active()) this.measurement.points.update((points) => [...points, point]);
  }

  movePoint(index: number, point: [number, number]): void {
    this.measurement.points.update((points) =>
      points.map((old, at) => (at === index ? point : old)),
    );
  }

  hideMeasure(): void {
    if (this.active()) this.layersService.hideLayer(this.measurement);
  }

  toggleMeasure(): void {
    if (this.active()) this.hideMeasure();
    else this.showMeasure();
  }
}
