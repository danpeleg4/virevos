"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  ChevronLeft,
  Eye,
  EyeOff,
  ArrowRight,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Step = "login" | "forgot-sent";

export default function Login() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("login");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push("/workspace/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo }
      );
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setStep("forgot-sent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white font-sans overflow-hidden">
      <div className="fixed top-6 right-6 z-50 pointer-events-none">
        <div
          className={`
                            transition-all duration-300 ease-out
                            ${
                              showNotification
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 -translate-y-2"
                            }
                                  `}
        >
          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-900 shadow-sm">
            <Info className="h-4 w-4 mt-0.5 text-yellow-700" />
            <span className="text-sm">
              Please enter your email before resetting your password.
            </span>
          </div>
        </div>
      </div>
      {/* Left Column: Login Form */}
      <div className="w-full lg:w-1/2 p-6 sm:p-12 lg:p-16 xl:p-24 flex flex-col h-screen overflow-y-auto">
        <div className="flex items-center space-x-3 mb-12 sm:mb-20">
          <button className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Image
                src="/virevos.svg"
                alt="321"
                width="30"
                height="30"
              ></Image>
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">
              Virevos
            </span>
          </button>
        </div>

        <div className="max-w-md mx-auto lg:mx-0 flex-1 flex flex-col justify-center w-full">
          <div className="mb-10">
            <button
              onClick={() => router.push("/")}
              className="cursor-pointer flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Home
            </button>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              {step === "forgot-sent" ? "Check your email" : "Welcome Back"}
            </h1>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
              {step === "forgot-sent"
                ? `We've sent a password reset link to ${email}. Click the link to set a new password.`
                : "Login to access your dashboard and manage your cases."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
              <Info className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {step === "login" && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-5">
                <div>
                  <Label className="text-[13px] font-bold text-gray-700 mb-2 block">
                    Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-gray-50/50 border-gray-200 focus:ring-blue-600 rounded-xl px-4 text-[14px]"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-[13px] font-bold text-gray-700 block">
                      Password
                    </Label>
                    <button
                      onClick={handlePasswordReset}
                      type="button"
                      className="cursor-pointer text-[12px] text-blue-600 font-bold hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 bg-gray-50/50 border-gray-200 focus:ring-blue-600 rounded-xl px-4 text-[14px] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-[14px] font-bold shadow-lg shadow-blue-200"
              >
                {loading ? "Signing In..." : "Sign In"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          )}
          {step === "forgot-sent" && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <p className="text-sm text-green-700 font-medium">
                  Email sent. Follow the link inside to choose a new password.
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setStep("login");
                  setError(null);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-[14px] font-bold"
              >
                Back to Login
              </Button>
            </div>
          )}

          <p className="text-center text-[12px] text-gray-400 mt-8">
            Don&#39;t have an account?{" "}
            <button
              onClick={() => router.push("/onboard")}
              className="cursor-pointer text-blue-600 font-bold hover:underline"
            >
              Create One Now.
            </button>
          </p>
        </div>

        <div className="mt-12 sm:mt-20 flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-[12px] text-gray-400 font-medium">
          <p>Copyright © 2026 Virevos.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <button className="cursor-pointer hover:text-gray-600">
              Privacy Policy
            </button>
            <button className="cursor-pointer hover:text-gray-600">
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Visual Side (Matching Onboarding) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#3D4AE0] relative p-12 lg:p-20 flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10">
          <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] border-[60px] border-white rounded-full"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] border-[40px] border-white rounded-full"></div>
        </div>

        <div className="relative z-10 w-full max-w-2xl text-center lg:text-left">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Secure the future of your practice.
          </h2>
          <p className="text-blue-100 text-lg mb-12 max-w-lg leading-relaxed">
            Virevos is the AI-native hub for modern immigration. Automate your
            audits, track every deadline, and grow your client pipeline from F-1
            to Green Card.
          </p>
        </div>
      </div>
    </div>
  );
}
