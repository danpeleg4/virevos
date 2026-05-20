"use client";

import * as React from "react";
import { cn } from "./utils";
import { composeRefs } from "./_internal";

type SlottableElement = React.ReactElement<{
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLElement>;
  [key: string]: unknown;
}>;

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  ref?: React.Ref<HTMLElement>;
}

export function Slot({ ref: forwardedRef, ...props }: SlotProps) {
  const { children, ...slotProps } = props;
  if (!React.isValidElement(children)) return null;
  const child = children as SlottableElement;
  const childProps = child.props;
  const childRef =
    (child as unknown as { ref?: React.Ref<HTMLElement> }).ref ??
    (childProps.ref as React.Ref<HTMLElement> | undefined);

  const merged: Record<string, unknown> = { ...slotProps };
  for (const key in childProps) {
    if (key === "ref") continue;
    const slotVal = (slotProps as Record<string, unknown>)[key];
    const childVal = (childProps as Record<string, unknown>)[key];
    if (
      /^on[A-Z]/.test(key) &&
      typeof slotVal === "function" &&
      typeof childVal === "function"
    ) {
      const slotFn = slotVal as (...a: unknown[]) => void;
      const childFn = childVal as (...a: unknown[]) => void;
      merged[key] = (...args: unknown[]) => {
        childFn(...args);
        slotFn(...args);
      };
    } else if (key === "style") {
      merged[key] = {
        ...(slotVal as React.CSSProperties | undefined),
        ...(childVal as React.CSSProperties | undefined),
      };
    } else if (key === "className") {
      merged[key] = cn(
        slotVal as string | undefined,
        childVal as string | undefined
      );
    } else if (childVal !== undefined) {
      merged[key] = childVal;
    }
  }

  merged.ref = composeRefs<HTMLElement>(forwardedRef, childRef);

  return React.cloneElement(child, merged);
}
