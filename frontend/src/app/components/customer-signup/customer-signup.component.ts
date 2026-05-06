import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-customer-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './customer-signup.component.html',
  styleUrls: ['./customer-signup.component.css']
})
export class CustomerSignupComponent implements OnInit {
  signupForm!: FormGroup;
  currentStep = 1;
  totalSteps = 4;
  showPassword = false;
  showConfirmPassword = false;
  showTermsModal = false;
  isLoading = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';

  // OTP Variables
  emailOtpSent = false;
  phoneOtpSent = false;
  emailOtpVerified = false;
  phoneOtpVerified = false;
  emailOtpError = '';
  phoneOtpError = '';
  emailOtpInfo = '';
  phoneOtpInfo = '';
  emailResendCooldown = 0;
  phoneResendCooldown = 0;
  emailExistsError = '';
  private emailResendTimer: ReturnType<typeof setInterval> | null = null;
  private phoneResendTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private fb: FormBuilder, private api: ApiService) {}

  private normalizePhone(phone: string): string {
    const trimmed = (phone ?? '').trim();
    const sanitized = trimmed.replace(/\s|\-|\(|\)/g, '');
    if (!sanitized) return '';
    if (sanitized.startsWith('+')) return sanitized;
    if (/^\d{10}$/.test(sanitized)) return `+91${sanitized}`;
    if (/^91\d{10}$/.test(sanitized)) return `+${sanitized}`;
    if (/^\d+$/.test(sanitized)) return `+${sanitized}`;
    return sanitized;
  }

  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    if (error?.status === 0) {
      return 'Cannot connect to backend. Please ensure API is running on http://localhost:5294 and CORS is enabled.';
    }

    if (typeof error?.error === 'string' && error.error.trim()) {
      try {
        const parsed = JSON.parse(error.error);
        const parsedMessage = parsed?.message;
        const parsedHint = parsed?.hint;
        if (parsedMessage && parsedHint) {
          return `${parsedMessage} (${parsedHint})`;
        }
        if (parsedMessage) {
          return parsedMessage;
        }
      } catch {
        return error.error;
      }
    }

    const message = error?.error?.message;
    const hint = error?.error?.hint;
    if (message && hint) {
      return `${message} (${hint})`;
    }
    if (message) {
      return message;
    }
    if (error?.message) {
      return `${fallback} (${error.message})`;
    }
    return fallback;
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.signupForm = this.fb.group({
      // Step 1: Basic Info
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      emailOtp: [''],
      
      // Step 2: Phone Verification
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      phoneOtp: [''],
      
      // Step 3: Password
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      
      // Step 4: Personal Details
      dob: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      country: ['', [Validators.required]],
      termsAccepted: [false, [Validators.requiredTrue]]
    });
  }

  nextStep(): void {
    if (this.currentStep === 1) {
      this.validateEmailAvailability(() => {
        if (this.isCurrentStepValid()) {
          this.currentStep++;
        }
      });
      return;
    }

    if (this.isCurrentStepValid()) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return !!(this.signupForm.get('name')?.valid &&
               this.signupForm.get('email')?.valid &&
               this.emailOtpVerified);
      case 2:
        return !!(this.signupForm.get('phone')?.valid && this.phoneOtpVerified);
      case 3:
        return !!(this.signupForm.get('password')?.valid &&
               this.signupForm.get('confirmPassword')?.valid &&
               this.passwordsMatch());
      case 4:
        return !!(this.signupForm.get('dob')?.valid &&
               this.signupForm.get('gender')?.valid &&
               this.signupForm.get('city')?.valid &&
               this.signupForm.get('state')?.valid &&
               this.signupForm.get('country')?.valid);
      default:
        return false;
    }
  }

  // OTP Methods
  sendEmailOtp(): void {
    const email = this.normalizeEmail(this.signupForm.get('email')?.value ?? '');
    this.signupForm.get('email')?.setValue(email);
    if (email && this.signupForm.get('email')?.valid) {
      this.validateEmailAvailability(() => {
      this.isLoading = true;
      this.emailOtpError = '';
      this.emailOtpInfo = '';
      this.api.sendEmailOtp(email).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success) {
            this.emailOtpSent = true;
            this.emailOtpVerified = false;
            this.emailOtpInfo = response.message || 'OTP request accepted.';
            this.startEmailCooldown();
            console.log('OTP sent to email:', email);
          } else {
            this.emailOtpError = response.message || 'Failed to send OTP';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.emailOtpError = this.getApiErrorMessage(error, 'Error sending OTP. Please try again.');
          console.error('Error sending email OTP:', error);
        }
      });
      });
    }
  }

  verifyEmailOtp(): void {
    const email = this.normalizeEmail(this.signupForm.get('email')?.value ?? '');
    this.signupForm.get('email')?.setValue(email);
    const otp = this.signupForm.get('emailOtp')?.value;
    if (email && otp) {
      this.isLoading = true;
      this.emailOtpError = '';
      this.emailOtpInfo = '';
      this.api.verifyEmailOtp(email, otp).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success) {
            this.emailOtpVerified = true;
            this.emailOtpInfo = response.message || 'Email verified successfully.';
            console.log('Email verified successfully');
          } else {
            this.emailOtpError = response.message || 'Invalid OTP';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.emailOtpError = this.getApiErrorMessage(error, 'Error verifying OTP. Please try again.');
          console.error('Error verifying email OTP:', error);
        }
      });
    }
  }

  sendPhoneOtp(): void {
    const phone = this.normalizePhone(this.signupForm.get('phone')?.value ?? '');
    this.signupForm.get('phone')?.setValue(phone);
    this.signupForm.get('phone')?.markAsTouched();
    this.signupForm.get('phone')?.updateValueAndValidity();
    if (phone && this.signupForm.get('phone')?.valid) {
      this.isLoading = true;
      this.phoneOtpError = '';
      this.phoneOtpInfo = '';
      this.api.sendPhoneOtp(phone).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success) {
            this.phoneOtpSent = true;
            this.phoneOtpVerified = false;
            this.phoneOtpInfo = response.message || 'OTP request accepted.';
            this.startPhoneCooldown();
            console.log('OTP sent to phone:', phone);
          } else {
            this.phoneOtpError = response.message || 'Failed to send OTP';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.phoneOtpError = this.getApiErrorMessage(error, 'Error sending OTP. Please try again.');
          console.error('Error sending phone OTP:', error);
        }
      });
      return;
    }

    this.phoneOtpError = 'Please enter a valid phone number (example: 9380827703 or +919380827703).';
  }

  verifyPhoneOtp(): void {
    const phone = this.normalizePhone(this.signupForm.get('phone')?.value ?? '');
    this.signupForm.get('phone')?.setValue(phone);
    const otp = this.signupForm.get('phoneOtp')?.value;
    if (!phone || !this.signupForm.get('phone')?.valid) {
      this.phoneOtpError = 'Please enter a valid phone number before verifying OTP.';
      return;
    }

    if (phone && otp) {
      this.isLoading = true;
      this.phoneOtpError = '';
      this.phoneOtpInfo = '';
      this.api.verifyPhoneOtp(phone, otp).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response.success) {
            this.phoneOtpVerified = true;
            this.phoneOtpInfo = response.message || 'Phone verified successfully.';
            console.log('Phone verified successfully');
          } else {
            this.phoneOtpError = response.message || 'Invalid OTP';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.phoneOtpError = this.getApiErrorMessage(error, 'Error verifying OTP. Please try again.');
          console.error('Error verifying phone OTP:', error);
        }
      });
    }
  }

  passwordsMatch(): boolean {
    const password = this.signupForm.get('password')?.value;
    const confirmPassword = this.signupForm.get('confirmPassword')?.value;
    return password === confirmPassword && password !== '';
  }

  checkEmailExists(): void {
    const email = this.normalizeEmail(this.signupForm.get('email')?.value ?? '');
    this.signupForm.get('email')?.setValue(email, { emitEvent: false });

    if (!email || this.signupForm.get('email')?.invalid) {
      this.emailExistsError = '';
      return;
    }

    this.api.checkEmailExists(email).subscribe({
      next: (res: any) => {
        this.emailExistsError = res?.exists ? 'Email already exists.' : '';
      },
      error: () => {
        this.emailExistsError = '';
      }
    });
  }

  private validateEmailAvailability(onAvailable: () => void): void {
    const email = this.normalizeEmail(this.signupForm.get('email')?.value ?? '');
    if (!email || this.signupForm.get('email')?.invalid) {
      return;
    }

    this.api.checkEmailExists(email).subscribe({
      next: (res: any) => {
        this.emailExistsError = res?.exists ? 'Email already exists.' : '';
        if (!this.emailExistsError) {
          onAvailable();
        }
      },
      error: () => {
        this.emailExistsError = '';
        onAvailable();
      }
    });
  }

  get showPasswordMismatch(): boolean {
    const confirmValue = this.signupForm.get('confirmPassword')?.value;
    return !!confirmValue && !this.passwordsMatch();
  }

  get showWeakPasswordWarning(): boolean {
    const passwordControl = this.signupForm.get('password');
    const value = (passwordControl?.value ?? '').toString();
    return this.currentStep === 3 && value.length > 0 && !!passwordControl?.invalid;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  openTermsModal(event?: Event): void {
    event?.preventDefault();
    this.showTermsModal = true;
  }

  closeTermsModal(): void {
    this.showTermsModal = false;
  }

  agreeToTerms(): void {
    this.signupForm.get('termsAccepted')?.setValue(true);
    this.signupForm.get('termsAccepted')?.markAsTouched();
    this.showTermsModal = false;
  }

  private startEmailCooldown(): void {
    this.emailResendCooldown = 30;
    if (this.emailResendTimer) {
      clearInterval(this.emailResendTimer);
    }

    this.emailResendTimer = setInterval(() => {
      this.emailResendCooldown = Math.max(0, this.emailResendCooldown - 1);
      if (this.emailResendCooldown === 0 && this.emailResendTimer) {
        clearInterval(this.emailResendTimer);
        this.emailResendTimer = null;
      }
    }, 1000);
  }

  private startPhoneCooldown(): void {
    this.phoneResendCooldown = 30;
    if (this.phoneResendTimer) {
      clearInterval(this.phoneResendTimer);
    }

    this.phoneResendTimer = setInterval(() => {
      this.phoneResendCooldown = Math.max(0, this.phoneResendCooldown - 1);
      if (this.phoneResendCooldown === 0 && this.phoneResendTimer) {
        clearInterval(this.phoneResendTimer);
        this.phoneResendTimer = null;
      }
    }, 1000);
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.signupForm.valid && this.emailOtpVerified && this.phoneOtpVerified) {
      this.isLoading = true;

      const payload = {
        name: (this.signupForm.get('name')?.value ?? '').trim(),
        email: this.normalizeEmail(this.signupForm.get('email')?.value ?? ''),
        password: this.signupForm.get('password')?.value ?? '',
        phoneNumber: this.normalizePhone(this.signupForm.get('phone')?.value ?? ''),
        dob: this.signupForm.get('dob')?.value ?? '',
        gender: this.signupForm.get('gender')?.value ?? '',
        city: this.signupForm.get('city')?.value ?? '',
        state: this.signupForm.get('state')?.value ?? '',
        country: this.signupForm.get('country')?.value ?? ''
      };

      this.api.registerCustomer(payload).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response?.success) {
            this.successMessage = response?.message || 'Account created successfully.';
            setTimeout(() => window.location.href = '/login', 1500);
            return;
          }

          this.errorMessage = response?.message || 'Registration failed. Please try again.';
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = this.getApiErrorMessage(error, 'Registration failed. Verify phone and email first.');
        }
      });
      return;
    }

    if (!this.emailOtpVerified || !this.phoneOtpVerified) {
      this.errorMessage = 'Please verify both email OTP and phone OTP before creating account.';
      return;
    }

    this.errorMessage = 'Please complete all required fields and verify email and phone OTP.';
  }

  // Getter methods
  get name() { return this.signupForm.get('name'); }
  get email() { return this.signupForm.get('email'); }
  get phone() { return this.signupForm.get('phone'); }
  get password() { return this.signupForm.get('password'); }
  get confirmPassword() { return this.signupForm.get('confirmPassword'); }
  get dob() { return this.signupForm.get('dob'); }
  get gender() { return this.signupForm.get('gender'); }
  get city() { return this.signupForm.get('city'); }
  get state() { return this.signupForm.get('state'); }
  get country() { return this.signupForm.get('country'); }
  get termsAccepted() { return this.signupForm.get('termsAccepted'); }
}
