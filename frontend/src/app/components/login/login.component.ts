import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, HeaderComponent, FooterComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  showPassword = false;
  isLoading = false;
  submitted = false;
  errorMessage = '';
  returnUrl = '/';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.loginForm.valid) {
      this.isLoading = true;

      const payload = {
        email: (this.loginForm.get('email')?.value ?? '').trim().toLowerCase(),
        passwordHash: this.loginForm.get('password')?.value ?? '',
        password: this.loginForm.get('password')?.value ?? ''
      };

      this.api.login(payload).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          if (response?.success && response?.token) {
            sessionStorage.setItem('token', response.token);
            sessionStorage.setItem('role', response?.role || 'Customer');
            sessionStorage.setItem('userId', response?.userId || '');
            sessionStorage.setItem('userName', response?.userName || '');
            localStorage.setItem('cf:auth:changed', Date.now().toString());
            
            const role = (response?.role || '').toString().toLowerCase();

            if (this.returnUrl && this.returnUrl !== '/' && this.returnUrl !== '/login') {
              this.router.navigateByUrl(this.returnUrl);
              return;
            }

            if (role === 'customer') {
              this.router.navigate(['/dashboard/customer']);
              return;
            }

            if (role === 'charitymanager') {
              this.router.navigate(['/dashboard/charity']);
              return;
            }

            if (role === 'admin') {
              this.router.navigate(['/dashboard/admin']);
              return;
            }

            this.router.navigate(['/']);
            return;
          }

          this.errorMessage = 'Invalid email or password. Please try again.';
        },
        error: (error) => {
          this.isLoading = false;
          const backendMessage = error?.error?.message;
          const backendDetails = error?.error?.details;
          const errorNumber = error?.error?.errorNumber;
          const statusCode = error?.status;

          if (statusCode === 401) {
            this.errorMessage = 'Invalid email or password. Please try again.';
            return;
          }

          if (statusCode === 503) {
            this.errorMessage = 'Server is temporarily unavailable. Please try again later.';
            return;
          }

          if (backendMessage) {
            if (backendMessage.toLowerCase().includes('invalid')) {
              this.errorMessage = 'Invalid email or password. Please try again.';
            } else {
              this.errorMessage = backendMessage;
            }
            return;
          }

          this.errorMessage = 'Login failed. Please try again.';
        }
      });
    }
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
