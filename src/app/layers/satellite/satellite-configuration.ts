import { LimitedSatConf, SatelliteSector, SatelliteSectors } from '../../types/satellite';
import { Bounds } from '../../types/wrap';
import { daysToMs, hoursToMs } from '../../utils/time';

export function scheduledConfiguration(
  configurations: LimitedSatConf[],
  time: number,
): LimitedSatConf | null {
  const day = daysToMs(1);
  const today = Math.floor(time / day) * day;
  const currentHour = hoursToMs(new Date(time).getUTCHours());
  const windows = configurations
    .filter((configuration) => time <= configuration.endDateTime + configuration.endHour)
    .map((configuration) => {
      let start = configuration.startDateTime + configuration.startHour;
      let end =
        configuration.startDateTime +
        configuration.endHour +
        (configuration.startHour >= configuration.endHour ? day : 0);
      while (
        end < today + currentHour &&
        end < configuration.endDateTime + configuration.endHour
      ) {
        start += day;
        end += day;
      }
      return { configuration, start, end };
    });
  if (!windows.length) return null;
  const first = windows.reduce((earliest, window) =>
    window.start < earliest.start ? window : earliest,
  );
  return time >= first.start && time <= first.end ? first.configuration : null;
}

export function sectorBounds(
  sectors: SatelliteSectors[],
  satelliteId: number,
  sector: SatelliteSector,
): Bounds | null {
  const entries = sectors.find((satellite) => satellite.id === String(satelliteId))?.[sector];
  if (!entries?.length) return null;
  const { west, south, east, north } = entries.reduce((latest, entry) =>
    entry.date > latest.date ? entry : latest,
  ).coords;
  return [west, south, east, north];
}
