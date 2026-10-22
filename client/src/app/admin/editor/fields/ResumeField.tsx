import { FileUp } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { FactRef } from "@/lib/admin/schema";

import { FieldFrame } from "./FieldFrame";
import { badgeClass, smallButtonClass, type FieldProps } from "./shared";

const RESUME: FactRef = { file: "site", path: ["profile", "resumePath"] };

// The CV keeps its path from site.json; a new PDF replaces the file behind it.
export function ResumeField({ field, state, handlers, actions }: FieldProps<"resume">) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resumePath = state.draft.content.site.profile.resumePath;
  const pending = state.draft.media.some((entry) => entry.kind === "resume");
  const href = state.previews[resumePath] ?? resumePath;

  return (
    <FieldFrame
      id={id}
      label={field.label}
      hint={field.hint}
      dirty={pending}
      actions={actions}
      badges={pending ? <span className={`${badgeClass} bg-elevated text-muted`}>New file ready</span> : null}
    >
      <div className="flex flex-wrap items-center gap-2" aria-busy={busy}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 break-all font-mono text-xs text-accent underline-offset-2 hover:underline"
        >
          {resumePath}
        </a>
        <button
          type="button"
          disabled={busy}
          aria-label="Replace CV"
          onClick={() => input.current?.click()}
          className={smallButtonClass}
        >
          <FileUp aria-hidden="true" className="size-3.5" />
          {busy ? "Uploading…" : "Replace"}
        </button>
        <input
          ref={input}
          type="file"
          accept="application/pdf"
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";

            if (!file) {
              return;
            }

            setBusy(true);
            setError(null);
            setError(await handlers.upload("resume", file, RESUME));
            setBusy(false);
          }}
        />
      </div>
      {busy ? <div data-skeleton="true" className="mt-2 h-2 w-40 rounded-full bg-elevated motion-safe:animate-pulse" /> : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          {error}
        </p>
      ) : null}
    </FieldFrame>
  );
}
