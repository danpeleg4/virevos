import * as React from "react";

export type ToastVariant = "default" | "success" | "destructive" | "warning" | "info";

export interface ToastActionData {
  label: string;
  onClick: () => void;
}

export interface ToastData {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant: ToastVariant;
  duration: number;
  action?: ToastActionData;
}

export type ToastInput = Partial<Omit<ToastData, "id" | "variant">> & {
  title?: React.ReactNode;
};

const DEFAULT_DURATION = 5000;

let toasts: ToastData[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  for (const listener of listeners) listener();
}

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function scheduleDismiss(id: string, duration: number) {
  if (duration <= 0) return;
  clearTimer(id);
  timers.set(
    id,
    setTimeout(() => dismissToast(id), duration)
  );
}

function addToast(input: ToastInput, variant: ToastVariant): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const duration = input.duration ?? DEFAULT_DURATION;
  const next: ToastData = {
    id,
    title: input.title,
    description: input.description,
    variant,
    duration,
    action: input.action,
  };
  toasts = [...toasts, next];
  emit();
  scheduleDismiss(id, duration);
  return id;
}

export function dismissToast(id: string) {
  clearTimer(id);
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function dismissAllToasts() {
  for (const id of timers.keys()) clearTimer(id);
  toasts = [];
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

function getServerSnapshot() {
  return toasts;
}

export function useToasts(): ToastData[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

type ToastFn = (input: ToastInput) => string;

interface Toast extends ToastFn {
  success: ToastFn;
  destructive: ToastFn;
  error: ToastFn;
  warning: ToastFn;
  info: ToastFn;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const toast: Toast = Object.assign(
  (input: ToastInput) => addToast(input, "default"),
  {
    success: (input: ToastInput) => addToast(input, "success"),
    destructive: (input: ToastInput) => addToast(input, "destructive"),
    error: (input: ToastInput) => addToast(input, "destructive"),
    warning: (input: ToastInput) => addToast(input, "warning"),
    info: (input: ToastInput) => addToast(input, "info"),
    dismiss: dismissToast,
    dismissAll: dismissAllToasts,
  }
);
