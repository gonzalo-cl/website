(() => {
  "use strict";

  const colors = Object.freeze({
    heading: "#111111",
    text: "#26241f",
    muted: "#666158",
    accent: "#a00000",
    accentLight: "#f7f4e9",
    teal: "#075760",
    tealLight: "rgba(7, 87, 96, .10)",
    gold: "#9a6400",
    blue: "#526f86",
    soft: "#ece8dc",
    rule: "rgba(17, 17, 17, .16)",
    ruleDark: "rgba(17, 17, 17, .34)",
    white: "#fffff8",
  });

  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
  let vectorDefinitionSerial = 0;
  const setMath = (elementOrSelector, source, options) => window.SchifferMath?.render(elementOrSelector, source, options);
  const setInlineMathContent = (elementOrSelector, content, options) => (
    window.SchifferMath?.renderInlineContent(elementOrSelector, content, options)
  );

  const createSvgNode = (name, attributes = {}) => {
    const node = document.createElementNS(SVG_NAMESPACE, name);
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") node.setAttribute(key, String(value));
    });
    return node;
  };

  const createVectorContext = (svg) => {
    const definitions = createSvgNode("defs");
    svg.appendChild(definitions);
    let state = {
      fillStyle: "#000000",
      strokeStyle: "#000000",
      lineWidth: 1,
      lineCap: "butt",
      lineJoin: "miter",
      lineDash: [],
      globalAlpha: 1,
      font: "14px sans-serif",
      textAlign: "left",
      textBaseline: "alphabetic",
      clipId: null,
    };
    const savedStates = [];
    let pathCommands = [];
    let pathRevision = 0;
    let hasCurrentPoint = false;
    let lastPaint = null;

    const paintValue = (paint) => paint && paint.vectorPaint ? paint.vectorPaint : paint;
    const applyClipAndOpacity = (node) => {
      if (state.clipId) node.setAttribute("clip-path", `url(#${state.clipId})`);
      if (state.globalAlpha < 1) node.setAttribute("opacity", String(state.globalAlpha));
    };
    const applyStroke = (node) => {
      node.setAttribute("stroke", paintValue(state.strokeStyle));
      node.setAttribute("stroke-width", String(state.lineWidth));
      node.setAttribute("stroke-linecap", state.lineCap);
      node.setAttribute("stroke-linejoin", state.lineJoin);
      if (state.lineDash.length) node.setAttribute("stroke-dasharray", state.lineDash.join(" "));
    };
    const applyFill = (node) => node.setAttribute("fill", paintValue(state.fillStyle));
    const markPathChanged = () => {
      pathRevision += 1;
      lastPaint = null;
    };
    const currentPath = () => pathCommands.join(" ");
    const appendPaintedPath = (kind) => {
      const pathData = currentPath();
      if (!pathData) return;
      if (
        lastPaint
        && lastPaint.revision === pathRevision
        && lastPaint.alpha === state.globalAlpha
        && lastPaint.clipId === state.clipId
        && lastPaint.kind !== kind
      ) {
        if (kind === "fill") applyFill(lastPaint.node);
        else applyStroke(lastPaint.node);
        lastPaint.kind = "both";
        return;
      }
      const node = createSvgNode("path", { d: pathData });
      if (kind === "fill") {
        applyFill(node);
        node.setAttribute("stroke", "none");
      } else {
        node.setAttribute("fill", "none");
        applyStroke(node);
      }
      applyClipAndOpacity(node);
      svg.appendChild(node);
      lastPaint = {
        node,
        kind,
        revision: pathRevision,
        alpha: state.globalAlpha,
        clipId: state.clipId,
      };
    };

    const context = {
      canvas: svg,
      beginPath() {
        pathCommands = [];
        hasCurrentPoint = false;
        markPathChanged();
      },
      moveTo(x, y) {
        pathCommands.push(`M ${x} ${y}`);
        hasCurrentPoint = true;
        markPathChanged();
      },
      lineTo(x, y) {
        pathCommands.push(`${hasCurrentPoint ? "L" : "M"} ${x} ${y}`);
        hasCurrentPoint = true;
        markPathChanged();
      },
      arc(x, y, radius, startAngle, endAngle, anticlockwise = false) {
        const span = Math.abs(endAngle - startAngle);
        const startX = x + radius * Math.cos(startAngle);
        const startY = y + radius * Math.sin(startAngle);
        if (span >= Math.PI * 2 - 1e-6) {
          pathCommands.push(`${hasCurrentPoint ? "L" : "M"} ${startX} ${startY}`);
          pathCommands.push(`A ${radius} ${radius} 0 1 ${anticlockwise ? 0 : 1} ${x - radius * Math.cos(startAngle)} ${y - radius * Math.sin(startAngle)}`);
          pathCommands.push(`A ${radius} ${radius} 0 1 ${anticlockwise ? 0 : 1} ${startX} ${startY}`);
        } else {
          const endX = x + radius * Math.cos(endAngle);
          const endY = y + radius * Math.sin(endAngle);
          pathCommands.push(`${hasCurrentPoint ? "L" : "M"} ${startX} ${startY}`);
          pathCommands.push(`A ${radius} ${radius} 0 ${span > Math.PI ? 1 : 0} ${anticlockwise ? 0 : 1} ${endX} ${endY}`);
        }
        hasCurrentPoint = true;
        markPathChanged();
      },
      rect(x, y, width, height) {
        pathCommands.push(`M ${x} ${y} h ${width} v ${height} h ${-width} Z`);
        hasCurrentPoint = true;
        markPathChanged();
      },
      closePath() {
        pathCommands.push("Z");
        markPathChanged();
      },
      fill() { appendPaintedPath("fill"); },
      stroke() { appendPaintedPath("stroke"); },
      fillRect(x, y, width, height) {
        const node = createSvgNode("rect", { x, y, width, height });
        applyFill(node);
        node.setAttribute("stroke", "none");
        applyClipAndOpacity(node);
        svg.appendChild(node);
        lastPaint = null;
      },
      strokeRect(x, y, width, height) {
        const node = createSvgNode("rect", { x, y, width, height, fill: "none" });
        applyStroke(node);
        applyClipAndOpacity(node);
        svg.appendChild(node);
        lastPaint = null;
      },
      clearRect() {},
      fillText(text, x, y) {
        const anchor = state.textAlign === "center"
          ? "middle"
          : state.textAlign === "right" || state.textAlign === "end" ? "end" : "start";
        const baseline = state.textBaseline === "middle"
          ? "central"
          : state.textBaseline === "top" || state.textBaseline === "hanging" ? "hanging"
            : state.textBaseline === "bottom" ? "text-after-edge" : "alphabetic";
        const node = createSvgNode("text", {
          x,
          y,
          fill: paintValue(state.fillStyle),
          "text-anchor": anchor,
          "dominant-baseline": baseline,
          style: `font: ${state.font};`,
        });
        node.textContent = String(text);
        applyClipAndOpacity(node);
        svg.appendChild(node);
        lastPaint = null;
      },
      measureText(text) { return { width: String(text).length * 7 }; },
      setLineDash(values) { state.lineDash = Array.from(values || []); },
      save() { savedStates.push({ ...state, lineDash: state.lineDash.slice() }); },
      restore() {
        if (savedStates.length) state = savedStates.pop();
        lastPaint = null;
      },
      clip() {
        const clipId = `computer-vector-clip-${vectorDefinitionSerial += 1}`;
        const clipPath = createSvgNode("clipPath", { id: clipId, clipPathUnits: "userSpaceOnUse" });
        clipPath.appendChild(createSvgNode("path", { d: currentPath() }));
        definitions.appendChild(clipPath);
        state.clipId = clipId;
        lastPaint = null;
      },
      createRadialGradient(x0, y0, radius0, x1, y1, radius1) {
        const gradientId = `computer-vector-gradient-${vectorDefinitionSerial += 1}`;
        const gradient = createSvgNode("radialGradient", {
          id: gradientId,
          gradientUnits: "userSpaceOnUse",
          cx: x1,
          cy: y1,
          r: radius1,
          fx: x0,
          fy: y0,
          fr: radius0,
        });
        definitions.appendChild(gradient);
        return {
          vectorPaint: `url(#${gradientId})`,
          addColorStop(offset, color) {
            gradient.appendChild(createSvgNode("stop", {
              offset: `${clamp(Number(offset), 0, 1) * 100}%`,
              "stop-color": color,
            }));
          },
        };
      },
      setTransform() {},
    };

    [
      "fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin",
      "globalAlpha", "font", "textAlign", "textBaseline",
    ].forEach((property) => {
      Object.defineProperty(context, property, {
        get() { return state[property]; },
        set(value) { state[property] = value; },
      });
    });
    return context;
  };

  const prepareCanvas = (canvas, options = {}) => {
    const rectangle = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rectangle.width));
    const height = Math.max(1, Math.round(rectangle.height));
    if (canvas.namespaceURI === SVG_NAMESPACE || String(canvas.tagName).toLowerCase() === "svg") {
      canvas.setAttribute("viewBox", `0 0 ${width} ${height}`);
      canvas.setAttribute("preserveAspectRatio", "xMidYMid meet");
      canvas.replaceChildren();
      const context = createVectorContext(canvas);
      context.lineCap = "round";
      context.lineJoin = "round";
      return { context, width, height };
    }
    const maximumRatio = typeof options === "object"
      ? Math.max(1, Number(options.maxPixelRatio) || 2)
      : 2;
    const ratio = Math.min(window.devicePixelRatio || 1, maximumRatio);
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

  const computerProofFigureIds = new Set([
    "searchCanvas",
    "boundaryCanvas",
    "pullbackCanvas",
    "inverseCanvas",
    "tailCanvas",
    "certificateCanvas",
    "reconstructionCanvas",
  ]);

  const drawInlineMathLabel = (context, content, x, y, options, size) => {
    const svg = context.canvas;
    if (!svg || (svg.namespaceURI !== SVG_NAMESPACE && String(svg.tagName).toLowerCase() !== "svg")) return false;
    const viewBoxWidth = Number(svg.viewBox?.baseVal?.width)
      || Number(svg.getAttribute("width"))
      || svg.getBoundingClientRect().width;
    const viewBoxHeight = Number(svg.viewBox?.baseVal?.height)
      || Number(svg.getAttribute("height"))
      || svg.getBoundingClientRect().height;
    const align = options.align || "left";
    const baseline = options.baseline || "alphabetic";
    const horizontalPadding = 3;
    let left = horizontalPadding;
    let width = Math.max(1, x - horizontalPadding);
    let justifyContent = "flex-end";
    if (align === "center") {
      width = Math.max(1, 2 * Math.min(x - horizontalPadding, viewBoxWidth - x - horizontalPadding));
      left = x - width / 2;
      justifyContent = "center";
    } else if (align !== "right" && align !== "end") {
      left = x;
      width = Math.max(1, viewBoxWidth - x - horizontalPadding);
      justifyContent = "flex-start";
    }
    const height = Math.max(24, size * 1.8);
    let top = y - size * 1.28;
    if (baseline === "middle") top = y - height / 2;
    else if (baseline === "top" || baseline === "hanging") top = y;
    else if (baseline === "bottom") top = y - height;
    top = clamp(top, 0, Math.max(0, viewBoxHeight - height));

    const foreignObject = createSvgNode("foreignObject", {
      x: left,
      y: top,
      width,
      height,
      "aria-hidden": "true",
    });
    const label = document.createElementNS(XHTML_NAMESPACE, "div");
    label.className = "figure-inline-math-label";
    label.style.color = options.color || colors.muted;
    label.style.fontSize = `${size}px`;
    label.style.fontWeight = String(options.weight || 400);
    label.style.justifyContent = justifyContent;
    // Whitespace-only text nodes beside KaTeX become anonymous flex items and
    // can collapse to zero width. Preserve word boundaries in mixed prose/math
    // figure labels without changing spacing inside the TeX expression.
    const spacedContent = String(content)
      .replace(/ (\\\()/g, "\u00a0$1")
      .replace(/(\\\)) /g, "$1\u00a0");
    label.textContent = spacedContent;
    foreignObject.appendChild(label);
    svg.appendChild(foreignObject);
    setInlineMathContent(label, spacedContent, { serif: true });
    return true;
  };

  const drawLabel = (context, text, x, y, options = {}) => {
    const displayText = String(text).replace(/^([a-z])/, (letter) => letter.toUpperCase());
    const requestedSize = Number(options.size ?? 12);
    const size = computerProofFigureIds.has(context.canvas?.id)
      ? Math.max(16, requestedSize)
      : Math.max(14, requestedSize);
    if (displayText.includes("\\(") && drawInlineMathLabel(context, displayText, x, y, options, size)) return;
    context.fillStyle = options.color || colors.muted;
    context.font = `${options.weight || 400} ${size}px et-book, Palatino, Georgia, serif`;
    context.textAlign = options.align || "left";
    context.textBaseline = options.baseline || "alphabetic";
    context.fillText(displayText, x, y);
  };

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const mix = (left, right, amount) => left + (right - left) * amount;
  const directChoiceButtons = (group) => Array.from(group?.querySelectorAll("button[data-control-value]") || []);
  const syncDirectChoice = (buttons, value) => {
    const selectedValue = String(value);
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.controlValue === selectedValue));
    });
  };

  const formatScientificLatex = (value, digits = 5) => {
    if (value === 0) return "0";
    const [mantissa, exponent] = value.toExponential(digits).split("e");
    return `${Number(mantissa).toFixed(digits)}\\times 10^{${Number(exponent)}}`;
  };

  const drawArrow = (context, fromX, fromY, toX, toY, options = {}) => {
    const color = options.color || colors.accent;
    const head = options.head || 7;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = options.width || 1.5;
    if (options.dashed) context.setLineDash([5, 4]);
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.moveTo(toX, toY);
    context.lineTo(toX - head * Math.cos(angle - Math.PI / 6), toY - head * Math.sin(angle - Math.PI / 6));
    context.lineTo(toX - head * Math.cos(angle + Math.PI / 6), toY - head * Math.sin(angle + Math.PI / 6));
    context.closePath();
    context.fill();
    context.restore();
  };

  const drawOutlinedFilledArrow = (context, fromX, fromY, toX, toY, options = {}) => {
    const deltaX = toX - fromX;
    const deltaY = toY - fromY;
    const length = Math.hypot(deltaX, deltaY);
    if (length < 8) return;
    const unitX = deltaX / length;
    const unitY = deltaY / length;
    const normalX = -unitY;
    const normalY = unitX;
    const shaftHalfWidth = options.shaftHalfWidth ?? Math.min(5, length * .16);
    const headHalfWidth = options.headHalfWidth ?? Math.min(12, length * .28);
    const headLength = Math.min(options.headLength || 15, length * .42);
    const neckX = toX - unitX * headLength;
    const neckY = toY - unitY * headLength;
    const point = (x, y, normalAmount = 0) => [
      x + normalX * normalAmount,
      y + normalY * normalAmount,
    ];
    const points = [
      point(fromX, fromY, shaftHalfWidth),
      point(neckX, neckY, shaftHalfWidth),
      point(neckX, neckY, headHalfWidth),
      [toX, toY],
      point(neckX, neckY, -headHalfWidth),
      point(neckX, neckY, -shaftHalfWidth),
      point(fromX, fromY, -shaftHalfWidth),
    ];
    context.save();
    context.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = options.fill || colors.white;
    context.strokeStyle = options.stroke || colors.heading;
    context.lineWidth = options.lineWidth || 1.5;
    context.lineJoin = "miter";
    context.fill();
    context.stroke();
    context.restore();
  };

  const drawCanvasBackdrop = (context, width, height) => {
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
  };

  const normalizedConformalCoefficients = Object.freeze([
    3.45993909539293071e-2, 7.08236502050214939e-3, 2.50705956641803957e-3,
    6.93948928139134676e-4, 1.83066145144108530e-4, 4.93110147154087685e-5,
    1.33365835762374103e-5, 3.59790219332492309e-6, 9.70097629016086860e-7,
    2.61611115140099447e-7, 7.05498360731142801e-8, 1.90244647781425720e-8,
    5.13001648604403633e-9, 1.38331266392794131e-9, 3.73007789472939829e-10,
    1.00580141956778009e-10, 2.71209103797679345e-11, 7.31298257374402000e-12,
    1.97189350672022161e-12, 5.31705692214804718e-13, 1.43370010786208251e-13,
    3.86584688288974752e-14, 1.04239046502248357e-14, 2.81070820997317911e-15,
    7.57880483544390930e-16, 2.04355050980853056e-16, 5.51023056201182833e-17,
    1.48577808461285380e-17, 4.00624901775871598e-18, 1.08024378156699135e-18,
  ]);

  const boundaryCanvas = document.getElementById("boundaryCanvas");
  const boundaryModes = document.getElementById("boundaryModes");
  const boundaryModesValue = document.getElementById("boundaryModesValue");

  const boundaryPoint = (theta, cutoff) => {
    let x = Math.cos(theta);
    let y = Math.sin(theta);
    for (let index = 0; index < cutoff; index += 1) {
      const frequency = 10 * (index + 1) + 1;
      const coefficient = normalizedConformalCoefficients[index];
      x += coefficient * Math.cos(frequency * theta);
      y += coefficient * Math.sin(frequency * theta);
    }
    return { x, y, radius: Math.hypot(x, y) };
  };

  const conformalPoint = (radius, theta, cutoff = 30, amplitude = 1) => {
    let x = radius * Math.cos(theta);
    let y = radius * Math.sin(theta);
    for (let index = 0; index < cutoff; index += 1) {
      const frequency = 10 * (index + 1) + 1;
      const coefficient = amplitude * normalizedConformalCoefficients[index] * radius ** frequency;
      x += coefficient * Math.cos(frequency * theta);
      y += coefficient * Math.sin(frequency * theta);
    }
    return { x, y };
  };

  const conformalDerivative = (radius, theta, cutoff = 30) => {
    let real = 1;
    let imaginary = 0;
    for (let index = 0; index < cutoff; index += 1) {
      const exponent = 10 * (index + 1);
      const coefficient = normalizedConformalCoefficients[index] * (exponent + 1) * radius ** exponent;
      real += coefficient * Math.cos(exponent * theta);
      imaginary += coefficient * Math.sin(exponent * theta);
    }
    return { real, imaginary, magnitude: Math.hypot(real, imaginary) };
  };

  const traceBoundary = (context, centerX, centerY, scale, cutoff) => {
    context.beginPath();
    for (let index = 0; index <= 900; index += 1) {
      const point = boundaryPoint(index / 900 * Math.PI * 2, cutoff);
      const x = centerX + point.x * scale;
      const y = centerY - point.y * scale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  };

  const drawBoundary = () => {
    if (!boundaryCanvas) return;
    const rectangle = boundaryCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const cutoff = Math.max(1, Math.min(30, Number(boundaryModes?.value || 30)));
    const { context, width, height } = prepareCanvas(boundaryCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);

    const compact = width < 520;
    const domain = compact
      ? { x: 22, y: 30, width: width - 44, height: height * .48 }
      : { x: 14, y: 30, width: width * .50, height: height - 56 };
    const plot = compact
      ? { x: 43, y: height * .59, width: width - 68, height: height * .34 }
      : { x: width * .56, y: 35, width: width * .40, height: height - 68 };
    const centerX = domain.x + domain.width / 2;
    const centerY = domain.y + domain.height / 2 + 6;
    const scale = Math.min(domain.width, domain.height) * .43 / 1.075;

    drawLabel(context, `Boundary from \\(q_1^\\circ,\\ldots,q_{${cutoff}}^\\circ\\)`, centerX, domain.y - 8, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });

    context.beginPath();
    context.arc(centerX, centerY, scale, 0, Math.PI * 2);
    context.setLineDash([5, 5]);
    context.strokeStyle = colors.ruleDark;
    context.stroke();
    context.setLineDash([]);

    let minimumRadius = Number.POSITIVE_INFINITY;
    let maximumRadius = 0;
    for (let index = 0; index <= 1200; index += 1) {
      const point = boundaryPoint(index / 1200 * Math.PI * 2, cutoff);
      minimumRadius = Math.min(minimumRadius, point.radius);
      maximumRadius = Math.max(maximumRadius, point.radius);
    }

    traceBoundary(context, centerX, centerY, scale, cutoff);
    context.fillStyle = "rgba(7, 87, 96, .07)";
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.3;
    context.stroke();

    drawLabel(context, "Normalized map coefficients \\(|q_j^\\circ|\\)", plot.x, plot.y, {
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    const selectedCoefficient = normalizedConformalCoefficients[cutoff - 1];
    const selectedCoefficientLabel = compact || plot.width < 280
      ? `\\(|q_{${cutoff}}^\\circ|=${formatScientificLatex(selectedCoefficient, 2)}\\)`
      : `\\(|q_{${cutoff}}^\\circ|=${formatScientificLatex(selectedCoefficient, 2)}\\), ${10 * cutoff}-fold correction`;
    drawLabel(
      context,
      selectedCoefficientLabel,
      plot.x,
      plot.y + 18,
      { color: colors.muted, size: compact ? 12 : 14 },
    );

    const chart = {
      x: plot.x + 38,
      y: plot.y + 34,
      width: plot.width - 46,
      height: plot.height - 62,
    };
    const maximumLog = -1;
    const minimumLog = -19;
    const projectCoefficient = (index) => chart.x + index / 29 * chart.width;
    const projectLog = (value) => chart.y + (maximumLog - value) / (maximumLog - minimumLog) * chart.height;
    const exponentTicks = [-2, -6, -10, -14, -18];
    exponentTicks.forEach((exponent) => {
      const y = projectLog(exponent);
      context.strokeStyle = colors.rule;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(chart.x, y);
      context.lineTo(chart.x + chart.width, y);
      context.stroke();
      drawLabel(context, `\\(10^{${exponent}}\\)`, chart.x - 7, y + 4, {
        align: "right",
        color: colors.muted,
        size: compact ? 12 : 14,
      });
    });
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(chart.x, chart.y);
    context.lineTo(chart.x, chart.y + chart.height);
    context.lineTo(chart.x + chart.width, chart.y + chart.height);
    context.stroke();

    const coefficientLogs = normalizedConformalCoefficients.map((coefficient) => Math.log10(coefficient));
    context.beginPath();
    coefficientLogs.forEach((value, index) => {
      const x = projectCoefficient(index);
      const y = projectLog(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.2;
    context.stroke();

    if (cutoff > 1) {
      context.beginPath();
      coefficientLogs.slice(0, cutoff).forEach((value, index) => {
        const x = projectCoefficient(index);
        const y = projectLog(value);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = colors.accent;
      context.lineWidth = 2;
      context.stroke();
    }

    coefficientLogs.forEach((value, index) => {
      context.beginPath();
      context.arc(projectCoefficient(index), projectLog(value), index === cutoff - 1 ? 4 : 1.8, 0, Math.PI * 2);
      context.fillStyle = index < cutoff ? colors.accent : colors.ruleDark;
      context.fill();
    });
    const selectedX = projectCoefficient(cutoff - 1);
    const selectedY = projectLog(coefficientLogs[cutoff - 1]);
    context.beginPath();
    context.arc(selectedX, selectedY, 4, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 2;
    context.stroke();

    [1, 10, 20, 30].forEach((coefficientNumber) => {
      const x = projectCoefficient(coefficientNumber - 1);
      drawLabel(context, String(coefficientNumber), x, chart.y + chart.height + 17, {
        align: "center",
        color: colors.muted,
        size: 14,
      });
    });
    drawLabel(context, "normalized coefficient \\(j\\)", chart.x + chart.width / 2, chart.y + chart.height + 34, {
      align: "center",
      color: colors.muted,
      size: 14,
    });

    if (boundaryModesValue) boundaryModesValue.textContent = `${cutoff} of 30`;
    if (boundaryModes) boundaryModes.setAttribute("aria-valuetext", `${cutoff} of 30 normalized conformal-map coefficients q j circle`);
    boundaryCanvas.setAttribute(
      "aria-label",
      `Exploratory computation from finite numerical data. Tenfold conformal boundary using ${cutoff} of 30 normalized coefficients q j circle, compared with the dashed unit circle. The newest included coefficient has size ${selectedCoefficient.toExponential(3)} and adds a ${10 * cutoff}-fold correction. The certificate later controls the omitted infinite tail. Overall radial range ${minimumRadius.toFixed(6)} to ${maximumRadius.toFixed(6)}.`,
    );
  };

  if (boundaryModes) boundaryModes.addEventListener("input", drawBoundary);
  observeCanvas(boundaryCanvas, drawBoundary);
  requestAnimationFrame(drawBoundary);

  const searchCanvas = document.getElementById("searchCanvas");
  const searchStage = document.getElementById("searchStage");
  const searchStageButtons = directChoiceButtons(searchStage);
  const searchStageEquation = document.getElementById("searchStageEquation");
  const searchStageStatus = document.getElementById("searchStageStatus");
  const searchStages = Object.freeze([
    Object.freeze({
      label: "disk and radial field",
      title: "Start with a disk and its radial solution",
      equation: "u_0(r)=\\frac{J_0(\\mu r)}{J_0(\\mu)},\\qquad \\partial_r u_0(1)=c(\\mu).",
      statusMath: "The starting disk carries a radial Helmholtz field \\(u_0\\). We temporarily allow its normal derivative to be the nonzero constant \\(c(\\mu)\\).",
      aria: "The unit disk carries the radial field u zero. Concentric bands indicate that the field depends only on radius. Equal outward arrows indicate a constant, generally nonzero normal derivative c of mu.",
    }),
    Object.freeze({
      label: "change shape and field",
      title: "Two things change at first order",
      equation: "\\begin{aligned}r_\\varepsilon(\\theta)&=1+\\varepsilon h\\cos(10\\theta),\\\\u_\\varepsilon(r,\\theta)&=u_0(r)+\\varepsilon V(r,\\theta)+O(\\varepsilon^2),\\\\V(r,\\theta)&=aJ_{10}(\\mu r)\\cos(10\\theta).\\end{aligned}",
      statusMath: "The amplitude \\(h\\) moves the boundary. Independently, \\(V=\\left.\\partial_\\varepsilon u_\\varepsilon\\right|_{\\varepsilon=0}\\) is the initial change in the field. The boundary conditions couple them.",
      aria: "Two side-by-side disks separate the first-order changes. On the left, h cosine ten theta moves the circular boundary into a ten-lobed outline. On the right, V equals a times J ten of mu r times cosine ten theta changes the field while the reference disk remains fixed.",
    }),
    Object.freeze({
      label: "match both boundary traces",
      title: "Choose the two changes so their errors cancel",
      equation: "\\begin{pmatrix}J_{10}(\\mu)&u_0'(1)\\\\\\mu J_{10}'(\\mu)&u_0''(1)\\end{pmatrix}\\binom{a}{h}=0,\\qquad W_{1,10}(\\mu)=0.",
      statusMath: "The two rows enforce boundary value and boundary slope. At a Wronskian zero, the field-response and shape-response columns lie on the same line, so nonzero \\(a\\) and \\(h\\) can make both errors vanish.",
      aria: "A combined ten-lobed perturbation appears beside a response plane. The field-response arrow and shape-response arrow lie on the same line and point in opposite directions after scaling, showing that the two boundary errors can cancel when the Wronskian is zero.",
    }),
    Object.freeze({
      label: "continue to zero flux",
      title: "Use that tangent direction to find the centre",
      equation: "\\partial_\\nu u=c\\ne0\\quad\\longrightarrow\\quad c=0,\\qquad x^\\circ=(g^\\circ,p^\\circ).",
      statusMath: "The Wronskian supplies the initial tangent only. Numerical continuation then changes the field, shape, frequency, and \\(c\\), stopping when \\(c=0\\). That computed endpoint is \\(x^\\circ\\).",
      aria: "Three silhouettes show exploratory continuation from the relaxed disk with nonzero constant flux, through a schematic noncircular relaxed solution, to the stored tenfold numerical centre with zero flux. The later contraction proof validates an exact solution near this endpoint without using the continuation path.",
    }),
  ]);
  let selectedSearchStage = 0;

  const traceConformalBoundary = (context, centerX, centerY, scale, amplitude, options = {}) => {
    const cutoff = options.cutoff ?? 30;
    context.beginPath();
    for (let index = 0; index <= 900; index += 1) {
      const theta = index / 900 * Math.PI * 2;
      const point = conformalPoint(1, theta, cutoff, amplitude);
      const x = centerX + scale * point.x;
      const y = centerY - scale * point.y;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    if (options.fill) {
      context.fillStyle = options.fill;
      context.fill();
    }
    context.strokeStyle = options.stroke || colors.accent;
    context.lineWidth = options.lineWidth || 2;
    context.stroke();
  };

  const drawNormalDerivativeMarkers = (context, centerX, centerY, scale, amplitude, flux) => {
    const epsilon = .002;
    const arrowLength = 8 + 21 * flux;
    for (let index = 0; index < 10; index += 1) {
      const theta = index / 10 * Math.PI * 2;
      const point = conformalPoint(1, theta, 30, amplitude);
      const before = conformalPoint(1, theta - epsilon, 30, amplitude);
      const after = conformalPoint(1, theta + epsilon, 30, amplitude);
      const tangentX = after.x - before.x;
      const tangentY = after.y - before.y;
      const tangentLength = Math.max(1e-12, Math.hypot(tangentX, tangentY));
      const normalX = tangentY / tangentLength;
      const normalY = -tangentX / tangentLength;
      const boundaryX = centerX + point.x * scale;
      const boundaryY = centerY - point.y * scale;
      const canvasNormalX = normalX;
      const canvasNormalY = -normalY;
      if (flux > 0) {
        drawArrow(
          context,
          boundaryX + canvasNormalX * 3,
          boundaryY + canvasNormalY * 3,
          boundaryX + canvasNormalX * arrowLength,
          boundaryY + canvasNormalY * arrowLength,
          { color: colors.teal, width: 2.2, head: 6 },
        );
      } else {
        context.beginPath();
        context.arc(boundaryX, boundaryY, 3.2, 0, Math.PI * 2);
        context.fillStyle = colors.white;
        context.fill();
        context.strokeStyle = colors.teal;
        context.lineWidth = 2.2;
        context.stroke();
      }
    }
  };

  const tracePolarPerturbation = (context, centerX, centerY, radius, amplitude, options = {}) => {
    context.beginPath();
    for (let index = 0; index <= 480; index += 1) {
      const theta = index / 480 * Math.PI * 2;
      const localRadius = radius * (1 + amplitude * Math.cos(10 * theta));
      const x = centerX + localRadius * Math.cos(theta);
      const y = centerY - localRadius * Math.sin(theta);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    if (options.fill) {
      context.fillStyle = options.fill;
      context.fill();
    }
    context.strokeStyle = options.stroke || colors.accent;
    context.lineWidth = options.lineWidth || 2.4;
    context.stroke();
  };

  const drawReferenceCircle = (context, centerX, centerY, radius) => {
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.setLineDash([7, 6]);
    context.strokeStyle = "rgba(17, 17, 17, .48)";
    context.lineWidth = 1.8;
    context.stroke();
    context.setLineDash([]);
  };

  const drawRadialField = (context, centerX, centerY, radius) => {
    const fills = [
      "rgba(7, 87, 96, .18)",
      "rgba(160, 0, 0, .11)",
      "rgba(7, 87, 96, .14)",
      "rgba(160, 0, 0, .09)",
      "rgba(7, 87, 96, .12)",
      "rgba(160, 0, 0, .08)",
      "rgba(7, 87, 96, .10)",
    ];
    fills.forEach((fill, index) => {
      const bandRadius = radius * (1 - index / fills.length * .88);
      context.beginPath();
      context.arc(centerX, centerY, bandRadius, 0, Math.PI * 2);
      context.fillStyle = fill;
      context.fill();
    });
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.8;
    context.stroke();
  };

  const drawAngularFieldChange = (context, centerX, centerY, radius) => {
    const sectorCount = 20;
    const innerRadius = radius * .14;
    for (let sector = 0; sector < sectorCount; sector += 1) {
      const theta0 = sector / sectorCount * Math.PI * 2 - Math.PI / sectorCount / 2;
      const theta1 = (sector + 1) / sectorCount * Math.PI * 2 - Math.PI / sectorCount / 2;
      context.beginPath();
      for (let index = 0; index <= 10; index += 1) {
        const theta = mix(theta0, theta1, index / 10);
        const x = centerX + radius * Math.cos(theta);
        const y = centerY - radius * Math.sin(theta);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      for (let index = 10; index >= 0; index -= 1) {
        const theta = mix(theta0, theta1, index / 10);
        context.lineTo(
          centerX + innerRadius * Math.cos(theta),
          centerY - innerRadius * Math.sin(theta),
        );
      }
      context.closePath();
      context.fillStyle = sector % 2 === 0
        ? "rgba(160, 0, 0, .16)"
        : "rgba(7, 87, 96, .17)";
      context.fill();
    }
    context.beginPath();
    context.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = colors.teal;
    context.lineWidth = 2.6;
    context.stroke();
  };

  const drawSearchTitle = (context, width, title) => {
    drawLabel(context, title, width / 2, 32, {
      align: "center",
      color: colors.heading,
      size: 18,
      weight: 700,
    });
  };

  const drawDiskFieldStage = (context, width, height, compact) => {
    const centerX = width * .5;
    const centerY = height * .53;
    const radius = Math.min(width * (compact ? .25 : .205), height * .29);
    drawRadialField(context, centerX, centerY, radius);
    drawNormalDerivativeMarkers(context, centerX, centerY, radius, 0, .72);
    drawLabel(context, "Constant boundary values \\(u_0=1\\)", centerX, centerY - 10, {
      align: "center",
      color: colors.accent,
      size: 13,
      weight: 700,
    });
    drawLabel(context, "Constant slope \\(\\partial_\\nu u_0=c(\\mu)\\)", centerX, centerY + 20, {
      align: "center",
      color: colors.teal,
      size: 13,
      weight: 700,
    });
  };

  const drawSeparatePerturbationsStage = (context, width, height, compact) => {
    const radius = Math.min(width * (compact ? .16 : .145), height * .225);
    const leftX = width * .28;
    const rightX = width * .72;
    const centerY = height * .54;

    drawReferenceCircle(context, leftX, centerY, radius);
    tracePolarPerturbation(context, leftX, centerY, radius, .09, {
      fill: colors.tealLight,
      stroke: colors.accent,
      lineWidth: 2.8,
    });
    drawLabel(context, "SHAPE CHANGE", leftX, centerY - radius - 38, {
      align: "center",
      color: colors.accent,
      size: 11,
      weight: 700,
    });
    drawLabel(context, "\\(\\delta r=h\\cos(10\\theta)\\)", leftX, centerY + radius + 30, {
      align: "center",
      color: colors.accent,
      size: 12,
      weight: 700,
    });

    drawAngularFieldChange(context, rightX, centerY, radius);
    drawLabel(context, "FIELD CHANGE", rightX, centerY - radius - 38, {
      align: "center",
      color: colors.teal,
      size: 11,
      weight: 700,
    });
    drawLabel(context, "\\(\\delta u=V\\)", rightX, centerY + radius + 30, {
      align: "center",
      color: colors.teal,
      size: 12,
      weight: 700,
    });
    drawLabel(context, "+", width / 2, centerY + 7, {
      align: "center",
      color: colors.heading,
      size: 22,
      weight: 700,
    });
    drawLabel(context, compact ? "two independent amplitudes: \\(h\\) and \\(a\\)" : "the boundary conditions determine how \\(h\\) and \\(a\\) must be paired", width / 2, height - 18, {
      align: "center",
      color: colors.muted,
      size: 11,
    });
  };

  const drawWronskianStage = (context, width, height, compact) => {
    const domainX = width * (compact ? .28 : .27);
    const domainY = height * .56;
    const radius = Math.min(width * .14, height * .21);
    drawAngularFieldChange(context, domainX, domainY, radius * 1.02);
    tracePolarPerturbation(context, domainX, domainY, radius, .09, {
      stroke: colors.accent,
      lineWidth: 3,
    });
    drawReferenceCircle(context, domainX, domainY, radius);
    drawLabel(context, "shape + field", domainX, domainY + 5, {
      align: "center",
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawLabel(context, "both traces preserved", domainX, domainY + radius + 32, {
      align: "center",
      color: colors.accent,
      size: 11,
      weight: 700,
    });

    const responseCenterX = width * .71;
    const responseHalfWidth = Math.min(width * .17, 104);
    const responseLeft = responseCenterX - responseHalfWidth;
    const responseRight = responseCenterX + responseHalfWidth;
    const fieldEndX = responseCenterX - 10;
    const shapeEndX = responseCenterX + 10;
    const fieldStartX = responseLeft + 8;
    const shapeStartX = responseRight - 8;
    const rowYs = [height * .48, height * .68];

    drawLabel(context, "\\(W_{1,10}(\\mu)=0\\)", responseCenterX, height * .20, {
      align: "center",
      color: colors.gold,
      size: 12,
      weight: 700,
    });
    drawLabel(context, "Field \\(a\\)", responseLeft, height * .29, {
      color: colors.teal,
      size: 10,
      weight: 700,
    });
    drawLabel(context, "Shape \\(h\\)", responseRight, height * .29, {
      align: "right",
      color: colors.accent,
      size: 10,
      weight: 700,
    });

    ["Boundary value", "Boundary slope"].forEach((label, index) => {
      const rowY = rowYs[index];
      drawLabel(context, `${label} = 0`, responseCenterX, rowY - 18, {
        align: "center",
        color: colors.muted,
        size: 10,
        weight: 700,
      });
      context.beginPath();
      context.moveTo(responseLeft, rowY);
      context.lineTo(responseRight, rowY);
      context.strokeStyle = colors.rule;
      context.lineWidth = 1.2;
      context.stroke();
      drawArrow(context, fieldStartX, rowY, fieldEndX, rowY, {
        color: colors.teal,
        width: 3,
        head: 7,
      });
      drawArrow(context, shapeStartX, rowY, shapeEndX, rowY, {
        color: colors.accent,
        width: 3,
        head: 7,
      });
      context.beginPath();
      context.arc(responseCenterX, rowY, 4, 0, Math.PI * 2);
      context.fillStyle = colors.white;
      context.fill();
      context.strokeStyle = colors.heading;
      context.lineWidth = 1.5;
      context.stroke();
    });

    drawLabel(context, compact ? "Both rows cancel" : "One choice of \\(a\\) and \\(h\\) cancels both rows", responseCenterX, height - 18, {
      align: "center",
      color: colors.heading,
      size: 10,
      weight: 700,
    });
  };

  const drawContinuationStage = (context, width, height, compact) => {
    const centers = [width * .165, width * .5, width * .835];
    const centerY = height * .54;
    const radius = Math.min(width * (compact ? .095 : .105), height * .17);
    const amplitudes = [0, .48, 1];
    const fluxes = [.72, .38, 0];
    const labels = ["disk seed", "branch", "centre \\(x^\\circ\\)"];
    const fluxLabels = ["\\(c\\ne 0\\)", "\\(c\\) changes", "\\(c=0\\)"];
    centers.forEach((centerX, index) => {
      traceConformalBoundary(context, centerX, centerY, radius, amplitudes[index], {
        fill: index === 2 ? "rgba(160, 0, 0, .08)" : colors.tealLight,
        stroke: index === 2 ? colors.accent : colors.teal,
        lineWidth: index === 2 ? 3 : 2.4,
      });
      drawNormalDerivativeMarkers(context, centerX, centerY, radius, amplitudes[index], fluxes[index]);
      drawLabel(context, labels[index], centerX, centerY + radius + 36, {
        align: "center",
        color: index === 2 ? colors.accent : colors.heading,
        size: 10,
        weight: 700,
      });
      drawLabel(context, fluxLabels[index], centerX, centerY - radius - 30, {
        align: "center",
        color: fluxes[index] > 0 ? colors.teal : colors.accent,
        size: 11,
        weight: 700,
      });
    });
    drawOutlinedFilledArrow(context, centers[0] + radius + 29, centerY, centers[1] - radius - 29, centerY, {
      fill: colors.white,
      stroke: colors.heading,
      lineWidth: 2,
      shaftHalfWidth: 8,
      headHalfWidth: 14,
      headLength: 12,
    });
    drawOutlinedFilledArrow(context, centers[1] + radius + 29, centerY, centers[2] - radius - 29, centerY, {
      fill: colors.white,
      stroke: colors.heading,
      lineWidth: 2,
      shaftHalfWidth: 8,
      headHalfWidth: 14,
      headLength: 12,
    });
    drawLabel(context, compact ? "exploratory continuation" : "the Wronskian gives the tangent; continuation follows the nonlinear branch", width / 2, height - 18, {
      align: "center",
      color: colors.muted,
      size: 10,
    });
  };

  const drawSearch = () => {
    if (!searchCanvas) return;
    const rectangle = searchCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(searchCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);
    const compact = width < 520;
    const stage = searchStages[selectedSearchStage];
    drawSearchTitle(context, width, stage.title);
    if (selectedSearchStage === 0) drawDiskFieldStage(context, width, height, compact);
    else if (selectedSearchStage === 1) drawSeparatePerturbationsStage(context, width, height, compact);
    else if (selectedSearchStage === 2) drawWronskianStage(context, width, height, compact);
    else drawContinuationStage(context, width, height, compact);

    searchCanvas.setAttribute(
      "aria-label",
      `Perturbation stage ${selectedSearchStage + 1} of 4: ${stage.label}. ${stage.aria}`,
    );
  };

  const updateSearch = (nextStage = selectedSearchStage) => {
    selectedSearchStage = clamp(Math.round(Number(nextStage)), 0, 3);
    const stage = searchStages[selectedSearchStage];
    syncDirectChoice(searchStageButtons, selectedSearchStage);
    setMath(searchStageEquation, stage.equation, { displayMode: true, serif: true });
    setInlineMathContent(searchStageStatus, stage.statusMath);
    drawSearch();
  };
  searchStageButtons.forEach((button) => {
    button.addEventListener("click", () => updateSearch(button.dataset.controlValue));
  });
  observeCanvas(searchCanvas, drawSearch);
  requestAnimationFrame(() => updateSearch());

  const pullbackCanvas = document.getElementById("pullbackCanvas");

  const drawMappedGrid = (context, centerX, centerY, radius, options = {}) => {
    const amplitude = options.amplitude ?? 1;
    const alpha = options.alpha ?? 1;
    const ringCount = options.rings ?? 3;
    const spokeCount = options.spokes ?? 12;
    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1;
    for (let ring = 1; ring <= ringCount; ring += 1) {
      context.beginPath();
      for (let index = 0; index <= 360; index += 1) {
        const theta = index / 360 * Math.PI * 2;
        const point = conformalPoint(ring / ringCount, theta, 30, amplitude);
        const x = centerX + point.x * radius;
        const y = centerY - point.y * radius;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    for (let spoke = 0; spoke < spokeCount; spoke += 1) {
      const theta = spoke / spokeCount * Math.PI * 2;
      context.beginPath();
      for (let index = 0; index <= 80; index += 1) {
        const point = conformalPoint(index / 80, theta, 30, amplitude);
        const x = centerX + point.x * radius;
        const y = centerY - point.y * radius;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    traceConformalBoundary(context, centerX, centerY, radius, amplitude, {
      stroke: options.stroke || colors.accent,
      lineWidth: 2.2,
    });
    context.restore();
  };

  const transferFieldValue = (radius, theta) => {
    const boundaryEnvelope = (1 - radius * radius) ** 2;
    return 1 + .50 * boundaryEnvelope * (
      .68 * Math.cos(3 * Math.PI * radius)
      + .42 * radius * radius * Math.cos(10 * theta)
    );
  };

  const transferFieldColor = (value) => {
    const signed = clamp((value - 1) / .55, -1, 1);
    const amount = Math.abs(signed) * .82;
    const neutral = { red: 242, green: 239, blue: 228 };
    const target = signed >= 0
      ? { red: 160, green: 0, blue: 0 }
      : { red: 7, green: 87, blue: 96 };
    return `rgb(${Math.round(mix(neutral.red, target.red, amount))}, ${Math.round(mix(neutral.green, target.green, amount))}, ${Math.round(mix(neutral.blue, target.blue, amount))})`;
  };

  const drawTransferField = (context, centerX, centerY, scale, mapped) => {
    const radialCells = 11;
    const angularCells = 48;
    const project = (radius, theta) => {
      const point = mapped
        ? conformalPoint(radius, theta, 30, 1)
        : { x: radius * Math.cos(theta), y: radius * Math.sin(theta) };
      return { x: centerX + point.x * scale, y: centerY - point.y * scale };
    };
    for (let radial = 0; radial < radialCells; radial += 1) {
      const inner = radial / radialCells;
      const outer = (radial + 1) / radialCells;
      for (let angular = 0; angular < angularCells; angular += 1) {
        const theta0 = angular / angularCells * Math.PI * 2;
        const theta1 = (angular + 1) / angularCells * Math.PI * 2;
        const points = [
          project(inner, theta0),
          project(outer, theta0),
          project(outer, theta1),
          project(inner, theta1),
        ];
        const color = transferFieldColor(transferFieldValue(
          (inner + outer) / 2,
          (theta0 + theta1) / 2,
        ));
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
        context.closePath();
        context.fillStyle = color;
        context.fill();
        context.strokeStyle = color;
        context.lineWidth = .55;
        context.stroke();
      }
    }
  };

  const drawCorrespondingPoint = (context, x, y, label, options = {}) => {
    const halo = context.createRadialGradient(x, y, 0, x, y, 17);
    halo.addColorStop(0, options.halo || "rgba(160, 0, 0, .28)");
    halo.addColorStop(1, "rgba(160, 0, 0, 0)");
    context.beginPath();
    context.arc(x, y, 17, 0, Math.PI * 2);
    context.fillStyle = halo;
    context.fill();

    context.beginPath();
    context.arc(x, y, 4.5, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = options.color || colors.accent;
    context.lineWidth = 2.2;
    context.stroke();
    drawLabel(context, label, x + (options.labelX || 10), y + (options.labelY || -9), {
      color: options.color || colors.accent,
      size: 14,
      weight: 700,
    });
  };

  const drawPullback = () => {
    if (!pullbackCanvas) return;
    const rectangle = pullbackCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(pullbackCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);
    const compact = width < 520;
    const radius = Math.min(
      compact ? width * .235 : width * .185,
      compact ? height * .165 : height * .31,
    );
    const diskCenter = compact
      ? { x: width / 2, y: height * .27 }
      : { x: width * .76, y: height * .53 };
    const domainCenter = compact
      ? { x: width / 2, y: height * .73 }
      : { x: width * .24, y: height * .53 };

    drawTransferField(context, diskCenter.x, diskCenter.y, radius, false);
    drawMappedGrid(context, diskCenter.x, diskCenter.y, radius, {
      amplitude: 0,
      alpha: .45,
      stroke: colors.heading,
    });
    drawTransferField(context, domainCenter.x, domainCenter.y, radius, true);
    drawMappedGrid(context, domainCenter.x, domainCenter.y, radius, {
      amplitude: 1,
      alpha: .45,
      stroke: colors.accent,
    });
    if (compact) {
      drawLabel(context, "fixed disk \\(\\mathbb{D}\\)", diskCenter.x, diskCenter.y - radius - 14, { align: "center", color: colors.heading, size: 14, weight: 700 });
      drawLabel(context, "physical domain \\(\\Omega\\)", domainCenter.x, domainCenter.y - radius - 14, { align: "center", color: colors.heading, size: 14, weight: 700 });
    } else {
      drawLabel(context, "physical domain \\(\\Omega\\)", domainCenter.x, domainCenter.y - radius - 24, { align: "center", color: colors.heading, size: 14, weight: 700 });
      drawLabel(context, "fixed disk \\(\\mathbb{D}\\)", diskCenter.x, diskCenter.y - radius - 24, { align: "center", color: colors.heading, size: 14, weight: 700 });
    }

    const sampleRadius = .62;
    const sampleTheta = 2.35;
    const diskPoint = {
      x: diskCenter.x + sampleRadius * Math.cos(sampleTheta) * radius,
      y: diskCenter.y - sampleRadius * Math.sin(sampleTheta) * radius,
    };
    const mappedPoint = conformalPoint(sampleRadius, sampleTheta, 30, 1);
    const physicalPoint = {
      x: domainCenter.x + mappedPoint.x * radius,
      y: domainCenter.y - mappedPoint.y * radius,
    };

    if (compact) {
      const arrowX = width / 2 + radius + 19;
      const arrowTop = diskCenter.y + radius * .72;
      const arrowBottom = domainCenter.y - radius * .72;
      drawArrow(context, arrowX, arrowTop, arrowX, arrowBottom, { color: colors.teal, width: 2.2, head: 8 });
      drawLabel(context, "\\(\\phi_p\\)", arrowX + 12, (arrowTop + arrowBottom) / 2 + 4, { color: colors.teal, size: 14, weight: 700 });
    } else {
      const arrowStart = diskCenter.x - radius - 32;
      const arrowEnd = domainCenter.x + radius + 32;
      drawArrow(context, arrowStart, diskCenter.y, arrowEnd, domainCenter.y, { color: colors.teal, width: 2.2, head: 8 });
      drawLabel(context, "\\(\\phi_p\\)", (arrowStart + arrowEnd) / 2, diskCenter.y - 14, { align: "center", color: colors.teal, size: 14, weight: 700 });
    }

    drawCorrespondingPoint(context, diskPoint.x, diskPoint.y, "\\(z\\)", {
      color: colors.teal,
      halo: "rgba(7, 87, 96, .28)",
      labelX: 10,
      labelY: -10,
    });
    drawCorrespondingPoint(context, physicalPoint.x, physicalPoint.y, "\\(x=\\phi_p(z)\\)", {
      color: colors.accent,
      labelX: 10,
      labelY: -10,
    });

    drawLabel(
      context,
      compact ? "same field value at \\(z\\) and \\(\\phi_p(z)\\)" : "schematic scalar field; same sampled colour at \\(z\\) and \\(x\\)",
      width / 2,
      height - 16,
      { align: "center", color: colors.muted, size: compact ? 12 : 14 },
    );

    pullbackCanvas.setAttribute(
      "aria-label",
      "Schematic mechanism. The fixed disk is mapped by phi sub p to the physical domain. A marked disk point z maps to x equals phi sub p of z, and its sampled colour matches exactly on both sides. The colours are an illustrative scalar field for the coordinate transfer, not the certified eigenfunction. The exact identity is U of z equals u of x.",
    );
  };

  observeCanvas(pullbackCanvas, drawPullback);
  requestAnimationFrame(drawPullback);

  const inverseCanvas = document.getElementById("inverseCanvas");
  const inverseAngularMode = document.getElementById("inverseAngularMode");
  const inverseAngularModeButtons = directChoiceButtons(inverseAngularMode);
  const inverseRadialMode = document.getElementById("inverseRadialMode");
  const inverseRadialModeButtons = directChoiceButtons(inverseRadialMode);
  const inverseStatus = document.getElementById("inverseStatus");
  let selectedInverseAngular = 1;
  let selectedInverseRadial = 1;

  const binomial = (n, k) => {
    if (k < 0 || k > n) return 0;
    let result = 1;
    for (let index = 1; index <= Math.min(k, n - k); index += 1) {
      result *= (n - index + 1) / index;
    }
    return result;
  };

  const jacobiZeroN = (degree, n, x) => {
    let value = 0;
    for (let m = 0; m <= degree; m += 1) {
      value += binomial(degree, m)
        * binomial(degree + n, degree - m)
        * (x - 1) ** (degree - m)
        * (x + 1) ** m;
    }
    return value / 2 ** degree;
  };

  const realDiskMode = (ell, radial, radius, theta) => {
    const n = 10 * Math.abs(ell);
    return radius ** n
      * jacobiZeroN(radial, n, 2 * radius * radius - 1)
      * Math.cos(10 * ell * theta);
  };

  const fieldColor = (value, maximum) => {
    const normalized = clamp(value / Math.max(maximum, 1e-15), -1, 1);
    if (normalized >= 0) {
      return `rgba(160, 0, 0, ${(.10 + .82 * normalized).toFixed(3)})`;
    }
    return `rgba(7, 87, 96, ${(.10 + .82 * -normalized).toFixed(3)})`;
  };

  const drawDiskField = (context, box, valueAt, options = {}) => {
    const cells = options.cells || 54;
    let maximum = options.maximum || 0;
    if (!maximum) {
      for (let row = 0; row < cells; row += 1) {
        for (let column = 0; column < cells; column += 1) {
          const x = -1 + (column + .5) * 2 / cells;
          const y = 1 - (row + .5) * 2 / cells;
          const radius = Math.hypot(x, y);
          if (radius > 1) continue;
          maximum = Math.max(maximum, Math.abs(valueAt(radius, Math.atan2(y, x))));
        }
      }
    }
    const cellWidth = box.width / cells;
    const cellHeight = box.height / cells;
    context.save();
    context.beginPath();
    context.arc(box.x + box.width / 2, box.y + box.height / 2, Math.min(box.width, box.height) / 2, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = colors.accentLight;
    context.fillRect(box.x, box.y, box.width, box.height);
    for (let row = 0; row < cells; row += 1) {
      for (let column = 0; column < cells; column += 1) {
        const x = -1 + (column + .5) * 2 / cells;
        const y = 1 - (row + .5) * 2 / cells;
        const radius = Math.hypot(x, y);
        if (radius > 1) continue;
        context.fillStyle = fieldColor(valueAt(radius, Math.atan2(y, x)), maximum);
        context.fillRect(box.x + column * cellWidth, box.y + row * cellHeight, cellWidth + 1, cellHeight + 1);
      }
    }
    context.restore();
    context.beginPath();
    context.arc(box.x + box.width / 2, box.y + box.height / 2, Math.min(box.width, box.height) / 2, 0, Math.PI * 2);
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.4;
    context.stroke();
    return maximum;
  };

  const drawInverse = () => {
    if (!inverseCanvas) return;
    const rectangle = inverseCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(inverseCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);
    const compact = width < 520;
    const n = 10 * Math.abs(selectedInverseAngular);
    const D = n + 2 * selectedInverseRadial;
    const weights = [
      1 / (4 * D * (D + 1)),
      -1 / (2 * D * (D + 2)),
      1 / (4 * (D + 1) * (D + 2)),
    ];
    const colorsByMode = [colors.teal, colors.accent, colors.gold];
    const radialIndices = [
      selectedInverseRadial - 1,
      selectedInverseRadial,
      selectedInverseRadial + 1,
    ];

    const sourceHeaderX = compact ? width * .21 : width * .235;
    const responseHeaderX = compact ? width * .77 : width * .765;
    const headerArrowStart = compact ? width * .40 : width * .38;
    const headerArrowEnd = compact ? width * .57 : width * .60;
    drawLabel(context, `source \\(\\Phi_{${selectedInverseAngular},${selectedInverseRadial}}\\)`, sourceHeaderX, 32, {
      align: "center",
      color: colors.heading,
      size: compact ? 16 : 18,
      weight: 700,
    });
    drawOutlinedFilledArrow(context, headerArrowStart, 29, headerArrowEnd, 29, {
      fill: colors.white,
      stroke: colors.heading,
      lineWidth: 2,
      shaftHalfWidth: 13,
      headHalfWidth: 20,
      headLength: 28,
    });
    drawLabel(context, "\\(K\\)", (headerArrowStart + headerArrowEnd) / 2, 35, {
      align: "center",
      color: colors.heading,
      size: 16,
      weight: 700,
    });
    drawLabel(context, compact ? "\\(v=K\\Phi\\)" : "response \\(v=K\\Phi\\)", responseHeaderX, 32, {
      align: "center",
      color: colors.heading,
      size: compact ? 16 : 18,
      weight: 700,
    });

    const legendBox = {
      x: compact ? 32 : width * .25,
      y: height - 60,
      width: compact ? width - 64 : width * .50,
      height: 42,
    };
    const axisLabelY = legendBox.y - 10;
    const plot = {
      x: compact ? 34 : 46,
      y: compact ? 82 : 68,
      width: width - (compact ? 120 : 190),
      height: axisLabelY - 23 - (compact ? 82 : 68),
    };
    const sampleCount = 240;
    const componentSamples = weights.map((weight, index) => {
      const values = [];
      for (let step = 0; step <= sampleCount; step += 1) {
        const radius = step / sampleCount;
        values.push(weight * realDiskMode(
          selectedInverseAngular,
          radialIndices[index],
          radius,
          0,
        ));
      }
      return values;
    });
    const sumSamples = [];
    let minimumValue = 0;
    let maximumValue = 0;
    for (let step = 0; step <= sampleCount; step += 1) {
      const value = componentSamples.reduce((sum, samples) => sum + samples[step], 0);
      sumSamples.push(value);
      componentSamples.forEach((samples) => {
        minimumValue = Math.min(minimumValue, samples[step]);
        maximumValue = Math.max(maximumValue, samples[step]);
      });
      minimumValue = Math.min(minimumValue, value);
      maximumValue = Math.max(maximumValue, value);
    }
    const valueSpan = Math.max(maximumValue - minimumValue, 1e-15);
    const verticalPadding = plot.height * .07;
    const mapX = (radius) => plot.x + radius * plot.width;
    const mapY = (value) => plot.y + verticalPadding
      + (maximumValue - value) / valueSpan * (plot.height - 2 * verticalPadding);
    const zeroY = mapY(0);

    context.beginPath();
    context.moveTo(plot.x, zeroY);
    context.lineTo(plot.x + plot.width, zeroY);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.2;
    context.stroke();
    context.beginPath();
    context.moveTo(plot.x + plot.width, plot.y - 8);
    context.lineTo(plot.x + plot.width, plot.y + plot.height + 8);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.2;
    context.setLineDash([4, 4]);
    context.stroke();
    context.setLineDash([]);

    componentSamples.forEach((samples, index) => {
      context.beginPath();
      samples.forEach((value, step) => {
        const x = mapX(step / sampleCount);
        const y = mapY(value);
        if (step === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = colorsByMode[index];
      context.globalAlpha = .58;
      context.lineWidth = 1.5;
      context.stroke();
      context.globalAlpha = 1;
    });

    context.beginPath();
    sumSamples.forEach((value, step) => {
      const x = mapX(step / sampleCount);
      const y = mapY(value);
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = colors.heading;
    context.lineWidth = 3;
    context.stroke();

    const endpointX = plot.x + plot.width;
    const endpointValue = sumSamples[sampleCount];
    const endpointY = mapY(endpointValue);
    context.beginPath();
    context.arc(endpointX, endpointY, 4.5, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.1;
    context.stroke();
    context.beginPath();
    context.moveTo(endpointX - 34, endpointY);
    context.lineTo(Math.min(width - 16, endpointX + 52), endpointY);
    context.strokeStyle = colors.accent;
    context.lineWidth = 2;
    context.stroke();

    drawLabel(context, "Radial slice at \\(\\theta=0\\)", plot.x, zeroY - 13, {
      color: colors.muted,
      size: compact ? 13 : 17,
    });
    drawLabel(context, "boundary \\(r=1\\)", endpointX, axisLabelY, {
      align: compact ? "right" : "center",
      color: colors.heading,
      size: compact ? 13 : 17,
      weight: 700,
    });
    drawLabel(context, "value \\(=0\\)", endpointX + 12, endpointY - 22, {
      align: "left",
      color: colors.accent,
      size: compact ? 13 : 15,
      weight: 700,
    });

    const legendItems = [
      { text: "\\(A\\)", color: colorsByMode[0] },
      { text: "\\(B\\)", color: colorsByMode[1] },
      { text: "\\(C\\)", color: colorsByMode[2] },
      { text: "\\(v\\)", color: colors.heading },
    ];
    context.fillStyle = colors.accentLight;
    context.fillRect(legendBox.x, legendBox.y, legendBox.width, legendBox.height);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.2;
    context.strokeRect(legendBox.x + .5, legendBox.y + .5, legendBox.width - 1, legendBox.height - 1);
    const legendCellWidth = legendBox.width / legendItems.length;
    legendItems.forEach((item, index) => {
      const cellX = legendBox.x + index * legendCellWidth;
      const swatchX = cellX + (compact ? 12 : 20);
      const swatchWidth = compact ? 16 : 20;
      const legendY = legendBox.y + legendBox.height / 2;
      context.beginPath();
      context.moveTo(swatchX, legendY);
      context.lineTo(swatchX + swatchWidth, legendY);
      context.strokeStyle = item.color;
      context.lineWidth = index === legendItems.length - 1 ? 3.5 : 2.5;
      context.stroke();
      drawLabel(context, item.text, swatchX + swatchWidth + (compact ? 5 : 7), legendY + 1, {
        baseline: "middle",
        color: item.color,
        size: compact ? 16 : 17,
        weight: index === legendItems.length - 1 ? 700 : 400,
      });
    });
    drawLabel(context, "slope \\(=0\\)", endpointX + 12, endpointY + 25, {
      align: "left",
      color: colors.accent,
      size: compact ? 13 : 15,
      weight: 700,
    });

    inverseCanvas.setAttribute(
      "aria-label",
      `Exact algebra on the radial slice theta equals zero. For source mode ell ${selectedInverseAngular}, radial index ${selectedInverseRadial}, the compatible inverse combines radial indices ${selectedInverseRadial - 1}, ${selectedInverseRadial}, and ${selectedInverseRadial + 1}. The exact balances A plus B plus C equals zero and A beta s minus one plus B beta s plus C beta s plus one equals zero make the black response reach value zero with slope zero at the boundary.`,
    );
  };

  const updateInverse = () => {
    selectedInverseAngular = clamp(Math.round(Number(selectedInverseAngular)), 0, 3);
    selectedInverseRadial = clamp(Math.round(Number(selectedInverseRadial)), 1, 4);
    const D = 10 * selectedInverseAngular + 2 * selectedInverseRadial;
    const weights = [
      1 / (4 * D * (D + 1)),
      -1 / (2 * D * (D + 2)),
      1 / (4 * (D + 1) * (D + 2)),
    ];
    const beta = (radial) => 10 * selectedInverseAngular
      + 2 * radial * (radial + 10 * selectedInverseAngular + 1);
    const valueBalance = weights.reduce((sum, value) => sum + value, 0);
    const slopeBalance = weights.reduce(
      (sum, value, index) => sum + value * beta(selectedInverseRadial + index - 1),
      0,
    );
    syncDirectChoice(inverseAngularModeButtons, selectedInverseAngular);
    syncDirectChoice(inverseRadialModeButtons, selectedInverseRadial);
    const valueBalanceMath = Math.abs(valueBalance) < 1e-14 ? "0" : formatScientificLatex(valueBalance, 2);
    const slopeBalanceMath = Math.abs(slopeBalance) < 1e-14 ? "0" : formatScientificLatex(slopeBalance, 2);
    setInlineMathContent(
      inverseStatus,
      `Exact algebra at \\(D=${D}\\): \\(A+B+C=${valueBalanceMath}\\), and \\(A\\beta_{s-1}+B\\beta_s+C\\beta_{s+1}=${slopeBalanceMath}\\).`,
    );
    drawInverse();
  };
  inverseAngularModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedInverseAngular = button.dataset.controlValue;
      updateInverse();
    });
  });
  inverseRadialModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedInverseRadial = button.dataset.controlValue;
      updateInverse();
    });
  });
  observeCanvas(inverseCanvas, drawInverse);
  requestAnimationFrame(updateInverse);

  const tailCanvas = document.getElementById("tailCanvas");
  const tailStage = document.getElementById("tailStage");
  const tailStageButtons = directChoiceButtons(tailStage);
  const tailStatus = document.getElementById("tailStatus");
  const tailStages = Object.freeze([
    Object.freeze({ label: "finite core", status: "The finite matrix contains 2,440 field coefficients and 31 shape-and-frequency coefficients." }),
    Object.freeze({ label: "checked outer equations", status: "Equation rows reached by the finite centre are enumerated separately from the unknown blocks." }),
    Object.freeze({ label: "nearby interaction band", status: "Every nearby coefficient that can couple to the stored centre is bounded explicitly; this band meets the remote estimate." }),
    Object.freeze({ label: "remote analytic tail", status: "Decreasing field and shape estimates cover every larger index, beginning where the nearby band ends." }),
    Object.freeze({
      label: "all bounds combined",
      status: "An exact-fraction checker combines the finite core, reached equations, nearby enumeration, and analytic tails into Y, Z, C two and C three.",
      statusMath: "An exact-fraction checker combines the finite core, reached equations, nearby enumeration, and analytic tails into \\(Y,Z,C_2,C_3\\).",
    }),
  ]);
  let selectedTailStage = 0;

  const drawTail = () => {
    if (!tailCanvas) return;
    const rectangle = tailCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(tailCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);
    const compact = width < 520;
    const diagram = compact
      ? { x: 20, y: 28, width: width - 40, height: height * .65 }
      : { x: 30, y: 36, width: width * .62, height: height - 72 };
    const labelWidth = compact ? 54 : 70;
    const stripX = diagram.x + labelWidth;
    const stripWidth = diagram.width - labelWidth;
    const finiteWidth = stripWidth * (compact ? .44 : .47);
    const omittedWidth = stripWidth * .08;
    const nearbyWidth = stripWidth * (compact ? .20 : .15);
    const remoteWidth = stripWidth - finiteWidth - omittedWidth - nearbyWidth;
    const gTop = diagram.y + (compact ? 54 : 50);
    const gHeight = diagram.height * (compact ? .44 : .48);
    const pTop = diagram.y + diagram.height * .72;
    const pHeight = Math.max(30, diagram.height * .13);

    drawLabel(context, compact ? "Index regions, not to scale" : "Index regions schematic, not to scale", diagram.x, diagram.y + 10, {
      color: colors.muted,
      size: compact ? 11 : 13,
      weight: 700,
    });

    drawLabel(context, "\\(g\\) array", diagram.x, gTop + 18, {
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "\\(p\\) list", diagram.x, pTop + 19, {
      color: colors.heading,
      size: 14,
      weight: 700,
    });

    const finiteG = { x: stripX, y: gTop, width: finiteWidth, height: gHeight };
    context.fillStyle = "rgba(7, 87, 96, .17)";
    context.fillRect(finiteG.x, finiteG.y, finiteG.width, finiteG.height);
    context.strokeStyle = colors.teal;
    context.lineWidth = 1.5;
    context.strokeRect(finiteG.x + .5, finiteG.y + .5, finiteG.width - 1, finiteG.height - 1);
    context.strokeStyle = "rgba(7, 87, 96, .20)";
    context.lineWidth = .7;
    const gridColumns = compact ? 8 : 12;
    const gridRows = compact ? 5 : 8;
    const finiteGHeaderHeight = 30;
    for (let column = 1; column < gridColumns; column += 1) {
      const x = finiteG.x + column / gridColumns * finiteG.width;
      context.beginPath();
      context.moveTo(x, finiteG.y + finiteGHeaderHeight);
      context.lineTo(x, finiteG.y + finiteG.height);
      context.stroke();
    }
    for (let row = 1; row < gridRows; row += 1) {
      const y = finiteG.y + row / gridRows * finiteG.height;
      if (y < finiteG.y + finiteGHeaderHeight) continue;
      context.beginPath();
      context.moveTo(finiteG.x, y);
      context.lineTo(finiteG.x + finiteG.width, y);
      context.stroke();
    }
    drawLabel(context, finiteG.width < 120 ? "\\(61\\times40\\)" : "\\(61\\times40\\) stored", finiteG.x + finiteG.width / 2, finiteG.y + 20, {
      align: "center",
      color: colors.teal,
      size: 14,
      weight: 700,
    });

    const finiteP = { x: stripX, y: pTop, width: finiteWidth, height: pHeight };
    context.fillStyle = "rgba(7, 87, 96, .17)";
    context.fillRect(finiteP.x, finiteP.y, finiteP.width, finiteP.height);
    context.strokeStyle = colors.teal;
    context.lineWidth = 1.5;
    context.strokeRect(finiteP.x + .5, finiteP.y + .5, finiteP.width - 1, finiteP.height - 1);
    const detailedPLabel = finiteP.width >= 180;
    const finitePLabelSafeRight = finiteP.x + (detailedPLabel ? 164 : finiteP.width);
    for (let cell = 1; cell < 10; cell += 1) {
      const x = finiteP.x + cell / 10 * finiteP.width;
      if (x <= finitePLabelSafeRight) continue;
      context.beginPath();
      context.moveTo(x, finiteP.y);
      context.lineTo(x, finiteP.y + finiteP.height);
      context.strokeStyle = "rgba(7, 87, 96, .20)";
      context.stroke();
    }
    drawLabel(context, detailedPLabel ? "31 stored \\(j=0,\\ldots,30\\)" : "31 stored", finiteP.x + finiteP.width / 2, finiteP.y + finiteP.height / 2 + 1, {
      align: "center",
      baseline: "middle",
      color: colors.teal,
      size: 14,
      weight: 700,
    });

    const omittedX = stripX + finiteWidth;
    const nearbyX = omittedX + omittedWidth;
    const remoteX = nearbyX + nearbyWidth;
    const footerLabelY = pTop + pHeight + 24;
    const compressedTailLabels = compact || stripWidth < 340;
    if (selectedTailStage >= 1) {
      const reachedBandHeight = 28;
      context.fillStyle = "rgba(160, 0, 0, .09)";
      context.fillRect(omittedX, gTop, omittedWidth, gHeight);
      context.fillRect(omittedX, pTop, omittedWidth, pHeight);
      context.fillRect(finiteG.x, gTop - reachedBandHeight, finiteG.width + omittedWidth, reachedBandHeight);
      context.strokeStyle = colors.accent;
      context.lineWidth = 1.2;
      context.setLineDash([4, 3]);
      context.strokeRect(omittedX + .5, gTop + .5, omittedWidth - 1, gHeight - 1);
      context.strokeRect(omittedX + .5, pTop + .5, omittedWidth - 1, pHeight - 1);
      context.strokeRect(finiteG.x + .5, gTop - reachedBandHeight + .5, finiteG.width + omittedWidth - 1, reachedBandHeight - 1);
      context.setLineDash([]);
      drawLabel(context, compact && finiteG.width + omittedWidth < 130 ? "outer rows" : compact ? "reached rows" : "reached equations", finiteG.x + (finiteG.width + omittedWidth) / 2, gTop - reachedBandHeight / 2 + 1, {
        align: "center",
        baseline: "middle",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
      drawLabel(context, compressedTailLabels ? "extra rows" : "rows \\(\\ne\\) unknowns", finiteP.x, footerLabelY, {
        color: colors.accent,
        size: compact ? 10 : 12,
      });
    }
    if (selectedTailStage >= 2) {
      context.fillStyle = "rgba(154, 100, 0, .18)";
      context.fillRect(nearbyX, gTop, nearbyWidth, gHeight);
      context.fillRect(nearbyX, pTop, nearbyWidth, pHeight);
      context.strokeStyle = colors.gold;
      context.lineWidth = 1.3;
      context.strokeRect(nearbyX + .5, gTop + .5, nearbyWidth - 1, gHeight - 1);
      context.strokeRect(nearbyX + .5, pTop + .5, nearbyWidth - 1, pHeight - 1);
      drawLabel(context, "near", nearbyX + nearbyWidth / 2, gTop + gHeight / 2, {
        align: "center",
        baseline: "middle",
        color: colors.gold,
        size: 14,
        weight: 700,
      });
      drawArrow(context, finiteG.x + finiteG.width * .72, gTop + gHeight * .28, nearbyX + nearbyWidth * .58, gTop + gHeight * .28, {
        color: colors.gold,
        width: 1.4,
        head: 5,
      });
      const pInteractionY = pTop + pHeight * (compact ? .90 : .72);
      drawArrow(context, finiteP.x + finiteP.width * .72, pInteractionY, nearbyX + nearbyWidth * .58, pInteractionY, {
        color: colors.gold,
        width: 1.4,
        head: 5,
      });
    }
    if (selectedTailStage >= 3) {
      for (let band = 0; band < 6; band += 1) {
        const x = remoteX + band / 6 * remoteWidth;
        const bandWidth = remoteWidth / 6 + 1;
        context.fillStyle = `rgba(82, 111, 134, ${(.22 - band * .025).toFixed(3)})`;
        context.fillRect(x, gTop, bandWidth, gHeight);
        context.fillRect(x, pTop, bandWidth, pHeight);
      }
      context.strokeStyle = colors.blue;
      context.lineWidth = 1.2;
      context.strokeRect(remoteX + .5, gTop + .5, remoteWidth - 1, gHeight - 1);
      context.strokeRect(remoteX + .5, pTop + .5, remoteWidth - 1, pHeight - 1);
      drawLabel(context, "tail", remoteX + remoteWidth / 2, gTop + gHeight / 2, {
        align: "center",
        baseline: "middle",
        color: colors.blue,
        size: 14,
        weight: 700,
      });
      drawLabel(context, compressedTailLabels ? "\\(D^{-2}\\) tail" : "\\(K\\)-mode bound \\(\\sim D^{-2}\\)", stripX + stripWidth, footerLabelY, {
        align: "right",
        color: colors.blue,
        size: 14,
        weight: 700,
      });
    }

    const checkerHeight = compact ? height * .20 : height * .36;
    const checker = compact
      ? { x: width * .15, y: height * .76, width: width * .70, height: checkerHeight }
      : {
        x: width * .73,
        y: diagram.y + (diagram.height - checkerHeight) / 2,
        width: width * .23,
        height: checkerHeight,
      };
    if (selectedTailStage >= 4) {
      context.fillStyle = colors.accentLight;
      context.fillRect(checker.x, checker.y, checker.width, checker.height);
      context.strokeStyle = colors.heading;
      context.lineWidth = 1.5;
      context.strokeRect(checker.x + .5, checker.y + .5, checker.width - 1, checker.height - 1);
      drawLabel(context, "exact checker", checker.x + checker.width / 2, checker.y + checker.height * .29, {
        align: "center",
        color: colors.heading,
        size: 14,
        weight: 700,
      });
      drawLabel(context, checker.width < 160 ? "all bounds" : "finite + nearby + tail", checker.x + checker.width / 2, checker.y + checker.height * .56, {
        align: "center",
        baseline: "middle",
        color: colors.muted,
        size: 14,
      });
      drawLabel(context, "\\(Y,Z,C_2,C_3\\)", checker.x + checker.width / 2, checker.y + checker.height * .80, {
        align: "center",
        baseline: "middle",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
      if (compact) {
        drawOutlinedFilledArrow(
          context,
          width / 2,
          diagram.y + diagram.height + 3,
          width / 2,
          checker.y - 7,
          { shaftHalfWidth: 4, headHalfWidth: 9, headLength: 11 },
        );
      } else {
        const centerY = diagram.y + diagram.height / 2;
        drawOutlinedFilledArrow(
          context,
          diagram.x + diagram.width + 5,
          centerY,
          checker.x - 6,
          centerY,
          { shaftHalfWidth: 5, headHalfWidth: 12, headLength: 15 },
        );
      }
    }
    tailCanvas.setAttribute(
      "aria-label",
      `Certificate-structure schematic, not to scale. Layer ${selectedTailStage + 1} of 5: ${tailStages[selectedTailStage].label}. The two-dimensional field array g and the one-dimensional shape-and-frequency list p are shown separately. ${tailStages[selectedTailStage].status} There is no unchecked gap between the explicitly enumerated near region and the remote decreasing bound.`,
    );
  };

  const updateTail = (nextStage = selectedTailStage) => {
    selectedTailStage = clamp(Math.round(Number(nextStage)), 0, 4);
    const stage = tailStages[selectedTailStage];
    syncDirectChoice(tailStageButtons, selectedTailStage);
    if (stage.statusMath) setInlineMathContent(tailStatus, stage.statusMath);
    else if (tailStatus) tailStatus.textContent = stage.status;
    drawTail();
  };
  tailStageButtons.forEach((button) => {
    button.addEventListener("click", () => updateTail(button.dataset.controlValue));
  });
  observeCanvas(tailCanvas, drawTail);
  requestAnimationFrame(() => updateTail());

  const certificateCanvas = document.getElementById("certificateCanvas");
  const certificateView = document.getElementById("certificateView");
  const certificateViewButtons = directChoiceButtons(certificateView);
  const certificateValue = document.getElementById("certificateValue");
  const certificateDerivative = document.getElementById("certificateDerivative");
  const certificateIteration = document.getElementById("certificateIteration");
  const certificateVerdict = document.getElementById("certificateVerdict");
  const certificatePlayButton = document.getElementById("certificatePlayButton");
  const certificatePlayIcon = document.getElementById("certificatePlayIcon");
  const certificatePlayLabel = document.getElementById("certificatePlayLabel");
  const certificateBounds = Object.freeze({ Y: 1.59e-10, Z: .621, C2: 122, C3: .012 });
  const certificateRadius = 1e-6;
  const certificateMaximumIteration = 8;
  const certificateReducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  let selectedCertificateView = "radius";
  let certificateIterationProgress = 0;
  let certificateAnimationFrame = null;
  let certificateAnimationStart = null;

  const radiiPolynomial = (value) => certificateBounds.Y
    + (certificateBounds.Z - 1) * value
    + certificateBounds.C2 * value * value
    + certificateBounds.C3 * value * value * value;
  const contractionFactor = (value) => certificateBounds.Z
    + 2 * certificateBounds.C2 * value
    + 3 * certificateBounds.C3 * value * value;
  const imageRadiusBound = (value) => certificateBounds.Y
    + certificateBounds.Z * value
    + certificateBounds.C2 * value * value
    + certificateBounds.C3 * value * value * value;

  const currentCertificateData = () => {
    const q = contractionFactor(certificateRadius);
    const mappedRadius = imageRadiusBound(certificateRadius);
    return {
      radius: certificateRadius,
      q,
      mappedRadius,
      enclosureRatio: mappedRadius / certificateRadius,
      fixedPointBound: certificateBounds.Y / (1 - q),
      radiiValue: radiiPolynomial(certificateRadius),
    };
  };

  const drawRadiiCertificate = (context, width, height, data) => {
    const compact = width < 520;
    const plot = {
      x: compact ? 48 : 66,
      y: compact ? 82 : 84,
      width: width - (compact ? 66 : 96),
      height: height - (compact ? 164 : 158),
    };
    const logMinimum = -10;
    const logMaximum = Math.log10(2e-6);
    const valueMinimum = -.45;
    const valueMaximum = 1.30;
    const mapX = (value) => plot.x
      + (Math.log10(value) - logMinimum) / (logMaximum - logMinimum) * plot.width;
    const mapY = (value) => plot.y
      + (valueMaximum - clamp(value, valueMinimum, valueMaximum))
      / (valueMaximum - valueMinimum) * plot.height;
    const zeroY = mapY(0);
    const passingStart = 4.20e-10;

    drawLabel(context, compact ? "Two rigorous margin tests" : "Rigorous certificate: two normalized margins", width / 2, 27, {
      align: "center",
      color: colors.heading,
      size: compact ? 13 : 15,
      weight: 700,
    });
    drawLabel(context, "both must lie below zero", width / 2, 48, {
      align: "center",
      color: colors.muted,
      size: compact ? 11 : 13,
    });

    context.fillStyle = "rgba(7, 87, 96, .08)";
    context.fillRect(mapX(passingStart), zeroY, plot.x + plot.width - mapX(passingStart), plot.y + plot.height - zeroY);

    [-.4, 0, .4, .8, 1.2].forEach((tick) => {
      const y = mapY(tick);
      context.beginPath();
      context.moveTo(plot.x, y);
      context.lineTo(plot.x + plot.width, y);
      context.strokeStyle = tick === 0 ? colors.ruleDark : colors.rule;
      context.lineWidth = tick === 0 ? 1.5 : 1;
      context.stroke();
      drawLabel(context, tick.toFixed(1), plot.x - 7, y + 1, {
        align: "right",
        baseline: "middle",
        color: tick === 0 ? colors.heading : colors.muted,
        size: 10,
      });
    });

    [
      [1e-10, "\\(10^{-10}\\)"],
      [1e-9, "\\(10^{-9}\\)"],
      [1e-8, "\\(10^{-8}\\)"],
      [1e-7, "\\(10^{-7}\\)"],
      [2e-6, "\\(2\\times10^{-6}\\)"],
    ].forEach(([value, label], index, ticks) => {
      const x = mapX(value);
      context.beginPath();
      context.moveTo(x, plot.y + plot.height);
      context.lineTo(x, plot.y + plot.height + 5);
      context.strokeStyle = colors.ruleDark;
      context.lineWidth = 1;
      context.stroke();
      drawLabel(context, label, x, plot.y + plot.height + 18, {
        align: index === ticks.length - 1 ? "right" : "center",
        color: colors.muted,
        size: 10,
      });
    });

    const drawMargin = (valueAt, color, dashed = false) => {
      context.beginPath();
      const samples = 180;
      for (let index = 0; index <= samples; index += 1) {
        const logarithm = mix(logMinimum, logMaximum, index / samples);
        const radius = 10 ** logarithm;
        const x = mapX(radius);
        const y = mapY(valueAt(radius));
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = color;
      context.lineWidth = 2.2;
      if (dashed) context.setLineDash([6, 4]);
      context.stroke();
      context.setLineDash([]);
    };
    drawMargin((radius) => radiiPolynomial(radius) / radius, colors.accent);
    drawMargin((radius) => contractionFactor(radius) - 1, colors.teal, true);

    const chosenX = mapX(certificateRadius);
    context.beginPath();
    context.moveTo(chosenX, plot.y);
    context.lineTo(chosenX, plot.y + plot.height);
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.4;
    context.setLineDash([3, 3]);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(chosenX, mapY(data.radiiValue / certificateRadius), 4, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.arc(chosenX, mapY(data.q - 1), 4, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = colors.teal;
    context.lineWidth = 2;
    context.stroke();
    drawLabel(context, "chosen \\(r=10^{-6}\\)", chosenX - 6, plot.y - 9, {
      align: "right",
      color: colors.heading,
      size: compact ? 10 : 12,
      weight: 700,
    });

    const legendY = height - 22;
    context.beginPath();
    context.moveTo(plot.x, legendY);
    context.lineTo(plot.x + 24, legendY);
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.2;
    context.stroke();
    drawLabel(context, "\\(\\mathcal R(t)/t\\)", plot.x + 31, legendY + 1, {
      baseline: "middle",
      color: colors.accent,
      size: compact ? 11 : 13,
      weight: 700,
    });
    const secondLegendX = compact ? plot.x + plot.width * .53 : plot.x + plot.width * .42;
    context.beginPath();
    context.moveTo(secondLegendX, legendY);
    context.lineTo(secondLegendX + 24, legendY);
    context.strokeStyle = colors.teal;
    context.lineWidth = 2.2;
    context.setLineDash([6, 4]);
    context.stroke();
    context.setLineDash([]);
    drawLabel(context, "\\(q(t)-1\\)", secondLegendX + 31, legendY + 1, {
      baseline: "middle",
      color: colors.teal,
      size: compact ? 11 : 13,
      weight: 700,
    });
  };

  const drawIterationCertificate = (context, width, height, data) => {
    const compact = width < 520;
    const center = { x: width / 2, y: height * .46 };
    const ballRadius = Math.min(
      compact ? width * .35 : width * .31,
      compact ? height * .34 : height * .37,
    );
    const enclosureRadius = ballRadius * data.enclosureRatio;

    context.beginPath();
    context.arc(center.x, center.y, ballRadius, 0, Math.PI * 2);
    context.fillStyle = "rgba(17, 17, 17, .025)";
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.8;
    context.stroke();

    context.beginPath();
    context.arc(center.x, center.y, enclosureRadius, 0, Math.PI * 2);
    context.fillStyle = colors.tealLight;
    context.fill();
    context.strokeStyle = colors.teal;
    context.lineWidth = 2;
    context.stroke();

    context.beginPath();
    context.moveTo(center.x - 5, center.y);
    context.lineTo(center.x + 5, center.y);
    context.moveTo(center.x, center.y - 5);
    context.lineTo(center.x, center.y + 5);
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.3;
    context.stroke();
    drawLabel(context, "\\(x^\\circ\\)", center.x - 8, center.y + 18, {
      align: "right",
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawLabel(context, "\\(B_r(x^\\circ)\\)", center.x, center.y - ballRadius - 14, {
      align: "center",
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawLabel(context, "\\(T(B_r)\\)", center.x - enclosureRadius * .3, center.y - enclosureRadius * .52, {
      align: "center",
      color: colors.teal,
      size: 13,
      weight: 700,
    });
    const representative = {
      x: center.x + enclosureRadius * .43,
      y: center.y - enclosureRadius * .16,
    };
    const orbitPoint = (step) => {
      const startX = center.x - representative.x;
      const startY = center.y - representative.y;
      const shrink = data.q ** step;
      const angle = step * .52;
      return {
        x: representative.x + shrink * (startX * Math.cos(angle) - startY * Math.sin(angle)),
        y: representative.y + shrink * (startX * Math.sin(angle) + startY * Math.cos(angle)),
      };
    };
    const progress = clamp(certificateIterationProgress, 0, certificateMaximumIteration);
    const completed = Math.floor(progress);
    const points = [];
    for (let step = 0; step <= completed; step += 1) points.push(orbitPoint(step));
    if (progress > completed && completed < certificateMaximumIteration) {
      const from = orbitPoint(completed);
      const to = orbitPoint(completed + 1);
      points.push({
        x: mix(from.x, to.x, progress - completed),
        y: mix(from.y, to.y, progress - completed),
      });
    }
    if (points.length > 1) {
      context.beginPath();
      points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.strokeStyle = colors.accent;
      context.lineWidth = 2.2;
      context.stroke();
    }
    points.forEach((point, index) => {
      context.beginPath();
      context.arc(point.x, point.y, index === points.length - 1 ? 3.5 : 2.2, 0, Math.PI * 2);
      context.fillStyle = index === 0 ? colors.heading : colors.accent;
      context.fill();
    });
    context.beginPath();
    context.arc(representative.x, representative.y, 4, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 2;
    context.stroke();
    drawLabel(context, "\\(x^*\\)", representative.x + 10, representative.y - 8, {
      color: colors.accent,
      size: 14,
      weight: 700,
    });
    drawLabel(context, compact
      ? "Magnified orbit \\(\\|x_n-x^*\\|\\le q^n\\)"
      : "Magnified orbit \\(\\|x_n-x^*\\|\\le q^n\\|x_0-x^*\\|\\)", center.x, center.y + ballRadius + 32, {
      align: "center",
      color: colors.accent,
      size: 13,
      weight: 700,
    });
  };

  const drawCertificate = () => {
    if (!certificateCanvas) return;
    const rectangle = certificateCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(certificateCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);
    const data = currentCertificateData();
    if (selectedCertificateView === "radius") drawRadiiCertificate(context, width, height, data);
    else drawIterationCertificate(context, width, height, data);

    certificateCanvas.setAttribute(
      "aria-label",
      selectedCertificateView === "radius"
        ? "Rigorous certificate. Logarithmic radius chart of the normalized radii-polynomial margin R of t divided by t and the contraction margin q of t minus one. Both are negative at the marked proof radius ten to the minus six. The exact-fraction checker gives image enclosure ratio below 0.621282 and contraction factor below 0.621245."
        : "Rigorous certificate shown with schematic two-dimensional geometry. The outer circle is the ball B r about x degree. The teal circle is a certified enclosure containing T of the ball, with radius ratio below 0.621282; it is not the literal image set. The orbit is magnified inside the same diagram because the exact-solution displacement is subpixel at this scale; only the distance factor q to the n is certified.",
    );
  };

  const stopCertificateAnimation = () => {
    if (certificateAnimationFrame !== null) {
      cancelAnimationFrame(certificateAnimationFrame);
      certificateAnimationFrame = null;
    }
    certificateAnimationStart = null;
  };

  const updateIterationReadout = (data, state = "ready") => {
    if (!certificateIteration) return;
    if (selectedCertificateView === "radius") {
      setInlineMathContent(certificateIteration, "At \\(r\\): \\(\\mathcal R(r)\\approx-3.78719\\times10^{-7}\\).");
      return;
    }
    if (state === "running") {
      setInlineMathContent(certificateIteration, "Running schematic orbit; certified distance bound is \\(q^n\\).");
      return;
    }
    if (state === "finished") {
      setInlineMathContent(
        certificateIteration,
        `Step 8 — distance bound \\(\\le ${(data.q ** certificateMaximumIteration).toFixed(4)}\\) of the start.`,
      );
      return;
    }
    setInlineMathContent(certificateIteration, "Ready — the magnified path is schematic; the bound \\(q^n\\) is rigorous.");
  };

  const finishCertificateAnimation = (data) => {
    certificateAnimationFrame = null;
    certificateAnimationStart = null;
    if (certificatePlayButton) {
      certificatePlayButton.disabled = false;
      certificatePlayButton.removeAttribute("aria-disabled");
      certificatePlayButton.removeAttribute("aria-busy");
    }
    if (certificatePlayIcon) certificatePlayIcon.textContent = "↻";
    if (certificatePlayLabel) certificatePlayLabel.textContent = "Replay iteration";
    updateIterationReadout(data, "finished");
  };

  const animateCertificate = (timestamp) => {
    const data = currentCertificateData();
    if (certificateAnimationStart === null) certificateAnimationStart = timestamp;
    certificateIterationProgress = Math.min(
      certificateMaximumIteration,
      (timestamp - certificateAnimationStart) / 430,
    );
    drawCertificate();
    if (certificateIterationProgress < certificateMaximumIteration) {
      certificateAnimationFrame = requestAnimationFrame(animateCertificate);
    } else {
      finishCertificateAnimation(data);
    }
  };

  const startCertificateAnimation = () => {
    if (certificatePlayButton?.getAttribute("aria-disabled") === "true") return;
    const data = currentCertificateData();
    stopCertificateAnimation();
    certificateIterationProgress = 0;
    if (certificatePlayIcon) certificatePlayIcon.textContent = "●";
    if (certificatePlayLabel) certificatePlayLabel.textContent = "Iterating…";
    if (certificatePlayButton) {
      certificatePlayButton.disabled = false;
      certificatePlayButton.setAttribute("aria-disabled", "true");
      certificatePlayButton.setAttribute("aria-busy", "true");
    }
    updateIterationReadout(data, "running");
    if (certificateReducedMotionQuery?.matches) {
      certificateIterationProgress = certificateMaximumIteration;
      drawCertificate();
      finishCertificateAnimation(data);
      return;
    }
    certificateAnimationFrame = requestAnimationFrame(animateCertificate);
  };

  const updateCertificate = (nextView = selectedCertificateView) => {
    stopCertificateAnimation();
    certificateIterationProgress = 0;
    selectedCertificateView = nextView === "iteration" ? "iteration" : "radius";
    const data = currentCertificateData();
    syncDirectChoice(certificateViewButtons, selectedCertificateView);
    setInlineMathContent(certificateValue, "Pass — enclosure ratio \\(<0.621282<1\\).");
    setInlineMathContent(certificateDerivative, "Pass — \\(q(r)<0.621245<1\\).");
    if (selectedCertificateView === "radius") {
      setInlineMathContent(certificateVerdict, "Exact-fraction verdict: both strict margins are negative at \\(r\\).");
    } else if (certificateVerdict) {
      certificateVerdict.textContent = "Banach gives one exact zero inside this validated ball.";
    }
    if (certificatePlayButton) {
      certificatePlayButton.hidden = selectedCertificateView !== "iteration";
      certificatePlayButton.disabled = false;
      certificatePlayButton.removeAttribute("aria-disabled");
      certificatePlayButton.removeAttribute("aria-busy");
    }
    if (certificatePlayIcon) certificatePlayIcon.textContent = "▶";
    if (certificatePlayLabel) certificatePlayLabel.textContent = "Run iteration";
    updateIterationReadout(data);
    drawCertificate();
  };

  certificateViewButtons.forEach((button) => {
    button.addEventListener("click", () => updateCertificate(button.dataset.controlValue));
  });
  if (certificatePlayButton) certificatePlayButton.addEventListener("click", startCertificateAnimation);
  certificateReducedMotionQuery?.addEventListener?.("change", (event) => {
    if (!event.matches || certificateAnimationFrame === null) return;
    stopCertificateAnimation();
    certificateIterationProgress = certificateMaximumIteration;
    const data = currentCertificateData();
    drawCertificate();
    finishCertificateAnimation(data);
  });
  observeCanvas(certificateCanvas, drawCertificate);
  requestAnimationFrame(() => updateCertificate());

  const reconstructionCanvas = document.getElementById("reconstructionCanvas");
  const reconstructionStage = document.getElementById("reconstructionStage");
  const reconstructionStageButtons = directChoiceButtons(reconstructionStage);
  const reconstructionStatus = document.getElementById("reconstructionStatus");
  const reconstructionStages = Object.freeze([
    Object.freeze({
      label: "exact boundary is nearby",
      status: "The exact boundary is uniformly within 7.13 × 10⁻¹¹ of the printed centre.",
      statusMath: "The exact boundary is uniformly within \\(7.13\\times10^{-11}\\) of the printed centre.",
    }),
    Object.freeze({
      label: "map does not fold",
      status: "The whole coefficient ball satisfies Re φ′ > 0.35, so the conformal map is one-to-one.",
      statusMath: "The whole coefficient ball satisfies \\(\\operatorname{Re}\\phi'>0.35\\), so the conformal map is one-to-one.",
    }),
    Object.freeze({
      label: "shape is not a disk",
      status: "The normalized first shape coefficient satisfies |q₁*| > 0.03459, so the map is not linear and its image is not a disk.",
      statusMath: "The normalized first shape coefficient satisfies \\(|q_1^*|>0.03459\\), so the map is not linear and its image is not a disk.",
    }),
  ]);
  let selectedReconstructionStage = 0;

  const drawReconstructionEnclosure = (context, width, height) => {
    const compact = width < 520;
    const centerX = compact ? width / 2 : width * .27;
    const centerY = compact ? height * .31 : height * .53;
    const radius = Math.min(
      compact ? width * .22 : width * .18,
      compact ? height * .17 : height * .28,
    );
    traceConformalBoundary(context, centerX, centerY, radius, 1, {
      stroke: "rgba(160, 0, 0, .14)",
      lineWidth: 12,
    });
    traceConformalBoundary(context, centerX, centerY, radius, 1, {
      stroke: colors.accent,
      lineWidth: 2.3,
      fill: colors.tealLight,
    });
    drawLabel(context, "finite numerical centre", centerX, centerY - radius - 16, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "Certified tube, enlarged", centerX, centerY + radius + 22, {
      align: "center",
      color: colors.accent,
      size: 14,
    });

    const highlightTheta = .04;
    const highlightPoint = conformalPoint(1, highlightTheta, 30, 1);
    const highlightX = centerX + highlightPoint.x * radius;
    const highlightY = centerY - highlightPoint.y * radius;
    context.beginPath();
    context.arc(highlightX, highlightY, compact ? 12 : 15, 0, Math.PI * 2);
    context.strokeStyle = colors.accent;
    context.lineWidth = 1.5;
    context.stroke();

    const inset = compact
      ? { x: 20, y: height * .60, width: width - 40, height: height * .35 }
      : { x: width * .56, y: height * .26, width: width * .38, height: height * .50 };
    context.fillStyle = "rgba(255, 255, 248, .92)";
    context.fillRect(inset.x, inset.y, inset.width, inset.height);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.2;
    context.strokeRect(inset.x + .5, inset.y + .5, inset.width - 1, inset.height - 1);
    drawLabel(context, "certified tube \\(\\le 7.13\\times10^{-11}\\)", inset.x + inset.width / 2, inset.y + 22, {
      align: "center",
      color: colors.heading,
      size: compact ? 12 : 14,
      weight: 700,
    });

    const lineLeft = inset.x + 22;
    const lineRight = inset.x + inset.width - 22;
    const lineCenterY = inset.y + inset.height * .54;
    const tubeHalfWidth = Math.max(10, inset.height * .11);
    const wave = (x) => 4 * Math.sin((x - lineLeft) / Math.max(1, lineRight - lineLeft) * Math.PI * 1.25 - .4);
    context.beginPath();
    for (let step = 0; step <= 80; step += 1) {
      const x = mix(lineLeft, lineRight, step / 80);
      const y = lineCenterY + wave(x) - tubeHalfWidth;
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    for (let step = 80; step >= 0; step -= 1) {
      const x = mix(lineLeft, lineRight, step / 80);
      context.lineTo(x, lineCenterY + wave(x) + tubeHalfWidth);
    }
    context.closePath();
    context.fillStyle = "rgba(160, 0, 0, .10)";
    context.fill();

    context.beginPath();
    for (let step = 0; step <= 80; step += 1) {
      const x = mix(lineLeft, lineRight, step / 80);
      const y = lineCenterY + wave(x);
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.3;
    context.stroke();

    context.beginPath();
    for (let step = 0; step <= 80; step += 1) {
      const x = mix(lineLeft, lineRight, step / 80);
      const y = lineCenterY + wave(x) + tubeHalfWidth * .34 * Math.sin(step / 80 * Math.PI * 2 + .7);
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = colors.teal;
    context.lineWidth = 1.7;
    context.setLineDash([5, 4]);
    context.stroke();
    context.setLineDash([]);

    drawLabel(context, "computed boundary", lineLeft, lineCenterY - tubeHalfWidth - 9, {
      color: colors.accent,
      size: compact ? 12 : 14,
      weight: 700,
    });
    drawLabel(context, "exact boundary lies in tube", lineRight, lineCenterY + tubeHalfWidth + 20, {
      align: "right",
      color: colors.teal,
      size: compact ? 12 : 14,
      weight: 700,
    });
    if (!compact) {
      drawArrow(context, highlightX + 15, highlightY, inset.x - 14, inset.y + inset.height * .48, {
        color: colors.ruleDark,
        dashed: true,
        head: 6,
      });
    }
  };

  const drawReconstructionUnivalence = (context, width, height) => {
    const compact = width < 520;
    const radius = Math.min(
      compact ? width * .21 : width * .17,
      compact ? height * .14 : height * .27,
    );
    const diskCenter = compact
      ? { x: width / 2, y: height * .28 }
      : { x: width * .25, y: height * .52 };
    const domainCenter = compact
      ? { x: width / 2, y: height * .73 }
      : { x: width * .75, y: height * .52 };

    context.beginPath();
    context.arc(diskCenter.x, diskCenter.y, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(160, 0, 0, .035)";
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.8;
    context.stroke();
    traceConformalBoundary(context, domainCenter.x, domainCenter.y, radius, 1, {
      fill: colors.tealLight,
      stroke: colors.accent,
      lineWidth: 2.2,
    });

    drawLabel(context, "unit disk", diskCenter.x, diskCenter.y - radius - (compact ? 16 : 20), {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    drawLabel(context, compact ? "mapped domain" : "numerical centre map shown", domainCenter.x, domainCenter.y - radius - (compact ? 16 : 20), {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });

    const sourceStart = { x: -.66, y: -.25 };
    const sourceEnd = { x: .62, y: .31 };
    const sourceAt = (amount) => ({
      x: mix(sourceStart.x, sourceEnd.x, amount),
      y: mix(sourceStart.y, sourceEnd.y, amount),
    });
    const mappedAt = (amount) => {
      const source = sourceAt(amount);
      const polarRadius = Math.hypot(source.x, source.y);
      return conformalPoint(polarRadius, Math.atan2(source.y, source.x), 30, 1);
    };
    const diskProject = (point) => ({
      x: diskCenter.x + point.x * radius,
      y: diskCenter.y - point.y * radius,
    });
    const domainProject = (point) => ({
      x: domainCenter.x + point.x * radius,
      y: domainCenter.y - point.y * radius,
    });

    const diskStart = diskProject(sourceStart);
    const diskEnd = diskProject(sourceEnd);
    drawArrow(context, diskStart.x, diskStart.y, diskEnd.x, diskEnd.y, {
      color: colors.teal,
      width: 2.3,
      head: 7,
    });

    context.beginPath();
    for (let step = 0; step <= 120; step += 1) {
      const point = domainProject(mappedAt(step / 120));
      if (step === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.strokeStyle = colors.teal;
    context.lineWidth = 2.5;
    context.stroke();
    [.26, .52, .78].forEach((amount) => {
      const from = domainProject(mappedAt(amount - .045));
      const to = domainProject(mappedAt(amount + .045));
      drawArrow(context, from.x, from.y, to.x, to.y, {
        color: colors.teal,
        width: 1.8,
        head: 6,
      });
    });

    const mappedStart = domainProject(mappedAt(0));
    const mappedEnd = domainProject(mappedAt(1));
    [
      { point: diskStart, label: "\\(z_1\\)", dx: -8, dy: 20, align: "right" },
      { point: diskEnd, label: "\\(z_2\\)", dx: 8, dy: -10, align: "left" },
      { point: mappedStart, label: "\\(\\phi(z_1)\\)", dx: 10, dy: 24, align: "left" },
      { point: mappedEnd, label: "\\(\\phi(z_2)\\)", dx: -10, dy: -14, align: "right" },
    ].forEach((item) => {
      context.beginPath();
      context.arc(item.point.x, item.point.y, 3.8, 0, Math.PI * 2);
      context.fillStyle = colors.white;
      context.fill();
      context.strokeStyle = colors.accent;
      context.lineWidth = 1.8;
      context.stroke();
      drawLabel(context, item.label, item.point.x + item.dx, item.point.y + item.dy, {
        align: item.align,
        color: colors.accent,
        size: 14,
        weight: 700,
      });
    });

    if (compact) {
      const arrowX = width / 2 + radius + 18;
      const fromY = diskCenter.y + radius * .72;
      const toY = domainCenter.y - radius * .72;
      drawArrow(context, arrowX, fromY, arrowX, toY, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "\\(\\phi_{p^*}\\)", arrowX + 10, (fromY + toY) / 2 + 4, { color: colors.accent, size: 14, weight: 700 });
    } else {
      const fromX = diskCenter.x + radius + 24;
      const toX = domainCenter.x - radius - 24;
      drawArrow(context, fromX, diskCenter.y, toX, domainCenter.y, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "\\(\\phi_{p^*}\\)", (fromX + toX) / 2, diskCenter.y - 14, { align: "center", color: colors.accent, size: 14, weight: 700 });
    }

    drawLabel(context, "\\(\\operatorname{Re}\\phi'>0.35\\implies\\phi(z_1)\\ne\\phi(z_2)\\)", width / 2, height - 18, {
      align: "center",
      color: colors.teal,
      size: 14,
      weight: 700,
    });
  };

  const drawReconstructionSpectrum = (context, width, height) => {
    const compact = width < 520;
    const radius = Math.min(
      compact ? width * .21 : width * .175,
      compact ? height * .14 : height * .28,
    );
    const circleCenter = compact
      ? { x: width / 2, y: height * .27 }
      : { x: width * .25, y: height * .52 };
    const domainCenter = compact
      ? { x: width / 2, y: height * .73 }
      : { x: width * .75, y: height * .52 };

    context.beginPath();
    context.arc(circleCenter.x, circleCenter.y, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(17, 17, 17, .035)";
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 2;
    context.stroke();
    drawLabel(context, "linear map", circleCenter.x, circleCenter.y - radius - (compact ? 16 : 20), {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "Disk \\(\\mathbb{D}\\)", circleCenter.x, circleCenter.y + 5, {
      align: "center",
      color: colors.muted,
      size: 14,
    });

    context.beginPath();
    context.arc(domainCenter.x, domainCenter.y, radius, 0, Math.PI * 2);
    context.setLineDash([5, 5]);
    context.strokeStyle = "rgba(17, 17, 17, .34)";
    context.lineWidth = 1.4;
    context.stroke();
    context.setLineDash([]);
    traceConformalBoundary(context, domainCenter.x, domainCenter.y, radius, 1, {
      fill: colors.tealLight,
      stroke: colors.accent,
      lineWidth: 2.5,
    });
    drawLabel(context, "final non-disk domain", domainCenter.x, compact ? domainCenter.y + 5 : domainCenter.y - radius - 24, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    if (compact) {
      const arrowX = width / 2 + radius + 18;
      const fromY = circleCenter.y + radius * .72;
      const toY = domainCenter.y - radius * .72;
      drawArrow(context, arrowX, fromY, arrowX, toY, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "\\(q_1^*\\ne0\\)", width / 2, circleCenter.y + radius + 21, {
        align: "center",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
    } else {
      const fromX = circleCenter.x + radius + 24;
      const toX = domainCenter.x - radius - 24;
      drawArrow(context, fromX, circleCenter.y, toX, domainCenter.y, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "\\(q_1^*\\ne0\\)", (fromX + toX) / 2, circleCenter.y - 15, {
        align: "center",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
    }

    drawLabel(context, compact ? "\\(|q_1^*|>0.03459\\implies\\text{not linear}\\)" : "\\(|q_1^*|>0.03459\\), so the map is not linear", width / 2, height - 18, {
      align: "center",
      color: colors.accent,
      size: 14,
      weight: 700,
    });
  };

  const drawReconstruction = () => {
    if (!reconstructionCanvas) return;
    const rectangle = reconstructionCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(reconstructionCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);
    if (selectedReconstructionStage === 0) drawReconstructionEnclosure(context, width, height);
    else if (selectedReconstructionStage === 1) drawReconstructionUnivalence(context, width, height);
    else drawReconstructionSpectrum(context, width, height);
    const stage = reconstructionStages[selectedReconstructionStage];
    reconstructionCanvas.setAttribute(
      "aria-label",
      `Certified reconstruction check ${selectedReconstructionStage + 1} of 3: ${stage.label}. The plotted outline is the finite numerical centre; the exact boundary lies inside the certified enclosure and is visually indistinguishable at this scale. ${stage.status}`,
    );
  };

  const updateReconstruction = (nextStage = selectedReconstructionStage) => {
    selectedReconstructionStage = clamp(Math.round(Number(nextStage)), 0, 2);
    const stage = reconstructionStages[selectedReconstructionStage];
    syncDirectChoice(reconstructionStageButtons, selectedReconstructionStage);
    setInlineMathContent(reconstructionStatus, stage.statusMath);
    drawReconstruction();
  };
  reconstructionStageButtons.forEach((button) => {
    button.addEventListener("click", () => updateReconstruction(button.dataset.controlValue));
  });
  observeCanvas(reconstructionCanvas, drawReconstruction);
  requestAnimationFrame(() => updateReconstruction());


  const computerOverviewCanvas = document.getElementById("computerOverviewCanvas");
  const computerOverviewState = document.getElementById("computerOverviewState");
  const computerOverviewPlayButton = document.getElementById("computerOverviewPlayButton");
  const computerOverviewPlayIcon = document.getElementById("computerOverviewPlayIcon");
  const computerOverviewPlayLabel = document.getElementById("computerOverviewPlayLabel");
  const computerOverviewButtons = Array.from(document.querySelectorAll("[data-computer-overview-stage]"));
  const computerOverviewLabels = Array.from(document.querySelectorAll("#computerOverviewLabelLayer .computer-overview-label"));
  const computerOverviewReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  const computerOverviewPrefersReducedMotion = () => computerOverviewReducedMotion?.matches || false;

  const hideComputerOverviewLabels = () => {
    computerOverviewLabels.forEach((label) => label.classList.remove("is-visible"));
  };

  const placeComputerOverviewLabel = (id, x, y, options = {}) => {
    const label = document.getElementById(id);
    if (!label) return;
    const horizontal = options.align === "left" ? "0" : options.align === "right" ? "-100%" : "-50%";
    const vertical = options.baseline === "top" ? "0" : options.baseline === "bottom" ? "-100%" : "-50%";
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.style.transform = `translate(${horizontal}, ${vertical})`;
    label.classList.add("is-visible");
  };

  const computerOverviewStages = Object.freeze([
    Object.freeze({
      title: "Follow c to zero",
      note: "Start at a relaxed disk frequency where the radial and tenfold boundary responses align, opening a tenfold direction with ∂νu = c. Numerical continuation changes the domain and c; stop when c reaches zero, and store that endpoint as x°.",
      noteMath: "Start at a relaxed disk frequency where the radial \\(J_1\\) and tenfold \\(J_{10}\\) boundary responses align, opening a tenfold direction with \\(\\partial_\\nu u=c\\). Numerical continuation changes the domain and \\(c\\); stop when \\(c\\) reaches zero, and store that endpoint as \\(x^\\circ\\).",
      animation: 3000,
      hold: 3400,
    }),
    Object.freeze({
      title: "Move every candidate to one disk",
      note: "The conformal map φₚ carries the unit disk to the candidate domain. Pulling the field back through this map gives U = u ∘ φₚ, the same Helmholtz field in fixed disk coordinates. The geometry is stored in p = kφₚ′.",
      noteMath: "The conformal map \\(\\phi_p\\) carries the unit disk to the candidate domain. Pulling the field back through this map gives \\(U=u\\circ\\phi_p\\), the same Helmholtz field in fixed disk coordinates. The geometry is stored in \\(p=k\\phi_p'\\).",
      animation: 2400,
      hold: 3000,
    }),
    Object.freeze({
      title: "One point means two functions",
      note: "The unknown lives in a Banach space X of function pairs. One point x = (g,p) contains a function g describing the transformed Helmholtz field and a function p describing the conformal shape. The two displayed directions are only a schematic slice through X: moving in the g direction changes the interior field, while moving in the p direction changes the boundary. The exact solution will be one special point x*.",
      noteMath: "The unknown lives in a Banach space \\(X\\) of function pairs. One point \\(x=(g,p)\\) contains a function \\(g\\) describing the transformed Helmholtz field and a function \\(p\\) describing the conformal shape. The two displayed directions are only a schematic slice through \\(X\\): moving in the \\(g\\) direction changes the interior field, while moving in the \\(p\\) direction changes the boundary. The exact solution will be one special point \\(x^*\\).",
      animation: 3200,
      hold: 3800,
    }),
    Object.freeze({
      title: "Prove convergence",
      note: "At r = 10⁻⁶, the certified bound ‖T(x) − x°‖ ≤ Y + Zr + C₂r² + C₃r³ < 0.622r holds for every x in the ball. Here Y bounds the error at the centre, Z the linear change, and C₂,C₃ the nonlinear change. Every Newton step therefore stays inside the ball. A second estimate shows that T shrinks distances there by a factor less than 0.622, so its iterates converge to one exact zero x*.",
      noteMath: "At \\(r=10^{-6}\\), the certified bound \\(\\lVert T(x)-x^\\circ\\rVert\\le Y+Zr+C_2r^2+C_3r^3<0.622r\\) holds for every \\(x\\) in the ball. Here \\(Y\\) bounds the error at the centre, \\(Z\\) the linear change, and \\(C_2,C_3\\) the nonlinear change. Every Newton step therefore stays inside the ball. A second estimate shows that \\(T\\) shrinks distances there by a factor less than \\(0.622\\), so its iterates converge to one exact zero \\(x^*\\).",
      animation: 2800,
      hold: 4000,
    }),
    Object.freeze({
      title: "Recover the field and domain",
      note: "The numerical centre x° = (g°,p°) already produces the computed domain and field. The contraction replaces it by the certified pair x* = (g*,p*), which produces the certified Schiffer domain and field.",
      noteMath: "The numerical centre \\(x^\\circ=(g^\\circ,p^\\circ)\\) already produces the computed domain and field. The contraction replaces it by the certified pair \\(x^*=(g^*,p^*)\\), which produces the certified Schiffer domain and field.",
      animation: 2200,
      hold: 2800,
    }),
  ]);
  let computerOverviewStage = 0;
  let computerOverviewStageStarted = performance.now();
  let computerOverviewNextAuto = computerOverviewStageStarted + computerOverviewStages[0].hold;
  let computerOverviewPlaying = false;
  let computerOverviewFrame = 0;

  const computerOverviewEase = (amount) => {
    const value = clamp(amount, 0, 1);
    return value * value * (3 - 2 * value);
  };

  const computerOverviewArea = (width, height) => {
    const laboratory = computerOverviewCanvas?.closest(".computer-overview-laboratory");
    const token = laboratory
      ? parseFloat(getComputedStyle(laboratory).getPropertyValue("--geometry-key-width")) / 100
      : 0;
    const keyFraction = Number.isFinite(token) ? clamp(token, 0, .42) : 0;
    const left = width * (keyFraction + (keyFraction > 0 ? .052 : .06));
    const right = width * .048;
    const top = height * .06;
    const bottom = height * .06;
    return {
      x: left,
      y: top,
      width: Math.max(80, width - left - right),
      height: Math.max(80, height - top - bottom),
    };
  };

  const drawOverviewDomain = (context, centerX, centerY, radius, amplitude, options = {}) => {
    context.beginPath();
    for (let index = 0; index <= 360; index += 1) {
      const theta = index / 360 * Math.PI * 2;
      const point = conformalPoint(1, theta, 30, amplitude);
      const x = centerX + point.x * radius;
      const y = centerY - point.y * radius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = options.fill || "rgba(7, 87, 96, .08)";
    context.fill();
    context.strokeStyle = options.stroke || colors.accent;
    context.lineWidth = options.lineWidth || 2;
    context.stroke();
  };

  // A schematic field measured relative to its boundary value.  The squared
  // envelope makes both the value and its radial derivative vanish at r = 1.
  const overviewCompatibleFieldValue = (radius, theta) => {
    const envelope = (1 - radius * radius) ** 2;
    return envelope * (
      .68 * Math.cos(3 * Math.PI * radius)
      + .42 * radius * radius * Math.cos(10 * theta)
    );
  };

  const overviewFieldColor = (value) => {
    const paper = [255, 255, 248];
    const target = value >= 0 ? [160, 0, 0] : [7, 87, 96];
    const strength = .86 * Math.sqrt(clamp(Math.abs(value) / .72, 0, 1));
    const channels = paper.map((channel, index) => Math.round(mix(channel, target[index], strength)));
    return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
  };

  const drawOverviewMappedField = (context, centerX, centerY, radius, amplitude, options = {}) => {
    const rings = options.rings || 12;
    const sectors = options.sectors || 48;
    const alpha = options.alpha ?? 1;
    const cutoff = options.cutoff || 5;
    const valueAt = options.valueAt || overviewCompatibleFieldValue;
    const thetaOverlap = Math.PI / sectors * .035;
    const radiusOverlap = 1 / rings * .025;

    context.save();
    context.globalAlpha *= alpha;
    for (let ring = 0; ring < rings; ring += 1) {
      const inner = Math.max(0, ring / rings - radiusOverlap);
      const outer = Math.min(1, (ring + 1) / rings + radiusOverlap);
      const sampleRadius = (ring + .5) / rings;
      for (let sector = 0; sector < sectors; sector += 1) {
        const thetaStart = sector / sectors * Math.PI * 2 - thetaOverlap;
        const thetaEnd = (sector + 1) / sectors * Math.PI * 2 + thetaOverlap;
        const sampleTheta = (sector + .5) / sectors * Math.PI * 2;
        const points = [
          conformalPoint(inner, thetaStart, cutoff, amplitude),
          conformalPoint(outer, thetaStart, cutoff, amplitude),
          conformalPoint(outer, thetaEnd, cutoff, amplitude),
          conformalPoint(inner, thetaEnd, cutoff, amplitude),
        ];
        context.beginPath();
        points.forEach((point, index) => {
          const x = centerX + point.x * radius;
          const y = centerY - point.y * radius;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.closePath();
        context.fillStyle = overviewFieldColor(valueAt(sampleRadius, sampleTheta));
        context.fill();
      }
    }
    drawOverviewDomain(context, centerX, centerY, radius, amplitude, {
      fill: "rgba(255, 255, 248, 0)",
      stroke: options.stroke || colors.heading,
      lineWidth: options.lineWidth || 1.8,
    });
    context.restore();
  };

  const drawSimpleOverviewSearch = (context, area, motion) => {
    const compact = area.width < 420;
    const progress = computerOverviewEase(clamp(motion, 0, 1));
    const center = compact
      ? { x: area.x + area.width * .50, y: area.y + area.height * .31 }
      : { x: area.x + area.width * .22, y: area.y + area.height * .43 };
    const radius = Math.min(
      area.width * (compact ? .20 : .15),
      area.height * (compact ? .20 : .27),
    );

    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.setLineDash([4, 5]);
    context.strokeStyle = "rgba(17, 17, 17, .25)";
    context.lineWidth = 1;
    context.stroke();
    context.setLineDash([]);
    drawOverviewDomain(context, center.x, center.y, radius, progress, {
      fill: "rgba(7, 87, 96, .07)",
      stroke: colors.accent,
      lineWidth: 2.2,
    });

    const arrowLength = (compact ? 13 : 18) * (1 - progress);
    if (arrowLength > 1.2) {
      const arrowCount = 6;
      for (let index = 0; index < arrowCount; index += 1) {
        const theta = (index + .5) / arrowCount * Math.PI * 2;
        const point = conformalPoint(1, theta, 30, progress);
        const before = conformalPoint(1, theta - .002, 30, progress);
        const after = conformalPoint(1, theta + .002, 30, progress);
        const boundaryX = center.x + point.x * radius;
        const boundaryY = center.y - point.y * radius;
        const tangentX = (after.x - before.x) * radius;
        const tangentY = -(after.y - before.y) * radius;
        let normalX = tangentY;
        let normalY = -tangentX;
        const normalLength = Math.hypot(normalX, normalY) || 1;
        normalX /= normalLength;
        normalY /= normalLength;
        const radialX = boundaryX - center.x;
        const radialY = boundaryY - center.y;
        if (normalX * radialX + normalY * radialY < 0) {
          normalX *= -1;
          normalY *= -1;
        }
        drawArrow(
          context,
          boundaryX + normalX * 2,
          boundaryY + normalY * 2,
          boundaryX + normalX * arrowLength,
          boundaryY + normalY * arrowLength,
          { color: colors.gold, width: 1.4, head: Math.min(4, arrowLength * .32) },
        );
      }
    }

    placeComputerOverviewLabel(
      progress < .92 ? "overviewSearchFlux" : "overviewSearchFluxZero",
      center.x,
      center.y + radius + 28,
    );

    const fluxLeft = area.x + area.width * (compact ? .16 : .53);
    const fluxRight = area.x + area.width * (compact ? .84 : .91);
    const fluxY = area.y + area.height * (compact ? .76 : .45);
    drawArrow(context, fluxLeft, fluxY, fluxRight, fluxY, { color: colors.ruleDark, width: 1.2, head: 5 });
    const fluxMarkerX = mix(fluxLeft, fluxRight, progress);
    context.beginPath();
    context.arc(fluxMarkerX, fluxY, compact ? 4 : 5, 0, Math.PI * 2);
    context.fillStyle = progress > .96 ? colors.accent : colors.gold;
    context.fill();
    const endpointLabelY = fluxY + (compact ? 16 : 25);
    placeComputerOverviewLabel("overviewSearchStart", fluxLeft, endpointLabelY);
    placeComputerOverviewLabel("overviewSearchEnd", fluxRight, endpointLabelY);
    if (progress > .78) {
      placeComputerOverviewLabel(
        "overviewSearchCenter",
        fluxRight,
        compact ? area.y + area.height - 1 : fluxY + 58,
        compact ? { align: "right", baseline: "bottom" } : {},
      );
    }
  };

  const drawSimpleOverviewDisk = (context, area, motion) => {
    const progress = computerOverviewEase(clamp(motion, 0, 1));
    const start = { x: area.x + area.width * .22, y: area.y + area.height * .43 };
    const end = { x: area.x + area.width * .72, y: area.y + area.height * .43 };
    const radius = Math.min(area.width * .15, area.height * .27);

    drawOverviewDomain(context, start.x, start.y, radius, 1, {
      fill: "rgba(160, 0, 0, .045)",
      stroke: colors.accent,
      lineWidth: 2,
    });
    context.beginPath();
    context.arc(end.x, end.y, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(7, 87, 96, .045)";
    context.fill();
    context.strokeStyle = colors.teal;
    context.lineWidth = 2;
    context.stroke();
    placeComputerOverviewLabel("overviewDiskDomain", start.x, start.y + radius + 25);
    placeComputerOverviewLabel("overviewDiskUnit", end.x, end.y + radius + 25);

    const leftEdge = start.x + radius + area.width * .025;
    const rightEdge = end.x - radius - area.width * .025;
    const middleX = (leftEdge + rightEdge) / 2;
    const mapReveal = computerOverviewEase(clamp(progress / .48, 0, 1));
    const fieldReveal = computerOverviewEase(clamp((progress - .32) / .68, 0, 1));
    placeComputerOverviewLabel("overviewDiskMap", middleX, start.y - 28);
    placeComputerOverviewLabel("overviewDiskField", middleX, start.y + 30);

    if (mapReveal > .001) {
      const currentX = mix(rightEdge, leftEdge, mapReveal);
      if (rightEdge - currentX > 2) {
        drawArrow(context, rightEdge, start.y - 10, currentX, start.y - 10, { color: colors.teal, width: 1.7, head: 5 });
      }
    }

    if (fieldReveal > .001) {
      const currentX = mix(leftEdge, rightEdge, fieldReveal);
      if (currentX - leftEdge > 2) {
        drawArrow(context, leftEdge, start.y + 10, currentX, start.y + 10, { color: colors.accent, width: 1.7, head: 5 });
      }
    }
  };

  const drawSimpleOverviewInverse = (context, area, motion) => {
    const compact = area.width < 420;
    const progress = computerOverviewEase(clamp(motion, 0, 1));
    const centerY = area.y + area.height * .54;
    const spaceCenter = { x: area.x + area.width * .25, y: centerY };
    const domainCenter = { x: area.x + area.width * .75, y: centerY };
    const spaceRadius = Math.min(area.width * .18, area.height * .27);
    const domainRadius = Math.min(area.width * .17, area.height * .25);
    const spaceTrajectory = (amount) => ({
      p: mix(-.62, .62, amount),
      g: .10 + .34 * Math.sin(amount * Math.PI),
    });
    const coordinates = spaceTrajectory(progress);
    const pCoordinate = coordinates.p;
    const gCoordinate = coordinates.g;
    const point = {
      x: spaceCenter.x + pCoordinate * spaceRadius,
      y: spaceCenter.y - gCoordinate * spaceRadius,
    };
    const shapeAmplitude = 1.05 + 1.15 * pCoordinate;
    const varyingField = (radius, theta) => {
      const envelope = (1 - radius * radius) ** 2;
      return envelope * (
        .68 * Math.cos((3 + .24 * gCoordinate) * Math.PI * radius + .45 * gCoordinate)
        + (.42 + .10 * gCoordinate) * radius * radius * Math.cos(10 * theta + .70 * gCoordinate)
      );
    };

    placeComputerOverviewLabel("overviewSpacePair", area.x + area.width * .50, area.y + area.height * .10);
    context.beginPath();
    context.arc(spaceCenter.x, spaceCenter.y, spaceRadius, 0, Math.PI * 2);
    context.strokeStyle = colors.rule;
    context.lineWidth = 1.2;
    context.stroke();
    drawArrow(context, spaceCenter.x - spaceRadius * .72, spaceCenter.y, spaceCenter.x + spaceRadius * .78, spaceCenter.y, {
      color: colors.teal,
      width: 1.3,
      head: 4,
    });
    drawArrow(context, spaceCenter.x, spaceCenter.y + spaceRadius * .72, spaceCenter.x, spaceCenter.y - spaceRadius * .78, {
      color: colors.accent,
      width: 1.3,
      head: 4,
    });
    placeComputerOverviewLabel("overviewSpaceShape", spaceCenter.x + spaceRadius * .76, spaceCenter.y + 20, { align: "right" });
    placeComputerOverviewLabel("overviewSpaceField", spaceCenter.x + 8, spaceCenter.y - spaceRadius * .76, { align: "left" });

    context.beginPath();
    const pathSamples = 60;
    const revealedSamples = Math.max(1, Math.ceil(pathSamples * progress));
    for (let index = 0; index <= revealedSamples; index += 1) {
      const amount = Math.min(index / pathSamples, progress);
      const pathCoordinates = spaceTrajectory(amount);
      const x = spaceCenter.x + pathCoordinates.p * spaceRadius;
      const y = spaceCenter.y - pathCoordinates.g * spaceRadius;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.setLineDash([3, 4]);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1;
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(point.x, point.y, compact ? 4.5 : 5.5, 0, Math.PI * 2);
    context.fillStyle = colors.heading;
    context.fill();
    placeComputerOverviewLabel("overviewSpacePoint", point.x + 9, point.y - 8, { align: "left" });

    drawArrow(context, spaceCenter.x + spaceRadius + area.width * .025, centerY, domainCenter.x - domainRadius - area.width * .025, centerY, {
      color: colors.ruleDark,
      width: 1.2,
      head: 5,
    });
    drawOverviewMappedField(context, domainCenter.x, domainCenter.y, domainRadius, shapeAmplitude, {
      rings: compact ? 8 : 9,
      sectors: compact ? 32 : 36,
      stroke: colors.teal,
      lineWidth: 2,
      valueAt: varyingField,
    });
  };

  const drawSimpleOverviewFixedPoint = (context, area, motion) => {
    const compact = area.width < 420;
    const progress = computerOverviewEase(clamp(motion, 0, 1));
    const center = {
      x: area.x + area.width * .79,
      y: area.y + area.height * .47,
    };
    const radius = Math.min(
      area.width * .20,
      area.height * .35,
    );
    const imageRadius = radius * .622;
    const target = {
      x: center.x + imageRadius * .43,
      y: center.y - imageRadius * .16,
    };

    const formulaX = area.x + area.width * .005;
    const formulaAlignment = { align: "left" };
    placeComputerOverviewLabel("overviewFixedBound", formulaX, center.y - (compact ? 46 : 52), formulaAlignment);
    placeComputerOverviewLabel(
      "overviewFixedContraction",
      formulaX,
      center.y + (compact ? 50 : 55),
      formulaAlignment,
    );
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(17, 17, 17, .025)";
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.8;
    context.stroke();
    context.beginPath();
    context.arc(center.x, center.y, imageRadius, 0, Math.PI * 2);
    context.fillStyle = colors.tealLight;
    context.fill();
    context.strokeStyle = colors.teal;
    context.lineWidth = 2;
    context.stroke();
    placeComputerOverviewLabel("overviewFixedBall", center.x, center.y - radius - 17);
    placeComputerOverviewLabel(
      "overviewFixedImage",
      center.x - imageRadius * .3,
      center.y - imageRadius * .52,
    );

    context.beginPath();
    context.moveTo(center.x - 5, center.y);
    context.lineTo(center.x + 5, center.y);
    context.moveTo(center.x, center.y - 5);
    context.lineTo(center.x, center.y + 5);
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.3;
    context.stroke();
    placeComputerOverviewLabel("overviewFixedCenter", center.x - 7, center.y + 15, { align: "right" });

    const q = .621244;
    const orbit = [];
    for (let step = 0; step <= 6; step += 1) {
      const startX = center.x - target.x;
      const startY = center.y - target.y;
      const shrink = q ** step;
      const angle = step * .52;
      orbit.push({
        x: target.x + shrink * (startX * Math.cos(angle) - startY * Math.sin(angle)),
        y: target.y + shrink * (startX * Math.sin(angle) + startY * Math.cos(angle)),
      });
    }
    const orbitPosition = progress * (orbit.length - 1);
    const fullStep = Math.floor(orbitPosition);
    context.beginPath();
    orbit.forEach((point, index) => {
      if (index > fullStep) return;
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    if (fullStep < orbit.length - 1) {
      const partial = orbitPosition - fullStep;
      const from = orbit[fullStep];
      const to = orbit[fullStep + 1];
      context.lineTo(mix(from.x, to.x, partial), mix(from.y, to.y, partial));
    }
    context.strokeStyle = colors.accent;
    context.lineWidth = 1.8;
    context.stroke();
    orbit.forEach((point, index) => {
      if (index > fullStep) return;
      context.beginPath();
      context.arc(point.x, point.y, index === fullStep ? (compact ? 3.2 : 4) : (compact ? 2 : 2.5), 0, Math.PI * 2);
      context.fillStyle = index === 0 ? colors.heading : colors.accent;
      context.fill();
    });
    context.beginPath();
    context.arc(target.x, target.y, compact ? 2.8 : 3.5, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 2;
    context.stroke();
    placeComputerOverviewLabel("overviewFixedTarget", target.x + 8, target.y - 8, { align: "left" });
  };

  const drawSimpleOverviewFinalDomain = (context, area, motion) => {
    const compact = area.width < 420;
    const progress = computerOverviewEase(clamp(motion, 0, 1));
    const rows = [
      {
        y: area.y + area.height * .29,
        pairLabel: "overviewFinalCenterPair",
        outputLabel: "overviewFinalCenterOutput",
        amplitude: .96,
        exact: false,
      },
      {
        y: area.y + area.height * .72,
        pairLabel: "overviewFinalPair",
        outputLabel: "overviewFinalDomain",
        amplitude: mix(.96, 1, progress),
        exact: true,
      },
    ];
    const pairX = area.x + area.width * .20;
    const arrowStartX = area.x + area.width * .34;
    const arrowEndX = area.x + area.width * .47;
    const outputX = area.x + area.width * .62;
    const rowHeadingX = (pairX + outputX) / 2;
    const outputRadius = Math.min(
      area.width * (compact ? .105 : .11),
      area.height * .16,
    );

    rows.forEach((row) => {
      placeComputerOverviewLabel(row.pairLabel, pairX, row.y);
      drawOutlinedFilledArrow(context, arrowStartX, row.y, arrowEndX, row.y, {
        fill: colors.white,
        stroke: colors.heading,
        lineWidth: 2,
        shaftHalfWidth: compact ? 7 : 9,
        headHalfWidth: compact ? 13 : 17,
        headLength: compact ? 17 : 22,
      });
      if (row.exact) {
        context.save();
        context.globalAlpha = .15;
        drawOverviewDomain(context, outputX, row.y, outputRadius + 4, row.amplitude, {
          fill: "rgba(7, 87, 96, .08)",
          stroke: colors.teal,
          lineWidth: 7,
        });
        context.restore();
      }
      drawOverviewMappedField(context, outputX, row.y, outputRadius, row.amplitude, {
        rings: compact ? 7 : 9,
        sectors: compact ? 28 : 36,
        alpha: row.exact ? 1 : .76,
        stroke: row.exact ? colors.teal : colors.ruleDark,
        lineWidth: row.exact ? 2.6 : 1.5,
      });
      placeComputerOverviewLabel(
        row.outputLabel,
        rowHeadingX,
        row.y - outputRadius - (compact ? 14 : 18),
      );
    });
  };

  const computerOverviewDrawers = Object.freeze([
    drawSimpleOverviewSearch,
    drawSimpleOverviewDisk,
    drawSimpleOverviewInverse,
    drawSimpleOverviewFixedPoint,
    drawSimpleOverviewFinalDomain,
  ]);

  const drawComputerOverviewBackdrop = (context, width, height) => {
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
  };

  const drawComputerOverviewContent = (context, width, height, stageIndex, now, stageStarted) => {
    hideComputerOverviewLabels();
    const stage = computerOverviewStages[stageIndex];
    const elapsed = Math.max(0, now - stageStarted);
    const motion = computerOverviewPrefersReducedMotion() ? 1 : clamp(elapsed / stage.animation, 0, 1);
    const area = computerOverviewArea(width, height);
    computerOverviewDrawers[stageIndex](context, area, motion);
  };

  const updateComputerOverviewInterface = (active) => {
    const stage = computerOverviewStages[active];
    setInlineMathContent(computerOverviewState, stage.noteMath);
    computerOverviewButtons.forEach((button, index) => {
      button.classList.toggle("active", index === active);
      button.setAttribute("aria-pressed", String(index === active));
    });
    if (computerOverviewCanvas) {
      computerOverviewCanvas.setAttribute(
        "aria-label",
        `Computer-assisted construction stage ${active + 1} of ${computerOverviewStages.length}: ${stage.title}. ${stage.note}`,
      );
    }
  };

  const updateComputerOverviewPlayButton = () => {
    if (computerOverviewPlayIcon) computerOverviewPlayIcon.textContent = computerOverviewPlaying ? "Ⅱ" : "▶";
    if (computerOverviewPlayLabel) {
      computerOverviewPlayLabel.textContent = computerOverviewPlaying
        ? "Pause"
        : computerOverviewStage === computerOverviewStages.length - 1
          ? "Repeat"
          : "Animate";
    }
    if (computerOverviewPlayButton) computerOverviewPlayButton.setAttribute("aria-pressed", String(computerOverviewPlaying));
  };

  const renderComputerOverview = (timestamp = performance.now()) => {
    if (!computerOverviewCanvas) return false;
    const rectangle = computerOverviewCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 120) {
      hideComputerOverviewLabels();
      return false;
    }
    const { context, width, height } = prepareCanvas(computerOverviewCanvas, { maxPixelRatio: 4 });
    drawComputerOverviewBackdrop(context, width, height);
    drawComputerOverviewContent(context, width, height, computerOverviewStage, timestamp, computerOverviewStageStarted);
    updateComputerOverviewInterface(computerOverviewStage);
    updateComputerOverviewPlayButton();
    return true;
  };

  const computerOverviewNeedsFrame = (now) => {
    if (computerOverviewPlaying) return true;
    return !computerOverviewPrefersReducedMotion()
      && now - computerOverviewStageStarted < computerOverviewStages[computerOverviewStage].animation;
  };

  const scheduleComputerOverview = () => {
    if (!computerOverviewFrame) computerOverviewFrame = requestAnimationFrame(tickComputerOverview);
  };

  const showComputerOverviewStage = (target, now = performance.now()) => {
    const requested = clamp(Math.round(target), 0, computerOverviewStages.length - 1);
    computerOverviewStage = requested;
    computerOverviewStageStarted = now;
    computerOverviewNextAuto = now + computerOverviewStages[requested].hold;
    renderComputerOverview(now);
    scheduleComputerOverview();
  };

  const pauseComputerOverview = () => {
    computerOverviewPlaying = false;
    updateComputerOverviewPlayButton();
  };

  function tickComputerOverview(now) {
    computerOverviewFrame = 0;
    if (computerOverviewPlaying && now >= computerOverviewNextAuto) {
      if (computerOverviewStage >= computerOverviewStages.length - 1) {
        computerOverviewPlaying = false;
      } else {
        computerOverviewStage += 1;
        computerOverviewStageStarted = now;
        computerOverviewNextAuto = now + computerOverviewStages[computerOverviewStage].hold;
      }
    }
    renderComputerOverview(now);
    if (computerOverviewNeedsFrame(now)) scheduleComputerOverview();
  }

  const playComputerOverview = () => {
    const now = performance.now();
    if (computerOverviewPlaying) {
      pauseComputerOverview();
      return;
    }
    if (computerOverviewPrefersReducedMotion()) {
      computerOverviewStage = computerOverviewStages.length - 1;
      computerOverviewStageStarted = now;
      renderComputerOverview(now);
      updateComputerOverviewPlayButton();
      return;
    }
    computerOverviewPlaying = true;
    if (computerOverviewStage === computerOverviewStages.length - 1) computerOverviewStage = 0;
    computerOverviewStageStarted = now;
    computerOverviewNextAuto = now + computerOverviewStages[computerOverviewStage].hold;
    renderComputerOverview(now);
    scheduleComputerOverview();
  };

  computerOverviewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const now = performance.now();
      pauseComputerOverview();
      showComputerOverviewStage(Number(button.dataset.computerOverviewStage), now);
    });
  });
  if (computerOverviewPlayButton) computerOverviewPlayButton.addEventListener("click", playComputerOverview);
  computerOverviewReducedMotion?.addEventListener?.("change", (event) => {
    if (!event.matches) return;
    pauseComputerOverview();
    computerOverviewStageStarted = performance.now()
      - computerOverviewStages[computerOverviewStage].animation;
    renderComputerOverview(performance.now());
  });
  observeCanvas(computerOverviewCanvas, () => {
    renderComputerOverview(performance.now());
    scheduleComputerOverview();
  });
  window.addEventListener("resize", () => {
    renderComputerOverview(performance.now());
    scheduleComputerOverview();
  }, { passive: true });
  updateComputerOverviewPlayButton();
  scheduleComputerOverview();

  const quotientCanvas = document.getElementById("quotientCanvas");
  const quotientStatus = document.getElementById("quotientStatus");
  const quotientButtons = Array.from(document.querySelectorAll("[data-quotient-stage]"));
  let quotientStage = 0;
  const quotientDescriptions = [
    "An N-fold planar domain is made from repeated sectors.",
    "Quotienting by the rotations leaves one sector; its radial edges are identified.",
    "After rescaling the angle, the collar equation makes sense for real R. The core is retained through its Dirichlet-to-Neumann map.",
    "When R reaches the integer N, N copies close without a seam and give a planar domain.",
  ];

  const drawPerturbedCircle = (context, centerX, centerY, radius, sectors, options = {}) => {
    context.beginPath();
    for (let index = 0; index <= 720; index += 1) {
      const theta = index / 720 * Math.PI * 2;
      const localRadius = radius * (1 + .07 * Math.cos(sectors * theta));
      const x = centerX + localRadius * Math.cos(theta);
      const y = centerY - localRadius * Math.sin(theta);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fillStyle = options.fill || "rgba(7, 87, 96, .07)";
    context.fill();
    context.strokeStyle = options.stroke || colors.accent;
    context.lineWidth = options.lineWidth || 2.2;
    context.stroke();
  };

  const drawQuotient = () => {
    if (!quotientCanvas) return;
    const { context, width, height } = prepareCanvas(quotientCanvas, 300);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
    const compact = width < 460;
    const centerX = width / 2;
    const centerY = height / 2 - 4;
    const sectors = 12;

    if (quotientStage === 0 || quotientStage === 3) {
      const radius = Math.min(width, height) * .34;
      drawPerturbedCircle(context, centerX, centerY, radius, sectors);
      context.strokeStyle = colors.ruleDark;
      context.lineWidth = 1;
      for (let index = 0; index < sectors; index += 1) {
        const theta = index / sectors * Math.PI * 2;
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(centerX + radius * 1.07 * Math.cos(theta), centerY - radius * 1.07 * Math.sin(theta));
        context.stroke();
      }
      drawLabel(context, quotientStage === 0 ? "N-fold planar domain" : "N sectors close at R = N", centerX, 24, {
        align: "center",
        color: colors.heading,
        size: compact ? 11 : 13,
      });
    } else if (quotientStage === 1) {
      const radius = Math.min(width * .74, height * .72);
      const angle = compact ? .46 : .34;
      const leftAngle = -angle;
      const rightAngle = angle;
      const originX = width * .2;
      const originY = centerY;
      context.beginPath();
      context.moveTo(originX, originY);
      context.lineTo(originX + radius * Math.cos(leftAngle), originY + radius * Math.sin(leftAngle));
      context.arc(originX, originY, radius, leftAngle, rightAngle);
      context.closePath();
      context.fillStyle = "rgba(7, 87, 96, .07)";
      context.fill();
      context.strokeStyle = colors.accent;
      context.lineWidth = 2.2;
      context.stroke();
      context.setLineDash([5, 4]);
      context.strokeStyle = colors.ruleDark;
      context.beginPath();
      context.moveTo(originX, originY);
      context.lineTo(originX + radius * Math.cos(leftAngle), originY + radius * Math.sin(leftAngle));
      context.moveTo(originX, originY);
      context.lineTo(originX + radius * Math.cos(rightAngle), originY + radius * Math.sin(rightAngle));
      context.stroke();
      context.setLineDash([]);
      drawLabel(context, "identified radial edges", width - 24, height - 24, { align: "right", size: 11 });
      drawLabel(context, "one fundamental sector", 24, 25, { color: colors.heading, size: 13 });
    } else {
      const left = compact ? 34 : 56;
      const right = width - left;
      const top = 58;
      const bottom = height - 54;
      const interfaceX = left + (right - left) * .35;
      context.fillStyle = colors.soft;
      context.fillRect(left, top, interfaceX - left, bottom - top);
      context.fillStyle = "rgba(7, 87, 96, .08)";
      context.fillRect(interfaceX, top, right - interfaceX, bottom - top);
      context.strokeStyle = colors.heading;
      context.lineWidth = 1.5;
      context.strokeRect(left, top, right - left, bottom - top);
      context.setLineDash([6, 4]);
      context.strokeStyle = colors.accent;
      context.beginPath();
      context.moveTo(interfaceX, top);
      context.lineTo(interfaceX, bottom);
      context.stroke();
      context.setLineDash([]);
      for (let index = 0; index < 5; index += 1) {
        const y = top + 22 + index * (bottom - top - 44) / 4;
        context.beginPath();
        context.moveTo(left + 10, y);
        for (let step = 1; step <= 80; step += 1) {
          const x = left + 10 + step / 80 * (right - left - 20);
          const localY = y + 7 * Math.sin(step / 80 * Math.PI * 4);
          context.lineTo(x, localY);
        }
        context.strokeStyle = index === 2 ? colors.accent : colors.ruleDark;
        context.lineWidth = index === 2 ? 1.8 : 1;
        context.stroke();
      }
      drawLabel(context, "regular core", left + 12, top - 14, { size: 11 });
      drawLabel(context, "fixed collar", right - 12, top - 14, { align: "right", color: colors.accent, size: 11 });
      drawLabel(context, "DtN interface", interfaceX, bottom + 24, { align: "center", color: colors.accent, size: 11 });
      drawLabel(context, "order R", width / 2, 25, { align: "center", color: colors.heading, size: 13 });
    }

    quotientCanvas.setAttribute("aria-label", quotientDescriptions[quotientStage]);
  };

  const selectQuotientStage = (stage) => {
    quotientStage = Math.max(0, Math.min(3, stage));
    quotientButtons.forEach((button) => button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.quotientStage) === quotientStage),
    ));
    if (quotientStatus) quotientStatus.textContent = quotientDescriptions[quotientStage];
    drawQuotient();
  };
  quotientButtons.forEach((button) => button.addEventListener("click", () => selectQuotientStage(Number(button.dataset.quotientStage))));
  selectQuotientStage(0);
  observeCanvas(quotientCanvas, drawQuotient);

  const branchCanvas = document.getElementById("branchCanvas");
  const branchGap = document.getElementById("branchGap");
  const branchGapValue = document.getElementById("branchGapValue");
  const branchStatus = document.getElementById("branchStatus");
  let selectedGap = .08;

  const drawBranch = () => {
    if (!branchCanvas) return;
    const { context, width, height } = prepareCanvas(branchCanvas, 300);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
    const compact = width < 460;
    const margin = compact
      ? { left: 50, right: 18, top: 38, bottom: 50 }
      : { left: 68, right: 28, top: 42, bottom: 56 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const xMin = -.55;
    const xMax = .55;
    const yMin = -.24;
    const yMax = .22;
    const mapX = (value) => margin.left + (value - xMin) / (xMax - xMin) * plotWidth;
    const mapY = (value) => margin.top + (yMax - value) / (yMax - yMin) * plotHeight;

    [-.2, -.1, 0, .1, .2].forEach((value) => {
      const y = mapY(value);
      context.beginPath();
      context.strokeStyle = value === 0 ? colors.heading : colors.rule;
      context.lineWidth = value === 0 ? 1.4 : 1;
      context.moveTo(margin.left, y);
      context.lineTo(width - margin.right, y);
      context.stroke();
      drawLabel(context, value.toFixed(1), margin.left - 9, y, { align: "right", baseline: "middle", size: 10 });
    });
    [-.5, -.25, 0, .25, .5].forEach((value) => {
      drawLabel(context, value.toFixed(2).replace("0.", "."), mapX(value), height - margin.bottom + 19, { align: "center", size: 10 });
    });
    drawLabel(context, "R(s) − N", margin.left, 19, { color: colors.heading, size: 11 });
    drawLabel(context, "branch amplitude s", width - margin.right, height - 12, { align: "right", size: 11 });

    context.beginPath();
    for (let index = 0; index <= 260; index += 1) {
      const s = xMin + index / 260 * (xMax - xMin);
      const value = selectedGap - s * s;
      const x = mapX(s);
      const y = mapY(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.4;
    context.stroke();

    const crossing = Math.sqrt(selectedGap);
    [-crossing, crossing].forEach((s) => {
      context.beginPath();
      context.arc(mapX(s), mapY(0), 5, 0, Math.PI * 2);
      context.fillStyle = colors.white;
      context.fill();
      context.strokeStyle = colors.heading;
      context.lineWidth = 2;
      context.stroke();
    });
    context.beginPath();
    context.arc(mapX(0), mapY(selectedGap), 5, 0, Math.PI * 2);
    context.fillStyle = colors.accent;
    context.fill();
    drawLabel(context, "R* − N = δ", mapX(0) + 9, mapY(selectedGap) - 8, { color: colors.accent, size: 11 });

    branchCanvas.setAttribute(
      "aria-label",
      `Normalized quadratic branch R of s minus N equals delta minus s squared, with delta ${selectedGap.toFixed(2)}. The integer level is reached at absolute s ${crossing.toFixed(3)}.`,
    );
  };

  const updateBranch = () => {
    selectedGap = Math.max(.02, Math.min(.2, Number(branchGap?.value || 8) / 100));
    const crossing = Math.sqrt(selectedGap);
    if (branchGapValue) branchGapValue.textContent = selectedGap.toFixed(2);
    if (branchGap) branchGap.setAttribute("aria-valuetext", `Initial gap ${selectedGap.toFixed(2)}; normalized crossing amplitude ${crossing.toFixed(3)}`);
    if (branchStatus) branchStatus.textContent = `For δ = ${selectedGap.toFixed(2)}, the normalized model reaches the integer level at |s| = ${crossing.toFixed(3)}.`;
    drawBranch();
  };
  if (branchGap) branchGap.addEventListener("input", updateBranch);
  updateBranch();
  observeCanvas(branchCanvas, drawBranch);
})();
