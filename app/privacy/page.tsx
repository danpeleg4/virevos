import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Virevos",
  description: "Learn how Virevos collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">
        Last updated: March 27, 2026
      </p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">1. Introduction</h2>
          <p>
            Virevos (“we”, “our”, or “us”) values your privacy. This Privacy
            Policy explains how we collect, use, disclose, and protect your
            information when you use our services.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">
            2. Information We Collect
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Personal information such as name and email</li>
            <li>Account and authentication details</li>
            <li>Usage data including IP address and browser type</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">
            3. How We Use Information
          </h2>
          <p>
            We use collected information to operate, maintain, improve, and
            secure the Virevos platform, communicate with users, and comply with
            legal obligations.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">
            4. Google OAuth and Calendar Integration
          </h2>
          <p className="mb-3">
            When you connect your Google account, we request access to your
            Google Calendar via OAuth 2.0. Here is what we access and how we use
            it:
          </p>

          <h3 className="font-medium mt-4 mb-2">What Google data we collect</h3>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li>
              <strong>Calendar events:</strong> We read your calendar events
              (titles, times, attendees, descriptions) to display them within
              Virevos and to provide AI-assisted scheduling and meeting
              management features.
            </li>
            <li>
              <strong>OAuth tokens:</strong> We securely store your OAuth access
              and refresh tokens to maintain an active sync with your Google
              Calendar without requiring you to re-authenticate.
            </li>
            <li>
              <strong>Sync tokens:</strong> We use Google Calendar sync tokens
              to efficiently fetch only new or changed events rather than
              re-fetching your entire calendar.
            </li>
          </ul>

          <h3 className="font-medium mt-4 mb-2">How long we retain it</h3>
          <p className="mb-3">
            Your Google Calendar data (events, OAuth tokens, and sync state) is
            retained for as long as your Google account remains connected to
            Virevos. We do not retain Google data beyond what is needed to
            provide the active integration.
          </p>

          <h3 className="font-medium mt-4 mb-2">How to request deletion</h3>
          <p className="mb-3">
            You may request deletion of your Google data at any time by
            disconnecting your Google account from the Integrations settings
            page, or by emailing us at{" "}
            <a
              href="mailto:business@virevos.com"
              className="text-blue-600 hover:underline"
            >
              business@virevos.com
            </a>
            . Upon disconnection, we will revoke the active sync channel and
            permanently delete your stored OAuth tokens and all synced calendar
            data from our systems.
          </p>

          <h3 className="font-medium mt-4 mb-2">Revoking access via Google</h3>
          <p className="mb-3">
            You can also revoke Virevos&apos;s access to your Google account at
            any time directly through{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Google Security Settings
            </a>
            . Revoking access there will immediately invalidate our stored
            tokens; we recommend also disconnecting from the Virevos
            Integrations page to ensure all local data is deleted.
          </p>

          <p>
            We do not share your Google Calendar data with third parties, and we
            do not use it for advertising purposes. Your calendar data is used
            exclusively to power Virevos features you have explicitly enabled.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">5. Data Sharing</h2>
          <p>
            We do not sell personal data. Information may be shared with trusted
            service providers or when required by law.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">6. Data Security</h2>
          <p>
            We implement industry-standard security measures, but no system is
            completely secure.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">7. Your Rights</h2>
          <p>
            You may request access, correction, or deletion of your personal
            data by contacting us.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">8. Contact</h2>
          <p>
            Email us at{" "}
            <a
              href="mailto:business@virevos.com"
              className="text-blue-600 hover:underline"
            >
              business@virevos.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
