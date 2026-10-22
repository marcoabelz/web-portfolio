import { getAllMessages } from "@/i18n/messages";

import portfolioJson from "../../../content/portfolio.json";
import projectsJson from "../../../content/projects.json";
import siteJson from "../../../content/site.json";
import { checkCatalogParity, type MessageCatalogs } from "./catalog";
import type { ContentFileName, ContentFiles } from "./schema";
import { checkContentReferences, parseContentFiles, type ContentIssue } from "./validate";

// Static imports keep the three files in the bundle, so every page stays statically
// generated and a missing file fails the build instead of a request.
const RAW: Record<ContentFileName, unknown> = {
  site: siteJson,
  portfolio: portfolioJson,
  projects: projectsJson,
};

function describeIssues(issues: readonly ContentIssue[]): string {
  return [
    "The site content is invalid:",
    ...issues.map((issue) => `  ${issue.file} ${issue.path}: ${issue.message}`),
  ].join("\n");
}

// The pure core of getContentFiles. A broken file must stop the build with every
// problem listed, never render a half-broken page.
export function loadContentFrom(
  raw: Record<ContentFileName, unknown>,
  catalogs: MessageCatalogs,
): ContentFiles {
  const parsed = parseContentFiles(raw);

  if (!parsed.ok) {
    throw new Error(describeIssues(parsed.issues));
  }

  const issues = [...checkContentReferences(parsed.value, catalogs), ...checkCatalogParity(catalogs)];

  if (issues.length > 0) {
    throw new Error(describeIssues(issues));
  }

  return parsed.value;
}

let memo: ContentFiles | undefined;

export function getContentFiles(): ContentFiles {
  memo ??= loadContentFrom(RAW, getAllMessages());

  return memo;
}
