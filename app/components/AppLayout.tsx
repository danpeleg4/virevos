"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
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
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import Image from "next/image";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/workspace/dashboard" },
  { icon: Users, label: "Clients", path: "/workspace/clients" },
  { icon: FolderKanban, label: "Projects", path: "/workspace/projects" },
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

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const { user, isLoaded } = useUser();

  const { data: allBookings } = useQuery({
    queryKey: ["portalBookings"],
    queryFn: async () => {
      const { data } = await axios.get<{ bookings: BookingWithClient[] }>(
        "/api/portal/bookings"
      );
      return data.bookings;
    },
    refetchInterval: 60000,
    enabled: isLoaded && !!user,
  });

  const pendingBookings = allBookings?.filter((b) => b.status === "pending") ?? [];
  const pendingCount = pendingBookings.length;
  const router = useRouter();
  const currentPath = usePathname();

  if (!isLoaded)
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );

  const navigate = (path: string) => router.push(path);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-card border-r border-border">
        <div className="p-6 border-b border-border">
          <h1
            className="text-2xl text-foreground cursor-pointer flex items-center gap-2"
            onClick={() => router.push("/")}
          >
            Virevos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Workspace Starter
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-foreground/10 text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            style={{ cursor: "pointer" }}
            variant="outline"
            className="w-full justify-start"
            onClick={() => setAiOpen(!aiOpen)}
          >
            <span className="relative mr-2">
              <Sparkles className="h-4 w-4" />
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </span>
            AI Assistant
            {pendingCount > 0 ? (
              <Badge className="ml-auto bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                {pendingCount}
              </Badge>
            ) : (
              <Badge className="ml-auto bg-purple-100 text-purple-700">New</Badge>
            )}
          </Button>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <UserButton />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{`${user?.firstName} ${user?.lastName}`}</p>
              <p className="text-xs text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <Button
              style={{ cursor: "pointer" }}
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
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
              className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 lg:hidden flex flex-col"
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h1 className="text-2xl text-foreground">Virevos</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Workspace Starter
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = currentPath === item.path;

                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? "bg-foreground/10 text-foreground font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setAiOpen(!aiOpen);
                    setSidebarOpen(false);
                  }}
                >
                  <span className="relative mr-2">
                    <Sparkles className="h-4 w-4" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    )}
                  </span>
                  AI Assistant
                  {pendingCount > 0 ? (
                    <Badge className="ml-auto bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                      {pendingCount}
                    </Badge>
                  ) : (
                    <Badge className="ml-auto bg-purple-100 text-purple-700">New</Badge>
                  )}
                </Button>
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex items-center space-x-3">
                  <UserButton />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{`${user?.firstName} ${user?.lastName}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
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
                <span className="relative sm:mr-2">
                  <Sparkles className="h-4 w-4" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline">AI Assistant</span>
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
