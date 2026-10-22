import { useId } from "react";

import type { FactRef } from "@/lib/admin/schema";

import { isFieldDirty, type EditorAction, type EditorState } from "../state";
import { FieldFrame } from "./FieldFrame";
import { factRefIn, factValue, inputClass, type FieldProps } from "./shared";

// cover.kind is not a plain value: switching it replaces the whole cover (setCoverKind),
// so no key of the other kind survives.
function coverOf(ref: FactRef): FactRef | null {
  const path = ref.path;

  return path.length >= 2 && path[path.length - 1] === "kind" && path[path.length - 2] === "cover"
    ? { file: ref.file, path: path.slice(0, -1) }
    : null;
}

// Privacy and the lab source decide which other keys may exist, so they swap the whole
// entry shape instead of leaving hidden values the validator would reject.
export function shapeAction(ref: FactRef, value: string, state: EditorState): EditorAction | null {
  const [list, index, key] = ref.path;

  if (ref.path.length !== 3 || typeof index !== "number") {
    return null;
  }

  if (ref.file === "projects" && list === "selected" && key === "privacy" && (value === "public" || value === "private")) {
    const slug = state.draft.content.projects.selected[index]?.slug;
    return slug ? { type: "setAppPrivacy", slug, privacy: value } : null;
  }

  if (ref.file === "portfolio" && list === "lab" && key === "source" && (value === "repo" || value === "archive")) {
    const id = state.draft.content.portfolio.lab[index]?.id;
    return id ? { type: "setLabSource", id, source: value } : null;
  }

  return null;
}

export function SelectField({ field, scope, state, dispatch, actions }: FieldProps<"select">) {
  const id = useId();
  const ref = factRefIn(field.fact, scope);
  const raw = factValue(state.draft, ref);
  const value = typeof raw === "string" ? raw : "";
  const known = field.options.some((option) => option.value === value);
  const cover = coverOf(ref);
  const path = { scope: "fact", ref: cover ?? ref } as const;

  return (
    <FieldFrame
      id={id}
      label={field.label}
      hint={field.hint}
      htmlFor={`${id}-input`}
      dirty={isFieldDirty(state, { scope: "fact", ref })}
      onReset={() => dispatch({ type: "resetField", path })}
      actions={actions}
    >
      <select
        id={`${id}-input`}
        value={value}
        onChange={(event) => {
          const next = event.target.value;

          const shaped = shapeAction(ref, next, state);

          if (cover && (next === "pattern" || next === "image")) {
            dispatch({ type: "setCoverKind", ref: cover, kind: next });
          } else if (shaped) {
            dispatch(shaped);
          } else {
            dispatch({ type: "setFact", ref, value: next });
          }
        }}
        className={`${inputClass} h-11 max-w-sm`}
      >
        {known ? null : <option value={value}>{value || "Choose…"}</option>}
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}
