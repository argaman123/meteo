import type { Layer } from '@deck.gl/core';
import { ParticleLayer } from 'weatherlayers-gl';
import { ParticleLayerDefinition } from '../../layers/layer-definition';

export function renderParticleLayer(
  definition: ParticleLayerDefinition,
  particleCount: number,
): Layer {
  const wind = definition.wind;
  return new ParticleLayer({
    id: definition.entry.id,
    image: { data: wind.data, width: wind.width, height: wind.height },
    imageType: 'VECTOR',
    bounds: wind.bounds,
    numParticles: particleCount,
    opacity: definition.opacity,
  });
}
