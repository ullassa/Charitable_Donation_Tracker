import { Component, OnInit } from '@angular/core';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common';
 import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  title(title: any) {
    throw new Error('Method not implemented.');
  }
 
  users: any[] = [];
  password: string='';
  // phoneNumber: string='';
  email: string='';
 
  constructor(private api: ApiService) {}
//  //initilize the users array by fetching data from the backend when the component is initialized
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
this.getUsers();
});

}
  getUsers() {
    this.api.getUsers().subscribe((res: any) => {
      console.log("USERS",res);
      this.users = res;
    }
    , (error) => {
      console.error("Error fetching users:", error);
    });
  }
}