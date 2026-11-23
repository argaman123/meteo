// TODO: UNVERIFIED CODE BELOW
import { signal } from '@angular/core';
import { Grid } from '../../objects/grid';
import { ColorStop, PaletteStyle } from '../../utils/color-scale';
import { ContourLine } from '../../utils/contours';
import {
  BackgroundJob,
  BackgroundTask,
  ContoursTask,
  GridValues,
  ImageTask,
} from './background-task';

let worker: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, (result: unknown) => void>();

function run<O>(task: ImageTask | ContoursTask): Promise<O> {
  worker ??= createWorker();
  const id = nextId++;
  return new Promise<O>((resolve) => {
    waiting.set(id, resolve as (result: unknown) => void);
    worker!.postMessage({ id, task } satisfies BackgroundJob, [task.values.buffer]);
  });
}

function createWorker(): Worker {
  const created = new Worker(new URL('./background.worker', import.meta.url), { type: 'module' });
  created.addEventListener('message', ({ data }: MessageEvent<{ id: number; result: unknown }>) => {
    waiting.get(data.id)?.(data.result);
    waiting.delete(data.id);
  });
  return created;
}

function valuesOf(grid: Grid): GridValues {
  return { values: grid.data.slice(), width: grid.width, height: grid.height, bounds: grid.bounds };
}

export function buildImageInBackground(
  grid: Grid,
  palette: ColorStop[],
  style: PaletteStyle,
  interpolation: 'bilinear' | 'nearest',
  minimumValue = -Infinity,
  absolute = false,
  blur = false,
): Promise<ImageData> {
  return run({
    kind: BackgroundTask.Image,
    ...valuesOf(grid),
    palette,
    style,
    interpolation,
    minimumValue,
    absolute,
    blur,
  });
}

export function traceContoursInBackground(grid: Grid, levels: number[]): Promise<ContourLine[]> {
  return run({ kind: BackgroundTask.Contours, ...valuesOf(grid), levels });
}

export class BackgroundResult<I, O> {
  private readonly finished = signal<{ input: I; output: O } | undefined>(undefined);
  private wanted: I | undefined = undefined;
  private running = false;

  constructor(private readonly compute: (input: I) => Promise<O>) {}

  requestResult(input: I): { input: I; output: O } | undefined {
    const finished = this.finished();
    if (finished?.input !== input && this.wanted !== input) {
      this.wanted = input;
      if (!this.running) void this.runWanted();
    }
    return finished;
  }

  clear(): void {
    this.wanted = undefined;
    this.finished.set(undefined);
  }

  private async runWanted(): Promise<void> {
    this.running = true;
    while (this.wanted !== undefined && this.wanted !== this.finished()?.input) {
      const input = this.wanted;
      const output = await this.compute(input);
      if (this.wanted === input) this.finished.set({ input, output });
    }
    this.running = false;
  }
}
