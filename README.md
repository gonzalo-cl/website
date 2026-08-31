# Constructing Noncircular Schiffer Domains

**Constructing Noncircular Schiffer Domains** is the interactive mathematical
exposition served at
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

- the higher m = 10 Wronskian mechanism and numerical continuation to the D₁₀ zero-flux centre;
- the fixed-disk conformal formulation;
- the compatible inverse and cubic coefficient equation;
- the full-space contraction certificate and its exact sign check;
- the certified D₁₃ Berenstein figure and companion result.

The mathematical narrative is now:

1. Pompeiu's measurement problem and Schiffer's spectral formulation;
2. linear rigidity of the disk and bifurcation in other geometries;
3. two routes to a counterexample: a bifurcation-seeded conformal fixed-disc
   construction closed by computer-assisted validation, and a bifurcation
   cone-collar bifurcation construction;
4. the conformal reduction and computer-assisted validation of the
   bifurcation-generated numerical centre;
5. the collar bifurcation, uniform estimates, near-integer landing
   and planar lift.

The two proof tracks have parallel navigation and visual weight. The conformal
fixed-disc chapter begins with the higher-root m = 10 Wronskian seed and
exploratory continuation to zero flux, then follows the printed numerical
centre, fixed-disc pullback, exact compatible inverse, finite/tail split,
certified fixed-point iteration and geometric reconstruction. Its applets mark
schematic search data separately from exact algebra and certified bounds; the
iteration figure shows how a Newton-like map stays inside a coefficient ball
and contracts toward the locally unique exact solution in that validated
ball. The companion Berenstein subsection explains its thirteenfold
bifurcation seed, separate boundary-trace equation, sign gate and certified
reconstruction; a final local-versus-global subsection distinguishes analytic
collar data from global solvability. The bifurcation chapter poses
the bifurcation problem directly on finite cone collars, uses the half-cylinder
as its large-order limiting model, proves uniform estimates, computes the
second variation, finds near-integer crossings and performs the planar lift.
In both chapters, the geometric mechanism and analytic reduction are separated
from illustrative computation, then followed by the rigorous argument that
closes existence.

The HTML supplies semantic sections, statements, disclosures, figures and
controls. Page measures are owned by
[tufte/tufte-port.css](tufte/tufte-port.css), so authored content does not
choose ad hoc widths. [document-structure.js](document-structure.js) owns the
document counters, generated table of contents and cross-reference registry:
sections are numbered from DOM order, while statements, equations, figures and
asides use stable semantic labels such as
`data-label="half-cylinder-bifurcation"`. References use
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
    node --check scholarly-tools.js
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
- [tufte/](tufte/) — compatibility redirect plus the Tufte stylesheet and
  contract.

## Numerical data

The interactive page does not present floating-point plots as proofs. In the
first construction, exploratory continuation of the bifurcation-seeded branch
produces the numerical centre. Computer assistance enters the proof through
the archived exact dyadic centre, interval enclosures, analytic tail estimates
and exact-rational checker available from the
[certificate archive](https://doi.org/10.5281/zenodo.21765287) and
[source repository](https://github.com/MColbrook/Pompeiu_Schiffer).

The cone applets use precomputed Fourier–Bessel data. The displayed
D₂₈ continuation is a finite-dimensional numerical illustration with
λ* ≈ 3.317, outside the proof window [2, 3]; the theorem
selects other sufficiently large crossings. Regeneration commands and Python
dependencies are documented in [numerics/](numerics/); the committed
JavaScript data files make the published page self-contained.

## License

See [LICENSE](LICENSE). Individual externally sourced images retain the
attribution given in their captions.
