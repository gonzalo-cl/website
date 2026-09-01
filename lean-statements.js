(() => {
  "use strict";

  const statements = Object.freeze({
    "pompeiu-property": Object.freeze({
      title: "HasPompeiuProperty",
      source: [
        "import Mathlib",
        "noncomputable section",
        "",
        "open MeasureTheory Metric Topology Bornology",
        "",
        "abbrev Plane := ℂ",
        "abbrev RigidMotion := AffineIsometryEquiv ℝ Plane Plane",
        "",
        "def MeasurementMap (Ω : Set Plane) (f : C(Plane, ℝ)) :",
        "    RigidMotion → ℝ :=",
        "  fun E ↦ ∫ x in E '' Ω, f x",
        "",
        "def HasPompeiuProperty (Ω : Set (Plane)) : Prop :=",
        "  (MeasurementMap Ω).Injective",
      ].join("\n"),
    }),
    "disk-not-pompeiu": Object.freeze({
      title: "DiskNotPompeiu",
      source: [
        "lemma DiskNotPompeiu (c : Plane) (r : ℝ) (hr : r > 0) :",
        "    ¬ HasPompeiuProperty (Metric.ball c r)",
      ].join("\n"),
    }),
    "schiffer-property": Object.freeze({
      title: "IsSchifferDomain",
      source: [
        "open Gradient Laplacian",
        "",
        "def IsSchifferDomain (Ω : Set (Plane)) : Prop :=",
        "  ∃ (u : Plane → ℝ),",
        "    ContDiff ℝ 2 u ∧",
        "    (∀ x ∈ Ω, -(Δ u) x = u x) ∧",
        "    (∀ x ∈ frontier Ω, u x = 1) ∧",
        "    (∀ x ∈ frontier Ω, ∇ u x = 0)",
      ].join("\n"),
    }),
    "schiffer-pompeiu-equivalence": Object.freeze({
      title: "SchifferIffPompeiu",
      source: [
        "theorem SchifferIffPompeiu",
        "    {Ω : Set Plane}",
        "    (hbounded : IsBounded Ω)",
        "    (hC2 : HasC2Boundary Ω) :",
        "    IsSchifferDomain Ω ↔ ¬ HasPompeiuProperty Ω",
      ].join("\n"),
    }),
    "schiffer-star-shaped": Object.freeze({
      title: "Schiffer_Star_Shaped",
      alignmentScope: "primary-declaration",
      caption: "The Lean statement records C² boundary regularity. Williams’s theorem says that every planar Lipschitz counterexample has real-analytic, hence smooth, boundary; that regularity upgrade is not formalized in this work.",
      captionCitation: Object.freeze({
        href: "https://doi.org/10.1512/iumj.1981.30.30028",
        label: "Williams (1981)",
      }),
      source: [
        "def HasC2Boundary",
        "    (Ω : Set Plane) : Prop :=",
        "  ∃ (F : Plane → ℝ),",
        "    ContDiff ℝ 2 F ∧",
        "    Ω = {x | 0 < F x} ∧",
        "    ∀ x, F x = 0 →",
        "      ∇ F x ≠ 0",
        "",
        "def IsSchifferDomain (Ω : Set Plane) : Prop :=",
        "  ∃ (u : Plane → ℝ), ContDiff ℝ 2 u ∧",
        "    (∀ x ∈ Ω, -(Δ u) x = u x) ∧",
        "    (∀ x ∈ frontier Ω, u x = 1) ∧",
        "    (∀ x ∈ frontier Ω, ∇ u x = 0)",
        "",
        "def IsEuclideanDisk",
        "    (Ω : Set Plane) : Prop :=",
        "  ∃ (c : Plane) (r : ℝ),",
        "    Ω = Metric.ball c r",
        "",
        "theorem Schiffer_Star_Shaped :",
        "  ∃ (Ω : Set Plane),",
        "    IsBounded Ω ∧ Nonempty Ω ∧",
        "    StarConvex ℝ 0 Ω ∧",
        "    HasC2Boundary Ω ∧",
        "    ¬ IsEuclideanDisk Ω ∧",
        "    IsSchifferDomain Ω",
      ].join("\n"),
    }),
    "pompeiu-star-shaped": Object.freeze({
      title: "Pompeiu_Star_Shaped",
      source: [
        "theorem Pompeiu_Star_Shaped :",
        "  ∃ (Ω : Set Plane),",
        "    IsBounded Ω ∧ Nonempty Ω ∧",
        "    StarConvex ℝ 0 Ω ∧ HasC2Boundary Ω ∧",
        "    ¬ IsEuclideanDisk Ω ∧",
        "    ¬ HasPompeiuProperty Ω",
      ].join("\n"),
    }),
    "uniform-cone-bifurcation": Object.freeze({
      title: "exists_uniformConeBranch",
      source: [
        "import Mathlib",
        "noncomputable section",
        "",
        "open Set BesselFunction",
        "",
        "theorem exists_uniformConeBranch (sreg : ℕ) :",
        "  ∃ u : Cone.UniformCollarData, ∃ R₀ s₀ C : ℝ,",
        "    ∃ hbase : u.R₀ ≤ R₀,",
        "      0 < s₀ ∧ 0 < C ∧",
        "      ∀ (c : Cone.Crossing) (hR : R₀ ≤ c.R)",
        "        (hλ : Cone.crossingLambda c ∈ Set.Icc 2 3),",
        "        ∃ b : UniformConeBranch u sreg c (hbase.trans hR) hλ,",
        "          s₀ < b.amplitudeRadius ∧",
        "          ContDiff ℝ 3 b.radius ∧",
        "          ∀ j ≤ 3, ∀ s ∈ Set.Icc (-s₀) s₀,",
        "            ‖iteratedDeriv j b.radius s‖ ≤ C",
      ].join("\n"),
    }),
    "near-integer-crossings": Object.freeze({
      title: "exists_nearIntegerCrossing",
      source: [
        "import Mathlib",
        "noncomputable section",
        "",
        "open BesselFunction",
        "",
        "theorem exists_nearIntegerCrossing",
        "    (δ : ℝ) (hδ : 0 < δ) (Nmin : ℕ) :",
        "    ∃ (N : ℕ) (R ρ : ℝ),",
        "      Nmin ≤ N ∧",
        "      (N : ℝ) < R ∧ R < (N : ℝ) + δ ∧",
        "      0 < ρ ∧",
        "      J 1 ρ = 0 ∧ J R ρ = 0 ∧",
        "      2 < ρ ^ 2 / R ^ 2 ∧ ρ ^ 2 / R ^ 2 < 3",
      ].join("\n"),
    }),
  });

  const regularityRemark = Object.freeze({
    noteTitle: "Formalization remark",
    note: "The Schiffer conjecture is usually posed for Lipschitz domains. S. A. Williams proved that a planar Lipschitz counterexample has real-analytic boundary. A C² boundary is Lipschitz, so the Lean theorem reaches the conjecture’s usual regularity class; the upgrade used to match the paper’s word “smooth” is not formalized in this work.",
    sources: Object.freeze([
      Object.freeze({
        href: "https://doi.org/10.1512/iumj.1981.30.30028",
        label: "Williams (1981)",
      }),
    ]),
  });

  const comparatorSources = Object.freeze([
    Object.freeze({
      href: "https://github.com/jaumededios/Schiffer",
      label: "Schiffer repository",
    }),
    Object.freeze({
      href: "https://github.com/jaumededios/Schiffer/blob/lean/Schiffer/Challenge.lean",
      label: "Comparator challenge file",
    }),
  ]);

  const statementSources = Object.freeze({
    "schiffer-star-shaped": comparatorSources,
  });

  const mathlibDocumentation = Object.freeze({
    isBounded: Object.freeze({
      href: "https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Bornology/Basic.html#Bornology.IsBounded",
      label: "Mathlib docs",
    }),
    starConvex: Object.freeze({
      href: "https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Convex/Star.html#StarConvex",
      label: "Mathlib docs",
    }),
    contDiff: Object.freeze({
      href: "https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Calculus/ContDiff/Defs.html#ContDiff",
      label: "ContDiff · Mathlib",
    }),
    metricBall: Object.freeze({
      href: "https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/MetricSpace/Pseudo/Defs.html#Metric.ball",
      label: "Metric.ball · Mathlib",
    }),
    affineIsometryEquiv: Object.freeze({
      href: "https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Normed/Affine/Isometry.html#AffineIsometryEquiv",
      label: "AffineIsometryEquiv · Mathlib",
    }),
    frontier: Object.freeze({
      href: "https://leanprover-community.github.io/mathlib4_docs/Mathlib/Topology/Defs/Basic.html#frontier",
      label: "frontier · Mathlib",
    }),
    gradient: Object.freeze({
      href: "https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Calculus/Gradient/Basic.html#gradient",
      label: "gradient · Mathlib",
    }),
    laplacian: Object.freeze({
      href: "https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Distribution/DerivNotation.html#Laplacian",
      label: "Laplacian · Mathlib",
    }),
    iteratedDeriv: Object.freeze({
      href: "https://leanprover-community.github.io/mathlib4_docs/Mathlib/Analysis/Calculus/IteratedDeriv/Defs.html#iteratedDeriv",
      label: "iteratedDeriv · Mathlib",
    }),
  });

  const mathlibTerms = Object.freeze([
    Object.freeze({ token: "ContDiff", documentation: mathlibDocumentation.contDiff }),
    Object.freeze({ token: "Metric.ball", documentation: mathlibDocumentation.metricBall }),
    Object.freeze({ token: "AffineIsometryEquiv", documentation: mathlibDocumentation.affineIsometryEquiv }),
    Object.freeze({ token: "frontier", documentation: mathlibDocumentation.frontier }),
    Object.freeze({ token: "iteratedDeriv", documentation: mathlibDocumentation.iteratedDeriv }),
  ]);

  const boundedAlignment = Object.freeze({
    token: "IsBounded",
    concept: "bounded",
    paper: "bounded",
    explanation: "Mathlib’s bornological boundedness predicate; in Euclidean space, it is equivalent to containment in a sufficiently large ball",
    documentation: mathlibDocumentation.isBounded,
  });
  const nonemptyAlignment = Object.freeze({
    token: "Nonempty",
    concept: "nonempty",
    paper: "nonempty",
  });
  const planeAlignment = Object.freeze({
    token: "Plane",
    concept: "plane",
    paper: "planar",
    explanation: "An abbreviation for ℂ, regarded here as the real Euclidean plane",
  });
  const starConvexAlignment = Object.freeze({
    token: "StarConvex",
    concept: "star-shaped",
    paper: "star-shaped with respect to the origin",
    explanation: "Mathlib’s predicate saying that every segment from the origin to a point of Ω remains in Ω",
    documentation: mathlibDocumentation.starConvex,
  });
  const euclideanDiskAlignment = Object.freeze({
    token: "IsEuclideanDisk",
    concept: "not-disk",
    paper: "not a disk",
    explanation: "This project-local predicate says that Ω is an ordinary open Euclidean disk, with arbitrary centre and radius; the theorem negates it",
    documentation: mathlibDocumentation.metricBall,
  });

  /* Each entry names a Lean token, its paper-level meaning, and the semantic
     concept marked in the nearby prose. New formal counterparts extend this
     registry instead of adding statement-specific event handlers or CSS. */
  const semanticAlignments = Object.freeze({
    "pompeiu-property": Object.freeze([
      Object.freeze({
        token: "MeasurementMap",
        concept: "measurement-map",
        paper: "the measurement map f ↦ MΩf",
        noteTitle: "Formalization remark",
        note: "The paper suppresses function-space details. This excerpt chooses continuous real-valued functions and Lebesgue integrals over rigid-motion images.",
      }),
      Object.freeze({
        token: "Injective",
        concept: "injective",
        paper: "is injective",
      }),
    ]),
    "disk-not-pompeiu": Object.freeze([
      Object.freeze({
        token: "Metric.ball",
        concept: "disk",
        paper: "disk",
        documentation: mathlibDocumentation.metricBall,
      }),
      Object.freeze({
        token: "HasPompeiuProperty",
        concept: "fails",
        paper: "fails the Pompeiu property",
      }),
    ]),
    "schiffer-property": Object.freeze([
      Object.freeze({
        token: "ContDiff",
        concept: "regularity",
        paper: "a C² function",
        explanation: "Mathlib’s predicate that the field has continuous derivatives through order two",
        documentation: mathlibDocumentation.contDiff,
      }),
      Object.freeze({
        token: "IsSchifferDomain",
        concept: "schiffer-system",
        paper: "the Schiffer system",
      }),
      Object.freeze({
        token: "Δ u",
        concept: "schiffer-system",
        paper: "the Schiffer system",
        explanation: "The Laplacian term in the normalized Helmholtz equation",
        documentation: mathlibDocumentation.laplacian,
      }),
      Object.freeze({
        token: "frontier Ω",
        concept: "boundary",
        paper: "the boundary ∂Ω",
        explanation: "Mathlib’s topological boundary of Ω",
        documentation: mathlibDocumentation.frontier,
      }),
      Object.freeze({
        token: "∇ u",
        concept: "gradient",
        paper: "the equivalent boundary condition ∇u = 0",
        documentation: mathlibDocumentation.gradient,
      }),
      Object.freeze({
        token: "= u x",
        concept: "normalization",
        paper: "normalizing the eigenvalue to λ = 1",
        explanation: "The unit coefficient of u fixes the normalized eigenvalue at λ = 1",
        noteTitle: "Formalization remark",
        note: "The paper keeps λ visible; the Lean predicate rescales the domain and fixes λ = 1. The equivalence of these conventions is explained in the prose but not proved in this excerpt.",
      }),
    ]),
    "schiffer-pompeiu-equivalence": Object.freeze([
      boundedAlignment,
      Object.freeze({
        token: "HasC2Boundary",
        concept: "regularity",
        paper: "smooth boundary",
        explanation: "A project-local predicate expressing the domain as a regular C² super-level set. The defining function is continuous, so the super-level set is open",
        documentation: mathlibDocumentation.contDiff,
        ...regularityRemark,
      }),
      Object.freeze({
        token: "IsSchifferDomain",
        concept: "schiffer",
        paper: "solves the Schiffer problem",
        explanation: "The project-local predicate for the normalized Schiffer boundary-value problem",
      }),
      Object.freeze({
        token: "HasPompeiuProperty",
        concept: "pompeiu",
        paper: "fails the Pompeiu property",
      }),
    ]),
    "schiffer-star-shaped": Object.freeze([
      boundedAlignment,
      nonemptyAlignment,
      planeAlignment,
      starConvexAlignment,
      Object.freeze({
        token: "HasC2Boundary",
        concept: "regularity",
        paper: "smooth",
        explanation: "A project-local predicate expressing Ω as a regular C² super-level set. The defining function is continuous, so Ω is open",
        documentation: mathlibDocumentation.contDiff,
        ...regularityRemark,
      }),
      euclideanDiskAlignment,
      Object.freeze({
        token: "IsSchifferDomain",
        concept: "schiffer",
        paper: "solves the Schiffer problem",
        explanation: "The displayed project-local predicate for the normalized Schiffer boundary-value problem",
      }),
    ]),
    "pompeiu-star-shaped": Object.freeze([
      boundedAlignment,
      nonemptyAlignment,
      planeAlignment,
      starConvexAlignment,
      Object.freeze({
        token: "HasC2Boundary",
        concept: "regularity",
        paper: "regular C² boundary",
        explanation: "A project-local predicate expressing Ω as a regular C² super-level set. The defining function is continuous, so Ω is open",
        documentation: mathlibDocumentation.contDiff,
        ...regularityRemark,
      }),
      euclideanDiskAlignment,
      Object.freeze({
        token: "HasPompeiuProperty",
        concept: "pompeiu",
        paper: "does not have the Pompeiu property",
      }),
    ]),
    "uniform-cone-bifurcation": Object.freeze([
      Object.freeze({
        token: "Cone.Crossing",
        concept: "crossing",
        paper: "every sufficiently large Bessel crossing",
      }),
      Object.freeze({
        token: "UniformConeBranch",
        concept: "uniform-control",
        paper: "one branch interface with crossing-independent control",
        noteTitle: "Formalization remark",
        note: "The excerpt records the intended public interface. The cone structures and uniform branch package are project-specific rather than Mathlib definitions.",
      }),
      Object.freeze({
        token: "ContDiff",
        concept: "uniform-control",
        paper: "crossing-independent C³ control",
        explanation: "Mathlib’s predicate expressing the branch’s C³ regularity",
        documentation: mathlibDocumentation.contDiff,
      }),
      Object.freeze({
        token: "iteratedDeriv",
        concept: "uniform-control",
        paper: "uniform bounds for the first three derivatives",
        explanation: "Mathlib’s iterated one-variable derivative",
        documentation: mathlibDocumentation.iteratedDeriv,
      }),
    ]),
    "near-integer-crossings": Object.freeze([
      Object.freeze({
        token: "Nmin",
        concept: "parameters",
        paper: "an arbitrarily large integer threshold",
      }),
      Object.freeze({
        token: "hδ",
        concept: "gap",
        paper: "the arbitrarily small gap R − N",
      }),
      Object.freeze({
        token: "J",
        concept: "bessel",
        paper: "a common Bessel zero",
      }),
      Object.freeze({
        token: "ρ",
        concept: "window",
        paper: "the frequency constrained by 2 < ρ²/R² < 3",
        noteTitle: "Formalization remark",
        note: "The quantified conclusion is encoded. The McMahon–Debye phase alignment and equidistribution argument are not formalized in this work.",
      }),
    ]),
  });

  // highlightjs-lean 1.2 ships the maintained Lean grammar, but its keyword
  // list predates Lean 4's `abbrev`. Extend that grammar before the first
  // block is tokenized; source markup remains entirely Highlight.js-owned.
  const leanGrammar = window.hljs?.getLanguage?.("lean");
  if (typeof leanGrammar?.keywords?.keyword === "string"
      && !leanGrammar.keywords.keyword.split(/\s+/u).includes("abbrev")) {
    leanGrammar.keywords.keyword += " abbrev";
  }

  const alignmentControllers = new WeakMap();

  const paperTargets = (key, concept) => Array.from(
    document.querySelectorAll("[data-lean-alignment]"),
  ).filter((element) => element.dataset.leanAlignment
    .split(/\s+/u)
    .includes(key + ":" + concept));

  const createAlignmentController = (key, alignments) => {
    const panel = document.createElement("aside");
    panel.className = "lean-semantic-alignment";
    panel.id = "lean-alignment-" + key;
    panel.setAttribute("aria-live", "polite");

    const label = document.createElement("span");
    label.className = "lean-semantic-alignment-label";
    label.textContent = "Semantic alignment";
    const statement = document.createElement("p");
    statement.className = "lean-semantic-alignment-statement";
    const remark = document.createElement("div");
    remark.className = "lean-formalization-remark";
    remark.hidden = true;
    const remarkTitle = document.createElement("strong");
    const remarkBody = document.createElement("p");
    const remarkSources = document.createElement("div");
    remarkSources.className = "lean-formalization-sources";
    remark.append(remarkTitle, remarkBody, remarkSources);
    panel.append(label, statement, remark);

    const termsByConcept = new Map();
    let activeTargets = [];
    let activeTerms = [];
    let pinnedAlignment = null;
    const clearSelection = () => {
      activeTargets.forEach((target) => target.classList.remove("is-lean-aligned"));
      activeTerms.forEach((term) => term.classList.remove("is-lean-selected"));
      activeTargets = [];
      activeTerms = [];
    };
    const display = (alignment) => {
      clearSelection();
      activeTargets = paperTargets(key, alignment.concept);
      activeTerms = termsByConcept.get(alignment.concept) || [];
      activeTargets.forEach((target) => target.classList.add("is-lean-aligned"));
      activeTerms.forEach((term) => term.classList.add("is-lean-selected"));
      statement.textContent = "";
      const code = document.createElement("code");
      code.textContent = alignment.token;
      statement.append(code);
      if (alignment.explanation) {
        statement.append(document.createTextNode(" — " + alignment.explanation));
        if (alignment.reference) {
          const reference = document.createElement("a");
          reference.href = alignment.reference.href;
          reference.textContent = alignment.reference.label;
          reference.addEventListener("click", () => {
            const target = document.querySelector(alignment.reference.href);
            if (target?.tagName === "DETAILS") target.open = true;
          });
          statement.append(document.createTextNode(" "), reference);
        }
        statement.append(document.createTextNode("."));
      } else {
        statement.append(document.createTextNode(" ↔ “" + alignment.paper + "”."));
      }
      if (alignment.documentation) {
        const documentation = document.createElement("a");
        documentation.href = alignment.documentation.href;
        documentation.target = "_blank";
        documentation.rel = "noreferrer";
        documentation.textContent = alignment.documentation.label + " ↗";
        statement.append(document.createTextNode(" "), documentation);
      }
      remark.hidden = !alignment.note;
      if (alignment.note) {
        remarkTitle.textContent = alignment.noteTitle || "Formalization remark";
        remarkBody.textContent = alignment.note;
        remarkSources.textContent = "";
        (alignment.sources || []).forEach((source, index) => {
          if (index) remarkSources.append(document.createTextNode(" · "));
          const link = document.createElement("a");
          link.href = source.href;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = (source.label || "Source") + " ↗";
          remarkSources.append(link);
        });
        remarkSources.hidden = !remarkSources.childNodes.length;
      }
    };
    const show = (alignment, { pin = false } = {}) => {
      if (pin) pinnedAlignment = alignment;
      display(alignment);
    };
    const reset = () => {
      if (pinnedAlignment) {
        display(pinnedAlignment);
        return;
      }
      clearSelection();
      statement.textContent = "Select a highlighted term in the paper or Lean statement to compare them.";
      remark.hidden = true;
    };
    const clear = () => {
      pinnedAlignment = null;
      reset();
    };
    const registerTerm = (alignment, term) => {
      const terms = termsByConcept.get(alignment.concept) || [];
      terms.push(term);
      termsByConcept.set(alignment.concept, terms);
    };
    reset();
    return { alignments, clear, panel, registerTerm, reset, show };
  };

  const findTextOccurrence = (source, token, minimumOffset = 0) => {
    const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
    let consumed = 0;
    let node = walker.nextNode();
    while (node) {
      const parentTerm = node.parentElement?.closest(".lean-semantic-term, .lean-mathlib-term");
      if (!parentTerm) {
        let fromIndex = Math.max(0, minimumOffset - consumed);
        let index = node.data.indexOf(token, fromIndex);
        while (index !== -1) {
          if (consumed + index >= minimumOffset) return { index, node };
          fromIndex = index + token.length;
          index = node.data.indexOf(token, fromIndex);
        }
      }
      consumed += node.data.length;
      node = walker.nextNode();
    }
    return null;
  };

  const annotateSource = (disclosure, source, statementDefinition) => {
    if (source.dataset.semanticAnnotated === "true") return;
    const key = disclosure.dataset.statement;
    const controller = alignmentControllers.get(disclosure);
    if (!controller) return;

    const primaryDeclarationOffset = statementDefinition.alignmentScope === "primary-declaration"
      ? source.textContent.indexOf(statementDefinition.title)
      : 0;

    controller.alignments.forEach((alignment) => {
      const match = findTextOccurrence(
        source,
        alignment.token,
        Math.max(0, primaryDeclarationOffset),
      );
      if (!match) return;

      const { index, node } = match;
      const before = node.data.slice(0, index);
      const after = node.data.slice(index + alignment.token.length);
      const fragment = document.createDocumentFragment();
      if (before) fragment.append(document.createTextNode(before));
      const term = document.createElement("span");
      term.className = "lean-semantic-term";
      term.tabIndex = 0;
      term.textContent = alignment.token;
      term.dataset.leanAlignment = key + ":" + alignment.concept;
      term.setAttribute("aria-describedby", controller.panel.id);
      term.addEventListener("pointerenter", () => controller.show(alignment));
      term.addEventListener("focus", () => controller.show(alignment));
      term.addEventListener("click", () => controller.show(alignment, { pin: true }));
      term.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        controller.show(alignment, { pin: true });
      });
      controller.registerTerm(alignment, term);
      fragment.append(term);
      if (after) fragment.append(document.createTextNode(after));
      node.replaceWith(fragment);
    });

    disclosure.addEventListener("pointerleave", controller.reset);
    source.addEventListener("focusout", (event) => {
      if (!disclosure.contains(event.relatedTarget)) controller.reset();
    });
    source.dataset.semanticAnnotated = "true";
  };

  const annotateMathlibTerms = (source) => {
    if (source.dataset.mathlibAnnotated === "true") return;
    mathlibTerms.forEach(({ token, documentation }) => {
      const match = findTextOccurrence(source, token);
      if (!match) return;
      const { index, node } = match;
      const before = node.data.slice(0, index);
      const after = node.data.slice(index + token.length);
      const fragment = document.createDocumentFragment();
      if (before) fragment.append(document.createTextNode(before));
      const link = document.createElement("a");
      link.className = "lean-mathlib-term";
      link.href = documentation.href;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = token;
      link.title = documentation.label;
      link.setAttribute("aria-label", `${token}: open Mathlib documentation`);
      fragment.append(link);
      if (after) fragment.append(document.createTextNode(after));
      node.replaceWith(fragment);
    });
    source.dataset.mathlibAnnotated = "true";
  };

  const highlight = (disclosure) => {
    if (!disclosure.open) return;
    const source = disclosure.querySelector(":scope > .lean-statement-body code.language-lean");
    if (!source) return;
    if (source.dataset.highlighted !== "yes" && typeof window.hljs?.highlightElement === "function") {
      window.hljs.highlightElement(source);
    }
    const statementDefinition = statements[disclosure.dataset.statement];
    annotateSource(disclosure, source, statementDefinition);
    annotateMathlibTerms(source);
  };

  const bindPaperTerms = (disclosure, key, controller, notesTarget) => {
    controller.alignments.forEach((alignment) => {
      paperTargets(key, alignment.concept).forEach((target) => {
        const concepts = target.dataset.leanAlignment.trim().split(/\s+/u);
        const nestedControl = target.closest("a, button, summary");
        if (concepts.length !== 1 || nestedControl) return;

        target.classList.add("lean-paper-term");
        target.tabIndex = 0;
        target.setAttribute("role", "button");
        target.setAttribute("aria-controls", disclosure.id);
        target.title = "Show the matching term in the formalized statement";

        const select = () => {
          disclosure.open = true;
          if (notesTarget) notesTarget.hidden = false;
          highlight(disclosure);
          controller.show(alignment, { pin: true });
        };
        target.addEventListener("pointerenter", () => {
          if (disclosure.open) controller.show(alignment);
        });
        target.addEventListener("pointerleave", controller.reset);
        target.addEventListener("focus", () => {
          if (disclosure.open) controller.show(alignment);
        });
        target.addEventListener("blur", controller.reset);
        target.addEventListener("click", select);
        target.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          select();
        });
      });
    });
  };

  const render = (host) => {
    const key = host.dataset.statement;
    const statement = statements[key];
    if (!statement) {
      host.dataset.statementError = "unknown statement";
      console.error(`Unknown Lean statement: ${key || "(missing key)"}`);
      return;
    }
    const notesTarget = host.dataset.notesTarget
      ? document.querySelector(host.dataset.notesTarget)
      : null;

    const disclosure = document.createElement("details");
    disclosure.className = "lean-statement";
    disclosure.dataset.statement = key;
    disclosure.id = "lean-statement-" + key;
    disclosure.open = host.hasAttribute("open");

    const summary = document.createElement("summary");
    const heading = document.createElement("span");
    const label = document.createElement("small");
    label.textContent = "Formalized statement";
    const title = document.createElement("code");
    title.textContent = statement.title;
    heading.append(label, title);
    const action = document.createElement("i");
    action.setAttribute("aria-hidden", "true");
    action.textContent = "show +";
    summary.append(heading, action);

    const alignments = semanticAlignments[key] || [];
    const body = document.createElement("div");
    body.className = "lean-statement-body";
    body.id = disclosure.id + "-body";
    const pre = document.createElement("pre");
    const source = document.createElement("code");
    source.className = "language-lean";
    source.textContent = alignments.length
      ? `-- Hover over terms for explanations\n-- and semantic alignment with the paper.\n\n${statement.source}`
      : statement.source;
    pre.append(source);
    if (statement.caption) {
      const caption = document.createElement("p");
      caption.className = "lean-statement-caption";
      caption.append(document.createTextNode(statement.caption));
      if (statement.captionCitation) {
        const citation = document.createElement("a");
        citation.href = statement.captionCitation.href;
        citation.target = "_blank";
        citation.rel = "noreferrer";
        citation.textContent = "[" + statement.captionCitation.label + "]";
        caption.append(document.createTextNode(" "), citation);
      }
      (notesTarget || body).append(caption);
    }
    body.append(pre);
    const sources = statementSources[key];
    if (sources) {
      const sourceLinks = document.createElement("div");
      sourceLinks.className = "lean-formalization-sources lean-statement-sources";
      sources.forEach((sourceDefinition, index) => {
        if (index) sourceLinks.append(document.createTextNode(" · "));
        const link = document.createElement("a");
        link.href = sourceDefinition.href;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = sourceDefinition.label + " ↗";
        sourceLinks.append(link);
      });
      (notesTarget || body).append(sourceLinks);
    }
    if (alignments.length) {
      const controller = createAlignmentController(key, alignments);
      alignmentControllers.set(disclosure, controller);
      (notesTarget || body).append(controller.panel);
      bindPaperTerms(disclosure, key, controller, notesTarget);
    }
    disclosure.append(summary, body);
    host.replaceWith(disclosure);
    if (notesTarget) notesTarget.hidden = !disclosure.open;

    disclosure.addEventListener("toggle", () => {
      if (disclosure.open) {
        if (notesTarget) notesTarget.hidden = false;
        highlight(disclosure);
      } else {
        alignmentControllers.get(disclosure)?.clear();
        if (notesTarget) notesTarget.hidden = true;
      }
    });
    highlight(disclosure);
  };

  document.querySelectorAll("lean-statement[data-statement]").forEach(render);
  window.SCHIFFER_LEAN_STATEMENTS = statements;
})();
