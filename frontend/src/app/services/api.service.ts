import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
 
@Injectable({
  providedIn: 'root'
})
export class ApiService {
 
  private baseUrl = 'http://localhost:5292/api'; // your backend URL
 
  constructor(private http: HttpClient) {}
 
  getUsers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/users`);


  }
      login(data:any) {

      return this.http.post(`${this.baseUrl}/auth/login`, data);
    }
}