# Auth request logging & the Google-OAuth "anonymous" fix

Reference for how `/api/log` attributes API requests to users, why Google OAuth
logins used to show up as `anonymous`, and what changed.

---

## 1. How request logging works

The web app calls the NestJS API **directly from the browser**
(`apps/web/lib/api.ts` → `fetch(NEXT_PUBLIC_API_URL + path)` with an
`Authorization: Bearer` header). Those requests never pass through Vercel, so
Vercel's logs can't see them.

To get them into Vercel's logs, `lib/api.ts` fires a fire-and-forget
`navigator.sendBeacon` for every `api.get/post/patch` call to a Next.js route
handler at **`apps/web/app/api/log/route.ts`**, which runs as a Vercel function
and emits one structured line per request:

```
[REQUEST] {"event":"request","userId":"cmr8…","email":"user@example.com",
           "route":"/users/me","method":"GET","ip":"…","userAgent":"…",
           "referer":null,"timestamp":"2026-09-01T17:18:11.069Z"}
```

`sendBeacon` **cannot set request headers**, so the beacon body carries the
context. Identity is established server-side (see §3).

View: Vercel project → **Logs** → filter `[REQUEST]`.

Files:

| File | Role |
|---|---|
| `apps/web/lib/api.ts` — `reportCall()` | fires the beacon: `{ route, method, token }` |
| `apps/web/app/api/log/route.ts` | verifies the token, calls `logRequest()` |
| `apps/web/lib/log.ts` — `logRequest()` | the single `console.log('[REQUEST]', …)` line |

---

## 2. The bug: Google OAuth users logged as `anonymous`

After a Google login, the `GET /users/me` call fired right after the OAuth
callback logged as:

```json
{ "userId": "anonymous", "email": null, "route": "/users/me", "method": "GET" }
```

Email/password users were always attributed correctly.

### Root cause

Two layers:

1. **The symptom.** `/api/log` used to read identity from the **client Zustand
   store** (`localStorage['dolang-auth'].state.user`). The OAuth callback page
   populated that store *after* it made its `/users/me` request:

   ```
   POST /auth/oauth/exchange  ->  { accessToken }        (no user in the response)
   localStorage.setItem('dolang_token', accessToken)     (backend auth now works)
   api.get('/users/me')   ── logging beacon fires HERE ──> store.user is still null -> "anonymous"
     .then(user => setAuth(accessToken, user))            (store.user set only now)
   ```

   The JWT was valid the whole time — the NestJS backend authenticated the
   Google user correctly. Only the **log attribution** was wrong, and only for
   that one in-callback request.

2. **The underlying weakness.** `/api/log` *trusted* `userId`/`email` sent in
   the beacon body. A client could assert any identity.

### Why email/password was fine

`POST /auth/login` returns `{ accessToken, user }` in **one** response, so
`login/page.tsx` calls `setAuth(token, user)` synchronously — the store is fully
populated before any logged request, and there is no `/users/me` round-trip at
all. The Google flow diverged because `googleCallback` kept only
`req.user.accessToken` when creating the one-time exchange code and discarded
the `user` object, forcing the callback page to re-fetch `/users/me`.

---

## 3. The fix

Two coordinated changes. The JWT + `Bearer` architecture is unchanged — no new
auth mechanism, no changes to `JwtStrategy`, the passport guards, or how
`/users/me` authenticates.

### A. Google OAuth converges with email/password

The one-time OAuth exchange code now carries the **full login result**, so the
exchange endpoint returns the exact same `{ accessToken, user }` shape as
`POST /auth/login`.

| File | Change |
|---|---|
| `apps/api/src/auth/auth.service.ts` | `oauthCodes` map stores `{ payload: {accessToken, user}, expiresAt }` instead of a bare token. `createOAuthExchangeCode(payload)` / `exchangeOAuthCode()` pass the whole object. |
| `apps/api/src/auth/auth.controller.ts` | `googleCallback` hands `req.user` (the full result from `validateOAuthUser`) to `createOAuthExchangeCode`. `POST /auth/oauth/exchange` returns the full result. |
| `apps/web/app/(auth)/callback/page.tsx` | Uses the returned `user` directly: `setAuth(accessToken, user)`. **The `GET /users/me` call is deleted** — nothing left to race. Deterministic, no timers. |

