"use client";

import * as React from "react";

import { cn } from "./utils";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  function Separator(
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) {
    const ariaProps = decorative
      ? { role: "none" as const }
      : {
          role: "separator" as const,
          "aria-orientation":
            orientation === "vertical" ? ("vertical" as const) : undefined,
        };
    return (
      <div
        ref={ref}
        data-slot="separator-root"
        data-orientation={orientation}
        {...ariaProps}
        className={cn(
          "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
          className
        )}
        {...props}
      />
    );
  }
);

export { Separator };
