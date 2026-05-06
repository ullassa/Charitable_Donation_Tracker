import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

interface CustomerProfileModel {
  name: string;
  addressLine: string;
  email: string;
  phoneNumber: string;
  city: string;
  dateOfBirth: string;
}

interface CharityProfileModel {
  name: string;
  email: string;
  phoneNumber: string;
  city: string;
  state: string;
  pincode: string;
  managerName: string;
  managerPhone: string;
  registrationId: string;
  mission: string;
  about: string;
  activities: string;
  socialMediaLink: string;
  causeType: string;
  status: string;
  adminComment: string;
  reviewedAt: string;
}

const CAUSE_OPTIONS = [
  'Education',
  'Healthcare',
  'WomenEmpowerment',
  'ChildCare',
  'OrphanageSupport',
  'ElderlyCare',
  'AnimalWelfare',
  'DisasterRelief',
  'FoodDonation',
  'EnvironmentalProtection',
  'DisabilitySupport',
  'RuralDevelopment',
  'MentalHealthSupport',
  'HomelessSupport',
  'TribalSupport',
  'SkillDevelopment',
  'GeneralCharity'
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  loading = false;
  saving = false;
  error = '';
  message = '';
  role = '';
  isEditing = false;
  isCharityEditing = false;
  profileForm: FormGroup;
  charityForm: FormGroup;
  readonly causeOptions = CAUSE_OPTIONS;
  
  // Account settings
  showDeleteConfirm = false;
  showDisableConfirm = false;
  deleteConfirmPassword = '';
  disableConfirmPassword = '';
  isProcessingAccountAction = false;

  // Support features
  showSupportForm = false;
  showChat = false;
  showFaqs = false;
  isSendingSupport = false;
  supportForm = {
    subject: '',
    message: '',
    charityName: '',
    registrationId: '',
    reason: ''
  };

  private readonly storageListener = (event: StorageEvent): void => {
    if (event.key === 'cf:profile:refresh' || event.key === 'cf:auth:changed') {
      this.load();
    }
  };

  profile: CustomerProfileModel = {
    name: '',
    addressLine: '',
    email: '',
    phoneNumber: '',
    city: '',
    dateOfBirth: ''
  };

  charityProfile: CharityProfileModel = {
    name: '',
    email: '',
    phoneNumber: '',
    city: '',
    state: '',
    pincode: '',
    managerName: '',
    managerPhone: '',
    registrationId: '',
    mission: '',
    about: '',
    activities: '',
    socialMediaLink: '',
    causeType: '',
    status: '',
    adminComment: '',
    reviewedAt: ''
  };

  constructor(private api: ApiService, private fb: FormBuilder, private router: Router) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      addressLine: ['']
    });

    this.charityForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      city: ['', Validators.required],
      mission: ['', [Validators.required, Validators.minLength(20)]],
      about: ['', [Validators.required, Validators.minLength(20)]],
      activities: ['', [Validators.required, Validators.minLength(20)]],
      socialMediaLink: ['', Validators.required],
      causeType: ['GeneralCharity', Validators.required]
    });
  }

  get isCharityManager(): boolean {
    return this.role === 'CharityManager';
  }

  get isCustomer(): boolean {
    return this.role === 'Customer';
  }

  get canEditProfile(): boolean {
    return this.role === 'Customer' || this.role === 'Admin';
  }

  get canEditCharityProfile(): boolean {
    return this.role === 'CharityManager';
  }

  canEditField(field: 'name' | 'addressLine'): boolean {
    if (!this.isEditing) {
      return false;
    }

    return this.canEditProfile && field === 'name';
  }

  ngOnInit(): void {
    this.load();
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.storageListener);
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.message = '';

    this.api.getMyProfile().subscribe({
      next: (res: any) => {
        this.role = (res?.role || '').toString();
        const user = res?.user || {};
        const customer = res?.customer || {};
        const charity = res?.charity || {};

        this.profile = {
          name: user?.userName || '',
          addressLine: user?.addressLine || customer?.city || user?.city || '',
          email: user?.email || '',
          phoneNumber: user?.phoneNumber || '',
          city: customer?.city || user?.city || '',
          dateOfBirth: customer?.dateOfBirth || user?.dateOfBirth || ''
        };

        this.profileForm.patchValue({
          name: this.profile.name,
          addressLine: this.profile.addressLine
        });
        this.profileForm.markAsPristine();

        this.charityProfile = {
          name: user?.userName || '',
          email: user?.email || '',
          phoneNumber: user?.phoneNumber || '',
          city: charity?.city || user?.city || '',
          state: charity?.indianState || '',
          pincode: charity?.pincode || '',
          managerName: charity?.managerName || '',
          managerPhone: charity?.managerPhone || '',
          registrationId: charity?.registrationId || charity?.charityRegistrationId || '',
          mission: charity?.mission || '',
          about: charity?.about || '',
          activities: charity?.activities || '',
          socialMediaLink: charity?.socialMediaLink || '',
          causeType: charity?.causeType || 'GeneralCharity',
          status: charity?.status || '',
          adminComment: charity?.adminComment || '',
          reviewedAt: charity?.reviewedAt || ''
        };

        this.charityForm.patchValue({
          name: this.charityProfile.name,
          email: this.charityProfile.email,
          phoneNumber: this.charityProfile.phoneNumber,
          city: this.charityProfile.city,
          mission: this.charityProfile.mission,
          about: this.charityProfile.about,
          activities: this.charityProfile.activities,
          socialMediaLink: this.charityProfile.socialMediaLink,
          causeType: this.charityProfile.causeType
        });

        this.charityForm.markAsPristine();

        this.loading = false;
        this.isEditing = false;
        this.isCharityEditing = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to load profile.';
      }
    });
  }

  save(): void {
    this.error = '';
    this.message = '';

    if (!this.canEditProfile) {
      this.error = 'You do not have permission to edit the customer profile.';
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.error = 'Please review the highlighted fields.';
      return;
    }

    this.saving = true;
    const formValue = this.profileForm.getRawValue();
    this.profile = { ...this.profile, name: formValue.name };
    this.api.updateCustomerProfile({
      name: formValue.name
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.message = res?.message || 'Profile updated successfully.';
        sessionStorage.setItem('userName', this.profile.name || '');
        localStorage.setItem('cf:profile:refresh', Date.now().toString());
        localStorage.setItem('cf:auth:changed', Date.now().toString());
        this.isEditing = false;
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Unable to update profile.';
      }
    });
  }

  saveCharity(): void {
    this.error = '';
    this.message = '';

    if (!this.canEditCharityProfile) {
      this.error = 'You do not have permission to edit the charity profile.';
      return;
    }

    if (this.charityForm.invalid) {
      this.charityForm.markAllAsTouched();
      this.error = 'Please review the highlighted charity fields.';
      return;
    }

    this.saving = true;
    const formValue = this.charityForm.getRawValue();
    this.charityProfile = { ...this.charityProfile, ...formValue };

    this.api.updateCharityProfile({
      name: formValue.name,
      email: formValue.email,
      phoneNumber: formValue.phoneNumber,
      city: formValue.city,
      mission: formValue.mission,
      about: formValue.about,
      activities: formValue.activities,
      socialMediaLink: formValue.socialMediaLink,
      causeType: formValue.causeType
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.message = res?.message || 'Charity profile updated successfully.';
        sessionStorage.setItem('userName', this.charityProfile.name || '');
        localStorage.setItem('cf:profile:refresh', Date.now().toString());
        localStorage.setItem('cf:auth:changed', Date.now().toString());
        this.isCharityEditing = false;
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Unable to update charity profile.';
      }
    });
  }

  enableEdit(): void {
    if (!this.canEditProfile) {
      return;
    }

    this.isEditing = true;
    this.message = '';
  }

  enableCharityEdit(): void {
    if (!this.canEditCharityProfile) {
      return;
    }

    this.router.navigate(['/charity-signup']);
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.load();
  }

  cancelCharityEdit(): void {
    this.isCharityEditing = false;
    this.load();
  }

  // Account Settings Methods
  openDeleteAccountDialog(): void {
    this.showDeleteConfirm = true;
    this.deleteConfirmPassword = '';
    this.error = '';
    this.message = '';
  }

  closeDeleteAccountDialog(): void {
    this.showDeleteConfirm = false;
    this.deleteConfirmPassword = '';
  }

  openDisableAccountDialog(): void {
    this.showDisableConfirm = true;
    this.disableConfirmPassword = '';
    this.error = '';
    this.message = '';
  }

  closeDisableAccountDialog(): void {
    this.showDisableConfirm = false;
    this.disableConfirmPassword = '';
  }

  deleteAccount(): void {
    this.error = '';
    this.message = '';

    if (!this.deleteConfirmPassword || this.deleteConfirmPassword.trim().length < 6) {
      this.error = 'Password is required (minimum 6 characters) to delete account.';
      return;
    }

    if (!confirm('⚠️  This action is PERMANENT. Your account and all data will be deleted. Email can be reused. Continue?')) {
      return;
    }

    this.isProcessingAccountAction = true;
    this.api.deleteAccount(this.deleteConfirmPassword).subscribe({
      next: (res: any) => {
        this.isProcessingAccountAction = false;
        this.message = 'Account deleted successfully. Redirecting to login...';
        this.closeDeleteAccountDialog();
        setTimeout(() => {
          localStorage.clear();
          sessionStorage.clear();
          this.router.navigate(['/']);
          location.reload();
        }, 2000);
      },
      error: (err: any) => {
        this.isProcessingAccountAction = false;
        const statusCode = err?.status;
        const errorMsg = err?.error?.message;

        // Handle 404 - endpoint not implemented
        if (statusCode === 404) {
          this.error = this.isCharityManager
            ? 'Charity account deletion requires admin approval. Please contact support@carefund.com'
            : 'Account deletion feature is being set up. Please try again later or contact support.';
          return;
        }

        // Handle 403 - insufficient permissions
        if (statusCode === 403) {
          this.error = 'Only admins can delete charity accounts. Please contact support@carefund.com';
          return;
        }

        // Handle authentication errors
        if (statusCode === 401) {
          this.error = 'Invalid password. Please try again.';
          return;
        }

        // Generic error
        this.error = errorMsg || 'Failed to delete account. Please check your password and try again.';
      }
    });
  }

  disableAccount(): void {
    this.error = '';
    this.message = '';

    if (!this.disableConfirmPassword || this.disableConfirmPassword.trim().length < 6) {
      this.error = 'Password is required (minimum 6 characters) to disable account.';
      return;
    }

    if (!confirm('Your account will be disabled and you won\'t be able to login. Continue?')) {
      return;
    }

    this.isProcessingAccountAction = true;
    this.api.disableAccount(this.disableConfirmPassword).subscribe({
      next: (res: any) => {
        this.isProcessingAccountAction = false;
        this.message = 'Account disabled successfully. Redirecting to login...';
        this.closeDisableAccountDialog();
        setTimeout(() => {
          localStorage.clear();
          sessionStorage.clear();
          this.router.navigate(['/']);
          location.reload();
        }, 2000);
      },
      error: (err: any) => {
        this.isProcessingAccountAction = false;
        const statusCode = err?.status;
        const errorMsg = err?.error?.message;

        // Handle 404 - endpoint not implemented
        if (statusCode === 404) {
          this.error = this.isCharityManager
            ? 'Charity account disabling requires admin approval. Please contact support@carefund.com with your details.'
            : 'Account disabling feature is being set up. Please try again later.';
          return;
        }

        // Handle 403 - insufficient permissions
        if (statusCode === 403) {
          this.error = 'Only admins can disable charity accounts. Please contact support@carefund.com';
          return;
        }

        // Handle authentication errors
        if (statusCode === 401) {
          this.error = 'Invalid password. Please try again.';
          return;
        }

        // Generic error
        this.error = errorMsg || 'Failed to disable account. Please check your password and try again.';
      }
    });
  }

  // Support Methods
  openSupportForm(): void {
    this.showSupportForm = true;
    this.supportForm = {
      subject: 'Account Deletion/Disable Request - Charity Account',
      message: '',
      charityName: this.charityProfile.name || '',
      registrationId: this.charityProfile.registrationId || '',
      reason: ''
    };
    this.error = '';
    this.message = '';
  }

  closeSupportForm(): void {
    this.showSupportForm = false;
    this.supportForm = {
      subject: '',
      message: '',
      charityName: '',
      registrationId: '',
      reason: ''
    };
  }

  openChat(): void {
    this.showChat = true;
    this.error = '';
    this.message = '';
  }

  closeChat(): void {
    this.showChat = false;
  }

  openFaqs(): void {
    this.showFaqs = true;
    this.error = '';
    this.message = '';
  }

  closeFaqs(): void {
    this.showFaqs = false;
  }

  sendSupportRequest(): void {
    this.error = '';
    this.message = '';

    if (!this.supportForm.message || this.supportForm.message.trim().length < 10) {
      this.error = 'Please provide a detailed message (minimum 10 characters).';
      return;
    }

    if (this.isCharityManager && (!this.supportForm.charityName || !this.supportForm.registrationId)) {
      this.error = 'Charity name and registration ID are required.';
      return;
    }

    this.isSendingSupport = true;

    // Prepare email content
    const emailBody = `
Charity Account Support Request

Charity Name: ${this.supportForm.charityName}
Registration ID: ${this.supportForm.registrationId}
Reason: ${this.supportForm.reason}

Message:
${this.supportForm.message}

Sent from: ${this.charityProfile.email}
Phone: ${this.charityProfile.phoneNumber}
    `.trim();

    // Use Bravo API to send email
    const bravoPayload = {
      to: 'usingviraaa@gmail.com',
      subject: this.supportForm.subject,
      body: emailBody,
      from: this.charityProfile.email
    };

    this.api.sendBravoEmail(bravoPayload).subscribe({
      next: (res: any) => {
        this.isSendingSupport = false;
        this.message = 'Support request sent successfully! An admin will review your request within 24-48 hours.';
        this.closeSupportForm();
        setTimeout(() => {
          this.message = '';
        }, 5000);
      },
      error: (err: any) => {
        this.isSendingSupport = false;
        this.error = 'Failed to send support request. Please try again or contact support@carefund.com directly.';
      }
    });
  }
}