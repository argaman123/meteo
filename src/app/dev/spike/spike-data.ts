import { MapEngine } from '../../engine/map-engine';
import { temperatureLayer } from '../../layers/model/temperature';
import { windLayer } from '../../layers/model/wind';
import { FieldGrid, FieldGridDocument } from '../../types/field-grid';
import { knotsToMetersPerSecond } from '../../units/units';
import { mapGridValues, parseFieldGrid, toVectorField } from '../../utils/grids';

export type SpikeModelId = 'wide' | 'local';

export async function loadSpikeLayers(
  engine: MapEngine,
  model: SpikeModelId,
  forecastHours: number,
): Promise<void> {
  const hour = String(forecastHours).padStart(3, '0');
  const base = `/fixtures/models/${model}`;
  const [temperature, speed, direction] = await Promise.all([
    fetchGrid(`${base}/${temperatureLayer.parameter}_+${hour}.json`),
    fetchGrid(`${base}/${windLayer.speedParameter}_+${hour}.json`),
    fetchGrid(`${base}/${windLayer.directionParameter}_+${hour}.json`),
  ]);
  const speedMetersPerSecond =
    speed.units === 'kt' ? mapGridValues(speed, knotsToMetersPerSecond, 'm/s') : speed;
  engine.addLayer({
    entry: temperatureLayer,
    grid: temperature,
    opacity: temperatureLayer.defaultOpacity,
    order: 0,
  });
  engine.addLayer({
    entry: windLayer,
    wind: toVectorField(speedMetersPerSecond, direction),
    opacity: windLayer.defaultOpacity,
    order: 1,
  });
}

async function fetchGrid(url: string): Promise<FieldGrid> {
  const response = await fetch(url);
  return parseFieldGrid((await response.json()) as FieldGridDocument);
}
