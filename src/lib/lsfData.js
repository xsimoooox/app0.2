/**
 * URLs Cloudinary brutes Frizitta (37 signes : neutre, A-Z, 0-9).
 */
const RAW_PHOTOS = {
  NEUTRE: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885252/neutre_zmt3j7.jpg',
  A: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885237/A_mrojdn.jpg',
  B: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885238/B_x22ywt.jpg',
  C: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885240/C_pyhinj.jpg',
  D: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885241/D_azj5qb.jpg',
  E: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885242/E_j8tzi8.jpg',
  F: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885243/F_ng9anz.jpg',
  G: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885251/G_azsjx8.png',
  H: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885247/H_r5zyke.jpg',
  I: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885246/i_vvkaji.jpg',
  J: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885247/J_zfq7hd.jpg',
  K: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885248/K_qbwn1a.jpg',
  L: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885248/L_qstqo2.jpg',
  M: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885250/M_gcgelx.jpg',
  N: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885251/N_cctwqg.jpg',
  O: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885253/O_gekb1i.jpg',
  P: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885255/P_czfuei.jpg',
  Q: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885256/Q_hhkqww.jpg',
  R: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885256/R_b6wmgm.jpg',
  S: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885257/S_rfdvqy.jpg',
  T: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885259/T_ofgyue.jpg',
  U: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885259/U_yit2ti.jpg',
  V: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885262/V_kjzacj.jpg',
  W: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885262/W_havjyo.jpg',
  X: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885261/X_du9yeo.jpg',
  Y: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885265/Y_cwysod.jpg',
  Z: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885264/Z_ksgoyj.jpg',
  0: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885239/0_l1n2ao.jpg',
  1: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885234/1_k0hye4.jpg',
  2: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885234/2_suoofn.jpg',
  3: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885234/3_n33etl.jpg',
  4: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885234/4_r8xe7t.jpg',
  5: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885235/5_rlojha.jpg',
  6: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885236/6_kivbyw.jpg',
  7: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885236/7_sh7yky.jpg',
  8: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885236/8_uc5pie.jpg',
  9: 'https://res.cloudinary.com/dxqxig16m/image/upload/v1778885237/9_lcgddl.jpg',
};

/** Cadre affichage = réf. Frizitta (portrait 3:4, fond #C8C6E8) en HD */
export const FRIZITTA_FRAME_W = 640;
export const FRIZITTA_FRAME_H = 840;
export const FRIZITTA_NORMALIZE_W = 960;

/**
 * Zoom final (réf. WhatsApp). Ajuster : 1.22 = plus large, 1.34 = plus serré.
 */
export const FRIZITTA_ZOOM = 1.28;

/** Sources plus larges ou carrées (ratio w/h ≥ ~0,65) — C,D,N,O ~0,76 ; B ~1,0 */
const WIDE_SOURCE_LETTERS = new Set(['B', 'C', 'D', 'F', 'N', 'O']);

/** Rattrapage zoom après normalisation du ratio (lettres « dézoomées ») */
const FRIZITTA_ZOOM_WIDE = 1.34;
const FRIZITTA_ZOOM_SQUARE = 1.42;

function getFrizittaZoom(letterKey) {
  if (letterKey === 'B') return FRIZITTA_ZOOM_SQUARE;
  if (WIDE_SOURCE_LETTERS.has(letterKey)) return FRIZITTA_ZOOM_WIDE;
  return FRIZITTA_ZOOM;
}

/**
 * 1) ar_9:16 — aligne toutes les sources sur le même ratio que A / NEUTRE (~0,56)
 * 2) ar_3:4 — cadre HD identique à la réf. + zoom fixe (g_north, z_ par groupe)
 */
export function toPortrait(url, letterKey) {
  if (!url || !url.includes('/upload/')) return url;
  const z = getFrizittaZoom(letterKey);
  return url.replace(
    '/upload/',
    `/upload/ar_9:16,c_fill,g_north,w_${FRIZITTA_NORMALIZE_W}/c_fill,w_${FRIZITTA_FRAME_W},h_${FRIZITTA_FRAME_H},ar_3:4,g_north,z_${z},b_rgb:C8C6E8,f_jpg,q_auto:best/`
  );
}

/** @deprecated Utiliser toPortrait */
export const getFrizittaPortraitUrl = (url) => toPortrait(url);

/** Base Frizitta — URLs normalisées (clés NEUTRE, A-Z, 0-9). */
export const PHOTOS = Object.fromEntries(
  Object.entries(RAW_PHOTOS).map(([key, url]) => [key, toPortrait(url, key)])
);
