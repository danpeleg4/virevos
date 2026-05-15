"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "./utils";
import {
  useControllableState,
  useFloating,
  useEscape,
  useStableId,
} from "./_internal";
import { Slot } from "./_slot";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("Popover components must be used within <Popover>");
  return ctx;
}

interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

function Popover({ open, defaultOpen, onOpenChange, children }: PopoverProps) {
  const [state, setState] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentId = useStableId("popover-content");

  return (
    <PopoverContext.Provider
      value={{
        open: !!state,
        setOpen: (v) => setState(v),
        triggerRef,
        contentId,
      }}
    >
      {children}
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  function PopoverTrigger({ asChild, onClick, ...props }, ref) {
    const { open, setOpen, triggerRef, contentId } = usePopover();
    const setRefs = (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current =
          node;
    };
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) setOpen(!open);
    };
    const Comp: React.ElementType = asChild ? Slot : "button";
    return (
      <Comp
        ref={setRefs}
        type={asChild ? undefined : "button"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={contentId}
        data-state={open ? "open" : "closed"}
        data-slot="popover-trigger"
        onClick={handleClick}
        {...props}
      />
    );
  }
);

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: Align;
  side?: Side;
  sideOffset?: number;
  alignOffset?: number;
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  function PopoverContent(
    {
      className,
      align = "center",
      side = "bottom",
      sideOffset = 4,
      alignOffset = 0,
      onEscapeKeyDown,
      ...props
    },
    ref
  ) {
    const { open, setOpen, triggerRef, contentId } = usePopover();
    const [floatingNode, setFloatingNode] =
      React.useState<HTMLDivElement | null>(null);
    const { position } = useFloating({
      open,
      triggerRef,
      floatingNode,
      side,
      align,
      sideOffset,
      alignOffset,
    });
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        setFloatingNode(node);
        if (typeof ref === "function") ref(node);
        else if (ref)
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref]
    );

    useEscape(open, () => {
      const fakeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      onEscapeKeyDown?.(fakeEvent);
      if (!fakeEvent.defaultPrevented) {
        setOpen(false);
        triggerRef.current?.focus?.();
      }
    });

    React.useEffect(() => {
      if (!open) return;
      const handler = (e: PointerEvent) => {
        const target = e.target as Node;
        if (floatingNode?.contains(target)) return;
        if (triggerRef.current?.contains(target)) return;
        setOpen(false);
      };
      document.addEventListener("pointerdown", handler);
      return () => document.removeEventListener("pointerdown", handler);
    }, [open, floatingNode, triggerRef, setOpen]);

    if (!open || typeof document === "undefined") return null;

    return createPortal(
      <div
        ref={setRefs}
        id={contentId}
        role="dialog"
        data-slot="popover-content"
        data-state={open ? "open" : "closed"}
        data-side={position?.side ?? side}
        data-align={position?.align ?? align}
        style={position?.style ?? { position: "fixed", visibility: "hidden" }}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md border p-4 shadow-md outline-hidden",
          className
        )}
        {...props}
      />,
      document.body
    );
  }
);

function PopoverAnchor(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
