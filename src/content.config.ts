import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// One markdown file per page. Each is rendered to HTML and also served raw
// at /<id>.md (see src/pages/[...slug].md.ts).
const pages = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { pages };
