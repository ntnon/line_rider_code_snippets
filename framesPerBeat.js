(() => {
  // Compute time scale factor for a given FPS, BPM, and FPB
  const timeScaleForFPB = (fps0, bpm, fpb) => (fpb * bpm) / (60 * fps0);

  // Helper: compute greatest common divisor
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

  // Convert a decimal to a reduced fraction
  const toFraction = (decimal, tolerance = 1e-6) => {
    let denominator = 1;
    while (
      Math.abs(Math.round(decimal * denominator) / denominator - decimal) >
      tolerance
    ) {
      denominator++;
    }
    const numerator = Math.round(decimal * denominator);
    const common = gcd(numerator, denominator);
    return { numerator: numerator / common, denominator: denominator / common };
  };

  /**
   * Find the FPB value (powers of two: 2,4,8,16,32,...)
   * that produces a time-scale factor closest to 1.0
   */
  const findBestPowerOfTwoFPB = (fps0, bpm, maxPower = 6) => {
    let best = null;
    for (let power = 1; power <= maxPower; power++) {
      const fpb = 2 ** power;
      const f = timeScaleForFPB(fps0, bpm, fpb);
      const deviation = Math.abs(1 - f);

      if (!best || deviation < best.deviation) {
        best = { fpb, f, deviation };
      }
    }
    best.fraction = toFraction(best.f);
    return best;
  };

  /**
   * Find the FPB value (within a reasonable search range)
   * that produces a time-scale factor closest to 1.0
   */
  const findBestFPB = (fps0, bpm, maxFPB = 32) => {
    let best = null;
    for (let fpb = 1; fpb <= maxFPB; fpb++) {
      const f = timeScaleForFPB(fps0, bpm, fpb);
      const deviation = Math.abs(1 - f);

      if (!best || deviation < best.deviation) {
        best = { fpb, f, deviation };
      }
    }
    best.fraction = toFraction(best.f);
    return best;
  };

  // Example usage
  const fps0 = 40;
  const bpm = 137;
  const mode = "CloseToPowerOfTwo"; // "CloseToOne" or "CloseToPowerOfTwo"

  /**
   * Display best FPB info based on mode and options
   */
  const showBestFPB = (fps, bpm, mode) => {
    let best;
    let label;

    if (mode === "CloseToOne") {
      best = findBestFPB(fps, bpm);
      label = "Best FPB (closest to 1)";
    } else if (mode === "CloseToPowerOfTwo") {
      best = findBestPowerOfTwoFPB(fps, bpm);
      label = "Best FPB (power of 2)";
    } else {
      console.error(
        `Invalid mode "${mode}". Use "CloseToOne" or "CloseToPowerOfTwo".`,
      );
      return;
    }

    console.log(`
  ${label}: ${best.fpb}
  Required time-scale: ${best.f.toFixed(6)} ≈ ${best.fraction.numerator}/${best.fraction.denominator}
  Deviation from normal speed: ${best.deviation}
  `);
    if (window.Actions) {
      const timeRemapper = createTimeRemapper([[[0, 0, 0], best.f]], false);
    } else {
      console.log("You must run this in the console on https://linerider.com");
    }
  };
})();
