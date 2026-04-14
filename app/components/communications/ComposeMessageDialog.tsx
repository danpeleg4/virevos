"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
import { Mail, MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

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
    setChatClientId("");
    setChatMessage("");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim() || !emailBody.trim()) return;
    setIsSending(true);
    try {
      await axios.post("/api/outlook/send", {
        to: emailTo.trim(),
        subject: emailSubject.trim(),
        bodyHtml: `<p>${emailBody.replace(/\n/g, "<br>")}</p>`,
      });
      toast.success("Email sent successfully");
      resetForm();
      onOpenChange(false);
      onSent();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatClientId || !chatMessage.trim()) return;
    setIsSending(true);
    try {
      await axios.post("/api/chat/send", {
        clientId: Number(chatClientId),
        message: chatMessage.trim(),
      });
      toast.success("Message sent successfully");
      resetForm();
      onOpenChange(false);
      onSent();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || "Failed to send message");
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
            disabled={isSending || (tab === "email" ? !isEmailValid : !isChatValid)}
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
