import { RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

import { badgeClass } from "./shared";

// Every field's card: its label, hint, "Changed" badge, and "Reset" button. With
// `htmlFor` the label points at the one input; without it the card is a labelled group
// and the inputs inside carry their own labels.
export function FieldFrame({
  id,
  label,
  hint,
  htmlFor,
  dirty = false,
  onReset,
  resetName,
  badges,
  actions,
  children,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  htmlFor?: string;
  dirty?: boolean;
  onReset?: () => void;
  // The reset button's accessible name, e.g. "Reset Title in both languages" for copy.
  resetName?: string;
  badges?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}>) {
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  const name = resetName ?? `Reset ${label}`;

  return (
    <div
      role={htmlFor ? undefined : "group"}
      aria-labelledby={htmlFor ? undefined : labelId}
      aria-describedby={htmlFor ? undefined : hintId}
      data-field-frame="true"
      data-dirty={dirty ? "true" : "false"}
      className={`rounded-2xl border bg-surface p-4 transition-colors ${dirty ? "border-accent/50" : "border-line"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {htmlFor ? (
              <label id={labelId} htmlFor={htmlFor} className="break-words text-sm font-medium text-ink">
                {label}
              </label>
            ) : (
              <span id={labelId} className="break-words text-sm font-medium text-ink">
                {label}
              </span>
            )}
            {dirty ? <span className={`${badgeClass} bg-accent/15 text-accent`}>Changed</span> : null}
            {badges}
          </div>
          {hint ? (
            <p id={hintId} className="mt-1 text-xs leading-relaxed text-muted">
              {hint}
            </p>
          ) : null}
        </div>
        {actions || (dirty && onReset) ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {actions}
            {dirty && onReset ? (
              <button
                type="button"
                data-action="reset"
                aria-label={name}
                title={name}
                onClick={onReset}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <RotateCcw aria-hidden="true" className="size-3.5" />
                Reset
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
