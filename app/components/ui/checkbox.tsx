"use client";

import * as React from "react";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "./utils";
import { useControllableState } from "./_internal";

type CheckedState = boolean | "indeterminate";

interface CheckboxProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "checked" | "defaultChecked" | "onChange"
> {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onCheckedChange?: (checked: CheckedState) => void;
  required?: boolean;
  name?: string;
  value?: string;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox(
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
    const [state, setState] = useControllableState<CheckedState>({
      value: checked,
      defaultValue: defaultChecked ?? false,
      onChange: onCheckedChange,
    });
    const isChecked = state === true;
    const isIndeterminate = state === "indeterminate";

    return (
      <>
        <button
          ref={ref}
          type="button"
          role="checkbox"
          aria-checked={isIndeterminate ? "mixed" : isChecked}
          aria-required={required}
          data-state={
            isIndeterminate
              ? "indeterminate"
              : isChecked
                ? "checked"
                : "unchecked"
          }
          data-slot="checkbox"
          disabled={disabled}
          onClick={(e) => {
            props.onClick?.(e);
            if (e.defaultPrevented) return;
            setState(isChecked ? false : true);
          }}
          className={cn(
            "peer border bg-input-background dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center justify-center",
            className
          )}
          {...props}
        >
          {isChecked && <CheckIcon className="size-3.5" />}
          {isIndeterminate && <MinusIcon className="size-3.5" />}
        </button>
        {name && (
          <input
            type="checkbox"
            aria-hidden
            tabIndex={-1}
            name={name}
            value={value}
            checked={isChecked}
            required={required}
            disabled={disabled}
            readOnly
            style={{
              position: "absolute",
              pointerEvents: "none",
              opacity: 0,
              margin: 0,
              width: 0,
              height: 0,
            }}
          />
        )}
      </>
    );
  }
);

export { Checkbox };
