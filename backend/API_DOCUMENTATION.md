# API Documentation
## Enterprise EMR Appointment Management System — Backend API

**Base URL (local dev):** `http://localhost:5000/api/v1`
**Auth scheme:** `Authorization: Bearer <accessToken>` header on all protected routes.

---

## 1. Response Envelope

Every response — success or error — follows the same shape:

```json
{
  "success": true,
  "message": "Human-readable description",
  "data": {},
  "meta": {}
}
```

- `meta` is only present on paginated endpoints (`page`, `limit`, `total`, `totalPages`).
- On errors, `success` is `false`, `data` is `null`, and `message` describes the problem. No stack traces or internal details are ever included outside development mode.

### Standard HTTP status codes used

| Code | Meaning |
|---|---|
| 200 | Success (read/update) |
| 201 | Resource created |
| 400 | Validation error / bad request |
| 401 | Missing/invalid/expired token |
| 403 | Authenticated but not authorized (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (e.g. double-booking, duplicate email) |
| 500 | Unexpected server error |

---

## 2. Authentication

### `POST /auth/login`
**Access:** Public

Request body:
```json
{ "email": "admin@emr.com", "password": "Admin@12345" }
```

Response `200`:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": "665f1a2b3c4d5e6f7a8b9c0d",
      "email": "admin@emr.com",
      "name": "System Administrator",
      "role": "Super Admin",
      "doctorInfo": null
    }
  }
}
```
Errors: `400` missing fields, `401` invalid credentials.

---

### `POST /auth/refresh`
**Access:** Public (valid refresh token required)

Request body:
```json
{ "refreshToken": "eyJhbGciOi..." }
```

Response `200`:
```json
{ "success": true, "message": "Token refreshed successfully", "data": { "accessToken": "eyJhbGciOi..." } }
```
Errors: `400` missing token, `401` invalid/expired/revoked token.

---

### `POST /auth/logout`
**Access:** Public (invalidates the given refresh token)

Request body:
```json
{ "refreshToken": "eyJhbGciOi..." }
```

Response `200`:
```json
{ "success": true, "message": "Logged out successfully", "data": null }
```

---

## 3. Doctors & Staff

### `GET /doctors`
**Access:** Authenticated (any role)

Returns all active doctors.

Response `200`:
```json
{
  "success": true,
  "message": "Doctors retrieved successfully",
  "data": [
    {
      "id": "665f1a2b3c4d5e6f7a8b9c0e",
      "email": "doctor@emr.com",
      "name": "Dr. Gregory House",
      "role": "Doctor",
      "doctorInfo": { "specialty": "Infectious Diseases", "department": "Internal Medicine" }
    }
  ]
}
```

---

### `POST /admin/doctors`
**Access:** Super Admin only

Request body:
```json
{
  "email": "newdoc@emr.com",
  "password": "StrongPass123",
  "name": "Dr. Jane Foster",
  "specialty": "Cardiology",
  "department": "Cardiology"
}
```

Response `201`: created doctor object. Also auto-creates a default schedule for the doctor.
Errors: `400` validation / duplicate email, `403` if not Super Admin.

---

### `POST /admin/receptionists`
**Access:** Super Admin only

Request body:
```json
{ "email": "recep2@emr.com", "password": "StrongPass123", "name": "John Smith" }
```

Response `201`: created receptionist object.

---

## 4. Doctor Schedules

### `GET /admin/schedules/:doctorId`
**Access:** Authenticated (any role)

Response `200`:
```json
{
  "success": true,
  "message": "Schedule retrieved successfully",
  "data": {
    "doctorId": "665f1a2b3c4d5e6f7a8b9c0e",
    "workingDays": [1, 2, 3, 4, 5],
    "sessions": [
      { "name": "Morning Session", "startTime": "09:00", "endTime": "12:00" },
      { "name": "Evening Session", "startTime": "13:00", "endTime": "17:00" }
    ],
    "slotDuration": 15,
    "breakTimings": [{ "name": "Lunch Break", "startTime": "12:00", "endTime": "13:00" }],
    "updatedAt": "2026-07-01T09:00:00.000Z"
  }
}
```
Errors: `404` no schedule configured for that doctor.

---

### `POST /admin/schedules`
**Access:** Super Admin only

Creates or replaces a doctor's schedule (upsert).

Request body:
```json
{
  "doctorId": "665f1a2b3c4d5e6f7a8b9c0e",
  "workingDays": [1, 2, 3, 4, 5],
  "sessions": [
    { "name": "Morning Session", "startTime": "09:00", "endTime": "12:00" },
    { "name": "Evening Session", "startTime": "13:00", "endTime": "17:00" }
  ],
  "slotDuration": 15,
  "breakTimings": [{ "name": "Lunch Break", "startTime": "12:00", "endTime": "13:00" }]
}
```

Response `200`: the saved schedule. Errors: `400` validation, `404` doctor not found.

---

## 5. Slots

### `GET /slots?doctorId=&date=`
**Access:** Authenticated (any role)

Dynamically generates the day's bookable slots from the doctor's schedule + existing bookings. Nothing is persisted — this is computed on every request.

Query params: `doctorId` (Mongo id, required), `date` (`YYYY-MM-DD`, required).

Response `200`:
```json
{
  "success": true,
  "message": "Slots generated successfully",
  "data": [
    { "time": "09:00", "available": true },
    { "time": "09:15", "available": false, "reason": "Booked" },
    { "time": "12:00", "available": false, "reason": "Past time" }
  ]
}
```
`reason` is one of `"Past date"`, `"Past time"`, `"Booked"` — omitted when `available: true`. Slots that fall inside a configured break are never generated at all. Errors: `404` no schedule for doctor.

---

## 6. Appointments

### `POST /appointments`
**Access:** Super Admin, Receptionist

Books a slot. Prevents double-booking atomically (see Database Schema doc for the mechanism) and prevents past-date bookings.

Request body (existing patient):
```json
{
  "patientType": "Existing",
  "patientId": "665f1a2b3c4d5e6f7a8b9c10",
  "patientName": "John Smith",
  "patientMobile": "9876543210",
  "doctorId": "665f1a2b3c4d5e6f7a8b9c0e",
  "date": "2026-07-15",
  "time": "09:15",
  "purpose": "Follow-up consultation",
  "notes": "Optional notes"
}
```
Request body (new patient) — omit `patientId`, set `patientType: "New"`; a patient record is created automatically. `patientEmail` is optional in both cases.

Response `201`: the created appointment (see schema doc for full shape).
Errors: `400` validation / past date, `404` doctor or patient not found, `409` slot already booked.

---

### `GET /appointments`
**Access:** Authenticated. **Doctors are automatically restricted to their own appointments** regardless of query params sent.

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `search` | string | Matches patient name, doctor name, or mobile |
| `department` | string | Exact match, case-insensitive |
| `status` | string | `Scheduled` \| `Arrived` \| `Completed` \| `Cancelled` |
| `startDate` / `endDate` | `YYYY-MM-DD` | Inclusive date range |
| `sortBy` | string | `date` (default) \| `patientName` \| `doctorName` \| `status` \| `createdAt` |
| `sortOrder` | string | `asc` (default) \| `desc` |
| `page` | integer | Default `1` |
| `limit` | integer | Default `10`, max `100` |

Response `200`:
```json
{
  "success": true,
  "message": "Appointments retrieved successfully",
  "data": [ { "...appointment fields..." } ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

---

### `PUT /appointments/:id`
**Access:** Authenticated. Doctors may only update their own appointments.

Request body (all fields optional, send only what changes):
```json
{ "purpose": "Updated purpose", "notes": "Updated notes", "status": "Arrived" }
```

Status transitions are enforced server-side:
```
Scheduled → Arrived | Cancelled
Arrived   → Completed | Cancelled
Completed → (terminal)
Cancelled → (terminal)
```

Response `200`: updated appointment. Errors: `400` invalid transition, `403` doctor updating another doctor's appointment, `404` not found.

---

### `DELETE /appointments/:id`
**Access:** Super Admin, Receptionist

Cancels (soft-deletes) an appointment — sets `status: "Cancelled"`, which also frees the slot for rebooking.

Response `200`: the cancelled appointment. Errors: `400` already Cancelled/Completed, `404` not found.

---

### `POST /appointments/:id/arrive`
**Access:** Super Admin, Receptionist

Marks a `Scheduled` appointment as `Arrived`.

Response `200`: updated appointment. Errors: `400` if current status isn't `Scheduled`, `404` not found.

---

## 7. Patients

### `GET /patients?search=`
**Access:** Authenticated (any role)

`search` (optional) matches name, mobile, or `publicId` (e.g. `PAT-482913`), case-insensitive. Omit to get the 50 most recently created patients.

Response `200`:
```json
{
  "success": true,
  "message": "Patients retrieved successfully",
  "data": [
    {
      "id": "665f1a2b3c4d5e6f7a8b9c10",
      "publicId": "PAT-482913",
      "name": "John Smith",
      "mobile": "9876543210",
      "email": "john@example.com",
      "createdAt": "2026-06-01T10:00:00.000Z"
    }
  ]
}
```
> Use `id` (not `publicId`) as `patientId` when booking an existing patient via `POST /appointments`.

---

## 8. Audit Logs

### `GET /audit-logs?page=&limit=`
**Access:** Super Admin only

Response `200`:
```json
{
  "success": true,
  "message": "Audit logs retrieved successfully",
  "data": [
    {
      "id": "665f...",
      "userId": "665f1a2b3c4d5e6f7a8b9c0d",
      "userName": "System Administrator",
      "userRole": "Super Admin",
      "action": "Appointment Created",
      "entity": "Appointment: 665f...",
      "timestamp": "2026-07-11T08:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 128, "totalPages": 7 }
}
```
Logged actions: `Login`, `Create Doctor`, `Create Receptionist`, `Configure Schedule`, `Appointment Created`, `Appointment Updated`, `Appointment Cancelled`, `Patient Arrived`.

---

## 9. Health Check

### `GET /health`
**Access:** Public — not under `/api/v1`.

```json
{ "success": true, "message": "OK", "data": { "uptime": 1234.5 } }
```

---

## 10. Real-Time Events (Socket.IO)

Connect to the backend's root URL (same host/port as the REST API). No auth handshake required for this scope (see Engineering Decisions for the multi-tenant scaling note).

**Event:** `appointment_updated`
```json
{ "action": "CREATED" | "UPDATED" | "CANCELLED", "appointment": { "...full appointment object..." } }
```
Emitted after every successful `POST /appointments`, `PUT /appointments/:id`, `DELETE /appointments/:id`, and `POST /appointments/:id/arrive`.

---

## 11. Role Access Summary

| Endpoint | Super Admin | Receptionist | Doctor |
|---|:---:|:---:|:---:|
| `POST /auth/login` \| `/refresh` \| `/logout` | ✅ | ✅ | ✅ |
| `GET /doctors` | ✅ | ✅ | ✅ |
| `POST /admin/doctors` \| `/admin/receptionists` | ✅ | ❌ | ❌ |
| `GET /admin/schedules/:doctorId` | ✅ | ✅ | ✅ |
| `POST /admin/schedules` | ✅ | ❌ | ❌ |
| `GET /slots` | ✅ | ✅ | ✅ |
| `POST /appointments` | ✅ | ✅ | ❌ |
| `GET /appointments` | ✅ (all) | ✅ (all) | ✅ (own only) |
| `PUT /appointments/:id` | ✅ | ✅ | ✅ (own only) |
| `DELETE /appointments/:id` | ✅ | ✅ | ❌ |
| `POST /appointments/:id/arrive` | ✅ | ✅ | ❌ |
| `GET /patients` | ✅ | ✅ | ✅ |
| `GET /audit-logs` | ✅ | ❌ | ❌ |
