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
  const tocClassByLevel = Object.freeze({
    section: "",
    subsection: "toc-nested",
    "proof-subsection": "toc-subsection",
  });
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

  /* The contents is a projection of the semantic heading tree, never authored
     separately.  Keeping it beside section numbering means a moved or renamed
     subsection has exactly one source of truth. */
  const headingTarget = (heading) => {
    if (heading.dataset.target) return document.querySelector(heading.dataset.target);
    if (heading.id) return heading;
    return heading.closest("[id]") || heading.querySelector("[id]");
  };
  const sectionNavigation = document.querySelector("[data-section-navigation]");
  const toc = sectionNavigation?.querySelector("nav[data-toc-nav]");
  if (toc) {
    const headings = Array.from(main.querySelectorAll(".section-heading[data-number][data-title]"))
      .filter((heading) => Object.prototype.hasOwnProperty.call(tocClassByLevel, heading.dataset.toc || ""));

    const records = headings.map((heading) => {
      const target = headingTarget(heading);
      return {
        className: tocClassByLevel[heading.dataset.toc],
        href: target ? `#${target.id}` : "#",
        level: heading.dataset.toc,
        number: heading.dataset.number,
        title: heading.dataset.title,
      };
    });

    const createLabel = (record, includeIndicator = false) => {
      const fragment = document.createDocumentFragment();
      const number = document.createElement("b");
      number.textContent = record.number;
      if (!record.number) number.setAttribute("aria-hidden", "true");
      const title = document.createElement("span");
      title.textContent = record.title;
      fragment.append(number, title);
      if (includeIndicator) {
        const indicator = document.createElement("i");
        indicator.setAttribute("aria-hidden", "true");
        fragment.append(indicator);
      }
      return fragment;
    };

    const createHeadingLink = (record) => {
      const link = document.createElement("a");
      link.classList.add("section-banner-link");
      if (record.className) link.classList.add(record.className);
      link.dataset.headingLink = "";
      link.dataset.tocLevel = record.level;
      link.href = record.href;
      link.append(createLabel(record));
      return link;
    };

    const groups = [];
    records.forEach((record) => {
      if (record.level === "section") {
        groups.push({ section: record, children: [] });
      } else if (groups.length) {
        groups.at(-1).children.push(record);
      }
    });

    const list = document.createElement("ol");
    list.className = "section-banner-list";
    groups.forEach(({ section, children }, index) => {
      const item = document.createElement("li");
      item.className = "section-banner-item";
      item.dataset.sectionTarget = section.href;

      if (children.length) {
        const group = document.createElement("details");
        group.className = "section-banner-group";
        group.setAttribute("name", "exposition-sections");

        const summary = document.createElement("summary");
        summary.append(createLabel(section, true));

        const dropdown = document.createElement("div");
        dropdown.className = "section-banner-dropdown";
        const sectionLink = createHeadingLink(section);
        sectionLink.classList.add("section-banner-section-link");
        dropdown.append(sectionLink);

        const childList = document.createElement("ol");
        childList.className = "section-banner-subsections";
        children.forEach((child) => {
          const childItem = document.createElement("li");
          childItem.append(createHeadingLink(child));
          childList.append(childItem);
        });
        dropdown.append(childList);
        group.append(summary, dropdown);
        item.append(group);
      } else {
        const directLink = createHeadingLink(section);
        directLink.classList.add("section-banner-direct");
        item.append(directLink);
      }

      item.style.setProperty("--section-index", String(index));
      list.append(item);
    });
    toc.replaceChildren(list);

    const groupDetails = Array.from(toc.querySelectorAll("details.section-banner-group"));
    const closeGroups = (except = null) => {
      groupDetails.forEach((group) => {
        if (group !== except) group.open = false;
      });
    };
    groupDetails.forEach((group) => {
      group.addEventListener("toggle", () => {
        if (group.open) closeGroups(group);
      });
    });

    const compactNavigation = window.matchMedia("(max-width: 1000px)");
    const syncNavigationMode = () => {
      sectionNavigation.open = !compactNavigation.matches;
      closeGroups();
    };
    syncNavigationMode();
    if (compactNavigation.addEventListener) {
      compactNavigation.addEventListener("change", syncNavigationMode);
    } else {
      compactNavigation.addListener?.(syncNavigationMode);
    }

    sectionNavigation.addEventListener("toggle", () => {
      if (!sectionNavigation.open) closeGroups();
    });

    toc.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      closeGroups();
      if (compactNavigation.matches) sectionNavigation.open = false;
    });
    document.addEventListener("click", (event) => {
      if (sectionNavigation.contains(event.target)) return;
      closeGroups();
      if (compactNavigation.matches) sectionNavigation.open = false;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openGroup = groupDetails.find((group) => group.open);
      if (openGroup) {
        openGroup.open = false;
        openGroup.querySelector(":scope > summary")?.focus();
        return;
      }
      if (compactNavigation.matches && sectionNavigation.open) {
        sectionNavigation.open = false;
        sectionNavigation.querySelector(":scope > summary")?.focus();
      }
    });
  }

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
