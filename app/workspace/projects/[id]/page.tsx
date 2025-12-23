"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ProjectDetailView } from "../ProjectDetailView";
import { Project } from "@/types/projects";
import {use} from "react";

export default function ProjectPage({
                                        params,
                                    }: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params);
    const router = useRouter();

    const projectQuery = useQuery({
        queryKey: ["project", id],
        queryFn: async () => {
            const res = await axios.get(`/api/projects/${id}`);
            return res.data as Project;
        },
        enabled: !!id,
    });

    if (projectQuery.isLoading) return <p>Loading...</p>;
    if (projectQuery.isError) return <p>Failed to load project</p>;

    return (
        <div className="p-6 space-y-6">
        <ProjectDetailView
            project={projectQuery.data!}
            onBackAction={() => router.push("/workspace/projects")}
        />
        </div>
    );
}
