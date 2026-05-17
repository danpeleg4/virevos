"use client";

import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthUser } from "@/app/hooks/useAuthUser";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { data: user } = useAuthUser();
  const isSignedIn = !!user;

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center cursor-pointer"
            onClick={() => handleNavigation("/")}
          >
            <div className="flex items-center space-x-2">
              <Image
                src="/virevos.svg"
                alt="123"
                width="50"
                height="50"
              ></Image>
              <h1 className="text-xl text-gray-900 font-medium">Virevos</h1>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden md:flex md:items-center md:space-x-1"
          >
            <Button
              onClick={() => handleNavigation("/features")}
              variant="ghost"
              className="text-sm text-gray-700 hover:text-gray-900 transition-colors hover:bg-transparent"
            >
              Product
            </Button>
            <Button
              variant="ghost"
              className="text-sm text-gray-700 hover:text-gray-900 hover:bg-transparent"
              onClick={() => handleNavigation("/pricing")}
            >
              Pricing
            </Button>
            <Button
              variant="ghost"
              className="text-sm text-gray-700 hover:text-gray-900 hover:bg-transparent"
              onClick={() => handleNavigation("/blog")}
            >
              Blog
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex md:items-center md:space-x-3"
          >
            {isSignedIn ? (
              <>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="text-sm text-gray-700 hover:text-gray-900 hover:bg-transparent"
                >
                  Logout
                </Button>
                <Button
                  onClick={() => router.push("/workspace/dashboard")}
                  className="bg-gray-900 hover:bg-gray-800 text-sm px-4 rounded-lg text-white"
                >
                  Go to Dashboard
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => router.push("/login")}
                  variant="ghost"
                  className="text-sm text-gray-700 hover:text-gray-900 hover:bg-transparent"
                >
                  Login
                </Button>
                <Button
                  onClick={() => router.push("/onboard")}
                  className="bg-gray-900 hover:bg-gray-800 text-sm px-4 rounded-lg text-white"
                >
                  Sign Up
                </Button>
              </>
            )}
          </motion.div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2">
                <button
                  onClick={() => handleNavigation("/features")}
                  className="block w-full text-left text-sm text-gray-700 hover:text-gray-900 transition-colors py-2 px-2"
                >
                  Product
                </button>
                <button
                  onClick={() => handleNavigation("/pricing")}
                  className="block w-full text-left text-sm text-gray-700 hover:text-gray-900 transition-colors py-2 px-2"
                >
                  Pricing
                </button>
                <button
                  onClick={() => handleNavigation("/blog")}
                  className="block w-full text-left text-sm text-gray-700 hover:text-gray-900 transition-colors py-2 px-2"
                >
                  Blog
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
