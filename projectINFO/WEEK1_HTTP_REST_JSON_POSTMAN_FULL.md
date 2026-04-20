# Week 1 Master Guide
## HTTP, REST, JSON, Status Codes, Request/Response Flow, Postman

## 1) Week Objective
By the end of Week 1, you should be able to:
- Explain full request lifecycle from UI to DB and back.
- Design and test REST APIs correctly.
- Use proper HTTP methods and status codes.
- Create valid JSON payloads and read error responses.
- Use Postman professionally for manual API testing.

---

## 2) Big Picture (Real Full-Stack Flow)
When a user clicks a button in frontend:
1. Frontend sends HTTP request to API endpoint.
2. Backend validates request and applies business rules.
3. Backend reads/writes data in database.
4. Backend returns structured response with status code.
5. Frontend displays success/error message.

This is the core flow in almost every real-world web app.

---

## 3) Core Concepts with Explanation

### 3.1 HTTP Basics
HTTP is the communication protocol between client and server.

A request includes:
- URL (where to send)
- Method (what action)
- Headers (metadata)
- Body (data sent by client, usually JSON)

A response includes:
- Status code (result category)
- Headers
- Body (result data or error details)

### 3.2 REST Basics
REST is a style for designing APIs around resources.

Resource examples:
- users
- charities
- donations
- notifications

REST principles you should follow:
- Use nouns in endpoint paths.
- Use proper HTTP methods.
- Keep APIs stateless (each request has all needed context).
- Return consistent response structures.

Good examples:
- GET /api/donations
- POST /api/donations
- GET /api/donations/{id}
- PATCH /api/charities/{id}/status

### 3.3 JSON Basics
JSON is the most common format for API request/response payloads.

Rules:
- Keys are strings.
- Values can be string, number, boolean, null, object, array.
- Use valid quotes and commas.

Example request body:
{
  "email": "test@example.com",
  "password": "Password@123"
}

Example response body:
{
  "success": true,
  "message": "Login successful",
  "token": "<jwt-token>"
}

### 3.4 Status Codes (Interview-Important)
Use status codes to communicate result clearly.

Success:
- 200 OK -> Request succeeded (general success)
- 201 Created -> New resource created
- 204 No Content -> Success but no response body

Client errors:
- 400 Bad Request -> Invalid input or malformed request
- 401 Unauthorized -> Missing/invalid authentication
- 403 Forbidden -> Authenticated but not allowed
- 404 Not Found -> Resource does not exist
- 409 Conflict -> Duplicate/conflicting state
- 422 Unprocessable Entity -> Validation failed (if used)

Server errors:
- 500 Internal Server Error -> Unexpected backend failure

### 3.5 Request vs Response Flow
Think of every API call as a contract:
- Frontend promises correct method/URL/body/token.
- Backend promises validation/rules/data access/clear response.

If contract breaks, use proper status + clear error body.

---

## 4) Week 1 Day-by-Day Plan (Detailed)

## Day 1: Understand End-to-End Flow
### Theory
- What is client/server architecture?
- How frontend, backend, DB interact.
- What stateless request means.

### Practical (CareFund context)
Take one real flow: Customer Signup.
Map:
- Angular form -> service -> API call
- Backend controller -> service -> DbContext
- DB save -> response -> frontend UI

### Deliverable
- Draw one flow diagram.
- Write 10 lines: “How signup works in my app”.

### Postman
- Create collection: CareFund APIs.
- Add signup request and test with valid payload.

---

## Day 2: Methods + REST Endpoints
### Theory
- GET read, POST create, PUT full update, PATCH partial update, DELETE remove.
- Endpoint naming with resources.

### Practical
- Audit your backend endpoints.
- For each endpoint note method + purpose + REST quality.
- Identify at least 3 endpoint naming improvements (document first).

### Deliverable
- Endpoint catalog table ready.

### Postman
- Execute one call each for GET/POST/PUT(or PATCH)/DELETE.

---

## Day 3: JSON Contracts + DTO Thinking
### Theory
- DTO vs Entity.
- Why API should return DTOs (security + stability).
- Required vs optional fields.

### Practical
Pick 3 flows:
- Signup
- Login
- Donation create

For each write:
- request shape
- response shape
- required fields
- validation constraints

### Deliverable
- JSON contract notes for 3 APIs.

### Postman
Test:
- valid payload
- missing field
- wrong data type
- extra field

Record responses.

---

