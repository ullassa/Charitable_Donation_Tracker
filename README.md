# CareFund

CareFund is a multi-role charitable giving platform with an admin approval workflow, dashboards, notifications, and CSV reporting. The solution includes an ASP.NET Core backend (net8.0) and an Angular frontend (Angular CLI 19.2.23).

## Highlights
- Role-based authentication for Customer, CharityManager, and Admin.
- Charity registration lifecycle with admin approval (Pending/Approved/Rejected).
- Admin, Customer, and Charity dashboards with KPIs and recent activity.
- Donations with payment records and automated notifications.
- Public charity search and cause filtering.
- OTP-based password reset.

## Tech Stack
- Backend: ASP.NET Core Web API, EF Core, JWT auth, SQL Server
- Frontend: Angular 19, TypeScript, RxJS, Angular CLI

## Project Structure
- backend/ - ASP.NET Core Web API
- frontend/ - Angular app
- projectINFO/ - learning materials and design notes
- SUMMARY.MD - high-level project summary
- SETUP_GUIDE.md - full setup instructions
- FEATURES_SUMMARY.md - feature details

## Quick Start
1) Configure database connection
- Update backend/appsettings.Development.json

2) Apply migrations
- From backend/: dotnet ef database update

3) Run backend
- From backend/: dotnet run
- API: http://localhost:5292

4) Run frontend
- From frontend/: npm install
- From frontend/: ng serve
- App: http://localhost:4200

## Default Admin (Dev)
- Email: admin@carefund.com
- Password: Admin@123

## Core API Endpoints
Authentication
- POST /api/auth/register-customer
- POST /api/auth/register-charity
- POST /api/auth/login
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

Admin
- GET /api/admin/dashboard
- GET /api/admin/charity-requests
- PUT /api/admin/charity-requests/{id}/review

Public
- GET /api/charities/public?keyword=...&cause=...

Dashboards and Reports
- GET /api/dashboard/customer
- GET /api/dashboard/customer/report?from=...&to=...
- GET /api/dashboard/charity
- GET /api/dashboard/charity/report?from=...&to=...

Donations and Notifications
- POST /api/donations
- GET /api/notifications/mine

## Documentation
- SETUP_GUIDE.md - detailed setup and troubleshooting
- FEATURES_SUMMARY.md - full feature list
- QUICK_REFERENCE.md - usage tips and shortcuts
- FIRST_STEPS.md - step-by-step testing checklist


