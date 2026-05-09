const VISUAL_SOURCE_POLICIES = {
  procedural: "procedural workbench",
  sourcePlate: "source plate + renderer",
  bespoke: "bespoke workbench",
  catalog: "catalog scaffold",
  simulated: "simulated field",
};

export const VISUAL_GRAMMAR = {
  object: {
    renderer: "selectable anchor",
    selection: "inspection focus",
    motion: "context drift",
    lighting: "layer bloom",
    layers: ["anchor", "selection halo"],
  },
  "star-system": {
    renderer: "plasma core",
    selection: "system portal or stellar inspection",
    motion: "slow spin, flare tongues",
    lighting: "emissive corona",
    layers: ["stellar core", "corona", "prominence arcs", "orbit scaffold"],
  },
  "brown-dwarf": {
    renderer: "substellar banded ember",
    selection: "infrared dwarf inspection",
    motion: "slow weather roll",
    lighting: "muted internal heat",
    layers: ["dim core", "infrared bands", "storm flecks", "weak corona"],
  },
  planet: {
    renderer: "body detail",
    selection: "planet inspection",
    motion: "spin plus local moons",
    lighting: "engine terminator with optional atmosphere",
    layers: ["albedo/source plate", "relief map", "cloud volume", "rings/moons"],
  },
  moon: {
    renderer: "body detail",
    selection: "moon inspection",
    motion: "parented orbit, paused close",
    lighting: "engine terminator with crater relief",
    layers: ["albedo/source plate", "crater relief", "ejecta/fracture hints"],
  },
  nebula: {
    renderer: "pixel gas morphology",
    selection: "volumetric inspection",
    motion: "breathing cloud drift",
    lighting: "internal gas glow",
    layers: ["ionized gas", "dust lanes", "hot cores", "veil drift"],
  },
  supernova: {
    renderer: "ruptured pixel shell",
    selection: "remnant inspection",
    motion: "shell twinkle",
    lighting: "shock-front glow",
    layers: ["expanding shell", "filament knots", "hot rim"],
  },
  pulsar: {
    renderer: "opposed pixel beams",
    selection: "beacon inspection",
    motion: "fast axial sweep",
    lighting: "beam pulse",
    layers: ["compact core", "beam cones", "pulse bands"],
  },
  "neutron-star": {
    renderer: "compact thermal remnant",
    selection: "remnant inspection",
    motion: "surface shimmer",
    lighting: "hard blue-white core",
    layers: ["compact core", "thermal speckles", "weak magnetosphere"],
  },
  magnetar: {
    renderer: "fractured magnetosphere",
    selection: "magnetar inspection",
    motion: "violent field churn",
    lighting: "X-ray flare corona",
    layers: ["compact core", "magnetic loops", "burst knots", "shock veil"],
  },
  "x-ray-binary": {
    renderer: "accreting compact binary",
    selection: "binary inspection",
    motion: "orbital stream and disk churn",
    lighting: "blue-white X-ray core",
    layers: ["donor star", "compact core", "accretion bridge", "shock wake"],
  },
  "black-hole": {
    renderer: "shadow, disk, lensing shear",
    selection: "observatory inspection",
    motion: "disk spin",
    lighting: "accretion contrast",
    layers: ["shadow", "accretion disk", "photon ring", "lensing shear"],
  },
  quasar: {
    renderer: "pixel jet core",
    selection: "active nucleus inspection",
    motion: "jet pulse",
    lighting: "active galactic nucleus",
    layers: ["accretion core", "bipolar jets", "host shimmer"],
  },
  galaxy: {
    renderer: "miniature galaxy field",
    selection: "family zoom",
    motion: "slow axial rotation",
    lighting: "stellar-core bloom",
    layers: ["stellar disk", "dust lanes", "core glow", "halo scatter"],
  },
  "stellar-assembly": {
    renderer: "cluster point swarm",
    selection: "cluster inspection",
    motion: "old-star churn",
    lighting: "many-body sparkle",
    layers: ["member stars", "core density", "halo scatter"],
  },
  comet: {
    renderer: "icy nucleus with ion tail",
    selection: "small-body inspection",
    motion: "sunward coma and tail drift",
    lighting: "cold reflected glow",
    layers: ["nucleus", "coma", "dust tail", "ion filament"],
  },
  "small-body": {
    renderer: "minor-body swarm",
    selection: "architecture inspection",
    motion: "orbital scatter",
    lighting: "low-albedo glints",
    layers: ["rocky bodies", "dust lanes", "family arcs", "shepherd sparks"],
  },
  "circumstellar-disk": {
    renderer: "dust and debris disk",
    selection: "disk inspection",
    motion: "warped grain drift",
    lighting: "rim-lit dust",
    layers: ["inner gap", "debris ring", "warps", "embedded grains"],
  },
  "dark-cloud": {
    renderer: "negative-space molecular cloud",
    selection: "cold cloud inspection",
    motion: "slow absorption drift",
    lighting: "rim-lit darkness",
    layers: ["dust silhouette", "cold rim", "embedded sparks", "absorption veil"],
  },
  "cosmic-web": {
    renderer: "rhizomatic pixel filament",
    selection: "structure zoom",
    motion: "slow flow",
    lighting: "filament glow around voids",
    layers: ["nodes", "braided filaments", "void rims", "deep regress"],
  },
  void: {
    renderer: "negative-space shear",
    selection: "absence inspection",
    motion: "boundary drift",
    lighting: "rim-lit darkness",
    layers: ["silence core", "boundary shear", "absence wake"],
  },
};

