// TODO: UNVERIFIED CODE BELOW
import maplibregl from 'maplibre-gl';
import { IconScaling, type IconOverlay, type Sprite } from '../base/overlay';
import { GeoJsonRenderer } from './overlay-renderer';

const LARGEST_ICON_SIZE = 250;

export class IconRenderer extends GeoJsonRenderer<IconOverlay> {
  private readonly sprites = new Map<string, HTMLCanvasElement>();
  private worldZoomSpan = 24;

  override restore(): void {
    for (const [name, canvas] of this.sprites) this.addImage(name, canvas);
    super.restore();
  }

  override destroy(): void {
    super.destroy();
    for (const name of this.sprites.keys()) {
      if (this.map.hasImage(name)) this.map.removeImage(name);
    }
    this.sprites.clear();
  }

  protected featuresOf(overlay: IconOverlay): GeoJSON.Feature[] {
    let largest = 0;
    const features: GeoJSON.Feature[] = overlay.icons.map((icon) => {
      const canvas = this.spriteOf(icon.sprite);
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: icon.position },
        properties: {
          image: this.nameOf(icon.sprite),
          size: icon.size / canvas.height,
          angle: icon.angle,
          opacity: icon.opacity,
        },
      };
    });
    for (const feature of features) largest = Math.max(largest, feature.properties!['size']);
    this.worldZoomSpan = largest > 0 ? Math.max(1, Math.min(24, Math.floor(Math.log2(LARGEST_ICON_SIZE / largest)))) : 24;
    return features;
  }

  protected layersOf(overlay: IconOverlay): maplibregl.LayerSpecification[] {
    const size: maplibregl.DataDrivenPropertyValueSpecification<number> =
      overlay.scaling === IconScaling.World
        ? [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0,
            ['get', 'size'],
            this.worldZoomSpan,
            ['*', ['get', 'size'], Math.pow(2, this.worldZoomSpan)],
          ]
        : ['get', 'size'];
    return [
      {
        id: this.id,
        type: 'symbol',
        source: this.source.id,
        filter: this.partFilter(),
        layout: {
          'icon-image': ['get', 'image'],
          'icon-size': size,
          'icon-rotate': ['get', 'angle'],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-rotation-alignment': 'viewport',
          'icon-pitch-alignment': 'viewport',
          'symbol-z-order': 'source',
        },
        paint: { 'icon-opacity': ['get', 'opacity'] },
      },
    ];
  }

  private spriteOf(sprite: Sprite): HTMLCanvasElement {
    const name = this.nameOf(sprite);
    let canvas = this.sprites.get(name);
    if (!canvas) {
      canvas = sprite.create();
      this.sprites.set(name, canvas);
      this.addImage(name, canvas);
    }
    return canvas;
  }

  private addImage(name: string, canvas: HTMLCanvasElement): void {
    if (this.map.hasImage(name)) return;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    this.map.addImage(name, pixels);
  }

  private nameOf(sprite: Sprite): string {
    return `${this.id}|${sprite.key}`;
  }
}
