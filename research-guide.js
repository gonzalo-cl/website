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

  const stopButtonIfPlaying = (button) => {
    if (!button) return;
    const pressed = button.getAttribute("aria-pressed") === "true";
    const label = button.textContent.toLowerCase();
    if (pressed || label.includes("pause")) button.click();
  };

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

  window.SCHIFFER_RESEARCH_GUIDE = Object.freeze({
    selectRouteLevel,
    selectFilter,
  });
})();
