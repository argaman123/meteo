import { httpResource } from '@angular/common/http';
import { Injector, Signal } from '@angular/core';
import { PolygonStyle, Polygons, PolygonsView } from '../../engine/looks/polygons';
import { PolygonMap } from '../../objects/polygon-map';
import { Provider } from '../../objects/provider';
import { ForecastEvent, PolygonsWrap, Sector } from '../../types/polygons';
import { Bounds } from '../../types/wrap';
import { Control, options, OptionsPresentation } from '../../utils/controls';
import { Inputs, Layer } from '../base/layer';
import { Cloud } from './cloud';
import { Fog } from './fog';
import { Haze } from './haze';

export interface EventAppearance<E extends ForecastEvent> {
  style(event: E): PolygonStyle;
  hoverText(event: E): string;
}

export const EVENT_APPEARANCES: Record<ForecastEvent['type'], EventAppearance<ForecastEvent>> = {
  cloud: new Cloud(),
  haze: new Haze(),
  fog: new Fog(),
};

export const SECTORS: Record<Sector, Bounds> = {
  [Sector.Center]: [32, 29.5, 36.5, 33.5],
  [Sector.North]: [33, 31.5, 37.5, 35.5],
};

export class PolygonsLayer extends Layer<PolygonMap> {
  readonly name = 'עננות ותופעות';
  override readonly timeWindow = { backHours: 0, forwardHours: 96, stepHours: 3 };
  readonly sector = options<Sector>(Sector.Center, [
    { value: Sector.Center, label: 'מרכז' },
    { value: Sector.North, label: 'צפון' },
  ], 'גזרה', OptionsPresentation.Table);
  override readonly controls: Control[] = [this.sector];
  private on!: Inputs;
  readonly looks = [
    {
      look: new Polygons(new Provider((map: PolygonMap) => this.createView(map))),
      name: 'פוליגונים',
      checked: true,
    },
  ];

  private createView(map: PolygonMap): PolygonsView {
    return {
      frame: SECTORS[this.sector()],
      zoom: this.on.zoom(),
      polygons: [...map.areas]
        .sort((a, b) =>
          this.displayOrder(a.forecastEvents[0]) - this.displayOrder(b.forecastEvents[0]))
        .flatMap((area) =>
          area.forecastEvents.map((event) => ({
            coordinates: area.coordinates,
            ...EVENT_APPEARANCES[event.type].style(event),
          })),
        ),
    };
  }

  private displayOrder(event: ForecastEvent): number {
    if (event.type == "cloud")
      return event.baseFt
    else
      return -1
  }

  hover(map: PolygonMap, lon: number, lat: number): string {
    const lines = map.eventsAt(lon, lat).map((event) => EVENT_APPEARANCES[event.type].hoverText(event));
    return lines.length ? lines.join('\n') : '—';
  }

  fetch(on: Inputs, injector: Injector): Signal<PolygonMap | undefined> {
    this.on = on;
    return httpResource(
      () => ({
        url: '/api/polygons',
        params: { sector: this.sector(), time: String(on.time()) },
      }),
      {
        injector,
        parse: (wrap) => PolygonMap.fromWrap(wrap as PolygonsWrap, SECTORS[this.sector()]),
      },
    ).value;
  }
}
