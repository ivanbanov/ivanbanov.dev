#!/usr/bin/env node
//
// Regenerates public/cv/Ivan-Banov-CV.pdf — the directly-downloadable CV —
// from the built site. Runs `astro build`, serves dist/, and prints /cv/ with
// headless Chrome through the page's @media print styles, so the file is
// identical to a browser "Save as PDF".
//
// As a pre-commit step (no args): regenerates ONLY when the CV source
// (content/cv.md) or anything under src/ is part of the commit, then stages
// the PDF so the download never drifts from the page.
// Manual run: `npm run cv:pdf` (= `--force`) regenerates unconditionally.

const { execSync, spawn, spawnSync } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = execSync("git rev-parse --show-toplevel").toString().trim();
const FORCE = process.argv.includes("--force");
const OUT = path.join(REPO_ROOT, "public", "cv", "Ivan-Banov-CV.pdf");
const DIST = path.join(REPO_ROOT, "dist");
const PORT = process.env.CV_PDF_PORT || "8799";
const URL = `http://localhost:${PORT}/cv/`;

// Skip unless the CV source or the site code is staged in this commit.
if (!FORCE) {
  const staged = execSync("git diff --cached --name-only", { cwd: REPO_ROOT })
    .toString()
    .split("\n");
  const touchesCv = staged.some((f) => f === "content/cv.md" || f.startsWith("src/"));
  if (!touchesCv) process.exit(0);
}

// Locate a Chrome/Chromium binary.
const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  process.env.CHROME_BIN,
].find((p) => p && fs.existsSync(p));

if (!CHROME) {
  console.error("cv-pdf: no Chrome/Chromium found; cannot regenerate the CV PDF");
  process.exit(1);
}

const waitForServer = (retries = 40) =>
  new Promise((resolve, reject) => {
    const tryOnce = (left) => {
      const req = http.get(URL, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (left <= 0) return reject(new Error("server did not start"));
        setTimeout(() => tryOnce(left - 1), 150);
      });
    };
    tryOnce(retries);
  });

(async () => {
  console.log("cv-pdf: building site");
  execSync("npx astro build", { cwd: REPO_ROOT, stdio: "inherit" });

  console.log("cv-pdf: regenerating public/cv/Ivan-Banov-CV.pdf");

  // Serve the build output. detached so we can kill the whole process group
  // (npx → node → http-server) on exit.
  const server = spawn("npx", ["-y", "http-server", DIST, "-p", PORT, "-s", "-c-1"], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: "ignore",
  });

  const cleanup = () => {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  };
  process.on("exit", cleanup);

  try {
    await waitForServer();

    const res = spawnSync(
      CHROME,
      ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${OUT}`, URL],
      { stdio: "ignore" },
    );
    if (res.status !== 0) throw new Error("Chrome failed to render the PDF");

    if (!FORCE) execSync(`git add ${JSON.stringify(OUT)}`, { cwd: REPO_ROOT });

    console.log("cv-pdf: done → public/cv/Ivan-Banov-CV.pdf");
  } finally {
    cleanup();
  }
})().catch((err) => {
  console.error(`cv-pdf: ${err.message}`);
  process.exit(1);
});
