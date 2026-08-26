# Bifurcation section

This folder owns the bifurcation proof.

- `hero.html` and `summary.html` supply the opening figure and paper summary.
- `section.html` contains the complete `#bifurcation` chapter.
- `source.html` supplies its source card.
- `figures.js` controls the quotient and integer-recovery interactions.
- `styles.css` contains the styles used only by those interactions.

The bifurcation PNG remains a root runtime asset. Do not edit generated `index.html`, `site.css`, or `site.js` by hand; after changing this folder, run `node scripts/build-site.mjs` from the repository root.
