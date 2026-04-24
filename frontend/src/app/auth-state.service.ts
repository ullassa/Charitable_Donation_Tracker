import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';

export interface AuthState {
  token: string;
  role: string;
  userId: string;
  userName: string;
  isLoggedIn: boolean;
}

export type NormalizedRole = 'customer' | 'charitymanager' | 'admin' | '';

const emptyState = (): AuthState => ({
  token: '',
  role: '',
  userId: '',
  userName: '',
  isLoggedIn: false
});

const AUTH_CHANGE_KEY = 'cf:auth:changed';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly stateSubject = new BehaviorSubject<AuthState>(this.readStorage());

  readonly state$ = this.stateSubject.asObservable();
  readonly isLoggedIn$: Observable<boolean> = this.state$.pipe(map(state => state.isLoggedIn));

  get snapshot(): AuthState {
    return this.stateSubject.value;
  }

  setSession(token: string, role: string, userId = '', userName = ''): void {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('role', role);
    sessionStorage.setItem('userId', userId);
    sessionStorage.setItem('userName', userName);
    this.stateSubject.next(this.readStorage());
    this.notifyAuthChanged();
  }

  clearSession(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userName');
    this.stateSubject.next(emptyState());
    this.notifyAuthChanged();
  }

  refresh(): void {
    this.stateSubject.next(this.readStorage());
    this.notifyAuthChanged();
  }

  normalizeRole(role: string | null | undefined): NormalizedRole {
    const raw = (role || '').trim().toLowerCase();
    if (!raw) {
      return '';
    }

    if (raw === 'customer' || raw === '1') {
      return 'customer';
    }

    if (raw === 'charitymanager' || raw === 'charity manager' || raw === 'charity' || raw === '2') {
      return 'charitymanager';
    }

    if (raw === 'admin' || raw === 'administrator' || raw === '3') {
      return 'admin';
    }

    return '';
  }

  get normalizedRole(): NormalizedRole {
    return this.normalizeRole(this.snapshot.role);
  }

  get dashboardRoute(): string | null {
    if (this.normalizedRole === 'customer') {
      return '/dashboard/customer';
    }

    if (this.normalizedRole === 'charitymanager') {
      return '/dashboard/charity';
    }

    if (this.normalizedRole === 'admin') {
      return '/dashboard/admin';
    }

    return null;
  }

  isRoleAllowed(roles: string[]): boolean {
    const current = this.normalizedRole;
    if (!current) {
      return false;
    }

    const allowed = roles
      .map(role => this.normalizeRole(role))
      .filter((role): role is Exclude<NormalizedRole, ''> => !!role);

    return allowed.includes(current);
  }

  private readStorage(): AuthState {
    const token = sessionStorage.getItem('token') || '';
    const storedRole = sessionStorage.getItem('role') || '';
    const role = this.normalizeRole(storedRole) || storedRole.trim();
    const userId = sessionStorage.getItem('userId') || '';
    const userName = sessionStorage.getItem('userName') || '';

    return {
      token,
      role,
      userId,
      userName,
      isLoggedIn: !!token
    };
  }

  private notifyAuthChanged(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    const stamp = Date.now().toString();
    localStorage.setItem(AUTH_CHANGE_KEY, stamp);

    try {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: AUTH_CHANGE_KEY,
          newValue: stamp,
          storageArea: localStorage,
          url: window.location.href
        })
      );
    } catch {
      window.dispatchEvent(new Event('storage'));
    }
  }
}
