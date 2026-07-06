import { CompositeLayer, UpdateParameters } from '@deck.gl/core';

export interface AnimatedState {
  [key: string]: unknown;
  raf: number;
  tick: number;
  lastTime: number;
}

export abstract class AnimatedLayer<PropsT extends object> extends CompositeLayer<PropsT> {
  static override layerName = 'AnimatedLayer';
  declare state: AnimatedState;

  abstract rebuild(): void;

  abstract step(deltaSeconds: number): void;

  override initializeState(): void {
    this.setState({ tick: 0, lastTime: performance.now() });
    this.state.raf = requestAnimationFrame(this.animate);
  }

  override updateState({ changeFlags }: UpdateParameters<this>): void {
    if (changeFlags.propsChanged) this.rebuild();
  }

  override finalizeState(): void {
    cancelAnimationFrame(this.state.raf);
  }

  private animate = (now: number): void => {
    const deltaSeconds = Math.min(0.1, (now - this.state.lastTime) / 1000 || 0.016);
    this.state.lastTime = now;
    this.step(deltaSeconds);
    this.setState({ tick: this.state.tick + 1 });
    this.state.raf = requestAnimationFrame(this.animate);
  };
}
