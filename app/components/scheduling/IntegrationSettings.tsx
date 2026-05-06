import { useState } from "react";
import Image from "next/image";
import { CardContent, CardTitle, CardDescription } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { CheckCircle } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeRecordingStatus } from "@/lib/user";
import { disconnectGoogle, disconnectOutlook } from "@/lib/integrations";
import type { ComponentType, SVGProps } from "react";
import type { Integration } from "@/types/integrations";
import { Separator } from "@/app/components/ui/separator";

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: "outlook",
    name: "Microsoft Outlook",
    description: "Sync with Outlook Calendar",
    icon: "/outlook.svg",
    connected: false,
    syncStatus: "not-connected",
    features: [
      "Two-way calendar sync",
      "Teams meeting integration",
      "Email notifications",
      "Contact sync",
    ],
  },
];

export function VideoMeetingPreferences() {
  const queryClient = useQueryClient();
  const [autoTranscription] = useState(true);

  const { data: recordingStatus } = useQuery({
    queryKey: ["recordingStatus"],
    queryFn: async () => {
      const res = await axios.get("/api/recording_status");
      return res.data;
    },
  });

  const changeRecordingStatusMutation = useMutation({
    mutationFn: async () => {
      await changeRecordingStatus();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recordingStatus"] });
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg text-foreground">Video Meeting Preferences</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure how Virevos handles video meetings
        </p>
      </div>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Auto-Record Meetings</Label>
            <p className="text-sm text-muted-foreground">
              Automatically start recording when meetings begin
            </p>
          </div>
          <Switch
            checked={recordingStatus?.recording_status ?? false}
            onCheckedChange={() => changeRecordingStatusMutation.mutate()}
          />
        </div>

        {autoTranscription && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="text-sm text-purple-900 mb-2">
              After transcription, virevos will:
            </h4>
            <ul className="space-y-1 text-sm text-purple-800">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Generate meeting summary and key points</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Extract action items and assign them</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Create follow-up tasks automatically</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>Update project status based on discussion</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function IntegrationSettings() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: integrations = INITIAL_INTEGRATIONS } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const [googleCheck, outlookCheck] = await Promise.all([
        axios.get("/api/integrations/google"),
        axios.get("/api/integrations/outlook"),
      ]);

      const googleCalendarConnected = googleCheck.data.connected;
      const outlookConnected = outlookCheck.data.connected;

      return INITIAL_INTEGRATIONS.map((int) => {
        if (int.id === "google")
          return { ...int, connected: googleCalendarConnected };
        if (int.id === "outlook")
          return { ...int, connected: outlookConnected };
        return int;
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "disconnect" | "connect";
    }) => {
      if (id === "google" && action === "disconnect") {
        await disconnectGoogle();
      }
      if (id === "outlook" && action === "disconnect") {
        await disconnectOutlook();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  const toggleConnection = (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    if (id === "google" && integration && !integration.connected) {
      router.push("/api/google");
      return;
    }

    if (id === "google" && integration && integration.connected) {
      mutation.mutate({ id: "google", action: "disconnect" });
      return;
    }

    if (id === "outlook" && integration && !integration.connected) {
      router.push("/api/outlook");
      return;
    }

    if (id === "outlook" && integration && integration.connected) {
      mutation.mutate({ id: "outlook", action: "disconnect" });
      return;
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Cards */}
      <div className="grid grid-cols-1 gap-4">
        {integrations.map((integration, index) => {
          return (
            <div className="p-2" key={integration.id}>
              <div className="p-2">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      {typeof integration.icon === "string" ? (
                        <Image
                          src={integration.icon}
                          alt={integration.name}
                          width={24}
                          height={24}
                        />
                      ) : (
                        (() => {
                          const Icon = integration.icon as ComponentType<
                            SVGProps<SVGSVGElement>
                          >;
                          return <Icon className="h-6 w-6 text-blue-600" />;
                        })()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <CardTitle className="text-lg">
                          {integration.name}
                        </CardTitle>
                        {integration.connected ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Connected</Badge>
                        )}
                      </div>
                      <CardDescription>
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    className="cursor-pointer"
                    checked={integration.connected}
                    onCheckedChange={() => toggleConnection(integration.id)}
                  />
                </div>
              </div>

              {integration.connected && (
                <CardContent className="space-y-4">
                  <div className="mb-4">
                    <h4 className="text-sm text-foreground mb-2">Features</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {integration.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-start text-sm text-muted-foreground"
                        >
                          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              )}
              {index < integrations.length - 1 && <Separator />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
