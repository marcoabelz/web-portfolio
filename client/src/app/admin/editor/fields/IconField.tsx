import { Plus, X } from "lucide-react";
import { useId, useState } from "react";

import type { IconResult } from "@/lib/admin/media";
import { ICON_SPRITE_URL } from "@/lib/icons-sprite";
import { defaultMonogram } from "@/lib/monogram";

import { isFieldDirty } from "../state";
import { FieldFrame } from "./FieldFrame";
import { IconGlyph, IconPicker } from "./IconPicker";
import { factRefIn, factValue, inputClass, knownSkills, smallButtonClass, type FieldProps } from "./shared";

type SkillIcon = { name: string; icon: string | null; monogram?: string };

function asIcons(value: unknown): SkillIcon[] {
  return Array.isArray(value) ? (value as SkillIcon[]) : [];
}

// The same markup as TechChip. A logo the published site already ships comes from its
// sprite; one picked in this session is drawn from the search result's path.
export function IconChip({
  entry,
  spriteSlugs,
  paths,
}: Readonly<{ entry: SkillIcon; spriteSlugs: ReadonlySet<string>; paths: Readonly<Record<string, string>> }>) {
  const path = entry.icon ? paths[entry.icon] : undefined;
  const sprite = !entry.monogram && entry.icon && !path && spriteSlugs.has(entry.icon);

  return (
    <span className="chip chip-sm max-w-full">
      {!entry.monogram && path ? (
        <IconGlyph path={path} className="chip-logo" />
      ) : sprite ? (
        <svg className="chip-logo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <use href={`${ICON_SPRITE_URL}#si-${entry.icon}`} />
        </svg>
      ) : (
        <span className="chip-logo chip-mono" aria-hidden="true">
          {entry.monogram ?? defaultMonogram(entry.name)}
        </span>
      )}
      <span className="min-w-0 break-words">{entry.name}</span>
    </span>
  );
}

export function IconField({ field, scope, state, dispatch, handlers, actions }: FieldProps<"icon">) {
  const id = useId();
  const [editing, setEditing] = useState<string | null>(null);
  const [paths, setPaths] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState("");
  const ref = factRefIn(field.fact, scope);
  const icons = asIcons(factValue(state.draft, ref));
  const spriteSlugs = new Set(asIcons(factValue(state.base, ref)).flatMap((entry) => (entry.icon ? [entry.icon] : [])));
  const path = { scope: "fact", ref } as const;
  const write = (next: SkillIcon[]) => dispatch({ type: "setFact", ref, value: next });
  const replace = (name: string, entry: SkillIcon) => write(icons.map((other) => (other.name === name ? entry : other)));
  const missing = knownSkills(state.draft).filter((name) => !icons.some((entry) => entry.name === name));

  const add = () => {
    const name = adding.trim();

    if (name && !icons.some((entry) => entry.name === name)) {
      write([...icons, { name, icon: null }]);
      setEditing(name);
    }

    setAdding("");
  };

  return (
    <FieldFrame
      id={id}
      label={field.label}
      hint={field.hint}
      dirty={isFieldDirty(state, path)}
      onReset={() => dispatch({ type: "resetField", path })}
      actions={actions}
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {icons.map((entry) => {
          const open = editing === entry.name;
          const pickerId = `${id}-${entry.name.replace(/[^a-zA-Z0-9]/g, "-")}`;

          return (
            <li key={entry.name} className={open ? "sm:col-span-2" : undefined}>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas p-2">
                <div className="min-w-0 flex-1">
                  <IconChip entry={entry} spriteSlugs={spriteSlugs} paths={paths} />
                </div>
                <span className="hidden font-mono text-[11px] text-muted min-[480px]:inline">
                  {entry.monogram ? "monogram" : (entry.icon ?? "none")}
                </span>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={open ? pickerId : undefined}
                  aria-label={`Change icon for ${entry.name}`}
                  onClick={() => setEditing(open ? null : entry.name)}
                  className={smallButtonClass}
                >
                  {open ? "Done" : "Change"}
                </button>
                <button
                  type="button"
                  aria-label={`Remove icon for ${entry.name}`}
                  title={`Remove icon for ${entry.name}`}
                  onClick={() => write(icons.filter((other) => other.name !== entry.name))}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:text-accent"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
              {open ? (
                <div id={pickerId} className="mt-2">
                  <IconPicker
                    name={entry.name}
                    current={entry.monogram ? null : entry.icon}
                    monogram={entry.monogram ?? ""}
                    search={handlers.searchIcons}
                    onPick={(result: IconResult) => {
                      setPaths((known) => ({ ...known, [result.slug]: result.path }));
                      replace(entry.name, { name: entry.name, icon: result.slug });
                    }}
                    onNone={(monogram) =>
                      replace(entry.name, { name: entry.name, icon: null, ...(monogram.trim() ? { monogram: monogram.trim().toUpperCase() } : {}) })
                    }
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-add`} className="sr-only">
          Skill to give an icon
        </label>
        <input
          id={`${id}-add`}
          type="text"
          list={`${id}-missing`}
          value={adding}
          placeholder="Skill name"
          onChange={(event) => setAdding(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className={`${inputClass} max-w-xs flex-1`}
        />
        <datalist id={`${id}-missing`}>
          {missing.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <button type="button" onClick={add} disabled={!adding.trim()} className={smallButtonClass}>
          <Plus aria-hidden="true" className="size-3.5" />
          Add skill icon
        </button>
      </div>
    </FieldFrame>
  );
}
