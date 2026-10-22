import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildContact, type ContactModel } from "@/data/home";
import { getContentFiles } from "@/lib/content/load";
import { getMessages } from "@/i18n/messages";

import { Contact } from "./Contact";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const escapeHtml = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

describe.each(["en", "id"] as const)("contact section (%s)", (locale) => {
  const { site } = getContentFiles();
  const model = buildContact(locale);
  const { common, portfolio } = getMessages(locale);
  const link = (id: string) => site.socialLinks.find((social) => social.id === id)?.href;

  it("builds a hiring and a freelance path with the right actions", () => {
    expect(model.availability).toBe(portfolio.profile.availability);
    expect(model.email).toBe(site.profile.email);
    expect(model.paths.map((path) => path.kind)).toEqual(["hiring", "freelance"]);

    const [hiring, freelance] = model.paths;
    expect(hiring.actions).toEqual([
      { label: common.actions.downloadResume, href: site.profile.resumePath, external: false },
      { label: "LinkedIn", href: link("linkedIn"), external: true },
    ]);
    expect(freelance.actions).toEqual([
      { label: common.actions.emailMe, href: `mailto:${site.profile.email}`, external: false },
      { label: "WhatsApp", href: link("whatsApp"), external: true },
    ]);
    expect(model.socials.map((social) => social.id)).not.toContain("email");
  });

  it("renders the title, both cards, one availability dot per card, and safe links", () => {
    const html = renderToStaticMarkup(<Contact model={model} number="08" />);

    expect(html).toContain('id="contact"');
    expect(html).toContain('aria-labelledby="contact-heading"');
    expect(html).toContain("(08)");
    expect(html).toContain(escapeHtml(model.titleLead).replaceAll("'", "&#x27;"));
    expect(html).toContain(escapeHtml(model.titleAccent));
    model.socials.forEach((social) => expect(html).toContain(`>${social.label}<span class="sr-only">`));
    expect(html.match(/data-card="path"/g)).toHaveLength(2);
    expect(html.match(/data-availability-dot/g)).toHaveLength(2);
    expect(html.match(/class="contact-availability"/g)).toHaveLength(2);
    model.paths.forEach((path) => {
      expect(html).toContain(escapeHtml(path.title));
      expect(html).toContain(escapeHtml(path.description));
    });

    // Every external action and social opens a new tab safely; mailto and the CV do not.
    const externalCount =
      model.paths.flatMap((path) => path.actions).filter((action) => action.external).length +
      model.socials.length;
    expect(externalCount).toBeGreaterThanOrEqual(4);
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(externalCount);
    expect(html).toContain(`href="mailto:${escapeHtml(model.email)}"`);
    expect(html).not.toContain("mailto:undefined");
  });

  it("shows a long email and a long social set without a fixed-width layout", () => {
    const long: ContactModel = { ...model, email: `${"a".repeat(40)}@example-company-name.com` };
    const html = renderToStaticMarkup(<Contact model={long} number="08" />);

    expect(html).toContain(long.email);
    expect(html).not.toMatch(/whitespace-nowrap|white-space:\s*nowrap/);
  });
});

describe("contact styles", () => {
  const rule = (selector: string) =>
    new RegExp(`${selector.replace(".", "\\.")}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? "";

  it("wraps the large email and title instead of overflowing", () => {
    expect(rule(".contact-email")).toContain("overflow-wrap: anywhere");
    expect(rule(".contact-title")).toContain("overflow-wrap: anywhere");
    expect(css).not.toMatch(/\.contact-[a-z-]+\s*\{[^}]*nowrap/);
  });

  it("pulses the dot only when motion is allowed", () => {
    const outside = css.replace(/@media \(prefers-reduced-motion: no-preference\)\s*\{[\s\S]*?\n\}\n/g, "");
    expect(css).toMatch(/@media \(prefers-reduced-motion: no-preference\)/);
    expect(css).toContain("@keyframes contact-pulse");
    expect(outside).not.toMatch(/animation:\s*contact-pulse/);
    expect(css).toMatch(/animation:\s*contact-pulse/);
  });
});
