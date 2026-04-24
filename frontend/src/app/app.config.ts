import { ApplicationConfig, NgModule, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient,withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { ApiService } from './services/api.service';
import { FormsModule } from '@angular/forms';

// @NgModule({
//   imports: [FormsModule],
//   // providers: [ApiService]
// })

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
     provideRouter(routes),
  provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))]
};
