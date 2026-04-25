"use client";

import { motion } from "motion/react";
import {
  Bot,
  Users,
  Calendar,
  Zap,
  BarChart3,
  Video,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  MessageSquare,
  FileText,
  Bell,
  Lock,
  Globe,
  Brain,
  Mic,
  TrendingUp,
  Clock,
  Target,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";
import { useRouter } from "next/navigation";

const mainFeatures = [
  {
    icon: Bot,
    title: "AI Assistant",
    description:
      "AI powered assistant that understands your business context. Add clients, search past meetings, and get instant help — all through natural conversation.",
    iconStyle: {
      backgroundImage: "linear-gradient(to right, #ec4899, #e11d48)",
    },
    benefits: [
      "Add clients via chat",
      "Search meeting transcripts",
      "Project context aware",
      "Streaming responses",
    ],
  },
  {
    icon: Users,
    title: "Client Management",
    description:
      "A full CRM built for freelancers. Organize every client, track project history, and keep all communications in one centralized workspace.",
    iconStyle: {
      backgroundImage: "linear-gradient(to right, #3b82f6, #1d4ed8)",
    },
    benefits: [
      "Client profiles & history",
      "Project tracking",
      "Shared portals",
      "Contact management",
    ],
  },
  {
    icon: Video,
    title: "Built-In Video Meetings",
    description:
      "Run client calls directly inside Virevos with AI-powered video. Meetings are automatically transcribed, summarized, and linked to your projects.",
    iconStyle: {
      backgroundImage: "linear-gradient(to right, #a855f7, #6d28d9)",
    },
    benefits: [
      "HD video & audio",
      "Auto transcription",
      "AI meeting summaries",
      "Action item capture",
    ],
  },
  {
    icon: Zap,
    title: "Workflow Automation",
    description:
      "Build no-code automations to handle client onboarding, follow-ups, and repetitive tasks. Set triggers once and let Virevos do the work.",
    iconStyle: {
      backgroundImage: "linear-gradient(to right, #facc15, #f97316)",
    },
    benefits: [
      "No-code builder",
      "Custom triggers & actions",
      "Email & task automation",
      "Templates library",
    ],
  },
  {
    icon: Calendar,
    title: "Calendar Sync",
    description:
      "Two-way Calendar integration with real-time push notifications. Your schedule stays in sync whether you book inside the app or directly in Google or Outlook.",
    iconStyle: {
      backgroundImage: "linear-gradient(to right, #4ade80, #059669)",
    },
    benefits: [
      "Two-way sync",
      "Real-time push updates",
      "Meeting scheduling",
      "Deadline reminders",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description:
      "Track revenue, client activity, and productivity trends. Get the data you need to grow your freelance business and make smarter decisions.",
    iconStyle: {
      backgroundImage: "linear-gradient(to right, #2dd4bf, #0891b2)",
    },
    benefits: [
      "Revenue tracking",
      "Client activity reports",
      "Productivity metrics",
      "Export capabilities",
    ],
  },
];

const spotlights = [
  {
    badge: "AI-Powered",
    badgeColor: "bg-pink-50 border-pink-100 text-pink-700",
    icon: Brain,
    iconStyle: {
      backgroundImage: "linear-gradient(to right, #ec4899, #e11d48)",
    },
    title: "Your AI assistant that actually knows your business",
    description:
      "Ask Virevos to add a new client, pull up notes from last week's meeting, or draft a follow-up email. The AI understands your workspace context and takes real action — not just suggestions.",
    highlights: [
      {
        icon: Bot,
        label: "Natural language actions",
        detail:
          "Add clients, search transcripts, and update records through conversation",
      },
      {
        icon: Mic,
        label: "Meeting intelligence",
        detail:
          "Semantic search across all your past meeting transcripts instantly",
      },
      {
        icon: Sparkles,
        label: "Streaming responses",
        detail:
          "Get answers in real-time as the AI thinks through your request",
      },
    ],
  },
  {
    badge: "Communications",
    badgeColor: "bg-purple-50 border-purple-100 text-purple-700",
    icon: Video,
    iconStyle: {
      backgroundImage: "linear-gradient(to right, #a855f7, #6d28d9)",
    },
    title: "Client meetings with everything captured automatically",
    description:
      "Stop juggling Zoom, Google Meet, and note-taking apps. Virevos has video meetings built in — powered by AI — with automatic transcription and AI summaries so nothing falls through the cracks.",
    highlights: [
      {
        icon: Video,
        label: "In-app video calls",
        detail:
          "HD meetings without leaving your workspace, no extra tools needed",
      },
      {
        icon: FileText,
        label: "Auto transcription",
        detail:
          "Full meeting transcripts stored and searchable in your project timeline",
      },
      {
        icon: Target,
        label: "AI summaries & action items",
        detail: "AI distills key decisions and next steps after every call",
      },
    ],
  },
  {
    badge: "Automation",
    badgeColor: "bg-yellow-50 border-yellow-100 text-yellow-700",
    icon: Zap,
    iconStyle: {
      backgroundImage: "linear-gradient(to right, #facc15, #f97316)",
    },
    title: "Automate the busywork, focus on what matters",
    description:
      "Build trigger-based workflows without writing code. When a new client is added, automatically send a welcome email, create a project, and schedule an onboarding call — all in one flow.",
    highlights: [
      {
        icon: Zap,
        label: "Trigger-based workflows",
        detail:
          "React to events like new clients, completed tasks, or calendar changes",
      },
      {
        icon: Bell,
        label: "Smart notifications",
        detail: "Get alerted at the right time, not every time",
      },
      {
        icon: Clock,
        label: "Save hours weekly",
        detail:
          "Automate follow-ups, reminders, and status updates across your pipeline",
      },
    ],
  },
];

const additionalFeatures = [
  {
    icon: Globe,
    title: "Google Calendar",
    description: "Real-time two-way sync with push notifications",
  },
  {
    icon: Lock,
    title: "Secure by default",
    description: "Clerk-powered auth with SSO and 2FA support",
  },
  {
    icon: MessageSquare,
    title: "Unified inbox",
    description: "All client communications in one place",
  },
  {
    icon: TrendingUp,
    title: "Revenue tracking",
    description: "Monitor earnings and business growth over time",
  },
  {
    icon: FileText,
    title: "Project archives",
    description: "Full history of every project and client interaction",
  },
  {
    icon: Users,
    title: "Client portal",
    description: "Shareable project views for your clients",
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

export default function FeaturesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-700">
                Built for freelancers & service pros
              </span>
            </div>
          </motion.div>

          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl text-gray-900 mb-6 leading-tight"
            >
              Everything your business{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                needs to grow
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              Client management, AI assistance, video meetings, and workflow
              automation — all in one platform designed for how you actually
              work.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all group"
                onClick={() => router.push("/onboard")}
              >
                Start for free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl"
                onClick={() => router.push("/pricing")}
              >
                View pricing
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-4xl sm:text-5xl text-gray-900 mb-4">
              Six tools. One workspace.
            </h2>
            <p className="text-xl text-gray-500">
              Replace the stack of apps you&#39;re juggling with a single
              platform that connects every part of your business.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {mainFeatures.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <div className="h-full bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-gray-300 transition-all duration-300 group">
                  <div className="mb-6">
                    <div
                      className="inline-flex items-center justify-center w-14 h-14 rounded-xl shadow-lg"
                      style={feature.iconStyle}
                    >
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 mb-6 leading-relaxed text-sm">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <li
                        key={idx}
                        className="flex items-center text-sm text-gray-600"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Spotlights */}
      {spotlights.map((spotlight, index) => (
        <section
          key={index}
          className={`py-20 sm:py-28 ${index % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                index % 2 !== 0 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              {/* Text */}
              <div>
                <div
                  className={`inline-flex items-center gap-2 border rounded-full px-3 py-1 text-sm font-medium mb-6 ${spotlight.badgeColor}`}
                >
                  <spotlight.icon className="h-3.5 w-3.5" />
                  {spotlight.badge}
                </div>
                <h2 className="text-3xl sm:text-4xl text-gray-900 mb-5 leading-snug">
                  {spotlight.title}
                </h2>
                <p className="text-lg text-gray-500 mb-10 leading-relaxed">
                  {spotlight.description}
                </p>
                <div className="space-y-6">
                  {spotlight.highlights.map((h, i) => (
                    <div key={i} className="flex gap-4">
                      <div
                        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                        style={spotlight.iconStyle}
                      >
                        <h.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 mb-0.5">
                          {h.label}
                        </p>
                        <p className="text-sm text-gray-500">{h.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="relative"
              >
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-6"
                    style={spotlight.iconStyle}
                  >
                    <spotlight.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-3">
                    {spotlight.badge}
                  </h3>
                  <div className="space-y-3">
                    {spotlight.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{h.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Subtle glow */}
                <div
                  className="absolute -inset-px rounded-2xl opacity-10 blur-xl -z-10"
                  style={spotlight.iconStyle}
                />
              </motion.div>
            </motion.div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-24 sm:py-32 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl text-gray-900 mb-6 leading-tight">
              Ready to run your business{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                smarter?
              </span>
            </h2>
            <p className="text-xl text-gray-500 mb-10">
              Start your free Plan. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all group"
                onClick={() => router.push("/onboard")}
              >
                Get started free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl"
                onClick={() => router.push("/pricing")}
              >
                See pricing
              </Button>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Free Plan
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Cancel anytime
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
