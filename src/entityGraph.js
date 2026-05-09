import * as THREE from "three";
import { inferEntityFamily } from "./cosmicText.js";
import { getVisualGrammar, getVisualWorkbenchProfile } from "./visualProfiles.js";

export function createEntityGraph({
  selectableEntities,
  entityIndex,
  runtimeState,
  createMaterial,
  getContextualSystemEntity,
}) {
  function getEntityById(id) {
    return entityIndex.get(id) ?? selectableEntities.find((entity) => entity.id === id) ?? null;
  }

  function unlinkEntityParent(child) {
    if (!child?.parentId) {
      return;
    }
    const parent = getEntityById(child.parentId);
    if (parent?.childIds) {
      parent.childIds = parent.childIds.filter((id) => id !== child.id);
    }
    child.parentId = null;
  }

  function linkEntityParent(childId, parentId, relation = null) {
    if (!childId || !parentId || childId === parentId) {
      return false;
    }
    const child = getEntityById(childId);
    const parent = getEntityById(parentId);
    if (!child || !parent) {
      return false;
    }
    if (child.parentId && child.parentId !== parentId) {
      unlinkEntityParent(child);
    }
    child.parentId = parentId;
    if (relation) {
      child.relation = relation;
    }
    parent.childIds ??= [];
    if (!parent.childIds.includes(childId)) {
      parent.childIds.push(childId);
    }
    return true;
  }

  function registerEntity({
    id,
    name,
    type,
    band,
    object,
    summary,
    meta,
    radius = 1,
    hitRadius = radius,
    selectionRadius = null,
    priority = 1,
    bodyDetail = false,
    innerZoomFloor = null,
    visualColor = null,
    detailScale = 1,
    rotationHours = null,
    moonCount = null,
    visualProfile = null,
    sourceBodyId = null,
    morphology = null,
    spectral = null,
    kind = null,
    activeCore = false,
    voidNode = false,
    catalogKind = null,
    stats = [],
    scaleHint = null,
    address = [],
    detailOnly = false,
    inspectionObject = object,
    portalTargetBand = null,
    hostSystemId = null,
    hostSystemName = null,
    habitable = false,
    dynamicSystemOnly = false,
    parentId = null,
    relation = null,
    dataStatus = "modeled",
    family = null,
  }) {
    const entityFamily = family ?? inferEntityFamily(type, band, meta);
    const grammar = getVisualGrammar(entityFamily);
    const visualWorkbench = getVisualWorkbenchProfile({
      id,
      name,
      type,
      band,
      summary,
      meta,
      family: entityFamily,
      visualProfile,
      sourceBodyId,
      moonCount,
      habitable,
      dataStatus,
      morphology,
      spectral,
      kind,
      activeCore,
      voidNode,
      catalogKind,
    });
    const entityRuntimeState = runtimeState.peekEntityState(id);
    const entity = {
      id,
      name,
      type,
      band,
      object,
      summary,
      meta,
      radius,
      hitRadius,
      selectionRadius,
      priority,
      bodyDetail,
      innerZoomFloor,
      visualColor,
      detailScale,
      rotationHours,
      moonCount,
      visualProfile,
      sourceBodyId,
      morphology,
      spectral,
      kind,
      activeCore,
      voidNode,
      catalogKind,
      stats,
      scaleHint,
      address,
      detailOnly,
      inspectionObject,
      portalTargetBand,
      hostSystemId,
      hostSystemName,
      habitable,
      dynamicSystemOnly,
      parentId: null,
      childIds: [],
      relation,
      dataStatus,
      family: entityFamily,
      visualGrammar: grammar,
      visualWorkbench,
      runtimeState: entityRuntimeState,
      modifiers: entityRuntimeState?.modifiers ?? [],
    };
    const hitTarget = new THREE.Mesh(
      new THREE.SphereGeometry(hitRadius, 16, 8),
      createMaterial(
        THREE.MeshBasicMaterial,
        { color: 0xffffff, depthWrite: false },
        0
      )
    );
    hitTarget.name = `${id}-hit`;
    hitTarget.userData.selectableEntity = entity;
    object.userData.selectableEntity = entity;
    object.add(hitTarget);
    entity.hitTarget = hitTarget;
    selectableEntities.push(entity);
    entityIndex.set(id, entity);
    if (parentId) {
      linkEntityParent(id, parentId, relation);
    }
    return entity;
  }

  function removeEntityFromGraph(entity) {
    if (!entity) {
      return;
    }
    unlinkEntityParent(entity);
    for (const candidate of selectableEntities) {
      if (candidate.childIds?.includes(entity.id)) {
        candidate.childIds = candidate.childIds.filter((id) => id !== entity.id);
      }
    }
    if (entityIndex.get(entity.id) === entity) {
      entityIndex.delete(entity.id);
    }
  }

  function getEntityChildren(entity, limit = Infinity) {
    if (!entity?.childIds?.length) {
      return [];
    }
    const children = [];
    for (const childId of entity.childIds) {
      const child = getEntityById(childId);
      if (!child || child.detailOnly || (child.dynamicSystemOnly && getContextualSystemEntity()?.id !== child.hostSystemId)) {
        continue;
      }
      children.push(child);
      if (children.length >= limit) {
        break;
      }
    }
    return children;
  }

  function getEntityParent(entity) {
    return entity?.parentId ? getEntityById(entity.parentId) : null;
  }

  function getEntityLineage(entity) {
    const lineage = [];
    const seen = new Set();
    let current = entity;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      lineage.push(current);
      current = getEntityParent(current);
    }
    return lineage;
  }

  function getEntityGraphChain(entity) {
    const chain = [];
    const seen = new Set();
    let current = entity;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.unshift(current);
      current = getEntityParent(current);
    }
    return chain;
  }

  return {
    registerEntity,
    getEntityById,
    unlinkEntityParent,
    linkEntityParent,
    removeEntityFromGraph,
    getEntityChildren,
    getEntityParent,
    getEntityLineage,
    getEntityGraphChain,
  };
}
