import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  baseUrl = 'http://localhost:5294/api';

  constructor(private http: HttpClient) {}

  login(data: any) {
    return this.http.post(`${this.baseUrl}/auth/login`, data);
  }

  getUsers(): Observable<any> {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.baseUrl}/users`, { headers });
  }

  sendPhoneOtp(phone: string) {
    return this.http.post(
      `${this.baseUrl}/auth/send-phone-otp?phone=${encodeURIComponent(phone)}`,
      {}
    );
  }

  verifyPhoneOtp(phone: string, otp: string) {
    return this.http.post(
      `${this.baseUrl}/auth/verify-phone-otp?phone=${encodeURIComponent(phone)}&otp=${encodeURIComponent(otp)}`,
      {}
    );
  }

  sendEmailOtp(email: string) {
    return this.http.post(
      `${this.baseUrl}/auth/send-email-otp?email=${encodeURIComponent(email)}`,
      {}
    );
  }

  verifyEmailOtp(email: string, otp: string) {
    return this.http.post(
      `${this.baseUrl}/auth/verify-email-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
      {}
    );
  }

  registerCharity(data: any) {
    return this.http.post(`${this.baseUrl}/auth/register-charity`, data);
  }

  registerCustomer(data: any) {
    return this.http.post(`${this.baseUrl}/auth/register-customer`, data);
  }

  createDonation(payload: any) {
    return this.http.post(`${this.baseUrl}/donations`, payload);
  }

  getPublicCharities(keyword?: string, cause?: string) {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (cause) params.set('cause', cause);
    const suffix = params.toString() ? `?${params.toString()}` : '';

    return this.http.get(`${this.baseUrl}/charities/public${suffix}`).pipe(
      catchError(() => this.http.get(`${this.baseUrl}/Charities/public`).pipe(
        catchError(() => this.http.get(`${this.baseUrl}/auth/public-charities${suffix}`))
      ))
    );
  }

  getPublicCharitiesFromAuth() {
    return this.http.get(`${this.baseUrl}/auth/public-charities`);
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.baseUrl}/auth/forgot-password`, { email });
  }

  verifyForgotPasswordOtp(email: string, otp: string) {
    return this.http.post(`${this.baseUrl}/auth/verify-forgot-password-otp`, { email, otp });
  }

  resetPassword(payload: { email: string; otp: string; newPassword: string }) {
    return this.http.post(`${this.baseUrl}/auth/reset-password`, payload);
  }

  getNotifications() {
    return this.http.get(`${this.baseUrl}/notifications/mine`);
  }

  getCustomerDashboard(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.http.get(`${this.baseUrl}/dashboard/customer${suffix}`);
  }

  getCharityDashboard(from?: string, to?: string) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.http.get(`${this.baseUrl}/dashboard/charity${suffix}`);
  }

  downloadCustomerReport(from?: string, to?: string, format: 'csv' | 'pdf' = 'csv') {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('format', format);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.http.get(`${this.baseUrl}/dashboard/customer/report${suffix}`, { responseType: 'blob' });
  }

  downloadCharityReport(from?: string, to?: string, format: 'csv' | 'pdf' = 'csv') {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('format', format);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return this.http.get(`${this.baseUrl}/dashboard/charity/report${suffix}`, { responseType: 'blob' });
  }

  getAdminDashboard() {
    return this.http.get(`${this.baseUrl}/admin/dashboard`);
  }

  getAdminCharityRequests(status?: string) {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.http.get(`${this.baseUrl}/admin/charity-requests${suffix}`);
  }

  reviewCharityRequest(id: number, action: 'approve' | 'reject', adminComment?: string) {
    return this.http.put(`${this.baseUrl}/admin/charity-requests/${id}/review`, {
      action,
      adminComment: adminComment ?? ''
    });
  }

  getMyProfile() {
    return this.http.get(`${this.baseUrl}/profile/me`);
  }

  updateCustomerProfile(payload: { name: string; email: string; phoneNumber: string; city?: string }) {
    return this.http.put(`${this.baseUrl}/profile/customer`, payload);
  }

  updateCharityProfile(payload: {
    name: string;
    email: string;
    phoneNumber: string;
    city?: string;
    addressLine?: string;
    mission?: string;
    about?: string;
    activities?: string;
    socialMediaLink?: string;
    causeType: string;
  }) {
    return this.http.put(`${this.baseUrl}/profile/charity`, payload);
  }
}