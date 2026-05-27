"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Send,
  FolderPlus,
  FolderKanban,
  ListChecks,
  CalendarClock,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

type StepTone = "create" | "task" | "calendar" | "email" | "doc";

interface DemoStep {
  tone: StepTone;
  label: string;
  badge?: string;
}

type ResultCard =
  | {
      kind: "case";
      title: string;
      tag: string;
      meta: string;
      done: number;
      total: number;
    }
  | {
      kind: "doc";
      title: string;
      meta: string;
      items: string[];
    };

interface Scenario {
  id: string;
  chip: string;
  prompt: string;
  reply: string;
  steps: DemoStep[];
  result?: ResultCard;
}

const SCENARIOS: Scenario[] = [
  {
    id: "case",
    chip: "Set up an H-1B case",
    prompt: "Set up an H-1B case for Maria Chen",
    reply: "Done — I've created the case and mapped out the full workflow:",
    steps: [
      { tone: "create", label: "Created case · H-1B Transfer — Maria Chen" },
      { tone: "task", label: "Added 6 tasks (LCA filing, I-129, evidence…)" },
      { tone: "calendar", label: "Scheduled RFE response deadline — Jun 14" },
      { tone: "doc", label: "Drafted the intake document checklist" },
    ],
    result: {
      kind: "case",
      title: "H-1B Transfer — Maria Chen",
      tag: "H-1B",
      meta: "New case · 6 tasks",
      done: 1,
      total: 6,
    },
  },
  {
    id: "due",
    chip: "What's due this week?",
    prompt: "What's due this week?",
    reply: "Here's everything on deck this week:",
    steps: [
      { tone: "task", label: "LCA filing · Patel", badge: "High" },
      { tone: "task", label: "I-129 review · Chen", badge: "Due Wed" },
      {
        tone: "calendar",
        label: "RFE response deadline",
        badge: "Fri 5:00 PM",
      },
      { tone: "calendar", label: "2 client consultations", badge: "Booked" },
    ],
  },
  {
    id: "email",
    chip: "Draft a welcome email",
    prompt: "Draft a welcome email for a new F-1 student",
    reply: "Drafted and ready for your review:",
    steps: [
      { tone: "email", label: 'Wrote "Getting started with your F-1" email' },
      { tone: "doc", label: "Attached a document request for required files" },
    ],
    result: {
      kind: "doc",
      title: "Document request — F-1 onboarding",
      meta: "3 documents · awaiting your approval",
      items: ["I-20 form", "Passport photo page", "Passport-style photos"],
    },
  },
];

const TONES: Record<StepTone, { icon: LucideIcon; bg: string; fg: string }> = {
  create: { icon: FolderPlus, bg: "bg-blue-50", fg: "text-blue-600" },
  task: { icon: ListChecks, bg: "bg-emerald-50", fg: "text-emerald-600" },
  calendar: { icon: CalendarClock, bg: "bg-violet-50", fg: "text-violet-600" },
  email: { icon: Mail, bg: "bg-amber-50", fg: "text-amber-600" },
  doc: { icon: FileText, bg: "bg-sky-50", fg: "text-sky-600" },
};

const TYPING_MS = 650;
const STEP_MS = 480;

function TypingDots() {
  return (
    <span
      className="flex items-center gap-1 py-1"
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function ResultCardView({ card }: { card: ResultCard }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
    >
      {card.kind === "case" ? (
        <>
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-lg bg-blue-50 p-2">
              <FolderKanban className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-gray-900">
                  {card.title}
                </p>
                <span className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {card.tag}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{card.meta}</p>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Workflow progress</span>
              <span>
                {card.done}/{card.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(card.done / card.total) * 100}%` }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-purple-600"
              />
            </div>
          </div>
          <span className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-gray-900 px-2.5 text-xs font-medium text-white">
            Open case
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-lg bg-sky-50 p-2">
              <FileText className="h-4 w-4 text-sky-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{card.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{card.meta}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {card.items.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-xs text-gray-600"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                {item}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <span className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-green-600 px-2.5 text-xs font-medium text-white">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve &amp; send
            </span>
            <span className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-red-200 px-2.5 text-xs font-medium text-red-700">
              <XCircle className="h-3.5 w-3.5" />
              Decline
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}

export function HeroDemo() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [replyVisible, setReplyVisible] = useState(false);
  const [stepsShown, setStepsShown] = useState(0);

  const active = SCENARIOS.find((s) => s.id === activeId) ?? null;

  const selectScenario = (id: string) => {
    setReplyVisible(false);
    setStepsShown(0);
    setActiveId(id);
  };

  useEffect(() => {
    if (!active) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setReplyVisible(true), TYPING_MS));
    active.steps.forEach((_, i) => {
      timers.push(
        setTimeout(() => setStepsShown(i + 1), TYPING_MS + STEP_MS * (i + 1))
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [active]);

  const allStepsShown = active ? stepsShown >= active.steps.length : false;

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-blue-900/10">
      {/* Header — mirrors the in-app AI Assistant */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/80 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 p-2">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Virevos AI</h3>
            <p className="text-xs text-gray-500">Powered by Virevos Brain</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          online
        </span>
      </div>

      {/* Conversation */}
      <div className="min-h-[300px] space-y-3 bg-gray-50 px-4 py-4">
        {!active ? (
          <div className="flex justify-start">
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              👋 Hi! I&apos;m your Virevos assistant. Pick a prompt below to
              watch me work.
            </div>
          </div>
        ) : (
          <>
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-blue-600 px-4 py-2.5 text-sm text-white">
                {active.prompt}
              </div>
            </div>

            {/* Assistant message */}
            <div className="flex justify-start">
              <div className="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
                {!replyVisible ? (
                  <TypingDots />
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-sm text-gray-700">{active.reply}</p>
                    <AnimatePresence>
                      {active.steps.slice(0, stepsShown).map((step) => {
                        const tone = TONES[step.tone];
                        const Icon = tone.icon;
                        return (
                          <motion.div
                            key={step.label}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2.5"
                          >
                            <span
                              className={`flex shrink-0 items-center justify-center rounded-lg p-2 ${tone.bg}`}
                            >
                              <Icon className={`h-4 w-4 ${tone.fg}`} />
                            </span>
                            <span className="flex-1 text-sm text-gray-700">
                              {step.label}
                            </span>
                            {step.badge ? (
                              <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                                {step.badge}
                              </span>
                            ) : (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {allStepsShown && active.result && (
                      <ResultCardView card={active.result} />
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Prompt chips */}
      <div className="border-t border-gray-100 px-4 py-3">
        <p className="mb-2 text-xs font-medium text-gray-400">
          Try it — pick a prompt
        </p>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => selectScenario(s.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                s.id === activeId
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-700"
              }`}
            >
              {s.chip}
            </button>
          ))}
        </div>
      </div>

      {/* Faux input bar */}
      <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/60 px-4 py-3">
        <div className="flex-1 truncate rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">
          Plan, search, build anything…
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600">
          <Send className="h-4 w-4 text-white" />
        </span>
      </div>
    </div>
  );
}
