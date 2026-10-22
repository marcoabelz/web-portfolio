import { ImageUp } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { FactRef } from "@/lib/admin/schema";

import type { EditorHandlers } from "../EditorLayout";
import { isFieldDirty } from "../state";
import { CopyField } from "./CopyField";
import { FieldFrame } from "./FieldFrame";
import { factRefIn, factValue, smallButtonClass, type FieldProps } from "./shared";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

type Image = { src: string; width: number; height: number };

function asImage(value: unknown): Image | null {
  const image = value as Partial<Image> | null;

  return typeof image === "object" && image !== null && typeof image.src === "string"
    ? { src: image.src, width: Number(image.width) || 0, height: Number(image.height) || 0 }
    : null;
}

// One picture with its Replace button. The editor's upload handler shrinks and converts
// the file in the browser (prepareImage) before anything is sent.
function ImageSlot({
  label,
  image,
  target,
  previews,
  handlers,
}: Readonly<{
  label: string;
  image: Image;
  target: FactRef;
  previews: Record<string, string>;
  handlers: EditorHandlers;
}>) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const src = previews[image.src] ?? image.src;
  const ratio = image.width > 0 && image.height > 0 ? `${image.width} / ${image.height}` : "16 / 10";

  return (
    <figure className="min-w-0 space-y-2">
      <div
        className="relative overflow-hidden rounded-xl border border-line bg-elevated"
        style={{ aspectRatio: ratio, maxHeight: "18rem" }}
        aria-busy={busy}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- previews are blob: URLs next/image cannot load
          <img src={src} alt="" className={`size-full object-contain ${busy ? "opacity-30" : ""}`} />
        ) : (
          <div className="flex size-full items-center justify-center p-4 text-center text-xs text-muted">No image yet</div>
        )}
        {busy ? <div data-skeleton="true" className="absolute inset-0 bg-elevated/70 motion-safe:animate-pulse" /> : null}
      </div>
      <figcaption className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          aria-label={`${src ? "Replace" : "Upload"} ${label}`}
          onClick={() => input.current?.click()}
          className={smallButtonClass}
        >
          <ImageUp aria-hidden="true" className="size-3.5" />
          {busy ? "Uploading…" : src ? "Replace" : "Upload"}
        </button>
        <input
          ref={input}
          id={id}
          type="file"
          accept={IMAGE_ACCEPT}
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
            setError(await handlers.upload("image", file, target));
            setBusy(false);
          }}
        />
        {image.width > 0 ? (
          <span className="font-mono text-[11px] text-muted">
            {image.width}×{image.height}
          </span>
        ) : null}
      </figcaption>
      {error ? (
        <p role="alert" className="text-xs font-medium text-amber-700 dark:text-amber-300">
          {error}
        </p>
      ) : null}
    </figure>
  );
}

// `fact` points at one image or at an array of them (a gallery, replaced one by one).
export function ImageField({ field, scope, state, dispatch, handlers, actions }: FieldProps<"image">) {
  const id = useId();
  const ref = factRefIn(field.fact, scope);
  const value = factValue(state.draft, ref);
  const path = { scope: "fact", ref } as const;
  const slots = Array.isArray(value)
    ? value.map((item, index) => ({ image: asImage(item), target: { file: ref.file, path: [...ref.path, index] }, label: `${field.label} ${index + 1}` }))
    : [{ image: asImage(value), target: ref, label: field.label }];

  return (
    <FieldFrame
      id={id}
      label={field.label}
      hint={field.hint}
      dirty={isFieldDirty(state, path)}
      onReset={() => dispatch({ type: "resetField", path })}
      actions={actions}
    >
      <div className={Array.isArray(value) ? "grid gap-4 sm:grid-cols-2" : "max-w-md"}>
        {slots.map((slot) =>
          slot.image ? (
            <ImageSlot
              key={slot.label}
              label={slot.label}
              image={slot.image}
              target={slot.target}
              previews={state.previews}
              handlers={handlers}
            />
          ) : null,
        )}
        {slots.length === 0 ? <p className="text-xs text-muted">No images.</p> : null}
      </div>
      {field.alt ? (
        <div className="mt-4">
          <CopyField
            field={{ kind: "text", label: "Alt text", copy: field.alt, hint: "Describes the image for screen readers" }}
            scope={scope}
            state={state}
            dispatch={dispatch}
            handlers={handlers}
          />
        </div>
      ) : null}
    </FieldFrame>
  );
}
