"use client";

import { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  ChevronLeft,
  Zap,
  Sparkles,
  Users,
  Brain,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AccountStepProps,
  AIPersonalizationStepProps,
  OnboardingFormData,
  PlanStepProps,
  VerificationStepProps,
} from "@/types/onboard";
import PaymentStep from "./PaymentStep";
import axios from "axios";
import { createBrowserSupabase } from "@/lib/supabase/client";
import Image from "next/image";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "month",
    description: "Perfect for individuals getting started",
    features: ["Up to 5 cases", "50 AI credits per month", "1GB storage"],
    highlighted: false,
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [formData, setFormData] = useState<OnboardingFormData>({
    fullName: "",
    email: "",
    password: "",
    companyName: "",

    selectedPlan: "starter",
    billingCycle: "monthly",

    selectedIntegrations: [],
    importMethod: "manual",

    industry: "",
    teamSize: "",
    mainGoals: "",
    workStyle: "",
    aiContext: "",
  });

  const steps = [
    {
      id: 0,
      name: "Welcome",
      title: "Welcome to Virevos",
      subtitle: "Let's get you set up in minutes.",
    },
    {
      id: 1,
      name: "Account",
      title: "Create Your Account",
      subtitle: "Enter your details to access your dashboard.",
    },
    {
      id: 2,
      name: "Plan",
      title: "Choose Your Plan",
      subtitle: "Select the best fit for your workflow.",
    },
    {
      id: 3,
      name: "Personalize",
      title: "Personalize AI",
      subtitle: "Help our AI understand how you work.",
    },
    {
      id: 4,
      name: "Verify",
      title: "Verify Email",
      subtitle: "We've sent a 6-digit code to your email.",
    },
    {
      id: 5,
      name: "Payment",
      title: "Secure Checkout",
      subtitle: "Safe and encrypted payment processing.",
    },
  ];

  const updateFormData = <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const nextStep = () => {
    if (currentStep >= steps.length - 1) return;

    if (
      currentStep === 1 &&
      (!formData.fullName || !formData.email || !formData.password)
    ) {
      return;
    }

    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (currentStep <= 0) return;
    if (currentStep === 5) {
      setCurrentStep(3);
      return;
    }
    setCurrentStep((prev) => prev - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={nextStep} />;
      case 1:
        return (
          <AccountStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        );
      case 2:
        return (
          <PlanStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        );
      case 3:
        return (
          <AIPersonalizationStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        );
      case 4:
        return (
          <VerificationStep
            formData={{
              email: formData.email,
              password: formData.password,
              selectedPlan: formData.selectedPlan,
            }}
            onNext={nextStep}
          />
        );
      case 5:
        return <PaymentStep formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white font-sans overflow-hidden">
      <div className="w-full lg:w-1/2 p-6 sm:p-12 lg:p-16 xl:p-24 flex flex-col h-screen overflow-y-auto">
        <div className="flex items-center space-x-3 mb-12 sm:mb-20">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Image src="/virevos.svg" alt="321" width="30" height="30"></Image>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Virevos
          </span>
        </div>

        <div className="max-w-md mx-auto lg:mx-0 flex-1 flex flex-col justify-center">
          <div className="mb-10">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="cursor-pointer flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </button>
            )}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              {steps[currentStep].title}
            </h1>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
              {steps[currentStep].subtitle}
            </p>
          </div>

          <div key={currentStep}>{renderStep()}</div>
        </div>

        <div className="mt-12 sm:mt-20 flex flex-col sm:flex-row items-center justify-between text-[11px] sm:text-[12px] text-gray-400 font-medium">
          <p>Copyright © 2026 Virevos.</p>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <button
              onClick={() => router.push("/privacy")}
              className="cursor-pointer hover:text-gray-600"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => router.push("/terms")}
              className="cursor-pointer  hover:text-gray-600"
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-[#3D4AE0] relative p-12 lg:p-20 flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10">
          <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] border-[60px] border-white rounded-full"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] border-[40px] border-white rounded-full"></div>
        </div>

        <div className="relative z-10 w-full max-w-2xl text-center lg:text-left">
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Effortlessly manage your pathway to success.
          </h2>
          <p className="text-blue-100 text-lg mb-12 max-w-lg leading-relaxed">
            Get organized with AI-driven consultation transcripts, automated
            filing workflows, and a secure portal designed for students and
            professionals.
          </p>

          <div className="relative group"></div>
        </div>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const router = useRouter();
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4">
        {[
          {
            icon: Zap,
            title: "Automated Visa Pipelines",
            desc: "Streamline the entire journey from F-1 and OPT to H-1B filings.",
          },
          {
            icon: Brain,
            title: "Autonomous AI Audit",
            desc: "Catch manual errors and ensure 100% compliance in every document.",
          },
          {
            icon: Users,
            title: "Practice Management",
            desc: "Track every beneficiary, deadline, and RFE in one central hub.",
          },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <item.icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="text-[14px] font-bold text-gray-900 mb-1">
                {item.title}
              </h4>
              <p className="text-[13px] text-gray-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-[14px] font-bold shadow-lg shadow-blue-200"
      >
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <p className="text-center text-[12px] text-gray-400">
        Already have an account?{" "}
        <button
          onClick={() => router.push("/login")}
          className="cursor-pointer text-blue-600 font-bold hover:underline"
        >
          Log In Now.
        </button>
      </p>
    </div>
  );
}

