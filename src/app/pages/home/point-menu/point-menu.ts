import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChartArea, lucideRuler, lucideTable2 } from '@ng-icons/lucide';
import { HlmContextMenuTrigger } from '@spartan-ng/helm/context-menu';
import { HlmDropdownMenu, HlmDropdownMenuItem } from '@spartan-ng/helm/dropdown-menu';
import { MapPin } from '../../../directives/map-pin';
import { MapClick, MapService } from '../../../engine/map-service';
import { MeasureService } from '../measure/measure-service';
import { PointService, PointView } from './point-service';

@Component({
  selector: 'app-point-menu',
  imports: [HlmContextMenuTrigger, HlmDropdownMenu, HlmDropdownMenuItem, MapPin, NgIcon],
  viewProviders: [provideIcons({ lucideChartArea, lucideRuler, lucideTable2 })],
  host: { class: 'block h-full w-full' },
  templateUrl: './point-menu.html',
})
export class PointMenu {
  private map = inject(MapService);
  protected points = inject(PointService);
  private measure = inject(MeasureService);
  private clickedPoint: [number, number] | null = null;
  protected readonly views = PointView;

  constructor() {
    this.map.rightClicks.pipe(takeUntilDestroyed()).subscribe((click) => this.pickPoint(click));
  }

  protected showView(view: PointView): void {
    if (this.clickedPoint) this.points.showView(view, this.clickedPoint);
  }

  protected showMeasure(): void {
    if (this.clickedPoint) this.measure.showMeasure(this.clickedPoint);
  }

  private pickPoint(click: MapClick): void {
    this.clickedPoint = [click.lon, click.lat];
  }
}
