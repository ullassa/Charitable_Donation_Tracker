import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  contactOpen = false;
  contactSubmitted = false;
  contactForm = { email: '', reason: '' };

  quickLinks = [
    { label: 'Home', path: '/' },
    { label: 'About Us', path: '/about' },
  ];

  legalLinks = [
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
  ];

  socialLinks = [
    { label: 'Facebook', icon: '📘', url: 'https://facebook.com' },
    { label: 'Twitter', icon: '𝕏', url: 'https://twitter.com' },
    { label: 'LinkedIn', icon: '💼', url: 'https://linkedin.com' },
    { label: 'Instagram', icon: '📷', url: 'https://instagram.com' },
  ];

  openContact(): void {
    this.contactSubmitted = false;
    this.contactOpen = true;
  }

  closeContact(): void {
    this.contactOpen = false;
  }

  submitContact(): void {
    if (!this.contactForm.email.trim() || !this.contactForm.reason.trim()) {
      return;
    }

    this.contactSubmitted = true;
    this.contactForm = { email: '', reason: '' };
  }
}
