import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Traps keyboard focus inside the referenced container while `active` is true,
 * and restores focus to the previously focused element on deactivation.
 *
 * Attach the returned ref to the modal content container (give it tabIndex={-1}
 * so it can receive focus as a fallback when it holds no focusable children).
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const wasActive = useRef(false);

  // Capture the element to restore focus to at the instant the trap activates,
  // during render — BEFORE a child's autoFocus can steal focus (autoFocus runs
  // in the commit phase, before passive effects). Client-only: `active` starts
  // false (modals open closed), so document is never touched during SSR.
  if (active && !wasActive.current && typeof document !== "undefined") {
    restoreRef.current = document.activeElement as HTMLElement | null;
  }
  wasActive.current = active;

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.getClientRects().length > 0,
      );

    // Move focus into the container if it isn't already there (respects autoFocus).
    if (!container.contains(document.activeElement)) {
      (focusables()[0] ?? container).focus();
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      restoreRef.current?.focus?.();
    };
  }, [active]);

  return ref;
}
