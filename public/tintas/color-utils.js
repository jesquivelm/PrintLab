'use strict';
// Utilidades de color para las pantallas de tintas (conversiones sin dependencias).
// Regla fundamental del modulo: RGB/HEX/CMYK son referencia digital; LAB y Delta E
// son comparacion colorimetrica. La formulacion calculada es orientativa.

function colorNormHex(valor) {
  if (typeof valor !== 'string') return null;
  var h = valor.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map(function (c) { return c + c; }).join('');
  if (/^[0-9a-fA-F]{8}$/.test(h)) h = h.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return '#' + h.toUpperCase();
}

function colorHexARgb(valor) {
  var h = colorNormHex(valor);
  if (!h) return null;
  return {
    r: parseInt(h.slice(1, 3), 16),
    g: parseInt(h.slice(3, 5), 16),
    b: parseInt(h.slice(5, 7), 16)
  };
}

function colorRgbAHex(rgb) {
  if (!rgb) return null;
  function clamp(v) { return Math.max(0, Math.min(255, Math.round(Number(v) || 0))); }
  return '#' + [clamp(rgb.r), clamp(rgb.g), clamp(rgb.b)].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('').toUpperCase();
}

function colorCanalLineal(c) {
  var v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function colorPivoteLab(t) {
  return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
}

function colorRgbALab(rgb) {
  var r = colorCanalLineal(rgb.r), g = colorCanalLineal(rgb.g), b = colorCanalLineal(rgb.b);
  var x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) * 100;
  var y = (r * 0.2126729 + g * 0.7151522 + b * 0.0721750) * 100;
  var z = (r * 0.0193339 + g * 0.1191920 + b * 0.9503041) * 100;
  var fx = colorPivoteLab(x / 95.047), fy = colorPivoteLab(y / 100.0), fz = colorPivoteLab(z / 108.883);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function colorHexALab(valor) {
  var rgb = colorHexARgb(valor);
  return rgb ? colorRgbALab(rgb) : null;
}

function colorRgbACmyk(rgb) {
  var r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  var k = 1 - Math.max(r, g, b);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: (1 - r - k) / (1 - k) * 100,
    m: (1 - g - k) / (1 - k) * 100,
    y: (1 - b - k) / (1 - k) * 100,
    k: k * 100
  };
}

function colorCmykARgb(v) {
  var C = (Number(v.c) || 0) / 100, M = (Number(v.m) || 0) / 100, Y = (Number(v.y) || 0) / 100, K = (Number(v.k) || 0) / 100;
  return {
    r: Math.round(255 * (1 - Math.min(1, C + K))),
    g: Math.round(255 * (1 - Math.min(1, M + K))),
    b: Math.round(255 * (1 - Math.min(1, Y + K)))
  };
}

function colorRed(v, dec) {
  if (v === null || v === undefined || !isFinite(Number(v))) return null;
  var f = Math.pow(10, dec === undefined ? 2 : dec);
  return Math.round(Number(v) * f) / f;
}

function colorLabACromatura(lab) {
  if (!lab || !isFinite(Number(lab.L))) return null;
  var c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
  var h = Math.atan2(lab.b, lab.a) * 180 / Math.PI;
  if (h < 0) h += 360;
  return { c: colorRed(c), h: colorRed(h) };
}

// Completa un color: entrada {hex|rgb|cmyk|lab} -> todos los derivados.
function colorCompleto(entrada) {
  entrada = entrada || {};
  var hex = colorNormHex(entrada.hex);
  var rgb = entrada.rgb && isFinite(Number(entrada.rgb.r)) ? entrada.rgb : null;
  var lab = entrada.lab && isFinite(Number(entrada.lab.L)) ? entrada.lab : null;
  var cmyk = entrada.cmyk && isFinite(Number(entrada.cmyk.c)) ? entrada.cmyk : null;
  if (hex && !rgb) rgb = colorHexARgb(hex);
  if (!hex && rgb) hex = colorRgbAHex(rgb);
  if (!rgb && cmyk) rgb = colorCmykARgb(cmyk);
  if (rgb && !hex) hex = colorRgbAHex(rgb);
  if (rgb && !lab) lab = colorRgbALab(rgb);
  var out = { hex: hex };
  if (rgb) { out.rgb = { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) }; }
  var ck = rgb ? colorRgbACmyk(rgb) : cmyk;
  if (ck) { out.cmyk = { c: colorRed(ck.c, 1), m: colorRed(ck.m, 1), y: colorRed(ck.y, 1), k: colorRed(ck.k, 1) }; }
  if (lab) {
    out.lab = { L: colorRed(lab.L), a: colorRed(lab.a), b: colorRed(lab.b) };
    var ch = colorLabACromatura(lab);
    if (ch) { out.c = ch.c; out.h = ch.h; }
  }
  return out;
}

