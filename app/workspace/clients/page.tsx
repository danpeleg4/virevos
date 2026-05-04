"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  ArrowUpDown,
  Building2,
  Calendar,
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { clients, CreateClientInput } from "@/types/clients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addAClient, deleteClient, toggleClientStatus } from "@/lib/clients";
import { Textarea } from "@/app/components/ui/textarea";

const ROW_HEIGHT = 48; // px — matches py-2.5 rows with avatar content

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-muted text-muted-foreground border border-border">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
      Inactive
    </span>
  );
}

function CasesBadge({ active }: { active: number }) {
  return (
    <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
      {active} active
    </span>
  );
}

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "status" | "cases">(
    "name"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const tableRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const calculateItemsPerPage = () => {
      if (!tableRef.current) return;
      const tableTop = tableRef.current.getBoundingClientRect().top;
      // Reserve space for: table header row (~40px), toolbar (~50px), bottom padding (24px)
      const reserved = 40 + 50 + 24;
      const available = window.innerHeight - tableTop - reserved;
      setItemsPerPage(Math.max(1, Math.floor(available / ROW_HEIGHT)));
    };

    calculateItemsPerPage();
    window.addEventListener("resize", calculateItemsPerPage);
    return () => window.removeEventListener("resize", calculateItemsPerPage);
  }, []);

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

  const filteredClients = (
    Array.isArray(getClients.data)
      ? getClients.data.filter(
          (client) =>
            (statusFilter === "all" || client.status === statusFilter) &&
            (client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              client?.email
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              client?.phone?.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : []
  ).sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = (a.name ?? "").localeCompare(b.name ?? "");
    else if (sortField === "status")
      cmp = (a.status ?? "").localeCompare(b.status ?? "");
    else if (sortField === "cases")
      cmp = (Number(a.totalCases) || 0) - (Number(b.totalCases) || 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const addClient = useMutation({
    mutationFn: async (newClient: CreateClientInput) => {
      return await addAClient(newClient);
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
        activeCases: 0,
        completedCases: 0,
        avatar: newClient.name[0],
        notes: newClient.notes,
        totalCases: 0,
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

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: "active" | "inactive";
    }) => {
      await toggleClientStatus({ id, status });
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["clients"] });

      const previousClients =
        queryClient.getQueryData<clients[]>(["clients"]) ?? [];

      queryClient.setQueryData<clients[]>(
        ["clients"],
        previousClients.map((c) => (c.id === id ? { ...c, status } : c))
      );

      return { previousClients };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(["clients"], context.previousClients);
      }
      alert("Failed to update client status");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 h-full">
      {/* Clients Table */}
      <div ref={tableRef} className="flex-1 min-h-0 flex flex-col">
        <Card className="overflow-hidden flex flex-col h-full">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
                    <ArrowUpDown className="h-3 w-3" />
                    Sort
                    {sortField !== "name" || sortDir !== "asc" ? (
                      <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    ) : null}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {(
                    [
                      { label: "Name (A–Z)", field: "name", dir: "asc" },
                      { label: "Name (Z–A)", field: "name", dir: "desc" },
                      {
                        label: "Status (Active first)",
                        field: "status",
                        dir: "asc",
                      },
                      {
                        label: "Status (Inactive first)",
                        field: "status",
                        dir: "desc",
                      },
                      {
                        label: "Cases (Most)",
                        field: "cases",
                        dir: "desc",
                      },
                      {
                        label: "Cases (Fewest)",
                        field: "cases",
                        dir: "asc",
                      },
                    ] as const
                  ).map(({ label, field, dir }) => (
                    <DropdownMenuItem
                      key={label}
                      onClick={() => {
                        setSortField(field);
                        setSortDir(dir);
                        setCurrentPage(1);
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      {label}
                      {sortField === field && sortDir === dir && (
                        <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
                    <SlidersHorizontal className="h-3 w-3" />
                    Filter
                    {statusFilter !== "all" ? (
                      <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    ) : null}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {(
                    [
                      { label: "All", value: "all" },
                      { label: "Active", value: "active" },
                      { label: "Inactive", value: "inactive" },
                    ] as const
                  ).map(({ label, value }) => (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => {
                        setStatusFilter(value);
                        setCurrentPage(1);
                      }}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      {label}
                      {statusFilter === value && (
                        <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                      <DialogDescription>
                        Create a new client profile
                      </DialogDescription>
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
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Describe Notes..."
                          className="mt-2"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end space-x-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            addClient.mutate({
                              name,
                              email,
                              phone,
                              notes,
                            });
                          }}
                        >
                          Add Client
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {getClients.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="rounded-full bg-muted p-5 mb-4">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                No clients yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Add your first client to start managing relationships, cases,
                and communications.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Building2 className="h-3.5 w-3.5" />
                        Client
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Phone className="h-3.5 w-3.5" />
                        Phone
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Target className="h-3.5 w-3.5" />
                        Status
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Cases
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        Joined
                      </div>
                    </th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedClients.map((client, index) => (
                    <tr
                      key={client?.id ?? `temp-${index}-${client.name}`}
                      className="transition-colors group hover:bg-muted/50"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                              {client.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground font-medium pl-3">
                            {client.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {client.email || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {client.phone || "—"}
                      </td>
                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer">
                              <StatusBadge status={client.status} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-32">
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: client.id,
                                  status: "active",
                                })
                              }
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                              Active
                              {client.status === "active" && (
                                <CheckIcon className="h-3.5 w-3.5 text-blue-600 ml-auto" />
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: client.id,
                                  status: "inactive",
                                })
                              }
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                              Inactive
                              {client.status === "inactive" && (
                                <CheckIcon className="h-3.5 w-3.5 text-blue-600 ml-auto" />
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-3 py-2.5">
                        <CasesBadge active={Number(client.activeCases || 0)} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {client?.createdAt
                          ? new Date(client.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td
                        className="px-2 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                              aria-label="Client actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem
                              onClick={() =>
                                deleteMutation.mutate({ id: client.id })
                              }
                              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-border bg-muted/50">
            <div className="text-xs text-muted-foreground">
              Showing {startIndex + 1}–
              {Math.min(startIndex + itemsPerPage, filteredClients.length)} of{" "}
              {filteredClients.length} clients
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="h-7 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 py-1 text-xs text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="h-7 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
