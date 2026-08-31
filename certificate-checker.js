(() => {
  "use strict";

  const root = document.getElementById("certificate-explorer");
  if (!root) return;

  const DATA_URL = "certificate-data.json?v=20260831.2";
  const EXPECTED_SHA256 = "4d6ae94580e3b85b63e725135552ba7965b0164455a7ebf9068e723a3f610f2f";
  const runButton = document.getElementById("certificateCheckerRun");
  const transcriptButton = document.getElementById("certificateTranscriptDownload");
  const status = document.getElementById("certificateCheckerStatus");
  const integrity = document.getElementById("certificatePayloadIntegrity");
  const conclusion = document.getElementById("certificateExactConclusion");
  const termButtons = Array.from(root.querySelectorAll("[data-certificate-term]"));
  const termName = document.getElementById("certificateTermName");
  const termValue = document.getElementById("certificateTermValue");
  const termRole = document.getElementById("certificateTermRole");
  const termOrigin = document.getElementById("certificateTermOrigin");
  const termFormula = document.getElementById("certificateTermFormula");

  const resultTargets = Object.freeze({
    selfMap: document.getElementById("certificateExactSelfMap"),
    radii: document.getElementById("certificateExactRadii"),
    contraction: document.getElementById("certificateExactContraction"),
    fixedPoint: document.getElementById("certificateExactFixedPoint"),
  });

  const gcd = (left, right) => {
    let a = left < 0n ? -left : left;
    let b = right < 0n ? -right : right;
    while (b) [a, b] = [b, a % b];
    return a || 1n;
  };

  class Rational {
    constructor(numerator, denominator = 1n) {
      if (denominator === 0n) throw new Error("A certificate denominator is zero.");
      let n = BigInt(numerator);
      let d = BigInt(denominator);
      if (d < 0n) {
        n = -n;
        d = -d;
      }
      const divisor = gcd(n, d);
      this.n = n / divisor;
      this.d = d / divisor;
      Object.freeze(this);
    }

    add(other) { return new Rational(this.n * other.d + other.n * this.d, this.d * other.d); }
    subtract(other) { return new Rational(this.n * other.d - other.n * this.d, this.d * other.d); }
    multiply(other) { return new Rational(this.n * other.n, this.d * other.d); }
    divide(other) {
      if (other.n === 0n) throw new Error("Division by zero in the certificate replay.");
      return new Rational(this.n * other.d, this.d * other.n);
    }
    compare(other) {
      const difference = this.n * other.d - other.n * this.d;
      return difference < 0n ? -1 : difference > 0n ? 1 : 0;
    }
    fraction() { return `${this.n}/${this.d}`; }
  }

  const ZERO = new Rational(0n);
  const ONE = new Rational(1n);
  const TWO = new Rational(2n);
  const THREE = new Rational(3n);

  const decimal = (value, digits = 30) => {
    const negative = value.n < 0n;
    let numerator = negative ? -value.n : value.n;
    const integer = numerator / value.d;
    let remainder = numerator % value.d;
    if (!remainder) return `${negative ? "−" : ""}${integer}`;
    let fraction = "";
    for (let index = 0; index < digits && remainder; index += 1) {
      remainder *= 10n;
      fraction += String(remainder / value.d);
      remainder %= value.d;
    }
    return `${negative ? "−" : ""}${integer}.${fraction}${remainder ? "…" : ""}`;
  };

  const recordRational = (record, name) => {
    if (!record
        || typeof record.numerator !== "string"
        || typeof record.denominator !== "string"
        || !/^-?\d+$/.test(record.numerator)
        || !/^\d+$/.test(record.denominator)) {
      throw new Error(`The ${name} record is not an exact integer fraction.`);
    }
    return new Rational(BigInt(record.numerator), BigInt(record.denominator));
  };

  const sha256 = async (text) => {
    if (!window.crypto?.subtle) throw new Error("Web Crypto is unavailable, so the site-pinned input integrity check cannot run.");
    const bytes = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  let payload = null;
  let values = null;
  let latestTranscript = "";

  const setStatus = (message, state = "ready") => {
    if (status) status.textContent = message;
    root.dataset.checkState = state;
  };

  const selectTerm = (key) => {
    if (!payload || !values) return;
    const record = key === "r" ? payload.radius : payload.bounds[key];
    const value = values[key];
    if (!record || !value) return;
    termButtons.forEach((button) => button.setAttribute(
      "aria-pressed",
      String(button.dataset.certificateTerm === key),
    ));
    if (termName) termName.textContent = key === "r" ? "r · validation radius" : `${key} · outward bound`;
    if (termValue) termValue.textContent = `${record.numerator}/${record.denominator} = ${record.decimal}`;
    if (termRole) termRole.textContent = record.role;
    if (termOrigin) termOrigin.textContent = record.origin;
    if (termFormula) termFormula.textContent = record.aggregation;
  };

  const buildTranscript = (computed) => [
    "Constructing Noncircular Schiffer Domains",
    "Exact rational implication replay · fixed-disc certificate",
    "",
    `Schema: ${payload.schema}`,
    `Site-pinned payload SHA-256: ${EXPECTED_SHA256}`,
    `Archive: ${payload.source.archive}`,
    "",
    "Scope:",
    payload.source.scope,
    "",
    "Exact inputs:",
    `r = ${values.r.fraction()} = ${payload.radius.decimal}`,
    `Y = ${values.Y.fraction()} = ${payload.bounds.Y.decimal}`,
    `Z = ${values.Z.fraction()} = ${payload.bounds.Z.decimal}`,
    `C2 = ${values.C2.fraction()} = ${payload.bounds.C2.decimal}`,
    `C3 = ${values.C3.fraction()} = ${payload.bounds.C3.decimal}`,
    "",
    "Exact consequences:",
    `image-radius ratio = ${computed.selfMapRatio.fraction()} = ${decimal(computed.selfMapRatio, 24)} < 1 : ${computed.selfMapPass ? "PASS" : "FAIL"}`,
    `radii margin R(r) = ${computed.radiiMargin.fraction()} = ${decimal(computed.radiiMargin, 24)} < 0 : ${computed.radiiPass ? "PASS" : "FAIL"}`,
    `contraction q(r) = ${computed.q.fraction()} = ${decimal(computed.q, 24)} < 1 : ${computed.contractionPass ? "PASS" : "FAIL"}`,
    computed.fixedPointDistance
      ? `fixed-point distance Y/(1-q) = ${computed.fixedPointDistance.fraction()} = ${decimal(computed.fixedPointDistance, 28)} < 4.20e-10 : ${computed.distancePass ? "PASS" : "FAIL"}`
      : "fixed-point distance Y/(1-q) = NOT EVALUATED because q is not strictly less than 1 : FAIL",
    "",
    `Overall exact implication replay: ${computed.pass ? "PASS" : "FAIL"}`,
    "The archived checker, not this lightweight replay, establishes the outward bounds and validates the finite/tail audits.",
    "",
  ].join("\n");

  const runExactReplay = () => {
    if (!payload || !values) return null;
    try {
      const r2 = values.r.multiply(values.r);
      const r3 = r2.multiply(values.r);
      const imageRadius = values.Y
        .add(values.Z.multiply(values.r))
        .add(values.C2.multiply(r2))
        .add(values.C3.multiply(r3));
      const selfMapRatio = imageRadius.divide(values.r);
      const radiiMargin = imageRadius.subtract(values.r);
      const q = values.Z
        .add(TWO.multiply(values.C2).multiply(values.r))
        .add(THREE.multiply(values.C3).multiply(r2));
      const contractionPass = q.compare(ONE) < 0;
      const fixedPointDistance = contractionPass ? values.Y.divide(ONE.subtract(q)) : null;
      const distanceLimit = new Rational(420n, 1000000000000n);
      const computed = {
        selfMapRatio,
        radiiMargin,
        q,
        fixedPointDistance,
        selfMapPass: selfMapRatio.compare(ONE) < 0,
        radiiPass: radiiMargin.compare(ZERO) < 0,
        contractionPass,
        distancePass: fixedPointDistance ? fixedPointDistance.compare(distanceLimit) < 0 : false,
      };
      computed.pass = computed.selfMapPass
        && computed.radiiPass
        && computed.contractionPass
        && computed.distancePass;

      if (resultTargets.selfMap) {
        resultTargets.selfMap.textContent = `${computed.selfMapPass ? "Pass" : "Fail"} · ${decimal(selfMapRatio, 18)} < 1`;
      }
      if (resultTargets.radii) {
        resultTargets.radii.textContent = `${computed.radiiPass ? "Pass" : "Fail"} · ${decimal(radiiMargin, 21)} < 0`;
      }
      if (resultTargets.contraction) {
        resultTargets.contraction.textContent = `${computed.contractionPass ? "Pass" : "Fail"} · ${decimal(q, 18)} < 1`;
      }
      if (resultTargets.fixedPoint) {
        resultTargets.fixedPoint.textContent = fixedPointDistance
          ? `${computed.distancePass ? "Pass" : "Fail"} · ${decimal(fixedPointDistance, 24)} < 4.20 × 10⁻¹⁰`
          : "Not evaluated · requires q < 1";
      }
      if (conclusion) {
        conclusion.textContent = computed.pass
          ? "Pass — the published outward bounds imply a strict self-map and contraction at r = 10⁻⁶."
          : "Fail — at least one exact implication is not strict; no conclusion is drawn.";
      }
      latestTranscript = buildTranscript(computed);
      if (transcriptButton) transcriptButton.disabled = false;
      setStatus(
        computed.pass
          ? "Exact BigInt arithmetic completed: all four rational inequalities pass."
          : "Exact BigInt arithmetic completed: at least one inequality fails.",
        computed.pass ? "passed" : "failed",
      );
      return computed;
    } catch (error) {
      Object.values(resultTargets).forEach((target) => {
        if (target) target.textContent = "Not evaluated";
      });
      if (conclusion) conclusion.textContent = "Replay failed — no mathematical conclusion is drawn.";
      latestTranscript = "";
      if (transcriptButton) transcriptButton.disabled = true;
      setStatus(error instanceof Error ? error.message : "The exact implication replay failed.", "failed");
      return null;
    }
  };

  const downloadTranscript = () => {
    if (!latestTranscript) return;
    const blob = new Blob([latestTranscript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "schiffer-exact-implication-replay.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const load = async () => {
    try {
      setStatus("Loading the rational input envelope and checking its site-pinned digest…", "loading");
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`Input payload returned HTTP ${response.status}.`);
      const raw = await response.text();
      const digest = await sha256(raw);
      if (digest !== EXPECTED_SHA256) throw new Error("The rational input payload does not match this site's pinned SHA-256 digest.");
      const parsedPayload = JSON.parse(raw);
      if (parsedPayload.schema !== "pompeiu-schiffer-radii-envelope/v1") throw new Error("The rational input schema is not supported.");
      const parsedValues = Object.freeze({
        r: recordRational(parsedPayload.radius, "r"),
        Y: recordRational(parsedPayload.bounds.Y, "Y"),
        Z: recordRational(parsedPayload.bounds.Z, "Z"),
        C2: recordRational(parsedPayload.bounds.C2, "C2"),
        C3: recordRational(parsedPayload.bounds.C3, "C3"),
      });
      if ([parsedValues.r, parsedValues.Y, parsedValues.Z, parsedValues.C2, parsedValues.C3].some((value) => value.compare(ZERO) <= 0)) {
        throw new Error("Every replay input must be strictly positive.");
      }
      payload = parsedPayload;
      values = parsedValues;
      if (integrity) integrity.textContent = `Site-pinned SHA-256 checked · ${digest.slice(0, 12)}…${digest.slice(-8)}`;
      if (runButton) runButton.disabled = false;
      selectTerm("Y");
      setStatus("Input integrity checked against this site release. Run the exact rational implication replay.");
    } catch (error) {
      payload = null;
      values = null;
      latestTranscript = "";
      if (runButton) runButton.disabled = true;
      if (transcriptButton) transcriptButton.disabled = true;
      if (integrity) integrity.textContent = "Site-pinned integrity check failed";
      setStatus(error instanceof Error ? error.message : "The exact replay could not be initialized.", "failed");
    }
  };

  termButtons.forEach((button) => button.addEventListener("click", () => selectTerm(button.dataset.certificateTerm)));
  runButton?.addEventListener("click", runExactReplay);
  transcriptButton?.addEventListener("click", downloadTranscript);

  window.SCHIFFER_CERTIFICATE_REPLAY = Object.freeze({ run: runExactReplay });
  load();
})();
