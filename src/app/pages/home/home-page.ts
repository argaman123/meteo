import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
import { MapService } from '../../engine/map-service';
import { LayersService } from '../../layers/layers-service';
import { LayerBar } from './layer-bar/layer-bar';

@Component({
  selector: 'app-home-page',
  imports: [LayerBar],
  host: { class: 'block h-full' },
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements AfterViewInit, OnDestroy {
  protected map = inject(MapService);
  private layers = inject(LayersService);
  private container = viewChild.required<ElementRef<HTMLDivElement>>('mapContainer');

  ngAfterViewInit(): void {
    void this.start();
  }

  ngOnDestroy(): void {
    this.map.destroy();
  }

  private async start(): Promise<void> {
    await this.map.init(this.container().nativeElement);
    this.layers.showDefaults();
  }
}
