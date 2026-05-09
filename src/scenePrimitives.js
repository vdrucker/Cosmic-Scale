import * as THREE from "three";
import { clamp } from "./cosmicMath.js";

export function createMaterial(MaterialType, options, baseOpacity = options.opacity ?? 1) {
  const material = new MaterialType({
    ...options,
    transparent: true,
    opacity: baseOpacity,
  });
  material.userData.baseOpacity = baseOpacity;
  return material;
}

export function getMaterialEntries(group, renderCacheVersion) {
  if (group.userData.materialEntriesVersion === renderCacheVersion && group.userData.materialEntries) {
    return group.userData.materialEntries;
  }
  const entries = [];
  group.traverse((object) => {
    const material = object.material;
    if (!material) {
      return;
    }
    entries.push({
      object,
      materials: Array.isArray(material) ? material : [material],
    });
  });
  group.userData.materialEntries = entries;
  group.userData.materialEntriesVersion = renderCacheVersion;
  return entries;
}

export function setObjectOpacity(group, opacity, elapsed, renderCacheVersion) {
  for (const entry of getMaterialEntries(group, renderCacheVersion)) {
    for (const item of entry.materials) {
      const baseOpacity = item.userData.baseOpacity ?? 1;
      let shimmer = 1;
      if (Number.isFinite(item.userData.twinkleAmount)) {
        const speed = item.userData.twinkleSpeed ?? 1;
        const phase = item.userData.twinklePhase ?? 0;
        const amount = item.userData.twinkleAmount;
        shimmer = 1 - amount * 0.5 + amount * (0.5 + 0.5 * Math.sin(elapsed * speed + phase));
      }
      item.opacity = clamp(baseOpacity * opacity * shimmer, 0, 1);
      item.depthWrite = opacity > 0.85 && baseOpacity >= 0.98;
    }
  }
}

export function createGlowSphere(radius, color, opacity) {
  const material = createMaterial(
    THREE.MeshBasicMaterial,
    {
      color,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    },
    opacity
  );
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), material);
}

export function createOrbitRing(radius, color, opacity = 0.3, segments = 192, zScale = 1) {
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    points.push(Math.cos(t) * radius, 0, Math.sin(t) * radius * zScale);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const material = createMaterial(
    THREE.LineBasicMaterial,
    {
      color,
      blending: THREE.AdditiveBlending,
    },
    opacity
  );
  return new THREE.LineLoop(geometry, material);
}

export function createPointCloud(points, size, opacity, useVertexColors = false) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.positions, 3));
  if (useVertexColors) {
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(points.colors, 3));
  }
  const material = createMaterial(
    THREE.PointsMaterial,
    {
      color: useVertexColors ? 0xffffff : points.color,
      size,
      sizeAttenuation: true,
      vertexColors: useVertexColors,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    },
    opacity
  );
  return new THREE.Points(geometry, material);
}
