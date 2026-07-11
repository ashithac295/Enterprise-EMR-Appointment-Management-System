
# Enterprise EMR Appointment Management System

This is a production-ready, full-stack Electronic Medical Record (EMR) Appointment Management module built with
a **Node.js, Express, React, and Firestore (MERN NoSQL Equivalent)** stack. The system implements secure JWT 
role-based access controls, dynamic slot generation, atomic double-booking prevention, and real-time schedule 
synchronizations via WebSockets.


## 1. Project Overview

Three roles share one appointment scheduler:

- **Super Admin** — creates Doctors & Receptionists, configures doctor
  schedules, views all appointments and audit logs.
- **Receptionist** — searches patients, books/updates appointments, marks
  patients as arrived.
- **Doctor** — views only their own appointments and updates consultation
  notes.

## 2. Folder Structure

```
backend/
├── src/
│   ├── config/          # env loading, MongoDB connection
│   ├── models/           # Mongoose schemas (User, Patient, Appointment, ...)
│   ├── middlewares/       # auth (JWT), RBAC, validation, centralized error handler
│   ├── validators/        # express-validator chains per resource
│   ├── services/          # business logic (booking, slot generation, auth, ...)
│   ├── controllers/       # thin HTTP layer - parse req, call service, send response
│   ├── routes/            # Express routers, one per resource + aggregator
│   ├── sockets/           # Socket.IO setup + broadcast helper
│   ├── seed/               # idempotent seed script for default accounts
│   ├── utils/              # ApiError, ApiResponse, asyncHandler, time/id helpers
│   ├── app.ts              # Express app (middleware pipeline, routes)
│   └── server.ts           # HTTP + Socket.IO bootstrap, graceful shutdown
├── .env.example
├── package.json
└── tsconfig.json
```
frontend
── server.ts                    # Full-Stack Express and Socket.IO entry point
├── vite.config.ts               # Vite bundler configurations
├── metadata.json                # Project metadata definitions
├── package.json                 # Dependency definitions and dev scripts
├── ENGINEERING_DECISIONS.md     # In-depth architectural decisions
├── src/
│   ├── App.tsx                  # Main visual application shell & state coordinator
│   ├── main.tsx                 # Client bootstrapping script
│   ├── index.css                # Global CSS styling and tailwind theme setup
│   ├── types.ts                 # Shared system types and models
│   ├── lib/
│   │   ├── api.ts               # Modular Fetch API wrapper with auto-token refresh
│   │   └── authContext.tsx      # Application Authentication Context
│   └── components/
│       ├── Login.tsx            # Visual Login interface
│       ├── AppointmentScheduler.ts  # Visual Slot booking and calendar component
│       ├── AppointmentList.tsx  # Interactive schedules table with filters & pagination
│       ├── DoctorSchedules.tsx  # Shift and doctor onboarding panel (Super Admin)
│       └── AuditLogs.tsx        # Security trace panel (Super Admin)
```

## 3. Architecture Overview

- **Layered architecture**: routes → validators → controllers → services →
  models. Each layer has one responsibility, which keeps the codebase
  navigable and makes it straightforward to unit-test services in isolation
  from Express.
- **Centralized error handling**: every service throws `ApiError` (or lets
  Mongoose errors propagate); a single `errorHandler` middleware normalizes
  all of it into the required `{ success, message, data }` envelope and
  never leaks stack traces in production.
- **Consistent API responses**: `sendSuccess()` enforces the same envelope
  shape on every success response, including optional `meta` for pagination.
- **Real-time updates**: Socket.IO is attached to the same HTTP server as
  Express; the appointment service broadcasts `appointment_updated` events
  after create/update/cancel so connected scheduler views update live.

## 4. Database Design

### Collections

| Collection         | Purpose                                              |
|---------------------|-------------------------------------------------------|
| `users`             | Super Admins, Receptionists, Doctors (single collection, discriminated by `role`) |
| `doctorschedules`   | One document per doctor: working days, sessions, slot duration, breaks |
| `patients`          | Patient demographic records                          |
| `appointments`      | Booking records, linked to patient + doctor           |
| `refreshtokens`     | Active refresh tokens (TTL-indexed, auto-expires)      |
| `auditlogs`         | Immutable audit trail of sensitive actions             |

### Relationships

```
User (role=Doctor) 1 ── 1 DoctorSchedule
User (role=Doctor) 1 ── * Appointment (doctorId)
Patient            1 ── * Appointment (patientId)
User               1 ── * AuditLog   (userId)
User               1 ── * RefreshToken (userId)
```

Appointments reference `doctorId`/`patientId` via ObjectId, but **denormalize**
`doctorName`, `patientName`, and `patientMobile` onto the appointment
document itself. This is a deliberate trade-off: appointment history should
reflect who was booked *at the time*, and it lets list/search/sort run as a
single query against `appointments` without a `$lookup` join on every page
load — appointments are read far more often than doctor/patient names change.

### Indexes & Why

| Index | Reason |
|---|---|
| `appointments: { doctorId: 1, date: 1, time: 1 }` (unique, partial on non-cancelled status) | **Double-booking prevention** — see Engineering Decisions |
| `appointments: { doctorId: 1, date: 1 }` | Fast slot-generation lookups (booked times for a doctor/day) |
| `appointments: { date: 1, status: 1 }` | Fast date-range + status filtering in the list endpoint |
| `appointments: { patientName, doctorName, patientMobile }` (text) | Supports combined search |
| `users: { email: 1 }` (unique) | Login lookups, enforce unique accounts |
| `users: { role: 1 }` | Fast "list all Doctors" query |
| `doctorschedules: { doctorId: 1 }` (unique) | One schedule per doctor, O(1) lookup |
| `patients: { mobile: 1 }` | Fast "existing patient" search by mobile |
| `refreshtokens: { expiresAt: 1 }` (TTL) | Automatic cleanup of expired sessions |

### Sample Documents

```json
// users
{
  "_id": "665f1...",
  "email": "doctor@emr.com",
  "name": "Dr. Gregory House",
  "role": "Doctor",
  "doctorInfo": { "specialty": "Infectious Diseases", "department": "Internal Medicine" }
}