const PLANET_ARCHETYPES = [
  { match: ["lava", "ultra-hot", "hot jupiter", "hot saturn"], archetype: "scorched world", tags: ["thermal", "close orbit", "high contrast"] },
  { match: ["gas giant", "jupiter", "saturn", "neptune", "mini neptune", "warm neptune"], archetype: "storm-banded giant", tags: ["banded", "cloud deck", "fluid weather"] },
  { match: ["ocean", "hycean", "habitable", "temperate"], archetype: "jewel ocean world", tags: ["specular water", "cloud volume", "temperate"] },
  { match: ["icy", "ice", "cold"], archetype: "ice world", tags: ["cold palette", "fracture lines", "soft relief"] },
  { match: ["crater", "dwarf", "mercury", "ceres", "pluto"], archetype: "cratered planetoid", tags: ["relief", "impact basins", "lonely"] },
  { match: ["rocky", "super earth", "terrestrial"], archetype: "rocky terrestrial", tags: ["relief", "erosion", "surface plate"] },
];

const MOON_ARCHETYPES = [
  { match: ["titan"], archetype: "hazy moon", tags: ["haze", "muted surface", "attached atmosphere"] },
  { match: ["europa", "enceladus", "triton", "icy"], archetype: "fractured ice moon", tags: ["ice shell", "cracks", "low relief"] },
  { match: ["io", "volcanic"], archetype: "volcanic moon", tags: ["sulfur", "caldera", "tidal heat"] },
  { match: ["moon", "luna", "crater"], archetype: "cratered moon", tags: ["craters", "maria", "relief"] },
];

const STELLAR_ARCHETYPES = [
  { match: ["brown-dwarf"], archetype: "substellar ember", tags: ["infrared", "dim corona", "banded heat"] },
  { match: ["white-dwarf"], archetype: "compact remnant", tags: ["small core", "hard glow", "quiet"] },
  { match: ["red-supergiant", "supergiant"], archetype: "swollen turbulent star", tags: ["giant corona", "slow convective cells", "prominences"] },
  { match: ["red-dwarf"], archetype: "flare dwarf", tags: ["spot cycles", "red corona", "compact"] },
  { match: ["blue", "white"], archetype: "hot luminous star", tags: ["blue-white bloom", "tight spots", "fast shimmer"] },
  { match: ["giant"], archetype: "evolved warm star", tags: ["orange shell", "large granulation", "slow pulse"] },
];

const GALAXY_ARCHETYPES = [
  { match: ["irregular", "merger", "interacting", "peculiar"], archetype: "disturbed galaxy", tags: ["tidal tails", "offset cores", "asymmetry"] },
  { match: ["barred"], archetype: "barred spiral", tags: ["bar", "arms", "dust lanes"] },
  { match: ["elliptical"], archetype: "elliptical glow", tags: ["spheroid", "soft halo", "old stars"] },
  { match: ["spiral"], archetype: "spiral disk", tags: ["arms", "core", "blue knots"] },
];

