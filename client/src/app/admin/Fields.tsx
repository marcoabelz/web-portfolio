"use client";

import type { Locale } from "@/i18n/locale";
import type { MessageNode, NodePath } from "@/lib/admin/draft";

export type EditHandlers = Readonly<{
  onEdit: (locale: Locale, path: NodePath, value: string) => void;
  onAdd: (path: NodePath) => void;
  onRemove: (path: NodePath, index: number) => void;
}>;

export const ghostButtonClassName =
  "min-h-9 rounded-lg border border-line px-3 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent";

const textareaClassName =
  "w-full resize-y rounded-lg border border-line bg-canvas px-3 py-2 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-accent";

export function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// The last string segment names the field; a trailing array index is already shown
// by the item header above it.
function fieldLabel(path: NodePath): string {
  for (let index = path.length - 1; index >= 0; index -= 1) {
    const segment = path[index];

    if (typeof segment === "string") {
      return humanize(segment);
    }
  }

  return "Text";
}

function Leaf({
  path,
  english,
  indonesian,
  onEdit,
}: Readonly<{ path: NodePath; english: string; indonesian: string }> &
  Pick<EditHandlers, "onEdit">) {
  const rows = Math.min(
    8,
    Math.max(2, Math.ceil(Math.max(english.length, indonesian.length) / 70)),
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{fieldLabel(path)}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {(
          [
            ["en", "English", english],
            ["id", "Indonesian", indonesian],
          ] as const
        ).map(([locale, label, value]) => (
          <label key={locale} className="space-y-1 text-xs text-muted">
            <span className="font-mono uppercase tracking-wide">{label}</span>
            <textarea
              className={textareaClassName}
              rows={rows}
              value={value}
              onChange={(event) => onEdit(locale, path, event.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

// Walks the English catalogue and pulls the Indonesian counterpart from the same path,
// so the form is generated from the JSON rather than listed field by field: a key added
// to a message file becomes editable with no change here.
export function Fields({
  path,
  english,
  indonesian,
  onEdit,
  onAdd,
  onRemove,
}: Readonly<{ path: NodePath; english: MessageNode; indonesian: MessageNode }> & EditHandlers) {
  const handlers = { onEdit, onAdd, onRemove };

  if (typeof english === "string") {
    return (
      <Leaf
        path={path}
        english={english}
        indonesian={typeof indonesian === "string" ? indonesian : ""}
        onEdit={onEdit}
      />
    );
  }

  if (Array.isArray(english)) {
    const translations = Array.isArray(indonesian) ? indonesian : [];

    return (
      <div className="space-y-3">
        {english.map((entry, index) => (
          <div key={index} className="space-y-3 rounded-lg border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-muted">#{index + 1}</span>
              <button
                type="button"
                className={ghostButtonClassName}
                onClick={() => onRemove(path, index)}
              >
                Remove
              </button>
            </div>
            <Fields
              path={[...path, index]}
              english={entry}
              indonesian={translations[index] ?? ""}
              {...handlers}
            />
          </div>
        ))}
        {/* With no existing entry there is no shape to copy, so adding is impossible
            rather than guessed. */}
        {english.length > 0 ? (
          <button type="button" className={ghostButtonClassName} onClick={() => onAdd(path)}>
            + Add item
          </button>
        ) : null}
      </div>
    );
  }

  const translations =
    typeof indonesian === "object" && !Array.isArray(indonesian) ? indonesian : {};

  return (
    <div className="space-y-4">
      {Object.entries(english).map(([key, value]) =>
        path.length === 0 ? (
          <details key={key} className="rounded-xl border border-line bg-surface px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold">{humanize(key)}</summary>
            <div className="pt-4">
              <Fields
                path={[key]}
                english={value}
                indonesian={translations[key] ?? ""}
                {...handlers}
              />
            </div>
          </details>
        ) : (
          <fieldset key={key} className="space-y-3 border-l-2 border-line pl-4">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted">
              {humanize(key)}
            </legend>
            <Fields
              path={[...path, key]}
              english={value}
              indonesian={translations[key] ?? ""}
              {...handlers}
            />
          </fieldset>
        ),
      )}
    </div>
  );
}
