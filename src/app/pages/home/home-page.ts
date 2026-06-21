import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { httpResource } from '@angular/common/http';
import { BasemapId, MapEngine } from '../../engine/map-engine';
import { ColorStop, colormapImage, colorScale } from '../../engine/renderers/colormap';
import { Grid } from '../../objects/grid';
import { ViewStore } from '../../stores/view-store';
import { Wrap } from '../../types/wrap';

const TEMPERATURE_PALETTE: ColorStop[] = [
  { value: -30, color: '#312e81' },
  { value: -15, color: '#1d4ed8' },
  { value: 0, color: '#0ea5e9' },
  { value: 10, color: '#34d399' },
  { value: 20, color: '#fbbf24' },
  { value: 30, color: '#f97316' },
  { value: 40, color: '#dc2626' },
];

@Component({
  selector: 'app-home-page',
  host: { class: 'block h-full' },
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements AfterViewInit, OnDestroy {
  private engine = inject(MapEngine);
  private view = inject(ViewStore);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  basemaps: { id: BasemapId; label: string }[] = [
    { id: 'dark', label: 'כהה' },
    { id: 'light', label: 'בהיר' },
    { id: 'colorful', label: 'צבעוני' },
  ];
  basemap = signal<BasemapId>('dark');

  private temperatureScale = colorScale(TEMPERATURE_PALETTE, 'smooth');

  private temperature = httpResource<Grid>(
    () => {
      const bbox = this.view.settledBbox();
      if (!bbox) return undefined;
      return {
        url: '/api/grids',
        params: {
          parameter: 'temperature',
          model: 'wide',
          time: String(Math.floor(Date.now() / 1000)),
          bbox: bbox.join(','),
        },
      };
    },
    { parse: (raw) => new Grid(raw as Wrap) },
  );

  constructor() {
    effect(() => {
      const grid = this.temperature.value();
      if (!grid) return;
      this.engine.showColormap(
        'temperature',
        colormapImage(grid, this.temperatureScale),
        grid.bounds,
        0.6,
      );
    });
  }

  ngAfterViewInit(): void {
    void this.engine.init(this.container().nativeElement, this.basemap());
  }

  setBasemap(id: BasemapId): void {
    this.basemap.set(id);
    void this.engine.setBasemap(id);
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }
}
