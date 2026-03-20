export type Category = "Everything" | "News" | "Guides" | "Company" | "Engineering";

export interface ContentBlock {
  type: "paragraph" | "heading" | "subheading" | "list" | "quote" | "code";
  text?: string;
  items?: string[];
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: Exclude<Category, "Everything">;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  image?: string;
  featured?: boolean;
  content: ContentBlock[];
}

export const categoryColors: Record<Exclude<Category, "Everything">, string> = {
  News: "bg-blue-100 text-blue-700",
  Guides: "bg-green-100 text-green-700",
  Company: "bg-purple-100 text-purple-700",
  Engineering: "bg-orange-100 text-orange-700",
};

export const posts: BlogPost[] = [
  {
    id: 1,
    slug: "introducing-virevos-2",
    title: "Introducing Virevos 2.0: A new era of freelance management",
    description:
      "We've completely reimagined how freelancers manage their business. From smarter invoicing to AI-powered client communication, here's everything that's new.",
    category: "Company",
    author: "John Doe",
    authorRole: "CEO & Co-founder",
    date: "Mar 15, 2026",
    readTime: "5 min read",
    image:
      "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NjI3MTgxMzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: true,
    content: [
      {
        type: "paragraph",
        text: "Two years ago, we launched Virevos with a simple goal: give freelancers the tools they deserve. Today, we're proud to announce Virevos 2.0 — the most significant update we've ever shipped.",
      },
      {
        type: "heading",
        text: "What's new in 2.0",
      },
      {
        type: "paragraph",
        text: "Virevos 2.0 is built around three pillars: speed, intelligence, and simplicity. We've rewritten our core engine from the ground up, reducing load times by over 60%. Every interaction — opening a client record, generating an invoice, logging a meeting — feels instant.",
      },
      {
        type: "subheading",
        text: "AI-powered client communication",
      },
      {
        type: "paragraph",
        text: "Our new AI assistant is deeply integrated into your workflow. It can draft follow-up emails after meetings, summarize project status for clients, and flag when a client hasn't responded in a while. It's like having a smart EA that knows your entire history with every client.",
      },
      {
        type: "subheading",
        text: "Smarter invoicing",
      },
      {
        type: "paragraph",
        text: "Invoicing has been completely redesigned. You can now auto-generate invoices from tracked time, set recurring billing schedules, and get paid faster with one-click payment links. We've integrated with Stripe, PayPal, and bank transfers out of the box.",
      },
      {
        type: "list",
        items: [
          "Auto-generate invoices from tracked time entries",
          "Recurring billing with flexible schedules",
          "One-click payment links via Stripe & PayPal",
          "Automated payment reminders at custom intervals",
          "Multi-currency support with live exchange rates",
        ],
      },
      {
        type: "subheading",
        text: "A redesigned dashboard",
      },
      {
        type: "paragraph",
        text: "The new dashboard gives you a full picture of your business at a glance. Outstanding invoices, upcoming deadlines, recent client activity, and your monthly earnings are all front and center. No more digging through menus to understand how your month is going.",
      },
      {
        type: "heading",
        text: "What's next",
      },
      {
        type: "paragraph",
        text: "Virevos 2.0 is just the beginning. Over the coming months, we'll be shipping a client portal (so your clients can view proposals, sign contracts, and pay invoices in one place), a mobile app, and deeper integrations with tools like Notion, Linear, and Slack.",
      },
      {
        type: "quote",
        text: "We built Virevos 2.0 for the freelancer who's serious about their business. Not a side project — a real, thriving business.",
      },
      {
        type: "paragraph",
        text: "Existing customers will be upgraded automatically. New users can get started for free at virevos.com. We can't wait to hear what you build.",
      },
    ],
  },
  {
    id: 2,
    slug: "freelance-rates-2026",
    title: "How to set your freelance rates in 2026",
    description:
      "Pricing your services is one of the hardest parts of freelancing. We break down a data-driven framework to help you charge what you're worth.",
    category: "Guides",
    author: "Sarah Kim",
    authorRole: "Head of Content",
    date: "Mar 10, 2026",
    readTime: "8 min read",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVlbGFuY2UlMjB3b3JrfGVufDF8fHx8MTc2MjcxODEzNXww&ixlib=rb-4.1.0&q=80&w=1080",
    content: [
      {
        type: "paragraph",
        text: "Undercharging is one of the most common mistakes freelancers make — and one of the most costly. Not just financially, but in terms of the clients you attract, the work you take on, and the sustainability of your business long-term.",
      },
      {
        type: "heading",
        text: "Start with your baseline number",
      },
      {
        type: "paragraph",
        text: "Before anything else, you need to know your minimum viable rate — the hourly or project rate below which you simply cannot sustain your business. Add up your monthly expenses (rent, software, insurance, taxes, savings), divide by the number of billable hours you realistically work per month, and you have your floor.",
      },
      {
        type: "paragraph",
        text: "Most freelancers significantly underestimate non-billable time: admin, sales, marketing, learning. A healthy rule of thumb is that only 60–70% of your working hours are billable. Factor that in.",
      },
      {
        type: "heading",
        text: "Research the market",
      },
      {
        type: "paragraph",
        text: "Your rate doesn't exist in a vacuum. Survey job boards, ask peers in your network, and use resources like Levels.fyi or Glassdoor to understand what the market pays for your skill set, experience level, and location. Aim for the 60th–80th percentile — not the bottom, not the absolute top.",
      },
      {
        type: "subheading",
        text: "Factors that justify a premium rate",
      },
      {
        type: "list",
        items: [
          "Deep expertise in a high-demand niche (e.g., fintech design, AI/ML engineering)",
          "A track record of measurable business outcomes",
          "Fast turnaround and high availability",
          "A strong portfolio or recognizable client names",
          "Unique process or methodology",
        ],
      },
      {
        type: "heading",
        text: "Value-based pricing: the next level",
      },
      {
        type: "paragraph",
        text: "Once you've established yourself, consider shifting from hourly to value-based pricing. Instead of charging for time, you charge for the outcome you deliver. A landing page that converts 3× better is worth far more than the 20 hours it took to build.",
      },
      {
        type: "quote",
        text: "Clients don't pay for your time. They pay to solve a problem. Price accordingly.",
      },
      {
        type: "paragraph",
        text: "To use value-based pricing, you need to understand the client's situation: what's the upside if this project succeeds? What's the cost if they don't do it at all? Your fee should be a small fraction of the expected value — typically 10–20%.",
      },
      {
        type: "heading",
        text: "How to raise your rates",
      },
      {
        type: "paragraph",
        text: "Raise rates with new clients first. When you're fully booked at your current rate, that's a clear signal the market will bear more. With existing clients, give 60–90 days notice and frame the increase in the context of the value you've delivered, not the cost of living.",
      },
    ],
  },
  {
    id: 3,
    slug: "real-time-collaboration-engine",
    title: "Building our real-time collaboration engine",
    description:
      "A deep dive into the architecture decisions behind Virevos's live sync — WebSockets, conflict resolution, and lessons learned at scale.",
    category: "Engineering",
    author: "Alex Torres",
    authorRole: "Staff Engineer",
    date: "Mar 7, 2026",
    readTime: "12 min read",
    content: [
      {
        type: "paragraph",
        text: "When we started building real-time collaboration into Virevos, we thought it would be a two-sprint feature. Fourteen months later, with three complete rewrites under our belt, I can say with confidence: real-time is hard. Here's what we learned.",
      },
      {
        type: "heading",
        text: "Why we built our own engine",
      },
      {
        type: "paragraph",
        text: "We evaluated several off-the-shelf options — Liveblocks, PartyKit, Ably — and while they're excellent products, none of them fit our data model well enough. Virevos has deeply relational data: clients connect to projects connect to tasks connect to invoices. Syncing at the document level (as most CRDTs assume) doesn't map cleanly to our schema.",
      },
      {
        type: "subheading",
        text: "The core architecture",
      },
      {
        type: "paragraph",
        text: "Our engine runs on a WebSocket server backed by Redis Pub/Sub. Each connected client subscribes to a set of 'rooms' corresponding to the entities they're viewing. When a mutation happens — a client record is updated, a task status changes — the change is written to Postgres, then broadcast to all subscribers via Redis.",
      },
      {
        type: "code",
        text: `// Simplified broadcast flow
async function handleMutation(mutation: Mutation) {
  await db.transaction(async (tx) => {
    const result = await applyMutation(tx, mutation);
    await redis.publish(
      \`room:\${mutation.roomId}\`,
      JSON.stringify({ type: "patch", data: result })
    );
  });
}`,
      },
      {
        type: "heading",
        text: "Conflict resolution",
      },
      {
        type: "paragraph",
        text: "Our first version used last-write-wins. It was simple to implement and worked fine for 95% of cases. The remaining 5% — two users editing the same client note simultaneously — produced silent data loss. Unacceptable.",
      },
      {
        type: "paragraph",
        text: "We moved to operational transformation (OT) for text fields and a vector-clock approach for structured data. OT lets us merge concurrent edits to the same document without losing either user's changes. The implementation is based on the classic Jupiter protocol, adapted for our server-authoritative model.",
      },
      {
        type: "subheading",
        text: "Lessons learned",
      },
      {
        type: "list",
        items: [
          "Design your conflict strategy before writing a single line of sync code",
          "Make the sync layer observable early — distributed bugs are invisible without good tooling",
          "Test with realistic network conditions (packet loss, reordering, disconnects)",
          "Presence (who's online, where their cursor is) is harder than sync",
          "Your users will notice 200ms latency; your server will not survive 10,000 concurrent connections on a single node",
        ],
      },
      {
        type: "heading",
        text: "What's next",
      },
      {
        type: "paragraph",
        text: "We're currently working on offline support — the ability to make changes while disconnected and have them sync seamlessly when connectivity is restored. This requires a durable client-side queue and a more sophisticated merge strategy for long disconnection windows. A post on that is coming soon.",
      },
    ],
  },
  {
    id: 4,
    slug: "series-a-announcement",
    title: "Virevos raises $8M Series A to expand globally",
    description:
      "We're thrilled to announce our Series A funding round, led by Accel Partners. Here's what this means for our roadmap and community.",
    category: "News",
    author: "John Doe",
    authorRole: "CEO & Co-founder",
    date: "Feb 28, 2026",
    readTime: "3 min read",
    image:
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdW5kaW5nJTIwc3RhcnR1cHxlbnwxfHx8fDE3NjI3MTgxMzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    content: [
      {
        type: "paragraph",
        text: "Today, we're announcing that Virevos has raised $8M in a Series A round led by Accel Partners, with participation from Craft Ventures, Tiny Capital, and several angel investors who are freelancers themselves.",
      },
      {
        type: "paragraph",
        text: "This round brings our total funding to $10.5M. More importantly, it gives us the runway to do the things we've been planning since day one: build a world-class mobile app, expand our payment infrastructure to 50+ countries, and grow our team from 18 to 40 people.",
      },
      {
        type: "heading",
        text: "Why now?",
      },
      {
        type: "paragraph",
        text: "The freelance economy is accelerating. In 2025, independent workers contributed over $1.5 trillion to the global economy. Yet most of them are still managing their business with a patchwork of tools — a spreadsheet here, a PDF invoice there, a calendar reminder for follow-ups.",
      },
      {
        type: "paragraph",
        text: "We've always believed freelancers deserve the same quality of tooling as enterprise teams. This funding lets us build that.",
      },
      {
        type: "quote",
        text: "Virevos isn't just a tool — it's the operating system for the modern freelancer. We're backing them to be the default platform for independent professionals worldwide.",
      },
      {
        type: "paragraph",
        text: "— Sonali De Rycker, Partner at Accel",
      },
      {
        type: "heading",
        text: "What this means for you",
      },
      {
        type: "list",
        items: [
          "Faster product development — more engineers, more features, less wait",
          "Global payments in 50+ currencies launching Q3 2026",
          "Native iOS and Android apps in beta by Q2 2026",
          "Enterprise plan with SSO, audit logs, and dedicated support",
          "Expanded integrations: Notion, Linear, Slack, QuickBooks",
        ],
      },
      {
        type: "paragraph",
        text: "To every freelancer who has trusted Virevos with their business: thank you. This is for you.",
      },
    ],
  },
  {
    id: 5,
    slug: "client-onboarding-guide",
    title: "The ultimate guide to client onboarding",
    description:
      "A smooth onboarding process sets the tone for the entire project. Here's a step-by-step playbook used by Virevos's top-earning freelancers.",
    category: "Guides",
    author: "Maya Patel",
    authorRole: "Customer Success Lead",
    date: "Feb 20, 2026",
    readTime: "10 min read",
    content: [
      {
        type: "paragraph",
        text: "The first two weeks of a client engagement determine more about how the project goes than any other period. Get them right and you set up a smooth, trusting relationship. Get them wrong and you spend months course-correcting.",
      },
      {
        type: "heading",
        text: "Step 1: The intake call",
      },
      {
        type: "paragraph",
        text: "Before you write a single line of code or design a single pixel, have a structured intake call. Your goal isn't to impress the client — it's to understand their situation well enough to scope the project accurately. Ask about the business goal behind the project, not just the deliverable.",
      },
      {
        type: "list",
        items: [
          "What does success look like in 6 months?",
          "Who are the key stakeholders and decision-makers?",
          "What has been tried before, and what happened?",
          "What's the hard deadline, and why does it exist?",
          "How do you prefer to communicate — async or sync?",
        ],
      },
      {
        type: "heading",
        text: "Step 2: The proposal",
      },
      {
        type: "paragraph",
        text: "A strong proposal does three things: it proves you understood the client's problem, presents your approach clearly, and makes the commercial terms easy to say yes to. Keep it under three pages. Long proposals signal uncertainty, not thoroughness.",
      },
      {
        type: "subheading",
        text: "What to include",
      },
      {
        type: "list",
        items: [
          "A one-paragraph restatement of their problem (in their words)",
          "Your proposed solution and methodology",
          "Deliverables with clear definitions of done",
          "Timeline with milestones",
          "Pricing — flat fee or milestone-based, not hourly",
          "What you need from them to start and stay on track",
        ],
      },
      {
        type: "heading",
        text: "Step 3: The kickoff",
      },
      {
        type: "paragraph",
        text: "Once the contract is signed, hold a kickoff meeting within 48 hours. Use it to align on communication norms, introduce any tools you'll use together, and confirm the first milestone. Send a written summary afterward — it becomes the project's north star document.",
      },
      {
        type: "quote",
        text: "The best freelancers don't just deliver work. They deliver clarity. From the first call to the final invoice, every touchpoint should make the client feel like they made the right decision.",
      },
      {
        type: "heading",
        text: "Step 4: The first two weeks",
      },
      {
        type: "paragraph",
        text: "Over-communicate early. Send a brief weekly update even if nothing major has happened. Surface small wins. Flag blockers the moment they arise. Clients don't need constant reassurance — but they do need to feel like their project is in capable hands. Silence breeds anxiety.",
      },
      {
        type: "paragraph",
        text: "Use Virevos's client portal to give clients visibility into progress without requiring a meeting. They can see status, review deliverables, and leave feedback asynchronously — which respects both of your time.",
      },
    ],
  },
  {
    id: 6,
    slug: "ai-assistant-openai-tool-calls",
    title: "How we built our AI assistant with OpenAI tool calls",
    description:
      "The engineering story behind Virevos's AI assistant — from prompt design to streaming responses and integrating with live client data.",
    category: "Engineering",
    author: "Alex Torres",
    authorRole: "Staff Engineer",
    date: "Feb 14, 2026",
    readTime: "15 min read",
    image:
      "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBSSUyMGFzc2lzdGFudHxlbnwxfHx8fDE3NjI3MTgxMzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    content: [
      {
        type: "paragraph",
        text: "The Virevos AI assistant isn't a chatbot bolted on top of our product. It has full access to your client data, can take actions on your behalf, and responds with context-aware answers that reference your actual projects and meetings. Here's how we built it.",
      },
      {
        type: "heading",
        text: "The agent loop",
      },
      {
        type: "paragraph",
        text: "At its core, the assistant is an agent loop: a while loop that calls the OpenAI API, processes the response, executes any tool calls, feeds the results back, and repeats until the model returns a final message. We cap the loop at 5 iterations to prevent runaway API costs.",
      },
      {
        type: "code",
        text: `// Simplified agent loop
while (steps < MAX_STEPS) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools,
    stream: true,
  });

  const { toolCalls, text } = await processStream(response);

  if (!toolCalls.length) break; // Model is done

  for (const call of toolCalls) {
    const result = await executeTool(call.name, call.args);
    messages.push({ role: "tool", content: result });
  }
  steps++;
}`,
      },
      {
        type: "heading",
        text: "Tool design",
      },
      {
        type: "paragraph",
        text: "We currently expose two tools to the model: addClient and getPastMeetingData. The first lets the AI create client records directly from a conversation. The second performs semantic search over meeting transcripts, letting you ask questions like 'what did TechCorp say about the deadline last month?' and get a grounded answer.",
      },
      {
        type: "subheading",
        text: "Semantic search on meeting data",
      },
      {
        type: "paragraph",
        text: "Meeting transcripts are chunked, embedded with text-embedding-3-small, and stored in pgvector. When the getPastMeetingData tool is called, we embed the query and do a cosine similarity search to retrieve the top-k relevant chunks. Those chunks are injected into the model's context as tool results.",
      },
      {
        type: "heading",
        text: "Streaming",
      },
      {
        type: "paragraph",
        text: "We stream both text deltas and tool call results back to the client over a ReadableStream using newline-delimited JSON. This means the assistant starts appearing on screen almost immediately, even for complex multi-step queries. The frontend uses a custom hook rather than the ai-sdk's useChat, giving us full control over the event format.",
      },
      {
        type: "list",
        items: [
          "text_delta: a chunk of the model's text response",
          "tool_result: the result of a tool call, shown as an inline status",
          "done: the stream has ended cleanly",
          "error: something went wrong; display a recovery message",
        ],
      },
      {
        type: "heading",
        text: "What we'd do differently",
      },
      {
        type: "paragraph",
        text: "We underestimated prompt engineering. Our initial system prompt was three sentences. The current one is 600 words, covers dozens of edge cases, and is versioned in our codebase like any other critical piece of infrastructure. If you're building an AI feature, treat the system prompt as code — not config.",
      },
    ],
  },
  {
    id: 7,
    slug: "year-of-growth-at-virevos",
    title: "Meet the team: A year of growth at Virevos",
    description:
      "We went from 4 to 18 people this year. Here's how we've kept our culture intact while scaling fast — and what we look for in new hires.",
    category: "Company",
    author: "John Doe",
    authorRole: "CEO & Co-founder",
    date: "Feb 5, 2026",
    readTime: "6 min read",
    content: [
      {
        type: "paragraph",
        text: "A year ago, Virevos was four people on a video call, arguing about what to call the thing we were building. Today we're 18, spread across six time zones, shipping faster than ever. This post is about how we grew — and what we've learned about hiring and culture in the process.",
      },
      {
        type: "heading",
        text: "Who we hired, and why",
      },
      {
        type: "paragraph",
        text: "We resisted hiring generalists early on, even though the startup playbook often recommends it. Instead, we hired deep specialists for our biggest constraints: a staff engineer who'd built real-time systems before, a designer who'd worked on B2B tools at Figma, and a customer success lead who'd spent three years working with freelancers directly.",
      },
      {
        type: "paragraph",
        text: "The pattern: hire people who've done the specific hard thing you're about to do. The learning curve on a startup is steep enough without also having to figure out the domain from scratch.",
      },
      {
        type: "heading",
        text: "How we've kept the culture",
      },
      {
        type: "paragraph",
        text: "Culture at a small company is mostly informal — it lives in how people talk to each other in Slack, how decisions get made, and how disagreements get resolved. When you scale, you have to make those norms explicit before new people dilute them unintentionally.",
      },
      {
        type: "list",
        items: [
          "We write more than we talk — async by default, meetings by exception",
          "Feedback is specific and direct, never vague or political",
          "Ownership is real: the person closest to the problem makes the call",
          "We celebrate learning from mistakes, not just wins",
          "Everyone talks to customers — not just sales and support",
        ],
      },
      {
        type: "heading",
        text: "What we look for when hiring",
      },
      {
        type: "paragraph",
        text: "Beyond domain expertise, we look for people who are genuinely curious about the freelance economy, who have strong opinions and can defend them, and who can work well with high autonomy. We don't do well with people who need constant direction — not because we're harsh, but because we move too fast to provide it.",
      },
      {
        type: "quote",
        text: "The best thing about a small team is that every hire matters enormously. The worst thing about a small team is that every hire matters enormously.",
      },
      {
        type: "paragraph",
        text: "We're still hiring. If you're an experienced engineer, product designer, or account executive who cares about the future of independent work, we'd love to talk.",
      },
    ],
  },
  {
    id: 8,
    slug: "google-calendar-integration",
    title: "Virevos now integrates with Google Calendar",
    description:
      "Real-time calendar sync is here. Book meetings, track deadlines, and manage your schedule — all without leaving Virevos.",
    category: "News",
    author: "Sarah Kim",
    authorRole: "Head of Content",
    date: "Jan 28, 2026",
    readTime: "2 min read",
    image:
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxlbmRhciUyMGludGVncmF0aW9ufGVufDF8fHx8MTc2MjcxODEzNXww&ixlib=rb-4.1.0&q=80&w=1080",
    content: [
      {
        type: "paragraph",
        text: "Starting today, you can connect your Google Calendar to Virevos and keep your entire schedule in sync — automatically.",
      },
      {
        type: "heading",
        text: "What syncs",
      },
      {
        type: "list",
        items: [
          "All Google Calendar events appear in Virevos's calendar view",
          "Client meetings you create in Virevos sync back to Google Calendar",
          "Project deadlines appear as all-day events",
          "Changes in either app sync within seconds via push notifications",
        ],
      },
      {
        type: "heading",
        text: "How to connect",
      },
      {
        type: "paragraph",
        text: "Go to Settings → Integrations → Google Calendar and click Connect. You'll be prompted to sign in with Google and grant calendar access. The initial sync takes under a minute, and from there, everything stays up to date automatically.",
      },
      {
        type: "paragraph",
        text: "We use Google's official Calendar API with incremental sync tokens, so the integration is efficient and won't hammer your API quota. You can disconnect at any time from the same settings page.",
      },
      {
        type: "quote",
        text: "We know how fragmented the freelancer's toolstack can be. Every integration we ship is about reducing one more reason to context-switch.",
      },
      {
        type: "paragraph",
        text: "Outlook Calendar support is coming in Q2. If you have feedback on the Google integration, reach out to support@virevos.com — we read every message.",
      },
    ],
  },
];
