import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "0",
    period: "Forever free",
    description: "Perfect for individuals getting started",
    features: [
      "Up to 5 projects",
      "Basic task management",
      "1GB storage",
      "Mobile app access",
      "Email support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "12",
    period: "per user/month",
    description: "For small teams that need more power",
    features: [
      "Unlimited projects",
      "Advanced task management",
      "50GB storage",
      "Priority support",
      "Team collaboration",
      "Custom workflows",
      "Analytics & reporting",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "49",
    period: "per user/month",
    description: "For large organizations with advanced needs",
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "Advanced security",
      "SSO & SAML",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "24/7 phone support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section className="py-20 sm:py-32 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl text-gray-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your team. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`p-8 flex flex-col relative ${
                plan.popular ? "border-2 border-blue-500 shadow-xl" : "border-gray-200"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                  Most Popular
                </Badge>
              )}
              
              <div className="mb-8">
                <h3 className="text-2xl text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline mb-2">
                  <span className="text-5xl text-gray-900">
                    ${plan.price}
                  </span>
                  {plan.price !== "0" && (
                    <span className="ml-2 text-gray-600">
                      /{plan.period}
                    </span>
                  )}
                  {plan.price === "0" && (
                    <span className="ml-2 text-gray-600">
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                variant={plan.popular ? "default" : "outline"}
                className="w-full"
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            All plans include access to our mobile apps and basic integrations.{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Compare plans in detail →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
