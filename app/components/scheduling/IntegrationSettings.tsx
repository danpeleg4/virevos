import {ComponentType, SVGProps, useEffect, useState} from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import {
    Video,
    Calendar,
    CheckCircle,
    RefreshCw,
    ExternalLink,
    Settings,
} from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface Integration {
    id: string;
    name: string;
    description: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    connected: boolean;
    syncStatus: "synced" | "syncing" | "error" | "not-connected";
    lastSync?: string;
    features: string[];
}

export function IntegrationSettings() {
    const [autoRecording, setAutoRecording] = useState(true);
    const [autoTranscription, setAutoTranscription] = useState(true);
    const [twoWaySync, setTwoWaySync] = useState(true);
    const [syncConflicts, setSyncConflicts] = useState(true);
    const [integrations, setIntegrations] = useState<Integration[]>([
        {
            id: "zoom",
            name: "Zoom",
            description: "Video conferencing and meeting recordings",
            icon: Video,
            connected: false,
            syncStatus: "synced",
            lastSync: "2 minutes ago",
            features: [
                "Auto-create Zoom links for meetings",
                "Record meetings automatically",
                "Generate transcripts",
                "Import meeting attendees",
            ],
        },
        {
            id: "google-meet",
            name: "Google Meet",
            description: "Google's video conferencing platform",
            icon: Video,
            connected: false,
            syncStatus: "synced",
            lastSync: "5 minutes ago",
            features: [
                "Auto-create Meet links",
                "Access meeting recordings",
                "Live transcription",
                "Calendar integration",
            ],
        },
        {
            id: "google-calendar",
            name: "Google Calendar",
            description: "Sync with your Google Calendar",
            icon: Calendar,
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
            icon: Calendar,
            connected: false,
            syncStatus: "not-connected",
            features: [
                "Two-way calendar sync",
                "Teams meeting integration",
                "Email notifications",
                "Contact sync",
            ],
        },
    ]);

    const router = useRouter();

    async function caller() {
        await axios.post("/api/integrations/zoom/connection");
    }

    const toggleConnection = (id: string) => {
        setIntegrations((prevIntegrations) => {
            const integration = prevIntegrations.find((i) => i.id === id);

            // If Zoom is toggled ON → redirect BEFORE updating state
            if (id === "zoom" && integration && !integration.connected) {
                const clientId = process.env.NEXT_PUBLIC_ZOOM_CLIENT_ID!;
                const redirectUri = process.env.NEXT_PUBLIC_ZOOM_REDIRECT_URI!;
                const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
                    redirectUri
                )}`;
                const zoomAuthUrlProd = `https://zoom.us/oauth/authorize?response_type=code&client_id=DB1IU7XpQAyataDgLryAQg&redirect_uri=https://www.virevos.com/api/integrations/zoom`

                router.push(zoomAuthUrl);
                /*window.location.href = process.env.NODE_ENV === "development"
                    ? zoomAuthUrl
                    : zoomAuthUrlProd;*/
                return prevIntegrations; // leave UI unchanged, redirect will occur
            }

            if (id === "zoom" && integration && integration.connected) {
                caller()

                return prevIntegrations.map(int =>
                    int.id === "zoom"
                        ? { ...int, connected: false, syncStatus: "not-connected" }
                        : int
                );
            }

            // Default toggle behavior for other integrations
            return prevIntegrations.map((int) =>
                int.id === id
                    ? {
                        ...int,
                        connected: !int.connected,
                        syncStatus: !int.connected ? "syncing" : "not-connected",
                    }
                    : int
            );
        });
    };

    useEffect(() => {
        async function loadConnections() {
            const check = await axios.get("/api/integrations/zoom/connection");
            const { zoom, googleMeetsConnected } = check.data;

            setIntegrations(prev =>
                prev.map(int => {
                    if (int.id === "zoom") return { ...int, connected: zoom };
                    if (int.id === "google-meet") return { ...int, connected: googleMeetsConnected };
                    return int;
                })
            );
        }

        loadConnections();
    }, []);

    return (
        <div className="space-y-6">
            {/* Integration Cards */}
            <div className="grid grid-cols-1 gap-4">
                {integrations.map((integration) => {
                    const Icon = integration.icon;
                    return (
                        <Card key={integration.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4">
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                            <Icon className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2 mb-1">
                                                <CardTitle className="text-lg">{integration.name}</CardTitle>
                                                {integration.connected ?
                                                    (
                                                        <Badge className="bg-green-100 text-green-700">
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Connected
                                                        </Badge>
                                                    ) : (<Badge variant="outline">Not Connected</Badge>)}
                                            </div>
                                            <CardDescription>{integration.description}</CardDescription>
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
                                                <li key={i} className="flex items-start text-sm text-gray-600">
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
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Sync Now
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
                        <Switch checked={autoRecording} onCheckedChange={setAutoRecording} />
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

            {/* Calendar Sync Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Calendar Sync Preferences</CardTitle>
                    <CardDescription>
                        Manage how virevos syncs with your calendars
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label>Two-Way Sync</Label>
                            <p className="text-sm text-gray-600">
                                Changes in virevos update your calendar and vice versa
                            </p>
                        </div>
                        <Switch checked={twoWaySync} onCheckedChange={setTwoWaySync} />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label>Sync Conflict Detection</Label>
                            <p className="text-sm text-gray-600">
                                Monitor external calendars for conflicts
                            </p>
                        </div>
                        <Switch checked={syncConflicts} onCheckedChange={setSyncConflicts} />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="text-sm text-blue-900 mb-2">Sync Behavior:</h4>
                        <ul className="space-y-1 text-sm text-blue-800">
                            <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                <span>New meetings in virevos appear on your calendar</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                <span>Calendar events are imported to virevos</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                <span>Cancellations sync automatically</span>
                            </li>
                            <li className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                                <span>Availability is updated in real-time</span>
                            </li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}