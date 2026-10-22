// The breakpoint below which the chat panel is a modal sheet.
export const PHONE_QUERY = "(max-width: 767px)";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Where Tab should go to stay inside `container`: the first element after the last (or
// the last before the first with Shift), or anywhere inside when focus has left it.
// Null means the browser's own Tab order is already right.
export function trapTarget(container: HTMLElement, active: Element | null, backwards: boolean): HTMLElement | null {
  const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // Hidden by CSS (the desktop-only close button, say) means not reachable.
    (item) => !item.hidden && item.getClientRects().length > 0,
  );

  if (items.length === 0) {
    return null;
  }

  const first = items[0];
  const last = items[items.length - 1];

  if (!active || !container.contains(active)) {
    return backwards ? last : first;
  }

  if (backwards && active === first) {
    return last;
  }

  if (!backwards && active === last) {
    return first;
  }

  return null;
}
