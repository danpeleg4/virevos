"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "./utils";
import { useControllableState, useStableId } from "./_internal";

type AccordionContextValue = {
  type: "single" | "multiple";
  collapsible: boolean;
  value: string | string[] | undefined;
  toggle: (itemValue: string) => void;
  disabled?: boolean;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<{
  value: string;
  open: boolean;
  disabled?: boolean;
  triggerId: string;
  contentId: string;
} | null>(null);

function useAccordion() {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("Accordion components must be used within <Accordion>");
  return ctx;
}

function useAccordionItem() {
  const ctx = React.useContext(AccordionItemContext);
  if (!ctx) throw new Error("AccordionItem components must be used within <AccordionItem>");
  return ctx;
}

type AccordionProps = {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & (
  | {
      type: "single";
      value?: string;
      defaultValue?: string;
      onValueChange?: (value: string) => void;
      collapsible?: boolean;
    }
  | {
      type: "multiple";
      value?: string[];
      defaultValue?: string[];
      onValueChange?: (value: string[]) => void;
      collapsible?: never;
    }
);

function Accordion(props: AccordionProps) {
  const { type, children, className, disabled } = props;
  const collapsible = type === "single" ? props.collapsible ?? false : true;

  const [value, setValue] = useControllableState<string | string[]>({
    value: props.value,
    defaultValue: props.defaultValue ?? (type === "multiple" ? [] : undefined),
    onChange: props.onValueChange as (v: string | string[]) => void,
  });

  const toggle = React.useCallback(
    (itemValue: string) => {
      if (type === "single") {
        const current = value as string | undefined;
        const next = current === itemValue ? (collapsible ? "" : current) : itemValue;
        setValue(next ?? "");
      } else {
        const current = (value as string[]) ?? [];
        const next = current.includes(itemValue)
          ? current.filter((v) => v !== itemValue)
          : [...current, itemValue];
        setValue(next);
      }
    },
    [type, collapsible, value, setValue]
  );

  return (
    <AccordionContext.Provider
      value={{ type, collapsible, value, toggle, disabled }}
    >
      <div data-slot="accordion" className={className}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

function AccordionItem({
  value,
  disabled,
  className,
  children,
  ...props
}: AccordionItemProps) {
  const ctx = useAccordion();
  const open =
    ctx.type === "single"
      ? ctx.value === value
      : Array.isArray(ctx.value) && ctx.value.includes(value);
  const triggerId = useStableId("acc-trigger");
  const contentId = useStableId("acc-content");
  const itemDisabled = disabled ?? ctx.disabled;

  return (
    <AccordionItemContext.Provider
      value={{ value, open, disabled: itemDisabled, triggerId, contentId }}
    >
      <div
        data-slot="accordion-item"
        data-state={open ? "open" : "closed"}
        data-disabled={itemDisabled ? "" : undefined}
        className={cn("border-b last:border-b-0", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useAccordion();
  const item = useAccordionItem();
  return (
    <h3 className="flex">
      <button
        type="button"
        id={item.triggerId}
        aria-controls={item.contentId}
        aria-expanded={item.open}
        data-slot="accordion-trigger"
        data-state={item.open ? "open" : "closed"}
        disabled={item.disabled}
        onClick={(e) => {
          props.onClick?.(e);
          if (e.defaultPrevented) return;
          ctx.toggle(item.value);
        }}
        className={cn(
          "focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" />
      </button>
    </h3>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const item = useAccordionItem();
  if (!item.open) return null;
  return (
    <div
      role="region"
      id={item.contentId}
      aria-labelledby={item.triggerId}
      data-slot="accordion-content"
      data-state="open"
      className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm"
      {...props}
    >
      <div className={cn("pt-0 pb-4", className)}>{children}</div>
    </div>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
