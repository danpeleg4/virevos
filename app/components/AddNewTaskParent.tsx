"use server"

import AddNewTask from "@/app/components/AddNewTask";
import {db} from "@/db/db";
import {currentUser} from "@clerk/nextjs/server";

export const getProjects = async (): Promise<Project[]> => {
    const user = await currentUser();
    if (!user?.id) {
        return [];
    }

    const res = await db.query.projects.findMany({
        where: (fields, {eq}) => eq(fields.userId, user.id),
    });

    return res ?? [];
};


export async function AddNewTaskParent({ onTaskCreatedAction, projectName }: AddNewTaskPropsParent) {

    return (
        <AddNewTask
            onTaskCreatedAction={onTaskCreatedAction}
            projectName={projectName}
            projectData={getProjects}
        />
    )
}