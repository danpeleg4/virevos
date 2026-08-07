"use client";

import { useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
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
  Star,
  FolderOpen,
  Sparkles,
  Server,
} from "lucide-react";
import {
  useBilling,
  useBillingOverview,
  useBillingSetupIntent,
  useCancelSubscription,
  useChangePlan,
  useResubscribe,
} from "@/app/workspace/billing/_lib/hooks";
import { useClients } from "@/app/workspace/clients/_lib/hooks";
import { useCases } from "@/app/workspace/cases/_lib/hooks";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const AI_CREDIT_LIMITS: Record<string, number> = {
  starter: 50,
  professional: 250,
  business: 500,
};

const STORAGE_LIMITS: Record<string, number> = {
  starter: 1,
  professional: 50,
  business: 250,
};

const PLAN_DETAILS: Record<
  string,
  { name: string; price: number; features: string[] }
> = {
  starter: {
    name: "Starter",
    price: 0,
    features: [
      "Up to 5 clients",
      "Up to 5 cases",
      "50 AI credits/month",
      "Basic automation",
    ],
  },
  professional: {
    name: "Professional",
    price: 79,
    features: [
      "Unlimited clients",
      "Unlimited cases",
      "250 AI credits/month",
      "Advanced automation",
      "AI Assistant",
      "Priority support",
    ],
  },
  business: {
    name: "Business",
    price: 129,
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
  active: {
    label: "Active",
    className:
      "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
  },
  past_due: {
    label: "Past Due",
    className: "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300",
  },
  canceled: { label: "Canceled", className: "bg-muted text-muted-foreground" },
  incomplete: {
    label: "Incomplete",
    className:
      "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300",
  },
  trialing: {
    label: "Trialing",
    className:
      "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300",
  },
};

function UpdatePaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mutation = useBilling({ onSuccess });

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
          : (result.setupIntent?.payment_method?.id ?? null);

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
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState<PlanId | null>(null);

  const { data: billing, isLoading } = useBillingOverview();
  const { data: clientList } = useClients();
  const { data: casesData } = useCases();
  const projectList = casesData?.cases;
  const { data: setupSecret } = useBillingSetupIntent(paymentMethodOpen);

  const changePlanMutation = useChangePlan();
  const cancelMutation = useCancelSubscription();
  const resubscribeMutation = useResubscribe();

  const currentPlan = billing?.subscription?.plan ?? "starter";
  const planInfo = PLAN_DETAILS[currentPlan] ?? PLAN_DETAILS.starter;
  const statusInfo =
    STATUS_BADGE[billing?.subscription?.status ?? "active"] ??
    STATUS_BADGE.active;

  const clientCount = clientList?.length ?? 0;
  const clientLimit = currentPlan === "starter" ? 5 : null;
  const projectCount = projectList?.length ?? 0;
  const projectLimit = currentPlan === "starter" ? 5 : null;
  const aiCredits = billing?.aiCredits ?? 0;
  const aiCreditLimit = AI_CREDIT_LIMITS[currentPlan] ?? 50;
  const storageBytes = billing?.storage ?? 0;
  const storageGb = storageBytes / (1024 * 1024 * 1024);
  const storageLimit = STORAGE_LIMITS[currentPlan] ?? 1;
  const storageUsedDisplay =
    storageGb < 0.01
      ? (storageBytes / (1024 * 1024)).toFixed(1) + "MB"
      : storageGb.toFixed(2) + "GB";

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

  if (isLoading) return;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Plan */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl text-foreground">Current Plan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You&#39;re on the {planInfo.name} plan
              </p>
            </div>
            <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Plan</p>
              <p className="text-3xl text-foreground">
                ${planInfo.price}
                <span className="text-lg text-muted-foreground">/month</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Next Billing</p>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <p className="text-lg text-foreground">
                  {billing?.subscription.plan === "starter"
                    ? `Free Forever`
                    : billing?.subscription?.cancelAtPeriodEnd
                      ? `Cancels ${formatDate(billing.subscription.currentPeriodEnd)}`
                      : formatDate(billing?.subscription?.currentPeriodEnd)}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-foreground mb-3">Included Features</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {planInfo.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {feature}
                  </span>
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
              <DialogContent className="max-w-3xl w-full">
                <DialogHeader className="text-center pb-2">
                  <DialogTitle className="text-2xl">Choose a Plan</DialogTitle>
                  <DialogDescription>
                    Select the plan that best fits your needs
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 sm:grid-cols-3 mt-2">
                  {(["starter", "professional", "business"] as PlanId[]).map(
                    (planId) => {
                      const pd = PLAN_DETAILS[planId];
                      const isCurrent = planId === currentPlan;
                      const isPopular = planId === "professional";
                      return (
                        <div key={planId} className="relative flex flex-col">
                          {isPopular && (
                            <div className="absolute -top-3 left-0 right-0 flex justify-center">
                              <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                                <Star className="h-3 w-3 fill-white" />
                                Most Popular
                              </span>
                            </div>
                          )}
                          <Card
                            className={`flex flex-col h-full p-5 transition-all ${
                              isCurrent
                                ? "border-2 border-blue-500 bg-blue-50/40 dark:bg-blue-950/20"
                                : isPopular
                                  ? "border-2 border-blue-300"
                                  : "border border-border"
                            }`}
                          >
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-lg font-semibold text-foreground">
                                  {pd.name}
                                </h3>
                                {isCurrent && (
                                  <Badge className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-foreground">
                                  ${pd.price}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  /mo
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 mb-6 flex-1">
                              {pd.features.map((f, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-muted-foreground">
                                    {f}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <Button
                              className="w-full"
                              variant={
                                isCurrent
                                  ? "outline"
                                  : isPopular
                                    ? "default"
                                    : "outline"
                              }
                              disabled
                              onClick={() =>
                                !isCurrent && setConfirmPlan(planId)
                              }
                            >
                              {isCurrent
                                ? "Current Plan"
                                : changePlanMutation.isPending &&
                                    confirmPlan === planId
                                  ? "Changing..."
                                  : planId === "starter"
                                    ? "Downgrade"
                                    : "Coming soon"}
                            </Button>
                          </Card>
                        </div>
                      );
                    }
                  )}
                </div>

                {changePlanMutation.isError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {changePlanMutation.error instanceof Error
                        ? changePlanMutation.error.message
                        : "Failed to change plan. Please try again."}
                    </span>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <AlertDialog
              open={confirmPlan !== null}
              onOpenChange={(open) => !open && setConfirmPlan(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {confirmPlan === "starter"
                      ? "Downgrade to Starter?"
                      : `Switch to ${PLAN_DETAILS[confirmPlan ?? "professional"]?.name}?`}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {confirmPlan === "starter"
                      ? "Your subscription will be canceled at the end of the current billing period and you'll move to the free Starter plan."
                      : `You'll be switched to the ${PLAN_DETAILS[confirmPlan ?? "professional"]?.name} plan at $${PLAN_DETAILS[confirmPlan ?? "professional"]?.price}/month. Prorated charges may apply.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (confirmPlan) {
                        changePlanMutation.mutate(confirmPlan, {
                          onSuccess: () => setChangePlanOpen(false),
                        });
                        setConfirmPlan(null);
                      }
                    }}
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {!billing?.subscription?.cancelAtPeriodEnd ? (
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
            ) : billing?.subscription?.stripeSubscriptionId ? (
              <Button
                variant="outline"
                onClick={() => resubscribeMutation.mutate()}
                disabled={resubscribeMutation.isPending}
              >
                {resubscribeMutation.isPending
                  ? "Reactivating..."
                  : "Reactivate Subscription"}
              </Button>
            ) : null}
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-foreground">Payment Method</h2>
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
            <div className="bg-muted rounded-lg p-4 mb-6 text-center text-sm text-muted-foreground">
              No payment method on file
            </div>
          )}

          <Dialog open={paymentMethodOpen} onOpenChange={setPaymentMethodOpen}>
            <DialogTrigger asChild>
              <Button disabled variant="outline" className="w-full">
                Update Payment Method
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
        <h2 className="text-xl text-foreground mb-6">Usage Overview</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Clients</p>
              </div>
              <p className="text-sm text-foreground">
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
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cases</p>
              </div>
              <p className="text-sm text-foreground">
                {projectCount} / {projectLimit ?? "Unlimited"}
              </p>
            </div>
            <Progress
              value={
                projectLimit
                  ? Math.min((projectCount / projectLimit) * 100, 100)
                  : 100
              }
            />
            {currentPlan === "starter" && projectCount >= 5 && (
              <p className="text-[11px] text-red-500 mt-1">
                Limit reached — upgrade to add more
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">AI Credits</p>
              </div>
              <p className="text-sm text-foreground">
                {aiCredits} / {aiCreditLimit}
              </p>
            </div>
            <Progress
              value={Math.min((aiCredits / aiCreditLimit) * 100, 100)}
            />
            {aiCredits >= aiCreditLimit && (
              <p className="text-[11px] text-red-500 mt-1">
                No credits left — upgrade to get more
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Storage</p>
              </div>
              <p className="text-sm text-foreground">
                {storageUsedDisplay} / {storageLimit.toString() + "GB"}
              </p>
            </div>
            <Progress value={Math.min((storageGb / storageLimit) * 100, 100)} />
            {storageGb >= storageLimit && (
              <p className="text-[11px] text-red-500 mt-1">
                Storage full — upgrade to get more
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Invoices */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-foreground">Billing History</h2>
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
                    <TableCell className="text-foreground">
                      {invoice.number ?? invoice.id.slice(0, 12)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.date
                        ? formatDate(new Date(invoice.date * 1000))
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {invoice.description ?? `${planInfo.name} Plan - Monthly`}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatAmount(invoice.amountPaid, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      {invoice.status === "paid" ? (
                        <Badge className="bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        )}
      </Card>
    </div>
  );
}
