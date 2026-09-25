'use strict';

// Similitud de color para el buscador de tintas: convierte HEX -> sRGB -> XYZ (D65)
// -> CIELAB y calcula la distancia de color (Delta E) contra un catalogo de candidatos.
// Metrica principal: CIEDE2000 (formulacion de Sharma, Wu & Dalal, 2005). Tambien se
// expone Delta E*ab (CIE76) para calibrar umbrales. Sin dependencias externas.

const UMBRALES_DEFECTO = Object.freeze({ alta: 2.0, media: 5.0 });
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

function deltaE76(lab1, lab2) {
  return Math.sqrt(
    Math.pow(lab1.L - lab2.L, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}

function aRadianes(grados) { return grados * (Math.PI / 180); }
function aGrados(radianes) { return radianes * (180 / Math.PI); }

function anguloTono(b, aPrima) {
  if (b === 0 && aPrima === 0) return 0;
  const h = aGrados(Math.atan2(b, aPrima));
  return h >= 0 ? h : h + 360;
}

function deltaTono(c1Prima, c2Prima, h1Prima, h2Prima) {
  if (c1Prima * c2Prima === 0) return 0;
  const d = h2Prima - h1Prima;
  if (d > 180) return d - 360;
  if (d < -180) return d + 360;
  return d;
}

function promedioTono(c1Prima, c2Prima, h1Prima, h2Prima) {
  if (c1Prima * c2Prima === 0) return h1Prima + h2Prima;
  const d = Math.abs(h1Prima - h2Prima);
  if (d <= 180) return (h1Prima + h2Prima) / 2;
  if (h1Prima + h2Prima < 360) return (h1Prima + h2Prima + 360) / 2;
  return (h1Prima + h2Prima - 360) / 2;
}

// CIEDE2000. kL = kC = kH = 1.
function deltaE2000(lab1, lab2) {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;
  const kL = 1, kC = 1, kH = 1;

  const c1 = Math.sqrt(a1 * a1 + b1 * b1);
  const c2 = Math.sqrt(a2 * a2 + b2 * b2);
  const cPromedio = (c1 + c2) / 2;
  const cPromedio7 = Math.pow(cPromedio, 7);
  const g = 0.5 * (1 - Math.sqrt(cPromedio7 / (cPromedio7 + Math.pow(25, 7))));

  const a1Prima = (1 + g) * a1;
  const a2Prima = (1 + g) * a2;
  const c1Prima = Math.sqrt(a1Prima * a1Prima + b1 * b1);
  const c2Prima = Math.sqrt(a2Prima * a2Prima + b2 * b2);
  const h1Prima = anguloTono(b1, a1Prima);
  const h2Prima = anguloTono(b2, a2Prima);

  const deltaLPrima = L2 - L1;
  const deltaCPrima = c2Prima - c1Prima;
  const deltahPrima = deltaTono(c1Prima, c2Prima, h1Prima, h2Prima);
  const deltaHPrima = 2 * Math.sqrt(c1Prima * c2Prima) * Math.sin(aRadianes(deltahPrima) / 2);

  const lPromedio = (L1 + L2) / 2;
  const cPrimaPromedio = (c1Prima + c2Prima) / 2;
  const hPrimaPromedio = promedioTono(c1Prima, c2Prima, h1Prima, h2Prima);

  const t = 1
    - 0.17 * Math.cos(aRadianes(hPrimaPromedio - 30))
    + 0.24 * Math.cos(aRadianes(2 * hPrimaPromedio))
    + 0.32 * Math.cos(aRadianes(3 * hPrimaPromedio + 6))
    - 0.20 * Math.cos(aRadianes(4 * hPrimaPromedio - 63));

  const deltaTheta = 30 * Math.exp(-Math.pow((hPrimaPromedio - 275) / 25, 2));
  const cPrimaPromedio7 = Math.pow(cPrimaPromedio, 7);
  const rC = 2 * Math.sqrt(cPrimaPromedio7 / (cPrimaPromedio7 + Math.pow(25, 7)));
  const sL = 1 + (0.015 * Math.pow(lPromedio - 50, 2)) / Math.sqrt(20 + Math.pow(lPromedio - 50, 2));
  const sC = 1 + 0.045 * cPrimaPromedio;
  const sH = 1 + 0.015 * cPrimaPromedio * t;
  const rT = -Math.sin(aRadianes(2 * deltaTheta)) * rC;

  return Math.sqrt(
    Math.pow(deltaLPrima / (kL * sL), 2) +
    Math.pow(deltaCPrima / (kC * sC), 2) +
    Math.pow(deltaHPrima / (kH * sH), 2) +
    rT * (deltaCPrima / (kC * sC)) * (deltaHPrima / (kH * sH))
  );
}

// Mapea Delta E a un porcentaje de similitud legible: 0 -> 100 %, >= 100 -> 0 %.
function similitudPorcentaje(deltaE) {
  const acotado = Math.min(Math.max(deltaE, 0), 100);
  return Math.round((100 - acotado) * 10) / 10;
}

function banda(deltaE, umbrales = UMBRALES_DEFECTO) {
  if (deltaE <= umbrales.alta) return 'alta';
  if (deltaE <= umbrales.media) return 'media';
  return 'baja';
}

function redondearLab(lab) {
  return {
    L: Math.round(lab.L * 100) / 100,
    a: Math.round(lab.a * 100) / 100,
    b: Math.round(lab.b * 100) / 100
  };
}

// candidatos: [{ color_hex, ...resto }] — el resto se preserva tal cual en cada resultado.
function buscarSimilares(hexObjetivo, candidatos, opciones = {}) {
  const labObjetivo = hexALab(hexObjetivo);
  if (!labObjetivo) return { objetivo: null, umbrales: { ...UMBRALES_DEFECTO }, resultados: [] };

  const umbrales = {
    alta: Number.isFinite(opciones.umbralAlta) ? opciones.umbralAlta : UMBRALES_DEFECTO.alta,
    media: Number.isFinite(opciones.umbralMedia) ? opciones.umbralMedia : UMBRALES_DEFECTO.media
  };
  const limite = Number.isFinite(opciones.limite) && opciones.limite > 0 ? Math.floor(opciones.limite) : 20;

  const resultados = [];
  for (const candidato of candidatos || []) {
    const lab = hexALab(candidato && candidato.color_hex);
    if (!lab) continue;
    const d2000 = deltaE2000(labObjetivo, lab);
    const d76 = deltaE76(labObjetivo, lab);
    resultados.push({
      ...candidato,
      color_hex: normalizarHex(candidato.color_hex),
      delta_e2000: Math.round(d2000 * 100) / 100,
      delta_e76: Math.round(d76 * 100) / 100,
      similitud: similitudPorcentaje(d2000),
      banda: banda(d2000, umbrales)
    });
  }
  resultados.sort((a, b) => a.delta_e2000 - b.delta_e2000);

  return {
    objetivo: { hex: normalizarHex(hexObjetivo), lab: redondearLab(labObjetivo) },
    umbrales,
    resultados: resultados.slice(0, limite)
  };
}

module.exports = {
  UMBRALES_DEFECTO,
  normalizarHex,
  hexARgb,
  rgbALab,
  hexALab,
  deltaE76,
  deltaE2000,
  similitudPorcentaje,
  banda,
  buscarSimilares
};
