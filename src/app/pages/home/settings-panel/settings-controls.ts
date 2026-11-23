import { OptionsControl, OptionsPresentation, options } from '../../../utils/controls';
import { CoordinateFormat } from '../../../utils/coordinates';
import { registerSettings } from '../../../utils/settings';
import { Quantity, Unit } from '../../../utils/units';

export const unitControls: Partial<Record<Quantity, OptionsControl<Unit>>> = {
  [Quantity.WindSpeed]: options<Unit>(
    Unit.Knots,
    [
      { value: Unit.Knots, label: 'kt' },
      { value: Unit.MetersPerSecond, label: 'm/s' },
    ],
    'רוח',
    OptionsPresentation.Table,
  ),
  [Quantity.GeopotentialHeight]: options<Unit>(
    Unit.Meters,
    [
      { value: Unit.Meters, label: 'm' },
      { value: Unit.Feet, label: 'ft' },
    ],
    'גובה גיאופוטנציאלי',
    OptionsPresentation.Table,
  ),
};
registerSettings(unitControls, 'units');

export const coordinateFormat: OptionsControl<CoordinateFormat> = options(
  CoordinateFormat.Decimal,
  [
    { value: CoordinateFormat.Decimal, label: 'DD' },
    { value: CoordinateFormat.DegreesMinutesSeconds, label: 'DMS' },
    { value: CoordinateFormat.Utm, label: 'UTM' },
    { value: CoordinateFormat.OperationalGrid, label: 'גריד מבצעי' },
  ],
  'קואורדינטות',
  OptionsPresentation.Select,
);
registerSettings({ format: coordinateFormat }, 'coordinates');

export enum Quality {
  Normal = 'normal',
  Low = 'low',
}

export const quality: OptionsControl<Quality> = options(
  Quality.Normal,
  [
    { value: Quality.Normal, label: 'רגילה' },
    { value: Quality.Low, label: 'נמוכה' },
  ],
  'איכות',
  OptionsPresentation.Table,
);

export enum Projection {
  Flat = 'flat',
  Globe = 'globe',
}

export const projection: OptionsControl<Projection> = options(
  Projection.Flat,
  [
    { value: Projection.Flat, label: 'שטוחה' },
    { value: Projection.Globe, label: 'כדור' },
  ],
  'מפה',
  OptionsPresentation.Table,
);
registerSettings({ quality, projection }, 'display');
