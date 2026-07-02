"use client";

import {
  Zap,
  Users,
  Calendar,
  Bot,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Video,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Case Lifecycle Automation",
    description:
      "Automate the entire F-1 to H-1B journey. From onboarding to filing, keep cases moving without manual data entry.",
    gradient: "from-yellow-400 to-orange-500",
    benefits: [
      "Visa-specific pipelines",
      "Automated USCIS reminders",
      "Custom status triggers",
    ],
  },
  {
    icon: Users,
    title: "Secure Client Portal",
    description:
      "Provide students and professionals with a secure environment to upload sensitive documents and track their visa status.",
    gradient: "from-blue-400 to-blue-600",
    benefits: [
      "Secure document uploads",
      "Direct student messaging",
      "Family/Employer access",
    ],
  },
  {
    icon: Calendar,
    title: "Critical Deadline Tracking",
    description:
      "Never miss a filing window. Virevos tracks OPT reporting dates, H-1B lottery deadlines, and RFE responses automatically.",
    gradient: "from-purple-400 to-purple-600",
    benefits: [
      "Statutory deadline alerts",
      "Priority date tracking",
      "Automated calendar sync",
    ],
  },
  {
    icon: Bot,
    title: "Autonomous AI Audit",
    description:
      "Eliminate human error. Our AI cross-references every form and document to ensure signatures are present and dates are consistent.",
    gradient: "from-pink-400 to-rose-600",
    benefits: [
      "Document consistency checks",
      "Automated form auditing",
      "Smart RFE preparation",
    ],
  },
  {
    icon: BarChart3,
    title: "Practice Insights",
    description:
      "Track your firm’s performance. Monitor case approval rates, lawyer workload, and upcoming filing volumes in one dashboard.",
    gradient: "from-green-400 to-emerald-600",
    benefits: [
      "Approval rate analytics",
      "Filing volume trends",
      "Practice growth reports",
    ],
  },
  {
    icon: Video,
    title: "AI Consultations",
    description:
      "Run secure legal consultations directly in the app. Virevos automatically transcribes the meeting and drafts the initial case checklist.",
    gradient: "from-purple-400 to-emerald-600",
    benefits: [
      "Legal-grade video hub",
      "Automated meeting summaries",
      "Instant action item triggers",
    ],
  },
];

export default function Features() {
  return (
    <section className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <div className="inline-flex items-center space-x-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-2 mb-6">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-900">Everything you need</span>
          </div>

          <h2 className="text-4xl sm:text-5xl text-gray-900 mb-6">
            Built for Immigration Experts
          </h2>

          <p className="text-xl text-gray-600">
            Everything you need to automate the F-1 to H-1B pipeline, track
            critical deadlines, and scale your practice without the risk.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="group relative">
              <div className="h-full bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-xl hover:border-gray-300 transition-all duration-300">
                {/* Icon */}
                <div className="mb-6">
                  <div
                    className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-r ${feature.gradient} shadow-lg`}
                  >
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {feature.description}
                </p>

                {/* Benefits */}
                <ul className="space-y-2 mb-6">
                  {feature.benefits.map((benefit, idx) => (
                    <li
                      key={idx}
                      className="flex items-center text-sm text-gray-600"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4"></div>
        </div>
      </div>
    </section>
  );
}
