import { WritableSignal } from '@angular/core';
import { setting } from './settings';

export enum ControlType {
  Options = 'options',
  Percent = 'percent',
  Color = 'color',
  Toggle = 'toggle',
}

export enum OptionsPresentation {
  Cycle = 'cycle',
  Select = 'select',
  Table = 'table',
}

export type OptionsControl<T> = WritableSignal<T> & {
  type: ControlType.Options;
  choices: { value: T; label: string }[];
  label?: string;
  presentation: OptionsPresentation;
};
export type PercentControl = WritableSignal<number> & { type: ControlType.Percent };
export type ToggleControl = WritableSignal<boolean> & {
  type: ControlType.Toggle;
  label?: string;
};
export interface ColorControl {
  type: ControlType.Color;
  color: string;
}
export type Control = OptionsControl<unknown> | PercentControl | ColorControl | ToggleControl;

export function options<T>(
  initial: T,
  choices: { value: T; label: string }[],
  label?: string,
  presentation = OptionsPresentation.Cycle,
): OptionsControl<T> {
  return Object.assign(setting(initial), {
    type: ControlType.Options as const,
    choices,
    label,
    presentation,
  });
}

export function toggle(initial: boolean, label?: string): ToggleControl {
  const control = setting(initial);
  if (typeof control() !== 'boolean') control.set(initial);
  return Object.assign(control, { type: ControlType.Toggle as const, label });
}

export function percent(initial: number): PercentControl {
  return Object.assign(setting(initial), { type: ControlType.Percent as const });
}

export function color(value: string): ColorControl {
  return { type: ControlType.Color, color: value };
}
