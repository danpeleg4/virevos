"use client";

import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { HeroDemo } from "./HeroDemo";

export function Hero() {
  const router = useRouter();

  return (
    <section className="relative bg-white overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-60"></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 py-20 sm:py-24 lg:grid-cols-2 lg:gap-8 lg:py-32">
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            {/* Announcement Badge */}
            <div className="mb-8 flex justify-center lg:justify-start">
              <div className="inline-flex items-center space-x-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm transition-shadow hover:shadow-md cursor-pointer">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-gray-700">
                  Introducing AI-powered automations
                </span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
              </div>
            </div>

            <h1 className="mb-6 text-4xl leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Practice flows better with{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Virevos
              </span>
            </h1>

            <p className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-gray-600 sm:text-xl lg:mx-0">
              From F-1 and OPT to H-1B. Virevos uses AI to turn consultations
              into audited workflows, catching the manual errors that put
              student visas at risk.
            </p>

            {/* CTAs */}
            <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start justify-center">
              <Button
                size="lg"
                className="group rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-lg text-white shadow-lg transition-all hover:shadow-xl"
                onClick={() => router.push("/onboard")}
              >
                Get started for free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl border-2 px-8 py-6 text-lg"
                onClick={() => router.push("/contact")}
              >
                Schedule a demo
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col items-center gap-6 text-sm text-gray-600 sm:flex-row lg:justify-start justify-center">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>Free Plan</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Right: interactive product demo */}
          <div className="flex justify-center lg:justify-end">
            <HeroDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
