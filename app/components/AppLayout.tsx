"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

import {
    LayoutDashboard,
    FolderKanban,
    Users,
    CheckSquare,
    Zap,
    ScrollText,
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
import Link from "next/link";
import {UserButton, useUser} from "@clerk/nextjs";
import Image from "next/image";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/workspace/dashboard" },
    { icon: Users, label: "Clients", path: "/workspace/clients" },
    { icon: FolderKanban, label: "Projects", path: "/workspace/projects" },
    { icon: CheckSquare, label: "Tasks", path: "/workspace/tasks" },
    { icon: CalendarDays, label: "Calendar", path: "/workspace/calendar" },
    { icon: Inbox, label: "Communications", path: "/workspace/communications" },
    { icon: Zap, label: "Automations", path: "/workspace/automations" },
    { icon: ScrollText, label: "Activity Logs", path: "/workspace/logs" },
    { icon: CreditCard, label: "Billing", path: "/workspace/billing" },
    { icon: Settings, label: "Settings", path: "/workspace/settings" },
];

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [aiOpen, setAiOpen] = useState(false);

    const { user, isLoaded } = useUser()
    const router = useRouter();
    const currentPath = usePathname();

    if (!isLoaded) return <div>Loading...</div>

    const navigate = (path: string) => router.push(path);

    return (
        <div className="h-screen flex bg-gray-50">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h1
                        className="text-2xl text-gray-900 cursor-pointer flex items-center gap-2"
                        onClick={() => router.push("/")}
                    >
                        <Image src="/sparkles.svg" alt="logo" width={25} height={25}></Image>
                        Virevos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Workspace Pro</p>
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
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                <item.icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200">
                    <Button
                        style={{ cursor: "pointer" }}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setAiOpen(!aiOpen)}
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Assistant
                        <Badge className="ml-auto bg-purple-100 text-purple-700">New</Badge>
                    </Button>
                </div>

                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center space-x-3">
                        <UserButton />
                        <div className="flex-1 min-w-0" >
                            <p className="text-sm text-gray-900 truncate">{`${user?.firstName} ${user?.lastName}`}</p>
                            <p className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
                        </div>
                        <Button style={{ cursor: "pointer" }} variant="ghost" size="icon" onClick={() => navigate("/")}>
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
                            className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 lg:hidden flex flex-col"
                        >
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl text-gray-900">Virevos</h1>
                                    <p className="text-sm text-gray-500 mt-1">Workspace Pro</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
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
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            <span>{item.label}</span>
                                        </button>
                                    );
                                })}
                            </nav>

                            <div className="p-4 border-t border-gray-200">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start"
                                    onClick={() => {
                                        setAiOpen(!aiOpen);
                                        setSidebarOpen(false);
                                    }}
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    AI Assistant
                                    <Badge className="ml-auto bg-purple-100 text-purple-700">New</Badge>
                                </Button>
                            </div>

                            <div className="p-4 border-t border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <UserButton />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{`${user?.firstName} ${user?.lastName}`}</p>
                                        <p className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                    <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>

                        <div className="flex-1" />

                        <Button
                            style={{ cursor: "pointer" }}
                            variant="outline"
                            size="sm"
                            onClick={() => setAiOpen(!aiOpen)}
                            className="hidden sm:flex"
                        >
                            <Sparkles className="h-4 w-4 mr-2" />
                            AI Assistant
                        </Button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto">{children}</main>
            </div>

            <AIAssistant isOpen={aiOpen} onClose={() => setAiOpen(false)} />
        </div>
    );
}
