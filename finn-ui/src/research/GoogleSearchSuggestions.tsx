import { useLayoutEffect, useRef } from "react";

const tags = new Set([
  "style",
  "div",
  "span",
  "a",
  "svg",
  "g",
  "path",
  "title",
  "p",
  "circle",
  "rect",
]);
const attributes = new Set([
  "class",
  "id",
  "title",
  "role",
  "aria-label",
  "aria-hidden",
  "tabindex",
  "style",
  "target",
  "rel",
  "href",
  "xmlns",
  "width",
  "height",
  "viewBox",
  "d",
  "fill",
  "fill-rule",
  "clip-rule",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "focusable",
  "transform",
  "cx",
  "cy",
  "r",
  "x",
  "y",
  "rx",
  "ry",
]);

function safeStyle(css: string) {
  // Shadow DOM contains the widget's selectors. Reject external resources and CSS escapes.
  return !/[\\]|@import|url\s*\(|image(?:-set)?\s*\(|expression\s*\(|position\s*:\s*fixed/i.test(
    css.replaceAll(/\/\*[\s\S]*?\*\//g, ""),
  );
}

function searchLink(href: string) {
  try {
    const link = new URL(href);
    return (
      link.protocol === "https:" &&
      !link.username &&
      !link.password &&
      !link.port &&
      ((link.hostname === "www.google.com" && link.pathname === "/search") ||
        (link.hostname === "vertexaisearch.cloud.google.com" &&
          link.pathname.startsWith("/grounding-api-redirect/")))
    );
  } catch {
    return false;
  }
}

export function searchSuggestionsFragment(
  html: string,
): DocumentFragment | null {
  const template = document.createElement("template");
  template.innerHTML = html;
  if (!template.content.querySelector("a[href]")) return null;
  for (const element of template.content.querySelectorAll("*")) {
    if (!tags.has(element.localName)) return null;
    if (element.localName === "style" && !safeStyle(element.textContent ?? ""))
      return null;
    for (const { name, value } of element.attributes) {
      if (!attributes.has(name)) return null;
      if (["style", "fill", "stroke"].includes(name) && !safeStyle(value))
        return null;
      if (name === "href" && (element.localName !== "a" || !searchLink(value)))
        return null;
      if (name === "target" && value !== "_blank" && value !== "_self")
        return null;
      if (name === "rel" && value.toLowerCase().split(/\s+/).includes("opener"))
        return null;
    }
  }
  return template.content;
}

export function GoogleSearchSuggestions({ html }: { html: string }) {
  const container = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = container.current;
    const fragment = searchSuggestionsFragment(html);
    if (!node || !fragment) return;
    const shadow = node.shadowRoot ?? node.attachShadow({ mode: "open" });
    shadow.replaceChildren(fragment);
    return () => shadow.replaceChildren();
  }, [html]);
  return <section ref={container} aria-label="Google Search suggestions" />;
}
