import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FieldData } from '../../data/field-data';
import { PerfHud } from '../../dev/perf-hud/perf-hud';
import { BasemapId, MapEngine } from '../../engine/map-engine';
import { HoverReadout } from './hover-readout/hover-readout';
import { LayerBar } from './layer-bar/layer-bar';
import { TimeBar } from './time-bar/time-bar';

@Component({
  selector: 'app-home-page',
  imports: [PerfHud, TimeBar, LayerBar, HoverReadout],
  host: { class: 'block h-full' },
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements AfterViewInit, OnDestroy {
  private engine = inject(MapEngine);
  protected fieldData = inject(FieldData);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  basemaps: { id: BasemapId; label: string }[] = [
    { id: 'dark', label: 'כהה' },
    { id: 'light', label: 'בהיר' },
    { id: 'colorful', label: 'צבעוני' },
  ];
  basemap = signal<BasemapId>('dark');
  engineReady = signal(false);

  ngAfterViewInit(): void {
    void this.start();
  }

  setBasemap(id: BasemapId): void {
    this.basemap.set(id);
    void this.engine.setBasemap(id);
  }

  ngOnDestroy(): void {
    this.engine.destroy();
  }

  private async start(): Promise<void> {
    await this.engine.init(this.container().nativeElement, this.basemap());
    this.engineReady.set(true);
  }
}
