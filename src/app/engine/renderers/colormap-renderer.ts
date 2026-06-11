import type { Layer } from '@deck.gl/core';
import { RasterLayer } from 'weatherlayers-gl';
import { ColormapLayerDefinition } from '../../layers/layer-definition';
import { downsampleGrid } from '../../utils/grids';

export function renderColormapLayer(
  definition: ColormapLayerDefinition,
  textureMaxDimension: number,
): Layer {
  const grid = downsampleGrid(definition.grid, textureMaxDimension);
  return new RasterLayer({
    id: definition.entry.id,
    image: { data: grid.data, width: grid.width, height: grid.height },
    imageType: 'SCALAR',
    bounds: grid.bounds,
    palette: definition.entry.palette.map((stop) => [stop.value, stop.color] as [number, string]),
    opacity: definition.opacity,
  });
}
