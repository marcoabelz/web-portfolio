import { ChevronDown, Plus } from "lucide-react";
import { useId, useState, type Dispatch } from "react";

import { addEntry } from "@/lib/admin/operations";
import type { FieldDef } from "@/lib/admin/schema";
import { COLLECTIONS, type CollectionDef } from "@/lib/content/collections";

import type { EditorHandlers } from "../EditorLayout";
import type { EditorAction, EditorState } from "../state";
import { FieldRenderer } from "./FieldRenderer";
import { ItemActions } from "./ItemActions";
import { badgeClass, factValue, inputClass, readAt, smallButtonClass, type FieldProps } from "./shared";

type CollectionFieldDef = Extract<FieldDef, { kind: "collection" }>;

function definition(field: CollectionFieldDef): CollectionDef {
  const def = COLLECTIONS.find((candidate) => candidate.id === field.collection);

  if (!def) {
    throw new Error(`Unknown collection ${field.collection}`);
  }

  return def;
}

function entriesOf(state: EditorState, def: CollectionDef, from: "draft" | "base"): Record<string, unknown>[] {
  const list = readAt(state[from].content[def.facts.file], def.facts.path);

  return Array.isArray(list) ? (list as Record<string, unknown>[]) : [];
}

// One entry: a collapsed card titled from `titleFrom`, opened to edit its fields.
export function CollectionEntry({
  field,
  id,
  index,
  count,
  title,
  state,
  dispatch,
  handlers,
  defaultOpen = false,
}: Readonly<{
  field: CollectionFieldDef;
  id: string;
  index: number;
  count: number;
  title: string;
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  handlers: EditorHandlers;
  defaultOpen?: boolean;
}>) {
  const def = definition(field);
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const added = !entriesOf(state, def, "base").some((entry) => entry[def.idKey] === id);
  const scope = {
    copyBase: def.copy ? [...def.copy.path, id] : [],
    factBase: [...def.facts.path, index],
  };

  return (
    <li data-entry={id} className="rounded-2xl border border-line bg-surface">
      <div className="flex items-center gap-2 p-2 pl-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left"
        >
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
          <span className="min-w-0 break-words text-sm font-medium text-ink">{title}</span>
          {added ? <span className={`${badgeClass} bg-accent/15 text-accent`}>New</span> : null}
        </button>
        <div className="flex shrink-0 gap-1.5">
          <ItemActions
            title={title}
            index={index}
            count={count}
            onMove={(direction) => dispatch({ type: "moveEntry", collection: field.collection, id, direction })}
            onRemove={() => dispatch({ type: "removeEntry", collection: field.collection, id })}
          />
        </div>
      </div>
      {open ? (
        <div id={bodyId} className="space-y-4 border-t border-line p-3 sm:p-4">
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{def.idKey === "slug" ? "Slug" : "Id"}</span>
            <code className="break-all rounded-md bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink">{id}</code>
            <span>fixed once created</span>
          </p>
          {field.fields.map((child, at) => (
            <FieldRenderer
              key={`${child.label}-${at}`}
              field={child}
              scope={scope}
              state={state}
              dispatch={dispatch}
              handlers={handlers}
            />
          ))}
        </div>
      ) : (
        <div id={bodyId} hidden />
      )}
    </li>
  );
}

export function CollectionField({ field, state, dispatch, handlers, actions }: FieldProps<"collection">) {
  const def = definition(field);
  const id = useId();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string[]>([]);
  const entries = entriesOf(state, def, "draft");

  const add = () => {
    const seed = { name: name.trim() };

    if (!seed.name) {
      return;
    }

    // The reducer runs the same pure addEntry, so this is the id it will create.
    const next = addEntry(state.draft, field.collection, seed).id;
    dispatch({ type: "addEntry", collection: field.collection, seed });
    setFresh((ids) => [...ids, next]);
    setName("");
    setNaming(false);
  };

  return (
    <div role="group" aria-labelledby={`${id}-label`} data-collection={field.collection} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 id={`${id}-label`} className="text-sm font-semibold text-ink">
            {field.label}
            <span className="ml-2 font-mono text-[11px] font-normal text-muted">{entries.length}</span>
          </h2>
          {field.hint ? <p className="mt-1 text-xs text-muted">{field.hint}</p> : null}
        </div>
        {actions}
      </div>
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">No entries yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry, index) => {
            const key = String(entry[def.idKey]);
            const titled = factValue(state.draft, {
              file: field.titleFrom.file,
              path: [...def.facts.path, index, ...field.titleFrom.path],
            });

            return (
              <CollectionEntry
                key={key}
                field={field}
                id={key}
                index={index}
                count={entries.length}
                title={typeof titled === "string" && titled.trim() ? titled : key}
                state={state}
                dispatch={dispatch}
                handlers={handlers}
                defaultOpen={fresh.includes(key)}
              />
            );
          })}
        </ul>
      )}
      {naming ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            add();
          }}
        >
          <label htmlFor={`${id}-name`} className="sr-only">
            Name of the new entry
          </label>
          <input
            id={`${id}-name`}
            type="text"
            value={name}
            autoFocus
            placeholder="Name"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => (event.key === "Escape" ? setNaming(false) : undefined)}
            className={`${inputClass} max-w-xs flex-1`}
          />
          <button type="submit" disabled={!name.trim()} className={smallButtonClass}>
            Add
          </button>
          <button type="button" onClick={() => setNaming(false)} className={smallButtonClass}>
            Cancel
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setNaming(true)} className={smallButtonClass}>
          <Plus aria-hidden="true" className="size-3.5" />
          Add
        </button>
      )}
    </div>
  );
}
