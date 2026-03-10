"use client";

import { motion } from "motion/react";
import { Card } from "../components/ui/card";
import {
  Shield,
  Lock,
  Key,
  Eye,
  FileCheck,
  Server,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";

const securityFeatures = [
  {
    icon: Lock,
    title: "256-bit Encryption",
    description:
      "All data is encrypted both in transit and at rest using industry-standard AES-256 encryption.",
  },
  {
    icon: Key,
    title: "Two-Factor Authentication",
    description:
      "Add an extra layer of security with 2FA support via SMS, authenticator apps, or security keys.",
  },
  {
    icon: Eye,
    title: "Role-Based Access Control",
    description:
      "Granular permission settings ensure team members only see what they need to see.",
  },
  {
    icon: FileCheck,
    title: "SOC 2 Type II Certified",
    description:
      "We've completed rigorous third-party audits to ensure we meet the highest security standards.",
  },
  {
    icon: Server,
    title: "Data Redundancy",
    description:
      "Your data is backed up across multiple secure locations with automatic failover.",
  },
  {
    icon: AlertCircle,
    title: "Real-time Monitoring",
    description:
      "24/7 security monitoring and automated threat detection to keep your data safe.",
  },
];

const compliances = [
  { name: "SOC 2 Type II", status: "Certified" },
  { name: "GDPR", status: "Compliant" },
  { name: "CCPA", status: "Compliant" },
  { name: "HIPAA", status: "Available" },
  { name: "ISO 27001", status: "In Progress" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function Security() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      {/* Hero Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="py-20 sm:py-32 bg-gradient-to-b from-green-50 to-white"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6"
            >
              <Shield className="h-10 w-10 text-green-600" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-5xl sm:text-6xl text-gray-900 mb-6"
            >
              Enterprise-grade security
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-xl text-gray-600"
            >
              Your data security and privacy are our top priorities. We
              implement industry-leading practices to keep your information
              safe.
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Security Features */}
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
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
              Security features
            </h2>
            <p className="text-xl text-gray-600">
              Comprehensive security measures to protect your data
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {securityFeatures.map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="p-8 h-full hover:shadow-lg transition-shadow duration-300 border-gray-200">
                  <div className="bg-green-100 rounded-lg w-12 h-12 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-xl text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Compliance */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="py-20 bg-gray-50"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
              Compliance & Certifications
            </h2>
            <p className="text-xl text-gray-600">
              We meet the highest industry standards for security and compliance
            </p>
          </div>

          <Card className="p-8">
            <div className="space-y-4">
              {compliances.map((compliance, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-gray-900">{compliance.name}</span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    {compliance.status}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </motion.section>

      {/* Security Practices */}
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
              Our security practices
            </h2>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-xl text-gray-900 mb-2">
                Regular Security Audits
              </h3>
              <p className="text-gray-600">
                We conduct regular third-party security audits and penetration
                testing to identify and address potential vulnerabilities.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl text-gray-900 mb-2">Employee Training</h3>
              <p className="text-gray-600">
                All employees undergo comprehensive security training and follow
                strict security protocols to protect your data.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl text-gray-900 mb-2">Incident Response</h3>
              <p className="text-gray-600">
                We have a dedicated security team and incident response plan to
                quickly address any security concerns.
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="text-xl text-gray-900 mb-2">Data Privacy</h3>
              <p className="text-gray-600">
                We never sell your data. Your information is yours, and
                we&apos;re committed to keeping it private and secure.
              </p>
            </Card>
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="py-20 bg-gray-50"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
            Questions about security?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Our security team is here to help. Contact us for detailed
            information or a security review.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">Contact Security Team</Button>
            <Button size="lg" variant="outline">
              Download Security Whitepaper
            </Button>
          </div>
        </div>
      </motion.section>
      <Footer />
    </div>
  );
}
