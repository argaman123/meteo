import { HttpClient } from '@angular/common/http';
import { Injector, Signal, computed } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { gradientLegend } from '../../engine/base/look';
import { SvgIcons } from '../../engine/looks/svg-icons';
import { Provider } from '../../objects/provider';
import { LightningObservation } from '../../types/lightning';
import { Control, options } from '../../utils/controls';
import { ColorStop, colorScale } from '../../utils/color-scale';
import { nearestPoint } from '../../utils/geo';
import {
  formatLocalHour,
  minutesToMs,
  msToSeconds,
  secondsToMs,
  stepTimesBefore,
} from '../../utils/time';
import { Quantity, Unit, format, formatSignedNumber, unitLabel } from '../../utils/units';
import { Inputs } from '../base/layer';
import { FrameRequest, Loop, LoopLayer } from '../base/loop-layer';

const AGE_PALETTE: ColorStop[] = [
  { value: 0, color: '#ffffff' },
  { value: 1 / 3, color: '#fde047' },
  { value: 2 / 3, color: '#f97316' },
  { value: 1, color: '#991b1b' },
];

interface Lightning {
  lon: number;
  lat: number;
  current: number;
  time: number;
}

interface LightningFrame {
  time: number;
  lightnings: Lightning[];
}

export type LightningLoop = Loop<LightningFrame>;

export class LightningLayer extends LoopLayer<LightningFrame> {
  readonly name = 'ברקים';
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  protected readonly loopMinutes = 30;
  private readonly stepMinutes = 5;
  readonly durationMinutes = options(
    30,
    [15, 30, 60].map((minutes) => ({
      value: minutes,
      label: format(minutes, Quantity.Age, Unit.Minutes),
    })),
    'משך',
  );
  override readonly controls: Control[] = [this.durationMinutes];
  private readonly colorScale = colorScale(AGE_PALETTE, 'smooth');
  readonly looks = [
    {
      look: new SvgIcons(
        new Provider((loops: LightningLoop[]) => ({
          points: loops.flatMap(({ shown }) =>
            shown.lightnings.map((lightning) => ({
              lon: lightning.lon,
              lat: lightning.lat,
              color: this.colorScale(
                (shown.time - lightning.time) / minutesToMs(this.durationMinutes()),
              ).formatHex(),
            })),
          ),
        })),
        'bolt',
        14,
        computed(() =>
          gradientLegend(
            AGE_PALETTE.map(({ value, color }) => ({
              value: value * this.durationMinutes(),
              color,
            })),
            Quantity.Age,
            Unit.Minutes,
          ),
        ),
      ),
      name: 'סמלים',
      checked: true,
    },
  ];

  hover(loops: LightningLoop[], lon: number, lat: number): string | null {
    const lightnings = loops.flatMap((loop) => loop.shown.lightnings);
    const nearest = nearestPoint(lightnings, lon, lat, 0.05);
    if (!nearest) return null;
    const current = formatSignedNumber(
      nearest.current,
      Quantity.LightningCurrent,
      Unit.Kiloamperes,
    );
    return `${current} ${unitLabel(Quantity.LightningCurrent)} · ${formatLocalHour(nearest.time)}`;
  }

  protected frameRequests(on: Inputs, injector: Injector): Signal<FrameRequest<LightningFrame>[]> {
    const http = injector.get(HttpClient);
    return computed(() =>
      stepTimesBefore(
        on.exactTime(),
        minutesToMs(this.loopMinutes),
        minutesToMs(this.stepMinutes),
      ).map((time) => this.lightningRequest(http, time, this.durationMinutes())),
    );
  }

  private lightningRequest(
    http: HttpClient,
    time: number,
    durationMinutes: number,
  ): FrameRequest<LightningFrame> {
    const request: Record<string, string> = {
      start_time: String(msToSeconds(time - minutesToMs(durationMinutes))),
      end_time: String(msToSeconds(time)),
    };
    return {
      params: request,
      load: () =>
        firstValueFrom(
          http.get<LightningObservation[]>('/surface/get_lightning', { params: request }),
        ).then((observations) => [
          {
            time,
            lightnings: observations
              .map(({ coords: [[lon, lat]], params, obsTime }) => ({
                lon,
                lat,
                current: Number(params[0].value),
                time: secondsToMs(obsTime),
              }))
              .sort((a, b) => a.time - b.time),
          },
        ]),
    };
  }
}
