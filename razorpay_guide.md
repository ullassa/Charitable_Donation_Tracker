# <span class="material-symbols-outlined">payments</span> Razorpay Guide for CareFund

## <span class="material-symbols-outlined">info</span> Purpose
This document explains how Razorpay is integrated in CareFund, what was causing the test-mode payment failures, and how to test the payment flow correctly.

## <span class="material-symbols-outlined">task_alt</span> Summary of the Fix
The Razorpay flow was failing in test mode because of a few issues in the frontend and backend integration:

1. Razorpay test mode was configured but not fully enabled in the backend response.
2. The frontend blocked UPI on desktop, which prevented the Razorpay checkout flow from being reached in some cases.
3. The donation amount sent to Razorpay did not match the payable total shown in the UI.
4. The frontend relied on Razorpay checkout being opened only after order creation, so any mismatch caused the payment to fail.

## <span class="material-symbols-outlined">fact_check</span> What Was Verified
The following parts were checked and confirmed:

- Razorpay config is loaded from backend `.env`
- Backend endpoint `/api/gateway/razorpay-config` returns Razorpay settings/gateway/razorpay-config` returns Razorpay settings
- Razorpay order creation works against the Razorpay test API
- Frontend loads Razorpay checkout script dynamically- Frontend loads Razorpay checkout script dynamically
- Frontend calls `razorpay.open()` to launch the modalopen()` to launch the modal
- Payment finalization endpoint verifies signature and creates the donation recordion endpoint verifies signature and creates the donation record

## <span class="material-symbols-outlined">settings</span> Backend Configuration
The backend reads Razorpay settings from the `.env` file using environment variables.ay settings from the `.env` file using environment variables.

### <span class="material-symbols-outlined">key</span> Important Razorpay keys### Important Razorpay keys
- `Razorpay__KeyId`
- `Razorpay__KeySecret`ecret`
- `Razorpay__Mode`
- `Razorpay__Currency`
- `Razorpay__MerchantName`- `Razorpay__MerchantName`
- `Razorpay__Description`Description`
- `Razorpay__Enabled`

### <span class="material-symbols-outlined">lightbulb</span> Notes
- `Razorpay__Enabled=true` must be present for the frontend to treat Razorpay as active.- `Razorpay__Enabled=true` must be present for the frontend to treat Razorpay as active.
- `Razorpay__Mode=test` keeps the integration in test mode.zorpay__Mode=test` keeps the integration in test mode.
- The backend uses the Razorpay secret key to create and verify payment signatures.

## <span class="material-symbols-outlined">code</span> Backend Razorpay Flow
The main Razorpay controller is:The main Razorpay controller is:

- [backend/Controllers/GatewayController.cs](backend/Controllers/GatewayController.cs)ontrollers/GatewayController.cs)

### <span class="material-symbols-outlined">dns</span> Key endpoints
#### 1. Razorpay config#### 1. Razorpay config
`GET /api/gateway/razorpay-config`

This returns:
- whether Razorpay is enabledenabled
- the key id
- the mode
- currency
- merchant name
- description

#### 2. Create order
`POST /api/gateway/create-order``POST /api/gateway/create-order`

This:This:
- checks the logged-in customer
- creates a pending payment record
- creates a Razorpay order using Razorpay API- creates a Razorpay order using Razorpay API
- stores the Razorpay order id in the payment notespay order id in the payment notes
- returns `orderId` and `paymentId`

#### 3. Finalize payment
`POST /api/gateway/finalize`y/finalize`

This:
- verifies the Razorpay signature using the secret key
- updates payment status to completed- updates payment status to completed
- creates the donation record
- sends notifications
- writes audit logs- writes audit logs

## <span class="material-symbols-outlined">web</span> Frontend Razorpay Flow
The donation page is implemented in:ted in:

- [frontend/src/app/components/donate/donate.component.ts](frontend/src/app/components/donate/donate.component.ts)- [frontend/src/app/components/donate/donate.component.ts](frontend/src/app/components/donate/donate.component.ts)
- [frontend/src/app/components/donate/donate.component.html](frontend/src/app/components/donate/donate.component.html)ts/donate/donate.component.html)

### <span class="material-symbols-outlined">touch_app</span> Flow in the donate screen### Flow in the donate screen
1. User selects a charity
2. User chooses amount
3. User selects payment methodects payment method
4. User clicks **Pay Now**
5. Frontend calls backend Razorpay config endpointendpoint
6. Frontend creates Razorpay order on backend
7. Frontend loads Razorpay checkout scripty checkout script
8. Frontend opens Razorpay modal
9. On success, the payment is finalized by calling backend9. On success, the payment is finalized by calling backend

