import { useId } from "react";

import { isFieldDirty } from "../state";
import { FieldFrame } from "./FieldFrame";
import { factRefIn, factValue, inputClass, type FieldProps } from "./shared";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Checked as the user types, but never blocks typing: the review stops the publish.
export function factProblem(input: "text" | "url" | "email", value: string): string | null {
  if (value === "") {
    return null;
  }

  if (input === "url" && !/^https:\/\/\S+$/.test(value)) {
    return "Must start with https://";
  }

  if (input === "email" && !EMAIL.test(value)) {
    return "Not a valid email address";
  }

  return null;
}

export function FactField({ field, scope, state, dispatch, actions }: FieldProps<"fact">) {
  const id = useId();
  const ref = factRefIn(field.fact, scope);
  const raw = factValue(state.draft, ref);
  const value = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
  const problem = factProblem(field.input, value);
  const path = { scope: "fact", ref } as const;

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
      <input
        id={`${id}-input`}
        type={field.input}
        value={value}
        inputMode={field.input === "url" ? "url" : field.input === "email" ? "email" : undefined}
        autoComplete="off"
        spellCheck={field.input === "text"}
        aria-invalid={problem ? true : undefined}
        aria-describedby={[field.hint ? `${id}-hint` : "", problem ? `${id}-problem` : ""].filter(Boolean).join(" ") || undefined}
        onChange={(event) => {
          const next = event.target.value;
          // An emptied URL drops the optional key (a live URL removed) instead of saving "".
          dispatch({ type: "setFact", ref, value: field.input === "url" && next === "" ? undefined : next });
        }}
        className={inputClass}
      />
      {problem ? (
        <p id={`${id}-problem`} className="mt-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          {problem}
        </p>
      ) : null}
    </FieldFrame>
  );
}
