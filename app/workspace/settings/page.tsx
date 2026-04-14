"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";
import { Bell, Palette, Plug } from "lucide-react";
import { IntegrationSettings } from "@/app/components/scheduling/IntegrationSettings";

const TABS = [
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "preferences", label: "Preferences", icon: Palette },
  { value: "integrations", label: "Integrations", icon: Plug },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function ToggleRow({
  label,
  description,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch disabled className="shrink-0" />
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabValue>("notifications");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Card className="overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-border px-4 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`cursor-pointer inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  activeTab === tab.value
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "notifications" && (
          <CardContent className="pt-6 space-y-6 max-w-2xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Email
              </p>
              <div className="space-y-4">
                <ToggleRow
                  label="Weekly summary"
                  description="Get a weekly email with your productivity summary"
                />
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Push
              </p>
              <div className="space-y-4">
                <ToggleRow
                  label="Desktop notifications"
                  description="Show notifications on your desktop"
                  defaultChecked
                />
                <ToggleRow
                  label="Mobile notifications"
                  description="Receive push notifications on mobile devices"
                  defaultChecked
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button disabled size="sm">
                Save
              </Button>
            </div>
          </CardContent>
        )}

        {activeTab === "preferences" && (
          <CardContent className="pt-6 space-y-6 max-w-2xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Appearance
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Dark mode
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme across the app
                  </p>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                  className="shrink-0"
                />
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                Productivity
              </p>
              <div className="space-y-4">
                <ToggleRow
                  label="AI suggestions"
                  description="Show AI-powered next action suggestions"
                  defaultChecked
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button disabled size="sm">
                Save
              </Button>
            </div>
          </CardContent>
        )}

        {activeTab === "integrations" && <IntegrationSettings />}
      </Card>
    </div>
  );
}
