"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "./ui/utils";
import type { PortalMeetingBooking } from "@/types/portal";

import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  CreditCard,
  Settings,
  Menu,
  X,
  LogOut,
  Sparkles,
  CalendarDays,
  Inbox,
} from "lucide-react";

import { AIAssistant } from "./AIAssistant";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthUser } from "@/app/hooks/useAuthUser";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/workspace/dashboard" },
  { icon: Users, label: "Clients", path: "/workspace/clients" },
  { icon: FolderKanban, label: "Cases", path: "/workspace/cases" },
  { icon: CheckSquare, label: "Tasks", path: "/workspace/tasks" },
  { icon: CalendarDays, label: "Calendar", path: "/workspace/calendar" },
  { icon: Inbox, label: "Communications", path: "/workspace/communications" },
  { icon: CreditCard, label: "Billing", path: "/workspace/billing" },
  { icon: Settings, label: "Settings", path: "/workspace/settings" },
];

interface AppLayoutProps {
  children: ReactNode;
}

type BookingWithClient = PortalMeetingBooking & {
  clientDisplayName: string | null;
};

interface SidebarContentProps {
  currentPath: string;
  pendingCount: number;
  fullName: string;
  initials: string;
  email?: string;
  onNavigateHome: () => void;
  onToggleAi: () => void;
  onSignOut: () => void;
  /** Provided only on the mobile drawer — renders the close button and closes on navigation. */
  onClose?: () => void;
}

function SidebarContent({
  currentPath,
  pendingCount,
  fullName,
  initials,
  email,
  onNavigateHome,
  onToggleAi,
  onSignOut,
  onClose,
}: SidebarContentProps) {
  const { data: avatarData } = useQuery<{ url: string | null }>({
    queryKey: ["avatarUrl"],
    queryFn: async () => {
      const res = await axios.get("/api/user", {
        params: { type: "avatar" },
      });
      return res.data;
    },
  });
  const avatarUrl = avatarData?.url ?? undefined;
  return (
    <>
      {/* Brand */}
      <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-5 shrink-0">
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <Image
            src="/virevos.svg"
            alt="Virevos"
            width={26}
            height={26}
            className="dark:invert"
            priority
          />
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            Virevos
          </span>
        </button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
          Menu
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  onClick={onClose}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-sidebar-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="mt-auto space-y-3 border-t border-sidebar-border p-3 shrink-0">
        <Button
          variant="outline"
          className="w-full justify-start cursor-pointer"
          onClick={onToggleAi}
        >
          <Sparkles className="h-4 w-4 text-purple-500" />
          AI Assistant
          {pendingCount > 0 ? (
            <Badge className="ml-auto border-red-200 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
              {pendingCount}
            </Badge>
          ) : (
            <Badge className="ml-auto border-purple-200 bg-purple-100 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300">
              New
            </Badge>
          )}
        </Button>

        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold text-foreground">
            <Avatar className="size-8 text-lg">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Your avatar" />}
              <AvatarFallback>{initials || "U"}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {fullName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            aria-label="Sign out"
            className="shrink-0 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const { data: user, isPending } = useAuthUser();
  const router = useRouter();
  const currentPath = usePathname();

  const { data: allBookings } = useQuery({
    queryKey: ["portalBookings"],
    queryFn: async () => {
      const { data } = await axios.get<{ bookings: BookingWithClient[] }>(
        "/api/portal",
        {
          params: { type: "bookings" },
        }
      );
      return data.bookings;
    },
    refetchInterval: 60000,
    enabled: !isPending && !!user,
  });

  const pendingBookings =
    allBookings?.filter((b) => b.status === "pending") ?? [];
  const pendingCount = pendingBookings.length;

  const handleSignOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (isPending)
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );

  const fullName = (user?.user_metadata?.name as string | undefined) ?? "";
  const initials =
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
        <SidebarContent
          currentPath={currentPath}
          pendingCount={pendingCount}
          fullName={fullName}
          initials={initials}
          email={user?.email}
          onNavigateHome={() => router.push("/")}
          onToggleAi={() => setAiOpen(!aiOpen)}
          onSignOut={handleSignOut}
        />
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-sidebar-border lg:hidden"
            >
              <SidebarContent
                currentPath={currentPath}
                pendingCount={pendingCount}
                fullName={fullName}
                initials={initials}
                email={user?.email}
                onNavigateHome={() => {
                  router.push("/");
                  setSidebarOpen(false);
                }}
                onToggleAi={() => {
                  setAiOpen(!aiOpen);
                  setSidebarOpen(false);
                }}
                onSignOut={handleSignOut}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-card border-b border-border sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate lg:hidden">
                Virevos
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggle />
              <Button
                style={{ cursor: "pointer" }}
                variant="outline"
                size="sm"
                onClick={() => setAiOpen(!aiOpen)}
                className="relative"
              >
                <span className="relative">
                  <Sparkles className="h-4 w-4" />
                  {pendingCount > 0 && (
                    <span className="absolute h-4 w-4 right-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      <Badge className="bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                        {pendingCount}
                      </Badge>
                    </span>
                  )}
                </span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>

      <AIAssistant
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        pendingBookings={pendingBookings}
      />
    </div>
  );
}
