"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "./utils";
import { buttonVariants } from "./button";
import {
  useControllableState,
  useFocusTrap,
  useScrollLock,
  useEscape,
  useStableId,
} from "./_internal";
import { Slot } from "./_slot";

interface AlertDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
  titleId: string;
  descriptionId: string;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialog() {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) throw new Error("AlertDialog components must be used within <AlertDialog>");
  return ctx;
}

interface AlertDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

function AlertDialog({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: AlertDialogProps) {
  const [state, setState] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentId = useStableId("alert-content");
  const titleId = useStableId("alert-title");
  const descriptionId = useStableId("alert-description");

  return (
    <AlertDialogContext.Provider
      value={{
        open: !!state,
        setOpen: (v) => setState(v),
        triggerRef,
        contentId,
        titleId,
        descriptionId,
      }}
    >
      {children}
    </AlertDialogContext.Provider>
  );
}

interface AlertDialogTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const AlertDialogTrigger = React.forwardRef<HTMLButtonElement, AlertDialogTriggerProps>(
  function AlertDialogTrigger({ asChild, onClick, ...props }, ref) {
    const { open, setOpen, triggerRef, contentId } = useAlertDialog();
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
        data-slot="alert-dialog-trigger"
        onClick={handleClick}
        {...props}
      />
    );
  }
);

function AlertDialogPortal({ children }: { children?: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function AlertDialogOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open } = useAlertDialog();
  return (
    <div
      data-slot="alert-dialog-overlay"
      data-state={open ? "open" : "closed"}
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  );
}

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function AlertDialogContent({ className, children, ...props }, ref) {
  const { open, setOpen, contentId, titleId, descriptionId, triggerRef } =
    useAlertDialog();
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  useFocusTrap(localRef, open);
  useScrollLock(open);
  useEscape(open, () => {
    setOpen(false);
    triggerRef.current?.focus?.();
  });

  if (!open) return null;

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <div
        ref={setRefs}
        id={contentId}
        role="alertdialog"
        aria-modal
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-slot="alert-dialog-content"
        data-state="open"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AlertDialogPortal>
  );
});

function AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useAlertDialog();
  return (
    <h2
      id={titleId}
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useAlertDialog();
  return (
    <p
      id={descriptionId}
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

interface AlertDialogActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const AlertDialogAction = React.forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  function AlertDialogAction({ className, onClick, ...props }, ref) {
    const { setOpen, triggerRef } = useAlertDialog();
    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) {
            setOpen(false);
            triggerRef.current?.focus?.();
          }
        }}
        className={cn(buttonVariants(), className)}
        {...props}
      />
    );
  }
);

interface AlertDialogCancelProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const AlertDialogCancel = React.forwardRef<HTMLButtonElement, AlertDialogCancelProps>(
  function AlertDialogCancel({ className, onClick, ...props }, ref) {
    const { setOpen, triggerRef } = useAlertDialog();
    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) {
            setOpen(false);
            triggerRef.current?.focus?.();
          }
        }}
        className={cn(buttonVariants({ variant: "outline" }), className)}
        {...props}
      />
    );
  }
);

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
