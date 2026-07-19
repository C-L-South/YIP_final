export function getExeCfg(caseId) {
  const DTOR = Math.PI / 180;

  switch (caseId) {
    case 1: // squat
      return {
        ang_idx: [16, 13],
        template: [130, 35, 130, 35].map(x => x * DTOR),
        score_lim: [0.15, 0.2, 0.25],
        win_len: 4,

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
        win_len: 2, 

        tau: 0.4,
        highThresh: 20,
        lowThresh: -20,

        minAmp: 20,
        minPeriod: 1,
        maxPeriod: 5.0,
        startTime: 1.0,

        minPeriodWrn: 2,
        maxPeriodWrn: 5
      };

    case 3: // lunge
      return {
        ang_idx: [13, 18],
        template: [135, 30, 40, 15].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.4],
        win_len: 2, 

        tau: 0.4,
        highThresh: 55,
        lowThresh: -40,

        minAmp: 50,
        minPeriod: 0.5,
        maxPeriod: 5.0,
        startTime: 1.0,

        minPeriodWrn: 2,
        maxPeriodWrn: 5
      };

    case 4: // Child
      return {
        ang_idx: [8, 12],
        template: [150, 0, 30, 0].map(x => x * DTOR),
        score_lim: [0.1, 0.2, 0.3],
        win_len: 0.2, 

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
    case 5: // arm circle
      return {
        ang_idx: [7, 8],
        template: [90, 20, 90, 20].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.35],
        win_len: 2,

        tau: 0.4,
        highThresh: 10,
        lowThresh: -10,

        minAmp: 5.0,
        minPeriod: 0.4,
        maxPeriod: 5.0,
        startTime: 1.0,

        minPeriodWrn: 0.5,
        maxPeriodWrn: 3
      };

    case 6: // butterfly stretch
      return {
        ang_idx: [12, 9],
        template: [55, 0, 55, 0].map(x => x * DTOR),
        score_lim: [0.1, 0.2, 0.3],
        win_len: 0.2,

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

    case 7: // cobra stretch
      return {
        ang_idx: [9, 12],
        template: [130, 0, 130, 0].map(x => x * DTOR),
        score_lim: [0.05, 0.1, 0.15],
        win_len: 0.2,

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

    case 8: // shoulder flexion raise
      return {
        ang_idx: [8, 7],
        template: [90, 65, 90, 65].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.35],
        win_len: 4,

        tau: 0.4,
        highThresh: 15,
        lowThresh: -15,

        minAmp: 5.0,
        minPeriod: 0.4,
        maxPeriod: 5.0,
        startTime: 1.0,

        minPeriodWrn: 1,
        maxPeriodWrn: 4
      };

    case 9: // standing hamstring curl
      return {
        ang_idx: [13, 16],
        template: [150, 45, 150, 45].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.35],
        win_len: 3,

        tau: 1.0,
        highThresh: 5,
        lowThresh: -2,

        minAmp: 5.0,
        minPeriod: 0.4,
        maxPeriod: 5.0,
        startTime: 1.0,

        minPeriodWrn: 1,
        maxPeriodWrn: 4
      };

    case 10: // standing march
      return {
        ang_idx: [16, 13],
        template: [120, 50, 120, 50].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.35],
        win_len: 2,

        tau: 0.4,
        highThresh: 10,
        lowThresh: -5,

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
