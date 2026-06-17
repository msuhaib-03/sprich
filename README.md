# Sprich — Learn German Properly

> The first German learning app that teaches you **WHY**, not just what.

## What makes Sprich different

Every other app teaches you sentences. We teach you the logic behind them.

- **Color-coded grammar cases** — Nominative, Accusative, Dative, Genitive always in the same colors
- **The WHY behind every rule** — Why does `ein` become `einen`? We explain it. Every time.
- **AI conversation partner** — Speaks back, corrects in real-time, gradually adds pressure
- **Public speaking confidence ladder** — From solo practice → time pressure → background noise → real-world readiness
- **Goal-aware curriculum** — Job in Germany? Visa? Citizenship? Path adapts to your life
- **Spaced repetition** — SM-2 algorithm schedules reviews exactly when your brain is about to forget
- **Level certificates** — A1 through C2, shareable on LinkedIn

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| AI | Claude API (Anthropic) |
| Speech-to-text | Deepgram |
| Text-to-speech | ElevenLabs |
| Auth | JWT (email/password) |
| Payments | Stripe |
| Storage | Cloudflare R2 |
| Infra | Vercel (web) + Railway (api) |

## Project structure

```
sprich/
├── apps/
│   ├── web/          Next.js frontend
│   └── api/          NestJS REST API
├── packages/
│   ├── types/        Shared TypeScript types
│   └── db/           Prisma schema + migrations
└── content/
    └── curriculum/   Lesson content JSON (A1–C2)
```

## Getting started

```bash
git clone https://github.com/msuhaib-03/sprich.git
cd sprich
npm install

cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
# fill in your keys

cd packages/db && npx prisma migrate dev && npx prisma db seed
cd ../.. && npm run dev
```

Web: http://localhost:3000
API: http://localhost:4000/api/v1

## Grammar color system

| Color | Case | Role |
|---|---|---|
| Blue | Nominative | The subject — who does the action |
| Orange | Accusative | Direct object — what receives the action |
| Green | Dative | Indirect object — to/for whom |
| Purple | Genitive | Possession |

Article genders: Blue `der` (masculine) · Pink `die` (feminine) · Green `das` (neuter)
