export class Provider<I> {

  constructor(private fn: (data: never) => I) {}

  provide(data: unknown): I {
    return this.fn(data as never);
  }
}
