import { Plus } from "lucide-react";
import { useId } from "react";

import { isFieldDirty } from "../state";
import { FieldFrame } from "./FieldFrame";
import { FieldRenderer } from "./FieldRenderer";
import { ItemActions } from "./ItemActions";
import { copyRefIn, copyValue, smallButtonClass, type FieldProps } from "./shared";

// A list of copy items (paragraphs, or small objects such as process steps), edited in
// both languages at once. Item fields use paths relative to one item.
export function CopyListField({ field, scope, state, dispatch, handlers, actions }: FieldProps<"copyList">) {
  const id = useId();
  const copy = copyRefIn(field.copy, scope);
  const english = copyValue(state.draft, "en", copy);
  const path = { scope: "copy", ref: copy } as const;

  if (!Array.isArray(english)) {
    return null;
  }

  // A list of plain strings shows each item as one field whose header holds its controls.
  const single = field.item.length === 1 && field.item[0].kind !== "collection" ? field.item[0] : null;

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
        {english.map((_, index) => {
          const title = `item ${index + 1}`;
          const itemScope = { copyBase: [...copy.path, index], factBase: scope.factBase };
          const controls = (
            <ItemActions
              title={title}
              index={index}
              count={english.length}
              onMove={(direction) => dispatch({ type: "moveCopyItem", ref: copy, index, direction })}
              onRemove={() => dispatch({ type: "removeCopyItem", ref: copy, index })}
            />
          );

          return (
            <li key={index}>
              {single ? (
                <FieldRenderer
                  field={{ ...single, label: `Item ${index + 1}`, hint: undefined }}
                  scope={itemScope}
                  state={state}
                  dispatch={dispatch}
                  handlers={handlers}
                  actions={controls}
                />
              ) : (
                <div className="space-y-3 rounded-xl border border-line bg-canvas/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-muted">Item {index + 1}</span>
                    <div className="flex gap-1.5">{controls}</div>
                  </div>
                  {field.item.map((item, at) => (
                    <FieldRenderer
                      key={`${item.label}-${at}`}
                      field={item}
                      scope={itemScope}
                      state={state}
                      dispatch={dispatch}
                      handlers={handlers}
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={() => dispatch({ type: "addCopyItem", ref: copy, template: field.template })}
        className={`${smallButtonClass} mt-3`}
      >
        <Plus aria-hidden="true" className="size-3.5" />
        Add
      </button>
    </FieldFrame>
  );
}
