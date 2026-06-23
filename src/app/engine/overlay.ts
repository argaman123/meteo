import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer } from '@deck.gl/core';
import { Grid } from '../objects/grid';
import { Look } from './looks/look';

export class Overlay {
  private overlay: MapboxOverlay;
  private looks = new Map<string, { look: Look; grid: Grid }>();

  constructor(map: maplibregl.Map) {
    this.overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(this.overlay as unknown as maplibregl.IControl);
  }

  draw(id: string, look: Look, grid: Grid): void {
    this.looks.set(id, { look, grid });
    this.sync();
  }

  private sync(): void {
    const layers: Layer[] = [...this.looks].map(([id, entry]) =>
      entry.look.deckLayer(id, entry.grid),
    );
    this.overlay.setProps({ layers });
  }
}
