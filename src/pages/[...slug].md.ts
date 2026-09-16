import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection, getEntry } from "astro:content";

// Serves the raw markdown of every page at /<id>.md (e.g. /index.md, /cv.md).
export const getStaticPaths: GetStaticPaths = async () => {
  const pages = await getCollection("pages");
  return pages.map((entry) => ({ params: { slug: entry.id } }));
};

export const GET: APIRoute = async ({ params }) => {
  const entry = (await getEntry("pages", params.slug!))!;
  return new Response(entry.body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
