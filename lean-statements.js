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
        "/-- `Ω` is a regular `C²` super-level set. In particular, `Ω` is open,",
        "because a `C²` defining function is continuous. -/",
        "def HasC2Boundary (Ω : Set Plane) : Prop :=",
        "  ∃ (F : Plane → ℝ),",
        "    ContDiff ℝ 2 F ∧",
        "    Ω = {x | 0 < F x} ∧",
        "    ∀ x, F x = 0 → ∇ F x ≠ 0",
        "",
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
        "/-- `Ω` is an ordinary open Euclidean disk, with arbitrary center",
        "and radius. -/",
        "def IsEuclideanDisk (Ω : Set Plane) : Prop :=",
        "  ∃ (c : Plane) (r : ℝ), Ω = Metric.ball c r",
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

  // highlightjs-lean 1.2 ships the maintained Lean grammar, but its keyword
  // list predates Lean 4's `abbrev`. Extend that grammar before the first
  // block is tokenized; source markup remains entirely Highlight.js-owned.
  const leanGrammar = window.hljs?.getLanguage?.("lean");
  if (typeof leanGrammar?.keywords?.keyword === "string"
      && !leanGrammar.keywords.keyword.split(/\s+/u).includes("abbrev")) {
    leanGrammar.keywords.keyword += " abbrev";
  }

  const highlight = (disclosure) => {
    if (!disclosure.open || typeof window.hljs?.highlightElement !== "function") return;
    const source = disclosure.querySelector(":scope > .lean-statement-body code.language-lean");
    if (!source || source.dataset.highlighted === "yes") return;
    window.hljs.highlightElement(source);
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
    disclosure.append(summary, body);
    host.replaceWith(disclosure);

    disclosure.addEventListener("toggle", () => highlight(disclosure));
    highlight(disclosure);
  };

  document.querySelectorAll("lean-statement[data-statement]").forEach(render);
  window.SCHIFFER_LEAN_STATEMENTS = statements;
})();
