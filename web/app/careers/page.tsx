import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers | Virevos",
  description: "Join the Virevos team and help build the future of productivity.",
};

export default function CareersPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Careers</h1>
      <p className="text-gray-500 mb-10">
        Help us build the productivity platform of the future.
      </p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">Why Virevos?</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Work on products used by thousands of professionals</li>
            <li>Collaborative, remote-friendly culture</li>
            <li>Competitive compensation and equity</li>
            <li>Flexible hours and unlimited PTO</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Open Positions</h2>
          <p className="text-gray-600">
            We don't have any open roles right now, but we're always interested in connecting with
            talented people. Send your resume to{" "}
            <a href="mailto:careers@virevos.com" className="text-blue-600 hover:underline">
              careers@virevos.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
