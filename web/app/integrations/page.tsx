"use client";

import { motion } from "motion/react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ExternalLink, Check } from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";

const integrations = [
  {
    name: "Slack",
    category: "Communication",
    description:
      "Get task notifications and updates directly in your Slack channels. Create tasks from Slack messages.",
    features: [
      "Real-time notifications",
      "Create tasks from messages",
      "Status updates",
      "Team mentions",
    ],
    popular: true,
  },
  {
    name: "Google Calendar",
    category: "Calendar",
    description:
      "Sync your tasks and deadlines with Google Calendar. Two-way sync keeps everything up to date.",
    features: [
      "Two-way sync",
      "Automatic updates",
      "Deadline tracking",
      "Event creation",
    ],
    popular: true,
  },
  {
    name: "Zoom",
    category: "Video",
    description:
      "Schedule and join Zoom meetings directly from Virevos. All meeting links stored with tasks.",
    features: [
      "One-click scheduling",
      "Meeting links",
      "Calendar integration",
      "Automatic reminders",
    ],
    popular: true,
  },
  {
    name: "GitHub",
    category: "Development",
    description:
      "Connect your repositories and track code-related tasks. Automatic updates when PRs are merged.",
    features: [
      "PR tracking",
      "Commit links",
      "Branch management",
      "Webhook support",
    ],
    popular: false,
  },
  {
    name: "Figma",
    category: "Design",
    description:
      "Embed Figma files and prototypes in your tasks. Keep design and development in sync.",
    features: [
      "File embedding",
      "Live previews",
      "Version tracking",
      "Comments sync",
    ],
    popular: false,
  },
  {
    name: "Google Drive",
    category: "Storage",
    description:
      "Attach and share Google Drive files directly in your tasks. Access control syncs automatically.",
    features: [
      "File attachment",
      "Permission sync",
      "Preview support",
      "Version history",
    ],
    popular: true,
  },
  {
    name: "Dropbox",
    category: "Storage",
    description:
      "Link Dropbox files to your tasks and projects. Automatic sync keeps everything current.",
    features: [
      "File linking",
      "Automatic sync",
      "Folder sharing",
      "Preview support",
    ],
    popular: false,
  },
  {
    name: "Jira",
    category: "Development",
    description:
      "Sync tasks between Virevos and Jira. Perfect for teams using both platforms.",
    features: [
      "Two-way sync",
      "Status mapping",
      "Custom fields",
      "Sprint planning",
    ],
    popular: false,
  },
  {
    name: "Microsoft Teams",
    category: "Communication",
    description:
      "Get notifications and updates in Teams. Create and manage tasks without leaving the app.",
    features: [
      "Channel notifications",
      "Task creation",
      "Status updates",
      "Team collaboration",
    ],
    popular: true,
  },
];


const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function Integrations() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      {/* Hero Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="py-20 sm:py-32 bg-gradient-to-b from-purple-50 to-white"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-6 bg-purple-100 text-purple-700">
                100+ Integrations
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl text-gray-900 mb-6"
            >
              Connect your favorite tools
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-600 mb-8"
            >
              Virevos integrates seamlessly with the tools you already use.
              Build your perfect workflow.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Button size="lg" className="text-lg px-8 py-6">
                View API Documentation
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Integrations Grid */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
        className="py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="p-6 h-full hover:shadow-lg transition-all duration-300 border-gray-200 relative">
                  {integration.popular && (
                    <Badge className="absolute top-4 right-4 bg-green-100 text-green-700">
                      Popular
                    </Badge>
                  )}

                  <div className="flex items-start space-x-4 mb-4">
                    <div className="bg-gray-100 rounded-lg w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">{integration.name[0]}</span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl text-gray-900 mb-1">
                        {integration.name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">
                    {integration.description}
                  </p>

                  <div className="space-y-2 mb-6">
                    {integration.features.map((feature, featureIndex) => (
                      <div
                        key={featureIndex}
                        className="flex items-center text-sm text-gray-700"
                      >
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" className="w-full">
                    Learn More
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* API Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="py-20 bg-gray-50"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card className="p-12 text-center">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
              Don&#39;t see your tool?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Use our powerful API to build custom integrations. Full
              documentation and support available.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg">
                View API Docs
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline">
                Request Integration
              </Button>
            </div>
          </Card>
        </div>
      </motion.section>
      <Footer />
    </div>
  );
}
