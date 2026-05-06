import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CharityService {
  constructor(private api: ApiService) {}

  getCharityById(id: number): Observable<any> {
    return this.api.getPublicCharityById(id);
  }
}
