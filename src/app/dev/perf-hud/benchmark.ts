import { MapService } from '../../engine/map-service';
import { LayersService } from '../../layers/layers-service';
import { layers, shortcuts } from '../../layers/registry';

interface DevMap {
  setPixelRatio(ratio: number): void;
  getPixelRatio(): number;
  getCanvas(): HTMLCanvasElement;
  painter: { context: { gl: WebGLRenderingContext } };
}

interface Setup {
  name: string;
  apply: () => void;
  undo?: () => void;
}

export async function runBenchmark(
  mapService: MapService,
  layersService: LayersService,
): Promise<void> {
  const map = (mapService as unknown as { map: DevMap }).map;
  const gl = map.painter.context.gl;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const pixelRatio = map.getPixelRatio();
  const hideAll = () => {
    for (const layer of [...layersService.activeLayers().keys()]) {
      if (layer !== layers.coordinates) layersService.hideLayer(layer);
    }
  };
  const noFrost = Object.assign(document.createElement('style'), {
    textContent: '*{backdrop-filter:none!important}',
  });
  const setups: Setup[] = [
    { name: 'basemap only', apply: hideAll },
    {
      name: 'temperature colors',
      apply: () => (hideAll(), layersService.showLayer(layers.temperature)),
    },
    {
      name: 'contours only',
      apply: () => (hideAll(), layersService.showLayer(layers.geopotential)),
    },
    {
      name: 'temperature + contours, no wind',
      apply: () => (
        hideAll(),
        layersService.showLayer(layers.temperature),
        layersService.showLayer(layers.geopotential)
      ),
    },
    {
      name: 'weather shortcut',
      apply: () => (hideAll(), layersService.showShortcut(shortcuts.weather)),
    },
    { name: 'polygons', apply: () => (hideAll(), layersService.showLayer(layers.polygons)) },
    {
      name: 'weather, no frosted panels',
      apply: () => (
        hideAll(),
        layersService.showShortcut(shortcuts.weather),
        document.head.append(noFrost)
      ),
      undo: () => noFrost.remove(),
    },
    {
      name: 'weather, map at 75% resolution',
      apply: () => (
        hideAll(),
        layersService.showShortcut(shortcuts.weather),
        map.setPixelRatio(pixelRatio * 0.75)
      ),
      undo: () => map.setPixelRatio(pixelRatio),
    },
    {
      name: 'weather, map at 50% resolution',
      apply: () => (
        hideAll(),
        layersService.showShortcut(shortcuts.weather),
        map.setPixelRatio(pixelRatio * 0.5)
      ),
      undo: () => map.setPixelRatio(pixelRatio),
    },
  ];
  const results: Record<string, { average: number; worst: number }> = {};
  for (const setup of setups) {
    setup.apply();
    await wait(5000);
    results[setup.name] = await measureFlight(mapService);
    setup.undo?.();
  }
  hideAll();
  const canvas = map.getCanvas();
  console.log(
    `renderer: ${info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '?'} · canvas ${canvas.width}×${canvas.height} · dpr ${devicePixelRatio}`,
  );
  console.table(results);
  console.log(
    Object.entries(results)
      .map(
        ([name, { average, worst }]) =>
          `${name.padEnd(34)} ${String(average).padStart(4)} fps avg · ${String(worst).padStart(4)} worst`,
      )
      .join('\n'),
  );
}

async function measureFlight(mapService: MapService): Promise<{ average: number; worst: number }> {
  const frames: number[] = [];
  let last = performance.now();
  let running = true;
  const tick = (now: number) => {
    frames.push(now - last);
    last = now;
    if (running) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const stops: [number, number][] = [
    [33.8, 31.0],
    [36.0, 32.6],
    [34.6, 30.2],
    [35.2, 31.8],
  ];
  for (const stop of stops) {
    mapService.flyTo(stop);
    await wait(1500);
  }
  running = false;
  const intervals = frames.slice(5);
  const average = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const worst = [...intervals].sort((a, b) => b - a)[Math.floor(intervals.length * 0.05)];
  return { average: Math.round(1000 / average), worst: Math.round(1000 / worst) };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