function AccountStep({
  formData,
  updateFormData,
  onNext,
  showPassword,
  setShowPassword,
}: AccountStepProps) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canContinue =
    formData.fullName.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.password.trim() !== "";

  const completeSignUp = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { name: formData.fullName.trim() },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
          <Info className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}
      <div className="space-y-5">
        <div>
          <Label className="text-[13px] font-bold text-gray-700 mb-2 block">
            Full Name
          </Label>
          <Input
            placeholder="John Doe"
            value={formData.fullName}
            onChange={(e) => updateFormData("fullName", e.target.value)}
            className="h-11 bg-gray-50/50 border-gray-200 focus:ring-blue-600 rounded-xl px-4 text-[14px]"
          />
        </div>
        <div>
          <Label className="text-[13px] font-bold text-gray-700 mb-2 block">
            Email
          </Label>
          <Input
            type="email"
            placeholder="sellostore@company.com"
            value={formData.email}
            onChange={(e) => updateFormData("email", e.target.value)}
            className="h-11 bg-gray-50/50 border-gray-200 focus:ring-blue-600 rounded-xl px-4 text-[14px]"
          />
        </div>
        <div>
          <Label className="text-[13px] font-bold text-gray-700 mb-2 block">
            Password
          </Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => updateFormData("password", e.target.value)}
              className="h-11 bg-gray-50/50 border-gray-200 focus:ring-blue-600 rounded-xl px-4 text-[14px] pr-10"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <Button
        onClick={completeSignUp}
        disabled={!canContinue || loading}
        className={`
                    w-full h-12 rounded-xl text-[14px] font-bold shadow-lg
                    ${
                      canContinue && !loading
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                    }
                          `}
      >
        {loading ? "Creating Account..." : "Continue"}
      </Button>
      <p className="text-center text-[12px] text-gray-400">
        Already have an account?{" "}
        <button
          onClick={() => router.push("/login")}
          className="cursor-pointer text-blue-600 font-bold hover:underline"
        >
          Log In Now.
        </button>
      </p>
    </div>
  );
}

