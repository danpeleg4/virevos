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
- **Analytics & Weekly Summaries** — Revenue tracking, productivity metrics, and emailed weekly summaries
- **Subscription Billing** — Stripe-powered plans with feature limits and AI credit tracking

---

## Tech Stack

| Layer         | Technologies                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Frontend      | Next.js 16 (App Router), React 19 (React Compiler), TypeScript, Tailwind CSS v4, Radix UI, TanStack Query, Motion |
| Backend       | Next.js API Routes (GET), Server Actions (mutations)                                             |
| AI            | OpenAI GPT-5 (Responses API, streaming, tool use); OpenAI embeddings for semantic search        |
| Voice Agent   | LiveKit Agents (`@livekit/agents`, OpenAI + Silero plugins)                                      |
| Video         | LiveKit (recording, transcription)                                                              |
| Database      | PostgreSQL, Drizzle ORM                                                                          |
| Auth          | Supabase Auth                                                                                    |
| Storage       | Supabase Storage (S3-compatible)                                                                 |
| Email / Calendar | Microsoft Outlook (Graph API); Resend for transactional email                                 |
| Payments      | Stripe                                                                                           |
| Testing       | Vitest (`@vitejs/plugin-react`, jsdom)                                                           |

---

## Project Structure

```
virevos/
├── app/
│   ├── api/                  # GET endpoints and webhooks
│   │   ├── chat/             # AI assistant (streaming)
│   │   ├── billing/
│   │   ├── clients/  cases/  tasks/  events/  files/
│   │   ├── outlook/          # Outlook OAuth, messages, sync
│   │   ├── integrations/     # Integration connect/disconnect (Outlook)
│   │   ├── token/            # LiveKit room tokens
│   │   ├── recording/  transcript/
│   │   ├── portal/  portal-chat/   # Client portal public API
│   │   ├── scheduled-emails/  document-requests/  user/
│   │   ├── cron/             # Vercel cron jobs
│   │   └── webhooks/         # stripe, outlook, livekit
│   ├── workspace/            # Authenticated app pages
│   ├── meet/[roomId]/        # Video meeting room
│   ├── portal/[token]/       # Client portal
│   └── (marketing)/          # Landing, pricing, features
├── lib/
│   ├── ai/                   # ai_tools.ts (OpenAI tools/agent), document_analysis.ts
│   ├── workspace/            # Mutations: clients, cases, tasks, meetings, calendar, billing
│   ├── outlook/              # outlook_actions.ts, outlook_sync.ts, outlook_access.ts
│   ├── supabase/             # Supabase server/client helpers
│   ├── util/                 # validation.ts, html_sanitizer.ts
│   ├── embeddings.ts         # OpenAI embeddings for semantic transcript search
│   ├── resend.ts  weekly_summary.ts  scheduled_emails.ts  stripe.ts  storage.ts
│   └── ...                   # portal_*, integrations, plan_limits, user, etc.
├── livekit/
│   ├── src/agent/agent.ts    # LiveKit Agents voice worker (bundled with esbuild)
│   └── tsconfig.json
├── db/
│   ├── schema.ts             # Drizzle schema
│   └── migrations/
└── __tests__/                # Vitest suites (api/, lib/, react/, _helpers/)
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
npm run dev        # Start development server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npm test           # Run Vitest (single run)
npm run test:watch # Vitest watch mode
npm run format     # Prettier
```

---

## Architecture Notes

### AI Assistant

Uses the OpenAI Responses API with streaming via `openai.responses.stream()` (model `gpt-5`). The agent loop chains requests via `previous_response_id` and supports a bounded number of tool-call steps per turn. Tools and config live in `lib/ai/ai_tools.ts`. Output streams to the client as newline-delimited JSON events.

### Semantic Search

Meeting transcripts are embedded with OpenAI embeddings (`lib/embeddings.ts`) and stored in Postgres for semantic retrieval by the AI assistant — no external vector database.

### Real-time Voice Agent

A LiveKit Agents worker (`livekit/src/agent/agent.ts`, built with esbuild) joins meeting rooms as an AI participant using the OpenAI and Silero plugins. It runs as a standalone Node process, separate from the Next.js app.

### Outlook Integration

Email and calendar sync via Microsoft Graph. OAuth is handled under `app/api/outlook/`; change notifications arrive at `/api/webhooks/outlook`. Graph subscriptions are renewed on a schedule by the `renew-outlook-subscriptions` cron job.

### Video Meetings

LiveKit rooms with server-side token generation (`/api/token`). Recordings notify `/api/webhooks/livekit`, which kicks off transcription; transcripts are then embedded for semantic search.

### Data Mutations

POST/PATCH/PUT/DELETE operations are implemented as Next.js Server Actions, organized under `lib/workspace/`, `lib/outlook/`, and flat `lib/*.ts` modules, called via TanStack Query `useMutation` hooks. GET operations use `/api` routes with `useQuery`. Inputs are validated with `lib/util/validation.ts`; outbound email HTML is sanitized with `lib/util/html_sanitizer.ts`.

### Cron Jobs

Vercel cron routes under `app/api/cron/`: `credit-reset`, `process-scheduled-emails`, `renew-outlook-subscriptions`, and `weekly-summary`. All are protected by `CRON_SECRET`.

---

## Testing

```bash
npm test              # Run all tests (vitest run)
npm run test:watch    # Watch mode
```

Tests live in `__tests__/` (`api/`, `lib/`, `react/`, `_helpers/`), covering success, error, and edge cases. Vitest is configured with `@vitejs/plugin-react` and a jsdom environment for React component tests. Note: the React Compiler is enabled in `next.config` for the app build but not in the Vitest run, so tests execute uncompiled.
