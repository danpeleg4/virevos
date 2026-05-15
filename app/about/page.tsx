import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Virevos",
  description: "Learn about Virevos and our mission.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">About Virevos</h1>
      <p className="mb-10 font-medium ">
        We are building the intelligent infrastructure for the next generation
        of global talent. Virevos was born out of a personal realization: the
        path from a student visa to a professional career is a high-stakes
        journey currently held together by manual checklists and human memory.
        We are here to change that.
      </p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">Our Mission</h2>
          <p>
            To eliminate the friction and risk in immigration. We combine
            AI-driven consultations with autonomous auditing to ensure that a
            student’s future is never compromised by a missed deadline or a
            manual oversight.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Our Values</h2>
          <p>
            Precision over Complexity: In immigration, 99% accuracy isn&#39;t
            enough. We build for the 100%.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Founder-Led Empathy</h2>
          <p>
            We build for international students because we are international
            students.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Security by Design</h2>
          <p>
            Handling legal documents is a privilege. We prioritize data
            integrity and privacy in every line of code.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Focus on the Outcome</h2>
          <p>
            We don&#39;t just &#34;manage projects&#34;—we help people secure
            their futures.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Get in Touch</h2>
          <p>
            Have questions? Reach us at{" "}
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
