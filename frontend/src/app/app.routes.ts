import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { LoginComponent } from './components/login/login.component';
import { CustomerSignupComponent } from './components/customer-signup/customer-signup.component';
import { CharitySignupComponent } from './components/charity-signup/charity-signup.component';
import { ImpactComponent } from './components/impact/impact.component';
import { BlogsComponent } from './components/blogs/blogs.component';
import { PaymentSuccessComponent } from './components/payment-success/payment-success.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { CustomerDashboardComponent } from './components/customer-dashboard/customer-dashboard.component';
import { CharityDashboardComponent } from './components/charity-dashboard/charity-dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ProfileComponent } from './components/profile/profile.component';
import { AboutUsComponent } from './components/about-us/about-us.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { TermsComponent } from './components/terms/terms.component';
import { CharityDetailComponent } from './components/charity-detail/charity-detail.component';
import { ErrorPageComponent } from './components/error-page/error-page.component';
import { NotFoundPageComponent } from './components/not-found-page/not-found-page.component';
import { authGuard, roleGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'customer-signup', component: CustomerSignupComponent },
  { path: 'charity-signup', component: CharitySignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'dashboard/customer', component: CustomerDashboardComponent, canActivate: [roleGuard(['Customer'])] },
  { path: 'dashboard/charity', component: CharityDashboardComponent, canActivate: [roleGuard(['CharityManager'])] },
  { path: 'dashboard/admin', component: AdminDashboardComponent, canActivate: [roleGuard(['Admin'])] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'about', component: AboutUsComponent },
  { path: 'privacy', component: PrivacyPolicyComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'impact', component: ImpactComponent },
  { path: 'blogs', component: BlogsComponent },
  { path: 'charity/:id', component: CharityDetailComponent },
  { path: 'payment-success', component: PaymentSuccessComponent, canActivate: [authGuard] },
  { path: 'error', component: ErrorPageComponent },
  { path: '**', component: NotFoundPageComponent }
];
