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
import {
  FieldGrid,
  convertKnotsToMetersPerSecond,
  parseFieldGrid,
  toVectorField,
} from '../../map/layers/field-grid';
import { ColorStop } from '../../map/layers/layer-definition';

const TEMPERATURE_PALETTE: ColorStop[] = [
  { value: -30, color: '#312e81' },
  { value: -15, color: '#1d4ed8' },
  { value: 0, color: '#0ea5e9' },
  { value: 10, color: '#34d399' },
  { value: 20, color: '#fbbf24' },
  { value: 30, color: '#f97316' },
  { value: 40, color: '#dc2626' },
];

type ModelId = 'eaa' | 'mideast';

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
      <div
        class="absolute start-3 top-3 flex flex-col gap-2 rounded-md border border-panel-border bg-panel/90 p-2"
      >
        @for (item of models; track item.id) {
          <button
            class="rounded px-2 py-1 text-sm"
            [class.bg-accent]="model() === item.id"
            [class.text-app]="model() === item.id"
            (click)="setModel(item.id)"
          >
            {{ item.label }}
          </button>
        }
        <div class="flex gap-1 border-t border-panel-border pt-2" dir="ltr">
          @for (hours of forecastHoursOptions; track hours) {
            <button
              class="rounded px-2 py-1 text-sm"
              [class.bg-accent]="forecastHours() === hours"
              [class.text-app]="forecastHours() === hours"
              (click)="setForecastHours(hours)"
            >
              +{{ hours }}
            </button>
          }
        </div>
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
  models: { id: ModelId; label: string }[] = [
    { id: 'eaa', label: 'אירופה–אסיה' },
    { id: 'mideast', label: 'מזרח תיכון' },
  ];
  forecastHoursOptions = [0, 6, 12];

  basemap = signal<BasemapId>('dark');
  viewMode = signal<ViewMode>('globe');
  model = signal<ModelId>('eaa');
  forecastHours = signal(0);

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

  setModel(id: ModelId): void {
    this.model.set(id);
    void this.loadDataLayers();
  }

  setForecastHours(hours: number): void {
    this.forecastHours.set(hours);
    void this.loadDataLayers();
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }

  private async start(): Promise<void> {
    await this.engine.init(this.container().nativeElement, this.basemap());
    await this.loadDataLayers();
  }

  private async loadDataLayers(): Promise<void> {
    const hour = String(this.forecastHours()).padStart(3, '0');
    const base = `/fixtures/models/${this.model()}`;
    const [temperature, speed, direction] = await Promise.all([
      this.fetchGrid(`${base}/temperature_+${hour}.json`),
      this.fetchGrid(`${base}/windSpeed_+${hour}.json`),
      this.fetchGrid(`${base}/windDirection_+${hour}.json`),
    ]);
    const speedMetersPerSecond =
      speed.units === 'kt' ? convertKnotsToMetersPerSecond(speed) : speed;
    this.engine.addLayer({
      id: 'temperature',
      type: 'colormap',
      grid: temperature,
      palette: TEMPERATURE_PALETTE,
      opacity: 0.7,
    });
    this.engine.addLayer({
      id: 'wind',
      type: 'particles',
      wind: toVectorField(speedMetersPerSecond, direction),
      opacity: 0.9,
    });
  }

  private async fetchGrid(url: string): Promise<FieldGrid> {
    const response = await fetch(url);
    return parseFieldGrid(await response.json());
  }
}
