import { Service } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { Look, LookKind } from './base/look';

@Service()
export class Overlay {
  private overlay: MapboxOverlay | null = null;
  private layers = new Map<Look<unknown>, DeckLayer | DeckLayer[]>();
  private ids = new Map<Look<unknown>, string>();
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

  draw(look: Look<unknown>, data: unknown): void {
    this.layers.set(look, look.deckLayer(this.idFor(look), look.provider.provide(data)));
    this.apply();
  }

  remove(look: Look<unknown>): void {
    if (this.layers.delete(look)) this.apply();
  }

  private idFor(look: Look<unknown>): string {
    let id = this.ids.get(look);
    if (id === undefined) {
      id = String(this.counter++);
      this.ids.set(look, id);
    }
    return id;
  }

  private apply(): void {
    const ordered = [...this.layers.entries()]
      .sort(([a], [b]) => a.kind - b.kind)
      .flatMap(([look, layer]) =>
        look.kind < LookKind.Borders ? this.slotUnderBorders([layer].flat()) : layer,
      );
    this.overlay?.setProps({ layers: ordered });
  }

  private slotUnderBorders(layers: DeckLayer[]): DeckLayer[] {
    return layers.map((layer) =>
      (layer as DeckLayer<{ beforeId?: string }>).clone({ beforeId: 'coastline' }),
    );
  }
}
