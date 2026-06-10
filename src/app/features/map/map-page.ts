import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { BasemapId, MapEngine, ViewMode } from '../../map/engine/map-engine';

@Component({
  selector: 'app-map-page',
  host: { class: 'block h-full' },
  template: `
    <div class="relative h-full">
      <div #mapContainer class="h-full w-full"></div>
      <div
        class="absolute end-3 top-3 flex flex-col gap-2 rounded-md border border-panel-border bg-panel/90 p-2"
      >
        @for (item of basemaps; track item.id) {
          <button
            class="rounded px-2 py-1 text-sm"
            [class.bg-accent]="basemap() === item.id"
            [class.text-app]="basemap() === item.id"
            (click)="setBasemap(item.id)"
          >
            {{ item.label }}
          </button>
        }
        <button
          class="rounded border-t border-panel-border px-2 py-1 text-sm"
          (click)="toggleView()"
        >
          {{ viewMode() === 'globe' ? 'מפה שטוחה' : 'גלובוס' }}
        </button>
      </div>
    </div>
  `,
})
export class MapPage implements AfterViewInit, OnDestroy {
  private engine = inject(MapEngine);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  basemaps: { id: BasemapId; label: string }[] = [
    { id: 'dark', label: 'כהה' },
    { id: 'light', label: 'בהיר' },
    { id: 'colorful', label: 'צבעוני' },
  ];
  basemap = signal<BasemapId>('dark');
  viewMode = signal<ViewMode>('globe');

  ngAfterViewInit(): void {
    void this.engine.init(this.container().nativeElement, this.basemap());
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
}
