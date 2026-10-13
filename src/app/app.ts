import { Dir } from '@angular/cdk/bidi';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToaster } from '@spartan-ng/helm/sonner';

@Component({
  selector: 'app-root',
  imports: [Dir, HlmToaster, RouterOutlet],
  host: { class: 'block h-full' },
  templateUrl: './app.html',
})
export class App {}
