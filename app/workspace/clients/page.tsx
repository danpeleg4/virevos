"use client"

import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Input } from "../../components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Plus, Search, Mail, Phone, Calendar } from "lucide-react";
import {clients} from "@/app/lib/mockData";

export default function Clients() {
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);

    const filteredClients = clients.filter((client) =>
        client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl text-gray-900">Clients</h1>
                    <p className="text-gray-600 mt-1">
                        Manage your client relationships
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="cursor-pointer">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Client
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Client</DialogTitle>
                            <DialogDescription>
                                Create a new client profile
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                            <div>
                                <Label>Client Name</Label>
                                <Input placeholder="Acme Corporation" className="mt-2" />
                            </div>
                            <div>
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    placeholder="contact@acme.com"
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label>Phone</Label>
                                <Input placeholder="+1 (555) 000-0000" className="mt-2" />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Button className="cursor-pointer" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button className="cursor-pointer" onClick={() => setDialogOpen(false)}>Add Client</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Stats */}
            <div className="grid gap-6 sm:grid-cols-4">
                <Card className="p-6">
                    <p className="text-sm text-gray-600">Total Clients</p>
                    <p className="text-3xl text-gray-900 mt-2">{clients.length}</p>
                </Card>
                <Card className="p-6">
                    <p className="text-sm text-gray-600">Active Clients</p>
                    <p className="text-3xl text-gray-900 mt-2">
                        {clients.filter((c) => c.status === "active").length}
                    </p>
                </Card>
                <Card className="p-6">
                    <p className="text-sm text-gray-600">Active Projects</p>
                    <p className="text-3xl text-gray-900 mt-2">
                        {clients.reduce((sum, c) => sum + c.activeProjects, 0)}
                    </p>
                </Card>
                <Card className="p-6">
                    <p className="text-sm text-gray-600">Completed Projects</p>
                    <p className="text-3xl text-gray-900 mt-2">
                        {clients.reduce((sum, c) => sum + c.completedProjects, 0)}
                    </p>
                </Card>
            </div>

            {/* Clients Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((client) => (
                    <Card key={client.id} className="cursor-pointer p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {client.avatar}
                                </AvatarFallback>
                            </Avatar>
                            <Badge
                                className={
                                    client.status === "active"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-gray-100 text-gray-700"
                                }
                            >
                                {client.status}
                            </Badge>
                        </div>

                        <h3 className="text-lg text-gray-900 mb-4">{client.name}</h3>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                                {client.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                                {client.phone}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                                Since {client.joinedDate}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t">
                            <div>
                                <p className="text-xs text-gray-500">Active</p>
                                <p className="text-lg text-gray-900">{client.activeProjects}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Completed</p>
                                <p className="text-lg text-gray-900">{client.completedProjects}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
