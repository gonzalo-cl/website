(() => {
  "use strict";

  const controlSelector = "[data-proof-route][data-proof-target]";

  const idFromReference = (reference) => {
    const value = String(reference || "").trim().replace(/^#/, "");
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  };

  const targetFromHash = (hash = window.location.hash) => {
    const id = idFromReference(hash);
    return id ? document.getElementById(id) : null;
  };

  const start = () => {
    const controls = Array.from(document.querySelectorAll(controlSelector));
    const routes = new Map();
    const claimedTargets = new Set();

    controls.forEach((control) => {
      const route = control.dataset.proofRoute?.trim();
      const targetId = idFromReference(control.dataset.proofTarget);
      const target = targetId ? document.getElementById(targetId) : null;
      if (!route || !target) return;

      const existing = routes.get(route);
      if (existing) {
        if (existing.target === target) existing.controls.push(control);
        return;
      }
      if (claimedTargets.has(target)) return;

      claimedTargets.add(target);
      routes.set(route, { controls: [control], route, target });
    });

    if (!routes.size) return;

    const records = Array.from(routes.values());
    let activeRoute = null;

    const setControlState = (control, selected, targetId) => {
      control.setAttribute("aria-controls", targetId);
      if (control.matches("a[href]")) {
        control.removeAttribute("aria-pressed");
        if (selected) control.setAttribute("aria-current", "location");
        else control.removeAttribute("aria-current");
      } else {
        control.setAttribute("aria-pressed", String(selected));
        control.removeAttribute("aria-current");
      }
    };

    const syncControls = () => {
      records.forEach((record) => {
        record.controls.forEach((control) => {
          setControlState(control, record.route === activeRoute, record.target.id);
        });
      });
    };

    /* Until a route is actually chosen, retain the complete linear document.
       This also keeps section discovery and no-JavaScript reading independent
       of the selector. */
    records.forEach(({ target }) => {
      target.hidden = false;
      target.removeAttribute("aria-hidden");
    });
    syncControls();

    const selectRoute = (route, source) => {
      const selected = routes.get(route);
      if (!selected) return false;

      const previousRoute = activeRoute;
      let layoutChanged = previousRoute !== route;
      activeRoute = route;

      records.forEach((record) => {
        const hidden = record !== selected;
        if (record.target.hidden !== hidden) layoutChanged = true;
        record.target.hidden = hidden;
        if (hidden) record.target.setAttribute("aria-hidden", "true");
        else record.target.removeAttribute("aria-hidden");
      });
      syncControls();

      if (layoutChanged) {
        document.dispatchEvent(new CustomEvent("schiffer:proof-route-change", {
          detail: {
            previousRoute,
            route,
            source,
            targetId: selected.target.id,
          },
        }));
      }
      return true;
    };

    const recordForTarget = (target) => records.find((record) => (
      record.target === target || record.target.contains(target)
    )) || null;

    const selectTarget = (target, source) => {
      const record = target ? recordForTarget(target) : null;
      return record ? selectRoute(record.route, source) : false;
    };

    const sameDocumentTarget = (link) => {
      let destination;
      try {
        destination = new URL(link.href, window.location.href);
      } catch {
        return null;
      }
      if (destination.origin !== window.location.origin
          || destination.pathname !== window.location.pathname
          || destination.search !== window.location.search
          || !destination.hash) return null;
      return targetFromHash(destination.hash);
    };

    /* Capture link activation so a hidden destination becomes measurable
       before the browser and the document navigation perform fragment
       alignment. This covers the chapter banner as well as ordinary xrefs. */
    document.addEventListener("click", (event) => {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const control = event.target.closest(controlSelector);
      if (control && !control.matches(":disabled")) {
        const isModifiedLink = control.matches("a[href]")
          && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
        if (!isModifiedLink && selectRoute(control.dataset.proofRoute?.trim(), "control")) return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest("a[href]");
      if (link) selectTarget(sameDocumentTarget(link), "link");
    }, true);

    window.addEventListener("hashchange", () => {
      selectTarget(targetFromHash(), "hash");
    });

    selectTarget(targetFromHash(), "initial-hash");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
