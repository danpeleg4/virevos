"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { dismissToast, useToasts } from "./toast-store";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function useMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function Toaster() {
  const toasts = useToasts();
  const mounted = useMounted();

  if (!mounted) return null;

  return createPortal(
    <ToastViewport>
      {toasts.map(({ id, title, description, variant, action }) => (
        <Toast key={id} variant={variant}>
          {title && <ToastTitle>{title}</ToastTitle>}
          {description && <ToastDescription>{description}</ToastDescription>}
          {action && (
            <ToastAction
              onClick={() => {
                action.onClick();
                dismissToast(id);
              }}
            >
              {action.label}
            </ToastAction>
          )}
          <ToastClose onClick={() => dismissToast(id)} />
        </Toast>
      ))}
    </ToastViewport>,
    document.body
  );
}

export { Toaster };
