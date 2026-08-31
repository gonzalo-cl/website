(() => {
  "use strict";

  /* Stable permalinks belong to document structure, not to the interactive
     figures.  Figure numbering already supplies its own linked label; this
     helper only adds unobtrusive anchors to titled sections and statements. */
  const addObjectPermalinks = () => {
    document.querySelectorAll(".section-heading[data-title]").forEach((heading) => {
      const target = heading.id ? heading : heading.closest("[id]");
      if (!target?.id || heading.querySelector(":scope > .object-permalink")) return;
      const link = document.createElement("a");
      link.className = "object-permalink";
      link.href = "#" + target.id;
      link.textContent = "¶";
      link.setAttribute("aria-label", "Permalink to " + heading.dataset.title);
      heading.append(link);
    });

    document.querySelectorAll(".math-statement[id]").forEach((statement) => {
      const header = statement.querySelector(":scope > .math-statement-header");
      if (!header || header.querySelector(".object-permalink")) return;
      const link = document.createElement("a");
      link.className = "object-permalink";
      link.href = "#" + statement.id;
      link.textContent = "¶";
      link.setAttribute("aria-label", "Permalink to " + header.textContent.trim());
      header.append(link);
    });
  };

  addObjectPermalinks();
})();
