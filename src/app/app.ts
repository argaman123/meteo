import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  host: { class: 'block h-full' },
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
