export const MAX_ZOOM = 48.25;

export const scaleBands = [
  {
    key: "planet",
    title: "Planet",
    range: "10^6-10^8 m",
    center: 0.25,
    width: 1.35,
    scale: 1.05,
    anchor: [0, 0, 0],
    opacityProfile: { fullStart: -0.2, fullEnd: 0.88, fadeOutEnd: 1.08, power: 1.08 },
  },
  {
    key: "system",
    title: "Solar System",
    range: "10^9-10^13 m",
    center: 1.78,
    width: 1.42,
    scale: 1.0,
    anchor: [0, 0, 0],
    opacityProfile: { fadeInStart: 0.82, fullStart: 1.02, fullEnd: 2.22, fadeOutEnd: 2.58, power: 1.1 },
  },
  {
    key: "stellar",
    title: "Stellar Neighborhood",
    range: "10^14-10^17 m",
    center: 3.0,
    width: 1.86,
    scale: 1.0,
    anchor: [0, 0, 0],
    opacityProfile: { fadeInStart: 2.22, fullStart: 2.5, fullEnd: 4.0, fadeOutEnd: 4.38, power: 1.05 },
  },
  {
    key: "galaxy",
    title: "Galaxy",
    range: "10^18-10^21 m",
    center: 5.0,
    width: 2.15,
    scale: 1.0,
    anchor: [0, 0, 0],
    emergenceAnchor: [51, 2.3, -33],
    opacityProfile: { fadeInStart: 3.62, fullStart: 4.08, fullEnd: 6.0, fadeOutEnd: 6.42, power: 1.05 },
  },
  {
    key: "cluster",
    title: "Local Group",
    range: "10^22-10^23 m",
    center: 6.96,
    width: 1.76,
    scale: 1.0,
    anchor: [0, 0, 0],
    emergenceAnchor: [14.7, -0.9, 0.1],
    opacityProfile: { fadeInStart: 5.88, fullStart: 6.42, fullEnd: 7.62, fadeOutEnd: 8.02, power: 1.06 },
  },
  {
    key: "laniakea",
    title: "Laniakea Supercluster",
    range: "10^24-10^25 m",
    center: 8.45,
    width: 1.84,
    scale: 1.0,
    anchor: [0, 0, 0],
    emergenceAnchor: [-31, 5, -16],
  },
  {
    key: "web",
    title: "Cosmic Web",
    range: "10^26+ m",
    center: 10.0,
    width: 1.9,
    scale: 1.0,
    anchor: [-12, -4, -8],
  },
];

export const LANIAKEA_NESTED_VIEW_FLOOR = 7.12;
export const LANIAKEA_NESTED_VIEW_ZOOM = 7.28;
export const PARENT_OCCLUSION_BANDS = new Set(["laniakea", "stellar", "system"]);

export const scaleReferenceByBand = {
  planet: "Reference: resolved worlds, major moons, rings, and close inspection anchors.",
  system: "Reference: Solar System distances are compressed; orbital periods and spins are relative cues.",
  stellar: "Reference: nearby stars, nebulae, and confirmed exoplanet systems inside the Milky Way.",
  galaxy: "Reference: Milky Way-scale structures, clusters, nebula complexes, and compact black-hole anchors.",
  cluster: "Reference: the Local Group is home-biased: Milky Way, Andromeda, Triangulum, and companion dwarfs.",
  laniakea: "Reference: Laniakea is a constellation-like flow map from the Local Group toward nearby clusters and attractors.",
  web: "Reference: the top web is a continuous density field: bright knots, purple filaments, and dark void space.",
};
