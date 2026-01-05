import {AppLayout} from "@/app/components/AppLayout";
import type {Metadata} from "next";

export const metadata: Metadata = {
    title: "Virevos | WorkSpace",
    description: "Virevos Workspace app | Create, manage, and collaborate on projects from anywhere.",
};

export default function WorkSpaceLayout({children}: { children: React.ReactNode }) {
    return (
            <AppLayout>
                {children}
            </AppLayout>
    )
}