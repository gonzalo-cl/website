(() => {
  "use strict";

  const SOURCE_ROOT = "https://github.com/pompeiu-schiffer/website/blob/main/";
  const STATE_SCHEMA = "pompeiu-schiffer-applet-state/v1";
  const figureDefaults = new Map();
  const figureKey = (figure) => figure.dataset.figure || figure.dataset.applet || "";

  const downloadBlob = (contents, type, filename) => {
    const blob = contents instanceof Blob ? contents : new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Clipboard access is unavailable.");
  };

  const encodeState = (value) => {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };

  const decodeState = (value) => {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  };

  const stableButtonAttribute = (button) => Array.from(button.attributes).find((attribute) => (
    attribute.name.startsWith("data-")
    && /(stage|view|mode|state)$/.test(attribute.name)
  ));

  const captureFigureState = (figure) => {
    const controls = {};
    figure.querySelectorAll("input[id], select[id], textarea[id]").forEach((control) => {
      if (control.closest(".figure-tools")) return;
      controls[control.id] = control instanceof HTMLInputElement
        && (control.type === "checkbox" || control.type === "radio")
        ? control.checked
        : control.value;
    });
    const pressed = [];
    figure.querySelectorAll("button[aria-pressed='true']").forEach((button) => {
      if (button.closest(".figure-tools") || button.classList.contains("play-button") || /play|pause/i.test(button.id)) return;
      const attribute = stableButtonAttribute(button);
      const rangeAuthoritative = attribute
        && ["data-story-stage", "data-conefold-stage"].includes(attribute.name);
      if (attribute && !rangeAuthoritative) pressed.push({ attribute: attribute.name, value: attribute.value });
    });
    const custom = figure.schifferStateAdapter?.getState?.();
    return custom && typeof custom === "object" ? { controls, pressed, custom } : { controls, pressed };
  };

  const validControlValue = (control, proposed) => {
    if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
      return Boolean(proposed);
    }
    if (control instanceof HTMLSelectElement) {
      return Array.from(control.options).some((option) => option.value === String(proposed))
        ? String(proposed)
        : control.value;
    }
    if (control instanceof HTMLInputElement && ["range", "number"].includes(control.type)) {
      const parsed = Number(proposed);
      if (!Number.isFinite(parsed)) return control.value;
      const minimum = control.min === "" ? -Infinity : Number(control.min);
      const maximum = control.max === "" ? Infinity : Number(control.max);
      return String(Math.max(minimum, Math.min(maximum, parsed)));
    }
    return String(proposed).slice(0, 500);
  };

  const applyFigureState = (figure, state) => {
    if (!state || typeof state !== "object") return;
    Object.entries(state.controls && typeof state.controls === "object" ? state.controls : {}).forEach(([id, proposed]) => {
      const control = document.getElementById(id);
      if (!control || !figure.contains(control)) return;
      const value = validControlValue(control, proposed);
      if (control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio")) {
        control.checked = value;
      } else {
        control.value = value;
      }
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    });
    if (Array.isArray(state.pressed)) {
      state.pressed.slice(0, 8).forEach((record) => {
        if (!record || !/^data-[a-z0-9-]+$/.test(record.attribute) || typeof record.value !== "string") return;
        const button = Array.from(figure.querySelectorAll("button")).find(
          (candidate) => candidate.getAttribute(record.attribute) === record.value,
        );
        button?.click();
      });
    }
    if (state.custom && typeof state.custom === "object") {
      figure.schifferStateAdapter?.setState?.(state.custom);
    }
  };

  const sourceForFigure = (figure) => {
    const label = figureKey(figure);
    if (figure.classList.contains("computer-assisted-figure") || /computer-|conformal-pullback|compatible-inverse|finite-tail|radii-polynomial|local-global/.test(label)) {
      return "computer-assisted.js";
    }
    if (/cone-quotient|cone-unfolding|cone-branch|pompeiu-probe|single-unknown-encoding|interior-matching|branch-scale/.test(label)) return "story.js";
    if (/interval-probe|normal-variation|disk-pompeiu|radial-neumann/.test(label)) return "pompeiu.js";
    if (/near-integer/.test(label)) return "abundance.js";
    if (/half-cylinder|collar-coordinate|fixed-collar-profiles|global-collar|cone-landing/.test(label)) return "app.js";
    return "index.html";
  };

  const phaseFamilyGamma = (lambda) => (
    Math.sqrt((lambda - 1) * (4 - lambda))
    / (4 * Math.acos(1 / Math.sqrt(lambda)))
  );

  const phaseFamilyDataForExport = () => {
    const abundance = window.SCHIFFER_ABUNDANCE_DATA;
    const columns = abundance?.columns;
    const reference = window.CONE_NUMERICS;
    if (!columns?.R || !columns?.rho || !reference) return null;
    const count = Math.min(columns.R.length, columns.rho.length);
    const filteredCrossings = [];
    for (let index = 0; index < count; index += 1) {
      const R = Number(columns.R[index]);
      const rho = Number(columns.rho[index]);
      const lambda = (rho / R) ** 2;
      if (!Number.isFinite(R) || !Number.isFinite(rho) || R < 6 || R > 30 || lambda < 2 || lambda > 3) continue;
      filteredCrossings.push({
        sourceIndex: index,
        R,
        rho,
        n: columns.n?.[index] ?? null,
        localIndex: columns.localIndex?.[index] ?? null,
        lambda,
        gamma: phaseFamilyGamma(lambda),
      });
    }
    const referenceR = Number(reference.RStar);
    const referenceRho = Number(reference.rho);
    const referenceLambda = Number(reference.lambdaStar ?? (referenceRho / referenceR) ** 2);
    if (!Number.isFinite(referenceR) || !Number.isFinite(referenceRho) || !Number.isFinite(referenceLambda)) return null;
    return {
      schema: "pompeiu-schiffer-phase-family/v1",
      figure: "cone-branch-curvature",
      filter: { R: [6, 30], lambda: [2, 3] },
      model: "R(s) = RStar - gamma(lambda) * s^2 / 2",
      gammaDefinition: "sqrt((lambda - 1) * (4 - lambda)) / (4 * acos(1 / sqrt(lambda)))",
      abundanceMetadata: abundance.meta || null,
      filteredCrossings,
      referenceInput: {
        source: reference.source || null,
        targetN: reference.targetN,
        RStar: referenceR,
        rho: referenceRho,
        lambdaStar: referenceLambda,
        Rpp: reference.Rpp,
        gamma: phaseFamilyGamma(referenceLambda),
        outsideFilter: referenceLambda < 2 || referenceLambda > 3,
      },
    };
  };

  const downloadDataForFigure = (figure) => {
    const label = figureKey(figure);
    if (/near-integer/.test(label) && window.SCHIFFER_ABUNDANCE_DATA?.columns) {
      const columns = window.SCHIFFER_ABUNDANCE_DATA.columns;
      const names = Object.keys(columns);
      const count = Math.max(...names.map((name) => columns[name].length));
      const rows = [names.join(",")];
      for (let index = 0; index < count; index += 1) {
        rows.push(names.map((name) => columns[name][index] ?? "").join(","));
      }
      downloadBlob(rows.join("\n") + "\n", "text/csv;charset=utf-8", label + "-data.csv");
      return true;
    }
    if (label === "cone-branch-curvature") {
      const phaseFamilyData = phaseFamilyDataForExport();
      if (!phaseFamilyData) return false;
      downloadBlob(JSON.stringify(phaseFamilyData, null, 2) + "\n", "application/json", label + "-data.json");
      return true;
    }
    if (/collar-coordinate|global-collar|cone-landing-visualization/.test(label) && window.CONE_NUMERICS) {
      downloadBlob(JSON.stringify(window.CONE_NUMERICS, null, 2) + "\n", "application/json", label + "-data.json");
      return true;
    }
    if (/fixed-collar-profiles/.test(label) && window.DEBYE_WIDE_DATA) {
      downloadBlob(JSON.stringify(window.DEBYE_WIDE_DATA, null, 2) + "\n", "application/json", label + "-data.json");
      return true;
    }
    return false;
  };

  const hasDownloadableData = (figure) => {
    const label = figureKey(figure);
    return /near-integer|collar-coordinate|global-collar|cone-branch-curvature|cone-landing-visualization|fixed-collar-profiles/.test(label);
  };

  const inlineSvgStyles = (original, clone) => {
    const properties = [
      "fill", "fill-opacity", "stroke", "stroke-opacity", "stroke-width",
      "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity",
      "font-family", "font-size", "font-style", "font-weight", "text-anchor",
      "dominant-baseline", "vector-effect",
    ];
    const originals = [original, ...original.querySelectorAll("*")];
    const clones = [clone, ...clone.querySelectorAll("*")];
    originals.forEach((element, index) => {
      const target = clones[index];
      if (!target) return;
      const style = getComputedStyle(element);
      properties.forEach((property) => {
        const value = style.getPropertyValue(property);
        if (value) target.style.setProperty(property, value);
      });
    });
  };

  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)), { once: true });
    reader.addEventListener("error", () => reject(reader.error || new Error("An embedded image could not be read.")), { once: true });
    reader.readAsDataURL(blob);
  });

  const prepareSelfContainedSvg = async (original) => {
    const clone = original.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    inlineSvgStyles(original, clone);
    const images = Array.from(clone.querySelectorAll("image"));
    await Promise.all(images.map(async (image) => {
      const href = image.getAttribute("href") || image.getAttributeNS("http://www.w3.org/1999/xlink", "href");
      if (!href || href.startsWith("data:")) return;
      const response = await fetch(new URL(href, window.location.href));
      if (!response.ok) throw new Error(`An SVG image dependency returned HTTP ${response.status}.`);
      image.setAttribute("href", await blobToDataUrl(await response.blob()));
      image.removeAttributeNS("http://www.w3.org/1999/xlink", "href");
    }));
    return clone;
  };

  const canvasBlob = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("The browser could not encode this canvas."));
    }, "image/png");
  });

  const compositeCanvasBlob = async (canvases) => {
    const cellWidth = 720;
    const labelHeight = 50;
    const gap = 28;
    const columns = canvases.length > 1 ? Math.min(2, canvases.length) : 1;
    const rows = Math.ceil(canvases.length / columns);
    const drawings = canvases.map((canvas) => {
      const ratio = canvas.width > 0 ? canvas.height / canvas.width : 1;
      return { canvas, width: cellWidth, height: Math.max(180, Math.round(cellWidth * ratio)) };
    });
    const rowHeights = Array.from({ length: rows }, (_, row) => Math.max(
      ...drawings.slice(row * columns, row * columns + columns).map((drawing) => drawing.height + labelHeight),
    ));
    const output = document.createElement("canvas");
    output.width = columns * cellWidth + (columns - 1) * gap;
    output.height = rowHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, rows - 1) * gap;
    const context = output.getContext("2d");
    if (!context) throw new Error("The browser could not create a composite figure image.");
    context.fillStyle = "#fffdf8";
    context.fillRect(0, 0, output.width, output.height);
    context.fillStyle = "#183642";
    context.font = "500 24px system-ui, sans-serif";
    context.textBaseline = "middle";
    drawings.forEach((drawing, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const x = column * (cellWidth + gap);
      const y = rowHeights.slice(0, row).reduce((sum, height) => sum + height, 0) + row * gap;
      const label = drawing.canvas.getAttribute("aria-label") || `Panel ${index + 1}`;
      context.fillText(label.length > 64 ? label.slice(0, 61) + "…" : label, x + 12, y + labelHeight / 2, cellWidth - 24);
      context.drawImage(drawing.canvas, x, y + labelHeight, drawing.width, drawing.height);
    });
    return canvasBlob(output);
  };

  const imageExportKind = (figure) => {
    const canvases = Array.from(figure.querySelectorAll("canvas"));
    const svgs = Array.from(figure.querySelectorAll("svg")).filter((svg) => svg.getAttribute("aria-hidden") !== "true");
    const images = Array.from(figure.querySelectorAll("img"));
    if (svgs.length >= 1 && canvases.length === 0 && images.length === 0) return "SVG";
    if (images.length === 1 && canvases.length === 0 && svgs.length === 0) return "image";
    return "PNG";
  };

  const downloadFigureImage = async (figure) => {
    const label = figureKey(figure) || "figure";
    const canvases = Array.from(figure.querySelectorAll("canvas")).filter((canvas) => (
      canvas.width > 0
      && canvas.height > 0
      && !canvas.hidden
      && !canvas.closest("[hidden]")
      && canvas.getClientRects().length > 0
    ));
    const svgs = Array.from(figure.querySelectorAll("svg")).filter((svg) => svg.getAttribute("aria-hidden") !== "true");
    const images = Array.from(figure.querySelectorAll("img"));
    if (svgs.length >= 1 && canvases.length === 0 && images.length === 0) {
      const primary = svgs.find((svg) => svg.hasAttribute("data-export-primary")) || svgs[0];
      const clone = await prepareSelfContainedSvg(primary);
      const source = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
        + new XMLSerializer().serializeToString(clone);
      downloadBlob(source, "image/svg+xml;charset=utf-8", label + ".svg");
      return "SVG";
    }
    if (images.length === 1 && canvases.length === 0 && svgs.length === 0) {
      const source = images[0].currentSrc || images[0].src;
      const response = await fetch(source);
      if (!response.ok) throw new Error(`The figure image returned HTTP ${response.status}.`);
      const blob = await response.blob();
      const suffix = new URL(source, window.location.href).pathname.match(/\.([a-z0-9]+)$/i)?.[1]
        || blob.type.split("/")[1]?.replace("jpeg", "jpg")
        || "png";
      downloadBlob(blob, blob.type || "application/octet-stream", `${label}.${suffix}`);
      return "image";
    }
    if (canvases.length) {
      const blob = canvases.length === 1 ? await canvasBlob(canvases[0]) : await compositeCanvasBlob(canvases);
      downloadBlob(blob, "image/png", label + ".png");
      return "PNG";
    }
    if (svgs.length) {
      const clone = await prepareSelfContainedSvg(svgs[0]);
      downloadBlob(new XMLSerializer().serializeToString(clone), "image/svg+xml;charset=utf-8", label + ".svg");
      return "SVG";
    }
    throw new Error("No downloadable figure image is available.");
  };

  const figureStatePayload = (figure) => ({
    schema: STATE_SCHEMA,
    applet: figureKey(figure),
    version: 1,
    state: captureFigureState(figure),
  });

  const stateUrlForFigure = (figure) => {
    const payload = figureStatePayload(figure);
    const url = new URL(window.location.href);
    url.searchParams.set("applet", payload.applet);
    url.searchParams.set("state", encodeState(payload));
    url.searchParams.delete("tour");
    url.searchParams.delete("tourStep");
    url.hash = figure.id;
    return url.href;
  };

  const sourceLink = (figure) => SOURCE_ROOT + sourceForFigure(figure);

  const stopFigurePlayback = (figure) => {
    figure.querySelectorAll("button").forEach((button) => {
      const isPlaybackControl = button.classList.contains("play-button")
        || button.classList.contains("mode-play")
        || /play/i.test(button.id);
      if (!isPlaybackControl) return;
      const playing = button.getAttribute("aria-pressed") === "true" || /pause/i.test(button.textContent);
      if (playing) button.click();
    });
  };

  const createToolButton = (text, action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", action);
    return button;
  };

  const initializeFigureTools = (figure, index) => {
    const caption = figure.querySelector(":scope > figcaption");
    if (!caption) return;
    if (!caption.id) caption.id = `${figure.id || figureKey(figure) || `figure-${index + 1}`}-caption`;
    figure.querySelectorAll("canvas[role='img'], svg[role='img'], img").forEach((visual) => {
      if (!visual.hasAttribute("aria-describedby")) visual.setAttribute("aria-describedby", caption.id);
    });
    const key = figureKey(figure);
    if (!key) return;

    const defaults = captureFigureState(figure);
    figureDefaults.set(key, defaults);
    const interactive = Object.keys(defaults.controls).length > 0
      || defaults.pressed.length > 0
      || Object.keys(defaults.custom || {}).length > 0;
    const hasImage = Boolean(figure.querySelector("canvas, svg, img"));
    const details = document.createElement("details");
    details.className = "figure-tools";
    const summary = document.createElement("summary");
    summary.textContent = "Share & export";
    const menu = document.createElement("div");
    menu.className = "figure-tools-menu";
    const feedback = document.createElement("output");
    feedback.className = "figure-tools-status";
    feedback.setAttribute("aria-live", "polite");

    const report = (message) => { feedback.textContent = message; };
    menu.append(createToolButton("Copy figure link", async () => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("applet");
        url.searchParams.delete("state");
        url.searchParams.delete("tour");
        url.searchParams.delete("tourStep");
        url.hash = figure.id;
        await copyText(url.href);
        report("Figure link copied.");
      } catch (error) {
        report(error instanceof Error ? error.message : "The figure link could not be copied.");
      }
    }));

    if (interactive) {
      menu.append(createToolButton("Copy state link", async () => {
        try {
          await copyText(stateUrlForFigure(figure));
          report("Shareable applet state copied.");
        } catch (error) {
          report(error instanceof Error ? error.message : "The applet state could not be copied.");
        }
      }));
      menu.append(createToolButton("Reset", () => {
        stopFigurePlayback(figure);
        applyFigureState(figure, figureDefaults.get(key));
        const url = new URL(window.location.href);
        if (url.searchParams.get("applet") === key) {
          url.searchParams.delete("applet");
          url.searchParams.delete("state");
          window.history.replaceState(window.history.state, "", url);
        }
        report("Applet reset to its initial state.");
      }));
      menu.append(createToolButton("Download state", () => {
        const payload = JSON.stringify(figureStatePayload(figure), null, 2) + "\n";
        downloadBlob(payload, "application/json", key + "-state.json");
        report("Applet state downloaded.");
      }));
    }

    if (hasImage) {
      const kind = imageExportKind(figure);
      menu.append(createToolButton(
        kind === "image" ? "Download image" : `Download ${kind}`,
        async () => {
          try {
            const prepared = await downloadFigureImage(figure);
            report(`${prepared === "image" ? "Figure image" : `Figure ${prepared}`} prepared for download.`);
          } catch (error) {
            report(error instanceof Error ? error.message : "The figure image could not be prepared.");
          }
        },
      ));
    }
    if (hasDownloadableData(figure)) {
      menu.append(createToolButton("Download data", () => {
        report(downloadDataForFigure(figure) ? "Figure data prepared for download." : "Figure data are unavailable.");
      }));
    }
    const source = document.createElement("a");
    source.href = sourceLink(figure);
    source.target = "_blank";
    source.rel = "noreferrer";
    source.textContent = "View source";
    menu.append(source, feedback);
    details.append(summary, menu);
    caption.append(details);
  };

  const addObjectPermalinks = () => {
    document.querySelectorAll(".section-heading[data-title]").forEach((heading) => {
      const target = heading.id ? heading : heading.closest("[id]");
      if (!target?.id || heading.querySelector(":scope > .object-permalink")) return;
      const link = document.createElement("a");
      link.className = "object-permalink";
      link.href = "#" + target.id;
      link.textContent = "¶";
      link.setAttribute("aria-label", "Permalink to " + heading.dataset.title);
      heading.append(link);
    });
    document.querySelectorAll(".math-statement[id]").forEach((statement) => {
      const header = statement.querySelector(":scope > .math-statement-header");
      if (!header || header.querySelector(".object-permalink")) return;
      const link = document.createElement("a");
      link.className = "object-permalink";
      link.href = "#" + statement.id;
      link.textContent = "¶";
      link.setAttribute("aria-label", "Permalink to " + header.textContent.trim());
      header.append(link);
    });
  };

  const restoreSharedState = () => {
    const query = new URLSearchParams(window.location.search);
    const label = query.get("applet");
    const encoded = query.get("state");
    if (!label || !encoded || encoded.length > 12000) return;
    const figure = Array.from(document.querySelectorAll("figure[data-figure], figure[data-applet]"))
      .find((candidate) => figureKey(candidate) === label);
    if (!figure) return;
    try {
      const payload = decodeState(encoded);
      if (payload?.schema !== STATE_SCHEMA || payload.applet !== label || payload.version !== 1) return;
      applyFigureState(figure, payload.state);
    } catch (error) {
      console.warn("Ignoring an invalid shared applet state.", error);
    }
  };

  addObjectPermalinks();
  document.querySelectorAll("figure").forEach(initializeFigureTools);
  restoreSharedState();

  window.SCHIFFER_SCHOLARLY_TOOLS = Object.freeze({
    captureFigureState,
    applyFigureState,
    stateUrlForFigure,
  });
})();
