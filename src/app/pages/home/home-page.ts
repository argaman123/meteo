import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { BasemapId, MapEngine } from '../../engine/map-engine';

@Component({
  selector: 'app-home-page',
  host: { class: 'block h-full' },
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements AfterViewInit, OnDestroy {
  private engine = inject(MapEngine);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  basemaps: { id: BasemapId; label: string }[] = [
    { id: 'dark', label: 'כהה' },
    { id: 'light', label: 'בהיר' },
    { id: 'colorful', label: 'צבעוני' },
  ];
  basemap = signal<BasemapId>('dark');

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
