import { describe, expect, it } from "vitest";

import { buildPortfolioContext } from "@/lib/chat/prompt";

describe("buildPortfolioContext", () => {
  const context = buildPortfolioContext();

  it("includes the profile identity and contact facts", () => {
    expect(context).toContain("Marco Abel Zefanya");
    expect(context).toContain("Full-Stack Engineer");
    expect(context).toContain("Jakarta, Indonesia");
    expect(context).toContain("marcoabel25@gmail.com");
  });

  it("includes every role with its period and stack", () => {
    expect(context).toContain("Satellyte");
    expect(context).toContain("PT Nexio Teknologi");
    expect(context).toContain("PT Delta Anugrah");
    expect(context).toContain("PT SYS Indonesia");
    expect(context).toContain("September 2021");
    expect(context).toContain("BullMQ");
  });

  it("includes every selected project with its access status", () => {
    expect(context).toContain("Palmgrade");
    expect(context).toContain("https://satellyte.ai");
    expect(context).toContain("private, no public link");
  });

  it("includes archive projects, skills, education and languages", () => {
    expect(context).toContain("Omahucok");
    expect(context).toContain("TypeScript");
    expect(context).toContain("Hacktiv8");
    expect(context).toContain("Working Proficiency");
  });
});
