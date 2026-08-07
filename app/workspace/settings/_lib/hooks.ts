"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { apiErrorMessage } from "@/lib/util/api_error";
import type {
  ChangePasswordInput,
  UpdateProfileInput,
  UserProfile,
} from "@/types/user_profile";
import type { Integration } from "@/types/integrations";

/** The user's avatar URL. */
export function useAvatarUrl() {
  return useQuery<{ url: string | null }>({
    queryKey: ["avatarUrl"],
    queryFn: async () => {
      const res = await axios.get("/api/user", { params: { type: "avatar" } });
      return res.data;
    },
  });
}

/** The user's editable profile fields. */
export function useUserProfile() {
  return useQuery<UserProfile>({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const res = await axios.get("/api/user", {
        params: { type: "profile" },
      });
      return res.data;
    },
  });
}

/** Optimistically saves profile edits. */
export function useUpdateProfile(email: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      try {
        const res = await axios.patch<UserProfile>("/api/user", {
          type: "profile",
          data: input,
        });
        return res.data;
      } catch (err) {
        throw new Error(
          apiErrorMessage(err, "Couldn't save. Please try again.")
        );
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["userProfile"] });
      const previous = queryClient.getQueryData<UserProfile>(["userProfile"]);
      queryClient.setQueryData<UserProfile>(["userProfile"], (old) => {
        const base: UserProfile = old ?? {
          name: "",
          email,
          jobTitle: "",
          company: "",
          bio: "",
        };
        return {
          ...base,
          name: input.name,
          jobTitle: input.jobTitle ?? base.jobTitle,
          company: input.company ?? base.company,
          bio: input.bio ?? base.bio,
        };
      });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["userProfile"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["auth-user"] });
    },
  });
}

/** Uploads a new avatar image. */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await axios.post<{ url: string }>(
          "/api/user/avatar",
          formData
        );
        return res.data;
      } catch (err) {
        throw new Error(
          apiErrorMessage(err, "Upload failed. Please try again.")
        );
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<{ url: string | null }>(["avatarUrl"], {
        url: data.url,
      });
    },
  });
}

/** Whether the user has opted into product-update emails. */
export function useProductUpdatesSetting() {
  return useQuery<boolean>({
    queryKey: ["productUpdates"],
    queryFn: async () => {
      const res = await axios.get("/api/user", {
        params: { type: "product-updates" },
      });
      return res.data;
    },
  });
}

/** Optimistically toggles the product-updates email setting. */
export function useToggleProductUpdates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      try {
        const res = await axios.patch<{ enabled: boolean }>("/api/user", {
          type: "product-updates",
          data: { enabled },
        });
        return res.data;
      } catch (err) {
        throw new Error(
          apiErrorMessage(err, "Couldn't save. Please try again.")
        );
      }
    },
    onMutate: async (enabled) => {
      await queryClient.cancelQueries({ queryKey: ["productUpdates"] });
      const previous = queryClient.getQueryData<boolean>(["productUpdates"]);
      queryClient.setQueryData<boolean>(["productUpdates"], enabled);
      return { previous };
    },
    onError: (_error, _enabled, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["productUpdates"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["productUpdates"] });
    },
  });
}

/** Changes the user's password. */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      try {
        const res = await axios.patch<{ success: true }>("/api/user", {
          type: "password",
          data: input,
        });
        return res.data;
      } catch (err) {
        throw new Error(apiErrorMessage(err, "Couldn't update password."));
      }
    },
  });
}

/** Connected-integration status (currently: Outlook). */
export function useIntegrationsStatus(initialIntegrations: Integration[]) {
  return useQuery<Integration[]>({
    queryKey: ["integrations"],
    queryFn: async () => {
      const outlookCheck = await axios.get("/api/integrations/outlook");
      const outlookConnected = outlookCheck.data.connected;

      return initialIntegrations.map((int) =>
        int.id === "outlook" ? { ...int, connected: outlookConnected } : int
      );
    },
  });
}
