const STORAGE_KEY = "cosmic-scale-runtime-v1";

const defaultState = {
  version: 1,
  entities: {},
  ui: {},
};

function cloneDefaultState() {
  return {
    version: defaultState.version,
    entities: {},
    ui: {},
  };
}

function canUseStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function loadState() {
  if (!canUseStorage()) {
    return cloneDefaultState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneDefaultState();
    }
    const parsed = JSON.parse(raw);
    return {
      ...cloneDefaultState(),
      ...parsed,
      entities: parsed.entities && typeof parsed.entities === "object" ? parsed.entities : {},
      ui: parsed.ui && typeof parsed.ui === "object" ? parsed.ui : {},
    };
  } catch (error) {
    console.warn("[cosmicRuntimeState] failed to load persisted state", error);
    return cloneDefaultState();
  }
}

function persistState(state) {
  if (!canUseStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[cosmicRuntimeState] failed to persist state", error);
  }
}

const runtimeState = loadState();

export const cosmicRuntimeState = {
  get state() {
    return runtimeState;
  },
  peekEntityState(id) {
    return id ? runtimeState.entities[id] ?? null : null;
  },
  getEntityState(id) {
    if (!id) {
      return null;
    }
    runtimeState.entities[id] ??= { modifiers: [] };
    return runtimeState.entities[id];
  },
  getEntityModifiers(id) {
    return this.getEntityState(id)?.modifiers ?? [];
  },
  upsertEntityModifier(id, modifier) {
    if (!id || !modifier?.id) {
      return null;
    }
    const entityState = this.getEntityState(id);
    const existingIndex = entityState.modifiers.findIndex((candidate) => candidate.id === modifier.id);
    if (existingIndex >= 0) {
      entityState.modifiers[existingIndex] = { ...entityState.modifiers[existingIndex], ...modifier };
    } else {
      entityState.modifiers.push({ ...modifier });
    }
    persistState(runtimeState);
    return entityState.modifiers.find((candidate) => candidate.id === modifier.id) ?? null;
  },
  setUiState(key, value) {
    runtimeState.ui[key] = value;
    persistState(runtimeState);
  },
  getUiState(key, fallback = null) {
    return runtimeState.ui[key] ?? fallback;
  },
};
