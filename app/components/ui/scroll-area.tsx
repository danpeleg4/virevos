"use client";

import * as React from "react";

import { cn } from "./utils";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  viewportClassName?: string;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  function ScrollArea(
    { className, viewportClassName, children, ...props },
    ref
  ) {
    return (
      <div
        ref={ref}
        data-slot="scroll-area"
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <div
          data-slot="scroll-area-viewport"
          className={cn(
            "focus-visible:ring-ring/50 size-full overflow-auto rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1 [scrollbar-width:thin]",
            viewportClassName
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal";
}

function ScrollBar(_props: ScrollBarProps) {
  return null;
}

export { ScrollArea, ScrollBar };
