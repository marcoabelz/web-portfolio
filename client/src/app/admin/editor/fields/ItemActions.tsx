import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { iconButtonClass, removeConfirmText } from "./shared";

// Move up, move down, and remove for one list item or collection entry. Removing asks
// first, because it also drops the item's text in both languages.
export function ItemActions({
  title,
  index,
  count,
  onMove,
  onRemove,
}: Readonly<{
  title: string;
  index: number;
  count: number;
  onMove(direction: -1 | 1): void;
  onRemove(): void;
}>) {
  return (
    <>
      <button
        type="button"
        aria-label={`Move ${title} up`}
        title="Move up"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        className={iconButtonClass}
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Move ${title} down`}
        title="Move down"
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        className={iconButtonClass}
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Remove ${title}`}
        title="Remove"
        onClick={() => {
          if (window.confirm(removeConfirmText(title))) {
            onRemove();
          }
        }}
        className={`${iconButtonClass} hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400`}
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </>
  );
}
