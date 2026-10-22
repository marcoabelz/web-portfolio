import { useId } from "react";

import { isFieldDirty } from "../state";
import { FieldFrame } from "./FieldFrame";
import { factRefIn, factValue, type FieldProps } from "./shared";

export function ToggleField({ field, scope, state, dispatch, actions }: FieldProps<"toggle">) {
  const id = useId();
  const ref = factRefIn(field.fact, scope);
  const on = factValue(state.draft, ref) === true;
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
      <button
        id={`${id}-input`}
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => dispatch({ type: "setFact", ref, value: !on })}
        className="inline-flex min-h-9 items-center gap-2 text-sm text-ink"
      >
        <span
          aria-hidden="true"
          className={`relative h-6 w-10 rounded-full border transition-colors ${on ? "border-accent bg-accent" : "border-line bg-elevated"}`}
        >
          <span
            className={`absolute top-0.5 size-[18px] rounded-full bg-surface shadow transition-[left] motion-reduce:transition-none ${on ? "left-[18px]" : "left-0.5"}`}
          />
        </span>
        {on ? "On" : "Off"}
      </button>
    </FieldFrame>
  );
}
