import { HttpInterceptorFn } from '@angular/common/http';
import { backendUrlInterceptor } from '../app/backend';

const BACKEND_URL = 'http://CHANGE-ME:8000';

export const environment: { apiInterceptors: HttpInterceptorFn[] } = {
  apiInterceptors: [backendUrlInterceptor(BACKEND_URL)],
};
