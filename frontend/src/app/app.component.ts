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
  password: any;
  email: any;
 
  constructor(private api: ApiService) {}
 //initilize the users array by fetching data from the backend when the component is initialized
  ngOnInit(): void {
    this.api.getUsers().subscribe((data: any) => {
      console.log("DATA",data);
      this.users = data;
    },
    (error) => {
      console.error("Error fetching users:", error);
    });
  }

  //login method to authenticate the user by sending a POST request to the backend with the user's credentials
login(){
  const data = {
    email: this.email,
    passwordHash: this.password
};


this.api.login(data).subscribe((response:any) => {
    localStorage.setItem('token', response.token);
    alert('Login successful!');
    // Handle successful login, e.g., store token, navigate to dashboard, etc.

});

}
}