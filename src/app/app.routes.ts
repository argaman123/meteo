import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home-page').then((m) => m.HomePage) },
  {
    path: 'daily-forecast',
    loadComponent: () =>
      import('./pages/daily-forecast/daily-forecast-page').then((m) => m.DailyForecastPage),
  },
  { path: '**', redirectTo: '' },
];
