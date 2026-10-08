import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { Injector, Signal, computed } from '@angular/core';
import { LegendType, SwatchesLegend } from '../../engine/base/look';
import { PolygonStyle, Polygons, PolygonsView } from '../../engine/looks/polygons';
import { PolygonMap } from '../../objects/polygon-map';
import { Provider } from '../../objects/provider';
import { TimeRange } from '../../services/time-service';
import {
  CloudEvent,
  FogEvent,
  ForecastEvent,
  HazeEvent,
  MapTime,
  PolygonsState,
  PolygonsStatus,
  Sector,
} from '../../types/polygons';
import { Bounds } from '../../types/wrap';
import { Control, options, OptionsPresentation } from '../../utils/controls';
import { findNearestTime, hoursToMs } from '../../utils/time';
import { Inputs, Layer } from '../base/layer';
import { Cloud } from './cloud';
import { Fog } from './fog';
import { Haze } from './haze';

export type DrawnEvent = CloudEvent | HazeEvent | FogEvent;

export interface EventAppearance<E extends DrawnEvent> {
  name(event: E): string;
  style(event: E): PolygonStyle;
  hoverText(event: E): string;
}

export const EVENT_APPEARANCES: Record<DrawnEvent['type'], EventAppearance<DrawnEvent>> = {
  CLOUD: new Cloud(),
  HAZE: new Haze(),
  FOG: new Fog(),
};

export function drawnEvents(events: ForecastEvent[]): DrawnEvent[] {
  return events
    .filter((event) => event.type in EVENT_APPEARANCES)
    .flatMap((event): DrawnEvent[] =>
      event.type === 'CLOUD'
        ? [event, ...event.events.filter((child): child is FogEvent => child.type === 'FOG')]
        : [event],
    );
}

export function mapValidity(startTime: number): TimeRange {
  return { start: startTime - hoursToMs(1.5), end: startTime + hoursToMs(1.5) };
}

export const SECTORS: Record<Sector, Bounds> = {
  [Sector.Dev]: [33.3, 29.0, 37.3, 36.35],
  [Sector.Big]: [33.3, 26.6, 56.4, 39.8],
};

interface PolygonsData {
  map: PolygonMap;
  zoom: number;
}

export const POLYGONS_LEGEND: SwatchesLegend = {
  type: LegendType.Swatches,
  stops: [
    { color: '#535353', label: 'עננות נמוכה' },
    { color: '#2748a5', label: 'עננות בינונית' },
    { color: '#206ea3', label: 'עננות גבוהה' },
    { color: '#535353', label: 'ערפל' },
    { color: '#ff9800', label: 'אובך' },
    { color: '#c30000', label: 'CB' },
  ],
};

export class PolygonsLayer extends Layer<PolygonsData> {
  readonly name = 'עננות ותופעות';
  override readonly timeWindow = { backHours: 3, forwardHours: 96 };
  readonly sector = options<Sector>(Sector.Dev, [
    { value: Sector.Dev, label: 'מקומי' },
    { value: Sector.Big, label: 'אזורי' },
  ], 'גזרה', OptionsPresentation.Table);
  override readonly controls: Control[] = [this.sector];
  readonly looks = [
    {
      look: new Polygons(
        new Provider(({ map, zoom }: PolygonsData) => this.createView(map, zoom)),
        POLYGONS_LEGEND,
      ),
      name: 'פוליגונים',
      checked: true,
    },
  ];

  private createView(map: PolygonMap, zoom: number): PolygonsView {
    return {
      frame: SECTORS[this.sector()],
      zoom,
      polygons: [...map.areas]
        .sort((a, b) =>
          this.displayOrder(a.forecastEvents[0]) - this.displayOrder(b.forecastEvents[0]))
        .flatMap((area) =>
          drawnEvents(area.forecastEvents).map((event) => ({
            coordinates: area.coordinates,
            ...EVENT_APPEARANCES[event.type].style(event),
          })),
        ),
    };
  }

  private displayOrder(event: ForecastEvent): number {
    if (event.type == "CLOUD")
      return event.parameters.cloudBase
    else
      return -1
  }

  hover({ map }: PolygonsData, lon: number, lat: number): string | null {
    const lines = drawnEvents(map.eventsAt(lon, lat)).map((event) =>
      EVENT_APPEARANCES[event.type].hoverText(event),
    );
    return lines.length ? lines.join('\n') : null;
  }

  relevanceOf({ map }: PolygonsData): TimeRange {
    return mapValidity(map.startTime);
  }

  fetch(on: Inputs, injector: Injector): Signal<PolygonsData | null | undefined> {
    const hours = httpResource(() => this.hoursRequest(on), {
      injector,
      parse: (mapTimes) =>
        (mapTimes as MapTime[])
          .filter((mapTime) => mapTime.status === PolygonsStatus.Distributed)
          .map((mapTime) => mapTime.startTime),
    });
    this.forcedTimes = computed(() => (hours.hasValue() ? hours.value() : []));
    const mapTime = computed(() => {
      if (!hours.hasValue()) return undefined;
      return findNearestTime(hours.value(), on.displayTime(), 3);
    });
    const map = httpResource(() => this.mapRequest(mapTime()), {
      injector,
      parse: (state) =>
        state === null ? null : PolygonMap.fromState(state as PolygonsState, SECTORS[this.sector()]),
    });
    return computed(() => {
      const currentMapTime = mapTime();
      if (currentMapTime === undefined) return undefined;
      if (currentMapTime === null) return null;
      if (!map.hasValue()) return undefined;
      const polygonMap = map.value();
      return polygonMap && { map: polygonMap, zoom: on.zoom() };
    });
  }

  private hoursRequest(on: Inputs): HttpResourceRequest {
    const { start, end } = on.window();
    return {
      url: '/polygon/get_maps_times',
      params: { start_time: start, end_time: end, sector: this.sector() },
    };
  }

  private mapRequest(mapTime: number | null | undefined): HttpResourceRequest | undefined {
    if (mapTime === null || mapTime === undefined) return undefined;
    return {
      url: '/polygon/get_latest_polygons_by_time_sector_time_saved_status',
      params: { time: mapTime, sector: this.sector(), status: PolygonsStatus.Distributed },
    };
  }
}
