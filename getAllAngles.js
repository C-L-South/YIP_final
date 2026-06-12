import { getJointAngle } from "./getJointAngle.js";

//persistent variables in getAllAngles
let prvAngs = [
  Math.PI,
  Math.PI / 2,
  Math.PI / 2,
  Math.PI / 2,
  Math.PI / 2,
  Math.PI,
  0,
  0,
  Math.PI,
  Math.PI / 2,
  Math.PI / 2,
  Math.PI,
  Math.PI,
  Math.PI / 2,
  Math.PI / 2,
  Math.PI,
  Math.PI / 2,
  Math.PI / 2,
];

let prvX = [...prvAngs];
let prvX2 = prvAngs.map(a => a * a);

export function getAllAngles(currAllPts, dt) {
    const tau = 2;
    const alpha = tau / (dt + tau);

    const dataStrct = {
      ang: [],
      angX: [],
      angX2: [],
      angSigma: [],
    };

    // MATLAB:
    // keypoints(L,:) = curr_all_pts([2+2*(L-1) : 3+2*(L-1)]);
    //
    // JS note:
    // currAllPts[0] is timestamp
    // then [x1, y1, x2, y2, ..., x13, y13]
    const keypoints = [];

    for (let L = 0; L < 13; L++) {
      keypoints[L] = [
        currAllPts[1 + 2 * L],
        currAllPts[2 + 2 * L],
      ];
    }

    // MATLAB indices converted to JavaScript zero-based indices
    const angPtsIdx = [
      [8, 2, 10],  // ang1
      [12, 8, 2],  // ang2
      [12, 8, 9],  // ang3
      [12, 9, 8],  // ang4
      [12, 9, 3],  // ang5
      [11, 3, 9],  // ang6
      [2, 8, 4],   // ang7
      [3, 9, 5],   // ang8
      [8, 4, 6],   // ang9
      [8, 4, 5],   // ang10
      [9, 5, 4],   // ang11
      [9, 5, 7],   // ang12
      [4, 6, 0],   // ang13
      [4, 6, 7],   // ang14
      [5, 7, 6],   // ang15
      [5, 7, 1],   // ang16
      [6, 0, 1],   // ang17
      [7, 1, 0],   // ang18
    ];

    for (let K = 0; K < 18; K++) {
      const curThreePts = angPtsIdx[K].map(index => keypoints[index]);
      const hasInvalidPoint = curThreePts.some(point =>
        point.some(value => value < 0)
      );

      if (!hasInvalidPoint) {
        dataStrct.ang[K] = getJointAngle(curThreePts);
        prvAngs[K] = dataStrct.ang[K];
      } else {
        dataStrct.ang[K] = prvAngs[K];
      }
    }

    for (let K = 0; K < 18; K++) {

      dataStrct.angX[K] =
        alpha * prvX[K] + (1 - alpha) * dataStrct.ang[K];

      dataStrct.angX2[K] =
        alpha * prvX2[K] + (1 - alpha) * dataStrct.ang[K] ** 2;

      const variance = dataStrct.angX2[K] - dataStrct.angX[K] ** 2;

      dataStrct.angSigma[K] = Math.sqrt(Math.max(0, variance));

      prvX[K] = dataStrct.angX[K];
      prvX2[K] = dataStrct.angX2[K];
    }

    return dataStrct;
  }