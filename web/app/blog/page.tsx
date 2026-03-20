"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Clock, User, ArrowRight } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

type Category = "Everything" | "News" | "Guides" | "Company" | "Engineering";

interface BlogPost {
  id: number;
  title: string;
  description: string;
  category: Exclude<Category, "Everything">;
  author: string;
  date: string;
  readTime: string;
  image?: string;
  featured?: boolean;
}

const categoryColors: Record<Exclude<Category, "Everything">, string> = {
  News: "bg-blue-100 text-blue-700",
  Guides: "bg-green-100 text-green-700",
  Company: "bg-purple-100 text-purple-700",
  Engineering: "bg-orange-100 text-orange-700",
};

const posts: BlogPost[] = [
  {
    id: 1,
    title: "Introducing Virevos 2.0: A new era of freelance management",
    description:
      "We've completely reimagined how freelancers manage their business. From smarter invoicing to AI-powered client communication, here's everything that's new.",
    category: "Company",
    author: "John Doe",
    date: "Mar 15, 2026",
    readTime: "5 min read",
    image:
      "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMHdvcmtzcGFjZXxlbnwxfHx8fDE3NjI3MTgxMzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
    featured: true,
  },
  {
    id: 2,
    title: "How to set your freelance rates in 2026",
    description:
      "Pricing your services is one of the hardest parts of freelancing. We break down a data-driven framework to help you charge what you're worth.",
    category: "Guides",
    author: "Sarah Kim",
    date: "Mar 10, 2026",
    readTime: "8 min read",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVlbGFuY2UlMjB3b3JrfGVufDF8fHx8MTc2MjcxODEzNXww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 3,
    title: "Building our real-time collaboration engine",
    description:
      "A deep dive into the architecture decisions behind Virevos's live sync — WebSockets, conflict resolution, and lessons learned at scale.",
    category: "Engineering",
    author: "Alex Torres",
    date: "Mar 7, 2026",
    readTime: "12 min read",
  },
  {
    id: 4,
    title: "Virevos raises $8M Series A to expand globally",
    description:
      "We're thrilled to announce our Series A funding round, led by Accel Partners. Here's what this means for our roadmap and community.",
    category: "News",
    author: "John Doe",
    date: "Feb 28, 2026",
    readTime: "3 min read",
    image:
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdW5kaW5nJTIwc3RhcnR1cHxlbnwxfHx8fDE3NjI3MTgxMzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 5,
    title: "The ultimate guide to client onboarding",
    description:
      "A smooth onboarding process sets the tone for the entire project. Here's a step-by-step playbook used by Virevos's top-earning freelancers.",
    category: "Guides",
    author: "Maya Patel",
    date: "Feb 20, 2026",
    readTime: "10 min read",
  },
  {
    id: 6,
    title: "How we built our AI assistant with OpenAI tool calls",
    description:
      "The engineering story behind Virevos's AI assistant — from prompt design to streaming responses and integrating with live client data.",
    category: "Engineering",
    author: "Alex Torres",
    date: "Feb 14, 2026",
    readTime: "15 min read",
    image:
      "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBSSUyMGFzc2lzdGFudHxlbnwxfHx8fDE3NjI3MTgxMzV8MA&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: 7,
    title: "Meet the team: A year of growth at Virevos",
    description:
      "We went from 4 to 18 people this year. Here's how we've kept our culture intact while scaling fast — and what we look for in new hires.",
    category: "Company",
    author: "John Doe",
    date: "Feb 5, 2026",
    readTime: "6 min read",
  },
  {
    id: 8,
    title: "Virevos now integrates with Google Calendar",
    description:
      "Real-time calendar sync is here. Book meetings, track deadlines, and manage your schedule — all without leaving Virevos.",
    category: "News",
    author: "Sarah Kim",
    date: "Jan 28, 2026",
    readTime: "2 min read",
    image:
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxlbmRhciUyMGludGVncmF0aW9ufGVufDF8fHx8MTc2MjcxODEzNXww&ixlib=rb-4.1.0&q=80&w=1080",
  },
];

const categories: Category[] = [
  "Everything",
  "News",
  "Guides",
  "Company",
  "Engineering",
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState<Category>("Everything");

  const filteredPosts =
    activeCategory === "Everything"
      ? posts
      : posts.filter((p) => p.category === activeCategory);

  const featuredPost =
    activeCategory === "Everything"
      ? filteredPosts.find((p) => p.featured)
      : undefined;
  const gridPosts = featuredPost
    ? filteredPosts.filter((p) => !p.featured)
    : filteredPosts;

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Header */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        transition={{ duration: 0.4 }}
        className="py-16 sm:py-20 bg-gradient-to-b from-gray-50 to-white"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.h1
            variants={fadeInUp}
            className="text-5xl sm:text-6xl text-gray-900 mb-4"
          >
            Blog
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-500 max-w-xl"
          >
            Insights on freelancing, product updates, and engineering deep dives
            from the Virevos team.
          </motion.p>
        </div>
      </motion.section>

      {/* Category Tabs */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-y border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-3 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 cursor-pointer px-4 py-1.5 rounded-full text-sm transition-all ${
                  activeCategory === cat
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Featured Post */}
        {featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-12"
          >
            <div className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all bg-white">
              <div className="grid lg:grid-cols-2">
                {featuredPost.image && (
                  <div className="relative h-64 lg:h-full min-h-[280px] overflow-hidden">
                    <ImageWithFallback
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-8 sm:p-10 flex flex-col justify-center">
                  <span
                    className={`inline-flex self-start text-xs font-medium px-2.5 py-1 rounded-full mb-4 ${categoryColors[featuredPost.category]}`}
                  >
                    {featuredPost.category}
                  </span>
                  <h2 className="text-2xl sm:text-3xl text-gray-900 mb-3 group-hover:text-gray-700 transition-colors leading-snug">
                    {featuredPost.title}
                  </h2>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {featuredPost.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {featuredPost.author}
                      </span>
                      <span>{featuredPost.date}</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {featuredPost.readTime}
                      </span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Post Grid */}
        {filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 text-gray-500"
          >
            No posts in this category yet.
          </motion.div>
        ) : (
          <motion.div
            key={activeCategory}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.07 },
              },
            }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {gridPosts.map((post) => (
              <motion.article
                key={post.id}
                variants={fadeInUp}
                className="group cursor-pointer rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all bg-white flex flex-col"
              >
                {post.image ? (
                  <div className="relative h-44 overflow-hidden">
                    <ImageWithFallback
                      src={post.image}
                      alt={post.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                  </div>
                ) : null}

                <div className="p-6 flex flex-col flex-1">
                  <span
                    className={`inline-flex self-start text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${categoryColors[post.category]}`}
                  >
                    {post.category}
                  </span>
                  <h3 className="text-base font-medium text-gray-900 mb-2 group-hover:text-gray-700 transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed flex-1 line-clamp-3">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 font-medium flex-shrink-0">
                      {post.author[0]}
                    </div>
                    <span>{post.author}</span>
                    <span className="text-gray-300">·</span>
                    <span>{post.date}</span>
                    <span className="ml-auto flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}
