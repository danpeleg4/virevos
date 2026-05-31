"use client";

import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAvatarUrl,
  uploadAvatar,
  getUserProfile,
  updateProfile,
  getWeeklySummaryPreference,
  updateWeeklySummaryPreference,
  getProductUpdatesPreference,
  updateProductUpdatesPreference,
  changePassword,
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
  checked,
  onCheckedChange,
  disabled = false,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const [internal, setInternal] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const value = isControlled ? checked : internal;
  const handleChange = (next: boolean) => {
    if (!isControlled) setInternal(next);
    onCheckedChange?.(next);
  };
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={value}
        onCheckedChange={handleChange}
        disabled={disabled}
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
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: weeklySummary } = useQuery({
    queryKey: ["weeklySummary"],
    queryFn: getWeeklySummaryPreference,
  });

  const { data: productUpdates } = useQuery({
    queryKey: ["productUpdates"],
    queryFn: getProductUpdatesPreference,
  });

  const weeklySummaryMutation = useMutation({
    mutationFn: (enabled: boolean) => updateWeeklySummaryPreference(enabled),
    onMutate: async (enabled) => {
      setSaveError(null);
      await queryClient.cancelQueries({ queryKey: ["weeklySummary"] });
      const previous = queryClient.getQueryData<boolean>(["weeklySummary"]);
      queryClient.setQueryData<boolean>(["weeklySummary"], enabled);
      return { previous };
    },
    onError: (error: Error, _enabled, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["weeklySummary"], context.previous);
      }
      setSaveError(error.message || "Couldn't save. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["weeklySummary"] });
    },
  });

  const productUpdatesMutation = useMutation({
    mutationFn: (enabled: boolean) => updateProductUpdatesPreference(enabled),
    onMutate: async (enabled) => {
      setSaveError(null);
      await queryClient.cancelQueries({ queryKey: ["productUpdates"] });
      const previous = queryClient.getQueryData<boolean>(["productUpdates"]);
      queryClient.setQueryData<boolean>(["productUpdates"], enabled);
      return { previous };
    },
    onError: (error: Error, _enabled, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["productUpdates"], context.previous);
      }
      setSaveError(error.message || "Couldn't save. Please try again.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["productUpdates"] });
    },
  });

  return (
    <CardContent className="pt-6 space-y-6 max-w-2xl">
      <div>
        <SectionLabel>Email</SectionLabel>
        <div className="space-y-4">
          <ToggleRow
            label="Weekly summary"
            description="Get a weekly email with your productivity summary"
            checked={!!weeklySummary}
            onCheckedChange={(next) => weeklySummaryMutation.mutate(next)}
            disabled={weeklySummaryMutation.isPending}
          />
          <ToggleRow
            label="Product updates"
            description="News about features and improvements"
            checked={!!productUpdates}
            onCheckedChange={(next) => productUpdatesMutation.mutate(next)}
            disabled={productUpdatesMutation.isPending}
          />
        </div>
        {saveError && (
          <p className="text-xs text-destructive mt-3">{saveError}</p>
        )}
      </div>
    </CardContent>
  );
}

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const MIN_PASSWORD_LENGTH = 8;

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onMutate: () => setPasswordError(null),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      setPasswordError(error.message || "Couldn't update password.");
    },
  });

  const passwordsMatch = newPassword === confirmPassword;
  const canUpdatePassword =
    !changePasswordMutation.isPending &&
    currentPassword.length > 0 &&
    newPassword.length >= MIN_PASSWORD_LENGTH &&
    passwordsMatch;

  const handleUpdatePassword = () => {
    setPasswordError(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
      return;
    }
    if (!passwordsMatch) {
      setPasswordError("Passwords do not match.");
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

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
        <div className="flex flex-col items-end gap-2">
          {passwordError && (
            <p className="text-xs text-destructive">{passwordError}</p>
          )}
          {changePasswordMutation.isSuccess && (
            <p className="text-xs text-green-600">Password updated.</p>
          )}
          <Button
            onClick={handleUpdatePassword}
            disabled={!canUpdatePassword}
            size="sm"
          >
            {changePasswordMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {changePasswordMutation.isPending ? "Updating…" : "Update password"}
          </Button>
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
                className={`cursor-pointer inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
        {activeTab === "security" && <SecurityTab />}
        {activeTab === "integrations" && <IntegrationSettings />}
      </Card>
    </div>
  );
}
