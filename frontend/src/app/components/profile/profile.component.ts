import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
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

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      addressLine: ['', Validators.required]
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

    return this.canEditProfile && (field === 'name' || field === 'addressLine');
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
    this.profile = { ...this.profile, ...formValue };
    this.api.updateCustomerProfile({
      name: formValue.name,
      addressLine: formValue.addressLine
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

    this.isCharityEditing = true;
    this.message = '';
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.load();
  }

  cancelCharityEdit(): void {
    this.isCharityEditing = false;
    this.load();
  }
}