function textForProfile(input = {}) {
  return [
    input.id,
    input.name,
    input.type,
    input.meta,
    input.summary,
    input.visualProfile,
    input.sourceBodyId,
    input.morphology,
    input.spectral,
    input.starType,
    input.kind,
    input.family,
    input.habitable ? "habitable temperate" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function pickArchetype(input, choices, fallback) {
  const text = textForProfile(input);
  return choices.find((choice) => choice.match.some((token) => text.includes(token))) ?? fallback;
}

function compactTags(tags = []) {
  return [...new Set(tags.filter(Boolean))].slice(0, 6);
}

function getSourcePolicy(input = {}, family = "object") {
  if (input.sourceBodyId) {
    return VISUAL_SOURCE_POLICIES.sourcePlate;
  }
  if (family === "planet" || family === "moon") {
    const id = input.id ?? input.visualProfile;
    if (["earth", "mars", "pluto", "moon", "ceres"].includes(id)) {
      return VISUAL_SOURCE_POLICIES.bespoke;
    }
    return VISUAL_SOURCE_POLICIES.procedural;
  }
  if (family === "cosmic-web" || family === "stellar-assembly") {
    return VISUAL_SOURCE_POLICIES.simulated;
  }
  return input.catalogKind ? VISUAL_SOURCE_POLICIES.catalog : VISUAL_SOURCE_POLICIES.procedural;
}

function getPlanetWorkbench(input, grammar) {
  const fallback = { archetype: "planetary body", tags: ["surface", "lighting", "scale"] };
  const picked = pickArchetype(input, PLANET_ARCHETYPES, fallback);
  return {
    archetype: picked.archetype,
    source: getSourcePolicy(input, "planet"),
    renderer: grammar.renderer,
    layers: grammar.layers,
    motion: grammar.motion,
    lighting: grammar.lighting,
    tags: compactTags([...picked.tags, input.habitable ? "habitable candidate" : null]),
  };
}

function getMoonWorkbench(input, grammar) {
  const fallback = { archetype: "satellite body", tags: ["crater relief", "parented orbit", "close inspection"] };
  const picked = pickArchetype(input, MOON_ARCHETYPES, fallback);
  return {
    archetype: picked.archetype,
    source: getSourcePolicy(input, "moon"),
    renderer: grammar.renderer,
    layers: grammar.layers,
    motion: grammar.motion,
    lighting: grammar.lighting,
    tags: compactTags(picked.tags),
  };
}

function getStarWorkbench(input, grammar) {
  const fallback = { archetype: "stellar plasma", tags: ["corona", "spot cycle", "emissive"] };
  const picked = pickArchetype(input, STELLAR_ARCHETYPES, fallback);
  return {
    archetype: picked.archetype,
    source: getSourcePolicy(input, "star-system"),
    renderer: grammar.renderer,
    layers: grammar.layers,
    motion: grammar.motion,
    lighting: grammar.lighting,
    tags: compactTags(picked.tags),
  };
}

function getGalaxyWorkbench(input, grammar) {
  const fallback = { archetype: "galaxy field", tags: ["core", "halo", "stellar dust"] };
  const picked = pickArchetype(input, GALAXY_ARCHETYPES, fallback);
  return {
    archetype: picked.archetype,
    source: getSourcePolicy(input, "galaxy"),
    renderer: grammar.renderer,
    layers: grammar.layers,
    motion: grammar.motion,
    lighting: grammar.lighting,
    tags: compactTags([...picked.tags, input.activeCore ? "active core" : null]),
  };
}

function getDefaultWorkbench(input, family, grammar) {
  return {
    archetype: input.morphology ?? input.kind ?? input.spectral ?? family,
    source: getSourcePolicy(input, family),
    renderer: grammar.renderer,
    layers: grammar.layers,
    motion: grammar.motion,
    lighting: grammar.lighting,
    tags: compactTags([
      family,
      input.morphology,
      input.kind,
      input.voidNode ? "negative space" : null,
      input.activeCore ? "active core" : null,
    ]),
  };
}

export function getVisualGrammar(family) {
  return VISUAL_GRAMMAR[family] ?? VISUAL_GRAMMAR.object;
}

export function getVisualWorkbenchProfile(input = {}) {
  const family = input.family ?? "object";
  const grammar = getVisualGrammar(family);
  const profile = family === "planet"
    ? getPlanetWorkbench(input, grammar)
    : family === "moon"
      ? getMoonWorkbench(input, grammar)
      : family === "star-system" || family === "brown-dwarf"
        ? getStarWorkbench(input, grammar)
        : family === "galaxy"
          ? getGalaxyWorkbench(input, grammar)
          : getDefaultWorkbench(input, family, grammar);

  return {
    key: `${family}:${profile.archetype}`,
    family,
    ...profile,
  };
}
