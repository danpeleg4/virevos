"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "./utils";
import {
  useControllableState,
  useFloating,
  useEscape,
  useStableId,
  focusOnPointerMove,
  blurOnPointerLeave,
} from "./_internal";

interface SelectContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string | undefined;
  setValue: (v: string) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  contentId: string;
  triggerId: string;
  disabled?: boolean;
  labels: Map<string, React.ReactNode>;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select components must be used within <Select>");
  return ctx;
}

interface SelectProps<T extends string = string> {
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  children?: React.ReactNode;
}

function Select<T extends string = string>({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  name,
  required,
  children,
}: SelectProps<T>) {
  const [currentValue, setValueState] = useControllableState<T>({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const [isOpen, setOpenState] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const contentId = useStableId("select-content");
  const triggerId = useStableId("select-trigger");

  const labels = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    const walk = (node: React.ReactNode) => {
      React.Children.forEach(node, (child) => {
        if (!React.isValidElement(child)) return;
        const el = child as React.ReactElement<{
          value?: string;
          children?: React.ReactNode;
        }>;
        if (el.type === SelectItem && typeof el.props.value === "string") {
          map.set(el.props.value, el.props.children);
        } else if (el.props && "children" in el.props) {
          walk(el.props.children);
        }
      });
    };
    walk(children);
    return map;
  }, [children]);

  const ctxValue = React.useMemo<SelectContextValue>(
    () => ({
      open: !!isOpen,
      setOpen: (v) => setOpenState(v),
      value: currentValue,
      setValue: (v) => setValueState(v as T),
      triggerRef,
      contentRef,
      contentId,
      triggerId,
      disabled,
      labels,
    }),
    [
      isOpen,
      currentValue,
      contentId,
      triggerId,
      disabled,
      labels,
      setOpenState,
      setValueState,
    ]
  );

  return (
    <SelectContext.Provider value={ctxValue}>
      {children}
      {name && (
        <input
          type="hidden"
          aria-hidden
          tabIndex={-1}
          name={name}
          value={currentValue ?? ""}
          required={required}
          disabled={disabled}
        />
      )}
    </SelectContext.Provider>
  );
}

function SelectGroup(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="group" data-slot="select-group" {...props} />;
}

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: React.ReactNode;
}

function SelectValue({ placeholder, className, ...props }: SelectValueProps) {
  const { value, labels } = useSelect();
  const label = value !== undefined ? labels.get(value) : undefined;
  const hasValue = value !== undefined && value !== "" && label !== undefined;
  return (
    <span
      data-slot="select-value"
      data-placeholder={!hasValue ? "" : undefined}
      className={className}
      {...props}
    >
      {hasValue ? label : placeholder}
    </span>
  );
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "sm" | "default";
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  function SelectTrigger(
    { className, size = "default", children, onClick, onKeyDown, ...props },
    ref
  ) {
    const { open, setOpen, value, contentId, triggerId, disabled, triggerRef } =
      useSelect();
    const setRefs = (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current =
          node;
    };
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) setOpen(!open);
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === " "
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const hasValue = value !== undefined && value !== "";
    return (
      <button
        ref={setRefs}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={contentId}
        disabled={disabled}
        data-state={open ? "open" : "closed"}
        data-placeholder={!hasValue ? "" : undefined}
        data-slot="select-trigger"
        data-size={size}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "border-input cursor-pointer data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="size-4 opacity-50" />
      </button>
    );
  }
);

function getOptionElements(content: HTMLElement): HTMLElement[] {
  return Array.from(
    content.querySelectorAll<HTMLElement>(
      '[role="option"]:not([data-disabled])'
    )
  );
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: "popper" | "item-aligned";
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  function SelectContent(
    { className, children, position = "popper", onKeyDown, ...props },
    ref
  ) {
    const {
      open,
      setOpen,
      value,
      triggerRef,
      contentRef,
      contentId,
      triggerId,
    } = useSelect();
    const [floatingNode, setFloatingNode] =
      React.useState<HTMLDivElement | null>(null);
    const { position: pos } = useFloating({
      open,
      triggerRef,
      floatingNode,
      side: "bottom",
      align: "start",
      sideOffset: 4,
      matchTriggerWidth: true,
    });
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        setFloatingNode(node);
        contentRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref)
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref, contentRef]
    );

    useEscape(open, () => {
      setOpen(false);
      triggerRef.current?.focus?.();
    });

    React.useEffect(() => {
      if (!open) return;
      const handler = (e: PointerEvent) => {
        const target = e.target as Node;
        if (contentRef.current?.contains(target)) return;
        if (triggerRef.current?.contains(target)) return;
        setOpen(false);
      };
      document.addEventListener("pointerdown", handler);
      return () => document.removeEventListener("pointerdown", handler);
    }, [open, contentRef, triggerRef, setOpen]);

    React.useEffect(() => {
      if (!open || !contentRef.current) return;
      const root = contentRef.current;
      const options = getOptionElements(root);
      const selected = options.find(
        (el) => el.getAttribute("data-value") === value
      );
      (selected ?? options[0])?.focus();
    }, [open, value, contentRef]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const root = contentRef.current;
      if (!root) return;
      const options = getOptionElements(root);
      if (options.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const i = active ? options.indexOf(active) : -1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        options[(i + 1 + options.length) % options.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        options[(i - 1 + options.length) % options.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        options[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        options[options.length - 1]?.focus();
      } else if (e.key === "Tab") {
        e.preventDefault();
      }
    };

    if (typeof document === "undefined") return null;

    return createPortal(
      <div
        ref={setRefs}
        id={contentId}
        role="listbox"
        aria-labelledby={triggerId}
        tabIndex={-1}
        data-slot="select-content"
        data-state={open ? "open" : "closed"}
        data-side={pos?.side ?? "bottom"}
        data-align={pos?.align ?? "start"}
        style={
          open
            ? (pos?.style ?? { position: "fixed", visibility: "hidden" })
            : { position: "fixed", visibility: "hidden", pointerEvents: "none" }
        }
        onKeyDown={handleKeyDown}
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        {...props}
      >
        <div data-slot="select-viewport" className="p-1">
          {children}
        </div>
      </div>,
      document.body
    );
  }
);

function SelectLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

function SelectItem({
  className,
  children,
  value,
  disabled,
  onClick,
  onKeyDown,
  ...props
}: SelectItemProps) {
  const ctx = useSelect();
  const isSelected = ctx.value === value;

  const choose = () => {
    if (disabled) return;
    ctx.setValue(value);
    ctx.setOpen(false);
    ctx.triggerRef.current?.focus?.();
  };

  return (
    <div
      role="option"
      tabIndex={-1}
      aria-selected={isSelected}
      data-value={value}
      data-slot="select-item"
      data-state={isSelected ? "checked" : "unchecked"}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled || undefined}
      onPointerMove={(e) => focusOnPointerMove(e, disabled)}
      onPointerLeave={blurOnPointerLeave}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented) choose();
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          choose();
        }
      }}
      className={cn(
        "focus:bg-accent cursor-pointer focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        {isSelected && <CheckIcon className="size-4" />}
      </span>
      <span>{children}</span>
    </div>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      data-slot="select-separator"
      className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </div>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className
      )}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </div>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
