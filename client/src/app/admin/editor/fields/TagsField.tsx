import { X } from "lucide-react";
import { useId, useState } from "react";

import { isFieldDirty } from "../state";
import { FieldFrame } from "./FieldFrame";
import { addTags, factRefIn, factValue, inputClass, knownSkills, type FieldProps } from "./shared";

// Chips with remove buttons; Enter or comma adds, Backspace on an empty input removes the
// last chip. Suggestions are every skill name the content already uses.
export function TagsField({ field, scope, state, dispatch, actions }: FieldProps<"tags">) {
  const id = useId();
  const [typed, setTyped] = useState("");
  const ref = factRefIn(field.fact, scope);
  const raw = factValue(state.draft, ref);
  const tags = Array.isArray(raw) ? raw.filter((tag): tag is string => typeof tag === "string") : [];
  const path = { scope: "fact", ref } as const;
  const listId = `${id}-skills`;

  const commit = (text: string) => {
    const next = addTags(tags, text);

    if (next.length !== tags.length) {
      dispatch({ type: "setFact", ref, value: next });
    }

    setTyped("");
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
      <div className="rounded-xl border border-line bg-canvas p-2 focus-within:border-accent">
        {tags.length > 0 ? (
          <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={`${field.label} tags`}>
            {tags.map((tag) => (
              <li key={tag} className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-elevated py-0.5 pl-2.5 pr-0.5 text-xs text-ink">
                <span className="min-w-0 break-words">{tag}</span>
                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  title={`Remove ${tag}`}
                  onClick={() => dispatch({ type: "setFact", ref, value: tags.filter((other) => other !== tag) })}
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent/15 hover:text-accent"
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          id={`${id}-input`}
          type="text"
          list={listId}
          value={typed}
          placeholder="Type a skill, then Enter"
          autoComplete="off"
          onChange={(event) => {
            const value = event.target.value;
            // A pasted "A, B" or a typed comma adds right away.
            if (value.includes(",")) {
              commit(value);
            } else {
              setTyped(value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit(typed);
            } else if (event.key === "Backspace" && typed === "" && tags.length > 0) {
              dispatch({ type: "setFact", ref, value: tags.slice(0, -1) });
            }
          }}
          onBlur={() => (typed.trim() ? commit(typed) : undefined)}
          className={`${inputClass} border-transparent bg-transparent px-1.5 py-1 focus:border-transparent`}
        />
        <datalist id={listId}>
          {knownSkills(state.draft)
            .filter((name) => !tags.includes(name))
            .map((name) => (
              <option key={name} value={name} />
            ))}
        </datalist>
      </div>
    </FieldFrame>
  );
}
