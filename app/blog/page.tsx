"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { Clock, User, ArrowRight } from "lucide-react";
import { posts, categoryColors, type Category } from "./data";

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
  const router = useRouter();
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
            Insights on virevos, product updates, and engineering deep dives
            from the team.
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
            <div
              onClick={() => router.push(`/blog/${featuredPost.slug}`)}
              className="group cursor-pointer rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all bg-white"
            >
              <div className="grid lg:grid-cols-2">
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
                onClick={() => router.push(`/blog/${post.slug}`)}
                className="group cursor-pointer rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all bg-white flex flex-col"
              >
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
