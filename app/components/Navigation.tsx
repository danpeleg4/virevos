"use client"

import { Button } from "./ui/button";
import { Menu, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useRouter } from "next/navigation";
import {SignedOut, SignInButton, SignOutButton} from "@clerk/nextjs";

const menuItems = [
  {
    label: "Features",
    items: [
      { label: "All Features", path: "/features" },
      { label: "Integrations", path: "/integrations" },
      { label: "Security", path: "/security" },
    ],
  },
  {
    label: "Pricing",
    items: [
      { label: "Plans & Pricing", path: "/pricing" },
    ],
  },
  {
    label: "Customers",
    items: [
      { label: "Customer Stories", path: "/customers" },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Learning Center", path: "/resources" },
    ],
  },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
    setOpenDropdown(null);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center cursor-pointer"
            onClick={() => handleNavigation("/")}
          >
            <h1 className="text-2xl text-gray-900">FlowTask</h1>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden md:flex md:items-center md:space-x-2"
          >
            {menuItems.map((menu, index) => (
              <DropdownMenu key={index}>
                <DropdownMenuTrigger asChild>
                  <Button
                      style={{ cursor: "pointer" }}
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {menu.label}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <AnimatePresence>
                    {menu.items.map((item, itemIndex) => (
                      <motion.div
                        key={itemIndex}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: itemIndex * 0.05 }}
                      >
                        <DropdownMenuItem
                          onClick={() => handleNavigation(item.path)}
                          className="cursor-pointer"
                        >
                          {item.label}
                        </DropdownMenuItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </motion.div>

          {/* Desktop CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex md:items-center md:space-x-4"
          >
              <SignInButton className="cursor-pointer"></SignInButton>
              <SignOutButton className="cursor-pointer"></SignOutButton>
            <Button style={{ cursor: "pointer" }} onClick={() => router.push("/workspace/dashboard")}>Start Free Trial</Button>
          </motion.div>

          {/* Mobile menu button */}
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

        {/* Mobile Navigation */}
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
                {menuItems.map((menu, index) => (
                  <div key={index} className="space-y-1">
                    <button
                      onClick={() =>
                        setOpenDropdown(openDropdown === menu.label ? null : menu.label)
                      }
                      className="flex items-center justify-between w-full text-gray-600 hover:text-gray-900 transition-colors py-2 px-2"
                    >
                      <span>{menu.label}</span>
                      <motion.div
                        animate={{ rotate: openDropdown === menu.label ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.div>
                    </button>
                    
                    <AnimatePresence>
                      {openDropdown === menu.label && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pl-4 space-y-1"
                        >
                          {menu.items.map((item, itemIndex) => (
                            <motion.button
                              key={itemIndex}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: itemIndex * 0.05 }}
                              onClick={() => handleNavigation(item.path)}
                              className="block w-full text-left text-gray-600 hover:text-gray-900 transition-colors py-2 px-2"
                            >
                              {item.label}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
                
                <div className="pt-4 space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => handleNavigation("/workspace/dashboard")}>
                    Sign In
                  </Button>
                  <Button className="w-full" onClick={() => handleNavigation("/workspace/dashboard")}>Start Free Trial</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
