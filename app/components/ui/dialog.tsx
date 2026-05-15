"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";

import { cn } from "./utils";
import {
  useControllableState,
  useFocusTrap,
  useScrollLock,
  useEscape,
  useStableId,
} from "./_internal";
import { Slot } from "./_slot";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
  titleId: string;
  descriptionId: string;
  modal: boolean;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialog() {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error("Dialog components must be used within <Dialog>");
  return ctx;
}

interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  children?: React.ReactNode;
}

function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  modal = true,
  children,
}: DialogProps) {
  const [state, setState] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentId = useStableId("dialog-content");
  const titleId = useStableId("dialog-title");
  const descriptionId = useStableId("dialog-description");

  return (
    <DialogContext.Provider
      value={{
        open: !!state,
        setOpen: (v) => setState(v),
        triggerRef,
        contentId,
        titleId,
        descriptionId,
        modal,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  function DialogTrigger({ asChild, onClick, ...props }, ref) {
    const { open, setOpen, triggerRef, contentId } = useDialog();
    const setRefs = (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
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
        data-slot="dialog-trigger"
        onClick={handleClick}
        {...props}
      />
    );
  }
);

function DialogPortal({ children }: { children?: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

interface DialogOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogOverlay = React.forwardRef<HTMLDivElement, DialogOverlayProps>(
  function DialogOverlay({ className, ...props }, ref) {
    const { open } = useDialog();
    return (
      <div
        ref={ref}
        data-slot="dialog-overlay"
        data-state={open ? "open" : "closed"}
        className={cn(
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
          className
        )}
        {...props}
      />
    );
  }
);

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
  onPointerDownOutside?: (e: PointerEvent) => void;
  hideClose?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    {
      className,
      children,
      onEscapeKeyDown,
      onPointerDownOutside,
      hideClose = false,
      ...props
    },
    ref
  ) {
    const { open, setOpen, contentId, titleId, descriptionId, modal, triggerRef } =
      useDialog();
    const localRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    useFocusTrap(localRef, open);
    useScrollLock(open && modal);

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
        if (!localRef.current) return;
        if (localRef.current.contains(e.target as Node)) return;
        const overlayEl = (e.target as HTMLElement).closest('[data-slot="dialog-overlay"]');
        if (!overlayEl) return;
        onPointerDownOutside?.(e);
        if (!e.defaultPrevented) {
          setOpen(false);
          triggerRef.current?.focus?.();
        }
      };
      document.addEventListener("pointerdown", handler);
      return () => document.removeEventListener("pointerdown", handler);
    }, [open, onPointerDownOutside, setOpen, triggerRef]);

    if (!open) return null;

    return (
      <DialogPortal>
        <DialogOverlay />
        <div
          ref={setRefs}
          id={contentId}
          role="dialog"
          aria-modal={modal ? true : undefined}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          data-slot="dialog-content"
          data-state="open"
          className={cn(
            "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200",
            className
          )}
          {...props}
        >
          {children}
          {!hideClose && (
            <DialogClose
              className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogClose>
          )}
        </div>
      </DialogPortal>
    );
  }
);

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DialogClose = React.forwardRef<HTMLButtonElement, DialogCloseProps>(
  function DialogClose({ asChild, onClick, ...props }, ref) {
    const { setOpen, triggerRef } = useDialog();
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        setOpen(false);
        triggerRef.current?.focus?.();
      }
    };
    const Comp: React.ElementType = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        data-slot="dialog-close"
        onClick={handleClick}
        {...props}
      />
    );
  }
);

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean;
}

function DialogTitle({ className, asChild, ...props }: DialogTitleProps) {
  const { titleId } = useDialog();
  const Comp: React.ElementType = asChild ? Slot : "h2";
  return (
    <Comp
      id={titleId}
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

interface DialogDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

function DialogDescription({
  className,
  asChild,
  ...props
}: DialogDescriptionProps) {
  const { descriptionId } = useDialog();
  const Comp: React.ElementType = asChild ? Slot : "p";
  return (
    <Comp
      id={descriptionId}
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
