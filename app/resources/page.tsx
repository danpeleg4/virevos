"use client"

import { motion } from "motion/react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { BookOpen, FileText, Video, MessageCircle, ExternalLink, ArrowRight } from "lucide-react";

const resources = [
    {
        icon: BookOpen,
        title: "Documentation",
        description: "Comprehensive guides and API documentation to help you get the most out of FlowTask.",
        link: "/docs",
        color: "blue",
    },
    {
        icon: FileText,
        title: "Blog",
        description: "Tips, best practices, and insights on productivity and team collaboration.",
        link: "/blog",
        color: "purple",
    },
    {
        icon: Video,
        title: "Video Tutorials",
        description: "Step-by-step video guides for all features and use cases.",
        link: "/tutorials",
        color: "green",
    },
    {
        icon: MessageCircle,
        title: "Community Forum",
        description: "Connect with other FlowTask users, share tips, and get help from the community.",
        link: "/community",
        color: "orange",
    },
];

const articles = [
    {
        category: "Productivity",
        title: "10 Tips to Boost Team Productivity",
        excerpt: "Learn proven strategies to help your team work more efficiently and accomplish more every day.",
        date: "Nov 5, 2025",
        readTime: "5 min read",
    },
    {
        category: "Features",
        title: "Getting Started with Custom Workflows",
        excerpt: "A comprehensive guide to creating and automating workflows that match your team's unique process.",
        date: "Nov 2, 2025",
        readTime: "8 min read",
    },
    {
        category: "Case Study",
        title: "How DesignCo Tripled Their Output",
        excerpt: "Learn how a creative agency used FlowTask to manage 3x more clients without adding headcount.",
        date: "Oct 28, 2025",
        readTime: "6 min read",
    },
    {
        category: "Integration",
        title: "Slack Integration Best Practices",
        excerpt: "Make the most of the FlowTask-Slack integration with these expert tips and tricks.",
        date: "Oct 25, 2025",
        readTime: "4 min read",
    },
];

const helpTopics = [
    "Getting Started with FlowTask",
    "Managing Projects and Tasks",
    "Team Collaboration Features",
    "Integrations Setup Guide",
    "Mobile App Usage",
    "Billing and Subscriptions",
    "Account Settings and Security",
    "Keyboard Shortcuts",
];

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
};

export default function Resources() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <motion.section
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="py-20 sm:py-32 bg-gradient-to-b from-indigo-50 to-white"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-5xl sm:text-6xl text-gray-900 mb-6"
                        >
                            Resources & Learning
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-xl text-gray-600"
                        >
                            Everything you need to master FlowTask and boost your team&#39;s productivity
                        </motion.p>
                    </div>
                </div>
            </motion.section>

            {/* Resource Cards */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: {
                            staggerChildren: 0.1,
                        },
                    },
                }}
                className="py-20"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {resources.map((resource, index) => (
                            <motion.div key={index} variants={fadeInUp}>
                                <Card className="p-8 h-full hover:shadow-xl transition-all duration-300 border-gray-200 group cursor-pointer">
                                    <div className={`rounded-lg w-14 h-14 flex items-center justify-center mb-6 ${colorClasses[resource.color as keyof typeof colorClasses]}`}>
                                        <resource.icon className="h-7 w-7" />
                                    </div>
                                    <h3 className="text-2xl text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                                        {resource.title}
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        {resource.description}
                                    </p>
                                    <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                                        <span className="text-sm">Explore</span>
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Latest Articles */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="py-20 bg-gray-50"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-2">
                                Latest from our blog
                            </h2>
                            <p className="text-xl text-gray-600">
                                Tips, insights, and updates from the FlowTask team
                            </p>
                        </div>
                        <Button variant="outline" className="hidden sm:flex">
                            View All Articles
                            <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2">
                        {articles.map((article, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="p-6 h-full hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <span className="text-sm text-blue-600">{article.category}</span>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-sm text-gray-500">{article.date}</span>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-sm text-gray-500">{article.readTime}</span>
                                    </div>
                                    <h3 className="text-xl text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                                        {article.title}
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        {article.excerpt}
                                    </p>
                                    <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                                        <span className="text-sm">Read more</span>
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-8 text-center sm:hidden">
                        <Button variant="outline">
                            View All Articles
                            <ExternalLink className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </motion.section>

            {/* Help Topics */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="py-20"
            >
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
                            Popular help topics
                        </h2>
                        <p className="text-xl text-gray-600">
                            Quick access to our most viewed guides
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {helpTopics.map((topic, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer group">
                                    <div className="flex items-center justify-between">
                    <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                      {topic}
                    </span>
                                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Support CTA */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="py-20 bg-gradient-to-r from-blue-600 to-blue-800"
            >
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl text-white mb-6">
                        Can&#39;t find what you&#39;re looking for?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Our support team is here to help. Get in touch and we&#39;ll respond within 24 hours.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
                            Contact Support
                        </Button>
                        <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600">
                            Schedule a Demo
                        </Button>
                    </div>
                </div>
            </motion.section>
        </div>
    );
}
