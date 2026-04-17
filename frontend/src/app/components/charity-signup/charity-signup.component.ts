import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-charity-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './charity-signup.component.html',
  styleUrls: ['./charity-signup.component.css']
})
export class CharitySignupComponent implements OnInit {
  signupForm!: FormGroup;
  currentStep = 1;
  totalSteps = 5;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  submitted = false;
  errorMessage = '';

  // OTP Variables
  emailOtpSent = false;
  phoneOtpSent = false;
  emailOtpVerified = false;
  phoneOtpVerified = false;
  emailOtpError = '';
  phoneOtpError = '';
  emailOtpInfo = '';
  phoneOtpInfo = '';
  successMessage = '';
  previewAcknowledged = false;
  emailResendCooldown = 0;
  phoneResendCooldown = 0;
  private emailResendTimer: ReturnType<typeof setInterval> | null = null;
  private phoneResendTimer: ReturnType<typeof setInterval> | null = null;
  selectedTaxExemptCertificateName = 'No file chosen';
  selectedTaxExemptCertificateFile: File | null = null;
  websiteLinks: string[] = [''];
  charityImageUrls: string[] = [''];

  constructor(private fb: FormBuilder, private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.signupForm = this.fb.group({
      // Step 1: Organization Info
      organizationName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      emailOtp: [''],
      
      // Step 2: Phone Verification
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
      phoneOtp: [''],
      
      // Step 3: Password
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      
      // Step 4: Registration Details
      dob: [''],
      city: [''],
      state: [''],
      country: [''],
      
      // Step 5: Charity Details (for admin approval)
      charityRegistrationNumber: ['', [Validators.required]],
      charityType: ['', [Validators.required]],
      focusAreas: ['', [Validators.required]],
      description: [''],
      website: ['', Validators.pattern(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)],
      taxExemptCertificate: ['']
    });
  }

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

  nextStep(): void {
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
        return !!(this.signupForm.get('organizationName')?.valid &&
               this.signupForm.get('email')?.valid &&
               this.emailOtpVerified);
      case 2:
        return !!(this.signupForm.get('phone')?.valid && this.phoneOtpVerified);
      case 3:
        return !!(this.signupForm.get('password')?.valid &&
               this.signupForm.get('confirmPassword')?.valid &&
               this.passwordsMatch());
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  }

  private canCreateAccount(): boolean {
    return !!(
      this.signupForm.get('organizationName')?.valid &&
      this.signupForm.get('email')?.valid &&
      this.signupForm.get('phone')?.valid &&
      this.signupForm.get('password')?.valid &&
      this.signupForm.get('confirmPassword')?.valid &&
      this.passwordsMatch() &&
      this.emailOtpVerified &&
      this.phoneOtpVerified
    );
  }

  // OTP Methods
  sendEmailOtp(): void {
    const email = this.normalizeEmail(this.signupForm.get('email')?.value ?? '');
    this.signupForm.get('email')?.setValue(email);
    if (email && this.signupForm.get('email')?.valid) {
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
    }
  }

  verifyPhoneOtp(): void {
    const phone = this.normalizePhone(this.signupForm.get('phone')?.value ?? '');
    this.signupForm.get('phone')?.setValue(phone);
    const otp = this.signupForm.get('phoneOtp')?.value;
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

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0] ?? null;
    this.selectedTaxExemptCertificateFile = file;

