"use client"

import {useEffect, useState} from "react";
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
import axios from "axios";
import {clients} from "@/types/clients";

export default function Clients() {
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [clients, setClients] = useState<clients[]>([]);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    // GET CLIENTS FROM BACKEND
    async function fetchClients() {
        const res = await axios.get("/api/clients");
        const data = await res.data;
        setClients(data);
    }

    useEffect(() => {
        fetchClients();
    }, []);

    // ADD CLIENT
    async function handleAddClient() {
        try {
            const res = await axios.post("/api/clients", {name, email, phone});

            if (res.status === 200) {
                setDialogOpen(false);
                setName("");
                setEmail("");
                setPhone("");
                fetchClients(); // refresh list
            }
        } catch (error) {
            alert("Failed to add client");
        }
    }

    const filteredClients = clients.filter((client: clients) =>
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
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Client
                        </Button>
                    </DialogTrigger>

                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Client</DialogTitle>
                            <DialogDescription>Create a new client profile</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4">
                            <div>
                                <Label>Client Name</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Acme Corporation"
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="contact@acme.com"
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label>Phone</Label>
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+1 (555) 000-0000"
                                    className="mt-2"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAddClient}>Add Client</Button>
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

            {/* Clients Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((client: clients) => (
                    <Card key={client.id} className="cursor-pointer p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <Avatar className="h-12 w-12">
                                <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {client.name[0]}
                                </AvatarFallback>
                            </Avatar>
                            <Badge className="bg-green-100 text-green-700">active</Badge>
                        </div>

                        <h3 className="text-lg text-gray-900 mb-4">{client.name}</h3>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                                <Mail className="h-4 w-4 mr-2" />
                                {client.email}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-4 w-4 mr-2" />
                                {client.phone || "N/A"}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mr-2" />
                                Joined {new Date(client.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
