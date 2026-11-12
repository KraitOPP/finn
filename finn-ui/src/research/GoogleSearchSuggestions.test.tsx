import { describe, expect, it } from "vitest";
import { searchSuggestionsFragment } from "./GoogleSearchSuggestions.tsx";

describe("Google Search suggestions", () => {
  const anchor =
    '<a class="chip" href="https://vertexaisearch.cloud.google.com/grounding-api-redirect/example">Company filings</a>';

  it("keeps the provider's styles, logo and link", () => {
    const widget = searchSuggestionsFragment(
      `<style>.chip{padding:4px}@media(prefers-color-scheme:dark){.chip{color:white}}</style>
       <div><svg viewBox="0 0 24 24"><path d="M1 1" fill="#123456"/></svg>${anchor}</div>`,
    );
    expect(widget?.querySelector("style")).toBeTruthy();
    expect(widget?.querySelector("svg")).toBeTruthy();
    expect(widget?.querySelector("a")?.textContent).toBe("Company filings");
  });

  it.each([
    "<script>alert(1)</script>",
    '<a href="https://example.org/search">Unapproved origin</a>',
    '<a href="javascript:alert(1)">Active link</a>',
    '<svg><path fill="url(https://example.org/external.svg#paint)" /></svg>',
    "<style>.chip{background:url(https://example.org/pixel)}</style>",
    '<div onclick="alert(1)">Active event</div>',
  ])("rejects unsafe provider markup", (markup) => {
    expect(searchSuggestionsFragment(anchor + markup)).toBeNull();
  });
});
