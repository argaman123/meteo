import { Component, computed, inject, viewChild } from '@angular/core';
import { PolygonStyle } from '../../../../engine/looks/polygons';
import { EVENT_APPEARANCES } from '../../../../layers/polygons/polygons-layer';
import { CloudEvent, ForecastEvent } from '../../../../types/polygons';
import { MeteogramFrame } from '../meteogram-frame/meteogram-frame';
import { MeteogramService } from '../meteogram-service';
import { TimeBarService } from '../../time-bar/time-bar-service';

interface EventBlock<E extends ForecastEvent = ForecastEvent> {
  start: number;
  end: number;
  event: E;
  style: PolygonStyle;
}

interface ShownBlock {
  left: number;
  width: number;
  color: string;
  text: string;
}

@Component({
  selector: 'app-clouds-chart',
  imports: [MeteogramFrame],
  templateUrl: './clouds-chart.html',
  host: { class: 'block h-full' },
})
export class CloudsChart {
  private meteogram = inject(MeteogramService);
  private timeBar = inject(TimeBarService);

  private textMeasure = new OffscreenCanvas(1, 1).getContext('2d')!;
  private frame = viewChild(MeteogramFrame);

  protected forecasts = this.meteogram.clouds;

  constructor() {
    this.textMeasure.font = "500 10px 'Source Sans 3', 'Heebo', sans-serif";
  }

  private blocks = computed(() => {
    if (!this.forecasts.hasValue()) return [];
    const blocks: EventBlock[] = [];
    const latest = new Map<string, EventBlock>();
    for (const forecast of this.forecasts.value()) {
      for (const event of forecast.forecastEvents) {
        const key = JSON.stringify(event);
        const previous = latest.get(key);
        if (previous && previous.end >= forecast.startTime) {
          previous.end = forecast.endTime;
          continue;
        }
        const block: EventBlock = {
          start: forecast.startTime,
          end: forecast.endTime,
          event,
          style: EVENT_APPEARANCES[event.type].style(event),
        };
        latest.set(key, block);
        blocks.push(block);
      }
    }
    return blocks;
  });

  private clouds = computed(() =>
    this.blocks()
      .filter((block): block is EventBlock<CloudEvent> => block.event.type === 'cloud')
      .sort((a, b) => b.event.topFt - a.event.topFt),
  );

  protected topFt = computed(() => {
    const clouds = this.clouds();
    if (!clouds.length) return this.meteogram.topFt;
    return Math.max(
      10_000,
      Math.ceil(Math.max(...clouds.map((block) => block.event.topFt)) / 5000) * 5000,
    );
  });

  protected shownClouds = computed(() => {
    const height = this.frame()?.size().height ?? 0;
    const topFt = this.topFt();
    return this.clouds().map((block) => {
      const shown = this.shownBlock(block);
      const blockHeight = ((block.event.topFt - block.event.baseFt) / topFt) * 100;
      return {
        ...shown,
        top: (1 - block.event.topFt / topFt) * 100,
        height: blockHeight,
        text: (blockHeight / 100) * height >= 11 ? shown.text : '',
      };
    });
  });

  protected lanes = computed(() => {
    const lanes = new Map<string, ShownBlock[]>();
    for (const block of this.blocks()) {
      if (block.event.type === 'cloud') continue;
      const name = EVENT_APPEARANCES[block.event.type].name(block.event);
      lanes.set(name, [...(lanes.get(name) ?? []), this.shownBlock(block)]);
    }
    return [...lanes]
      .map(([name, blocks]) => ({ name, blocks }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  protected message = computed(() => {
    if (this.forecasts.error()) return 'אין נתונים';
    if (this.forecasts.hasValue() && this.blocks().length === 0) return 'אין תופעות';
    return null;
  });

  protected hoverText = (time: number, heightFt: number): string => {
    const blocks = Number.isNaN(heightFt)
      ? this.blocks().filter((block) => block.event.type !== 'cloud')
      : this.clouds().filter(
          (block) => heightFt >= block.event.baseFt && heightFt <= block.event.topFt,
        );
    const lines = blocks
      .filter((block) => time >= block.start && time <= block.end)
      .map((block) => EVENT_APPEARANCES[block.event.type].hoverText(block.event));
    return lines.length ? lines.join('\n') : 'אין תופעות';
  };

  private shownBlock(block: EventBlock): ShownBlock {
    const width = this.frame()?.size().width ?? 0;
    const left = this.timeBar.positionInView(block.start);
    const blockWidth = this.timeBar.positionInView(block.end) - left;
    const text = block.style.text.join(' ');
    const [r, g, b, alpha] = block.style.fill;
    return {
      left,
      width: blockWidth,
      color: `rgb(${r} ${g} ${b} / ${(alpha ?? 255) / 255})`,
      text: (blockWidth / 100) * width >= this.textMeasure.measureText(text).width + 8 ? text : '',
    };
  }
}
