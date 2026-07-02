"use client";

import { Check, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Starter",
    price: "0",
    description: "Perfect for individuals and small teams getting started",
    features: [
      "Free forever",
      "50 AI Credits/month",
      "1GB storage",
      "Email support",
      "Up to 5 cases",
      "Up to 5 clients",
    ],
    cta: "Start for free",
    popular: false,
  },
  {
    name: "Professional",
    price: "79",
    description: "For growing teams that need more power and flexibility",
    features: [
      "Everything in Starter plan +",
      "250 AI Credits/month",
      "50GB storage",
      "Unlimited cases",
      "Unlimited meetings",
      "Priority support",
    ],
    cta: "Start Pro Plan",
    popular: true,
  },
  {
    name: "Business",
    price: "129",
    description: "For bigger organizations with advanced needs and necessities",
    features: [
      "Everything in Professional plan +",
      "500 AI Credits/month",
      "250GB storage",
      "Custom automations",
      "Custom contracts",
    ],
    cta: "Start Business Plan",
    popular: false,
  },
];

export function Pricing() {
  const router = useRouter();

  return (
    <section className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className="relative">
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div
                className={`h-full bg-white rounded-2xl p-8 ${
                  plan.popular
                    ? "border-2 border-blue-600 shadow-2xl lg:scale-105"
                    : "border border-gray-200 shadow-lg"
                } hover:shadow-xl transition-all duration-300`}
              >
                {/* Plan Header */}
                <div className="mb-8">
                  <h3 className="text-2xl text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline">
                    {plan.price === "Custom" ? (
                      <span className="text-4xl text-gray-900">Custom</span>
                    ) : (
                      <>
                        <span className="text-5xl text-gray-900">
                          ${plan.price}
                        </span>
                        <span className="text-gray-600 ml-2">/month</span>
                      </>
                    )}
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full mb-8 rounded-xl ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                  size="lg"
                  onClick={() => router.push("/onboard")}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                {/* Features List */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm">
                      <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Callout */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 sm:p-12 border border-blue-100">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl text-gray-900 mb-3">
                  Need help choosing a plan?
                </h3>
                <p className="text-gray-600 mb-6">
                  Our team is here to help you find the perfect plan for your
                  needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => router.push("/contact")}
                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-xl"
                  >
                    Talk to sales
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 mb-1">Free Plan</p>
                    <p className="text-sm text-gray-600">
                      No credit card required
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 mb-1">Cancel anytime</p>
                    <p className="text-sm text-gray-600">
                      No long-term contracts
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 mb-1">Migration support</p>
                    <p className="text-sm text-gray-600">
                      We&#39;ll help you get started
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
