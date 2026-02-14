"use client";

import { useState } from "react";
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
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
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
  Zap,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

const currentPlan = {
  name: "Professional",
  price: 29,
  billingCycle: "monthly",
  nextBilling: "Dec 10, 2025",
  features: [
    "Unlimited projects",
    "Up to 50 team members",
    "50GB storage",
    "Advanced integrations",
    "Priority support",
    "Custom workflows",
  ],
};

const usage = {
  projects: { current: 18, limit: -1, percentage: 0 }, // -1 means unlimited
  teamMembers: { current: 12, limit: 50, percentage: 24 },
  storage: { current: 23.4, limit: 50, percentage: 47 },
  automations: { current: 89, limit: -1, percentage: 0 },
};

const invoices = [
  {
    id: "INV-2025-011",
    date: "Nov 10, 2025",
    amount: 29.0,
    status: "paid",
    description: "Professional Plan - Monthly",
  },
  {
    id: "INV-2025-010",
    date: "Oct 10, 2025",
    amount: 29.0,
    status: "paid",
    description: "Professional Plan - Monthly",
  },
  {
    id: "INV-2025-009",
    date: "Sep 10, 2025",
    amount: 29.0,
    status: "paid",
    description: "Professional Plan - Monthly",
  },
  {
    id: "INV-2025-008",
    date: "Aug 10, 2025",
    amount: 29.0,
    status: "paid",
    description: "Professional Plan - Monthly",
  },
];

const plans = [
  {
    name: "Starter",
    price: 9,
    description: "Perfect for individuals",
    features: [
      "Up to 5 projects",
      "1 team member",
      "1GB storage",
      "Basic features",
    ],
  },
  {
    name: "Professional",
    price: 29,
    description: "Great for small teams",
    features: [
      "Unlimited projects",
      "Up to 50 team members",
      "50GB storage",
      "Advanced features",
      "Priority support",
    ],
    current: true,
  },
  {
    name: "Enterprise",
    price: 99,
    description: "For large organizations",
    features: [
      "Unlimited everything",
      "Unlimited team members",
      "Unlimited storage",
      "All features",
      "24/7 phone support",
      "Dedicated account manager",
    ],
  },
];

export default function Billing() {
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl text-gray-900">Billing & Subscription</h1>
        <p className="text-gray-600 mt-1">
          Manage your subscription and billing information
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Plan */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl text-gray-900">Current Plan</h2>
              <p className="text-sm text-gray-600 mt-1">
                You&#39;re on the {currentPlan.name} plan
              </p>
            </div>
            <Badge className="bg-blue-100 text-blue-700">Active</Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">Plan</p>
              <p className="text-3xl text-gray-900">
                ${currentPlan.price}
                <span className="text-lg text-gray-600">
                  /{currentPlan.billingCycle}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Next Billing</p>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <p className="text-lg text-gray-900">
                  {currentPlan.nextBilling}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-700 mb-3">Included Features</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {currentPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
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
                  {plans.map((plan, index) => (
                    <Card
                      key={index}
                      className={`p-6 ${
                        plan.current ? "border-2 border-blue-500" : ""
                      }`}
                    >
                      {plan.current && (
                        <Badge className="mb-4 bg-blue-100 text-blue-700">
                          Current Plan
                        </Badge>
                      )}
                      <h3 className="text-xl text-gray-900 mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {plan.description}
                      </p>
                      <p className="text-3xl text-gray-900 mb-6">
                        ${plan.price}
                        <span className="text-lg text-gray-600">/mo</span>
                      </p>
                      <div className="space-y-3 mb-6">
                        {plan.features.map((feature, fIndex) => (
                          <div
                            key={fIndex}
                            className="flex items-start space-x-2"
                          >
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Button
                        className="w-full"
                        variant={plan.current ? "outline" : "default"}
                        disabled={plan.current}
                      >
                        {plan.current ? "Current Plan" : "Select Plan"}
                      </Button>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="outline">Cancel Subscription</Button>
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-gray-900">Payment Method</h2>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 mb-6 text-white">
            <div className="flex items-center justify-between mb-6">
              <CreditCard className="h-8 w-8" />
              <p className="text-sm">VISA</p>
            </div>
            <p className="text-lg mb-1">•••• •••• •••• 4242</p>
            <p className="text-sm opacity-80">Expires 12/2027</p>
          </div>

          <Dialog open={paymentMethodOpen} onOpenChange={setPaymentMethodOpen}>
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

              <div className="space-y-4 mt-4">
                <div>
                  <Label>Card Number</Label>
                  <Input placeholder="1234 5678 9012 3456" className="mt-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Expiry Date</Label>
                    <Input placeholder="MM/YY" className="mt-2" />
                  </div>
                  <div>
                    <Label>CVV</Label>
                    <Input placeholder="123" className="mt-2" />
                  </div>
                </div>
                <div>
                  <Label>Cardholder Name</Label>
                  <Input placeholder="John Doe" className="mt-2" />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setPaymentMethodOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => setPaymentMethodOpen(false)}>
                    Save Card
                  </Button>
                </div>
              </div>
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
                <p className="text-sm text-gray-600">Team Members</p>
              </div>
              <p className="text-sm text-gray-900">
                {usage.teamMembers.current} / {usage.teamMembers.limit}
              </p>
            </div>
            <Progress value={usage.teamMembers.percentage} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-600">Storage</p>
              </div>
              <p className="text-sm text-gray-900">
                {usage.storage.current}GB / {usage.storage.limit}GB
              </p>
            </div>
            <Progress value={usage.storage.percentage} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-600">Projects</p>
              </div>
              <p className="text-sm text-gray-900">
                {usage.projects.current} / Unlimited
              </p>
            </div>
            <Progress value={100} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-600">Automations</p>
              </div>
              <p className="text-sm text-gray-900">
                {usage.automations.current} / Unlimited
              </p>
            </div>
            <Progress value={100} />
          </div>
        </div>
      </Card>

      {/* Invoices */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-gray-900">Billing History</h2>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download All
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="text-gray-900">{invoice.id}</TableCell>
                <TableCell className="text-gray-600">{invoice.date}</TableCell>
                <TableCell className="text-gray-600">
                  {invoice.description}
                </TableCell>
                <TableCell className="text-gray-900">
                  ${invoice.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
