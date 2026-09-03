export function getExeCfg(caseId) {
  const DTOR = Math.PI / 180;

  switch (caseId) {
    case 1: // squat
      return {
        ang_idx: [16, 13],
        template: [130, 35, 130, 35].map(x => x * DTOR),
        score_lim: [0.15, 0.2, 0.25],
        win_len: 4,

        // Filtering / adaptive envelope
        tau: 0.08,
        envTau: 3.0,
        threshFrac: 0.25,

        // Legacy fixed thresholds
        highThresh: 20,
        lowThresh: -20,

        // Rep detection
        minAmp: 20,
        refractory: 0.60,

        minPeriod: 1.05,
        maxPeriod: 4.0,

        // Startup / home pose
        startTime: 1.0,
        startPose: "high",
        homeWin: 1.0,

        // Warning timing
        minPeriodWrn: 1.05,
        maxPeriodWrn: 4.0,
        liveSlow: true,

        // Median despiking
        medN: 3
      };

    case 2: // side-bend
      return {
        ang_idx: [12, 9],
        template: [160, 15, 160, 15].map(x => x * DTOR),
        score_lim: [0.05, 0.1, 0.2],
        win_len: 2,

        tau: 0.08,
        envTau: 4.0,
        threshFrac: 0.20,

        highThresh: 20,
        lowThresh: -20,

        minAmp: 15,
        refractory: 0.80,

        minPeriod: 1.5,
        maxPeriod: 4.0,

        startTime: 1.0,
        startPose: "high",
        homeWin: 1.0,

        minPeriodWrn: 1.5,
        maxPeriodWrn: 4.0,
        liveSlow: true,

        medN: 3
      };

    case 3: // lunge
      return {
        ang_idx: [13, 18],
        template: [135, 30, 40, 15].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.4],
        win_len: 2,

        tau: 0.08,
        envTau: 4.0,
        threshFrac: 0.15,

        highThresh: 55,
        lowThresh: -40,

        minAmp: 15,
        refractory: 1.0,

        minPeriod: 1.8,
        maxPeriod: 4.0,

        startTime: 1.0,
        startPose: "high",
        homeWin: 1.0,

        minPeriodWrn: 1.8,
        maxPeriodWrn: 4.0,
        liveSlow: true,

        medN: 3
      };

    case 4: // Child's Pose
      return {
        ang_idx: [8, 12],
        template: [150, 0, 30, 0].map(x => x * DTOR),
        score_lim: [0.1, 0.2, 0.3],
        win_len: 0.2,

        tau: 0.08,
        envTau: 6.0,
        threshFrac: 0.10,

        highThresh: 5,
        lowThresh: -2,

        minAmp: 15,
        refractory: 0.30,

        minPeriod: 2.0,
        maxPeriod: 5.0,

        startTime: 1.0,
        startPose: "high",
        homeWin: 1.0,

        minPeriodWrn: 2.0,
        maxPeriodWrn: 5.0,
        liveSlow: true,

        medN: 3
      };

    case 5: // arm circle
      return {
        ang_idx: [7, 8],
        template: [90, 20, 90, 20].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.35],
        win_len: 2,

        tau: 0.04,
        envTau: 1.2,
        threshFrac: 0.30,

        highThresh: 10,
        lowThresh: -10,

        minAmp: 20,
        refractory: 0.30,

        minPeriod: 0.45,
        maxPeriod: 1.5,

        startTime: 1.0,
        startPose: "auto",
        homeWin: 0.3,

        minPeriodWrn: 0.45,
        maxPeriodWrn: 1.5,
        liveSlow: true,

        medN: 3
      };

    case 6: // butterfly stretch
      return {
        ang_idx: [12, 9],
        template: [55, 0, 55, 0].map(x => x * DTOR),
        score_lim: [0.1, 0.2, 0.3],
        win_len: 0.2,

        tau: 0.04,
        envTau: 1.0,
        threshFrac: 0.30,

        highThresh: 5,
        lowThresh: -2,

        minAmp: 20,
        refractory: 0.25,

        minPeriod: 0.5,
        maxPeriod: 2.0,

        startTime: 1.0,
        startPose: "auto",
        homeWin: 0.3,

        minPeriodWrn: 0.5,
        maxPeriodWrn: 2.0,
        liveSlow: true,

        medN: 3
      };

    case 7: // cobra stretch
      return {
        ang_idx: [9, 12],
        template: [130, 0, 130, 0].map(x => x * DTOR),
        score_lim: [0.05, 0.1, 0.15],
        win_len: 0.2,

        tau: 0.04,
        envTau: 1.0,
        threshFrac: 0.10,

        highThresh: 5,
        lowThresh: -2,

        minAmp: 20,
        refractory: 0.25,

        minPeriod: 0.5,
        maxPeriod: 2.0,

        startTime: 1.0,
        startPose: "auto",
        homeWin: 0.3,

        minPeriodWrn: 0.5,
        maxPeriodWrn: 2.0,
        liveSlow: true,

        medN: 3
      };

    case 8: // shoulder flexion raise
      return {
        ang_idx: [8, 7],
        template: [90, 65, 90, 65].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.35],
        win_len: 4,

        tau: 0.12,
        envTau: 5.0,
        threshFrac: 0.20,

        highThresh: 15,
        lowThresh: -15,

        minAmp: 30,
        refractory: 0.60,

        minPeriod: 1.8,
        maxPeriod: 3.5,

        startTime: 1.0,
        startPose: "low",
        homeWin: 0.3,

        minPeriodWrn: 1.8,
        maxPeriodWrn: 3.5,
        liveSlow: true,

        medN: 3
      };

    case 9: // standing hamstring curl
      return {
        ang_idx: [13, 16],
        template: [150, 45, 150, 45].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.35],
        win_len: 3,

        tau: 0.05,
        envTau: 3.0,
        threshFrac: 0.25,

        highThresh: 5,
        lowThresh: -2,

        minAmp: 25,
        refractory: 0.40,

        minPeriod: 0.6,
        maxPeriod: 4.5,

        startTime: 1.0,
        startPose: "high",
        homeWin: 0.4,

        minPeriodWrn: 0.6,
        maxPeriodWrn: 4.5,
        liveSlow: true,

        medN: 9
      };

    case 10: // standing march
      return {
        ang_idx: [16, 13],
        template: [120, 50, 120, 50].map(x => x * DTOR),
        score_lim: [0.15, 0.25, 0.35],
        win_len: 2,

        tau: 0.02,
        envTau: 2.0,
        threshFrac: 0.25,

        highThresh: 10,
        lowThresh: -5,

        minAmp: 15,
        refractory: 0.50,

        minPeriod: 0.8,
        maxPeriod: 2.0,

        startTime: 1.0,
        startPose: "high",
        homeWin: 0.4,

        minPeriodWrn: 0.8,
        maxPeriodWrn: 2.0,
        liveSlow: true,

        medN: 9
      };

    default:
      throw new Error(`Unknown exercise case: ${caseId}`);
  }
}
