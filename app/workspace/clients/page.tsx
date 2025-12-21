"use client";

import { useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import { Input } from "@/app/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Plus, Search, Mail, Phone, Calendar } from "lucide-react";
import axios from "axios";
import { clients } from "@/types/clients";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";

export default function Clients() {
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const queryClient = useQueryClient();

    const getClients = useQuery({
        queryKey: ["clients"],
        queryFn: async () => {
            const res = await axios.get("/api/clients");
            return res.data as clients[];
        },
    });

    const addClient = useMutation({
        mutationFn: async (newClient: {
            name: string;
            email: string;
            phone: string;
        }) => {
            const res = await axios.post("/api/clients", newClient);
            return res.data;
        },

        onMutate: async (newClient) => {
            await queryClient.cancelQueries({ queryKey: ["clients"] });

            const previousClients =
                queryClient.getQueryData<clients[]>(["clients"]) ?? [];

            const optimisticClient: clients = {
                id: Number(crypto.randomUUID()),
                name: newClient.name,
                email: newClient.email,
                phone: newClient.phone,
            };

            queryClient.setQueryData<clients[]>(["clients"], [
                ...previousClients,
                optimisticClient,
            ]);

            setDialogOpen(false);
            setName("");
            setEmail("");
            setPhone("");

            return { previousClients };
        },

        onError: (_err, _newClient, context) => {
            if (context?.previousClients) {
                queryClient.setQueryData(
                    ["clients"],
                    context.previousClients
                );
            }
            alert("Failed to add client");
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });

    const filteredClients =
        getClients.data?.filter((client) =>
            client.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) ?? [];

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

                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Client</DialogTitle>
                            <DialogDescription>
                                Create a new client profile
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                            <div>
                                <Label>Client Name</Label>
                                <Input
                                    placeholder="Acme Corporation"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label>Email</Label>
                                <Input
                                    placeholder="contact@acme.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label>Phone</Label>
                                <Input
                                    placeholder="+1 (555) 000-0000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="mt-2"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    className="cursor-pointer"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() =>
                                        addClient.mutate({ name, email, phone })
                                    }
                                    disabled={addClient.isPending}
                                    className="cursor-pointer"
                                >
                                    Add Client
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Clients Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((client) => (
                    <Card key={client.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <Avatar>
                                <AvatarFallback>
                                    {client.name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <Badge>active</Badge>
                        </div>

                        <h3 className="text-lg mb-4">{client.name}</h3>

                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-2" />
                                {client.email}
                            </div>
                            <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-2" />
                                {client.phone || "N/A"}
                            </div>
                            <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                Joined{" "}
                                {client.createdAt
                                    ? new Date(client.createdAt).toLocaleDateString()
                                    : "N/A"}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
