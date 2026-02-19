"use client";

import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Sparkles, ChevronLeft, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Callout } from "@radix-ui/themes";
import type { ClerkAPIError } from "@clerk/types";

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

  if (!isLoaded || !signIn || !setActive) return;

  const getClerkErrorMessage = (err: unknown) => {
    const e = err as { errors?: ClerkAPIError[] };
    return e.errors?.[0]?.message ?? "Something went wrong";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await signIn?.create({
        identifier: email,
        password,
      });

      if (!result) return

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/");
      }
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
      return;
    }

    setError(null);

    try {
      await signIn?.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      setStep("reset");
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password,
      });

      if (result?.status === "complete") {
        router.push("/");
      }
    } catch (err: unknown) {
      setError(getClerkErrorMessage(err));
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
      {/* Left Column: aLogin Form */}
      <div className="w-full lg:w-1/2 p-6 sm:p-12 lg:p-16 xl:p-24 flex flex-col h-screen overflow-y-auto">
        <div className="flex items-center space-x-3 mb-12 sm:mb-20">
          <button className="flex items-center space-x-3 group">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
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
              Login to access your dashboard and manage your tasks.
            </p>
          </div>

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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-[14px] font-bold shadow-lg shadow-blue-200"
              >
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-100"></span>
                </div>
                <div className="relative flex justify-center text-[12px] uppercase">
                  <span className="bg-white px-3 text-gray-400 font-bold tracking-widest">
                    Or Continue With
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-gray-200 text-gray-700 text-[13px] font-bold hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-gray-200 text-gray-700 text-[13px] font-bold hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M17.05 20.28c-.96.95-2.04 1.44-3.23 1.47-1.15.02-2.24-.46-3.27-.46-1.04 0-2.25.48-3.32.44-1.18-.04-2.25-.53-3.22-1.47C2 18.25.96 15.11.96 12.03c0-3.08 1.04-6.22 3.08-8.25 1.03-1.03 2.22-1.57 3.56-1.57 1.25 0 2.44.47 3.2.47.75 0 2.05-.51 3.46-.51 1.34 0 2.45.5 3.3 1.42.45.48.86 1.03 1.15 1.63-2.6 1.07-4.24 3.42-4.24 6.22 0 2.92 1.83 5.43 4.58 6.57-.28.8-.7 1.5-1.25 2.05h-.04zM12.03 4.3c-.02-2.2 1.81-4.05 4.02-4.07.03 2.22-1.83 4.08-4.02 4.07z"
                    />
                  </svg>
                  Apple
                </Button>
              </div>
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
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 text-white h-12 rounded-xl font-bold"
              >
                Reset Password
              </Button>

              <button
                type="button"
                onClick={() => setStep("login")}
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
            Ready to streamline your workflow?
          </h2>
          <p className="text-blue-100 text-lg mb-12 max-w-lg leading-relaxed">
            Virevos provides everything you need to manage your business
            operations in one unified dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
