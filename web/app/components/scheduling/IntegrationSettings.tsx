import { ComponentType, SVGProps, useState } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { CheckCircle, ExternalLink, Settings } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>> | string;
  connected: boolean;
  syncStatus: "synced" | "syncing" | "error" | "not-connected";
  lastSync?: string;
  features: string[];
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync with your Google Calendar",
    icon: "/google-calendar.svg",
    connected: false,
    syncStatus: "synced",
    lastSync: "1 minute ago",
    features: [
      "Two-way calendar sync",
      "Conflict detection",
      "Automatic event creation",
      "Availability management",
    ],
  },
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

export function IntegrationSettings() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [autoRecording, setAutoRecording] = useState(true);
  const [autoTranscription, setAutoTranscription] = useState(true);

  const { data: integrations = INITIAL_INTEGRATIONS } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const [googleCheck] = await Promise.all([
        axios.post("/api/integrations/google", { action: "status" }),
      ]);

      const googleCalendarConnected = googleCheck.data.connected;

      return INITIAL_INTEGRATIONS.map((int) => {
        if (int.id === "google-calendar")
          return { ...int, connected: googleCalendarConnected };
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
      if (id === "google-calendar" && action === "disconnect") {
        await axios.post("/api/integrations/google", {
          action: "disconnect",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  const toggleConnection = (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    if (id === "google-calendar" && integration && !integration.connected) {
      router.push("/api/google");
      return;
    }

    if (id === "google-calendar" && integration && integration.connected) {
      mutation.mutate({ id: "google-calendar", action: "disconnect" });
      return;
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Cards */}
      <div className="grid grid-cols-1 gap-4">
        {integrations.map((integration) => {
          return (
            <Card key={integration.id}>
              <CardHeader>
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
                          const Icon = integration.icon as ComponentType<SVGProps<SVGSVGElement>>;
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
              </CardHeader>

              {integration.connected && (
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm text-gray-700 mb-2">Features</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {integration.features.map((feature, i) => (
                        <li
                          key={i}
                          className="flex items-start text-sm text-gray-600"
                        >
                          <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View in {integration.name}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Video Meeting Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Video Meeting Preferences</CardTitle>
          <CardDescription>
            Configure how virevos handles video meetings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-Record Meetings</Label>
              <p className="text-sm text-gray-600">
                Automatically start recording when meetings begin
              </p>
            </div>
            <Switch
              checked={autoRecording}
              onCheckedChange={setAutoRecording}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Auto-Generate Transcripts</Label>
              <p className="text-sm text-gray-600">
                Automatically transcribe meeting recordings
              </p>
            </div>
            <Switch
              checked={autoTranscription}
              onCheckedChange={setAutoTranscription}
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
        </CardContent>
      </Card>
    </div>
  );
}
