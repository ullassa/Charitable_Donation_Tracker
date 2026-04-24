import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthStateService } from '../../auth-state.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  public readonly auth = inject(AuthStateService);
  private readonly router = inject(Router);

  get dashboardLink(): string | null {
    return this.auth.dashboardRoute;
  }

  get showStartCharity(): boolean {
    return !this.auth.snapshot.isLoggedIn;
  }

  logout(): void {
    this.auth.clearSession();
    this.router.navigate(['/login'], { replaceUrl: true }).then(navigated => {
      if (!navigated) {
        window.location.href = '/login';
      }
    });
  }

  openLogin(): void {
    this.router.navigate(['/login']);
  }

  openProfile(): void {
    this.router.navigate(['/profile']);
  }

  startCharity(): void {
    this.router.navigate(['/charity-signup']);
  }

  openDashboard(): void {
    const route = this.dashboardLink;
    if (!route) {
      this.router.navigate(['/']);
      return;
    }

    this.router.navigate([route]);
  }
}
