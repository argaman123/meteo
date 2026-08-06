import { Layer } from './layer';

export abstract class LoopLayer<D> extends Layer<D> {
  abstract loopTimesOf(data: D): number[];

  abstract atTime(data: D, playingTime: number): D;
}
