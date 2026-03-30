import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog | Virevos",
  description: "A history of updates and improvements to Virevos.",
};

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Changelog</h1>
      <p className="text-gray-500 mb-10">
        Every update, fix, and improvement we&apos;ve shipped.
      </p>

      <section className="space-y-10">
        <div>
          <h2 className="text-xl font-medium mb-1">v1.3.0 — February 2026</h2>
          <p className="text-sm text-gray-500 mb-3">
            Released February 15, 2026
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>AI assistant now supports meeting summaries</li>
            <li>Improved billing page with invoice history</li>
            <li>Bug fixes for calendar sync</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-1">v1.2.0 — January 2026</h2>
          <p className="text-sm text-gray-500 mb-3">
            Released January 10, 2026
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Launched client portal</li>
            <li>Added activity logs</li>
            <li>Performance improvements across the dashboard</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-1">v1.0.0 — December 2025</h2>
          <p className="text-sm text-gray-500 mb-3">
            Released December 1, 2025
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Initial launch of Virevos</li>
            <li>Core workspace features: projects, tasks, clients</li>
            <li>Meeting and video call support</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
