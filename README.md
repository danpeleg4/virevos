# Virevos

**All-in-one platform for freelancers and service professionals** to manage clients, automate workflows, and collaborate — powered by AI.

---

## Overview

Virevos is a SaaS platform that centralises the tools freelancers need to run their business:

- Manage clients, projects, and tasks in one place
- Hold video meetings with automatic transcription and AI-generated summaries
- Use an AI assistant to draft proposals, add clients, and query past meeting data
- Automate repetitive workflows and sync with Google Calendar
- Track revenue and productivity with a built-in analytics dashboard

---

## Features

- **Client & Project Management** — Centralised workspace for clients, projects, tasks, and files
- **AI Assistant** — GPT-4o powered chat with tool use (add clients, search meeting transcripts)
- **Built-in Video Meetings** — LiveKit-powered calls with automatic recording, transcription, and AI summaries
- **Workflow Automation** — No-code trigger-based automations for emails, tasks, and client onboarding
- **Google Calendar Sync** — Two-way calendar integration with automatic event creation
- **Analytics Dashboard** — Revenue tracking, client activity insights, and productivity metrics

---

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI, TanStack Query, Motion |
| Backend | Next.js API Routes, OpenAI GPT-4o (streaming), AWS Lambda, AWS S3, AWS EventBridge |
| Video | LiveKit |
| Database | PostgreSQL, Drizzle ORM, Pinecone (vector search for transcripts) |
| Auth | Clerk |
| Testing | Jest, React Testing Library |

---

## Project Structure

This is an npm monorepo managed with [Turbo](https://turbo.build/).

```
virevos/
├── web/                  # Next.js 16 main application
│   ├── app/              # App Router pages and API routes
│   ├── lib/              # AI tools, server actions, utilities
│   ├── types/            # TypeScript types
│   └── __tests__/        # Jest tests
├── db/                   # Drizzle ORM schema and migrations
├── schedule-lambda/      # AWS Lambda for scheduled tasks
└── transcript-lambda/    # AWS Lambda for meeting transcription
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Accounts and API keys for: Clerk, OpenAI, AWS, LiveKit, Pinecone

### Install & Run

```bash
# Install dependencies from the repo root
npm install

# Start the development server
cd web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Environment Variables

Create a `.env.local` file in the `web/` directory with the following keys:

```
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Database
DATABASE_URL=

# OpenAI
OPENAI_API_KEY=

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=
```
