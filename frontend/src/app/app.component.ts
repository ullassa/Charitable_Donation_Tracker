import { Component, OnInit } from '@angular/core';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common';
 
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
    // <!-- <h1>Users</h1> -->
    // <!-- <div *ngFor="let user of users">
    //   {{user.name}} - {{user.email}}
    // </div> -->

})
export class AppComponent implements OnInit {
 
  users: any[] = [];
 
  constructor(private api: ApiService) {}
 
  ngOnInit(): void {
    this.api.getUsers().subscribe((data: any) => {
      console.log("DATA",data);
      this.users = data;
    },
    (error) => {
      console.error("Error fetching users:", error);
    });
  }
}
 