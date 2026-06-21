import { Service, signal } from '@angular/core';
import { Bounds } from '../types/wrap';

@Service()
export class ViewStore {
  readonly bbox = signal<Bounds | null>(null);
  readonly settledBbox = signal<Bounds | null>(null);
  readonly zoom = signal<number | null>(null);
  readonly cursor = signal<[number, number] | null>(null);
}
