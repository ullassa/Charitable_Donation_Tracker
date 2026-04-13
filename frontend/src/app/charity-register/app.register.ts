import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-charity-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.register.html',
  // styleUrls: ['./app.register.css']
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
    if (!trimmed) {
      return '';
    }

    if (trimmed.startsWith('+')) {
      return trimmed;
    }

    if (/^\d+$/.test(trimmed)) {
      return `+${trimmed}`;
    }

    return trimmed;
  }

  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  sendPhoneOtp() {
    const normalizedPhone = this.normalizePhone(this.phone);
    this.phone = normalizedPhone;

    this.api.sendPhoneOtp(normalizedPhone).subscribe({
      next: () => alert('Phone OTP sent to your mobile number'),
      error: (e) => alert(e?.error?.message ?? 'Failed to send phone OTP')
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
      error: (e) => alert(e?.error?.message ?? 'Invalid phone OTP')
    });
  }

  sendEmailOtp() {
    const normalizedEmail = this.normalizeEmail(this.email);
    this.email = normalizedEmail;

    this.api.sendEmailOtp(normalizedEmail).subscribe({
      next: () => alert('Email OTP sent to your inbox'),
      error: (e) => alert(e?.error?.message ?? 'Failed to send email OTP')
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
      error: (e) => alert(e?.error?.message ?? 'Invalid email OTP')
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
      error: (e) => alert(e?.error?.message ?? 'Registration failed')
    });
  }
}