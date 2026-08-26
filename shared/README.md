# Shared site sources

This folder contains code used by more than one chapter:

- `index.template.html` is the page shell and includes section fragments through explicit build tokens.
- `styles.template.css` contains the shared visual system and inserts section-owned CSS without changing cascade order.
- `site-start.js` and `site-end.js` wrap the section interaction code in one shared scope.
- `math.js` renders mathematics after the generated page is complete.

Use this folder for navigation, the opening material, comparison, references, global layout, and common figure helpers. Section-specific edits belong under `sections/`.
