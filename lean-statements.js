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
      alignmentScope: "primary-declaration",
      caption: "The Lean statement records C² boundary regularity. The paper states smooth regularity after applying Williams’s theorem; that upgrade is not yet formalized.",
      source: [
        "/-- A regular `C²` super-level set.",
        "The set `Ω` is open because its",
        "defining function is continuous. -/",
        "def HasC2Boundary",
        "    (Ω : Set Plane) : Prop :=",
        "  ∃ (F : Plane → ℝ),",
        "    ContDiff ℝ 2 F ∧",
        "    Ω = {x | 0 < F x} ∧",
        "    ∀ x, F x = 0 →",
        "      ∇ F x ≠ 0",
        "",
        "/-- An ordinary open Euclidean disk,",
        "with arbitrary centre and radius. -/",
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
    note: "The Schiffer conjecture is generally stated for Lipschitz domains. A C² boundary is Lipschitz, and S. A. Williams proved that a planar Lipschitz domain without the Pompeiu property has real-analytic boundary. Thus the Lean theorem reaches the conjecture’s usual regularity class, while the upgrade to the paper’s smooth statement remains unformalized.",
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

  const statementRemarks = Object.freeze({
    "schiffer-star-shaped": Object.freeze({
      title: "Comparator challenge",
      note: "This display shows only the theorem’s type. The linked challenge file retains the proof hole; Comparator uses the trusted statement to check the completed development.",
      sources: comparatorSources,
    }),
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
  });

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
    explanation: "Here Ω is coerced to its subtype, so Nonempty Ω means that Ω contains a point",
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
    explanation: "This project-local predicate means that Ω is an open metric ball; the theorem negates it",
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
      boundedAlignment,
      Object.freeze({
        token: "HasC2Boundary",
        concept: "regularity",
        paper: "smooth boundary",
        explanation: "A project-local predicate requiring the domain to be a regular C² super-level set",
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
        noteTitle: "Formalization remark",
        note: "The equivalence is stated with the paper hypotheses, but its proof is still represented by sorry.",
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
        explanation: "A project-local predicate requiring Ω to be a regular C² super-level set",
        ...regularityRemark,
      }),
      euclideanDiskAlignment,
      Object.freeze({
        token: "IsSchifferDomain",
        concept: "schiffer",
        paper: "solves the Schiffer problem",
        explanation: "The project-local predicate for the normalized Schiffer boundary-value problem; its definition appears",
        reference: Object.freeze({
          href: "#lean-statement-schiffer-property",
          label: "below",
        }),
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
        explanation: "A project-local predicate requiring Ω to be a regular C² super-level set",
        ...regularityRemark,
      }),
      euclideanDiskAlignment,
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
      const parentTerm = node.parentElement?.closest(".lean-semantic-term");
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

  const highlight = (disclosure) => {
    if (!disclosure.open || typeof window.hljs?.highlightElement !== "function") return;
    const source = disclosure.querySelector(":scope > .lean-statement-body code.language-lean");
    if (!source) return;
    if (source.dataset.highlighted !== "yes") window.hljs.highlightElement(source);
    const statementDefinition = statements[disclosure.dataset.statement];
    annotateSource(disclosure, source, statementDefinition);
  };

  const bindPaperTerms = (disclosure, key, controller) => {
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

    const body = document.createElement("div");
    body.className = "lean-statement-body";
    body.id = disclosure.id + "-body";
    const pre = document.createElement("pre");
    const source = document.createElement("code");
    source.className = "language-lean";
    source.textContent = statement.source;
    pre.append(source);
    if (statement.caption) {
      const caption = document.createElement("p");
      caption.className = "lean-statement-caption";
      caption.textContent = statement.caption;
      (notesTarget || body).append(caption);
    }
    body.append(pre);
    const statementRemark = statementRemarks[key];
    if (statementRemark) {
      const remark = document.createElement("div");
      remark.className = "lean-formalization-remark lean-statement-remark";
      const remarkTitle = document.createElement("strong");
      remarkTitle.textContent = statementRemark.title;
      const remarkBody = document.createElement("p");
      remarkBody.textContent = statementRemark.note;
      const remarkSources = document.createElement("div");
      remarkSources.className = "lean-formalization-sources";
      statementRemark.sources.forEach((sourceDefinition, index) => {
        if (index) remarkSources.append(document.createTextNode(" · "));
        const link = document.createElement("a");
        link.href = sourceDefinition.href;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = sourceDefinition.label + " ↗";
        remarkSources.append(link);
      });
      remark.append(remarkTitle, remarkBody, remarkSources);
      (notesTarget || body).append(remark);
    }
    const alignments = semanticAlignments[key] || [];
    if (alignments.length) {
      const controller = createAlignmentController(key, alignments);
      alignmentControllers.set(disclosure, controller);
      (notesTarget || body).append(controller.panel);
      bindPaperTerms(disclosure, key, controller);
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
