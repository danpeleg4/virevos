"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Mail, MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}

export function ComposeMessageDialog({
  open,
  onOpenChange,
  onSent,
}: ComposeMessageDialogProps) {
  const [tab, setTab] = useState<"email" | "chat">("email");
  const [isSending, setIsSending] = useState(false);

  // Email fields
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Chat fields
  const [chatTo, setChatTo] = useState("");
  const [chatMessage, setChatMessage] = useState("");

  const resetForm = () => {
    setEmailTo("");
    setEmailSubject("");
    setEmailBody("");
    setChatTo("");
    setChatMessage("");
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const handleSendEmail = async () => {
    if (!emailTo.trim() || !emailBody.trim()) return;
    setIsSending(true);
    try {
      await axios.post("/api/outlook/send", {
        to: emailTo.trim(),
        subject: emailSubject.trim(),
        bodyHtml: `<p>${emailBody.replace(/\n/g, "<br>")}</p>`,
        bodyText: emailBody,
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
    if (!chatTo.trim() || !chatMessage.trim()) return;
    setIsSending(true);
    try {
      await axios.post("/api/chat/send", {
        to: chatTo.trim(),
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
          <DialogDescription>Compose and send a message to your client.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "email" | "chat")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="email" className="cursor-pointer">
              <Mail className="h-4 w-4 mr-2" />
              Email
            </TabsTrigger>
            <TabsTrigger value="chat" className="cursor-pointer">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="recipient@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="Subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                placeholder="Write your message..."
                rows={6}
                className="resize-none"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSending || !emailTo.trim() || !emailBody.trim()}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label htmlFor="chat-to">To</Label>
              <Input
                id="chat-to"
                placeholder="Name or email"
                value={chatTo}
                onChange={(e) => setChatTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="chat-message">Message</Label>
              <Textarea
                id="chat-message"
                placeholder="Write your message..."
                rows={6}
                className="resize-none"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendChat}
                disabled={isSending || !chatTo.trim() || !chatMessage.trim()}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
