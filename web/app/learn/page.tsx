"use client";

import { motion } from "motion/react";
import { Button } from "../components/ui/button";
import {
  BookOpen,
  GraduationCap,
  Video,
  Newspaper,
  Users,
  ArrowRight,
  Clock,
  Play,
  Sparkles,
  Bot,
  Calendar,
  Zap,
  MessageSquare,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { useRouter } from "next/navigation";

const learningPaths = [
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Comprehensive guides and reference for every Virevos feature — from client management to AI tools.",
    badge: "Always updated",
    badgeBg: "bg-blue-50 text-blue-700",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    count: "200+ articles",
    path: "/learn/docs",
  },
  {
    icon: GraduationCap,
    title: "Guides & Tutorials",
    description: "Step-by-step tutorials to help you set up workflows, automate tasks, and get the most out of Virevos.",
    badge: "Beginner friendly",
    badgeBg: "bg-green-50 text-green-700",
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
    count: "50+ guides",
    path: "/learn/guides",
  },
  {
    icon: Video,
    title: "Video Tutorials",
    description: "Watch walkthroughs of key features — from running your first meeting to building automations.",
    badge: "New weekly",
    badgeBg: "bg-purple-50 text-purple-700",
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    count: "30+ videos",
    path: "/learn/videos",
  },
  {
    icon: Newspaper,
    title: "Blog",
    description: "Tips, workflows, and best practices for freelancers and service professionals.",
    badge: "New posts weekly",
    badgeBg: "bg-orange-50 text-orange-700",
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    count: "100+ posts",
    path: "/blog",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with other Virevos users, share workflows, and get help from people who've been there.",
    badge: "10k+ members",
    badgeBg: "bg-pink-50 text-pink-700",
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    count: "Active forum",
    path: "/community",
  },
];

const featuredGuides = [
  {
    category: "Getting Started",
    categoryColor: "text-blue-600",
    title: "Set up your Virevos workspace",
    excerpt: "Add your first client, create a project, and get your workspace organized in under 10 minutes.",
    readTime: "5 min read",
    difficulty: "Beginner",
    difficultyColor: "bg-green-100 text-green-700",
  },
  {
    category: "AI Assistant",
    categoryColor: "text-pink-600",
    title: "Getting the most from your AI assistant",
    excerpt: "Learn how to add clients through chat, search past meeting transcripts, and use AI to streamline your work.",
    readTime: "7 min read",
    difficulty: "Beginner",
    difficultyColor: "bg-green-100 text-green-700",
  },
  {
    category: "Video Meetings",
    categoryColor: "text-purple-600",
    title: "Running your first client meeting",
    excerpt: "Start a video call, use auto transcription, and review AI-generated summaries and action items after the call.",
    readTime: "6 min read",
    difficulty: "Beginner",
    difficultyColor: "bg-green-100 text-green-700",
  },
  {
    category: "Automation",
    categoryColor: "text-orange-600",
    title: "Building your first workflow automation",
    excerpt: "Create a trigger-based automation for client onboarding — no code required.",
    readTime: "8 min read",
    difficulty: "Intermediate",
    difficultyColor: "bg-yellow-100 text-yellow-700",
  },
];

const videoTutorials = [
  {
    title: "Getting Started with Virevos",
    duration: "12:34",
    views: "24k views",
    gradient: "from-blue-400 to-blue-600",
  },
  {
    title: "Running Client Meetings with Auto Transcription",
    duration: "18:21",
    views: "18k views",
    gradient: "from-purple-400 to-violet-600",
  },
  {
    title: "Building Workflow Automations",
    duration: "15:10",
    views: "12k views",
    gradient: "from-yellow-400 to-orange-500",
  },
];