function PlanStep({ formData, updateFormData, onNext }: PlanStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => updateFormData("selectedPlan", plan.id)}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all relative ${
              formData.selectedPlan === plan.id
                ? "border-blue-600 bg-blue-50/30"
                : "border-gray-100 bg-white hover:border-gray-200"
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <h4 className="text-[14px] font-bold text-gray-900">
                {plan.name}
              </h4>
              <div className="text-right">
                <span className="text-[16px] font-bold text-gray-900">
                  ${plan.price}
                </span>
                <span className="text-[10px] text-gray-400 ml-1">/mo</span>
              </div>
            </div>
            <p className="text-[12px] text-gray-500 mb-3 leading-tight">
              {plan.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {plan.features.slice(0, 3).map((f, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium"
                >
                  {f}
                </span>
              ))}
            </div>
            {formData.selectedPlan === plan.id && (
              <div className="absolute top-[-8px] right-3">
                <Badge className="bg-blue-600 text-white text-[9px] px-2 py-0">
                  Selected
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={onNext}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-[14px] font-bold shadow-lg shadow-blue-200 mt-4"
      >
        Continue
      </Button>
    </div>
  );
}

function AIPersonalizationStep({
  formData,
  updateFormData,
  onNext,
}: AIPersonalizationStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <Label className="text-[13px] font-bold text-gray-700 mb-2 block">
          Industry
        </Label>
        <Input
          placeholder="e.g. Agency, SaaS, Law"
          value={formData.industry}
          onChange={(e) => updateFormData("industry", e.target.value)}
          className="h-11 bg-gray-50/50 border-gray-200 rounded-xl px-4 text-[14px]"
        />
      </div>
      <div>
        <Label className="text-[13px] font-bold text-gray-700 mb-2 block">
          Main Goal
        </Label>
        <Textarea
          placeholder="What do you want to achieve?"
          value={formData.mainGoals}
          onChange={(e) => updateFormData("mainGoals", e.target.value)}
          className="bg-gray-50/50 border-gray-200 rounded-xl px-4 text-[14px] min-h-[80px]"
        />
      </div>

      <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-start space-x-3">
        <Sparkles size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-purple-700 leading-tight">
          Your input helps our AI generate smarter task suggestions and
          workflows specifically for your industry.
        </p>
      </div>
      <Button
        onClick={onNext}
        className="w-full bg-gradient-to-r from-blue-600 to-[#3D4AE0] hover:opacity-90 text-white h-12 rounded-xl text-[14px] font-bold shadow-lg mt-2"
      >
        Continue
        <CheckCircle2 className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function VerificationStep({ formData, onNext }: VerificationStepProps) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const verifyEmail = async (overrideCode?: string) => {
    setError(null);
    setLoading(true);

    try {
      const token = overrideCode ?? code.join("");
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token,
        type: "email",
      });

      if (verifyError) {
        setError(verifyError.message);
        console.log(verifyError);
        return;
      }

      const userId = data.user?.id;
      if (!userId) {
        setError("Verification succeeded but no user was returned.");
        return;
      }

      if (formData.selectedPlan && formData.selectedPlan !== "starter") {
        onNext();
      } else {
        try {
          await axios.post("/api/billing", { type: "register-free" });
        } catch (err) {
          console.error("registerFreePlan failed", err);
          setError(
            `Could not register free plan: ${err instanceof Error ? err.message : String(err)}`
          );
          return;
        }
        // Hard navigation so the new Supabase session cookies are picked up by
        // the middleware before /workspace/dashboard renders.
        window.location.href = "/workspace/dashboard";
      }
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: formData.email,
      });
      if (resendError) setError(resendError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!digits) return;

    const newCode = ["", "", "", "", "", ""];
    digits.split("").forEach((char, idx) => {
      newCode[idx] = char;
    });
    setCode(newCode);

    const focusIndex = Math.min(digits.length, 5);
    document.getElementById(`code-${focusIndex}`)?.focus();

    if (digits.length === 6) {
      void verifyEmail(digits);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const isComplete = code.every((digit) => digit !== "");

  return (
    <div className="space-y-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3">
          <Info className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}
      <div className="flex justify-center space-x-4">
        {code.map((digit, i) => (
          <input
            key={i}
            id={`code-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-14 h-16 text-center text-2xl font-bold bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
          />
        ))}
      </div>

      <div className="text-center">
        <p className="text-[13px] text-gray-500 mb-2">
          Code sent to{" "}
          <span className="text-gray-900 font-bold">
            {formData.email || "your email"}
          </span>
        </p>
        <button
          onClick={resendCode}
          className="cursor-pointer text-[13px] text-blue-600 font-bold hover:underline"
        >
          Resend Verification Code
        </button>
      </div>

      <Button
        onClick={() => verifyEmail()}
        disabled={!isComplete || loading}
        className="w-full bg-gradient-to-r from-blue-600 to-[#3D4AE0] hover:opacity-90 text-white h-12 rounded-xl text-[14px] font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Verifying..." : "Verify & Complete"}
        {!loading && <CheckCircle2 className="ml-2 h-4 w-4" />}
      </Button>
    </div>
  );
}
