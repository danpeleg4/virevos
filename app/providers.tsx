"use client"

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
            retry: 1,
        },
    },
});

export function Providers({ children }: { children: React.ReactNode }) {
    return <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
    </ClerkProvider>;
}