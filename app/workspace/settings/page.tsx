"use client";

import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAvatarUrl,
  uploadAvatar,
  getUserProfile,
  updateProfile,
} from "@/lib/user";
import {
  DEFAULT_TIMEZONE,
  type UserProfile,
  type UpdateProfileInput,
} from "@/lib/user_profile";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import {
  Bell,
  Palette,
  Plug,
  User,
  Shield,
  Monitor,
  Smartphone,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";
import { IntegrationSettings } from "@/app/components/scheduling/IntegrationSettings";

const TABS = [
  { value: "profile", label: "Profile", icon: User },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "preferences", label: "Preferences", icon: Palette },
  { value: "security", label: "Security", icon: Shield },
  { value: "integrations", label: "Integrations", icon: Plug },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
      {children}
    </p>
  );
}

function ToggleRow({
  label,
  description,
  defaultChecked = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={setChecked}
        className="shrink-0"
      />
    </div>
  );
}

const ACCEPTED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB

function ProfileTab() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: avatarData } = useQuery({
    queryKey: ["avatarUrl"],
    queryFn: getAvatarUrl,
  });
  const avatarUrl = avatarData?.url ?? undefined;

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: getUserProfile,
  });

  // Seed the editable fields from the loaded profile, re-seeding only when the
  // server values themselves change (e.g. after a save refetch). This
  // render-time adjustment pattern avoids clobbering in-progress edits and
  // sidesteps the "setState in effect" cascade. The signature is compared by
  // value so it's resilient to the query returning a fresh object each render.
  // See react.dev "You Might Not Need an Effect".
  const [seededSig, setSeededSig] = useState<string>();
  const signature = profile
    ? JSON.stringify([
        profile.name,
        profile.email,
        profile.jobTitle,
        profile.company,
        profile.bio,
        profile.timezone,
      ])
    : undefined;
  if (signature !== undefined && signature !== seededSig && profile) {
    setSeededSig(signature);
    setFullName(profile.name);
    setEmail(profile.email);
    setJobTitle(profile.jobTitle);
    setCompany(profile.company);
    setBio(profile.bio);
    setTimezone(profile.timezone);
  }

  const saveMutation = useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onMutate: async (input) => {
      setSaveError(null);
      await queryClient.cancelQueries({ queryKey: ["userProfile"] });
      const previous = queryClient.getQueryData<UserProfile>(["userProfile"]);
      queryClient.setQueryData<UserProfile>(["userProfile"], (old) => {
        const base: UserProfile = old ?? {
          name: "",
          email,
          jobTitle: "",
          company: "",
          bio: "",
          timezone,
        };
        return {
          ...base,
          name: input.name,
          jobTitle: input.jobTitle ?? base.jobTitle,
          company: input.company ?? base.company,
          bio: input.bio ?? base.bio,
          timezone: input.timezone ?? base.timezone,
        };
      });
      return { previous };
    },
    onError: (error: Error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["userProfile"], context.previous);
      }
      setSaveError(error.message || "Couldn't save. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });

  const trimmedName = fullName.trim();
  const isDirty =
    trimmedName !== (profile?.name ?? "") ||
    jobTitle !== (profile?.jobTitle ?? "") ||
    company !== (profile?.company ?? "") ||
    bio !== (profile?.bio ?? "") ||
    timezone !== (profile?.timezone ?? DEFAULT_TIMEZONE);
  const canSave = !saveMutation.isPending && trimmedName.length > 0 && isDirty;

  const handleSave = () =>
    saveMutation.mutate({
      name: trimmedName,
      jobTitle,
      company,
      bio,
      timezone,
    });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadAvatar(formData);
    },
    onSuccess: (data) => {
      setAvatarError(null);
      queryClient.setQueryData<{ url: string | null }>(["avatarUrl"], {
        url: data.url,
      });
    },
    onError: (error: Error) => {
      setAvatarError(error.message || "Upload failed. Please try again.");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Unsupported image type. Use JPG, PNG, GIF or WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image must be 2MB or smaller.");
      return;
    }

    setAvatarError(null);
    uploadMutation.mutate(file);
  };

  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <CardContent className="pt-6 space-y-6 max-w-2xl">
      <div>
        <SectionLabel>Avatar</SectionLabel>
        <div className="flex items-center gap-4">
          <Avatar className="size-16 text-lg">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Your avatar" />}
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_AVATAR_TYPES.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadMutation.isPending ? "Uploading…" : "Upload new"}
            </Button>
            <p
              className={`text-xs ${
                avatarError ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {avatarError ?? "JPG, PNG, GIF or WebP. Max 2MB."}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <SectionLabel>Personal information</SectionLabel>
        <div className="grid gap-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="jobTitle">Job title</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Attorney"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Virevos LLC"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A short description about yourself"
            maxLength={280}
          />
          <p className="text-xs text-muted-foreground">
            {bio.length}/280 characters
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="America/New_York">
                Eastern Time (ET)
              </SelectItem>
              <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
              <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
              <SelectItem value="America/Los_Angeles">
                Pacific Time (PT)
              </SelectItem>
              <SelectItem value="Europe/London">London (GMT)</SelectItem>
              <SelectItem value="Asia/Jerusalem">Jerusalem (IST)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 pt-2">
        {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        <Button onClick={handleSave} disabled={!canSave} size="sm">
          {saveMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </CardContent>
  );
}

function NotificationsTab() {
  return (
    <CardContent className="pt-6 space-y-6 max-w-2xl">
      <div>
        <SectionLabel>Email</SectionLabel>
        <div className="space-y-4">
          <ToggleRow
            label="Weekly summary"
            description="Get a weekly email with your productivity summary"
          />
          <ToggleRow
            label="Task reminders"
            description="Email me before tasks are due"
            defaultChecked
          />
          <ToggleRow
            label="Meeting recaps"
            description="Send a summary email after each recorded meeting"
            defaultChecked
          />
          <ToggleRow
            label="Product updates"
            description="News about features and improvements"
          />
        </div>
      </div>

      <Separator />

      <div>
        <SectionLabel>Push</SectionLabel>
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
          <ToggleRow
            label="Mentions"
            description="Notify me when I'm mentioned in a comment"
            defaultChecked
          />
        </div>
      </div>

      <Separator />

      <div className="flex justify-end pt-2">
        <Button disabled size="sm">
          Save
        </Button>
      </div>
    </CardContent>
  );
}

function PreferencesTab() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [language, setLanguage] = useState("en");
  const [dateFormat, setDateFormat] = useState("mm-dd-yyyy");
  const [weekStart, setWeekStart] = useState("sunday");
  const [landingPage, setLandingPage] = useState("dashboard");

  return (
    <CardContent className="pt-6 space-y-6 max-w-2xl">
      <div>
        <SectionLabel>Appearance</SectionLabel>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Dark mode</p>
            <p className="text-sm text-muted-foreground">
              Use dark theme across the app
            </p>
          </div>
          <Switch
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            className="shrink-0"
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <SectionLabel>Localization</SectionLabel>
        <div className="grid gap-2">
          <Label htmlFor="language">Language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="he">עברית</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="dateFormat">Date format</Label>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger id="dateFormat">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="weekStart">Week starts on</Label>
            <Select value={weekStart} onValueChange={setWeekStart}>
              <SelectTrigger id="weekStart">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sunday">Sunday</SelectItem>
                <SelectItem value="monday">Monday</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <SectionLabel>Workspace</SectionLabel>
        <div className="grid gap-2">
          <Label htmlFor="landingPage">Default landing page</Label>
          <Select value={landingPage} onValueChange={setLandingPage}>
            <SelectTrigger id="landingPage">
              <SelectValue placeholder="Select a page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dashboard">Dashboard</SelectItem>
              <SelectItem value="tasks">Tasks</SelectItem>
              <SelectItem value="calendar">Calendar</SelectItem>
              <SelectItem value="clients">Clients</SelectItem>
              <SelectItem value="cases">Cases</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ToggleRow
          label="Compact mode"
          description="Reduce spacing to fit more on screen"
        />
        <ToggleRow
          label="AI suggestions"
          description="Show AI-powered next action suggestions"
          defaultChecked
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button disabled size="sm">
          Save
        </Button>
      </div>
    </CardContent>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const sessions = [
    {
      id: "current",
      device: "MacBook Pro · Chrome",
      location: "New York, US",
      lastActive: "Active now",
      icon: Monitor,
      current: true,
    },
    {
      id: "iphone",
      device: "iPhone 15 · Safari",
      location: "New York, US",
      lastActive: "2 hours ago",
      icon: Smartphone,
      current: false,
    },
  ];

  return (
    <CardContent className="pt-6 space-y-6 max-w-2xl">
      <div className="space-y-4">
        <SectionLabel>Change password</SectionLabel>
        <div className="grid gap-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
          <div className="grid gap-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button disabled size="sm">
            Update password
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <SectionLabel>Two-factor authentication</SectionLabel>
        <ToggleRow
          label="Authenticator app"
          description="Require a verification code from an authenticator app at sign-in"
        />
      </div>

      <Separator />

      <div>
        <SectionLabel>Active sessions</SectionLabel>
        <div className="space-y-3">
          {sessions.map((session) => {
            const Icon = session.icon;
            return (
              <div
                key={session.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="rounded-md bg-muted p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {session.device}
                      </p>
                      {session.current && (
                        <Badge className="bg-green-100 text-green-700">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session.location} · {session.lastActive}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button variant="outline" size="sm" disabled>
                    Revoke
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      <div>
        <SectionLabel>Danger zone</SectionLabel>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Delete account
            </p>
            <p className="text-sm text-muted-foreground">
              Permanently remove your account and all associated data.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="shrink-0">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove all of your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled>Delete account</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </CardContent>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabValue>("profile");

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
        {activeTab === "profile" && <ProfileTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "preferences" && <PreferencesTab />}
        {activeTab === "security" && <SecurityTab />}
        {activeTab === "integrations" && <IntegrationSettings />}
      </Card>
    </div>
  );
}
