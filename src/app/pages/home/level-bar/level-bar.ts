import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { matTerrainRound } from '@ng-icons/material-icons/round';
import { LayersService } from '../../../layers/layers-service';
import { Level, LevelService } from '../../../services/level-service';
import { Quantity, Unit, format } from '../../../utils/units';

@Component({
  selector: 'app-level-bar',
  imports: [NgIcon],
  viewProviders: [provideIcons({ matTerrainRound })],
  templateUrl: './level-bar.html',
})
export class LevelBar {
  protected readonly level = inject(LevelService);
  private layersService = inject(LayersService);
  private readonly dragIndex = signal<number | null>(null);

  protected visible = computed(() =>
    [...this.layersService.activeLayers().keys()].some((layer) => !layer.staticLevel),
  );

  protected shownIndex = computed(
    () => this.dragIndex() ?? this.level.levels().indexOf(this.level.activeLevel()),
  );

  protected positionPercent = computed(() =>
    this.stopPercent(this.level.levels()[this.shownIndex()]),
  );

  protected stopPercent(level: Level | null): number {
    return (this.level.feetOf(level) / this.level.feetOf(this.maxLevel())) * 100;
  }

  protected shownLabel = computed(() => this.label(this.level.levels()[this.shownIndex()]));

  protected label(level: Level | null): string {
    if (level === null) return 'קרקע';
    if (typeof level === 'string') return `${level}mb`;
    return format(level, Quantity.Altitude, Unit.Feet);
  }

  protected readonly maxLevel = computed(() => this.level.levels()[this.level.levels().length - 1]);

  protected topLabel(level: Level | null): string {
    if (level === null) return 'קרקע';
    if (typeof level === 'string') return level;
    return `${level / 1000}'`;
  }

  protected isTick(level: Level | null): boolean {
    if (level === null || level === this.maxLevel()) return false;
    return typeof level === 'string' || level % 10000 === 0;
  }

  protected onPointerDown(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.dragIndex.set(this.indexAt(event));
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragIndex() === null) return;
    this.dragIndex.set(this.indexAt(event));
  }

  protected onPointerUp(): void {
    const index = this.dragIndex();
    if (index === null) return;
    this.level.setLevel(this.level.levels()[index]);
    this.dragIndex.set(null);
  }

  private indexAt(event: PointerEvent): number {
    const track = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const fraction = 1 - (event.clientY - track.top) / track.height;
    const clamped = Math.min(1, Math.max(0, fraction));
    const levels = this.level.levels();
    const targetFeet = clamped * this.level.feetOf(this.maxLevel());
    let nearest = 0;
    for (let index = 1; index < levels.length; index++) {
      if (
        Math.abs(this.level.feetOf(levels[index]) - targetFeet) <
        Math.abs(this.level.feetOf(levels[nearest]) - targetFeet)
      ) {
        nearest = index;
      }
    }
    return nearest;
  }
}
