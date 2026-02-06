"use client"

import { Button } from "./ui/button";
import { motion } from "motion/react";
import { ArrowRight, Play, CheckCircle2, Sparkles } from "lucide-react";
import {useRouter} from "next/navigation";

export function Hero() {
  const router = useRouter();
  return (
      <section className="relative bg-white overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-60"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-24 sm:py-32 lg:py-40">
            {/* Announcement Badge */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center mb-8"
            >
              <div className="inline-flex items-center space-x-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-gray-700">
                Introducing AI-powered automations
              </span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
              </div>
            </motion.div>

            {/* Main Hero Content */}
            <div className="text-center max-w-4xl mx-auto">
              <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl sm:text-6xl lg:text-7xl text-gray-900 mb-6 leading-tight"
              >
                Work flows better with{" "}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Virevos
              </span>
              </motion.h1>

              <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed"
              >
                The all-in-one productivity platform that combines project management,
                automation, and AI to help you work smarter.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
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
                    className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl group"
                    onClick={() => router.push("/workspace/dashboard")}
                >
                  <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Watch demo
                </Button>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-600"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Free 14-day trial</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Cancel anytime</span>
                </div>
              </motion.div>
            </div>

            {/* Product Screenshot */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-20 max-w-6xl mx-auto"
            >
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl opacity-20 blur-3xl"></div>

                {/* Screenshot container */}
                <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center space-x-2">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="flex-1 text-center">
                      <div className="inline-block bg-white border border-gray-200 rounded px-3 py-1 text-xs text-gray-600">
                        app.virevos.com
                      </div>
                    </div>
                  </div>

                  {/* Screenshot placeholder with gradient */}
                  <div className="aspect-[16/10] bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
                    <div className="w-full h-full bg-white rounded-lg shadow-lg border border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
                          <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-gray-400">Dashboard Preview</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto"
            >
              {[
                { number: "1000+", label: "Active users" },
                { number: "99.9%", label: "Uptime" },
                { number: "2M+", label: "Tasks completed" },
                { number: "150+", label: "Integrations" },
              ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl sm:text-4xl text-gray-900 mb-2">
                      {stat.number}
                    </div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
  );
}
