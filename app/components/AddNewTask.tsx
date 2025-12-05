"use client"

import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle, DialogTrigger
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Plus } from "lucide-react";
import { Label } from "@/app/components/ui/label";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { useState } from "react";
import axios from "axios";

type AddNewTaskProps = {
    onTaskCreatedAction: (task: Task) => void;
};

export default function AddNewTask({ onTaskCreatedAction }: AddNewTaskProps) {
    const [dialogOpen, setDialogOpen] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [project, setProject] = useState("");
    const [priority, setPriority] = useState("");
    const [dueDate, setDueDate] = useState("");

    const submitTask = async () => {
        setDialogOpen(false);

        const res = await axios.post("/api/tasks", {
            title,
            description,
            priority,
            dueDate,
            project,
        });
        console.log("RES DATA:", res.data);

        onTaskCreatedAction(res.data.task);

        setTitle("");
        setDescription("");
        setProject("");
        setPriority("");
        setDueDate("");
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>Add a task to your project</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">

                    <div>
                        <Label>Task Title</Label>
                        <Input
                            placeholder="Review designs"
                            className="mt-2"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Description</Label>
                        <Textarea
                            placeholder="Review designs for TechCorp website and brand refresh"
                            className="mt-2"
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Project</Label>
                        <Select onValueChange={setProject}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">TechCorp Website Redesign</SelectItem>
                                <SelectItem value="2">DesignCo Brand Refresh</SelectItem>
                                <SelectItem value="3">StartupXYZ MVP Development</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Priority</Label>
                            <Select onValueChange={setPriority}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Due Date</Label>
                            <Input
                                type="date"
                                className="mt-2"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={submitTask}>Create Task</Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
