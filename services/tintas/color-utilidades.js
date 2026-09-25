'use strict';

// Utilidades de color para el modulo de tintas: conversiones HEX/RGB/CMYK/LAB,
// croma C* y matiz h°, Delta E76 y Delta E00 (CIEDE2000). Sin dependencias.

const { deltaE76, deltaE2000 } = require('./color-similitud');

const BLANCO_D65 = Object.freeze({ x: 95.047, y: 100.0, z: 108.883 });

function normalizarHex(valor) {
  if (typeof valor !== 'string') return null;
  let h = valor.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  if (/^[0-9a-fA-F]{8}$/.test(h)) h = h.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return '#' + h.toUpperCase();
}

function hexARgb(valor) {
  const h = normalizarHex(valor);
  if (!h) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16)
  };
}

function rgbAHex(rgb) {
  if (!rgb) return null;
  const r = Math.max(0, Math.min(255, Math.round(Number(rgb.r) || 0)));
  const g = Math.max(0, Math.min(255, Math.round(Number(rgb.g) || 0)));
  const b = Math.max(0, Math.min(255, Math.round(Number(rgb.b) || 0)));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function canalALineal(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function pivoteLab(t) {
  return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
}

function rgbALab(rgb) {
  const r = canalALineal(rgb.r);
  const g = canalALineal(rgb.g);
  const b = canalALineal(rgb.b);
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100;
  const z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100;
  const fx = pivoteLab(x / BLANCO_D65.x);
  const fy = pivoteLab(y / BLANCO_D65.y);
  const fz = pivoteLab(z / BLANCO_D65.z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function hexALab(valor) {
  const rgb = hexARgb(valor);
  return rgb ? rgbALab(rgb) : null;
}

// CMYK porcentual (0-100). Conversion de referencia (sin perfil ICC).
function rgbACmyk(rgb) {
  const r = Number(rgb.r) / 255, g = Number(rgb.g) / 255, b = Number(rgb.b) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return { c: c * 100, m: m * 100, y: y * 100, k: k * 100 };
}

function cmykARgb({ c = 0, m = 0, y = 0, k = 0 } = {}) {
  const C = Number(c) / 100, M = Number(m) / 100, Y = Number(y) / 100, K = Number(k) / 100;
  return {
    r: Math.round(255 * (1 - Math.min(1, C + K))),
    g: Math.round(255 * (1 - Math.min(1, M + K))),
    b: Math.round(255 * (1 - Math.min(1, Y + K)))
  };
}

function redondear(valor, decimales = 2) {
  if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return null;
  const f = Math.pow(10, decimales);
  return Math.round(Number(valor) * f) / f;
}

function labACromatura(lab) {
  if (!lab || lab.L === undefined || lab.a === undefined || lab.b === undefined) return null;
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  let h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return { c: redondear(c, 2), h: redondear(h, 2) };
}

// Completa un bloque de color: dado un objeto con cualquier combinacion de
// hex / rgb / cmyk / lab, devuelve todos los valores derivados.
function completarColor(entrada = {}) {
  let hex = normalizarHex(entrada.hex);
  let rgb = entrada.rgb && Number.isFinite(Number(entrada.rgb.r)) ? entrada.rgb : null;
  let lab = entrada.lab && Number.isFinite(Number(entrada.lab.L)) ? entrada.lab : null;
  let cmyk = entrada.cmyk && Number.isFinite(Number(entrada.cmyk.c)) ? entrada.cmyk : null;

  if (hex && !rgb) rgb = hexARgb(hex);
  if (!hex && rgb) hex = rgbAHex(rgb);
  if (!rgb && cmyk) rgb = cmykARgb(cmyk);
  if (rgb && !hex) hex = rgbAHex(rgb);
  if (rgb && !lab) lab = rgbALab(rgb);
  if (!rgb && hex && !lab) lab = hexALab(hex);

  const resultado = { hex: hex || null };
  if (rgb) {
    resultado.rgb_r = Math.round(Number(rgb.r));
    resultado.rgb_g = Math.round(Number(rgb.g));
    resultado.rgb_b = Math.round(Number(rgb.b));
  }
  const cmykFinal = rgb ? rgbACmyk(rgb) : (cmyk || null);
  if (cmykFinal) {
    resultado.cmyk_c = redondear(cmykFinal.c, 1);
    resultado.cmyk_m = redondear(cmykFinal.m, 1);
    resultado.cmyk_y = redondear(cmykFinal.y, 1);
    resultado.cmyk_k = redondear(cmykFinal.k, 1);
  }
  if (lab) {
    resultado.lab_l = redondear(lab.L, 2);
    resultado.lab_a = redondear(lab.a, 2);
    resultado.lab_b = redondear(lab.b, 2);
    const ch = labACromatura(lab);
    if (ch) { resultado.croma_c = ch.c; resultado.matiz_h = ch.h; }
  }
  return resultado;
}

function convertir(entrada) {
  const forma = String(entrada.forma || '').toUpperCase();
  const vals = entrada.valores || {};
  if (forma === 'HEX') return completarColor({ hex: vals.hex });
  if (forma === 'RGB') return completarColor({ rgb: { r: vals.r, g: vals.g, b: vals.b } });
  if (forma === 'CMYK') return completarColor({ cmyk: { c: vals.c, m: vals.m, y: vals.y, k: vals.k } });
  if (forma === 'LAB') {
    const lab = { L: Number(vals.l), a: Number(vals.a), b: Number(vals.b) };
    const ch = labACromatura(lab);
    return { lab_l: redondear(lab.L, 2), lab_a: redondear(lab.a, 2), lab_b: redondear(lab.b, 2), croma_c: ch && ch.c, matiz_h: ch && ch.h };
  }
  return null;
}

function clasificacionDeltaE(deltaE) {
  const de = Number(deltaE) || 0;
  if (de <= 1) return 'Coincidencia muy cercana';
  if (de <= 2) return 'Muy cercana';
  if (de <= 3) return 'Cercana';
  if (de <= 5) return 'Aproximada';
  return 'Diferencia significativa';
}

module.exports = {
  normalizarHex,
  hexARgb,
  rgbAHex,
  rgbALab,
  hexALab,
  rgbACmyk,
  cmykARgb,
  labACromatura,
  completarColor,
  convertir,
  clasificacionDeltaE,
  deltaE76,
  deltaE2000
};
