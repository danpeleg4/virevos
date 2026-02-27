import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Virevos",
  description: "Learn about Virevos and our mission.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">About Virevos</h1>
      <p className="text-gray-500 mb-10">
        We're building the productivity platform that helps you accomplish more, effortlessly.
      </p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">Our Mission</h2>
          <p>
            Virevos was founded with a simple belief: great work shouldn't require great effort to
            organize. We combine smart AI, seamless collaboration, and an intuitive interface to
            help individuals and teams focus on what matters most.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Our Values</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Simplicity over complexity</li>
            <li>Customer success first</li>
            <li>Transparency in everything we do</li>
            <li>Continuous improvement</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Get in Touch</h2>
          <p>
            Have questions? Reach us at{" "}
            <a href="mailto:hello@virevos.com" className="text-blue-600 hover:underline">
              hello@virevos.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
