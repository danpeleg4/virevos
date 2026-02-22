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
import {
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  ChevronLeft,
  FolderOpen,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { clients, CreateClientInput, UpdateClientInput } from "@/types/clients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addAClient,
  deleteClient,
  updateExistingClient,
} from "@/lib/server_actions/clients";
import { Textarea } from "@/app/components/ui/textarea";

const ITEMS_PER_PAGE = 8;

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedClient, setSelectedClient] = useState<clients | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const getClients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const res = await axios.get("/api/clients");
      return res.data as clients[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      await deleteClient({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const filteredClients = Array.isArray(getClients.data)
    ? getClients.data.filter(
        (client) =>
          client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client?.industry?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedClients = filteredClients.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const handleClientClick = (client: clients) => {
    setSelectedClient(client);
    setDetailsOpen(true);
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const addClient = useMutation({
    mutationFn: async (newClient: CreateClientInput) => {
      const res = await addAClient(newClient);
      return res;
    },

    onMutate: async (newClient) => {
      await queryClient.cancelQueries({ queryKey: ["clients"] });

      const previousClients =
        queryClient.getQueryData<clients[]>(["clients"]) ?? [];

      const optimisticClient: clients = {
        id: Date.now(),
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        status: "active",
        activeProjects: 0,
        completedProjects: 0,
        avatar: newClient.name[0],
        industry: newClient.industry,
        notes: newClient.notes,
        totalProjects: 0,
      };

      queryClient.setQueryData<clients[]>(
        ["clients"],
        [...previousClients, optimisticClient]
      );

      setDialogOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setIndustry("");

      return { previousClients };
    },

    onError: (_err, _newClient, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(["clients"], context.previousClients);
      }
      alert("Failed to add client");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  const updateClient = useMutation({
    mutationFn: async (newClient: UpdateClientInput) => {
      const res = updateExistingClient(newClient);
      return res;
    },
    onMutate: async (newClient: UpdateClientInput) => {
      await queryClient.cancelQueries({ queryKey: ["clients"] });

      const previousClients =
        queryClient.getQueryData<clients[]>(["clients"]) ?? [];

      // Optimistically update the existing client
      queryClient.setQueryData<clients[]>(
        ["clients"],
        previousClients.map((c) =>
          c.id === newClient.id
            ? { ...c, ...newClient } // merge the updated fields
            : c
        )
      );

      // Also update the selected client immediately
      setSelectedClient((prev) =>
        prev && prev.id === newClient.id ? { ...prev, ...newClient } : prev
      );

      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
      setIndustry("");

      return { previousClients };
    },

    onError: (_err, _newClient, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(
          ["clients", _newClient.id],
          context.previousClients
        );
      }
      alert("Failed to update client");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl text-gray-900">Clients</h1>
          <p className="mt-1 text-gray-600">Manage your client relationships</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>Create a new client profile</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label>Client Name</Label>
                <Input
                  placeholder="Acme Corporation"
                  className="mt-2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="contact@acme.com"
                  className="mt-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="+1 (555) 000-0000"
                  className="mt-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label>Industry</Label>
                <Input
                  placeholder="Technology"
                  className="mt-2"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Describe Notes..."
                  className="mt-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    addClient.mutate({ name, email, phone, industry, notes });
                  }}
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Clients</p>
          <p className="text-3xl mt-2 text-gray-900">
            {Array.isArray(getClients.data) ? getClients?.data?.length : []}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Active Clients</p>
          <p className="text-3xl mt-2 text-gray-900">
            {Array.isArray(getClients.data)
              ? getClients?.data?.filter((c: clients) => c.status === "active")
                  .length
              : []}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Active Projects</p>
          <p className="text-3xl mt-2 text-gray-900">
            {Array.isArray(getClients.data)
              ? getClients?.data?.reduce(
                  (sum, c) => sum + Number(c.activeProjects || 0),
                  0
                )
              : []}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Completed Projects</p>
          <p className="text-3xl mt-2 text-gray-900">
            {Array.isArray(getClients.data)
              ? getClients?.data?.reduce(
                  (sum, c) => sum + Number(c.completedProjects || 0),
                  0
                )
              : []}
          </p>
        </Card>
      </div>

      {/* Clients List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-gray-600">
                  Client
                </th>
                <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-gray-600">
                  Contact
                </th>
                <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-gray-600">
                  Industry
                </th>
                <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-gray-600">
                  Projects
                </th>
                <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-gray-600">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-gray-600">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedClients.map((client, index) => (
                <tr
                  key={client?.id ?? `temp-${index}-${client.name}`}
                  onClick={() => handleClientClick(client)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {client.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-gray-900">{client.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-3 w-3 mr-2 flex-shrink-0" />
                        {client.email}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-3 w-3 mr-2 flex-shrink-0" />
                        {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="bg-purple-100 text-purple-700">
                      {client.industry}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <FolderOpen className="h-3 w-3 mr-2" />
                        <span className="text-green-600">
                          {client.completedProjects}
                        </span>
                        <span className="mx-1">/</span>
                        <span className="text-gray-500">
                          {client.totalProjects}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      className={
                        client.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }
                    >
                      {client.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-3 w-3 mr-2" />
                      {client?.createdAt
                        ? new Date(client.createdAt).toDateString()
                        : "—"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredClients.length)} of{" "}
            {filteredClients.length} clients
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="flex items-center"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="px-3 py-1 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="flex items-center"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Client Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedClient && (
            <>
              <DialogHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                      {selectedClient.name[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <DialogTitle className="text-2xl">
                      {isEditing ? (
                        <Input
                          placeholder={selectedClient.name}
                          onChange={(e) => setName(e.target.value)}
                        ></Input>
                      ) : (
                        selectedClient.name
                      )}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      Client since{" "}
                      {selectedClient?.createdAt
                        ? new Date(selectedClient.createdAt).toDateString()
                        : "—"}
                    </DialogDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailsOpen(false);
                    const a = { id: selectedClient?.id };
                    deleteMutation.mutate(a);
                  }}
                >
                  <Trash2 className="text-red-500" />
                </Button>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Status and Industry */}
                <div className="flex items-center space-x-3">
                  <Badge
                    className={
                      selectedClient.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }
                  >
                    {selectedClient.status}
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-700">
                    {selectedClient.industry}
                  </Badge>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="mb-3 text-gray-900">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-700">
                      <Mail className="h-4 w-4 mr-3 flex-shrink-0" />
                      <span>
                        {" "}
                        {isEditing ? (
                          <Input
                            placeholder={selectedClient.email}
                            onChange={(e) => setEmail(e.target.value)}
                          ></Input>
                        ) : (
                          selectedClient.email
                        )}
                      </span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <Phone className="h-4 w-4 mr-3 flex-shrink-0" />
                      <span>
                        {isEditing ? (
                          <Input
                            placeholder={selectedClient.phone}
                            onChange={(e) => setPhone(e.target.value)}
                          ></Input>
                        ) : (
                          selectedClient.phone
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Projects Summary */}
                <div>
                  <h3 className="mb-3 text-gray-900">Projects</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4">
                      <p className="text-sm text-gray-600">Active Projects</p>
                      <p className="text-2xl mt-1 text-green-600">
                        {selectedClient.activeProjects}
                      </p>
                    </Card>
                    <Card className="p-4">
                      <p className="text-sm text-gray-600">
                        Completed Projects
                      </p>
                      <p className="text-2xl mt-1 text-gray-900">
                        {selectedClient.completedProjects}
                      </p>
                    </Card>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <div>
                    <h3 className="mb-3 text-gray-900">Notes</h3>

                    {isEditing ? (
                      <Input
                        placeholder={selectedClient.notes}
                        onChange={(e) => setNotes(e.target.value)}
                      ></Input>
                    ) : (
                      selectedClient.notes
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setDetailsOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(!isEditing);
                      const updatedData = {
                        id: selectedClient.id,
                        name: name || selectedClient.name,
                        email: email || selectedClient.email,
                        phone: phone || selectedClient.phone,
                        industry: industry || selectedClient.industry,
                        notes: notes || selectedClient.notes,
                      };

                      updateClient.mutate(updatedData);
                    }}
                  >
                    {isEditing ? "Save Client" : "Edit Client"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
