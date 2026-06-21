import type { Layer } from '@deck.gl/core';
import { LineLayer } from '@deck.gl/layers';
import { ParticleAppearanceName } from '../../layers/look';
import { arcAppearance } from './arc-appearance';
import { ParticleAppearance, ParticleSystem } from './particle-system';
import { trailAppearance } from './trail-appearance';

export function renderParticleLayer(
  id: string,
  appearanceName: ParticleAppearanceName,
  opacity: number,
  system: ParticleSystem,
  widthPixels: number,
  sizeScale: number,
): Layer {
  const appearance: ParticleAppearance =
    appearanceName === 'arcs' ? arcAppearance : trailAppearance;
  const length = appearance(
    system.frame(),
    system.segmentSources,
    system.segmentTargets,
    system.segmentColors,
    sizeScale,
  );
  return new LineLayer({
    id,
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
    opacity,
  });
}