// Delta E76
function colorDeltaE76(lab1, lab2) {
  return Math.sqrt(Math.pow(lab1.L - lab2.L, 2) + Math.pow(lab1.a - lab2.a, 2) + Math.pow(lab1.b - lab2.b, 2));
}

// CIEDE2000 (Sharma, Wu & Dalal 2005)
function colorDeltaE00(lab1, lab2) {
  var L1 = lab1.L, a1 = lab1.a, b1 = lab1.b, L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;
  var rad = function (g) { return g * Math.PI / 180; };
  var deg = function (r) { return r * 180 / Math.PI; };
  var c1 = Math.sqrt(a1 * a1 + b1 * b1), c2 = Math.sqrt(a2 * a2 + b2 * b2);
  var cP = (c1 + c2) / 2, cP7 = Math.pow(cP, 7);
  var G = 0.5 * (1 - Math.sqrt(cP7 / (cP7 + Math.pow(25, 7))));
  var a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  var c1p = Math.sqrt(a1p * a1p + b1 * b1), c2p = Math.sqrt(a2p * a2p + b2 * b2);
  function tono(b, ap) { if (b === 0 && ap === 0) return 0; var h = deg(Math.atan2(b, ap)); return h >= 0 ? h : h + 360; }
  var h1p = tono(b1, a1p), h2p = tono(b2, a2p);
  var dLp = L2 - L1, dCp = c2p - c1p;
  var dhp = 0;
  if (c1p * c2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
  }
  var dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(rad(dhp) / 2);
  var LP = (L1 + L2) / 2, cPp = (c1p + c2p) / 2;
  var hPp;
  if (c1p * c2p === 0) hPp = h1p + h2p;
  else {
    var d = Math.abs(h1p - h2p);
    if (d <= 180) hPp = (h1p + h2p) / 2;
    else if (h1p + h2p < 360) hPp = (h1p + h2p + 360) / 2;
    else hPp = (h1p + h2p - 360) / 2;
  }
  var T = 1 - 0.17 * Math.cos(rad(hPp - 30)) + 0.24 * Math.cos(rad(2 * hPp)) + 0.32 * Math.cos(rad(3 * hPp + 6)) - 0.20 * Math.cos(rad(4 * hPp - 63));
  var dTheta = 30 * Math.exp(-Math.pow((hPp - 275) / 25, 2));
  var cPp7 = Math.pow(cPp, 7);
  var RC = 2 * Math.sqrt(cPp7 / (cPp7 + Math.pow(25, 7)));
  var SL = 1 + (0.015 * Math.pow(LP - 50, 2)) / Math.sqrt(20 + Math.pow(LP - 50, 2));
  var SC = 1 + 0.045 * cPp;
  var SH = 1 + 0.015 * cPp * T;
  var RT = -Math.sin(rad(2 * dTheta)) * RC;
  return Math.sqrt(Math.pow(dLp / SL, 2) + Math.pow(dCp / SC, 2) + Math.pow(dHp / SH, 2) + RT * (dCp / SC) * (dHp / SH));
}

function colorClasificacionDE(de) {
  var v = Number(de) || 0;
  if (v <= 1) return 'Coincidencia muy cercana';
  if (v <= 2) return 'Muy cercana';
  if (v <= 3) return 'Cercana';
  if (v <= 5) return 'Aproximada';
  return 'Diferencia significativa';
}
