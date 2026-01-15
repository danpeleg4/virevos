import {Metadata} from "next";

export const metadata: Metadata = {
    title: "Terms of Service | Virevos",
    description: "Terms and conditions for using the Virevos platform.",
};

export default function TermsPage() {
    return (
        <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
            <h1 className="text-3xl font-semibold mb-6">Terms of Service</h1>
            <p className="text-sm text-gray-500 mb-10">
                Last updated: January 15, 2026
            </p>

            <section className="space-y-8 leading-relaxed">
                <div>
                    <h2 className="text-xl font-medium mb-2">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using Virevos, you agree to be bound by these Terms of
                        Service.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">2. Use of Service</h2>
                    <p>
                        Virevos provides productivity tools to help users manage tasks and
                        workflows efficiently.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">3. User Responsibilities</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Maintain account security</li>
                        <li>Provide accurate information</li>
                        <li>Use the platform lawfully</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">4. Prohibited Activities</h2>
                    <p>
                        You may not misuse the service, attempt unauthorized access, or
                        interfere with system integrity.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">5. Intellectual Property</h2>
                    <p>
                        All content and software are owned by Virevos or its licensors and
                        may not be copied or redistributed without permission.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">6. Termination</h2>
                    <p>
                        We may suspend or terminate access to the Services at our discretion
                        for violations of these Terms.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">7. Disclaimer</h2>
                    <p>
                        The Services are provided “as is” without warranties of any kind.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">8. Contact</h2>
                    <p>
                        Questions? Contact{" "}
                        <a
                            href="mailto:support@virevos.com"
                            className="text-blue-600 hover:underline"
                        >
                            support@virevos.com
                        </a>
                    </p>
                </div>
            </section>
        </main>
    );
}
