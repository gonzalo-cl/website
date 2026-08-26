# Planar Schiffer, Pompeiu, and Berenstein counterexamples

This repository contains the source for a stand-alone web exposition of two rigorous planar Schiffer counterexample constructions and a related computer-assisted extension.

## Papers covered

- Matthew J. Colbrook and George Stepaniants, [*A computer-assisted counterexample to the planar Pompeiu and Schiffer conjectures*](https://arxiv.org/abs/2608.01579).
- Gonzalo Cao-Labora and Jaume de Dios Pont, [*Counterexamples to Schiffer's Conjecture*](https://arxiv.org/abs/2608.05114).
- Matthew J. Colbrook, Siavash Sadeghi, and George Stepaniants, [*A computer-assisted counterexample to the planar Berenstein conjecture*](https://arxiv.org/abs/2608.08953).

## Mathematical scope

The two Schiffer papers construct bounded, simply connected, noncircular planar domains supporting a nonconstant solution of

```text
(Δ + k²)u = 0 in Ω,       u = 1 and ∂νu = 0 on ∂Ω.
```

- The computer-assisted construction proves the existence of a real-analytic, `D₁₀`-symmetric Schiffer domain using a conformal pullback, a compatible inverse, a weighted coefficient algebra, and a full-space contraction certificate.
- The bifurcation construction proves the existence of real-analytic, star-shaped Schiffer domains using a real-order collar problem, a Bessel crossing, uniform negative curvature, integer recovery, and a planar lift.
- The Berenstein extension adapts the computer-assisted framework to complementary boundary data and proves a `D₁₃`-symmetric counterexample with a sign-changing eigenfunction.

All three results described by the site are rigorous. The Berenstein result is treated as an extension of the computer-assisted framework rather than as a third Schiffer construction.

## Repository layout

The authored source is divided so collaborators can edit the three principal chapters without working in the same files:

- [`sections/history/`](sections/history/) owns the history and formulations chapter.
- [`sections/computer-assisted/`](sections/computer-assisted/) owns the computer-assisted Schiffer chapter, its opening figure and summary, the Berenstein extension, the associated source cards, and both interactive figures.
- [`sections/bifurcation/`](sections/bifurcation/) owns the bifurcation chapter, its opening figure and summary, its source card, and both interactive figures.
- [`shared/`](shared/) owns the page shell, navigation, comparison, source-grid container, historical references, common layout, shared canvas helpers, and mathematics rendering.
- [`scripts/`](scripts/) contains the deterministic site builder and verifier.
- [`paper/index.html`](paper/index.html) preserves the compatibility route to the root page.

The five PNG files at the repository root are the displayed image assets. They remain at the root so the generated page can load them directly.

## Generated browser files

The following root files are generated and should not be edited directly:

- `index.html`, assembled from `shared/index.template.html` and the section HTML fragments;
- `site.css`, assembled from `shared/styles.template.css` and the section styles;
- `site.js`, assembled from the shared wrapper and the two paper-specific interaction files;
- `math.js`, copied from `shared/math.js`.

After editing an authored source file, rebuild the root files with:

```sh
node scripts/build-site.mjs
```

To check that the generated files are current without rewriting them, run:

```sh
node scripts/build-site.mjs --check
```

## Page structure

The page follows a direct mathematical narrative:

1. [History and formulations](index.html#history) relates the integral, Fourier, and spectral versions of the problem and explains the linear obstruction at the disc.
2. [The computer-assisted proof](index.html#computer-assisted) explains the conformal pullback, compatible inverse, coefficient equation, full-space contraction certificate, and reconstruction of the physical domain. Its [Berenstein extension](index.html#berenstein-extension) explains the full zero-Dirichlet inverse, Neumann-trace equation, and sign recovery needed for nonzero boundary flux.
3. [The bifurcation proof](index.html#bifurcation) explains the rotational quotient, real-order collar problem, Bessel crossing, uniform negative curvature, integer recovery, and planar lift.
4. [Comparison](index.html#comparison) places the two proof structures side by side.
5. [Sources](index.html#sources) links the papers, proof materials, source code, and historical references.

## Figures and interactions

Near the top, the page places the domain-and-solution figures from the two Schiffer papers side by side. The computer-assisted chapter also includes the corresponding figure from the Berenstein paper, and the history chapter includes the shortcake-and-coin comparison.

Four canvas figures are interactive:

- the conformal coefficients, the boundary they define, and a magnified view of its deformation;
- the two radii-polynomial sign conditions at a selectable coefficient radius;
- the passage from an `N`-fold planar domain to a quotient collar and back at integer order;
- the normalized quadratic model showing how negative branch curvature closes a small integer gap.

These figures explain the mechanisms. The proofs use the exact estimates, certificates, and reconstruction arguments described in the papers and linked source material.

## Browser assets and external resources

The root page loads these repository files:

- `site.css`;
- `math.js`;
- `site.js`;
- `website-logo.png`;
- `computer-assisted-domain-solution.png`;
- `bifurcation-domain-solution.png`;
- `berenstein-domain-solution.png`;
- `shortcake-hong-kong-coin.png`.

KaTeX JavaScript, CSS, and fonts are pinned to a specific version on jsDelivr. Rendering the mathematics therefore requires network access unless those resources are already cached. All site-specific code and displayed images are local.

## Proof materials

The coefficients drawn in the computer-assisted boundary figure are the decimal values printed in the paper. The proof uses the archived exact dyadic centre, interval enclosures, analytic tail estimates, and exact-rational checker available from [Zenodo](https://doi.org/10.5281/zenodo.21765287) and the [source repository](https://github.com/MColbrook/Pompeiu_Schiffer).

The Berenstein extension has its own archived certificate, exact inputs, directed-rounding audits, and verifier, available from [Zenodo](https://doi.org/10.5281/zenodo.21865020) and the [source repository](https://github.com/sgstepaniants/Berenstein).

The certificates and proof repositories are linked rather than duplicated in this website repository.

## Run and verify locally

A current Node.js runtime must be installed and available as `node`. To serve the built files locally, Python's standard HTTP server is sufficient:

```sh
node scripts/build-site.mjs
python -m http.server 8000
```

Then open <http://localhost:8000/>.

Run the verifier with:

```sh
node scripts/verify-site.mjs
```

The verifier first checks that the generated files are current. It then checks the page structure, required wording, balance between the two Schiffer chapters, local resources, image formats and dimensions, mathematics delimiters and inherited font sizing, JavaScript syntax, and basic fragment-link, label, and ARIA integrity.

## Entry points

[`index.html`](index.html) is the generated root entry point. [`paper/index.html`](paper/index.html) redirects the compatibility route to the root page.
