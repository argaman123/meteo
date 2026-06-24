import { Service } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { Grid } from '../objects/grid';
import { Look } from './looks/look';

@Service()
export class Overlay {
  private overlay: MapboxOverlay | null = null;
  private layers = new Map<Look, DeckLayer>();
  private ids = new Map<Look, string>();
  private counter = 0;

  attach(map: maplibregl.Map): void {
    this.overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(this.overlay as unknown as maplibregl.IControl);
  }

  detach(): void {
    this.overlay = null;
    this.layers.clear();
    this.ids.clear();
    this.counter = 0;
  }

  draw(look: Look, grid: Grid): void {
    this.layers.set(look, look.deckLayer(this.idFor(look), grid));
    this.apply();
  }

  remove(look: Look): void {
    if (this.layers.delete(look)) this.apply();
  }

  private idFor(look: Look): string {
    let id = this.ids.get(look);
    if (id === undefined) {
      id = String(this.counter++);
      this.ids.set(look, id);
    }
    return id;
  }

  private apply(): void {
    this.overlay?.setProps({ layers: [...this.layers.values()] });
  }
}
