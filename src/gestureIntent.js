import { pointDistance2D } from "./cosmicMath.js";

export function handScreenX(landmark) {
  return (1 - landmark.x) * window.innerWidth;
}

export function handScreenY(landmark) {
  return landmark.y * window.innerHeight;
}

export function getGestureCategoryName(category) {
  return typeof category?.categoryName === "string" ? category.categoryName : "None";
}

export function getGestureScore(category) {
  return Number.isFinite(category?.score) ? category.score : 0;
}

export function serializeGestureLandmark(landmark) {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
  };
}

export function serializeGestureCategory(category) {
  if (!category) {
    return null;
  }
  return {
    categoryName: category.categoryName ?? "None",
    score: Number.isFinite(category.score) ? category.score : 0,
  };
}

export function serializeGestureResult(result) {
  return (result.landmarks ?? []).map((landmarks, index) => ({
    landmarks: landmarks.map(serializeGestureLandmark),
    worldLandmarks: (result.worldLandmarks?.[index] ?? []).map(serializeGestureLandmark),
    handedness: serializeGestureCategory(result.handednesses?.[index]?.[0]),
    gesture: serializeGestureCategory(result.gestures?.[index]?.[0]),
  }));
}

export function getStableGestureName(hand, scoreThreshold) {
  const score = getGestureScore(hand?.gesture);
  if (score < scoreThreshold) {
    return "None";
  }
  return getGestureCategoryName(hand.gesture);
}

export function getHandScale(landmarks) {
  if (!landmarks?.[0] || !landmarks?.[9]) {
    return 0.16;
  }
  return Math.max(0.08, pointDistance2D(landmarks[0], landmarks[9]));
}

export function getPinchState(landmarks, pinchLatched = false) {
  if (!landmarks?.[4] || !landmarks?.[8]) {
    return { active: false, distance: 1, scale: 1 };
  }
  const distance = pointDistance2D(landmarks[4], landmarks[8]);
  const scale = getHandScale(landmarks);
  const activeThreshold = Math.max(0.028, scale * 0.24);
  const releaseThreshold = Math.max(0.046, scale * 0.34);
  return {
    active: pinchLatched ? distance < releaseThreshold : distance < activeThreshold,
    distance,
    scale,
  };
}

export function isIndexOnlyPointing(landmarks) {
  if (!landmarks?.[8] || !landmarks?.[6] || !landmarks?.[12] || !landmarks?.[16] || !landmarks?.[20]) {
    return false;
  }
  const scale = getHandScale(landmarks);
  const indexRaised = landmarks[8].y < landmarks[6].y - scale * 0.18;
  const middleCurled = landmarks[12].y > landmarks[10].y - scale * 0.02;
  const ringCurled = landmarks[16].y > landmarks[14].y - scale * 0.02;
  const pinkyCurled = landmarks[20].y > landmarks[18].y - scale * 0.02;
  return indexRaised && middleCurled && ringCurled && pinkyCurled;
}

export function isVictoryPose(landmarks) {
  if (
    !landmarks?.[5] ||
    !landmarks?.[6] ||
    !landmarks?.[8] ||
    !landmarks?.[10] ||
    !landmarks?.[12] ||
    !landmarks?.[14] ||
    !landmarks?.[16] ||
    !landmarks?.[18] ||
    !landmarks?.[20]
  ) {
    return false;
  }
  const scale = getHandScale(landmarks);
  const indexRaised = landmarks[8].y < landmarks[6].y - scale * 0.12;
  const middleRaised = landmarks[12].y < landmarks[10].y - scale * 0.12;
  const ringCurled = landmarks[16].y > landmarks[14].y - scale * 0.04;
  const pinkyCurled = landmarks[20].y > landmarks[18].y - scale * 0.04;
  const fingersSeparated = pointDistance2D(landmarks[8], landmarks[12]) > Math.max(0.018, scale * 0.11);
  return indexRaised && middleRaised && ringCurled && pinkyCurled && fingersSeparated;
}

export function isHandReadyForReentry(hand) {
  const landmarks = hand?.landmarks ?? [];
  if (landmarks.length < 18) {
    return false;
  }
  let visibleCount = 0;
  let centerX = 0;
  let centerY = 0;
  for (const landmark of landmarks) {
    if (
      landmark.x >= -0.08 &&
      landmark.x <= 1.08 &&
      landmark.y >= -0.08 &&
      landmark.y <= 1.08
    ) {
      visibleCount += 1;
    }
    centerX += landmark.x;
    centerY += landmark.y;
  }
  centerX /= landmarks.length;
  centerY /= landmarks.length;
  return visibleCount >= 16 && centerX > -0.08 && centerX < 1.08 && centerY < 0.98;
}

export function isHandUsableForControls(hand) {
  const landmarks = hand?.landmarks ?? [];
  if (landmarks.length < 18) {
    return false;
  }
  let visibleCount = 0;
  let centerX = 0;
  let centerY = 0;
  for (const landmark of landmarks) {
    if (
      landmark.x >= -0.16 &&
      landmark.x <= 1.16 &&
      landmark.y >= -0.16 &&
      landmark.y <= 1.16
    ) {
      visibleCount += 1;
    }
    centerX += landmark.x;
    centerY += landmark.y;
  }
  centerX /= landmarks.length;
  centerY /= landmarks.length;
  return visibleCount >= 13 && centerX > -0.18 && centerX < 1.18 && centerY < 1.08;
}
