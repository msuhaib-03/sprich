# Auth sessions & request logging

How a doLang session works (HttpOnly cookie), and how `/api/log` attributes API
requests to users in Vercel's logs.

---

## 1. Session model — HttpOnly cookie

The signed JWT (`{ sub: User.id, email }`, 7-day expiry) lives in a cookie set by
the API, **not** in `localStorage` and **never** in a URL or in JS reach.

```
dolang_session = <JWT>
  HttpOnly; Secure; SameSite=Lax; Domain=.dolang.website; Path=/; Max-Age=604800
```

`SameSite=Lax` is sufficient because the web app and the API are the **same
site**:

| | Production | Local dev |
|---|---|---|
| web | `https://dolang.website` (Vercel) | `http://localhost:3000` |
| api | `https://api.dolang.website` (Render) | `http://localhost:4000` |

Both sides share the registrable domain (`dolang.website` / `localhost`), so the
cookie is first-party. The only cross-site step — the Google OAuth redirect — is
a top-level GET, which `SameSite=Lax` allows, and the cookie is set on our own
`api.dolang.website` callback response anyway. **No `SameSite=None`.**

Where it's defined: `apps/api/src/auth/session-cookie.ts`
(`setSessionCookie` / `clearSessionCookie`, `secure` and `domain` from
`NODE_ENV` + `COOKIE_DOMAIN`).

### Login paths (all set the cookie, return `{ user }`)

| Path | File |
|---|---|
| `POST /auth/register` | `apps/api/src/auth/auth.controller.ts` |
| `POST /auth/login` | same |
| `GET /auth/google/callback` | same — sets the cookie on the 302 and redirects straight to `/dashboard` or `/onboarding`. No `?code=`, no client-side exchange. |
| `POST /auth/logout` | clears the cookie (idempotent) |

### Reading it

- API: `JwtStrategy` (`apps/api/src/auth/strategies/jwt.strategy.ts`) extracts the
  JWT from `req.cookies['dolang_session']` only — no `Authorization` header.
- Frontend: `apps/web/lib/api.ts` sends every request with
  `credentials: 'include'`. There is no token in JS. `store/auth.ts` holds only
  the `user` profile (cached for a flash-free reload; the cookie is the truth).
- Route guard: `apps/web/app/(app)/layout.tsx` calls `GET /users/me` on mount →
  `authed` | `401 → /login` | network error → retry UI. No infinite spinner.

---

## 2. Request logging (`/api/log`)

The browser calls the API directly (`dolang.website` → `api.dolang.website`), so
those requests never pass through Vercel. To make them visible in Vercel's logs,
`apps/web/lib/api.ts` fires a fire-and-forget `navigator.sendBeacon` to
`apps/web/app/api/log/route.ts` for every `api.*` call. It emits one line:

```
[REQUEST] {"event":"request","userId":"cmr8…","email":"user@example.com",
           "route":"/users/me","method":"GET","ip":"…","userAgent":"…",
           "referer":null,"timestamp":"2026-09-01T17:18:11.069Z"}
```

**Identity is server-verified, never client-supplied.** The beacon body is only
`{ route, method }`. The `dolang_session` cookie rides the same-origin beacon
automatically (`Domain=.dolang.website`); the route handler verifies its HS256
signature against `JWT_SECRET` (`verifyJwt`, zero-dep `node:crypto`) and takes
`userId`/`email` from the verified `sub`/`email`.

| Cookie on the beacon | Logged identity |
|---|---|
| valid, unexpired, signature matches | real `userId` + `email` |
| missing / malformed / tampered / expired | `anonymous` |
| any, but `JWT_SECRET` unset on Vercel | `anonymous` (+ one `console.warn`) |

The cookie value is never written to a log line. View: Vercel → **Logs** →
filter `[REQUEST]`.

Files: `apps/web/lib/api.ts` (`reportCall`), `apps/web/app/api/log/route.ts`
(`verifyJwt`), `apps/web/lib/log.ts` (`logRequest`).

---

## 3. Deployment / infra runbook

Nothing works until the API is same-site with the web app.

1. **Render** → the API service → add custom domain **`api.dolang.website`**.
2. **DNS** → `CNAME api.dolang.website → <render target host>`; wait for the TLS
   cert to issue.
3. **Google Cloud Console** → OAuth client → Authorized redirect URIs → add
   `https://api.dolang.website/api/v1/auth/google/callback`.
4. **Render env:**
   - `GOOGLE_CALLBACK_URL=https://api.dolang.website/api/v1/auth/google/callback`
   - `WEB_URL=https://dolang.website`
   - `COOKIE_DOMAIN=.dolang.website`
   - `NODE_ENV=production` (makes the cookie `Secure`)
   - `JWT_SECRET` — unchanged
5. **Vercel env:**
   - `NEXT_PUBLIC_API_URL=https://api.dolang.website/api/v1`
   - `JWT_SECRET` — same value as Render (used by `/api/log`)
6. Redeploy **both**. Existing `localStorage` sessions are dead — users log in
   once more.

Local dev needs no new vars: `COOKIE_DOMAIN` unset → host-only cookie on
`localhost`; `NODE_ENV !== 'production'` → cookie not `Secure`.

---

## 4. Verification

**Local** (`npm run dev`):
- Email/pw login → response has `Set-Cookie: dolang_session; HttpOnly; SameSite=Lax`;
  `document.cookie` does **not** contain it; `/dashboard` loads; Next dev
  `[REQUEST]` log shows the real `userId`.
- Hard refresh on `/dashboard` → still authed.
- Log out → cookie cleared; `/users/me` → 401; `/dashboard` → `/login`.
- Google (needs local Google creds): `/auth/google/callback` → `302` to
  `/dashboard` **with** `Set-Cookie`; no `/callback?code=`.

**Type/lint:** `apps/api` + `apps/web` `tsc --noEmit`; `apps/web` eslint (the
changed files; `speak/page.tsx` has pre-existing `Date.now`-in-render warnings
unrelated to this work).

**E2E:** `npm run test:e2e` — fixtures now authenticate the browser context via
the API (`page.request` shares the cookie jar); no `localStorage` seeding.

**Production** (after the runbook + deploy):
- `curl -I https://api.dolang.website/api/v1/` → reachable over TLS.
- Desktop **and iPhone Safari**: Google login lands on `/dashboard`
  authenticated; hard refresh persists; incognito behaves the same; Vercel
  `[REQUEST]` shows the real `userId` for both email/pw and Google.
- `Set-Cookie` shows `Domain=.dolang.website; SameSite=Lax; Secure; HttpOnly`.

---

## 5. History

- The old model: JWT in `localStorage`, sent as `Authorization: Bearer`; Google
  OAuth used a one-time code held in an **in-memory `Map` on the API**, traded
  for the token by a client-side `/callback` page.
- That map did not survive Render restarts / cold starts, so the exchange could
  hang (→ iPhone stuck on the callback spinner) or the client never stored a
  token (→ every request logged `anonymous`).
- Moving to a first-party HttpOnly cookie set directly on the OAuth redirect
  removed the exchange step, the in-memory state, and the `localStorage` token
  entirely.

---

## 6. Not done

- Opaque / DB-backed sessions with server-side revocation. The session is still a
  stateless JWT; logout clears the cookie but a copied token stays valid until
  its 7-day expiry.
- Refresh-token rotation.
