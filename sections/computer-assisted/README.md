# Computer-assisted sections

This folder owns the computer-assisted Schiffer proof and its Berenstein extension.

- `hero.html` and `summary.html` supply the opening figure and paper summary.
- `section.html` contains the complete `#computer-assisted` chapter, including `#berenstein-extension`.
- `source-schiffer.html` and `source-berenstein.html` supply the two source cards.
- `figures.js` controls the conformal-boundary and certificate interactions.
- `certificate.css` and `berenstein.css` contain section-specific styles.

The two corresponding PNG figures remain root runtime assets. Do not edit generated `index.html`, `site.css`, or `site.js` by hand; after changing this folder, run `node scripts/build-site.mjs` from the repository root.
