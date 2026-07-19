# Flash Sale Reservation Engine - Backend SRS

**Version:** 1.0  
**Architecture:** Production Ready  
**Framework:** NestJS  
**Database:** MongoDB + Mongoose  
**Authentication:** Better Auth + JWT + Guest Authentication  
**API Documentation:** Swagger (OpenAPI)

---

# 1. Project Overview

## Project Name

Flash Sale Reservation Engine

## Description

Build a production-ready backend for a Flash Sale reservation system where only **50 items** are available.

Users can reserve an item for **5 minutes**. If payment is completed within the reservation period, the item becomes permanently sold. Otherwise, the reservation automatically expires and the item becomes available again.

The system must handle high concurrency, prevent race conditions, and ensure that overbooking never occurs.

---

# 2. Objectives

- Prevent overbooking
- Handle thousands of concurrent requests safely
- Temporary reservation system
- Automatic reservation expiration
- Guest & Registered User support
- Secure Authentication
- Fully documented REST APIs
- Production-ready architecture

---

# 3. Tech Stack

## Backend

- NestJS
- MongoDB
- Mongoose
- Better Auth
- JWT
- Swagger (OpenAPI)
- Class Validator
- Class Transformer
- NestJS Schedule (Cron)
- Helmet
- Compression
- Pino/Winston Logger

---

# 4. Functional Requirements

## Authentication

### Guest User

Guest users should be able to:

- Visit without registration
- Receive a Guest ID automatically
- Receive Guest JWT
- Reserve seats
- Complete mock payment
- View reservation countdown

Guest tracking should include:

- Guest ID
- Device ID
- Browser
- User Agent
- IP Address
- Last Activity
- Reservation History

---

### Registered User

Users should be able to:

- Register
- Login
- Logout
- Refresh Access Token
- Reserve seats
- Complete payment
- View reservation history

---

## Reservation

A user can:

- Reserve only one seat at a time
- Hold reservation for 5 minutes
- Cancel reservation
- Complete payment

---

## Payment

The system should:

- Validate reservation ownership
- Validate reservation expiration
- Confirm payment
- Mark seat as SOLD

---

## Seat Management

Seat status can be:

- AVAILABLE
- LOCKED
- SOLD

---

## Admin

Admin should be able to view:

- Total Seats
- Available Seats
- Locked Seats
- Sold Seats
- Active Reservations
- Expired Reservations
- Payment Statistics

---

## Audit Logging

Track:

- Authentication
- Reservation
- Payment
- Expiration
- Guest Activities
- API Errors
- Security Events

---

# 5. Non Functional Requirements

## Performance

- Handle 1000+ concurrent users
- Average response time below 300ms

## Scalability

- Stateless APIs
- Horizontal Scaling Ready

## Security

- JWT Authentication
- Refresh Token
- HttpOnly Cookies
- Rate Limiting
- Helmet
- Request Validation
- CORS
- Secure Headers

## Reliability

- Zero overbooking
- Crash recovery support
- Automatic reservation recovery

---

# 6. System Architecture

```
Client
    │
    ▼
REST API
    │
    ▼
NestJS Application
    │
    ├── Controllers
    ├── Services
    ├── Repositories
    ├── Guards
    ├── Interceptors
    └── Scheduler
    │
    ▼
MongoDB
```

---

# 7. Project Structure

```
src/

├── auth/
├── guest/
├── users/
├── seats/
├── reservations/
├── payments/
├── scheduler/
├── admin/
├── audit/
├── health/

├── common/
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   ├── middleware/
│   ├── filters/
│   ├── pipes/
│   ├── constants/
│   └── utils/

├── config/
├── database/
├── swagger/

├── app.module.ts
└── main.ts
```

---

# 8. Database Collections

## Users

```text
_id
name
email
password
role
createdAt
updatedAt
```

---

## Guests

```text
_id
guestId
deviceId
fingerprint
ipAddress
userAgent
lastSeen
createdAt
updatedAt
```

---

## Seats

```text
_id
seatNumber
status
lockedBy
reservationId
expiresAt
createdAt
updatedAt
```

Seat Status

```
AVAILABLE
LOCKED
SOLD
```

---

## Reservations

```text
_id
reservationCode
seatId
userId
guestId
status
expiresAt
paidAt
createdAt
updatedAt
```

Reservation Status

```
LOCKED
PAID
EXPIRED
CANCELLED
```

---

## Payments

```text
_id
reservationId
transactionId
status
paidAt
```

---

## Audit Logs

```text
_id
userId
guestId
action
endpoint
ipAddress
device
browser
payload
createdAt
```

