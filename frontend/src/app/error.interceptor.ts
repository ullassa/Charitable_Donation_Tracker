import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from './auth-state.service';
import { ToastService } from './services/toast.service';

const isAuthEndpoint = (url: string): boolean => {
  const normalized = (url || '').toLowerCase();
  return normalized.includes('/auth/login') || normalized.includes('/auth/send-') || normalized.includes('/auth/verify-') || normalized.includes('/auth/forgot-password') || normalized.includes('/auth/reset-password');
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  const auth = inject(AuthStateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const status = error?.status;
      const apiMessage =
        (typeof error?.error === 'string' ? error.error : '') ||
        error?.error?.message ||
        error?.message ||
        'Something went wrong. Please try again.';

      if ((status === 401 || status === 403) && !isAuthEndpoint(req.url)) {
        auth.clearSession();

        toast.warning('Session expired. Please login again.');
        router.navigate(['/login'], { queryParams: { returnUrl: router.url || '/' } });
      } else if (status === 0) {
        if (!isAuthEndpoint(req.url)) {
          toast.error('Cannot connect to server. Please try again.');
        }
      } else if (status >= 500) {
        if (!isAuthEndpoint(req.url)) {
          toast.error('Server error. Please try again later.');
        }
      } else if (!isAuthEndpoint(req.url)) {
        toast.error(apiMessage);
      }

      return throwError(() => error);
    })
  );
};
