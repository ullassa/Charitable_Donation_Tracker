import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from './auth-state.service';
import { ToastService } from './services/toast.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  const auth = inject(AuthStateService);
  const token = auth.snapshot.token;

  if (!token) {
    toast.warning('Please login to continue.');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  return true;
};

export const roleGuard = (roles: string[]): CanActivateFn => {
  return (_route, state) => {
    const router = inject(Router);
    const toast = inject(ToastService);
    const auth = inject(AuthStateService);
    const token = auth.snapshot.token;

    if (!token) {
      toast.warning('Please login to continue.');
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    if (!auth.isRoleAllowed(roles)) {
      toast.error('You are not authorized to open that page.');
      router.navigate(['/']);
      return false;
    }

    return true;
  };
};
