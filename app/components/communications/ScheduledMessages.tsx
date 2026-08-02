"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Clock,
  Plus,
  Mail,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  Search,
  SlidersHorizontal,
  CheckIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  Target,
  CalendarIcon,
  Paperclip,
  X,
} from "lucide-react";
import axios from "axios";
import type { ScheduledEmail } from "@/types/communications";
import { type ScheduleEmailInput } from "@/lib/scheduled_emails";
import { AttachmentDialog, type AttachedFile } from "./AttachmentDialog";
import { Badge } from "../ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCalcWindow } from "@/app/hooks/useCalcWindow";
import { Label } from "@/app/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { cn } from "@/app/components/ui/utils";
import { Calendar } from "@/app/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { timeOptions } from "@/lib/util/utils";
import { toast } from "@/app/components/ui/toast-store";

interface ScheduledMessagesProps {
  navContainer: HTMLDivElement | null;
}

export function ScheduledMessages({ navContainer }: ScheduledMessagesProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false);
  const [formAttachments, setFormAttachments] = useState<AttachedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "sent" | "failed"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const { itemsPerPage, tableRef } = useCalcWindow();

  // Form state
  const [formToEmail, setFormToEmail] = useState("");
  const [formToName, setFormToName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formDate, setFormDate] = useState<Date | undefined>(undefined);
  const [formTime, setFormTime] = useState("09:00");

  const queryClient = useQueryClient();

  const { data: connected } = useQuery({
    queryKey: ["email-connection"],
    queryFn: async () => {
      const res = await axios.get("/api/integrations/outlook");
      return res.data.connected;
    },
  });

  const { data: messages, isPending: isPending } = useQuery<ScheduledEmail[]>({
    queryKey: ["scheduled-emails"],
    queryFn: async () => {
      const res = await axios.get("/api/scheduled-emails");
      return res.data.scheduledEmails || [];
    },
  });

  const deleteScheduledEmailMessage = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/scheduled-emails`, {
        params: { id: id },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] });
      toast.success({
        title: "Deleted",
        description: "Message deleted successfully",
      });
    },
  });

  const sendNowMutation = useMutation({
    mutationFn: async (msg: ScheduledEmail) => {
      await axios.post("/api/scheduled-emails", {
        data: msg.id,
        type: "send-now",
      });
    },
    onMutate: async (msg) => {
      await queryClient.cancelQueries({ queryKey: ["scheduled-emails"] });
      const previous = queryClient.getQueryData<ScheduledEmail[]>([
        "scheduled-emails",
      ]);
      queryClient.setQueryData<ScheduledEmail[]>(["scheduled-emails"], (old) =>
        old?.map((m) =>
          m.id === msg.id
            ? {
                ...m,
                status: "sent",
                sentAt: new Date().toISOString(),
                errorMessage: null,
              }
            : m
        )
      );
      return { previous };
    },
    onError: (_error, _msg, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["scheduled-emails"], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] });
      toast.success({
        title: "Sent",
        description: "Message sent successfully",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (input: ScheduleEmailInput) => {
      await axios.post("/api/scheduled-emails", {
        data: { ...input },
        type: "schedule",
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["scheduled-emails"] });
      const previous = queryClient.getQueryData<ScheduledEmail[]>([
        "scheduled-emails",
      ]);
      const optimistic: ScheduledEmail = {
        id: -Date.now(),
        toEmail: input.toEmail,
        toName: input.toName ?? null,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        bodyText: input.bodyText ?? null,
        scheduledAt: input.scheduledAt,
        timezone: input.timezone ?? "UTC",
        recurring: input.recurring ?? "none",
        status: "pending",
        sentAt: null,
        errorMessage: null,
        attachments: input.attachments ?? [],
        clientId: input.clientId ?? null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ScheduledEmail[]>(
        ["scheduled-emails"],
        (old) => [optimistic, ...(old ?? [])]
      );
      return { previous };
    },
    onSuccess: () => {
      setFormToEmail("");
      setFormToName("");
      setFormSubject("");
      setFormBody("");
      setFormDate(undefined);
      setFormTime("09:00");
      setFormAttachments([]);
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["scheduled-emails"], context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="h-3 w-3" />
            Scheduled
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Sent
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium bg-muted/50 text-muted-foreground border border-border">
            {status}
          </span>
        );
    }
  };

  const handleSchedule = () => {
    if (!formToEmail || !formSubject || !formBody || !formDate || !formTime) {
      return;
    }

    const [hours, minutes] = formTime.split(":").map(Number);
    const scheduledAt = new Date(
      formDate.getFullYear(),
      formDate.getMonth(),
      formDate.getDate(),
      hours,
      minutes,
      0,
      0
    ).toISOString();
    setIsCreating(false);
    const attachments = formAttachments
      .filter((f) => f.data || f.path || f.url)
      .map((f) => ({
        name: f.name,
        mimeType: f.mimeType,
        data: f.data,
        path: f.path,
        url: f.url,
      }));
    scheduleMutation.mutate({
      toEmail: formToEmail,
      toName: formToName || undefined,
      subject: formSubject,
      bodyHtml: `<p>${formBody.replace(/\n/g, "<br>")}</p>`,
      bodyText: formBody,
      scheduledAt,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(attachments.length > 0 ? { attachments } : {}),
    });
  };

  const filteredMessages = (messages ?? []).filter((msg) => {
    const matchesSearch =
      searchQuery === "" ||
      msg.toEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.toName &&
        msg.toName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMessages.length / itemsPerPage)
  );
  // Clamp so deleting the last row of the last page never strands a blank page
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedMessages = filteredMessages.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  if (connected === false) {
    return (
      <div className="py-24 text-center">
        <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
        <p className="text-foreground text-lg mb-2">Email not connected</p>
        <p className="text-sm text-muted-foreground mb-6">
          Connect your Email account to sync emails and use the inbox.
        </p>
        <Button onClick={() => (window.location.href = "/api/outlook")}>
          <Mail className="h-4 w-4 mr-2" />
          Connect Email
        </Button>
      </div>
    );
  }

  const statusFilterLabel =
    statusFilter === "all"
      ? "All Status"
      : statusFilter === "pending"
        ? "Scheduled"
        : statusFilter === "sent"
          ? "Sent"
          : "Failed";

  const now = new Date();
  const isFormDateToday =
    !!formDate && formDate.toDateString() === now.toDateString();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  const handleSelectDate = (d: Date | undefined) => {
    setFormDate(d);
    const selectedIsToday = !!d && d.toDateString() === now.toDateString();
    if (selectedIsToday && formTime < currentTimeStr) {
      const nextAvailable = timeOptions.find((t) => t >= currentTimeStr);
      if (nextAvailable) setFormTime(nextAvailable);
    }
  };

  const navActions = (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search scheduled..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-8 h-8 text-sm w-48"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-card hover:bg-accent border border-border rounded-md px-3 py-1.5 transition-colors">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {statusFilterLabel}
            {statusFilter !== "all" && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {(["all", "pending", "sent", "failed"] as const).map((v) => (
            <DropdownMenuItem
              key={v}
              onClick={() => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
              className="flex items-center justify-between cursor-pointer"
            >
              {v === "all"
                ? "All Status"
                : v === "pending"
                  ? "Scheduled"
                  : v === "sent"
                    ? "Sent"
                    : "Failed"}
              {statusFilter === v && (
                <CheckIcon className="h-3.5 w-3.5 text-blue-600 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogTrigger asChild>
          <Button size="sm" className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Schedule Message
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule New Message</DialogTitle>
            <DialogDescription>
              Schedule a message to be sent at a specific date and time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-foreground">
                  Recipient Email *
                </label>
                <Input
                  placeholder="recipient@example.com"
                  value={formToEmail}
                  onChange={(e) => setFormToEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-foreground">
                  Recipient Name
                </label>
                <Input
                  placeholder="John Doe"
                  value={formToName}
                  onChange={(e) => setFormToName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Subject *</label>
              <Input
                placeholder="Email subject..."
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-foreground">Message *</label>
              <Textarea
                placeholder="Type your message..."
                rows={6}
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              {formAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formAttachments.map((file) => (
                    <Badge key={file.id} variant="secondary" className="pr-1">
                      {file.name}
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setFormAttachments((prev) =>
                            prev.filter((f) => f.id !== file.id)
                          )
                        }
                        className="ml-2 hover:bg-accent rounded-full p-0.5"
                      >
                        <X className="h-3 w-3 cursor-pointer" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Select date"
                      className={cn(
                        "border-input data-[placeholder]:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] mt-2 h-9 cursor-pointer",
                        !formDate && "text-muted-foreground"
                      )}
                      data-placeholder={!formDate ? "" : undefined}
                    >
                      {formDate ? formDate.toLocaleDateString() : "Select date"}
                      <CalendarIcon className="size-4 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formDate}
                      onSelect={handleSelectDate}
                      disabled={(d) =>
                        d < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Time</Label>
                <Select value={formTime} onValueChange={setFormTime}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {timeOptions.map((t) => (
                      <SelectItem
                        key={t}
                        value={t}
                        disabled={isFormDateToday && t < currentTimeStr}
                      >
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Attach</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAttachDialogOpen(true)}
                  className="mt-2 p-4.5 bg-gray-100"
                >
                  <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                  Attach Files
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={scheduleMutation.isPending}
              >
                {scheduleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                Schedule Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AttachmentDialog
        open={isAttachDialogOpen}
        onOpenChange={setIsAttachDialogOpen}
        onAttach={(files) => setFormAttachments((prev) => [...prev, ...files])}
      />
    </>
  );

  return (
    <div className="h-full flex flex-col">
      {navContainer && createPortal(navActions, navContainer)}

      {isPending ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : messages?.length === 0 ? (
        <div className="py-24 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No scheduled messages</p>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule messages to be sent at the perfect time
          </p>
          <Button className="mt-4" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Your First Message
          </Button>
        </div>
      ) : (
        <div className="rounded-lg bg-card overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1" ref={tableRef}>
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Mail className="h-3.5 w-3.5" />
                      Recipient
                    </div>
                  </th>
                  <th className="text-left px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <FileText className="h-3.5 w-3.5" />
                      Subject
                    </div>
                  </th>
                  <th className="text-left px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Clock className="h-3.5 w-3.5" />
                      Scheduled for
                    </div>
                  </th>
                  <th className="text-left px-4 py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Target className="h-3.5 w-3.5" />
                      Status
                    </div>
                  </th>
                  <th className="px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedMessages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      No messages match your filters
                    </td>
                  </tr>
                ) : (
                  paginatedMessages.map((message) => (
                    <tr
                      key={message.id}
                      className="transition-colors hover:bg-muted/50 group"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {(message.toName || message.toEmail)
                                .split(" ")
                                .slice(0, 2)
                                .map((w) => w[0]?.toUpperCase())
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {message.toName || message.toEmail}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {message.toEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block text-sm text-muted-foreground truncate max-w-[280px]">
                          {message.subject}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                          <Clock className="h-3 w-3 shrink-0" />
                          {new Date(message.scheduledAt).toLocaleString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div
                          className="flex items-center gap-2"
                          title={message.errorMessage ?? undefined}
                        >
                          {getStatusBadge(message.status)}
                          {message.errorMessage && (
                            <span className="text-red-500 text-xs truncate max-w-[160px]">
                              {message.errorMessage}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        {message.status === "pending" && message.id > 0 && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={
                                sendNowMutation.isPending &&
                                sendNowMutation.variables?.id === message.id
                              }
                              onClick={() => sendNowMutation.mutate(message)}
                            >
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Send Now
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              aria-label="Delete scheduled message"
                              onClick={() =>
                                deleteScheduledEmailMessage.mutate(message.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-border bg-muted/50">
            <div className="text-xs text-muted-foreground">
              Showing {filteredMessages.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + itemsPerPage, filteredMessages.length)} of{" "}
              {filteredMessages.length} messages
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="h-7 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <span className="px-2 py-1 text-xs text-muted-foreground">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, safePage + 1))
                }
                disabled={safePage === totalPages}
                className="h-7 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
