import { ObservationPoint } from './observations';

export interface BirdDetection extends ObservationPoint {
  radar: string;
  obsTime: number;
}
