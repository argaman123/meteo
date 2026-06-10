import { Component } from '@angular/core';
import { AppShell } from './shell/app-shell';

@Component({
  selector: 'app-root',
  imports: [AppShell],
  template: `<app-shell />`,
})
export class App {}
