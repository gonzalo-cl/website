# Pompeiu–Schiffer interactive exposition

This repository serves the interactive mathematical exposition at
[pompeiu-schiffer.org](https://pompeiu-schiffer.org/).

The production page is a static, Tufte-style account of the Pompeiu and
Schiffer problems and of two rigorous constructions of planar counterexamples:

- Matthew J. Colbrook and George Stepaniants,
  [*A computer-assisted counterexample to the planar Pompeiu and Schiffer
  conjectures*](https://arxiv.org/abs/2608.01579);
- Gonzalo Cao-Labora and Jaume de Dios Pont,
  [*Counterexamples to Schiffer's
  Conjecture*](https://arxiv.org/abs/2608.05114).

It also describes the companion Berenstein construction of Matthew J.
Colbrook, Siavash Sadeghi and George Stepaniants,
[*A computer-assisted counterexample to the planar Berenstein
conjecture*](https://arxiv.org/abs/2608.08953).

## 2026 Tufte port

The site previously on **main** is preserved without modification on
**codex/pre-tufte-site**. The current root page replaces the earlier card-based
layout with the Tufte exposition and incorporates the strongest material from
that version:

- the numerical continuation that locates the D₁₀ construction;
- the fixed-disk conformal formulation;
- the compatible inverse and cubic coefficient equation;
- the full-space contraction certificate and its exact sign check;
- the certified D₁₃ Berenstein figure and companion result.

The mathematical narrative is now:

1. Pompeiu's measurement problem and Schiffer's spectral formulation;
2. linear rigidity of the disk and bifurcation in other geometries;
3. two ways to find a bifurcation when the planar disk has none:
   numerical continuation and the cone/half-cylinder limit;
4. the computer-assisted validation of the numerical centre;
5. the cylinder-to-cone bifurcation proof and planar lift.

Within the final proof, each subsection now follows the same editorial order:
observable numerical or geometric evidence, the precise theorem it suggests,
and an expandable derivation. The large-cone transfer uses a fixed-radius
two-panel Bessel comparison in the margin; the branch-family plot introduces
both the uniform second variation and the near-integer phase argument; the
final global/collar animation closes the argument by showing an explicit
near-integer cone branch reach an integral order.

The HTML supplies semantic sections, statements, disclosures, figures and
controls. Page measures are owned by
[tufte/tufte-port.css](tufte/tufte-port.css), so authored content does not
choose ad hoc widths. [document-structure.js](document-structure.js) owns the
document counters and cross-reference registry: sections are numbered from
DOM order, while statements, equations, figures and asides use stable semantic
labels such as `data-label="half-cylinder-bifurcation"`. References use
`<a class="xref" data-ref="half-cylinder-bifurcation"></a>` and therefore
survive editorial reordering without hand-maintained numbers.

## Local development

There is no build step. Serve the repository root:

    python3 -m http.server 8000

Then open <http://localhost:8000/>.

The page uses pinned CDN releases of Tufte CSS, KaTeX, Highlight.js and the
Lean syntax grammar. The optional 3D views load a pinned Three.js module on
demand.

For the layout assertions, append **?layout-check=1** to the URL. The contract
checks the reading/margin measures, semantic applet composition, canvas
aspect ratios, display mathematics, statement grammar, typography roles and
mobile disclosures.

Before publishing, run:

    node --check app.js
    node --check applet-layout.js
    node --check abundance.js
    node --check computer-assisted.js
    node --check document-structure.js
    node --check lean-statements.js
    node --check math.js
    node --check pompeiu.js
    node --check story.js
    node --check tufte/layout-contract.js

The applets deliberately measure their visual wrapper rather than the page or
their control rail. [applet-layout.js](applet-layout.js) coordinates the
initial render after the responsive grid, web fonts and restored-page layout
have settled. This prevents a canvas bitmap computed under one layout from
being stretched under another on first load or after a breakpoint transition.

## Repository layout

- [index.html](index.html) — canonical production exposition.
- [tufte/tufte-port.css](tufte/tufte-port.css) — Tufte page and component
  grammar.
- [tufte/layout-contract.js](tufte/layout-contract.js) — browser layout and
  typography assertions.
- [styles.css](styles.css) — shared applet primitives and base visual styles.
- [app.js](app.js), [story.js](story.js), [pompeiu.js](pompeiu.js),
  [abundance.js](abundance.js), and
  [computer-assisted.js](computer-assisted.js) — interactive figures.
- [applet-layout.js](applet-layout.js) — shared cold-load and resize
  coordinator.
- The files ending in **-data.js** — precomputed numerical data consumed by
  the browser.
- [numerics/](numerics/) — scripts that regenerate the numerical data.
- [assets/](assets/) — paper figures and comparison photographs.
- [paper/](paper/) — the proof-guided paper edition retained as a secondary
  route.
- [tufte/](tufte/) — compatibility redirect plus the Tufte stylesheet and
  contract.

## Numerical data

The interactive page does not present floating-point plots as proofs. The
computer-assisted theorem uses the archived exact dyadic centre, interval
enclosures, analytic tail estimates and exact-rational checker available from
the [certificate archive](https://doi.org/10.5281/zenodo.21765287) and
[source repository](https://github.com/MColbrook/Pompeiu_Schiffer).

The cone applets use precomputed Fourier–Bessel data. Regeneration commands and
Python dependencies are documented in [numerics/](numerics/); the committed
JavaScript data files make the published page self-contained.

## License

See [LICENSE](LICENSE). Individual externally sourced images retain the
attribution given in their captions.
