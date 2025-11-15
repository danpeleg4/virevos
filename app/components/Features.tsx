"use client"

import { CheckCircle, Zap, Users, Calendar, BarChart3, Lock } from "lucide-react";
import { Card } from "../components/ui/card";
import { motion } from "motion/react";

const page = [
    {
        icon: Zap,
        title: "Lightning Fast",
        description: "Experience blazing-fast performance with real-time updates and instant synchronization across all devices.",
    },
    {
        icon: Users,
        title: "Team Collaboration",
        description: "Work together seamlessly with shared workspaces, comments, and real-time collaboration features.",
    },
    {
        icon: Calendar,
        title: "Smart Scheduling",
        description: "AI-powered scheduling that learns your patterns and helps you plan your day more effectively.",
    },
    {
        icon: BarChart3,
        title: "Analytics & Insights",
        description: "Track your productivity with detailed analytics and actionable insights to improve your workflow.",
    },
    {
        icon: Lock,
        title: "Enterprise Security",
        description: "Bank-level encryption and security measures to keep your data safe and compliant.",
    },
    {
        icon: CheckCircle,
        title: "Easy Integration",
        description: "Connect with your favorite tools like Slack, Google Calendar, Zoom, and 100+ other apps.",
    },
];

export default function Features() {
    return (
        <section className="py-20 sm:py-32 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl sm:text-5xl text-gray-900 mb-4">
                        Everything you need to succeed
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Powerful features designed to help you and your team work more efficiently and accomplish more every day.
                    </p>
                </motion.div>

                {/* Features Grid */}
                <motion.div
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
                    className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {page.map((feature, index) => (
                        <motion.div
                            key={index}
                            variants={{
                                hidden: { opacity: 0, y: 30 },
                                visible: { opacity: 1, y: 0 },
                            }}
                        >
                            <Card className="p-8 hover:shadow-lg transition-shadow duration-300 border-gray-200 h-full">
                                <div className="flex flex-col space-y-4">
                                    <div className="bg-blue-100 rounded-lg w-12 h-12 flex items-center justify-center">
                                        <feature.icon className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl text-gray-900">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-600">
                                        {feature.description}
                                    </p>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
