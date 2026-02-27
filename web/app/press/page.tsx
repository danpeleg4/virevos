import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press | Virevos",
  description: "Press resources and media inquiries for Virevos.",
};

export default function PressPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Press</h1>
      <p className="text-gray-500 mb-10">
        Resources for journalists and media covering Virevos.
      </p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">Media Inquiries</h2>
          <p>
            For press inquiries, interview requests, or media partnerships, please contact us at{" "}
            <a href="mailto:press@virevos.com" className="text-blue-600 hover:underline">
              press@virevos.com
            </a>
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">About Virevos</h2>
          <p className="text-gray-600">
            Virevos is a productivity platform designed to help professionals and teams accomplish
            more with less effort. Founded in 2025, Virevos combines AI-powered tools, seamless
            collaboration, and intuitive design.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Press Kit</h2>
          <p className="text-gray-600">
            Logos, brand assets, and company fact sheets available upon request.
          </p>
        </div>
      </section>
    </main>
  );
}
