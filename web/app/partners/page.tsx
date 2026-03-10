import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partners | Virevos",
  description: "Explore partnership opportunities with Virevos.",
};

export default function PartnersPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Partners</h1>
      <p className="text-gray-500 mb-10">
        Grow your business by partnering with Virevos.
      </p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">Partner Program</h2>
          <p>
            We work with agencies, consultants, and technology companies to
            bring Virevos to more users. Our partner program offers referral
            commissions, co-marketing opportunities, and dedicated support.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Become a Partner</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Referral partners — earn commissions on new customers</li>
            <li>Integration partners — connect your product with Virevos</li>
            <li>Agency partners — offer Virevos to your clients</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Get Started</h2>
          <p>
            Interested in partnering with us? Reach out at{" "}
            <a
              href="mailto:partners@virevos.com"
              className="text-blue-600 hover:underline"
            >
              partners@virevos.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
