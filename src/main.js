import "./style.css";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { normalizeCatalogBundle } from "./catalogSchema.js";
import { cosmicRuntimeState } from "./cosmicRuntimeState.js";
import { createEntityGraph } from "./entityGraph.js";
import {
  getBodyDetailScale,
  getSpinFromRotationHours,
  localRandomish,
  seededRandom,
  smoothstep,
} from "./cosmicMath.js";
import {
  formatDisplayText,
  formatEntityFamily,
  getExoplanetSystemDisplayName,
  inferEntityFamily,
  normalizeAddress,
} from "./cosmicText.js";
import {
  getGestureCategoryName,
  getGestureScore,
  getHandScale,
  getPinchState,
  getStableGestureName,
  handScreenX,
  handScreenY,
  isHandReadyForReentry,
  isHandUsableForControls,
  isIndexOnlyPointing,
  isVictoryPose,
  serializeGestureResult,
} from "./gestureIntent.js";
import {
  LANIAKEA_NESTED_VIEW_FLOOR,
  LANIAKEA_NESTED_VIEW_ZOOM,
  MAX_ZOOM,
  PARENT_OCCLUSION_BANDS,
  scaleBands,
  scaleReferenceByBand,
} from "./scaleConfig.js";
import {
  STELLAR_NEIGHBORHOOD_RADIUS,
  getStellarScenePosition,
} from "./stellarPlacement.js";
import {
  createGlowSphere,
  createMaterial,
  createOrbitRing,
  createPointCloud,
  getMaterialEntries as getSceneMaterialEntries,
  setObjectOpacity as setSceneObjectOpacity,
} from "./scenePrimitives.js";
import {
  createPixelBodyDepthTexture,
  createPixelBodyTexture,
  createPixelCloudTexture,
  createPixelEarthTexture,
} from "./bodyTextureWorkbench.js";
import {
  homeAddressTail,
  moonCatalog,
  planetFacts,
  ringedPlanetStyles,
} from "./solarSystemData.js";
import {
  catalogExoplanetSystems as rawCatalogExoplanetSystems,
  catalogGalacticObjects as rawCatalogGalacticObjects,
  catalogLaniakeaGalaxies as rawCatalogLaniakeaGalaxies,
  catalogLocalGroupGalaxies as rawCatalogLocalGroupGalaxies,
  catalogLocalGroupPrimaryGalaxies as rawCatalogLocalGroupPrimaryGalaxies,
  catalogNebulae as rawCatalogNebulae,
  catalogStars as rawCatalogStars,
  catalogWebKnots as rawCatalogWebKnots,
} from "./cosmicCatalog.js";

const {
  stars: catalogStars,
  exoplanetSystems: catalogExoplanetSystems,
  nebulae: catalogNebulae,
  galacticObjects: catalogGalacticObjects,
  localGroupPrimaryGalaxies: catalogLocalGroupPrimaryGalaxies,
  localGroupGalaxies: catalogLocalGroupGalaxies,
  laniakeaGalaxies: catalogLaniakeaGalaxies,
  webKnots: catalogWebKnots,
} = normalizeCatalogBundle({
  stars: rawCatalogStars,
  exoplanetSystems: rawCatalogExoplanetSystems,
  nebulae: rawCatalogNebulae,
  galacticObjects: rawCatalogGalacticObjects,
  localGroupPrimaryGalaxies: rawCatalogLocalGroupPrimaryGalaxies,
  localGroupGalaxies: rawCatalogLocalGroupGalaxies,
  laniakeaGalaxies: rawCatalogLaniakeaGalaxies,
  webKnots: rawCatalogWebKnots,
});

const app = document.querySelector("#app");

const leftStack = document.createElement("div");
const hud = document.createElement("div");
const hudBand = document.createElement("div");
const hudTitle = document.createElement("div");
const hudRange = document.createElement("div");
const hudTrack = document.createElement("div");
const hudFill = document.createElement("div");
const hudChips = document.createElement("div");
const readout = document.createElement("div");
const infoPanel = document.createElement("div");
const infoKicker = document.createElement("div");
const infoTitle = document.createElement("div");
const infoMeta = document.createElement("div");
const infoAddress = document.createElement("div");
const infoStats = document.createElement("div");
const infoRelations = document.createElement("div");
const infoSummary = document.createElement("div");
const addressRail = document.createElement("div");
const searchPanel = document.createElement("div");
const searchInput = document.createElement("input");
const searchResults = document.createElement("div");
const scaleReference = document.createElement("div");
const hoverHint = document.createElement("div");
const handPanel = document.createElement("div");
const handControlButtons = document.createElement("div");
const handToggle = document.createElement("button");
const fullscreenToggle = document.createElement("button");
const chromeToggle = document.createElement("button");
const skyToggle = document.createElement("button");
const handMode = document.createElement("div");
const handTelemetry = document.createElement("div");
const handReticle = document.createElement("div");
const victoryLayerGuide = document.createElement("div");
const victoryAnchorMarker = document.createElement("div");

leftStack.className = "left-stack";
hud.className = "scale-hud";
hudBand.className = "scale-hud__band";
hudTitle.className = "scale-hud__title";
hudRange.className = "scale-hud__range";
hudTrack.className = "scale-hud__track";
hudFill.className = "scale-hud__fill";
hudChips.className = "scale-hud__chips";
readout.className = "scale-readout";
infoPanel.className = "object-panel";
infoKicker.className = "object-panel__kicker";
infoTitle.className = "object-panel__title";
infoMeta.className = "object-panel__meta";
infoAddress.className = "object-panel__address";
infoStats.className = "object-panel__stats";
infoRelations.className = "object-panel__relations";
infoSummary.className = "object-panel__summary";
addressRail.className = "address-rail";
searchPanel.className = "object-search";
searchInput.className = "object-search__input";
searchResults.className = "object-search__results";
scaleReference.className = "scale-reference";
hoverHint.className = "hover-hint";
handPanel.className = "hand-panel";
handControlButtons.className = "hand-panel__controls";
handToggle.className = "hand-panel__toggle";
fullscreenToggle.className = "hand-panel__toggle";
chromeToggle.className = "hand-panel__toggle";
skyToggle.className = "hand-panel__toggle";
handMode.className = "hand-panel__mode";
handTelemetry.className = "hand-panel__telemetry";
handReticle.className = "hand-reticle";
victoryLayerGuide.className = "victory-layer-guide";
victoryAnchorMarker.className = "victory-anchor";
handToggle.type = "button";
fullscreenToggle.type = "button";
chromeToggle.type = "button";
skyToggle.type = "button";
handToggle.textContent = "HAND";
fullscreenToggle.textContent = "FULL";
chromeToggle.textContent = "CLEAR";
skyToggle.textContent = "SKY";
handToggle.title = "Toggle camera gesture control";
fullscreenToggle.title = "Toggle fullscreen";
chromeToggle.title = "Hide panels and guides";
skyToggle.title = "Show sky figure address markers";
handMode.textContent = "idle";
searchInput.type = "search";
searchInput.autocomplete = "off";
searchInput.spellcheck = false;
searchInput.placeholder = "Find object";
hudTrack.appendChild(hudFill);
hud.append(hudBand, hudTitle, hudRange, hudTrack, hudChips);
infoPanel.append(infoKicker, infoTitle, infoMeta, infoAddress, infoStats, infoRelations, infoSummary);
handControlButtons.append(handToggle, fullscreenToggle, chromeToggle, skyToggle);
handPanel.append(handControlButtons, handMode, handTelemetry);
searchPanel.append(searchInput, searchResults);
leftStack.append(hud, searchPanel, addressRail);
app.append(leftStack, readout, infoPanel, scaleReference, hoverHint, handPanel, victoryLayerGuide, victoryAnchorMarker, handReticle);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00020a);

const camera = new THREE.PerspectiveCamera(
  58,
  window.innerWidth / window.innerHeight,
  0.1,
  900
);
camera.position.set(0, 0, 42);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
app.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.56,
  0.38,
  0.28
);
composer.addPass(bloomPass);

const ambientLight = new THREE.AmbientLight(0x5bbdff, 0.22);
const keyLight = new THREE.DirectionalLight(0xffffff, 2.05);
keyLight.position.set(8, 12, 18);
const rimLight = new THREE.DirectionalLight(0x7af2ff, 0.72);
rimLight.position.set(-12, -4, -8);
scene.add(ambientLight, keyLight, rimLight);

const root = new THREE.Group();
scene.add(root);

for (const band of scaleBands) {
  const chip = document.createElement("div");
  chip.className = "scale-hud__chip";
  chip.dataset.band = band.key;
  chip.title = band.title;
  chip.setAttribute("role", "button");
  chip.tabIndex = 0;
  hudChips.appendChild(chip);
}

const orderedScaleBands = [...scaleBands].sort((left, right) => left.center - right.center);
const layers = [];
const selectableEntities = [];
const laniakeaGalaxySelectionEnvelopes = [];
const skyFigureObjects = [];
const skyFigureStellarOverlays = new Map();
const entityIndex = new Map();
const reusableColor = new THREE.Color();
let deepWebRegress = null;
const tmpVector = new THREE.Vector3();
const lowerAnchor = new THREE.Vector3();
const upperAnchor = new THREE.Vector3();
const emergenceAnchor = new THREE.Vector3();
const orbitAnchor = new THREE.Vector3();
const travelAnchor = new THREE.Vector3();
const travelFocusAnchor = new THREE.Vector3();
const travelTarget = new THREE.Vector3();
const rotatedFocusOffset = new THREE.Vector3();
const inspectionAnchor = new THREE.Vector3(-7.7, 0, 8.45);
const inspectionTargetPosition = new THREE.Vector3(-7.7, 0, 8.45);
const focusLocalPosition = new THREE.Vector3();
const markerLocalPosition = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const panVector = new THREE.Vector2();
const selectedWorldPosition = new THREE.Vector3();
const hoveredWorldPosition = new THREE.Vector3();
const observatoryScaleTarget = new THREE.Vector3();
const bodyTextureCache = new Map();
const bodyDepthTextureCache = new Map();
const cloudTextureCache = new Map();
const sourceTextureCache = new Map();
const exoplanetSystemModels = new Map();
const stellarActivityLayers = [];
const handPointer = new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5);
const handPointerTarget = new THREE.Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5);
const handPointAnchor = new THREE.Vector2();
const victoryLayerCenter = new THREE.Vector2();
const victoryPointerPrevious = new THREE.Vector2();
const victoryPointerFiltered = new THREE.Vector2();
const victoryPointerCandidate = new THREE.Vector2();
const victoryAnchorPoint = new THREE.Vector2();
let handPointerReady = false;
let exoplanetSystemLayerGroup = null;
let activeExoplanetSystemId = null;
let zoomLevel = 0.45;
let targetZoom = 0.45;
let travelPulse = 0;
let shuttleTravelActive = false;
let shuttleTravelElapsed = 0;
let shuttleTravelDuration = 1.6;
let shuttleTravelStrength = 0;
let lastRenderTimeMs = performance.now();
const queryParams = new URLSearchParams(window.location.search);
const initialFocusParam = queryParams.get("focus") ?? "";
const [initialFocusSelect, initialFocusScale] = initialFocusParam.split(":");
const initialScaleParam = Number.parseFloat(initialFocusScale ?? queryParams.get("scale") ?? "");
const hasInitialScale = Number.isFinite(initialScaleParam);
if (hasInitialScale) {
  zoomLevel = THREE.MathUtils.clamp(initialScaleParam, 0, MAX_ZOOM);
  targetZoom = zoomLevel;
}
let yaw = -0.28;
let pitch = 0.18;
let targetYaw = yaw;
let targetPitch = pitch;
let ambientYawOffset = 0;
let isDragging = false;
let hasDragged = false;
let lastPointerX = 0;
let lastPointerY = 0;
let selectedEntity = null;
let hoveredEntity = null;
let pendingInitialSelectParam = "";
let searchSuppressedTransientEntityId = null;
let cameraZ = camera.position.z;
let gestureRecognizer = null;
let gestureRecognizerReady = false;
let gestureVideo = null;
let gestureStream = null;
let lastGestureDetectionMs = 0;
let lastGestureVideoTime = -1;
let lastGestureTimestampMs = 0;
let latestGestureHands = [];
let lastGestureSeenMs = 0;
let handPresenceActive = false;
let handPresenceStatus = "away";
let handPresenceCandidateSinceMs = 0;
let handPresenceLostSinceMs = 0;
let handControlsEnabled = false;
let interfaceHidden = false;
let skyFiguresVisible = false;
let heldGestureName = "None";
let heldGestureSinceMs = 0;
let pinchLatched = false;
let pointAimStartedMs = 0;
let pointAimCandidateEntity = null;
let pointSelectLatched = false;
let layerStepLatch = null;
let cosmonautLatched = false;
let victoryIntentActive = false;
let victoryCandidateSinceMs = 0;
let victoryLastSeenMs = 0;
let victoryManipulating = false;
let victoryPointerReady = false;
let victoryAnchorActive = false;
let victoryAnchorStartedMs = 0;
let victoryRefractoryUntilMs = 0;
let gestureLiftOffset = 0;
let gestureLiftTarget = 0;
let victoryLiftFiltered = 0;
let planetDetailPivot = null;
let planetDetailBody = null;
let planetDetailGlow = null;
let planetDetailClouds = null;
let planetDetailCloudVolume = null;
let planetDetailEarthCloudBands = null;
let planetDetailAtmosphere = null;
let planetDetailJupiterAtmosphere = null;
let planetDetailTexture = null;
let planetDetailEntityId = null;
let planetDetailTextureId = null;
let planetDetailMoonsGroup = null;
let planetDetailMoonParentId = null;
let planetDetailRingSystem = null;

const GENERATED_TEXTURES = {
  callisto: "/textures/callisto/fae6e2ac-edb3-4504-ae4c-737fba30d552.png",
  charon: "/textures/charon/3e6b73bd-3141-47ea-92df-c4d35d36726f.png",
  europa: "/textures/europa/9001f4df-d433-4a19-be1c-4c5f64e86481.png",
  ganymede: "/textures/ganymede/efe60335-ae3a-414b-9c47-059af50cecec.png",
  iceworld: "/textures/iceworld/b11e25cf-26df-47d5-8f1c-d8bb97836897.png",
  io: "/textures/io/yellow-orange-white-volcanic.png",
  lavaworld: "/textures/lavaworld/47e1a15c-c9e4-48e4-abdd-9b90122eda67.png",
  stormworld: "/textures/stormworld/4eb5cbeb-0df4-430e-a0f2-d38c96e6a19b.png",
  titan: "/textures/titan/6e2824d3-bbbd-4b3c-82f5-ff91d9fc73c2.png",
  triton: "/textures/triton/3f51ad0e-1d38-4034-9fb7-a5fa57a254ee.png",
  waterworld: "/textures/waterworld/efbb3887-fddc-4c67-8411-4824b9324184.png",
};

const EXOPLANET_TEXTURES = {
  composite: "/textures/composite.png",
  crateredWarm: "/textures/orange-craters-terrestrials-moons.png",
  crateredYellow: "/textures/yellow_craters.png",
  crateredRed: "/textures/red_craters.png",
  crateredOrange: "/textures/orange_craters.png",
  earthlikeDarkWind: "/textures/darkblue-water-wind-continent-stormy-earthlike.png",
  earthlikeLightWind: "/textures/lightblue-water-wind-continent-earthlike.png",
  earthlikeMountains: "/textures/earthlike_massive_mountains.png",
  earthlikePangaeic: "/textures/earthlike_pangaeic.png",
  earthlikeOcean: "/textures/earthlike_oceanworld.png",
  earthlikeArchipelago: "/textures/earthlike.png",
  earthlikeReef: "/textures/earthlike%20(2).png",
  earthlikeCyclone: "/textures/earthlike%20(3).png",
  earthlikeChain: "/textures/earthlike%20(4).png",
  ionian: "/textures/ionian.png",
  icyMoonStreakedRed: "/textures/icy_moon_streaked_red.png",
  lunar: "/textures/lunar.png",
  pinkMoon: "/textures/pink_moon.png",
  pinkMoonDwarf: "/textures/pink_moon_dwarf_terrestrial.png",
  pinkMoonDwarfAlt: "/textures/pink_moon_dwarf_terrestrial%20(2).png",
  purpleJovian: "/textures/purple_jovian.png",
  blueJovian: "/textures/blue_jovian.png",
  orangeJovian: "/textures/orange_jovian.png",
  greenJovian: "/textures/green_jovian.png",
  coralJovian: "/textures/coral_jovian.png",
  stormyBlueJovian: "/textures/stormy_blue_jovian.png",
  pearlescentJovian: "/textures/pearlescent_jovian.png",
  pinkVenusian: "/textures/pink_venusian.png",
  brownVenusian: "/textures/brown_venusian.png",
  orangeVenusian: "/textures/orange_venusian.png",
  yellowVenusian: "/textures/yellow_venusian.png",
  icyGiantStormy: "/textures/icy_giant_stormy.png",
  crystalIcyGiant: "/textures/crystal_icy_giant.png",
  navyBlueIcyGiant: "/textures/navy_blue_icy_giant.png",
  pearlescentIcyGiant: "/textures/pearlescent_icy_giant.png",
  ocean: "/textures/oceanworld.png",
  oceanTurquoise: "/textures/turquoise_oceanworld.png",
  oceanBlueBlack: "/textures/blue_black_oceanworld.png",
  oceanDeep: "/textures/oceanworld%20(2).png",
  icyMoon: "/textures/icy_moon.png",
  icyMoonGiant: "/textures/icy_moon_giant.png",
  icyMoonGiantAlt: "/textures/icy_moon_giant%20(2).png",
};

const SOLAR_SYSTEM_SOURCE_TEXTURES = {
  mercury: {
    color: "/textures/mercury/mercurymap.jpg",
    bump: "/textures/mercury/mercurybump.jpg",
    bumpScale: 0.38,
    roughness: 0.9,
  },
  venus: {
    color: "/textures/venus/venusmap.jpg",
    bump: "/textures/venus/venusbump.jpg",
    clouds: "/textures/venus/venusmap.jpg",
    bumpScale: 0.08,
    cloudOpacity: 0.16,
    cloudVolume: 0.72,
    roughness: 0.72,
  },
  earth: {
    color: "/textures/earth/earthmap1k.jpg",
    bump: "/textures/earth/earthbump1k.jpg",
    specular: "/textures/earth/earthspec1k.jpg",
    lights: "/textures/earth/earthlights1k.jpg",
    clouds: "/textures/earth/earthcloudmap.jpg",
    cloudAlpha: "/textures/earth/earthcloudmaptrans.jpg",
    colorTint: 0xffffff,
    bumpScale: 0.19,
    cloudOpacity: 0.2,
    cloudVolume: 0.76,
    roughness: 0.72,
    specularIntensity: 0.56,
    clearcoat: 0.03,
  },
  moon: {
    color: "/textures/luna/moonmap1k.jpg",
    bump: "/textures/luna/moonbump1k.jpg",
    bumpScale: 0.82,
    roughness: 0.98,
  },
  mars: {
    color: "/textures/mars/mars_1k_color.jpg",
    bump: "/textures/mars/mars_1k_topo.jpg",
    bumpScale: 0.34,
    cloudOpacity: 0.07,
    cloudVolume: 0.85,
    roughness: 0.9,
  },
  phobos: {
    color: "/textures/phobos/phobosbump.jpg",
    bump: "/textures/phobos/phobosbump.jpg",
    bumpScale: 0.76,
    tintColorMap: true,
    roughness: 0.98,
  },
  deimos: {
    color: "/textures/deimos/deimosbump.jpg",
    bump: "/textures/deimos/deimosbump.jpg",
    bumpScale: 0.7,
    tintColorMap: true,
    roughness: 0.98,
  },
  io: {
    color: GENERATED_TEXTURES.io,
    bump: GENERATED_TEXTURES.io,
    bumpScale: 0.24,
    roughness: 0.88,
  },
  europa: {
    color: GENERATED_TEXTURES.europa,
    bump: GENERATED_TEXTURES.europa,
    bumpScale: 0.18,
    roughness: 0.96,
  },
  ganymede: {
    color: GENERATED_TEXTURES.ganymede,
    bump: GENERATED_TEXTURES.ganymede,
    bumpScale: 0.32,
    roughness: 0.94,
  },
  callisto: {
    color: GENERATED_TEXTURES.callisto,
    bump: GENERATED_TEXTURES.callisto,
    bumpScale: 0.38,
    roughness: 0.98,
  },
  titan: {
    color: GENERATED_TEXTURES.titan,
    bump: GENERATED_TEXTURES.titan,
    bumpScale: 0.055,
    cloudOpacity: 0.18,
    cloudVolume: 0.72,
    roughness: 0.86,
  },
  rhea: {
    color: GENERATED_TEXTURES.iceworld,
    bump: GENERATED_TEXTURES.iceworld,
    bumpScale: 0.22,
    roughness: 0.96,
  },
  enceladus: {
    color: GENERATED_TEXTURES.iceworld,
    bump: GENERATED_TEXTURES.iceworld,
    bumpScale: 0.16,
    roughness: 0.98,
  },
  dione: {
    color: GENERATED_TEXTURES.iceworld,
    bump: GENERATED_TEXTURES.iceworld,
    bumpScale: 0.2,
    roughness: 0.96,
  },
  iapetus: {
    color: GENERATED_TEXTURES.callisto,
    bump: GENERATED_TEXTURES.callisto,
    bumpScale: 0.3,
    roughness: 0.98,
  },
  titania: {
    color: GENERATED_TEXTURES.ganymede,
    bump: GENERATED_TEXTURES.ganymede,
    bumpScale: 0.24,
    roughness: 0.96,
  },
  oberon: {
    color: GENERATED_TEXTURES.callisto,
    bump: GENERATED_TEXTURES.callisto,
    bumpScale: 0.28,
    roughness: 0.98,
  },
  ariel: {
    color: GENERATED_TEXTURES.iceworld,
    bump: GENERATED_TEXTURES.iceworld,
    bumpScale: 0.2,
    roughness: 0.96,
  },
  triton: {
    color: GENERATED_TEXTURES.triton,
    bump: GENERATED_TEXTURES.triton,
    bumpScale: 0.2,
    roughness: 0.95,
  },
  proteus: {
    color: GENERATED_TEXTURES.callisto,
    bump: GENERATED_TEXTURES.callisto,
    bumpScale: 0.34,
    roughness: 0.98,
  },
  nereid: {
    color: GENERATED_TEXTURES.charon,
    bump: GENERATED_TEXTURES.charon,
    bumpScale: 0.24,
    roughness: 0.98,
  },
  charon: {
    color: GENERATED_TEXTURES.charon,
    bump: GENERATED_TEXTURES.charon,
    bumpScale: 0.24,
    roughness: 0.96,
  },
  nix: {
    color: GENERATED_TEXTURES.charon,
    bump: GENERATED_TEXTURES.charon,
    bumpScale: 0.18,
    roughness: 0.98,
  },
  hydra: {
    color: GENERATED_TEXTURES.iceworld,
    bump: GENERATED_TEXTURES.iceworld,
    bumpScale: 0.18,
    roughness: 0.98,
  },
  kerberos: {
    color: GENERATED_TEXTURES.callisto,
    bump: GENERATED_TEXTURES.callisto,
    bumpScale: 0.2,
    roughness: 0.98,
  },
  styx: {
    color: GENERATED_TEXTURES.charon,
    bump: GENERATED_TEXTURES.charon,
    bumpScale: 0.16,
    roughness: 0.98,
  },
  jupiter: {
    color: "/textures/jupiter/jupitermap.jpg",
    clouds: "/textures/jupiter/jupitermap.jpg",
    colorTint: 0xe0ba86,
    cloudOpacity: 0.08,
    cloudVolume: 0.48,
    roughness: 0.74,
  },
  saturn: {
    color: "/textures/saturn/saturnmap.jpg",
    clouds: "/textures/saturn/saturnmap.jpg",
    ringColor: "/textures/saturn/saturnringcolor.jpg",
    ringAlpha: "/textures/saturn/saturnringpattern.gif",
    colorTint: 0xd6b56f,
    cloudOpacity: 0.045,
    cloudVolume: 0.38,
    roughness: 0.78,
  },
  uranus: {
    color: "/textures/uranus/uranusmap.jpg",
    clouds: "/textures/uranus/uranusmap.jpg",
    ringColor: "/textures/uranus/uranusringcolour.jpg",
    ringAlpha: "/textures/uranus/uranusringtrans.gif",
    cloudOpacity: 0.04,
    cloudVolume: 0.34,
    roughness: 0.7,
  },
  neptune: {
    color: "/textures/neptune/neptunemap.jpg",
    clouds: "/textures/neptune/neptunemap.jpg",
    cloudOpacity: 0.045,
    cloudVolume: 0.38,
    roughness: 0.68,
  },
  pluto: {
    color: "/textures/pluto/plutomap1k.jpg",
    bump: "/textures/pluto/plutobump1k.jpg",
    bumpScale: 0.38,
    roughness: 0.92,
  },
  "exoplanet-lava": {
    color: EXOPLANET_TEXTURES.crateredOrange,
    bump: EXOPLANET_TEXTURES.crateredOrange,
    bumpScale: 0.22,
    roughness: 0.82,
    clearcoat: 0.02,
  },
  "exoplanet-lava-legacy": {
    color: GENERATED_TEXTURES.lavaworld,
    bump: GENERATED_TEXTURES.lavaworld,
    bumpScale: 0.18,
    roughness: 0.76,
    clearcoat: 0.02,
  },
  "exoplanet-cratered-warm": {
    color: EXOPLANET_TEXTURES.crateredWarm,
    bump: EXOPLANET_TEXTURES.crateredWarm,
    bumpScale: 0.22,
    roughness: 0.88,
  },
  "exoplanet-cratered-yellow": {
    color: EXOPLANET_TEXTURES.crateredYellow,
    bump: EXOPLANET_TEXTURES.crateredYellow,
    bumpScale: 0.24,
    roughness: 0.9,
  },
  "exoplanet-cratered-red": {
    color: EXOPLANET_TEXTURES.crateredRed,
    bump: EXOPLANET_TEXTURES.crateredRed,
    bumpScale: 0.26,
    roughness: 0.9,
  },
  "exoplanet-cratered-orange": {
    color: EXOPLANET_TEXTURES.crateredOrange,
    bump: EXOPLANET_TEXTURES.crateredOrange,
    bumpScale: 0.24,
    roughness: 0.86,
  },
  "exoplanet-water": {
    color: EXOPLANET_TEXTURES.oceanTurquoise,
    bump: EXOPLANET_TEXTURES.oceanTurquoise,
    bumpScale: 0.08,
    roughness: 0.48,
    specularIntensity: 0.78,
    clearcoat: 0.14,
  },
  "exoplanet-water-legacy": {
    color: GENERATED_TEXTURES.waterworld,
    bump: GENERATED_TEXTURES.waterworld,
    bumpScale: 0.1,
    roughness: 0.62,
    specularIntensity: 0.62,
    clearcoat: 0.08,
  },
  "exoplanet-ocean-dark": {
    color: EXOPLANET_TEXTURES.oceanBlueBlack,
    bump: EXOPLANET_TEXTURES.oceanBlueBlack,
    bumpScale: 0.07,
    roughness: 0.44,
    specularIntensity: 0.82,
    clearcoat: 0.16,
  },
  "exoplanet-ocean-deep": {
    color: EXOPLANET_TEXTURES.oceanDeep,
    bump: EXOPLANET_TEXTURES.oceanDeep,
    bumpScale: 0.07,
    roughness: 0.46,
    specularIntensity: 0.78,
    clearcoat: 0.14,
  },
  "exoplanet-ocean-turquoise": {
    color: EXOPLANET_TEXTURES.oceanTurquoise,
    bump: EXOPLANET_TEXTURES.oceanTurquoise,
    bumpScale: 0.075,
    roughness: 0.46,
    specularIntensity: 0.8,
    clearcoat: 0.16,
  },
  "exoplanet-ocean-storm": {
    color: EXOPLANET_TEXTURES.ocean,
    bump: EXOPLANET_TEXTURES.ocean,
    bumpScale: 0.07,
    roughness: 0.5,
    specularIntensity: 0.74,
    clearcoat: 0.12,
  },
  "exoplanet-storm": {
    color: EXOPLANET_TEXTURES.stormyBlueJovian,
    clouds: EXOPLANET_TEXTURES.stormyBlueJovian,
    bump: EXOPLANET_TEXTURES.stormyBlueJovian,
    bumpScale: 0.035,
    cloudOpacity: 0.06,
    cloudVolume: 0.36,
    roughness: 0.68,
  },
  "exoplanet-storm-legacy": {
    color: GENERATED_TEXTURES.stormworld,
    clouds: GENERATED_TEXTURES.stormworld,
    bump: GENERATED_TEXTURES.stormworld,
    bumpScale: 0.035,
    cloudOpacity: 0.06,
    cloudVolume: 0.36,
    roughness: 0.68,
  },
  "exoplanet-hot-jovian": {
    color: EXOPLANET_TEXTURES.orangeJovian,
    clouds: EXOPLANET_TEXTURES.orangeJovian,
    bump: EXOPLANET_TEXTURES.orangeJovian,
    bumpScale: 0.04,
    cloudOpacity: 0.08,
    cloudVolume: 0.52,
    roughness: 0.66,
  },
  "exoplanet-coral-jovian": {
    color: EXOPLANET_TEXTURES.coralJovian,
    clouds: EXOPLANET_TEXTURES.coralJovian,
    bump: EXOPLANET_TEXTURES.coralJovian,
    bumpScale: 0.038,
    cloudOpacity: 0.07,
    cloudVolume: 0.48,
    roughness: 0.66,
  },
  "exoplanet-purple-jovian": {
    color: EXOPLANET_TEXTURES.purpleJovian,
    clouds: EXOPLANET_TEXTURES.purpleJovian,
    bump: EXOPLANET_TEXTURES.purpleJovian,
    bumpScale: 0.036,
    cloudOpacity: 0.065,
    cloudVolume: 0.46,
    roughness: 0.68,
  },
  "exoplanet-blue-jovian": {
    color: EXOPLANET_TEXTURES.blueJovian,
    clouds: EXOPLANET_TEXTURES.blueJovian,
    bump: EXOPLANET_TEXTURES.blueJovian,
    bumpScale: 0.034,
    cloudOpacity: 0.07,
    cloudVolume: 0.5,
    roughness: 0.64,
  },
  "exoplanet-green-jovian": {
    color: EXOPLANET_TEXTURES.greenJovian,
    clouds: EXOPLANET_TEXTURES.greenJovian,
    bump: EXOPLANET_TEXTURES.greenJovian,
    bumpScale: 0.036,
    cloudOpacity: 0.064,
    cloudVolume: 0.42,
    roughness: 0.7,
  },
  "exoplanet-stormy-blue-jovian": {
    color: EXOPLANET_TEXTURES.stormyBlueJovian,
    clouds: EXOPLANET_TEXTURES.stormyBlueJovian,
    bump: EXOPLANET_TEXTURES.stormyBlueJovian,
    bumpScale: 0.04,
    cloudOpacity: 0.078,
    cloudVolume: 0.56,
    roughness: 0.62,
  },
  "exoplanet-pearlescent-jovian": {
    color: EXOPLANET_TEXTURES.pearlescentJovian,
    clouds: EXOPLANET_TEXTURES.pearlescentJovian,
    bump: EXOPLANET_TEXTURES.pearlescentJovian,
    bumpScale: 0.026,
    cloudOpacity: 0.052,
    cloudVolume: 0.36,
    roughness: 0.58,
    specularIntensity: 0.5,
    clearcoat: 0.08,
  },
  "exoplanet-ice": {
    color: EXOPLANET_TEXTURES.icyMoon,
    bump: EXOPLANET_TEXTURES.icyMoon,
    bumpScale: 0.18,
    roughness: 0.96,
    clearcoat: 0.035,
  },
  "exoplanet-ice-legacy": {
    color: GENERATED_TEXTURES.iceworld,
    bump: GENERATED_TEXTURES.iceworld,
    bumpScale: 0.14,
    roughness: 0.96,
    clearcoat: 0.035,
  },
  "exoplanet-icy-moon": {
    color: EXOPLANET_TEXTURES.icyMoon,
    bump: EXOPLANET_TEXTURES.icyMoon,
    bumpScale: 0.2,
    roughness: 0.97,
    clearcoat: 0.04,
  },
  "exoplanet-icy-moon-red": {
    color: EXOPLANET_TEXTURES.icyMoonStreakedRed,
    bump: EXOPLANET_TEXTURES.icyMoonStreakedRed,
    bumpScale: 0.22,
    roughness: 0.97,
  },
  "exoplanet-icy-moon-giant": {
    color: EXOPLANET_TEXTURES.icyMoonGiant,
    bump: EXOPLANET_TEXTURES.icyMoonGiant,
    bumpScale: 0.2,
    roughness: 0.96,
    clearcoat: 0.04,
  },
  "exoplanet-icy-moon-giant-alt": {
    color: EXOPLANET_TEXTURES.icyMoonGiantAlt,
    bump: EXOPLANET_TEXTURES.icyMoonGiantAlt,
    bumpScale: 0.2,
    roughness: 0.96,
    clearcoat: 0.045,
  },
  "exoplanet-icy-giant-stormy": {
    color: EXOPLANET_TEXTURES.icyGiantStormy,
    clouds: EXOPLANET_TEXTURES.icyGiantStormy,
    bump: EXOPLANET_TEXTURES.icyGiantStormy,
    bumpScale: 0.026,
    cloudOpacity: 0.052,
    cloudVolume: 0.38,
    roughness: 0.62,
    clearcoat: 0.08,
  },
  "exoplanet-icy-giant-crystal": {
    color: EXOPLANET_TEXTURES.crystalIcyGiant,
    clouds: EXOPLANET_TEXTURES.crystalIcyGiant,
    bump: EXOPLANET_TEXTURES.crystalIcyGiant,
    bumpScale: 0.024,
    cloudOpacity: 0.042,
    cloudVolume: 0.34,
    roughness: 0.58,
    specularIntensity: 0.52,
    clearcoat: 0.09,
  },
  "exoplanet-icy-giant-navy": {
    color: EXOPLANET_TEXTURES.navyBlueIcyGiant,
    clouds: EXOPLANET_TEXTURES.navyBlueIcyGiant,
    bump: EXOPLANET_TEXTURES.navyBlueIcyGiant,
    bumpScale: 0.026,
    cloudOpacity: 0.05,
    cloudVolume: 0.36,
    roughness: 0.64,
    clearcoat: 0.05,
  },
  "exoplanet-icy-giant-pearlescent": {
    color: EXOPLANET_TEXTURES.pearlescentIcyGiant,
    clouds: EXOPLANET_TEXTURES.pearlescentIcyGiant,
    bump: EXOPLANET_TEXTURES.pearlescentIcyGiant,
    bumpScale: 0.022,
    cloudOpacity: 0.038,
    cloudVolume: 0.32,
    roughness: 0.56,
    specularIntensity: 0.52,
    clearcoat: 0.1,
  },
  "exoplanet-earthlike-dark-wind": {
    color: EXOPLANET_TEXTURES.earthlikeDarkWind,
    bump: EXOPLANET_TEXTURES.earthlikeDarkWind,
    bumpScale: 0.12,
    roughness: 0.58,
    specularIntensity: 0.54,
    clearcoat: 0.08,
  },
  "exoplanet-earthlike-light-wind": {
    color: EXOPLANET_TEXTURES.earthlikeLightWind,
    bump: EXOPLANET_TEXTURES.earthlikeLightWind,
    bumpScale: 0.13,
    roughness: 0.62,
    specularIntensity: 0.46,
    clearcoat: 0.06,
  },
  "exoplanet-earthlike-mountains": {
    color: EXOPLANET_TEXTURES.earthlikeMountains,
    bump: EXOPLANET_TEXTURES.earthlikeMountains,
    bumpScale: 0.2,
    roughness: 0.68,
    specularIntensity: 0.44,
    clearcoat: 0.04,
  },
  "exoplanet-earthlike-pangaeic": {
    color: EXOPLANET_TEXTURES.earthlikePangaeic,
    bump: EXOPLANET_TEXTURES.earthlikePangaeic,
    bumpScale: 0.16,
    roughness: 0.64,
    specularIntensity: 0.5,
    clearcoat: 0.06,
  },
  "exoplanet-earthlike-ocean": {
    color: EXOPLANET_TEXTURES.earthlikeOcean,
    bump: EXOPLANET_TEXTURES.earthlikeOcean,
    bumpScale: 0.11,
    roughness: 0.54,
    specularIntensity: 0.64,
    clearcoat: 0.1,
  },
  "exoplanet-earthlike-archipelago": {
    color: EXOPLANET_TEXTURES.earthlikeArchipelago,
    bump: EXOPLANET_TEXTURES.earthlikeArchipelago,
    bumpScale: 0.14,
    roughness: 0.58,
    specularIntensity: 0.56,
    clearcoat: 0.08,
  },
  "exoplanet-earthlike-reef": {
    color: EXOPLANET_TEXTURES.earthlikeReef,
    bump: EXOPLANET_TEXTURES.earthlikeReef,
    bumpScale: 0.14,
    roughness: 0.56,
    specularIntensity: 0.58,
    clearcoat: 0.08,
  },
  "exoplanet-earthlike-cyclone": {
    color: EXOPLANET_TEXTURES.earthlikeCyclone,
    bump: EXOPLANET_TEXTURES.earthlikeCyclone,
    bumpScale: 0.13,
    roughness: 0.56,
    specularIntensity: 0.62,
    clearcoat: 0.1,
  },
  "exoplanet-earthlike-chain": {
    color: EXOPLANET_TEXTURES.earthlikeChain,
    bump: EXOPLANET_TEXTURES.earthlikeChain,
    bumpScale: 0.13,
    roughness: 0.58,
    specularIntensity: 0.58,
    clearcoat: 0.08,
  },
  "exoplanet-venusian-yellow": {
    color: EXOPLANET_TEXTURES.yellowVenusian,
    clouds: EXOPLANET_TEXTURES.yellowVenusian,
    bump: EXOPLANET_TEXTURES.yellowVenusian,
    bumpScale: 0.055,
    cloudOpacity: 0.1,
    cloudVolume: 0.58,
    roughness: 0.74,
  },
  "exoplanet-venusian-orange": {
    color: EXOPLANET_TEXTURES.orangeVenusian,
    clouds: EXOPLANET_TEXTURES.orangeVenusian,
    bump: EXOPLANET_TEXTURES.orangeVenusian,
    bumpScale: 0.06,
    cloudOpacity: 0.11,
    cloudVolume: 0.62,
    roughness: 0.76,
  },
  "exoplanet-venusian-brown": {
    color: EXOPLANET_TEXTURES.brownVenusian,
    clouds: EXOPLANET_TEXTURES.brownVenusian,
    bump: EXOPLANET_TEXTURES.brownVenusian,
    bumpScale: 0.065,
    cloudOpacity: 0.09,
    cloudVolume: 0.54,
    roughness: 0.8,
  },
  "exoplanet-venusian-pink": {
    color: EXOPLANET_TEXTURES.pinkVenusian,
    clouds: EXOPLANET_TEXTURES.pinkVenusian,
    bump: EXOPLANET_TEXTURES.pinkVenusian,
    bumpScale: 0.055,
    cloudOpacity: 0.085,
    cloudVolume: 0.5,
    roughness: 0.76,
  },
  "exoplanet-ionian": {
    color: EXOPLANET_TEXTURES.ionian,
    bump: EXOPLANET_TEXTURES.ionian,
    bumpScale: 0.22,
    roughness: 0.84,
  },
  "exoplanet-lunar": {
    color: EXOPLANET_TEXTURES.lunar,
    bump: EXOPLANET_TEXTURES.lunar,
    bumpScale: 0.26,
    roughness: 0.98,
  },
  "exoplanet-pink-moon": {
    color: EXOPLANET_TEXTURES.pinkMoon,
    bump: EXOPLANET_TEXTURES.pinkMoon,
    bumpScale: 0.24,
    roughness: 0.96,
  },
  "exoplanet-pink-dwarf": {
    color: EXOPLANET_TEXTURES.pinkMoonDwarf,
    bump: EXOPLANET_TEXTURES.pinkMoonDwarf,
    bumpScale: 0.24,
    roughness: 0.94,
  },
  "exoplanet-pink-dwarf-alt": {
    color: EXOPLANET_TEXTURES.pinkMoonDwarfAlt,
    bump: EXOPLANET_TEXTURES.pinkMoonDwarfAlt,
    bumpScale: 0.24,
    roughness: 0.94,
  },
};

const SOURCE_DATA_TEXTURE_ROLES = new Set(["bump", "specular", "cloudAlpha", "ringAlpha"]);
const sourceTextureLoader = new THREE.TextureLoader();

const selectionRing = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.018, 8, 96),
  createMaterial(
    THREE.MeshBasicMaterial,
    { color: 0xfff4b8, blending: THREE.AdditiveBlending, depthWrite: false },
    0.88
  )
);
const hoverRing = new THREE.Mesh(
  new THREE.TorusGeometry(1, 0.012, 8, 72),
  createMaterial(
    THREE.MeshBasicMaterial,
    { color: 0x9df4ff, blending: THREE.AdditiveBlending, depthWrite: false },
    0.45
  )
);
selectionRing.visible = false;
hoverRing.visible = false;
scene.add(selectionRing, hoverRing);

function registerSceneGuide(object) {
  object.userData.sceneGuide = true;
  object.visible = !interfaceHidden;
  return object;
}

function createSceneGuideRing(...args) {
  return registerSceneGuide(createOrbitRing(...args));
}

function updateSceneGuideVisibility() {
  scene.traverse((object) => {
    if (object.userData?.sceneGuide) {
      object.visible = !interfaceHidden;
    }
  });
}

const random = seededRandom(29317);
const ECLIPTIC_Z_SCALE = 0.72;
const SKY_FIGURE_DISTANCE = 124;
const SKY_FIGURE_GLYPH_SCALE = 14.5;
const SKY_FIGURE_CATALOG = [
  { id: "constellation-aries", name: "Aries", kind: "Zodiac Constellation", raDeg: 38, decDeg: 20, color: 0xffd7a8, members: ["Hamal", "Sheratan", "Mesarthim"] },
  { id: "constellation-taurus", name: "Taurus", kind: "Zodiac Constellation", raDeg: 65, decDeg: 18, color: 0xffc08a, members: ["Aldebaran", "Elnath", "Pleiades"] },
  { id: "constellation-gemini", name: "Gemini", kind: "Zodiac Constellation", raDeg: 105, decDeg: 22, color: 0xe6f6ff, members: ["Castor", "Pollux", "Alhena"] },
  { id: "constellation-cancer", name: "Cancer", kind: "Zodiac Constellation", raDeg: 130, decDeg: 20, color: 0xd8ecff, members: ["Acubens", "Altarf", "Asellus Borealis"] },
  { id: "constellation-leo", name: "Leo", kind: "Zodiac Constellation", raDeg: 155, decDeg: 15, color: 0xffe1a8, members: ["Regulus", "Denebola", "Algieba"] },
  { id: "constellation-virgo", name: "Virgo", kind: "Zodiac Constellation", raDeg: 195, decDeg: -2, color: 0xcfe8ff, members: ["Spica", "Porrima", "Vindemiatrix"] },
  { id: "constellation-libra", name: "Libra", kind: "Zodiac Constellation", raDeg: 225, decDeg: -15, color: 0xf2ddff, members: ["Zubenelgenubi", "Zubeneschamali"] },
  { id: "constellation-scorpius", name: "Scorpius", kind: "Zodiac Constellation", raDeg: 247, decDeg: -25, color: 0xff8f7a, members: ["Antares", "Shaula", "Dschubba"] },
  { id: "constellation-sagittarius", name: "Sagittarius", kind: "Zodiac Constellation", raDeg: 285, decDeg: -25, color: 0xffd18a, members: ["Kaus Australis", "Nunki", "Alnasl"] },
  { id: "constellation-capricornus", name: "Capricornus", kind: "Zodiac Constellation", raDeg: 315, decDeg: -18, color: 0xc7f7ff, members: ["Deneb Algedi", "Dabih"] },
  { id: "constellation-aquarius", name: "Aquarius", kind: "Zodiac Constellation", raDeg: 335, decDeg: -10, color: 0x9feaff, members: ["Sadalsuud", "Sadalmelik", "Skat"] },
  { id: "constellation-pisces", name: "Pisces", kind: "Zodiac Constellation", raDeg: 15, decDeg: 12, color: 0xbdeeff, members: ["Alrescha", "Fumalsamakah"] },
  { id: "asterism-orion", name: "Orion", kind: "Major Asterism", raDeg: 84, decDeg: -1, color: 0xbfe8ff, members: ["Betelgeuse", "Bellatrix", "Mintaka", "Alnilam", "Alnitak", "Saiph", "Rigel"] },
  { id: "asterism-big-dipper", name: "Big Dipper", kind: "Major Asterism", raDeg: 180, decDeg: 55, color: 0xdff8ff, members: ["Dubhe", "Merak", "Phecda", "Megrez", "Alioth", "Mizar", "Alkaid"] },
  { id: "asterism-little-dipper", name: "Little Dipper", kind: "Major Asterism", raDeg: 220, decDeg: 75, color: 0xe9f7ff, members: ["Kochab", "Pherkad", "Eta Ursae Minoris", "Zeta Ursae Minoris", "Epsilon Ursae Minoris", "Delta Ursae Minoris", "Polaris"] },
  { id: "asterism-cassiopeia", name: "Cassiopeia", kind: "Major Asterism", raDeg: 15, decDeg: 60, color: 0xffd9f4, members: ["Schedar", "Caph", "Gamma Cassiopeiae", "Ruchbah", "Segin"] },
  { id: "asterism-summer-triangle", name: "Summer Triangle", kind: "Major Asterism", raDeg: 300, decDeg: 35, color: 0xcfe8ff, members: ["Vega", "Deneb", "Altair"] },
  { id: "asterism-winter-hexagon", name: "Winter Hexagon", kind: "Major Asterism", raDeg: 95, decDeg: 10, color: 0xfff0c4, members: ["Sirius", "Procyon", "Pollux", "Capella", "Aldebaran", "Rigel"] },
  { id: "asterism-great-square", name: "Great Square of Pegasus", kind: "Major Asterism", raDeg: 350, decDeg: 20, color: 0xd4ecff, members: ["Alpheratz", "Scheat", "Markab", "Algenib"] },
  { id: "asterism-southern-cross", name: "Southern Cross", kind: "Major Asterism", raDeg: 187, decDeg: -60, color: 0xe6fbff, members: ["Gacrux", "Delta Crucis", "Mimosa", "Acrux", "Epsilon Crucis"] },
];
const SKY_FIGURE_PATTERNS = {
  "asterism-orion": {
    points: [[-0.72, 0.74], [0.68, 0.62], [-0.28, 0.06], [0, 0.02], [0.3, -0.02], [-0.66, -0.76], [0.62, -0.82]],
    segments: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1]],
  },
  "asterism-big-dipper": {
    points: [[-0.86, 0.18], [-0.55, 0.44], [-0.14, 0.32], [0.06, -0.02], [0.35, -0.08], [0.62, -0.26], [0.9, -0.14]],
    segments: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  "asterism-little-dipper": {
    points: [[-0.82, 0.5], [-0.48, 0.62], [-0.24, 0.28], [0.04, 0.05], [0.35, -0.18], [0.7, -0.44], [0.9, -0.56]],
    segments: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 6]],
  },
  "asterism-cassiopeia": {
    points: [[-0.86, -0.18], [-0.44, 0.44], [0.02, -0.06], [0.44, 0.48], [0.88, -0.2]],
    segments: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
  "asterism-summer-triangle": {
    points: [[-0.68, -0.42], [0.05, 0.72], [0.76, -0.34]],
    segments: [[0, 1], [1, 2], [2, 0]],
  },
  "asterism-winter-hexagon": {
    points: [[-0.76, -0.12], [-0.48, 0.6], [0.06, 0.78], [0.64, 0.35], [0.76, -0.34], [0.02, -0.72]],
    segments: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  "asterism-great-square": {
    points: [[-0.72, 0.56], [0.66, 0.5], [0.74, -0.52], [-0.64, -0.6]],
    segments: [[0, 1], [1, 2], [2, 3], [3, 0]],
  },
  "asterism-southern-cross": {
    points: [[0, 0.88], [-0.42, 0.04], [0.4, -0.02], [0.04, -0.82], [0.22, 0.18]],
    segments: [[0, 3], [1, 2], [4, 0], [4, 3]],
  },
};
const SKY_FIGURE_MEMBER_ALIASES = {
  acrux: "acrux",
  aldebaran: "aldebaran",
  alkaid: "alkaid",
  alioth: "alioth",
  alnilam: "alnilam",
  alnitak: "alnitak",
  altair: "altair",
  antares: "antares",
  bellatrix: "bellatrix",
  betelgeuse: "betelgeuse",
  capella: "capella",
  castor: "castor",
  deneb: "deneb",
  denebola: "denebola",
  dubhe: "dubhe",
  elnath: "elnath",
  gacrux: "gacrux",
  "gamma-cassiopeiae": "asterism-cassiopeia-gamma-cassiopeiae",
  mizar: "mizar",
  merak: "merak",
  mintaka: "mintaka",
  pleiades: "pleiades",
  polaris: "polaris",
  pollux: "pollux",
  procyon: "procyon",
  regulus: "regulus",
  rigel: "rigel",
  sirius: "sirius",
  spica: "spica",
  vega: "vega",
};
const EARTH_SYSTEM_ORBIT_DISTANCE = 14.3;
const CERES_SYSTEM_ORBIT_DISTANCE = 26.2;
const PLUTO_SYSTEM_ORBIT_DISTANCE = 88;
const GALAXY_LAYER_SPACING_SCALE = 1.68;
const GALAXY_LAYER_Y_SCALE = 1.2;
const GALAXY_DISC_Z_SCALE = 0.76;
const LOCAL_GROUP_CLUSTER_BARYCENTER = [-14.7, 0.9, -0.1];
const SCALE_PROGRESS_CAP_ZOOM = 10;
const HISTORIC_WEB_MAX_ZOOM = 11.25;
const LOG10_METERS_PER_SCALE_INDEX = 22 / HISTORIC_WEB_MAX_ZOOM;
const DEEP_WEB_REGRESS_START = 10.38;
const DEEP_WEB_REGRESS_STEP = 0.68;
const DEEP_WEB_REGRESS_SLOT_COUNT = 4;
const DEEP_WEB_SHELL_CACHE_LIMIT = 14;
const WEB_LAYER_OUTER_DECAY = 0.86;
const SYSTEM_ZOOM_FLOOR = 1.08;
const MOON_PARENT_VIEW_FLOOR = 0.62;
const MOON_DETAIL_PARENT_VIEW_ZOOM = 0.5;
const SYSTEM_MOON_VISUAL_SCALE = 1.32;
const STELLAR_INSPECTION_FLOOR = 2.34;
const GESTURE_DETECTION_INTERVAL_MS = 58;
const GESTURE_LOST_GRACE_MS = 360;
const GESTURE_MODEL_PATH = "/gesture_recognizer.task";
const GESTURE_WASM_PATH = "/wasm";
const GESTURE_SCORE_THRESHOLD = 0.42;
const HAND_REENTRY_HOLD_MS = 260;
const HAND_EXIT_HOLD_MS = 620;
const HAND_ZOOM_SPEED = 0.3;
const HAND_ZOOM_HOLD_MS = 180;
const HAND_ZOOM_RAMP_MS = 620;
const HAND_LAYER_HOLD_MS = 360;
const HAND_POINTER_SMOOTHING = 0.26;
const POINT_SELECT_HOLD_MS = 3000;
const POINT_SELECT_COOLDOWN_MS = 900;
const POINT_SELECT_DRIFT_PX = 82;
const POINT_DESELECT_HOLD_MS = 1900;
const VICTORY_REFRACTORY_MS = 1000;
const VICTORY_REFRACTORY_DELTA_PX = 86;
const VICTORY_INTENT_HOLD_MS = 170;
const VICTORY_RELEASE_GRACE_MS = 430;
const VICTORY_ANCHOR_HOLD_MS = 2000;
const VICTORY_ANCHOR_DRIFT_PX = 78;
const VICTORY_SELECTION_DEPTH_THRESHOLD = 0.36;
const VICTORY_LAYER_RADIUS_PX = 118;
const VICTORY_LAYER_DEADZONE_PX = 14;
const VICTORY_LAYER_YAW_SPEED = 1.18;
const VICTORY_LAYER_PITCH_SPEED = 0.86;
const VICTORY_LAYER_CENTER_X = 0.44;
const VICTORY_LAYER_CENTER_Y = 0.5;
const VICTORY_LOCAL_RADIUS_PX = 78;
const VICTORY_LOCAL_DEADZONE_PX = 7;
const VICTORY_LOCAL_YAW_SPEED = 1.08;
const VICTORY_LOCAL_PITCH_SPEED = 0.82;
const LOCAL_BINARY_COMPANION_ORBIT_SPEED = 0.00036;
const ALPHA_CENTAURI_ORBIT_SPEED = 0.00042;
const LANIAKEA_CLUSTER_PROCESSION_SPEED = 0.000105;
const LANIAKEA_FIELD_PROCESSION_SPEED = 0.000082;
const LANIAKEA_WALL_PROCESSION_SPEED = 0.000055;
const LANIAKEA_GROUP_PROCESSION_SPEED = 0.00009;
const VICTORY_POINTER_SMOOTHING = 0.34;
const VICTORY_JITTER_DEADZONE_PX = 7.5;
const VICTORY_MAX_DELTA_PX = 20;
const VICTORY_ROTATION_YAW_SPEED = 0.0024;
const VICTORY_ROTATION_PITCH_SPEED = 0.0018;
const VICTORY_LIFT_SMOOTHING = 0.2;
const TWO_FINGER_PAN_DEADZONE = 0.68;
const TWO_FINGER_PAN_SPEED = 0.62;
let lastPointSelectMs = -POINT_SELECT_COOLDOWN_MS;
let lastCosmonautJumpMs = -2600;
let renderCacheVersion = 1;
let animationCacheDirty = true;
let animatedObjects = [];
let orbitObjects = [];
let laniakeaFlowClouds = [];
let continuousEmitters = [];
let cometDrifters = [];
let authoredWebContentGroup = null;
const deepWebOriginGlows = [];
const deepWebShellCache = new Map();
function getEntityAddress(entity) {
  if (!entity) {
    return [];
  }
  if (entity.address?.length) {
    return normalizeAddress(entity.address);
  }
  const parentMoon = moonCatalog.find((moon) => moon.id === entity.id);
  if (parentMoon) {
    const parent = selectableEntities.find((candidate) => candidate.id === parentMoon.parent);
    return normalizeAddress([entity.name, parent?.name, ...homeAddressTail]);
  }
  if (entity.band === "system") {
    return normalizeAddress([entity.name, ...homeAddressTail]);
  }
  const bandAddress = {
    planet: ["Close Inspection", ...homeAddressTail],
    stellar: ["Milky Way", "Local Group", "Laniakea", "Cosmic Web"],
    galaxy: ["Milky Way", "Local Group", "Laniakea", "Cosmic Web"],
    cluster: ["Local Group", "Laniakea", "Cosmic Web"],
    web: ["Cosmic Web"],
  }[entity.band] ?? [];
  return normalizeAddress([entity.name, ...bandAddress]);
}

function getContextualSystemName(entity = selectedEntity) {
  if (!entity) {
    return null;
  }
  if (entity.type === "Exoplanet System") {
    return entity.name;
  }
  return entity.hostSystemName ?? null;
}

function getContextualSystemEntity(entity = selectedEntity) {
  if (!entity) {
    return null;
  }
  if (entity.type === "Exoplanet System") {
    return entity;
  }
  if (entity.hostSystemId) {
    return selectableEntities.find((candidate) => candidate.id === entity.hostSystemId) ?? null;
  }
  return null;
}

function getPreferredPlanetInSystem(systemId) {
  const planets = selectableEntities.filter((entity) => entity.hostSystemId === systemId && entity.bodyDetail);
  if (planets.length === 0) {
    return null;
  }
  const dynamicPlanets = planets.filter((entity) => entity.dynamicSystemOnly);
  const candidates = dynamicPlanets.length > 0 ? dynamicPlanets : planets;
  return (
    candidates.find((entity) => entity.habitable) ??
    candidates.find((entity) => entity.type === "Super Earth") ??
    candidates[0]
  );
}

function getDefaultPlanetTarget() {
  if (selectedEntity?.bodyDetail) {
    return selectedEntity;
  }
  const contextualSystem = getContextualSystemEntity();
  if (contextualSystem) {
    return getPreferredPlanetInSystem(contextualSystem.id);
  }
  return selectableEntities.find((entity) => entity.id === "earth") ?? null;
}

const {
  registerEntity,
  getEntityById,
  unlinkEntityParent,
  linkEntityParent,
  removeEntityFromGraph,
  getEntityChildren,
  getEntityParent,
  getEntityLineage,
  getEntityGraphChain,
} = createEntityGraph({
  selectableEntities,
  entityIndex,
  runtimeState: cosmicRuntimeState,
  createMaterial,
  getContextualSystemEntity,
});

function updateHandPresence(hands, nowMs) {
  const hand = hands[0];
  const returningFromRelease = handPresenceStatus === "release" || handPresenceStatus === "enter";
  const canUseDetection = Boolean(hand) && (
    handPresenceActive && !returningFromRelease
      ? isHandUsableForControls(hand)
      : isHandReadyForReentry(hand)
  );

  if (canUseDetection) {
    if (!handPresenceActive || returningFromRelease) {
      if (!handPresenceCandidateSinceMs) {
        handPresenceCandidateSinceMs = nowMs;
      }
      handPresenceStatus = "enter";
      if (nowMs - handPresenceCandidateSinceMs < HAND_REENTRY_HOLD_MS) {
        return;
      }
      handPresenceActive = true;
    }
    handPresenceLostSinceMs = 0;
    handPresenceStatus = "present";
    handPresenceCandidateSinceMs = 0;
    latestGestureHands = hands;
    lastGestureSeenMs = nowMs;
    return;
  }

  handPresenceCandidateSinceMs = 0;
  if (handPresenceActive) {
    if (!handPresenceLostSinceMs) {
      handPresenceLostSinceMs = nowMs;
      resetOneHandGestureLatches();
      updateHandReticle(false);
    }
    if (nowMs - handPresenceLostSinceMs < HAND_EXIT_HOLD_MS) {
      handPresenceStatus = "release";
      return;
    }
  }

  if (handPresenceActive || latestGestureHands.length > 0) {
    resetOneHandGestureLatches();
    updateHandReticle(false);
  }
  handPresenceActive = false;
  handPresenceStatus = "away";
  handPresenceLostSinceMs = 0;
  latestGestureHands = [];
}

function resetVictoryIntent() {
  victoryIntentActive = false;
  victoryCandidateSinceMs = 0;
  victoryLastSeenMs = 0;
}

function resetVictoryMotion() {
  victoryManipulating = false;
  victoryPointerReady = false;
  gestureLiftTarget = 0;
  victoryLiftFiltered = 0;
}

function getVictoryLayerCenter() {
  const safeWidth = Math.max(360, window.innerWidth - 340);
  victoryLayerCenter.set(
    THREE.MathUtils.clamp(safeWidth * VICTORY_LAYER_CENTER_X, 180, window.innerWidth - 180),
    THREE.MathUtils.clamp(window.innerHeight * VICTORY_LAYER_CENTER_Y, 190, window.innerHeight - 150)
  );
  return victoryLayerCenter;
}

function updateVictoryLayerGuide(visible) {
  victoryLayerGuide.classList.toggle("is-visible", visible);
  if (!visible) {
    return;
  }
  const center = getVictoryLayerCenter();
  victoryLayerGuide.style.width = `${VICTORY_LAYER_RADIUS_PX * 2}px`;
  victoryLayerGuide.style.height = `${VICTORY_LAYER_RADIUS_PX * 2}px`;
  victoryLayerGuide.style.left = `${center.x}px`;
  victoryLayerGuide.style.top = `${center.y}px`;
}

function updateVictoryAnchorMarker(visible, locked = false) {
  victoryAnchorMarker.classList.toggle("is-visible", visible);
  victoryAnchorMarker.classList.toggle("is-locked", visible && locked);
  if (!visible) {
    return;
  }
  victoryAnchorMarker.style.width = `${VICTORY_LOCAL_RADIUS_PX * 2}px`;
  victoryAnchorMarker.style.height = `${VICTORY_LOCAL_RADIUS_PX * 2}px`;
  victoryAnchorMarker.style.left = `${victoryAnchorPoint.x}px`;
  victoryAnchorMarker.style.top = `${victoryAnchorPoint.y}px`;
}

function resetVictoryAnchor() {
  victoryAnchorActive = false;
  victoryAnchorStartedMs = 0;
  updateVictoryAnchorMarker(false);
}

function resetVictoryManipulation() {
  resetVictoryMotion();
  updateVictoryLayerGuide(false);
  resetVictoryAnchor();
}

function getGestureIntentName(rawGestureName, landmarks, nowMs) {
  const seesVictory = rawGestureName === "Victory" || isVictoryPose(landmarks);
  if (seesVictory) {
    if (!victoryCandidateSinceMs) {
      victoryCandidateSinceMs = nowMs;
    }
    victoryLastSeenMs = nowMs;
    if (!victoryIntentActive && nowMs - victoryCandidateSinceMs >= VICTORY_INTENT_HOLD_MS) {
      victoryIntentActive = true;
    }
  } else if (victoryIntentActive && nowMs - victoryLastSeenMs <= VICTORY_RELEASE_GRACE_MS) {
    return "Victory";
  } else if (nowMs - victoryLastSeenMs > VICTORY_RELEASE_GRACE_MS) {
    resetVictoryIntent();
  }
  return victoryIntentActive ? "Victory" : rawGestureName;
}

function getGestureHoldMs(gestureName, nowMs) {
  if (heldGestureName !== gestureName) {
    heldGestureName = gestureName;
    heldGestureSinceMs = nowMs;
  }
  return nowMs - heldGestureSinceMs;
}

function getGestureRamp(holdMs, holdFloorMs) {
  const progress = THREE.MathUtils.clamp((holdMs - holdFloorMs) / HAND_ZOOM_RAMP_MS, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function isGestureHoldReady(holdMs, requiredMs) {
  return holdMs >= requiredMs;
}

function getGestureHoldRemainingSeconds(holdMs, requiredMs) {
  return Math.max(0, (requiredMs - holdMs) / 1000);
}

function clearPointingGestureState({ hideReticle = true, clearPinch = true } = {}) {
  if (clearPinch) {
    pinchLatched = false;
  }
  resetPointSelection();
  if (hideReticle) {
    updateHandReticle(false);
  }
}

function handleLayerStepGesture(gestureName, holdMs) {
  clearPointingGestureState({ clearPinch: false });
  const isLayerUp = gestureName === "Thumb_Up";
  if (!isGestureHoldReady(holdMs, HAND_LAYER_HOLD_MS) && layerStepLatch !== gestureName) {
    setHandMode(isLayerUp ? "hold up" : "hold down", true);
    return true;
  }
  if (layerStepLatch !== gestureName) {
    navigateGestureLayer(isLayerUp ? 1 : -1);
    layerStepLatch = gestureName;
  }
  setHandMode(isLayerUp ? "layer up" : "layer down", true);
  return true;
}

function handleZoomGesture(direction, holdMs, deltaSec, holdLabel, activeLabel) {
  clearPointingGestureState();
  if (!isGestureHoldReady(holdMs, HAND_ZOOM_HOLD_MS)) {
    setHandMode(holdLabel, true);
    return true;
  }
  targetZoom += direction * HAND_ZOOM_SPEED * getGestureRamp(holdMs, HAND_ZOOM_HOLD_MS) * deltaSec;
  clampTargetZoom();
  setHandMode(activeLabel, true);
  return true;
}

function handleCosmonautGesture(nowMs) {
  clearPointingGestureState();
  if (!cosmonautLatched && nowMs - lastCosmonautJumpMs > 2600) {
    selectCosmonautDestination();
    lastCosmonautJumpMs = nowMs;
    cosmonautLatched = true;
  }
  setHandMode("cosmonaut", true);
  return true;
}

function setHandMode(label, active = false) {
  handMode.textContent = label;
  handPanel.classList.toggle("is-active", active);
  const hand = latestGestureHands[0];
  const rawGesture = getGestureCategoryName(hand?.gesture);
  const score = Math.round(getGestureScore(hand?.gesture) * 100);
  const hold = heldGestureName && heldGestureName !== "None"
    ? `${Math.round(getGestureHoldMs(heldGestureName, performance.now()))}ms`
    : "";
  const target = hoveredEntity?.name ?? pointAimCandidateEntity?.name ?? selectedEntity?.name ?? "";
  const parts = [
    rawGesture && rawGesture !== "None" ? `${rawGesture} ${score}%` : "",
    hold,
    target ? `target ${target}` : "",
  ].filter(Boolean);
  handTelemetry.textContent = parts.join(" | ");
  handTelemetry.classList.toggle("is-visible", active && handControlsEnabled && parts.length > 0);
}

function updateHandReticle(visible, x = handPointer.x, y = handPointer.y, mode = "point") {
  handReticle.classList.toggle("is-visible", visible);
  handReticle.dataset.mode = mode;
  if (!visible) {
    handPointerReady = false;
    return;
  }
  handPointerTarget.set(
    THREE.MathUtils.clamp(x, 0, window.innerWidth),
    THREE.MathUtils.clamp(y, 0, window.innerHeight)
  );
  if (!handPointerReady) {
    handPointer.copy(handPointerTarget);
    handPointerReady = true;
  } else {
    handPointer.lerp(
      handPointerTarget,
      HAND_POINTER_SMOOTHING
    );
  }
  handReticle.style.left = `${handPointer.x}px`;
  handReticle.style.top = `${handPointer.y}px`;
}

function resetOneHandGestureLatches() {
  heldGestureName = "None";
  heldGestureSinceMs = 0;
  pinchLatched = false;
  resetPointSelection();
  layerStepLatch = null;
  cosmonautLatched = false;
  resetVictoryIntent();
  resetVictoryManipulation();
}

function findHandPointCandidate(clientX, clientY) {
  return pickEntity(clientX, clientY, false) ?? findNearestVisibleEntity(clientX, clientY);
}

function resetPointSelection() {
  pointAimStartedMs = 0;
  pointAimCandidateEntity = null;
  pointSelectLatched = false;
}

function updatePointSelection(candidate, nowMs) {
  const driftLimitPx = Math.max(POINT_SELECT_DRIFT_PX, Math.min(window.innerWidth, window.innerHeight) * 0.07);
  if (!pointAimStartedMs || handPointer.distanceTo(handPointAnchor) > driftLimitPx) {
    handPointAnchor.copy(handPointer);
    pointAimStartedMs = nowMs;
    pointAimCandidateEntity = candidate;
    pointSelectLatched = false;
  } else if (candidate) {
    pointAimCandidateEntity = candidate;
  }

  if (!pointAimCandidateEntity) {
    const elapsedMs = nowMs - pointAimStartedMs;
    if (selectedEntity && elapsedMs >= POINT_DESELECT_HOLD_MS) {
      selectEntity(null);
      updateHoverHint(null);
      lastPointSelectMs = nowMs;
      pointSelectLatched = true;
      return "cleared";
    }
    if (selectedEntity) {
      return `clear ${getGestureHoldRemainingSeconds(elapsedMs, POINT_DESELECT_HOLD_MS).toFixed(1)}`;
    }
    return "point";
  }

  const elapsedMs = nowMs - pointAimStartedMs;
  if (
    !pointSelectLatched &&
    elapsedMs >= POINT_SELECT_HOLD_MS &&
    nowMs - lastPointSelectMs > POINT_SELECT_COOLDOWN_MS
  ) {
    selectEntity(pointAimCandidateEntity);
    updateHoverHint(null);
    lastPointSelectMs = nowMs;
    pointSelectLatched = true;
    return "selected";
  }

  if (pointSelectLatched) {
    return "selected";
  }

  const remainingSeconds = getGestureHoldRemainingSeconds(elapsedMs, POINT_SELECT_HOLD_MS);
  return `aim ${remainingSeconds.toFixed(1)}`;
}

function getTwoFingerPointer(landmarks) {
  const index = landmarks[8];
  const middle = landmarks[12] ?? index;
  return {
    x: (handScreenX(index) + handScreenX(middle)) * 0.5,
    y: (handScreenY(index) + handScreenY(middle)) * 0.5,
  };
}

function getVictoryStabilityDepth() {
  const planetDepth = selectedEntity?.bodyDetail ? getPlanetInspectionReveal(selectedEntity) : 0;
  const observatoryDepth = getObservatoryFocusDepth(selectedEntity);
  return Math.max(planetDepth, observatoryDepth);
}

function getVictorySelectionDepth() {
  if (!selectedEntity) {
    return 0;
  }
  if (selectedEntity.bodyDetail) {
    return getPlanetInspectionReveal(selectedEntity);
  }
  if (isObservatoryTarget(selectedEntity)) {
    return getObservatoryFocusDepth(selectedEntity);
  }
  return 0;
}

function isVictorySelectionView() {
  return Boolean(selectedEntity && getVictorySelectionDepth() >= VICTORY_SELECTION_DEPTH_THRESHOLD);
}

function updateVictoryAnchor(pointer, nowMs) {
  victoryPointerCandidate.set(pointer.x, pointer.y);
  const anchorDistance = victoryAnchorStartedMs
    ? victoryPointerCandidate.distanceTo(victoryAnchorPoint)
    : 0;

  if (!victoryAnchorStartedMs || (!victoryAnchorActive && anchorDistance > VICTORY_ANCHOR_DRIFT_PX)) {
    victoryAnchorStartedMs = nowMs;
    victoryAnchorActive = false;
    victoryAnchorPoint.copy(victoryPointerCandidate);
    resetVictoryMotion();
  }

  if (!victoryAnchorActive) {
    const elapsedMs = nowMs - victoryAnchorStartedMs;
    if (elapsedMs >= VICTORY_ANCHOR_HOLD_MS) {
      victoryAnchorActive = true;
      victoryPointerFiltered.copy(victoryPointerCandidate);
      victoryPointerPrevious.copy(victoryPointerFiltered);
      victoryPointerReady = true;
      victoryManipulating = false;
      updateVictoryAnchorMarker(true, true);
      return { active: true, label: "anchored", x: 0, y: 0, strength: 0 };
    }

    updateVictoryAnchorMarker(true, false);
    victoryManipulating = true;
    const remainingSeconds = getGestureHoldRemainingSeconds(elapsedMs, VICTORY_ANCHOR_HOLD_MS);
    return { active: false, label: `anchor ${remainingSeconds.toFixed(1)}`, x: 0, y: 0, strength: 0 };
  }

  updateVictoryAnchorMarker(true, true);
  victoryPointerFiltered.lerp(victoryPointerCandidate, 0.24);
  const offsetX = victoryPointerFiltered.x - victoryAnchorPoint.x;
  const offsetY = victoryPointerFiltered.y - victoryAnchorPoint.y;
  const distance = Math.hypot(offsetX, offsetY);
  if (distance <= VICTORY_LOCAL_DEADZONE_PX) {
    return { active: true, label: "anchored", x: 0, y: 0, strength: 0 };
  }
  const usableDistance = Math.min(distance, VICTORY_LOCAL_RADIUS_PX);
  const remappedStrength = THREE.MathUtils.clamp(
    (usableDistance - VICTORY_LOCAL_DEADZONE_PX) / (VICTORY_LOCAL_RADIUS_PX - VICTORY_LOCAL_DEADZONE_PX),
    0,
    1
  );
  const directionX = offsetX / distance;
  const directionY = offsetY / distance;
  return {
    active: true,
    label: remappedStrength > 0.05 ? "inspect" : "anchored",
    x: directionX * remappedStrength,
    y: directionY * remappedStrength,
    strength: remappedStrength,
  };
}

function getVictoryInspectionObject() {
  if (!selectedEntity) {
    return null;
  }
  if (selectedEntity.bodyDetail && getPlanetInspectionReveal(selectedEntity) > 0.01) {
    return planetDetailPivot ?? planetDetailBody;
  }
  return selectedEntity.inspectionObject ?? selectedEntity.object ?? null;
}

function applyVictorySelectionControl(anchorState, deltaSec) {
  if (!anchorState.active || anchorState.strength <= 0.001) {
    return 0;
  }
  const object = getVictoryInspectionObject();
  if (!object) {
    return 0;
  }
  const depth = THREE.MathUtils.clamp(getVictorySelectionDepth(), 0, 1);
  const yawSpeed = VICTORY_LOCAL_YAW_SPEED * THREE.MathUtils.lerp(0.72, 1.18, depth);
  const pitchSpeed = VICTORY_LOCAL_PITCH_SPEED * THREE.MathUtils.lerp(0.66, 1.06, depth);
  object.rotation.y += anchorState.x * yawSpeed * deltaSec;
  object.rotation.x = THREE.MathUtils.clamp(
    object.rotation.x + anchorState.y * pitchSpeed * deltaSec,
    -1.25,
    1.25
  );
  return anchorState.strength;
}

function applyVictoryLayerControl(pointer, deltaSec) {
  const center = getVictoryLayerCenter();
  const offsetX = pointer.x - center.x;
  const offsetY = pointer.y - center.y;
  const distance = Math.hypot(offsetX, offsetY);
  if (distance <= VICTORY_LAYER_DEADZONE_PX) {
    victoryManipulating = true;
    gestureLiftTarget = 0;
    return 0;
  }
  const usableDistance = Math.min(distance, VICTORY_LAYER_RADIUS_PX);
  const strength = THREE.MathUtils.clamp(
    (usableDistance - VICTORY_LAYER_DEADZONE_PX) / (VICTORY_LAYER_RADIUS_PX - VICTORY_LAYER_DEADZONE_PX),
    0,
    1
  );
  const directionX = offsetX / distance;
  const directionY = offsetY / distance;
  targetYaw += directionX * strength * VICTORY_LAYER_YAW_SPEED * deltaSec;
  targetPitch = THREE.MathUtils.clamp(
    targetPitch + directionY * strength * VICTORY_LAYER_PITCH_SPEED * deltaSec,
    -0.9,
    0.9
  );
  victoryManipulating = true;
  gestureLiftTarget = 0;
  return strength;
}

function applyTwoFingerEdgePan(x, y, deltaSec) {
  panVector.set(
    (x / window.innerWidth) * 2 - 1,
    (y / window.innerHeight) * 2 - 1
  );
  const magnitude = panVector.length();
  const stabilityDepth = getVictoryStabilityDepth();
  const panDeadzone = THREE.MathUtils.lerp(TWO_FINGER_PAN_DEADZONE, 0.86, stabilityDepth);
  if (magnitude <= panDeadzone) {
    return 0;
  }
  const strength = smoothstep(panDeadzone, 1.14, magnitude);
  panVector.multiplyScalar(1 / magnitude);
  const speed = TWO_FINGER_PAN_SPEED * THREE.MathUtils.lerp(1, 0.34, stabilityDepth);
  targetYaw += panVector.x * strength * speed * deltaSec;
  targetPitch = THREE.MathUtils.clamp(
    targetPitch + panVector.y * strength * speed * 0.72 * deltaSec,
    -0.9,
    0.9
  );
  return strength;
}

function navigateGestureLayer(direction) {
  if (direction > 0 && navigateLaniakeaGestureOutward()) {
    return;
  }
  const activeBand = getActiveBand();
  const index = scaleBands.findIndex((band) => band.key === activeBand.key);
  if (index < 0) {
    return;
  }
  const nextIndex = THREE.MathUtils.clamp(index + direction, 0, scaleBands.length - 1);
  if (nextIndex !== index) {
    navigateToBand(scaleBands[nextIndex].key);
  }
}

function navigateLaniakeaGestureOutward() {
  if (!selectedEntity) {
    return false;
  }
  if (isLaniakeaNestedEntity(selectedEntity)) {
    const childEntity = selectedEntity;
    const parentEntity = getEntityParent(childEntity);
    if (!parentEntity) {
      return false;
    }
    selectEntity(parentEntity, false);
    updateHoverHint(null);
    targetZoom = LANIAKEA_NESTED_VIEW_ZOOM;
    clampTargetZoom();
    triggerTravelPulse(getTraversalPulseAmount(childEntity, parentEntity));
    return true;
  }
  if (
    selectedEntity.band === "laniakea" &&
    getEntityChildren(selectedEntity, 1).length > 0 &&
    getSelectedInspectionDepth(selectedEntity) > 0.035
  ) {
    targetZoom = getBandByKey("laniakea").center;
    clampTargetZoom();
    triggerTravelPulse(0.85);
    updateHoverHint(null);
    return true;
  }
  return false;
}

function selectCosmonautDestination() {
  const candidates = selectableEntities.filter((entity) =>
    entity !== selectedEntity &&
    !entity.detailOnly &&
    !entity.dynamicSystemOnly &&
    !entity.hostSystemId &&
    entity.hitTarget &&
    entity.priority >= 3
  );
  if (candidates.length === 0) {
    return;
  }
  const destination = candidates[Math.floor(Math.random() * candidates.length)];
  selectEntity(destination);
  updateHoverHint(null);
}

async function startHandControls() {
  if (handControlsEnabled) {
    return;
  }
  handToggle.disabled = true;
  setHandMode("camera", false);
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera capture is unavailable in this browser context.");
    }
    gestureStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 360 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    });
    gestureVideo = document.createElement("video");
    gestureVideo.autoplay = true;
    gestureVideo.muted = true;
    gestureVideo.playsInline = true;
    gestureVideo.srcObject = gestureStream;
    await gestureVideo.play();

    if (!gestureRecognizer) {
      setHandMode("loading", false);
      const { FilesetResolver, GestureRecognizer } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(GESTURE_WASM_PATH);
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: GESTURE_MODEL_PATH,
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.62,
        minHandPresenceConfidence: 0.56,
        minTrackingConfidence: 0.62,
        cannedGesturesClassifierOptions: {
          scoreThreshold: GESTURE_SCORE_THRESHOLD,
        },
      });
    }
    gestureRecognizerReady = true;
    handControlsEnabled = true;
    handPresenceActive = false;
    handPresenceStatus = "away";
    handPresenceCandidateSinceMs = 0;
    handPresenceLostSinceMs = 0;
    latestGestureHands = [];
    lastGestureSeenMs = 0;
    handToggle.classList.add("is-active");
    handToggle.disabled = false;
    setHandMode("search", true);
  } catch (error) {
    console.error("Hand control initialization failed:", error);
    gestureStream?.getTracks?.().forEach((track) => track.stop());
    gestureStream = null;
    gestureVideo = null;
    gestureRecognizerReady = false;
    handControlsEnabled = false;
    handToggle.classList.remove("is-active");
    handToggle.disabled = false;
    const cameraFailed = error?.name === "NotAllowedError" || error?.name === "NotFoundError";
    setHandMode(cameraFailed ? "blocked" : "failed", false);
  }
}

function stopHandControls() {
  gestureStream?.getTracks?.().forEach((track) => track.stop());
  if (gestureVideo) {
    gestureVideo.pause?.();
    gestureVideo.srcObject = null;
  }
  gestureStream = null;
  gestureVideo = null;
  gestureRecognizerReady = false;
  handControlsEnabled = false;
  handPresenceActive = false;
  handPresenceStatus = "away";
  handPresenceCandidateSinceMs = 0;
  handPresenceLostSinceMs = 0;
  latestGestureHands = [];
  lastGestureSeenMs = 0;
  lastGestureVideoTime = -1;
  resetOneHandGestureLatches();
  resetVictoryManipulation();
  updateHandReticle(false);
  handToggle.classList.remove("is-active");
  handToggle.disabled = false;
  setHandMode("idle", false);
}

function queueGestureDetection(nowMs) {
  if (
    !gestureRecognizerReady ||
    !gestureVideo ||
    gestureVideo.readyState < 2 ||
    nowMs - lastGestureDetectionMs < GESTURE_DETECTION_INTERVAL_MS ||
    gestureVideo.currentTime === lastGestureVideoTime
  ) {
    return;
  }
  lastGestureDetectionMs = nowMs;
  lastGestureVideoTime = gestureVideo.currentTime;
  let timestamp = gestureVideo.currentTime * 1000;
  if (!Number.isFinite(timestamp)) {
    timestamp = nowMs;
  }
  timestamp = Math.max(timestamp, lastGestureTimestampMs + 0.01);
  lastGestureTimestampMs = timestamp;
  try {
    const hands = serializeGestureResult(gestureRecognizer.recognizeForVideo(gestureVideo, timestamp));
    updateHandPresence(hands, nowMs);
  } catch (error) {
    console.error("Hand gesture detection failed:", error);
    handPresenceActive = false;
    handPresenceStatus = "away";
    handPresenceCandidateSinceMs = 0;
    handPresenceLostSinceMs = 0;
    latestGestureHands = [];
    resetOneHandGestureLatches();
    updateHandReticle(false);
    setHandMode("miss", false);
  }
}

function updateVictoryManipulation(landmarks, nowMs) {
  const { x, y } = getTwoFingerPointer(landmarks);
  const index = landmarks[8];
  const middle = landmarks[12] ?? index;
  const liftTarget = THREE.MathUtils.clamp((0.5 - (index.y + middle.y) * 0.5) * 9.5, -4.2, 4.2);
  const stabilityDepth = getVictoryStabilityDepth();
  const jitterDeadzone = THREE.MathUtils.lerp(
    VICTORY_JITTER_DEADZONE_PX,
    VICTORY_JITTER_DEADZONE_PX * 2.15,
    stabilityDepth
  );
  const maxDelta = THREE.MathUtils.lerp(VICTORY_MAX_DELTA_PX, 11, stabilityDepth);
  const yawSpeed = VICTORY_ROTATION_YAW_SPEED * THREE.MathUtils.lerp(1, 0.44, stabilityDepth);
  const pitchSpeed = VICTORY_ROTATION_PITCH_SPEED * THREE.MathUtils.lerp(1, 0.44, stabilityDepth);
  const liftSmoothing = VICTORY_LIFT_SMOOTHING * THREE.MathUtils.lerp(1, 0.56, stabilityDepth);
  victoryPointerCandidate.set(x, y);

  if (!victoryManipulating || !victoryPointerReady) {
    victoryPointerFiltered.copy(victoryPointerCandidate);
    victoryPointerPrevious.copy(victoryPointerFiltered);
    victoryLiftFiltered = liftTarget;
    gestureLiftTarget = victoryLiftFiltered;
    victoryManipulating = true;
    victoryPointerReady = true;
    return true;
  }

  const rawDelta = victoryPointerCandidate.distanceTo(victoryPointerFiltered);
  if (rawDelta > VICTORY_REFRACTORY_DELTA_PX) {
    victoryRefractoryUntilMs = nowMs + VICTORY_REFRACTORY_MS;
    resetVictoryManipulation();
    return true;
  }

  victoryPointerFiltered.lerp(victoryPointerCandidate, VICTORY_POINTER_SMOOTHING);
  let dx = victoryPointerFiltered.x - victoryPointerPrevious.x;
  let dy = victoryPointerFiltered.y - victoryPointerPrevious.y;
  const smoothedDelta = Math.hypot(dx, dy);
  victoryPointerPrevious.copy(victoryPointerFiltered);
  if (smoothedDelta > jitterDeadzone) {
    const deliberateDelta = Math.min(smoothedDelta - jitterDeadzone, maxDelta);
    const scale = deliberateDelta / smoothedDelta;
    dx *= scale;
    dy *= scale;
    targetYaw += dx * yawSpeed;
    targetPitch = THREE.MathUtils.clamp(targetPitch + dy * pitchSpeed, -0.9, 0.9);
  }

  victoryLiftFiltered = THREE.MathUtils.lerp(victoryLiftFiltered, liftTarget, liftSmoothing);
  gestureLiftTarget = victoryLiftFiltered;
  return false;
}

function updateGestureControls(nowMs, deltaSec) {
  queueGestureDetection(nowMs);
  if (!handControlsEnabled) {
    return;
  }

  if (handPresenceStatus === "enter") {
    resetVictoryManipulation();
    updateHandReticle(false);
    setHandMode("enter", true);
    return;
  }

  if (handPresenceStatus === "release") {
    resetVictoryManipulation();
    updateHandReticle(false);
    setHandMode("release", true);
    return;
  }

  if (handPresenceStatus === "away") {
    resetVictoryManipulation();
    updateHandReticle(false);
    setHandMode("away", true);
    return;
  }

  if (nowMs - lastGestureSeenMs > GESTURE_LOST_GRACE_MS) {
    latestGestureHands = [];
    handPresenceActive = false;
    handPresenceStatus = "away";
    handPresenceCandidateSinceMs = 0;
    handPresenceLostSinceMs = 0;
    resetOneHandGestureLatches();
    updateHandReticle(false);
    setHandMode("away", true);
    return;
  }

  if (latestGestureHands.length !== 1) {
    resetOneHandGestureLatches();
    updateHandReticle(false);
    setHandMode(latestGestureHands.length > 1 ? "two hands" : "search", true);
    return;
  }

  const hand = latestGestureHands[0];
  const landmarks = hand.landmarks;
  if (!landmarks?.[8]) {
    resetVictoryManipulation();
    updateHandReticle(false);
    return;
  }

  const rawGestureName = getStableGestureName(hand, GESTURE_SCORE_THRESHOLD);
  const gestureName = getGestureIntentName(rawGestureName, landmarks, nowMs);
  const gestureHoldMs = getGestureHoldMs(gestureName, nowMs);
  const pinch = getPinchState(landmarks, pinchLatched);
  const pointerX = handScreenX(landmarks[8]);
  const pointerY = handScreenY(landmarks[8]);
  const pointing = gestureName === "Pointing_Up" || isIndexOnlyPointing(landmarks);

  if (gestureName !== "Thumb_Up" && gestureName !== "Thumb_Down") {
    layerStepLatch = null;
  }
  if (gestureName !== "ILoveYou") {
    cosmonautLatched = false;
  }

  if (gestureName === "Victory") {
    pinchLatched = false;
    resetPointSelection();
    const twoFingerPointer = getTwoFingerPointer(landmarks);

    if (!isVictorySelectionView()) {
      resetVictoryAnchor();
      updateVictoryLayerGuide(true);
      updateHandReticle(true, twoFingerPointer.x, twoFingerPointer.y, "two");
      const controlStrength = applyVictoryLayerControl(handPointer, deltaSec);
      setHandMode(controlStrength > 0.05 ? "layer steer" : "layer guide", true);
      return;
    }

    updateVictoryLayerGuide(false);
    const anchorState = updateVictoryAnchor(twoFingerPointer, nowMs);
    updateHandReticle(
      true,
      twoFingerPointer.x,
      twoFingerPointer.y,
      anchorState.active ? "anchor" : "two"
    );
    if (!anchorState.active) {
      setHandMode(anchorState.label, true);
      return;
    }
    if (nowMs < victoryRefractoryUntilMs) {
      resetVictoryManipulation();
      setHandMode("settle", true);
      return;
    }
    victoryManipulating = true;
    const strength = applyVictorySelectionControl(anchorState, deltaSec);
    setHandMode(strength > 0.05 ? anchorState.label : "anchored", true);
    return;
  }
  resetVictoryManipulation();

  if (gestureName === "Thumb_Up" || gestureName === "Thumb_Down") {
    handleLayerStepGesture(gestureName, gestureHoldMs);
    return;
  }

  if (gestureName === "Closed_Fist") {
    handleZoomGesture(-1, gestureHoldMs, deltaSec, "hold in", "inward");
    return;
  }

  if (gestureName === "Open_Palm") {
    handleZoomGesture(1, gestureHoldMs, deltaSec, "hold out", "outward");
    return;
  }

  if (gestureName === "ILoveYou") {
    handleCosmonautGesture(nowMs);
    return;
  }

  const pointerVisible = pointing;
  let gestureModeLabel = pointerVisible ? "point" : "ready";
  updateHandReticle(pointerVisible, pointerX, pointerY, "point");
  if (pointerVisible) {
    const candidate = findHandPointCandidate(handPointer.x, handPointer.y);
    gestureModeLabel = updatePointSelection(candidate, nowMs);
  } else {
    resetPointSelection();
  }
  pinchLatched = pinch.active;
  setHandMode(gestureModeLabel, true);
}

function invalidateRenderCaches() {
  renderCacheVersion += 1;
  animationCacheDirty = true;
}

function getMaterialEntries(group) {
  return getSceneMaterialEntries(group, renderCacheVersion);
}

function refreshAnimatedObjects() {
  if (!animationCacheDirty) {
    return;
  }
  animatedObjects = [];
  orbitObjects = [];
  root.traverse((object) => {
    if (Number.isFinite(object.userData.spin) || object.userData.spinVector || object.userData.breath) {
      animatedObjects.push(object);
    }
    if (object.userData.orbit) {
      orbitObjects.push(object);
    }
  });
  animationCacheDirty = false;
}

function makeLayer(key, center, width, baseScale, group) {
  root.add(group);
  layers.push({ key, center, width, baseScale, group });
  return group;
}

function setLayerOpacity(group, opacity, elapsed = 0) {
  group.visible = opacity > 0.012;
  setObjectOpacity(group, opacity, elapsed);
}

function setObjectOpacity(group, opacity, elapsed = 0) {
  setSceneObjectOpacity(group, opacity, elapsed, renderCacheVersion);
}

function revealObjectBranch(object) {
  let current = object;
  while (current) {
    current.visible = true;
    if (current === root) {
      break;
    }
    current = current.parent;
  }
}

function getStellarSpotProfile(spectral = "star") {
  const type = String(spectral).toLowerCase();
  if (type.includes("cluster") || type.includes("white")) {
    return { count: 0 };
  }
  if (type.includes("blue")) {
    return {
      count: 8,
      sizeMin: 0.075,
      sizeMax: 0.16,
      opacity: 0.34,
      haloOpacity: 0.035,
      cycleSpeed: 0.74,
      driftSpin: 0.0011,
      latitude: 0.18,
      spread: 0.42,
      color: 0x24152a,
      colorLift: 0.18,
    };
  }
  if (type.includes("red-supergiant")) {
    return {
      count: 22,
      sizeMin: 0.13,
      sizeMax: 0.3,
      opacity: 0.58,
      haloOpacity: 0.055,
      cycleSpeed: 0.42,
      driftSpin: 0.00072,
      latitude: 0.24,
      spread: 0.78,
      color: 0x250904,
      colorLift: 0.08,
    };
  }
  if (type.includes("red")) {
    return {
      count: 24,
      sizeMin: 0.095,
      sizeMax: 0.24,
      opacity: 0.62,
      haloOpacity: 0.06,
      cycleSpeed: 0.94,
      driftSpin: 0.0023,
      latitude: 0.28,
      spread: 0.62,
      color: 0x0f0301,
      colorLift: 0.04,
    };
  }
  if (type.includes("orange") || type.includes("k-")) {
    return {
      count: 20,
      sizeMin: 0.085,
      sizeMax: 0.2,
      opacity: 0.52,
      haloOpacity: 0.045,
      cycleSpeed: 0.82,
      driftSpin: 0.0019,
      latitude: 0.22,
      spread: 0.54,
      color: 0x160603,
      colorLift: 0.07,
    };
  }
  return {
    count: 22,
    sizeMin: 0.082,
    sizeMax: 0.19,
    opacity: 0.54,
    haloOpacity: 0.04,
    cycleSpeed: 0.72,
    driftSpin: 0.00185,
    latitude: 0.18,
    spread: 0.46,
    color: 0x120502,
    colorLift: 0.07,
  };
}

function createStellarActivityField({ id, radius, color, spectral }) {
  const profile = getStellarSpotProfile(spectral);
  if (!profile.count) {
    return null;
  }

  const baseColor = new THREE.Color(color);
  const spotColor = new THREE.Color(profile.color).lerp(baseColor, profile.colorLift ?? 0.1);
  const faculaColor = baseColor.clone().lerp(new THREE.Color(0xfff0bc), 0.46);
  const phaseSeed = Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 41, 0);
  const spotRandom = seededRandom(phaseSeed + Math.round(radius * 1000));
  const maxRegions = 24;
  const regionCenters = Array.from({ length: maxRegions }, () => new THREE.Vector4(0, 1, 0, 0));
  const regionCycles = Array.from({ length: maxRegions }, () => new THREE.Vector4(0, 0, 0, 0));
  const regionAxes = Array.from({ length: maxRegions }, () => new THREE.Vector4(1, 0, 0, 1));
  const regionCount = Math.min(profile.count, maxRegions);
  for (let i = 0; i < regionCount; i += 1) {
    const lane = i % 4;
    const longitude = spotRandom() * Math.PI * 2 + lane * 0.22;
    const latitudeSign = spotRandom() > 0.5 ? 1 : -1;
    const latitude =
      latitudeSign * profile.latitude +
      (spotRandom() - 0.5) * profile.spread;
    const normal = new THREE.Vector3(
      Math.cos(latitude) * Math.cos(longitude),
      Math.sin(latitude),
      Math.cos(latitude) * Math.sin(longitude)
    ).normalize();
    const referenceAxis = Math.abs(normal.y) < 0.82
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const tangentAxis = referenceAxis.cross(normal).normalize();
    tangentAxis.applyAxisAngle(normal, spotRandom() * Math.PI * 2);
    const aspect = 0.28 + Math.pow(spotRandom(), 1.45) * 0.68;
    const angularRadius = profile.sizeMin + spotRandom() * (profile.sizeMax - profile.sizeMin);
    regionCenters[i].set(normal.x, normal.y, normal.z, angularRadius);
    regionCycles[i].set(
      profile.cycleSpeed * (0.74 + spotRandom() * 0.72),
      phaseSeed * 0.001 + spotRandom() * Math.PI * 2,
      profile.opacity * (0.74 + spotRandom() * 0.44),
      (profile.haloOpacity ?? profile.opacity * 0.55) * (0.72 + spotRandom() * 0.42)
    );
    regionAxes[i].set(tangentAxis.x, tangentAxis.y, tangentAxis.z, aspect);
  }
  return {
    regionCount,
    regionCenters,
    regionCycles,
    regionAxes,
    darkColor: spotColor,
    faculaColor,
  };
}

function createStellarCoreMaterial({ color, texture, activityField }) {
  if (!activityField) {
    return createMaterial(
      THREE.MeshBasicMaterial,
      {
        color,
        map: texture,
      },
      1
    );
  }
  const baseColor = new THREE.Color(color);
  return createMaterial(
    THREE.ShaderMaterial,
    {
      uniforms: {
        starMap: { value: texture },
        baseColor: { value: baseColor },
        time: { value: 0 },
        layerOpacity: { value: 1 },
        regionCount: { value: activityField.regionCount },
        regionCenters: { value: activityField.regionCenters },
        regionCycles: { value: activityField.regionCycles },
        regionAxes: { value: activityField.regionAxes },
        darkColor: { value: activityField.darkColor },
        faculaColor: { value: activityField.faculaColor },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vLocalNormal;

        void main() {
          vUv = uv;
          vLocalNormal = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        #define MAX_REGIONS 24
        uniform float time;
        uniform float layerOpacity;
        uniform int regionCount;
        uniform sampler2D starMap;
        uniform vec3 baseColor;
        uniform vec4 regionCenters[MAX_REGIONS];
        uniform vec4 regionCycles[MAX_REGIONS];
        uniform vec4 regionAxes[MAX_REGIONS];
        uniform vec3 darkColor;
        uniform vec3 faculaColor;
        varying vec2 vUv;
        varying vec3 vLocalNormal;

        void main() {
          vec3 normal = normalize(vLocalNormal);
          float dark = 0.0;
          float facula = 0.0;

          for (int i = 0; i < MAX_REGIONS; i += 1) {
            if (i >= regionCount) {
              break;
            }
            vec4 region = regionCenters[i];
            vec4 cycleData = regionCycles[i];
            vec3 center = normalize(region.xyz);
            float angularDistance = acos(clamp(dot(normal, center), -1.0, 1.0));
            float radius = region.w;
            vec4 axisData = regionAxes[i];
            vec3 axisU = normalize(axisData.xyz);
            vec3 axisV = normalize(cross(center, axisU));
            vec3 tangentDelta = normal - center * dot(normal, center);
            float tangentLength = max(length(tangentDelta), 0.0001);
            float x = dot(tangentDelta, axisU);
            float y = dot(tangentDelta, axisV);
            float aspect = clamp(axisData.w, 0.24, 1.0);
            float theta = atan(y, x);
            float ellipseChord = sqrt(x * x + (y / aspect) * (y / aspect));
            float ellipseDistance = ellipseChord * angularDistance / tangentLength;
            float edgeVariance =
              1.0 +
              0.1 * sin(theta * 3.0 + cycleData.y * 1.31) +
              0.055 * sin(theta * 5.0 - cycleData.y * 0.73);
            float shapedDistance = ellipseDistance / clamp(edgeVariance, 0.78, 1.18);
            float regionGate = 1.0 - smoothstep(radius * 0.98, radius * 1.18, angularDistance);
            float birth = 0.5 + 0.5 * sin(time * cycleData.x + cycleData.y);
            float activity = 0.16 + 0.84 * smoothstep(0.08, 0.38, birth) *
              (1.0 - smoothstep(0.92, 1.0, birth) * 0.16);
            float core = (1.0 - smoothstep(radius * 0.16, radius * 0.68, shapedDistance)) * regionGate;
            float penumbra = (1.0 - smoothstep(radius * 0.32, radius * 1.08, shapedDistance)) * regionGate;
            float facularRim = (1.0 - smoothstep(radius * 0.78, radius * 1.16, shapedDistance)) *
              smoothstep(radius * 0.28, radius * 0.74, shapedDistance) *
              regionGate;

            dark = max(dark, (core * 0.86 + penumbra * 0.28) * activity * cycleData.z);
            facula = max(facula, facularRim * activity * cycleData.w);
          }

          vec3 surface = texture2D(starMap, vUv).rgb * mix(vec3(1.0), baseColor, 0.18);
          surface = mix(surface, faculaColor, facula * 0.12);
          surface = mix(surface, darkColor, clamp(dark * 1.35, 0.0, 0.88));
          float coreAlpha = smoothstep(0.06, 0.24, layerOpacity);
          gl_FragColor = vec4(surface, coreAlpha);
        }
      `,
      blending: THREE.NormalBlending,
    },
    1
  );
}

function isObjectAttachedToRoot(object) {
  let current = object;
  while (current) {
    if (current === root) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function updateStellarSunspots(elapsed) {
  for (let i = stellarActivityLayers.length - 1; i >= 0; i -= 1) {
    const layer = stellarActivityLayers[i];
    if (!layer.parent || !isObjectAttachedToRoot(layer)) {
      stellarActivityLayers.splice(i, 1);
      continue;
    }
    const material = layer.material;
    if (!material?.uniforms) {
      continue;
    }
    material.uniforms.time.value = elapsed;
    material.uniforms.layerOpacity.value = material.opacity ?? material.userData.baseOpacity ?? 0.36;
  }
}

function createStarTexture(id, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  const baseColor = new THREE.Color(color);
  const hotColor = new THREE.Color(0xffdf8f);
  const deepColor = baseColor.clone().offsetHSL(-0.04, 0.18, -0.26);
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 19, 0)
  );
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, `#${hotColor.clone().lerp(baseColor, 0.32).getHexString()}`);
  gradient.addColorStop(0.46, `#${baseColor.getHexString()}`);
  gradient.addColorStop(1, `#${deepColor.getHexString()}`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 42; i += 1) {
    const y = localRandom() * canvas.height;
    const amplitude = 8 + localRandom() * 22;
    const width = 1.5 + localRandom() * 5;
    context.beginPath();
    for (let x = 0; x <= canvas.width; x += 18) {
      const wave =
        Math.sin(x * (0.012 + localRandom() * 0.002) + i * 0.42) * amplitude +
        Math.sin(x * 0.033 + i) * amplitude * 0.34;
      if (x === 0) context.moveTo(x, y + wave);
      else context.lineTo(x, y + wave);
    }
    context.strokeStyle =
      i % 4 === 0 ? "rgba(255, 239, 178, 0.24)" : "rgba(255, 126, 48, 0.16)";
    context.lineWidth = width;
    context.stroke();
  }

  for (let i = 0; i < 80; i += 1) {
    const x = localRandom() * canvas.width;
    const y = localRandom() * canvas.height;
    const radius = 5 + localRandom() * 22;
    const flare = context.createRadialGradient(x, y, 0, x, y, radius);
    flare.addColorStop(0, "rgba(255, 239, 196, 0.22)");
    flare.addColorStop(0.45, "rgba(255, 165, 56, 0.1)");
    flare.addColorStop(1, "rgba(255, 92, 28, 0)");
    context.fillStyle = flare;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  for (let i = 0; i < 28; i += 1) {
    const x = localRandom() * canvas.width;
    const y = canvas.height * (0.18 + localRandom() * 0.64);
    const rx = 4 + localRandom() * 14;
    const ry = rx * (0.38 + localRandom() * 0.48);
    const rotation = (localRandom() - 0.5) * 0.9;
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    context.fillStyle = `rgba(255, 217, 128, ${0.025 + localRandom() * 0.045})`;
    context.beginPath();
    context.ellipse(0, 0, rx * 1.65, ry * 1.55, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `rgba(64, 20, 4, ${0.035 + localRandom() * 0.055})`;
    context.beginPath();
    context.ellipse(0, 0, rx * 0.92, ry * 0.88, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createPlasmaStarCore({
  id,
  radius,
  color,
  spectral = "star",
  flareCount = 12,
}) {
  const group = new THREE.Group();
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 23, 0)
  );
  const activityField = createStellarActivityField({ id, radius, color, spectral });
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 32),
    createStellarCoreMaterial({
      color,
      texture: createStarTexture(id, color),
      activityField,
    })
  );
  core.userData.spin = spectral === "red-supergiant" ? 0.00065 : 0.0017;
  if (activityField) {
    stellarActivityLayers.push(core);
  }
  const coronaPositions = [];
  const coronaColors = [];
  const baseColor = new THREE.Color(color);
  const hotColor = new THREE.Color(0xffe3a8);
  const emberColor = spectral === "red-supergiant" ? new THREE.Color(0xff4d2a) : new THREE.Color(0xff9852);
  const detailFactor = THREE.MathUtils.clamp(radius / 3.2, 0.42, 1);
  const coronaCount = Math.round(220 + detailFactor * 360);
  const effectiveFlareCount = Math.max(5, Math.round(flareCount * (0.48 + detailFactor * 0.34)));
  for (let i = 0; i < coronaCount; i += 1) {
    const theta = localRandom() * Math.PI * 2;
    const z = localRandom() * 2 - 1;
    const xy = Math.sqrt(Math.max(0, 1 - z * z));
    const shell = radius * (1.01 + Math.pow(localRandom(), 2.2) * 0.22);
    const ripple = 1 + Math.sin(theta * 7 + z * 5 + i * 0.03) * 0.045;
    coronaPositions.push(
      Math.cos(theta) * xy * shell * ripple,
      z * shell,
      Math.sin(theta) * xy * shell * ripple
    );
    reusableColor.lerpColors(baseColor, hotColor, localRandom() * 0.78);
    if (localRandom() > 0.72) reusableColor.lerp(emberColor, 0.35);
    coronaColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const corona = createPointCloud({ positions: coronaPositions, colors: coronaColors }, Math.max(0.035, radius * 0.034), 0.42, true);
  corona.userData.spinVector = new THREE.Vector3(0.00018, spectral === "red-supergiant" ? 0.00038 : 0.0007, -0.00011);
  corona.material.userData.twinkleAmount = 0.18;
  corona.material.userData.twinkleSpeed = spectral === "red-supergiant" ? 0.9 : 1.45;

  const flareGroup = new THREE.Group();
  for (let i = 0; i < effectiveFlareCount; i += 1) {
    const theta = localRandom() * Math.PI * 2;
    const z = localRandom() * 1.8 - 0.9;
    const xy = Math.sqrt(Math.max(0, 1 - z * z));
    const direction = new THREE.Vector3(Math.cos(theta) * xy, z, Math.sin(theta) * xy).normalize();
    const side = new THREE.Vector3(-direction.z, localRandom() - 0.5, direction.x).normalize();
    const endDirection = direction.clone().add(side.clone().multiplyScalar(0.32 + localRandom() * 0.64)).normalize();
    const crownDirection = direction.clone().add(endDirection).normalize();
    const lift = radius * (0.22 + localRandom() * 0.68);
    const points = [
      direction.clone().multiplyScalar(radius * 1.02),
      direction.clone().multiplyScalar(radius * (1.1 + localRandom() * 0.08)).add(side.clone().multiplyScalar(lift * 0.18)),
      crownDirection.clone().multiplyScalar(radius * (1.24 + localRandom() * 0.32)).add(side.clone().multiplyScalar(lift * 0.42)),
      endDirection.clone().multiplyScalar(radius * (1.1 + localRandom() * 0.08)).add(side.clone().multiplyScalar(lift * 0.16)),
      endDirection.clone().multiplyScalar(radius * 1.02),
    ];
    const curve = new THREE.CatmullRomCurve3(points);
    const loopPositions = [];
    const loopColors = [];
    const loopPoints = curve.getPoints(26 + Math.floor(localRandom() * 9) + Math.round(detailFactor * 18));
    for (let sampleIndex = 0; sampleIndex < loopPoints.length; sampleIndex += 1) {
      const t = sampleIndex / Math.max(1, loopPoints.length - 1);
      const point = loopPoints[sampleIndex];
      const width = radius * (0.008 + Math.sin(t * Math.PI) * (0.018 + localRandom() * 0.014));
      const twins = localRandom() > 0.76 ? 2 : 1;
      for (let pixel = 0; pixel < twins; pixel += 1) {
        loopPositions.push(
          point.x + (localRandom() - 0.5) * width,
          point.y + (localRandom() - 0.5) * width,
          point.z + (localRandom() - 0.5) * width
        );
        reusableColor
          .copy(baseColor)
          .lerp(hotColor, 0.42 + Math.sin(t * Math.PI) * 0.38)
          .lerp(emberColor, localRandom() * 0.18);
        loopColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
    const prominence = createPointCloud(
      { positions: loopPositions, colors: loopColors },
      Math.max(0.045, radius * (0.038 + localRandom() * 0.018)),
      0.24 + localRandom() * 0.18,
      true
    );
    prominence.material.userData.twinkleAmount = 0.34;
    prominence.material.userData.twinkleSpeed = 1.5 + localRandom() * 1.2;
    prominence.userData.spinVector = new THREE.Vector3(
      (localRandom() - 0.5) * 0.00034,
      (localRandom() > 0.5 ? 1 : -1) * (0.0007 + localRandom() * 0.0012),
      (localRandom() - 0.5) * 0.00034
    );
    flareGroup.add(prominence);
  }
  flareGroup.userData.spinVector = new THREE.Vector3(0.0001, spectral === "red-supergiant" ? 0.00034 : 0.00058, 0.00008);

  const innerHalo = createGlowSphere(radius * 1.08, color, spectral === "red-supergiant" ? 0.034 : 0.026);
  const outerHalo = createGlowSphere(radius * 1.38, color, spectral === "red-supergiant" ? 0.006 : 0.004);
  innerHalo.userData.breath = { amount: 0.012, speed: 0.8, phase: radius };
  outerHalo.userData.breath = { amount: 0.016, speed: 0.5, phase: radius * 2 };
  group.add(outerHalo, innerHalo, corona, flareGroup, core);
  return group;
}

function makeLocalSpherePoint(localRandom, radius) {
  const theta = localRandom() * Math.PI * 2;
  const z = localRandom() * 2 - 1;
  const xy = Math.sqrt(Math.max(0, 1 - z * z));
  return new THREE.Vector3(
    Math.cos(theta) * xy * radius,
    z * radius,
    Math.sin(theta) * xy * radius
  );
}

function createGravityPixelShear({
  seedLabel,
  radius,
  mode = "sink",
  count = 620,
  colorA = 0x7deaff,
  colorB = 0xffd175,
  colorC = 0xffffff,
  opacity = 0.38,
  size = 0.08,
}) {
  const positions = [];
  const colors = [];
  const localRandom = seededRandom(
    Array.from(seedLabel).reduce((total, char) => total + char.charCodeAt(0) * 29, 0)
  );
  const base = new THREE.Color(colorA);
  const hot = new THREE.Color(colorB);
  const white = new THREE.Color(colorC);
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    const lane = i % 7;
    const angle = t * Math.PI * (mode === "void" ? 5.6 : 9.2) + lane * 0.72 + localRandom() * 0.24;
    const curl = Math.sin(t * Math.PI * 2 + lane) * radius * (mode === "void" ? 0.34 : 0.18);
    const distance = mode === "void"
      ? radius * (2.1 + Math.pow(localRandom(), 0.48) * 2.9)
      : radius * (1.7 + t * 3.6 + localRandom() * 0.38);
    const shell = makeLocalSpherePoint(localRandom, radius * (mode === "void" ? 0.22 : 0.1));
    const pinch = mode === "void"
      ? 0.74 + Math.sin(t * Math.PI) * 0.46
      : 1 - Math.sin(t * Math.PI) * 0.28;
    positions.push(
      Math.cos(angle) * distance * pinch + shell.x,
      (localRandom() - 0.5) * radius * (mode === "void" ? 1.05 : 0.32) + curl * 0.22 + shell.y * 0.45,
      Math.sin(angle) * distance * (mode === "void" ? 0.5 : 0.42) + curl + shell.z
    );
    reusableColor.copy(base)
      .lerp(hot, mode === "void" ? 0.12 + localRandom() * 0.2 : 0.38 + t * 0.34)
      .lerp(white, localRandom() > 0.9 ? 0.35 : 0.04);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const shear = createPointCloud({ positions, colors }, size, opacity, true);
  shear.material.userData.twinkleAmount = mode === "void" ? 0.3 : 0.42;
  shear.material.userData.twinkleSpeed = mode === "void" ? 0.38 : 0.9;
  shear.userData.spinVector = mode === "void"
    ? new THREE.Vector3(0.000014, -0.00005, 0.000018)
    : new THREE.Vector3(0.00005, 0.0018, -0.00002);
  shear.userData.breath = {
    amount: mode === "void" ? 0.035 : 0.018,
    speed: mode === "void" ? 0.42 : 1.1,
    phase: radius,
  };
  return shear;
}

function createDebrisBelt({
  seedLabel,
  innerRadius,
  outerRadius,
  count,
  colorA,
  colorB,
  ySpread = 0.4,
  zScale = ECLIPTIC_Z_SCALE,
  size = 0.06,
  opacity = 0.42,
  clumpCount = 8,
}) {
  const group = new THREE.Group();
  const localRandom = seededRandom(
    Array.from(seedLabel).reduce((total, char) => total + char.charCodeAt(0) * 31, 0)
  );
  const clumps = Array.from({ length: clumpCount }, () => ({
    angle: localRandom() * Math.PI * 2,
    width: 0.08 + localRandom() * 0.16,
    bias: (localRandom() - 0.5) * (outerRadius - innerRadius) * 0.36,
  }));
  const positions = [];
  const colors = [];
  const colorOne = new THREE.Color(colorA);
  const colorTwo = new THREE.Color(colorB);

  for (let i = 0; i < count; i += 1) {
    const clump = clumps[Math.floor(localRandom() * clumps.length)];
    const isClumped = localRandom() > 0.48;
    const angle = isClumped
      ? clump.angle + (localRandom() - 0.5) * clump.width
      : localRandom() * Math.PI * 2;
    const radialNoise = Math.pow(localRandom(), 0.72);
    const distance = THREE.MathUtils.clamp(
      innerRadius + radialNoise * (outerRadius - innerRadius) + (isClumped ? clump.bias : 0) + (localRandom() - 0.5) * 0.44,
      innerRadius,
      outerRadius
    );
    positions.push(
      Math.cos(angle) * distance,
      (localRandom() - 0.5) * ySpread * (0.45 + localRandom()),
      Math.sin(angle) * distance * zScale
    );
    reusableColor.lerpColors(colorOne, colorTwo, localRandom());
    reusableColor.offsetHSL((localRandom() - 0.5) * 0.02, 0, (localRandom() - 0.5) * 0.16);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }

  group.add(createPointCloud({ positions, colors }, size, opacity, true));
  group.add(createSceneGuideRing(innerRadius, colorA, opacity * 0.16, 224, zScale));
  group.add(createSceneGuideRing((innerRadius + outerRadius) * 0.5, colorB, opacity * 0.1, 224, zScale));
  group.add(createSceneGuideRing(outerRadius, colorB, opacity * 0.14, 224, zScale));
  return group;
}

function createFilamentStream(points, color = 0x9df4ff, opacity = 0.32, beadSize = 0.28) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(point[0], point[1], point[2])));
  const samples = curve.getPoints(120);
  const geometry = new THREE.BufferGeometry().setFromPoints(samples);
  const group = new THREE.Group();
  const line = new THREE.Line(
    geometry,
    createMaterial(
      THREE.LineBasicMaterial,
      { color, blending: THREE.AdditiveBlending },
      opacity
    )
  );
  const beadPositions = [];
  const beadColors = [];
  const hotColor = new THREE.Color(color);
  for (let i = 0; i < samples.length; i += 2) {
    const sample = samples[i];
    beadPositions.push(sample.x, sample.y, sample.z);
    reusableColor.lerpColors(hotColor, new THREE.Color(0xffffff), (i % 11) / 18);
    beadColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const beads = createPointCloud({ positions: beadPositions, colors: beadColors }, beadSize, opacity * 1.35, true);
  beads.userData.breath = { amount: 0.045, speed: 0.52, phase: beadSize };
  group.add(line, beads);
  return group;
}

function createPixelFilamentStream(
  points,
  color = 0x9df4ff,
  opacity = 0.32,
  beadSize = 0.24,
  sampleCount = 120,
  spread = 0.18
) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(point[0], point[1], point[2])));
  const samples = curve.getPoints(sampleCount);
  const positions = [];
  const colors = [];
  const hotColor = new THREE.Color(color);
  const localRandom = seededRandom(
    Math.abs(Math.floor(points.flat().reduce((total, value) => total + value * 997, 1319))) || 1319
  );
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    const t = i / Math.max(1, samples.length - 1);
    const width = spread * (0.35 + Math.sin(t * Math.PI) * 0.9);
    const strands = i % 2 === 0 ? 3 : 2;
    for (let strand = 0; strand < strands; strand += 1) {
      const jitter = randomOnSphere(width * (0.25 + localRandom()));
      jitter.y *= 0.55;
      positions.push(sample.x + jitter.x, sample.y + jitter.y, sample.z + jitter.z);
      reusableColor.copy(hotColor).lerp(new THREE.Color(0xffffff), 0.18 + localRandom() * 0.5);
      reusableColor.offsetHSL((localRandom() - 0.5) * 0.04, 0, (localRandom() - 0.5) * 0.12);
      colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
  }
  const stream = createPointCloud({ positions, colors }, beadSize, opacity, true);
  stream.material.userData.twinkleAmount = 0.18;
  stream.material.userData.twinkleSpeed = 0.42;
  stream.userData.breath = { amount: 0.018, speed: 0.48, phase: beadSize };
  return stream;
}

function createContinuousConeEmitter({
  seedLabel = "continuous-cone-emitter",
  origin = [0, 0, 0],
  direction = [1, 0, 0],
  length = 1,
  startWidth = 0.02,
  endWidth = 0.35,
  count = 180,
  color = 0x9feaff,
  colorB = 0xffffff,
  size = 0.05,
  opacity = 0.42,
  speed = 0.22,
  pulseSpeed = 1.3,
  swirlSpeed = 0.55,
  turns = 1.15,
  fadePower = 1.15,
  turbulence = 0.03,
}) {
  const localRandom = seededRandom(
    Array.from(seedLabel).reduce((total, char) => total + char.charCodeAt(0) * 43, 2603)
  );
  const axis = new THREE.Vector3(direction[0], direction[1], direction[2]).normalize();
  const reference = Math.abs(axis.y) > 0.86 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const sideA = reference.clone().cross(axis).normalize();
  const sideB = axis.clone().cross(sideA).normalize();
  const originVector = new THREE.Vector3(origin[0], origin[1], origin[2]);
  const baseColor = new THREE.Color(color);
  const hotColor = new THREE.Color(colorB);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const angles = new Float32Array(count);
  const radialScales = new Float32Array(count);
  const colorMixes = new Float32Array(count);
  const jitters = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    phases[i] = localRandom();
    angles[i] = localRandom() * Math.PI * 2;
    radialScales[i] = Math.pow(localRandom(), 0.55);
    colorMixes[i] = localRandom();
    jitters[i] = localRandom() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = createMaterial(
    THREE.PointsMaterial,
    {
      color: 0xffffff,
      size,
      sizeAttenuation: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    },
    opacity
  );
  const emitter = new THREE.Points(geometry, material);
  continuousEmitters.push({
    emitter,
    positionAttribute: geometry.getAttribute("position"),
    colorAttribute: geometry.getAttribute("color"),
    origin: originVector,
    axis,
    sideA,
    sideB,
    length,
    startWidth,
    endWidth,
    speed,
    pulseSpeed,
    swirlSpeed,
    turns,
    fadePower,
    turbulence,
    phases,
    angles,
    radialScales,
    colorMixes,
    jitters,
    baseColor,
    hotColor,
  });
  return emitter;
}

function createBipolarContinuousEmission({
  seedLabel,
  origin = [0, 0, 0],
  axis = [0, 1, 0],
  length = 2,
  startWidth = 0.04,
  endWidth = 0.42,
  count = 160,
  colorA = 0x9feaff,
  colorB = 0xffe1a6,
  size = 0.05,
  opacity = 0.36,
  speed = 0.24,
  pulseSpeed = 1.4,
  swirlSpeed = 0.55,
}) {
  const group = new THREE.Group();
  for (const sign of [-1, 1]) {
    group.add(
      createContinuousConeEmitter({
        seedLabel: `${seedLabel}-${sign > 0 ? "positive" : "negative"}`,
        origin,
        direction: [axis[0] * sign, axis[1] * sign, axis[2] * sign],
        length,
        startWidth,
        endWidth,
        count,
        color: sign > 0 ? colorA : colorB,
        colorB: 0xffffff,
        size,
        opacity,
        speed: speed * (0.9 + (sign > 0 ? 0.12 : 0)),
        pulseSpeed: pulseSpeed * (sign > 0 ? 1.08 : 0.94),
        swirlSpeed: swirlSpeed * sign,
        turns: 1.5,
        fadePower: 1.25,
        turbulence: endWidth * 0.06,
      })
    );
  }
  return group;
}

function updateContinuousEmitters(elapsed) {
  for (const flow of continuousEmitters) {
    const positions = flow.positionAttribute.array;
    const colors = flow.colorAttribute.array;
    for (let i = 0; i < flow.phases.length; i += 1) {
      const t = (flow.phases[i] + elapsed * flow.speed) % 1;
      const ix = i * 3;
      const pulse = 0.72 + 0.28 * Math.sin(elapsed * flow.pulseSpeed + flow.jitters[i]);
      const coneWidth = THREE.MathUtils.lerp(flow.startWidth, flow.endWidth, Math.pow(t, 0.82));
      const radial = coneWidth * flow.radialScales[i] * (0.82 + pulse * 0.32);
      const angle = flow.angles[i] + elapsed * flow.swirlSpeed + t * Math.PI * 2 * flow.turns;
      const turbulence = Math.sin(elapsed * 0.9 + flow.jitters[i] + t * 6.2) * flow.turbulence * t;
      const axisDistance = flow.length * t;
      const offsetA = Math.cos(angle) * radial + turbulence;
      const offsetB = Math.sin(angle) * radial - turbulence * 0.5;
      positions[ix] = flow.origin.x + flow.axis.x * axisDistance + flow.sideA.x * offsetA + flow.sideB.x * offsetB;
      positions[ix + 1] = flow.origin.y + flow.axis.y * axisDistance + flow.sideA.y * offsetA + flow.sideB.y * offsetB;
      positions[ix + 2] = flow.origin.z + flow.axis.z * axisDistance + flow.sideA.z * offsetA + flow.sideB.z * offsetB;
      const fade = Math.pow(1 - t, flow.fadePower) * (0.62 + pulse * 0.38);
      reusableColor.copy(flow.baseColor).lerp(flow.hotColor, flow.colorMixes[i] * 0.55 + (1 - t) * 0.28);
      colors[ix] = reusableColor.r * fade;
      colors[ix + 1] = reusableColor.g * fade;
      colors[ix + 2] = reusableColor.b * fade;
    }
    flow.positionAttribute.needsUpdate = true;
    flow.colorAttribute.needsUpdate = true;
  }
}

function getCometRoute(drift, cycleIndex) {
  const routeRandom = seededRandom(drift.seed + cycleIndex * 7919);
  const start = randomVectorFrom(routeRandom, drift.radius * (1.42 + routeRandom() * 0.46));
  start.y *= drift.yScale;
  start.z *= drift.zScale;
  let end = randomVectorFrom(routeRandom, drift.radius * (1.42 + routeRandom() * 0.46));
  if (start.dot(end) > 0) {
    end.multiplyScalar(-1);
  }
  end.y *= drift.yScale;
  end.z *= drift.zScale;
  const bend = randomVectorFrom(routeRandom, drift.radius * (0.12 + routeRandom() * 0.18));
  bend.y *= 0.34;
  bend.z *= 0.56;
  return { start, bend, end };
}

function getCometDriftState(drift, elapsed, offset = 0) {
  const time = elapsed + drift.phase + offset;
  const cycleIndex = Math.floor(time / drift.cycleDuration);
  const localTime = time - cycleIndex * drift.cycleDuration;
  const hidden = localTime > drift.activeDuration;
  if (hidden) {
    return { visible: false, cycleIndex, passT: 1, position: new THREE.Vector3() };
  }
  const passT = THREE.MathUtils.clamp(localTime / drift.activeDuration, 0, 1);
  const route = getCometRoute(drift, cycleIndex);
  const t = THREE.MathUtils.clamp(passT + Math.sin(passT * Math.PI) * drift.gravityBend, 0, 1);
  const invT = 1 - t;
  const position = route.start
    .clone()
    .multiplyScalar(invT * invT)
    .add(route.bend.clone().multiplyScalar(2 * invT * t))
    .add(route.end.clone().multiplyScalar(t * t));
  return { visible: true, cycleIndex, passT, position };
}

function registerCometDrift(group, { seedLabel, radius = STELLAR_NEIGHBORHOOD_RADIUS * 0.72, speed = 0.035 } = {}) {
  const localRandom = seededRandom(
    Array.from(seedLabel).reduce((total, char) => total + char.charCodeAt(0) * 53, 3251)
  );
  const activeDuration = 24 + localRandom() * 22;
  const cycleDuration = activeDuration + 720 + localRandom() * 920;
  cometDrifters.push({
    group,
    radius: radius * (0.98 + localRandom() * 0.24),
    seed: Math.floor(localRandom() * 100000) + 421,
    activeDuration,
    cycleDuration,
    phase: localRandom() * cycleDuration,
    yScale: 0.18 + localRandom() * 0.22,
    zScale: 0.48 + localRandom() * 0.22,
    roll: localRandom() * Math.PI * 2,
    gravityBend: speed * (0.55 + localRandom() * 0.8),
    bowShock: group.userData.cometBowShock ?? null,
  });
}

function updateCometDrifters(elapsed) {
  const localForward = new THREE.Vector3(1, 0, 0);
  for (const drift of cometDrifters) {
    const state = getCometDriftState(drift, elapsed);
    drift.group.visible = state.visible;
    if (!state.visible) {
      continue;
    }
    const position = state.position;
    const next = getCometDriftState(drift, elapsed, 0.014).position;
    const velocity = next.sub(position);
    if (velocity.lengthSq() > 0.0001) {
      velocity.normalize();
      drift.group.quaternion.setFromUnitVectors(localForward, velocity);
      drift.group.rotateX(drift.roll + Math.sin(elapsed * 0.3 + drift.phase) * 0.28);
    }
    drift.group.position.copy(position);
    if (drift.bowShock) {
      const reaction = Math.pow(Math.sin(state.passT * Math.PI), 2) * (0.65 + 0.35 * Math.sin(elapsed * 2.2 + drift.phase));
      drift.bowShock.scale.setScalar(1 + reaction * 0.38);
      if (drift.bowShock.material) {
        drift.bowShock.material.opacity = (drift.bowShock.material.userData.baseOpacity ?? 0.06) * (0.7 + reaction * 1.6);
      }
    }
  }
}

function getLocalSeedFromPath(points, salt = 0) {
  return Math.abs(Math.floor(
    points.flat().reduce((total, value, index) => total + value * (619 + index * 37), 1777 + salt)
  )) || (1777 + salt);
}

function randomVectorFrom(localRandom, radius) {
  const theta = localRandom() * Math.PI * 2;
  const z = localRandom() * 2 - 1;
  const xy = Math.sqrt(Math.max(0, 1 - z * z));
  return new THREE.Vector3(
    Math.cos(theta) * xy * radius,
    Math.sin(theta) * xy * radius,
    z * radius
  );
}

function registerLaniakeaFlowCloud(cloud, options = {}) {
  const position = cloud.geometry?.getAttribute("position");
  if (!position?.array?.length) {
    return cloud;
  }
  const {
    seedLabel = "laniakea-flow-cloud",
    amount = 0.08,
    speed = 0.72,
    counterSpeed = 0.46,
    phase = 0,
  } = options;
  const localRandom = seededRandom(
    Array.from(seedLabel).reduce((total, char) => total + char.charCodeAt(0) * 29, 983)
  );
  const base = Float32Array.from(position.array);
  const axisA = new Float32Array(position.array.length);
  const axisB = new Float32Array(position.array.length);
  const phases = new Float32Array(position.count);
  const weights = new Float32Array(position.count);
  const referenceAxis = new THREE.Vector3(0.31, 0.77, 0.22).normalize();

  for (let i = 0; i < position.count; i += 1) {
    const ix = i * 3;
    const point = new THREE.Vector3(base[ix], base[ix + 1], base[ix + 2]);
    const normalizedPoint = point.lengthSq() > 0.0001 ? point.clone().normalize() : new THREE.Vector3(1, 0, 0);
    const a = referenceAxis.clone().cross(normalizedPoint);
    if (a.lengthSq() < 0.0001) {
      a.set(0, 1, 0).cross(normalizedPoint);
    }
    a.normalize();
    const b = normalizedPoint.clone().cross(a).normalize();
    axisA[ix] = a.x;
    axisA[ix + 1] = a.y;
    axisA[ix + 2] = a.z;
    axisB[ix] = b.x;
    axisB[ix + 1] = b.y;
    axisB[ix + 2] = b.z;
    phases[i] = phase + point.x * 0.11 + point.y * 0.17 + point.z * 0.13 + localRandom() * Math.PI * 2;
    weights[i] = 0.45 + localRandom() * 0.75;
  }

  laniakeaFlowClouds.push({
    cloud,
    attribute: position,
    base,
    axisA,
    axisB,
    phases,
    weights,
    amount,
    speed,
    counterSpeed,
  });
  return cloud;
}

function updateLaniakeaFlowClouds(elapsed) {
  for (const flow of laniakeaFlowClouds) {
    const array = flow.attribute.array;
    for (let i = 0; i < flow.attribute.count; i += 1) {
      const ix = i * 3;
      const phase = flow.phases[i];
      const wave = Math.sin(elapsed * flow.speed + phase);
      const counter = Math.cos(elapsed * flow.counterSpeed + phase * 1.27);
      const churn = 0.7 + 0.3 * Math.sin(elapsed * flow.speed * 1.9 + phase * 0.43);
      const amount = flow.amount * flow.weights[i] * churn;
      array[ix] = flow.base[ix] + flow.axisA[ix] * wave * amount + flow.axisB[ix] * counter * amount * 0.62;
      array[ix + 1] = flow.base[ix + 1] + flow.axisA[ix + 1] * wave * amount + flow.axisB[ix + 1] * counter * amount * 0.62;
      array[ix + 2] = flow.base[ix + 2] + flow.axisA[ix + 2] * wave * amount + flow.axisB[ix + 2] * counter * amount * 0.62;
    }
    flow.attribute.needsUpdate = true;
  }
}

function getCurveFrame(samples, index) {
  const previous = samples[Math.max(0, index - 1)];
  const next = samples[Math.min(samples.length - 1, index + 1)];
  const tangent = next.clone().sub(previous);
  if (tangent.lengthSq() < 0.0001) {
    tangent.set(1, 0, 0);
  } else {
    tangent.normalize();
  }
  const normal = new THREE.Vector3(0, 1, 0).cross(tangent);
  if (normal.lengthSq() < 0.0001) {
    normal.set(1, 0, 0).cross(tangent);
  }
  normal.normalize();
  const binormal = tangent.clone().cross(normal).normalize();
  return { tangent, normal, binormal };
}

function createLocalGroupTidalWebFilament(points, options = {}) {
  const {
    seedLabel = "local-group-tidal-web",
    sampleCount = 150,
    width = 0.58,
    coreSize = 0.105,
    sheathSize = 0.145,
    opacity = 0.26,
    helixTurns = 2.4,
    phase = 0,
    warmth = 0.32,
    tendrilCount = 5,
    dynamicFlow = null,
  } = options;
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(point[0], point[1], point[2])),
    false,
    "catmullrom",
    0.42
  );
  const samples = curve.getPoints(sampleCount);
  const localRandom = seededRandom(
    Array.from(seedLabel).reduce((total, char) => total + char.charCodeAt(0) * 17, getLocalSeedFromPath(points))
  );
  const group = new THREE.Group();
  const corePositions = [];
  const coreColors = [];
  const sheathPositions = [];
  const sheathColors = [];
  const knotPositions = [];
  const knotColors = [];
  const tendrilPositions = [];
  const tendrilColors = [];
  const ultraviolet = new THREE.Color(0x6e4dff);
  const magenta = new THREE.Color(0xff5bd6);
  const infrared = new THREE.Color(0xff725c);
  const amber = new THREE.Color(0xffd175);
  const cyan = new THREE.Color(0x9df4ff);
  const white = new THREE.Color(0xffffff);

  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    const t = i / Math.max(1, samples.length - 1);
    const taper = Math.sin(t * Math.PI);
    const frame = getCurveFrame(samples, i);
    const localWidth = width * (0.22 + taper * 1.08) * (0.92 + Math.sin(t * Math.PI * 6 + phase) * 0.08);

    for (let strand = 0; strand < 3; strand += 1) {
      const jitter = randomVectorFrom(localRandom, localWidth * (0.08 + localRandom() * 0.1));
      jitter.y *= 0.62;
      corePositions.push(sample.x + jitter.x, sample.y + jitter.y, sample.z + jitter.z);
      reusableColor.copy(magenta)
        .lerp(infrared, warmth * 0.42 + Math.sin(t * Math.PI * 2 + strand) * 0.08)
        .lerp(white, localRandom() > 0.94 ? 0.42 : 0.06 + localRandom() * 0.1);
      coreColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }

    for (let strand = 0; strand < 6; strand += 1) {
      const angle = phase + t * Math.PI * 2 * helixTurns + (strand / 6) * Math.PI * 2;
      const radius = localWidth * (0.38 + localRandom() * 0.28);
      const offset = frame.normal.clone()
        .multiplyScalar(Math.cos(angle) * radius)
        .addScaledVector(frame.binormal, Math.sin(angle) * radius * 0.68);
      const jitter = randomVectorFrom(localRandom, localWidth * (0.06 + localRandom() * 0.14));
      jitter.y *= 0.5;
      sheathPositions.push(sample.x + offset.x + jitter.x, sample.y + offset.y + jitter.y, sample.z + offset.z + jitter.z);
      reusableColor.copy(ultraviolet)
        .lerp(magenta, 0.46 + Math.sin(angle) * 0.14 + localRandom() * 0.18)
        .lerp(infrared, warmth * (0.18 + taper * 0.28))
        .lerp(cyan, strand % 3 === 0 ? 0.16 : 0.03);
      if (localRandom() > 0.965) reusableColor.lerp(white, 0.28);
      sheathColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }

    if (i % 14 === 0 || (taper > 0.68 && localRandom() > 0.88)) {
      const knotCount = taper > 0.45 ? 10 : 5;
      for (let k = 0; k < knotCount; k += 1) {
        const jitter = randomVectorFrom(localRandom, localWidth * (0.18 + localRandom() * 0.34));
        jitter.y *= 0.5;
        knotPositions.push(sample.x + jitter.x, sample.y + jitter.y, sample.z + jitter.z);
        reusableColor.copy(infrared)
          .lerp(amber, 0.24 + localRandom() * 0.36)
          .lerp(magenta, 0.1 + localRandom() * 0.18)
          .lerp(white, localRandom() > 0.72 ? 0.28 : 0.04);
        knotColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
  }

  for (let branch = 0; branch < tendrilCount; branch += 1) {
    const startT = (branch + 0.55) / (tendrilCount + 0.6);
    const span = 0.12 + localRandom() * 0.08;
    const side = branch % 2 === 0 ? 1 : -1;
    const branchPhase = phase + branch * 1.37 + localRandom() * 0.7;
    for (let step = 0; step < 42; step += 1) {
      const u = step / 41;
      const curveT = THREE.MathUtils.clamp(startT + (u - 0.5) * span, 0, 1);
      const sample = curve.getPoint(curveT);
      const sampleIndex = Math.min(samples.length - 1, Math.max(0, Math.round(curveT * (samples.length - 1))));
      const frame = getCurveFrame(samples, sampleIndex);
      const arc = Math.sin(u * Math.PI);
      const curl = branchPhase + u * Math.PI * 2.2;
      const reach = width * (0.75 + localRandom() * 0.4) * arc;
      const offset = frame.normal.clone()
        .multiplyScalar(side * reach * (0.6 + Math.cos(curl) * 0.28))
        .addScaledVector(frame.binormal, Math.sin(curl) * reach * 0.72);
      for (let strand = 0; strand < 2; strand += 1) {
        const jitter = randomVectorFrom(localRandom, width * 0.06 * (0.5 + localRandom()));
        jitter.y *= 0.55;
        tendrilPositions.push(sample.x + offset.x + jitter.x, sample.y + offset.y + jitter.y, sample.z + offset.z + jitter.z);
        reusableColor.copy(ultraviolet)
          .lerp(magenta, 0.42 + arc * 0.28)
          .lerp(infrared, warmth * 0.22)
          .lerp(white, localRandom() > 0.94 ? 0.2 : 0.02);
        tendrilColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
  }

  const sheath = createPointCloud({ positions: sheathPositions, colors: sheathColors }, sheathSize, opacity * 0.82, true);
  sheath.material.userData.twinkleAmount = 0.22;
  sheath.material.userData.twinkleSpeed = 0.58;
  sheath.material.userData.twinklePhase = phase;
  const tendrils = createPointCloud({ positions: tendrilPositions, colors: tendrilColors }, sheathSize * 0.78, opacity * 0.58, true);
  tendrils.material.userData.twinkleAmount = 0.32;
  tendrils.material.userData.twinkleSpeed = 0.82;
  tendrils.material.userData.twinklePhase = phase + 1.7;
  const core = createPointCloud({ positions: corePositions, colors: coreColors }, coreSize, opacity * 1.02, true);
  core.material.userData.twinkleAmount = 0.28;
  core.material.userData.twinkleSpeed = 0.74;
  core.material.userData.twinklePhase = phase + 0.4;
  const knots = createPointCloud({ positions: knotPositions, colors: knotColors }, coreSize * 1.55, opacity * 1.18, true);
  knots.material.userData.twinkleAmount = 0.5;
  knots.material.userData.twinkleSpeed = 1.05;
  knots.material.userData.twinklePhase = phase + 2.2;
  if (dynamicFlow) {
    registerLaniakeaFlowCloud(sheath, {
      seedLabel: `${seedLabel}-sheath-flow`,
      amount: dynamicFlow.amount * 1.2,
      speed: dynamicFlow.speed,
      counterSpeed: dynamicFlow.counterSpeed,
      phase,
    });
    registerLaniakeaFlowCloud(tendrils, {
      seedLabel: `${seedLabel}-tendril-flow`,
      amount: dynamicFlow.amount * 1.65,
      speed: dynamicFlow.speed * 1.18,
      counterSpeed: dynamicFlow.counterSpeed * 1.16,
      phase: phase + 1.7,
    });
    registerLaniakeaFlowCloud(core, {
      seedLabel: `${seedLabel}-core-flow`,
      amount: dynamicFlow.amount * 0.62,
      speed: dynamicFlow.speed * 0.84,
      counterSpeed: dynamicFlow.counterSpeed * 0.92,
      phase: phase + 0.4,
    });
    registerLaniakeaFlowCloud(knots, {
      seedLabel: `${seedLabel}-knot-flow`,
      amount: dynamicFlow.amount * 0.9,
      speed: dynamicFlow.speed * 1.38,
      counterSpeed: dynamicFlow.counterSpeed * 0.88,
      phase: phase + 2.2,
    });
    sheath.material.userData.twinkleAmount = 0.36;
    sheath.material.userData.twinkleSpeed = dynamicFlow.speed * 1.1;
    tendrils.material.userData.twinkleAmount = 0.48;
    tendrils.material.userData.twinkleSpeed = dynamicFlow.speed * 1.34;
    core.material.userData.twinkleAmount = 0.36;
    core.material.userData.twinkleSpeed = dynamicFlow.speed;
    knots.material.userData.twinkleAmount = 0.68;
    knots.material.userData.twinkleSpeed = dynamicFlow.speed * 1.65;
  }
  group.add(sheath, tendrils, core, knots);
  return group;
}

function createLaniakeaBraidedBridge(points, options = {}) {
  const {
    seedLabel = "laniakea-braided-bridge",
    braidCount = 3,
    sampleCount = 92,
    width = 0.72,
    opacity = 0.2,
    phase = 0,
    warmth = 0.48,
    coreSize = 0.095,
    sheathSize = 0.135,
    flowAmount = 0.16,
    flowSpeed = 0.82,
  } = options;
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(point[0], point[1], point[2])),
    false,
    "catmullrom",
    0.4
  );
  const pathSamples = curve.getPoints(Math.max(22, Math.floor(sampleCount * 0.36)));
  const group = new THREE.Group();
  const localRandom = seededRandom(
    Array.from(seedLabel).reduce((total, char) => total + char.charCodeAt(0) * 23, getLocalSeedFromPath(points, 811))
  );

  for (let braid = 0; braid < braidCount; braid += 1) {
    const lanePhase = phase + (braid / Math.max(1, braidCount)) * Math.PI * 2;
    const lanePath = [];
    for (let i = 0; i < pathSamples.length; i += 1) {
      const sample = pathSamples[i];
      const t = i / Math.max(1, pathSamples.length - 1);
      const frame = getCurveFrame(pathSamples, i);
      const taper = Math.sin(t * Math.PI);
      const braidAngle = lanePhase + t * Math.PI * 2 * (1.18 + braidCount * 0.16);
      const pulse = 0.84 + Math.sin(t * Math.PI * 5 + lanePhase) * 0.12 + localRandom() * 0.08;
      const radius = width * taper * pulse;
      const offset = frame.normal.clone()
        .multiplyScalar(Math.cos(braidAngle) * radius)
        .addScaledVector(frame.binormal, Math.sin(braidAngle) * radius * 0.72);
      lanePath.push([sample.x + offset.x, sample.y + offset.y, sample.z + offset.z]);
    }
    group.add(
      createLocalGroupTidalWebFilament(lanePath, {
        seedLabel: `${seedLabel}-braid-${braid}`,
        sampleCount,
        width: width * 0.66,
        coreSize,
        sheathSize,
        opacity: opacity * (braid === 0 ? 1 : 0.88),
        helixTurns: 1.25 + braid * 0.2,
        phase: lanePhase,
        warmth: THREE.MathUtils.clamp(warmth + (braid - 1) * 0.08, 0.12, 0.72),
        tendrilCount: 4,
        dynamicFlow: {
          amount: flowAmount * (1 + braid * 0.08),
          speed: flowSpeed * (braid % 2 === 0 ? 1 : 0.84),
          counterSpeed: flowSpeed * (braid % 2 === 0 ? 0.58 : 0.72),
        },
      })
    );
  }
  return group;
}

function createHelicalBridgePath(start, end, options = {}) {
  const {
    turns = 1.35,
    amplitude = 1.7,
    samples = 30,
    phase = 0,
    lift = 0.4,
  } = options;
  const startVector = new THREE.Vector3(...start);
  const endVector = new THREE.Vector3(...end);
  const axis = endVector.clone().sub(startVector);
  const normal = new THREE.Vector3(0, 1, 0).cross(axis);
  if (normal.lengthSq() < 0.001) {
    normal.set(1, 0, 0).cross(axis);
  }
  normal.normalize();
  const binormal = axis.clone().cross(normal).normalize();
  const path = [];
  for (let i = 0; i < samples; i += 1) {
    const t = i / Math.max(1, samples - 1);
    const center = startVector.clone().lerp(endVector, t);
    const taper = Math.sin(t * Math.PI);
    const angle = phase + t * Math.PI * 2 * turns;
    center
      .addScaledVector(normal, Math.cos(angle) * amplitude * taper)
      .addScaledVector(binormal, Math.sin(angle) * amplitude * taper * 0.58);
    center.y += Math.sin(t * Math.PI) * lift;
    path.push([center.x, center.y, center.z]);
  }
  return path;
}

function createFluidCurveFromPoints(points, localRandom, options = {}) {
  const {
    amplitude = 4,
    verticalScale = 0.46,
    tension = 0.32,
  } = options;
  if (points.length <= 2) {
    const [start, end] = points;
    const midpoint = start.clone().lerp(end, 0.5);
    const lift = randomOnSphere(amplitude * (0.5 + localRandom()));
    lift.y *= verticalScale;
    midpoint.add(lift);
    return new THREE.CatmullRomCurve3([start, midpoint, end], false, "catmullrom", tension);
  }
  const controls = [points[0].clone()];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const axis = end.clone().sub(start);
    const normal = randomOnSphere(1).cross(axis);
    if (normal.lengthSq() < 0.001) {
      normal.set(0, 1, 0).cross(axis);
    }
    normal.normalize();
    const bendA = start.clone().lerp(end, 0.34);
    const bendB = start.clone().lerp(end, 0.68);
    const segmentAmplitude = amplitude * (0.55 + localRandom() * 0.8);
    bendA.addScaledVector(normal, segmentAmplitude);
    bendB.addScaledVector(normal, -segmentAmplitude * (0.62 + localRandom() * 0.35));
    bendA.y += (localRandom() - 0.5) * amplitude * verticalScale;
    bendB.y += (localRandom() - 0.5) * amplitude * verticalScale;
    controls.push(bendA, bendB, end.clone());
  }
  return new THREE.CatmullRomCurve3(controls, false, "catmullrom", tension);
}

function createSeededFluidCurveFromPoints(points, localRandom, options = {}) {
  const {
    amplitude = 4,
    verticalScale = 0.46,
    tension = 0.32,
  } = options;
  if (points.length <= 2) {
    const [start, end] = points;
    const midpoint = start.clone().lerp(end, 0.5);
    const lift = makeLocalSpherePoint(localRandom, amplitude * (0.5 + localRandom()));
    lift.y *= verticalScale;
    midpoint.add(lift);
    return new THREE.CatmullRomCurve3([start, midpoint, end], false, "catmullrom", tension);
  }
  const controls = [points[0].clone()];
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const axis = end.clone().sub(start);
    const normal = makeLocalSpherePoint(localRandom, 1).cross(axis);
    if (normal.lengthSq() < 0.001) {
      normal.set(0, 1, 0).cross(axis);
    }
    normal.normalize();
    const bendA = start.clone().lerp(end, 0.34);
    const bendB = start.clone().lerp(end, 0.68);
    const segmentAmplitude = amplitude * (0.55 + localRandom() * 0.8);
    bendA.addScaledVector(normal, segmentAmplitude);
    bendB.addScaledVector(normal, -segmentAmplitude * (0.62 + localRandom() * 0.35));
    bendA.y += (localRandom() - 0.5) * amplitude * verticalScale;
    bendB.y += (localRandom() - 0.5) * amplitude * verticalScale;
    controls.push(bendA, bendB, end.clone());
  }
  return new THREE.CatmullRomCurve3(controls, false, "catmullrom", tension);
}

function getNebulaMorphology(id, name, meta = "") {
  const text = `${id} ${name} ${meta}`.toLowerCase();
  if (text.includes("horsehead")) return "horsehead";
  if (text.includes("ring-nebula") || text.includes("ring nebula")) return "ring";
  if (text.includes("helix")) return "helix";
  if (text.includes("cat's eye") || text.includes("cats-eye")) return "cats-eye";
  if (text.includes("crab")) return "crab";
  if (text.includes("veil") || text.includes("cygnus loop")) return "veil";
  if (text.includes("rosette")) return "rosette";
  if (text.includes("carina")) return "carina";
  if (text.includes("eagle")) return "eagle";
  if (text.includes("lagoon")) return "lagoon";
  if (text.includes("orion")) return "orion";
  if (text.includes("tarantula")) return "tarantula";
  if (text.includes("trifid")) return "trifid";
  if (text.includes("omega")) return "omega";
  if (text.includes("dumbbell")) return "bipolar";
  if (text.includes("butterfly")) return "butterfly";
  if (text.includes("crescent")) return "crescent";
  if (text.includes("barnard") || text.includes("lambda orionis") || text.includes("loop")) return "loop";
  if (text.includes("gum")) return "shell";
  if (text.includes("hourglass") || text.includes("sh2-106")) return "hourglass";
  if (text.includes("bubble")) return "bubble";
  if (text.includes("pacman")) return "cavity";
  if (text.includes("flame")) return "flame";
  if (text.includes("cone")) return "cone";
  if (text.includes("elephant") || text.includes("pillar")) return "pillar";
  if (text.includes("seagull")) return "wing";
  if (text.includes("witch") || text.includes("reflection")) return "reflection";
  if (text.includes("north america") || text.includes("california") || text.includes("soul")) return "slab";
  return "diffuse";
}

function addNebulaShowpieceRelief(group, morphology, radius, colorA, colorB, localRandom) {
  if (morphology !== "orion" && morphology !== "lagoon") {
    return;
  }
  const warm = morphology === "orion" ? 0xff8bc8 : 0xff9b7a;
  const cool = morphology === "orion" ? 0x85f4ff : 0x8df4ff;
  const dust = morphology === "orion" ? 0x5b2d36 : 0x4b2a22;
  const reliefPaths = morphology === "orion"
    ? [
        [[-radius * 0.86, -radius * 0.18, -radius * 0.08], [-radius * 0.26, radius * 0.12, radius * 0.2], [radius * 0.82, radius * 0.34, -radius * 0.02]],
        [[-radius * 0.74, radius * 0.24, radius * 0.08], [-radius * 0.12, -radius * 0.08, -radius * 0.18], [radius * 0.64, -radius * 0.28, radius * 0.14]],
        [[-radius * 0.26, -radius * 0.46, -radius * 0.12], [radius * 0.06, -radius * 0.12, radius * 0.18], [radius * 0.28, radius * 0.46, -radius * 0.08]],
      ]
    : [
        [[-radius * 0.9, -radius * 0.08, 0], [-radius * 0.28, radius * 0.06, radius * 0.18], [radius * 0.92, -radius * 0.02, -radius * 0.08]],
        [[-radius * 0.54, radius * 0.34, -radius * 0.12], [0, radius * 0.02, radius * 0.12], [radius * 0.58, -radius * 0.36, -radius * 0.02]],
        [[-radius * 0.36, -radius * 0.42, radius * 0.08], [radius * 0.04, -radius * 0.08, -radius * 0.18], [radius * 0.44, radius * 0.38, radius * 0.1]],
      ];
  for (const [index, path] of reliefPaths.entries()) {
    group.add(
      createPixelFilamentStream(
        path,
        index === 0 ? dust : index === 1 ? warm : cool,
        index === 0 ? 0.18 : 0.22,
        radius * (index === 0 ? 0.024 : 0.03),
        96,
        radius * (index === 0 ? 0.06 : 0.09)
      )
    );
  }

  const clusterPositions = [];
  const clusterColors = [];
  const starColor = new THREE.Color(morphology === "orion" ? 0xdff8ff : 0xfff2b8);
  const hotWhite = new THREE.Color(0xffffff);
  const clusterCount = morphology === "orion" ? 42 : 64;
  for (let i = 0; i < clusterCount; i += 1) {
    const shell = Math.pow(localRandom(), morphology === "orion" ? 1.4 : 0.8) * radius * (morphology === "orion" ? 0.28 : 0.42);
    const point = randomOnSphere(shell);
    point.y *= morphology === "orion" ? 0.44 : 0.22;
    point.z *= morphology === "orion" ? 0.72 : 0.38;
    clusterPositions.push(point.x, point.y, point.z);
    reusableColor.copy(starColor).lerp(hotWhite, 0.32 + localRandom() * 0.54);
    clusterColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const stars = createPointCloud(
    { positions: clusterPositions, colors: clusterColors },
    Math.max(0.08, radius * 0.028),
    morphology === "orion" ? 0.78 : 0.62,
    true
  );
  stars.material.userData.twinkleAmount = morphology === "orion" ? 0.52 : 0.34;
  stars.material.userData.twinkleSpeed = morphology === "orion" ? 1.6 : 0.9;
  group.add(stars);

  const innerGlow = createGlowSphere(
    radius * (morphology === "orion" ? 0.12 : 0.18),
    morphology === "orion" ? colorB : colorA,
    morphology === "orion" ? 0.008 : 0.007
  );
  innerGlow.userData.breath = { amount: 0.035, speed: morphology === "orion" ? 0.92 : 0.64, phase: radius };
  group.add(innerGlow);
}

function createNebulaObject({
  id,
  name,
  band,
  position,
  radius,
  colorA,
  colorB,
  stats = [],
  scaleHint = null,
  morphology: explicitMorphology = null,
  orientation = null,
  flare = 1,
  meta,
  summary,
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0)
  );
  const colorOne = new THREE.Color(colorA);
  const colorTwo = new THREE.Color(colorB);
  const whiteHot = new THREE.Color(0xffffff);
  const morphology = explicitMorphology ?? getNebulaMorphology(id, name, meta);
  const nebulaFlare = THREE.MathUtils.clamp(Number.isFinite(flare) ? flare : 1, 0.85, 1.35);
  const groupOrientation = Array.isArray(orientation)
    ? orientation
    : [
        (localRandom() - 0.5) * 1.2,
        localRandom() * Math.PI * 2,
        (localRandom() - 0.5) * 1.4,
      ];
  group.rotation.set(groupOrientation[0], groupOrientation[1], groupOrientation[2]);
  const warmDust = new THREE.Color(0x46261d);
  const ember = new THREE.Color(0xff895b);
  const sulfur = new THREE.Color(0xffc06a);
  const cyanGas = new THREE.Color(0x8af4ff);
  const greenGas = new THREE.Color(0x9dffd0);
  const layerSpecs = [
    {
      count: 760,
      spread: 1.02,
      shellPower: 0.48,
      x: 1.0,
      y: 0.52,
      z: 0.82,
      twist: 0.18,
      lobe: 0.12,
      size: 0.28,
      opacity: 0.38,
      phase: 0.2,
      spin: [0.00035, 0.00095, -0.00028],
      twinkle: [0.22, 1.25],
    },
    {
      count: 620,
      spread: 1.22,
      shellPower: 0.62,
      x: 0.72,
      y: 0.82,
      z: 1.04,
      twist: -0.14,
      lobe: 0.18,
      size: 0.2,
      opacity: 0.32,
      phase: 1.7,
      spin: [-0.00025, 0.0005, 0.0007],
      twinkle: [0.28, 1.6],
    },
    {
      count: 280,
      spread: 1.38,
      shellPower: 0.84,
      x: 1.18,
      y: 0.42,
      z: 0.68,
      twist: 0.28,
      lobe: 0.08,
      size: 0.14,
      opacity: 0.52,
      phase: 3.1,
      spin: [0.0005, -0.00042, 0.00035],
      twinkle: [0.38, 2.4],
    },
  ];

  for (const spec of layerSpecs) {
    const positions = [];
    const colors = [];
    const pointCount = Math.round(spec.count * nebulaFlare);
    for (let i = 0; i < pointCount; i += 1) {
      const shell = Math.pow(localRandom(), spec.shellPower) * radius * spec.spread;
      const theta = localRandom() * Math.PI * 2;
      const vertical = localRandom() * 2 - 1;
      const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical));
      const twist = theta + shell * spec.twist + Math.sin(shell * 0.35 + spec.phase) * 0.38;
      const filament = Math.sin(theta * 2.0 + shell * 0.32 + spec.phase) * radius * spec.lobe;
      let x = Math.cos(twist) * radial * shell * spec.x;
      let y = vertical * shell * spec.y + filament;
      let z = Math.sin(twist) * radial * shell * spec.z;
      let mix = THREE.MathUtils.clamp(shell / (radius * spec.spread), 0, 1);
      let hotChance = 0.93;

      if (morphology === "ring" || morphology === "helix" || morphology === "cats-eye") {
        const ringIndex = morphology === "cats-eye" ? i % 3 : 0;
        const ringRadius = radius * (
          morphology === "cats-eye"
            ? 0.26 + ringIndex * 0.18 + localRandom() * 0.08
            : 0.42 + localRandom() * 0.28
        );
        const tubeAngle = localRandom() * Math.PI * 2;
        const tube = radius * (morphology === "ring" ? 0.09 : 0.14) * (0.45 + localRandom());
        const petal = Math.sin(theta * (morphology === "cats-eye" ? 6 : 3) + spec.phase) * radius * 0.055;
        x = Math.cos(theta) * (ringRadius + Math.cos(tubeAngle) * tube + petal) * spec.x;
        y = Math.sin(tubeAngle) * tube * (morphology === "ring" ? 0.62 : 1.1) + Math.sin(theta * 2 + spec.phase) * radius * 0.07;
        z = Math.sin(theta) * (ringRadius + Math.cos(tubeAngle) * tube * 0.7) * (morphology === "cats-eye" ? 0.48 : 0.72);
        mix = morphology === "ring" ? 0.18 + localRandom() * 0.72 : 0.34 + Math.abs(Math.sin(theta)) * 0.52;
        hotChance = 0.965;
      } else if (morphology === "horsehead") {
        const t = localRandom();
        const head = t > 0.68;
        const neck = radius * (head ? 0.34 : 0.14) * (0.72 + Math.sin(t * Math.PI * 4 + spec.phase) * 0.16);
        const angle = localRandom() * Math.PI * 2;
        x = -radius * 0.24 + Math.cos(angle) * neck + (head ? radius * 0.22 : 0);
        y = (t - 0.5) * radius * 1.55 + (head ? radius * 0.18 : 0);
        z = Math.sin(angle) * neck * 0.72 + (localRandom() - 0.5) * radius * 0.08;
        mix = head ? 0.42 + localRandom() * 0.24 : localRandom() * 0.22;
        hotChance = 0.985;
      } else if (morphology === "crab") {
        const arm = i % 9;
        const t = localRandom() * 2 - 1;
        const angle = (arm / 9) * Math.PI * 2 + t * 0.78 + spec.phase;
        const length = radius * (0.16 + Math.pow(Math.abs(t), 0.72) * 0.95);
        x = Math.cos(angle) * length + t * radius * 0.34;
        y = (localRandom() - 0.5) * radius * 0.62 + Math.sin(t * Math.PI * 3 + arm) * radius * 0.18;
        z = Math.sin(angle) * length * 0.72 + (localRandom() - 0.5) * radius * 0.24;
        mix = 0.28 + Math.abs(t) * 0.42 + localRandom() * 0.18;
        hotChance = 0.9;
      } else if (morphology === "rosette") {
        const petal = Math.floor(localRandom() * 8);
        const angle = (petal / 8) * Math.PI * 2 + (localRandom() - 0.5) * 0.58;
        const ringRadius = radius * (0.38 + localRandom() * 0.44);
        const petalLift = Math.sin(angle * 4 + spec.phase) * radius * 0.08;
        x = Math.cos(angle) * ringRadius * (1.08 + localRandom() * 0.18);
        y = vertical * radius * 0.16 + petalLift;
        z = Math.sin(angle) * ringRadius * 0.68;
        mix = 0.18 + ringRadius / radius * 0.62;
        hotChance = 0.955;
      } else if (morphology === "carina") {
        const t = localRandom() * 2 - 1;
        const ridge = Math.sin(t * 5.5 + spec.phase) * radius * 0.16;
        x = t * radius * 1.16;
        y = vertical * radius * 0.46 + ridge;
        z = (localRandom() - 0.5) * radius * 0.86 + Math.max(0, vertical) * radius * 0.28;
        mix = 0.25 + Math.max(0, vertical) * 0.44 + localRandom() * 0.18;
        hotChance = 0.94;
      } else if (morphology === "eagle") {
        const column = i % 3;
        const t = localRandom();
        const angle = localRandom() * Math.PI * 2;
        const columnX = (column - 1) * radius * 0.34;
        const width = radius * (0.08 + (1 - t) * 0.13) * (0.75 + localRandom() * 0.7);
        x = columnX + Math.cos(angle) * width + Math.sin(t * 7 + spec.phase) * radius * 0.06;
        y = (t - 0.5) * radius * 1.32;
        z = Math.sin(angle) * width * 0.9 + (column - 1) * radius * 0.08;
        mix = 0.18 + t * 0.48 + localRandom() * 0.18;
        hotChance = 0.94;
      } else if (morphology === "pillar" || morphology === "cone" || morphology === "flame") {
        const t = localRandom();
        const angle = localRandom() * Math.PI * 2;
        const taper = morphology === "flame" ? Math.sin(t * Math.PI) * 0.18 : (1 - t) * 0.2;
        const width = radius * (0.06 + taper + localRandom() * 0.06);
        x = Math.cos(angle) * width + Math.sin(t * 7 + spec.phase) * radius * 0.08;
        y = (t - 0.5) * radius * (morphology === "cone" ? 1.45 : 1.25);
        z = Math.sin(angle) * width * 0.7 + (localRandom() - 0.5) * radius * 0.12;
        if (morphology === "flame") {
          x += Math.sin(t * 10 + spec.phase) * radius * 0.18;
          z += Math.cos(t * 8) * radius * 0.14;
        }
        mix = 0.14 + t * 0.56 + localRandom() * 0.16;
        hotChance = 0.93;
      } else if (morphology === "hourglass") {
        const wing = localRandom() > 0.5 ? 1 : -1;
        const t = localRandom();
        const angle = localRandom() * Math.PI * 2;
        const flare = radius * (0.04 + Math.pow(t, 0.72) * 0.64);
        const waist = radius * (0.04 + Math.pow(1 - t, 2.2) * 0.08);
        x = Math.cos(angle) * (flare * 0.42 + waist);
        y = wing * (radius * 0.1 + t * radius * 0.82) + Math.sin(t * 7 + spec.phase) * radius * 0.06;
        z = Math.sin(angle) * flare * 0.58 + (localRandom() - 0.5) * radius * 0.12;
        mix = 0.28 + t * 0.58;
        hotChance = 0.9;
      } else if (morphology === "bipolar" || morphology === "butterfly") {
        const wing = localRandom() > 0.5 ? 1 : -1;
        const t = localRandom();
        const angle = localRandom() * Math.PI * 2;
        const flare = radius * (0.1 + Math.pow(t, 0.65) * (morphology === "butterfly" ? 0.82 : 0.58));
        x = wing * (radius * 0.16 + flare * (morphology === "butterfly" ? 1.1 : 0.82));
        y = Math.sin(angle) * flare * 0.5 + Math.sin(t * Math.PI * 4 + spec.phase) * radius * 0.08;
        z = Math.cos(angle) * flare * 0.42 + (localRandom() - 0.5) * radius * 0.18;
        mix = 0.24 + t * 0.56;
        hotChance = 0.935;
      } else if (morphology === "veil" || morphology === "crescent" || morphology === "loop") {
        const arcSpan = morphology === "crescent" ? 1.35 : morphology === "loop" ? 2.55 : 2.2;
        const center = morphology === "crescent" ? -0.55 : morphology === "loop" ? 0.28 : 0.15;
        const angle = center + (localRandom() - 0.5) * Math.PI * arcSpan + (i % 3) * 0.06;
        const ringRadius = radius * (0.34 + localRandom() * (morphology === "loop" ? 0.84 : 0.68));
        const strand = Math.sin(angle * (morphology === "loop" ? 6.4 : 5) + spec.phase) * radius * 0.08;
        const gap = morphology === "loop" && Math.cos(angle - 0.65) > 0.82 ? 0.58 : 1;
        x = Math.cos(angle) * ringRadius * (morphology === "loop" ? 1.38 : 1.22) * gap;
        y = vertical * radius * 0.28 + strand;
        z = Math.sin(angle) * ringRadius * 0.62 + (localRandom() - 0.5) * radius * 0.18;
        mix = 0.32 + ringRadius / radius * 0.42;
        hotChance = 0.91;
      } else if (morphology === "tarantula") {
        const arm = i % 12;
        const t = localRandom();
        const angle = (arm / 12) * Math.PI * 2 + Math.sin(t * 8 + spec.phase) * 0.45;
        const length = radius * (0.12 + Math.pow(t, 0.52) * 0.98);
        x = Math.cos(angle) * length + Math.sin(t * 14 + arm) * radius * 0.13;
        y = (localRandom() - 0.5) * radius * 0.78 + Math.cos(t * 8) * radius * 0.12;
        z = Math.sin(angle) * length * 0.72 + (localRandom() - 0.5) * radius * 0.28;
        mix = 0.24 + t * 0.55 + localRandom() * 0.14;
        hotChance = 0.89;
      } else if (morphology === "trifid") {
        const lobe = i % 3;
        const angle = (lobe / 3) * Math.PI * 2 + (localRandom() - 0.5) * 0.74;
        const lane = Math.abs(Math.sin(angle * 3)) < 0.25 ? 0.42 : 1;
        const lobeRadius = radius * (0.2 + localRandom() * 0.7) * lane;
        x = Math.cos(angle) * lobeRadius;
        y = vertical * radius * 0.2 + Math.sin(lobeRadius * 0.5 + spec.phase) * radius * 0.08;
        z = Math.sin(angle) * lobeRadius * 0.66;
        mix = 0.2 + lobeRadius / radius * 0.58;
        hotChance = 0.94;
      } else if (morphology === "omega" || morphology === "wing" || morphology === "slab" || morphology === "reflection") {
        const t = localRandom() * 2 - 1;
        const sweep = morphology === "wing" ? Math.sin(t * Math.PI) : Math.sin(t * 4.2 + spec.phase);
        x = t * radius * (morphology === "slab" ? 1.34 : 1.05);
        y = vertical * radius * (morphology === "reflection" ? 0.28 : 0.36) + sweep * radius * 0.16;
        z = (localRandom() - 0.5) * radius * (morphology === "slab" ? 0.42 : 0.7) + Math.cos(t * 3.5) * radius * 0.1;
        mix = 0.18 + Math.abs(t) * 0.36 + localRandom() * 0.22;
        hotChance = morphology === "reflection" ? 0.98 : 0.94;
      } else if (morphology === "bubble" || morphology === "cavity" || morphology === "shell") {
        const cavityAngle = localRandom() * Math.PI * 2;
        const ringRadius = radius * (morphology === "shell" ? 0.28 + localRandom() * 0.72 : 0.42 + localRandom() * 0.42);
        const bite = morphology === "cavity" && Math.cos(cavityAngle) > 0.45 ? 0.46 : 1;
        const shellRipple = morphology === "shell" ? Math.sin(cavityAngle * 5 + spec.phase) * radius * 0.1 : 0;
        x = Math.cos(cavityAngle) * ringRadius * bite + radius * (morphology === "bubble" ? 0.08 : morphology === "shell" ? 0 : -0.12);
        y = vertical * radius * (morphology === "shell" ? 0.42 : 0.28) + Math.sin(cavityAngle * 2) * radius * 0.08 + shellRipple;
        z = Math.sin(cavityAngle) * ringRadius * (morphology === "shell" ? 0.9 : 0.72);
        mix = 0.28 + ringRadius / radius * 0.48;
        hotChance = 0.93;
      } else if (morphology === "orion") {
        const t = localRandom();
        const wing = localRandom() > 0.5 ? 1 : -1;
        const coreBias = Math.pow(localRandom(), 1.8);
        const arc = (localRandom() - 0.5) * Math.PI * 0.82 + wing * 0.34;
        const reach = radius * (0.18 + Math.pow(t, 0.7) * 0.82);
        const fold = Math.sin(t * Math.PI * 2 + spec.phase) * radius * 0.12;
        x = Math.cos(arc) * reach * (1.04 + coreBias * 0.28) + wing * coreBias * radius * 0.08;
        y = Math.sin(arc * 1.8 + spec.phase) * radius * 0.18 + (localRandom() - 0.5) * radius * 0.28 - fold * 0.4;
        z = Math.sin(arc) * reach * 0.34 + (localRandom() - 0.5) * radius * 0.18;
        if (localRandom() > 0.74) {
          x *= 0.34;
          y *= 0.42;
          z *= 0.5;
        }
        mix = 0.22 + t * 0.56 + coreBias * 0.16;
        hotChance = 0.88;
      } else if (morphology === "lagoon") {
        const t = localRandom() * 2 - 1;
        const lane = Math.sin((t + spec.phase * 0.08) * Math.PI * 2.4);
        const shoal = Math.pow(localRandom(), 0.68);
        x = t * radius * 1.22;
        y = lane * radius * 0.14 + (localRandom() - 0.5) * radius * 0.24;
        z = (localRandom() - 0.5) * radius * (0.22 + shoal * 0.28) + Math.cos(t * Math.PI * 2) * radius * 0.08;
        if (localRandom() > 0.68) {
          x *= 0.48;
          y += (localRandom() - 0.5) * radius * 0.18;
          z *= 0.48;
        }
        mix = 0.18 + Math.abs(t) * 0.34 + shoal * 0.32;
        hotChance = 0.9;
      }

      positions.push(x, y, z);

      if (morphology === "horsehead") {
        reusableColor.copy(warmDust).lerp(ember, mix * 0.62).lerp(colorTwo, localRandom() > 0.88 ? 0.28 : 0.04);
      } else if (morphology === "crab") {
        reusableColor.copy(ember).lerp(cyanGas, mix * 0.62).lerp(whiteHot, localRandom() > 0.88 ? 0.3 : 0.05);
      } else if (morphology === "ring" || morphology === "helix" || morphology === "cats-eye") {
        reusableColor.copy(greenGas).lerp(cyanGas, mix).lerp(colorTwo, localRandom() * 0.24);
      } else if (morphology === "carina" || morphology === "eagle") {
        reusableColor.copy(warmDust).lerp(sulfur, mix).lerp(cyanGas, localRandom() > 0.78 ? 0.32 : 0.06);
      } else if (morphology === "pillar" || morphology === "cone" || morphology === "flame") {
        reusableColor.copy(warmDust).lerp(ember, mix * 0.8).lerp(sulfur, localRandom() > 0.64 ? 0.22 : 0.05);
      } else if (morphology === "veil" || morphology === "crescent" || morphology === "loop" || morphology === "bubble" || morphology === "cavity" || morphology === "shell") {
        reusableColor.copy(cyanGas).lerp(colorOne, 0.34 + mix * 0.44).lerp(whiteHot, localRandom() > 0.92 ? 0.22 : 0.02);
      } else if (morphology === "hourglass") {
        reusableColor.copy(colorTwo).lerp(cyanGas, mix * 0.42).lerp(ember, localRandom() > 0.72 ? 0.18 : 0.03);
      } else if (morphology === "bipolar" || morphology === "butterfly") {
        reusableColor.copy(colorOne).lerp(cyanGas, mix * 0.6).lerp(whiteHot, localRandom() > 0.9 ? 0.26 : 0.03);
      } else if (morphology === "tarantula") {
        reusableColor.copy(colorOne).lerp(colorTwo, mix * 0.7).lerp(whiteHot, localRandom() > 0.86 ? 0.42 : 0.03);
      } else if (morphology === "orion") {
        reusableColor.copy(warmDust).lerp(colorOne, 0.38 + mix * 0.24).lerp(cyanGas, localRandom() > 0.68 ? 0.28 : 0.04);
      } else if (morphology === "lagoon") {
        reusableColor.copy(ember).lerp(sulfur, 0.22 + mix * 0.48).lerp(cyanGas, localRandom() > 0.76 ? 0.22 : 0.04);
      } else if (morphology === "reflection") {
        reusableColor.copy(colorTwo).lerp(cyanGas, 0.36 + localRandom() * 0.28).lerp(whiteHot, localRandom() > 0.97 ? 0.22 : 0.02);
      } else {
        reusableColor.lerpColors(colorOne, colorTwo, mix * 0.76 + localRandom() * 0.24);
      }
      if (localRandom() > Math.max(0.82, hotChance - (nebulaFlare - 1) * 0.12)) {
        reusableColor.lerp(whiteHot, 0.36 + localRandom() * 0.34);
      }
      colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }

    const cloud = createPointCloud(
      { positions, colors },
      spec.size * (0.96 + (nebulaFlare - 1) * 0.32),
      Math.min(0.72, spec.opacity * (0.98 + (nebulaFlare - 1) * 0.45)),
      true
    );
    cloud.rotation.set(
      (localRandom() - 0.5) * 0.7,
      localRandom() * Math.PI,
      (localRandom() - 0.5) * 0.7
    );
    cloud.userData.spinVector = new THREE.Vector3(spec.spin[0], spec.spin[1], spec.spin[2]);
    cloud.userData.breath = {
      amount: 0.018 + localRandom() * 0.015,
      speed: 0.62 + localRandom() * 0.32,
      phase: spec.phase,
    };
    cloud.material.userData.twinkleAmount = spec.twinkle[0];
    cloud.material.userData.twinkleSpeed = spec.twinkle[1];
    cloud.material.userData.twinklePhase = spec.phase;
    group.add(cloud);
  }

  if (morphology === "ring" || morphology === "helix" || morphology === "cats-eye" || morphology === "rosette" || morphology === "bubble" || morphology === "loop" || morphology === "shell") {
    const ringA = createOrbitRing(radius * 0.62, morphology === "rosette" ? 0xff8fb6 : 0x8af4ff, 0.13, 180, morphology === "cats-eye" ? 0.46 : 0.68);
    const ringB = createOrbitRing(radius * (morphology === "cats-eye" ? 0.86 : 0.84), morphology === "rosette" ? 0x83f2ff : 0x9dffd0, 0.08, 180, morphology === "ring" ? 0.54 : 0.72);
    ringA.rotation.set(0.18, 0.34, -0.08);
    ringB.rotation.set(-0.16, -0.24, 0.18);
    ringA.userData.spinVector = new THREE.Vector3(0.00008, 0.00018, 0.00003);
    ringB.userData.spinVector = new THREE.Vector3(-0.00005, 0.00012, -0.00004);
    group.add(ringA, ringB);
  }

  if (morphology === "crab") {
    for (let i = 0; i < 7; i += 1) {
      const angle = (i / 7) * Math.PI * 2;
      group.add(
        createPixelFilamentStream(
          [
            [Math.cos(angle) * radius * 0.12, (localRandom() - 0.5) * radius * 0.24, Math.sin(angle) * radius * 0.1],
            [Math.cos(angle + 0.35) * radius * 0.58, (localRandom() - 0.5) * radius * 0.7, Math.sin(angle + 0.18) * radius * 0.42],
            [Math.cos(angle + 0.7) * radius * 1.08, (localRandom() - 0.5) * radius * 0.92, Math.sin(angle + 0.32) * radius * 0.78],
          ],
          i % 2 === 0 ? 0xffa66a : 0x9feaff,
          0.2,
          radius * 0.032,
          78,
          radius * 0.075
        )
      );
    }
  }

  if (morphology === "carina" || morphology === "eagle" || morphology === "horsehead" || morphology === "pillar" || morphology === "cone" || morphology === "flame") {
    const ridgeColor = morphology === "horsehead" ? 0xff8d5f : 0xffbe74;
    for (let i = 0; i < 4; i += 1) {
      const y = (i - 1.5) * radius * 0.22;
      group.add(
        createPixelFilamentStream(
          [
            [-radius * 0.76, y - radius * 0.12, -radius * 0.08],
            [-radius * 0.18, y + Math.sin(i) * radius * 0.14, radius * 0.12],
            [radius * 0.74, y + radius * 0.1, -radius * 0.02],
          ],
          ridgeColor,
          morphology === "horsehead" ? 0.12 : 0.2,
          radius * 0.028,
          82,
          radius * 0.07
        )
      );
    }
  }

  if (morphology === "veil" || morphology === "loop" || morphology === "shell" || morphology === "hourglass" || morphology === "tarantula" || morphology === "trifid" || morphology === "omega" || morphology === "crescent" || morphology === "wing") {
    const streamCount = morphology === "tarantula" ? 8 : morphology === "loop" || morphology === "shell" ? 7 : 5;
    for (let i = 0; i < streamCount; i += 1) {
      const angle = (i / streamCount) * Math.PI * 2 + localRandom() * 0.6;
      const reach = radius * (morphology === "veil" || morphology === "crescent" ? 0.9 : 0.74);
      group.add(
        createPixelFilamentStream(
          [
            [Math.cos(angle) * radius * 0.12, (localRandom() - 0.5) * radius * 0.2, Math.sin(angle) * radius * 0.08],
            [Math.cos(angle + 0.28) * reach * 0.62, Math.sin(i * 1.7 + radius) * radius * 0.28, Math.sin(angle + 0.18) * reach * 0.42],
            [Math.cos(angle + 0.62) * reach, (localRandom() - 0.5) * radius * 0.58, Math.sin(angle + 0.44) * reach * 0.72],
          ],
          i % 2 === 0 ? colorA : colorB,
          0.14,
          radius * 0.025,
          66,
          radius * 0.06
        )
      );
    }
  }

  addNebulaShowpieceRelief(group, morphology, radius, colorA, colorB, localRandom);

  const coreGlowScale =
    morphology === "orion" ? 0.14 :
      morphology === "lagoon" ? 0.22 :
        morphology === "crab" ? 0.38 :
          morphology === "horsehead" ? 0.48 :
            morphology === "ring" || morphology === "helix" || morphology === "cats-eye" ? 0.42 :
              0.58;
  const veilGlowScale =
    morphology === "orion" ? 0.34 :
      morphology === "lagoon" ? 0.46 :
        morphology === "crab" ? 0.86 :
          morphology === "horsehead" ? 0.95 :
            morphology === "ring" || morphology === "helix" || morphology === "cats-eye" ? 0.92 :
              1.08;
  const coreGlowOpacity =
    morphology === "orion" ? 0.003 :
      morphology === "lagoon" ? 0.004 :
        morphology === "crab" ? 0.018 :
          morphology === "horsehead" ? 0.014 :
            morphology === "ring" || morphology === "helix" || morphology === "cats-eye" ? 0.022 :
              0.032;
  const veilGlowOpacity =
    morphology === "orion" ? 0.0015 :
      morphology === "lagoon" ? 0.0025 :
        morphology === "crab" ? 0.01 :
          morphology === "horsehead" ? 0.009 :
            morphology === "ring" || morphology === "helix" || morphology === "cats-eye" ? 0.012 :
              0.018;
  const coreGlow = createGlowSphere(radius * coreGlowScale, colorA, coreGlowOpacity * nebulaFlare);
  const veilGlow = createGlowSphere(radius * veilGlowScale, colorB, veilGlowOpacity * nebulaFlare);
  coreGlow.userData.breath = { amount: 0.025, speed: 0.7, phase: 0.3 };
  veilGlow.userData.breath = { amount: 0.018, speed: 0.5, phase: 1.4 };
  group.add(coreGlow, veilGlow);
  group.userData.spinVector = new THREE.Vector3(0.00018, 0.00042, 0.00012);
  registerEntity({
    id,
    name,
    type: "Nebula",
    band,
    object: group,
    radius,
    hitRadius: radius * 1.32,
    priority: 3.4,
    meta,
    summary,
    stats,
    scaleHint,
    family: "nebula",
    morphology,
  });
  return group;
}

function shouldRenderLocalBinaryCompanion({ id, name, spectral, objectType, meta }) {
  if (spectral === "cluster" || id === "alpha-centauri-a" || id === "alpha-centauri-b") {
    return false;
  }
  const descriptor = `${name ?? ""} ${objectType ?? ""} ${meta ?? ""}`.toLowerCase();
  return descriptor.includes("binary") || descriptor.includes("multiple") || descriptor.includes(" pair");
}

function getBinaryCompanionColor(color, spectral) {
  const base = new THREE.Color(color);
  const companion = spectral === "brown-dwarf"
    ? new THREE.Color(0x8f5638)
    : spectral === "blue-white" || spectral === "white"
      ? new THREE.Color(0xffe0a8)
      : new THREE.Color(0xdff6ff);
  return base.lerp(companion, 0.55).getHex();
}

function createStarObject({
  id,
  name,
  band = "stellar",
  position,
  radius,
  color,
  spectral,
  objectType = null,
  meta,
  summary,
}) {
  const group = new THREE.Group();
  const resolvedPosition = getStellarScenePosition(id, position);
  group.position.set(resolvedPosition[0], resolvedPosition[1], resolvedPosition[2]);
  const plasma = spectral === "cluster"
    ? new THREE.Group()
    : createPlasmaStarCore({
        id,
        radius,
        color,
        spectral,
        flareCount: band === "stellar" ? 18 : 12,
      });
  const spikes = createOrbitRing(radius * 1.72, color, spectral === "cluster" ? 0.028 : 0.08, 72, 1);
  spikes.rotation.x = Math.PI * 0.5;
  spikes.userData.spin = spectral === "red-supergiant" ? 0.0004 : 0.0012;
  group.add(plasma, spikes);
  if (spectral === "brown-dwarf") {
    group.add(createBrownDwarfWeatherLayer({ id, radius, color }));
  }
  if (shouldRenderLocalBinaryCompanion({ id, name, spectral, objectType, meta })) {
    const companionRadius = radius * (spectral === "brown-dwarf" || `${objectType ?? ""}`.toLowerCase().includes("pair") ? 0.72 : 0.42);
    const companionDistance = radius * (spectral === "brown-dwarf" ? 2.55 : 2.15);
    const companionColor = getBinaryCompanionColor(color, spectral);
    const companion = createPlasmaStarCore({
      id: `${id}-binary-companion`,
      radius: companionRadius,
      color: companionColor,
      spectral: spectral === "brown-dwarf" ? "brown-dwarf" : "orange-dwarf",
      flareCount: 8,
    });
    companion.position.set(companionDistance, radius * 0.06, 0);
    companion.userData.orbit = {
      distance: companionDistance,
      angle: 0,
      speed: LOCAL_BINARY_COMPANION_ORBIT_SPEED / Math.max(0.8, radius),
      zScale: 0.62,
      y: radius * 0.06,
      alignToOrbit: true,
    };
    const companionTrace = createSceneGuideRing(companionDistance, companionColor, 0.055, 112, 0.62);
    companionTrace.rotation.x = 0.1;
    group.add(companionTrace, companion);
  }
  if (spectral === "white-dwarf") {
    const hardHalo = createGlowSphere(radius * 1.9, color, 0.008);
    hardHalo.userData.breath = { amount: 0.01, speed: 0.48, phase: radius };
    const remnantRing = createOrbitRing(radius * 2.9, 0xdbe7ff, 0.07, 128, 0.58);
    remnantRing.userData.spinVector = new THREE.Vector3(0.00004, 0.00022, 0.00002);
    group.add(hardHalo, remnantRing);
  }
  if (spectral === "cluster") {
    const clusterPositions = [];
    const clusterColors = [];
    const clusterRandom = seededRandom(
      Array.from(`${id}-cluster-field`).reduce((total, char) => total + char.charCodeAt(0) * 11, 0)
    );
    const coreColor = new THREE.Color(color);
    const elderGold = new THREE.Color(0xffd79a);
    const white = new THREE.Color(0xffffff);
    const clusterCount = objectType === "Globular Cluster" ? 1500 : 760;
    for (let i = 0; i < clusterCount; i += 1) {
      const shell = Math.pow(clusterRandom(), objectType === "Globular Cluster" ? 0.42 : 0.72);
      const point = randomOnSphere(radius * (0.55 + shell * (objectType === "Globular Cluster" ? 1.75 : 1.2)));
      point.y *= objectType === "Globular Cluster" ? 0.78 : 0.36;
      clusterPositions.push(point.x, point.y, point.z);
      reusableColor.copy(coreColor).lerp(elderGold, clusterRandom() * 0.55).lerp(white, clusterRandom() * 0.26);
      clusterColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    const starField = createPointCloud(
      { positions: clusterPositions, colors: clusterColors },
      objectType === "Globular Cluster" ? Math.max(0.1, radius * 0.032) : Math.max(0.075, radius * 0.026),
      objectType === "Globular Cluster" ? 0.74 : 0.56,
      true
    );
    starField.userData.spinVector = new THREE.Vector3(0.00008, 0.00034, -0.00004);
    starField.userData.breath = { amount: 0.018, speed: 0.54, phase: radius };
    const corePositions = [];
    const coreColors = [];
    for (let i = 0; i < (objectType === "Globular Cluster" ? 520 : 220); i += 1) {
      const corePoint = randomOnSphere(radius * Math.pow(clusterRandom(), 1.65) * 0.42);
      corePoint.y *= objectType === "Globular Cluster" ? 0.82 : 0.48;
      corePositions.push(corePoint.x, corePoint.y, corePoint.z);
      reusableColor.copy(elderGold).lerp(white, 0.34 + clusterRandom() * 0.44);
      coreColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    const coreField = createPointCloud(
      { positions: corePositions, colors: coreColors },
      objectType === "Globular Cluster" ? Math.max(0.16, radius * 0.055) : Math.max(0.1, radius * 0.04),
      objectType === "Globular Cluster" ? 0.82 : 0.62,
      true
    );
    coreField.userData.spinVector = new THREE.Vector3(-0.00004, 0.00058, 0.00002);
    group.add(starField, coreField);
  }
  registerEntity({
    id,
    name,
    type: objectType ?? (spectral === "cluster" ? "Open Cluster" : "Star"),
    band,
    object: group,
    radius,
    hitRadius: radius * 3.2,
    priority: spectral === "cluster" ? 3.4 : 3,
    innerZoomFloor: band === "stellar" ? STELLAR_INSPECTION_FLOOR : getBandByKey(band).center - 0.42,
    meta,
    summary,
    family: spectral === "cluster" ? "stellar-assembly" : spectral === "brown-dwarf" ? "brown-dwarf" : "star-system",
    spectral,
  });
  return group;
}

function createPulsarObject({
  id,
  name,
  band,
  position,
  radius,
  color = 0x9feaff,
  meta,
  summary,
  stats = [],
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.42, 32, 16),
    createMaterial(
      THREE.MeshBasicMaterial,
      { color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false },
      0.92
    )
  );
  const coreGlow = createGlowSphere(radius * 1.28, color, 0.034);
  coreGlow.userData.breath = { amount: 0.09, speed: 3.2, phase: radius };

  const beamGroup = new THREE.Group();
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 19, 0)
  );
  const orientationRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 31, 17)
  );
  const baseColor = new THREE.Color(color);
  const electric = new THREE.Color(0x9ff5ff);
  const hotWhite = new THREE.Color(0xffffff);
  for (const sign of [-1, 1]) {
    const conePositions = [];
    const coneColors = [];
    const pulsePositions = [];
    const pulseColors = [];
    for (let i = 0; i < 760; i += 1) {
      const t = Math.pow(localRandom(), 0.84);
      const reach = radius * THREE.MathUtils.lerp(0.48, 6.25, t);
      const coneRadius = radius * (0.055 + t * 0.58) * Math.pow(localRandom(), 0.48);
      const angle = localRandom() * Math.PI * 2;
      const helix = Math.sin(t * Math.PI * 5.5 + sign * 0.8) * radius * 0.08;
      conePositions.push(
        sign * reach,
        Math.cos(angle) * coneRadius + helix,
        Math.sin(angle) * coneRadius * 0.78
      );
      const bandPulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 8.0);
      reusableColor.copy(baseColor).lerp(electric, 0.28 + t * 0.34).lerp(hotWhite, bandPulse * 0.34 + localRandom() * 0.18);
      coneColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    for (let bandIndex = 0; bandIndex < 4; bandIndex += 1) {
      const t = 0.18 + bandIndex * 0.21;
      const reach = radius * THREE.MathUtils.lerp(0.48, 6.15, t);
      const ringRadius = radius * (0.12 + t * 0.58);
      const pointsInRing = 58 - bandIndex * 6;
      for (let i = 0; i < pointsInRing; i += 1) {
        const angle = (i / pointsInRing) * Math.PI * 2 + localRandom() * 0.08;
        const thickness = radius * (0.025 + localRandom() * 0.05);
        pulsePositions.push(
          sign * (reach + (localRandom() - 0.5) * radius * 0.1),
          Math.cos(angle) * (ringRadius + thickness),
          Math.sin(angle) * (ringRadius + thickness) * 0.78
        );
        reusableColor.copy(electric).lerp(hotWhite, 0.58 + localRandom() * 0.32).lerp(baseColor, bandIndex * 0.08);
        pulseColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
    const cone = createPointCloud(
      { positions: conePositions, colors: coneColors },
      Math.max(0.075, radius * 0.062),
      0.5,
      true
    );
    cone.material.userData.twinkleAmount = 0.26;
    cone.material.userData.twinkleSpeed = 3.1;
    cone.material.userData.twinklePhase = sign * radius;
    const pulses = createPointCloud(
      { positions: pulsePositions, colors: pulseColors },
      Math.max(0.095, radius * 0.085),
      0.72,
      true
    );
    pulses.material.userData.twinkleAmount = 0.82;
    pulses.material.userData.twinkleSpeed = 4.4;
    pulses.material.userData.twinklePhase = sign * 1.7 + radius;
    pulses.userData.breath = { amount: 0.08, speed: 4.4, phase: sign * 1.7 + radius };
    beamGroup.add(cone, pulses);
  }
  beamGroup.rotation.set(
    (orientationRandom() - 0.5) * 1.35,
    orientationRandom() * Math.PI * 2,
    (orientationRandom() - 0.5) * 1.55
  );
  beamGroup.userData.spinVector = new THREE.Vector3(
    (orientationRandom() - 0.5) * 0.0011,
    (orientationRandom() > 0.5 ? 1 : -1) * (0.0048 + orientationRandom() * 0.0032),
    (orientationRandom() - 0.5) * 0.0013
  );
  group.add(coreGlow, core, beamGroup, createOrbitRing(radius * 1.05, color, 0.11, 96, 0.68));
  group.userData.breath = { amount: 0.018, speed: 2.1, phase: radius * 0.7 };
  registerEntity({
    id,
    name,
    type: "Pulsar",
    band,
    object: group,
    radius,
    hitRadius: radius * 5.2,
    priority: 4.35,
    innerZoomFloor: getBandByKey(band).center - 0.9,
    meta,
    summary,
    stats,
    family: "pulsar",
    scaleHint: "Reference: pulsars use rotating beam geometry so they read as lighthouses rather than ordinary stars.",
  });
  return group;
}

function createSupernovaObject({
  id,
  name,
  band,
  position,
  radius,
  color = 0xffc28a,
  orientation = null,
  meta,
  summary,
  stats = [],
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 17, 0)
  );
  const positions = [];
  const colors = [];
  const baseColor = new THREE.Color(color);
  const white = new THREE.Color(0xffffff);
  const groupOrientation = Array.isArray(orientation)
    ? orientation
    : [
        (localRandom() - 0.5) * 1.2,
        localRandom() * Math.PI * 2,
        (localRandom() - 0.5) * 1.45,
      ];
  group.rotation.set(groupOrientation[0], groupOrientation[1], groupOrientation[2]);
  for (let i = 0; i < 520; i += 1) {
    const shell = radius * (0.22 + Math.pow(localRandom(), 0.34) * 1.05);
    const point = randomOnSphere(shell);
    const rupture = 1 + Math.sin(i * 0.21 + radius) * 0.18 + (i % 7 === 0 ? localRandom() * 0.38 : 0);
    point.x *= rupture;
    point.y *= 0.78 + Math.sin(i * 0.13) * 0.16;
    point.z *= 0.72 + Math.cos(i * 0.17) * 0.24;
    positions.push(point.x, point.y, point.z);
    reusableColor.lerpColors(baseColor, white, localRandom() * 0.64);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const shell = createPointCloud({ positions, colors }, Math.max(0.08, radius * 0.045), 0.54, true);
  shell.material.userData.twinkleAmount = 0.36;
  shell.material.userData.twinkleSpeed = 1.1 + localRandom() * 0.6;
  shell.userData.spinVector = new THREE.Vector3(0.00018, 0.00038, -0.0001);
  const ringA = createOrbitRing(radius * 0.92, color, 0.18, 144, 0.62);
  ringA.rotation.set(0.6, 0.1, 0.28);
  const ringB = createOrbitRing(radius * 1.18, 0x9feaff, 0.12, 144, 0.7);
  ringB.rotation.set(-0.35, 0.62, -0.12);
  ringB.userData.spin = -0.0012;
  group.add(createGlowSphere(radius * 0.52, color, 0.045), shell, ringA, ringB);
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 + localRandom() * 0.36;
    const lift = (localRandom() - 0.5) * radius * 0.38;
    group.add(
      createPixelFilamentStream(
        [
          [Math.cos(angle) * radius * 0.18, lift * 0.3, Math.sin(angle) * radius * 0.12],
          [Math.cos(angle + 0.34) * radius * 0.78, lift + Math.sin(angle) * radius * 0.24, Math.sin(angle + 0.18) * radius * 0.52],
          [Math.cos(angle + 0.7) * radius * 1.35, -lift * 0.5, Math.sin(angle + 0.42) * radius * 0.95],
        ],
        i % 2 === 0 ? color : 0x9feaff,
        0.16,
        radius * 0.03,
        58,
        radius * 0.07
      )
    );
  }
  registerEntity({
    id,
    name,
    type: "Supernova Remnant",
    band,
    object: group,
    radius,
    hitRadius: radius * 2.2,
    priority: 4.05,
    innerZoomFloor: getBandByKey(band).center - 0.82,
    meta,
    summary,
    stats,
    family: "supernova",
    scaleHint: "Reference: supernova remnants are rare transient anchors in the galaxy layer, tuned to sparkle without becoming a full-screen flash.",
  });
  return group;
}

function createBrownDwarfWeatherLayer({ id, radius, color }) {
  const group = new THREE.Group();
  const localRandom = seededRandom(
    Array.from(`${id}-brown-dwarf-weather`).reduce((total, char) => total + char.charCodeAt(0) * 13, 97)
  );
  const positions = [];
  const colors = [];
  const ember = new THREE.Color(color);
  const hotBand = new THREE.Color(0xffa45f);
  const coolBand = new THREE.Color(0x4a2d38);
  const bandCount = 7;
  for (let bandIndex = 0; bandIndex < bandCount; bandIndex += 1) {
    const latitude = THREE.MathUtils.lerp(-0.72, 0.72, bandIndex / (bandCount - 1));
    const bandRadius = Math.sqrt(Math.max(0, 1 - latitude * latitude));
    const beadCount = 42 + Math.floor(localRandom() * 18);
    for (let i = 0; i < beadCount; i += 1) {
      const angle = (i / beadCount) * Math.PI * 2 + localRandom() * 0.18;
      const shell = radius * (1.04 + localRandom() * 0.13);
      const wobble = Math.sin(angle * (2.4 + bandIndex * 0.37) + bandIndex) * radius * 0.045;
      positions.push(
        Math.cos(angle) * bandRadius * shell,
        latitude * shell + wobble,
        Math.sin(angle) * bandRadius * shell * 0.92
      );
      reusableColor.copy(ember).lerp(bandIndex % 2 === 0 ? hotBand : coolBand, 0.32 + localRandom() * 0.38);
      reusableColor.offsetHSL((localRandom() - 0.5) * 0.025, 0, (localRandom() - 0.5) * 0.08);
      colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
  }
  const bands = createPointCloud(
    { positions, colors },
    Math.max(0.045, radius * 0.12),
    0.62,
    true
  );
  bands.material.userData.twinkleAmount = 0.18;
  bands.material.userData.twinkleSpeed = 0.7;
  bands.userData.spinVector = new THREE.Vector3(0.00004, 0.00115, -0.00002);
  const emberGlow = createGlowSphere(radius * 1.55, 0xb86a45, 0.012);
  emberGlow.userData.breath = { amount: 0.018, speed: 0.42, phase: radius };
  group.add(emberGlow, bands);
  return group;
}

function createCompactRemnantObject({
  id,
  name,
  band,
  position,
  radius,
  color = 0xb9f8ff,
  variant = "neutron-star",
  meta,
  summary,
  stats = [],
}) {
  const isMagnetar = variant === "magnetar";
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(`${id}-${variant}`).reduce((total, char) => total + char.charCodeAt(0) * 41, 503)
  );
  const coreColor = new THREE.Color(color);
  const hardWhite = new THREE.Color(0xffffff);
  const burst = new THREE.Color(isMagnetar ? 0xff8cff : 0x9feaff);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * (isMagnetar ? 0.34 : 0.42), 36, 18),
    createMaterial(
      THREE.MeshBasicMaterial,
      { color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false },
      isMagnetar ? 0.94 : 0.86
    )
  );
  const heatPositions = [];
  const heatColors = [];
  const heatCount = isMagnetar ? 520 : 300;
  for (let i = 0; i < heatCount; i += 1) {
    const point = makeLocalSpherePoint(localRandom, radius * (0.5 + Math.pow(localRandom(), 0.6) * (isMagnetar ? 1.35 : 0.9)));
    point.y *= isMagnetar ? 0.82 : 0.68;
    heatPositions.push(point.x, point.y, point.z);
    reusableColor.copy(coreColor).lerp(hardWhite, 0.28 + localRandom() * 0.52).lerp(burst, isMagnetar ? localRandom() * 0.42 : localRandom() * 0.12);
    heatColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const thermal = createPointCloud(
    { positions: heatPositions, colors: heatColors },
    Math.max(0.055, radius * (isMagnetar ? 0.058 : 0.05)),
    isMagnetar ? 0.56 : 0.42,
    true
  );
  thermal.material.userData.twinkleAmount = isMagnetar ? 0.72 : 0.24;
  thermal.material.userData.twinkleSpeed = isMagnetar ? 3.2 : 1.35;
  thermal.userData.spinVector = new THREE.Vector3(0.00018, isMagnetar ? 0.0036 : 0.0012, -0.0001);

  const fieldGroup = new THREE.Group();
  const loopCount = isMagnetar ? 9 : 4;
  for (let loopIndex = 0; loopIndex < loopCount; loopIndex += 1) {
    const loopPoints = [];
    const phase = localRandom() * Math.PI * 2;
    const width = radius * (isMagnetar ? THREE.MathUtils.lerp(1.55, 3.9, localRandom()) : THREE.MathUtils.lerp(1.05, 2.2, localRandom()));
    const height = radius * (isMagnetar ? THREE.MathUtils.lerp(0.9, 2.6, localRandom()) : THREE.MathUtils.lerp(0.45, 1.1, localRandom()));
    const tilt = (localRandom() - 0.5) * (isMagnetar ? 1.4 : 0.8);
    const samples = 7;
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      const angle = t * Math.PI * 2 + phase;
      const pinch = 0.78 + Math.sin(t * Math.PI * 2 + phase) * 0.16;
      loopPoints.push([
        Math.cos(angle) * width * pinch,
        Math.sin(angle * 2 + phase) * radius * 0.28 + Math.sin(angle) * height,
        Math.sin(angle) * width * 0.48 + Math.cos(angle + tilt) * radius * 0.24,
      ]);
    }
    const loop = createPixelFilamentStream(
      loopPoints,
      loopIndex % 3 === 0 ? 0xff8cff : loopIndex % 2 === 0 ? color : 0xffffff,
      isMagnetar ? 0.34 : 0.17,
      Math.max(0.04, radius * (isMagnetar ? 0.05 : 0.035)),
      isMagnetar ? 90 : 54,
      radius * (isMagnetar ? 0.055 : 0.032)
    );
    loop.material.userData.twinkleAmount = isMagnetar ? 0.58 : 0.18;
    loop.material.userData.twinkleSpeed = isMagnetar ? 2.7 + localRandom() * 1.8 : 0.9 + localRandom() * 0.5;
    const loopPivot = new THREE.Group();
    loopPivot.add(loop);
    loopPivot.rotation.set(
      (localRandom() - 0.5) * Math.PI,
      localRandom() * Math.PI * 2,
      (localRandom() - 0.5) * Math.PI
    );
    loopPivot.userData.spinVector = new THREE.Vector3(
      (localRandom() - 0.5) * 0.0012,
      (localRandom() > 0.5 ? 1 : -1) * (isMagnetar ? 0.0022 + localRandom() * 0.0028 : 0.00055 + localRandom() * 0.0007),
      (localRandom() - 0.5) * 0.001
    );
    fieldGroup.add(loopPivot);
  }
  fieldGroup.userData.breath = { amount: isMagnetar ? 0.04 : 0.015, speed: isMagnetar ? 2.6 : 0.82, phase: radius };

  const shock = createGlowSphere(radius * (isMagnetar ? 2.25 : 1.55), isMagnetar ? 0xa875ff : color, isMagnetar ? 0.018 : 0.008);
  shock.userData.breath = { amount: isMagnetar ? 0.08 : 0.018, speed: isMagnetar ? 2.2 : 0.7, phase: radius * 2 };
  group.add(shock, thermal, core, fieldGroup, createOrbitRing(radius * (isMagnetar ? 1.45 : 1.05), color, isMagnetar ? 0.16 : 0.08, 112, 0.64));
  group.userData.breath = { amount: isMagnetar ? 0.012 : 0.006, speed: isMagnetar ? 1.7 : 0.6, phase: radius };
  registerEntity({
    id,
    name,
    type: isMagnetar ? "Magnetar" : "Neutron Star",
    band,
    object: group,
    radius,
    hitRadius: radius * (isMagnetar ? 5.8 : 4.2),
    priority: isMagnetar ? 4.55 : 4.15,
    innerZoomFloor: getBandByKey(band).center - (isMagnetar ? 0.98 : 0.86),
    meta,
    summary,
    stats,
    family: variant,
    scaleHint: isMagnetar
      ? "Reference: magnetars now use fractured magnetosphere loops and burst knots so they read as violent neutron-star subclasses."
      : "Reference: isolated neutron stars keep compact hard cores and weak magnetospheres, distinct from pulsar beam geometry.",
  });
  return group;
}

function createNeutronStarObject(options) {
  return createCompactRemnantObject({ ...options, variant: "neutron-star" });
}

function createMagnetarObject(options) {
  return createCompactRemnantObject({ ...options, variant: "magnetar" });
}

function createAccretionMiniSpiral({ seedLabel, radius, colorA = 0xffc27a, colorB = 0x9feaff }) {
  const localRandom = seededRandom(
    Array.from(seedLabel).reduce((total, char) => total + char.charCodeAt(0) * 29, 911)
  );
  const positions = [];
  const colors = [];
  const warm = new THREE.Color(colorA);
  const cool = new THREE.Color(colorB);
  const white = new THREE.Color(0xffffff);
  const arms = 3;
  for (let i = 0; i < 520; i += 1) {
    const arm = i % arms;
    const t = Math.pow(localRandom(), 0.58);
    const angle = (arm / arms) * Math.PI * 2 + t * Math.PI * 3.7 + (localRandom() - 0.5) * 0.42;
    const spiralRadius = radius * THREE.MathUtils.lerp(0.12, 1.28, t);
    positions.push(
      Math.cos(angle) * spiralRadius,
      (localRandom() - 0.5) * radius * 0.055,
      Math.sin(angle) * spiralRadius * (0.38 + t * 0.1)
    );
    reusableColor.copy(warm).lerp(cool, t * 0.54).lerp(white, Math.pow(1 - t, 2) * 0.22);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const spiral = createPointCloud({ positions, colors }, Math.max(0.04, radius * 0.042), 0.54, true);
  spiral.material.userData.twinkleAmount = 0.36;
  spiral.material.userData.twinkleSpeed = 1.1;
  spiral.userData.spinVector = new THREE.Vector3(0, 0.0024, 0);
  return spiral;
}

function createXRayBinaryObject({
  id,
  name,
  band,
  position,
  radius,
  color = 0x9feaff,
  donorColor = 0xffc27a,
  meta,
  summary,
  stats = [],
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(`${id}-xray-binary`).reduce((total, char) => total + char.charCodeAt(0) * 47, 1201)
  );
  const donorSystem = new THREE.Group();
  donorSystem.position.set(-radius * 1.35, 0, 0);
  const donor = createPlasmaStarCore({
    id: `${id}-donor`,
    radius: radius * 0.5,
    color: donorColor,
    spectral: "orange-giant",
    flareCount: 6,
  });
  donor.scale.set(1.15, 0.86, 0.92);
  const donorSwirl = createAccretionMiniSpiral({
    seedLabel: `${id}-donor-swirl`,
    radius: radius * 0.94,
    colorA: donorColor,
    colorB: color,
  });
  donorSwirl.rotation.set(0.68, 0.12, -0.18);
  donorSystem.add(
    donor,
    donorSwirl,
    createBipolarContinuousEmission({
      seedLabel: `${id}-donor-jets`,
      origin: [0, 0, 0],
      axis: [0, 1, 0],
      length: radius * 2.65,
      startWidth: radius * 0.035,
      endWidth: radius * 0.24,
      count: 125,
      colorA: color,
      colorB: donorColor,
      size: Math.max(0.04, radius * 0.034),
      opacity: 0.34,
      speed: 0.34,
      pulseSpeed: 1.8,
      swirlSpeed: 0.72,
    })
  );

  const compactSystem = new THREE.Group();
  compactSystem.position.set(radius * 1.22, 0, 0);
  compactSystem.userData.spinVector = new THREE.Vector3(0.00002, 0.0028, -0.00001);
  const compact = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.18, 24, 12),
    createMaterial(THREE.MeshBasicMaterial, { color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false }, 0.92)
  );
  compact.position.set(radius * 0.12, 0, 0);
  const diskPositions = [];
  const diskColors = [];
  const hotBlue = new THREE.Color(color);
  const hotWhite = new THREE.Color(0xffffff);
  const amber = new THREE.Color(0xffc36f);
  for (let i = 0; i < 640; i += 1) {
    const t = localRandom();
    const angle = localRandom() * Math.PI * 2;
    const ringRadius = radius * (0.24 + Math.pow(t, 0.52) * 0.82);
    diskPositions.push(
      Math.cos(angle) * ringRadius,
      (localRandom() - 0.5) * radius * 0.055,
      Math.sin(angle) * ringRadius * 0.42
    );
    reusableColor.copy(amber).lerp(hotBlue, t * 0.62).lerp(hotWhite, Math.pow(1 - t, 2) * 0.36);
    diskColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const disk = createPointCloud({ positions: diskPositions, colors: diskColors }, Math.max(0.055, radius * 0.045), 0.64, true);
  disk.material.userData.twinkleAmount = 0.42;
  disk.material.userData.twinkleSpeed = 1.8;
  compactSystem.add(
    disk,
    compact,
    createGlowSphere(radius * 0.46, color, 0.022),
    createBipolarContinuousEmission({
      seedLabel: `${id}-compact-jets`,
      origin: [0, 0, 0],
      axis: [0, 1, 0],
      length: radius * 2.35,
      startWidth: radius * 0.026,
      endWidth: radius * 0.2,
      count: 105,
      colorA: color,
      colorB: 0xffd08a,
      size: Math.max(0.04, radius * 0.032),
      opacity: 0.38,
      speed: 0.42,
      pulseSpeed: 2.1,
      swirlSpeed: 0.82,
    })
  );
  const stream = createContinuousConeEmitter(
    {
      seedLabel: `${id}-accretion-transfer`,
      origin: [-radius * 0.78, radius * 0.08, 0],
      direction: [1, -0.03, -0.04],
      length: radius * 1.88,
      startWidth: radius * 0.08,
      endWidth: radius * 0.2,
      count: 180,
      color: 0xffd08a,
      colorB: color,
      size: Math.max(0.045, radius * 0.04),
      opacity: 0.34,
      speed: 0.32,
      pulseSpeed: 1.4,
      swirlSpeed: 0.5,
      turns: 1.7,
      turbulence: radius * 0.018,
    }
  );
  const staticStream = createPixelFilamentStream(
    [
      [-radius * 0.86, radius * 0.1, 0],
      [-radius * 0.25, radius * 0.34, radius * 0.12],
      [radius * 0.56, radius * 0.06, -radius * 0.16],
      [radius * 1.12, 0, 0],
    ],
    0xffd08a,
    0.2,
    Math.max(0.045, radius * 0.043),
    90,
    radius * 0.09
  );
  staticStream.material.userData.twinkleAmount = 0.35;
  staticStream.material.userData.twinkleSpeed = 1.2;
  const wake = createContinuousConeEmitter(
    {
      seedLabel: `${id}-xray-wake`,
      origin: [radius * 1.28, 0, 0],
      direction: [1, -0.08, 0.16],
      length: radius * 3.2,
      startWidth: radius * 0.05,
      endWidth: radius * 0.42,
      count: 120,
      color,
      colorB: 0xffffff,
      size: Math.max(0.045, radius * 0.038),
      opacity: 0.24,
      speed: 0.2,
      pulseSpeed: 0.8,
      swirlSpeed: 0.24,
      turns: 0.8,
      turbulence: radius * 0.032,
    }
  );
  const staticWake = createPixelFilamentStream(
    [
      [radius * 1.24, 0, 0],
      [radius * 1.9, -radius * 0.28, radius * 0.18],
      [radius * 2.8, radius * 0.22, radius * 0.46],
      [radius * 3.5, -radius * 0.12, radius * 0.16],
    ],
    color,
    0.15,
    Math.max(0.045, radius * 0.04),
    74,
    radius * 0.11
  );
  staticWake.material.userData.twinkleAmount = 0.28;
  staticWake.material.userData.twinkleSpeed = 0.9;
  group.add(createGlowSphere(radius * 1.2, color, 0.012), donorSystem, compactSystem, stream, staticStream, wake, staticWake);
  group.rotation.set((localRandom() - 0.5) * 0.6, localRandom() * Math.PI * 2, (localRandom() - 0.5) * 0.36);
  group.userData.spinVector = new THREE.Vector3(0.00002, 0.00018, -0.00001);
  registerEntity({
    id,
    name,
    type: "X-Ray Binary",
    band,
    object: group,
    radius,
    hitRadius: radius * 4.8,
    priority: 4.45,
    innerZoomFloor: getBandByKey(band).center - 0.98,
    meta,
    summary,
    stats,
    family: "x-ray-binary",
    scaleHint: "Reference: X-ray binaries use donor-star, accretion-stream, compact-core, and shock-wake layers so they do not collapse into generic black holes.",
  });
  return group;
}

function createCometObject({
  id,
  name,
  band = "stellar",
  position,
  radius,
  color = 0xbfefff,
  tailColor = 0x7ddfff,
  driftRadius = STELLAR_NEIGHBORHOOD_RADIUS * 0.92,
  driftSpeed = null,
  meta,
  summary,
  stats = [],
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(`${id}-comet`).reduce((total, char) => total + char.charCodeAt(0) * 17, 229)
  );
  const nucleus = new THREE.Mesh(
    new THREE.IcosahedronGeometry(radius * 0.32, 1),
    createMaterial(THREE.MeshBasicMaterial, { color: 0xd7e6df, blending: THREE.AdditiveBlending, depthWrite: false }, 0.68)
  );
  nucleus.scale.set(1.2, 0.74, 0.86);
  const coma = createGlowSphere(radius * 0.92, color, 0.035);
  const bowShock = createOrbitRing(radius * 1.12, color, 0.06, 72, 0.46);
  bowShock.rotation.set(Math.PI * 0.5, 0.18, 0);
  bowShock.material.userData.baseOpacity = bowShock.material.opacity;
  bowShock.userData.spinVector = new THREE.Vector3(0.0001, 0.0005, -0.00008);
  const dustPositions = [];
  const dustColors = [];
  const ionPositions = [];
  const ionColors = [];
  const dust = new THREE.Color(0xffe6b6);
  const ion = new THREE.Color(tailColor);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < 560; i += 1) {
    const t = Math.pow(localRandom(), 0.58);
    const x = -radius * THREE.MathUtils.lerp(0.25, 7.2, t);
    const width = radius * (0.08 + t * t * 0.88);
    const curl = Math.sin(t * Math.PI * 4 + localRandom() * 0.6) * radius * t * 0.42;
    dustPositions.push(
      x,
      curl + (localRandom() - 0.5) * width,
      (localRandom() - 0.5) * width * 0.78
    );
    reusableColor.copy(dust).lerp(white, 0.16 + localRandom() * 0.28).lerp(ion, t * 0.18);
    dustColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  for (let i = 0; i < 320; i += 1) {
    const t = Math.pow(localRandom(), 0.72);
    ionPositions.push(
      -radius * THREE.MathUtils.lerp(0.4, 9.4, t),
      Math.sin(t * Math.PI * 6) * radius * 0.08 + (localRandom() - 0.5) * radius * (0.04 + t * 0.18),
      (localRandom() - 0.5) * radius * (0.04 + t * 0.16)
    );
    reusableColor.copy(ion).lerp(white, 0.18 + localRandom() * 0.44);
    ionColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const dustTail = createPointCloud({ positions: dustPositions, colors: dustColors }, Math.max(0.045, radius * 0.075), 0.38, true);
  dustTail.material.userData.twinkleAmount = 0.22;
  dustTail.material.userData.twinkleSpeed = 0.52;
  dustTail.userData.breath = { amount: 0.024, speed: 0.42, phase: radius };
  const ionTail = createPointCloud({ positions: ionPositions, colors: ionColors }, Math.max(0.038, radius * 0.052), 0.46, true);
  ionTail.material.userData.twinkleAmount = 0.34;
  ionTail.material.userData.twinkleSpeed = 0.78;
  const dustEmission = createContinuousConeEmitter({
    seedLabel: `${id}-dust-tail-emission`,
    origin: [-radius * 0.12, 0, 0],
    direction: [-1, 0.015, -0.02],
    length: radius * 7.35,
    startWidth: radius * 0.055,
    endWidth: radius * 0.94,
    count: 360,
    color: 0xffe6b6,
    colorB: tailColor,
    size: Math.max(0.04, radius * 0.058),
    opacity: 0.27,
    speed: 0.18,
    pulseSpeed: 0.72,
    swirlSpeed: 0.2,
    turns: 0.55,
    turbulence: radius * 0.06,
  });
  const ionEmission = createContinuousConeEmitter({
    seedLabel: `${id}-ion-tail-emission`,
    origin: [-radius * 0.16, 0, 0],
    direction: [-1, -0.004, 0.012],
    length: radius * 9.6,
    startWidth: radius * 0.032,
    endWidth: radius * 0.28,
    count: 210,
    color: tailColor,
    colorB: 0xffffff,
    size: Math.max(0.035, radius * 0.045),
    opacity: 0.36,
    speed: 0.27,
    pulseSpeed: 1.08,
    swirlSpeed: 0.14,
    turns: 0.24,
    turbulence: radius * 0.028,
  });
  group.add(dustTail, dustEmission, ionTail, ionEmission, bowShock, coma, nucleus);
  group.userData.cometBowShock = bowShock;
  group.rotation.set((localRandom() - 0.5) * 0.8, Math.atan2(position[2], position[0]) + Math.PI, (localRandom() - 0.5) * 0.7);
  if (band === "stellar") {
    registerCometDrift(group, {
      seedLabel: id,
      radius: driftRadius,
      speed: driftSpeed ?? (id === "borisov-comet" ? 0.026 : 0.018),
    });
  }
  registerEntity({
    id,
    name,
    type: "Comet",
    band,
    object: group,
    radius,
    hitRadius: radius * 6.4,
    priority: 3.65,
    innerZoomFloor: getBandByKey(band).center - 0.72,
    meta,
    summary,
    stats,
    family: "comet",
    scaleHint: "Reference: comets are small-body visitors with attached coma, dust tail, and ion filament layers.",
  });
  return group;
}

function createSmallBodyArchitectureObject({
  id,
  name,
  band = "stellar",
  position,
  radius,
  color = 0xd6c09a,
  accent = 0x9feaff,
  kind = "Minor Body Architecture",
  hitRadius = null,
  priority = 3.2,
  innerZoomFloor = null,
  parentId = null,
  relation = null,
  rotation = null,
  meta,
  summary,
  stats = [],
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(`${id}-small-bodies`).reduce((total, char) => total + char.charCodeAt(0) * 23, 811)
  );
  const positions = [];
  const colors = [];
  const base = new THREE.Color(color);
  const blue = new THREE.Color(accent);
  const white = new THREE.Color(0xffffff);
  const count = Math.round(520 + radius * 40);
  for (let i = 0; i < count; i += 1) {
    const t = localRandom();
    const angle = localRandom() * Math.PI * 2;
    const arcBias = Math.sin(angle * 3 + radius) * 0.18;
    const beltRadius = radius * THREE.MathUtils.lerp(0.42, 1.32, Math.pow(t, 0.6));
    positions.push(
      Math.cos(angle) * beltRadius,
      (localRandom() - 0.5) * radius * 0.18 + arcBias,
      Math.sin(angle) * beltRadius * (0.48 + localRandom() * 0.2)
    );
    reusableColor.copy(base).lerp(blue, localRandom() * 0.22).lerp(white, localRandom() * 0.16);
    if (i % 31 === 0) reusableColor.copy(blue).lerp(white, 0.3 + localRandom() * 0.4);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const swarm = createPointCloud({ positions, colors }, Math.max(0.05, radius * 0.032), 0.5, true);
  swarm.material.userData.twinkleAmount = 0.18;
  swarm.material.userData.twinkleSpeed = 0.44;
  swarm.userData.spinVector = new THREE.Vector3(0.00004, 0.00022, -0.00002);
  const coreArc = createSceneGuideRing(radius * 0.92, color, 0.11, 192, 0.56);
  const outerArc = createSceneGuideRing(radius * 1.32, accent, 0.055, 192, 0.48);
  outerArc.userData.spinVector = new THREE.Vector3(0, -0.00008, 0);
  group.add(swarm, coreArc, outerArc);
  if (rotation) {
    group.rotation.set(rotation[0], rotation[1], rotation[2]);
  } else {
    group.rotation.set((localRandom() - 0.5) * 0.55, localRandom() * Math.PI * 2, (localRandom() - 0.5) * 0.42);
  }
  registerEntity({
    id,
    name,
    type: kind,
    band,
    object: group,
    radius,
    hitRadius: hitRadius ?? radius * 1.75,
    priority,
    innerZoomFloor: innerZoomFloor ?? getBandByKey(band).center - 0.62,
    meta,
    summary,
    stats,
    family: "small-body",
    parentId,
    relation,
    scaleHint: "Reference: small-body architecture is rendered as dust lanes, rocky bodies, and family arcs rather than individual full planets.",
  });
  return group;
}

function createSelectableSmallBodyRingObject({
  id,
  name,
  band = "system",
  selectionPosition,
  center = [0, 0, 0],
  innerRadius,
  outerRadius,
  radius,
  color = 0xd6c09a,
  accent = 0x9feaff,
  kind = "Small-Body Ring",
  shape = "ring",
  count = 1100,
  ySpread = 0.6,
  zScale = ECLIPTIC_Z_SCALE,
  arcCount = null,
  arcLength = 0.32,
  arcThickness = 0.24,
  glowScale = 0.22,
  hitRadius = 2.8,
  selectionRadius = null,
  priority = 2.2,
  parentId = "sun",
  relation = "small-body layer",
  meta,
  summary,
  stats = [],
}) {
  const group = new THREE.Group();
  group.position.set(selectionPosition[0], selectionPosition[1], selectionPosition[2]);
  const centerOffset = new THREE.Vector3(center[0], center[1], center[2]).sub(group.position);
  const localRandom = seededRandom(
    Array.from(`${id}-selectable-ring`).reduce((total, char) => total + char.charCodeAt(0) * 31, 2027)
  );
  const positions = [];
  const colors = [];
  const base = new THREE.Color(color);
  const edge = new THREE.Color(accent);
  const white = new THREE.Color(0xffffff);
  const thresholdMode = shape === "threshold";
  const effectiveArcCount = arcCount ?? Math.max(9, Math.round(count / 170));
  const arcCenters = thresholdMode
    ? Array.from({ length: effectiveArcCount }, (_, index) =>
        (index / effectiveArcCount) * Math.PI * 2 + (localRandom() - 0.5) * arcLength * 0.62
      )
    : [];
  for (let i = 0; i < count; i += 1) {
    let point;
    if (shape === "shell") {
      point = randomVectorFrom(localRandom, THREE.MathUtils.lerp(innerRadius, outerRadius, Math.pow(localRandom(), 0.65)));
      point.y *= 0.64 + localRandom() * 0.2;
      point.z *= 0.82;
    } else if (thresholdMode) {
      const arcIndex = Math.floor(localRandom() * effectiveArcCount);
      const centerAngle = arcCenters[arcIndex];
      const strand = (Math.floor(localRandom() * 3) - 1) * (outerRadius - innerRadius) * arcThickness * 0.2;
      const along = (localRandom() - 0.5) * arcLength * (0.72 + localRandom() * 0.58);
      const angle = centerAngle + along;
      const beltRadius = THREE.MathUtils.lerp(innerRadius, outerRadius, Math.pow(localRandom(), 0.58));
      const radialWidth = (outerRadius - innerRadius) * arcThickness;
      const braid = Math.sin(along * 9 + arcIndex * 1.7) * radialWidth * 0.24;
      const radial = strand + braid + (localRandom() - 0.5) * radialWidth;
      point = new THREE.Vector3(
        Math.cos(angle) * (beltRadius + radial),
        Math.sin(angle * 3.2 + arcIndex) * ySpread * 0.24 + (localRandom() - 0.5) * ySpread * 0.72,
        Math.sin(angle) * (beltRadius + radial) * zScale
      );
    } else {
      const angle = localRandom() * Math.PI * 2;
      const beltRadius = THREE.MathUtils.lerp(innerRadius, outerRadius, Math.pow(localRandom(), 0.62));
      const clump = Math.sin(angle * 9 + radius) * (outerRadius - innerRadius) * 0.04;
      point = new THREE.Vector3(
        Math.cos(angle) * (beltRadius + clump),
        (localRandom() - 0.5) * ySpread,
        Math.sin(angle) * (beltRadius + clump) * zScale
      );
    }
    positions.push(centerOffset.x + point.x, centerOffset.y + point.y, centerOffset.z + point.z);
    reusableColor.copy(base).lerp(edge, localRandom() * 0.32).lerp(white, localRandom() > 0.94 ? 0.34 : 0.06);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const field = createPointCloud({ positions, colors }, Math.max(0.05, radius * 0.024), shape === "shell" ? 0.24 : 0.32, true);
  field.material.userData.twinkleAmount = shape === "shell" ? 0.16 : 0.2;
  field.material.userData.twinkleSpeed = shape === "shell" ? 0.26 : 0.38;
  group.add(field);
  const guide = new THREE.Group();
  guide.position.copy(centerOffset);
  if (shape === "shell") {
    const shellRingA = createSceneGuideRing((innerRadius + outerRadius) * 0.5, accent, 0.035, 224, 0.82);
    const shellRingB = createSceneGuideRing((innerRadius + outerRadius) * 0.43, color, 0.025, 224, 0.58);
    shellRingB.rotation.set(Math.PI * 0.5, 0.12, 0.2);
    guide.add(shellRingA, shellRingB);
  } else if (thresholdMode) {
    const filamentPositions = [];
    const filamentColors = [];
    for (let arc = 0; arc < effectiveArcCount; arc += 1) {
      const centerAngle = arcCenters[arc];
      const strandCount = 2 + (arc % 2);
      for (let strand = 0; strand < strandCount; strand += 1) {
        const strandOffset = (strand - (strandCount - 1) * 0.5) * (outerRadius - innerRadius) * arcThickness * 0.26;
        const filamentRadius = THREE.MathUtils.lerp(innerRadius, outerRadius, 0.38 + ((arc + strand) % 5) * 0.06);
        for (let sample = 0; sample < 28; sample += 1) {
          const t = sample / 27;
          const angle = centerAngle + (t - 0.5) * arcLength * 1.16;
          const pulse = Math.sin(t * Math.PI * 2 + arc * 0.9 + strand) * (outerRadius - innerRadius) * 0.025;
          const r = filamentRadius + strandOffset + pulse;
          filamentPositions.push(
            Math.cos(angle) * r,
            Math.sin(angle * 2.8 + arc) * ySpread * 0.14,
            Math.sin(angle) * r * zScale
          );
          reusableColor.copy(base).lerp(edge, 0.34 + t * 0.32).lerp(white, sample % 9 === 0 ? 0.22 : 0.04);
          filamentColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
        }
      }
    }
    const filaments = createPointCloud(
      { positions: filamentPositions, colors: filamentColors },
      Math.max(0.045, radius * 0.018),
      0.34,
      true
    );
    filaments.material.userData.twinkleAmount = 0.18;
    filaments.material.userData.twinkleSpeed = 0.36;
    guide.add(
      createSceneGuideRing(innerRadius, color, 0.026, 224, zScale),
      createSceneGuideRing(outerRadius, accent, 0.022, 224, zScale),
      filaments
    );
  } else {
    guide.add(
      createSceneGuideRing(innerRadius, color, 0.045, 224, zScale),
      createSceneGuideRing(outerRadius, accent, 0.035, 224, zScale)
    );
  }
  group.add(guide, createGlowSphere(radius * glowScale, accent, 0.012));
  registerEntity({
    id,
    name,
    type: kind,
    band,
    object: group,
    radius,
    hitRadius,
    selectionRadius: selectionRadius ?? hitRadius,
    priority,
    innerZoomFloor: SYSTEM_ZOOM_FLOOR,
    meta,
    summary,
    stats,
    family: "small-body",
    parentId,
    relation,
    scaleHint: "Reference: this selectable marker represents the whole small-body layer while keeping its hit target small enough not to steal planets.",
  });
  return group;
}

function createTrojanArcArchitectureObject({
  id,
  name,
  band = "system",
  position,
  radius,
  color = 0xd8b174,
  accent = 0xfff0b8,
  kind = "Trojan Arc",
  count = 560,
  hitRadius = 2.6,
  priority = 2.45,
  parentId = "jupiter",
  relation = "trojan arc",
  meta,
  summary,
  stats = [],
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(`${id}-trojan-arc`).reduce((total, char) => total + char.charCodeAt(0) * 29, 3301)
  );
  const positions = [];
  const colors = [];
  const base = new THREE.Color(color);
  const blue = new THREE.Color(accent);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < count; i += 1) {
    const along = (localRandom() - 0.5) * radius * 3.6;
    const radial = (localRandom() - 0.5) * radius * 0.78;
    const lane = Math.sin(along * 0.42 + radius) * radius * 0.16;
    positions.push(
      along,
      (localRandom() - 0.5) * radius * 0.18,
      radial * ECLIPTIC_Z_SCALE + lane
    );
    reusableColor.copy(base).lerp(blue, localRandom() * 0.2).lerp(white, localRandom() > 0.93 ? 0.42 : 0.08);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const arc = createPointCloud({ positions, colors }, Math.max(0.045, radius * 0.032), 0.42, true);
  arc.material.userData.twinkleAmount = 0.18;
  arc.material.userData.twinkleSpeed = 0.34;
  const spine = createPixelFilamentStream(
    [
      [-radius * 1.7, 0, 0],
      [0, radius * 0.08, 0],
      [radius * 1.7, 0, 0],
    ],
    accent,
    0.11,
    Math.max(0.042, radius * 0.026),
    80,
    radius * 0.1
  );
  group.add(arc, spine, createGlowSphere(radius * 0.2, accent, 0.01));
  registerEntity({
    id,
    name,
    type: kind,
    band,
    object: group,
    radius,
    hitRadius,
    priority,
    innerZoomFloor: SYSTEM_ZOOM_FLOOR,
    meta,
    summary,
    stats,
    family: "small-body",
    parentId,
    relation,
    scaleHint: "Reference: Jupiter Trojan swarms are now co-orbital arcs on Jupiter's band rather than independent mini-belts.",
  });
  return group;
}

function createCircumstellarDiskObject({
  id,
  name,
  band = "stellar",
  position,
  radius,
  color = 0xffd69a,
  starColor = 0xdbe7ff,
  rotation = null,
  hitRadius = null,
  selectionRadius = null,
  priority = 1.6,
  innerZoomFloor = null,
  meta,
  summary,
  stats = [],
  parentId = null,
  relation = null,
  dynamicSystemOnly = false,
  hostSystemId = null,
  hostSystemName = null,
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(`${id}-circumstellar-disk`).reduce((total, char) => total + char.charCodeAt(0) * 31, 1447)
  );
  const positions = [];
  const colors = [];
  const dust = new THREE.Color(color);
  const blue = new THREE.Color(0xaedcff);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < 900; i += 1) {
    const t = Math.pow(localRandom(), 0.62);
    const angle = localRandom() * Math.PI * 2;
    const gap = 0.36 + Math.sin(angle * 2 + radius) * 0.025;
    const beltRadius = radius * THREE.MathUtils.lerp(gap, 1.34, t);
    const warp = Math.sin(angle * 3 + t * 5) * radius * 0.035 + (localRandom() - 0.5) * radius * 0.05;
    positions.push(
      Math.cos(angle) * beltRadius,
      warp,
      Math.sin(angle) * beltRadius * (0.36 + t * 0.1)
    );
    reusableColor.copy(dust).lerp(blue, t * 0.28).lerp(white, Math.pow(1 - t, 1.8) * 0.22);
    if (localRandom() > 0.92) reusableColor.copy(white).lerp(blue, 0.42);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const disk = createPointCloud({ positions, colors }, Math.max(0.045, radius * 0.032), 0.56, true);
  disk.material.userData.twinkleAmount = 0.22;
  disk.material.userData.twinkleSpeed = 0.72;
  disk.userData.spinVector = new THREE.Vector3(0, 0.00056, 0);
  const inner = createSceneGuideRing(radius * 0.46, 0xffffff, 0.12, 192, 0.36);
  const outer = createSceneGuideRing(radius * 1.18, color, 0.08, 224, 0.4);
  group.add(createGlowSphere(radius * 0.22, starColor, 0.018), disk, inner, outer);
  if (rotation) {
    group.rotation.set(rotation[0], rotation[1], rotation[2]);
  } else {
    group.rotation.set(0.42 + (localRandom() - 0.5) * 0.3, localRandom() * Math.PI * 2, -0.22 + (localRandom() - 0.5) * 0.24);
  }
  registerEntity({
    id,
    name,
    type: "Circumstellar Disk",
    band,
    object: group,
    radius,
    hitRadius: hitRadius ?? Math.max(radius * 0.72, 1.15),
    selectionRadius: selectionRadius ?? Math.max(radius * 0.42, 0.84),
    priority,
    innerZoomFloor: innerZoomFloor ?? getBandByKey(band).center - 0.7,
    meta,
    summary,
    stats,
    family: "circumstellar-disk",
    parentId,
    relation: relation ?? (parentId ? "debris disk" : null),
    dynamicSystemOnly,
    hostSystemId,
    hostSystemName,
    scaleHint: "Reference: circumstellar disks are ringed grain fields with inner gaps and warped dust, ready to reuse around young stars and remnants.",
  });
  return group;
}

function createDarkCloudObject({
  id,
  name,
  band = "stellar",
  position,
  radius,
  color = 0x3a1f4f,
  rimColor = 0x8be8ff,
  meta,
  summary,
  stats = [],
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(`${id}-dark-cloud`).reduce((total, char) => total + char.charCodeAt(0) * 37, 1931)
  );
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.88, 36, 18),
    createMaterial(
      THREE.MeshBasicMaterial,
      { color: 0x020208, blending: THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide },
      0.38
    )
  );
  core.scale.set(1.18, 0.72, 0.86);
  core.renderOrder = 4;
  const rimPositions = [];
  const rimColors = [];
  const sparkPositions = [];
  const sparkColors = [];
  const cold = new THREE.Color(rimColor);
  const purple = new THREE.Color(color);
  const amber = new THREE.Color(0xffc27a);
  for (let i = 0; i < 760; i += 1) {
    const point = makeLocalSpherePoint(localRandom, radius * (0.74 + Math.pow(localRandom(), 0.4) * 0.42));
    point.x *= 1.2 + Math.sin(point.y * 0.07) * 0.1;
    point.y *= 0.72;
    point.z *= 0.88;
    const edge = Math.abs(point.x) / Math.max(0.1, radius) + Math.abs(point.z) / Math.max(0.1, radius);
    if (edge > 0.68 || localRandom() > 0.72) {
      rimPositions.push(point.x, point.y, point.z);
      reusableColor.copy(purple).lerp(cold, 0.36 + localRandom() * 0.46);
      rimColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    if (localRandom() > 0.95) {
      sparkPositions.push(point.x * 0.76, point.y * 0.76, point.z * 0.76);
      reusableColor.copy(amber).lerp(cold, localRandom() * 0.35);
      sparkColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
  }
  const rim = createPointCloud({ positions: rimPositions, colors: rimColors }, Math.max(0.055, radius * 0.035), 0.34, true);
  rim.material.userData.twinkleAmount = 0.2;
  rim.material.userData.twinkleSpeed = 0.34;
  rim.userData.spinVector = new THREE.Vector3(0.000012, 0.00006, -0.000018);
  const sparks = createPointCloud({ positions: sparkPositions, colors: sparkColors }, Math.max(0.06, radius * 0.044), 0.48, true);
  sparks.material.userData.twinkleAmount = 0.62;
  sparks.material.userData.twinkleSpeed = 0.92;
  registerLaniakeaFlowCloud(rim, {
    seedLabel: `${id}-dark-rim-flow`,
    amount: radius * 0.018,
    speed: 0.26,
    counterSpeed: 0.18,
    phase: radius,
  });
  registerLaniakeaFlowCloud(sparks, {
    seedLabel: `${id}-dark-spark-flow`,
    amount: radius * 0.012,
    speed: 0.36,
    counterSpeed: 0.22,
    phase: radius * 1.7,
  });
  group.add(core, rim, sparks, createGlowSphere(radius * 1.18, rimColor, 0.0038));
  group.rotation.set((localRandom() - 0.5) * 0.8, localRandom() * Math.PI * 2, (localRandom() - 0.5) * 0.5);
  group.userData.spinVector = new THREE.Vector3(0.000006, 0.000022, -0.000008);
  core.userData.breath = { amount: 0.012, speed: 0.18, phase: radius };
  registerEntity({
    id,
    name,
    type: "Dark Molecular Cloud",
    band,
    object: group,
    radius,
    hitRadius: radius * 1.35,
    priority: 3.25,
    innerZoomFloor: getBandByKey(band).center - 0.7,
    meta,
    summary,
    stats,
    family: "dark-cloud",
    scaleHint: "Reference: dark clouds use negative space plus rim light, keeping cold structures distinct from bright emission nebulae.",
  });
  return group;
}

function createPixelAccretionDisk({ id, radius, color = 0xffe2a6, count = 920 }) {
  const localRandom = seededRandom(
    Array.from(`${id}-quasar-disk`).reduce((total, char) => total + char.charCodeAt(0) * 29, 0)
  );
  const positions = [];
  const colors = [];
  const baseColor = new THREE.Color(color);
  const hotBlue = new THREE.Color(0x9feaff);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < count; i += 1) {
    const t = Math.pow(localRandom(), 0.42);
    const angle = localRandom() * Math.PI * 2 + t * 1.4;
    const diskRadius = radius * (0.58 + t * 1.22);
    const thickness = radius * (0.025 + (1 - t) * 0.06) * (localRandom() - 0.5);
    const lane = Math.sin(angle * 2 + t * 5.0) * radius * 0.045;
    positions.push(
      Math.cos(angle) * diskRadius,
      thickness + lane,
      Math.sin(angle) * diskRadius * 0.28
    );
    reusableColor.copy(baseColor)
      .lerp(hotBlue, 0.24 + (1 - t) * 0.26)
      .lerp(white, localRandom() > 0.88 ? 0.46 : 0.08);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const disk = createPointCloud({ positions, colors }, Math.max(0.075, radius * 0.05), 0.64, true);
  disk.material.userData.twinkleAmount = 0.28;
  disk.material.userData.twinkleSpeed = 1.2;
  disk.userData.spinVector = new THREE.Vector3(0.00002, 0.0028, -0.00001);
  return disk;
}

function createQuasarObject({
  id,
  name,
  band,
  position,
  radius,
  color = 0xffe2a6,
  meta,
  summary,
  stats = [],
  parentId = null,
  relation = null,
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(`${id}-quasar`).reduce((total, char) => total + char.charCodeAt(0) * 37, 0)
  );
  const shadow = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.42, 32, 16),
    createMaterial(THREE.MeshBasicMaterial, { color: 0x000000, depthWrite: false }, 1)
  );
  const disk = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.25, radius * 0.055, 8, 128),
    createMaterial(
      THREE.MeshBasicMaterial,
      { color, blending: THREE.AdditiveBlending, depthWrite: false },
      0.2
    )
  );
  disk.rotation.x = 1.24;
  disk.userData.spin = 0.008;
  const pixelDisk = createPixelAccretionDisk({ id, radius, color });
  pixelDisk.rotation.x = 1.24;
  const jets = new THREE.Group();
  for (const sign of [-1, 1]) {
    const bend = (localRandom() - 0.5) * radius * 0.85;
    const jet = createPixelFilamentStream(
      [
        [0, sign * radius * 0.42, 0],
        [radius * 0.24 + bend * 0.2, sign * radius * 2.8, radius * 0.2 - bend * 0.12],
        [-radius * 0.16 + bend, sign * radius * 6.8, -radius * 0.34],
      ],
      sign > 0 ? 0x9feaff : 0xffe2a6,
      0.48,
      Math.max(0.09, radius * 0.065),
      170,
      radius * 0.42
    );
    jet.material.userData.twinkleAmount = 0.42;
    jet.material.userData.twinkleSpeed = 1.7;
    jets.add(jet);
  }
  jets.rotation.set(0.28, -0.18, 0.16);
  jets.userData.spinVector = new THREE.Vector3(0.00008, 0.00058, -0.00002);
  group.add(createGlowSphere(radius * 2.1, 0x9feaff, 0.016), shadow, disk, pixelDisk, jets);
  registerEntity({
    id,
    name,
    type: "Quasar",
    band,
    object: group,
    radius,
    hitRadius: radius * 4.8,
    priority: 4.6,
    innerZoomFloor: getBandByKey(band).center - 0.98,
    meta,
    summary,
    stats,
    parentId,
    relation,
    family: "quasar",
    scaleHint: "Reference: quasars are rendered as active cores with opposed jets, distinct from quiet galaxy anchors.",
  });
  return group;
}

function getExoplanetOrbitSpeed(periodDays) {
  if (!Number.isFinite(periodDays) || periodDays <= 0) {
    return 0.002;
  }
  return THREE.MathUtils.clamp(0.022 / Math.sqrt(periodDays), 0.0008, 0.009);
}

const STELLAR_DISK_PROFILES = {
  "van-maanens-star": {
    id: "van-maanen-debris-disk",
    label: "Debris Disk",
    radiusScale: 8.5,
    color: 0xffd6a0,
    starColor: 0xdbe7ff,
    inclinationDeg: 52,
    nodeDeg: 24,
    rollDeg: -8,
    meta: "White dwarf debris disk | remnant circumstellar architecture",
    summary: "A dusty ring scaffold around Van Maanen's Star, giving the white-dwarf family an inspectable debris-disk vocabulary.",
    stats: [
      { value: "white dwarf", label: "host" },
      { value: "debris", label: "disk" },
    ],
  },
  fomalhaut: {
    label: "Debris Ring",
    radiusScale: 4.7,
    color: 0xd8f2ff,
    starColor: 0xe8f6ff,
    inclinationDeg: 66,
    nodeDeg: -24,
    rollDeg: 6,
    meta: "A-type star | oblique debris ring system",
    summary: "A narrow Fomalhaut-style debris ring, kept oblique and offset in spirit so the bright A-star remains selectable inside it.",
    stats: [
      { value: "debris ring", label: "structure" },
      { value: "oblique", label: "view" },
    ],
  },
  vega: {
    label: "Debris Disk",
    radiusScale: 3.9,
    color: 0xbfe7ff,
    starColor: 0xcfe8ff,
    inclinationDeg: 8,
    nodeDeg: 38,
    rollDeg: 2,
    meta: "A-type star | warm debris-disk cue",
    summary: "A broad, nearly face-on Vega-style debris disk used as a calm counterpoint to edge-on young systems.",
    stats: [
      { value: "debris", label: "disk" },
      { value: "face-on", label: "view" },
    ],
  },
};

const EXOPLANET_SYSTEM_DISK_PROFILES = {
  "hr-8799-system": {
    label: "Wide Debris Disk",
    radiusScale: 5.1,
    systemRadiusScale: 1.18,
    color: 0xcfe8ff,
    starColor: 0xd6e8ff,
    inclinationDeg: 26,
    nodeDeg: -16,
    rollDeg: 4,
    summary: "A young wide-orbit giant-planet system with a broad debris architecture around the imaged planets.",
  },
  "beta-pictoris-system": {
    label: "Debris Disk",
    radiusScale: 5.4,
    systemRadiusScale: 1.22,
    color: 0xbfdfff,
    starColor: 0xbfdfff,
    inclinationDeg: 87,
    nodeDeg: 4,
    rollDeg: 0,
    secondaryTiltDeg: 5,
    summary: "A young edge-on debris disk system with a faint secondary disk cue, after the famous Beta Pictoris morphology.",
  },
  "eps-eridani-system": {
    label: "Debris Disk",
    radiusScale: 4.8,
    systemRadiusScale: 1.12,
    color: 0xffd18a,
    starColor: 0xffd18a,
    inclinationDeg: 30,
    nodeDeg: 26,
    rollDeg: -5,
    summary: "A nearby K-dwarf debris system with a warm outer grain field around its wide giant.",
  },
  "au-mic-system": {
    label: "Debris Disk",
    radiusScale: 4.9,
    systemRadiusScale: 1.16,
    color: 0xff9b74,
    starColor: 0xff7254,
    inclinationDeg: 88,
    nodeDeg: -11,
    rollDeg: 2,
    summary: "A young red-dwarf debris system, rendered nearly edge-on so its dust reads as a spindle rather than a halo.",
  },
};

function getSeededPlaneSpinVector(seedLabel, {
  base = 0.0001,
  variance = 0.00006,
  wobble = 0.00002,
  salt = 2909,
} = {}) {
  const localRandom = seededRandom(getLabelSeed(seedLabel, salt));
  return new THREE.Vector3(
    (localRandom() - 0.5) * wobble,
    (localRandom() > 0.5 ? 1 : -1) * (base + localRandom() * variance),
    (localRandom() - 0.5) * wobble
  );
}

function getDiskRotation(seedLabel, profile = {}, mode = "world") {
  const seed = getLabelSeed(seedLabel, mode === "system" ? 4211 : 2339);
  const localRandom = seededRandom(seed);
  const defaultInclination = mode === "system"
    ? THREE.MathUtils.lerp(0.18, 0.72, localRandom())
    : THREE.MathUtils.lerp(0.24, 0.92, localRandom());
  const inclination = Number.isFinite(profile.inclinationDeg)
    ? THREE.MathUtils.degToRad(profile.inclinationDeg)
    : defaultInclination;
  const node = Number.isFinite(profile.nodeDeg)
    ? THREE.MathUtils.degToRad(profile.nodeDeg)
    : localRandom() * Math.PI * 2;
  const roll = Number.isFinite(profile.rollDeg)
    ? THREE.MathUtils.degToRad(profile.rollDeg)
    : (localRandom() - 0.5) * 0.34;
  return [inclination, node, roll];
}

function applySystemPlaneOrientation(group, seedLabel, profile = {}) {
  const [x, y, z] = getDiskRotation(seedLabel, profile, "system");
  group.rotation.set(x, y, z);
}

function hasDiskVocabulary(item) {
  const text = [
    item?.meta,
    item?.summary,
    ...(item?.stats ?? []).flatMap((stat) => [stat.value, stat.label]),
  ].filter(Boolean).join(" ").toLowerCase();
  return text.includes("debris disk") || text.includes("debris ring") || text.includes("disk system") || text.includes("protoplanetary");
}

function getStellarDiskProfile(starInfo) {
  return STELLAR_DISK_PROFILES[starInfo?.id] ?? (hasDiskVocabulary(starInfo)
    ? {
        label: "Debris Disk",
        radiusScale: starInfo.spectral === "white" || starInfo.spectral === "blue-white" ? 4.2 : 3.6,
        color: starInfo.color,
        starColor: starInfo.color,
        summary: `A circumstellar debris disk attached to ${starInfo.name}, kept secondary so the host star remains the primary selectable body.`,
        stats: [{ value: "debris", label: "disk" }],
      }
    : null);
}

function getExoplanetSystemDiskProfile(model) {
  return EXOPLANET_SYSTEM_DISK_PROFILES[model?.id] ?? (hasDiskVocabulary(model)
    ? {
        label: "Debris Disk",
        radiusScale: model.starType === "blue-white" ? 4.8 : 4.2,
        systemRadiusScale: 1.1,
        color: model.color,
        starColor: model.color,
        summary: `A circumstellar disk scaffold attached to ${model.name}, generated from the system's debris-disk catalog language.`,
      }
    : null);
}

function createStellarHostDiskObject(starInfo) {
  const profile = getStellarDiskProfile(starInfo);
  if (!profile) {
    return null;
  }
  const position = getStellarScenePosition(starInfo.id, starInfo.position);
  const radius = Math.max(starInfo.radius * (profile.radiusScale ?? 3.8), starInfo.radius + 1.2);
  return createCircumstellarDiskObject({
    id: profile.id ?? `${starInfo.id}-debris-disk`,
    name: `${starInfo.name} ${profile.label ?? "Debris Disk"}`,
    band: "stellar",
    position,
    radius,
    color: profile.color ?? starInfo.color,
    starColor: profile.starColor ?? starInfo.color,
    rotation: getDiskRotation(`${starInfo.id}-stellar-disk`, profile, "world"),
    parentId: starInfo.id,
    relation: "circumstellar disk",
    meta: profile.meta ?? `${starInfo.name} circumstellar debris disk | attached small-body architecture`,
    summary: profile.summary ?? `A debris disk scaffold around ${starInfo.name}, kept visually attached while leaving the star selectable.`,
    stats: profile.stats ?? [{ value: "debris", label: "disk" }],
  });
}

function createExoplanetSystemObject({
  id,
  name,
  position,
  radius,
  color,
  starType,
  planets,
  meta,
  summary,
  stats = [],
}) {
  const group = new THREE.Group();
  const displayName = getExoplanetSystemDisplayName(name);
  const diskProfile = getExoplanetSystemDiskProfile({
    id,
    name: displayName,
    starType,
    color,
    meta,
    summary,
    stats,
  });
  applySystemPlaneOrientation(group, id, diskProfile ?? {});
  exoplanetSystemModels.set(id, {
    id,
    name: displayName,
    radius,
    color,
    starType,
    planets,
    meta,
    summary,
    stats,
    diskProfile,
  });
  const resolvedPosition = getStellarScenePosition(id, position);
  group.position.set(resolvedPosition[0], resolvedPosition[1], resolvedPosition[2]);
  group.add(
    createPlasmaStarCore({
      id,
      radius,
      color,
      spectral: starType ?? "red-dwarf",
      flareCount: 10,
    })
  );
  registerEntity({
    id,
    name: displayName,
    type: "Exoplanet System",
    band: "stellar",
    object: group,
    radius,
    hitRadius: radius * 4.8,
    priority: 3.7,
    innerZoomFloor: SYSTEM_ZOOM_FLOOR,
    meta,
    summary,
    stats: [
      { value: `${planets.length}`, label: "modeled planets" },
      ...stats,
    ],
    address: [displayName, "Milky Way", "Local Group", "Laniakea", "Cosmic Web"],
    scaleHint: `Reference: ${displayName} is a compact system view. Select a planet inside it, then enter Planet scale for close inspection.`,
  });

  if (diskProfile) {
    const compactDiskRadius = Math.max(radius * (diskProfile.radiusScale ?? 4.2), radius + 1.45);
    group.add(
      createCircumstellarDiskObject({
        id: `${id}-debris-disk`,
        name: `${displayName} ${diskProfile.label ?? "Debris Disk"}`,
        band: "stellar",
        position: [0, 0, 0],
        radius: compactDiskRadius,
        color: diskProfile.color ?? color,
        starColor: diskProfile.starColor ?? color,
        rotation: [0, 0, Number.isFinite(diskProfile.secondaryTiltDeg) ? THREE.MathUtils.degToRad(diskProfile.secondaryTiltDeg) : 0],
        hitRadius: Math.max(compactDiskRadius * 0.5, radius * 1.2),
        selectionRadius: Math.max(compactDiskRadius * 0.32, radius * 0.9),
        priority: 1.55,
        parentId: id,
        relation: "circumstellar disk",
        meta: `${displayName} circumstellar debris disk | compact stellar-neighborhood scaffold`,
        summary: diskProfile.summary ?? `A debris disk scaffold around ${displayName}, kept secondary to the host system selection.`,
        stats: [{ value: "debris", label: "disk" }],
      })
    );
  }

  for (const [index, planet] of planets.entries()) {
    const distance = getExoplanetCompactOrbitDistance(radius, planet, index);
    const planetRadius = radius * (planet.radiusScale ?? 0.18);
    const planetSourceBodyId = getExoplanetTextureProfileId(planet);
    const planetTextureEntity = {
      id: planet.id,
      sourceBodyId: planetSourceBodyId,
      visualColor: planet.color,
      type: planet.type,
      hostSystemId: id,
    };
    const planetMesh = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius, 18, 10),
      createMaterial(
        THREE.MeshPhysicalMaterial,
        {
          color: getBodyMaterialBaseColor(planetTextureEntity, planet.color),
          map: getBodyTexture(planetTextureEntity),
          bumpMap: getBodyDepthTexture(planetTextureEntity),
          bumpScale: getBodyBumpScale(planetTextureEntity) * 0.38,
          emissive: planet.color,
          emissiveIntensity: 0.018,
          roughness: getBodyRoughness(planetTextureEntity),
          specularIntensity: getBodySpecularIntensity(planetTextureEntity) * 0.42,
          specularIntensityMap: getBodySpecularTexture(planetTextureEntity),
          clearcoat: getBodyClearcoat(planetTextureEntity),
        },
        0.96
      )
    );
    const angle = (index / planets.length) * Math.PI * 2 + planet.phase;
    planetMesh.userData.orbit = {
      distance,
      angle,
      speed: getExoplanetOrbitSpeed(planet.periodDays),
      zScale: 0.62,
    };
    planetMesh.userData.spin = planet.hotJupiter ? 0.018 : 0.006;
    planetMesh.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance * 0.62);
    group.add(createSceneGuideRing(distance, planet.orbitColor ?? 0x9feaff, planet.habitable ? 0.13 : 0.07, 96, 0.62));
    group.add(planetMesh);
    registerEntity({
      id: planet.id,
      name: planet.name,
      type: planet.type,
      band: "stellar",
      object: planetMesh,
      radius: planetRadius,
      hitRadius: Math.max(planetRadius * 6.8, radius * 0.88),
      priority: planet.habitable ? 3.8 : 3.15,
      bodyDetail: true,
      innerZoomFloor: 0,
      visualColor: planet.color,
      sourceBodyId: planetSourceBodyId,
      detailScale: getExoplanetSystemDetailScale(planet, planetRadius),
      visualProfile: getExoplanetVisualProfile(planet),
      meta: planet.meta,
      summary: planet.summary,
      stats: planet.stats ?? [],
      address: [planet.name, displayName, "Milky Way", "Local Group", "Laniakea", "Cosmic Web"],
      inspectionObject: group,
      hostSystemId: id,
      hostSystemName: displayName,
      habitable: Boolean(planet.habitable),
      parentId: id,
      relation: "compact planet",
      scaleHint: `Reference: ${displayName} is rendered as a compact system; this planet can now be examined directly at Planet scale.`,
    });
  }

  const labelRing = createSceneGuideRing(radius * 5.2, 0xfff0b8, 0.055, 128, 0.62);
  labelRing.rotation.x = 0.12;
  group.add(labelRing);
  group.userData.spinVector = getSeededPlaneSpinVector(`${id}-compact-system-spin`, {
    base: 0.00012,
    variance: 0.00008,
    wobble: 0.000025,
    salt: 743,
  });
  return group;
}

function createSolarSystemPortalObject() {
  const group = new THREE.Group();
  const sun = createPlasmaStarCore({
    id: "stellar-solar-system",
    radius: 0.95,
    color: 0xfff0a8,
    spectral: "g-star",
    flareCount: 12,
  });
  group.add(sun);

  const planetColors = [0xb8a896, 0xf2cf91, 0x6ed4ff, 0xff8f6e, 0xf3d4a6, 0xe8d29b, 0x8be6ff, 0x638dff];
  for (let i = 0; i < planetColors.length; i += 1) {
    const distance = 1.85 + i * 0.42 + (i > 3 ? i * 0.1 : 0);
    const radius = i > 3 ? 0.095 : 0.045;
    const angle = i * 0.83;
    group.add(createSceneGuideRing(distance, i === 2 ? 0xfff0a8 : 0x8feaff, i === 2 ? 0.16 : 0.07, 96, 0.58));
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 14, 8),
      createMaterial(
        THREE.MeshStandardMaterial,
        {
          color: planetColors[i],
          emissive: planetColors[i],
          emissiveIntensity: 0.018,
          roughness: 0.86,
        },
        0.92
      )
    );
    planet.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance * 0.58);
    planet.userData.orbit = {
      distance,
      angle,
      speed: 0.00032 * Math.pow(2.6 / distance, 1.15),
      zScale: 0.58,
    };
    planet.userData.spin = 0.006 + i * 0.0005;
    group.add(planet);
  }

  group.add(createGlowSphere(3.25, 0xffd985, 0.012));
  registerEntity({
    id: "solar-system-portal",
    name: "Solar System",
    type: "Home Star System",
    band: "stellar",
    object: group,
    radius: 1.2,
    hitRadius: 4.7,
    priority: 6,
    innerZoomFloor: SYSTEM_ZOOM_FLOOR,
    portalTargetBand: "system",
    meta: "Local planetary system | centered parent anchor",
    summary: "The centered parent anchor for the Solar System. Select it from the stellar neighborhood, then zoom inward to enter the actual planetary scale.",
    stats: [
      { value: "1", label: "star" },
      { value: "8", label: "planets" },
      { value: "home", label: "reference" },
      { value: "portal", label: "zoom role" },
    ],
    scaleHint: "Reference: this is a parent portal. Zooming inward reveals the Solar System scale rather than isolating a distant star.",
  });
  return group;
}

function getExoplanetSystemHostName(systemName) {
  return systemName.replace(/\s+Star System$/u, "").replace(/\s+System$/u, "");
}

function getExoplanetSystemPlanetRadius(planet) {
  const typeLower = (planet?.type ?? "").toLowerCase();
  if (planet.hotJupiter || planet.type === "Hot Jupiter") {
    return 1.34;
  }
  if (typeLower.includes("gas giant")) {
    return THREE.MathUtils.clamp((planet.radiusScale ?? 0.26) * 4.5, 0.92, 1.22);
  }
  if (typeLower.includes("neptune")) {
    return THREE.MathUtils.clamp((planet.radiusScale ?? 0.22) * 4.1, 0.72, 1.02);
  }
  if (planet.type === "Super Earth") {
    return 0.72;
  }
  return THREE.MathUtils.clamp((planet.radiusScale ?? 0.16) * 3.8, 0.46, 0.78);
}

function getExoplanetPeriodSpacing(planet, compactScale = 1) {
  const periodDays = planet?.periodDays;
  if (!Number.isFinite(periodDays)) {
    return 0;
  }
  const logPeriod = Math.log10(Math.max(1, periodDays));
  const broadOrbit = periodDays > 1000
    ? Math.min(4.2, Math.log10(periodDays / 1000) * 2.2)
    : 0;
  return (Math.min(7.4, logPeriod * 1.18) + broadOrbit) * compactScale;
}

function getExoplanetCompactOrbitDistance(systemRadius, planet, index) {
  return systemRadius * (
    2.05 +
    index * 0.58 +
    (planet.orbitBias ?? 0) +
    getExoplanetPeriodSpacing(planet, 0.12)
  );
}

function getExoplanetSystemOrbitDistance(planet, index, total) {
  if (total === 1) {
    if (planet.hotJupiter || planet.type === "Hot Jupiter") {
      return 8.8;
    }
    if (planet.habitable || planet.type === "Super Earth") {
      return 12.8;
    }
    return 10.6;
  }
  const compact = total >= 5;
  const base = compact ? 7.1 : 8.4;
  const step = compact ? 2.05 : 3.35;
  return base + index * step + (planet.orbitBias ?? 0) * 1.55 + getExoplanetPeriodSpacing(planet, compact ? 1 : 0.86);
}

function getExoplanetSystemDetailScale(planet, radius) {
  if (planet.hotJupiter || planet.type === "Hot Jupiter") {
    return 1.22;
  }
  if (planet.type === "Super Earth") {
    return 0.96;
  }
  return THREE.MathUtils.clamp(radius / 0.68, 0.68, 0.94);
}

function getExoplanetTextureProfileId(planet) {
  if (planet?.sourceBodyId && SOLAR_SYSTEM_SOURCE_TEXTURES[planet.sourceBodyId]) {
    return planet.sourceBodyId;
  }
  if (planet?.textureId && SOLAR_SYSTEM_SOURCE_TEXTURES[planet.textureId]) {
    return planet.textureId;
  }
  const type = planet?.type ?? "";
  const typeLower = type.toLowerCase();
  const id = planet?.id ?? "";
  const periodDays = planet?.periodDays;
  const seededIndex = (values) => {
    const seed = Array.from(id || typeLower || "exoplanet")
      .reduce((total, char) => total + char.charCodeAt(0) * 19, 0);
    return values[Math.floor(seededRandom(seed)() * values.length) % values.length];
  };
  if (typeLower.includes("lava") || (typeLower.includes("rocky") && Number.isFinite(periodDays) && periodDays <= 4.5)) {
    return seededIndex(["exoplanet-lava", "exoplanet-cratered-red", "exoplanet-cratered-orange", "exoplanet-ionian"]);
  }
  if (
    planet?.hotJupiter ||
    typeLower.includes("jupiter") ||
    typeLower.includes("gas giant")
  ) {
    if (Number.isFinite(periodDays) && periodDays <= 20) {
      return seededIndex(["exoplanet-hot-jovian", "exoplanet-coral-jovian", "exoplanet-purple-jovian"]);
    }
    if (Number.isFinite(periodDays) && periodDays >= 1000) {
      return seededIndex(["exoplanet-pearlescent-jovian", "exoplanet-icy-giant-pearlescent", "exoplanet-icy-giant-navy"]);
    }
    return seededIndex(["exoplanet-stormy-blue-jovian", "exoplanet-blue-jovian", "exoplanet-green-jovian", "exoplanet-coral-jovian"]);
  }
  if (typeLower.includes("neptune")) {
    return seededIndex(["exoplanet-icy-giant-stormy", "exoplanet-icy-giant-crystal", "exoplanet-icy-giant-navy"]);
  }
  if (planet?.habitable || type === "Super Earth" || id.includes("-e") || id.includes("-f")) {
    return seededIndex([
      "exoplanet-earthlike-archipelago",
      "exoplanet-earthlike-reef",
      "exoplanet-earthlike-cyclone",
      "exoplanet-earthlike-chain",
      "exoplanet-ocean-turquoise",
      "exoplanet-ocean-dark",
    ]);
  }
  if (Number.isFinite(periodDays) && periodDays >= 12) {
    return seededIndex(["exoplanet-ice", "exoplanet-icy-moon", "exoplanet-cratered-warm"]);
  }
  return "exoplanet-lava";
}

function getExoplanetModelPlanetById(id) {
  if (!id) {
    return null;
  }
  const planetId = id.startsWith("system-") ? id.slice("system-".length) : id;
  for (const model of exoplanetSystemModels.values()) {
    const planet = model.planets.find((candidate) => candidate.id === planetId);
    if (planet) {
      return planet;
    }
  }
  return null;
}

function getExoplanetVisualProfile(planet) {
  if (planet.hotJupiter || planet.type === "Hot Jupiter") {
    return "hot-jupiter";
  }
  const typeLower = (planet?.type ?? "").toLowerCase();
  if (typeLower.includes("jupiter") || typeLower.includes("gas giant") || typeLower.includes("neptune")) {
    return "giant-exoplanet";
  }
  return planet.habitable ? "temperate-exoplanet" : "rocky-exoplanet";
}

function isGiantPlanetLike(entity) {
  const typeLower = (entity?.type ?? "").toLowerCase();
  return (
    entity?.type === "Giant Planet" ||
    typeLower.includes("jupiter") ||
    typeLower.includes("gas giant") ||
    typeLower.includes("neptune")
  );
}

function clearExoplanetSystemLayer() {
  for (let i = selectableEntities.length - 1; i >= 0; i -= 1) {
    const entity = selectableEntities[i];
    if (!entity.dynamicSystemOnly) {
      continue;
    }
    if (entity.hitTarget?.parent) {
      entity.hitTarget.parent.remove(entity.hitTarget);
    }
    if (entity.object?.userData?.selectableEntity === entity) {
      delete entity.object.userData.selectableEntity;
    }
    if (hoveredEntity === entity) {
      hoveredEntity = null;
    }
    removeEntityFromGraph(entity);
    selectableEntities.splice(i, 1);
  }
  exoplanetSystemLayerGroup?.clear();
  activeExoplanetSystemId = null;
  invalidateRenderCaches();
}

function refreshExoplanetSystemLayer(systemEntity) {
  if (!exoplanetSystemLayerGroup) {
    return;
  }
  if (!systemEntity) {
    if (activeExoplanetSystemId) {
      clearExoplanetSystemLayer();
    }
    return;
  }
  if (activeExoplanetSystemId === systemEntity.id) {
    return;
  }

  const model = exoplanetSystemModels.get(systemEntity.id);
  if (!model) {
    clearExoplanetSystemLayer();
    return;
  }

  clearExoplanetSystemLayer();
  activeExoplanetSystemId = systemEntity.id;
  applySystemPlaneOrientation(exoplanetSystemLayerGroup, `${model.id}-system-layer`, model.diskProfile ?? {});
  const hostStarName = getExoplanetSystemHostName(model.name);
  const hostRadius = THREE.MathUtils.clamp(model.radius * 4.2, 2.15, 3.35);
  const host = createPlasmaStarCore({
    id: `${model.id}-system-star`,
    radius: hostRadius,
    color: model.color,
    spectral: model.starType ?? "red-dwarf",
    flareCount: model.starType === "sun-like" ? 16 : 12,
  });
  exoplanetSystemLayerGroup.add(host);
  const hub = createSceneGuideRing(hostRadius * 1.85, model.color, 0.16, 160, ECLIPTIC_Z_SCALE);
  hub.userData.spin = 0.0011;
  exoplanetSystemLayerGroup.add(hub);
  registerEntity({
    id: `system-${model.id}-star`,
    name: hostStarName,
    type: "Host Star",
    band: "system",
    object: host,
    radius: hostRadius,
    hitRadius: hostRadius * 1.9,
    priority: 5,
    innerZoomFloor: SYSTEM_ZOOM_FLOOR,
    visualColor: model.color,
    meta: model.meta,
    summary: `The host star of ${model.name}, rendered as the parent anchor for this selected exoplanet system.`,
    stats: [
      { value: `${model.planets.length}`, label: "modeled planets" },
      ...(model.stats ?? []),
    ],
    address: [hostStarName, model.name, "Milky Way", "Local Group", "Laniakea", "Cosmic Web"],
    scaleHint: `Reference: ${model.name} owns this system-scale view. Select a planet here to descend into close inspection.`,
    hostSystemId: model.id,
    hostSystemName: model.name,
    dynamicSystemOnly: true,
    parentId: model.id,
    relation: "host star",
  });

  const localRandom = seededRandom(
    Array.from(model.id).reduce((total, char) => total + char.charCodeAt(0) * 31, 0)
  );
  let outerOrbit = hostRadius * 2.2;
  for (const [index, planet] of model.planets.entries()) {
    const planetRadius = getExoplanetSystemPlanetRadius(planet);
    const distance = getExoplanetSystemOrbitDistance(planet, index, model.planets.length);
    const planetSourceBodyId = getExoplanetTextureProfileId(planet);
    const planetTextureEntity = {
      id: `system-${planet.id}`,
      sourceBodyId: planetSourceBodyId,
      visualColor: planet.color,
      type: planet.type,
      hostSystemId: model.id,
    };
    outerOrbit = Math.max(outerOrbit, distance);
    const angle = Number.isFinite(planet.phase)
      ? planet.phase
      : (index / model.planets.length) * Math.PI * 2 + localRandom() * 0.4;
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(planetRadius, 36, 18),
      createMaterial(
        THREE.MeshPhysicalMaterial,
        {
          color: getBodyMaterialBaseColor(planetTextureEntity, planet.color),
          map: getBodyTexture(planetTextureEntity),
          bumpMap: getBodyDepthTexture(planetTextureEntity),
          bumpScale: getBodyBumpScale(planetTextureEntity) * 0.42,
          emissive: planet.color,
          emissiveIntensity: planet.habitable ? 0.022 : 0.014,
          roughness: getBodyRoughness(planetTextureEntity),
          specularIntensity: getBodySpecularIntensity(planetTextureEntity) * 0.46,
          specularIntensityMap: getBodySpecularTexture(planetTextureEntity),
          clearcoat: getBodyClearcoat(planetTextureEntity),
        },
        1
      )
    );
    body.userData.orbit = {
      distance,
      angle,
      speed: getExoplanetOrbitSpeed(planet.periodDays) * (model.planets.length > 3 ? 0.55 : 0.38),
      zScale: ECLIPTIC_Z_SCALE,
    };
    body.userData.spin = planet.hotJupiter ? 0.018 : 0.0065;
    body.position.set(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance * ECLIPTIC_Z_SCALE
    );
    const orbitColor = planet.habitable ? 0xffe88a : planet.orbitColor ?? 0xaeefff;
    const orbitOpacity = planet.habitable ? 0.2 : 0.11;
    exoplanetSystemLayerGroup.add(createSceneGuideRing(distance, orbitColor, orbitOpacity, 192, ECLIPTIC_Z_SCALE));
    exoplanetSystemLayerGroup.add(body);
    registerEntity({
      id: `system-${planet.id}`,
      name: planet.name,
      type: planet.type,
      band: "system",
      object: body,
      radius: planetRadius,
      hitRadius: Math.max(planetRadius * 2.3, 1.35),
      priority: planet.habitable ? 4.1 : 3.4,
      bodyDetail: true,
      innerZoomFloor: 0,
      visualColor: planet.color,
      sourceBodyId: planetSourceBodyId,
      detailScale: getExoplanetSystemDetailScale(planet, planetRadius),
      visualProfile: getExoplanetVisualProfile(planet),
      meta: planet.meta,
      summary: planet.summary,
      stats: planet.stats ?? [],
      address: [planet.name, model.name, "Milky Way", "Local Group", "Laniakea", "Cosmic Web"],
      hostSystemId: model.id,
      hostSystemName: model.name,
      habitable: Boolean(planet.habitable),
      scaleHint: `Reference: ${planet.name} is placed inside ${model.name}'s own system-scale model before close inspection.`,
      dynamicSystemOnly: true,
      parentId: `system-${model.id}-star`,
      relation: "planet",
    });
  }

  if (model.diskProfile) {
    const diskRadius = Math.max(
      (outerOrbit + 4.4) * (model.diskProfile.systemRadiusScale ?? 1.1),
      hostRadius * 3.2
    );
    exoplanetSystemLayerGroup.add(
      createCircumstellarDiskObject({
        id: `system-${model.id}-debris-disk`,
        name: `${model.name} ${model.diskProfile.label ?? "Debris Disk"}`,
        band: "system",
        position: [0, 0, 0],
        radius: diskRadius,
        color: model.diskProfile.color ?? model.color,
        starColor: model.diskProfile.starColor ?? model.color,
        rotation: [0, 0, Number.isFinite(model.diskProfile.secondaryTiltDeg) ? THREE.MathUtils.degToRad(model.diskProfile.secondaryTiltDeg) : 0],
        hitRadius: Math.max(diskRadius * 0.34, 2.1),
        selectionRadius: Math.max(diskRadius * 0.2, 1.5),
        priority: 1.45,
        innerZoomFloor: SYSTEM_ZOOM_FLOOR,
        parentId: `system-${model.id}-star`,
        relation: "circumstellar disk",
        dynamicSystemOnly: true,
        hostSystemId: model.id,
        hostSystemName: model.name,
        meta: `${model.name} debris disk | system-scale circumstellar architecture`,
        summary: model.diskProfile.summary ?? `A disk scaffold around ${model.name}, aligned with its authored system plane.`,
        stats: [{ value: "debris", label: "disk" }],
      })
    );
  }

  if (model.planets.length > 1) {
    exoplanetSystemLayerGroup.add(
      createDebrisBelt({
        seedLabel: `${model.id}-outer-dust`,
        innerRadius: outerOrbit + 2.6,
        outerRadius: outerOrbit + 5.8,
        count: 360 + model.planets.length * 80,
        colorA: 0x8aa6b9,
        colorB: 0xf0d6a2,
        ySpread: 0.44,
        size: 0.044,
        opacity: 0.22,
        clumpCount: Math.max(4, model.planets.length),
      })
    );
  }
  exoplanetSystemLayerGroup.add(createGlowSphere(hostRadius * 2.25, model.color, 0.01));
  exoplanetSystemLayerGroup.userData.spinVector = getSeededPlaneSpinVector(`${model.id}-system-layer-spin`, {
    base: 0.000075,
    variance: 0.000045,
    wobble: 0.000018,
    salt: 1901,
  });
  invalidateRenderCaches();
}

function buildExoplanetSystemLayer() {
  const bandInfo = getBandByKey("system");
  exoplanetSystemLayerGroup = makeLayer("exosystem", bandInfo.center, bandInfo.width, bandInfo.scale, new THREE.Group());
  exoplanetSystemLayerGroup.visible = false;
  return exoplanetSystemLayerGroup;
}

function createPillarsObject({
  id,
  name,
  band,
  position,
  radius,
  meta,
  summary,
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 13, 0)
  );
  const pillarSpecs = [
    { x: -radius * 0.48, z: radius * 0.02, height: radius * 1.55, width: radius * 0.16, lean: 0.2, phase: 0.2 },
    { x: 0, z: -radius * 0.12, height: radius * 1.22, width: radius * 0.13, lean: -0.12, phase: 1.6 },
    { x: radius * 0.38, z: radius * 0.1, height: radius * 0.96, width: radius * 0.11, lean: 0.08, phase: 2.8 },
  ];
  const dust = new THREE.Color(0x6b3f2a);
  const sulfur = new THREE.Color(0xff7e46);
  const oxygen = new THREE.Color(0x79e6ff);
  const hydrogen = new THREE.Color(0xa4ffbd);

  for (const spec of pillarSpecs) {
    const positions = [];
    const colors = [];
    for (let i = 0; i < 920; i += 1) {
      const t = Math.pow(localRandom(), 0.82);
      const y = (t - 0.5) * spec.height;
      const cap = 1 + Math.exp(-Math.pow((t - 0.9) * 7, 2)) * 1.35;
      const waist = 0.72 + Math.sin(t * Math.PI * 3 + spec.phase) * 0.13;
      const taper = (1.18 - t * 0.46) * cap * waist;
      const angle = localRandom() * Math.PI * 2 + t * 1.8;
      const radial = spec.width * taper * Math.pow(localRandom(), 0.42);
      const relief = Math.sin(angle * 3 + t * 8 + spec.phase) * spec.width * 0.22;
      positions.push(
        spec.x + Math.cos(angle) * radial + spec.lean * t * radius + relief,
        y,
        spec.z + Math.sin(angle) * radial * 0.9 + Math.cos(t * 7 + spec.phase) * spec.width * 0.22
      );
      const rim = Math.max(0, Math.cos(angle - 0.55)) * 0.55 + t * 0.22;
      reusableColor.copy(dust).lerp(sulfur, 0.2 + rim * 0.45);
      if (localRandom() > 0.84) {
        reusableColor.lerp(hydrogen, 0.32);
      }
      colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    const pillar = createPointCloud({ positions, colors }, radius * 0.035, 0.84, true);
    pillar.userData.spinVector = new THREE.Vector3(0.00006, 0.00016, -0.00004);
    group.add(pillar);

    group.add(
      createPixelFilamentStream(
        [
          [spec.x - spec.width * 0.7, -spec.height * 0.44, spec.z],
          [spec.x + spec.lean * radius * 0.35, 0, spec.z + spec.width * 0.8],
          [spec.x + spec.lean * radius * 0.85, spec.height * 0.47, spec.z - spec.width * 0.2],
        ],
        spec.phase > 1 ? 0x8af4ff : 0xffbe74,
        0.18,
        radius * 0.026,
        84,
        radius * 0.07
      )
    );
  }

  const veilPositions = [];
  const veilColors = [];
  for (let i = 0; i < 850; i += 1) {
    const point = randomOnSphere(radius * (0.62 + localRandom() * 0.72));
    point.y *= 0.76;
    point.z -= radius * 0.28;
    veilPositions.push(point.x, point.y, point.z);
    reusableColor.lerpColors(oxygen, hydrogen, localRandom()).lerp(sulfur, localRandom() * 0.34);
    veilColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const veil = createPointCloud({ positions: veilPositions, colors: veilColors }, radius * 0.025, 0.34, true);
  veil.userData.breath = { amount: 0.025, speed: 0.55, phase: 1.2 };
  group.add(veil, createGlowSphere(radius * 1.35, 0x61dfff, 0.028));
  group.rotation.set(-0.12, 0.35, 0.08);
  registerEntity({
    id,
    name,
    type: "Star-Forming Pillars",
    band,
    object: group,
    radius,
    hitRadius: radius * 1.45,
    priority: 4.1,
    innerZoomFloor: STELLAR_INSPECTION_FLOOR,
    meta,
    summary,
    stats: [
      { value: "M16", label: "Eagle Nebula" },
      { value: "4-5 ly", label: "Pillars height" },
      { value: "7000 ly", label: "Distance" },
      { value: "Serpens", label: "Constellation" },
    ],
    scaleHint: "Reference: the Pillars are sculpted as a 3D relief, not a flat billboard, so orbiting them should preserve the silhouette.",
  });
  return group;
}

function createBlackHoleObject({ id, name, band, position, radius, meta, summary, parentId = null, relation = null }) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 23, 0)
  );
  const shadow = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 24),
    createMaterial(
      THREE.MeshBasicMaterial,
      { color: 0x000000, depthWrite: false },
      1
    )
  );
  const diskPositions = [];
  const diskColors = [];
  const photonPositions = [];
  const photonColors = [];
  const lensPositions = [];
  const lensColors = [];
  const amber = new THREE.Color(0xffe3a0);
  const ember = new THREE.Color(0xff815c);
  const blue = new THREE.Color(0x7deaff);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < 1700; i += 1) {
    const t = Math.pow(localRandom(), 0.72);
    const angle = localRandom() * Math.PI * 2 + t * 1.45;
    const distance = radius * (1.28 + t * 2.05 + Math.sin(angle * 3) * 0.035);
    const thickness = radius * (0.035 + (1 - t) * 0.08) * (localRandom() - 0.5);
    diskPositions.push(
      Math.cos(angle) * distance,
      thickness,
      Math.sin(angle) * distance * (0.48 + t * 0.16)
    );
    reusableColor.copy(ember).lerp(amber, t * 0.64 + localRandom() * 0.18).lerp(white, localRandom() > 0.91 ? 0.46 : 0.04);
    diskColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  for (let i = 0; i < 360; i += 1) {
    const angle = (i / 360) * Math.PI * 2 + (localRandom() - 0.5) * 0.045;
    const distance = radius * (1.1 + localRandom() * 0.18);
    photonPositions.push(
      Math.cos(angle) * distance,
      (localRandom() - 0.5) * radius * 0.035,
      Math.sin(angle) * distance * 0.72
    );
    reusableColor.copy(amber).lerp(white, 0.42 + localRandom() * 0.48);
    photonColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  for (let i = 0; i < 880; i += 1) {
    const shell = i % 2 === 0 ? 3.05 : 3.62;
    const angle = localRandom() * Math.PI * 2;
    const distance = radius * (shell + (localRandom() - 0.5) * 0.28);
    const zScale = i % 2 === 0 ? 0.54 : 0.42;
    lensPositions.push(
      Math.cos(angle) * distance,
      (localRandom() - 0.5) * radius * 0.08,
      Math.sin(angle) * distance * zScale
    );
    reusableColor.copy(i % 2 === 0 ? blue : amber).lerp(white, localRandom() * 0.22);
    lensColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const accretion = createPointCloud(
    { positions: diskPositions, colors: diskColors },
    Math.max(0.06, radius * 0.048),
    0.66,
    true
  );
  accretion.rotation.x = 1.22;
  accretion.userData.spinVector = new THREE.Vector3(0, 0.006, 0);
  accretion.material.userData.twinkleAmount = 0.22;
  accretion.material.userData.twinkleSpeed = 1.2;
  const photonRing = createPointCloud(
    { positions: photonPositions, colors: photonColors },
    Math.max(0.075, radius * 0.062),
    0.74,
    true
  );
  photonRing.rotation.set(1.16, 0.12, -0.08);
  photonRing.userData.spinVector = new THREE.Vector3(0, 0.0048, 0);
  photonRing.material.userData.twinkleAmount = 0.44;
  photonRing.material.userData.twinkleSpeed = 1.7;
  const lensRings = createPointCloud(
    { positions: lensPositions, colors: lensColors },
    Math.max(0.055, radius * 0.045),
    0.36,
    true
  );
  lensRings.rotation.set(1.12, -0.12, 0.18);
  lensRings.userData.spinVector = new THREE.Vector3(0, -0.0011, 0);
  lensRings.material.userData.twinkleAmount = 0.2;
  lensRings.material.userData.twinkleSpeed = 0.82;
  const pixelShear = createGravityPixelShear({
    seedLabel: `${id}-black-hole-shear`,
    radius,
    mode: "sink",
    count: 620,
    colorA: 0x7deaff,
    colorB: 0xffe3a0,
    opacity: 0.34,
    size: Math.max(0.055, radius * 0.04),
  });
  pixelShear.rotation.set(1.08, -0.18, 0.28);
  group.add(
    createGlowSphere(radius * 1.55, 0xffe3a0, 0.02),
    createGlowSphere(radius * 2.45, 0x7deaff, 0.014),
    lensRings,
    pixelShear,
    shadow,
    photonRing,
    accretion
  );
  registerEntity({
    id,
    name,
    type: "Black Hole",
    band,
    object: group,
    radius,
    hitRadius: radius * 4,
    priority: 4.8,
    innerZoomFloor: getBandByKey(band).center - 1.05,
    meta,
    summary,
    parentId,
    relation,
    family: "black-hole",
    scaleHint: "Reference: isolated black holes now support an observatory zoom for close inspection of the accretion ring and shadow.",
  });
  return group;
}

function createMiniGalaxyObject({
  id,
  name,
  kind,
  band,
  position,
  radius,
  color = 0xb6f2ff,
  pointCount = null,
  typeLabel = null,
  priority = 3.2,
  innerZoomFloorBand = null,
  innerZoomFloor = getBandByKey("galaxy").center,
  portalTargetBand = null,
  stats = [],
  scaleHint = null,
  meta,
  summary,
  featured = false,
  activeCore = false,
  pulsarCount = null,
  parentId = null,
  relation = null,
  selectionRadius = null,
}) {
  const group = new THREE.Group();
  const resolvedInnerZoomFloor = innerZoomFloorBand
    ? getBandByKey(innerZoomFloorBand)?.center ?? innerZoomFloor
    : innerZoomFloor;
  group.position.set(position[0], position[1], position[2]);
  group.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
  if (featured) {
    group.rotation.set(0.68, -0.28, -0.08);
  }
  group.userData.spinVector = new THREE.Vector3(0.000015, featured ? 0.00013 : 0.00008, featured ? -0.000012 : -0.000018);
  const positions = [];
  const colors = [];
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 7, 0)
  );
  const isLocalGroupGalaxy = band === "cluster";
  const colorOne = new THREE.Color(color);
  const colorTwo = new THREE.Color(kind === "elliptical" ? 0xffe0ad : 0xffffff);
  const redshiftColor = new THREE.Color(0xff6f9f);
  const distanceHint = THREE.MathUtils.clamp(new THREE.Vector3(position[0], position[1], position[2]).length() / (band === "laniakea" ? 72 : 34), 0, 1);
  const redshiftBias = band === "laniakea"
    ? 0.06 + distanceHint * 0.18
    : isLocalGroupGalaxy
      ? 0.025 + distanceHint * 0.075
      : 0;
  const count = pointCount ?? (featured ? 1450 : (kind === "elliptical" ? 380 : 650));

  for (let i = 0; i < count; i += 1) {
    const r = Math.pow(localRandom(), kind === "elliptical" ? 0.33 : 0.58) * radius;
    const arm = i % (kind === "barred" ? 2 : 4);
    const angle =
      kind === "elliptical"
        ? localRandom() * Math.PI * 2
        : (arm / (kind === "barred" ? 2 : 4)) * Math.PI * 2 + r * 0.36 + (localRandom() - 0.5) * 0.45;
    const bar = kind === "barred" && r < radius * 0.44 ? (localRandom() - 0.5) * radius * 1.2 : 0;
    positions.push(
      Math.cos(angle) * r + bar,
      (localRandom() - 0.5) * radius * (kind === "elliptical" ? 0.35 : 0.08),
      Math.sin(angle) * r * (kind === "irregular" ? 0.38 + localRandom() * 0.5 : 0.62)
    );
    reusableColor.lerpColors(colorOne, colorTwo, localRandom());
    if (redshiftBias > 0) {
      reusableColor.lerp(redshiftColor, redshiftBias * (0.42 + localRandom() * 0.58));
    }
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }

  const galaxyStars = createPointCloud({ positions, colors }, Math.max(0.14, radius * (featured ? 0.028 : 0.036)), featured ? 0.66 : 0.56, true);
  galaxyStars.userData.spinVector = new THREE.Vector3(0.00001, featured ? 0.00018 : 0.0001, -0.00002);
  galaxyStars.material.userData.twinkleAmount = featured ? 0.34 : isLocalGroupGalaxy ? 0.28 : 0.16;
  galaxyStars.material.userData.twinkleSpeed = featured ? 0.92 : isLocalGroupGalaxy ? 0.78 : 0.48;
  galaxyStars.material.userData.twinklePhase = radius;
  group.add(galaxyStars);

  const sparkleCount = featured ? 110 : isLocalGroupGalaxy ? Math.max(18, Math.floor(radius * 9)) : 0;
  if (sparkleCount > 0) {
    const sparklePositions = [];
    const sparkleColors = [];
    for (let i = 0; i < sparkleCount; i += 1) {
      const r = Math.pow(localRandom(), kind === "elliptical" ? 0.42 : 0.62) * radius * 0.94;
      const arm = i % (kind === "barred" ? 2 : 4);
      const angle =
        kind === "elliptical"
          ? localRandom() * Math.PI * 2
          : (arm / (kind === "barred" ? 2 : 4)) * Math.PI * 2 + r * 0.38 + (localRandom() - 0.5) * 0.28;
      sparklePositions.push(
        Math.cos(angle) * r,
        (localRandom() - 0.5) * radius * (kind === "elliptical" ? 0.2 : 0.045),
        Math.sin(angle) * r * (kind === "irregular" ? 0.55 : 0.62)
      );
      reusableColor.lerpColors(new THREE.Color(0x9feaff), new THREE.Color(0xfff0a8), localRandom()).lerp(new THREE.Color(0xffffff), 0.45 + localRandom() * 0.42);
      if (redshiftBias > 0) {
        reusableColor.lerp(redshiftColor, redshiftBias * 0.62);
      }
      sparkleColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    const sparkles = createPointCloud(
      { positions: sparklePositions, colors: sparkleColors },
      Math.max(0.12, radius * (featured ? 0.044 : 0.052)),
      featured ? 0.76 : 0.62,
      true
    );
    sparkles.material.userData.twinkleAmount = featured ? 0.72 : 0.62;
    sparkles.material.userData.twinkleSpeed = featured ? 1.65 : 1.24;
    sparkles.material.userData.twinklePhase = radius * 1.9;
    sparkles.userData.spinVector = new THREE.Vector3(0.00002, 0.00026, -0.00001);
    group.add(sparkles);
  }
  const corePositions = [];
  const coreColors = [];
  for (let i = 0; i < Math.max(80, Math.floor(count * 0.18)); i += 1) {
    const coreRadius = Math.pow(localRandom(), 1.9) * radius * (kind === "elliptical" ? 0.36 : 0.22);
    const coreAngle = localRandom() * Math.PI * 2;
    corePositions.push(
      Math.cos(coreAngle) * coreRadius,
      (localRandom() - 0.5) * radius * (kind === "elliptical" ? 0.12 : 0.04),
      Math.sin(coreAngle) * coreRadius * (kind === "elliptical" ? 0.58 : 0.34)
    );
    reusableColor.copy(colorOne).lerp(colorTwo, 0.48 + localRandom() * 0.38);
    if (redshiftBias > 0) {
      reusableColor.lerp(redshiftColor, redshiftBias * 0.48);
    }
    coreColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const galaxyCore = createPointCloud(
    { positions: corePositions, colors: coreColors },
    Math.max(0.14, radius * (featured ? 0.032 : 0.05)),
    featured ? 0.42 : 0.66,
    true
  );
  galaxyCore.userData.spinVector = new THREE.Vector3(0.00003, 0.00022, -0.00002);
  group.add(galaxyCore);
  group.add(createGlowSphere(radius * (featured ? 0.14 : 0.08), kind === "elliptical" ? 0xffd28c : color, featured ? 0.007 : 0.006));

  if (featured || kind === "barred") {
    const barPositions = [];
    const barColors = [];
    const barCount = featured ? 260 : 96;
    for (let i = 0; i < barCount; i += 1) {
      const t = (i / (barCount - 1)) * 2 - 1;
      const width = (localRandom() - 0.5) * radius * (featured ? 0.11 : 0.08);
      barPositions.push(t * radius * (featured ? 0.48 : 0.34), width * 0.35, width);
      reusableColor.lerpColors(new THREE.Color(0xffdf9b), colorOne, localRandom() * 0.45);
      barColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    const bar = createPointCloud(
      { positions: barPositions, colors: barColors },
      Math.max(0.13, radius * (featured ? 0.032 : 0.026)),
      featured ? 0.48 : 0.32,
      true
    );
    bar.userData.spinVector = new THREE.Vector3(0, 0.00018, 0);
    group.add(bar);
  }

  const glintCount = pulsarCount ?? (featured ? 8 : activeCore ? 2 : (kind === "spiral" && radius > 5.5 ? 1 : 0));
  for (let i = 0; i < glintCount; i += 1) {
    const glintRadius = radius * (0.18 + localRandom() * 0.62);
    const glintAngle = localRandom() * Math.PI * 2;
    const glint = new THREE.Group();
    glint.position.set(
      Math.cos(glintAngle) * glintRadius,
      (localRandom() - 0.5) * radius * 0.04,
      Math.sin(glintAngle) * glintRadius * 0.62
    );
    const beamSize = radius * (featured ? 0.11 : 0.08);
    const burstPositions = [];
    const burstColors = [];
    for (let arm = 0; arm < 6; arm += 1) {
      const angle = (arm / 6) * Math.PI * 2 + localRandom() * 0.12;
      for (let step = 0; step < 5; step += 1) {
        const t = (step + 1) / 5;
        const d = beamSize * t * (0.45 + localRandom() * 0.72);
        burstPositions.push(
          Math.cos(angle) * d,
          (localRandom() - 0.5) * beamSize * 0.16,
          Math.sin(angle) * d * 0.72
        );
        reusableColor.lerpColors(
          new THREE.Color(i % 2 === 0 ? 0x9feaff : 0xfff0a8),
          new THREE.Color(0xffffff),
          0.35 + t * 0.45
        );
        burstColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
    const beam = createPointCloud(
      { positions: burstPositions, colors: burstColors },
      Math.max(0.045, radius * (featured ? 0.018 : 0.016)),
      featured ? 0.56 : 0.38,
      true
    );
    beam.material.userData.twinkleAmount = 0.82;
    beam.material.userData.twinkleSpeed = 2.4 + localRandom() * 1.1;
    beam.material.userData.twinklePhase = glintRadius;
    glint.add(beam);
    glint.rotation.set(
      (localRandom() - 0.5) * 1.1,
      localRandom() * Math.PI * 2,
      (localRandom() - 0.5) * 1.4
    );
    glint.userData.spinVector = new THREE.Vector3(
      (localRandom() - 0.5) * 0.0012,
      (localRandom() > 0.5 ? 1 : -1) * (0.0022 + localRandom() * 0.0026),
      (localRandom() - 0.5) * 0.0011
    );
    group.add(glint);
  }

  if (activeCore) {
    const jetGroup = new THREE.Group();
    const isLaniakeaJet = band === "laniakea";
    jetGroup.add(
      createBipolarContinuousEmission({
        seedLabel: `${id}-active-core-emission`,
        origin: [0, 0, 0],
        axis: [0, 1, 0],
        length: radius * (isLaniakeaJet ? 2.08 : 2.65),
        startWidth: radius * 0.018,
        endWidth: radius * (isLaniakeaJet ? 0.13 : 0.2),
        count: isLaniakeaJet ? 78 : 126,
        colorA: 0x9feaff,
        colorB: 0xffe1a6,
        size: Math.max(0.035, radius * (isLaniakeaJet ? 0.017 : 0.024)),
        opacity: isLaniakeaJet ? 0.28 : 0.38,
        speed: isLaniakeaJet ? 0.18 : 0.28,
        pulseSpeed: isLaniakeaJet ? 0.95 : 1.45,
        swirlSpeed: isLaniakeaJet ? 0.3 : 0.52,
      })
    );
    jetGroup.rotation.set(0.26, 0.18, -0.1);
    group.add(jetGroup);
  }
  registerEntity({
    id,
    name,
    type: typeLabel ?? `${kind[0].toUpperCase()}${kind.slice(1)} Galaxy`,
    band,
    object: group,
    radius,
    hitRadius: radius * 0.78,
    selectionRadius: selectionRadius ?? radius * (band === "laniakea" ? 1.42 : 1.16),
    priority,
    innerZoomFloor: resolvedInnerZoomFloor,
    portalTargetBand,
    meta,
    summary,
    stats,
    scaleHint,
    parentId,
    relation,
    family: "galaxy",
    kind,
    activeCore,
  });
  return group;
}

function isInspectableCompositeEntity(entity) {
  if (!entity || entity.portalTargetBand || entity.dynamicSystemOnly || entity.bodyDetail) {
    return false;
  }
  if (entity.band !== "laniakea") {
    return false;
  }
  const type = entity.type ?? "";
  return (
    type.includes("Group") ||
    type.includes("Cluster") ||
    type.includes("Cloud") ||
    type.includes("Field") ||
    type.includes("Supercluster") ||
    type.includes("Mass Concentration") ||
    type.includes("Wall")
  );
}

function isInspectableStarEntity(entity) {
  const type = entity?.type ?? "";
  return type === "Star" || type === "Host Star" || type.includes("Brown Dwarf") || type.includes("White Dwarf");
}

function isObservatoryTarget(entity) {
  if (!entity || entity.bodyDetail || entity.portalTargetBand || entity.dynamicSystemOnly) {
    return false;
  }
  if (
    getEntityChildren(entity, 1).length > 0 &&
    !isInspectableCompositeEntity(entity) &&
    !isInspectableStarEntity(entity)
  ) {
    return false;
  }
  if (entity.type === "Exoplanet System" || entity.hostSystemId) {
    return false;
  }
  const type = entity.type ?? "";
  return (
    type.includes("Nebula") ||
    type.includes("Pillars") ||
    type.includes("Galaxy") ||
    type.includes("Cluster") ||
    type.includes("Supercluster") ||
    type.includes("Black Hole") ||
    type.includes("Quasar") ||
    type.includes("Pulsar") ||
    type.includes("Neutron Star") ||
    type.includes("Magnetar") ||
    type.includes("X-Ray Binary") ||
    type.includes("Supernova") ||
    type.includes("Comet") ||
    type.includes("Circumstellar Disk") ||
    type.includes("Minor Body") ||
    type.includes("Asteroid") ||
    type.includes("Kuiper") ||
    type.includes("Trojan") ||
    type.includes("Oort") ||
    type.includes("Dark Molecular Cloud") ||
    isInspectableStarEntity(entity) ||
    type.includes("Void") ||
    type.includes("Field") ||
    type.includes("Mass Concentration") ||
    type.includes("Nucleus") ||
    type.includes("Wall")
  );
}

function getObservatoryFloor(entity) {
  if (!isObservatoryTarget(entity)) {
    return null;
  }
  const band = getBandByKey(entity.band);
  const type = entity.type ?? "";
  if (isInspectableStarEntity(entity)) {
    const starFloor = entity.band === "system" ? SYSTEM_ZOOM_FLOOR : STELLAR_INSPECTION_FLOOR;
    return THREE.MathUtils.clamp(starFloor, 0, band.center - 0.18);
  }
  const defaultFloor = {
    stellar: 2.34,
    galaxy: 4.0,
    cluster: 6.0,
    laniakea: isInspectableCompositeEntity(entity) || entity.portalTargetBand === "cluster"
      ? LANIAKEA_NESTED_VIEW_FLOOR
      : 7.78,
    web: 9.24,
    system: SYSTEM_ZOOM_FLOOR,
  }[entity.band] ?? band.center - 0.82;
  const typeBias =
    type.includes("Black Hole") ? -0.12 :
      type.includes("Quasar") ? -0.1 :
        type.includes("Pulsar") || type.includes("Supernova") || type.includes("Neutron Star") || type.includes("Magnetar") || type.includes("X-Ray Binary") ? -0.06 :
          isInspectableStarEntity(entity) ? -0.18 :
      type.includes("Nebula") || type.includes("Pillars") ? -0.08 :
        type.includes("Galaxy") ? -0.04 :
          0;
  return THREE.MathUtils.clamp(defaultFloor + typeBias, 0, band.center - 0.18);
}

function getEffectiveInnerZoomFloor(entity) {
  if (!entity) {
    return null;
  }
  const observatoryFloor = getObservatoryFloor(entity);
  if (Number.isFinite(observatoryFloor)) {
    if (
      entity.band === "laniakea" &&
      (isLaniakeaNestedEntity(entity) || isInspectableCompositeEntity(entity) || entity.portalTargetBand === "cluster")
    ) {
      return LANIAKEA_NESTED_VIEW_FLOOR;
    }
    return Number.isFinite(entity.innerZoomFloor)
      ? Math.min(entity.innerZoomFloor, observatoryFloor)
      : observatoryFloor;
  }
  return Number.isFinite(entity.innerZoomFloor) ? entity.innerZoomFloor : null;
}

function getObservatoryFocusDepth(entity = selectedEntity) {
  return isObservatoryTarget(entity) ? getSelectedInspectionDepth(entity) : 0;
}

function getObservatoryScaleBoost(entity = selectedEntity) {
  if (!isObservatoryTarget(entity)) {
    return 1;
  }
  const depth = smoothstep(0.08, 0.9, getObservatoryFocusDepth(entity));
  const type = entity.type ?? "";
  const maxBoost =
    isDirectLaniakeaStructureEntity(entity) ? 1.18 :
      type.includes("Black Hole") ? 3.25 :
        type.includes("Quasar") ? 3.05 :
          type.includes("Pulsar") || type.includes("Supernova") || type.includes("Neutron Star") || type.includes("Magnetar") || type.includes("X-Ray Binary") ? 2.9 :
            isInspectableStarEntity(entity) ? 4.05 :
        type.includes("Nebula") || type.includes("Pillars") ? 2.85 :
          type.includes("Galaxy") ? 2.75 :
            type.includes("Cluster") ? 2.65 :
              2.35;
  return THREE.MathUtils.lerp(1, maxBoost, depth);
}

function isDirectLaniakeaStructureEntity(entity) {
  return Boolean(
    entity?.band === "laniakea" &&
    getEntityParent(entity)?.id === "laniakea" &&
    getEntityChildren(entity, 1).length > 0
  );
}

function isLaniakeaNestedPortal(entity) {
  return Boolean(
    entity?.band === "laniakea" &&
    entity.portalTargetBand === "cluster" &&
    getEntityChildren(entity, 1).length > 0
  );
}

function getObservatoryCameraPull(entity = selectedEntity) {
  if (!isObservatoryTarget(entity)) {
    return 0;
  }
  const type = entity.type ?? "";
  const base =
    type.includes("Black Hole") ? 9.2 :
      type.includes("Quasar") ? 8.8 :
        type.includes("Pulsar") || type.includes("Supernova") || type.includes("Neutron Star") || type.includes("Magnetar") || type.includes("X-Ray Binary") ? 7.8 :
          isInspectableStarEntity(entity) ? 9.6 :
      type.includes("Nebula") || type.includes("Pillars") ? 7.2 :
        type.includes("Galaxy") ? 8.1 :
          type.includes("Cluster") ? 7.7 :
            6.4;
  return base * smoothstep(0.08, 0.92, getObservatoryFocusDepth(entity));
}

function updateObservatoryFocusScale() {
  for (const entity of selectableEntities) {
    if (!isObservatoryTarget(entity) || !entity.object) {
      continue;
    }
    const object = entity.object;
    if (!object.userData.observatoryBaseScale) {
      object.userData.observatoryBaseScale = object.scale.clone();
    }
    const boost = entity === selectedEntity ? getObservatoryScaleBoost(entity) : 1;
    observatoryScaleTarget.copy(object.userData.observatoryBaseScale).multiplyScalar(boost);
    object.scale.lerp(observatoryScaleTarget, entity === selectedEntity ? 0.12 : 0.08);
  }
}

function findSelectableFromObject(object) {
  let current = object;
  while (current) {
    if (current.userData?.selectableEntity) {
      return current.userData.selectableEntity;
    }
    current = current.parent;
  }
  return null;
}

function getEntityRootLocalPosition(entity, out) {
  entity.object.getWorldPosition(out);
  root.worldToLocal(out);
  return out;
}

function getGalaxyLayerPosition(position) {
  return [
    position[0] * GALAXY_LAYER_SPACING_SCALE,
    position[1] * GALAXY_LAYER_Y_SCALE,
    position[2] * GALAXY_LAYER_SPACING_SCALE,
  ];
}

function getBandAnchor(band, out) {
  if (band.key === "planet") {
    return out.copy(inspectionAnchor);
  }
  return out.set(band.anchor[0], band.anchor[1], band.anchor[2]);
}

function getBandEmergenceAnchor(band, out) {
  if (band.key === "planet") {
    return out.copy(inspectionAnchor);
  }
  const anchor = band.emergenceAnchor ?? band.anchor;
  return out.set(anchor[0], anchor[1], anchor[2]);
}

function getCurrentBandTransition() {
  let lower = orderedScaleBands[0];
  let upper = orderedScaleBands[orderedScaleBands.length - 1];

  for (let i = 0; i < orderedScaleBands.length - 1; i += 1) {
    if (zoomLevel >= orderedScaleBands[i].center && zoomLevel <= orderedScaleBands[i + 1].center) {
      lower = orderedScaleBands[i];
      upper = orderedScaleBands[i + 1];
      break;
    }
  }

  if (zoomLevel <= orderedScaleBands[0].center) {
    lower = orderedScaleBands[0];
    upper = orderedScaleBands[0];
  } else if (zoomLevel >= orderedScaleBands[orderedScaleBands.length - 1].center) {
    lower = orderedScaleBands[orderedScaleBands.length - 1];
    upper = orderedScaleBands[orderedScaleBands.length - 1];
  }

  return {
    lower,
    upper,
    rawT: lower === upper ? 0 : (zoomLevel - lower.center) / (upper.center - lower.center),
  };
}

function getTransitionAnchor(lower, upper, rawT, out) {
  getBandAnchor(lower, lowerAnchor);
  if (!upper.emergenceAnchor || lower === upper) {
    getBandAnchor(upper, upperAnchor);
    const t = lower.key === "stellar" && upper.key === "galaxy"
      ? smoothstep(0, 0.78, rawT)
      : smoothstep(0, 1, rawT);
    return out.lerpVectors(lowerAnchor, upperAnchor, t);
  }

  getBandEmergenceAnchor(upper, emergenceAnchor);
  getBandAnchor(upper, orbitAnchor);
  const arrivalT = smoothstep(0, 0.5, rawT);
  const settleT = smoothstep(0.5, 1, rawT);
  out.lerpVectors(lowerAnchor, emergenceAnchor, arrivalT);
  return out.lerp(orbitAnchor, settleT);
}

function getEmergenceFocusDamping() {
  const { lower, upper, rawT } = getCurrentBandTransition();
  if (!upper.emergenceAnchor || lower === upper) {
    return 1;
  }
  return smoothstep(0.62, 1, rawT);
}

function updateOrbitalPositions() {
  const closeInspectionActive = isCloseInspectionActive();
  refreshAnimatedObjects();
  for (const object of orbitObjects) {
    const orbit = object.userData.orbit;
    if (!orbit) {
      continue;
    }
    if (shouldPauseInspectionMotion(object, closeInspectionActive)) {
      continue;
    }
    orbit.angle += orbit.speed;
    const center = orbit.center ?? [0, 0, 0];
    object.position.set(
      (center[0] ?? 0) + Math.cos(orbit.angle) * orbit.distance * (orbit.xScale ?? 1),
      (center[1] ?? 0) + (orbit.y ?? 0),
      (center[2] ?? 0) + Math.sin(orbit.angle) * orbit.distance * (orbit.zScale ?? 1)
    );
    if (orbit.alignToOrbit) {
      object.rotation.y = -orbit.angle + (orbit.rotationOffset ?? Math.PI * 0.5);
    }
  }
}

function updatePlanetInspectionDetail() {
  if (!planetDetailPivot || !planetDetailBody) {
    return;
  }

  const entity = getInspectionEntity();
  if (!entity) {
    if (planetDetailMoonParentId !== null || (planetDetailMoonsGroup?.children.length ?? 0) > 0) {
      clearDetailMoonEntities();
      planetDetailMoonsGroup?.clear();
      planetDetailMoonParentId = null;
    }
    planetDetailPivot.visible = false;
    if (planetDetailJupiterAtmosphere) {
      planetDetailJupiterAtmosphere.visible = false;
    }
    planetDetailEntityId = null;
    planetDetailTextureId = null;
    return;
  }

  const inspectionReveal = getPlanetInspectionReveal();
  planetDetailPivot.visible = inspectionReveal > 0.01;
  getInspectionTargetPosition(entity, inspectionTargetPosition);
  inspectionAnchor.lerp(inspectionTargetPosition, selectedEntity?.bodyDetail ? 0.14 : 0.035);
  planetDetailPivot.position.copy(inspectionAnchor);
  planetDetailBody.position.set(0, 0, 0);

  const textureBodyId = getTextureBodyId(entity);
  if (planetDetailEntityId !== entity.id || planetDetailTextureId !== textureBodyId) {
    const targetColor = new THREE.Color(entity.visualColor ?? 0x6ed4ff);
    const isMoonBody = isMoonInspectionEntity(entity);
    const sourceProfile = getSourceTextureProfile(entity);
    const hasAtmosphere =
      entity.id === "earth" ||
      entity.id === "venus" ||
      entity.id === "jupiter" ||
      entity.id === "saturn" ||
      entity.id === "uranus" ||
      entity.id === "neptune" ||
      entity.id === "titan" ||
      Boolean(sourceProfile?.clouds || sourceProfile?.cloudAlpha || getDetailCloudOpacity(entity) > 0) ||
      isGiantPlanetLike(entity);
    planetDetailBody.material.color.set(
      getBodyMaterialBaseColor(entity, isMoonBody ? targetColor.getHex() : 0xffffff)
    );
    planetDetailBody.material.emissive.set(entity.id === "earth" ? 0xffffff : targetColor);
    planetDetailBody.material.emissiveMap = getBodyEmissiveTexture(entity);
    planetDetailBody.material.emissiveIntensity = entity.type === "Star" ? 0.18 : entity.id === "earth" ? 0.035 : isMoonBody ? 0.002 : 0.006;
    planetDetailBody.material.roughness = getBodyRoughness(entity);
    planetDetailBody.material.specularIntensity = getBodySpecularIntensity(entity);
    planetDetailBody.material.specularIntensityMap = getBodySpecularTexture(entity);
    planetDetailBody.material.clearcoat = getBodyClearcoat(entity);
    planetDetailBody.material.map = getBodyTexture(entity);
    planetDetailBody.material.bumpMap = getBodyDepthTexture(entity);
    planetDetailBody.material.bumpScale = getBodyBumpScale(entity);
    planetDetailBody.material.needsUpdate = true;
    planetDetailBody.userData.spin = 0;

    planetDetailBody.scale.setScalar(getInspectionBodyScale(entity));
    configureDetailCloudVolume(entity);
    if (planetDetailEarthCloudBands) {
      planetDetailEarthCloudBands.visible = entity.id === "earth";
      planetDetailEarthCloudBands.scale.setScalar(getInspectionBodyScale(entity));
    }
    if (planetDetailAtmosphere) {
      planetDetailAtmosphere.visible = hasAtmosphere;
      planetDetailAtmosphere.material.userData.baseOpacity =
        entity.id === "earth" || entity.id === "venus" ? 0.055 : 0.026;
      planetDetailAtmosphere.scale.setScalar(getInspectionBodyScale(entity) * (isGiantPlanetLike(entity) ? 1.18 : 1));
    }
    if (planetDetailJupiterAtmosphere) {
      planetDetailJupiterAtmosphere.visible = entity.id === "jupiter";
      planetDetailJupiterAtmosphere.scale.setScalar(getInspectionBodyScale(entity));
      planetDetailJupiterAtmosphere.rotation.y = 0;
    }
    if (planetDetailGlow) {
      planetDetailGlow.visible = entity.type === "Star" || hasAtmosphere;
      planetDetailGlow.material.color.copy(targetColor);
      planetDetailGlow.material.userData.baseOpacity =
        entity.type === "Star" ? 0.065 : entity.id === "titan" ? 0.008 : isGiantPlanetLike(entity) ? 0.014 : 0.01;
      planetDetailGlow.scale.setScalar(getInspectionBodyScale(entity) * (entity.type === "Star" ? 1.08 : entity.id === "titan" ? 0.9 : 0.96));
    }
    if (planetDetailRingSystem) {
      const ringStyle = ringedPlanetStyles[entity.id];
      planetDetailRingSystem.visible = Boolean(ringStyle);
      if (ringStyle) {
        const [disk, inner, outer] = planetDetailRingSystem.children;
        planetDetailRingSystem.scale.setScalar(getInspectionBodyScale(entity) * ringStyle.detailScale);
        planetDetailRingSystem.rotation.z = ringStyle.tilt * 0.18;
        disk.material.map = getRingColorTexture(entity.id);
        disk.material.alphaMap = getRingAlphaTexture(entity.id);
        disk.material.blending = disk.material.map ? THREE.NormalBlending : THREE.AdditiveBlending;
        disk.material.alphaTest = disk.material.alphaMap ? 0.035 : 0;
        disk.material.color.setHex(disk.material.map ? 0xffffff : ringStyle.color);
        inner.material.color.setHex(ringStyle.innerColor);
        outer.material.color.setHex(ringStyle.outerColor);
        disk.material.userData.baseOpacity = ringStyle.detailDiskOpacity;
        inner.material.userData.baseOpacity = ringStyle.detailInnerOpacity;
        outer.material.userData.baseOpacity = ringStyle.detailOuterOpacity;
        disk.material.needsUpdate = true;
      }
    }
    refreshPlanetDetailMoons(entity);
    planetDetailEntityId = entity.id;
    planetDetailTextureId = textureBodyId;
  }
}

function getDetailParentIdFromSelectionId(id) {
  const match = /^detail-([^-]+)-.+$/.exec(id);
  return match?.[1] ?? null;
}

function resolvePendingInitialSelection() {
  if (!pendingInitialSelectParam) {
    return;
  }
  const pendingEntity = selectableEntities.find((entity) => entity.id === pendingInitialSelectParam);
  if (!pendingEntity) {
    return;
  }
  pendingInitialSelectParam = "";
  selectEntity(pendingEntity, false);
  updateHoverHint(null);
}

function updateJupiterAtmosphere(elapsed, deltaSec) {
  if (!planetDetailJupiterAtmosphere || !planetDetailJupiterAtmosphere.visible || !planetDetailPivot?.visible) {
    return;
  }
  planetDetailJupiterAtmosphere.traverse((object) => {
    const materials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
    for (const material of materials) {
      if (!material.uniforms?.time || !material.uniforms?.layerOpacity) {
        continue;
      }
      material.uniforms.time.value = elapsed;
      material.uniforms.layerOpacity.value = material.opacity ?? material.userData.baseOpacity ?? 0.34;
    }
  });
}

function updateEarthCloudBands(elapsed) {
  if (!planetDetailEarthCloudBands || !planetDetailEarthCloudBands.visible || !planetDetailPivot?.visible) {
    return;
  }
  planetDetailEarthCloudBands.traverse((object) => {
    const material = object.material;
    if (!material?.uniforms?.time || !material.uniforms?.layerOpacity) {
      return;
    }
    material.uniforms.time.value = elapsed;
    material.uniforms.layerOpacity.value = material.opacity ?? material.userData.baseOpacity ?? 0.2;
  });
}

function getInspectionEntity() {
  const stagedMoonParent = getStagedMoonParentEntity(selectedEntity);
  if (stagedMoonParent) {
    return stagedMoonParent;
  }
  if (selectedEntity?.bodyDetail) {
    return selectedEntity;
  }
  return null;
}

function isMoonInspectionEntity(entity) {
  return entity?.type === "Major Moon";
}

function isSystemMoonEntity(entity) {
  return Boolean(
    entity &&
    isMoonInspectionEntity(entity) &&
    entity.band === "system" &&
    !entity.detailOnly &&
    entity.parentId
  );
}

function isDetailMoonEntity(entity) {
  return Boolean(entity && isMoonInspectionEntity(entity) && entity.detailOnly && entity.parentId);
}

function getStagedMoonParentEntity(entity) {
  if (!isSystemMoonEntity(entity) && !(isDetailMoonEntity(entity) && zoomLevel >= MOON_DETAIL_PARENT_VIEW_ZOOM)) {
    return null;
  }
  if (isSystemMoonEntity(entity) && zoomLevel < MOON_DETAIL_PARENT_VIEW_ZOOM) {
    return null;
  }
  const parent = getEntityParent(entity) ?? selectableEntities.find((candidate) => candidate.id === entity.parentId);
  return parent?.bodyDetail ? parent : null;
}

function getInspectionBodyScale(entity) {
  const bodyScale = entity?.detailScale ?? 1;
  if (isMoonInspectionEntity(entity)) {
    return Math.max(bodyScale, 0.7);
  }
  return bodyScale;
}

function getInspectionTargetPosition(entity, out) {
  if (isMoonInspectionEntity(entity)) {
    return out.copy(inspectionAnchor);
  }
  return getEntityRootLocalPosition(entity, out);
}

function shouldHideGlobalInspectionRing(entity) {
  return (
    entity === selectedEntity &&
    isMoonInspectionEntity(entity) &&
    getPlanetInspectionReveal(entity) > 0.08
  );
}

function shouldUseInspectionFocus(entity) {
  if (!entity?.bodyDetail) {
    return false;
  }
  const entityBand = getBandByKey(entity.band);
  const bandOpacity = getLayerOpacity(entityBand.center, entityBand.width);
  const planetOpacity = getLayerOpacity(scaleBands[0].center, scaleBands[0].width);
  return planetOpacity > bandOpacity;
}

function getSelectedInspectionDepth(entity = selectedEntity) {
  const innerZoomFloor = getEffectiveInnerZoomFloor(entity);
  if (
    !entity ||
    entity !== selectedEntity ||
    entity.id === searchSuppressedTransientEntityId ||
    !Number.isFinite(innerZoomFloor)
  ) {
    return 0;
  }
  const band = getBandByKey(entity.band);
  if (zoomLevel >= band.center) {
    return 0;
  }
  return THREE.MathUtils.clamp(
    (band.center - zoomLevel) / Math.max(0.001, band.center - innerZoomFloor),
    0,
    1
  );
}

function getPlanetInspectionReveal(entity = selectedEntity) {
  const inspectionEntity = entity === selectedEntity ? getInspectionEntity() : entity;
  if (!inspectionEntity?.bodyDetail) {
    return 0;
  }
  const revealFloor = isSystemMoonEntity(entity) ? MOON_PARENT_VIEW_FLOOR : 0.52;
  return 1 - smoothstep(revealFloor, SYSTEM_ZOOM_FLOOR, zoomLevel);
}

function getSelectedInspectionOpacity(entity = selectedEntity) {
  const depth = entity?.bodyDetail
    ? getPlanetInspectionReveal(entity)
    : getSelectedInspectionDepth(entity);
  return depth > 0 ? 0.55 + depth * 0.38 : 0;
}

function getSelectedInspectionIsolation() {
  if (selectedEntity?.portalTargetBand && !isLaniakeaNestedPortal(selectedEntity)) {
    return 0;
  }
  const depth = selectedEntity?.bodyDetail
    ? getPlanetInspectionReveal(selectedEntity)
    : getSelectedInspectionDepth();
  return smoothstep(0.04, 0.34, depth);
}

function getSelectedPortalDepth() {
  if (!selectedEntity?.portalTargetBand || isLaniakeaNestedPortal(selectedEntity)) {
    return 0;
  }
  return smoothstep(0.04, 0.76, getSelectedInspectionDepth());
}

function getEntityVisibilityOpacity(entity) {
  if (entity?.id === searchSuppressedTransientEntityId) {
    return 0;
  }
  const contextualSystem = getContextualSystemEntity();
  if (entity.dynamicSystemOnly && contextualSystem?.id !== entity.hostSystemId) {
    return 0;
  }
  if (entity.band === "system" && contextualSystem && !entity.dynamicSystemOnly) {
    return 0;
  }
  const band = getBandByKey(entity.band);
  return Math.max(getLayerOpacity(band.center, band.width), getSelectedInspectionOpacity(entity));
}

function getEntityInteractableOpacity(entity) {
  const ancestorDepth = getSelectedBranchAncestorDepth(entity);
  const ancestorOpacity = ancestorDepth > 0
    ? 0.48 + smoothstep(0.025, 0.22, ancestorDepth) * 0.42
    : 0;
  return Math.max(getEntityVisibilityOpacity(entity), ancestorOpacity);
}

function getEntityFocusRootPosition(entity, out) {
  if (shouldUseSelectedPortalFocus(entity)) {
    return getBandAnchor(getBandByKey(entity.portalTargetBand), out);
  }
  const contextualSystem = getContextualSystemEntity(entity);
  if (
    contextualSystem &&
    zoomLevel > SYSTEM_ZOOM_FLOOR &&
    zoomLevel < getBandByKey("stellar").center - 0.18
  ) {
    return getBandAnchor(getBandByKey("system"), out);
  }
  if (isMoonInspectionEntity(entity) && entity === selectedEntity && getPlanetInspectionReveal(entity) > 0.08) {
    return out.copy(inspectionAnchor);
  }
  if (shouldUseInspectionFocus(entity)) {
    return out.copy(inspectionAnchor);
  }
  return getEntityRootLocalPosition(entity, out);
}

function shouldUseSelectedPortalFocus(entity = selectedEntity) {
  if (
    entity !== selectedEntity ||
    !entity?.portalTargetBand ||
    isLaniakeaNestedPortal(entity) ||
    getSelectedPortalDepth() <= 0.12
  ) {
    return false;
  }
  const targetBand = getBandByKey(entity.portalTargetBand);
  return getLayerOpacity(targetBand.center, targetBand.width) > 0.08;
}

function isDescendantOf(object, ancestor) {
  let current = object;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isCloseInspectionActive() {
  return Boolean(selectedEntity?.bodyDetail && getPlanetInspectionReveal(selectedEntity) > 0.32);
}

function shouldPauseInspectionMotion(object, closeInspectionActive = isCloseInspectionActive()) {
  if (!closeInspectionActive || !selectedEntity?.bodyDetail) {
    return false;
  }
  return (
    object === planetDetailBody ||
    object === planetDetailClouds ||
    object.parent === planetDetailCloudVolume ||
    object === planetDetailEarthCloudBands ||
    object.parent === planetDetailEarthCloudBands ||
    object === planetDetailAtmosphere ||
    object === planetDetailRingSystem ||
    object.parent === planetDetailMoonsGroup ||
    isDescendantOf(object, selectedEntity.object)
  );
}

function isObjectEffectivelyVisible(object) {
  let current = object;
  while (current) {
    if (current.visible === false) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

function suppressSelectedMoonSourceObject(elapsed) {
  if (!isMoonInspectionEntity(selectedEntity) || selectedEntity.detailOnly) {
    return;
  }
  const reveal = getPlanetInspectionReveal(selectedEntity);
  if (reveal <= 0.01) {
    return;
  }
  const sourceOpacity = 1 - smoothstep(0.02, 0.18, reveal);
  setObjectOpacity(selectedEntity.object, sourceOpacity, elapsed);
}

function isEntityInteractable(entity, minOpacity = 0.16) {
  if (!entity?.hitTarget) {
    return false;
  }
  if (isLaniakeaNestedEntity(entity) && !isLaniakeaDescendantSelectionOpen(entity)) {
    return false;
  }
  if (isSelectedParentOccludingInspection(entity)) {
    return false;
  }
  if (!isObjectEffectivelyVisible(entity.hitTarget)) {
    return false;
  }
  const opacity = getEntityInteractableOpacity(entity);
  if (opacity < minOpacity) {
    return false;
  }
  const band = getBandByKey(entity.band);
  const activeBand = getActiveBand();
  const bandSeparation = Math.abs(activeBand.center - band.center);
  return bandSeparation < 1.45 || opacity > 0.45;
}

function isLaniakeaNestedEntity(entity) {
  if (entity?.band !== "laniakea" || !entity.parentId) {
    return false;
  }
  const parent = getEntityParent(entity);
  return parent?.band === "laniakea" && parent.id !== "laniakea";
}

function isLaniakeaDescendantSelectionOpen(entity) {
  return getSelectedLaniakeaAncestorDepth(entity) > 0.035;
}

function getSelectedLaniakeaAncestorDepth(entity) {
  return isLaniakeaNestedEntity(entity) ? getSelectedBranchAncestorDepth(entity) : 0;
}

function getSelectedBranchAncestorDepth(entity) {
  if (
    !entity?.parentId ||
    !selectedEntity ||
    entity === selectedEntity ||
    entity.band !== selectedEntity.band ||
    !PARENT_OCCLUSION_BANDS.has(selectedEntity.band) ||
    isInspectableStarEntity(selectedEntity)
  ) {
    return 0;
  }
  const depth = selectedEntity.bodyDetail
    ? getPlanetInspectionReveal(selectedEntity)
    : getSelectedInspectionDepth(selectedEntity);
  if (depth <= 0) {
    return 0;
  }
  return getEntityLineage(entity).includes(selectedEntity) ? depth : 0;
}

function isSelectedParentOccludingInspection(entity) {
  return (
    entity === selectedEntity &&
    PARENT_OCCLUSION_BANDS.has(entity?.band) &&
    getEntityChildren(entity, 1).length > 0 &&
    (entity.bodyDetail ? getPlanetInspectionReveal(entity) : getSelectedInspectionDepth(entity)) > 0.035
  );
}

function getSelectionZoom(entity) {
  const band = getBandByKey(entity.band);
  const radius = entity.hitRadius ?? entity.radius ?? 1;
  if (entity.family === "sky-figure") {
    return getBandByKey("stellar").center - 0.04;
  }
  if (
    entity.band === "laniakea" &&
    (isLaniakeaNestedEntity(entity) || isInspectableCompositeEntity(entity) || entity.portalTargetBand === "cluster")
  ) {
    return LANIAKEA_NESTED_VIEW_ZOOM;
  }
  if (isObservatoryTarget(entity)) {
    const floor = getEffectiveInnerZoomFloor(entity);
    if (Number.isFinite(floor)) {
      return THREE.MathUtils.clamp(floor + 0.16, 0, MAX_ZOOM);
    }
  }
  const isStellarInspection =
    entity.band === "stellar" &&
    (entity.type?.includes("Exoplanet") ||
      entity.type === "Super Earth" ||
      entity.type === "Hot Jupiter" ||
      entity.type === "Exoplanet System" ||
      entity.type?.includes("Star") ||
      entity.type?.includes("Pillars") ||
      entity.type === "Open Cluster" ||
      entity.type === "Globular Cluster");
  const isExoplanetSystemInspection =
    entity.band === "stellar" &&
    (entity.type === "Exoplanet System" || entity.hostSystemId);
  const defaultBuffer = {
    planet: 0.08,
    system: entity.bodyDetail ? 0.18 : 0.08,
    stellar: isExoplanetSystemInspection ? 0.78 : isStellarInspection ? 0.34 : 0.12,
    galaxy: 0.07,
    cluster: 0.08,
    web: 0.06,
  }[entity.band] ?? 0.07;
  const objectBuffer = isStellarInspection
    ? THREE.MathUtils.clamp(radius / 180, 0.004, 0.035)
    : THREE.MathUtils.clamp(radius / 92, 0.01, 0.09);
  return THREE.MathUtils.clamp(band.center - defaultBuffer + objectBuffer, 0, MAX_ZOOM);
}

function getZoomFloor() {
  if (selectedEntity?.bodyDetail) {
    return selectedEntity.innerZoomFloor ?? 0;
  }
  const effectiveFloor = getEffectiveInnerZoomFloor(selectedEntity);
  if (Number.isFinite(effectiveFloor)) {
    return effectiveFloor;
  }
  if (selectedEntity) {
    return getSelectionZoom(selectedEntity);
  }
  return SYSTEM_ZOOM_FLOOR;
}

function triggerTravelPulse(amount = 1) {
  travelPulse = Math.max(travelPulse, amount);
  if (amount <= 0.04) {
    return;
  }
  shuttleTravelActive = true;
  shuttleTravelElapsed = 0;
  shuttleTravelStrength = Math.max(shuttleTravelStrength, amount);
  shuttleTravelDuration = THREE.MathUtils.clamp(1.15 + amount * 1.08, 1.25, 3.1);
}

function getTraversalPulseAmount(previousEntity, nextEntity) {
  if (!previousEntity || !nextEntity) {
    return 0.98;
  }
  if (previousEntity === nextEntity) {
    return 0;
  }
  const previousBand = getBandByKey(previousEntity.band);
  const nextBand = getBandByKey(nextEntity.band);
  const bandDistance = Math.abs(previousBand.center - nextBand.center);
  if (previousEntity.parentId === nextEntity.id || nextEntity.parentId === previousEntity.id) {
    return 0.72 + bandDistance * 0.12;
  }
  if (previousEntity.parentId && previousEntity.parentId === nextEntity.parentId) {
    return 0.52 + bandDistance * 0.08;
  }
  return THREE.MathUtils.clamp(0.82 + bandDistance * 0.22, 0.72, 1.45);
}

function getContextualNavigationEntity(bandKey) {
  if (!selectedEntity) {
    return null;
  }
  if (bandKey === "planet") {
    return getDefaultPlanetTarget();
  }
  if (bandKey === "system") {
    const contextualSystem = getContextualSystemEntity();
    if (contextualSystem) {
      return contextualSystem;
    }
    const lineage = getEntityLineage(selectedEntity);
    return (
      lineage.find((entity) => entity.band === "system" && !entity.bodyDetail) ??
      lineage.find((entity) => entity.band === "system") ??
      null
    );
  }
  if (bandKey === "laniakea" && selectedEntity.band !== "web") {
    return getEntityById("great-attractor");
  }
  const lineage = getEntityLineage(selectedEntity);
  return (
    lineage.find((entity) => entity.portalTargetBand === bandKey) ??
    lineage.find((entity) => entity.band === bandKey && !entity.bodyDetail) ??
    lineage.find((entity) => entity.band === bandKey) ??
    null
  );
}

function getBandNavigationEntity(bandKey) {
  const contextualEntity = getContextualNavigationEntity(bandKey);
  if (contextualEntity) {
    return contextualEntity;
  }
  if (bandKey === "planet") {
    return getDefaultPlanetTarget();
  }
  if (bandKey === "system") {
    return getContextualSystemEntity() ?? getEntityById("solar-system-portal");
  }
  const anchors = {
    stellar: "solar-system-portal",
    galaxy: "milky-way-galaxy",
    cluster: "local-group-web",
    laniakea: "great-attractor",
    web: null,
  };
  return anchors[bandKey] ? getEntityById(anchors[bandKey]) : null;
}

function navigateToBand(bandKey) {
  const band = getBandByKey(bandKey);
  if (!band) {
    return;
  }
  const previousEntity = selectedEntity;
  const anchorEntity = getBandNavigationEntity(band.key);
  selectEntity(anchorEntity, false);
  updateHoverHint(null);
  targetZoom = band.center;
  clampTargetZoom();
  triggerTravelPulse(anchorEntity ? getTraversalPulseAmount(previousEntity, anchorEntity) : 1.1);
}

function getEntityWorkbenchStats(entity) {
  const workbench = entity?.visualWorkbench;
  if (!workbench) {
    return [];
  }
  const layers = Array.isArray(workbench.layers)
    ? workbench.layers.slice(0, 3).join(" + ")
    : "";
  const tags = Array.isArray(workbench.tags)
    ? workbench.tags.slice(0, 3).join(" + ")
    : "";
  return [
    workbench.archetype ? { value: workbench.archetype, label: "workbench" } : null,
    workbench.source ? { value: workbench.source, label: "source" } : null,
    layers ? { value: layers, label: "layers" } : null,
    tags ? { value: tags, label: "grammar" } : null,
  ].filter(Boolean);
}

function renderEntityStats(entity) {
  infoStats.replaceChildren();
  const children = getEntityChildren(entity);
  const stats = entity
    ? [
        ...(entity.stats ?? []),
        ...getEntityWorkbenchStats(entity),
        ...(children.length > 0 ? [{ value: `${children.length}`, label: "children" }] : []),
        ...(entity.family ? [{ value: formatEntityFamily(entity.family), label: "visual family" }] : []),
        ...(entity.dataStatus ? [{ value: entity.dataStatus, label: "data status" }] : []),
      ]
    : [];
  for (const stat of stats) {
    const item = document.createElement("div");
    const value = document.createElement("span");
    const label = document.createElement("span");
    value.textContent = formatDisplayText(stat.value);
    label.textContent = stat.label;
    item.append(value, label);
    infoStats.appendChild(item);
  }
  infoStats.classList.toggle("is-visible", stats.length > 0);
}

function renderEntityAddress(entity) {
  const address = getEntityAddress(entity);
  infoAddress.textContent = address.length ? address.join(" > ") : "";
  infoAddress.classList.toggle("is-visible", address.length > 0);
}

function renderAddressRail(entity) {
  addressRail.replaceChildren();
  const chain = getEntityGraphChain(entity);
  if (!entity || chain.length < 2) {
    addressRail.classList.remove("is-visible");
    return;
  }

  for (const [index, segment] of chain.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.entityId = segment.id;
    button.dataset.family = segment.family ?? "";
    button.classList.toggle("is-current", segment === entity);
    button.textContent = segment.name;
    addressRail.appendChild(button);
    if (index < chain.length - 1) {
      const separator = document.createElement("span");
      separator.textContent = ">";
      addressRail.appendChild(separator);
    }
  }

  addressRail.classList.add("is-visible");
}

function createRelationButton(entity, labelPrefix = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.entityId = entity.id;
  button.textContent = `${formatDisplayText(labelPrefix)}${entity.name}`;
  return button;
}

function renderEntityRelations(entity) {
  infoRelations.replaceChildren();
  if (!entity) {
    infoRelations.classList.remove("is-visible");
    return;
  }

  const parent = getEntityParent(entity);
  const children = getEntityChildren(entity, 10);
  if (!parent && children.length === 0) {
    infoRelations.classList.remove("is-visible");
    return;
  }

  if (parent) {
    const row = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = "Parent";
    row.append(label, createRelationButton(parent));
    infoRelations.appendChild(row);
  }

  if (children.length > 0) {
    const row = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = "Children";
    const list = document.createElement("div");
    list.className = "object-panel__relation-list";
    for (const child of children) {
      list.appendChild(createRelationButton(child, child.relation ? `${child.relation}: ` : ""));
    }
    if ((entity.childIds?.length ?? 0) > children.length) {
      const remainder = document.createElement("em");
      remainder.textContent = `+${entity.childIds.length - children.length} more`;
      list.appendChild(remainder);
    }
    row.append(label, list);
    infoRelations.appendChild(row);
  }

  infoRelations.classList.add("is-visible");
}

function normalizeSearchValue(value) {
  return `${value ?? ""}`.trim().toLowerCase().replace(/\s+/g, " ");
}

function getEntitySearchText(entity) {
  return normalizeSearchValue([
    entity.name,
    entity.id,
    entity.type,
    entity.band,
    entity.meta,
    getEntityAddress(entity).join(" "),
  ].filter(Boolean).join(" "));
}

function getSearchScore(entity, queryParts) {
  const name = normalizeSearchValue(entity.name);
  const id = normalizeSearchValue(entity.id);
  const type = normalizeSearchValue(entity.type);
  const haystack = getEntitySearchText(entity);
  let score = 0;
  for (const part of queryParts) {
    if (!haystack.includes(part)) {
      return -1;
    }
    if (name === part || id === part) {
      score += 90;
    } else if (name.startsWith(part) || id.startsWith(part)) {
      score += 52;
    } else if (name.includes(part)) {
      score += 34;
    } else if (type.includes(part)) {
      score += 16;
    } else {
      score += 7;
    }
  }
  const activeBand = getActiveBand();
  if (entity.band === activeBand.key) {
    score += 8;
  }
  if (entity === selectedEntity) {
    score += 5;
  }
  return score + entity.priority * 0.4;
}

function getSearchMatches(query) {
  const normalized = normalizeSearchValue(query);
  if (normalized.length < 2) {
    return [];
  }
  const parts = normalized.split(" ").filter(Boolean);
  return selectableEntities
    .map((entity) => ({ entity, score: getSearchScore(entity, parts) }))
    .filter((match) => match.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
    .map((match) => match.entity);
}

function hideSearchResults() {
  searchResults.replaceChildren();
  searchPanel.classList.remove("is-open");
}

function travelToSearchEntity(entity) {
  if (!entity) {
    return;
  }
  const previousEntity = selectedEntity;
  searchSuppressedTransientEntityId = entity.family === "comet" ? entity.id : null;
  selectEntity(entity, false);
  if (entity.family !== "comet") {
    targetZoom = getSelectionZoom(entity);
    clampTargetZoom();
    triggerTravelPulse(THREE.MathUtils.clamp(getTraversalPulseAmount(previousEntity, entity) * 0.82 + 0.22, 0.78, 1.22));
  }
  searchInput.value = entity.name;
  hideSearchResults();
  searchInput.blur();
  updateHoverHint(null);
}

function renderSearchResults() {
  searchResults.replaceChildren();
  const matches = getSearchMatches(searchInput.value);
  if (matches.length === 0) {
    searchPanel.classList.remove("is-open");
    return;
  }
  for (const entity of matches) {
    const button = document.createElement("button");
    const title = document.createElement("span");
    const meta = document.createElement("span");
    button.type = "button";
    button.dataset.entityId = entity.id;
    button.dataset.family = entity.family ?? "";
    title.textContent = entity.name;
    meta.textContent = `${entity.type} | ${getBandByKey(entity.band).title}`;
    button.append(title, meta);
    searchResults.appendChild(button);
  }
  searchPanel.classList.add("is-open");
}

searchPanel.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

searchPanel.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-entity-id]");
  if (!button) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  travelToSearchEntity(getEntityById(button.dataset.entityId));
});

searchInput.addEventListener("input", renderSearchResults);

searchInput.addEventListener("focus", renderSearchResults);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchInput.value = "";
    hideSearchResults();
    searchInput.blur();
    return;
  }
  if (event.key !== "Enter") {
    return;
  }
  const [firstMatch] = getSearchMatches(searchInput.value);
  if (!firstMatch) {
    return;
  }
  event.preventDefault();
  travelToSearchEntity(firstMatch);
});

infoRelations.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

infoRelations.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-entity-id]");
  if (!button) {
    return;
  }
  const entity = getEntityById(button.dataset.entityId);
  if (!entity) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  selectEntity(entity);
  updateHoverHint(null);
});

addressRail.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  event.stopPropagation();
});

function getAddressRailTargetZoom(entity, previousEntity) {
  const isAncestor = getEntityLineage(previousEntity).includes(entity);
  if (isAncestor && entity.portalTargetBand) {
    return getBandByKey(entity.portalTargetBand).center;
  }
  return getSelectionZoom(entity);
}

addressRail.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-entity-id]");
  if (!button) {
    return;
  }
  const entity = getEntityById(button.dataset.entityId);
  if (!entity) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  const previousEntity = selectedEntity;
  selectEntity(entity, false);
  targetZoom = getAddressRailTargetZoom(entity, previousEntity);
  clampTargetZoom();
  if (previousEntity !== entity) {
    triggerTravelPulse(getTraversalPulseAmount(previousEntity, entity));
  }
  updateHoverHint(null);
});

function selectEntity(entity, travelToSelection = true) {
  const previousEntity = selectedEntity;
  if (travelToSelection || entity?.id !== searchSuppressedTransientEntityId) {
    searchSuppressedTransientEntityId = null;
  }
  selectedEntity = entity;
  if (entity?.family === "sky-figure" && !skyFiguresVisible) {
    setSkyFiguresVisible(true);
  }
  if (entity) {
    infoKicker.textContent = entity.type;
    infoTitle.textContent = entity.name;
    infoMeta.textContent = entity.meta;
    infoSummary.textContent = entity.summary;
    renderEntityAddress(entity);
    renderEntityStats(entity);
    renderEntityRelations(entity);
    renderAddressRail(entity);
    if (travelToSelection) {
      targetZoom = getSelectionZoom(entity);
      clampTargetZoom();
      if (previousEntity !== entity) {
        triggerTravelPulse(getTraversalPulseAmount(previousEntity, entity));
      }
    }
  } else {
    renderEntityAddress(null);
    renderEntityStats(null);
    renderEntityRelations(null);
    renderAddressRail(null);
    clampTargetZoom();
    if (previousEntity) {
      triggerTravelPulse(0.45);
    }
  }
  infoPanel.classList.toggle("is-visible", Boolean(entity));
}

function updateHoverHint(entity) {
  hoveredEntity = entity && entity !== selectedEntity ? entity : null;
  hoverHint.textContent = hoveredEntity ? hoveredEntity.name : "";
  hoverHint.classList.toggle("is-visible", Boolean(hoveredEntity));
}

function findNearestVisibleEntity(clientX, clientY, maxDistancePx = 58) {
  let best = null;

  for (const entity of selectableEntities) {
    if (!isEntityInteractable(entity, 0.16)) {
      continue;
    }

    const opacity = getEntityInteractableOpacity(entity);
    entity.object.getWorldPosition(tmpVector);
    const projected = tmpVector.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) {
      continue;
    }

    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    const distance = Math.hypot(clientX - x, clientY - y);
    const score = distance - entity.priority * 3.5 - opacity * 10;
    if (distance <= maxDistancePx && (!best || score < best.score)) {
      best = { entity, score };
    }
  }

  return best?.entity ?? null;
}

function pickEntity(clientX, clientY, commit = false) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointerNdc, camera);
  const pickableEntities = selectableEntities.filter((entity) =>
    isEntityInteractable(entity, commit ? 0.1 : 0.16)
  );
  const hitObjects = pickableEntities.map((entity) => entity.hitTarget);
  const hits = raycaster.intersectObjects(hitObjects, true);

  if (hits.length === 0) {
    const suggestion = !commit ? findNearestVisibleEntity(clientX, clientY) : null;
    if (commit) selectEntity(null);
    else updateHoverHint(suggestion);
    return null;
  }

  const scoredHits = hits
    .map((hit) => {
      const entity = findSelectableFromObject(hit.object);
      const bandDistance = entity ? Math.abs(zoomLevel - getBandByKey(entity.band).center) : 9;
      const opacity = entity ? getEntityInteractableOpacity(entity) : 0;
      const score = hit.distance - (entity?.priority ?? 1) * 2.8 + bandDistance * 12 - opacity * 12;
      return { hit, entity, score };
    })
    .filter((entry) => entry.entity && isEntityInteractable(entry.entity, commit ? 0.1 : 0.16))
    .sort((left, right) => left.score - right.score);

  const entity = scoredHits[0]?.entity ?? null;
  if (commit) selectEntity(entity);
  else updateHoverHint(entity);
  return entity;
}

function randomOnSphere(radius) {
  const theta = random() * Math.PI * 2;
  const z = random() * 2 - 1;
  const xy = Math.sqrt(1 - z * z);
  return tmpVector.set(
    Math.cos(theta) * xy * radius,
    Math.sin(theta) * xy * radius,
    z * radius
  );
}

function finishCanvasTexture(canvas, pixelated = false) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (pixelated) {
    texture.magFilter = THREE.NearestFilter;
  }
  return texture;
}

function createPlanetTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const context = canvas.getContext("2d");
  const localRandom = seededRandom(9127);
  const pixel = 4;
  const snap = (value) => Math.round(value / pixel) * pixel;
  const geoPoint = (longitude, latitude) => [
    snap(((longitude + 180) / 360) * canvas.width),
    snap(((90 - latitude) / 180) * canvas.height),
  ];

  context.imageSmoothingEnabled = false;

  const ocean = context.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, "#0a3a76");
  ocean.addColorStop(0.24, "#126dad");
  ocean.addColorStop(0.54, "#0d73b8");
  ocean.addColorStop(0.78, "#0a4f91");
  ocean.addColorStop(1, "#071d55");
  context.fillStyle = ocean;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += pixel) {
    const latitude = 90 - (y / canvas.height) * 180;
    const bandShade = Math.sin((latitude / 180) * Math.PI) * 0.05;
    for (let x = 0; x < canvas.width; x += pixel) {
      if (localRandom() < 0.42) {
        context.fillStyle = localRandom() < 0.55
          ? `rgba(86, 176, 216, ${0.025 + Math.abs(bandShade)})`
          : `rgba(4, 24, 84, ${0.03 + localRandom() * 0.055})`;
        context.fillRect(x, y, pixel, pixel);
      }
    }
  }

  const drawGeoPolygon = (points, fillStyle, strokeStyle = "rgba(239, 229, 164, 0.18)") => {
    const mapped = points.map(([longitude, latitude]) => geoPoint(longitude, latitude));
    context.beginPath();
    for (const [index, point] of mapped.entries()) {
      const [x, y] = point;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.fillStyle = fillStyle;
    context.fill();
    context.strokeStyle = strokeStyle;
    context.lineWidth = 2;
    context.stroke();
  };

  drawGeoPolygon(
    [[-168, 72], [-142, 70], [-124, 56], [-111, 58], [-96, 52], [-82, 48], [-66, 48], [-54, 42], [-63, 31], [-79, 25], [-88, 18], [-104, 20], [-116, 32], [-126, 42], [-145, 55], [-168, 60]],
    "rgba(49, 132, 72, 0.96)"
  );
  drawGeoPolygon(
    [[-156, 22], [-134, 26], [-112, 25], [-96, 19], [-82, 12], [-76, 8], [-84, 9], [-96, 14], [-112, 18], [-132, 19], [-152, 18]],
    "rgba(58, 145, 77, 0.94)"
  );
  drawGeoPolygon(
    [[-82, 12], [-70, 9], [-58, -4], [-50, -16], [-46, -25], [-56, -44], [-67, -56], [-74, -42], [-78, -24], [-82, -8]],
    "rgba(67, 143, 80, 0.96)"
  );
  drawGeoPolygon(
    [[-54, 82], [-28, 76], [-22, 68], [-38, 60], [-58, 62], [-72, 70]],
    "rgba(207, 232, 218, 0.94)",
    "rgba(248, 252, 244, 0.35)"
  );
  drawGeoPolygon(
    [[-12, 36], [8, 50], [32, 57], [58, 57], [82, 62], [112, 56], [136, 52], [162, 58], [176, 45], [144, 34], [120, 24], [102, 10], [82, 8], [70, 24], [48, 30], [32, 18], [16, 34], [0, 38]],
    "rgba(74, 143, 82, 0.96)"
  );
  drawGeoPolygon(
    [[30, 31], [46, 27], [57, 18], [54, 8], [42, 12], [35, 22]],
    "rgba(180, 142, 76, 0.9)"
  );
  drawGeoPolygon(
    [[68, 24], [88, 22], [90, 12], [80, 6], [72, 8], [66, 18]],
    "rgba(78, 136, 72, 0.94)"
  );
  drawGeoPolygon(
    [[100, 22], [118, 20], [126, 12], [116, 6], [104, 8], [98, 15]],
    "rgba(55, 137, 78, 0.94)"
  );
  drawGeoPolygon(
    [[-17, 35], [4, 37], [31, 30], [43, 12], [42, -8], [32, -30], [18, -35], [8, -24], [-6, -10], [-16, 8]],
    "rgba(91, 139, 75, 0.96)"
  );
  drawGeoPolygon(
    [[112, -11], [154, -10], [154, -32], [132, -42], [114, -31]],
    "rgba(143, 122, 72, 0.96)"
  );
  drawGeoPolygon(
    [[-180, -68], [-142, -62], [-92, -66], [-38, -63], [16, -68], [72, -64], [128, -67], [180, -62], [180, -90], [-180, -90]],
    "rgba(231, 242, 234, 0.82)",
    "rgba(255, 255, 255, 0.18)"
  );

  const deserts = [
    [[-15, 32], [12, 33], [34, 25], [34, 15], [8, 18], [-10, 24]],
    [[42, 30], [58, 24], [54, 13], [40, 18]],
    [[118, -18], [144, -20], [138, -31], [118, -29]],
    [[68, 45], [92, 44], [96, 36], [70, 34]],
  ];
  for (const desert of deserts) {
    drawGeoPolygon(desert, "rgba(196, 156, 84, 0.58)", "rgba(255, 226, 140, 0.12)");
  }

  const drawGeoLine = (points, strokeStyle, width = 3) => {
    context.beginPath();
    for (const [index, point] of points.map(([longitude, latitude]) => geoPoint(longitude, latitude)).entries()) {
      if (index === 0) context.moveTo(point[0], point[1]);
      else context.lineTo(point[0], point[1]);
    }
    context.strokeStyle = strokeStyle;
    context.lineWidth = width;
    context.stroke();
  };
  drawGeoLine([[-72, 8], [-74, -8], [-72, -24], [-70, -40], [-67, -54]], "rgba(102, 86, 62, 0.48)", 3);
  drawGeoLine([[-124, 52], [-116, 40], [-108, 32], [-104, 22]], "rgba(82, 86, 64, 0.32)", 3);
  drawGeoLine([[68, 33], [82, 31], [94, 29], [104, 28]], "rgba(238, 236, 211, 0.5)", 4);

  context.fillStyle = "rgba(247, 252, 246, 0.78)";
  context.fillRect(0, 0, canvas.width, 18);
  context.fillStyle = "rgba(247, 252, 246, 0.64)";
  context.fillRect(0, canvas.height - 22, canvas.width, 22);

  for (let i = 0; i < 190; i += 1) {
    const x = snap(localRandom() * canvas.width);
    const y = snap(canvas.height * (0.12 + localRandom() * 0.76));
    const size = pixel * (1 + Math.floor(localRandom() * 3));
    context.fillStyle = localRandom() < 0.58
      ? "rgba(36, 122, 86, 0.16)"
      : "rgba(225, 196, 118, 0.12)";
    context.fillRect(x, y, size, pixel);
  }

  context.strokeStyle = "rgba(202, 238, 255, 0.12)";
  context.lineWidth = 2;
  for (let i = 0; i < 32; i += 1) {
    const y = snap(canvas.height * (0.12 + localRandom() * 0.76));
    const startX = snap(-40 + localRandom() * canvas.width * 0.62);
    const length = snap(canvas.width * (0.16 + localRandom() * 0.38));
    context.beginPath();
    context.moveTo(startX, y);
    for (let x = startX; x <= startX + length; x += pixel * 3) {
      context.lineTo(x, snap(y + Math.sin(x * 0.018 + i) * (4 + localRandom() * 8)));
    }
    context.stroke();
  }

  return finishCanvasTexture(canvas, true);
}

function createCloudTexture(id = "earth") {
  if (cloudTextureCache.has(id)) {
    return cloudTextureCache.get(id);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 29, 7041)
  );
  context.clearRect(0, 0, canvas.width, canvas.height);
  const isVenus = id === "venus";
  context.strokeStyle = isVenus ? "rgba(255, 238, 188, 0.42)" : "rgba(255, 255, 255, 0.26)";
  context.lineWidth = isVenus ? 7 : 2.4;
  for (let i = 0; i < (isVenus ? 42 : 30); i += 1) {
    const y = localRandom() * canvas.height;
    const startX = isVenus ? -40 : -60 + localRandom() * canvas.width * 0.86;
    const endX = isVenus ? canvas.width + 40 : startX + canvas.width * (0.18 + localRandom() * 0.42);
    context.beginPath();
    for (let x = startX; x <= endX; x += 42) {
      const wave =
        Math.sin(x * (isVenus ? 0.014 : 0.018) + i * 0.64) * (isVenus ? 10 : 4) +
        Math.sin(x * 0.037 + i * 1.2) * (isVenus ? 4 : 1.6);
      if (x === startX) context.moveTo(x, y + wave);
      else context.lineTo(x, y + wave);
    }
    context.stroke();
  }
  if (!isVenus) {
    context.fillStyle = "rgba(255, 255, 255, 0.14)";
    for (let i = 0; i < 36; i += 1) {
      context.beginPath();
      context.ellipse(
        localRandom() * canvas.width,
        canvas.height * (0.16 + localRandom() * 0.68),
        12 + localRandom() * 82,
        3 + localRandom() * 15,
        (localRandom() - 0.5) * 0.8,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  }
  const texture = finishCanvasTexture(canvas, !isVenus);
  cloudTextureCache.set(id, texture);
  return texture;
}

function createBodyTexture(id, color = 0xffffff, type = "Planet") {
  if (id === "earth") {
    return planetDetailTexture;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 384;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const baseColor = new THREE.Color(color);
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 11, 0)
  );
  const base = `#${baseColor.getHexString()}`;
  context.fillStyle = base;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (type === "Star") {
    const gradient = context.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.5,
      12,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.58
    );
    gradient.addColorStop(0, "rgba(255, 255, 230, 1)");
    gradient.addColorStop(0.45, "rgba(255, 204, 92, 0.92)");
    gradient.addColorStop(1, "rgba(238, 100, 32, 0.74)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(255, 248, 180, 0.35)";
    context.lineWidth = 3;
    for (let i = 0; i < 36; i += 1) {
      const y = localRandom() * canvas.height;
      context.beginPath();
      for (let x = 0; x <= canvas.width; x += 42) {
        const wave = Math.sin(x * 0.02 + i * 0.7) * (7 + localRandom() * 10);
        if (x === 0) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.stroke();
    }
  } else if (id === "venus") {
    const cloud = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    cloud.addColorStop(0, "rgba(255, 239, 183, 0.95)");
    cloud.addColorStop(0.5, "rgba(224, 170, 93, 0.9)");
    cloud.addColorStop(1, "rgba(255, 232, 176, 0.92)");
    context.fillStyle = cloud;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(255, 255, 230, 0.24)";
    context.lineWidth = 8;
    for (let i = 0; i < 28; i += 1) {
      const y = localRandom() * canvas.height;
      context.beginPath();
      for (let x = 0; x <= canvas.width; x += 52) {
        const wave = Math.sin(x * 0.016 + i * 0.8) * (12 + localRandom() * 18);
        if (x === 0) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.stroke();
    }
  } else if (type === "Hot Jupiter") {
    const bands = 16;
    for (let i = 0; i < bands; i += 1) {
      const y = (i / bands) * canvas.height;
      const height = canvas.height / bands + 5;
      reusableColor.copy(baseColor).offsetHSL(
        (localRandom() - 0.5) * 0.035,
        0.04 + localRandom() * 0.08,
        (localRandom() - 0.5) * 0.18
      );
      context.fillStyle = `rgba(${Math.floor(reusableColor.r * 255)}, ${Math.floor(reusableColor.g * 255)}, ${Math.floor(reusableColor.b * 255)}, ${0.72 + localRandom() * 0.22})`;
      context.fillRect(0, y, canvas.width, height);
    }
    context.strokeStyle = "rgba(255, 244, 190, 0.22)";
    context.lineWidth = 3;
    for (let i = 0; i < 22; i += 1) {
      const y = localRandom() * canvas.height;
      context.beginPath();
      for (let x = 0; x <= canvas.width; x += 34) {
        const wave = Math.sin(x * 0.026 + i) * (3 + localRandom() * 5);
        if (x === 0) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.stroke();
    }
    for (let i = 0; i < 3; i += 1) {
      reusableColor.copy(baseColor).offsetHSL(0.04 + localRandom() * 0.04, 0.2, -0.04 + localRandom() * 0.08);
      context.fillStyle = `rgba(${Math.floor(reusableColor.r * 255)}, ${Math.floor(reusableColor.g * 255)}, ${Math.floor(reusableColor.b * 255)}, 0.32)`;
      context.beginPath();
      context.ellipse(
        canvas.width * (0.22 + localRandom() * 0.58),
        canvas.height * (0.3 + localRandom() * 0.42),
        24 + localRandom() * 34,
        8 + localRandom() * 12,
        (localRandom() - 0.5) * 0.4,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  } else if (type.includes("Exoplanet") || type === "Super Earth") {
    const temperate =
      id.includes("-e") ||
      id.includes("-f") ||
      id.includes("kepler-186-f") ||
      id.includes("proxima-centauri-b");
    reusableColor.copy(baseColor).offsetHSL(0, temperate ? -0.08 : -0.03, temperate ? -0.04 : -0.02);
    context.fillStyle = `#${reusableColor.getHexString()}`;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 56; i += 1) {
      reusableColor.copy(baseColor).offsetHSL(
        (localRandom() - 0.5) * 0.08,
        temperate ? (localRandom() - 0.5) * 0.12 : 0.04 + localRandom() * 0.16,
        (localRandom() - 0.5) * 0.28
      );
      context.fillStyle = `rgba(${Math.floor(reusableColor.r * 255)}, ${Math.floor(reusableColor.g * 255)}, ${Math.floor(reusableColor.b * 255)}, ${0.1 + localRandom() * 0.2})`;
      context.beginPath();
      context.ellipse(
        localRandom() * canvas.width,
        canvas.height * (0.08 + localRandom() * 0.84),
        18 + localRandom() * 110,
        8 + localRandom() * 42,
        localRandom() * Math.PI,
        0,
        Math.PI * 2
      );
      context.fill();
    }
    if (temperate) {
      context.strokeStyle = "rgba(210, 250, 255, 0.22)";
      context.lineWidth = 3;
      for (let i = 0; i < 14; i += 1) {
        const y = canvas.height * (0.16 + localRandom() * 0.68);
        context.beginPath();
        for (let x = 0; x <= canvas.width; x += 54) {
          const wave = Math.sin(x * 0.018 + i * 0.55) * (4 + localRandom() * 8);
          if (x === 0) context.moveTo(x, y + wave);
          else context.lineTo(x, y + wave);
        }
        context.stroke();
      }
    }
  } else if (id === "jupiter" || id === "saturn") {
    const bands = id === "jupiter" ? 18 : 13;
    for (let i = 0; i < bands; i += 1) {
      const y = (i / bands) * canvas.height;
      const height = canvas.height / bands + 6;
      reusableColor.copy(baseColor).offsetHSL(
        (localRandom() - 0.5) * 0.045,
        (localRandom() - 0.5) * 0.1,
        (localRandom() - 0.5) * 0.2
      );
      context.fillStyle = `rgba(${Math.floor(reusableColor.r * 255)}, ${Math.floor(reusableColor.g * 255)}, ${Math.floor(reusableColor.b * 255)}, ${0.74 + localRandom() * 0.22})`;
      context.fillRect(0, y, canvas.width, height);
    }
    context.strokeStyle = id === "jupiter" ? "rgba(152, 82, 54, 0.36)" : "rgba(244, 231, 184, 0.28)";
    context.lineWidth = 2;
    for (let i = 0; i < 18; i += 1) {
      const y = localRandom() * canvas.height;
      context.beginPath();
      for (let x = 0; x <= canvas.width; x += 36) {
        const wave = Math.sin(x * 0.025 + i) * (2 + localRandom() * 4);
        if (x === 0) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.stroke();
    }
    if (id === "jupiter") {
      context.fillStyle = "rgba(194, 83, 52, 0.82)";
      context.beginPath();
      context.ellipse(canvas.width * 0.68, canvas.height * 0.58, 46, 22, -0.12, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(255, 217, 176, 0.45)";
      context.lineWidth = 3;
      context.stroke();
    }
  } else if (id === "uranus" || id === "neptune") {
    const gas = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gas.addColorStop(0, id === "uranus" ? "rgba(165, 244, 255, 0.95)" : "rgba(90, 138, 255, 0.95)");
    gas.addColorStop(0.52, id === "uranus" ? "rgba(106, 213, 230, 0.94)" : "rgba(28, 72, 186, 0.96)");
    gas.addColorStop(1, id === "uranus" ? "rgba(214, 255, 252, 0.86)" : "rgba(112, 168, 255, 0.9)");
    context.fillStyle = gas;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = id === "neptune" ? "rgba(210, 230, 255, 0.2)" : "rgba(255, 255, 255, 0.14)";
    context.lineWidth = 4;
    for (let i = 0; i < 12; i += 1) {
      const y = localRandom() * canvas.height;
      context.beginPath();
      for (let x = 0; x <= canvas.width; x += 76) {
        const wave = Math.sin(x * 0.012 + i) * (5 + localRandom() * 7);
        if (x === 0) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.stroke();
    }
    if (id === "neptune") {
      context.fillStyle = "rgba(24, 44, 130, 0.44)";
      context.beginPath();
      context.ellipse(canvas.width * 0.62, canvas.height * 0.46, 36, 18, 0.16, 0, Math.PI * 2);
      context.fill();
    }
  } else if (id === "mars") {
    const polar = context.createLinearGradient(0, 0, 0, canvas.height);
    polar.addColorStop(0, "rgba(255, 238, 206, 0.38)");
    polar.addColorStop(0.18, "rgba(255, 238, 206, 0)");
    polar.addColorStop(0.82, "rgba(255, 238, 206, 0)");
    polar.addColorStop(1, "rgba(255, 238, 206, 0.34)");
    context.fillStyle = polar;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 52; i += 1) {
      context.fillStyle = i % 3 === 0 ? "rgba(255, 190, 132, 0.2)" : "rgba(82, 35, 28, 0.18)";
      context.beginPath();
      context.ellipse(
        localRandom() * canvas.width,
        localRandom() * canvas.height,
        18 + localRandom() * 64,
        8 + localRandom() * 24,
        localRandom() * Math.PI,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  } else if (id === "pluto") {
    context.fillStyle = "rgba(255, 242, 214, 0.28)";
    context.beginPath();
    context.ellipse(canvas.width * 0.54, canvas.height * 0.48, 86, 48, 0.18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(82, 47, 42, 0.18)";
    for (let i = 0; i < 24; i += 1) {
      context.beginPath();
      context.ellipse(
        localRandom() * canvas.width,
        localRandom() * canvas.height,
        12 + localRandom() * 46,
        6 + localRandom() * 22,
        localRandom() * Math.PI,
        0,
        Math.PI * 2
      );
      context.fill();
    }
  } else if (id === "moon" || type === "Major Moon" || id === "mercury" || id === "ceres") {
    const isIcyMoon = ["europa", "enceladus", "titania", "oberon", "ariel", "triton"].includes(id);
    const isDarkMoon = ["callisto", "iapetus", "charon", "proteus", "nereid"].includes(id);
    const dusty = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    dusty.addColorStop(0, isIcyMoon ? "rgba(240, 248, 250, 0.95)" : `#${baseColor.getHexString()}`);
    dusty.addColorStop(0.48, isDarkMoon ? "rgba(132, 122, 112, 0.95)" : `#${baseColor.getHexString()}`);
    dusty.addColorStop(1, id === "io" ? "rgba(245, 184, 76, 0.95)" : "rgba(86, 82, 78, 0.55)");
    context.fillStyle = dusty;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (id === "moon") {
      const maria = [
        [0.58, 0.36, 72, 38, 0.12],
        [0.68, 0.48, 58, 26, -0.16],
        [0.44, 0.53, 42, 24, 0.24],
        [0.54, 0.66, 54, 22, -0.28],
      ];
      context.fillStyle = "rgba(76, 84, 88, 0.52)";
      for (const [x, y, rx, ry, rotation] of maria) {
        context.beginPath();
        context.ellipse(canvas.width * x, canvas.height * y, rx, ry, rotation, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "rgba(230, 226, 206, 0.08)";
      for (let i = 0; i < 260; i += 1) {
        const tile = 3 + Math.floor(localRandom() * 3);
        context.fillRect(
          Math.round((localRandom() * canvas.width) / 4) * 4,
          Math.round((localRandom() * canvas.height) / 4) * 4,
          tile,
          tile
        );
      }
      context.strokeStyle = "rgba(245, 246, 232, 0.16)";
      context.lineWidth = 1.2;
      for (let i = 0; i < 18; i += 1) {
        const angle = (i / 18) * Math.PI * 2;
        context.beginPath();
        context.moveTo(canvas.width * 0.28, canvas.height * 0.62);
        context.lineTo(
          canvas.width * 0.28 + Math.cos(angle) * (42 + localRandom() * 120),
          canvas.height * 0.62 + Math.sin(angle) * (16 + localRandom() * 44)
        );
        context.stroke();
      }
      const namedCraters = [
        [0.28, 0.62, 24, 0.95, 28],
        [0.42, 0.47, 14, 0.62, 10],
        [0.53, 0.57, 11, 0.52, 8],
        [0.73, 0.39, 16, 0.58, 7],
        [0.62, 0.72, 18, 0.48, 9],
      ];
      for (const [x, y, r, darkness, rays] of namedCraters) {
        const cx = canvas.width * x;
        const cy = canvas.height * y;
        context.fillStyle = `rgba(18, 20, 22, ${0.12 + darkness * 0.08})`;
        context.beginPath();
        context.ellipse(cx, cy, r, r * 0.82, 0.1, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = `rgba(252, 250, 232, ${0.18 + darkness * 0.18})`;
        context.lineWidth = 1.4;
        context.stroke();
        context.strokeStyle = `rgba(250, 248, 222, ${0.08 + darkness * 0.08})`;
        context.lineWidth = 1;
        for (let ray = 0; ray < rays; ray += 1) {
          const angle = (ray / rays) * Math.PI * 2 + localRandom() * 0.18;
          const length = r * (1.8 + localRandom() * 4.5);
          context.beginPath();
          context.moveTo(cx + Math.cos(angle) * r * 0.8, cy + Math.sin(angle) * r * 0.58);
          context.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length * 0.58);
          context.stroke();
        }
      }
    } else if (id === "io") {
      for (let i = 0; i < 34; i += 1) {
        context.fillStyle = i % 4 === 0 ? "rgba(92, 52, 34, 0.32)" : "rgba(255, 230, 82, 0.28)";
        context.beginPath();
        context.ellipse(
          localRandom() * canvas.width,
          localRandom() * canvas.height,
          10 + localRandom() * 42,
          6 + localRandom() * 22,
          localRandom() * Math.PI,
          0,
          Math.PI * 2
        );
        context.fill();
      }
    } else if (isIcyMoon) {
      context.strokeStyle = id === "europa" ? "rgba(126, 78, 48, 0.36)" : "rgba(86, 140, 160, 0.28)";
      context.lineWidth = id === "europa" ? 2.2 : 1.5;
      for (let i = 0; i < 26; i += 1) {
        const y = localRandom() * canvas.height;
        context.beginPath();
        for (let x = -20; x <= canvas.width + 20; x += 38) {
          const wave = Math.sin(x * 0.02 + i) * (5 + localRandom() * 10);
          if (x === -20) context.moveTo(x, y + wave);
          else context.lineTo(x, y + wave);
        }
        context.stroke();
      }
    } else if (id === "titan") {
      const haze = context.createLinearGradient(0, 0, canvas.width, canvas.height);
      haze.addColorStop(0, "rgba(255, 213, 124, 0.34)");
      haze.addColorStop(1, "rgba(126, 74, 38, 0.22)");
      context.fillStyle = haze;
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else if (isDarkMoon || id === "mercury" || id === "ceres") {
      for (let i = 0; i < 34; i += 1) {
        context.fillStyle = i % 2 === 0 ? "rgba(22, 20, 18, 0.16)" : "rgba(232, 222, 198, 0.1)";
        context.beginPath();
        context.ellipse(
          localRandom() * canvas.width,
          localRandom() * canvas.height,
          14 + localRandom() * 58,
          5 + localRandom() * 26,
          localRandom() * Math.PI,
          0,
          Math.PI * 2
        );
        context.fill();
      }
    }

    const craterCount = id === "mercury" ? 118 : id === "moon" ? 96 : type === "Major Moon" ? 58 : 48;
    for (let i = 0; i < craterCount; i += 1) {
      const r = 2.4 + Math.pow(localRandom(), 1.7) * (id === "moon" ? 24 : 18);
      const x = localRandom() * canvas.width;
      const y = localRandom() * canvas.height;
      const stretch = 0.68 + localRandom() * 0.46;
      context.fillStyle = `rgba(0, 0, 0, ${0.08 + localRandom() * 0.12})`;
      context.beginPath();
      context.ellipse(x, y, r, r * stretch, localRandom() * Math.PI, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `rgba(0, 0, 0, ${0.14 + localRandom() * 0.12})`;
      context.lineWidth = 0.8 + localRandom() * 1.2;
      context.stroke();
      context.strokeStyle = `rgba(255, 255, 245, ${0.08 + localRandom() * 0.14})`;
      context.beginPath();
      context.ellipse(x - r * 0.16, y - r * 0.12, r * 0.82, r * stretch * 0.82, localRandom() * Math.PI, 3.2, 5.9);
      context.stroke();
    }
  } else {
    for (let i = 0; i < 22; i += 1) {
      context.fillStyle = `rgba(255, 255, 255, ${0.035 + localRandom() * 0.08})`;
      context.fillRect(0, localRandom() * canvas.height, canvas.width, 4 + localRandom() * 16);
    }
  }

  return finishCanvasTexture(
    canvas,
    id === "moon" || type === "Major Moon" || id === "mercury" || id === "ceres"
  );
}

function getTextureWorkbenchOptions() {
  return {
    maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
  };
}

function loadSourceTexture(path, colorSpace = THREE.SRGBColorSpace, pixelated = true) {
  const cacheKey = `${path}:${colorSpace}`;
  if (!sourceTextureCache.has(cacheKey)) {
    const texture = sourceTextureLoader.load(path, (loadedTexture) => {
      loadedTexture.needsUpdate = true;
      invalidateRenderCaches();
    });
    texture.colorSpace = colorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    if (pixelated) {
      texture.magFilter = THREE.NearestFilter;
    }
    sourceTextureCache.set(cacheKey, texture);
  }
  return sourceTextureCache.get(cacheKey);
}

function getTextureBodyId(entityOrId) {
  if (entityOrId && typeof entityOrId !== "string" && entityOrId.sourceBodyId) {
    return entityOrId.sourceBodyId;
  }
  const id = typeof entityOrId === "string" ? entityOrId : entityOrId?.id;
  if (!id) {
    return id;
  }
  const indexedEntity = typeof entityOrId === "string" ? getEntityById(id) : null;
  if (indexedEntity?.sourceBodyId) {
    return indexedEntity.sourceBodyId;
  }
  const exoplanetModelPlanet = getExoplanetModelPlanetById(id);
  if (exoplanetModelPlanet) {
    return getExoplanetTextureProfileId(exoplanetModelPlanet);
  }
  if (SOLAR_SYSTEM_SOURCE_TEXTURES[id]) {
    return id;
  }
  if (id.startsWith("detail-")) {
    const sourceIds = Object.keys(SOLAR_SYSTEM_SOURCE_TEXTURES).sort((left, right) => right.length - left.length);
    const sourceId = sourceIds.find((candidate) => id.endsWith(`-${candidate}`));
    if (sourceId) {
      return sourceId;
    }
  }
  return id;
}

function getSourceTextureProfile(entityOrId) {
  return SOLAR_SYSTEM_SOURCE_TEXTURES[getTextureBodyId(entityOrId)] ?? null;
}

function getSourceTexture(entityOrId, role) {
  const path = getSourceTextureProfile(entityOrId)?.[role];
  if (!path) {
    return null;
  }
  return loadSourceTexture(
    path,
    SOURCE_DATA_TEXTURE_ROLES.has(role) ? THREE.NoColorSpace : THREE.SRGBColorSpace,
    true
  );
}

function createWorkbenchPlanetTexture() {
  return getSourceTexture("earth", "color") ?? createPixelEarthTexture(getTextureWorkbenchOptions());
}

function createWorkbenchCloudTexture(entityOrId = "earth") {
  const sourceClouds = getSourceTexture(entityOrId, "clouds");
  if (sourceClouds) {
    return sourceClouds;
  }
  return createPixelCloudTexture(getTextureBodyId(entityOrId), getTextureWorkbenchOptions());
}

function createWorkbenchCloudAlphaTexture(entityOrId = "earth") {
  return getSourceTexture(entityOrId, "cloudAlpha");
}

function getBodyEmissiveTexture(entity) {
  return entity ? getSourceTexture(entity, "lights") : null;
}

function getBodySpecularTexture(entity) {
  return entity ? getSourceTexture(entity, "specular") : null;
}

function getBodyRoughness(entity) {
  if (entity?.type === "Star") {
    return 0.36;
  }
  if (isMoonInspectionEntity(entity)) {
    return getSourceTextureProfile(entity)?.roughness ?? 0.96;
  }
  return getSourceTextureProfile(entity)?.roughness ?? 0.92;
}

function getBodyMaterialBaseColor(entity, fallbackColor = 0xffffff) {
  const profile = getSourceTextureProfile(entity);
  if (Number.isFinite(profile?.colorTint)) {
    return profile.colorTint;
  }
  return profile?.color && !profile.tintColorMap ? 0xffffff : fallbackColor;
}

function getBodyClearcoat(entity) {
  return getSourceTextureProfile(entity)?.clearcoat ?? 0;
}

function getBodySpecularIntensity(entity) {
  const profileIntensity = getSourceTextureProfile(entity)?.specularIntensity;
  if (Number.isFinite(profileIntensity)) {
    return profileIntensity;
  }
  return getBodySpecularTexture(entity) ? 0.9 : 0.35;
}

function getRingColorTexture(id) {
  return getSourceTexture(id, "ringColor");
}

function getRingAlphaTexture(id) {
  return getSourceTexture(id, "ringAlpha");
}

function getDetailCloudOpacity(entityOrId) {
  const sourceOpacity = getSourceTextureProfile(entityOrId)?.cloudOpacity;
  if (Number.isFinite(sourceOpacity)) {
    return sourceOpacity;
  }
  const id = getTextureBodyId(entityOrId);
  return {
    earth: 0.22,
    venus: 0.2,
    jupiter: 0.16,
    mars: 0.055,
    saturn: 0.12,
    uranus: 0.1,
    neptune: 0.14,
    titan: 0.17,
  }[id] ?? 0;
}

function getDetailCloudTint(entityOrId) {
  const id = getTextureBodyId(entityOrId);
  return {
    venus: 0xffe0a8,
    mars: 0xffb07a,
    saturn: 0xffe4ad,
    uranus: 0xcdfdff,
    neptune: 0xd5e7ff,
    titan: 0xffc06f,
  }[id] ?? 0xffffff;
}

function getCloudVolumeStrength(entityOrId) {
  return getSourceTextureProfile(entityOrId)?.cloudVolume ?? 0.65;
}

function getCloudLayerSpin(entityOrId, layerIndex) {
  const id = getTextureBodyId(entityOrId);
  const base = {
    venus: -0.0022,
    earth: 0.0048,
    mars: 0.0032,
    jupiter: 0.0095,
    saturn: 0.006,
    uranus: -0.0034,
    neptune: 0.007,
    titan: 0.0018,
  }[id] ?? 0.0024;
  return base * (1 + layerIndex * 0.46) * (layerIndex % 2 === 0 ? 1 : -0.62);
}

function getCloudLayerOpacity(entityOrId, layerIndex) {
  const profile = getSourceTextureProfile(entityOrId);
  const hasSourceClouds = Boolean(profile?.clouds || profile?.cloudAlpha);
  const sourceCloudMultiplier = profile?.cloudAlpha ? 0.82 : profile?.clouds ? 0.32 : 0.58;
  const volumeStrength = getCloudVolumeStrength(entityOrId);
  const layerFalloff = [0.52, 0.26, 0.13, 0.06][layerIndex] ?? 0.04;
  return getDetailCloudOpacity(entityOrId) * layerFalloff * volumeStrength * (hasSourceClouds ? sourceCloudMultiplier : 0.58);
}

function getCloudLayerScale(entity, layerIndex) {
  const closeOffset = [0.008, 0.018, 0.032, 0.05][layerIndex] ?? 0.012;
  const giantLift = isGiantPlanetLike(entity) ? 0.006 : 0;
  return getInspectionBodyScale(entity) * (1 + closeOffset + giantLift);
}

function configureCloudShell(shell, entity, layerIndex) {
  const cloudOpacity = getDetailCloudOpacity(entity);
  shell.visible = cloudOpacity > 0;
  shell.userData.spin = getCloudLayerSpin(entity, layerIndex);
  shell.scale.setScalar(getCloudLayerScale(entity, layerIndex));
  shell.material.color.setHex(getDetailCloudTint(entity));
  shell.material.map = createWorkbenchCloudTexture(entity);
  shell.material.alphaMap = createWorkbenchCloudAlphaTexture(entity);
  shell.material.userData.baseOpacity = getCloudLayerOpacity(entity, layerIndex);
  shell.material.depthWrite = false;
  shell.material.needsUpdate = true;
}

function configureDetailCloudVolume(entity) {
  if (!planetDetailClouds) {
    return;
  }
  configureCloudShell(planetDetailClouds, entity, 0);
  const shells = planetDetailCloudVolume?.children ?? [];
  for (let i = 0; i < shells.length; i += 1) {
    configureCloudShell(shells[i], entity, i + 1);
  }
}

function createWorkbenchBodyTexture(id, color = 0xffffff, type = "Planet") {
  const sourceColor = getSourceTexture(id, "color");
  if (sourceColor) {
    return sourceColor;
  }
  if (id === "earth") {
    return planetDetailTexture ?? createWorkbenchPlanetTexture();
  }
  return createPixelBodyTexture(
    { id, color, type },
    getTextureWorkbenchOptions()
  );
}

function getBodyBumpScale(entity) {
  const id = getTextureBodyId(entity);
  const type = entity?.type ?? "Planet";
  if (!id || type === "Star") {
    return 0;
  }
  const sourceBumpScale = getSourceTextureProfile(id)?.bumpScale;
  if (Number.isFinite(sourceBumpScale)) {
    return sourceBumpScale;
  }
  if (type.includes("Exoplanet") || type === "Super Earth" || type === "Hot Jupiter" || entity?.hostSystemId) {
    return 0;
  }
  if (id === "moon") {
    return 0.68;
  }
  if (type === "Major Moon") {
    if (id === "titan") return 0.08;
    if (id === "europa" || id === "enceladus") return 0.26;
    return 0.44;
  }
  if (id === "mars") {
    return 0.18;
  }
  if (id === "mercury" || id === "ceres") {
    return 0.24;
  }
  if (id === "pluto") {
    return 0.22;
  }
  return 0;
}

function getBodyDepthTexture(entity) {
  if (getBodyBumpScale(entity) <= 0) {
    return null;
  }
  const textureId = getTextureBodyId(entity);
  const sourceBump = getSourceTexture(entity, "bump");
  if (sourceBump) {
    return sourceBump;
  }
  const cacheKey = `${textureId}:${entity.type ?? "Planet"}`;
  if (!bodyDepthTextureCache.has(cacheKey)) {
    bodyDepthTextureCache.set(
      cacheKey,
      createPixelBodyDepthTexture(
        { id: textureId, type: entity.type },
        getTextureWorkbenchOptions()
      )
    );
  }
  return bodyDepthTextureCache.get(cacheKey);
}

function getBodyTexture(entity) {
  const textureId = getTextureBodyId(entity);
  if (textureId === "earth" && planetDetailTexture) {
    return planetDetailTexture;
  }
  if (!bodyTextureCache.has(textureId)) {
    bodyTextureCache.set(
      textureId,
      createWorkbenchBodyTexture(textureId, entity.visualColor ?? 0xffffff, entity.type)
    );
  }
  return bodyTextureCache.get(textureId);
}

function getSupplementalDetailMoons(parentId) {
  const targetCounts = {
    jupiter: 12,
    saturn: 12,
    uranus: 8,
    neptune: 8,
  };
  const existing = moonCatalog.filter((moon) => moon.parent === parentId).length;
  const count = Math.max(0, (targetCounts[parentId] ?? 0) - existing);
  const localRandom = seededRandom(
    Array.from(parentId).reduce((total, char) => total + char.charCodeAt(0) * 17, 0)
  );
  return Array.from({ length: count }, (_, index) => ({
    id: `${parentId}-minor-${index}`,
    name: `${parentId} minor moon ${index + 1}`,
    parent: parentId,
    radius: 0.045 + localRandom() * 0.055,
    distance: 5.7 + index * 0.78 + localRandom() * 0.22,
    angle: localRandom() * Math.PI * 2,
    color: localRandom() > 0.45 ? 0xbfb8ac : 0xd8d4ca,
    speed: (0.0009 + localRandom() * 0.0018) * (localRandom() > 0.2 ? 1 : -1),
    supplemental: true,
  }));
}

function clearDetailMoonEntities() {
  for (let i = selectableEntities.length - 1; i >= 0; i -= 1) {
    const entity = selectableEntities[i];
    if (!entity.detailOnly) {
      continue;
    }
    if (entity.hitTarget?.parent) {
      entity.hitTarget.parent.remove(entity.hitTarget);
    }
    if (entity.object?.userData?.selectableEntity === entity) {
      delete entity.object.userData.selectableEntity;
    }
    removeEntityFromGraph(entity);
    selectableEntities.splice(i, 1);
  }
  invalidateRenderCaches();
}

function getDetailMoonStation(entity, index, total, moonInfo) {
  const isGiant = entity.type === "Giant Planet";
  const parentDetailRadius = 6 * getInspectionBodyScale(entity);
  if (isGiant) {
    const namedTotal = moonCatalog.filter((moon) => moon.parent === entity.id).length;
    const isNamedMoon = !moonInfo.supplemental;
    if (isNamedMoon) {
      const namedT = namedTotal <= 1 ? 0.5 : index / Math.max(1, namedTotal - 1);
      return {
        angle: 0.28 + namedT * Math.PI * 0.82,
        distance: parentDetailRadius + 3.25 + namedT * 1.85,
        y: parentDetailRadius * (0.82 - namedT * 1.44),
        zScale: 0.92,
        zOffset: parentDetailRadius * 0.12,
      };
    }
    const minorIndex = Math.max(0, index - namedTotal);
    const minorCount = Math.max(1, total - namedTotal);
    const minorT = minorCount === 1 ? 0.5 : minorIndex / (minorCount - 1);
    return {
      angle: 2.82 + minorT * Math.PI * 2.8,
      distance: parentDetailRadius + 4.6 + minorT * 3.4,
      y: parentDetailRadius * (0.08 - minorT * 1.62),
      zScale: 0.78,
      zOffset: parentDetailRadius * 0.08,
    };
  }
  const effectiveTotal = Math.max(1, total);
  const t = effectiveTotal === 1 ? 0.5 : index / (effectiveTotal - 1);
  const spread = Math.min(Math.PI * 0.72, 0.36 + effectiveTotal * 0.22);
  const angle = -0.14 + (t - 0.5) * spread;
  const distance = Math.max(8.7, parentDetailRadius + 2.1) + index * 1.42 + (moonInfo.radius < 0.08 ? 0.5 : 0);
  return {
    angle,
    distance,
    y: (t - 0.5) * 2.15,
    zScale: 0.42,
    zOffset: 0,
  };
}

function getSystemMoonVisualRadius(moonInfo) {
  return moonInfo.radius * SYSTEM_MOON_VISUAL_SCALE;
}

function getDetailMoonVisualRadius(entity, moonInfo) {
  if (moonInfo.supplemental) {
    return THREE.MathUtils.clamp(moonInfo.radius * 2.65, 0.16, 0.24);
  }
  const isGiant = entity.type === "Giant Planet";
  const scale = isGiant ? 3.4 : entity.id === "earth" ? 4.15 : entity.id === "mars" ? 5.1 : 4.35;
  const floor = isGiant ? 0.42 : entity.id === "earth" ? 0.92 : entity.id === "mars" ? 0.58 : 0.46;
  const ceiling = isGiant ? 1.18 : entity.id === "earth" ? 1.08 : entity.id === "mars" ? 0.68 : 0.72;
  return THREE.MathUtils.clamp(moonInfo.radius * scale, floor, ceiling);
}

function refreshPlanetDetailMoons(entity) {
  if (!planetDetailMoonsGroup) {
    return;
  }
  if (isMoonInspectionEntity(entity)) {
    planetDetailMoonsGroup.visible = false;
    return;
  }
  planetDetailMoonsGroup.visible = true;
  if (planetDetailMoonParentId === entity.id) {
    return;
  }

  clearDetailMoonEntities();
  planetDetailMoonsGroup.clear();
  planetDetailMoonParentId = entity.id;
  if (entity.type === "Star") {
    return;
  }

  const namedMoons = moonCatalog.filter((moon) => moon.parent === entity.id);
  const moons = [...namedMoons, ...getSupplementalDetailMoons(entity.id)];

  for (const [index, moonInfo] of moons.entries()) {
    const station = getDetailMoonStation(entity, index, moons.length, moonInfo);
    const distance = station.distance;
    const moonRadius = getDetailMoonVisualRadius(entity, moonInfo);
    const fixedAngle = station.angle;
    const moonEntity = { id: moonInfo.id, visualColor: moonInfo.color, type: "Major Moon" };
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(moonRadius, 18, 10),
      createMaterial(
        THREE.MeshStandardMaterial,
        {
          color: getBodyMaterialBaseColor(moonEntity, moonInfo.color),
          map: getBodyTexture(moonEntity),
          bumpMap: getBodyDepthTexture(moonEntity),
          bumpScale: getBodyBumpScale(moonEntity) * (moonInfo.supplemental ? 0.38 : 0.58),
          roughness: getBodyRoughness(moonEntity),
          metalness: 0.0,
          emissive: moonInfo.color,
          emissiveIntensity: moonInfo.supplemental ? 0.002 : 0.006,
        },
        moonInfo.supplemental ? 0.76 : 1
      )
    );
    moon.userData.spin = 0;
    moon.position.set(
      Math.cos(fixedAngle) * distance,
      station.y + (moonInfo.supplemental ? (localRandomish(index, entity.id) - 0.5) * 0.26 : 0),
      Math.sin(fixedAngle) * distance * station.zScale + (station.zOffset ?? 0)
    );
    const majorGiantMoon = entity.type === "Giant Planet" && !moonInfo.supplemental;
    const stationHalo = createSceneGuideRing(
      moonRadius * (moonInfo.supplemental ? 1.8 : majorGiantMoon ? 2.95 : 2.35),
      0xdaf8ff,
      moonInfo.supplemental ? 0.012 : majorGiantMoon ? 0.078 : 0.065,
      64,
      1
    );
    stationHalo.rotation.x = Math.PI * 0.5;
    moon.add(stationHalo);
    planetDetailMoonsGroup.add(moon);
    if (!moonInfo.supplemental) {
      registerEntity({
        id: `detail-${entity.id}-${moonInfo.id}`,
        name: moonInfo.name,
        type: "Major Moon",
        band: "planet",
        object: moon,
        radius: moonRadius,
        hitRadius: majorGiantMoon ? Math.max(moonRadius * 6.2, 2.85) : Math.max(moonRadius * 4.2, 0.72),
        priority: 4,
        bodyDetail: true,
        innerZoomFloor: 0,
        visualColor: moonInfo.color,
        detailScale: getBodyDetailScale(moonInfo.id, moonInfo.radius, "Major Moon"),
        rotationHours: moonInfo.id === "moon" ? planetFacts.moon.rotationHours : null,
        visualProfile: "moon",
        sourceBodyId: moonInfo.id,
        meta: `Satellite of ${entity.name} | static close-view anchor`,
        summary: "A selectable close-view moon anchor. In planet inspection mode its orbital motion is paused so the satellite can be studied directly.",
        stats: [
          { value: entity.name, label: "parent body" },
          { value: "paused", label: "close orbit" },
        ],
        address: [moonInfo.name, entity.name, ...homeAddressTail],
        scaleHint: "Reference: close-view moons are static selection targets; system-scale moons continue to orbit in the Solar System layer.",
        detailOnly: true,
        parentId: entity.id,
        relation: "moon",
      });
    }
  }
  invalidateRenderCaches();
}

function createJupiterAtmosphereShell() {
  const atmosphere = new THREE.Group();
  const material = createMaterial(
    THREE.ShaderMaterial,
    {
      uniforms: {
        time: { value: 0 },
        layerOpacity: { value: 0.34 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float time;
        uniform float layerOpacity;
        varying vec2 vUv;

        float hash(float n) {
          return fract(sin(n) * 43758.5453123);
        }

        float wrapDistance(float a, float b) {
          return abs(fract(a - b + 0.5) - 0.5);
        }

        void main() {
          vec2 grid = vec2(176.0, 88.0);
          vec2 uv = (floor(vUv * grid) + 0.5) / grid;
          float band = floor(uv.y * 17.0);
          float seed = hash(band * 31.73 + 4.0);
          float direction = mix(-1.0, 1.0, step(0.5, mod(band, 2.0)));
          float drift = direction * time * (0.008 + seed * 0.024);
          float x = fract(uv.x + drift);
          float waveA = sin((x * (6.0 + seed * 7.0) + uv.y * 10.0 + seed * 3.0) * 6.28318);
          float waveB = sin((x * (16.0 + seed * 9.0) - uv.y * 5.0 - time * direction * 0.18) * 6.28318);
          float stripe = 0.5 + 0.5 * sin(uv.y * 96.0 + waveA * 0.9 + waveB * 0.28);
          float shear = smoothstep(0.64, 1.0, 0.5 + 0.5 * sin(x * 72.0 + band * 1.9 + time * direction * 0.42));

          vec3 cream = vec3(0.96, 0.84, 0.62);
          vec3 ochre = vec3(0.78, 0.55, 0.32);
          vec3 rust = vec3(0.56, 0.28, 0.18);
          vec3 umber = vec3(0.25, 0.15, 0.12);
          vec3 color = mix(cream, ochre, stripe);
          color = mix(color, rust, smoothstep(0.46, 0.92, waveB * 0.5 + 0.5) * 0.45);
          color = mix(color, umber, shear * 0.18);

          float spotX = 0.16;
          float dx = wrapDistance(uv.x, spotX);
          float dy = uv.y - 0.58;
          float spotShape = (dx / 0.095) * (dx / 0.095) + (dy / 0.05) * (dy / 0.05);
          float spot = 1.0 - smoothstep(0.62, 1.0, spotShape);
          float core = 1.0 - smoothstep(0.0, 0.42, spotShape);
          float swirl = 0.5 + 0.5 * sin(atan(dy * 2.0, dx) * 6.0 - time * 4.4 + spotShape * 18.0);
          vec3 spotColor = mix(vec3(0.72, 0.23, 0.12), vec3(1.0, 0.68, 0.34), swirl);
          spotColor = mix(spotColor, vec3(0.38, 0.11, 0.08), core * 0.35);
          color = mix(color, spotColor, spot);

          float limbFade = smoothstep(0.0, 0.05, uv.x) * (1.0 - smoothstep(0.95, 1.0, uv.x));
          float alpha = (0.14 + stripe * 0.13 + shear * 0.11 + spot * 0.72) * layerOpacity * limbFade;
          if (alpha < 0.01) {
            discard;
          }
          gl_FragColor = vec4(color, alpha);
        }
      `,
      blending: THREE.NormalBlending,
      depthWrite: false,
    },
    0.18
  );
  const shell = new THREE.Mesh(new THREE.SphereGeometry(6.18, 96, 48), material);
  shell.renderOrder = 4;
  atmosphere.add(shell);
  atmosphere.visible = false;
  return atmosphere;
}

function createDetailCloudShell(layerIndex) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(6.08 + layerIndex * 0.035, 96, 48),
    createMaterial(
      THREE.MeshBasicMaterial,
      {
        color: getDetailCloudTint("earth"),
        map: createWorkbenchCloudTexture("earth"),
        alphaMap: createWorkbenchCloudAlphaTexture("earth"),
        blending: THREE.NormalBlending,
        depthWrite: false,
      },
      getCloudLayerOpacity("earth", layerIndex)
    )
  );
}

function createEarthCloudBandVolume() {
  const group = new THREE.Group();
  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    precision highp float;
    uniform float time;
    uniform float bandSeed;
    uniform float layerOpacity;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float blockNoise(vec2 uv, vec2 grid) {
      vec2 cell = floor(uv * grid);
      vec2 f = fract(uv * grid);
      float a = hash(cell + bandSeed);
      float b = hash(cell + vec2(1.0, 0.0) + bandSeed);
      float c = hash(cell + vec2(0.0, 1.0) + bandSeed);
      float d = hash(cell + vec2(1.0, 1.0) + bandSeed);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    void main() {
      vec2 grid = vec2(168.0, 84.0);
      vec2 uv = (floor(vUv * grid) + 0.5) / grid;
      float lat = abs(uv.y - 0.5) * 2.0;
      float drift = time * (0.012 + bandSeed * 0.003);
      float wave = sin((uv.x * (4.0 + bandSeed) + drift) * 6.28318) * 0.055;
      float bandA = 0.5 + 0.5 * sin((uv.y * 8.0 + wave + bandSeed * 0.41) * 6.28318);
      float bandB = 0.5 + 0.5 * sin((uv.y * 15.0 - uv.x * 0.8 - drift * 0.6 + bandSeed) * 6.28318);
      float broadBand = smoothstep(0.52, 0.86, max(bandA, bandB * 0.82));
      float streak = smoothstep(0.34, 0.78, blockNoise(vec2(uv.x * 1.6 + drift, uv.y * 0.72), vec2(18.0, 9.0)));
      float cut = smoothstep(0.28, 0.72, blockNoise(vec2(uv.x * 0.76 - drift * 0.35, uv.y), vec2(9.0, 6.0)));
      float latitudeWeight = mix(0.72, 1.0, smoothstep(0.05, 0.62, lat));
      float limb = smoothstep(0.015, 0.055, uv.x) * (1.0 - smoothstep(0.945, 0.995, uv.x));
      float alpha = broadBand * streak * cut * latitudeWeight * limb * layerOpacity * 0.62;
      if (alpha < 0.012) {
        discard;
      }
      vec3 cloud = mix(vec3(0.82, 0.90, 0.94), vec3(0.98), 0.48 + broadBand * 0.2);
      gl_FragColor = vec4(cloud, alpha);
    }
  `;

  for (let i = 0; i < 3; i += 1) {
    const material = createMaterial(
      THREE.ShaderMaterial,
      {
        uniforms: {
          time: { value: 0 },
          bandSeed: { value: i + 1.3 },
          layerOpacity: { value: 0.16 },
        },
        vertexShader,
        fragmentShader,
        blending: THREE.NormalBlending,
        depthWrite: false,
      },
      [0.06, 0.036, 0.021][i]
    );
    const shell = new THREE.Mesh(new THREE.SphereGeometry(6.18 + i * 0.075, 96, 48), material);
    shell.userData.spin = [0.0022, -0.00135, 0.00082][i];
    group.add(shell);
  }
  group.visible = false;
  return group;
}

function getSkyFigurePosition(raDeg, decDeg, radius = SKY_FIGURE_DISTANCE) {
  const ra = THREE.MathUtils.degToRad(raDeg);
  const dec = THREE.MathUtils.degToRad(decDeg);
  const cosDec = Math.cos(dec);
  return new THREE.Vector3(
    Math.sin(ra) * cosDec * radius,
    Math.sin(dec) * radius,
    -Math.cos(ra) * cosDec * radius
  );
}

function getSkyFigurePattern(figure) {
  const authored = SKY_FIGURE_PATTERNS[figure.id];
  if (authored) {
    return authored;
  }
  const seed = Array.from(figure.id).reduce((total, char) => total + char.charCodeAt(0) * 19, 71);
  const localRandom = seededRandom(seed);
  const pointCount = 5 + Math.floor(localRandom() * 4);
  const sweep = 1.1 + localRandom() * 0.72;
  const points = [];
  for (let i = 0; i < pointCount; i += 1) {
    const t = pointCount === 1 ? 0.5 : i / (pointCount - 1);
    const angle = -sweep + t * sweep * 2 + (localRandom() - 0.5) * 0.28;
    const radius = 0.42 + localRandom() * 0.56;
    const wave = Math.sin(t * Math.PI * (1.2 + localRandom() * 1.4)) * (0.18 + localRandom() * 0.34);
    points.push([
      Math.cos(angle) * radius + (localRandom() - 0.5) * 0.18,
      Math.sin(angle) * radius * 0.68 + wave,
    ]);
  }
  const segments = [];
  for (let i = 0; i < pointCount - 1; i += 1) {
    segments.push([i, i + 1]);
  }
  if (pointCount > 5) {
    segments.push([0, Math.floor(pointCount * 0.56)]);
  }
  return { points, segments };
}

function createSkyFigureAddressMarker(figure) {
  const color = figure.color ?? 0xdff8ff;
  const marker = new THREE.Group();
  marker.position.copy(getSkyFigurePosition(figure.raDeg, figure.decDeg));
  marker.lookAt(0, 0, 0);
  marker.visible = skyFiguresVisible;
  marker.userData.breath = {
    speed: 0.38 + localRandomish(figure.id.length, figure.id) * 0.18,
    phase: localRandomish(figure.raDeg, figure.id) * Math.PI * 2,
    amount: 0.018,
  };

  const pattern = getSkyFigurePattern(figure);
  const linePositions = [];
  for (const [startIndex, endIndex] of pattern.segments) {
    const start = pattern.points[startIndex];
    const end = pattern.points[endIndex];
    if (!start || !end) {
      continue;
    }
    linePositions.push(
      start[0] * SKY_FIGURE_GLYPH_SCALE,
      start[1] * SKY_FIGURE_GLYPH_SCALE,
      0,
      end[0] * SKY_FIGURE_GLYPH_SCALE,
      end[1] * SKY_FIGURE_GLYPH_SCALE,
      0
    );
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMaterial = createMaterial(
    THREE.LineBasicMaterial,
    {
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    },
    figure.kind.includes("Zodiac") ? 0.26 : 0.34
  );
  lineMaterial.userData.twinkleAmount = 0.18;
  lineMaterial.userData.twinkleSpeed = 0.42 + localRandomish(figure.decDeg, figure.id) * 0.32;
  lineMaterial.userData.twinklePhase = localRandomish(figure.raDeg, figure.name) * Math.PI * 2;
  marker.add(new THREE.LineSegments(lineGeometry, lineMaterial));

  const pointPositions = [];
  for (const point of pattern.points) {
    pointPositions.push(point[0] * SKY_FIGURE_GLYPH_SCALE, point[1] * SKY_FIGURE_GLYPH_SCALE, 0.03);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(pointPositions, 3));
  const starMaterial = createMaterial(
    THREE.PointsMaterial,
    {
      color,
      size: figure.kind.includes("Zodiac") ? 0.74 : 0.92,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    },
    figure.kind.includes("Zodiac") ? 0.58 : 0.72
  );
  starMaterial.userData.twinkleAmount = 0.28;
  starMaterial.userData.twinkleSpeed = 0.6 + localRandomish(figure.members.length, figure.id) * 0.34;
  starMaterial.userData.twinklePhase = localRandomish(figure.members.length, figure.name) * Math.PI * 2;
  marker.add(new THREE.Points(starGeometry, starMaterial));

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.72, 1),
    createMaterial(
      THREE.MeshBasicMaterial,
      {
        color,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      },
      0.42
    )
  );
  marker.add(core);

  const entity = registerEntity({
    id: figure.id,
    name: figure.name,
    type: figure.kind,
    band: "system",
    object: marker,
    radius: 12,
    hitRadius: 15.5,
    priority: figure.kind.includes("Zodiac") ? 1.8 : 2.15,
    innerZoomFloor: SYSTEM_ZOOM_FLOOR,
    visualColor: color,
    family: "sky-figure",
    parentId: "sun",
    relation: "apparent sky figure",
    meta: `${figure.kind} | apparent Earth/Sol sky address`,
    summary: "A selectable constellation address marker projected onto the Solar System sky. Selecting it opens a stellar-neighborhood overlay that connects modeled member stars with restrained apparent-position placeholders where needed.",
    stats: [
      { value: figure.kind.includes("Zodiac") ? "zodiac" : "asterism", label: "sky class" },
      { value: `${figure.members.length}`, label: "named stars" },
      { value: "Sol viewpoint", label: "geometry" },
    ],
    address: [figure.name, "Earth Sky", "Solar System", ...homeAddressTail.slice(1)],
    dataStatus: "catalog scaffold",
    scaleHint: "Reference: these are apparent constellations pinned to the Solar System sky; selected figures unfold into stellar-neighborhood linework without pretending the stars are physically adjacent.",
  });
  entity.memberStars = figure.members;
  skyFigureObjects.push(marker);
  return marker;
}

function buildSkyFigureAddressLayer() {
  const group = new THREE.Group();
  group.name = "sky-figure-address-markers";
  for (const figure of SKY_FIGURE_CATALOG) {
    group.add(createSkyFigureAddressMarker(figure));
  }
  return group;
}

function shouldShowSkyFigureAddressMarkers() {
  const stellarBand = getBandByKey("stellar");
  return skyFiguresVisible && zoomLevel < stellarBand.center - 0.28;
}

function updateSkyFigureAddressMarkers() {
  const visible = shouldShowSkyFigureAddressMarkers();
  for (const object of skyFigureObjects) {
    object.visible = visible;
  }
}

function normalizeSkyFigureMemberKey(memberName) {
  return `${memberName ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSkyFigureMemberId(memberName) {
  const key = normalizeSkyFigureMemberKey(memberName);
  return SKY_FIGURE_MEMBER_ALIASES[key] ?? key;
}

function getSkyFigureTangentBasis(raDeg, decDeg) {
  const center = getSkyFigurePosition(raDeg, decDeg, 1).normalize();
  const worldUp = Math.abs(center.y) < 0.86
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const right = worldUp.cross(center).normalize();
  const up = center.clone().cross(right).normalize();
  return { center, right, up };
}

function getSkyFigurePatternPoint(pattern, index, total) {
  if (pattern.points[index]) {
    return pattern.points[index];
  }
  const t = total <= 1 ? 0.5 : index / (total - 1);
  const angle = -Math.PI * 0.75 + t * Math.PI * 1.5;
  return [Math.cos(angle) * 0.72, Math.sin(angle) * 0.52];
}

function getSkyFigureApparentStellarPosition(figure, pattern, index, total) {
  const { center, right, up } = getSkyFigureTangentBasis(figure.raDeg, figure.decDeg);
  const [x, y] = getSkyFigurePatternPoint(pattern, index, total);
  const shellRadius = STELLAR_NEIGHBORHOOD_RADIUS * (figure.kind.includes("Zodiac") ? 0.72 : 0.82);
  const spread = figure.kind.includes("Zodiac") ? 18 : 24;
  return center
    .multiplyScalar(shellRadius)
    .add(right.multiplyScalar(x * spread))
    .add(up.multiplyScalar(y * spread * 0.82));
}

function createSkyFigureStellarOverlay(figure, stellarStarObjects) {
  const overlay = new THREE.Group();
  overlay.name = `${figure.id}-stellar-overlay`;
  overlay.visible = false;
  overlay.userData.breath = {
    speed: 0.26 + localRandomish(figure.members.length, figure.id) * 0.16,
    phase: localRandomish(figure.raDeg, figure.name) * Math.PI * 2,
    amount: 0.006,
  };
  const color = figure.color ?? 0xdff8ff;
  const pattern = getSkyFigurePattern(figure);
  const memberPositions = figure.members.map((member, index) => {
    const memberObject = stellarStarObjects.get(getSkyFigureMemberId(member));
    const apparentPosition = getSkyFigureApparentStellarPosition(figure, pattern, index, figure.members.length);
    if (!memberObject) {
      return { member, position: apparentPosition, synthetic: true };
    }
    const actualPosition = memberObject.position.clone();
    const apparentBend = figure.kind.includes("Zodiac") ? 0.38 : 0.46;
    return {
      member,
      position: actualPosition.lerp(apparentPosition, apparentBend),
      synthetic: false,
    };
  });

  const segmentPositions = [];
  const glowPositions = [];
  const segments = pattern.segments.length
    ? pattern.segments
    : Array.from({ length: Math.max(0, memberPositions.length - 1) }, (_item, index) => [index, index + 1]);
  const jitterRandom = seededRandom(
    Array.from(`${figure.id}-stellar-lines`).reduce((total, char) => total + char.charCodeAt(0) * 23, 0)
  );
  for (const [startIndex, endIndex] of segments) {
    const start = memberPositions[startIndex]?.position;
    const end = memberPositions[endIndex]?.position;
    if (!start || !end) {
      continue;
    }
    segmentPositions.push(start.x, start.y, start.z, end.x, end.y, end.z);
    for (let strand = 0; strand < 3; strand += 1) {
      const startJitter = randomOnSphere(0.26 + jitterRandom() * 0.64).clone();
      const endJitter = randomOnSphere(0.26 + jitterRandom() * 0.64).clone();
      glowPositions.push(
        start.x + startJitter.x,
        start.y + startJitter.y,
        start.z + startJitter.z,
        end.x + endJitter.x,
        end.y + endJitter.y,
        end.z + endJitter.z
      );
    }
  }

  const glowGeometry = new THREE.BufferGeometry();
  glowGeometry.setAttribute("position", new THREE.Float32BufferAttribute(glowPositions, 3));
  const glowMaterial = createMaterial(
    THREE.LineBasicMaterial,
    {
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    },
    figure.kind.includes("Zodiac") ? 0.12 : 0.16
  );
  glowMaterial.userData.twinkleAmount = 0.28;
  glowMaterial.userData.twinkleSpeed = 0.34 + localRandomish(figure.decDeg, figure.id) * 0.2;
  overlay.add(new THREE.LineSegments(glowGeometry, glowMaterial));

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(segmentPositions, 3));
  const lineMaterial = createMaterial(
    THREE.LineBasicMaterial,
    {
      color,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    },
    figure.kind.includes("Zodiac") ? 0.38 : 0.48
  );
  lineMaterial.userData.twinkleAmount = 0.18;
  lineMaterial.userData.twinkleSpeed = 0.48 + localRandomish(figure.raDeg, figure.id) * 0.26;
  overlay.add(new THREE.LineSegments(lineGeometry, lineMaterial));

  const starPositions = [];
  const starColors = [];
  const baseColor = new THREE.Color(color);
  const white = new THREE.Color(0xffffff);
  for (const member of memberPositions) {
    starPositions.push(member.position.x, member.position.y, member.position.z);
    reusableColor.copy(baseColor).lerp(white, member.synthetic ? 0.18 : 0.42);
    starColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const memberStars = createPointCloud(
    { positions: starPositions, colors: starColors },
    figure.kind.includes("Zodiac") ? 0.86 : 1.05,
    figure.kind.includes("Zodiac") ? 0.64 : 0.76,
    true
  );
  memberStars.material.userData.twinkleAmount = 0.35;
  memberStars.material.userData.twinkleSpeed = 0.68;
  overlay.add(memberStars);

  const centroid = memberPositions.reduce(
    (sum, member) => sum.add(member.position),
    new THREE.Vector3()
  ).multiplyScalar(1 / Math.max(1, memberPositions.length));
  const addressGlow = createGlowSphere(4.2, color, 0.006);
  addressGlow.position.copy(centroid);
  addressGlow.userData.breath = { amount: 0.08, speed: 0.44, phase: figure.members.length };
  overlay.add(addressGlow);

  skyFigureStellarOverlays.set(figure.id, overlay);
  return overlay;
}

function buildPlanetLayer() {
  const bandInfo = getBandByKey("planet");
  const group = makeLayer("planet", bandInfo.center, bandInfo.width, bandInfo.scale, new THREE.Group());
  planetDetailPivot = new THREE.Group();
  planetDetailPivot.position.copy(inspectionAnchor);
  group.add(planetDetailPivot);

  planetDetailTexture = createWorkbenchPlanetTexture();
  const planetMaterial = createMaterial(
    THREE.MeshPhysicalMaterial,
    {
      color: 0xffffff,
      map: planetDetailTexture,
      emissive: 0x06233c,
      emissiveMap: getBodyEmissiveTexture({ id: "earth" }),
      emissiveIntensity: 0.035,
      roughness: getBodyRoughness({ id: "earth" }),
      specularIntensity: getBodySpecularIntensity({ id: "earth" }),
      specularIntensityMap: getBodySpecularTexture({ id: "earth" }),
      clearcoat: getBodyClearcoat({ id: "earth" }),
      metalness: 0.0,
    },
    1
  );
  planetDetailBody = new THREE.Mesh(new THREE.SphereGeometry(6, 96, 48), planetMaterial);
  planetDetailBody.userData.spin = 0.035;
  planetDetailPivot.add(planetDetailBody);

  planetDetailClouds = createDetailCloudShell(0);
  planetDetailClouds.userData.spin = 0;
  planetDetailCloudVolume = new THREE.Group();
  for (let i = 1; i <= 3; i += 1) {
    const cloudShell = createDetailCloudShell(i);
    cloudShell.userData.spin = 0;
    planetDetailCloudVolume.add(cloudShell);
  }
  planetDetailEarthCloudBands = createEarthCloudBandVolume();
  planetDetailJupiterAtmosphere = createJupiterAtmosphereShell();
  planetDetailGlow = createGlowSphere(6.95, 0x4fdcff, 0.012);
  planetDetailAtmosphere = createSceneGuideRing(7.2, 0x9feeff, 0.055, 192, 0.92);
  planetDetailAtmosphere.rotation.x = 0.18;
  planetDetailMoonsGroup = new THREE.Group();
  planetDetailRingSystem = new THREE.Group();
  const detailRingDisk = new THREE.Mesh(
    new THREE.RingGeometry(8.2, 12.8, 192),
    createMaterial(
      THREE.MeshBasicMaterial,
      {
        color: 0xffdf9d,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      },
      0.18
    )
  );
  detailRingDisk.rotation.x = Math.PI * 0.5 + 0.28;
  const detailRingInner = createOrbitRing(8.5, 0xfff0c9, 0.22, 192);
  const detailRingOuter = createOrbitRing(12.6, 0xb58b55, 0.1, 192);
  detailRingInner.rotation.x = 0.28;
  detailRingOuter.rotation.x = 0.28;
  planetDetailRingSystem.add(detailRingDisk, detailRingInner, detailRingOuter);
  planetDetailRingSystem.visible = false;
  planetDetailPivot.add(
    planetDetailClouds,
    planetDetailCloudVolume,
    planetDetailEarthCloudBands,
    planetDetailJupiterAtmosphere,
    planetDetailGlow,
    planetDetailAtmosphere,
    planetDetailRingSystem,
    planetDetailMoonsGroup
  );

  return group;
}

function buildSystemLayer() {
  const bandInfo = getBandByKey("system");
  const group = makeLayer("system", bandInfo.center, bandInfo.width, bandInfo.scale, new THREE.Group());
  const sun = createPlasmaStarCore({
    id: "sun",
    radius: 3.2,
    color: 0xfff0a8,
    spectral: "g-star",
    flareCount: 18,
  });
  group.add(sun);
  const solarHub = createSceneGuideRing(5.9, 0xffd985, 0.2, 160, 0.72);
  solarHub.userData.spin = 0.0014;
  group.add(solarHub);
  registerEntity({
    id: "sun",
    name: "Sun",
    type: "Star",
    band: "system",
    object: sun,
    radius: 3.2,
    hitRadius: 5.2,
    priority: 5,
    innerZoomFloor: SYSTEM_ZOOM_FLOOR,
    visualColor: 0xfff0a8,
    detailScale: 1.28,
    meta: "G-type main-sequence star | compressed system scale",
    summary: "The Solar System anchor. Physical solar data and live ephemerides can slot into this entity later.",
    stats: [
      { value: "G2V", label: "stellar class" },
      { value: "1 AU", label: "Earth orbit" },
      { value: "8", label: "planets" },
      { value: "local", label: "system anchor" },
    ],
    scaleHint: "Reference: the Sun is the system anchor, so scrolling inward is gated until a child planet or moon is selected.",
  });

  const planets = [
    { id: "mercury", name: "Mercury", distance: 7.4, radius: 0.38, color: 0xb8a896, angle: 0.4, meta: "Terrestrial planet | 4,879 km diameter | 0 moons" },
    { id: "venus", name: "Venus", distance: 10.6, radius: 0.62, color: 0xf2cf91, angle: 1.28, meta: "Cloud-veiled terrestrial planet | retrograde rotation | 0 moons" },
    { id: "earth", name: "Earth", distance: EARTH_SYSTEM_ORBIT_DISTANCE, radius: 0.68, color: 0x6ed4ff, angle: 2.15, meta: "Ocean world | 12,756 km diameter | 1 moon" },
    { id: "mars", name: "Mars", distance: 19.4, radius: 0.52, color: 0xff8f6e, angle: 2.9, meta: "Dusty terrestrial planet | 6,792 km diameter | 2 moons" },
    { id: "jupiter", name: "Jupiter", distance: 32.2, radius: 2.15, color: 0xf3d4a6, angle: 3.65, meta: "Gas giant | 142,984 km diameter | 95 known moons in NASA fact sheet" },
    { id: "saturn", name: "Saturn", distance: 46.8, radius: 1.78, color: 0xe8d29b, angle: 4.75, meta: "Ringed gas giant | 120,536 km diameter | 274 known moons in NASA fact sheet" },
    { id: "uranus", name: "Uranus", distance: 62.5, radius: 1.15, color: 0x8be6ff, angle: 5.82, meta: "Tilted ice giant | retrograde rotation | 28 moons" },
    { id: "neptune", name: "Neptune", distance: 76.5, radius: 1.12, color: 0x638dff, angle: 0.68, meta: "Windy ice giant | 49,528 km diameter | 16 moons" },
  ];

  for (const planet of planets) {
    const planetType = planet.radius > 1 ? "Giant Planet" : "Planet";
    const fact = planetFacts[planet.id];
    const planetTextureEntity = { id: planet.id, visualColor: planet.color, type: planetType };
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(planet.radius, 32, 16),
      createMaterial(
        THREE.MeshPhysicalMaterial,
        {
          color: getBodyMaterialBaseColor(planetTextureEntity, planet.color),
          map: getBodyTexture(planetTextureEntity),
          bumpMap: getBodyDepthTexture(planetTextureEntity),
          bumpScale: getBodyBumpScale(planetTextureEntity) * 0.45,
          emissive: planet.id === "earth" ? 0xffffff : planet.color,
          emissiveMap: getBodyEmissiveTexture(planetTextureEntity),
          emissiveIntensity: planet.id === "earth" ? 0.032 : 0.018,
          roughness: getBodyRoughness(planetTextureEntity),
          specularIntensity: getBodySpecularIntensity(planetTextureEntity),
          specularIntensityMap: getBodySpecularTexture(planetTextureEntity),
          clearcoat: getBodyClearcoat(planetTextureEntity),
        },
        1
      )
    );
    body.userData.orbit = {
      distance: planet.distance,
      angle: planet.angle,
      speed: 0.00017 * Math.pow(EARTH_SYSTEM_ORBIT_DISTANCE / planet.distance, 1.35),
      zScale: ECLIPTIC_Z_SCALE,
    };
    body.userData.spin = getSpinFromRotationHours(planetFacts[planet.id]?.rotationHours, 0.018);
    body.position.set(
      Math.cos(planet.angle) * planet.distance,
      0,
      Math.sin(planet.angle) * planet.distance * ECLIPTIC_Z_SCALE
    );
    const systemCloudOpacity = getCloudLayerOpacity(planet.id, 0) * 0.75;
    if (systemCloudOpacity > 0) {
      const cloudShell = new THREE.Mesh(
        new THREE.SphereGeometry(planet.radius * 1.035, 32, 16),
        createMaterial(
          THREE.MeshBasicMaterial,
          {
            color: getDetailCloudTint(planet.id),
            map: createWorkbenchCloudTexture(planet.id),
            alphaMap: createWorkbenchCloudAlphaTexture(planet.id),
            blending: THREE.NormalBlending,
            depthWrite: false,
          },
          systemCloudOpacity
        )
      );
      cloudShell.userData.spin = getCloudLayerSpin(planet.id, 0);
      body.add(cloudShell);
    }
    group.add(body);
    registerEntity({
      id: planet.id,
      name: planet.name,
      type: planetType,
      band: "system",
      object: body,
      radius: planet.radius,
      hitRadius: Math.max(planet.radius * 2.2, 1.4),
      priority: planet.radius > 1 ? 4 : 3,
      bodyDetail: true,
      innerZoomFloor: 0,
      visualColor: planet.color,
      detailScale: getBodyDetailScale(planet.id, planet.radius, planetType),
      rotationHours: fact?.rotationHours,
      moonCount: fact?.moons,
      visualProfile: planet.id,
      meta: planet.meta,
      summary: "A legibility-scaled Solar System body using NASA fact-sheet rotation and diameter cues, with compressed orbital distance for navigation.",
      stats: [
        { value: `${fact?.diameterKm.toLocaleString() ?? "unknown"} km`, label: "diameter" },
        { value: `${fact?.rotationHours ?? "unknown"} h`, label: "rotation" },
        { value: `${fact?.moons ?? 0}`, label: "known moons" },
        { value: planetType, label: "class" },
      ],
      parentId: "sun",
      relation: "planet",
      scaleHint: "Reference: planet sizes are legibility-scaled, while spin direction and relative speed follow fact-sheet rotation cues.",
    });
    group.add(createSceneGuideRing(planet.distance, 0xaeefff, 0.13, 192, ECLIPTIC_Z_SCALE));
  }

  for (const [planetId, ringStyle] of Object.entries(ringedPlanetStyles)) {
    const planetObject = selectableEntities.find((entity) => entity.id === planetId)?.object;
    if (!planetObject) continue;
    const ringColorTexture = getRingColorTexture(planetId);
    const ringAlphaTexture = getRingAlphaTexture(planetId);
    const ringDisk = new THREE.Mesh(
      new THREE.RingGeometry(ringStyle.systemInner, ringStyle.systemOuter, 160),
      createMaterial(
        THREE.MeshBasicMaterial,
        {
          color: ringColorTexture ? 0xffffff : ringStyle.color,
          map: ringColorTexture,
          alphaMap: ringAlphaTexture,
          side: THREE.DoubleSide,
          blending: ringColorTexture ? THREE.NormalBlending : THREE.AdditiveBlending,
          depthWrite: false,
          alphaTest: ringAlphaTexture ? 0.035 : 0,
        },
        ringStyle.systemDiskOpacity
      )
    );
    ringDisk.rotation.x = Math.PI * 0.5 + ringStyle.tilt;
    const innerRing = createOrbitRing(ringStyle.systemInner * 1.04, ringStyle.innerColor, ringStyle.systemInnerOpacity, 160);
    const outerRing = createOrbitRing(ringStyle.systemOuter * 0.98, ringStyle.outerColor, ringStyle.systemOuterOpacity, 160);
    innerRing.rotation.x = ringStyle.tilt;
    outerRing.rotation.x = ringStyle.tilt;
    planetObject.add(ringDisk, innerRing, outerRing);
  }

  const addMoonObject = (moonInfo) => {
    const parent = selectableEntities.find((entity) => entity.id === moonInfo.parent)?.object;
    if (!parent) return false;
    const moonRadius = getSystemMoonVisualRadius(moonInfo);
    const moonEntity = { id: moonInfo.id, visualColor: moonInfo.color, type: "Major Moon" };
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(moonRadius, 18, 10),
      createMaterial(
        THREE.MeshStandardMaterial,
        {
          color: getBodyMaterialBaseColor(moonEntity, moonInfo.color),
          map: getBodyTexture(moonEntity),
          bumpMap: getBodyDepthTexture(moonEntity),
          bumpScale: getBodyBumpScale(moonEntity) * 0.42,
          emissive: moonInfo.color,
          emissiveIntensity: 0.003,
          roughness: getBodyRoughness(moonEntity),
        },
        1
      )
    );
    moon.userData.orbit = {
      distance: moonInfo.distance,
      angle: moonInfo.angle,
      speed: moonInfo.speed,
      zScale: 0.68,
    };
    moon.userData.spin = moonInfo.id === "moon" ? getSpinFromRotationHours(planetFacts.moon.rotationHours, 0.018) : 0.0035;
    moon.position.set(
      Math.cos(moonInfo.angle) * moonInfo.distance,
      0,
      Math.sin(moonInfo.angle) * moonInfo.distance * 0.68
    );
    parent.add(moon);
    parent.add(createSceneGuideRing(moonInfo.distance, 0xdaf8ff, 0.045, 96, 0.68));
    registerEntity({
      id: moonInfo.id,
      name: moonInfo.name,
      type: "Major Moon",
      band: "system",
      object: moon,
      radius: moonRadius,
      hitRadius: Math.max(0.95, moonRadius * 2.8),
      priority: 2.5,
      bodyDetail: true,
      innerZoomFloor: MOON_PARENT_VIEW_FLOOR,
      visualColor: moonInfo.color,
      detailScale: getBodyDetailScale(moonInfo.id, moonInfo.radius, "Major Moon"),
      rotationHours: moonInfo.id === "moon" ? planetFacts.moon.rotationHours : null,
      visualProfile: "moon",
      sourceBodyId: moonInfo.id,
      meta: `Satellite of ${moonInfo.parent}`,
      summary: "A named natural satellite. Size is legibility-scaled while preserving relative prominence among major moons.",
      stats: [
        { value: moonInfo.parent, label: "parent body" },
        { value: moonInfo.speed < 0 ? "retrograde" : "prograde", label: "model orbit" },
      ],
      parentId: moonInfo.parent,
      relation: "moon",
      scaleHint: "Reference: selecting a system-scale moon first stages its parent planet, then the close moon anchors become selectable.",
    });
    return true;
  };

  for (const moonInfo of moonCatalog) {
    addMoonObject(moonInfo);
  }

  group.add(
    createDebrisBelt({
      seedLabel: "main-asteroid-belt",
      innerRadius: 22.6,
      outerRadius: 29.6,
      count: 1900,
      colorA: 0x9d8770,
      colorB: 0xe1d1b4,
      ySpread: 0.62,
      size: 0.055,
      opacity: 0.46,
      clumpCount: 11,
    })
  );
  const ceresTextureEntity = { id: "ceres", visualColor: 0xaaa49a, type: "Dwarf Planet" };
  const ceres = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 8),
    createMaterial(
      THREE.MeshStandardMaterial,
      {
        color: getBodyMaterialBaseColor(ceresTextureEntity, 0xaaa49a),
        map: getBodyTexture(ceresTextureEntity),
        bumpMap: getBodyDepthTexture(ceresTextureEntity),
        bumpScale: getBodyBumpScale(ceresTextureEntity) * 0.42,
        emissive: 0x2a2724,
        roughness: getBodyRoughness(ceresTextureEntity),
      },
      1
    )
  );
  ceres.userData.orbit = {
    distance: CERES_SYSTEM_ORBIT_DISTANCE,
    angle: 1.75,
    speed: 0.00017 * Math.pow(EARTH_SYSTEM_ORBIT_DISTANCE / CERES_SYSTEM_ORBIT_DISTANCE, 1.35),
    zScale: 0.72,
  };
  ceres.userData.spin = getSpinFromRotationHours(planetFacts.ceres.rotationHours, 0.018);
  ceres.position.set(
    Math.cos(1.75) * CERES_SYSTEM_ORBIT_DISTANCE,
    0.05,
    Math.sin(1.75) * CERES_SYSTEM_ORBIT_DISTANCE * 0.72
  );
  group.add(ceres);
  registerEntity({
    id: "ceres",
    name: "Ceres",
    type: "Dwarf Planet",
    band: "system",
    object: ceres,
    radius: 0.22,
    hitRadius: 0.95,
    priority: 2.6,
    bodyDetail: true,
    innerZoomFloor: 0,
    visualColor: 0xaaa49a,
    detailScale: getBodyDetailScale("ceres", 0.22, "Dwarf Planet"),
    rotationHours: planetFacts.ceres.rotationHours,
    visualProfile: "ceres",
    meta: "Asteroid belt dwarf planet | compressed orbit model",
    summary: "A named planetoid inside the asteroid belt. Future data can attach actual orbital elements and surface assets.",
    stats: [
      { value: `${planetFacts.ceres.diameterKm} km`, label: "diameter" },
      { value: `${planetFacts.ceres.rotationHours} h`, label: "rotation" },
      { value: "belt", label: "region" },
    ],
    parentId: "sun",
    relation: "dwarf planet",
    scaleHint: "Reference: Ceres rides the asteroid-belt scaffold as a selectable dwarf-planet seed.",
  });

  group.add(
    createDebrisBelt({
      seedLabel: "kuiper-belt",
      innerRadius: 82,
      outerRadius: 104,
      count: 2100,
      colorA: 0x8db9ff,
      colorB: 0xe3f4ff,
      ySpread: 1.35,
      size: 0.07,
      opacity: 0.28,
      clumpCount: 14,
    })
  );

  const plutoTextureEntity = { id: "pluto", visualColor: 0xc7b29c, type: "Dwarf Planet" };
  const pluto = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 8),
    createMaterial(
      THREE.MeshStandardMaterial,
      {
        color: getBodyMaterialBaseColor(plutoTextureEntity, 0xc7b29c),
        map: getBodyTexture(plutoTextureEntity),
        bumpMap: getBodyDepthTexture(plutoTextureEntity),
        bumpScale: getBodyBumpScale(plutoTextureEntity) * 0.42,
        emissive: 0x2a211a,
        roughness: getBodyRoughness(plutoTextureEntity),
      },
      1
    )
  );
  pluto.userData.orbit = {
    distance: PLUTO_SYSTEM_ORBIT_DISTANCE,
    angle: 1.05,
    speed: 0.00017 * Math.pow(EARTH_SYSTEM_ORBIT_DISTANCE / PLUTO_SYSTEM_ORBIT_DISTANCE, 1.35),
    zScale: 0.72,
  };
  pluto.userData.spin = getSpinFromRotationHours(planetFacts.pluto.rotationHours, 0.018);
  pluto.position.set(
    Math.cos(1.05) * PLUTO_SYSTEM_ORBIT_DISTANCE,
    0,
    Math.sin(1.05) * PLUTO_SYSTEM_ORBIT_DISTANCE * 0.72
  );
  group.add(pluto, createSceneGuideRing(PLUTO_SYSTEM_ORBIT_DISTANCE, 0x9fbfff, 0.08, 192, 0.72));
  registerEntity({
    id: "pluto",
    name: "Pluto",
    type: "Dwarf Planet",
    band: "system",
    object: pluto,
    radius: 0.25,
    hitRadius: 1.0,
    priority: 2.4,
    bodyDetail: true,
    innerZoomFloor: 0,
    visualColor: 0xc7b29c,
    detailScale: getBodyDetailScale("pluto", 0.25, "Dwarf Planet"),
    rotationHours: planetFacts.pluto.rotationHours,
    moonCount: planetFacts.pluto.moons,
    visualProfile: "pluto",
    meta: "Kuiper belt dwarf planet | compressed orbit model",
    summary: "A named outer Solar System body included to scaffold dwarf planets and trans-Neptunian objects.",
    stats: [
      { value: `${planetFacts.pluto.diameterKm.toLocaleString()} km`, label: "diameter" },
      { value: `${planetFacts.pluto.rotationHours} h`, label: "rotation" },
      { value: `${planetFacts.pluto.moons}`, label: "known moons" },
    ],
    parentId: "sun",
    relation: "dwarf planet",
    scaleHint: "Reference: Pluto is modeled as an outer-system dwarf planet with its named moon family attached.",
  });

  const getSystemOrbitSpeed = (distance) => 0.00017 * Math.pow(EARTH_SYSTEM_ORBIT_DISTANCE / distance, 1.35);
  const getEclipticPosition = (distance, angle, y = 0, zScale = ECLIPTIC_Z_SCALE) => [
    Math.cos(angle) * distance,
    y,
    Math.sin(angle) * distance * zScale,
  ];
  group.add(createSelectableSmallBodyRingObject({
    id: "main-asteroid-belt-architecture",
    name: "Main Asteroid Belt",
    selectionPosition: getEclipticPosition(CERES_SYSTEM_ORBIT_DISTANCE, 2.35, 0.22),
    innerRadius: 22.6,
    outerRadius: 29.6,
    radius: 2.6,
    color: 0xc7ab83,
    accent: 0xffe0a0,
    kind: "Asteroid Belt",
    hitRadius: 3.8,
    priority: 2.8,
    parentId: "sun",
    relation: "asteroid belt",
    meta: "Solar System small-body architecture | rocky belt",
    summary: "A selectable rocky-belt scaffold embedded in the main asteroid belt near Ceres rather than stranded in the stellar neighborhood.",
    stats: [
      { value: "rocky", label: "bodies" },
      { value: "belt", label: "structure" },
    ],
  }));
  const jupiterTrojanDistance = 32.2;
  const jupiterTrojanSpeed = getSystemOrbitSpeed(jupiterTrojanDistance);
  const jupiterBaseAngle = 3.65;
  const trojanL4 = createTrojanArcArchitectureObject({
    id: "jupiter-trojan-l4-swarm",
    name: "Jupiter Trojan L4 Swarm",
    position: getEclipticPosition(jupiterTrojanDistance, jupiterBaseAngle + Math.PI / 3, 0.34),
    radius: 2.35,
    color: 0xd8b174,
    accent: 0xfff0b8,
    kind: "Trojan Arc",
    hitRadius: 3.2,
    priority: 2.7,
    parentId: "jupiter",
    relation: "leading Trojan swarm",
    meta: "Jupiter Trojan architecture | leading L4 swarm",
    summary: "A leading Trojan population marker traveling with Jupiter's orbital cadence at the L4 region.",
    stats: [
      { value: "L4", label: "region" },
      { value: "swarm", label: "structure" },
    ],
  });
  trojanL4.userData.orbit = {
    distance: jupiterTrojanDistance,
    angle: jupiterBaseAngle + Math.PI / 3,
    speed: jupiterTrojanSpeed,
    zScale: ECLIPTIC_Z_SCALE,
    y: 0.34,
    alignToOrbit: true,
    rotationOffset: Math.PI * 0.5,
  };
  group.add(trojanL4);
  const trojanL5 = createTrojanArcArchitectureObject({
    id: "jupiter-trojan-l5-swarm",
    name: "Jupiter Trojan L5 Swarm",
    position: getEclipticPosition(jupiterTrojanDistance, jupiterBaseAngle - Math.PI / 3, -0.32),
    radius: 2.35,
    color: 0xd0a363,
    accent: 0xfff0b8,
    kind: "Trojan Arc",
    hitRadius: 3.2,
    priority: 2.7,
    parentId: "jupiter",
    relation: "trailing Trojan swarm",
    meta: "Jupiter Trojan architecture | trailing L5 swarm",
    summary: "A trailing Trojan population marker paired with the L4 swarm so Jupiter's co-orbital architecture is legible.",
    stats: [
      { value: "L5", label: "region" },
      { value: "swarm", label: "structure" },
    ],
  });
  trojanL5.userData.orbit = {
    distance: jupiterTrojanDistance,
    angle: jupiterBaseAngle - Math.PI / 3,
    speed: jupiterTrojanSpeed,
    zScale: ECLIPTIC_Z_SCALE,
    y: -0.32,
    alignToOrbit: true,
    rotationOffset: Math.PI * 0.5,
  };
  group.add(trojanL5);
  group.add(createSelectableSmallBodyRingObject({
    id: "kuiper-belt-architecture",
    name: "Kuiper Belt Threshold",
    selectionPosition: getEclipticPosition(PLUTO_SYSTEM_ORBIT_DISTANCE + 7, 2.7, 0.56),
    innerRadius: 82,
    outerRadius: 104,
    radius: 4.8,
    color: 0xb7d8ff,
    accent: 0x87f3ff,
    kind: "Kuiper Belt",
    shape: "threshold",
    count: 2500,
    arcCount: 16,
    arcLength: 0.42,
    arcThickness: 0.32,
    ySpread: 1.45,
    glowScale: 0.08,
    hitRadius: 6.4,
    selectionRadius: 3.1,
    priority: 2.55,
    parentId: "sun",
    relation: "trans-Neptunian belt",
    meta: "Outer Solar System small-body architecture | icy trans-Neptunian region",
    summary: "An icy threshold scaffold stretched around the outer Solar System as braided trans-Neptunian lanes rather than a globular marker.",
    stats: [
      { value: "icy", label: "bodies" },
      { value: "braided belt", label: "structure" },
    ],
  }));
  group.add(createSelectableSmallBodyRingObject({
    id: "oort-cloud-threshold",
    name: "Oort Cloud Threshold",
    selectionPosition: getEclipticPosition(132, 5.2, 2.2, 0.82),
    innerRadius: 114,
    outerRadius: 154,
    radius: 6.2,
    color: 0xc7eaff,
    accent: 0xffffff,
    kind: "Oort Cloud",
    shape: "threshold",
    count: 2200,
    arcCount: 20,
    arcLength: 0.34,
    arcThickness: 0.34,
    ySpread: 5.2,
    zScale: 0.82,
    glowScale: 0.06,
    hitRadius: 7.4,
    selectionRadius: 3.45,
    priority: 2.35,
    parentId: "sun",
    relation: "distant comet reservoir",
    meta: "Solar System small-body architecture | distant comet reservoir threshold",
    summary: "A distant comet-reservoir threshold rendered as sparse braided lanes around the Solar System, not a closed spherical shell.",
    stats: [
      { value: "comets", label: "reservoir" },
      { value: "threshold arcs", label: "structure" },
    ],
  }));

  for (const moonInfo of moonCatalog.filter((moon) => moon.parent === "pluto")) {
    addMoonObject(moonInfo);
  }

  group.add(buildSkyFigureAddressLayer());

  return group;
}

function buildStellarLayer() {
  const bandInfo = getBandByKey("stellar");
  const group = makeLayer("stellar", bandInfo.center, bandInfo.width, 1, new THREE.Group());
  const positions = [];
  const colors = [];

  for (let i = 0; i < 1100; i += 1) {
    const radius = 6 + Math.pow(random(), 0.4) * STELLAR_NEIGHBORHOOD_RADIUS;
    const point = randomOnSphere(radius);
    point.y *= 0.72;
    positions.push(point.x, point.y, point.z);
    reusableColor.setHSL(0.55 + random() * 0.16, 0.48, 0.68 + random() * 0.3);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }

  group.add(createPointCloud({ positions, colors }, 0.17, 0.92, true));
  group.add(createSceneGuideRing(36, 0x9af3ff, 0.1));
  group.add(createSceneGuideRing(88, 0xfff2a0, 0.08));
  group.add(createSceneGuideRing(STELLAR_NEIGHBORHOOD_RADIUS, 0x7db9ff, 0.045));
  group.add(createSolarSystemPortalObject());
  group.add(
    createNebulaObject({
      id: "orion-nebula",
      name: "Orion Nebula",
      band: "stellar",
      position: [92, 18, -30],
      radius: 7.5,
      colorA: 0xff7dc6,
      colorB: 0x62e8ff,
      morphology: "orion",
      orientation: [-0.35, 0.7, 0.2],
      meta: "Emission/reflection nebula | Messier 42",
      summary: "A named star-forming region rendered as a hollow bright core with turbulent surrounding gas.",
    })
  );
  group.add(
    createNebulaObject({
      id: "crab-nebula",
      name: "Crab Nebula",
      band: "stellar",
      position: [70, -54, 68],
      radius: 5.4,
      colorA: 0xffad6d,
      colorB: 0x9feaff,
      morphology: "crab",
      orientation: [0.48, -0.35, 0.16],
      meta: "Supernova remnant | Messier 1 | pulsar nebula",
      summary: "A compact torn remnant with orange-blue filaments and a pulsar-hosting identity.",
    })
  );
  const namedStars = [
    {
      id: "sirius",
      name: "Sirius",
      position: [10, -3, -18],
      radius: 1.1,
      color: 0xddeeff,
      spectral: "white",
      meta: "A-type main-sequence star | brightest night-sky star",
      summary: "A nearby bright-star anchor for stellar-scale navigation.",
    },
    {
      id: "betelgeuse",
      name: "Betelgeuse",
      position: [24, 8, -22],
      radius: 2.7,
      color: 0xff7a42,
      spectral: "red-supergiant",
      meta: "Red supergiant | Orion",
      summary: "A swollen red supergiant marker, visually distinct from compact nearby stars.",
    },
    {
      id: "vega",
      name: "Vega",
      position: [-30, 12, 18],
      radius: 1.25,
      color: 0xcfe8ff,
      spectral: "blue-white",
      meta: "A-type star | Lyra",
      summary: "A bright blue-white stellar anchor for northern-sky orientation.",
    },
    {
      id: "pleiades",
      name: "Pleiades",
      position: [8, 18, 28],
      radius: 2.1,
      color: 0xaedcff,
      spectral: "cluster",
      meta: "Open star cluster | Messier 45",
      summary: "A blue open-cluster marker, carrying a clustered rather than single-star silhouette.",
    },
  ];
  const stellarStarObjects = new Map();
  const addStellarStar = (starInfo) => {
    const starObject = createStarObject({ band: "stellar", ...starInfo });
    stellarStarObjects.set(starInfo.id, starObject);
    group.add(starObject);
    return starObject;
  };
  for (const starInfo of namedStars) {
    addStellarStar(starInfo);
  }
  for (const starInfo of catalogStars) {
    addStellarStar(starInfo);
  }
  for (const figure of SKY_FIGURE_CATALOG) {
    group.add(createSkyFigureStellarOverlay(figure, stellarStarObjects));
  }
  applyMutualBinaryOrbit(
    group,
    stellarStarObjects.get("alpha-centauri-a"),
    stellarStarObjects.get("alpha-centauri-b"),
    { speed: ALPHA_CENTAURI_ORBIT_SPEED, zScale: 0.72, color: 0xffefb4 }
  );
  for (const starInfo of [...namedStars, ...catalogStars]) {
    const diskObject = createStellarHostDiskObject(starInfo);
    if (diskObject) {
      group.add(diskObject);
    }
  }
  const cometObjects = [
    {
      id: "halley-comet",
      name: "Halley's Comet",
      position: [12, -5, 9],
      radius: 0.82,
      color: 0xd8f6ff,
      tailColor: 0x7ddfff,
      meta: "Periodic comet | small-body visitor",
      summary: "A named comet scaffold with separate nucleus, coma, dust tail, and ion tail layers.",
      stats: [
        { value: "periodic", label: "class" },
        { value: "coma/tail", label: "visual" },
      ],
    },
    {
      id: "hale-bopp-comet",
      name: "Hale-Bopp",
      position: [-18, 8, -12],
      radius: 1.05,
      color: 0xf3fbff,
      tailColor: 0x9feaff,
      meta: "Long-period comet | bright dust tail",
      summary: "A larger comet test body, tuned so the tail reads as a structured object instead of a loose smear.",
      stats: [
        { value: "long-period", label: "class" },
        { value: "dust-rich", label: "tail" },
      ],
    },
    {
      id: "borisov-comet",
      name: "2I/Borisov",
      position: [24, 5, -18],
      radius: 0.74,
      color: 0xc8efff,
      tailColor: 0x69d8ff,
      meta: "Interstellar comet | hyperbolic visitor",
      summary: "An interstellar comet scaffold, deliberately colder and narrower than the Solar System comets.",
      stats: [
        { value: "interstellar", label: "origin" },
        { value: "hyperbolic", label: "path" },
      ],
    },
    {
      id: "churyumov-gerasimenko-comet",
      name: "67P/Churyumov-Gerasimenko",
      position: [-28, -4, 18],
      radius: 0.78,
      color: 0xd9eeff,
      tailColor: 0x8bdcff,
      meta: "Jupiter-family comet | Rosetta target",
      summary: "A Rosetta-era comet candidate with an icy-blue coma and compact dust stream.",
      stats: [
        { value: "Jupiter-family", label: "class" },
        { value: "Rosetta", label: "mission" },
      ],
    },
    {
      id: "tempel-1-comet",
      name: "9P/Tempel 1",
      position: [32, -6, 8],
      radius: 0.76,
      color: 0xe4f0ff,
      tailColor: 0x92d8ff,
      meta: "Periodic comet | Deep Impact target",
      summary: "A mission-touched comet body, tuned as a dense, pale visitor with a shorter dusty fan.",
      stats: [
        { value: "periodic", label: "class" },
        { value: "Deep Impact", label: "mission" },
      ],
    },
    {
      id: "wild-2-comet",
      name: "81P/Wild 2",
      position: [-34, 7, -4],
      radius: 0.7,
      color: 0xd6f5ff,
      tailColor: 0x78dcff,
      meta: "Jupiter-family comet | Stardust target",
      summary: "A compact comet candidate with a crisp ion tail, echoing sample-return comet imagery.",
      stats: [
        { value: "Jupiter-family", label: "class" },
        { value: "Stardust", label: "mission" },
      ],
    },
    {
      id: "hartley-2-comet",
      name: "103P/Hartley 2",
      position: [9, 11, -33],
      radius: 0.66,
      color: 0xeaffff,
      tailColor: 0x9ff0ff,
      meta: "Jupiter-family comet | hyperactive nucleus",
      summary: "A smaller hyperactive comet candidate with a bright coma and animated tail emission.",
      stats: [
        { value: "hyperactive", label: "nucleus" },
        { value: "EPOXI", label: "mission" },
      ],
    },
    {
      id: "borrelly-comet",
      name: "19P/Borrelly",
      position: [38, 3, 19],
      radius: 0.82,
      color: 0xd8e9ff,
      tailColor: 0x7bcfff,
      meta: "Jupiter-family comet | Deep Space 1 target",
      summary: "A rugged comet scaffold, colored cooler and built to keep its moving tail legible.",
      stats: [
        { value: "Jupiter-family", label: "class" },
        { value: "Deep Space 1", label: "mission" },
      ],
    },
    {
      id: "encke-comet",
      name: "2P/Encke",
      position: [-8, -8, 36],
      radius: 0.62,
      color: 0xf0f7ff,
      tailColor: 0x9fdfff,
      meta: "Periodic comet | short-period visitor",
      summary: "A short-period comet candidate with a leaner, faster-looking ion thread.",
      stats: [
        { value: "short-period", label: "class" },
        { value: "periodic", label: "orbit" },
      ],
    },
    {
      id: "swift-tuttle-comet",
      name: "109P/Swift-Tuttle",
      position: [18, 12, 36],
      radius: 0.98,
      color: 0xfff6e2,
      tailColor: 0xbfefff,
      meta: "Periodic comet | Perseids parent",
      summary: "A larger periodic comet candidate, warm at the coma and bright enough to read as a major meteor-stream parent.",
      stats: [
        { value: "Perseids", label: "stream" },
        { value: "periodic", label: "orbit" },
      ],
    },
    {
      id: "tempel-tuttle-comet",
      name: "55P/Tempel-Tuttle",
      position: [-21, 13, -31],
      radius: 0.72,
      color: 0xf4fbff,
      tailColor: 0xa8e8ff,
      meta: "Periodic comet | Leonids parent",
      summary: "A meteor-stream parent comet candidate with a fine, pale-blue emission trail.",
      stats: [
        { value: "Leonids", label: "stream" },
        { value: "periodic", label: "orbit" },
      ],
    },
    {
      id: "giacobini-zinner-comet",
      name: "21P/Giacobini-Zinner",
      position: [41, -2, -28],
      radius: 0.68,
      color: 0xe7fff5,
      tailColor: 0x8fffe5,
      meta: "Periodic comet | Draconids parent",
      summary: "A green-tinted comet candidate, giving the roster another meteor-shower lineage.",
      stats: [
        { value: "Draconids", label: "stream" },
        { value: "periodic", label: "orbit" },
      ],
    },
    {
      id: "neowise-comet",
      name: "C/2020 F3 NEOWISE",
      position: [-38, 2, 28],
      radius: 0.88,
      color: 0xf5fbff,
      tailColor: 0x7fe3ff,
      meta: "Long-period comet | bright modern visitor",
      summary: "A bright recent comet candidate with a wider dust fan and cold ion filament.",
      stats: [
        { value: "long-period", label: "class" },
        { value: "2020", label: "apparition" },
      ],
    },
    {
      id: "siding-spring-comet",
      name: "C/2013 A1 Siding Spring",
      position: [6, -13, 42],
      radius: 0.74,
      color: 0xe3f3ff,
      tailColor: 0x8cdcff,
      meta: "Oort-cloud comet | Mars flyby",
      summary: "An Oort-cloud visitor candidate, staged as a rare deep-reservoir body crossing the neighborhood.",
      stats: [
        { value: "Oort-cloud", label: "origin" },
        { value: "Mars flyby", label: "event" },
      ],
    },
    {
      id: "ison-comet",
      name: "C/2012 S1 ISON",
      position: [-43, -5, -22],
      radius: 0.8,
      color: 0xfff7ea,
      tailColor: 0xbdefff,
      meta: "Sungrazing comet | disrupted visitor",
      summary: "A dramatic sungrazer candidate with a warmer coma and more volatile-looking tail motion.",
      stats: [
        { value: "sungrazer", label: "class" },
        { value: "disrupted", label: "fate" },
      ],
    },
    {
      id: "wirtanen-comet",
      name: "46P/Wirtanen",
      position: [45, 8, 3],
      radius: 0.64,
      color: 0xdcfff6,
      tailColor: 0x8cf5de,
      meta: "Jupiter-family comet | close flyby candidate",
      summary: "A compact green-white comet candidate with a close-coma visual language.",
      stats: [
        { value: "Jupiter-family", label: "class" },
        { value: "coma-rich", label: "visual" },
      ],
    },
    {
      id: "schwassmann-wachmann-1-comet",
      name: "29P/Schwassmann-Wachmann 1",
      position: [-46, 10, 10],
      radius: 0.95,
      color: 0xe8f3ff,
      tailColor: 0xaad6ff,
      meta: "Centaur comet | outburst-prone body",
      summary: "A large outbursting comet candidate, tuned as a distant active centaur with a heavier coma.",
      stats: [
        { value: "centaur", label: "class" },
        { value: "outbursts", label: "behavior" },
      ],
    },
    {
      id: "mcnaught-comet",
      name: "C/2006 P1 McNaught",
      position: [24, -14, -42],
      radius: 1.02,
      color: 0xffefd2,
      tailColor: 0xaeeaff,
      meta: "Great comet | structured dust tail",
      summary: "A great-comet candidate with a brighter, dustier fan for rare luminous passages.",
      stats: [
        { value: "great comet", label: "class" },
        { value: "striated", label: "tail" },
      ],
    },
    {
      id: "pons-brooks-comet",
      name: "12P/Pons-Brooks",
      position: [-12, 15, 46],
      radius: 0.9,
      color: 0xeafff2,
      tailColor: 0x88ffd8,
      meta: "Halley-type comet | outbursting periodic body",
      summary: "A Halley-type comet candidate with a green coma and lively outburst-flavored tail.",
      stats: [
        { value: "Halley-type", label: "class" },
        { value: "outbursts", label: "behavior" },
      ],
    },
  ];
  for (const comet of cometObjects) {
    group.add(createCometObject({ band: "stellar", ...comet }));
  }
  const exoplanetSystems = [
    {
      id: "trappist-1-system",
      name: "TRAPPIST-1",
      position: [-18, 10, 32],
      radius: 0.72,
      color: 0xff8b62,
      meta: "Ultra-cool red dwarf | seven Earth-size rocky planets",
      summary: "A compact exoplanet-system miniature. NASA/JPL treats TRAPPIST-1 as a key nearby laboratory for rocky worlds around red dwarfs.",
      stats: [
        { value: "7", label: "rocky planets" },
        { value: "41 ly", label: "distance" },
        { value: "3", label: "HZ candidates" },
        { value: "2017", label: "NASA announcement" },
      ],
      planets: [
        { id: "trappist-1-b", name: "TRAPPIST-1 b", type: "Rocky Exoplanet", color: 0xb86b55, radiusScale: 0.16, periodDays: 1.51, phase: 0.1, sourceBodyId: "exoplanet-cratered-red", meta: "Earth-size exoplanet | close orbit", summary: "The innermost known TRAPPIST-1 world, rendered as a hot rocky bead in a tightly packed system.", stats: [{ value: "1.51 d", label: "orbit" }] },
        { id: "trappist-1-c", name: "TRAPPIST-1 c", type: "Rocky Exoplanet", color: 0xc58564, radiusScale: 0.17, periodDays: 2.42, phase: 1.0, sourceBodyId: "exoplanet-cratered-orange", meta: "Earth-size exoplanet | compact resonant system", summary: "A second close rocky planet, included to show the unusually packed rhythm of TRAPPIST-1.", stats: [{ value: "2.42 d", label: "orbit" }] },
        { id: "trappist-1-d", name: "TRAPPIST-1 d", type: "Rocky Exoplanet", color: 0xd7a678, radiusScale: 0.15, periodDays: 4.05, phase: 2.1, habitable: true, sourceBodyId: "exoplanet-earthlike-pangaeic", meta: "Rocky exoplanet | inner habitable-zone candidate", summary: "One of the TRAPPIST-1 worlds often discussed in habitability studies, rendered with the system's gold orbital cue.", stats: [{ value: "4.05 d", label: "orbit" }] },
        { id: "trappist-1-e", name: "TRAPPIST-1 e", type: "Rocky Exoplanet", color: 0x83b8a8, radiusScale: 0.16, periodDays: 6.1, phase: 3.0, habitable: true, sourceBodyId: "exoplanet-earthlike-archipelago", meta: "Rocky exoplanet | habitable-zone candidate", summary: "A temperate candidate in the TRAPPIST-1 chain, highlighted as a green-blue worldlet.", stats: [{ value: "6.10 d", label: "orbit" }] },
        { id: "trappist-1-f", name: "TRAPPIST-1 f", type: "Rocky Exoplanet", color: 0x8cc6d4, radiusScale: 0.17, periodDays: 9.21, phase: 4.0, habitable: true, sourceBodyId: "exoplanet-ocean-dark", meta: "Rocky exoplanet | habitable-zone candidate", summary: "A cooler TRAPPIST-1 candidate, kept legible in the outer part of the compact orbital chain.", stats: [{ value: "9.21 d", label: "orbit" }] },
        { id: "trappist-1-g", name: "TRAPPIST-1 g", type: "Rocky Exoplanet", color: 0xa2b5dd, radiusScale: 0.18, periodDays: 12.35, phase: 5.1, sourceBodyId: "exoplanet-icy-moon-red", meta: "Rocky exoplanet | outer compact orbit", summary: "One of the outer larger TRAPPIST-1 worlds, shown with a cooler hue.", stats: [{ value: "12.35 d", label: "orbit" }] },
        { id: "trappist-1-h", name: "TRAPPIST-1 h", type: "Rocky Exoplanet", color: 0xb2c8ef, radiusScale: 0.13, periodDays: 18.77, phase: 5.8, sourceBodyId: "exoplanet-icy-moon-giant-alt", meta: "Rocky exoplanet | outer known planet", summary: "The outermost known TRAPPIST-1 planet, closing the seven-world chain.", stats: [{ value: "18.77 d", label: "orbit" }] },
      ],
    },
    {
      id: "proxima-centauri-system",
      name: "Proxima Centauri System",
      position: [-14, -4, 18],
      radius: 0.58,
      color: 0xff704a,
      meta: "Nearest stellar neighbor | confirmed super-Earth candidate",
      summary: "A close red-dwarf system anchored by Proxima Centauri b, our nearest known exoplanet neighbor.",
      stats: [
        { value: "4 ly", label: "distance" },
        { value: "M star", label: "host type" },
        { value: "11.2 d", label: "Proxima b orbit" },
        { value: "RV", label: "method" },
      ],
      planets: [
        { id: "proxima-centauri-b", name: "Proxima Centauri b", type: "Super Earth", color: 0x8bc4a6, radiusScale: 0.2, periodDays: 11.2, phase: 1.8, habitable: true, meta: "Super Earth | 11.2-day orbit | radial velocity", summary: "The nearest known exoplanet neighbor, rendered as a compact temperate candidate around a volatile red dwarf.", stats: [{ value: "1.07 M Earth", label: "mass" }, { value: "0.0485 AU", label: "orbit radius" }] },
      ],
    },
    {
      id: "kepler-186-system",
      name: "Kepler-186 System",
      position: [36, -13, 26],
      radius: 0.84,
      color: 0xff9b68,
      meta: "M-type star | Kepler rocky-planet system",
      summary: "A Kepler system scaffold centered on Kepler-186 f, the famous small habitable-zone world.",
      stats: [
        { value: "2014", label: "discovery" },
        { value: "Transit", label: "method" },
        { value: "129.9 d", label: "f orbit" },
        { value: "1.17 R Earth", label: "f radius" },
      ],
      planets: [
        { id: "kepler-186-f", name: "Kepler-186 f", type: "Super Earth", color: 0x6ec0a0, radiusScale: 0.2, periodDays: 129.9, phase: 0.6, habitable: true, orbitBias: 1.15, meta: "Super Earth | habitable-zone planet | transit", summary: "A landmark Kepler world: Earth-size scale, long orbit, and a restrained green cue for habitability discussion.", stats: [{ value: "129.9 d", label: "orbit" }, { value: "0.432 AU", label: "orbit radius" }] },
      ],
    },
    {
      id: "fifty-one-pegasi-system",
      name: "51 Pegasi System",
      position: [30, 14, -30],
      radius: 0.92,
      color: 0xfff0b8,
      meta: "Sun-like star | first confirmed planet around a Sun-like star",
      summary: "A milestone exoplanet system, showing the hot-Jupiter surprise that cracked open modern exoplanet science.",
      stats: [
        { value: "1995", label: "discovery" },
        { value: "4.2 d", label: "orbit" },
        { value: "0.46 M Jup", label: "planet mass" },
        { value: "RV", label: "method" },
      ],
      planets: [
        { id: "fifty-one-pegasi-b", name: "51 Pegasi b", type: "Hot Jupiter", color: 0xffd07a, radiusScale: 0.3, periodDays: 4.2, phase: 2.5, hotJupiter: true, meta: "Gas giant | 4.2-day orbit | radial velocity", summary: "The original hot-Jupiter shock: a gas giant on a scorchingly tight orbit around a Sun-like star.", stats: [{ value: "0.0527 AU", label: "orbit radius" }, { value: "1.27 R Jup", label: "radius est." }] },
      ],
    },
  ];
  for (const system of exoplanetSystems) {
    group.add(createExoplanetSystemObject(system));
  }
  for (const system of catalogExoplanetSystems) {
    group.add(createExoplanetSystemObject(system));
  }
  const extraNebulae = [
    {
      id: "lagoon-nebula",
      name: "Lagoon Nebula",
      position: [-4, -78, 72],
      radius: 6.8,
      colorA: 0xff8d9e,
      colorB: 0x84f4ff,
      morphology: "lagoon",
      orientation: [0.24, -0.55, 0.72],
      meta: "Emission nebula | Messier 8",
      summary: "A broad star-forming nebula with a warm dust lane, embedded cluster, and bright central hourglass relief.",
    },
    {
      id: "eagle-nebula",
      name: "Eagle Nebula",
      position: [-84, -12, 40],
      radius: 6.2,
      colorA: 0xffc06a,
      colorB: 0x79e6ff,
      meta: "Emission nebula | Messier 16",
      summary: "A stellar nursery marker, eventually meant for pillar-like sculptural structure.",
    },
    {
      id: "ring-nebula",
      name: "Ring Nebula",
      position: [-40, 82, -70],
      radius: 4.5,
      colorA: 0x8affc8,
      colorB: 0x7aa8ff,
      meta: "Planetary nebula | Messier 57",
      summary: "A compact planetary-nebula anchor, visually distinct from diffuse star-forming clouds.",
    },
    {
      id: "horsehead-nebula",
      name: "Horsehead Nebula",
      position: [104, -12, -56],
      radius: 4.9,
      colorA: 0x5d2e27,
      colorB: 0xff8d5f,
      meta: "Dark nebula | Orion molecular cloud complex",
      summary: "A silhouetted dark-nebula marker, kept warm and smoky instead of blue-white.",
    },
    {
      id: "helix-nebula",
      name: "Helix Nebula",
      position: [76, -72, -18],
      radius: 5.5,
      colorA: 0x7affd0,
      colorB: 0xff7bb0,
      meta: "Planetary nebula | dying star shell",
      summary: "A planetary-nebula scaffold, using a rounded shell vocabulary for future ring/eye structure.",
    },
    {
      id: "cats-eye-nebula",
      name: "Cat's Eye Nebula",
      position: [-82, 58, -36],
      radius: 3.9,
      colorA: 0x8afff0,
      colorB: 0x7a8cff,
      meta: "Planetary nebula | nested shells",
      summary: "A compact nested-shell nebula anchor, intended to contrast against broad emission clouds.",
    },
    {
      id: "rosette-nebula",
      name: "Rosette Nebula",
      position: [8, 86, 54],
      radius: 6.4,
      colorA: 0xff8fb6,
      colorB: 0x83f2ff,
      meta: "Emission nebula | open-cluster cavity",
      summary: "A broad floral emission nebula with a hollow-shell star-cluster cavity.",
    },
  ];
  for (const nebula of extraNebulae) {
    group.add(createNebulaObject({ band: "stellar", ...nebula }));
  }
  for (const nebula of catalogNebulae) {
    group.add(createNebulaObject({ band: "stellar", ...nebula }));
  }
  const darkCloudObjects = [
    {
      id: "barnard-68",
      name: "Barnard 68",
      position: [-62, 28, 44],
      radius: 5.2,
      color: 0x3a2456,
      rimColor: 0x82e8ff,
      meta: "Bok globule | dark molecular cloud",
      summary: "A cold, opaque cloud test body: a rim-lit absence rather than another bright emission nebula.",
      stats: [
        { value: "Bok globule", label: "class" },
        { value: "cold dust", label: "visual" },
      ],
    },
    {
      id: "coalsack-dark-nebula",
      name: "Coalsack Dark Nebula",
      position: [54, -62, -36],
      radius: 6.8,
      color: 0x261b38,
      rimColor: 0x94f0ff,
      meta: "Dark nebula | molecular dust complex",
      summary: "A broader dark-nebula scaffold, kept sparse and cold so it contrasts against the luminous nebula family.",
      stats: [
        { value: "dark nebula", label: "class" },
        { value: "absorption", label: "visual" },
      ],
    },
  ];
  for (const cloud of darkCloudObjects) {
    group.add(createDarkCloudObject({ band: "stellar", ...cloud }));
  }
  group.add(
    createPillarsObject({
      id: "pillars-of-creation",
      name: "Pillars of Creation",
      band: "stellar",
      position: [-98, -30, 54],
      radius: 5.6,
      meta: "M16 | Eagle Nebula | sculpted star-forming gas and dust",
      summary: "Three-dimensional pillar relief inspired by Hubble/Webb imagery: dark dusty trunks, colored emission rims, and embedded newborn-star cues.",
    })
  );
  return group;
}

function buildGalaxyLayer() {
  const bandInfo = getBandByKey("galaxy");
  const group = makeLayer("galaxy", bandInfo.center, bandInfo.width, 1, new THREE.Group());
  const positions = [];
  const colors = [];
  const arms = 4;
  const discRadius = 78 * GALAXY_LAYER_SPACING_SCALE;

  for (let i = 0; i < 9200; i += 1) {
    const arm = i % arms;
    const r = Math.pow(random(), 0.56) * discRadius;
    const spin = (r / GALAXY_LAYER_SPACING_SCALE) * 0.19;
    const angle = (arm / arms) * Math.PI * 2 + spin + (random() - 0.5) * 0.63;
    const height = (random() - 0.5) * (1.8 + r * 0.036);
    positions.push(Math.cos(angle) * r, height, Math.sin(angle) * r * GALAXY_DISC_Z_SCALE);
    reusableColor.setHSL(0.55 + random() * 0.08, 0.56, 0.52 + random() * 0.24);
    if (r < 10 * GALAXY_LAYER_SPACING_SCALE) reusableColor.setHSL(0.12, 0.74, 0.54);
    colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }

  const points = createPointCloud({ positions, colors }, 0.165, 0.66, true);
  group.add(points);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(2.45, 48, 24),
    createMaterial(
      THREE.MeshBasicMaterial,
      { color: 0xffd08a },
      0.42
    )
  );
  group.add(core, createGlowSphere(3.25, 0xffd27a, 0.012));
  registerEntity({
    id: "milky-way-core",
    name: "Milky Way Core",
    type: "Galactic Nucleus",
    band: "galaxy",
    object: core,
    radius: 4.2,
    hitRadius: 7.5,
    priority: 4,
    meta: "Spiral galaxy center | Milky Way bulge",
    summary: "The bright central region of the local galaxy-scale model, anchored by Sagittarius A* and dense old-star structure.",
  });
  group.add(
    createBlackHoleObject({
      id: "sagittarius-a",
      name: "Sagittarius A*",
      band: "galaxy",
      position: [0, 0.4, 0],
      radius: 1.6,
      meta: "Supermassive black hole | Milky Way center",
      summary: "A named black-hole anchor at the Galactic Center with pixelated accretion and distortion grammar.",
    })
  );
  const localNeighborhood = new THREE.Group();
  localNeighborhood.position.set(...getGalaxyLayerPosition([34, 2, -22]));
  localNeighborhood.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 24, 12),
      createMaterial(THREE.MeshBasicMaterial, { color: 0xffe6a4 }, 0.82)
    )
  );
  localNeighborhood.add(createGlowSphere(0.76, 0xfff0a8, 0.008));
  localNeighborhood.add(createSceneGuideRing(2.55, 0xfff0a8, 0.052, 128, 0.72));
  const localStarPositions = [];
  const localStarColors = [];
  const localRandom = seededRandom(42042);
  for (let i = 0; i < 90; i += 1) {
    const radius = 0.4 + Math.pow(localRandom(), 0.5) * 7.2;
    const point = randomOnSphere(radius);
    point.y *= 0.38;
    localStarPositions.push(point.x, point.y, point.z);
    reusableColor.setHSL(0.54 + localRandom() * 0.12, 0.45, 0.68 + localRandom() * 0.24);
    if (i % 9 === 0) reusableColor.setHSL(0.1, 0.85, 0.72);
    localStarColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }
  const localStars = createPointCloud({ positions: localStarPositions, colors: localStarColors }, 0.075, 0.58, true);
  localStars.userData.spinVector = new THREE.Vector3(0.00002, 0.00018, 0.00003);
  localNeighborhood.add(localStars);
  group.add(localNeighborhood);
  registerEntity({
    id: "solar-neighborhood",
    name: "Solar Neighborhood",
    type: "Local Galactic Address",
    band: "galaxy",
    object: localNeighborhood,
    radius: 3.4,
    hitRadius: 6.2,
    priority: 5.4,
    innerZoomFloor: getBandByKey("stellar").center,
    portalTargetBand: "stellar",
    meta: "Orion Arm / Local Arm | home region in the Milky Way disk",
    summary: "Our galactic address marker, offset from the Milky Way core in the disk. This is the place to enter the stellar-neighborhood view from galaxy scale.",
    stats: [
      { value: "Orion Arm", label: "local arm" },
      { value: "disk", label: "galaxy region" },
      { value: "home", label: "reference" },
      { value: "portal", label: "zoom role" },
    ],
    scaleHint: "Reference: this marker keeps galaxy travel pointed toward our local arm rather than Sagittarius A*.",
  });
  const galacticObjects = [
    {
      id: "carina-nebula",
      name: "Carina Nebula",
      kind: "irregular",
      position: getGalaxyLayerPosition([-38, 12, 24]),
      radius: 5.8,
      color: 0xff9ab8,
      meta: "Large emission nebula | Milky Way object",
      summary: "A luminous star-forming complex scaffold for later high-detail nebular regions.",
    },
    {
      id: "omega-centauri",
      name: "Omega Centauri",
      kind: "elliptical",
      position: getGalaxyLayerPosition([36, -10, 18]),
      radius: 4.8,
      color: 0xffe4bb,
      meta: "Globular cluster | Milky Way halo",
      summary: "A dense old-star cluster marker, visually distinct from spiral structure.",
    },
    {
      id: "cygnus-x-1",
      name: "Cygnus X-1",
      band: "galaxy",
      position: getGalaxyLayerPosition([-18, -6, -28]),
      radius: 0.9,
      meta: "Stellar-mass black hole candidate | X-ray binary",
      summary: "A compact black-hole anchor inside the galaxy-scale layer, useful for testing non-supermassive objects.",
    },
  ];
  group.add(
    createNebulaObject({
      id: "carina-nebula",
      name: "Carina Nebula",
      band: "galaxy",
      position: galacticObjects[0].position,
      radius: galacticObjects[0].radius,
      colorA: 0xff9ab8,
      colorB: 0x84ecff,
      meta: galacticObjects[0].meta,
      summary: galacticObjects[0].summary,
    })
  );
  group.add(
    createStarObject({
      id: "omega-centauri",
      name: "Omega Centauri",
      band: "galaxy",
      position: galacticObjects[1].position,
      radius: galacticObjects[1].radius,
      color: galacticObjects[1].color,
      spectral: "cluster",
      objectType: "Globular Cluster",
      meta: galacticObjects[1].meta,
      summary: galacticObjects[1].summary,
    })
  );
  group.add(
    createXRayBinaryObject({
      ...galacticObjects[2],
      donorColor: 0x9fdfff,
      color: 0xa8f4ff,
      stats: [
        { value: "X-ray", label: "class" },
        { value: "black-hole", label: "compact object" },
      ],
      summary: "A black-hole X-ray binary anchor: donor star, accretion bridge, compact core, and shock wake in one inspectable object.",
    })
  );
  const pulsarObjects = [
    {
      id: "crab-pulsar",
      name: "Crab Pulsar",
      position: getGalaxyLayerPosition([-42, 4, -12]),
      radius: 0.88,
      color: 0x9feaff,
      meta: "Neutron star / pulsar | Messier 1 remnant",
      summary: "A compact rotating-beam anchor representing one of the galaxy layer's lighthouse-like stellar remnants.",
      stats: [
        { value: "33 ms", label: "period" },
        { value: "pulsar", label: "remnant" },
      ],
    },
    {
      id: "vela-pulsar",
      name: "Vela Pulsar",
      position: getGalaxyLayerPosition([18, 6, -42]),
      radius: 0.78,
      color: 0xb9f8ff,
      meta: "Neutron star / pulsar | Vela remnant",
      summary: "A second pulsar anchor, included so the galaxy-scale disk has a clear family of rotating beacon objects.",
      stats: [
        { value: "89 ms", label: "period" },
        { value: "pulsar", label: "remnant" },
      ],
    },
  ];
  for (const pulsar of pulsarObjects) {
    group.add(createPulsarObject({ band: "galaxy", ...pulsar }));
  }
  const compactRemnantObjects = [
    {
      id: "rx-j1856-neutron-star",
      name: "RX J1856.5-3754",
      position: getGalaxyLayerPosition([-54, -8, 20]),
      radius: 0.72,
      color: 0xbff8ff,
      meta: "Isolated neutron star | thermal compact remnant",
      summary: "A quiet neutron-star reference: hard core, thermal surface speckles, and only a weak magnetosphere.",
      stats: [
        { value: "isolated", label: "class" },
        { value: "thermal", label: "signature" },
      ],
    },
    {
      id: "swift-j1818-magnetar",
      name: "Swift J1818.0-1607",
      position: getGalaxyLayerPosition([22, -18, -48]),
      radius: 0.82,
      color: 0xffa8dc,
      meta: "Young magnetar | high-field neutron star",
      summary: "A young high-field neutron-star subclass, staged with fractured magnetic loops and hot burst knots.",
      stats: [
        { value: "magnetar", label: "class" },
        { value: "young", label: "signature" },
      ],
    },
    {
      id: "one-e-2259-magnetar",
      name: "1E 2259+586",
      position: getGalaxyLayerPosition([-30, 8, 26]),
      radius: 0.78,
      color: 0xffc0df,
      meta: "Magnetar | neutron star | supernova-remnant association",
      summary: "A softer pink magnetar test body, deliberately between ordinary pulsar beacon and supernova shell grammar.",
      stats: [
        { value: "magnetar", label: "class" },
        { value: "remnant", label: "context" },
      ],
    },
  ];
  for (const remnant of compactRemnantObjects) {
    group.add(
      remnant.meta.toLowerCase().includes("magnetar")
        ? createMagnetarObject({ band: "galaxy", ...remnant })
        : createNeutronStarObject({ band: "galaxy", ...remnant })
    );
  }
  const xRayBinaryObjects = [
    {
      id: "scorpius-x-1",
      name: "Scorpius X-1",
      position: getGalaxyLayerPosition([34, -8, 40]),
      radius: 0.94,
      color: 0xb6f8ff,
      donorColor: 0xffb06e,
      meta: "Low-mass X-ray binary | neutron-star accretor",
      summary: "A bright accreting neutron-star binary scaffold, using a warmer donor and a hard blue X-ray core.",
      stats: [
        { value: "LMXB", label: "class" },
        { value: "neutron star", label: "accretor" },
      ],
    },
    {
      id: "ss-433-xray-binary",
      name: "SS 433",
      position: getGalaxyLayerPosition([-34, -5, 30]),
      radius: 0.9,
      color: 0x9feaff,
      donorColor: 0xffd08a,
      meta: "Microquasar | X-ray binary | relativistic jets",
      summary: "A jetting accretion system with binary anatomy visible, promoted beyond a generic black-hole marker.",
      stats: [
        { value: "microquasar", label: "class" },
        { value: "jets", label: "signature" },
      ],
    },
  ];
  for (const binary of xRayBinaryObjects) {
    group.add(createXRayBinaryObject({ band: "galaxy", ...binary }));
  }
  const supernovaObjects = [
    {
      id: "cassiopeia-a",
      name: "Cassiopeia A",
      position: getGalaxyLayerPosition([-30, 10, 34]),
      radius: 2.2,
      color: 0xffb27c,
      meta: "Supernova remnant | Milky Way",
      summary: "A rare galaxy-scale supernova-remnant anchor, tuned as a shimmering shell rather than a generic star.",
      stats: [
        { value: "remnant", label: "class" },
        { value: "radio/X-ray", label: "future data" },
      ],
    },
    {
      id: "keplers-supernova",
      name: "Kepler's Supernova",
      position: getGalaxyLayerPosition([45, -2, -4]),
      radius: 1.8,
      color: 0xffe08f,
      meta: "Supernova remnant | SN 1604",
      summary: "A historical supernova-remnant marker that gives the galaxy layer a rarer transient vocabulary.",
      stats: [
        { value: "SN 1604", label: "event" },
        { value: "remnant", label: "class" },
      ],
    },
  ];
  for (const supernova of supernovaObjects) {
    group.add(createSupernovaObject({ band: "galaxy", ...supernova }));
  }
  for (const galacticObject of catalogGalacticObjects) {
    if (galacticObject.id === "ss-433") {
      continue;
    }
    const spacedObject = {
      ...galacticObject,
      position: getGalaxyLayerPosition(galacticObject.position),
    };
    if (galacticObject.family === "black-hole") {
      if (galacticObject.id === "ss-433" || `${galacticObject.meta ?? ""}`.toLowerCase().includes("x-ray binary")) {
        group.add(createXRayBinaryObject({ band: "galaxy", ...spacedObject }));
      } else {
        group.add(createBlackHoleObject({ band: "galaxy", ...spacedObject }));
      }
    } else if (galacticObject.family === "pulsar") {
      if (`${galacticObject.meta ?? ""} ${galacticObject.summary ?? ""}`.toLowerCase().includes("magnetar")) {
        group.add(createMagnetarObject({
          band: "galaxy",
          ...spacedObject,
          summary: "A catalog magnetar now rendered with fractured magnetosphere loops and burst-knot motion instead of ordinary pulsar beams.",
        }));
      } else if (`${galacticObject.meta ?? ""} ${galacticObject.summary ?? ""}`.toLowerCase().includes("neutron star") && !`${galacticObject.meta ?? ""}`.toLowerCase().includes("pulsar")) {
        group.add(createNeutronStarObject({ band: "galaxy", ...spacedObject }));
      } else {
        group.add(createPulsarObject({ band: "galaxy", ...spacedObject }));
      }
    } else if (galacticObject.family === "magnetar") {
      group.add(createMagnetarObject({ band: "galaxy", ...spacedObject }));
    } else if (galacticObject.family === "neutron-star") {
      group.add(createNeutronStarObject({ band: "galaxy", ...spacedObject }));
    } else if (galacticObject.family === "x-ray-binary") {
      group.add(createXRayBinaryObject({ band: "galaxy", ...spacedObject }));
    } else if (galacticObject.family === "supernova") {
      group.add(createSupernovaObject({ band: "galaxy", ...spacedObject }));
    } else if (galacticObject.family === "nebula") {
      group.add(createNebulaObject({ band: "galaxy", ...spacedObject }));
    } else if (galacticObject.family === "cluster") {
      group.add(
        createStarObject({
          band: "galaxy",
          spectral: "cluster",
          ...spacedObject,
        })
      );
    } else if (galacticObject.family === "quasar") {
      group.add(createQuasarObject({ band: "galaxy", ...spacedObject }));
    }
  }
  return group;
}

function buildClusterLayer() {
  const group = makeLayer("cluster", 4.75, 1.25, 1, new THREE.Group());

  const clusterKinds = ["spiral", "elliptical", "irregular", "barred"];
  const clusterColors = [0xb6f2ff, 0xffddb6, 0xd7c2ff, 0x9ff5e8, 0xffc3d7];
  const namedGalaxySeeds = [
    { id: "bodes-galaxy", name: "Bode's Galaxy", kind: "spiral", color: 0xc7eeff, meta: "Spiral galaxy | Messier 81", summary: "A bright nearby spiral-galaxy anchor, useful as a future detailed disk and companion-system target." },
    { id: "cigar-galaxy", name: "Cigar Galaxy", kind: "irregular", color: 0xffb27c, meta: "Starburst galaxy | Messier 82", summary: "A compact starburst anchor, eventually suited for superwind plumes and turbulent red emission." },
    { id: "black-eye-galaxy", name: "Black Eye Galaxy", kind: "spiral", color: 0xd9eaff, meta: "Spiral galaxy | Messier 64", summary: "A named spiral with a dark-dust identity, useful for future asymmetric lane treatment." },
    { id: "sunflower-galaxy", name: "Sunflower Galaxy", kind: "spiral", color: 0xffe5a8, meta: "Flocculent spiral galaxy | Messier 63", summary: "A patchy spiral anchor that can later carry fragmented star-forming arm detail." },
    { id: "southern-pinwheel", name: "Southern Pinwheel Galaxy", kind: "barred", color: 0xb8f3ff, meta: "Barred spiral galaxy | Messier 83", summary: "A barred spiral target with a bright core and strong arms, distinct from the face-on Pinwheel." },
    { id: "fireworks-galaxy", name: "Fireworks Galaxy", kind: "spiral", color: 0xffc8d8, meta: "Intermediate spiral galaxy | NGC 6946", summary: "A supernova-rich galaxy anchor, included for later transient-event and starburst annotations." },
    { id: "silver-dollar-galaxy", name: "Silver Dollar Galaxy", kind: "spiral", color: 0xbdeeff, meta: "Sculptor Galaxy | NGC 253", summary: "A bright starburst galaxy seed, intended for dusty, elongated disk treatment." },
    { id: "ngc-1300", name: "NGC 1300", kind: "barred", color: 0xffdab0, meta: "Barred spiral galaxy | Eridanus", summary: "A clean barred-spiral morphology anchor for comparing galaxy arm structure." },
    { id: "ngc-1365", name: "NGC 1365", kind: "barred", color: 0xffc59e, meta: "Great barred spiral galaxy | Fornax", summary: "A large barred spiral seed, useful for later active-core and dust-lane detail." },
    { id: "hoags-object", name: "Hoag's Object", kind: "elliptical", color: 0xffefc9, meta: "Ring galaxy | peculiar object", summary: "A rare ring-galaxy anchor, deliberately included to break the ordinary spiral/elliptical rhythm." },
    { id: "tadpole-galaxy", name: "Tadpole Galaxy", kind: "irregular", color: 0x9ff5e8, meta: "Disrupted spiral galaxy | tidal tail", summary: "A collision-shaped galaxy seed, intended for later long-tail morphology." },
    { id: "antennae-galaxies", name: "Antennae Galaxies", kind: "irregular", color: 0xffc7a8, meta: "Interacting galaxies | NGC 4038/4039", summary: "A merger anchor for future twin-core and tidal-tail treatment." },
    { id: "mayalls-object", name: "Mayall's Object", kind: "irregular", color: 0xd0c2ff, meta: "Collisional ring galaxy | Arp 148", summary: "A peculiar interacting system seed, useful for expanding beyond classic Hubble-sequence forms." },
    { id: "little-sombrero", name: "Little Sombrero Galaxy", kind: "barred", color: 0xffe0b8, meta: "Spiral galaxy | NGC 7814", summary: "An edge-on dust-lane anchor, a smaller cousin to the Sombrero-style silhouette." },
    { id: "markarian-231", name: "Markarian 231", kind: "elliptical", color: 0xffd3c8, typeLabel: "Quasar Host Galaxy", activeCore: true, meta: "Quasar host galaxy | luminous infrared galaxy", summary: "An active-galaxy anchor, useful for later AGN and outflow visualization." },
    { id: "messier-49", name: "Messier 49", kind: "elliptical", color: 0xffdfb8, meta: "Elliptical galaxy | Virgo Cluster", summary: "A massive elliptical Virgo-region anchor, good for balancing the spiral-heavy field." },
    { id: "messier-60", name: "Messier 60", kind: "elliptical", color: 0xffd9ad, meta: "Elliptical galaxy | Virgo Cluster", summary: "A bright elliptical anchor, included as another local-cluster mass concentration." },
    { id: "messier-94", name: "Messier 94", kind: "spiral", color: 0xc8f1ff, meta: "Spiral galaxy | starburst ring", summary: "A compact spiral with ring-like star formation, ideal for future nested-ring detail." },
    { id: "needle-galaxy", name: "Needle Galaxy", kind: "barred", color: 0xd8efff, meta: "Edge-on spiral galaxy | NGC 4565", summary: "A thin edge-on galaxy seed, included to make the cluster field less uniformly face-on." },
    { id: "stephans-quintet", name: "Stephan's Quintet", kind: "irregular", color: 0xffd6b6, meta: "Compact galaxy group | interacting system", summary: "A clustered interacting-galaxy anchor, useful for later multi-core and shock-front treatment." },
    { id: "mice-galaxies", name: "Mice Galaxies", kind: "irregular", color: 0xc7f7ff, meta: "Interacting galaxies | NGC 4676", summary: "A tidal-tail collision seed, extending the catalog beyond isolated galaxy disks." },
    { id: "malin-1", name: "Malin 1", kind: "spiral", color: 0xaedfff, meta: "Giant low-surface-brightness spiral", summary: "A diffuse spiral anchor, deliberately faint and extended for future low-brightness morphology." },
    { id: "ic-1101", name: "IC 1101", kind: "elliptical", color: 0xffdca8, meta: "Giant elliptical galaxy | cluster-scale anchor", summary: "A massive elliptical seed, useful for future size-comparison and cD-galaxy treatment." },
    { id: "ngc-1275", name: "NGC 1275", kind: "elliptical", color: 0xffc7b6, activeCore: true, meta: "Active galaxy | Perseus Cluster", summary: "An active central galaxy seed with room for jets and filamentary feedback detail." },
    { id: "ngc-6240", name: "NGC 6240", kind: "irregular", color: 0xffbfa8, activeCore: true, meta: "Merging galaxy | dual active nuclei", summary: "A turbulent merger anchor for future dual-core and shocked-gas visualization." },
  ];
  for (let i = 0; i < 64; i += 1) {
    const point = randomOnSphere(18 + Math.pow(random(), 0.62) * 58);
    point.y *= 0.62;
    const seed = namedGalaxySeeds[i] ?? null;
    const kind = seed?.kind ?? clusterKinds[i % clusterKinds.length];
    const radius = seed ? 1.35 + random() * 2.7 : 0.95 + random() * 2.6;
    const clusterName = seed?.name ?? `${kind[0].toUpperCase()}${kind.slice(1)} Cluster Galaxy ${String(i + 1).padStart(2, "0")}`;
    group.add(
      createMiniGalaxyObject({
        id: seed?.id ?? `cluster-galaxy-${String(i + 1).padStart(2, "0")}`,
        name: clusterName,
        kind,
        band: "cluster",
        position: [point.x, point.y, point.z],
        radius,
        color: seed?.color ?? clusterColors[i % clusterColors.length],
        pointCount: seed ? (kind === "elliptical" ? 230 : 320) : (kind === "elliptical" ? 150 : 210),
        typeLabel: seed?.typeLabel ?? null,
        activeCore: Boolean(seed?.activeCore),
        featured: Boolean(seed?.featured),
        pulsarCount: seed?.pulsarCount ?? null,
        priority: seed ? 2.45 : 1.45,
        stats: [
          { value: kind, label: "morphology" },
          { value: seed ? "named" : "seed", label: "data status" },
        ],
        meta: seed?.meta ?? "Procedural cluster galaxy | selectable scaffold",
        summary: seed?.summary ?? "A generated but selectable galaxy seed. Later passes can replace this scaffold with catalog coordinates, distance, luminosity, and child-object data.",
        scaleHint: seed
          ? "Reference: named galaxy anchors are placed artistically for now; future passes can attach catalog coordinates and child structures."
          : "Reference: every cluster light here is now a selectable galaxy scaffold, not just decoration.",
      })
    );
  }

  group.add(createGlowSphere(24, 0x5367ff, 0.004));
  group.add(createGlowSphere(52, 0x00dfff, 0.0018));
  group.add(
    createMiniGalaxyObject({
      id: "milky-way-galaxy",
      name: "Milky Way",
      kind: "spiral",
      band: "cluster",
      position: [0, 0, 0],
      radius: 8.8,
      color: 0xc9f1ff,
      pointCount: 1800,
      featured: true,
      pulsarCount: 12,
      priority: 6.2,
      innerZoomFloor: getBandByKey("galaxy").center,
      portalTargetBand: "galaxy",
      typeLabel: "Home Spiral Galaxy",
      stats: [
        { value: "barred", label: "morphology" },
        { value: "100k ly", label: "diameter" },
        { value: "home", label: "reference" },
        { value: "portal", label: "zoom role" },
      ],
      meta: "Local barred spiral galaxy | centered parent anchor",
      summary: "The centered parent anchor for the Milky Way. Select it from the galactic cluster view, then zoom inward to enter the galaxy-scale layer.",
      scaleHint: "Reference: this is a parent portal. Zooming inward reveals the Milky Way-scale scene and its child structures.",
    })
  );
  group.add(
    createMiniGalaxyObject({
      id: "andromeda",
      name: "Andromeda Galaxy",
      kind: "spiral",
      band: "cluster",
      position: [-34, 9, -18],
      radius: 8.2,
      color: 0xb6f2ff,
      meta: "Spiral galaxy | Local Group",
      summary: "A named spiral-galaxy anchor. Its placement is artistic for now; later it can use catalog coordinates.",
    })
  );
  group.add(
    createMiniGalaxyObject({
      id: "m87",
      name: "Messier 87",
      kind: "elliptical",
      band: "cluster",
      position: [28, -5, 10],
      radius: 7.2,
      color: 0xffd8a8,
      meta: "Elliptical galaxy | Virgo Cluster",
      summary: "A massive elliptical galaxy marker, included to distinguish galaxy morphology beyond spirals.",
    })
  );
  group.add(
    createBlackHoleObject({
      id: "m87-star",
      name: "M87*",
      band: "cluster",
      position: [28, -4.2, 10],
      radius: 1.1,
      meta: "Supermassive black hole | Event Horizon Telescope target",
      summary: "A black-hole object of interest associated with Messier 87, represented as a compact selectable anchor.",
    })
  );
  group.add(
    createQuasarObject({
      id: "3c-273-quasar",
      name: "3C 273",
      band: "cluster",
      position: [44, -10, 30],
      radius: 1.55,
      color: 0xffe6a8,
      meta: "Quasar | active galactic nucleus anchor",
      summary: "A deliberately luminous quasar object, placed artistically for now as a test case for jet/lensing vocabulary.",
      stats: [
        { value: "quasar", label: "class" },
        { value: "AGN", label: "engine" },
      ],
    })
  );
  group.add(
    createMiniGalaxyObject({
      id: "large-magellanic-cloud",
      name: "Large Magellanic Cloud",
      kind: "irregular",
      band: "cluster",
      position: [-8, -12, 32],
      radius: 5.6,
      color: 0x8feeff,
      meta: "Irregular dwarf galaxy | Local Group",
      summary: "An irregular-galaxy scaffold object for smaller companion systems and non-spiral morphology.",
    })
  );
  group.add(
    createMiniGalaxyObject({
      id: "sombrero-galaxy",
      name: "Sombrero Galaxy",
      kind: "barred",
      band: "cluster",
      position: [4, 14, -36],
      radius: 6.4,
      color: 0xffe6bf,
      meta: "Ringed/lenticular galaxy | distinct morphology",
      summary: "A named galaxy variant with a strong central structure, useful for testing visual differences and selection.",
    })
  );
  const extraGalaxies = [
    {
      id: "triangulum-galaxy",
      name: "Triangulum Galaxy",
      kind: "spiral",
      position: [-46, -2, 24],
      radius: 5.8,
      color: 0xaedfff,
      meta: "Spiral galaxy | Messier 33 | Local Group",
      summary: "A smaller Local Group spiral, added to make nearby galaxy navigation less binary than Milky Way/Andromeda.",
    },
    {
      id: "whirlpool-galaxy",
      name: "Whirlpool Galaxy",
      kind: "spiral",
      position: [44, 16, -30],
      radius: 6.6,
      color: 0xd4f2ff,
      meta: "Grand-design spiral galaxy | Messier 51",
      summary: "A bright spiral-galaxy anchor for later companion-galaxy and tidal-bridge detail.",
    },
    {
      id: "pinwheel-galaxy",
      name: "Pinwheel Galaxy",
      kind: "spiral",
      position: [-2, -18, -44],
      radius: 7.0,
      color: 0xc8f1ff,
      meta: "Face-on spiral galaxy | Messier 101",
      summary: "A wide face-on spiral scaffold, useful for comparing arm density and orientation.",
    },
    {
      id: "centaurus-a",
      name: "Centaurus A",
      kind: "elliptical",
      position: [52, -14, 14],
      radius: 6.2,
      color: 0xffcf9a,
      activeCore: true,
      meta: "Radio galaxy | dust-lane elliptical",
      summary: "A radio-galaxy anchor, included for future jet and dust-lane treatment.",
    },
    {
      id: "cartwheel-galaxy",
      name: "Cartwheel Galaxy",
      kind: "barred",
      position: [-32, 20, 42],
      radius: 5.9,
      color: 0xffe0b8,
      meta: "Ring galaxy | collision morphology",
      summary: "A ring-galaxy scaffold, deliberately different from ordinary spiral and elliptical silhouettes.",
    },
    {
      id: "sculptor-galaxy",
      name: "Sculptor Galaxy",
      kind: "irregular",
      position: [18, -22, 42],
      radius: 5.4,
      color: 0x9ff5e8,
      meta: "Starburst galaxy | NGC 253",
      summary: "A starburst-galaxy anchor, intended for future dusty asymmetric glow and active star-forming regions.",
    },
    {
      id: "ngc-4650a",
      name: "NGC 4650A",
      kind: "irregular",
      position: [-56, 10, -16],
      radius: 5.2,
      color: 0xd6c8ff,
      meta: "Polar-ring galaxy | distinct ring morphology",
      summary: "A polar-ring galaxy seed, added to broaden the family of strange galaxy silhouettes.",
    },
    {
      id: "eye-of-sauron-galaxy",
      name: "Eye of Sauron Galaxy",
      kind: "spiral",
      position: [34, 24, 38],
      radius: 5.5,
      color: 0xffdab0,
      meta: "Ringed spiral galaxy | NGC 4151",
      summary: "A ringed active-galaxy anchor, useful for later inner-ring and bright-core visual treatment.",
      activeCore: true,
    },
    {
      id: "condor-galaxy",
      name: "Condor Galaxy",
      kind: "spiral",
      position: [-48, -20, 4],
      radius: 6.8,
      color: 0xbdeeff,
      meta: "Large spiral galaxy | NGC 6872",
      summary: "A broad spiral-galaxy anchor, added as a future large-disk size comparison target.",
    },
    {
      id: "tullys-galaxy",
      name: "Tully's Galaxy",
      kind: "barred",
      position: [58, 6, -6],
      radius: 5.6,
      color: 0xffe1b8,
      meta: "Barred spiral galaxy | UGC 2885",
      summary: "A large barred-spiral seed for future high-mass disk comparison.",
    },
  ];
  for (const galaxy of extraGalaxies) {
    group.add(createMiniGalaxyObject({ band: "cluster", ...galaxy }));
  }
  return group;
}

function buildWebLayer() {
  const group = makeLayer("web", 5.75, 1.15, 1, new THREE.Group());
  const nodeCount = 128;
  const nodes = [];
  const nodePositions = [];
  const linePositions = [];

  for (let i = 0; i < nodeCount; i += 1) {
    const point = randomOnSphere(14 + Math.pow(random(), 0.5) * 70);
    point.y *= 0.55;
    nodes.push(point.clone());
    nodePositions.push(point.x, point.y, point.z);
  }

  for (let i = 0; i < nodeCount; i += 1) {
    const a = nodes[i];
    const candidates = nodes
      .map((node, index) => ({ index, distance: index === i ? Infinity : a.distanceTo(node) }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, 2 + (i % 3));

    for (const candidate of candidates) {
      if (candidate.index <= i || candidate.distance > 38) continue;
      const b = nodes[candidate.index];
      linePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  group.add(createPointCloud({ positions: nodePositions, color: 0xf2fbff }, 0.46, 0.58));
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  group.add(
    new THREE.LineSegments(
      lineGeometry,
      createMaterial(
        THREE.LineBasicMaterial,
        { color: 0x89f4ff, blending: THREE.AdditiveBlending },
        0.2
      )
    )
  );
  const webObjects = [
    {
      id: "local-group-web",
      name: "Local Group",
      type: "Galaxy Group",
      position: [-24, 7, -14],
      radius: 0.92,
      color: 0xfff0a8,
      meta: "Home galaxy group | Milky Way and Andromeda neighborhood",
      summary: "Our immediate galaxy-group address, rendered as a modest home node inside the larger Laniakea flow.",
      stats: [
        { value: "50+", label: "galaxies" },
        { value: "home", label: "address" },
      ],
      innerZoomFloor: getBandByKey("cluster").center,
      portalTargetBand: "cluster",
      scaleHint: "Reference: this is the web-scale home address. Zoom inward to return to the Local Group and galaxy-cluster view.",
    },
    {
      id: "virgo-cluster",
      name: "Virgo Cluster",
      type: "Galaxy Cluster",
      position: [-10, 12, -20],
      radius: 1.22,
      color: 0xb8f7ff,
      meta: "Nearby galaxy cluster | Local Supercluster region",
      summary: "A major nearby cluster anchor, useful for locating the Local Group relative to denser galaxy traffic.",
      stats: [
        { value: "cluster", label: "structure" },
        { value: "nearby", label: "context" },
      ],
      innerZoomFloor: getBandByKey("cluster").center,
      portalTargetBand: "cluster",
    },
    {
      id: "laniakea",
      name: "Laniakea Supercluster",
      type: "Supercluster",
      position: [-18, 8, -10],
      radius: 1.35,
      color: 0x9df4ff,
      meta: "Local large-scale structure | supercluster basin",
      summary: "A named large-scale structure anchor for future catalog placement and local-universe context.",
      stats: [
        { value: "home basin", label: "address" },
        { value: "flow", label: "definition" },
      ],
    },
    {
      id: "local-void",
      name: "Local Void",
      type: "Void",
      position: [-34, -10, -4],
      radius: 1.9,
      color: 0x48509d,
      meta: "Nearby underdense region | local cosmic structure",
      summary: "An emptier neighboring region, included so our address is shaped by absence as well as bright knots.",
    },
    {
      id: "hydra-centaurus",
      name: "Hydra-Centaurus",
      type: "Galaxy Supercluster",
      position: [2, -4, 10],
      radius: 1.24,
      color: 0xffe0ad,
      meta: "Local supercluster complex | Great Attractor region",
      summary: "A named large-scale neighbor associated with the flow structures around the Great Attractor.",
    },
    {
      id: "norma-cluster",
      name: "Norma Cluster",
      type: "Galaxy Cluster",
      position: [12, -7, 18],
      radius: 1.08,
      color: 0xfff0c8,
      meta: "Rich galaxy cluster | Great Attractor region",
      summary: "A dense cluster anchor near the Great Attractor vocabulary, useful for flow-line navigation.",
      innerZoomFloor: getBandByKey("cluster").center,
      portalTargetBand: "cluster",
    },
    {
      id: "great-attractor",
      name: "Great Attractor",
      type: "Mass Concentration",
      position: [16, -6, 14],
      radius: 1.15,
      color: 0xfff0c8,
      meta: "Gravitational anomaly region | flow reference",
      summary: "A selectable object of interest for large-scale flow and structure, represented abstractly for now.",
    },
    {
      id: "coma-cluster",
      name: "Coma Cluster",
      type: "Galaxy Cluster",
      position: [24, 18, -44],
      radius: 1.32,
      color: 0xd8f8ff,
      meta: "Rich galaxy cluster | large-scale structure node",
      summary: "A classic rich cluster anchor, adding another real dense knot to the web-scale highway.",
      innerZoomFloor: getBandByKey("cluster").center,
      portalTargetBand: "cluster",
    },
    {
      id: "shapley-concentration",
      name: "Shapley Concentration",
      type: "Galaxy Supercluster",
      position: [36, 12, -18],
      radius: 1.45,
      color: 0xffffff,
      meta: "Dense supercluster region | distant pull reference",
      summary: "A distant concentration of galaxies, included as an anchor for cosmic-web navigation and later data.",
    },
    {
      id: "sloan-great-wall",
      name: "Sloan Great Wall",
      type: "Galaxy Wall",
      position: [-46, 4, 26],
      radius: 1.52,
      color: 0xb8f7ff,
      meta: "Large-scale galaxy wall | structural spine",
      summary: "A named wall-like structure to scaffold cosmic-web features larger than individual superclusters.",
    },
    {
      id: "perseus-pisces",
      name: "Perseus-Pisces Supercluster",
      type: "Galaxy Supercluster",
      position: [4, 18, 42],
      radius: 1.28,
      color: 0xffe6ad,
      meta: "Nearby supercluster chain | large-scale structure",
      summary: "A bright large-scale structure marker for future chained-galaxy data and directional navigation.",
    },
    {
      id: "vela-supercluster",
      name: "Vela Supercluster",
      type: "Galaxy Supercluster",
      position: [-6, -22, 46],
      radius: 1.34,
      color: 0xffc7a8,
      meta: "Large hidden supercluster | Zone of Avoidance region",
      summary: "A partly obscured large-scale structure anchor, included as a future candidate for hidden-mass storytelling.",
    },
    {
      id: "bootes-void",
      name: "Bootes Void",
      type: "Void",
      position: [46, -14, 28],
      radius: 2.2,
      color: 0x5b4ea2,
      meta: "Large cosmic void | underdense region",
      summary: "A deliberately sparse selectable region, included so the web has emptiness as well as luminous knots.",
    },
  ];

  const webObjectMap = new Map(webObjects.map((webObject) => [webObject.id, webObject]));
  const filamentPaths = [
    {
      ids: ["local-group-web", "virgo-cluster", "laniakea", "great-attractor"],
      color: 0xfff0a8,
      opacity: 0.28,
      size: 0.22,
    },
    {
      ids: ["laniakea", "great-attractor", "shapley-concentration"],
      color: 0x9df4ff,
      opacity: 0.27,
      size: 0.23,
    },
    {
      ids: ["sloan-great-wall", "laniakea", "perseus-pisces"],
      color: 0xffe6ad,
      opacity: 0.22,
      size: 0.2,
    },
    {
      ids: ["perseus-pisces", "bootes-void", "shapley-concentration"],
      color: 0xc7b8ff,
      opacity: 0.16,
      size: 0.16,
    },
    {
      ids: ["local-void", "local-group-web", "hydra-centaurus", "norma-cluster", "great-attractor"],
      color: 0x9fb8ff,
      opacity: 0.15,
      size: 0.15,
    },
    {
      ids: ["coma-cluster", "sloan-great-wall", "shapley-concentration", "vela-supercluster"],
      color: 0xb8f7ff,
      opacity: 0.16,
      size: 0.16,
    },
  ];
  for (const path of filamentPaths) {
    group.add(
      createPixelFilamentStream(
        path.ids.map((id) => webObjectMap.get(id).position),
        path.color,
        path.opacity * 0.78,
        path.size,
        150,
        path.size * 1.8
      )
    );
  }

  const branchSpecs = [
    { origin: "local-group-web", color: 0xfff0a8, phase: 0.4 },
    { origin: "virgo-cluster", color: 0x9df4ff, phase: 1.7 },
    { origin: "great-attractor", color: 0xffe0ad, phase: 2.8 },
    { origin: "shapley-concentration", color: 0xd6f7ff, phase: 3.6 },
  ];
  for (const branch of branchSpecs) {
    const origin = webObjectMap.get(branch.origin);
    if (!origin) continue;
    for (let i = 0; i < 4; i += 1) {
      const a = branch.phase + i * 1.4;
      const reach = 8 + i * 2.2;
      group.add(
        createPixelFilamentStream(
          [
            origin.position,
            [
              origin.position[0] + Math.cos(a) * reach * 0.6,
              origin.position[1] + Math.sin(a * 0.7) * 3.2,
              origin.position[2] + Math.sin(a) * reach * 0.52,
            ],
            [
              origin.position[0] + Math.cos(a + 0.45) * reach,
              origin.position[1] + Math.sin(a * 0.9) * 5.4,
              origin.position[2] + Math.sin(a + 0.35) * reach,
            ],
          ],
          branch.color,
          0.12,
          0.085,
          76,
          0.24
        )
      );
    }
  }

  for (const webObject of webObjects) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(webObject.radius, 18, 10),
      createMaterial(
        THREE.MeshBasicMaterial,
        { color: webObject.color },
        webObject.type === "Void" ? 0.28 : 0.78
      )
    );
    marker.position.set(webObject.position[0], webObject.position[1], webObject.position[2]);
    const glow = createGlowSphere(
      webObject.radius * (webObject.type === "Void" ? 4.2 : 2.25),
      webObject.color,
      webObject.type === "Void" ? 0.012 : 0.026
    );
    glow.position.copy(marker.position);
    group.add(marker);
    group.add(glow);
    registerEntity({
      id: webObject.id,
      name: webObject.name,
      type: webObject.type,
      band: "web",
      object: marker,
      radius: webObject.radius,
      hitRadius: webObject.radius * 5,
      priority: 4,
      innerZoomFloor:
        webObject.innerZoomFloor ??
        (webObject.type.includes("Supercluster") || webObject.type.includes("Wall")
          ? getBandByKey("cluster").center
          : null),
      portalTargetBand: webObject.portalTargetBand ?? null,
      meta: webObject.meta,
      summary: webObject.summary,
      stats: webObject.stats ?? [],
      scaleHint: webObject.scaleHint ?? null,
    });
  }
  return group;
}

function createStructureNodeObject({
  id,
  name,
  type,
  band,
  position,
  radius,
  color,
  meta,
  summary,
  stats = [],
  priority = 4,
  innerZoomFloor = null,
  portalTargetBand = null,
  scaleHint = null,
  family = null,
  voidNode = false,
  pointCount = null,
}) {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const isTopWebNode = band === "web";
  const localRandom = seededRandom(
    Array.from(id).reduce((total, char) => total + char.charCodeAt(0) * 13, 0)
  );

  if (voidNode) {
    const voidCore = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 2.35, 36, 18),
      createMaterial(
        THREE.MeshBasicMaterial,
        { color: 0x000004, blending: THREE.NormalBlending, depthWrite: false },
        0.58
      )
    );
    voidCore.renderOrder = 2;
    voidCore.userData.breath = { amount: 0.018, speed: 0.28, phase: radius };
    const rimPositions = [];
    const rimColors = [];
    const boundaryPositions = [];
    const boundaryColors = [];
    const blueEdge = new THREE.Color(0x5f78ff);
    const violetEdge = new THREE.Color(0x6d45c8);
    const paleEdge = new THREE.Color(0xd7e6ff);
    for (let i = 0; i < 820; i += 1) {
      const point = randomOnSphere(radius * (2.2 + Math.pow(localRandom(), 0.46) * 1.45));
      const rimBias = 0.35 + Math.abs(point.x) / Math.max(0.001, radius * 3.6) * 0.65;
      point.y *= 0.4 + localRandom() * 0.25;
      point.z *= 0.52 + localRandom() * 0.16;
      rimPositions.push(point.x, point.y, point.z);
      reusableColor.copy(violetEdge).lerp(blueEdge, localRandom() * 0.42).lerp(paleEdge, localRandom() > 0.9 ? rimBias * 0.36 : 0.02);
      rimColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    for (let arc = 0; arc < 7; arc += 1) {
      const tilt = (arc - 3) * 0.19;
      const start = localRandom() * Math.PI * 2;
      const arcLength = 0.8 + localRandom() * 1.55;
      for (let step = 0; step < 72; step += 1) {
        const t = step / 71;
        const angle = start + (t - 0.5) * arcLength;
        const distance = radius * (2.45 + localRandom() * 0.7);
        const fray = randomOnSphere(radius * 0.18 * (0.2 + localRandom()));
        fray.y *= 0.45;
        boundaryPositions.push(
          Math.cos(angle) * distance + fray.x,
          Math.sin((t - 0.5) * Math.PI) * radius * tilt + fray.y,
          Math.sin(angle) * distance * (0.42 + arc * 0.025) + fray.z
        );
        reusableColor.copy(blueEdge).lerp(violetEdge, 0.35 + localRandom() * 0.4).lerp(paleEdge, localRandom() > 0.86 ? 0.28 : 0.04);
        boundaryColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
    const voidRimCloud = createPointCloud({ positions: rimPositions, colors: rimColors }, Math.max(0.08, radius * 0.052), 0.3, true);
    voidRimCloud.material.userData.twinkleAmount = 0.18;
    voidRimCloud.material.userData.twinkleSpeed = 0.28;
    voidRimCloud.userData.spinVector = new THREE.Vector3(0.000012, -0.00003, 0.00001);
    voidRimCloud.renderOrder = 3;
    const boundaryShear = createPointCloud({ positions: boundaryPositions, colors: boundaryColors }, Math.max(0.09, radius * 0.065), 0.42, true);
    boundaryShear.material.userData.twinkleAmount = 0.24;
    boundaryShear.material.userData.twinkleSpeed = 0.5;
    boundaryShear.userData.spinVector = new THREE.Vector3(-0.000018, 0.000045, -0.00001);
    boundaryShear.renderOrder = 4;
    const absenceWake = createGravityPixelShear({
      seedLabel: `${id}-void-wake`,
      radius,
      mode: "void",
      count: isTopWebNode ? 980 : 720,
      colorA: 0x5f78ff,
      colorB: 0xff59d8,
      colorC: 0xd7e6ff,
      opacity: isTopWebNode ? 0.28 : 0.22,
      size: Math.max(0.09, radius * 0.058),
    });
    absenceWake.renderOrder = 3;
    const innerSilence = createGlowSphere(radius * 1.55, 0x020007, 0.12);
    innerSilence.renderOrder = 2;
    group.add(voidCore, innerSilence, absenceWake, voidRimCloud, boundaryShear);
  } else if (band === "laniakea") {
    const typeText = `${type} ${name}`.toLowerCase();
    const isWall = typeText.includes("wall");
    const isField = typeText.includes("field") || typeText.includes("cloud");
    const isMass = typeText.includes("mass") || typeText.includes("attractor");
    const isCluster = typeText.includes("cluster") || typeText.includes("concentration");
    const positions = [];
    const colors = [];
    const baseColor = new THREE.Color(color);
    const aqua = new THREE.Color(0x9feaff);
    const gold = new THREE.Color(0xffe6ad);
    const magenta = new THREE.Color(0xff8fe2);
    const white = new THREE.Color(0xffffff);
    const clumpCount = isWall ? 6 : isMass ? 9 : isCluster ? 8 : isField ? 7 : 5;
    const clumps = [];
    for (let i = 0; i < clumpCount; i += 1) {
      const t = clumpCount === 1 ? 0 : (i / (clumpCount - 1)) * 2 - 1;
      const angle = (i / clumpCount) * Math.PI * 2 + localRandom() * 0.38;
      const reach = radius * (
        isWall ? 4.7 :
          isField ? 3.9 :
            isCluster ? 3.15 :
              isMass ? 2.45 :
                2.75
      );
      clumps.push(
        isWall
          ? new THREE.Vector3(t * radius * 5.2, Math.sin(t * Math.PI * 1.5) * radius * 0.42, (localRandom() - 0.5) * radius * 0.9)
          : new THREE.Vector3(
              Math.cos(angle) * reach * (0.36 + localRandom() * 0.66),
              (localRandom() - 0.5) * reach * (isMass ? 0.34 : 0.62),
              Math.sin(angle) * reach * (isField ? 0.62 : 0.46)
            )
      );
    }

    const count = pointCount ?? (isWall ? 980 : isField ? 860 : isCluster ? 1050 : 720);
    for (let i = 0; i < count; i += 1) {
      const clump = clumps[i % clumps.length];
      const shell = Math.pow(localRandom(), isCluster || isMass ? 0.42 : 0.58);
      const theta = localRandom() * Math.PI * 2;
      const zed = localRandom() * 2 - 1;
      const xy = Math.sqrt(Math.max(0, 1 - zed * zed));
      const spread = radius * (
        isWall ? 0.48 :
          isField ? 0.82 :
            isCluster ? 0.64 :
              isMass ? 0.52 :
                0.7
      );
      let x = clump.x + Math.cos(theta) * xy * spread * shell;
      let y = clump.y + Math.sin(theta) * xy * spread * shell * (isWall ? 0.26 : 0.58);
      let z = clump.z + zed * spread * shell * (isWall ? 0.38 : 0.72);
      if (isWall) {
        y += Math.sin(x * 0.34 + radius * 1.7) * radius * 0.18;
      } else if (isField) {
        x += Math.sin(theta * 3 + shell * 2.2) * radius * 0.22;
        z += Math.cos(theta * 2 + shell * 3.1) * radius * 0.2;
      } else if (isMass) {
        const inward = 1 - shell;
        x *= 0.8 + inward * 0.22;
        y *= 0.72 + inward * 0.18;
        z *= 0.72 + inward * 0.16;
      }
      positions.push(x, y, z);
      reusableColor.copy(baseColor)
        .lerp(isField ? magenta : aqua, localRandom() * 0.32)
        .lerp(gold, isMass || isCluster ? 0.18 + localRandom() * 0.26 : localRandom() * 0.16);
      if (localRandom() > 0.92) reusableColor.lerp(white, 0.45 + localRandom() * 0.34);
      colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }

    const composite = createPointCloud(
      { positions, colors },
      Math.max(0.06, radius * (isWall ? 0.045 : 0.052)),
      isWall ? 0.42 : 0.5,
      true
    );
    composite.material.userData.twinkleAmount = isCluster || isMass ? 0.24 : 0.18;
    composite.material.userData.twinkleSpeed = isMass ? 0.74 : 0.48;
    composite.userData.spinVector = new THREE.Vector3(0.000025, isMass ? 0.00011 : 0.00007, -0.000018);
    group.add(composite);

    for (let i = 0; i < clumps.length - 1; i += 1) {
      const a = clumps[i];
      const b = clumps[i + 1];
      const mid = a.clone().lerp(b, 0.5);
      mid.y += (localRandom() - 0.5) * radius * 0.7;
      group.add(
        createPixelFilamentStream(
          [
            [a.x, a.y, a.z],
            [mid.x, mid.y, mid.z],
            [b.x, b.y, b.z],
          ],
          isField ? 0xff8fe2 : isWall ? 0xb8f7ff : 0xffe6ad,
          isWall ? 0.12 : 0.18,
          Math.max(0.052, radius * 0.04),
          76,
          radius * 0.12
        )
      );
    }

    const coreGlow = createGlowSphere(radius * (isMass ? 0.58 : 0.38), color, isMass ? 0.014 : 0.008);
    coreGlow.userData.breath = { amount: 0.02, speed: isMass ? 0.78 : 0.52, phase: radius };
    group.add(coreGlow);
    if (isCluster || isMass) {
      const flowRing = createSceneGuideRing(radius * (isMass ? 2.35 : 2.75), color, isMass ? 0.052 : 0.034, 160, isMass ? 0.42 : 0.58);
      flowRing.rotation.set(0.42, -0.18, 0.12);
      flowRing.userData.spinVector = new THREE.Vector3(0.00003, 0.00008, -0.00002);
      group.add(flowRing);
    }
  } else if (isTopWebNode) {
    const positions = [];
    const colors = [];
    const tendrilPositions = [];
    const tendrilColors = [];
    const baseColor = new THREE.Color(color);
    const violet = new THREE.Color(0x7b48ff);
    const magenta = new THREE.Color(0xff59d8);
    const gold = new THREE.Color(0xffd278);
    const white = new THREE.Color(0xffffff);
    const isWall = type.includes("Wall");
    const isField = type.includes("Field") || type.includes("Complex");
    const count = pointCount ?? (isWall ? 720 : isField ? 620 : 520);
    for (let i = 0; i < count; i += 1) {
      const t = localRandom() * 2 - 1;
      const strand = Math.floor(localRandom() * 5);
      const curl = Math.sin(t * Math.PI * (isWall ? 1.5 : 2.2) + strand * 0.7);
      const width = radius * (isWall ? 7.2 : isField ? 4.2 : 2.35);
      const depth = radius * (isWall ? 0.75 : isField ? 2.8 : 1.7);
      const height = radius * (isWall ? 0.42 : isField ? 1.2 : 0.86);
      const shell = Math.pow(localRandom(), isWall ? 0.7 : 0.45);
      positions.push(
        t * width + curl * radius * (isWall ? 0.9 : 0.5),
        (localRandom() - 0.5) * height + Math.sin(t * Math.PI * 2 + strand) * radius * 0.35,
        (localRandom() - 0.5) * depth * shell + curl * radius * (isWall ? 0.18 : 0.62)
      );
      reusableColor.copy(violet).lerp(magenta, 0.38 + localRandom() * 0.32).lerp(gold, isWall ? 0.1 + localRandom() * 0.16 : localRandom() * 0.1);
      if (localRandom() > 0.985) reusableColor.lerp(white, 0.12);
      colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    const body = createPointCloud({ positions, colors }, Math.max(0.055, radius * (isWall ? 0.036 : 0.048)), isWall ? 0.24 : 0.28, true);
    body.material.userData.twinkleAmount = isWall ? 0.09 : 0.12;
    body.material.userData.twinkleSpeed = isWall ? 0.26 : 0.36;
    body.userData.spinVector = new THREE.Vector3(0.000018, isWall ? 0.000035 : 0.00007, -0.000014);
    group.add(body);

    const causticLoopCount = isWall ? 5 : isField ? 7 : 6;
    for (let loop = 0; loop < causticLoopCount; loop += 1) {
      const phase = localRandom() * Math.PI * 2;
      const tilt = (localRandom() - 0.5) * 0.9;
      const span = isWall ? 1.35 : 2.15;
      const radiusX = radius * (isWall ? 3.6 + loop * 0.24 : 1.25 + localRandom() * 1.45);
      const radiusZ = radius * (isWall ? 0.42 + localRandom() * 0.42 : 0.72 + localRandom() * 1.15);
      for (let step = 0; step < 108; step += 1) {
        const u = step / 107;
        const angle = phase + (u - 0.5) * Math.PI * span;
        const fold = Math.sin(angle * (isWall ? 3.2 : 4.8) + loop) * radius * (isWall ? 0.16 : 0.28);
        const knot = Math.sin(u * Math.PI) * (0.45 + localRandom() * 0.65);
        for (let strand = 0; strand < 3; strand += 1) {
          const jitter = randomOnSphere(radius * (0.04 + localRandom() * 0.12));
          jitter.y *= 0.5;
          tendrilPositions.push(
            Math.cos(angle) * radiusX * knot + fold + jitter.x,
            Math.sin(angle * 1.7 + tilt) * radius * (isWall ? 0.2 : 0.5) + jitter.y,
            Math.sin(angle) * radiusZ * knot + Math.cos(angle * 2.1 + loop) * radius * 0.18 + jitter.z
          );
          reusableColor.copy(baseColor)
            .lerp(magenta, 0.28 + localRandom() * 0.28)
            .lerp(gold, isWall ? 0.1 : 0.05 + localRandom() * 0.09)
            .lerp(white, localRandom() > 0.98 ? 0.1 : 0.01);
          tendrilColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
        }
      }
    }
    const caustics = createPointCloud({ positions: tendrilPositions, colors: tendrilColors }, Math.max(0.055, radius * 0.04), 0.22, true);
    caustics.material.userData.twinkleAmount = 0.1;
    caustics.material.userData.twinkleSpeed = 0.42;
    caustics.userData.spinVector = new THREE.Vector3(0.00001, isWall ? 0.00004 : 0.00009, -0.000012);
    group.add(caustics, createGlowSphere(radius * (isWall ? 0.78 : 0.9), color, isWall ? 0.002 : 0.0028));
  } else {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 12),
      createMaterial(
        THREE.MeshBasicMaterial,
        { color, blending: THREE.AdditiveBlending, depthWrite: false },
        0.72
      )
    );
    group.add(marker, createGlowSphere(radius * 2.1, color, 0.022));
    const positions = [];
    const colors = [];
    const count = pointCount ?? Math.max(34, Math.floor(radius * 42));
    const baseColor = new THREE.Color(color);
    const white = new THREE.Color(0xffffff);
    for (let i = 0; i < count; i += 1) {
      const point = randomOnSphere(radius * (0.55 + Math.pow(localRandom(), 0.52) * 1.45));
      point.y *= 0.58;
      positions.push(point.x, point.y, point.z);
      reusableColor.lerpColors(baseColor, white, localRandom() * 0.5);
      colors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
    const halo = createPointCloud({ positions, colors }, Math.max(0.06, radius * 0.055), 0.32, true);
    halo.material.userData.twinkleAmount = 0.18;
    halo.material.userData.twinkleSpeed = 0.5 + radius * 0.03;
    halo.userData.spinVector = new THREE.Vector3(0.00004, 0.00016, -0.00002);
    group.add(halo);
  }

  const structureInnerZoomFloor = Number.isFinite(innerZoomFloor)
    ? (band === "laniakea" && !voidNode ? Math.max(innerZoomFloor, LANIAKEA_NESTED_VIEW_FLOOR) : innerZoomFloor)
    : band === "laniakea" && !portalTargetBand && !voidNode
      ? LANIAKEA_NESTED_VIEW_FLOOR
      : innerZoomFloor;

  registerEntity({
    id,
    name,
    type,
    band,
    object: group,
    radius,
    hitRadius: radius * (voidNode ? 5.2 : band === "laniakea" ? 7.6 : 4.2),
    selectionRadius: radius * (voidNode ? 2.15 : band === "laniakea" ? 1.45 : 3.15),
    priority,
    innerZoomFloor: structureInnerZoomFloor,
    portalTargetBand,
    meta,
    summary,
    stats,
    scaleHint,
    family: family ?? inferEntityFamily(type, band, meta),
    voidNode,
  });
  return group;
}

function applySlowBarycentricDrift(object, center, speed = 0.000006, zScale = 0.68, xScale = 1) {
  const dx = object.position.x - center[0];
  const dz = (object.position.z - center[2]) / Math.max(0.001, zScale);
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance < 0.01) {
    return;
  }
  object.userData.orbit = {
    center,
    distance,
    angle: Math.atan2(dz, dx),
    speed,
    zScale,
    xScale,
    y: object.position.y - (center[1] ?? 0),
  };
}

function applyMutualBinaryOrbit(parentGroup, objectA, objectB, {
  speed = 0.000018,
  zScale = 0.72,
  xScale = 1,
  color = 0xffefb4,
} = {}) {
  if (!parentGroup || !objectA || !objectB) {
    return;
  }
  const weightA = Math.max(0.1, objectA.userData?.selectableEntity?.radius ?? 1);
  const weightB = Math.max(0.1, objectB.userData?.selectableEntity?.radius ?? 1);
  const center = [
    (objectA.position.x * weightA + objectB.position.x * weightB) / (weightA + weightB),
    (objectA.position.y * weightA + objectB.position.y * weightB) / (weightA + weightB),
    (objectA.position.z * weightA + objectB.position.z * weightB) / (weightA + weightB),
  ];
  const setBinaryOrbit = (object, sign = 1) => {
    const dx = (object.position.x - center[0]) / Math.max(0.001, xScale);
    const dz = (object.position.z - center[2]) / Math.max(0.001, zScale);
    const distance = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
    object.userData.orbit = {
      center,
      distance,
      angle: Math.atan2(dz, dx),
      speed: speed * sign,
      zScale,
      xScale,
      y: object.position.y - center[1],
    };
  };
  setBinaryOrbit(objectA, 1);
  setBinaryOrbit(objectB, 1);
  const orbitGuide = new THREE.Group();
  orbitGuide.position.set(center[0], center[1], center[2]);
  const radius = Math.max(
    objectA.position.distanceTo(orbitGuide.position),
    objectB.position.distanceTo(orbitGuide.position)
  );
  const trace = createSceneGuideRing(radius * 1.06, color, 0.052, 160, zScale);
  trace.rotation.x = 0.08;
  trace.userData.spinVector = new THREE.Vector3(0.000012, speed * 4, -0.000006);
  orbitGuide.add(trace);
  parentGroup.add(orbitGuide);
}

function getLaniakeaChildOffset(parent, offset, childRadius = 1) {
  const typeText = `${parent?.type ?? ""} ${parent?.name ?? ""}`.toLowerCase();
  const spread =
    typeText.includes("cluster") || typeText.includes("concentration")
      ? 1.95
      : typeText.includes("field") || typeText.includes("cloud")
        ? 1.76
        : typeText.includes("wall")
          ? 2.08
          : 1.62;
  const clearance = Math.max(0, childRadius - 2.5) * 0.18;
  return [
    offset[0] * (spread + clearance),
    offset[1] * (1.35 + clearance * 0.4),
    offset[2] * (spread * 0.82 + clearance),
  ];
}

function getLabelSeed(label, salt = 0) {
  return Array.from(`${label ?? ""}`).reduce((total, char, index) => total + char.charCodeAt(0) * (index + 17), salt);
}

function getLaniakeaOrbitPattern(parent, childId, index = 0) {
  const typeText = `${parent?.type ?? ""} ${parent?.name ?? ""}`.toLowerCase();
  const seed = getLabelSeed(`${parent?.id ?? "laniakea"}-${childId}`, 991 + index * 37);
  const direction = seed % 2 === 0 ? 1 : -1;
  const clusterBias = typeText.includes("cluster") || typeText.includes("concentration");
  const fieldBias = typeText.includes("field") || typeText.includes("cloud");
  const wallBias = typeText.includes("wall");
  return {
    speed: direction * (
      clusterBias ? LANIAKEA_CLUSTER_PROCESSION_SPEED :
        fieldBias ? LANIAKEA_FIELD_PROCESSION_SPEED :
          wallBias ? LANIAKEA_WALL_PROCESSION_SPEED :
            LANIAKEA_GROUP_PROCESSION_SPEED
    ) * (0.72 + (seed % 7) * 0.055),
    zScale: clusterBias ? 0.58 : fieldBias ? 0.72 : wallBias ? 0.38 : 0.64,
    xScale: clusterBias ? 1.04 + (seed % 5) * 0.035 : fieldBias ? 1.18 : wallBias ? 1.35 : 1.1,
  };
}

function applyLaniakeaMemberOrbit(object, parent, childId, index = 0) {
  if (!object || !parent) {
    return object;
  }
  const pattern = getLaniakeaOrbitPattern(parent, childId, index);
  const dx = object.position.x / Math.max(0.001, pattern.xScale);
  const dz = object.position.z / Math.max(0.001, pattern.zScale);
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance < 0.01) {
    return object;
  }
  object.userData.orbit = {
    center: [0, 0, 0],
    distance,
    angle: Math.atan2(dz, dx),
    speed: pattern.speed,
    zScale: pattern.zScale,
    xScale: pattern.xScale,
    y: object.position.y,
  };
  return object;
}

function buildLocalGroupLayer() {
  const bandInfo = getBandByKey("cluster");
  const group = makeLayer("cluster", bandInfo.center, bandInfo.width, 1, new THREE.Group());
  const galaxyRoot = new THREE.Group();
  galaxyRoot.position.set(
    bandInfo.anchor[0] - LOCAL_GROUP_CLUSTER_BARYCENTER[0],
    bandInfo.anchor[1] - LOCAL_GROUP_CLUSTER_BARYCENTER[1],
    bandInfo.anchor[2] - LOCAL_GROUP_CLUSTER_BARYCENTER[2]
  );
  group.add(galaxyRoot);
  group.add(createGlowSphere(18, 0x6f85ff, 0.0032));
  group.add(createGlowSphere(42, 0x8ff4ff, 0.0012));

  const localGroupGalaxies = catalogLocalGroupPrimaryGalaxies;

  const localGroupPositionById = new Map(localGroupGalaxies.map((galaxy) => [galaxy.id, galaxy.position]));
  const barycenter = LOCAL_GROUP_CLUSTER_BARYCENTER;
  const milkyWayPosition = localGroupPositionById.get("milky-way-galaxy") ?? [0, 0, 0];
  const andromedaPosition = localGroupPositionById.get("andromeda") ?? [-28, 6, -18];
  const triangulumPosition = localGroupPositionById.get("triangulum-galaxy") ?? [-18, -5, 26];
  const bridgeSpecs = [
    {
      seedLabel: "local-group-milky-way-andromeda-tidal-web",
      path: createHelicalBridgePath(milkyWayPosition, andromedaPosition, {
        turns: 1.85,
        amplitude: 2.25,
        phase: 0.35,
        lift: 0.75,
        samples: 38,
      }),
      width: 0.72,
      coreSize: 0.12,
      sheathSize: 0.16,
      sampleCount: 112,
      opacity: 0.28,
      helixTurns: 2.7,
      phase: 0.25,
      warmth: 0.22,
      tendrilCount: 6,
    },
    {
      seedLabel: "local-group-andromeda-triangulum-tidal-web",
      path: createHelicalBridgePath(andromedaPosition, triangulumPosition, {
        turns: 1.55,
        amplitude: 1.75,
        phase: 1.7,
        lift: -0.35,
        samples: 34,
      }),
      width: 0.58,
      coreSize: 0.105,
      sheathSize: 0.145,
      sampleCount: 112,
      opacity: 0.24,
      helixTurns: 2.3,
      phase: 1.15,
      warmth: 0.34,
      tendrilCount: 5,
    },
    {
      seedLabel: "local-group-triangulum-milky-way-tidal-web",
      path: createHelicalBridgePath(triangulumPosition, milkyWayPosition, {
        turns: 1.75,
        amplitude: 1.95,
        phase: 2.55,
        lift: 0.42,
        samples: 36,
      }),
      width: 0.62,
      coreSize: 0.105,
      sheathSize: 0.15,
      sampleCount: 112,
      opacity: 0.25,
      helixTurns: 2.45,
      phase: 2.2,
      warmth: 0.42,
      tendrilCount: 5,
    },
  ];
  for (const bridge of bridgeSpecs) {
    galaxyRoot.add(createLocalGroupTidalWebFilament(bridge.path, bridge));
  }
  for (const galaxy of localGroupGalaxies) {
    const galaxyObject = createMiniGalaxyObject({ band: "cluster", ...galaxy });
    applySlowBarycentricDrift(
      galaxyObject,
      barycenter,
      (galaxy.id === "milky-way-galaxy" ? 0.0000042 : 0.0000055) * (galaxy.position[0] >= 0 ? 1 : -1),
      0.72
    );
    galaxyRoot.add(galaxyObject);
  }
  for (const galaxy of catalogLocalGroupGalaxies) {
    const galaxyObject = createMiniGalaxyObject({
      band: "cluster",
      pointCount: galaxy.kind === "elliptical" ? 120 : 170,
      priority: galaxy.radius > 1.2 ? 3.0 : 2.35,
      stats: [
        { value: galaxy.kind, label: "morphology" },
        { value: galaxy.parent === "andromeda" ? "M31 satellite" : galaxy.parent === "milky-way-galaxy" ? "Milky Way satellite" : "Local Group", label: "family" },
      ],
      scaleHint: "Reference: Local Group dwarf positions are staged for legibility; the named families prepare this layer for catalog coordinates later.",
      ...galaxy,
    });
    const parentCenter = localGroupPositionById.get(galaxy.parent) ?? barycenter;
    applySlowBarycentricDrift(
      galaxyObject,
      parentCenter,
      (galaxy.parent === "andromeda" ? -0.0000075 : 0.0000072) * (galaxy.position[0] >= parentCenter[0] ? 1 : -1),
      0.68
    );
    galaxyRoot.add(galaxyObject);
  }
  return group;
}

function buildLaniakeaLayer() {
  const bandInfo = getBandByKey("laniakea");
  const group = makeLayer("laniakea", bandInfo.center, bandInfo.width, 1, new THREE.Group());
  const greatAttractorFlowCenter = new THREE.Vector3(27, -4, 14);
  const laniakeaFlowScale = 0.92;
  const laniakeaPositionOverrides = new Map([
    ["great-attractor", [0, 0, 0]],
    ["local-group-web", [-31, 5, -16]],
  ]);
  const toLaniakeaFlowPosition = (position) => {
    const vector = new THREE.Vector3(...position).sub(greatAttractorFlowCenter).multiplyScalar(laniakeaFlowScale);
    return [vector.x, vector.y, vector.z];
  };
  const rawStructureNodes = [
    {
      id: "local-group-web",
      name: "Local Group",
      type: "Galaxy Group",
      position: [0, 0, 0],
      radius: 1.35,
      color: 0xfff0a8,
      priority: 3.4,
      innerZoomFloor: getBandByKey("cluster").center,
      portalTargetBand: "cluster",
      meta: "Home galaxy group | offset from the Great Attractor flow center",
      summary: "Our immediate galaxy-group address inside Laniakea, now displaced from the flow center. Zoom inward here to enter the Local Group layer.",
      stats: [
        { value: "50+", label: "galaxies" },
        { value: "home", label: "address" },
        { value: "portal", label: "zoom role" },
      ],
      scaleHint: "Reference: this Laniakea node is the doorway down into the Local Group.",
    },
    {
      id: "virgo-cluster",
      name: "Virgo Cluster",
      type: "Galaxy Cluster",
      position: [-17, 9, -15],
      radius: 1.48,
      color: 0xb8f7ff,
      meta: "Nearby galaxy cluster | Virgo region",
      summary: "A major nearby cluster anchor, now housed at the Laniakea scale rather than inside the Local Group.",
      stats: [{ value: "cluster", label: "structure" }],
    },
    {
      id: "m81-group",
      name: "M81 Group",
      type: "Galaxy Group",
      position: [-26, -4, 18],
      radius: 1.16,
      color: 0xd4f2ff,
      meta: "Nearby galaxy group | M81/M82 region",
      summary: "A named group node that gives Bode's and the Cigar Galaxy a cleaner home.",
    },
    {
      id: "sculptor-group",
      name: "Sculptor Group",
      type: "Galaxy Group",
      position: [18, -15, 24],
      radius: 1.05,
      color: 0x9ff5e8,
      meta: "Nearby galaxy group | Sculptor region",
      summary: "A nearby group node for the Sculptor/Silver Dollar family of galaxies.",
    },
    {
      id: "canes-venatici-cloud",
      name: "Canes Venatici Cloud",
      type: "Galaxy Cloud",
      position: [-10, 17, 26],
      radius: 1.08,
      color: 0xc8f1ff,
      meta: "Nearby galaxy cloud | spiral-rich field",
      summary: "A loose galaxy-cloud anchor for Whirlpool, Pinwheel, Sunflower, and similar spiral seeds.",
    },
    {
      id: "centaurus-group",
      name: "Centaurus Group",
      type: "Galaxy Group",
      position: [24, -9, 7],
      radius: 1.2,
      color: 0xffcf9a,
      meta: "Nearby galaxy group | Centaurus / M83 region",
      summary: "A local-universe group node for Centaurus A and Southern Pinwheel style galaxies.",
    },
    {
      id: "fornax-cluster",
      name: "Fornax Cluster",
      type: "Galaxy Cluster",
      position: [7, -19, -18],
      radius: 1.2,
      color: 0xffd4a8,
      meta: "Nearby galaxy cluster | Fornax region",
      summary: "A cluster node for barred spirals and southern-sky galaxy anchors.",
    },
    {
      id: "active-galaxy-field",
      name: "Active Galaxy Field",
      type: "Survey Field",
      position: [38, 13, -5],
      radius: 1.18,
      color: 0xffc7d8,
      meta: "Quasar and AGN holding field | artistic scaffold",
      summary: "A temporary but explicit home for active galaxies and quasars until catalog coordinates are attached.",
    },
    {
      id: "peculiar-galaxy-field",
      name: "Peculiar Galaxy Field",
      type: "Survey Field",
      position: [-40, 11, -4],
      radius: 1.14,
      color: 0xd0c2ff,
      meta: "Ring, tidal, and interacting galaxies | artistic scaffold",
      summary: "A holding field for strange morphologies: ring galaxies, mergers, tails, and collision-shaped systems.",
    },
    {
      id: "local-void",
      name: "Local Void",
      type: "Void",
      position: [-32, -12, -4],
      radius: 2.4,
      color: 0x4d4aa2,
      voidNode: true,
      meta: "Nearby underdense region | local cosmic structure",
      summary: "An emptier neighboring region, included so our Laniakea address is shaped by absence as well as luminous knots.",
    },
    {
      id: "hydra-centaurus",
      name: "Hydra-Centaurus",
      type: "Galaxy Supercluster",
      position: [9, -4, 13],
      radius: 1.34,
      color: 0xffe0ad,
      meta: "Local supercluster complex | Great Attractor region",
      summary: "A named large-scale neighbor associated with the flow structures around the Great Attractor.",
    },
    {
      id: "norma-cluster",
      name: "Norma Cluster",
      type: "Galaxy Cluster",
      position: [21, -7, 19],
      radius: 1.22,
      color: 0xfff0c8,
      meta: "Rich galaxy cluster | Great Attractor region",
      summary: "A dense cluster anchor near the Great Attractor vocabulary, useful for flow-line navigation.",
    },
    {
      id: "great-attractor",
      name: "Great Attractor",
      type: "Mass Concentration",
      position: [27, -4, 14],
      radius: 1.72,
      color: 0xfff0c8,
      priority: 5.8,
      meta: "Gravitational anomaly region | Laniakea flow center",
      summary: "A selectable mass-concentration reference near the center of the Laniakea flow map.",
      stats: [
        { value: "flow center", label: "map role" },
        { value: "Norma region", label: "sky region" },
      ],
    },
    {
      id: "coma-cluster",
      name: "Coma Cluster",
      type: "Galaxy Cluster",
      position: [42, 18, -30],
      radius: 1.46,
      color: 0xd8f8ff,
      meta: "Rich galaxy cluster | large-scale structure node",
      summary: "A classic rich cluster anchor, held at Laniakea-adjacent scale as a bridge toward the top web.",
    },
    {
      id: "shapley-concentration",
      name: "Shapley Concentration",
      type: "Galaxy Supercluster",
      position: [54, 11, -10],
      radius: 1.58,
      color: 0xffffff,
      meta: "Dense supercluster region | distant pull reference",
      summary: "A distant concentration of galaxies, included as an anchor for large-scale flow and later data.",
    },
    {
      id: "perseus-pisces",
      name: "Perseus-Pisces Supercluster",
      type: "Galaxy Supercluster",
      position: [-8, 22, 40],
      radius: 1.36,
      color: 0xffe6ad,
      meta: "Nearby supercluster chain | large-scale structure",
      summary: "A bright large-scale structure marker for chained-galaxy data and directional navigation.",
    },
    {
      id: "vela-supercluster",
      name: "Vela Supercluster",
      type: "Galaxy Supercluster",
      position: [0, -25, 45],
      radius: 1.42,
      color: 0xffc7a8,
      meta: "Large hidden supercluster | Zone of Avoidance region",
      summary: "A partly obscured large-scale structure anchor, included as a future candidate for hidden-mass storytelling.",
    },
    {
      id: "sloan-great-wall",
      name: "Sloan Great Wall",
      type: "Galaxy Wall",
      position: [-47, 4, 26],
      radius: 1.52,
      color: 0xb8f7ff,
      meta: "Large-scale galaxy wall | bridge to cosmic web",
      summary: "A named wall-like structure to scaffold cosmic-web features larger than individual superclusters.",
    },
    {
      id: "bootes-void",
      name: "Bootes Void",
      type: "Void",
      position: [47, -15, 28],
      radius: 2.45,
      color: 0x5b4ea2,
      voidNode: true,
      meta: "Large cosmic void | large-scale reference",
      summary: "A deliberately sparse selectable region, included so the large-scale map has emptiness as well as luminous knots.",
    },
  ];
  const structureNodes = rawStructureNodes.map((node) => ({
    ...node,
    position: laniakeaPositionOverrides.get(node.id) ?? toLaniakeaFlowPosition(node.position),
  }));
  const structureMap = new Map(structureNodes.map((node) => [node.id, node]));
  const canBridgeStructureNode = (node) =>
    Boolean(node) && !node.voidNode && !`${node.type ?? ""} ${node.name ?? ""}`.toLowerCase().includes("void");
  const laniakeaBridgeThicknessBoost = 1.16;
  const laniakeaBridgeOpacityBoost = 1.12;
  const laniakeaBridgeFlowBoost = 1.55;

  const structurePaths = [
    // Laniakea bridge grammar: trunk flows define mass currents; cross-weaves make the spiderweb; rim ties stitch the outer wall/field nodes.
    {
      ids: ["local-group-web", "virgo-cluster", "hydra-centaurus", "great-attractor", "norma-cluster"],
      braidCount: 3,
      width: 0.86,
      opacity: 0.25,
      warmth: 0.5,
      flowAmount: 0.18,
    },
    {
      ids: ["local-group-web", "m81-group", "canes-venatici-cloud", "perseus-pisces"],
      braidCount: 3,
      width: 0.78,
      opacity: 0.225,
      warmth: 0.42,
      flowAmount: 0.165,
    },
    {
      ids: ["local-group-web", "sculptor-group", "centaurus-group", "hydra-centaurus"],
      braidCount: 3,
      width: 0.76,
      opacity: 0.22,
      warmth: 0.58,
      flowAmount: 0.165,
    },
    {
      ids: ["virgo-cluster", "coma-cluster", "shapley-concentration"],
      braidCount: 3,
      width: 0.72,
      opacity: 0.205,
      warmth: 0.35,
      flowAmount: 0.145,
    },
    {
      ids: ["active-galaxy-field", "great-attractor", "shapley-concentration"],
      braidCount: 3,
      width: 0.68,
      opacity: 0.205,
      warmth: 0.62,
      flowAmount: 0.15,
    },
    {
      ids: ["active-galaxy-field", "fornax-cluster"],
      braidCount: 3,
      width: 0.64,
      opacity: 0.19,
      warmth: 0.64,
      flowAmount: 0.14,
    },
    {
      ids: ["peculiar-galaxy-field", "virgo-cluster", "fornax-cluster", "vela-supercluster"],
      braidCount: 3,
      width: 0.7,
      opacity: 0.205,
      warmth: 0.55,
      flowAmount: 0.15,
    },
    {
      ids: ["fornax-cluster", "vela-supercluster"],
      braidCount: 3,
      width: 0.9,
      opacity: 0.245,
      warmth: 0.62,
      flowAmount: 0.18,
      sampleCount: 108,
    },
    {
      ids: ["fornax-cluster", "coma-cluster"],
      braidCount: 3,
      width: 0.78,
      opacity: 0.225,
      warmth: 0.48,
      flowAmount: 0.165,
      sampleCount: 104,
    },
    {
      ids: ["vela-supercluster", "m81-group"],
      braidCount: 3,
      width: 0.76,
      opacity: 0.21,
      warmth: 0.5,
      flowAmount: 0.16,
    },
    {
      ids: ["vela-supercluster", "perseus-pisces"],
      braidCount: 3,
      width: 0.76,
      opacity: 0.205,
      warmth: 0.48,
      flowAmount: 0.155,
    },
    {
      ids: ["vela-supercluster", "sculptor-group"],
      braidCount: 3,
      width: 0.74,
      opacity: 0.2,
      warmth: 0.6,
      flowAmount: 0.15,
    },
    {
      ids: ["vela-supercluster", "sloan-great-wall"],
      braidCount: 3,
      width: 0.78,
      opacity: 0.2,
      warmth: 0.44,
      flowAmount: 0.15,
    },
    {
      ids: ["canes-venatici-cloud", "virgo-cluster"],
      braidCount: 3,
      width: 0.68,
      opacity: 0.19,
      warmth: 0.42,
      flowAmount: 0.135,
    },
    {
      ids: ["sloan-great-wall", "peculiar-galaxy-field"],
      braidCount: 3,
      width: 0.72,
      opacity: 0.19,
      warmth: 0.5,
      flowAmount: 0.14,
    },
    {
      ids: ["sloan-great-wall", "perseus-pisces", "shapley-concentration"],
      braidCount: 3,
      width: 0.72,
      opacity: 0.2,
      warmth: 0.38,
      flowAmount: 0.145,
    },
  ];
  const bridgedStructureIds = new Set();
  for (const [index, path] of structurePaths.entries()) {
    const nodes = path.ids.map((id) => structureMap.get(id));
    if (!nodes.every(canBridgeStructureNode)) {
      continue;
    }
    for (const id of path.ids) {
      bridgedStructureIds.add(id);
    }
    group.add(
      createLaniakeaBraidedBridge(
        nodes.map((node) => node.position),
        {
          seedLabel: `laniakea-${path.ids.join("-")}`,
          braidCount: path.braidCount,
          sampleCount: path.sampleCount ?? (index < 3 ? 112 : 96),
          width: path.width * laniakeaBridgeThicknessBoost,
          opacity: THREE.MathUtils.clamp(path.opacity * laniakeaBridgeOpacityBoost, 0, 0.42),
          phase: index * 0.72,
          warmth: path.warmth,
          coreSize: (index < 3 ? 0.105 : 0.092) * laniakeaBridgeThicknessBoost,
          sheathSize: (index < 3 ? 0.15 : 0.132) * laniakeaBridgeThicknessBoost,
          flowAmount: (path.flowAmount ?? 0.11) * laniakeaBridgeFlowBoost,
          flowSpeed: 0.78 + index * 0.035,
        }
      )
    );
  }
  const bridgeableNodes = structureNodes.filter(canBridgeStructureNode);
  for (const node of bridgeableNodes) {
    if (bridgedStructureIds.has(node.id)) {
      continue;
    }
    const nearest = bridgeableNodes
      .filter((candidate) => candidate.id !== node.id && bridgedStructureIds.has(candidate.id))
      .map((candidate) => ({
        candidate,
        distance: new THREE.Vector3(...candidate.position).distanceTo(new THREE.Vector3(...node.position)),
      }))
      .sort((a, b) => a.distance - b.distance)[0]?.candidate;
    if (!nearest) {
      continue;
    }
    bridgedStructureIds.add(node.id);
    group.add(
      createLaniakeaBraidedBridge(
        [node.position, nearest.position],
        {
          seedLabel: `laniakea-auto-${node.id}-${nearest.id}`,
          braidCount: 3,
          sampleCount: 84,
          width: 0.56 * laniakeaBridgeThicknessBoost,
          opacity: 0.14 * laniakeaBridgeOpacityBoost,
          phase: bridgedStructureIds.size * 0.37,
          warmth: 0.46,
          coreSize: 0.078 * laniakeaBridgeThicknessBoost,
          sheathSize: 0.112 * laniakeaBridgeThicknessBoost,
          flowAmount: 0.11 * laniakeaBridgeFlowBoost,
          flowSpeed: 0.7,
        }
      )
    );
  }
  const structureObjects = new Map();
  for (const node of structureNodes) {
    const nodeObject = createStructureNodeObject({ band: "laniakea", ...node });
    structureObjects.set(node.id, nodeObject);
    group.add(nodeObject);
  }

  const galaxySeeds = [
    { id: "m87", parent: "virgo-cluster", name: "Messier 87", kind: "elliptical", offset: [4, -1.2, 1.2], radius: 5.7, color: 0xffd8a8, meta: "Elliptical galaxy | Virgo Cluster", summary: "A massive elliptical galaxy marker, now correctly housed under the Virgo Cluster node." },
    { id: "messier-49", parent: "virgo-cluster", name: "Messier 49", kind: "elliptical", offset: [-4, 1.4, -2.2], radius: 3.4, color: 0xffdfb8, meta: "Elliptical galaxy | Virgo Cluster", summary: "A massive elliptical Virgo-region anchor." },
    { id: "messier-60", parent: "virgo-cluster", name: "Messier 60", kind: "elliptical", offset: [1.4, 2.4, -4.4], radius: 3.1, color: 0xffd9ad, meta: "Elliptical galaxy | Virgo Cluster", summary: "A bright elliptical anchor inside the Virgo-region node." },
    { id: "sombrero-galaxy", parent: "virgo-cluster", name: "Sombrero Galaxy", kind: "barred", offset: [-6.4, -1.8, 3.5], radius: 4.4, color: 0xffe6bf, meta: "Ringed/lenticular galaxy | Virgo region", summary: "A named galaxy variant with a strong central structure, moved out of the Local Group layer." },
    { id: "little-sombrero", parent: "virgo-cluster", name: "Little Sombrero Galaxy", kind: "barred", offset: [-8.2, -0.6, 0.6], radius: 2.7, color: 0xffe0b8, meta: "Spiral galaxy | NGC 7814", summary: "An edge-on dust-lane anchor, held as a Virgo-region comparison object." },
    { id: "bodes-galaxy", parent: "m81-group", name: "Bode's Galaxy", kind: "spiral", offset: [-3.5, 0.8, 1.2], radius: 3.5, color: 0xc7eeff, meta: "Spiral galaxy | Messier 81", summary: "A bright nearby spiral-galaxy anchor, now housed with the M81 Group." },
    { id: "cigar-galaxy", parent: "m81-group", name: "Cigar Galaxy", kind: "irregular", offset: [2.7, -0.3, -0.9], radius: 2.8, color: 0xffb27c, meta: "Starburst galaxy | Messier 82", summary: "A compact starburst anchor paired with Bode's Galaxy in the M81 Group." },
    { id: "silver-dollar-galaxy", parent: "sculptor-group", name: "Silver Dollar Galaxy", kind: "spiral", offset: [2.2, 1.0, -1.5], radius: 3.2, color: 0xbdeeff, meta: "Sculptor Galaxy | NGC 253", summary: "A bright starburst galaxy seed, now housed in the Sculptor Group." },
    { id: "sculptor-galaxy", parent: "sculptor-group", name: "Sculptor Galaxy", kind: "irregular", offset: [-2.4, -0.8, 1.5], radius: 2.7, color: 0x9ff5e8, meta: "Starburst galaxy | NGC 253", summary: "A starburst-galaxy anchor, associated with the Sculptor neighborhood." },
    { id: "centaurus-a", parent: "centaurus-group", name: "Centaurus A", kind: "elliptical", offset: [2.3, 0.8, 0.5], radius: 3.5, color: 0xffcf9a, activeCore: true, meta: "Radio galaxy | dust-lane elliptical", summary: "A radio-galaxy anchor with active-core treatment in the Centaurus group." },
    { id: "southern-pinwheel", parent: "centaurus-group", name: "Southern Pinwheel Galaxy", kind: "barred", offset: [-2.8, -1.2, -1.4], radius: 3.6, color: 0xb8f3ff, meta: "Barred spiral galaxy | Messier 83", summary: "A barred spiral target with a bright core and strong arms, now grouped near Centaurus." },
    { id: "whirlpool-galaxy", parent: "canes-venatici-cloud", name: "Whirlpool Galaxy", kind: "spiral", offset: [3.5, 1.2, -1.4], radius: 3.7, color: 0xd4f2ff, meta: "Grand-design spiral galaxy | Messier 51", summary: "A bright spiral-galaxy anchor housed in a nearby spiral-rich cloud." },
    { id: "pinwheel-galaxy", parent: "canes-venatici-cloud", name: "Pinwheel Galaxy", kind: "spiral", offset: [-3.2, 1.8, 1.8], radius: 3.8, color: 0xc8f1ff, meta: "Face-on spiral galaxy | Messier 101", summary: "A wide face-on spiral scaffold in the nearby spiral-rich cloud." },
    { id: "sunflower-galaxy", parent: "canes-venatici-cloud", name: "Sunflower Galaxy", kind: "spiral", offset: [0.6, -2.0, 2.5], radius: 2.8, color: 0xffe5a8, meta: "Flocculent spiral galaxy | Messier 63", summary: "A patchy spiral anchor for comparing arm texture." },
    { id: "black-eye-galaxy", parent: "canes-venatici-cloud", name: "Black Eye Galaxy", kind: "spiral", offset: [-5.4, -1.3, -1.5], radius: 2.7, color: 0xd9eaff, meta: "Spiral galaxy | Messier 64", summary: "A named spiral with a dark-dust identity, parked in the nearby-galaxy cloud." },
    { id: "fireworks-galaxy", parent: "canes-venatici-cloud", name: "Fireworks Galaxy", kind: "spiral", offset: [5.6, -1.4, 1.7], radius: 2.8, color: 0xffc8d8, meta: "Intermediate spiral galaxy | NGC 6946", summary: "A supernova-rich galaxy anchor for future transient-event annotations." },
    { id: "ngc-1300", parent: "fornax-cluster", name: "NGC 1300", kind: "barred", offset: [-2.8, 0.8, 1.8], radius: 3.0, color: 0xffdab0, meta: "Barred spiral galaxy | Eridanus", summary: "A clean barred-spiral morphology anchor." },
    { id: "ngc-1365", parent: "fornax-cluster", name: "NGC 1365", kind: "barred", offset: [3.3, -1.0, -1.4], radius: 3.3, color: 0xffc59e, meta: "Great barred spiral galaxy | Fornax", summary: "A large barred spiral seed, useful for active-core and dust-lane detail." },
    { id: "markarian-231", parent: "active-galaxy-field", name: "Markarian 231", kind: "elliptical", offset: [-3.2, 1.0, 1.4], radius: 2.5, color: 0xffd3c8, typeLabel: "Quasar Host Galaxy", activeCore: true, meta: "Quasar host galaxy | luminous infrared galaxy", summary: "An active-galaxy anchor with AGN outflow vocabulary." },
    { id: "ngc-1275", parent: "active-galaxy-field", name: "NGC 1275", kind: "elliptical", offset: [2.4, 1.5, -1.1], radius: 2.8, color: 0xffc7b6, activeCore: true, meta: "Active galaxy | Perseus Cluster", summary: "An active central galaxy seed with room for jets and filamentary feedback detail." },
    { id: "eye-of-sauron-galaxy", parent: "active-galaxy-field", name: "Eye of Sauron Galaxy", kind: "spiral", offset: [0.8, -2.5, 2.8], radius: 2.6, color: 0xffdab0, activeCore: true, meta: "Ringed spiral galaxy | NGC 4151", summary: "A ringed active-galaxy anchor for bright-core visual treatment." },
    { id: "hoags-object", parent: "peculiar-galaxy-field", name: "Hoag's Object", kind: "elliptical", offset: [-3.4, 0.8, 1.2], radius: 2.5, color: 0xffefc9, meta: "Ring galaxy | peculiar object", summary: "A rare ring-galaxy anchor, deliberately included to break the ordinary spiral rhythm." },
    { id: "tadpole-galaxy", parent: "peculiar-galaxy-field", name: "Tadpole Galaxy", kind: "irregular", offset: [2.6, 1.2, -1.6], radius: 2.4, color: 0x9ff5e8, meta: "Disrupted spiral galaxy | tidal tail", summary: "A collision-shaped galaxy seed, intended for later long-tail morphology." },
    { id: "antennae-galaxies", parent: "peculiar-galaxy-field", name: "Antennae Galaxies", kind: "irregular", offset: [-0.7, -2.4, 2.2], radius: 2.7, color: 0xffc7a8, meta: "Interacting galaxies | NGC 4038/4039", summary: "A merger anchor for future twin-core and tidal-tail treatment." },
    { id: "mayalls-object", parent: "peculiar-galaxy-field", name: "Mayall's Object", kind: "irregular", offset: [3.6, -1.2, 1.4], radius: 2.2, color: 0xd0c2ff, meta: "Collisional ring galaxy | Arp 148", summary: "A peculiar interacting system seed." },
    { id: "cartwheel-galaxy", parent: "peculiar-galaxy-field", name: "Cartwheel Galaxy", kind: "barred", offset: [-5.4, -1.6, -0.9], radius: 2.8, color: 0xffe0b8, meta: "Ring galaxy | collision morphology", summary: "A ring-galaxy scaffold, different from ordinary spiral and elliptical silhouettes." },
    { id: "mice-galaxies", parent: "peculiar-galaxy-field", name: "Mice Galaxies", kind: "irregular", offset: [5.6, 1.8, 0.6], radius: 2.4, color: 0xc7f7ff, meta: "Interacting galaxies | NGC 4676", summary: "A tidal-tail collision seed, extending the catalog beyond isolated disks." },
    { id: "ngc-6240", parent: "peculiar-galaxy-field", name: "NGC 6240", kind: "irregular", offset: [1.2, 3.1, 2.7], radius: 2.4, color: 0xffbfa8, activeCore: true, meta: "Merging galaxy | dual active nuclei", summary: "A turbulent merger anchor for future dual-core visualization." },
    { id: "needle-galaxy", parent: "virgo-cluster", name: "Needle Galaxy", kind: "barred", offset: [-9.5, 1.8, -3.2], radius: 2.4, color: 0xd8efff, meta: "Edge-on spiral galaxy | NGC 4565", summary: "A thin edge-on galaxy seed, included to make this layer less uniformly face-on." },
    { id: "malin-1", parent: "active-galaxy-field", name: "Malin 1", kind: "spiral", offset: [5.8, 0.4, 1.9], radius: 3.2, color: 0xaedfff, meta: "Giant low-surface-brightness spiral", summary: "A diffuse spiral anchor, deliberately faint and extended." },
    { id: "ic-1101", parent: "shapley-concentration", name: "IC 1101", kind: "elliptical", offset: [3.4, 0.8, 1.6], radius: 3.4, color: 0xffdca8, meta: "Giant elliptical galaxy | distant mass anchor", summary: "A massive elliptical seed, useful for future size-comparison treatment." },
    { id: "ngc-4650a", parent: "peculiar-galaxy-field", name: "NGC 4650A", kind: "irregular", offset: [-2.4, 3.3, -2.2], radius: 2.3, color: 0xd6c8ff, meta: "Polar-ring galaxy | distinct ring morphology", summary: "A polar-ring galaxy seed for strange silhouette vocabulary." },
    { id: "condor-galaxy", parent: "centaurus-group", name: "Condor Galaxy", kind: "spiral", offset: [5.0, 1.6, -2.6], radius: 3.4, color: 0xbdeeff, meta: "Large spiral galaxy | NGC 6872", summary: "A broad spiral-galaxy anchor for future large-disk size comparison." },
    { id: "tullys-galaxy", parent: "canes-venatici-cloud", name: "Tully's Galaxy", kind: "barred", offset: [-1.2, 4.2, -2.6], radius: 3.1, color: 0xffe1b8, meta: "Barred spiral galaxy | UGC 2885", summary: "A large barred-spiral seed for high-mass disk comparison." },
    { id: "stephans-quintet", parent: "peculiar-galaxy-field", name: "Stephan's Quintet", kind: "irregular", offset: [4.2, -3.2, -2.6], radius: 2.5, color: 0xffd6b6, meta: "Compact galaxy group | interacting system", summary: "A compact interacting-galaxy anchor for later multi-core detail." },
  ];

  const laniakeaGalaxyObjects = new Map();
  for (const [index, galaxy] of galaxySeeds.entries()) {
    const parent = structureMap.get(galaxy.parent);
    const parentObject = structureObjects.get(galaxy.parent);
    if (!parent || !parentObject) continue;
    const galaxyObject = createMiniGalaxyObject({
      id: galaxy.id,
      name: galaxy.name,
      kind: galaxy.kind,
      band: "laniakea",
      position: getLaniakeaChildOffset(parent, galaxy.offset, galaxy.radius),
      radius: galaxy.radius,
      color: galaxy.color,
      pointCount: galaxy.kind === "elliptical" ? 220 : 300,
      typeLabel: galaxy.typeLabel ?? null,
      activeCore: Boolean(galaxy.activeCore),
      priority: 2.2,
      meta: galaxy.meta,
      summary: galaxy.summary,
      parentId: galaxy.parent,
      relation: "member galaxy",
      stats: [
        { value: galaxy.kind, label: "morphology" },
        { value: parent.name, label: "home node" },
      ],
      scaleHint: `Reference: this galaxy is spaced inside ${parent.name}; select the parent structure and zoom inward for a local-group-style inspection view.`,
    });
    applyLaniakeaMemberOrbit(galaxyObject, parent, galaxy.id, index);
    laniakeaGalaxyObjects.set(galaxy.id, galaxyObject);
    parentObject.add(galaxyObject);
  }
  for (const [index, galaxy] of catalogLaniakeaGalaxies.entries()) {
    const parent = structureMap.get(galaxy.parent);
    const parentObject = structureObjects.get(galaxy.parent);
    if (!parent || !parentObject) continue;
    const galaxyObject = createMiniGalaxyObject({
      id: galaxy.id,
      name: galaxy.name,
      kind: galaxy.kind,
      band: "laniakea",
      position: getLaniakeaChildOffset(parent, galaxy.offset, galaxy.radius),
      radius: galaxy.radius,
      color: galaxy.color,
      pointCount: galaxy.kind === "elliptical" ? 230 : 310,
      activeCore: Boolean(galaxy.activeCore),
      priority: 2.15,
      meta: galaxy.meta,
      summary: galaxy.summary,
      parentId: galaxy.parent,
      relation: "member galaxy",
      stats: [
        { value: galaxy.kind, label: "morphology" },
        { value: parent.name, label: "home node" },
      ],
      scaleHint: `Reference: this catalog galaxy is spaced inside ${parent.name}; select the parent structure and zoom inward for a local-group-style inspection view.`,
    });
    applyLaniakeaMemberOrbit(galaxyObject, parent, galaxy.id, index + galaxySeeds.length);
    laniakeaGalaxyObjects.set(galaxy.id, galaxyObject);
    parentObject.add(galaxyObject);
  }

  const m87Node = structureMap.get("virgo-cluster");
  const m87ParentObject = structureObjects.get("virgo-cluster");
  const m87GalaxyObject = laniakeaGalaxyObjects.get("m87");
  if (m87Node && (m87GalaxyObject || m87ParentObject)) {
    const m87BlackHole = createBlackHoleObject({
      id: "m87-star",
      name: "M87*",
      band: "laniakea",
      position: m87GalaxyObject ? [0.08, 0.02, 0.05] : getLaniakeaChildOffset(m87Node, [4.15, -1.05, 1.18], 0.9),
      radius: 0.9,
      meta: "Supermassive black hole | Event Horizon Telescope target",
      summary: "A black-hole object of interest associated with Messier 87, represented as a compact selectable anchor in the Virgo node.",
      parentId: "m87",
      relation: "central black hole",
    });
    (m87GalaxyObject ?? m87ParentObject).add(m87BlackHole);
  }

  const activeNode = structureMap.get("active-galaxy-field");
  const activeParentObject = structureObjects.get("active-galaxy-field");
  if (activeNode && activeParentObject) {
    const actualQuasar = createQuasarObject({
        id: "3c-273-quasar",
        name: "3C 273",
        band: "laniakea",
        position: getLaniakeaChildOffset(activeNode, [4.2, -1.2, -2.4], 1.15),
        radius: 1.15,
        color: 0xffe6a8,
        meta: "Quasar | active galactic nucleus anchor",
        summary: "A luminous quasar object placed in the active-galaxy field as a test case for jet/lensing vocabulary.",
        parentId: "active-galaxy-field",
        relation: "quasar",
        stats: [
          { value: "quasar", label: "class" },
          { value: "AGN", label: "engine" },
        ],
      });
    applyLaniakeaMemberOrbit(actualQuasar, activeNode, "3c-273-quasar", 97);
    activeParentObject.add(actualQuasar);
  }
  return group;
}

function disposeGeneratedObjectTree(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    const material = child.material;
    if (Array.isArray(material)) {
      for (const item of material) {
        item.dispose?.();
      }
    } else {
      material?.dispose?.();
    }
  });
}

function createDeepWebRegressShell(shellIndex) {
  const localRandom = seededRandom(771931 + shellIndex * 92821);
  const group = new THREE.Group();
  const nodeCount = 11 + (Math.abs(shellIndex) % 4);
  const nodePositions = [];
  const voidCenters = [
    new THREE.Vector3(0, 0, 0),
    ...Array.from({ length: 3 }, (_, index) => {
      const angle = shellIndex * 0.51 + index * 2.14 + localRandom() * 0.45;
      return new THREE.Vector3(
        Math.cos(angle) * (34 + localRandom() * 38),
        (localRandom() - 0.5) * 38,
        Math.sin(angle) * (28 + localRandom() * 38)
      );
    }),
  ];
  const pushProjectedVoidGap = (point, radius, amount = 1) => {
    const screenRadius = Math.hypot(point.x, point.y);
    if (screenRadius >= radius) {
      return;
    }
    const angle = screenRadius > 0.001 ? Math.atan2(point.y, point.x) : localRandom() * Math.PI * 2;
    const push = (radius - screenRadius) * amount;
    point.x += Math.cos(angle) * push;
    point.y += Math.sin(angle) * push;
  };

  for (let i = 0; i < nodeCount; i += 1) {
    const angle = shellIndex * 0.37 + i * 2.399963 + localRandom() * 0.5;
    const radius = 38 + Math.pow(localRandom(), 0.58) * 72;
    const point = new THREE.Vector3(
      Math.cos(angle) * radius * (0.9 + localRandom() * 0.32),
      (localRandom() - 0.5) * (28 + localRandom() * 28),
      Math.sin(angle) * radius * (0.62 + localRandom() * 0.42)
    );
    for (const voidCenter of voidCenters) {
      const away = point.clone().sub(voidCenter);
      const distance = Math.max(0.001, away.length());
      if (distance < 44) {
        point.addScaledVector(away.normalize(), (44 - distance) * (0.2 + localRandom() * 0.3));
      }
    }
    pushProjectedVoidGap(point, 38, 1.18);
    nodePositions.push(point);
  }

  const edgeKeys = new Set();
  const edges = [];
  const addEdge = (left, right) => {
    if (left === right) return;
    const key = [left, right].sort((a, b) => a - b).join(":");
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push([left, right]);
  };
  for (let i = 0; i < nodePositions.length; i += 1) {
    const nearest = nodePositions
      .map((position, index) => ({ index, distance: position.distanceTo(nodePositions[i]) }))
      .filter((entry) => entry.index !== i)
      .sort((left, right) => left.distance - right.distance);
    addEdge(i, nearest[0]?.index ?? i);
    if (i % 3 === 0) addEdge(i, nearest[1]?.index ?? i);
    if (i % 7 === 0) addEdge(i, nearest[2]?.index ?? i);
  }

  const filamentPositions = [];
  const filamentColors = [];
  const corePositions = [];
  const coreColors = [];
  const knotPositions = [];
  const knotColors = [];
  const violet = new THREE.Color(0x6e4dff);
  const ultraviolet = new THREE.Color(0x945fff);
  const magenta = new THREE.Color(0xff5bd6);
  const infrared = new THREE.Color(0xff725c);
  const amber = new THREE.Color(0xffd175);
  const white = new THREE.Color(0xffffff);

  const spiralArmCount = 5 + (Math.abs(shellIndex) % 2);
  for (let arm = 0; arm < spiralArmCount; arm += 1) {
    const phase = shellIndex * 0.43 + (arm / spiralArmCount) * Math.PI * 2 + localRandom() * 0.42;
    const handedness = arm % 2 === 0 ? 1 : -1;
    const turns = 1.25 + localRandom() * 0.85;
    const baseRadius = 42 + localRandom() * 22;
    const outerRadius = 112 + localRandom() * 66;
    const pitch = (localRandom() - 0.5) * 52;
    const samples = 126;
    for (let i = 0; i < samples; i += 1) {
      const t = i / Math.max(1, samples - 1);
      const taper = Math.sin(t * Math.PI);
      const angle = phase + handedness * t * turns * Math.PI * 2 + Math.sin(t * Math.PI * 2 + shellIndex) * 0.12;
      const radius = THREE.MathUtils.lerp(baseRadius, outerRadius, Math.pow(t, 0.72)) + taper * (11 + localRandom() * 13);
      const armPoint = new THREE.Vector3(
        Math.cos(angle) * radius * (0.95 + localRandom() * 0.18),
        (t - 0.5) * pitch + Math.sin(angle * 0.52 + arm) * (5.8 + taper * 6.4),
        Math.sin(angle) * radius * (0.72 + localRandom() * 0.22)
      );
      pushProjectedVoidGap(armPoint, 32, 1.04);
      const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
      const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
      const tubeWidth = 2.8 + taper * (5.6 + localRandom() * 4.2);
      for (let core = 0; core < 5; core += 1) {
        const twist = angle * 1.6 + core * 0.82;
        const localTube = tubeWidth * (0.08 + localRandom() * 0.16);
        const jitter = makeLocalSpherePoint(localRandom, localTube);
        jitter.y *= 0.38;
        corePositions.push(
          armPoint.x + tangent.x * Math.cos(twist) * localTube + jitter.x,
          armPoint.y + Math.sin(twist * 0.68) * localTube * 0.62 + jitter.y,
          armPoint.z + tangent.z * Math.cos(twist) * localTube + jitter.z
        );
        reusableColor.copy(magenta)
          .lerp(infrared, 0.3 + taper * 0.32)
          .lerp(amber, arm % 3 === 0 ? 0.18 : 0.08)
          .lerp(white, localRandom() > 0.94 ? 0.22 : 0.035);
        coreColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
      const strandCount = arm % 2 === 0 ? 17 : 14;
      for (let strand = 0; strand < strandCount; strand += 1) {
        const twist = angle * 2.4 + strand * (Math.PI * 2 / strandCount) + shellIndex * 0.17;
        const jitter = makeLocalSpherePoint(localRandom, tubeWidth * (0.12 + localRandom() * 0.92));
        jitter.y *= 0.48;
        filamentPositions.push(
          armPoint.x + radial.x * Math.sin(twist) * tubeWidth * 0.28 + tangent.x * Math.cos(twist) * tubeWidth * 0.74 + jitter.x,
          armPoint.y + Math.sin(twist * 0.72) * tubeWidth * 0.46 + jitter.y,
          armPoint.z + radial.z * Math.sin(twist) * tubeWidth * 0.28 + tangent.z * Math.cos(twist) * tubeWidth * 0.74 + jitter.z
        );
        const warmth = Math.sin(t * Math.PI * 2 + arm * 0.7 + strand * 0.19) * 0.5 + 0.5;
        reusableColor.copy(violet)
          .lerp(ultraviolet, 0.34 + localRandom() * 0.28)
          .lerp(magenta, 0.36 + warmth * 0.34)
          .lerp(infrared, taper * 0.2)
          .lerp(amber, arm % 4 === 0 ? 0.16 : 0.05);
        if (localRandom() > 0.972) reusableColor.lerp(white, 0.32);
        filamentColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
  }

  for (const [voidIndex, voidCenter] of voidCenters.entries()) {
    for (let ring = 0; ring < 3; ring += 1) {
      const radius = 26 + ring * 13 + localRandom() * 12;
      const sampleCount = 144;
      const tilt = (voidIndex - 1) * 0.28 + ring * 0.14;
      for (let i = 0; i < sampleCount; i += 1) {
        const t = i / sampleCount;
        const angle = t * Math.PI * 2 + shellIndex * 0.21 + ring * 0.73;
        const wrinkle = 1 + Math.sin(angle * 3.2 + shellIndex) * 0.08 + Math.sin(angle * 5.1 + ring) * 0.045;
        const rimPoint = new THREE.Vector3(
          voidCenter.x + Math.cos(angle) * radius * wrinkle,
          voidCenter.y + Math.sin(angle + tilt) * radius * 0.24 + Math.sin(angle * 2.1) * 2.8,
          voidCenter.z + Math.sin(angle) * radius * (0.72 + ring * 0.05) * wrinkle
        );
        pushProjectedVoidGap(rimPoint, voidIndex === 0 ? 34 : 22, voidIndex === 0 ? 1.2 : 0.62);
        const rimWidth = 1.8 + ring * 0.72;
        for (let bead = 0; bead < 3; bead += 1) {
          const jitter = makeLocalSpherePoint(localRandom, rimWidth * (0.28 + localRandom()));
          jitter.y *= 0.5;
          filamentPositions.push(rimPoint.x + jitter.x, rimPoint.y + jitter.y, rimPoint.z + jitter.z);
          reusableColor.copy(ultraviolet)
            .lerp(magenta, 0.32 + localRandom() * 0.32)
            .lerp(infrared, ring === 2 ? 0.24 : 0.08)
            .lerp(white, localRandom() > 0.986 ? 0.2 : 0.01);
          filamentColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
        }
      }
    }
  }

  for (const [edgeIndex, [left, right]] of edges.entries()) {
    const start = nodePositions[left];
    const end = nodePositions[right];
    const midpoint = start.clone().lerp(end, 0.5);
    const arc = makeLocalSpherePoint(localRandom, 6 + localRandom() * 16);
    arc.y *= 0.55;
    midpoint.add(arc);
    const curve = createSeededFluidCurveFromPoints([start, midpoint, end], localRandom, {
      amplitude: 3.8 + localRandom() * 5.6,
      verticalScale: 0.42,
      tension: 0.24,
    });
    const samples = curve.getPoints(58);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i];
      const t = i / Math.max(1, samples.length - 1);
      const taper = Math.sin(t * Math.PI);
      const flowWidth = 0.62 + taper * (1.65 + localRandom() * 2.0);
      for (let core = 0; core < 3; core += 1) {
        const jitter = makeLocalSpherePoint(localRandom, flowWidth * (0.08 + localRandom() * 0.2));
        jitter.y *= 0.5;
        corePositions.push(sample.x + jitter.x, sample.y + jitter.y, sample.z + jitter.z);
        reusableColor.copy(magenta)
          .lerp(infrared, 0.22 + taper * 0.3)
          .lerp(white, localRandom() > 0.97 ? 0.28 : 0.04);
        coreColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
      const strandCount = edgeIndex % 3 === 0 ? 8 : 6;
      for (let strand = 0; strand < strandCount; strand += 1) {
        const angle = t * Math.PI * 2 * (1.2 + (edgeIndex % 4) * 0.15) + strand * 0.7 + shellIndex * 0.19;
        const jitter = makeLocalSpherePoint(localRandom, flowWidth * (0.14 + localRandom() * 1.12));
        jitter.y *= 0.54;
        filamentPositions.push(
          sample.x + jitter.x + Math.cos(angle) * flowWidth * 0.36,
          sample.y + jitter.y + Math.sin(angle * 0.7) * flowWidth * 0.16,
          sample.z + jitter.z + Math.sin(angle) * flowWidth * 0.28
        );
        const warmth = Math.sin(i * 0.08 + edgeIndex * 0.73 + strand) * 0.5 + 0.5;
        reusableColor.copy(violet)
          .lerp(ultraviolet, 0.28 + localRandom() * 0.22)
          .lerp(magenta, 0.32 + warmth * 0.34)
          .lerp(amber, edgeIndex % 4 === 0 ? 0.18 : 0.06);
        if (localRandom() > 0.982) reusableColor.lerp(white, 0.3);
        filamentColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
  }

  for (const [nodeIndex, node] of nodePositions.entries()) {
    const knotCount = nodeIndex % 3 === 0 ? 64 : 40;
    for (let i = 0; i < knotCount; i += 1) {
      const jitter = makeLocalSpherePoint(localRandom, Math.pow(localRandom(), 0.46) * (2.8 + localRandom() * 3.2));
      jitter.y *= 0.58;
      knotPositions.push(node.x + jitter.x, node.y + jitter.y, node.z + jitter.z);
      reusableColor.copy(infrared)
        .lerp(amber, 0.28 + localRandom() * 0.42)
        .lerp(magenta, nodeIndex % 2 === 0 ? 0.18 : 0.34)
        .lerp(white, localRandom() > 0.82 ? 0.26 : 0.04);
      knotColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
    }
  }

  for (let i = 0; i < 650; i += 1) {
    const node = nodePositions[Math.floor(localRandom() * nodePositions.length)] ?? nodePositions[0];
    const drift = makeLocalSpherePoint(localRandom, 8 + Math.pow(localRandom(), 0.52) * 34);
    drift.y *= 0.44;
    filamentPositions.push(node.x + drift.x, node.y + drift.y, node.z + drift.z);
    reusableColor.copy(violet).lerp(magenta, localRandom() * 0.5).lerp(amber, localRandom() * 0.08);
    filamentColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }

  const coreCloud = createPointCloud({ positions: corePositions, colors: coreColors }, 0.54, 0.52, true);
  coreCloud.material.userData.twinkleAmount = 0.2;
  coreCloud.material.userData.twinkleSpeed = 0.42 + (Math.abs(shellIndex) % 5) * 0.04;
  const matterCloud = createPointCloud({ positions: filamentPositions, colors: filamentColors }, 0.64, 0.43, true);
  matterCloud.material.userData.twinkleAmount = 0.16;
  matterCloud.material.userData.twinkleSpeed = 0.28 + (Math.abs(shellIndex) % 4) * 0.035;
  const knotCloud = createPointCloud({ positions: knotPositions, colors: knotColors }, 0.74, 0.58, true);
  knotCloud.material.userData.twinkleAmount = 0.28;
  knotCloud.material.userData.twinkleSpeed = 0.55 + (Math.abs(shellIndex) % 3) * 0.06;
  group.add(matterCloud, coreCloud, knotCloud);
  return group;
}

function buildDeepWebRegressLayer(parentGroup) {
  const group = new THREE.Group();
  group.visible = false;
  parentGroup.add(group);
  deepWebRegress = {
    group,
    slots: Array.from({ length: DEEP_WEB_REGRESS_SLOT_COUNT }, (_, index) => {
      const slotGroup = new THREE.Group();
      group.add(slotGroup);
      return {
        offset: index - 1,
        group: slotGroup,
        shellIndex: null,
      };
    }),
  };
}

function getCachedDeepWebRegressShell(shellIndex) {
  const cached = deepWebShellCache.get(shellIndex);
  if (cached) {
    deepWebShellCache.delete(shellIndex);
    deepWebShellCache.set(shellIndex, cached);
    return cached;
  }
  const shell = createDeepWebRegressShell(shellIndex);
  deepWebShellCache.set(shellIndex, shell);
  return shell;
}

function pruneDeepWebShellCache(anchorShellIndex) {
  const activeShells = new Set(
    deepWebRegress?.slots
      .map((slot) => slot.shellIndex)
      .filter((shellIndex) => Number.isFinite(shellIndex)) ?? []
  );
  for (const [shellIndex, shell] of [...deepWebShellCache.entries()]) {
    if (deepWebShellCache.size <= DEEP_WEB_SHELL_CACHE_LIMIT) {
      return;
    }
    if (activeShells.has(shellIndex)) {
      continue;
    }
    if (Math.abs(shellIndex - anchorShellIndex) <= DEEP_WEB_REGRESS_SLOT_COUNT + 2) {
      continue;
    }
    if (shell.parent) {
      shell.parent.remove(shell);
    }
    disposeGeneratedObjectTree(shell);
    deepWebShellCache.delete(shellIndex);
  }
  while (deepWebShellCache.size > DEEP_WEB_SHELL_CACHE_LIMIT) {
    const [shellIndex, shell] = deepWebShellCache.entries().next().value ?? [];
    if (!Number.isFinite(shellIndex) || activeShells.has(shellIndex)) {
      return;
    }
    if (shell.parent) {
      shell.parent.remove(shell);
    }
    disposeGeneratedObjectTree(shell);
    deepWebShellCache.delete(shellIndex);
  }
}

function setDeepWebSlotShell(slot, shellIndex) {
  if (slot.shellIndex === shellIndex) {
    return;
  }
  for (const child of [...slot.group.children]) {
    slot.group.remove(child);
  }
  slot.group.add(getCachedDeepWebRegressShell(shellIndex));
  slot.shellIndex = shellIndex;
  slot.group.rotation.set(shellIndex * 0.19, shellIndex * 0.43, shellIndex * 0.11);
  delete slot.group.userData.materialEntries;
  delete slot.group.userData.materialEntriesVersion;
}

function updateDeepWebRegress(elapsed) {
  if (!deepWebRegress) {
    return;
  }
  const depth = zoomLevel - DEEP_WEB_REGRESS_START;
  const reveal = smoothstep(0.05, 0.72, depth);
  deepWebRegress.group.visible = reveal > 0.012;
  if (!deepWebRegress.group.visible) {
    return;
  }

  const progress = Math.max(0, depth / DEEP_WEB_REGRESS_STEP);
  const baseIndex = Math.floor(progress);
  const fractional = progress - baseIndex;
  const webLayer = layers.find((layer) => layer.key === "web");
  const webLayerScale = webLayer ? getLayerRenderScale(webLayer) : 1;
  const stageCompensation = THREE.MathUtils.clamp(1 / Math.max(0.0016, webLayerScale), 1, 640);
  deepWebRegress.group.scale.setScalar(stageCompensation);
  if (authoredWebContentGroup) {
    const authoredWebOpacity = THREE.MathUtils.lerp(1, 0.18, smoothstep(0.36, 3.1, depth));
    setObjectOpacity(authoredWebContentGroup, authoredWebOpacity, elapsed);
  }
  const authoredGlowOpacity = 1 - reveal * smoothstep(0.28, 2.2, depth);
  for (const glow of deepWebOriginGlows) {
    setObjectOpacity(glow, authoredGlowOpacity * 0.86, elapsed);
  }
  deepWebRegress.group.rotation.y = -elapsed * 0.0035;
  for (const slot of deepWebRegress.slots) {
    const shellIndex = baseIndex + slot.offset;
    if (shellIndex < 0) {
      slot.group.visible = false;
      continue;
    }
    setDeepWebSlotShell(slot, shellIndex);
    const relative = slot.offset - fractional;
    const opacity = reveal * (1 - smoothstep(1.42, 3.28, Math.abs(relative)));
    slot.group.visible = opacity > 0.018;
    if (!slot.group.visible) {
      continue;
    }
    const scale = THREE.MathUtils.clamp(0.9 * Math.pow(1.72, relative + 1.08), 0.54, 6.4);
    slot.group.scale.setScalar(scale);
    slot.group.position.set(
      Math.sin(shellIndex * 1.13) * 13 * scale,
      Math.cos(shellIndex * 0.71) * 5.4 * scale,
      Math.cos(shellIndex * 0.89) * 12 * scale
    );
    slot.group.rotation.y += 0.00022 * (1 + shellIndex % 5);
    setObjectOpacity(slot.group, opacity * 0.9, elapsed);
  }
  pruneDeepWebShellCache(baseIndex);
}

function buildCosmicWebLayer() {
  const bandInfo = getBandByKey("web");
  const group = makeLayer("web", bandInfo.center, bandInfo.width, 1, new THREE.Group());
  const authoredWebContent = new THREE.Group();
  authoredWebContentGroup = authoredWebContent;
  group.add(authoredWebContent);
  const knots = [
    { id: "laniakea", name: "Laniakea Supercluster", type: "Supercluster", position: [-14, -4, -8], radius: 1.45, color: 0xffe6ad, portalTargetBand: "laniakea", innerZoomFloor: getBandByKey("laniakea").center, meta: "Home supercluster basin | Local Group address chain", summary: "Our large-scale home node in the cosmic web. Select it and zoom inward to enter the Laniakea flow map.", stats: [{ value: "home basin", label: "address" }, { value: "portal", label: "zoom role" }], scaleHint: "Reference: this top-layer node is home-biased navigation, not a claim that Laniakea is the center of the universe." },
    { id: "shapley-web", name: "Shapley Concentration", type: "Galaxy Supercluster", position: [28, 7, -18], radius: 1.55, color: 0xffffff, meta: "Dense supercluster region | top-web node", summary: "A massive concentration used as a bright knot in the large-scale cosmic web." },
    { id: "sloan-wall-web", name: "Sloan Great Wall", type: "Galaxy Wall", position: [-34, 9, 18], radius: 1.5, color: 0xff8fe2, meta: "Large-scale galaxy wall | top-web node", summary: "A wall-like large-scale structure anchor in the top cosmic-web field." },
    { id: "perseus-pisces-web", name: "Perseus-Pisces Chain", type: "Galaxy Supercluster", position: [-6, 20, 30], radius: 1.28, color: 0xffd28a, meta: "Nearby supercluster chain | top-web node", summary: "A luminous chain knot, included to help the top web feel directional rather than random." },
    { id: "coma-wall-web", name: "Coma Wall", type: "Galaxy Wall", position: [18, 24, -36], radius: 1.34, color: 0xd8f8ff, meta: "Large-scale wall | top-web node", summary: "A bright wall node, useful as a far structural reference." },
    { id: "south-pole-wall", name: "South Pole Wall", type: "Galaxy Wall", position: [-22, -22, 24], radius: 1.42, color: 0xffb8c8, meta: "Large-scale wall | top-web node", summary: "A named large-scale wall anchor, added as another filament spine in the cosmic web." },
    { id: "pisces-cetus", name: "Pisces-Cetus Complex", type: "Supercluster Complex", position: [38, -8, 20], radius: 1.46, color: 0xffe0ad, meta: "Supercluster complex | top-web node", summary: "A large structure anchor that extends the top-layer web beyond local named nodes." },
    { id: "horologium-reticulum", name: "Horologium-Reticulum", type: "Supercluster", position: [4, -28, -28], radius: 1.22, color: 0xd0c2ff, meta: "Supercluster | top-web node", summary: "A distant supercluster anchor for a cooler purple branch of the web." },
    { id: "eridanus-supervoid", name: "Eridanus Supervoid", type: "Void", position: [-44, -16, -8], radius: 2.65, color: 0x553a92, voidNode: true, meta: "Large underdense region | top-web void", summary: "A void anchor that gives the luminous web negative space and direction." },
    { id: "bootes-void-web", name: "Bootes Void", type: "Void", position: [46, -18, 8], radius: 2.55, color: 0x5b4ea2, voidNode: true, meta: "Large cosmic void | top-web void", summary: "A large underdense region kept visible as an absence in the cosmic web." },
    { id: "hercules-corona-borealis", name: "Hercules-Corona Borealis Field", type: "Distant Structure Field", position: [2, 34, 10], radius: 1.32, color: 0xffa4d8, meta: "Distant large-scale structure field | cautious visual node", summary: "A distant structure field included cautiously as a named top-web node rather than a precise catalog claim." },
    ...catalogWebKnots,
  ];
  const knotMap = new Map(knots.map((knot) => [knot.id, knot]));
  const connections = [
    ["laniakea", "shapley-web", "pisces-cetus"],
    ["laniakea", "sloan-wall-web", "perseus-pisces-web", "coma-wall-web"],
    ["laniakea", "south-pole-wall", "horologium-reticulum"],
    ["sloan-wall-web", "eridanus-supervoid", "south-pole-wall"],
    ["perseus-pisces-web", "hercules-corona-borealis", "shapley-web"],
    ["pisces-cetus", "bootes-void-web", "shapley-web"],
    ["coma-wall-web", "shapley-web", "hercules-corona-borealis"],
  ];
  for (const knot of catalogWebKnots) {
    if (knot.connectTo?.length) {
      connections.push([knot.id, ...knot.connectTo]);
    }
  }
  const authoredConnectionCount = connections.length;
  const connectedPairs = new Set();
  const getConnectionKey = (left, right) => [left, right].sort().join("::");
  for (const connection of connections) {
    for (let i = 0; i < connection.length - 1; i += 1) {
      connectedPairs.add(getConnectionKey(connection[i], connection[i + 1]));
    }
  }
  for (const [index, source] of knots.entries()) {
    const nearest = knots
      .filter((candidate) => candidate.id !== source.id)
      .map((candidate) => ({
        knot: candidate,
        distance: new THREE.Vector3(...source.position).distanceTo(new THREE.Vector3(...candidate.position)),
      }))
      .sort((left, right) => left.distance - right.distance)
      .slice(0, source.voidNode ? 1 : index % 3 === 0 ? 2 : 1);
    for (const { knot: target } of nearest) {
      const key = getConnectionKey(source.id, target.id);
      if (connectedPairs.has(key)) {
        continue;
      }
      connectedPairs.add(key);
      connections.push([source.id, target.id]);
    }
  }

  const filamentPositions = [];
  const filamentColors = [];
  const coreFilamentPositions = [];
  const coreFilamentColors = [];
  const webCurves = [];
  const webRandom = seededRandom(990177);
  const magenta = new THREE.Color(0xff5bd6);
  const violet = new THREE.Color(0x6e4dff);
  const amber = new THREE.Color(0xffd175);
  const white = new THREE.Color(0xffffff);

  for (const [pathIndex, connection] of connections.entries()) {
    const points = connection
      .map((id) => knotMap.get(id))
      .filter(Boolean)
      .map((knot) => new THREE.Vector3(...knot.position));
    if (points.length < 2) {
      continue;
    }
    const isAuthoredPath = pathIndex < authoredConnectionCount;
    const curve = createFluidCurveFromPoints(points, webRandom, {
      amplitude: isAuthoredPath ? 5.6 : 3.8,
      verticalScale: 0.38,
      tension: 0.28,
    });
    webCurves.push(curve);
    const samples = curve.getPoints(isAuthoredPath ? 300 : 160);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i];
      const branchWidth = pathIndex < 3 ? 7.2 : isAuthoredPath ? 5.2 : 3.35;
      const threads = pathIndex < 3 ? 18 : isAuthoredPath ? 13 : 8;
      const flowWidth = 0.58 + Math.sin((i / samples.length) * Math.PI) * 1.28;
      for (let c = 0; c < 5; c += 1) {
        const coreJitter = randomOnSphere((0.14 + webRandom() * 0.68) * flowWidth);
        coreJitter.y *= 0.5;
        coreFilamentPositions.push(sample.x + coreJitter.x, sample.y + coreJitter.y, sample.z + coreJitter.z);
        const warmth = Math.sin(i * 0.055 + pathIndex * 1.7 + c) * 0.5 + 0.5;
        reusableColor.copy(magenta).lerp(amber, 0.22 + warmth * 0.36).lerp(white, webRandom() > 0.965 ? 0.22 : 0.025);
        coreFilamentColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
      for (let t = 0; t < threads; t += 1) {
        const jitter = randomOnSphere((0.12 + webRandom() * branchWidth) * flowWidth);
        jitter.y *= 0.58;
        filamentPositions.push(sample.x + jitter.x, sample.y + jitter.y, sample.z + jitter.z);
        const warmth = Math.sin(i * 0.08 + pathIndex) * 0.5 + 0.5;
        reusableColor.copy(violet).lerp(magenta, 0.44 + warmth * 0.32).lerp(amber, pathIndex % 3 === 0 ? 0.22 : 0.1);
        if (webRandom() > 0.978) reusableColor.lerp(white, 0.24);
        filamentColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
  }

  const luminousKnots = knots.filter((knot) => !knot.voidNode);
  for (let branch = 0; branch < 30; branch += 1) {
    const source = luminousKnots[Math.floor(webRandom() * luminousKnots.length)] ?? knots[0];
    const start = new THREE.Vector3(...source.position);
    const nearest = luminousKnots
      .filter((candidate) => candidate.id !== source.id)
      .map((candidate) => ({
        knot: candidate,
        distance: start.distanceTo(new THREE.Vector3(...candidate.position)),
      }))
      .sort((left, right) => left.distance - right.distance);
    const target = nearest[Math.floor(webRandom() * Math.min(5, nearest.length))]?.knot ?? luminousKnots[0];
    const end = new THREE.Vector3(...target.position);
    start.lerp(end, webRandom() * 0.12);
    end.lerp(new THREE.Vector3(...source.position), webRandom() * 0.1);
    const curve = createFluidCurveFromPoints([start, end], webRandom, {
      amplitude: 4.2 + webRandom() * 5.5,
      verticalScale: 0.4,
      tension: 0.3,
    });
    const samples = curve.getPoints(96);
    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i];
      const t = i / Math.max(1, samples.length - 1);
      const braidWidth = 0.55 + Math.sin(t * Math.PI) * (1.05 + webRandom() * 1.1);
      const strandCount = branch % 3 === 0 ? 8 : 5;
      for (let strand = 0; strand < strandCount; strand += 1) {
        const jitter = randomOnSphere(braidWidth * (0.2 + webRandom()));
        jitter.y *= 0.48;
        filamentPositions.push(sample.x + jitter.x, sample.y + jitter.y, sample.z + jitter.z);
        reusableColor.copy(violet)
          .lerp(magenta, 0.55 + webRandom() * 0.3)
          .lerp(amber, branch % 4 === 0 ? 0.28 : 0.08);
        if (webRandom() > 0.97) reusableColor.lerp(white, 0.22);
        filamentColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
      }
    }
  }

  for (let i = 0; i < 6200; i += 1) {
    const curve = webCurves[Math.floor(webRandom() * webCurves.length)];
    const point = curve?.getPoint(webRandom()) ?? randomOnSphere(18 + Math.pow(webRandom(), 0.5) * 58);
    const drift = randomOnSphere(0.8 + Math.pow(webRandom(), 0.62) * 7.2);
    drift.y *= 0.5;
    filamentPositions.push(point.x + drift.x, point.y + drift.y, point.z + drift.z);
    reusableColor.copy(violet).lerp(magenta, webRandom() * 0.58).lerp(amber, webRandom() * 0.1);
    filamentColors.push(reusableColor.r, reusableColor.g, reusableColor.b);
  }

  const webCores = createPointCloud(
    { positions: coreFilamentPositions, colors: coreFilamentColors },
    0.22,
    0.31,
    true
  );
  webCores.material.userData.twinkleAmount = 0.08;
  webCores.material.userData.twinkleSpeed = 0.38;
  webCores.userData.spinVector = new THREE.Vector3(-0.000012, 0.000052, 0.000018);
  authoredWebContent.add(webCores);

  const webMatter = createPointCloud(
    { positions: filamentPositions, colors: filamentColors },
    0.24,
    0.27,
    true
  );
  webMatter.material.userData.twinkleAmount = 0.06;
  webMatter.material.userData.twinkleSpeed = 0.26;
  webMatter.userData.spinVector = new THREE.Vector3(0.000016, 0.000035, -0.000012);
  authoredWebContent.add(webMatter);

  for (const knot of knots) {
    authoredWebContent.add(createStructureNodeObject({ band: "web", priority: knot.id === "laniakea" ? 5.6 : 4.1, ...knot }));
  }
  const innerWebGlow = createGlowSphere(42, 0xff4fd8, 0.0014);
  const outerWebGlow = createGlowSphere(70, 0x6e4dff, 0.0009);
  deepWebOriginGlows.push(innerWebGlow, outerWebGlow);
  authoredWebContent.add(innerWebGlow, outerWebGlow);
  buildDeepWebRegressLayer(group);
  return group;
}

function linkEntityChildren(parentId, childIds, relation = null) {
  for (const childId of childIds) {
    linkEntityParent(childId, parentId, relation);
  }
}

function buildEntityHierarchy() {
  linkEntityParent("sun", "solar-system-portal", "host star");
  linkEntityChildren(
    "sun",
    ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "ceres", "pluto"],
    "planet"
  );
  for (const moon of moonCatalog) {
    linkEntityParent(moon.id, moon.parent, "moon");
  }

  linkEntityParent("solar-system-portal", "solar-neighborhood", "star system");
  for (const model of exoplanetSystemModels.values()) {
    linkEntityParent(model.id, "solar-neighborhood", "star system");
    for (const planet of model.planets) {
      linkEntityParent(planet.id, model.id, "planet");
    }
  }

  const stellarParentExclusions = new Set(["solar-system-portal"]);
  for (const entity of selectableEntities) {
    if (
      entity.band === "stellar" &&
      !entity.parentId &&
      !entity.hostSystemId &&
      !stellarParentExclusions.has(entity.id)
    ) {
      linkEntityParent(entity.id, "solar-neighborhood", "stellar object");
    }
  }

  linkEntityParent("solar-neighborhood", "milky-way-galaxy", "home region");
  linkEntityParent("milky-way-core", "milky-way-galaxy", "nucleus");
  linkEntityParent("sagittarius-a", "milky-way-core", "black hole");
  linkEntityChildren(
    "milky-way-galaxy",
    ["carina-nebula", "omega-centauri", "cygnus-x-1", "crab-pulsar", "vela-pulsar", "cassiopeia-a", "keplers-supernova"],
    "galactic object"
  );
  for (const entity of selectableEntities) {
    if (entity.band === "galaxy" && !entity.parentId) {
      linkEntityParent(entity.id, "milky-way-galaxy", "galactic object");
    }
  }

  linkEntityChildren(
    "local-group-web",
    catalogLocalGroupPrimaryGalaxies.map((galaxy) => galaxy.id),
    "galaxy"
  );
  for (const galaxy of catalogLocalGroupGalaxies) {
    linkEntityParent(galaxy.id, galaxy.parent ?? "local-group-web", "galaxy");
  }
  linkEntityParent("m87", "virgo-cluster", "galaxy");
  linkEntityParent("m87-star", "m87", "black hole");
  linkEntityChildren("virgo-cluster", ["messier-49", "messier-60", "sombrero-galaxy", "little-sombrero", "needle-galaxy"], "galaxy");
  linkEntityChildren("m81-group", ["bodes-galaxy", "cigar-galaxy"], "galaxy");
  linkEntityChildren("sculptor-group", ["silver-dollar-galaxy", "sculptor-galaxy"], "galaxy");
  linkEntityChildren("centaurus-group", ["centaurus-a", "southern-pinwheel", "condor-galaxy"], "galaxy");
  linkEntityChildren("canes-venatici-cloud", ["whirlpool-galaxy", "pinwheel-galaxy", "sunflower-galaxy", "black-eye-galaxy", "fireworks-galaxy", "tullys-galaxy"], "galaxy");
  linkEntityChildren("fornax-cluster", ["ngc-1300", "ngc-1365"], "galaxy");
  linkEntityChildren("active-galaxy-field", ["markarian-231", "ngc-1275", "eye-of-sauron-galaxy", "malin-1", "3c-273-quasar"], "active galaxy");
  linkEntityChildren("peculiar-galaxy-field", ["hoags-object", "tadpole-galaxy", "antennae-galaxies", "mayalls-object", "cartwheel-galaxy", "mice-galaxies", "ngc-6240", "ngc-4650a", "stephans-quintet"], "peculiar galaxy");
  linkEntityParent("ic-1101", "shapley-concentration", "galaxy");
  for (const galaxy of catalogLaniakeaGalaxies) {
    linkEntityParent(galaxy.id, galaxy.parent, "galaxy");
  }
  for (const entity of selectableEntities) {
    if (entity.band === "cluster" && !entity.parentId) {
      linkEntityParent(entity.id, "local-group-web", entity.type?.includes("Galaxy") ? "galaxy" : "local object");
    }
  }
  for (const entity of selectableEntities) {
    if (entity.band === "laniakea" && !entity.parentId) {
      linkEntityParent(entity.id, "laniakea", entity.type?.includes("Galaxy") ? "galaxy" : "laniakea object");
    }
  }

  linkEntityChildren(
    "laniakea",
    [
      "local-group-web",
      "virgo-cluster",
      "m81-group",
      "sculptor-group",
      "canes-venatici-cloud",
      "centaurus-group",
      "fornax-cluster",
      "active-galaxy-field",
      "peculiar-galaxy-field",
      "local-void",
      "hydra-centaurus",
      "norma-cluster",
      "great-attractor",
      "coma-cluster",
      "shapley-concentration",
      "perseus-pisces",
      "vela-supercluster",
      "sloan-great-wall",
      "bootes-void",
    ],
    "local structure"
  );
  linkEntityChildren(
    "shapley-web",
    ["coma-wall-web", "pisces-cetus", "hercules-corona-borealis"],
    "web structure"
  );
}

buildPlanetLayer();
buildSystemLayer();
buildExoplanetSystemLayer();
buildStellarLayer();
buildGalaxyLayer();
buildLocalGroupLayer();
buildLaniakeaLayer();
buildCosmicWebLayer();
buildEntityHierarchy();

const initialSelectParam = initialFocusSelect || queryParams.get("select");
if (initialSelectParam) {
  const initialEntity = selectableEntities.find((entity) => entity.id === initialSelectParam);
  if (initialEntity) {
    selectEntity(initialEntity, !hasInitialScale);
    if (!hasInitialScale) {
      targetZoom = getSelectionZoom(initialEntity);
      zoomLevel = targetZoom;
    }
  } else {
    const detailParentId = getDetailParentIdFromSelectionId(initialSelectParam);
    const parentEntity = detailParentId
      ? selectableEntities.find((entity) => entity.id === detailParentId)
      : null;
    if (parentEntity?.bodyDetail) {
      pendingInitialSelectParam = initialSelectParam;
      selectEntity(parentEntity, !hasInitialScale);
      if (!hasInitialScale) {
        targetZoom = getSelectionZoom(parentEntity);
        zoomLevel = targetZoom;
      }
    }
  }
}
clampTargetZoom();
zoomLevel = THREE.MathUtils.clamp(zoomLevel, getZoomFloor(), MAX_ZOOM);

function getActiveBand() {
  const inspectionIsolation = getSelectedInspectionIsolation();
  if (getContextualSystemName() && zoomLevel > SYSTEM_ZOOM_FLOOR && zoomLevel < getBandByKey("stellar").center - 0.22) {
    return getBandByKey("system");
  }
  if (selectedEntity?.bodyDetail && getPlanetInspectionReveal() > 0.22) {
    return getBandByKey("planet");
  }
  if (selectedEntity && !selectedEntity.portalTargetBand && inspectionIsolation > 0.22) {
    return getBandByKey(selectedEntity.band);
  }
  return scaleBands.reduce((best, band) => {
    const currentDistance = Math.abs(zoomLevel - band.center);
    const bestDistance = Math.abs(zoomLevel - best.center);
    return currentDistance < bestDistance ? band : best;
  }, scaleBands[0]);
}

function getBandByKey(key) {
  return scaleBands.find((band) => band.key === key) ?? scaleBands[0];
}

function getLayerOpacity(center, width) {
  const band = scaleBands.find((item) => item.center === center && item.width === width);
  if (band?.key === "web" && zoomLevel >= band.center) {
    return 1;
  }
  if (band?.opacityProfile) {
    const profile = band.opacityProfile;
    const fadeIn = Number.isFinite(profile.fadeInStart)
      ? smoothstep(profile.fadeInStart, profile.fullStart, zoomLevel)
      : 1;
    const fadeOut = Number.isFinite(profile.fadeOutEnd)
      ? 1 - smoothstep(profile.fullEnd, profile.fadeOutEnd, zoomLevel)
      : 1;
    return Math.pow(THREE.MathUtils.clamp(Math.min(fadeIn, fadeOut), 0, 1), profile.power ?? 1);
  }
  const distance = Math.abs(zoomLevel - center);
  return Math.pow(
    1 - smoothstep(width * 0.2, width * 0.56, distance),
    1.55
  );
}

function getWebLayerRenderScale(layer) {
  const drift = zoomLevel - layer.center;
  if (drift > 1.2) {
    return layer.baseScale * Math.pow(0.62, 1.2) * Math.pow(WEB_LAYER_OUTER_DECAY, drift - 1.2);
  }
  return layer.baseScale * Math.pow(0.62, THREE.MathUtils.clamp(drift, -1.2, 1.2));
}

function getLayerRenderScale(layer) {
  if (layer.key === "web") {
    return getWebLayerRenderScale(layer);
  }
  const drift = THREE.MathUtils.clamp(zoomLevel - layer.center, -1.2, 1.2);
  return layer.baseScale * Math.pow(0.62, drift);
}

function getTravelAnchor(out) {
  const planetBand = getBandByKey("planet");
  const systemBand = getBandByKey("system");
  if (zoomLevel < systemBand.center) {
    getBandAnchor(planetBand, lowerAnchor);
    getBandAnchor(systemBand, upperAnchor);
    const t = smoothstep(
      systemBand.opacityProfile.fadeInStart,
      systemBand.opacityProfile.fullStart,
      zoomLevel
    );
    out.lerpVectors(lowerAnchor, upperAnchor, t);
    return out;
  }

  const { lower, upper, rawT } = getCurrentBandTransition();
  return getTransitionAnchor(lower, upper, rawT, out);
}

function updateLayers(elapsed) {
  const selectedBand = selectedEntity ? getBandByKey(selectedEntity.band) : null;
  const selectedInspectionDepth = getSelectedInspectionDepth();
  const planetInspectionReveal = getPlanetInspectionReveal();
  const selectedInspectionIsolation = getSelectedInspectionIsolation();
  const selectedPortalDepth = getSelectedPortalDepth();
  const systemBand = getBandByKey("system");
  const contextualSystem = getContextualSystemEntity();
  refreshExoplanetSystemLayer(contextualSystem);
  const exoplanetSystemOpacity = contextualSystem
    ? getLayerOpacity(systemBand.center, systemBand.width) * (1 - planetInspectionReveal)
    : 0;
  const portalTargetBand = selectedEntity?.portalTargetBand && !isLaniakeaNestedPortal(selectedEntity)
    ? getBandByKey(selectedEntity.portalTargetBand)
    : null;
  for (const layer of layers) {
    let opacity = getLayerOpacity(layer.center, layer.width);
    if (layer.key === "exosystem") {
      opacity = exoplanetSystemOpacity;
    } else if (selectedBand && selectedInspectionDepth > 0) {
      if (selectedEntity?.bodyDetail && layer.key === "planet") {
        opacity = Math.max(opacity, planetInspectionReveal);
      } else if (portalTargetBand) {
        if (layer.key === selectedEntity.band) {
          opacity *= 1 - selectedPortalDepth;
        } else if (layer.center < selectedBand.center && layer.center > portalTargetBand.center) {
          opacity *= 1 - selectedPortalDepth;
        }
      } else if (layer.key !== selectedEntity.band && layer.center < selectedBand.center) {
        opacity *= 1 - selectedInspectionIsolation;
      } else if (selectedEntity?.band === layer.key) {
        opacity *= 1 - selectedInspectionIsolation;
      }
    }
    if (layer.key === "system" && contextualSystem) {
      opacity = 0;
    }
    const scale = getLayerRenderScale(layer);
    layer.group.scale.setScalar(scale);
    if (layer.key === "planet" && planetDetailPivot) {
      planetDetailPivot.position.copy(inspectionAnchor).divideScalar(scale);
    }
    setLayerOpacity(layer.group, opacity, elapsed);
  }
}

function boostSelectedInspectionOpacity(elapsed) {
  const opacity = getSelectedInspectionOpacity(selectedEntity);
  if (
    !selectedEntity ||
    selectedEntity.bodyDetail ||
    (selectedEntity.portalTargetBand && !isLaniakeaNestedPortal(selectedEntity)) ||
    selectedEntity.family === "comet" ||
    opacity <= 0.01
  ) {
    return;
  }
  const inspectionObject = selectedEntity.inspectionObject ?? selectedEntity.object;
  revealObjectBranch(inspectionObject);
  setObjectOpacity(inspectionObject, opacity, elapsed);
  if (isInspectableStarEntity(selectedEntity)) {
    boostEntityGraphChildrenOpacity(
      selectedEntity,
      opacity,
      elapsed,
      (child) => child.family === "circumstellar-disk"
    );
  } else {
    boostEntityGraphChildrenOpacity(selectedEntity, opacity, elapsed);
  }
}

function boostEntityGraphChildrenOpacity(entity, opacity, elapsed, predicate = null) {
  const children = getEntityChildren(entity, 48);
  if (children.length === 0) {
    return;
  }
  const childOpacity = Math.max(0.34, opacity * 0.92);
  for (const child of children) {
    if (predicate && !predicate(child)) {
      continue;
    }
    revealObjectBranch(child.object);
    setObjectOpacity(child.object, childOpacity, elapsed);
  }
}

function updateSkyFigureStellarOverlays(elapsed) {
  const stellarBand = getBandByKey("stellar");
  const stellarOpacity = getLayerOpacity(stellarBand.center, stellarBand.width);
  for (const [figureId, overlay] of skyFigureStellarOverlays) {
    const visible = selectedEntity?.id === figureId && stellarOpacity > 0.035;
    overlay.visible = visible;
    if (visible) {
      setObjectOpacity(overlay, Math.min(1, stellarOpacity * 1.18), elapsed);
    }
  }
}

function updateLaniakeaGalaxySelectionEnvelopes(elapsed) {
  for (const envelope of laniakeaGalaxySelectionEnvelopes) {
    const entity = getEntityById(envelope.userData.entityId);
    if (!entity) {
      envelope.visible = false;
      continue;
    }
    const parentDepth = getSelectedBranchAncestorDepth(entity);
    const selectedDepth = entity === selectedEntity && isLaniakeaNestedEntity(entity)
      ? getSelectedInspectionDepth(entity)
      : 0;
    const reveal = Math.max(
      smoothstep(0.18, 0.38, parentDepth),
      smoothstep(0.08, 0.28, selectedDepth)
    );
    envelope.visible = reveal > 0.012 && isObjectEffectivelyVisible(entity.object);
    setObjectOpacity(envelope, envelope.visible ? reveal : 0, elapsed);
  }
}

function getLog10MetersForZoom(scaleIndex) {
  return 6 + scaleIndex * LOG10_METERS_PER_SCALE_INDEX;
}

function updateFocusMarkers() {
  if (interfaceHidden) {
    selectionRing.visible = false;
    hoverRing.visible = false;
    hoverHint.classList.remove("is-visible");
    return;
  }
  const updateRing = (ring, entity, outPosition) => {
    if (!entity) {
      ring.visible = false;
      return;
    }
    const band = getBandByKey(entity.band);
    const opacity = getEntityInteractableOpacity(entity);
    const useInspectionFocus = entity === selectedEntity && shouldUseInspectionFocus(entity);
    const usePortalFocus = ring === selectionRing && shouldUseSelectedPortalFocus(entity);
    if (ring === selectionRing && shouldHideGlobalInspectionRing(entity)) {
      ring.visible = false;
      return;
    }
    const visibleOpacity = useInspectionFocus
      ? Math.max(opacity, getLayerOpacity(scaleBands[0].center, scaleBands[0].width))
      : opacity;
    if (visibleOpacity <= 0.04 || (!usePortalFocus && !isObjectEffectivelyVisible(entity.object))) {
      ring.visible = false;
      return;
    }

    if (usePortalFocus) {
      getEntityFocusRootPosition(entity, markerLocalPosition);
      root.localToWorld(outPosition.copy(markerLocalPosition));
    } else if (useInspectionFocus) {
      markerLocalPosition.copy(inspectionAnchor);
      root.localToWorld(outPosition.copy(markerLocalPosition));
    } else {
      entity.object.getWorldPosition(outPosition);
    }
    ring.position.copy(outPosition);
    const visibleRingRadius = entity.selectionRadius ?? entity.hitRadius;
    ring.scale.setScalar(
      useInspectionFocus
        ? 6.42 * getInspectionBodyScale(entity)
        : visibleRingRadius * 1.16 * (entity === selectedEntity ? getObservatoryScaleBoost(entity) : 1)
    );
    const emphasizeNestedSelection = ring === selectionRing && entity === selectedEntity && isLaniakeaNestedEntity(entity);
    ring.material.opacity = emphasizeNestedSelection
      ? 0.24
      : useInspectionFocus
      ? 0.28
      : entity === selectedEntity && isObservatoryTarget(entity)
        ? THREE.MathUtils.lerp(0.14, 0.025, smoothstep(0.18, 0.82, getObservatoryFocusDepth(entity)))
        : ring.material.userData.baseOpacity;
    ring.lookAt(camera.position);
    ring.visible = true;
  };

  if (
    hoveredEntity &&
    (!isObjectEffectivelyVisible(hoveredEntity.object) || getEntityInteractableOpacity(hoveredEntity) <= 0.04)
  ) {
    updateHoverHint(null);
  }

  updateRing(selectionRing, selectedEntity, selectedWorldPosition);
  updateRing(hoverRing, hoveredEntity, hoveredWorldPosition);

  if (hoveredEntity && hoverRing.visible) {
    const screenPosition = hoveredWorldPosition.clone().project(camera);
    hoverHint.style.left = `${(screenPosition.x * 0.5 + 0.5) * window.innerWidth}px`;
    hoverHint.style.top = `${(-screenPosition.y * 0.5 + 0.5) * window.innerHeight}px`;
  }
}

function updateHud() {
  const activeBand = getActiveBand();
  const progress = THREE.MathUtils.clamp(zoomLevel / SCALE_PROGRESS_CAP_ZOOM, 0, 1);
  const contextualSystemName = activeBand.key === "system" ? getContextualSystemName() : null;
  hud.style.setProperty("--scale-progress", progress.toFixed(4));
  hudBand.textContent = contextualSystemName ? "compact exoplanet system" : activeBand.range;
  hudTitle.textContent = contextualSystemName ?? activeBand.title;
  hudRange.textContent = `scale index ${zoomLevel.toFixed(2)}`;
  readout.textContent = `log10 meters ${getLog10MetersForZoom(zoomLevel).toFixed(2)}`;
  scaleReference.textContent = contextualSystemName
    ? `Reference: ${contextualSystemName} is shown as a compact star-system view; choose one of its planets for close inspection.`
    : selectedEntity?.scaleHint ?? scaleReferenceByBand[activeBand.key] ?? "";

  for (const chip of hudChips.children) {
    chip.classList.toggle("is-active", chip.dataset.band === activeBand.key);
  }
}

function getShuttleTravelProfile(deltaSec) {
  if (!shuttleTravelActive) {
    shuttleTravelStrength = THREE.MathUtils.lerp(shuttleTravelStrength, 0, 0.045);
    return {
      active: false,
      progress: 1,
      thrust: 0,
      speedLerp: 1,
      pullback: 0,
      fov: 0,
      bloom: 0,
    };
  }

  shuttleTravelElapsed += deltaSec;
  const progress = THREE.MathUtils.clamp(shuttleTravelElapsed / shuttleTravelDuration, 0, 1);
  const ignition = smoothstep(0, 0.22, progress);
  const braking = 1 - smoothstep(0.72, 1, progress);
  const cruise = Math.pow(Math.sin(progress * Math.PI), 0.72);
  const thrust = THREE.MathUtils.clamp(ignition * braking * cruise, 0, 1);
  const strength = shuttleTravelStrength;

  if (progress >= 1) {
    shuttleTravelActive = false;
  }

  return {
    active: true,
    progress,
    thrust,
    speedLerp: THREE.MathUtils.lerp(0.16, 1, thrust),
    pullback: strength * (1.1 + thrust * 5.2 + smoothstep(0, 0.18, progress) * braking * 1.4),
    fov: strength * (0.8 + thrust * 3.6),
    bloom: strength * (0.02 + thrust * 0.12),
  };
}

function animate() {
  requestAnimationFrame(animate);
  const nowMs = performance.now();
  const elapsed = nowMs * 0.001;
  const deltaSec = Math.min(0.05, Math.max(0.001, (nowMs - lastRenderTimeMs) * 0.001));
  lastRenderTimeMs = nowMs;
  const shuttleTravel = getShuttleTravelProfile(deltaSec);

  travelPulse = THREE.MathUtils.lerp(travelPulse, 0, 0.035);
  updateGestureControls(nowMs, deltaSec);
  clampTargetZoom();
  const zoomLerp = shuttleTravel.active
    ? THREE.MathUtils.lerp(0.012, 0.052, shuttleTravel.thrust)
    : 0.045 + travelPulse * 0.012;
  zoomLevel = THREE.MathUtils.lerp(zoomLevel, targetZoom, zoomLerp);
  yaw = THREE.MathUtils.lerp(yaw, targetYaw, 0.055);
  pitch = THREE.MathUtils.lerp(pitch, targetPitch, 0.055);
  gestureLiftOffset = THREE.MathUtils.lerp(gestureLiftOffset, gestureLiftTarget, 0.08);

  updateOrbitalPositions();
  updatePlanetInspectionDetail();
  resolvePendingInitialSelection();
  getTravelAnchor(travelAnchor);
  travelFocusAnchor.copy(travelAnchor);
  let focusOpacity = 0;
  let selectedPivotActive = false;
  if (selectedEntity) {
    const bandOpacity = getEntityVisibilityOpacity(selectedEntity);
    const planetOpacity = selectedEntity.bodyDetail
      ? getLayerOpacity(scaleBands[0].center, scaleBands[0].width)
      : 0;
    focusOpacity = Math.max(bandOpacity, planetOpacity);
    if (focusOpacity > 0.08) {
      getEntityFocusRootPosition(selectedEntity, focusLocalPosition);
      const focusMix = smoothstep(0.08, 0.45, focusOpacity);
      if (focusMix > 0.01) {
        travelFocusAnchor.lerp(focusLocalPosition, focusMix);
        selectedPivotActive = true;
      }
    }
  }
  if (!victoryManipulating) {
    ambientYawOffset += deltaSec * 0.015;
  }
  root.rotation.y = yaw + ambientYawOffset;
  root.rotation.x = pitch;
  if (selectedPivotActive) {
    rotatedFocusOffset.copy(travelFocusAnchor).applyEuler(root.rotation);
    travelTarget.set(
      -rotatedFocusOffset.x,
      -rotatedFocusOffset.y,
      -rotatedFocusOffset.z
    );
  } else {
    travelTarget.set(
      -travelFocusAnchor.x,
      -travelFocusAnchor.y * 0.9,
      -travelFocusAnchor.z * 0.28
    );
  }
  travelTarget.y += gestureLiftOffset;
  const rootLerpBase = selectedPivotActive ? (isDragging ? 0.24 : 0.055) : 0.042;
  const rootLerp = shuttleTravel.active
    ? THREE.MathUtils.lerp(0.012, rootLerpBase * 1.38, shuttleTravel.speedLerp)
    : rootLerpBase;
  root.position.lerp(travelTarget, rootLerp);
  const effectiveFocusOpacity = focusOpacity;
  const focusPull = selectedEntity
    ? THREE.MathUtils.clamp(7.4 - selectedEntity.hitRadius * 0.32, 2.4, 6.8) * effectiveFocusOpacity
    : 0;
  const observatoryDepth = getObservatoryFocusDepth(selectedEntity);
  const observatoryPull = getObservatoryCameraPull(selectedEntity);
  const travelPullback =
    travelPulse * (selectedPivotActive ? 1.1 : 2.2) +
    shuttleTravel.pullback * (selectedPivotActive ? 0.92 : 1.25);
  cameraZ = THREE.MathUtils.lerp(cameraZ, 35 + zoomLevel * 3.5 - focusPull - observatoryPull + travelPullback, 0.052);
  camera.position.z = cameraZ;
  const baseFov = THREE.MathUtils.lerp(
    58,
    46,
    THREE.MathUtils.clamp(zoomLevel / HISTORIC_WEB_MAX_ZOOM, 0, 1)
  );
  camera.fov = THREE.MathUtils.clamp(
    baseFov - effectiveFocusOpacity * 3.5 - observatoryDepth * 7.2 + travelPulse * 1.8 + shuttleTravel.fov,
    32,
    64
  );
  camera.updateProjectionMatrix();

  const closeInspectionActive = isCloseInspectionActive();
  refreshAnimatedObjects();
  for (const object of animatedObjects) {
    if (Number.isFinite(object.userData.spin)) {
      if (!shouldPauseInspectionMotion(object, closeInspectionActive)) {
        object.rotation.y += object.userData.spin;
      }
    }
    if (object.userData.spinVector) {
      if (!shouldPauseInspectionMotion(object, closeInspectionActive)) {
        object.rotation.x += object.userData.spinVector.x;
        object.rotation.y += object.userData.spinVector.y;
        object.rotation.z += object.userData.spinVector.z;
      }
    }
    if (object.userData.breath) {
      const breath = object.userData.breath;
      const pulse = 1 + Math.sin(elapsed * breath.speed + breath.phase) * breath.amount;
      object.scale.setScalar(pulse);
    }
  }

  updateLayers(elapsed);
  updateSkyFigureAddressMarkers();
  updateSkyFigureStellarOverlays(elapsed);
  updateDeepWebRegress(elapsed);
  updateLaniakeaFlowClouds(elapsed);
  updateContinuousEmitters(elapsed);
  updateCometDrifters(elapsed);
  updateJupiterAtmosphere(elapsed, deltaSec);
  updateEarthCloudBands(elapsed);
  suppressSelectedMoonSourceObject(elapsed);
  updateObservatoryFocusScale();
  boostSelectedInspectionOpacity(elapsed);
  updateStellarSunspots(elapsed);
  updateLaniakeaGalaxySelectionEnvelopes(elapsed);
  updateHud();
  updateFocusMarkers();
  const bloomZoom = Math.min(zoomLevel, HISTORIC_WEB_MAX_ZOOM + 7);
  const webBloomDamping = smoothstep(getBandByKey("web").center - 0.58, HISTORIC_WEB_MAX_ZOOM + 7, zoomLevel) * 0.22;
  bloomPass.strength = Math.max(0.38, 0.42 + bloomZoom * 0.035 + travelPulse * 0.04 + shuttleTravel.bloom - webBloomDamping);
  composer.render();
}

function clampTargetZoom() {
  targetZoom = THREE.MathUtils.clamp(targetZoom, getZoomFloor(), MAX_ZOOM);
}

function applyWheelZoom(deltaY) {
  const requestedZoom = targetZoom + deltaY * 0.0018;
  if (selectedEntity?.type === "Exoplanet System") {
    const systemFloor = selectedEntity.innerZoomFloor ?? STELLAR_INSPECTION_FLOOR;
    if (requestedZoom < systemFloor + 0.01) {
      const preferredPlanet = getPreferredPlanetInSystem(selectedEntity.id);
      if (preferredPlanet) {
        selectEntity(preferredPlanet, false);
        updateHoverHint(null);
        targetZoom = requestedZoom;
        clampTargetZoom();
        triggerTravelPulse(0.85);
        return;
      }
    }
  }
  targetZoom = requestedZoom;
  clampTargetZoom();
}

function updateFullscreenToggle() {
  const fullscreenActive = Boolean(document.fullscreenElement);
  fullscreenToggle.classList.toggle("is-active", fullscreenActive);
  fullscreenToggle.textContent = fullscreenActive ? "EXIT" : "FULL";
  fullscreenToggle.title = fullscreenActive ? "Exit fullscreen" : "Enter fullscreen";
  fullscreenToggle.disabled = !document.fullscreenEnabled && !fullscreenActive;
}

function setSkyFiguresVisible(visible) {
  skyFiguresVisible = visible;
  updateSkyFigureAddressMarkers();
  skyToggle.classList.toggle("is-active", skyFiguresVisible);
  skyToggle.title = skyFiguresVisible ? "Hide sky figure address markers" : "Show sky figure address markers";
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await (app.requestFullscreen?.() ?? document.documentElement.requestFullscreen());
    }
  } catch (error) {
    console.error("Fullscreen toggle failed:", error);
  } finally {
    updateFullscreenToggle();
  }
}

function setInterfaceHidden(hidden) {
  interfaceHidden = hidden;
  app.classList.toggle("is-interface-hidden", interfaceHidden);
  chromeToggle.classList.toggle("is-active", interfaceHidden);
  chromeToggle.textContent = interfaceHidden ? "HUD" : "CLEAR";
  chromeToggle.title = interfaceHidden ? "Show panels and guides" : "Hide panels and guides";
  updateSceneGuideVisibility();
  if (interfaceHidden) {
    hideSearchResults();
    updateHoverHint(null);
    updateVictoryLayerGuide(false);
    updateVictoryAnchorMarker(false);
    updateHandReticle(false);
    selectionRing.visible = false;
    hoverRing.visible = false;
  }
}

handToggle.addEventListener("click", () => {
  if (handControlsEnabled) {
    stopHandControls();
  } else {
    startHandControls();
  }
});

fullscreenToggle.addEventListener("click", () => {
  toggleFullscreen();
});

chromeToggle.addEventListener("click", () => {
  setInterfaceHidden(!interfaceHidden);
});

skyToggle.addEventListener("click", () => {
  setSkyFiguresVisible(!skyFiguresVisible);
});

document.addEventListener("fullscreenchange", updateFullscreenToggle);
updateFullscreenToggle();
setSkyFiguresVisible(skyFiguresVisible);

handPanel.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

handPanel.addEventListener("click", (event) => {
  event.stopPropagation();
});

window.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    applyWheelZoom(event.deltaY);
  },
  { passive: false }
);

function isUiEventTarget(target) {
  return Boolean(
    target?.closest?.(".scale-hud, .address-rail, .object-search, .object-panel, .scale-reference, .hand-panel")
  );
}

hudChips.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".scale-hud__chip")) {
    event.preventDefault();
    event.stopPropagation();
  }
});

hudChips.addEventListener("click", (event) => {
  const chip = event.target.closest(".scale-hud__chip");
  if (!chip?.dataset.band) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  navigateToBand(chip.dataset.band);
});

hudChips.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }
  const chip = event.target.closest(".scale-hud__chip");
  if (!chip?.dataset.band) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  navigateToBand(chip.dataset.band);
});

window.addEventListener("pointerdown", (event) => {
  if (isUiEventTarget(event.target)) {
    return;
  }
  isDragging = true;
  hasDragged = false;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  renderer.domElement.setPointerCapture(event.pointerId);
});

window.addEventListener("pointermove", (event) => {
  if (isUiEventTarget(event.target)) {
    return;
  }
  if (!isDragging) return;
  const dx = event.clientX - lastPointerX;
  const dy = event.clientY - lastPointerY;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  if (Math.abs(dx) + Math.abs(dy) > 2) {
    hasDragged = true;
  }
  targetYaw += dx * 0.005;
  targetPitch = THREE.MathUtils.clamp(targetPitch + dy * 0.004, -0.9, 0.9);
});

window.addEventListener("pointerup", (event) => {
  if (isUiEventTarget(event.target)) {
    return;
  }
  if (!isDragging) {
    return;
  }
  if (!hasDragged) {
    pickEntity(event.clientX, event.clientY, true);
  }
  isDragging = false;
  if (renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }
});

window.addEventListener("pointermove", (event) => {
  if (isUiEventTarget(event.target)) {
    updateHoverHint(null);
    return;
  }
  if (!isDragging) {
    pickEntity(event.clientX, event.clientY, false);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.target?.closest?.("input, textarea, select, .object-search")) {
    return;
  }
  if (event.key === "+" || event.key === "=" || event.key === "ArrowUp") {
    targetZoom += 0.22;
    clampTargetZoom();
  } else if (event.key === "-" || event.key === "_" || event.key === "ArrowDown") {
    targetZoom -= 0.22;
    clampTargetZoom();
  } else if (event.key >= "1" && event.key <= "6") {
    const index = Number.parseInt(event.key, 10) - 1;
    navigateToBand(scaleBands[index].key);
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
});

window.cosmicScale = {
  setZoom(value) {
    targetZoom = Number.isFinite(value) ? value : targetZoom;
    clampTargetZoom();
  },
  select(id) {
    const entity = selectableEntities.find((item) => item.id === id) ?? null;
    selectEntity(entity);
  },
  startHands() {
    startHandControls();
  },
  entities() {
    return selectableEntities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      band: entity.band,
    }));
  },
  state() {
    return {
      zoomLevel,
      targetZoom,
      band: getActiveBand().key,
      selected: selectedEntity?.id ?? null,
    };
  },
};

animate();
