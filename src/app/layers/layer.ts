import { Look } from '../engine/looks/look';

export abstract class Layer {
  abstract readonly id: string;
  abstract readonly label: string;
  abstract readonly parameter: string;
  abstract readonly looks: Look[];
}
