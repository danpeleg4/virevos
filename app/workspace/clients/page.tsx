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
  Briefcase,
  Building2,
  Calendar,
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  FolderOpen,
  ListChecks,
  Mail,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import axios from "axios";
import { clients, CreateClientInput, UpdateClientInput } from "@/types/clients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addAClient,
  deleteClient,
  toggleClientStatus,
  updateExistingClient,
} from "@/lib/clients";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Progress } from "@/app/components/ui/progress";
import { Project } from "@/types/projects";
import { task_percentage } from "@/lib/task_percentage";

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

function IndustryPill({ industry }: { industry: string }) {
  return (
    <span className="inline-flex items-center text-xs bg-muted text-muted-foreground rounded-full py-0.5">
      <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block flex-shrink-0" />
      {industry}
    </span>
  );
}

function ProjectsBadge({ active, total }: { active: number; total: number }) {
  return (
    <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
      {active} active · {total} total
    </span>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <CheckIcon className="h-2.5 w-2.5" />
        Completed
      </span>
    );
  }
  if (status === "inactive") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium bg-muted text-muted-foreground border border-border">
        <Clock className="h-2.5 w-2.5" />
        Inactive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
      <TrendingUp className="h-2.5 w-2.5" />
      Active
    </span>
  );
}

function ProjectPriorityBadge({ priority }: { priority: string }) {
  const styles =
    priority === "high"
      ? "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
      : priority === "medium"
        ? "bg-yellow-50 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800"
        : "bg-muted text-muted-foreground border border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium ${styles}`}
    >
      <Flag className="h-2.5 w-2.5" />
      {priority}
    </span>
  );
}

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "status" | "projects">(
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
  const [selectedClient, setSelectedClient] = useState<clients | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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

  const getProjects = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await axios.get("/api/projects/get-projects");
      return res.data;
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
              client?.industry
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase()))
        )
      : []
  ).sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = (a.name ?? "").localeCompare(b.name ?? "");
    else if (sortField === "status")
      cmp = (a.status ?? "").localeCompare(b.status ?? "");
    else if (sortField === "projects")
      cmp = (Number(a.totalProjects) || 0) - (Number(b.totalProjects) || 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(
    startIndex,
    startIndex + itemsPerPage
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

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedClients.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
      return updateExistingClient(newClient);
    },
    onMutate: async (newClient: UpdateClientInput) => {
      await queryClient.cancelQueries({ queryKey: ["clients"] });

      const previousClients =
        queryClient.getQueryData<clients[]>(["clients"]) ?? [];

      queryClient.setQueryData<clients[]>(
        ["clients"],
        previousClients.map((c) =>
          c.id === newClient.id ? { ...c, ...newClient } : c
        )
      );

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

      setSelectedClient((prev) =>
        prev && prev.id === id ? { ...prev, status } : prev
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
                        label: "Projects (Most)",
                        field: "projects",
                        dir: "desc",
                      },
                      {
                        label: "Projects (Fewest)",
                        field: "projects",
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
                      className="flex items-center justify-between"
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
                      className="flex items-center justify-between"
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
                              industry,
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
                Add your first client to start managing relationships, projects,
                and communications.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        className="rounded border-border h-3.5 w-3.5 cursor-pointer"
                        checked={
                          paginatedClients.length > 0 &&
                          selectedIds.size === paginatedClients.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
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
                        <Briefcase className="h-3.5 w-3.5" />
                        Industry
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
                        Projects
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        Joined
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedClients.map((client, index) => (
                    <tr
                      key={client?.id ?? `temp-${index}-${client.name}`}
                      onClick={() => handleClientClick(client)}
                      className=" transition-colors hover:bg-muted/50 group"
                    >
                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          className="rounded border-border h-3.5 w-3.5 cursor-pointer transition-opacity"
                          checked={selectedIds.has(client.id)}
                          onCheckedChange={() => toggleSelect(client.id)}
                        />
                      </td>
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
                      <td className="px-3 py-2.5">
                        {client.industry && (
                          <IndustryPill industry={client.industry} />
                        )}
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
                        <ProjectsBadge
                          active={Number(client.activeProjects || 0)}
                          total={Number(client.totalProjects || 0)}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {client?.createdAt
                          ? new Date(client.createdAt).toLocaleDateString()
                          : "—"}
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

      {/* Client Details Modal */}
      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setIsEditing(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedClient && (
            <>
              {/* Header */}
              <DialogHeader className="pb-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-14 w-14 flex-shrink-0">
                      <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                        {selectedClient.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-xl text-foreground">
                        {isEditing ? (
                          <Input
                            defaultValue={selectedClient.name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-8 text-base"
                          />
                        ) : (
                          selectedClient.name
                        )}
                      </DialogTitle>
                      <DialogDescription className="mt-1 flex items-center gap-2">
                        <span>
                          Client since{" "}
                          {selectedClient?.createdAt
                            ? new Date(selectedClient.createdAt).toDateString()
                            : "—"}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="cursor-pointer">
                              <StatusBadge status={selectedClient.status} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-32">
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: selectedClient.id,
                                  status: "active",
                                })
                              }
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                              Active
                              {selectedClient.status === "active" && (
                                <CheckIcon className="h-3.5 w-3.5 text-blue-600 ml-auto" />
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                statusMutation.mutate({
                                  id: selectedClient.id,
                                  status: "inactive",
                                })
                              }
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                              Inactive
                              {selectedClient.status === "inactive" && (
                                <CheckIcon className="h-3.5 w-3.5 text-blue-600 ml-auto" />
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {selectedClient.industry && (
                          <IndustryPill industry={selectedClient.industry} />
                        )}
                      </DialogDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer flex-shrink-0"
                    onClick={() => {
                      setDetailsOpen(false);
                      deleteMutation.mutate({ id: selectedClient?.id });
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-5 mt-5">
                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg border border-border px-4 py-3">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {isEditing ? (
                        <Input
                          defaultValue={selectedClient.email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
                          placeholder="Email address"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {selectedClient.email || "—"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg border border-border px-4 py-3">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {isEditing ? (
                        <Input
                          defaultValue={selectedClient.phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
                          placeholder="Phone number"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {selectedClient.phone || "—"}
                        </span>
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-3 bg-muted/50 rounded-lg border border-border px-4 py-3">
                        <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Input
                          defaultValue={selectedClient.industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
                          placeholder="Industry"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Projects Mini Table */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Recent Projects
                  </h3>
                  {(() => {
                    const clientProjects = (getProjects.data?.projects ?? [])
                      .filter((p: Project) => p.clientId === selectedClient.id)
                      .sort(
                        (a: { id: number }, b: { id: number }) => b.id - a.id
                      )
                      .slice(0, 5);

                    if (getProjects.isLoading) {
                      return (
                        <div className="text-xs text-muted-foreground py-4 text-center">
                          Loading projects...
                        </div>
                      );
                    }

                    if (clientProjects.length === 0) {
                      return (
                        <div className="flex flex-col items-center gap-1.5 py-6 text-center bg-muted/30 rounded-lg border border-border">
                          <FolderOpen className="h-5 w-5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            No projects yet
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full">
                          <thead className="border-b border-border bg-muted/50">
                            <tr>
                              <th className="text-left px-3 py-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                  <FolderOpen className="h-3 w-3" />
                                  Project
                                </div>
                              </th>
                              <th className="text-left px-3 py-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                  <Target className="h-3 w-3" />
                                  Status
                                </div>
                              </th>
                              <th className="text-left px-3 py-2 min-w-[100px]">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                  <TrendingUp className="h-3 w-3" />
                                  Progress
                                </div>
                              </th>
                              <th className="text-left px-3 py-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                  <ListChecks className="h-3 w-3" />
                                  Tasks
                                </div>
                              </th>
                              <th className="text-left px-3 py-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                  <Calendar className="h-3 w-3" />
                                  Due
                                </div>
                              </th>
                              <th className="text-left px-3 py-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                                  <Flag className="h-3 w-3" />
                                  Priority
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {clientProjects.map((project: Project) => {
                              const pct = task_percentage({
                                completed: project.stats.completedTasks,
                                total: project.stats.totalTasks,
                              });
                              return (
                                <tr
                                  key={project.id}
                                  className="hover:bg-muted/40 transition-colors"
                                >
                                  <td className="px-3 py-2">
                                    <span className="text-xs font-medium text-foreground">
                                      {project.name}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <ProjectStatusBadge
                                      status={project.status}
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1.5 min-w-[90px]">
                                      <Progress
                                        value={pct}
                                        className="h-1.5 flex-1"
                                      />
                                      <span className="text-xs text-muted-foreground w-6 text-right shrink-0">
                                        {pct}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
                                      {project.stats.completedTasks}/
                                      {project.stats.totalTasks}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    {project.dueDate ? (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-2.5 w-2.5 shrink-0" />
                                        {project.dueDate}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <ProjectPriorityBadge
                                      priority={project.priority}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                    Notes
                  </h3>
                  {isEditing ? (
                    <Textarea
                      defaultValue={selectedClient.notes ?? ""}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes..."
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg border border-border px-4 py-3 min-h-[60px]">
                      {selectedClient.notes || "—"}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailsOpen(false);
                      setIsEditing(false);
                    }}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      if (isEditing) {
                        const updatedData = {
                          id: selectedClient.id,
                          name: name || selectedClient.name,
                          email: email || selectedClient.email,
                          phone: phone || selectedClient.phone,
                          industry: industry || selectedClient.industry,
                          notes: notes || selectedClient.notes,
                        };
                        updateClient.mutate(updatedData);
                      }
                      setIsEditing(!isEditing);
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
