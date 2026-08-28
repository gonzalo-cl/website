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
})();
