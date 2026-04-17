import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  loading = false;
  saving = false;
  error = '';
  message = '';
  role = '';

  profile: any = {
    name: '',
    email: '',
    phoneNumber: '',
    city: ''
  };

  charityProfile: any = {
    addressLine: '',
    mission: '',
    about: '',
    activities: '',
    socialMediaLink: '',
    causeType: ''
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
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
          email: res?.user?.email || '',
          phoneNumber: res?.user?.phoneNumber || '',
          city: res?.customer?.city || res?.user?.city || ''
        };

        this.charityProfile = {
          addressLine: res?.charity?.addressLine || '',
          mission: res?.charity?.mission || '',
          about: res?.charity?.about || '',
          activities: res?.charity?.activities || '',
          socialMediaLink: res?.charity?.socialMediaLink || '',
          causeType: res?.charity?.causeType || ''
        };

        this.loading = false;
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

    if (this.role === 'CharityManager') {
      const confirmed = window.confirm('Updating your charity profile will send the request for admin approval and temporarily set the charity back to Pending. Continue?');
      if (!confirmed) {
        return;
      }

      this.saving = true;
      this.api.updateCharityProfile({
        name: this.profile.name,
        email: this.profile.email,
        phoneNumber: this.profile.phoneNumber,
        city: this.profile.city,
        addressLine: this.charityProfile.addressLine,
        mission: this.charityProfile.mission,
        about: this.charityProfile.about,
        activities: this.charityProfile.activities,
        socialMediaLink: this.charityProfile.socialMediaLink,
        causeType: this.charityProfile.causeType
      }).subscribe({
        next: (res: any) => {
          this.saving = false;
          this.message = res?.message || 'Charity profile update submitted for approval.';
          sessionStorage.setItem('userName', this.profile.name || '');
          localStorage.setItem('cf:auth:changed', Date.now().toString());
          this.load();
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Unable to submit charity profile update.';
        }
      });
      return;
    }

    this.saving = true;
    this.api.updateCustomerProfile({
      name: this.profile.name,
      email: this.profile.email,
      phoneNumber: this.profile.phoneNumber,
      city: this.profile.city
    }).subscribe({
      next: (res: any) => {
        this.saving = false;
        this.message = res?.message || 'Profile updated successfully.';
        sessionStorage.setItem('userName', this.profile.name || '');
        localStorage.setItem('cf:auth:changed', Date.now().toString());
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Unable to update profile.';
      }
    });
  }
}