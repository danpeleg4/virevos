export type Category =
  | "Everything"
  | "News"
  | "Guides"
  | "Company"
  | "Engineering";

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
    id: 4,
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
        text: "We use Google's official Calendar API. You can disconnect at any time from the same settings page.",
      },
      {
        type: "quote",
        text: "We know how fragmented the freelancer's toolstack can be. Every integration we ship is about reducing one more reason to context-switch.",
      },
      {
        type: "paragraph",
        text: "Outlook Calendar support is coming soon. If you have feedback on the Google integration, reach out to support@virevos.com — we read every message.",
      },
    ],
  },
];
