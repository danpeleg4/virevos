import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog | Virevos",
  description: "Insights, updates, and stories from the Virevos team.",
};

export default function BlogPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Blog</h1>
      <p className="text-gray-500 mb-10">
        Insights, product updates, and stories from the Virevos team.
      </p>

      <section className="space-y-8">
        <div className="border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-2">February 20, 2026</p>
          <h2 className="text-xl font-medium mb-2">How AI is Changing the Way We Work</h2>
          <p className="text-gray-600">
            A look at how intelligent assistants are helping teams save time and stay focused on
            high-impact work.
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-2">January 28, 2026</p>
          <h2 className="text-xl font-medium mb-2">Introducing the Client Portal</h2>
          <p className="text-gray-600">
            Our new client portal makes it easier than ever to collaborate with your clients in a
            dedicated, branded space.
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-2">December 5, 2025</p>
          <h2 className="text-xl font-medium mb-2">Welcome to Virevos</h2>
          <p className="text-gray-600">
            We're excited to announce the launch of Virevos — the productivity platform built for
            the modern professional.
          </p>
        </div>
      </section>
    </main>
  );
}
