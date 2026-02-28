import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community | Virevos",
  description: "Join the Virevos community to connect, share, and learn.",
};

export default function CommunityPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
      <h1 className="text-3xl font-semibold mb-6">Community</h1>
      <p className="text-gray-500 mb-10">
        Connect with other Virevos users, share tips, and get help.
      </p>

      <section className="space-y-8 leading-relaxed">
        <div>
          <h2 className="text-xl font-medium mb-2">Join the Conversation</h2>
          <p>
            Our community is the place to ask questions, share workflows, and connect with
            professionals who use Virevos every day.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Community Channels</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-600">
            <li>Community forum — ask questions and browse answers</li>
            <li>Discord server — real-time chat with other users</li>
            <li>Monthly webinars — learn from product experts</li>
            <li>User stories — see how others use Virevos</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-medium mb-2">Contact Us</h2>
          <p>
            Have a community question? Email{" "}
            <a href="mailto:community@virevos.com" className="text-blue-600 hover:underline">
              community@virevos.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
