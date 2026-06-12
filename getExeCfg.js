export function getExeCfg(caseId) {
  const DTOR = Math.PI / 180;

  switch (caseId) {
    case 1: // squat
      return {
        ang_idx: [16, 13],
        template: [145, 30, 145, 30].map(x => x * DTOR),
        score_lim: [0.05, 0.1, 0.2],

        tau: 0.4,
        highThresh: 20,
        lowThresh: -20,

        minAmp: 30,
        minPeriod: 0.4,
        maxPeriod: 5.0,
        startTime: 1.0,

        minPeriodWrn: 1,
        maxPeriodWrn: 4
      };

    case 2: // side-bend
      return {
        ang_idx: [12, 9],
        template: [160, 15, 160, 15].map(x => x * DTOR),
        score_lim: [0.05, 0.1, 0.2],

        tau: 0.4,
        highThresh: 10,
        lowThresh: -10,

        minAmp: 15,
        minPeriod: 0.4,
        maxPeriod: 5.0,
        startTime: 1.0,

        minPeriodWrn: 1,
        maxPeriodWrn: 4
      };

    case 3: // lunge
      return {
        ang_idx: [13, 18],
        template: [135, 30, 40, 15].map(x => x * DTOR),
        score_lim: [0.05, 0.1, 0.2],

        tau: 0.4,
        highThresh: 50,
        lowThresh: -50,

        minAmp: 50,
        minPeriod: 0.4,
        maxPeriod: 5.0,
        startTime: 1.0,

        minPeriodWrn: 1,
        maxPeriodWrn: 4
      };

    case 4: // Child
      return {
        ang_idx: [8, 12],
        template: [150, 0, 30, 0].map(x => x * DTOR),
        score_lim: [0.05, 0.1, 0.2],

        tau: 0.4,
        highThresh: 5,
        lowThresh: -2,

        minAmp: 5.0,
        minPeriod: 0.4,
        maxPeriod: 5.0,
        startTime: 1.0,

        minPeriodWrn: 1,
        maxPeriodWrn: 4
      };

    default:
      throw new Error(`Unknown exercise case: ${caseId}`);
  }
}