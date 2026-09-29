import { HttpClient, httpResource } from '@angular/common/http';
import { Injector, Resource, Signal, computed, resource } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Image, ImageInput } from '../../engine/looks/image';
import { Provider } from '../../objects/provider';
import { TimeRange } from '../../services/time-service';
import {
  LimitedSatConf,
  SatImage,
  SatelliteChannel,
  SatelliteSector,
  SatelliteSectors,
} from '../../types/satellite';
import { Bounds } from '../../types/wrap';
import { sameArrays } from '../../utils/arrays';
import { Control, OptionsPresentation, options } from '../../utils/controls';
import { contains } from '../../utils/geo';
import { decodeEqualizedImage } from '../../utils/image';
import { findNearestByTime, minutesToMs, msToSeconds, secondsToMs } from '../../utils/time';
import { Quantity, Unit, format } from '../../utils/units';
import { Inputs } from '../base/layer';
import { FrameLoader, LoopLayer } from '../base/loop-layer';
import { scheduledConfiguration, sectorBounds } from './satellite-configuration';

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
  channel: string;
  sector: SatelliteSector;
  satellite: number;
}

interface SatelliteImages {
  satellite: number;
  images: SatImage[];
}

export class SatelliteLayer extends LoopLayer<SatelliteLoop> {
  readonly name = 'לוויין';
  private readonly askMinutes = 30;
  private readonly defaultSector: SatelliteSector = 'noaeq';
  private readonly satellites = [8, 9];
  override readonly timeWindow = { backHours: 24, forwardHours: 0, stepHours: 1 };
  readonly channel = options<string>('auto', [
    { value: 'auto', label: 'אוטו' },
    { value: SatelliteChannel.IR10_8, label: 'IR' },
    { value: SatelliteChannel.FLC, label: 'FLC' },
  ], 'ערוץ', OptionsPresentation.Select);
  readonly sector = options<string>('auto', [
    { value: 'auto', label: 'אוטו' },
    { value: 'noaeq', label: 'ישראל והסביבה' },
    { value: 'modeq', label: 'הים התיכון' },
    { value: 'naseq', label: 'חצי האי ערב' },
    { value: 'srneq', label: 'אפריקה' },
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
    const { grays, display } = loop.shown;
    const { bounds } = loop;
    if (!grays) return '—';
    if (!contains(bounds, lon, lat)) return '—';
    const [west, south, east, north] = bounds;
    const { width, height } = display;
    const column = Math.min(width - 1, Math.floor(((lon - west) / (east - west)) * width));
    const row = Math.min(height - 1, Math.floor(((north - lat) / (north - south)) * height));
    const gray = grays[row * width + column];
    return format(Math.floor(gray / 2) - 80, Quantity.Temperature, Unit.Celsius);
  }

  relevanceOf(loop: SatelliteLoop): TimeRange {
    return {
      start: loop.frames[0].time - minutesToMs(this.askMinutes),
      end: loop.frames[loop.frames.length - 1].time + minutesToMs(this.askMinutes),
    };
  }

  loopTimesOf(loop: SatelliteLoop): number[] {
    return loop.frames.map((frame) => frame.time);
  }

  atTime(loop: SatelliteLoop, loopTime: number): SatelliteLoop {
    return { ...loop, shown: findNearestByTime(loop.frames, loopTime) };
  }

  fetch(on: Inputs, injector: Injector): Signal<SatelliteLoop | null | undefined> {
    const choice = this.resolveChoice(on, injector);
    const sectors = httpResource<SatelliteSectors[]>(() => ({ url: '/satellite-sectors/get-all' }), {
      injector,
    });
    const satelliteImages = this.resolveImages(on, injector, choice);
    const frames = this.framesResource(injector, choice, satelliteImages);
    return computed(() => {
      const current = choice();
      const found = satelliteImages();
      if (found === null) return null;
      if (!current || !found || !sectors.hasValue()) return undefined;
      const bounds = sectorBounds(sectors.value(), found.satellite, current.sector);
      if (!bounds) return null;
      const loaded = frames.hasValue() ? frames.value() : undefined;
      if (loaded === undefined || loaded.length === 0) return undefined;
      return { frames: loaded, shown: loaded[loaded.length - 1], bounds };
    });
  }

  private resolveChoice(on: Inputs, injector: Injector): Signal<SatelliteChoice | undefined> {
    const configuration = httpResource<LimitedSatConf[] | null>(
      () => ({ url: '/satellite/getConfiguration' }),
      { injector },
    );
    return computed(
      () => {
        if (!configuration.hasValue()) return undefined;
        const scheduled = scheduledConfiguration(configuration.value() ?? [], on.exactTime());
        return {
          channel:
            this.channel() === 'auto'
              ? (scheduled?.channel ?? SatelliteChannel.IR10_8)
              : this.channel(),
          sector: (this.sector() === 'auto' ? this.defaultSector : this.sector()) as SatelliteSector,
          satellite: scheduled?.satellite ?? this.satellites[0],
        };
      },
      {
        equal: (a, b) =>
          a?.channel === b?.channel && a?.sector === b?.sector && a?.satellite === b?.satellite,
      },
    );
  }

  private resolveImages(
    on: Inputs,
    injector: Injector,
    choice: Signal<SatelliteChoice | undefined>,
  ): Signal<SatelliteImages | null | undefined> {
    const otherSatellite = () =>
      this.satellites.find((satellite) => satellite !== choice()?.satellite);
    const preferred = this.imagesResource(on, injector, choice, () => choice()?.satellite);
    const fallback = this.imagesResource(on, injector, choice, () =>
      preferred.hasValue() && preferred.value().length === 0 ? otherSatellite() : undefined,
    );
    return computed(() => {
      const current = choice();
      if (!current || !preferred.hasValue()) return undefined;
      if (preferred.value().length) return { satellite: current.satellite, images: preferred.value() };
      if (!fallback.hasValue()) return undefined;
      return fallback.value().length ? { satellite: otherSatellite()!, images: fallback.value() } : null;
    });
  }

  private imagesResource(
    on: Inputs,
    injector: Injector,
    choice: Signal<SatelliteChoice | undefined>,
    satellite: () => number | undefined,
  ): Resource<SatImage[] | undefined> {
    return httpResource<SatImage[]>(() => {
      const current = choice();
      const satId = satellite();
      if (!current || satId === undefined) return undefined;
      return {
        url: '/satellite/filterBy',
        params: {
          start: msToSeconds(on.exactTime() - minutesToMs(this.askMinutes)),
          end: msToSeconds(on.exactTime()),
          source: current.channel,
          sector: current.sector,
          sat_id: satId,
        },
      };
    }, { injector });
  }

  private framesResource(
    injector: Injector,
    choice: Signal<SatelliteChoice | undefined>,
    satelliteImages: Signal<SatelliteImages | null | undefined>,
  ): Resource<SatelliteFrame[] | undefined> {
    const http = injector.get(HttpClient);
    const loader = new FrameLoader<SatelliteFrame>();
    const params = computed(
      () => {
        const current = choice();
        const found = satelliteImages();
        if (!current || !found) return undefined;
        return { channel: current.channel, images: found.images };
      },
      {
        equal: (a, b) =>
          a?.channel === b?.channel &&
          sameArrays(
            a?.images.map((image) => image.fileName),
            b?.images.map((image) => image.fileName),
          ),
      },
    );
    return resource({
      params,
      stream: async ({ params }) =>
        loader.stream(
          params.images.map((image) => {
            const request = { name: image.fileName, equalize: 'false', inverse: 'false' };
            return {
              params: request,
              load: () => this.loadFrame(http, request, image, params.channel),
            };
          }),
        ),
      injector,
    });
  }

  private async loadFrame(
    http: HttpClient,
    request: Record<string, string>,
    image: SatImage,
    channel: string,
  ): Promise<SatelliteFrame> {
    const blob = await firstValueFrom(
      http.get('/satellite/getImageBy', { params: request, responseType: 'blob' }),
    );
    const decoded = await decodeEqualizedImage(blob, channel === SatelliteChannel.IR10_8);
    return { time: secondsToMs(image.imgTime), ...decoded };
  }
}
