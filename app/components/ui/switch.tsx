"use client";

import * as React from "react";

import { cn } from "./utils";
import { useControllableState } from "./_internal";

interface SwitchProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "checked" | "defaultChecked" | "onChange"
  > {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  required?: boolean;
  name?: string;
  value?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    className,
    checked,
    defaultChecked,
    onCheckedChange,
    disabled,
    required,
    name,
    value = "on",
    ...props
  },
  ref
) {
  const [state, setState] = useControllableState<boolean>({
    value: checked,
    defaultValue: defaultChecked ?? false,
    onChange: onCheckedChange,
  });

  return (
    <>
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={!!state}
        aria-required={required}
        data-state={state ? "checked" : "unchecked"}
        data-slot="switch"
        disabled={disabled}
        onClick={(e) => {
          props.onClick?.(e);
          if (e.defaultPrevented) return;
          setState(!state);
        }}
        className={cn(
          "peer cursor-pointer data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        <span
          data-state={state ? "checked" : "unchecked"}
          data-slot="switch-thumb"
          className="bg-card dark:data-[state=unchecked]:bg-card-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        />
      </button>
      {name && (
        <input
          type="checkbox"
          aria-hidden
          tabIndex={-1}
          name={name}
          value={value}
          checked={!!state}
          required={required}
          disabled={disabled}
          readOnly
          style={{ position: "absolute", pointerEvents: "none", opacity: 0, margin: 0, width: 0, height: 0 }}
        />
      )}
    </>
  );
});

export { Switch };
