import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-charity-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section style="padding:1rem; max-width:720px; margin:0 auto;">
      <h2>Legacy Charity Register</h2>
      <p>This screen is no longer used. Please use the main charity signup page.</p>
    </section>
  `
})
export class CharityRegisterComponent {
  phone = '';
  phoneOtp = '';
  email = '';
  emailOtp = '';
  password = '';
  charityName = '';

  

  phoneVerified = false;
  emailVerified = false;

  constructor(private api: ApiService) {}

  private normalizePhone(phone: string): string {
    const trimmed = (phone ?? '').trim();
    const sanitized = trimmed.replace(/\s|\-|\(|\)/g, '');

    if (!sanitized) {
      return '';
    }

    if (sanitized.startsWith('+')) {
      return sanitized;
    }

    if (/^\d{10}$/.test(sanitized)) {
      return `+91${sanitized}`;
    }

    if (/^91\d{10}$/.test(sanitized)) {
      return `+${sanitized}`;
    }

    if (/^\d+$/.test(sanitized)) {
      return `+${sanitized}`;
    }

    return sanitized;
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    if (error?.status === 0) {
      return 'Cannot connect to backend. Ensure API is running on http://localhost:5294.';
    }

    const message = error?.error?.message;
    const hint = error?.error?.hint;
    if (message && hint) {
      return `${message} (${hint})`;
    }
    if (message) {
      return message;
    }

    return fallback;
  }

  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  sendPhoneOtp() {
    const normalizedPhone = this.normalizePhone(this.phone);
    this.phone = normalizedPhone;

    this.api.sendPhoneOtp(normalizedPhone).subscribe({
      next: () => alert('Phone OTP sent to your mobile number'),
      error: (e) => alert(this.getApiErrorMessage(e, 'Failed to send phone OTP'))
    });
  }

  verifyPhoneOtp() {
    const normalizedPhone = this.normalizePhone(this.phone);
    this.phone = normalizedPhone;

    this.api.verifyPhoneOtp(normalizedPhone, this.phoneOtp).subscribe({
      next: () => {
        this.phoneVerified = true;
        alert('Phone verified');
      },
      error: (e) => alert(this.getApiErrorMessage(e, 'Invalid phone OTP'))
    });
  }

  sendEmailOtp() {
    const normalizedEmail = this.normalizeEmail(this.email);
    this.email = normalizedEmail;

    this.api.sendEmailOtp(normalizedEmail).subscribe({
      next: () => alert('Email OTP sent to your inbox'),
      error: (e) => alert(this.getApiErrorMessage(e, 'Failed to send email OTP'))
    });
  }

  verifyEmailOtp() {
    const normalizedEmail = this.normalizeEmail(this.email);
    this.email = normalizedEmail;

    this.api.verifyEmailOtp(normalizedEmail, this.emailOtp).subscribe({
      next: () => {
        this.emailVerified = true;
        alert('Email verified');
      },
      error: (e) => alert(this.getApiErrorMessage(e, 'Invalid email OTP'))
    });
  }

  register() {
    if (!this.phoneVerified || !this.emailVerified) {
      alert('Verify phone and email first');
      return;
    }

    const normalizedPhone = this.normalizePhone(this.phone);
    const normalizedEmail = this.normalizeEmail(this.email);

    this.phone = normalizedPhone;
    this.email = normalizedEmail;

    const data = {
      email: normalizedEmail,
      password: this.password,
      phoneNumber: normalizedPhone,
      charityName: this.charityName
    };

    this.api.registerCharity(data).subscribe({
      next: () => alert('Registered Successfully'),
      error: (e) => alert(this.getApiErrorMessage(e, 'Registration failed'))
    });
  }
}