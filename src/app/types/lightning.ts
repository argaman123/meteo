import { ObservationPoint } from './observations';

export interface LightningObservation extends ObservationPoint {
  obsTime: number;
}
