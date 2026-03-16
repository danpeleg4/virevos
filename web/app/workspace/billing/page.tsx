"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  CreditCard,
  Download,
  CheckCircle,
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { changePlan, cancelSubscription, updatePaymentMethod, createSetupIntent } from "@/lib/billing";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const PLAN_DETAILS: Record<
  string,
  { name: string; price: number; features: string[] }
> = {
  starter: {
    name: "Starter",
    price: 0,
    features: [
      "Up to 5 clients",
      "1 project",
      "10 AI credits/month",
      "Basic automation",
    ],
  },
  professional: {
    name: "Professional",
    price: 29,
    features: [
      "Unlimited clients",
      "Unlimited projects",
      "50 AI credits/month",
      "Advanced automation",
      "AI Assistant",
      "Priority support",
    ],
  },
  business: {
    name: "Business",
    price: 79,
    features: [
      "Unlimited clients",
      "Unlimited projects",
      "Highest AI credits/month",
      "Full app access",
      "AI Assistant",
      "24/7 support",
    ],
  },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-blue-100 text-blue-700" },
  past_due: { label: "Past Due", className: "bg-red-100 text-red-700" },
  canceled: { label: "Canceled", className: "bg-gray-100 text-gray-700" },
  incomplete: { label: "Incomplete", className: "bg-yellow-100 text-yellow-700" },
  trialing: { label: "Trialing", className: "bg-purple-100 text-purple-700" },
};

function UpdatePaymentForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mutation = useMutation({
    mutationFn: (pmId: string) => updatePaymentMethod(pmId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      onSuccess();
    },
  });

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setError(null);
    setLoading(true);
    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        setError(submitResult.error.message ?? "Error");
        return;
      }
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {},
      });
      if (result.error) {
        setError(result.error.message ?? "Error");
        return;
      }
      const pmId =
        typeof result.setupIntent?.payment_method === "string"
          ? result.setupIntent.payment_method
          : result.setupIntent?.payment_method?.id ?? null;

      if (pmId) {
        mutation.mutate(pmId);
      }
    } catch {
      setError("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      {error && (
        <div className="flex items-start space-x-2 text-red-600">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      <PaymentElement options={{ layout: "tabs" }} />
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!stripe || !elements || loading || mutation.isPending}
        >
          {loading || mutation.isPending ? "Saving..." : "Save Card"}
        </Button>
      </div>
    </div>
  );
}

