"use client";

import { useEffect, useRef } from "react";

/**
 * Behaviour every side drawer shares: Escape closes it (and only it — the room
 * behind listens for the same key to step back), focus moves in on open and
 * returns to whatever opened it on close.
 */
export function useModal<T extends HTMLElement>(onClose: () => void) {
  const root = useRef<T>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const node = root.current;
    // the panel itself, not a field (a phone would raise the keyboard at once),
    // unless a field inside already took focus on its own, like the search box
    if (node && !node.contains(document.activeElement)) node.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      close.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  return root;
}
