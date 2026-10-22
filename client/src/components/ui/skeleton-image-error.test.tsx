import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let state = "loading";
const setState = vi.fn((next: string) => {
  state = next;
});

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, useState: () => [state, setState] };
});

import { SkeletonImage } from "./SkeletonImage";

type Tree = React.ReactElement<{ "data-loaded": string; children: React.ReactElement<{ onError: () => void; onLoad: () => void }> }>;
const render = () =>
  (SkeletonImage as unknown as (props: object) => Tree)({ src: "/x.png", width: 4, height: 3, alt: "x", sizes: "100vw" });

describe("SkeletonImage failure", () => {
  beforeEach(() => {
    state = "loading";
    setState.mockClear();
  });

  it("keeps shimmering while loading", () => {
    expect(render().props["data-loaded"]).toBe("false");
  });

  it("stops shimmering when the image fails", () => {
    render().props.children.props.onError();
    expect(state).toBe("error");
    expect(render().props["data-loaded"]).toBe("true");
  });

  it("stops shimmering when the image loads", () => {
    render().props.children.props.onLoad();
    expect(render().props["data-loaded"]).toBe("true");
  });
});
