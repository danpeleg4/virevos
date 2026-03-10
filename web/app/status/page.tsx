import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Status | Virevos",
  description: "Current status of Virevos services.",
};

export default function StatusPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">System Status</h1>
      <p className="text-gray-500 mb-10">
        Real-time status of all Virevos services.
      </p>

      <section className="space-y-4">
        {[
          "Web Application",
          "API",
          "Video Meetings",
          "AI Assistant",
          "Authentication",
          "Database",
          "File Storage",
        ].map((service) => (
          <div
            key={service}
            className="flex items-center justify-between border border-gray-200 rounded-lg px-5 py-4"
          >
            <span className="font-medium">{service}</span>
            <span className="flex items-center gap-2 text-sm text-green-600">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              Operational
            </span>
          </div>
        ))}
      </section>

      <p className="mt-8 text-sm text-gray-400">
        Last updated: February 27, 2026
      </p>
    </main>
  );
}
