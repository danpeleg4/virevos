"use client";

import { Pricing } from "../components/Pricing";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";
import React, { JSX } from "react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Button } from "@/app/components/ui/button";
import { useRouter } from "next/navigation";

type FeatureValue = boolean | string | number | null | undefined;

const comparisonFeatures = [
  {
    category: "Core",
    features: [
      {
        name: "Cases",
        starter: "Up to 5",
        pro: "Unlimited",
        business: "Unlimited",
      },
      {
        name: "Tasks per case",
        starter: "Up to 35",
        pro: "Unlimited",
        business: "Unlimited",
      },
      {
        name: "Clients",
        starter: "Up to 20",
        pro: "Unlimited",
        business: "Unlimited",
      },
      { name: "Storage", starter: "1 GB", pro: "50 GB", business: "250 GB" },
    ],
  },
  {
    category: "AI & Automation",
    features: [
      {
        name: "AI credits / month",
        starter: "50",
        pro: "250",
        business: "500",
      },
      { name: "AI assistant (chat)", starter: true, pro: true, business: true },
      {
        name: "Meeting transcription & summaries",
        starter: true,
        pro: true,
        business: true,
      },
      {
        name: "Workflow automations",
        starter: false,
        pro: true,
        business: true,
      },
    ],
  },
  {
    category: "Meetings & Communications",
    features: [
      {
        name: "Built-in video meetings",
        starter: "Unlimited",
        pro: "Unlimited",
        business: "Unlimited",
      },
      {
        name: "Auto action item capture",
        starter: false,
        pro: true,
        business: true,
      },
      { name: "Transcript search", starter: false, pro: true, business: true },
    ],
  },
  {
    category: "Integrations",
    features: [
      {
        name: "Google sync",
        starter: true,
        pro: true,
        business: true,
      },
      {
        name: "Outlook sync",
        starter: true,
        pro: true,
        business: true,
      },
    ],
  },
  {
    category: "Support",
    features: [
      { name: "Email support", starter: true, pro: true, business: true },
      { name: "Priority support", starter: false, pro: true, business: true },
      {
        name: "24/7 phone support",
        starter: false,
        pro: false,
        business: true,
      },
      { name: "Custom contracts", starter: false, pro: false, business: true },
    ],
  },
];

const faqs = [
  {
    question: "Can I change my plan later?",
    answer:
      "Yes. You can upgrade or downgrade at any time. Upgrades are charged the prorated amount for the remainder of your billing cycle. Downgrades apply to the next cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, Amex) and bank transfers for annual Business plans. Payments are processed securely through Stripe.",
  },
  {
    question: "How do AI credits work?",
    answer:
      "AI credits power the AI assistant features — things like chatting with your assistant, generating meeting summaries, and transcript searches. Each plan includes a set number of credits per month.",
  },
  {
    question: "What happens if I exceed my plan limits?",
    answer:
      "We'll notify you when you're approaching your limits. You can upgrade to a higher plan or manage your usage. We never delete your data without notice.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "We offer a 30-day money-back guarantee. If you're not happy with Virevos for any reason, reach out within 30 days of purchase for a full refund.",
  },
];

const renderValue = (value: FeatureValue): JSX.Element => {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-green-500 mx-auto" />
    ) : (
      <X className="h-4 w-4 text-gray-300 mx-auto" />
    );
  }
  if (value == null) {
    return <span className="text-gray-300 text-sm">—</span>;
  }
  return <span className="text-gray-700 text-sm">{value}</span>;
};

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-700">
                Simple, transparent pricing
              </span>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl text-gray-900 mb-6 leading-tight">
            Plans that scale{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              with you
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-gray-500 max-w-2xl mx-auto">
            Start free. Upgrade when you need to. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <Pricing />

      {/* Comparison Table */}
      <section className="py-20 sm:py-28 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-2">
              Compare plans
            </h2>
            <p className="text-lg text-gray-500 pb-4">
              Everything, side by side
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-5 text-left text-sm font-medium text-gray-500 w-2/5">
                      Feature
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-medium text-gray-900">
                      Starter
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-medium text-blue-600 bg-blue-50/50">
                      Professional
                    </th>
                    <th className="px-6 py-5 text-center text-sm font-medium text-gray-900">
                      Business
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((category, categoryIndex) => (
                    <React.Fragment key={`cat-${categoryIndex}`}>
                      <tr className="bg-gray-50 border-y border-gray-100">
                        <td
                          colSpan={4}
                          className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {category.category}
                        </td>
                      </tr>
                      {category.features.map((feature, featureIndex) => (
                        <tr
                          key={`feat-${categoryIndex}-${featureIndex}`}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {feature.name}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {renderValue(feature.starter)}
                          </td>
                          <td className="px-6 py-4 text-center bg-blue-50/30">
                            {renderValue(feature.pro)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {renderValue(feature.business)}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-2">
              Frequently asked questions
            </h2>
            <p className="text-lg text-gray-500 pb-4">
              Everything you need to know about pricing and billing.
            </p>
          </div>

          <div>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-gray-200 rounded-xl px-6 data-[state=open]:shadow-sm transition-shadow"
                >
                  <AccordionTrigger className="text-left text-gray-900 font-medium py-5 hover:no-underline cursor-pointer">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-500 leading-relaxed pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-32 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div>
            <h2 className="text-4xl sm:text-5xl text-gray-900 mb-6 leading-tight">
              Still have questions?{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                We&#39;re here.
              </span>
            </h2>
            <p className="text-xl text-gray-500 mb-10">
              Talk to our team and we&#39;ll help you find the right plan for
              your business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg rounded-xl shadow-lg group"
                onClick={() => router.push("/onboard")}
              >
                Start for free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl"
                onClick={() => router.push("/contact")}
              >
                Talk to sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