## <span class="material-symbols-outlined">build_circle</span> Important Frontend Fixes

### <span class="material-symbols-outlined">block</span> 1. UPI was blocked on desktop desktop
The original frontend logic prevented UPI selection on desktop and stopped the payment flow before reaching Razorpay.before reaching Razorpay.

This was fixed by:
- removing the desktop-only UPI block
- allowing UPI to be selected in the UI
- letting Razorpay checkout open normallyout open normally

### <span class="material-symbols-outlined">currency_rupee</span> 2. Amount mismatch### 2. Amount mismatch
The checkout UI showed:
- donation amount
- platform fee
- total payable amount

But the Razorpay order was originally created using only the donation amount.ly created using only the donation amount.

This was fixed by making the Razorpay order use the same payable total shown in the UI.se the same payable total shown in the UI.

### <span class="material-symbols-outlined">open_in_new</span> 3. Payment modal flow
The Razorpay checkout modal is opened here:

- `const razorpay = new (window as any).Razorpay(options);` as any).Razorpay(options);`
- `razorpay.open();`

If the modal does not appear, then one of these is usually wrong:s not appear, then one of these is usually wrong:
- Razorpay config is disabled is disabled
- order creation fails
- checkout script fails to load
- browser blocks the script
- amount or payload mismatch causes the flow to stopcauses the flow to stop

## <span class="material-symbols-outlined">play_circle</span> How to Test Razorpay Test Mode

### <span class="material-symbols-outlined">rocket_launch</span> Step 1: Start the app
Make sure both backend and frontend are running.running.

### <span class="material-symbols-outlined">open_in_browser</span> Step 2: Open the donate page
Go to:Go to:
- `/donate`

### <span class="material-symbols-outlined">volunteer_activism</span> Step 3: Select a charity
Click any charity from the available list.

### <span class="material-symbols-outlined">payments</span> Step 4: Choose amountount
Select a preset amount or enter a custom amount.

### <span class="material-symbols-outlined">credit_card</span> Step 5: Choose payment method
Use **Card** for the easiest test.Use **Card** for the easiest test.

### <span class="material-symbols-outlined">mouse</span> Step 6: Click Pay Now
This should open the Razorpay test modal.This should open the Razorpay test modal.

### <span class="material-symbols-outlined">badge</span> Step 7: Use Razorpay test card detailsazorpay test card details
You can try the standard test card details:
- Card Number: `4111 1111 1111 1111` 1111`
- Expiry: any future datey future date
- CVV: any 3 digits
- Name: any name

## <span class="material-symbols-outlined">check_circle</span> Expected Success Path## Expected Success Path
If everything is working correctly: correctly:

1. Razorpay checkout modal opens
2. Test payment is submitted2. Test payment is submitted
3. Razorpay returns payment id, order id, and signature
4. Frontend calls finalize endpoint4. Frontend calls finalize endpoint
5. Backend verifies signaturerifies signature
6. Payment status becomes completed
7. Donation record is created7. Donation record is created






















































































