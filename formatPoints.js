export function formatPoints(pose) {
  const k = pose.keypoints;

  const timestamp = Date.now();

  const pointMap = {
    1: "left_ankle",
    2: "right_ankle",
    3: "left_elbow",
    4: "right_elbow",
    5: "left_hip",
    6: "right_hip",
    7: "left_knee",
    8: "right_knee",
    9: "left_shoulder",
    10: "right_shoulder",
    11: "left_wrist",
    12: "right_wrist",
    13: "nose"
  };

  const row = [timestamp];

  for (let i = 1; i <= 13; i++) {
    const name = pointMap[i];
    const pt = k.find(p => p.name === name);

    if (pt && pt.score > 0.3) {
      row.push(Math.round(pt.x));
      row.push(Math.round(pt.y));
    } else {
      row.push(-1);
      row.push(-1);
    }
  }

  return row;
}