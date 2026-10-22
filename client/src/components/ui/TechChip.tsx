import { ICON_SPRITE_URL } from "@/lib/icons-sprite";
import type { TechTag } from "@/lib/content/models";

type TechChipProps = {
  tag: TechTag;
  size?: "sm" | "md";
};

export function TechChip({ tag, size = "md" }: TechChipProps) {
  const { icon } = tag;

  return (
    <span className={`chip${size === "sm" ? " chip-sm" : ""}`}>
      {icon.kind === "brand" ? (
        <svg className="chip-logo" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <use href={`${ICON_SPRITE_URL}#si-${icon.slug}`} />
        </svg>
      ) : (
        // Plain text instead of SVG text: a CSS rule sets the mono face and a
        // legible size, which an SVG scaled down to chip height could not.
        <span className="chip-logo chip-mono" aria-hidden="true">
          {icon.text}
        </span>
      )}
      <span>{tag.name}</span>
    </span>
  );
}
