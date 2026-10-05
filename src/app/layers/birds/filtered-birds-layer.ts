import { HttpClient } from '@angular/common/http';
import { Injector, Signal, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BirdIcons } from '../../engine/looks/bird-icons';
import { LegendType } from '../../engine/base/look';
import { Provider } from '../../objects/provider';
import { BirdDetection } from '../../types/birds';
import { colorScale } from '../../utils/color-scale';
import { nearestPoint } from '../../utils/geo';
import { minutesToMs, stepTimesBefore } from '../../utils/time';
import { Quantity, Unit, convertBetween, format, formatNumber, unitLabel } from '../../utils/units';
import { Inputs } from '../base/layer';
import { FrameRequest, Loop, LoopLayer } from '../base/loop-layer';

export const BIRD_HEIGHT_PALETTE = [
  { value: 0, color: '#38bdf8' },
  { value: 250, color: '#22c55e' },
  { value: 500, color: '#facc15' },
  { value: 750, color: '#f97316' },
  { value: 1000, color: '#ef4444' },
].map((stop, index, stops) => ({
  ...stop,
  label:
    index < stops.length - 1
      ? `${heightNumber(stop.value)}–${heightNumber(stops[index + 1].value)} ${unitLabel(Quantity.BirdHeight)}`
      : `${heightNumber(stop.value)}+ ${unitLabel(Quantity.BirdHeight)}`,
}));

function heightNumber(meters: number): string {
  return formatNumber(meters, Quantity.BirdHeight, Unit.Meters);
}

interface Bird {
  lon: number;
  lat: number;
  height: number;
}

interface FilteredBirdsFrame {
  radar: string;
  time: number;
  birds: Bird[];
}

export type FilteredBirdsLoop = Loop<FilteredBirdsFrame>;

export class FilteredBirdsLayer extends LoopLayer<FilteredBirdsFrame> {
  readonly name = 'ציפורים';
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  protected readonly loopMinutes = 30;
  private readonly stepMinutes = 5;
  protected override readonly loopIdOf = (frame: FilteredBirdsFrame) => frame.radar;
  private readonly colorScale = colorScale(BIRD_HEIGHT_PALETTE, 'stepped');
  readonly looks = [
    {
      look: new BirdIcons(
        new Provider((radars: FilteredBirdsLoop[]) => ({
          points: radars.flatMap((radar) =>
            radar.shown.birds.map((bird) => ({
              lon: bird.lon,
              lat: bird.lat,
              color: this.colorScale(bird.height).formatHex(),
            })),
          ),
        })),
        signal({ type: LegendType.Swatches, stops: BIRD_HEIGHT_PALETTE }),
      ),
      name: 'סמלים',
      checked: true,
    },
  ];

  hover(radars: FilteredBirdsLoop[], lon: number, lat: number): string {
    const birds = radars.flatMap((radar) => radar.shown.birds);
    const nearest = nearestPoint(birds, lon, lat, 0.05);
    if (!nearest) return '—';
    return format(nearest.height, Quantity.BirdHeight, Unit.Meters);
  }

  protected frameRequests(
    on: Inputs,
    injector: Injector,
  ): Signal<FrameRequest<FilteredBirdsFrame>[]> {
    const http = injector.get(HttpClient);
    return computed(() =>
      stepTimesBefore(
        on.exactTime(),
        minutesToMs(this.loopMinutes),
        minutesToMs(this.stepMinutes),
      ).map((time) => this.birdsRequest(http, time)),
    );
  }

  private birdsRequest(http: HttpClient, time: number): FrameRequest<FilteredBirdsFrame> {
    const request: Record<string, string> = {
      start: String(time),
      end: String(time + minutesToMs(this.stepMinutes) - 1),
    };
    return {
      params: request,
      load: () =>
        firstValueFrom(
          http.get<BirdDetection[][]>('/observations/get_bird_specific_process', {
            params: request,
          }),
        ).then((files) => files.map((file) => this.frameOf(file))),
    };
  }

  private frameOf(file: BirdDetection[]): FilteredBirdsFrame {
    const birds = file
      .map((detection) => ({
        lon: detection.coords[0][0],
        lat: detection.coords[0][1],
        height: convertBetween(
          Number(detection.params.find((param) => param.name === 'height')?.value),
          Unit.Feet,
          Unit.Meters,
        ),
      }))
      .filter((bird) => bird.height >= 0);
    return { radar: file[0].radar, time: file[0].obsTime, birds };
  }
}
