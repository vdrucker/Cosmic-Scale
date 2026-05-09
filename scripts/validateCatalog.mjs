import { normalizeCatalogBundle } from "../src/catalogSchema.js";
import {
  catalogExoplanetSystems,
  catalogGalacticObjects,
  catalogLaniakeaGalaxies,
  catalogLocalGroupGalaxies,
  catalogLocalGroupPrimaryGalaxies,
  catalogNebulae,
  catalogStars,
  catalogWebKnots,
} from "../src/cosmicCatalog.js";
import { moonCatalog, planetFacts, ringedPlanetStyles } from "../src/solarSystemData.js";

const normalized = normalizeCatalogBundle({
  stars: catalogStars,
  exoplanetSystems: catalogExoplanetSystems,
  nebulae: catalogNebulae,
  galacticObjects: catalogGalacticObjects,
  localGroupPrimaryGalaxies: catalogLocalGroupPrimaryGalaxies,
  localGroupGalaxies: catalogLocalGroupGalaxies,
  laniakeaGalaxies: catalogLaniakeaGalaxies,
  webKnots: catalogWebKnots,
});

const errors = [];
const warnings = [];
const allEntries = Object.entries(normalized).flatMap(([kind, entries]) => (
  entries.map((entry) => ({ ...entry, catalogKind: kind }))
));
const idToEntry = new Map();

for (const entry of allEntries) {
  if (idToEntry.has(entry.id)) {
    errors.push(`Duplicate id "${entry.id}" in ${entry.catalogKind}; first seen in ${idToEntry.get(entry.id).catalogKind}.`);
  }
  idToEntry.set(entry.id, entry);
  const vector = entry.position ?? entry.offset;
  if (vector && (!Array.isArray(vector) || vector.length !== 3 || vector.some((value) => !Number.isFinite(value)))) {
    errors.push(`${entry.catalogKind}:${entry.id} has an invalid 3D vector.`);
  }
  if (!Number.isFinite(entry.radius) || entry.radius <= 0) {
    errors.push(`${entry.catalogKind}:${entry.id} has invalid radius "${entry.radius}".`);
  }
}

const allowedRootParents = new Set([
  "andromeda",
  "milky-way-galaxy",
  "triangulum-galaxy",
  "local-group-web",
  "laniakea",
]);

const knownRuntimeIds = new Set([
  "virgo-cluster",
  "m81-group",
  "centaurus-group",
  "sculptor-group",
  "fornax-cluster",
  "hydra-centaurus",
  "norma-cluster",
  "coma-cluster",
  "shapley-concentration",
  "perseus-pisces",
  "vela-supercluster",
  "sloan-wall-web",
  "coma-wall-web",
  "hercules-corona-borealis",
  "shapley-web",
  "perseus-pisces-web",
  "kbc-void",
  "eridanus-supervoid",
  "south-pole-wall",
  "pisces-cetus",
  "horologium-reticulum",
  "laniakea",
]);

for (const entry of [
  ...normalized.localGroupGalaxies,
  ...normalized.laniakeaGalaxies,
]) {
  if (!entry.parent) {
    errors.push(`${entry.catalogKind}:${entry.id} is missing parent.`);
    continue;
  }
  if (!allowedRootParents.has(entry.parent) && !knownRuntimeIds.has(entry.parent) && !idToEntry.has(entry.parent)) {
    warnings.push(`${entry.catalogKind}:${entry.id} references runtime parent "${entry.parent}" not present in catalog data.`);
  }
}

for (const knot of normalized.webKnots) {
  for (const targetId of knot.connectTo ?? []) {
    if (!knownRuntimeIds.has(targetId) && !idToEntry.has(targetId)) {
      warnings.push(`webKnots:${knot.id} connects to non-catalog/runtime node "${targetId}".`);
    }
  }
}

const moonIds = new Set();
for (const moon of moonCatalog) {
  if (!moon.id) {
    errors.push("moonCatalog contains a moon without an id.");
  }
  if (moonIds.has(moon.id)) {
    errors.push(`moonCatalog contains duplicate moon id "${moon.id}".`);
  }
  moonIds.add(moon.id);
  if (!planetFacts[moon.parent]) {
    errors.push(`moonCatalog:${moon.id} references missing parent "${moon.parent}".`);
  }
  for (const field of ["radius", "distance", "angle", "speed"]) {
    if (!Number.isFinite(moon[field])) {
      errors.push(`moonCatalog:${moon.id} has invalid ${field}.`);
    }
  }
}

for (const planetId of Object.keys(ringedPlanetStyles)) {
  if (!planetFacts[planetId]) {
    errors.push(`ringedPlanetStyles:${planetId} has no matching planetFacts entry.`);
  }
}

const counts = Object.fromEntries(
  Object.entries(normalized).map(([kind, entries]) => [kind, entries.length])
);
counts.localGroupVisibleTotal = counts.localGroupPrimaryGalaxies + counts.localGroupGalaxies;
counts.majorMoons = moonCatalog.length;
counts.catalogEntries = allEntries.length;

console.log(JSON.stringify({ counts, warnings }, null, 2));

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
}
