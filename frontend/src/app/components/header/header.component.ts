import { Component, ElementRef, HostListener } from '@angular/core';
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
  donateCausesOpen = false;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  get isLoggedIn(): boolean {
    return !!sessionStorage.getItem('token') || !!localStorage.getItem('token');
  }

  causes = [
    { id: 1, name: 'Medical' },
    { id: 2, name: 'Education' },
    { id: 3, name: 'Food & Hunger' },
    { id: 4, name: 'Disaster Relief' },
    { id: 5, name: 'Environmental' }
  ];

  toggleDonateCauses(): void {
    this.donateCausesOpen = !this.donateCausesOpen;
  }

  openDonateCauses(): void {
    this.donateCausesOpen = true;
  }

  closeDonateCauses(): void {
    this.donateCausesOpen = false;
  }

  navigateToDonate(causeId: number): void {
    this.closeDonateCauses();
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target as Node);
    if (!clickedInside) {
      this.closeDonateCauses();
    }
  }
}
