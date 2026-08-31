(() => {
  "use strict";

  const data = window.CONE_NUMERICS;
  if (!data) return;
  const crossingData = window.SCHIFFER_ABUNDANCE_DATA;
  const select = (selector) => document.querySelector(selector);
  const last = (items) => items[items.length - 1];
  const setMath = (elementOrSelector, source, options) => window.SchifferMath?.render(elementOrSelector, source, options);
  const setFormula = (element, source, options) => {
    if (!element || element.dataset.tex === source) return;
    element.dataset.tex = source;
    setMath(element, source, options);
  };
  const setCanvasFormula = (wrapSelector, id, source, position = {}) => {
    const wrap = select(wrapSelector);
    if (!wrap) return null;
    let label = document.getElementById(id);
    if (!label) {
      label = document.createElement("span");
      label.id = id;
      label.className = "canvas-tex-label";
      label.setAttribute("aria-hidden", "true");
      wrap.appendChild(label);
    }
    setFormula(label, source, { serif: true });
    ["left", "right", "top", "bottom"].forEach((property) => {
      label.style[property] = position[property] === undefined ? "" : `${position[property]}px`;
    });
    label.style.color = position.color || "";
    label.style.transform = position.transform || "";
    return label;
  };
  const TAU = Math.PI * 2;
  const GEOMETRY_PROFILE_PHASE = -Math.PI / 2;
  const GEOMETRY_TRAJECTORY = Object.freeze({
    coneTip: .16,
    coneRight: .84,
    cylinderLeft: -.62,
    cylinderRight: .97,
  });
  const visualTheme = window.SCHIFFER_VISUAL_THEME || {
    paperEdition: false,
    background: "#101b20",
    backgroundAlt: "#17303a",
    ink: "#f1eee5",
    line: "rgba(241,238,229,.12)",
    lineStrong: "rgba(241,238,229,.34)",
    muted: "rgba(241,238,229,.42)",
    panel: "rgba(12,22,27,.65)",
    tooltip: "rgba(10,19,23,.96)",
    labelFont: "11px DM Mono, monospace",
    titleFont: "italic 400 25px Georgia, serif",
    serifFamily: "Georgia, serif",
  };
  const paperEdition = Boolean(visualTheme.paperEdition || document.body.classList.contains("tufte-site"));
  const colors = {
    ink: visualTheme.background,
    paper: visualTheme.ink,
    orange: visualTheme.accent || "#a00000",
    cyan: visualTheme.teal || "#075760",
    grid: visualTheme.line,
    faint: visualTheme.muted,
    panel: visualTheme.panel,
    tooltip: visualTheme.tooltip,
  };

  // The two model geometries in Section 3 have independent, manually operated
  // branch parameters.  They show the leading geometry of the local branches;
  // the slider endpoints are labelled ±epsilon rather than assigned a false
  // absolute normalization.
  const worldSection = select("#borrow-flexibility");
  const cylinderDomainBack = select(".cylinder-domain-back");
  const cylinderDomainFront = select(".cylinder-domain-front");
  const cylinderBoundaryBack = select(".cylinder-boundary-back");
  const cylinderBoundaryFront = select(".cylinder-boundary-front");
  const cylinderBranchRange = select("#cylinderBranchRange");
  const cylinderBranchValue = select("#cylinderBranchValue");
  const cylinderBranchDiagram = select("#cylinderBranchDiagram");
  const sphereDomainFill = select(".sphere-domain-fill");
  const sphereBoundaryBack = select(".sphere-boundary-back");
  const sphereBoundaryFront = select(".sphere-boundary-front");
  const sphereDomainLabel = select(".world-domain-label.dark-label");
  const sphereBranchRange = select("#sphereBranchRange");
  const sphereBranchValue = select("#sphereBranchValue");
  const sphereBranchDiagram = select("#sphereBranchDiagram");
  const annulusDomainFill = select(".annulus-domain-fill");
  const annulusBoundaryOuter = select(".annulus-boundary-outer");
  const annulusBoundaryInner = select(".annulus-boundary-inner");
  const annulusBranchRange = select("#annulusBranchRange");
  const annulusBranchValue = select("#annulusBranchValue");
  const annulusBranchDiagram = select("#annulusBranchDiagram");
  const wheelerDomainFill = select(".wheeler-domain-fill");
  const wheelerBoundary = select(".wheeler-boundary");
  const wheelerFluxArrows = select("#wheelerFluxArrows");
  const wheelerBranchRange = select("#wheelerBranchRange");
  const wheelerBranchValue = select("#wheelerBranchValue");

  function worldPath(points, close = false) {
    const path = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join("");
    return close ? `${path}Z` : path;
  }

  function cylinderBoundaryHalf(baseX, start, end, branchAmount) {
    const points = [];
    for (let index = 0; index <= 56; index++) {
      const theta = start + (end - start) * index / 56;
      points.push({
        x: baseX + 37 * Math.cos(theta) + 18 * branchAmount * Math.cos(theta - .65),
        y: 150 + 88 * Math.sin(theta),
      });
    }
    return points;
  }

  /* On the trivial line the Fall-Minlend-Weth domain is the straight band
     between two round loops, and the free parameter is its width: the loops
     slide apart and together while both stay exact circles.  The crossing width
     is the one at which the branch appears. */
  let cylinderTrivial = 0;

  function renderCylinderBifurcation(branchAmount) {
    if (!cylinderDomainBack || !cylinderDomainFront || !cylinderBoundaryBack
        || !cylinderBoundaryFront) return;
    const spread = 95 * cylinderTrivial;
    const leftBase = 165 - spread;
    const rightBase = 355 + spread;
    const leftFront = cylinderBoundaryHalf(leftBase, -Math.PI / 2, Math.PI / 2, branchAmount);
    const rightFront = cylinderBoundaryHalf(rightBase, -Math.PI / 2, Math.PI / 2, branchAmount);
    const leftBack = cylinderBoundaryHalf(leftBase, Math.PI / 2, 3 * Math.PI / 2, branchAmount);
    const rightBack = cylinderBoundaryHalf(rightBase, Math.PI / 2, 3 * Math.PI / 2, branchAmount);
    cylinderDomainFront.setAttribute("d", worldPath([...leftFront, ...[...rightFront].reverse()], true));
    cylinderDomainBack.setAttribute("d", worldPath([...leftBack, ...[...rightBack].reverse()], true));
    cylinderBoundaryFront.setAttribute("d", `${worldPath(leftFront)}${worldPath(rightFront)}`);
    cylinderBoundaryBack.setAttribute("d", `${worldPath(leftBack)}${worldPath(rightBack)}`);
  }

  /* Pitchfork diagram for the annulus branch.  The trivial solutions are the
     round annuli, one for each inner radius a, so they form the horizontal
     line; the nontrivial branch leaves it at a_4 = 0.140989.  Crandall-
     Rabinowitz gives a(s) even in s, because s -> -s is a rotation by pi/l,
     so the branch really is a pitchfork rather than a transcritical crossing.
     The *direction* in which it bends is second-order data that neither paper
     records, so the bend drawn here is schematic and carries no claim; only
     the shape and the crossing point are asserted. */
  const BRANCH_DIAGRAM = Object.freeze({
    left: 18, right: 248, axisY: 52, top: 16, bottom: 88, criticalX: 150, bend: 74,
  });

  function branchDiagramGeometry(amount) {
    const { axisY, top, bottom, criticalX, bend } = BRANCH_DIAGRAM;
    const halfHeight = (bottom - top) / 2;
    return {
      x: criticalX + bend * amount * amount,
      y: axisY - halfHeight * amount,
    };
  }

  /* The marker has two degrees of freedom, not one.  Off the branch it slides
     along the trivial line, where the domain is the unperturbed one and the
     only thing changing is the parameter on the horizontal axis: the radially
     symmetric domain growing or shrinking.  Only at the crossing does the
     nontrivial branch exist, so only there can the marker leave the line.
     `trivial` is the horizontal position in [-1, 1] with 0 at the crossing;
     when the amplitude is nonzero the marker is on the parabola and `trivial`
     is ignored, because the branch fixes the horizontal position itself. */
  function branchTrivialGeometry(trivial) {
    const { axisY, left, right, criticalX } = BRANCH_DIAGRAM;
    const span = trivial < 0 ? criticalX - left : right - criticalX;
    return { x: criticalX + span * trivial, y: axisY };
  }

  function renderBranchDiagram(diagram, amount, trivial = 0) {
    if (!diagram) return;
    const curve = diagram.querySelector(".branch-nontrivial");
    const marker = diagram.querySelector(".branch-marker");
    if (!curve || !marker) return;
    const points = [];
    for (let index = 0; index <= 48; index++) {
      points.push(branchDiagramGeometry(-1 + 2 * index / 48));
    }
    curve.setAttribute("d", worldPath(points));
    const onBranch = Math.abs(amount) > .001;
    const here = onBranch ? branchDiagramGeometry(amount) : branchTrivialGeometry(trivial);
    marker.setAttribute("cx", here.x.toFixed(2));
    marker.setAttribute("cy", here.y.toFixed(2));
    marker.classList.toggle("branch-marker-trivial", !onBranch);
    // The crossing is where the branch is available; mark it when we are not on it.
    const node = diagram.querySelector(".branch-crossing");
    if (node) node.classList.toggle("branch-crossing-live", !onBranch && Math.abs(trivial) < .06);
  }

  function bindBranchDiagram(diagram, range, options = {}) {
    if (!diagram || !range) return;
    const { axisY, top, bottom, left, right, criticalX } = BRANCH_DIAGRAM;
    const halfHeight = (bottom - top) / 2;
    // Dragging horizontally along the trivial line is only meaningful where the
    // renderer knows what the trivial domain looks like, so it is opt-in.
    const onTrivial = options.onTrivial;
    const state = { trivial: 0 };
    const setFromPointer = (event) => {
      const box = diagram.getBoundingClientRect();
      if (!box.height || !box.width) return;
      // Map the pointer back through the viewBox: s is the vertical coordinate.
      const viewY = (event.clientY - box.top) / box.height * 104;
      const viewX = (event.clientX - box.left) / box.width * 260;
      const amount = Math.max(-1, Math.min(1, (axisY - viewY) / halfHeight));
      if (!onTrivial) {
        range.value = amount.toFixed(2);
        range.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }
      /* Leaving the line requires being at the crossing: away from it there is
         no branch to step onto, which is the content of the picture.  Near the
         line we stay on it and the horizontal position becomes the unknown. */
      const nearLine = Math.abs(amount) < .12;
      const atCrossing = Math.abs(state.trivial) < .08;
      if (nearLine || !atCrossing) {
        const span = viewX < criticalX ? criticalX - left : right - criticalX;
        state.trivial = Math.max(-1, Math.min(1, (viewX - criticalX) / span));
        if (Number(range.value) !== 0) {
          range.value = "0";
          range.dispatchEvent(new Event("input", { bubbles: true }));
        }
        onTrivial(state.trivial);
        renderBranchDiagram(diagram, 0, state.trivial);
        return;
      }
      state.trivial = 0;
      onTrivial(0);
      range.value = amount.toFixed(2);
      range.dispatchEvent(new Event("input", { bubbles: true }));
    };
    diagram.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      diagram.setPointerCapture(event.pointerId);
      setFromPointer(event);
    });
    diagram.addEventListener("pointermove", (event) => {
      if (!diagram.hasPointerCapture(event.pointerId)) return;
      setFromPointer(event);
    });
    diagram.addEventListener("pointerup", (event) => diagram.releasePointerCapture(event.pointerId));
    diagram.addEventListener("keydown", (event) => {
      const step = event.key === "ArrowUp" || event.key === "ArrowRight" ? .05
        : event.key === "ArrowDown" || event.key === "ArrowLeft" ? -.05 : 0;
      if (!step) return;
      event.preventDefault();
      range.value = Math.max(-1, Math.min(1, Number(range.value) + step)).toFixed(2);
      range.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  let annulusTrivial = 0;
  function renderAnnulusBifurcation(branchAmount) {
    if (!annulusDomainFill || !annulusBoundaryOuter || !annulusBoundaryInner) return;
    // Enciso-Fernandez-Ruiz-Sicbaldi bifurcate from the annulus {a < r < 1} at
    // the crossing mu_{0,2}(a) = lambda_{l,0}(a), which exists for every l >= 4.
    // We draw the verified case l = 4, where a_4 = 0.140989 and mu = 57.5851.
    const centreX = 260;
    const centreY = 143;
    const outerRadius = 111;
    /* On the trivial line the domain is the round annulus and the free
       parameter is its inner radius a.  a_4 = 0.140989 is the crossing; moving
       off it along the line grows or shrinks the hole, and no branch exists
       there.  The displayed range is deliberately narrow, since the crossing is
       what the picture is about. */
    const innerFraction = .1409893 * (1 + .55 * annulusTrivial);
    // Both boundaries move as cos(4 theta), but not by the same amount: the
    // true ratio of the two amplitudes is -27.883, computed from the crossing
    // eigenfunctions.  At that exact ratio the inner ripple is 1.0 px
    // peak-to-peak against the outer's 28.9, which reads as an unperturbed
    // circle and misinforms: the point is that the inner boundary moves much
    // less, not that it stays put.  INNER_RIPPLE_GAIN opens it to 6.2 px, still
    // 4.6 times smaller than the outer ripple, so the comparison survives while
    // the motion becomes visible.  The sign makes the domain thicken where
    // cos(4 theta) is positive.
    const outerAmplitude = .13;
    const INNER_RIPPLE_GAIN = 6;
    const innerAmplitude = -INNER_RIPPLE_GAIN * outerAmplitude / 27.883;
    const outer = [];
    const inner = [];
    for (let index = 0; index <= 192; index++) {
      const theta = TAU * index / 192;
      const wave = Math.cos(4 * theta);
      const rOuter = outerRadius * (1 + outerAmplitude * branchAmount * wave);
      const rInner = outerRadius * (innerFraction + innerAmplitude * branchAmount * wave);
      outer.push({ x: centreX + rOuter * Math.cos(theta), y: centreY + rOuter * Math.sin(theta) });
      inner.push({ x: centreX + rInner * Math.cos(theta), y: centreY + rInner * Math.sin(theta) });
    }
    const outerPath = worldPath(outer, true);
    const innerPath = worldPath(inner, true);
    // evenodd on the combined path punches the hole out of the filled disk.
    annulusDomainFill.setAttribute("d", `${outerPath}${innerPath}`);
    annulusBoundaryOuter.setAttribute("d", outerPath);
    annulusBoundaryInner.setAttribute("d", innerPath);
    const innerReference = document.querySelector(".annulus-inner-reference");
    if (innerReference) innerReference.setAttribute("r", (outerRadius * innerFraction).toFixed(2));
    renderBranchDiagram(annulusBranchDiagram, branchAmount, annulusTrivial);
  }

  let sphereTrivial = 0;
  function renderSphereBifurcation(branchAmount) {
    if (!sphereDomainFill || !sphereBoundaryBack || !sphereBoundaryFront) return;
    const sphereFront = [];
    const sphereBack = [];
    const sphereRadius = 111;
    // The paper bifurcates from cos(theta) > a_* with a_* about 0.477.
    // We view the north-pole cap obliquely but from within it, so its projected
    // image is a closed domain inside the sphere rather than a band cut along
    // the equator.  The angular amplitude is deliberately enlarged for sight.
    /* On the trivial line the domain is the round spherical cap and the free
       parameter is its latitude: a_* = 0.477 is the crossing, and moving off it
       opens or closes the cap while its boundary stays an exact circle of
       latitude. */
    const crossingHeight = .477 * (1 + .42 * sphereTrivial);
    const baseLatitude = Math.asin(Math.max(.06, Math.min(.94, crossingHeight)));
    const displayedAngularAmplitude = .095;
    const equatorMinorRadius = 85;
    const projectedPoleRadius = Math.sqrt(sphereRadius ** 2 - equatorMinorRadius ** 2);
    for (let index = 0; index <= 96; index++) {
      const theta = -Math.PI / 2 + Math.PI * index / 96;
      const equatorEnvelope = Math.cos(theta);
      // cos(8 theta) gives four waves on each projected half, hence eight on
      // the complete boundary.  Even at the displayed endpoints the latitude
      // remains positive, so the domain stays strictly in the half-sphere.
      const latitude = baseLatitude
        - displayedAngularAmplitude * branchAmount * Math.cos(8 * theta);
      const commonLatitudeShift = -projectedPoleRadius * Math.sin(latitude);
      const projectedEquatorDepth = equatorMinorRadius * Math.cos(latitude) * equatorEnvelope;
      const x = 260 + sphereRadius * Math.cos(latitude) * Math.sin(theta);
      sphereFront.push({ x, y: 143 + projectedEquatorDepth + commonLatitudeShift });
      sphereBack.push({ x, y: 143 - projectedEquatorDepth + commonLatitudeShift });
    }
    const frontPath = worldPath(sphereFront);
    sphereDomainFill.setAttribute("d", worldPath([...sphereFront, ...[...sphereBack].reverse()], true));
    sphereBoundaryFront.setAttribute("d", frontPath);
    sphereBoundaryBack.setAttribute("d", worldPath(sphereBack));
    if (sphereDomainLabel) {
      sphereDomainLabel.setAttribute("x", "260");
      sphereDomainLabel.setAttribute("y", "107");
    }
  }

  function renderWheelerBifurcation(branchAmount) {
    if (!wheelerDomainFill || !wheelerBoundary || !wheelerFluxArrows) return;
    const centreX = 260;
    const centreY = 143;
    const radius = 96;
    const mode = 10;
    // Wheeler proves phi_epsilon(z) = z + epsilon z^(m+1) + O(epsilon^2).
    // The displayed coefficient is enlarged so the leading m-fold motion can
    // be seen; it is not a numerical sample from the exact local branch.
    const displayedEpsilon = .07 * branchAmount;
    const boundaryPoint = (theta) => ({
      x: centreX + radius * (Math.cos(theta) + displayedEpsilon * Math.cos((mode + 1) * theta)),
      y: centreY + radius * (Math.sin(theta) + displayedEpsilon * Math.sin((mode + 1) * theta)),
    });
    const points = [];
    for (let index = 0; index <= 240; index += 1) {
      points.push(boundaryPoint(TAU * index / 240));
    }
    const path = worldPath(points, true);
    wheelerDomainFill.setAttribute("d", path);
    wheelerBoundary.setAttribute("d", path);

    wheelerFluxArrows.textContent = "";
    for (let index = 0; index < 12; index += 1) {
      const theta = TAU * (index + .25) / 12;
      const point = boundaryPoint(theta);
      const tangentX = radius * (-Math.sin(theta)
        - displayedEpsilon * (mode + 1) * Math.sin((mode + 1) * theta));
      const tangentY = radius * (Math.cos(theta)
        + displayedEpsilon * (mode + 1) * Math.cos((mode + 1) * theta));
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const normalX = tangentY / tangentLength;
      const normalY = -tangentX / tangentLength;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", (point.x + 3 * normalX).toFixed(2));
      line.setAttribute("y1", (point.y + 3 * normalY).toFixed(2));
      line.setAttribute("x2", (point.x + 18 * normalX).toFixed(2));
      line.setAttribute("y2", (point.y + 18 * normalY).toFixed(2));
      line.setAttribute("marker-end", "url(#wheelerFluxArrow)");
      wheelerFluxArrows.appendChild(line);
    }
  }

  function renderBranchValue(output, amount) {
    if (!output) return;
    const source = Math.abs(amount) < .005
      ? "s=0"
      : `s=${amount > 0 ? "+" : ""}${amount.toFixed(2)}\\varepsilon`;
    setMath(output, source);
  }

  function bindWorldBranch(range, output, render) {
    if (!range) return;
    const update = () => {
      const amount = Number(range.value);
      fillRange(range);
      renderBranchValue(output, amount);
      render(amount);
    };
    range.addEventListener("input", update);
    update();
  }

  if (worldSection) {
    bindWorldBranch(cylinderBranchRange, cylinderBranchValue, (amount) => {
      renderCylinderBifurcation(amount);
      renderBranchDiagram(cylinderBranchDiagram, amount, cylinderTrivial);
    });
    bindWorldBranch(sphereBranchRange, sphereBranchValue, (amount) => {
      renderSphereBifurcation(amount);
      renderBranchDiagram(sphereBranchDiagram, amount, sphereTrivial);
    });
    bindWorldBranch(annulusBranchRange, annulusBranchValue, renderAnnulusBifurcation);
    bindWorldBranch(wheelerBranchRange, wheelerBranchValue, renderWheelerBifurcation);
    bindBranchDiagram(cylinderBranchDiagram, cylinderBranchRange, {
      onTrivial: (trivial) => {
        cylinderTrivial = trivial;
        renderCylinderBifurcation(Number(cylinderBranchRange.value) || 0);
      },
    });
    bindBranchDiagram(sphereBranchDiagram, sphereBranchRange, {
      onTrivial: (trivial) => {
        sphereTrivial = trivial;
        renderSphereBifurcation(Number(sphereBranchRange.value) || 0);
      },
    });
    bindBranchDiagram(annulusBranchDiagram, annulusBranchRange, {
    onTrivial: (trivial) => {
      annulusTrivial = trivial;
      renderAnnulusBifurcation(Number(annulusBranchRange.value) || 0);
    },
  });
  }

  function fillRange(input) {
    const amount = (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min));
    input.style.setProperty("--value", `${amount * 100}%`);
  }

  function canvasMetrics(canvasSelector, wrapSelector, minimumHeight) {
    const canvas = select(canvasSelector);
    const wrap = select(wrapSelector);
    // The bitmap and its CSS box must have the same aspect ratio.  Earlier we
    // clamped the backing store to a minimum size while CSS was free to make
    // the wrapper smaller; the browser then independently scaled x and y and
    // visibly crushed circles and cone sections at narrow breakpoints.
    const width = Math.max(1, Math.round(wrap.clientWidth || canvas.clientWidth || 900));
    const height = Math.max(1, Math.round(wrap.clientHeight || canvas.clientHeight || minimumHeight));
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { canvas, context, width, height };
  }

  function roundedPanel(context, x, y, width, height, radius = 2) {
    context.beginPath();
    if (typeof context.roundRect === "function") {
      context.roundRect(x, y, width, height, radius);
      return;
    }
    // Safari before 15.4 has no CanvasRenderingContext2D.roundRect.  Keep the
    // renderer self-contained instead of allowing one decorative panel to
    // abort initialization of every later canvas on the page.
    const r = Math.max(0, Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2));
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function drawFrameLabel(context, width, eyebrow, title, detail) {
    context.save();
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = colors.orange;
    context.font = visualTheme.labelFont;
    context.fillText(eyebrow.toUpperCase(), 24, 26);
    context.fillStyle = colors.paper;
    let titleSize = width < 520 ? 19 : 25;
    context.font = `italic 400 ${titleSize}px ${visualTheme.serifFamily}`;
    while (titleSize > 15 && context.measureText(title).width > width - 48) {
      titleSize -= 1;
      context.font = `italic 400 ${titleSize}px ${visualTheme.serifFamily}`;
    }
    context.fillText(title, 24, 54);
    if (width >= 520) {
      context.fillStyle = colors.faint;
      context.font = visualTheme.labelFont;
      context.textAlign = "right";
      context.fillText(detail, width - 24, 27);
    }
    context.restore();
  }

  function drawCenteredCaption(context, text, centerX, topY, maxWidth, lineHeight = 14) {
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    if (line) lines.push(line);
    lines.forEach((entry, index) => context.fillText(entry, centerX, topY + index * lineHeight));
  }

  function drawDiskFrame(context, width, height, opacity) {
    context.save();
    context.globalAlpha = opacity;
    drawFrameLabel(context, width, "01 / quotient", "Keep one angular wavelength", "N = 28 · sector angle 2π/28");
    const radius = Math.min(width * .28, height * .35);
    const cx = width * .5;
    const cy = height * .55;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, "#e36d4b");
    gradient.addColorStop(.55, "#d8d3bb");
    gradient.addColorStop(1, "#337e83");
    context.fillStyle = gradient;
    context.beginPath(); context.arc(cx, cy, radius, 0, TAU); context.fill();
    context.strokeStyle = colors.paper; context.lineWidth = 2;
    context.beginPath(); context.arc(cx, cy, radius, 0, TAU); context.stroke();
    const halfAngle = Math.PI / 28;
    context.beginPath();
    context.moveTo(cx, cy);
    context.arc(cx, cy, radius, -halfAngle, halfAngle);
    context.closePath();
    context.fillStyle = "rgba(7,87,96,.8)";
    context.fill();
    context.strokeStyle = colors.orange; context.lineWidth = 1.5; context.stroke();
    context.fillStyle = colors.paper;
    context.font = visualTheme.labelFont;
    context.fillText("one quotient sector", cx + radius * .62, cy - 22);
    context.fillStyle = colors.faint;
    context.fillText("one sector determines all 28 copies", cx - radius, cy + radius + 31);
    context.restore();
  }

  function drawConeFrame(context, width, height, opacity) {
    context.save();
    context.globalAlpha = opacity;
    drawFrameLabel(context, width, "02 / cone quotient", "Identify the sides of one fundamental sector", "boundary circumference 2π · cone parameter R");
    const left = width * .13;
    const right = width * .87;
    const cy = height * .56;
    const rimHalf = Math.min(84, height * .22);
    const gradient = context.createLinearGradient(left, 0, right, 0);
    gradient.addColorStop(0, "rgba(7,87,96,.08)");
    gradient.addColorStop(.76, "rgba(7,87,96,.34)");
    gradient.addColorStop(1, "rgba(160,0,0,.42)");
    context.beginPath();
    context.moveTo(left, cy);
    context.lineTo(right, cy - rimHalf);
    context.lineTo(right, cy + rimHalf);
    context.closePath();
    context.fillStyle = gradient; context.fill();
    context.strokeStyle = colors.paper; context.lineWidth = 1.7; context.stroke();
    context.beginPath();
    context.ellipse(right, cy, 12, rimHalf, 0, 0, TAU);
    context.strokeStyle = colors.orange; context.lineWidth = 2.2; context.stroke();
    const collarLeft = right - (right - left) * 5 / 28;
    context.fillStyle = "rgba(160,0,0,.14)";
    context.fillRect(collarLeft, cy - rimHalf, right - collarLeft, rimHalf * 2);
    context.strokeStyle = colors.cyan; context.setLineDash([4, 5]);
    context.beginPath(); context.moveTo(collarLeft, cy - rimHalf); context.lineTo(collarLeft, cy + rimHalf); context.stroke();
    context.setLineDash([]);
    context.fillStyle = colors.paper; context.font = visualTheme.labelFont;
    context.fillText("cone point", left - 7, cy + 20);
    context.fillText("five-unit collar", collarLeft + 7, cy - rimHalf - 13);
    context.fillStyle = colors.faint;
    context.fillText("R ≈ 28", (left + right) / 2 - 18, cy + rimHalf + 29);
    context.restore();
  }

  function landingWall(psi) {
    const coefficients = last(data.records).h;
    let value = 0;
    coefficients.forEach((coefficient, mode) => { value += coefficient * Math.cos(mode * psi); });
    return value;
  }

  function lerp(left, right, amount) { return left + (right - left) * amount; }
  function ease(amount) {
    const clamped = Math.max(0, Math.min(1, amount));
    return clamped * clamped * (3 - 2 * clamped);
  }

  /* On wide pages the stage key occupies a fraction of the canvas.  Center
     disk stages in the unobscured remainder; on stacked layouts the CSS token
     is zero and the ordinary canvas centre is recovered automatically. */
  function geometryVisualCenter(width) {
    const laboratory = select(".geometry-laboratory");
    const token = laboratory
      ? parseFloat(getComputedStyle(laboratory).getPropertyValue("--geometry-key-width")) / 100
      : 0;
    const keyFraction = Number.isFinite(token) ? Math.max(0, Math.min(.45, token)) : 0;
    return width * (.5 + keyFraction / 2);
  }

  function drawNfoldDisk(context, width, height, options = {}) {
    const cx = options.cx ?? width * .5;
    const cy = options.cy ?? height * .54;
    const radius = options.radius ?? Math.min(width * .27, height * .34);
    const opacity = options.opacity ?? 1;
    const selection = options.selection ?? 0;
    const wiggle = options.wiggle ?? 0;
    const divisions = options.divisions ?? 1;
    const copies = 28;
    const samplesPerCopy = 7;
    context.save(); context.globalAlpha *= opacity;

    for (let index = 0; index < copies * samplesPerCopy; index++) {
      const a0 = index / (copies * samplesPerCopy) * TAU;
      const a1 = (index + 1.03) / (copies * samplesPerCopy) * TAU;
      const middle = (a0 + a1) / 2;
      const psi = copies * middle + GEOMETRY_PROFILE_PHASE;
      const value = Math.cos(psi);
      const localRadius = radius * (1 - wiggle * landingWall(psi) / 28);
      context.beginPath(); context.moveTo(cx, cy);
      context.lineTo(cx + localRadius * Math.cos(a0), cy + localRadius * Math.sin(a0));
      context.lineTo(cx + localRadius * Math.cos(a1), cy + localRadius * Math.sin(a1));
      context.closePath();
      context.fillStyle = value > 0
        ? `rgba(160,0,0,${.19 + .18 * value})`
        : `rgba(7,87,96,${.21 - .22 * value})`;
      context.fill();
    }

    const halfAngle = Math.PI / copies;
    if (selection > 0) {
      context.beginPath(); context.moveTo(cx, cy);
      context.lineTo(cx + radius * Math.cos(-halfAngle), cy + radius * Math.sin(-halfAngle));
      context.arc(cx, cy, radius, -halfAngle, halfAngle);
      context.closePath(); context.fillStyle = `rgba(160,0,0,${.08 + .24 * selection})`; context.fill();
      context.strokeStyle = colors.orange; context.lineWidth = 2.4; context.stroke();
    }

    if (divisions > 0) {
      for (let index = 0; index < copies; index++) {
        const startAngle = (index - .5) / copies * TAU;
        const endAngle = (index + .5) / copies * TAU;
        context.beginPath(); context.moveTo(cx, cy); context.arc(cx, cy, radius, startAngle, endAngle); context.closePath();
        context.fillStyle = index % 2
          ? `rgba(160,0,0,${.018 * divisions})`
          : `rgba(7,87,96,${.024 * divisions})`;
        context.fill();
        const angle = (index + .5) / copies * TAU;
        context.beginPath(); context.moveTo(cx, cy);
        context.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        context.strokeStyle = index % 2
          ? `rgba(160,0,0,${.12 + .18 * divisions})`
          : `rgba(7,87,96,${.12 + .18 * divisions})`;
        context.lineWidth = .7; context.stroke();
      }
    }

    context.beginPath();
    for (let index = 0; index <= 900; index++) {
      const angle = index / 900 * TAU;
      const localRadius = radius * (1 - wiggle * landingWall(copies * angle + GEOMETRY_PROFILE_PHASE) / 28);
      const x = cx + localRadius * Math.cos(angle); const y = cy + localRadius * Math.sin(angle);
      if (!index) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath(); context.strokeStyle = colors.paper; context.lineWidth = 2; context.stroke();
    if (options.showCaption !== false) {
      context.fillStyle = colors.faint; context.font = visualTheme.labelFont; context.textAlign = "center";
      context.fillText("the same angular profile repeats N times", cx, cy + radius + 34);
    }
    context.restore();
  }

  // One material sheet is used from the selected planar sector to the final
  // planar lift. Its material coordinates are radial∈[0,1] and angular∈[-1,1].
  // Changing `fold`, `tip`, and `wave` changes only the embedding of those
  // points, so no renderer handoff can move the surface by a pixel.
  function geometrySheetState(width, height, options = {}) {
    const tip = options.tip ?? width * GEOMETRY_TRAJECTORY.coneTip;
    const right = options.right ?? width * GEOMETRY_TRAJECTORY.coneRight;
    const surfaceLeft = options.surfaceLeft ?? Math.max(-width * .12, tip);
    const length = right - tip;
    const referenceLength = width * .68;
    return {
      tip,
      right,
      length,
      cy: height * .54,
      half: options.half ?? Math.min(118, height * .23),
      fold: options.fold ?? 1,
      // `cylinder` changes the embedding, not the material coordinates.  At
      // one, every longitudinal generator is parallel and every transverse
      // section has the same radius: this is an exact cylinder rather than a
      // cone whose tip merely happens to be outside the viewport.
      cylinder: options.cylinder ?? 0,
      axisLeft: options.axisLeft ?? tip,
      flatOpening: options.flatOpening ?? Math.PI / 28,
      wave: options.wave ?? 0,
      // The cone order grows in proportion to its displayed radial length.
      // Consequently length / order is a fixed pixels-per-radial-unit scale
      // during the cone-to-cylinder limit.  An explicit order is supplied
      // only when the already constructed finite sector is moved or resized.
      order: options.order ?? 28 * length / referenceLength,
      rimDepth: 10,
      radialStart: Math.max(0, Math.min(.985, (surfaceLeft - tip) / (right - tip))),
    };
  }

  function geometrySheetPoint(sheet, radial, angular, deformed = true) {
    const theta = Math.PI * angular;
    const wall = deformed ? sheet.wave * landingWall(theta + GEOMETRY_PROFILE_PHASE) : 0;
    // h(psi) is a displacement in radial units.  Dividing by the current
    // order, rather than always by 28, keeps its displayed radial amplitude
    // fixed while the cone point recedes to the half-cylinder limit.
    const materialRadius = radial * (1 - wall / sheet.order);
    const flatAngle = sheet.flatOpening * angular;
    const flatX = sheet.tip + materialRadius * sheet.length * Math.cos(flatAngle);
    const flatY = sheet.cy + materialRadius * sheet.length * Math.sin(flatAngle);
    const coneX = sheet.tip + materialRadius * (sheet.length + sheet.rimDepth * Math.cos(theta));
    const coneY = sheet.cy + materialRadius * sheet.half * Math.sin(theta);
    const cylinderLength = sheet.right - sheet.axisLeft;
    const wallPixels = cylinderLength / 28;
    const cylinderX = sheet.axisLeft
      + radial * cylinderLength
      - radial * wall * wallPixels
      + sheet.rimDepth * Math.cos(theta);
    const cylinderY = sheet.cy + sheet.half * Math.sin(theta);
    const foldedX = lerp(coneX, cylinderX, sheet.cylinder);
    const foldedY = lerp(coneY, cylinderY, sheet.cylinder);
    return {
      x: lerp(flatX, foldedX, sheet.fold),
      y: lerp(flatY, foldedY, sheet.fold),
    };
  }

  function geometryStripColor(angular, depth, fold) {
    const value = Math.cos(Math.PI * angular + GEOMETRY_PROFILE_PHASE);
    const alpha = .2 + .1 * Math.abs(value) + .055 * fold * Math.max(0, depth);
    return value >= 0
      ? `rgba(160,0,0,${alpha})`
      : `rgba(7,87,96,${alpha + .015})`;
  }

  function drawGeometrySheet(context, sheet, options = {}) {
    const opacity = options.opacity ?? 1;
    if (opacity <= .0001) return;
    const seamOpacity = options.seamOpacity ?? 1;
    const stripCount = 40;
    const strips = [];
    for (let index = 0; index < stripCount; index++) {
      const a0 = -1 + 2 * index / stripCount;
      const a1 = -1 + 2 * (index + 1) / stripCount;
      strips.push({ a0, a1, depth: Math.cos(Math.PI * (a0 + a1) / 2) });
    }
    strips.sort((left, right) => left.depth - right.depth);

    context.save();
    context.globalAlpha *= opacity;
    strips.forEach((strip) => {
      const p00 = geometrySheetPoint(sheet, sheet.radialStart, strip.a0);
      const p10 = geometrySheetPoint(sheet, 1, strip.a0);
      const p11 = geometrySheetPoint(sheet, 1, strip.a1);
      const p01 = geometrySheetPoint(sheet, sheet.radialStart, strip.a1);
      context.beginPath();
      context.moveTo(p00.x, p00.y); context.lineTo(p10.x, p10.y);
      context.lineTo(p11.x, p11.y); context.lineTo(p01.x, p01.y);
      context.closePath();
      context.fillStyle = geometryStripColor((strip.a0 + strip.a1) / 2, strip.depth, sheet.fold);
      context.fill();
    });

    for (let index = 1; index < 12; index++) {
      const angular = -1 + 2 * index / 12;
      const start = geometrySheetPoint(sheet, sheet.radialStart, angular);
      const end = geometrySheetPoint(sheet, 1, angular);
      context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y);
      context.strokeStyle = index % 2 ? colors.grid : "rgba(7,87,96,.28)";
      context.lineWidth = .8; context.stroke();
    }

    for (let radialIndex = 1; radialIndex <= 7; radialIndex++) {
      const radial = lerp(sheet.radialStart, 1, radialIndex / 7);
      context.beginPath();
      for (let index = 0; index <= 160; index++) {
        const point = geometrySheetPoint(sheet, radial, -1 + 2 * index / 160);
        if (!index) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
      }
      context.strokeStyle = radialIndex % 2 ? "rgba(160,0,0,.28)" : colors.grid;
      context.lineWidth = radialIndex === 7 ? 1.25 : .8; context.stroke();
    }

    if (sheet.wave > .001) {
      context.beginPath();
      for (let index = 0; index <= 280; index++) {
        const point = geometrySheetPoint(sheet, 1, -1 + 2 * index / 280, false);
        if (!index) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
      }
      context.strokeStyle = `rgba(7,87,96,${.7 * sheet.wave})`;
      context.setLineDash([4, 5]); context.lineWidth = 1.2; context.stroke(); context.setLineDash([]);
    }

    context.beginPath();
    for (let index = 0; index <= 400; index++) {
      const point = geometrySheetPoint(sheet, 1, -1 + 2 * index / 400);
      if (!index) context.moveTo(point.x, point.y); else context.lineTo(point.x, point.y);
    }
    context.strokeStyle = colors.paper; context.lineWidth = 2.4;
    context.shadowColor = sheet.wave > .001 ? colors.orange : colors.cyan;
    context.shadowBlur = 7; context.stroke(); context.shadowBlur = 0;

    if (seamOpacity > .001) {
      [-1, 1].forEach((angular) => {
        const start = geometrySheetPoint(sheet, sheet.radialStart, angular);
        const end = geometrySheetPoint(sheet, 1, angular);
        context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y);
        context.strokeStyle = `rgba(7,87,96,${seamOpacity})`;
        context.lineWidth = 2.2; context.stroke();
      });
    }
    context.restore();
  }

  function drawFoldingSector(context, width, height, amount) {
    const t = Math.max(0, Math.min(1, amount));
    const zoom = ease(t / .5);
    const discard = ease((t - .3) / .25);
    const materialOpacity = ease((t - .12) / .2);
    const fold = ease((t - .55) / .45);
    const fullDiskRadius = Math.min(width * .27, height * .34);
    const diskCx = lerp(geometryVisualCenter(width), width * GEOMETRY_TRAJECTORY.coneTip, zoom);
    const diskRadius = lerp(fullDiskRadius, width * .68, zoom);
    const targetHalf = Math.min(118, height * .23);

    if (discard < .999) {
      drawNfoldDisk(context, width, height, {
        cx: diskCx,
        cy: height * .54,
        radius: diskRadius,
        selection: 1,
        divisions: 1,
        opacity: 1 - discard,
        showCaption: false,
      });
    }

    const sheet = geometrySheetState(width, height, {
      tip: diskCx,
      right: diskCx + diskRadius,
      // Until folding begins this is exactly the selected disk sector: the
      // same centre, radius, and opening angle.  The display ellipse is made
      // taller only while the material sector is folded into the cone.
      half: lerp(diskRadius * Math.sin(Math.PI / 28), targetHalf, fold),
      flatOpening: Math.PI / 28,
      fold,
      order: 28,
    });
    drawGeometrySheet(context, sheet, { opacity: materialOpacity });
  }

  /* Subsection 4.1 reuses the section 2 unfolding verbatim, run backwards, so
     that the fold is the same movement as the lift-to-the-plane stage rather
     than a second drawing of it.  At progress 0 the twenty-eight copies are
     fanned out into the perturbed planar domain; at progress 1 they are folded
     back into the single perturbed cone.  drawUnfolding carries wave: 1
     throughout, so the boundary ripple is one material profile all the way and
     the cone is perturbed exactly where the domain is. */
  const coneFoldState = { progress: 0, playing: false, frame: null };
  const coneFoldCaptions = [
    "The R-fold symmetric planar domain.",
    "One fundamental sector.",
    "The sector rolls up.",
    "The cone, with its perturbed boundary.",
  ];

  /* The 4.1 figure: a cone opens into the flat sector it is isometric to, and
     nothing else.  The rim carries a mode-one perturbation, so the cone is a
     tilted one -- the axis no longer meets the base circle at its centre --
     which is what section 2 does when it returns from the cylinder.  The
     unfolded picture is a circular sector of the same slant length; the mode
     one shows there as a rim that is not a circular arc. */
  /* The 4.1 figure follows section 2's construction: the R-fold symmetric
     planar domain, then one fundamental sector, then that sector folded into
     the cone whose sides it becomes.  CONE_FOLD_SECTORS is the displayed fold
     count, far below the true R = 28, which could not be told apart on this
     canvas.  CONE_FOLD_MODE is the frequency of the boundary profile: a
     mode-one h is very nearly a rigid tilt of the base and reads as an
     unperturbed cone, so the profile carries three periods per sector. */
  const CONE_FOLD_SECTORS = 6;
  /* Mode three dominates, but a pure mode three repeats three times inside each
     sector and the planar domain then looks eighteen-fold rather than six-fold.
     Smaller first and second harmonics break that: the profile still closes up
     across the sector, so the domain keeps exactly the R-fold symmetry it is
     supposed to have and no more. */
  const CONE_FOLD_HARMONICS = [.018, .025, .040];

  function drawConeUnfold(context, width, height, progress) {
    const p = Math.max(0, Math.min(1, progress));
    const select1 = ease(Math.min(1, p / .34));
    const fold = ease(Math.max(0, (p - .34) / .66));
    const cy = height * .50;

    // The legend sits over the left of the canvas; section 2 clears it with the
    // --geometry-key-width token.  Read it from this figure's own laboratory,
    // not the first one in the document.
    const laboratory = select("#coneFoldCanvasWrap")?.closest(".geometry-laboratory");
    const keyToken = laboratory
      ? parseFloat(getComputedStyle(laboratory).getPropertyValue("--geometry-key-width")) / 100
      : 0;
    const keyFraction = Number.isFinite(keyToken) ? Math.max(0, Math.min(.45, keyToken)) : 0;
    const left = width * keyFraction + 16;
    const available = width - left;

    /* The whole domain needs room on both sides of its centre; the cone needs
       room on one.  The camera moves in on its own schedule, finishing before
       the fold starts, so the chosen sector is already recentred and full size
       by the time it is the only thing on the canvas.  Tying this to `fold`
       left the sector stage small and stranded on the right. */
    const camera = ease(Math.max(0, Math.min(1, (p - .12) / .28)));
    const domainRadius = Math.min(available * .46, height * .44);
    // Viewing further round the axis widens the rim, so the cone reaches about
    // 1.33 slants across; size it to fit that, not the slant alone.
    const coneSlant = Math.min(available * .70, height * .88);
    const slant = lerp(domainRadius, coneSlant, camera);
    const apexX = lerp(left + available / 2, left + 4, camera);

    const halfSector = Math.PI / CONE_FOLD_SECTORS;
    /* The profile moves the rim along the generators, which is mostly an axial
       motion, so at a near side-on view its excursion outruns the foreshortened
       width of the rim and the curve folds over itself.  Viewing further round
       the axis widens the rim enough for three periods to read as a wobble:
       dx/dtheta then changes sign twice, a clean left-to-right sweep, where at
       0.085 it changed sign six times. */
    const depth = Math.max(10, slant * .26);
    const coneHalf = slant * .40;

    // h(psi) = sum_k a_k cos(k psi), with psi = pi * angular running once around
    // the cone across the sector.  Every term is even and 2pi-periodic in psi,
    // so the two straight edges still agree and the sector closes up.
    const profile = (angular) => 1 - CONE_FOLD_HARMONICS.reduce(
      (total, amplitude, index) => total + amplitude * Math.cos((index + 1) * Math.PI * angular), 0);

    const point = (radial, angular, sectorCentre, deformed = true) => {
      const theta = Math.PI * angular;
      const u = radial * (deformed ? profile(angular) : 1);
      const flatAngle = sectorCentre + halfSector * angular;
      const flatX = apexX + u * slant * Math.cos(flatAngle);
      const flatY = cy + u * slant * Math.sin(flatAngle);
      // Oblique projection: the depth axis contributes sin(theta) to x, the
      // profile contributes through u, so a circle in space reads as a narrow
      // ellipse rather than a circle.
      const coneX = apexX + u * slant + u * depth * Math.sin(theta);
      const coneY = cy + u * coneHalf * Math.cos(theta);
      return { x: lerp(flatX, coneX, fold), y: lerp(flatY, coneY, fold) };
    };

    const strips = [];
    const stripCount = 44;
    for (let i = 0; i < stripCount; i++) {
      const a0 = -1 + 2 * i / stripCount;
      const a1 = -1 + 2 * (i + 1) / stripCount;
      strips.push({ a0, a1, depth: Math.cos(Math.PI * (a0 + a1) / 2) });
    }

    const drawSector = (centre, opacity, chosen) => {
      if (opacity <= .004) return;
      context.save();
      context.globalAlpha = opacity;
      // Painter's algorithm: once folded, the far side of the cone has to go
      // down first or the surface reads as a flat shape.
      const ordered = fold > .01 ? [...strips].sort((l, r) => l.depth - r.depth) : strips;
      ordered.forEach((strip) => {
        const q0 = point(0, strip.a0, centre), q1 = point(1, strip.a0, centre);
        const q2 = point(1, strip.a1, centre), q3 = point(0, strip.a1, centre);
        context.beginPath();
        context.moveTo(q0.x, q0.y); context.lineTo(q1.x, q1.y);
        context.lineTo(q2.x, q2.y); context.lineTo(q3.x, q3.y);
        context.closePath();
        const lit = .15 + .16 * fold * (1 - strip.depth) / 2 + (chosen ? .10 : .02);
        context.fillStyle = `rgba(7,87,96,${lit.toFixed(3)})`;
        context.fill();
      });

      if (chosen) {
        for (let i = 1; i < 10; i++) {
          const angular = -1 + 2 * i / 10;
          const a = point(0, angular, centre), b = point(1, angular, centre);
          context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y);
          context.strokeStyle = colors.grid; context.lineWidth = .7; context.stroke();
        }
        for (let ring = 1; ring <= 5; ring++) {
          context.beginPath();
          for (let i = 0; i <= 150; i++) {
            const q = point(ring / 5, -1 + 2 * i / 150, centre);
            if (!i) context.moveTo(q.x, q.y); else context.lineTo(q.x, q.y);
          }
          context.strokeStyle = colors.grid; context.lineWidth = .7; context.stroke();
        }
        // The unperturbed rim, so the mode reads as a departure from a circle.
        context.beginPath();
        for (let i = 0; i <= 220; i++) {
          const q = point(1, -1 + 2 * i / 220, centre, false);
          if (!i) context.moveTo(q.x, q.y); else context.lineTo(q.x, q.y);
        }
        context.strokeStyle = "rgba(7,87,96,.55)";
        context.setLineDash([4, 5]); context.lineWidth = 1.1;
        context.stroke(); context.setLineDash([]);
      }

      context.beginPath();
      for (let i = 0; i <= 320; i++) {
        const q = point(1, -1 + 2 * i / 320, centre);
        if (!i) context.moveTo(q.x, q.y); else context.lineTo(q.x, q.y);
      }
      context.strokeStyle = colors.paper;
      context.lineWidth = chosen ? 2.2 : 1.1;
      if (chosen) { context.shadowColor = colors.orange; context.shadowBlur = 7; }
      context.stroke(); context.shadowBlur = 0;

      // The two edges that become the seam once the sector closes up.  Folded,
      // the seam is on the far side and should recede.
      [-1, 1].forEach((angular) => {
        const a = point(0, angular, centre), b = point(1, angular, centre);
        context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y);
        context.strokeStyle = chosen ? colors.paper : colors.grid;
        context.globalAlpha = opacity * (chosen ? .12 + .62 * (1 - fold) : .5);
        context.lineWidth = chosen ? 1.5 : .8;
        context.stroke();
        context.globalAlpha = opacity;
      });
      context.restore();
    };

    for (let k = 0; k < CONE_FOLD_SECTORS; k++) {
      if (k === 0) continue;
      const opacity = (1 - select1) * (1 - fold);
      drawSector(k * 2 * halfSector, opacity, false);
    }
    drawSector(0, 1, true);

    context.beginPath();
    context.arc(apexX, cy, 3, 0, TAU);
    context.fillStyle = colors.paper; context.fill();
  }

  /* The Crandall-Rabinowitz box reads either as the classical theorem or as the
     quantitative one; the quantitative clauses are the same DOM, shown or
     hidden.  Null-guarded: story.js is shared with the paper edition, which
     does not carry this markup. */
  function bindCrandallRabinowitz() {
    document.querySelectorAll(".cr-statement").forEach((statement) => {
      const buttons = statement.querySelectorAll("[data-cr-variant]");
      if (!buttons.length) return;
      const choose = (variant) => {
        statement.dataset.variant = variant;
        buttons.forEach((button) => {
          button.setAttribute("aria-pressed", String(button.dataset.crVariant === variant));
        });
      };
      buttons.forEach((button) => {
        button.addEventListener("click", () => choose(button.dataset.crVariant));
      });
      choose(statement.dataset.variant || "classical");
    });
  }

  bindCrandallRabinowitz();

  function renderConeFold() {
    if (!select("#coneFoldCanvasWrap")) return;
    const { canvas, context, width, height } = canvasMetrics("#coneFoldCanvas", "#coneFoldCanvasWrap", 420);
    context.clearRect(0, 0, width, height);
    context.fillStyle = colors.ink; context.fillRect(0, 0, width, height);
    /* Section 2's stage is scaled for its own canvas: its centre is offset by
       the --geometry-key-width token and its radius is clamped against that
       canvas's height, so borrowing it here showed only a fraction of the
       figure.  This draws the same unfolding, sized to this canvas. */
    drawConeUnfold(context, width, height, Math.max(0, Math.min(1, coneFoldState.progress)));
    const active = coneFoldStage();
    const value = select("#coneFoldValue");
    const stageLabel = `stage ${active + 1}`;
    if (value && value.textContent !== stageLabel) value.textContent = stageLabel;
    select("#coneFoldRange")?.setAttribute("aria-valuetext", `${stageLabel}: ${coneFoldCaptions[active]}`);
    document.querySelectorAll("[data-conefold-stage]").forEach((button, index) => {
      button.classList.toggle("active", index === active);
      button.setAttribute("aria-pressed", String(index === active));
    });
    canvas.setAttribute("aria-label", `Folding stage ${active + 1} of 4: ${coneFoldCaptions[active]}`);
  }

  function coneFoldStage() {
    const scaled = Math.max(0, Math.min(1, coneFoldState.progress)) * 3;
    const segment = Math.min(2, Math.floor(scaled));
    const local = scaled - segment;
    if (coneFoldState.progress >= .999) return 3;
    if (coneFoldState.progress <= .001) return 0;
    return local < .01 ? segment : Math.min(3, segment + 1);
  }

  function stopConeFold() {
    coneFoldState.playing = false;
    if (coneFoldState.frame) cancelAnimationFrame(coneFoldState.frame);
    coneFoldState.frame = null;
    const icon = select("#coneFoldPlayIcon"); const label = select("#coneFoldPlayLabel");
    if (icon) icon.textContent = "\u25B6";
    if (label) label.textContent = coneFoldState.progress > .999 ? "Unfold" : "Fold";
    select("#coneFoldPlayButton")?.setAttribute("aria-pressed", "false");
  }

  function animateConeFoldTo(target, speed = 6000) {
    const destination = Math.max(0, Math.min(1, target));
    stopConeFold();
    const range = select("#coneFoldRange");
    const startProgress = coneFoldState.progress;
    const distance = Math.abs(destination - startProgress);
    if (distance < .0005) {
      coneFoldState.progress = destination;
      if (range) { range.value = destination; fillRange(range); }
      renderConeFold();
      return;
    }
    coneFoldState.playing = true;
    const icon = select("#coneFoldPlayIcon"); const label = select("#coneFoldPlayLabel");
    if (icon) icon.textContent = "\u2161";
    if (label) label.textContent = "Pause";
    select("#coneFoldPlayButton")?.setAttribute("aria-pressed", "true");
    const start = performance.now();
    const duration = Math.max(420, speed * distance);
    const tick = (now) => {
      if (!coneFoldState.playing) return;
      const amount = Math.min(1, (now - start) / duration);
      coneFoldState.progress = lerp(startProgress, destination, ease(amount));
      if (range) { range.value = coneFoldState.progress; fillRange(range); }
      renderConeFold();
      if (amount >= 1) {
        coneFoldState.progress = destination;
        stopConeFold();
        renderConeFold();
        return;
      }
      coneFoldState.frame = requestAnimationFrame(tick);
    };
    coneFoldState.frame = requestAnimationFrame(tick);
  }

  function playConeFold() {
    if (coneFoldState.playing) { stopConeFold(); return; }
    animateConeFoldTo(coneFoldState.progress > .999 ? 0 : 1);
  }

  function drawConeCylinder(context, width, height, cylinderAmount, waveAmount, returning = false) {
    const t = ease(cylinderAmount);
    /* At the cylindrical endpoint the cone point has genuinely gone past the
       viewport.  The surface is an exact cylinder whose left end is clipped
       behind the stage key, rather than a long finite cone squeezed into the
       drawing. */
    const tip = lerp(width * GEOMETRY_TRAJECTORY.coneTip, width * GEOMETRY_TRAJECTORY.cylinderLeft, t);
    const right = lerp(width * GEOMETRY_TRAJECTORY.coneRight, width * GEOMETRY_TRAJECTORY.cylinderRight, t);
    const axisLeft = width * GEOMETRY_TRAJECTORY.cylinderLeft;
    const sheet = geometrySheetState(width, height, {
      tip,
      right,
      surfaceLeft: lerp(tip, axisLeft, t),
      half: Math.min(118, height * .23),
      fold: 1,
      cylinder: t,
      axisLeft,
      wave: waveAmount,
    });
    drawGeometrySheet(context, sheet);

  }

  function drawSectorFan(context, sheet, amount) {
    const fan = ease(amount);
    const copies = 28;
    const seamOpacity = 1 - ease((fan - .72) / .28);
    const halfOpening = Math.PI / copies;

    // Copy zero remains fixed.  The adjacent material sectors unfold in
    // order, two at a time, and every active copy moves as one rigid piece.
    // In particular its boundary profile never slides through the sector.
    drawGeometrySheet(context, sheet, { seamOpacity });
    const sequentialProgress = fan * 14;
    for (let distance = 1; distance <= 14; distance++) {
      const local = Math.max(0, Math.min(1, sequentialProgress - (distance - 1)));
      if (local <= .0001) continue;
      const travel = ease(local);
      const opacity = ease(local / .16);
      const sides = distance === 14 ? [1] : [-1, 1];
      sides.forEach((side) => {
        // The new copy begins on top of the preceding copy and rotates through
        // one sector angle until the two radial sides agree.
        const rotation = side * 2 * halfOpening * (distance - 1 + travel);
        context.save();
        context.translate(sheet.tip, sheet.cy);
        context.rotate(rotation);
        context.translate(-sheet.tip, -sheet.cy);
        drawGeometrySheet(context, sheet, { opacity, seamOpacity });
        context.restore();
      });
    }

    const outlineOpacity = ease((fan - .82) / .18);
    if (outlineOpacity > .001) {
      const radius = sheet.length;
      context.save(); context.globalAlpha *= outlineOpacity;
      context.beginPath();
      for (let index = 0; index <= 1200; index++) {
        const angle = index / 1200 * TAU;
        const psi = copies * angle + GEOMETRY_PROFILE_PHASE;
        const localRadius = radius * (1 - landingWall(psi) / 28);
        const x = sheet.tip + localRadius * Math.cos(angle);
        const y = sheet.cy + localRadius * Math.sin(angle);
        if (!index) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath(); context.strokeStyle = colors.paper; context.lineWidth = 2.2;
      context.shadowColor = colors.orange; context.shadowBlur = 6; context.stroke();
      context.restore();
    }
  }

  function drawUnfolding(context, width, height, amount) {
    const t = Math.max(0, Math.min(1, amount));
    const open = ease(t / .30);
    const transfer = ease((t - .28) / .20);
    const fan = ease((t - .50) / .50);
    const finalRadius = Math.min(width * .27, height * .34);
    const initialTip = width * GEOMETRY_TRAJECTORY.coneTip;
    const initialRight = width * GEOMETRY_TRAJECTORY.coneRight;
    const tip = lerp(initialTip, geometryVisualCenter(width), transfer);
    const length = lerp(initialRight - initialTip, finalRadius, transfer);
    const half = lerp(Math.min(118, height * .23), finalRadius * Math.sin(Math.PI / 28), transfer);
    const initialOpening = Math.atan2(Math.min(118, height * .23), initialRight - initialTip);
    const sheet = geometrySheetState(width, height, {
      tip,
      right: tip + length,
      half,
      fold: 1 - open,
      flatOpening: lerp(initialOpening, Math.PI / 28, transfer),
      wave: 1,
      // This is the same R = 28 material sector throughout; transfer changes
      // only the camera-scale embedding before its planar copies are opened.
      order: 28,
    });

    if (fan > .0001) drawSectorFan(context, sheet, fan);
    else drawGeometrySheet(context, sheet);
  }

  function drawGeometrySequence(context, width, height, progress) {
    const scaled = Math.max(0, Math.min(1, progress)) * 6;
    const segment = Math.min(5, Math.floor(scaled));
    const local = scaled - segment;
    if (segment === 0) drawNfoldDisk(context, width, height, { cx: geometryVisualCenter(width), selection: ease(local), divisions: 1, showCaption: false });
    else if (segment === 1) drawFoldingSector(context, width, height, local);
    else if (segment === 2) drawConeCylinder(context, width, height, local, 0);
    // The cylinder is the large-order comparison, not the domain on which the
    // proof bifurcates. Return to a finite real-R collar before growing the
    // boundary wave, then continue that finite-R branch to integer order.
    else if (segment === 3) drawConeCylinder(context, width, height, 1 - ease(local), .2 * ease(local), true);
    else if (segment === 4) drawConeCylinder(context, width, height, 0, .2 + .8 * ease(local), true);
    else drawUnfolding(context, width, height, local);
  }

  function drawCollarFrame(context, width, height, opacity) {
    context.save();
    context.globalAlpha = opacity;
    drawFrameLabel(context, width, "03 / finite-R bifurcation", "Bifurcate on the finite real-order collar", "half-cylinder supplies the limiting comparison");
    const plot = { left: width * .12, top: height * .22, width: width * .76, height: height * .6 };
    roundedPanel(context, plot.left, plot.top, plot.width, plot.height);
    context.fillStyle = visualTheme.backgroundAlt; context.fill();
    const bands = 90;
    for (let index = 0; index < bands; index++) {
      const y = plot.top + index / bands * plot.height;
      const psi = Math.PI - (index + .5) / bands * TAU;
      const wave = Math.sin(1.53 * -3.2 + .8 * Math.cos(psi));
      context.fillStyle = wave > 0 ? `rgba(160,0,0,${.08 + .15 * wave})` : `rgba(7,87,96,${.08 - .14 * wave})`;
      context.fillRect(plot.left, y, plot.width, plot.height / bands + 1);
    }
    context.strokeStyle = colors.grid; context.setLineDash([4, 6]);
    for (let index = 1; index < 5; index++) {
      const x = plot.left + index / 5 * plot.width;
      context.beginPath(); context.moveTo(x, plot.top); context.lineTo(x, plot.top + plot.height); context.stroke();
    }
    context.setLineDash([]);
    context.beginPath();
    for (let index = 0; index <= 260; index++) {
      const psi = Math.PI - index / 260 * TAU;
      const y = plot.top + index / 260 * plot.height;
      const x = plot.left + plot.width * .88 - landingWall(psi) * plot.width * .065;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.strokeStyle = colors.paper; context.lineWidth = 2.3;
    context.shadowColor = colors.orange; context.shadowBlur = 7; context.stroke(); context.shadowBlur = 0;
    context.fillStyle = colors.faint; context.font = visualTheme.labelFont;
    context.fillText("x = −5", plot.left, plot.top + plot.height + 19);
    context.textAlign = "right"; context.fillText("moving boundary", plot.left + plot.width, plot.top + plot.height + 19);
    context.restore();
  }

  function drawLandingFrame(context, width, height, opacity) {
    context.save();
    context.globalAlpha = opacity;
    drawFrameLabel(context, width, "04 / planar lift", "Twenty-eight sectors fit exactly", "R = N = 28");
    const radius = Math.min(width * .29, height * .36);
    const cx = width * .5;
    const cy = height * .55;
    const gradient = context.createRadialGradient(cx, cy, radius * .1, cx, cy, radius);
    gradient.addColorStop(0, "#d34f46"); gradient.addColorStop(.45, "#ded6bc"); gradient.addColorStop(1, "#2f777e");
    context.beginPath();
    for (let index = 0; index <= 1400; index++) {
      const angle = index / 1400 * TAU;
      const psi = 28 * angle;
      const physicalRadius = radius * (1 - landingWall(psi + GEOMETRY_PROFILE_PHASE) / 28);
      const x = cx + physicalRadius * Math.cos(angle);
      const y = cy + physicalRadius * Math.sin(angle);
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    }
    context.closePath(); context.fillStyle = gradient; context.fill();
    context.strokeStyle = colors.paper; context.lineWidth = 2; context.shadowColor = colors.orange; context.shadowBlur = 6; context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = colors.orange; context.font = visualTheme.labelFont; context.textAlign = "center";
    context.fillText("continued boundary coefficients at integral order", cx, cy + radius + 30);
    context.restore();
  }

  const geometryState = { progress: 0, playing: false, frame: null };
  const geometryNames = ["start with rotational symmetry", "choose one fundamental sector", "identify the radial sides", "inspect the large-order limit", "read the limiting mechanism", "bifurcate at finite real order", "close at an integer and lift to the plane"];
  const geometryStates = ["the field is repeated around the disk", "one fundamental sector in rescaled coordinates", "identifying the radial sides gives the cone quotient", "a fixed boundary collar converges to the half-cylinder", "the half-cylinder reveals the limiting modes and scale", "the branch is constructed on the finite real-order collar", "the sectors fit exactly in the plane"];
  const geometryCaptions = ["the same angular profile repeats N times", "follow one material sector", "the radial sides meet along the quotient seam", "this is the limiting comparison, not a nonlinear transfer step", "the illustrative rim displays the limiting deformation", "direct finite-order estimates control the deformed cone", "adjacent copies open in order; each boundary profile stays on its sector"];

  function drawGeometryNarrative() {}

  function renderGeometryMath(width, height, progress) {
    const order = select("#storyGeometryOrderFormula");
    const orderExpression = order?.querySelector(".geometry-math-expression");
    const orderNote = order?.querySelector("small");
    const wall = select("#storyGeometryWallFormula");
    const lift = select("#storyGeometryLiftFormula");
    if (!order || !orderExpression || !orderNote || !wall || !lift) return;

    order.style.opacity = "0";
    wall.style.opacity = "0";
    lift.style.opacity = "0";

    // These positions use the canvas width, so their alignment must use the
    // same breakpoint instead of a viewport-width media query.
    const compact = width < 620;
    order.style.transform = compact ? "none" : "translateX(-50%)";

    const scaled = Math.max(0, Math.min(1, progress)) * 6;
    const segment = Math.min(5, Math.floor(scaled));
    const local = scaled - segment;
    let cylinderAmount = null;
    let waveAmount = 0;
    let returning = false;
    if (segment === 2) cylinderAmount = local;
    if (segment === 3) { cylinderAmount = 1 - ease(local); waveAmount = .2 * ease(local); returning = true; }
    if (segment === 4) { cylinderAmount = 0; waveAmount = .2 + .8 * ease(local); returning = true; }

    const overlayHalf = Math.min(118, height * .23);
    const unclampedOrderY = height * .54 - overlayHalf - (compact ? 62 : 41);
    const overlayOrderY = compact ? Math.max(8, unclampedOrderY) : unclampedOrderY;

    if (cylinderAmount !== null) {
      const t = ease(cylinderAmount);
      const surfaceLeft = lerp(width * GEOMETRY_TRAJECTORY.coneTip, width * GEOMETRY_TRAJECTORY.cylinderLeft, t);
      const sheetOrder = 28 / Math.max(.035, 1 - t);
      const orderOpacity = ease(t / .12);
      const orderX = compact ? 24 : width * .08 + 92;
      const orderY = overlayOrderY;
      setFormula(orderExpression, t > .965 ? "R\\to\\infty" : `R\\approx ${Math.round(sheetOrder)}`, { serif: true });
      orderNote.textContent = t > .965 ? "half-cylinder limit" : returning ? "R decreases" : "R increases";
      order.style.left = `${orderX}px`;
      order.style.top = `${orderY}px`;
      order.style.opacity = String(orderOpacity);

      const wallOpacity = ease((waveAmount - .12) / .28) * (segment === 4 ? 1 : ease(t / .15));
      const wallX = compact ? 24 : Math.max(surfaceLeft + 100, width * GEOMETRY_TRAJECTORY.coneRight - 330);
      // Keep the wall formula on a distinct row. The order label can wrap on
      // compact canvases, while the desktop labels previously shared a row.
      const wallY = orderY + (compact ? 38 : 28);
      setFormula(wall, "x=h_s(\\psi)=s\\cos(\\psi-\\phi)+O(s^2)", { serif: true });
      wall.style.left = `${wallX}px`;
      wall.style.top = `${wallY}px`;
      wall.style.opacity = String(wallOpacity);
    }

    if (segment === 4) {
      setFormula(orderExpression, "R=R(s)\\in\\mathbb R,\\qquad R(s)\\to28", { serif: true });
      orderNote.textContent = "finite real-order collar bifurcation";
      order.style.left = `${compact ? 24 : width * .08 + 92}px`;
      order.style.top = `${overlayOrderY}px`;
      order.style.opacity = "1";
    }

    if (segment === 5) {
      setFormula(lift, "R=N=28", { serif: true });
      lift.style.opacity = String(ease((local - .55) / .45));
    }
  }

  function renderGeometryStory() {
    const { canvas, context, width, height } = canvasMetrics("#storyGeometryCanvas", "#storyGeometryCanvasWrap", 650);
    context.clearRect(0, 0, width, height);
    context.fillStyle = colors.ink; context.fillRect(0, 0, width, height);
    drawGeometrySequence(context, width, height, geometryState.progress);
    drawGeometryNarrative(context, width, height, geometryState.progress);
    renderGeometryMath(width, height, geometryState.progress);
    const scaled = Math.max(0, Math.min(1, geometryState.progress)) * 6;
    const segment = Math.min(5, Math.floor(scaled));
    const local = scaled - segment;
    const active = geometryState.progress >= .999
      ? 6
      : geometryState.progress <= .001
        ? 0
        : local < .01
          ? segment
          : Math.min(6, segment + 1);
    const stageValue = select("#storyGeometryValue");
    const stageNote = select("#storyGeometryState");
    const stageLabel = `stage ${active + 1}`;
    if (stageValue && stageValue.textContent !== stageLabel) stageValue.textContent = stageLabel;
    if (stageNote) stageNote.textContent = geometryCaptions[active];
    select("#storyGeometryRange")?.setAttribute("aria-valuetext", `${stageLabel}: ${geometryCaptions[active]}`);
    document.querySelectorAll("[data-story-stage]").forEach((button, index) => {
      button.classList.toggle("active", index === active);
      button.setAttribute("aria-pressed", String(index === active));
    });
    canvas.setAttribute("aria-label", `Construction stage ${active + 1} of 7: ${geometryStates[active]}. The sector and its boundary wave remain continuous through the entire construction.`);
  }

  function stopGeometryPlayback() {
    geometryState.playing = false;
    if (geometryState.frame) cancelAnimationFrame(geometryState.frame);
    geometryState.frame = null;
    select("#storyGeometryPlayIcon").textContent = "▶";
    select("#storyGeometryPlayLabel").textContent = geometryState.progress > .999 ? "Repeat" : "Animate";
    select("#storyGeometryPlayButton").setAttribute("aria-pressed", "false");
  }

  function playGeometryStory() {
    if (geometryState.playing) { stopGeometryPlayback(); return; }
    if (geometryState.progress > .999) geometryState.progress = 0;
    geometryState.playing = true;
    select("#storyGeometryPlayIcon").textContent = "Ⅱ";
    select("#storyGeometryPlayLabel").textContent = "Pause";
    select("#storyGeometryPlayButton").setAttribute("aria-pressed", "true");
    const startProgress = geometryState.progress;
    const start = performance.now();
    const duration = Math.max(900, 12000 * (1 - startProgress));
    const tick = (now) => {
      if (!geometryState.playing) return;
      const amount = Math.min(1, (now - start) / duration);
      geometryState.progress = startProgress + (1 - startProgress) * amount;
      select("#storyGeometryRange").value = geometryState.progress;
      fillRange(select("#storyGeometryRange"));
      renderGeometryStory();
      if (amount >= 1) { stopGeometryPlayback(); return; }
      geometryState.frame = requestAnimationFrame(tick);
    };
    geometryState.frame = requestAnimationFrame(tick);
  }

  function animateGeometryTo(target) {
    const destination = Math.max(0, Math.min(1, target));
    stopGeometryPlayback();
    const startProgress = geometryState.progress;
    const distance = Math.abs(destination - startProgress);
    if (distance < .0005) {
      geometryState.progress = destination;
      geometryRange.value = destination;
      fillRange(geometryRange);
      renderGeometryStory();
      return;
    }
    geometryState.playing = true;
    select("#storyGeometryPlayIcon").textContent = "Ⅱ";
    select("#storyGeometryPlayLabel").textContent = "Pause";
    select("#storyGeometryPlayButton").setAttribute("aria-pressed", "true");
    const start = performance.now();
    const duration = Math.max(480, 9000 * distance);
    const tick = (now) => {
      if (!geometryState.playing) return;
      const amount = Math.min(1, (now - start) / duration);
      geometryState.progress = lerp(startProgress, destination, ease(amount));
      geometryRange.value = geometryState.progress;
      fillRange(geometryRange);
      renderGeometryStory();
      if (amount >= 1) {
        geometryState.progress = destination;
        stopGeometryPlayback();
        renderGeometryStory();
        return;
      }
      geometryState.frame = requestAnimationFrame(tick);
    };
    geometryState.frame = requestAnimationFrame(tick);
  }

  function xi(R) {
    return Math.sqrt(data.rho ** 2 - R ** 2) - R * Math.acos(R / data.rho) - Math.PI / 4;
  }

  function branchAt(progress) {
    const targetS = Math.max(0, Math.min(1, progress)) * data.landingS;
    const records = data.records;
    if (targetS <= records[0].s) return records[0];
    if (targetS >= last(records).s) return last(records);
    let upper = 1;
    while (records[upper].s < targetS) upper++;
    const left = records[upper - 1];
    const right = records[upper];
    const amount = (targetS - left.s) / (right.s - left.s);
    return {
      s: targetS,
      R: left.R + (right.R - left.R) * amount,
      lambda: left.lambda + (right.lambda - left.lambda) * amount,
    };
  }

  const phaseStoryState = { progress: 0 };
  const phaseFamilyState = { hoverIndex: -1, selectedIndex: -1, geometry: null };
  const phaseFamilyRMin = 6;
  const phaseFamilyRMax = 30;

  function cylinderLimitGamma(lambda) {
    return Math.sqrt((lambda - 1) * (4 - lambda))
      / (4 * Math.acos(1 / Math.sqrt(lambda)));
  }

  function phaseFamilyRows() {
    if (!crossingData || !crossingData.columns) return [];
    const rows = [];
    const columns = crossingData.columns;
    for (let index = 0; index < columns.R.length; index += 1) {
      const R = columns.R[index];
      if (R < phaseFamilyRMin) continue;
      if (R > phaseFamilyRMax) break;
      const rho = columns.rho[index];
      const lambda = (rho / R) ** 2;
      if (lambda < 2 || lambda > 3) continue;
      rows.push({ index, R, rho, lambda, gamma: cylinderLimitGamma(lambda), reference: false });
    }
    rows.sort((left, right) => left.R - right.R);
    return rows;
  }

  function phaseFamilySelectionText(row, index, total) {
    const integerPart = Math.floor(row.R);
    const integerGap = row.R - integerPart;
    const quadraticDrop = row.gamma / 2;
    const reachesInteger = integerGap > 0 && integerGap <= quadraticDrop;
    const landing = reachesInteger
      ? ` The quadratic approximation reaches integer order ${integerPart} at absolute branch parameter ${Math.sqrt(integerGap / quadraticDrop).toFixed(4)}.`
      : " This does not reach the next lower integer.";
    return `Crossing ${index + 1} of ${total}. Order ${row.R.toFixed(6)}; spectral ratio ${row.lambda.toFixed(4)}; unit-amplitude quadratic drop ${quadraticDrop.toFixed(4)}.${landing}`;
  }

  function ensurePhaseFamilyStatus(canvas) {
    const wrap = select("#phaseFamilyCanvasWrap");
    if (!canvas || !wrap) return null;
    let status = select("#phaseFamilyInteractionStatus");
    if (!status) {
      status = document.createElement("span");
      status.id = "phaseFamilyInteractionStatus";
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
      Object.assign(status.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: "0",
      });
      wrap.appendChild(status);
    }
    canvas.tabIndex = 0;
    canvas.style.touchAction = "pan-y pinch-zoom";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-roledescription", "interactive crossing plot");
    canvas.setAttribute("aria-describedby", status.id);
    canvas.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight Home End Escape");
    return status;
  }

  function renderPhaseFamily() {
    const canvas = select("#phaseFamilyCanvas");
    const wrap = select("#phaseFamilyCanvasWrap");
    if (!canvas || !wrap) return;
    const minimumHeight = window.innerWidth < 680 ? 520 : 390;
    const { context, width, height } = canvasMetrics("#phaseFamilyCanvas", "#phaseFamilyCanvasWrap", minimumHeight);
    const rows = phaseFamilyRows();
    if (phaseFamilyState.selectedIndex >= rows.length) phaseFamilyState.selectedIndex = -1;
    const activeIndex = phaseFamilyState.selectedIndex >= 0
      ? phaseFamilyState.selectedIndex
      : phaseFamilyState.hoverIndex;
    context.clearRect(0, 0, width, height);
    context.fillStyle = colors.ink;
    context.fillRect(0, 0, width, height);
    if (!rows.length) {
      context.fillStyle = colors.faint;
      context.font = visualTheme.labelFont;
      context.fillText("crossing data unavailable", 24, 34);
      return;
    }

    const compact = width < 680;
    const plot = {
      left: compact ? 46 : 66,
      top: compact ? 46 : 42,
      width: width - (compact ? 66 : 94),
      height: height - (compact ? 92 : 82),
    };
    const xMap = (R) => plot.left
      + (R - phaseFamilyRMin) / (phaseFamilyRMax - phaseFamilyRMin) * plot.width;
    const yMap = (s) => plot.top + (1 - (s + 1) / 2) * plot.height;
    const zeroY = yMap(0);

    context.save();
    context.strokeStyle = colors.grid;
    context.lineWidth = 1;
    for (let integer = phaseFamilyRMin; integer <= phaseFamilyRMax; integer += 1) {
      const x = xMap(integer);
      context.beginPath();
      context.moveTo(x, plot.top);
      context.lineTo(x, plot.top + plot.height);
      context.stroke();
    }
    [-1, -.5, .5, 1].forEach((s) => {
      context.beginPath();
      context.moveTo(plot.left, yMap(s));
      context.lineTo(plot.left + plot.width, yMap(s));
      context.stroke();
    });

    context.strokeStyle = visualTheme.lineStrong;
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(plot.left, zeroY);
    context.lineTo(plot.left + plot.width, zeroY);
    context.stroke();

    const labelEvery = compact ? 4 : 1;
    context.fillStyle = colors.faint;
    context.font = visualTheme.labelFont;
    context.textAlign = "center";
    context.textBaseline = "top";
    for (let integer = phaseFamilyRMin; integer <= phaseFamilyRMax; integer += 1) {
      const x = xMap(integer);
      const tick = integer % 5 === 0 ? 8 : 5;
      context.strokeStyle = integer % 5 === 0 ? colors.paper : visualTheme.muted;
      context.beginPath();
      context.moveTo(x, zeroY - tick);
      context.lineTo(x, zeroY + tick);
      context.stroke();
      if ((integer - phaseFamilyRMin) % labelEvery === 0) context.fillText(String(integer), x, zeroY + 12);
    }

    context.textAlign = "right";
    context.textBaseline = "middle";
    [-1, -.5, 0, .5, 1].forEach((s) => {
      context.fillText(s > 0 ? `+${s}` : String(s), plot.left - 11, yMap(s));
    });
    context.save();
    context.translate(15, plot.top + plot.height / 2);
    context.rotate(-Math.PI / 2);
    context.textAlign = "center";
    context.fillStyle = colors.orange;
    context.font = visualTheme.labelFont;
    context.fillText("BRANCH PARAMETER  s", 0, 0);
    context.restore();

    const pointGeometry = [];
    rows.forEach((row, rowIndex) => {
      const active = rowIndex === activeIndex;
      const integerGap = row.R - Math.floor(row.R);
      const predictedLanding = integerGap > 0 && integerGap <= row.gamma / 2;
      context.beginPath();
      const samples = 100;
      for (let sample = 0; sample <= samples; sample += 1) {
        const s = -1 + 2 * sample / samples;
        const predictedR = row.R - .5 * row.gamma * s * s;
        const x = xMap(predictedR);
        const y = yMap(s);
        if (sample === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = active || predictedLanding || row.reference ? colors.cyan : "rgba(7,87,96,.48)";
      context.lineWidth = active ? 2.8 : (row.reference ? 2.35 : (predictedLanding ? 2.1 : 1.25));
      context.stroke();

      if (predictedLanding) {
        const landingS = Math.sqrt(2 * integerGap / row.gamma);
        [-landingS, landingS].forEach((s) => {
          context.beginPath();
          context.arc(xMap(Math.floor(row.R)), yMap(s), 3.2, 0, TAU);
          context.fillStyle = colors.ink;
          context.fill();
          context.strokeStyle = colors.paper;
          context.lineWidth = 1.2;
          context.stroke();
        });
      }

      const point = { x: xMap(row.R), y: zeroY, row };
      pointGeometry.push(point);
      context.beginPath();
      context.arc(point.x, point.y, active ? 6.3 : (row.reference ? 5.4 : 4), 0, TAU);
      context.fillStyle = colors.orange;
      context.fill();
      context.strokeStyle = active || row.reference ? colors.paper : colors.ink;
      context.lineWidth = active ? 1.8 : (row.reference ? 1.5 : 1);
      context.stroke();

      if (row.reference && !compact && !paperEdition) {
        context.fillStyle = colors.paper;
        context.font = visualTheme.labelFont;
        context.textAlign = "center";
        context.textBaseline = "bottom";
        context.fillText("REFERENCE CROSSING", point.x, point.y - 11);
      }
    });

    if (!compact && !paperEdition) {
      context.fillStyle = colors.orange;
      context.font = visualTheme.labelFont;
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillText("COMMON-ZERO CROSSINGS AT THE BRANCH ORIGIN", plot.left + 8, zeroY - 29);
      context.fillStyle = colors.faint;
      context.fillText("each quadratic jet opens toward decreasing R", plot.left + 8, plot.top + 10);
      /* The jet is a local model.  Saying only that a ring is where it reaches
         an integer invites reading each ring as a counterexample; the rings are
         where the quadratic would land, which is what the proof then has to
         establish for genuinely small amplitude. */
      context.fillText("white rings mark where the quadratic model would reach an integer", plot.left + 8, plot.top + 26);
      context.fillText("extrapolated to |s| ≤ 1; the jet is only a small-amplitude approximation", plot.left + 8, plot.top + 42);
    }

    if (!paperEdition && activeIndex >= 0 && pointGeometry[activeIndex]) {
      const point = pointGeometry[activeIndex];
      const boxWidth = compact ? 174 : 205;
      const boxHeight = point.row.reference ? 82 : 66;
      const boxX = Math.min(Math.max(point.x + 12, plot.left + 4), plot.left + plot.width - boxWidth - 4);
      const boxY = point.y > plot.top + plot.height / 2
        ? point.y - boxHeight - 15
        : point.y + 15;
      context.fillStyle = colors.tooltip;
      context.fillRect(boxX, boxY, boxWidth, boxHeight);
      context.strokeStyle = "rgba(160,0,0,.7)";
      context.strokeRect(boxX + .5, boxY + .5, boxWidth - 1, boxHeight - 1);
      context.textAlign = "left";
      context.textBaseline = "top";
      context.fillStyle = colors.paper;
      context.font = visualTheme.labelFont;
      context.fillText(`order ${point.row.R.toFixed(6)}`, boxX + 10, boxY + 10);
      context.fillStyle = colors.faint;
      context.font = visualTheme.labelFont;
      context.fillText(`spectral ratio ${point.row.lambda.toFixed(4)}`, boxX + 10, boxY + 28);
      context.fillText(`unit-amplitude quadratic drop ${(point.row.gamma / 2).toFixed(4)}`, boxX + 10, boxY + 45);
      if (point.row.reference) {
        context.fillStyle = colors.orange;
        context.fillText("running example · separate spectral window", boxX + 10, boxY + 62);
      }
    }
    context.restore();

    phaseFamilyState.geometry = { pointGeometry, width, height };
    const windowRows = rows.filter((row) => !row.reference).length;
    const phaseFamilyLabel = paperEdition
      ? "Real-order crossing plot with integer fold symmetries, common-zero crossings at the branch origin, and predicted quadratic branch jets bending toward smaller real order."
      : `${windowRows} computed crossings with real order between 6 and 30 and spectral ratio between 2 and 3, together with the separately computed running example at order 28.026397. Every displayed quadratic branch jet bends toward smaller real order as the magnitude of s increases. Tap a point, or use the left and right arrow keys after focusing the plot, to inspect exact values.`;
    if (canvas.getAttribute("aria-label") !== phaseFamilyLabel) canvas.setAttribute("aria-label", phaseFamilyLabel);
  }

  function drawPhasePanel(context, rect, options) {
    context.save();
    context.fillStyle = colors.panel; roundedPanel(context, rect.left, rect.top, rect.width, rect.height); context.fill();
    if (!visualTheme.paperEdition) {
      context.strokeStyle = colors.grid;
      context.stroke();
    }
    const plot = { left: rect.left + 36, top: rect.top + 55, width: rect.width - 54, height: rect.height - 88 };
    context.strokeStyle = colors.grid; context.lineWidth = 1; context.setLineDash([3, 6]);
    for (let index = 0; index <= 4; index++) {
      const x = plot.left + index / 4 * plot.width;
      const y = plot.top + index / 4 * plot.height;
      context.beginPath(); context.moveTo(x, plot.top); context.lineTo(x, plot.top + plot.height); context.stroke();
      context.beginPath(); context.moveTo(plot.left, y); context.lineTo(plot.left + plot.width, y); context.stroke();
    }
    context.setLineDash([]);
    const xMap = (s) => plot.left + s / data.landingS * plot.width;
    const yMap = (value) => plot.top + (options.maximum - value) / options.maximum * plot.height;
    const draw = (points, color, dash, width) => {
      context.beginPath();
      points.forEach((point, index) => {
        const x = xMap(point.s); const y = yMap(point.value);
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.strokeStyle = color; context.lineWidth = width; context.setLineDash(dash); context.stroke(); context.setLineDash([]);
    };
    draw(options.quadratic, colors.orange, [7, 5], 1.5);
    draw(options.actual, colors.cyan, [], 2.2);
    const current = options.valueAt(branchAt(phaseStoryState.progress));
    const currentS = phaseStoryState.progress * data.landingS;
    context.beginPath(); context.arc(xMap(currentS), yMap(current), 5, 0, TAU);
    context.fillStyle = colors.orange; context.fill(); context.strokeStyle = colors.paper; context.lineWidth = 1.5; context.stroke();
    context.fillStyle = colors.paper; context.font = visualTheme.labelFont; context.fillText(options.title, rect.left + 14, rect.top + 21);
    context.fillStyle = colors.faint; context.font = visualTheme.labelFont;
    context.textAlign = "right"; context.fillText(options.maximumLabel, plot.left + plot.width, plot.top + 10);
    context.fillText("0", plot.left - 8, plot.top + plot.height); context.restore();
  }

  function renderPhaseStory() {
    const { canvas, context, width, height } = canvasMetrics("#phaseStoryCanvas", "#phaseStoryCanvasWrap", 390);
    context.clearRect(0, 0, width, height); context.fillStyle = colors.ink; context.fillRect(0, 0, width, height);
    const records = data.records;
    const baseXi = xi(data.RStar);
    const dropActual = records.map((record) => ({ s: record.s, value: data.RStar - record.R }));
    const phaseActual = records.map((record) => ({ s: record.s, value: (xi(record.R) - baseXi) * 180 / Math.PI }));
    const quadraticSamples = 180;
    const dropQuadratic = [];
    const phaseQuadratic = [];
    const xiPrime = -Math.acos(data.RStar / data.rho);
    for (let index = 0; index < quadraticSamples; index++) {
      const s = index / (quadraticSamples - 1) * data.landingS;
      const signedRChange = .5 * data.Rpp * s * s;
      dropQuadratic.push({ s, value: -signedRChange });
      phaseQuadratic.push({ s, value: xiPrime * signedRChange * 180 / Math.PI });
    }
    const compact = width < 680;
    const rects = compact
      ? [{ left: 12, top: 12, width: width - 24, height: (height - 36) / 2 }, { left: 12, top: 24 + (height - 36) / 2, width: width - 24, height: (height - 36) / 2 }]
      : [{ left: 14, top: 18, width: (width - 42) / 2, height: height - 36 }, { left: 28 + (width - 42) / 2, top: 18, width: (width - 42) / 2, height: height - 36 }];
    const maximumDrop = Math.max(...dropActual.map((point) => point.value)) * 1.08;
    const maximumPhase = Math.max(...phaseActual.map((point) => point.value)) * 1.08;
    drawPhasePanel(context, rects[0], { title: "ORDER DROP", subtitle: "R* − R(s)", actual: dropActual, quadratic: dropQuadratic, maximum: maximumDrop, maximumLabel: maximumDrop.toFixed(4), valueAt: (record) => data.RStar - record.R });
    drawPhasePanel(context, rects[1], { title: "LOCAL PHASE GAIN", subtitle: "ξ(R(s)) − ξ(R*)", actual: phaseActual, quadratic: phaseQuadratic, maximum: maximumPhase, maximumLabel: `${maximumPhase.toFixed(3)}°`, valueAt: (record) => (xi(record.R) - baseXi) * 180 / Math.PI });
    setCanvasFormula("#phaseStoryCanvasWrap", "phaseStoryOrderFormula", "R_*-R(s)", {
      left: rects[0].left + 14, top: rects[0].top + 27, color: colors.faint,
    });
    setCanvasFormula("#phaseStoryCanvasWrap", "phaseStoryXiFormula", "\\xi(R(s))-\\xi(R_*)", {
      left: rects[1].left + 14, top: rects[1].top + 27, color: colors.faint,
    });
    const current = branchAt(phaseStoryState.progress);
    const phaseDegrees = (xi(current.R) - baseXi) * 180 / Math.PI;
    canvas.setAttribute("aria-label", `At branch amplitude ${current.s.toFixed(4)}, the continued order has decreased to ${current.R.toFixed(6)} and the Debye collar phase has increased by ${phaseDegrees.toFixed(4)} degrees. Solid dark-teal curves use stored continuation records; dashed dark-red curves are their base quadratic laws.`);
  }

  function updatePhaseStory() {
    const current = branchAt(phaseStoryState.progress);
    const phaseDegrees = (xi(current.R) - xi(data.RStar)) * 180 / Math.PI;
    setMath("#phaseStorySValue", `s=${current.s.toFixed(4)}`);
    select("#phaseStoryRValue").textContent = current.R.toFixed(6);
    setMath("#phaseStoryPhaseValue", `${phaseDegrees.toFixed(4)}^{\\circ}`);
    select("#phaseStoryState").textContent = phaseStoryState.progress < .002 ? "quadratic variation from the crossing" : (phaseStoryState.progress > .998 ? "integral order reached" : `order decreased by ${(data.RStar - current.R).toFixed(5)}`);
    renderPhaseStory();
  }

  const geometryRange = select("#storyGeometryRange");
  fillRange(geometryRange);
  geometryRange?.setAttribute("aria-label", "Quotient construction stage");
  const geometryStageButtons = Array.from(document.querySelectorAll("[data-story-stage]"));
  geometryStageButtons[0]?.parentElement?.setAttribute("role", "group");
  select("#storyGeometryValue")?.setAttribute("aria-live", "polite");
  select("#storyGeometryValue")?.setAttribute("aria-atomic", "true");
  select("#storyGeometryPlayButton")?.setAttribute("aria-pressed", "false");
  geometryRange.addEventListener("input", (event) => {
    stopGeometryPlayback(); geometryState.progress = Number(event.target.value); fillRange(event.target); renderGeometryStory();
  });
  select("#storyGeometryPlayButton").addEventListener("click", playGeometryStory);
  select("#storyGeometryResetButton").addEventListener("click", () => {
    stopGeometryPlayback(); geometryState.progress = 0; geometryRange.value = 0; fillRange(geometryRange); renderGeometryStory();
  });
  geometryStageButtons.forEach((button) => button.addEventListener("click", () => {
    animateGeometryTo(Number(button.dataset.storyStage));
  }));

  const phaseRange = select("#phaseStoryRange");
  if (phaseRange) {
    fillRange(phaseRange);
    phaseRange.addEventListener("input", (event) => { phaseStoryState.progress = Number(event.target.value); fillRange(event.target); updatePhaseStory(); });
    select("#phaseStoryResetButton")?.addEventListener("click", () => { phaseStoryState.progress = 0; phaseRange.value = 0; fillRange(phaseRange); updatePhaseStory(); });
  }

  const phaseFamilyCanvas = select("#phaseFamilyCanvas");
  if (phaseFamilyCanvas) {
    const phaseFamilyStatus = ensurePhaseFamilyStatus(phaseFamilyCanvas);
    let phaseFamilyTouch = null;
    const nearestPhaseFamilyPoint = (event, threshold) => {
      if (!phaseFamilyState.geometry) return -1;
      const bounds = phaseFamilyCanvas.getBoundingClientRect();
      const x = (event.clientX - bounds.left) * phaseFamilyState.geometry.width / bounds.width;
      const y = (event.clientY - bounds.top) * phaseFamilyState.geometry.height / bounds.height;
      let nearest = -1;
      let nearestDistance = threshold;
      phaseFamilyState.geometry.pointGeometry.forEach((point, index) => {
        const distance = Math.hypot(point.x - x, point.y - y);
        if (distance < nearestDistance) { nearest = index; nearestDistance = distance; }
      });
      return nearest;
    };
    const selectPhaseFamilyPoint = (index, announce = true) => {
      const points = phaseFamilyState.geometry?.pointGeometry || [];
      if (!points.length) return;
      const selected = Math.max(0, Math.min(points.length - 1, index));
      phaseFamilyState.selectedIndex = selected;
      phaseFamilyState.hoverIndex = -1;
      renderPhaseFamily();
      const currentPoints = phaseFamilyState.geometry?.pointGeometry || points;
      if (announce && phaseFamilyStatus && currentPoints[selected]) {
        phaseFamilyStatus.textContent = phaseFamilySelectionText(currentPoints[selected].row, selected, currentPoints.length);
      }
    };

    phaseFamilyCanvas.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") {
        if (phaseFamilyTouch?.id === event.pointerId
          && Math.hypot(event.clientX - phaseFamilyTouch.x, event.clientY - phaseFamilyTouch.y) > 10) {
          phaseFamilyTouch.moved = true;
        }
        return;
      }
      if (phaseFamilyState.selectedIndex >= 0) return;
      const nearest = nearestPhaseFamilyPoint(event, 15);
      if (nearest !== phaseFamilyState.hoverIndex) {
        phaseFamilyState.hoverIndex = nearest;
        renderPhaseFamily();
      }
    });
    phaseFamilyCanvas.addEventListener("pointerleave", () => {
      if (phaseFamilyState.selectedIndex >= 0) return;
      if (phaseFamilyState.hoverIndex < 0) return;
      phaseFamilyState.hoverIndex = -1;
      renderPhaseFamily();
    });
    phaseFamilyCanvas.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") {
        phaseFamilyTouch = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        return;
      }
      const nearest = nearestPhaseFamilyPoint(event, 18);
      if (nearest < 0) {
        if (phaseFamilyState.selectedIndex < 0) return;
        phaseFamilyState.selectedIndex = -1;
        phaseFamilyState.hoverIndex = -1;
        renderPhaseFamily();
        if (phaseFamilyStatus) phaseFamilyStatus.textContent = "Crossing selection cleared.";
        return;
      }
      phaseFamilyCanvas.focus({ preventScroll: true });
      selectPhaseFamilyPoint(nearest);
    });
    phaseFamilyCanvas.addEventListener("pointerup", (event) => {
      if (event.pointerType !== "touch" || phaseFamilyTouch?.id !== event.pointerId) return;
      const touch = phaseFamilyTouch;
      phaseFamilyTouch = null;
      if (touch.moved) return;
      const nearest = nearestPhaseFamilyPoint(event, 30);
      if (nearest < 0) {
        if (phaseFamilyState.selectedIndex < 0) return;
        phaseFamilyState.selectedIndex = -1;
        phaseFamilyState.hoverIndex = -1;
        renderPhaseFamily();
        if (phaseFamilyStatus) phaseFamilyStatus.textContent = "Crossing selection cleared.";
        return;
      }
      phaseFamilyCanvas.focus({ preventScroll: true });
      selectPhaseFamilyPoint(nearest);
    });
    phaseFamilyCanvas.addEventListener("pointercancel", (event) => {
      if (phaseFamilyTouch?.id === event.pointerId) phaseFamilyTouch = null;
    });
    phaseFamilyCanvas.addEventListener("keydown", (event) => {
      const points = phaseFamilyState.geometry?.pointGeometry || [];
      if (!points.length) return;
      let next = phaseFamilyState.selectedIndex;
      if (event.key === "ArrowRight") next = next < 0 ? 0 : Math.min(points.length - 1, next + 1);
      else if (event.key === "ArrowLeft") next = next < 0 ? points.length - 1 : Math.max(0, next - 1);
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = points.length - 1;
      else if (event.key === "Escape") {
        if (next < 0) return;
        event.preventDefault();
        phaseFamilyState.selectedIndex = -1;
        phaseFamilyState.hoverIndex = -1;
        renderPhaseFamily();
        if (phaseFamilyStatus) phaseFamilyStatus.textContent = "Crossing selection cleared.";
        return;
      } else return;
      event.preventDefault();
      selectPhaseFamilyPoint(next);
    });
  }

  const coneFoldRange = select("#coneFoldRange");
  if (coneFoldRange) {
    fillRange(coneFoldRange);
    coneFoldRange.setAttribute("aria-label", "Cone folding stage");
    coneFoldRange.addEventListener("input", (event) => {
      stopConeFold();
      coneFoldState.progress = Number(event.target.value);
      fillRange(event.target);
      renderConeFold();
    });
  }
  const coneFoldPlay = select("#coneFoldPlayButton");
  if (coneFoldPlay) {
    coneFoldPlay.setAttribute("aria-pressed", "false");
    coneFoldPlay.addEventListener("click", playConeFold);
  }
  const coneFoldStageButtons = Array.from(document.querySelectorAll("[data-conefold-stage]"));
  coneFoldStageButtons[0]?.parentElement?.setAttribute("role", "group");
  select("#coneFoldValue")?.setAttribute("aria-live", "polite");
  select("#coneFoldValue")?.setAttribute("aria-atomic", "true");
  coneFoldStageButtons.forEach((button) => {
    button.addEventListener("click", () => animateConeFoldTo(Number(button.dataset.conefoldStage)));
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderGeometryStory();
      renderConeFold();
      if (phaseRange) renderPhaseStory();
      renderPhaseFamily();
    }, 140);
  });

  renderGeometryStory();
  renderConeFold();
  if (phaseRange) updatePhaseStory();
  renderPhaseFamily();
})();
