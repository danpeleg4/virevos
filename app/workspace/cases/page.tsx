"use client";

import { useState, useEffect } from "react";
import { CaseList } from "./CaseList";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Case } from "@/types/cases";
import { useRouter } from "next/navigation";
import { changeCaseStatus } from "@/lib/cases";

export default function CasesPage() {
  const [search] = useState("");
  const [tab] = useState("all");
  const router = useRouter();
  const queryClient = useQueryClient();

  const casesQuery = useQuery({
    queryKey: ["cases"],
    queryFn: async () => {
      const res = await axios.get(`/api/cases/get-cases`);
      return res.data;
    },
  });

  const completedMutation = useMutation({
    mutationFn: async ({
      aCase,
      newStatus,
    }: {
      aCase: Case;
      newStatus: string;
    }) => {
      await changeCaseStatus(aCase, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });

  // Update completed cases once data loads
  useEffect(() => {
    if (!casesQuery.data?.cases) return;

    casesQuery.data.cases.forEach((p: Case) => {
      const isCompleted =
        p.stats.totalTasks > 0 && p.stats.completedTasks === p.stats.totalTasks;
      if (isCompleted && p.status !== "completed") {
        completedMutation.mutate({ aCase: p, newStatus: "completed" });
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      } else if (!isCompleted && p.status === "completed") {
        completedMutation.mutate({ aCase: p, newStatus: "active" });
        queryClient.invalidateQueries({ queryKey: ["clients"] });
      }
    });
  }, [casesQuery.data]);

  // Map for display only
  const allCases: Case[] =
    casesQuery.data?.cases?.map((p: Case) => {
      const isCompleted =
        p.stats.totalTasks > 0 && p.stats.completedTasks === p.stats.totalTasks;
      return {
        ...p,
        status: isCompleted ? "completed" : p.status,
      };
    }) ?? [];

  const filtered = allCases.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      tab === "all" ||
      (tab === "active" && p.status !== "completed") ||
      (tab === "completed" && p.status === "completed");

    return matchesSearch && matchesTab;
  });

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 h-full">
      <CaseList
        cases={filtered}
        clients={casesQuery.data?.allClients ?? []}
        onSelect={(aCase) => router.push(`/workspace/cases/${aCase.id}`)}
      />
    </div>
  );
}
