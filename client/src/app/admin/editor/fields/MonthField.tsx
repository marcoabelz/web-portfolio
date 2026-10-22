import { useId } from "react";

import { isFieldDirty } from "../state";
import { FieldFrame } from "./FieldFrame";
import { factRefIn, factValue, inputClass, type FieldProps } from "./shared";

// A YYYY-MM month; with allowPresent, "Present" stores null for a current role.
export function MonthField({ field, scope, state, dispatch, actions }: FieldProps<"month">) {
  const id = useId();
  const ref = factRefIn(field.fact, scope);
  const raw = factValue(state.draft, ref);
  const present = field.allowPresent === true && raw === null;
  const path = { scope: "fact", ref } as const;
  // Unticking Present goes back to the published month, or this month for a new role,
  // so the field is never left empty and invalid.
  const fallback = () => {
    const original = factValue(state.base, ref);
    return typeof original === "string" && original ? original : new Date().toISOString().slice(0, 7);
  };

  return (
    <FieldFrame
      id={id}
      label={field.label}
      hint={field.hint}
      htmlFor={`${id}-input`}
      dirty={isFieldDirty(state, path)}
      onReset={() => dispatch({ type: "resetField", path })}
      actions={actions}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          id={`${id}-input`}
          type="month"
          value={typeof raw === "string" ? raw : ""}
          disabled={present}
          onChange={(event) => dispatch({ type: "setFact", ref, value: event.target.value })}
          className={`${inputClass} max-w-[14rem] disabled:opacity-50`}
        />
        {field.allowPresent ? (
          <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={present}
              onChange={(event) => dispatch({ type: "setFact", ref, value: event.target.checked ? null : fallback() })}
              className="size-4 accent-[rgb(var(--accent))]"
            />
            Present
          </label>
        ) : null}
      </div>
    </FieldFrame>
  );
}