const popularTopics = [
  { icon: Bot, label: "AI Assistant" },
  { icon: Video, label: "Video Meetings" },
  { icon: Calendar, label: "Google Calendar Sync" },
  { icon: Zap, label: "Workflow Automation" },
  { icon: Users, label: "Client Management" },
  { icon: MessageSquare, label: "Communications" },
  { icon: BarChart3, label: "Analytics & Reports" },
  { icon: BookOpen, label: "Billing & Plans" },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Learn() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-gray-700">Learning hub</span>
            </div>
          </motion.div>

          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl text-gray-900 mb-6 leading-tight"
            >
              Learn{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Virevos
              </span>
              , your way
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl sm:text-2xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Guides, videos, and docs to help you set up your workspace, run client meetings, and automate your workflow.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg rounded-xl shadow-lg group"
                onClick={() => router.push("/learn/docs")}
              >
                Browse documentation
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl"
                onClick={() => router.push("/learn/guides")}
              >
                View guides
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Learning Paths */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <h2 className="text-4xl sm:text-5xl text-gray-900 mb-4">Choose your path</h2>
            <p className="text-xl text-gray-500">
              Whatever you want to learn, we have a resource for it.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {learningPaths.map((path, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <div
                  className="h-full bg-white border border-gray-200 rounded-2xl p-7 hover:shadow-xl hover:border-gray-300 transition-all duration-300 cursor-pointer group"
                  onClick={() => router.push(path.path)}
                >
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${path.iconBg} mb-5`}>
                    <path.icon className={`h-6 w-6 ${path.iconColor}`} />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {path.title}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${path.badgeBg}`}>
                      {path.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{path.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{path.count}</span>
                    <div className="flex items-center text-blue-600 text-sm gap-1 group-hover:gap-2 transition-all">
                      Explore <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Featured Guides */}
      <section className="py-20 sm:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl text-gray-900 mb-2">Featured guides</h2>
              <p className="text-lg text-gray-500">Start here if you're new to Virevos</p>
            </div>
            <Button
              variant="outline"
              className="hidden sm:flex border-gray-200 text-gray-700 hover:bg-white rounded-xl"
              onClick={() => router.push("/learn/guides")}
            >
              View all guides
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-5 md:grid-cols-2"
          >
            {featuredGuides.map((guide, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <div className="h-full bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-sm font-medium ${guide.categoryColor}`}>
                      {guide.category}
                    </span>
                    <span className="text-gray-300">·</span>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock className="h-3 w-3" />
                      {guide.readTime}
                    </div>
                    <span className="text-gray-300">·</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${guide.difficultyColor}`}>
                      {guide.difficulty}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4 leading-relaxed">{guide.excerpt}</p>
                  <div className="flex items-center text-blue-600 text-sm gap-1 group-hover:gap-2 transition-all">
                    Read guide <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-8 text-center sm:hidden">
            <Button
              variant="outline"
              className="border-gray-200 rounded-xl"
              onClick={() => router.push("/learn/guides")}
            >
              View all guides <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Video Tutorials */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl sm:text-4xl text-gray-900 mb-2">Video tutorials</h2>
              <p className="text-lg text-gray-500">Learn by watching — at your own pace</p>
            </div>
            <Button
              variant="outline"
              className="hidden sm:flex border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
              onClick={() => router.push("/learn/videos")}
            >
              View all videos
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {videoTutorials.map((video, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <div className="overflow-hidden border border-gray-200 rounded-2xl hover:shadow-xl hover:border-gray-300 transition-all duration-300 cursor-pointer group bg-white">
                  <div className={`relative bg-gradient-to-br ${video.gradient} h-44 flex items-center justify-center`}>
                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                      <Play className="h-6 w-6 text-gray-900 ml-0.5" />
                    </div>
                    <span className="absolute bottom-3 right-3 text-xs bg-black/60 text-white px-2 py-0.5 rounded-md">
                      {video.duration}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-sm text-gray-400">{video.views}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="py-20 sm:py-24 bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl text-gray-900 mb-4">Popular topics</h2>
            <p className="text-lg text-gray-500">Jump right into the most-searched subjects</p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-3 sm:grid-cols-2"
          >
            {popularTopics.map((topic, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <topic.icon className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="text-gray-700 group-hover:text-blue-600 transition-colors font-medium text-sm">
                      {topic.label}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Community CTA */}
      <section className="py-24 sm:py-32 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm mb-8">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-700">10,000+ members</span>
            </div>
            <h2 className="text-4xl sm:text-5xl text-gray-900 mb-6 leading-tight">
              Join the{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Virevos community
              </span>
            </h2>
            <p className="text-xl text-gray-500 mb-10">
              Thousands of freelancers sharing workflows, tips, and ideas. Ask questions and get answers from people who've been there.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-lg rounded-xl shadow-lg group"
                onClick={() => router.push("/community")}
              >
                Join the community
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-200 text-gray-700 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl"
                onClick={() => router.push("/learn/guides")}
              >
                Browse guides
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