---

# 9. Authentication Flow

## Guest Flow

```
Visit Website
        │
        ▼
Guest Cookie Exists?
      │
 ┌────┴─────┐
 │          │
Yes         No
 │          │
 │      Generate UUID
 │          │
 │      Create Guest
 │          │
 │      Issue Guest JWT
 │          │
 └──────────┘
        │
        ▼
Reserve Seat
```

---

## Registered User Flow

```
Register
     │
     ▼
Login
     │
     ▼
Access Token
Refresh Token
     │
     ▼
Reserve Seat
     │
     ▼
Mock Payment
```

---

# 10. Reservation Flow

```
Reserve Request
        │
        ▼
Authentication
        │
        ▼
Has Active Reservation?
        │
        ▼
Find Available Seat
        │
        ▼
Atomic Lock
        │
        ▼
Create Reservation
        │
        ▼
Return Countdown
```

---

# 11. Payment Flow

```
Payment Request
        │
        ▼
Validate Reservation
        │
        ▼
Reservation Expired?
        │
        ▼
MongoDB Transaction
        │
        ▼
Seat → SOLD
Reservation → PAID
Payment → SUCCESS
        │
        ▼
Commit Transaction
```

---

# 12. Reservation Timeout

Never use:

```ts
setTimeout()
```

Instead:

Store expiration time.

```
expiresAt = now + 5 minutes
```

Use Cron Job.

Every 30 seconds:

```
Find expired reservations

↓

Release seat

↓

Reservation expired
```

---

# 13. Race Condition Prevention

Reservation uses MongoDB Atomic Operation.

```
findOneAndUpdate()
```

Filter

```
status = AVAILABLE
```

Update

```
status = LOCKED
```

Only one request succeeds.

---

Payment uses MongoDB Transactions.

```
Start Session

↓

Update Seat

↓

Update Reservation

↓

Create Payment

↓

Commit

↓

Rollback on Failure
```

---

# 14. Database Indexes

## Seats

- status
- expiresAt
- lockedBy

## Reservations

- seatId
- userId
- guestId
- status
- expiresAt

## Guests

- guestId
- deviceId

## Payments

- transactionId

---

# 15. REST API

## Authentication

| Method | Endpoint |
|---------|----------|
| POST | /auth/register |
| POST | /auth/login |
| POST | /auth/logout |
| POST | /auth/refresh |

---

## Guest

| Method | Endpoint |
|---------|----------|
| POST | /guest/init |
| GET | /guest/me |

---

## Seats

| Method | Endpoint |
|---------|----------|
| GET | /seats |
| GET | /seats/statistics |

---

## Reservations

| Method | Endpoint |
|---------|----------|
| POST | /reservations |
| GET | /reservations/me |
| DELETE | /reservations/:id |

---

## Payments

| Method | Endpoint |
|---------|----------|
| POST | /payments/mock |

---

## Admin

| Method | Endpoint |
|---------|----------|
| GET | /admin/dashboard |
| GET | /admin/reservations |
| GET | /admin/users |
| GET | /admin/logs |

---

## Health

| Method | Endpoint |
|---------|----------|
| GET | /health |

---

# 16. Swagger Documentation

Each endpoint should include:

- API Summary
- Description
- Request DTO
- Response DTO
- Validation Rules
- Authentication Type
- Example Requests
- Example Responses
- Error Responses

---

# 17. Logging

The system should log:

- Authentication
- Reservation
- Payment
- Guest Activity
- Cron Jobs
- Errors
- Exceptions
- Security Events

---

# 18. Error Handling

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Seat Already Reserved |
| 410 | Reservation Expired |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

# 19. Production Features

- Modular Architecture
- Repository Pattern
- DTO Validation
- Global Exception Filter
- Global Validation Pipe
- Response Interceptor
- Request Logging
- Rate Limiting
- Helmet Security
- Compression
- CORS
- Environment Configuration
- Swagger Documentation
- MongoDB Transactions
- Atomic Seat Locking
- Cron-based Reservation Expiration
- JWT Authentication
- Better Auth Integration
- Guest Tracking
- Health Check API
- Audit Logging
- Unit Testing Ready
- Integration Testing Ready

---

# 20. Future Enhancements

- Redis Caching
- WebSocket for Live Seat Updates
- Real Payment Gateway Integration
- Email Notifications
- SMS Notifications
- Admin Analytics Dashboard
- Multi-Event Flash Sales
- Queue-based Reservation Processing (BullMQ)
- Distributed Locking with Redis
- Kubernetes Deployment
- CI/CD Pipeline