"use client"

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Checkbox } from "../components/ui/checkbox";
import {
    Check,
    ChevronRight,
    ChevronLeft,
    Zap,
    Calendar,
    Upload,
    Sparkles,
    CreditCard,
    Users,
    Brain,
    FileSpreadsheet,
} from "lucide-react";
import {integrations, plans} from "@/app/lib/mockData";

interface OnboardingProps {
    onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        // Step 1: Account
        fullName: "",
        email: "",
        password: "",
        companyName: "",

        // Step 2: Subscription
        selectedPlan: "professional",
        billingCycle: "monthly",

        // Step 3: Payment
        cardNumber: "",
        cardExpiry: "",
        cardCVC: "",
        billingAddress: "",

        // Step 4: Integrations
        selectedIntegrations: [] as string[],

        // Step 5: Import Data
        importMethod: "",

        // Step 6: AI Personalization
        industry: "",
        teamSize: "",
        mainGoals: "",
        workStyle: "",
        aiContext: "",
    });

    const steps = [
        { id: 0, name: "Welcome", icon: Sparkles },
        { id: 1, name: "Account", icon: Users },
        { id: 2, name: "Plan", icon: Zap },
        { id: 3, name: "Payment", icon: CreditCard },
        { id: 4, name: "Integrations", icon: Calendar },
        { id: 5, name: "Import Data", icon: Upload },
        { id: 6, name: "AI Setup", icon: Brain },
    ];

    const progress = ((currentStep + 1) / steps.length) * 100;

    const updateFormData = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const toggleIntegration = (integrationId: string) => {
        setFormData((prev) => ({
            ...prev,
            selectedIntegrations: prev.selectedIntegrations.includes(integrationId)
                ? prev.selectedIntegrations.filter((id) => id !== integrationId)
                : [...prev.selectedIntegrations, integrationId],
        }));
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return <WelcomeStep onNext={nextStep} />;
            case 1:
                return <AccountStep formData={formData} updateFormData={updateFormData} onNext={nextStep} />;
            case 2:
                return <PlanStep formData={formData} updateFormData={updateFormData} onNext={nextStep} />;
            case 3:
                return <PaymentStep formData={formData} updateFormData={updateFormData} onNext={nextStep} />;
            case 4:
                return <IntegrationsStep formData={formData} toggleIntegration={toggleIntegration} onNext={nextStep} />;
            case 5:
                return <ImportDataStep formData={formData} updateFormData={updateFormData} onNext={nextStep} />;
            case 6:
                return <AIPersonalizationStep formData={formData} updateFormData={updateFormData} onNext={nextStep} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            {/* Progress Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white">F</span>
                            </div>
                            <span className="text-xl text-gray-900">FlowTask</span>
                        </div>
                        <span className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            </div>

            {/* Step Indicators */}
            <div className="pt-24 pb-8">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                            index <= currentStep
                                                ? "bg-blue-600 border-blue-600 text-white"
                                                : "bg-white border-gray-300 text-gray-400"
                                        }`}
                                    >
                                        {index < currentStep ? (
                                            <Check className="h-5 w-5" />
                                        ) : (
                                            <step.icon className="h-5 w-5" />
                                        )}
                                    </div>
                                    <span
                                        className={`text-xs mt-2 hidden md:block ${
                                            index <= currentStep ? "text-gray-900" : "text-gray-400"
                                        }`}
                                    >
                    {step.name}
                  </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div
                                        className={`w-12 h-0.5 mx-2 ${
                                            index < currentStep ? "bg-blue-600" : "bg-gray-300"
                                        }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-6 pb-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {renderStep()}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                {currentStep > 0 && (
                    <div className="flex justify-between mt-8">
                        <Button variant="outline" onClick={prevStep}>
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Back
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Welcome Step
function WelcomeStep({ onNext }: { onNext: () => void }) {
    return (
        <Card className="border-0 shadow-xl">
            <CardContent className="p-12 text-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6"
                >
                    <Sparkles className="h-10 w-10 text-white" />
                </motion.div>
                <h1 className="text-3xl text-gray-900 mb-4">
                    Welcome to FlowTask!
                </h1>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                    Let&#39;s get you set up in just a few minutes. We&#39;ll help you create your
                    account, choose the perfect plan, and personalize FlowTask to match your
                    workflow.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Zap className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-sm text-gray-900 mb-1">Quick Setup</h3>
                        <p className="text-sm text-gray-600">5 minutes to get started</p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Brain className="h-6 w-6 text-purple-600" />
                        </div>
                        <h3 className="text-sm text-gray-900 mb-1">AI Powered</h3>
                        <p className="text-sm text-gray-600">Personalized to your needs</p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-sm text-gray-900 mb-1">Easy Import</h3>
                        <p className="text-sm text-gray-600">Bring your existing data</p>
                    </div>
                </div>
                <Button size="lg" onClick={onNext} className="px-8">
                    Get Started
                    <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
}

// Account Step
function AccountStep({ formData, updateFormData, onNext }: any) {
    return (
        <Card className="border-0 shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl">Create Your Account</CardTitle>
                <p className="text-gray-600">Let&#39;s start with your basic information</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label>Full Name *</Label>
                        <Input
                            placeholder="John Doe"
                            value={formData.fullName}
                            onChange={(e) => updateFormData("fullName", e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <Label>Email Address *</Label>
                        <Input
                            type="email"
                            placeholder="john@company.com"
                            value={formData.email}
                            onChange={(e) => updateFormData("email", e.target.value)}
                            className="mt-2"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label>Password *</Label>
                        <Input
                            type="password"
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={(e) => updateFormData("password", e.target.value)}
                            className="mt-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            At least 8 characters with numbers and symbols
                        </p>
                    </div>
                    <div>
                        <Label>Company Name</Label>
                        <Input
                            placeholder="Your Company Inc."
                            value={formData.companyName}
                            onChange={(e) => updateFormData("companyName", e.target.value)}
                            className="mt-2"
                        />
                    </div>
                </div>

                <div className="flex items-start space-x-2 pt-4">
                    <Checkbox id="terms" />
                    <label htmlFor="terms" className="text-sm text-gray-600">
                        I agree to the{" "}
                        <a href="#" className="text-blue-600 hover:underline">
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-blue-600 hover:underline">
                            Privacy Policy
                        </a>
                    </label>
                </div>

                <Button onClick={onNext} className="w-full" size="lg">
                    Continue
                    <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
}

// Plan Step
function PlanStep({ formData, updateFormData, onNext }: any) {
    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl text-gray-900 mb-2">Choose Your Plan</h2>
                <p className="text-gray-600">
                    Select the plan that best fits your needs. You can change anytime.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <motion.div
                        key={plan.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Card
                            className={`cursor-pointer transition-all ${
                                formData.selectedPlan === plan.id
                                    ? "border-2 border-blue-600 shadow-lg"
                                    : "border-2 border-transparent hover:border-gray-300"
                            } ${plan.highlighted ? "ring-2 ring-blue-200" : ""}`}
                            onClick={() => updateFormData("selectedPlan", plan.id)}
                        >
                            <CardContent className="p-6">
                                {plan.highlighted && (
                                    <Badge className="mb-4 bg-blue-600">Most Popular</Badge>
                                )}
                                <h3 className="text-xl text-gray-900 mb-2">{plan.name}</h3>
                                <div className="mb-4">
                                    <span className="text-4xl text-gray-900">${plan.price}</span>
                                    <span className="text-gray-600">/{plan.period}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-6">{plan.description}</p>
                                <ul className="space-y-3 mb-6">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start text-sm">
                                            <Check className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                            <span className="text-gray-700">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                {formData.selectedPlan === plan.id && (
                                    <div className="flex items-center justify-center p-2 bg-blue-50 rounded-lg">
                                        <Check className="h-4 w-4 text-blue-600 mr-2" />
                                        <span className="text-sm text-blue-600">Selected</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <Button onClick={onNext} className="w-full" size="lg">
                Continue to Payment
                <ChevronRight className="h-5 w-5 ml-2" />
            </Button>
        </div>
    );
}

// Payment Step
function PaymentStep({ formData, updateFormData, onNext }: any) {
    const selectedPlan = plans.find((p) => p.id === formData.selectedPlan);

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl">Payment Information</CardTitle>
                <p className="text-gray-600">
                    Your subscription will start immediately after payment
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-sm text-gray-900 mb-4">Order Summary</h3>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-700">{selectedPlan?.name} Plan</span>
                        <span className="text-gray-900">${selectedPlan?.price}/month</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="text-gray-900">Total</span>
                        <span className="text-xl text-gray-900">
              ${selectedPlan?.price}/month
            </span>
                    </div>
                </div>

                {/* Payment Form */}
                <div>
                    <Label>Card Number *</Label>
                    <Input
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={(e) => updateFormData("cardNumber", e.target.value)}
                        className="mt-2"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Label>Expiry Date *</Label>
                        <Input
                            placeholder="MM/YY"
                            value={formData.cardExpiry}
                            onChange={(e) => updateFormData("cardExpiry", e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <Label>CVC *</Label>
                        <Input
                            placeholder="123"
                            value={formData.cardCVC}
                            onChange={(e) => updateFormData("cardCVC", e.target.value)}
                            className="mt-2"
                        />
                    </div>
                </div>

                <div>
                    <Label>Billing Address *</Label>
                    <Input
                        placeholder="123 Main St, City, Country"
                        value={formData.billingAddress}
                        onChange={(e) => updateFormData("billingAddress", e.target.value)}
                        className="mt-2"
                    />
                </div>

                <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
                    <Check className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-gray-700">
            Your payment is secure and encrypted
          </span>
                </div>

                <Button onClick={onNext} className="w-full" size="lg">
                    Complete Payment
                    <ChevronRight className="h-5 w-5 ml-2" />
                </Button>

                <p className="text-xs text-center text-gray-500">
                    By completing payment, you agree to our subscription terms
                </p>
            </CardContent>
        </Card>
    );
}

// Integrations Step
function IntegrationsStep({ formData, toggleIntegration, onNext }: any) {
    const calendarIntegrations = integrations.filter((i) => i.category === "calendar");
    const videoIntegrations = integrations.filter((i) => i.category === "video");

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl">Connect Your Tools</CardTitle>
                <p className="text-gray-600">
                    Connect your calendar and video conferencing tools (optional)
                </p>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Calendar Integrations */}
                <div>
                    <h3 className="text-sm text-gray-900 mb-4">Calendar Integration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {calendarIntegrations.map((integration) => (
                            <motion.div
                                key={integration.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Card
                                    className={`cursor-pointer transition-all ${
                                        formData.selectedIntegrations.includes(integration.id)
                                            ? "border-2 border-blue-600"
                                            : "border-2 border-transparent hover:border-gray-300"
                                    }`}
                                    onClick={() => toggleIntegration(integration.id)}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div
                                                className={`p-3 rounded-lg ${integration.color}`}
                                            >
                                                <integration.icon className="h-6 w-6" />
                                            </div>
                                            {formData.selectedIntegrations.includes(integration.id) && (
                                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <Check className="h-4 w-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="text-sm text-gray-900 mb-1">
                                            {integration.name}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {integration.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Video Integrations */}
                <div>
                    <h3 className="text-sm text-gray-900 mb-4">
                        Video Conferencing
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {videoIntegrations.map((integration) => (
                            <motion.div
                                key={integration.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Card
                                    className={`cursor-pointer transition-all ${
                                        formData.selectedIntegrations.includes(integration.id)
                                            ? "border-2 border-blue-600"
                                            : "border-2 border-transparent hover:border-gray-300"
                                    }`}
                                    onClick={() => toggleIntegration(integration.id)}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div
                                                className={`p-3 rounded-lg ${integration.color}`}
                                            >
                                                <integration.icon className="h-6 w-6" />
                                            </div>
                                            {formData.selectedIntegrations.includes(integration.id) && (
                                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                    <Check className="h-4 w-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="text-sm text-gray-900 mb-1">
                                            {integration.name}
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                            {integration.description}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                    <Sparkles className="h-5 w-5 text-gray-600" />
                    <span className="text-sm text-gray-700">
            You can add more integrations later from settings
          </span>
                </div>

                <Button onClick={onNext} className="w-full" size="lg">
                    {formData.selectedIntegrations.length > 0 ? "Connect Selected" : "Skip for Now"}
                    <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
}

// Import Data Step
function ImportDataStep({ formData, updateFormData, onNext }: any) {
    const importOptions = [
        {
            id: "csv",
            name: "CSV Import",
            icon: FileSpreadsheet,
            description: "Upload a CSV file with your client and project data",
            color: "bg-green-100 text-green-600",
        },
        {
            id: "manual",
            name: "Manual Entry",
            icon: Users,
            description: "I'll add my clients and projects manually later",
            color: "bg-blue-100 text-blue-600",
        },
        {
            id: "skip",
            name: "Skip for Now",
            icon: ChevronRight,
            description: "Start with a clean slate",
            color: "bg-gray-100 text-gray-600",
        },
    ];

    return (
        <Card className="border-0 shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl">Import Your Data</CardTitle>
                <p className="text-gray-600">
                    Bring your existing clients and projects into FlowTask
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                    {importOptions.map((option) => (
                        <motion.div
                            key={option.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            <Card
                                className={`cursor-pointer transition-all ${
                                    formData.importMethod === option.id
                                        ? "border-2 border-blue-600"
                                        : "border-2 border-transparent hover:border-gray-300"
                                }`}
                                onClick={() => updateFormData("importMethod", option.id)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start space-x-4">
                                        <div className={`p-3 rounded-lg ${option.color}`}>
                                            <option.icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm text-gray-900">{option.name}</h4>
                                                {formData.importMethod === option.id && (
                                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                                        <Check className="h-4 w-4 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">{option.description}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {formData.importMethod === "csv" && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
                    >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-sm text-gray-900 mb-2">Upload CSV File</h4>
                        <p className="text-sm text-gray-600 mb-4">
                            Drag and drop your file here, or click to browse
                        </p>
                        <Button variant="outline">Choose File</Button>
                        <p className="text-xs text-gray-500 mt-4">
                            <a href="#" className="text-blue-600 hover:underline">
                                Download sample CSV template
                            </a>
                        </p>
                    </motion.div>
                )}

                <Button onClick={onNext} className="w-full" size="lg">
                    Continue
                    <ChevronRight className="h-5 w-5 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
}

// AI Personalization Step
function AIPersonalizationStep({ formData, updateFormData, onNext }: any) {
    return (
        <Card className="border-0 shadow-xl">
            <CardHeader>
                <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                        <Brain className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Teach FlowTask About You</CardTitle>
                </div>
                <p className="text-gray-600">
                    Help our AI assistant understand your work style and provide better
                    suggestions
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label>Industry / Field *</Label>
                        <Input
                            placeholder="e.g., Web Design, Consulting, Marketing"
                            value={formData.industry}
                            onChange={(e) => updateFormData("industry", e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <Label>Team Size</Label>
                        <Input
                            placeholder="e.g., Solo, 2-5, 6-10"
                            value={formData.teamSize}
                            onChange={(e) => updateFormData("teamSize", e.target.value)}
                            className="mt-2"
                        />
                    </div>
                </div>

                <div>
                    <Label>What are your main goals with FlowTask?</Label>
                    <Textarea
                        placeholder="e.g., Better client communication, automate invoicing, track project progress..."
                        value={formData.mainGoals}
                        onChange={(e) => updateFormData("mainGoals", e.target.value)}
                        className="mt-2"
                        rows={3}
                    />
                </div>

                <div>
                    <Label>Describe your typical work style</Label>
                    <Textarea
                        placeholder="e.g., I work with 3-5 clients at a time, usually on month-long projects. I prefer async communication and detailed project plans..."
                        value={formData.workStyle}
                        onChange={(e) => updateFormData("workStyle", e.target.value)}
                        className="mt-2"
                        rows={3}
                    />
                </div>

                <div>
                    <Label>Tell the AI anything else about you and your work</Label>
                    <Textarea
                        placeholder="Share anything that would help FlowTask serve you better - your preferences, challenges, typical workflows, client types, etc."
                        value={formData.aiContext}
                        onChange={(e) => updateFormData("aiContext", e.target.value)}
                        className="mt-2"
                        rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        This information helps our AI provide personalized automation suggestions,
                        better task prioritization, and smarter scheduling
                    </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6">
                    <div className="flex items-start space-x-3">
                        <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm text-gray-900 mb-2">
                                AI Personalization Benefits
                            </h4>
                            <ul className="space-y-1 text-sm text-gray-700">
                                <li>• Smart automation suggestions based on your workflow</li>
                                <li>• Intelligent task prioritization</li>
                                <li>• Personalized productivity insights</li>
                                <li>• Context-aware communication drafts</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <Button onClick={onNext} className="w-full" size="lg">
                    Complete Setup
                    <Check className="h-5 w-5 ml-2" />
                </Button>
            </CardContent>
        </Card>
    );
}
