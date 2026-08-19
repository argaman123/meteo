import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: 'brn-switch-thumb[hlm],[hlmSwitchThumb]',
  host: { 'data-slot': 'switch-thumb' },
})
export class HlmSwitchThumb {
  constructor() {
    classes(
      () =>
        'bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground rounded-full group-data-[size=default]/switch:size-[16px] group-data-[size=sm]/switch:size-[12px] data-[state=unchecked]:translate-x-0 data-[state=checked]:ltr:translate-x-[calc(100%-2px)] data-[state=checked]:rtl:-translate-x-[calc(100%-2px)] pointer-events-none block ring-0 transition-[translate] duration-200 ease-in-out',
    );
  }
}
