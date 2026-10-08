import { Signal } from '@angular/core';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { IconLayer } from '@deck.gl/layers';
import { Provider } from '../../objects/provider';
import { rgba } from '../../utils/color-scale';
import { Legend, Look, LookKind } from '../base/look';
import { OUTLINE_COLOR } from '../map-service';

interface IconPoint {
  lon: number;
  lat: number;
  color: string;
}

export interface SvgIconsInput {
  points: IconPoint[];
}

interface IconPart {
  point: IconPoint;
  outline: boolean;
}

export class SvgIcons extends Look<SvgIconsInput> {
  readonly kind = LookKind.Points;
  private readonly outlineColor = rgba(OUTLINE_COLOR);

  constructor(
    provider: Provider<SvgIconsInput>,
    private readonly icon: string,
    private readonly size: number,
    override readonly legend: Signal<Legend | null>,
  ) {
    super(provider);
  }

  deckLayer(id: string, input: SvgIconsInput): DeckLayer {
    const outlineIcon = this.iconFile(`${this.icon}-outline`);
    const fillIcon = this.iconFile(this.icon);
    return new IconLayer<IconPart>({
      id,
      data: input.points.flatMap((point) => [
        { point, outline: true },
        { point, outline: false },
      ]),
      getIcon: (part) => (part.outline ? outlineIcon : fillIcon),
      getPosition: ({ point }) => [point.lon, point.lat],
      getColor: (part) => (part.outline ? this.outlineColor : rgba(part.point.color)),
      getSize: this.size,
      sizeUnits: 'pixels',
    });
  }

  private iconFile(name: string) {
    return { id: name, url: `icons/${name}.svg`, width: 64, height: 64, mask: true };
  }
}
