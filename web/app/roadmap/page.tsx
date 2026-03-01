import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Roadmap | Virevos",
  description: "See what's coming next for Virevos.",
};

export default function RoadmapPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Roadmap</h1>
      <p className="text-gray-500 mb-10">
        Here&apos;s a look at what we&apos;re building and planning for Virevos.
      </p>

      <section className="space-y-8">
        <div>
          <h2 className="text-xl font-medium mb-2">In Progress</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Enhanced AI assistant capabilities</li>
            <li>Improved calendar integrations</li>
            <li>Mobile app for iOS and Android</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Coming Soon</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Advanced analytics dashboard</li>
            <li>Team collaboration features</li>
            <li>Third-party app integrations</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Future</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Enterprise SSO support</li>
            <li>Custom workflow automation</li>
            <li>API access for developers</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
