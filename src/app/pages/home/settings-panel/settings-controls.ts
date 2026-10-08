import { OptionsControl, OptionsPresentation, options } from '../../../utils/controls';
import { CoordinateFormat } from '../../../utils/geo';
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
  ],
  'קואורדינטות',
  OptionsPresentation.Table,
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
registerSettings({ quality }, 'display');
