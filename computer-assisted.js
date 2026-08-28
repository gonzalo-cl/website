(() => {
  "use strict";

  const colors = Object.freeze({
    heading: "#111111",
    text: "#26241f",
    muted: "#666158",
    accent: "#a00000",
    accentLight: "#f7f4e9",
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

    const sideBySide = width >= 500;
    const overview = sideBySide
      ? { x: 18, y: 28, width: width * .48, height: height - 60 }
      : { x: 20, y: 14, width: width - 40, height: Math.min(width - 40, height * .48) };
    const detail = sideBySide
      ? { x: width * .54, y: 72, width: width * .42, height: 156 }
      : { x: 20, y: height - 158, width: width - 40, height: 140 };
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

    drawLabel(context, "dashed: unit circle", 20, height - 14, { size: 11 });
    drawLabel(context, `solid: ${cutoff} printed coefficient${cutoff === 1 ? "" : "s"}`, width - 20, height - 14, {
      align: "right",
      color: colors.accent,
      size: 11,
    });

    if (boundaryModesValue) boundaryModesValue.textContent = `${cutoff} of 30`;
    if (boundaryModes) boundaryModes.setAttribute("aria-valuetext", `${cutoff} of 30 printed conformal coefficients`);
    const deformation = boundaryPoint(0, cutoff).radius - 1;
    boundaryCanvas.setAttribute(
      "aria-label",
      `Numerical ten-fold conformal boundary using ${cutoff} of 30 printed coefficients, compared with the dashed unit circle. A ${zoom}-times detail near theta zero shows radial displacement ${deformation.toFixed(6)}. Overall radial range ${minimumRadius.toFixed(6)} to ${maximumRadius.toFixed(6)}.`,
    );
  };

  if (boundaryModes) boundaryModes.addEventListener("input", drawBoundary);
  observeCanvas(boundaryCanvas, drawBoundary);
  requestAnimationFrame(drawBoundary);

  const certificateCanvas = document.getElementById("certificateCanvas");
  const certificateRadius = document.getElementById("certificateRadius");
  const certificateRadiusValue = document.getElementById("certificateRadiusValue");
  const certificateValue = document.getElementById("certificateValue");
  const certificateDerivative = document.getElementById("certificateDerivative");
  const certificateVerdict = document.getElementById("certificateVerdict");
  const certificateBounds = Object.freeze({ Y: 1.59e-10, Z: .621, C2: 122, C3: .012 });
  let selectedMicroRadius = 1;

  const radiiPolynomial = (value) => certificateBounds.Y
    + (certificateBounds.Z - 1) * value
    + certificateBounds.C2 * value * value
    + certificateBounds.C3 * value * value * value;
  const radiiDerivative = (value) => certificateBounds.Z - 1
    + 2 * certificateBounds.C2 * value
    + 3 * certificateBounds.C3 * value * value;

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

  const drawCertificate = () => {
    if (!certificateCanvas) return;
    const rectangle = certificateCanvas.getBoundingClientRect();
    if (rectangle.width < 120 || rectangle.height < 160) return;
    const { context, width, height } = prepareCanvas(certificateCanvas, 300);
    context.fillStyle = colors.white;
    context.fillRect(0, 0, width, height);

    const compact = width < 460;
    const margin = compact
      ? { left: 54, right: 18, top: 38, bottom: 52 }
      : { left: 68, right: 28, top: 42, bottom: 58 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxRadius = 2e-6;
    const yMin = -8e-7;
    const yMax = 1e-7;
    const mapX = (value) => margin.left + value / maxRadius * plotWidth;
    const mapY = (value) => margin.top + (yMax - value) / (yMax - yMin) * plotHeight;

    context.fillStyle = colors.accentLight;
    context.fillRect(mapX(.001e-6), margin.top, width - margin.right - mapX(.001e-6), plotHeight);

    [0, -2e-7, -4e-7, -6e-7, -8e-7].forEach((value) => {
      const y = mapY(value);
      context.beginPath();
      context.strokeStyle = value === 0 ? colors.ruleDark : colors.rule;
      context.setLineDash(value === 0 ? [5, 4] : []);
      context.moveTo(margin.left, y);
      context.lineTo(width - margin.right, y);
      context.stroke();
      context.setLineDash([]);
      drawLabel(context, value === 0 ? "0" : String(value / 1e-7), margin.left - 9, y, {
        align: "right",
        baseline: "middle",
        size: 10,
      });
    });

    [0, .5, 1, 1.5, 2].forEach((value) => {
      const x = mapX(value * 1e-6);
      drawLabel(context, String(value), x, height - margin.bottom + 19, { align: "center", size: 10 });
    });
    drawLabel(context, "upper bound × 10⁻⁷", margin.left, 19, { color: colors.heading, size: 11 });
    drawLabel(context, "t × 10⁻⁶", width - margin.right, height - 12, { align: "right", size: 11 });

    context.beginPath();
    for (let index = 0; index <= 260; index += 1) {
      const value = index / 260 * maxRadius;
      const x = mapX(value);
      const y = mapY(radiiPolynomial(value));
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = colors.accent;
    context.lineWidth = 2.4;
    context.stroke();

    const selectedRadius = selectedMicroRadius * 1e-6;
    const selectedX = mapX(selectedRadius);
    const selectedY = mapY(radiiPolynomial(selectedRadius));
    context.beginPath();
    context.setLineDash([4, 4]);
    context.strokeStyle = colors.muted;
    context.moveTo(selectedX, margin.top);
    context.lineTo(selectedX, height - margin.bottom);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(selectedX, selectedY, 5, 0, Math.PI * 2);
    context.fillStyle = colors.white;
    context.fill();
    context.strokeStyle = colors.heading;
    context.lineWidth = 2;
    context.stroke();
  };

  const updateCertificate = () => {
    selectedMicroRadius = Math.max(0, Math.min(2, Number(certificateRadius?.value || 1)));
    const microThousandths = Math.round(selectedMicroRadius * 1000);
    selectedMicroRadius = microThousandths / 1000;
    const radius = microThousandths * 1e-9;
    const value = radiiPolynomial(radius);
    const derivative = radiiDerivative(radius);
    const signs = exactCertificateSigns(microThousandths);
    const pass = signs.value && signs.derivative;
    if (certificateRadiusValue) certificateRadiusValue.textContent = selectedMicroRadius.toFixed(3);
    if (certificateValue) certificateValue.textContent = `𝓡(r) ≤ ${formatScientific(value)}`;
    if (certificateDerivative) certificateDerivative.textContent = `𝓡′(r) ≤ ${derivative.toFixed(6).replace("-", "−")}`;
    if (certificateVerdict) certificateVerdict.textContent = pass
      ? "Both exact upper bounds are negative at this radius."
      : "These bounds do not certify this radius.";
    if (certificateRadius) certificateRadius.setAttribute(
      "aria-valuetext",
      `${selectedMicroRadius.toFixed(3)} times ten to the minus six; ${pass ? "both exact upper bounds are negative" : "not certified by these bounds"}`,
    );
    certificateCanvas?.setAttribute(
      "aria-label",
      `Radii-polynomial upper bound. Selected radius ${selectedMicroRadius.toFixed(3)} times ten to the minus six. Upper bound ${formatScientific(value)} and derivative upper bound ${derivative.toFixed(6)}.`,
    );
    drawCertificate();
  };

  if (certificateRadius) certificateRadius.addEventListener("input", updateCertificate);
  observeCanvas(certificateCanvas, drawCertificate);
  requestAnimationFrame(updateCertificate);
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
