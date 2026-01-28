"use client"

import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { Video, Users, Check, VideoOff, Mic, MicOff } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
    createLocalTracks,
    Room,
    Participant,
    RemoteTrackPublication,
    RemoteTrack,
    RoomEvent, Track
} from "livekit-client";
import axios from "axios";

export default function InMeetingView() {
    const params = useParams();
    const meetingId = params.roomId as string;
    const [name, setName] = useState("");
    const [joined, setJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [copied, setCopied] = useState(false);
    const router = useRouter();
    const roomRef = useRef<Room | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);

    const joinRoom = async () => {
        const res = await axios.post(`/api/token`, {
            meetingId,
            name: name
        });
        const { token, url } = res.data;
        const room = new Room();
        roomRef.current = room;
        await room.connect(url, token);

        // Publish local tracks
        const localTracks = await createLocalTracks({ audio: true, video: true });
        for (const track of localTracks) {
            await room.localParticipant.publishTrack(track);
        }

        setParticipants([
            room.localParticipant,
            ...Array.from(room.remoteParticipants.values()),
        ]);

        room.on(RoomEvent.ParticipantConnected, (p) => {
            setParticipants((prev) => [...prev, p]);
        });

        room.on(RoomEvent.ParticipantDisconnected, (p) => {
            setParticipants((prev) => prev.filter(x => x.sid !== p.sid));
        });

        // TrackSubscribed fires when a participant adds a track
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, pub: RemoteTrackPublication, participant: Participant) => {
            // Force re-render to attach the new track
            setParticipants((prev) => [...prev]);
        });

        // Enable local camera/mic
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);

        setJoined(true);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleMute = async () => {
        if (!roomRef.current) return;
        const next = !isMuted;
        await roomRef.current.localParticipant.setMicrophoneEnabled(!next);
        setIsMuted(next);
    };

    const toggleCamera = async () => {
        if (!roomRef.current) return;
        const next = !isCameraOff;
        await roomRef.current.localParticipant.setCameraEnabled(!next);
        setIsCameraOff(next);
    };

    if (!joined) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
                <h1 className="text-2xl mb-4">Enter your name to join</h1>
                <input
                    className="p-2 rounded text-black mb-4"
                    placeholder="Your name"
                    value={name}
                    onChange={
                    (e) => {
                        setName(e.target.value)
                    }
                }
                />
                <button
                    className="px-4 py-2 bg-blue-600 rounded cursor-pointer"
                    onClick={joinRoom}
                    disabled={!name}
                >
                    Join
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
            {/* Meeting Name */}
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                    <p className="text-sm">Meeting: {meetingId}</p>
                </div>
            </div>

            {/* Video Grid */}
            <div className="absolute inset-0 flex">
                {participants.map((participant) => (
                    <div key={participant.sid} className="relative flex-1">
                        <ParticipantVideo participant={participant} />
                    </div>
                ))}
            </div>

            {/* Control Bar */}
            <div className="p-6 fixed bottom-0 left-0 right-0 flex justify-center">
                <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center space-x-3">
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-colors ${
                            isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                    >
                        {isMuted ? <MicOff className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5 text-white" />}
                    </button>

                    <button
                        onClick={toggleCamera}
                        className={`p-4 rounded-full transition-colors ${
                            isCameraOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
                        }`}
                    >
                        {isCameraOff ? <VideoOff className="h-5 w-5 text-white" /> : <Video className="h-5 w-5 text-white" />}
                    </button>

                    <button
                        onClick={handleCopyLink}
                        className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                    >
                        {copied ? <Check className="h-5 w-5 text-green-400" /> : <Users className="h-5 w-5 text-white" />}
                    </button>

                    <button
                        onClick={() => setShowLeaveConfirm(true)}
                        className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors ml-3"
                    >
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Leave Confirmation */}
            <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Leave Meeting?</DialogTitle>
                        <DialogDescription>Are you sure you want to leave this meeting?</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-3 mt-4">
                        <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                roomRef.current?.disconnect();
                                router.push('/')
                            }}
                        >
                            Leave Meeting
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Component to render a participant's video
function ParticipantVideo({ participant }: { participant: Participant }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLDivElement>(null);

    // Attach video & audio tracks
    useEffect(() => {
        if (!containerRef.current || !audioRef.current) return;

        const attachTrack = (track: RemoteTrack | Track) => {
            if (track.kind === "audio" && participant.isLocal) {
                return;
            }
            const el = track.attach();
            if (!el) return;
            if (track.kind === "video") {
                el.style.width = "100%";
                el.style.height = "100%";
                el.style.objectFit = "cover";
                containerRef.current?.appendChild(el);
            } else if (track.kind === "audio") {
                el.autoplay = true;
                audioRef.current?.appendChild(el);
            }
        };

        // Attach existing tracks
        participant.videoTrackPublications.values().forEach((pub) => {
            if (pub.isSubscribed && pub.track) attachTrack(pub.track);
        });

        participant.audioTrackPublications.values().forEach((pub) => {
            if (pub.isSubscribed && pub.track) attachTrack(pub.track);
        });

        const handleTrackSubscribed = (track: RemoteTrack) => attachTrack(track);
        participant.on("trackSubscribed", handleTrackSubscribed);

        // Cleanup
        return () => {
            participant.removeListener("trackSubscribed", handleTrackSubscribed);
            if (containerRef.current) containerRef.current.innerHTML = "";
            if (audioRef.current) audioRef.current.innerHTML = "";
        };
    }, [participant]);


    const hasVideo = Array.from(participant.videoTrackPublications.values()).some((pub) => pub.isSubscribed);

    return (
        <>
            <div className="absolute inset-0" ref={containerRef}>
                {!hasVideo && (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl text-gray-300">{participant.identity[0].toUpperCase()}</span>
                            </div>
                            <p className="text-white">{participant.identity}</p>
                        </div>
                    </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm flex items-center space-x-2">
                    <span>{participant.identity}</span>
                    {!participant.isMicrophoneEnabled && <MicOff className="h-3 w-3 text-red-400" />}
                </div>
            </div>
            {/* Hidden audio container */}
            <div ref={audioRef} className="hidden" />
        </>
    );
}
