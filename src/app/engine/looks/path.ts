import type { Layer as DeckLayer } from '@deck.gl/core';
import { PathStyleExtension, PathStyleExtensionProps } from '@deck.gl/extensions';
import { PathLayer } from '@deck.gl/layers';
import { rgba } from '../../utils/color-scale';
import { Look, LookKind } from '../base/look';

export interface PathInput {
  points: [number, number][];
  nextPoint: [number, number] | null;
}

export class Path extends Look<PathInput> {
  readonly kind = LookKind.Lines;

  deckLayer(id: string, input: PathInput): DeckLayer[] {
    return [
      new PathLayer<PathInput>({
        id: `${id}-casing`,
        data: [input],
        getPath: (path) => path.points,
        getColor: rgba('#0f172a', 200),
        getWidth: 5,
        widthUnits: 'pixels',
      }),
      new PathLayer<PathInput>({
        id: `${id}-line`,
        data: [input],
        getPath: (path) => path.points,
        getColor: rgba('#ffffff', 255),
        getWidth: 2.5,
        widthUnits: 'pixels',
      }),
      new PathLayer<[number, number][], PathStyleExtensionProps<[number, number][]>>({
        id: `${id}-next`,
        data: input.nextPoint ? [[input.points[input.points.length - 1], input.nextPoint]] : [],
        getPath: (leg) => leg,
        getColor: rgba('#ffffff', 200),
        getWidth: 2,
        widthUnits: 'pixels',
        getDashArray: [4, 3],
        extensions: [new PathStyleExtension({ dash: true })],
      }),
    ];
  }
}
