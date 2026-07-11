# ENGINEERING_DECISIONS.md

## Why this project architecture?

Layered structure — `routes → validators → controllers → services → models`
— so each layer has exactly one job: routes wire up middleware, validators
reject bad input before it reaches business logic, controllers translate
HTTP ↔ service calls, services hold all business rules, models hold schema
and persistence concerns. This keeps controllers thin (as the assessment
asks for) and makes services independently testable without spinning up
Express. It also matches the suggested backend structure directly, which
minimizes the gap between "how it's organized" and "how a reviewer expects
to navigate it."

## How did I design the MongoDB schema?

I kept `users` as a single collection discriminated by `role`, rather than
separate `doctors`/`receptionists`/`admins` collections, because all three
share the same auth/login shape and RBAC only needs a `role` field to gate
access — splitting them would mean joining across collections just to log
someone in. `doctorInfo` is an optional embedded sub-document used only when
`role === 'Doctor'`.

Appointments **denormalize** `doctorName`/`patientName`/`patientMobile`
directly onto the appointment document instead of only storing ObjectId
references. Appointments are read (listed, searched, sorted) far more often
than a doctor's or patient's name changes, and denormalizing avoids a
`$lookup`/populate on every list request — this is a deliberate
read-optimized trade-off, common in scheduling systems where historical
records shouldn't silently change if a name is edited later anyway.

`DoctorSchedule` is a separate collection (one document per doctor, unique
on `doctorId`) rather than embedded on the `User` document, because
schedules are updated independently of the doctor's profile and are read on
every slot-generation request — keeping it separate avoids loading/writing
the whole user document for a schedule change.

## How did I prevent double booking?

The Firestore prototype used a separate `appointments_concurrency` lock
collection plus a Firestore transaction to check-then-write it. I replaced
that with a **partial unique index** directly on the `appointments`
collection:

```js
appointmentSchema.index(
  { doctorId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['Scheduled','Arrived','Completed'] } } }
)
```

Booking is then a single `Appointment.create(...)` call. If two requests
race for the same `doctorId + date + time`, MongoDB's unique index
enforcement guarantees only one insert can succeed at the storage layer —
the second raises a duplicate-key error (`E11000`), which the service layer
catches and turns into `409 Conflict: "Double booking prevented."`

I chose this over Mongo multi-document transactions because:
- It's atomic by construction — no explicit read-then-write race window to
  reason about, and no possibility of forgetting to wrap a code path in a
  transaction.
- It doesn't require a replica set (`mongod --replSet`) to function, which
  keeps local/dev setup simple, whereas transactions do.
- It's one collection fewer to maintain and reason about compared to the
  original lock-collection approach.

The `partialFilterExpression` excludes `Cancelled` appointments from the
uniqueness constraint, so a cancelled slot can be freely rebooked.

## Which database indexes did I create and why?

See the README's "Indexes & Why" table for the full list. In short: the
partial unique index above for correctness, `{doctorId,date}` and
`{date,status}` compound indexes to keep slot generation and list filtering
off full collection scans, a text index across the searchable appointment
fields for the combined search box, and a TTL index on `refreshTokens.
expiresAt` so expired sessions clean themselves up without a cron job.

## What security measures did I implement?

- Passwords hashed with bcrypt (10 salt rounds), never returned in any
  response (`select: false` + `toJSON` transform strips it as a second
  layer of defense).
- JWT access tokens (short-lived, 15m) + refresh tokens (7d, stored
  server-side so logout can invalidate them; TTL-indexed to auto-expire).
- `authenticateJWT` + `authorizeRoles(...)` middleware on every
  non-public route; Doctor-scoped queries are filtered server-side (a
  Doctor's `GET /appointments` query is forced to their own `doctorId`
  regardless of what the client sends).
- `express-validator` on every write endpoint — input is validated and
  normalized before it reaches services.
- `helmet` for standard security headers, `cors` restricted to a single
  configured origin (not `*`) since credentials are involved.
- Centralized error handler: internal error details/stack traces are only
  logged server-side, never included in the client response outside
  development mode.
- Environment-driven configuration (`.env`) for all secrets; the app fails
  fast at boot if a required secret is missing rather than falling back to
  an insecure default (unlike the original prototype, which shipped
  hardcoded fallback JWT secrets).

## What performance optimizations did I apply?

- **Server-side pagination/filtering/sorting** on `GET /appointments`
  (Mongo `find().sort().skip().limit()` + `countDocuments()` run in
  parallel) instead of fetching the entire collection and filtering in
  memory, which is what the original Firestore prototype did — that
  approach doesn't scale past a small number of appointments.
- **Targeted compound indexes** matching the actual query shapes used by
  slot generation and appointment listing (see indexes table), so lookups
  stay index-scans rather than collection scans as data grows.
- **Denormalized read fields** on `Appointment` (doctor/patient name)
  avoid a join/populate on the hottest read path (the appointment list/
  scheduler view).
- **Lean projections where full Mongoose documents aren't needed** (e.g.
  `.select('time')` when only booked times are needed for slot generation)
  to reduce data transferred from MongoDB.
- **TTL index** for refresh token cleanup instead of a polling cleanup job.

## If this needed to support millions of appointments, what would I change?

- **Sharding**: shard the `appointments` collection on a compound key like
  `{ doctorId, date }` (or a clinic/tenant ID prefix in multi-clinic
  deployments) so reads/writes for a given doctor/day stay co-located and
  scale horizontally.
- **Archival strategy**: move appointments older than N months into a
  separate "archive" collection/cold storage, keeping the hot collection
  small and indexes cheap to maintain.
- **Caching**: cache generated slots for a doctor/day (e.g. Redis, short
  TTL, invalidated on booking/cancellation) since slot generation is
  read-heavy and recomputation is deterministic from the schedule + booked
  times.
- **Read replicas** for the search/reporting/audit-log endpoints, keeping
  the primary focused on booking writes.
- **Move refresh tokens to Redis** instead of MongoDB, since they're
  high-churn, short-lived, and don't need MongoDB's durability guarantees.
- **Socket.IO horizontal scaling**: add the Redis adapter
  (`@socket.io/redis-adapter`) and move from a single global broadcast to
  rooms scoped per clinic/department, so a deployment with many concurrent
  clinics doesn't fan out every event to every connected socket.
- **Async audit logging via a queue** (e.g. a lightweight message queue)
  instead of a synchronous `AuditLog.create()` call, so audit writes never
  add latency to the booking request path.
- **Rate limiting & WAF** in front of the API, particularly on
  `/auth/login` and `/appointments`, once traffic volume makes abuse a
  real concern.
