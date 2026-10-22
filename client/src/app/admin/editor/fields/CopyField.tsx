import { useEffect, useId, useRef, type Dispatch } from "react";

import type { CopyRef } from "@/lib/admin/schema";

import { isFieldDirty, type EditorAction, type EditorState } from "../state";
import { FieldFrame } from "./FieldFrame";
import {
  badgeClass,
  copyRefIn,
  copyValue,
  inputClass,
  placeholderStatus,
  translationStatus,
  type FieldProps,
} from "./shared";

const LANGUAGES = [
  ["en", "English"],
  ["id", "Indonesian"],
] as const;

// Grows with its text, so a long paragraph never hides behind a scrollbar.
function AutoTextarea({
  minRows,
  ...props
}: Readonly<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string; minRows: number }>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = ref.current;

    if (element) {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight + 2}px`;
    }
  }, [props.value]);

  return <textarea ref={ref} rows={Math.min(10, Math.max(minRows, Math.ceil(props.value.length / 60)))} {...props} />;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// The English and Indonesian inputs for one copy path, side by side from 768px.
export function BilingualInputs({
  id,
  copy,
  multiline,
  softLimit,
  labelledBy,
  state,
  dispatch,
}: Readonly<{
  id: string;
  copy: CopyRef;
  multiline?: boolean;
  softLimit?: number;
  // The field label's id, so each input is announced as "Title, English".
  labelledBy?: string;
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
}>) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {LANGUAGES.map(([locale, language]) => {
        // Lines with a soft limit (intro, notes) can outgrow one input row.
        const wraps = !multiline && softLimit !== undefined;
        const value = text(copyValue(state.draft, locale, copy));
        const inputId = `${id}-${locale}`;
        const over = softLimit !== undefined && value.length > softLimit;
        const common = {
          id: inputId,
          value,
          lang: locale,
          "aria-labelledby": labelledBy ? `${labelledBy} ${inputId}-lang` : undefined,
          onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            dispatch({ type: "setCopy", locale, ref: copy, value: event.target.value }),
          className: multiline || wraps ? `${inputClass} resize-none leading-relaxed` : inputClass,
        };

        return (
          <div key={locale} className="min-w-0 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                id={`${inputId}-lang`}
                htmlFor={inputId}
                className="font-mono text-[11px] font-medium uppercase tracking-wide text-muted"
              >
                {language}
              </label>
              {softLimit !== undefined ? (
                <span
                  data-over={over ? "true" : "false"}
                  className={`font-mono text-[11px] tabular-nums ${over ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted"}`}
                >
                  {value.length}/{softLimit}
                </span>
              ) : null}
            </div>
            {multiline ? (
              <AutoTextarea minRows={2} {...common} />
            ) : wraps ? (
              // A one-line text that may run long wraps instead of hiding its end.
              <AutoTextarea minRows={1} {...common} />
            ) : (
              <input type="text" {...common} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CopyField({ field, scope, state, dispatch, actions }: FieldProps<"text" | "paragraph">) {
  const id = useId();
  const copy = copyRefIn(field.copy, scope);
  const english = copyValue(state.draft, "en", copy);
  const indonesian = copyValue(state.draft, "id", copy);

  // A path neither catalogue has would accept no edits; the schema tests catch it.
  if (typeof english !== "string" && typeof indonesian !== "string") {
    return null;
  }

  const untranslated = translationStatus(text(english), text(indonesian)) === "untranslated";
  const placeholders = placeholderStatus(text(english), text(indonesian));
  const path = { scope: "copy", ref: copy } as const;

  return (
    <FieldFrame
      id={id}
      label={field.label}
      hint={field.hint}
      dirty={isFieldDirty(state, path)}
      onReset={() => dispatch({ type: "resetField", path })}
      resetName={`Reset ${field.label} in both languages`}
      actions={actions}
      badges={
        untranslated ? (
          <span className={`${badgeClass} bg-amber-500/15 text-amber-700 dark:text-amber-300`}>Untranslated</span>
        ) : null
      }
    >
      <BilingualInputs
        id={id}
        copy={copy}
        multiline={field.kind === "paragraph"}
        softLimit={field.softLimit}
        labelledBy={`${id}-label`}
        state={state}
        dispatch={dispatch}
      />
      {placeholders.tokens.length > 0 || placeholders.differ ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          {placeholders.tokens.length > 0 ? <span className="text-muted">Keep as is:</span> : null}
          {placeholders.tokens.map((token) => (
            <code key={token} className="rounded-md border border-line bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink">
              {token}
            </code>
          ))}
          {placeholders.differ ? (
            <span role="status" className="font-medium text-amber-700 dark:text-amber-300">
              Placeholders differ between the languages
            </span>
          ) : null}
        </div>
      ) : null}
    </FieldFrame>
  );
}
