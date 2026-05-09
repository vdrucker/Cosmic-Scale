import * as THREE from "three";
import { seededRandom } from "./cosmicMath.js";

const TEXTURE_WIDTH = 768;
const TEXTURE_HEIGHT = 384;
const PIXEL = 4;

// Workbench north star: symbolic pixel astronomy, cinematic and alive; lighting owns hemispheres.

function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  return { canvas, context };
}

function finishTexture(canvas, { maxAnisotropy = 1, pixelated = true, colorSpace = THREE.SRGBColorSpace } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  if (pixelated) {
    texture.magFilter = THREE.NearestFilter;
  }
  return texture;
}

function snap(value, pixel = PIXEL) {
  return Math.round(value / pixel) * pixel;
}

function colorToCss(color) {
  return `#${new THREE.Color(color).getHexString()}`;
}

function colorToAlphaCss(color) {
  const value = new THREE.Color(color);
  return `rgba(${Math.floor(value.r * 255)}, ${Math.floor(value.g * 255)}, ${Math.floor(value.b * 255)}, ALPHA)`;
}

function seedFromText(text, multiplier = 17, seed = 0) {
  return Array.from(text).reduce((total, char) => total + char.charCodeAt(0) * multiplier, seed);
}

function geoPoint(longitude, latitude) {
  return [
    snap(((longitude + 180) / 360) * TEXTURE_WIDTH),
    snap(((90 - latitude) / 180) * TEXTURE_HEIGHT),
  ];
}

function drawPolygon(context, points, fillStyle, strokeStyle = "rgba(255, 244, 190, 0.16)", lineWidth = 2) {
  const mapped = points.map(([longitude, latitude]) => geoPoint(longitude, latitude));
  context.beginPath();
  for (const [index, [x, y]] of mapped.entries()) {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }
}

