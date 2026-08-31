(() => {
  "use strict";

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  const updateQuery = (changes, { hash } = {}) => {
    const url = new URL(window.location.href);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    });
    if (hash !== undefined) url.hash = hash || "";
    window.history.replaceState(window.history.state, "", url);
  };

  const routeConfig = Object.freeze({
    mechanism: Object.freeze({ label: "Geometric mechanism", fixed: "#computer-search", real: "#cone-remap" }),
    reduction: Object.freeze({ label: "Analytic reduction", fixed: "#computer-compatible-inverse", real: "#fixed-domain" }),
    closure: Object.freeze({ label: "Rigorous closure", fixed: "#computer-contraction", real: "#phase-story" }),
  });
  const routeControls = Array.from(document.querySelectorAll("[data-route-level-control]"));
  const routeRows = Array.from(document.querySelectorAll("[data-route-level]"));
  const routeSelection = document.getElementById("routeComparisonSelection");
  const routeFixedLink = document.getElementById("routeComparisonFixedLink");
  const routeRealLink = document.getElementById("routeComparisonRealLink");

  const selectRouteLevel = (requested, { store = true, announce = true } = {}) => {
    const level = Object.prototype.hasOwnProperty.call(routeConfig, requested) ? requested : "mechanism";
    const config = routeConfig[level];
    routeControls.forEach((button) => button.setAttribute(
      "aria-pressed",
      String(button.dataset.routeLevelControl === level),
    ));
    routeRows.forEach((row) => row.classList.toggle("is-selected", row.dataset.routeLevel === level));
    document.querySelectorAll("[data-proof-level]").forEach((node) => {
      node.classList.toggle("is-level-match", node.dataset.proofLevel === level);
    });
    if (routeFixedLink) routeFixedLink.href = config.fixed;
    if (routeRealLink) routeRealLink.href = config.real;
    if (routeSelection) {
      if (!announce) routeSelection.setAttribute("aria-live", "off");
      else routeSelection.setAttribute("aria-live", "polite");
      routeSelection.textContent = config.label + " selected.";
    }
    if (store) updateQuery({ proofLevel: level === "mechanism" ? null : level });
    document.dispatchEvent(new CustomEvent("schiffer:proof-level-change", { detail: { level } }));
  };

  routeControls.forEach((button) => {
    button.addEventListener("click", () => selectRouteLevel(button.dataset.routeLevelControl));
  });

  const atlas = document.getElementById("proof-atlas");
  const filterButtons = Array.from(atlas?.querySelectorAll("[data-proof-filter]") || []);
  const filterableNodes = Array.from(atlas?.querySelectorAll("[data-proof-tags]") || []);
  const nodeButtons = Array.from(atlas?.querySelectorAll("[data-proof-node]") || []);
  const atlasFilterStatus = document.getElementById("proofAtlasFilterStatus");
  const atlasDetailBranch = document.getElementById("proofAtlasDetailBranch");
  const atlasDetailTitle = document.getElementById("proofAtlasDetailTitle");
  const atlasDetailSummary = document.getElementById("proofAtlasDetailSummary");
  const atlasDetailDependency = document.getElementById("proofAtlasDetailDependency");
  const atlasDetailLink = document.getElementById("proofAtlasDetailLink");

  const sourceFromRenderedMath = (element) => {
    if (!element) return "";
    const readNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || "";
      if (!(node instanceof Element)) return "";
      if (node.classList.contains("katex")) {
        const source = node.querySelector("annotation[encoding='application/x-tex']")?.textContent;
        return source ? `\\(${source}\\)` : node.querySelector(".katex-html")?.textContent || "";
      }
      return Array.from(node.childNodes, readNode).join("");
    };
    return Array.from(element.childNodes, readNode).join("").replace(/\s+/g, " ").trim();
  };

  const renderAtlasDetail = (target, source) => {
    if (!target) return;
    if (window.SchifferMath?.renderInlineContent) window.SchifferMath.renderInlineContent(target, source);
    else target.textContent = source;
  };

  const selectFilter = (requested, { store = true } = {}) => {
    const valid = ["all", "geometry", "bifurcation", "analysis", "arithmetic", "validation"];
    const filter = valid.includes(requested) ? requested : "all";
    if (atlas) atlas.dataset.activeFilter = filter;
    filterButtons.forEach((button) => button.setAttribute(
      "aria-pressed",
      String(button.dataset.proofFilter === filter),
    ));
    let matchCount = 0;
    filterableNodes.forEach((node) => {
      const tags = (node.dataset.proofTags || "").split(/\s+/);
      const matches = filter === "all" || tags.includes(filter);
      if (matches) matchCount += 1;
      node.classList.toggle("is-filter-muted", !matches);
    });
    if (atlasFilterStatus) {
      const label = filterButtons.find((button) => button.dataset.proofFilter === filter)?.textContent.trim()
        || filter;
      atlasFilterStatus.textContent = filter === "all"
        ? `All ${filterableNodes.length} proof nodes are shown.`
        : `${matchCount} of ${filterableNodes.length} proof nodes match ${label}.`;
    }
    if (store) updateQuery({ proofFilter: filter === "all" ? null : filter });
  };

  const nodeContainer = (button) => button.closest("[data-proof-tags]");
  const selectAtlasNode = (button, { store = true } = {}) => {
    const container = nodeContainer(button);
    if (!container) return;
    const selectedNode = button.dataset.proofNode;
    nodeButtons.forEach((candidate) => {
      const selected = candidate === button;
      candidate.setAttribute("aria-pressed", String(selected));
      nodeContainer(candidate)?.classList.toggle("is-node-selected", selected);
    });
    const lane = button.closest(".proof-atlas-lane");
    const branch = lane?.querySelector(":scope > header > span")?.textContent || "Common obstruction";
    const openLink = container.matches(".proof-node-card")
      ? container.querySelector(":scope > a")
      : container.querySelector(".proof-node-card > a");
    const dependency = container.querySelector(".proof-node-dependency")?.textContent
      || "Both constructions must overcome this common obstruction.";
    if (atlasDetailBranch) atlasDetailBranch.textContent = branch;
    renderAtlasDetail(atlasDetailTitle, sourceFromRenderedMath(button.querySelector("strong")));
    renderAtlasDetail(atlasDetailSummary, sourceFromRenderedMath(button.querySelector("small")));
    renderAtlasDetail(atlasDetailDependency, sourceFromRenderedMath(container.querySelector(".proof-node-dependency")) || dependency);
    if (atlasDetailLink && openLink) {
      atlasDetailLink.setAttribute("href", openLink.getAttribute("href") || openLink.href);
    }
    if (store) updateQuery({ proofNode: selectedNode === "disk-rigidity" ? null : selectedNode });
  };

  filterButtons.forEach((button) => button.addEventListener("click", () => selectFilter(button.dataset.proofFilter)));
  nodeButtons.forEach((button) => {
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.setAttribute("aria-controls", "proofAtlasDetail");
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => selectAtlasNode(button));
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      selectAtlasNode(button);
    });
  });

  const tour = document.getElementById("research-tour");
  const tourStart = document.querySelector("[data-start-research-tour]");
  const tourTitle = document.getElementById("researchTourTitle");
  const tourProgress = document.getElementById("researchTourProgress");
  const tourDo = document.getElementById("researchTourDo");
  const tourObserve = document.getElementById("researchTourObserve");
  const tourConclude = document.getElementById("researchTourConclude");
  const tourStatus = document.getElementById("researchTourStatus");
  const tourPrevious = document.getElementById("researchTourPrevious");
  const tourNext = document.getElementById("researchTourNext");
  const tourFocus = document.getElementById("researchTourFocus");
  const tourEnd = document.getElementById("researchTourEnd");
  const tourCollapse = document.getElementById("researchTourCollapse");
  const tourBody = document.getElementById("researchTourBody");
  let tourIndex = 0;
  let tourInitiator = null;
  let currentTourTarget = null;

  const stopButtonIfPlaying = (button) => {
    if (!button) return;
    const pressed = button.getAttribute("aria-pressed") === "true";
    const label = button.textContent.toLowerCase();
    if (pressed || label.includes("pause")) button.click();
  };

  const tourSteps = Object.freeze([
    Object.freeze({
      title: "Linear rigidity at the disk",
      target: "#shapeVariationFigure",
      focus: "#shapeVariationSlider",
      doText: "Move the normal-displacement slider from zero to either side.",
      observe: "Geometry permits many normal motions, but the Schiffer boundary data require a matching eigenfunction mode.",
      conclude: "Bourget–Siegel removes every genuine nonradial integer-order direction at a disk.",
      prepare: () => {
        const slider = document.getElementById("shapeVariationSlider");
        if (!slider) return;
        slider.value = "0.72";
        slider.dispatchEvent(new Event("input", { bubbles: true }));
        slider.dispatchEvent(new Event("change", { bubbles: true }));
      },
    }),
    Object.freeze({
      title: "From a numerical centre to an exact domain",
      target: "#figure-computer-proof-overview",
      focus: "[data-computer-overview-stage='0']",
      doText: "Compare stages 01, 04, and 05 of the fixed-disk proof map.",
      observe: "Continuation supplies only the stored centre x°; the contraction produces the exact solution x*.",
      conclude: "The search path supplies the numerical centre, while the independent certificate establishes existence and noncircularity.",
      prepare: () => {
        stopButtonIfPlaying(document.getElementById("computerOverviewPlayButton"));
        document.querySelector("[data-computer-overview-stage='0']")?.click();
      },
    }),
    Object.freeze({
      title: "Let the order become real, then close the seam",
      target: "#figure-cone-quotient-construction",
      focus: "[data-story-stage='0.833333']",
      doText: "Select “Work at finite R”, then “Close at integer R”.",
      observe: "Real order permits the bifurcation, but only integer R = N unfolds with no quotient seam.",
      conclude: "Near-integer arithmetic and uniform branch bending force an exact planar landing.",
      prepare: () => {
        stopButtonIfPlaying(document.getElementById("storyGeometryPlayButton"));
        if (reducedMotion?.matches) {
          const range = document.getElementById("storyGeometryRange");
          if (!range) return;
          range.value = "0.833333";
          range.dispatchEvent(new Event("input", { bubbles: true }));
          range.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          document.querySelector("[data-story-stage='0.833333']")?.click();
        }
      },
    }),
    Object.freeze({
      title: "Compare the complete proof mechanisms",
      target: "#proof-atlas",
      focus: "[data-proof-filter='all']",
      doText: "Switch among the three comparison levels, then select matching nodes in the two atlas lanes.",
      observe: "Both routes contain geometry, bifurcation, and analytic reduction, but they close existence differently.",
      conclude: "One route closes by validated contraction; the other by uniform bifurcation estimates and integer landing.",
      prepare: () => selectRouteLevel("mechanism"),
    }),
  ]);

  const clearTourTarget = () => {
    currentTourTarget?.classList.remove("is-research-tour-target");
    currentTourTarget = null;
  };

  const scrollToTourTarget = (target) => {
    target?.scrollIntoView({
      behavior: reducedMotion?.matches ? "auto" : "smooth",
      block: "center",
    });
  };

  const showTourStep = (requested, { scroll = true, store = true } = {}) => {
    const index = Math.max(0, Math.min(tourSteps.length - 1, requested));
    const step = tourSteps[index];
    tourIndex = index;
    clearTourTarget();
    currentTourTarget = document.querySelector(step.target);
    currentTourTarget?.classList.add("is-research-tour-target");
    step.prepare();
    if (tourProgress) {
      tourProgress.textContent = "Stop " + (index + 1) + " of " + tourSteps.length;
      tourProgress.setAttribute("aria-current", "step");
    }
    if (tourTitle) tourTitle.textContent = step.title;
    if (tourDo) tourDo.textContent = step.doText;
    if (tourObserve) tourObserve.textContent = step.observe;
    if (tourConclude) tourConclude.textContent = step.conclude;
    if (tourStatus) tourStatus.textContent = "Stop " + (index + 1) + " of " + tourSteps.length + ": " + step.title + ".";
    if (tourPrevious) tourPrevious.disabled = index === 0;
    if (tourNext) tourNext.innerHTML = index === tourSteps.length - 1
      ? "Finish tour"
      : "Next <span aria-hidden=\"true\">→</span>";
    if (tourFocus) tourFocus.setAttribute(
      "aria-label",
      "Move focus to the demonstration for stop " + (index + 1) + ": " + step.title,
    );
    if (scroll) scrollToTourTarget(currentTourTarget);
    if (store) updateQuery({ tour: "1", tourStep: String(index + 1) }, { hash: step.target });
  };

  const startTour = ({ step = 0, initiator = tourStart, store = true } = {}) => {
    if (!tour) return;
    tourInitiator = initiator || document.activeElement;
    tour.hidden = false;
    document.body.classList.add("research-tour-active");
    showTourStep(step, { store });
    tourTitle?.setAttribute("tabindex", "-1");
    requestAnimationFrame(() => tourTitle?.focus({ preventScroll: true }));
  };

  const endTour = ({ restoreFocus = true } = {}) => {
    if (!tour || tour.hidden) return;
    clearTourTarget();
    tour.hidden = true;
    document.body.classList.remove("research-tour-active");
    updateQuery({ tour: null, tourStep: null });
    if (restoreFocus && tourInitiator instanceof HTMLElement) tourInitiator.focus({ preventScroll: true });
  };

  tourStart?.addEventListener("click", (event) => {
    event.preventDefault();
    startTour({ initiator: tourStart });
  });
  tourPrevious?.addEventListener("click", () => showTourStep(tourIndex - 1));
  tourNext?.addEventListener("click", () => {
    if (tourIndex === tourSteps.length - 1) endTour();
    else showTourStep(tourIndex + 1);
  });
  tourFocus?.addEventListener("click", () => {
    const step = tourSteps[tourIndex];
    const target = document.querySelector(step.focus) || currentTourTarget;
    if (!target) return;
    scrollToTourTarget(currentTourTarget || target);
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
  });
  tourEnd?.addEventListener("click", () => endTour());
  tourCollapse?.addEventListener("click", () => {
    if (!tourBody) return;
    tourBody.hidden = !tourBody.hidden;
    const expanded = !tourBody.hidden;
    tourCollapse.setAttribute("aria-expanded", String(expanded));
    const label = tourCollapse.querySelector("span");
    const icon = tourCollapse.querySelector("i");
    if (label) label.textContent = expanded ? "Minimize" : "Expand";
    if (icon) icon.textContent = expanded ? "−" : "+";
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && tour && !tour.hidden) {
      event.preventDefault();
      endTour();
    }
  });

  reducedMotion?.addEventListener?.("change", (event) => {
    if (!event.matches) return;
    [
      "#playButton",
      "#conePlayButton",
      "#modesPlayButton",
      "#computerOverviewPlayButton",
      "#storyGeometryPlayButton",
      "#coneFoldPlayButton",
      "#halfCylinderPlayButton",
      "#schifferModePlay",
      "#debyePlayButton",
    ].forEach((selector) => stopButtonIfPlaying(document.querySelector(selector)));
  });

  const query = new URLSearchParams(window.location.search);
  selectRouteLevel(query.get("proofLevel") || "mechanism", { store: false, announce: false });
  selectFilter(query.get("proofFilter") || "all", { store: false });
  const requestedNode = query.get("proofNode");
  const initialNode = nodeButtons.find((candidate) => candidate.dataset.proofNode === requestedNode) || nodeButtons[0];
  if (initialNode) selectAtlasNode(initialNode, { store: false });
  if (query.get("tour") === "1") {
    const step = Number.parseInt(query.get("tourStep") || "1", 10) - 1;
    requestAnimationFrame(() => startTour({
      step: Number.isFinite(step) ? step : 0,
      initiator: tourStart,
      store: false,
    }));
  }

  window.SCHIFFER_RESEARCH_GUIDE = Object.freeze({
    selectRouteLevel,
    selectFilter,
    startTour,
    endTour,
  });
})();
