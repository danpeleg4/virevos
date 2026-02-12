import type { LucideIcon } from "lucide-react";
type ImportMethod = "csv" | "manual";

type OnboardingFormData = {
  fullName: string;
  email: string;
  password: string;

  companyName: string;

  selectedPlan: string | null;
  billingCycle: "monthly" | "yearly";

  cardNumber: string;
  cardExpiry: string;
  cardCVC: string;
  billingAddress: string;

  selectedIntegrations: string[];
  importMethod: "csv" | "manual" | null;

  industry: string;
  teamSize: string;
  mainGoals: string;
  workStyle: string;
  aiContext: string;
};

type AccountStepProps = {
  formData: Pick<OnboardingFormData, "fullName" | "email" | "password">;
  updateFormData: UpdateFormData;
  onNext: () => void;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
};

type PlanStepProps = {
  formData: Pick<OnboardingFormData, "selectedPlan">;
  updateFormData: UpdateFormData;
  onNext: () => void;
};

type Integration = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: LucideIcon;
};

type IntegrationsFormData = {
  selectedIntegrations: string[];
};

type IntegrationsStepProps = {
  formData: IntegrationsFormData;
  toggleIntegration: (id: string) => void;
  onNext: () => void;
};

type ImportDataFormData = {
  importMethod: ImportMethod | null;
};

type ImportOption = {
  id: ImportMethod;
  title: string;
  desc: string;
  icon: LucideIcon;
};

type ImportDataStepProps = {
  formData: ImportDataFormData;
  updateFormData: <K extends keyof ImportDataFormData>(
    key: K,
    value: ImportDataFormData[K]
  ) => void;
  onNext: () => void;
};

type AIPersonalizationStepProps = {
  formData: Pick<
    OnboardingFormData,
    "password" | "email" | "industry" | "mainGoals" | "selectedPlan"
  >;
  updateFormData: UpdateFormData;
  onNext: () => void;
};

type VerificationStepProps = {
  formData: Pick<OnboardingFormData, "password" | "email">;
  onNext: () => void;
};

type PaymentStepProps = {
  formData: Pick<
    OnboardingFormData,
    "selectedPlan" | "cardNumber" | "cardExpiry" | "cardCVC"
  >;
  updateFormData: UpdateFormData;
  onNext: () => void;
};
