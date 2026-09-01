# Virevos

**All-in-one platform for freelancers and service professionals** to manage clients, automate workflows, and collaborate — powered by AI.

---

## Overview

Virevos is a SaaS platform that centralises the tools freelancers need to run their business:

- Manage clients, cases, projects, and tasks in one place
- Hold video meetings with automatic recording, transcription, and AI-generated summaries
- Use an AI assistant to add clients, create tasks, and query past meeting data
- Talk to a real-time voice AI agent inside meetings (LiveKit Agents)
- Automate repetitive workflows and sync email/calendar with Outlook (Microsoft Graph)
- Communicate with clients via a unified inbox and shareable client portals
- Track revenue and productivity with a built-in analytics dashboard

---

## Features

- **Client & Case Management** — Centralised workspace for clients, cases, tasks, and files
- **AI Assistant** — GPT-5 powered chat with tool use (add clients, create tasks, search meeting transcripts)
- **Real-time Voice Agent** — LiveKit Agents worker that joins meetings as an AI participant
- **Built-in Video Meetings** — LiveKit-powered calls with automatic recording, transcription, and AI summaries
- **Communications Hub** — Unified inbox for emails and client messages with AI reply suggestions
- **Outlook Integration** — Two-way email and calendar sync via Microsoft Graph with subscription (webhook) renewals
- **Scheduled & Automated Email** — Queue and send email with HTML sanitization; transactional email via Resend
- **Client Portal** — Shareable portals for client communication, bookings, and document/file requests
- **Analytics Dashboard** — Revenue tracking and productivity metrics
- **Subscription Billing** — Stripe-powered plans with feature limits and AI credit tracking

---

## Tech Stack

| Layer            | Technologies                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Frontend         | Next.js 16 (App Router), React 19 (React Compiler), TypeScript, Tailwind CSS v4, Radix UI, TanStack Query, Motion |
| Backend          | Next.js API Routes — all reads and mutations (GET/POST/PATCH/PUT/DELETE), no Server Actions                       |
| AI               | OpenAI GPT-5 (Responses API, streaming, tool use); OpenAI embeddings for semantic search                          |
| Voice Agent      | LiveKit Agents (`@livekit/agents`, OpenAI + Silero plugins)                                                       |
| Video            | LiveKit (recording, transcription)                                                                                |
| Database         | PostgreSQL, Drizzle ORM                                                                                           |
| Auth             | Supabase Auth                                                                                                     |
| Storage          | Supabase Storage (S3-compatible)                                                                                  |
| Email / Calendar | Microsoft Outlook (Graph API); Resend for transactional email                                                     |
| Payments         | Stripe                                                                                                            |
| Testing          | Vitest — node project (API/lib), browser project (React, Playwright-driven), integration project (Testcontainers Postgres) |

---

## Project Structure

```
virevos/
├── app/
│   ├── api/                  # All GET/POST/PATCH/PUT/DELETE endpoints and webhooks
│   │   ├── chat/             # AI assistant (streaming)
│   │   ├── billing/  clients/  cases/  tasks/  events/  files/  meetings/
│   │   ├── outlook/          # Outlook OAuth callback, messages, sync
│   │   ├── integrations/     # Integration connect/disconnect (Outlook)
│   │   ├── scheduled-emails/  document-requests/  demo-requests/  user/
│   │   ├── token/            # LiveKit room tokens
│   │   ├── recording/  transcript/
│   │   ├── portal/  portal-bookings/  portal-chat/   # Client portal public API
│   │   ├── cron/             # Vercel cron jobs
│   │   └── webhooks/         # stripe, outlook, livekit
│   ├── workspace/            # Authenticated app pages (dashboard, clients, cases, tasks,
│   │   │                     #   calendar, billing, communications, settings)
│   ├── meet/[roomId]/        # Video meeting room
│   ├── portal/[token]/       # Client portal
│   ├── hooks/                # Shared React hooks (useAuthUser, useCalcWindow)
│   └── (marketing)/          # Landing, pricing, features, blog
├── lib/                       # Business logic, called directly from app/api route handlers
│   ├── ai/                   # ai_tools.ts (OpenAI tools/agent), document_analysis.ts
│   ├── workspace/            # clients, cases, tasks, meetings, calendar, billing
│   ├── outlook/               # outlook_actions.ts, outlook_sync.ts, outlook_access.ts, outlook_attachments.ts
│   ├── portal/                # portal_settings.ts, portal_chat.ts, portal_bookings.ts, portal_page.ts,
│   │                          #   portal_file_uploads.ts, portal_document_uploads.ts, portal_token_route.ts
│   ├── supabase/              # Supabase server/client/middleware helpers
│   ├── util/                  # validation.ts, html_sanitizer.ts, api_error.ts, rate_limit.ts, date_utils.ts, ...
│   ├── embeddings.ts          # OpenAI embeddings for semantic transcript search
│   ├── scheduled_emails.ts  plan_limits.ts  integrations.ts  document_requests.ts  user.ts  ...
├── api_client/                 # Thin, mockable wrappers around external SDKs
│   ├── axios_api_client.ts    # Axios wrapper interface used by lib/*
│   ├── openai_client.ts  resend_client.ts  stripe_client.ts  livekit_client.ts
│   ├── supabase_storage_client.ts
│   └── ms_graph/               # graph_auth_service, graph_calendar_service, graph_mail_service, ...
├── db/
│   ├── schema.ts              # Drizzle schema
│   ├── db.ts                  # Drizzle client (`db`, `DrizzleDB` type)
│   ├── classes/                # Repository classes per domain (ClientsDB, TasksDB, ...),
│   │   │                       #   each wraps typed Drizzle queries and is injected into lib/* functions
│   └── migrations/
├── livekit/
│   ├── src/agent/agent.ts     # LiveKit Agents voice worker (bundled with esbuild)
│   └── tsconfig.json
├── types/                       # Shared TypeScript types (ai, billing, cases, clients, tasks, portal, ...)
└── __tests__/                  # Vitest suites (api/, lib/, react/, integration/, fakes/, msw/, _helpers/)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Accounts for: Supabase, OpenAI, LiveKit, Stripe, Microsoft Azure (Outlook/Graph app), Resend

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

For webhook testing locally, use ngrok and set `NEXT_PUBLIC_APP_URL_NGROK` to your tunnel URL.

### Database Setup

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### LiveKit Voice Agent

The real-time voice agent lives in `livekit/` and runs as a separate worker process:

```bash
npm run livekit:typecheck      # Type-check the agent
npm run livekit:build          # Bundle to livekit/dist/agent.mjs (esbuild, node20, ESM)
npm run livekit:download-files # Download required model/runtime files
npm run livekit:start          # Start the agent worker
```

### Environment Variables

Create a `.env.local` file in the root:

```bash
# Database
DATABASE_URL=

