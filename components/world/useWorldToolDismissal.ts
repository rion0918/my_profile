"use client";

import { useEffect, type RefObject } from 'react';

export function useWorldToolDismissal(details: RefObject<HTMLDetailsElement | null>) {
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      const panel = details.current;
      const target = event.target;
      if (event.button !== 0 || !panel?.open || !(target instanceof Element) || panel.contains(target) || !panel.closest('.worldMain')?.contains(target)) return;
      panel.open = false;
      const surface = target.closest<HTMLElement>('.worldSurface');
      if (surface) {
        event.preventDefault();
        event.stopPropagation();
        surface.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [details]);
}
