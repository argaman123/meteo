import { ResourceStreamItem, Signal, signal } from '@angular/core';
import { Layer } from './layer';

export abstract class LoopLayer<D> extends Layer<D> {
  abstract loopTimesOf(data: D): number[];

  abstract atTime(data: D, loopTime: number): D;
}

export class FrameLoader<F extends { time: number }> {
  private cache = new Map<string, Promise<F>>();

  stream(requests: { params: unknown; load: () => Promise<F> }[]): Signal<ResourceStreamItem<F[]>> {
    const keys = new Set(requests.map((request) => JSON.stringify(request.params)));
    for (const key of this.cache.keys()) {
      if (!keys.has(key)) this.cache.delete(key);
    }
    const collected: F[] = [];
    const loaded = signal<ResourceStreamItem<F[]>>({ value: [] });
    for (const { params, load } of requests) {
      const key = JSON.stringify(params);
      let frame = this.cache.get(key);
      if (!frame) {
        frame = load();
        frame.catch(() => this.cache.delete(key));
        this.cache.set(key, frame);
      }
      frame.then(
        (arrived) => {
          collected.push(arrived);
          collected.sort((a, b) => a.time - b.time);
          loaded.set({ value: [...collected] });
        },
        () => undefined,
      );
    }
    return loaded;
  }
}