// appointments
{
  "_id": "665f2...",
  "patientId": "665f3...",
  "patientName": "John Smith",
  "patientMobile": "9876543210",
  "patientType": "New",
  "doctorId": "665f1...",
  "doctorName": "Dr. Gregory House",
  "department": "Internal Medicine",
  "date": "2026-07-15",
  "time": "09:15",
  "duration": 15,
  "purpose": "Follow-up consultation",
  "status": "Scheduled",
  "bookedBy": { "userId": "665f4...", "name": "Jane Doe", "role": "Receptionist" }
}
```

## 5. API Documentation

All responses follow:

```json
{ "success": true, "message": "...", "data": {}, "meta": {} }
```

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Returns access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Public (valid refresh token) | Issues new access token |
| POST | `/api/v1/auth/logout` | Public (valid refresh token) | Invalidates refresh token |

### Doctors & Staff

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/doctors` | Authenticated | List all doctors |
| POST | `/api/v1/admin/doctors` | Super Admin | Create a doctor account |
| POST | `/api/v1/admin/receptionists` | Super Admin | Create a receptionist account |

### Schedules

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/admin/schedules/:doctorId` | Authenticated | Get a doctor's schedule |
| POST | `/api/v1/admin/schedules` | Super Admin | Create/update a doctor's schedule |

### Slots

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/slots?doctorId=&date=` | Authenticated | Dynamically generated slots for a doctor/day |

### Appointments

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/v1/appointments` | Super Admin, Receptionist | Book an appointment |
| GET | `/api/v1/appointments?search=&department=&status=&startDate=&endDate=&sortBy=&sortOrder=&page=&limit=` | Authenticated (Doctors see only their own) | Search/filter/paginate appointments |
| PUT | `/api/v1/appointments/:id` | Authenticated (Doctors: own only) | Update purpose/notes/status |
| DELETE | `/api/v1/appointments/:id` | Super Admin, Receptionist | Cancel an appointment |
| POST | `/api/v1/appointments/:id/arrive` | Super Admin, Receptionist | Mark patient as arrived |

### Patients

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/patients?search=` | Authenticated | Search patients by name/mobile/ID |

### Audit Logs

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/audit-logs?page=&limit=` | Super Admin | Paginated audit trail |

### Real-time events (Socket.IO)

Client subscribes to `appointment_updated`:
```json
{ "action": "CREATED" | "UPDATED" | "CANCELLED", "appointment": { ... } }
```

## 6. Environment Variables

See `.env.example`:

| Variable | Description |
|---|---|
| `NODE_ENV` | `development` \| `production` |
| `PORT` | HTTP port |
| `CLIENT_ORIGIN` | Allowed CORS origin (frontend URL) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets (set strong random values in production) |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Used only by `npm run seed` |

## 7. Installation & Running

```bash
cd emr-backend
npm install
cp .env.example .env      # then fill in real secrets / Mongo URI

# Populate default Super Admin / Receptionist / Doctor accounts
npm run seed

# Development (auto-reload)
npm run dev

# Production
npm run build
npm start
```

Requires a running MongoDB instance. The unique partial index used for
double-booking prevention works on a standalone MongoDB server — no replica
set is required for this project's scope.

## 8. Assumptions Made

- Single-clinic deployment (Socket.IO broadcasts to all connected clients;
  see ENGINEERING_DECISIONS.md for the multi-tenant scaling path).
- Server-local time is authoritative for "past date/time" checks (no
  per-user timezone handling in this scope).
- Departments are derived from `doctorInfo.department` rather than a
  separate `departments` collection, since the assessment doesn't call for
  independent department management.
- Receptionist accounts are created via `POST /api/v1/admin/receptionists`
  (not explicitly listed in "Required API Endpoints" but required by the
  RBAC section, which states Super Admin can "Create Receptionists").

## 9. Known Limitations

- No automated test suite included given the assessment's time-box; service
  functions are structured to be unit-testable (pure business logic,
  minimal Express coupling).
- No file/document upload support for patient records (out of scope).
- Socket.IO broadcasts globally rather than to per-doctor/department rooms.
- Rate limiting / brute-force login protection is not implemented (noted as
  a production follow-up).

## 10. Future Improvements

- Add `express-rate-limit` on `/auth/login`.
- Move to Redis-backed refresh-token storage for horizontal scaling.
- Socket.IO rooms per clinic/department to reduce broadcast fan-out.
- Automated tests (Jest + Supertest) covering the booking/concurrency path.
- OpenAPI/Swagger spec generation from the validators.
- Advanced patient portal login for patients to cancel their own appointments.
