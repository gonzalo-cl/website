import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const assembleTemplate = async (templatePath, includes) => {
  let output = await read(templatePath);
  for (const [token, fragmentPath] of includes) {
    const occurrences = output.split(token).length - 1;
    if (occurrences !== 1) throw new Error(`${templatePath} contains ${occurrences} copies of ${token}; expected one.`);
    output = output.replace(token, await read(fragmentPath));
  }
  if (/@@include:[^@]+@@/.test(output)) throw new Error(`${templatePath} still contains an unresolved include token.`);
  return output;
};

const html = await assembleTemplate("shared/index.template.html", [
  ["@@include:sections/computer-assisted/hero.html@@", "sections/computer-assisted/hero.html"],
  ["@@include:sections/bifurcation/hero.html@@", "sections/bifurcation/hero.html"],
  ["@@include:sections/computer-assisted/summary.html@@", "sections/computer-assisted/summary.html"],
  ["@@include:sections/bifurcation/summary.html@@", "sections/bifurcation/summary.html"],
  ["@@include:sections/history/section.html@@", "sections/history/section.html"],
  ["@@include:sections/computer-assisted/section.html@@", "sections/computer-assisted/section.html"],
  ["@@include:sections/bifurcation/section.html@@", "sections/bifurcation/section.html"],
  ["@@include:sections/computer-assisted/source-schiffer.html@@", "sections/computer-assisted/source-schiffer.html"],
  ["@@include:sections/bifurcation/source.html@@", "sections/bifurcation/source.html"],
  ["@@include:sections/computer-assisted/source-berenstein.html@@", "sections/computer-assisted/source-berenstein.html"],
]);

const css = await assembleTemplate("shared/styles.template.css", [
  ["@@include:sections/history/styles.css@@", "sections/history/styles.css"],
  ["@@include:sections/computer-assisted/certificate.css@@", "sections/computer-assisted/certificate.css"],
  ["@@include:sections/bifurcation/styles.css@@", "sections/bifurcation/styles.css"],
  ["@@include:sections/computer-assisted/berenstein.css@@", "sections/computer-assisted/berenstein.css"],
]);

const siteJs = (await Promise.all([
  "shared/site-start.js",
  "sections/computer-assisted/figures.js",
  "sections/bifurcation/figures.js",
  "shared/site-end.js",
].map(read))).join("");

const outputs = new Map([
  ["index.html", html],
  ["site.css", css],
  ["site.js", siteJs],
  ["math.js", await read("shared/math.js")],
]);

const stale = [];
for (const [relativePath, expected] of outputs) {
  const destination = path.join(root, relativePath);
  let current = null;
  try {
    current = await readFile(destination, "utf8");
  } catch {}
  if (current !== expected) {
    stale.push(relativePath);
    if (!checkOnly) await writeFile(destination, expected, "utf8");
  }
}

if (checkOnly && stale.length) {
  console.error(`Generated site files are stale: ${stale.join(", ")}. Run node scripts/build-site.mjs.`);
  process.exit(1);
}

console.log(checkOnly
  ? `Generated site is current (${outputs.size} files checked).`
  : stale.length
    ? `Built ${stale.length} site file${stale.length === 1 ? "" : "s"}: ${stale.join(", ")}.`
    : `Generated site is already current (${outputs.size} files).`);