## Day 4: Status Codes + Error Design
### Theory
- Strong understanding of 2xx, 4xx, 5xx groups.
- 401 vs 403 (very common interview question).

### Practical
For 5 endpoints define:
- success status code
- possible error statuses
- reason for each status

Trigger failures intentionally:
- invalid payload
- unauthorized token
- invalid ID
- duplicate action

### Deliverable
- Error scenario sheet with expected codes.

### Postman
Create folder: Negative Tests.
Save failing cases with notes.

---

## Day 5: Headers, Params, Query, Body, JWT
### Theory
Request anatomy:
- Path param: /users/{id}
- Query param: /donations?page=1
- Header: Authorization, Content-Type
- Body: JSON payload

### Practical
Find real endpoints in your project for each request part.
Document one example each.

### Deliverable
- “Request anatomy” note with real API examples.

### Postman
- Add environment variable: baseUrl
- Perform login and capture token
- Use token in protected endpoint calls

---

## Day 6: Postman Professional Setup
### Theory
- Collections
- Environments
- Variables
- Basic tests/assertions

### Practical
Create structured collection:
- Auth
- Charities
- Donations
- Admin

Add 5 assertions (examples):
- status is expected
- response contains key field
- token exists after login
- array response is not empty
- message text contains expected phrase

### Deliverable
- Reusable Postman collection for quick regression checks.

---

## Day 7: Revision + Interview Simulation
### Revision
Create 1-page cheat sheet:
- methods
- status code map
- JSON rules
- request anatomy
- Postman workflow

### Mock interview
Practice answers:
1. What is REST API?
2. POST vs PUT vs PATCH?
3. 401 vs 403?
4. Describe full request lifecycle.
5. How do you test backend without frontend?

### Practical
Run your top 10 Postman requests and verify all pass.

### Deliverable
- You can explain and demo core API concepts confidently.

---

## 5) Must-Know Interview Explanations

### Q1: What makes an API RESTful?
Expected answer:
- Resource-oriented URLs
- Proper HTTP methods
- Stateless communication
- Standard status codes
- Consistent representations (usually JSON)

### Q2: Why stateless APIs?
Expected answer:
- Easier scaling
- Better reliability
- Each request is independent
- Simpler load balancing

### Q3: Difference between 401 and 403?
Expected answer:
- 401: user is not authenticated (missing/invalid token)
- 403: user is authenticated but lacks permission

### Q4: Why DTOs?
Expected answer:
- Prevent exposing internal DB structure
- Control output fields
- Add backward compatibility and safer evolution

---

## 6) Postman Basics You Must Master

## 6.1 Collection Structure
- CareFund API
  - Auth
  - Users/Customers
  - Charities
  - Donations
  - Admin

## 6.2 Environments
Use variables:
- baseUrl
- authToken
- customerId
- charityId

## 6.3 Testing Workflow
1. Login request runs first.
2. Save token.
3. Use token in protected requests.
4. Validate status and response fields.

## 6.4 What to test every endpoint for
- Happy path (valid request)
- Validation failure
- Unauthorized request
- Forbidden access (wrong role)
- Not found case

---

## 7) Common Real-World Mistakes (Avoid)
- Using POST for all operations.
- Returning 200 for failures.
- Sending unclear error messages.
- No validation for incoming JSON.
- Exposing full entity instead of DTO.
- Hardcoding URLs and tokens in Postman.
- Only testing happy paths.

---

## 8) Daily Progress Log Template
Use this daily in your notes.

Date:
Topic covered:
What I practiced:
What I understood well:
What confused me:
How I debugged/fixed:
Interview question practiced:
Plan for tomorrow:

---

## 9) End-of-Week Checklist
Mark complete only if all true:
- I can explain frontend -> backend -> DB -> frontend flow with one real project example.
- I can choose correct HTTP method for CRUD and non-CRUD actions.
- I can choose appropriate status code for common success and error scenarios.
- I can create valid JSON payloads and identify invalid ones.
- I can test APIs in Postman with env variables and auth token.
- I can answer key interview questions without memorized scripts.

---

## 10) Week 1 Final Assignment
Create one mini API document for Customer Signup + Login:
- endpoint + method
- request body with field meanings
- success response sample
- error response samples
- status code mapping
- auth requirement

If you can do this clearly, Week 1 is complete.

---

## 11) What Next After Week 1
Week 2 focus:
- .NET backend architecture
- Controllers, Services, DTOs
- Validation and error handling strategy
- Clean layering and maintainable API design
