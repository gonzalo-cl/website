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
  const last = (items) => items[items.length - 1];

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
        links: [],
        number: heading.dataset.number,
        target,
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
      link.dataset.headingTarget = record.target?.id || "";
      link.href = record.href;
      link.append(createLabel(record));
      record.links.push(link);
      return link;
    };

    const groups = [];
    records.forEach((record) => {
      if (record.level === "section") {
        groups.push({ section: record, children: [] });
      } else if (groups.length) {
        last(groups).children.push(record);
      }
    });
    groups.forEach(({ section, children }) => {
      section.parentSection = section;
      children.forEach((child) => { child.parentSection = section; });
    });

    const list = document.createElement("ol");
    list.className = "section-banner-list";
    groups.forEach((navigationGroup, index) => {
      const { section, children } = navigationGroup;
      const item = document.createElement("li");
      item.className = "section-banner-item";
      item.dataset.sectionTarget = section.href;
      navigationGroup.item = item;

      if (children.length) {
        const group = document.createElement("details");
        group.className = "section-banner-group";
        group.setAttribute("name", "exposition-sections");
        navigationGroup.disclosure = group;

        const summary = document.createElement("summary");
        summary.append(createLabel(section, true));
        navigationGroup.summary = summary;

        const dropdown = document.createElement("div");
        dropdown.className = "section-banner-dropdown";
        const sectionLink = createHeadingLink(section);
        sectionLink.classList.add("section-banner-section-link");
        dropdown.append(sectionLink);

        const childList = document.createElement("ol");
        childList.className = "section-banner-subsections";
        children.forEach((child) => {
          const childItem = document.createElement("li");
          child.navigationItem = childItem;
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

    const printedSectionTitle = (record) => record.number
      ? `${record.number} · ${record.title}`
      : record.title;

    /* The page is deliberately a single continuous document.  Short handoff
       links at section ends retain that reading flow while sparing readers a
       trip back to the sticky banner after a long chapter. */
    groups.forEach(({ section }, index) => {
      if (!section.target) return;
      const sectionElement = topSectionFor(section.target) || section.target;
      if (sectionElement.querySelector(":scope > [data-chapter-navigation]")) return;
      const previous = groups[index - 1]?.section;
      const next = groups[index + 1]?.section;
      if (!previous && !next) return;

      const pagination = document.createElement("nav");
      pagination.className = "chapter-pagination";
      pagination.dataset.chapterNavigation = "";
      pagination.dataset.sectionTarget = section.target.id;
      pagination.setAttribute("aria-label", `Continue from ${printedSectionTitle(section)}`);

      const createChapterLink = (destination, direction) => {
        const link = document.createElement("a");
        const isPrevious = direction === "previous";
        link.className = `chapter-pagination-link chapter-pagination-${direction}`;
        link.dataset.chapterDirection = direction;
        link.href = destination.href;
        link.rel = isPrevious ? "prev" : "next";
        link.setAttribute(
          "aria-label",
          `${isPrevious ? "Previous" : "Next"} section: ${printedSectionTitle(destination)}`,
        );

        const directionLabel = document.createElement("span");
        directionLabel.className = "chapter-pagination-direction";
        directionLabel.textContent = isPrevious ? "← Previous" : "Next →";
        const destinationLabel = document.createElement("span");
        destinationLabel.className = "chapter-pagination-destination";
        destinationLabel.textContent = printedSectionTitle(destination);
        link.append(directionLabel, destinationLabel);
        return link;
      };

      if (previous) pagination.append(createChapterLink(previous, "previous"));
      if (next) pagination.append(createChapterLink(next, "next"));
      sectionElement.append(pagination);
    });

    const trackedRecords = groups.flatMap(({ section, children }) => [section, ...children])
      .filter((record) => record.target);
    const mobileSummaryLabel = sectionNavigation
      .querySelector(":scope > .section-banner-mobile-summary > span");
    const defaultMobileSummary = mobileSummaryLabel?.textContent || "Sections";
    mobileSummaryLabel?.classList.add("section-banner-mobile-current");
    let currentRecord = null;
    let compactNavigationRecord = null;
    let currentFrame = 0;
    let navigationMetricsDirty = true;
    let navigationScrollPadding = 0;
    const navigationScrollMargins = new Map();

    const setCurrentRecord = (nextRecord) => {
      if (nextRecord === currentRecord) return;
      currentRecord = nextRecord;
      const currentSection = nextRecord?.parentSection || null;

      trackedRecords.forEach((record) => {
        const isCurrentHeading = record === nextRecord;
        record.links.forEach((link) => {
          link.classList.toggle("is-current", isCurrentHeading);
          link.classList.toggle("is-current-heading", isCurrentHeading);
          if (isCurrentHeading) {
            link.dataset.currentHeading = "";
            link.setAttribute("aria-current", "location");
          } else {
            delete link.dataset.currentHeading;
            link.removeAttribute("aria-current");
          }
        });
        record.navigationItem?.classList.toggle("is-current-subsection", isCurrentHeading);
        if (record.navigationItem) {
          if (isCurrentHeading) record.navigationItem.dataset.currentSubsection = "";
          else delete record.navigationItem.dataset.currentSubsection;
        }
      });

      groups.forEach((navigationGroup) => {
        const isCurrentSection = navigationGroup.section === currentSection;
        [navigationGroup.item, navigationGroup.disclosure, navigationGroup.summary]
          .filter(Boolean)
          .forEach((element) => {
            element.classList.toggle("is-current-section", isCurrentSection);
            if (isCurrentSection) element.dataset.currentSection = "";
            else delete element.dataset.currentSection;
          });
      });

      if (currentSection) {
        sectionNavigation.dataset.currentSection = currentSection.target.id;
        if (nextRecord !== currentSection) {
          sectionNavigation.dataset.currentSubsection = nextRecord.target.id;
        } else {
          delete sectionNavigation.dataset.currentSubsection;
        }
      } else {
        delete sectionNavigation.dataset.currentSection;
        delete sectionNavigation.dataset.currentSubsection;
      }
      if (mobileSummaryLabel) {
        mobileSummaryLabel.textContent = currentSection
          ? printedSectionTitle(currentSection)
          : defaultMobileSummary;
      }

      document.dispatchEvent(new CustomEvent("schiffer:navigation-current", {
        detail: {
          sectionId: currentSection?.target.id || null,
          subsectionId: nextRecord && nextRecord !== currentSection ? nextRecord.target.id : null,
        },
      }));
    };

    const updateCurrentRecord = () => {
      currentFrame = 0;
      /* Expanding the compact navigation changes the sticky banner's height.
         Preserve the reader's location while the menu is open, then refresh
         after its toggle event closes it. */
      if (compactNavigation.matches && sectionNavigation.open) return;
      if (navigationMetricsDirty) {
        navigationMetricsDirty = false;
        navigationScrollPadding = Number.parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingTop,
        ) || 0;
        navigationScrollMargins.clear();
        trackedRecords.forEach((record) => {
          navigationScrollMargins.set(
            record,
            Number.parseFloat(getComputedStyle(record.target).scrollMarginTop) || 0,
          );
        });
      }
      let nextRecord = null;
      trackedRecords.forEach((record) => {
        if (!record.target.getClientRects().length) return;
        const readingLine = navigationScrollPadding
          + (navigationScrollMargins.get(record) || 0) + 1;
        if (record.target.getBoundingClientRect().top <= readingLine) {
          nextRecord = record;
        }
      });
      const atDocumentEnd = window.scrollY + window.innerHeight
        >= document.documentElement.scrollHeight - 2;
      if (atDocumentEnd && trackedRecords.length) nextRecord = last(trackedRecords);

      /* A small upward movement should not make the banner jump back a
         subsection while the current heading is still plainly in view.  The
         hysteresis is especially useful when a sticky control gains focus. */
      if (currentRecord && nextRecord) {
        const currentIndex = trackedRecords.indexOf(currentRecord);
        const nextIndex = trackedRecords.indexOf(nextRecord);
        const currentReadingLine = navigationScrollPadding
          + (navigationScrollMargins.get(currentRecord) || 0) + 1;
        const backwardThreshold = currentReadingLine
          + Math.min(220, window.innerHeight * 0.28);
        if (
          nextIndex < currentIndex
          && currentRecord.target.getBoundingClientRect().top <= backwardThreshold
        ) {
          nextRecord = currentRecord;
        }
      }
      setCurrentRecord(nextRecord);
    };

    const scheduleCurrentRecordUpdate = () => {
      if (currentFrame) return;
      currentFrame = requestAnimationFrame(updateCurrentRecord);
    };
    const refreshNavigationMetrics = () => {
      navigationMetricsDirty = true;
      scheduleCurrentRecordUpdate();
    };
    window.addEventListener("scroll", scheduleCurrentRecordUpdate, { passive: true });
    window.addEventListener("resize", refreshNavigationMetrics);
    window.addEventListener("pageshow", refreshNavigationMetrics);
    window.addEventListener("schiffer:applet-layout", scheduleCurrentRecordUpdate);
    document.fonts?.ready.then(scheduleCurrentRecordUpdate);
    scheduleCurrentRecordUpdate();

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

    const compactNavigation = window.matchMedia("(max-width: 1180px)");
    const compactSummary = sectionNavigation.querySelector(":scope > summary");
    const preserveCompactNavigationRecord = () => {
      if (compactNavigation.matches && !sectionNavigation.open) {
        compactNavigationRecord = currentRecord;
      }
    };
    compactSummary?.addEventListener("pointerdown", preserveCompactNavigationRecord);
    compactSummary?.addEventListener("click", preserveCompactNavigationRecord);
    compactSummary?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") preserveCompactNavigationRecord();
    });
    const syncNavigationMode = () => {
      sectionNavigation.open = !compactNavigation.matches;
      compactNavigationRecord = null;
      closeGroups();
    };
    syncNavigationMode();
    if (compactNavigation.addEventListener) {
      compactNavigation.addEventListener("change", syncNavigationMode);
    } else {
      compactNavigation.addListener?.(syncNavigationMode);
    }

    sectionNavigation.addEventListener("toggle", () => {
      if (!sectionNavigation.open) {
        closeGroups();
        compactNavigationRecord = null;
      } else if (compactNavigation.matches && compactNavigationRecord) {
        setCurrentRecord(compactNavigationRecord);
      }
      scheduleCurrentRecordUpdate();
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

  /* Native fragment scrolling happens before several canvases and late web
     fonts have reached their final size.  Keep a new hash aligned during a
     short settling window, then release it immediately; direct reader input
     always cancels the correction so the page never fights manual scrolling. */
  const targetForHash = (hash = window.location.hash) => {
    if (!hash || hash === "#") return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  };

  let hashAlignment = null;
  const stopHashAlignment = () => {
    if (!hashAlignment) return;
    cancelAnimationFrame(hashAlignment.frame);
    hashAlignment.timers.forEach(clearTimeout);
    hashAlignment = null;
  };

  const alignPendingHash = () => {
    const state = hashAlignment;
    if (!state || window.location.hash !== state.hash || !state.target.isConnected) {
      stopHashAlignment();
      return;
    }
    cancelAnimationFrame(state.frame);
    state.frame = requestAnimationFrame(() => {
      state.frame = requestAnimationFrame(() => {
        if (hashAlignment !== state || !state.target.getClientRects().length) return;
        const root = document.documentElement;
        const previousScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        state.target.scrollIntoView({ block: "start" });
        root.style.scrollBehavior = previousScrollBehavior;
      });
    });
  };

  const beginHashAlignment = (hash = window.location.hash) => {
    const target = targetForHash(hash);
    stopHashAlignment();
    if (!target) return;

    const state = { frame: 0, hash, target, timers: [] };
    hashAlignment = state;
    [0, 80, 220, 500, 900, 1500, 2300].forEach((delay) => {
      state.timers.push(setTimeout(alignPendingHash, delay));
    });
    state.timers.push(setTimeout(() => {
      if (hashAlignment === state) stopHashAlignment();
    }, 2500));
    alignPendingHash();
  };

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
        || !(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    if (!link) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin
        || destination.pathname !== window.location.pathname
        || destination.search !== window.location.search
        || !destination.hash
        || !targetForHash(destination.hash)) return;
    requestAnimationFrame(() => beginHashAlignment(destination.hash));
  });
  window.addEventListener("hashchange", () => beginHashAlignment());
  window.addEventListener("load", alignPendingHash, { once: true });
  window.addEventListener("schiffer:applet-layout", alignPendingHash);
  document.fonts?.ready.then(alignPendingHash);
  if ("ResizeObserver" in window) {
    const hashLayoutObserver = new ResizeObserver(alignPendingHash);
    hashLayoutObserver.observe(main);
  }

  ["pointerdown", "touchstart", "wheel"].forEach((eventName) => {
    window.addEventListener(eventName, stopHashAlignment, { passive: true });
  });
  window.addEventListener("keydown", (event) => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) {
      stopHashAlignment();
    }
  });
  if (window.location.hash) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => beginHashAlignment(), { once: true });
    } else {
      beginHashAlignment();
    }
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

  const numberGlobally = (selector, attribute, kind, prefix) => {
    let counter = 0;
    main.querySelectorAll(selector).forEach((element) => {
      if (!isEditoriallyVisible(element)) return;
      counter += 1;
      const number = String(counter);
      const label = element.getAttribute(attribute);
      element.dataset.number = number;
      register(label, {
        kind,
        number,
        text: `${prefix} ${number}`,
        shortText: number,
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

  // Figures form one sequence throughout the exposition.  This also covers
  // marginal figures: placement is a layout decision, not a second numbering
  // system.  Equations retain section-local numbers above.
  numberGlobally("figure[data-figure]", "data-figure", "figure", "Figure");
  main.querySelectorAll("figure[data-figure]").forEach((figure) => {
    if (!isEditoriallyVisible(figure)) return;
    const caption = figure.querySelector(":scope > figcaption");
    if (!caption) return;
    const label = document.createElement("span");
    label.className = "figure-label";
    label.textContent = `Figure ${figure.dataset.number}. `;
    caption.prepend(label);
    if (figure.dataset.evidence) {
      const evidence = document.createElement("span");
      evidence.className = "figure-evidence-label";
      evidence.textContent = figure.dataset.evidence;
      label.after(evidence);
    }
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
