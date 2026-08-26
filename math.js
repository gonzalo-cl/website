(() => {
  "use strict";

  if (typeof window.renderMathInElement !== "function") return;

  const sharedOptions = {
    throwOnError: false,
    strict: "warn",
  };

  window.renderMathInElement(document.body, {
    ...sharedOptions,
    delimiters: [{ left: "\\(", right: "\\)", display: false }],
  });

  window.renderMathInElement(document.body, {
    ...sharedOptions,
    delimiters: [{ left: "\\[", right: "\\]", display: true }],
  });
})();
