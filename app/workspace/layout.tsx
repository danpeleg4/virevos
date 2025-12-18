import {AppLayout} from "@/app/components/AppLayout";
import type {Metadata} from "next";
import {QueryClient} from "@tanstack/query-core";
import {QueryClientProvider} from "@tanstack/react-query";

export const metadata: Metadata = {
    title: "Virevos | WorkSpace",
    description: "Virevos Workspace app | Create, manage, and collaborate on projects from anywhere.",
};

export default function WorkSpaceLayout({children}: { children: React.ReactNode }) {
    return (
            <AppLayout>
                <main>
                    {children}
                </main>
            </AppLayout>
    )
}