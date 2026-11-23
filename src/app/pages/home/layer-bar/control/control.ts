import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmDropdownMenu,
  HlmDropdownMenuRadio,
  HlmDropdownMenuRadioIndicator,
  HlmDropdownMenuTrigger,
} from '@spartan-ng/helm/dropdown-menu';
import {
  HlmPopover,
  HlmPopoverContent,
  HlmPopoverPortal,
  HlmPopoverTrigger,
} from '@spartan-ng/helm/popover';
import { HlmSlider } from '@spartan-ng/helm/slider';
import { HlmSwitch } from '@spartan-ng/helm/switch';
import {
  Control,
  ControlType,
  OptionsControl,
  OptionsPresentation,
  PercentControl,
} from '../../../../utils/controls';

@Component({
  selector: 'app-control',
  imports: [
    DecimalPipe,
    HlmButton,
    HlmDropdownMenu,
    HlmDropdownMenuRadio,
    HlmDropdownMenuRadioIndicator,
    HlmDropdownMenuTrigger,
    HlmPopover,
    HlmPopoverContent,
    HlmPopoverPortal,
    HlmPopoverTrigger,
    HlmSlider,
    HlmSwitch,
  ],
  host: { class: 'contents' },
  templateUrl: './control.html',
})
export class ControlView {
  protected readonly ControlType = ControlType;
  protected readonly OptionsPresentation = OptionsPresentation;

  readonly control = input.required<Control>();

  protected cycleOptions(control: OptionsControl<unknown>): void {
    const index = control.choices.findIndex((choice) => choice.value === control());
    control.set(control.choices[(index + 1) % control.choices.length].value);
  }

  protected optionLabel(control: OptionsControl<unknown>): string {
    return control.choices.find((choice) => choice.value === control())?.label ?? String(control());
  }

  protected setPercent(control: PercentControl, values: number[]): void {
    control.set(values[0]);
  }
}
