# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

doLang (formerly "Sprich") — a German learning app that teaches grammar _rules_ with the underlying WHY, not just rote sentences. See `README.md` for the product pitch and `Architecture.txt` for the full curriculum design doc (chapter-by-chapter lesson plan, the psychological engagement loop, free-vs-premium matrix).

npm workspaces + Turborepo monorepo:

```
apps/
  web/    Next.js 16 (App Router), TypeScript, Tailwind CSS v4
  api/    NestJS (TypeScript), runs via ts-node in dev
packages/
  types/  Shared TypeScript types (@dolang/types) — mirrors the Prisma schema's shape by hand; keep both in sync manually when changing models
  db/     Prisma schema, migrations, and the curriculum seed script
content/
  curriculum/   Lesson content as JSON, one file per chapter (a1-chapter-XX-*.json, a2-...). Seeded into Postgres — not read at runtime.
```

## Commands

Run from the repo root unless noted. Turbo fans these out to all workspaces.

```bash
npm run dev              # turbo run dev — starts web (:3000) and api (:4000) concurrently
npm run build             # turbo run build
npm run lint               # turbo run lint (web: eslint; api: tsc --noEmit)
npm run format              # prettier --write across the repo

npm run db:generate          # turbo run db:generate — regenerate Prisma client (also runs on postinstall)
npm run db:migrate            # turbo run db:migrate — create/apply a dev migration
npm run db:deploy              # turbo run db:deploy — apply migrations in prod (no schema drift prompt)
npm run db:studio               # Prisma Studio GUI
```

Per-app, when you need just one side:

```bash
cd apps/web && npm run dev     # next dev only
cd apps/api && npm run dev      # ts-node -r tsconfig-paths/register src/main.ts

cd packages/db && npx prisma migrate dev    # new migration
cd packages/db && npx prisma db seed          # re-seed curriculum content (idempotent-ish; run after schema reset or on a fresh machine)
```

There is no test suite in this repo currently — `lint` is the only automated check (`api`'s "lint" is actually a `tsc --noEmit` type check, not eslint).

First-time / fresh-machine setup (from `README.md`):

```bash
npm install
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
# fill in keys
cd packages/db && npx prisma migrate dev && npx prisma db seed
cd ../.. && npm run dev
```

Windows-specific gotcha noted in `Architecture.txt`: if the API port hangs on restart, `npx kill-port 4000` (or reboot) before `npm run dev` again.

## Architecture

**API prefix & CORS.** The Nest app (`apps/api/src/main.ts`) serves everything under `/api/v1` except the bare `/` health check. CORS is origin-allowlisted at runtime from `WEB_URL` (comma-separated) plus `localhost:3000` and any `*.vercel.app` origin (for preview deploys) — extend `configuredOrigins`/`vercelPreviewPattern` there, not with a wildcard.

**Module layout.** Each domain is a self-contained Nest module under `apps/api/src/<domain>/` (`auth`, `users`, `lessons`, `vocabulary`, `speaking`, `progress`, `subscriptions`, `ai`), wired into `AppModule`. `PrismaModule`/`PrismaService` (a thin `PrismaClient` wrapper) is injected wherever DB access is needed — there's no repository layer.

**Auth.** JWT-based (`@nestjs/passport` + `passport-jwt`), plus Google OAuth (`passport-google-oauth20`). Passwords are optional on `User` (`passwordHash?`) since Google-only accounts have none. Two points to know before touching auth:

- Google login only trusts `profile.emails[0].value` after checking `verified === true` — an unverified email must never be used to match/link an existing account.
- Post-OAuth redirects never put the real JWT in the URL. The callback carries a short-lived, single-use exchange code; the frontend trades it for a token via `POST /auth/oauth/exchange` (an in-memory `Map` on the API — fine for a single-server deployment, would need a shared store like Redis if scaled to multiple instances).
- The web app stores the JWT in `localStorage` (`dolang_token`) via `store/auth.ts` (Zustand + persist), attached as `Authorization: Bearer` in `apps/web/lib/api.ts`'s `request()` helper. All frontend API calls should go through the `api.get/post/patch` helpers there, not raw `fetch`.

**Multi-provider AI (`apps/api/src/ai/ai.service.ts`).** One service abstracts three backends behind a single `complete()` call: Anthropic (Claude), Gemini, and Groq. Provider selection is automatic — `AI_PROVIDER` env var forces one, otherwise it picks Claude → Gemini → Groq by whichever API key is present. Each provider has its own request/response shape (Groq and Gemini are called via raw `fetch`, not SDKs) but all funnel into the same `ChatMessage[]` interface. When adding a new AI feature, add a method to this service and call `this.complete()` — don't reach for a provider SDK directly elsewhere. Public feature methods (`speakingTurn`, `translateText`, `explainSentence`, `explainGrammar`, `evaluateSession`, `generateWeeklyReport`) parse structured JSON out of trailing/fenced blocks in the model's prose response — follow that pattern (prompt for a JSON tail, regex it out, `try/catch` parse with a safe fallback) rather than requesting JSON-only mode.

**Data model (`packages/db/prisma/schema.prisma`).** Curriculum is `Chapter` → `Lesson` → `Exercise`/`LessonVocab`. Lesson content is a hybrid: structured columns (`hook`, `explain`) plus a `contentJson` blob holding the full `LessonContent` shape. `VocabWord` is the canonical vocab table; `SRSCard` implements SM-2 spaced repetition per user/word (`easeFactor`, `interval`, `repetitions`, `nextReview`). `DictionaryEntry` is separate — bulk-imported FreeDict data (see Licensing below), not lesson-authored vocab.

**Curriculum content pipeline.** Authoring happens in `content/curriculum/*.json` (one file per chapter, shape defined inline in `packages/db/src/seed.ts`'s `CurriculumFile`/`CurriculumLesson` types). `prisma db seed` reads that directory and upserts into `Chapter`/`Lesson`/`Exercise`/`VocabWord`/`LessonVocab`. The app never reads these JSON files at runtime — only the seed script does. When adding/editing lessons, edit the JSON and re-seed; don't hand-write DB rows.

**Shared types (`packages/types`).** `@dolang/types` is consumed by both `apps/web` and `apps/api` (path-mapped in each `tsconfig.json`) but is _not_ generated from the Prisma schema — it's a hand-maintained mirror. When you change a Prisma model that has a frontend-visible shape, update `packages/types/src/index.ts` too.

**Grammar color coding.** Nominative=blue, Accusative=orange, Dative=green, Genitive=purple; article genders der=blue, die=pink, das=green (see README for exact hex-adjacent semantics). This mapping is core to the product's differentiator and shows up in curriculum JSON (`breakdown[].color`), lesson UI components, and the color table in `README.md` — keep new UI consistent with it rather than inventing new colors.

## Licensing constraint

The in-app dictionary (`DictionaryEntry`, populated via `packages/db/src/import-dictionary.ts` from FreeDict) is GPLv3/AGPLv3-licensed data, not app code — see `NOTICE.md`. Practical implications: attribution must stay visible in the dictionary UI, and if dictionary lookups are ever exposed as a network service, the AGPL source-availability obligation applies. Don't remove the credit line or swap in this data source elsewhere without checking `NOTICE.md` first.
