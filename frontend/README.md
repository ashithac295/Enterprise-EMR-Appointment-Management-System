# Enterprise EMR Appointment Management System

This is a production-ready, full-stack Electronic Medical Record (EMR) Appointment Management module built with a **Node.js, Express, React, and Firestore (MERN NoSQL Equivalent)** stack. The system implements secure JWT role-based access controls, dynamic slot generation, atomic double-booking prevention, and real-time schedule synchronizations via WebSockets.

---

## 🚀 Features Implemented

1. **Enterprise Authentication (JWT):**
   - High-security password hashing using `bcryptjs`.
   - Dual-token authorization flow with 15-minute Access Tokens and 7-day persistent Refresh Tokens.
   - Logout mechanisms with instant Refresh Token database invalidation.
2. **Role-Based Access Control (RBAC):**
   - **Super Admin:** Manage Doctors list, configure complex doctor shift parameters, access all appointments, and inspect security audit traces.
   - **Receptionist:** Look up patients, reserve slots in the visual calendar grid, change bookings, and mark patients as arrived.
   - **Doctor:** View role-restricted patient schedule queues and modify notes/consultation workflow statuses.
3. **Dynamic Slot Generation:**
   - Evaluates working shifts, lunch breaks, and existing bookings to generate slots dynamically.
   - Prevents booking past slots or dates.
4. **Double Booking Prevention:**
   - Atomic transactions via Firestore's write-lock mapping to completely eliminate concurrent slot overlaps.
5. **Real-Time Synchronizations:**
   - Socket.IO web sockets broadcast event notifications. Active reception lists and booking grids update instantly upon bookings or cancellations without reloading pages.
6. **Chronological Audit Trail:**
   - Detailed, secure audit trail records user actions, timestamps, and impacted entities.

---

## 📂 Project Folder Structure

```
├── server.ts                    # Full-Stack Express and Socket.IO entry point
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

---

## 🗄️ Database Design


1. **`users` (Collection):** Accounts and specialty data.
2. **`auth_passwords` (Collection):** Separated password hashes.
3. **`doctorSchedules` (Collection):** Configured working hours, slot duration, sessions, and break times.
4. **`appointments` (Collection):** Consultation dates, times, and workflows.
5. **`appointments_concurrency` (Collection):** Atomic lock mapping documents.
6. **`patients` (Collection):** Patient data.
7. **`refreshTokens` (Collection):** Extant refresh tokens.
8. **`auditLogs` (Collection):** Immutable trail ledger.

---

## 🔌 API Documentation

All responses conform to the consistent EMR standard:
```json
{
  "success": true,
  "message": "Success message description",
  "data": {}
}
```

### Authentication Endpoints
* **`POST /api/v1/auth/login`** - Accepts email/password, returns user details, Access and Refresh Tokens.
* **`POST /api/v1/auth/refresh`** - Exchanges Refresh Token for a new Access Token.
* **`POST /api/v1/auth/logout`** - Removes Refresh Token from persistence.

### Scheduling & Slots
* **`GET /api/v1/doctors`** - Retrieves doctor listings.
* **`GET /api/v1/slots`** - Generates slot grid for a doctor on a specific date.

### Appointments Endpoints
* **`POST /api/v1/appointments`** - Reserves/books an appointment slot.
* **`GET /api/v1/appointments`** - Fetches paginated, sorted, and filtered appointments.
* **`PUT /api/v1/appointments/:id`** - Modifies consultation details, notes, or status.
* **`DELETE /api/v1/appointments/:id`** - Cancels an appointment.
* **`POST /api/v1/appointments/:id/arrive`** - Marks patient status as "Arrived".

### Administration (Super Admin Only)
* **`POST /api/v1/admin/doctors`** - Onboards a doctor.
* **`POST /api/v1/admin/schedules`** - Configures a doctor schedule.
* **`GET /api/v1/audit-logs`** - Returns the immutable security log traces.

---

## 🔒 Environment Variables

Variables can be declared in your environment or a `.env` file:
```env
# Port configured by platform (Defaults to 3000)
PORT=3000

# Secret keys for JWT signing
JWT_ACCESS_SECRET="emr_enterprise_access_secret_token_12345"
JWT_REFRESH_SECRET="emr_enterprise_refresh_secret_token_67890"
```

---

## ⚙️ Installation & Running instructions

### Prerequisites
- Node.js (v18+)

### Steps
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Build and Start Production Server:**
   ```bash
   npm run build
   npm run start
   ```
3. **Run Development Server:**
   ```bash
   npm run dev
   ```

---

## 🛡️ Sandbox Logins
To speed up assessment evaluation, use these preset credentials from the login screen shortcuts:

* **Super Admin:** `admin@emr.com` / `adminpassword`
* **Receptionist:** `receptionist@emr.com` / `receptionistpassword`
* **Doctor:** `doctor@emr.com` / `doctorpassword`

---

## 📝 Assumptions, Limitations & Future Improvements

### Assumptions
- A patient is identified by phone number/id; creating a "New Patient" dynamically registers them in the system.
- Standard clinic shifts are morning and evening sessions. Past dates/times are barred from reservation.

### Known Limitations
- Standard JS Date comparisons rely on server-side clock timestamps for deciding "past times".
- The assessment environment relies on memory database structures if the cloud is offline.

### Future Improvements
- SMS/Email auto-reminders via Twilio.
- Interactive charting and data visualization (Recharts) on the Clinical Hub dashboard.
- Advanced patient portal login for patients to cancel their own appointments.
