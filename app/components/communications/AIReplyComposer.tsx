import { useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Sparkles, RefreshCw, Send, Clock, Copy, X } from "lucide-react";
import { motion } from "motion/react";

interface AIReplyComposerProps {
  message: {
    from: string;
    client: string;
    preview: string;
  };
  onClose: () => void;
  onSend?: (html: string) => Promise<void>;
  onSchedule?: (draftText: string) => void;
}

const tonePresets = [
  {
    value: "professional",
    label: "Professional",
    description: "Formal and business-like",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm and approachable",
  },
  { value: "concise", label: "Concise", description: "Brief and to the point" },
  {
    value: "detailed",
    label: "Detailed",
    description: "Thorough and comprehensive",
  },
  {
    value: "empathetic",
    label: "Empathetic",
    description: "Understanding and supportive",
  },
];

export function AIReplyComposer({
  message,
  onClose,
  onSend,
  onSchedule,
}: AIReplyComposerProps) {
  const [tone, setTone] = useState("professional");
  const [draft, setDraft] = useState<string>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    try {
      const systemPrompt = `You are a helpful email assistant. The user is replying to an email from ${message.from} (${message.client}).
Original email preview: "${message.preview}"
Generate a ${tone} reply email. ${customInstructions ? `Additional instructions: ${customInstructions}` : ""}
Return only the email body text, no subject line.`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate a ${tone} reply to this email from ${message.from}: "${message.preview}"`,
            },
          ],
        }),
      });

      if (!res.ok || !res.body) throw new Error("AI request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            if (event.type === "text_delta" && event.delta) {
              fullText += event.delta;
              setDraft(fullText);
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }
    } catch (err) {
      console.error("AI generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToneChange = (newTone: string) => {
    setTone(newTone);
  };

  const handleSend = async () => {
    if (!onSend || !draft) return;
    setIsSending(true);
    try {
      const html = `<p>${draft.replace(/\n/g, "<br>")}</p>`;
      await onSend(html);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h4 className="text-sm text-foreground">AI Draft Reply</h4>
          <Badge className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">Beta</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Context Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-900 dark:text-blue-200 mb-2">
            <strong>Context:</strong> Replying to {message.from} from{" "}
            {message.client}
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-300 italic">
            &quot;{message.preview}&quot;
          </p>
        </CardContent>
      </Card>

      {/* Tone Selection */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Tone</label>
        <Select value={tone} onValueChange={handleToneChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tonePresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                <div>
                  <div className="font-medium text-left">{preset.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.description}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">
          Additional Instructions (Optional)
        </label>
        <Textarea
          placeholder="e.g., Include pricing information, mention the next meeting..."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerateDraft}
        disabled={isGenerating}
        className="w-full"
        variant="outline"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate New Draft
          </>
        )}
      </Button>

      {/* Draft Preview */}
      {draft && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">AI-Generated Draft</label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigator.clipboard.writeText(draft)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={12}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            You can edit the draft above before sending
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            disabled={!draft}
            onClick={() => draft && onSchedule?.(draft)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !draft || !onSend}
          >
            {isSending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Reply
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
