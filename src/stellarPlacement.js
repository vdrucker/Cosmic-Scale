const DISTANCE_PC_TO_LY = 3.26156;
const STELLAR_DISTANCE_SCALE = 38;

export const STELLAR_NEIGHBORHOOD_RADIUS = 132;

export const STELLAR_COORDINATES = {
  sirius: { raDeg: 101.28715533333335, decDeg: -16.71611586111111, distancePc: 2.6371, source: "SIMBAD" },
  betelgeuse: { raDeg: 88.79293899077537, decDeg: 7.407063995272694, distancePc: 152.6718, source: "SIMBAD", visualOffset: [-8, 18, 10] },
  vega: { raDeg: 279.234734787025, decDeg: 38.783688956244, distancePc: 7.6787, source: "SIMBAD" },
  pleiades: { raDeg: 56.65833333333333, decDeg: 24.178055555555556, distancePc: 135.7958, source: "SIMBAD" },
  "alpha-centauri-a": { raDeg: 219.90205833170774, decDeg: -60.83399268831004, distancePc: 1.3475, source: "SIMBAD", visualOffset: [-2.4, 0.8, 1.6] },
  "alpha-centauri-b": { raDeg: 219.89609628987276, decDeg: -60.83752756558407, distancePc: 1.3475, source: "SIMBAD", visualOffset: [0.6, -0.3, -0.9] },
  "barnards-star": { raDeg: 269.4520769586187, decDeg: 4.693364966576667, distancePc: 1.8282, source: "SIMBAD" },
  "wolf-359": { raDeg: 164.1205036259475, decDeg: 7.014723134801666, distancePc: 2.4086, source: "SIMBAD" },
  "lalande-21185": { raDeg: 165.8341450816425, decDeg: 35.96988227279361, distancePc: 2.5459, source: "SIMBAD" },
  "luhman-16": { raDeg: 162.32881400000002, decDeg: -53.319466000000006, distancePc: 1.9938, source: "SIMBAD" },
  "wise-0855": { raDeg: 133.81890825, decDeg: -7.247048000000001, distancePc: 2.2779, source: "SIMBAD" },
  "tau-ceti": { raDeg: 26.01701307163417, decDeg: -15.93747989102139, distancePc: 3.6522, source: "SIMBAD" },
  arcturus: { raDeg: 213.915300294925, decDeg: 19.1824091615312, distancePc: 11.2575, source: "SIMBAD" },
  rigel: { raDeg: 78.63446706693006, decDeg: -8.201638364722209, distancePc: 264.5503, source: "SIMBAD", visualOffset: [6, -10, -12] },
  polaris: { raDeg: 37.954560670189856, decDeg: 89.26410896994187, distancePc: 132.626, source: "SIMBAD" },
  altair: { raDeg: 297.69582729638694, decDeg: 8.868321196436963, distancePc: 5.1295, source: "SIMBAD" },
  fomalhaut: { raDeg: 344.4126927211701, decDeg: -29.622237033389442, distancePc: 7.7036, source: "SIMBAD" },
  deneb: { raDeg: 310.35797975307673, decDeg: 45.280338806527574, distancePc: 432.9004, source: "SIMBAD" },
  "61-cygni": { raDeg: 316.7247482895925, decDeg: 38.74941731943694, distancePc: 3.4966, source: "SIMBAD" },
  "kapteyns-star": { raDeg: 77.91912433145708, decDeg: -45.01843381524333, distancePc: 3.934, source: "SIMBAD" },
  "van-maanens-star": { raDeg: 12.291243072220414, decDeg: 5.388609396929721, distancePc: 4.3144, source: "SIMBAD" },
  "groombridge-34": { raDeg: 4.5953540832, decDeg: 44.02295498655222, distancePc: 3.5624, source: "SIMBAD" },
  procyon: { raDeg: 114.82549790798149, decDeg: 5.224987557059477, distancePc: 3.5142, source: "SIMBAD" },
  capella: { raDeg: 79.17232794433404, decDeg: 45.99799146983673, distancePc: 13.1234, source: "SIMBAD" },
  aldebaran: { raDeg: 68.9801627900154, decDeg: 16.5093023507718, distancePc: 20.4332, source: "SIMBAD" },
  antares: { raDeg: 247.3519154198264, decDeg: -26.432002611950832, distancePc: 169.7793, source: "SIMBAD" },
  spica: { raDeg: 201.2982473615632, decDeg: -11.161319485111932, distancePc: 76.5697, source: "SIMBAD" },
  regulus: { raDeg: 152.09296243828146, decDeg: 11.967208776100023, distancePc: 24.3132, source: "SIMBAD" },
  castor: { raDeg: 113.64947163976585, decDeg: 31.88828221646326, distancePc: 15.5963, source: "SIMBAD" },
  pollux: { raDeg: 116.32895777437875, decDeg: 28.02619889009357, distancePc: 10.3522, source: "SIMBAD" },
  canopus: { raDeg: 95.98795782918306, decDeg: -52.69566138386201, distancePc: 94.7867, source: "SIMBAD" },
  achernar: { raDeg: 24.428522833333336, decDeg: -57.236752805555554, distancePc: 42.7533, source: "SIMBAD" },
  bellatrix: { raDeg: 81.28276355652378, decDeg: 6.3497032644440665, distancePc: 77.3994, source: "SIMBAD", visualOffset: [-14, 12, -12] },
  mintaka: { raDeg: 83.00166705557675, decDeg: -0.29909510708333326, distancePc: 212.3142, source: "SIMBAD", visualOffset: [-8, 7, -18] },
  alnilam: { raDeg: 84.05338894077023, decDeg: -1.2019191358333312, distancePc: 606.0606, source: "SIMBAD", visualOffset: [4, 0, 18] },
  alnitak: { raDeg: 85.18969442793068, decDeg: -1.9425735859722049, distancePc: 225.7336, source: "SIMBAD", visualOffset: [-12, -8, 10] },
  mirfak: { raDeg: 51.08070871833333, decDeg: 49.86117929305556, distancePc: 155.2795, source: "SIMBAD" },
  hadar: { raDeg: 210.95585562281522, decDeg: -60.373035161541594, distancePc: 120.1923, source: "SIMBAD" },
  acrux: { raDeg: 186.64956340120452, decDeg: -63.099092857925115, distancePc: 98.7167, source: "SIMBAD" },
  gacrux: { raDeg: 187.79149837560794, decDeg: -57.11321345705891, distancePc: 27.1518, source: "SIMBAD" },
  "epsilon-indi": { raDeg: 330.8402234423433, decDeg: -56.785978554364995, distancePc: 3.6384, source: "SIMBAD" },
  "lacaille-9352": { raDeg: 346.4668157737879, decDeg: -35.85307088473306, distancePc: 3.288, source: "SIMBAD" },
  algol: { raDeg: 47.04221855625, decDeg: 40.95564667027778, distancePc: 27.5704, source: "SIMBAD" },
  denebola: { raDeg: 177.26490975591017, decDeg: 14.572058064829658, distancePc: 10.9999, source: "SIMBAD" },
  elnath: { raDeg: 81.57297133176498, decDeg: 28.607451724998228, distancePc: 41.0509, source: "SIMBAD" },
  dubhe: { raDeg: 165.9319646738126, decDeg: 61.751034687818226, distancePc: 37.679, source: "SIMBAD", visualOffset: [4, 8, -10] },
  merak: { raDeg: 165.46033229797294, decDeg: 56.382433649496384, distancePc: 25.9047, source: "SIMBAD", visualOffset: [16, -6, 3] },
  alioth: { raDeg: 193.5072899675, decDeg: 55.95982295694445, distancePc: 25.3101, source: "SIMBAD", visualOffset: [-10, 4, 0] },
  mizar: { raDeg: 200.98141866666666, decDeg: 54.92535197222222, distancePc: 26.309, source: "SIMBAD", visualOffset: [-20, 0, 10] },
  alkaid: { raDeg: 206.88515734206297, decDeg: 49.31326672942533, distancePc: 31.8674, source: "SIMBAD", visualOffset: [-34, -4, 18] },
  eltanin: { raDeg: 269.1515411786243, decDeg: 51.48889561763423, distancePc: 47.3037, source: "SIMBAD" },
  rasalhague: { raDeg: 263.73362272030505, decDeg: 12.560037391671425, distancePc: 14.8965, source: "SIMBAD" },
  "trappist-1-system": { raDeg: 346.6263919, decDeg: -5.0434618, distancePc: 12.42988881, source: "NASA Exoplanet Archive" },
  "proxima-centauri-system": { raDeg: 217.3934657, decDeg: -62.6761821, distancePc: 1.30119, source: "NASA Exoplanet Archive", visualOffset: [5, -4, -4.8] },
  "kepler-186-system": { raDeg: 298.652736, decDeg: 43.9549884, distancePc: 177.594, source: "NASA Exoplanet Archive" },
  "fifty-one-pegasi-system": { raDeg: 344.3675399, decDeg: 20.7690958, distancePc: 15.4614, source: "NASA Exoplanet Archive" },
  "kepler-22-system": { raDeg: 289.2172051, decDeg: 47.8841427, distancePc: 194.642, source: "NASA Exoplanet Archive" },
  "kepler-452-system": { raDeg: 296.003752, decDeg: 44.2775861, distancePc: 551.727, source: "NASA Exoplanet Archive" },
  "toi-700-system": { raDeg: 97.0957165, decDeg: -65.5786149, distancePc: 31.1265, source: "NASA Exoplanet Archive" },
  "lhs-1140-system": { raDeg: 11.248632, decDeg: -15.2741085, distancePc: 14.9861, source: "NASA Exoplanet Archive" },
  "k2-18-system": { raDeg: 172.560141, decDeg: 7.5878315, distancePc: 38.0266, source: "NASA Exoplanet Archive" },
  "hr-8799-system": { raDeg: 346.8701486, decDeg: 21.1340376, distancePc: 41.2441, source: "NASA Exoplanet Archive" },
  "beta-pictoris-system": { raDeg: 86.8212337, decDeg: -51.066148, distancePc: 19.7442, source: "NASA Exoplanet Archive" },
  "fifty-five-cancri-system": { raDeg: 133.1468373, decDeg: 28.3298154, distancePc: 12.5855, source: "NASA Exoplanet Archive" },
  "hd-189733-system": { raDeg: 300.1821223, decDeg: 22.7097759, distancePc: 19.7638, source: "NASA Exoplanet Archive" },
  "wasp-12-system": { raDeg: 97.636645, decDeg: 29.6722662, distancePc: 427.246, source: "NASA Exoplanet Archive" },
  "gliese-581-system": { raDeg: 229.8564725, decDeg: -7.7226935, distancePc: 6.2981, source: "NASA Exoplanet Archive" },
  "ross-128-system": { raDeg: 176.9376036, decDeg: 0.7992898, distancePc: 3.37454, source: "NASA Exoplanet Archive" },
  "eps-eridani-system": { raDeg: 53.2284306, decDeg: -9.4581715, distancePc: 3.2026, source: "NASA Exoplanet Archive" },
  "teegardens-star-system": { raDeg: 43.2691449, decDeg: 16.8649024, distancePc: 3.83078, source: "NASA Exoplanet Archive" },
  "gj-1002-system": { raDeg: 1.6764641, decDeg: -7.5462123, distancePc: 4.84867, source: "NASA Exoplanet Archive" },
  "gj-1061-system": { raDeg: 54.0032486, decDeg: -44.5143104, distancePc: 3.67278, source: "NASA Exoplanet Archive" },
  "yz-ceti-system": { raDeg: 18.1330792, decDeg: -16.9962434, distancePc: 3.71207, source: "NASA Exoplanet Archive", visualOffset: [8, -3, -6] },
  "l-98-59-system": { raDeg: 124.5328604, decDeg: -68.3144658, distancePc: 10.6194, source: "NASA Exoplanet Archive" },
  "hd-40307-system": { raDeg: 88.5172191, decDeg: -60.0237289, distancePc: 12.9363, source: "NASA Exoplanet Archive" },
  "hd-219134-system": { raDeg: 348.3372026, decDeg: 57.1696255, distancePc: 6.53127, source: "NASA Exoplanet Archive" },
  "hd-20794-system": { raDeg: 49.9997666, decDeg: -43.0666533, distancePc: 6.00278, source: "NASA Exoplanet Archive" },
  "hd-69830-system": { raDeg: 124.6010091, decDeg: -12.6364246, distancePc: 12.5591, source: "NASA Exoplanet Archive" },
  "hd-10180-system": { raDeg: 24.4731133, decDeg: -60.5114881, distancePc: 38.9607, source: "NASA Exoplanet Archive", visualOffset: [6, -4, 8] },
  "gj-876-system": { raDeg: 343.3239737, decDeg: -14.2665958, distancePc: 4.67517, source: "NASA Exoplanet Archive" },
  "gj-667-c-system": { raDeg: 259.7510609, decDeg: -34.9977651, distancePc: 7.24396, source: "NASA Exoplanet Archive" },
  "gj-1214-system": { raDeg: 258.8313991, decDeg: 4.9606795, distancePc: 14.6427, source: "NASA Exoplanet Archive" },
  "gj-436-system": { raDeg: 175.5505363, decDeg: 26.7030669, distancePc: 9.75321, source: "NASA Exoplanet Archive" },
  "gj-3470-system": { raDeg: 119.7735021, decDeg: 15.391209, distancePc: 29.4214, source: "NASA Exoplanet Archive" },
  "wasp-39-system": { raDeg: 217.3266477, decDeg: -3.4444994, distancePc: 213.982, source: "NASA Exoplanet Archive" },
  "wasp-43-system": { raDeg: 154.9081869, decDeg: -9.8064431, distancePc: 86.7467, source: "NASA Exoplanet Archive" },
  "hat-p-11-system": { raDeg: 297.7101763, decDeg: 48.0818635, distancePc: 37.7647, source: "NASA Exoplanet Archive" },
  "seventy-virginis-system": { raDeg: 202.1064898, decDeg: 13.7763085, distancePc: 17.9011, source: "NASA Exoplanet Archive" },
  "upsilon-andromedae-system": { raDeg: 24.1983534, decDeg: 41.4038147, distancePc: 13.4054, source: "NASA Exoplanet Archive" },
  "au-mic-system": { raDeg: 311.2911369, decDeg: -31.34245, distancePc: 9.7221, source: "NASA Exoplanet Archive" },
  "hd-110067-system": { raDeg: 189.8392243, decDeg: 20.0273377, distancePc: 32.1585, source: "NASA Exoplanet Archive" },
  "kepler-10-system": { raDeg: 285.679298, decDeg: 50.2414842, distancePc: 185.506, source: "NASA Exoplanet Archive", visualOffset: [-4, 6, 16] },
  "kepler-11-system": { raDeg: 297.1150949, decDeg: 41.9091092, distancePc: 646.346, source: "NASA Exoplanet Archive", visualOffset: [0, -16, -20] },
  "kepler-20-system": { raDeg: 287.6979913, decDeg: 42.3385782, distancePc: 282.563, source: "NASA Exoplanet Archive", visualOffset: [16, -14, 5] },
  "kepler-444-system": { raDeg: 289.7528323, decDeg: 41.631884, distancePc: 36.4396, source: "NASA Exoplanet Archive", visualOffset: [22, -8, 20] },
  "kepler-62-system": { raDeg: 283.2125621, decDeg: 45.3496992, distancePc: 300.874, source: "NASA Exoplanet Archive", visualOffset: [-12, 10, -14] },
  "gj-357-system": { raDeg: 144.0074644, decDeg: -21.6650634, distancePc: 9.44181, source: "NASA Exoplanet Archive" },
  "hd-3167-system": { raDeg: 8.7401487, decDeg: 4.3807215, distancePc: 47.2899, source: "NASA Exoplanet Archive" },
  "toi-178-system": { raDeg: 7.3020115, decDeg: -30.4541159, distancePc: 62.699, source: "NASA Exoplanet Archive" },
};

export function getStellarScenePosition(id, fallbackPosition = [0, 0, 0]) {
  const coordinate = STELLAR_COORDINATES[id];
  if (!coordinate) {
    return fallbackPosition;
  }

  const distanceLy = Math.max(0, coordinate.distancePc * DISTANCE_PC_TO_LY);
  const radius = Math.min(
    STELLAR_NEIGHBORHOOD_RADIUS,
    Math.log10(distanceLy + 1) * STELLAR_DISTANCE_SCALE
  );
  const ra = (coordinate.raDeg * Math.PI) / 180;
  const dec = (coordinate.decDeg * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  const position = [
    Math.sin(ra) * cosDec * radius,
    Math.sin(dec) * radius,
    -Math.cos(ra) * cosDec * radius,
  ];
  if (coordinate.visualOffset) {
    position[0] += coordinate.visualOffset[0];
    position[1] += coordinate.visualOffset[1];
    position[2] += coordinate.visualOffset[2];
  }
  return position;
}
