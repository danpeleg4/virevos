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
}

const tonePresets = [
  { value: "professional", label: "Professional", description: "Formal and business-like" },
  { value: "friendly", label: "Friendly", description: "Warm and approachable" },
  { value: "concise", label: "Concise", description: "Brief and to the point" },
  { value: "detailed", label: "Detailed", description: "Thorough and comprehensive" },
  { value: "empathetic", label: "Empathetic", description: "Understanding and supportive" },
];

const mockDrafts: Record<string, string> = {
  professional: `Dear Sarah,

Thank you for reaching out regarding the Q4 project timeline. I appreciate your attention to this matter.

Based on our previous discussions and the current project scope, I propose the following timeline for the Q4 rollout:

• Phase 1 (Weeks 1-2): Requirements finalization and design approval
• Phase 2 (Weeks 3-6): Development and testing
• Phase 3 (Weeks 7-8): Deployment and monitoring

I'd be happy to schedule a call this week to discuss this in more detail and address any concerns you may have. Please let me know what time works best for you.

Best regards,
John`,

  friendly: `Hi Sarah!

Thanks for following up on the Q4 timeline - great timing! 😊

I've been working on a detailed schedule that I think will work perfectly for what we discussed. The rollout will happen in three main phases over the next 8 weeks, and I'm confident we can hit all our targets.

Would love to jump on a quick call this week to walk you through everything. How does your calendar look?

Looking forward to chatting!
John`,

  concise: `Hi Sarah,

Q4 rollout timeline: 8 weeks total, 3 phases.

Phase 1: Requirements & Design (2 weeks)
Phase 2: Development & Testing (4 weeks)  
Phase 3: Deployment (2 weeks)

Available this week for a call to discuss details.

Best,
John`,

  detailed: `Dear Sarah,

Thank you for your inquiry about the Q4 project timeline. I've prepared a comprehensive breakdown to ensure we're aligned on all aspects of the rollout.

PROJECT OVERVIEW:
The Q4 rollout encompasses the implementation of the new automation features we discussed, along with the integration updates required by your team.

DETAILED TIMELINE:

Phase 1: Requirements Finalization & Design (Weeks 1-2)
- Review and finalize all technical requirements
- Complete UX/UI design mockups
- Obtain stakeholder approval
- Deliverable: Approved design documentation

Phase 2: Development & Quality Assurance (Weeks 3-6)
- Core feature development
- Integration implementation
- Comprehensive testing (unit, integration, UAT)
- Deliverable: Fully tested application ready for deployment

Phase 3: Deployment & Stabilization (Weeks 7-8)
- Staged production deployment
- Performance monitoring
- User training and documentation
- Post-launch support

DEPENDENCIES & RISKS:
- Requires timely feedback on design mockups (Week 2)
- Third-party API availability may impact integration timeline
- Resource allocation confirmed with the development team

I recommend scheduling a detailed planning session this week to review this timeline and address any questions or adjustments needed. I have availability Tuesday afternoon or Thursday morning.

Please let me know your preferred time, and I'll send over a calendar invitation.

Best regards,
John Doe
Project Manager, Virevos`,

  empathetic: `Hi Sarah,

I completely understand your concern about the Q4 timeline - I know how important this rollout is for your team, and I want to make sure we get it right.

I've been carefully working through the schedule to balance speed with quality, because I know you need this delivered on time but also need it to work flawlessly for your users.

Here's what I'm proposing: we break this into three manageable phases over 8 weeks. This gives us enough time to build it right, test thoroughly, and make sure your team feels confident with the new features.

I'd really love to walk you through this together and hear your thoughts. I want to make sure this timeline works for your team's needs and that we're on the same page about priorities.

Can we find some time this week to chat? I'm flexible and happy to work around your schedule.

Thanks for your patience and partnership on this!

Best,
John`,
};

export function AIReplyComposer({ message, onClose }: AIReplyComposerProps) {
  const [tone, setTone] = useState("professional");
  const [draft, setDraft] = useState(mockDrafts.professional);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  const handleGenerateDraft = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setDraft(mockDrafts[tone as keyof typeof mockDrafts] || mockDrafts.professional);
      setIsGenerating(false);
    }, 1500);
  };

  const handleToneChange = (newTone: string) => {
    setTone(newTone);
    setDraft(mockDrafts[newTone as keyof typeof mockDrafts] || mockDrafts.professional);
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
          <h4 className="text-sm text-gray-900">AI Draft Reply</h4>
          <Badge className="bg-purple-100 text-purple-700">Beta</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Context Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <p className="text-sm text-blue-900 mb-2">
            <strong>Context:</strong> Replying to {message.from} from {message.client}
          </p>
          <p className="text-xs text-blue-800 italic">
            "{message.preview}"
          </p>
        </CardContent>
      </Card>

      {/* Tone Selection */}
      <div className="space-y-2">
        <label className="text-sm text-gray-700">Tone</label>
        <Select value={tone} onValueChange={handleToneChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tonePresets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                <div>
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-xs text-gray-500">{preset.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-2">
        <label className="text-sm text-gray-700">
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
            <label className="text-sm text-gray-700">AI-Generated Draft</label>
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
          <p className="text-xs text-gray-500">
            You can edit the draft above before sending
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Clock className="h-4 w-4 mr-2" />
            Schedule
          </Button>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Send Reply
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
