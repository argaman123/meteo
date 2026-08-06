import { HttpClient, httpResource } from '@angular/common/http';
import { Injector, Resource, Signal, computed, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Image, ImageInput } from '../../engine/looks/image';
import { Provider } from '../../objects/provider';
import { TimeRange } from '../../services/time-service';
import { SatelliteBoundsMap, SatelliteConfiguration } from '../../types/satellite';
import { Bounds } from '../../types/wrap';
import { Control, OptionsPresentation, options } from '../../utils/controls';
import { contains } from '../../utils/geo';
import { equalize } from '../../utils/image';
import { findNearestTime } from '../../utils/time';
import { Quantity, Unit, format } from '../../utils/units';
import { Inputs, Layer } from '../base/layer';

const ASK_MINUTES = 30;

export interface SatellitePicture {
  time: number;
  display: ImageBitmap;
  original: ImageData;
  bounds: Bounds;
  channel: string;
}

interface SatelliteChoice {
  satellite: string;
  channel: string;
  sector: string;
}

export class SatelliteLayer extends Layer<SatellitePicture> {
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
          (picture: SatellitePicture): ImageInput => ({
            image: picture.display,
            bounds: picture.bounds,
          }),
        ),
      ),
      name: 'תמונה',
      checked: true,
    },
  ];

  hover(picture: SatellitePicture, lon: number, lat: number): string {
    if (picture.channel !== 'ir') return '—';
    if (!contains(picture.bounds, lon, lat)) return '—';
    const [west, south, east, north] = picture.bounds;
    const column = Math.min(
      picture.original.width - 1,
      Math.floor(((lon - west) / (east - west)) * picture.original.width),
    );
    const row = Math.min(
      picture.original.height - 1,
      Math.floor(((north - lat) / (north - south)) * picture.original.height),
    );
    const gray = picture.original.data[(row * picture.original.width + column) * 4];
    return format(-80 + ((47.4 + 80) * gray) / 255, Quantity.Temperature, Unit.Celsius);
  }

  relevanceOf(picture: SatellitePicture): TimeRange {
    return { start: picture.time, end: picture.time + ASK_MINUTES * 60 };
  }

  fetch(on: Inputs, injector: Injector): Signal<SatellitePicture | null | undefined> {
    const choice = this.resolveChoice(injector);
    const bounds = this.resolveBounds(injector, choice);
    const hours = this.hoursResource(on, injector, choice);
    const nearestTime = computed(() =>
      hours.hasValue() ? findNearestTime(hours.value(), on.time(), ASK_MINUTES / 60) : undefined,
    );
    const picture = this.pictureResource(injector, choice, nearestTime, bounds);
    return computed(() => {
      if (bounds() === null || nearestTime() === null) return null;
      return picture.hasValue() ? picture.value() : undefined;
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
          start: String(on.time() - ASK_MINUTES * 60),
          end: String(on.time()),
        },
      };
    }, { injector });
  }

  private pictureResource(
    injector: Injector,
    choice: Signal<SatelliteChoice | undefined>,
    nearestTime: Signal<number | null | undefined>,
    bounds: Signal<Bounds | null | undefined>,
  ): Resource<SatellitePicture | undefined> {
    const http = injector.get(HttpClient);
    return resource({
      params: () => {
        const current = choice();
        const time = nearestTime();
        const sectorBounds = bounds();
        return current != null && time != null && sectorBounds != null
          ? { choice: current, time, bounds: sectorBounds }
          : undefined;
      },
      loader: ({ params }) => this.loadPicture(http, params.choice, params.time, params.bounds),
      injector,
    });
  }

  private async loadPicture(
    http: HttpClient,
    choice: SatelliteChoice,
    time: number,
    bounds: Bounds,
  ): Promise<SatellitePicture> {
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
    const original = context.getImageData(0, 0, bitmap.width, bitmap.height);
    context.putImageData(equalize(original), 0, 0);
    return {
      time,
      display: canvas.transferToImageBitmap(),
      original,
      bounds,
      channel: choice.channel,
    };
  }

}
