# Trade-offs

Decisions made to keep this implementation simple and correct, per the assignment's own instruction to prioritize requirements over advanced optimizations.

## Lazy expiration instead of cron / setTimeout / BullMQ / Redis

`expiresAt` is stored on every `LOCKED` reservation. `ExpiryService.releaseExpired()` runs at the start of every read/write path that touches seats or reservations (`GET /seats`, `GET /seats/statistics`, `GET /reservations/me`, `POST /reservations`, `POST /payments/mock`, `DELETE /reservations/:id`). Any reservation past its `expiresAt` is flipped to `EXPIRED` and its seat released to `AVAILABLE` before the response is built. No background process, no timers, no extra infrastructure — correct because every user-facing path reconciles first.

## Sequential guarded updates instead of MongoDB transactions for payment

Payment updates the reservation (`LOCKED` → `PAID`, guarded by `status: LOCKED`) and then the seat (`LOCKED` → `PURCHASED`, guarded by `status: LOCKED`) as two separate atomic `findOneAndUpdate` calls rather than a multi-document transaction. Multi-document transactions require MongoDB running as a replica set, which a vanilla local `mongod` install doesn't provide out of the box — requiring one would break local development for anyone without extra setup. Each individual update is still atomic and status-guarded, so no double-payment or inconsistent state can occur; the only theoretical gap is a crash between the two writes, which would leave a `PAID` reservation with a `LOCKED` seat — recoverable by reconciling on read (not currently automated, acceptable for this scope).

## One unified `user` collection instead of separate `users` + `guests`

Better Auth's `anonymous` plugin creates a real `user` document (`isAnonymous: true`) for guests, using the same session/JWT machinery as registered users. Rather than bolt on a parallel custom `guests` collection, guest and registered users are the same entity distinguished by `isAnonymous`. This is simpler than maintaining two auth systems, not more complex — and it's what "guest reservation + login support" naturally reduces to once you use Better Auth's anonymous session support instead of hand-rolling guest IDs.

## Better Auth mounted via `toNodeHandler`, not a native NestJS adapter

Better Auth has no official NestJS integration; it ships a Node integration (`better-auth/node`) built for mounting on a raw Express/http handler. `/api/auth/*` is registered on the underlying Express instance *before* `NestFactory.create()` wires up Nest's own body-parser, so Better Auth can read the raw request body itself. Everything else runs through Nest as normal (guards, pipes, filters, Swagger).

## No separate `payments` collection

Mock payment is a status transition, not a financial record: `Reservation.status: LOCKED → PAID` plus `Seat.status: LOCKED → PURCHASED`. There's no payment gateway integration to reconcile against, so a dedicated `payments` collection would just duplicate fields already on the reservation.
