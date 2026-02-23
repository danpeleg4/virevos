"use client";

import { motion } from "motion/react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  BookOpen,
  GraduationCap,
  Video,
  Newspaper,
  Users,
  ArrowRight,
  Clock,
  Play,
  ChevronRight,
} from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { useRouter } from "next/navigation";

const learningPaths = [
  {
    icon: BookOpen,
    title: "Documentation",
    description:
      "Comprehensive guides and API reference for every Virevos feature.",
    badge: "Always updated",
    color: "blue",
    path: "/learn/docs",
    count: "200+ articles",
  },
  {
    icon: GraduationCap,
    title: "Guides & Tutorials",
    description:
      "Step-by-step tutorials to help you master workflows and features.",
    badge: "Beginner friendly",
    color: "green",
    path: "/learn/guides",
    count: "50+ guides",
  },
  {
    icon: Video,
    title: "Webinars",
    description:
      "Live and on-demand webinars hosted by the Virevos team and experts.",
    badge: "Live weekly",
    color: "purple",
    path: "/learn/webinars",
    count: "30+ sessions",
  },
  {
    icon: Newspaper,
    title: "Blog",
    description:
      "Insights, tips, and best practices for productivity and collaboration.",
    badge: "New posts weekly",
    color: "orange",
    path: "/learn/blog",
    count: "100+ posts",
  },
  {
    icon: Users,
    title: "Community",
    description:
      "Connect with thousands of Virevos users, share ideas, and get help.",
    badge: "10k+ members",
    color: "pink",
    path: "/learn/community",
    count: "Active forum",
  },
];

const featuredGuides = [
  {
    category: "Getting Started",
    title: "Your First Project in Virevos",
    excerpt:
      "Set up your workspace, invite your team, and create your first project in under 10 minutes.",
    readTime: "5 min read",
    difficulty: "Beginner",
  },
  {
    category: "Workflows",
    title: "Building Custom Automations",
    excerpt:
      "Learn how to automate repetitive tasks and build powerful workflows tailored to your team.",
    readTime: "8 min read",
    difficulty: "Intermediate",
  },
  {
    category: "Collaboration",
    title: "Team Management Best Practices",
    excerpt:
      "How to organize your team, assign roles, and keep everyone aligned on shared goals.",
    readTime: "6 min read",
    difficulty: "Beginner",
  },
  {
    category: "Analytics",
    title: "Understanding Your Productivity Data",
    excerpt:
      "Dive into Virevos analytics to identify bottlenecks and improve team performance.",
    readTime: "7 min read",
    difficulty: "Intermediate",
  },
];

const videoTutorials = [
  {
    title: "Getting Started with Virevos",
    duration: "12:34",
    views: "24k views",
    thumbnail: "GS",
  },
  {
    title: "Mastering Task Management",
    duration: "18:21",
    views: "18k views",
    thumbnail: "TM",
  },
  {
    title: "Advanced Integrations Setup",
    duration: "22:15",
    views: "12k views",
    thumbnail: "AI",
  },
];

const popularTopics = [
  "Getting Started",
  "Task Management",
  "Team Collaboration",
  "Custom Workflows",
  "Integrations Setup",
  "Mobile App",
  "Analytics & Reports",
  "API & Webhooks",
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const colorClasses = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-600",
  pink: "bg-pink-100 text-pink-600",
};

const badgeColors = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  purple: "bg-purple-50 text-purple-700",
  orange: "bg-orange-50 text-orange-700",
  pink: "bg-pink-50 text-pink-700",
};

const difficultyColors = {
  Beginner: "bg-green-100 text-green-700",
  Intermediate: "bg-yellow-100 text-yellow-700",
  Advanced: "bg-red-100 text-red-700",
};

export default function Learn() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="py-20 sm:py-32 bg-gradient-to-b from-emerald-50 to-white"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-6 bg-emerald-100 text-emerald-700">
                Learning Hub
              </Badge>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl text-gray-900 mb-6"
            >
              Learn & grow with Virevos
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-gray-600"
            >
              Explore guides, tutorials, webinars, and a thriving community to
              help you get the most out of Virevos.
            </motion.p>
          </div>
        </div>
      </motion.section>

      {/* Learning Paths */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
          },
        }}
        className="py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">
              Choose your learning path
            </h2>
            <p className="text-xl text-gray-600">
              Whatever you want to learn, we have a resource for it
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {learningPaths.map((path, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card
                  className="p-8 h-full hover:shadow-xl transition-all duration-300 border-gray-200 group cursor-pointer"
                  onClick={() => router.push(path.path)}
                >
                  <div
                    className={`rounded-lg w-14 h-14 flex items-center justify-center mb-6 ${colorClasses[path.color as keyof typeof colorClasses]}`}
                  >
                    <path.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {path.title}
                  </h3>
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full mb-3 ${badgeColors[path.color as keyof typeof badgeColors]}`}
                  >
                    {path.badge}
                  </span>
                  <p className="text-gray-600 mb-2">{path.description}</p>
                  <p className="text-sm text-gray-400 mb-6">{path.count}</p>
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

      {/* Featured Guides */}
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
                Featured guides
              </h2>
              <p className="text-xl text-gray-600">
                Our most popular guides to get you up and running fast
              </p>
            </div>
            <Button variant="outline" className="hidden sm:flex">
              View All Guides
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {featuredGuides.map((guide, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow duration-300 cursor-pointer group">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-sm text-blue-600">
                      {guide.category}
                    </span>
                    <span className="text-gray-400">•</span>
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {guide.readTime}
                    </span>
                    <span className="text-gray-400">•</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[guide.difficulty as keyof typeof difficultyColors]}`}
                    >
                      {guide.difficulty}
                    </span>
                  </div>
                  <h3 className="text-xl text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{guide.excerpt}</p>
                  <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                    <span className="text-sm">Read guide</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Button variant="outline">
              View All Guides
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Video Tutorials */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 },
          },
        }}
        className="py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeInUp}
            className="flex items-center justify-between mb-12"
          >
            <div>
              <h2 className="text-3xl sm:text-4xl text-gray-900 mb-2">
                Video tutorials
              </h2>
              <p className="text-xl text-gray-600">
                Learn by watching — at your own pace
              </p>
            </div>
            <Button variant="outline" className="hidden sm:flex">
              View All Videos
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videoTutorials.map((video, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-200 cursor-pointer group">
                  <div className="relative bg-gradient-to-br from-blue-100 to-indigo-100 h-44 flex items-center justify-center">
                    <span className="text-5xl font-light text-blue-200 select-none">
                      {video.thumbnail}
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                        <Play className="h-6 w-6 text-blue-600 ml-1" />
                      </div>
                    </div>
                    <span className="absolute bottom-3 right-3 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                      {video.duration}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-500">{video.views}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Popular Topics */}
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
              Popular topics
            </h2>
            <p className="text-xl text-gray-600">
              Jump right into the most-searched subjects
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {popularTopics.map((topic, index) => (
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

      {/* Community CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeInUp}
        className="py-20 bg-gradient-to-r from-blue-600 to-blue-800"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl text-white mb-6">
            Join the Virevos community
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            10,000+ users sharing tips, workflows, and ideas. Ask questions, get
            answers, and connect with like-minded teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              Join Community
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 bg-transparent text-white border-white hover:bg-white hover:text-blue-600"
            >
              Browse Guides
            </Button>
          </div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
