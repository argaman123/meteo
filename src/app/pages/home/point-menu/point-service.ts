import { Service, signal } from '@angular/core';

export enum PointView {
  Meteogram = 'meteogram',
  SoundingTable = 'sounding-table',
}

@Service()
export class PointService {
  readonly point = signal<[number, number] | null>(null);
  readonly view = signal<PointView | null>(null);

  showView(view: PointView, point: [number, number]): void {
    this.view.set(view);
    this.point.set(point);
  }

  hideView(): void {
    this.view.set(null);
    this.point.set(null);
  }
}
