import { describe, expect, it } from "vitest";

import { EDITOR_SECTIONS } from "@/lib/admin/schema";
import { setCopy } from "@/lib/admin/operations";
import { repoDraft } from "@/lib/admin/test-draft";

import { filterFields } from "./search";

describe("filterFields", () => {
  it("finds the sections whose current text holds the query", () => {
    const hits = filterFields(EDITOR_SECTIONS, repoDraft(), "fastify").map((hit) => hit.sectionId);

    expect(hits).toContain("stack");
    expect(hits).toContain("services");
  });

  it("matches a field label, ignoring case", () => {
    const hits = filterFields(EDITOR_SECTIONS, repoDraft(), "SECTION TITLE");

    expect(hits.length).toBeGreaterThan(3);
    expect(hits.every((hit) => hit.fieldLabels.length > 0)).toBe(true);
  });

  it("matches the Indonesian text too", () => {
    const draft = setCopy(repoDraft(), "id", { domain: "portfolio", path: ["profile", "intro", "lead"] }, "Kalimat unik zxqv");

    const hits = filterFields(EDITOR_SECTIONS, draft, "zxqv");

    expect(hits.map((hit) => hit.sectionId)).toEqual(["hero"]);
  });

  it("returns nothing for a blank or unmatched query", () => {
    expect(filterFields(EDITOR_SECTIONS, repoDraft(), "  ")).toEqual([]);
    expect(filterFields(EDITOR_SECTIONS, repoDraft(), "qqqqnotthere")).toEqual([]);
  });

  it("keeps sections in page order", () => {
    const ids = filterFields(EDITOR_SECTIONS, repoDraft(), "fastify").map((hit) => hit.sectionId);
    const order = EDITOR_SECTIONS.map((section) => section.id);

    expect(ids).toEqual([...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
  });
});
