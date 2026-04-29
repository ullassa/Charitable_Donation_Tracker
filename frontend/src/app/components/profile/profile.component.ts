import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

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
  profileForm: FormGroup;

  private readonly storageListener = (event: StorageEvent): void => {
    if (event.key === 'cf:profile:refresh' || event.key === 'cf:auth:changed') {
      this.load();
    }
  };

  profile: any = {
    name: '',
    addressLine: '',
    email: '',
    phoneNumber: '',
    city: '',
    dateOfBirth: ''
  };

  charityProfile: any = {
    addressLine: '',
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
    causeType: ''
  };

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      addressLine: ['']
    });
  }

  get isCharityManager(): boolean {
    return this.role === 'CharityManager';
  }

  get isCustomer(): boolean {
    return this.role === 'Customer';
  }

  get canEditProfile(): boolean {
    return this.role !== 'CharityManager';
  }

  canEditField(field: 'name' | 'addressLine'): boolean {
    if (!this.isEditing) {
      return false;
    }

    return this.isCustomer && (field === 'name' || field === 'addressLine');
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
        this.profile = {
          name: res?.user?.userName || '',
          addressLine: res?.customer?.addressLine || res?.customer?.city || res?.user?.city || '',
          email: res?.user?.email || '',
          phoneNumber: res?.user?.phoneNumber || '',
          city: res?.customer?.city || res?.user?.city || '',
          dateOfBirth: res?.customer?.dateOfBirth || res?.user?.dateOfBirth || ''
        };

        this.profileForm.patchValue(this.profile);
        this.profileForm.markAsPristine();

        this.charityProfile = {
          addressLine: res?.charity?.addressLine || '',
          city: res?.charity?.city || '',
          state: res?.charity?.state || '',
          pincode: res?.charity?.pincode || '',
          managerName: res?.charity?.managerName || '',
          managerPhone: res?.charity?.managerPhone || '',
          registrationId: res?.charity?.registrationId || '',
          mission: res?.charity?.mission || '',
          about: res?.charity?.about || '',
          activities: res?.charity?.activities || '',
          socialMediaLink: res?.charity?.socialMediaLink || '',
          causeType: res?.charity?.causeType || ''
        };

        this.loading = false;
        this.isEditing = false;
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

    if (this.isCharityManager) {
      this.error = 'Charity profiles are read-only and cannot be edited.';
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
      addressLine: formValue.addressLine,
      city: formValue.addressLine
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

  enableEdit(): void {
    if (!this.canEditProfile) {
      return;
    }

    this.isEditing = true;
    this.message = '';
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.load();
  }
}