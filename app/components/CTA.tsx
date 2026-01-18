"use client"

import { motion } from "motion/react";
import { Button } from "./ui/button";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import {useRouter} from "next/navigation";

export function CTA() {
  const router = useRouter();
  return (
      <section className="relative bg-white py-24 sm:py-32 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600"></div>

        {/* Pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400 rounded-full blur-3xl opacity-20"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex justify-center mb-8"
            >
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm text-white">
                Join 50,000+ teams already using Virevos
              </span>
              </div>
            </motion.div>

            {/* Heading */}
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl text-white mb-6 leading-tight"
            >
              Ready to transform how you work?
            </motion.h2>

            {/* Description */}
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-xl text-white/90 mb-12 max-w-2xl mx-auto"
            >
              Start your free 14-day trial today. No credit card required, cancel anytime.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
            >
              <Button
                  size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all group"
                  onClick={() => router.push("/onboarding")}
              >
                Get started for free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/30 bg-white/10 backdrop-blur-sm px-8 py-6 text-lg rounded-xl"
                  onClick={() => router.push("/contact")}
              >
                Schedule a demo
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-white/90"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-300" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-300" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-300" />
                <span>Cancel anytime</span>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="mt-20 pt-12 border-t border-white/20"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                {[
                  { value: "50K+", label: "Active users" },
                  { value: "99.9%", label: "Uptime SLA" },
                  { value: "4.9/5", label: "Customer rating" },
                  { value: "24/7", label: "Support" },
                ].map((stat, index) => (
                    <div key={index} className="text-center">
                      <div className="text-3xl sm:text-4xl text-white mb-2">
                        {stat.value}
                      </div>
                      <div className="text-sm text-white/80">{stat.label}</div>
                    </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
  );
}