function drawLine(context, points, strokeStyle, width = 2) {
  context.beginPath();
  for (const [index, [x, y]] of points.map(([longitude, latitude]) => geoPoint(longitude, latitude)).entries()) {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = strokeStyle;
  context.lineWidth = width;
  context.stroke();
}

function offsetGeoPoints(points, longitudeOffset = 0, latitudeOffset = 0) {
  return points.map(([longitude, latitude]) => [longitude + longitudeOffset, latitude + latitudeOffset]);
}

function drawReliefRidge(context, points, {
  depth = false,
  width = 4,
  shelfWidth = width * 2.4,
  color = "rgba(112, 94, 68, 0.58)",
  highlight = "rgba(246, 238, 204, 0.68)",
  shadow = "rgba(36, 45, 40, 0.42)",
  shelf = "rgba(166, 142, 92, 0.34)",
  depthShelf = 166,
  depthCrest = 246,
  depthShadow = 72,
} = {}) {
  if (depth) {
    drawLine(context, offsetGeoPoints(points, 0.9, -0.7), `rgb(${depthShadow}, ${depthShadow}, ${depthShadow})`, Math.max(1, width * 0.75));
    drawLine(context, points, `rgb(${depthShelf}, ${depthShelf}, ${depthShelf})`, shelfWidth);
    drawLine(context, points, `rgb(${depthCrest}, ${depthCrest}, ${depthCrest})`, width);
    drawLine(context, offsetGeoPoints(points, -0.35, 0.35), "rgba(255, 255, 255, 0.82)", Math.max(1, width * 0.34));
    return;
  }
  drawLine(context, offsetGeoPoints(points, 0.9, -0.7), shadow, Math.max(1, width * 0.95));
  drawLine(context, points, shelf, shelfWidth);
  drawLine(context, points, color, width);
  drawLine(context, offsetGeoPoints(points, -0.35, 0.35), highlight, Math.max(1, width * 0.4));
}

function fillPixelNoise(context, random, {
  count,
  colorA,
  colorB,
  alphaA = 0.14,
  alphaB = 0.08,
  minY = 0,
  maxY = TEXTURE_HEIGHT,
  minSize = 1,
  maxSize = 3,
}) {
  for (let i = 0; i < count; i += 1) {
    const x = snap(random() * TEXTURE_WIDTH);
    const y = snap(minY + random() * (maxY - minY));
    const width = PIXEL * (minSize + Math.floor(random() * Math.max(1, maxSize - minSize + 1)));
    const height = PIXEL * (minSize + Math.floor(random() * Math.max(1, maxSize - minSize + 1)));
    context.fillStyle = random() < 0.5 ? colorA.replace("ALPHA", alphaA) : colorB.replace("ALPHA", alphaB);
    context.fillRect(x, y, width, height);
  }
}

function drawTerrainSmudges(context, random, {
  count,
  colorA,
  colorB,
  alphaA = 0.1,
  alphaB = 0.08,
  minY = 0,
  maxY = TEXTURE_HEIGHT,
  minRadius = 10,
  maxRadius = 42,
  stretch = 0.42,
}) {
  for (let i = 0; i < count; i += 1) {
    const radius = minRadius + random() * (maxRadius - minRadius);
    context.fillStyle = random() < 0.5 ? colorA.replace("ALPHA", alphaA) : colorB.replace("ALPHA", alphaB);
    context.beginPath();
    context.ellipse(
      snap(random() * TEXTURE_WIDTH),
      snap(minY + random() * (maxY - minY)),
      snap(radius),
      snap(radius * (stretch + random() * 0.36)),
      (random() - 0.5) * 0.85,
      0,
      Math.PI * 2
    );
    context.fill();
  }
}

function drawPixelStreaks(context, random, {
  count,
  color = "rgba(220, 245, 255, 0.14)",
  width = 2,
  minY = 0,
  maxY = TEXTURE_HEIGHT,
  minLength = 0.12,
  maxLength = 0.42,
  wave = 8,
}) {
  context.strokeStyle = color;
  context.lineWidth = width;
  for (let i = 0; i < count; i += 1) {
    const y = snap(minY + random() * (maxY - minY));
    const startX = snap(-40 + random() * TEXTURE_WIDTH * 0.72);
    const length = snap(TEXTURE_WIDTH * (minLength + random() * (maxLength - minLength)));
    context.beginPath();
    context.moveTo(startX, y);
    for (let x = startX; x <= startX + length; x += PIXEL * 3) {
      context.lineTo(x, snap(y + Math.sin(x * 0.018 + i) * (3 + random() * wave)));
    }
    context.stroke();
  }
}

function isTemperateExoplanet(id = "") {
  return id.includes("-e") || id.includes("-f") || id.includes("kepler-186-f") || id.includes("proxima-centauri-b");
}

function drawCrater(context, x, y, radius, random, {
  darkness = 0.16,
  rim = 0.22,
  rays = 0,
  stretch = 0.78,
} = {}) {
  context.fillStyle = `rgba(10, 10, 12, ${darkness})`;
  context.beginPath();
  context.ellipse(x, y, radius, radius * stretch, random() * Math.PI, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = `rgba(255, 255, 238, ${rim})`;
  context.lineWidth = Math.max(1, radius * 0.08);
  context.stroke();
  if (rays > 0) {
    context.strokeStyle = `rgba(248, 246, 224, ${rim * 0.45})`;
    context.lineWidth = 1;
    for (let ray = 0; ray < rays; ray += 1) {
      const angle = (ray / rays) * Math.PI * 2 + random() * 0.2;
      const length = radius * (1.7 + random() * 4.4);
      context.beginPath();
      context.moveTo(x + Math.cos(angle) * radius * 0.78, y + Math.sin(angle) * radius * stretch * 0.78);
      context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length * stretch);
      context.stroke();
    }
  }
}

function drawDepthCrater(context, x, y, radius, random, {
  floor = 28,
  rim = 246,
  shelf = 118,
  rays = 0,
  stretch = 0.76,
} = {}) {
  const rotation = random() * Math.PI;
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.fillStyle = `rgb(${shelf}, ${shelf}, ${shelf})`;
  context.beginPath();
  context.ellipse(0, 0, radius * 1.25, radius * stretch * 1.25, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = `rgb(${floor}, ${floor}, ${floor})`;
  context.beginPath();
  context.ellipse(0, 0, radius * 0.78, radius * stretch * 0.72, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = `rgb(${rim}, ${rim}, ${rim})`;
  context.lineWidth = Math.max(2, radius * 0.26);
  context.beginPath();
  context.ellipse(0, 0, radius, radius * stretch, 0, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(255, 255, 255, 0.7)";
  context.lineWidth = Math.max(1, radius * 0.09);
  context.beginPath();
  context.ellipse(-radius * 0.12, -radius * stretch * 0.14, radius * 0.5, radius * stretch * 0.38, 0, 3.15, 5.9);
  context.stroke();
  context.strokeStyle = "rgba(0, 0, 0, 0.42)";
  context.lineWidth = Math.max(1, radius * 0.08);
  context.beginPath();
  context.ellipse(radius * 0.16, radius * stretch * 0.18, radius * 0.56, radius * stretch * 0.44, 0, 0.2, 2.95);
  context.stroke();
  if (rays > 0) {
    context.strokeStyle = "rgba(235, 235, 235, 0.55)";
    context.lineWidth = Math.max(1, radius * 0.035);
    for (let ray = 0; ray < rays; ray += 1) {
      const angle = (ray / rays) * Math.PI * 2 + random() * 0.18;
      const length = radius * (1.55 + random() * 4.2);
      context.beginPath();
      context.moveTo(Math.cos(angle) * radius * 0.92, Math.sin(angle) * radius * stretch * 0.92);
      context.lineTo(Math.cos(angle) * length, Math.sin(angle) * length * stretch);
      context.stroke();
    }
  }
  context.restore();
}

function drawAtmosphereClouds(context, random, id) {
  const isVenus = id === "venus";
  const isEarth = id === "earth";
  const isMars = id === "mars";
  const isSaturn = id === "saturn";
  const isUranus = id === "uranus";
  const isNeptune = id === "neptune";
  const isTitan = id === "titan";
  if (isMars || isSaturn || isUranus || isNeptune || isTitan) {
    const cloudColor = isMars
      ? "rgba(255, 184, 116, 0.22)"
      : isSaturn
        ? "rgba(255, 230, 168, 0.2)"
        : isUranus
          ? "rgba(205, 255, 255, 0.18)"
          : isNeptune
            ? "rgba(205, 226, 255, 0.22)"
            : "rgba(255, 210, 122, 0.24)";
    drawPixelStreaks(context, random, {
      count: isTitan ? 34 : isMars ? 28 : 42,
      color: cloudColor,
      width: isMars ? 3 : isTitan ? 5 : 4,
      minY: isMars ? TEXTURE_HEIGHT * 0.18 : 0,
      maxY: isMars ? TEXTURE_HEIGHT * 0.78 : TEXTURE_HEIGHT,
      minLength: isMars ? 0.16 : 0.38,
      maxLength: isMars ? 0.48 : 0.98,
      wave: isMars ? 10 : 7,
    });
    if (isNeptune) {
      context.fillStyle = "rgba(235, 245, 255, 0.16)";
      context.beginPath();
      context.ellipse(TEXTURE_WIDTH * 0.62, TEXTURE_HEIGHT * 0.38, 78, 16, -0.2, 0, Math.PI * 2);
      context.fill();
    }
    return;
  }
  if (isEarth) {
    drawPixelStreaks(context, random, {
      count: 32,
      color: "rgba(255, 255, 255, 0.24)",
      width: 2.2,
      minY: TEXTURE_HEIGHT * 0.12,
      maxY: TEXTURE_HEIGHT * 0.86,
      minLength: 0.18,
      maxLength: 0.58,
      wave: 9,
    });
    context.fillStyle = "rgba(255, 255, 255, 0.1)";
    for (let i = 0; i < 24; i += 1) {
      context.beginPath();
      context.ellipse(
        snap(random() * TEXTURE_WIDTH),
        snap(TEXTURE_HEIGHT * (0.14 + random() * 0.68)),
        snap(18 + random() * 92),
        snap(3 + random() * 17),
        (random() - 0.5) * 0.72,
        0,
        Math.PI * 2
      );
      context.fill();
    }
    context.strokeStyle = "rgba(255, 255, 255, 0.28)";
    context.lineWidth = 2;
    for (const [x, y, r] of [
      [0.22, 0.42, 28],
      [0.6, 0.34, 34],
      [0.74, 0.62, 24],
    ]) {
      context.beginPath();
      context.ellipse(TEXTURE_WIDTH * x, TEXTURE_HEIGHT * y, r, r * 0.42, 0.45, 0.4, Math.PI * 1.75);
      context.stroke();
    }
    return;
  }
  context.strokeStyle = isVenus ? "rgba(255, 238, 188, 0.42)" : "rgba(255, 255, 255, 0.24)";
  context.lineWidth = isVenus ? 7 : 2.2;
  drawPixelStreaks(context, random, {
    count: isVenus ? 46 : 34,
    color: isVenus ? "rgba(255, 238, 188, 0.42)" : "rgba(255, 255, 255, 0.24)",
    width: isVenus ? 7 : 2.2,
    minY: isVenus ? 0 : TEXTURE_HEIGHT * 0.12,
    maxY: isVenus ? TEXTURE_HEIGHT : TEXTURE_HEIGHT * 0.88,
    minLength: isVenus ? 0.42 : 0.12,
    maxLength: isVenus ? 0.95 : 0.48,
    wave: isVenus ? 13 : 7,
  });
  if (!isVenus) {
    context.fillStyle = "rgba(255, 255, 255, 0.13)";
    for (let i = 0; i < 38; i += 1) {
      context.beginPath();
      context.ellipse(
        snap(random() * TEXTURE_WIDTH),
        snap(TEXTURE_HEIGHT * (0.16 + random() * 0.68)),
        snap(10 + random() * 76),
        snap(2 + random() * 14),
        (random() - 0.5) * 0.8,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  }
}

export function createPixelCloudTexture(id = "earth", options = {}) {
  const { canvas, context } = createCanvas();
  const random = seededRandom(seedFromText(id, 29, 7041));
  context.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  drawAtmosphereClouds(context, random, id);
  return finishTexture(canvas, { ...options, pixelated: id !== "venus" });
}

const EARTH_LANDMASSES = [
  {
    fill: "rgba(46, 132, 74, 0.98)",
    depth: 154,
    points: [[-168, 71], [-150, 72], [-136, 69], [-124, 59], [-130, 54], [-124, 49], [-124, 42], [-118, 34], [-112, 32], [-106, 24], [-98, 19], [-89, 20], [-83, 25], [-81, 30], [-75, 36], [-70, 43], [-62, 47], [-57, 52], [-61, 58], [-76, 58], [-88, 55], [-96, 59], [-111, 60], [-123, 65], [-138, 60], [-151, 58], [-160, 64]],
  },
  {
    fill: "rgba(55, 150, 82, 0.96)",
    depth: 150,
    points: [[-104, 24], [-96, 22], [-88, 19], [-83, 15], [-79, 10], [-83, 8], [-91, 13], [-99, 17], [-107, 20]],
  },
  {
    fill: "rgba(60, 143, 82, 0.98)",
    depth: 152,
    points: [[-82, 12], [-73, 9], [-66, 3], [-60, -5], [-54, -13], [-49, -25], [-51, -35], [-58, -46], [-67, -56], [-73, -50], [-76, -38], [-79, -24], [-82, -10]],
  },
  {
    fill: "rgba(224, 239, 230, 0.95)",
    depth: 178,
    points: [[-53, 82], [-32, 79], [-21, 70], [-34, 60], [-51, 59], [-66, 66], [-73, 74]],
  },
  {
    fill: "rgba(70, 144, 82, 0.98)",
    depth: 154,
    points: [[-10, 36], [-5, 44], [8, 52], [26, 58], [45, 60], [68, 62], [92, 59], [116, 55], [138, 50], [154, 48], [166, 55], [178, 49], [166, 39], [145, 35], [126, 30], [111, 22], [101, 10], [84, 8], [73, 21], [60, 25], [47, 30], [35, 21], [28, 8], [18, 4], [8, 34], [0, 38]],
  },
  {
    fill: "rgba(86, 138, 76, 0.98)",
    depth: 153,
    points: [[-17, 36], [-5, 35], [8, 33], [22, 31], [34, 24], [43, 12], [42, -4], [36, -20], [28, -31], [18, -35], [8, -28], [-4, -12], [-13, 7], [-17, 23]],
  },
  {
    fill: "rgba(74, 134, 78, 0.96)",
    depth: 152,
    points: [[67, 24], [78, 23], [88, 17], [91, 8], [84, 6], [76, 9], [70, 18]],
  },
  {
    fill: "rgba(54, 136, 78, 0.94)",
    depth: 148,
    points: [[96, 22], [106, 21], [116, 18], [126, 10], [118, 5], [106, 8], [98, 15]],
  },
  {
    fill: "rgba(139, 123, 74, 0.96)",
    depth: 151,
    points: [[112, -11], [136, -10], [154, -18], [153, -31], [144, -38], [132, -43], [118, -36], [112, -23]],
  },
  {
    fill: "rgba(232, 243, 237, 0.86)",
    depth: 172,
    points: [[-180, -68], [-146, -63], [-104, -67], [-58, -64], [-16, -68], [32, -64], [78, -66], [126, -63], [180, -66], [180, -90], [-180, -90]],
  },
];

const EARTH_ISLANDS = [
  { fill: "rgba(58, 130, 75, 0.9)", depth: 148, points: [[-10, 58], [-4, 57], [-2, 52], [-8, 50], [-12, 54]] },
  { fill: "rgba(63, 136, 78, 0.9)", depth: 148, points: [[-8, 54], [2, 53], [2, 50], [-5, 49]] },
  { fill: "rgba(58, 132, 78, 0.9)", depth: 148, points: [[138, 45], [144, 43], [142, 36], [137, 35], [134, 40]] },
  { fill: "rgba(62, 132, 78, 0.9)", depth: 148, points: [[46, -13], [50, -18], [49, -25], [44, -25], [43, -17]] },
  { fill: "rgba(72, 132, 78, 0.9)", depth: 148, points: [[166, -35], [178, -38], [175, -46], [166, -45]] },
  { fill: "rgba(66, 134, 78, 0.9)", depth: 148, points: [[120, -1], [132, -2], [141, -6], [132, -8], [119, -6]] },
];

const EARTH_COAST_CUTOUTS = [
  [[-97, 61], [-88, 62], [-78, 58], [-79, 52], [-88, 50], [-96, 55]],
  [[-74, 55], [-62, 55], [-57, 49], [-64, 46], [-73, 49]],
  [[-99, 30], [-90, 30], [-82, 26], [-84, 21], [-94, 19], [-100, 23]],
  [[-86, 20], [-74, 21], [-62, 15], [-70, 9], [-82, 12]],
  [[-8, 38], [10, 41], [31, 37], [36, 32], [19, 31], [2, 35]],
  [[31, 29], [43, 28], [49, 22], [41, 18], [34, 23]],
  [[50, 25], [60, 26], [61, 20], [54, 18]],
  [[62, 22], [74, 20], [75, 9], [64, 10], [58, 16]],
  [[86, 20], [96, 18], [100, 9], [92, 7], [86, 12]],
  [[101, 7], [112, 8], [116, 0], [108, -5], [100, -1]],
  [[15, 46], [28, 46], [32, 42], [22, 40], [14, 42]],
  [[35, 45], [52, 43], [54, 37], [42, 36], [35, 40]],
  [[47, 31], [57, 28], [57, 23], [50, 23]],
  [[76, 22], [89, 20], [91, 15], [80, 14], [74, 17]],
  [[90, 28], [104, 25], [108, 20], [96, 18], [88, 22]],
  [[111, 34], [123, 34], [126, 27], [116, 24], [108, 29]],
  [[127, 42], [140, 42], [145, 36], [136, 34], [126, 37]],
];

const EARTH_TERRAIN_OVERLAYS = [
  { fill: "rgba(209, 166, 84, 0.72)", depth: 158, points: [[-17, 32], [8, 33], [30, 27], [34, 17], [15, 16], [-8, 22]] },
  { fill: "rgba(55, 118, 64, 0.4)", depth: 156, points: [[8, 8], [22, 6], [30, -4], [26, -12], [12, -8], [4, 0]] },
  { fill: "rgba(194, 147, 78, 0.55)", depth: 158, points: [[36, 30], [58, 24], [55, 13], [40, 18]] },
  { fill: "rgba(199, 161, 88, 0.5)", depth: 156, points: [[66, 45], [96, 44], [104, 36], [74, 34]] },
  { fill: "rgba(196, 154, 82, 0.58)", depth: 156, points: [[116, -19], [146, -20], [142, -31], [118, -30]] },
  { fill: "rgba(238, 244, 230, 0.5)", depth: 170, points: [[-168, 71], [-150, 72], [-136, 69], [-124, 59], [-138, 60], [-151, 58], [-160, 64]] },
];

const EARTH_RELIEF_RANGES = [
  { points: [[-72, 8], [-74, -8], [-72, -24], [-70, -40], [-67, -54]], width: 5, shelfWidth: 13, color: "rgba(92, 72, 52, 0.72)", highlight: "rgba(246, 232, 190, 0.82)", shadow: "rgba(18, 28, 26, 0.48)", shelf: "rgba(166, 126, 72, 0.36)", depthShelf: 180, depthCrest: 255, depthShadow: 48 },
  { points: [[-151, 61], [-138, 56], [-128, 50], [-119, 42], [-112, 35], [-106, 26], [-103, 20]], width: 4, shelfWidth: 10, color: "rgba(78, 78, 58, 0.62)", highlight: "rgba(230, 224, 184, 0.7)", shadow: "rgba(28, 42, 36, 0.38)", shelf: "rgba(130, 122, 78, 0.3)", depthShelf: 166, depthCrest: 238, depthShadow: 64 },
  { points: [[-124, 52], [-118, 44], [-112, 36], [-106, 28], [-103, 20]], width: 4, shelfWidth: 10, color: "rgba(82, 84, 62, 0.64)", highlight: "rgba(232, 226, 184, 0.72)", shadow: "rgba(26, 42, 34, 0.42)", shelf: "rgba(132, 124, 78, 0.32)", depthShelf: 168, depthCrest: 242, depthShadow: 62 },
  { points: [[-6, 33], [10, 32], [24, 29], [34, 24]], width: 3, shelfWidth: 8, color: "rgba(130, 92, 58, 0.58)", highlight: "rgba(246, 222, 170, 0.66)", shadow: "rgba(48, 42, 32, 0.34)", shelf: "rgba(188, 142, 78, 0.28)", depthShelf: 158, depthCrest: 224, depthShadow: 72 },
  { points: [[36, 31], [44, 28], [52, 22], [56, 15]], width: 3, shelfWidth: 8, color: "rgba(122, 88, 58, 0.56)", highlight: "rgba(244, 222, 176, 0.64)", shadow: "rgba(42, 36, 28, 0.36)", shelf: "rgba(184, 138, 78, 0.28)", depthShelf: 158, depthCrest: 226, depthShadow: 70 },
  { points: [[38, 11], [40, 2], [36, -8], [31, -18], [29, -29]], width: 4, shelfWidth: 9, color: "rgba(98, 78, 58, 0.66)", highlight: "rgba(238, 220, 178, 0.72)", shadow: "rgba(34, 42, 34, 0.42)", shelf: "rgba(142, 112, 70, 0.32)", depthShelf: 168, depthCrest: 246, depthShadow: 58 },
  { points: [[26, 12], [32, 8], [38, 2], [42, -6]], width: 3, shelfWidth: 7, color: "rgba(82, 70, 54, 0.58)", highlight: "rgba(226, 214, 178, 0.62)", shadow: "rgba(28, 38, 30, 0.36)", shelf: "rgba(122, 102, 70, 0.26)", depthShelf: 156, depthCrest: 222, depthShadow: 72 },
  { points: [[45, 40], [55, 41], [65, 42], [78, 45]], width: 3, shelfWidth: 8, color: "rgba(112, 98, 68, 0.52)", highlight: "rgba(234, 228, 190, 0.62)", shadow: "rgba(42, 48, 38, 0.3)", shelf: "rgba(148, 132, 84, 0.26)", depthShelf: 156, depthCrest: 220, depthShadow: 76 },
  { points: [[68, 34], [78, 32], [90, 30], [104, 29]], width: 5, shelfWidth: 14, color: "rgba(144, 132, 86, 0.68)", highlight: "rgba(252, 248, 218, 0.88)", shadow: "rgba(48, 54, 42, 0.46)", shelf: "rgba(176, 156, 92, 0.36)", depthShelf: 188, depthCrest: 255, depthShadow: 52 },
  { points: [[86, 56], [96, 55], [108, 54], [120, 52]], width: 3, shelfWidth: 8, color: "rgba(96, 100, 72, 0.5)", highlight: "rgba(226, 224, 184, 0.58)", shadow: "rgba(38, 48, 38, 0.28)", shelf: "rgba(130, 136, 86, 0.24)", depthShelf: 150, depthCrest: 210, depthShadow: 82 },
  { points: [[145, -18], [150, -25], [153, -33]], width: 3, shelfWidth: 8, color: "rgba(96, 88, 64, 0.5)", highlight: "rgba(230, 220, 180, 0.58)", shadow: "rgba(38, 44, 34, 0.3)", shelf: "rgba(138, 126, 80, 0.24)", depthShelf: 154, depthCrest: 218, depthShadow: 78 },
];

function drawEarthGeography(context, { depth = false } = {}) {
  const landStroke = depth ? "rgba(238, 238, 238, 0.16)" : "rgba(239, 228, 180, 0.24)";
  for (const feature of [...EARTH_LANDMASSES, ...EARTH_ISLANDS]) {
    const shade = depth ? `rgb(${feature.depth}, ${feature.depth}, ${feature.depth})` : feature.fill;
    drawPolygon(context, feature.points, shade, landStroke, depth ? 1.5 : 2);
  }
  for (const cutout of EARTH_COAST_CUTOUTS) {
    drawPolygon(context, cutout, depth ? "rgb(112, 112, 112)" : "#0b63a9", null);
  }
  for (const feature of EARTH_TERRAIN_OVERLAYS) {
    const shade = depth ? `rgb(${feature.depth}, ${feature.depth}, ${feature.depth})` : feature.fill;
    drawPolygon(context, feature.points, shade, depth ? "rgba(242, 242, 242, 0.12)" : "rgba(255, 226, 140, 0.14)", depth ? 1 : 1.5);
  }
  for (const relief of EARTH_RELIEF_RANGES) {
    drawReliefRidge(context, relief.points, { ...relief, depth });
  }
}

export function createPixelEarthTexture(options = {}) {
  const { canvas, context } = createCanvas();
  const random = seededRandom(9127);

  context.fillStyle = "#0b63a9";
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  drawTerrainSmudges(context, random, {
    count: 46,
    colorA: "rgba(62, 184, 224, ALPHA)",
    colorB: "rgba(5, 34, 96, ALPHA)",
    alphaA: 0.08,
    alphaB: 0.1,
    minRadius: 36,
    maxRadius: 170,
    stretch: 0.26,
  });
  drawPixelStreaks(context, random, {
    count: 38,
    color: "rgba(138, 224, 255, 0.15)",
    width: 2,
    minY: TEXTURE_HEIGHT * 0.1,
    maxY: TEXTURE_HEIGHT * 0.9,
    minLength: 0.14,
    maxLength: 0.5,
    wave: 6,
  });

  drawEarthGeography(context);

  drawTerrainSmudges(context, random, {
    count: 8,
    colorA: "rgba(247, 252, 246, ALPHA)",
    colorB: "rgba(205, 232, 242, ALPHA)",
    alphaA: 0.34,
    alphaB: 0.16,
    minY: 0,
    maxY: TEXTURE_HEIGHT * 0.06,
    minRadius: 32,
    maxRadius: 120,
    stretch: 0.16,
  });
  drawTerrainSmudges(context, random, {
    count: 7,
    colorA: "rgba(247, 252, 246, ALPHA)",
    colorB: "rgba(205, 232, 242, ALPHA)",
    alphaA: 0.28,
    alphaB: 0.14,
    minY: TEXTURE_HEIGHT * 0.9,
    maxY: TEXTURE_HEIGHT,
    minRadius: 48,
    maxRadius: 160,
    stretch: 0.14,
  });

  drawPixelStreaks(context, random, {
    count: 18,
    color: "rgba(238, 252, 255, 0.18)",
    width: 1.5,
    minY: TEXTURE_HEIGHT * 0.12,
    maxY: TEXTURE_HEIGHT * 0.88,
    minLength: 0.12,
    maxLength: 0.32,
    wave: 8,
  });

  return finishTexture(canvas, { ...options, pixelated: true });
}

function paintMars(context, random) {
  context.fillStyle = "#a95538";
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  drawTerrainSmudges(context, random, {
    count: 28,
    colorA: "rgba(255, 176, 94, ALPHA)",
    colorB: "rgba(64, 25, 20, ALPHA)",
    alphaA: 0.08,
    alphaB: 0.08,
    minRadius: 24,
    maxRadius: 112,
    stretch: 0.28,
  });
  drawTerrainSmudges(context, random, {
    count: 5,
    colorA: "rgba(226, 108, 58, ALPHA)",
    colorB: "rgba(58, 27, 23, ALPHA)",
    alphaA: 0.1,
    alphaB: 0.09,
    minRadius: 90,
    maxRadius: 210,
    stretch: 0.22,
  });

  context.fillStyle = "rgba(78, 34, 28, 0.24)";
  context.beginPath();
  context.ellipse(TEXTURE_WIDTH * 0.68, TEXTURE_HEIGHT * 0.62, 82, 34, -0.12, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(245, 172, 104, 0.16)";
  context.beginPath();
  context.ellipse(TEXTURE_WIDTH * 0.27, TEXTURE_HEIGHT * 0.42, 98, 28, 0.18, 0, Math.PI * 2);
  context.fill();
  drawPolygon(context, [[-95, 8], [-55, 10], [-22, 4], [18, 8], [38, 1], [2, -8], [-38, -6], [-78, -2]], "rgba(72, 34, 28, 0.28)", null);
  drawLine(context, [[-112, -5], [-76, -9], [-31, -8], [16, -13], [52, -11]], "rgba(54, 24, 22, 0.38)", 4);
  drawLine(context, [[-108, -1], [-72, -6], [-28, -5], [14, -10], [54, -8]], "rgba(255, 162, 92, 0.13)", 2);
  for (const [x, y, radius, darkness] of [
    [0.32, 0.42, 16, 0.68],
    [0.72, 0.63, 22, 0.72],
  ]) {
    drawCrater(context, TEXTURE_WIDTH * x, TEXTURE_HEIGHT * y, radius, random, {
      darkness: 0.08 + darkness * 0.06,
      rim: 0.08 + darkness * 0.12,
      stretch: 0.7,
    });
  }
  context.fillStyle = "rgba(255, 238, 208, 0.48)";
  context.fillRect(0, 0, TEXTURE_WIDTH, 18);
  context.fillStyle = "rgba(255, 238, 208, 0.35)";
  context.fillRect(0, TEXTURE_HEIGHT - 18, TEXTURE_WIDTH, 18);
}

function paintGasGiant(context, random, id, color) {
  const baseColor = new THREE.Color(color);
  const bandCount = id === "jupiter" ? 18 : 14;
  for (let i = 0; i < bandCount; i += 1) {
    const y = Math.floor((i / bandCount) * TEXTURE_HEIGHT / PIXEL) * PIXEL;
    const height = Math.ceil((TEXTURE_HEIGHT / bandCount + 8) / PIXEL) * PIXEL;
    const bandColor = baseColor.clone().offsetHSL(
      (random() - 0.5) * 0.045,
      (random() - 0.5) * 0.16,
      id === "jupiter" ? (random() - 0.5) * 0.28 : (random() - 0.2) * 0.2
    );
    context.fillStyle = `rgba(${Math.floor(bandColor.r * 255)}, ${Math.floor(bandColor.g * 255)}, ${Math.floor(bandColor.b * 255)}, ${0.82 + random() * 0.14})`;
    context.fillRect(0, y, TEXTURE_WIDTH, height);
  }
  drawPixelStreaks(context, random, {
    count: id === "jupiter" ? 58 : 42,
    color: id === "jupiter" ? "rgba(86, 44, 32, 0.24)" : "rgba(255, 245, 196, 0.18)",
    width: id === "jupiter" ? 2 : 1.5,
    minLength: 0.24,
    maxLength: 0.86,
    wave: id === "jupiter" ? 8 : 5,
  });
  if (id === "jupiter") {
    context.fillStyle = "rgba(176, 60, 38, 0.98)";
    context.beginPath();
    context.ellipse(TEXTURE_WIDTH * 0.38, TEXTURE_HEIGHT * 0.58, 42, 19, -0.08, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(234, 128, 72, 0.6)";
    context.beginPath();
    context.ellipse(TEXTURE_WIDTH * 0.37, TEXTURE_HEIGHT * 0.575, 25, 9, -0.14, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(94, 32, 24, 0.34)";
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(TEXTURE_WIDTH * 0.385, TEXTURE_HEIGHT * 0.585, 32, 12, -0.06, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = "rgba(255, 218, 178, 0.46)";
    context.lineWidth = 4;
    context.stroke();
  }
}

function paintExoplanetGasGiant(context, random, color) {
  const baseColor = new THREE.Color(color);
  context.fillStyle = colorToCss(baseColor.clone().offsetHSL(0, -0.04, -0.03));
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  for (let i = 0; i < 17; i += 1) {
    const y = Math.floor((i / 17) * TEXTURE_HEIGHT / PIXEL) * PIXEL;
    const height = Math.ceil((TEXTURE_HEIGHT / 17 + 9) / PIXEL) * PIXEL;
    const bandColor = baseColor.clone().offsetHSL(
      (random() - 0.5) * 0.08,
      -0.04 + random() * 0.2,
      -0.16 + random() * 0.32
    );
    context.fillStyle = `rgba(${Math.floor(bandColor.r * 255)}, ${Math.floor(bandColor.g * 255)}, ${Math.floor(bandColor.b * 255)}, ${0.72 + random() * 0.2})`;
    context.fillRect(0, y, TEXTURE_WIDTH, height);
  }
  drawPixelStreaks(context, random, {
    count: 52,
    color: "rgba(255, 236, 188, 0.18)",
    width: 2,
    minLength: 0.32,
    maxLength: 0.94,
    wave: 8,
  });
  for (let i = 0; i < 3; i += 1) {
    const stormColor = baseColor.clone().offsetHSL(0.04 + random() * 0.04, 0.22, -0.06 + random() * 0.08);
    context.fillStyle = `rgba(${Math.floor(stormColor.r * 255)}, ${Math.floor(stormColor.g * 255)}, ${Math.floor(stormColor.b * 255)}, 0.34)`;
    context.beginPath();
    context.ellipse(
      snap(TEXTURE_WIDTH * (0.2 + random() * 0.62)),
      snap(TEXTURE_HEIGHT * (0.3 + random() * 0.42)),
      22 + random() * 34,
      7 + random() * 12,
      (random() - 0.5) * 0.4,
      0,
      Math.PI * 2
    );
    context.fill();
  }
}

function paintEuropa(context, random) {
  const ice = context.createLinearGradient(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  ice.addColorStop(0, "#f1f5ee");
  ice.addColorStop(0.5, "#d8ddd4");
  ice.addColorStop(1, "#abb8bd");
  context.fillStyle = ice;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  drawTerrainSmudges(context, random, {
    count: 34,
    colorA: "rgba(255, 255, 255, ALPHA)",
    colorB: "rgba(98, 136, 148, ALPHA)",
    alphaA: 0.11,
    alphaB: 0.08,
    minRadius: 18,
    maxRadius: 78,
    stretch: 0.24,
  });
  for (let i = 0; i < 34; i += 1) {
    drawPixelStreaks(context, random, {
      count: 1,
      color: i % 3 === 0 ? "rgba(126, 78, 48, 0.42)" : "rgba(66, 104, 128, 0.2)",
      width: i % 3 === 0 ? 3 : 2,
      minLength: 0.34,
      maxLength: 0.95,
      wave: 16,
    });
  }
}

function paintTitan(context, random) {
  const haze = context.createLinearGradient(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  haze.addColorStop(0, "#f0b36a");
  haze.addColorStop(0.48, "#c2773e");
  haze.addColorStop(1, "#633b2c");
  context.fillStyle = haze;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  drawTerrainSmudges(context, random, {
    count: 44,
    colorA: "rgba(255, 216, 132, ALPHA)",
    colorB: "rgba(62, 38, 28, ALPHA)",
    alphaA: 0.14,
    alphaB: 0.08,
    minRadius: 22,
    maxRadius: 96,
    stretch: 0.3,
  });
  drawPixelStreaks(context, random, {
    count: 26,
    color: "rgba(255, 230, 150, 0.18)",
    width: 3,
    minLength: 0.28,
    maxLength: 0.72,
    wave: 9,
  });
}

function paintPluto(context, random) {
  context.fillStyle = "#a88f79";
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  drawTerrainSmudges(context, random, {
    count: 44,
    colorA: "rgba(226, 204, 178, ALPHA)",
    colorB: "rgba(78, 52, 46, ALPHA)",
    alphaA: 0.13,
    alphaB: 0.14,
    minRadius: 24,
    maxRadius: 118,
    stretch: 0.32,
  });
  context.fillStyle = "rgba(84, 50, 46, 0.22)";
  context.beginPath();
  context.ellipse(TEXTURE_WIDTH * 0.5, TEXTURE_HEIGHT * 0.58, 260, 42, 0.02, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(247, 230, 201, 0.68)";
  context.beginPath();
  context.ellipse(TEXTURE_WIDTH * 0.54, TEXTURE_HEIGHT * 0.47, 96, 48, 0.12, 0, Math.PI * 2);
  context.ellipse(TEXTURE_WIDTH * 0.44, TEXTURE_HEIGHT * 0.48, 52, 42, -0.18, 0, Math.PI * 2);
  context.fill();
  drawTerrainSmudges(context, random, {
    count: 30,
    colorA: "rgba(255, 242, 214, ALPHA)",
    colorB: "rgba(70, 44, 40, ALPHA)",
    alphaA: 0.12,
    alphaB: 0.1,
    minRadius: 18,
    maxRadius: 86,
    stretch: 0.34,
  });
  for (const [x, y, radius] of [
    [0.28, 0.35, 13],
    [0.64, 0.67, 18],
    [0.78, 0.48, 11],
    [0.18, 0.62, 15],
  ]) {
    drawCrater(context, TEXTURE_WIDTH * x, TEXTURE_HEIGHT * y, radius, random, {
      darkness: 0.1,
      rim: 0.13,
      stretch: 0.76,
    });
  }
}

function paintExoplanetSurface(context, random, id = "", color = 0xffffff) {
  const temperate = isTemperateExoplanet(id);
  const base = new THREE.Color(color);
  const ground = base.clone().offsetHSL(0, temperate ? -0.08 : -0.03, temperate ? -0.04 : -0.02);
  const warm = base.clone().offsetHSL(temperate ? 0.035 : 0.018, temperate ? 0.02 : 0.12, 0.09);
  const deep = base.clone().offsetHSL(temperate ? -0.035 : -0.018, temperate ? -0.02 : -0.04, -0.13);

  context.fillStyle = colorToCss(ground);
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  drawTerrainSmudges(context, random, {
    count: temperate ? 48 : 42,
    colorA: colorToAlphaCss(warm),
    colorB: colorToAlphaCss(deep),
    alphaA: temperate ? 0.16 : 0.15,
    alphaB: temperate ? 0.15 : 0.17,
    minY: TEXTURE_HEIGHT * 0.08,
    maxY: TEXTURE_HEIGHT * 0.92,
    minRadius: 20,
    maxRadius: 110,
    stretch: temperate ? 0.4 : 0.3,
  });
  drawTerrainSmudges(context, random, {
    count: 9,
    colorA: colorToAlphaCss(warm.clone().offsetHSL(0.01, 0, 0.04)),
    colorB: colorToAlphaCss(deep.clone().offsetHSL(-0.01, 0, -0.04)),
    alphaA: 0.12,
    alphaB: 0.14,
    minRadius: 82,
    maxRadius: 190,
    stretch: 0.24,
  });
  drawPixelStreaks(context, random, {
    count: temperate ? 24 : 16,
    color: temperate ? "rgba(222, 246, 255, 0.14)" : "rgba(246, 205, 156, 0.12)",
    width: temperate ? 2 : 2.5,
    minY: TEXTURE_HEIGHT * 0.12,
    maxY: TEXTURE_HEIGHT * 0.88,
    minLength: 0.16,
    maxLength: 0.58,
    wave: temperate ? 11 : 8,
  });
}

function paintLuna(context, random, baseColor) {
  context.fillStyle = "#969a98";
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  const maria = [
    [0.58, 0.36, 72, 38, 0.12],
    [0.68, 0.48, 58, 26, -0.16],
    [0.44, 0.53, 42, 24, 0.24],
    [0.54, 0.66, 54, 22, -0.28],
  ];
  context.fillStyle = "rgba(76, 84, 88, 0.52)";
  for (const [x, y, rx, ry, rotation] of maria) {
    context.beginPath();
    context.ellipse(TEXTURE_WIDTH * x, TEXTURE_HEIGHT * y, rx, ry, rotation, 0, Math.PI * 2);
    context.fill();
  }
  drawTerrainSmudges(context, random, {
    count: 28,
    colorA: "rgba(230, 226, 206, ALPHA)",
    colorB: "rgba(36, 34, 32, ALPHA)",
    alphaA: 0.08,
    alphaB: 0.07,
    minRadius: 16,
    maxRadius: 58,
    stretch: 0.32,
  });
  for (const [x, y, r, darkness, rays] of [
    [0.28, 0.62, 24, 0.95, 28],
    [0.42, 0.47, 14, 0.62, 10],
    [0.53, 0.57, 11, 0.52, 8],
    [0.73, 0.39, 16, 0.58, 7],
    [0.62, 0.72, 18, 0.48, 9],
  ]) {
    drawCrater(context, TEXTURE_WIDTH * x, TEXTURE_HEIGHT * y, r, random, {
      darkness: 0.12 + darkness * 0.08,
      rim: 0.18 + darkness * 0.18,
      rays,
      stretch: 0.82,
    });
  }
  for (let i = 0; i < 92; i += 1) {
    const radius = 2.2 + Math.pow(random(), 1.8) * 12;
    drawCrater(
      context,
      random() * TEXTURE_WIDTH,
      random() * TEXTURE_HEIGHT,
      radius,
      random,
      {
        darkness: 0.09 + random() * 0.1,
        rim: 0.12 + random() * 0.16,
        stretch: 0.64 + random() * 0.38,
      }
    );
  }
}

function paintCrateredMoon(context, random, id, color, type) {
  const isIcyMoon = ["europa", "enceladus", "titania", "oberon", "ariel", "triton"].includes(id);
  const isDarkMoon = ["callisto", "iapetus", "charon", "proteus", "nereid"].includes(id);
  const baseColor = new THREE.Color(color);

  if (id === "moon") {
    paintLuna(context, random, baseColor);
    return;
  }
  if (id === "europa") {
    paintEuropa(context, random);
    return;
  }
  if (id === "titan") {
    paintTitan(context, random);
    return;
  }

  const dusty = new THREE.Color(
    isIcyMoon ? 0xdde9eb : isDarkMoon ? 0x8a8075 : id === "io" ? 0xe7b94e : baseColor
  );
  const dustyShade = dusty.clone().offsetHSL(0, -0.04, -0.08);
  const dustyLight = dusty.clone().offsetHSL(0, -0.02, 0.08);
  const terrain = context.createLinearGradient(0, 0, 0, TEXTURE_HEIGHT);
  terrain.addColorStop(0, colorToCss(dustyLight));
  terrain.addColorStop(0.5, colorToCss(dusty));
  terrain.addColorStop(1, colorToCss(dustyShade));
  context.fillStyle = terrain;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  if (id === "io") {
    drawTerrainSmudges(context, random, {
      count: 52,
      colorA: "rgba(255, 230, 82, ALPHA)",
      colorB: "rgba(92, 52, 34, ALPHA)",
      alphaA: 0.24,
      alphaB: 0.24,
      minRadius: 10,
      maxRadius: 46,
      stretch: 0.55,
    });
  } else if (isIcyMoon) {
    drawPixelStreaks(context, random, {
      count: 32,
      color: "rgba(86, 140, 160, 0.28)",
      width: 2,
      minLength: 0.28,
      maxLength: 0.86,
      wave: 13,
    });
  } else {
    drawTerrainSmudges(context, random, {
      count: 30,
      colorA: "rgba(232, 222, 198, ALPHA)",
      colorB: "rgba(22, 20, 18, ALPHA)",
      alphaA: 0.07,
      alphaB: 0.09,
      minRadius: 16,
      maxRadius: 64,
      stretch: 0.36,
    });
  }

  const craterCount = id === "mercury" ? 118 : type === "Major Moon" ? 58 : 48;
  for (let i = 0; i < craterCount; i += 1) {
    const radius = 2.4 + Math.pow(random(), 1.7) * 18;
    drawCrater(
      context,
      random() * TEXTURE_WIDTH,
      random() * TEXTURE_HEIGHT,
      radius,
      random,
      { darkness: 0.08 + random() * 0.12, rim: 0.1 + random() * 0.14, stretch: 0.68 + random() * 0.46 }
    );
  }
}

function fillDepthBase(context, random, base = 132) {
  context.fillStyle = `rgb(${base}, ${base}, ${base})`;
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  drawPixelStreaks(context, random, {
    count: 38,
    color: "rgba(255, 255, 255, 0.08)",
    width: 2,
    minLength: 0.18,
    maxLength: 0.58,
    wave: 5,
  });
}

function paintEarthDepth(context, random) {
  fillDepthBase(context, random, 112);
  drawEarthGeography(context, { depth: true });
  drawPixelStreaks(context, random, {
    count: 24,
    color: "rgba(0, 0, 0, 0.08)",
    width: 1.5,
    minY: TEXTURE_HEIGHT * 0.12,
    maxY: TEXTURE_HEIGHT * 0.88,
    minLength: 0.16,
    maxLength: 0.42,
    wave: 5,
  });
}

function paintLunaDepth(context, random) {
  fillDepthBase(context, random, 136);
  context.fillStyle = "rgba(26, 26, 26, 0.46)";
  for (const [x, y, rx, ry, rotation] of [
    [0.58, 0.36, 78, 42, 0.12],
    [0.68, 0.48, 64, 30, -0.16],
    [0.44, 0.53, 48, 28, 0.24],
    [0.54, 0.66, 60, 26, -0.28],
    [0.34, 0.34, 42, 22, 0.05],
  ]) {
    context.beginPath();
    context.ellipse(TEXTURE_WIDTH * x, TEXTURE_HEIGHT * y, rx, ry, rotation, 0, Math.PI * 2);
    context.fill();
  }
  context.strokeStyle = "rgba(244, 244, 244, 0.22)";
  context.lineWidth = 2;
  for (const [x, y, rx, ry, rotation] of [
    [0.58, 0.36, 80, 44, 0.12],
    [0.68, 0.48, 66, 32, -0.16],
    [0.44, 0.53, 50, 30, 0.24],
  ]) {
    context.beginPath();
    context.ellipse(TEXTURE_WIDTH * x, TEXTURE_HEIGHT * y, rx, ry, rotation, 0, Math.PI * 2);
    context.stroke();
  }
  for (const [x, y, r, rays] of [
    [0.28, 0.62, 28, 36],
    [0.42, 0.47, 18, 14],
    [0.53, 0.57, 15, 10],
    [0.73, 0.39, 19, 12],
    [0.62, 0.72, 21, 14],
    [0.22, 0.34, 16, 8],
  ]) {
    drawDepthCrater(context, TEXTURE_WIDTH * x, TEXTURE_HEIGHT * y, r, random, {
      floor: 14 + random() * 12,
      rim: 252,
      shelf: 96,
      rays,
      stretch: 0.72 + random() * 0.18,
    });
  }
  for (let i = 0; i < 165; i += 1) {
    const radius = 2.2 + Math.pow(random(), 1.8) * 17;
    drawDepthCrater(
      context,
      random() * TEXTURE_WIDTH,
      random() * TEXTURE_HEIGHT,
      radius,
      random,
      {
        floor: 28 + random() * 22,
        rim: 202 + random() * 50,
        shelf: 88 + random() * 28,
        stretch: 0.62 + random() * 0.38,
      }
    );
  }
}

function paintMarsDepth(context, random) {
  fillDepthBase(context, random, 128);
  context.fillStyle = "rgb(164, 164, 164)";
  context.beginPath();
  context.ellipse(TEXTURE_WIDTH * 0.27, TEXTURE_HEIGHT * 0.42, 112, 30, 0.18, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgb(72, 72, 72)";
  context.beginPath();
  context.ellipse(TEXTURE_WIDTH * 0.68, TEXTURE_HEIGHT * 0.62, 86, 36, -0.12, 0, Math.PI * 2);
  context.fill();
  drawLine(context, [[-140, -7], [-92, -10], [-42, -8], [8, -15], [72, -12], [126, -16]], "rgba(22, 22, 22, 0.5)", 5);
  drawLine(context, [[-132, -2], [-76, -7], [-16, -6], [42, -10], [110, -8]], "rgba(0, 0, 0, 0.42)", 3);
  drawLine(context, [[-120, 16], [-64, 10], [10, 12], [62, 7], [126, 11]], "rgba(255, 255, 255, 0.2)", 3);
  drawPixelStreaks(context, random, {
    count: 24,
    color: "rgba(0, 0, 0, 0.1)",
    width: 2,
    minLength: 0.18,
    maxLength: 0.55,
    wave: 7,
  });
  for (const [x, y, radius, floor, rim] of [
    [0.32, 0.42, 19, 42, 226],
    [0.48, 0.51, 13, 48, 218],
    [0.72, 0.63, 25, 32, 236],
    [0.18, 0.58, 15, 52, 212],
  ]) {
    drawDepthCrater(context, TEXTURE_WIDTH * x, TEXTURE_HEIGHT * y, radius, random, {
      floor,
      rim,
      shelf: 92,
      stretch: 0.7,
    });
  }
  for (let i = 0; i < 38; i += 1) {
    const radius = 3.5 + Math.pow(random(), 1.75) * 17;
    drawDepthCrater(context, random() * TEXTURE_WIDTH, random() * TEXTURE_HEIGHT, radius, random, {
      floor: 36 + random() * 24,
      rim: 202 + random() * 36,
      shelf: 90 + random() * 24,
      stretch: 0.68 + random() * 0.32,
    });
  }
}

function paintPlutoDepth(context, random) {
  fillDepthBase(context, random, 140);
  context.fillStyle = "rgb(88, 88, 88)";
  context.beginPath();
  context.ellipse(TEXTURE_WIDTH * 0.5, TEXTURE_HEIGHT * 0.58, 260, 42, 0.02, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgb(194, 194, 194)";
  context.beginPath();
  context.ellipse(TEXTURE_WIDTH * 0.54, TEXTURE_HEIGHT * 0.47, 102, 52, 0.12, 0, Math.PI * 2);
  context.ellipse(TEXTURE_WIDTH * 0.44, TEXTURE_HEIGHT * 0.48, 58, 46, -0.18, 0, Math.PI * 2);
  context.fill();
  drawPixelStreaks(context, random, {
    count: 22,
    color: "rgba(255, 255, 255, 0.12)",
    width: 2,
    minLength: 0.18,
    maxLength: 0.56,
    wave: 8,
  });
  for (let i = 0; i < 62; i += 1) {
    const radius = 3 + Math.pow(random(), 1.72) * 16;
    drawDepthCrater(context, random() * TEXTURE_WIDTH, random() * TEXTURE_HEIGHT, radius, random, {
      floor: 34 + random() * 32,
      rim: 206 + random() * 44,
      shelf: 88 + random() * 36,
      rays: random() > 0.93 ? 6 + Math.floor(random() * 8) : 0,
      stretch: 0.64 + random() * 0.34,
    });
  }
}

function paintCraterDepth(context, random, id, type) {
  const isIcyMoon = ["europa", "enceladus", "titania", "oberon", "ariel", "triton"].includes(id);
  const isDarkMoon = ["callisto", "iapetus", "charon", "proteus", "nereid"].includes(id);
  const base = isIcyMoon ? 154 : isDarkMoon ? 118 : id === "mercury" ? 126 : id === "pluto" ? 142 : 132;
  fillDepthBase(context, random, base);

  if (id === "moon") {
    paintLunaDepth(context, random);
    return;
  }
  if (id === "europa") {
    fillDepthBase(context, random, 156);
    drawPixelStreaks(context, random, {
      count: 46,
      color: "rgba(30, 30, 30, 0.4)",
      width: 3,
      minLength: 0.34,
      maxLength: 0.95,
      wave: 16,
    });
    drawPixelStreaks(context, random, {
      count: 24,
      color: "rgba(255, 255, 255, 0.25)",
      width: 1.5,
      minLength: 0.26,
      maxLength: 0.82,
      wave: 12,
    });
    return;
  }
  if (id === "titan") {
    fillDepthBase(context, random, 118);
    drawPixelStreaks(context, random, {
      count: 22,
      color: "rgba(255, 255, 255, 0.08)",
      width: 5,
      minLength: 0.22,
      maxLength: 0.7,
      wave: 8,
    });
    return;
  }
  if (id === "pluto") {
    context.fillStyle = "rgba(245, 245, 245, 0.32)";
    context.beginPath();
    context.ellipse(TEXTURE_WIDTH * 0.54, TEXTURE_HEIGHT * 0.47, 100, 50, 0.12, 0, Math.PI * 2);
    context.ellipse(TEXTURE_WIDTH * 0.44, TEXTURE_HEIGHT * 0.48, 56, 44, -0.18, 0, Math.PI * 2);
    context.fill();
  }

  const craterCount = id === "mercury" ? 155 : type === "Major Moon" ? 98 : 72;
  for (let i = 0; i < craterCount; i += 1) {
    const radius = 2.4 + Math.pow(random(), 1.65) * (id === "mercury" ? 21 : 18);
    drawDepthCrater(
      context,
      random() * TEXTURE_WIDTH,
      random() * TEXTURE_HEIGHT,
      radius,
      random,
      {
        floor: isIcyMoon ? 54 : 22 + random() * 26,
        rim: isIcyMoon ? 238 : 204 + random() * 48,
        shelf: isIcyMoon ? 120 : 78 + random() * 34,
        rays: random() > 0.88 ? 8 + Math.floor(random() * 10) : 0,
        stretch: 0.6 + random() * 0.44,
      }
    );
  }
}

export function createPixelBodyDepthTexture({ id, type = "Planet" } = {}, options = {}) {
  const { canvas, context } = createCanvas();
  const random = seededRandom(seedFromText(`${id ?? type}-depth`, 23, 993));
  if (id === "earth") {
    paintEarthDepth(context, random);
  } else if (id === "mars") {
    paintMarsDepth(context, random);
  } else if (id === "pluto") {
    paintPlutoDepth(context, random);
  } else {
    paintCraterDepth(context, random, id, type);
  }
  return finishTexture(canvas, {
    ...options,
    pixelated: true,
    colorSpace: THREE.NoColorSpace,
  });
}

export function createPixelBodyTexture({ id, color = 0xffffff, type = "Planet" } = {}, options = {}) {
  const { canvas, context } = createCanvas();
  const random = seededRandom(seedFromText(id ?? type, 11));

  context.fillStyle = colorToCss(color);
  context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  if (type === "Star") {
    const gradient = context.createRadialGradient(
      TEXTURE_WIDTH * 0.5,
      TEXTURE_HEIGHT * 0.5,
      12,
      TEXTURE_WIDTH * 0.5,
      TEXTURE_HEIGHT * 0.5,
      TEXTURE_WIDTH * 0.58
    );
    gradient.addColorStop(0, "rgba(255, 255, 230, 1)");
    gradient.addColorStop(0.45, "rgba(255, 204, 92, 0.92)");
    gradient.addColorStop(1, "rgba(238, 100, 32, 0.74)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    drawPixelStreaks(context, random, { count: 38, color: "rgba(255, 248, 180, 0.35)", width: 3, minLength: 0.42, maxLength: 0.92, wave: 10 });
  } else if (id === "venus") {
    const cloud = context.createLinearGradient(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    cloud.addColorStop(0, "rgba(255, 239, 183, 0.95)");
    cloud.addColorStop(0.5, "rgba(224, 170, 93, 0.9)");
    cloud.addColorStop(1, "rgba(255, 232, 176, 0.92)");
    context.fillStyle = cloud;
    context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    drawAtmosphereClouds(context, random, "venus");
  } else if (id === "mars") {
    paintMars(context, random);
  } else if (id === "jupiter" || id === "saturn") {
    paintGasGiant(context, random, id === "saturn" ? "saturn" : "jupiter", color);
  } else if (type === "Hot Jupiter") {
    paintExoplanetGasGiant(context, random, color);
  } else if (id === "pluto") {
    paintPluto(context, random);
  } else if (type.includes("Exoplanet") || type === "Super Earth") {
    paintExoplanetSurface(context, random, id, color);
  } else if (id === "uranus" || id === "neptune") {
    const gas = context.createLinearGradient(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    gas.addColorStop(0, id === "uranus" ? "rgba(165, 244, 255, 0.95)" : "rgba(90, 138, 255, 0.95)");
    gas.addColorStop(0.52, id === "uranus" ? "rgba(106, 213, 230, 0.94)" : "rgba(28, 72, 186, 0.96)");
    gas.addColorStop(1, id === "uranus" ? "rgba(214, 255, 252, 0.86)" : "rgba(112, 168, 255, 0.9)");
    context.fillStyle = gas;
    context.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    drawPixelStreaks(context, random, { count: 18, color: id === "neptune" ? "rgba(210, 230, 255, 0.2)" : "rgba(255, 255, 255, 0.14)", width: 4, minLength: 0.32, maxLength: 0.82, wave: 7 });
  } else if (id === "moon" || type === "Major Moon" || id === "mercury" || id === "ceres") {
    paintCrateredMoon(context, random, id, color, type);
  } else {
    fillPixelNoise(context, random, {
      count: 180,
      colorA: "rgba(255, 255, 255, ALPHA)",
      colorB: "rgba(0, 0, 0, ALPHA)",
      alphaA: 0.08,
      alphaB: 0.08,
      minSize: 1,
      maxSize: 4,
    });
  }

  return finishTexture(canvas, {
    ...options,
    pixelated: id === "mars" || id === "jupiter" || id === "saturn" || id === "pluto" || id === "moon" || type === "Major Moon" || id === "mercury" || id === "ceres" || type.includes("Exoplanet") || type === "Super Earth",
  });
}
