export function getJointAngle(threePoints) {
  // threePoints should be:
  // [
  //   [x1, y1],
  //   [x2, y2],  // middle/reference point
  //   [x3, y3]
  // ]

  const eps = 1e-6;
 
  let vector1 = [
    threePoints[0][0] - threePoints[1][0],
    threePoints[0][1] - threePoints[1][1],
  ];

  let vector2 = [
    threePoints[2][0] - threePoints[1][0],
    threePoints[2][1] - threePoints[1][1],
  ];

  const norm1 = Math.sqrt(vector1[0] ** 2 + vector1[1] ** 2);
  const norm2 = Math.sqrt(vector2[0] ** 2 + vector2[1] ** 2);

  if (norm1 < eps || norm2 < eps) {
    return 0;
  }

  vector1 = [vector1[0] / norm1, vector1[1] / norm1];
  vector2 = [vector2[0] / norm2, vector2[1] / norm2];

  const dotProduct = vector1[0] * vector2[0] + vector1[1] * vector2[1];
  const clamped = Math.max(-1, Math.min(1, dotProduct)); // clamp to [-1, 1]
  return Math.acos(clamped); // ✅ never NaN
}