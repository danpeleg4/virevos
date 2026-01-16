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
import {useRouter} from "next/navigation";

// Product dropdown templates
const productTemplates = [
  {
    icon: "📋",
    title: "Project Management",
    description: "Manage roadmaps, backlogs, bugs, agile dev, and documentation.",
    color: "bg-blue-100",
  },
  {
    icon: "💼",
    title: "Sales/CRM",
    description: "Manage leads, deals, and contacts.",
    color: "bg-orange-100",
  },
  {
    icon: "📊",
    title: "Marketing",
    description: "Plan campaigns, organize assets, and create wikis.",
    color: "bg-purple-100",
  },
];

const solutionCompanies = [
  { label: "Startup", path: "/solutions/startup" },
  { label: "Non-profit", path: "/solutions/non-profit" },
  { label: "Education", path: "/solutions/education" },
  { label: "Agency", path: "/solutions/agency" },
];

const learnItems = [
  { label: "Documentation", path: "/learn/docs" },
  { label: "Guides & Tutorials", path: "/learn/guides" },
  { label: "Webinars", path: "/learn/webinars" },
  { label: "Blog", path: "/learn/blog" },
  { label: "Community", path: "/learn/community" },
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
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">V</span>
                </div>
                <h1 className="text-xl text-gray-900">Virevos</h1>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="hidden md:flex md:items-center md:space-x-1"
            >
              {/* Product Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                      variant="ghost"
                      className="text-sm text-gray-700 hover:text-gray-900 transition-colors hover:bg-transparent"
                  >
                    Product
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[500px] p-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">TEMPLATES</p>
                      <div className="space-y-2">
                        {productTemplates.map((template, index) => (
                            <div
                                key={index}
                                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => handleNavigation("/features")}
                            >
                              <div className={`${template.color} w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0`}>
                                {template.icon}
                              </div>
                              <div>
                                <p className="text-sm text-gray-900 mb-0.5">{template.title}</p>
                                <p className="text-xs text-gray-600">{template.description}</p>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <button
                          onClick={() => handleNavigation("/features")}
                          className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        Browse all templates →
                      </button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Solutions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                      variant="ghost"
                      className="text-sm text-gray-700 hover:text-gray-900 transition-colors hover:bg-transparent"
                  >
                    Solutions
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-3">COMPANIES</p>
                    <div className="space-y-1">
                      {solutionCompanies.map((item, index) => (
                          <div
                              key={index}
                              onClick={() => handleNavigation(item.path)}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md cursor-pointer transition-colors"
                          >
                            {item.label}
                          </div>
                      ))}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Learn Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                      variant="ghost"
                      className="text-sm text-gray-700 hover:text-gray-900 transition-colors hover:bg-transparent"
                  >
                    Learn
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {learnItems.map((item, index) => (
                      <DropdownMenuItem
                          key={index}
                          onClick={() => handleNavigation(item.path)}
                          className="cursor-pointer"
                      >
                        {item.label}
                      </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Simple Links */}
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
                  onClick={() => handleNavigation("/customers")}
              >
                Customers
              </Button>
            </motion.div>

            {/* Desktop CTA Buttons */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="hidden md:flex md:items-center md:space-x-3"
            >
              <Button
                  variant="ghost"
                  className="text-sm text-gray-700 hover:text-gray-900 hover:bg-transparent"
                  onClick={() => handleNavigation("/contact")}
              >
                Contact Sales
              </Button>
              <Button
                  variant="ghost"
                  onClick={() => router.push("/workspace/dashboard")}
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
                    {/* Product */}
                    <div className="space-y-1">
                      <button
                          onClick={() =>
                              setOpenDropdown(openDropdown === "product" ? null : "product")
                          }
                          className="flex items-center justify-between w-full text-gray-700 hover:text-gray-900 transition-colors py-2 px-2"
                      >
                        <span className="text-sm">Product</span>
                        <motion.div
                            animate={{ rotate: openDropdown === "product" ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {openDropdown === "product" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden pl-4 space-y-2"
                            >
                              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">TEMPLATES</p>
                              {productTemplates.map((template, index) => (
                                  <button
                                      key={index}
                                      onClick={() => handleNavigation("/features")}
                                      className="flex items-start space-x-2 w-full text-left py-2"
                                  >
                                    <div className={`${template.color} w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`}>
                                      {template.icon}
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-900">{template.title}</p>
                                      <p className="text-xs text-gray-600">{template.description}</p>
                                    </div>
                                  </button>
                              ))}
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Solutions */}
                    <div className="space-y-1">
                      <button
                          onClick={() =>
                              setOpenDropdown(openDropdown === "solutions" ? null : "solutions")
                          }
                          className="flex items-center justify-between w-full text-gray-700 hover:text-gray-900 transition-colors py-2 px-2"
                      >
                        <span className="text-sm">Solutions</span>
                        <motion.div
                            animate={{ rotate: openDropdown === "solutions" ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {openDropdown === "solutions" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden pl-4 space-y-1"
                            >
                              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">COMPANIES</p>
                              {solutionCompanies.map((item, index) => (
                                  <button
                                      key={index}
                                      onClick={() => handleNavigation(item.path)}
                                      className="block w-full text-left text-sm text-gray-700 hover:text-gray-900 transition-colors py-2"
                                  >
                                    {item.label}
                                  </button>
                              ))}
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Learn */}
                    <div className="space-y-1">
                      <button
                          onClick={() =>
                              setOpenDropdown(openDropdown === "learn" ? null : "learn")
                          }
                          className="flex items-center justify-between w-full text-gray-700 hover:text-gray-900 transition-colors py-2 px-2"
                      >
                        <span className="text-sm">Learn</span>
                        <motion.div
                            animate={{ rotate: openDropdown === "learn" ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {openDropdown === "learn" && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden pl-4 space-y-1"
                            >
                              {learnItems.map((item, index) => (
                                  <button
                                      key={index}
                                      onClick={() => handleNavigation(item.path)}
                                      className="block w-full text-left text-sm text-gray-700 hover:text-gray-900 transition-colors py-2"
                                  >
                                    {item.label}
                                  </button>
                              ))}
                            </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Simple Links */}
                    <button
                        onClick={() => handleNavigation("/pricing")}
                        className="block w-full text-left text-sm text-gray-700 hover:text-gray-900 transition-colors py-2 px-2"
                    >
                      Pricing
                    </button>
                    <button
                        onClick={() => handleNavigation("/customers")}
                        className="block w-full text-left text-sm text-gray-700 hover:text-gray-900 transition-colors py-2 px-2"
                    >
                      Enterprise
                    </button>

                    <div className="pt-4 space-y-2 border-t border-gray-200">
                      <Button
                          variant="ghost"
                          className="w-full justify-start text-sm"
                          onClick={() => handleNavigation("/contact")}
                      >
                        Contact Sales
                      </Button>
                      <Button
                          variant="outline"
                          className="w-full text-sm"
                          onClick={() => handleNavigation("/app/dashboard")}
                      >
                        Login
                      </Button>
                      <Button
                          className="w-full bg-gray-900 hover:bg-gray-800 text-sm"
                          onClick={() => handleNavigation("/onboarding")}
                      >
                        Sign Up
                      </Button>
                    </div>
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
  );
}
