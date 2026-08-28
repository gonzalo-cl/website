(() => {
  "use strict";

  /*
   * Document structure is authored with semantic labels, never printed
   * numbers.  This registry owns section, statement, equation and figure
   * numbering as well as every internal cross-reference.  Content authors
   * therefore write
   *
   *   data-label="williams-equivalence"
   *   <a class="xref" data-ref="williams-equivalence"></a>
   *
   * and can move either object without repairing prose by hand.
   */
  const main = document.querySelector("main");
  if (!main) return;

  const registry = new Map();
  const topLevelSections = Array.from(main.children)
    .filter((element) => element.matches("section"));
  const numberedSections = topLevelSections
    .filter((section) => section.querySelector(":scope > .section-heading[data-toc='section']:not([data-unnumbered])"));

  const topSectionFor = (element) => {
    let current = element;
    while (current && current.parentElement !== main) current = current.parentElement;
    return current?.matches("section") ? current : null;
  };

  const anchor = (element, fallback) => {
    if (!element.id) element.id = fallback;
    return `#${element.id}`;
  };

  const register = (label, record) => {
    if (!label) return;
    if (registry.has(label)) {
      console.error(`Duplicate document label: ${label}`);
      return;
    }
    registry.set(label, Object.freeze(record));
  };

  const isEditoriallyVisible = (element) => !element.closest("[hidden], [aria-hidden='true']");

  const sectionNumbers = new Map();
  numberedSections.forEach((section, index) => {
    const heading = section.querySelector(":scope > .section-heading[data-toc='section']");
    const number = String(index + 1);
    const label = heading.dataset.label || section.id;
    heading.dataset.number = number;
    sectionNumbers.set(section, number);
    register(label, {
      kind: "section",
      number,
      text: `Section ${number}`,
      shortText: number,
      href: anchor(section, `section-${number}`),
      element: section,
    });

    let subsectionIndex = 0;
    section.querySelectorAll(".section-heading[data-title]").forEach((subheading) => {
      if (subheading === heading || subheading.dataset.toc === "section") return;
      subsectionIndex += 1;
      const subsectionNumber = `${number}.${subsectionIndex}`;
      const target = subheading.id ? subheading : subheading.closest("[id]");
      const subsectionLabel = subheading.dataset.label || target?.id;
      subheading.dataset.number = subsectionNumber;
      if (target) register(subsectionLabel, {
        kind: "section",
        number: subsectionNumber,
        text: `Section ${subsectionNumber}`,
        shortText: subsectionNumber,
        href: anchor(target, `section-${subsectionNumber.replace(".", "-")}`),
        element: target,
      });
    });
  });

  main.querySelectorAll(".section-heading[data-unnumbered]").forEach((heading) => {
    heading.dataset.number = "";
    const target = heading.id ? heading : heading.closest("[id]");
    const label = heading.dataset.label || target?.id;
    if (target) register(label, {
      kind: "section",
      number: "",
      text: heading.dataset.title,
      shortText: heading.dataset.title,
      href: anchor(target, `section-${label || "unnumbered"}`),
      element: target,
    });
  });

  const statementKinds = new Set(["theorem", "lemma", "proposition", "corollary", "criterion"]);
  const statementCounters = new Map();
  let frontStatementIndex = 0;
  main.querySelectorAll("article.math-statement").forEach((statement) => {
    const header = statement.querySelector(":scope > .math-statement-header");
    const kindNode = header?.querySelector(":scope > span");
    if (!header || !kindNode) return;
    const kind = (statement.dataset.kind || kindNode.textContent.match(/[A-Za-z]+/)?.[0] || "statement").toLowerCase();
    const printedKind = kind.charAt(0).toUpperCase() + kind.slice(1);
    statement.dataset.kind = kind;

    let number = "";
    if (statementKinds.has(kind) && statement.dataset.unnumbered !== "true") {
      const section = topSectionFor(statement);
      const sectionNumber = sectionNumbers.get(section);
      if (sectionNumber) {
        const next = (statementCounters.get(section) || 0) + 1;
        statementCounters.set(section, next);
        number = `${sectionNumber}.${next}`;
      } else {
        number = String.fromCharCode(65 + frontStatementIndex);
        frontStatementIndex += 1;
      }
    }
    kindNode.textContent = number ? `${printedKind} ${number}` : printedKind;

    const label = statement.dataset.label;
    if (!label) return;
    statement.dataset.number = number;
    register(label, {
      kind,
      number,
      text: number ? `${printedKind} ${number}` : printedKind,
      shortText: number || printedKind,
      href: anchor(statement, `statement-${label}`),
      element: statement,
    });
  });

  const numberWithinSection = (selector, attribute, kind, prefix) => {
    const counters = new Map();
    main.querySelectorAll(selector).forEach((element) => {
      if (!isEditoriallyVisible(element)) return;
      const section = topSectionFor(element);
      const sectionNumber = sectionNumbers.get(section);
      const next = (counters.get(section) || 0) + 1;
      counters.set(section, next);
      const number = sectionNumber ? `${sectionNumber}.${next}` : String(next);
      const label = element.getAttribute(attribute);
      element.dataset.number = number;
      register(label, {
        kind,
        number,
        text: `${prefix} ${kind === "equation" ? `(${number})` : number}`,
        shortText: kind === "equation" ? `(${number})` : number,
        href: anchor(element, `${kind}-${label}`),
        element,
      });
    });
  };

  numberWithinSection(".tex-display[data-equation]", "data-equation", "equation", "Equation");
  main.querySelectorAll(".tex-display[data-equation]").forEach((display) => {
    const tag = document.createElement("a");
    tag.className = "equation-tag";
    tag.href = `#${display.id}`;
    tag.textContent = `(${display.dataset.number})`;
    tag.setAttribute("aria-label", `Equation ${display.dataset.number}`);
    display.append(tag);
  });

  numberWithinSection("figure[data-figure]", "data-figure", "figure", "Figure");
  main.querySelectorAll("figure[data-figure]").forEach((figure) => {
    if (!isEditoriallyVisible(figure)) return;
    const caption = figure.querySelector(":scope > figcaption");
    if (!caption) return;
    const label = document.createElement("span");
    label.className = "figure-label";
    label.textContent = `Figure ${figure.dataset.number}. `;
    caption.prepend(label);
  });

  numberWithinSection("aside[data-aside]", "data-aside", "aside", "Aside");
  main.querySelectorAll("aside[data-aside]").forEach((aside) => {
    if (!isEditoriallyVisible(aside)) return;
    const label = document.createElement("a");
    label.className = "aside-label";
    label.href = `#${aside.id}`;
    label.textContent = aside.dataset.number;
    label.setAttribute("aria-label", `Aside ${aside.dataset.number}`);
    aside.prepend(label);
  });

  document.querySelectorAll("a.xref[data-ref]").forEach((reference) => {
    const record = registry.get(reference.dataset.ref);
    if (!record) {
      reference.textContent = "[missing reference]";
      reference.dataset.referenceError = "missing";
      console.error(`Unknown document reference: ${reference.dataset.ref}`);
      return;
    }
    reference.href = record.href;
    reference.textContent = reference.hasAttribute("data-ref-short") ? record.shortText : record.text;
    reference.dataset.refKind = record.kind;
  });

  window.SCHIFFER_DOCUMENT_STRUCTURE = Object.freeze({
    lookup: (label) => registry.get(label),
    entries: () => Array.from(registry.entries()),
  });

  document.dispatchEvent(new CustomEvent("schiffer:structure-ready", {
    detail: { registry },
  }));
})();
