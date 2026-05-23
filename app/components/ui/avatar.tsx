"use client";

import * as React from "react";

import { cn } from "./utils";
import Image, { type ImageProps } from "next/image";

type ImageStatus = "idle" | "loading" | "loaded" | "error";

const AvatarContext = React.createContext<{
  status: ImageStatus;
  setStatus: (s: ImageStatus) => void;
}>({
  status: "idle",
  setStatus: () => {},
});

function Avatar({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  const [status, setStatus] = React.useState<ImageStatus>("idle");
  return (
    <AvatarContext.Provider value={{ status, setStatus }}>
      <span
        data-slot="avatar"
        className={cn(
          "relative flex size-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
}

interface AvatarImageProps extends Omit<ImageProps, "src" | "alt"> {
  src?: string;
  alt?: string;
  onLoadingStatusChange?: (status: ImageStatus) => void;
}

function AvatarImage({
  className,
  src,
  alt = "avatar",
  onLoad,
  onError,
  onLoadingStatusChange,
  ...props
}: AvatarImageProps) {
  const { status, setStatus } = React.useContext(AvatarContext);
  const srcString = typeof src === "string" ? src : undefined;

  React.useEffect(() => {
    if (!srcString) {
      setStatus("error");
      onLoadingStatusChange?.("error");
      return;
    }
    setStatus("loading");
    onLoadingStatusChange?.("loading");
    const img = new window.Image();
    let cancelled = false;
    img.onload = () => {
      if (!cancelled) {
        setStatus("loaded");
        onLoadingStatusChange?.("loaded");
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setStatus("error");
        onLoadingStatusChange?.("error");
      }
    };
    img.src = srcString;
    return () => {
      cancelled = true;
    };
  }, [srcString, setStatus, onLoadingStatusChange]);

  if (status !== "loaded" || !srcString) return null;

  return (
    <Image
      alt={alt}
      data-slot="avatar-image"
      src={srcString}
      fill
      sizes="40px"
      onLoad={onLoad}
      onError={onError}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

interface AvatarFallbackProps extends React.HTMLAttributes<HTMLSpanElement> {
  delayMs?: number;
}

function AvatarFallback({ className, delayMs, ...props }: AvatarFallbackProps) {
  const { status } = React.useContext(AvatarContext);
  const [canRender, setCanRender] = React.useState(delayMs === undefined);

  React.useEffect(() => {
    if (delayMs === undefined) return;
    const t = setTimeout(() => setCanRender(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (status === "loaded" || !canRender) return null;

  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
