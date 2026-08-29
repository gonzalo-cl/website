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

  const prepareCanvas = (canvas) => {
    const rectangle = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rectangle.width));
    const height = Math.max(1, Math.round(rectangle.height));
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

  const boundaryDetail = Object.freeze({
    minimumX: .985,
    maximumX: 1.055,
    minimumY: -.11,
    maximumY: .11,
  });

  const drawBoundaryDetail = (context, cutoff, box, overviewScale) => {
    context.fillStyle = colors.white;
    context.fillRect(box.x, box.y, box.width, box.height);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1;
    context.strokeRect(box.x + .5, box.y + .5, box.width - 1, box.height - 1);

    const plot = {
      x: box.x + 12,
      y: box.y + 10,
      width: box.width - 24,
      height: box.height - 39,
    };
    const detailScale = Math.min(
      plot.width / (boundaryDetail.maximumY - boundaryDetail.minimumY),
      plot.height / (boundaryDetail.maximumX - boundaryDetail.minimumX),
    );
    const drawnWidth = (boundaryDetail.maximumY - boundaryDetail.minimumY) * detailScale;
    const drawnHeight = (boundaryDetail.maximumX - boundaryDetail.minimumX) * detailScale;
    const originX = plot.x + (plot.width - drawnWidth) / 2;
    const originY = plot.y + (plot.height - drawnHeight) / 2;
    const project = (point) => ({
      x: originX + (point.y - boundaryDetail.minimumY) * detailScale,
      y: originY + (boundaryDetail.maximumX - point.x) * detailScale,
    });
    const trace = (pointAt, samples) => {
      context.beginPath();
      for (let index = 0; index <= samples; index += 1) {
        const theta = -.16 + index / samples * .32;
        const point = project(pointAt(theta));
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      }
    };

    context.save();
    context.beginPath();
    context.rect(plot.x, plot.y, plot.width, plot.height);
    context.clip();
    trace((theta) => ({ x: Math.cos(theta), y: Math.sin(theta) }), 320);
    context.setLineDash([5, 5]);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.3;
    context.stroke();
    context.setLineDash([]);
    trace((theta) => boundaryPoint(theta, cutoff), 640);
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.3;
    context.stroke();
    context.restore();

    const circleCrest = project({ x: 1, y: 0 });
    const boundaryCrest = project(boundaryPoint(0, cutoff));
    context.strokeStyle = colors.accent;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(circleCrest.x, circleCrest.y);
    context.lineTo(boundaryCrest.x, boundaryCrest.y);
    context.moveTo(circleCrest.x - 4, circleCrest.y);
    context.lineTo(circleCrest.x + 4, circleCrest.y);
    context.moveTo(boundaryCrest.x - 4, boundaryCrest.y);
    context.lineTo(boundaryCrest.x + 4, boundaryCrest.y);
    context.stroke();

    const deformation = boundaryPoint(0, cutoff).radius - 1;
    drawLabel(context, `r(0) − 1 = ${deformation.toFixed(5)}`, box.x + 10, box.y + box.height - 8, {
      color: colors.accent,
      size: 11,
    });
    return Math.max(1, Math.round(detailScale / overviewScale));
  };

  const drawBoundary = () => {
    if (!boundaryCanvas) return;
    const rectangle = boundaryCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const cutoff = Math.max(1, Math.min(30, Number(boundaryModes?.value || 30)));
    const { context, width, height } = prepareCanvas(boundaryCanvas, 300);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);

    const sideBySide = width >= 440;
    const detail = sideBySide
      ? { x: width * .54, y: 72, width: width * .42, height: 156 }
      : { x: 20, y: 30, width: width - 40, height: Math.min(145, height * .27) };
    const overview = sideBySide
      ? { x: 18, y: 28, width: width * .48, height: height - 60 }
      : {
          x: 20,
          y: detail.y + detail.height + 34,
          width: width - 40,
          height: Math.min(width - 40, height - detail.height - 92),
        };
    const centerX = overview.x + overview.width / 2;
    const centerY = overview.y + overview.height / 2;
    const scale = Math.min(overview.width, overview.height) * .46 / 1.075;

    context.strokeStyle = colors.rule;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(overview.x, centerY);
    context.lineTo(overview.x + overview.width, centerY);
    context.moveTo(centerX, overview.y);
    context.lineTo(centerX, overview.y + overview.height);
    context.stroke();

    context.beginPath();
    context.arc(centerX, centerY, scale, 0, Math.PI * 2);
    context.setLineDash([5, 5]);
    context.strokeStyle = colors.ruleDark;
    context.stroke();
    context.setLineDash([]);

    const points = [];
    let minimumRadius = Number.POSITIVE_INFINITY;
    let maximumRadius = 0;
    for (let index = 0; index <= 1200; index += 1) {
      const point = boundaryPoint(index / 1200 * Math.PI * 2, cutoff);
      points.push(point);
      minimumRadius = Math.min(minimumRadius, point.radius);
      maximumRadius = Math.max(maximumRadius, point.radius);
    }

    context.beginPath();
    points.forEach((point, index) => {
      const x = centerX + point.x * scale;
      const y = centerY - point.y * scale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.fillStyle = "rgba(7, 87, 96, .07)";
    context.fill();
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.3;
    context.stroke();

    const focusX = centerX + boundaryDetail.minimumX * scale;
    const focusY = centerY - boundaryDetail.maximumY * scale;
    const focusWidth = (boundaryDetail.maximumX - boundaryDetail.minimumX) * scale;
    const focusHeight = (boundaryDetail.maximumY - boundaryDetail.minimumY) * scale;
    context.fillStyle = "rgba(7, 87, 96, .08)";
    context.fillRect(focusX, focusY, focusWidth, focusHeight);
    context.strokeStyle = colors.accent;
    context.lineWidth = 1.3;
    context.strokeRect(focusX, focusY, focusWidth, focusHeight);

    if (sideBySide) {
      context.strokeStyle = colors.ruleDark;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(focusX + focusWidth, focusY + focusHeight / 2);
      context.lineTo(detail.x, detail.y + detail.height / 2);
      context.stroke();
    }

    const zoom = drawBoundaryDetail(context, cutoff, detail, scale);
    drawLabel(context, `Zoom near θ = 0 · ${zoom}×`, detail.x, detail.y - 11, {
      color: colors.heading,
      size: 11,
      weight: 700,
    });

    if (!sideBySide) {
      context.strokeStyle = colors.ruleDark;
      context.lineWidth = 1;
      context.setLineDash([3, 4]);
      context.beginPath();
      context.moveTo(detail.x + detail.width * .22, detail.y + detail.height);
      context.lineTo(focusX, focusY);
      context.moveTo(detail.x + detail.width * .78, detail.y + detail.height);
      context.lineTo(focusX + focusWidth, focusY + focusHeight);
      context.stroke();
      context.setLineDash([]);
    }

    if (boundaryModesValue) boundaryModesValue.textContent = `${cutoff} of 30`;
    const deformation = boundaryPoint(0, cutoff).radius - 1;
    boundaryCanvas.setAttribute(
      "aria-label",
      `Numerical ten-fold conformal boundary using ${cutoff} of 30 printed coefficients, compared with the dashed unit circle. A ${zoom}-times detail near theta zero shows radial displacement ${deformation.toFixed(6)}. Overall radial range ${minimumRadius.toFixed(6)} to ${maximumRadius.toFixed(6)}.`,
    );
  };

  if (boundaryModes) boundaryModes.addEventListener("change", drawBoundary);
  observeCanvas(boundaryCanvas, drawBoundary);
  requestAnimationFrame(drawBoundary);

  const searchCanvas = document.getElementById("searchCanvas");
  const searchStage = document.getElementById("searchStage");
  const searchStageValue = document.getElementById("searchStageValue");
  const searchStageStatus = document.getElementById("searchStageStatus");
  const searchStages = Object.freeze([
    Object.freeze({
      label: "disk crossing",
      title: "ten-fold mode becomes free",
      status: "At this special frequency, a ten-fold deformation can move away from the disk.",
      amplitude: 0,
    }),
    Object.freeze({
      label: "auxiliary branch",
      title: "allow c to vary",
      status: "The numerical search follows noncircular shapes while the constant boundary derivative c is allowed to vary.",
      amplitude: .34,
    }),
    Object.freeze({
      label: "zero-flux endpoint",
      title: "candidate with c = 0",
      status: "The search reaches a very accurate candidate for the original problem, where c must equal zero.",
      amplitude: 1,
    }),
    Object.freeze({
      label: "proof starts",
      title: "keep only the centre x°",
      status: "The coefficients of the final centre are stored exactly. The proof does not rely on the path used to find them.",
      amplitude: 1,
    }),
  ]);
  let selectedSearchStage = 0;

  const traceConformalBoundary = (context, centerX, centerY, scale, amplitude, options = {}) => {
    context.beginPath();
    for (let index = 0; index <= 900; index += 1) {
      const theta = index / 900 * Math.PI * 2;
      const point = conformalPoint(1, theta, 30, amplitude);
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

  const drawSearch = () => {
    if (!searchCanvas) return;
    const rectangle = searchCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(searchCanvas);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
    const compact = width < 520;
    const stage = searchStages[selectedSearchStage];
    const railLeft = compact ? 30 : 54;
    const railRight = width - (compact ? 30 : 54);
    const railY = 45;

    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(railLeft, railY);
    context.lineTo(railRight, railY);
    context.stroke();
    searchStages.forEach((item, index) => {
      const x = mix(railLeft, railRight, index / (searchStages.length - 1));
      context.beginPath();
      context.arc(x, railY, index === selectedSearchStage ? 6 : 4, 0, Math.PI * 2);
      context.fillStyle = index <= selectedSearchStage ? colors.accent : colors.white;
      context.fill();
      context.strokeStyle = index <= selectedSearchStage ? colors.accent : colors.ruleDark;
      context.lineWidth = 1.5;
      context.stroke();
      if (!compact || index === selectedSearchStage) {
        drawLabel(context, item.label, x, railY + 22, {
          align: "center",
          color: index === selectedSearchStage ? colors.heading : colors.muted,
          size: compact ? 9 : 10,
          weight: index === selectedSearchStage ? 700 : 400,
        });
      }
    });

    const domainCenterX = compact ? width / 2 : width * .30;
    const domainCenterY = compact ? height * .43 : height * .56;
    const domainRadius = Math.min(compact ? width * .22 : width * .18, compact ? height * .20 : height * .28);
    context.beginPath();
    context.arc(domainCenterX, domainCenterY, domainRadius, 0, Math.PI * 2);
    context.setLineDash([5, 5]);
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.1;
    context.stroke();
    context.setLineDash([]);
    if (selectedSearchStage === 3) {
      traceConformalBoundary(context, domainCenterX, domainCenterY, domainRadius, stage.amplitude, {
        stroke: "rgba(160, 0, 0, .18)",
        lineWidth: 9,
      });
    }
    traceConformalBoundary(context, domainCenterX, domainCenterY, domainRadius, stage.amplitude, {
      fill: colors.tealLight,
      stroke: colors.accent,
      lineWidth: 2.2,
    });
    drawLabel(context, stage.title, domainCenterX, domainCenterY + domainRadius + 30, {
      align: "center",
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawLabel(context, selectedSearchStage === 0 ? "μ ≈ 31.2781" : "D₁₀ shape", domainCenterX, domainCenterY + 4, {
      align: "center",
      color: colors.muted,
      size: 11,
    });

    const plot = compact
      ? { x: 34, y: height * .73, width: width - 68, height: height * .17 }
      : { x: width * .56, y: height * .32, width: width * .37, height: height * .46 };
    const x0 = plot.x;
    const y0 = plot.y + plot.height;
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x0, plot.y);
    context.lineTo(x0, y0);
    context.lineTo(x0 + plot.width, y0);
    context.stroke();
    context.beginPath();
    for (let index = 0; index <= 100; index += 1) {
      const t = index / 100;
      const x = x0 + t * plot.width;
      const flux = 1 - t;
      const y = y0 - flux * plot.height * .80 - Math.sin(t * Math.PI) * plot.height * .08;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.2;
    context.stroke();
    const branchProgress = [0, .34, 1, 1][selectedSearchStage];
    const markerX = x0 + branchProgress * plot.width;
    const markerFlux = 1 - branchProgress;
    const markerY = y0 - markerFlux * plot.height * .80
      - Math.sin(branchProgress * Math.PI) * plot.height * .08;
    context.beginPath();
    context.arc(markerX, markerY, 5, 0, Math.PI * 2);
    context.fillStyle = selectedSearchStage === 3 ? colors.heading : colors.accent;
    context.fill();
    drawLabel(context, "numerical continuation →", x0 + plot.width, y0 + 19, { align: "right", size: 10 });
    drawLabel(context, "schematic search path", x0, plot.y - 12, { color: colors.heading, size: 11 });
    context.save();
    context.translate(x0 - 11, plot.y + plot.height / 2);
    context.rotate(-Math.PI / 2);
    drawLabel(context, "flux c", 0, 0, { align: "center", color: colors.muted, size: 9 });
    context.restore();
    drawLabel(context, "c = 0", x0 + plot.width, y0 - 8, {
      align: "right",
      color: colors.accent,
      size: 10,
    });
    if (selectedSearchStage === 3) {
      drawArrow(context, markerX - 8, markerY, markerX - 54, markerY, { color: colors.heading });
      drawLabel(context, "stored centre x°", markerX - 60, markerY - 9, {
        align: "right",
        color: colors.heading,
        size: 10,
      });
    }

    searchCanvas.setAttribute(
      "aria-label",
      `Numerical-search stage ${selectedSearchStage + 1} of 4: ${stage.label}. ${stage.status} The branch curve and intermediate shapes are explicitly schematic.`,
    );
  };

  const updateSearch = () => {
    selectedSearchStage = clamp(Math.round(Number(searchStage?.value || 0)), 0, 3);
    const stage = searchStages[selectedSearchStage];
    if (searchStageValue) searchStageValue.textContent = stage.label;
    if (searchStageStatus) searchStageStatus.textContent = stage.status;
    drawSearch();
  };
  if (searchStage) searchStage.addEventListener("change", updateSearch);
  observeCanvas(searchCanvas, drawSearch);
  requestAnimationFrame(updateSearch);

  const pullbackCanvas = document.getElementById("pullbackCanvas");
  const pullbackStage = document.getElementById("pullbackStage");
  const pullbackStageValue = document.getElementById("pullbackStageValue");
  const pullbackStatus = document.getElementById("pullbackStatus");
  const pullbackStages = Object.freeze([
    Object.freeze({ label: "moving domain", status: "The equation is posed on an unknown domain Ω." }),
    Object.freeze({ label: "conformal map", status: "The map φₚ carries the field, the equation, and both boundary conditions to the disk." }),
    Object.freeze({ label: "fixed disk", status: "The boundary is now fixed; the changing shape is recorded by |p|²." }),
  ]);
  let selectedPullbackStage = 0;

  const drawMappedGrid = (context, centerX, centerY, radius, options = {}) => {
    const amplitude = options.amplitude ?? 1;
    const alpha = options.alpha ?? 1;
    context.save();
    context.globalAlpha = alpha;
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1;
    for (let ring = 1; ring <= 4; ring += 1) {
      context.beginPath();
      for (let index = 0; index <= 360; index += 1) {
        const theta = index / 360 * Math.PI * 2;
        const point = conformalPoint(ring / 4, theta, 30, amplitude);
        const x = centerX + point.x * radius;
        const y = centerY - point.y * radius;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.stroke();
    }
    for (let spoke = 0; spoke < 20; spoke += 1) {
      const theta = spoke / 20 * Math.PI * 2;
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

  const derivativeColor = (value, alpha = 1) => {
    const centered = clamp((value - .45) / 2.25, 0, 1);
    const red = Math.round(mix(230, 160, centered));
    const green = Math.round(mix(236, 0, centered));
    const blue = Math.round(mix(225, 0, centered));
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const drawWeightedDisk = (context, centerX, centerY, radius, alpha = 1) => {
    const cells = 34;
    const cellSize = 2 * radius / cells;
    context.save();
    context.globalAlpha = alpha;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.clip();
    for (let row = 0; row < cells; row += 1) {
      for (let column = 0; column < cells; column += 1) {
        const x = -1 + (column + .5) * 2 / cells;
        const y = 1 - (row + .5) * 2 / cells;
        const r = Math.hypot(x, y);
        if (r > 1) continue;
        const theta = Math.atan2(y, x);
        const normalizedWeight = conformalDerivative(r, theta).magnitude ** 2;
        context.fillStyle = derivativeColor(normalizedWeight, .72);
        context.fillRect(centerX - radius + column * cellSize, centerY - radius + row * cellSize, cellSize + 1, cellSize + 1);
      }
    }
    context.restore();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = colors.heading;
    context.lineWidth = 1.8;
    context.stroke();
  };

  const drawPullback = () => {
    if (!pullbackCanvas) return;
    const rectangle = pullbackCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(pullbackCanvas);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
    const compact = width < 520;
    const radius = Math.min(compact ? width * .23 : width * .18, compact ? height * .18 : height * .30);
    const left = compact ? width / 2 : width * .25;
    const right = compact ? width / 2 : width * .75;
    const leftY = compact ? height * .27 : height * .49;
    const rightY = compact ? height * .68 : height * .49;
    const leftAlpha = selectedPullbackStage === 2 ? .34 : 1;
    const rightAlpha = selectedPullbackStage === 0 ? .34 : 1;

    drawMappedGrid(context, left, leftY, radius, {
      amplitude: 1,
      alpha: leftAlpha,
      stroke: colors.accent,
    });
    drawWeightedDisk(context, right, rightY, radius, rightAlpha);
    drawLabel(context, "physical coordinates", left, leftY - radius - 22, {
      align: "center",
      color: selectedPullbackStage === 0 ? colors.heading : colors.muted,
      size: 12,
      weight: selectedPullbackStage === 0 ? 700 : 400,
    });
    drawLabel(context, "Ω = φₚ(𝔻)", left, leftY + radius + 28, { align: "center", color: colors.accent, size: 12 });
    drawLabel(context, "fixed coordinates", right, rightY - radius - 22, {
      align: "center",
      color: selectedPullbackStage === 2 ? colors.heading : colors.muted,
      size: 12,
      weight: selectedPullbackStage === 2 ? 700 : 400,
    });
    drawLabel(context, "normalized weight |p/k|²", right, rightY + radius + 28, { align: "center", color: colors.accent, size: 12 });

    if (compact) {
      drawArrow(context, width / 2, leftY + radius + 42, width / 2, rightY - radius - 42, {
        color: selectedPullbackStage === 1 ? colors.accent : colors.ruleDark,
        width: selectedPullbackStage === 1 ? 2.3 : 1.3,
      });
      drawLabel(context, "U = u ∘ φₚ", width / 2 + 12, height / 2, {
        color: selectedPullbackStage === 1 ? colors.accent : colors.muted,
        size: 11,
      });
    } else {
      drawArrow(context, left + radius + 36, leftY, right - radius - 36, rightY, {
        color: selectedPullbackStage === 1 ? colors.accent : colors.ruleDark,
        width: selectedPullbackStage === 1 ? 2.3 : 1.3,
      });
      drawLabel(context, "U = u ∘ φₚ", width / 2, leftY - 18, {
        align: "center",
        color: selectedPullbackStage === 1 ? colors.accent : colors.muted,
        size: 12,
        weight: selectedPullbackStage === 1 ? 700 : 400,
      });
      drawLabel(context, "p = kφₚ′", width / 2, leftY + 25, { align: "center", color: colors.muted, size: 11 });
    }

    const formulaY = compact ? height - 10 : height - 24;
    drawLabel(context, "ΔU + |p|²U = 0   ·   U|𝕋 = 1   ·   ∂ᵣU|𝕋 = 0", width / 2, formulaY, {
      align: "center",
      color: selectedPullbackStage === 2 ? colors.heading : colors.muted,
      size: compact ? 10 : 12,
    });
    pullbackCanvas.setAttribute(
      "aria-label",
      `${pullbackStages[selectedPullbackStage].label}. A conformal grid on the ten-fold physical domain maps to the fixed unit disk. Color on the disk represents the normalized weight modulus p squared over k squared, equal to modulus phi prime squared. ${pullbackStages[selectedPullbackStage].status}`,
    );
  };

  const updatePullback = () => {
    selectedPullbackStage = clamp(Math.round(Number(pullbackStage?.value || 0)), 0, 2);
    const stage = pullbackStages[selectedPullbackStage];
    if (pullbackStageValue) pullbackStageValue.textContent = stage.label;
    if (pullbackStatus) pullbackStatus.textContent = stage.status;
    drawPullback();
  };
  if (pullbackStage) pullbackStage.addEventListener("change", updatePullback);
  observeCanvas(pullbackCanvas, drawPullback);
  requestAnimationFrame(updatePullback);

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

  const inverseDiskMode = (ell, radial, radius, theta) => {
    const D = 10 * Math.abs(ell) + 2 * radial;
    return realDiskMode(ell, radial - 1, radius, theta) / (4 * D * (D + 1))
      - realDiskMode(ell, radial, radius, theta) / (2 * D * (D + 2))
      + realDiskMode(ell, radial + 1, radius, theta) / (4 * (D + 1) * (D + 2));
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
    const { context, width, height } = prepareCanvas(inverseCanvas);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
    const compact = width < 520;
    const top = compact ? 42 : 48;
    const size = Math.min(compact ? width * .37 : width * .28, compact ? height * .30 : height * .52);
    const sourceBox = compact
      ? { x: width * .08, y: top, width: size, height: size }
      : { x: width * .08, y: top, width: size, height: size };
    const inverseBox = compact
      ? { x: width - width * .08 - size, y: top, width: size, height: size }
      : { x: width * .58, y: top, width: size, height: size };
    const sourceMaximum = drawDiskField(
      context,
      sourceBox,
      (radius, theta) => realDiskMode(selectedInverseAngular, selectedInverseRadial, radius, theta),
      { maximum: 1 },
    );
    const inverseMaximum = drawDiskField(
      context,
      inverseBox,
      (radius, theta) => inverseDiskMode(selectedInverseAngular, selectedInverseRadial, radius, theta),
    );
    drawLabel(context, `source Φ${selectedInverseAngular},${selectedInverseRadial}`, sourceBox.x + sourceBox.width / 2, top - 14, {
      align: "center",
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawLabel(context, `inverse KΦ${selectedInverseAngular},${selectedInverseRadial}`, inverseBox.x + inverseBox.width / 2, top - 14, {
      align: "center",
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawArrow(
      context,
      sourceBox.x + sourceBox.width + 12,
      sourceBox.y + sourceBox.height / 2,
      inverseBox.x - 12,
      inverseBox.y + inverseBox.height / 2,
      { color: colors.accent, width: 2 },
    );
    drawLabel(context, "K", (sourceBox.x + sourceBox.width + inverseBox.x) / 2, sourceBox.y + sourceBox.height / 2 - 12, {
      align: "center",
      color: colors.accent,
      size: 14,
      weight: 700,
    });

    const D = 10 * selectedInverseAngular + 2 * selectedInverseRadial;
    const weights = [
      1 / (4 * D * (D + 1)),
      -1 / (2 * D * (D + 2)),
      1 / (4 * (D + 1) * (D + 2)),
    ];
    const stencilY = compact ? top + size + 60 : height - 72;
    const stencilWidth = Math.min(width * .76, 500);
    const stencilLeft = (width - stencilWidth) / 2;
    const boxWidth = stencilWidth / 3 - 8;
    weights.forEach((weight, index) => {
      const x = stencilLeft + index * (boxWidth + 12);
      context.fillStyle = index === 1 ? "rgba(160, 0, 0, .08)" : colors.tealLight;
      context.fillRect(x, stencilY, boxWidth, 36);
      context.strokeStyle = index === 1 ? colors.accent : colors.teal;
      context.lineWidth = 1;
      context.strokeRect(x + .5, stencilY + .5, boxWidth - 1, 35);
      drawLabel(context, `s ${index === 0 ? "− 1" : index === 1 ? "" : "+ 1"}`, x + boxWidth / 2, stencilY - 8, {
        align: "center",
        size: 10,
      });
      drawLabel(context, formatScientific(weight, 2), x + boxWidth / 2, stencilY + 23, {
        align: "center",
        color: index === 1 ? colors.accent : colors.teal,
        size: 10,
      });
    });
    drawLabel(context, "boundary value = 0", stencilLeft, stencilY + 62, { color: colors.heading, size: 11 });
    drawLabel(context, "radial derivative = 0", stencilLeft + stencilWidth, stencilY + 62, {
      align: "right",
      color: colors.heading,
      size: 11,
    });
    inverseCanvas.setAttribute(
      "aria-label",
      `Disk polynomial mode ell ${selectedInverseAngular}, radial index ${selectedInverseRadial}, beside its compatible inverse. The inverse uses the three radial indices ${selectedInverseRadial - 1}, ${selectedInverseRadial}, and ${selectedInverseRadial + 1}. Its boundary value and radial derivative cancel exactly. Source color scale maximum ${sourceMaximum.toPrecision(3)}; inverse scale maximum ${inverseMaximum.toPrecision(3)}.`,
    );
  };

  const updateInverse = () => {
    selectedInverseAngular = clamp(Math.round(Number(inverseAngularMode?.value || 1)), 0, 3);
    selectedInverseRadial = clamp(Math.round(Number(inverseRadialMode?.value || 1)), 1, 4);
    const D = 10 * selectedInverseAngular + 2 * selectedInverseRadial;
    const columnNorm = 1 / (D * (D + 2));
    if (inverseAngularModeValue) inverseAngularModeValue.textContent = `ℓ = ${selectedInverseAngular}`;
    if (inverseRadialModeValue) inverseRadialModeValue.textContent = `s = ${selectedInverseRadial}`;
    if (inverseStatus) inverseStatus.textContent = `Here D = ${D}. The three weights have total size ${columnNorm.toPrecision(4)}, and both boundary conditions cancel exactly.`;
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
    Object.freeze({ label: "finite core", status: "An ordinary 2,471 by 2,471 calculation handles the stored coefficients." }),
    Object.freeze({ label: "omitted equations", status: "Every equation just outside the finite core that can be reached from the stored centre is listed." }),
    Object.freeze({ label: "nearby tail", status: "Every nearby coefficient that can interact with the core is bounded explicitly." }),
    Object.freeze({ label: "remote tail", status: "A decreasing formula covers every larger angular, radial, and shape index." }),
    Object.freeze({ label: "all bounds combined", status: "An exact-fraction checker combines the finite core and both tail regions." }),
  ]);
  let selectedTailStage = 0;

  const drawTail = () => {
    if (!tailCanvas) return;
    const rectangle = tailCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(tailCanvas);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
    const compact = width < 520;
    const plot = compact
      ? { x: 48, y: 48, width: width - 96, height: height * .52 }
      : { x: 70, y: 52, width: width * .58, height: height - 112 };
    const finite = {
      x: plot.x,
      y: plot.y + plot.height * .34,
      width: plot.width * .57,
      height: plot.height * .66,
    };
    const omittedTop = { x: finite.x, y: plot.y, width: finite.width, height: finite.y - plot.y };
    const omittedRight = { x: finite.x + finite.width, y: finite.y, width: plot.x + plot.width - finite.x - finite.width, height: finite.height };
    const remote = { x: finite.x + finite.width, y: plot.y, width: omittedRight.width, height: omittedTop.height };

    context.fillStyle = colors.accentLight;
    context.fillRect(plot.x, plot.y, plot.width, plot.height);
    context.strokeStyle = colors.ruleDark;
    context.strokeRect(plot.x + .5, plot.y + .5, plot.width - 1, plot.height - 1);

    context.fillStyle = "rgba(7, 87, 96, .20)";
    context.fillRect(finite.x, finite.y, finite.width, finite.height);
    context.strokeStyle = colors.teal;
    context.lineWidth = 1.8;
    context.strokeRect(finite.x + .5, finite.y + .5, finite.width - 1, finite.height - 1);
    const columns = compact ? 10 : 14;
    const rows = compact ? 7 : 10;
    context.strokeStyle = "rgba(7, 87, 96, .18)";
    context.lineWidth = .7;
    for (let column = 1; column < columns; column += 1) {
      const x = finite.x + column / columns * finite.width;
      context.beginPath();
      context.moveTo(x, finite.y);
      context.lineTo(x, finite.y + finite.height);
      context.stroke();
    }
    for (let row = 1; row < rows; row += 1) {
      const y = finite.y + row / rows * finite.height;
      context.beginPath();
      context.moveTo(finite.x, y);
      context.lineTo(finite.x + finite.width, y);
      context.stroke();
    }
    drawLabel(context, "finite g rectangle", finite.x + 10, finite.y + 20, { color: colors.teal, size: 11, weight: 700 });
    drawLabel(context, "61 × 40", finite.x + 10, finite.y + 38, { color: colors.teal, size: 10 });
    const shapeStripWidth = Math.max(10, finite.width * .08);
    context.fillStyle = "rgba(160, 0, 0, .24)";
    context.fillRect(finite.x + finite.width - shapeStripWidth, finite.y, shapeStripWidth, finite.height);
    drawLabel(context, "31 shape", finite.x + finite.width - 6, finite.y + finite.height - 9, {
      align: "right",
      color: colors.accent,
      size: 9,
    });

    if (selectedTailStage >= 1) {
      context.fillStyle = "rgba(160, 0, 0, .10)";
      context.fillRect(omittedTop.x, omittedTop.y, omittedTop.width, omittedTop.height);
      context.fillRect(omittedRight.x, omittedRight.y, omittedRight.width, omittedRight.height);
      context.strokeStyle = colors.accent;
      context.setLineDash([5, 4]);
      context.strokeRect(omittedTop.x + .5, omittedTop.y + .5, omittedTop.width - 1, omittedTop.height - 1);
      context.strokeRect(omittedRight.x + .5, omittedRight.y + .5, omittedRight.width - 1, omittedRight.height - 1);
      context.setLineDash([]);
      drawLabel(context, "nearby equations outside the core", omittedTop.x + 8, omittedTop.y + 18, { color: colors.accent, size: 10 });
    }
    if (selectedTailStage >= 2) {
      const band = Math.max(10, plot.width * .07);
      context.fillStyle = "rgba(154, 100, 0, .18)";
      context.fillRect(omittedRight.x, omittedRight.y, band, omittedRight.height);
      context.fillRect(omittedTop.x, omittedTop.y + omittedTop.height - band, omittedTop.width, band);
      context.strokeStyle = colors.gold;
      context.lineWidth = 1.4;
      context.strokeRect(omittedRight.x + .5, omittedRight.y + .5, band - 1, omittedRight.height - 1);
      drawLabel(context, "adjacent", omittedRight.x + band / 2, omittedRight.y + omittedRight.height / 2, {
        align: "center",
        baseline: "middle",
        color: colors.gold,
        size: 9,
      });
    }
    if (selectedTailStage >= 3) {
      context.fillStyle = "rgba(82, 111, 134, .14)";
      context.fillRect(remote.x, remote.y, remote.width, remote.height);
      context.strokeStyle = colors.blue;
      context.lineWidth = 1.2;
      for (let index = 0; index < 5; index += 1) {
        const offset = index * 9;
        context.beginPath();
        context.moveTo(remote.x + offset, remote.y + remote.height);
        context.lineTo(remote.x + remote.width, remote.y + offset);
        context.stroke();
      }
      drawLabel(context, "decreasing tail bound", remote.x + remote.width / 2, remote.y + remote.height / 2, {
        align: "center",
        baseline: "middle",
        color: colors.blue,
        size: 9,
      });
    }

    drawLabel(context, "angular / shape index →", plot.x + plot.width, plot.y + plot.height + 22, { align: "right", size: 10 });
    context.save();
    context.translate(plot.x - 30, plot.y);
    context.rotate(-Math.PI / 2);
    drawLabel(context, "radial index →", 0, 0, { align: "right", size: 10 });
    context.restore();

    const checker = compact
      ? { x: width * .12, y: height * .68, width: width * .76, height: height * .27 }
      : { x: width * .73, y: height * .29, width: width * .22, height: height * .38 };
    if (selectedTailStage >= 4) {
      context.fillStyle = colors.accentLight;
      context.fillRect(checker.x, checker.y, checker.width, checker.height);
      context.strokeStyle = colors.heading;
      context.lineWidth = 1.5;
      context.strokeRect(checker.x + .5, checker.y + .5, checker.width - 1, checker.height - 1);
      drawLabel(context, "exact-fraction checker", checker.x + checker.width / 2, checker.y + 26, {
        align: "center",
        color: colors.heading,
        size: compact ? 11 : 12,
        weight: 700,
      });
      drawLabel(context, "which modes interact", checker.x + 14, checker.y + 54, { size: 10 });
      drawLabel(context, "combine their sizes", checker.x + 14, checker.y + 74, { size: 10 });
      drawLabel(context, "two ball tests", checker.x + 14, checker.y + 94, { color: colors.accent, size: 10, weight: 700 });
      if (!compact) drawArrow(context, plot.x + plot.width + 12, plot.y + plot.height / 2, checker.x - 12, checker.y + checker.height / 2, { color: colors.heading });
    } else {
      context.strokeStyle = colors.rule;
      context.setLineDash([5, 5]);
      context.strokeRect(checker.x + .5, checker.y + .5, checker.width - 1, checker.height - 1);
      context.setLineDash([]);
      drawLabel(context, "aggregation", checker.x + checker.width / 2, checker.y + checker.height / 2, {
        align: "center",
        baseline: "middle",
        color: colors.muted,
        size: 10,
      });
    }
    tailCanvas.setAttribute(
      "aria-label",
      `Certificate layer ${selectedTailStage + 1} of 5: ${tailStages[selectedTailStage].label}. ${tailStages[selectedTailStage].status}`,
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
        size: compact ? 9 : 10,
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
        size: 10,
        weight: 700,
      });
      context.beginPath();
      context.arc(fixedPointX, fixedPointY, 2.8, 0, Math.PI * 2);
      context.fillStyle = colors.accent;
      context.fill();
      drawLabel(context, "x*", fixedPointX + 6, fixedPointY - 5, {
        color: colors.accent,
        size: 10,
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
        size: 10,
        weight: 700,
      });
      if (points.length > 1) {
        const current = points[points.length - 1];
        const shownStep = Math.min(certificateMaximumIteration, Math.ceil(progress));
        drawLabel(context, "x" + String(shownStep), current.x + 8, current.y - 7, {
          color: colors.accent,
          size: 10,
          weight: 700,
        });
      }
      drawLabel(context, "enlarged core: ||x* − x°|| ≤ Y/(1 − q)", centerX, centerY + coreRadius + 13, {
        align: "center",
        color: colors.accent,
        size: compact ? 8 : 9,
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
        size: 9,
      });
    });
    for (let step = 0; step <= certificateMaximumIteration; step += 2) {
      const x = mapX(step);
      drawLabel(context, String(step), x, plot.y + plot.height + 18, {
        align: "center",
        size: 9,
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
      size: 10,
    });
    drawLabel(context, "iteration n", plot.x + plot.width, plot.y + plot.height + 18, {
      align: "right",
      size: 9,
    });
    drawLabel(context, "q ≤ " + data.q.toFixed(6), plot.x + plot.width, plot.y + 14, {
      align: "right",
      color: data.signs.derivative ? colors.teal : colors.accent,
      size: 10,
      weight: 700,
    });
    const explanation = data.pass
      ? "both tests pass: the orbit stays inside and converges"
      : "shrinking alone is not enough if the chosen ball is too small";
    drawLabel(context, explanation, compact ? area.width / 2 : plot.x + plot.width / 2, area.height - 14, {
      align: "center",
      color: data.pass ? colors.teal : colors.accent,
      size: compact ? 8 : 10,
    });
  };

  const drawCertificate = () => {
    if (!certificateCanvas) return;
    const rectangle = certificateCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(certificateCanvas);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
    const data = currentCertificateData();
    const area = { width, height, compact: width < 520 };
    drawIterationBall(context, area, data);
    drawConvergencePlot(context, area, data);
    certificateCanvas.setAttribute(
      "aria-label",
      "Coefficient-space fixed-point diagram at radius "
        + selectedMicroRadius.toFixed(3)
        + " times ten to the minus six. The image of the ball has radius bound "
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
      certificateIteration.textContent = "Iteration: choose a ball that passes both tests.";
      return;
    }
    const step = clamp(certificateIterationProgress, 0, certificateMaximumIteration);
    if (step === 0) {
      certificateIteration.textContent = "Ready: xₙ₊₁ = T(xₙ).";
      return;
    }
    certificateIteration.textContent = "At n = "
      + String(Math.min(certificateMaximumIteration, Math.floor(step)))
      + ": distance factor ≤ "
      + (data.q ** step).toFixed(4)
      + ".";
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
    const selfMapRatio = data.radius > 0 ? data.mappedRadius / data.radius : Number.POSITIVE_INFINITY;
    if (certificateRadiusValue) certificateRadiusValue.textContent = selectedMicroRadius.toFixed(3);
    if (certificateValue) certificateValue.textContent = data.signs.value
      ? "Stays inside: T(Bᵣ) fits within " + selfMapRatio.toFixed(6) + "r."
      : "Stays inside: not proved for this radius.";
    if (certificateDerivative) certificateDerivative.textContent = data.signs.derivative
      ? "Shrinks: q ≤ " + data.q.toFixed(6) + " < 1."
      : "Shrinks: not proved for this radius.";
    updateIterationReadout(data);
    if (certificateVerdict) certificateVerdict.textContent = data.pass
      ? "Certified: this ball contains exactly one solution of F(x) = 0."
      : "This chosen ball does not satisfy both conditions.";
    if (certificatePlayButton) certificatePlayButton.disabled = !data.pass;
    if (certificatePlayIcon) certificatePlayIcon.textContent = "▶";
    if (certificatePlayLabel) certificatePlayLabel.textContent = data.pass
      ? "Run iteration"
      : "Choose a certified radius";
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
      status: "The first shape coefficient stays away from zero, so the map cannot be linear and its image cannot be a disk.",
    }),
  ]);
  let selectedReconstructionStage = 0;

  const drawReconstructionEnclosure = (context, width, height) => {
    const compact = width < 520;
    const centerX = compact ? width / 2 : width * .30;
    const centerY = compact ? height * .34 : height * .54;
    const radius = Math.min(compact ? width * .27 : width * .19, compact ? height * .22 : height * .31);
    traceConformalBoundary(context, centerX, centerY, radius, 1, {
      stroke: "rgba(160, 0, 0, .14)",
      lineWidth: 11,
    });
    traceConformalBoundary(context, centerX, centerY, radius, 1, {
      stroke: colors.accent,
      lineWidth: 2.4,
      fill: colors.tealLight,
    });
    drawLabel(context, "finite centre + certified tube", centerX, centerY - radius - 22, {
      align: "center",
      color: colors.heading,
      size: 12,
      weight: 700,
    });
    drawLabel(context, "tube magnified for visibility", centerX, centerY + radius + 25, {
      align: "center",
      color: colors.muted,
      size: 10,
    });

    const gauge = compact
      ? { x: width * .15, y: height * .78, width: width * .70 }
      : { x: width * .59, y: height * .50, width: width * .33 };
    const exponents = [-13, -12, -11, -10, -9, -8];
    context.strokeStyle = colors.ruleDark;
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(gauge.x, gauge.y);
    context.lineTo(gauge.x + gauge.width, gauge.y);
    context.stroke();
    exponents.forEach((exponent, index) => {
      const x = gauge.x + index / (exponents.length - 1) * gauge.width;
      context.beginPath();
      context.moveTo(x, gauge.y - 6);
      context.lineTo(x, gauge.y + 6);
      context.stroke();
      drawLabel(context, `10${superscript(exponent)}`, x, gauge.y + 23, { align: "center", size: 9 });
    });
    const logValue = Math.log10(7.13e-11);
    const markerX = gauge.x + (logValue + 13) / 5 * gauge.width;
    context.beginPath();
    context.arc(markerX, gauge.y, 5, 0, Math.PI * 2);
    context.fillStyle = colors.accent;
    context.fill();
    drawLabel(context, "7.13 × 10⁻¹¹", markerX, gauge.y - 13, {
      align: "center",
      color: colors.accent,
      size: 11,
      weight: 700,
    });
    drawLabel(context, "uniform boundary error", gauge.x + gauge.width / 2, gauge.y - 42, {
      align: "center",
      color: colors.heading,
      size: 12,
    });
    if (!compact) drawArrow(context, centerX + radius + 18, centerY, gauge.x - 18, gauge.y, { color: colors.ruleDark, dashed: true });
  };

  const drawReconstructionUnivalence = (context, width, height) => {
    const compact = width < 520;
    const margin = compact
      ? { left: 52, right: 18, top: 46, bottom: 54 }
      : { left: 70, right: 32, top: 52, bottom: 62 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const yMin = .25;
    const yMax = 1.75;
    const mapX = (theta) => margin.left + theta / (Math.PI * 2) * plotWidth;
    const mapY = (value) => margin.top + (yMax - value) / (yMax - yMin) * plotHeight;
    [.35, .5, 1, 1.5].forEach((value) => {
      const y = mapY(value);
      context.strokeStyle = value === .35 ? colors.accent : colors.rule;
      context.lineWidth = value === .35 ? 1.6 : 1;
      context.setLineDash(value === .35 ? [5, 4] : []);
      context.beginPath();
      context.moveTo(margin.left, y);
      context.lineTo(width - margin.right, y);
      context.stroke();
      context.setLineDash([]);
      drawLabel(context, value.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""), margin.left - 9, y, {
        align: "right",
        baseline: "middle",
        color: value === .35 ? colors.accent : colors.muted,
        size: 10,
      });
    });
    [0, .5, 1, 1.5, 2].forEach((multiple) => {
      drawLabel(context, multiple === 0 ? "0" : multiple === 2 ? "2π" : `${multiple}π`, mapX(multiple * Math.PI), height - margin.bottom + 20, {
        align: "center",
        size: 10,
      });
    });
    context.beginPath();
    let minimum = Number.POSITIVE_INFINITY;
    for (let index = 0; index <= 600; index += 1) {
      const theta = index / 600 * Math.PI * 2;
      const value = conformalDerivative(1, theta).real;
      minimum = Math.min(minimum, value);
      const x = mapX(theta);
      const y = mapY(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = colors.teal;
    context.lineWidth = 2.2;
    context.stroke();
    drawLabel(context, "Re φ°′(eⁱᶿ)", margin.left, 22, { color: colors.teal, size: 12, weight: 700 });
    drawLabel(context, "lower bound for every map in the ball", width - margin.right, mapY(.35) - 10, {
      align: "right",
      color: colors.accent,
      size: 10,
    });
    drawLabel(context, `finite centre minimum ≈ ${minimum.toFixed(3)}`, width - margin.right, 22, {
      align: "right",
      color: colors.muted,
      size: 10,
    });
  };

  const drawReconstructionSpectrum = (context, width, height) => {
    const compact = width < 520;
    const margin = compact
      ? { left: 54, right: 18, top: 48, bottom: 58 }
      : { left: 72, right: 34, top: 50, bottom: 62 };
    const count = 12;
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const yMin = -10;
    const yMax = -1;
    const mapY = (value) => margin.top + (yMax - value) / (yMax - yMin) * plotHeight;
    [-10, -8, -6, -4, -2].forEach((exponent) => {
      const y = mapY(exponent);
      context.strokeStyle = colors.rule;
      context.beginPath();
      context.moveTo(margin.left, y);
      context.lineTo(width - margin.right, y);
      context.stroke();
      drawLabel(context, `10${superscript(exponent)}`, margin.left - 9, y, { align: "right", baseline: "middle", size: 10 });
    });
    const slot = plotWidth / count;
    for (let index = 0; index < count; index += 1) {
      const value = Math.max(1e-10, Math.abs(conformalCoefficients[index]));
      const exponent = Math.log10(value);
      const x = margin.left + index * slot + slot * .18;
      const y = mapY(exponent);
      const barHeight = margin.top + plotHeight - y;
      context.fillStyle = index === 0 ? colors.accent : colors.teal;
      context.globalAlpha = index === 0 ? 1 : .72;
      context.fillRect(x, y, slot * .64, barHeight);
      context.globalAlpha = 1;
      drawLabel(context, String(index + 1), x + slot * .32, height - margin.bottom + 20, { align: "center", size: 9 });
    }
    drawLabel(context, "conformal coefficient magnitude", margin.left, 22, { color: colors.heading, size: 12, weight: 700 });
    drawLabel(context, "mode j", width - margin.right, height - 15, { align: "right", size: 10 });
    const firstX = margin.left + slot * .5;
    const firstY = mapY(Math.log10(conformalCoefficients[0]));
    drawLabel(context, "first shape mode > 0.03459", firstX + 10, firstY - 10, { color: colors.accent, size: 11, weight: 700 });
    drawLabel(context, "a centred disk has no nonconstant shape modes", width - margin.right, margin.top + 18, {
      align: "right",
      color: colors.muted,
      size: compact ? 9 : 11,
    });
  };

  const drawReconstruction = () => {
    if (!reconstructionCanvas) return;
    const rectangle = reconstructionCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(reconstructionCanvas);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);
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