`sub` in the JWT is the **database `User.id`** (e.g. `cmqhz2spb0000va2sjz7ok28i`),
never the `googleId` — set by `AuthService.login()`, which both flows call.

### B. `/api/log` verifies identity server-side

The beacon now sends the **bearer token**, not a client-claimed id. The route
handler verifies the token's signature before trusting it.

| File | Change |
|---|---|
| `apps/web/lib/api.ts` | beacon body is `{ route, method, token: getToken() }`. `getLoggedInUser()` removed. |
| `apps/web/app/api/log/route.ts` | `verifyJwt()` — zero-dependency HS256 check with `node:crypto` (`createHmac` + `timingSafeEqual`), validates signature against `JWT_SECRET` and rejects expired `exp`. Identity comes from the verified `sub`/`email`. `runtime = 'nodejs'`. |
| `apps/web/lib/log.ts` | added `event: 'request'` to the payload. |

Behaviour:

| Beacon token | Logged identity |
|---|---|
| valid, unexpired, signature matches | real `userId` + `email` from `sub`/`email` |
| missing | `anonymous` |
| malformed / wrong signature / tampered | `anonymous` |
| expired | `anonymous` |
| any, but `JWT_SECRET` unset on the server | `anonymous` (+ one `console.warn`) |

The token itself is **never written to a log line**. OAuth authorization codes
still never reach the logs (they only transit the `/callback?code=` URL and the
in-memory Map).

---

## 4. Deployment requirement

**`JWT_SECRET` must be set in the web app's environment**, with the **same value
as the API's `JWT_SECRET`**:

- Vercel: project → Settings → Environment Variables → `JWT_SECRET` (server-side,
  **not** `NEXT_PUBLIC_`).
- Local: `apps/web/.env.local` (see `apps/web/.env.local.example`).

Until it's set, `/api/log` verification fails closed and every request logs as
`anonymous` — safe, but the feature is inert.

`apps/web/.env*` is gitignored (`apps/web/.gitignore` → `.env*`), so this is a
manual deploy step, not something carried in the repo.

---

## 5. Verification

Run `npm run dev` with `JWT_SECRET` set in `apps/web/.env.local`.

- **Type/lint:** `apps/api` and `apps/web` both pass `tsc --noEmit`.
- **`verifyJwt` unit check:** sign a token with the shared secret (`jsonwebtoken`,
  `{ expiresIn: '7d' }`) → verifier returns `{ sub, email, iat, exp }`; wrong
  secret / tampered signature / expired / garbage / no-secret → `null`.
- **Email/password (Test A):** log in → dashboard → the `[REQUEST]` lines for
  follow-up calls show the real `userId` + `email`.
- **Spoof check:** hand-edit `dolang_token` in localStorage → `/api/log` logs
  `anonymous` (signature fails).
- **Logout (Test D):** `getToken()` is null → beacon carries no token →
  `anonymous`.
- **Google OAuth (Tests B / C / E / F):** needs the real Google consent screen —
  verify on the deployment. Evidence in code: `/auth/oauth/exchange` now returns
  the identical `{ accessToken, user }` contract as `/auth/login`, the callback
  no longer calls `/users/me`, and `/auth/me` (same JWT guard Google users hit)
  resolves the user from a bearer token in local testing.
- **e2e:** `apps/web/e2e/auth.spec.ts` is unaffected — it seeds `localStorage`
  directly and never exercises the callback page or `/api/log`.

---

## 6. Deferred: HttpOnly session cookie

Not done — the audit explicitly discouraged an auth rewrite, and the acceptance
criteria are met without one.

A future hardening would issue the JWT as an `HttpOnly; Secure; SameSite=Lax`
cookie on all login paths. `/api/log` (and a Next middleware) could then read the
session server-side with no token in the beacon body at all, and the token would
no longer be reachable from frontend JavaScript. This touches every auth entry
point, `lib/api.ts`, the `(app)/layout.tsx` hydration guard, and the e2e
fixtures, so it's a separate piece of work.
