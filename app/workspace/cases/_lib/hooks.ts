"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type { Case, CaseFile, CaseNote } from "@/types/cases";
import type { clients } from "@/types/clients";

export const casesQueryKey = ["cases"] as const;
export const caseQueryKey = (id: string | number) => ["case", id] as const;
export const caseNotesQueryKey = (caseId: number) =>
  ["caseNotes", caseId] as const;
export const caseFilesQueryKey = (caseId: number) => ["files", caseId] as const;

/** All cases with their client roster, for the cases list page. */
export function useCases() {
  return useQuery<{ cases: Case[]; allClients: clients[] }>({
    queryKey: casesQueryKey,
    queryFn: async () => {
      const res = await axios.get("/api/cases/get-cases");
      return res.data;
    },
  });
}

/** A single case's summary. */
export function useCase(id: string) {
  return useQuery<Case>({
    queryKey: caseQueryKey(id),
    queryFn: async () => {
      const res = await axios.get(`/api/cases/${id}`);
      return res.data as Case;
    },
    enabled: !!id,
  });
}

/** Patches a case's status (e.g. auto-completion reconciliation). */
export function useUpdateCaseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      aCase,
      newStatus,
    }: {
      aCase: Case;
      newStatus: string;
    }) => {
      await axios.patch(`/api/cases/${aCase.id}`, { status: newStatus });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKey });
    },
  });
}

/** Updates a case's full editable fields. */
export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: number;
      name: string;
      dueDate?: string;
      priority: string;
      status: string;
      clientId: number | null;
    }) => {
      const { id, ...body } = payload;
      await axios.patch(`/api/cases/${id}`, body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKey });
    },
  });
}

/** Creates a new case. */
export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (aCase: Case) => {
      await axios.post("/api/cases", aCase);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKey });
    },
  });
}

/** Deletes a case. */
export function useDeleteCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (caseId: number) => {
      await axios.delete(`/api/cases/${caseId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: casesQueryKey });
    },
  });
}

/** Notes attached to a case. */
export function useCaseNotes(caseId: number) {
  return useQuery<CaseNote[]>({
    queryKey: caseNotesQueryKey(caseId),
    queryFn: async () => {
      const res = await axios.get(`/api/cases/${caseId}/notes`);
      return res.data;
    },
    enabled: !!caseId,
  });
}

/** Adds a note to a case. */
export function useAddCaseNote(caseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (note: string) => {
      await axios.post(`/api/cases/${caseId}/notes`, { note });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: caseNotesQueryKey(caseId),
      });
    },
  });
}

/** Files attached to a case. */
export function useCaseFiles(caseId: number) {
  return useQuery<CaseFile[]>({
    queryKey: caseFilesQueryKey(caseId),
    queryFn: async () => {
      const res = await axios.get(`/api/files/${caseId}?type=get-files`);
      return res.data;
    },
    enabled: !!caseId,
  });
}

/** Uploads a file to a case. */
export function useAddCaseFile(caseId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      await axios.post(`/api/cases/${caseId}/files`, formData);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: caseFilesQueryKey(caseId),
      });
    },
  });
}

/** Optimistically deletes a case file, syncing the file list cache. */
export function useDeleteCaseFile(caseId: number) {
  const queryClient = useQueryClient();
  const filesKey = caseFilesQueryKey(caseId);
  return useMutation({
    mutationFn: async (fileId: number) => {
      await axios.delete(`/api/files/${fileId}`);
    },
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey: filesKey });
      const previousFiles = queryClient.getQueryData<CaseFile[]>(filesKey);
      queryClient.setQueryData<CaseFile[]>(filesKey, (old) =>
        old?.filter((f) => f.id !== fileId)
      );
      return { previousFiles };
    },
    onError: (_err, _fileId, context) => {
      queryClient.setQueryData(filesKey, context?.previousFiles);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: filesKey });
    },
  });
}
