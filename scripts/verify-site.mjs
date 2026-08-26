import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;

const check = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};

const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");
const exists = async (relativePath) => {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
};
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const [html, css, redirect] = await Promise.all([
  read("index.html"),
  read("site.css"),
  read(path.join("paper", "index.html")),
]);

const buildCheck = spawnSync(process.execPath, [path.join(root, "scripts", "build-site.mjs"), "--check"], { encoding: "utf8" });
check(buildCheck.status === 0, buildCheck.stderr.trim() || buildCheck.stdout.trim() || "Generated site files are stale.");
for (const sourcePath of [
  "shared/index.template.html",
  "shared/styles.template.css",
  "shared/math.js",
  "sections/history/section.html",
  "sections/history/styles.css",
  "sections/computer-assisted/section.html",
  "sections/computer-assisted/figures.js",
  "sections/bifurcation/section.html",
  "sections/bifurcation/figures.js",
]) {
  check(await exists(sourcePath), `Missing authored source file ${sourcePath}.`);
}

check(/<!doctype html>/i.test(html), "Missing HTML doctype.");
check(/<html\s+lang=(['"])en\1/i.test(html), "The document language is not English.");
check(/<meta\s+name=(['"])viewport\1/i.test(html), "Missing responsive viewport declaration.");
check(/<meta\s+name=(['"])robots\1\s+content=(['"])noindex,nofollow,noarchive\2/i.test(html), "Missing complete noindex safeguard.");
check(/\.\.\//.test(redirect), "The compatibility page no longer redirects to the root page.");

const ids = [...html.matchAll(/\bid=(['"])(.*?)\1/g)].map((match) => match[2]);
const uniqueIds = new Set(ids);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
check(duplicateIds.length === 0, `Duplicate ids: ${duplicateIds.join(", ")}`);

for (const match of html.matchAll(/\bhref=(['"])#([^'"?]+)\1/g)) {
  check(uniqueIds.has(match[2]), `Missing fragment target #${match[2]}.`);
}
for (const match of html.matchAll(/\b(?:aria-labelledby|aria-describedby)=(['"])(.*?)\1/g)) {
  for (const id of match[2].split(/\s+/).filter(Boolean)) {
    check(uniqueIds.has(id), `Missing ARIA reference #${id}.`);
  }
}
for (const match of html.matchAll(/<label\b[^>]*\bfor=(['"])(.*?)\1/gi)) {
  check(uniqueIds.has(match[2]), `Label points to missing control #${match[2]}.`);
}

const localResources = [...html.matchAll(/\b(?:src|href)=(['"])(.*?)\1/g)]
  .map((match) => match[2].split(/[?#]/)[0])
  .filter((value) => value && !/^(?:https?:|mailto:|data:|#)/i.test(value));
for (const resource of localResources) {
  check(await exists(resource), `Missing local resource ${resource}.`);
}

const expectedSections = ["top", "history", "computer-assisted", "berenstein-extension", "bifurcation", "comparison", "sources"];
const actualSections = [...html.matchAll(/<section\s+id=(['"])(.*?)\1/g)].map((match) => match[2]);
check(JSON.stringify(actualSections) === JSON.stringify(expectedSections), `Unexpected top-level section sequence: ${actualSections.join(" → ")}.`);
check((html.match(/<h[123]\b/g) || []).length <= 40, "The canonical page has accumulated too many headings.");
check((html.match(/<button\b/g) || []).length === 4, "The page should have exactly four stage buttons.");
check((html.match(/<details\b/g) || []).length === 3, "The page should have exactly three restrained disclosure notes.");
check((html.match(/<figure\b[^>]*class=(['"])hero-result\1/g) || []).length === 2, "The opening comparison should contain one result figure for each paper.");
for (const image of ["computer-assisted-domain-solution.png", "bifurcation-domain-solution.png", "berenstein-domain-solution.png"]) {
  check(new RegExp(`<img\\b[^>]*src=(['"])${escapeRegExp(image)}(?:\\?[^'"]*)?\\1[^>]*alt=(['"])[^'"]+\\2`, "i").test(html), `${image} is missing or lacks alternative text.`);
}
for (const href of ["https://arxiv.org/abs/2608.08953", "https://github.com/sgstepaniants/Berenstein", "https://doi.org/10.5281/zenodo.21865020"]) {
  check(html.includes(`href="${href}"`), `Missing Berenstein source link: ${href}.`);
}
const heroLeadStart = html.indexOf('<p class="hero-lead">');
const sharedStatementStart = html.indexOf('<div class="shared-statement"');
const berensteinHeroLink = html.indexOf('href="https://arxiv.org/abs/2608.08953"', heroLeadStart);
check(heroLeadStart >= 0 && berensteinHeroLink > heroLeadStart && berensteinHeroLink < sharedStatementStart, "The Berenstein paper is not cited in the opening paragraph.");
check(html.indexOf('class="hero-results"') < html.indexOf('class="paper-grid"'), "The paired domain-and-solution figures are not near the top of the page.");
check(/<figure\b[^>]*class=(['"])everyday-shapes\1[\s\S]*?<img\b[^>]*src=(['"])shortcake-hong-kong-coin\.png(?:\?[^'"]*)?\2[^>]*alt=(['"])[^'"]+\3/i.test(html), "The everyday-shapes figure is missing or lacks alternative text.");

const canvasIds = [...html.matchAll(/<canvas\b[^>]*\bid=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/canvas>/gi)]
  .map((match) => match[2]);
const expectedCanvases = ["boundaryCanvas", "certificateCanvas", "quotientCanvas", "branchCanvas"];
check(JSON.stringify(canvasIds) === JSON.stringify(expectedCanvases), `Unexpected canvas set: ${canvasIds.join(", ")}.`);
check([...html.matchAll(/<canvas\b([^>]*)>([\s\S]*?)<\/canvas>/gi)].every(([, attributes, fallback]) => /\brole=(['"])img\1/i.test(attributes) && /\baria-label=(['"])[^'"]+\1/i.test(attributes) && fallback.trim()), "A canvas lacks its image role, label, or text fallback.");

for (const controlId of ["boundaryModes", "certificateRadius", "branchGap"]) {
  check(new RegExp(`<input\\b[^>]*\\bid=(['"])${controlId}\\1`, "i").test(html), `Missing range control #${controlId}.`);
}
check((html.match(/data-quotient-stage=/g) || []).length === 4, "The quotient figure should expose four stages.");

const localStyles = [...html.matchAll(/<link\b[^>]*rel=(['"])stylesheet\1[^>]*href=(['"])(.*?)\2/gi)]
  .map((match) => match[3])
  .filter((href) => !/^https?:/i.test(href));
check(localStyles.length === 1 && /^site\.css(?:\?|$)/.test(localStyles[0]), `Canonical local styles should be site.css only, found: ${localStyles.join(", ")}.`);
const localScripts = [...html.matchAll(/<script\b[^>]*src=(['"])(.*?)\1/gi)]
  .map((match) => match[2].split("?")[0])
  .filter((src) => !/^https?:/i.test(src));
check(JSON.stringify(localScripts) === JSON.stringify(["math.js", "site.js"]), `Unexpected canonical scripts: ${localScripts.join(", ")}.`);
check(css.split(/\r?\n/).length < 1200, "The single stylesheet has become excessively large.");
check(!/!important/.test(css), "The canonical stylesheet contains !important overrides.");
check(/--background:\s*#ffffff/i.test(css), "The page background is not white.");
check(/--accent:\s*#275f9e/i.test(css), "The logo-blue accent is missing.");
check(/<img\b[^>]*class=(['"])site-logo\1[^>]*src=(['"])website-logo\.png(?:\?[^'"]*)?\2/i.test(html), "The site logo is not present in the header.");
check(/--sans:\s*Aptos,\s*"Segoe UI"/i.test(css), "The body sans-serif stack does not match the reference principles.");
check(/--serif:\s*Georgia/i.test(css), "Georgia is not the heading face.");
check(/body\s*\{[\s\S]*?font:\s*17px\/1\.65\s+var\(--sans\)/i.test(css), "Body typography is not the intended readable sans serif.");
check(/\.katex\s*\{[^}]*font-size:\s*1em\s*;/is.test(css), "Mathematics does not inherit the surrounding text size.");
check(!/\.equation[^{]*\.katex\s*\{[^}]*font-size\s*:/is.test(css), "An equation-specific rule changes the mathematics font size.");
check(!/\bsmall-math\b/.test(`${html}\n${css}`), "A reduced-size mathematics class remains in the page.");
check(!/\.equation[^{}]*\{[^}]*overflow-x\s*:\s*auto/is.test(css), "Equations are being hidden behind local horizontal scrolling.");

const count = (source, pattern) => (source.match(pattern) || []).length;
check(count(html, /\\\[/g) === count(html, /\\\]/g), "Unbalanced display-math delimiters.");
check(count(html, /\\\(/g) === count(html, /\\\)/g), "Unbalanced inline-math delimiters.");
check(count(html, /\\\[/g) === 15, `Expected 15 concise display equations, found ${count(html, /\\\[/g)}.`);
check(!/\(mathbf1_Omega\)/.test(html), "A raw malformed indicator-function formula remains visible.");

for (const phrase of [
  "real-analytic boundary",
  "real-analytic boundaries",
  "The computer-assisted proof",
  "The bifurcation proof",
  "Main theorem",
  "Return to a physical domain",
  "Choose a crossing just above an integer and lift it",
]) {
  check(html.includes(phrase), `Missing required paper exposition phrase: ${phrase}.`);
}
check((html.match(/<p class=(['"])small-label\1>Main theorem<\/p>/g) || []).length === 2, "The two paper chapters do not use matching theorem labels.");
check((html.match(/<div class=(['"])proof-steps\1>/g) || []).length === 2, "The two paper chapters do not use the same proof-step structure.");

const segment = (startId, endId) => {
  const start = html.indexOf(`<section id="${startId}"`);
  const end = html.indexOf(`<section id="${endId}"`);
  return start >= 0 && end > start ? html.slice(start, end) : "";
};
const visibleWordCount = (source) => [...source.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z0-9#]+;/gi, " ").matchAll(/[\p{L}\p{N}][\p{L}\p{N}'’–-]*/gu)].length;
const computerWords = visibleWordCount(segment("computer-assisted", "berenstein-extension"));
const bifurcationWords = visibleWordCount(segment("bifurcation", "comparison"));
const wordRatio = Math.max(computerWords, bifurcationWords) / Math.max(1, Math.min(computerWords, bifurcationWords));
check(wordRatio <= 1.1, `Paper chapters are imbalanced: ${computerWords} versus ${bifurcationWords} words.`);

for (const script of ["site.js", "math.js"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, script)], { encoding: "utf8" });
  check(result.status === 0, `${script} has a syntax error: ${result.stderr.trim()}`);
}
const logo = await readFile(path.join(root, "website-logo.png"));
const isLogoPng = logo.length >= 24 && logo.subarray(1, 4).toString("ascii") === "PNG";
check(isLogoPng, "website-logo.png is not a valid PNG.");
if (isLogoPng) {
  check(logo.readUInt32BE(16) === 384 && logo.readUInt32BE(20) === 384, "website-logo.png is not the intended 384 × 384 web asset.");
}

const domainSolution = await readFile(path.join(root, "computer-assisted-domain-solution.png"));
const isDomainSolutionPng = domainSolution.length >= 24 && domainSolution.subarray(1, 4).toString("ascii") === "PNG";
check(isDomainSolutionPng, "computer-assisted-domain-solution.png is not a valid PNG.");
if (isDomainSolutionPng) {
  check(domainSolution.readUInt32BE(16) === 1152 && domainSolution.readUInt32BE(20) === 1152, "The computer-assisted domain-and-solution image is not the intended high-resolution extraction.");
}

const bifurcationDomainSolution = await readFile(path.join(root, "bifurcation-domain-solution.png"));
const isBifurcationDomainSolutionPng = bifurcationDomainSolution.length >= 24 && bifurcationDomainSolution.subarray(1, 4).toString("ascii") === "PNG";
check(isBifurcationDomainSolutionPng, "bifurcation-domain-solution.png is not a valid PNG.");
if (isBifurcationDomainSolutionPng) {
  check(bifurcationDomainSolution.readUInt32BE(16) === 1152 && bifurcationDomainSolution.readUInt32BE(20) === 1152, "The bifurcation domain-and-solution image is not the intended high-resolution extraction.");
}

const berensteinDomainSolution = await readFile(path.join(root, "berenstein-domain-solution.png"));
const isBerensteinDomainSolutionPng = berensteinDomainSolution.length >= 24 && berensteinDomainSolution.subarray(1, 4).toString("ascii") === "PNG";
check(isBerensteinDomainSolutionPng, "berenstein-domain-solution.png is not a valid PNG.");
if (isBerensteinDomainSolutionPng) {
  check(berensteinDomainSolution.readUInt32BE(16) === 1890 && berensteinDomainSolution.readUInt32BE(20) === 1560, "The Berenstein domain-and-solution image is not the intended high-resolution extraction.");
}

const everydayShapes = await readFile(path.join(root, "shortcake-hong-kong-coin.png"));
const isEverydayShapesPng = everydayShapes.length >= 24 && everydayShapes.subarray(1, 4).toString("ascii") === "PNG";
check(isEverydayShapesPng, "shortcake-hong-kong-coin.png is not a valid PNG.");
if (isEverydayShapesPng) {
  check(everydayShapes.readUInt32BE(16) === 1200 && everydayShapes.readUInt32BE(20) === 654, "The everyday comparison image dimensions changed unexpectedly.");
}

if (failures.length) {
  console.error(`Site verification failed (${failures.length} of ${checks} checks):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Site verification passed: ${checks} checks.`);
console.log(`Lean page: ${actualSections.length} sections, ${(html.match(/<h[123]\b/g) || []).length} headings, ${canvasIds.length} canvases, and ${count(html, /\\\[/g)} display equations.`);
console.log(`Balanced paper chapters: ${computerWords} versus ${bifurcationWords} visible words.`);