The main integration logic is present and Razorpay test mode is now enabled in the project. If payments still fail, the next step is to inspect the browser network requests and the exact Razorpay error response from the modal.## <span class="material-symbols-outlined">note</span> Final NoteThat is the most stable path for checking whether Razorpay test mode opens and completes successfully.For testing, use the **Card** payment method first.## <span class="material-symbols-outlined">recommend</span> Recommendation- [ ] Network tab shows successful create-order and finalize requests- [ ] Browser console shows no JavaScript errors- [ ] Order id returned is a real Razorpay order id- [ ] Razorpay checkout script loads successfully- [ ] Donation amount is greater than zero- [ ] Selected charity is valid- [ ] Token exists in sessionStorage- [ ] Customer is logged in- [ ] Razorpay config endpoint returns enabled true- [ ] Frontend is running- [ ] Backend is runningIf Razorpay test mode still fails, check this list:## <span class="material-symbols-outlined">checklist</span> Troubleshooting Checklist- [frontend/src/app/auth-state.service.ts](frontend/src/app/auth-state.service.ts)- [frontend/src/app/services/api.service.ts](frontend/src/app/services/api.service.ts)- [frontend/src/app/components/donate/donate.component.html](frontend/src/app/components/donate/donate.component.html)- [frontend/src/app/components/donate/donate.component.ts](frontend/src/app/components/donate/donate.component.ts)### <span class="material-symbols-outlined">devices</span> Frontend- [backend/Services/Jwt/JwtService.cs](backend/Services/Jwt/JwtService.cs)- [backend/Program.cs](backend/Program.cs)- [backend/Controllers/GatewayController.cs](backend/Controllers/GatewayController.cs)- [backend/.env](backend/.env)### <span class="material-symbols-outlined">storage</span> Backend## <span class="material-symbols-outlined">folder</span> Files Involved- Backend accepts authenticated customer requests- JWT role claim is generated as customer/admin/charitymanager- Backend config endpoint returns enabled Razorpay- Razorpay test API can create an order successfullyThe following were confirmed:## <span class="material-symbols-outlined">shield_check</span> Backend Validation ChecksIf the token is missing or the role is not customer, the request will be rejected.- customer role token- logged-in customerThe create order and finalize endpoints require:### <span class="material-symbols-outlined">account_circle</span> 5. Role and loginIf the signature does not match, the finalize request fails.- `Razorpay__KeySecret`The backend verifies the Razorpay signature using:### <span class="material-symbols-outlined">verified</span> 4. Signature verificationIf this fails to load, the modal cannot open.- `https://checkout.razorpay.com/v1/checkout.js`Razorpay checkout script is loaded from:### <span class="material-symbols-outlined">javascript</span> 3. Browser checkout scriptthen Razorpay order creation failed and the payment will not verify correctly.- `order_mock_...`If it returns something like:- `order_...`The backend should return a real Razorpay order id like:### <span class="material-symbols-outlined">receipt_long</span> 2. Razorpay order creation- valid `keyId`- `enabled: true`- `success: true`Expected result:- `GET /api/gateway/razorpay-config`Call:### <span class="material-symbols-outlined">api</span> 1. Razorpay config endpointIf payment still fails, check the following:## <span class="material-symbols-outlined">error</span> Expected Failure Points8. User is redirected to payment success page8. User is redirected to payment success page

## Expected Failure Points
If payment still fails, check the following:

### 1. Razorpay config endpoint
Call:
- `GET /api/gateway/razorpay-config`

Expected result:
- `success: true`
- `enabled: true`
- valid `keyId`

### 2. Razorpay order creation
The backend should return a real Razorpay order id like:
- `order_...`

If it returns something like:
- `order_mock_...`

then Razorpay order creation failed and the payment will not verify correctly.

### 3. Browser checkout script
Razorpay checkout script is loaded from:
- `https://checkout.razorpay.com/v1/checkout.js`

If this fails to load, the modal cannot open.

### 4. Signature verification
The backend verifies the Razorpay signature using:
- `Razorpay__KeySecret`

If the signature does not match, the finalize request fails.

### 5. Role and login
The create order and finalize endpoints require:
- logged-in customer
- customer role token

If the token is missing or the role is not customer, the request will be rejected.

## Backend Validation Checks
The following were confirmed:

- Razorpay test API can create an order successfully
- Backend config endpoint returns enabled Razorpay
- JWT role claim is generated as customer/admin/charitymanager
- Backend accepts authenticated customer requests

## Files Involved
### Backend
- [backend/.env](backend/.env)
- [backend/Controllers/GatewayController.cs](backend/Controllers/GatewayController.cs)
- [backend/Program.cs](backend/Program.cs)
- [backend/Services/Jwt/JwtService.cs](backend/Services/Jwt/JwtService.cs)

### Frontend
- [frontend/src/app/components/donate/donate.component.ts](frontend/src/app/components/donate/donate.component.ts)
- [frontend/src/app/components/donate/donate.component.html](frontend/src/app/components/donate/donate.component.html)
- [frontend/src/app/services/api.service.ts](frontend/src/app/services/api.service.ts)
- [frontend/src/app/auth-state.service.ts](frontend/src/app/auth-state.service.ts)

## Troubleshooting Checklist
If Razorpay test mode still fails, check this list:

- [ ] Backend is running
- [ ] Frontend is running
- [ ] Razorpay config endpoint returns enabled true
- [ ] Customer is logged in
- [ ] Token exists in sessionStorage
- [ ] Selected charity is valid
- [ ] Donation amount is greater than zero
- [ ] Razorpay checkout script loads successfully
- [ ] Order id returned is a real Razorpay order id
- [ ] Browser console shows no JavaScript errors
- [ ] Network tab shows successful create-order and finalize requests

## Recommendation
For testing, use the **Card** payment method first.

That is the most stable path for checking whether Razorpay test mode opens and completes successfully.

## Final Note
The main integration logic is present and Razorpay test mode is now enabled in the project. If payments still fail, the next step is to inspect the browser network requests and the exact Razorpay error response from the modal.
