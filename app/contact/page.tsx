import { Metadata } from "next";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact | Virevos",
  description: "Get in touch with the Virevos team.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Contact Us</h1>
      <p className="text-gray-500 mb-10">
        We&apos;d love to hear from you. Fill out the form below to schedule a
        demo, and we&apos;ll get back to you as soon as possible.
      </p>

      <section className="mb-16">
        <ContactForm />
      </section>
    </main>
  );
}