export default function Billing() {
  const queryClient = useQueryClient();
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);

  const { data: billing, isLoading } = useQuery<BillingOverview>({
    queryKey: ["billing"],
    queryFn: () => axios.get("/api/billing").then((r) => r.data),
  });

  const { data: clientList } = useQuery<{ id: number }[]>({
    queryKey: ["clients"],
    queryFn: () => axios.get("/api/clients").then((r) => r.data),
  });

  const { data: setupSecret } = useQuery<string>({
    queryKey: ["setup-intent-billing"],
    queryFn: createSetupIntent,
    enabled: paymentMethodOpen,
    staleTime: Infinity,
  });

  const changePlanMutation = useMutation({
    mutationFn: (planId: PlanId) => changePlan({ planId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      setChangePlanOpen(false);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
  });

  const currentPlan = billing?.subscription?.plan ?? "starter";
  const planInfo = PLAN_DETAILS[currentPlan] ?? PLAN_DETAILS.starter;
  const statusInfo = STATUS_BADGE[billing?.subscription?.status ?? "active"] ?? STATUS_BADGE.active;
  const clientCount = clientList?.length ?? 0;
  const clientLimit = currentPlan === "starter" ? 5 : null;

  const formatDate = (val: Date | string | null | undefined) => {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl text-gray-900">
            Billing & Subscription
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your subscription and billing information
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Plan */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl text-gray-900">Current Plan</h2>
              <p className="text-sm text-gray-600 mt-1">
                You&#39;re on the {planInfo.name} plan
              </p>
            </div>
            <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">Plan</p>
              <p className="text-3xl text-gray-900">
                ${planInfo.price}
                <span className="text-lg text-gray-600">/month</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Next Billing</p>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <p className="text-lg text-gray-900">
                  {billing?.subscription?.cancelAtPeriodEnd
                    ? `Cancels ${formatDate(billing.subscription.currentPeriodEnd)}`
                    : formatDate(billing?.subscription?.currentPeriodEnd)}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-3">Included Features</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {planInfo.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
              <DialogTrigger asChild>
                <Button>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Change Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Choose a Plan</DialogTitle>
                  <DialogDescription>
                    Select the plan that best fits your needs
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 md:grid-cols-3 mt-6">
                  {(["starter", "professional", "business"] as PlanId[]).map(
                    (planId) => {
                      const pd = PLAN_DETAILS[planId];
                      const isCurrent = planId === currentPlan;
                      return (
                        <Card
                          key={planId}
                          className={`p-6 ${isCurrent ? "border-2 border-blue-500" : ""}`}
                        >
                          {isCurrent && (
                            <Badge className="mb-4 bg-blue-100 text-blue-700">
                              Current Plan
                            </Badge>
                          )}
                          <h3 className="text-xl text-gray-900 mb-2">
                            {pd.name}
                          </h3>
                          <p className="text-3xl text-gray-900 mb-6">
                            ${pd.price}
                            <span className="text-lg text-gray-600">/mo</span>
                          </p>
                          <div className="space-y-3 mb-6">
                            {pd.features.map((f, i) => (
                              <div
                                key={i}
                                className="flex items-start space-x-2"
                              >
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">
                                  {f}
                                </span>
                              </div>
                            ))}
                          </div>
                          <Button
                            className="w-full"
                            variant={isCurrent ? "outline" : "default"}
                            disabled={isCurrent || changePlanMutation.isPending}
                            onClick={() =>
                              !isCurrent && changePlanMutation.mutate(planId)
                            }
                          >
                            {isCurrent ? "Current Plan" : "Select Plan"}
                          </Button>
                        </Card>
                      );
                    }
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              disabled={
                cancelMutation.isPending ||
                !billing?.subscription?.stripeSubscriptionId
              }
            >
              {cancelMutation.isPending
                ? "Canceling..."
                : "Cancel Subscription"}
            </Button>
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-gray-900">Payment Method</h2>
          </div>

          {billing?.paymentMethod ? (
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 mb-6 text-white">
              <div className="flex items-center justify-between mb-6">
                <CreditCard className="h-8 w-8" />
                <p className="text-sm uppercase">
                  {billing.paymentMethod.brand}
                </p>
              </div>
              <p className="text-lg mb-1">
                •••• •••• •••• {billing.paymentMethod.last4}
              </p>
              <p className="text-sm opacity-80">
                Expires {billing.paymentMethod.expMonth}/
                {billing.paymentMethod.expYear}
              </p>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-4 mb-6 text-center text-sm text-gray-500">
              No payment method on file
            </div>
          )}

          <Dialog
            open={paymentMethodOpen}
            onOpenChange={setPaymentMethodOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                Update Payment Method
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Payment Method</DialogTitle>
                <DialogDescription>
                  Add or update your payment information
                </DialogDescription>
              </DialogHeader>
              {setupSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret: setupSecret }}
                >
                  <UpdatePaymentForm
                    onSuccess={() => setPaymentMethodOpen(false)}
                  />
                </Elements>
              ) : (
                <div className="py-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </Card>
      </div>

      {/* Usage Stats */}
      <Card className="p-6">
        <h2 className="text-xl text-gray-900 mb-6">Usage Overview</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-600">Clients</p>
              </div>
              <p className="text-sm text-gray-900">
                {clientCount} / {clientLimit ?? "Unlimited"}
              </p>
            </div>
            <Progress
              value={
                clientLimit
                  ? Math.min((clientCount / clientLimit) * 100, 100)
                  : 100
              }
            />
            {currentPlan === "starter" && clientCount >= 5 && (
              <p className="text-[11px] text-red-500 mt-1">
                Limit reached — upgrade to add more
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Invoices */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-gray-900">Billing History</h2>
        </div>

        {billing?.invoices?.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billing.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="text-gray-900">
                      {invoice.number ?? invoice.id.slice(0, 12)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {invoice.date
                        ? formatDate(new Date(invoice.date * 1000))
                        : "—"}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {invoice.description ?? `${planInfo.name} Plan - Monthly`}
                    </TableCell>
                    <TableCell className="text-gray-900">
                      {formatAmount(invoice.amountPaid, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      {invoice.status === "paid" ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-700">
                          {invoice.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.pdfUrl && (
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No invoices yet.</p>
        )}
      </Card>
    </div>
  );
}
