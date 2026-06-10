import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet],
  template: `
    <div class="flex h-full flex-col">
      <header class="flex items-center gap-3 border-b border-panel-border bg-panel px-4 py-2">
        <span class="text-lg font-medium">מטאו</span>
        <span class="text-sm text-text-muted">Meteo</span>
      </header>
      <main class="min-h-0 flex-1">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShell {}
