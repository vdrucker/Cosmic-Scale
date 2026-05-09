export function normalizeAddress(parts) {
  const address = [];
  for (const part of parts) {
    if (!part || address[address.length - 1] === part) {
      continue;
    }
    address.push(part);
  }
  return address;
}

export function getExoplanetSystemDisplayName(name) {
  return name.includes("System") ? name : `${name} Star System`;
}

export function inferEntityFamily(type = "", band = "", meta = "") {
  const text = `${type} ${meta}`.toLowerCase();
  if (text.includes("quasar")) return "quasar";
  if (text.includes("black hole")) return "black-hole";
  if (text.includes("magnetar")) return "magnetar";
  if (text.includes("pulsar")) return "pulsar";
  if (text.includes("x-ray binary") || text.includes("xray binary")) return "x-ray-binary";
  if (text.includes("neutron star")) return "neutron-star";
  if (text.includes("supernova")) return "supernova";
  if (text.includes("void")) return "void";
  if (text.includes("supercluster") || text.includes("wall") || text.includes("mass concentration") || text.includes("survey field") || text.includes("structure field")) return "cosmic-web";
  if (text.includes("dark nebula") || text.includes("molecular cloud") || text.includes("bok globule") || text.includes("absorption cloud")) return "dark-cloud";
  if (text.includes("nebula") || text.includes("pillars")) return "nebula";
  if (text.includes("galaxy")) return "galaxy";
  if (text.includes("brown dwarf")) return "brown-dwarf";
  if (text.includes("comet")) return "comet";
  if (text.includes("circumstellar disk") || text.includes("debris disk") || text.includes("protoplanetary disk")) return "circumstellar-disk";
  if (text.includes("asteroid") || text.includes("kuiper") || text.includes("oort") || text.includes("centaur") || text.includes("trojan") || text.includes("minor body")) return "small-body";
  if (text.includes("exoplanet system") || text.includes("star system") || text.includes("home star system")) return "star-system";
  if (text.includes("moon")) return "moon";
  if (
    text.includes("planet") ||
    text.includes("world") ||
    text.includes("terrestrial") ||
    text.includes("rocky") ||
    text.includes("super earth") ||
    text.includes("gas giant") ||
    text.includes("ice giant") ||
    text.includes("hot jupiter") ||
    text.includes("hot saturn") ||
    text.includes("warm neptune") ||
    text.includes("mini neptune") ||
    text.includes("sub-neptune") ||
    text.includes("neptune-mass") ||
    text.includes("lava")
  ) return "planet";
  if (text.includes("cluster") || text.includes("nucleus")) return "stellar-assembly";
  if (text.includes("star") || band === "system") return "star-system";
  if (band === "web") return "cosmic-web";
  if (band === "laniakea") return "cosmic-web";
  return band || "object";
}

export function formatEntityFamily(family) {
  return family
    ? family
        .split("-")
        .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
        .join(" ")
    : "";
}

export function formatDisplayText(value) {
  return `${value ?? ""}`.replace(/\b([a-z])([a-z0-9']*)/g, (_match, first, rest) => (
    `${first.toUpperCase()}${rest}`
  ));
}
