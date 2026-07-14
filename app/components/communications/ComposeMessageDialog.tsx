"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Mail, MessageSquare, Send, Loader2, Paperclip, X } from "lucide-react";
import axios from "axios";
import { sendOutlookEmail } from "@/lib/outlook/outlook_actions";
import { sendAgencyChatMessage } from "@/lib/portal_chat";

interface AttachmentFile {
  name: string;
  mimeType: string;
  data: string; // base64
  size: number;
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB total

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:<mime>;base64," prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}

interface PortalClient {
  id: number;
  name: string;
  email: string | null;
}

type TabType = "email" | "chat";

export function ComposeMessageDialog({
  open,
  onOpenChange,
  onSent,
}: ComposeMessageDialogProps) {
  const [tab, setTab] = useState<TabType>("email");
  const [isSending, setIsSending] = useState(false);

  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chatClientId, setChatClientId] = useState("");
  const [chatMessage, setChatMessage] = useState("");

  const { data: portalClients = [] } = useQuery<PortalClient[]>({
    queryKey: ["portalClients"],
    queryFn: async () => {
      const res = await axios.get<PortalClient[]>("/api/clients/portal");
      return res.data;
    },
    enabled: open,
  });

  const resetForm = () => {
    setEmailTo("");
    setEmailSubject("");
    setEmailBody("");
    setAttachments([]);
    setChatClientId("");
    setChatMessage("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
    const incoming = files.reduce((sum, f) => sum + f.size, 0);
    if (currentTotal + incoming > MAX_ATTACHMENT_BYTES) {
      e.target.value = "";
      return;
    }

    const newAttachments = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        data: await readFileAsBase64(file),
        size: file.size,
      }))
    );

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim() || !emailBody.trim()) return;
    setIsSending(true);
    try {
      await sendOutlookEmail({
        to: emailTo.trim(),
        subject: emailSubject.trim(),
        bodyHtml: `<p>${emailBody.replace(/\n/g, "<br>")}</p>`,
        ...(attachments.length > 0
          ? {
              attachments: attachments.map(({ name, mimeType, data }) => ({
                name,
                mimeType,
                data,
              })),
            }
          : {}),
      });
      resetForm();
      onOpenChange(false);
      onSent();
    } catch (err) {
      console.error("Failed to send email:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatClientId || !chatMessage.trim()) return;
    setIsSending(true);
    try {
      await sendAgencyChatMessage(Number(chatClientId), chatMessage.trim());
      resetForm();
      onOpenChange(false);
      onSent();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const isEmailValid = emailTo.trim().length > 0 && emailBody.trim().length > 0;
  const isChatValid = chatClientId.length > 0 && chatMessage.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold">
            New Message
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="px-6">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setTab("email")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                tab === "email"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              onClick={() => setTab("chat")}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                tab === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
          </div>
        </div>

        <Separator className="mt-4" />

        {/* Email form */}
        {tab === "email" && (
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                To
              </Label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="bg-muted/40 border-0 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Subject
              </Label>
              <Input
                placeholder="Add a subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="bg-muted/40 border-0 focus-visible:ring-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Message
              </Label>
              <Textarea
                placeholder="Write your message..."
                rows={6}
                className="resize-none bg-muted/40 border-0 focus-visible:ring-1"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground gap-1.5 px-0 hover:bg-transparent hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
                Attach files
              </Button>
              {attachments.length > 0 && (
                <ul className="space-y-1">
                  {attachments.map((att, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                    >
                      <span className="truncate flex-1">{att.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatBytes(att.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5 cursor-pointer" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Chat form */}
        {tab === "chat" && (
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Client
              </Label>
              <Select value={chatClientId} onValueChange={setChatClientId}>
                <SelectTrigger className="bg-muted/40 border-0 focus:ring-1">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {portalClients.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      No active clients with portal enabled
                    </div>
                  ) : (
                    portalClients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        <div className="flex flex-col items-start">
                          <span>{client.name}</span>
                          {client.email && (
                            <span className="text-xs text-muted-foreground">
                              {client.email}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Message
              </Label>
              <Textarea
                placeholder="Write your message..."
                rows={6}
                className="resize-none bg-muted/40 border-0 focus-visible:ring-1"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
            </div>
          </div>
        )}

        <Separator />

        <div className="px-6 py-4 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleClose(false)}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={tab === "email" ? handleSendEmail : handleSendChat}
            disabled={
              isSending || (tab === "email" ? !isEmailValid : !isChatValid)
            }
            className="gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
