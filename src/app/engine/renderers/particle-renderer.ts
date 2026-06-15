import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleLayerDefinition } from '../../layers/layer-definition';
import { arcAppearance } from './arc-appearance';
import { ParticleAppearance, ParticleSystem } from './particle-system';
import { trailAppearance } from './trail-appearance';

const BASE_LINE_WIDTH_PIXELS = 1.5;

export function particleLineWidth(): number {
  return BASE_LINE_WIDTH_PIXELS;
}

export function renderParticleLayer(
  definition: ParticleLayerDefinition,
  system: ParticleSystem,
  widthPixels: number,
): Layer {
  const appearance: ParticleAppearance =
    definition.entry.appearance === 'arcs' ? arcAppearance : trailAppearance;
  const length = appearance(
    system.frame(),
    system.segmentSources,
    system.segmentTargets,
    system.segmentColors,
  );
  return new LineLayer({
    id: definition.entry.id,
    data: {
      length,
      attributes: {
        getSourcePosition: { value: system.segmentSources, size: 2 },
        getTargetPosition: { value: system.segmentTargets, size: 2 },
        getColor: { value: system.segmentColors, size: 4 },
      },
    },
    getWidth: widthPixels,
    widthUnits: 'pixels',
    opacity: definition.opacity,
  });
}
