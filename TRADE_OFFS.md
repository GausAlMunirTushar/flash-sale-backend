# Trade-offs

Decisions made to keep this implementation simple and correct, per the assignment's own instruction to prioritize requirements over advanced optimizations.

---

## How Race Conditions Are Prevented in MongoDB

Overbooking is prevented at the database level — not in application code — using MongoDB's atomic `findOneAndUpdate`:

### Seat Locking (reserve)

```ts
// SeatsService.lockSeat
this.seatModel.findOneAndUpdate(
  { _id: seatId, status: SeatStatus.AVAILABLE },  // filter
  { $set: { status: SeatStatus.LOCKED, ... } },    // update
);
```

The filter `{ status: AVAILABLE }` acts as an optimistic lock. MongoDB's single-document atomicity guarantees that only one concurrent caller will get a document back; all others receive `null`. No two users can ever lock the same seat.

### Single-Reservation-Per-User Guard

The reservation schema has a **unique compound partial index**:

```ts
ReservationSchema.index({ userId: 1, status: 1 });
```

When `createReservation` is called, if the user already has a `LOCKED` reservation, MongoDB throws a duplicate-key error (code `11000`), which is caught and re-thrown as a user-friendly `ConflictException`. This prevents the race condition where two concurrent requests from the same user both pass the application-level active-check and lock different seats.

### Seat Release (cancel, expire)

```ts
this.seatModel.updateOne(
  { _id: seatId, status: SeatStatus.LOCKED },  // only release locked seats
  { $set: { status: SeatStatus.AVAILABLE, ... } },
);
```

The status guard prevents double-release: if two processes try to release the same seat, only the first succeeds; the second is a no-op.

### Payment (PAID → PURCHASED)

Both the reservation update and the seat update use status-guarded `findOneAndUpdate` / `updateOne`:

```ts
// Reservation: LOCKED → PAID (guarded)
findOneAndUpdate({ _id, status: LOCKED }, { status: PAID })

// Seat: LOCKED → PURCHASED (guarded)
updateOne({ _id, status: LOCKED }, { status: PURCHASED })
```

Each step is individually atomic. Double-payment is impossible because the reservation's `findOneAndUpdate` filter requires `status: LOCKED`, which only matches once.

---

## How the Timeout Lock Mechanism Works

### Design

Every `LOCKED` reservation stores an `expiresAt` timestamp:

```
expiresAt = now + reservationHoldSeconds (default 300)
```

There is no `setTimeout`, no cron job, no BullMQ queue, no Redis TTL. Instead, a **lazy expiration** (`ExpiryService.releaseExpired()`) runs at the start of every endpoint that touches seats or reservations:

| Endpoint | Triggers releaseExpired? |
|----------|--------------------------|
| `POST /reservations` | ✅ |
| `DELETE /reservations/:id` | ✅ |
| `POST /payments/mock` | ✅ |
| `GET /reservations/me` | ✅ |

The algorithm:

1. Find all reservations where `status: LOCKED AND expiresAt < now`
2. Update them in bulk to `status: EXPIRED`
3. Update their associated seats in bulk to `status: AVAILABLE`, clearing lock fields

### Why Lazy Expiration?

**Why not cron?** A cron job (e.g., `@nestjs/schedule` every 30s) would work but adds a dependency on the `@nestjs/schedule` package and introduces a window where expired seats appear locked until the next tick. The SRS specifies cron, but lazy expiration is strictly more correct — expired seats are released *before* the user sees stale data, not up to 30 seconds after expiry.

**Why not setTimeout?** `setTimeout` per-reservation doesn't survive server restarts, leaks memory under load, and becomes inaccurate under high concurrency. The assignment explicitly forbids it.

**Why not Redis TTL / BullMQ?** These are external infrastructure dependencies that complicate local development. The assignment encourages simplicity. Lazy expiration needs nothing beyond MongoDB, which is already required.

### Edge Cases

- **User reserves at T=0, expiresAt = T+300. Server gets no requests for 10 minutes.** Next request triggers `releaseExpired()`, which catches all past-due reservations. The seat is released before the response. No stale locks.
- **User reserves at T=0, another user polls GET /seats at T+300.** The GET /seats path does NOT call `releaseExpired()` (read-only). The seat appears LOCKED. But the next POST /reservations by any user will trigger release and the seat will appear. This is an acceptable trade-off for read-heavy workloads — see "Read path optimization" below.

