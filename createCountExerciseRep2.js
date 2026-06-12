let initialized = false;

let countP;
let stateP;
let angleDiffFiltP;
let highAngle;
let lowAngle;
let highTime;
let lowTime;
let startDirection;
let prevAngle;
let fastSlowWarningP;
let angleDiff;
let fastSlowWarningTime;
 export function countExerciseRep2(curTime, angle, reset, dt, cfg) {
    const alpha = dt / (dt + cfg.tau);
    
    const highThresh = cfg.highThresh;
    const lowThresh = cfg.lowThresh;
    const minAmp = cfg.minAmp;
    const minPeriod = cfg.minPeriod;
    const maxPeriod = cfg.maxPeriod;
    const startTime = cfg.startTime;

    const minPeriodWrn = cfg.minPeriodWrn;
    const maxPeriodWrn = cfg.maxPeriodWrn;

    if (reset || !initialized) {
      initialized = true;
      countP = 0;
      stateP = 0;
      angleDiffFiltP = 0;
      fastSlowWarningP = 0;

      highAngle = NaN;
      lowAngle = NaN;
      highTime = NaN;
      lowTime = NaN;
      startDirection = 0;
      prevAngle = angle;
      fastSlowWarningTime = -1;
      return {
        count: countP,
        state: stateP,
        angleDiffFilt: angleDiffFiltP,
        fastSlowWarning: fastSlowWarningP,
      };
    }

    angleDiff = (angle - prevAngle)/dt;
    angleDiffFiltP =
      alpha * angleDiff +
      (1 - alpha) * angleDiffFiltP;
    if (curTime < startTime) {
      prevAngle = angle;

      return {
        count: countP,
        state: stateP,
        angleDiffFilt: angleDiffFiltP,
        fastSlowWarning: fastSlowWarningP,
      };
    }

    switch (stateP) {
      case 0:
        if (angleDiffFiltP > highThresh) {
          highAngle = angleDiffFiltP;
          highTime = curTime;
          startDirection = 1;
          stateP = 1;
        } else if (angleDiffFiltP < lowThresh) {
          lowAngle = angleDiffFiltP;
          lowTime = curTime;
          startDirection = -1;
          stateP = 3;
        }
        break;

      case 1:
        if (angleDiffFiltP < lowThresh) {
          lowAngle = angleDiffFiltP;
          lowTime = curTime;
          stateP = 2;
        }
        break;

      case 2:
        if (angleDiffFiltP > highThresh) {
          const repPeriod = curTime - highTime;
          const repAmp = Math.abs(highAngle - lowAngle);

          if (
            repAmp >= minAmp &&
            repPeriod >= minPeriod &&
            repPeriod <= maxPeriod
          ) {
            countP += 1;

            if (repPeriod >= maxPeriodWrn) {
              fastSlowWarningP = 2; // too slow
              fastSlowWarningTime = curTime;
            } else if (repPeriod <= minPeriodWrn) {
              fastSlowWarningP = 1; // too fast
              fastSlowWarningTime = curTime;
            } else {
              fastSlowWarningP = 0; // okay
              fastSlowWarningTime = -1;
            }
          }

          highAngle = angleDiffFiltP;
          highTime = curTime;
          stateP = 1;
        }
        break;

      case 3:
        if (angleDiffFiltP > highThresh) {
          highAngle = angleDiffFiltP;
          highTime = curTime;
          stateP = 4;
        }
        break;

      case 4:
        if (angleDiffFiltP < lowThresh) {
          const repPeriod = curTime - lowTime;
          const repAmp = Math.abs(highAngle - lowAngle);

          if (
            repAmp >= minAmp &&
            repPeriod >= minPeriod &&
            repPeriod <= maxPeriod
          ) {
            countP += 1;

            if (repPeriod >= maxPeriodWrn) {
              fastSlowWarningP = 2; // too slow
              fastSlowWarningTime = curTime;
            } else if (repPeriod <= minPeriodWrn) {
              fastSlowWarningP = 1; // too fast
              fastSlowWarningTime = curTime;
            } else {
              fastSlowWarningP = 0; // okay
              fastSlowWarningTime = -1;
            }
          }

          lowAngle = angleDiffFiltP;
          lowTime = curTime;
          stateP = 3;
        }
        break;
    }
  
    if (
        fastSlowWarningP !== 0 &&
        fastSlowWarningTime !== -1 &&
        (curTime - fastSlowWarningTime) > 1.0
    ) {
        fastSlowWarningP = 0;
        fastSlowWarningTime = -1;
    }
  
    prevAngle = angle;

    return {
      count: countP,
      state: stateP,
      angle_Diff_Filt: angleDiffFiltP,
      fast_Slow_Wrn: fastSlowWarningP,
    };
  }
