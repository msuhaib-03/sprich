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
through a same-origin proxy — `next.config.ts` rewrites `/api/v1/*` to the real
API host:

| | Production | Local dev |
|---|---|---|
| web + API origin (browser) | `https://dolang.website` | `http://localhost:3000` |
| proxy forwards to (`API_PROXY_TARGET`) | `https://api.dolang.website/api/v1/*` (Render) | `http://localhost:4000/api/v1/*` |

So `dolang_session` is a plain **first-party** cookie on `dolang.website`.
`SameSite=Lax` + first-party is what iOS Safari keeps — a **cross-subdomain**
cookie set via `fetch()` (`dolang.website` page ← `api.dolang.website` response)
is dropped by Safari's tracking protection, which is why the proxy exists. **No
`SameSite=None`, no `Domain`.**

Where it's defined: `apps/api/src/auth/session-cookie.ts`
(`setSessionCookie` / `clearSessionCookie`; `secure` from `NODE_ENV`).

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

API calls are proxied through `dolang.website`, so the API's own logs sit on the
Render side. To also see them in Vercel's logs (one place, with the acting user),
`apps/web/lib/api.ts` fires a fire-and-forget `navigator.sendBeacon` to
`apps/web/app/api/log/route.ts` for every `api.*` call. It emits one line:

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
   `CNAME` (already done).
2. **Google Cloud Console** → OAuth client → Authorized redirect URIs → add
   **`https://dolang.website/api/v1/auth/google/callback`** (keep the
   `api.dolang.website` one during the transition).
3. **Render env:**
   - `GOOGLE_CALLBACK_URL=https://dolang.website/api/v1/auth/google/callback`
   - `WEB_URL=https://dolang.website`
   - `NODE_ENV=production` (makes the cookie `Secure`)
   - **remove `COOKIE_DOMAIN`** (cookie is host-only now)
   - `JWT_SECRET` — unchanged
4. **Vercel env:**
   - `NEXT_PUBLIC_API_URL=/api/v1`  *(relative — same origin)*
   - `API_PROXY_TARGET=https://api.dolang.website/api/v1/:path*`  *(must end `/:path*`)*
   - `JWT_SECRET` — same value as Render (used by `/api/log`)
5. Redeploy **both**. Existing sessions are dead — users log in once more.

Local dev: `apps/web/.env.local` → `NEXT_PUBLIC_API_URL=/api/v1`; leave
`API_PROXY_TARGET` unset (defaults to `http://localhost:4000/api/v1/:path*`);
no `COOKIE_DOMAIN`; `NODE_ENV !== 'production'` → cookie not `Secure`.

### Why the proxy

A cookie set on `api.dolang.website` and returned to a `fetch()` on a
`dolang.website` page is a **cross-origin** `Set-Cookie`. iOS Safari's tracking
protection drops it (desktop browsers keep it). Routing every API call under
`dolang.website/api/v1/*` makes `dolang_session` first-party, which Safari keeps.
CORS also stops mattering (same-origin), though the API keeps its allow-list for
direct hits.

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
- `curl -i https://dolang.website/api/v1/auth/login -d '{"email":"x","password":"y"}' -H 'content-type: application/json'`
  → the proxy forwards to Render; response comes back through `dolang.website`.
- A real login `curl -i` shows `Set-Cookie: dolang_session=…; Secure; SameSite=Lax;
  HttpOnly` with **no `Domain`** attribute.
- Desktop **and iPhone Safari**: email/pw, register, and Google login all land on
  `/dashboard` authenticated; hard refresh persists; incognito behaves the same;
  Vercel `[REQUEST]` shows the real `userId`.
- DevTools → Application → Cookies → `https://dolang.website`: `dolang_session`
  present, `HttpOnly ✓ Secure ✓`, not visible in `document.cookie`.

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
- First attempt kept the API on `api.dolang.website` with a
  `Domain=.dolang.website` cookie. That works on desktop but iOS Safari drops a
  cross-subdomain `Set-Cookie` from `fetch()` — so the API moved behind a
  same-origin proxy (`dolang.website/api/v1/*`) and the cookie became host-only.

---

## 6. Not done

- Opaque / DB-backed sessions with server-side revocation. The session is still a
  stateless JWT; logout clears the cookie but a copied token stays valid until
  its 7-day expiry.
- Refresh-token rotation.
