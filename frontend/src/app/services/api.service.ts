import { Injectable } from '@angular/core';
<<<<<<< HEAD
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
=======
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
 
@Injectable({
  providedIn: 'root'
})
>>>>>>> 5d2ace989a224e48618724966e16c2bbd9870d6e
export class ApiService {
  baseUrl = 'http://localhost:5292/api';

  constructor(private http: HttpClient) {}
<<<<<<< HEAD

  // ...existing code...
  login(data: any) {
    return this.http.post(`${this.baseUrl}/auth/login`, data);
  }

  getUsers() {
    const token = localStorage.getItem('token');
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
=======
 
login(data:any) {

      return this.http.post(`${this.baseUrl}/auth/login`, data);
    }
  getUsers() : Observable<any> {
    const token = localStorage.getItem('token');
console.log("TOKEN:",token);
// const headers = new HttpHeaders({
  Authorization: `Bearer ${token}`
// });

    return this.http.get(`${this.baseUrl}/users`,);
    
}
      
>>>>>>> 5d2ace989a224e48618724966e16c2bbd9870d6e
}