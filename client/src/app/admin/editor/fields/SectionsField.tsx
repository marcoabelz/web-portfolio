import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { useId } from "react";

import type { FactRef } from "@/lib/admin/schema";

import { isFieldDirty } from "../state";
import { FieldFrame } from "./FieldFrame";
import { iconButtonClass, moved, type FieldProps } from "./shared";

const SECTIONS: FactRef = { file: "site", path: ["sections"] };

const NAMES: Record<string, string> = {
  apps: "Apps",
  about: "About",
  services: "Services",
  experience: "Experience",
  stack: "Stack",
  testimonials: "Testimonials",
  lab: "Lab",
  contact: "Contact",
};

type Row = { id: string; visible: boolean };

// The homepage sections in order, each with a visibility toggle and move up/down.
export function SectionsField({ field, state, dispatch, actions }: FieldProps<"sections">) {
  const id = useId();
  const rows = state.draft.content.site.sections as Row[];
  const path = { scope: "fact", ref: SECTIONS } as const;
  const write = (next: Row[]) => dispatch({ type: "setFact", ref: SECTIONS, value: next });

  return (
    <FieldFrame
      id={id}
      label={field.label}
      hint={field.hint}
      dirty={isFieldDirty(state, path)}
      onReset={() => dispatch({ type: "resetField", path })}
      actions={actions}
    >
      <ol className="space-y-2">
        {rows.map((row, index) => {
          const name = NAMES[row.id] ?? row.id;

          return (
            <li
              key={row.id}
              data-section-row={row.id}
              className={`flex items-center gap-2 rounded-xl border border-line bg-canvas p-2 pl-3 ${row.visible ? "" : "opacity-60"}`}
            >
              <span className="w-6 font-mono text-[11px] tabular-nums text-muted">{String(index + 1).padStart(2, "0")}</span>
              <span className={`min-w-0 flex-1 break-words text-sm ${row.visible ? "text-ink" : "text-muted line-through"}`}>{name}</span>
              <button
                type="button"
                aria-pressed={row.visible}
                aria-label={`Show ${name}`}
                title={row.visible ? `Hide ${name}` : `Show ${name}`}
                onClick={() => write(rows.map((other, at) => (at === index ? { ...other, visible: !other.visible } : other)))}
                className={`${iconButtonClass} aria-pressed:text-accent`}
              >
                {row.visible ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
              </button>
              <button
                type="button"
                aria-label={`Move ${name} up`}
                disabled={index === 0}
                onClick={() => write(moved(rows, index, -1))}
                className={iconButtonClass}
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Move ${name} down`}
                disabled={index === rows.length - 1}
                onClick={() => write(moved(rows, index, 1))}
                className={iconButtonClass}
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>
            </li>
          );
        })}
      </ol>
    </FieldFrame>
  );
}
