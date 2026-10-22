import { Plus } from "lucide-react";
import { useId } from "react";

import { isFieldDirty } from "../state";
import { BilingualInputs } from "./CopyField";
import { FieldFrame } from "./FieldFrame";
import { ItemActions } from "./ItemActions";
import { copyRefIn, copyValue, smallButtonClass, type FieldProps } from "./shared";

// A list of short strings in both languages. A fixed list (captions paired by position
// with screenshots) only edits its text: no add, remove, or reorder.
export function TextListField({ field, scope, state, dispatch, actions }: FieldProps<"textList">) {
  const id = useId();
  const copy = copyRefIn(field.copy, scope);
  const english = copyValue(state.draft, "en", copy);
  const items = Array.isArray(english) ? english : [];
  const path = { scope: "copy", ref: copy } as const;

  if (!Array.isArray(english)) {
    return null;
  }

  return (
    <FieldFrame
      id={id}
      label={field.label}
      hint={field.hint}
      dirty={isFieldDirty(state, path)}
      onReset={() => dispatch({ type: "resetField", path })}
      resetName={`Reset ${field.label} in both languages`}
      actions={actions}
    >
      <ol className="space-y-3">
        {items.map((_, index) => {
          const title = `item ${index + 1}`;

          return (
            <li key={index} className="space-y-2 border-l-2 border-line pl-3">
              <div className="flex items-center justify-between gap-2">
                <span id={`${id}-${index}-label`} className="font-mono text-[11px] text-muted">
                  {field.label} {index + 1}
                </span>
                {field.fixed ? null : (
                  <div className="flex gap-1.5">
                    <ItemActions
                      title={title}
                      index={index}
                      count={items.length}
                      onMove={(direction) => dispatch({ type: "moveCopyItem", ref: copy, index, direction })}
                      onRemove={() => dispatch({ type: "removeCopyItem", ref: copy, index })}
                    />
                  </div>
                )}
              </div>
              <BilingualInputs
                id={`${id}-${index}`}
                copy={{ domain: copy.domain, path: [...copy.path, index] }}
                labelledBy={`${id}-${index}-label`}
                state={state}
                dispatch={dispatch}
              />
            </li>
          );
        })}
      </ol>
      {field.fixed ? null : (
        <button
          type="button"
          onClick={() => dispatch({ type: "addCopyItem", ref: copy, template: "" })}
          className={`${smallButtonClass} mt-3`}
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Add
        </button>
      )}
    </FieldFrame>
  );
}
