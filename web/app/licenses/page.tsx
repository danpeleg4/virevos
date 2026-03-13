import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Licenses | Virevos",
  description: "Open source licenses and third-party attributions for Virevos.",
};

export default function LicensesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Licenses</h1>
      <p className="text-gray-500 mb-10">
        Virevos is built with open source software. We&apos;re grateful to the
        communities behind these projects.
      </p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">Virevos License</h2>
          <p>
            Virevos is proprietary software. All rights reserved. Unauthorized
            reproduction or distribution is prohibited.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Third-Party Libraries</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Next.js — MIT License</li>
            <li>React — MIT License</li>
            <li>Tailwind CSS — MIT License</li>
            <li>Radix UI — MIT License</li>
            <li>Lucide Icons — ISC License</li>
            <li>Drizzle ORM — Apache 2.0 License</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Questions</h2>
          <p>
            For licensing inquiries, contact{" "}
            <a
              href="mailto:legal@virevos.com"
              className="text-blue-600 hover:underline"
            >
              legal@virevos.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
