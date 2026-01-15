import {Metadata} from "next";

export const metadata: Metadata = {
    title: "Privacy Policy | Virevos",
    description: "Learn how Virevos collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
    return (
        <main className="mx-auto max-w-4xl px-6 py-16 text-gray-800">
            <h1 className="text-3xl font-semibold mb-6">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mb-10">
                Last updated: January 15, 2026
            </p>

            <section className="space-y-8 leading-relaxed">
                <div>
                    <h2 className="text-xl font-medium mb-2">1. Introduction</h2>
                    <p>
                        Virevos (“we”, “our”, or “us”) values your privacy. This Privacy Policy
                        explains how we collect, use, disclose, and protect your information
                        when you use our services.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">2. Information We Collect</h2>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Personal information such as name and email</li>
                        <li>Account and authentication details</li>
                        <li>Usage data including IP address and browser type</li>
                        <li>Cookies and similar tracking technologies</li>
                    </ul>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">3. How We Use Information</h2>
                    <p>
                        We use collected information to operate, maintain, improve, and
                        secure the Virevos platform, communicate with users, and comply with
                        legal obligations.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">4. Data Sharing</h2>
                    <p>
                        We do not sell personal data. Information may be shared with trusted
                        service providers or when required by law.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">5. Data Security</h2>
                    <p>
                        We implement industry-standard security measures, but no system is
                        completely secure.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">6. Your Rights</h2>
                    <p>
                        You may request access, correction, or deletion of your personal
                        data by contacting us.
                    </p>
                </div>

                <div>
                    <h2 className="text-xl font-medium mb-2">7. Contact</h2>
                    <p>
                        Email us at{" "}
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
