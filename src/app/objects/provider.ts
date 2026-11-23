import { Signal, computed } from '@angular/core';

export class Provider<I> {
  private last?: { data: unknown; output: Signal<I> } = undefined;

  constructor(private fn: (data: never) => I) {}

  provide(data: unknown): I {
    let last = this.last;
    if (!last || last.data !== data) {
      last = { data, output: computed(() => this.fn(data as never)) };
      this.last = last;
    }
    return last.output();
  }
}
