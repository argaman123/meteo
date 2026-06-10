import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'map' },
  { path: 'map', loadComponent: () => import('./features/map/map-page').then((m) => m.MapPage) },
  { path: '**', redirectTo: 'map' },
];
