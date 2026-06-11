import { Component, inject, signal } from '@angular/core';
import { MapEngine } from '../../../engine/map-engine';
import { AreaOfInterest, areasOfInterest } from './aois';

@Component({
  selector: 'app-frame-aoi',
  templateUrl: './frame-aoi.html',
  styleUrl: './frame-aoi.css',
})
export class FrameAoi {
  private engine = inject(MapEngine);
  areas = areasOfInterest;
  open = signal(false);

  frame(area: AreaOfInterest): void {
    this.open.set(false);
    this.engine.flyToBounds(area.bounds);
  }
}