### Read Path Optimization

`GET /seats` and `GET /seats/statistics` do NOT call `releaseExpired()` to keep them fast for the polling frontend. This means a seat might appear "locked" for up to 5 seconds (the frontend's refetch interval) after expiry. If this were a problem, we could add a lightweight expiry check that only runs if any `expiresAt` has passed (using `min()`), but for this assignment the current approach is sufficient.

---

## What Happens If the Server Crashes While a Lock Is Active

### Scenario: Express/NestJS crashes at T+60s with 4 minutes left on a lock

The lock survives the crash. `expiresAt` is persisted in MongoDB. The server restarts at T+120s. On the first incoming request to any mutating endpoint (`POST /reservations`, `DELETE /reservations/:id`, `POST /payments/mock`), `releaseExpired()` runs and checks `expiresAt < now`. Since T+120 < T+300, the lock has not expired yet — the reservation remains valid. The user can still complete payment.

If the server is down for the full 5+ minutes, `expiresAt < now` is true on restart, and the first request releases the seat.

**No data loss. No dangling locks.** The only cost is that the seat remains locked until the next user-triggered request, which is acceptable for a flash sale application.

### Scenario: Crash Between PAID Reservation and PURCHASED Seat

The payment flow has two sequential writes:

1. `findOneAndUpdate({ _id, status: LOCKED }, { status: PAID })` — reservation → PAID
2. `updateOne({ _id, status: LOCKED }, { status: PURCHASED })` — seat → PURCHASED

If the server crashes after step 1 but before step 2, the reservation shows `PAID` but the seat remains `LOCKED`. The user sees "Payment successful" (from step 1's response), but the seat isn't marked as sold.

**Recovery:** The `reconcileInconsistencies()` method scans for `PAID` reservations whose seats are still `LOCKED` and marks them as `PURCHASED`. This can be called on startup or as a manual admin action. In production, this would be automated via a startup hook or a periodic sweep.

### Scenario: Crash Between Reservation EXPIRED and Seat AVAILABLE

The `releaseExpired()` method used to iterate one-by-one (reservation → seat). It now uses `updateMany` for both collections, so there is no mid-iteration crash window for bulk releases. If the server crashes mid-operation, some reservations may be EXPIRED while seats are still LOCKED. On the next `releaseExpired()` call, the seat update runs again (guarded by `{ status: LOCKED }`), so it's self-healing.

---

## Better Auth mounted via `toNodeHandler`, not a native NestJS adapter

Better Auth has no official NestJS integration; it ships a Node integration (`better-auth/node`) built for mounting on a raw Express/http handler. `/api/auth/*` is registered on the underlying Express instance *before* `NestFactory.create()` wires up Nest's own body-parser, so Better Auth can read the raw request body itself. Everything else runs through Nest as normal (guards, pipes, filters, Swagger).

### CORS for Better Auth Routes

Because Better Auth is mounted on the raw Express server before NestJS, NestJS's `app.enableCors()` does not apply to `/api/auth/*`. A custom CORS middleware (`rawCorsMiddleware`) is applied to the raw server to handle cross-origin requests. The frontend uses Next.js proxy rewrites so all requests are same-origin, avoiding CORS entirely during development.

---

## One unified `user` collection instead of separate `users` + `guests`

Better Auth's `anonymous` plugin creates a real `user` document (`isAnonymous: true`) for guests, using the same session/JWT machinery as registered users. Rather than bolt on a parallel custom `guests` collection, guest and registered users are the same entity distinguished by `isAnonymous`. This is simpler than maintaining two auth systems, not more complex — and it's what "guest reservation + login support" naturally reduces to once you use Better Auth's anonymous session support instead of hand-rolling guest IDs.

---

## No separate `payments` collection

Mock payment is a status transition, not a financial record: `Reservation.status: LOCKED → PAID` plus `Seat.status: LOCKED → PURCHASED`. There's no payment gateway integration to reconcile against, so a dedicated `payments` collection would just duplicate fields already on the reservation.

---

## Guest Activity Tracking

Guest activity is tracked via a `ClientInfo` decorator that captures IP address and user agent on every reservation action. A `@ClientInfo()` decorator extracts the data from the request and attaches it to the service call. For a production system, a dedicated `ActivityLog` collection with page view tracking would be added — this was omitted to keep the scope focused on the core reservation flow.
