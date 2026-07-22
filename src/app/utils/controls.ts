import { WritableSignal } from '@angular/core';
import { setting } from './settings';

export enum ControlType {
  Options = 'options',
  Percent = 'percent',
  Color = 'color',
}

export enum OptionsPresentation {
  Toggle = 'toggle',
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
export interface ColorControl {
  type: ControlType.Color;
  color: string;
}
export type Control = OptionsControl<unknown> | PercentControl | ColorControl;

export function options<T>(
  initial: T,
  choices: { value: T; label: string }[],
  label?: string,
  presentation = OptionsPresentation.Toggle,
): OptionsControl<T> {
  return Object.assign(setting(initial), {
    type: ControlType.Options as const,
    choices,
    label,
    presentation,
  });
}

export function percent(initial: number): PercentControl {
  return Object.assign(setting(initial), { type: ControlType.Percent as const });
}

export function color(value: string): ColorControl {
  return { type: ControlType.Color, color: value };
}
