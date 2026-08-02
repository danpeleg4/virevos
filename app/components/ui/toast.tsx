"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckCircle2, AlertTriangle, XCircle, Info, XIcon } from "lucide-react";

import { cn } from "./utils";

const toastVariants = cva(
  "pointer-events-auto relative w-full rounded-lg border bg-card text-card-foreground p-4 shadow-lg grid grid-cols-[calc(var(--spacing)*4)_1fr] gap-x-3 gap-y-0.5 items-start animate-in fade-in-0 slide-in-from-top-full sm:slide-in-from-bottom-full duration-200",
  {
    variants: {
      variant: {
        default: "[&>svg]:text-foreground",
        success: "[&>svg]:text-success",
        destructive: "[&>svg]:text-destructive",
        warning: "[&>svg]:text-warning",
        info: "[&>svg]:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const variantIcons = {
  default: null,
  success: CheckCircle2,
  destructive: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

interface ToastProps
  extends React.HTMLAttributes<HTMLLIElement>,
    VariantProps<typeof toastVariants> {
  ref?: React.Ref<HTMLLIElement>;
}

function Toast({
  className,
  variant = "default",
  children,
  ref,
  ...props
}: ToastProps) {
  const Icon = variantIcons[variant ?? "default"];
  return (
    <li
      ref={ref}
      role={variant === "destructive" ? "alert" : "status"}
      aria-live={variant === "destructive" ? "assertive" : "polite"}
      aria-atomic="true"
      data-slot="toast"
      data-state="open"
      data-variant={variant}
      className={cn(toastVariants({ variant, className }))}
      {...props}
    >
      {Icon ? <Icon className="size-4 translate-y-0.5" /> : <div />}
      <div className="col-start-2 grid gap-1">{children}</div>
    </li>
  );
}

function ToastTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="toast-title"
      className={cn("text-sm font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="toast-description"
      className={cn("text-muted-foreground text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

interface ToastActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
}

function ToastAction({ className, ref, ...props }: ToastActionProps) {
  return (
    <button
      ref={ref}
      type="button"
      data-slot="toast-action"
      className={cn(
        "cursor-pointer mt-1 inline-flex h-8 w-fit shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

interface ToastCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
}

function ToastClose({ className, ref, ...props }: ToastCloseProps) {
  return (
    <button
      ref={ref}
      type="button"
      data-slot="toast-close"
      className={cn(
        "cursor-pointer absolute top-3 right-3 rounded-xs p-0.5 text-foreground/50 opacity-70 transition-opacity hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      <XIcon className="size-4" />
      <span className="sr-only">Dismiss</span>
    </button>
  );
}

function ToastViewport({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="toast-viewport"
      className={cn(
        "fixed top-0 z-100 flex max-h-screen w-full flex-col gap-2 p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:w-full sm:max-w-[420px]",
        className
      )}
      {...props}
    />
  );
}

export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  ToastViewport,
  toastVariants,
};
