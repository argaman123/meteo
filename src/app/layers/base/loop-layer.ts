import { Injector, ResourceStreamItem, Signal, computed, resource, signal } from '@angular/core';
import { TimeRange } from '../../services/time-service';
import { sameArrays } from '../../utils/arrays';
import { findNearestByTime, minutesToMs } from '../../utils/time';
import { Inputs, Layer } from './layer';

export interface Loop<F = { time: number }> {
  frames: F[];
  shown: F;
}

export interface FrameRequest<F> {
  params: unknown;
  load: () => Promise<F[]>;
}

export abstract class LoopLayer<F extends { time: number } = { time: number }> extends Layer<
  Loop<F>[]
> {
  protected abstract readonly loopMinutes: number;
  protected readonly loopIdOf: (frame: F) => string = () => '';

  protected abstract frameRequests(
    on: Inputs,
    injector: Injector,
  ): Signal<FrameRequest<F>[] | undefined>;

  relevanceOf(loops: Loop<F>[]): TimeRange {
    const times = this.loopTimesOf(loops);
    const askMs = minutesToMs(this.loopMinutes);
    return { start: Math.min(...times) - askMs, end: Math.max(...times) + askMs };
  }

  loopTimesOf(loops: Loop<F>[]): number[] {
    return loops.flatMap((loop) => loop.frames.map((frame) => frame.time));
  }

  atTime(loops: Loop<F>[], loopTime: number): Loop<F>[] {
    return loops.map((loop) => ({ ...loop, shown: findNearestByTime(loop.frames, loopTime) }));
  }

  fetch(on: Inputs, injector: Injector): Signal<Loop<F>[] | null | undefined> {
    const requests = this.frameRequests(on, injector);
    const loader = new FrameLoader<F>();
    const params = computed(requests, {
      equal: (a, b) => sameArrays(a?.map(requestKey), b?.map(requestKey)),
    });
    const loaded = resource({
      params,
      stream: async ({ params }) => loader.stream(params),
      injector,
    });
    return computed(() => {
      const list = params();
      if (list === undefined) return undefined;
      if (list.length === 0) return null;
      if (!loaded.hasValue()) return undefined;
      const { frames, pending } = loaded.value();
      if (frames.length > 0) return this.loopsOf(frames);
      return pending > 0 ? undefined : null;
    });
  }

  private loopsOf(frames: F[]): Loop<F>[] {
    const loopIds = [...new Set(frames.map(this.loopIdOf))];
    return loopIds.map((loopId) => {
      const loopFrames = frames.filter((frame) => this.loopIdOf(frame) === loopId);
      return { frames: loopFrames, shown: loopFrames[loopFrames.length - 1] };
    });
  }
}

class FrameLoader<F extends { time: number }> {
  private cache = new Map<string, Promise<F[]>>();

  stream(
    requests: FrameRequest<F>[],
  ): Signal<ResourceStreamItem<{ frames: F[]; pending: number }>> {
    const keys = new Set(requests.map(requestKey));
    for (const key of this.cache.keys()) {
      if (!keys.has(key)) this.cache.delete(key);
    }
    const collected: F[] = [];
    let pending = requests.length;
    const loaded = signal<ResourceStreamItem<{ frames: F[]; pending: number }>>({
      value: { frames: [], pending },
    });
    for (const request of requests) {
      const key = requestKey(request);
      let frames = this.cache.get(key);
      if (!frames) {
        frames = request.load();
        frames.catch(() => this.cache.delete(key));
        this.cache.set(key, frames);
      }
      frames.then(
        (arrived) => {
          collected.push(...arrived);
          collected.sort((a, b) => a.time - b.time);
          pending--;
          loaded.set({ value: { frames: [...collected], pending } });
        },
        () => {
          pending--;
          loaded.set({ value: { frames: [...collected], pending } });
        },
      );
    }
    return loaded;
  }
}

function requestKey(request: FrameRequest<unknown>): string {
  return JSON.stringify(request.params);
}
