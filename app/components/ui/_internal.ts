import * as React from "react";

export function useStableId(prefix = "ui") {
  const id = React.useId();
  return `${prefix}-${id}`;
}

export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue?: T;
  onChange?: (v: T) => void;
}): [T | undefined, (v: T) => void] {
  const [internal, setInternal] = React.useState<T | undefined>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );

  return [current, set];
}

export function composeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref && typeof ref === "object")
        (ref as React.RefObject<T | null>).current = node;
    }
  };
}

export function composeHandlers<E extends React.SyntheticEvent>(
  ...handlers: (((e: E) => void) | undefined)[]
) {
  return (event: E) => {
    for (const h of handlers) {
      if (!h) continue;
      h(event);
      if (event.defaultPrevented) return;
    }
  };
}

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "center" | "end";

export interface FloatingPosition {
  style: React.CSSProperties;
  side: Side;
  align: Align;
}

export function computeFloatingPosition({
  trigger,
  floating,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  matchTriggerWidth = false,
}: {
  trigger: DOMRect;
  floating: { width: number; height: number };
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  matchTriggerWidth?: boolean;
}): FloatingPosition {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const margin = 8;

  let resolvedSide: Side = side;
  if (
    side === "bottom" &&
    trigger.bottom + sideOffset + floating.height > vh - margin
  ) {
    if (trigger.top - sideOffset - floating.height >= margin)
      resolvedSide = "top";
  } else if (
    side === "top" &&
    trigger.top - sideOffset - floating.height < margin
  ) {
    if (trigger.bottom + sideOffset + floating.height <= vh - margin)
      resolvedSide = "bottom";
  } else if (
    side === "right" &&
    trigger.right + sideOffset + floating.width > vw - margin
  ) {
    if (trigger.left - sideOffset - floating.width >= margin)
      resolvedSide = "left";
  } else if (
    side === "left" &&
    trigger.left - sideOffset - floating.width < margin
  ) {
    if (trigger.right + sideOffset + floating.width <= vw - margin)
      resolvedSide = "right";
  }

  let top = 0;
  let left = 0;
  const width = matchTriggerWidth ? trigger.width : undefined;

  if (resolvedSide === "bottom" || resolvedSide === "top") {
    top =
      resolvedSide === "bottom"
        ? trigger.bottom + sideOffset
        : trigger.top - sideOffset - floating.height;
    if (align === "start") left = trigger.left + alignOffset;
    else if (align === "end")
      left = trigger.right - floating.width - alignOffset;
    else left = trigger.left + trigger.width / 2 - floating.width / 2;
    left = Math.max(margin, Math.min(left, vw - floating.width - margin));
  } else {
    left =
      resolvedSide === "right"
        ? trigger.right + sideOffset
        : trigger.left - sideOffset - floating.width;
    if (align === "start") top = trigger.top + alignOffset;
    else if (align === "end")
      top = trigger.bottom - floating.height - alignOffset;
    else top = trigger.top + trigger.height / 2 - floating.height / 2;
    top = Math.max(margin, Math.min(top, vh - floating.height - margin));
  }

  return {
    side: resolvedSide,
    align,
    style: {
      position: "fixed",
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      ...(width !== undefined ? { width: `${Math.round(width)}px` } : {}),
    },
  };
}

export function useFloating({
  open,
  triggerRef,
  floatingNode,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  matchTriggerWidth = false,
}: {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  floatingNode: HTMLElement | null;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  alignOffset?: number;
  matchTriggerWidth?: boolean;
}) {
  const [position, setPosition] = React.useState<FloatingPosition | null>(null);

  const update = React.useCallback(() => {
    const t = triggerRef.current;
    if (!t || !floatingNode) return;
    const triggerRect = t.getBoundingClientRect();
    const floatingRect = floatingNode.getBoundingClientRect();
    setPosition(
      computeFloatingPosition({
        trigger: triggerRect,
        floating: { width: floatingRect.width, height: floatingRect.height },
        side,
        align,
        sideOffset,
        alignOffset,
        matchTriggerWidth,
      })
    );
  }, [
    side,
    align,
    sideOffset,
    alignOffset,
    matchTriggerWidth,
    triggerRef,
    floatingNode,
  ]);

  React.useLayoutEffect(() => {
    if (!open || !floatingNode) {
      setPosition(null);
      return;
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, floatingNode, update]);

  return { position, update };
}

const FOCUSABLE_SELECTOR =
  'a[href], area[href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [contenteditable], [tabindex]:not([tabindex="-1"])';

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (el) =>
      !el.hasAttribute("disabled") &&
      el.tabIndex !== -1 &&
      el.offsetParent !== null
  );
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean
) {
  React.useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = getFocusable(container);
    (focusables[0] ?? container).focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = getFocusable(container);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef]);
}

export function useScrollLock(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

export function useEscape(active: boolean, onEscape: () => void) {
  React.useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active, onEscape]);
}

// Mouse hover should drive focus on menu/listbox items so that `focus:` styles
// double as the hover highlight.
export function focusOnPointerMove(
  e: React.PointerEvent<HTMLElement>,
  disabled?: boolean
) {
  if (disabled) return;
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  if (document.activeElement !== el) el.focus({ preventScroll: true });
}

export function blurOnPointerLeave(e: React.PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  if (document.activeElement === el) {
    const owner = el.closest<HTMLElement>('[role="menu"], [role="listbox"]');
    owner?.focus({ preventScroll: true });
  }
}

export function useOutsideClick(
  refs: React.RefObject<HTMLElement | null>[],
  active: boolean,
  onOutside: (e: MouseEvent) => void
) {
  React.useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) onOutside(e);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [active, refs, onOutside]);
}