    if (file) {
      this.selectedTaxExemptCertificateName = file.name;
      console.log('File selected:', file.name);
    } else {
      this.selectedTaxExemptCertificateName = 'No file chosen';
    }
  }

  addWebsiteField(): void {
    this.websiteLinks.push('');
  }

  removeWebsiteField(index: number): void {
    if (this.websiteLinks.length === 1) {
      this.websiteLinks[0] = '';
      return;
    }

    this.websiteLinks.splice(index, 1);
  }

  addImageField(): void {
    this.charityImageUrls.push('');
  }

  removeImageField(index: number): void {
    if (this.charityImageUrls.length === 1) {
      this.charityImageUrls[0] = '';
      return;
    }

    this.charityImageUrls.splice(index, 1);
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

    if (this.canCreateAccount()) {
      const summary = [
        `Organization: ${this.signupForm.get('organizationName')?.value ?? ''}`,
        `Email: ${this.normalizeEmail(this.signupForm.get('email')?.value ?? '')}`,
        `Phone: ${this.normalizePhone(this.signupForm.get('phone')?.value ?? '')}`,
        `City: ${this.signupForm.get('city')?.value ?? ''}`,
        `Charity type: ${this.signupForm.get('charityType')?.value ?? ''}`,
        `Focus areas: ${this.signupForm.get('focusAreas')?.value ?? ''}`
      ].join('\n');

      const previewConfirmed = window.confirm(`Please review your charity registration details:\n\n${summary}\n\nIf anything is wrong, cancel and edit the form.`);
      if (!previewConfirmed) {
        return;
      }

      const finalConfirmed = window.confirm('Confirm final submission? Your charity registration will be sent for admin approval.');
      if (!finalConfirmed) {
        return;
      }

      this.isLoading = true;

      const email = this.normalizeEmail(this.signupForm.get('email')?.value ?? '');
      const phone = this.normalizePhone(this.signupForm.get('phone')?.value ?? '');
      const charityName = (this.signupForm.get('organizationName')?.value ?? '').trim();

      const payload = {
        name: charityName,
        charityName: charityName,
        email: email,
        password: this.signupForm.get('password')?.value ?? '',
        phoneNumber: phone,
        registrationId: this.signupForm.get('charityRegistrationNumber')?.value ?? '',
        causeType: this.signupForm.get('charityType')?.value ?? '',
        city: this.signupForm.get('city')?.value ?? '',
        socialMediaLink: this.websiteLinks.find(link => !!(link || '').trim()) ?? this.signupForm.get('website')?.value ?? '',
        websiteLinks: this.websiteLinks.map(link => (link || '').trim()).filter(link => link.length > 0),
        imageUrls: this.charityImageUrls.map(link => (link || '').trim()).filter(link => link.length > 0),
        mission: this.signupForm.get('focusAreas')?.value ?? '',
        about: this.signupForm.get('description')?.value ?? '',
        activities: this.signupForm.get('focusAreas')?.value ?? ''
      };

      this.api.registerCharity(payload).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response?.success) {
            this.successMessage = response?.message || 'Account created successfully.';
            setTimeout(() => this.router.navigate(['/login']), 1500);
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

    this.errorMessage = 'Please complete the required account fields: organization name, email, phone, and password.';
  }

  // Getter methods
  get organizationName() { return this.signupForm.get('organizationName'); }
  get email() { return this.signupForm.get('email'); }
  get phone() { return this.signupForm.get('phone'); }
  get password() { return this.signupForm.get('password'); }
  get confirmPassword() { return this.signupForm.get('confirmPassword'); }
  get dob() { return this.signupForm.get('dob'); }
  get city() { return this.signupForm.get('city'); }
  get state() { return this.signupForm.get('state'); }
  get country() { return this.signupForm.get('country'); }
  get charityRegistrationNumber() { return this.signupForm.get('charityRegistrationNumber'); }
  get charityType() { return this.signupForm.get('charityType'); }
  get focusAreas() { return this.signupForm.get('focusAreas'); }
  get description() { return this.signupForm.get('description'); }
  get taxExemptCertificate() { return this.signupForm.get('taxExemptCertificate'); }

  get previewSummary(): string {
    return [
      `Organization: ${this.signupForm.get('organizationName')?.value ?? ''}`,
      `Email: ${this.normalizeEmail(this.signupForm.get('email')?.value ?? '')}`,
      `Phone: ${this.normalizePhone(this.signupForm.get('phone')?.value ?? '')}`,
      `City: ${this.signupForm.get('city')?.value ?? ''}`,
      `State: ${this.signupForm.get('state')?.value ?? ''}`,
      `Country: ${this.signupForm.get('country')?.value ?? ''}`,
      `Charity type: ${this.signupForm.get('charityType')?.value ?? ''}`,
      `Focus areas: ${this.signupForm.get('focusAreas')?.value ?? ''}`,
      `Registration number: ${this.signupForm.get('charityRegistrationNumber')?.value ?? ''}`
    ].join(' • ');
  }
}
