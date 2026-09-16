import { defineConfig } from "astro/config";
import { satteri } from "@astrojs/markdown-satteri";

// Small HTML tweaks over the rendered markdown so content/*.md stays plain:
//  - external links (http/https) open in a new tab
//  - a paragraph that is only an *emphasis* ("*Oct 2021 — Present · Berlin*")
//    gets class="meta" so the CSS can style it as a date/location line
const prose = {
  name: "prose",
  element: [
    {
      filter: ["a"],
      visit(node, ctx) {
        const href = String(node.properties?.href ?? "");
        if (!/^https?:\/\//.test(href)) return;
        ctx.setProperty(node, "target", "_blank");
        ctx.setProperty(node, "rel", "noopener");
      },
    },
    {
      filter: ["p"],
      visit(node, ctx) {
        const kids = node.children.filter((c) => !(c.type === "text" && !c.value.trim()));
        if (kids.length === 1 && kids[0].type === "element" && kids[0].tagName === "em") {
          ctx.setProperty(node, "className", ["meta"]);
        }
      },
    },
  ],
};

export default defineConfig({
  site: "https://ivanbanov.dev",
  markdown: {
    processor: satteri({ hastPlugins: [prose] }),
  },
});
