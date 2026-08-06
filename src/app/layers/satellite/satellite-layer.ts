import { HttpClient, httpResource } from '@angular/common/http';
import { Injector, Resource, Signal, computed, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Image, ImageInput } from '../../engine/looks/image';
import { Provider } from '../../objects/provider';
import { TimeRange } from '../../services/time-service';
import { SatelliteBoundsMap, SatelliteConfiguration } from '../../types/satellite';
import { Bounds } from '../../types/wrap';
import { sameArrays } from '../../utils/arrays';
import { Control, OptionsPresentation, options } from '../../utils/controls';
import { contains } from '../../utils/geo';
import { equalize, grayChannel } from '../../utils/image';
import { Quantity, Unit, format } from '../../utils/units';
import { Inputs } from '../base/layer';
import { LoopLayer } from '../base/loop-layer';

const ASK_MINUTES = 30;

export interface SatelliteFrame {
  time: number;
  display: ImageBitmap;
  grays?: Uint8ClampedArray;
}

export interface SatelliteLoop {
  frames: SatelliteFrame[];
  shown: SatelliteFrame;
  bounds: Bounds;
}

interface SatelliteChoice {
  satellite: string;
  channel: string;
  sector: string;
}

export class SatelliteLayer extends LoopLayer<SatelliteLoop> {
  readonly name = 'לוויין';
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  readonly channel = options<string>('auto', [
    { value: 'auto', label: 'אוטו' },
    { value: 'ir', label: 'IR' },
    { value: 'colorful', label: 'צבעוני' },
  ], 'ערוץ', OptionsPresentation.Select);
  readonly sector = options<string>('auto', [
    { value: 'auto', label: 'אוטו' },
    { value: 'near', label: 'מקומי' },
    { value: 'wide', label: 'אזורי' },
  ], 'גזרה', OptionsPresentation.Select);
  override readonly controls: Control[] = [this.channel, this.sector];
  readonly looks = [
    {
      look: new Image(
        new Provider(
          (loop: SatelliteLoop): ImageInput => ({
            image: loop.shown.display,
            bounds: loop.bounds,
          }),
        ),
      ),
      name: 'תמונה',
      checked: true,
    },
  ];

  hover(loop: SatelliteLoop, lon: number, lat: number): string {
    const grays = loop.shown.grays;
    if (!grays) return '—';
    if (!contains(loop.bounds, lon, lat)) return '—';
    const [west, south, east, north] = loop.bounds;
    const { width, height } = loop.shown.display;
    const column = Math.min(width - 1, Math.floor(((lon - west) / (east - west)) * width));
    const row = Math.min(height - 1, Math.floor(((north - lat) / (north - south)) * height));
    const gray = grays[row * width + column];
    return format(-80 + ((47.4 + 80) * gray) / 255, Quantity.Temperature, Unit.Celsius);
  }

  relevanceOf(loop: SatelliteLoop): TimeRange {
    return {
      start: loop.frames[0].time,
      end: loop.frames[loop.frames.length - 1].time + ASK_MINUTES * 60_000,
    };
  }

  loopTimesOf(loop: SatelliteLoop): number[] {
    return loop.frames.map((frame) => frame.time);
  }

  atTime(loop: SatelliteLoop, playingTime: number): SatelliteLoop {
    const shown = loop.frames.reduce((nearest, frame) =>
      Math.abs(frame.time - playingTime) < Math.abs(nearest.time - playingTime) ? frame : nearest,
    );
    return { ...loop, shown };
  }

  fetch(on: Inputs, injector: Injector): Signal<SatelliteLoop | null | undefined> {
    const choice = this.resolveChoice(injector);
    const bounds = this.resolveBounds(injector, choice);
    const hours = this.hoursResource(on, injector, choice);
    const frames = this.framesResource(injector, choice, hours);
    return computed(() => {
      const sectorBounds = bounds();
      if (sectorBounds === null) return null;
      if (sectorBounds === undefined || !frames.hasValue()) return undefined;
      const loaded = frames.value();
      if (loaded.length === 0) return null;
      return { frames: loaded, shown: loaded[loaded.length - 1], bounds: sectorBounds };
    });
  }

  private resolveChoice(injector: Injector): Signal<SatelliteChoice | undefined> {
    const configuration = httpResource<SatelliteConfiguration>(
      () => ({ url: '/api/satellite/configuration' }),
      { injector },
    );
    return computed(() => {
      if (!configuration.hasValue()) return undefined;
      const config = configuration.value();
      return {
        satellite: config.satelliteId,
        channel: this.channel() === 'auto' ? config.channel : this.channel(),
        sector: this.sector() === 'auto' ? config.sector : this.sector(),
      };
    });
  }

  private resolveBounds(
    injector: Injector,
    choice: Signal<SatelliteChoice | undefined>,
  ): Signal<Bounds | null | undefined> {
    const allBounds = httpResource<SatelliteBoundsMap>(() => ({ url: '/api/satellite/bounds' }), {
      injector,
    });
    return computed(() => {
      const current = choice();
      if (!current || !allBounds.hasValue()) return undefined;
      return allBounds.value()[current.satellite]?.[current.sector] ?? null;
    });
  }

  private hoursResource(
    on: Inputs,
    injector: Injector,
    choice: Signal<SatelliteChoice | undefined>,
  ): Resource<number[] | undefined> {
    return httpResource<number[]>(() => {
      const current = choice();
      if (!current) return undefined;
      return {
        url: '/api/satellite/hours',
        params: {
          satellite: current.satellite,
          channel: current.channel,
          sector: current.sector,
          start: String(on.exactTime() - ASK_MINUTES * 60_000),
          end: String(on.exactTime()),
        },
      };
    }, { injector });
  }

  private framesResource(
    injector: Injector,
    choice: Signal<SatelliteChoice | undefined>,
    hours: Resource<number[] | undefined>,
  ): Resource<SatelliteFrame[] | undefined> {
    const http = injector.get(HttpClient);
    const params = computed(
      () => {
        const current = choice();
        const times = hours.hasValue() ? hours.value() : undefined;
        return current != null && times != null ? { choice: current, times } : undefined;
      },
      { equal: (a, b) => a?.choice === b?.choice && sameArrays(a?.times, b?.times) },
    );
    return resource({
      params,
      loader: ({ params }) =>
        Promise.all(params.times.map((time) => this.loadFrame(http, params.choice, time))),
      injector,
    });
  }

  private async loadFrame(
    http: HttpClient,
    choice: SatelliteChoice,
    time: number,
  ): Promise<SatelliteFrame> {
    const blob = await firstValueFrom(
      http.get('/api/satellite/image', {
        params: { ...choice, time: String(time) },
        responseType: 'blob',
      }),
    );
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    const received = context.getImageData(0, 0, bitmap.width, bitmap.height);
    context.putImageData(equalize(received), 0, 0);
    return {
      time,
      display: canvas.transferToImageBitmap(),
      grays: choice.channel === 'ir' ? grayChannel(received) : undefined,
    };
  }
}
