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
      font: "10px sans-serif",
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
    "berensteinBoundaryCanvas",
    "localGlobalCanvas",
  ]);

  const drawLabel = (context, text, x, y, options = {}) => {
    const requestedSize = Number(options.size ?? 12);
    const size = computerProofFigureIds.has(context.canvas?.id)
      ? Math.max(16, requestedSize)
      : requestedSize;
    context.fillStyle = options.color || colors.muted;
    context.font = `${options.weight || 400} ${size}px et-book, Palatino, Georgia, serif`;
    context.textAlign = options.align || "left";
    context.textBaseline = options.baseline || "alphabetic";
    context.fillText(text, x, y);
  };

  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const mix = (left, right, amount) => left + (right - left) * amount;

  const superscript = (value) => String(value)
    .replaceAll("-", "⁻")
    .replaceAll("0", "⁰")
    .replaceAll("1", "¹")
    .replaceAll("2", "²")
    .replaceAll("3", "³")
    .replaceAll("4", "⁴")
    .replaceAll("5", "⁵")
    .replaceAll("6", "⁶")
    .replaceAll("7", "⁷")
    .replaceAll("8", "⁸")
    .replaceAll("9", "⁹");

  const subscript = (value) => String(value)
    .replaceAll("-", "₋")
    .replaceAll("0", "₀")
    .replaceAll("1", "₁")
    .replaceAll("2", "₂")
    .replaceAll("3", "₃")
    .replaceAll("4", "₄")
    .replaceAll("5", "₅")
    .replaceAll("6", "₆")
    .replaceAll("7", "₇")
    .replaceAll("8", "₈")
    .replaceAll("9", "₉");

  const formatScientific = (value, digits = 5) => {
    if (value === 0) return "0";
    const [mantissa, exponent] = value.toExponential(digits).split("e");
    const sign = Number(mantissa) < 0 ? "−" : "";
    return `${sign}${Math.abs(Number(mantissa)).toFixed(digits)} × 10${superscript(Number(exponent))}`;
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

    drawLabel(context, `Boundary from q₁,…,q${subscript(cutoff)}`, centerX, domain.y - 8, {
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

    drawLabel(context, "Normalized map coefficients |qⱼ|", plot.x, plot.y, {
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    const selectedCoefficient = normalizedConformalCoefficients[cutoff - 1];
    const selectedCoefficientLabel = compact || plot.width < 280
      ? `|q${subscript(cutoff)}| = ${formatScientific(selectedCoefficient, 2)}`
      : `|q${subscript(cutoff)}| = ${formatScientific(selectedCoefficient, 2)} · ${10 * cutoff}-fold correction`;
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
      drawLabel(context, `10${superscript(exponent)}`, chart.x - 7, y + 4, {
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
    drawLabel(context, "normalized coefficient j", chart.x + chart.width / 2, chart.y + chart.height + 34, {
      align: "center",
      color: colors.muted,
      size: 14,
    });

    if (boundaryModesValue) boundaryModesValue.textContent = `${cutoff} of 30`;
    if (boundaryModes) boundaryModes.setAttribute("aria-valuetext", `${cutoff} of 30 normalized conformal-map coefficients q j`);
    boundaryCanvas.setAttribute(
      "aria-label",
      `Exploratory computation from finite numerical data. Ten-fold conformal boundary using ${cutoff} of 30 normalized coefficients q j, compared with the dashed unit circle. The newest included coefficient has size ${selectedCoefficient.toExponential(3)} and adds a ${10 * cutoff}-fold correction. The certificate later controls the omitted infinite tail. Overall radial range ${minimumRadius.toFixed(6)} to ${maximumRadius.toFixed(6)}.`,
    );
  };

  if (boundaryModes) boundaryModes.addEventListener("input", drawBoundary);
  observeCanvas(boundaryCanvas, drawBoundary);
  requestAnimationFrame(drawBoundary);

  const searchCanvas = document.getElementById("searchCanvas");
  const searchStage = document.getElementById("searchStage");
  const searchStageValue = document.getElementById("searchStageValue");
  const searchStageStatus = document.getElementById("searchStageStatus");
  const searchStages = Object.freeze([
    Object.freeze({
      label: "ten-fold direction",
      title: "A ten-lobed kernel at the disk",
      status: "Exact linear mechanism: W₁,₁₀(μ) = 0 makes the cos(10θ) displacement a kernel direction in the relaxed problem.",
      amplitude: 0,
      flux: .82,
      showDirection: true,
    }),
    Object.freeze({
      label: "relaxed solutions",
      title: "A schematic continuation route",
      status: "The intermediate silhouette is schematic, not sampled continuation data. The search varies field, shape, frequency and the constant c.",
      amplitude: .52,
      flux: .48,
      trail: Object.freeze([.26]),
    }),
    Object.freeze({
      label: "zero-flux centre",
      title: "The stored zero-flux centre",
      status: "Exploratory computation: at c = 0 the stored endpoint is the numerical centre x°. The later contraction proves existence independently.",
      amplitude: 1,
      flux: 0,
      trail: Object.freeze([.50]),
      endpoint: true,
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
          { color: colors.teal, width: 1.4, head: 5 },
        );
      } else {
        context.beginPath();
        context.arc(boundaryX, boundaryY, 3.2, 0, Math.PI * 2);
        context.fillStyle = colors.white;
        context.fill();
        context.strokeStyle = colors.teal;
        context.lineWidth = 1.6;
        context.stroke();
      }
    }
  };

  const drawSearch = () => {
    if (!searchCanvas) return;
    const rectangle = searchCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(searchCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);
    const compact = width < 520;
    const stage = searchStages[selectedSearchStage];

    const domainCenterX = width / 2;
    const domainCenterY = compact ? height * .53 : height * .54;
    const domainRadius = Math.min(
      compact ? width * .25 : width * .24,
      compact ? height * .225 : height * .27,
    );
    drawLabel(context, stage.title, domainCenterX, 28, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });

    context.beginPath();
    context.arc(domainCenterX, domainCenterY, domainRadius, 0, Math.PI * 2);
    context.setLineDash([5, 5]);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.1;
    context.stroke();
    context.setLineDash([]);

    if (stage.showDirection) {
      traceConformalBoundary(context, domainCenterX, domainCenterY, domainRadius, 1.1, {
        stroke: "rgba(160, 0, 0, .30)",
        lineWidth: 1.5,
        cutoff: 1,
      });
      traceConformalBoundary(context, domainCenterX, domainCenterY, domainRadius, -1.1, {
        stroke: "rgba(7, 87, 96, .32)",
        lineWidth: 1.5,
        cutoff: 1,
      });
      drawLabel(context, "W₁,₁₀(μ) = 0 · cos(10θ) kernel", domainCenterX, 60, {
        align: "center",
        color: colors.teal,
        size: compact ? 11 : 13,
        weight: 700,
      });
    }
    if (stage.trail) {
      stage.trail.forEach((amplitude, index) => {
        traceConformalBoundary(context, domainCenterX, domainCenterY, domainRadius, amplitude, {
          stroke: `rgba(38, 36, 31, ${.10 + index * .035})`,
          lineWidth: 1.1,
        });
      });
    }
    if (selectedSearchStage === 1) {
      drawLabel(context, "schematic continuation path", domainCenterX, 60, {
        align: "center",
        color: colors.gold,
        size: compact ? 11 : 13,
        weight: 700,
      });
    }
    traceConformalBoundary(context, domainCenterX, domainCenterY, domainRadius, stage.amplitude, {
      fill: colors.tealLight,
      stroke: colors.accent,
      lineWidth: 2.2,
    });

    drawNormalDerivativeMarkers(
      context,
      domainCenterX,
      domainCenterY,
      domainRadius,
      stage.amplitude,
      stage.flux,
    );
    drawLabel(context, stage.flux > 0 ? "constant normal derivative c all around" : "constant normal derivative c = 0", domainCenterX, Math.min(height - 20, domainCenterY + domainRadius + 43), {
      align: "center",
      color: stage.flux > 0 ? colors.teal : colors.accent,
      size: 14,
      weight: 700,
    });
    drawLabel(context, stage.endpoint ? "numerical centre x°" : selectedSearchStage === 0 ? "disk · c ≠ 0" : "relaxed solution", domainCenterX, domainCenterY + 4, {
      align: "center",
      color: stage.endpoint ? colors.accent : colors.muted,
      size: 14,
      weight: stage.endpoint ? 700 : 400,
    });

    searchCanvas.setAttribute(
      "aria-label",
      `Numerical-search stage ${selectedSearchStage + 1} of 3: ${stage.label}. ${stage.status} Equal teal arrows represent the constant normal derivative on the whole boundary; hollow boundary markers at the stored numerical centre represent zero normal derivative. Only the endpoint uses the thirty printed numerical coefficients.`,
    );
  };

  const updateSearch = () => {
    selectedSearchStage = clamp(Math.round(Number(searchStage?.value || 0)), 0, 2);
    const stage = searchStages[selectedSearchStage];
    if (searchStageValue) searchStageValue.textContent = stage.label;
    if (searchStageStatus) searchStageStatus.textContent = stage.status;
    drawSearch();
  };
  if (searchStage) searchStage.addEventListener("change", updateSearch);
  observeCanvas(searchCanvas, drawSearch);
  requestAnimationFrame(updateSearch);

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
      drawLabel(context, "fixed disk 𝔻", diskCenter.x, diskCenter.y - radius - 14, { align: "center", color: colors.heading, size: 14, weight: 700 });
      drawLabel(context, "physical domain Ω", domainCenter.x, domainCenter.y - radius - 14, { align: "center", color: colors.heading, size: 14, weight: 700 });
    } else {
      drawLabel(context, "physical domain Ω", domainCenter.x, domainCenter.y - radius - 24, { align: "center", color: colors.heading, size: 14, weight: 700 });
      drawLabel(context, "fixed disk 𝔻", diskCenter.x, diskCenter.y - radius - 24, { align: "center", color: colors.heading, size: 14, weight: 700 });
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
      drawLabel(context, "φₚ", arrowX + 12, (arrowTop + arrowBottom) / 2 + 4, { color: colors.teal, size: 14, weight: 700 });
    } else {
      const arrowStart = diskCenter.x - radius - 32;
      const arrowEnd = domainCenter.x + radius + 32;
      drawArrow(context, arrowStart, diskCenter.y, arrowEnd, domainCenter.y, { color: colors.teal, width: 2.2, head: 8 });
      drawLabel(context, "φₚ", (arrowStart + arrowEnd) / 2, diskCenter.y - 14, { align: "center", color: colors.teal, size: 14, weight: 700 });
    }

    drawCorrespondingPoint(context, diskPoint.x, diskPoint.y, "z", {
      color: colors.teal,
      halo: "rgba(7, 87, 96, .28)",
      labelX: 10,
      labelY: -10,
    });
    drawCorrespondingPoint(context, physicalPoint.x, physicalPoint.y, "x = φₚ(z)", {
      color: colors.accent,
      labelX: 10,
      labelY: -10,
    });

    drawLabel(
      context,
      compact ? "same field value at z and φₚ(z)" : "schematic scalar field · same sampled color at z and x",
      width / 2,
      height - 16,
      { align: "center", color: colors.muted, size: compact ? 12 : 14 },
    );

    pullbackCanvas.setAttribute(
      "aria-label",
      "Schematic mechanism. The fixed disk is mapped by phi sub p to the physical domain. A marked disk point z maps to x equals phi sub p of z, and its sampled color matches exactly on both sides. The colors are an illustrative scalar field for the coordinate transfer, not the certified eigenfunction. The exact identity is U of z equals u of x.",
    );
  };

  observeCanvas(pullbackCanvas, drawPullback);
  requestAnimationFrame(drawPullback);

  const inverseCanvas = document.getElementById("inverseCanvas");
  const inverseAngularMode = document.getElementById("inverseAngularMode");
  const inverseAngularModeValue = document.getElementById("inverseAngularModeValue");
  const inverseRadialMode = document.getElementById("inverseRadialMode");
  const inverseRadialModeValue = document.getElementById("inverseRadialModeValue");
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
    drawLabel(context, `source Φ${selectedInverseAngular},${selectedInverseRadial}`, sourceHeaderX, 32, {
      align: "center",
      color: colors.heading,
      size: compact ? 16 : 18,
      weight: 700,
    });
    drawArrow(context, headerArrowStart, 29, headerArrowEnd, 29, {
      color: colors.accent,
      width: 3,
      head: 6,
    });
    drawLabel(context, "K", (headerArrowStart + headerArrowEnd) / 2, 18, {
      align: "center",
      color: colors.accent,
      size: 16,
      weight: 700,
    });
    drawLabel(context, compact ? "v = KΦ" : "response v = KΦ", responseHeaderX, 32, {
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

    if (compact) {
      drawLabel(context, "radial slice at θ = 0", plot.x, plot.y - 22, {
        color: colors.muted,
        size: 13,
      });
    }
    drawLabel(context, compact ? "centre" : "radial slice at θ = 0 · centre", plot.x, axisLabelY, {
      color: colors.muted,
      size: compact ? 13 : 17,
    });
    drawLabel(context, "boundary r = 1", endpointX, axisLabelY, {
      align: compact ? "right" : "center",
      color: colors.heading,
      size: compact ? 13 : 17,
      weight: 700,
    });
    drawLabel(context, "value = 0", endpointX + 12, endpointY - 22, {
      align: "left",
      color: colors.accent,
      size: compact ? 13 : 15,
      weight: 700,
    });

    const legendItems = [
      { text: "A", color: colorsByMode[0] },
      { text: "B", color: colorsByMode[1] },
      { text: "C", color: colorsByMode[2] },
      { text: "v", color: colors.heading },
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
    drawLabel(context, "slope = 0", endpointX + 12, endpointY + 25, {
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
    selectedInverseAngular = clamp(Math.round(Number(inverseAngularMode?.value || 1)), 0, 3);
    selectedInverseRadial = clamp(Math.round(Number(inverseRadialMode?.value || 1)), 1, 4);
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
    setMath(inverseAngularModeValue, `\\ell=${selectedInverseAngular}`);
    setMath(inverseRadialModeValue, `s=${selectedInverseRadial}`);
    if (inverseStatus) inverseStatus.textContent = `Exact algebra at D = ${D}: A + B + C = ${Math.abs(valueBalance) < 1e-14 ? "0" : valueBalance.toExponential(2)}, and Aβₛ₋₁ + Bβₛ + Cβₛ₊₁ = ${Math.abs(slopeBalance) < 1e-14 ? "0" : slopeBalance.toExponential(2)}.`;
    drawInverse();
  };
  if (inverseAngularMode) inverseAngularMode.addEventListener("change", updateInverse);
  if (inverseRadialMode) inverseRadialMode.addEventListener("change", updateInverse);
  observeCanvas(inverseCanvas, drawInverse);
  requestAnimationFrame(updateInverse);

  const tailCanvas = document.getElementById("tailCanvas");
  const tailStage = document.getElementById("tailStage");
  const tailStageValue = document.getElementById("tailStageValue");
  const tailStatus = document.getElementById("tailStatus");
  const tailStages = Object.freeze([
    Object.freeze({ label: "finite core", status: "The finite matrix contains 2,440 field coefficients and 31 shape-and-frequency coefficients." }),
    Object.freeze({ label: "checked outer equations", status: "Equation rows reached by the finite centre are enumerated separately from the unknown blocks." }),
    Object.freeze({ label: "nearby interaction band", status: "Every nearby coefficient that can couple to the stored centre is bounded explicitly; this band meets the remote estimate." }),
    Object.freeze({ label: "remote analytic tail", status: "Decreasing field and shape estimates cover every larger index, beginning where the nearby band ends." }),
    Object.freeze({ label: "all bounds combined", status: "An exact-fraction checker combines the finite core, reached equations, nearby enumeration, and analytic tails into Y, Z, C₂ and C₃." }),
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
      : { x: 30, y: 36, width: width * .68, height: height - 72 };
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

    drawLabel(context, compact ? "index regions · not to scale" : "index regions schematic · not to scale", diagram.x, diagram.y + 10, {
      color: colors.muted,
      size: compact ? 11 : 13,
      weight: 700,
    });

    drawLabel(context, "g array", diagram.x, gTop + 18, {
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "p list", diagram.x, pTop + 19, {
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
    drawLabel(context, finiteG.width < 120 ? "61 × 40" : "61 × 40 stored", finiteG.x + finiteG.width / 2, finiteG.y + 20, {
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
    drawLabel(context, detailedPLabel ? "31 stored · j = 0…30" : "31 stored", finiteP.x + finiteP.width / 2, finiteP.y + finiteP.height / 2 + 1, {
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
      drawLabel(context, compressedTailLabels ? "extra rows" : "rows ≠ unknowns", finiteP.x, footerLabelY, {
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
      drawLabel(context, compressedTailLabels ? "D⁻² tail" : "K-mode bound ∼ D⁻²", stripX + stripWidth, footerLabelY, {
        align: "right",
        color: colors.blue,
        size: 14,
        weight: 700,
      });
    }

    const checker = compact
      ? { x: width * .15, y: height * .76, width: width * .70, height: height * .20 }
      : { x: width * .75, y: height * .29, width: width * .21, height: height * .36 };
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
      drawLabel(context, "Y, Z, C₂, C₃", checker.x + checker.width / 2, checker.y + checker.height * .80, {
        align: "center",
        baseline: "middle",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
      if (compact) drawArrow(context, width / 2, diagram.y + diagram.height + 2, width / 2, checker.y - 7, { color: colors.heading });
      else drawArrow(context, diagram.x + diagram.width + 2, diagram.y + diagram.height / 2, checker.x - 8, checker.y + checker.height * .40, { color: colors.heading });
    }
    tailCanvas.setAttribute(
      "aria-label",
      `Certificate-structure schematic, not to scale. Layer ${selectedTailStage + 1} of 5: ${tailStages[selectedTailStage].label}. The two-dimensional field array g and the one-dimensional shape-and-frequency list p are shown separately. ${tailStages[selectedTailStage].status} There is no unchecked gap between the explicitly enumerated near region and the remote decreasing bound.`,
    );
  };

  const updateTail = () => {
    selectedTailStage = clamp(Math.round(Number(tailStage?.value || 0)), 0, 4);
    const stage = tailStages[selectedTailStage];
    if (tailStageValue) tailStageValue.textContent = stage.label;
    if (tailStatus) tailStatus.textContent = stage.status;
    drawTail();
  };
  if (tailStage) tailStage.addEventListener("change", updateTail);
  observeCanvas(tailCanvas, drawTail);
  requestAnimationFrame(updateTail);

  const certificateCanvas = document.getElementById("certificateCanvas");
  const certificateView = document.getElementById("certificateView");
  const certificateViewValue = document.getElementById("certificateViewValue");
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

    drawLabel(context, compact ? "two rigorous margin tests" : "Rigorous certificate · two normalized margins", width / 2, 27, {
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
      [1e-10, "10⁻¹⁰"],
      [1e-9, "10⁻⁹"],
      [1e-8, "10⁻⁸"],
      [1e-7, "10⁻⁷"],
      [2e-6, "2×10⁻⁶"],
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
    drawLabel(context, "chosen r = 10⁻⁶", chosenX - 6, plot.y - 9, {
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
    drawLabel(context, "ℛ(t)/t", plot.x + 31, legendY + 1, {
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
    drawLabel(context, "q(t) − 1", secondLegendX + 31, legendY + 1, {
      baseline: "middle",
      color: colors.teal,
      size: compact ? 11 : 13,
      weight: 700,
    });
  };

  const drawIterationCertificate = (context, width, height, data) => {
    const compact = width < 520;
    const center = compact
      ? { x: width / 2, y: height * .35 }
      : { x: width * .27, y: height * .50 };
    const ballRadius = Math.min(
      compact ? width * .24 : width * .18,
      compact ? height * .17 : height * .28,
    );
    const enclosureRadius = ballRadius * data.enclosureRatio;

    drawLabel(context, compact ? "certified fixed-point ball" : "Rigorous enclosure · schematic geometry", width / 2, 27, {
      align: "center",
      color: colors.heading,
      size: compact ? 13 : 15,
      weight: 700,
    });

    context.beginPath();
    context.arc(center.x, center.y, ballRadius, 0, Math.PI * 2);
    context.fillStyle = "rgba(160, 0, 0, .035)";
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.8;
    context.stroke();

    context.beginPath();
    context.arc(center.x, center.y, enclosureRadius, 0, Math.PI * 2);
    context.fillStyle = colors.tealLight;
    context.fill();
    context.strokeStyle = colors.teal;
    context.lineWidth = 1.8;
    context.setLineDash([6, 4]);
    context.stroke();
    context.setLineDash([]);

    context.beginPath();
    context.moveTo(center.x - 5, center.y);
    context.lineTo(center.x + 5, center.y);
    context.moveTo(center.x, center.y - 5);
    context.lineTo(center.x, center.y + 5);
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.3;
    context.stroke();
    drawLabel(context, "x°", center.x - 8, center.y + 18, {
      align: "right",
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawLabel(context, "Bᵣ(x°)", center.x, center.y - ballRadius - 14, {
      align: "center",
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawLabel(context, compact ? "T(Bᵣ) fits inside Bᵣ" : "certified T(Bᵣ) enclosure lies inside Bᵣ", center.x, center.y + ballRadius + 22, {
      align: "center",
      color: colors.teal,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "x* is within 0.000420r of x°", center.x, center.y + ballRadius + 44, {
      align: "center",
      color: colors.accent,
      size: 14,
    });

    context.beginPath();
    context.arc(center.x, center.y, 2.2, 0, Math.PI * 2);
    context.fillStyle = colors.accent;
    context.fill();

    const inset = compact
      ? { x: 20, y: height * .68, width: width - 40, height: height * .27 }
      : { x: width * .55, y: height * .18, width: width * .40, height: height * .68 };
    context.fillStyle = "rgba(255, 255, 248, .96)";
    context.fillRect(inset.x, inset.y, inset.width, inset.height);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.2;
    context.strokeRect(inset.x + .5, inset.y + .5, inset.width - 1, inset.height - 1);
    drawLabel(context, "magnified fixed-point orbit", inset.x + inset.width / 2, inset.y + 22, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });

    const insetCenter = {
      x: inset.x + inset.width * .48,
      y: inset.y + inset.height * (compact ? .52 : .58),
    };
    const insetRadius = Math.min(inset.width, inset.height) * (compact ? .18 : .27);
    context.beginPath();
    context.arc(insetCenter.x, insetCenter.y, insetRadius, 0, Math.PI * 2);
    context.fillStyle = "rgba(160, 0, 0, .07)";
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 1.4;
    context.setLineDash([4, 3]);
    context.stroke();
    context.setLineDash([]);
    const representative = {
      x: insetCenter.x + insetRadius * .38,
      y: insetCenter.y - insetRadius * .25,
    };
    const orbitPoint = (step) => {
      const startX = insetCenter.x - representative.x;
      const startY = insetCenter.y - representative.y;
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
      context.lineWidth = 1.8;
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
    const fixedPointLabelX = insetCenter.x + insetRadius + 12;
    context.beginPath();
    context.moveTo(representative.x + 7, representative.y);
    context.lineTo(fixedPointLabelX - 5, representative.y);
    context.strokeStyle = colors.accent;
    context.lineWidth = 1.1;
    context.stroke();
    drawLabel(context, "x*", fixedPointLabelX, representative.y + 5, {
      color: colors.accent,
      size: 14,
      weight: 700,
    });
    drawLabel(context, compact ? "distance shrinks by factor q" : "distance shrinks by q each step", inset.x + inset.width / 2, inset.y + inset.height - 10, {
      align: "center",
      color: colors.teal,
      size: 14,
      weight: 700,
    });

    if (!compact) {
      drawArrow(context, center.x + 4, center.y - 4, inset.x - 11, inset.y + inset.height * .48, {
        color: colors.ruleDark,
        dashed: true,
        head: 6,
      });
    }
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
        ? "Rigorous certificate. Logarithmic radius chart of the normalized radii-polynomial margin R of t divided by t and the contraction margin q of t minus one. Both are negative at the marked proof radius ten to the minus six. The exact-fraction checker gives image enclosure ratio at most 0.621281000000012 and contraction factor at most 0.621244000000036."
        : "Rigorous certificate shown with schematic two-dimensional geometry. The outer circle is the ball B r about x degree. A dashed teal circle is a certified enclosure containing T of the ball, with radius ratio at most 0.621281000000012; it is not the literal image set. The exact-solution enclosure has radius ratio below 0.000420 and is subpixel in the main view. A roughly six-hundred-times magnified inset shows an illustrative orbit; only the distance factor q to the n is certified.",
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
      certificateIteration.textContent = "At r: R(r) ≈ −3.78719 × 10⁻⁷.";
      return;
    }
    if (state === "running") {
      certificateIteration.textContent = "Running schematic orbit; certified distance bound is qⁿ.";
      return;
    }
    if (state === "finished") {
      certificateIteration.textContent = "Step 8 — distance bound ≤ "
        + (data.q ** certificateMaximumIteration).toFixed(4)
        + " of the start.";
      return;
    }
    certificateIteration.textContent = "Ready — the inset path is schematic; the bound qⁿ is rigorous.";
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

  const updateCertificate = () => {
    stopCertificateAnimation();
    certificateIterationProgress = 0;
    selectedCertificateView = certificateView?.value === "iteration" ? "iteration" : "radius";
    const data = currentCertificateData();
    if (certificateViewValue) certificateViewValue.textContent = selectedCertificateView === "radius"
      ? "why the radius works"
      : "why iteration converges";
    if (certificateValue) certificateValue.textContent = "Pass — enclosure/r ≤ 0.621281000000012 < 1.";
    if (certificateDerivative) certificateDerivative.textContent = "Pass — q(r) ≤ 0.621244000000036 < 1.";
    if (certificateVerdict) certificateVerdict.textContent = selectedCertificateView === "radius"
      ? "Exact-fraction verdict: both strict margins are negative at r."
      : "Banach gives one exact zero inside this validated ball.";
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

  if (certificateView) certificateView.addEventListener("change", updateCertificate);
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
  requestAnimationFrame(updateCertificate);

  const reconstructionCanvas = document.getElementById("reconstructionCanvas");
  const reconstructionStage = document.getElementById("reconstructionStage");
  const reconstructionStageValue = document.getElementById("reconstructionStageValue");
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
    drawLabel(context, "certified tube · enlarged", centerX, centerY + radius + 22, {
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
    drawLabel(context, "certified tube ≤ 7.13 × 10⁻¹¹", inset.x + inset.width / 2, inset.y + 22, {
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
      { point: diskStart, label: "z₁", dx: -8, dy: 20, align: "right" },
      { point: diskEnd, label: "z₂", dx: 8, dy: -10, align: "left" },
      { point: mappedStart, label: "φ(z₁)", dx: -8, dy: 20, align: "right" },
      { point: mappedEnd, label: "φ(z₂)", dx: 8, dy: -10, align: "left" },
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
      drawLabel(context, "φₚ*", arrowX + 10, (fromY + toY) / 2 + 4, { color: colors.accent, size: 14, weight: 700 });
    } else {
      const fromX = diskCenter.x + radius + 24;
      const toX = domainCenter.x - radius - 24;
      drawArrow(context, fromX, diskCenter.y, toX, domainCenter.y, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "φₚ*", (fromX + toX) / 2, diskCenter.y - 14, { align: "center", color: colors.accent, size: 14, weight: 700 });
    }

    drawLabel(context, "Re φ′ > 0.35 ⇒ φ(z₁) ≠ φ(z₂)", width / 2, height - 18, {
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
    drawLabel(context, "disk", circleCenter.x, circleCenter.y + 5, {
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
      drawLabel(context, "q₁* z¹¹ ≠ 0", width / 2, circleCenter.y + radius + 21, {
        align: "center",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
    } else {
      const fromX = circleCenter.x + radius + 24;
      const toX = domainCenter.x - radius - 24;
      drawArrow(context, fromX, circleCenter.y, toX, domainCenter.y, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "q₁* z¹¹ ≠ 0", (fromX + toX) / 2, circleCenter.y - 15, {
        align: "center",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
    }

    drawLabel(context, compact ? "|q₁*| > 0.03459 ⇒ not linear" : "|q₁*| > 0.03459, so the map is not linear", width / 2, height - 18, {
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

  const updateReconstruction = () => {
    selectedReconstructionStage = clamp(Math.round(Number(reconstructionStage?.value || 0)), 0, 2);
    const stage = reconstructionStages[selectedReconstructionStage];
    if (reconstructionStageValue) reconstructionStageValue.textContent = stage.label;
    setInlineMathContent(reconstructionStatus, stage.statusMath);
    drawReconstruction();
  };
  if (reconstructionStage) reconstructionStage.addEventListener("change", updateReconstruction);
  observeCanvas(reconstructionCanvas, drawReconstruction);
  requestAnimationFrame(updateReconstruction);

  const berensteinBoundaryCanvas = document.getElementById("berensteinBoundaryCanvas");
  const berensteinEndpointStage = document.getElementById("berensteinEndpointStage");
  const berensteinEndpointStageValue = document.getElementById("berensteinEndpointStageValue");
  const berensteinEndpointStatus = document.getElementById("berensteinEndpointStatus");
  const berensteinEndpointStages = Object.freeze({
    pair: Object.freeze({
      label: "compare endpoints",
      status: "Schiffer reaches height one and becomes flat. Berenstein crosses height zero with unit outward slope.",
      statusMath: "Schiffer reaches \\(u=1\\) and becomes flat. Berenstein crosses \\(u=0\\) with \\(\\partial_\\nu u=1\\).",
    }),
    height: Object.freeze({
      label: "boundary height",
      status: "The boundary levels are complementary: Schiffer fixes u = 1, while the Berenstein boundary is the zero set u = 0.",
      statusMath: "The boundary levels are complementary: Schiffer fixes \\(u=1\\), while the Berenstein boundary is the zero set \\(u=0\\).",
    }),
    slope: Object.freeze({
      label: "outward slope",
      status: "Schiffer arrives tangentially with slope zero. Berenstein crosses the zero level transversely with outward slope one.",
      statusMath: "Schiffer has \\(\\partial_\\nu u=0\\). Berenstein crosses transversely with \\(\\partial_\\nu u=1\\).",
    }),
  });
  let selectedBerensteinEndpointStage = "pair";

  const traceSymmetricOutline = (context, centerX, centerY, radius, folds, amplitude) => {
    context.beginPath();
    for (let index = 0; index <= 240; index += 1) {
      const theta = index / 240 * Math.PI * 2;
      const localRadius = radius * (1 + amplitude * Math.cos(folds * theta));
      const x = centerX + localRadius * Math.cos(theta);
      const y = centerY + localRadius * Math.sin(theta);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
  };

  const drawBerensteinDomainGlyph = (context, box, kind, emphasis) => {
    const schiffer = kind === "schiffer";
    const folds = schiffer ? 10 : 13;
    const color = schiffer ? colors.accent : colors.teal;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const radius = Math.max(23, Math.min(box.width, box.height) * .34);
    traceSymmetricOutline(context, centerX, centerY, radius, folds, schiffer ? .065 : .06);
    context.fillStyle = schiffer ? "rgba(160, 0, 0, .065)" : colors.tealLight;
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = emphasis === "slope" ? 2.8 : 2.2;
    context.stroke();

    if (!schiffer && (emphasis === "pair" || emphasis === "slope")) {
      for (let index = 0; index < 13; index += 2) {
        const theta = index / 13 * Math.PI * 2;
        const localRadius = radius * (1 + .06 * Math.cos(13 * theta));
        drawArrow(
          context,
          centerX + localRadius * Math.cos(theta),
          centerY + localRadius * Math.sin(theta),
          centerX + (localRadius + 14) * Math.cos(theta),
          centerY + (localRadius + 14) * Math.sin(theta),
          { color, width: 1.35, head: 4.5 },
        );
      }
    }

    if (schiffer && emphasis === "slope") {
      const x = centerX + radius * 1.06;
      context.beginPath();
      context.moveTo(x - 13, centerY);
      context.lineTo(x + 13, centerY);
      context.strokeStyle = color;
      context.lineWidth = 2.4;
      context.stroke();
    }

    drawLabel(context, schiffer ? "D₁₀" : "D₁₃", centerX, centerY + 4, {
      align: "center",
      color,
      size: Math.max(11, Math.min(15, box.width * .1)),
      weight: 700,
    });
  };

  const drawBerensteinProfile = (context, box, kind, emphasis) => {
    const schiffer = kind === "schiffer";
    const color = schiffer ? colors.accent : colors.teal;
    const margin = {
      left: Math.max(20, box.width * .09),
      right: Math.max(14, box.width * .06),
      top: Math.max(21, box.height * .14),
      bottom: Math.max(34, box.height * .18),
    };
    const left = box.x + margin.left;
    const right = box.x + box.width - margin.right;
    const top = box.y + margin.top;
    const bottom = box.y + box.height - margin.bottom;
    const mapX = (s) => left + (s + 1) / 1.25 * (right - left);
    const mapY = (u) => bottom - (u + 1.05) / 2.4 * (bottom - top);
    const boundaryX = mapX(0);
    const boundaryValue = schiffer ? 1 : 0;

    context.beginPath();
    context.moveTo(left, mapY(0));
    context.lineTo(right, mapY(0));
    context.strokeStyle = emphasis === "height" && !schiffer ? color : colors.rule;
    context.lineWidth = emphasis === "height" && !schiffer ? 1.8 : 1;
    context.setLineDash([4, 5]);
    context.stroke();
    context.setLineDash([]);

    if (schiffer) {
      context.beginPath();
      context.moveTo(left, mapY(1));
      context.lineTo(right, mapY(1));
      context.strokeStyle = emphasis === "height" ? color : colors.rule;
      context.lineWidth = emphasis === "height" ? 1.8 : 1;
      context.setLineDash([4, 5]);
      context.stroke();
      context.setLineDash([]);
    }

    context.beginPath();
    context.moveTo(boundaryX, top);
    context.lineTo(boundaryX, bottom + 4);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1;
    context.stroke();

    context.beginPath();
    for (let index = 0; index <= 150; index += 1) {
      const s = -1 + index / 150 * 1.25;
      const u = schiffer ? 1 - .5 * s * s : s;
      const x = mapX(s);
      const y = mapY(u);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = color;
    context.lineWidth = emphasis === "pair" ? 2.3 : 3;
    context.stroke();

    context.beginPath();
    context.arc(boundaryX, mapY(boundaryValue), 4.2, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = colors.white;
    context.lineWidth = 1.5;
    context.stroke();

    if (emphasis === "slope") {
      const halfWidth = Math.max(14, box.width * .075);
      const slope = schiffer ? 0 : 1;
      const s1 = -halfWidth / Math.max(1, right - left) * 1.25;
      const s2 = -s1;
      const u1 = boundaryValue + slope * s1;
      const u2 = boundaryValue + slope * s2;
      context.beginPath();
      context.moveTo(mapX(s1), mapY(u1));
      context.lineTo(mapX(s2), mapY(u2));
      context.strokeStyle = colors.heading;
      context.lineWidth = 2;
      context.stroke();
    }

    const axisY = bottom + 20;
    drawLabel(context, "s < 0", left, axisY, { color: colors.muted, size: 14 });
    drawLabel(context, "0", boundaryX - 15, axisY, { align: "right", color: colors.muted, size: 14 });
    drawLabel(context, "s > 0", right, axisY, { align: "right", color: colors.muted, size: 14 });
    drawLabel(context, schiffer ? "u = 1" : "u = 0", boundaryX - 8, mapY(boundaryValue) - 9, {
      align: "right",
      color,
      size: 14,
      weight: 700,
    });
  };

  const drawBerensteinEndpointPanel = (context, box, kind, emphasis) => {
    const schiffer = kind === "schiffer";
    const color = schiffer ? colors.accent : colors.teal;
    const title = schiffer ? "Schiffer endpoint" : "Berenstein endpoint";
    const data = schiffer ? "height 1 · slope 0" : "height 0 · slope 1";
    const stackHeader = box.width < 310;
    const headerHeight = stackHeader ? 52 : 31;
    context.beginPath();
    context.moveTo(box.x, box.y + 1);
    context.lineTo(box.x + box.width, box.y + 1);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
    drawLabel(context, title, box.x, box.y + 20, { color, size: 14, weight: 700 });
    drawLabel(context, data, stackHeader ? box.x : box.x + box.width, box.y + (stackHeader ? 42 : 20), {
      align: stackHeader ? "left" : "right",
      color: colors.heading,
      size: 14,
    });

    const rowLayout = box.height < 270;
    if (rowLayout) {
      const domainWidth = Math.min(92, box.width * .36);
      drawBerensteinDomainGlyph(context, {
        x: box.x + 1,
        y: box.y + headerHeight,
        width: domainWidth,
        height: box.height - headerHeight - 4,
      }, kind, emphasis);
      drawBerensteinProfile(context, {
        x: box.x + domainWidth + 3,
        y: box.y + headerHeight - 4,
        width: box.width - domainWidth - 3,
        height: box.height - headerHeight,
      }, kind, emphasis);
    } else {
      const contentHeight = box.height - headerHeight;
      const domainHeight = Math.min(148, contentHeight * .40);
      drawBerensteinDomainGlyph(context, {
        x: box.x + box.width * .19,
        y: box.y + headerHeight,
        width: box.width * .62,
        height: domainHeight,
      }, kind, emphasis);
      drawBerensteinProfile(context, {
        x: box.x + 1,
        y: box.y + headerHeight + domainHeight,
        width: box.width - 2,
        height: contentHeight - domainHeight,
      }, kind, emphasis);
    }
  };

  const drawBerensteinBoundary = () => {
    if (!berensteinBoundaryCanvas) return;
    const rectangle = berensteinBoundaryCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 240) return;
    const { context, width, height } = prepareCanvas(berensteinBoundaryCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);
    const outer = 16;
    const gap = width < 520 ? 22 : 34;
    if (width < 520) {
      const panelHeight = (height - outer * 2 - gap) / 2;
      drawBerensteinEndpointPanel(context, {
        x: outer,
        y: outer,
        width: width - outer * 2,
        height: panelHeight,
      }, "schiffer", selectedBerensteinEndpointStage);
      drawBerensteinEndpointPanel(context, {
        x: outer,
        y: outer + panelHeight + gap,
        width: width - outer * 2,
        height: panelHeight,
      }, "berenstein", selectedBerensteinEndpointStage);
    } else {
      const panelWidth = (width - outer * 2 - gap) / 2;
      drawBerensteinEndpointPanel(context, {
        x: outer,
        y: outer,
        width: panelWidth,
        height: height - outer * 2,
      }, "schiffer", selectedBerensteinEndpointStage);
      drawBerensteinEndpointPanel(context, {
        x: outer + panelWidth + gap,
        y: outer,
        width: panelWidth,
        height: height - outer * 2,
      }, "berenstein", selectedBerensteinEndpointStage);
    }
    const stage = berensteinEndpointStages[selectedBerensteinEndpointStage];
    berensteinBoundaryCanvas.setAttribute(
      "aria-label",
      "Local normal-profile schematic. " + stage.label + ". " + stage.status + " The normalized profiles are not reconstructed eigenfunctions; inside means negative signed normal coordinate, the boundary is zero, and outside is positive.",
    );
  };

  const updateBerensteinEndpoint = () => {
    const requested = berensteinEndpointStage?.value || "pair";
    selectedBerensteinEndpointStage = Object.hasOwn(berensteinEndpointStages, requested) ? requested : "pair";
    const stage = berensteinEndpointStages[selectedBerensteinEndpointStage];
    if (berensteinEndpointStageValue) berensteinEndpointStageValue.textContent = stage.label;
    setInlineMathContent(berensteinEndpointStatus, stage.statusMath);
    drawBerensteinBoundary();
  };

  if (berensteinEndpointStage) berensteinEndpointStage.addEventListener("change", updateBerensteinEndpoint);
  observeCanvas(berensteinBoundaryCanvas, drawBerensteinBoundary);
  requestAnimationFrame(updateBerensteinEndpoint);

  const berensteinFieldGuide = document.getElementById("berensteinFieldGuide");
  const berensteinFieldNotes = berensteinFieldGuide?.closest(".berenstein-field-notes");
  const berensteinFieldStage = document.getElementById("berensteinFieldStage");
  const berensteinFieldStageValue = document.getElementById("berensteinFieldStageValue");
  const berensteinFieldStatus = document.getElementById("berensteinFieldStatus");
  const berensteinFieldStages = Object.freeze({
    field: Object.freeze({
      label: "signed regions",
      status: "The certified image remains unchanged; the guide shows nine alternating sign regions, beginning and ending negative.",
      statusMath: "The certified image remains unchanged; the guide shows nine alternating sign regions of \\(u\\), beginning and ending negative.",
    }),
    nodal: Object.freeze({
      label: "interior zero curves",
      status: "The certified image remains unchanged; the guide marks eight plotted interior zero curves, all strictly inside the physical boundary.",
      statusMath: "The certified image remains unchanged; the guide marks eight plotted interior zero curves, all strictly inside the physical boundary.",
    }),
    boundary: Object.freeze({
      label: "outer nodal boundary",
      status: "The certified image remains unchanged; the heavy outer curve is the physical nodal boundary, outside all eight plotted interior curves.",
      statusMath: "The certified image remains unchanged; the heavy outer curve is the physical nodal boundary, where \\(u=0\\) and \\(\\partial_\\nu u=1\\).",
    }),
    symmetry: Object.freeze({
      label: "thirteenfold symmetry",
      status: "The certified image remains unchanged; the guide shows thirteen equivalent sectors, while the certificate rules out central symmetry.",
      statusMath: "The certified image remains unchanged; the guide shows thirteen equivalent sectors, while the certificate rules out central symmetry.",
    }),
  });

  const polarPath = (centerX, centerY, radius, folds = 13, amplitude = 0) => {
    const commands = [];
    for (let index = 0; index <= 260; index += 1) {
      const theta = index / 260 * Math.PI * 2;
      const localRadius = radius * (1 + amplitude * Math.cos(folds * theta));
      const x = centerX + localRadius * Math.cos(theta);
      const y = centerY + localRadius * Math.sin(theta);
      commands.push((index === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2));
    }
    commands.push("Z");
    return commands.join(" ");
  };

  const buildBerensteinFieldGuide = () => {
    if (!berensteinFieldGuide || berensteinFieldGuide.childElementCount) return;
    const centerX = 140;
    const centerY = 66;
    const boundaryRadius = 54;
    const radii = [9, 15, 21, 27, 33, 39, 45, 51];
    const definitions = createSvgNode("defs");
    const marker = createSvgNode("marker", {
      id: "berensteinFieldArrow",
      viewBox: "0 0 10 10",
      refX: "8",
      refY: "5",
      markerWidth: "7",
      markerHeight: "7",
      orient: "auto",
    });
    marker.appendChild(createSvgNode("path", { d: "M0 0 L10 5 L0 10 Z", class: "berenstein-guide-arrowhead" }));
    definitions.appendChild(marker);
    berensteinFieldGuide.appendChild(definitions);

    const signLayer = createSvgNode("g", { class: "berenstein-field-layer berenstein-field-layer-sign", "data-field-layer": "field" });
    [4.5, 12, 18, 24, 30, 36, 42, 48, 52.5].forEach((radius, index) => {
      signLayer.appendChild(createSvgNode("path", {
        d: polarPath(centerX, centerY, radius, 13, .008 + index * .004),
        class: "berenstein-guide-band berenstein-guide-band-" + (index % 2 ? "positive" : "negative"),
      }));
    });
    signLayer.appendChild(createSvgNode("path", {
      d: polarPath(centerX, centerY, boundaryRadius, 13, .045),
      class: "berenstein-guide-outline",
    }));
    berensteinFieldGuide.appendChild(signLayer);

    const nodalLayer = createSvgNode("g", { class: "berenstein-field-layer berenstein-field-layer-nodal", "data-field-layer": "nodal" });
    radii.forEach((radius, index) => {
      nodalLayer.appendChild(createSvgNode("path", {
        d: polarPath(centerX, centerY, radius, 13, .008 + index * .004),
        class: "berenstein-guide-nodal",
      }));
    });
    nodalLayer.appendChild(createSvgNode("path", {
      d: polarPath(centerX, centerY, boundaryRadius, 13, .045),
      class: "berenstein-guide-outline",
    }));
    berensteinFieldGuide.appendChild(nodalLayer);

    const boundaryLayer = createSvgNode("g", { class: "berenstein-field-layer berenstein-field-layer-boundary", "data-field-layer": "boundary" });
    boundaryLayer.appendChild(createSvgNode("path", {
      d: polarPath(centerX, centerY, boundaryRadius, 13, .045),
      class: "berenstein-guide-boundary",
    }));
    for (let index = 0; index < 13; index += 1) {
      const theta = index / 13 * Math.PI * 2;
      const radius = boundaryRadius * (1 + .045 * Math.cos(13 * theta));
      boundaryLayer.appendChild(createSvgNode("line", {
        x1: centerX + (radius + 2) * Math.cos(theta),
        y1: centerY + (radius + 2) * Math.sin(theta),
        x2: centerX + (radius + 9) * Math.cos(theta),
        y2: centerY + (radius + 9) * Math.sin(theta),
        class: "berenstein-guide-normal",
        "marker-end": "url(#berensteinFieldArrow)",
      }));
    }
    berensteinFieldGuide.appendChild(boundaryLayer);

    const symmetryLayer = createSvgNode("g", { class: "berenstein-field-layer berenstein-field-layer-symmetry", "data-field-layer": "symmetry" });
    symmetryLayer.appendChild(createSvgNode("path", {
      d: polarPath(centerX, centerY, boundaryRadius, 13, .045),
      class: "berenstein-guide-outline",
    }));
    for (let index = 0; index < 13; index += 1) {
      const theta = index / 13 * Math.PI * 2;
      symmetryLayer.appendChild(createSvgNode("line", {
        x1: centerX + 5 * Math.cos(theta),
        y1: centerY + 5 * Math.sin(theta),
        x2: centerX + 52 * Math.cos(theta),
        y2: centerY + 52 * Math.sin(theta),
        class: "berenstein-guide-symmetry-line",
      }));
    }
    berensteinFieldGuide.appendChild(symmetryLayer);
  };

  const updateBerensteinField = () => {
    buildBerensteinFieldGuide();
    const requested = berensteinFieldStage?.value || "field";
    const selected = Object.hasOwn(berensteinFieldStages, requested) ? requested : "field";
    const stage = berensteinFieldStages[selected];
    if (berensteinFieldNotes) berensteinFieldNotes.dataset.stage = selected;
    if (berensteinFieldStageValue) berensteinFieldStageValue.textContent = stage.label;
    setInlineMathContent(berensteinFieldStatus, stage.statusMath);
    if (berensteinFieldGuide) berensteinFieldGuide.setAttribute("aria-label", stage.label + ". " + stage.status);
  };

  if (berensteinFieldStage) berensteinFieldStage.addEventListener("change", updateBerensteinField);
  requestAnimationFrame(updateBerensteinField);

  const localGlobalCanvas = document.getElementById("localGlobalCanvas");
  const localGlobalProblem = document.getElementById("localGlobalProblem");
  const localGlobalProblemValue = document.getElementById("localGlobalProblemValue");
  const localGlobalScope = document.getElementById("localGlobalScope");
  const localGlobalScopeValue = document.getElementById("localGlobalScopeValue");
  const localGlobalStatus = document.getElementById("localGlobalStatus");
  let selectedLocalGlobalProblem = "schiffer";
  let selectedLocalGlobalScope = "local";

  const localGlobalStates = Object.freeze({
    schiffer: Object.freeze({
      label: "Schiffer",
      folds: 10,
      data: "(u, ∂νu) = (1, 0)",
      localMath: "Local analytic Cauchy theory makes \\(u=1\\) with \\(\\partial_\\nu u=0\\) in a collar, but does not close the solution through the interior.",
      globalMath: "The fixed-disk equation, harmonic compatibility rows, and tail bounds close the Schiffer field on all of \\(\\mathbb D\\).",
    }),
    berenstein: Object.freeze({
      label: "Berenstein",
      folds: 13,
      data: "(u, ∂νu) = (0, 1)",
      localMath: "Local analytic Cauchy theory makes \\(u=0\\) with \\(\\partial_\\nu u=1\\) in a collar, but does not close the solution through the interior.",
      globalMath: "The interior equation, boundary trace equation, sign gate, and tail bounds close the Berenstein field on all of \\(\\mathbb D\\).",
    }),
  });

  const drawLocalGlobal = () => {
    if (!localGlobalCanvas) return;
    const rectangle = localGlobalCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 180) return;
    const { context, width, height } = prepareCanvas(localGlobalCanvas, { maxPixelRatio: 4 });
    drawCanvasBackdrop(context, width, height);
    const compact = width < 520;
    const state = localGlobalStates[selectedLocalGlobalProblem];
    const isGlobal = selectedLocalGlobalScope === "global";
    const centerX = width / 2;
    const centerY = height * .52;
    const radius = Math.min(width * (compact ? .31 : .27), height * .32);
    const amplitude = selectedLocalGlobalProblem === "schiffer" ? .05 : .045;

    drawLabel(context, isGlobal ? "Global closure on the whole disk" : "Local analytic collar", centerX, 28, {
      align: "center",
      color: isGlobal ? colors.teal : colors.gold,
      size: compact ? 14 : 16,
      weight: 700,
    });
    drawLabel(context, state.label + " · " + state.data, centerX, 50, {
      align: "center",
      color: colors.heading,
      size: compact ? 11 : 13,
      weight: 700,
    });

    if (isGlobal) {
      for (let band = 8; band >= 1; band -= 1) {
        const bandRadius = radius * band / 8;
        traceSymmetricOutline(context, centerX, centerY, bandRadius, state.folds, amplitude * band / 8);
        const negative = selectedLocalGlobalProblem === "berenstein"
          ? band % 2 === 0
          : band % 3 === 0;
        context.fillStyle = negative ? "rgba(50, 95, 123, .13)" : "rgba(215, 106, 12, .10)";
        context.fill();
        context.strokeStyle = "rgba(17, 17, 17, .10)";
        context.lineWidth = .7;
        context.stroke();
      }
      traceSymmetricOutline(context, centerX, centerY, radius, state.folds, amplitude);
      context.strokeStyle = colors.teal;
      context.lineWidth = 2.5;
      context.stroke();
    } else {
      traceSymmetricOutline(context, centerX, centerY, radius, state.folds, amplitude);
      context.fillStyle = "rgba(255, 255, 248, .98)";
      context.fill();
      context.strokeStyle = selectedLocalGlobalProblem === "schiffer" ? colors.accent : colors.teal;
      context.lineWidth = 28;
      context.globalAlpha = .16;
      context.stroke();
      context.globalAlpha = 1;
      traceSymmetricOutline(context, centerX, centerY, radius, state.folds, amplitude);
      context.strokeStyle = selectedLocalGlobalProblem === "schiffer" ? colors.accent : colors.teal;
      context.lineWidth = 2.4;
      context.stroke();
      context.beginPath();
      context.arc(centerX, centerY, radius * .67, 0, Math.PI * 2);
      context.strokeStyle = colors.ruleDark;
      context.lineWidth = 1.2;
      context.setLineDash([5, 5]);
      context.stroke();
      context.setLineDash([]);
      drawLabel(context, "unresolved", centerX, centerY + 4, {
        align: "center",
        color: colors.muted,
        size: compact ? 12 : 14,
        weight: 700,
      });
    }

    if (selectedLocalGlobalProblem === "berenstein") {
      for (let index = 0; index < 13; index += 2) {
        const theta = index / 13 * Math.PI * 2;
        const localRadius = radius * (1 + amplitude * Math.cos(13 * theta));
        drawArrow(
          context,
          centerX + (localRadius + 2) * Math.cos(theta),
          centerY + (localRadius + 2) * Math.sin(theta),
          centerX + (localRadius + 13) * Math.cos(theta),
          centerY + (localRadius + 13) * Math.sin(theta),
          { color: colors.teal, width: 1.2, head: 4.5 },
        );
      }
    } else {
      for (let index = 0; index < 10; index += 1) {
        const theta = index / 10 * Math.PI * 2;
        const localRadius = radius * (1 + amplitude * Math.cos(10 * theta));
        context.beginPath();
        context.arc(
          centerX + localRadius * Math.cos(theta),
          centerY + localRadius * Math.sin(theta),
          2.6,
          0,
          Math.PI * 2,
        );
        context.fillStyle = colors.white;
        context.fill();
        context.strokeStyle = colors.accent;
        context.lineWidth = 1.2;
        context.stroke();
      }
    }

    drawLabel(
      context,
      isGlobal
        ? (compact ? "fixed-disk bounds close globally" : "fixed-disk equations + compatibility + infinite tails")
        : (compact ? "Cauchy data give a collar only" : "analytic Cauchy data ⇒ a sufficiently thin collar"),
      centerX,
      height - 18,
      {
        align: "center",
        color: isGlobal ? colors.teal : colors.gold,
        size: compact ? 10 : 12,
        weight: 700,
      },
    );
    localGlobalCanvas.setAttribute(
      "aria-label",
      "Schematic mechanism. " + state.label + " boundary data " + state.data + ". "
        + (isGlobal
          ? "The whole disk is filled to show global closure: all interior equations, boundary or compatibility equations, and infinite-tail equations hold simultaneously. This is conceptual, not a computed field."
          : "Only a boundary collar is filled. Local analytic Cauchy theory supplies this collar but leaves the centre unresolved and therefore does not by itself produce a counterexample."),
    );
  };

  const updateLocalGlobal = () => {
    selectedLocalGlobalProblem = localGlobalProblem?.value === "berenstein" ? "berenstein" : "schiffer";
    selectedLocalGlobalScope = localGlobalScope?.value === "global" ? "global" : "local";
    const state = localGlobalStates[selectedLocalGlobalProblem];
    if (localGlobalProblemValue) localGlobalProblemValue.textContent = state.label;
    if (localGlobalScopeValue) localGlobalScopeValue.textContent = selectedLocalGlobalScope === "global"
      ? "global closure"
      : "local collar";
    setInlineMathContent(
      localGlobalStatus,
      selectedLocalGlobalScope === "global" ? state.globalMath : state.localMath,
    );
    drawLocalGlobal();
  };

  if (localGlobalProblem) localGlobalProblem.addEventListener("change", updateLocalGlobal);
  if (localGlobalScope) localGlobalScope.addEventListener("change", updateLocalGlobal);
  observeCanvas(localGlobalCanvas, drawLocalGlobal);
  requestAnimationFrame(updateLocalGlobal);

  const computerOverviewCanvas = document.getElementById("computerOverviewCanvas");
  const computerOverviewState = document.getElementById("computerOverviewState");
  const computerOverviewPlayButton = document.getElementById("computerOverviewPlayButton");
  const computerOverviewPlayIcon = document.getElementById("computerOverviewPlayIcon");
  const computerOverviewPlayLabel = document.getElementById("computerOverviewPlayLabel");
  const computerOverviewButtons = Array.from(document.querySelectorAll("[data-computer-overview-stage]"));
  const computerOverviewLabels = Array.from(document.querySelectorAll("#computerOverviewLabelLayer .computer-overview-label"));
  const computerOverviewReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;

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
      note: "Start from a disk solving the relaxed condition ∂νu = c. Numerical continuation changes the domain and c; stop when c reaches zero, and store that endpoint as x°.",
      noteMath: "Start from a disk solving the relaxed condition \\(\\partial_\\nu u=c\\). Numerical continuation changes the domain and \\(c\\); stop when \\(c\\) reaches zero, and store that endpoint as \\(x^\\circ\\).",
      animation: 3000,
      hold: 3400,
    }),
    Object.freeze({
      title: "Move every candidate to one disk",
      note: "The conformal map φₚ carries the unit disk to the candidate domain. Looking back through that map gives U = u ∘ φₚ, the same Helmholtz field in fixed disk coordinates. The geometry is stored in p = kφₚ′.",
      noteMath: "The conformal map \\(\\phi_p\\) carries the unit disk to the candidate domain. Looking back through that map gives \\(U=u\\circ\\phi_p\\), the same Helmholtz field in fixed disk coordinates. The geometry is stored in \\(p=k\\phi_p'\\).",
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
      note: "We choose r = 10⁻⁶ and certify the bound ‖T(x) − x°‖ ≤ Y + Zr + C₂r² + C₃r³ < 0.622r for every x in the ball. Here Y bounds the error at the centre, Z the linear change, and C₂,C₃ the nonlinear change. Thus every Newton step stays inside the ball. A second estimate says that T shrinks distances there by a factor less than 0.622, so its iterates converge to one exact zero x*.",
      noteMath: "We choose \\(r=10^{-6}\\) and certify \\(\\lVert T(x)-x^\\circ\\rVert\\le Y+Zr+C_2r^2+C_3r^3<0.622r\\) for every \\(x\\) in the ball. Here \\(Y\\) bounds the error at the centre, \\(Z\\) the linear change, and \\(C_2,C_3\\) the nonlinear change. Thus every Newton step stays inside the ball. A second estimate says that \\(T\\) shrinks distances there by a factor less than \\(0.622\\), so its iterates converge to one exact zero \\(x^*\\).",
      animation: 2800,
      hold: 4000,
    }),
    Object.freeze({
      title: "Final non-disk domain",
      note: "The exact solution is the pair x* = (g*,p*). Its second component p* contains the conformal shape coefficients, so it directly determines the domain Ω*. With the normalization used here, a disk has no nonconstant conformal coefficients. The certificate proves that the first one satisfies |q₁*| > 0.03459, hence Ω* is not a disk. A separate derivative bound proves that the conformal map is one-to-one.",
      noteMath: "The exact solution is the pair \\(x^*=(g^*,p^*)\\). Its second component \\(p^*\\) contains the conformal shape coefficients, so it directly determines the domain \\(\\Omega^*\\). With the normalization used here, a disk has no nonconstant conformal coefficients. The certificate proves that the first one satisfies \\(|q_1^*|>0.03459\\), hence \\(\\Omega^*\\) is not a disk. A separate derivative bound proves that the conformal map is one-to-one.",
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
    const pCoordinate = mix(-.66, .68, progress);
    const gCoordinate = .58 * Math.sin(progress * Math.PI * 1.35 - .55);
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
    for (let index = 0; index <= pathSamples; index += 1) {
      const amount = index / pathSamples;
      const pathP = mix(-.66, .68, amount);
      const pathG = .58 * Math.sin(amount * Math.PI * 1.35 - .55);
      const x = spaceCenter.x + pathP * spaceRadius;
      const y = spaceCenter.y - pathG * spaceRadius;
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
      y: area.y + area.height * .52,
    };
    const radius = Math.min(
      area.width * .20,
      area.height * .35,
    );
    const imageRadius = radius * .622;
    const target = { x: center.x + radius * .12, y: center.y - radius * .09 };

    const formulaX = area.x + area.width * .005;
    const formulaAlignment = { align: "left" };
    placeComputerOverviewLabel("overviewFixedBound", formulaX, area.y + area.height * .43, formulaAlignment);
    placeComputerOverviewLabel(
      "overviewFixedContraction",
      formulaX,
      area.y + area.height * (compact ? .70 : .64),
      formulaAlignment,
    );
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(160, 0, 0, .035)";
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.7;
    context.stroke();
    drawArrow(context, center.x - radius * .72, center.y, center.x + radius * .78, center.y, {
      color: "rgba(7, 87, 96, .48)",
      width: 1.2,
      head: 4,
    });
    drawArrow(context, center.x, center.y + radius * .72, center.x, center.y - radius * .78, {
      color: "rgba(160, 0, 0, .48)",
      width: 1.2,
      head: 4,
    });
    context.beginPath();
    context.arc(center.x, center.y, imageRadius, 0, Math.PI * 2);
    context.fillStyle = "rgba(7, 87, 96, .09)";
    context.fill();
    context.strokeStyle = colors.teal;
    context.lineWidth = 1.8;
    context.stroke();
    placeComputerOverviewLabel("overviewFixedBall", center.x, center.y - radius - 17);
    placeComputerOverviewLabel("overviewFixedImage", center.x, center.y + imageRadius + 14);

    context.beginPath();
    context.arc(center.x, center.y, compact ? 2.5 : 3, 0, Math.PI * 2);
    context.fillStyle = colors.heading;
    context.fill();
    placeComputerOverviewLabel("overviewFixedCenter", center.x - 7, center.y + 15, { align: "right" });

    const q = .621244000000036;
    const orbit = [];
    for (let step = 0; step <= 6; step += 1) {
      const distance = radius * .72 * q ** step;
      const angle = -.12 + step * .72;
      orbit.push({ x: target.x + distance * Math.cos(angle), y: target.y - distance * Math.sin(angle) });
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
    context.fillStyle = colors.accent;
    context.fill();
    placeComputerOverviewLabel("overviewFixedTarget", target.x + 8, target.y - 8, { align: "left" });
  };

  const drawSimpleOverviewFinalDomain = (context, area, motion) => {
    const compact = area.width < 420;
    const progress = computerOverviewEase(clamp(motion, 0, 1));
    const pairCenter = {
      x: area.x + area.width * (compact ? .50 : .20),
      y: area.y + area.height * (compact ? .10 : .43),
    };
    const domainCenter = {
      x: area.x + area.width * (compact ? .50 : .72),
      y: area.y + area.height * (compact ? .60 : .43),
    };
    const domainRadius = Math.min(
      area.width * (compact ? .23 : .20),
      area.height * (compact ? .20 : .30),
    );
    placeComputerOverviewLabel("overviewFinalPair", pairCenter.x, pairCenter.y);

    context.beginPath();
    context.arc(domainCenter.x, domainCenter.y, domainRadius, 0, Math.PI * 2);
    context.setLineDash([4, 5]);
    context.strokeStyle = "rgba(17, 17, 17, .24)";
    context.lineWidth = 1;
    context.stroke();
    context.setLineDash([]);
    drawOverviewDomain(context, domainCenter.x, domainCenter.y, domainRadius, progress, {
      fill: "rgba(7, 87, 96, .08)",
      stroke: colors.teal,
      lineWidth: 2.3,
    });
    placeComputerOverviewLabel(
      "overviewFinalDomain",
      domainCenter.x,
      domainCenter.y - domainRadius - (compact ? 18 : 23),
    );
    placeComputerOverviewLabel(
      "overviewFinalShape",
      compact ? domainCenter.x : pairCenter.x,
      compact ? domainCenter.y - domainRadius + 13 : pairCenter.y + 67,
    );

    const proofY = area.y + area.height * .84;
    placeComputerOverviewLabel("overviewFinalCoefficient", area.x + area.width * .50, proofY);
    placeComputerOverviewLabel("overviewFinalDisk", area.x + area.width * .50, proofY + (compact ? 27 : 31));
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
    const motion = computerOverviewReducedMotion ? 1 : clamp(elapsed / stage.animation, 0, 1);
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
    return !computerOverviewReducedMotion
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
    if (computerOverviewReducedMotion) {
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
    "After rescaling the angle, the collar equation makes sense for real order R. The core is retained through its Dirichlet-to-Neumann map.",
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
      drawLabel(context, "real order R", width / 2, 25, { align: "center", color: colors.heading, size: 13 });
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
