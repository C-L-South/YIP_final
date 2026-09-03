let initialized = false;

let countP = 0;
let fastSlowWarningP = 0;
let repPeriodP = -1;

let angleFiltP = 0;

let medBuf = [];
let medIdx = 0;

let runMin = 0;
let runMax = 0;

let prevTime = 0;
let startTimeP = 0;
let lastCountTime = -Infinity;

let homeKnown = false;
let homeIsHigh = true;
let atHome = true;

let homeSum = 0;
let homeN = 0;

export function countExerciseRep2(curTime, angle, reset, dt, cfg) {
  const tau = cfg.tau;
  const envTau = cfg.envTau;
  const threshFrac = cfg.threshFrac;

  const minAmp = cfg.minAmp;
  const refractory = cfg.refractory;

  const minPeriod = cfg.minPeriod;
  const maxPeriod = cfg.maxPeriod;

  const startPose = cfg.startPose;
  const homeWin = cfg.homeWin;
  const liveSlow = cfg.liveSlow;
  const medN = cfg.medN;

  // ---------------------------------------------------------
  // Reset / initialization
  // ---------------------------------------------------------
  if (reset || !initialized) {
    initialized = true;

    countP = 0;
    fastSlowWarningP = 0;
    repPeriodP = -1;

    angleFiltP = angle;

    prevTime = curTime;
    startTimeP = curTime;
    lastCountTime = -Infinity;

    medBuf = new Array(medN).fill(angle);
    medIdx = 0;

    runMin = angle;
    runMax = angle;

    homeSum = angle;
    homeN = 1;

    if (startPose === "high") {
      homeIsHigh = true;
      homeKnown = true;
    } else if (startPose === "low") {
      homeIsHigh = false;
      homeKnown = true;
    } else {
      // auto
      homeIsHigh = true;
      homeKnown = false;
    }

    atHome = true;

    return {
      count: countP,
      state: atHome ? 1 : 0,
      angleFilt: angleFiltP,
      fastSlowWarning: fastSlowWarningP,
      repPeriod: repPeriodP
    };
  }

  // ---------------------------------------------------------
  // Invalid sample protection
  // ---------------------------------------------------------
  if (
    !Number.isFinite(curTime) ||
    !Number.isFinite(angle)
  ) {
    return {
      count: countP,
      state: atHome ? 1 : 0,
      angleFilt: angleFiltP,
      fastSlowWarning: fastSlowWarningP,
      repPeriod: repPeriodP
    };
  }

  // Prefer timestamp-derived dt, like MATLAB
  const sampleDt = curTime - prevTime;

  if (sampleDt <= 0) {
    return {
      count: countP,
      state: atHome ? 1 : 0,
      angleFilt: angleFiltP,
      fastSlowWarning: fastSlowWarningP,
      repPeriod: repPeriodP
    };
  }

  prevTime = curTime;

  // ---------------------------------------------------------
  // 1. Running median filter
  // ---------------------------------------------------------

  // Rebuild median buffer if medN changes
  if (medBuf.length !== medN) {
    medBuf = new Array(medN).fill(angleFiltP);
    medIdx = 0;
  }

  medBuf[medIdx] = angle;
  medIdx++;

  if (medIdx >= medN) {
    medIdx = 0;
  }

  const sortedBuf = [...medBuf].sort((a, b) => a - b);

  let angleMed;

  const middle = Math.floor(sortedBuf.length / 2);

  if (sortedBuf.length % 2 === 0) {
    angleMed =
      (sortedBuf[middle - 1] + sortedBuf[middle]) / 2;
  } else {
    angleMed = sortedBuf[middle];
  }

  // ---------------------------------------------------------
  // 2. Low-pass filter
  // ---------------------------------------------------------
  const alpha = sampleDt / (tau + sampleDt);

  angleFiltP =
    angleFiltP +
    alpha * (angleMed - angleFiltP);

  // ---------------------------------------------------------
  // 3. Adaptive min/max envelope
  // ---------------------------------------------------------
  let span = runMax - runMin;

  const decay = Math.min(sampleDt / envTau, 1);

  runMax = Math.max(
    angleFiltP,
    runMax - 0.5 * span * decay
  );

  runMin = Math.min(
    angleFiltP,
    runMin + 0.5 * span * decay
  );

  span = runMax - runMin;

  const mid = 0.5 * (runMin + runMax);

  // Adaptive Schmitt-trigger thresholds
  const lowThresh =
    runMin + threshFrac * span;

  const highThresh =
    runMax - threshFrac * span;

  // ---------------------------------------------------------
  // 4. Determine home pose
  // ---------------------------------------------------------
  if (!homeKnown) {
    // Average opening posture
    if ((curTime - startTimeP) <= homeWin) {
      homeSum += angleFiltP;
      homeN++;
    }

    // Once enough range exists, determine whether home
    // is the high-angle or low-angle side
    if (span >= minAmp) {
      const homeAngle = homeSum / homeN;

      homeIsHigh = homeAngle >= mid;

      homeKnown = true;

      atHome =
        ((angleFiltP >= mid) === homeIsHigh);
    }
  }

  // ---------------------------------------------------------
  // 5. Schmitt-trigger repetition detection
  // ---------------------------------------------------------
  if (homeKnown) {
    if (atHome) {
      // Leaving home
      if (
        (homeIsHigh && angleFiltP < lowThresh) ||
        (!homeIsHigh && angleFiltP > highThresh)
      ) {
        atHome = false;
      }
    } else {
      // Returning home
      const returnedHome =
        (homeIsHigh && angleFiltP > highThresh) ||
        (!homeIsHigh && angleFiltP < lowThresh);

      if (returnedHome) {
        atHome = true;

        // Valid motion range + refractory protection
        if (
          span >= minAmp &&
          (curTime - lastCountTime) >= refractory
        ) {
          countP += 1;

          // Need a previous count before calculating
          // repetition period
          if (Number.isFinite(lastCountTime)) {
            repPeriodP =
              curTime - lastCountTime;

            if (repPeriodP > maxPeriod) {
              fastSlowWarningP = 2; // too slow
            } else if (repPeriodP < minPeriod) {
              fastSlowWarningP = 1; // too fast
            } else {
              fastSlowWarningP = 0; // good pace
            }
          } else {
            // First repetition
            repPeriodP = -1;
            fastSlowWarningP = 0;
          }

          lastCountTime = curTime;
        }
      }
    }
  }

  // ---------------------------------------------------------
  // 6. Live "too slow" warning
  // ---------------------------------------------------------
  if (
    liveSlow &&
    Number.isFinite(lastCountTime) &&
    (curTime - lastCountTime) > maxPeriod
  ) {
    fastSlowWarningP = 2;
  }

  // ---------------------------------------------------------
  // Output
  // ---------------------------------------------------------
  return {
    count: countP,

    // 1 = currently at home
    // 0 = currently away from home
    state: atHome ? 1 : 0,

    angleFilt: angleFiltP,

    fastSlowWarning: fastSlowWarningP,

    repPeriod: repPeriodP,

    // Optional debugging values
    lowThresh,
    highThresh,
    runMin,
    runMax,
    span,
    homeKnown,
    homeIsHigh
  };
}
