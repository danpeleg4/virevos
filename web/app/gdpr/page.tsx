import { Metadata } from "next";

export const metadata: Metadata = {
  title: "GDPR | Virevos",
  description: "Virevos GDPR compliance and your data rights under EU law.",
};

export default function GdprPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">GDPR Compliance</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: January 15, 2026</p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">1. Our Commitment</h2>
          <p>
            Virevos is committed to protecting the personal data of EU residents in accordance with
            the General Data Protection Regulation (GDPR).
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">2. Your Rights</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Right to access your personal data</li>
            <li>Right to rectification of inaccurate data</li>
            <li>Right to erasure (&quot;right to be forgotten&quot;)</li>
            <li>Right to data portability</li>
            <li>Right to restrict processing</li>
            <li>Right to object to processing</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">3. Legal Basis for Processing</h2>
          <p>
            We process personal data based on contractual necessity, legitimate interests, and
            user consent where required.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">4. Data Transfers</h2>
          <p>
            Data may be transferred outside the EU to countries with adequate protection or under
            standard contractual clauses.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">5. Contact Our DPO</h2>
          <p>
            To exercise your rights or raise concerns, contact our Data Protection Officer at{" "}
            <a href="mailto:privacy@virevos.com" className="text-blue-600 hover:underline">
              privacy@virevos.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
