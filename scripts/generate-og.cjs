#!/usr/bin/env node
//
// Generates the 1200×630 Open Graph cards in public/og/ (one per page) by
// rendering a small HTML template with headless Chrome. Fonts and the portrait
// are inlined as data URIs so the render needs no server.
//
// Run: `npm run og`  (re-run after changing the portrait, copy, or design)

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "og");
const SITE = "ivanbanov.dev";

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  process.env.CHROME_BIN,
].find((p) => p && fs.existsSync(p));
if (!CHROME) {
  console.error("og: no Chrome/Chromium found");
  process.exit(1);
}

const dataUri = (rel, mime) =>
  `data:${mime};base64,${fs.readFileSync(path.join(ROOT, "public", rel)).toString("base64")}`;
const font = (file) => dataUri(`fonts/${file}`, "font/woff2");

const CARDS = {
  index: {
    eyebrow: SITE,
    headline: "Ivan Banov",
    sub: "Software Engineer focused on design systems & developer experience",
    cta: `Visit ${SITE} →`,
  },
  cv: {
    eyebrow: "Curriculum Vitae",
    headline: "Ivan Banov",
    sub: "Frontend Engineer · Design Systems & UI Architecture · 15+ years",
    cta: `Read the CV → ${SITE}/cv`,
  },
};

const html = ({ eyebrow, headline, sub, cta }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>
  @font-face { font-family: Fraunces; src: url(${font("fraunces.woff2")}) format("woff2"); }
  @font-face { font-family: Fraunces; font-style: italic; src: url(${font("fraunces-italic.woff2")}) format("woff2"); }
  @font-face { font-family: Mono; src: url(${font("jetbrains-mono.woff2")}) format("woff2"); }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative; color: #2b323b;
    background: linear-gradient(180deg, #f6f7f9, #f0f2f5 55%, #e9ecf1);
    font-family: Fraunces, Georgia, serif; -webkit-font-smoothing: antialiased;
  }
  body::before {
    content: ""; position: absolute; inset: 0;
    background-image:
      radial-gradient(rgba(27,33,41,.1) 1.5px, transparent 2px),
      radial-gradient(rgba(27,33,41,.1) 1.5px, transparent 2px);
    background-size: 36px 36px; background-position: 0 0, 18px 18px;
    mask-image: linear-gradient(90deg, rgba(0,0,0,.35), #000 55%);
    -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,.35), #000 55%);
  }
  .card { position: relative; height: 100%; display: flex; align-items: center; gap: 72px; padding: 0 96px; }
  .photo {
    flex: none; width: 300px; height: 300px; border-radius: 50%; object-fit: cover;
    box-shadow: 0 0 0 1px rgba(27,33,41,.08), 0 0 0 14px rgba(255,255,255,.7), 0 30px 80px -30px rgba(15,20,26,.35);
  }
  .text { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
  .eyebrow { font-family: Mono, monospace; font-size: 22px; letter-spacing: .04em; color: #7a838e; }
  h1 { font-size: 92px; line-height: 1; font-weight: 600; letter-spacing: -.02em; color: #1b2129; }
  .sub { font-size: 30px; line-height: 1.3; font-style: italic; color: #4a535e; max-width: 640px; }
  .cta {
    margin-top: 10px; align-self: flex-start; font-family: Mono, monospace; font-size: 22px;
    padding: 14px 26px; border-radius: 999px; color: #f6f7f9; background: #1b2129;
  }
</style></head>
<body><div class="card">
  <img class="photo" src="${dataUri("profile.png", "image/png")}" alt="">
  <div class="text">
    <div class="eyebrow">${eyebrow}</div>
    <h1>${headline}</h1>
    <div class="sub">${sub}</div>
    <div class="cta">${cta}</div>
  </div>
</div></body></html>`;

fs.mkdirSync(OUT_DIR, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "og-"));

for (const [id, card] of Object.entries(CARDS)) {
  const src = path.join(tmp, `${id}.html`);
  const out = path.join(OUT_DIR, `${id}.png`);
  fs.writeFileSync(src, html(card));
  const r = spawnSync(
    CHROME,
    [
      "--headless=new",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1200,630",
      "--virtual-time-budget=3000",
      `--screenshot=${out}`,
      `file://${src}`,
    ],
    { stdio: "pipe" },
  );
  if (r.status !== 0 || !fs.existsSync(out)) {
    console.error(`og: failed for ${id}\n${r.stderr}`);
    process.exit(1);
  }
  console.log(`og: wrote public/og/${id}.png`);
}
fs.rmSync(tmp, { recursive: true, force: true });
