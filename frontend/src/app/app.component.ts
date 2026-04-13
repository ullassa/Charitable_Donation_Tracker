import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
<<<<<<< HEAD
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api.service';
import { CharityRegisterComponent } from './charity-register/app.register';

interface User {
  userName: string;
  email: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule,FormsModule, CharityRegisterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  users: User[] = [];
  email = '';
  password = '';

  constructor(private api: ApiService) {}


  // login(): void {
  //   // Temporary login handler
  //   console.log('Login clicked', {
  //     email: this.email,
  //     password: this.password
  //   });
  // }


  login() {
    const data = {
      email: this.email.trim().toLowerCase(),
      passwordHash: this.password
    };

    this.api.login(data).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        alert('Login success');
        this.getUsers();
      },
      error: (e) => {
        alert(e?.error ?? e?.error?.message ?? 'Login failed');
      }
    });
  }

  getUsers() {
    this.api.getUsers().subscribe({
      next: (res: any) => {
        this.users = res;
      },
      error: () => {
        alert('Unable to load users. Please login again.');
      }
=======
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
>>>>>>> 5d2ace989a224e48618724966e16c2bbd9870d6e
    });
  }
}