# Supabase (auth + storage)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_API_SECRET=
SUPABASE_S3_ACCESS_KEY_ID=
SUPABASE_S3_SECRET_ACCESS_KEY=

# OpenAI
OPENAI_API_KEY=

# Outlook / Microsoft Graph
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_REDIRECT_URI=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PROFESSIONAL_MONTHLY=
STRIPE_PRICE_BUSINESS_MONTHLY=

# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_URL_NGROK=

# Cron
CRON_SECRET=
```

---

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint
npm test                 # Run Vitest node + browser projects (single run)
npm run test:watch       # Vitest watch mode (node + browser projects)
npm run test:integration # Run the integration project (Testcontainers Postgres)
npm run format            # Prettier
```

Ad-hoc debug scripts (run directly against your configured environment, not part of CI):

```bash
npm run test-semantic-search  # Exercise embeddings-based transcript search
npm run test-vector-upload    # Exercise embedding generation/upload
npm run test-vector-create    # Exercise embedding creation
```

---

## Architecture Notes

### API Routes & Business Logic

All reads and mutations are implemented as Next.js API Routes under `app/api/**` (no Server Actions). Route handlers stay thin: they authenticate the request, then call into `lib/*` business-logic functions, which take a repository instance from `db/classes/` (e.g. `ClientsDB`, `TasksDB`) as a parameter for the actual Drizzle queries — this keeps the DB layer swappable/mockable in tests. External services (OpenAI, Stripe, Resend, LiveKit, Supabase Storage, Microsoft Graph) are wrapped by small typed clients in `api_client/` for the same reason. The frontend calls API routes via Axios and TanStack Query (`useQuery` for GET, `useMutation` for POST/PATCH/PUT/DELETE, with optimistic updates).

### AI Assistant

Uses the OpenAI Responses API with streaming via `openai.responses.stream()` (model `gpt-5`). The agent loop chains requests via `previous_response_id` and supports a bounded number of tool-call steps per turn. Tools and config live in `lib/ai/ai_tools.ts`. Output streams to the client as newline-delimited JSON events.

### Semantic Search

Meeting transcripts are embedded with OpenAI embeddings (`lib/embeddings.ts`) and stored in Postgres for semantic retrieval by the AI assistant — no external vector database.

### Real-time Voice Agent

A LiveKit Agents worker (`livekit/src/agent/agent.ts`, built with esbuild) joins meeting rooms as an AI participant using the OpenAI and Silero plugins. It runs as a standalone Node process, separate from the Next.js app.

### Outlook Integration

Email and calendar sync via Microsoft Graph, via the `api_client/ms_graph/` services and `lib/outlook/`. OAuth is handled under `app/api/outlook/`; change notifications arrive at `/api/webhooks/outlook`. Graph subscriptions are renewed on a schedule by the `renew-outlook-subscriptions` cron job.

### Video Meetings

LiveKit rooms with server-side token generation (`/api/token`). Recordings notify `/api/webhooks/livekit`, which kicks off transcription; transcripts are then embedded for semantic search.

### Cron Jobs

Vercel cron routes under `app/api/cron/`: `credit-reset`, `process-scheduled-emails`, and `renew-outlook-subscriptions`. All are protected by `CRON_SECRET`.

---

## Testing

```bash
npm test               # Run node + browser test projects (vitest run)
npm run test:watch     # Watch mode
npm run test:integration # Integration project (spins up a real Postgres via Testcontainers)
```

Tests live in `__tests__/` (`api/`, `lib/`, `react/`, `integration/`, `fakes/`, `msw/`, `_helpers/`), covering success, error, and edge cases. Vitest is configured with three projects:

- **node** — API route and `lib/` unit tests (`__tests__/api/**`, `__tests__/lib/**`)
- **browser** — React component tests run in a real headless Chromium via `@vitest/browser-playwright` (`__tests__/react/**`); files run sequentially since they share one browser instance and MSW worker
- **integration** — end-to-end tests against a real Postgres container (`__tests__/integration/**`), also run sequentially since each file shares and resets the same database

Note: the React Compiler is enabled in `next.config` for the app build but not in the Vitest run, so component tests execute uncompiled.
