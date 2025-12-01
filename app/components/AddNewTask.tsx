"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/app/components/ui/dialog";
import {Button} from "@/app/components/ui/button";
import {Plus} from "lucide-react";
import {Label} from "@/app/components/ui/label";
import {Input} from "@/app/components/ui/input";
import {Textarea} from "@/app/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/app/components/ui/select";
import {useState} from "react";

export default function AddNewTask() {
    const [dialogOpen, setDialogOpen] = useState(false);
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
                        <Input placeholder="Review designs" className="mt-2" />
                    </div>
                    <div>
                        <Label>Description</Label>
                        <Textarea
                            placeholder="Task details..."
                            className="mt-2"
                            rows={3}
                        />
                    </div>
                    <div>
                        <Label>Project</Label>
                        <Select>
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
                            <Select>
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
                            <Input type="date" className="mt-2" />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <Button className="cursor-pointer" variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="cursor-pointer" onClick={() => setDialogOpen(false)}>Create Task</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
        )
}