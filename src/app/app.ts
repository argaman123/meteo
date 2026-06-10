import { Component } from '@angular/core';
import { AppShell } from './shell/app-shell';

@Component({
  selector: 'app-root',
  imports: [AppShell],
  host: { class: 'block h-full' },
  template: `<app-shell />`,
})
export class App {}
