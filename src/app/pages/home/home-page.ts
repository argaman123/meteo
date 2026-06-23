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
import { temperature } from '../../layers/temperature';
import { Grid } from '../../objects/grid';
import { ViewStore } from '../../stores/view-store';
import { Wrap } from '../../types/wrap';

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

  private grid = httpResource<Grid>(
    () => {
      const bbox = this.view.settledBbox();
      if (!bbox) return undefined;
      return {
        url: '/api/grids',
        params: {
          parameter: temperature.parameter,
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
      const grid = this.grid.value();
      if (!grid) return;
      temperature.looks.forEach((look, index) => {
        this.engine.draw(`${temperature.id}:${index}`, look, grid);
      });
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
