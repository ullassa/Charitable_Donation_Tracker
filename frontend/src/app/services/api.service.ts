import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
 
@Injectable({
  providedIn: 'root'
})
export class ApiService {
 
  private baseUrl = 'http://localhost:5292/api'; // your backend URL
 
  constructor(private http: HttpClient) {}
 
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
      
}