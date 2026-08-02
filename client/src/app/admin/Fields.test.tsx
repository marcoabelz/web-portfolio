import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getMessages } from "@/i18n/messages";
import { leafPaths, MESSAGE_DOMAINS, type MessageNode } from "@/lib/admin/draft";

import { Fields } from "./Fields";

const noop = () => {};

function render(english: MessageNode, indonesian: MessageNode): string {
  return renderToStaticMarkup(
    <Fields
      path={[]}
      english={english}
      indonesian={indonesian}
      onEdit={noop}
      onAdd={noop}
      onRemove={noop}
    />,
  );
}

function occurrences(markup: string, needle: string): number {
  return markup.split(needle).length - 1;
}

describe("admin fields", () => {
  // The form is generated from the JSON rather than listed field by field, so this is
  // the check that no wording in the real catalogue is left uneditable.
  it.each(MESSAGE_DOMAINS)("gives every %s.json string both languages", (domain) => {
    const english = getMessages("en")[domain] as MessageNode;
    const leaves = leafPaths(english);

    const markup = render(english, getMessages("id")[domain] as MessageNode);

    expect(leaves.length).toBeGreaterThan(0);
    expect(occurrences(markup, "<textarea")).toBe(leaves.length * 2);
  });

  it("pairs each English box with the Indonesian one at the same path", () => {
    const markup = render({ profile: { title: "Engineer" } }, { profile: { title: "Insinyur" } });

    expect(markup).toContain(">Engineer</textarea>");
    expect(markup).toContain(">Insinyur</textarea>");
  });

  it("offers add and remove per list, and nothing to add on an empty one", () => {
    const list = { tags: ["First", "Second"], empty: [] };

    const markup = render(list, { tags: ["Pertama", "Kedua"], empty: [] });

    expect(occurrences(markup, "Remove")).toBe(2);
    expect(occurrences(markup, "+ Add item")).toBe(1);
  });

  it("still renders a field the Indonesian file has not caught up with", () => {
    const markup = render({ newHeading: "Fresh" }, {});

    expect(markup).toContain("New Heading");
    expect(occurrences(markup, "<textarea")).toBe(2);
  });
});
