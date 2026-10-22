import { describe, expect, it } from "vitest";

import { fitWithin } from "./prepare-image";

describe("fitWithin", () => {
  it("fits a 12 MP photo inside 2400px without upscaling small ones", () => {
    expect(fitWithin(4032, 3024, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(640, 640, 2400)).toEqual({ width: 640, height: 640 });
  });

  it("scales portrait photos by the long edge", () => {
    expect(fitWithin(3024, 4032, 2400)).toEqual({ width: 1800, height: 2400 });
  });

  it("never returns a zero edge for extreme ratios", () => {
    expect(fitWithin(10000, 1, 2400)).toEqual({ width: 2400, height: 1 });
  });

  it("leaves an image exactly at the limit alone", () => {
    expect(fitWithin(2400, 1200, 2400)).toEqual({ width: 2400, height: 1200 });
  });
});
