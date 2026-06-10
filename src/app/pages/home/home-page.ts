import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { PerfHud } from '../../dev/perf-hud/perf-hud';
import { SpikeControls } from '../../dev/spike/spike-controls';
import { BasemapId, MapEngine, ViewMode } from '../../engine/map-engine';

@Component({
  selector: 'app-home-page',
  imports: [PerfHud, SpikeControls],
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
  viewMode = signal<ViewMode>('flat');
  engineReady = signal(false);

  ngAfterViewInit(): void {
    void this.start();
  }

  setBasemap(id: BasemapId): void {
    this.basemap.set(id);
    void this.engine.setBasemap(id);
  }

  toggleView(): void {
    this.viewMode.update((mode) => (mode === 'globe' ? 'flat' : 'globe'));
    this.engine.setViewMode(this.viewMode());
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }

  private async start(): Promise<void> {
    await this.engine.init(this.container().nativeElement, this.basemap(), this.viewMode());
    this.engineReady.set(true);
  }
}
