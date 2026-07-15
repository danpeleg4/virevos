"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Loader2, Send } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Avatar, AvatarFallback } from "../ui/avatar";
import type { PortalChatMessage } from "@/types/portal";

interface PortalChatPaneProps {
  clientId: number;
  clientName: string;
  clientInitials: string;
}

export function PortalChatPane({
  clientId,
  clientName,
  clientInitials,
}: PortalChatPaneProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const queryKey = ["portal-chat-thread", clientId] as const;

  const { data, isLoading } = useQuery<{
    portalId: number;
    messages: PortalChatMessage[];
  }>({
    queryKey,
    queryFn: async () => {
      const res = await axios.get(`/api/portal-chat/${clientId}`);
      return res.data;
    },
    refetchInterval: 5000,
  });

  const messages = data?.messages ?? [];

  const send = useMutation({
    mutationFn: async (body: string) => {
      const res = await axios.post(`/api/portal-chat/${clientId}`, {
        message: body,
      });
      return res.data as PortalChatMessage;
    },
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{
        portalId: number;
        messages: PortalChatMessage[];
      }>(queryKey);
      const optimistic: PortalChatMessage = {
        id: -Date.now(),
        senderType: "agency",
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<{
        portalId: number;
        messages: PortalChatMessage[];
      }>(queryKey, (old) =>
        old
          ? { ...old, messages: [...old.messages, optimistic] }
          : { portalId: 0, messages: [optimistic] }
      );
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKey, ctx.previous);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        // Refresh the conversation list so unread/last-message updates
        queryClient.invalidateQueries({
          queryKey: ["portal-chat-conversations"],
        }),
      ]);
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // After the GET marks client messages as read on the server, refresh the
  // conversation list so the agency-side unread badge clears immediately.
  useEffect(() => {
    if (data) {
      void queryClient.invalidateQueries({
        queryKey: ["portal-chat-conversations"],
      });
    }
  }, [data, queryClient]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft("");
    send.mutate(trimmed);
  };

  return (
    <div className="flex flex-col" style={{ flex: "1 1 0%", minHeight: 0 }}>
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        data-testid="portal-chat-pane"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          messages.map((msg) => {
            const fromAgency = msg.senderType === "agency";
            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${
                  fromAgency ? "justify-end" : "justify-start"
                }`}
              >
                {!fromAgency && (
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                      {clientInitials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    fromAgency
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      fromAgency ? "text-blue-100" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground mb-2">
          Replying to {clientName}
        </p>
        <Textarea
          placeholder="Type your message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
            disabled={send.isPending || !draft.trim()}
          >
            {send.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
