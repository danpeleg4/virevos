# Virevos

**All-in-one platform for freelancers and service professionals** to manage clients, automate workflows, and collaborate — powered by AI.

---

## Overview

Virevos is a SaaS platform that centralises the tools freelancers need to run their business:

- Manage clients, projects, and tasks in one place
- Hold video meetings with automatic recording, transcription, and AI-generated summaries
- Use an AI assistant to add clients, create projects, and query past meeting data
- Automate repetitive workflows and sync with Google Calendar
- Communicate with clients via a unified inbox and shareable client portals
- Track revenue and productivity with a built-in analytics dashboard

---

## Features

- **Client & Project Management** — Centralised workspace for clients, projects, tasks, and files
- **AI Assistant** — GPT-5 powered chat with tool use (add clients, create projects, search meeting transcripts)
- **Built-in Video Meetings** — LiveKit-powered calls with automatic recording, transcription, and AI summaries
- **Communications Hub** — Unified inbox for emails and client messages with AI reply suggestions
- **Google Calendar Sync** — Two-way sync with real push notifications and incremental updates
- **Workflow Automation** — Trigger-based automations for emails, tasks, and client onboarding
- **Client Portal** — Shareable portals for client communication and file sharing
- **Analytics Dashboard** — Revenue tracking, client activity insights, and productivity metrics
- **Subscription Billing** — Stripe-powered plans with feature limits (Starter, Professional, Business)

---

## Tech Stack

| Layer         | Technologies                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Frontend      | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI, TanStack Query, Motion |
| Backend       | Next.js API Routes, Server Actions                                                               |
| AI            | OpenAI GPT-5 (Responses API, streaming, tool use)                                                |
| Video         | LiveKit (recording, transcription)                                                               |
| Database      | PostgreSQL, Drizzle ORM                                                                          |
| Vector Search | Pinecone (meeting transcript semantic search)                                                    |
| Auth          | Clerk                                                                                            |
| Storage       | Supabase (S3-compatible)                                                                         |
| Email         | Gmail API                                                                                        |
| Payments      | Stripe                                                                                           |
| Testing       | Jest, babel-jest                                                                                 |

---

## Project Structure

```
virevos/
├── app/
│   ├── api/                  # GET endpoints and webhooks
│   │   ├── chat/             # AI assistant (streaming)
│   │   ├── billing/
│   │   ├── google/           # Google OAuth flow
│   │   ├── gmail/            # Gmail sync and send
│   │   ├── token/            # LiveKit room tokens
│   │   ├── portal/           # Client portal public API
│   │   ├── cron/             # Vercel cron jobs
│   │   └── webhooks/         # Stripe, Clerk, Google, LiveKit, Supabase
│   ├── workspace/            # Authenticated app pages
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── projects/
│   │   ├── tasks/
│   │   ├── calendar/
│   │   ├── communications/
│   │   ├── billing/
│   │   └── settings/
│   ├── meet/[roomId]/        # Video meeting room
│   ├── portal/[token]/       # Client portal
│   └── (marketing)/          # Landing, pricing, features, blog
├── lib/
│   ├── server_actions/       # Mutations: clients, projects, tasks, meetings, etc.
│   ├── ai_tools.ts           # OpenAI tools and agent config
│   ├── google_sync.ts        # Google Calendar sync logic
│   └── billing.ts            # Stripe helpers
├── db/
│   ├── schema.ts             # Drizzle schema
│   └── migrations/
└── __tests__/                # Jest test suites
    ├── api/
    └── lib/
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Accounts for: Clerk, OpenAI, LiveKit, Supabase, Stripe, Google Cloud, Pinecone

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

### Environment Variables

Create a `.env.local` file in the root:

```bash
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# OpenAI
OPENAI_API_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PROFESSIONAL_MONTHLY=
STRIPE_PRICE_BUSINESS_MONTHLY=

# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_HOST=
NEXT_PUBLIC_LIVEKIT_URL=

# Supabase
SUPABASE_URL=
SUPABASE_API_SECRET=
SUPABASE_S3_ACCESS_KEY_ID=
SUPABASE_S3_SECRET_ACCESS_KEY=
SUPABASE_WEBHOOK_SECRET=

# Pinecone
PINECONE_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_URL_NGROK=

# Cron
CRON_SECRET=
```

---

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
npm test          # Run Jest tests
```

---

## Architecture Notes

### AI Assistant

Uses the OpenAI Responses API with streaming via `openai.responses.stream()`. The agent loop chains requests via `previous_response_id` and supports up to 5 tool-call steps per conversation. Available tools include client management, project creation, and semantic meeting transcript search. Streamed as newline-delimited JSON events.

### Google Calendar Sync

Real push notifications via `calendar.events.watch()`. Uses sync tokens for incremental updates; falls back to full sync on 410 Gone. The webhook at `/api/webhooks/google` authenticates via `X-Goog-Channel-Token` (userId). Requires a publicly accessible HTTPS URL (`NEXT_PUBLIC_APP_URL`).

### Video Meetings

LiveKit rooms with server-side token generation. Recordings upload to Supabase, triggering a Supabase webhook that kicks off transcription. Transcripts are embedded into Pinecone for semantic search by the AI assistant.

### Data Mutations

POST/PATCH/DELETE operations are implemented as Next.js Server Actions in `lib/server_actions/` and called via TanStack Query `useMutation` hooks. GET operations use `/api` routes with `useQuery`.

---

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

Tests live in `__tests__/api/` and `__tests__/lib/`, covering success cases, error cases, and edge cases. The Jest config uses dual environments: `node` for API/lib and `jsdom` for React.
