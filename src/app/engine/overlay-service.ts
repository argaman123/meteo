import { Service } from '@angular/core';
import maplibregl from 'maplibre-gl';
import { MapLibreOverlay } from '@deck.gl/maplibre';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { Look, LookKind } from './base/look';
import { GlobeOcclusion } from './globe-occlusion';

@Service()
export class OverlayService {
  private overlay: MapLibreOverlay | null = null;
  private layers = new Map<Look<unknown>, DeckLayer | DeckLayer[]>();
  private ids = new Map<Look<unknown>, string>();
  private counter = 0;
  // deck.gl workaround (#10519): on the globe, depth hides colors and lines, culling hides icons.
  // Remove once deck fixes it.
  private readonly globeParameters = {
    depthCompare: 'always',
    depthWriteEnabled: false,
    cullMode: 'none',
  } as const;
  // deck.gl workaround (#10750): hides the globe's far side. Remove once deck fixes it.
  private readonly globeOcclusion = new GlobeOcclusion();

  attach(map: maplibregl.Map): void {
    this.overlay = new MapLibreOverlay({ interleaved: true, layers: [] });
    map.addControl(this.overlay);
  }

  detach(): void {
    for (const look of this.layers.keys()) look.release();
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
    if (!this.layers.delete(look)) return;
    look.release();
    this.apply();
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
      )
      // deck.gl workarounds (#10519, #10750): remove once deck fixes them.
      .map((layer) =>
        layer.clone({
          parameters: this.globeParameters,
          extensions: [...layer.props.extensions, this.globeOcclusion],
        }),
      );
    this.overlay?.setProps({ layers: ordered });
  }

  private slotUnderBorders(layers: DeckLayer[]): DeckLayer[] {
    return layers.map((layer) =>
      (layer as DeckLayer<{ beforeId?: string }>).clone({ beforeId: 'coastline' }),
    );
  }
}
