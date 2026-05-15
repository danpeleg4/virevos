"use client";

import * as React from "react";

import { cn } from "./utils";
import { useControllableState, useStableId } from "./_internal";

type Orientation = "horizontal" | "vertical";

const TabsContext = React.createContext<{
  value: string | undefined;
  setValue: (v: string) => void;
  orientation: Orientation;
  baseId: string;
} | null>(null);

function useTabs() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs>");
  return ctx;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: Orientation;
}

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  children,
  ...props
}: TabsProps) {
  const [current, setCurrent] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const baseId = useStableId("tabs");

  return (
    <TabsContext.Provider
      value={{
        value: current,
        setValue: (v) => setCurrent(v),
        orientation,
        baseId,
      }}
    >
      <div
        data-slot="tabs"
        data-orientation={orientation}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { orientation } = useTabs();
  return (
    <div
      role="tablist"
      aria-orientation={orientation}
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] flex",
        className
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

function TabsTrigger({
  className,
  value,
  disabled,
  ...props
}: TabsTriggerProps) {
  const ctx = useTabs();
  const active = ctx.value === value;
  const triggerId = `${ctx.baseId}-trigger-${value}`;
  const contentId = `${ctx.baseId}-content-${value}`;

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    props.onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const horizontal = ctx.orientation === "horizontal";
    const nextKey = horizontal ? "ArrowRight" : "ArrowDown";
    const prevKey = horizontal ? "ArrowLeft" : "ArrowUp";
    if (e.key !== nextKey && e.key !== prevKey && e.key !== "Home" && e.key !== "End") return;
    const list = e.currentTarget.parentElement;
    if (!list) return;
    const triggers = Array.from(
      list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
    );
    const i = triggers.indexOf(e.currentTarget);
    let target: HTMLButtonElement | undefined;
    if (e.key === nextKey) target = triggers[(i + 1) % triggers.length];
    else if (e.key === prevKey)
      target = triggers[(i - 1 + triggers.length) % triggers.length];
    else if (e.key === "Home") target = triggers[0];
    else if (e.key === "End") target = triggers[triggers.length - 1];
    if (target) {
      e.preventDefault();
      target.focus();
      target.click();
    }
  };

  return (
    <button
      type="button"
      role="tab"
      id={triggerId}
      aria-selected={active}
      aria-controls={contentId}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      data-slot="tabs-trigger"
      data-state={active ? "active" : "inactive"}
      data-orientation={ctx.orientation}
      onClick={(e) => {
        props.onClick?.(e);
        if (!e.defaultPrevented) ctx.setValue(value);
      }}
      onKeyDown={onKeyDown}
      className={cn(
        "data-[state=active]:bg-card dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

function TabsContent({
  className,
  value,
  forceMount,
  ...props
}: TabsContentProps) {
  const ctx = useTabs();
  const active = ctx.value === value;
  if (!active && !forceMount) return null;
  const triggerId = `${ctx.baseId}-trigger-${value}`;
  const contentId = `${ctx.baseId}-content-${value}`;
  return (
    <div
      role="tabpanel"
      id={contentId}
      aria-labelledby={triggerId}
      tabIndex={0}
      hidden={!active}
      data-slot="tabs-content"
      data-state={active ? "active" : "inactive"}
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
