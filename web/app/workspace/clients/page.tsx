"use client";

import { useState, useEffect, useRef } from "react";
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
  Plus,
  Search,
  Mail,
  Phone,
  Calendar,
  ChevronRight,
  ChevronLeft,
  FolderOpen,
  Trash2,
  Globe,
  ArrowUpDown,
  SlidersHorizontal,
  Building2,
  Briefcase,
  Target,
  CheckIcon,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import axios from "axios";
import { clients, CreateClientInput, UpdateClientInput } from "@/types/clients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addAClient, deleteClient, updateExistingClient } from "@/lib/clients";
import { Textarea } from "@/app/components/ui/textarea";
import { Checkbox } from "@/app/components/ui/checkbox";

const ROW_HEIGHT = 48; // px — matches py-2.5 rows with avatar content

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 text-green-700 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-gray-50 text-gray-500 border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
      Inactive
    </span>
  );
}

function IndustryPill({ industry }: { industry: string }) {
  return (
    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-700 rounded-full py-0.5">
      <span className="w-2 h-2 rounded-full bg-gray-400 inline-block flex-shrink-0" />
      {industry}
    </span>
  );
}

function ProjectsBadge({ active, total }: { active: number; total: number }) {
  return (
    <span className="inline-flex items-center text-xs px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-medium">
      {active} active · {total} total
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

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-6 h-full">
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

      {/* Clients Table */}
      <div ref={tableRef} className="flex-1 min-h-0 flex flex-col">
        <Card className="overflow-hidden flex flex-col h-full">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50/50">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
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
                  <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
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
                  <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
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
            </div>
          </div>

          {getClients.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="rounded-full bg-gray-100 p-5 mb-4">
                <Building2 className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No clients yet
              </h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Add your first client to start managing relationships, projects,
                and communications.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="w-10 px-3 py-2.5">
                      <Checkbox
                        className="rounded border-gray-300 h-3.5 w-3.5 cursor-pointer"
                        checked={
                          paginatedClients.length > 0 &&
                          selectedIds.size === paginatedClients.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Building2 className="h-3.5 w-3.5" />
                        Client
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Mail className="h-3.5 w-3.5" />
                        Email
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Briefcase className="h-3.5 w-3.5" />
                        Industry
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Target className="h-3.5 w-3.5" />
                        Status
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <FolderOpen className="h-3.5 w-3.5" />
                        Projects
                      </div>
                    </th>
                    <th className="text-left px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        Joined
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedClients.map((client, index) => (
                    <tr
                      key={client?.id ?? `temp-${index}-${client.name}`}
                      onClick={() => handleClientClick(client)}
                      className="cursor-pointer transition-colors hover:bg-gray-50 group"
                    >
                      <td
                        className="px-3 py-2.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          className="rounded border-gray-300 h-3.5 w-3.5 cursor-pointer transition-opacity"
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
                          <span className="text-sm text-gray-900 font-medium pl-3">
                            {client.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {client.email || "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        {client.industry && (
                          <IndustryPill industry={client.industry} />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="px-3 py-2.5">
                        <ProjectsBadge
                          active={Number(client.activeProjects || 0)}
                          total={Number(client.totalProjects || 0)}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50/50">
            <div className="text-xs text-gray-500">
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
              <span className="px-2 py-1 text-xs text-gray-600">
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
        <DialogContent className="max-w-2xl">
          {selectedClient && (
            <>
              {/* Header */}
              <DialogHeader className="pb-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-14 w-14 flex-shrink-0">
                      <AvatarFallback className="text-xl bg-blue-100 text-blue-600">
                        {selectedClient.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-xl text-gray-900">
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
                        <StatusBadge status={selectedClient.status} />
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
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Contact Information
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {isEditing ? (
                        <Input
                          defaultValue={selectedClient.email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
                          placeholder="Email address"
                        />
                      ) : (
                        <span className="text-sm text-gray-700">
                          {selectedClient.email || "—"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {isEditing ? (
                        <Input
                          defaultValue={selectedClient.phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
                          placeholder="Phone number"
                        />
                      ) : (
                        <span className="text-sm text-gray-700">
                          {selectedClient.phone || "—"}
                        </span>
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3">
                        <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
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

                {/* Projects Summary */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Projects
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <p className="text-2xl text-gray-900 mb-1">
                        {selectedClient.activeProjects}
                      </p>
                      <p className="text-sm text-gray-600">Active Projects</p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <CheckCircle className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <p className="text-2xl text-gray-900 mb-1">
                        {selectedClient.completedProjects}
                      </p>
                      <p className="text-sm text-gray-600">
                        Completed Projects
                      </p>
                    </Card>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
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
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg border border-gray-100 px-4 py-3 min-h-[60px]">
                      {selectedClient.notes || "—"}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
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
