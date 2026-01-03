"use client";
import { useEffect, useState } from "react";

export default function ChatStream() {
    const [text, setText] = useState("");

    useEffect(() => {
        const evtSource = new EventSource("/api/stream");

        evtSource.onmessage = (event) => {
            setText((prev) => prev + event.data);
        };

        evtSource.onerror = () => {
            evtSource.close();
        };

        return () => evtSource.close();
    }, []);

    return <div className="p-4 border">{text}</div>;
}
