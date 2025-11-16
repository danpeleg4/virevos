"use client"

import { motion } from "motion/react";
import { Card } from "../components/ui/card";
import { Zap, Users, Calendar, BarChart3, Lock, CheckCircle, Smartphone, Globe, Workflow, Bell, FileText, Archive } from "lucide-react";
import { Button } from "../components/ui/button";
import {Navigation} from "@/app/components/Navigation";
import {Footer} from "@/app/components/Footer";

const featureCategories = [
    {
        category: "Core Features",
        description: "Everything you need to manage tasks and projects effectively",
        features: [
            {
                icon: Zap,
                title: "Lightning Fast Performance",
                description: "Experience blazing-fast performance with real-time updates and instant synchronization across all devices. Our optimized infrastructure ensures zero lag.",
                benefits: ["Real-time sync", "Instant updates", "Offline mode", "Cloud backup"],
            },
            {
                icon: Workflow,
                title: "Custom Workflows",
                description: "Create custom workflows that match your team's unique process. Automate repetitive tasks and focus on what matters most.",
                benefits: ["Drag-and-drop builder", "Automation rules", "Custom statuses", "Templates library"],
            },
            {
                icon: Calendar,
                title: "Smart Scheduling",
                description: "AI-powered scheduling that learns your patterns and helps you plan your day more effectively. Never miss a deadline again.",
                benefits: ["AI suggestions", "Calendar integration", "Time blocking", "Deadline tracking"],
            },
        ],
    },
    {
        category: "Collaboration",
        description: "Work together seamlessly with your team",
        features: [
            {
                icon: Users,
                title: "Team Collaboration",
                description: "Work together seamlessly with shared workspaces, comments, and real-time collaboration features. Keep everyone on the same page.",
                benefits: ["Shared workspaces", "Real-time comments", "@mentions", "Activity feeds"],
            },
            {
                icon: Bell,
                title: "Smart Notifications",
                description: "Stay informed without being overwhelmed. Customize notifications to receive only what matters to you.",
                benefits: ["Custom notification rules", "Digest emails", "Mobile push", "Slack integration"],
            },
            {
                icon: FileText,
                title: "Document Management",
                description: "Attach files, create documents, and keep all project resources in one place. Full-text search makes finding anything easy.",
                benefits: ["File attachments", "Version control", "Full-text search", "Preview support"],
            },
        ],
    },
    {
        category: "Analytics & Insights",
        description: "Make data-driven decisions with powerful analytics",
        features: [
            {
                icon: BarChart3,
                title: "Advanced Analytics",
                description: "Track your productivity with detailed analytics and actionable insights to improve your workflow and team performance.",
                benefits: ["Custom reports", "Performance metrics", "Time tracking", "Export capabilities"],
            },
            {
                icon: Archive,
                title: "Project Archives",
                description: "Keep a complete history of all your projects. Search and reference past work anytime you need it.",
                benefits: ["Unlimited history", "Advanced search", "Data export", "Audit logs"],
            },
        ],
    },
    {
        category: "Security & Compliance",
        description: "Enterprise-grade security for your peace of mind",
        features: [
            {
                icon: Lock,
                title: "Enterprise Security",
                description: "Bank-level encryption and security measures to keep your data safe and compliant with industry standards.",
                benefits: ["256-bit encryption", "SOC 2 compliant", "GDPR ready", "2FA authentication"],
            },
            {
                icon: CheckCircle,
                title: "Access Controls",
                description: "Granular permission settings to control who can see and edit what. Perfect for teams of any size.",
                benefits: ["Role-based access", "Guest permissions", "SSO support", "Team management"],
            },
        ],
    },
    {
        category: "Integrations",
        description: "Connect with your favorite tools",
        features: [
            {
                icon: Globe,
                title: "100+ Integrations",
                description: "Connect with your favorite tools like Slack, Google Calendar, Zoom, GitHub, and 100+ other apps.",
                benefits: ["Slack integration", "Calendar sync", "API access", "Webhooks"],
            },
            {
                icon: Smartphone,
                title: "Mobile Apps",
                description: "Native iOS and Android apps that work seamlessly with the web version. Work from anywhere, on any device.",
                benefits: ["iOS app", "Android app", "Offline support", "Push notifications"],
            },
        ],
    },
];

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

export default function AllFeatures() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <Navigation />
            {/* Hero Section */}
            <motion.section
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="py-20 sm:py-32"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-5xl sm:text-6xl text-gray-900 mb-6"
                        >
                            Powerful features for modern teams
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-xl text-gray-600"
                        >
                            Discover all the tools and capabilities that make FlowTask the ultimate productivity platform.
                        </motion.p>
                    </div>
                </div>
            </motion.section>

            {/* Feature Categories */}
            {featureCategories.map((category, categoryIndex) => (
                <motion.section
                    key={categoryIndex}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.1,
                            },
                        },
                    }}
                    className="py-16 sm:py-20"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <motion.div variants={fadeInUp} className="mb-12">
                            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-3">
                                {category.category}
                            </h2>
                            <p className="text-xl text-gray-600">{category.description}</p>
                        </motion.div>

                        <div className="grid gap-8 lg:grid-cols-2">
                            {category.features.map((feature, featureIndex) => (
                                <motion.div key={featureIndex} variants={fadeInUp}>
                                    <Card className="p-8 h-full hover:shadow-xl transition-all duration-300 border-gray-200">
                                        <div className="flex flex-col h-full">
                                            <div className="bg-blue-100 rounded-lg w-14 h-14 flex items-center justify-center mb-6">
                                                <feature.icon className="h-7 w-7 text-blue-600" />
                                            </div>

                                            <h3 className="text-2xl text-gray-900 mb-3">
                                                {feature.title}
                                            </h3>

                                            <p className="text-gray-600 mb-6 flex-grow">
                                                {feature.description}
                                            </p>

                                            <div className="space-y-2">
                                                {feature.benefits.map((benefit, benefitIndex) => (
                                                    <div key={benefitIndex} className="flex items-center text-sm text-gray-700">
                                                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                                                        <span>{benefit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>
            ))}

            {/* CTA Section */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="py-20 sm:py-32 bg-gray-50"
            >
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl sm:text-5xl text-gray-900 mb-6">
                        Ready to experience all these features?
                    </h2>
                    <p className="text-xl text-gray-600 mb-8">
                        Start your free 14-day trial and see how FlowTask can transform your workflow.
                    </p>
                    <Button size="lg" className="text-lg px-8 py-6">
                        Start Free Trial
                    </Button>
                </div>
            </motion.section>
            <Footer />
        </div>
    );
}
