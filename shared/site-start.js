(() => {
  "use strict";

  const colors = Object.freeze({
    heading: "#162831",
    text: "#31434b",
    muted: "#607178",
    accent: "#075760",
    accentLight: "#dce9e7",
    soft: "#f3f7f6",
    rule: "#d4dfdc",
    ruleDark: "#aebfbb",
    white: "#ffffff",
  });

  const prepareCanvas = (canvas, minimumHeight = 300) => {
    const rectangle = canvas.getBoundingClientRect();
    const width = Math.max(280, Math.round(rectangle.width));
    const height = Math.max(minimumHeight, Math.round(rectangle.height));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.lineCap = "round";
    context.lineJoin = "round";
    return { context, width, height };
  };

  const observeCanvas = (canvas, draw) => {
    if (!canvas) return;
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => draw());
      observer.observe(canvas);
    } else {
      window.addEventListener("resize", draw, { passive: true });
    }
  };

  const drawLabel = (context, text, x, y, options = {}) => {
    context.fillStyle = options.color || colors.muted;
    context.font = `${options.weight || 600} ${options.size || 12}px Aptos, Segoe UI, Arial, sans-serif`;
    context.textAlign = options.align || "left";
    context.textBaseline = options.baseline || "alphabetic";
    context.fillText(text, x, y);
  };

