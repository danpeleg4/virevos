import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Virevos",
  description: "Get in touch with the Virevos team.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Contact Us</h1>
      <p className="text-gray-500 mb-10">
        We&apos;d love to hear from you. Reach out and we&apos;ll get back to
        you as soon as possible.
      </p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">General Inquiries</h2>
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
