"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { ArrowLeft, Clock, User } from "lucide-react";
import { posts, categoryColors, type ContentBlock } from "../data";

function renderBlock(block: ContentBlock, index: number) {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={index} className="text-gray-700 leading-relaxed text-lg">
          {block.text}
        </p>
      );
    case "heading":
      return (
        <h2
          key={index}
          className="text-2xl sm:text-3xl text-gray-900 mt-10 mb-4 first:mt-0"
        >
          {block.text}
        </h2>
      );
    case "subheading":
      return (
        <h3 key={index} className="text-xl text-gray-900 mt-8 mb-3">
          {block.text}
        </h3>
      );
    case "list":
      return (
        <ul key={index} className="space-y-2 pl-2">
          {block.items?.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-gray-700 text-lg"
            >
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote
          key={index}
          className="border-l-4 border-gray-900 pl-6 py-1 my-2"
        >
          <p className="text-xl text-gray-800 italic leading-relaxed">
            {block.text}
          </p>
        </blockquote>
      );
    case "code":
      return (
        <pre
          key={index}
          className="bg-gray-950 text-gray-100 rounded-xl p-6 overflow-x-auto text-sm leading-relaxed font-mono"
        >
          <code>{block.text}</code>
        </pre>
      );
    default:
      return null;
  }
}

export default function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const post = posts.find((p) => p.slug === slug);

  if (!post) notFound();

  const related = posts
    .filter((p) => p.slug !== slug && p.category === post.category)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {post.image && (
          <div className="relative w-full h-64 sm:h-96 overflow-hidden">
            <ImageWithFallback
              src={post.image}
              alt={post.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}

        <div
          className={`bg-gradient-to-b ${post.image ? "from-gray-50 to-white" : "from-gray-50 to-white"} py-12 sm:py-16`}
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => router.push("/blog")}
              className="cursor-pointer flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back to Blog
            </button>

            <span
              className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full mb-4 ${categoryColors[post.category]}`}
            >
              {post.category}
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>

            <p className="text-xl text-gray-500 mb-8 leading-relaxed">
              {post.description}
            </p>

            <div className="flex items-center gap-6 pb-8 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-semibold text-sm flex-shrink-0">
                  {post.author[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {post.author}
                  </p>
                  <p className="text-xs text-gray-500">{post.authorRole}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 ml-auto">
                <span>{post.date}</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Article body */}
      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 space-y-6"
      >
        {post.content.map((block, i) => renderBlock(block, i))}
      </motion.article>

      {/* Related posts */}
      {related.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="border-t border-gray-200 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl text-gray-900 mb-8">
              More from {post.category}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((rel) => (
                <button
                  key={rel.id}
                  onClick={() => router.push(`/blog/${rel.slug}`)}
                  className="cursor-pointer group text-left rounded-xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all bg-white flex flex-col"
                >
                  {rel.image ? (
                    <div className="relative h-40 overflow-hidden">
                      <ImageWithFallback
                        src={rel.image}
                        alt={rel.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-gray-50 to-gray-100" />
                  )}
                  <div className="p-5 flex flex-col flex-1">
                    <span
                      className={`inline-flex self-start text-xs font-medium px-2.5 py-1 rounded-full mb-3 ${categoryColors[rel.category]}`}
                    >
                      {rel.category}
                    </span>
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-700 transition-colors leading-snug flex-1">
                      {rel.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{rel.author}</span>
                      <span className="text-gray-300">·</span>
                      <span>{rel.date}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      <Footer />
    </div>
  );
}
