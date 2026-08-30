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

  const drawLabel = (context, text, x, y, options = {}) => {
    context.fillStyle = options.color || colors.muted;
    context.font = `${options.weight || 400} ${options.size || 12}px et-book, Palatino, Georgia, serif`;
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

  const conformalCoefficients = Object.freeze([
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
      const coefficient = conformalCoefficients[index];
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
      const coefficient = amplitude * conformalCoefficients[index] * radius ** frequency;
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
      const coefficient = conformalCoefficients[index] * (exponent + 1) * radius ** exponent;
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

    drawLabel(context, `Boundary from ${cutoff} coefficient${cutoff === 1 ? "" : "s"}`, centerX, domain.y - 8, {
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

    drawLabel(context, "Size of each boundary correction", plot.x, plot.y, {
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    const selectedCoefficient = conformalCoefficients[cutoff - 1];
    drawLabel(
      context,
      `#${cutoff}: ${formatScientific(selectedCoefficient, 2)} · ${10 * cutoff} ripples`,
      plot.x,
      plot.y + 18,
      { color: colors.muted, size: 14 },
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
        size: 14,
      });
    });
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(chart.x, chart.y);
    context.lineTo(chart.x, chart.y + chart.height);
    context.lineTo(chart.x + chart.width, chart.y + chart.height);
    context.stroke();

    const coefficientLogs = conformalCoefficients.map((coefficient) => Math.log10(coefficient));
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
    drawLabel(context, "coefficient number", chart.x + chart.width / 2, chart.y + chart.height + 34, {
      align: "center",
      color: colors.muted,
      size: 14,
    });

    if (boundaryModesValue) boundaryModesValue.textContent = `${cutoff} of 30`;
    if (boundaryModes) boundaryModes.setAttribute("aria-valuetext", `${cutoff} of 30 printed conformal coefficients`);
    boundaryCanvas.setAttribute(
      "aria-label",
      `Numerical ten-fold conformal boundary using ${cutoff} of 30 printed coefficients, compared with the dashed unit circle. The newest included coefficient has size ${selectedCoefficient.toExponential(3)} and adds a ${10 * cutoff}-fold correction. The coefficient-size graph decays from about ten to the minus two to ten to the minus eighteen. Overall radial range ${minimumRadius.toFixed(6)} to ${maximumRadius.toFixed(6)}.`,
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
      title: "The circle can move in a ten-lobed direction",
      status: "At this disk frequency, the equations allow a ten-lobed first motion.",
      amplitude: 0,
      flux: .82,
      showDirection: true,
    }),
    Object.freeze({
      label: "relaxed solutions",
      title: "Follow noncircular relaxed solutions",
      status: "The search changes the field, shape and frequency while keeping the normal derivative equal to one constant c around the boundary.",
      amplitude: .52,
      flux: .48,
      trail: Object.freeze([.26]),
    }),
    Object.freeze({
      label: "zero-flux centre",
      title: "Stop when the normal change is zero",
      status: "At c = 0 the relaxed boundary condition becomes the target condition. This endpoint is stored as the computed centre x°.",
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
    const domainCenterY = compact ? height * .46 : height * .47;
    const domainRadius = Math.min(compact ? width * .29 : width * .27, compact ? height * .27 : height * .31);
    drawLabel(context, stage.title, domainCenterX, 30, {
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
    }
    if (stage.trail) {
      stage.trail.forEach((amplitude, index) => {
        traceConformalBoundary(context, domainCenterX, domainCenterY, domainRadius, amplitude, {
          stroke: `rgba(38, 36, 31, ${.10 + index * .035})`,
          lineWidth: 1.1,
        });
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
    drawLabel(context, stage.flux > 0 ? "same normal change all around" : "zero normal change all around", domainCenterX, domainCenterY + domainRadius + 48, {
      align: "center",
      color: stage.flux > 0 ? colors.teal : colors.accent,
      size: 14,
      weight: 700,
    });
    drawLabel(context, stage.endpoint ? "computed centre" : selectedSearchStage === 0 ? "disk" : "relaxed solution", domainCenterX, domainCenterY + 4, {
      align: "center",
      color: stage.endpoint ? colors.accent : colors.muted,
      size: 14,
      weight: stage.endpoint ? 700 : 400,
    });

    searchCanvas.setAttribute(
      "aria-label",
      `Numerical-search stage ${selectedSearchStage + 1} of 3: ${stage.label}. ${stage.status} Equal teal arrows represent the constant normal derivative on the whole boundary; hollow boundary markers in the last stage represent zero normal derivative. The intermediate shapes are schematic.`,
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
      compact ? width * .245 : width * .185,
      compact ? height * .175 : height * .31,
    );
    const diskCenter = compact
      ? { x: width / 2, y: height * .245 }
      : { x: width * .76, y: height * .53 };
    const domainCenter = compact
      ? { x: width / 2, y: height * .755 }
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
      drawLabel(context, "fixed disk 𝔻", diskCenter.x, diskCenter.y - radius - 18, { align: "center", color: colors.heading, size: 14, weight: 700 });
      drawLabel(context, "physical domain Ω", domainCenter.x, domainCenter.y - radius - 18, { align: "center", color: colors.heading, size: 14, weight: 700 });
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
      labelX: -27,
      labelY: -14,
    });
    drawCorrespondingPoint(context, physicalPoint.x, physicalPoint.y, "x = φₚ(z)", {
      color: colors.accent,
      labelX: -53,
      labelY: -10,
    });

    drawLabel(
      context,
      "the color at z is carried to the color at x",
      width / 2,
      height - 16,
      { align: "center", color: colors.muted, size: 14 },
    );

    pullbackCanvas.setAttribute(
      "aria-label",
      "The fixed disk is mapped by phi sub p to the physical domain. A marked disk point z maps to x equals phi sub p of z, and matching colors show that the field value is unchanged: U of z equals u of x.",
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

  const drawBalanceRow = (context, box, title, contributions) => {
    const positiveTotal = contributions.reduce((sum, item) => sum + Math.max(0, item.value), 0);
    const negativeTotal = contributions.reduce((sum, item) => sum + Math.max(0, -item.value), 0);
    const scaleTotal = Math.max(positiveTotal, negativeTotal, 1e-15);
    const centerX = box.x + box.width / 2;
    const halfWidth = box.width * .38;
    const barY = box.y + 35;
    const barHeight = 24;

    drawLabel(context, title, box.x, box.y + 10, {
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawLabel(context, "sum = 0", box.x + box.width, box.y + 10, {
      align: "right",
      color: colors.teal,
      size: 12,
      weight: 700,
    });

    let positiveOffset = 0;
    let negativeOffset = 0;
    contributions.forEach((item) => {
      const segmentWidth = Math.abs(item.value) / scaleTotal * halfWidth;
      const isPositive = item.value >= 0;
      const x = isPositive
        ? centerX + positiveOffset
        : centerX - negativeOffset - segmentWidth;
      if (segmentWidth > .5) {
        context.fillStyle = item.color;
        context.globalAlpha = .78;
        context.fillRect(x, barY, segmentWidth, barHeight);
        context.globalAlpha = 1;
        context.strokeStyle = item.color;
        context.lineWidth = 1.1;
        context.strokeRect(x + .5, barY + .5, Math.max(0, segmentWidth - 1), barHeight - 1);
      } else {
        context.beginPath();
        context.arc(centerX, barY + barHeight / 2, 2.5, 0, Math.PI * 2);
        context.fillStyle = item.color;
        context.fill();
      }
      if (segmentWidth >= 24) {
        drawLabel(context, item.label, x + segmentWidth / 2, barY + barHeight / 2 + 1, {
          align: "center",
          baseline: "middle",
          color: colors.white,
          size: 11,
          weight: 700,
        });
      }
      if (isPositive) positiveOffset += segmentWidth;
      else negativeOffset += segmentWidth;
    });

    context.beginPath();
    context.moveTo(centerX, barY - 6);
    context.lineTo(centerX, barY + barHeight + 6);
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.3;
    context.stroke();
    drawLabel(context, "negative", centerX - halfWidth, barY + barHeight + 18, {
      color: colors.muted,
      size: 10,
    });
    drawLabel(context, "positive", centerX + halfWidth, barY + barHeight + 18, {
      align: "right",
      color: colors.muted,
      size: 10,
    });
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
    const responseHeaderX = compact ? width * .80 : width * .765;
    const headerArrowStart = compact ? width * .37 : width * .38;
    const headerArrowEnd = compact ? width * .57 : width * .60;
    drawLabel(context, `source Φ${selectedInverseAngular},${selectedInverseRadial}`, sourceHeaderX, 27, {
      align: "center",
      color: colors.heading,
      size: compact ? 16 : 18,
      weight: 700,
    });
    drawArrow(context, headerArrowStart, 22, headerArrowEnd, 22, {
      color: colors.accent,
      width: 3,
      head: 6,
    });
    drawLabel(context, "K", (headerArrowStart + headerArrowEnd) / 2, 15, {
      align: "center",
      color: colors.accent,
      size: compact ? 16 : 18,
      weight: 700,
    });
    drawLabel(context, "response v = KΦ", responseHeaderX, 27, {
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
      y: compact ? 67 : 68,
      width: width - (compact ? 60 : 154),
      height: axisLabelY - 23 - (compact ? 67 : 68),
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
      sumSamples.push(step === sampleCount ? 0 : value);
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
    context.beginPath();
    context.arc(endpointX, zeroY, 4.5, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.1;
    context.stroke();
    context.beginPath();
    context.moveTo(endpointX - 34, zeroY);
    context.lineTo(Math.min(width - 16, endpointX + 52), zeroY);
    context.strokeStyle = colors.accent;
    context.lineWidth = 2;
    context.stroke();

    drawLabel(context, "centre", plot.x, axisLabelY, {
      color: colors.muted,
      size: compact ? 16 : 17,
    });
    drawLabel(context, "boundary r = 1", endpointX, axisLabelY, {
      align: compact ? "right" : "center",
      color: colors.heading,
      size: compact ? 16 : 17,
      weight: 700,
    });
    drawLabel(context, "hits zero", Math.min(width - 14, endpointX + 58), zeroY - 22, {
      align: "right",
      color: colors.accent,
      size: compact ? 16 : 17,
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
    drawLabel(context, "arrives flat", Math.min(width - 14, endpointX + 58), zeroY + 25, {
      align: "right",
      color: colors.accent,
      size: compact ? 16 : 17,
      weight: 700,
    });

    inverseCanvas.setAttribute(
      "aria-label",
      `For source mode ell ${selectedInverseAngular}, radial index ${selectedInverseRadial}, the compatible inverse combines radial indices ${selectedInverseRadial - 1}, ${selectedInverseRadial}, and ${selectedInverseRadial + 1}. The three colored radial profiles sum to the black response, which reaches value zero with slope zero at the boundary.`,
    );
  };

  const updateInverse = () => {
    selectedInverseAngular = clamp(Math.round(Number(inverseAngularMode?.value || 1)), 0, 3);
    selectedInverseRadial = clamp(Math.round(Number(inverseRadialMode?.value || 1)), 1, 4);
    const D = 10 * selectedInverseAngular + 2 * selectedInverseRadial;
    if (inverseAngularModeValue) inverseAngularModeValue.textContent = `ℓ = ${selectedInverseAngular}`;
    if (inverseRadialModeValue) inverseRadialModeValue.textContent = `s = ${selectedInverseRadial}`;
    if (inverseStatus) inverseStatus.textContent = `Here D = ${D}. The three weighted profiles cancel exactly at r = 1: their response has value 0 and radial derivative 0.`;
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
    Object.freeze({ label: "omitted equations", status: "Every equation just outside those finite blocks that can be reached from the stored centre is listed." }),
    Object.freeze({ label: "nearby tail", status: "Every nearby coefficient that can interact with a finite block is bounded explicitly." }),
    Object.freeze({ label: "remote tail", status: "A decreasing formula covers every larger angular, radial, and shape index." }),
    Object.freeze({ label: "all bounds combined", status: "An exact-fraction checker combines the finite core and both tail regions." }),
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
    const finiteWidth = stripWidth * .47;
    const omittedWidth = stripWidth * .08;
    const nearbyWidth = stripWidth * .15;
    const remoteWidth = stripWidth - finiteWidth - omittedWidth - nearbyWidth;
    const gTop = diagram.y + 36;
    const gHeight = diagram.height * .48;
    const pTop = diagram.y + diagram.height * .72;
    const pHeight = Math.max(30, diagram.height * .13);

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
    for (let column = 1; column < gridColumns; column += 1) {
      const x = finiteG.x + column / gridColumns * finiteG.width;
      context.beginPath();
      context.moveTo(x, finiteG.y);
      context.lineTo(x, finiteG.y + finiteG.height);
      context.stroke();
    }
    for (let row = 1; row < gridRows; row += 1) {
      const y = finiteG.y + row / gridRows * finiteG.height;
      context.beginPath();
      context.moveTo(finiteG.x, y);
      context.lineTo(finiteG.x + finiteG.width, y);
      context.stroke();
    }
    drawLabel(context, "61 × 40 stored", finiteG.x + 9, finiteG.y + 19, {
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
    for (let cell = 1; cell < 10; cell += 1) {
      const x = finiteP.x + cell / 10 * finiteP.width;
      context.beginPath();
      context.moveTo(x, finiteP.y);
      context.lineTo(x, finiteP.y + finiteP.height);
      context.strokeStyle = "rgba(7, 87, 96, .20)";
      context.stroke();
    }
    drawLabel(context, compact ? "31 stored" : "31 stored · j = 0…30", finiteP.x + 8, finiteP.y + finiteP.height / 2 + 1, {
      baseline: "middle",
      color: colors.teal,
      size: 14,
      weight: 700,
    });

    const omittedX = stripX + finiteWidth;
    const nearbyX = omittedX + omittedWidth;
    const remoteX = nearbyX + nearbyWidth;
    if (selectedTailStage >= 1) {
      context.fillStyle = "rgba(160, 0, 0, .09)";
      context.fillRect(omittedX, gTop, omittedWidth, gHeight);
      context.fillRect(omittedX, pTop, omittedWidth, pHeight);
      context.fillRect(finiteG.x, gTop - 13, finiteG.width + omittedWidth, 13);
      context.strokeStyle = colors.accent;
      context.lineWidth = 1.2;
      context.setLineDash([4, 3]);
      context.strokeRect(omittedX + .5, gTop + .5, omittedWidth - 1, gHeight - 1);
      context.strokeRect(omittedX + .5, pTop + .5, omittedWidth - 1, pHeight - 1);
      context.strokeRect(finiteG.x + .5, gTop - 12.5, finiteG.width + omittedWidth - 1, 12);
      context.setLineDash([]);
      drawLabel(context, "reached equations", finiteG.x, gTop - 19, {
        color: colors.accent,
        size: 14,
        weight: 700,
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
      drawLabel(context, "exact checker", checker.x + checker.width / 2, checker.y + (compact ? 20 : 25), {
        align: "center",
        color: colors.heading,
        size: 14,
        weight: 700,
      });
      drawLabel(context, "finite + nearby + tail", checker.x + checker.width / 2, checker.y + checker.height * .52, {
        align: "center",
        baseline: "middle",
        color: colors.muted,
        size: 14,
      });
      drawLabel(context, "Y, Z, C₂, C₃", checker.x + checker.width / 2, checker.y + checker.height * .79, {
        align: "center",
        baseline: "middle",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
      if (compact) drawArrow(context, width / 2, diagram.y + diagram.height + 2, width / 2, checker.y - 7, { color: colors.heading });
      else drawArrow(context, diagram.x + diagram.width + 2, diagram.y + diagram.height / 2, checker.x - 8, checker.y + checker.height / 2, { color: colors.heading });
    }
    tailCanvas.setAttribute(
      "aria-label",
      `Certificate layer ${selectedTailStage + 1} of 5: ${tailStages[selectedTailStage].label}. The two-dimensional field array g and the one-dimensional shape-and-frequency list p are shown separately. ${tailStages[selectedTailStage].status}`,
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
  const certificateRadius = document.getElementById("certificateRadius");
  const certificateRadiusValue = document.getElementById("certificateRadiusValue");
  const certificateValue = document.getElementById("certificateValue");
  const certificateDerivative = document.getElementById("certificateDerivative");
  const certificateIteration = document.getElementById("certificateIteration");
  const certificateVerdict = document.getElementById("certificateVerdict");
  const certificatePlayButton = document.getElementById("certificatePlayButton");
  const certificatePlayIcon = document.getElementById("certificatePlayIcon");
  const certificatePlayLabel = document.getElementById("certificatePlayLabel");
  const certificateBounds = Object.freeze({ Y: 1.59e-10, Z: .621, C2: 122, C3: .012 });
  const certificateMaximumIteration = 8;
  let selectedMicroRadius = 1;
  let certificateIterationProgress = 0;
  let certificateAnimationFrame = null;
  let certificateAnimationStart = null;

  const radiiPolynomial = (value) => certificateBounds.Y
    + (certificateBounds.Z - 1) * value
    + certificateBounds.C2 * value * value
    + certificateBounds.C3 * value * value * value;
  const radiiDerivative = (value) => certificateBounds.Z - 1
    + 2 * certificateBounds.C2 * value
    + 3 * certificateBounds.C3 * value * value;
  const contractionFactor = (value) => 1 + radiiDerivative(value);
  const imageRadiusBound = (value) => certificateBounds.Y
    + certificateBounds.Z * value
    + certificateBounds.C2 * value * value
    + certificateBounds.C3 * value * value * value;

  const rationalAdd = (left, right) => ({
    numerator: left.numerator * right.denominator + right.numerator * left.denominator,
    denominator: left.denominator * right.denominator,
  });
  const rationalMultiply = (left, right) => ({
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  });
  const exactCertificateSigns = (microThousandths) => {
    const t = { numerator: BigInt(microThousandths), denominator: 1000000000n };
    const square = rationalMultiply(t, t);
    const cube = rationalMultiply(square, t);
    const value = [
      { numerator: 159n, denominator: 1000000000000n },
      rationalMultiply({ numerator: -379n, denominator: 1000n }, t),
      rationalMultiply({ numerator: 122n, denominator: 1n }, square),
      rationalMultiply({ numerator: 3n, denominator: 250n }, cube),
    ].reduce(rationalAdd);
    const derivative = [
      { numerator: -379n, denominator: 1000n },
      rationalMultiply({ numerator: 244n, denominator: 1n }, t),
      rationalMultiply({ numerator: 9n, denominator: 250n }, square),
    ].reduce(rationalAdd);
    return { value: value.numerator < 0n, derivative: derivative.numerator < 0n };
  };

  const currentCertificateData = () => {
    const microThousandths = Math.round(selectedMicroRadius * 1000);
    const radius = microThousandths * 1e-9;
    const signs = exactCertificateSigns(microThousandths);
    const q = contractionFactor(radius);
    const mappedRadius = imageRadiusBound(radius);
    return {
      microThousandths,
      radius,
      signs,
      q,
      mappedRadius,
      fixedPointBound: q < 1 ? certificateBounds.Y / (1 - q) : Number.POSITIVE_INFINITY,
      pass: signs.value && signs.derivative,
    };
  };

  const orbitPoint = (targetX, targetY, ballRadius, q, step) => {
    const distance = ballRadius * .62 * q ** step;
    const angle = -.35 + .72 * step;
    return {
      x: targetX + distance * Math.cos(angle),
      y: targetY - distance * Math.sin(angle),
    };
  };

  const drawIterationBall = (context, area, data) => {
    const compact = area.compact;
    const centerX = compact ? area.width / 2 : area.width * .27;
    const centerY = compact ? area.height * .275 : area.height * .53;
    const ballRadius = Math.min(
      compact ? area.width * .225 : area.width * .185,
      compact ? area.height * .19 : area.height * .34,
    );
    const mappedRatio = data.radius > 0 ? data.mappedRadius / data.radius : Number.POSITIVE_INFINITY;
    const mappedScreenRadius = ballRadius * Math.min(mappedRatio, 1.17);

    drawLabel(context, "1 · stays inside the chosen ball", centerX, compact ? 18 : 24, {
      align: "center",
      color: data.signs.value ? colors.teal : colors.accent,
      size: compact ? 11 : 12,
      weight: 700,
    });

    context.beginPath();
    context.arc(centerX, centerY, ballRadius, 0, Math.PI * 2);
    context.fillStyle = colors.accentLight;
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.6;
    context.stroke();

    context.beginPath();
    context.arc(centerX, centerY, mappedScreenRadius, 0, Math.PI * 2);
    context.fillStyle = data.signs.value ? colors.tealLight : "rgba(160, 0, 0, .06)";
    context.fill();
    context.strokeStyle = data.signs.value ? colors.teal : colors.accent;
    context.lineWidth = 1.6;
    if (!data.signs.value) context.setLineDash([5, 4]);
    context.stroke();
    context.setLineDash([]);

    drawLabel(context, "Bᵣ(x°)", centerX - ballRadius * .72, centerY - ballRadius * .71, {
      color: colors.heading,
      size: 11,
      weight: 700,
    });
    drawLabel(
      context,
      data.signs.value
        ? "every T(x) lands in the teal disk"
        : "the bound for T(x) reaches outside",
      centerX,
      centerY + ballRadius + 23,
      {
        align: "center",
        color: data.signs.value ? colors.teal : colors.accent,
        size: compact ? 10 : 11,
      },
    );

    if (data.pass) {
      const fixedRatio = data.radius > 0 ? data.fixedPointBound / data.radius : 1;
      const coreRadius = clamp(ballRadius * fixedRatio, 8, ballRadius * .72);
      const fixedPointX = centerX + coreRadius * .42;
      const fixedPointY = centerY - coreRadius * .25;
      context.beginPath();
      context.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      context.fillStyle = "rgba(160, 0, 0, .10)";
      context.fill();
      context.strokeStyle = colors.accent;
      context.lineWidth = 1;
      context.setLineDash([3, 3]);
      context.stroke();
      context.setLineDash([]);

      context.strokeStyle = colors.heading;
      context.lineWidth = 1.2;
      context.beginPath();
      context.moveTo(centerX - 4, centerY);
      context.lineTo(centerX + 4, centerY);
      context.moveTo(centerX, centerY - 4);
      context.lineTo(centerX, centerY + 4);
      context.stroke();
      drawLabel(context, "x°", centerX - 7, centerY + 15, {
        align: "right",
        color: colors.heading,
        size: 11,
        weight: 700,
      });
      context.beginPath();
      context.arc(fixedPointX, fixedPointY, 2.8, 0, Math.PI * 2);
      context.fillStyle = colors.accent;
      context.fill();
      drawLabel(context, "x*", fixedPointX + 6, fixedPointY - 5, {
        color: colors.accent,
        size: 11,
        weight: 700,
      });

      const progress = clamp(certificateIterationProgress, 0, certificateMaximumIteration);
      const completeSteps = Math.floor(progress);
      const partial = progress - completeSteps;
      const points = [];
      for (let step = 0; step <= completeSteps; step += 1) {
        points.push(orbitPoint(fixedPointX, fixedPointY, ballRadius, data.q, step));
      }
      if (partial > 0 && completeSteps < certificateMaximumIteration) {
        const from = orbitPoint(fixedPointX, fixedPointY, ballRadius, data.q, completeSteps);
        const to = orbitPoint(fixedPointX, fixedPointY, ballRadius, data.q, completeSteps + 1);
        points.push({
          x: mix(from.x, to.x, partial),
          y: mix(from.y, to.y, partial),
          partial: true,
        });
      }

      if (points.length > 1) {
        context.beginPath();
        points.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.strokeStyle = colors.accent;
        context.lineWidth = 1.7;
        context.stroke();
      }
      points.forEach((point, index) => {
        context.beginPath();
        context.arc(point.x, point.y, index === points.length - 1 ? 4.2 : 2.7, 0, Math.PI * 2);
        context.fillStyle = index === 0 ? colors.heading : colors.accent;
        context.fill();
      });
      const initialPoint = orbitPoint(fixedPointX, fixedPointY, ballRadius, data.q, 0);
      drawLabel(context, "x₀", initialPoint.x + 8, initialPoint.y - 7, {
        color: colors.heading,
        size: 11,
        weight: 700,
      });
      if (points.length > 1) {
        const current = points[points.length - 1];
        const shownStep = Math.min(certificateMaximumIteration, Math.ceil(progress));
        drawLabel(context, "x" + String(shownStep), current.x + 8, current.y - 7, {
          color: colors.accent,
          size: 11,
          weight: 700,
        });
      }
      drawLabel(context, "certified x* enclosure · enlarged", centerX, centerY + coreRadius + 14, {
        align: "center",
        color: colors.accent,
        size: compact ? 10 : 11,
      });
    }
  };

  const drawConvergencePlot = (context, area, data) => {
    const compact = area.compact;
    const plot = compact
      ? { x: 48, y: area.height * .64, width: area.width - 68, height: area.height * .22 }
      : { x: area.width * .58, y: area.height * .23, width: area.width * .36, height: area.height * .54 };
    const titleY = compact ? plot.y - 24 : area.height * .09;
    drawLabel(context, "2 · distances shrink", plot.x + plot.width / 2, titleY, {
      align: "center",
      color: data.signs.derivative ? colors.teal : colors.accent,
      size: compact ? 11 : 12,
      weight: 700,
    });

    const mapX = (step) => plot.x + step / certificateMaximumIteration * plot.width;
    const mapY = (value) => plot.y + (1 - clamp(value, 0, 1)) * plot.height;
    [0, .5, 1].forEach((value) => {
      const y = mapY(value);
      context.beginPath();
      context.moveTo(plot.x, y);
      context.lineTo(plot.x + plot.width, y);
      context.strokeStyle = value === 0 ? colors.ruleDark : colors.rule;
      context.lineWidth = 1;
      context.stroke();
      drawLabel(context, value.toFixed(1), plot.x - 8, y, {
        align: "right",
        baseline: "middle",
        size: 10,
      });
    });
    for (let step = 0; step <= certificateMaximumIteration; step += 2) {
      const x = mapX(step);
      drawLabel(context, String(step), x, plot.y + plot.height + 18, {
        align: "center",
        size: 10,
      });
    }

    context.beginPath();
    for (let step = 0; step <= certificateMaximumIteration * 20; step += 1) {
      const continuousStep = step / 20;
      const x = mapX(continuousStep);
      const y = mapY(data.q ** continuousStep);
      if (step === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = data.signs.derivative ? colors.teal : colors.accent;
    context.lineWidth = 2.2;
    context.stroke();

    const progress = clamp(certificateIterationProgress, 0, certificateMaximumIteration);
    const markerX = mapX(progress);
    const markerY = mapY(data.q ** progress);
    context.beginPath();
    context.arc(markerX, markerY, 4.2, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 1.8;
    context.stroke();

    drawLabel(context, "relative error bound qⁿ", plot.x, plot.y - 10, {
      color: colors.heading,
      size: 11,
    });
    drawLabel(context, "iteration n", plot.x + plot.width, plot.y + plot.height + 18, {
      align: "right",
      size: 10,
    });
    drawLabel(context, "q ≤ " + data.q.toFixed(6), plot.x + plot.width, plot.y + 14, {
      align: "right",
      color: data.signs.derivative ? colors.teal : colors.accent,
      size: 11,
      weight: 700,
    });
    const explanation = data.pass
      ? "both tests pass: the orbit stays inside and converges"
      : "shrinking alone is not enough if the chosen ball is too small";
    drawLabel(context, explanation, compact ? area.width / 2 : plot.x + plot.width / 2, area.height - 14, {
      align: "center",
      color: data.pass ? colors.teal : colors.accent,
      size: compact ? 10 : 11,
    });
  };

  const drawSimpleCertificate = (context, area, data) => {
    const compact = area.compact;
    const equationX = compact ? area.width / 2 : area.width * .115;
    const equationAlign = compact ? "center" : "left";
    const firstEquationY = compact ? 32 : area.height * .39;
    const secondEquationY = compact ? 86 : area.height * .57;
    const selfMapColor = data.signs.value ? colors.teal : colors.accent;
    const contractionColor = data.signs.derivative ? colors.teal : colors.accent;

    drawLabel(context, data.signs.value ? "T(Bᵣ(x°)) ⊂ Bᵣ(x°)" : "self-map inclusion not certified", equationX, firstEquationY, {
      align: equationAlign,
      color: selfMapColor,
      size: compact ? 17 : 20,
      weight: 700,
    });
    drawLabel(
      context,
      data.signs.value ? "the whole ball maps back inside" : "this ball is not mapped inside itself",
      equationX,
      firstEquationY + 26,
      { align: equationAlign, color: data.signs.value ? colors.muted : colors.accent, size: compact ? 16 : 17 },
    );
    drawLabel(context, data.signs.derivative ? "‖T(x)−T(y)‖ ≤ 0.622 ‖x−y‖" : "contraction not certified", equationX, secondEquationY, {
      align: equationAlign,
      color: contractionColor,
      size: compact ? 17 : 20,
      weight: 700,
    });
    drawLabel(
      context,
      data.signs.derivative ? "each iteration shortens every distance" : "distances are not certified to shrink",
      equationX,
      secondEquationY + 26,
      { align: equationAlign, color: data.signs.derivative ? colors.muted : colors.accent, size: compact ? 16 : 17 },
    );

    const center = compact
      ? { x: area.width / 2, y: area.height * .67 }
      : { x: area.width * .685, y: area.height * .53 };
    const ballRadius = Math.min(
      compact ? area.width * .27 : area.width * .18,
      compact ? area.height * .23 : area.height * .32,
    );
    const mappedRatio = data.radius > 0 ? data.mappedRadius / data.radius : Number.POSITIVE_INFINITY;
    const imageRadius = ballRadius * Math.min(mappedRatio, 1.14);

    context.beginPath();
    context.arc(center.x, center.y, ballRadius, 0, Math.PI * 2);
    context.fillStyle = "rgba(160, 0, 0, .035)";
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.8;
    context.stroke();

    context.beginPath();
    context.arc(center.x, center.y, imageRadius, 0, Math.PI * 2);
    context.fillStyle = data.signs.value ? "rgba(7, 87, 96, .11)" : "rgba(160, 0, 0, .06)";
    context.fill();
    context.strokeStyle = selfMapColor;
    context.lineWidth = 1.8;
    if (!data.signs.value) context.setLineDash([5, 4]);
    context.stroke();
    context.setLineDash([]);

    drawLabel(context, "x = (g, p) coefficient space", center.x, center.y - ballRadius - 27, {
      align: "center",
      color: colors.heading,
      size: 16,
      weight: 700,
    });
    drawLabel(context, "chosen ball Bᵣ(x°)", center.x, center.y - ballRadius - 8, {
      align: "center",
      color: colors.muted,
      size: 16,
    });
    drawLabel(
      context,
      data.signs.value ? "all possible T(x)" : "bound for all possible T(x)",
      center.x,
      center.y + imageRadius + 16,
      { align: "center", color: selfMapColor, size: 16, weight: 700 },
    );

    context.beginPath();
    context.arc(center.x, center.y, 3.2, 0, Math.PI * 2);
    context.fillStyle = colors.heading;
    context.fill();
    drawLabel(context, "x° = x₀", center.x - 8, center.y + 17, {
      align: "right",
      color: colors.heading,
      size: 16,
      weight: 700,
    });

    if (data.pass) {
      const target = {
        x: center.x + ballRadius * .22,
        y: center.y - ballRadius * .16,
      };
      const pointAt = (step) => {
        const startDx = center.x - target.x;
        const startDy = center.y - target.y;
        const scale = data.q ** step;
        const angle = step * .58;
        return {
          x: target.x + scale * (startDx * Math.cos(angle) - startDy * Math.sin(angle)),
          y: target.y + scale * (startDx * Math.sin(angle) + startDy * Math.cos(angle)),
        };
      };
      const progress = clamp(certificateIterationProgress, 0, certificateMaximumIteration);
      const fullSteps = Math.floor(progress);
      const points = [];
      for (let step = 0; step <= fullSteps; step += 1) points.push(pointAt(step));
      if (fullSteps < certificateMaximumIteration && progress > fullSteps) {
        const from = pointAt(fullSteps);
        const to = pointAt(fullSteps + 1);
        const partial = progress - fullSteps;
        points.push({ x: mix(from.x, to.x, partial), y: mix(from.y, to.y, partial) });
      }
      if (points.length > 1) {
        context.beginPath();
        points.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.strokeStyle = colors.accent;
        context.lineWidth = 2;
        context.stroke();
      }
      points.slice(1).forEach((point, index) => {
        context.beginPath();
        context.arc(point.x, point.y, index === points.length - 2 ? 3.8 : 2.6, 0, Math.PI * 2);
        context.fillStyle = colors.accent;
        context.fill();
      });
      context.beginPath();
      context.arc(target.x, target.y, 4.2, 0, Math.PI * 2);
      context.fillStyle = colors.white;
      context.fill();
      context.strokeStyle = colors.accent;
      context.lineWidth = 2.2;
      context.stroke();
      drawLabel(context, "x*", target.x + 8, target.y - 8, {
        color: colors.accent,
        size: 16,
        weight: 700,
      });
      if (points.length > 1) {
        const current = points[points.length - 1];
        drawLabel(context, "xₙ", current.x + 7, current.y + 15, {
          color: colors.accent,
          size: 16,
          weight: 700,
        });
      }
    }

    const iterationY = center.y + ballRadius + (compact ? 25 : 31);
    const iterationWidth = 159;
    let iterationX = center.x - iterationWidth / 2;
    drawLabel(context, "repeat", iterationX, iterationY, {
      color: colors.accent,
      size: 16,
      weight: 700,
    });
    iterationX += 54;
    drawLabel(context, "x", iterationX, iterationY, {
      color: colors.accent,
      size: 20,
      weight: 700,
    });
    iterationX += 11;
    drawLabel(context, "n+1", iterationX, iterationY + 5, {
      color: colors.accent,
      size: 15,
      weight: 700,
    });
    iterationX += 30;
    drawLabel(context, "= T(x", iterationX, iterationY, {
      color: colors.accent,
      size: 20,
      weight: 700,
    });
    iterationX += 49;
    drawLabel(context, "n", iterationX, iterationY + 5, {
      color: colors.accent,
      size: 15,
      weight: 700,
    });
    iterationX += 8;
    drawLabel(context, ")", iterationX, iterationY, {
      color: colors.accent,
      size: 20,
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
    const isProofRadius = data.microThousandths === 1000;
    const area = { width, height, compact: width < 520 };
    drawSimpleCertificate(context, area, data);
    certificateCanvas.setAttribute(
      "aria-label",
      "Coefficient-space fixed-point diagram at radius "
        + selectedMicroRadius.toFixed(3)
        + " times ten to the minus six. "
        + (isProofRadius ? "This is the radius used in the proof. " : "This is an exploratory nearby radius. ")
        + "The image of the ball has radius bound "
        + formatScientific(data.mappedRadius)
        + ". The contraction factor is at most "
        + data.q.toFixed(6)
        + ". "
        + (data.pass
          ? "Both conditions pass. The schematic iterates follow the certified geometric distance decrease toward the unique solution of F(x) equals zero."
          : "The selected ball is not certified by both conditions."),
    );
  };

  const stopCertificateAnimation = () => {
    if (certificateAnimationFrame !== null) {
      cancelAnimationFrame(certificateAnimationFrame);
      certificateAnimationFrame = null;
    }
    certificateAnimationStart = null;
  };

  const updateIterationReadout = (data) => {
    if (!certificateIteration) return;
    if (!data.pass) {
      certificateIteration.textContent = "Unavailable until both checks pass.";
      return;
    }
    const step = clamp(certificateIterationProgress, 0, certificateMaximumIteration);
    if (step === 0) {
      certificateIteration.textContent = "Ready — repeat xₙ₊₁ = T(xₙ).";
      return;
    }
    const shownStep = Math.min(certificateMaximumIteration, Math.max(1, Math.floor(step)));
    certificateIteration.textContent = "Step "
      + String(shownStep)
      + " of "
      + String(certificateMaximumIteration)
      + " — remaining distance ≤ "
      + (data.q ** shownStep).toFixed(4)
      + " of the start.";
  };

  const finishCertificateAnimation = (data) => {
    certificateAnimationFrame = null;
    certificateAnimationStart = null;
    if (certificatePlayButton) certificatePlayButton.disabled = false;
    if (certificatePlayIcon) certificatePlayIcon.textContent = "↻";
    if (certificatePlayLabel) certificatePlayLabel.textContent = "Replay iteration";
    updateIterationReadout(data);
  };

  const animateCertificate = (timestamp) => {
    const data = currentCertificateData();
    if (!data.pass) {
      stopCertificateAnimation();
      return;
    }
    if (certificateAnimationStart === null) certificateAnimationStart = timestamp;
    certificateIterationProgress = Math.min(
      certificateMaximumIteration,
      (timestamp - certificateAnimationStart) / 430,
    );
    updateIterationReadout(data);
    drawCertificate();
    if (certificateIterationProgress < certificateMaximumIteration) {
      certificateAnimationFrame = requestAnimationFrame(animateCertificate);
    } else {
      finishCertificateAnimation(data);
    }
  };

  const startCertificateAnimation = () => {
    const data = currentCertificateData();
    if (!data.pass) return;
    stopCertificateAnimation();
    certificateIterationProgress = 0;
    if (certificatePlayIcon) certificatePlayIcon.textContent = "●";
    if (certificatePlayLabel) certificatePlayLabel.textContent = "Iterating…";
    if (certificatePlayButton) certificatePlayButton.disabled = true;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
    selectedMicroRadius = Math.max(0, Math.min(2, Number(certificateRadius?.value || 1)));
    const microThousandths = Math.round(selectedMicroRadius * 1000);
    selectedMicroRadius = microThousandths / 1000;
    const data = currentCertificateData();
    const isProofRadius = microThousandths === 1000;
    const selfMapRatio = data.radius > 0 ? data.mappedRadius / data.radius : Number.POSITIVE_INFINITY;
    if (certificateRadiusValue) certificateRadiusValue.textContent = selectedMicroRadius.toFixed(3);
    if (certificateValue) certificateValue.textContent = data.signs.value
      ? "Pass — image radius ≤ " + selfMapRatio.toFixed(6) + "r."
      : "Fail — the image is not contained in the ball.";
    if (certificateDerivative) certificateDerivative.textContent = data.signs.derivative
      ? "Pass — q ≤ " + data.q.toFixed(6) + " < 1."
      : "Fail — distances are not certified to shrink.";
    updateIterationReadout(data);
    if (certificateVerdict) certificateVerdict.textContent = data.pass
      ? (isProofRadius
        ? "Proof radius: exactly one zero of F lies in this ball."
        : "Both fixed-point conditions hold at this radius.")
      : "The two fixed-point conditions do not both hold.";
    if (certificatePlayButton) certificatePlayButton.disabled = !data.pass;
    if (certificatePlayIcon) certificatePlayIcon.textContent = "▶";
    if (certificatePlayLabel) certificatePlayLabel.textContent = data.pass
      ? "Run iteration"
      : "Choose a passing radius";
    if (certificateRadius) certificateRadius.setAttribute(
      "aria-valuetext",
      selectedMicroRadius.toFixed(3)
        + " times ten to the minus six; "
        + (data.pass ? "self-map and contraction conditions pass" : "not certified by both conditions"),
    );
    drawCertificate();
  };

  if (certificateRadius) certificateRadius.addEventListener("input", updateCertificate);
  if (certificatePlayButton) certificatePlayButton.addEventListener("click", startCertificateAnimation);
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
    }),
    Object.freeze({
      label: "map does not fold",
      status: "The whole coefficient ball satisfies Re φ′ > 0.35, so the conformal map is one-to-one.",
    }),
    Object.freeze({
      label: "shape is not a disk",
      status: "The normalized first shape coefficient satisfies |q₁*| > 0.03459, so the map is not linear and its image is not a disk.",
    }),
  ]);
  let selectedReconstructionStage = 0;

  const drawReconstructionEnclosure = (context, width, height) => {
    const compact = width < 520;
    const centerX = compact ? width / 2 : width * .27;
    const centerY = compact ? height * .27 : height * .54;
    const radius = Math.min(
      compact ? width * .24 : width * .18,
      compact ? height * .18 : height * .30,
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
    drawLabel(context, "computed boundary", centerX, centerY - radius - 20, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "certified tube · enlarged", centerX, centerY + radius + 23, {
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
      ? { x: 22, y: height * .62, width: width - 44, height: height * .25 }
      : { x: width * .56, y: height * .28, width: width * .38, height: height * .47 };
    context.fillStyle = "rgba(255, 255, 248, .92)";
    context.fillRect(inset.x, inset.y, inset.width, inset.height);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.2;
    context.strokeRect(inset.x + .5, inset.y + .5, inset.width - 1, inset.height - 1);
    drawLabel(context, "one boundary segment · greatly enlarged", inset.x + inset.width / 2, inset.y + 23, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });

    const lineLeft = inset.x + 22;
    const lineRight = inset.x + inset.width - 22;
    const lineCenterY = inset.y + inset.height * .56;
    const tubeHalfWidth = Math.max(11, inset.height * .12);
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

    drawLabel(context, "computed", lineLeft, lineCenterY - tubeHalfWidth - 8, {
      color: colors.accent,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "exact stays inside tube", lineRight, lineCenterY - tubeHalfWidth - 8, {
      align: "right",
      color: colors.teal,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "distance ≤ 7.13 × 10⁻¹¹", inset.x + inset.width / 2, inset.y + inset.height - 14, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });

    if (compact) {
      drawArrow(context, highlightX, highlightY + 14, inset.x + inset.width * .72, inset.y - 10, {
        color: colors.ruleDark,
        dashed: true,
        head: 6,
      });
    } else {
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
      compact ? width * .23 : width * .17,
      compact ? height * .16 : height * .29,
    );
    const diskCenter = compact
      ? { x: width / 2, y: height * .25 }
      : { x: width * .25, y: height * .53 };
    const domainCenter = compact
      ? { x: width / 2, y: height * .75 }
      : { x: width * .75, y: height * .53 };

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

    drawLabel(context, "unit disk", diskCenter.x, diskCenter.y - radius - 20, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "final domain", domainCenter.x, domainCenter.y - radius - 20, {
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
      { point: diskStart, label: "z₁" },
      { point: diskEnd, label: "z₂" },
      { point: mappedStart, label: "φ(z₁)" },
      { point: mappedEnd, label: "φ(z₂)" },
    ].forEach((item) => {
      context.beginPath();
      context.arc(item.point.x, item.point.y, 3.8, 0, Math.PI * 2);
      context.fillStyle = colors.white;
      context.fill();
      context.strokeStyle = colors.accent;
      context.lineWidth = 1.8;
      context.stroke();
      drawLabel(context, item.label, item.point.x + 7, item.point.y - 7, {
        color: colors.accent,
        size: 14,
        weight: 700,
      });
    });

    if (compact) {
      const arrowX = width / 2 + radius + 19;
      const fromY = diskCenter.y + radius * .72;
      const toY = domainCenter.y - radius * .72;
      drawArrow(context, arrowX, fromY, arrowX, toY, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "φₚ*", arrowX + 11, (fromY + toY) / 2 + 4, { color: colors.accent, size: 14, weight: 700 });
    } else {
      const fromX = diskCenter.x + radius + 24;
      const toX = domainCenter.x - radius - 24;
      drawArrow(context, fromX, diskCenter.y, toX, domainCenter.y, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "φₚ*", (fromX + toX) / 2, diskCenter.y - 14, { align: "center", color: colors.accent, size: 14, weight: 700 });
    }

    drawLabel(context, "Re φ′ > 0.35: each chord moves forward", width / 2, height - 18, {
      align: "center",
      color: colors.teal,
      size: 14,
      weight: 700,
    });
  };

  const drawReconstructionSpectrum = (context, width, height) => {
    const compact = width < 520;
    const radius = Math.min(
      compact ? width * .235 : width * .175,
      compact ? height * .17 : height * .30,
    );
    const circleCenter = compact
      ? { x: width / 2, y: height * .25 }
      : { x: width * .25, y: height * .53 };
    const domainCenter = compact
      ? { x: width / 2, y: height * .74 }
      : { x: width * .75, y: height * .53 };

    context.beginPath();
    context.arc(circleCenter.x, circleCenter.y, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(17, 17, 17, .035)";
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 2;
    context.stroke();
    drawLabel(context, "linear map", circleCenter.x, circleCenter.y - radius - 20, {
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
    drawLabel(context, "final conformal map", domainCenter.x, domainCenter.y - radius - 20, {
      align: "center",
      color: colors.heading,
      size: 14,
      weight: 700,
    });
    drawLabel(context, "ten-lobed boundary", domainCenter.x, domainCenter.y + 5, {
      align: "center",
      color: colors.accent,
      size: 14,
      weight: 700,
    });

    if (compact) {
      const arrowX = width / 2 + radius + 19;
      const fromY = circleCenter.y + radius * .72;
      const toY = domainCenter.y - radius * .72;
      drawArrow(context, arrowX, fromY, arrowX, toY, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "q₁* z¹¹ is present", width / 2, circleCenter.y + radius + 21, {
        align: "center",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
    } else {
      const fromX = circleCenter.x + radius + 24;
      const toX = domainCenter.x - radius - 24;
      drawArrow(context, fromX, circleCenter.y, toX, domainCenter.y, { color: colors.accent, width: 2, head: 7 });
      drawLabel(context, "q₁* z¹¹ is present", (fromX + toX) / 2, circleCenter.y - 15, {
        align: "center",
        color: colors.accent,
        size: 14,
        weight: 700,
      });
    }

    drawLabel(context, "|q₁*| > 0.03459, so the map is not linear", width / 2, height - 18, {
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
      `Geometric reconstruction check ${selectedReconstructionStage + 1} of 3: ${stage.label}. ${stage.status}`,
    );
  };

  const updateReconstruction = () => {
    selectedReconstructionStage = clamp(Math.round(Number(reconstructionStage?.value || 0)), 0, 2);
    const stage = reconstructionStages[selectedReconstructionStage];
    if (reconstructionStageValue) reconstructionStageValue.textContent = stage.label;
    if (reconstructionStatus) reconstructionStatus.textContent = stage.status;
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
    }),
    height: Object.freeze({
      label: "boundary height",
      status: "The boundary levels are complementary: Schiffer fixes u = 1, while the Berenstein boundary is the zero set u = 0.",
    }),
    slope: Object.freeze({
      label: "outward slope",
      status: "Schiffer arrives tangentially with slope zero. Berenstein crosses the zero level transversely with outward slope one.",
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
      bottom: Math.max(23, box.height * .16),
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

    drawLabel(context, "inside", left, bottom + 17, { color: colors.muted, size: 10 });
    drawLabel(context, "boundary", boundaryX, bottom + 17, { align: "center", color: colors.muted, size: 10 });
    drawLabel(context, schiffer ? "u = 1" : "u = 0", boundaryX - 8, mapY(boundaryValue) - 9, {
      align: "right",
      color,
      size: 12,
      weight: 700,
    });
  };

  const drawBerensteinEndpointPanel = (context, box, kind, emphasis) => {
    const schiffer = kind === "schiffer";
    const color = schiffer ? colors.accent : colors.teal;
    const title = schiffer ? "Schiffer endpoint" : "Berenstein endpoint";
    const data = schiffer ? "height 1 · slope 0" : "height 0 · slope 1";
    context.beginPath();
    context.moveTo(box.x, box.y + 1);
    context.lineTo(box.x + box.width, box.y + 1);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
    drawLabel(context, title, box.x, box.y + 20, { color, size: 12, weight: 700 });
    drawLabel(context, data, box.x + box.width, box.y + 20, { align: "right", color: colors.heading, size: 12 });

    const rowLayout = box.height < 270;
    if (rowLayout) {
      const domainWidth = Math.min(92, box.width * .36);
      drawBerensteinDomainGlyph(context, {
        x: box.x + 1,
        y: box.y + 31,
        width: domainWidth,
        height: box.height - 39,
      }, kind, emphasis);
      drawBerensteinProfile(context, {
        x: box.x + domainWidth + 3,
        y: box.y + 27,
        width: box.width - domainWidth - 3,
        height: box.height - 31,
      }, kind, emphasis);
    } else {
      const domainHeight = Math.min(148, box.height * .39);
      drawBerensteinDomainGlyph(context, {
        x: box.x + box.width * .19,
        y: box.y + 27,
        width: box.width * .62,
        height: domainHeight,
      }, kind, emphasis);
      drawBerensteinProfile(context, {
        x: box.x + 1,
        y: box.y + domainHeight + 24,
        width: box.width - 2,
        height: box.height - domainHeight - 27,
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
      stage.label + ". " + stage.status,
    );
  };

  const updateBerensteinEndpoint = () => {
    const requested = berensteinEndpointStage?.value || "pair";
    selectedBerensteinEndpointStage = Object.hasOwn(berensteinEndpointStages, requested) ? requested : "pair";
    const stage = berensteinEndpointStages[selectedBerensteinEndpointStage];
    if (berensteinEndpointStageValue) berensteinEndpointStageValue.textContent = stage.label;
    if (berensteinEndpointStatus) berensteinEndpointStatus.textContent = stage.status;
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
      label: "signed field",
      status: "Orange and blue are opposite signs of u; every dark curve between them is a zero level set.",
    }),
    nodal: Object.freeze({
      label: "interior zero curves",
      status: "Eight interior nodal curves separate alternating sign bands before the field reaches the outer boundary.",
    }),
    boundary: Object.freeze({
      label: "outer nodal boundary",
      status: "The heavy outer curve is both the physical boundary and a regular zero curve: u = 0 there and the outward slope is one.",
    }),
    symmetry: Object.freeze({
      label: "thirteenfold symmetry",
      status: "Thirteen equivalent sectors repeat around the domain. The certificate separately rules out central symmetry.",
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
    [7, 13, 19, 25, 31, 37, 43, 49].forEach((radius, index) => {
      signLayer.appendChild(createSvgNode("path", {
        d: polarPath(centerX, centerY, radius, 13, .008 + index * .004),
        class: "berenstein-guide-band berenstein-guide-band-" + (index % 2 ? "positive" : "negative"),
      }));
    });
    signLayer.appendChild(createSvgNode("path", {
      d: polarPath(centerX, centerY, 54, 13, .045),
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
      d: polarPath(centerX, centerY, 54, 13, .045),
      class: "berenstein-guide-outline",
    }));
    berensteinFieldGuide.appendChild(nodalLayer);

    const boundaryLayer = createSvgNode("g", { class: "berenstein-field-layer berenstein-field-layer-boundary", "data-field-layer": "boundary" });
    boundaryLayer.appendChild(createSvgNode("path", {
      d: polarPath(centerX, centerY, 50, 13, .05),
      class: "berenstein-guide-boundary",
    }));
    for (let index = 0; index < 13; index += 1) {
      const theta = index / 13 * Math.PI * 2;
      const radius = 50 * (1 + .05 * Math.cos(13 * theta));
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
      d: polarPath(centerX, centerY, 54, 13, .045),
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
    if (berensteinFieldStatus) berensteinFieldStatus.textContent = stage.status;
    if (berensteinFieldGuide) berensteinFieldGuide.setAttribute("aria-label", stage.label + ". " + stage.status);
  };

  if (berensteinFieldStage) berensteinFieldStage.addEventListener("change", updateBerensteinField);
  requestAnimationFrame(updateBerensteinField);

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
      animation: 3000,
      hold: 3400,
    }),
    Object.freeze({
      title: "Move every candidate to one disk",
      note: "The conformal map φₚ carries the unit disk to the candidate domain. Looking back through that map gives U = u ∘ φₚ, the same Helmholtz field in fixed disk coordinates. The geometry is stored in p = kφₚ′.",
      animation: 2400,
      hold: 3000,
    }),
    Object.freeze({
      title: "One point means two functions",
      note: "The unknown lives in a Banach space X of function pairs. One point x = (g,p) contains a function g describing the transformed Helmholtz field and a function p describing the conformal shape. The two displayed directions are only a schematic slice through X: moving in the g direction changes the interior field, while moving in the p direction changes the boundary. The exact solution will be one special point x*.",
      animation: 3200,
      hold: 3800,
    }),
    Object.freeze({
      title: "Prove convergence",
      note: "We choose r = 10⁻⁶ and certify the bound ‖T(x) − x°‖ ≤ Y + Zr + C₂r² + C₃r³ < 0.622r for every x in the ball. Here Y bounds the error at the centre, Z the linear change, and C₂,C₃ the nonlinear change. Thus every Newton step stays inside the ball. A second estimate says that T shrinks distances there by a factor less than 0.622, so its iterates converge to one exact zero x*.",
      animation: 2800,
      hold: 4000,
    }),
    Object.freeze({
      title: "Final non-disk domain",
      note: "The exact solution is the pair x* = (g*,p*). Its second component p* contains the conformal shape coefficients, so it directly determines the domain Ω*. With the normalization used here, a disk has no nonconstant conformal coefficients. The certificate proves that the first one satisfies |q₁*| > 0.03459, hence Ω* is not a disk. A separate derivative bound proves that the conformal map is one-to-one.",
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
    placeComputerOverviewLabel("overviewSearchStart", fluxLeft, fluxY + 25);
    placeComputerOverviewLabel("overviewSearchEnd", fluxRight, fluxY + 25);
    if (progress > .78) placeComputerOverviewLabel("overviewSearchCenter", fluxRight, fluxY + 58);
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
    placeComputerOverviewLabel("overviewFixedContraction", formulaX, area.y + area.height * .64, formulaAlignment);
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

    const q = .621244;
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
      y: area.y + area.height * (compact ? .17 : .43),
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
    placeComputerOverviewLabel("overviewFinalShape", pairCenter.x, pairCenter.y + (compact ? 57 : 67));

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
    placeComputerOverviewLabel("overviewFinalDomain", domainCenter.x, domainCenter.y - domainRadius - 23);

    const proofY = area.y + area.height * (compact ? .88 : .84);
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
    if (computerOverviewState && computerOverviewState.textContent !== stage.note) computerOverviewState.textContent = stage.note;
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
