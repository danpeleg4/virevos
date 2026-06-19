import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/app/components/ui/avatar";
import type { PortalData, PortalChatMessage } from "@/types/portal";
import { getInitials } from "../_lib/format";

interface MessagesTabProps {
  data: PortalData;
  messages: PortalChatMessage[];
  isSending: boolean;
  onSend: (body: string) => void;
}

export function MessagesTab({
  data,
  messages,
  isSending,
  onSend,
}: MessagesTabProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the thread to the latest message (a DOM side effect, not data fetching)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    setNewMessage("");
    onSend(trimmed);
  };

  return (
    <div className="mt-6">
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
          <MessageSquare className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-foreground">Messages</span>
        </div>
        <div
          className="flex flex-col"
          style={{ height: "min(70vh, 600px)" }}
          data-testid="portal-chat-thread"
        >
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground">
                  Start the conversation below
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const fromClient = msg.senderType === "client";
                const senderLabel = fromClient
                  ? data.client.name
                  : data.settings?.title || "Agency";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${
                      fromClient ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!fromClient && (
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarFallback className="text-xs bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                          {senderLabel.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                        fromClient
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.body}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          fromClient ? "text-blue-100" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {fromClient && (
                      <Avatar className="h-7 w-7 mt-0.5">
                        <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                          {getInitials(data.client.name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {(data.settings?.chatEnabled ?? true) && (
            <div className="border-t border-border p-4">
              <Textarea
                placeholder="Write a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                className="resize-none"
              />
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={isSending || !newMessage.trim()}
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
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
