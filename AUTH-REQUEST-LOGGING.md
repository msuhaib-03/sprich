# Auth sessions & request logging

How a doLang session works (HttpOnly cookie), and how `/api/log` attributes API
requests to users in Vercel's logs.

---

## 1. Session model — HttpOnly cookie

The signed JWT (`{ sub: User.id, email }`, 7-day expiry) lives in a cookie set by
the API, **not** in `localStorage` and **never** in a URL or in JS reach.

```
dolang_session = <JWT>
  HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800     (host-only — no Domain)
```

The browser only ever talks to **one origin** (`dolang.website`). API calls go
through a same-origin proxy — `apps/web/next.config.ts` rewrites `/api/v1/*` to
the real API host:

| | Production | Local dev |
|---|---|---|
| origin the browser sees | `https://dolang.website` | `http://localhost:3000` |
| proxy forwards to (`API_PROXY_TARGET`) | `https://api.dolang.website/api/v1/*` (Render) | `http://localhost:4000/api/v1/*` |

So `dolang_session` is a plain **first-party host-only** cookie. `SameSite=Lax` +
first-party is what iOS Safari keeps — a **cross-subdomain** cookie
(`dolang.website` page ↔ `Set-Cookie` from an `api.dolang.website` fetch/redirect)
is dropped by Safari's tracking protection. **No `SameSite=None`, no `Domain`.**

Where it's defined: `apps/api/src/auth/session-cookie.ts`
(`setSessionCookie` / `clearSessionCookie`; `secure` from `NODE_ENV`).

### Login paths (all set the cookie, return `{ user }`)

| Path | File |
|---|---|
| `POST /auth/register` | `apps/api/src/auth/auth.controller.ts` |
| `POST /auth/login` | same |
| `GET /auth/google/callback` | same — sets the cookie on the 302 (which returns through the proxy, so the cookie lands on the web origin) and redirects to `/dashboard` or `/onboarding`. No `?code=`, no client-side exchange. |
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

API calls hit the real API through the proxy, so the API's own logs live on
Render. To also see them in Vercel's logs in one place, `apps/web/lib/api.ts`
fires a fire-and-forget `navigator.sendBeacon` to `apps/web/app/api/log/route.ts`
for every `api.*` call. It emits one line:

```
[REQUEST] {"event":"request","userId":"cmr8…","email":"user@example.com",
           "route":"/users/me","method":"GET","ip":"…","userAgent":"…",
           "referer":null,"timestamp":"2026-09-01T17:18:11.069Z"}
```

**Identity is server-verified, never client-supplied.** The beacon body is only
`{ route, method }`. The `dolang_session` cookie rides the same-origin beacon to
`/api/log` automatically; the route handler verifies its HS256 signature against
`JWT_SECRET` (`verifyJwt`, zero-dep `node:crypto`) and takes `userId`/`email`
from the verified `sub`/`email`.

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

The browser must only ever see `dolang.website`. `api.dolang.website` still
exists — it's the proxy's upstream, not something the browser hits.

1. **Render** — custom domain `api.dolang.website` on the API service + DNS
   `CNAME` (already in place).
2. **Google Cloud Console** → OAuth client → Authorized redirect URIs → add
   **`https://dolang.website/api/v1/auth/google/callback`** (keep the
   `api.dolang.website` one during the transition).
3. **Render env:**
   - `GOOGLE_CALLBACK_URL=https://dolang.website/api/v1/auth/google/callback`
   - `WEB_URL=https://dolang.website`
   - `NODE_ENV=production` (makes the cookie `Secure`)
   - `COOKIE_DOMAIN` can be removed — it's no longer read
   - `JWT_SECRET` — unchanged
4. **Vercel env:**
   - `API_PROXY_TARGET=https://api.dolang.website/api/v1/:path*` — **required**
     (must end `/:path*`); the build throws without it in production.
   - `JWT_SECRET` — unchanged (used by `/api/log`).
   - `NEXT_PUBLIC_API_URL` is no longer read — the frontend hardcodes the
     relative `/api/v1` base — so any stale value is harmless.
5. Redeploy **both**. Existing sessions are dead — users log in once more.

Local dev: nothing to set — `API_PROXY_TARGET` defaults to
`http://localhost:4000/api/v1/:path*`; cookie is host-only and not `Secure`.

### Why the proxy

A cookie set on `api.dolang.website` and returned to a `fetch()` on a
`dolang.website` page is a **cross-origin** `Set-Cookie`. iOS Safari's tracking
protection drops it (desktop browsers keep it), so login/register silently
bounce back to `/login` and OAuth never authenticates. Routing every API call
under `dolang.website/api/v1/*` makes `dolang_session` first-party, which Safari
keeps. CORS also stops mattering (same-origin), though the API keeps its
allow-list for direct hits.

---

## 4. Verification

**Local** (`npm run dev`) — everything via `http://localhost:3000/api/v1/*`:
- `POST /api/v1/auth/register` (or `/auth/login`) → `Set-Cookie: dolang_session;
  HttpOnly; SameSite=Lax` with **no `Domain`**; body is `{ user }` only.
- `GET /api/v1/users/me` with that cookie → `200`; without → `401`.
- `POST /api/v1/auth/logout` → `Set-Cookie: dolang_session=; Expires=1970`.
- `GET /api/v1/auth/google` → `302` to `accounts.google.com` (proxy passes
  redirects through).
- `/api/log` (Next route, not proxied) → `[REQUEST]` line shows the real
  `userId` from the cookie.
  *(All verified locally on this branch.)*

**Type/lint:** `apps/api` + `apps/web` `tsc --noEmit` clean; `apps/web` eslint
clean on the changed files (`speak/page.tsx` has pre-existing `Date.now`-in-
render errors unrelated to this change; Vercel builds tolerate them).

**Production** (after the runbook + deploy of both):
- `curl -i https://dolang.website/api/v1/auth/login -H 'content-type: application/json' -d '{"email":"x","password":"y"}'`
  → proxied to Render; a real login shows `Set-Cookie: dolang_session=…; Secure;
  SameSite=Lax; HttpOnly` with **no `Domain`**.
- Desktop **and iPhone Safari**: email/pw, register, and Google login all land
  on `/dashboard` authenticated; hard refresh persists; incognito same; Vercel
  `[REQUEST]` shows the real `userId`.
- DevTools → Application → Cookies → `https://dolang.website`: `dolang_session`
  present, `HttpOnly ✓ Secure ✓`, absent from `document.cookie`.

---

## 5. History

- The old model: JWT in `localStorage`, sent as `Authorization: Bearer`; Google
  OAuth used a one-time code held in an **in-memory `Map` on the API**, traded
  for the token by a client-side `/callback` page.
- That map did not survive Render restarts / cold starts, so the exchange could
  hang (→ iPhone stuck on the callback spinner) or the client never stored a
  token (→ every request logged `anonymous`).
- Moving to an HttpOnly cookie set directly on the OAuth redirect removed the
  exchange step, the in-memory state, and the `localStorage` token entirely.
- First cookie attempt kept the API on `api.dolang.website` with a
  `Domain=.dolang.website` cookie. Works on desktop; iOS Safari drops a
  cross-subdomain `Set-Cookie` from `fetch()` — so the API moved behind a
  same-origin proxy (`dolang.website/api/v1/*`) and the cookie became host-only.

---

## 6. Not done

- Opaque / DB-backed sessions with server-side revocation. The session is still a
  stateless JWT; logout clears the cookie but a copied token stays valid until
  its 7-day expiry.
- Refresh-token rotation.
