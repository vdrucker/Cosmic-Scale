export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function pointDistance2D(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function getSpinFromRotationHours(rotationHours, baseRate = 0.024) {
  if (!Number.isFinite(rotationHours) || rotationHours === 0) {
    return baseRate;
  }
  const sign = rotationHours < 0 ? -1 : 1;
  const rate = (24 / Math.max(Math.abs(rotationHours), 8)) * baseRate;
  return sign * clamp(rate, 0.00035, 0.065);
}

export function getBodyDetailScale(id, radius, type) {
  const resolvedScale = {
    mercury: 0.7,
    venus: 0.94,
    earth: 1,
    mars: 0.78,
    ceres: 0.42,
    pluto: 0.52,
    moon: 0.78,
    phobos: 0.42,
    deimos: 0.39,
    charon: 0.5,
  }[id];
  if (Number.isFinite(resolvedScale)) {
    return resolvedScale;
  }
  if (type === "Giant Planet") {
    return clamp(radius / 1.42, 1.1, 1.48);
  }
  if (type === "Major Moon") {
    return clamp(radius / 0.32, 0.58, 0.88);
  }
  if (type === "Dwarf Planet") {
    return clamp(radius / 0.42, 0.46, 0.62);
  }
  return clamp(radius / 0.68, 0.72, 1.08);
}

export function localRandomish(index, salt) {
  const seed = Array.from(salt).reduce((total, char) => total + char.charCodeAt(0), index * 997);
  return seededRandom(seed)();
}
