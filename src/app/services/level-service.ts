import { Service, computed, signal } from '@angular/core';

export type Level = number | string;
export type LevelKind = 'heights' | 'pressures';

@Service()
export class LevelService {
  private readonly heightLevels: (Level | null)[] = [
    null,
    ...Array.from({ length: 40 }, (_, index) => (index + 1) * 1000),
  ];
  private readonly pressureLevels: (Level | null)[] = [
    null,
    '1000',
    '925',
    '850',
    '700',
    '500',
    '400',
    '300',
    '250',
    '200',
  ];

  readonly kind = signal<LevelKind>('heights');
  readonly levels = computed(() =>
    this.kind() === 'heights' ? this.heightLevels : this.pressureLevels,
  );
  readonly activeLevel = signal<Level | null>(null);

  setLevel(level: Level | null): void {
    this.activeLevel.set(level);
  }

  setKind(kind: LevelKind): void {
    if (kind === this.kind()) return;
    this.kind.set(kind);
    this.setLevel(this.nearestLevel(this.activeLevel()));
  }

  private nearestLevel(current: Level | null): Level | null {
    if (current === null) return null;
    const currentFeet = this.feetOf(current);
    const candidates = this.levels().filter((level) => level !== null);
    return candidates.reduce((nearest, level) =>
      Math.abs(this.feetOf(level) - currentFeet) < Math.abs(this.feetOf(nearest) - currentFeet)
        ? level
        : nearest,
    );
  }

  feetOf(level: Level | null): number {
    if (level === null) return 0;
    if (typeof level === 'number') return level;
    return 145366 * (1 - Math.pow(Number(level) / 1013.25, 0.1903));
  }
}
