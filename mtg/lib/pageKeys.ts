import { useEffect } from "react";

/**
 * The left and right arrow keys turn the pages of a list. They do nothing while the player is typing (a search box, a menu), while a
 * window is open over the page (a card shown large uses the arrows itself), or with a key like Ctrl or Alt held (those belong to the browser).
 */
export function usePageKeys({ page, pages, setPage, enabled = true }: { page: number; pages: number; setPage: (page: number) => void; enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowRight" && e.key !== "ArrowLeft") || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.closest('[role="dialog"], [role="listbox"], [role="slider"]'))) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return; // a window is open over the page
      const next = e.key === "ArrowRight" ? page + 1 : page - 1;
      if (next < 0 || next >= pages) return;
      e.preventDefault();
      setPage(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page, pages, setPage, enabled]);
}
