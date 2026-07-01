"use client";

import { Star, Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";

const testimonials = [
  {
    content:
      "Virevos has completely transformed how our team works. The automation features alone have saved us 20+ hours per week.",
    author: "Sarah Chen",
    role: "VP of Operations",
    company: "TechCorp",
    initials: "SC",
    rating: 5,
  },
  {
    content:
      "The best project management tool we've used. Clean interface, powerful features, and the AI assistant is incredibly helpful.",
    author: "Michael Rodriguez",
    role: "Product Manager",
    company: "StartupXYZ",
    initials: "MR",
    rating: 5,
  },
  {
    content:
      "We switched from 5 different tools to just Virevos. The integration capabilities are outstanding and it's so much easier to manage everything in one place.",
    author: "Emily Thompson",
    role: "CEO",
    company: "GrowthCo",
    initials: "ET",
    rating: 5,
  },
  {
    content:
      "The smart scheduling feature is a game-changer. No more double bookings or scheduling conflicts. It just works.",
    author: "David Kim",
    role: "Engineering Lead",
    company: "DevTeam",
    initials: "DK",
    rating: 5,
  },
  {
    content:
      "Outstanding customer support and the platform is constantly improving. The automation builder is incredibly intuitive.",
    author: "Lisa Anderson",
    role: "Operations Director",
    company: "ScaleUp Inc",
    initials: "LA",
    rating: 5,
  },
  {
    content:
      "Virevos has become essential to our workflow. The team collaboration features keep everyone aligned and productive.",
    author: "James Wilson",
    role: "CTO",
    company: "InnovateLabs",
    initials: "JW",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="relative bg-gradient-to-br from-gray-50 to-blue-50 py-24 sm:py-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className="h-5 w-5 fill-yellow-400 text-yellow-400"
              />
            ))}
            <span className="ml-2 text-sm text-gray-600">
              5.0 from 2,000+ reviews
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl text-gray-900 mb-6">
            Loved by individuals worldwide
          </h2>

          <p className="text-xl text-gray-600">
            Join thousands of people using Virevos to work smarter
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div key={index}>
              <div className="h-full bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-gray-300 transition-all duration-300">
                {/* Quote Icon */}
                <div className="mb-4">
                  <Quote className="h-8 w-8 text-blue-600 opacity-50" />
                </div>

                {/* Stars */}
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                {/* Content */}
                <p className="text-gray-700 mb-6 leading-relaxed">
                  &#34;{testimonial.content}&#34;
                </p>

                {/* Author */}
                <div className="flex items-center space-x-3 pt-4 border-t border-gray-100">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm text-gray-900">
                      {testimonial.author}
                    </div>
                    <div className="text-xs text-gray-600">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Company Logos */}
        <div className="mt-20 text-center">
          <p className="text-sm text-gray-500 mb-8">
            Trusted by leading companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 opacity-60">
            {[
              "TechCorp",
              "StartupXYZ",
              "GrowthCo",
              "DevTeam",
              "InnovateLabs",
              "ScaleUp",
            ].map((company, index) => (
              <div key={index} className="text-xl text-gray-400 font-semibold">
                {company}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
