(() => {
  "use strict";

  /*
   * Canvas renderers measure their visual wrapper, never the page or the
   * control rail. This coordinator handles the other half of that contract:
   * it emits one batched resize only after those wrappers have reached a
   * stable layout. It covers cold loads, restored pages, late web fonts and
   * responsive transitions without teaching content-specific applets about
   * the page shell.
   */
  const visualSelector = [
    ".interactive-plate > section",
    ".measurement-panel",
    ".membrane-stage",
    ".phase-family-canvas-wrap",
    ".collar-field-canvas-wrap",
    ".abundance-canvas-wrap",
  ].join(",");

  let lastSignature = "";
  let frame = 0;
  let settleTimer = 0;
  const compactApparatus = window.matchMedia("(max-width: 620px)");
  let syncingDisclosures = false;

  /* Every paper control uses the same progress custom property.  Keeping
     this here, beside responsive applet coordination, means an applet author
     only supplies semantic min/max/value attributes; the red track cannot
     silently drift away from its thumb. */
  const syncRangeProgress = (input) => {
    if (!(input instanceof HTMLInputElement) || input.type !== "range") return;
    const minimum = input.min === "" ? 0 : Number(input.min);
    const maximum = input.max === "" ? 100 : Number(input.max);
    const value = Number(input.value);
    if (![minimum, maximum, value].every(Number.isFinite) || maximum <= minimum) return;
    const fraction = Math.max(0, Math.min(1, (value - minimum) / (maximum - minimum)));
    input.style.setProperty("--value", `${(fraction * 100).toFixed(3)}%`);
  };

  const syncRangeControls = () => {
    document.querySelectorAll('input[type="range"]').forEach(syncRangeProgress);
  };

  const syncMobileDisclosures = () => {
    syncingDisclosures = true;
    document.querySelectorAll("details[data-mobile-disclosure]").forEach((details) => {
      if (compactApparatus.matches) {
        details.open = details.dataset.mobileOpen === "true";
      } else {
        details.open = true;
      }
    });
    requestAnimationFrame(() => { syncingDisclosures = false; });
  };

  const prepareMobileDisclosures = () => {
    document.querySelectorAll("details[data-mobile-disclosure]").forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!compactApparatus.matches || syncingDisclosures) return;
        details.dataset.mobileOpen = String(details.open);
        settle();
      });
    });
    syncMobileDisclosures();
    compactApparatus.addEventListener?.("change", () => {
      syncMobileDisclosures();
      settle();
    });
  };

  const preparePanelCarousels = () => {
    document.querySelectorAll(".collar-field-visual[tabindex]").forEach((carousel) => {
      carousel.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        if (carousel.scrollWidth <= carousel.clientWidth + 1) return;
        event.preventDefault();
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const left = event.key === "Home"
          ? 0
          : event.key === "End"
            ? carousel.scrollWidth
            : carousel.scrollLeft + (event.key === "ArrowRight" ? 1 : -1) * carousel.clientWidth * .88;
        carousel.scrollTo({ left, behavior: reducedMotion ? "auto" : "smooth" });
      });
    });
  };

  const signature = () => [...document.querySelectorAll(visualSelector)]
    .filter((element) => element.getClientRects().length)
    .map((element) => {
      const box = element.getBoundingClientRect();
      return Math.round(box.width * 10) + "/" + Math.round(box.height * 10);
    })
    .join("|");

  const emitStableLayout = (force = false) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const nextSignature = signature();
        if (!force && nextSignature === lastSignature) return;
        lastSignature = nextSignature;
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new CustomEvent("schiffer:applet-layout", {
          detail: { signature: nextSignature },
        }));
      });
    });
  };

  const settle = () => {
    emitStableLayout(true);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => emitStableLayout(), 180);
  };

  const start = () => {
    syncRangeControls();
    prepareMobileDisclosures();
    preparePanelCarousels();
    const targets = [...document.querySelectorAll(visualSelector)];
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => emitStableLayout());
      targets.forEach((target) => observer.observe(target));
    }
    settle();
    setTimeout(settle, 500);
    if (document.fonts?.ready) document.fonts.ready.then(settle);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("load", settle, { once: true });
  window.addEventListener("pageshow", settle);
  window.addEventListener("orientationchange", settle);
  document.addEventListener("input", (event) => syncRangeProgress(event.target));
  document.addEventListener("change", (event) => syncRangeProgress(event.target));
})();
