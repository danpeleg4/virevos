"use client"

import { motion } from "motion/react";
import { Pricing } from "../components/Pricing";
import { Card } from "../components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Check, X } from "lucide-react";
import React, {JSX} from "react";
import {Navigation} from "@/app/components/Navigation";
import {Footer} from "@/app/components/Footer";

type FeatureValue = boolean | string | number | null | undefined;

const comparisonFeatures = [
    {
        category: "Basic Features",
        features: [
            { name: "Projects", starter: "Up to 5", pro: "Unlimited", enterprise: "Unlimited" },
            { name: "Tasks per project", starter: "100", pro: "Unlimited", enterprise: "Unlimited" },
            { name: "Team members", starter: "1", pro: "Up to 50", enterprise: "Unlimited" },
            { name: "Storage", starter: "1GB", pro: "50GB", enterprise: "Unlimited" },
            { name: "File uploads", starter: true, pro: true, enterprise: true },
        ],
    },
    {
        category: "Advanced Features",
        features: [
            { name: "Custom workflows", starter: false, pro: true, enterprise: true },
            { name: "Automation", starter: false, pro: true, enterprise: true },
            { name: "Analytics & reporting", starter: false, pro: true, enterprise: true },
            { name: "API access", starter: false, pro: true, enterprise: true },
            { name: "Advanced integrations", starter: false, pro: true, enterprise: true },
        ],
    },
    {
        category: "Security & Compliance",
        features: [
            { name: "2FA authentication", starter: true, pro: true, enterprise: true },
            { name: "SSO (SAML)", starter: false, pro: false, enterprise: true },
            { name: "Advanced permissions", starter: false, pro: true, enterprise: true },
            { name: "Audit logs", starter: false, pro: true, enterprise: true },
            { name: "HIPAA compliance", starter: false, pro: false, enterprise: true },
        ],
    },
    {
        category: "Support",
        features: [
            { name: "Email support", starter: true, pro: true, enterprise: true },
            { name: "Priority support", starter: false, pro: true, enterprise: true },
            { name: "Phone support", starter: false, pro: false, enterprise: true },
            { name: "Dedicated account manager", starter: false, pro: false, enterprise: true },
            { name: "SLA guarantee", starter: false, pro: false, enterprise: "99.9%" },
        ],
    },
];

const faqs = [
    {
        question: "Can I change my plan later?",
        answer: "Yes! You can upgrade or downgrade your plan at any time. When you upgrade, you'll be charged the prorated amount for the remainder of your billing cycle. When you downgrade, you'll receive a credit for the next billing cycle.",
    },
    {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for annual Enterprise plans. All payments are processed securely through Stripe.",
    },
    {
        question: "Is there a free trial?",
        answer: "Yes! All paid plans come with a 14-day free trial. No credit card required to start. You can cancel anytime during the trial period without being charged.",
    },
    {
        question: "What happens if I exceed my plan limits?",
        answer: "We'll notify you when you're approaching your limits. You can either upgrade to a higher plan or remove some data to stay within your current plan's limits. We never delete your data.",
    },
    {
        question: "Do you offer discounts for nonprofits or education?",
        answer: "Yes! We offer 50% discounts for verified nonprofit organizations and educational institutions. Contact our sales team to learn more and verify your eligibility.",
    },
    {
        question: "Can I get a refund?",
        answer: "We offer a 30-day money-back guarantee. If you're not satisfied with Virevos for any reason, contact us within 30 days of your purchase for a full refund.",
    },
];

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

const renderValue = (value: FeatureValue): JSX.Element => {
    if (typeof value === "boolean") {
        return value ? (
            <Check className="h-5 w-5 text-green-500 mx-auto" />
        ) : (
            <X className="h-5 w-5 text-gray-300 mx-auto" />
        );
    }

    if (value == null) {
        return <span className="text-gray-300">—</span>; // fallback for null/undefined
    }

    return <span className="text-gray-700">{value}</span>;
};

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navigation />
            <Pricing />
            {/* Comparison Table */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="py-20 bg-gray-50"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
                            Compare plans
                        </h2>
                        <p className="text-xl text-gray-600">
                            Detailed feature comparison across all plans
                        </p>
                    </div>

                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-gray-900">Features</th>
                                    <th className="px-6 py-4 text-center text-gray-900">Starter</th>
                                    <th className="px-6 py-4 text-center text-gray-900">Pro</th>
                                    <th className="px-6 py-4 text-center text-gray-900">Enterprise</th>
                                </tr>
                                </thead>
                                <tbody>
                                {comparisonFeatures.map((category, categoryIndex) => (
                                    <React.Fragment key={`category-fragment-${categoryIndex}`}>
                                        <tr key={`category-${categoryIndex}`} className="bg-blue-50">
                                            <td colSpan={4} className="px-6 py-3 text-gray-900">
                                                {category.category}
                                            </td>
                                        </tr>
                                        {category.features.map((feature, featureIndex) => (
                                            <tr
                                                key={`feature-${categoryIndex}-${featureIndex}`}
                                                className="border-b border-gray-200 hover:bg-gray-50"
                                            >
                                                <td className="px-6 py-4 text-gray-700">{feature.name}</td>
                                                <td className="px-6 py-4 text-center">{renderValue(feature.starter)}</td>
                                                <td className="px-6 py-4 text-center">{renderValue(feature.pro)}</td>
                                                <td className="px-6 py-4 text-center">{renderValue(feature.enterprise)}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </motion.section>

            {/* FAQ */}
            <motion.section
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
                className="py-20"
            >
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
                            Frequently asked questions
                        </h2>
                        <p className="text-xl text-gray-600">
                            Everything you need to know about pricing and billing
                        </p>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                                <AccordionTrigger className="text-left text-gray-900">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-gray-600">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </motion.section>
            <Footer />
        </div>
    );
}
