import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Virevos",
  description: "How Virevos uses cookies and similar technologies.",
};

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Cookie Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: January 15, 2026</p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">1. What Are Cookies</h2>
          <p>
            Cookies are small text files placed on your device when you visit a website. They help
            us remember your preferences and improve your experience.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">2. How We Use Cookies</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>
              <strong>Essential cookies:</strong> Required for the platform to function (e.g.,
              authentication sessions)
            </li>
            <li>
              <strong>Analytics cookies:</strong> Help us understand how users interact with
              Virevos
            </li>
            <li>
              <strong>Preference cookies:</strong> Remember your settings and preferences
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">3. Managing Cookies</h2>
          <p>
            You can control cookies through your browser settings. Note that disabling certain
            cookies may affect platform functionality.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">4. Contact</h2>
          <p>
            Questions about our cookie use? Email{" "}
            <a href="mailto:privacy@virevos.com" className="text-blue-600 hover:underline">
              privacy@virevos.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
