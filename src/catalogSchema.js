import { getVisualWorkbenchProfile } from "./visualProfiles.js";

const CATALOG_SCHEMA_VERSION = 1;

const catalogDefaults = {
  stars: { band: "stellar", family: "star-system", dataStatus: "modeled" },
  exoplanetSystems: { band: "stellar", family: "star-system", dataStatus: "modeled" },
  nebulae: { band: "stellar", family: "nebula", dataStatus: "modeled" },
  galacticObjects: { band: "galaxy", dataStatus: "modeled" },
  localGroupPrimaryGalaxies: { band: "cluster", family: "galaxy", dataStatus: "modeled" },
  localGroupGalaxies: { band: "cluster", family: "galaxy", dataStatus: "modeled" },
  laniakeaGalaxies: { band: "laniakea", family: "galaxy", dataStatus: "modeled" },
  webKnots: { band: "web", family: "cosmic-web", dataStatus: "modeled" },
};

const requiredFields = {
  stars: ["id", "name", "position", "radius"],
  exoplanetSystems: ["id", "name", "position", "radius", "planets"],
  nebulae: ["id", "name", "position", "radius"],
  galacticObjects: ["id", "name", "position", "radius", "family"],
  localGroupPrimaryGalaxies: ["id", "name", "position", "radius"],
  localGroupGalaxies: ["id", "parent", "name", "position", "radius"],
  laniakeaGalaxies: ["id", "parent", "name", "offset", "radius"],
  webKnots: ["id", "name", "position", "radius"],
};

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeVector3(value, fallback = [0, 0, 0]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  return [
    finiteNumber(value[0], fallback[0]),
    finiteNumber(value[1], fallback[1]),
    finiteNumber(value[2], fallback[2]),
  ];
}

function normalizeStats(stats) {
  if (!Array.isArray(stats)) {
    return [];
  }
  return stats
    .filter((stat) => stat && stat.value !== undefined && stat.label)
    .map((stat) => ({ value: String(stat.value), label: String(stat.label) }));
}

function normalizeConnectors(connectTo) {
  if (!Array.isArray(connectTo)) {
    return [];
  }
  return [...new Set(connectTo.filter(Boolean).map(String))];
}

function normalizePlanet(planet, systemId, index) {
  const id = planet?.id ? String(planet.id) : `${systemId}-planet-${index + 1}`;
  const normalized = {
    ...planet,
    id,
    name: planet?.name ? String(planet.name) : id,
    type: planet?.type ? String(planet.type) : "Exoplanet",
    radiusScale: finiteNumber(planet?.radiusScale, 0.18),
    periodDays: finiteNumber(planet?.periodDays, null),
    phase: finiteNumber(planet?.phase, index * 1.2),
    stats: normalizeStats(planet?.stats),
    dataStatus: planet?.dataStatus ?? "modeled",
  };
  normalized.visual = {
    profile: normalized.visualProfile ?? normalized.sourceBodyId ?? normalized.type,
    family: "planet",
    color: normalized.color ?? null,
    workbench: getVisualWorkbenchProfile({
      ...normalized,
      family: "planet",
      hostSystemId: systemId,
    }),
    ...(normalized.visual ?? {}),
  };
  return normalized;
}

function getVisualProfile(kind, entry) {
  if (entry.visualProfile) return entry.visualProfile;
  if (entry.family) return entry.family;
  if (entry.morphology) return `nebula:${entry.morphology}`;
  if (entry.spectral) return `star:${entry.spectral}`;
  if (entry.starType) return `star:${entry.starType}`;
  if (entry.kind) return `galaxy:${entry.kind}`;
  return catalogDefaults[kind]?.family ?? "object";
}

function warnCatalog(kind, id, message) {
  console.warn(`[cosmicCatalog:${kind}] ${id}: ${message}`);
}

function validateRequiredFields(kind, entry, id) {
  for (const field of requiredFields[kind] ?? []) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === "") {
      warnCatalog(kind, id, `missing required field "${field}"`);
    }
  }
}

function normalizeCatalogEntry(kind, entry, index) {
  const defaults = catalogDefaults[kind] ?? {};
  const id = entry?.id ? String(entry.id) : `${kind}-${index + 1}`;
  validateRequiredFields(kind, entry ?? {}, id);

  const normalized = {
    ...defaults,
    ...entry,
    id,
    name: entry?.name ? String(entry.name) : id,
    catalogKind: kind,
    schemaVersion: CATALOG_SCHEMA_VERSION,
    radius: finiteNumber(entry?.radius, 1),
    stats: normalizeStats(entry?.stats),
    dataStatus: entry?.dataStatus ?? defaults.dataStatus ?? "modeled",
  };

  if (entry?.position) {
    normalized.position = normalizeVector3(entry.position);
  }
  if (entry?.offset) {
    normalized.offset = normalizeVector3(entry.offset);
  }
  if (entry?.orientation) {
    normalized.orientation = normalizeVector3(entry.orientation);
  }
  if (kind === "exoplanetSystems") {
    normalized.planets = Array.isArray(entry?.planets)
      ? entry.planets.map((planet, planetIndex) => normalizePlanet(planet, id, planetIndex))
      : [];
  }
  if (kind === "webKnots") {
    normalized.connectTo = normalizeConnectors(entry?.connectTo);
  }

  normalized.visual = {
    profile: getVisualProfile(kind, normalized),
    family: normalized.family ?? defaults.family ?? null,
    color: normalized.color ?? normalized.colorA ?? null,
    secondaryColor: normalized.colorB ?? null,
    morphology: normalized.morphology ?? normalized.kind ?? normalized.spectral ?? null,
    workbench: getVisualWorkbenchProfile(normalized),
    ...(normalized.visual ?? {}),
  };

  return normalized;
}

export function normalizeCatalogEntries(kind, entries) {
  if (!Array.isArray(entries)) {
    warnCatalog(kind, kind, "catalog is not an array");
    return [];
  }
  return entries.map((entry, index) => normalizeCatalogEntry(kind, entry, index));
}

export function normalizeCatalogBundle(bundle) {
  const normalized = {};
  for (const [kind, entries] of Object.entries(bundle)) {
    normalized[kind] = normalizeCatalogEntries(kind, entries);
  }

  const seen = new Map();
  for (const [kind, entries] of Object.entries(normalized)) {
    for (const entry of entries) {
      if (seen.has(entry.id)) {
        warnCatalog(kind, entry.id, `duplicate id also found in ${seen.get(entry.id)}`);
      } else {
        seen.set(entry.id, kind);
      }
    }
  }

  return normalized;
}
