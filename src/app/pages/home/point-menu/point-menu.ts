import { CdkContextMenuTrigger } from '@angular/cdk/menu';
import { Component, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChartArea } from '@ng-icons/lucide';
import { HlmContextMenuTrigger } from '@spartan-ng/helm/context-menu';
import { HlmDropdownMenu, HlmDropdownMenuItem } from '@spartan-ng/helm/dropdown-menu';
import { MapClick, MapService } from '../../../engine/map-service';
import { MeteogramService } from '../meteogram/meteogram-service';

@Component({
  selector: 'app-point-menu',
  imports: [HlmContextMenuTrigger, HlmDropdownMenu, HlmDropdownMenuItem, NgIcon],
  viewProviders: [provideIcons({ lucideChartArea })],
  templateUrl: './point-menu.html',
})
export class PointMenu {
  private map = inject(MapService);
  private meteogram = inject(MeteogramService);
  private trigger = viewChild.required(CdkContextMenuTrigger);
  private clickedPoint: [number, number] | null = null;

  constructor() {
    this.map.clicks.pipe(takeUntilDestroyed()).subscribe((click) => this.openAtClick(click));
  }

  protected showMeteogram(): void {
    if (this.clickedPoint) this.meteogram.showMeteogram(this.clickedPoint);
  }

  private openAtClick(click: MapClick): void {
    const point: [number, number] = [click.lon, click.lat];
    if (this.meteogram.point()) {
      this.meteogram.showMeteogram(point);
      return;
    }
    this.clickedPoint = point;
    this.trigger().open({ x: click.clientX, y: click.clientY });
  }
}
