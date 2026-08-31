(() => {
  "use strict";

  const headingSelector = "body.tufte-site main .section-heading[data-number][data-title]";
  const layoutCheckEnabled = new URLSearchParams(window.location.search).has("layout-check");
  const normalizeText = (value) => (value || "")
    .replace(/\s+/g, " ")
    .trim();

  const headingTarget = (heading) => {
    if (heading.dataset.target) return document.querySelector(heading.dataset.target);
    if (heading.id) return heading;
    return heading.closest("[id]") || heading.querySelector("[id]");
  };

  const headingTitleElement = (heading) => heading.querySelector(":scope > :is(h2, h3)");

  if (!layoutCheckEnabled) return;

  /* The production math layer owns typesetting.  This file only audits the
     result, after renderers, fonts, and disclosure layout have settled. */
  let contractFrame = 0;
  let contractRetryTimer = 0;
  let pendingFailureSignature = "";
  let pendingFailureSince = 0;
  let reportedFailureSignature = "";
  const scheduleContract = () => {
    if (contractFrame) cancelAnimationFrame(contractFrame);
    contractFrame = requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      contractFrame = 0;
      runLayoutContract();
    })));
  };
  scheduleContract();
  window.addEventListener("load", scheduleContract);
  window.addEventListener("resize", scheduleContract);
  document.fonts?.ready.then(scheduleContract);
  const main = document.querySelector("main");
  if (main) {
    new MutationObserver(scheduleContract).observe(main, { childList: true, subtree: true });
    main.querySelectorAll("details").forEach((details) => details.addEventListener("toggle", scheduleContract));
  }
  const sectionNavigation = document.querySelector("[data-section-navigation]");
  if (sectionNavigation) {
    new MutationObserver(scheduleContract).observe(sectionNavigation, { childList: true, subtree: true });
    sectionNavigation.querySelectorAll("details").forEach((details) => details.addEventListener("toggle", scheduleContract));
    sectionNavigation.addEventListener("toggle", scheduleContract);
  }

  const rounded = (value) => Math.round(value * 10) / 10;
  const marginSelector = "body.tufte-site main .marginnote";
  const disclosureSelector = "body.tufte-site main details:not(.secondary-controls, .mobile-apparatus-disclosure, .certificate-provenance-index)";
  const roleSelector = ".paper-copy, .math-statement, .lean-statement, .small-multiples, .figure-band, .reading-figure, .margin-figure-sequence, .data-table";

  function runLayoutContract() {
    const errors = [];
    const narrow = window.matchMedia("(max-width: 1180px)").matches;
    const handset = window.matchMedia("(max-width: 760px)").matches;
    const page = document.documentElement.getBoundingClientRect();
    const rootStyle = getComputedStyle(document.documentElement);
    const reading = parseFloat(rootStyle.getPropertyValue("--measure-reading")) / 100;
    const aside = parseFloat(rootStyle.getPropertyValue("--measure-aside")) / 100;
    const noteInReading = parseFloat(rootStyle.getPropertyValue("--measure-note-in-reading")) / 100;
    const gutter = parseFloat(rootStyle.getPropertyValue("--measure-gutter")) / 100;
    const figure = parseFloat(rootStyle.getPropertyValue("--measure-figure")) / 100;
    const readingInFigure = parseFloat(rootStyle.getPropertyValue("--measure-reading-in-figure")) / 100;
    const mobileNote = parseFloat(rootStyle.getPropertyValue("--measure-mobile-note")) / 100;
    const typeProof = parseFloat(rootStyle.getPropertyValue("--type-proof")) * parseFloat(rootStyle.fontSize);
    const typeCaption = parseFloat(rootStyle.getPropertyValue("--type-caption")) * parseFloat(rootStyle.fontSize);
    const typeLabel = parseFloat(rootStyle.getPropertyValue("--type-label")) * parseFloat(rootStyle.fontSize);
    const typeSection = parseFloat(rootStyle.getPropertyValue("--type-section")) * parseFloat(rootStyle.fontSize);
    const typeSubsection = parseFloat(rootStyle.getPropertyValue("--type-subsection")) * parseFloat(rootStyle.fontSize);
    const typeControlValue = parseFloat(rootStyle.getPropertyValue("--type-control-value")) * parseFloat(rootStyle.fontSize);
    const typeCode = parseFloat(rootStyle.getPropertyValue("--type-code")) * parseFloat(rootStyle.fontSize);
    const leadingCaption = parseFloat(rootStyle.getPropertyValue("--leading-caption"));
    const serifFamily = rootStyle.getPropertyValue("--serif").trim();
    const monoFamily = rootStyle.getPropertyValue("--mono").trim();
    const regularWeight = rootStyle.getPropertyValue("--weight-regular").trim();

    const resolvedColor = (customProperty) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${customProperty})`;
      probe.hidden = true;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const inkColor = resolvedColor("--ink");
    const mutedColor = resolvedColor("--muted");

    if (!narrow && Math.abs(aside - reading * noteInReading) > .001) {
      errors.push("the apparatus aside measure has drifted from native Tufte marginalia");
    }

    const sectionMeasure = (element, ratio) => {
      const section = element.closest("main > section");
      const parent = element.parentElement;
      if (!section || !parent) return element.getBoundingClientRect().width;
      return Math.min(parent.getBoundingClientRect().width, section.getBoundingClientRect().width * ratio);
    };

    const checkType = (selector, expected, label) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        if (!visible(element)) return;
        const actual = parseFloat(getComputedStyle(element).fontSize);
        if (Math.abs(actual - expected) > .2) {
          errors.push(`${label} ${index + 1} uses ${rounded(actual)}px instead of ${rounded(expected)}px`);
        }
      });
    };

    const visible = (element) => {
      if (!element || !element.getClientRects().length) return false;
      const closedDetails = element.closest("details:not([open])");
      if (closedDetails && !closedDetails.querySelector(":scope > summary")?.contains(element)) return false;
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    };

    const normalizedFamily = (value) => value
      .toLowerCase()
      .replace(/["']/g, "")
      .replace(/\s+/g, "");

    const checkTypography = (selector, expected, label) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        if (!visible(element)) return;
        const style = getComputedStyle(element);
        const mismatches = [];
        if (expected.family
            && normalizedFamily(style.fontFamily) !== normalizedFamily(expected.family)) {
          mismatches.push(`family ${style.fontFamily}`);
        }
        if (Number.isFinite(expected.size)
            && Math.abs(parseFloat(style.fontSize) - expected.size) > .2) {
          mismatches.push(`size ${rounded(parseFloat(style.fontSize))}px`);
        }
        if (expected.weight && style.fontWeight !== expected.weight) {
          mismatches.push(`weight ${style.fontWeight}`);
        }
        if (expected.style && style.fontStyle !== expected.style) {
          mismatches.push(`style ${style.fontStyle}`);
        }
        if (expected.color && style.color !== expected.color) {
          mismatches.push(`colour ${style.color}`);
        }
        if (Number.isFinite(expected.lineHeight)
            && Math.abs(parseFloat(style.lineHeight) - expected.lineHeight) > .2) {
          mismatches.push(`leading ${rounded(parseFloat(style.lineHeight))}px`);
        }
        if (mismatches.length) {
          errors.push(`${label} ${index + 1} violates its type role: ${mismatches.join(", ")}`);
        }
      });
    };

    const directVisibleText = (root) => Array.from(root.querySelectorAll("*"))
      .filter(visible)
      .map((element) => Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(" "))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const canonicalSideWidth = () => {
      if (narrow) return null;
      const source = Array.from(document.querySelectorAll(
        "body.tufte-site main .historical-margin, body.tufte-site main .chladni-photo-panel"
      )).find(visible);
      return source ? source.getBoundingClientRect().width : null;
    };

    const checkCanvasAspect = (canvas) => {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height || !canvas.width || !canvas.height) return;
      const cssRatio = box.width / box.height;
      const bitmapRatio = canvas.width / canvas.height;
      const rasterQuantization = 1 / Math.max(1, Math.min(canvas.width, canvas.height));
      if (Math.abs(cssRatio / bitmapRatio - 1) > Math.max(.01, rasterQuantization)) {
        errors.push(`${canvas.id || "unnamed canvas"} has mismatched CSS and bitmap aspect ratios`);
      }
    };

    if (document.documentElement.scrollWidth > window.innerWidth + 1) {
      errors.push(`page overflows by ${document.documentElement.scrollWidth - window.innerWidth}px`);
    }

    document.querySelectorAll("lean-statement").forEach((host, index) => {
      errors.push(`Lean statement host ${index + 1} was not rendered${host.dataset.statement ? ` (${host.dataset.statement})` : ""}`);
    });

    const expectedLeanStatements = [
      "schiffer-star-shaped",
      "pompeiu-property",
      "disk-not-pompeiu",
      "schiffer-property",
      "schiffer-pompeiu-equivalence",
      "pompeiu-star-shaped",
      "uniform-cone-bifurcation",
      "near-integer-crossings",
    ];
    const actualLeanStatements = Array.from(document.querySelectorAll("details.lean-statement"), (statement) => statement.dataset.statement);
    if (actualLeanStatements.length !== expectedLeanStatements.length
        || expectedLeanStatements.some((key, index) => actualLeanStatements[index] !== key)) {
      errors.push("Lean counterparts do not follow the mathematical narrative");
    }

    const expectedSectionOrder = [
      "introduction",
      "geometric-escape",
      "computer-assisted-proof",
      "experiment",
      "references",
      "acknowledgements",
    ];
    const actualSectionOrder = Array.from(document.querySelectorAll("main > section[id]"), (section) => section.id);
    if (actualSectionOrder.length !== expectedSectionOrder.length
        || expectedSectionOrder.some((id, index) => actualSectionOrder[index] !== id)) {
      errors.push("top-level sections do not follow source reading order");
    }

    if (!document.querySelector("#linear-rigidity > #borrow-flexibility")) {
      errors.push("cylinder and sphere material is not nested inside Section II");
    }
    if (document.querySelector("main > #borrow-flexibility")) {
      errors.push("borrowed-flexibility material is still a top-level section");
    }
    const expectedComputerProofOrder = [
      "computer-search",
      "computer-fixed-disc",
      "computer-compatible-inverse",
      "computer-finite-tail",
      "computer-contraction",
      "computer-reconstruction",
      "computer-berenstein",
      "computer-local-global",
    ];
    const actualComputerProofOrder = Array.from(
      document.querySelectorAll("#computer-assisted-proof > header.section-heading[id]"),
      (heading) => heading.id,
    );
    if (actualComputerProofOrder.length !== expectedComputerProofOrder.length
        || expectedComputerProofOrder.some((id, index) => actualComputerProofOrder[index] !== id)) {
      errors.push("Section IV proof stages do not follow the certified argument");
    }
    const expectedComputerFigures = [
      "computer-assisted-search",
      "computer-assisted-centre",
      "conformal-pullback",
      "compatible-inverse-modes",
      "finite-tail-certificate",
      "radii-polynomial-certificate",
      "computer-assisted-reconstruction",
      "berenstein-boundary-data",
      "berenstein-field-comparison",
      "local-global-solvability",
    ];
    const actualComputerFigures = Array.from(
      document.querySelectorAll("#computer-assisted-proof > figure[data-figure]"),
      (figure) => figure.dataset.figure,
    );
    if (actualComputerFigures.length !== expectedComputerFigures.length
        || expectedComputerFigures.some((label, index) => actualComputerFigures[index] !== label)) {
      errors.push("Section IV visual proof stages are incomplete or out of order");
    }
    const expectedProofSectionOrder = [
      // The near-integer material now sits inside 4.1, so abundance-experiment
      // comes first and carries no heading of its own. The branch curvature
      // then motivates the uniform cylinder and finite-order arguments.
      "abundance-experiment",
      "phase-story",
      "debye-experiment",
      "bifurcation-setting",
      "modes-experiment",
    ];
    const actualProofSectionOrder = Array.from(document.querySelectorAll("#experiment > section[id]:not([hidden])"), (section) => section.id);
    if (actualProofSectionOrder.length !== expectedProofSectionOrder.length
        || expectedProofSectionOrder.some((id, index) => actualProofSectionOrder[index] !== id)) {
      errors.push("bifurcation proof subsections do not follow source reading order");
    }
    const transferSection = document.querySelector("#debye-experiment");
    const finiteOrderSection = document.querySelector("#bifurcation-setting");
    const collarComparison = document.querySelector("[data-figure='collar-coordinate-comparison']");
    const uniformConeTheorem = document.querySelector("[data-label='uniform-cone-bifurcation']");
    const uniformConeLean = document.querySelector("#bifurcation-setting > .lean-statement[data-statement='uniform-cone-bifurcation']");
    if (!transferSection || !collarComparison || !uniformConeTheorem
        || !(collarComparison.compareDocumentPosition(uniformConeTheorem) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      errors.push("the large-cone comparison must precede the uniform cone theorem");
    }
    if (!uniformConeTheorem || !uniformConeLean || !finiteOrderSection
        || finiteOrderSection.lastElementChild !== uniformConeLean
        || uniformConeTheorem.parentElement !== finiteOrderSection
        || !(uniformConeTheorem.compareDocumentPosition(uniformConeLean) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      errors.push("the uniform cone theorem and its Lean counterpart must close the finite-order bifurcation subsection");
    }
    const nearIntegerTheorem = document.querySelector("[data-label='near-integer-crossings']");
    const nearIntegerLean = document.querySelector(".lean-statement[data-statement='near-integer-crossings']");
    if (!nearIntegerTheorem || !nearIntegerLean
        || nearIntegerTheorem.closest("section") !== nearIntegerLean.closest("section")
        || !(nearIntegerTheorem.compareDocumentPosition(nearIntegerLean) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      errors.push("the near-integer theorem does not precede its Lean counterpart in the same subsection");
    }

    const expectedHeadingContract = [
      ["1", "The problem", "#introduction", "section"],
      ["1.1", "Pompeiu’s problem: When does a measuring probe lose information?", "#pompeiu-problem", "subsection"],
      ["1.2", "Schiffer’s problem: Can a membrane vibrate with constant amplitude along its boundary?", "#schiffer-problem", "subsection"],
      ["1.3", "Classical facts: the rigidity direction", "#linear-rigidity", "subsection"],
      ["1.4", "Recent results: the flexibility direction", "#borrow-flexibility", "subsection"],
      ["1.5", "The new counterexamples", "#new-counterexamples", "subsection"],
      ["2", "Two routes to a counterexample", "#geometric-escape", "section"],
      ["2.1", "Fixed disk: search, encode, and certify", "#numerical-route", "proof-subsection"],
      ["2.2", "Bifurcate, bend, and close", "#cone-route", "proof-subsection"],
      ["3", "The computer-assisted proof", "#computer-assisted-proof", "section"],
      ["3.1", "A numerical centre from the relaxed problem", "#computer-search", "proof-subsection"],
      ["3.2", "The problem on one fixed disk", "#computer-fixed-disc", "proof-subsection"],
      ["3.3", "Both boundary conditions in one equation", "#computer-compatible-inverse", "proof-subsection"],
      ["3.4", "Finite coefficients and the infinite tail", "#computer-finite-tail", "proof-subsection"],
      ["3.5", "Certified fixed-point convergence", "#computer-contraction", "proof-subsection"],
      ["3.6", "From the coefficient solution to a domain", "#computer-reconstruction", "proof-subsection"],
      ["3.7", "Berenstein companion: the Dirichlet endpoint", "#computer-berenstein", "proof-subsection"],
      ["3.8", "Local boundary data versus global solvability", "#computer-local-global", "proof-subsection"],
      ["4", "The bifurcation proof", "#experiment", "section"],
      ["4.1", "The cone quotient", "#cone-remap", "proof-subsection"],
      ["4.2", "Exploring the cone bifurcation", "#phase-story", "proof-subsection"],
      ["4.3", "A motivation for uniformity: the cylinder", "#half-cylinder-strategy", "proof-subsection"],
      ["4.4", "The fixed-collar formulation", "#fixed-domain", "proof-subsection"],
      ["4.5", "The bifurcation setting: a collar problem for every real order", "#bifurcation-setting", "proof-subsection"],
      ["4.6", "Integer landing and planar lift", "#modes-experiment", "proof-subsection"],
      ["", "References", "#references", "section"],
      ["", "Acknowledgements", "#acknowledgements", "section"],
    ];
    const headingContract = Array.from(document.querySelectorAll(headingSelector), (heading) => {
      const title = headingTitleElement(heading);
      const target = headingTarget(heading);
      return [
        heading.dataset.number,
        heading.dataset.title,
        target ? `#${target.id}` : "",
        heading.dataset.toc || "",
        normalizeText(title?.textContent),
        heading.querySelectorAll(":scope > :is(h2, h3)").length,
      ];
    });
    expectedHeadingContract.forEach(([number, title, href, toc], index) => {
      const actual = headingContract[index];
      if (!actual || actual[0] !== number || actual[1] !== title || actual[2] !== href || actual[3] !== toc) {
        errors.push(`section heading ${number} does not match the shared data contract`);
      }
      if (actual && actual[1] !== actual[4]) {
        errors.push(`section heading ${number} visible title drifts from data-title`);
      }
      if (actual && actual[5] !== 1) {
        errors.push(`section heading ${number} does not expose exactly one h2/h3 title`);
      }
    });
    if (headingContract.length !== expectedHeadingContract.length) {
      errors.push("section heading registry has unexpected entries");
    }
    if (document.querySelector(".section-number, .subsection-number")) {
      errors.push("legacy hand-authored section number spans returned");
    }
    if (!window.SCHIFFER_DOCUMENT_STRUCTURE) {
      errors.push("semantic document registry was not initialized");
    }
    document.querySelectorAll("a.xref[data-ref]").forEach((reference) => {
      if (reference.dataset.referenceError || !reference.getAttribute("href") || !normalizeText(reference.textContent)) {
        errors.push(`cross-reference ${reference.dataset.ref || "without label"} did not resolve`);
      }
    });
    document.querySelectorAll("article.math-statement[data-kind]").forEach((statement, index) => {
      const numbered = ["theorem", "lemma", "proposition", "corollary", "criterion"].includes(statement.dataset.kind)
        && statement.dataset.unnumbered !== "true";
      if (numbered && !statement.dataset.label) errors.push(`numbered statement ${index + 1} has no semantic label`);
      if (numbered && !statement.dataset.number) errors.push(`numbered statement ${statement.dataset.label || index + 1} has no generated number`);
    });
    document.querySelectorAll(".tex-display[data-equation], figure[data-figure], aside[data-aside]").forEach((object, index) => {
      if (!object.closest("[hidden], [aria-hidden='true']") && !object.dataset.number) {
        errors.push(`referable document object ${index + 1} has no generated number`);
      }
    });
    document.querySelectorAll("body.tufte-site main figure:has(> figcaption)").forEach((figure, index) => {
      if (!figure.closest("[hidden], [aria-hidden='true']")
          && !figure.dataset.figure
          && figure.dataset.figureUnnumbered !== "true") {
        errors.push(`captioned figure ${index + 1} has no stable semantic label`);
      }
    });
    document.querySelectorAll(".section-heading").forEach((heading) => {
      if (heading.querySelector(".eyebrow")) errors.push("section heading contains a redundant eyebrow");
      if (heading.querySelector(":scope > :not(h2):not(h3):not(a.object-permalink)")) {
        errors.push("section heading contains decoration in addition to its title");
      }
      heading.querySelectorAll(":scope > :is(span, small, p)").forEach((label) => {
        if (/^(?:[IVX]+|\d+(?:\.\d+)*)\s*[·.)-]/i.test(normalizeText(label.textContent))) {
          errors.push("section heading contains hand-authored numbering text");
        }
      });
      const title = headingTitleElement(heading);
      if (title && !heading.hasAttribute("data-unnumbered")) {
        const expected = title.matches("h2") ? typeSection : typeSubsection;
        const numberSize = parseFloat(getComputedStyle(heading, "::before").fontSize);
        const titleSize = parseFloat(getComputedStyle(title).fontSize);
        if (Math.abs(numberSize - expected) > .2 || Math.abs(numberSize - titleSize) > .2) {
          errors.push(`section number for “${normalizeText(title.textContent)}” does not share its title scale`);
        }
      }
    });
    const expectedNavigationContents = expectedHeadingContract
      .filter(([, , , toc]) => toc)
      .map(([number, title, href, toc]) => [number, title, href, toc]);
    const actualNavigationContents = Array.from(document.querySelectorAll(".section-banner [data-heading-link]"), (link) => [
      normalizeText(link.querySelector("b")?.textContent),
      normalizeText(link.querySelector("span")?.textContent),
      link.getAttribute("href"),
      link.dataset.tocLevel,
    ]);
    if (expectedNavigationContents.some(([number, title, href, level], index) => {
      const actual = actualNavigationContents[index];
      return !actual || actual[0] !== number || actual[1] !== title || actual[2] !== href || actual[3] !== level;
    }) || actualNavigationContents.length !== expectedNavigationContents.length) {
      errors.push("section banner does not match the shared heading contract");
    }
    const navigationNumberColors = new Set(Array.from(document.querySelectorAll(".section-banner [data-heading-link] b"), (number) => (
      getComputedStyle(number).color
    )));
    if (navigationNumberColors.size > 1) errors.push("section-banner numbers do not share one colour role");
    checkType(".section-banner [data-heading-link] b", typeLabel, "section-banner number");

    const expectedPrimaryNavigation = expectedNavigationContents
      .filter(([, , , level]) => level === "section")
      .map(([, title, href]) => [title, href]);
    const actualPrimaryNavigation = Array.from(document.querySelectorAll(".section-banner-list > .section-banner-item"), (item) => [
      normalizeText(item.querySelector(":scope > details > summary > span, :scope > a > span")?.textContent),
      item.dataset.sectionTarget,
    ]);
    if (expectedPrimaryNavigation.some(([title, href], index) => {
      const actual = actualPrimaryNavigation[index];
      return !actual || actual[0] !== title || actual[1] !== href;
    }) || actualPrimaryNavigation.length !== expectedPrimaryNavigation.length) {
      errors.push("section-banner primary groups do not match the document sections");
    }
    if (document.querySelectorAll("nav[data-toc-nav]").length !== 1) {
      errors.push("the document must expose exactly one generated section navigation landmark");
    }
    const navigationHrefs = actualNavigationContents.map(([, , href]) => href);
    if (new Set(navigationHrefs).size !== navigationHrefs.length
        || navigationHrefs.some((href) => !href || !document.querySelector(href))) {
      errors.push("section-banner links do not resolve to unique document targets");
    }

    document.querySelectorAll("details.optional-digression").forEach((details, index) => {
      const summary = details.querySelector(":scope > summary");
      const span = summary?.querySelector(":scope > span");
      const label = span?.querySelector(":scope > small");
      if (!summary || !span || label?.textContent.trim() !== "Optional digression") {
        errors.push(`optional digression ${index + 1} does not use the shared summary grammar`);
      }
    });
    const optionalTitles = Array.from(document.querySelectorAll("details.optional-digression > summary > span"), (span) => {
      const label = span.querySelector(":scope > small");
      return Array.from(span.childNodes)
        .filter((node) => node !== label)
        .map((node) => node.textContent)
        .join("")
        .trim();
    });
    [
      "The Schiffer–Pompeiu equivalence",
      "Berenstein conjecture: What if we switch the Neumann and Dirichlet conditions?",
    ].forEach((title) => {
      if (!optionalTitles.includes(title)) errors.push(`missing optional digression: ${title}`);
    });

    const transferTheorem = document.querySelector("#bifurcation-setting > #uniformConeBifurcation.math-statement");
    const transferDetails = document.querySelector("#debye-experiment > details.transfer-proof-details");
    const transferAside = transferDetails?.querySelector(".side-applet[data-figure='fixed-collar-profiles']");
    const transferVisual = transferAside?.querySelector(":scope > section.stacked-plot");
    const transferControls = transferAside?.querySelector(":scope > aside");
    const transferComparison = document.querySelector("#debye-experiment > [data-figure='collar-coordinate-comparison']");
    const informalDebye = document.querySelector("#debye-experiment > .informal-debye-theorem[data-unnumbered='true']");
    const transferSketch = document.querySelector("#debye-experiment .debye-lead > .cone-cylinder-sketch");
    if (!transferTheorem || transferTheorem.classList.length !== 1) {
      errors.push("the uniform cone theorem is not a direct canonical math statement");
    }
    if (!transferAside || !transferVisual || !transferControls
        || !(transferVisual.compareDocumentPosition(transferControls) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      errors.push("Subsection 4.4 does not keep the fixed-collar plot inside its technical disclosure");
    }
    if (!transferSketch || !transferComparison || !informalDebye || !transferDetails || !transferTheorem
        || !(transferComparison.compareDocumentPosition(informalDebye) & Node.DOCUMENT_POSITION_FOLLOWING)
        || !(informalDebye.compareDocumentPosition(transferDetails) & Node.DOCUMENT_POSITION_FOLLOWING)
        || !(transferDetails.compareDocumentPosition(transferTheorem) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      errors.push("Subsection 4.4 does not follow observation → applet → informal theorem → details → uniform theorem");
    }
    if (document.querySelector("#debye-experiment > details.collar-coordinate-details")) {
      errors.push("Subsection 4.4 has split its mode normalization into an unexplained second disclosure");
    }
    if (!/angular quotient.+normalization.+oscillatory.+evanescent.+uniform error bounds/i.test(
      document.querySelector("#debye-experiment .transfer-conclusion")?.textContent || ""
    )) {
      errors.push("Subsection 4.4 does not tell the reader what its technical disclosure contains");
    }
    const halfCylinderIntro = document.querySelector("#experiment .half-cylinder-introduction");
    const halfCylinderApplet = halfCylinderIntro?.querySelector(":scope > .side-applet");
    const halfCylinderVisual = halfCylinderApplet?.querySelector(":scope > section");
    const halfCylinderControls = halfCylinderApplet?.querySelector(":scope > aside");
    if (!halfCylinderApplet || !halfCylinderVisual || !halfCylinderControls
        || !(halfCylinderVisual.compareDocumentPosition(halfCylinderControls) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      errors.push("Subsection 5.3 does not use the visual-then-controls margin applet grammar");
    }
    const halfCylinderSequence = [
      document.querySelector("#experiment .cylinder-theorem"),
      document.querySelector("#experiment [aria-labelledby='cylinderCoincidenceTitle']"),
      document.querySelector("#experiment .cylinder-formal-lead"),
      document.querySelector("#experiment [aria-labelledby='cylinderExpansionTitle']"),
      document.querySelector("#experiment .cylinder-jet-proof"),
      document.querySelector("#experiment .cylinder-uniform-lead"),
      document.querySelector("#experiment .cylinder-uniform-proof"),
    ];
    if (halfCylinderSequence.some((node) => !node) || halfCylinderSequence.some((node, index) => {
      if (!index) return false;
      return !(halfCylinderSequence[index - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
    })) {
      errors.push("the cylinder subsection does not follow its theorem, expansion, and uniformity order");
    }

    document.querySelectorAll(marginSelector).forEach((aside, index) => {
      const style = getComputedStyle(aside);
      const toggle = aside.previousElementSibling;
      const label = toggle?.previousElementSibling;
      if (!(toggle instanceof HTMLInputElement) || !toggle.classList.contains("margin-toggle")) {
        errors.push(`margin aside ${index + 1} has no adjacent margin toggle`);
      }
      if (!(label instanceof HTMLLabelElement) || label.htmlFor !== toggle?.id) {
        errors.push(`margin aside ${index + 1} has no matching toggle label`);
      }
      if (narrow) {
        if (style.display === "none") {
          errors.push(`margin aside ${index + 1} disappears instead of joining the mobile reading flow`);
        }
        return;
      }

      const box = aside.getBoundingClientRect();
      const host = aside.parentElement.getBoundingClientRect();
      if (style.display === "none") errors.push(`margin aside ${index + 1} is hidden on desktop`);
      if (box.left < host.right + 4) {
        errors.push(`margin aside ${index + 1} enters the reading measure by ${rounded(host.right - box.left)}px`);
      }
      if (box.right > page.right + 1) {
        errors.push(`margin aside ${index + 1} leaves the page by ${rounded(box.right - page.right)}px`);
      }
    });

    const sideWidth = canonicalSideWidth();
    const numberedFigures = Array.from(document.querySelectorAll("body.tufte-site main figure[data-number]"));
    numberedFigures.forEach((figureElement, index) => {
      const expected = String(index + 1);
      if (figureElement.dataset.number !== expected) {
        errors.push(`figure sequence jumps at ${figureElement.dataset.figure || index + 1}: expected ${expected}, found ${figureElement.dataset.number || "none"}`);
      }
    });
    document.querySelectorAll("body.tufte-site main :is(.marginnote.side-figure, .margin-figure-row > .side-figure)").forEach((figureElement, index) => {
      if (figureElement.tagName !== "FIGURE" || !figureElement.dataset.figure) {
        errors.push(`visual aside ${index + 1} is not registered in the figure sequence`);
      }
      if (!figureElement.querySelector(":scope > figcaption")) {
        errors.push(`visual aside ${index + 1} has no direct figure caption`);
      }
    });
    document.querySelectorAll("body.tufte-site main .side-figure").forEach((figureElement, index) => {
      if (!visible(figureElement)) return;
      const style = getComputedStyle(figureElement);
      if ([style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
        .some((value) => parseFloat(value) > 0)) {
        errors.push(`side figure ${index + 1} regained card rules`);
      }
      const box = figureElement.getBoundingClientRect();
      if (narrow) {
        const expectedWidth = sectionMeasure(figureElement, Number.isFinite(mobileNote) ? mobileNote : .95);
        if (Math.abs(box.width - expectedWidth) > 2) {
          errors.push(`side figure ${index + 1} is outside the mobile aside measure`);
        }
        return;
      }
      if (sideWidth && Math.abs(box.width - sideWidth) > 2) {
        errors.push(`side figure ${index + 1} is ${rounded(box.width)}px wide, not the canonical ${rounded(sideWidth)}px`);
      }
      if (figureElement.matches(".measurement-figure > .side-figure, .margin-figure-row > .side-figure")) {
        const sectionBox = figureElement.closest("main > section")?.getBoundingClientRect();
        if (!sectionBox) return;
        const marginStart = sectionBox.left + sectionBox.width * (reading + gutter);
        if (box.left < marginStart - 2) errors.push(`side figure ${index + 1} intrudes before the margin column`);
        if (box.right > sectionBox.right + 1) errors.push(`side figure ${index + 1} leaves the page frame`);
      }
    });

    document.querySelectorAll(disclosureSelector).forEach((details, index) => {
      const summary = details.querySelector(":scope > summary");
      if (!summary) {
        errors.push(`reading disclosure ${index + 1} has no direct summary`);
        return;
      }
      const detailsBox = details.getBoundingClientRect();
      const summaryBox = summary.getBoundingClientRect();
      const detailsStyle = getComputedStyle(details);
      const summaryStyle = getComputedStyle(summary);
      const formalStatement = details.classList.contains("lean-statement");
      const expectedWidth = detailsBox.width * (formalStatement || narrow ? 1 : readingInFigure);
      if (Math.abs(summaryBox.width - expectedWidth) > 2) {
        errors.push(`reading disclosure ${index + 1} rule is not on the reading measure`);
      }
      if (Math.abs(summaryBox.left - detailsBox.left) > 1) {
        errors.push(`reading disclosure ${index + 1} is not aligned with the reading measure`);
      }
      if (formalStatement) {
        if (![detailsStyle.borderTopWidth, detailsStyle.borderRightWidth, detailsStyle.borderBottomWidth, detailsStyle.borderLeftWidth]
          .every((value) => parseFloat(value) > 0)) {
          errors.push(`Lean statement ${index + 1} is missing its disclosure frame`);
        }
        if (!details.querySelector(":scope > .lean-statement-body > pre > code")) {
          errors.push(`Lean statement ${index + 1} has no direct code body`);
        }
        if (details.open) {
          const pre = details.querySelector(":scope > .lean-statement-body > pre");
          const code = pre?.querySelector(":scope > code.language-lean");
          if (pre && code) {
            const preBox = pre.getBoundingClientRect();
            const codeBox = code.getBoundingClientRect();
            if (Math.abs(codeBox.left - preBox.left) > 1 || codeBox.width < preBox.width - 1) {
              errors.push(`Lean statement ${index + 1} code viewport collapsed inside its disclosure`);
            }
            if (code.textContent.includes("abbrev")
                && code.querySelectorAll("span").length
                && !Array.from(code.querySelectorAll(".hljs-keyword"), (token) => token.textContent).includes("abbrev")) {
              errors.push(`Lean statement ${index + 1} does not highlight Lean 4 abbrev declarations`);
            }
          }
        }
      } else {
        if (parseFloat(detailsStyle.borderTopWidth) || parseFloat(detailsStyle.borderBottomWidth)) {
          errors.push(`reading disclosure ${index + 1} leaks a border across its full parent`);
        }
        if (!parseFloat(summaryStyle.borderTopWidth) || !parseFloat(summaryStyle.borderBottomWidth)) {
          errors.push(`reading disclosure ${index + 1} is missing its summary rules`);
        }
      }
      const body = details.classList.contains("proof-details")
        ? Array.from(details.children).find((child) => child !== summary)
        : null;
      if (body && visible(body)) {
        const bodyBox = body.getBoundingClientRect();
        const expectedBodyWidth = detailsBox.width * (narrow ? 1 : readingInFigure);
        if (Math.abs(bodyBox.left - detailsBox.left) > 1 || Math.abs(bodyBox.width - expectedBodyWidth) > 2) {
          errors.push(`reading disclosure ${index + 1} proof body is outside the reading measure`);
        }
      }
    });

    document.querySelectorAll("body.tufte-site main .math-statement").forEach((statement, index) => {
      if (!statement.matches("article")) errors.push(`math statement ${index + 1} is not an article`);
      if (!statement.querySelector(":scope > .math-statement-header")) errors.push(`math statement ${index + 1} has no direct header`);
      if (!statement.querySelector(":scope > .math-statement-body")) errors.push(`math statement ${index + 1} has no direct body`);
      const box = statement.getBoundingClientRect();
      const expectedWidth = sectionMeasure(statement, narrow ? 1 : reading);
      if (Math.abs(box.width - expectedWidth) > 2) errors.push(`math statement ${index + 1} is outside its semantic measure`);
    });

    document.querySelectorAll("body.tufte-site main .formal-statement-pair").forEach((pair, index) => {
      const statement = pair.querySelector(":scope > .math-statement");
      const lean = pair.querySelector(":scope > .lean-statement");
      if (!statement || !lean) {
        errors.push(`formal statement pair ${index + 1} lacks prose or Lean`);
        return;
      }
      const pairBox = pair.getBoundingClientRect();
      const expectedWidth = sectionMeasure(pair, narrow ? 1 : reading);
      if (Math.abs(pairBox.width - expectedWidth) > 2) {
        errors.push(`formal statement pair ${index + 1} is outside the reading measure`);
      }
      [statement, lean].forEach((child) => {
        const childBox = child.getBoundingClientRect();
        if (Math.abs(childBox.left - pairBox.left) > 1 || Math.abs(childBox.width - pairBox.width) > 2) {
          errors.push(`formal statement pair ${index + 1} has mismatched counterparts`);
        }
      });
    });

    document.querySelectorAll("body.tufte-site main .paper-copy").forEach((copy, index) => {
      if (!visible(copy)) return;
      const box = copy.getBoundingClientRect();
      const expectedWidth = sectionMeasure(copy, narrow ? 1 : reading);
      if (Math.abs(box.width - expectedWidth) > 2) errors.push(`paper copy ${index + 1} is outside the reading measure`);
      if (copy.classList.contains("figure-band") || copy.classList.contains("small-multiples")) {
        errors.push(`paper copy ${index + 1} also claims a wide-measure role`);
      }
    });

    document.querySelectorAll("body.tufte-site main .small-multiples").forEach((multiple, index) => {
      if (!multiple.getClientRects().length) return;
      const box = multiple.getBoundingClientRect();
      const expectedWidth = sectionMeasure(multiple, narrow ? 1 : figure);
      if (Math.abs(box.width - expectedWidth) > 2) errors.push(`small multiple ${index + 1} is outside the figure measure`);
      if (multiple.classList.contains("figure-band")) errors.push(`small multiple ${index + 1} also claims the figure role`);
    });

    document.querySelectorAll("body.tufte-site main .reading-figure").forEach((visual, index) => {
      if (!visible(visual)) return;
      const box = visual.getBoundingClientRect();
      const expectedWidth = sectionMeasure(visual, narrow ? 1 : reading);
      if (Math.abs(box.width - expectedWidth) > 2) errors.push(`reading figure ${index + 1} is outside the reading measure`);
      if (!visual.querySelector("canvas, svg, img, picture, video")) errors.push(`reading figure ${index + 1} contains no visual`);
    });

    document.querySelectorAll("body.tufte-site main :is(.figure-band, .small-multiples, .interactive-plate, .reading-figure)").forEach((element, index) => {
      if (!element.getClientRects().length) return;
      const style = getComputedStyle(element);
      if ([style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
        .some((value) => parseFloat(value) > 0)) {
        errors.push(`visual role ${index + 1} regained an outer card border`);
      }
    });

    document.querySelectorAll("body.tufte-site main .passive-script-targets").forEach((target, index) => {
      if (visible(target)) errors.push(`passive script target ${index + 1} is visible`);
      if (!target.hidden && getComputedStyle(target).display !== "none") {
        errors.push(`passive script target ${index + 1} occupies layout space`);
      }
    });
    document.querySelectorAll("body.tufte-site main :is(.live-dot, .abundance-toolbar, .abundance-readout, .phase-family-toolbar, .cone-data-badge, .three-help, .solver-badge)").forEach((element) => {
      if (visible(element)) errors.push(`passive figure chrome is visible: ${element.className || element.id}`);
    });
    [
      "domainState",
      "debyePlotState",
      "phaseStoryState",
      "abundancePlotState",
      "abundanceCountValue",
      "abundanceBestValue",
      "coneDomainState",
      "modesPlotState",
    ].forEach((id) => {
      const target = document.getElementById(id);
      if (visible(target)) errors.push(`passive applet readout #${id} is visible`);
    });
    [
      "modesGlobalFormula",
      "modesPatchFormula",
      "modesRadialFormula",
      "debyeRateFormula1",
      "debyeRateFormula2",
      "debyeRateFormula3",
      "debyeErrorFormula1",
      "debyeErrorFormula2",
      "debyeErrorFormula3",
    ].forEach((id) => {
      const label = document.getElementById(id);
      if (visible(label)) errors.push(`passive canvas annotation #${id} is visible`);
    });
    [
      { selector: ".abundance-plot-panel", patterns: [/crossings visible/i, /smallest sample/i, /hover a point/i, /within 0\.01 of an integer/i, /573 crossings/i, /9\.73\s*[×x]/i] },
      { selector: ".phase-family", patterns: [/thirteen orange points/i, /real crossing order versus branch parameter/i, /spectral ratio/i, /unit-amplitude quadratic drop/i] },
      { selector: ".interactive-plate", patterns: [/interior PDE residual/i, /dirichlet normalized/i, /neumann normalized/i, /solving boundary/i, /\d+\s*fit angles/i, /\d+-point validation/i] },
    ].forEach(({ selector, patterns }) => {
      document.querySelectorAll(`body.tufte-site main ${selector}`).forEach((root) => {
        const text = directVisibleText(root);
        patterns.forEach((pattern) => {
          if (pattern.test(text)) errors.push(`passive applet text remains visible in ${selector}: ${pattern}`);
        });
      });
    });

    document.querySelectorAll("body.tufte-site main .data-table").forEach((table, index) => {
      if (!table.querySelector("table")) errors.push(`data table ${index + 1} has no table element`);
      const box = table.getBoundingClientRect();
      const expectedWidth = sectionMeasure(table, narrow ? 1 : reading);
      if (Math.abs(box.width - expectedWidth) > 2) errors.push(`data table ${index + 1} is outside the reading measure`);
    });

    const proofAtlas = document.querySelector("body.tufte-site main .proof-atlas");
    if (visible(proofAtlas)) {
      const box = proofAtlas.getBoundingClientRect();
      const sectionBox = proofAtlas.closest("main > section")?.getBoundingClientRect();
      const expectedWidth = sectionMeasure(proofAtlas, narrow ? 1 : reading);
      if (Math.abs(box.width - expectedWidth) > 2) {
        errors.push("proof atlas is outside the reading measure");
      }
      if (sectionBox && Math.abs(box.left - sectionBox.left) > 1) {
        errors.push("proof atlas is not aligned with the reading measure");
      }
    }

    document.querySelectorAll("body.tufte-site main .figure-band").forEach((band, index) => {
      if (!band.getClientRects().length) return;
      const box = band.getBoundingClientRect();
      const parentBox = band.parentElement.getBoundingClientRect();
      const expectedWidth = parentBox.width * (narrow ? 1 : figure);
      if (Math.abs(box.width - expectedWidth) > 2) errors.push(`figure band ${index + 1} is outside the figure measure`);
      if (Math.abs(box.left - parentBox.left) > 1) errors.push(`figure band ${index + 1} is not aligned with the page grammar`);
      if (!band.querySelector("canvas, svg, img, picture, video")) errors.push(`figure band ${index + 1} contains no visual`);
    });

    document.querySelectorAll("body.tufte-site main .margin-figure-sequence").forEach((sequence, index) => {
      if (!sequence.getClientRects().length) return;
      const box = sequence.getBoundingClientRect();
      const expectedWidth = sectionMeasure(sequence, narrow ? 1 : figure);
      if (Math.abs(box.width - expectedWidth) > 2) {
        errors.push(`margin-figure sequence ${index + 1} is outside the figure measure`);
      }
      sequence.querySelectorAll(":scope > .margin-figure-row").forEach((row, rowIndex) => {
        const visual = row.querySelector(":scope > .margin-figure");
        const prose = row.querySelector(":scope > :is(span, h3, p)");
        if (!visual || !prose) {
          errors.push(`margin-figure row ${index + 1}.${rowIndex + 1} lacks direct prose or a direct margin figure`);
          return;
        }
        const rowStyle = getComputedStyle(row);
        const visualStyle = getComputedStyle(visual);
        if ([rowStyle.borderTopWidth, rowStyle.borderRightWidth, rowStyle.borderBottomWidth, rowStyle.borderLeftWidth,
          visualStyle.borderTopWidth, visualStyle.borderRightWidth, visualStyle.borderBottomWidth, visualStyle.borderLeftWidth]
          .some((value) => parseFloat(value) > 0)) {
          errors.push(`margin-figure row ${index + 1}.${rowIndex + 1} has card rules`);
        }
        if (!narrow) {
          const visualBox = visual.getBoundingClientRect();
          const proseBox = prose.getBoundingClientRect();
          if (visualBox.left < proseBox.right + 4) {
            errors.push(`margin figure ${index + 1}.${rowIndex + 1} enters the reading measure`);
          }
          if (Math.abs(visualBox.top - proseBox.top) > 1) {
            errors.push(`margin figure ${index + 1}.${rowIndex + 1} is not top-aligned with its prose`);
          }
        }
      });
    });

    const comparisonCells = Array.from(document.querySelectorAll("body.tufte-site main .intro-shapes .intro-shape-media"));
    if (comparisonCells.length !== 4) {
      errors.push(`comparison gallery has ${comparisonCells.length} cells instead of 4`);
    } else {
      const reference = comparisonCells[0].getBoundingClientRect();
      comparisonCells.forEach((cell, index) => {
        const box = cell.getBoundingClientRect();
        if (Math.abs(box.width - box.height) > 1) errors.push(`comparison cell ${index + 1} is not square`);
        if (Math.abs(box.width - reference.width) > 1 || Math.abs(box.height - reference.height) > 1) {
          errors.push(`comparison cell ${index + 1} does not share the gallery shape`);
        }
        const image = cell.querySelector(":scope > img");
        const imageBox = image?.getBoundingClientRect();
        const declaredWidth = Number(image?.getAttribute("width"));
        const declaredHeight = Number(image?.getAttribute("height"));
        if (!image || !declaredWidth || declaredWidth !== declaredHeight || !/comparison-[^/]+\.webp$/.test(image.getAttribute("src") || "")) {
          errors.push(`comparison cell ${index + 1} does not use a normalized square crop`);
        } else if (Math.abs(imageBox.width - box.width) > 1 || Math.abs(imageBox.height - box.height) > 1) {
          errors.push(`comparison crop ${index + 1} does not fill its shared frame`);
        }
      });
      const galleryStyle = getComputedStyle(comparisonCells[0].closest(".intro-shapes"));
      if ([galleryStyle.borderTopWidth, galleryStyle.borderRightWidth, galleryStyle.borderBottomWidth, galleryStyle.borderLeftWidth]
        .some((value) => parseFloat(value) > 0)) {
        errors.push("comparison gallery has plate rules");
      }
      if (!narrow) {
        const gallery = comparisonCells[0].closest(".intro-shapes");
        const galleryBox = gallery.getBoundingClientRect();
        const copy = document.querySelector(".construction-flow");
        const copyBox = copy?.getBoundingClientRect();
        const sectionBox = gallery.closest("main > section").getBoundingClientRect();
        const expectedGalleryWidth = sideWidth || sectionBox.width * reading * .5;
        const expectedCopyWidth = sectionBox.width * reading;
        const expectedGap = sectionBox.width * gutter;
        if (copyBox && Math.abs(copyBox.width - expectedCopyWidth) > 2) {
          errors.push("construction prose no longer keeps the reading measure");
        }
        if (Math.abs(galleryBox.width - expectedGalleryWidth) > 2) {
          errors.push("comparison gallery does not use the canonical aside measure");
        }
        if (copyBox && galleryBox.left < copyBox.right + expectedGap - 2) {
          errors.push("comparison gallery intrudes into the construction prose measure");
        }
        if (galleryBox.right > sectionBox.right + 1) {
          errors.push("comparison gallery leaves the canonical page measure");
        }
      }
    }

    document.querySelectorAll("body.tufte-site main .tex-display").forEach((display, index) => {
      if (!display.getClientRects().length) return;
      if (display.clientWidth <= 1) return;
      if (display.scrollWidth > display.clientWidth + 1) {
        errors.push(`display equation ${index + 1} overflows its semantic measure by ${rounded(display.scrollWidth - display.clientWidth)}px`);
      }
    });

    document.querySelectorAll(".katex-error").forEach((formula, index) => {
      errors.push(`KaTeX formula ${index + 1} did not parse: ${normalizeText(formula.textContent)}`);
    });
    document.querySelectorAll(".katex").forEach((formula, index) => {
      if (!getComputedStyle(formula).fontFamily.includes("KaTeX")) {
        errors.push(`KaTeX formula ${index + 1} lost its mathematical font`);
      }
    });
    const rawMathWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, pre, code, .katex")) return NodeFilter.FILTER_REJECT;
        return /\\\(|\\\)|\\\[|\\\]/.test(node.textContent || "")
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const rawMathFragments = [];
    while (rawMathWalker.nextNode()) rawMathFragments.push(normalizeText(rawMathWalker.currentNode.textContent));
    rawMathFragments.forEach((fragment, index) => {
      errors.push(`inline math fragment ${index + 1} was not typeset: ${fragment.slice(0, 90)}`);
    });

    document.querySelectorAll(`body.tufte-site main :is(${roleSelector})`).forEach((element, index) => {
      const roles = ["paper-copy", "math-statement", "lean-statement", "small-multiples", "figure-band", "reading-figure", "margin-figure-sequence", "data-table"]
        .filter((role) => element.classList.contains(role));
      if (roles.length > 1) errors.push(`editorial role ${index + 1} is ambiguous: ${roles.join(" + ")}`);
    });

    checkType("body.tufte-site main .paper-copy:not(.phase-story-lead):not(.debye-lead):not(.abundance-lead) p:not(.eyebrow)", typeProof, "proof paragraph");
    checkType("body.tufte-site main .math-statement:not(.math-statement-problem):not(.math-statement-conjecture) .math-statement-body p", typeProof, "statement paragraph");
    checkType("body.tufte-site main :is(figcaption, .formula-note, .phase-family-note, .collar-field-caption)", typeCaption, "caption");
    checkType("body.tufte-site main :is(.control-heading, .control-label, .play-button, .axis-footer)", typeLabel, "apparatus label");
    checkType("body.tufte-site main :is(.small-multiples article > span, .cylinder-proof-grid article > span)", typeLabel, "editorial label");
    checkType("body.tufte-site main :is(.solver-readout, .modes-status, .phase-story-readout, .collar-field-readout, .debye-status, .abundance-readout) > div > span", typeLabel, "readout label");
    checkType("body.tufte-site main :is(.solver-readout, .modes-status, .phase-story-readout, .collar-field-readout, .debye-status, .abundance-readout) strong, body.tufte-site main .measurement-value-line strong", typeControlValue, "readout value");
    checkType("body.tufte-site main .lean-statement > summary small", typeLabel, "Lean disclosure label");
    checkType("body.tufte-site main .lean-statement :is(summary code, pre code)", typeCode, "Lean source");

    /* Font size alone cannot detect a component reintroducing a local family,
       colour, weight, or italic treatment. These are the canonical editorial
       roles; animation-internal labels are deliberately audited separately. */
    checkTypography(
      "body.tufte-site main :is(figure > figcaption, table > caption)",
      {
        family: serifFamily,
        size: typeCaption,
        weight: regularWeight,
        style: "normal",
        color: mutedColor,
        lineHeight: typeCaption * leadingCaption,
      },
      "caption",
    );
    checkTypography(
      "body.tufte-site main figure > figcaption > :is(.figure-caption-summary, .figure-caption-note, p:not(.eyebrow))",
      {
        family: serifFamily,
        size: typeCaption,
        weight: regularWeight,
        style: "normal",
        color: mutedColor,
        lineHeight: typeCaption * leadingCaption,
      },
      "caption content",
    );
    checkTypography(
      "body.tufte-site main .section-heading > h2",
      { family: serifFamily, size: typeSection, weight: regularWeight, style: "italic", color: inkColor },
      "section title",
    );
    checkTypography(
      "body.tufte-site main .section-heading > h3",
      { family: serifFamily, size: typeSubsection, weight: regularWeight, style: "italic", color: inkColor },
      "subsection title",
    );
    checkTypography(
      "body.tufte-site main .paper-copy p:not(.eyebrow)",
      { family: serifFamily, weight: regularWeight, style: "normal" },
      "proof prose",
    );
    checkTypography(
      "body.tufte-site main .math-statement:not(.math-statement-problem):not(.math-statement-question):not(.math-statement-conjecture) .math-statement-body p",
      { family: serifFamily, weight: regularWeight, style: "normal" },
      "statement prose",
    );
    checkTypography(
      "body.tufte-site main :is(pre, code, kbd, samp)",
      { family: monoFamily, weight: regularWeight, style: "normal" },
      "source code",
    );
    checkTypography(
      "body.tufte-site main :is(.route-comparison-controls button, .proof-atlas-filters button, .certificate-explorer button, .certificate-explorer select, .certificate-explorer-actions a, .certificate-provenance-index > summary)",
      { family: monoFamily, weight: regularWeight, style: "normal" },
      "document control",
    );

    const forbiddenControlChrome = ":is(.variation-equation, .variation-equation-label, .variation-legend, .geometry-stage-note, .solver-readout, .crossing-card, .parameter-pair, .fixed-zoom-pair, .problem-map, .phase-law, .phase-agreement, .collar-field-readout, .collar-field-locator, .debye-status, .phase-story-readout, .modes-status)";
    document.querySelectorAll("body.tufte-site main .paper-demo-controls:not(.geometry-controls)").forEach((controls, index) => {
      if (!visible(controls)) return;
      const controlStyle = getComputedStyle(controls);
      if ([controlStyle.borderTopWidth, controlStyle.borderRightWidth, controlStyle.borderBottomWidth, controlStyle.borderLeftWidth]
        .some((value) => parseFloat(value) > 0)) {
        errors.push(`paper control rail ${index + 1} has card rules`);
      }
      const visibleForbidden = Array.from(controls.querySelectorAll(forbiddenControlChrome)).filter(visible);
      if (visibleForbidden.length) {
        errors.push(`paper control rail ${index + 1} exposes dashboard chrome: ${visibleForbidden[0].className}`);
      }
      const visibleHeadings = Array.from(controls.querySelectorAll(":scope .control-heading > span")).filter(visible);
      if (visibleHeadings.length) errors.push(`paper control rail ${index + 1} has a redundant panel heading`);
      const visibleParagraphs = Array.from(controls.querySelectorAll(":scope p:not([hidden])")).filter(visible);
      if (visibleParagraphs.length) errors.push(`paper control rail ${index + 1} keeps explanatory prose in the rail`);
      const directActions = Array.from(controls.querySelectorAll(":scope button:not([hidden])")).filter((button) => {
        if (!visible(button)) return false;
        return !button.closest(".geometry-stages")
          && !button.closest(".view-switch")
          && !button.closest(".cone-view-switch");
      });
      if (directActions.length > 1) errors.push(`paper control rail ${index + 1} has ${directActions.length} visible actions`);
      const manipulators = Array.from(controls.querySelectorAll("input, select, button:not([hidden]), summary")).filter(visible);
      if (!manipulators.length) errors.push(`paper control rail ${index + 1} has no visible manipulator`);
    });

    document.querySelectorAll(".interactive-plate").forEach((plate, index) => {
      if (getComputedStyle(plate).display === "none" || !plate.getClientRects().length) return;
      if (plate.localName !== "figure") {
        errors.push(`interactive plate ${index + 1} is not a semantic figure`);
      }
      const controls = plate.querySelector(":scope > aside");
      const visual = plate.querySelector(":scope > section");
      const caption = plate.querySelector(":scope > figcaption");
      if (!controls || !visual) {
        errors.push(`interactive plate ${index + 1} is missing a direct control or visual child`);
        return;
      }
      if (!caption) errors.push(`interactive plate ${index + 1} has no direct caption`);
      const plateStyle = getComputedStyle(plate);
      if ([plateStyle.borderTopWidth, plateStyle.borderRightWidth, plateStyle.borderBottomWidth, plateStyle.borderLeftWidth]
        .some((value) => parseFloat(value) > 0)) {
        errors.push(`interactive plate ${index + 1} has an outer card border`);
      }
      const controlBox = controls.getBoundingClientRect();
      const visualBox = visual.getBoundingClientRect();
      const plateBox = plate.getBoundingClientRect();
      [controls, visual].forEach((child, childIndex) => {
        if (child === controls && plate.classList.contains("annotated-plate")) return;
        const childStyle = getComputedStyle(child);
        if ([childStyle.borderTopWidth, childStyle.borderRightWidth, childStyle.borderBottomWidth, childStyle.borderLeftWidth]
          .some((value) => parseFloat(value) > 0)) {
          errors.push(`interactive plate ${index + 1} ${childIndex ? "visual" : "controls"} regained card rules`);
        }
      });
      if (narrow) {
        if (controlBox.top < visualBox.bottom - 1) errors.push(`interactive plate ${index + 1} controls are not below its visual`);
        if (Math.abs(visualBox.width - plateBox.width) > 2) {
          errors.push(`interactive plate ${index + 1} visual does not fill the narrow measure`);
        }
        if (Math.abs(controlBox.width - plateBox.width) > 2) {
          errors.push(`interactive plate ${index + 1} controls do not fill the narrow measure`);
        }
      } else {
      if (plate.classList.contains("annotated-plate")) {
          if (Math.abs(visualBox.width - plateBox.width) > 2) {
            errors.push(`annotated plate ${index + 1} visual does not fill its measure`);
          }
          if (controlBox.left < plateBox.left || controlBox.right > plateBox.right
              || controlBox.top < visualBox.top || controlBox.bottom > visualBox.bottom) {
            errors.push(`annotated plate ${index + 1} apparatus is not contained by its visual`);
          }
          if (controlBox.width > plateBox.width * .34) {
            errors.push(`annotated plate ${index + 1} apparatus is too wide`);
          }
          if (plate.classList.contains("geometry-laboratory")
              && Math.abs((controlBox.top + controlBox.height / 2) - (visualBox.top + visualBox.height / 2)) > 2) {
            errors.push("geometry stage key is not vertically centred on its visual");
          }
        } else {
          if (controlBox.left < visualBox.right - 1) errors.push(`interactive plate ${index + 1} controls are not to the right of its visual`);
          if (Math.abs(controlBox.top - visualBox.top) > 1) errors.push(`interactive plate ${index + 1} control and visual tops do not align`);
          const expectedVisualWidth = plateBox.width * reading;
          const expectedControlWidth = plateBox.width * aside;
          const expectedGap = plateBox.width * gutter;
          if (Math.abs(visualBox.width - expectedVisualWidth) > 2) {
            errors.push(`interactive plate ${index + 1} visual is not on the reading measure`);
          }
          if (Math.abs(controlBox.width - expectedControlWidth) > 2) {
            errors.push(`interactive plate ${index + 1} controls are not on the canonical aside measure`);
          }
          if (Math.abs(controlBox.left - (visualBox.right + expectedGap)) > 2) {
            errors.push(`interactive plate ${index + 1} does not preserve the reading-gutter-aside rhythm`);
          }
        }
      }

      visual.querySelectorAll(":scope > article > header").forEach((header, panelIndex) => {
        const title = header.querySelector(":scope > strong");
        if (!title || !title.getClientRects().length) return;
        const headerBox = header.getBoundingClientRect();
        const titleBox = title.getBoundingClientRect();
        if (titleBox.bottom > headerBox.bottom + 1 || titleBox.right > headerBox.right + 1) {
          errors.push(`interactive plate ${index + 1} panel heading ${panelIndex + 1} escapes its header`);
        }
      });

      visual.querySelectorAll("canvas").forEach(checkCanvasAspect);

      visual.querySelectorAll(":scope > :is(.canvas-wrap, .geometry-canvas-wrap, .modes-canvas-wrap, .phase-story-canvas-wrap, .debye-canvas-wrap, .abundance-canvas-wrap), :scope > article > .collar-field-canvas-wrap").forEach((wrap) => {
        const box = wrap.getBoundingClientRect();
        if (handset && box.height > Math.max(520, box.width * 1.6)) {
          errors.push(`interactive plate ${index + 1} has an implausibly tall narrow plot`);
        }
      });
    });

    document.querySelectorAll(".interactive-plate[data-apparatus='visual-aside']").forEach((plate, index) => {
      const visual = plate.querySelector(":scope > .apparatus-visual");
      const controls = plate.querySelector(":scope > .apparatus-controls");
      const caption = plate.querySelector(":scope > figcaption");
      if (!visual || !controls || !caption) {
        errors.push("canonical apparatus " + (index + 1) + " is missing a semantic visual, controls, or caption role");
        return;
      }
      if (!(visual.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING)
          || !(controls.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        errors.push("canonical apparatus " + (index + 1) + " is not authored visual → controls → caption");
      }
    });

    document.querySelectorAll(".interactive-plate[data-panel-grid='four']").forEach((plate, index) => {
      const panels = Array.from(plate.querySelectorAll(":scope > .apparatus-visual > .apparatus-panel"));
      if (panels.length !== 4) {
        errors.push("four-panel apparatus " + (index + 1) + " does not contain exactly four panels");
        return;
      }
      if (!narrow) {
        const widths = panels.map((panel) => panel.getBoundingClientRect().width);
        if (Math.max(...widths) - Math.min(...widths) > 2) {
          errors.push("four-panel apparatus " + (index + 1) + " does not distribute its drawings evenly");
        }
      }
    });

    document.querySelectorAll("body.tufte-site main :is(.reading-figure, .phase-family) canvas").forEach(checkCanvasAspect);

    const phaseFamilyWrap = document.querySelector("#phaseFamilyCanvasWrap");
    if (visible(phaseFamilyWrap)) {
      const height = phaseFamilyWrap.getBoundingClientRect().height;
      if (!narrow && (height < 190 || height > 280)) {
        errors.push(`phase-family plot height ${rounded(height)}px is not the compact desktop measure`);
      }
      if (narrow && (height < 220 || height > 360)) {
        errors.push(`phase-family plot height ${rounded(height)}px is not the compact stacked measure`);
      }
    }

    const result = {
      ok: errors.length === 0,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      margins: document.querySelectorAll(marginSelector).length,
      disclosures: document.querySelectorAll(disclosureSelector).length,
      statements: document.querySelectorAll("body.tufte-site main .math-statement").length,
      paperCopies: document.querySelectorAll("body.tufte-site main .paper-copy").length,
      smallMultiples: document.querySelectorAll("body.tufte-site main .small-multiples").length,
      figureBands: document.querySelectorAll("body.tufte-site main .figure-band").length,
      readingFigures: document.querySelectorAll("body.tufte-site main .reading-figure").length,
      sideFigures: document.querySelectorAll("body.tufte-site main .side-figure").length,
      marginFigureSequences: document.querySelectorAll("body.tufte-site main .margin-figure-sequence").length,
      dataTables: document.querySelectorAll("body.tufte-site main .data-table").length,
      leanStatements: document.querySelectorAll("body.tufte-site main .lean-statement").length,
      plates: document.querySelectorAll(".interactive-plate").length,
      paperControlRails: document.querySelectorAll("body.tufte-site main .paper-demo-controls").length,
      errors,
    };
    window.__TUFTE_LAYOUT_CHECK__ = result;
    if (result.ok) {
      pendingFailureSignature = "";
      pendingFailureSince = 0;
      reportedFailureSignature = "";
      if (contractRetryTimer) {
        clearTimeout(contractRetryTimer);
        contractRetryTimer = 0;
      }
      document.documentElement.dataset.layoutContract = "pass";
    } else {
      const signature = errors.join("\n");
      const now = performance.now();
      if (signature !== pendingFailureSignature) {
        pendingFailureSignature = signature;
        pendingFailureSince = now;
      }

      /* A canvas can briefly retain its previous bitmap dimensions while its
         responsive drawing script handles the same resize.  Wait for one
         short, stable interval before reporting a failure, so the audit still
         catches persistent defects without emitting false console errors. */
      if (now - pendingFailureSince < 240) {
        document.documentElement.dataset.layoutContract = "checking";
        if (contractRetryTimer) clearTimeout(contractRetryTimer);
        contractRetryTimer = window.setTimeout(() => {
          contractRetryTimer = 0;
          scheduleContract();
        }, 260);
      } else {
        document.documentElement.dataset.layoutContract = "fail";
        if (signature !== reportedFailureSignature) {
          console.error(`Tufte layout contract failed: ${errors.join(" | ")}`);
          reportedFailureSignature = signature;
        }
      }
    }
    return result;
  }

  window.__runTufteLayoutContract = runLayoutContract;
})();
