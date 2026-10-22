import { getContentFiles } from "@/lib/content/load";
import { buildIconSprite } from "@/lib/icons";

export const dynamic = "force-static";

// Same-origin on purpose: external <use> references only resolve for the same origin, and
// then inherit `currentColor` from the referencing <svg>.
export function GET() {
  const slugs = getContentFiles().portfolio.skillIcons.flatMap(({ icon }) => (icon ? [icon] : []));
  return new Response(buildIconSprite(slugs), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=31536000",
    },
  });
}
