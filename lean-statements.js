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
        "abbrev Plane := (EuclideanSpace ℝ (Fin 2))",
        "abbrev RigidMotion := AffineIsometryEquiv ℝ Plane Plane",
        "",
        "/-- The measurement map for a set `Ω` takes a continuous function",
        "`f ∈ C⁰(Plane, ℝ)` to its integrals over the rigid-motion images",
        "of `Ω`. -/",
        "def MeasurementMap (Ω : Set Plane) (f : C(Plane, ℝ)) :",
        "    RigidMotion → ℝ :=",
        "  fun E ↦ ∫ x in E '' Ω, f x",
        "",
        "/-- A set `Ω` has the **Pompeiu property** if its measurement map",
        "is injective. -/",
        "",
        "def HasPompeiuProperty (Ω : Set (Plane)) : Prop :=",
        "  (MeasurementMap Ω).Injective",
      ].join("\n"),
    }),
    "disk-not-pompeiu": Object.freeze({
      title: "DiskNotPompeiu",
      source: [
        "lemma DiskNotPompeiu (c : Plane) (r : ℝ) (hr : r > 0) :",
        "    ¬ HasPompeiuProperty (Metric.ball c r) := by",
        "  sorry",
      ].join("\n"),
    }),
    "schiffer-property": Object.freeze({
      title: "IsSchifferDomain",
      source: [
        "open Gradient Laplacian",
        "",
        "-- By rescaling the domain we may assume λ = 1.",
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
        "    IsSchifferDomain Ω ↔ ¬ HasPompeiuProperty Ω := by",
        "  sorry",
      ].join("\n"),
    }),
    "schiffer-star-shaped": Object.freeze({
      title: "Schiffer_Star_Shaped",
      source: [
        "/-- `Ω` is a regular `C²` super-level set. In particular, `Ω` is open,",
        "because a `C²` defining function is continuous. -/",
        "def HasC2Boundary (Ω : Set Plane) : Prop :=",
        "  ∃ (F : Plane → ℝ),",
        "    ContDiff ℝ 2 F ∧",
        "    Ω = {x | 0 < F x} ∧",
        "    ∀ x, F x = 0 → ∇ F x ≠ 0",
        "",
        "/-- `Ω` is an ordinary open Euclidean disk, with arbitrary center",
        "and radius. -/",
        "def IsEuclideanDisk (Ω : Set Plane) : Prop :=",
        "  ∃ (c : Plane) (r : ℝ), Ω = Metric.ball c r",
        "",
        "-- See below for the definition of `IsSchifferDomain` used here.",
        "",
        "theorem Schiffer_Star_Shaped :",
        "  ∃ (Ω : Set Plane),",
        "    IsBounded Ω ∧ Nonempty Ω ∧",
        "    StarConvex ℝ 0 Ω ∧ HasC2Boundary Ω ∧",
        "    ¬ IsEuclideanDisk Ω ∧",
        "    IsSchifferDomain Ω := by",
        "  sorry",
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
        "    ¬ HasPompeiuProperty Ω := by",
        "  sorry",
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
        "/-- `Cone.Crossing` packages the coincidence `J 1 ρ = 0` and",
        "`J R ρ = 0`.  All sufficiently large crossings in the spectral",
        "window `[2, 3]` carry a uniformly controlled `C³` branch. -/",
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
        "            ‖iteratedDeriv j b.radius s‖ ≤ C := by",
        "  sorry",
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
        "/-- Here `J : ℝ → ℝ → ℝ` is the Bessel function of the first kind,",
        "with real order and real argument.  Bessel coincidences occur",
        "arbitrarily close above arbitrarily large integer orders. -/",
        "theorem exists_nearIntegerCrossing",
        "    (δ : ℝ) (hδ : 0 < δ) (Nmin : ℕ) :",
        "    ∃ (N : ℕ) (R ρ : ℝ),",
        "      Nmin ≤ N ∧",
        "      (N : ℝ) < R ∧ R < (N : ℝ) + δ ∧",
        "      0 < ρ ∧",
        "      J 1 ρ = 0 ∧ J R ρ = 0 ∧",
        "      2 < ρ ^ 2 / R ^ 2 ∧ ρ ^ 2 / R ^ 2 < 3 := by",
        "  sorry",
      ].join("\n"),
    }),
  });

  const regularityRemark = Object.freeze({
    noteTitle: "Formalization remark",
    note: "The Lean predicate records a regular C² boundary, while the paper states the resulting counterexample as smooth. A C² boundary is Lipschitz; S. A. Williams proved that a planar Lipschitz domain without the Pompeiu property has real-analytic boundary. That regularity upgrade has not been formalized here.",
    sourceHref: "https://doi.org/10.1512/iumj.1981.30.30028",
    sourceLabel: "Williams (1981)",
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
      }),
      Object.freeze({
        token: "HasPompeiuProperty",
        concept: "fails",
        paper: "fails the Pompeiu property",
        noteTitle: "Formalization remark",
        note: "The displayed Lean declaration records the theorem statement. The Bessel-function witness and proof are still represented by sorry.",
      }),
    ]),
    "schiffer-property": Object.freeze([
      Object.freeze({
        token: "IsSchifferDomain",
        concept: "schiffer-system",
        paper: "the Schiffer system",
      }),
      Object.freeze({
        token: "∇ u",
        concept: "gradient",
        paper: "the equivalent boundary condition ∇u = 0",
      }),
      Object.freeze({
        token: "λ = 1",
        concept: "normalization",
        paper: "normalizing the eigenvalue to λ = 1",
        noteTitle: "Formalization remark",
        note: "The paper keeps λ visible; the Lean predicate rescales the domain and fixes λ = 1. The equivalence of these conventions is explained in the prose but not proved in this excerpt.",
      }),
    ]),
    "schiffer-pompeiu-equivalence": Object.freeze([
      Object.freeze({
        token: "IsBounded",
        concept: "bounded",
        paper: "bounded",
      }),
      Object.freeze({
        token: "HasC2Boundary",
        concept: "regularity",
        paper: "smooth boundary",
        ...regularityRemark,
      }),
      Object.freeze({
        token: "IsSchifferDomain",
        concept: "schiffer",
        paper: "solves the Schiffer problem",
      }),
      Object.freeze({
        token: "HasPompeiuProperty",
        concept: "pompeiu",
        paper: "fails the Pompeiu property",
        noteTitle: "Formalization remark",
        note: "The equivalence is stated with the paper hypotheses, but its proof is still represented by sorry.",
      }),
    ]),
    "schiffer-star-shaped": Object.freeze([
      Object.freeze({ token: "IsBounded", concept: "bounded", paper: "bounded" }),
      Object.freeze({ token: "Nonempty", concept: "nonempty", paper: "nonempty" }),
      Object.freeze({ token: "StarConvex", concept: "star-shaped with respect to the origin", paper: "star-shaped with respect to the origin" }),
      Object.freeze({
        token: "HasC2Boundary",
        concept: "regularity",
        paper: "smooth",
        ...regularityRemark,
      }),
      Object.freeze({ token: "IsEuclideanDisk", concept: "not-disk", paper: "not a disk" }),
      Object.freeze({
        token: "IsSchifferDomain",
        concept: "schiffer",
        paper: "solves the Schiffer problem",
        noteTitle: "Formalization remark",
        note: "This excerpt exposes the theorem’s logical shape. The existence proof is still represented by sorry.",
      }),
    ]),
    "pompeiu-star-shaped": Object.freeze([
      Object.freeze({ token: "IsBounded", concept: "bounded", paper: "bounded" }),
      Object.freeze({ token: "Nonempty", concept: "nonempty", paper: "nonempty" }),
      Object.freeze({ token: "StarConvex", concept: "star-shaped with respect to the origin", paper: "star-shaped with respect to the origin" }),
      Object.freeze({
        token: "HasC2Boundary",
        concept: "regularity",
        paper: "regular C² boundary",
        ...regularityRemark,
      }),
      Object.freeze({ token: "IsEuclideanDisk", concept: "not-disk", paper: "not a disk" }),
      Object.freeze({
        token: "HasPompeiuProperty",
        concept: "pompeiu",
        paper: "does not have the Pompeiu property",
        noteTitle: "Formalization remark",
        note: "The corollary’s statement is encoded, while its deduction from the Schiffer theorem and Williams’s equivalence is still represented by sorry.",
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
        note: "The excerpt records the intended public interface. The project-specific cone structures and the analytic bifurcation proof are not part of Mathlib, and the proof remains sorry.",
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
        note: "The quantified conclusion is encoded. The McMahon–Debye phase alignment and equidistribution argument are not yet formalized; the proof remains sorry.",
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
    const remarkSource = document.createElement("a");
    remarkSource.target = "_blank";
    remarkSource.rel = "noreferrer";
    remark.append(remarkTitle, remarkBody, remarkSource);
    panel.append(label, statement, remark);

    let activeTargets = [];
    const clearTargets = () => {
      activeTargets.forEach((target) => target.classList.remove("is-lean-aligned"));
      activeTargets = [];
    };
    const show = (alignment) => {
      clearTargets();
      activeTargets = paperTargets(key, alignment.concept);
      activeTargets.forEach((target) => target.classList.add("is-lean-aligned"));
      statement.textContent = "";
      const code = document.createElement("code");
      code.textContent = alignment.token;
      statement.append(code, document.createTextNode(" corresponds to “" + alignment.paper + "” in the paper."));
      remark.hidden = !alignment.note;
      if (alignment.note) {
        remarkTitle.textContent = alignment.noteTitle || "Formalization remark";
        remarkBody.textContent = alignment.note;
        if (alignment.sourceHref) {
          remarkSource.hidden = false;
          remarkSource.href = alignment.sourceHref;
          remarkSource.textContent = (alignment.sourceLabel || "Source") + " ↗";
        } else {
          remarkSource.hidden = true;
          remarkSource.removeAttribute("href");
          remarkSource.textContent = "";
        }
      }
    };
    const reset = () => {
      clearTargets();
      statement.textContent = "Hover or focus a highlighted Lean term to see its paper-level meaning.";
      remark.hidden = true;
    };
    reset();
    return { alignments, panel, reset, show };
  };

  const annotateSource = (disclosure, source) => {
    if (source.dataset.semanticAnnotated === "true") return;
    const controller = alignmentControllers.get(disclosure);
    if (!controller) return;

    controller.alignments.forEach((alignment) => {
      const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node && !node.data.includes(alignment.token)) node = walker.nextNode();
      if (!node) return;

      const index = node.data.indexOf(alignment.token);
      const before = node.data.slice(0, index);
      const after = node.data.slice(index + alignment.token.length);
      const fragment = document.createDocumentFragment();
      if (before) fragment.append(document.createTextNode(before));
      const term = document.createElement("span");
      term.className = "lean-semantic-term";
      term.tabIndex = 0;
      term.textContent = alignment.token;
      term.setAttribute("aria-describedby", controller.panel.id);
      term.addEventListener("pointerenter", () => controller.show(alignment));
      term.addEventListener("focus", () => controller.show(alignment));
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

  const highlight = (disclosure) => {
    if (!disclosure.open || typeof window.hljs?.highlightElement !== "function") return;
    const source = disclosure.querySelector(":scope > .lean-statement-body code.language-lean");
    if (!source) return;
    if (source.dataset.highlighted !== "yes") window.hljs.highlightElement(source);
    annotateSource(disclosure, source);
  };

  const render = (host) => {
    const key = host.dataset.statement;
    const statement = statements[key];
    if (!statement) {
      host.dataset.statementError = "unknown statement";
      console.error(`Unknown Lean statement: ${key || "(missing key)"}`);
      return;
    }

    const disclosure = document.createElement("details");
    disclosure.className = "lean-statement";
    disclosure.dataset.statement = key;
    disclosure.open = host.hasAttribute("open");

    const summary = document.createElement("summary");
    const heading = document.createElement("span");
    const label = document.createElement("small");
    label.textContent = "Lean statement";
    const title = document.createElement("code");
    title.textContent = statement.title;
    heading.append(label, title);
    const action = document.createElement("i");
    action.setAttribute("aria-hidden", "true");
    action.textContent = "show +";
    summary.append(heading, action);

    const body = document.createElement("div");
    body.className = "lean-statement-body";
    const pre = document.createElement("pre");
    const source = document.createElement("code");
    source.className = "language-lean";
    source.textContent = statement.source;
    pre.append(source);
    body.append(pre);
    const alignments = semanticAlignments[key] || [];
    if (alignments.length) {
      const controller = createAlignmentController(key, alignments);
      alignmentControllers.set(disclosure, controller);
      body.append(controller.panel);
    }
    disclosure.append(summary, body);
    host.replaceWith(disclosure);

    disclosure.addEventListener("toggle", () => highlight(disclosure));
    highlight(disclosure);
  };

  document.querySelectorAll("lean-statement[data-statement]").forEach(render);
  window.SCHIFFER_LEAN_STATEMENTS = statements;
})();
