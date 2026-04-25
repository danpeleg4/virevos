"use client";

import React, { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Sparkles, ChevronLeft, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Callout } from "@radix-ui/themes";
import type { ClerkAPIError } from "@clerk/types";
import Image from "next/image";

type Step = "login" | "forgot" | "reset";

export default function Login() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("login");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoaded || !signIn || !setActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const getClerkErrorMessage = (err: unknown) => {
    const e = err as { errors?: ClerkAPIError[] };
    console.error("Clerk error:", e);
    return e.errors?.[0]?.message ?? "Something went wrong. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (!result) return;

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      }
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
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
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      setStep("reset");
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (result?.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      }
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
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
          <Callout.Root color="yellow">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Please enter your email before resetting your password.
            </Callout.Text>
          </Callout.Root>
        </div>
      </div>
      {/* Left Column: Login Form */}
      <div className="w-full lg:w-1/2 p-6 sm:p-12 lg:p-16 xl:p-24 flex flex-col h-screen overflow-y-auto">
        <div className="flex items-center space-x-3 mb-12 sm:mb-20">
          <button className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Image src="/virevos.svg" alt="321" width="30" height="30"></Image>
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
              Welcome Back
            </h1>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
              Login to access your dashboard and manage your cases.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
              <InfoCircledIcon className="h-5 w-5 text-red-600 mt-0.5" />
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
          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <Label className="text-[13px] font-bold text-gray-700 mb-2 block">
                  Verification Code
                </Label>
                <Input
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-[13px] font-bold text-gray-700 mb-2 block">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl pr-10"
                    required
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white h-12 rounded-xl font-bold"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("login");
                  setError(null);
                }}
                className="text-sm text-gray-500 hover:underline"
              >
                Back to login
              </button>
            </form>
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
