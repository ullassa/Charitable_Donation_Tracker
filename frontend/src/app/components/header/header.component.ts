import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  get isLoggedIn(): boolean {
    return !!sessionStorage.getItem('token');
  }

  get role(): string {
    return (sessionStorage.getItem('role') || '').trim().toLowerCase();
  }

  get dashboardLink(): string | null {
    if (this.role === 'customer') {
      return '/dashboard/customer';
    }

    if (this.role === 'charitymanager') {
      return '/dashboard/charity';
    }

    if (this.role === 'admin') {
      return '/dashboard/admin';
    }

    return null;
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userName');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.setItem('cf:auth:changed', Date.now().toString());
    window.location.href = '/';
  }
}
