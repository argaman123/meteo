import { HttpInterceptorFn } from '@angular/common/http';
import { fixtureBackendInterceptor } from '../app/dev/fixture-backend/fixture-backend';

export const environment: { apiInterceptors: HttpInterceptorFn[] } = {
  apiInterceptors: [fixtureBackendInterceptor],
};
