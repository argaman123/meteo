import { httpResource } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { MapService } from '../../../engine/map-service';
import { Place } from '../../../objects/place';
import { PlaceEntry } from '../../../types/place';
import { CoordinateFormat } from '../../../utils/coordinates';
import { normalizeForSearch } from '../../../utils/text';

@Service()
export class PlaceSearchService {
  private mapService = inject(MapService);
  private isPlacesRequested = signal(false);
  private places = httpResource(
    () => (this.isPlacesRequested() ? '/search/places.json' : undefined),
    { parse: (entries) => (entries as PlaceEntry[]).map(Place.fromEntry) },
  );
  readonly activePlaces = signal<Place[]>([]);
  readonly entryFormat = signal(CoordinateFormat.Decimal);

  loadPlaces(): void {
    this.isPlacesRequested.set(true);
  }

  findPlaces(text: string, limit = 8): Place[] {
    const normalizedText = normalizeForSearch(text);
    if (!normalizedText || !this.places.hasValue()) return [];
    const starting: Place[] = [];
    const containing: Place[] = [];
    for (const place of this.places.value()) {
      if (place.lookupNames.some((lookupName) => lookupName.startsWith(normalizedText)))
        starting.push(place);
      else if (place.lookupNames.some((lookupName) => lookupName.includes(normalizedText)))
        containing.push(place);
      if (starting.length === limit) break;
    }
    return [...starting, ...containing].slice(0, limit);
  }

  showPlace(place: Place): void {
    this.activePlaces.update((places) => [...places, place]);
    this.mapService.flyTo(place.point, 11);
  }

  hidePlace(place: Place): void {
    this.activePlaces.update((places) => places.filter((active) => active !== place));
  }
}
