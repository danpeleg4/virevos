"use client"

import { motion } from "motion/react";
import { Testimonials } from "../components/Testimonials";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ArrowRight, Quote } from "lucide-react";
import {Navigation} from "@/app/components/Navigation";
import {Footer} from "@/app/components/Footer";

const caseStudies = [
    {
        company: "TechCorp",
        industry: "Technology",
        teamSize: "200+ employees",
        image: "https://images.unsplash.com/photo-1652177217044-4f62dacf0ceb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9kdWN0aXZlJTIwd29ya3NwYWNlJTIwZGVza3xlbnwxfHx8fDE3NjI3MTgxMzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
        challenge: "TechCorp struggled with project visibility across distributed teams, leading to missed deadlines and duplicated work.",
        solution: "Implemented Virevos's enterprise plan with custom workflows and integrations with their existing tools.",
        results: [
            "40% reduction in project completion time",
            "95% increase in team collaboration",
            "50% fewer missed deadlines",
        ],
        quote: "Virevos transformed how we work. Our teams are more aligned than ever, and we're shipping faster without sacrificing quality.",
        author: "Sarah Chen",
        role: "VP of Product",
    },
    {
        company: "DesignCo",
        industry: "Creative Agency",
        teamSize: "50+ employees",
        image: "https://images.unsplash.com/photo-1739298061740-5ed03045b280?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMG9mZmljZXxlbnwxfHx8fDE3NjI2OTQ5Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        challenge: "Managing multiple client projects with different requirements and deadlines was becoming overwhelming.",
        solution: "Adopted Virevos Pro with custom templates for each client type and automated workflows.",
        results: [
            "60% faster client onboarding",
            "3x more projects managed simultaneously",
            "Client satisfaction increased to 98%",
        ],
        quote: "We can now handle triple the number of clients without increasing headcount. Virevos's flexibility is exactly what we needed.",
        author: "Emily Thompson",
        role: "Creative Director",
    },
];

const stats = [
    { value: "2,000+", label: "Companies trust Virevos" },
    { value: "1000+", label: "Active users worldwide" },
    { value: "127%", label: "Average productivity increase" },
    { value: "4.9/5", label: "Customer satisfaction rating" },
];

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

export default function Customers() {
    return (
        <div className="min-h-screen bg-white">
            <Navigation />
            {/* Hero Section */}
            <motion.section
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                className="py-20 sm:py-32 bg-gradient-to-b from-orange-50 to-white"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-5xl sm:text-6xl text-gray-900 mb-6"
                        >
                            Trusted by Freelancers worldwide
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-xl text-gray-600"
                        >
                            See how companies like yours are achieving incredible results with Virevos
                        </motion.p>
                    </div>
                </div>
            </motion.section>

            {/* Stats */}
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
                className="py-16 bg-white border-y border-gray-200"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                        {stats.map((stat, index) => (
                            <motion.div key={index} variants={fadeInUp} className="text-center">
                                <p className="text-4xl sm:text-5xl text-gray-900 mb-2">{stat.value}</p>
                                <p className="text-gray-600">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Case Studies */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                    hidden: { opacity: 0 },
                    visible: {
                        opacity: 1,
                        transition: {
                            staggerChildren: 0.2,
                        },
                    },
                }}
                className="py-20"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <motion.div variants={fadeInUp} className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
                            Customer success stories
                        </h2>
                        <p className="text-xl text-gray-600">
                            Real results from real companies
                        </p>
                    </motion.div>

                    <div className="space-y-16">
                        {caseStudies.map((study, index) => (
                            <motion.div key={index} variants={fadeInUp}>
                                <Card className="overflow-hidden">
                                    <div className="grid lg:grid-cols-2 gap-8">
                                        {/* Image */}
                                        <div className="relative h-64 lg:h-auto">
                                            <ImageWithFallback
                                                src={study.image}
                                                alt={study.company}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="p-8 lg:p-12">
                                            <div className="mb-6">
                                                <h3 className="text-3xl text-gray-900 mb-2">
                                                    {study.company}
                                                </h3>
                                                <p className="text-gray-600">
                                                    {study.industry} • {study.teamSize}
                                                </p>
                                            </div>

                                            <div className="space-y-6">
                                                <div>
                                                    <h4 className="text-lg text-gray-900 mb-2">
                                                        The Challenge
                                                    </h4>
                                                    <p className="text-gray-600">{study.challenge}</p>
                                                </div>

                                                <div>
                                                    <h4 className="text-lg text-gray-900 mb-2">
                                                        The Solution
                                                    </h4>
                                                    <p className="text-gray-600">{study.solution}</p>
                                                </div>

                                                <div>
                                                    <h4 className="text-lg text-gray-900 mb-3">
                                                        The Results
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {study.results.map((result, resultIndex) => (
                                                            <li key={resultIndex} className="flex items-start text-gray-600">
                                                                <span className="text-green-500 mr-2">✓</span>
                                                                {result}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="pt-6 border-t border-gray-200">
                                                    <Quote className="h-8 w-8 text-blue-600 mb-4" />
                                                    <p className="text-lg text-gray-700 mb-4 italic">
                                                        "{study.quote}"
                                                    </p>
                                                    <div>
                                                        <p className="text-gray-900">{study.author}</p>
                                                        <p className="text-sm text-gray-600">{study.role}, {study.company}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button className="mt-8">
                                                Read Full Case Study
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.section>

            {/* Testimonials */}
            <Testimonials />

            {/* CTA */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="py-20 bg-gray-50"
            >
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl sm:text-4xl text-gray-900 mb-6">
                        Join thousands of successful teams
                    </h2>
                    <p className="text-xl text-gray-600 mb-8">
                        Start your free trial today and see how Virevos can transform your workflow
                    </p>
                    <Button size="lg" className="text-lg px-8 py-6">
                        Start Free Trial
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </motion.section>
            <Footer />
        </div>
    );
}
