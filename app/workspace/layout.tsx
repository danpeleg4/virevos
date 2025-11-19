import {AppLayout} from "@/app/components/AppLayout";

export default function WorkSpaceLayout({children}: { children: React.ReactNode }) {
    return (
        <AppLayout>
                <main>
                    {children}
                </main>
        </AppLayout>
    )
}