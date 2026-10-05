import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChartArea, lucideTable2 } from '@ng-icons/lucide';
import { HlmContextMenuTrigger } from '@spartan-ng/helm/context-menu';
import { HlmDropdownMenu, HlmDropdownMenuItem } from '@spartan-ng/helm/dropdown-menu';
import { MapClick, MapService } from '../../../engine/map-service';
import { PointService, PointView } from './point-service';

@Component({
  selector: 'app-point-menu',
  imports: [HlmContextMenuTrigger, HlmDropdownMenu, HlmDropdownMenuItem, NgIcon],
  viewProviders: [provideIcons({ lucideChartArea, lucideTable2 })],
  host: { class: 'block h-full w-full' },
  templateUrl: './point-menu.html',
})
export class PointMenu {
  private map = inject(MapService);
  protected points = inject(PointService);
  protected readonly viewOpen = computed(() => this.points.view() !== null);
  private pin = viewChild.required<ElementRef<HTMLElement>>('pin');
  private clickedPoint: [number, number] | null = null;
  protected readonly views = PointView;

  constructor() {
    this.map.rightClicks.pipe(takeUntilDestroyed()).subscribe((click) => this.pickPoint(click));
    afterRenderEffect(() => {
      const point = this.points.point();
      const pin = this.pin().nativeElement;
      if (point) this.map.showMarker(pin, point);
      else this.map.hideMarker(pin);
    });
  }

  protected showView(view: PointView): void {
    if (this.clickedPoint) this.points.showView(view, this.clickedPoint);
  }

  private pickPoint(click: MapClick): void {
    const point: [number, number] = [click.lon, click.lat];
    if (this.viewOpen()) this.points.movePoint(point);
    else this.clickedPoint = point;
  }
}
