import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ParticleLayer } from 'weatherlayers-gl';

const params = new URLSearchParams(location.search);
const projection = params.get('proj') ?? 'globe';
const maxAge = Number(params.get('maxAge') ?? 10);
const interleaved = (params.get('interleaved') ?? '1') === '1';
const zoom = Number(params.get('zoom') ?? 4.5);

const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#0b0f17' } }],
  },
  center: [35, 31],
  zoom,
  attributionControl: false,
});

map.on('style.load', () => {
  map.setProjection({ type: projection });
  const width = 256;
  const height = 128;
  const data = new Float32Array(width * height * 2);
  for (let i = 0; i < width * height; i++) {
    data[i * 2] = 8;
    data[i * 2 + 1] = 0;
  }
  const layer = new ParticleLayer({
    id: 'particles',
    image: { data, width, height },
    imageType: 'VECTOR',
    bounds: [-180, -90, 180, 90],
    numParticles: 20000,
    maxAge,
    color: [255, 255, 255],
  });
  const overlay = new MapboxOverlay({ interleaved, layers: [layer] });
  map.addControl(overlay);
});
