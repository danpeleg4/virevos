"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ScreenShare,
  ScreenShareOff,
  Calendar,
  Clock,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import {
  createLocalTracks,
  Room,
  Participant,
  RemoteTrack,
  RoomEvent,
  ParticipantEvent,
  ParticipantKind,
  Track,
  TrackPublication,
  LocalTrackPublication,
} from "livekit-client";
import axios from "axios";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDateOnly, formatTimeOnly } from "@/lib/util/date_utils";

export default function InMeetingView() {
  const params = useParams();
  const meetingId = params.roomId as string;
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const router = useRouter();
  const roomRef = useRef<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [meetingTitle, setMeetingTitle] = useState("");

  const meetingInfo = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const res = await axios.get(`/api/events/${meetingId}`);
      return res.data;
    },
  });

  const startMeetingMutation = useMutation({
    mutationFn: async () => {
      await axios.patch(`/api/events/${meetingId}`, { type: "start" });
    },
    onSuccess: () => setHasStarted(true),
  });

  const joinRoom = async () => {
    const res = await axios.post(`/api/token`, {
      meetingId,
      name: name,
    });
    const { token, meetingTitle, url } = res.data;
    setMeetingTitle(meetingTitle);
    const room = new Room();
    roomRef.current = room;
    await room.connect(url, token);

    // Publish local tracks
    const localTracks = await createLocalTracks({ audio: true, video: true });
    for (const track of localTracks) {
      await room.localParticipant.publishTrack(track);
    }

    const isHuman = (p: Participant) => p.kind !== ParticipantKind.AGENT;

    setParticipants([
      room.localParticipant,
      ...Array.from(room.remoteParticipants.values()).filter(isHuman),
    ]);

    room.on(RoomEvent.ParticipantConnected, (p) => {
      if (!isHuman(p)) return;
      setParticipants((prev) => [...prev, p]);
    });

    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      if (!isHuman(p)) return;
      setParticipants((prev) => prev.filter((x) => x.sid !== p.sid));
    });

    // TrackSubscribed fires when a remote participant adds a track
    room.on(RoomEvent.TrackSubscribed, () => {
      setParticipants((prev) => [...prev]);
    });

    // LocalTrackPublished fires when the local participant publishes a track (e.g. screen share)
    room.on(RoomEvent.LocalTrackPublished, () => {
      setParticipants((prev) => [...prev]);
    });

    // LocalTrackUnpublished fires when the local participant stops a track
    room.on(RoomEvent.LocalTrackUnpublished, () => {
      setParticipants((prev) => [...prev]);
    });

    // Enable local camera/mic
    await room.localParticipant.setCameraEnabled(true);
    await room.localParticipant.setMicrophoneEnabled(true);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => {
      room.localParticipant.publishTrack(track);
    });

    setJoined(true);
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

  const toggleScreenShare = async () => {
    if (!roomRef.current) return;
    const next = !isScreenSharing;
    await roomRef.current.localParticipant.setScreenShareEnabled(next);
    setIsScreenSharing(next);
  };

  const meeting = meetingInfo.data?.meeting;
  const isHost = !!meetingInfo.data?.isHost;
  const isUpcoming = !hasStarted && meeting?.status === "upcoming";

  const checkHost = () => {
    if (isHost) {
      router.push("/workspace/dashboard");
    } else {
      router.push("/");
    }
  };

  if (meetingInfo.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400 animate-pulse" />
      </div>
    );
  }

  if (isUpcoming) {
    const scheduledDate = new Date(meeting!.dateTime);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <Calendar className="w-6 h-6 text-gray-500" />
            </div>
            <h1 className="text-gray-900 text-xl font-semibold mb-1">
              {meeting!.title
                ? decodeURIComponent(meeting!.title)
                : "Upcoming Meeting"}
            </h1>
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-6">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Scheduled for {formatDateOnly(scheduledDate)} at{" "}
                {formatTimeOnly(scheduledDate)}
              </span>
            </div>
            {isHost ? (
              <button
                className="w-full h-9 px-4 rounded-md bg-indigo-600 text-white text-sm font-medium transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                onClick={() => startMeetingMutation.mutate()}
                disabled={startMeetingMutation.isPending}
              >
                {startMeetingMutation.isPending
                  ? "Starting…"
                  : "Start Meeting Now"}
              </button>
            ) : (
              <p className="text-gray-500 text-sm">
                Waiting for the host to start the meeting.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-gray-900 text-xl font-semibold leading-tight">
                Ready to join?
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Enter your name to join the meeting
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Your name
                </label>
                <input
                  className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-base text-gray-900 placeholder:text-gray-400 transition-colors outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  placeholder="e.g. Jane Smith"
                  value={name}
                  maxLength={200}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && name && joinRoom()}
                  autoFocus
                />
              </div>

              <button
                className="w-full h-9 px-4 rounded-md bg-indigo-600 text-white text-sm font-medium transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                onClick={joinRoom}
                disabled={!name.trim()}
              >
                Join Meeting
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      {/* Meeting Name */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
          <p className="text-sm">Meeting {meetingTitle}</p>
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
      <div className="p-6 fixed bottom-0 left-0 right-0 flex justify-center z-30">
        <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center space-x-3">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {isMuted ? (
              <MicOff className="h-5 w-5 text-white" />
            ) : (
              <Mic className="h-5 w-5 text-white" />
            )}
          </button>

          <button
            onClick={toggleCamera}
            className={`p-4 rounded-full transition-colors ${
              isCameraOff
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {isCameraOff ? (
              <VideoOff className="h-5 w-5 text-white" />
            ) : (
              <Video className="h-5 w-5 text-white" />
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-colors ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {isScreenSharing ? (
              <ScreenShareOff className="h-5 w-5 text-white" />
            ) : (
              <ScreenShare className="h-5 w-5 text-white" />
            )}
          </button>

          <button
            onClick={() => setShowLeaveConfirm(true)}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors ml-3"
          >
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Leave Confirmation */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Leave Meeting?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this meeting?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowLeaveConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                roomRef.current?.disconnect();
                checkHost();
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
  const videoRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLDivElement>(null);

  // Attach video & audio tracks
  useEffect(() => {
    if (!videoRef.current || !audioRef.current) return;

    // Capture the current ref nodes so cleanup uses the same elements that
    // were mounted when the effect ran (refs may change before cleanup).
    const video = videoRef.current;
    const audio = audioRef.current;

    const attachTrack = (track: RemoteTrack | Track) => {
      if (track.kind === "audio" && participant.isLocal) {
        return;
      }
      const el = track.attach();
      if (!el) return;
      if (track.kind === "video") {
        el.style.position = "absolute";
        el.style.inset = "0";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.objectFit =
          track.source === Track.Source.ScreenShare ? "contain" : "cover";
        el.style.zIndex = track.source === Track.Source.ScreenShare ? "1" : "0";
        videoRef.current?.appendChild(el);
      } else if (track.kind === "audio") {
        el.autoplay = true;
        audioRef.current?.appendChild(el);
      }
    };

    // Attach existing tracks — use pub.track directly since isSubscribed is false for local publications
    participant.videoTrackPublications
      .values()
      .forEach((pub: TrackPublication) => {
        if (pub.track) attachTrack(pub.track);
      });

    participant.audioTrackPublications
      .values()
      .forEach((pub: TrackPublication) => {
        if (pub.track) attachTrack(pub.track);
      });

    const handleTrackSubscribed = (track: RemoteTrack) => attachTrack(track);
    participant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);

    const handleLocalTrackPublished = (pub: LocalTrackPublication) => {
      if (pub.track) attachTrack(pub.track);
    };
    participant.on(
      ParticipantEvent.LocalTrackPublished,
      handleLocalTrackPublished
    );

    const handleLocalTrackUnpublished = (pub: LocalTrackPublication) => {
      if (pub.track && videoRef.current) {
        pub.track.detach().forEach((el) => el.remove());
      }
    };
    participant.on(
      ParticipantEvent.LocalTrackUnpublished,
      handleLocalTrackUnpublished
    );

    // Cleanup
    return () => {
      participant.removeListener(
        ParticipantEvent.TrackSubscribed,
        handleTrackSubscribed
      );
      participant.removeListener(
        ParticipantEvent.LocalTrackPublished,
        handleLocalTrackPublished
      );
      participant.removeListener(
        ParticipantEvent.LocalTrackUnpublished,
        handleLocalTrackUnpublished
      );
      video.innerHTML = "";
      audio.innerHTML = "";
    };
  }, [participant]);

  const hasVideo = Array.from(participant.videoTrackPublications.values()).some(
    (pub) => pub.track != null
  );

  return (
    <>
      <div className="absolute inset-0 overflow-hidden">
        {/* Imperatively-managed video tracks — React renders no children here */}
        <div ref={videoRef} className="absolute inset-0" />
        {!hasVideo && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl text-gray-300">
                  {participant.identity[0].toUpperCase()}
                </span>
              </div>
              <p className="text-white">{participant.identity}</p>
            </div>
          </div>
        )}
        <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm flex items-center space-x-2">
          <span>{participant.identity}</span>
          {!participant.isMicrophoneEnabled && (
            <MicOff className="h-3 w-3 text-red-400" />
          )}
        </div>
      </div>
      {/* Hidden audio container */}
      <div ref={audioRef} className="hidden" />
    </>
  );
}
