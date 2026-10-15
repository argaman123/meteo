import { PlaceEntry } from '../types/place';
import { CoordinateFormat, LEFT_TO_RIGHT_MARK, formatCoordinates } from '../utils/coordinates';
import { normalizeForSearch } from '../utils/text';

const COUNTRY_NAMES = new Intl.DisplayNames(['he'], { type: 'region' });

export class Place {
  readonly lookupNames: string[];

  private constructor(
    readonly name: string,
    readonly detail: string,
    readonly point: [number, number],
    lookupNames: string[],
  ) {
    this.lookupNames = lookupNames.filter((lookupName) => lookupName).map(normalizeForSearch);
  }

  static fromEntry([name, hebrewName, country, icao, lon, lat]: PlaceEntry): Place {
    const detail = [icao || (hebrewName ? name : ''), COUNTRY_NAMES.of(country)]
      .filter((part) => part)
      .join(' · ');
    return new Place(hebrewName || name, detail, [lon, lat], [hebrewName, name, icao]);
  }

  static fromCoordinates(name: string, point: [number, number], format: CoordinateFormat): Place {
    const coordinates = formatCoordinates(point[0], point[1], format);
    return new Place(name.trim(), `${LEFT_TO_RIGHT_MARK}${coordinates}`, point, []);
  }
}
