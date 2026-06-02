require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const XLSX = require('xlsx');
const { query: pgQuery, withTransaction } = require('./db/postgres');
const { ensureInventorySchema, listInventory, getTroquelByCode, saveInventory, deleteInventory, importInventory, exportInventoryWorkbook } = require('./inventory-service');
const { calculateProcessQuote } = require('./process-quote-service');
const {
    ensureSapSchema,
    registerSapRoutes,
    startSapScheduler,
    fetchSapBusinessPartnersForImport,
    fetchSapItemsForImport,
    stageSapMirrorOrder,
    stageSapMirrorBom
} = require('./services/sap-service-layer');
const { ensureExchangeRateSchema, registerExchangeRateRoutes, startExchangeRateScheduler, buildProformaExchangeContext } = require('./services/exchange-rate-service');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_ROOT = __dirname;
const DATA_ROOT = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(APP_ROOT, 'config');
const GENERAL_CONFIG_PATH = path.join(CONFIG_DIR, 'general-config.json');
const BOOTSTRAP_CONFIG_PATH = path.join(APP_ROOT, 'public', 'bootstrap-config.js');
const GENERAL_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_UPLOADS_DIR = path.join(APP_ROOT, 'public', 'uploads');
const LOGIN_REPOSITORY_DIR = path.join(PUBLIC_UPLOADS_DIR, 'login-repository');
const LOGIN_REPOSITORY_URL_BASE = '/uploads/login-repository';
const QUOTE_ATTACHMENT_STORAGE_DIR = path.join(APP_ROOT, 'storage', 'quote-line-attachments');
const NOTIFICATION_ATTACHMENT_STORAGE_DIR = path.join(APP_ROOT, 'storage', 'notification-center-attachments');
const FLEXO_ENGINE_DIR = path.join(APP_ROOT, 'services', 'flexo-engine');
const FLEXO_ENGINE_HELPERS_PATH = path.join(FLEXO_ENGINE_DIR, 'dist', 'web', 'server-helpers.js');
const FLEXO_CALCULATOR_PUBLIC_DIR = path.join(APP_ROOT, 'public', 'calculo-flexografia');
const ICONS_DISK_DIR = path.join(APP_ROOT, 'public', 'assets', 'bootstrap', 'icons');
const FT2_PER_M2 = 10.7639104167;
const IN2_PER_M2 = 1550.0031;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
let generalConfigCache = null;
let generalConfigCacheExpiresAt = 0;
let shellConfigCache = null;
let shellConfigCacheExpiresAt = 0;

const PRESENTATION_NAMES = {
    'dashboard': 'Dashboard',
    'configuracion-general': 'Configuración General',
    'productos': 'Productos',
    'cotizaciones': 'Cotizaciones',
    'notificaciones': 'Notificaciones',
    'solicitudes': 'Solicitudes',
    'calculos': 'Cálculos',
    'socios': 'Socios',
    'inventario-mp': 'Inventario Materia Prima',
    'inventario-troqueles': 'Inventario Troqueles',
    'socios': 'Socios',
    'inventario-mp': 'Inventario Materia Prima',
    'inventario-troqueles': 'Inventario Troqueles',
    'inventario-maquinaria': 'Inventario Maquinaria',
    'costos': 'Costos',
    'vendedores': 'Vendedores',
    'ordenes': 'Ordenes',
    'sap': 'SAP',
    'planificacion': 'Planificación',
    'seguimiento': 'Seguimiento'
};

function createDefaultPresentation(name) {
    return {
        moduleTitle: name,
        brandWidth: 116,
        brandFontFamily: 'Georgia, Times New Roman, serif',
        brandFontSize: 22,
        brandColor: '#ffffff',
        brandVerticalAlign: 'center',
        brandHorizontalAlign: 'center',
        brandMarginTop: 0,
        brandMarginRight: 0,
        brandMarginBottom: 0,
        brandMarginLeft: 0,
        titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        titleFontSize: 16,
        titleVerticalAlign: 'center',
        titleHorizontalAlign: 'left',
        titleMarginLeft: 30,
        titleWidth: 0,
        titleColor: '#252c33',
        logoPosition: 'left',
        brandLogoUrl: '',
        headerBgStart: '',
        headerBgEnd: '',
        headerBorderColor: '',
        footerBorderColor: '',
        footerFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        footerFontSize: 12,
        footerColor: '#2f3740',
        footerMarginTop: 0,
        footerMarginBottom: 0,
        fieldFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        fieldHeight: 18,
        fieldFontSize: 12,
        labelAlign: '',
        mediumInputWidth: 0,
        largeInputWidth: 0,
        tableHeaderFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        tableHeaderFontSize: 11,
        tabColor: '#7f7f7f',
        tabHeight: 18,
        tabWidth: 88,
        tableRowHeight: 22,
        iconSize: 20,
        pageMarginTop: 14,
        pageMarginBottom: 8,
        pageMarginRight: 16,
        pageMarginLeft: 16
    };
}

function normalizeCommercialMaterialFamily(value = '') {
    const normalized = normalizeText(String(value || ''))
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (!normalized) return '';
    if (
        normalized.includes('barniz')
        || normalized.includes('laminad')
        || normalized.includes('foil')
        || normalized.includes('estamp')
        || normalized.includes('embos')
        || normalized.includes('core')
        || normalized.includes('tinta')
        || normalized.includes('adhesivo')
        || normalized.includes('cinta')
        || normalized.includes('ribbon')
        || normalized.includes('hot melt')
    ) return '';
    if ((normalized.includes('opp') || normalized.includes('bopp') || normalized.includes('poliprop')) && normalized.includes('trans')) return 'OPP Transparente';
    if ((normalized.includes('opp') || normalized.includes('bopp') || normalized.includes('poliprop')) && (normalized.includes('blanco') || normalized.includes('white'))) return 'OPP Blanco';
    if (normalized.includes('opp') || normalized.includes('bopp') || normalized.includes('poliprop')) return 'OPP';
    if (normalized.includes('pet') && normalized.includes('trans')) return 'PET Transparente';
    if (normalized.includes('pet') && (normalized.includes('blanco') || normalized.includes('white'))) return 'PET Blanco';
    if (normalized.includes('pet')) return 'PET';
    if (normalized.includes('vinil') && normalized.includes('trans')) return 'Vinil Transparente';
    if (normalized.includes('vinil') && (normalized.includes('blanco') || normalized.includes('white'))) return 'Vinil Blanco';
    if (normalized.includes('vinil')) return 'Vinil';
    if (normalized.includes('shrink')) return 'Shrink';
    if (normalized.includes('cartulina')) return 'Cartulina';
    if (normalized.includes('termic')) return 'Papel Térmico';
    if (normalized.includes('transfer')) return 'Papel Transfer';
    if (normalized.includes('couche') || normalized.includes('cote') || normalized.includes('coat')) return 'Papel Couche';
    if (normalized.includes('papel')) return 'Papel';
    return '';
}

function toCommercialTitleCase(value = '') {
    return String(value || '')
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => {
            const upper = token.toUpperCase();
            if (upper.length <= 4 && /[A-Z]/.test(upper)) return upper;
            return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
        })
        .join(' ')
        .trim();
}

function buildFallbackCommercialMaterialFamily(value = '') {
    const normalized = normalizeText(String(value || ''))
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (!normalized) return '';
    const compact = normalized
        .replace(/\b(\d+([.,]\d+)?)(\s?("|in|mm|mic|micras|micron|gsm|g|kg|lb|lbs|mil))\b/g, ' ')
        .replace(/\b(codigo|cod|item|sku|material|film|pelicula|lamina|label stock|stock)\b/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!compact) return '';
    const tokens = compact
        .split(' ')
        .filter((token) => token.length >= 3)
        .filter((token) => !/^\d+$/.test(token))
        .filter((token) => ![
            'con', 'sin', 'para', 'por', 'una', 'uno', 'the', 'and', 'hot', 'melt',
            'barniz', 'laminado', 'foil', 'estampado', 'embosado', 'tinta', 'adhesivo',
            'cinta', 'ribbon', 'liner', 'core', 'rollo', 'bobina'
        ].includes(token))
        .slice(0, 3);
    return toCommercialTitleCase(tokens.join(' '));
}

function resolveCommercialMaterialFamily(material = {}) {
    const seeds = [
        material.presentationType,
        material.familiaProceso,
        material.name,
        material.displayName,
        material.code
    ].filter((item) => String(item || '').trim());
    for (const seed of seeds) {
        const normalized = normalizeCommercialMaterialFamily(seed);
        if (normalized) return normalized;
    }
    for (const seed of seeds) {
        const fallback = buildFallbackCommercialMaterialFamily(seed);
        if (fallback) return fallback;
    }
    return '';
}

function isQuotableSubstrateMaterial(material = {}) {
    if (!material || material.active === false) return false;
    const family = normalizeText(material.familiaProceso || material.classification || material.tipo || '').toLowerCase();
    if (family && !family.includes('sustrato')) {
        const keywords = ['sustrato', 'papel', 'film', 'bopp', 'opp', 'pet', 'vinil', 'poliestireno', 'polietileno', 'polipropileno', 'acetato'];
        const hasKeyword = keywords.some((kw) => family.includes(kw));
        if (!hasKeyword) return false;
    }
    return parsePositiveNumber(material.widthInches, 0) > 0;
}

function getCommercialMaterialFamilies(materials = []) {
    const seen = new Set();
    return (Array.isArray(materials) ? materials : [])
        .filter((item) => isQuotableSubstrateMaterial(item))
        .filter((item) => item.conventionalEnabled !== false || item.digitalEnabled !== false)
        .map((item) => {
            const family = resolveCommercialMaterialFamily(item);
            return { code: family, name: family };
        })
        .filter((item) => {
            if (!item.name || seen.has(item.name)) return false;
            seen.add(item.name);
            return true;
        })
        .sort((left, right) => left.name.localeCompare(right.name, 'es'));
}

function getQuotableSubstrateMaterials(materials = []) {
    const seen = new Set();
    return (Array.isArray(materials) ? materials : [])
        .filter((item) => isQuotableSubstrateMaterial(item))
        .filter((item) => item.conventionalEnabled !== false || item.digitalEnabled !== false)
        .map((item) => ({
            code: pickFirstValue(item.code, item.codigo, item.id, item.name),
            name: pickFirstValue(item.name, item.nombre, item.displayName, item.code),
            widthInches: parsePositiveNumber(item.widthInches, 0)
        }))
        .filter((item) => {
            const key = `${String(item.code || '').trim().toLowerCase()}|${String(item.name || '').trim().toLowerCase()}`;
            if (!item.name || seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((left, right) => left.name.localeCompare(right.name, 'es'));
}

function normalizeRequestedShape(value = '') {
    const normalized = normalizeText(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('butt') || normalized.includes('boot') || normalized.includes('book')) return 'butt cut';
    if (normalized.includes('redond') || normalized.includes('circular')) return 'circular';
    if (normalized.includes('cuadr')) return 'cuadrado';
    if (normalized.includes('rect')) return 'rectangular';
    if (normalized.includes('oval')) return 'ovalado';
    if (normalized.includes('especial')) return 'especial';
    return normalized;
}

function resolveDieShape(die = {}) {
    const seed = [
        die.clasificacion,
        die.tipoTroquel,
        die.tipoTroquel2,
        die.description,
        die.descripcionCotizaciones,
        die.code
    ].filter(Boolean).join(' ');
    const normalized = normalizeRequestedShape(seed);
    if (normalized) return normalized;
    const code = normalizeText(die.code || '').toUpperCase();
    if (code.startsWith('R-') || code === 'R') return 'circular';
    if (code.startsWith('O-') || code === 'O') return 'ovalado';
    if (code.startsWith('CU-') || code === 'CU') return 'cuadrado';
    if (code.startsWith('E-') || code === 'E') return 'especial';
    if (code.startsWith('BC-')) return 'butt cut';
    if (code.startsWith('C-')) return 'rectangular';
    return '';
}

function parsePositiveNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function getDieLabelWidthInches(die = {}) {
    return parsePositiveNumber(die.anchoEtiquetaIn, parsePositiveNumber(die.widthMm) / 25.4);
}

function getDieLabelLengthInches(die = {}) {
    return parsePositiveNumber(die.largoEtiquetaIn, parsePositiveNumber(die.lengthMm) / 25.4);
}

function getDieRequiredMaterialWidthInches(die = {}, fallbackWidth = 0) {
    return parsePositiveNumber(die.anchoMaterialIn, parsePositiveNumber(die.ancho_total_troquel_in, fallbackWidth));
}

function isDieProcessCompatible(die = {}, processType = 'convencional') {
    if (processType === 'digital') return die.usoDigital !== false;
    return die.usoConvencional !== false;
}

function isMaterialProcessCompatible(material = {}, processType = 'convencional') {
    if (material.active === false) return false;
    if (processType === 'digital') return material.digitalEnabled !== false;
    return material.conventionalEnabled !== false;
}

function isMachineProcessCompatible(machine = {}, processType = 'convencional') {
    if (!machine || machine.active === false) return false;
    const type = normalizeText(machine.type || '').toLowerCase();
    if (processType === 'digital') return type.includes('digit') || type.includes('hibr');
    return type.includes('conv') || type.includes('hibr');
}

function dieMatchesRequestedGeometry(die = {}, requestedShape = '', widthInches = 0, lengthInches = 0) {
    const dieShape = resolveDieShape(die);
    if (requestedShape && dieShape && dieShape !== requestedShape) return false;
    const dieWidth = getDieLabelWidthInches(die);
    const dieLength = getDieLabelLengthInches(die);
    if (!widthInches || !lengthInches || !dieWidth || !dieLength) return true;
    const tolerance = 0.12;
    const directMatch = Math.abs(dieWidth - widthInches) <= tolerance && Math.abs(dieLength - lengthInches) <= tolerance;
    const rotatedMatch = Math.abs(dieWidth - lengthInches) <= tolerance && Math.abs(dieLength - widthInches) <= tolerance;
    return directMatch || rotatedMatch;
}

function scoreDieCandidate(die = {}, widthInches = 0, lengthInches = 0) {
    const dieWidth = getDieLabelWidthInches(die);
    const dieLength = getDieLabelLengthInches(die);
    const sizePenalty = Math.abs(dieWidth - widthInches) + Math.abs(dieLength - lengthInches);
    const repetitionScore = parsePositiveNumber(die.repetitions, 1) * 100;
    const rowsScore = parsePositiveNumber(die.rows, 1) * 25;
    const widthScore = parsePositiveNumber(getDieRequiredMaterialWidthInches(die, dieWidth), dieWidth);
    return repetitionScore + rowsScore - (sizePenalty * 100) - widthScore;
}

function selectBestDie({ dies = [], requestedShape = '', widthInches = 0, lengthInches = 0, processType = 'convencional' }) {
    const candidates = (Array.isArray(dies) ? dies : [])
        .filter((die) => die && die.active !== false)
        .filter((die) => isDieProcessCompatible(die, processType))
        .filter((die) => dieMatchesRequestedGeometry(die, requestedShape, widthInches, lengthInches))
        .sort((left, right) => scoreDieCandidate(right, widthInches, lengthInches) - scoreDieCandidate(left, widthInches, lengthInches));
    return candidates[0] || null;
}

function selectCandidateMaterials({ materials = [], requestedFamily = '', processType = 'convencional', minimumWidthInches = 0 }) {
    const normalizedFamily = normalizeCommercialMaterialFamily(requestedFamily);
    const familyCandidates = (Array.isArray(materials) ? materials : [])
        .filter((material) => isQuotableSubstrateMaterial(material))
        .filter((material) => isMaterialProcessCompatible(material, processType))
        .filter((material) => !normalizedFamily || resolveCommercialMaterialFamily(material) === normalizedFamily)
        .sort((left, right) => {
            const leftWidth = parsePositiveNumber(left.widthInches, 0);
            const rightWidth = parsePositiveNumber(right.widthInches, 0);
            return leftWidth - rightWidth || parsePositiveNumber(left.costPerMsiUsd, 0) - parsePositiveNumber(right.costPerMsiUsd, 0);
        });
    const widthCandidates = familyCandidates.filter((material) => !minimumWidthInches || parsePositiveNumber(material.widthInches, 0) >= (minimumWidthInches - 0.01));
    return {
        familyCandidates,
        widthCandidates
    };
}

function selectCandidateMachines({ machines = [], processType = 'convencional', minimumWidthInches = 0, requiredCategory = '' }) {
    return (Array.isArray(machines) ? machines : [])
        .filter((machine) => isMachineProcessCompatible(machine, processType))
        .filter((machine) => !isAutomaticPlaceholderMachine(machine))
        .filter((machine) => !requiredCategory || normalizeText(machine.category || machine.process || '').toLowerCase().includes(requiredCategory))
        .filter((machine) => {
            if (!minimumWidthInches) return true;
            const machineWidth = resolveMachineMaxWidthInches(machine);
            if (!machineWidth) return true;
            return machineWidth >= (minimumWidthInches - 0.01);
        })
        .sort((left, right) => {
            const leftWidth = resolveMachineMaxWidthInches(left) || 9999;
            const rightWidth = resolveMachineMaxWidthInches(right) || 9999;
            return leftWidth - rightWidth || parsePositiveNumber(left.hourlyMachineCost, 0) - parsePositiveNumber(right.hourlyMachineCost, 0);
        });
}

function isShapeDieOptional(requestedShape = '') {
    return requestedShape === 'rectangular' || requestedShape === 'cuadrado' || requestedShape === 'square';
}

function resolveMachineMaxWidthInches(machine = {}) {
    const directWidth = parsePositiveNumber(machine.maxWidthInches, 0);
    if (directWidth > 0) return directWidth;
    const capacityWidth = Array.isArray(machine.capacities)
        ? machine.capacities.reduce((max, item) => Math.max(max, parsePositiveNumber(item?.maxWidthInches, 0)), 0)
        : 0;
    if (capacityWidth > 0) return capacityWidth;
    return inferMachineModelWidthInches(machine);
}

function hasConfiguredMachineWidth(machine = {}) {
    if (parsePositiveNumber(machine.maxWidthInches, 0) > 0) return true;
    return Array.isArray(machine.capacities)
        ? machine.capacities.some((item) => parsePositiveNumber(item?.maxWidthInches, 0) > 0)
        : false;
}

function isAutomaticPlaceholderMachine(machine = {}) {
    const normalized = normalizeText([
        machine.machineName,
        machine.name,
        machine.process,
        machine.subprocess
    ].filter(Boolean).join(' ')).toLowerCase();
    if (!normalized) return false;
    return normalized.startsWith('zz ') || normalized.startsWith('zz maquina ');
}

function inferMachineModelWidthInches(machine = {}) {
    const normalized = normalizeText([
        machine.machineName,
        machine.name,
        machine.type,
        machine.process,
        machine.subprocess
    ].filter(Boolean).join(' ')).toLowerCase();
    if (!normalized) return 0;
    const widthByPattern = [
        [/hp\s*6000/, 13],
        [/hp\s*8000/, 13],
        [/konica\s*minolta\s*accuriolabel\s*400/, 12.95],
        [/durst\s*tau\s*rsci/, 13],
        [/mark\s*andy\s*p5/, 13],
        [/gallus\s*labelmaster/, 17],
        [/omet\s*xflex\s*x6/, 17],
        [/mps\s*ef\s*symetron/, 13]
    ];
    const matched = widthByPattern.find(([pattern]) => pattern.test(normalized));
    return matched ? matched[1] : 0;
}

function resolveMachineSpeedFeetPerMinute(machine = {}, processType = 'convencional') {
    if (processType === 'digital') {
        const speedMpm = parsePositiveNumber(machine.digitalSpeedCmykMpm, parsePositiveNumber(machine.productionSpeed, 0));
        return speedMpm > 0 ? (speedMpm * 3.28084) : 0;
    }
    const normalizedUnit = normalizeText(machine.speedUnit || machine.workUnit || '').toLowerCase();
    const productionSpeed = parsePositiveNumber(machine.productionSpeed, 0);
    if (!productionSpeed) return 0;
    if (normalizedUnit.includes('metro')) return productionSpeed * 3.28084;
    return productionSpeed;
}

function estimateMountingLayout({
    machine = null,
    material = null,
    die = null,
    processType = 'convencional',
    widthInches = 0,
    lengthInches = 0,
    quantity = 0,
    labelsPerRoll = 1000
} = {}) {
    if (!machine || !material || widthInches <= 0 || lengthInches <= 0 || quantity <= 0) return null;
    const machineWidth = resolveMachineMaxWidthInches(machine);
    const materialWidth = parsePositiveNumber(material.widthInches, 0);
    const usableWidth = Math.min(machineWidth || materialWidth, materialWidth || machineWidth);
    if (usableWidth <= 0) return null;
    const horizontalGap = Math.max(0, parsePositiveNumber(die?.gapIn, 0.125));
    const verticalGap = Math.max(0, parsePositiveNumber(die?.gapIn, 0.125));
    const labelPitchWidth = Math.max(0.01, widthInches + horizontalGap);
    const labelPitchLength = Math.max(0.01, lengthInches + verticalGap);
    const dieRequiredWidth = getDieRequiredMaterialWidthInches(die || {}, 0);
    const estimatedColumns = Math.max(1, Math.floor((usableWidth + horizontalGap) / labelPitchWidth));
    let columns = estimatedColumns;
    if (dieRequiredWidth > 0 && usableWidth + 0.01 >= dieRequiredWidth) {
        const dieRows = Math.max(1, parsePositiveNumber(die?.rows, 1));
        const dieRepetitions = Math.max(1, parsePositiveNumber(die?.repetitions, 1));
        columns = Math.max(1, Math.min(estimatedColumns, dieRows * dieRepetitions));
    }
    const rowsNeeded = Math.max(1, Math.ceil(quantity / columns));
    const linearInches = rowsNeeded * labelPitchLength;
    const linearFeet = linearInches / 12;
    const msiBase = (usableWidth * linearInches) / 1000;
    const wasteFactor = processType === 'digital'
        ? Math.max(1, parsePositiveNumber(machine.digitalWasteFactor, 1.05))
        : 1.08;
    const msiWithWaste = msiBase * wasteFactor;
    const materialCost = msiWithWaste * parsePositiveNumber(material.costPerMsiUsd, 0);
    const speedFeetPerMinute = resolveMachineSpeedFeetPerMinute(machine, processType);
    const runtimeMinutes = speedFeetPerMinute > 0 ? (linearFeet * wasteFactor) / speedFeetPerMinute : 0;
    const setupMinutes = Math.max(
        0,
        parsePositiveNumber(machine.setupBaseMinutes, 0) +
        parsePositiveNumber(machine.setupExtraMinutes, 0) +
        (processType === 'convencional' ? parsePositiveNumber(machine.setupPerStationMinutes, 0) : 0)
    );
    const totalHours = (setupMinutes + runtimeMinutes) / 60;
    const machineCost = totalHours * (
        parsePositiveNumber(machine.hourlyMachineCost, 0) +
        parsePositiveNumber(machine.hourlyOperatorCost, 0)
    );
    const widthGap = Math.max(0, machineWidth - usableWidth);
    const estimatedTotalCost = materialCost + machineCost + (widthGap * 0.05);

    return {
        machineWidth,
        materialWidth,
        usableWidth,
        columns,
        rowsNeeded,
        horizontalGap,
        verticalGap,
        labelPitchWidth,
        labelPitchLength,
        linearInches,
        linearFeet,
        msiBase,
        wasteFactor,
        msiWithWaste,
        materialCost,
        machineCost,
        setupMinutes,
        runtimeMinutes,
        totalHours,
        estimatedTotalCost,
        labelsPerRoll: Math.max(1, Math.ceil(labelsPerRoll)),
        estimatedRollCount: Math.max(1, Math.ceil(quantity / Math.max(1, Math.ceil(labelsPerRoll)))),
        source: die?.code ? 'troquel_y_ancho' : 'ancho_maquina_material'
    };
}

function selectBestProductionCombo({
    materials = [],
    machines = [],
    requestedFamily = '',
    processType = 'convencional',
    widthInches = 0,
    lengthInches = 0,
    quantity = 0,
    labelsPerRoll = 1000,
    die = null
} = {}) {
    const dieRequiredWidth = getDieRequiredMaterialWidthInches(die || {}, widthInches);
    const materialSelection = selectCandidateMaterials({
        materials,
        requestedFamily,
        processType,
        minimumWidthInches: widthInches
    });
    const machineCandidates = selectCandidateMachines({
        machines,
        processType,
        minimumWidthInches: widthInches,
        requiredCategory: 'impres'
    });
    const combos = [];

    materialSelection.widthCandidates.forEach((material) => {
        const materialWidth = parsePositiveNumber(material.widthInches, 0);
        machineCandidates.forEach((machine) => {
            const machineWidth = resolveMachineMaxWidthInches(machine);
            if (materialWidth > 0 && machineWidth > 0 && materialWidth - machineWidth > 0.01) return;
            if (dieRequiredWidth > 0 && Math.min(materialWidth || machineWidth, machineWidth || materialWidth) + 0.01 < dieRequiredWidth) return;
            const layout = estimateMountingLayout({
                machine,
                material,
                die,
                processType,
                widthInches,
                lengthInches,
                quantity,
                labelsPerRoll
            });
            if (!layout || layout.columns <= 0) return;
            combos.push({
                machine,
                material,
                layout,
                machineWidthKnown: machineWidth > 0,
                dieWidthGap: Math.max(0, dieRequiredWidth - layout.usableWidth),
                widthGap: Math.abs((machineWidth || parsePositiveNumber(material.widthInches, 0)) - parsePositiveNumber(material.widthInches, 0))
            });
        });
    });

    combos.sort((left, right) => {
        if (left.layout.estimatedTotalCost !== right.layout.estimatedTotalCost) {
            return left.layout.estimatedTotalCost - right.layout.estimatedTotalCost;
        }
        if (left.layout.columns !== right.layout.columns) {
            return right.layout.columns - left.layout.columns;
        }
        return left.widthGap - right.widthGap;
    });

    return {
        materialSelection,
        machineCandidates,
        combos,
        best: combos[0] || null
    };
}

function buildAutomaticRouteComment({
    selectedProcessType = '',
    threshold = 0,
    quantity = 0,
    die = null,
    material = null,
    machine = null,
    mounting = null
}) {
    const fragments = [];
    if (threshold > 0 && quantity > 0) {
        fragments.push(quantity <= threshold
            ? `Cantidad ${quantity} dentro del límite automático digital (${threshold}).`
            : `Cantidad ${quantity} supera el límite automático digital (${threshold}).`);
    }
    fragments.push(`Ruta seleccionada: ${selectedProcessType === 'digital' ? 'Digital' : 'Convencional'}.`);
    if (die?.code) fragments.push(`Troquel seleccionado: ${die.code}.`);
    if (material?.code) fragments.push(`Material seleccionado: ${material.code}.`);
    if (machine?.machineName) fragments.push(`Máquina seleccionada: ${machine.machineName}.`);
    if (mounting) {
        fragments.push(`Montaje estimado: ${mounting.columns} columnas en ${roundCurrency(mounting.usableWidth)}".`);
    }
    return fragments.join(' ');
}

async function resolveSmartQuoteLineSelection(payload = {}) {
    const generalConfig = await loadGeneralConfig();
    const catalogs = await loadFlexoCatalogsFromDb();
    const quantity = parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(payload.quantityProducts) ?? 0;
    const threshold = Math.max(0, Number(generalConfig?.general?.quoteAutomaticDigitalMaxQuantity || 0)) || 100000;
    const requestedShape = normalizeRequestedShape(payload?.request_meta?.['REQ | Forma'] || payload?.request_meta?.Estado_UI?.dieShape || '');
    const widthInches = parsePositiveNumber(payload.widthInches, 0);
    const lengthInches = parsePositiveNumber(payload.lengthInches, 0);
    const requestedFamily = normalizeCommercialMaterialFamily(payload.material_name || payload.material_code || '');
    const labelsPerRoll = Math.max(1, parsePositiveNumber(
        payload.labelsPerRoll,
        parsePositiveNumber(generalConfig?.general?.quoteAutomaticLabelsPerRoll, 1000)
    ));
    const preferredProcess = quantity > 0 && quantity <= threshold ? 'digital' : 'convencional';
    const processOrder = preferredProcess === 'digital' ? ['digital', 'convencional'] : ['convencional', 'digital'];
    const attempts = [];
    const dieOptional = isShapeDieOptional(requestedShape);

    for (const processType of processOrder) {
        const die = selectBestDie({
            dies: catalogs.dies,
            requestedShape,
            widthInches,
            lengthInches,
            processType
        });
        const comboSelection = selectBestProductionCombo({
            materials: catalogs.materials,
            machines: catalogs.machines,
            requestedFamily,
            processType,
            widthInches,
            lengthInches,
            quantity,
            labelsPerRoll,
            die
        });
        const selectedCombo = comboSelection.best;
        const material = selectedCombo?.material || null;
        const machine = selectedCombo?.machine || null;
        const mounting = selectedCombo?.layout || null;
        const warnings = [];
        attempts.push({
            processType,
            die,
            material,
            machine,
            mounting,
            warnings,
            labelsPerRoll,
            ok: Boolean(material && machine && mounting && (die || dieOptional || processType === 'digital'))
        });
    }

    const selected = attempts.find((item) => item.ok) || attempts[0];
    return {
        selectedProcessType: selected.processType,
        digitalThreshold: threshold,
        requestedFamily,
        selectedDie: selected.die,
        selectedMaterial: selected.material,
        selectedMachine: selected.machine,
        selectedMounting: selected.mounting,
        labelsPerRoll,
        warnings: [],
        automaticComment: buildAutomaticRouteComment({
            selectedProcessType: selected.processType,
            threshold,
            quantity,
            die: selected.die,
            material: selected.material,
            machine: selected.machine,
            mounting: selected.mounting
        }),
        fallbackApplied: selected.processType !== preferredProcess,
        attempts
    };
}

function inferSmartQuoteTintCount(rawData = {}, processType = 'Convencional') {
    const explicit = parseLegacyNumber(rawData['CANTIDAD TINTAS']);
    if (explicit && explicit > 0) return explicit;
    const usesCmyk = String(rawData.CMYK ?? rawData['GENERAL | CMYK'] ?? 'Si').trim().toLowerCase() !== 'false';
    const pantones = parseLegacyNumber(rawData['CANTIDAD PANTONES']) || 0;
    const numberingExtra = hasDeclaredProcessDetail(rawData['REQ | Numeracion']) ? 1 : 0;
    if (String(processType || '').toLowerCase().includes('digit')) {
        return Math.max(4, (usesCmyk ? 4 : 0) + numberingExtra);
    }
    return Math.max(1, (usesCmyk ? 4 : 0) + pantones + numberingExtra);
}

function computeSmartQuoteMaterialCost({ material = null, mounting = null, widthInches = 0, lengthInches = 0, quantity = 0 }) {
    if (mounting?.materialCost > 0) return Number(mounting.materialCost || 0);
    if (!material || widthInches <= 0 || lengthInches <= 0 || quantity <= 0) return 0;
    const horizontalGap = 0.125;
    const verticalGap = 0.125;
    const columns = Math.max(1, parsePositiveNumber(mounting?.columns, 1));
    const rowsNeeded = Math.max(1, Math.ceil(quantity / columns));
    const linearInches = rowsNeeded * Math.max(0.01, lengthInches + verticalGap);
    const materialWidth = parsePositiveNumber(material.widthInches, widthInches);
    const msiBase = (materialWidth * linearInches) / 1000;
    const wasteFactor = Math.max(1, parsePositiveNumber(mounting?.wasteFactor, parsePositiveNumber(material.mermaPct, 0) > 0 ? 1 + (parsePositiveNumber(material.mermaPct, 0) / 100) : 1.1));
    const msiWithWaste = msiBase * wasteFactor;
    const areaM2 = ((materialWidth * 0.0254) * (linearInches * 0.0254)) * wasteFactor;
    const costPerMsi = parsePositiveNumber(material.costPerMsiUsd, 0);
    const costPerM2 = parsePositiveNumber(material.costPerSquareMeterUsd, 0);
    if (costPerMsi > 0) return msiWithWaste * costPerMsi;
    if (costPerM2 > 0) return areaM2 * costPerM2;
    return 0;
}

function findCostProcessDefault(costsConfig = {}, processKey = '') {
    const rows = Array.isArray(costsConfig?.general?.processDefaults) ? costsConfig.general.processDefaults : [];
    return rows.find((item) => String(item?.key || '').trim().toLowerCase() === String(processKey || '').trim().toLowerCase()) || null;
}

async function estimateAutomaticQuotePricing({
    rawData = {},
    processType = 'Convencional',
    quantity = 0,
    selectedMachine = null,
    selectedMaterial = null,
    selectedDie = null,
    selectedMounting = null,
    costsConfig = {},
    exchangeRate = 1
} = {}) {
    const processMapData = await loadPlanningReferenceMaps();
    const profileById = new Map();
    for (const profiles of processMapData.profileMap.values()) {
        for (const profile of profiles) {
            if (profile?.id) profileById.set(profile.id, profile);
        }
    }
    const planningSnapshot = buildPlanningSnapshot({
        line_summary: {
            process_type: processType,
            machine_name: selectedMachine?.machineName || '',
            die_code: selectedDie?.code || '',
            material_name: selectedMaterial?.name || ''
        },
        line_snapshot: {
            quotedMachine: selectedMachine?.machineName || '',
            materialCode: selectedMaterial?.code || '',
            materialName: selectedMaterial?.name || '',
            dieCode: selectedDie?.code || '',
            tintCount: inferSmartQuoteTintCount(rawData, processType),
            materialFeet: Number(selectedMounting?.linearFeet || 0),
            raw_data: rawData
        },
        totals: {
            quantity: Number(quantity || 0)
        }
    }, processMapData.processMap, processMapData.profileMap);

    const stageBreakdown = (planningSnapshot.processes || []).map((stage) => {
        const profile = profileById.get(stage.machineProfileId) || null;
        const defaultRow = findCostProcessDefault(costsConfig, stage.processKey);
        const baseCost = stage.durationHours * (
            Number(profile?.hourly_machine_cost || 0)
            + Number(profile?.hourly_operator_cost || 0)
        );
        const minimumCost = Number(defaultRow?.minimumCost || 0);
        const totalCost = Math.max(baseCost, minimumCost);
        return {
            processKey: stage.processKey,
            processName: stage.processName,
            machineName: stage.machineName || '',
            durationHours: Number(stage.durationHours || 0),
            totalCost: roundCurrency(totalCost)
        };
    });

    const materialCost = roundCurrency(computeSmartQuoteMaterialCost({
        material: selectedMaterial,
        mounting: selectedMounting,
        widthInches: parseLegacyNumber(rawData['DIMENSIONES ETIQUETA | ANCHO']) || 0,
        lengthInches: parseLegacyNumber(rawData['DIMENSIONES ETIQUETA | LARGO']) || 0,
        quantity
    }));
    const productionCost = roundCurrency(stageBreakdown.reduce((sum, stage) => sum + Number(stage.totalCost || 0), 0));
    const baseCost = roundCurrency(materialCost + productionCost);
    const processTypeNormalized = String(processType || '').toLowerCase();
    const subtotalBeforeTax = roundCurrency(baseCost * (1 + 0.03) * (1 + 0.02) * (
        1
        + (processTypeNormalized.includes('digit') ? 0.22 : 0.28)
        + 0.03
        + (processTypeNormalized.includes('digit') ? 0.08 : 0.10)
    ));
    const taxPercent = 12;
    const taxAmount = roundCurrency(subtotalBeforeTax * (taxPercent / 100));
    const totalAmount = roundCurrency(subtotalBeforeTax + taxAmount);
    const unitPrice = quantity > 0 ? roundCurrency(subtotalBeforeTax / quantity) : 0;
    const unitPriceWithTax = quantity > 0 ? roundCurrency(totalAmount / quantity) : 0;
    const safeExchangeRate = Number(exchangeRate || 1) || 1;
    return {
        materialCost,
        productionCost,
        baseCost,
        subtotalBeforeTax,
        taxPercent,
        taxAmount,
        totalAmount,
        unitPrice,
        unitPriceWithTax,
        exchangeRate: safeExchangeRate,
        processBreakdown: stageBreakdown,
        planningSnapshot
    };
}

const DEFAULT_PRESENTATIONS = {};
Object.keys(PRESENTATION_NAMES).forEach(key => {
    DEFAULT_PRESENTATIONS[key] = createDefaultPresentation(PRESENTATION_NAMES[key]);
});

const EMPTY_PRESENTATIONS = {};
Object.keys(PRESENTATION_NAMES).forEach(key => {
    EMPTY_PRESENTATIONS[key] = {};
});

const DEFAULT_GENERAL_CONFIG = {
    branding: {
        companyName: 'PrintLab',
        logoUrl: '',
        companyLogoUrl: '',
        loginBackgroundUrl: ''
    },
    contact: {
        companyPhone: '+506 0000 0000',
        companyEmail: 'info@printlab.local'
    },
    appearance: {
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    },
    session: {
        currentUser: 'admin'
    },
    icons: {
        topBack: '\u2190',
        topMenu: '\u2261',
        topSearch: '\u2315',
        topUser: '\u25D1',
        dashboardBusinessPartners: '\u25A6',
        dashboardProducts: '\u25A7',
        dashboardQuotes: '\u25A4',
        dashboardNotifications: '\u2709',
        notificationChatTitle: '\u2709',
        notificationChatOpenCenter: '\u25F1',
        notificationChatAttach: '📎',
        notificationChatSend: '\u27A4',
        dashboardInventory: '\u25A5',
        dashboardOrders: '\u2699',
        dashboardProduction: '\u{1F3ED}',
        dashboardCosts: '\u25A7',
        dashboardReports: '/assets/bootstrap/icons-dashboardReports.svg',
        dashboardSettings: '\u2692',
        mobileQuotes: '\u25A4',
        mobileOrders: '\u2699',
        mobilePartners: '\u25A6',
        mobileAlerts: '\u25CE',
        mobileTheme: '\u263C',
        mobileRefresh: '\u21BB',
        mobileMenu: '\u22EF',
        dashboardTabClose: '\u2715',
        quotePrev: '\u2039',
        quoteLookup: '\u2315',
        quoteNext: '\u203A',
        quoteNumberBoldOn: 'B',
        quoteNumberBoldOff: 'b',
        popoverClose: '\u2715',
        tableMove: '\u22EE\u22EE',
        tableOpen: '\u2699',
        tableEdit: '/assets/bootstrap/icons-tableEdit.svg',
        tableAdd: '+',
        quantityAdd: '+',
        quantity: {
            add: '+',
            delete: '\u{1F5D1}'
        },
        quantityDelete: '\u{1F5D1}',
        fieldInfo: 'i',
        formulaInfo: 'i',
        processLauncher: '\u25CE',
        favoriteDocumentOff: '\u2606',
        favoriteDocumentOn: '\u2605',
        refreshCosts: '\u21BB',
        timelineLauncher: '\u25F4',
        floatingSave: '/assets/bootstrap/icons-floatingSave.svg',
        tableActions: '\u22EF',
        lineMenu: '\u22EF',
        lineEdit: '✏️',
        lineDuplicate: '\u2398',
        lineCopy: '\u2398',
        lineCreateProduct: '\u25A3',
        lineCreateQuote: '\u25A3',
        lineFrontBack: '/assets/bootstrap/icons-lineFrontBack.svg',
        lineTracking: '/assets/bootstrap/icons-lineTracking.svg',
        lineExport: '\u2B73',
        lineAttachments: '📎',
        lineCreateOrder: '\u2692',
        lineDelete: '\u2715',
        lineProforma: '\u{1F441}',
        lineAdd: '+',
        copyQuoteSend: '\u27A4',
        attachmentUpload: '\u21E7',
        attachmentDownload: '\u21E9',
        attachmentReplace: '\u21BB',
        adminUserCreate: '+',
        adminUserDelete: '\u{1F5D1}',
        adminPermissionCreate: '+',
        adminPermissionDelete: '\u{1F5D1}',
        loginRepositoryUpload: '\u21E7',
        loginRepositoryDelete: '\u{1F5D1}',
        dashboardPlanning: '\u25F3',
        browserOpen: '\u2197',
        lineCreateProductionOrder: '\u21E2',
        quoteRequestSubmit: '\u27A4',
        quoteRequestAdvanced: '\u2699',
        quoteRequestAttachment: '\uD83D\uDCCE',
        quoteRequestRecord: '\uD83C\uDFA4',
        quoteRequestRecordStop: '\u25A0',
        orderNumbering: '#',
        orderStatus: '\u25C9',
        orderFlow: '\u226B',
        orderArtworkDelete: '\u00D7',
        proformaCurrencyAdd: '+',
        proformaCurrencyDelete: '\u{1F5D1}',
        proformaView: '\u{1F441}',
        proformaClose: '\u2713'
    },
    layout: {
        logoWidth: 60,
        companyLogoWidth: 60,
        headerLabelWidth: 58,
        quoteNumberFontSize: 16,
        tableRowHeight: 22,
        tableHeaderFontSize: 11,
        tableFontSize: 12,
        tabWidth: 88,
        tabHeight: 18,
        tabColor: '#7f7f7f',
        iconSize: 20,
        pageMarginTop: 14,
        pageMarginRight: 16,
        pageMarginBottom: 8,
        pageMarginLeft: 16,
        headerBgStart: '#0b81b8',
        headerBgEnd: '#17abdf'
    },
    general: {
        companyName: 'PrintLab',
        companyPhone: '+506 0000 0000',
        companyEmail: 'info@printlab.local',
        loginScreensaverMotionSeconds: 16,
        loginScreensaverSlideSeconds: 10,
        maxUploadMb: 10,
        mobileSellerAutoRoute: 'true',
        mobileSellerTheme: 'light',
        mobileSellerLightBg: '#f5f7fb',
        mobileSellerDarkBg: '#0f172a',
        defaultRollWidth: 13,
        defaultCoreDiameter: 3,
        defaultQuantityTypes: 1,
        quoteProductTypesJson: JSON.stringify([
            'Etiquetas',
            'Cinta Continua',
            'Empaque Flexible',
            'Código de Barras',
            'Números de Carrera'
        ]),
        quoteApplicationOptionsJson: JSON.stringify([
            'Botella',
            'Caja',
            'Carton',
            'Envase',
            'Frasco',
            'Pouch',
            'Tapa',
            'Vidrio'
        ]),
        quoteSurfaceOptionsJson: JSON.stringify([
            'Lisa',
            'Rugosa',
            'Porosa',
            'Húmeda'
        ]),
        deliverySampleModesJson: JSON.stringify([
            'Vendedor / Cliente',
            'Vendedor',
            'Cliente',
            'Agencia',
            'Agencia / Cliente',
            'No necesita'
        ]),
        deliveryApprovalRecipientsJson: JSON.stringify([
            'Cliente',
            'Vendedor',
            'Email',
            'No necesita'
        ]),
        deliveryMethodsJson: JSON.stringify([
            'Tráfico',
            'Servicio de entregas - Dirección cliente',
            'Servicio de entregas - Dirección opcional',
            'Enviar al vendedor',
            'Cliente recoge',
            'Exportación'
        ]),
        quoteAutomaticDigitalMaxQuantity: 100000,
        quoteAutomaticLabelsPerRoll: 1000,
        inventorySourceMode: 'local',
        inventoryImportedClassificationField: 'ItemsGroupCode',
        defaultCmykEnabled: 'true',
        proformaLogoUrl: '',
        proformaCompanyName: 'PrintLab',
        proformaSlogan: '',
        proformaHeaderColor: '#203852',
        proformaCompanyNameColor: '#ffffff',
        proformaCompanyFontFamily: 'Cormorant Garamond',
        proformaCompanyFontLabel: 'Fuente Proforma',
        proformaCompanyFontUrl: '',
        proformaShowCompanyName: 'true',
        proformaLogoWidth: 120,
        proformaLogoHeight: 74,
        proformaLogoAspectLocked: 'true',
        proformaLogoMarginTop: 0,
        proformaLogoMarginLeft: 0,
        proformaPhone: '+506 0000 0000',
        proformaWebsite: 'www.printlab.local',
        proformaEmail: 'info@printlab.local',
        proformaDefaultCurrency: 'USD',
        proformaCurrenciesJson: JSON.stringify([
            { code: 'CRC', label: 'Colones', symbol: '₡', exchangeRate: 1 },
            { code: 'USD', label: 'Dólares', symbol: '$', exchangeRate: 0.0019 }
        ]),
        proformaDefaultValidity: '30 días',
        proformaValidityOptionsJson: JSON.stringify([
            '5 días',
            '8 días',
            '15 días',
            '22 días',
            '30 días',
            'De acuerdo a programación con el cliente',
            'Según lo establecido en el cartel de compra.'
        ]),
        proformaIntro: '',
        proformaIntroFontFamily: 'inherit',
        proformaIntroFontSize: 15,
        proformaIntroColor: '#2f3c46',
        proformaTermsConditions: '',
        iconColorOrderNumbering: '#1e516d',
        iconColorHoverOrderNumbering: '#0b81b8',
        iconSizeOrderNumbering: '40',
        iconColorOrderStatus: '#1e516d',
        iconColorHoverOrderStatus: '#0b81b8',
        iconSizeOrderStatus: '40',
        iconColorOrderFlow: '#1e516d',
        iconColorHoverOrderFlow: '#0b81b8',
        iconSizeOrderFlow: '40',
        iconColorOrderArtworkDelete: '#b94848',
        iconColorHoverOrderArtworkDelete: '#8f2f2f',
        iconSizeOrderArtworkDelete: '40',
        proformaPaymentTerms: '',
        proformaDeliveryTime: '',
        proformaTechnicalSpecs: '',
        proformaQualityPolicies: '',
        proformaPriceDisplayMode: 'both',
        proformaSellerSignatureEnabled: 'true',
        dieShapeLabel1: 'Circular',
        dieShapeLabel2: 'Cuadrado',
        dieShapeLabel3: 'Rectangular',
        dieShapeLabel4: 'Ovalado',
        dieShapeLabel5: 'Especial',
        dieShapeLabel6: 'Butt Cut',
        dieShapeImage1: '',
        dieShapeImage2: '',
        dieShapeImage3: '',
        dieShapeImage4: '',
        dieShapeImage5: '',
        dieShapeImage6: '/assets/die-shapes/butt-cut.png',
        partnerCodePrefix: 'CL',
        quoteCodePrefix: 'C-',
        quoteLineCodePrefix: 'LC',
        productCodePrefix: 'P-',
        orderCodePrefix: 'OP-',
        plateInventoryCodePrefix: 'PL-',
        brandFontFamily: 'Georgia, Times New Roman, serif',
        brandFontSize: 22,
        brandWidth: 116,
        brandColor: '#0b81b8',
        brandVerticalAlign: 'center',
        brandHorizontalAlign: 'left',
        brandLogoPosition: 'left',
        logoWidth: 116,
        moduleTitle: 'PrintLab',
        titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        titleFontSize: 16,
        titleWidth: 0,
        titleColor: '#252c33',
        titleVerticalAlign: 'center',
        titleHorizontalAlign: 'left',
        quoteNumberFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        quoteNumberFontSize: 16,
        quoteNumberWidth: 0,
        quoteNumberAutoWidth: 'true',
        quoteNumberBold: 'false',
        quoteNumberVerticalAlign: 'center',
        quoteNumberHorizontalAlign: 'right',
        quoteNumberPaddingTop: 0,
        quoteNumberPaddingRight: 14,
        quoteNumberPaddingBottom: 0,
        quoteNumberPaddingLeft: 14,
        headerBgStart: '#0b81b8',
        headerBgEnd: '#17abdf',
        footerBorderColor: '#11a3dd',
        footerFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        footerFontSize: 12,
        footerColor: '#2f3740',
        footerMarginTop: 0,
        footerMarginBottom: 0,
        fieldFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        fieldHeight: 18,
        fieldFontSize: 12,
        tableHeaderFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        tableHeaderFontSize: 11,
        tabHeight: 18,
        tabWidth: 88,
        tabColor: '#7f7f7f',
        tableRowHeight: 22,
        iconSize: 20,
        iconColor: '#9ba2ab',
        iconColorTopBack: '#9ba2ab',
        iconColor2TopBack: '#ffffff',
        iconColorHoverTopBack: '#0b81b8',
        iconColorTopMenu: '#9ba2ab',
        iconColor2TopMenu: '#ffffff',
        iconColorHoverTopMenu: '#0b81b8',
        iconColorTopSearch: '#9ba2ab',
        iconColor2TopSearch: '#ffffff',
        iconColorHoverTopSearch: '#0b81b8',
        iconColorTopUser: '#9ba2ab',
        iconColor2TopUser: '#ffffff',
        iconColorHoverTopUser: '#0b81b8',
        iconColorDashboardBusinessPartners: '#0b81b8',
        iconColor2DashboardBusinessPartners: '#ffffff',
        iconColorHoverDashboardBusinessPartners: '#17abdf',
        iconColorDashboardProducts: '#0b81b8',
        iconColor2DashboardProducts: '#ffffff',
        iconColorHoverDashboardProducts: '#17abdf',
        iconColorDashboardQuotes: '#0b81b8',
        iconColor2DashboardQuotes: '#ffffff',
        iconColorHoverDashboardQuotes: '#17abdf',
        iconColorDashboardNotifications: '#0b81b8',
        iconColor2DashboardNotifications: '#ffffff',
        iconColorHoverDashboardNotifications: '#17abdf',
        iconColorDashboardInventory: '#0b81b8',
        iconColor2DashboardInventory: '#ffffff',
        iconColorHoverDashboardInventory: '#17abdf',
        iconColorDashboardOrders: '#0b81b8',
        iconColor2DashboardOrders: '#ffffff',
        iconColorHoverDashboardOrders: '#17abdf',
        iconColorDashboardProduction: '#0b81b8',
        iconColor2DashboardProduction: '#ffffff',
        iconColorHoverDashboardProduction: '#17abdf',
        iconColorDashboardCosts: '#0b81b8',
        iconColor2DashboardCosts: '#ffffff',
        iconColorHoverDashboardCosts: '#17abdf',
        iconColorDashboardSettings: '#0b81b8',
        iconColor2DashboardSettings: '#ffffff',
        iconColorHoverDashboardSettings: '#17abdf',
        iconColorDashboardTabClose: '#8c97a2',
        iconColor2DashboardTabClose: '#ffffff',
        iconColorHoverDashboardTabClose: '#0b81b8',
        iconColorQuotePrev: '#9ba2ab',
        iconColor2QuotePrev: '#ffffff',
        iconColorHoverQuotePrev: '#0b81b8',
        iconColorQuoteLookup: '#9ba2ab',
        iconColor2QuoteLookup: '#ffffff',
        iconColorHoverQuoteLookup: '#0b81b8',
        iconColorQuoteNext: '#9ba2ab',
        iconColor2QuoteNext: '#ffffff',
        iconColorHoverQuoteNext: '#0b81b8',
        iconColorQuoteNumberBoldOn: '#0b81b8',
        iconColor2QuoteNumberBoldOn: '#ffffff',
        iconColorHoverQuoteNumberBoldOn: '#07638c',
        iconColorQuoteNumberBoldOff: '#8c97a2',
        iconColor2QuoteNumberBoldOff: '#ffffff',
        iconColorHoverQuoteNumberBoldOff: '#0b81b8',
        iconColorPopoverClose: '#6b7580',
        iconColor2PopoverClose: '#ffffff',
        iconColorHoverPopoverClose: '#0b81b8',
        iconColorTableMove: '#9ba2ab',
        iconColor2TableMove: '#ffffff',
        iconColorHoverTableMove: '#0b81b8',
        iconColorTableOpen: '#9ba2ab',
        iconColor2TableOpen: '#ffffff',
        iconColorHoverTableOpen: '#0b81b8',
        iconColorTableAdd: '#9ba2ab',
        iconColor2TableAdd: '#ffffff',
        iconColorHoverTableAdd: '#0b81b8',
        iconColorQuantityAdd: '#738196',
        iconColor2QuantityAdd: '#ffffff',
        iconColorHoverQuantityAdd: '#0b81b8',
        iconColorQuantityDelete: '#b94848',
        iconColor2QuantityDelete: '#ffffff',
        iconColorHoverQuantityDelete: '#d03535',
        iconColorFieldInfo: '#4f6f8f',
        iconColor2FieldInfo: '#ffffff',
        iconColorHoverFieldInfo: '#0b81b8',
        iconColorFormulaInfo: '#4f6f8f',
        iconColor2FormulaInfo: '#ffffff',
        iconColorHoverFormulaInfo: '#0b81b8',
        iconColorProcessLauncher: '#0b81b8',
        iconColor2ProcessLauncher: '#ffffff',
        iconColorHoverProcessLauncher: '#07638c',
        iconColorFavoriteDocumentOff: '#a2aab5',
        iconColor2FavoriteDocumentOff: '#ffffff',
        iconColorHoverFavoriteDocumentOff: '#c79b18',
        iconColorFavoriteDocumentOn: '#c79b18',
        iconColor2FavoriteDocumentOn: '#ffffff',
        iconColorHoverFavoriteDocumentOn: '#9f7b12',
        iconColorRefreshCosts: '#5b7896',
        iconColor2RefreshCosts: '#ffffff',
        iconColorHoverRefreshCosts: '#0b81b8',
        iconColorTimelineLauncher: '#5f7392',
        iconColor2TimelineLauncher: '#ffffff',
        iconColorHoverTimelineLauncher: '#0b81b8',
        iconColorFloatingSave: '#ffffff',
        iconColor2FloatingSave: '#ffffff',
        iconColorHoverFloatingSave: '#ffffff',
        iconColorTableActions: '#9ba2ab',
        iconColor2TableActions: '#ffffff',
        iconColorHoverTableActions: '#0b81b8',
        iconColorLineMenu: '#607286',
        iconColor2LineMenu: '#ffffff',
        iconColorHoverLineMenu: '#0b81b8',
        iconColorLineDuplicate: '#46515d',
        iconColor2LineDuplicate: '#ffffff',
        iconColorHoverLineDuplicate: '#0b81b8',
        iconColorLineCopy: '#46515d',
        iconColor2LineCopy: '#ffffff',
        iconColorHoverLineCopy: '#0b81b8',
        iconColorLineCreateQuote: '#46515d',
        iconColor2LineCreateQuote: '#ffffff',
        iconColorHoverLineCreateQuote: '#0b81b8',
        iconColorLineCreateProduct: '#46515d',
        iconColor2LineCreateProduct: '#ffffff',
        iconColorHoverLineCreateProduct: '#0b81b8',
        iconColorLineFrontBack: '#46515d',
        iconColor2LineFrontBack: '#ffffff',
        iconColorHoverLineFrontBack: '#0b81b8',
        iconColorLineTracking: '#46515d',
        iconColor2LineTracking: '#ffffff',
        iconColorHoverLineTracking: '#0b81b8',
        iconColorLineExport: '#46515d',
        iconColor2LineExport: '#ffffff',
        iconColorHoverLineExport: '#0b81b8',
        iconColorLineAttachments: '#46515d',
        iconColor2LineAttachments: '#ffffff',
        iconColorHoverLineAttachments: '#0b81b8',
        iconColorLineCreateOrder: '#46515d',
        iconColor2LineCreateOrder: '#ffffff',
        iconColorHoverLineCreateOrder: '#0b81b8',
        iconColorLineDelete: '#a74343',
        iconColor2LineDelete: '#ffffff',
        iconColorHoverLineDelete: '#d03535',
        iconColorLineProforma: '#1e516d',
        iconColor2LineProforma: '#ffffff',
        iconColorHoverLineProforma: '#0b81b8',
        iconColorLineAdd: '#1e516d',
        iconColor2LineAdd: '#ffffff',
        iconColorHoverLineAdd: '#0b81b8',
        iconColorCopyQuoteSend: '#0b81b8',
        iconColor2CopyQuoteSend: '#ffffff',
        iconColorHoverCopyQuoteSend: '#07638c',
        iconColorAttachmentUpload: '#0b81b8',
        iconColor2AttachmentUpload: '#ffffff',
        iconColorHoverAttachmentUpload: '#07638c',
        iconColorAttachmentDownload: '#0b81b8',
        iconColor2AttachmentDownload: '#ffffff',
        iconColorHoverAttachmentDownload: '#07638c',
        iconColorAttachmentReplace: '#0b81b8',
        iconColor2AttachmentReplace: '#ffffff',
        iconColorHoverAttachmentReplace: '#07638c',
        iconColorDashboardPlanning: '#0b81b8',
        iconColor2DashboardPlanning: '#ffffff',
        iconColorHoverDashboardPlanning: '#17abdf',
        iconColorBrowserOpen: '#0b81b8',
        iconColor2BrowserOpen: '#ffffff',
        iconColorHoverBrowserOpen: '#07638c',
        iconColorLineCreateProductionOrder: '#0b81b8',
        iconColor2LineCreateProductionOrder: '#ffffff',
        iconColorHoverLineCreateProductionOrder: '#07638c',
        iconColorQuoteRequestSubmit: '#ffffff',
        iconColor2QuoteRequestSubmit: '#ffffff',
        iconColorHoverQuoteRequestSubmit: '#ffffff',
        iconColorQuoteRequestAdvanced: '#5f7288',
        iconColor2QuoteRequestAdvanced: '#ffffff',
        iconColorHoverQuoteRequestAdvanced: '#4a5a6d',
        iconColorQuoteRequestAttachment: '#1e516d',
        iconColor2QuoteRequestAttachment: '#ffffff',
        iconColorHoverQuoteRequestAttachment: '#153a4d',
        iconColorQuoteRequestRecord: '#1e516d',
        iconColor2QuoteRequestRecord: '#ffffff',
        iconColorHoverQuoteRequestRecord: '#153a4d',
        iconColorQuoteRequestRecordStop: '#1e516d',
        iconColor2QuoteRequestRecordStop: '#ffffff',
        iconColorHoverQuoteRequestRecordStop: '#153a4d',
        iconBgTopMenu: '',
        iconBgTopSearch: '',
        iconBgTopUser: '',
        iconBgTopBack: '',
        iconBgQuotePrev: '',
        iconBgQuoteLookup: '',
        iconBgQuoteNext: '',
        iconBgPopoverClose: '',
        iconBgTableMove: '',
        iconBgTableOpen: '',
        iconBgTableAdd: '',
        iconSizeTopBack: 20,
        iconSizeTopMenu: 20,
        iconSizeTopSearch: 20,
        iconSizeTopUser: 20,
        iconSizeDashboardBusinessPartners: 38,
        iconSizeDashboardProducts: 38,
        iconSizeDashboardQuotes: 38,
        iconSizeDashboardNotifications: 38,
        iconSizeDashboardInventory: 38,
        iconSizeDashboardOrders: 38,
        iconSizeDashboardProduction: 38,
        iconSizeDashboardCosts: 38,
        iconSizeDashboardSettings: 38,
        iconSizeDashboardTabClose: 14,
        iconSizeQuotePrev: 18,
        iconSizeQuoteLookup: 18,
        iconSizeQuoteNext: 18,
        iconSizeQuoteNumberBoldOn: 16,
        iconSizeQuoteNumberBoldOff: 16,
        iconSizePopoverClose: 18,
        iconSizeTableMove: 20,
        iconSizeTableOpen: 20,
        iconSizeTableAdd: 20,
        iconSizeQuantityAdd: 20,
        iconSizeQuantityDelete: 18,
        iconSizeFieldInfo: 12,
        iconSizeFormulaInfo: 13,
        iconSizeProcessLauncher: 24,
        iconSizeFavoriteDocumentOff: 20,
        iconSizeFavoriteDocumentOn: 20,
        iconSizeRefreshCosts: 20,
        iconSizeTimelineLauncher: 20,
        iconSizeFloatingSave: 20,
        iconSizeTableActions: 20,
        iconSizeLineMenu: 18,
        iconSizeLineDuplicate: 18,
        iconSizeLineCopy: 18,
        iconSizeLineCreateProduct: 18,
        iconSizeLineCreateQuote: 18,
        iconSizeLineExport: 18,
        iconSizeLineAttachments: 18,
        iconSizeLineCreateOrder: 18,
        iconSizeLineDelete: 18,
        iconSizeLineProforma: 16,
        iconSizeLineAdd: 18,
        iconSizeCopyQuoteSend: 16,
        iconSizeAttachmentUpload: 18,
        iconSizeAttachmentDownload: 18,
        iconSizeAttachmentReplace: 18,
        iconSizeDashboardPlanning: 38,
        iconSizeBrowserOpen: 18,
        iconSizeLineCreateProductionOrder: 18,
        iconSizeQuoteRequestSubmit: 18,
        iconSizeQuoteRequestAdvanced: 18,
        iconSizeQuoteRequestAttachment: 18,
        iconSizeQuoteRequestRecord: 18,
        iconSizeQuoteRequestRecordStop: 18,
        pageMarginTop: 14,
        pageMarginBottom: 8,
        pageMarginRight: 16,
        pageMarginLeft: 16,
        bdfgTheme: 'executive',
        bdfgColorMode: 'auto',
        bdfgMainSize: 86,
        bdfgMenuDistance: 108,
        bdfgMiniShape: 'round',
        bdfgLayout: 'radial',
        bdfgMainDay: '#cbd5e1',
        bdfgMainNight: '#334155',
        bdfgMiniBg: '#ffffff',
        bdfgMiniBgAlpha: 100,
        bdfgMiniBgNight: '#ffffff',
        bdfgMiniBgNightAlpha: 100,
        bdfgMiniColor: '#1f2937'
    },
    presentations: EMPTY_PRESENTATIONS
};

const SHELL_ICON_ASSET_KEYS = new Set(Object.keys(DEFAULT_GENERAL_CONFIG.icons || {}));

const DEFAULT_COSTS_CONFIG = {
    general: {
        notes: '',
        updatedAt: null,
        defaultRollWidth: 13,
        defaultCoreDiameter: 3,
        coreDiameterOptions: ['1', '1.5', '3', '6'],
        defaultQuantityTypes: 1,
        defaultCmykEnabled: 'true',
        processDefaults: [
            { key: 'macula', label: 'Merma', active: true, createEnabled: true, locked: true, repeatable: false, order: 5, minimumCost: 0 },
            { key: 'troquel', label: 'Troquel', active: true, createEnabled: false, locked: true, repeatable: false, order: 10, minimumCost: 0 },
            { key: 'sustrato', label: 'Sustrato', active: true, createEnabled: false, locked: true, repeatable: false, order: 20, minimumCost: 0 },
            { key: 'diseno', label: 'Diseño', active: false, createEnabled: true, locked: false, repeatable: false, order: 30, minimumCost: 0 },
            { key: 'preprensa', label: 'Preprensa', active: true, createEnabled: true, locked: true, repeatable: false, order: 40, minimumCost: 0 },
            { key: 'planchas', label: 'Planchas', active: false, createEnabled: false, locked: false, repeatable: false, order: 50, minimumCost: 0 },
            { key: 'impresion', label: 'Impresión', active: false, createEnabled: true, locked: false, repeatable: false, order: 60, minimumCost: 0 },
            { key: 'barnizado', label: 'Barnizado', active: false, createEnabled: true, locked: false, repeatable: false, order: 69, minimumCost: 0 },
            { key: 'laminado', label: 'Laminado', active: false, createEnabled: true, locked: false, repeatable: false, order: 70, minimumCost: 0 },
            { key: 'estampado', label: 'Estampado', active: false, createEnabled: true, locked: false, repeatable: false, order: 71, minimumCost: 0 },
            { key: 'embosado', label: 'Embosado', active: false, createEnabled: true, locked: false, repeatable: false, order: 72, minimumCost: 0 },
            { key: 'troquelado', label: 'Troquelado', active: false, createEnabled: false, locked: false, repeatable: false, order: 73, minimumCost: 0 },
            { key: 'rebobinado', label: 'Rebobinado', active: false, createEnabled: true, locked: false, repeatable: false, order: 74, minimumCost: 0 },
            { key: 'empaque', label: 'Empaque', active: false, createEnabled: true, locked: false, repeatable: false, order: 80, minimumCost: 0 },
            { key: 'adicionales', label: 'Procesos adicionales', active: false, createEnabled: false, locked: false, repeatable: false, order: 90, minimumCost: 0 }
        ]
    },
    convencional: {
        tintaGeneral: {
            bcmGenerico: 2,
            coberturaTintaPct: 30,
            coberturaDisenoPct: 60,
            densidadUv: 1.5,
            costoLbCmyk: 25,
            costoLbBlanco: 30,
            costoLbPantone: 35,
            depositos: [
                { id: 'conv-deposito-blancos', tipo: 'Fondos Sólidos / Blancos', bcm: 7, coveragePct: 100, gsm: 2.5 },
                { id: 'conv-deposito-textos', tipo: 'Textos y Líneas Gruesas', bcm: 4, coveragePct: 10, gsm: 1.2 },
                { id: 'conv-deposito-cmyk', tipo: 'Policromía (CMYK)', bcm: 2, coveragePct: 25, gsm: 1 },
                { id: 'conv-deposito-barniz', tipo: 'Barniz UV', bcm: 7, coveragePct: 100, gsm: 3 }
            ]
        },
        inlineFinishSetup: [
            { id: 'conv-inline-impresion', proceso: 'Impresion', minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: 'conv-inline-troquelado', proceso: 'Troquelado', minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: 'conv-inline-laminado', proceso: 'Laminado', minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: 'conv-inline-barniz', proceso: 'Barniz', minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: 'conv-inline-embosado', proceso: 'Embosado', minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: 'conv-inline-estampado', proceso: 'Estampado', minutosPorEstacion: 5, setupWasteFeet: 0 },
            { id: 'conv-inline-numerado', proceso: 'Numerado', minutosPorEstacion: 5, setupWasteFeet: 0 }
        ],
        maculaMontaje: [
            { id: 'conv-montaje-impresion', detalle: 'Impresion', porEstacion: 65, cantidadTintas: 4, totalPies: 260 },
            { id: 'conv-montaje-troquelado', detalle: 'Troquelado', porEstacion: 90, cantidadTintas: 4, totalPies: 90 },
            { id: 'conv-montaje-laminado', detalle: 'Laminado', porEstacion: 65, cantidadTintas: 4, totalPies: 65 },
            { id: 'conv-montaje-barniz', detalle: 'Barniz', porEstacion: 30, cantidadTintas: 4, totalPies: 30 },
            { id: 'conv-montaje-embosado', detalle: 'Embosado', porEstacion: 65, cantidadTintas: 4, totalPies: 65 }
        ],
        maculaTiraje: [
            { id: 'conv-tiraje-impresion', detalle: 'Impresion', porcentaje: 3 },
            { id: 'conv-tiraje-impresion-troquelado', detalle: 'Impresion + Troquelado', porcentaje: 4 },
            { id: 'conv-tiraje-impresion-troquelado-laminado', detalle: 'Impresion + Troquelado + Laminado', porcentaje: 7 },
            { id: 'conv-tiraje-impresion-troquelado-laminado-embosado', detalle: 'Impresion + Troquelado + Laminado + Embosado', porcentaje: 8 }
        ],
        finishWaste: [
            { id: 'conv-finish-barnizado', proceso: 'Barnizado', setupWasteFeet: 75, operationWastePct: 1.5 },
            { id: 'conv-finish-laminado', proceso: 'Laminado', setupWasteFeet: 100, operationWastePct: 2.0 },
            { id: 'conv-finish-troquelado', proceso: 'Troquelado', setupWasteFeet: 150, operationWastePct: 2.5 },
            { id: 'conv-finish-estampado', proceso: 'Estampado', setupWasteFeet: 250, operationWastePct: 4.0 },
            { id: 'conv-finish-embosado', proceso: 'Embosado', setupWasteFeet: 125, operationWastePct: 3.0 },
            { id: 'conv-finish-rebobinado', proceso: 'Rebobinado', setupWasteFeet: 30, operationWastePct: 0.5 }
        ]
    },
    digital: {
        premier: {
            formulaText: 'Costo Premier = ((Area m2 x Consumo g/m2) / 1000 x Costo kg) + Setup Premier + Mantenimiento In-line. Si el sustrato viene pretratado, Premier = 0.',
            explanation: 'El costo por metro del tratamiento offline no se define aqui como estandar general. Si la planta trata fuera de linea, ese costo operativo debe vivir en la maquina tratadora o ya venir absorbido por el sustrato pretratado.',
            comment: 'Costo kg provisional tomado como referencia interna de liquido tipo coating. Si Gerencia define el SKU exacto del Primer, debe reemplazarse aqui y en los sustratos que lo usen.',
            mode: 'offline',
            setupMin: 20,
            consumptionGm2: 0.65,
            costPerKg: 9.25,
            costPerM2: 0.006013,
            offlineCostPerMeter: 0,
            maintenanceCost: 14
        },
        tintaGeneral: {
            billingType: 'consumo',
            costPerKg: 0,
            whiteCostPerKg: 0,
            specialCostPerKg: 0,
            clickRate: 0,
            clickMode: 'por_estacion',
            coverageCmykPct: 30,
            coverageWhitePct: 100,
            cmykGm2: 1.5,
            whiteGm2: 4,
            wasteFactor: 1.1,
            specialWashCost: 18,
            formulaConsumptionText: 'Costo Tinta = ((Área Total x Cobertura x Gramaje) / 1000) x Factor Merma x Costo Kg.',
            formulaClickText: 'Costo Clics = Cantidad Impresiones x Estaciones Facturables x Tarifa Clic.',
            explanation: 'La máquina digital puede cobrar por consumo o por clic. Estos valores funcionan como respaldo general; si la máquina tiene datos propios, la cotización usa primero los de la máquina.',
            comment: 'Lavado especial provisional: referencia operativa para limpieza, purga o cambio de color especial. Debe sustituirse por el costo real de cada equipo si la planta lo define.',
            coverageProfiles: [
                { id: 'digital-simple', tipo: 'Simple / textos / logos', coveragePct: 15 },
                { id: 'digital-estandar', tipo: 'Estándar / imagen y texto', coveragePct: 30 },
                { id: 'digital-complejo', tipo: 'Complejo / fondo sólido', coveragePct: 90 },
                { id: 'digital-blanco', tipo: 'Blanco sobre transparente', coveragePct: 100 }
            ]
        },
        velocidad: {
            speedCmykMpm: 42,
            speedExtendedMpm: 26,
            comment: 'Velocidades generales de respaldo. Si la máquina digital tiene sus propios metros por minuto, la cotización toma primero esos valores.'
        },
        maculaMontaje: [],
        maculaTiraje: []
    }
};

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
    index: false,
    redirect: false,
    etag: true,
    lastModified: true,
    maxAge: ONE_DAY_MS,
    setHeaders: (res, filePath) => {
        const normalized = String(filePath || '').replace(/\\/g, '/').toLowerCase();
        if (normalized.match(/\.(html|js|css)$/)) {
            res.setHeader('Cache-Control', 'no-cache');
            return;
        }
        if (normalized.includes('/assets/bootstrap/icons/')) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
            return;
        }
        if (normalized.includes('/uploads/')) {
           res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        return;
      }
        if (normalized.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/)) {
          res.setHeader('Cache-Control', `public, max-age=${Math.floor(THIRTY_DAYS_MS / 1000)}, immutable`);
            return;
        }
        res.setHeader('Cache-Control', `public, max-age=${Math.floor(ONE_DAY_MS / 1000)}`);
    }
}));
if (fs.existsSync(FLEXO_CALCULATOR_PUBLIC_DIR)) {
    app.use('/erp-impresion-assets', express.static(FLEXO_CALCULATOR_PUBLIC_DIR, {
        etag: true,
        lastModified: true,
        maxAge: ONE_DAY_MS,
        setHeaders: (res, filePath) => {
            const normalized = String(filePath || '').replace(/\\/g, '/').toLowerCase();
            if (normalized.match(/\.(html|js|css)$/)) {
                res.setHeader('Cache-Control', 'no-cache');
                return;
            }
            if (normalized.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/)) {
                res.setHeader('Cache-Control', `public, max-age=${Math.floor(THIRTY_DAYS_MS / 1000)}, immutable`);
                return;
            }
            res.setHeader('Cache-Control', `public, max-age=${Math.floor(ONE_DAY_MS / 1000)}`);
        }
    }));
}
ensureGeneralConfig();

async function runStartupSchemaStep(label, action) {
    try {
        await action();
    } catch (error) {
        console.error(`${label}:`, error.message);
    }
}

async function initializeStartupSchemas() {
    await runStartupSchemaStep('No fue posible preparar el esquema de inventarios', () => ensureInventorySchema());
    await runStartupSchemaStep('No fue posible preparar el esquema de productos', () => ensureProductCatalogSchema());
    await runStartupSchemaStep('No fue posible preparar el esquema de órdenes de producción', () => ensureProductionSchema());
    await runStartupSchemaStep('No fue posible preparar el esquema de adjuntos', () => ensureAttachmentsSchema());
    await runStartupSchemaStep('No fue posible preparar el esquema de notificaciones', () => ensureNotificationsSchema());
    await runStartupSchemaStep('No fue posible preparar el esquema de auditoría', () => ensureAuditSchema());
    await runStartupSchemaStep('No fue posible preparar el esquema de planificación', () => ensurePlanningSchema());
    await runStartupSchemaStep('No fue posible preparar el esquema de consumos SAP', () => ensureProductionMaterialConsumptionSchema());
    await runStartupSchemaStep('No fue posible preparar el esquema de SAP Service Layer', () => ensureSapSchema(pgQuery));
    await runStartupSchemaStep('No fue posible preparar el esquema de seguridad administrativa', async () => {
        await ensureAdminPermissionsSchema();
        await ensureAdminUsersSchema();
        await ensureQuoteProformasSchema();
        await ensureNotificationCenterSchema();
        await ensureNotificationAlertContactsSchema();
        await ensureInventoryClassificationMappingsSchema();
        await ensureSecuritySeed();
    });
}

initializeStartupSchemas().catch((error) => {
    console.error('No fue posible completar la inicialización de esquemas:', error.message);
});

let flexoEngineHelpersPromise = null;

function ensureFlexoEngineDbEnv() {
    if (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER) {
        return;
    }

    if (!process.env.DATABASE_URL) {
        return;
    }

    try {
        const parsed = new URL(process.env.DATABASE_URL);
        process.env.DB_HOST = process.env.DB_HOST || parsed.hostname;
        process.env.DB_PORT = process.env.DB_PORT || parsed.port || '5432';
        process.env.DB_NAME = process.env.DB_NAME || parsed.pathname.replace(/^\//, '');
        process.env.DB_USER = process.env.DB_USER || decodeURIComponent(parsed.username || '');
        process.env.DB_PASSWORD = process.env.DB_PASSWORD || decodeURIComponent(parsed.password || '');
    } catch (error) {
        // Si DATABASE_URL no es parseable, dejamos que el módulo integrado siga con su manejo propio.
    }
}

async function loadFlexoEngineHelpers() {
    if (!fs.existsSync(FLEXO_ENGINE_HELPERS_PATH)) {
        throw new Error('No se encontró el motor de cálculo de flexografía.');
    }

    if (!flexoEngineHelpersPromise) {
        ensureFlexoEngineDbEnv();
        flexoEngineHelpersPromise = import(pathToFileURL(FLEXO_ENGINE_HELPERS_PATH).href);
    }

    return flexoEngineHelpersPromise;
}

function renderIntegratedFlexoHtml() {
    // Single source of truth:
    // /calculo-flexografia is rendered from public/calculo-flexografia.
    // public/flexo-calculo.* is only a legacy compatibility shim.
    const indexPath = path.join(FLEXO_CALCULATOR_PUBLIC_DIR, 'index.html');
    if (!fs.existsSync(indexPath)) {
        throw new Error('No se encontró la interfaz pública del cálculo de flexografía.');
    }

    return fs.readFileSync(indexPath, 'utf8');
}

function ensureGeneralConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
        fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGIN_REPOSITORY_DIR)) {
        fs.mkdirSync(LOGIN_REPOSITORY_DIR, { recursive: true });
    }

    if (!fs.existsSync(GENERAL_CONFIG_PATH)) {
        fs.writeFileSync(GENERAL_CONFIG_PATH, JSON.stringify(DEFAULT_GENERAL_CONFIG, null, 2), 'utf8');
    }
}

function sanitizeRepositoryBaseName(value, fallback = 'imagen-login') {
    const normalized = String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized || fallback;
}

function extensionFromMimeType(mimeType) {
    const map = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'image/avif': '.avif'
    };
    return map[String(mimeType || '').toLowerCase()] || '';
}

function isOptimizableLoginImage(fileName) {
    return /\.(png|jpe?g|webp|avif)$/i.test(String(fileName || ''));
}

function buildOptimizedLoginRepositoryFileName(fileName) {
    const parsed = path.parse(String(fileName || ''));
    return `${parsed.name}.optimized.webp`;
}

function buildLoginRepositoryImageRecord(fileName, stats, optimizedStats = null) {
    const optimizedFileName = buildOptimizedLoginRepositoryFileName(fileName);
    const optimizedAvailable = Boolean(optimizedStats);
    return {
        fileName,
        url: optimizedAvailable
            ? `${LOGIN_REPOSITORY_URL_BASE}/${encodeURIComponent(optimizedFileName)}`
            : `${LOGIN_REPOSITORY_URL_BASE}/${encodeURIComponent(fileName)}`,
        originalUrl: `${LOGIN_REPOSITORY_URL_BASE}/${encodeURIComponent(fileName)}`,
        optimizedUrl: optimizedAvailable
            ? `${LOGIN_REPOSITORY_URL_BASE}/${encodeURIComponent(optimizedFileName)}`
            : null,
        optimized: optimizedAvailable,
        size: Number(stats?.size || 0),
        optimizedSize: Number(optimizedStats?.size || 0),
        updatedAt: stats?.mtime ? stats.mtime.toISOString() : null
    };
}

async function optimizeLoginRepositoryImage(sourcePath, fileName) {
    if (!isOptimizableLoginImage(fileName)) {
        return null;
    }

    const optimizedFileName = buildOptimizedLoginRepositoryFileName(fileName);
    const optimizedPath = path.join(LOGIN_REPOSITORY_DIR, optimizedFileName);

    await new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', [
            '-y',
            '-i', sourcePath,
            '-vf', "scale='min(1920,iw)':-2",
            '-frames:v', '1',
            '-compression_level', '6',
            '-quality', '78',
            optimizedPath
        ], {
            windowsHide: true
        });

        let stderr = '';
        ffmpeg.stderr.on('data', (chunk) => {
            stderr += String(chunk || '');
        });
        ffmpeg.on('error', reject);
        ffmpeg.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(stderr.trim() || `ffmpeg finalizó con código ${code}.`));
        });
    });

    return optimizedPath;
}

async function listLoginRepositoryImages() {
    ensureGeneralConfig();
    const entries = await fs.promises.readdir(LOGIN_REPOSITORY_DIR, { withFileTypes: true });
    const images = [];
    for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fileName = entry.name;
        if (/\.optimized\.webp$/i.test(fileName)) continue;
        if (!/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(fileName)) continue;
        const fullPath = path.join(LOGIN_REPOSITORY_DIR, fileName);
        const stats = await fs.promises.stat(fullPath);
        const optimizedPath = path.join(LOGIN_REPOSITORY_DIR, buildOptimizedLoginRepositoryFileName(fileName));
        const optimizedStats = fs.existsSync(optimizedPath) ? await fs.promises.stat(optimizedPath) : null;
        images.push(buildLoginRepositoryImageRecord(fileName, stats, optimizedStats));
    }
    images.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return images;
}

async function saveLoginRepositoryImage({ fileName, dataUrl }) {
    ensureGeneralConfig();
    const match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
        throw new Error('La imagen del repositorio no tiene un formato válido.');
    }
    const mimeType = match[1];
    const encoded = match[2];
    const extension = extensionFromMimeType(mimeType);
    if (!extension) {
        throw new Error('El formato de imagen no es compatible con el repositorio.');
    }
    const safeBase = sanitizeRepositoryBaseName(path.parse(String(fileName || '')).name || 'imagen-login');
    const finalFileName = `${Date.now()}-${safeBase}${extension}`;
    const targetPath = path.join(LOGIN_REPOSITORY_DIR, finalFileName);
    await fs.promises.writeFile(targetPath, Buffer.from(encoded, 'base64'));
    const stats = await fs.promises.stat(targetPath);
    let optimizedStats = null;
    try {
        const optimizedPath = await optimizeLoginRepositoryImage(targetPath, finalFileName);
        if (optimizedPath) {
            optimizedStats = await fs.promises.stat(optimizedPath);
        }
    } catch (error) {
        console.warn(`No fue posible optimizar la imagen ${finalFileName}:`, error.message);
    }
    return buildLoginRepositoryImageRecord(finalFileName, stats, optimizedStats);
}

async function deleteLoginRepositoryImage(fileName) {
    ensureGeneralConfig();
    const safeName = path.basename(String(fileName || ''));
    if (!safeName || safeName !== fileName) {
        throw new Error('El archivo solicitado no es válido.');
    }
    const targetPath = path.join(LOGIN_REPOSITORY_DIR, safeName);
    if (!fs.existsSync(targetPath)) {
        throw new Error('La imagen indicada no existe en el repositorio.');
    }
    await fs.promises.unlink(targetPath);
    const optimizedPath = path.join(LOGIN_REPOSITORY_DIR, buildOptimizedLoginRepositoryFileName(safeName));
    if (fs.existsSync(optimizedPath)) {
        await fs.promises.unlink(optimizedPath);
    }
}

function deepMerge(base, override) {
    if (!override || typeof override !== 'object') {
        return base;
    }

    const output = Array.isArray(base) ? [...base] : { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (value && typeof value === 'object' && !Array.isArray(value) && typeof output[key] === 'object') {
            output[key] = deepMerge(output[key], value);
        } else {
            output[key] = value;
        }
    }

    return output;
}

function repairUtf8Text(value) {
    if (typeof value !== 'string' || !value) {
        return value;
    }

    let repaired = value;
    for (let index = 0; index < 2; index += 1) {
        try {
            const nextValue = decodeURIComponent(escape(repaired));
            if (!nextValue || nextValue === repaired) {
                break;
            }
            repaired = nextValue;
        } catch (error) {
            break;
        }
    }
    return repaired;
}

function fixCommonTextArtifacts(value) {
    if (typeof value !== 'string') {
        return value;
    }

    return repairUtf8Text(value)
        .replace(/^C\?lculos$/i, 'Cálculos')
        .replace(/^Cotizador Flexografia Pro$/i, 'Cálculo de Flexografía')
        .replace(/^Configuracion General/i, 'Configuración General')
        .replace(/\s+\|\s+Cotizaciones$/, ' | Cotizaciones')
        .replace(/^\|\s*/, '');
}

function cleanPresentationPayload(presentation = {}) {
    const output = {};
    for (const [key, value] of Object.entries(presentation || {})) {
        if (key === 'tabWidth' || key === 'tabHeight') {
            continue;
        }
        if (value === undefined || value === null || value === '') {
            continue;
        }
        output[key] = typeof value === 'string' ? fixCommonTextArtifacts(value) : value;
    }
    return output;
}

function splitContactName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return { firstName: '', lastName: '' };
    }
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
    };
}

function normalizeFiscalId(value) {
    return String(value || '')
        .trim()
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase();
}

function sanitizePartnerCodePrefix(value) {
    const cleaned = String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    return cleaned || 'CL';
}

function buildPartnerCodeRegex(prefix) {
    return `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`;
}

async function generateNextPartnerCode(client, prefix) {
    const safePrefix = sanitizePartnerCodePrefix(prefix);
    const regex = buildPartnerCodeRegex(safePrefix);
    const result = await client.query(
        `SELECT partner_code
           FROM business_partners
          WHERE partner_code ~* $1`,
        [regex]
    );

    let maxValue = 0;
    let padLength = 5;
    for (const row of result.rows) {
        const match = String(row.partner_code || '').toUpperCase().match(new RegExp(regex, 'i'));
        if (!match) continue;
        const numeric = Number(match[1]);
        if (Number.isFinite(numeric)) {
            maxValue = Math.max(maxValue, numeric);
            padLength = Math.max(padLength, match[1].length);
        }
    }

    return `${safePrefix}${String(maxValue + 1).padStart(padLength, '0')}`;
}

async function findExistingPartnerDuplicate(client, { partnerName, taxId }) {
    const normalizedName = String(partnerName || '').trim();
    const normalizedTaxId = normalizeFiscalId(taxId);
    if (!normalizedName && !normalizedTaxId) {
        return null;
    }

    const conditions = [];
    const values = [];

    if (normalizedName) {
        values.push(normalizedName);
        conditions.push(`LOWER(TRIM(partner_name)) = LOWER(TRIM($${values.length}))`);
    }

    if (normalizedTaxId) {
        values.push(normalizedTaxId);
        conditions.push(`regexp_replace(UPPER(COALESCE(tax_id, '')), '[^A-Z0-9]', '', 'g') = $${values.length}`);
    }

    const result = await client.query(
        `SELECT partner_code, partner_name, tax_id
           FROM business_partners
          WHERE ${conditions.join(' OR ')}
          ORDER BY partner_code NULLS LAST
          LIMIT 1`,
        values
    );

    return result.rows[0] || null;
}

function buildNewPartnerRawData(payload, partnerCode) {
    return {
        socio: {
            codigo: partnerCode,
            nombre: payload.partner_name,
            identificacionFiscal: payload.tax_id,
            correoFacturacion: payload.email_facturacion,
            moneda: payload.currency_code,
            diasCredito: payload.payment_terms,
            contactoPrincipal: {
                nombre: payload.contact_name,
                identificacion: payload.contact_identification,
                celular: payload.contact_mobile,
                correo: payload.contact_email,
                telefono: payload.contact_phone
            },
            direccion: {
                pais: payload.address_country,
                provincia: payload.address_state_province,
                canton: payload.address_county,
                detalle: payload.address_line
            }
        },
        'CONTACTO NOMBRE': payload.contact_name,
        'CONTACTO IDENTIFICACION': payload.contact_identification,
        'Country Name': payload.address_country,
        'STATE NAME': payload.address_state_province,
        'CONTACTO CANTON': payload.address_county,
        STREET: payload.address_line,
        'Correo Facturacion 1': payload.email_facturacion,
        'RANGO CREDITO': payload.payment_terms,
        GROUPCODE_NOMBRE: payload.currency_code
    };
}

function normalizePartnerCode(value) {
    return String(value || '').trim().toUpperCase();
}

function normalizeInventoryCode(value) {
    return String(value || '').trim().toUpperCase();
}

function pickFirstSapValue(source = {}, keys = []) {
    for (const key of keys) {
        const value = source?.[key];
        if (value != null && String(value).trim() !== '') return String(value).trim();
    }
    return '';
}

function pickSapFiscalId(row = {}) {
    return pickFirstSapValue(row, [
        'FederalTaxID',
        'FederalTaxId',
        'FEDERALTAXID',
        'LicTradNum',
        'TaxId',
        'TaxID',
        'VatId',
        'VATRegNum',
        'U_IDFiscal',
        'U_Identificacion',
        'U_Cedula',
        'U_Nit'
    ]);
}

function pickSapEmail(row = {}) {
    return pickFirstSapValue(row, ['Email', 'EmailAddress', 'E_Mail', 'E_MailL', 'MailAddress', 'U_Email']);
}

function pickSapPhone(row = {}) {
    return pickFirstSapValue(row, ['Phone1', 'Phone2', 'Tel1', 'Telephone1', 'U_Telefono']);
}

function pickSapMobile(row = {}) {
    return pickFirstSapValue(row, ['Cellular', 'CellularPhone', 'Cellolar', 'MobilePhone', 'Mobile', 'U_Celular']);
}

function pickSapPrimaryAddress(row = {}) {
    const addresses = Array.isArray(row.BPAddresses) ? row.BPAddresses : (Array.isArray(row.Addresses) ? row.Addresses : []);
    if (!addresses.length) return null;
    return addresses.find((address) => String(address?.AddressType || '').trim().toLowerCase() === 'bo_billto')
        || addresses[0]
        || null;
}

function mapSapPartnerAddressType(value = '') {
    const normalized = String(value || '').trim().toLowerCase();
    if (['s', 'bo_shipto', 'shipto', 'ship to', 'envio', 'envío'].includes(normalized)) return 'Envío';
    return 'Facturación';
}

function buildSapPartnerAddressLine(address = {}) {
    return [
        pickFirstSapValue(address, ['Street', 'AddressLine1']),
        pickFirstSapValue(address, ['Block', 'District', 'County']),
        pickFirstSapValue(address, ['City'])
    ].filter(Boolean).join(', ');
}

function normalizeSapPartnerAddress(address = {}, index = 0) {
    const addressName = pickFirstSapValue(address, ['AddressName', 'Address']) || `SAP-${index + 1}`;
    const addressType = pickFirstSapValue(address, ['AddressType', 'AdresType']);
    return {
        addressName,
        addressType: mapSapPartnerAddressType(addressType),
        addressTypeCode: addressType,
        country: pickFirstSapValue(address, ['Country']),
        stateProvince: pickFirstSapValue(address, ['State', 'StateProvince']),
        county: pickFirstSapValue(address, ['County']),
        district: pickFirstSapValue(address, ['Block', 'District']),
        addressLine: buildSapPartnerAddressLine(address),
        zipCode: pickFirstSapValue(address, ['ZipCode', 'Zip']),
        rawData: address || {}
    };
}

function pickSapContactIdentification(contact = {}, fallback = '') {
    return pickFirstSapValue(contact, [
        'FederalTaxID',
        'LicTradNum',
        'TaxId',
        'TaxID',
        'U_IDFiscal',
        'U_Identificacion',
        'U_Cedula',
        'Identification'
    ]) || fallback;
}

function pickSapContactRows(row = {}) {
    const contacts = Array.isArray(row.ContactEmployees)
        ? row.ContactEmployees
        : (Array.isArray(row.Contacts) ? row.Contacts : []);
    if (contacts.length) return contacts;
    const name = pickFirstSapValue(row, ['ContactPerson', 'CntctPrsn']);
    return name ? [{
        Name: name,
        FirstName: name,
        E_MailL: pickSapEmail(row),
        Tel1: pickSapPhone(row),
        Cellolar: pickSapMobile(row),
        Position: 'Principal'
    }] : [];
}

function normalizeSapPartnerContact(contact = {}, row = {}, primaryAddress = {}) {
    const name = pickFirstSapValue(contact, ['Name', 'ContactName', 'FirstName']) || pickFirstSapValue(row, ['ContactPerson', 'CardName']);
    const parts = splitContactName(name);
    return {
        contactName: name,
        firstName: pickFirstSapValue(contact, ['FirstName']) || parts.firstName,
        lastName: pickFirstSapValue(contact, ['LastName']) || parts.lastName,
        email: pickFirstSapValue(contact, ['E_MailL', 'Email', 'EmailAddress']) || pickSapEmail(row),
        phone: pickFirstSapValue(contact, ['Tel1', 'Phone1', 'Telephone1']) || pickSapPhone(row),
        mobile: pickFirstSapValue(contact, ['Cellolar', 'Cellular', 'MobilePhone', 'Mobile']) || pickSapMobile(row),
        fax: pickFirstSapValue(contact, ['Fax', 'Fax1']),
        position: pickFirstSapValue(contact, ['Position', 'Title']) || 'Principal',
        country: pickFirstSapValue(contact, ['Country']) || primaryAddress.country || '',
        stateProvince: pickFirstSapValue(contact, ['State', 'StateProvince']) || primaryAddress.stateProvince || '',
        county: pickFirstSapValue(contact, ['County']) || primaryAddress.county || '',
        addressLine: pickFirstSapValue(contact, ['Address']) || primaryAddress.addressLine || '',
        identification: pickSapContactIdentification(contact, pickSapFiscalId(row)),
        rawData: contact || {}
    };
}

function normalizeSapMaterialFamily(value) {
    const normalized = String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

    if (!normalized) return '';
    if (normalized.includes('barniz')) return 'barniz';
    if (normalized.includes('laminad')) return 'laminado';
    if (normalized.includes('foil') || normalized.includes('estamp')) return 'foil';
    if (normalized.includes('core') || normalized.includes('nucleo') || normalized.includes('núcleo')) return 'core';
    if (normalized.includes('tinta')) return 'tinta';
    if (normalized.includes('plancha') || normalized.includes('cliche') || normalized.includes('cliché') || normalized.includes('fotopol')) return 'plancha';
    if (normalized.includes('sustrat') || normalized.includes('papel') || normalized.includes('film') || normalized.includes('bopp') || normalized.includes('pet') || normalized.includes('opp')) return 'sustrato';
    return normalized;
}

function buildSapMaterialImportPayload(row = {}) {
    const codigo = normalizeInventoryCode(row.ItemCode);
    const nombre = String(row.ItemName || '').trim();
    const itemGroup = String(row.ItemGroup || row.ItemsGroupCode || '').trim();
    const buyUnit = String(row.BuyUnitMsr || row.SalesUnitMsr || '').trim().toUpperCase();
    const unitCost = Number(row.Price || 0) || 0;
    const familySeed = [itemGroup, nombre, codigo].filter(Boolean).join(' ');
    const familia = normalizeSapMaterialFamily(familySeed) || 'sustrato';

    const payload = {
        codigo,
        nombre,
        ancho_mm: 0,
        largo_mm: null,
        gramaje_g_m2: null,
        calibre_micras: null,
        costo_x_lamina: null,
        costo_x_msi: 0,
        costo_x_m2: 0,
        costo_x_kg: 0,
        costo_x_libra: null,
        peso_capa_gsm: null,
        familia_proceso: familia,
        costo_x_unidad: unitCost || null,
        merma_pct: null,
        rendimiento_g_ft2: null,
        temperatura_aplicacion_c: null,
        tipo_transferencia: '',
        comentario_tipo_proforma: 'Importado desde SAP',
        compatible_convencional: true,
        compatible_digital: true,
        tipo_proforma: itemGroup || nombre,
        activo: true
    };

    if (buyUnit === 'M2') {
        payload.costo_x_m2 = unitCost;
    } else if (buyUnit === 'KG' || buyUnit === 'KGS') {
        payload.costo_x_kg = unitCost;
    } else if (buyUnit === 'LB' || buyUnit === 'LBR' || buyUnit === 'LIBRA' || buyUnit === 'LIBRAS') {
        payload.costo_x_libra = unitCost;
    }

    return payload;
}

function buildSapPartnerImportPayload(row = {}) {
    const partnerCode = normalizePartnerCode(row.CardCode);
    const partnerName = String(row.CardName || '').trim();
    const taxId = pickSapFiscalId(row);
    const email = pickSapEmail(row);
    const addresses = (Array.isArray(row.BPAddresses) ? row.BPAddresses : (Array.isArray(row.Addresses) ? row.Addresses : []))
        .map((address, index) => normalizeSapPartnerAddress(address, index))
        .filter((address) => address.addressName || address.addressLine || address.country || address.stateProvince || address.county);
    const primaryAddress = addresses.find((address) => String(address.addressTypeCode || '').trim().toLowerCase() === 'bo_billto')
        || addresses[0]
        || normalizeSapPartnerAddress(pickSapPrimaryAddress(row) || {}, 0);
    const contacts = pickSapContactRows(row)
        .map((contact) => normalizeSapPartnerContact(contact, row, primaryAddress))
        .filter((contact) => contact.contactName || contact.email || contact.phone || contact.mobile);
    if (!contacts.length && (partnerName || email)) {
        contacts.push(normalizeSapPartnerContact({
            Name: pickFirstSapValue(row, ['ContactPerson']) || partnerName,
            E_MailL: email,
            Tel1: pickSapPhone(row),
            Cellolar: pickSapMobile(row),
            Position: 'Principal'
        }, row, primaryAddress));
    }
    const mainContact = contacts[0] || {};

    const provider = String(row.__sapProvider || row.provider || '').trim() || 'service-layer';
    return {
        partnerCode,
        partnerName,
        taxId,
        email,
        currencyCode: String(row.Currency || 'USD').trim() || 'USD',
        paymentTerms: 'Contado',
        contacts,
        addresses,
        contactName: mainContact.contactName || pickFirstSapValue(row, ['ContactPerson']) || partnerName,
        contactIdentification: mainContact.identification || taxId,
        contactMobile: mainContact.mobile || pickSapMobile(row),
        contactEmail: mainContact.email || email,
        contactPhone: mainContact.phone || pickSapPhone(row),
        addressCountry: primaryAddress.country || '',
        addressStateProvince: primaryAddress.stateProvince || '',
        addressCounty: primaryAddress.county || '',
        addressLine: primaryAddress.addressLine || '',
        rawData: {
            source: 'sap',
            sapProvider: provider,
            imported_at: new Date().toISOString(),
            sap: row
        }
    };
}

async function diagnoseSociosImportFromSap() {
    const sapResponse = await fetchSapBusinessPartnersForImport(pgQuery, { top: 500, type: 'C' });
    const sapRows = Array.isArray(sapResponse?.value)
        ? sapResponse.value.map((row) => ({
            ...row,
            __sapProvider: sapResponse?.provider || row?.provider || 'service-layer'
        }))
        : [];

    const existingResult = await pgQuery(
        `SELECT partner_code, tax_id
           FROM business_partners`
    );

    const existingCodes = new Set();
    const existingTaxIds = new Set();
    for (const row of existingResult.rows) {
        const code = normalizePartnerCode(row.partner_code);
        const taxId = normalizeFiscalId(row.tax_id);
        if (code) existingCodes.add(code);
        if (taxId) existingTaxIds.add(taxId);
    }

    const summary = {
        source: sapResponse?.source || 'sap',
        total: sapRows.length,
        importable: 0,
        duplicateByCode: 0,
        duplicateByTaxId: 0,
        duplicateByBoth: 0,
        skippedWithoutCode: 0,
        skippedWithoutTaxId: 0
    };

    const importablePartners = [];

    for (const row of sapRows) {
        const partner = buildSapPartnerImportPayload(row);
        const normalizedCode = normalizePartnerCode(partner.partnerCode);
        const normalizedTaxId = normalizeFiscalId(partner.taxId);

        if (!normalizedCode) {
            summary.skippedWithoutCode += 1;
            continue;
        }

        if (!normalizedTaxId) {
            summary.skippedWithoutTaxId += 1;
            continue;
        }

        const duplicateCode = existingCodes.has(normalizedCode);
        const duplicateTaxId = existingTaxIds.has(normalizedTaxId);

        if (duplicateCode && duplicateTaxId) {
            summary.duplicateByBoth += 1;
            continue;
        }
        if (duplicateCode) {
            summary.duplicateByCode += 1;
            continue;
        }
        if (duplicateTaxId) {
            summary.duplicateByTaxId += 1;
            continue;
        }

        importablePartners.push(partner);
        existingCodes.add(normalizedCode);
        existingTaxIds.add(normalizedTaxId);
        summary.importable += 1;
    }

    return { summary, importablePartners };
}

async function importSociosFromSap(options = {}) {
    const diagnosis = await diagnoseSociosImportFromSap();
    const limitValue = Number(options.limit);
    const requestedLimit = Number.isFinite(limitValue) && limitValue > 0 ? Math.max(1, Math.floor(limitValue)) : null;
    const importablePartners = requestedLimit
        ? diagnosis.importablePartners.slice(0, requestedLimit)
        : diagnosis.importablePartners;

    return withTransaction(async (client) => {
        const summary = {
            ...diagnosis.summary,
            requestedLimit,
            selectedForImport: importablePartners.length,
            inserted: 0
        };

        for (const partner of importablePartners) {
            await client.query(
                `INSERT INTO business_partners (
                    partner_code,
                    partner_name,
                    salesperson_name,
                    tax_id,
                    email,
                    email_facturacion,
                    currency_code,
                    payment_terms,
                    sector,
                    sub_sector,
                    is_tax_exempt,
                    allowed_percentage,
                    client_type,
                    creation_date,
                    raw_data,
                    updated_at
                ) VALUES (
                    $1, $2, '', $3, $4, $5, $6, $7, '', '', false, NULL, $8, CURRENT_DATE, $9::jsonb, NOW()
                )`,
                [
                    partner.partnerCode,
                    partner.partnerName,
                    partner.taxId,
                    partner.contactEmail,
                    partner.email,
                    sanitizePartnerCodePrefix(partner.currencyCode).slice(0, 10) || 'USD',
                    partner.paymentTerms,
                    String(partner.rawData?.sap?.CardType || '').trim() === 'S' ? 'PR' : 'CL',
                    JSON.stringify(partner.rawData)
                ]
            );

            const partnerContacts = Array.isArray(partner.contacts) && partner.contacts.length
                ? partner.contacts
                : [{
                    contactName: partner.contactName || partner.partnerName,
                    firstName: splitContactName(partner.contactName || partner.partnerName).firstName,
                    lastName: splitContactName(partner.contactName || partner.partnerName).lastName,
                    email: partner.contactEmail,
                    phone: partner.contactPhone,
                    mobile: partner.contactMobile,
                    fax: '',
                    position: 'Principal',
                    country: partner.addressCountry,
                    stateProvince: partner.addressStateProvince,
                    county: partner.addressCounty,
                    addressLine: partner.addressLine,
                    identification: partner.contactIdentification,
                    rawData: {}
                }];

            for (const contact of partnerContacts) {
                if (!contact.contactName && !contact.email && !contact.phone && !contact.mobile) continue;
                await client.query(
                    `INSERT INTO business_partner_contacts (
                        partner_code,
                        contact_name,
                        first_name,
                        last_name,
                        email,
                        phone,
                        mobile,
                        fax,
                        position,
                        is_legal_representative,
                        country,
                        state_province,
                        county,
                        raw_data
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12, $13::jsonb
                    )`,
                    [
                        partner.partnerCode,
                        contact.contactName || partner.partnerName,
                        contact.firstName || splitContactName(contact.contactName).firstName,
                        contact.lastName || splitContactName(contact.contactName).lastName,
                        contact.email || null,
                        contact.phone || null,
                        contact.mobile || null,
                        contact.fax || '',
                        contact.position || 'Principal',
                        contact.country || '',
                        contact.stateProvince || '',
                        contact.county || '',
                        JSON.stringify({
                            IDENTIFICACION: contact.identification || partner.contactIdentification,
                            ADDRESS: contact.addressLine || partner.addressLine,
                            source: 'sap',
                            sapProvider: partner.rawData?.sapProvider || 'service-layer',
                            sap_contact: contact.rawData || {}
                        })
                    ]
                );
            }

            const partnerAddresses = Array.isArray(partner.addresses) && partner.addresses.length
                ? partner.addresses
                : (partner.addressLine || partner.addressCountry || partner.addressStateProvince || partner.addressCounty ? [{
                    addressName: 'Principal',
                    addressType: 'Facturación',
                    country: partner.addressCountry,
                    stateProvince: partner.addressStateProvince,
                    county: partner.addressCounty,
                    district: '',
                    addressLine: partner.addressLine,
                    zipCode: '',
                    rawData: {}
                }] : []);

            for (const address of partnerAddresses) {
                if (address.addressLine || address.country || address.stateProvince || address.county) {
                await client.query(
                    `INSERT INTO business_partner_addresses (
                        partner_code,
                        address_name,
                        address_type,
                        country,
                        state_province,
                        county,
                        district,
                        address_line,
                        zip_code,
                        raw_data
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb
                    )`,
                    [
                        partner.partnerCode,
                        address.addressName || 'Principal',
                        address.addressType || 'Facturación',
                        address.country || '',
                        address.stateProvince || '',
                        address.county || '',
                        address.district || '',
                        address.addressLine || '',
                        address.zipCode || '',
                        JSON.stringify({
                            ADDRESS: address.addressLine || partner.addressLine,
                            source: 'sap',
                            sapProvider: partner.rawData?.sapProvider || 'service-layer',
                            sap_address: address.rawData || {}
                        })
                    ]
                );
                }
            }
            summary.inserted += 1;
        }

        return summary;
    });
}

async function diagnoseMaterialesImportFromSap() {
    const sapResponse = await fetchSapItemsForImport(pgQuery, { top: 1000 });
    const sapRows = Array.isArray(sapResponse?.value) ? sapResponse.value : [];

    const existingResult = await pgQuery(`SELECT codigo FROM material`);
    const existingCodes = new Set(
        existingResult.rows
            .map((row) => normalizeInventoryCode(row.codigo))
            .filter(Boolean)
    );

    const summary = {
        source: sapResponse?.source || 'sap',
        total: sapRows.length,
        importable: 0,
        duplicateByCode: 0,
        skippedWithoutCode: 0,
        skippedWithoutName: 0
    };

    const importableMaterials = [];

    for (const row of sapRows) {
        const material = buildSapMaterialImportPayload(row);
        if (!material.codigo) {
            summary.skippedWithoutCode += 1;
            continue;
        }
        if (!material.nombre) {
            summary.skippedWithoutName += 1;
            continue;
        }
        if (existingCodes.has(material.codigo)) {
            summary.duplicateByCode += 1;
            continue;
        }

        importableMaterials.push(material);
        existingCodes.add(material.codigo);
        summary.importable += 1;
    }

    return { summary, importableMaterials };
}

async function importMaterialesFromSap(options = {}) {
    const diagnosis = await diagnoseMaterialesImportFromSap();
    const limitValue = Number(options.limit);
    const requestedLimit = Number.isFinite(limitValue) && limitValue > 0 ? Math.max(1, Math.floor(limitValue)) : null;
    const importableMaterials = requestedLimit
        ? diagnosis.importableMaterials.slice(0, requestedLimit)
        : diagnosis.importableMaterials;

    return withTransaction(async (client) => {
        const tenantResult = await client.query(
            `SELECT id::text
               FROM tenant
              WHERE activo = true
              ORDER BY creado_en ASC
              LIMIT 1`
        );
        const tenantId = tenantResult.rows[0]?.id;
        if (!tenantId) {
            throw new Error('No se encontró un tenant activo para guardar inventario.');
        }

        const summary = {
            ...diagnosis.summary,
            requestedLimit,
            selectedForImport: importableMaterials.length,
            inserted: 0
        };

        for (const material of importableMaterials) {
            await client.query(
                `INSERT INTO material (
                    tenant_id, codigo, nombre, ancho_mm, largo_mm, gramaje_g_m2, calibre_micras, costo_x_lamina, costo_x_msi,
                    costo_x_m2, costo_x_kg, costo_x_libra, peso_capa_gsm, familia_proceso, costo_x_unidad, merma_pct,
                    rendimiento_g_ft2, temperatura_aplicacion_c, tipo_transferencia,
                    comentario_ancho_mm, comentario_largo_mm, comentario_gramaje_g_m2, comentario_calibre_micras,
                    comentario_costo_x_lamina, comentario_costo_x_msi, comentario_costo_x_m2, comentario_costo_x_kg,
                    comentario_costo_x_libra, comentario_peso_capa_gsm, comentario_rendimiento_g_ft2,
                    comentario_compatible_convencional, comentario_compatible_digital, comentario_tipo_proforma,
                    compatible_convencional, compatible_digital, tipo_proforma, activo
                 ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                    $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37
                 )`,
                [
                    tenantId,
                    material.codigo,
                    material.nombre,
                    material.ancho_mm,
                    material.largo_mm,
                    material.gramaje_g_m2,
                    material.calibre_micras,
                    material.costo_x_lamina,
                    material.costo_x_msi,
                    material.costo_x_m2,
                    material.costo_x_kg,
                    material.costo_x_libra,
                    material.peso_capa_gsm,
                    material.familia_proceso,
                    material.costo_x_unidad,
                    material.merma_pct,
                    material.rendimiento_g_ft2,
                    material.temperatura_aplicacion_c,
                    material.tipo_transferencia,
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    material.comentario_tipo_proforma,
                    material.compatible_convencional,
                    material.compatible_digital,
                    material.tipo_proforma,
                    material.activo
                ]
            );
            summary.inserted += 1;
        }

        return summary;
    });
}

function normalizeGeneralConfigRecord(config, baseConfig = DEFAULT_GENERAL_CONFIG) {
    const source = config || {};
    const normalized = {
        branding: deepMerge(baseConfig.branding || DEFAULT_GENERAL_CONFIG.branding, source.branding || {}),
        contact: deepMerge(baseConfig.contact || DEFAULT_GENERAL_CONFIG.contact, source.contact || {}),
        appearance: deepMerge(baseConfig.appearance || DEFAULT_GENERAL_CONFIG.appearance, source.appearance || {}),
        session: deepMerge(baseConfig.session || DEFAULT_GENERAL_CONFIG.session, source.session || {}),
        icons: deepMerge(baseConfig.icons || DEFAULT_GENERAL_CONFIG.icons, source.icons || {}),
        layout: deepMerge(baseConfig.layout || DEFAULT_GENERAL_CONFIG.layout, source.layout || {}),
        general: deepMerge(baseConfig.general || DEFAULT_GENERAL_CONFIG.general, source.general || {}),
        presentations: {}
    };

    const rawPresentations = { ...(source.presentations || {}) };

    if (!rawPresentations.calculos && rawPresentations.flexo) {
        rawPresentations.calculos = rawPresentations.flexo;
    }

    if (rawPresentations.inventario) {
        if (!rawPresentations['inventario-mp']) rawPresentations['inventario-mp'] = rawPresentations.inventario;
        if (!rawPresentations['inventario-troqueles']) rawPresentations['inventario-troqueles'] = rawPresentations.inventario;
        if (!rawPresentations['inventario-maquinaria']) rawPresentations['inventario-maquinaria'] = rawPresentations.inventario;
    }

    for (const key of Object.keys(PRESENTATION_NAMES)) {
        const cleaned = cleanPresentationPayload(rawPresentations[key]);
        normalized.presentations[key] = cleaned;
        if (!cleaned.moduleTitle && PRESENTATION_NAMES[key]) {
            normalized.presentations[key].moduleTitle = PRESENTATION_NAMES[key];
        }
    }

    normalized.general.moduleTitle = fixCommonTextArtifacts(normalized.general.moduleTitle);
    normalized.general.quoteProductTypesJson = JSON.stringify(normalizeQuoteProductTypes(normalized.general.quoteProductTypesJson, DEFAULT_GENERAL_CONFIG.general.quoteProductTypesJson));
    normalized.general.quoteApplicationOptionsJson = JSON.stringify(normalizeQuoteProductTypes(normalized.general.quoteApplicationOptionsJson, DEFAULT_GENERAL_CONFIG.general.quoteApplicationOptionsJson));
    normalized.general.quoteSurfaceOptionsJson = JSON.stringify(normalizeQuoteProductTypes(normalized.general.quoteSurfaceOptionsJson, DEFAULT_GENERAL_CONFIG.general.quoteSurfaceOptionsJson));
    normalized.general.deliverySampleModesJson = JSON.stringify(normalizeQuoteProductTypes(normalized.general.deliverySampleModesJson, DEFAULT_GENERAL_CONFIG.general.deliverySampleModesJson));
    normalized.general.deliveryApprovalRecipientsJson = JSON.stringify(normalizeQuoteProductTypes(normalized.general.deliveryApprovalRecipientsJson, DEFAULT_GENERAL_CONFIG.general.deliveryApprovalRecipientsJson));
    normalized.general.deliveryMethodsJson = JSON.stringify(normalizeQuoteProductTypes(normalized.general.deliveryMethodsJson, DEFAULT_GENERAL_CONFIG.general.deliveryMethodsJson));
    normalized.general.inventorySourceMode = String(normalized.general.inventorySourceMode || DEFAULT_GENERAL_CONFIG.general.inventorySourceMode).trim().toLowerCase() === 'sap' ? 'sap' : 'local';
    normalized.general.inventoryImportedClassificationField = String(normalized.general.inventoryImportedClassificationField || DEFAULT_GENERAL_CONFIG.general.inventoryImportedClassificationField).trim() || DEFAULT_GENERAL_CONFIG.general.inventoryImportedClassificationField;
    normalized.branding.companyName = fixCommonTextArtifacts(normalized.branding.companyName);
    normalized.general.proformaCurrenciesJson = JSON.stringify(normalizeProformaCurrencyList(normalized.general.proformaCurrenciesJson));
    normalized.general.proformaDefaultCurrency = String(normalized.general.proformaDefaultCurrency || 'USD').trim().toUpperCase() || 'USD';
    normalized.general.proformaDefaultValidity = String(normalized.general.proformaDefaultValidity || '30 días').trim() || '30 días';
    normalized.general.proformaValidityOptionsJson = JSON.stringify(normalizeProformaValidityOptions(normalized.general.proformaValidityOptionsJson));
    normalized.general.proformaHeaderColor = normalizeProformaHeaderColor(normalized.general.proformaHeaderColor, DEFAULT_GENERAL_CONFIG.general.proformaHeaderColor);
    normalized.general.proformaCompanyNameColor = normalizeProformaHeaderColor(normalized.general.proformaCompanyNameColor, DEFAULT_GENERAL_CONFIG.general.proformaCompanyNameColor);
    normalized.general.proformaShowCompanyName = String(normalized.general.proformaShowCompanyName || 'true').trim().toLowerCase() === 'false' ? 'false' : 'true';
    normalized.general.proformaLogoWidth = Number(normalized.general.proformaLogoWidth || DEFAULT_GENERAL_CONFIG.general.proformaLogoWidth) || DEFAULT_GENERAL_CONFIG.general.proformaLogoWidth;
    normalized.general.proformaLogoHeight = Number(normalized.general.proformaLogoHeight || DEFAULT_GENERAL_CONFIG.general.proformaLogoHeight) || DEFAULT_GENERAL_CONFIG.general.proformaLogoHeight;
    normalized.general.proformaLogoAspectLocked = String(normalized.general.proformaLogoAspectLocked || 'true').trim().toLowerCase() === 'false' ? 'false' : 'true';
    normalized.general.proformaLogoMarginTop = Number(normalized.general.proformaLogoMarginTop || 0) || 0;
    normalized.general.proformaLogoMarginLeft = Number(normalized.general.proformaLogoMarginLeft || 0) || 0;
    normalized.general.proformaIntroFontFamily = String(normalized.general.proformaIntroFontFamily || 'inherit').trim() || 'inherit';
    normalized.general.proformaIntroFontSize = Number(normalized.general.proformaIntroFontSize || 15) || 15;
    normalized.general.proformaIntroColor = normalizeProformaHeaderColor(normalized.general.proformaIntroColor, '#2f3c46');
    normalized.general.proformaPriceDisplayMode = String(normalized.general.proformaPriceDisplayMode || 'both').trim() || 'both';
    normalized.general.proformaSellerSignatureEnabled = String(normalized.general.proformaSellerSignatureEnabled || 'true').trim().toLowerCase() === 'false' ? 'false' : 'true';
    normalized.general.maxUploadMb = Math.max(1, Math.min(Number(normalized.general.maxUploadMb) || 10, 500));
    return normalized;
}

function normalizeQuoteProductTypes(value, fallbackJson = DEFAULT_GENERAL_CONFIG.general.quoteProductTypesJson) {
    const parseList = (source) => {
        if (Array.isArray(source)) return source;
        if (source && typeof source === 'object') return Object.values(source);
        if (typeof source === 'string') {
            const trimmed = source.trim();
            if (!trimmed) return null;
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed;
            } catch (_) {
                return trimmed
                    .split(/[\n,;]+/)
                    .map((item) => item.trim())
                    .filter(Boolean);
            }
        }
        return null;
    };

    let list = parseList(value);
    if (list === null) {
        list = parseList(fallbackJson) || [];
    }

    const seen = new Set();
    return list
        .map((item) => {
            if (typeof item === 'string') return fixCommonTextArtifacts(item).trim();
            if (item && typeof item === 'object') {
                return fixCommonTextArtifacts(item.name || item.label || item.value || '').trim();
            }
            return '';
        })
        .filter((item) => {
            if (!item) return false;
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 60);
}

function readBootstrapConfigSnapshot() {
    try {
        const raw = fs.readFileSync(BOOTSTRAP_CONFIG_PATH, 'utf8');
        const match = raw.match(/window\.PrintLabConfigBootstrap\s*=\s*([\s\S]*?);\s*window\.PrintLabLoginRepositoryBootstrap/);
        return match ? JSON.parse(match[1]) : null;
    } catch (error) {
        return null;
    }
}

function invalidateConfigCaches() {
    generalConfigCache = null;
    generalConfigCacheExpiresAt = 0;
    shellConfigCache = null;
    shellConfigCacheExpiresAt = 0;
}

function loadGeneralConfigFromFile() {
    ensureGeneralConfig();
    try {
        const raw = fs.readFileSync(GENERAL_CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        return normalizeGeneralConfigRecord(parsed);
    } catch (error) {
        return DEFAULT_GENERAL_CONFIG;
    }
}

function saveGeneralConfigToFile(config) {
    ensureGeneralConfig();
    const normalized = normalizeGeneralConfigRecord(config);
    fs.writeFileSync(GENERAL_CONFIG_PATH, JSON.stringify(normalized, null, 2), 'utf8');
    return normalized;
}

async function loadGeneralConfig() {
    const now = Date.now();
    if (generalConfigCache && generalConfigCacheExpiresAt > now) {
        return generalConfigCache;
    }
    const fallback = loadGeneralConfigFromFile();
    try {
        const result = await pgQuery(
            `SELECT config_value
               FROM app_config
              WHERE config_key = $1
              LIMIT 1`,
            ['general']
        );
        if (!result.rows.length) {
            generalConfigCache = fallback;
            generalConfigCacheExpiresAt = now + GENERAL_CONFIG_CACHE_TTL_MS;
            return fallback;
        }
        generalConfigCache = normalizeGeneralConfigRecord(result.rows[0].config_value || {});
        generalConfigCacheExpiresAt = now + GENERAL_CONFIG_CACHE_TTL_MS;
        return generalConfigCache;
    } catch (error) {
        generalConfigCache = fallback;
        generalConfigCacheExpiresAt = now + GENERAL_CONFIG_CACHE_TTL_MS;
        return fallback;
    }
}

const DATA_IMAGE_EXTENSIONS = new Map([
    ['image/svg+xml', 'svg'],
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/jpg', 'jpg'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif']
]);

function getDataImageIconMeta(value) {
    const text = String(value || '').trim();
    const match = text.match(/^data:(image\/[a-z0-9.+-]+)(;base64)?,(.*)$/i);
    if (!match) return null;
    const mime = match[1].toLowerCase();
    const extension = DATA_IMAGE_EXTENSIONS.get(mime);
    if (!extension) return null;
    return { text, mime, extension, isBase64: Boolean(match[2]), data: match[3] || '' };
}

function readDataImageIcon(value) {
    const meta = getDataImageIconMeta(value);
    if (!meta) return null;
    return {
        mime: meta.mime,
        extension: meta.extension,
        buffer: meta.isBase64 ? Buffer.from(meta.data, 'base64') : Buffer.from(decodeURIComponent(meta.data), 'utf8')
    };
}

function buildShellIconValue(key, value) {
    const meta = getDataImageIconMeta(value);
    if (!meta) return value;
    const ext = meta.extension;
    const filePath = path.join(ICONS_DISK_DIR, key + '.' + ext);
    if (fs.existsSync(filePath)) {
        const version = Math.max(1, Math.floor(fs.statSync(filePath).mtimeMs));
        return '/assets/bootstrap/icons/' + encodeURIComponent(key) + '.' + ext + '?v=' + version;
    }
    return value;
}

function buildShellConfig(config) {
    const normalized = normalizeGeneralConfigRecord(config);
    const icons = { ...(normalized.icons || {}) };
    Object.keys(icons).forEach((key) => {
        icons[key] = buildShellIconValue(key, icons[key]);
    });
    return { ...normalized, icons };
}

async function loadShellConfig() {
    const now = Date.now();
    if (shellConfigCache && shellConfigCacheExpiresAt > now) {
        return shellConfigCache;
    }
    shellConfigCache = buildShellConfig(await loadGeneralConfig());
    shellConfigCacheExpiresAt = now + GENERAL_CONFIG_CACHE_TTL_MS;
    return shellConfigCache;
}

async function compressIconsOnSave(config) {
    const icons = config.icons;
    if (!icons || typeof icons !== 'object') return;
    const sharp = require('sharp');
    const keys = Object.keys(icons);
    for (const key of keys) {
        const val = icons[key];
        if (typeof val !== 'string') continue;
        const meta = getDataImageIconMeta(val);
        if (!meta || meta.mime === 'image/svg+xml' || !meta.isBase64) continue;
        try {
            const buf = Buffer.from(meta.data, 'base64');
            const info = await sharp(buf).metadata();
            const maxDim = /^dashboard|^order|^line|^quoteRequest|^attachment|^table|^top/i.test(key) ? 192 : 256;

            // Recortar fondo negro/transparente antes de redimensionar
            // trim() detecta y elimina bordes con color uniforme (negro o transparente)
            const trimmed = await sharp(buf).rotate().trim({ background: '#000000', threshold: 20 }).toBuffer();
            const trimmedInfo = await sharp(trimmed).metadata();

            // Agregar margen uniforme del 10% para que el ícono quede centrado igual que los demás
            const marginPct = 0.10;
            const margin = Math.round(Math.max(trimmedInfo.width || 0, trimmedInfo.height || 0) * marginPct);
            const pipeline = sharp(trimmed).extend({
                top: margin, bottom: margin, left: margin, right: margin,
                background: { r: 0, g: 0, b: 0, a: 0 }
            });

            if ((trimmedInfo.width || 0) + margin * 2 > maxDim || (trimmedInfo.height || 0) + margin * 2 > maxDim) {
                pipeline.resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true });
            }
            const webp = await pipeline.clone().webp({ quality: 82, effort: 5 }).toBuffer();
            const png = await pipeline.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
            const bestMime = webp.length <= png.length ? 'image/webp' : 'image/png';
            const best = webp.length <= png.length ? webp : png;
            if (best.length < buf.length || (info.width || 0) > maxDim || (info.height || 0) > maxDim) {
                icons[key] = `data:${bestMime};base64,${best.toString('base64')}`;
            }
        } catch (e) {
            console.error('Error compressing icon ' + key + ':', e.message);
        }
    }
}

async function writeIconsToDisk(config) {
    const icons = config.icons;
    if (!icons || typeof icons !== 'object') return;
    if (!fs.existsSync(ICONS_DISK_DIR)) fs.mkdirSync(ICONS_DISK_DIR, { recursive: true });
    const sharp = require('sharp');
    const keys = Object.keys(icons);
    for (const key of keys) {
        const val = icons[key];
        if (typeof val !== 'string') continue;
        let buf = null;
        let ext = '';
        if (val.startsWith('data:image/png;base64,')) {
            buf = Buffer.from(val.split(',')[1], 'base64');
            ext = 'png';
        } else if (val.startsWith('data:image/webp;base64,')) {
            buf = Buffer.from(val.split(',')[1], 'base64');
            ext = 'webp';
        } else if (val.startsWith('data:image/svg+xml;base64,')) {
            buf = Buffer.from(val.split(',')[1], 'base64');
            ext = 'svg';
        } else if (val.startsWith('data:image/jpeg;base64,')) {
            buf = Buffer.from(val.split(',')[1], 'base64');
            ext = 'jpg';
        } else {
            continue;
        }
        try {
            fs.writeFileSync(path.join(ICONS_DISK_DIR, key + '.' + ext), buf);
        } catch (e) {
            console.error('Error writing icon ' + key + ':', e.message);
        }
    }
}

async function saveGeneralConfig(config) {
    const previous = await loadGeneralConfig();
    const normalized = normalizeGeneralConfigRecord(config, previous);
    await compressIconsOnSave(normalized);
    await writeIconsToDisk(normalized);
    saveGeneralConfigToFile(normalized);
    invalidateConfigCaches();
    const changedBy = pickFirstValue(normalized?.session?.currentUser, previous?.session?.currentUser, getConfiguredCurrentUser());
    try {
        await pgQuery(
            `INSERT INTO app_config (config_key, config_value)
             VALUES ($1, $2::jsonb)
             ON CONFLICT (config_key)
             DO UPDATE SET
                config_value = EXCLUDED.config_value,
                updated_at = NOW()`,
            ['general', JSON.stringify(normalized)]
        );
    } catch (error) {
        throw new Error(`No fue posible guardar la configuración general en base de datos: ${error.message || error}`);
    }
    await recordAuditDiff({
        moduleKey: 'configuracion',
        entityType: 'app_config',
        entityKey: 'general',
        beforeValue: previous,
        afterValue: normalized,
        changedBy
    });
    return normalized;
}

function normalizeCostsRowId(value, fallback) {
    const text = String(value || '').trim();
    return text || fallback;
}

function normalizeCostsConfigRecord(config) {
    const source = config || {};
    const rowsOrDefault = (value, fallback = []) => (Array.isArray(value) && value.length ? value : fallback);
    const normalizeCoreDiameterOptions = (value, fallback = DEFAULT_COSTS_CONFIG.general.coreDiameterOptions) => {
        if (Array.isArray(value)) {
            const items = value.map((item) => String(item || '').trim()).filter(Boolean);
            return items.length ? items.slice(0, 5) : [...fallback];
        }
        const text = String(value || '').trim();
        if (!text) return [...fallback];
        const items = text.split(',').map((item) => String(item || '').trim()).filter(Boolean);
        return items.length ? items.slice(0, 5) : [...fallback];
    };
    const inferCoveragePct = (row = {}) => {
        if (row?.coveragePct !== undefined && row?.coveragePct !== null && row?.coveragePct !== '') {
            return Number(row.coveragePct || 0);
        }
        const tipo = String(row?.tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
        if (tipo.includes('barniz')) return 100;
        if (tipo.includes('solidos') || tipo.includes('blancos')) return 100;
        if (tipo.includes('textos') || tipo.includes('lineas')) return 10;
        if (tipo.includes('cmyk') || tipo.includes('policromia')) return 25;
        return Number(source?.convencional?.tintaGeneral?.coberturaTintaPct || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.coberturaTintaPct || 0);
    };
    const normalizeDepositos = (rows = [], prefix) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeCostsRowId(row?.id, `${prefix}-deposito-${index + 1}`),
        tipo: String(row?.tipo || '').trim(),
        bcm: Number(row?.bcm || 0),
        coveragePct: inferCoveragePct(row),
        gsm: Number(row?.gsm || 0)
    }));
    const normalizeMontaje = (rows = [], prefix) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeCostsRowId(row?.id, `${prefix}-montaje-${index + 1}`),
        detalle: String(row?.detalle || '').trim(),
        porEstacion: Number(row?.porEstacion || 0),
        cantidadTintas: Number(row?.cantidadTintas || 0),
        totalPies: Number(row?.totalPies || 0)
    }));
    const normalizeTiraje = (rows = [], prefix) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeCostsRowId(row?.id, `${prefix}-tiraje-${index + 1}`),
        detalle: String(row?.detalle || '').trim(),
        porcentaje: Number(row?.porcentaje || 0)
    }));
    const normalizeFinishWaste = (rows = [], prefix) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeCostsRowId(row?.id, `${prefix}-finish-${index + 1}`),
        proceso: String(row?.proceso || '').trim(),
        setupWasteFeet: Number(row?.setupWasteFeet || 0),
        operationWastePct: Number(row?.operationWastePct || 0)
    }));
    const normalizeInlineFinishSetup = (rows = [], prefix) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeCostsRowId(row?.id, `${prefix}-inline-finish-${index + 1}`),
        proceso: String(row?.proceso || '').trim(),
        minutosPorEstacion: Number(row?.minutosPorEstacion || 0),
        setupWasteFeet: Number(row?.setupWasteFeet || 0)
    }));
    const normalizeDigitalCoverageProfiles = (rows = [], prefix) => (Array.isArray(rows) ? rows : []).map((row, index) => ({
        id: normalizeCostsRowId(row?.id, `${prefix}-profile-${index + 1}`),
        tipo: String(row?.tipo || '').trim(),
        coveragePct: Number(row?.coveragePct || 0)
    }));
    const normalizeProcessDefaults = (rows = []) => {
        const sourceRows = Array.isArray(rows) ? rows : [];
        const fallbackRows = Array.isArray(DEFAULT_COSTS_CONFIG.general.processDefaults) ? DEFAULT_COSTS_CONFIG.general.processDefaults : [];
        const fallbackByKey = new Map(fallbackRows.map((item) => [String(item.key || '').trim().toLowerCase(), item]));
        const seen = new Set();
        const normalized = sourceRows.map((row, index) => {
            const key = String(row?.key || '').trim().toLowerCase();
            const fallback = fallbackByKey.get(key);
            if (!key || !fallback || seen.has(key)) return null;
            seen.add(key);
            const locked = ['macula', 'troquel'].includes(key) ? true : (row?.locked === true || String(row?.locked || '').trim().toLowerCase() === 'true');
            const active = locked ? true : (row?.active === true || String(row?.active || '').trim().toLowerCase() === 'true');
            const createEnabled = key === 'macula'
                ? true
                : (row?.createEnabled === true || row?.create === true || String(row?.createEnabled ?? row?.create ?? fallback.createEnabled ?? '').trim().toLowerCase() === 'true');
            const repeatable = row?.repeatable === true || String(row?.repeatable || '').trim().toLowerCase() === 'true';
            const hasGanttEnabled = row?.ganttEnabled !== undefined && row?.ganttEnabled !== null;
            const ganttEnabled = hasGanttEnabled
                ? (row?.ganttEnabled === true || String(row?.ganttEnabled || '').trim().toLowerCase() === 'true')
                : active;
            return {
                key,
                label: String(row?.label || fallback.label || '').trim(),
                active,
                createEnabled: active ? createEnabled : false,
                locked,
                repeatable,
                ganttEnabled,
                order: Number(row?.order || fallback.order || ((index + 1) * 10)),
                minimumCost: Math.max(0, Number(row?.minimumCost || 0))
            };
        }).filter(Boolean);
        fallbackRows.forEach((item, index) => {
            const key = String(item.key || '').trim().toLowerCase();
            if (!key || seen.has(key)) return;
            normalized.push({
                key,
                label: String(item.label || '').trim(),
                active: item.locked ? true : Boolean(item.active),
                createEnabled: key === 'macula' ? true : Boolean(item.createEnabled && (item.locked || item.active)),
                locked: Boolean(item.locked),
                repeatable: Boolean(item.repeatable),
                ganttEnabled: item.ganttEnabled === undefined ? Boolean(item.active) : Boolean(item.ganttEnabled),
                order: Number(item.order || ((index + 1) * 10)),
                minimumCost: Math.max(0, Number(item.minimumCost || 0))
            });
        });
        return normalized
            .sort((left, right) => Number(left.order || 999) - Number(right.order || 999))
            .map((item, index) => ({ ...item, order: (index + 1) * 10 }));
    };

    return {
        general: {
            notes: String(source?.general?.notes || DEFAULT_COSTS_CONFIG.general.notes || '').trim(),
            updatedAt: source?.general?.updatedAt || DEFAULT_COSTS_CONFIG.general.updatedAt || null,
            defaultRollWidth: Number(source?.general?.defaultRollWidth || DEFAULT_COSTS_CONFIG.general.defaultRollWidth || 0),
            defaultCoreDiameter: Number(source?.general?.defaultCoreDiameter || DEFAULT_COSTS_CONFIG.general.defaultCoreDiameter || 0),
            coreDiameterOptions: normalizeCoreDiameterOptions(source?.general?.coreDiameterOptions, DEFAULT_COSTS_CONFIG.general.coreDiameterOptions),
            defaultQuantityTypes: Number(source?.general?.defaultQuantityTypes || DEFAULT_COSTS_CONFIG.general.defaultQuantityTypes || 1),
            defaultCmykEnabled: String(source?.general?.defaultCmykEnabled || DEFAULT_COSTS_CONFIG.general.defaultCmykEnabled || 'true').trim().toLowerCase() === 'false' ? 'false' : 'true',
            processDefaults: normalizeProcessDefaults(source?.general?.processDefaults || DEFAULT_COSTS_CONFIG.general.processDefaults)
        },
        convencional: {
            tintaGeneral: {
                bcmGenerico: Number(source?.convencional?.tintaGeneral?.bcmGenerico || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.bcmGenerico || 0),
                coberturaTintaPct: Number(source?.convencional?.tintaGeneral?.coberturaTintaPct || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.coberturaTintaPct || 0),
                coberturaDisenoPct: Number(source?.convencional?.tintaGeneral?.coberturaDisenoPct || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.coberturaDisenoPct || 0),
                densidadUv: Number(source?.convencional?.tintaGeneral?.densidadUv || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.densidadUv || 0),
                costoLbCmyk: Number(source?.convencional?.tintaGeneral?.costoLbCmyk || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.costoLbCmyk || 0),
                costoLbBlanco: Number(source?.convencional?.tintaGeneral?.costoLbBlanco || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.costoLbBlanco || 0),
                costoLbPantone: Number(source?.convencional?.tintaGeneral?.costoLbPantone || DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.costoLbPantone || 0),
                depositos: normalizeDepositos(rowsOrDefault(source?.convencional?.tintaGeneral?.depositos, DEFAULT_COSTS_CONFIG.convencional.tintaGeneral.depositos), 'convencional')
            },
            inlineFinishSetup: normalizeInlineFinishSetup(rowsOrDefault(source?.convencional?.inlineFinishSetup, DEFAULT_COSTS_CONFIG.convencional.inlineFinishSetup), 'convencional'),
            maculaMontaje: normalizeMontaje(rowsOrDefault(source?.convencional?.maculaMontaje, DEFAULT_COSTS_CONFIG.convencional.maculaMontaje), 'convencional'),
            maculaTiraje: normalizeTiraje(rowsOrDefault(source?.convencional?.maculaTiraje, DEFAULT_COSTS_CONFIG.convencional.maculaTiraje), 'convencional'),
            finishWaste: normalizeFinishWaste(rowsOrDefault(source?.convencional?.finishWaste, DEFAULT_COSTS_CONFIG.convencional.finishWaste), 'convencional')
        },
        digital: {
            premier: {
                formulaText: String(source?.digital?.premier?.formulaText || DEFAULT_COSTS_CONFIG.digital.premier.formulaText || '').trim(),
                explanation: String(source?.digital?.premier?.explanation || DEFAULT_COSTS_CONFIG.digital.premier.explanation || '').trim(),
                comment: String(source?.digital?.premier?.comment || '').trim(),
                mode: String(source?.digital?.premier?.mode || DEFAULT_COSTS_CONFIG.digital.premier.mode || 'offline').trim().toLowerCase() === 'inline' ? 'inline' : 'offline',
                setupMin: Number(source?.digital?.premier?.setupMin || DEFAULT_COSTS_CONFIG.digital.premier.setupMin || 0),
                consumptionGm2: Number(source?.digital?.premier?.consumptionGm2 || DEFAULT_COSTS_CONFIG.digital.premier.consumptionGm2 || 0),
                costPerKg: Number(source?.digital?.premier?.costPerKg || DEFAULT_COSTS_CONFIG.digital.premier.costPerKg || 0),
                costPerM2: Number(source?.digital?.premier?.costPerM2 || DEFAULT_COSTS_CONFIG.digital.premier.costPerM2 || 0),
                offlineCostPerMeter: Number(source?.digital?.premier?.offlineCostPerMeter || DEFAULT_COSTS_CONFIG.digital.premier.offlineCostPerMeter || 0),
                maintenanceCost: Number(source?.digital?.premier?.maintenanceCost || DEFAULT_COSTS_CONFIG.digital.premier.maintenanceCost || 0)
            },
            tintaGeneral: {
                billingType: String(source?.digital?.tintaGeneral?.billingType || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.billingType || 'consumo').trim().toLowerCase() === 'clic' ? 'clic' : 'consumo',
                costPerKg: Number(source?.digital?.tintaGeneral?.costPerKg || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.costPerKg || 0),
                whiteCostPerKg: Number(source?.digital?.tintaGeneral?.whiteCostPerKg || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.whiteCostPerKg || 0),
                specialCostPerKg: Number(source?.digital?.tintaGeneral?.specialCostPerKg || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.specialCostPerKg || 0),
                clickRate: Number(source?.digital?.tintaGeneral?.clickRate || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.clickRate || 0),
                clickMode: String(source?.digital?.tintaGeneral?.clickMode || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.clickMode || 'por_estacion').trim().toLowerCase() === 'por_vuelta' ? 'por_vuelta' : 'por_estacion',
                coverageCmykPct: Number(source?.digital?.tintaGeneral?.coverageCmykPct || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.coverageCmykPct || 0),
                coverageWhitePct: Number(source?.digital?.tintaGeneral?.coverageWhitePct || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.coverageWhitePct || 0),
                cmykGm2: Number(source?.digital?.tintaGeneral?.cmykGm2 || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.cmykGm2 || 0),
                whiteGm2: Number(source?.digital?.tintaGeneral?.whiteGm2 || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.whiteGm2 || 0),
                wasteFactor: Number(source?.digital?.tintaGeneral?.wasteFactor || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.wasteFactor || 0),
                specialWashCost: Number(source?.digital?.tintaGeneral?.specialWashCost || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.specialWashCost || 0),
                formulaConsumptionText: String(source?.digital?.tintaGeneral?.formulaConsumptionText || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.formulaConsumptionText || '').trim(),
                formulaClickText: String(source?.digital?.tintaGeneral?.formulaClickText || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.formulaClickText || '').trim(),
                explanation: String(source?.digital?.tintaGeneral?.explanation || DEFAULT_COSTS_CONFIG.digital.tintaGeneral.explanation || '').trim(),
                comment: String(source?.digital?.tintaGeneral?.comment || '').trim(),
                coverageProfiles: normalizeDigitalCoverageProfiles(rowsOrDefault(source?.digital?.tintaGeneral?.coverageProfiles, DEFAULT_COSTS_CONFIG.digital.tintaGeneral.coverageProfiles), 'digital')
            },
            velocidad: {
                speedCmykMpm: Number(source?.digital?.velocidad?.speedCmykMpm || DEFAULT_COSTS_CONFIG.digital.velocidad.speedCmykMpm || 0),
                speedExtendedMpm: Number(source?.digital?.velocidad?.speedExtendedMpm || DEFAULT_COSTS_CONFIG.digital.velocidad.speedExtendedMpm || 0),
                comment: String(source?.digital?.velocidad?.comment || '').trim()
            },
            maculaMontaje: normalizeMontaje(rowsOrDefault(source?.digital?.maculaMontaje, DEFAULT_COSTS_CONFIG.digital.maculaMontaje), 'digital'),
            maculaTiraje: normalizeTiraje(rowsOrDefault(source?.digital?.maculaTiraje, DEFAULT_COSTS_CONFIG.digital.maculaTiraje), 'digital')
        }
    };
}

async function loadCostsConfig() {
    const fallback = normalizeCostsConfigRecord(DEFAULT_COSTS_CONFIG);
    try {
        const result = await pgQuery(
            `SELECT config_value
               FROM app_config
              WHERE config_key = $1
              LIMIT 1`,
            ['costos']
        );
        if (!result.rows.length) {
            return fallback;
        }
        return normalizeCostsConfigRecord(result.rows[0].config_value || {});
    } catch (error) {
        return fallback;
    }
}

async function saveCostsConfig(config) {
    const normalized = normalizeCostsConfigRecord(config);
    normalized.general.updatedAt = new Date().toISOString();
    const previous = await loadCostsConfig();
    try {
        await pgQuery(
            `INSERT INTO app_config (config_key, config_value)
             VALUES ($1, $2::jsonb)
             ON CONFLICT (config_key)
             DO UPDATE SET
                config_value = EXCLUDED.config_value,
                updated_at = NOW()`,
            ['costos', JSON.stringify(normalized)]
        );
    } catch (error) {
        return normalized;
    }
    await recordAuditDiff({
        moduleKey: 'costos',
        entityType: 'app_config',
        entityKey: 'costos',
        beforeValue: previous,
        afterValue: normalized,
        changedBy: getConfiguredCurrentUser()
    });
    return normalized;
}

function prettifyAuditToken(value) {
    return String(value || '')
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

const AUDIT_PRESENTATION_LABELS = {
    ...PRESENTATION_NAMES,
    general: 'General',
    costos: 'Costos',
    seguridad: 'Seguridad'
};

const AUDIT_FIELD_LABELS = {
    branding: 'Branding',
    contact: 'Contacto',
    general: 'General',
    layout: 'Layout',
    icons: 'Iconos',
    session: 'Sesión',
    notes: 'Notas',
    updatedAt: 'Actualizado En',
    bcmGenerico: 'BCM Genérico',
    coberturaTintaPct: 'Cobertura Tinta',
    coberturaDisenoPct: 'Cobertura Diseño',
    densidadUv: 'Densidad UV',
    costoLbCmyk: 'Costo Lb CMYK',
    costoLbBlanco: 'Costo Lb Blanco',
    costoLbPantone: 'Costo Lb Pantone',
    depositos: 'Depósitos',
    maculaMontaje: 'Merma Montaje',
    maculaTiraje: 'Merma Tiraje',
    tipo: 'Tipo',
    bcm: 'BCM',
    coveragePct: 'Cobertura %',
    gsm: 'GSM',
    detalle: 'Detalle',
    porEstacion: 'Por Estación',
    cantidadTintas: 'Cantidad Tintas',
    totalPies: 'Total Pies',
    porcentaje: 'Porcentaje',
    fullName: 'Nombre',
    username: 'Usuario',
    department: 'Departamento',
    process: 'Proceso',
    email: 'Correo',
    phone: 'Teléfono',
    phoneSecondary: 'Teléfono Secundario',
    active: 'Activo',
    permissionId: 'Permiso',
    sapSalespersonCode: 'Vendedor SAP',
    sapSalespersonName: 'Nombre Vendedor SAP',
    name: 'Nombre',
    defaultLanding: 'Entrada Predeterminada',
    modules: 'Permisos'
};

function getAuditFieldLabel(token) {
    return AUDIT_FIELD_LABELS[token] || prettifyAuditToken(token);
}

const AUDIT_MAX_VALUE_BYTES = 12000;
const AUDIT_SKIPPED_CONFIG_ROOTS = new Set(['icons']);
const AUDIT_SKIPPED_PRESENTATIONS = new Set(['notificaciones']);
const AUDIT_SKIPPED_TOKENS = new Set([
    'audit', 'auditoria',
    'notification', 'notifications', 'notificacion', 'notificaciones', 'notify',
    'floatingbutton', 'floatingbuttonconfig', 'floating_button', 'floating_button_config',
    'theme', 'tema',
    'history', 'historial',
    'calculator', 'calculadora',
    'exchange', 'exchangerate', 'tipocambio',
    'repository', 'repositorio', 'upload', 'uploads', 'attachment', 'attachments', 'archivo', 'file', 'files',
    'signature', 'firma',
    'outputtype', 'outputtypes', 'tiposalida', 'tipossalidas',
    'password', 'contrasena'
]);
const AUDIT_SKIPPED_EXACT_TOKENS = new Set([
    'logourl',
    'companylogourl',
    'loginbackgroundurl',
    'proformalogourl',
    'proformacompanyfonturl'
]);

function normalizeAuditMatchToken(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]+/g, '')
        .toLowerCase();
}

function auditValueSize(value) {
    if (value === undefined || value === null) return 0;
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function isAuditAssetString(value) {
    if (typeof value !== 'string') return false;
    const text = value.trim();
    if (!text) return false;
    if (/^(data|blob):/i.test(text)) return true;
    if (/^\/?uploads\//i.test(text)) return true;
    if (/\.(png|jpe?g|gif|webp|svg|bmp|ico|pdf|docx?|xlsx?|zip)(\?|#|$)/i.test(text)) return true;
    return text.length > AUDIT_MAX_VALUE_BYTES && /base64/i.test(text);
}

function shouldSkipAuditPath(moduleKey, pathKey) {
    const parts = String(pathKey || '').split('.').filter(Boolean);
    const tokens = parts.map(normalizeAuditMatchToken);
    if (!tokens.length) return false;

    if (moduleKey === 'configuracion') {
        if (AUDIT_SKIPPED_CONFIG_ROOTS.has(tokens[0])) return true;
        if (tokens[0] === 'presentations' && AUDIT_SKIPPED_PRESENTATIONS.has(tokens[1])) return true;
    }

    return tokens.some((token) => {
        if (AUDIT_SKIPPED_TOKENS.has(token) || AUDIT_SKIPPED_EXACT_TOKENS.has(token)) return true;
        if (token.startsWith('dieshape') || token.includes('troquelforma') || token.includes('formatroquel')) return true;
        if (token.includes('image') || token.includes('imagen') || token.includes('photo') || token.includes('avatar')) return true;
        return false;
    });
}

function shouldSkipAuditValue(value) {
    return isAuditAssetString(value) || auditValueSize(value) > AUDIT_MAX_VALUE_BYTES;
}

function normalizeAuditPrimitive(value) {
    if (value === undefined) return null;
    if (value === '') return '';
    if (value === null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'boolean') return value;
    return String(value);
}

function flattenAuditObject(value, path = [], rows = {}, options = {}) {
    const pathKey = path.join('.');
    if (pathKey && shouldSkipAuditPath(options.moduleKey, pathKey)) return rows;
    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            const rowKey = item && typeof item === 'object'
                ? String(item.id || item.key || item.tipo || item.detalle || index + 1).trim()
                : String(index + 1);
            flattenAuditObject(item, [...path, rowKey], rows, options);
        });
        return rows;
    }
    if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, nested]) => {
            flattenAuditObject(nested, [...path, key], rows, options);
        });
        return rows;
    }
    rows[pathKey] = normalizeAuditPrimitive(value);
    return rows;
}

function buildAuditMetadata(moduleKey, pathKey) {
    const parts = String(pathKey || '').split('.').filter(Boolean);
    let presentationKey = moduleKey;
    let sectionKey = parts[0] || '';
    let rowKey = '';
    let rowLabel = '';
    let fieldKey = parts[parts.length - 1] || '';
    let fieldLabel = getAuditFieldLabel(fieldKey);

    if (moduleKey === 'configuracion') {
        if (parts[0] === 'presentations') {
            presentationKey = parts[1] || 'presentaciones';
            sectionKey = parts[2] || '';
            fieldKey = parts[parts.length - 1] || '';
            fieldLabel = getAuditFieldLabel(fieldKey);
        } else {
            presentationKey = 'general';
            sectionKey = parts[0] || '';
        }
    }

    if (moduleKey === 'costos') {
        presentationKey = 'costos';
        sectionKey = parts[0] || '';
        if (parts.includes('depositos') || parts.includes('maculaMontaje') || parts.includes('maculaTiraje')) {
            rowKey = parts[2] || '';
            rowLabel = prettifyAuditToken(rowKey);
        }
    }

    return {
        presentationKey,
        presentationLabel: AUDIT_PRESENTATION_LABELS[presentationKey] || prettifyAuditToken(presentationKey),
        sectionKey,
        sectionLabel: getAuditFieldLabel(sectionKey),
        fieldKey,
        fieldLabel,
        rowKey,
        rowLabel
    };
}

function formatAuditDisplayValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
}

async function ensureAuditSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS audit_log (
            id BIGSERIAL PRIMARY KEY,
            module_key TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_key TEXT NOT NULL,
            presentation_key TEXT,
            presentation_label TEXT,
            section_key TEXT,
            section_label TEXT,
            row_key TEXT,
            row_label TEXT,
            field_key TEXT NOT NULL,
            field_label TEXT,
            old_value JSONB,
            new_value JSONB,
            old_value_display TEXT,
            new_value_display TEXT,
            changed_by TEXT,
            route TEXT,
            changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS audit_log_module_idx ON audit_log (module_key, changed_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS audit_log_presentation_idx ON audit_log (presentation_key, changed_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log (changed_by, changed_at DESC)`);
}

async function insertAuditEntries(entries = []) {
    if (!entries.length) return;
    for (const entry of entries) {
        await pgQuery(
            `INSERT INTO audit_log (
                module_key, entity_type, entity_key, presentation_key, presentation_label,
                section_key, section_label, row_key, row_label, field_key, field_label,
                old_value, new_value, old_value_display, new_value_display, changed_by, route
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17
            )`,
            [
                entry.moduleKey,
                entry.entityType,
                entry.entityKey,
                entry.presentationKey || null,
                entry.presentationLabel || null,
                entry.sectionKey || null,
                entry.sectionLabel || null,
                entry.rowKey || null,
                entry.rowLabel || null,
                entry.fieldKey,
                entry.fieldLabel || null,
                entry.oldValue === undefined ? null : JSON.stringify(entry.oldValue),
                entry.newValue === undefined ? null : JSON.stringify(entry.newValue),
                formatAuditDisplayValue(entry.oldValue),
                formatAuditDisplayValue(entry.newValue),
                entry.changedBy || getConfiguredCurrentUser(),
                entry.route || null
            ]
        );
    }
}

async function recordAuditDiff({ moduleKey, entityType, entityKey, beforeValue, afterValue, changedBy, route }) {
    const beforeFlat = flattenAuditObject(beforeValue || {}, [], {}, { moduleKey });
    const afterFlat = flattenAuditObject(afterValue || {}, [], {}, { moduleKey });
    const ignoredFields = new Set(['general.updatedAt']);
    const keys = new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)]);
    const entries = [];

    keys.forEach((pathKey) => {
        if (ignoredFields.has(pathKey)) return;
        if (shouldSkipAuditPath(moduleKey, pathKey)) return;
        const previous = beforeFlat[pathKey];
        const next = afterFlat[pathKey];
        if (shouldSkipAuditValue(previous) || shouldSkipAuditValue(next)) return;
        if (JSON.stringify(previous) === JSON.stringify(next)) return;
        const meta = buildAuditMetadata(moduleKey, pathKey);
        entries.push({
            moduleKey,
            entityType,
            entityKey,
            ...meta,
            oldValue: previous,
            newValue: next,
            changedBy,
            route
        });
    });

    await insertAuditEntries(entries);
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase();
}

function repairMojibakeText(value) {
    const text = String(value ?? '');
    if (!/[ÃÂâ�]/.test(text)) return text;
    try {
        const decoded = Buffer.from(text, 'latin1').toString('utf8');
        const badBefore = (text.match(/[ÃÂâ�]/g) || []).length;
        const badAfter = (decoded.match(/[ÃÂâ�]/g) || []).length;
        if (decoded && badAfter < badBefore) return decoded;
    } catch (error) {
        // Keep the original text when it is not a latin1/utf8 mojibake case.
    }
    return text
        .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú')
        .replace(/Ã/g, 'Á').replace(/Ã‰/g, 'É').replace(/Ã/g, 'Í').replace(/Ã“/g, 'Ó').replace(/Ãš/g, 'Ú')
        .replace(/Ã±/g, 'ñ').replace(/Ã‘/g, 'Ñ').replace(/Â¿/g, '¿').replace(/Â¡/g, '¡').replace(/Âº/g, 'º')
        .replace(/Â/g, '');
}

function sanitizeAdminUserText(value, fallback = '') {
    return repairMojibakeText(value ?? fallback).trim();
}

function normalizeProformaCurrencyList(value, fallbackJson = DEFAULT_GENERAL_CONFIG.general.proformaCurrenciesJson) {
    const fallback = (() => {
        try {
            return JSON.parse(fallbackJson);
        } catch (error) {
            return [{ code: 'CRC', label: 'Colones', symbol: '₡', exchangeRate: 1 }];
        }
    })();
    const input = typeof value === 'string'
        ? (() => {
            try {
                return JSON.parse(value);
            } catch (error) {
                return [];
            }
        })()
        : value;
    const rows = Array.isArray(input) ? input : [];
    const normalized = rows.map((row) => ({
        code: String(row?.code || '').trim().toUpperCase().slice(0, 10),
        label: String(row?.label || '').trim().slice(0, 80),
        symbol: String(row?.symbol || '').trim().slice(0, 10),
        exchangeRate: Number(row?.exchangeRate || 0)
    })).filter((row) => row.code && row.label && Number.isFinite(row.exchangeRate) && row.exchangeRate > 0);
    return normalized.length ? normalized : fallback;
}

function normalizeProformaValidityOptions(value, fallbackJson = DEFAULT_GENERAL_CONFIG.general.proformaValidityOptionsJson) {
    const fallback = [
        '5 días',
        '8 días',
        '15 días',
        '22 días',
        '30 días',
        'De acuerdo a programación con el cliente',
        'Según lo establecido en el cartel de compra.'
    ];
    try {
        const source = typeof value === 'string' ? JSON.parse(value || fallbackJson || '[]') : value;
        const rows = Array.isArray(source) ? source : [];
        const cleaned = rows.map((item) => sanitizeAdminUserText(item).trim()).filter(Boolean);
        return cleaned.length ? [...new Set(cleaned)] : fallback;
    } catch (_) {
        return fallback;
    }
}

function normalizeAdminUserRecord(row = {}) {
    const floatingButtonConfig = row.floating_button_config && typeof row.floating_button_config === 'object'
        ? row.floating_button_config
        : (() => {
            try {
                return JSON.parse(String(row.floating_button_config || '{}'));
            } catch (error) {
                return {};
            }
        })();
    return {
        id: Number(row.id || 0),
        name: sanitizeAdminUserText(row.full_name),
        username: sanitizeAdminUserText(row.username),
        password: sanitizeAdminUserText(row.password),
        department: sanitizeAdminUserText(row.department),
        process: sanitizeAdminUserText(row.process),
        photoUrl: sanitizeAdminUserText(row.photo_url),
        signatureUrl: sanitizeAdminUserText(row.signature_url),
        email: sanitizeAdminUserText(row.email),
        phone: sanitizeAdminUserText(row.phone),
        phoneSecondary: sanitizeAdminUserText(row.phone_secondary),
        notificationEmail: Boolean(row.notify_email),
        notificationWhatsapp: Boolean(row.notify_whatsapp),
        notificationSms: Boolean(row.notify_sms),
        active: row.is_active !== false,
        permissionId: row.permission_id == null ? null : Number(row.permission_id),
        permissionName: sanitizeAdminUserText(row.permission_name),
        defaultLanding: sanitizeOptionalPresentationKey(row.default_landing),
        sapSalespersonCode: Number.isFinite(Number(row.sap_salesperson_code)) && Number(row.sap_salesperson_code) > 0 ? Number(row.sap_salesperson_code) : null,
        sapSalespersonName: Number.isFinite(Number(row.sap_salesperson_code)) && Number(row.sap_salesperson_code) > 0 ? sanitizeAdminUserText(row.sap_salesperson_name) : '',
        floatingButtonConfig: floatingButtonConfig && typeof floatingButtonConfig === 'object' && !Array.isArray(floatingButtonConfig) ? floatingButtonConfig : {}
    };
}

function buildAdminUserAuditRecord(row = {}) {
    const user = normalizeAdminUserRecord(row);
    return {
        fullName: user.name,
        username: user.username,
        department: user.department,
        process: user.process,
        email: user.email,
        phone: user.phone,
        phoneSecondary: user.phoneSecondary,
        active: user.active,
        permissionId: user.permissionId,
        defaultLanding: user.defaultLanding,
        sapSalespersonCode: user.sapSalespersonCode,
        sapSalespersonName: user.sapSalespersonName
    };
}

function buildAdminPermissionAuditRecord(row = {}) {
    const permission = normalizeAdminPermissionRecord(row);
    return {
        name: permission.name,
        defaultLanding: permission.defaultLanding,
        modules: permission.modules
    };
}

function getAuditActorFromRequest(req) {
    const session = readErpSessionFromRequest(req);
    return pickFirstValue(session?.name, session?.username, getConfiguredCurrentUser());
}

async function ensureAdminUsersSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id BIGSERIAL PRIMARY KEY,
            full_name TEXT NOT NULL,
            username TEXT NOT NULL DEFAULT '',
            password TEXT NOT NULL DEFAULT '',
            department TEXT NOT NULL DEFAULT '',
            process TEXT NOT NULL DEFAULT '',
            photo_url TEXT NOT NULL DEFAULT '',
            signature_url TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL DEFAULT '',
            phone TEXT NOT NULL DEFAULT '',
            phone_secondary TEXT NOT NULL DEFAULT '',
            notify_email BOOLEAN NOT NULL DEFAULT FALSE,
            notify_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
            notify_sms BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            permission_id BIGINT REFERENCES admin_permissions(id) ON DELETE SET NULL,
            default_landing TEXT NOT NULL DEFAULT '',
            floating_button_config JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permission_id BIGINT REFERENCES admin_permissions(id) ON DELETE SET NULL`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS signature_url TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone_secondary TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT FALSE`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN NOT NULL DEFAULT FALSE`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN NOT NULL DEFAULT FALSE`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS floating_button_config JSONB NOT NULL DEFAULT '{}'::jsonb`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS default_landing TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS sap_salesperson_code BIGINT`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS sap_salesperson_name TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS admin_users_name_idx ON admin_users (full_name)`);
}

function normalizeAdminPermissionNameForSalesperson(value = '') {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function adminPermissionRequiresSapSalesperson(permissionName = '') {
    const normalized = normalizeAdminPermissionNameForSalesperson(permissionName);
    return normalized === 'vendedores' || normalized === 'vendedores cotizadores';
}

async function getAdminPermissionNameById(permissionId) {
    const normalizedId = Number(permissionId);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return '';
    const result = await pgQuery(
        `SELECT permission_name
           FROM admin_permissions
          WHERE id = $1
          LIMIT 1`,
        [normalizedId]
    );
    return sanitizeAdminUserText(result.rows[0]?.permission_name);
}

async function findSapSalespersonConfigByCode(salespersonCode) {
    const normalizedCode = Number(salespersonCode);
    if (!Number.isFinite(normalizedCode) || normalizedCode <= 0) return null;
    const result = await pgQuery(
        `SELECT id, salesperson_name, sales_person_code, profit_center_code, is_active
           FROM sap_salesperson_profit_centers
          WHERE sales_person_code = $1
            AND COALESCE(is_active, TRUE) = TRUE
          ORDER BY id
          LIMIT 1`,
        [normalizedCode]
    );
    return result.rows[0] || null;
}

async function resolveAdminUserSapSalespersonAssignment({ permissionId, rawCode, fallbackCode = null, fallbackName = '' } = {}) {
    const permissionName = await getAdminPermissionNameById(permissionId);
    const requiresSalesperson = adminPermissionRequiresSapSalesperson(permissionName);
    const codeCandidate = rawCode === undefined || rawCode === null || rawCode === ''
        ? fallbackCode
        : rawCode;
    const normalizedCode = codeCandidate == null || codeCandidate === ''
        ? null
        : Number(codeCandidate);

    if (!requiresSalesperson) {
        if (!Number.isFinite(normalizedCode) || normalizedCode <= 0) {
            return {
                sapSalespersonCode: null,
                sapSalespersonName: ''
            };
        }
        const salesperson = await findSapSalespersonConfigByCode(normalizedCode);
        return {
            sapSalespersonCode: normalizedCode,
            sapSalespersonName: sanitizeAdminUserText(salesperson?.salesperson_name, fallbackName)
        };
    }

    if (!Number.isFinite(normalizedCode) || normalizedCode <= 0) {
        return {
            sapSalespersonCode: null,
            sapSalespersonName: ''
        };
    }
    const salesperson = await findSapSalespersonConfigByCode(normalizedCode);
    if (!salesperson) {
        throw new Error('El vendedor SAP seleccionado no existe o está inactivo.');
    }
    return {
        sapSalespersonCode: normalizedCode,
        sapSalespersonName: sanitizeAdminUserText(salesperson.salesperson_name)
    };
}

function normalizePersistedSapSalespersonAssignment(assignment = {}) {
    const normalizedCode = Number(assignment?.sapSalespersonCode);
    if (!Number.isFinite(normalizedCode) || normalizedCode <= 0) {
        return {
            sapSalespersonCode: null,
            sapSalespersonName: ''
        };
    }
    return {
        sapSalespersonCode: normalizedCode,
        sapSalespersonName: sanitizeAdminUserText(assignment?.sapSalespersonName)
    };
}

async function ensureQuoteProformasSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS quote_proformas (
            id BIGSERIAL PRIMARY KEY,
            quote_code TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'open',
            issue_date_fixed TIMESTAMPTZ NULL,
            closed_at TIMESTAMPTZ NULL,
            closed_reason TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS quote_proformas_quote_code_idx ON quote_proformas (quote_code)`);
}

function sanitizePermissionAccess(value) {
    const emptyFlags = { view: false, create: false, edit: false };
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return {
            view: Boolean(value.view || value.create || value.edit),
            create: Boolean(value.create),
            edit: Boolean(value.edit)
        };
    }
    if (Array.isArray(value)) {
        const normalizedList = value.map((item) => String(item || '').trim().toLowerCase());
        return {
            view: normalizedList.includes('view') || normalizedList.includes('create') || normalizedList.includes('edit'),
            create: normalizedList.includes('create'),
            edit: normalizedList.includes('edit')
        };
    }
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized || normalized === 'none') return emptyFlags;
    if (normalized === 'view') return { view: true, create: false, edit: false };
    if (normalized === 'create') return { view: true, create: true, edit: false };
    if (normalized === 'edit') return { view: true, create: true, edit: true };
    const tokenList = normalized.split(/[,\s|/+]+/).filter(Boolean);
    return {
        view: tokenList.includes('view') || tokenList.includes('create') || tokenList.includes('edit'),
        create: tokenList.includes('create') || tokenList.includes('edit'),
        edit: tokenList.includes('edit')
    };
}

function sanitizePresentationKey(value) {
    const normalized = String(value || '').trim();
    return PRESENTATION_NAMES[normalized] ? normalized : 'dashboard';
}

function sanitizeOptionalPresentationKey(value) {
    const normalized = String(value || '').trim();
    return PRESENTATION_NAMES[normalized] ? normalized : '';
}

function normalizePermissionMatrix(input = {}) {
    const output = {};
    Object.keys(PRESENTATION_NAMES).forEach((key) => {
        output[key] = sanitizePermissionAccess(input[key]);
    });
    return output;
}

function isSuperAdminPermissionName(value) {
    const name = sanitizeAdminUserText(value);
    return /administrador(?:es)?|implementador(?:es)?|emergencia/i.test(name);
}

function permissionCanViewAllQuotes(name = '') {
    const normalized = normalizeAdminPermissionNameForSalesperson(name);
    if (!normalized) return true;
    if (isSuperAdminPermissionName(normalized)) return true;
    // Coincidencia flexible: si el permiso contiene "vendedor" (sin ser admin/gerente), se filtra
    if (normalized.includes('vendedor')) return false;
    return true;
}

function buildFullPermissionMatrix() {
    const output = {};
    Object.keys(PRESENTATION_NAMES).forEach((key) => {
        output[key] = { view: true, create: true, edit: true };
    });
    return output;
}

function readPermissionModulesFromRequest(req) {
    const raw = String(req.get?.('x-erp-session') || '').trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed?.modules && typeof parsed.modules === 'object' ? parsed.modules : null;
    } catch (error) {
        return {};
    }
}

function readErpSessionFromRequest(req) {
    const raw = String(req.get?.('x-erp-session') || '').trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
        return null;
    }
}

function getRequestUserName(req, fallback = '') {
    const session = readErpSessionFromRequest(req);
    return pickFirstValue(
        sanitizeAdminUserText(session?.fullName),
        sanitizeAdminUserText(session?.name),
        sanitizeAdminUserText(session?.user),
        sanitizeAdminUserText(session?.username),
        sanitizeAdminUserText(session?.email),
        sanitizeAdminUserText(fallback),
        getConfiguredCurrentUser()
    );
}

function getRequestUserPhotoUrl(req, fallback = '') {
    const session = readErpSessionFromRequest(req);
    return pickFirstValue(
        sanitizeAdminUserText(session?.photoUrl),
        sanitizeAdminUserText(session?.photo_url),
        sanitizeAdminUserText(session?.avatarUrl),
        sanitizeAdminUserText(session?.avatar_url),
        sanitizeAdminUserText(fallback)
    );
}

function canRequestCreateModule(req, moduleKey) {
    const session = readErpSessionFromRequest(req);
    if (isSuperAdminPermissionName(session?.permissionName)) return true;

    const modules = readPermissionModulesFromRequest(req);
    if (!modules) return true;
    const flags = sanitizePermissionAccess(modules[moduleKey]);
    return Boolean(flags.create);
}

function normalizeAdminPermissionRecord(row = {}, { forAccessCheck = false } = {}) {
    const permissionName = sanitizeAdminUserText(row.permission_name);
    // Cuando se evalua acceso a modulos (login, navegacion), los super-permisos
    // siempre tienen acceso total independientemente de lo guardado en DB.
    // En el panel de administracion de permisos se devuelven los modulos reales
    // para que el implementador pueda editarlos libremente.
    const modules = (forAccessCheck && isSuperAdminPermissionName(permissionName))
        ? buildFullPermissionMatrix()
        : normalizePermissionMatrix(row.module_permissions || {});
    return {
        id: Number(row.id || 0),
        name: permissionName,
        defaultLanding: sanitizePresentationKey(row.default_landing),
        modules
    };
}

async function buildAdminSecurityDiagnostics() {
    const [orphanUsersResult, usersWithoutPermissionResult, permissionsResult] = await Promise.all([
        pgQuery(
            `SELECT u.id, u.full_name, u.username, u.permission_id
               FROM admin_users u
          LEFT JOIN admin_permissions p
                 ON p.id = u.permission_id
              WHERE u.permission_id IS NOT NULL
                AND p.id IS NULL
              ORDER BY LOWER(TRIM(u.username)), u.id`
        ),
        pgQuery(
            `SELECT COUNT(*)::int AS total
               FROM admin_users
              WHERE permission_id IS NULL`
        ),
        pgQuery(
            `SELECT p.id, p.permission_name, p.default_landing, p.module_permissions,
                    COUNT(u.id)::int AS assigned_users
               FROM admin_permissions p
          LEFT JOIN admin_users u
                 ON u.permission_id = p.id
           GROUP BY p.id, p.permission_name, p.default_landing, p.module_permissions
           ORDER BY LOWER(p.permission_name), p.id`
        )
    ]);

    return {
        orphanUsers: orphanUsersResult.rows.map((row) => ({
            id: Number(row.id || 0),
            name: sanitizeAdminUserText(row.full_name, row.username),
            username: sanitizeAdminUserText(row.username),
            permissionId: row.permission_id == null ? null : Number(row.permission_id)
        })),
        usersWithoutPermission: Number(usersWithoutPermissionResult.rows[0]?.total || 0),
        permissions: permissionsResult.rows.map((row) => ({
            ...normalizeAdminPermissionRecord(row),
            assignedUsers: Number(row.assigned_users || 0)
        }))
    };
}

async function ensureAdminPermissionsSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS admin_permissions (
            id BIGSERIAL PRIMARY KEY,
            permission_name TEXT NOT NULL,
            default_landing TEXT NOT NULL DEFAULT 'dashboard',
            module_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS admin_permissions_name_idx ON admin_permissions (permission_name)`);
    await pgQuery(`
        UPDATE admin_permissions
           SET module_permissions = jsonb_set(
                   COALESCE(module_permissions, '{}'::jsonb),
                   '{productos}',
                   to_jsonb(COALESCE(module_permissions->>'cotizaciones', 'none')),
                   true
               ),
               updated_at = NOW()
         WHERE NOT COALESCE(module_permissions, '{}'::jsonb) ? 'productos'
    `);
    await pgQuery(`
        UPDATE admin_permissions
           SET module_permissions = jsonb_set(
                   COALESCE(module_permissions, '{}'::jsonb),
                   '{sap}',
                   to_jsonb(COALESCE(module_permissions->>'configuracion-general', 'none')),
                   true
               ),
               updated_at = NOW()
         WHERE NOT COALESCE(module_permissions, '{}'::jsonb) ? 'sap'
    `);
}

async function ensureSecuritySeed() {
    const permissionsCount = await pgQuery(`SELECT COUNT(*)::int AS total FROM admin_permissions`);
    let adminPermissionId = null;

    if (Number(permissionsCount.rows[0]?.total || 0) === 0) {
        const fullAccess = {};
        Object.keys(PRESENTATION_NAMES).forEach((key) => {
            fullAccess[key] = { view: true, create: true, edit: true };
        });
        const insertedPermission = await pgQuery(
            `INSERT INTO admin_permissions (permission_name, default_landing, module_permissions)
             VALUES ($1, $2, $3::jsonb)
             RETURNING id`,
            ['Administrador', 'dashboard', JSON.stringify(fullAccess)]
        );
        adminPermissionId = Number(insertedPermission.rows[0]?.id || 0) || null;
    } else {
        const permissionRow = await pgQuery(
            `SELECT id
               FROM admin_permissions
              ORDER BY CASE WHEN LOWER(permission_name) = 'administrador' THEN 0 ELSE 1 END, id
              LIMIT 1`
        );
        adminPermissionId = Number(permissionRow.rows[0]?.id || 0) || null;
    }

    const usersCount = await pgQuery(`SELECT COUNT(*)::int AS total FROM admin_users`);
    if (Number(usersCount.rows[0]?.total || 0) === 0) {
        await pgQuery(
            `INSERT INTO admin_users (full_name, username, password, department, process, photo_url, signature_url, permission_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            ['Administrador', 'admin', 'admin', 'Administración', 'General', '', '', adminPermissionId]
        );
    }
}

function renderSellerMobileHtml() {
    return fs.readFileSync(path.join(__dirname, 'public', 'vendedores-mobile.html'), 'utf8');
}

function isPhoneUserAgent(userAgent) {
    return /android.+mobile|iphone|ipod|windows phone|blackberry|opera mini|mobile/i.test(String(userAgent || ''));
}

async function shouldServeSellerMobile(req) {
    const forcedMobile = String(req.query.mobilePreview || '').trim() === '1' || String(req.query.view || '').trim() === 'mobile';
    const forcedDesktop = String(req.query.mobilePreview || '').trim() === '0' || String(req.query.view || '').trim() === 'desktop';
    if (forcedMobile) return true;
    if (forcedDesktop) return false;

    const config = await loadGeneralConfig();
    const enabled = String(config?.general?.mobileSellerAutoRoute ?? 'true') !== 'false';
    if (!enabled) return false;
    return isPhoneUserAgent(req.headers['user-agent']);
}

function isDigitalPrintingReference(value) {
    const normalized = normalizeText(value);
    return normalized.includes('digit') || normalized.includes('hp');
}

function hasDigitalPrintingContext({ processType = '', machineName = '', raw = {} } = {}) {
    return isDigitalPrintingReference([
        processType,
        machineName,
        raw['DIGITAL | MAQUINA'],
        raw['CONV | MAQUINA'],
        raw['MAQUINA IMPRESION']
    ].filter(Boolean).join(' '));
}

function zeroDigitalPlateCostFields(rawData = {}) {
    rawData['GENERAL | 4 | COSTO CYREL'] = 0;
    return rawData;
}

function slugify(value) {
    return normalizeText(value).replace(/\s+/g, '_');
}

function toNumber(value, fallback = 0) {
    if (value === '' || value === null || typeof value === 'undefined') {
        return fallback;
    }

    const normalized = typeof value === 'string'
        ? value.replace(/\./g, '').replace(',', '.')
        : value;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function readWorkbookRows(fileName) {
    const fullPath = path.join(DATA_ROOT, fileName);
    if (!fs.existsSync(fullPath)) {
        return [];
    }

    const workbook = XLSX.readFile(fullPath, { cellDates: true });
    const [firstSheet] = workbook.SheetNames;
    const sheet = workbook.Sheets[firstSheet];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function classifyMachineCategory(process, subprocess) {
    const raw = `${process} ${subprocess}`.toLowerCase();

    if (raw.includes('impresi')) return 'impresion';
    if (raw.includes('troquel')) return 'troquelado';
    if (raw.includes('laminad')) return 'laminado';
    if (raw.includes('estamp')) return 'estampado';
    if (raw.includes('rebobin')) return 'rebobinado';
    if (raw.includes('empaque')) return 'empaque';
    if (raw.includes('preprensa')) return 'preprensa';
    if (raw.includes('barniz')) return 'barniz';

    return 'otros';
}

function loadMachineCatalog() {
    return readWorkbookRows('Inventario de Maquinas Flexo.xlsx').map((row) => {
        const normalizedRow = Object.fromEntries(
            Object.entries(row || {}).map(([key, value]) => [repairUtf8Text(String(key || '')), value])
        );
        const machineName = normalizedRow['Nombre de la máquina'] || normalizedRow.Modelo || normalizedRow.Marca || 'Sin nombre';
        const process = normalizedRow.Proceso || '';
        const subprocess = normalizedRow.Subproceso || '';

        return {
            id: slugify(`${machineName}-${process}-${subprocess}`),
            brand: normalizedRow.Marca || '',
            model: normalizedRow.Modelo || '',
            machineName,
            process,
            subprocess,
            category: classifyMachineCategory(process, subprocess),
            workUnit: normalizedRow['Unidad de trabajo'] || '',
            setupBaseMinutes: toNumber(normalizedRow['Tiempo de preparación general (sin estaciones)'], 0),
            setupPerStationMinutes: toNumber(normalizedRow['Tiempo por estación'], 0),
            setupExtraMinutes: toNumber(normalizedRow['Tiempo adicional de preparación'], 0),
            areaFactor: toNumber(normalizedRow['Factor de proceso por área'], 0),
            processVariables: normalizedRow['Variables que afectan el tiempo'] || '',
            consumptionType: normalizedRow['Tipo de consumo'] || '',
            productionSpeed: toNumber(normalizedRow['Velocidad de producción'], 0),
            hourlyMachineCost: toNumber(normalizedRow['Costo Hora Maquina'], 0),
            hourlyOperatorCost: toNumber(normalizedRow['Costo por hora del operador'], 0),
            timeFormula: normalizedRow['Formula Calculo Tiempo'] || '',
            costFormula: normalizedRow['Fórmula Calculo Costo'] || ''
        };
    }).filter((machine) => machine.machineName);
}

function loadMaterialsCatalog() {
    return readWorkbookRows('Inventario de Materia Prima Flexo.xlsx').map((row) => ({
        id: String(row['Id Material'] || '').trim(),
        name: row.Nombre || row['Descripcion con Medidas'] || '',
        displayName: row['Descripcion con Medidas'] || row['Descripcion para Proforma'] || row.Nombre || '',
        presentationType: row['Tipo Presentacion'] || '',
        active: String(row['Material Activo | Check'] || '').toUpperCase() === 'SI',
        conventionalEnabled: String(row['Material Flexo Conv | Check'] || '').toUpperCase() === 'SI',
        digitalEnabled: String(row['Material Flexo Digital | Check'] || '').toUpperCase() === 'SI',
        widthInches: toNumber(row['Dimensiones | Ancho'], null),
        lengthValue: toNumber(row['Dimensiones | Largo'], null),
        costPerKgUsd: toNumber(row['Precio por KG | Cotizacion | Dol'], null),
        costPerLinearMeterUsd: toNumber(row['Precio por Metro Lineal | Cotizacion | Dol'], null),
        costPerUnitUsd: toNumber(row['Precio Unitario | Cotizacion | Dol'], null),
        provider: row.Proveedor || ''
    })).filter((material) => material.id);
}

function loadDieCatalog() {
    return readWorkbookRows('Troqueles Flexo.xlsx').map((row) => ({
        id: String(row['Id Troquel'] || '').trim(),
        description: row['Descripcion Troquel'] || row['Descripcion Troquel COTIZACIONES'] || '',
        category: row.Clasificacion || row['TIPO TROQUEL'] || '',
        dimensions: row['Dimensiones Troquel'] || '',
        teeth: toNumber(row.Dientes, null),
        rows: toNumber(row.Filas, null),
        repetitions: toNumber(row.Repeticiones, null),
        materialWidth: toNumber(row['Ancho Material'], null),
        status: row['Estado Troquel'] || '',
        useDigital: String(row['USO DIGITAL'] || '').toUpperCase() === 'SI' || normalizeText(row['Tipo de troquel2']).includes('vericut'),
        useConventional: String(row['USO CONVENCIONAL'] || '').toUpperCase() === 'SI' || normalizeText(row['Tipo de troquel2']).includes('convencional')
    })).filter((die) => die.id);
}

function loadProductCatalog() {
    return readWorkbookRows('Catalogo Productos Flexografia.xlsx').map((row) => ({
        id: String(row['Id Producto'] || '').trim(),
        lineId: String(row['Id Linea'] || '').trim(),
        quoteId: String(row['Id Cotizacion'] || '').trim(),
        clientId: String(row['Cliente | ID'] || '').trim(),
        clientName: row.Cliente || '',
        code: String(row['Codigo Producto'] || '').trim(),
        jobName: row['Nombre Trabajo'] || '',
        productType: row['Tipo Producto'] || '',
        department: row.Departamento || '',
        materialName: row.Material || '',
        quotedMachine: row['Maquina Cotizada'] || '',
        dieId: row['TROQUEL | ID'] || '',
        labelsPerRoll: toNumber(row['Cantidad Etiquetas x Rollo'], null),
        coreWidth: toNumber(row['Ancho Core'], null),
        coreDiameter: row['Diametro Core'] || '',
        totalFeetQuoted: toNumber(row['Total Pies Cotizados'], null),
        quantityProducts: toNumber(row['Cantidad Productos'], null),
        quantityTypes: toNumber(row['Cantidad Tipos Cotizados'], null),
        tintCount: toNumber(row['Cantidad Tintas'], null),
        priceUnit: toNumber(row['PRECIO UNITARIO'], null),
        totalPrice: toNumber(row['PRECIO TOTAL'], null),
        currency: row.MONEDA || '',
        outputType: row['Tipo Salida | Nombre a Mostrar'] || row['Tipo Salida | ID'] || '',
        applicationType: row['TIPO ETIQUETADO'] || '',
        width: toNumber(row['Dimension | Ancho Decimal'], null),
        length: toNumber(row['Dimension | Largo Decimal'], null),
        whiteInk: String(row['TINTA BLANCA | CHECK'] || '').toUpperCase() === 'SI',
        doubleWhite: String(row['TINTA BLANCA | DOBLE PASADA | CHECK'] || '').toUpperCase() === 'SI'
    })).filter((product) => product.id);
}

function loadGlobalCostConfig() {
    const [row] = readWorkbookRows('Costos Flexo.xlsx');
    if (!row) {
        return { commercialSettings: {}, processDefaults: {}, rawFields: {} };
    }

    return {
        commercialSettings: {
            exchangeRateFixed: toNumber(row['TIPO CAMBIO FIJO'], null),
            profitabilityPercent: toNumber(row['Porcentaje Rendimiento'], null),
            profitabilityMinPercent: toNumber(row['Porcentaje Minimo'], null),
            profitabilityMaxPercent: toNumber(row['Porcentaje Maximo'], null),
            contingencyPercent: toNumber(row['Porcentaje Imprevistos'], null),
            financialPercent: toNumber(row['Porcentaje Financieros'], null),
            extraPercent: toNumber(row['Porcentaje Adicional'], null),
            digitalPercent: toNumber(row['Porcentaje | Flexo Digital'], null),
            conventionalPercent: toNumber(row['Porcentaje | Flexo Convencional'], null),
            minimumCost: toNumber(row['COSTOS | COSTO MINIMO'], null)
        },
        processDefaults: {
            sri: {
                minuteCost: toNumber(row['COSTOS | SRI | MINUTO MAQUINA'], null),
                hourCost: toNumber(row['COSTOS | SRI | HORA MAQUINA'], null),
                runFactor: toNumber(row['COSTOS | SRI | FACTOR TIRAJE'], null),
                setupFactor: toNumber(row['COSTOS | SRI | FACTOR MONTAJE'], null)
            },
            packaging: {
                setupMinutes: toNumber(row['Costos | Empaque Flex | Tiempo Setup'], null),
                unitsPerMinute: toNumber(row['Costos | Empaque Flex | Productos x Minuto'], null),
                machineMinuteCost: toNumber(row['Costos | Empaque Flex | Minuto Maquina'], null),
                machineHourCost: toNumber(row['Costos | Empaque Flex | Hora Maquina'], null)
            }
        },
        rawFields: row
    };
}

function loadFlexoCatalogs() {
    const machines = loadMachineCatalog();
    const machineCategories = machines.reduce((accumulator, machine) => {
        if (!accumulator[machine.category]) {
            accumulator[machine.category] = [];
        }
        accumulator[machine.category].push(machine);
        return accumulator;
    }, {});

    return {
        machines,
        machineCategories,
        materials: loadMaterialsCatalog(),
        dies: loadDieCatalog(),
        products: loadProductCatalog(),
        globalCosts: loadGlobalCostConfig()
    };
}

function calcularCotizacionFlexografia(payload) {
    const proceso = payload.proceso === 'digital' ? 'digital' : 'convencional';
    const cantidad = Math.max(0, Math.ceil(toNumber(payload.cantidad)));
    const anchoEtiqueta = Math.max(0, toNumber(payload.anchoEtiqueta));
    const altoEtiqueta = Math.max(0, toNumber(payload.altoEtiqueta));
    const anchoRollo = Math.max(anchoEtiqueta, toNumber(payload.anchoRollo));
    const separacionHorizontal = Math.max(0, toNumber(payload.separacionHorizontal));
    const separacionVertical = Math.max(0, toNumber(payload.separacionVertical));
    const mermaPorcentaje = Math.max(0, toNumber(payload.mermaPorcentaje, proceso === 'digital' ? 5 : 8));
    const cantidadCambios = Math.max(1, Math.ceil(toNumber(payload.cantidadCambios, 1)));
    const cantidadPantones = Math.max(0, Math.ceil(toNumber(payload.cantidadPantones)));
    const usaBlanco = Boolean(payload.usaBlanco);
    const doblePasadaBlanco = Boolean(payload.doblePasadaBlanco);
    const cmyk = Boolean(payload.cmyk);
    const tintasBase = (cmyk ? 4 : 0) + cantidadPantones + (usaBlanco ? 1 : 0);
    const tintasEfectivas = Math.max(1, tintasBase + (usaBlanco && doblePasadaBlanco ? 1 : 0));
    const pasosPorLinea = Math.max(1, Math.floor((anchoRollo + separacionHorizontal) / Math.max(0.01, anchoEtiqueta + separacionHorizontal)));
    const filas = cantidad > 0 ? Math.ceil(cantidad / pasosPorLinea) : 0;
    const largoTotalPulgadas = filas * (altoEtiqueta + separacionVertical);
    const piesLineales = largoTotalPulgadas / 12;
    const msiBase = (anchoRollo * largoTotalPulgadas) / 1000;
    const factorMerma = 1 + (mermaPorcentaje / 100);
    const piesLinealesConMerma = piesLineales * factorMerma;
    const msiConMerma = msiBase * factorMerma;
    const costoMaterialPorMsi = toNumber(payload.costoMaterialPorMsi);
    const costoMaterialPorKg = toNumber(payload.costoMaterialPorKg);
    const gramaje = Math.max(0, toNumber(payload.gramaje));
    const areaM2 = (anchoRollo * 0.0254) * (largoTotalPulgadas * 0.0254);
    const pesoKg = areaM2 * (gramaje / 1000) * factorMerma;
    const costoMaterial = costoMaterialPorKg > 0 && gramaje > 0 ? pesoKg * costoMaterialPorKg : msiConMerma * costoMaterialPorMsi;
    const costoHoraPreprensa = toNumber(payload.costoHoraPreprensa);
    const minutosPreprensaPorCambio = toNumber(payload.minutosPreprensaPorCambio, 10);
    const costoPreprensaBase = Boolean(payload.incluirPreprensa) ? costoHoraPreprensa : 0;
    const costoPreprensaCambios = cantidadCambios > 1 ? (cantidadCambios - 1) * minutosPreprensaPorCambio * (costoHoraPreprensa / 60) : 0;
    const costoPreprensa = costoPreprensaBase + costoPreprensaCambios;
    const costoMinutoMaquina = toNumber(payload.costoMinutoMaquina);
    const factorMontajePorEstacion = toNumber(payload.factorMontajePorEstacion, proceso === 'digital' ? 4 : 6);
    const costoMontaje = proceso === 'convencional' ? tintasEfectivas * factorMontajePorEstacion * cantidadCambios * costoMinutoMaquina : 0;
    const costoTintaPorMsi = toNumber(payload.costoTintaPorMsi, proceso === 'digital' ? 0.18 : 0.12);
    const costoTintas = msiConMerma * costoTintaPorMsi * tintasEfectivas;
    const piesPorMinuto = Math.max(0.01, toNumber(payload.piesPorMinuto, proceso === 'digital' ? 120 : 180));
    const minutosTiraje = piesLinealesConMerma / piesPorMinuto;
    const costoTiraje = minutosTiraje * costoMinutoMaquina;
    const costoLaminadoPorMsi = toNumber(payload.costoLaminadoPorMsi);
    const setupLaminado = toNumber(payload.setupLaminado);
    const costoLaminado = Boolean(payload.incluirLaminado) ? (msiConMerma * costoLaminadoPorMsi) + setupLaminado : 0;
    const costoBarnizPorMsi = toNumber(payload.costoBarnizPorMsi);
    const costoBarniz = Boolean(payload.incluirBarniz) ? msiConMerma * costoBarnizPorMsi : 0;
    const costoTroquel = Boolean(payload.incluirTroquel) ? toNumber(payload.costoTroquel) : 0;
    const costoArte = Boolean(payload.incluirArte) ? toNumber(payload.costoArte) : 0;
    const costoCyrel = Boolean(payload.incluirCyrel) ? toNumber(payload.costoCyrel) : 0;
    const costoMaquila = Boolean(payload.incluirMaquila) ? toNumber(payload.costoMaquila) : 0;
    const costoFlete = Boolean(payload.incluirFlete) ? toNumber(payload.costoFlete) : 0;
    const costoEmpaque = toNumber(payload.costoEmpaque);
    const costoProductivo = costoMaterial + costoPreprensa + costoMontaje + costoTintas + costoTiraje + costoLaminado + costoBarniz + costoTroquel + costoArte + costoCyrel + costoMaquila + costoFlete + costoEmpaque;
    const porcentajeImprevistos = toNumber(payload.porcentajeImprevistos, 3) / 100;
    const porcentajeFinancieros = toNumber(payload.porcentajeFinancieros, 2) / 100;
    const subtotalCostos = costoProductivo * (1 + porcentajeImprevistos) * (1 + porcentajeFinancieros);
    const porcentajeUtilidad = toNumber(payload.porcentajeUtilidad, proceso === 'digital' ? 22 : 28) / 100;
    const porcentajeVendedor = toNumber(payload.porcentajeVendedor, 3) / 100;
    const porcentajeDepartamento = toNumber(payload.porcentajeDepartamento, proceso === 'digital' ? 8 : 10) / 100;
    const porcentajeAgencia = toNumber(payload.porcentajeAgencia) / 100;
    const factorComercial = 1 + porcentajeUtilidad + porcentajeVendedor + porcentajeDepartamento + porcentajeAgencia;
    const subtotalAntesIVA = subtotalCostos * factorComercial;
    const ivaPorcentaje = toNumber(payload.ivaPorcentaje, 12) / 100;
    const iva = subtotalAntesIVA * ivaPorcentaje;
    const total = subtotalAntesIVA + iva;
    const precioUnitario = cantidad > 0 ? subtotalAntesIVA / cantidad : 0;
    const precioUnitarioConIVA = cantidad > 0 ? total / cantidad : 0;

    return {
        entradas: { proceso, cantidad, anchoEtiqueta, altoEtiqueta, anchoRollo, pasosPorLinea, filas, tintasEfectivas, cantidadCambios },
        metricas: { largoTotalPulgadas: roundCurrency(largoTotalPulgadas), piesLineales: roundCurrency(piesLineales), piesLinealesConMerma: roundCurrency(piesLinealesConMerma), msiBase: roundCurrency(msiBase), msiConMerma: roundCurrency(msiConMerma), areaM2: roundCurrency(areaM2), pesoKg: roundCurrency(pesoKg), minutosTiraje: roundCurrency(minutosTiraje) },
        desglose: { material: roundCurrency(costoMaterial), preprensa: roundCurrency(costoPreprensa), montaje: roundCurrency(costoMontaje), tintas: roundCurrency(costoTintas), tiraje: roundCurrency(costoTiraje), laminado: roundCurrency(costoLaminado), barniz: roundCurrency(costoBarniz), troquel: roundCurrency(costoTroquel), arte: roundCurrency(costoArte), cyrel: roundCurrency(costoCyrel), maquila: roundCurrency(costoMaquila), flete: roundCurrency(costoFlete), empaque: roundCurrency(costoEmpaque) },
        resumen: { costoProductivo: roundCurrency(costoProductivo), subtotalCostos: roundCurrency(subtotalCostos), subtotalAntesIVA: roundCurrency(subtotalAntesIVA), iva: roundCurrency(iva), total: roundCurrency(total), precioUnitario: roundCurrency(precioUnitario), precioUnitarioConIVA: roundCurrency(precioUnitarioConIVA) }
    };
}

function estimateMachineStageCost(machine, metrics) {
    if (!machine) return null;
    const setupMinutes = (machine.setupBaseMinutes || 0) + ((metrics.stationCount || 0) * (machine.setupPerStationMinutes || 0)) + (machine.setupExtraMinutes || 0);
    let runtimeUnits = metrics.productQuantity;
    const unit = normalizeText(machine.workUnit);
    if (unit.includes('pulgada')) runtimeUnits = metrics.linearInches;
    else if (unit.includes('trabajo')) runtimeUnits = 1;
    else if (unit.includes('msi')) runtimeUnits = metrics.msi;
    const runtimeMinutes = machine.productionSpeed > 0 ? runtimeUnits / machine.productionSpeed : 0;
    const totalHours = (setupMinutes + runtimeMinutes) / 60;
    const totalCost = totalHours * ((machine.hourlyMachineCost || 0) + (machine.hourlyOperatorCost || 0));

    return {
        machineId: machine.id,
        machineName: machine.machineName,
        category: machine.category,
        process: machine.process,
        subprocess: machine.subprocess,
        setupMinutes: roundCurrency(setupMinutes),
        runtimeMinutes: roundCurrency(runtimeMinutes),
        totalHours: roundCurrency(totalHours),
        totalCost: roundCurrency(totalCost),
        workUnit: machine.workUnit,
        productionSpeed: machine.productionSpeed,
        timeFormula: machine.timeFormula,
        costFormula: machine.costFormula
    };
}

function findPlateProcessCatalog(catalogs = {}) {
    return (Array.isArray(catalogs.processes) ? catalogs.processes : []).find((item) => normalizeText(item?.categoria).includes('planch')) || null;
}

function getPlateDimensionMetrics(die, width = 0, length = 0) {
    const plateWidthIn = Math.max(
        toNumber(die?.ancho_total_troquel_in, 0),
        toNumber(die?.anchoTroquel, 0),
        toNumber(die?.widthInches, 0),
        toNumber(width, 0)
    );
    const plateLengthIn = Math.max(
        toNumber(die?.largo_total_troquel_in, 0),
        toNumber(die?.largoTroquel, 0),
        toNumber(die?.lengthInches, 0),
        toNumber(length, 0)
    );
    const areaFromDimensions = plateWidthIn > 0 && plateLengthIn > 0 ? plateWidthIn * plateLengthIn : 0;
    const areaPerPlateIn2 = Math.max(
        areaFromDimensions,
        parseLegacyNumber(die?.areaTroquelIn2) ?? 0,
        parseLegacyNumber(die?.areaEtiquetaExcesosIn) ?? 0,
        toNumber(width, 0) * toNumber(length, 0)
    );
    return { plateWidthIn, plateLengthIn, areaPerPlateIn2 };
}

function estimatePlateDetails(payload, catalogs, context = {}) {
    const plateMaterialId = pickFirstValue(payload.plateMaterialId, payload.uiState?.plates?.plateMaterialId);
    const plateMaterial = (catalogs.materials || []).find((item) => item.id === plateMaterialId) || null;
    const chargePlates = Boolean(Object.prototype.hasOwnProperty.call(payload, 'chargePlates')
        ? payload.chargePlates
        : payload.uiState?.plates?.chargePlates);
    const processType = pickFirstValue(payload.processType, payload.process, context.selectedPrintMachine?.process, '');
    const digitalPlatesDisabled = Boolean(context.digitalPlatesDisabled);
    const stationCount = Math.max(0, toNumber(payload.stationCount, payload.tintCount || context.stationCount || 0));
    const width = Math.max(0, toNumber(payload.widthInches, context.width || 0));
    const length = Math.max(0, toNumber(payload.lengthInches, context.length || 0));
    const die = context.die || null;
    const plateDimensions = getPlateDimensionMetrics(die, width, length);
    const plateCount = stationCount;
    const areaPerColorIn2 = plateDimensions.areaPerPlateIn2;
    const totalSquareInches = areaPerColorIn2 * plateCount;
    const billableSquareInches = chargePlates && !digitalPlatesDisabled ? totalSquareInches : 0;
    const unitCost = plateMaterial?.costPerSquareInchUsd ? Number(plateMaterial.costPerSquareInchUsd) : 0;
    const materialSubtotal = billableSquareInches * unitCost;
    const plateProcess = findPlateProcessCatalog(catalogs);

    let processSubtotal = 0;
    if (chargePlates && !digitalPlatesDisabled && plateProcess) {
        const setupMinutes =
            Number(plateProcess.tiempo_preparacion_general || 0) +
            (Number(plateProcess.tiempo_por_estacion || 0) * stationCount) +
            Number(plateProcess.tiempo_fijo_min || 0);
        const people = Math.max(1, Number(plateProcess.cantidad_personas || 1));
        const machineCost = (setupMinutes / 60) * Number(plateProcess.costo_hora_maquina || 0);
        const operatorCost = ((setupMinutes / 60) * people) * Number(plateProcess.costo_hora_operario || 0);
        processSubtotal = machineCost + operatorCost + Number(plateProcess.costo_fijo || 0);
    }

    return {
        chargePlates,
        plateMaterialId: plateMaterial?.id || '',
        plateName: plateMaterial?.name || '',
        plateCount: roundCurrency(plateCount),
        plateWidthIn: roundCurrency(plateDimensions.plateWidthIn),
        plateLengthIn: roundCurrency(plateDimensions.plateLengthIn),
        unitCost: roundCurrency(unitCost),
        areaPerColorIn2: roundCurrency(areaPerColorIn2),
        totalSquareInches: roundCurrency(totalSquareInches),
        billableSquareInches: roundCurrency(billableSquareInches),
        materialSubtotal: roundCurrency(materialSubtotal),
        processSubtotal: roundCurrency(processSubtotal),
        totalSubtotal: roundCurrency(materialSubtotal + processSubtotal),
        digitalPlatesDisabled
    };
}

function calculateFlexoPreview(payload, catalogs = loadFlexoCatalogs()) {
    const product = catalogs.products.find((item) => item.id === payload.productId) || null;
    const material = catalogs.materials.find((item) => item.id === payload.materialId) || null;
    const die = catalogs.dies.find((item) => item.id === payload.dieId) || null;
    const machineSelections = payload.machineSelections || {};
    const selectedPrintMachine = catalogs.machines.find((machine) => machine.id === machineSelections.impresion) || null;
    const digitalByMachine = isDigitalPrintingReference(
        `${selectedPrintMachine?.subprocess || ''} ${selectedPrintMachine?.process || ''} ${selectedPrintMachine?.type || ''}`
    );
    const digitalByProcess = isDigitalPrintingReference(payload.processType || payload.process || '');
    const digitalPlatesDisabled = digitalByMachine || digitalByProcess;
    const quantity = Math.max(0, toNumber(payload.quantityProducts, product?.quantityProducts || 0));
    const width = Math.max(0, toNumber(payload.widthInches, product?.width || 0));
    const length = Math.max(0, toNumber(payload.lengthInches, product?.length || 0));
    const stationCount = Math.max(0, toNumber(payload.stationCount, payload.tintCount || product?.tintCount || 0));
    const labelsPerPass = Math.max(1, toNumber(die?.rows, 1) * Math.max(1, toNumber(die?.repetitions, 1)));
    const linearInches = quantity > 0 && length > 0 ? (quantity / labelsPerPass) * length : 0;
    const linearFeet = linearInches / 12;
    const materialWidth = Math.max(width, toNumber(material?.widthInches, die?.materialWidth || width));
    const msi = (materialWidth * linearInches) / 1000;
    const materialCost = material?.costPerLinearMeterUsd ? (linearFeet * 0.3048) * material.costPerLinearMeterUsd : (material?.costPerUnitUsd ? linearFeet * material.costPerUnitUsd : 0);
    const categories = ['preprensa', 'impresion', 'troquelado', 'laminado', 'estampado', 'rebobinado', 'empaque'];
    const breakdown = categories.map((category) => {
        const selectedId = machineSelections[category];
        const autoMachine = catalogs.machineCategories[category]?.length === 1 ? catalogs.machineCategories[category][0] : null;
        const selectedMachine = catalogs.machines.find((machine) => machine.id === selectedId) || autoMachine || null;
        return estimateMachineStageCost(selectedMachine, { productQuantity: quantity, linearInches, stationCount, msi });
    }).filter(Boolean);
    const machineCostTotal = breakdown.reduce((sum, item) => sum + item.totalCost, 0);
    const plates = estimatePlateDetails(payload, catalogs, {
        die,
        width,
        length,
        stationCount,
        selectedPrintMachine,
        digitalPlatesDisabled
    });
    const subtotalCost = materialCost + machineCostTotal + Number(plates.totalSubtotal || 0);
    const contingencyFactor = 1 + ((catalogs.globalCosts.commercialSettings.contingencyPercent || 0) / 100);
    const financialFactor = 1 + ((catalogs.globalCosts.commercialSettings.financialPercent || 0) / 100);
    const profitabilityFactor = 1 + ((catalogs.globalCosts.commercialSettings.profitabilityPercent || 0) / 100);
    const totalCost = subtotalCost * contingencyFactor * financialFactor * profitabilityFactor;
    const unitPrice = quantity > 0 ? totalCost / quantity : 0;
    const processSnapshot = buildCalculationProcessSnapshot({
        raw: {},
        processType: pickFirstValue(payload.processType, payload.process),
        machineName: selectedPrintMachine?.machineName || '',
        dieCode: die?.id || '',
        uiState: payload.uiState || null
    });

    return {
        selection: {
            productId: product?.id || '',
            materialId: material?.id || '',
            dieId: die?.id || '',
            quantity,
            width,
            length,
            stationCount,
            digitalPlatesDisabled
        },
        metrics: { labelsPerPass: roundCurrency(labelsPerPass), linearInches: roundCurrency(linearInches), linearFeet: roundCurrency(linearFeet), materialWidth: roundCurrency(materialWidth), msi: roundCurrency(msi) },
        costBreakdown: { material: roundCurrency(materialCost), machineStages: breakdown, subtotalCost: roundCurrency(subtotalCost), totalCost: roundCurrency(totalCost), unitPrice: roundCurrency(unitPrice) },
        processes: processSnapshot,
        plates
    };
}

function parseLegacyNumber(value) {
    if (value === '' || value === null || typeof value === 'undefined') {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    const normalized = String(value)
        .replace(/\s+/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function pickFirstValue(...values) {
    for (const value of values) {
        if (value !== null && typeof value !== 'undefined' && String(value).trim() !== '') {
            return value;
        }
    }
    return '';
}

function pickFirstMeaningfulNumber(...values) {
    let firstNumeric = null;
    for (const value of values) {
        if (value === null || typeof value === 'undefined' || Number.isNaN(value)) {
            continue;
        }
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
            continue;
        }
        if (firstNumeric === null) {
            firstNumeric = numericValue;
        }
        if (numericValue !== 0) {
            return numericValue;
        }
    }
    return firstNumeric;
}

function buildCalculationLineSummary(row = {}) {
    const raw = row.raw_data || {};
    const processType = pickFirstValue(row.process_type, raw['Proceso Productivo'], 'Convencional');
    const isDigital = String(processType || '').toLowerCase().includes('digit');
    const activePrefix = isDigital ? 'DIGITAL' : 'CONV';
    const subtotal1 = pickFirstValue(
        parseLegacyNumber(raw['GENERAL | 9 | TOTAL | COL EXPORTAR REPORTE VENTAS']),
        parseLegacyNumber(raw['GENERAL | 7 | SUBTOTAL CALC ANTES IV | COL']),
        parseLegacyNumber(raw['GENERAL | 7 | TOTAL | COL']),
        parseLegacyNumber(raw['GENERAL | 7 | TOTAL | DOL']),
        parseLegacyNumber(raw['PRECIO TOTAL AL FINALIZAR']),
        parseLegacyNumber(row.total_cost),
        (parseLegacyNumber(row.unit_price) !== null && parseLegacyNumber(row.quantity) !== null)
            ? parseLegacyNumber(row.unit_price) * parseLegacyNumber(row.quantity)
            : null
    );
    const width = parseLegacyNumber(raw['DIMENSIONES ETIQUETA | ANCHO']);
    const length = parseLegacyNumber(raw['DIMENSIONES ETIQUETA | LARGO']);
    const rawShape = pickFirstValue(raw['REQ | Forma'], raw['GENERAL | TROQUEL | FORMA']);
    const isCircularMeasure = String(rawShape || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('circular');
    const measure = isCircularMeasure && width !== null
        ? `Diámetro ${width}`
        : width !== null && length !== null
        ? `${width} x ${length}`
        : pickFirstValue(raw['REQ | Medida Fija']);
    const frontBackGroup = normalizeFrontBackGroup(raw);
    const processSnapshot = Array.isArray(raw['Secuencia_Procesos']) ? raw['Secuencia_Procesos'] : [];
    return {
        version: 1,
        quote_code: pickFirstValue(row.quote_code, raw['ID COTIZACION']),
        line_code: pickFirstValue(row.line_code, raw['ID LINEA']),
        line_order: normalizeLineOrder(raw['Orden_Linea']),
        customer_code: pickFirstValue(row.customer_code, raw['ID CLIENTE']),
        customer_name: pickFirstValue(raw.CLIENTE, raw['CLIENTE NOMBRE']),
        salesperson_name: pickFirstValue(raw.VENDEDOR, raw['VENDEDOR | USUARIO']),
        department: pickFirstValue(raw.DEPARTAMENTO, 'Flexografia'),
        job_name: pickFirstValue(raw['NOMBRE TRABAJO'], raw['Nombre Trabajo'], raw['TIPO TRABAJO | ORDEN REFERENCIA 1']),
        product_code: pickFirstValue(row.product_code, raw['CODIGO PRODUCTO'], raw['ID LINEA']),
        material_code: pickFirstValue(row.material_code, raw['Material Digital | Id Material'], raw['Material Convencional | Id Material']),
        material_name: pickFirstValue(raw['GENERAL | MATERIAL'], raw.Material, row.material_code),
        die_code: pickFirstValue(row.die_code, raw['GENERAL | TROQUEL | ID'], raw[`${activePrefix} | TROQUEL | ID`]),
        machine_name: pickFirstValue(row.machine_name, raw['DIGITAL | MAQUINA'], raw['CONV | MAQUINA']),
        process_type: processType,
        status: pickFirstValue(raw['SOLICITUD ESTADO'], raw['ESTADO LINEA'], 'Cotizada'),
        finalized_for_order: Boolean(row.finalized_for_order ?? raw['Finalizado_Para_Orden']),
        quantity: pickFirstValue(parseLegacyNumber(row.quantity), parseLegacyNumber(raw['Cantidad Productos']), parseLegacyNumber(raw['CANTIDAD PRODUCTOS 1'])),
        subtotal_1: subtotal1,
        total_cost: pickFirstValue(parseLegacyNumber(row.total_cost), parseLegacyNumber(raw['PRECIO TOTAL AL FINALIZAR'])),
        unit_price: pickFirstValue(parseLegacyNumber(row.unit_price), parseLegacyNumber(raw['GENERAL | 9 | UNITARIO | DOL'])),
        measure,
        width_in: width,
        length_in: length,
        process_sequence_text: pickFirstValue(raw['Texto_Secuencia_Procesos'], raw['BOT | Process Sequence']),
        processes: processSnapshot
            .map((item) => pickFirstValue(item?.processName, item?.name, item?.label))
            .filter(Boolean),
        front_back_group: frontBackGroup,
        grupo_frente_dorso: frontBackGroup
    };
}

function applyCalculationLineSummary(rawData = {}, row = {}) {
    rawData.line_summary = buildCalculationLineSummary({
        ...row,
        raw_data: rawData
    });
    return rawData;
}

function buildSyntheticAddressFromPartner(partner) {
    const raw = partner?.raw_data?.socio || {};
    const line = pickFirstValue(raw.STREET, raw['Cliente | Direccion']);
    if (!line) {
        return [];
    }
    return [{
        id: 'raw-address',
        partner_code: partner.partner_code,
        address_name: partner.partner_name || 'Principal',
        address_type: 'B',
        country: pickFirstValue(raw.Country, raw['Country Name']),
        state_province: pickFirstValue(raw['STATE NAME'], raw.STATE),
        county: pickFirstValue(raw['CONTACTO CANTON']),
        district: '',
        address_line: line,
        zip_code: ''
    }];
}

function mapQuoteHeader(row) {
    const raw = row.raw_data || {};
    return {
        quote_code: row.quote_code,
        customer_code: pickFirstValue(row.customer_code, raw['ID CLIENTE']),
        customer_name: pickFirstValue(row.customer_name, raw['CLIENTE NOMBRE']),
        contact_name: pickFirstValue(row.contact_name, raw['CLIENTE | CONTACTO NOMBRE COMPLETO']),
        email: pickFirstValue(row.email, raw['CLIENTE | CONTACTO EMAIL']),
        salesperson_name: pickFirstValue(row.salesperson_name, raw.VENDEDOR, raw['VENDEDOR | USUARIO']),
        phone: pickFirstValue(row.phone, raw['CLIENTE | CONTACTO TELEFONO']),
        phone_secondary: pickFirstValue(raw['CLIENTE | CONTACTO TELEFONO SECUNDARIO']),
        status: pickFirstValue(row.status, raw['Estado Cotizacion']),
        created_on: row.created_on || raw['FECHA CREACION DATE'] || raw['FECHA CREACION'],
        due_on: row.due_on || raw['FECHA VENCIMIENTO'],
        exchange_sale: raw['TIPO CAMBIO VENTA'] || null,
        exchange_buy: raw['TIPO CAMBIO COMPRA'] || null,
        footer_dates: raw['PIE COTIZACION | DETALLE COTIZACION | FECHAS'] || '',
        footer_exchange: raw['PIE COTIZACION | DETALLE COTIZACION | TIPO CAMBIO'] || '',
        payment_terms: raw['CONDICION PAGO'] || '',
        delivery_time: raw['TIEMPO ENTREGA'] || '',
        raw_data: raw
    };
}

function mapCalculationLine(row) {
    const raw = row.raw_data || {};
    const lineSummary = buildCalculationLineSummary(row);

      return {
          line_code: lineSummary.line_code,
          line_order: lineSummary.line_order,
          department: lineSummary.department,
          job_name: lineSummary.job_name,
          material_code: lineSummary.material_code,
          material_name: lineSummary.material_name,
          die_code: lineSummary.die_code,
          finalized_for_order: lineSummary.finalized_for_order,
          status: lineSummary.status,
        quantity: lineSummary.quantity,
        subtotal_1: lineSummary.subtotal_1,
        subtotal_2: null,
        subtotal_3: null,
        subtotal_4: null,
        hidden_flag: false,
        optional_flag: false,
        proof_flag: true,
        process_type: lineSummary.process_type,
        product_code: lineSummary.product_code,
        machine_name: lineSummary.machine_name,
        unit_price: lineSummary.unit_price,
        front_back_group: lineSummary.front_back_group,
        grupo_frente_dorso: lineSummary.grupo_frente_dorso,
        line_summary: lineSummary,
        raw_data: raw
    };
}

function normalizeFrontBackLineCode(value) {
    return String(value || '').trim();
}

function normalizeFrontBackGroup(rawOrGroup = {}) {
    const group = rawOrGroup?.grupoFrenteDorso || rawOrGroup?.grupo_frente_dorso || rawOrGroup?.Grupo_Frente_Dorso || rawOrGroup?.frontBackGroup || rawOrGroup;
    if (!group || typeof group !== 'object' || Array.isArray(group)) return null;
    const groupLineCode = normalizeFrontBackLineCode(group.groupLineCode || group.lineaGrupo || group.primaryLineCode);
    const explicitElements = Array.isArray(group.elementLineCodes)
        ? group.elementLineCodes.map(normalizeFrontBackLineCode).filter(Boolean)
        : Array.isArray(group.elementos)
            ? group.elementos.map((item) => normalizeFrontBackLineCode(item?.lineCode || item?.linea || item)).filter(Boolean)
            : [];
    const legacyMembers = Array.isArray(group.memberLineCodes)
        ? group.memberLineCodes.map(normalizeFrontBackLineCode).filter(Boolean)
        : [group.primaryLineCode, group.partnerLineCode].map(normalizeFrontBackLineCode).filter(Boolean);
    const memberLineCodes = Array.from(new Set((explicitElements.length ? explicitElements : legacyMembers).filter(Boolean)));
    const primaryLineCode = normalizeFrontBackLineCode(groupLineCode || group.primaryLineCode || legacyMembers[0] || memberLineCodes[0]);
    const partnerLineCode = normalizeFrontBackLineCode(group.partnerLineCode || group.backLineCode || memberLineCodes.find((code) => code !== primaryLineCode));
    const groupId = normalizeFrontBackLineCode(group.groupId);
    if (!groupId || !primaryLineCode || memberLineCodes.length < 1) return null;
    const normalizedRole = String(group.role || group.rol || '').trim().toLowerCase();
    const role = ['elemento', 'componente', 'frente', 'dorso'].includes(normalizedRole) ? 'elemento' : 'grupo';
    const elementRoles = group.elementRoles && typeof group.elementRoles === 'object' && !Array.isArray(group.elementRoles)
        ? { ...group.elementRoles }
        : {};
    const dedicatedGroupLine = !memberLineCodes.includes(primaryLineCode);
    return {
        groupId,
        mode: 'frente_dorso',
        label: sanitizeAdminUserText(group.label, 'Grupo Frente/Dorso'),
        displayMode: String(group.displayMode || 'single').trim() || 'single',
        role,
        groupLineCode: primaryLineCode,
        lineaGrupo: primaryLineCode,
        primaryLineCode,
        partnerLineCode,
        frontLineCode: normalizeFrontBackLineCode(group.frontLineCode || memberLineCodes[0]),
        backLineCode: normalizeFrontBackLineCode(group.backLineCode || memberLineCodes[1] || partnerLineCode),
        elementLineCodes: memberLineCodes,
        memberLineCodes,
        allLineCodes: Array.from(new Set([primaryLineCode, ...memberLineCodes].filter(Boolean))),
        dedicatedGroupLine,
        elementRole: sanitizeAdminUserText(group.elementRole || group.ladoElemento || ''),
        elementRoles,
        warnings: Array.isArray(group.warnings) ? group.warnings.map((item) => sanitizeAdminUserText(item)).filter(Boolean) : [],
        createdAt: group.createdAt || null,
        updatedAt: group.updatedAt || null
    };
}

function getFrontBackGroupFromLine(lineRow = {}) {
    return normalizeFrontBackGroup(lineRow?.raw_data || {});
}

function isFrontBackComponentLine(lineRow = {}) {
    const group = getFrontBackGroupFromLine(lineRow);
    if (!group) return false;
    return group.role === 'elemento' || normalizeFrontBackLineCode(lineRow.line_code) !== group.groupLineCode;
}

function isFrontBackGroupLine(lineRow = {}) {
    const group = getFrontBackGroupFromLine(lineRow);
    if (!group) return false;
    return normalizeFrontBackLineCode(lineRow.line_code) === group.groupLineCode && group.role !== 'elemento';
}

function buildFrontBackGroupId(quoteCode, groupLineCode, elementLineCodes = []) {
    return `grupo-frente-dorso-${[quoteCode, groupLineCode, ...elementLineCodes]
        .map((item) => String(item || '').trim().replace(/[^a-z0-9_-]+/gi, '-'))
        .filter(Boolean)
        .join('-')}`;
}

function buildFrontBackCompatibilityWarnings(primaryLine = {}, partnerLine = {}) {
    const warnings = [];
    const compare = (label, primaryValue, partnerValue) => {
        const left = String(primaryValue || '').trim();
        const right = String(partnerValue || '').trim();
        if (left && right && left.toLowerCase() !== right.toLowerCase()) {
            warnings.push(`${label}: ${left} / ${right}`);
        }
    };
    compare('Proceso', primaryLine.process_type, partnerLine.process_type);
    compare('Máquina', primaryLine.machine_name, partnerLine.machine_name);
    compare('Material', primaryLine.material_code, partnerLine.material_code);
    compare('Troquel', primaryLine.die_code, partnerLine.die_code);
    return warnings;
}

async function getLatestQuoteCalculationRows(quoteCode, client = null) {
    const executor = client || { query: pgQuery };
    const result = await executor.query(
        `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                quantity, subtotal_cost, total_cost, unit_price, raw_data, created_at
           FROM (
                SELECT DISTINCT ON (line_code)
                       fc.calculation_code, fc.quote_code, fc.line_code, fc.product_code, fc.customer_code, fc.process_type, fc.machine_name, fc.die_code, fc.material_code,
                       fc.quantity, fc.subtotal_cost, fc.total_cost, fc.unit_price, fc.raw_data, fc.created_at
                  FROM flexo_calculations fc
                  LEFT JOIN quotes q ON q.quote_code = fc.quote_code
                 WHERE fc.quote_code = $1
                   AND ${quoteOwnedCalculationPredicate('fc', 'q')}
                 ORDER BY fc.line_code NULLS LAST, fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
           ) latest_lines
          ORDER BY line_code NULLS LAST`,
        [quoteCode]
    );
    return result.rows;
}

async function loadFrontBackGroupMembers(quoteCode, lineRow = {}, client = null) {
    const group = getFrontBackGroupFromLine(lineRow);
    if (!group) return [lineRow].filter(Boolean);
    const rows = await getLatestQuoteCalculationRows(quoteCode || lineRow.quote_code, client);
    const byCode = new Map(rows.map((row) => [normalizeFrontBackLineCode(row.line_code), row]));
    return group.memberLineCodes
        .map((lineCode) => byCode.get(lineCode))
        .filter(Boolean);
}

async function loadFrontBackGroupContext(quoteCode, lineRow = {}, client = null) {
    const group = getFrontBackGroupFromLine(lineRow);
    if (!group) return { group: null, groupLine: lineRow || null, members: [lineRow].filter(Boolean), rows: [lineRow].filter(Boolean) };
    const rows = await getLatestQuoteCalculationRows(quoteCode || lineRow.quote_code, client);
    const byCode = new Map(rows.map((row) => [normalizeFrontBackLineCode(row.line_code), row]));
    const groupLine = byCode.get(group.groupLineCode) || (normalizeFrontBackLineCode(lineRow.line_code) === group.groupLineCode ? lineRow : null);
    const members = group.memberLineCodes.map((lineCode) => byCode.get(lineCode)).filter(Boolean);
    return { group, groupLine, members, rows };
}

function frontBackLineQuantity(lineRow = {}) {
    const raw = lineRow?.raw_data || {};
    return parseLegacyNumber(lineRow?.quantity) ?? parseLegacyNumber(raw['Cantidad Productos']) ?? parseLegacyNumber(raw['CANTIDAD PRODUCTOS 1']) ?? 0;
}

function applyFrontBackQuantityToRawData(rawData = {}, quantity = 0) {
    const normalizedQuantity = parseLegacyNumber(quantity) ?? 0;
    rawData['Cantidad Productos'] = normalizedQuantity;
    rawData['CANTIDAD PRODUCTOS 1'] = normalizedQuantity;
    const uiState = rawData.Estado_UI;
    if (uiState && typeof uiState === 'object' && !Array.isArray(uiState)) {
        const header = uiState.header && typeof uiState.header === 'object' && !Array.isArray(uiState.header)
            ? uiState.header
            : {};
        rawData.Estado_UI = {
            ...uiState,
            header: {
                ...header,
                quantity: normalizedQuantity,
                quantities: [{ id: 'qty-1', value: normalizedQuantity }]
            }
        };
    }
    return rawData;
}

async function syncFrontBackGroupQuantity({ quoteCode, group, quantity, excludeCalculationCode = '', client = null }) {
    if (!group || !Array.isArray(group.memberLineCodes) || !group.memberLineCodes.length) return;
    const executor = client || { query: pgQuery };
    const rows = await getLatestQuoteCalculationRows(quoteCode, client);
    const targetCodes = new Set(group.memberLineCodes.map(normalizeFrontBackLineCode));
    for (const row of rows) {
        if (!targetCodes.has(normalizeFrontBackLineCode(row.line_code))) continue;
        if (excludeCalculationCode && String(row.calculation_code || '') === String(excludeCalculationCode)) continue;
        const rawData = applyFrontBackQuantityToRawData({ ...(row.raw_data || {}) }, quantity);
        applyCalculationLineSummary(rawData, { ...row, quantity });
        await executor.query(
            `UPDATE flexo_calculations
                SET quantity = $2,
                    raw_data = $3::jsonb
              WHERE calculation_code = $1`,
            [row.calculation_code, parseLegacyNumber(quantity) ?? 0, JSON.stringify(rawData)]
        );
    }
}

function summarizeFrontBackOutputLine(lineRow = {}) {
    const raw = lineRow.raw_data || {};
    const quantity = parseLegacyNumber(lineRow.quantity) ?? parseLegacyNumber(raw['Cantidad Productos']) ?? 0;
    const totalCost = parseLegacyNumber(lineRow.total_cost) ?? parseLegacyNumber(raw['PRECIO TOTAL AL FINALIZAR']) ?? 0;
    return {
        lineCode: lineRow.line_code || '',
        itemCode: pickFirstValue(lineRow.product_code, raw['CODIGO PRODUCTO'], lineRow.line_code),
        itemName: getProductNameFromRaw(raw, lineRow.product_code || lineRow.line_code || ''),
        quantity,
        totalCost,
        unitCost: quantity > 0 ? roundCurrency(totalCost / quantity) : totalCost,
        materialCode: pickFirstValue(lineRow.material_code, raw['Material Convencional | Id Material'], raw['Material Digital | Id Material']),
        machineName: pickFirstValue(lineRow.machine_name, raw['CONV | MAQUINA'], raw['DIGITAL | MAQUINA']),
        dieCode: pickFirstValue(lineRow.die_code, raw['GENERAL | TROQUEL | ID'])
    };
}

function buildFrontBackProductionRun(lineRow = {}, members = []) {
    const group = getFrontBackGroupFromLine(lineRow);
    if (!group) return null;
    const outputs = members.map(summarizeFrontBackOutputLine);
    const totalCost = roundCurrency(outputs.reduce((sum, item) => sum + Number(item.totalCost || 0), 0));
    const primaryOutput = outputs.find((item) => item.lineCode === group.primaryLineCode) || outputs[0] || {};
    const groupLineQuantity = normalizeFrontBackLineCode(lineRow.line_code) === group.groupLineCode
        ? frontBackLineQuantity(lineRow)
        : null;
    const quantity = Number(groupLineQuantity || primaryOutput.quantity || 0);
    return {
        mode: 'frente_dorso',
        groupId: group.groupId,
        label: group.label,
        displayMode: group.displayMode,
        commercialLineCode: group.groupLineCode,
        memberLineCodes: group.memberLineCodes,
        elementLineCodes: group.elementLineCodes,
        warnings: group.warnings,
        outputs,
        totals: {
            quantity,
            totalCost,
            unitCost: quantity > 0 ? roundCurrency(totalCost / quantity) : totalCost
        }
    };
}

function normalizeLineOrder(value, fallback = null) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const SQL_LINE_ORDER_VALUE = `
    CASE
        WHEN COALESCE(raw_data->>'Orden_Linea', '') ~ '^[0-9]+$'
            THEN (raw_data->>'Orden_Linea')::integer
        ELSE NULL
    END
`;

async function getNextQuoteLineOrder(quoteCode) {
    const lineOrderValue = SQL_LINE_ORDER_VALUE.replace(/\braw_data\b/g, 'fc.raw_data');
    const result = await pgQuery(
        `SELECT COALESCE(MAX(${lineOrderValue}), 0) AS max_order
           FROM flexo_calculations fc
           LEFT JOIN quotes q ON q.quote_code = fc.quote_code
          WHERE fc.quote_code = $1
            AND ${quoteOwnedCalculationPredicate('fc', 'q')}`,
        [quoteCode]
    );
    return Number(result.rows[0]?.max_order || 0) + 1;
}

function mapFlexoCalculationDetail(row) {
    if (row.raw_data) normalizeCalculationKeys(row.raw_data);
    const raw = row.raw_data || {};
    const processType = pickFirstValue(row.process_type, raw['Proceso Productivo'], 'Convencional');
    const activePrefix = String(processType).toLowerCase().includes('digit') ? 'DIGITAL' : 'CONV';
    const quotedMachine = pickFirstValue(row.machine_name, raw['DIGITAL | MAQUINA'], raw['CONV | MAQUINA'], raw['MAQUINA IMPRESION']);
    const digitalPlatesDisabled = hasDigitalPrintingContext({ processType, machineName: quotedMachine, raw });
    const prepressCost = pickFirstValue(parseLegacyNumber(raw[`${activePrefix} | COSTO PREPRENSA`]));
    const cyrelCost = digitalPlatesDisabled ? 0 : parseLegacyNumber(raw['GENERAL | 4 | COSTO CYREL']);
    const subtotalBeforeTax = pickFirstValue(
        parseLegacyNumber(raw['GENERAL | 7 | SUBTOTAL CALC ANTES IV | DOL']),
        parseLegacyNumber(raw['GENERAL | 7 | TOTAL | DOL']),
        parseLegacyNumber(raw['GENERAL | 5 | SUBTOTAL']),
        parseLegacyNumber(row.total_cost)
    );
    const taxAmount = parseLegacyNumber(raw['GENERAL | 9 | Impuestos']);
    const finalTotal = pickFirstValue(
        parseLegacyNumber(raw['PRECIO TOTAL AL FINALIZAR']),
        subtotalBeforeTax !== '' && subtotalBeforeTax !== null && taxAmount !== null
            ? Number(subtotalBeforeTax) + Number(taxAmount)
            : null
    );
    const processSnapshot = buildCalculationProcessSnapshot({
        raw,
        processType,
        machineName: quotedMachine,
        dieCode: pickFirstValue(raw['GENERAL | TROQUEL | ID'], raw[`${activePrefix} | TROQUEL | ID`], row.die_code),
        uiState: raw['Estado_UI'] || null
    });

      return {
          calculationCode: row.calculation_code || '',
        quoteCode: pickFirstValue(row.quote_code, raw['ID COTIZACION']),
        lineCode: pickFirstValue(row.line_code, raw['ID LINEA']),
        customerCode: pickFirstValue(row.customer_code, raw['ID CLIENTE']),
        customerName: pickFirstValue(raw.CLIENTE),
        salespersonName: pickFirstValue(raw.VENDEDOR),
        jobName: pickFirstValue(raw['NOMBRE TRABAJO'], raw['TIPO TRABAJO | ORDEN REFERENCIA 1']),
        department: pickFirstValue(raw.DEPARTAMENTO, 'Flexografia'),
        processType,
        productCode: row.product_code || raw['CODIGO PRODUCTO'] || '',
        frontBackGroup: normalizeFrontBackGroup(raw),
        grupoFrenteDorso: normalizeFrontBackGroup(raw),
          orderType: pickFirstValue(raw['TIPO ORDEN']),
          finalizedForOrder: Boolean(row.finalized_for_order ?? raw['Finalizado_Para_Orden']),
          lineStatus: pickFirstValue(raw['SOLICITUD ESTADO'], raw['ESTADO LINEA'], raw['FIN COTIZACION | ESTADO']),
        calculationType: pickFirstValue(raw['ESTADO LINEA | CALCULO'], raw['ESTADO LINEA | SEGUN CANTIDAD ELEMENTOS']),
        quantityProducts: pickFirstValue(
            parseLegacyNumber(raw['Cantidad Productos']),
            parseLegacyNumber(raw['CANTIDAD PRODUCTOS 1']),
            parseLegacyNumber(row.quantity)
        ),
        quantityTypes: parseLegacyNumber(raw['CANTIDAD TIPOS']),
        quantityChanges: parseLegacyNumber(raw['CANTIDAD CAMBIOS']),
        widthInches: parseLegacyNumber(raw['DIMENSIONES ETIQUETA | ANCHO']),
        lengthInches: parseLegacyNumber(raw['DIMENSIONES ETIQUETA | LARGO']),
        areaInches: parseLegacyNumber(raw['DIMENSIONES ETIQUETA | AREA']),
        areaM2: parseLegacyNumber(raw['DIMENSIONES ETIQUETA | AREA M2']),
        materialCode: pickFirstValue(raw['Material Convencional | Id Material'], raw['Material Digital | Id Material'], row.material_code),
        materialName: pickFirstValue(raw['GENERAL | MATERIAL'], raw['Material | Tipo Según Proceso Productivo'], raw['Material Convencional | Tipo con Medidas'], raw['Material Digital | Tipo con Medidas'], row.material_code),
        materialWidth: parseLegacyNumber(raw['GENERAL | MATERIAL | ANCHO']),
        materialM2: pickFirstValue(parseLegacyNumber(raw['Material | m2 Segun Proceso Productivo']), parseLegacyNumber(raw[`${activePrefix} | MATERIAL | AREA MTS`])),
        materialMsi: pickFirstValue(parseLegacyNumber(raw['Material | MSI Segun Proceso Productivo']), parseLegacyNumber(raw[`${activePrefix} | MATERIAL | CANTIDAD MSI INCLUYE MACULA`]), parseLegacyNumber(raw[`${activePrefix} | MATERIAL | CANTIDAD MSI`])),
        materialFeet: pickFirstValue(parseLegacyNumber(raw['Material | Pies Segun Proceso Productivo']), parseLegacyNumber(raw['GENERAL | SUSTRATO | CONSUMO PIES']), parseLegacyNumber(raw[`${activePrefix} | MATERIAL | CANTIDAD PIES LINEALES INCLUYE MACULA`]), parseLegacyNumber(raw[`${activePrefix} | MATERIAL | CANTIDAD PIES LINEALES`])),
        materialFeetWaste: pickFirstValue(parseLegacyNumber(raw['Material | Pies Macula Segun Proceso Productivo']), parseLegacyNumber(raw[`${activePrefix} | MATERIAL | CANTIDAD PIES MACULA | CALCULO`])),
        dieCode: pickFirstValue(raw['GENERAL | TROQUEL | ID'], raw[`${activePrefix} | TROQUEL | ID`], row.die_code),
        dieTeeth: pickFirstValue(parseLegacyNumber(raw['GENERAL | TROQUEL | DIENTES']), parseLegacyNumber(raw[`${activePrefix} | TROQUEL | DIENTES`])),
        dieRows: parseLegacyNumber(raw[`${activePrefix} | TROQUEL | CANTIDAD FILAS`]),
        dieRepeats: pickFirstValue(parseLegacyNumber(raw['CONV | TROQUEL | REPETICIONES']), parseLegacyNumber(raw['DIGITAL | TROQUEL | REPETICIONES'])),
        tintCount: pickFirstValue(parseLegacyNumber(raw['CANTIDAD TINTAS']), parseLegacyNumber(raw['DIGITAL | CANTIDAD TINTAS'])),
        pantoneCount: parseLegacyNumber(raw['CANTIDAD PANTONES']),
        labelsPerRoll: parseLegacyNumber(raw['CANTIDAD ETIQUETAS X ROLLO']),
        applicationType: pickFirstValue(raw['TIPO ETIQUETADO']),
        outputType: pickFirstValue(raw['TIPO SALIDA']),
        coreWidth: parseLegacyNumber(raw['ANCHO CORE']),
        coreDiameter: pickFirstValue(raw['DIAMETRO CORE']),
        cmyk: raw['GENERAL | CMYK'] === true || String(raw['CMYK'] || '').trim().toLowerCase() === 'si',
        quotedMachine,
        subtotalCost: pickFirstValue(parseLegacyNumber(raw['GENERAL | 1 | SUBTOTAL COSTOS | DOL | MOSTRAR']), parseLegacyNumber(raw['GENERAL | 1 | Costo Productivo']), parseLegacyNumber(raw[`${activePrefix} | 0 | SUBTOTAL COSTOS`])),
        subtotalFinancial: parseLegacyNumber(raw['GENERAL | 2 | SUBTOTAL COSTOS']),
        subtotalPerformance: pickFirstValue(parseLegacyNumber(raw['GENERAL | 3 | SUBTOTAL MAS RENDIMIENTO']), parseLegacyNumber(raw['GENERAL | 2 | Precio Venta'])),
        cyrelCost,
        subtotalBeforeTax,
        taxAmount,
        finalTotal,
        unitPrice: pickFirstValue(parseLegacyNumber(raw['GENERAL | 9 | UNITARIO | DOL']), parseLegacyNumber(row.unit_price)),
        thousandPrice: parseLegacyNumber(raw['GENERAL | 9 | MILLAR | DOL']),
        totalColones: pickFirstValue(parseLegacyNumber(raw['GENERAL | 7 | SUBTOTAL CALC ANTES IV | COL']), parseLegacyNumber(raw['GENERAL | 7 | TOTAL | COL'])),
        exchangeRate: pickFirstValue(parseLegacyNumber(raw['TIPO CAMBIO']), parseLegacyNumber(raw['TIPO CAMBIO VENTA']), parseLegacyNumber(raw['TIPO CAMBIO COMPRA'])),
        minimumCost: parseLegacyNumber(raw['COSTOS | COSTO MINIMO']),
        contingencyPercent: parseLegacyNumber(raw['GENERAL | 1 | PORCENTAJE IMPREVISTOS | UTILIZAR']),
        financialPercent: parseLegacyNumber(raw['GENERAL | 1 | PORCENTAJE COSTOS FINANCIEROS | UTILIZAR']),
        extraPercent: parseLegacyNumber(raw['Porcentaje Adicional']),
        taxPercent: parseLegacyNumber(raw['GENERAL | 8 | PORCENTAJE IVA']),
        components: {
            material: pickFirstValue(parseLegacyNumber(raw[`${activePrefix} | COSTO MATERIAL`]), parseLegacyNumber(raw['Material | Costo Material'])),
            inks: pickFirstValue(parseLegacyNumber(raw[`${activePrefix} | COSTO TINTAS`]), parseLegacyNumber(raw['DIGITAL | COSTO TINTAS CMYK'])),
            print: pickFirstValue(parseLegacyNumber(raw[`${activePrefix} | COSTO IMPRESION`])),
            prepress: prepressCost,
            finishes: pickFirstValue(parseLegacyNumber(raw[`${activePrefix} | COSTO ACABADOS`])),
            packaging: pickFirstValue(parseLegacyNumber(raw[`${activePrefix} | COSTO EMPAQUE`])),
            runCost: pickFirstValue(parseLegacyNumber(raw[`${activePrefix} | COSTO TIRAJE`]))
        },
        validations: {
            solicitud: pickFirstValue(raw['ANALISIS CAMPOS SOLICITUD']),
            finalizar: pickFirstValue(raw['ANALISIS CAMPOS FINALIZAR']),
            crearOrden: pickFirstValue(raw['ANALISIS CAMPOS CREAR ORDEN'])
        },
        notes: {
            quoteSummary: pickFirstValue(raw['Resumen Cotización'], raw['Resumen Cotizacion']),
            printSummary: pickFirstValue(raw['INFORMACION IMPRESION COTIZACION | MOSTRAR'], raw['INFORMACION IMPRESION COTIZACION | CALCULO']),
            observations: pickFirstValue(raw['OBSERVACIONES SOLICITUD']),
            creationStatus: pickFirstValue(raw['CREACION ESTADO'])
        },
        processes: processSnapshot,
        uiState: raw['Estado_UI'] || null,
        digitalPlatesDisabled,
        raw_data: raw
    };
}

function normalizeProformaStatus(value) {
    return String(value || '').trim().toLowerCase() === 'closed' ? 'closed' : 'open';
}

function normalizeProformaPriceDisplayMode(value) {
    const normalized = String(value || '').trim();
    const aliases = {
        both: 'totalized_unit',
        unit: 'regular_unit',
        thousand: 'regular_thousand',
        product_totals: 'totalized_simple',
        global_totals: 'totalized_simple',
        totalized_unit: 'totalized_simple',
        totalized_thousand: 'totalized_simple'
    };
    const resolved = aliases[normalized] || normalized;
    return [
        'regular_simple',
        'regular_unit',
        'regular_thousand',
        'totalized_simple'
    ].includes(resolved) ? resolved : 'regular_unit';
}

function getProformaPricePresentation(mode) {
    return String(mode || '').startsWith('totalized_') ? 'totalized' : 'regular';
}

function getProformaPriceDetail(mode) {
    if (String(mode || '').endsWith('_unit')) return 'unit';
    if (String(mode || '').endsWith('_thousand')) return 'thousand';
    return 'simple';
}

function buildProformaPriceDisplayOptions() {
    return [
        { value: 'regular_simple', label: 'Regular' },
        { value: 'regular_unit', label: 'Regular Con Precio Unitario' },
        { value: 'regular_thousand', label: 'Regular Con Precio Millar' },
        { value: 'totalized_simple', label: 'Totalizado' }
    ];
}

function normalizeProformaHeaderColor(value, fallback = '#203852') {
    const normalized = String(value || '').trim();
    return /^#([0-9a-fA-F]{6})$/.test(normalized) ? normalized : fallback;
}

async function getProformaConfigSnapshot(config = {}) {
    const general = config.general || {};
    const exchangeContext = await buildProformaExchangeContext(pgQuery, general);
    const currencies = exchangeContext.currencies?.length
        ? exchangeContext.currencies
        : normalizeProformaCurrencyList(general.proformaCurrenciesJson);
    const preferredDefaultCurrency = currencies.some((item) => item.code === 'USD') ? 'USD' : String(general.proformaDefaultCurrency || '').trim().toUpperCase();
    const defaultCurrency = String(
        preferredDefaultCurrency
        || exchangeContext.defaultCurrency
        || currencies[0]?.code
        || 'USD'
    ).trim().toUpperCase();
    const selectedCurrency = currencies.find((item) => item.code === defaultCurrency) || exchangeContext.defaultCurrencyMeta || currencies[0] || { code: 'CRC', label: 'Colones', symbol: '₡', exchangeRate: 1 };
    return {
        logoUrl: String(general.proformaLogoUrl || '').trim(),
        companyName: sanitizeAdminUserText(general.proformaCompanyName),
        slogan: sanitizeAdminUserText(general.proformaSlogan),
        headerColor: normalizeProformaHeaderColor(general.proformaHeaderColor, DEFAULT_GENERAL_CONFIG.general.proformaHeaderColor),
        companyNameColor: normalizeProformaHeaderColor(general.proformaCompanyNameColor, DEFAULT_GENERAL_CONFIG.general.proformaCompanyNameColor),
        fontFamilySource: String(general.proformaCompanyFontFamily || 'Cormorant Garamond').trim() || 'Cormorant Garamond',
        fontFamily: String(
            String(general.proformaCompanyFontFamily || 'Cormorant Garamond').trim() === '__custom__'
                ? (general.proformaCompanyFontLabel || 'Fuente Proforma')
                : (general.proformaCompanyFontFamily || 'Cormorant Garamond')
        ).trim(),
        fontUrl: String(general.proformaCompanyFontUrl || '').trim(),
        showCompanyName: String(general.proformaShowCompanyName || 'true').trim().toLowerCase() !== 'false',
        logoWidth: Number(general.proformaLogoWidth || DEFAULT_GENERAL_CONFIG.general.proformaLogoWidth) || DEFAULT_GENERAL_CONFIG.general.proformaLogoWidth,
        logoHeight: Number(general.proformaLogoHeight || DEFAULT_GENERAL_CONFIG.general.proformaLogoHeight) || DEFAULT_GENERAL_CONFIG.general.proformaLogoHeight,
        logoMarginTop: Number(general.proformaLogoMarginTop || 0) || 0,
        logoMarginLeft: Number(general.proformaLogoMarginLeft || 0) || 0,
        phone: sanitizeAdminUserText(general.proformaPhone),
        website: String(general.proformaWebsite || '').trim(),
        email: sanitizeAdminUserText(general.proformaEmail),
        currencies,
        defaultCurrency: defaultCurrency || selectedCurrency.code,
        defaultCurrencyMeta: selectedCurrency,
        baseCurrency: exchangeContext.baseCurrency || 'USD',
        exchangeRateDate: exchangeContext.rateDate || null,
        defaultValidity: sanitizeAdminUserText(general.proformaDefaultValidity),
        validityOptions: normalizeProformaValidityOptions(general.proformaValidityOptionsJson),
        intro: sanitizeAdminUserText(general.proformaIntro),
        introStyle: {
            fontFamily: String(general.proformaIntroFontFamily || 'inherit').trim() || 'inherit',
            fontSize: Number(general.proformaIntroFontSize || 15) || 15,
            color: normalizeProformaHeaderColor(general.proformaIntroColor, '#2f3c46')
        },
        termsConditions: sanitizeAdminUserText(general.proformaTermsConditions),
        paymentTerms: sanitizeAdminUserText(general.proformaPaymentTerms),
        deliveryTime: sanitizeAdminUserText(general.proformaDeliveryTime),
        technicalSpecs: sanitizeAdminUserText(general.proformaTechnicalSpecs),
        qualityPolicies: sanitizeAdminUserText(general.proformaQualityPolicies),
        priceDisplayMode: normalizeProformaPriceDisplayMode(general.proformaPriceDisplayMode),
        sellerSignatureEnabled: String(general.proformaSellerSignatureEnabled || 'true').trim().toLowerCase() !== 'false'
    };
}

function buildProformaProductSummary(line = {}, currency = {}, displayMode = 'both') {
    const raw = line.raw_data || {};
    const autoSelection = raw['Seleccion_Automatica'] || {};
    const finishDetails = [];
    const visibleExtras = [];
    const normalizedUiStateFinishes = Array.isArray(raw?.ui_state?.finishes) ? raw.ui_state.finishes : [];
    const pushFinish = (label, detail) => {
        const summary = [label, detail].filter(Boolean).join(': ');
        if (summary && !finishDetails.includes(summary)) finishDetails.push(summary);
    };
    const hasVisibleValue = (value) => {
        if (typeof value === 'boolean') return value;
        const normalized = String(value ?? '').trim().toLowerCase();
        return Boolean(normalized) && !['no', 'ninguno', 'sin', 'false', 'null', '0'].includes(normalized);
    };
    const pushExtra = (label) => {
        if (label && !visibleExtras.includes(label)) visibleExtras.push(label);
    };
    if (normalizedUiStateFinishes.length) {
        normalizedUiStateFinishes.forEach((finish) => {
            const label = pickFirstValue(finish?.label, finish?.name, finish?.type, finish?.process);
            const detail = pickFirstValue(finish?.detail, finish?.material, finish?.foil, finish?.laminate, finish?.varnish);
            pushFinish(label, detail);
        });
    }
    if (raw['CONV | BARNIZ | ACTIVO'] || raw['BARNIZ | ACTIVO']) {
        pushFinish('Barniz', pickFirstValue(raw['CONV | BARNIZ | TIPO'], raw['BARNIZ | TIPO'], raw['BARNIZ']));
    }
    if (raw['CONV | LAMINADO | ACTIVO'] || raw['LAMINADO | ACTIVO']) {
        pushFinish('Laminado', pickFirstValue(raw['CONV | LAMINADO | TIPO'], raw['LAMINADO | TIPO'], raw['LAMINADO']));
    }
    if (raw['CONV | ESTAMPADO | ACTIVO'] || raw['ESTAMPADO | ACTIVO']) {
        pushFinish('Foil', pickFirstValue(raw['CONV | ESTAMPADO | FOIL'], raw['ESTAMPADO | FOIL'], raw['ESTAMPADO']));
    }
    if (raw['EMBOSADO | ACTIVO']) {
        pushFinish('Embosado', pickFirstValue(raw['EMBOSADO | TIPO'], raw['EMBOSADO']));
    }
    if (hasVisibleValue(raw['ACABADOS | NUMERADO']) || hasVisibleValue(raw.NUMERADO) || hasVisibleValue(raw['REQ | Numeracion']) || hasVisibleValue(raw['REQ | Numeracion Aviso'])) {
        pushExtra('Numerado');
    }
    if (hasVisibleValue(raw['ACABADOS | QR']) || hasVisibleValue(raw['ACABADOS | CODIGO QR']) || hasVisibleValue(raw.QR) || hasVisibleValue(raw['CODIGO QR']) || hasVisibleValue(raw.CODIGO_QR)) {
        pushExtra('Código QR');
    }
    const quantity = parseLegacyNumber(line.quantity)
        ?? parseLegacyNumber(raw['CANTIDAD SOLICITADA'])
        ?? parseLegacyNumber(raw.CANTIDAD)
        ?? parseLegacyNumber(raw['Cantidad'])
        ?? null;
    const width = parseLegacyNumber(raw['DIMENSIONES ETIQUETA | ANCHO']) ?? null;
    const length = parseLegacyNumber(raw['DIMENSIONES ETIQUETA | LARGO']) ?? null;
    const unitPriceUsd = pickFirstMeaningfulNumber(
        parseLegacyNumber(raw['PRECIO UNITARIO']),
        parseLegacyNumber(raw['GENERAL | 9 | UNITARIO | DOL']),
        parseLegacyNumber(raw['GENERAL | 9 | PRECIO UNITARIO']),
        parseLegacyNumber(raw['PRECIO UNITARIO FINAL']),
        parseLegacyNumber(line.unit_price),
        quantity && Number(line.subtotal_1) ? Number(line.subtotal_1) / quantity : null
    );
    const thousandPriceUsd = unitPriceUsd != null ? unitPriceUsd * 1000 : null;
    const taxPercent = parseLegacyNumber(raw['GENERAL | 8 | PORCENTAJE IVA']) ?? 0;
    const rawTaxUsd = parseLegacyNumber(raw['GENERAL | 9 | Impuestos']);
    const totalUsd = pickFirstMeaningfulNumber(
        parseLegacyNumber(raw['PRECIO TOTAL AL FINALIZAR']),
        parseLegacyNumber(raw['GENERAL | 9 | TOTAL | DOL']),
        parseLegacyNumber(raw['GENERAL | 7 | TOTAL | DOL']),
        Number(line.subtotal_1 || 0) || 0
    ) || 0;
    let subtotalUsd = pickFirstMeaningfulNumber(
        parseLegacyNumber(raw['GENERAL | 7 | SUBTOTAL CALC ANTES IV | DOL']),
        parseLegacyNumber(raw['GENERAL | 5 | SUBTOTAL'])
    );
    let taxUsd = rawTaxUsd;
    if (subtotalUsd == null && taxUsd != null) {
        subtotalUsd = totalUsd - taxUsd;
    }
    if (subtotalUsd == null) {
        subtotalUsd = totalUsd;
    }
    if (taxUsd == null) {
        taxUsd = taxPercent > 0 ? subtotalUsd * (taxPercent / 100) : Math.max(totalUsd - subtotalUsd, 0);
    }
    const exchangeRate = Number(currency?.exchangeRate || 1) || 1;
    const machineSummary = pickFirstValue(line.machine_name, raw['DIGITAL | MAQUINA'], raw['CONV | MAQUINA'], raw['MAQUINA IMPRESION']);
    const dimensionsText = width && length ? `${width}" x ${length}"` : '';
    const routeSummary = pickFirstValue(raw['REQ | Ruta Automática'], autoSelection.processType, line.process_type);
    const materialCode = pickFirstValue(raw['REQ | Material Automático'], autoSelection.materialCode, line.material_code);
    const dieCode = pickFirstValue(raw['REQ | Troquel Automático'], autoSelection.dieCode, line.die_code);
    const mountingSummary = pickFirstValue(raw['REQ | Montaje Automático']);
    const technicalComment = pickFirstValue(raw['REQ | Comentario Técnico Automático']);
    const warnings = [];
    const descriptionText = [
        line.material_name || '',
        machineSummary || '',
        dimensionsText,
        finishDetails.join(' · '),
        visibleExtras.join(' · ')
    ].filter(Boolean).join(' · ');
    return {
        lineCode: line.line_code,
        name: line.job_name || 'Producto',
        material: line.material_name || '',
        materialCode,
        processType: line.process_type || '',
        routeSummary,
        dieCode,
        dimensionsText,
        machineSummary: machineSummary || '',
        finishesSummary: finishDetails.join(' · '),
        descriptionText,
        mountingSummary,
        technicalComment,
        warnings,
        quantity,
        unitPrice: unitPriceUsd != null ? roundCurrency(unitPriceUsd * exchangeRate) : null,
        thousandPrice: thousandPriceUsd != null ? roundCurrency(thousandPriceUsd * exchangeRate) : null,
        subtotal: roundCurrency(subtotalUsd * exchangeRate),
        taxAmount: roundCurrency(taxUsd * exchangeRate),
        totalPrice: roundCurrency(totalUsd * exchangeRate),
        currencyCode: currency?.code || 'CRC',
        currencySymbol: currency?.symbol || '',
        displayMode
    };
}

function buildFrontBackProformaProductSummary(primaryLine = {}, memberLines = [], currency = {}, displayMode = 'both') {
    const group = getFrontBackGroupFromLine(primaryLine);
    const groupSummary = buildProformaProductSummary(primaryLine, currency, displayMode);
    const summaries = memberLines.map((line) => buildProformaProductSummary(line, currency, displayMode));
    const primarySummary = group?.dedicatedGroupLine
        ? groupSummary
        : (summaries.find((item) => item.lineCode === group?.primaryLineCode) || summaries[0] || groupSummary);
    const elementSubtotal = roundCurrency(summaries.reduce((sum, item) => sum + Number(item.subtotal || 0), 0));
    const elementTaxAmount = roundCurrency(summaries.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0));
    const elementTotalPrice = roundCurrency(summaries.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0));
    const groupHasCommercialValues = group?.dedicatedGroupLine && (
        Number(groupSummary.subtotal || 0) > 0
        || Number(groupSummary.taxAmount || 0) > 0
        || Number(groupSummary.totalPrice || 0) > 0
    );
    const subtotal = groupHasCommercialValues ? groupSummary.subtotal : elementSubtotal;
    const taxAmount = groupHasCommercialValues ? groupSummary.taxAmount : elementTaxAmount;
    const totalPrice = groupHasCommercialValues ? groupSummary.totalPrice : elementTotalPrice;
    const quantity = Number(groupSummary.quantity || primarySummary.quantity || 0) || null;
    const unitPrice = quantity ? roundCurrency(subtotal / quantity) : primarySummary.unitPrice;
    const names = summaries.map((item) => item.name).filter(Boolean);
    const materials = Array.from(new Set(summaries.map((item) => item.material || item.materialCode).filter(Boolean)));
    const machines = Array.from(new Set(summaries.map((item) => item.machineSummary).filter(Boolean)));
    const lineCodes = summaries.map((item) => item.lineCode).filter(Boolean).join(' + ');
    return {
        ...primarySummary,
        name: groupSummary.name || `${group?.label || 'Grupo Frente/Dorso'}: ${names.join(' + ') || primarySummary.name || 'Producto'}`,
        descriptionText: [
            'Corrida combinada',
            lineCodes ? `Líneas ${lineCodes}` : '',
            materials.join(' · '),
            machines.join(' · ')
        ].filter(Boolean).join(' · '),
        subtotal,
        taxAmount,
        totalPrice,
        unitPrice,
        thousandPrice: unitPrice != null ? roundCurrency(unitPrice * 1000) : primarySummary.thousandPrice,
        frontBackGroup: group
    };
}

function buildProformaProducts(lines = [], currency = {}, displayMode = 'both') {
    const rows = Array.isArray(lines) ? lines : [];
    const byLineCode = new Map(rows.map((line) => [normalizeFrontBackLineCode(line.line_code), line]));
    const handledGroups = new Set();
    const products = [];
    for (const line of rows) {
        const group = getFrontBackGroupFromLine(line);
        if (!group || group.displayMode !== 'single') {
            products.push(buildProformaProductSummary(line, currency, displayMode));
            continue;
        }
        if (isFrontBackComponentLine(line)) continue;
        if (handledGroups.has(group.groupId)) continue;
        handledGroups.add(group.groupId);
        const memberLines = group.memberLineCodes.map((lineCode) => byLineCode.get(lineCode)).filter(Boolean);
        products.push(buildFrontBackProformaProductSummary(line, memberLines.length ? memberLines : [line], currency, displayMode));
    }
    return products;
}

function buildQuoteProformaTechnicalSummary(lines = []) {
    const summary = {
        productNames: [],
        shapes: [],
        measures: [],
        materials: [],
        applications: [],
        placements: [],
        finishes: [],
        numbering: [],
        routes: [],
        technicalNotes: []
    };
    const pushUnique = (list, value) => {
        const normalized = String(value || '').trim();
        if (!normalized) return;
        if (!list.some((item) => String(item || '').trim().toLowerCase() === normalized.toLowerCase())) {
            list.push(normalized);
        }
    };
    const visibleValue = (value) => {
        const normalized = String(value || '').trim();
        if (!normalized) return '';
        const lowered = normalized.toLowerCase();
        if (['no', 'sin', 'ninguno', 'ninguna', 'n/a', 'false', 'null'].includes(lowered)) return '';
        if (lowered.startsWith('sin ')) return '';
        return normalized;
    };
    for (const line of Array.isArray(lines) ? lines : []) {
        const raw = line.raw_data || {};
        pushUnique(summary.productNames, line.job_name || raw['NOMBRE TRABAJO']);
        pushUnique(summary.shapes, raw['REQ | Forma']);
        const width = parseLegacyNumber(raw['DIMENSIONES ETIQUETA | ANCHO']);
        const length = parseLegacyNumber(raw['DIMENSIONES ETIQUETA | LARGO']);
        const shape = pickFirstValue(raw['REQ | Forma'], raw['GENERAL | TROQUEL | FORMA']);
        const isCircular = String(shape || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('circular');
        if (isCircular && width) {
            pushUnique(summary.measures, `Diámetro ${width}"`);
        } else if (width && length) {
            pushUnique(summary.measures, `${width}" x ${length}"`);
        } else {
            pushUnique(summary.measures, raw['REQ | Medida Fija']);
        }
        pushUnique(summary.materials, raw['REQ | Material Comercial'] || line.material_name);
        pushUnique(summary.applications, raw['REQ | Superficie']);
        pushUnique(summary.placements, raw['REQ | Colocacion']);
        pushUnique(summary.routes, raw['REQ | Ruta Automática'] || line.process_type);
        pushUnique(summary.finishes, visibleValue(raw['REQ | Barniz']) ? `Barniz: ${raw['REQ | Barniz']}` : '');
        pushUnique(summary.finishes, visibleValue(raw['REQ | Laminado']) ? `Laminado: ${raw['REQ | Laminado']}` : '');
        pushUnique(summary.finishes, visibleValue(raw['REQ | Estampado']) ? `Estampado: ${raw['REQ | Estampado']}` : '');
        pushUnique(summary.finishes, visibleValue(raw['REQ | Embosado']) ? 'Embosado' : '');
        pushUnique(summary.numbering, visibleValue(raw['REQ | Numeracion']));
        pushUnique(summary.technicalNotes, raw['REQ | Comentario Técnico Automático']);
    }
    return {
        productNamesText: summary.productNames.join(' · '),
        shapesText: summary.shapes.join(' · '),
        measuresText: summary.measures.join(' · '),
        materialsText: summary.materials.join(' · '),
        applicationsText: summary.applications.join(' · '),
        placementsText: summary.placements.join(' · '),
        finishesText: summary.finishes.join(' · '),
        numberingText: summary.numbering.join(' · '),
        routesText: summary.routes.join(' · '),
        technicalNotesText: summary.technicalNotes.join(' · ')
    };
}

async function closeQuoteProforma(quoteCode, reason = 'manual', client = null) {
    if (!quoteCode) return null;
    const executor = client || { query: pgQuery };
    await assertQuoteReadyForProforma(quoteCode, executor);
    const existing = await executor.query(
        `SELECT id, quote_code, status, issue_date_fixed, closed_at, closed_reason, raw_data
           FROM quote_proformas
          WHERE quote_code = $1
          LIMIT 1`,
        [quoteCode]
    );
    if (existing.rows.length && normalizeProformaStatus(existing.rows[0].status) === 'closed') {
        return existing.rows[0];
    }
    const result = await executor.query(
        `INSERT INTO quote_proformas (quote_code, status, issue_date_fixed, closed_at, closed_reason, raw_data)
         VALUES ($1, 'closed', NOW(), NOW(), $2, '{}'::jsonb)
         ON CONFLICT (quote_code)
         DO UPDATE SET
            status = 'closed',
            issue_date_fixed = COALESCE(quote_proformas.issue_date_fixed, NOW()),
            closed_at = NOW(),
            closed_reason = EXCLUDED.closed_reason,
            updated_at = NOW()
         RETURNING id, quote_code, status, issue_date_fixed, closed_at, closed_reason, raw_data`,
        [quoteCode, String(reason || 'manual').trim() || 'manual']
    );
    return result.rows[0] || null;
}

async function reopenQuoteProforma(quoteCode, reason = 'tracking_reopened', client = null) {
    if (!quoteCode) return null;
    const executor = client || { query: pgQuery };
    const result = await executor.query(
        `INSERT INTO quote_proformas (quote_code, status, raw_data, closed_reason)
         VALUES ($1, 'open', '{}'::jsonb, $2)
         ON CONFLICT (quote_code)
         DO UPDATE SET
            status = 'open',
            closed_at = NULL,
            closed_reason = EXCLUDED.closed_reason,
            updated_at = NOW()
         RETURNING id, quote_code, status, issue_date_fixed, closed_at, closed_reason, raw_data`,
        [quoteCode, String(reason || 'tracking_reopened').trim() || 'tracking_reopened']
    );
    return result.rows[0] || null;
}

const PROFORMA_BLOCK_PROCESS_LABELS = {
    barnizado: 'Barnizado',
    laminado: 'Laminado',
    estampado: 'Estampado',
    embosado: 'Embosado',
    troquelado: 'Troquelado',
    rebobinado: 'Rebobinado',
    troquel: 'Troquel',
    sustrato: 'Sustrato',
    diseno: 'Diseño',
    preprensa: 'Preprensa',
    planchas: 'Planchas',
    impresion: 'Impresión',
    empaque: 'Empaque',
    adicionales: 'Procesos adicionales'
};

function proformaProcessKeyFromMessage(message = '') {
    const text = normalizeText(message);
    if (!text) return '';
    if (text.includes('troquelado')) return 'troquelado';
    if (text.includes('troquel')) return 'troquel';
    if (text.includes('plancha') || text.includes('cliche') || text.includes('fotopol')) return 'planchas';
    if (text.includes('impresion') || text.includes('maquina de impresion')) return 'impresion';
    if (text.includes('preprensa')) return 'preprensa';
    if (text.includes('diseno') || text.includes('arte')) return 'diseno';
    if (text.includes('rebob')) return 'rebobinado';
    if (text.includes('barniz')) return 'barnizado';
    if (text.includes('laminad')) return 'laminado';
    if (text.includes('estamp')) return 'estampado';
    if (text.includes('embos')) return 'embosado';
    if (text.includes('empaque') || text.includes('rollo')) return 'empaque';
    if (text.includes('sustrato') || text.includes('material')) return 'sustrato';
    return '';
}

function summarizeProformaBlockingMessages(messages = []) {
    const map = new Map();
    (Array.isArray(messages) ? messages : []).forEach((message) => {
        const clean = stripNonBlockingSapAccountingWarnings(message);
        if (!clean) return;
        const processKey = proformaProcessKeyFromMessage(clean);
        const key = processKey || clean;
        if (map.has(key)) return;
        map.set(key, processKey ? `${PROFORMA_BLOCK_PROCESS_LABELS[processKey] || processKey} requiere configuración.` : clean);
    });
    return [...map.values()];
}

function proformaBlockingMessagesFromRaw(raw = {}) {
    const messages = Array.isArray(raw.Mensajes_Validacion)
        ? raw.Mensajes_Validacion.map((item) => stripNonBlockingSapAccountingWarnings(item)).filter(Boolean)
        : [];
    const fallback = stripNonBlockingSapAccountingWarnings(sanitizeAdminUserText(
        raw['ANALISIS CAMPOS PDF'],
        raw['ANALISIS CAMPOS CREAR ORDEN'],
        raw['ANALISIS CAMPOS FINALIZAR']
    ));
    return summarizeProformaBlockingMessages([...new Set([...messages, fallback].filter(Boolean))]);
}

function findQuoteProformaBlockingLine(rows = []) {
    return rows.find((row) => proformaBlockingMessagesFromRaw(row?.raw_data || {}).length);
}

function formatQuoteProformaBlockError(row = {}) {
    const raw = row.raw_data || {};
    const messages = proformaBlockingMessagesFromRaw(raw);
    const lineCode = pickFirstValue(row.line_code, raw['ID LINEA'], '');
    const detail = messages.join(' ');
    return `La proforma incluye varias líneas de cálculo. La línea ${lineCode || 'sin código'} requiere completar faltantes antes de continuar. ${detail}`.trim();
}

async function assertQuoteReadyForProforma(quoteCode, client = null) {
    const executor = client || { query: pgQuery };
    const result = await executor.query(
        `SELECT line_code, raw_data
           FROM (
                SELECT DISTINCT ON (line_code)
                       fc.line_code, fc.raw_data, fc.created_at, fc.calculation_code
                  FROM flexo_calculations fc
                  LEFT JOIN quotes q ON q.quote_code = fc.quote_code
                 WHERE fc.quote_code = $1
                   AND ${quoteOwnedCalculationPredicate('fc', 'q')}
                 ORDER BY fc.line_code NULLS LAST, fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
           ) latest_lines
          ORDER BY line_code NULLS LAST`,
        [quoteCode]
    );
    const blockingLine = findQuoteProformaBlockingLine(result.rows);
    if (blockingLine) {
        throw new Error(formatQuoteProformaBlockError(blockingLine));
    }
}

async function buildQuoteProformaPayload(quoteCode, client = null) {
    const executor = client || { query: pgQuery };
    const config = await loadGeneralConfig();
    const configSnapshot = await getProformaConfigSnapshot(config);
    const quoteContext = client
        ? await getQuoteLineContext(quoteCode, '__header_only__', client)
        : await getQuoteLineContext(quoteCode, '__header_only__');
    if (!quoteContext?.quote) {
        throw new Error('Cotización no encontrada.');
    }
    const linesResult = await executor.query(
        `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                quantity, subtotal_cost, total_cost, unit_price, raw_data, created_at
           FROM (
                SELECT DISTINCT ON (line_code)
                       fc.calculation_code, fc.quote_code, fc.line_code, fc.product_code, fc.customer_code, fc.process_type, fc.machine_name, fc.die_code, fc.material_code,
                       fc.quantity, fc.subtotal_cost, fc.total_cost, fc.unit_price, fc.raw_data, fc.created_at
                  FROM flexo_calculations fc
                  LEFT JOIN quotes q ON q.quote_code = fc.quote_code
                 WHERE fc.quote_code = $1
                   AND ${quoteOwnedCalculationPredicate('fc', 'q')}
                 ORDER BY fc.line_code NULLS LAST, fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
           ) latest_lines
          ORDER BY line_code NULLS LAST`,
        [quoteCode]
    );
    const blockingLine = findQuoteProformaBlockingLine(linesResult.rows);
    if (blockingLine) {
        throw new Error(formatQuoteProformaBlockError(blockingLine));
    }
    const lines = linesResult.rows.map(mapCalculationLine);
    const proformaResult = await executor.query(
        `SELECT id, quote_code, status, issue_date_fixed, closed_at, closed_reason, raw_data
           FROM quote_proformas
          WHERE quote_code = $1
          LIMIT 1`,
        [quoteCode]
    );
    const existing = proformaResult.rows[0] || null;
    const rawData = existing?.raw_data || {};
    const selectedCurrencyCode = String(rawData.currencyCode || configSnapshot.defaultCurrency).trim().toUpperCase();
    const currency = configSnapshot.currencies.find((item) => item.code === selectedCurrencyCode) || configSnapshot.defaultCurrencyMeta;
    const salespersonName = pickFirstValue(rawData.salespersonName, quoteContext.quote.salesperson_name);
    const sellerSignatureEnabled = rawData.sellerSignatureEnabled === false ? false : configSnapshot.sellerSignatureEnabled;
    let sellerSignatureUrl = '';
    if (sellerSignatureEnabled && salespersonName) {
        const signatureResult = await executor.query(
            `SELECT signature_url
               FROM admin_users
              WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1))
                 OR LOWER(TRIM(username)) = LOWER(TRIM($1))
              ORDER BY id
              LIMIT 1`,
            [salespersonName]
        );
        sellerSignatureUrl = sanitizeAdminUserText(signatureResult.rows[0]?.signature_url);
    }
    const issueDate = existing?.issue_date_fixed ? new Date(existing.issue_date_fixed) : new Date();
    const selectedPriceDisplayMode = normalizeProformaPriceDisplayMode(rawData.priceDisplayMode || configSnapshot.priceDisplayMode);
    const products = buildProformaProducts(lines, currency, selectedPriceDisplayMode);
    const technicalSummary = buildQuoteProformaTechnicalSummary(lines);
    const subtotalSummary = roundCurrency(products.reduce((acc, item) => acc + Number(item.subtotal || 0), 0));
    const taxSummary = roundCurrency(products.reduce((acc, item) => acc + Number(item.taxAmount || 0), 0));
    const grandTotal = roundCurrency(products.reduce((acc, item) => acc + Number(item.totalPrice || 0), 0));
    return {
        quoteCode,
        status: normalizeProformaStatus(existing?.status),
        issueDate: issueDate.toISOString(),
        closedAt: existing?.closed_at || null,
        closedReason: sanitizeAdminUserText(existing?.closed_reason),
        company: {
            logoUrl: configSnapshot.logoUrl,
            name: rawData.companyName || configSnapshot.companyName,
            slogan: rawData.companySlogan || configSnapshot.slogan,
            headerColor: configSnapshot.headerColor,
            nameColor: configSnapshot.companyNameColor,
            fontFamilySource: configSnapshot.fontFamilySource,
            fontFamily: configSnapshot.fontFamily,
            fontUrl: configSnapshot.fontUrl,
            showCompanyName: configSnapshot.showCompanyName,
            logoWidth: configSnapshot.logoWidth,
            logoHeight: configSnapshot.logoHeight,
            logoMarginTop: configSnapshot.logoMarginTop,
            logoMarginLeft: configSnapshot.logoMarginLeft,
            phone: rawData.companyPhone || configSnapshot.phone,
            website: rawData.companyWebsite || configSnapshot.website,
            email: rawData.companyEmail || configSnapshot.email
        },
        client: {
            company: pickFirstValue(rawData.clientCompany, quoteContext.quote.customer_name),
            contactName: pickFirstValue(rawData.clientContactName, quoteContext.quote.contact_name),
            phone: pickFirstValue(rawData.clientPhone, quoteContext.quote.phone),
            email: pickFirstValue(rawData.clientEmail, quoteContext.quote.email)
        },
        seller: {
            name: salespersonName,
            role: 'Ejecutivo de Ventas',
            signatureUrl: sellerSignatureUrl
        },
        currency: {
            code: currency.code,
            label: currency.label,
            symbol: currency.symbol,
            exchangeRate: Number(rawData.exchangeRate || currency.exchangeRate || 1) || 1
        },
        currencies: configSnapshot.currencies,
        validity: pickFirstValue(rawData.validity, configSnapshot.defaultValidity),
        validityOptions: configSnapshot.validityOptions,
        priceDisplayMode: selectedPriceDisplayMode,
        pricePresentation: getProformaPricePresentation(selectedPriceDisplayMode),
        priceDetailMode: getProformaPriceDetail(selectedPriceDisplayMode),
        intro: pickFirstValue(rawData.intro, configSnapshot.intro),
        introStyle: rawData.introStyle || configSnapshot.introStyle,
        termsConditions: pickFirstValue(rawData.termsConditions, configSnapshot.termsConditions),
        paymentTerms: pickFirstValue(rawData.paymentTerms, configSnapshot.paymentTerms),
        deliveryTime: pickFirstValue(rawData.deliveryTime, configSnapshot.deliveryTime),
        technicalSpecs: pickFirstValue(rawData.technicalSpecs, configSnapshot.technicalSpecs),
        qualityPolicies: pickFirstValue(rawData.qualityPolicies, configSnapshot.qualityPolicies),
        sellerSignatureEnabled,
        priceDisplayModeOptions: buildProformaPriceDisplayOptions(),
        technicalSummary,
        products,
        totals: {
            subtotal: subtotalSummary,
            taxAmount: taxSummary,
            grandTotal,
            currencyCode: currency.code,
            currencySymbol: currency.symbol
        },
        footer: {
            disclaimer: 'Cotización proforma no constituye una factura fiscal',
            generatedOn: issueDate.toISOString()
        }
    };
}

async function getActiveTenantId(client = null) {
    const executor = client || { query: pgQuery };
    const result = await executor.query(`SELECT id FROM tenant ORDER BY creado_en ASC NULLS LAST, id ASC LIMIT 1`);
    return result.rows[0]?.id || null;
}

function escapeRegexLiteral(value = '') {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function loadGeneralNomenclature() {
    const config = await loadGeneralConfig();
    return config?.general || {};
}

async function generateNextConfiguredCode({ client = null, tableName, columnName, prefix, fallbackPrefix, padLength = 6 }) {
    const executor = client || { query: pgQuery };
    const safePrefix = String(prefix || fallbackPrefix || '').trim() || String(fallbackPrefix || '').trim();
    const regex = `^${escapeRegexLiteral(safePrefix)}[0-9]+$`;
    const result = await executor.query(
        `SELECT ${columnName} AS code FROM ${tableName} WHERE ${columnName} ~* $1`,
        [regex]
    );
    let maxValue = 0;
    let resolvedPad = Math.max(0, Number(padLength || 0));
    const matcher = new RegExp(`^${escapeRegexLiteral(safePrefix)}(\\d+)$`, 'i');
    for (const row of result.rows || []) {
        const match = String(row.code || '').trim().match(matcher);
        if (!match) continue;
        const numeric = Number(match[1]);
        if (Number.isFinite(numeric)) {
            maxValue = Math.max(maxValue, numeric);
            resolvedPad = Math.max(resolvedPad, match[1].length);
        }
    }
    const suffix = String(maxValue + 1).padStart(resolvedPad, '0');
    return `${safePrefix}${suffix}`;
}

function quoteOwnedCalculationPredicate(calcAlias = 'fc', quoteAlias = 'q') {
    return `(
        ${quoteAlias}.quote_code IS NULL
        OR ${quoteAlias}.created_at IS NULL
        OR ${calcAlias}.created_at IS NULL
        OR ${calcAlias}.created_at >= ${quoteAlias}.created_at - INTERVAL '5 minutes'
        OR (
            COALESCE(${quoteAlias}.raw_data->>'Clave_Solicitud', '') <> ''
            AND ${calcAlias}.raw_data->>'Clave_Solicitud' = ${quoteAlias}.raw_data->>'Clave_Solicitud'
        )
    )`;
}

async function generateNextQuoteCode(client = null) {
    const general = await loadGeneralNomenclature();
    const executor = client || { query: pgQuery };
    const safePrefix = String(general.quoteCodePrefix || 'C-').trim() || 'C-';
    const regex = `^${escapeRegexLiteral(safePrefix)}[0-9]+$`;
    const result = await executor.query(
        `SELECT code
           FROM (
                SELECT quote_code AS code FROM quotes WHERE quote_code ~* $1
                UNION
                SELECT quote_code AS code FROM flexo_calculations WHERE quote_code ~* $1
           ) used_codes`,
        [regex]
    );
    let maxValue = 0;
    let resolvedPad = 6;
    const matcher = new RegExp(`^${escapeRegexLiteral(safePrefix)}(\\d+)$`, 'i');
    for (const row of result.rows || []) {
        const match = String(row.code || '').trim().match(matcher);
        if (!match) continue;
        const numeric = Number(match[1]);
        if (Number.isFinite(numeric)) {
            maxValue = Math.max(maxValue, numeric);
            resolvedPad = Math.max(resolvedPad, match[1].length);
        }
    }
    return `${safePrefix}${String(maxValue + 1).padStart(resolvedPad, '0')}`;
}

async function generateNextLineCode(client = null) {
    const general = await loadGeneralNomenclature();
    return generateNextConfiguredCode({
        client,
        tableName: 'flexo_calculations',
        columnName: 'line_code',
        prefix: general.quoteLineCodePrefix,
        fallbackPrefix: 'LC',
        padLength: 0
    });
}

async function generateNextCalculationCode(client = null) {
    const executor = client || { query: pgQuery };
    const result = await executor.query(
        `SELECT calculation_code
           FROM flexo_calculations
          WHERE calculation_code ~ '^CF-[0-9]+$'
          ORDER BY CAST(REPLACE(calculation_code, 'CF-', '') AS INTEGER) DESC
          LIMIT 1`
    );
    const current = Number(String(result.rows[0]?.calculation_code || 'CF-0').replace('CF-', '')) || 0;
    return `CF-${String(current + 1).padStart(6, '0')}`;
}

async function generateNextProductCode(client = null) {
    const general = await loadGeneralNomenclature();
    return generateNextConfiguredCode({
        client,
        tableName: 'flexo_products',
        columnName: 'product_code',
        prefix: general.productCodePrefix,
        fallbackPrefix: 'P-',
        padLength: 6
    });
}

async function generateNextOrderCode(client = null) {
    const general = await loadGeneralNomenclature();
    return generateNextConfiguredCode({
        client,
        tableName: 'flexo_orders',
        columnName: 'order_code',
        prefix: general.orderCodePrefix,
        fallbackPrefix: 'OP-',
        padLength: 6
    });
}

async function ensureProductCatalogSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS flexo_products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_code TEXT UNIQUE,
            line_code TEXT,
            quote_code TEXT,
            client_code TEXT,
            client_name TEXT,
            product_name TEXT,
            product_type TEXT,
            department TEXT,
            material_name TEXT,
            quoted_machine TEXT,
            die_code TEXT,
            quantity_products NUMERIC(14,4),
            quantity_types NUMERIC(14,4),
            tint_count NUMERIC(14,4),
            width_inches NUMERIC(12,4),
            length_inches NUMERIC(12,4),
            price_unit NUMERIC(14,4),
            total_price NUMERIC(14,4),
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS flexo_product_quote_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_code TEXT NOT NULL,
            quote_code TEXT NOT NULL,
            line_code TEXT,
            action TEXT NOT NULL DEFAULT 'quote',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_by TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS source_calculation_code TEXT`);
    await pgQuery(`ALTER TABLE flexo_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_flexo_products_client ON flexo_products(client_code, client_name)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_flexo_product_history_product ON flexo_product_quote_history(product_code, created_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_flexo_product_history_quote ON flexo_product_quote_history(quote_code, line_code)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_flexo_products_quote_line ON flexo_products(quote_code, line_code)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_flexo_calculations_quote_line_created ON flexo_calculations(quote_code, line_code, created_at DESC)`);
}

async function ensureProductionSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS flexo_orders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_code TEXT UNIQUE,
            quote_code TEXT,
            line_code TEXT,
            product_code TEXT,
            machine_name TEXT,
            material_code TEXT,
            die_code TEXT,
            ordered_quantity NUMERIC(14,4),
            delivered_on DATE,
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_flexo_orders_created_at ON flexo_orders(created_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_flexo_orders_line_code ON flexo_orders(line_code)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_flexo_orders_quote_line ON flexo_orders(quote_code, line_code)`);
}

function normalizeAttachmentBase64(value) {
    return String(value || '')
        .trim()
        .replace(/^data:[^;]+;base64,/i, '')
        .replace(/\s/g, '');
}

function sanitizeStorageSegment(value, fallback) {
    const clean = String(value || '')
        .trim()
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
    return clean || fallback;
}

function sanitizeAttachmentFileName(fileName) {
    const clean = path.basename(String(fileName || 'archivo'))
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .trim()
        .slice(0, 180);
    return clean || 'archivo';
}

function ensureQuoteAttachmentStorageDir(quoteCode, lineCode) {
    const dir = path.join(
        QUOTE_ATTACHMENT_STORAGE_DIR,
        sanitizeStorageSegment(quoteCode, 'cotizacion'),
        sanitizeStorageSegment(lineCode, 'linea')
    );
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function resolveQuoteAttachmentStoragePath(storagePath) {
    if (!storagePath) return '';
    const root = path.resolve(QUOTE_ATTACHMENT_STORAGE_DIR);
    const absolute = path.resolve(APP_ROOT, String(storagePath));
    if (absolute !== root && !absolute.startsWith(root + path.sep)) return '';
    return absolute;
}

function writeQuoteLineAttachmentFile({ id, quoteCode, lineCode, fileName, contentBase64 }) {
    const normalizedBase64 = normalizeAttachmentBase64(contentBase64);
    const buffer = Buffer.from(normalizedBase64, 'base64');
    if (!normalizedBase64 || !buffer.length) {
        throw new Error('Contenido del adjunto inválido.');
    }
    const safeFileName = sanitizeAttachmentFileName(fileName);
    const extension = path.extname(safeFileName);
    const storageDir = ensureQuoteAttachmentStorageDir(quoteCode, lineCode);
    const absolutePath = path.join(storageDir, `${id}${extension || ''}`);
    fs.writeFileSync(absolutePath, buffer);
    return {
        storagePath: path.relative(APP_ROOT, absolutePath).split(path.sep).join('/'),
        sizeBytes: buffer.length,
        contentSha256: crypto.createHash('sha256').update(buffer).digest('hex')
    };
}

function deleteQuoteAttachmentFile(storagePath) {
    const absolutePath = resolveQuoteAttachmentStoragePath(storagePath);
    if (!absolutePath) return;
    try {
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
            fs.unlinkSync(absolutePath);
        }
    } catch (error) {
        console.error('No fue posible eliminar el archivo adjunto local:', error.message);
    }
}

function deleteQuoteAttachmentFiles(rows) {
    (rows || []).forEach((row) => deleteQuoteAttachmentFile(row?.storage_path || row?.storagePath || row));
}

function ensureNotificationAttachmentStorageDir(threadCode) {
    const dir = path.join(NOTIFICATION_ATTACHMENT_STORAGE_DIR, sanitizeStorageSegment(threadCode, 'hilo'));
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

function resolveNotificationAttachmentStoragePath(storagePath) {
    if (!storagePath) return '';
    const root = path.resolve(NOTIFICATION_ATTACHMENT_STORAGE_DIR);
    const absolute = path.resolve(APP_ROOT, String(storagePath));
    if (absolute !== root && !absolute.startsWith(root + path.sep)) return '';
    return absolute;
}

function deleteNotificationAttachmentFile(storagePath) {
    const absolutePath = resolveNotificationAttachmentStoragePath(storagePath);
    if (!absolutePath) return;
    try {
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
            fs.unlinkSync(absolutePath);
        }
    } catch (error) {
        console.error('No fue posible eliminar el adjunto de notificación:', error.message);
    }
}

function deleteNotificationAttachmentFiles(rows) {
    (rows || []).forEach((row) => deleteNotificationAttachmentFile(row?.storage_path || row?.storagePath || row));
}

function writeNotificationAttachmentFile({ id, threadCode, fileName, contentBase64 }) {
    const normalizedBase64 = normalizeAttachmentBase64(contentBase64);
    const buffer = Buffer.from(normalizedBase64, 'base64');
    if (!normalizedBase64 || !buffer.length) {
        throw new Error('Contenido del adjunto inválido.');
    }
    const safeFileName = sanitizeAttachmentFileName(fileName);
    const extension = path.extname(safeFileName);
    const storageDir = ensureNotificationAttachmentStorageDir(threadCode);
    const absolutePath = path.join(storageDir, `${id}${extension || ''}`);
    fs.writeFileSync(absolutePath, buffer);
    return {
        storagePath: path.relative(APP_ROOT, absolutePath).split(path.sep).join('/'),
        sizeBytes: buffer.length,
        contentSha256: crypto.createHash('sha256').update(buffer).digest('hex')
    };
}

async function migrateExistingQuoteLineAttachmentsToDisk() {
    const result = await pgQuery(`
        SELECT id, quote_code, line_code, file_name, content_base64
          FROM quote_line_attachments
         WHERE (storage_path IS NULL OR storage_path = '')
           AND content_base64 IS NOT NULL
           AND content_base64 <> ''
    `);
    for (const row of result.rows) {
        try {
            const stored = writeQuoteLineAttachmentFile({
                id: row.id,
                quoteCode: row.quote_code,
                lineCode: row.line_code,
                fileName: row.file_name,
                contentBase64: row.content_base64
            });
            await pgQuery(
                `UPDATE quote_line_attachments
                    SET storage_path = $2,
                        size_bytes = $3,
                        content_sha256 = $4,
                        content_base64 = NULL
                  WHERE id = $1`,
                [row.id, stored.storagePath, stored.sizeBytes, stored.contentSha256]
            );
        } catch (error) {
            console.error(`No fue posible migrar el adjunto ${row.id} a disco:`, error.message);
        }
    }
}

async function ensureAttachmentsSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS quote_line_attachments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quote_code TEXT NOT NULL,
            line_code TEXT NOT NULL,
            file_name TEXT NOT NULL,
            mime_type TEXT,
            file_ext TEXT,
            content_base64 TEXT,
            storage_path TEXT,
            size_bytes BIGINT,
            content_sha256 TEXT,
            notes TEXT,
            uploaded_by TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`ALTER TABLE quote_line_attachments ALTER COLUMN content_base64 DROP NOT NULL`);
    await pgQuery(`ALTER TABLE quote_line_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT`);
    await pgQuery(`ALTER TABLE quote_line_attachments ADD COLUMN IF NOT EXISTS size_bytes BIGINT`);
    await pgQuery(`ALTER TABLE quote_line_attachments ADD COLUMN IF NOT EXISTS content_sha256 TEXT`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_quote_line_attachments_line ON quote_line_attachments(quote_code, line_code)`);
    await migrateExistingQuoteLineAttachmentsToDisk();
}

async function ensureNotificationsSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS quote_line_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quote_code TEXT NOT NULL,
            line_code TEXT NOT NULL,
            seller_name TEXT,
            customer_name TEXT,
            job_name TEXT,
            issue_text TEXT NOT NULL,
            target_user TEXT,
            created_by TEXT,
            snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_quote_line_notifications_line ON quote_line_notifications(quote_code, line_code, created_at DESC)`);
}

function normalizeNotificationChannelKeyRecord(row = {}) {
    return {
        channelKey: String(row.channel_key || '').trim(),
        displayName: String(row.display_name || '').trim(),
        providerName: String(row.provider_name || '').trim(),
        apiUrl: String(row.api_url || '').trim(),
        accountIdentifier: String(row.account_identifier || '').trim(),
        accessKey: String(row.access_key || '').trim(),
        accessSecret: String(row.access_secret || '').trim(),
        enabled: row.is_enabled === true,
        testMode: row.is_test_mode === true,
        advancedConfig: row.advanced_config || {},
        lastValidatedAt: row.last_validated_at || null,
        updatedAt: row.updated_at || null
    };
}

async function ensureNotificationCenterSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS notification_center_threads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            thread_code TEXT NOT NULL UNIQUE,
            conversation_type TEXT NOT NULL DEFAULT 'quote-line',
            source_module TEXT NOT NULL DEFAULT 'cotizaciones',
            document_type TEXT NOT NULL DEFAULT 'cotizacion',
            document_code TEXT NOT NULL DEFAULT '',
            quote_code TEXT NOT NULL DEFAULT '',
            line_code TEXT NOT NULL DEFAULT '',
            customer_name TEXT NOT NULL DEFAULT '',
            product_name TEXT NOT NULL DEFAULT '',
            product_summary TEXT NOT NULL DEFAULT '',
            seller_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
            seller_name TEXT NOT NULL DEFAULT '',
            seller_email TEXT NOT NULL DEFAULT '',
            seller_whatsapp TEXT NOT NULL DEFAULT '',
            seller_sms TEXT NOT NULL DEFAULT '',
            created_by_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
            created_by_name TEXT NOT NULL DEFAULT '',
            target_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
            target_user_name TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'abierta',
            last_message_at TIMESTAMPTZ NULL,
            snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS notification_center_threads_document_idx ON notification_center_threads(document_code, quote_code, line_code)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS notification_center_threads_target_idx ON notification_center_threads(target_user_id, status, updated_at DESC)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS notification_center_participants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            thread_id UUID NOT NULL REFERENCES notification_center_threads(id) ON DELETE CASCADE,
            user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
            role_key TEXT NOT NULL DEFAULT 'participante',
            display_name TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL DEFAULT '',
            whatsapp_phone TEXT NOT NULL DEFAULT '',
            sms_phone TEXT NOT NULL DEFAULT '',
            can_manage BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS notification_center_participants_thread_idx ON notification_center_participants(thread_id, role_key)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_notification_participants_user ON notification_center_participants(user_id)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS notification_center_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_code TEXT NOT NULL UNIQUE,
            thread_id UUID NOT NULL REFERENCES notification_center_threads(id) ON DELETE CASCADE,
            message_type TEXT NOT NULL DEFAULT 'texto',
            channel_key TEXT NOT NULL DEFAULT 'interno',
            body_text TEXT NOT NULL DEFAULT '',
            sender_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
            sender_name TEXT NOT NULL DEFAULT '',
            sender_email TEXT NOT NULL DEFAULT '',
            sender_whatsapp TEXT NOT NULL DEFAULT '',
            sender_sms TEXT NOT NULL DEFAULT '',
            recipient_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
            recipient_name TEXT NOT NULL DEFAULT '',
            recipient_email TEXT NOT NULL DEFAULT '',
            recipient_whatsapp TEXT NOT NULL DEFAULT '',
            recipient_sms TEXT NOT NULL DEFAULT '',
            is_inbound BOOLEAN NOT NULL DEFAULT FALSE,
            external_status TEXT NOT NULL DEFAULT 'pendiente',
            delivered_at TIMESTAMPTZ NULL,
            received_at TIMESTAMPTZ NULL,
            read_at TIMESTAMPTZ NULL,
            failed_at TIMESTAMPTZ NULL,
            sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS notification_center_messages_thread_idx ON notification_center_messages(thread_id, sent_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS notification_center_messages_channel_idx ON notification_center_messages(channel_key, external_status, sent_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_notification_messages_recipient_read ON notification_center_messages(recipient_user_id, read_at)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS notification_center_message_attachments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id UUID NOT NULL REFERENCES notification_center_messages(id) ON DELETE CASCADE,
            attachment_kind TEXT NOT NULL DEFAULT 'archivo',
            file_name TEXT NOT NULL,
            mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
            file_ext TEXT NOT NULL DEFAULT '',
            content_base64 TEXT NOT NULL DEFAULT '',
            storage_path TEXT NOT NULL DEFAULT '',
            content_sha256 TEXT NOT NULL DEFAULT '',
            size_bytes BIGINT NOT NULL DEFAULT 0,
            notes TEXT NOT NULL DEFAULT '',
            uploaded_by TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`ALTER TABLE notification_center_message_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE notification_center_message_attachments ADD COLUMN IF NOT EXISTS content_sha256 TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE notification_center_message_attachments ADD COLUMN IF NOT EXISTS preview_base64 TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS notification_center_message_attachments_message_idx ON notification_center_message_attachments(message_id, created_at DESC)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS notification_channel_keys (
            channel_key TEXT PRIMARY KEY,
            display_name TEXT NOT NULL DEFAULT '',
            provider_name TEXT NOT NULL DEFAULT '',
            api_url TEXT NOT NULL DEFAULT '',
            account_identifier TEXT NOT NULL DEFAULT '',
            access_key TEXT NOT NULL DEFAULT '',
            access_secret TEXT NOT NULL DEFAULT '',
            is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            is_test_mode BOOLEAN NOT NULL DEFAULT TRUE,
            advanced_config JSONB NOT NULL DEFAULT '{}'::jsonb,
            last_validated_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS admin_user_channel_settings (
            user_id BIGINT PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
            outbound_email TEXT NOT NULL DEFAULT '',
            provider_type TEXT NOT NULL DEFAULT 'smtp',
            smtp_host TEXT NOT NULL DEFAULT '',
            smtp_port INTEGER NOT NULL DEFAULT 587,
            smtp_secure BOOLEAN NOT NULL DEFAULT TRUE,
            smtp_username TEXT NOT NULL DEFAULT '',
            smtp_password TEXT NOT NULL DEFAULT '',
            sender_display_name TEXT NOT NULL DEFAULT '',
            last_tested_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        INSERT INTO notification_channel_keys (
            channel_key, display_name, provider_name, api_url, account_identifier, access_key, access_secret, is_enabled, is_test_mode
        )
        VALUES
            ('whatsapp', 'WhatsApp', '', '', '', '', '', FALSE, TRUE),
            ('correo', 'Correo Electrónico', '', '', '', '', '', FALSE, TRUE),
            ('sms', 'SMS', '', '', '', '', '', FALSE, TRUE),
            ('interno', 'Mensajería Interna', 'sistema', '', '', '', '', TRUE, TRUE)
        ON CONFLICT (channel_key) DO NOTHING
    `);
}

async function ensureNotificationAlertContactsSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS notification_alert_contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name TEXT NOT NULL,
            email TEXT NOT NULL DEFAULT '',
            phone TEXT NOT NULL DEFAULT '',
            severity_low BOOLEAN NOT NULL DEFAULT FALSE,
            severity_medium BOOLEAN NOT NULL DEFAULT FALSE,
            severity_high BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS notification_alert_contacts_active_idx ON notification_alert_contacts(is_active, updated_at DESC)`);
}

async function ensureInventoryClassificationMappingsSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS inventory_classification_mappings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_value TEXT NOT NULL UNIQUE,
            flexo_category TEXT NOT NULL DEFAULT '',
            display_label TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS inventory_classification_mappings_active_idx ON inventory_classification_mappings(is_active, updated_at DESC)`);
}

function normalizeInventoryClassificationMappingRow(row = {}) {
    return {
        id: String(row.id || '').trim(),
        sourceValue: String(row.source_value || '').trim(),
        flexoCategory: String(row.flexo_category || '').trim(),
        displayLabel: String(row.display_label || '').trim(),
        notes: String(row.notes || '').trim(),
        isActive: row.is_active !== false,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null
    };
}

function buildNotificationCenterThreadCode(quoteCode = '', lineCode = '') {
    const quotePart = String(quoteCode || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    const linePart = String(lineCode || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    return `HILO-${quotePart || 'SIN-COTIZACION'}-${linePart || 'SIN-LINEA'}`;
}

function buildNotificationCenterMessageCode(threadCode = '') {
    const prefix = String(threadCode || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 40) || 'HILO';
    return `MSG-${prefix}-${crypto.randomUUID()}`;
}

function buildNotificationCenterProductSummary(lineRow = {}) {
    const raw = lineRow?.raw_data || {};
    const parts = [
        pickFirstValue(raw['Resumen Cotización'], raw['Resumen Cotizacion']),
        pickFirstValue(raw['GENERAL | MATERIAL'], raw['Material']),
        pickFirstValue(lineRow.machine_name, raw['CONV | MAQUINA'], raw['DIGITAL | MAQUINA']),
        pickFirstValue(raw['GENERAL | MEDIDAS'])
    ]
        .map((item) => sanitizeAdminUserText(item))
        .filter(Boolean);
    return parts.slice(0, 3).join(' · ');
}

function normalizeNotificationCenterThreadRow(row = {}) {
    return {
        id: String(row.id || '').trim(),
        threadCode: String(row.thread_code || '').trim(),
        conversationType: String(row.conversation_type || '').trim(),
        sourceModule: String(row.source_module || '').trim(),
        documentType: String(row.document_type || '').trim(),
        documentCode: String(row.document_code || '').trim(),
        quoteCode: String(row.quote_code || '').trim(),
        lineCode: String(row.line_code || '').trim(),
        customerName: String(row.customer_name || '').trim(),
        productName: String(row.product_name || '').trim(),
        productSummary: String(row.product_summary || '').trim(),
        sellerUserId: row.seller_user_id != null ? Number(row.seller_user_id) : null,
        sellerName: String(row.seller_display_name || row.seller_name || '').trim(),
        sellerEmail: String(row.seller_email || '').trim(),
        sellerWhatsapp: String(row.seller_whatsapp || '').trim(),
        sellerSms: String(row.seller_sms || '').trim(),
        createdByUserId: row.created_by_user_id != null ? Number(row.created_by_user_id) : null,
        createdByName: String(row.created_by_display_name || row.created_by_name || '').trim(),
        targetUserId: row.target_user_id != null ? Number(row.target_user_id) : null,
        targetUserName: String(row.target_display_name || row.target_user_name || '').trim(),
        status: String(row.status || '').trim() || 'abierta',
        lastMessageAt: row.last_message_at || null,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
        lastMessagePreview: String(row.last_message_preview || '').trim(),
        messageCount: Number(row.message_count || 0),
        unreadCount: Number(row.unread_count || 0),
        attachmentCount: Number(row.attachment_count || 0),
        snapshot: row.snapshot || {}
    };
}

function normalizeNotificationCenterMessageRow(row = {}, attachments = []) {
    return {
        id: String(row.id || '').trim(),
        messageCode: String(row.message_code || '').trim(),
        threadId: String(row.thread_id || '').trim(),
        messageType: String(row.message_type || '').trim() || 'texto',
        channelKey: String(row.channel_key || '').trim() || 'interno',
        bodyText: String(row.body_text || '').trim(),
        senderUserId: row.sender_user_id != null ? Number(row.sender_user_id) : null,
        senderName: String(row.sender_name || '').trim(),
        senderEmail: String(row.sender_email || '').trim(),
        senderWhatsapp: String(row.sender_whatsapp || '').trim(),
        senderSms: String(row.sender_sms || '').trim(),
        recipientUserId: row.recipient_user_id != null ? Number(row.recipient_user_id) : null,
        recipientName: String(row.recipient_name || '').trim(),
        recipientEmail: String(row.recipient_email || '').trim(),
        recipientWhatsapp: String(row.recipient_whatsapp || '').trim(),
        recipientSms: String(row.recipient_sms || '').trim(),
        isInbound: row.is_inbound === true,
        externalStatus: String(row.external_status || '').trim() || 'pendiente',
        deliveredAt: row.delivered_at || null,
        receivedAt: row.received_at || null,
        readAt: row.read_at || null,
        failedAt: row.failed_at || null,
        sentAt: row.sent_at || null,
        metadata: row.metadata || {},
        attachments
    };
}

function normalizeNotificationCenterParticipantRow(row = {}) {
    return {
        id: String(row.id || '').trim(),
        threadId: String(row.thread_id || '').trim(),
        userId: row.user_id != null ? Number(row.user_id) : null,
        roleKey: String(row.role_key || '').trim() || 'participante',
        displayName: String(row.display_name || '').trim(),
        email: String(row.email || '').trim(),
        whatsappPhone: String(row.whatsapp_phone || '').trim(),
        smsPhone: String(row.sms_phone || '').trim(),
        canManage: row.can_manage === true,
        createdAt: row.created_at || null
    };
}

function normalizeNotificationAlertContactRow(row = {}) {
    return {
        id: String(row.id || '').trim(),
        fullName: String(row.full_name || '').trim(),
        email: String(row.email || '').trim(),
        phone: String(row.phone || '').trim(),
        severityLow: row.severity_low === true,
        severityMedium: row.severity_medium === true,
        severityHigh: row.severity_high === true,
        isActive: row.is_active === true,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null
    };
}

async function listNotificationAlertContactsBySeverity(severity = 'high') {
    const normalizedSeverity = String(severity || '').trim().toLowerCase();
    const severityColumn = normalizedSeverity === 'low'
        ? 'severity_low'
        : normalizedSeverity === 'medium'
            ? 'severity_medium'
            : 'severity_high';
    const result = await pgQuery(
        `SELECT id, full_name, email, phone, severity_low, severity_medium, severity_high, is_active, created_at, updated_at
           FROM notification_alert_contacts
          WHERE is_active = TRUE
            AND ${severityColumn} = TRUE
          ORDER BY LOWER(full_name), created_at DESC`
    );
    return result.rows.map(normalizeNotificationAlertContactRow);
}

async function findAdminUserByIdentity(identity, client = null) {
    const normalizedIdentity = sanitizeAdminUserText(identity);
    if (!normalizedIdentity) return null;
    const executor = client || { query: pgQuery };
    const result = await executor.query(
        `SELECT u.id, u.full_name, u.username, u.email, u.phone, u.phone_secondary, u.permission_id, p.permission_name
           FROM admin_users u
      LEFT JOIN admin_permissions p
             ON p.id = u.permission_id
          WHERE LOWER(TRIM(u.username)) = LOWER(TRIM($1))
             OR LOWER(TRIM(u.full_name)) = LOWER(TRIM($1))
             OR LOWER(TRIM(COALESCE(u.email, ''))) = LOWER(TRIM($1))
          ORDER BY u.id
          LIMIT 1`,
        [normalizedIdentity]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
        id: Number(row.id || 0),
        name: sanitizeAdminUserText(row.full_name, row.username),
        username: sanitizeAdminUserText(row.username),
        email: sanitizeAdminUserText(row.email),
        phone: sanitizeAdminUserText(row.phone),
        phoneSecondary: sanitizeAdminUserText(row.phone_secondary),
        permissionId: row.permission_id != null ? Number(row.permission_id) : null,
        permissionName: sanitizeAdminUserText(row.permission_name)
    };
}

async function ensureAdminUserFromSession(session, client = null) {
    const username = sanitizeAdminUserText(session?.username);
    if (!username) return null;
    const existing = await findAdminUserByIdentity(username, client);
    if (existing) return existing;
    const executor = client || { query: pgQuery };
    const inserted = await executor.query(
        `INSERT INTO admin_users (
            full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
            notify_email, notify_whatsapp, notify_sms, is_active, permission_id
         ) VALUES ($1,$2,'',$3,$4,$5,'',$6,$7,$8,FALSE,FALSE,FALSE,TRUE,NULL)
         RETURNING id, full_name, username, email, phone, phone_secondary, permission_id`,
        [
            sanitizeAdminUserText(session?.name, username),
            username,
            sanitizeAdminUserText(session?.department),
            sanitizeAdminUserText(session?.process),
            sanitizeAdminUserText(session?.photoUrl),
            sanitizeAdminUserText(session?.email),
            sanitizeAdminUserText(session?.phone),
            sanitizeAdminUserText(session?.phoneSecondary)
        ]
    );
    const row = inserted.rows[0];
    if (!row) return null;
    return {
        id: Number(row.id || 0),
        name: sanitizeAdminUserText(row.full_name, row.username),
        username: sanitizeAdminUserText(row.username),
        email: sanitizeAdminUserText(row.email),
        phone: sanitizeAdminUserText(row.phone),
        phoneSecondary: sanitizeAdminUserText(row.phone_secondary),
        permissionId: row.permission_id != null ? Number(row.permission_id) : null,
        permissionName: ''
    };
}

async function resolveNotificationRequestActor(req, client = null) {
    const session = readErpSessionFromRequest(req);
    const identity = sanitizeAdminUserText(session?.username, session?.name);
    let user = identity ? await findAdminUserByIdentity(identity, client) : null;
    if (!user && session?.username) {
        user = await ensureAdminUserFromSession(session, client);
    }
    const permissionName = sanitizeAdminUserText(user?.permissionName, session?.permissionName);
    return {
        session,
        identity: sanitizeAdminUserText(identity, getConfiguredCurrentUser()),
        user,
        permissionName,
        canManageAll: isSuperAdminPermissionName(permissionName)
    };
}

async function upsertNotificationCenterParticipant(client, threadId, participant = {}) {
    const executor = client || { query: pgQuery };
    const displayName = sanitizeAdminUserText(participant.displayName, participant.name);
    const roleKey = sanitizeAdminUserText(participant.roleKey, 'participante') || 'participante';
    if (!threadId || !displayName) return;
    const existing = await executor.query(
        `SELECT id
           FROM notification_center_participants
          WHERE thread_id = $1
            AND role_key = $2
            AND (
                ($3::bigint IS NOT NULL AND user_id = $3)
                OR LOWER(TRIM(display_name)) = LOWER(TRIM($4))
            )
          ORDER BY created_at
          LIMIT 1`,
        [threadId, roleKey, participant.userId ?? null, displayName]
    );
    if (existing.rows.length) {
        await executor.query(
            `UPDATE notification_center_participants
                SET user_id = COALESCE($2, user_id),
                    display_name = $3,
                    email = $4,
                    whatsapp_phone = $5,
                    sms_phone = $6,
                    can_manage = $7
              WHERE id = $1`,
            [
                existing.rows[0].id,
                participant.userId ?? null,
                displayName,
                sanitizeAdminUserText(participant.email),
                sanitizeAdminUserText(participant.whatsappPhone, participant.phone),
                sanitizeAdminUserText(participant.smsPhone, participant.phoneSecondary, participant.phone),
                participant.canManage === true
            ]
        );
        return;
    }
    await executor.query(
        `INSERT INTO notification_center_participants (
            thread_id, user_id, role_key, display_name, email, whatsapp_phone, sms_phone, can_manage
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
            threadId,
            participant.userId ?? null,
            roleKey,
            displayName,
            sanitizeAdminUserText(participant.email),
            sanitizeAdminUserText(participant.whatsappPhone, participant.phone),
            sanitizeAdminUserText(participant.smsPhone, participant.phoneSecondary, participant.phone),
            participant.canManage === true
        ]
    );
}

async function ensureNotificationCenterThreadForQuoteLine({ quoteCode, lineCode, payload = {}, actor = null, client = null }) {
    const executor = client || { query: pgQuery };
    const context = await getQuoteLineContext(quoteCode, lineCode, client);
    if (!context?.quote || !context?.line) {
        throw new Error('No fue posible localizar la línea de cotización para la conversación.');
    }
    const quote = context.quote;
    const line = context.line;
    const raw = line.raw_data || {};
    const threadCode = buildNotificationCenterThreadCode(quoteCode, lineCode);
    const sellerName = sanitizeAdminUserText(payload.sellerName, payload.seller_name, quote.salesperson_name);
    const targetName = sanitizeAdminUserText(payload.targetUser, payload.target_user, sellerName);
    const actorIdentity = sanitizeAdminUserText(actor?.user?.username, actor?.user?.name, actor?.identity, payload.actor);
    const [sellerUser, targetUser, actorUser] = await Promise.all([
        findAdminUserByIdentity(sellerName, client),
        findAdminUserByIdentity(targetName, client),
        findAdminUserByIdentity(actorIdentity, client)
    ]);
    const productName = sanitizeAdminUserText(
        payload.jobName,
        payload.job_name,
        line.job_name,
        line.product_name,
        getProductNameFromRaw(raw, line.product_code || line.line_code)
    );
    const productSummary = buildNotificationCenterProductSummary(line);
    const snapshot = {
        quoteCode,
        lineCode,
        customerCode: sanitizeAdminUserText(quote.customer_code),
        customerName: sanitizeAdminUserText(quote.customer_name),
        contactName: sanitizeAdminUserText(quote.contact_name),
        sellerName,
        actorName: actorUser?.name || actorIdentity,
        jobName: productName,
        lineStatus: sanitizeAdminUserText(raw['SOLICITUD ESTADO'], raw['ESTADO LINEA']),
        productSummary
    };
    const result = await executor.query(
        `INSERT INTO notification_center_threads (
            thread_code, conversation_type, source_module, document_type, document_code, quote_code, line_code,
            customer_name, product_name, product_summary, seller_user_id, seller_name, seller_email, seller_whatsapp, seller_sms,
            created_by_user_id, created_by_name, target_user_id, target_user_name, status, last_message_at, snapshot, updated_at
         ) VALUES (
            $1,'quote-line','cotizaciones','cotizacion',$2,$3,$4,
            $5,$6,$7,$8,$9,$10,$11,$12,
            $13,$14,$15,$16,'abierta',NOW(),$17::jsonb,NOW()
         )
         ON CONFLICT (thread_code)
         DO UPDATE SET
            document_code = EXCLUDED.document_code,
            customer_name = EXCLUDED.customer_name,
            product_name = EXCLUDED.product_name,
            product_summary = EXCLUDED.product_summary,
            seller_user_id = COALESCE(EXCLUDED.seller_user_id, notification_center_threads.seller_user_id),
            seller_name = COALESCE(NULLIF(EXCLUDED.seller_name, ''), notification_center_threads.seller_name),
            seller_email = COALESCE(NULLIF(EXCLUDED.seller_email, ''), notification_center_threads.seller_email),
            seller_whatsapp = COALESCE(NULLIF(EXCLUDED.seller_whatsapp, ''), notification_center_threads.seller_whatsapp),
            seller_sms = COALESCE(NULLIF(EXCLUDED.seller_sms, ''), notification_center_threads.seller_sms),
            created_by_user_id = COALESCE(EXCLUDED.created_by_user_id, notification_center_threads.created_by_user_id),
            created_by_name = COALESCE(NULLIF(EXCLUDED.created_by_name, ''), notification_center_threads.created_by_name),
            target_user_id = COALESCE(EXCLUDED.target_user_id, notification_center_threads.target_user_id),
            target_user_name = COALESCE(NULLIF(EXCLUDED.target_user_name, ''), notification_center_threads.target_user_name),
            snapshot = notification_center_threads.snapshot || EXCLUDED.snapshot,
            updated_at = NOW()
         RETURNING *`,
        [
            threadCode,
            sanitizeAdminUserText(quoteCode),
            sanitizeAdminUserText(quoteCode),
            sanitizeAdminUserText(lineCode),
            sanitizeAdminUserText(payload.customerName, payload.customer_name, quote.customer_name),
            productName,
            productSummary,
            sellerUser?.id ?? null,
            sellerName,
            sanitizeAdminUserText(sellerUser?.email),
            sanitizeAdminUserText(sellerUser?.phone),
            sanitizeAdminUserText(sellerUser?.phoneSecondary, sellerUser?.phone),
            actorUser?.id ?? null,
            sanitizeAdminUserText(actorUser?.name, actorIdentity),
            targetUser?.id ?? sellerUser?.id ?? null,
            sanitizeAdminUserText(targetUser?.name, targetName),
            JSON.stringify(snapshot)
        ]
    );
    const thread = result.rows[0];
    await upsertNotificationCenterParticipant(client, thread.id, {
        userId: sellerUser?.id ?? null,
        roleKey: 'vendedor',
        displayName: sellerName,
        email: sellerUser?.email || '',
        whatsappPhone: sellerUser?.phone || '',
        smsPhone: sellerUser?.phoneSecondary || sellerUser?.phone || '',
        canManage: actor?.canManageAll === true
    });
    await upsertNotificationCenterParticipant(client, thread.id, {
        userId: actorUser?.id ?? null,
        roleKey: 'creador',
        displayName: sanitizeAdminUserText(actorUser?.name, actorIdentity),
        email: actorUser?.email || '',
        whatsappPhone: actorUser?.phone || '',
        smsPhone: actorUser?.phoneSecondary || actorUser?.phone || '',
        canManage: actor?.canManageAll === true
    });
    if (sanitizeAdminUserText(targetName) && sanitizeAdminUserText(targetName).toLowerCase() !== sanitizeAdminUserText(actorUser?.name, actorIdentity).toLowerCase()) {
        await upsertNotificationCenterParticipant(client, thread.id, {
            userId: targetUser?.id ?? null,
            roleKey: 'destino',
            displayName: sanitizeAdminUserText(targetUser?.name, targetName),
            email: targetUser?.email || '',
            whatsappPhone: targetUser?.phone || '',
            smsPhone: targetUser?.phoneSecondary || targetUser?.phone || '',
            canManage: actor?.canManageAll === true
        });
    }
    return thread;
}

async function createNotificationCenterMessage({ thread, payload = {}, sender = null, recipient = null, attachments = [], client = null }) {
    const executor = client || { query: pgQuery };
    const hasAttachment = Array.isArray(attachments) && attachments.length > 0;
    const messageType = sanitizeAdminUserText(payload.messageType, hasAttachment ? 'adjunto' : 'texto') || 'texto';
    const bodyText = String(payload.bodyText || payload.issueText || payload.issue_text || '').trim();
    if (!bodyText && !hasAttachment) {
        throw new Error('Debes indicar un mensaje o al menos un adjunto.');
    }
    const maxBytes = (Number(payload.maxUploadMb) || 10) * 1024 * 1024;
    for (const att of attachments) {
        const b64 = String(att?.contentBase64 || '').replace(/^data:[^;]+;base64,/, '');
        const bytes = Buffer.from(b64, 'base64').length;
        if (bytes > maxBytes) {
            throw new Error(`El archivo "${att.fileName || att.name || 'desconocido'}" excede el límite de ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`);
        }
    }
    const result = await executor.query(
        `INSERT INTO notification_center_messages (
            message_code, thread_id, message_type, channel_key, body_text,
            sender_user_id, sender_name, sender_email, sender_whatsapp, sender_sms,
            recipient_user_id, recipient_name, recipient_email, recipient_whatsapp, recipient_sms,
            is_inbound, external_status, delivered_at, received_at, read_at, sent_at, metadata
         ) VALUES (
            $1,$2,$3,'interno',$4,
            $5,$6,$7,$8,$9,
            $10,$11,$12,$13,$14,
            $15,'interno',NOW(),NOW(),$16,NOW(),$17::jsonb
         )
         RETURNING *`,
        [
            buildNotificationCenterMessageCode(thread.thread_code),
            thread.id,
            messageType,
            bodyText,
            sender?.id ?? null,
            sanitizeAdminUserText(sender?.name, payload.actor, getConfiguredCurrentUser()),
            sanitizeAdminUserText(sender?.email),
            sanitizeAdminUserText(sender?.phone),
            sanitizeAdminUserText(sender?.phoneSecondary, sender?.phone),
            recipient?.id ?? null,
            sanitizeAdminUserText(recipient?.name, thread.target_user_name, thread.seller_name),
            sanitizeAdminUserText(recipient?.email),
            sanitizeAdminUserText(recipient?.phone),
            sanitizeAdminUserText(recipient?.phoneSecondary, recipient?.phone),
            payload.isInbound === true,
            payload.markRead === true ? new Date().toISOString() : null,
            JSON.stringify(payload.metadata || {})
        ]
    );
    const message = result.rows[0];
    const insertedAttachments = [];
    for (const attachment of attachments.slice(0, 10)) {
        const contentBase64 = String(attachment?.contentBase64 || '').trim();
        const fileName = sanitizeAdminUserText(attachment?.fileName, attachment?.name);
        if (!contentBase64 || !fileName) continue;
        const attachmentId = crypto.randomUUID();
        const stored = writeNotificationAttachmentFile({
            id: attachmentId,
            threadCode: thread.thread_code,
            fileName,
            contentBase64
        });
        const mimeType = sanitizeAdminUserText(attachment?.mimeType, 'application/octet-stream') || 'application/octet-stream';
        let previewBase64 = '';
        if (mimeType.startsWith('image/')) {
            try {
                const sharp = require('sharp');
                const raw = contentBase64.replace(/^data:[^;]+;base64,/, '');
                const buf = Buffer.from(raw, 'base64');
                const thumb = await sharp(buf)
                    .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 70 })
                    .toBuffer();
                previewBase64 = 'data:image/webp;base64,' + thumb.toString('base64');
            } catch (e) {
                console.error('Error generating preview for', fileName, ':', e.message);
            }
        }
        const attachmentResult = await executor.query(
            `INSERT INTO notification_center_message_attachments (
                id, message_id, attachment_kind, file_name, mime_type, file_ext, content_base64, storage_path, content_sha256, size_bytes, notes, uploaded_by, preview_base64
             ) VALUES ($1,$2,$3,$4,$5,$6,'',$7,$8,$9,$10,$11,$12)
             RETURNING id, attachment_kind, file_name, mime_type, file_ext, storage_path, size_bytes, notes, uploaded_by, created_at, preview_base64`,
            [
                attachmentId,
                message.id,
                sanitizeAdminUserText(attachment?.attachmentKind, attachment?.kind, 'archivo'),
                fileName,
                mimeType,
                sanitizeAdminUserText(attachment?.fileExt, path.extname(fileName).replace('.', '')),
                stored.storagePath,
                stored.contentSha256,
                stored.sizeBytes,
                sanitizeAdminUserText(attachment?.notes),
                sanitizeAdminUserText(sender?.name, payload.actor, getConfiguredCurrentUser()),
                previewBase64
            ]
        );
        insertedAttachments.push({
            id: String(attachmentResult.rows[0]?.id || '').trim(),
            attachmentKind: String(attachmentResult.rows[0]?.attachment_kind || '').trim(),
            fileName: String(attachmentResult.rows[0]?.file_name || '').trim(),
            mimeType: String(attachmentResult.rows[0]?.mime_type || '').trim(),
            fileExt: String(attachmentResult.rows[0]?.file_ext || '').trim(),
            downloadUrl: `/api/notification-center/attachments/${attachmentResult.rows[0]?.id}/download`,
            sizeBytes: Number(attachmentResult.rows[0]?.size_bytes || 0),
            notes: String(attachmentResult.rows[0]?.notes || '').trim(),
            uploadedBy: String(attachmentResult.rows[0]?.uploaded_by || '').trim(),
            createdAt: attachmentResult.rows[0]?.created_at || null,
            previewBase64: attachmentResult.rows[0]?.preview_base64 || ''
        });
    }
    await executor.query(
        `UPDATE notification_center_threads
            SET last_message_at = NOW(),
                updated_at = NOW(),
                status = 'abierta'
          WHERE id = $1`,
        [thread.id]
    );
    return normalizeNotificationCenterMessageRow(message, insertedAttachments);
}

async function getAccessibleNotificationThreadByCode(threadCode, actor, client = null) {
    const executor = client || { query: pgQuery };
    if (!actor?.canManageAll && !actor?.user?.id) {
        throw new Error('No fue posible identificar al usuario actual para cargar la conversación.');
    }
    const result = await executor.query(
        `SELECT t.*
           FROM notification_center_threads t
          WHERE t.thread_code = $1
            AND (
                $2::boolean = TRUE
                OR t.seller_user_id = $3
                OR t.created_by_user_id = $3
                OR t.target_user_id = $3
                OR EXISTS (
                    SELECT 1
                      FROM notification_center_participants p
                     WHERE p.thread_id = t.id
                       AND p.user_id = $3
                )
            )
          LIMIT 1`,
        [threadCode, actor?.canManageAll === true, actor?.user?.id ?? null]
    );
    return result.rows[0] || null;
}

function normalizePlanningKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
}

function isCompletedOrderRecord(row = {}) {
    const raw = row.raw_data || {};
    const statuses = [
        row.status,
        row.delivered_on ? 'entregada' : '',
        raw.status,
        raw.order_status,
        raw['Estado Cotizacion'],
        raw['ESTADO LINEA'],
        raw['SOLICITUD ESTADO'],
        raw.line_summary?.status,
        raw.line_summary?.line_status
    ].filter(Boolean).map((value) => String(value).trim().toLowerCase());

    return row.delivered_on || statuses.some((value) => [
        'entregada',
        'entregado',
        'completada',
        'completado',
        'cerrada',
        'cerrado',
        'cancelada',
        'cancelado'
    ].includes(value));
}

function inferPlanningOrderSnapshot(orderRow = {}) {
    const raw = orderRow.raw_data || {};
    const lineSummary = raw.line_summary || {};
    const lineSnapshot = raw.line_snapshot || {};
    const lineRaw = lineSnapshot.raw_data || {};

    return {
        orderCode: orderRow.order_code,
        quoteCode: orderRow.quote_code,
        lineCode: orderRow.line_code,
        customerName: pickFirstValue(raw.customer_name, lineSummary.customer_name),
        jobName: pickFirstValue(lineSummary.job_name, lineSnapshot.jobName, lineRaw['NOMBRE TRABAJO']),
        productName: pickFirstValue(lineSummary.product_name, lineSnapshot.productName),
        processType: pickFirstValue(lineSummary.process_type, lineSnapshot.processType),
        machineName: pickFirstValue(orderRow.machine_name, lineSummary.machine_name, lineSnapshot.quotedMachine),
        materialName: pickFirstValue(orderRow.material_code, lineSummary.material_name, lineSnapshot.materialName),
        dieCode: pickFirstValue(orderRow.die_code, lineSummary.die_code, lineSnapshot.dieCode),
        orderedQuantity: Number(orderRow.ordered_quantity || 0),
        raw
    };
}

function isTruthyProcessFlag(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return value === true || ['si', 'sí', 'true', '1', 'x', 'activo'].includes(normalized);
}

function hasDeclaredProcessDetail(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return false;
    if (['no', 'sin', 'ninguno', 'ninguna', 'n/a'].includes(normalized)) return false;
    if (normalized.startsWith('sin ')) return false;
    return ![
        'sin barniz',
        'sin laminado',
        'sin estampado',
        'sin embosado',
        'sin numeracion',
        'sin numeración'
    ].includes(normalized);
}

const PLANNING_CLASSIFICATION_PROCESS_KEYS = Object.freeze([
    'diseno',
    'preprensa',
    'visto_bueno',
    'planchas',
    'tintas',
    'impresion',
    'acabados',
    'laminado',
    'troquelado',
    'estampado',
    'barnizado',
    'embosado',
    'numeracion',
    'rebobinado',
    'empaque'
]);

const PLANNING_BASE_PROCESS_KEYS = Object.freeze(['rebobinado', 'empaque']);

const PLANNING_PROCESS_LABELS = Object.freeze({
    diseno: 'Diseño',
    preprensa: 'Preprensa',
    visto_bueno: 'Visto Bueno',
    planchas: 'Planchas',
    tintas: 'Tintas',
    impresion: 'Impresión',
    acabados: 'Acabados',
    laminado: 'Laminado',
    troquelado: 'Troquelado',
    estampado: 'Estampado',
    barnizado: 'Barniz',
    embosado: 'Embosado',
    numeracion: 'Numeración',
    rebobinado: 'Rebobinado',
    empaque: 'Empaque'
});

const PRODUCTION_FLOW_SEQUENCE = Object.freeze([
    'diseno',
    'preprensa',
    'visto_bueno',
    'planchas',
    'impresion',
    'acabados',
    'barnizado',
    'laminado',
    'troquelado',
    'estampado',
    'embosado',
    'numeracion',
    'rebobinado',
    'empaque'
]);

const PRODUCTION_FLOW_LABELS = Object.freeze({
    diseno: 'Diseño',
    preprensa: 'Preprensa',
    visto_bueno: 'Visto Bueno',
    planchas: 'Planchas',
    impresion: 'Impresión',
    acabados: 'Acabados',
    barnizado: 'Barnizado',
    laminado: 'Laminado',
    troquelado: 'Troquelado',
    estampado: 'Estampado',
    embosado: 'Embosado',
    numeracion: 'Numeración',
    rebobinado: 'Rebobinado',
    empaque: 'Empaque'
});

function canonicalProductionFlowKey(value) {
    const key = canonicalPlanningProcessKey(value);
    if (key === 'visto' || key === 'visto-bueno') return 'visto_bueno';
    if (key === 'numerado') return 'numeracion';
    return key;
}

function normalizeOrderTrackingStepKey(value) {
    const raw = normalizePlanningKey(value);
    if (!raw) return '';
    if (raw.includes('orden-creada') || raw.includes('creacion-de-orden') || raw.includes('orden-creacion')) return 'orden_creada';
    if (raw.includes('solicitud-vendedor') || raw.includes('vendedor')) return 'solicitud_vendedor';
    if (raw.includes('planeacion') || raw.includes('planificacion') || raw.includes('seguimiento')) return 'planeacion';
    return canonicalProductionFlowKey(raw);
}

function canonicalPlanningProcessKey(value) {
    const key = normalizePlanningKey(value);
    if (!key) return '';
    if (key.includes('disen')) return 'diseno';
    if (key.includes('preprensa')) return 'preprensa';
    if (key.includes('visto') || key.includes('aprobacion') || key.includes('aprobacion')) return 'visto_bueno';
    if (key.includes('plancha')) return 'planchas';
    if (key.includes('tinta')) return 'tintas';
    if (key.includes('acabado')) return 'acabados';
    if (key.includes('impres')) return 'impresion';
    if (key.includes('laminad')) return 'laminado';
    if (key.includes('troquel')) return 'troquelado';
    if (key.includes('estamp')) return 'estampado';
    if (key.includes('barniz') || key.includes('barnizad')) return 'barnizado';
    if (key.includes('embos') || key.includes('relieve')) return 'embosado';
    if (key.includes('numer')) return 'numeracion';
    if (key.includes('rebobin')) return 'rebobinado';
    if (key.includes('empaque') || key.includes('packing')) return 'empaque';
    return key;
}

function normalizePlanningProcessKeys(list = []) {
    const source = Array.isArray(list) ? list : String(list || '').split(',');
    const allowed = new Set(PLANNING_CLASSIFICATION_PROCESS_KEYS);
    const order = new Map(PLANNING_CLASSIFICATION_PROCESS_KEYS.map((key, index) => [key, index]));
    return Array.from(new Set(source
        .map((item) => canonicalPlanningProcessKey(item?.processKey || item?.key || item?.process_name || item?.processName || item))
        .filter((key) => key && allowed.has(key))))
        .sort((left, right) => (order.get(left) ?? 999) - (order.get(right) ?? 999));
}

function positivePlanningAmount(...values) {
    return values.some((value) => {
        const parsed = parseLegacyNumber(value);
        const numeric = Number(parsed);
        return Number.isFinite(numeric) && numeric > 0;
    });
}

function processObjectLooksActive(item = {}) {
    return Boolean(item?.active || item?.enabled || item?.selected)
        || positivePlanningAmount(item?.subtotal, item?.rawSubtotal, item?.materialSubtotal, item?.machineSubtotal, item?.operatorSubtotal, item?.linearSubtotal, item?.plateCost);
}

function addPlanningProcessKey(target, key) {
    const canonical = canonicalPlanningProcessKey(key);
    if (PLANNING_CLASSIFICATION_PROCESS_KEYS.includes(canonical)) target.add(canonical);
}

function getUiStateProcessMeta(raw = {}) {
    const uiState = raw?.['Estado_UI'];
    if (!uiState || typeof uiState !== 'object') {
        return {
            finishes: {},
            numbering: {},
            activeProcessKeys: []
        };
    }
    const finishes = {};
    if (uiState.finishes && typeof uiState.finishes === 'object' && !Array.isArray(uiState.finishes)) {
        Object.assign(finishes, uiState.finishes);
    }
    (Array.isArray(uiState.printStages) ? uiState.printStages : []).forEach((stage) => {
        const inlineFinishes = stage?.inlineFinishes && typeof stage.inlineFinishes === 'object' ? stage.inlineFinishes : {};
        Object.entries(inlineFinishes).forEach(([key, value]) => {
            finishes[key] = value;
            if (key === 'barniz') finishes.varnish = value;
            if (key === 'numerado') finishes.numerado = value;
        });
    });
    return {
        finishes,
        externalFinishes: Array.isArray(uiState.finishes) ? uiState.finishes : [],
        numbering: uiState.numbering && typeof uiState.numbering === 'object' ? uiState.numbering : {},
        activeProcessKeys: normalizePlanningProcessKeys(uiState.activeProcessKeys || [])
    };
}

function getQuotedPlanningProcessKeys(orderRow = {}) {
    const snapshot = inferPlanningOrderSnapshot(orderRow);
    const orderRaw = snapshot.raw || {};
    const lineSnapshot = orderRaw.line_snapshot || {};
    const raw = lineSnapshot.raw_data || orderRaw || {};
    const result = raw['Datos_Cotizados'] || {};
    const uiProcessMeta = getUiStateProcessMeta(raw);
    const keys = new Set();
    const noPrint = String(snapshot.processType || raw['Proceso Productivo'] || '').toLowerCase().includes('sin impresion')
        || Boolean(raw['NO IMPRESION']);

    if (positivePlanningAmount(result?.design?.subtotal, result?.design?.rawSubtotal)) addPlanningProcessKey(keys, 'diseno');
    if (positivePlanningAmount(result?.prepress?.subtotal, result?.prepress?.rawSubtotal, lineSnapshot?.components?.prepress)) addPlanningProcessKey(keys, 'preprensa');
    if (!noPrint && (
        positivePlanningAmount(result?.print?.subtotal, result?.print?.rawSubtotal, lineSnapshot?.components?.print, lineSnapshot?.components?.runCost)
        || Boolean(snapshot.machineName)
    )) addPlanningProcessKey(keys, 'impresion');

    (Array.isArray(result?.print?.items) ? result.print.items : []).forEach((printItem) => {
        (Array.isArray(printItem?.inlineItems) ? printItem.inlineItems : []).forEach((inline) => {
            if (!processObjectLooksActive(inline)) return;
            addPlanningProcessKey(keys, inline.processKey || inline.key || inline.label);
        });
    });

    (Array.isArray(result?.finishes?.items) ? result.finishes.items : []).forEach((finish) => {
        if (!processObjectLooksActive(finish)) return;
        addPlanningProcessKey(keys, finish.processKey || finish.key || finish.label || finish.description);
    });

    Object.entries(uiProcessMeta.finishes || {}).forEach(([key, value]) => {
        if (processObjectLooksActive(value)) addPlanningProcessKey(keys, key);
    });

    (uiProcessMeta.externalFinishes || []).forEach((finish) => {
        if (processObjectLooksActive(finish)) addPlanningProcessKey(keys, finish.processKey || finish.key || finish.slotKey || finish.label);
    });

    if (
        isTruthyProcessFlag(raw['ACABADOS | BARNIZ'])
        || isTruthyProcessFlag(raw['BARNIZ'])
        || isTruthyProcessFlag(raw['BARNIZ UV'])
        || hasDeclaredProcessDetail(raw['REQ | Barniz'])
    ) addPlanningProcessKey(keys, 'barnizado');
    if (
        isTruthyProcessFlag(raw['ACABADOS | LAMINADO'])
        || isTruthyProcessFlag(raw['LAMINADO'])
        || hasDeclaredProcessDetail(raw['REQ | Laminado'])
    ) addPlanningProcessKey(keys, 'laminado');
    if (
        isTruthyProcessFlag(raw['ACABADOS | FOIL'])
        || isTruthyProcessFlag(raw['FOIL'])
        || isTruthyProcessFlag(raw['ESTAMPADO'])
        || hasDeclaredProcessDetail(raw['REQ | Estampado'])
    ) addPlanningProcessKey(keys, 'estampado');
    if (
        isTruthyProcessFlag(raw['ACABADOS | EMBOSADO'])
        || isTruthyProcessFlag(raw['EMBOSADO'])
        || isTruthyProcessFlag(raw['REQ | Embosado'])
    ) addPlanningProcessKey(keys, 'embosado');

    if (
        snapshot.dieCode
        || raw['GENERAL | TROQUEL | ID']
        || isTruthyProcessFlag(raw['TROQUELADO'])
        || isTruthyProcessFlag(raw['REQ | Troquelado'])
    ) addPlanningProcessKey(keys, 'troquelado');

    if (
        hasDeclaredProcessDetail(raw['REQ | Numeracion'])
        || hasDeclaredProcessDetail(raw['ACABADOS | NUMERADO DETALLE'])
        || isTruthyProcessFlag(raw['ACABADOS | NUMERADO'])
        || hasDeclaredProcessDetail(raw['NUMERADO'])
        || processObjectLooksActive(uiProcessMeta.finishes?.numerado)
        || hasDeclaredProcessDetail(uiProcessMeta.numbering?.type)
    ) addPlanningProcessKey(keys, 'numeracion');

    return normalizePlanningProcessKeys([...keys]);
}

function normalizeProcessDisplayList(list = []) {
    if (!Array.isArray(list)) return [];
    return list
        .map((item, index) => {
            if (!item) return null;
            if (typeof item === 'string') {
                const label = item.trim();
                if (!label) return null;
                return {
                    processKey: slugify(label),
                    processName: label,
                    sequenceOrder: index + 1,
                    source: 'declared'
                };
            }
            const processName = pickFirstValue(item.processName, item.name, item.label, item.title);
            if (!processName) return null;
            return {
                processKey: pickFirstValue(item.processKey, item.code, slugify(processName)),
                processName,
                sequenceOrder: Number(item.sequenceOrder || index + 1) || index + 1,
                source: pickFirstValue(item.source, 'declared')
            };
        })
        .filter(Boolean);
}

function resolveRawProcessDetail(raw = {}, keys = []) {
    for (const key of keys) {
        const value = raw[key];
        if (hasDeclaredProcessDetail(value)) {
            return String(value).trim();
        }
    }
    return '';
}

function buildCalculationProcessSnapshot({ raw = {}, processType = '', machineName = '', dieCode = '', uiState = null } = {}) {
    const declaredList = normalizeProcessDisplayList(
        Array.isArray(raw['Secuencia_Procesos']) && raw['Secuencia_Procesos'].length
            ? raw['Secuencia_Procesos']
            : Array.isArray(uiState?.processSequence) && uiState.processSequence.length
                ? uiState.processSequence
                : (() => {
                    if (!raw['BOT | Process Sequence Json']) return [];
                    try {
                        return JSON.parse(raw['BOT | Process Sequence Json']);
                    } catch (error) {
                        return [];
                    }
                })()
    );
    if (declaredList.length) {
        return declaredList.map((item, index) => ({
            ...item,
            sequenceOrder: index + 1
        }));
    }

    const normalizedProcessType = String(processType || raw['Proceso Productivo'] || '').trim() || 'Convencional';
    const isDigital = hasDigitalPrintingContext({
        processType: normalizedProcessType,
        machineName,
        raw
    });
    const uiProcessMeta = getUiStateProcessMeta(raw);
    const varnishDetail = resolveRawProcessDetail(raw, ['BARNIZ', 'ACABADOS | BARNIZ DETALLE', 'REQ | Barniz', 'BARNIZ UV']) || String(uiProcessMeta.finishes.varnish || '').trim();
    const laminateDetail = resolveRawProcessDetail(raw, ['LAMINADO', 'ACABADOS | LAMINADO DETALLE', 'REQ | Laminado']) || String(uiProcessMeta.finishes.laminado || '').trim();
    const stampingDetail = resolveRawProcessDetail(raw, ['ESTAMPADO', 'FOIL', 'ACABADOS | FOIL DETALLE', 'REQ | Estampado']) || String(uiProcessMeta.finishes.stamping || '').trim();
    const numberingDetail = resolveRawProcessDetail(raw, ['NUMERADO', 'ACABADOS | NUMERADO DETALLE', 'REQ | Numeracion', 'REQ | Numeracion Aviso']) || String(uiProcessMeta.numbering.type || '').trim();
    const embossDetail = resolveRawProcessDetail(raw, ['EMBOSADO', 'REQ | Embosado']);
    const processKeys = inferRouteProcessKeys({
        process_type: normalizedProcessType,
        machine_name: machineName,
        die_code: dieCode,
        raw_data: {
            line_snapshot: { raw_data: raw },
            line_summary: {
                process_type: normalizedProcessType,
                machine_name: machineName,
                die_code: dieCode
            }
        }
    });

    return processKeys.map((processKey, index) => {
        let processName = processKey;
        switch (processKey) {
        case 'preprensa':
            processName = 'Preprensa';
            break;
        case 'visto_bueno':
            processName = 'Visto Bueno';
            break;
        case 'planchas':
            processName = 'Planchas';
            break;
        case 'tintas':
            processName = 'Tintas';
            break;
        case 'impresion':
            processName = isDigital ? 'Impresión Digital' : 'Impresión Convencional';
            break;
        case 'acabados':
            processName = 'Acabados';
            break;
        case 'barnizado':
            processName = `Barniz ${varnishDetail}`.trim();
            break;
        case 'laminado':
            processName = `Laminado ${laminateDetail}`.trim();
            break;
        case 'estampado':
            processName = `Estampado ${stampingDetail}`.trim();
            break;
        case 'numeracion':
            processName = numberingDetail || 'Numeración';
            break;
        case 'embosado':
            processName = embossDetail ? `Embosado ${embossDetail}`.trim() : 'Embosado';
            break;
        case 'troquelado':
            processName = dieCode ? `Troquelado (${dieCode})` : 'Troquelado';
            break;
        case 'rebobinado':
            processName = 'Rebobinado';
            break;
        case 'empaque':
            processName = 'Empaque';
            break;
        default:
            processName = processKey;
            break;
        }
        return {
            processKey,
            processName,
            sequenceOrder: index + 1,
            source: 'inferred'
        };
    });
}

function inferRouteProcessKeys(orderRow = {}) {
    const controlSelection = normalizePlanningProcessKeys(orderRow?.raw_data?.planning_control?.selectedProcessKeys || orderRow?.raw_data?.planningControl?.selectedProcessKeys || []);
    if (controlSelection.length) return controlSelection;
    const quotedKeys = getQuotedPlanningProcessKeys(orderRow);
    const finishKeys = new Set(['laminado', 'troquelado', 'estampado', 'barnizado', 'embosado', 'numeracion', 'acabados']);
    const keys = new Set([
        ...quotedKeys.map((key) => finishKeys.has(key) ? canonicalProductionFlowKey(key) : key),
        'preprensa',
        'visto_bueno',
        ...PLANNING_BASE_PROCESS_KEYS
    ]);
    if (keys.has('impresion')) {
        ['preprensa', 'visto_bueno', 'impresion'].forEach((key) => keys.add(key));
    }
    if (!orderUsesInternalPlates(orderRow)) keys.delete('planchas');
    keys.delete('tintas');
    return normalizePlanningProcessKeys([...keys]);
}

function orderTrackingProcessKeys(orderRow = {}, routeRows = []) {
    const raw = orderRow?.raw_data || {};
    const selected = normalizePlanningProcessKeys(raw?.planning_control?.selectedProcessKeys || raw?.planningControl?.selectedProcessKeys || []);
    const quoted = getQuotedPlanningProcessKeys(orderRow);
    const sourceKeys = selected.length ? selected : quoted;
    const keys = new Set(sourceKeys.map(canonicalProductionFlowKey).filter((key) => PRODUCTION_FLOW_SEQUENCE.includes(key)));
    if (keys.has('impresion')) {
        ['preprensa', 'visto_bueno', 'impresion'].forEach((key) => keys.add(key));
    }
    if (!orderUsesInternalPlates(orderRow)) keys.delete('planchas');
    keys.delete('tintas');
    if (!keys.size) {
        routeRows.forEach((row) => {
            const key = canonicalProductionFlowKey(row.process_key || row.process_name);
            if (PRODUCTION_FLOW_SEQUENCE.includes(key)) keys.add(key);
        });
    }
    return [...keys];
}

function processOrderFromCosts(costsConfig = {}) {
    const rows = Array.isArray(costsConfig?.general?.processDefaults) ? costsConfig.general.processDefaults : [];
    const order = new Map();
    rows.forEach((row, index) => {
        const rawKey = String(row?.key || row?.label || '').trim().toLowerCase();
        if (['macula', 'troquel', 'sustrato', 'adicionales'].includes(rawKey)) return;
        const key = canonicalProductionFlowKey(rawKey || row?.label);
        if (key && !order.has(key)) order.set(key, Number(row?.order || ((index + 1) * 10)));
    });
    if (order.has('preprensa') && !order.has('visto_bueno')) order.set('visto_bueno', order.get('preprensa') + 0.5);
    return order;
}

const ORDER_TRACKING_MANDATORY_PROCESS_KEYS = Object.freeze(['preprensa', 'visto_bueno', 'rebobinado', 'empaque']);
const ORDER_TRACKING_HIDDEN_PROCESS_KEYS = new Set(['macula', 'troquel', 'sustrato', 'tintas']);
const ORDER_TRACKING_EXTERNAL_FINISH_KEYS = new Set(['acabados', 'barnizado', 'laminado', 'troquelado', 'estampado', 'embosado', 'numeracion']);

function orderLineRawData(orderRow = {}) {
    const raw = orderRow?.raw_data || {};
    return raw?.line_snapshot?.raw_data || raw;
}

function orderQuotedResult(orderRow = {}) {
    const raw = orderRow?.raw_data || {};
    const lineRaw = orderLineRawData(orderRow);
    const lineSnapshot = raw?.line_snapshot && typeof raw.line_snapshot === 'object' ? raw.line_snapshot : {};
    const lineSummary = raw?.line_summary && typeof raw.line_summary === 'object' ? raw.line_summary : {};
    return [
        lineRaw?.['Datos_Cotizados'],
        lineRaw?.CODEX_PROCESS_RESULT,
        lineRaw?.processResult,
        lineSnapshot?.raw_data?.['Datos_Cotizados'],
        lineSnapshot?.raw_data?.CODEX_PROCESS_RESULT,
        lineSnapshot?.processResult,
        lineSummary?.raw_data?.['Datos_Cotizados'],
        lineSummary?.raw_data?.CODEX_PROCESS_RESULT,
        raw?.['Datos_Cotizados'],
        raw?.CODEX_PROCESS_RESULT,
        raw?.processResult
    ].find((item) => item && typeof item === 'object' && !Array.isArray(item)) || {};
}

function firstPositivePlanningNumber(...values) {
    for (const value of values) {
        const parsed = parseLegacyNumber(value);
        const numeric = Number(parsed);
        if (Number.isFinite(numeric) && numeric > 0) return numeric;
    }
    return 0;
}

function quotedDurationMinutesFrom(item = {}) {
    if (!item || typeof item !== 'object') return 0;
    const minutes = firstPositivePlanningNumber(
        item.totalMinutes,
        Number(item.setupAdjustmentMin || 0) + Number(item.runMinutes || 0),
        Number(item.setupMinutes || 0) + Number(item.runMinutes || 0),
        item.durationMinutes,
        item.minutes
    );
    if (minutes > 0) return minutes;
    const hours = firstPositivePlanningNumber(item.time, item.hours, item.durationHours, item.totalHours);
    return hours > 0 ? hours * 60 : 0;
}

function quotedFinishDurationMinutesFrom(item = {}) {
    if (!item || typeof item !== 'object') return 0;
    const setupMinutes = firstPositivePlanningNumber(item.setupMinutes, item.setupAdjustmentMin);
    const runMinutes = firstPositivePlanningNumber(item.runMinutes);
    if (setupMinutes > 0 && runMinutes > 0) return setupMinutes + runMinutes;
    return quotedDurationMinutesFrom(item);
}

function quotedProcessDurationMinutes(orderRow = {}, processKey = '') {
    const key = canonicalProductionFlowKey(processKey);
    const result = orderQuotedResult(orderRow);
    if (!result || typeof result !== 'object') return 0;
    if (key === 'diseno') return quotedDurationMinutesFrom(result.design);
    if (key === 'preprensa') return quotedDurationMinutesFrom(result.prepress);
    if (key === 'impresion') {
        const direct = quotedDurationMinutesFrom(result.print);
        if (direct > 0) return direct;
        return (Array.isArray(result.print?.items) ? result.print.items : [])
            .reduce((sum, item) => sum + quotedDurationMinutesFrom(item), 0);
    }
    if (key === 'empaque') return quotedDurationMinutesFrom(result.packaging);
    if (key === 'planchas') {
        const direct = quotedDurationMinutesFrom(result.plates);
        if (direct > 0) return direct;
        return (Array.isArray(result.plates?.items) ? result.plates.items : [])
            .reduce((sum, item) => sum + quotedDurationMinutesFrom(item), 0);
    }
    const finishItems = Array.isArray(result.finishes?.items) ? result.finishes.items : [];
    const matchingFinishes = finishItems.filter((item) => {
        const candidates = [
            item.processKey,
            item.key,
            item.slotKey,
            item.label,
            item.processName,
            item.description,
            item.name
        ].map(canonicalProductionFlowKey);
        return candidates.includes(key);
    });
    return matchingFinishes.reduce((sum, item) => sum + quotedFinishDurationMinutesFrom(item), 0);
}

function orderUiState(orderRow = {}) {
    const raw = orderRow?.raw_data || {};
    const lineRaw = orderLineRawData(orderRow);
    return lineRaw?.['Estado_UI'] || raw?.['Estado_UI'] || {};
}

function orderHasNoPrint(orderRow = {}) {
    const snapshot = inferPlanningOrderSnapshot(orderRow);
    const lineRaw = orderLineRawData(orderRow);
    const uiState = orderUiState(orderRow);
    const text = String(snapshot.processType || lineRaw['Proceso Productivo'] || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return text.includes('sin impresion')
        || isTruthyProcessFlag(lineRaw['NO IMPRESION'])
        || isTruthyProcessFlag(lineRaw['SIN IMPRESION'])
        || isTruthyProcessFlag(uiState?.header?.noPrint);
}

function orderHasQuotedDesign(orderRow = {}) {
    const result = orderQuotedResult(orderRow);
    return positivePlanningAmount(result?.design?.subtotal, result?.design?.rawSubtotal);
}

function orderHasQuotedPrint(orderRow = {}) {
    if (orderHasNoPrint(orderRow)) return false;
    const snapshot = inferPlanningOrderSnapshot(orderRow);
    const result = orderQuotedResult(orderRow);
    const lineSnapshot = orderRow?.raw_data?.line_snapshot || {};
    const printItems = Array.isArray(result?.print?.items) ? result.print.items : [];
    return positivePlanningAmount(
        result?.print?.subtotal,
        result?.print?.rawSubtotal,
        lineSnapshot?.components?.print,
        lineSnapshot?.components?.runCost
    ) || printItems.some(processObjectLooksActive) || Boolean(snapshot.machineName);
}

function orderUsesInternalPlates(orderRow = {}, costsConfig = {}) {
    const uiState = orderUiState(orderRow);
    const plates = uiState?.plates && typeof uiState.plates === 'object' ? uiState.plates : {};
    const plateMode = String(plates.plateMode || '').trim().toLowerCase();
    const chargePlates = plates.chargePlates !== false;
    const processDefault = findCostProcessDefault(costsConfig, 'planchas');
    const createEnabled = processDefault ? processDefault.createEnabled === true : true;
    return chargePlates && plateMode === 'create' && createEnabled;
}

function externalFinishProcessKeysForOrder(orderRow = {}) {
    const keys = new Set();
    const uiState = orderUiState(orderRow);
    const result = orderQuotedResult(orderRow);
    const add = (value) => {
        const key = canonicalProductionFlowKey(value);
        if (ORDER_TRACKING_EXTERNAL_FINISH_KEYS.has(key)) keys.add(key);
    };
    (Array.isArray(uiState?.finishes) ? uiState.finishes : []).forEach((finish) => {
        if (finish?.active === false) return;
        if (finish?.active === true || processObjectLooksActive(finish)) {
            add(finish.processKey || finish.slotKey || finish.key || finish.label || finish.description);
        }
    });
    (Array.isArray(result?.finishes?.items) ? result.finishes.items : []).forEach((finish) => {
        if (!processObjectLooksActive(finish)) return;
        add(finish.processKey || finish.key || finish.slotKey || finish.label || finish.description);
    });
    return [...keys];
}

function sortOrderTrackingProcessKeys(keys = [], costsConfig = {}) {
    const costOrder = processOrderFromCosts(costsConfig);
    const fallbackOrder = new Map(PRODUCTION_FLOW_SEQUENCE.map((key, index) => [key, (index + 1) * 10]));
    const normalized = [...new Set(keys
        .map(canonicalProductionFlowKey)
        .filter((key) => key && PRODUCTION_FLOW_SEQUENCE.includes(key) && !ORDER_TRACKING_HIDDEN_PROCESS_KEYS.has(key)))];
    return normalized.sort((left, right) => {
        const leftOrder = costOrder.get(left) ?? fallbackOrder.get(left) ?? 999;
        const rightOrder = costOrder.get(right) ?? fallbackOrder.get(right) ?? 999;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return (fallbackOrder.get(left) ?? 999) - (fallbackOrder.get(right) ?? 999);
    });
}

function resolveOrderTrackingProcessKeys(orderRow = {}, costsConfig = {}, routeRows = []) {
    const keys = new Set(ORDER_TRACKING_MANDATORY_PROCESS_KEYS);
    if (orderHasQuotedDesign(orderRow)) keys.add('diseno');
    if (orderUsesInternalPlates(orderRow, costsConfig)) keys.add('planchas');
    if (orderHasQuotedPrint(orderRow)) keys.add('impresion');
    externalFinishProcessKeysForOrder(orderRow).forEach((key) => keys.add(key));

    if (!orderRow?.raw_data && Array.isArray(routeRows)) {
        routeRows.forEach((row) => {
            const key = canonicalProductionFlowKey(row.process_key || row.process_name);
            if (!ORDER_TRACKING_HIDDEN_PROCESS_KEYS.has(key)) keys.add(key);
        });
    }
    return sortOrderTrackingProcessKeys([...keys], costsConfig);
}

async function listLiveOrders() {
    const result = await pgQuery(`
        SELECT order_code, quote_code, line_code, product_code, machine_name, material_code, die_code,
               ordered_quantity, delivered_on, raw_data, created_at
        FROM flexo_orders
        ORDER BY created_at DESC
    `);
    return result.rows.filter((row) => !isCompletedOrderRecord(row) && isOrderVisibleInGantt(row));
}

async function loadPlanningReferenceMaps(client = null) {
    const executor = client || { query: pgQuery };
    const [processResult, profileResult] = await Promise.all([
        executor.query(`SELECT * FROM production_process_definitions WHERE is_active = TRUE ORDER BY sequence_order`),
        executor.query(`SELECT * FROM production_machine_profiles WHERE is_active = TRUE ORDER BY process_name, machine_name`)
    ]);

    const processMap = new Map(processResult.rows.map((row) => [row.process_key, row]));
    const profileMap = new Map();
    profileResult.rows.forEach((row) => {
        if (!profileMap.has(row.process_key)) profileMap.set(row.process_key, []);
        profileMap.get(row.process_key).push(row);
    });

    return { processMap, profileMap };
}

function selectMachineProfileForPlanning(processKey, snapshot, profileMap = new Map()) {
    const profiles = profileMap.get(processKey) || [];
    if (!profiles.length) return null;
    const sourceMachineKey = normalizePlanningKey(snapshot?.machineName || '');
    if (sourceMachineKey) {
        const exact = profiles.find((row) => normalizePlanningKey(row.machine_name) === sourceMachineKey);
        if (exact) return exact;
    }
    return profiles[0] || null;
}

function buildPlanningSnapshot(rawData = {}, processMap = new Map(), profileMap = new Map()) {
    const pseudoOrder = {
        machine_name: rawData?.line_snapshot?.quotedMachine || '',
        material_code: rawData?.line_snapshot?.materialCode || '',
        die_code: rawData?.line_snapshot?.dieCode || '',
        ordered_quantity: rawData?.totals?.quantity || 0,
        raw_data: rawData
    };
    const snapshot = inferPlanningOrderSnapshot(pseudoOrder);
    const processKeys = inferRouteProcessKeys(pseudoOrder);
    const baseFeet = Number(
        snapshot.raw?.line_snapshot?.materialFeet
        || snapshot.raw?.line_summary?.material_feet
        || snapshot.raw?.line_snapshot?.raw_data?.['GENERAL | SUSTRATO | CONSUMO PIES']
        || 0
    ) || 0;
    const tintCount = Number(
        snapshot.raw?.line_snapshot?.tintCount
        || snapshot.raw?.line_snapshot?.pantoneCount
        || 0
    ) || 0;

    const processes = processKeys.map((processKey, index) => {
        const process = processMap.get(processKey);
        const machineProfile = selectMachineProfileForPlanning(processKey, snapshot, profileMap);
        const speed = Number(machineProfile?.nominal_speed_fpm || 0);
        const setupBaseMinutes = Number(machineProfile?.setup_minutes || 0);
        const setupPerStationMinutes = Number(machineProfile?.setup_per_station_minutes || 0);
        const setupMinutes = setupBaseMinutes + ((processKey === 'impresion' ? tintCount : 0) * setupPerStationMinutes);
        const runMinutes = speed > 0 && baseFeet > 0 ? baseFeet / speed : 0;
        const quotedMinutes = quotedProcessDurationMinutes(pseudoOrder, processKey);
        const totalMinutes = quotedMinutes > 0 ? quotedMinutes : (setupMinutes + runMinutes);
        const durationHours = totalMinutes > 0 ? Number((totalMinutes / 60).toFixed(4)) : 0;

        return {
            processKey,
            processName: process?.process_name || processKey,
            sequenceOrder: index + 1,
            machineProfileId: machineProfile?.id || null,
            machineName: machineProfile?.machine_name || (processKey === 'impresion' ? snapshot.machineName : ''),
            tintCount,
            baseFeet,
            speedFpm: speed,
            setupMinutes: Number(setupMinutes.toFixed(4)),
            runMinutes: Number(runMinutes.toFixed(4)),
            durationHours,
            source: quotedMinutes > 0 ? 'quoted-calculation' : (machineProfile ? 'profile-estimate' : 'missing-duration')
        };
    });

    return {
        generatedAt: new Date().toISOString(),
        promisedDeliveryDate: rawData?.planning_control?.promisedDeliveryDate || rawData?.quote_snapshot?.due_on || null,
        processType: snapshot.processType || rawData?.line_summary?.process_type || '',
        sourceMachineName: snapshot.machineName || '',
        baseFeet,
        tintCount,
        processes
    };
}

async function enrichOrderRawDataWithPlanningSnapshot(rawData = {}, client = null) {
    const { processMap, profileMap } = await loadPlanningReferenceMaps(client);
    return {
        ...rawData,
        planning_snapshot: buildPlanningSnapshot(rawData, processMap, profileMap)
    };
}

async function ensurePlanningRoutesForLiveOrders() {
    const [orders, references] = await Promise.all([
        listLiveOrders(),
        loadPlanningReferenceMaps()
    ]);
    for (const order of orders) {
        await ensurePlanningRoutesForOrder(order, references);
    }
}

async function ensurePlanningRoutesForOrder(order, references = null, options = {}) {
    if (!order?.order_code) return;
    const executor = options.client || { query: pgQuery };
    const resolvedReferences = references || await loadPlanningReferenceMaps(options.client || null);
    const { processMap, profileMap } = resolvedReferences;
    const replaceExisting = options.replaceExisting === true;
    const costsConfig = options.costsConfig || await loadCostsConfig();
    const existingResult = await executor.query(
        `SELECT id::text, sequence_order, process_key, process_name, route_status
           FROM production_order_routes
          WHERE order_code = $1
          ORDER BY sequence_order`,
        [order.order_code]
    );
    if (existingResult.rows.length && replaceExisting) {
        await executor.query(`DELETE FROM production_order_routes WHERE order_code = $1`, [order.order_code]);
    }

    const snapshot = inferPlanningOrderSnapshot(order);
    const freshPlanningSnapshot = buildPlanningSnapshot(order.raw_data || {}, processMap, profileMap);
    const storedPlanningSnapshot = order.raw_data?.planning_snapshot || order.raw_data?.planningSnapshot || null;
    const plannedByKey = new Map();
    [
        ...(Array.isArray(storedPlanningSnapshot?.processes) ? storedPlanningSnapshot.processes : []),
        ...(Array.isArray(freshPlanningSnapshot?.processes) ? freshPlanningSnapshot.processes : [])
    ].forEach((process) => {
        const key = canonicalProductionFlowKey(process?.processKey || process?.processName);
        if (key && !plannedByKey.has(key)) plannedByKey.set(key, process);
    });
    const existingKeys = replaceExisting
        ? new Set()
        : new Set(existingResult.rows.map((row) => canonicalProductionFlowKey(row.process_key || row.process_name)).filter(Boolean));
    const targetKeys = resolveOrderTrackingProcessKeys(order, costsConfig, existingResult.rows);
    const plannedProcesses = targetKeys
        .filter((key) => !existingKeys.has(key))
        .map((key, index) => {
            const planned = plannedByKey.get(key) || {};
            const process = processMap.get(key);
            return {
                ...planned,
                processKey: key,
                processName: planned.processName || process?.process_name || PRODUCTION_FLOW_LABELS[key] || key,
                sequenceOrder: replaceExisting || !existingResult.rows.length
                    ? index + 1
                    : Math.max(...existingResult.rows.map((row) => Number(row.sequence_order || 0)), 0) + index + 1
            };
        });
    if (!plannedProcesses.length) return;

    let startHour = 0;
    let previousRouteId = null;

    for (const plannedProcess of plannedProcesses) {
        const processKey = plannedProcess.processKey;
        const process = processMap.get(processKey) || {
            process_key: processKey,
            process_name: plannedProcess.processName || PRODUCTION_FLOW_LABELS[processKey] || processKey
        };

        const machineProfile = plannedProcess.machineProfileId
            ? (profileMap.get(processKey) || []).find((row) => String(row.id) === String(plannedProcess.machineProfileId)) || selectMachineProfileForPlanning(processKey, snapshot, profileMap)
            : selectMachineProfileForPlanning(processKey, snapshot, profileMap);
        const durationHours = Number(plannedProcess.durationHours || 0) > 0
            ? Number(plannedProcess.durationHours)
            : 0;

        const insertResult = await executor.query(`
            INSERT INTO production_order_routes (
                order_code, quote_code, line_code, sequence_order,
                process_key, process_name, machine_profile_id,
                start_turn_hour, duration_hours, dependency_route_id,
                route_status, source_mode, route_payload
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDIENTE','auto',$11::jsonb)
            RETURNING id
        `, [
            order.order_code,
            order.quote_code,
            order.line_code,
            Number(plannedProcess.sequenceOrder || 1),
            process.process_key,
            process.process_name,
            machineProfile?.id || null,
            startHour,
            durationHours,
            previousRouteId,
            JSON.stringify({
                inferred: true,
                planningSnapshotUsed: Boolean(freshPlanningSnapshot?.processes?.length || storedPlanningSnapshot?.processes?.length),
                baseFeet: Number(plannedProcess.baseFeet || freshPlanningSnapshot?.baseFeet || storedPlanningSnapshot?.baseFeet || 0),
                tintCount: Number(plannedProcess.tintCount || freshPlanningSnapshot?.tintCount || storedPlanningSnapshot?.tintCount || 0),
                sourceMachineName: plannedProcess.machineName || snapshot.machineName,
                setupMinutes: Number(plannedProcess.setupMinutes || 0),
                runMinutes: Number(plannedProcess.runMinutes || 0),
                speedFpm: Number(plannedProcess.speedFpm || 0),
                source: plannedProcess.source || 'missing-duration'
            })
        ]);

        previousRouteId = insertResult.rows[0]?.id || null;
        startHour = Number((startHour + durationHours).toFixed(4));
    }
}

async function ensurePlanningSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS production_process_definitions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            process_key TEXT NOT NULL UNIQUE,
            process_name TEXT NOT NULL,
            sequence_order INTEGER NOT NULL DEFAULT 1,
            color_hex TEXT NOT NULL DEFAULT '#378ADD',
            icon_key TEXT,
            is_parallel BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            source_context TEXT NOT NULL DEFAULT 'erp',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pgQuery(`
        CREATE TABLE IF NOT EXISTS production_machine_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            machine_id UUID REFERENCES maquina(id) ON DELETE CASCADE,
            machine_capacity_id UUID REFERENCES maquina_capacidad(id) ON DELETE CASCADE,
            machine_name TEXT NOT NULL,
            brand TEXT,
            model TEXT,
            process_key TEXT NOT NULL,
            process_name TEXT NOT NULL,
            nominal_speed_fpm NUMERIC(12,4) NOT NULL DEFAULT 0,
            setup_minutes NUMERIC(12,4) NOT NULL DEFAULT 0,
            setup_per_station_minutes NUMERIC(12,4) NOT NULL DEFAULT 0,
            hourly_machine_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
            hourly_operator_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
            oee_target NUMERIC(8,4) NOT NULL DEFAULT 0.85,
            max_web_width_in NUMERIC(12,4),
            min_web_width_in NUMERIC(12,4),
            supports_die_cut BOOLEAN NOT NULL DEFAULT FALSE,
            supports_varnish_uv BOOLEAN NOT NULL DEFAULT FALSE,
            supports_lamination BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (machine_capacity_id)
        )
    `);

    await pgQuery(`
        CREATE TABLE IF NOT EXISTS production_order_routes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_code TEXT NOT NULL REFERENCES flexo_orders(order_code) ON DELETE CASCADE,
            quote_code TEXT,
            line_code TEXT,
            sequence_order INTEGER NOT NULL DEFAULT 1,
            process_key TEXT NOT NULL,
            process_name TEXT NOT NULL,
            machine_profile_id UUID REFERENCES production_machine_profiles(id) ON DELETE SET NULL,
            planned_start_at TIMESTAMPTZ,
            planned_end_at TIMESTAMPTZ,
            start_turn_hour NUMERIC(8,4),
            duration_hours NUMERIC(8,4),
            actual_start_at TIMESTAMPTZ,
            actual_end_at TIMESTAMPTZ,
            dependency_route_id UUID REFERENCES production_order_routes(id) ON DELETE SET NULL,
            transition_cost_min INTEGER NOT NULL DEFAULT 0,
            route_status TEXT NOT NULL DEFAULT 'PENDIENTE',
            source_mode TEXT NOT NULL DEFAULT 'auto',
            route_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (order_code, sequence_order)
        )
    `);

    await pgQuery(`
        CREATE TABLE IF NOT EXISTS production_stop_reasons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reason_group TEXT NOT NULL,
            reason_code TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pgQuery(`
        CREATE TABLE IF NOT EXISTS production_route_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            route_id UUID NOT NULL REFERENCES production_order_routes(id) ON DELETE CASCADE,
            operator_name TEXT,
            event_type TEXT NOT NULL,
            stop_reason_id UUID REFERENCES production_stop_reasons(id) ON DELETE SET NULL,
            notes TEXT,
            event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pgQuery(`
        CREATE TABLE IF NOT EXISTS production_waste_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            route_id UUID NOT NULL REFERENCES production_order_routes(id) ON DELETE CASCADE,
            feet_consumed NUMERIC(14,4) DEFAULT 0,
            setup_waste_feet NUMERIC(14,4) DEFAULT 0,
            run_waste_feet NUMERIC(14,4) DEFAULT 0,
            useful_feet NUMERIC(14,4) GENERATED ALWAYS AS (COALESCE(feet_consumed,0) - COALESCE(setup_waste_feet,0) - COALESCE(run_waste_feet,0)) STORED,
            final_speed_fpm NUMERIC(12,4),
            anilox_line TEXT,
            cylinder_pressure TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_production_order_routes_order ON production_order_routes(order_code, sequence_order)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_production_route_events_route ON production_route_events(route_id, created_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_production_waste_logs_route ON production_waste_logs(route_id, created_at DESC)`);

    await pgQuery(`
        INSERT INTO production_stop_reasons (reason_group, reason_code, description)
        VALUES
            ('GRP_01', 'GRP_01_REGISTRO', 'Falla de Registro'),
            ('GRP_01', 'GRP_01_BANDA', 'Rotura de Banda'),
            ('GRP_01', 'GRP_01_TENSION', 'Variacion de Tension'),
            ('GRP_01', 'GRP_01_UV', 'Falla Secado UV'),
            ('GRP_02', 'GRP_02_PLANCHA', 'Plancha Danada'),
            ('GRP_02', 'GRP_02_TINTA', 'Tinta Cortada / Fuera de Tono'),
            ('GRP_02', 'GRP_02_ADHESIVO', 'Adhesivo Defectuoso'),
            ('GRP_03', 'GRP_03_ANILOX', 'Limpieza de Anilox'),
            ('GRP_03', 'GRP_03_TURNO', 'Cambio de Turno'),
            ('GRP_03', 'GRP_03_CALIDAD', 'Esperando Aprobacion de Calidad')
        ON CONFLICT (reason_code) DO NOTHING
    `);

    const capacities = await pgQuery(`
        SELECT
            mc.id AS machine_capacity_id,
            mc.maquina_id,
            mc.proceso,
            mc.subproceso,
            mc.tiempo_preparacion_general,
            mc.tiempo_por_estacion,
            mc.velocidad_produccion,
            mc.costo_hora_maquina,
            mc.costo_hora_operario,
            mc.activa AS capacity_active,
            m.nombre,
            m.tipo,
            m.activa AS machine_active
        FROM maquina_capacidad mc
        JOIN maquina m ON m.id = mc.maquina_id
        WHERE COALESCE(mc.activa, TRUE) = TRUE
    `);

    const processRegistry = new Map();
    capacities.rows.forEach((row) => {
        const processName = pickFirstValue(row.proceso, row.subproceso, 'Produccion');
        const processKey = normalizePlanningKey(processName);
        if (!processKey) return;
        if (!processRegistry.has(processKey)) {
            processRegistry.set(processKey, {
                processKey,
                processName,
                sequenceOrder: processRegistry.size + 1,
                colorHex: '#378ADD',
                iconKey: null,
                isParallel: false
            });
        }
    });

    const seededProcesses = [
        { processKey: 'diseno', processName: 'Diseño', sequenceOrder: 1, colorHex: '#8B5CF6', iconKey: '[D]', isParallel: false },
        { processKey: 'preprensa', processName: 'Preprensa', sequenceOrder: 2, colorHex: '#6366F1', iconKey: '[PP]', isParallel: false },
        { processKey: 'visto_bueno', processName: 'Visto Bueno', sequenceOrder: 3, colorHex: '#22C55E', iconKey: '[VB]', isParallel: false },
        { processKey: 'planchas', processName: 'Planchas', sequenceOrder: 4, colorHex: '#64748B', iconKey: '[PL]', isParallel: false },
        { processKey: 'tintas', processName: 'Tintas', sequenceOrder: 5, colorHex: '#0EA5E9', iconKey: '[TIN]', isParallel: false },
        { processKey: 'impresion', processName: 'Impresión', sequenceOrder: 6, colorHex: '#1D9E75', iconKey: '[IMP]', isParallel: false },
        { processKey: 'acabados', processName: 'Acabados', sequenceOrder: 7, colorHex: '#F59E0B', iconKey: '[AC]', isParallel: false },
        { processKey: 'laminado', processName: 'Laminado', sequenceOrder: 8, colorHex: '#0EA5E9', iconKey: '[L]', isParallel: false },
        { processKey: 'troquelado', processName: 'Troquelado', sequenceOrder: 9, colorHex: '#06B6D4', iconKey: '[T]', isParallel: false },
        { processKey: 'estampado', processName: 'Estampado', sequenceOrder: 10, colorHex: '#F59E0B', iconKey: '[E]', isParallel: false },
        { processKey: 'barnizado', processName: 'Barniz', sequenceOrder: 11, colorHex: '#BA7517', iconKey: '[B]', isParallel: true },
        { processKey: 'embosado', processName: 'Embosado', sequenceOrder: 12, colorHex: '#A855F7', iconKey: '[EMB]', isParallel: false },
        { processKey: 'numeracion', processName: 'Numeración', sequenceOrder: 13, colorHex: '#D97706', iconKey: '[NUM]', isParallel: false },
        { processKey: 'rebobinado', processName: 'Rebobinado', sequenceOrder: 14, colorHex: '#F97316', iconKey: '[R]', isParallel: false },
        { processKey: 'empaque', processName: 'Empaque', sequenceOrder: 15, colorHex: '#10B981', iconKey: '[EMP]', isParallel: false }
    ];
    seededProcesses.forEach((row) => {
        if (!processRegistry.has(row.processKey)) {
            processRegistry.set(row.processKey, row);
        }
    });

    for (const process of processRegistry.values()) {
        await pgQuery(`
            INSERT INTO production_process_definitions (
                process_key, process_name, sequence_order, color_hex, icon_key, is_parallel, source_context
            ) VALUES ($1,$2,$3,$4,$5,$6,'erp')
            ON CONFLICT (process_key) DO UPDATE SET
                process_name = EXCLUDED.process_name,
                sequence_order = EXCLUDED.sequence_order,
                color_hex = COALESCE(production_process_definitions.color_hex, EXCLUDED.color_hex),
                icon_key = COALESCE(production_process_definitions.icon_key, EXCLUDED.icon_key),
                updated_at = NOW()
        `, [
            process.processKey,
            process.processName,
            process.sequenceOrder,
            process.colorHex,
            process.iconKey,
            Boolean(process.isParallel)
        ]);
    }

    for (const row of capacities.rows) {
        const processName = pickFirstValue(row.proceso, row.subproceso, 'Produccion');
        const processKey = normalizePlanningKey(processName);
        if (!processKey) continue;
        await pgQuery(`
            INSERT INTO production_machine_profiles (
                machine_id, machine_capacity_id, machine_name, process_key, process_name,
                nominal_speed_fpm, setup_minutes, setup_per_station_minutes,
                hourly_machine_cost, hourly_operator_cost, is_active, source_payload
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
            ON CONFLICT (machine_capacity_id) DO UPDATE SET
                machine_name = EXCLUDED.machine_name,
                process_key = EXCLUDED.process_key,
                process_name = EXCLUDED.process_name,
                nominal_speed_fpm = EXCLUDED.nominal_speed_fpm,
                setup_minutes = EXCLUDED.setup_minutes,
                setup_per_station_minutes = EXCLUDED.setup_per_station_minutes,
                hourly_machine_cost = EXCLUDED.hourly_machine_cost,
                hourly_operator_cost = EXCLUDED.hourly_operator_cost,
                is_active = EXCLUDED.is_active,
                source_payload = EXCLUDED.source_payload,
                updated_at = NOW()
        `, [
            row.maquina_id,
            row.machine_capacity_id,
            row.nombre,
            processKey,
            processName,
            Number(row.velocidad_produccion || 0),
            Number(row.tiempo_preparacion_general || 0),
            Number(row.tiempo_por_estacion || 0),
            Number(row.costo_hora_maquina || 0),
            Number(row.costo_hora_operario || 0),
            Boolean(row.capacity_active && row.machine_active),
            JSON.stringify({
                tipo: row.tipo,
                subproceso: row.subproceso
            })
        ]);
    }
}

async function ensureProductionMaterialConsumptionSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS production_material_consumption_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_code TEXT NOT NULL REFERENCES flexo_orders(order_code) ON DELETE CASCADE,
            quote_code TEXT,
            line_code TEXT,
            route_id UUID REFERENCES production_order_routes(id) ON DELETE SET NULL,
            process_key TEXT NOT NULL DEFAULT '',
            sap_item_code TEXT NOT NULL DEFAULT '',
            material_name TEXT NOT NULL DEFAULT '',
            material_family TEXT NOT NULL DEFAULT '',
            quantity NUMERIC(14,4) NOT NULL DEFAULT 0,
            unit_code TEXT NOT NULL DEFAULT '',
            reason TEXT NOT NULL DEFAULT '',
            sap_status TEXT NOT NULL DEFAULT 'PENDIENTE',
            sap_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            sap_response JSONB NOT NULL DEFAULT '{}'::jsonb,
            requested_by TEXT NOT NULL DEFAULT '',
            requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            sent_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_pmcr_order_process ON production_material_consumption_requests(order_code, process_key, requested_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS idx_pmcr_sap_status ON production_material_consumption_requests(sap_status, requested_at DESC)`);
}

async function getQuoteHeaderRow(quoteCode) {
    const result = await pgQuery(`SELECT * FROM quotes WHERE quote_code = $1`, [quoteCode]);
    return result.rows[0] || null;
}

async function getLatestCalculationRow(quoteCode, lineCode) {
    const result = await pgQuery(
        `SELECT fc.calculation_code, fc.quote_code, fc.line_code, fc.product_code, fc.customer_code, fc.process_type, fc.machine_name, fc.die_code, fc.material_code,
                fc.quantity, fc.subtotal_cost, fc.total_cost, fc.unit_price, fc.raw_data
           FROM flexo_calculations fc
           LEFT JOIN quotes q ON q.quote_code = fc.quote_code
          WHERE fc.quote_code = $1
            AND fc.line_code = $2
            AND ${quoteOwnedCalculationPredicate('fc', 'q')}
          ORDER BY fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
          LIMIT 1`,
        [quoteCode, lineCode]
    );
    return result.rows[0] || null;
}

function getConfiguredCurrentUser() {
    try {
        const config = loadGeneralConfigFromFile();
        return pickFirstValue(config?.session?.currentUser, config?.general?.currentUser, '');
    } catch (error) {
        return '';
    }
}

async function getQuoteLineContext(quoteCode, lineCode, client = null) {
    const executor = client || { query: pgQuery };
    const [quoteResult, calcResult] = await Promise.all([
        executor.query(`SELECT * FROM quotes WHERE quote_code = $1 LIMIT 1`, [quoteCode]),
        executor.query(
            `SELECT fc.calculation_code, fc.quote_code, fc.line_code, fc.product_code, fc.customer_code, fc.process_type, fc.machine_name, fc.die_code, fc.material_code,
                    fc.quantity, fc.subtotal_cost, fc.total_cost, fc.unit_price, fc.raw_data
               FROM flexo_calculations fc
               LEFT JOIN quotes q ON q.quote_code = fc.quote_code
              WHERE fc.quote_code = $1
                AND fc.line_code = $2
                AND ${quoteOwnedCalculationPredicate('fc', 'q')}
              ORDER BY fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
              LIMIT 1`,
            [quoteCode, lineCode]
        )
    ]);
    return {
        quote: quoteResult.rows[0] || null,
        line: calcResult.rows[0] || null
    };
}

function summarizeLineForDestination(row) {
    const raw = row?.raw_data || {};
    return {
        customer_code: pickFirstValue(row?.customer_code, raw['ID CLIENTE']),
        customer_name: pickFirstValue(raw.CLIENTE, raw['CLIENTE NOMBRE']),
        job_name: pickFirstValue(raw['NOMBRE TRABAJO'], raw['Nombre Trabajo']),
        created_on: pickFirstValue(raw['FECHA CREACION'], raw['FECHA CREACION DATE']),
        status: pickFirstValue(raw['SOLICITUD ESTADO'], raw['ESTADO LINEA'], 'Borrador')
    };
}

function getProductNameFromRaw(raw = {}, fallback = '') {
    return pickFirstValue(
        raw['NOMBRE TRABAJO'],
        raw['Nombre Trabajo'],
        raw['REQ | Nombre Producto'],
        raw['TIPO TRABAJO | ORDEN REFERENCIA 1'],
        fallback
    );
}

function mapProductCatalogRow(row = {}) {
    const raw = row.raw_data || {};
    return {
        id: row.id,
        product_code: row.product_code || '',
        line_code: row.line_code || '',
        quote_code: row.quote_code || '',
        client_code: pickFirstValue(row.client_code, raw['ID CLIENTE']),
        client_name: pickFirstValue(row.client_name, raw.CLIENTE, raw['CLIENTE NOMBRE']),
        product_name: pickFirstValue(row.product_name, getProductNameFromRaw(raw, row.product_code)),
        product_type: pickFirstValue(row.product_type, raw['REQ | Tipo de Producto']),
        department: pickFirstValue(row.department, raw.DEPARTAMENTO, 'Flexografia'),
        material_name: pickFirstValue(row.material_name, raw['GENERAL | MATERIAL']),
        quoted_machine: pickFirstValue(row.quoted_machine, raw['CONV | MAQUINA'], raw['DIGITAL | MAQUINA']),
        die_code: pickFirstValue(row.die_code, raw['GENERAL | TROQUEL | ID']),
        quantity_products: parseLegacyNumber(row.quantity_products) ?? parseLegacyNumber(raw['Cantidad Productos']),
        quantity_types: parseLegacyNumber(row.quantity_types) ?? parseLegacyNumber(raw['CANTIDAD TIPOS']),
        tint_count: parseLegacyNumber(row.tint_count) ?? parseLegacyNumber(raw['CANTIDAD TINTAS']),
        width_inches: parseLegacyNumber(row.width_inches) ?? parseLegacyNumber(raw['DIMENSIONES ETIQUETA | ANCHO']),
        length_inches: parseLegacyNumber(row.length_inches) ?? parseLegacyNumber(raw['DIMENSIONES ETIQUETA | LARGO']),
        price_unit: parseLegacyNumber(row.price_unit) ?? parseLegacyNumber(raw['GENERAL | 9 | UNITARIO | DOL']),
        total_price: parseLegacyNumber(row.total_price) ?? parseLegacyNumber(raw['PRECIO TOTAL AL FINALIZAR']),
        quote_count: Number(row.quote_count || 0),
        last_quoted_at: row.last_quoted_at || null,
        created_at: row.created_at || null,
        raw_data: raw
    };
}

function buildProductPayloadFromLine({ productCode, quoteRow, lineRow }) {
    const raw = { ...(lineRow.raw_data || {}) };
    const processType = pickFirstValue(lineRow.process_type, raw['Proceso Productivo'], 'Convencional');
    const activePrefix = String(processType).toLowerCase().includes('digit') ? 'DIGITAL' : 'CONV';
    const productName = getProductNameFromRaw(raw, lineRow.product_code || lineRow.line_code || productCode);
    const metadata = buildTraceabilityMetadata({
        action: 'create-product-from-line',
        sourceQuoteCode: lineRow.quote_code,
        sourceLineCode: lineRow.line_code,
        actor: getConfiguredCurrentUser()
    });
    raw['CODIGO PRODUCTO'] = productCode;
    raw['TRAZABILIDAD | ACCION'] = metadata.action;
    raw['TRAZABILIDAD | USUARIO'] = metadata.created_by;
    raw['TRAZABILIDAD | FECHA'] = metadata.created_at;
    raw['TRAZABILIDAD | COTIZACION ORIGEN'] = metadata.source_quote_code;
    raw['TRAZABILIDAD | LINEA ORIGEN'] = metadata.source_line_code;
    raw.traceability = metadata;

    return {
        productCode,
        lineCode: lineRow.line_code,
        quoteCode: lineRow.quote_code,
        clientCode: pickFirstValue(quoteRow?.customer_code, lineRow.customer_code, raw['ID CLIENTE']),
        clientName: pickFirstValue(quoteRow?.customer_name, raw.CLIENTE, raw['CLIENTE NOMBRE']),
        productName,
        productType: pickFirstValue(raw['REQ | Tipo de Producto']),
        department: pickFirstValue(raw.DEPARTAMENTO, 'Flexografia'),
        materialName: pickFirstValue(raw['GENERAL | MATERIAL'], lineRow.material_code),
        quotedMachine: pickFirstValue(lineRow.machine_name, raw[`${activePrefix} | MAQUINA`], raw['CONV | MAQUINA'], raw['DIGITAL | MAQUINA']),
        dieCode: pickFirstValue(lineRow.die_code, raw['GENERAL | TROQUEL | ID']),
        quantityProducts: parseLegacyNumber(lineRow.quantity) ?? parseLegacyNumber(raw['Cantidad Productos']),
        quantityTypes: parseLegacyNumber(raw['CANTIDAD TIPOS']),
        tintCount: parseLegacyNumber(raw['CANTIDAD TINTAS']),
        widthInches: parseLegacyNumber(raw['DIMENSIONES ETIQUETA | ANCHO']),
        lengthInches: parseLegacyNumber(raw['DIMENSIONES ETIQUETA | LARGO']),
        priceUnit: parseLegacyNumber(lineRow.unit_price) ?? parseLegacyNumber(raw['GENERAL | 9 | UNITARIO | DOL']),
        totalPrice: parseLegacyNumber(lineRow.total_cost) ?? parseLegacyNumber(raw['PRECIO TOTAL AL FINALIZAR']),
        sourceCalculationCode: lineRow.calculation_code,
        rawData: raw,
        metadata
    };
}

function extractLineAttachments(row) {
    const raw = row?.raw_data || {};
    const attachments = [];
    Object.entries(raw).forEach(([key, value]) => {
        if (typeof value !== 'string') return;
        const text = value.trim();
        if (!text) return;
        const keyNorm = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const looksLikeAttachment = (/(adjunt|arte|manual|archivo|pdf|imagen|img|link|url|document)/.test(keyNorm)
            || /(\.pdf|\.ai|\.psd|\.cdr|\.png|\.jpg|\.jpeg|\.svg|\.zip|\.doc|\.docx|\.xls|\.xlsx)$/i.test(text)
            || /^https?:\/\//i.test(text))
            && !/en poder/.test(keyNorm);
        if (!looksLikeAttachment) return;
        attachments.push({
            key,
            label: key,
            value: text,
            isUrl: /^https?:\/\//i.test(text)
        });
    });
    return attachments;
}

function buildStableSapDocEntry(prefix, quoteCode, lineCode) {
    const source = `${prefix}|${quoteCode || ''}|${lineCode || ''}`;
    let hash = 0;
    for (let index = 0; index < source.length; index += 1) {
        hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
    }
    return Math.abs(hash % 800000000) + 100000;
}

function normalizeSapDate(value, fallback = new Date().toISOString().slice(0, 10)) {
    const text = String(value || '').trim();
    if (!text) return fallback;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }
    return fallback;
}

function getLocalSapDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadSapSalesOrderAccountingContext(executor, { quoteRow, lineRow }) {
    const salespersonName = pickFirstValue(
        quoteRow?.salesperson_name,
        lineRow?.salesperson_name,
        lineRow?.raw_data?.VENDEDOR,
        lineRow?.raw_data?.['VENDEDOR | USUARIO']
    );
    if (!salespersonName) {
        return {
            salespersonName: '',
            salesPersonCode: null,
            profitCenterCode: ''
        };
    }
    const result = await executor(
        `SELECT salesperson_name, sales_person_code, profit_center_code
           FROM sap_salesperson_profit_centers
          WHERE is_active = TRUE
            AND LOWER(TRIM(salesperson_name)) = LOWER(TRIM($1))
          ORDER BY updated_at DESC
          LIMIT 1`,
        [salespersonName]
    );
    const row = result.rows[0] || {};
    return {
        salespersonName,
        salesPersonCode: Number.isFinite(Number(row.sales_person_code)) ? Number(row.sales_person_code) : null,
        profitCenterCode: String(row.profit_center_code || '').trim()
    };
}

function isNonBlockingSapAccountingWarning(message = '') {
    const text = sanitizeAdminUserText(message);
    return /No existe configuración de centro de beneficio para el ejecutivo de ventas indicado/i.test(text)
        || /El ejecutivo de ventas indicado no tiene centro de beneficio configurado/i.test(text);
}

function stripNonBlockingSapAccountingWarnings(message = '') {
    const text = sanitizeAdminUserText(message);
    if (!text) return '';
    const parts = text.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
    const filtered = parts.filter((part) => !isNonBlockingSapAccountingWarning(part));
    return filtered.join(' ').trim();
}

async function tryStageSapExportsForQuoteLine(options = {}) {
    try {
        return await stageSapExportsForQuoteLine(options);
    } catch (error) {
        return {
            ok: false,
            error: error.message || 'No fue posible preparar la salida SAP.',
            nonBlocking: true
        };
    }
}

function pushSapComponent(components = [], component = {}) {
    const itemCode = pickFirstValue(component.ItemCode);
    const quantity = parseLegacyNumber(component.Quantity);
    if (!itemCode || !quantity || quantity <= 0) return;
    const warehouse = pickFirstValue(component.WarehouseCode, '01');
    const source = pickFirstValue(component.Source, 'Componente');
    const existing = components.find((item) => item.ItemCode === itemCode && item.WarehouseCode === warehouse && item.Source === source);
    if (existing) {
        existing.Quantity = roundCurrency(Number(existing.Quantity || 0) + quantity);
        return;
    }
    components.push({
        LineNum: components.length,
        ItemCode: itemCode,
        ItemName: pickFirstValue(component.ItemName, itemCode),
        Quantity: roundCurrency(quantity),
        WarehouseCode: warehouse,
        Source: source,
        ...(component.UnitHint ? { UnitHint: component.UnitHint } : {}),
        ...(component.SourceLineCode ? { SourceLineCode: component.SourceLineCode } : {})
    });
}

function appendSapComponentsFromLine(components = [], lineRow = {}, warehouse = '01') {
    const raw = lineRow?.raw_data || {};
    const result = raw['Datos_Cotizados'] || {};
    const uiState = raw['Estado_UI'] || {};
    const sourceLineCode = lineRow?.line_code || raw['ID LINEA'] || '';
    const materialCode = pickFirstValue(
        lineRow?.material_code,
        raw['Material Convencional | Id Material'],
        raw['Material Digital | Id Material'],
        raw['GENERAL | MATERIAL']
    );
    const substrateQty = pickFirstMeaningfulNumber(
        result?.sustrato?.totalLengthFeet,
        result?.sustrato?.linealFeet,
        raw['SUSTRATO | PIES LINEALES CON MERMA'],
        raw['GENERAL | SUSTRATO | CONSUMO PIES'],
        raw['Material | Pies Segun Proceso Productivo'],
        raw['CONV | MATERIAL | CANTIDAD PIES LINEALES INCLUYE MACULA'],
        raw['DIGITAL | MATERIAL | CANTIDAD PIES LINEALES INCLUYE MACULA']
    );
    if (materialCode) {
        pushSapComponent(components, {
            ItemCode: materialCode,
            ItemName: pickFirstValue(raw['GENERAL | MATERIAL'], materialCode),
            Quantity: substrateQty || parseLegacyNumber(lineRow?.quantity) || 0,
            WarehouseCode: warehouse,
            Source: 'Sustrato',
            UnitHint: 'ft',
            SourceLineCode: sourceLineCode
        });
    }

    const printItems = Array.isArray(result?.print?.items) ? result.print.items : [];
    const printStages = Array.isArray(uiState?.printStages) ? uiState.printStages : [];
    printItems.forEach((printItem, index) => {
        const stage = printStages[index] || uiState?.print || {};
        const cmykQty = pickFirstMeaningfulNumber(
            printItem?.inkConsumption,
            Math.max(0, Number(printItem?.digitalInkKg || 0) - Number(printItem?.digitalWhiteKg || 0) - Number(printItem?.digitalSpecialInkKg || 0))
        );
        if (stage?.inkMaterialId && cmykQty) {
            pushSapComponent(components, {
                ItemCode: stage.inkMaterialId,
                ItemName: pickFirstValue(stage.inkMaterialName, stage.inkMaterialId),
                Quantity: cmykQty,
                WarehouseCode: warehouse,
                Source: 'Tintas',
                UnitHint: printItem?.digitalInkKg ? 'kg' : 'lb',
                SourceLineCode: sourceLineCode
            });
        }
        const whiteQty = pickFirstMeaningfulNumber(printItem?.digitalWhiteKg, printItem?.inkConsumptionPerColorLb);
        if (stage?.whiteInkMaterialId && whiteQty) {
            pushSapComponent(components, {
                ItemCode: stage.whiteInkMaterialId,
                ItemName: pickFirstValue(stage.whiteInkMaterialName, stage.whiteInkMaterialId),
                Quantity: whiteQty,
                WarehouseCode: warehouse,
                Source: 'Tinta Blanca',
                UnitHint: printItem?.digitalWhiteKg ? 'kg' : 'lb',
                SourceLineCode: sourceLineCode
            });
        }
        (Array.isArray(printItem?.inlineItems) ? printItem.inlineItems : []).forEach((inlineItem) => {
            if (!inlineItem?.active || !inlineItem?.materialId) return;
            pushSapComponent(components, {
                ItemCode: inlineItem.materialId,
                ItemName: pickFirstValue(inlineItem.materialName, inlineItem.label, inlineItem.materialId),
                Quantity: pickFirstMeaningfulNumber(inlineItem.materialConsumptionLb, inlineItem.materialBase, 0),
                WarehouseCode: warehouse,
                Source: pickFirstValue(inlineItem.label, 'Acabado Inline'),
                UnitHint: inlineItem.key === 'barniz' ? 'lb' : '',
                SourceLineCode: sourceLineCode
            });
        });
    });

    const plateMaterialId = pickFirstValue(uiState?.plates?.virgin?.materialId, uiState?.plates?.laser?.materialId);
    const plateQty = pickFirstMeaningfulNumber(
        result?.plates?.breakdown?.virgin?.laserMetrics?.totalArea,
        result?.plates?.breakdown?.laser?.laserMetrics?.totalArea,
        uiState?.plates?.virgin?.area,
        uiState?.plates?.laser?.area
    );
    if (plateMaterialId && plateQty) {
        pushSapComponent(components, {
            ItemCode: plateMaterialId,
            ItemName: plateMaterialId,
            Quantity: plateQty,
            WarehouseCode: warehouse,
            Source: 'Planchas',
            UnitHint: 'in2',
            SourceLineCode: sourceLineCode
        });
    }

    (Array.isArray(result?.finishes?.items) ? result.finishes.items : []).forEach((finish) => {
        if (!finish?.active || !finish?.materialId) return;
        pushSapComponent(components, {
            ItemCode: finish.materialId,
            ItemName: pickFirstValue(finish.materialName, finish.processLabel, finish.materialId),
            Quantity: pickFirstMeaningfulNumber(finish.materialConsumptionKg, finish.materialBase, 0),
            WarehouseCode: warehouse,
            Source: pickFirstValue(finish.processLabel, finish.processKey, 'Acabado'),
            UnitHint: finish.materialConsumptionKg ? 'kg' : '',
            SourceLineCode: sourceLineCode
        });
    });

    if (!printItems.length) {
        const tintCount = parseLegacyNumber(raw['CANTIDAD TINTAS']);
        if (tintCount && tintCount > 0) {
            pushSapComponent(components, {
                ItemCode: pickFirstValue(raw['TINTA | CODIGO'], raw['CONV | TINTA | CODIGO'], 'TINTAS'),
                ItemName: 'Tintas',
                Quantity: tintCount,
                WarehouseCode: warehouse,
                Source: 'Tintas',
                SourceLineCode: sourceLineCode
            });
        }
    }
}

function buildSapExportPayloadsFromQuoteLine({ quoteRow, lineRow, accountingContext = {}, groupMembers = [], groupLine = null }) {
    const raw = lineRow?.raw_data || {};
    const quoteCode = lineRow?.quote_code || quoteRow?.quote_code || '';
    const lineCode = lineRow?.line_code || '';
    const frontBackGroup = getFrontBackGroupFromLine(lineRow);
    const members = frontBackGroup && Array.isArray(groupMembers) && groupMembers.length ? groupMembers : [lineRow].filter(Boolean);
    const commercialLine = frontBackGroup
        ? (groupLine || (normalizeFrontBackLineCode(lineRow?.line_code) === frontBackGroup.groupLineCode ? lineRow : null) || members.find((row) => normalizeFrontBackLineCode(row.line_code) === frontBackGroup.groupLineCode) || lineRow)
        : lineRow;
    const primaryRaw = commercialLine?.raw_data || raw;
    const sapLineCode = frontBackGroup ? frontBackGroup.groupLineCode : lineCode;
    const quantity = parseLegacyNumber(commercialLine?.quantity) ?? parseLegacyNumber(primaryRaw['Cantidad Productos']) ?? 1;
    const memberTotal = members.reduce((sum, row) => sum + (parseLegacyNumber(row?.total_cost) ?? parseLegacyNumber(row?.raw_data?.['PRECIO TOTAL AL FINALIZAR']) ?? 0), 0);
    const commercialTotal = parseLegacyNumber(commercialLine?.total_cost) ?? parseLegacyNumber(primaryRaw['PRECIO TOTAL AL FINALIZAR']) ?? 0;
    const total = frontBackGroup
        ? (frontBackGroup.dedicatedGroupLine && commercialTotal > 0 ? commercialTotal : memberTotal)
        : (parseLegacyNumber(lineRow?.total_cost) ?? parseLegacyNumber(raw['PRECIO TOTAL AL FINALIZAR']) ?? 0);
    const unitPrice = quantity ? total / quantity : total;
    const itemCode = pickFirstValue(commercialLine?.product_code, primaryRaw['CODIGO PRODUCTO'], commercialLine?.line_code, `PROD-${quoteCode}-${lineCode}`);
    const itemName = frontBackGroup
        ? pickFirstValue(getProductNameFromRaw(primaryRaw, itemCode), `${frontBackGroup.label}: ${members.map((row) => getProductNameFromRaw(row.raw_data || {}, row.product_code || row.line_code || '')).filter(Boolean).join(' + ')}`)
        : getProductNameFromRaw(raw, itemCode);
    const cardCode = pickFirstValue(quoteRow?.customer_code, commercialLine?.customer_code, lineRow?.customer_code, raw['ID CLIENTE']);
    const cardName = pickFirstValue(quoteRow?.customer_name, raw.CLIENTE, raw['CLIENTE NOMBRE']);
    const docDate = getLocalSapDate();
    const dueDate = normalizeSapDate(pickFirstValue(quoteRow?.due_on, raw['FECHA VENCIMIENTO']), docDate);
    const warehouse = pickFirstValue(primaryRaw.BODEGA, primaryRaw.WhsCode, raw.BODEGA, raw.WhsCode, '01');
    const components = [];
    members.forEach((member) => appendSapComponentsFromLine(components, member, warehouse));
    components.forEach((component, index) => {
        component.LineNum = index;
    });
    const productionRun = frontBackGroup ? buildFrontBackProductionRun(lineRow, members) : null;

    return {
        order: {
            DocEntry: buildStableSapDocEntry('ORDR', quoteCode, sapLineCode),
            DocNum: `${quoteCode}-${sapLineCode}`,
            CardCode: cardCode,
            CardName: cardName,
            DocDate: docDate,
            DocDueDate: dueDate,
            Currency: pickFirstValue(raw.MONEDA, raw.Currency, 'CRC'),
            DocStatus: 'Pendiente',
            Comments: frontBackGroup
                ? `Preparado desde cotización ${quoteCode}, corrida ${frontBackGroup.groupId}`
                : `Preparado desde cotización ${quoteCode}, línea ${lineCode}`,
            SalesPersonCode: Number.isFinite(Number(accountingContext.salesPersonCode)) ? Number(accountingContext.salesPersonCode) : undefined,
            DocumentLines: [{
                LineNum: 0,
                ItemCode: itemCode,
                ItemDescription: itemName,
                Quantity: quantity,
                Price: roundCurrency(unitPrice),
                LineTotal: total || (quantity * unitPrice),
                WarehouseCode: warehouse,
                CostingCode: accountingContext.profitCenterCode || undefined
            }],
            source: {
                quoteCode,
                lineCode: sapLineCode,
                calculationCode: commercialLine?.calculation_code || lineRow?.calculation_code || '',
                stagedFrom: 'quote-finalization',
                salespersonName: accountingContext.salespersonName || '',
                salesPersonCode: Number.isFinite(Number(accountingContext.salesPersonCode)) ? Number(accountingContext.salesPersonCode) : null,
                profitCenterCode: accountingContext.profitCenterCode || '',
                productionRun
            }
        },
        bom: {
            DocEntry: buildStableSapDocEntry('OWOR', quoteCode, sapLineCode),
            DocNum: `${quoteCode}-${sapLineCode}-BOM`,
            ItemCode: itemCode,
            ProdName: itemName,
            PlannedQty: quantity,
            PostDate: docDate,
            DueDate: dueDate,
            Status: 'P',
            OriginNum: quoteCode,
            Comments: frontBackGroup
                ? `BOM preparado desde cotización ${quoteCode}, corrida ${frontBackGroup.groupId}`
                : `BOM preparado desde cotización ${quoteCode}, línea ${lineCode}`,
            components,
            ProductionOutputs: productionRun?.outputs || undefined,
            source: {
                quoteCode,
                lineCode,
                calculationCode: lineRow?.calculation_code || '',
                stagedFrom: 'quote-finalization',
                productionRun
            }
        }
    };
}

async function stageSapExportsForQuoteLine({ quoteRow, lineRow, client }) {
    const executor = client ? (sql, params) => client.query(sql, params) : pgQuery;
    const groupContext = await loadFrontBackGroupContext(lineRow?.quote_code || quoteRow?.quote_code, lineRow, client);
    const accountingContext = await loadSapSalesOrderAccountingContext(executor, { quoteRow, lineRow: groupContext.groupLine || lineRow });
    const payloads = buildSapExportPayloadsFromQuoteLine({
        quoteRow,
        lineRow: groupContext.groupLine || lineRow,
        accountingContext,
        groupMembers: groupContext.members,
        groupLine: groupContext.groupLine
    });
    const order = await stageSapMirrorOrder(executor, payloads.order);
    const bom = await stageSapMirrorBom(executor, payloads.bom);
    return { order, bom };
}

async function getStoredAttachments(quoteCode, lineCode) {
    const result = await pgQuery(
        `SELECT id, quote_code, line_code, file_name, mime_type, file_ext, notes, uploaded_by, created_at,
                COALESCE(size_bytes, OCTET_LENGTH(DECODE(content_base64, 'base64')), 0) AS size_bytes
           FROM quote_line_attachments
          WHERE quote_code = $1 AND line_code = $2
          ORDER BY created_at DESC`,
        [quoteCode, lineCode]
    );
    return result.rows;
}

function buildTraceabilityMetadata({ action, sourceQuoteCode, sourceLineCode, actor, timestamp }) {
    const createdAt = timestamp || new Date().toISOString();
    const createdBy = actor || getConfiguredCurrentUser();
    return {
        action: action || 'copied',
        source_quote_code: sourceQuoteCode || '',
        source_line_code: sourceLineCode || '',
        created_by: createdBy,
        created_at: createdAt
    };
}

function buildDuplicatedLineRawData(sourceRawData = {}) {
    const raw = { ...(sourceRawData || {}) };
    [
        'FIN COTIZACION | FECHA',
        'FIN COTIZACION | USUARIO',
        'FIN COTIZACION | ESTADO',
        'RESPUESTA COTIZADOR | FECHA',
        'RESPUESTA COTIZADOR | USUARIO',
        'Finalizado_Para_Orden'
    ].forEach((key) => delete raw[key]);
    delete raw.grupoFrenteDorso;
    delete raw.grupo_frente_dorso;
    delete raw.Grupo_Frente_Dorso;
    raw['SOLICITUD ESTADO'] = 'Borrador';
    raw['ESTADO LINEA'] = 'Borrador';
    return raw;
}

function resetDuplicatedLineUiState(rawData = {}, { targetQuote = {}, lineCode = '' } = {}) {
    const uiState = rawData.Estado_UI;
    if (!uiState || typeof uiState !== 'object' || Array.isArray(uiState)) return;
    const header = uiState.header && typeof uiState.header === 'object' && !Array.isArray(uiState.header)
        ? uiState.header
        : {};
    rawData.Estado_UI = {
        ...uiState,
        header: {
            ...header,
            quoteCode: targetQuote.quote_code || header.quoteCode || '',
            lineCode: lineCode || header.lineCode || '',
            customerCode: targetQuote.customer_code || header.customerCode || '',
            customerName: targetQuote.customer_name || header.customerName || '',
            salespersonName: targetQuote.salesperson_name || header.salespersonName || '',
            lineStatus: 'Borrador',
            finalizedForOrder: false
        }
    };
    delete rawData.Estado_UI.quoteTracking;
    delete rawData.Estado_UI.tracking;
    delete rawData.Estado_UI.timeline;
    delete rawData.Estado_UI.milestones;
}

/**
 * Normalize legacy CODEX_* keys to new descriptive Spanish keys for backward compatibility
 * with existing data in the database. Converts in-place on the given object.
 */
function normalizeCalculationKeys(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const MAP = {
        'CODEX_UI_STATE': 'Estado_UI',
        'CODEX_PROCESS_SNAPSHOT': 'Secuencia_Procesos',
        'CODEX_PROCESS_SEQUENCE_TEXT': 'Texto_Secuencia_Procesos',
        'CODEX_FINALIZED_FOR_ORDER': 'Finalizado_Para_Orden',
        'CODEX_FD_GROUP': 'Grupo_Frente_Dorso',
        'CODEX_AUTO_SELECTION': 'Seleccion_Automatica',
        'CODEX_AUTO_PRICING': 'Precio_Automatico',
        'CODEX_PLANNING_SNAPSHOT': 'Instantanea_Planificacion',
        'CODEX_VALIDATION_MESSAGES': 'Mensajes_Validacion',
        'CODEX_VALIDATION_BLOCKED': 'Validacion_Bloqueada',
        'CODEX_QUOTE_CLOSURE': 'Cierre_Cotizacion',
        'CODEX_REQUEST_KEY': 'Clave_Solicitud',
        'CODEX_LINE_ORDER': 'Orden_Linea'
    };
    // Only add new key if old key exists AND new key doesn't already exist
    for (const [oldKey, newKey] of Object.entries(MAP)) {
        if (Object.prototype.hasOwnProperty.call(obj, oldKey) && !Object.prototype.hasOwnProperty.call(obj, newKey)) {
            obj[newKey] = obj[oldKey];
        }
    }
    // Normalize nested line_snapshot.raw_data if present
    if (obj.line_snapshot && typeof obj.line_snapshot === 'object' && obj.line_snapshot.raw_data && typeof obj.line_snapshot.raw_data === 'object') {
        normalizeCalculationKeys(obj.line_snapshot.raw_data);
    }
    return obj;
}

async function cloneCalculationToQuote({ sourceRow, targetQuote, traceability = {} }) {
    const lineCode = await generateNextLineCode();
    const calculationCode = await generateNextCalculationCode();
    const baseSummary = summarizeLineForDestination(sourceRow);
    const metadata = buildTraceabilityMetadata({
        action: traceability.action,
        sourceQuoteCode: traceability.sourceQuoteCode || sourceRow?.quote_code,
        sourceLineCode: traceability.sourceLineCode || sourceRow?.line_code,
        actor: traceability.actor,
        timestamp: traceability.timestamp
    });
    const isDuplicateLine = metadata.action === 'duplicate-line';
    const sourceRawData = isDuplicateLine
        ? buildDuplicatedLineRawData(sourceRow.raw_data)
        : { ...(sourceRow.raw_data || {}) };
    const rawPayload = {
        quote_code: targetQuote.quote_code,
        line_code: lineCode,
        product_code: sourceRow.product_code,
        customer_code: targetQuote.customer_code,
        customer_name: targetQuote.customer_name,
        salesperson_name: targetQuote.salesperson_name,
        department: pickFirstValue(sourceRow.raw_data?.DEPARTAMENTO, 'Flexografia'),
        job_name: pickFirstValue(sourceRow.raw_data?.['NOMBRE TRABAJO'], sourceRow.raw_data?.['Nombre Trabajo'], lineCode),
        material_name: pickFirstValue(sourceRow.raw_data?.['GENERAL | MATERIAL'], sourceRow.material_code),
        material_code: sourceRow.material_code,
        status: isDuplicateLine ? 'Borrador' : pickFirstValue(sourceRow.raw_data?.['SOLICITUD ESTADO'], sourceRow.raw_data?.['ESTADO LINEA'], 'Borrador'),
        process_type: sourceRow.process_type,
        machine_name: sourceRow.machine_name,
        die_code: sourceRow.die_code,
        quantity: sourceRow.quantity,
        quantityProducts: sourceRow.quantity,
        total_cost: sourceRow.total_cost,
        unit_price: sourceRow.unit_price
    };
    if (isDuplicateLine) rawPayload.finalized_for_order = false;
    const rawData = buildCalculationRawData(
        rawPayload,
        {
            ...sourceRawData,
            'ID COTIZACION': targetQuote.quote_code,
            'ID LINEA': lineCode,
            'ID CLIENTE': targetQuote.customer_code || baseSummary.customer_code,
            CLIENTE: targetQuote.customer_name || baseSummary.customer_name,
            'CLIENTE NOMBRE': targetQuote.customer_name || baseSummary.customer_name,
            VENDEDOR: targetQuote.salesperson_name || '',
            'FECHA CREACION': targetQuote.created_on || baseSummary.created_on,
            'TRAZABILIDAD | ACCION': metadata.action,
            'TRAZABILIDAD | USUARIO': metadata.created_by,
            'TRAZABILIDAD | FECHA': metadata.created_at,
            'TRAZABILIDAD | COTIZACION ORIGEN': metadata.source_quote_code,
            'TRAZABILIDAD | LINEA ORIGEN': metadata.source_line_code,
            traceability: metadata
        }
    );
    if (isDuplicateLine) resetDuplicatedLineUiState(rawData, { targetQuote, lineCode });

    await pgQuery(
        `INSERT INTO flexo_calculations (
            calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name,
            die_code, material_code, quantity, subtotal_cost, total_cost, unit_price, raw_data
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)`,
        [
            calculationCode,
            targetQuote.quote_code,
            lineCode,
            pickFirstValue(sourceRow.product_code, lineCode),
            targetQuote.customer_code,
            sourceRow.process_type,
            sourceRow.machine_name,
            sourceRow.die_code,
            sourceRow.material_code,
            sourceRow.quantity,
            sourceRow.subtotal_cost,
            sourceRow.total_cost,
            sourceRow.unit_price,
            JSON.stringify(rawData)
        ]
    );

    return await getLatestCalculationRow(targetQuote.quote_code, lineCode);
}

function buildProductionOrderRawData({ orderCode, quoteRow, lineRow, attachments = [], groupMembers = [], actor = getConfiguredCurrentUser() }) {
    const raw = lineRow?.raw_data || {};
    const frontBackGroup = getFrontBackGroupFromLine(lineRow);
    const members = frontBackGroup && Array.isArray(groupMembers) && groupMembers.length ? groupMembers : [lineRow].filter(Boolean);
    const productionRun = frontBackGroup ? buildFrontBackProductionRun(lineRow, members) : null;
    const metadata = buildTraceabilityMetadata({
        action: 'create-order',
        sourceQuoteCode: quoteRow?.quote_code || lineRow?.quote_code,
        sourceLineCode: lineRow?.line_code,
        actor
    });
    const lineSnapshot = mapFlexoCalculationDetail(lineRow);
    const totalFeet = Number(pickFirstValue(
        lineSnapshot.materialFeet,
        raw['GENERAL | SUSTRATO | CONSUMO PIES'],
        raw['Material | Pies Segun Proceso Productivo'],
        raw['CONV | MATERIAL | CANTIDAD PIES LINEALES INCLUYE MACULA'],
        raw['DIGITAL | MATERIAL | CANTIDAD PIES LINEALES INCLUYE MACULA']
    )) || 0;
    if (totalFeet > 0 && !Number(lineSnapshot.materialFeet || 0)) {
        lineSnapshot.materialFeet = totalFeet;
    }
    return {
        order_code: orderCode,
        source_quote_code: quoteRow?.quote_code || lineRow?.quote_code || '',
        source_line_code: lineRow?.line_code || '',
        customer_code: pickFirstValue(quoteRow?.customer_code, lineRow?.customer_code, raw['ID CLIENTE']),
        customer_name: pickFirstValue(quoteRow?.customer_name, raw.CLIENTE, raw['CLIENTE NOMBRE']),
        contact_name: pickFirstValue(quoteRow?.contact_name, raw['CLIENTE | CONTACTO NOMBRE COMPLETO']),
        email: pickFirstValue(quoteRow?.email, raw['CLIENTE | CONTACTO EMAIL']),
        phone: pickFirstValue(quoteRow?.phone, raw['CLIENTE | CONTACTO TELEFONO']),
        salesperson_name: pickFirstValue(quoteRow?.salesperson_name, raw.VENDEDOR),
        status: 'Pendiente',
        created_on: new Date().toISOString(),
        created_by: metadata.created_by,
        createdBy: metadata.created_by,
        created_at: metadata.created_at,
        planning_control: {
            salesReleased: false,
            salesReleasedAt: null,
            salesReleasedBy: '',
            planningStatus: 'PENDIENTE_VENTAS',
            launchedToGantt: false,
            launchedAt: null,
            launchedBy: '',
            returnedAt: null,
            returnedBy: '',
            returnReason: '',
            promisedDeliveryDate: quoteRow?.due_on || null,
            scheduledDeliveryDate: null
        },
        quote_snapshot: mapQuoteHeader(quoteRow || { quote_code: lineRow?.quote_code, raw_data: {} }),
        line_snapshot: lineSnapshot,
        line_summary: mapCalculationLine(lineRow),
        front_back_group: frontBackGroup,
        grupo_frente_dorso: frontBackGroup,
        production_run: productionRun,
        related_lines: members.map((row) => ({
            summary: mapCalculationLine(row),
            detail: mapFlexoCalculationDetail(row)
        })),
        attachments,
        traceability: metadata,
        totals: {
            quantity: productionRun?.totals?.quantity ?? parseLegacyNumber(lineRow?.quantity),
            total_feet: totalFeet,
            subtotal_cost: parseLegacyNumber(lineRow?.subtotal_cost),
            total_cost: productionRun?.totals?.totalCost ?? parseLegacyNumber(lineRow?.total_cost),
            unit_price: productionRun?.totals?.unitCost ?? parseLegacyNumber(lineRow?.unit_price)
        }
    };
}

function getOrderPlanningControl(rawData = {}, quoteRow = null) {
    const existing = rawData?.planning_control || rawData?.planningControl || {};
    const promisedDeliveryDate = existing.promisedDeliveryDate
        || rawData?.quote_snapshot?.due_on
        || quoteRow?.due_on
        || null;
    const planningStatus = existing.planningStatus
        || (existing.launchedToGantt ? 'EN_GANTT' : existing.salesReleased ? 'PENDIENTE_PLANIFICACION' : 'PENDIENTE_VENTAS');

    return {
        salesReleased: Boolean(existing.salesReleased),
        salesReleasedAt: existing.salesReleasedAt || null,
        salesReleasedBy: existing.salesReleasedBy || '',
        planningStatus,
        launchedToGantt: Boolean(existing.launchedToGantt || planningStatus === 'EN_GANTT'),
        launchedAt: existing.launchedAt || null,
        launchedBy: existing.launchedBy || '',
        returnedAt: existing.returnedAt || null,
        returnedBy: existing.returnedBy || '',
        returnReason: existing.returnReason || '',
        promisedDeliveryDate,
        scheduledDeliveryDate: existing.scheduledDeliveryDate || null,
        selectedProcessKeys: normalizePlanningProcessKeys(existing.selectedProcessKeys || existing.selectedProcesses || []),
        processSelectionUpdatedAt: existing.processSelectionUpdatedAt || null,
        processSelectionUpdatedBy: existing.processSelectionUpdatedBy || ''
    };
}

/**
 * Centraliza todos los datos de impresión de una orden en un único bloque.
 * Lee desde line_snapshot, line_snapshot.raw_data, Datos_Cotizados, Estado_UI y campos planos.
 * Esto elimina la búsqueda fragmentada en múltiples fuentes.
 */
function extractPrintingData(rawData = {}) {
    const ls = rawData.line_snapshot || {};
    const lr = (ls.raw_data || {});
    const dc = lr['Datos_Cotizados'] || {};
    const uiState = lr['Estado_UI'] || {};
    const stages = Array.isArray(uiState.printStages) ? uiState.printStages : [];
    const hasPrintInput = String(lr['SIN IMPRESION'] || '').toLowerCase() !== 'si';
    const hasCmyk = String(lr['CMYK'] || '').toLowerCase() === 'si' || lr['GENERAL | CMYK'] === true;
    const hasWhite = String(lr['TINTA BLANCA'] || '').toLowerCase() === 'si' || lr['GENERAL | TINTA BLANCA'] === true;
    const hasDoubleWhite = String(lr['DOBLE PASADA BLANCA'] || '').toLowerCase() === 'si';
    const tintCount = Number(ls.tintCount || lr['CANTIDAD TINTAS'] || 0);
    const pantoneCount = Number(ls.pantoneCount || lr['CANTIDAD PANTONES'] || 0);
    const inkNames = [];
    const inkMaterialIds = [];
    stages.forEach(function (s) {
        if (s.inkMaterialDesc) { inkNames.push(s.inkMaterialDesc); }
        if (s.inkMaterialId) { inkMaterialIds.push(s.inkMaterialId); }
        if (hasWhite && s.whiteInkMaterialDesc && !inkNames.includes(s.whiteInkMaterialDesc)) {
            inkNames.push(s.whiteInkMaterialDesc);
        }
        if (hasWhite && s.whiteInkMaterialId) {
            inkMaterialIds.push(s.whiteInkMaterialId);
        }
    });
    const pantones = [lr['PANTONE 1'], lr['PANTONE 2'], lr['PANTONE 3']].filter(Boolean);
    const dieCode = ls.dieCode || lr['GENERAL | TROQUEL | ID'] || '';
    const finishes = [];
    (Array.isArray(dc?.print?.items) ? dc.print.items : []).forEach(function (pi) {
        (Array.isArray(pi?.inlineItems) ? pi.inlineItems : []).forEach(function (inl) {
            if (inl?.active && (inl.processKey || inl.key || inl.label)) {
                finishes.push(inl.label || inl.materialName || inl.processKey || inl.key);
            }
        });
    });
    (Array.isArray(dc?.finishes?.items) ? dc.finishes.items : []).forEach(function (ext) {
        if (ext?.active && (ext.processKey || ext.key || ext.label || ext.description)) {
            finishes.push(ext.label || ext.description || ext.processKey || ext.key);
        }
    });
    ['ACABADOS | BARNIZ', 'BARNIZ', 'ACABADOS | LAMINADO', 'LAMINADO', 'ACABADOS | FOIL', 'FOIL',
     'ACABADOS | EMBOSADO', 'EMBOSADO', 'ACABADOS | NUMERADO', 'NUMERADO'].forEach(function (fk) {
        var v = lr[fk];
        if (v && !finishes.some(function (f) { return f === v || f.includes(String(v)); })) {
            finishes.push(String(v).trim());
        }
    });
    if (dieCode) finishes.push('Troquelado (' + dieCode + ')');
    var uniqueFinishes = [];
    finishes.forEach(function (f) { if (!uniqueFinishes.includes(f)) uniqueFinishes.push(f); });
    const numbering = lr['ACABADOS | NUMERADO'] || lr['NUMERADO'] || '';
    const machineName = ls.quotedMachine || lr['MAQUINA IMPRESION'] || lr['CONV | MAQUINA'] || '';
    const materialName = ls.materialName || lr['GENERAL | MATERIAL'] || '';
    const materialFeet = Number(ls.materialFeet || lr['GENERAL | SUSTRATO | CONSUMO PIES'] || 0);
    const materialFeetWaste = Number(ls.materialFeetWaste || 0);
    const coreWidth = ls.coreWidth || '';
    const coreDiameter = ls.coreDiameter || '';
    const labelsPerRoll = Number(ls.labelsPerRoll || 0);
    const outputType = ls.outputType || lr['TIPO SALIDA'] || '';
    const frontBackRun = rawData.production_run;
    const fb = frontBackRun && frontBackRun.mode === 'frente_dorso'
        ? { mode: 'frente_dorso', label: frontBackRun.label || 'Frente / Dorso', outputs: frontBackRun.outputs || [] }
        : null;
    return {
        hasPrint: hasPrintInput,
        machineName: machineName || '',
        materialName: materialName || '',
        materialFeet: materialFeet,
        materialFeetWaste: materialFeetWaste,
        tintCount: tintCount,
        pantoneCount: pantoneCount,
        hasCmyk: hasCmyk,
        hasWhite: hasWhite,
        hasDoubleWhite: hasDoubleWhite,
        inkNames: inkNames,
        inkMaterialIds: inkMaterialIds,
        pantones: pantones,
        finishes: uniqueFinishes,
        dieCode: dieCode,
        numbering: numbering,
        coreWidth: coreWidth,
        coreDiameter: coreDiameter,
        labelsPerRoll: labelsPerRoll,
        outputType: outputType,
        frontBack: fb
    };
}

function withUpdatedOrderPlanningControl(rawData = {}, updates = {}, quoteRow = null) {
    return {
        ...rawData,
        planning_control: {
            ...getOrderPlanningControl(rawData, quoteRow),
            ...updates
        }
    };
}

function getOrderTrackingMarks(rawData = {}) {
    const marks = rawData?.order_tracking_marks || rawData?.orderTrackingMarks || {};
    return marks && typeof marks === 'object' && !Array.isArray(marks) ? marks : {};
}

function withUpdatedOrderTrackingMark(rawData = {}, processKey = '', mark = {}) {
    const key = normalizeOrderTrackingStepKey(processKey);
    if (!key) return rawData;
    return {
        ...rawData,
        order_tracking_marks: {
            ...getOrderTrackingMarks(rawData),
            [key]: mark
        }
    };
}

function applyOrderTrackingMarks(steps = [], rawData = {}, resolveActorInfo = () => ({ name: '', photoUrl: '' })) {
    const marks = getOrderTrackingMarks(rawData);
    return steps.map((step) => {
        const key = normalizeOrderTrackingStepKey(step.processKey);
        const mark = key ? marks[key] : null;
        if (!mark || typeof mark !== 'object') return step;
        if (mark.marked === false) {
            return {
                ...step,
                routeStatus: 'PENDIENTE',
                completedBy: '',
                completedByPhoto: '',
                completedAt: null,
                startedAt: null,
                trackingOverride: mark
            };
        }
        if (mark.marked !== true) return step;
        const actor = resolveActorInfo(mark.markedBy || mark.userName || mark.user || '');
        return {
            ...step,
            routeStatus: 'COMPLETADO',
            completedBy: actor.name || pickFirstValue(sanitizeAdminUserText(mark.markedBy), sanitizeAdminUserText(mark.userName), sanitizeAdminUserText(mark.user)),
            completedByPhoto: pickFirstValue(sanitizeAdminUserText(mark.markedByPhoto), sanitizeAdminUserText(mark.photoUrl), actor.photoUrl),
            completedAt: mark.markedAt || null,
            startedAt: mark.markedAt || step.startedAt || null,
            trackingOverride: mark
        };
    });
}

function buildOrderPlanningSummary(orderRow = {}, quoteRow = null) {
    return getOrderPlanningControl(orderRow?.raw_data || {}, quoteRow);
}

function isOrderVisibleInGantt(orderRow = {}) {
    const rawData = orderRow?.raw_data || {};
    const hasExplicitControl = Object.prototype.hasOwnProperty.call(rawData, 'planning_control')
        || Object.prototype.hasOwnProperty.call(rawData, 'planningControl');
    if (!hasExplicitControl) return true;
    return getOrderPlanningControl(rawData).planningStatus === 'EN_GANTT';
}

function buildQuoteRawData(payload = {}, existingRawData = {}) {
    const customerCode = pickFirstValue(payload.customer_code, existingRawData['ID CLIENTE']);
    const customerName = pickFirstValue(payload.customer_name, existingRawData['CLIENTE NOMBRE']);
    const contactName = pickFirstValue(payload.contact_name, existingRawData['CLIENTE | CONTACTO NOMBRE COMPLETO']);
    const email = pickFirstValue(payload.email, existingRawData['CLIENTE | CONTACTO EMAIL']);
    const phone = pickFirstValue(payload.phone, existingRawData['CLIENTE | CONTACTO TELEFONO']);
    const secondaryPhone = pickFirstValue(payload.phone_secondary, existingRawData['CLIENTE | CONTACTO TELEFONO SECUNDARIO']);
    const salespersonName = pickFirstValue(payload.salesperson_name, existingRawData.VENDEDOR, existingRawData['VENDEDOR | USUARIO']);
    const status = pickFirstValue(payload.status, existingRawData['Estado Cotizacion'], 'Activa');
    const dueOn = pickFirstValue(payload.due_on, existingRawData['FECHA VENCIMIENTO']);
    const createdOn = pickFirstValue(payload.created_on, existingRawData['FECHA CREACION']);

    return {
        ...existingRawData,
        'Clave_Solicitud': pickFirstValue(payload.request_key, existingRawData['Clave_Solicitud']),
        'ID CLIENTE': customerCode,
        'CLIENTE NOMBRE': customerName,
        'CLIENTE | CONTACTO NOMBRE COMPLETO': contactName,
        'CLIENTE | CONTACTO EMAIL': email,
        'CLIENTE | CONTACTO TELEFONO': phone,
        'CLIENTE | CONTACTO TELEFONO SECUNDARIO': secondaryPhone,
        VENDEDOR: salespersonName,
        'VENDEDOR | USUARIO': salespersonName,
        'Estado Cotizacion': status,
        'FECHA CREACION': createdOn,
        'FECHA VENCIMIENTO': dueOn
    };
}

function buildCalculationRawData(payload = {}, existingRawData = {}) {
    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(payload, key);
    const processType = pickFirstValue(payload.process_type, existingRawData['Proceso Productivo'], 'Convencional');
    const isDigital = String(processType).toLowerCase().includes('digit');
    const activePrefix = isDigital ? 'DIGITAL' : 'CONV';
    const finalizedForOrder = hasOwn('finalized_for_order') || hasOwn('finalizedForOrder')
        ? Boolean(hasOwn('finalized_for_order') ? payload.finalized_for_order : payload.finalizedForOrder)
        : Boolean(existingRawData['Finalizado_Para_Orden']);
    const quantityProducts = hasOwn('quantityProducts') || hasOwn('quantity')
        ? (parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(payload.quantityProducts))
        : parseLegacyNumber(existingRawData['Cantidad Productos']);
    const quantityTypes = hasOwn('quantityTypes')
        ? parseLegacyNumber(payload.quantityTypes)
        : parseLegacyNumber(existingRawData['CANTIDAD TIPOS']);
    const quantityChanges = hasOwn('quantityChanges')
        ? parseLegacyNumber(payload.quantityChanges)
        : parseLegacyNumber(existingRawData['CANTIDAD CAMBIOS']);
    const width = hasOwn('widthInches')
        ? parseLegacyNumber(payload.widthInches)
        : parseLegacyNumber(existingRawData['DIMENSIONES ETIQUETA | ANCHO']);
    const length = hasOwn('lengthInches')
        ? parseLegacyNumber(payload.lengthInches)
        : parseLegacyNumber(existingRawData['DIMENSIONES ETIQUETA | LARGO']);
    const tintCount = hasOwn('stationCount')
        ? parseLegacyNumber(payload.stationCount)
        : parseLegacyNumber(existingRawData['CANTIDAD TINTAS']);
    const labelsPerRoll = hasOwn('labelsPerRoll')
        ? parseLegacyNumber(payload.labelsPerRoll)
        : parseLegacyNumber(existingRawData['CANTIDAD ETIQUETAS X ROLLO']);
    const coreWidth = hasOwn('coreWidth')
        ? parseLegacyNumber(payload.coreWidth)
        : parseLegacyNumber(existingRawData['ANCHO CORE']);
    const coreDiameter = hasOwn('coreDiameter')
        ? pickFirstValue(payload.coreDiameter)
        : pickFirstValue(existingRawData['DIAMETRO CORE']);
    const cmykEnabled = hasOwn('cmyk')
        ? Boolean(payload.cmyk)
        : (existingRawData['GENERAL | CMYK'] === true || String(existingRawData['CMYK'] || '').trim().toLowerCase() === 'si');
    const total = hasOwn('total_cost') || hasOwn('finalTotal')
        ? (parseLegacyNumber(payload.total_cost) ?? parseLegacyNumber(payload.finalTotal))
        : parseLegacyNumber(existingRawData['PRECIO TOTAL AL FINALIZAR']);
    const unitPrice = hasOwn('unit_price') || hasOwn('unitPrice')
        ? (parseLegacyNumber(payload.unit_price) ?? parseLegacyNumber(payload.unitPrice))
        : parseLegacyNumber(existingRawData['GENERAL | 9 | UNITARIO | DOL']);
    const processResult = hasOwn('processResult') && payload.processResult && typeof payload.processResult === 'object'
        ? payload.processResult
        : null;
    const industrialSubtotal = processResult ? parseLegacyNumber(processResult.industrial) : null;
    const subtotalBeforeTax = processResult ? parseLegacyNumber(processResult.afterDiscount) : null;
    const taxAmount = processResult ? parseLegacyNumber(processResult.tax) : null;
    const taxPercent = processResult
        ? (parseLegacyNumber(processResult.taxPct) ?? parseLegacyNumber(payload.uiState?.commercial?.taxPct))
        : null;

    const rawData = {
        ...existingRawData,
        'ID COTIZACION': pickFirstValue(payload.quote_code, existingRawData['ID COTIZACION']),
        'ID LINEA': pickFirstValue(payload.line_code, existingRawData['ID LINEA']),
        'ID CLIENTE': pickFirstValue(payload.customer_code, existingRawData['ID CLIENTE']),
        CLIENTE: pickFirstValue(payload.customer_name, existingRawData.CLIENTE),
        VENDEDOR: pickFirstValue(payload.salesperson_name, existingRawData.VENDEDOR),
        DEPARTAMENTO: pickFirstValue(payload.department, existingRawData.DEPARTAMENTO, 'Flexografia'),
        'NOMBRE TRABAJO': pickFirstValue(payload.job_name, existingRawData['NOMBRE TRABAJO']),
        'TIPO ORDEN': hasOwn('orderType') ? payload.orderType : pickFirstValue(existingRawData['TIPO ORDEN']),
        'GENERAL | MATERIAL': hasOwn('material_name')
            ? payload.material_name
            : pickFirstValue(existingRawData['GENERAL | MATERIAL'], payload.material_code),
        'Material | Tipo Según Proceso Productivo': hasOwn('material_name')
            ? payload.material_name
            : pickFirstValue(existingRawData['Material | Tipo Según Proceso Productivo'], existingRawData['GENERAL | MATERIAL'], payload.material_code),
        'Material Convencional | Id Material': activePrefix === 'CONV'
            ? pickFirstValue(payload.material_code, existingRawData['Material Convencional | Id Material'])
            : pickFirstValue(existingRawData['Material Convencional | Id Material']),
        'Material Digital | Id Material': activePrefix === 'DIGITAL'
            ? pickFirstValue(payload.material_code, existingRawData['Material Digital | Id Material'])
            : pickFirstValue(existingRawData['Material Digital | Id Material']),
          'SOLICITUD ESTADO': pickFirstValue(payload.status, existingRawData['SOLICITUD ESTADO'], 'Borrador'),
          'ESTADO LINEA': pickFirstValue(payload.status, existingRawData['ESTADO LINEA'], 'Borrador'),
          'Finalizado_Para_Orden': finalizedForOrder,
          'Proceso Productivo': processType,
        'TIPO ETIQUETADO': hasOwn('applicationType') ? payload.applicationType : pickFirstValue(existingRawData['TIPO ETIQUETADO']),
        'AMBIENTE APLICACION': hasOwn('applicationEnvironment') ? payload.applicationEnvironment : pickFirstValue(existingRawData['AMBIENTE APLICACION']),
        'TIPO SUPERFICIE': hasOwn('surfaceType') ? payload.surfaceType : pickFirstValue(existingRawData['TIPO SUPERFICIE']),
        'TIPO SALIDA': hasOwn('outputType') ? payload.outputType : pickFirstValue(existingRawData['TIPO SALIDA']),
        'GENERAL | TROQUEL | ID': hasOwn('die_code') ? payload.die_code : pickFirstValue(existingRawData['GENERAL | TROQUEL | ID']),
        [`${activePrefix} | MAQUINA`]: hasOwn('machine_name') ? payload.machine_name : pickFirstValue(existingRawData[`${activePrefix} | MAQUINA`]),
        'Cantidad Productos': quantityProducts,
        'CANTIDAD TIPOS': quantityTypes,
        'CANTIDAD CAMBIOS': quantityChanges,
        'CANTIDAD TINTAS': tintCount,
        'CANTIDAD ETIQUETAS X ROLLO': labelsPerRoll,
        'DIMENSIONES ETIQUETA | ANCHO': width,
        'DIMENSIONES ETIQUETA | LARGO': length,
        'ANCHO CORE': coreWidth,
        'DIAMETRO CORE': coreDiameter,
        'GENERAL | CMYK': cmykEnabled,
        'CMYK': cmykEnabled ? 'Si' : 'No',
        'GENERAL | 5 | SUBTOTAL': industrialSubtotal ?? existingRawData['GENERAL | 5 | SUBTOTAL'],
        'GENERAL | 7 | SUBTOTAL CALC ANTES IV | DOL': subtotalBeforeTax ?? existingRawData['GENERAL | 7 | SUBTOTAL CALC ANTES IV | DOL'],
        'GENERAL | 8 | PORCENTAJE IVA': taxPercent ?? existingRawData['GENERAL | 8 | PORCENTAJE IVA'],
        'GENERAL | 9 | Impuestos': taxAmount ?? existingRawData['GENERAL | 9 | Impuestos'],
        'PRECIO TOTAL AL FINALIZAR': total,
        'GENERAL | 9 | UNITARIO | DOL': unitPrice,
        'Estado_UI': hasOwn('uiState') ? payload.uiState : (existingRawData['Estado_UI'] || null),
        'Datos_Cotizados': hasOwn('processResult') ? payload.processResult : (existingRawData['Datos_Cotizados'] || null)
    };

    const uiPrintState = rawData['Estado_UI']?.print || rawData['Estado_UI']?.printStages?.[0] || null;
    if (uiPrintState && typeof uiPrintState === 'object') {
        const inlineBarnizState = uiPrintState.inlineFinishes?.barniz || {};
        const varnishInkProfile = Array.isArray(uiPrintState.inkProfiles)
            ? uiPrintState.inkProfiles.find((row) => String(row?.tipo || '').toLowerCase().includes('barniz'))
            : null;
        rawData['CONV | PERFIL TINTA | TIPO'] = pickFirstValue(uiPrintState.profileLabel, existingRawData['CONV | PERFIL TINTA | TIPO']);
        rawData['CONV | PERFIL TINTA | COBERTURA %'] = parseLegacyNumber(uiPrintState.coveragePct);
        rawData['CONV | PERFIL TINTA | BCM ANILOX'] = parseLegacyNumber(uiPrintState.aniloxBcm);
        rawData['CONV | PERFIL TINTA | GSM'] = parseLegacyNumber(uiPrintState.inkGsm);
        rawData['CONV | BARNIZ | ACTIVO'] = Boolean(inlineBarnizState.active);
        rawData['CONV | BARNIZ | ZONIFICADO'] = Boolean(inlineBarnizState.sonified);
        rawData['CONV | BARNIZ | BCM ANILOX'] = parseLegacyNumber(pickFirstValue(inlineBarnizState.varnishBcm, varnishInkProfile?.bcm, existingRawData['CONV | BARNIZ | BCM ANILOX']));
        rawData['CONV | BARNIZ | COBERTURA %'] = parseLegacyNumber(inlineBarnizState.coveragePct);
        rawData['CONV | BARNIZ | GSM'] = parseLegacyNumber(inlineBarnizState.layerGsm);
    }

    if (payload.request_meta && typeof payload.request_meta === 'object' && !Array.isArray(payload.request_meta)) {
        Object.entries(payload.request_meta).forEach(([key, value]) => {
            rawData[key] = value;
        });
    }

    if (hasDigitalPrintingContext({
        processType,
        machineName: rawData[`${activePrefix} | MAQUINA`],
        raw: rawData
    })) {
        zeroDigitalPlateCostFields(rawData);
    }

    const processSnapshot = buildCalculationProcessSnapshot({
        raw: rawData,
        processType,
        machineName: rawData[`${activePrefix} | MAQUINA`],
        dieCode: rawData['GENERAL | TROQUEL | ID'],
        uiState: rawData['Estado_UI'] || null
    });
    rawData['Secuencia_Procesos'] = processSnapshot;
    rawData['Texto_Secuencia_Procesos'] = processSnapshot.map((item) => item.processName).join(' -> ');
    applyCalculationLineSummary(rawData, {
        quote_code: rawData['ID COTIZACION'],
        line_code: rawData['ID LINEA'],
        product_code: payload.product_code,
        customer_code: rawData['ID CLIENTE'],
        process_type: processType,
        machine_name: rawData[`${activePrefix} | MAQUINA`],
        die_code: rawData['GENERAL | TROQUEL | ID'],
        material_code: activePrefix === 'DIGITAL' ? rawData['Material Digital | Id Material'] : rawData['Material Convencional | Id Material'],
        quantity: quantityProducts,
        total_cost: total,
        unit_price: unitPrice
    });

    return rawData;
}

function applyCurrencyFieldsToRawData(rawData = {}, exchangeRateInput = null) {
    const exchangeRate = parseLegacyNumber(
        pickFirstValue(
            exchangeRateInput,
            rawData['TIPO CAMBIO'],
            rawData['TIPO CAMBIO VENTA'],
            rawData['TIPO CAMBIO COMPRA']
        )
    ) ?? 1;
    const safeRate = exchangeRate > 0 ? exchangeRate : 1;
    const totalUsd = parseLegacyNumber(rawData['PRECIO TOTAL AL FINALIZAR']);
    const unitUsd = parseLegacyNumber(rawData['GENERAL | 9 | UNITARIO | DOL']);

    rawData['TIPO CAMBIO'] = safeRate;
    rawData['TIPO CAMBIO VENTA'] = safeRate;
    rawData['TIPO CAMBIO COMPRA'] = safeRate;

    if (totalUsd !== null) {
        const totalCol = roundCurrency(totalUsd * safeRate);
        rawData['GENERAL | 7 | TOTAL | DOL'] = totalUsd;
        rawData['GENERAL | 9 | TOTAL | DOL'] = totalUsd;
        rawData['GENERAL | 7 | TOTAL | COL'] = totalCol;
        rawData['GENERAL | 9 | TOTAL | COL EXPORTAR REPORTE VENTAS'] = totalCol;
    }

    if (unitUsd !== null) {
        rawData['GENERAL | 9 | UNITARIO | COL'] = roundCurrency(unitUsd * safeRate);
    }

    return rawData;
}

async function resolveSingleInventoryMachineName(preferredMachineName = '') {
    const preferred = String(preferredMachineName || '').trim();
    if (preferred) return preferred;
    return '';
}

function normalizeFlexoMaterialFamily(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeSapUom(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function mapLocalMaterialCatalogRow(row = {}) {
    return {
        id: pickFirstValue(row.codigo, row.code, row.id, ''),
        codigo: pickFirstValue(row.codigo, row.code, row.id, ''),
        code: pickFirstValue(row.codigo, row.code, row.id, ''),
        nombre: pickFirstValue(row.nombre, row.name, ''),
        name: pickFirstValue(row.nombre, row.name, ''),
        descripcion: pickFirstValue(row.nombre, row.description, row.name, ''),
        description: pickFirstValue(row.nombre, row.description, row.name, ''),
        ancho_mm: row.ancho_mm,
        widthMm: row.ancho_mm,
        largo_mm: row.largo_mm,
        lengthMm: row.largo_mm,
        gramaje_g_m2: row.gramaje_g_m2,
        gramaje: row.gramaje_g_m2,
        calibre_micras: row.calibre_micras,
        costo_x_lamina: row.costo_x_lamina,
        costoPorLamina: row.costo_x_lamina,
        costo_x_msi: row.costo_x_msi,
        costoMaterialPorMsi: row.costo_x_msi,
        costo_x_m2: row.costo_x_m2,
        costo_x_ft2: row.costo_x_m2 ? Number(row.costo_x_m2) / FT2_PER_M2 : 0,
        costo_x_kg: row.costo_x_kg,
        costo_x_libra: row.costo_x_libra,
        costoPorLibra: row.costo_x_libra,
        peso_capa_gsm: row.peso_capa_gsm,
        gsm: row.peso_capa_gsm,
        familia_proceso: row.familia_proceso,
        familiaProceso: row.familia_proceso,
        costo_x_unidad: row.costo_x_unidad,
        merma_pct: row.merma_pct,
        rendimiento_g_ft2: row.rendimiento_g_ft2 || (row.peso_capa_gsm ? Number(row.peso_capa_gsm) / FT2_PER_M2 : 0),
        temperatura_aplicacion_c: row.temperatura_aplicacion_c,
        tipo_transferencia: row.tipo_transferencia,
        compatible_convencional: row.compatible_convencional,
        compatible_digital: row.compatible_digital,
        tipo_proforma: row.tipo_proforma,
        familia: row.familia_proceso || row.tipo_proforma,
        activo: row.activo,
        active: row.activo
    };
}

function mapSapMaterialCatalogRow(row = {}) {
    const itemCode = String(row.item_code || '').trim();
    const itemName = String(row.item_name || '').trim();
    const unit = normalizeSapUom(row.sales_unit_msr || row.buy_unit_msr);
    const family = normalizeFlexoMaterialFamily(row.flexo_category || row.classification_source_value);
    const price = Number(row.price || 0);
    const haystack = normalizeFlexoMaterialFamily(`${itemCode} ${itemName} ${row.item_group_code || ''}`);
    const isDigitalInk = family.includes('digital') || haystack.includes('xerox') || haystack.includes('digital');
    const isSubstrate = family === 'sustrato';
    const costPerM2 = unit.includes('M2') ? price : 0;
    const costPerFt2 = unit.includes('FT2') || unit.includes('PIE2')
        ? price
        : (costPerM2 > 0 ? Number(costPerM2) / FT2_PER_M2 : 0);
    const costPerMsi = unit.includes('MSI') ? price : 0;
    const costPerKg = unit === 'KG' || unit === 'KGS' ? price : (unit === 'LB' || unit === 'LBS' ? price / 0.45359237 : 0);
    const costPerLb = unit === 'LB' || unit === 'LBS' ? price : (unit === 'KG' || unit === 'KGS' ? price * 0.45359237 : 0);
    return {
        id: itemCode,
        codigo: itemCode,
        code: itemCode,
        nombre: itemName,
        name: itemName,
        descripcion: `${itemCode} | ${itemName}`,
        description: `${itemCode} | ${itemName}`,
        gramaje_g_m2: null,
        gramaje: null,
        calibre_micras: null,
        costo_x_lamina: 0,
        costoPorLamina: 0,
        costo_x_msi: costPerMsi,
        costoMaterialPorMsi: costPerMsi,
        precioUnitarioCotizacionDol: costPerMsi || price || 0,
        costo_x_m2: costPerM2,
        costo_x_ft2: costPerFt2,
        costo_x_kg: costPerKg,
        costo_x_libra: costPerLb,
        costoPorLibra: costPerLb,
        peso_capa_gsm: null,
        gsm: null,
        familia_proceso: family,
        familiaProceso: family,
        costo_x_unidad: price,
        merma_pct: 0,
        rendimiento_g_ft2: 0,
        temperatura_aplicacion_c: null,
        tipo_transferencia: '',
        compatible_convencional: !isDigitalInk,
        compatible_digital: isSubstrate || isDigitalInk,
        tipo_proforma: family,
        familia: family,
        activo: true,
        active: true,
        source: 'sap',
        sap_item_code: itemCode,
        sap_item_group_code: row.item_group_code || '',
        classification_source_value: row.classification_source_value || '',
        classification_display_label: row.display_label || '',
        available_quantity: Number(row.available_quantity || 0),
        on_hand: Number(row.on_hand || 0),
        uom: unit,
        currency: row.currency || ''
    };
}

async function loadFlexoMaterialsCatalog({ localRows = [] } = {}) {
    const generalConfig = await loadGeneralConfig();
    const localMaterials = localRows.map(mapLocalMaterialCatalogRow);
    if (normalizeFlexoMaterialFamily(generalConfig?.general?.inventorySourceMode) !== 'sap') {
        return localMaterials;
    }
    const mappingResult = await pgQuery(`
        SELECT source_value, flexo_category, display_label
          FROM inventory_classification_mappings
         WHERE is_active = TRUE
    `);
    const mappingBySource = new Map(
        mappingResult.rows.map((row) => [
            String(row.source_value || '').trim(),
            {
                flexo_category: String(row.flexo_category || '').trim(),
                display_label: String(row.display_label || '').trim()
            }
        ])
    );
    const sapResult = await pgQuery(`
        SELECT item_code, item_name, item_group_code, classification_source_value, price, currency,
               buy_unit_msr, sales_unit_msr, on_hand, available_quantity
          FROM sap_items
         WHERE item_code <> ''
      ORDER BY item_name ASC, item_code ASC
    `);
    const sapMaterials = sapResult.rows
        .map((row) => {
            const mapping = mappingBySource.get(String(row.classification_source_value || '').trim()) || null;
            if (!mapping?.flexo_category) return null;
            return mapSapMaterialCatalogRow({
                ...row,
                flexo_category: mapping.flexo_category,
                display_label: mapping.display_label
            });
        })
        .filter(Boolean);
    const sapFamilies = new Set(
        sapMaterials
            .map((item) => normalizeFlexoMaterialFamily(item.familia_proceso || item.familia || ''))
            .filter(Boolean)
    );
    const localFallback = localMaterials.filter((item) => {
        const family = normalizeFlexoMaterialFamily(item.familia_proceso || item.familia || '');
        if (!family) return true;
        return !sapFamilies.has(family);
    });
    return [...sapMaterials, ...localFallback];
}

async function loadFlexoCatalogsFromDb() {
    const [materialsResult, diesResult, machinesResult, productsResult, globalCostsResult, outputTypes, processRows] = await Promise.all([
        pgQuery(
            `SELECT codigo, nombre, ancho_mm, largo_mm, gramaje_g_m2, calibre_micras, costo_x_lamina, costo_x_msi, costo_x_m2, costo_x_kg,
                    costo_x_libra, peso_capa_gsm, rendimiento_g_ft2, compatible_convencional, compatible_digital, tipo_proforma,
                    tipo_superficie, requiere_premier, premier_preaplicado, premier_consumo_g_m2, premier_costo_x_kg, premier_costo_x_m2,
                    familia_proceso, comentario_ancho_mm, comentario_largo_mm, comentario_gramaje_g_m2, comentario_calibre_micras,
                    comentario_costo_x_lamina, comentario_costo_x_msi, comentario_costo_x_m2, comentario_costo_x_kg,
                    comentario_costo_x_libra, comentario_peso_capa_gsm, comentario_rendimiento_g_ft2,
                    comentario_compatible_convencional, comentario_compatible_digital, comentario_tipo_proforma, activo
               FROM material
              ORDER BY codigo`
        ),
        pgQuery(
            `SELECT codigo, descripcion, descripcion_cotizaciones, clasificacion, codigo_cliente, codigo_preprensa, codigo_proveedor,
                    ancho_mm, largo_mm, desarrollo_cm, desarrollo_in, elongacion_pct, elongado, ancho_total_troquel_in,
                    largo_total_troquel_in, dimensiones_troquel_in, ancho_etiqueta_in, largo_etiqueta_in, ancho_material_in,
                    area_etiqueta_excesos_in, area_etiqueta_in, area_troquel_in2, estructura_troquel, formato, gap_in,
                    montaje_troquel, observaciones, proveedor_troquel, tension, tipo_troquel, tipo_troquel_2,
                    uso_convencional, uso_digital, usuario_creacion, vida_util_golpes_restantes, vida_util_golpes_usados,
                    vida_util_golpes_total, reemplaza_a, reemplazado_por, image_url, cantidad_filas, dientes, repeticiones, estado, activo
               FROM troquel
              ORDER BY codigo`
        ),
        pgQuery(
            `SELECT m.id,
                    m.nombre,
                    m.tipo::text AS tipo,
                    m.unidad_velocidad_produccion,
                    m.activa,
                    m.minuto_hombre,
                    m.factor_tiraje,
                    m.factor_montaje_estacion,
                    m.factor_preparacion,
                    m.macula_default_pies,
                    m.factor_tiraje_digital,
                    m.digital_tipo_cobro,
                    m.digital_costo_kg_tinta,
                    m.digital_costo_kg_tinta_blanco,
                    m.digital_costo_kg_tinta_especial,
                    m.digital_tarifa_click,
                    m.digital_modo_click,
                    m.digital_velocidad_cmyk_mpm,
                    m.digital_velocidad_extendida_mpm,
                    m.digital_gramaje_cmyk_g_m2,
                    m.digital_gramaje_blanco_g_m2,
                    m.digital_factor_merma,
                    m.digital_costo_lavado_especial,
                    m.digital_premier_modo,
                    m.digital_premier_setup_min,
                    m.digital_premier_costo_mantenimiento,
                    m.digital_premier_costo_offline_m,
                    m.comentario_setup,
                    m.comentario_montaje,
                    mc.id AS capacidad_id,
                    mc.clasificacion,
                    mc.proceso,
                    mc.subproceso,
                    mc.unidad_trabajo,
                    mc.tiempo_preparacion_general,
                    mc.tiempo_adicional_preparacion,
                    mc.tiempo_por_estacion,
                    mc.factor_proceso_por_area,
                    mc.velocidad_produccion,
                    mc.costo_hora_maquina,
                    mc.costo_hora_operario,
                    mc.formula_tiempo,
                    mc.formula_costo,
                    mc.ancho_max_in
               FROM maquina m
          LEFT JOIN maquina_capacidad mc
                 ON mc.maquina_id = m.id
                AND mc.activa IS NOT FALSE
              ORDER BY m.nombre, mc.creado_en NULLS LAST, mc.id`
        ),
        pgQuery(
            `SELECT DISTINCT ON (line_code)
                    quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code, raw_data
               FROM flexo_calculations
              WHERE line_code IS NOT NULL AND line_code <> ''
              ORDER BY line_code, created_at DESC NULLS LAST`
        ),
        pgQuery(
            `SELECT minuto_hombre, factor_tiraje, factor_montaje_estacion, factor_preparacion
               FROM maquina
              ORDER BY actualizado_en DESC NULLS LAST, creado_en DESC NULLS LAST
              LIMIT 1`
        ),
        listInventory('tipos-salida', { limit: 500 }),
        listInventory('procesos', { limit: 2000 })
    ]);

    const machinesById = new Map();
    machinesResult.rows.forEach((row) => {
        if (!machinesById.has(row.id)) {
            machinesById.set(row.id, {
                id: row.id,
                machineName: row.nombre,
                name: row.nombre,
                type: row.tipo,
                speedUnit: row.unidad_velocidad_produccion || 'ft/min',
                active: row.activa,
                legacyOperatorMinuteCost: Number(row.minuto_hombre || 0),
                legacyProductionSpeed: Number(row.factor_tiraje || row.factor_tiraje_digital || 0),
                legacySetupPerStationMinutes: Number(row.factor_montaje_estacion || 0),
                legacySetupBaseMinutes: Number(row.factor_preparacion || 0),
                legacySetupExtraMinutes: Number(row.macula_default_pies || 0),
                maculaDefaultFeet: Number(row.macula_default_pies || 0),
                digitalBillingType: row.digital_tipo_cobro || 'consumo',
                digitalInkCostPerKg: Number(row.digital_costo_kg_tinta || 0),
                digitalWhiteInkCostPerKg: Number(row.digital_costo_kg_tinta_blanco || 0),
                digitalSpecialInkCostPerKg: Number(row.digital_costo_kg_tinta_especial || 0),
                digitalClickRate: Number(row.digital_tarifa_click || 0),
                digitalClickMode: row.digital_modo_click || 'por_estacion',
                digitalSpeedCmykMpm: Number(row.digital_velocidad_cmyk_mpm || 0),
                digitalSpeedExtendedMpm: Number(row.digital_velocidad_extendida_mpm || 0),
                digitalCmykGsm: Number(row.digital_gramaje_cmyk_g_m2 || 1.5),
                digitalWhiteGsm: Number(row.digital_gramaje_blanco_g_m2 || 4),
                digitalWasteFactor: Number(row.digital_factor_merma || 1.1),
                digitalSpecialWashCost: Number(row.digital_costo_lavado_especial || 0),
                digitalPremierMode: row.digital_premier_modo || 'offline',
                digitalPremierSetupMin: Number(row.digital_premier_setup_min || 20),
                digitalPremierMaintenanceCost: Number(row.digital_premier_costo_mantenimiento || 0),
                digitalPremierOfflineCostPerMeter: Number(row.digital_premier_costo_offline_m || 0),
                comentario_setup: row.comentario_setup || '',
                comentario_montaje: row.comentario_montaje || '',
                capacities: []
            });
        }
        const machine = machinesById.get(row.id);
        if (row.capacidad_id) {
            machine.capacities.push({
                id: row.capacidad_id,
                clasificacion: row.clasificacion,
                process: row.proceso,
                subprocess: row.subproceso,
                workUnit: row.unidad_trabajo,
                setupBaseMinutes: Number(row.tiempo_preparacion_general || 0),
                setupExtraMinutes: Number(row.tiempo_adicional_preparacion || 0),
                setupPerStationMinutes: Number(row.tiempo_por_estacion || 0),
                areaFactor: Number(row.factor_proceso_por_area || 0),
                productionSpeed: Number(row.velocidad_produccion || 0),
                hourlyMachineCost: Number(row.costo_hora_maquina || 0),
                hourlyOperatorCost: Number(row.costo_hora_operario || 0),
                timeFormula: row.formula_tiempo || '',
                costFormula: row.formula_costo || '',
                maxWidthInches: Number(row.ancho_max_in || 0)
            });
        }
    });

    const machines = Array.from(machinesById.values()).map((machine) => {
        const primary = machine.capacities[0] || null;
        const process = primary?.process || machine.type;
        const subprocess = primary?.subprocess || '';
        const category = classifyMachineCategory(process, subprocess);
        const isDigital = normalizeText(`${process} ${subprocess} ${machine.type}`).includes('digit');

        return {
            id: machine.id,
            machineName: machine.machineName,
            name: machine.name,
            type: machine.type,
            speedUnit: machine.speedUnit || 'ft/min',
            category,
            process,
            subprocess,
            workUnit: primary?.workUnit || '',
            active: machine.active,
            hourlyMachineCost: primary?.hourlyMachineCost ?? 0,
            hourlyOperatorCost: primary?.hourlyOperatorCost ?? (machine.legacyOperatorMinuteCost * 60),
            productionSpeed: primary?.productionSpeed ?? machine.legacyProductionSpeed,
            setupPerStationMinutes: primary?.setupPerStationMinutes ?? machine.legacySetupPerStationMinutes,
            setupBaseMinutes: primary?.setupBaseMinutes ?? machine.legacySetupBaseMinutes,
            setupExtraMinutes: primary?.setupExtraMinutes ?? machine.legacySetupExtraMinutes,
            maculaDefaultFeet: machine.maculaDefaultFeet,
            digitalBillingType: machine.digitalBillingType,
            digitalInkCostPerKg: machine.digitalInkCostPerKg,
            digitalWhiteInkCostPerKg: machine.digitalWhiteInkCostPerKg,
            digitalSpecialInkCostPerKg: machine.digitalSpecialInkCostPerKg,
            digitalClickRate: machine.digitalClickRate,
            digitalClickMode: machine.digitalClickMode,
            digitalSpeedCmykMpm: machine.digitalSpeedCmykMpm,
            digitalSpeedExtendedMpm: machine.digitalSpeedExtendedMpm,
            digitalCmykGsm: machine.digitalCmykGsm,
            digitalWhiteGsm: machine.digitalWhiteGsm,
            digitalWasteFactor: machine.digitalWasteFactor,
            digitalSpecialWashCost: machine.digitalSpecialWashCost,
            digitalPremierMode: machine.digitalPremierMode,
            digitalPremierSetupMin: machine.digitalPremierSetupMin,
            digitalPremierMaintenanceCost: machine.digitalPremierMaintenanceCost,
            digitalPremierOfflineCostPerMeter: machine.digitalPremierOfflineCostPerMeter,
            areaFactor: primary?.areaFactor ?? 0,
            timeFormula: primary?.timeFormula || '',
            costFormula: primary?.costFormula || '',
            maxWidthInches: primary?.maxWidthInches ?? 0,
            availableColors: isDigital ? 0 : 8,
            comentario_setup: machine.comentario_setup || '',
            comentario_montaje: machine.comentario_montaje || '',
            capacities: machine.capacities
        };
    });

    const machineCategories = machines.reduce((accumulator, machine) => {
        const key = machine.category || 'impresion';
        if (!accumulator[key]) {
            accumulator[key] = [];
        }
        accumulator[key].push(machine);
        return accumulator;
    }, {});

    const materials = await loadFlexoMaterialsCatalog({ localRows: materialsResult.rows });

    return {
        machines,
        machineCategories,
        materials: materials.map((row) => ({
            ...row,
            displayName: row.displayName || `${pickFirstValue(row.codigo, row.code, row.id, '')} | ${pickFirstValue(row.nombre, row.name, '')}`,
            widthInches: row.ancho_mm ? Number(row.ancho_mm) / 25.4 : null,
            lengthInches: row.largo_mm ? Number(row.largo_mm) / 25.4 : null,
            plateAreaIn2: row.ancho_mm && row.largo_mm ? (Number(row.ancho_mm) * Number(row.largo_mm)) / 645.16 : null,
            calibreMicras: row.calibre_micras,
            costPerSheetUsd: row.costo_x_lamina,
            costPerSquareInchUsd: row.costo_x_lamina && row.ancho_mm && row.largo_mm
                ? Number(row.costo_x_lamina) / ((Number(row.ancho_mm) * Number(row.largo_mm)) / 645.16)
                : 0,
            costPerMsiUsd: row.costo_x_msi,
            costPerSquareMeterUsd: row.costo_x_m2,
            costPerKgUsd: row.costo_x_kg,
            costPerLbUsd: row.costo_x_libra,
            coatWeightGsm: row.peso_capa_gsm,
            yieldGft2: row.rendimiento_g_ft2,
            surfaceType: row.tipo_superficie || '',
            requiresPremier: row.requiere_premier,
            premierPreapplied: row.premier_preaplicado,
            premierConsumptionGm2: Number(row.premier_consumo_g_m2 || 0.65),
            premierCostPerKgUsd: Number(row.premier_costo_x_kg || 0),
            premierCostPerM2Usd: Number(row.premier_costo_x_m2 || 0),
            conventionalEnabled: row.compatible_convencional,
            digitalEnabled: row.compatible_digital,
            active: row.activo !== false,
            presentationType: row.tipo_proforma || '',
            familiaProceso: row.familia_proceso || '',
            comentario_ancho_mm: row.comentario_ancho_mm || '',
            comentario_largo_mm: row.comentario_largo_mm || '',
            comentario_gramaje_g_m2: row.comentario_gramaje_g_m2 || '',
            comentario_calibre_micras: row.comentario_calibre_micras || '',
            comentario_costo_x_lamina: row.comentario_costo_x_lamina || '',
            comentario_costo_x_msi: row.comentario_costo_x_msi || '',
            comentario_costo_x_m2: row.comentario_costo_x_m2 || '',
            comentario_costo_x_kg: row.comentario_costo_x_kg || '',
            comentario_costo_x_libra: row.comentario_costo_x_libra || '',
            comentario_peso_capa_gsm: row.comentario_peso_capa_gsm || '',
            comentario_rendimiento_g_ft2: row.comentario_rendimiento_g_ft2 || '',
            comentario_compatible_convencional: row.comentario_compatible_convencional || '',
            comentario_compatible_digital: row.comentario_compatible_digital || '',
            comentario_tipo_proforma: row.comentario_tipo_proforma || ''
        })),
        dies: diesResult.rows.map((row) => ({
            id: row.codigo,
            code: row.codigo,
            description: row.descripcion,
            descripcionCotizaciones: row.descripcion_cotizaciones,
            clasificacion: row.clasificacion,
            codigoCliente: row.codigo_cliente,
            codigoPreprensa: row.codigo_preprensa,
            codigoProveedor: row.codigo_proveedor,
            ancho_mm: row.ancho_mm,
            largo_mm: row.largo_mm,
            widthMm: row.ancho_mm,
            lengthMm: row.largo_mm,
            desarrolloCm: row.desarrollo_cm,
            desarrolloIn: row.desarrollo_in,
            elongacion_pct: row.elongacion_pct,
            elongado: row.elongado,
            ancho_total_troquel_in: row.ancho_total_troquel_in,
            largo_total_troquel_in: row.largo_total_troquel_in,
            dimensionesTroquelIn: row.dimensiones_troquel_in,
            anchoEtiquetaIn: row.ancho_etiqueta_in,
            largoEtiquetaIn: row.largo_etiqueta_in,
            anchoMaterialIn: row.ancho_material_in,
            areaEtiquetaExcesosIn: row.area_etiqueta_excesos_in,
            areaEtiquetaIn: row.area_etiqueta_in,
            areaTroquelIn2: row.area_troquel_in2,
            estructuraTroquel: row.estructura_troquel,
            formato: row.formato,
            gapIn: row.gap_in,
            montajeTroquel: row.montaje_troquel,
            observaciones: row.observaciones,
            proveedorTroquel: row.proveedor_troquel,
            tension: row.tension,
            tipoTroquel: row.tipo_troquel,
            tipoTroquel2: row.tipo_troquel_2,
            usoConvencional: row.uso_convencional,
            usoDigital: row.uso_digital,
            usuarioCreacion: row.usuario_creacion,
            vidaUtilGolpesRestantes: row.vida_util_golpes_restantes,
            vidaUtilGolpesUsados: row.vida_util_golpes_usados,
            vidaUtilGolpesTotal: row.vida_util_golpes_total,
            reemplazaA: row.reemplaza_a,
            reemplazadoPor: row.reemplazado_por,
            imageUrl: row.image_url,
            teeth: row.dientes,
            rows: row.cantidad_filas,
            repetitions: row.repeticiones,
            status: row.estado,
            active: row.activo !== false
        })),
        products: productsResult.rows.map((row) => ({
            id: row.line_code || row.product_code || row.quote_code,
            lineId: row.line_code,
            quoteId: row.quote_code,
            clientId: row.customer_code,
            clientName: pickFirstValue(row.raw_data?.CLIENTE, row.raw_data?.['CLIENTE NOMBRE']),
            code: row.product_code || row.line_code,
            jobName: pickFirstValue(row.raw_data?.['NOMBRE TRABAJO'], row.raw_data?.['TIPO TRABAJO | ORDEN REFERENCIA 1'], row.line_code),
            department: pickFirstValue(row.raw_data?.DEPARTAMENTO, 'Flexografia'),
            materialName: pickFirstValue(row.raw_data?.['GENERAL | MATERIAL'], row.material_code),
            quotedMachine: pickFirstValue(row.machine_name, row.raw_data?.['CONV | MAQUINA'], row.raw_data?.['DIGITAL | MAQUINA']),
            salespersonName: pickFirstValue(row.raw_data?.VENDEDOR),
            dieId: row.die_code,
            quantityProducts: parseLegacyNumber(row.raw_data?.['Cantidad Productos']) ?? null,
            tintCount: parseLegacyNumber(row.raw_data?.['CANTIDAD TINTAS']) ?? null,
            width: parseLegacyNumber(row.raw_data?.['DIMENSIONES ETIQUETA | ANCHO']) ?? null,
            length: parseLegacyNumber(row.raw_data?.['DIMENSIONES ETIQUETA | LARGO']) ?? null,
            outputType: pickFirstValue(row.raw_data?.['TIPO SALIDA']),
            applicationType: pickFirstValue(row.raw_data?.['TIPO ETIQUETADO'])
        })),
        globalCosts: {
            commercialSettings: {
                financialPercent: Number(globalCostsResult.rows[0]?.factor_preparacion || 0),
                profitabilityPercent: Number(globalCostsResult.rows[0]?.factor_tiraje || 0),
                contingencyPercent: Number(globalCostsResult.rows[0]?.factor_montaje_estacion || 0),
                minimumCost: Number(globalCostsResult.rows[0]?.minuto_hombre || 0)
            }
        },
        outputTypes,
        processes: processRows.map((row) => ({
            id: row.id,
            codigo: row.codigo,
            nombre: row.nombre,
            categoria: row.categoria,
            tiempo_preparacion_general: Number(row.tiempo_preparacion_general || 0),
            tiempo_por_estacion: Number(row.tiempo_por_estacion || 0),
            tiempo_fijo_min: Number(row.tiempo_fijo_min || 0),
            velocidad_produccion: Number(row.velocidad_produccion || 0),
            unidad_trabajo: row.unidad_trabajo || '',
            costo_hora_maquina: Number(row.costo_hora_maquina || 0),
            costo_hora_operario: Number(row.costo_hora_operario || 0),
            costo_fijo: Number(row.costo_fijo || 0),
            costo_x_msi: Number(row.costo_x_msi || 0),
            costo_x_kg: Number(row.costo_x_kg || 0),
            costo_x_pie: Number(row.costo_x_pie || 0),
            costo_x_millar: Number(row.costo_x_millar || 0),
            cantidad_personas: Number(row.cantidad_personas || 1),
            es_inline: Boolean(row.es_inline),
            comparte_tiempo_linea: Boolean(row.comparte_tiempo_linea),
            comparte_operario: Boolean(row.comparte_operario),
            activo: row.activo !== false
        }))
    };
}
app.get('/api/socios', async (req, res) => {
    try {
        const search = String(req.query.q || '').trim();
        const rawLimit = String(req.query.limit || '').trim().toLowerCase();
        const hasLimit = rawLimit !== 'all';
        const limit = hasLimit ? Math.min(Math.max(Number(req.query.limit) || 50, 1), 2000) : 0;
        const values = [];
        let whereClause = '';

        if (search) {
            values.push(`%${search}%`);
            values.push(`%${search}%`);
            whereClause = 'WHERE partner_code ILIKE $1 OR partner_name ILIKE $2';
        }

        const limitClause = hasLimit ? `LIMIT $${values.length + 1}` : '';
        if (hasLimit) values.push(limit);

        const result = await pgQuery(
            `SELECT
                partner_code,
                prospect_code,
                partner_name,
                salesperson_name,
                tax_id,
                email,
                email_facturacion,
                currency_code,
                payment_terms,
                sector,
                sub_sector,
                is_tax_exempt,
                allowed_percentage,
                client_type,
                creation_date
             FROM business_partners
             ${whereClause}
             ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
             ${limitClause}`,
            values
        );

        res.json({ socios: result.rows, total: result.rows.length });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los socios.' });
    }
});

app.post('/api/socios', async (req, res) => {
    try {
        const config = await loadGeneralConfig();
        const payload = {
            partner_name: String(req.body?.partner_name || '').trim(),
            tax_id: String(req.body?.tax_id || '').trim(),
            email_facturacion: String(req.body?.email_facturacion || '').trim(),
            currency_code: sanitizePartnerCodePrefix(String(req.body?.currency_code || 'USD')).slice(0, 10) || 'USD',
            payment_terms: String(req.body?.payment_terms || 'Contado').trim() || 'Contado',
            contact_name: String(req.body?.contact_name || '').trim(),
            contact_identification: String(req.body?.contact_identification || '').trim(),
            contact_mobile: String(req.body?.contact_mobile || '').trim(),
            contact_email: String(req.body?.contact_email || '').trim(),
            contact_phone: String(req.body?.contact_phone || '').trim(),
            address_country: String(req.body?.address_country || '').trim(),
            address_state_province: String(req.body?.address_state_province || '').trim(),
            address_county: String(req.body?.address_county || '').trim(),
            address_line: String(req.body?.address_line || '').trim()
        };

        if (!payload.partner_name || !payload.tax_id || !payload.email_facturacion || !payload.contact_name) {
            return res.status(400).json({ error: 'Debes completar nombre del socio, identificación fiscal, correo de facturación y nombre del contacto principal.' });
        }

        const duplicate = await withTransaction(async (client) => {
            const existing = await findExistingPartnerDuplicate(client, {
                partnerName: payload.partner_name,
                taxId: payload.tax_id
            });
            if (existing) {
                return { duplicate: existing };
            }

            const partnerCode = await generateNextPartnerCode(client, config?.general?.partnerCodePrefix || 'CL');
            const contactNameParts = splitContactName(payload.contact_name);
            const rawData = buildNewPartnerRawData(payload, partnerCode);

            await client.query(
                `INSERT INTO business_partners (
                    partner_code,
                    partner_name,
                    salesperson_name,
                    tax_id,
                    email,
                    email_facturacion,
                    currency_code,
                    payment_terms,
                    sector,
                    sub_sector,
                    is_tax_exempt,
                    allowed_percentage,
                    client_type,
                    creation_date,
                    raw_data,
                    updated_at
                ) VALUES (
                    $1, $2, '', $3, $4, $5, $6, $7, '', '', false, NULL, '', CURRENT_DATE, $8::jsonb, NOW()
                )`,
                [
                    partnerCode,
                    payload.partner_name,
                    payload.tax_id,
                    payload.contact_email,
                    payload.email_facturacion,
                    payload.currency_code,
                    payload.payment_terms,
                    JSON.stringify(rawData)
                ]
            );

            await client.query(
                `INSERT INTO business_partner_contacts (
                    partner_code,
                    contact_name,
                    first_name,
                    last_name,
                    email,
                    phone,
                    mobile,
                    fax,
                    position,
                    is_legal_representative,
                    country,
                    state_province,
                    county,
                    raw_data
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, '', 'Principal', false, $8, $9, $10, $11::jsonb
                )`,
                [
                    partnerCode,
                    payload.contact_name,
                    contactNameParts.firstName,
                    contactNameParts.lastName,
                    payload.contact_email,
                    payload.contact_phone,
                    payload.contact_mobile,
                    payload.address_country,
                    payload.address_state_province,
                    payload.address_county,
                    JSON.stringify({
                        IDENTIFICACION: payload.contact_identification,
                        ADDRESS: payload.address_line
                    })
                ]
            );

            await client.query(
                `INSERT INTO business_partner_addresses (
                    partner_code,
                    address_name,
                    address_type,
                    country,
                    state_province,
                    county,
                    district,
                    address_line,
                    zip_code,
                    raw_data
                ) VALUES (
                    $1, 'Principal', 'Facturación', $2, $3, $4, '', $5, '', $6::jsonb
                )`,
                [
                    partnerCode,
                    payload.address_country,
                    payload.address_state_province,
                    payload.address_county,
                    payload.address_line,
                    JSON.stringify({ ADDRESS: payload.address_line })
                ]
            );

            return { partnerCode };
        });

        if (duplicate?.duplicate) {
            return res.status(409).json({
                error: `Ya existe el socio ${duplicate.duplicate.partner_code} - ${duplicate.duplicate.partner_name}.`,
                existing: duplicate.duplicate
            });
        }

        const created = await pgQuery(
            `SELECT
                partner_code,
                partner_name,
                tax_id,
                email,
                email_facturacion,
                currency_code,
                payment_terms,
                creation_date
             FROM business_partners
             WHERE partner_code = $1
             LIMIT 1`,
            [duplicate.partnerCode]
        );

        res.status(201).json({
            socio: created.rows[0] || { partner_code: duplicate.partnerCode, partner_name: payload.partner_name },
            message: 'Socio creado correctamente.'
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible crear el socio.' });
    }
});

app.post('/api/socios/importar-sap', async (req, res) => {
    try {
        const summary = await importSociosFromSap({ limit: req.body?.limit });
        res.json({
            ok: true,
            summary,
            message: `Importación completada. ${summary.inserted} socios nuevos cargados.`
        });
    } catch (error) {
        res.status(400).json({
            ok: false,
            error: error.message || 'No fue posible importar socios desde SAP.'
        });
    }
});

app.post('/api/socios/importar-sap/diagnostico', async (req, res) => {
    try {
        const diagnosis = await diagnoseSociosImportFromSap();
        res.json({ ok: true, summary: diagnosis.summary });
    } catch (error) {
        res.status(400).json({
            ok: false,
            error: error.message || 'No fue posible diagnosticar la importación de socios desde SAP.'
        });
    }
});

app.delete('/api/socios/:codigo', async (req, res) => {
    try {
        const codigo = String(req.params.codigo || '').trim();
        if (!codigo) {
            return res.status(400).json({ error: 'Codigo de socio invalido.' });
        }

        const deleted = await withTransaction(async (client) => {
            const existing = await client.query(
                `SELECT partner_code, partner_name
                 FROM business_partners
                 WHERE partner_code = $1
                 LIMIT 1`,
                [codigo]
            );
            if (!existing.rows.length) {
                return null;
            }

            await client.query(`DELETE FROM business_partner_contacts WHERE partner_code = $1`, [codigo]);
            await client.query(`DELETE FROM business_partner_addresses WHERE partner_code = $1`, [codigo]);
            await client.query(`DELETE FROM business_partners WHERE partner_code = $1`, [codigo]);

            return existing.rows[0];
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Socio no encontrado.' });
        }

        res.json({
            ok: true,
            socio: deleted,
            message: `Socio ${deleted.partner_code} eliminado correctamente.`
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible eliminar el socio.' });
    }
});

app.post('/api/socios/prune', async (req, res) => {
    try {
        const keepCount = Math.max(1, Math.min(Number(req.body?.keepCount) || 0, 500));
        if (!Number.isFinite(keepCount) || keepCount <= 0) {
            return res.status(400).json({ error: 'Debes indicar cuántos socios deseas conservar.' });
        }

        const summary = await withTransaction(async (client) => {
            const totalResult = await client.query(`SELECT COUNT(*)::int AS total FROM business_partners`);
            const totalBefore = Number(totalResult.rows[0]?.total || 0);

            const keepResult = await client.query(
                `SELECT partner_code, partner_name
                   FROM business_partners
                  ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                  LIMIT $1`,
                [keepCount]
            );
            const keepRows = keepResult.rows || [];
            const keepCodes = keepRows.map((row) => row.partner_code).filter(Boolean);

            if (!keepCodes.length && totalBefore > 0) {
                throw new Error('No fue posible determinar los socios a conservar.');
            }

            let deletedContacts = 0;
            let deletedAddresses = 0;
            let deletedPartners = 0;

            if (totalBefore > keepCodes.length) {
                const contactDelete = await client.query(
                    `DELETE FROM business_partner_contacts
                      WHERE partner_code NOT IN (
                        SELECT partner_code
                          FROM business_partners
                         ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                         LIMIT $1
                      )`,
                    [keepCodes.length]
                );
                deletedContacts = Number(contactDelete.rowCount || 0);

                const addressDelete = await client.query(
                    `DELETE FROM business_partner_addresses
                      WHERE partner_code NOT IN (
                        SELECT partner_code
                          FROM business_partners
                         ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                         LIMIT $1
                      )`,
                    [keepCodes.length]
                );
                deletedAddresses = Number(addressDelete.rowCount || 0);

                const partnerDelete = await client.query(
                    `DELETE FROM business_partners
                      WHERE partner_code NOT IN (
                        SELECT partner_code
                          FROM business_partners
                         ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                         LIMIT $1
                      )`,
                    [keepCodes.length]
                );
                deletedPartners = Number(partnerDelete.rowCount || 0);
            }

            return {
                ok: true,
                totalBefore,
                kept: keepRows.length,
                deleted: deletedPartners,
                deletedContacts,
                deletedAddresses,
                keepCountRequested: keepCount,
                keptPartners: keepRows
            };
        });

        res.json({
            ...summary,
            message: `Se conservaron ${summary.kept} socios y se eliminaron ${summary.deleted}.`
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible depurar los socios.' });
    }
});

app.post('/api/testing/external-data-admin', async (req, res) => {
    try {
        const target = String(req.body?.target || '').trim().toLowerCase();
        const mode = String(req.body?.mode || '').trim().toLowerCase();
        const keepCount = Math.max(1, Math.min(Number(req.body?.keepCount) || 0, 5000));

        if (!['socios', 'materiales'].includes(target)) {
            return res.status(400).json({ error: 'Debes indicar si deseas administrar socios o materiales.' });
        }

        if (!['keep', 'delete_sap'].includes(mode)) {
            return res.status(400).json({ error: 'Debes indicar una acción válida para la depuración.' });
        }

        if (mode === 'keep' && (!Number.isFinite(keepCount) || keepCount <= 0)) {
            return res.status(400).json({ error: 'Debes indicar cuántos registros deseas conservar.' });
        }

        const summary = await withTransaction(async (client) => {
            if (target === 'socios') {
                if (mode === 'keep') {
                    const totalResult = await client.query(`SELECT COUNT(*)::int AS total FROM business_partners`);
                    const totalBefore = Number(totalResult.rows[0]?.total || 0);

                    const keepResult = await client.query(
                        `SELECT partner_code, partner_name
                           FROM business_partners
                          ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                          LIMIT $1`,
                        [keepCount]
                    );
                    const keepRows = keepResult.rows || [];
                    const effectiveKeepCount = keepRows.length;

                    if (!effectiveKeepCount && totalBefore > 0) {
                        throw new Error('No fue posible determinar los socios a conservar.');
                    }

                    let deletedContacts = 0;
                    let deletedAddresses = 0;
                    let deletedRecords = 0;

                    if (totalBefore > effectiveKeepCount) {
                        const contactDelete = await client.query(
                            `DELETE FROM business_partner_contacts
                              WHERE partner_code NOT IN (
                                SELECT partner_code
                                  FROM business_partners
                                 ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                                 LIMIT $1
                              )`,
                            [effectiveKeepCount]
                        );
                        deletedContacts = Number(contactDelete.rowCount || 0);

                        const addressDelete = await client.query(
                            `DELETE FROM business_partner_addresses
                              WHERE partner_code NOT IN (
                                SELECT partner_code
                                  FROM business_partners
                                 ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                                 LIMIT $1
                              )`,
                            [effectiveKeepCount]
                        );
                        deletedAddresses = Number(addressDelete.rowCount || 0);

                        const partnerDelete = await client.query(
                            `DELETE FROM business_partners
                              WHERE partner_code NOT IN (
                                SELECT partner_code
                                  FROM business_partners
                                 ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                                 LIMIT $1
                              )`,
                            [effectiveKeepCount]
                        );
                        deletedRecords = Number(partnerDelete.rowCount || 0);
                    }

                    return {
                        ok: true,
                        target,
                        mode,
                        totalBefore,
                        kept: effectiveKeepCount,
                        deleted: deletedRecords,
                        deletedContacts,
                        deletedAddresses,
                        message: `Se conservaron ${effectiveKeepCount} socios y se eliminaron ${deletedRecords}.`
                    };
                }

                const importedPartners = await client.query(
                    `SELECT partner_code
                       FROM business_partners
                      WHERE COALESCE(raw_data->>'source', '') IN ('sap_service_layer', 'sap')`
                );
                const importedCodes = importedPartners.rows.map((row) => row.partner_code).filter(Boolean);

                if (!importedCodes.length) {
                    return {
                        ok: true,
                        target,
                        mode,
                        totalBefore: 0,
                        deleted: 0,
                        deletedContacts: 0,
                        deletedAddresses: 0,
                        message: 'No se encontraron socios importados desde SAP para eliminar.'
                    };
                }

                const contactDelete = await client.query(
                    `DELETE FROM business_partner_contacts
                      WHERE partner_code IN (
                        SELECT partner_code
                          FROM business_partners
                         WHERE COALESCE(raw_data->>'source', '') IN ('sap_service_layer', 'sap')
                      )`
                );
                const addressDelete = await client.query(
                    `DELETE FROM business_partner_addresses
                      WHERE partner_code IN (
                        SELECT partner_code
                          FROM business_partners
                         WHERE COALESCE(raw_data->>'source', '') IN ('sap_service_layer', 'sap')
                      )`
                );
                const partnerDelete = await client.query(
                    `DELETE FROM business_partners
                      WHERE COALESCE(raw_data->>'source', '') IN ('sap_service_layer', 'sap')`
                );

                return {
                    ok: true,
                    target,
                    mode,
                    totalBefore: importedCodes.length,
                    deleted: Number(partnerDelete.rowCount || 0),
                    deletedContacts: Number(contactDelete.rowCount || 0),
                    deletedAddresses: Number(addressDelete.rowCount || 0),
                    message: `Se eliminaron ${Number(partnerDelete.rowCount || 0)} socios importados desde SAP.`
                };
            }

            if (mode === 'keep') {
                const totalResult = await client.query(`SELECT COUNT(*)::int AS total FROM material`);
                const totalBefore = Number(totalResult.rows[0]?.total || 0);

                const keepResult = await client.query(
                    `SELECT codigo, nombre
                       FROM material
                      ORDER BY nombre NULLS LAST, codigo NULLS LAST
                      LIMIT $1`,
                    [keepCount]
                );
                const keepRows = keepResult.rows || [];
                const effectiveKeepCount = keepRows.length;

                if (!effectiveKeepCount && totalBefore > 0) {
                    throw new Error('No fue posible determinar los materiales a conservar.');
                }

                let deletedRecords = 0;
                if (totalBefore > effectiveKeepCount) {
                    const materialDelete = await client.query(
                        `DELETE FROM material
                          WHERE codigo NOT IN (
                            SELECT codigo
                              FROM material
                             ORDER BY nombre NULLS LAST, codigo NULLS LAST
                             LIMIT $1
                          )`,
                        [effectiveKeepCount]
                    );
                    deletedRecords = Number(materialDelete.rowCount || 0);
                }

                return {
                    ok: true,
                    target,
                    mode,
                    totalBefore,
                    kept: effectiveKeepCount,
                    deleted: deletedRecords,
                    message: `Se conservaron ${effectiveKeepCount} materiales y se eliminaron ${deletedRecords}.`
                };
            }

            const importedResult = await client.query(
                `SELECT COUNT(*)::int AS total
                   FROM material
                  WHERE COALESCE(comentario_tipo_proforma, '') ILIKE '%Importado desde SAP%'`
            );
            const totalImported = Number(importedResult.rows[0]?.total || 0);

            if (!totalImported) {
                return {
                    ok: true,
                    target,
                    mode,
                    totalBefore: 0,
                    deleted: 0,
                    message: 'No se encontraron materiales importados desde SAP para eliminar.'
                };
            }

            const materialDelete = await client.query(
                `DELETE FROM material
                  WHERE COALESCE(comentario_tipo_proforma, '') ILIKE '%Importado desde SAP%'`
            );

            return {
                ok: true,
                target,
                mode,
                totalBefore: totalImported,
                deleted: Number(materialDelete.rowCount || 0),
                message: `Se eliminaron ${Number(materialDelete.rowCount || 0)} materiales importados desde SAP.`
            };
        });

        res.json(summary);
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible administrar los datos de conexiones externas.' });
    }
});

app.get('/api/socios/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const partner = await pgQuery(
            `SELECT
                partner_code, prospect_code, partner_name, salesperson_name, tax_id, email,
                email_facturacion, currency_code, payment_terms, sector, sub_sector,
                is_tax_exempt, allowed_percentage, client_type, creation_date, raw_data
             FROM business_partners
             WHERE partner_code = $1`,
            [codigo]
        );

        if (!partner.rows.length) {
            return res.status(404).json({ error: 'Socio no encontrado.' });
        }

        const contacts = await pgQuery(
            `SELECT id, partner_code, contact_name, first_name, last_name, email, phone, mobile, fax,
                    position, is_legal_representative, country, state_province, county, raw_data
             FROM business_partner_contacts
             WHERE partner_code = $1
             ORDER BY contact_name NULLS LAST, first_name NULLS LAST`,
            [codigo]
        );

        const addresses = await pgQuery(
            `SELECT id, partner_code, address_name, address_type, country, state_province, county,
                    district, address_line, zip_code, raw_data
             FROM business_partner_addresses
             WHERE partner_code = $1
             ORDER BY address_name NULLS LAST`,
            [codigo]
        );

        const addressRows = addresses.rows.length ? addresses.rows : buildSyntheticAddressFromPartner(partner.rows[0]);
        res.json({
            socio: partner.rows[0],
            contactos: contacts.rows,
            direcciones: addressRows
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el socio.' });
    }
});

app.get('/api/socios/:codigo/contactos', async (req, res) => {
    try {
        const result = await pgQuery(
            `SELECT id, partner_code, contact_name, first_name, last_name, email, phone, mobile, fax,
                    position, is_legal_representative, country, state_province, county, raw_data
             FROM business_partner_contacts
             WHERE partner_code = $1
             ORDER BY contact_name NULLS LAST, first_name NULLS LAST`,
            [req.params.codigo]
        );

        res.json({ contactos: result.rows, total: result.rows.length });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los contactos del socio.' });
    }
});

app.get('/api/socios/:codigo/direcciones', async (req, res) => {
    try {
        const result = await pgQuery(
            `SELECT id, partner_code, address_name, address_type, country, state_province, county,
                    district, address_line, zip_code, raw_data
             FROM business_partner_addresses
             WHERE partner_code = $1
             ORDER BY address_name NULLS LAST`,
            [req.params.codigo]
        );

        const partner = await pgQuery(`SELECT partner_code, partner_name, raw_data FROM business_partners WHERE partner_code = $1`, [req.params.codigo]);
        const addressRows = result.rows.length ? result.rows : (partner.rows.length ? buildSyntheticAddressFromPartner(partner.rows[0]) : []);
        res.json({ direcciones: addressRows, total: addressRows.length });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar las direcciones del socio.' });
    }
});

app.get('/api/cotizaciones', async (req, res) => {
    try {
        const search = String(req.query.q || '').trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
        const session = readErpSessionFromRequest(req);
        const permissionName = sanitizeAdminUserText(session?.permissionName);
        const canViewAll = permissionCanViewAllQuotes(permissionName);

        let salespersonName = '';
        if (!canViewAll) {
            salespersonName = sanitizeAdminUserText(
                session?.name || session?.fullName || session?.user || session?.username
            );
            // Si el nombre parece un username (sin espacios), buscar el full_name
            if (salespersonName && !salespersonName.includes(' ')) {
                try {
                    const userLookup = await pgQuery(
                        `SELECT full_name FROM admin_users WHERE LOWER(TRIM(username)) = $1 LIMIT 1`,
                        [salespersonName.toLowerCase()]
                    );
                    if (userLookup.rows.length && sanitizeAdminUserText(userLookup.rows[0].full_name)) {
                        salespersonName = sanitizeAdminUserText(userLookup.rows[0].full_name);
                    }
                } catch (_) {}
            }
        }

        const values = [];
        const conditions = [];

        if (search) {
            const idx = values.length + 1;
            values.push(`%${search}%`);
            conditions.push(`(q.quote_code ILIKE $${idx} OR COALESCE(q.customer_name, '') ILIKE $${idx} OR COALESCE(q.salesperson_name, '') ILIKE $${idx} OR COALESCE(q.customer_code, '') ILIKE $${idx} OR COALESCE(q.contact_name, '') ILIKE $${idx})`);
        }

        if (salespersonName) {
            const idx = values.length + 1;
            values.push(salespersonName);
            conditions.push(`q.salesperson_name = $${idx}`);
        }

        const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

        const qIndex = values.push(limit);

        const quoteResult = await pgQuery(
            `SELECT
                q.quote_code,
                q.customer_code,
                q.customer_name,
                q.contact_name,
                q.email,
                q.salesperson_name,
                q.phone,
                q.status,
                q.created_on,
                q.due_on,
                COALESCE(calc.line_count, 0) AS line_count,
                COALESCE(calc.quote_total, 0) AS quote_total,
                COALESCE(calc.line_statuses, '') AS line_statuses
             FROM quotes q
             LEFT JOIN LATERAL (
                SELECT
                    COUNT(*) AS line_count,
                    COALESCE(SUM(
                        COALESCE(
                            latest.total_cost,
                            CASE
                                WHEN latest.unit_price IS NOT NULL AND latest.quantity IS NOT NULL
                                    THEN latest.unit_price * latest.quantity
                                ELSE NULL
                            END,
                            0
                        )
                    ), 0) AS quote_total,
                    STRING_AGG(DISTINCT NULLIF(COALESCE(
                        latest.raw_data->>'SOLICITUD ESTADO',
                        latest.raw_data->>'ESTADO LINEA',
                        latest.raw_data->>'Estado Cotizacion'
                    ), ''), ' | ') AS line_statuses
                FROM (
                    SELECT DISTINCT ON (fc.line_code)
                        fc.line_code,
                        fc.total_cost,
                        fc.unit_price,
                        fc.quantity,
                        fc.raw_data,
                        fc.created_at,
                        fc.calculation_code
                    FROM flexo_calculations fc
                    WHERE fc.quote_code = q.quote_code
                      AND ${quoteOwnedCalculationPredicate('fc', 'q')}
                    ORDER BY
                        fc.line_code NULLS LAST,
                        fc.created_at DESC NULLS LAST,
                        fc.calculation_code DESC NULLS LAST
                ) latest
             ) calc ON true
             ${whereClause}
             ORDER BY q.quote_code DESC
             LIMIT $${qIndex}`,
            values
        );

        const quoteMap = new Map();
        for (const row of quoteResult.rows) {
            quoteMap.set(row.quote_code, {
                quote_code: row.quote_code,
                customer_code: row.customer_code || '',
                customer_name: row.customer_name || '',
                contact_name: row.contact_name || '',
                email: row.email || '',
                salesperson_name: row.salesperson_name || '',
                phone: row.phone || '',
                status: row.status || '',
                created_on: row.created_on || '',
                due_on: row.due_on || '',
                line_count: Number(row.line_count || 0),
                quote_total: Number(row.quote_total || 0),
                line_statuses: row.line_statuses || '',
                exchange_sale: null,
                exchange_buy: null,
                footer_dates: '',
                footer_exchange: '',
                payment_terms: '',
                delivery_time: '',
                line_source: 'quotes'
            });
        }

        let items = Array.from(quoteMap.values()).sort((a, b) => String(b.quote_code).localeCompare(String(a.quote_code)));
        if (search) {
            const term = search.toLowerCase();
            items = items.filter((item) => [item.quote_code, item.customer_code, item.customer_name, item.contact_name, item.salesperson_name].join(' ').toLowerCase().includes(term));
        }

        res.json({ cotizaciones: items.slice(0, limit), total: items.length });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar las cotizaciones.' });
    }
});

app.get('/api/cotizaciones/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const quoteResult = await pgQuery(
            `SELECT quote_code, customer_code, customer_name, contact_name, email, salesperson_name, phone, status, created_on, due_on, raw_data
             FROM quotes
             WHERE quote_code = $1`,
            [codigo]
        );

        const calcResult = await pgQuery(
            `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                    quantity, subtotal_cost, total_cost, unit_price, raw_data
               FROM (
                    SELECT DISTINCT ON (line_code)
                           fc.calculation_code, fc.quote_code, fc.line_code, fc.product_code, fc.customer_code, fc.process_type, fc.machine_name, fc.die_code, fc.material_code,
                           fc.quantity, fc.subtotal_cost, fc.total_cost, fc.unit_price, fc.raw_data, fc.created_at
                      FROM flexo_calculations fc
                      LEFT JOIN quotes q ON q.quote_code = fc.quote_code
                     WHERE fc.quote_code = $1
                       AND ${quoteOwnedCalculationPredicate('fc', 'q')}
                     ORDER BY fc.line_code NULLS LAST, fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
               ) latest_lines
              ORDER BY
                    CASE
                        WHEN COALESCE(latest_lines.raw_data->>'Orden_Linea', '') ~ '^[0-9]+$'
                            THEN (latest_lines.raw_data->>'Orden_Linea')::integer
                        ELSE NULL
                    END NULLS LAST,
                    line_code NULLS LAST`,
            [codigo]
        );

        if (!quoteResult.rows.length && !calcResult.rows.length) {
            return res.status(404).json({ error: 'Cotización no encontrada.' });
        }

        const quote = quoteResult.rows.length
            ? mapQuoteHeader(quoteResult.rows[0])
            : {
                quote_code: codigo,
                customer_code: pickFirstValue(calcResult.rows[0]?.raw_data?.['ID CLIENTE']),
                customer_name: pickFirstValue(calcResult.rows[0]?.raw_data?.CLIENTE),
                contact_name: '',
                email: '',
                salesperson_name: pickFirstValue(calcResult.rows[0]?.raw_data?.VENDEDOR),
                phone: '',
                status: pickFirstValue(calcResult.rows[0]?.raw_data?.['SOLICITUD ESTADO'], calcResult.rows[0]?.raw_data?.['ESTADO LINEA'], 'Activa'),
                created_on: pickFirstValue(calcResult.rows[0]?.raw_data?.['FECHA CREACION']),
                due_on: pickFirstValue(calcResult.rows[0]?.raw_data?.['FECHA VENCIMIENTO']),
                exchange_sale: pickFirstValue(calcResult.rows[0]?.raw_data?.['TIPO CAMBIO']),
                exchange_buy: pickFirstValue(calcResult.rows[0]?.raw_data?.['TIPO CAMBIO']),
                footer_dates: '',
                footer_exchange: '',
                payment_terms: '',
                delivery_time: '',
                raw_data: calcResult.rows[0]?.raw_data || {}
            };

        const lineMap = new Map();
        for (const row of calcResult.rows) {
            const mapped = mapCalculationLine(row);
            const key = mapped.line_code || row.calculation_code || `${codigo}-${lineMap.size + 1}`;
            if (!lineMap.has(key)) {
                lineMap.set(key, mapped);
            }
        }

        const lines = Array.from(lineMap.values());
        const totals = lines.reduce((acc, line) => {
            const subtotal = Number(line.subtotal_1 || 0);
            acc.subtotal1 += subtotal;
            return acc;
        }, { subtotal1: 0 });

        res.json({
            cotizacion: quote,
            lineas: lines,
            resumen: {
                compra: quote.exchange_buy,
                venta: quote.exchange_sale,
                subtotal1: Math.round((totals.subtotal1 + Number.EPSILON) * 100) / 100
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar la cotización.' });
    }
});

app.delete('/api/cotizaciones/:codigo', async (req, res) => {
    try {
        const codigo = String(req.params.codigo || '').trim();
        if (!codigo) {
            return res.status(400).json({ error: 'Codigo de cotizacion invalido.' });
        }
        const deleted = await withTransaction(async (client) => {
            const orderResult = await client.query(`DELETE FROM flexo_orders WHERE quote_code = $1`, [codigo]);
            const attachmentResult = await client.query(`DELETE FROM quote_line_attachments WHERE quote_code = $1 RETURNING storage_path`, [codigo]);
            await client.query(`DELETE FROM quote_line_notifications WHERE quote_code = $1`, [codigo]);
            const calcResult = await client.query(`DELETE FROM flexo_calculations WHERE quote_code = $1`, [codigo]);
            const proformaResult = await client.query(`DELETE FROM quote_proformas WHERE quote_code = $1`, [codigo]);
            const quoteResult = await client.query(`DELETE FROM quotes WHERE quote_code = $1`, [codigo]);

            if (!quoteResult.rowCount && !calcResult.rowCount && !proformaResult.rowCount) {
                const error = new Error('Cotizacion no encontrada.');
                error.statusCode = 404;
                throw error;
            }

            return {
                quoteCode: codigo,
                deletedOrders: orderResult.rowCount,
                deletedQuote: quoteResult.rowCount,
                deletedLines: calcResult.rowCount,
                deletedProformas: proformaResult.rowCount,
                deletedAttachmentFiles: attachmentResult.rows
            };
        });
        deleteQuoteAttachmentFiles(deleted.deletedAttachmentFiles);
        delete deleted.deletedAttachmentFiles;
        res.json({ ok: true, ...deleted });
    } catch (error) {
        const status = Number(error.statusCode) || (/no se puede eliminar/i.test(error.message || '') ? 409 : /no encontrada/i.test(error.message || '') ? 404 : 400);
        res.status(status).json({ error: error.message || 'No fue posible eliminar la cotizacion.' });
    }
});

app.get('/api/productos', async (req, res) => {
    try {
        const search = String(req.query.q || '').trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
        const values = [];
        const filters = [];

        if (search) {
            values.push(`%${search}%`);
            filters.push(`(
                p.product_code ILIKE $${values.length}
                OR COALESCE(p.product_name, '') ILIKE $${values.length}
                OR COALESCE(p.client_name, '') ILIKE $${values.length}
                OR COALESCE(p.client_code, '') ILIKE $${values.length}
                OR COALESCE(p.material_name, '') ILIKE $${values.length}
                OR COALESCE(p.quote_code, '') ILIKE $${values.length}
            )`);
        }

        values.push(limit);
        const result = await pgQuery(
            `SELECT p.*,
                    COALESCE(history.quote_count, 0) AS quote_count,
                    history.last_quoted_at
               FROM flexo_products p
          LEFT JOIN (
                    SELECT product_code,
                           COUNT(DISTINCT quote_code)::int AS quote_count,
                           MAX(created_at) AS last_quoted_at
                      FROM flexo_product_quote_history
                     GROUP BY product_code
               ) history ON history.product_code = p.product_code
              ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
              ORDER BY p.updated_at DESC NULLS LAST, p.created_at DESC NULLS LAST, p.product_code DESC
              LIMIT $${values.length}`,
            values
        );
        res.json({ productos: result.rows.map(mapProductCatalogRow), total: result.rows.length });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar productos.' });
    }
});

app.get('/api/productos/:codigo', async (req, res) => {
    try {
        const code = String(req.params.codigo || '').trim();
        const productResult = await pgQuery(
            `SELECT p.*,
                    COALESCE(history.quote_count, 0) AS quote_count,
                    history.last_quoted_at
               FROM flexo_products p
          LEFT JOIN (
                    SELECT product_code,
                           COUNT(DISTINCT quote_code)::int AS quote_count,
                           MAX(created_at) AS last_quoted_at
                      FROM flexo_product_quote_history
                     GROUP BY product_code
               ) history ON history.product_code = p.product_code
              WHERE p.product_code = $1
              LIMIT 1`,
            [code]
        );
        if (!productResult.rows.length) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        const historyResult = await pgQuery(
            `SELECT h.product_code, h.quote_code, h.line_code, h.action, h.created_by, h.created_at,
                    q.customer_code, q.customer_name, q.salesperson_name, q.status, q.created_on,
                    fc.product_code AS quoted_product_code,
                    fc.total_cost,
                    fc.unit_price,
                    fc.raw_data AS line_raw_data
               FROM flexo_product_quote_history h
          LEFT JOIN quotes q ON q.quote_code = h.quote_code
          LEFT JOIN LATERAL (
                    SELECT product_code, total_cost, unit_price, raw_data
                      FROM flexo_calculations fc
                     WHERE fc.quote_code = h.quote_code
                       AND fc.line_code = h.line_code
                     ORDER BY fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
                     LIMIT 1
               ) fc ON TRUE
              WHERE h.product_code = $1
              ORDER BY h.created_at DESC NULLS LAST`,
            [code]
        );
        const storedAttachmentsResult = await pgQuery(
            `SELECT a.id, a.quote_code, a.line_code, a.file_name, a.mime_type, a.file_ext, a.notes, a.uploaded_by, a.created_at,
                    q.customer_name,
                    COALESCE(a.size_bytes, OCTET_LENGTH(DECODE(a.content_base64, 'base64')), 0) AS size_bytes
               FROM quote_line_attachments a
               JOIN flexo_product_quote_history h
                 ON h.quote_code = a.quote_code
                AND h.line_code = a.line_code
          LEFT JOIN quotes q
                 ON q.quote_code = a.quote_code
              WHERE h.product_code = $1
              ORDER BY a.created_at DESC NULLS LAST, a.id DESC`,
            [code]
        );
        const ordersResult = await pgQuery(
            `SELECT DISTINCT ON (o.order_code)
                    o.order_code, o.quote_code, o.line_code, o.product_code, o.machine_name, o.material_code,
                    o.die_code, o.ordered_quantity, o.delivered_on, o.created_at, o.raw_data
               FROM flexo_orders o
          LEFT JOIN flexo_product_quote_history h
                 ON h.quote_code = o.quote_code
                AND h.line_code = o.line_code
              WHERE o.product_code = $1
                 OR h.product_code = $1
                 OR COALESCE(o.raw_data->'line_summary'->>'product_code', '') = $1
              ORDER BY o.order_code, o.created_at DESC NULLS LAST`,
            [code]
        );
        const inlineAttachments = [];
        historyResult.rows.forEach((row) => {
            extractLineAttachments({ raw_data: row.line_raw_data || {} }).forEach((attachment, index) => {
                inlineAttachments.push({
                    id: null,
                    quote_code: row.quote_code,
                    line_code: row.line_code || '',
                    file_name: attachment.label || attachment.key || `Adjunto ${index + 1}`,
                    mime_type: '',
                    file_ext: '',
                    notes: '',
                    uploaded_by: row.salesperson_name || row.created_by || '',
                    created_at: row.created_at || row.created_on || '',
                    customer_name: row.customer_name || '',
                    size_bytes: 0,
                    url: attachment.isUrl ? attachment.value : '',
                    value: attachment.value || '',
                    is_stored: false
                });
            });
        });
        res.json({
            producto: mapProductCatalogRow(productResult.rows[0]),
            historial: historyResult.rows.map((row) => ({
                product_code: row.product_code,
                quote_code: row.quote_code,
                line_code: row.line_code || '',
                action: row.action || 'quote',
                customer_code: row.customer_code || '',
                customer_name: row.customer_name || '',
                salesperson_name: row.salesperson_name || '',
                status: row.status || '',
                created_on: row.created_on || '',
                created_at: row.created_at || '',
                total_cost: parseLegacyNumber(row.total_cost),
                unit_price: parseLegacyNumber(row.unit_price),
                job_name: getProductNameFromRaw(row.line_raw_data || {}, row.quoted_product_code || row.line_code || '')
            })),
            attachments: [
                ...storedAttachmentsResult.rows.map((row) => ({
                    id: Number(row.id || 0),
                    quote_code: row.quote_code || '',
                    line_code: row.line_code || '',
                    file_name: row.file_name || '',
                    mime_type: row.mime_type || '',
                    file_ext: row.file_ext || '',
                    notes: row.notes || '',
                    uploaded_by: row.uploaded_by || '',
                    created_at: row.created_at || '',
                    customer_name: row.customer_name || '',
                    size_bytes: Number(row.size_bytes || 0),
                    download_url: row.id ? `/api/adjuntos/${row.id}/download` : '',
                    is_stored: true
                })),
                ...inlineAttachments
            ].sort((left, right) => {
                const leftTime = new Date(left.created_at || 0).getTime();
                const rightTime = new Date(right.created_at || 0).getTime();
                return rightTime - leftTime;
            }),
            ordenes: ordersResult.rows.map((row) => {
                const raw = row.raw_data || {};
                return {
                    order_code: row.order_code || '',
                    quote_code: row.quote_code || '',
                    line_code: row.line_code || '',
                    product_code: row.product_code || '',
                    machine_name: row.machine_name || '',
                    material_code: row.material_code || '',
                    die_code: row.die_code || '',
                    ordered_quantity: parseLegacyNumber(row.ordered_quantity),
                    delivered_on: row.delivered_on || '',
                    created_at: row.created_at || '',
                    job_name: pickFirstValue(
                        raw.line_summary?.job_name,
                        raw.line_snapshot?.job_name,
                        raw.line_snapshot?.productName,
                        row.product_code
                    )
                };
            })
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el producto.' });
    }
});

app.post('/api/cotizaciones/:codigo/lineas/:linea/producto', async (req, res) => {
    try {
        if (!canRequestCreateModule(req, 'productos')) {
            return res.status(403).json({ error: 'No tienes permiso para crear productos.' });
        }
        const { codigo, linea } = req.params;
        const result = await withTransaction(async (client) => {
            const context = await getQuoteLineContext(codigo, linea, client);
            if (!context.quote || !context.line) {
                throw new Error('No se encontró la línea para convertirla en producto.');
            }

            const existing = await client.query(
                `SELECT product_code
                   FROM flexo_products
                  WHERE quote_code = $1 AND line_code = $2
                  ORDER BY created_at DESC NULLS LAST
                  LIMIT 1`,
                [codigo, linea]
            );
            const productCode = existing.rows[0]?.product_code || await generateNextProductCode(client);
            const product = buildProductPayloadFromLine({
                productCode,
                quoteRow: context.quote,
                lineRow: context.line
            });

            const saved = await client.query(
                `INSERT INTO flexo_products (
                    product_code, line_code, quote_code, client_code, client_name, product_name, product_type,
                    department, material_name, quoted_machine, die_code, quantity_products, quantity_types,
                    tint_count, width_inches, length_inches, price_unit, total_price, source_calculation_code,
                    raw_data, updated_at
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,NOW())
                 ON CONFLICT (product_code)
                 DO UPDATE SET
                    line_code = EXCLUDED.line_code,
                    quote_code = EXCLUDED.quote_code,
                    client_code = EXCLUDED.client_code,
                    client_name = EXCLUDED.client_name,
                    product_name = EXCLUDED.product_name,
                    product_type = EXCLUDED.product_type,
                    department = EXCLUDED.department,
                    material_name = EXCLUDED.material_name,
                    quoted_machine = EXCLUDED.quoted_machine,
                    die_code = EXCLUDED.die_code,
                    quantity_products = EXCLUDED.quantity_products,
                    quantity_types = EXCLUDED.quantity_types,
                    tint_count = EXCLUDED.tint_count,
                    width_inches = EXCLUDED.width_inches,
                    length_inches = EXCLUDED.length_inches,
                    price_unit = EXCLUDED.price_unit,
                    total_price = EXCLUDED.total_price,
                    source_calculation_code = EXCLUDED.source_calculation_code,
                    raw_data = EXCLUDED.raw_data,
                    updated_at = NOW()
                 RETURNING *`,
                [
                    product.productCode,
                    product.lineCode,
                    product.quoteCode,
                    product.clientCode,
                    product.clientName,
                    product.productName,
                    product.productType,
                    product.department,
                    product.materialName,
                    product.quotedMachine,
                    product.dieCode,
                    product.quantityProducts,
                    product.quantityTypes,
                    product.tintCount,
                    product.widthInches,
                    product.lengthInches,
                    product.priceUnit,
                    product.totalPrice,
                    product.sourceCalculationCode,
                    JSON.stringify(product.rawData)
                ]
            );
            await client.query(
                `UPDATE flexo_calculations
                    SET product_code = $3,
                        raw_data = jsonb_set(
                            jsonb_set(
                                COALESCE(raw_data, '{}'::jsonb),
                                '{CODIGO PRODUCTO}',
                                to_jsonb($3::text),
                                true
                            ),
                            '{line_summary}',
                            (
                                CASE
                                    WHEN jsonb_typeof(COALESCE(raw_data, '{}'::jsonb)->'line_summary') = 'object'
                                    THEN COALESCE(raw_data, '{}'::jsonb)->'line_summary'
                                    ELSE '{}'::jsonb
                                END
                            ) || jsonb_build_object('product_code', $3::text),
                            true
                        )
                  WHERE quote_code = $1
                    AND line_code = $2`,
                [codigo, linea, product.productCode]
            );
            await client.query(
                `INSERT INTO flexo_product_quote_history (product_code, quote_code, line_code, action, raw_data, created_by)
                 SELECT $1,$2,$3,'source-quote',$4::jsonb,$5
                 WHERE NOT EXISTS (
                    SELECT 1 FROM flexo_product_quote_history
                     WHERE product_code = $1 AND quote_code = $2 AND line_code = $3 AND action = 'source-quote'
                 )`,
                [product.productCode, codigo, linea, JSON.stringify(product.metadata), product.metadata.created_by]
            );
            return saved.rows[0];
        });
        res.json({ ok: true, producto: mapProductCatalogRow(result) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible convertir la línea en producto.' });
    }
});

app.post('/api/productos/:codigo/cotizar', async (req, res) => {
    try {
        if (!canRequestCreateModule(req, 'cotizaciones')) {
            return res.status(403).json({ error: 'No tienes permiso para crear cotizaciones.' });
        }
        const productCode = String(req.params.codigo || '').trim();
        const payload = req.body || {};
        const result = await withTransaction(async (client) => {
            const productResult = await client.query(`SELECT * FROM flexo_products WHERE product_code = $1 LIMIT 1`, [productCode]);
            if (!productResult.rows.length) {
                throw new Error('Producto no encontrado.');
            }
            const product = productResult.rows[0];
            const productRaw = product.raw_data || {};
            let targetQuote = null;
            const targetQuoteCode = String(payload.targetQuoteCode || '').trim();

            if (targetQuoteCode) {
                const targetResult = await client.query(`SELECT * FROM quotes WHERE quote_code = $1 LIMIT 1`, [targetQuoteCode]);
                if (!targetResult.rows.length) throw new Error('Cotización destino no encontrada.');
                targetQuote = targetResult.rows[0];
            } else {
                const quoteCode = await generateNextQuoteCode(client);
                const today = new Date().toISOString().slice(0, 10);
                const quoteRaw = buildQuoteRawData({
                    quote_code: quoteCode,
                    customer_code: product.client_code,
                    customer_name: product.client_name,
                    contact_name: productRaw['CLIENTE | CONTACTO NOMBRE COMPLETO'],
                    email: productRaw['CLIENTE | CONTACTO EMAIL'],
                    salesperson_name: productRaw.VENDEDOR || getConfiguredCurrentUser(),
                    phone: productRaw['CLIENTE | CONTACTO TELEFONO'],
                    status: 'Borrador',
                    created_on: today,
                    due_on: today
                }, productRaw);
                quoteRaw['TRAZABILIDAD | ACCION'] = 'create-quote-from-product';
                quoteRaw['TRAZABILIDAD | PRODUCTO ORIGEN'] = productCode;

                await client.query(
                    `INSERT INTO quotes (
                        quote_code, customer_code, customer_name, contact_name, email, salesperson_name, phone, status, created_on, due_on, raw_data
                     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
                    [
                        quoteCode,
                        product.client_code,
                        product.client_name,
                        pickFirstValue(productRaw['CLIENTE | CONTACTO NOMBRE COMPLETO']),
                        pickFirstValue(productRaw['CLIENTE | CONTACTO EMAIL']),
                        pickFirstValue(productRaw.VENDEDOR, getConfiguredCurrentUser()),
                        pickFirstValue(productRaw['CLIENTE | CONTACTO TELEFONO']),
                        'Borrador',
                        today,
                        today,
                        JSON.stringify(quoteRaw)
                    ]
                );
                const createdQuote = await client.query(`SELECT * FROM quotes WHERE quote_code = $1 LIMIT 1`, [quoteCode]);
                targetQuote = createdQuote.rows[0];
            }

            const lineCode = await generateNextLineCode(client);
            const calculationCode = await generateNextCalculationCode(client);
            const metadata = buildTraceabilityMetadata({
                action: 'quote-from-product',
                sourceQuoteCode: product.quote_code,
                sourceLineCode: product.line_code,
                actor: getConfiguredCurrentUser()
            });
            const rawData = buildCalculationRawData(
                {
                    quote_code: targetQuote.quote_code,
                    line_code: lineCode,
                    product_code: product.product_code,
                    customer_code: targetQuote.customer_code,
                    customer_name: targetQuote.customer_name,
                    salesperson_name: targetQuote.salesperson_name,
                    department: product.department,
                    job_name: product.product_name,
                    material_name: product.material_name,
                    material_code: product.material_name,
                    status: 'Borrador',
                    process_type: productRaw['Proceso Productivo'],
                    machine_name: product.quoted_machine,
                    die_code: product.die_code,
                    widthInches: product.widthInches,
                    lengthInches: product.lengthInches,
                    stationCount: product.tintCount,
                    quantity: product.quantity_products,
                    quantityProducts: product.quantity_products,
                    total_cost: product.total_price,
                    unit_price: product.price_unit
                },
                {
                    ...productRaw,
                    'ID COTIZACION': targetQuote.quote_code,
                    'ID LINEA': lineCode,
                    'ID CLIENTE': targetQuote.customer_code,
                    CLIENTE: targetQuote.customer_name,
                    'CLIENTE NOMBRE': targetQuote.customer_name,
                    VENDEDOR: targetQuote.salesperson_name,
                    'TRAZABILIDAD | ACCION': metadata.action,
                    'TRAZABILIDAD | USUARIO': metadata.created_by,
                    'TRAZABILIDAD | FECHA': metadata.created_at,
                    'TRAZABILIDAD | PRODUCTO ORIGEN': product.product_code,
                    'TRAZABILIDAD | COTIZACION ORIGEN': product.quote_code,
                    'TRAZABILIDAD | LINEA ORIGEN': product.line_code,
                    traceability: metadata
                }
            );
            rawData['Orden_Linea'] = await getNextQuoteLineOrder(targetQuote.quote_code);

            await client.query(
                `INSERT INTO flexo_calculations (
                    calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name,
                    die_code, material_code, quantity, subtotal_cost, total_cost, unit_price, raw_data
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL,$11,$12,$13::jsonb)`,
                [
                    calculationCode,
                    targetQuote.quote_code,
                    lineCode,
                    product.product_code,
                    targetQuote.customer_code,
                    pickFirstValue(productRaw['Proceso Productivo'], 'Convencional'),
                    product.quoted_machine,
                    product.die_code,
                    pickFirstValue(productRaw['Material Convencional | Id Material'], productRaw['Material Digital | Id Material'], product.material_name),
                    parseLegacyNumber(product.quantity_products),
                    parseLegacyNumber(product.total_price),
                    parseLegacyNumber(product.price_unit),
                    JSON.stringify(rawData)
                ]
            );
            await client.query(
                `INSERT INTO flexo_product_quote_history (product_code, quote_code, line_code, action, raw_data, created_by)
                 VALUES ($1,$2,$3,'quote-from-product',$4::jsonb,$5)`,
                [product.product_code, targetQuote.quote_code, lineCode, JSON.stringify(metadata), metadata.created_by]
            );
            const lineResult = await client.query(
                `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                        quantity, subtotal_cost, total_cost, unit_price, raw_data
                   FROM flexo_calculations
                  WHERE calculation_code = $1
                  LIMIT 1`,
                [calculationCode]
            );
            return { quote: targetQuote, line: lineResult.rows[0] };
        });

        res.json({
            ok: true,
            cotizacion: mapQuoteHeader(result.quote),
            linea: mapCalculationLine(result.line),
            calculo: mapFlexoCalculationDetail(result.line)
        });
    } catch (error) {
        const status = /no encontrad/i.test(error.message || '') ? 404 : 500;
        res.status(status).json({ error: error.message || 'No fue posible cotizar el producto.' });
    }
});

app.get('/api/config/general', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store');
        res.json(await loadGeneralConfig());
    } catch (error) {
        res.status(500).json({ error: 'No fue posible cargar la configuración general.' });
    }
});

app.get('/api/config/shell', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        res.json(await loadShellConfig());
    } catch (error) {
        res.status(500).json({ error: 'No fue posible cargar la configuración visual.' });
    }
});

app.get('/api/config/general/icons/:version/:file', async (req, res) => {
    try {
        const file = String(req.params.file || '');
        const match = file.match(/^([A-Za-z0-9_.-]+)\.(svg|png|jpg|jpeg|webp|gif)$/i);
        if (!match) return res.status(404).end();

        const iconKey = match[1];
        if (!SHELL_ICON_ASSET_KEYS.has(iconKey)) return res.status(404).end();

        const config = await loadGeneralConfig();
        const icon = readDataImageIcon(config.icons?.[iconKey]);
        if (!icon) return res.status(404).end();

        res.setHeader('Content-Type', icon.mime);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.send(icon.buffer);
    } catch (error) {
        res.status(404).end();
    }
});

app.post('/api/config/general/icon', async (req, res) => {
    try {
        const orderIconKeys = new Set(['orderArtworkDelete', 'orderStatus', 'orderNumbering', 'orderFlow', 'dashboardBusinessPartners', 'dashboardProducts', 'dashboardQuotes', 'dashboardNotifications', 'dashboardInventory', 'dashboardOrders', 'dashboardProduction', 'dashboardCosts', 'dashboardReports', 'dashboardSettings', 'dashboardPlanning']);
        const iconKey = String(req.body?.key || '').trim();
        const iconValue = String(req.body?.value || '').trim();
        const general = req.body?.general && typeof req.body.general === 'object' && !Array.isArray(req.body.general)
            ? req.body.general
            : {};

        if (!/^[A-Za-z0-9_.-]+$/.test(iconKey)) {
            return res.status(400).json({ error: 'Icono inválido.' });
        }
        if (!iconValue) {
            return res.status(400).json({ error: 'Icono vacío.' });
        }
        if (!orderIconKeys.has(iconKey)) {
            return res.status(400).json({ error: 'Este guardado aplica solo a iconos de órdenes.' });
        }

        const saved = await saveGeneralConfig({
            icons: { [iconKey]: iconValue },
            general
        });
        const savedGeneral = {};
        Object.keys(general).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(saved.general || {}, key)) {
                savedGeneral[key] = saved.general[key];
            }
        });
        res.json({
            icons: { [iconKey]: saved.icons?.[iconKey] || iconValue },
            general: savedGeneral
        });
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible guardar el icono.' });
    }
});

app.post('/api/config/general', async (req, res) => {
    try {
        const saved = await saveGeneralConfig(req.body || {});
        res.json(saved);
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible guardar la configuración general.' });
    }
});

app.get('/api/proformas/:codigo', async (req, res) => {
    try {
        const payload = await buildQuoteProformaPayload(req.params.codigo);
        res.json(payload);
    } catch (error) {
        const status = /no encontrada/i.test(error.message || '') ? 404 : 400;
        res.status(status).json({ error: error.message || 'No fue posible cargar la proforma.' });
    }
});

app.patch('/api/proformas/:codigo', async (req, res) => {
    try {
        const quoteCode = String(req.params.codigo || '').trim();
        if (!quoteCode) {
            return res.status(400).json({ error: 'Código de cotización inválido.' });
        }
        const before = await buildQuoteProformaPayload(quoteCode);
        if (before.status === 'closed') {
            return res.status(409).json({ error: 'La proforma ya fue cerrada y no puede editarse.' });
        }
        const config = await loadGeneralConfig();
        const configSnapshot = await getProformaConfigSnapshot(config);
        const currencies = configSnapshot.currencies;
        const currencyCode = String(req.body?.currencyCode || before.currency?.code || configSnapshot.defaultCurrency).trim().toUpperCase();
        const selectedCurrency = currencies.find((item) => item.code === currencyCode) || configSnapshot.defaultCurrencyMeta;
        const exchangeRate = Number(req.body?.exchangeRate || selectedCurrency.exchangeRate || 1) || 1;
        const rawData = {
            clientCompany: sanitizeAdminUserText(req.body?.clientCompany, before.client?.company),
            clientContactName: sanitizeAdminUserText(req.body?.clientContactName, before.client?.contactName),
            clientPhone: sanitizeAdminUserText(req.body?.clientPhone, before.client?.phone),
            clientEmail: sanitizeAdminUserText(req.body?.clientEmail, before.client?.email),
            salespersonName: sanitizeAdminUserText(req.body?.salespersonName, before.seller?.name),
            currencyCode,
            exchangeRate,
            validity: sanitizeAdminUserText(req.body?.validity, before.validity),
            intro: sanitizeAdminUserText(req.body?.intro, before.intro),
            termsConditions: sanitizeAdminUserText(req.body?.termsConditions, before.termsConditions),
            paymentTerms: sanitizeAdminUserText(req.body?.paymentTerms, before.paymentTerms),
            deliveryTime: sanitizeAdminUserText(req.body?.deliveryTime, before.deliveryTime),
            technicalSpecs: sanitizeAdminUserText(req.body?.technicalSpecs, before.technicalSpecs),
            qualityPolicies: sanitizeAdminUserText(req.body?.qualityPolicies, before.qualityPolicies),
            priceDisplayMode: normalizeProformaPriceDisplayMode(req.body?.priceDisplayMode || before.priceDisplayMode),
            sellerSignatureEnabled: req.body?.sellerSignatureEnabled === false ? false : req.body?.sellerSignatureEnabled === true ? true : before.sellerSignatureEnabled !== false
        };
        await pgQuery(
            `INSERT INTO quote_proformas (quote_code, status, raw_data)
             VALUES ($1, 'open', $2::jsonb)
             ON CONFLICT (quote_code)
             DO UPDATE SET
                raw_data = EXCLUDED.raw_data,
                updated_at = NOW()`,
            [quoteCode, JSON.stringify(rawData)]
        );
        res.json(await buildQuoteProformaPayload(quoteCode));
    } catch (error) {
        const status = /cerrada/i.test(error.message || '') ? 409 : 400;
        res.status(status).json({ error: error.message || 'No fue posible guardar la proforma.' });
    }
});

app.post('/api/proformas/:codigo/close', async (req, res) => {
    try {
        const quoteCode = String(req.params.codigo || '').trim();
        if (!quoteCode) {
            return res.status(400).json({ error: 'Código de cotización inválido.' });
        }
        await closeQuoteProforma(quoteCode, sanitizeAdminUserText(req.body?.reason, 'manual'));
        res.json(await buildQuoteProformaPayload(quoteCode));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible cerrar la proforma.' });
    }
});

app.post('/api/proformas/:codigo/reopen', async (req, res) => {
    try {
        const quoteCode = String(req.params.codigo || '').trim();
        if (!quoteCode) {
            return res.status(400).json({ error: 'Código de cotización inválido.' });
        }
        const row = await reopenQuoteProforma(quoteCode, sanitizeAdminUserText(req.body?.reason, 'tracking_reopened'));
        res.json({ ok: true, proforma: row });
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible reabrir la proforma.' });
    }
});

app.get('/api/login-repository', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'private, max-age=60, must-revalidate');
        res.json({ images: await listLoginRepositoryImages() });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el repositorio de imágenes.' });
    }
});

app.post('/api/login-repository', async (req, res) => {
    try {
        const saved = await saveLoginRepositoryImage(req.body || {});
        res.status(201).json(saved);
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible guardar la imagen del repositorio.' });
    }
});

app.delete('/api/login-repository/:fileName', async (req, res) => {
    try {
        await deleteLoginRepositoryImage(req.params.fileName);
        res.json({ ok: true });
    } catch (error) {
        const status = /no existe/i.test(error.message || '') ? 404 : 400;
        res.status(status).json({ error: error.message || 'No fue posible eliminar la imagen del repositorio.' });
    }
});

app.get('/api/admin-users', async (req, res) => {
    try {
        const result = await pgQuery(
            `SELECT u.id, u.full_name, u.username, u.password, u.department, u.process, u.photo_url, u.signature_url, u.email, u.phone, u.phone_secondary,
                    u.sap_salesperson_code, u.sap_salesperson_name, u.default_landing,
                    u.notify_email, u.notify_whatsapp, u.notify_sms, u.is_active, u.permission_id, u.floating_button_config,
                    p.permission_name
               FROM admin_users u
          LEFT JOIN admin_permissions p
                 ON p.id = u.permission_id
              ORDER BY u.is_active DESC, LOWER(full_name), id`
        );
        res.json(result.rows.map(normalizeAdminUserRecord));
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los usuarios.' });
    }
});

app.post('/api/admin-users', async (req, res) => {
    try {
        const name = sanitizeAdminUserText(req.body?.name);
        const username = sanitizeAdminUserText(req.body?.username).toLowerCase();
        const password = sanitizeAdminUserText(req.body?.password);
        if (!name || !username || !password) {
            return res.status(400).json({ error: 'Nombre, usuario y contraseña son obligatorios.' });
        }
        const exists = await pgQuery(
            `SELECT id
               FROM admin_users
              WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))
              LIMIT 1`,
            [username]
        );
        if (exists.rows.length) {
            return res.status(400).json({ error: 'Ese nombre de usuario ya existe.' });
        }
        const permissionId = req.body?.permissionId ? Number(req.body.permissionId) : null;
        const salespersonAssignment = req.body?.sapSalespersonCode === undefined
            ? { sapSalespersonCode: null, sapSalespersonName: '' }
            : await resolveAdminUserSapSalespersonAssignment({
                permissionId,
                rawCode: req.body?.sapSalespersonCode
            });
        const persistedSalespersonAssignment = normalizePersistedSapSalespersonAssignment(salespersonAssignment);
        const result = await pgQuery(
            `INSERT INTO admin_users (
                full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                notify_email, notify_whatsapp, notify_sms, is_active, permission_id, default_landing, sap_salesperson_code, sap_salesperson_name
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14, $15, $16, $17)
             RETURNING id, full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                       notify_email, notify_whatsapp, notify_sms, is_active, permission_id, default_landing, sap_salesperson_code, sap_salesperson_name`,
            [
                name,
                username,
                password,
                sanitizeAdminUserText(req.body?.department),
                sanitizeAdminUserText(req.body?.process),
                sanitizeAdminUserText(req.body?.photoUrl),
                sanitizeAdminUserText(req.body?.signatureUrl),
                sanitizeAdminUserText(req.body?.email),
                sanitizeAdminUserText(req.body?.phone),
                sanitizeAdminUserText(req.body?.phoneSecondary),
                req.body?.notificationEmail === true,
                req.body?.notificationWhatsapp === true,
                req.body?.notificationSms === true,
                permissionId,
                sanitizeOptionalPresentationKey(req.body?.defaultLanding),
                persistedSalespersonAssignment.sapSalespersonCode,
                persistedSalespersonAssignment.sapSalespersonName
            ]
        );
        const created = result.rows[0];
        if (created.permission_id) {
            const permission = await pgQuery(`SELECT permission_name FROM admin_permissions WHERE id = $1 LIMIT 1`, [created.permission_id]);
            created.permission_name = permission.rows[0]?.permission_name || '';
        }
        await recordAuditDiff({
            moduleKey: 'seguridad',
            entityType: 'admin_users',
            entityKey: String(created.id),
            beforeValue: {},
            afterValue: buildAdminUserAuditRecord(created),
            changedBy: getAuditActorFromRequest(req),
            route: req.path
        });
        res.status(201).json(normalizeAdminUserRecord(created));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible crear el usuario.' });
    }
});

app.patch('/api/admin-users/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ error: 'Identificador no válido.' });
        }
        const existing = await pgQuery(
            `SELECT id, full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                    notify_email, notify_whatsapp, notify_sms, is_active, permission_id, default_landing, sap_salesperson_code, sap_salesperson_name
               FROM admin_users
              WHERE id = $1
              LIMIT 1`,
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        const row = existing.rows[0];
        const permissionId = req.body?.permissionId ? Number(req.body.permissionId) : null;
        const defaultLanding = req.body?.defaultLanding === undefined
            ? sanitizeOptionalPresentationKey(row.default_landing)
            : sanitizeOptionalPresentationKey(req.body?.defaultLanding);
        const salespersonAssignment = await resolveAdminUserSapSalespersonAssignment({
            permissionId,
            rawCode: req.body?.sapSalespersonCode,
            fallbackCode: row.sap_salesperson_code,
            fallbackName: row.sap_salesperson_name
        });
        const persistedSalespersonAssignment = normalizePersistedSapSalespersonAssignment(salespersonAssignment);
        const result = await pgQuery(
            `UPDATE admin_users
                SET full_name = $2,
                    username = $3,
                    password = $4,
                    department = $5,
                    process = $6,
                    photo_url = $7,
                    signature_url = $8,
                    email = $9,
                    phone = $10,
                    phone_secondary = $11,
                    notify_email = $12,
                    notify_whatsapp = $13,
                    notify_sms = $14,
                    is_active = $15,
                    permission_id = $16,
                    default_landing = $17,
                    sap_salesperson_code = $18,
                    sap_salesperson_name = $19,
                    updated_at = NOW()
              WHERE id = $1
          RETURNING id, full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                    notify_email, notify_whatsapp, notify_sms, is_active, permission_id, default_landing, sap_salesperson_code, sap_salesperson_name`,
            [
                id,
                sanitizeAdminUserText(row.full_name),
                sanitizeAdminUserText(row.username),
                sanitizeAdminUserText(req.body?.password, row.password),
                sanitizeAdminUserText(req.body?.department, row.department),
                sanitizeAdminUserText(req.body?.process, row.process),
                sanitizeAdminUserText(req.body?.photoUrl, row.photo_url),
                sanitizeAdminUserText(req.body?.signatureUrl, row.signature_url),
                sanitizeAdminUserText(req.body?.email, row.email),
                sanitizeAdminUserText(req.body?.phone, row.phone),
                sanitizeAdminUserText(req.body?.phoneSecondary, row.phone_secondary),
                req.body?.notificationEmail === undefined ? Boolean(row.notify_email) : req.body?.notificationEmail === true,
                req.body?.notificationWhatsapp === undefined ? Boolean(row.notify_whatsapp) : req.body?.notificationWhatsapp === true,
                req.body?.notificationSms === undefined ? Boolean(row.notify_sms) : req.body?.notificationSms === true,
                req.body?.active === undefined ? row.is_active !== false : req.body?.active === true,
                permissionId,
                defaultLanding,
                persistedSalespersonAssignment.sapSalespersonCode,
                persistedSalespersonAssignment.sapSalespersonName
            ]
        );
        const updated = result.rows[0];
        if (updated.permission_id) {
            const permission = await pgQuery(`SELECT permission_name FROM admin_permissions WHERE id = $1 LIMIT 1`, [updated.permission_id]);
            updated.permission_name = permission.rows[0]?.permission_name || '';
        }
        await recordAuditDiff({
            moduleKey: 'seguridad',
            entityType: 'admin_users',
            entityKey: String(updated.id),
            beforeValue: buildAdminUserAuditRecord(row),
            afterValue: buildAdminUserAuditRecord(updated),
            changedBy: getAuditActorFromRequest(req),
            route: req.path
        });
        res.json(normalizeAdminUserRecord(updated));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible actualizar el usuario.' });
    }
});

app.get('/api/admin-profile', async (req, res) => {
    try {
        const session = readErpSessionFromRequest(req);
        const sessionUser = sanitizeAdminUserText(session?.username);
        if (!sessionUser) {
            return res.status(401).json({ error: 'Sesión no válida.' });
        }
        const result = await pgQuery(
            `SELECT u.id, u.full_name, u.username, u.password, u.department, u.process, u.photo_url, u.signature_url, u.email, u.phone, u.phone_secondary,
                    u.sap_salesperson_code, u.sap_salesperson_name, u.default_landing,
                    u.notify_email, u.notify_whatsapp, u.notify_sms, u.is_active, u.permission_id, u.floating_button_config,
                    p.permission_name
               FROM admin_users u
          LEFT JOIN admin_permissions p
                 ON p.id = u.permission_id
              WHERE LOWER(TRIM(u.username)) = LOWER(TRIM($1))
                 OR LOWER(TRIM(u.full_name)) = LOWER(TRIM($1))
              ORDER BY u.id
              LIMIT 1`,
            [sessionUser]
        );
        if (!result.rows.length) {
            return res.json({
                id: 0,
                name: sanitizeAdminUserText(session?.name, sessionUser),
                username: sessionUser,
                password: '',
                department: sanitizeAdminUserText(session?.department),
                process: sanitizeAdminUserText(session?.process),
                photoUrl: sanitizeAdminUserText(session?.photoUrl),
                signatureUrl: '',
                email: '',
                phone: '',
                phoneSecondary: '',
                notificationEmail: false,
                notificationWhatsapp: false,
                notificationSms: false,
                active: true,
                permissionId: null,
                permissionName: sanitizeAdminUserText(session?.permissionName),
                defaultLanding: sanitizeOptionalPresentationKey(session?.userDefaultLanding),
                sapSalespersonCode: null,
                sapSalespersonName: '',
                floatingButtonConfig: {}
            });
        }
        res.json(normalizeAdminUserRecord(result.rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el perfil.' });
    }
});

app.patch('/api/admin-profile', async (req, res) => {
    try {
        const session = readErpSessionFromRequest(req);
        const sessionUser = sanitizeAdminUserText(session?.username);
        if (!sessionUser) {
            return res.status(401).json({ error: 'Sesión no válida.' });
        }
        const existing = await pgQuery(
            `SELECT id, full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                    notify_email, notify_whatsapp, notify_sms, is_active, permission_id, default_landing, floating_button_config
               FROM admin_users
              WHERE LOWER(TRIM(username)) = LOWER(TRIM($1))
                 OR LOWER(TRIM(full_name)) = LOWER(TRIM($1))
              ORDER BY id
              LIMIT 1`,
            [sessionUser]
        );
        if (!existing.rows.length) {
            const inserted = await pgQuery(
                `INSERT INTO admin_users (
                    full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                    notify_email, notify_whatsapp, notify_sms, is_active, permission_id, floating_button_config
                 ) VALUES ($1,$2,$3,$4,$5,$6,'',$7,$8,$9,FALSE,FALSE,FALSE,TRUE,NULL,$10::jsonb)
                 RETURNING id, full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                           notify_email, notify_whatsapp, notify_sms, is_active, permission_id, default_landing, floating_button_config`,
                [
                    sanitizeAdminUserText(session?.name, sessionUser),
                    sessionUser,
                    sanitizeAdminUserText(req.body?.password),
                    sanitizeAdminUserText(session?.department),
                    sanitizeAdminUserText(session?.process),
                    sanitizeAdminUserText(req.body?.photoUrl, session?.photoUrl),
                    sanitizeAdminUserText(req.body?.email),
                    sanitizeAdminUserText(req.body?.phone),
                    sanitizeAdminUserText(req.body?.phoneSecondary),
                    JSON.stringify(req.body?.floatingButtonConfig && typeof req.body.floatingButtonConfig === 'object' ? req.body.floatingButtonConfig : {})
                ]
            );
            await recordAuditDiff({
                moduleKey: 'seguridad',
                entityType: 'admin_users',
                entityKey: String(inserted.rows[0].id),
                beforeValue: {},
                afterValue: buildAdminUserAuditRecord(inserted.rows[0]),
                changedBy: getAuditActorFromRequest(req),
                route: req.path
            });
            return res.json(normalizeAdminUserRecord(inserted.rows[0]));
        }
        const row = existing.rows[0];
        const result = await pgQuery(
            `UPDATE admin_users
                SET password = $2,
                    photo_url = $3,
                    email = $4,
                    phone = $5,
                    phone_secondary = $6,
                    floating_button_config = $7::jsonb,
                    updated_at = NOW()
              WHERE id = $1
          RETURNING id, full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                    notify_email, notify_whatsapp, notify_sms, is_active, permission_id, default_landing, floating_button_config`,
            [
                Number(row.id),
                sanitizeAdminUserText(req.body?.password, row.password),
                sanitizeAdminUserText(req.body?.photoUrl, row.photo_url),
                sanitizeAdminUserText(req.body?.email, row.email),
                sanitizeAdminUserText(req.body?.phone, row.phone),
                sanitizeAdminUserText(req.body?.phoneSecondary, row.phone_secondary),
                JSON.stringify(req.body?.floatingButtonConfig && typeof req.body.floatingButtonConfig === 'object'
                    ? req.body.floatingButtonConfig
                    : (row.floating_button_config && typeof row.floating_button_config === 'object' ? row.floating_button_config : {}))
            ]
        );
        await recordAuditDiff({
            moduleKey: 'seguridad',
            entityType: 'admin_users',
            entityKey: String(result.rows[0].id),
            beforeValue: buildAdminUserAuditRecord(row),
            afterValue: buildAdminUserAuditRecord(result.rows[0]),
            changedBy: getAuditActorFromRequest(req),
            route: req.path
        });
        res.json(normalizeAdminUserRecord(result.rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible actualizar el perfil.' });
    }
});

app.delete('/api/admin-users/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ error: 'Identificador no válido.' });
        }
        const beforeResult = await pgQuery(
            `SELECT id, full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                    notify_email, notify_whatsapp, notify_sms, is_active, permission_id, default_landing, sap_salesperson_code, sap_salesperson_name
               FROM admin_users
              WHERE id = $1
              LIMIT 1`,
            [id]
        );
        if (!beforeResult.rows.length) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        const result = await pgQuery(
            `UPDATE admin_users
                SET is_active = FALSE,
                    updated_at = NOW()
              WHERE id = $1
          RETURNING id, full_name, username, password, department, process, photo_url, signature_url, email, phone, phone_secondary,
                    notify_email, notify_whatsapp, notify_sms, is_active, permission_id, default_landing, sap_salesperson_code, sap_salesperson_name`,
            [id]
        );
        await recordAuditDiff({
            moduleKey: 'seguridad',
            entityType: 'admin_users',
            entityKey: String(id),
            beforeValue: buildAdminUserAuditRecord(beforeResult.rows[0]),
            afterValue: buildAdminUserAuditRecord(result.rows[0]),
            changedBy: getAuditActorFromRequest(req),
            route: req.path
        });
        res.json(normalizeAdminUserRecord(result.rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible eliminar el usuario.' });
    }
});

app.get('/api/admin-permissions', async (req, res) => {
    try {
        const result = await pgQuery(
            `SELECT id, permission_name, default_landing, module_permissions
               FROM admin_permissions
              ORDER BY LOWER(permission_name), id`
        );
        res.json(result.rows.map(normalizeAdminPermissionRecord));
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los permisos.' });
    }
});

app.get('/api/admin-security-diagnostics', async (req, res) => {
    try {
        res.json(await buildAdminSecurityDiagnostics());
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible revisar la integridad de permisos.' });
    }
});

app.post('/api/admin-permissions', async (req, res) => {
    try {
        const name = sanitizeAdminUserText(req.body?.name);
        if (!name) {
            return res.status(400).json({ error: 'El nombre del permiso es obligatorio.' });
        }
        const result = await pgQuery(
            `INSERT INTO admin_permissions (permission_name, default_landing, module_permissions)
             VALUES ($1, $2, $3::jsonb)
             RETURNING id, permission_name, default_landing, module_permissions`,
            [
                name,
                sanitizePresentationKey(req.body?.defaultLanding),
                JSON.stringify(normalizePermissionMatrix(req.body?.modules || {}))
            ]
        );
        await recordAuditDiff({
            moduleKey: 'seguridad',
            entityType: 'admin_permissions',
            entityKey: String(result.rows[0].id),
            beforeValue: {},
            afterValue: buildAdminPermissionAuditRecord(result.rows[0]),
            changedBy: getAuditActorFromRequest(req),
            route: req.path
        });
        res.status(201).json(normalizeAdminPermissionRecord(result.rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible crear el permiso.' });
    }
});

app.patch('/api/admin-permissions/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ error: 'Identificador no válido.' });
        }
        const name = sanitizeAdminUserText(req.body?.name);
        if (!name) {
            return res.status(400).json({ error: 'El nombre del permiso es obligatorio.' });
        }
        const existingResult = await pgQuery(
            `SELECT id, permission_name, default_landing, module_permissions
               FROM admin_permissions
              WHERE id = $1
              LIMIT 1`,
            [id]
        );
        if (!existingResult.rows.length) {
            return res.status(404).json({ error: 'Permiso no encontrado.' });
        }
        const incomingModules = req.body?.modules && typeof req.body.modules === 'object' ? req.body.modules : {};
        const mergedModules = {
            ...(existingResult.rows[0]?.module_permissions || {}),
            ...incomingModules
        };
        const result = await pgQuery(
            `UPDATE admin_permissions
                SET permission_name = $2,
                    default_landing = $3,
                    module_permissions = $4::jsonb,
                    updated_at = NOW()
              WHERE id = $1
          RETURNING id, permission_name, default_landing, module_permissions`,
            [
                id,
                name,
                sanitizePresentationKey(req.body?.defaultLanding),
                JSON.stringify(normalizePermissionMatrix(mergedModules))
            ]
        );
        await recordAuditDiff({
            moduleKey: 'seguridad',
            entityType: 'admin_permissions',
            entityKey: String(id),
            beforeValue: buildAdminPermissionAuditRecord(existingResult.rows[0]),
            afterValue: buildAdminPermissionAuditRecord(result.rows[0]),
            changedBy: getAuditActorFromRequest(req),
            route: req.path
        });
        res.json(normalizeAdminPermissionRecord(result.rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible actualizar el permiso.' });
    }
});

app.delete('/api/admin-permissions/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ error: 'Identificador no válido.' });
        }
        const result = await pgQuery(`DELETE FROM admin_permissions WHERE id = $1 RETURNING id, permission_name, default_landing, module_permissions`, [id]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Permiso no encontrado.' });
        }
        await recordAuditDiff({
            moduleKey: 'seguridad',
            entityType: 'admin_permissions',
            entityKey: String(id),
            beforeValue: buildAdminPermissionAuditRecord(result.rows[0]),
            afterValue: {},
            changedBy: getAuditActorFromRequest(req),
            route: req.path
        });
        res.json({ ok: true, id });
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible eliminar el permiso.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const username = sanitizeAdminUserText(req.body?.username).toLowerCase();
        const password = sanitizeAdminUserText(req.body?.password);
        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
        }

        if ((username === 'admin' || username === 'administrador') && password === 'admin') {
            const emergencyModules = {};
            Object.keys(PRESENTATION_NAMES).forEach((key) => {
                emergencyModules[key] = 'edit';
            });
            return res.json({
                ok: true,
                user: {
                    id: 0,
                    name: 'Administrador',
                    username: 'admin',
                    department: 'Administración',
                    process: 'General',
                    photoUrl: '',
                    permissionId: null,
                    permissionName: 'Acceso de Emergencia',
                    defaultLanding: 'dashboard',
                    modules: emergencyModules
                }
            });
        }

        const result = await pgQuery(
            `SELECT u.id, u.full_name, u.username, u.department, u.process, u.photo_url, u.is_active,
                    u.permission_id, u.default_landing AS user_default_landing, u.floating_button_config,
                    p.permission_name,
                    p.default_landing AS permission_default_landing, p.module_permissions
               FROM admin_users u
          LEFT JOIN admin_permissions p
                 ON p.id = u.permission_id
              WHERE (
                        LOWER(TRIM(u.username)) = $1
                     OR LOWER(TRIM(u.full_name)) = $1
                    )
                AND u.password = $2
              LIMIT 1`,
            [username, password]
        );

        if (!result.rows.length) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const row = result.rows[0];
        if (row.permission_id != null && !sanitizeAdminUserText(row.permission_name)) {
            return res.status(409).json({
                error: 'El usuario tiene un permiso asignado que no existe en esta base de datos. Revisa la migración de permisos antes de continuar.'
            });
        }
        const permissionName = sanitizeAdminUserText(row.permission_name);
        if (row.is_active === false) {
            return res.status(403).json({ error: 'Este usuario se encuentra inactivo.' });
        }
        res.json({
            ok: true,
            user: {
                id: Number(row.id || 0),
                name: sanitizeAdminUserText(row.full_name),
                username: sanitizeAdminUserText(row.username),
                department: sanitizeAdminUserText(row.department),
                process: sanitizeAdminUserText(row.process),
                photoUrl: sanitizeAdminUserText(row.photo_url),
                permissionId: row.permission_id == null ? null : Number(row.permission_id),
                permissionName,
                defaultLanding: sanitizeOptionalPresentationKey(row.user_default_landing) || sanitizePresentationKey(row.permission_default_landing),
                floatingButtonConfig: row.floating_button_config && typeof row.floating_button_config === 'object' && !Array.isArray(row.floating_button_config)
                    ? row.floating_button_config
                    : {},
                modules: isSuperAdminPermissionName(permissionName)
                    ? buildFullPermissionMatrix()
                    : normalizePermissionMatrix(row.module_permissions || {})
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible iniciar sesión.' });
    }
});

app.get('/api/costos-config', async (req, res) => {
    try {
        res.json(await loadCostsConfig());
    } catch (error) {
        res.status(500).json({ error: 'No fue posible cargar la configuracion de costos.' });
    }
});

app.post('/api/costos-config', async (req, res) => {
    try {
        const saved = await saveCostsConfig(req.body || {});
        res.json(saved);
    } catch (error) {
        res.status(400).json({ error: 'No fue posible guardar la configuracion de costos.' });
    }
});

app.get('/api/audit-log', async (req, res) => {
    try {
        const values = [];
        const filters = [];
        const moduleKey = String(req.query.module || '').trim();
        const presentationKey = String(req.query.presentation || '').trim();
        const changedBy = String(req.query.user || '').trim();
        const fieldSearch = String(req.query.field || '').trim();
        const dateFrom = String(req.query.dateFrom || '').trim();
        const dateTo = String(req.query.dateTo || '').trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 300, 1), 1000);

        if (moduleKey) {
            values.push(moduleKey);
            filters.push(`module_key = $${values.length}`);
        }
        if (presentationKey) {
            values.push(presentationKey);
            filters.push(`presentation_key = $${values.length}`);
        }
        if (changedBy) {
            values.push(`%${changedBy}%`);
            filters.push(`changed_by ILIKE $${values.length}`);
        }
        if (fieldSearch) {
            values.push(`%${fieldSearch}%`);
            filters.push(`(
                field_label ILIKE $${values.length}
                OR field_key ILIKE $${values.length}
                OR COALESCE(section_label, '') ILIKE $${values.length}
                OR COALESCE(row_label, '') ILIKE $${values.length}
            )`);
        }
        if (dateFrom) {
            values.push(dateFrom);
            filters.push(`changed_at >= $${values.length}::timestamptz`);
        }
        if (dateTo) {
            values.push(`${dateTo} 23:59:59`);
            filters.push(`changed_at <= $${values.length}::timestamptz`);
        }

        values.push(limit);
        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const result = await pgQuery(
            `SELECT id, module_key, entity_type, entity_key, presentation_key, presentation_label,
                    section_key, section_label, row_key, row_label, field_key, field_label,
                    old_value, new_value, old_value_display, new_value_display, changed_by, route, changed_at
               FROM audit_log
               ${whereClause}
              ORDER BY changed_at DESC, id DESC
              LIMIT $${values.length}`,
            values
        );

        res.json({
            items: result.rows.map((row) => ({
                id: row.id,
                module_key: row.module_key,
                entity_type: row.entity_type,
                entity_key: row.entity_key,
                presentation_key: row.presentation_key,
                presentation_label: row.presentation_label,
                section_key: row.section_key,
                section_label: row.section_label,
                row_key: row.row_key,
                row_label: row.row_label,
                field_key: row.field_key,
                field_label: row.field_label,
                old_value: row.old_value,
                new_value: row.new_value,
                old_value_display: row.old_value_display,
                new_value_display: row.new_value_display,
                changed_by: row.changed_by,
                route: row.route,
                changed_at: row.changed_at
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar la auditoría.' });
    }
});

app.get('/api/clientes', async (req, res) => {
    try {
        const result = await pgQuery(
            `SELECT partner_code AS codigo, partner_name AS nombre, tax_id AS nit, email, creation_date
               FROM business_partners
              ORDER BY partner_name NULLS LAST, partner_code NULLS LAST`
        );
        res.json({ clientes: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los clientes.' });
    }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const tenantId = await getActiveTenantId();
        const payload = req.body || {};
        const partnerCode = pickFirstValue(payload.codigo, payload.partner_code);
        if (!tenantId || !partnerCode) {
            return res.status(400).json({ error: 'Debes indicar tenant y código del socio.' });
        }

        await pgQuery(
            `INSERT INTO socio (tenant_id, codigo, nombre, correo, telefono)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (tenant_id, codigo)
             DO UPDATE SET nombre = EXCLUDED.nombre, correo = EXCLUDED.correo, telefono = EXCLUDED.telefono`,
            [tenantId, partnerCode, pickFirstValue(payload.nombre, payload.partner_name), pickFirstValue(payload.email), pickFirstValue(payload.telefono, payload.phone)]
        );

        await pgQuery(
            `INSERT INTO business_partners (
                partner_code, partner_name, tax_id, email, email_facturacion, currency_code, payment_terms,
                sector, sub_sector, is_tax_exempt, allowed_percentage, client_type, creation_date, raw_data
             ) VALUES ($1, $2, $3, $4, $5, '', '', '', '', false, NULL, '', CURRENT_DATE, $6::jsonb)
             ON CONFLICT (partner_code)
             DO UPDATE SET
                partner_name = EXCLUDED.partner_name,
                tax_id = EXCLUDED.tax_id,
                email = EXCLUDED.email,
                email_facturacion = EXCLUDED.email_facturacion,
                raw_data = COALESCE(business_partners.raw_data, '{}'::jsonb) || EXCLUDED.raw_data`,
            [
                partnerCode,
                pickFirstValue(payload.nombre, payload.partner_name),
                pickFirstValue(payload.nit, payload.tax_id),
                pickFirstValue(payload.email),
                pickFirstValue(payload.email_facturacion),
                JSON.stringify({ socio: payload })
            ]
        );

        res.json({ codigo: partnerCode, message: 'Cliente guardado exitosamente.' });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible guardar el cliente.' });
    }
});

app.post('/api/productos', async (req, res) => {
    res.status(501).json({ error: 'La creación directa de productos aún no está habilitada; se generan desde líneas de cotización.' });
});

app.get('/api/cotizaciones-inteligentes/catalogos', async (req, res) => {
    try {
        const [catalogs, generalConfig] = await Promise.all([
            loadFlexoCatalogsFromDb(),
            loadGeneralConfig()
        ]);
        res.json({
            substrateMaterials: getQuotableSubstrateMaterials(catalogs.materials),
            materialFamilies: getCommercialMaterialFamilies(catalogs.materials),
            digitalThreshold: Math.max(0, Number(generalConfig?.general?.quoteAutomaticDigitalMaxQuantity || 0)) || 100000,
            labelsPerRollDefault: Math.max(1, Number(generalConfig?.general?.quoteAutomaticLabelsPerRoll || 0)) || 1000
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los catálogos inteligentes de cotización.' });
    }
});

app.post('/api/cotizaciones', async (req, res) => {
    try {
        const payload = { ...(req.body || {}) };
        const activeUser = getRequestUserName(req, payload.salesperson_name);
        payload.salesperson_name = activeUser;
        const requestKey = pickFirstValue(payload.request_key);
        if (requestKey) {
            const existing = await pgQuery(
                `SELECT quote_code, customer_code, customer_name, contact_name, email, salesperson_name, phone, status, created_on, due_on, raw_data
                   FROM quotes
                  WHERE raw_data->>'Clave_Solicitud' = $1
                  ORDER BY created_on DESC NULLS LAST, quote_code DESC
                  LIMIT 1`,
                [requestKey]
            );
            if (existing.rows.length) {
                return res.json({ cotizacion: mapQuoteHeader(existing.rows[0]) });
            }
        }
        const quoteCode = pickFirstValue(payload.quote_code) || await generateNextQuoteCode();
        const createdOn = pickFirstValue(payload.created_on, new Date().toISOString().slice(0, 10));
        const dueOn = pickFirstValue(payload.due_on, createdOn);
        const rawData = buildQuoteRawData({ ...payload, quote_code: quoteCode, created_on: createdOn, due_on: dueOn });

        await pgQuery(
            `INSERT INTO quotes (
                quote_code, customer_code, customer_name, contact_name, email, salesperson_name, phone, status, created_on, due_on, raw_data
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
            [
                quoteCode,
                pickFirstValue(payload.customer_code),
                pickFirstValue(payload.customer_name),
                pickFirstValue(payload.contact_name),
                pickFirstValue(payload.email),
                activeUser,
                pickFirstValue(payload.phone),
                pickFirstValue(payload.status, 'Borrador'),
                createdOn,
                dueOn,
                JSON.stringify(rawData)
            ]
        );

        const detail = await pgQuery(
            `SELECT quote_code, customer_code, customer_name, contact_name, email, salesperson_name, phone, status, created_on, due_on, raw_data
               FROM quotes
              WHERE quote_code = $1`,
            [quoteCode]
        );
        res.json({ cotizacion: mapQuoteHeader(detail.rows[0]) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible crear la cotización.' });
    }
});

app.patch('/api/cotizaciones/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const existing = await pgQuery(
            `SELECT customer_code, customer_name, raw_data FROM quotes WHERE quote_code = $1`,
            [codigo]
        );

        if (!existing.rows.length) {
            return res.status(404).json({ error: 'Cotización no encontrada.' });
        }

        const payload = req.body || {};
        const lineCountResult = await pgQuery(
            `SELECT COUNT(*)::int AS total
               FROM flexo_calculations
              WHERE quote_code = $1`,
            [codigo]
        );
        const hasLines = Number(lineCountResult.rows[0]?.total || 0) > 0;
        const normalizedPayload = hasLines
            ? {
                ...payload,
                customer_code: pickFirstValue(existing.rows[0].customer_code, existing.rows[0].raw_data?.['ID CLIENTE']),
                customer_name: pickFirstValue(existing.rows[0].customer_name, existing.rows[0].raw_data?.['CLIENTE NOMBRE'])
            }
            : payload;
        const rawData = buildQuoteRawData(normalizedPayload, existing.rows[0].raw_data || {});

        await pgQuery(
            `UPDATE quotes
                SET customer_code = $2,
                    customer_name = $3,
                    contact_name = $4,
                    email = $5,
                    salesperson_name = $6,
                    phone = $7,
                    status = $8,
                    created_on = COALESCE($9, created_on),
                    due_on = COALESCE($10, due_on),
                    raw_data = $11::jsonb
              WHERE quote_code = $1`,
            [
                codigo,
                hasLines
                    ? pickFirstValue(existing.rows[0].customer_code, existing.rows[0].raw_data?.['ID CLIENTE'])
                    : pickFirstValue(normalizedPayload.customer_code, existing.rows[0].customer_code, existing.rows[0].raw_data?.['ID CLIENTE']),
                hasLines
                    ? pickFirstValue(existing.rows[0].customer_name, existing.rows[0].raw_data?.['CLIENTE NOMBRE'])
                    : pickFirstValue(normalizedPayload.customer_name, existing.rows[0].customer_name, existing.rows[0].raw_data?.['CLIENTE NOMBRE']),
                pickFirstValue(normalizedPayload.contact_name, existing.rows[0].raw_data?.['CLIENTE | CONTACTO NOMBRE COMPLETO']),
                pickFirstValue(normalizedPayload.email, existing.rows[0].raw_data?.['CLIENTE | CONTACTO EMAIL']),
                pickFirstValue(normalizedPayload.salesperson_name, existing.rows[0].raw_data?.VENDEDOR),
                pickFirstValue(normalizedPayload.phone, existing.rows[0].raw_data?.['CLIENTE | CONTACTO TELEFONO']),
                pickFirstValue(normalizedPayload.status, existing.rows[0].raw_data?.['Estado Cotizacion']),
                pickFirstValue(normalizedPayload.created_on),
                pickFirstValue(normalizedPayload.due_on),
                JSON.stringify(rawData)
            ]
        );

        const detail = await pgQuery(
            `SELECT quote_code, customer_code, customer_name, contact_name, email, salesperson_name, phone, status, created_on, due_on, raw_data
               FROM quotes
              WHERE quote_code = $1`,
            [codigo]
        );
        res.json({ cotizacion: mapQuoteHeader(detail.rows[0]) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible guardar la cotización.' });
    }
});

app.post('/api/cotizaciones/:codigo/lineas', async (req, res) => {
    try {
        const { codigo } = req.params;
        const payload = { ...(req.body || {}) };
        const generalConfig = await loadGeneralConfig();
        const generalDefaults = generalConfig?.general || {};
        const costsConfig = await loadCostsConfig();
        const costDefaults = costsConfig?.general || {};
        const quoteResult = await pgQuery(`SELECT * FROM quotes WHERE quote_code = $1`, [codigo]);
        if (!quoteResult.rows.length) {
            return res.status(404).json({ error: 'Cotización no encontrada.' });
        }

        const quote = quoteResult.rows[0];
        const requestKey = pickFirstValue(payload.request_meta?.Clave_Solicitud, payload.request_key);
        if (requestKey) {
            const existingLine = await pgQuery(
                `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                        quantity, subtotal_cost, total_cost, unit_price, raw_data
                   FROM flexo_calculations
                  WHERE quote_code = $1
                    AND raw_data->>'Clave_Solicitud' = $2
                  ORDER BY created_at ASC NULLS LAST, calculation_code ASC
                  LIMIT 1`,
                [codigo, requestKey]
            );
            if (existingLine.rows.length) {
                return res.json({ linea: mapCalculationLine(existingLine.rows[0]), calculo: mapFlexoCalculationDetail(existingLine.rows[0]) });
            }
        }
        const lineCode = pickFirstValue(payload.line_code) || await generateNextLineCode();
        const calculationCode = pickFirstValue(payload.calculation_code) || await generateNextCalculationCode();
        const autoSelection = await resolveSmartQuoteLineSelection(payload);
        payload.labelsPerRoll = parsePositiveNumber(
            payload.labelsPerRoll,
            autoSelection.labelsPerRoll
        );
        payload.process_type = autoSelection.selectedProcessType === 'digital' ? 'Digital' : 'Convencional';
        payload.material_code = autoSelection.selectedMaterial?.code || pickFirstValue(payload.material_code, payload.material_name);
        payload.material_name = autoSelection.selectedMaterial?.name || payload.material_name;
        payload.die_code = pickFirstValue(payload.die_code);
        payload.machine_name = pickFirstValue(payload.machine_name);
        payload.request_meta = {
            ...(payload.request_meta || {}),
            'REQ | Material Comercial': autoSelection.requestedFamily || normalizeCommercialMaterialFamily(payload.material_name || ''),
            'REQ | Ruta Automática': payload.process_type,
            'REQ | Troquel Automático': '',
            'REQ | Material Automático': autoSelection.selectedMaterial?.code || '',
            'REQ | Máquina Automática': '',
            'REQ | Etiquetas x Rollo Automática': payload.labelsPerRoll,
            'REQ | Montaje Automático': autoSelection.selectedMounting
                ? `${autoSelection.selectedMounting.columns} columnas | ancho útil ${roundCurrency(autoSelection.selectedMounting.usableWidth)}" | largo estimado ${roundCurrency(autoSelection.selectedMounting.linearFeet)} pies`
                : '',
            'REQ | Comentario Técnico Automático': autoSelection.automaticComment,
            'REQ | Advertencias Automáticas': '',
            'REQ | Fallback de Ruta': autoSelection.fallbackApplied ? 'Sí' : 'No'
        };
        if (payload.request_meta?.Estado_UI && typeof payload.request_meta.Estado_UI === 'object') {
            payload.request_meta.Estado_UI.smartSelection = {
                digitalThreshold: autoSelection.digitalThreshold,
                processType: payload.process_type,
                dieCode: '',
                materialCode: autoSelection.selectedMaterial?.code || '',
                materialFamily: autoSelection.requestedFamily || '',
                machineName: '',
                labelsPerRoll: payload.labelsPerRoll,
                mounting: autoSelection.selectedMounting,
                warnings: []
            };
        }
        const machineName = await resolveSingleInventoryMachineName(payload.machine_name);
        const lineOrder = normalizeLineOrder(payload.line_order, await getNextQuoteLineOrder(codigo));
        const rawData = buildCalculationRawData({
            ...payload,
            quote_code: codigo,
            line_code: lineCode,
            customer_code: quote.customer_code,
            customer_name: quote.customer_name,
            salesperson_name: quote.salesperson_name,
            machine_name: machineName,
            coreWidth: pickFirstValue(payload.coreWidth, costDefaults.defaultRollWidth, generalDefaults.defaultRollWidth),
            coreDiameter: pickFirstValue(payload.coreDiameter, costDefaults.defaultCoreDiameter, generalDefaults.defaultCoreDiameter),
            quantityTypes: pickFirstValue(payload.quantityTypes, costDefaults.defaultQuantityTypes, generalDefaults.defaultQuantityTypes, 1),
            cmyk: Object.prototype.hasOwnProperty.call(payload, 'cmyk')
                ? payload.cmyk
                : String(costDefaults.defaultCmykEnabled ?? generalDefaults.defaultCmykEnabled ?? 'true').trim().toLowerCase() !== 'false'
        });
        rawData['Seleccion_Automatica'] = {
            digitalThreshold: autoSelection.digitalThreshold,
            processType: payload.process_type,
            dieCode: '',
            materialCode: autoSelection.selectedMaterial?.code || '',
            materialFamily: autoSelection.requestedFamily || '',
            machineName: '',
            labelsPerRoll: payload.labelsPerRoll,
            mounting: autoSelection.selectedMounting,
            fallbackApplied: autoSelection.fallbackApplied,
            warnings: []
        };
        rawData['Orden_Linea'] = lineOrder;
        const automaticPricing = await estimateAutomaticQuotePricing({
            rawData,
            processType: payload.process_type,
            quantity: parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(payload.quantityProducts) ?? 0,
            selectedMachine: null,
            selectedMaterial: autoSelection.selectedMaterial,
            selectedDie: null,
            selectedMounting: autoSelection.selectedMounting,
            costsConfig,
            exchangeRate: payload.exchange_rate ?? payload.exchangeRate ?? 1
        });
        rawData['GENERAL | 5 | SUBTOTAL'] = automaticPricing.baseCost;
        rawData['GENERAL | 7 | SUBTOTAL CALC ANTES IV | DOL'] = automaticPricing.subtotalBeforeTax;
        rawData['GENERAL | 8 | PORCENTAJE IVA'] = automaticPricing.taxPercent;
        rawData['GENERAL | 9 | Impuestos'] = automaticPricing.taxAmount;
        rawData['GENERAL | 7 | TOTAL | DOL'] = automaticPricing.subtotalBeforeTax;
        rawData['GENERAL | 9 | TOTAL | DOL'] = automaticPricing.totalAmount;
        rawData['GENERAL | 9 | UNITARIO | DOL'] = automaticPricing.unitPrice;
        rawData['PRECIO UNITARIO'] = automaticPricing.unitPriceWithTax;
        rawData['PRECIO TOTAL AL FINALIZAR'] = automaticPricing.totalAmount;
        rawData['GENERAL | SUSTRATO | CONSUMO PIES'] = Number(autoSelection.selectedMounting?.linearFeet || 0);
        rawData['Precio_Automatico'] = {
            materialCost: automaticPricing.materialCost,
            productionCost: automaticPricing.productionCost,
            baseCost: automaticPricing.baseCost,
            subtotalBeforeTax: automaticPricing.subtotalBeforeTax,
            taxPercent: automaticPricing.taxPercent,
            taxAmount: automaticPricing.taxAmount,
            totalAmount: automaticPricing.totalAmount,
            unitPrice: automaticPricing.unitPrice,
            unitPriceWithTax: automaticPricing.unitPriceWithTax,
            processBreakdown: automaticPricing.processBreakdown
        };
        rawData['Instantanea_Planificacion'] = automaticPricing.planningSnapshot;
        applyCurrencyFieldsToRawData(rawData, payload.exchange_rate ?? payload.exchangeRate);
        applyCalculationLineSummary(rawData, {
            quote_code: codigo,
            line_code: lineCode,
            product_code: pickFirstValue(payload.product_code, lineCode),
            customer_code: quote.customer_code,
            process_type: payload.process_type,
            machine_name: machineName,
            die_code: payload.die_code,
            material_code: payload.material_code,
            quantity: parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(payload.quantityProducts),
            total_cost: automaticPricing.totalAmount,
            unit_price: automaticPricing.unitPrice
        });

        await pgQuery(
            `INSERT INTO flexo_calculations (
                calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name,
                die_code, material_code, quantity, subtotal_cost, total_cost, unit_price, raw_data
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, $11, $12, $13::jsonb)`,
            [
                calculationCode,
                codigo,
                lineCode,
                pickFirstValue(payload.product_code, lineCode),
                quote.customer_code,
                pickFirstValue(payload.process_type, 'Convencional'),
                machineName || null,
                pickFirstValue(payload.die_code),
                pickFirstValue(payload.material_code),
                parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(payload.quantityProducts),
                automaticPricing.totalAmount,
                automaticPricing.unitPrice,
                JSON.stringify(rawData)
            ]
        );

        const detail = await pgQuery(
            `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                    quantity, subtotal_cost, total_cost, unit_price, raw_data
               FROM flexo_calculations
              WHERE calculation_code = $1`,
            [calculationCode]
        );
        res.json({ linea: mapCalculationLine(detail.rows[0]), calculo: mapFlexoCalculationDetail(detail.rows[0]) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible crear la línea de cotización.' });
    }
});

app.patch('/api/cotizaciones/:codigo/lineas/orden', async (req, res) => {
    try {
        const { codigo } = req.params;
        const payload = req.body || {};
        const lines = Array.isArray(payload.lineas) ? payload.lineas : [];
        if (!lines.length) {
            return res.json({ ok: true, lineas: [] });
        }

        const latestResult = await pgQuery(
            `SELECT DISTINCT ON (fc.line_code) fc.calculation_code, fc.line_code, fc.raw_data
               FROM flexo_calculations fc
               LEFT JOIN quotes q ON q.quote_code = fc.quote_code
              WHERE fc.quote_code = $1
                AND ${quoteOwnedCalculationPredicate('fc', 'q')}
              ORDER BY fc.line_code NULLS LAST, fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST`,
            [codigo]
        );
        const latestByLine = new Map(latestResult.rows.map((row) => [String(row.line_code || '').trim(), row]));

        for (const item of lines) {
            const lineCode = String(item?.line_code || '').trim();
            const lineOrder = normalizeLineOrder(item?.line_order);
            if (!lineCode || !lineOrder) continue;
            const current = latestByLine.get(lineCode);
            if (!current) continue;
            const rawData = { ...(current.raw_data || {}) };
            rawData['Orden_Linea'] = lineOrder;
            applyCalculationLineSummary(rawData, current);
            await pgQuery(
                `UPDATE flexo_calculations
                    SET raw_data = $2::jsonb
                  WHERE calculation_code = $1`,
                [current.calculation_code, JSON.stringify(rawData)]
            );
        }

        const orderedResult = await pgQuery(
            `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                    quantity, subtotal_cost, total_cost, unit_price, raw_data
               FROM (
                    SELECT DISTINCT ON (line_code)
                           fc.calculation_code, fc.quote_code, fc.line_code, fc.product_code, fc.customer_code, fc.process_type, fc.machine_name, fc.die_code, fc.material_code,
                           fc.quantity, fc.subtotal_cost, fc.total_cost, fc.unit_price, fc.raw_data, fc.created_at
                      FROM flexo_calculations fc
                      LEFT JOIN quotes q ON q.quote_code = fc.quote_code
                     WHERE fc.quote_code = $1
                       AND ${quoteOwnedCalculationPredicate('fc', 'q')}
                     ORDER BY fc.line_code NULLS LAST, fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
               ) latest_lines
              ORDER BY
                    CASE
                        WHEN COALESCE(latest_lines.raw_data->>'Orden_Linea', '') ~ '^[0-9]+$'
                            THEN (latest_lines.raw_data->>'Orden_Linea')::integer
                        ELSE NULL
                    END NULLS LAST,
                    line_code NULLS LAST`,
            [codigo]
        );

        res.json({ ok: true, lineas: orderedResult.rows.map(mapCalculationLine) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible guardar el orden de las líneas.' });
    }
});

app.post('/api/cotizaciones/:codigo/frente-dorso', async (req, res) => {
    try {
        const { codigo } = req.params;
        const groupLineCode = normalizeFrontBackLineCode(req.body?.groupLineCode || req.body?.lineaGrupo || req.body?.primaryLineCode || req.body?.primary_line_code);
        const elementLineCodes = Array.from(new Set(
            (Array.isArray(req.body?.elementLineCodes)
                ? req.body.elementLineCodes
                : [req.body?.frontLineCode, req.body?.backLineCode, req.body?.partnerLineCode, req.body?.secondaryLineCode, req.body?.partner_line_code]
            ).map(normalizeFrontBackLineCode).filter(Boolean)
        ));
        if (!groupLineCode || elementLineCodes.length !== 2 || elementLineCodes.includes(groupLineCode)) {
            return res.status(400).json({ error: 'Debes seleccionar una línea grupo y exactamente dos elementos diferentes.' });
        }
        const result = await withTransaction(async (client) => {
            const lines = await getLatestQuoteCalculationRows(codigo, client);
            const byCode = new Map(lines.map((row) => [normalizeFrontBackLineCode(row.line_code), row]));
            const groupLine = byCode.get(groupLineCode);
            const elementLines = elementLineCodes.map((lineCode) => byCode.get(lineCode)).filter(Boolean);
            if (!groupLine || elementLines.length !== 2) {
                throw new Error('No se encontraron la línea grupo y sus dos elementos frente/dorso.');
            }
            const now = new Date().toISOString();
            const groupId = buildFrontBackGroupId(codigo, groupLineCode, elementLineCodes);
            const warnings = buildFrontBackCompatibilityWarnings(elementLines[0], elementLines[1]);
            const groupQuantity = frontBackLineQuantity(groupLine) || frontBackLineQuantity(elementLines[0]) || frontBackLineQuantity(elementLines[1]) || 0;
            const elementRoles = {
                [elementLineCodes[0]]: 'frente',
                [elementLineCodes[1]]: 'dorso'
            };
            const baseGroup = {
                groupId,
                mode: 'frente_dorso',
                label: sanitizeAdminUserText(req.body?.label, 'Grupo Frente/Dorso'),
                displayMode: 'single',
                groupLineCode,
                lineaGrupo: groupLineCode,
                primaryLineCode: groupLineCode,
                frontLineCode: elementLineCodes[0],
                backLineCode: elementLineCodes[1],
                partnerLineCode: elementLineCodes[1],
                elementLineCodes,
                memberLineCodes: elementLineCodes,
                allLineCodes: [groupLineCode, ...elementLineCodes],
                elementRoles,
                warnings,
                createdAt: now,
                updatedAt: now
            };
            const previousGroupIds = new Set(
                [groupLine, ...elementLines]
                    .map((row) => getFrontBackGroupFromLine(row)?.groupId)
                    .filter(Boolean)
            );
            for (const row of lines) {
                const currentGroup = getFrontBackGroupFromLine(row);
                if (!currentGroup || !previousGroupIds.has(currentGroup.groupId)) continue;
                const rawData = { ...(row.raw_data || {}) };
                delete rawData.grupoFrenteDorso;
                delete rawData.grupo_frente_dorso;
                delete rawData['Grupo_Frente_Dorso'];
                applyCalculationLineSummary(rawData, row);
                await client.query(
                    `UPDATE flexo_calculations
                        SET raw_data = $2::jsonb
                      WHERE calculation_code = $1`,
                    [row.calculation_code, JSON.stringify(rawData)]
                );
            }
            for (const row of [groupLine, ...elementLines]) {
                const lineCode = normalizeFrontBackLineCode(row.line_code);
                const isGroupLine = lineCode === groupLineCode;
                const rawData = applyFrontBackQuantityToRawData({ ...(row.raw_data || {}) }, groupQuantity);
                delete rawData['Grupo_Frente_Dorso'];
                delete rawData.grupo_frente_dorso;
                rawData.grupoFrenteDorso = {
                    ...baseGroup,
                    role: isGroupLine ? 'grupo' : 'elemento',
                    elementRole: isGroupLine ? '' : elementRoles[lineCode]
                };
                applyCalculationLineSummary(rawData, { ...row, quantity: groupQuantity });
                await client.query(
                    `UPDATE flexo_calculations
                        SET quantity = $2,
                            raw_data = $3::jsonb
                      WHERE calculation_code = $1`,
                    [row.calculation_code, groupQuantity, JSON.stringify(rawData)]
                );
            }
            return {
                group: baseGroup,
                lines: await getLatestQuoteCalculationRows(codigo, client)
            };
        });
        res.json({ ok: true, group: result.group, lineas: result.lines.map(mapCalculationLine) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible guardar frente/dorso.' });
    }
});

app.delete('/api/cotizaciones/:codigo/frente-dorso/:grupo', async (req, res) => {
    try {
        const { codigo, grupo } = req.params;
        const groupId = normalizeFrontBackLineCode(grupo);
        if (!groupId) return res.status(400).json({ error: 'Grupo frente/dorso inválido.' });
        const result = await withTransaction(async (client) => {
            const lines = await getLatestQuoteCalculationRows(codigo, client);
            for (const row of lines) {
                const rawData = { ...(row.raw_data || {}) };
                const group = normalizeFrontBackGroup(rawData);
                if (!group || group.groupId !== groupId) continue;
                delete rawData.grupoFrenteDorso;
                delete rawData.grupo_frente_dorso;
                delete rawData['Grupo_Frente_Dorso'];
                applyCalculationLineSummary(rawData, row);
                await client.query(
                    `UPDATE flexo_calculations
                        SET raw_data = $2::jsonb
                      WHERE calculation_code = $1`,
                    [row.calculation_code, JSON.stringify(rawData)]
                );
            }
            return await getLatestQuoteCalculationRows(codigo, client);
        });
        res.json({ ok: true, lineas: result.map(mapCalculationLine) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible quitar frente/dorso.' });
    }
});

app.patch('/api/cotizaciones/:codigo/lineas/:linea', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const incomingPayload = req.body || {};
        const payload = { ...incomingPayload };
        const existing = await pgQuery(
            `SELECT calculation_code, raw_data
               FROM flexo_calculations
              WHERE quote_code = $1 AND line_code = $2
              ORDER BY created_at DESC NULLS LAST
              LIMIT 1`,
            [codigo, linea]
        );

        if (!existing.rows.length) {
            return res.status(404).json({ error: 'Línea no encontrada.' });
        }
        const existingGroup = normalizeFrontBackGroup(existing.rows[0].raw_data || {});
        if (existingGroup && existingGroup.role === 'elemento') {
            const groupContext = await loadFrontBackGroupContext(codigo, { quote_code: codigo, line_code: linea, raw_data: existing.rows[0].raw_data });
            const groupQuantity = frontBackLineQuantity(groupContext.groupLine);
            payload.quantity = groupQuantity;
            payload.quantityProducts = groupQuantity;
        }

        const hasMachinePayload = Object.prototype.hasOwnProperty.call(payload, 'machine_name');
        const machineName = hasMachinePayload ? await resolveSingleInventoryMachineName(payload.machine_name) : '';
        const rawPayload = { ...payload, quote_code: codigo, line_code: pickFirstValue(payload.line_code, linea) };
        if (hasMachinePayload) rawPayload.machine_name = machineName;
        const rawData = buildCalculationRawData(
            rawPayload,
            existing.rows[0].raw_data || {}
        );
        rawData['Orden_Linea'] = normalizeLineOrder(payload.line_order, normalizeLineOrder(existing.rows[0].raw_data?.['Orden_Linea']));
        try {
            const catalogs = await loadFlexoCatalogsFromDb();
            const processType = pickFirstValue(payload.process_type, rawData['Proceso Productivo'], 'Convencional');
            const materialCode = pickFirstValue(payload.material_code, rawData['Material Digital | Id Material'], rawData['Material Convencional | Id Material']);
            const dieCode = pickFirstValue(payload.die_code, rawData['GENERAL | TROQUEL | ID']);
            const selectedMaterial = catalogs.materials.find((item) => String(item.code || '') === String(materialCode || '')) || null;
            const selectedDie = catalogs.dies.find((item) => String(item.code || '') === String(dieCode || '')) || null;
            const selectedMachine = catalogs.machines.find((item) => String(item.machineName || '') === String(machineName || rawData['DIGITAL | MAQUINA'] || rawData['CONV | MAQUINA'] || '')) || null;
            const selectedMounting = rawData['Seleccion_Automatica']?.mounting || null;
            const automaticPricing = await estimateAutomaticQuotePricing({
                rawData,
                processType,
                quantity: parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(rawData['Cantidad Productos']) ?? 0,
                selectedMachine,
                selectedMaterial,
                selectedDie,
                selectedMounting,
                costsConfig: await loadCostsConfig(),
                exchangeRate: payload.exchange_rate ?? payload.exchangeRate ?? 1
            });
            rawData['GENERAL | 5 | SUBTOTAL'] = automaticPricing.baseCost;
            rawData['GENERAL | 7 | SUBTOTAL CALC ANTES IV | DOL'] = automaticPricing.subtotalBeforeTax;
            rawData['GENERAL | 8 | PORCENTAJE IVA'] = automaticPricing.taxPercent;
            rawData['GENERAL | 9 | Impuestos'] = automaticPricing.taxAmount;
            rawData['GENERAL | 7 | TOTAL | DOL'] = automaticPricing.subtotalBeforeTax;
            rawData['GENERAL | 9 | TOTAL | DOL'] = automaticPricing.totalAmount;
            rawData['GENERAL | 9 | UNITARIO | DOL'] = automaticPricing.unitPrice;
            rawData['PRECIO UNITARIO'] = automaticPricing.unitPriceWithTax;
            rawData['PRECIO TOTAL AL FINALIZAR'] = automaticPricing.totalAmount;
            rawData['Precio_Automatico'] = {
                materialCost: automaticPricing.materialCost,
                productionCost: automaticPricing.productionCost,
                baseCost: automaticPricing.baseCost,
                subtotalBeforeTax: automaticPricing.subtotalBeforeTax,
                taxPercent: automaticPricing.taxPercent,
                taxAmount: automaticPricing.taxAmount,
                totalAmount: automaticPricing.totalAmount,
                unitPrice: automaticPricing.unitPrice,
                unitPriceWithTax: automaticPricing.unitPriceWithTax,
                processBreakdown: automaticPricing.processBreakdown
            };
            rawData['Instantanea_Planificacion'] = automaticPricing.planningSnapshot;
        } catch (pricingError) {
        }
        applyCurrencyFieldsToRawData(rawData, payload.exchange_rate ?? payload.exchangeRate);
        if (Object.prototype.hasOwnProperty.call(payload, 'finalized_for_order') || Object.prototype.hasOwnProperty.call(payload, 'finalizedForOrder')) {
            rawData['Finalizado_Para_Orden'] = Boolean(Object.prototype.hasOwnProperty.call(payload, 'finalized_for_order')
                ? payload.finalized_for_order
                : payload.finalizedForOrder);
        }
        const finalizeValidation = proformaBlockingMessagesFromRaw(rawData).join(' ');
        if (Boolean(rawData['Finalizado_Para_Orden']) && finalizeValidation) {
            throw new Error(finalizeValidation);
        }
        const normalizedGroup = normalizeFrontBackGroup(rawData);
        if (normalizedGroup) {
            applyFrontBackQuantityToRawData(rawData, parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(payload.quantityProducts) ?? parseLegacyNumber(rawData['Cantidad Productos']) ?? 0);
        }
        applyCalculationLineSummary(rawData, {
            quote_code: codigo,
            line_code: pickFirstValue(payload.line_code, linea),
            product_code: pickFirstValue(payload.product_code, payload.line_code, linea),
            customer_code: rawData['ID CLIENTE'],
            process_type: payload.process_type,
            machine_name: machineName,
            die_code: payload.die_code,
            material_code: payload.material_code,
            quantity: parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(payload.quantityProducts),
            total_cost: parseLegacyNumber(rawData['PRECIO TOTAL AL FINALIZAR']),
            unit_price: parseLegacyNumber(rawData['GENERAL | 9 | UNITARIO | DOL'])
        });

        await pgQuery(
            `UPDATE flexo_calculations
                SET line_code = $3,
                    product_code = $4,
                    process_type = $5,
                    machine_name = $6,
                    die_code = $7,
                    material_code = $8,
                    quantity = $9,
                    total_cost = $10,
                    unit_price = $11,
                    raw_data = $12::jsonb
              WHERE calculation_code = $1 AND quote_code = $2`,
            [
                existing.rows[0].calculation_code,
                codigo,
                pickFirstValue(payload.line_code, linea),
                pickFirstValue(payload.product_code, payload.line_code, linea),
                pickFirstValue(payload.process_type),
                machineName || null,
                pickFirstValue(payload.die_code),
                pickFirstValue(payload.material_code),
                parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(payload.quantityProducts),
                parseLegacyNumber(rawData['PRECIO TOTAL AL FINALIZAR']),
                parseLegacyNumber(rawData['GENERAL | 9 | UNITARIO | DOL']),
                JSON.stringify(rawData)
            ]
        );

        if (normalizedGroup && normalizedGroup.role === 'grupo') {
            await syncFrontBackGroupQuantity({
                quoteCode: codigo,
                group: normalizedGroup,
                quantity: parseLegacyNumber(payload.quantity) ?? parseLegacyNumber(payload.quantityProducts) ?? parseLegacyNumber(rawData['Cantidad Productos']) ?? 0
            });
        }

        const detail = await pgQuery(
            `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                    quantity, subtotal_cost, total_cost, unit_price, raw_data
               FROM flexo_calculations
              WHERE calculation_code = $1`,
            [existing.rows[0].calculation_code]
        );
        let sapExport = null;
        const detailGroup = getFrontBackGroupFromLine(detail.rows[0]);
        if (!Boolean(payload.skipSapExportStage) && Boolean(detail.rows[0]?.raw_data?.['Finalizado_Para_Orden']) && (!detailGroup || detailGroup.role === 'grupo')) {
            const quoteResult = await pgQuery(`SELECT * FROM quotes WHERE quote_code = $1 LIMIT 1`, [codigo]);
            sapExport = await tryStageSapExportsForQuoteLine({
                quoteRow: quoteResult.rows[0] || null,
                lineRow: detail.rows[0]
            });
        }
        res.json({ linea: mapCalculationLine(detail.rows[0]), calculo: mapFlexoCalculationDetail(detail.rows[0]), sapExport });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible guardar la línea.' });
    }
});

app.get('/api/cotizaciones-destino', async (req, res) => {
    try {
        const search = String(req.query.q || '').trim();
        const excludeQuote = String(req.query.excludeQuote || '').trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
        const values = [];
        const filters = [];

        if (excludeQuote) {
            values.push(excludeQuote);
            filters.push(`q.quote_code <> $${values.length}`);
        }

        if (search) {
            values.push(`%${search}%`);
            filters.push(`(
                q.quote_code ILIKE $${values.length}
                OR COALESCE(q.customer_name, '') ILIKE $${values.length}
                OR COALESCE(q.salesperson_name, '') ILIKE $${values.length}
                OR EXISTS (
                    SELECT 1
                      FROM flexo_calculations fc_search
                     WHERE fc_search.quote_code = q.quote_code
                       AND (
                            COALESCE(fc_search.line_code, '') ILIKE $${values.length}
                            OR COALESCE(fc_search.product_code, '') ILIKE $${values.length}
                            OR COALESCE(fc_search.process_type, '') ILIKE $${values.length}
                            OR COALESCE(fc_search.machine_name, '') ILIKE $${values.length}
                            OR COALESCE(fc_search.material_code, '') ILIKE $${values.length}
                            OR COALESCE(fc_search.die_code, '') ILIKE $${values.length}
                       )
                )
            )`);
        }

        values.push(limit);
        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const result = await pgQuery(
            `SELECT q.quote_code,
                    q.customer_code,
                    q.customer_name,
                    q.salesperson_name,
                    q.created_on,
                    q.status,
                    latest.line_code AS latest_line_code,
                    latest.product_code AS latest_product_code,
                    latest.process_type AS latest_process_type,
                    latest.machine_name AS latest_machine_name,
                    latest.material_code AS latest_material_code,
                    latest.die_code AS latest_die_code,
                    product.product_name AS latest_product_name
               FROM quotes q
               LEFT JOIN LATERAL (
                    SELECT line_code, product_code, process_type, machine_name, material_code, die_code
                      FROM flexo_calculations fc
                     WHERE fc.quote_code = q.quote_code
                     ORDER BY fc.created_at DESC NULLS LAST
                     LIMIT 1
               ) latest ON TRUE
               LEFT JOIN flexo_products product
                 ON product.quote_code = q.quote_code
                AND product.line_code = latest.line_code
               ${whereClause}
              ORDER BY q.created_on DESC NULLS LAST, q.quote_code DESC
              LIMIT $${values.length}`,
            values
        );

        res.json({
            items: result.rows.map((row) => ({
                quote_code: row.quote_code,
                customer_code: pickFirstValue(row.customer_code),
                customer_name: pickFirstValue(row.customer_name),
                job_name: pickFirstValue(row.latest_product_name, row.latest_product_code, row.latest_line_code, ''),
                product_name: pickFirstValue(row.latest_product_name, row.latest_product_code, ''),
                line_code: row.latest_line_code || '',
                salesperson_name: pickFirstValue(row.salesperson_name, ''),
                machine_name: pickFirstValue(row.latest_machine_name, ''),
                process_type: pickFirstValue(row.latest_process_type, ''),
                material_name: pickFirstValue(row.latest_material_code, ''),
                die_code: pickFirstValue(row.latest_die_code, ''),
                created_on: row.created_on || '',
                status: pickFirstValue(row.status, 'Borrador')
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible buscar cotizaciones destino.' });
    }
});

app.post('/api/cotizaciones/:codigo/lineas/:linea/duplicar', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const duplicated = await withTransaction(async (client) => {
            const context = await getQuoteLineContext(codigo, linea, client);
            if (!context.quote || !context.line) {
                throw new Error('No se encontró la línea a duplicar.');
            }
            return cloneCalculationToQuote({
                sourceRow: context.line,
                targetQuote: context.quote,
                traceability: {
                    action: 'duplicate-line',
                    sourceQuoteCode: codigo,
                    sourceLineCode: linea,
                    actor: getConfiguredCurrentUser()
                }
            });
        });

        res.json({
            ok: true,
            linea: mapCalculationLine(duplicated),
            calculo: mapFlexoCalculationDetail(duplicated)
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible duplicar la línea.' });
    }
});

app.post('/api/cotizaciones/:codigo/lineas/:linea/copiar', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const targetQuoteCode = String(req.body?.targetQuoteCode || '').trim();
        if (!targetQuoteCode) {
            return res.status(400).json({ error: 'Debes indicar la cotización destino.' });
        }

        const copied = await withTransaction(async (client) => {
            const sourceContext = await getQuoteLineContext(codigo, linea, client);
            const targetContext = await getQuoteLineContext(targetQuoteCode, '__header_only__', client);
            if (!sourceContext.line) {
                throw new Error('No se encontró la línea origen.');
            }
            if (!targetContext.quote) {
                throw new Error('No se encontró la cotización destino.');
            }
            return cloneCalculationToQuote({
                sourceRow: sourceContext.line,
                targetQuote: targetContext.quote,
                traceability: {
                    action: 'copy-to-quote',
                    sourceQuoteCode: codigo,
                    sourceLineCode: linea,
                    actor: getConfiguredCurrentUser()
                }
            });
        });

        res.json({
            ok: true,
            linea: mapCalculationLine(copied),
            calculo: mapFlexoCalculationDetail(copied)
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible copiar la línea a otra cotización.' });
    }
});

app.post('/api/cotizaciones/:codigo/lineas/:linea/nueva-cotizacion', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const result = await withTransaction(async (client) => {
            const context = await getQuoteLineContext(codigo, linea, client);
            if (!context.quote || !context.line) {
                throw new Error('No se encontró la línea origen.');
            }

            const quoteCode = await generateNextQuoteCode(client);
            const sourceQuote = context.quote;
            const createdBy = getConfiguredCurrentUser();
            const createdAt = new Date().toISOString();
            const rawData = buildQuoteRawData({
                quote_code: quoteCode,
                customer_code: sourceQuote.customer_code,
                customer_name: sourceQuote.customer_name,
                contact_name: sourceQuote.contact_name,
                email: sourceQuote.email,
                salesperson_name: sourceQuote.salesperson_name,
                phone: sourceQuote.phone,
                status: sourceQuote.status || 'Borrador',
                created_on: createdAt.slice(0, 10),
                due_on: sourceQuote.due_on || createdAt.slice(0, 10)
            }, sourceQuote.raw_data || {});
            rawData['TRAZABILIDAD | ACCION'] = 'create-quote-from-line';
            rawData['TRAZABILIDAD | USUARIO'] = createdBy;
            rawData['TRAZABILIDAD | FECHA'] = createdAt;
            rawData['TRAZABILIDAD | COTIZACION ORIGEN'] = codigo;
            rawData['TRAZABILIDAD | LINEA ORIGEN'] = linea;
            rawData.traceability = buildTraceabilityMetadata({
                action: 'create-quote-from-line',
                sourceQuoteCode: codigo,
                sourceLineCode: linea,
                actor: createdBy,
                timestamp: createdAt
            });

            await client.query(
                `INSERT INTO quotes (
                    quote_code, customer_code, customer_name, contact_name, email, salesperson_name, phone, status, created_on, due_on, raw_data
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
                [
                    quoteCode,
                    sourceQuote.customer_code,
                    sourceQuote.customer_name,
                    sourceQuote.contact_name,
                    sourceQuote.email,
                    sourceQuote.salesperson_name,
                    sourceQuote.phone,
                    sourceQuote.status || 'Borrador',
                    createdAt.slice(0, 10),
                    sourceQuote.due_on || createdAt.slice(0, 10),
                    JSON.stringify(rawData)
                ]
            );

            const clonedLine = await cloneCalculationToQuote({
                sourceRow: context.line,
                targetQuote: {
                    ...sourceQuote,
                    quote_code: quoteCode,
                    raw_data: rawData
                },
                traceability: {
                    action: 'create-quote-from-line',
                    sourceQuoteCode: codigo,
                    sourceLineCode: linea,
                    actor: createdBy,
                    timestamp: createdAt
                }
            });

            const quoteResult = await client.query(`SELECT * FROM quotes WHERE quote_code = $1 LIMIT 1`, [quoteCode]);
            return {
                quote: quoteResult.rows[0],
                line: clonedLine
            };
        });

        res.json({
            ok: true,
            cotizacion: mapQuoteHeader(result.quote),
            linea: mapCalculationLine(result.line),
            calculo: mapFlexoCalculationDetail(result.line)
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible crear una nueva cotización desde la línea.' });
    }
});

app.get('/api/cotizaciones/:codigo/lineas/:linea/adjuntos', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const context = await getQuoteLineContext(codigo, linea);
        if (!context.line) {
            return res.status(404).json({ error: 'No se encontró la línea.' });
        }
        const stored = await getStoredAttachments(codigo, linea);
        res.json({
            items: [
                ...stored.map((item) => ({
                    id: item.id,
                    key: item.file_name,
                    label: item.file_name,
                    value: item.file_name,
                    mime_type: item.mime_type,
                    file_ext: item.file_ext,
                    notes: item.notes,
                    uploaded_by: item.uploaded_by,
                    created_at: item.created_at,
                    size_bytes: Number(item.size_bytes || 0),
                    isStored: true
                })),
                ...extractLineAttachments(context.line)
            ]
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los adjuntos de la línea.' });
    }
});

app.post('/api/cotizaciones/:codigo/lineas/:linea/adjuntos', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const payload = req.body || {};
        const fileName = String(payload.fileName || '').trim();
        const contentBase64 = normalizeAttachmentBase64(payload.contentBase64);
        if (!fileName || !contentBase64) {
            return res.status(400).json({ error: 'Debes indicar el nombre y contenido del archivo.' });
        }
        const context = await getQuoteLineContext(codigo, linea);
        if (!context.line) {
            return res.status(404).json({ error: 'No se encontró la línea para adjuntar archivos.' });
        }

        const attachmentId = crypto.randomUUID();
        let stored = null;
        let insert = null;
        try {
            stored = writeQuoteLineAttachmentFile({ id: attachmentId, quoteCode: codigo, lineCode: linea, fileName, contentBase64 });
            insert = await pgQuery(
                `INSERT INTO quote_line_attachments (
                    id, quote_code, line_code, file_name, mime_type, file_ext, content_base64, storage_path, size_bytes, content_sha256, notes, uploaded_by
                 ) VALUES ($1,$2,$3,$4,$5,$6,NULL,$7,$8,$9,$10,$11)
                 RETURNING id, quote_code, line_code, file_name, mime_type, file_ext, notes, uploaded_by, created_at,
                           COALESCE(size_bytes, 0) AS size_bytes`,
                [
                    attachmentId,
                    codigo,
                    linea,
                    fileName,
                    pickFirstValue(payload.mimeType, 'application/octet-stream'),
                    pickFirstValue(payload.fileExt, path.extname(fileName).replace('.', '')),
                    stored.storagePath,
                    stored.sizeBytes,
                    stored.contentSha256,
                    pickFirstValue(payload.notes),
                    pickFirstValue(payload.uploadedBy, 'admin')
                ]
            );
        } catch (error) {
            if (stored?.storagePath) deleteQuoteAttachmentFile(stored.storagePath);
            throw error;
        }

        res.json({ ok: true, adjunto: insert.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible guardar el adjunto.' });
    }
});

app.get('/api/adjuntos/:id/download', async (req, res) => {
    try {
        const result = await pgQuery(
            `SELECT file_name, mime_type, content_base64, storage_path
               FROM quote_line_attachments
              WHERE id = $1
              LIMIT 1`,
            [req.params.id]
        );
        if (!result.rows.length) {
            return res.status(404).send('Adjunto no encontrado.');
        }
        const attachment = result.rows[0];
        res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
        const absolutePath = resolveQuoteAttachmentStoragePath(attachment.storage_path);
        if (absolutePath && fs.existsSync(absolutePath)) {
            return res.sendFile(absolutePath);
        }
        const buffer = Buffer.from(String(attachment.content_base64 || ''), 'base64');
        if (!buffer.length) {
            return res.status(404).send('Archivo adjunto no encontrado en disco.');
        }
        res.send(buffer);
    } catch (error) {
        res.status(500).send(error.message || 'No fue posible descargar el adjunto.');
    }
});

app.delete('/api/adjuntos/:id', async (req, res) => {
    try {
        const result = await pgQuery(`DELETE FROM quote_line_attachments WHERE id = $1 RETURNING storage_path`, [req.params.id]);
        deleteQuoteAttachmentFiles(result.rows);
        res.json({ ok: true, deleted: result.rowCount || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible eliminar el adjunto.' });
    }
});

app.put('/api/adjuntos/:id', async (req, res) => {
    try {
        const payload = req.body || {};
        const fileName = String(payload.fileName || '').trim();
        const contentBase64 = normalizeAttachmentBase64(payload.contentBase64);
        if (!fileName || !contentBase64) {
            return res.status(400).json({ error: 'Debes indicar el nombre y contenido del archivo.' });
        }
        const current = await pgQuery(
            `SELECT id, quote_code, line_code, storage_path
               FROM quote_line_attachments
              WHERE id = $1
              LIMIT 1`,
            [req.params.id]
        );
        if (!current.rows.length) {
            return res.status(404).json({ error: 'Adjunto no encontrado.' });
        }
        const previous = current.rows[0];
        let stored = null;
        let result = null;
        try {
            stored = writeQuoteLineAttachmentFile({
                id: `${previous.id}-${Date.now()}`,
                quoteCode: previous.quote_code,
                lineCode: previous.line_code,
                fileName,
                contentBase64
            });
            result = await pgQuery(
                `UPDATE quote_line_attachments
                    SET file_name = $2,
                        mime_type = $3,
                        file_ext = $4,
                        content_base64 = NULL,
                        storage_path = $5,
                        size_bytes = $6,
                        content_sha256 = $7,
                        notes = COALESCE($8, notes),
                        uploaded_by = COALESCE($9, uploaded_by),
                        created_at = NOW()
                  WHERE id = $1
                  RETURNING id, quote_code, line_code, file_name, mime_type, file_ext, notes, uploaded_by, created_at,
                            COALESCE(size_bytes, 0) AS size_bytes`,
                [
                    req.params.id,
                    fileName,
                    pickFirstValue(payload.mimeType, 'application/octet-stream'),
                    pickFirstValue(payload.fileExt, path.extname(fileName).replace('.', '')),
                    stored.storagePath,
                    stored.sizeBytes,
                    stored.contentSha256,
                    payload.notes ?? null,
                    payload.uploadedBy ?? 'admin'
                ]
            );
        } catch (error) {
            if (stored?.storagePath) deleteQuoteAttachmentFile(stored.storagePath);
            throw error;
        }
        if (!result.rows.length) {
            if (stored?.storagePath) deleteQuoteAttachmentFile(stored.storagePath);
            return res.status(404).json({ error: 'Adjunto no encontrado.' });
        }
        if (previous.storage_path && previous.storage_path !== stored.storagePath) {
            deleteQuoteAttachmentFile(previous.storage_path);
        }
        res.json({ ok: true, adjunto: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible actualizar el adjunto.' });
    }
});

app.delete('/api/cotizaciones/:codigo/lineas/:linea', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const result = await withTransaction(async (client) => {
            const current = await client.query(
                `SELECT calculation_code, quote_code, line_code, raw_data
                   FROM flexo_calculations
                  WHERE quote_code = $1 AND line_code = $2
                  ORDER BY created_at DESC NULLS LAST
                  LIMIT 1`,
                [codigo, linea]
            );
            const group = current.rows.length ? getFrontBackGroupFromLine(current.rows[0]) : null;
            const deleted = await client.query(`DELETE FROM flexo_calculations WHERE quote_code = $1 AND line_code = $2`, [codigo, linea]);
            if (group) {
                const rows = await getLatestQuoteCalculationRows(codigo, client);
                for (const row of rows) {
                    const currentGroup = getFrontBackGroupFromLine(row);
                    if (!currentGroup || currentGroup.groupId !== group.groupId) continue;
                    const rawData = { ...(row.raw_data || {}) };
                    delete rawData.grupoFrenteDorso;
                    delete rawData.grupo_frente_dorso;
                    delete rawData['Grupo_Frente_Dorso'];
                    await client.query(
                        `UPDATE flexo_calculations
                            SET raw_data = $2::jsonb
                          WHERE calculation_code = $1`,
                        [row.calculation_code, JSON.stringify(rawData)]
                    );
                }
            }
            return deleted;
        });
        res.json({ ok: true, deleted: result.rowCount || 0 });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible eliminar la línea.' });
    }
});

app.get('/api/cotizaciones/:codigo/lineas/:linea/exportar', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const context = await getQuoteLineContext(codigo, linea);
        if (!context.line) {
            return res.status(404).json({ error: 'No se encontró la línea.' });
        }

        const workbook = XLSX.utils.book_new();
        const raw = context.line.raw_data || {};
        const headerRows = [
            { Campo: 'Cotización', Valor: codigo },
            { Campo: 'Cliente', Valor: pickFirstValue(context.quote?.customer_name, raw.CLIENTE, raw['CLIENTE NOMBRE']) },
            { Campo: 'ID Cliente', Valor: pickFirstValue(context.quote?.customer_code, raw['ID CLIENTE']) },
            { Campo: 'Dirigido a', Valor: pickFirstValue(context.quote?.contact_name, raw['CLIENTE | CONTACTO NOMBRE COMPLETO']) },
            { Campo: 'Correo', Valor: pickFirstValue(context.quote?.email, raw['CLIENTE | CONTACTO EMAIL']) },
            { Campo: 'Vendedor', Valor: pickFirstValue(context.quote?.salesperson_name, raw.VENDEDOR) },
            { Campo: 'Teléfono', Valor: pickFirstValue(context.quote?.phone, raw['CLIENTE | CONTACTO TELEFONO']) },
            { Campo: 'Creación', Valor: pickFirstValue(context.quote?.created_on, raw['FECHA CREACION']) },
            { Campo: 'Vencimiento', Valor: pickFirstValue(context.quote?.due_on, raw['FECHA VENCIMIENTO']) },
            { Campo: 'Estado cotización', Valor: pickFirstValue(context.quote?.status, raw['Estado Cotizacion']) }
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(headerRows), 'Encabezado');

        const lineRows = [
            { Campo: 'Línea', Valor: linea },
            { Campo: 'Departamento', Valor: pickFirstValue(raw.DEPARTAMENTO, 'Flexografia') },
            { Campo: 'Trabajo', Valor: pickFirstValue(raw['NOMBRE TRABAJO'], raw['Nombre Trabajo']) },
            { Campo: 'Proceso', Valor: pickFirstValue(context.line.process_type, raw['Proceso Productivo']) },
            { Campo: 'Máquina', Valor: pickFirstValue(context.line.machine_name, raw['CONV | MAQUINA'], raw['DIGITAL | MAQUINA']) },
            { Campo: 'Material', Valor: pickFirstValue(raw['GENERAL | MATERIAL'], context.line.material_code) },
            { Campo: 'Troquel', Valor: pickFirstValue(context.line.die_code, raw['GENERAL | TROQUEL | ID']) },
            { Campo: 'Cantidad', Valor: parseLegacyNumber(context.line.quantity) },
            { Campo: 'Ancho', Valor: parseLegacyNumber(raw['DIMENSIONES ETIQUETA | ANCHO']) },
            { Campo: 'Largo', Valor: parseLegacyNumber(raw['DIMENSIONES ETIQUETA | LARGO']) },
            { Campo: 'Cantidad tintas', Valor: parseLegacyNumber(raw['CANTIDAD TINTAS']) },
            { Campo: 'Estado línea', Valor: pickFirstValue(raw['SOLICITUD ESTADO'], raw['ESTADO LINEA']) },
            { Campo: 'Costo total', Valor: parseLegacyNumber(context.line.total_cost) },
            { Campo: 'Precio unitario', Valor: parseLegacyNumber(context.line.unit_price) },
            { Campo: 'Subtotal visible', Valor: parseLegacyNumber(raw['GENERAL | 9 | TOTAL | COL EXPORTAR REPORTE VENTAS']) || parseLegacyNumber(raw['PRECIO TOTAL AL FINALIZAR']) }
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(lineRows), 'Linea');

        const detailRows = Object.entries(raw)
            .filter(([key, value]) => value !== null && value !== undefined && value !== '')
            .map(([Campo, Valor]) => ({ Campo, Valor }));
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailRows), 'Detalle calculo');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=\"${codigo}-${linea}.xlsx\"`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible exportar la línea.' });
    }
});

app.post('/api/cotizaciones/:codigo/lineas/:linea/orden-produccion', async (req, res) => {
    try {
        const { codigo, linea } = req.params;
        const result = await withTransaction(async (client) => {
            const context = await getQuoteLineContext(codigo, linea, client);
            if (!context.line) {
                throw new Error('No se encontró la línea origen.');
            }
            const createOrderValidation = proformaBlockingMessagesFromRaw(context.line.raw_data || {}).join(' ');
            if (createOrderValidation) {
                throw new Error(createOrderValidation);
            }
            if (!Boolean(context.line.finalized_for_order ?? context.line.raw_data?.['Finalizado_Para_Orden'])) {
                throw new Error('La línea debe estar finalizada antes de crear una orden de producción.');
            }

            const groupContext = await loadFrontBackGroupContext(codigo, context.line, client);
            const groupMembers = groupContext.members;
            const frontBackGroup = groupContext.group;
            if (frontBackGroup) {
                const existingOrder = await client.query(
                    `SELECT * FROM flexo_orders
                      WHERE quote_code = $1
                        AND COALESCE(raw_data->'grupo_frente_dorso'->>'groupId', raw_data->'front_back_group'->>'groupId') = $2
                      ORDER BY created_at DESC NULLS LAST
                      LIMIT 1`,
                    [codigo, frontBackGroup.groupId]
                );
                if (existingOrder.rows.length) {
                    return existingOrder.rows[0];
                }
            }
            const orderLine = frontBackGroup ? (groupContext.groupLine || context.line) : context.line;
            const orderCode = await generateNextOrderCode(client);
            const attachments = groupMembers.flatMap((row) => extractLineAttachments(row));
            let rawData = buildProductionOrderRawData({
                orderCode,
                quoteRow: context.quote,
                lineRow: orderLine,
                attachments,
                groupMembers,
                actor: getRequestUserName(req, context.quote?.salesperson_name)
            });
            rawData = await enrichOrderRawDataWithPlanningSnapshot(rawData, client);

            const selectedQuantity = parseLegacyNumber(req.body?.quantity);
            if (selectedQuantity > 0) {
                rawData.totals = rawData.totals || {};
                rawData.totals.quantity = selectedQuantity;
            }

            await client.query(
                `INSERT INTO flexo_orders (
                    order_code, quote_code, line_code, product_code, machine_name, material_code, die_code, ordered_quantity, raw_data
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
                [
                    orderCode,
                    codigo,
                    orderLine.line_code,
                    orderLine.product_code,
                    orderLine.machine_name,
                    orderLine.material_code,
                    orderLine.die_code,
                    rawData.totals?.quantity ?? parseLegacyNumber(orderLine.quantity),
                    JSON.stringify(rawData)
                ]
            );
            await closeQuoteProforma(codigo, 'order_generated', client);

            const orderResult = await client.query(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [orderCode]);
            const savedOrder = orderResult.rows[0];
            await ensurePlanningRoutesForOrder(savedOrder, await loadPlanningReferenceMaps(client), {
                client,
                costsConfig: await loadCostsConfig()
            });
            return savedOrder;
        });

        res.json({
            ok: true,
            orden: result
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible crear la orden de producción.' });
    }
});

app.get('/api/ordenes-produccion/:codigo', async (req, res) => {
    try {
        const result = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [req.params.codigo]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Orden de producción no encontrada.' });
        }
        if (result.rows[0].raw_data) normalizeCalculationKeys(result.rows[0].raw_data);
        const orden = result.rows[0];
        if (orden.raw_data) {
            normalizeCalculationKeys(orden.raw_data);
            if (!orden.raw_data.printing) {
                orden.raw_data.printing = extractPrintingData(orden.raw_data);
            }
            const needsContact = !orden.raw_data.contact_name && !orden.raw_data.phone && !orden.raw_data.email;
            if (needsContact && orden.customer_code) {
                try {
                    const contactResult = await pgQuery(
                        `SELECT contact_name, email, phone, mobile FROM business_partner_contacts WHERE partner_code = $1 ORDER BY is_legal_representative DESC, created_at ASC NULLS LAST LIMIT 1`,
                        [orden.customer_code]
                    );
                    if (contactResult.rows.length) {
                        const c = contactResult.rows[0];
                        orden.raw_data.contact_name = orden.raw_data.contact_name || c.contact_name || null;
                        orden.raw_data.phone = orden.raw_data.phone || c.phone || c.mobile || null;
                        orden.raw_data.email = orden.raw_data.email || c.email || null;
                        if (orden.raw_data.quote_snapshot) {
                            orden.raw_data.quote_snapshot.contact_name = orden.raw_data.quote_snapshot.contact_name || orden.raw_data.contact_name;
                            orden.raw_data.quote_snapshot.phone = orden.raw_data.quote_snapshot.phone || orden.raw_data.phone;
                            orden.raw_data.quote_snapshot.email = orden.raw_data.quote_snapshot.email || orden.raw_data.email;
                        }
                    }
                } catch (_) {}
            }
            if (needsContact && !orden.raw_data.contact_name && !orden.raw_data.phone && !orden.raw_data.email && orden.customer_code) {
                try {
                    const partnerResult = await pgQuery(
                        `SELECT raw_data FROM business_partners WHERE partner_code = $1 LIMIT 1`,
                        [orden.customer_code]
                    );
                    if (partnerResult.rows.length) {
                        const pRaw = partnerResult.rows[0].raw_data || {};
                        orden.raw_data.contact_name = orden.raw_data.contact_name || pRaw.contact_name || pRaw['CLIENTE | CONTACTO NOMBRE COMPLETO'] || null;
                        orden.raw_data.phone = orden.raw_data.phone || pRaw.phone || pRaw['CLIENTE | CONTACTO TELEFONO'] || null;
                        orden.raw_data.email = orden.raw_data.email || pRaw.email || pRaw['CLIENTE | CONTACTO EMAIL'] || null;
                        if (orden.raw_data.quote_snapshot) {
                            orden.raw_data.quote_snapshot.contact_name = orden.raw_data.quote_snapshot.contact_name || orden.raw_data.contact_name;
                            orden.raw_data.quote_snapshot.phone = orden.raw_data.quote_snapshot.phone || orden.raw_data.phone;
                            orden.raw_data.quote_snapshot.email = orden.raw_data.quote_snapshot.email || orden.raw_data.email;
                        }
                    }
                } catch (_) {}
            }
            if (!orden.raw_data.contact_name && !orden.raw_data.phone && !orden.raw_data.email && orden.source_quote_code) {
                try {
                    const quoteResult = await pgQuery(`SELECT raw_data FROM cotizaciones WHERE quote_code = $1 LIMIT 1`, [orden.source_quote_code]);
                    if (quoteResult.rows.length) {
                        const qRaw = quoteResult.rows[0].raw_data || {};
                        orden.raw_data.contact_name = orden.raw_data.contact_name || pickFirstValue(qRaw['CLIENTE | CONTACTO NOMBRE COMPLETO'], qRaw.contact_name);
                        orden.raw_data.phone = orden.raw_data.phone || pickFirstValue(qRaw['CLIENTE | CONTACTO TELEFONO'], qRaw.phone);
                        orden.raw_data.email = orden.raw_data.email || pickFirstValue(qRaw['CLIENTE | CONTACTO EMAIL'], qRaw.email);
                        if (orden.raw_data.quote_snapshot) {
                            orden.raw_data.quote_snapshot.contact_name = orden.raw_data.quote_snapshot.contact_name || orden.raw_data.contact_name;
                            orden.raw_data.quote_snapshot.phone = orden.raw_data.quote_snapshot.phone || orden.raw_data.phone;
                            orden.raw_data.quote_snapshot.email = orden.raw_data.quote_snapshot.email || orden.raw_data.email;
                        }
                    }
                } catch (_) {}
            }
        }
        if (orden.raw_data && (orden.raw_data.contact_name || orden.raw_data.phone || orden.raw_data.email)) {
            try {
                await pgQuery(
                    `UPDATE flexo_orders
                        SET raw_data = raw_data
                            || jsonb_build_object('contact_name', to_jsonb($2::text))
                            || jsonb_build_object('phone', to_jsonb($3::text))
                            || jsonb_build_object('email', to_jsonb($4::text))
                      WHERE order_code = $1`,
                    [req.params.codigo, orden.raw_data.contact_name || null, orden.raw_data.phone || null, orden.raw_data.email || null]
                );
            } catch (_) {}
        }
        res.json({ orden });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar la orden de producción.' });
    }
});

app.patch('/api/ordenes-produccion/:codigo/details', async (req, res) => {
    try {
        const orderResult = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [req.params.codigo]);
        if (!orderResult.rows.length) {
            return res.status(404).json({ error: 'Orden de producción no encontrada.' });
        }

        const payload = req.body || {};
        const current = orderResult.rows[0];
        if (current.raw_data) normalizeCalculationKeys(current.raw_data);
        const rawData = { ...(current.raw_data || {}) };
        const lineSnapshot = { ...(rawData.line_snapshot || {}) };
        const lineRaw = { ...(lineSnapshot.raw_data || {}) };

        if (payload.samples && typeof payload.samples === 'object') {
            lineRaw['MUESTRAS | TIPO'] = pickFirstValue(payload.samples.mode);
            lineRaw['MUESTRAS | VISTO BUENO'] = pickFirstValue(payload.samples.approval);
            lineRaw['MUESTRAS | CONTACTO'] = pickFirstValue(payload.samples.contact);
            lineRaw['MUESTRAS | TELEFONO'] = pickFirstValue(payload.samples.phone);
            lineRaw['MUESTRAS | EMAIL'] = pickFirstValue(payload.samples.email);
            lineRaw['MUESTRAS | DIRECCION'] = pickFirstValue(payload.samples.address);
            lineRaw['MUESTRAS | DETALLE'] = pickFirstValue(payload.samples.detail);
        }

        if (payload.delivery && typeof payload.delivery === 'object') {
            lineRaw['ENTREGA | TIPO'] = pickFirstValue(payload.delivery.mode);
            lineRaw['ENTREGA | CONTACTO'] = pickFirstValue(payload.delivery.contact);
            lineRaw['ENTREGA | TELEFONO'] = pickFirstValue(payload.delivery.phone);
            lineRaw['ENTREGA | EMAIL'] = pickFirstValue(payload.delivery.email);
            lineRaw['ENTREGA | DETALLE'] = pickFirstValue(payload.delivery.detail);
            if (Object.prototype.hasOwnProperty.call(payload.delivery, 'schedule')) {
                lineRaw['ENTREGA | PROGRAMACION'] = Array.isArray(payload.delivery.schedule)
                    ? payload.delivery.schedule
                        .map((row) => ({
                            quantity: pickFirstValue(row?.quantity),
                            date: pickFirstValue(row?.date)
                        }))
                        .filter((row) => row.quantity && row.date)
                    : [];
            }
        }

        if (payload.planningControl && typeof payload.planningControl === 'object') {
            const controlUpdates = {};
            if (Object.prototype.hasOwnProperty.call(payload.planningControl, 'scheduledDeliveryDate')) {
                controlUpdates.scheduledDeliveryDate = payload.planningControl.scheduledDeliveryDate || null;
            }
            if (Object.prototype.hasOwnProperty.call(payload.planningControl, 'promisedDeliveryDate')) {
                controlUpdates.promisedDeliveryDate = payload.planningControl.promisedDeliveryDate || null;
            }
            if (Object.keys(controlUpdates).length) {
                rawData.planning_control = {
                    ...getOrderPlanningControl(rawData),
                    ...controlUpdates,
                    scheduleUpdatedAt: new Date().toISOString(),
                    scheduleUpdatedBy: getRequestUserName(req)
                };
            }
        }

        if (payload.art && typeof payload.art === 'object') {
            lineRaw['COMENTARIOS VENDEDOR'] = pickFirstValue(payload.art.comments);
            lineRaw['ARTE EN PODER DE'] = pickFirstValue(payload.art.artworkHolder);
        }

        if (payload.notes && typeof payload.notes === 'object') {
            lineRaw['ACABADOS | OBSERVACIONES'] = pickFirstValue(payload.notes.finishNotes);
        }

        lineSnapshot.raw_data = lineRaw;
        rawData.line_snapshot = lineSnapshot;

        await pgQuery(
            `UPDATE flexo_orders
                SET raw_data = $2::jsonb
              WHERE order_code = $1`,
            [req.params.codigo, JSON.stringify(rawData)]
        );

        const updated = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [req.params.codigo]);
        const patched = updated.rows[0];
        if (patched.raw_data && !patched.raw_data.printing) {
            patched.raw_data.printing = extractPrintingData(patched.raw_data);
        }
        res.json({ ok: true, orden: patched });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible actualizar los datos de la orden.' });
    }
});

app.get('/api/ordenes-produccion', async (req, res) => {
    try {
        const search = String(req.query.q || '').trim();
        const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
        const values = [];
        let whereClause = '';
        if (search) {
            values.push(`%${search}%`);
            whereClause = `WHERE o.order_code ILIKE $1
                OR o.quote_code ILIKE $1
                OR COALESCE(o.line_code, '') ILIKE $1
                OR COALESCE(o.machine_name, '') ILIKE $1
                OR COALESCE(o.material_code, '') ILIKE $1
                OR COALESCE(o.die_code, '') ILIKE $1
                OR COALESCE(q.customer_name, '') ILIKE $1
                OR COALESCE(q.salesperson_name, '') ILIKE $1
                OR COALESCE(fc.product_code, '') ILIKE $1
                OR COALESCE(fc.process_type, '') ILIKE $1
                OR COALESCE(fp.product_name, '') ILIKE $1`;
        }

        values.push(limit);
        const result = await pgQuery(
            `SELECT o.order_code,
                    o.quote_code,
                    o.line_code,
                    o.machine_name,
                    o.material_code,
                    o.die_code,
                    o.ordered_quantity,
                    o.created_at,
                    q.customer_name,
                    q.salesperson_name,
                    fc.process_type,
                    fc.product_code,
                    fp.product_name
               FROM flexo_orders o
          LEFT JOIN quotes q
                 ON q.quote_code = o.quote_code
          LEFT JOIN LATERAL (
                    SELECT process_type, product_code
                      FROM flexo_calculations fc
                     WHERE fc.quote_code = o.quote_code
                       AND fc.line_code = o.line_code
                     ORDER BY fc.created_at DESC NULLS LAST
                     LIMIT 1
               ) fc ON TRUE
          LEFT JOIN flexo_products fp
                 ON fp.quote_code = o.quote_code
                AND fp.line_code = o.line_code
               ${whereClause}
              ORDER BY o.created_at DESC
              LIMIT $${values.length}`,
            values
        );
        res.json({
            items: result.rows.map((row) => ({
                planning: buildOrderPlanningSummary({ ...row, raw_data: {} }),
                order_code: row.order_code,
                quote_code: row.quote_code,
                line_code: row.line_code,
                customer_name: row.customer_name || '',
                job_name: row.product_name || row.product_code || '',
                product_name: row.product_name || row.product_code || '',
                salesperson_name: row.salesperson_name || '',
                machine_name: row.machine_name || '',
                process_type: row.process_type || '',
                material_name: row.material_code || '',
                die_code: row.die_code || '',
                ordered_quantity: row.ordered_quantity,
                created_at: row.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar las órdenes de producción.' });
    }
});

app.patch('/api/ordenes-produccion/:codigo/planning-control', async (req, res) => {
    try {
        const action = String(req.body?.action || '').trim().toLowerCase();
        if (!action) {
            return res.status(400).json({ ok: false, error: 'Debes indicar la acción de planificación.' });
        }

        const orderResult = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [req.params.codigo]);
        if (!orderResult.rows.length) {
            return res.status(404).json({ ok: false, error: 'Orden no encontrada.' });
        }

        const orderRow = orderResult.rows[0];
        const rawData = orderRow.raw_data || {};
        const control = getOrderPlanningControl(rawData);
        const actor = getRequestUserName(req);
        const nowIso = new Date().toISOString();
        let nextRawData = rawData;

        if (action === 'release-sales') {
            nextRawData = withUpdatedOrderPlanningControl(rawData, {
                salesReleased: true,
                salesReleasedAt: nowIso,
                salesReleasedBy: actor,
                planningStatus: 'PENDIENTE_PLANIFICACION',
                launchedToGantt: false,
                launchedAt: null,
                launchedBy: '',
                returnedAt: null,
                returnedBy: '',
                returnReason: ''
            });
        } else if (action === 'launch-gantt') {
            if (control.planningStatus !== 'PENDIENTE_PLANIFICACION' && control.planningStatus !== 'EN_GANTT') {
                return res.status(400).json({ ok: false, error: 'La orden debe estar pendiente de planificación antes de lanzarla al Gantt.' });
            }
            nextRawData = withUpdatedOrderPlanningControl(rawData, {
                salesReleased: true,
                planningStatus: 'EN_GANTT',
                launchedToGantt: true,
                launchedAt: nowIso,
                launchedBy: actor,
                returnReason: ''
            });
        } else if (action === 'return-sales') {
            nextRawData = withUpdatedOrderPlanningControl(rawData, {
                salesReleased: false,
                planningStatus: 'DEVUELTA_VENTAS',
                launchedToGantt: false,
                launchedAt: null,
                launchedBy: '',
                returnedAt: nowIso,
                returnedBy: actor,
                returnReason: String(req.body?.reason || '').trim()
            });
        } else if (action === 'update-processes') {
            const selectedProcessKeys = normalizePlanningProcessKeys(req.body?.selectedProcessKeys || []);
            if (!selectedProcessKeys.length) {
                return res.status(400).json({ ok: false, error: 'Debes dejar al menos un proceso de planificación seleccionado.' });
            }
            nextRawData = withUpdatedOrderPlanningControl(rawData, {
                selectedProcessKeys,
                processSelectionUpdatedAt: nowIso,
                processSelectionUpdatedBy: actor
            });
        } else {
            return res.status(400).json({ ok: false, error: 'Acción de planificación no reconocida.' });
        }

        await pgQuery(
            `UPDATE flexo_orders
                SET raw_data = $2::jsonb
              WHERE order_code = $1`,
            [req.params.codigo, JSON.stringify(nextRawData)]
        );

        if (action === 'launch-gantt' || (action === 'update-processes' && control.planningStatus === 'EN_GANTT')) {
            const refreshedOrder = { ...orderRow, raw_data: nextRawData };
            await ensurePlanningRoutesForOrder(refreshedOrder, null, { replaceExisting: true });
        }

        const updated = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [req.params.codigo]);
        res.json({
            ok: true,
            orden: updated.rows[0],
            planning: buildOrderPlanningSummary(updated.rows[0])
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible actualizar el control de planificación.' });
    }
});

app.get('/api/planificacion/lanzamiento', async (req, res) => {
    try {
        const [result, processResult] = await Promise.all([
            pgQuery(`
                SELECT order_code, quote_code, line_code, product_code, machine_name, material_code, die_code,
                       ordered_quantity, delivered_on, raw_data, created_at
                  FROM flexo_orders
                 ORDER BY created_at DESC
            `),
            pgQuery(`
                SELECT process_key, process_name, sequence_order, color_hex, icon_key, is_active
                  FROM production_process_definitions
                 WHERE is_active = TRUE
                 ORDER BY sequence_order, process_name
            `)
        ]);

        const configuredProcesses = processResult.rows
            .map((row) => ({
                key: canonicalPlanningProcessKey(row.process_key || row.process_name),
                label: PLANNING_PROCESS_LABELS[canonicalPlanningProcessKey(row.process_key || row.process_name)] || row.process_name,
                colorHex: row.color_hex || '#378ADD',
                iconKey: row.icon_key || '',
                order: Number(row.sequence_order || 999)
            }))
            .filter((row, index, rows) => row.key
                && PLANNING_CLASSIFICATION_PROCESS_KEYS.includes(row.key)
                && rows.findIndex((item) => item.key === row.key) === index);
        const planningProcesses = configuredProcesses.length
            ? configuredProcesses
            : PLANNING_CLASSIFICATION_PROCESS_KEYS.map((key, index) => ({
                key,
                label: PLANNING_PROCESS_LABELS[key] || key,
                colorHex: '#378ADD',
                iconKey: '',
                order: index + 1
            }));

        const items = result.rows
            .filter((row) => !isCompletedOrderRecord(row))
            .map((row) => {
                const raw = row.raw_data || {};
                const planning = getOrderPlanningControl(raw);
                const snapshot = inferPlanningOrderSnapshot(row);
                const lineSnapshot = raw.line_snapshot || {};
                const lineRaw = lineSnapshot.raw_data || {};
                const quotedProcessKeys = getQuotedPlanningProcessKeys(row);
                const processKeys = inferRouteProcessKeys(row);
                const selectedSet = new Set(processKeys);
                const quotedSet = new Set(quotedProcessKeys);
                const tintCount = Number(lineSnapshot.tintCount || lineSnapshot.pantoneCount || lineRaw['CANTIDAD TINTAS'] || 0);
                const processResultRaw = lineRaw['Datos_Cotizados'] || {};
                const plannedFeet = Number(
                    processResultRaw?.sustrato?.totalLengthFeet
                    || processResultRaw?.sustrato?.linealFeet
                    || lineSnapshot.materialFeet
                    || lineRaw['GENERAL | SUSTRATO | CONSUMO PIES']
                    || 0
                );
                const widthInches = Number(lineSnapshot.widthInches || lineRaw['DIMENSIONES ETIQUETA | ANCHO'] || 0);
                const lengthInches = Number(lineSnapshot.lengthInches || lineRaw['DIMENSIONES ETIQUETA | LARGO'] || 0);
                const finishLabels = [];
                (Array.isArray(processResultRaw?.print?.items) ? processResultRaw.print.items : []).forEach((printItem) => {
                    (Array.isArray(printItem?.inlineItems) ? printItem.inlineItems : []).forEach((inline) => {
                        if (!processObjectLooksActive(inline)) return;
                        const key = canonicalPlanningProcessKey(inline.processKey || inline.key || inline.label);
                        const label = PLANNING_PROCESS_LABELS[key] || inline.label || key;
                        if (label && !finishLabels.includes(label)) finishLabels.push(label);
                    });
                });
                (Array.isArray(processResultRaw?.finishes?.items) ? processResultRaw.finishes.items : []).forEach((finish) => {
                    if (!processObjectLooksActive(finish)) return;
                    const key = canonicalPlanningProcessKey(finish.processKey || finish.key || finish.label);
                    const label = PLANNING_PROCESS_LABELS[key] || finish.label || finish.description || key;
                    if (label && !finishLabels.includes(label)) finishLabels.push(label);
                });
                const missing = [];
                if (!snapshot.machineName && processKeys.some((key) => !['preprensa', 'planchas', 'diseno'].includes(key))) missing.push('Máquina');
                if (!snapshot.materialName && processKeys.some((key) => ['impresion', 'barnizado', 'laminado', 'rebobinado', 'empaque'].includes(key))) missing.push('Sustrato');
                if (!snapshot.dieCode && processKeys.some((key) => ['preprensa', 'planchas', 'impresion', 'troquelado', 'estampado', 'embosado'].includes(key))) missing.push('Troquel / plancha');
                if (processKeys.includes('impresion') && tintCount <= 0) missing.push('Tintas');

                return {
                    orderCode: row.order_code,
                    quoteCode: row.quote_code || '',
                    lineCode: row.line_code || '',
                    customerName: snapshot.customerName || '',
                    salespersonName: raw.salesperson_name || lineSnapshot.salespersonName || '',
                    jobName: snapshot.jobName || snapshot.productName || row.product_code || '',
                    productName: snapshot.productName || row.product_code || '',
                    dimensionsText: widthInches && lengthInches ? `${widthInches} x ${lengthInches} in` : '',
                    machineName: snapshot.machineName || '',
                    materialName: snapshot.materialName || '',
                    materialQuantity: plannedFeet,
                    dieCode: snapshot.dieCode || '',
                    orderedQuantity: Number(row.ordered_quantity || 0),
                    plannedFeet,
                    tintCount,
                    promisedDeliveryDate: planning.promisedDeliveryDate,
                    salesReleasedAt: planning.salesReleasedAt,
                    salesReleasedBy: planning.salesReleasedBy,
                    planningStatus: planning.planningStatus,
                    processList: processKeys,
                    quotedProcessList: quotedProcessKeys,
                    processChecklist: planningProcesses.map((process) => ({
                        ...process,
                        selected: selectedSet.has(process.key),
                        quoted: quotedSet.has(process.key),
                        base: PLANNING_BASE_PROCESS_KEYS.includes(process.key)
                    })),
                    finishSummary: finishLabels.join(' · '),
                    sellerComments: pickFirstValue(lineRaw['COMENTARIOS VENDEDOR'], lineRaw['OBSERVACIONES VENTAS']),
                    printSummary: pickFirstValue(lineSnapshot.notes?.printSummary, lineRaw['INFORMACION IMPRESION COTIZACION | MOSTRAR'], lineRaw['INFORMACION IMPRESION COTIZACION | CALCULO']),
                    createOrderValidation: pickFirstValue(lineSnapshot.validations?.crearOrden, lineRaw['ANALISIS CAMPOS CREAR ORDEN']),
                    observations: pickFirstValue(lineSnapshot.notes?.observations, lineRaw['OBSERVACIONES SOLICITUD']),
                    attachmentCount: Array.isArray(raw.attachments) ? raw.attachments.length : 0,
                    returnReason: planning.returnReason || '',
                    missingItems: missing
                };
            })
            .filter((item) => item.planningStatus === 'PENDIENTE_PLANIFICACION')
            .sort((a, b) => {
                const aTime = a.promisedDeliveryDate ? new Date(a.promisedDeliveryDate).getTime() : Number.MAX_SAFE_INTEGER;
                const bTime = b.promisedDeliveryDate ? new Date(b.promisedDeliveryDate).getTime() : Number.MAX_SAFE_INTEGER;
                return aTime - bTime;
            });

        res.json({ ok: true, items });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar la cola de planificación.' });
    }
});

app.get('/api/planificacion/procesos', async (req, res) => {
    try {
        const result = await pgQuery(`
            SELECT
                   p.id AS id_proceso,
                   p.process_key,
                   p.process_name AS nombre,
                   p.sequence_order AS orden_secuencia,
                   p.color_hex,
                   p.icon_key AS icono,
                   p.is_parallel AS es_paralelo,
                   p.is_active AS activo,
                   COUNT(mp.id) FILTER (WHERE mp.is_active = TRUE) AS total_maquinas
            FROM production_process_definitions p
            LEFT JOIN production_machine_profiles mp ON mp.process_key = p.process_key
            GROUP BY p.id
            ORDER BY p.sequence_order, p.process_name
        `);
        res.json({ ok: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar los procesos de planificación.' });
    }
});

app.get('/api/planificacion/maquinas', async (req, res) => {
    try {
        const result = await pgQuery(`
            SELECT
                   mp.id::text AS id,
                   mp.id::text AS id_maquina,
                   COALESCE(NULLIF(mp.source_payload->>'external_id', ''), '') AS codigo_maquina,
                   mp.machine_name AS name,
                   mp.machine_name AS nombre_recurso,
                   mp.process_key,
                   mp.process_name AS proceso_nombre,
                   p.sequence_order AS orden_secuencia,
                   p.color_hex,
                   p.icon_key AS proceso_icono,
                   p.is_parallel AS es_paralelo
            FROM production_machine_profiles mp
            LEFT JOIN production_process_definitions p ON p.process_key = mp.process_key
            WHERE mp.is_active = TRUE
            ORDER BY p.sequence_order, mp.process_name, mp.machine_name
        `);
        res.json({ ok: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar las máquinas de planificación.' });
    }
});

app.get('/api/planificacion/maquinas/config', async (req, res) => {
    try {
        const result = await pgQuery(`
            SELECT
                mp.id::text AS id,
                mp.id::text AS id_maquina,
                COALESCE(NULLIF(mp.source_payload->>'external_id', ''), '') AS codigo_maquina,
                mp.machine_name AS nombre_recurso,
                mp.machine_name AS name,
                COALESCE(mp.source_payload->>'sub_descripcion', '') AS sub_descripcion,
                p.id AS id_proceso,
                mp.process_name AS proceso_nombre,
                p.sequence_order AS orden_secuencia,
                p.color_hex,
                p.icon_key AS proceso_icono,
                COALESCE((mp.source_payload->>'capacidad_colores')::int, 0) AS capacidad_colores,
                mp.nominal_speed_fpm AS velocidad_nom,
                mp.oee_target AS oee,
                mp.supports_die_cut AS flag_troquel,
                mp.supports_varnish_uv AS flag_barniz_uv,
                mp.supports_lamination AS flag_laminado,
                mp.max_web_width_in AS ancho_max_banda,
                mp.min_web_width_in AS ancho_min_banda,
                mp.is_active AS activa
            FROM production_machine_profiles mp
            LEFT JOIN production_process_definitions p ON p.process_key = mp.process_key
            ORDER BY p.sequence_order, mp.machine_name
        `);
        res.json({ ok: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar la configuración de máquinas.' });
    }
});

app.post('/api/planificacion/procesos', async (req, res) => {
    try {
        const { nombre, orden_secuencia, color_hex, icono, es_paralelo, activo } = req.body || {};
        if (!nombre || !orden_secuencia) {
            return res.status(400).json({ ok: false, error: 'nombre y orden_secuencia son requeridos.' });
        }
        const processKey = normalizePlanningKey(nombre);
        const result = await pgQuery(`
            INSERT INTO production_process_definitions (
                process_key, process_name, sequence_order, color_hex, icon_key, is_parallel, is_active
            ) VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING
                id AS id_proceso,
                process_key,
                process_name AS nombre,
                sequence_order AS orden_secuencia,
                color_hex,
                icon_key AS icono,
                is_parallel AS es_paralelo,
                is_active AS activo
        `, [processKey, nombre, Number(orden_secuencia), color_hex || '#378ADD', icono || '[P]', Boolean(es_paralelo), activo !== false]);
        res.json({ ok: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible crear el proceso de planificación.' });
    }
});

app.put('/api/planificacion/procesos/:id', async (req, res) => {
    try {
        const { nombre, orden_secuencia, color_hex, icono, es_paralelo, activo } = req.body || {};
        const result = await pgQuery(`
            UPDATE production_process_definitions
            SET process_name = COALESCE($1, process_name),
                sequence_order = COALESCE($2, sequence_order),
                color_hex = COALESCE($3, color_hex),
                icon_key = COALESCE($4, icon_key),
                is_parallel = COALESCE($5, is_parallel),
                is_active = COALESCE($6, is_active),
                updated_at = NOW()
            WHERE id = $7::uuid
            RETURNING
                id AS id_proceso,
                process_key,
                process_name AS nombre,
                sequence_order AS orden_secuencia,
                color_hex,
                icon_key AS icono,
                is_parallel AS es_paralelo,
                is_active AS activo
        `, [nombre || null, orden_secuencia ? Number(orden_secuencia) : null, color_hex || null, icono || null, typeof es_paralelo === 'boolean' ? es_paralelo : null, typeof activo === 'boolean' ? activo : null, req.params.id]);
        if (!result.rows.length) {
            return res.status(404).json({ ok: false, error: 'Proceso no encontrado.' });
        }
        res.json({ ok: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible actualizar el proceso.' });
    }
});

app.delete('/api/planificacion/procesos/:id', async (req, res) => {
    try {
        const countResult = await pgQuery(`SELECT COUNT(*)::int AS total FROM production_machine_profiles WHERE process_key = (SELECT process_key FROM production_process_definitions WHERE id = $1::uuid)`, [req.params.id]);
        if (Number(countResult.rows[0]?.total || 0) > 0) {
            return res.status(400).json({ ok: false, error: 'Tiene máquinas asignadas. Reasígnalas primero.' });
        }
        await pgQuery(`DELETE FROM production_process_definitions WHERE id = $1::uuid`, [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible eliminar el proceso.' });
    }
});

app.post('/api/planificacion/maquinas', async (req, res) => {
    try {
        const payload = req.body || {};
        const processResult = await pgQuery(`SELECT process_key, process_name FROM production_process_definitions WHERE id = $1::uuid LIMIT 1`, [payload.id_proceso]);
        const process = processResult.rows[0];
        if (!process) {
            return res.status(400).json({ ok: false, error: 'Proceso no válido.' });
        }
        const result = await pgQuery(`
            INSERT INTO production_machine_profiles (
                machine_name, process_key, process_name, nominal_speed_fpm, oee_target,
                max_web_width_in, min_web_width_in, supports_die_cut, supports_varnish_uv,
                supports_lamination, is_active, source_payload
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
            RETURNING id::text AS id_maquina
        `, [
            payload.nombre_recurso,
            process.process_key,
            process.process_name,
            Number(payload.velocidad_nom || 0),
            Number(payload.oee || 0.85),
            payload.ancho_max_banda ? Number(payload.ancho_max_banda) : null,
            payload.ancho_min_banda ? Number(payload.ancho_min_banda) : null,
            Boolean(payload.flag_troquel),
            Boolean(payload.flag_barniz_uv),
            Boolean(payload.flag_laminado),
            payload.activa !== false,
            JSON.stringify({
                external_id: payload.id_maquina || null,
                sub_descripcion: payload.sub_descripcion || '',
                capacidad_colores: Number(payload.capacidad_colores || 0)
            })
        ]);
        res.json({ ok: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible crear la máquina.' });
    }
});

app.put('/api/planificacion/maquinas/:id', async (req, res) => {
    try {
        const payload = req.body || {};
        let processKey = null;
        let processName = null;
        if (payload.id_proceso) {
            const processResult = await pgQuery(`SELECT process_key, process_name FROM production_process_definitions WHERE id = $1::uuid LIMIT 1`, [payload.id_proceso]);
            processKey = processResult.rows[0]?.process_key || null;
            processName = processResult.rows[0]?.process_name || null;
        }
        const result = await pgQuery(`
            UPDATE production_machine_profiles
            SET machine_name = COALESCE($1, machine_name),
                process_key = COALESCE($2, process_key),
                process_name = COALESCE($3, process_name),
                nominal_speed_fpm = COALESCE($4, nominal_speed_fpm),
                oee_target = COALESCE($5, oee_target),
                max_web_width_in = COALESCE($6, max_web_width_in),
                min_web_width_in = COALESCE($7, min_web_width_in),
                supports_die_cut = COALESCE($8, supports_die_cut),
                supports_varnish_uv = COALESCE($9, supports_varnish_uv),
                supports_lamination = COALESCE($10, supports_lamination),
                is_active = COALESCE($11, is_active),
                source_payload = COALESCE($12::jsonb, source_payload),
                updated_at = NOW()
            WHERE id = $13::uuid
            RETURNING id::text AS id_maquina
        `, [
            payload.nombre_recurso || null,
            processKey,
            processName,
            payload.velocidad_nom !== undefined ? Number(payload.velocidad_nom || 0) : null,
            payload.oee !== undefined ? Number(payload.oee || 0.85) : null,
            payload.ancho_max_banda ? Number(payload.ancho_max_banda) : null,
            payload.ancho_min_banda ? Number(payload.ancho_min_banda) : null,
            typeof payload.flag_troquel === 'boolean' ? payload.flag_troquel : null,
            typeof payload.flag_barniz_uv === 'boolean' ? payload.flag_barniz_uv : null,
            typeof payload.flag_laminado === 'boolean' ? payload.flag_laminado : null,
            typeof payload.activa === 'boolean' ? payload.activa : null,
            JSON.stringify({
                external_id: payload.id_maquina || null,
                sub_descripcion: payload.sub_descripcion || '',
                capacidad_colores: Number(payload.capacidad_colores || 0)
            }),
            req.params.id
        ]);
        if (!result.rows.length) {
            return res.status(404).json({ ok: false, error: 'Máquina no encontrada.' });
        }
        res.json({ ok: true, data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible actualizar la máquina.' });
    }
});

app.delete('/api/planificacion/maquinas/:id', async (req, res) => {
    try {
        await pgQuery(`UPDATE production_machine_profiles SET is_active = FALSE, updated_at = NOW() WHERE id = $1::uuid`, [req.params.id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible desactivar la máquina.' });
    }
});

app.get('/api/planificacion/gantt-agrupado', async (req, res) => {
    try {
        await ensurePlanningRoutesForLiveOrders();

        const [machinesResult, routesResult] = await Promise.all([
            pgQuery(`
                SELECT mp.id::text AS id,
                       mp.id::text AS id_maquina,
                       mp.machine_id,
                       mp.machine_capacity_id,
                       mp.machine_name AS nombre_recurso,
                       mp.machine_name AS name,
                       mp.process_key,
                       mp.process_name AS proceso_nombre,
                       p.id AS id_proceso,
                       p.sequence_order AS orden_secuencia,
                       p.color_hex,
                       p.icon_key AS proceso_icono,
                       mp.nominal_speed_fpm AS velocidad_nom,
                       mp.oee_target AS oee,
                       mp.supports_die_cut AS flag_troquel,
                       mp.supports_varnish_uv AS flag_barniz_uv,
                       mp.supports_lamination AS flag_laminado,
                       mp.max_web_width_in AS ancho_max_banda,
                       mp.min_web_width_in AS ancho_min_banda,
                       mp.is_active AS activa
                FROM production_machine_profiles mp
                LEFT JOIN production_process_definitions p ON p.process_key = mp.process_key
                WHERE mp.is_active = TRUE
                ORDER BY p.sequence_order, mp.machine_name
            `),
            pgQuery(`
                SELECT
                    r.id::text AS id_ruta,
                    r.order_code AS codigo_op,
                    r.quote_code,
                    r.line_code,
                    o.raw_data->>'customer_name' AS cliente,
                    COALESCE(o.raw_data->'line_summary'->>'job_name', o.raw_data->'line_summary'->>'product_name', o.product_code) AS articulo,
                    o.die_code AS saidel,
                    COALESCE(NULLIF(o.raw_data->'line_snapshot'->>'pantoneCount','')::numeric, NULLIF(o.raw_data->'line_snapshot'->>'tintCount','')::numeric, 0) AS colores,
                    COALESCE(NULLIF(o.raw_data->'line_snapshot'->>'materialFeet','')::numeric, o.ordered_quantity, 0) AS pies,
                    r.process_name AS proceso,
                    mp.id AS maquina,
                    COALESCE(mp.machine_name, o.machine_name) AS maquina_nombre,
                    COALESCE(r.start_turn_hour, 0) AS inicio,
                    COALESCE(r.duration_hours, 0) AS dur,
                    r.transition_cost_min AS trans_costo,
                    r.dependency_route_id AS dep_ruta_id,
                    dep.order_code AS dep,
                    r.route_status AS estado,
                    r.route_payload,
                    o.raw_data->'planning_snapshot' AS planning_snapshot,
                    NULL::text AS alerta,
                    COALESCE(
                        NULLIF(o.raw_data->'planning_control'->>'scheduledDeliveryDate', '')::timestamptz,
                        NULLIF(o.raw_data->'planning_control'->>'promisedDeliveryDate', '')::timestamptz,
                        NULLIF(o.raw_data->'quote_snapshot'->>'due_on', '')::timestamptz,
                        NULLIF(o.raw_data->'line_snapshot'->>'dueOn', '')::timestamptz
                    ) AS fecha_entrega_prometida
                FROM production_order_routes r
                JOIN flexo_orders o ON o.order_code = r.order_code
                LEFT JOIN production_machine_profiles mp ON mp.id = r.machine_profile_id
                LEFT JOIN production_order_routes dep ON dep.id = r.dependency_route_id
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM flexo_orders ox
                    WHERE ox.order_code = o.order_code
                      AND (
                        ox.delivered_on IS NOT NULL
                        OR lower(COALESCE(ox.raw_data->>'status','')) IN ('entregada','completada','cerrada','cancelada')
                      )
                )
                ORDER BY r.sequence_order, mp.machine_name NULLS LAST, r.order_code
            `)
        ]);

        res.json({
            ok: true,
            maquinas: machinesResult.rows,
            rutas: routesResult.rows
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar el gantt de planificación.' });
    }
});

app.patch('/api/planificacion/gantt/mover', async (req, res) => {
    try {
        const { id_ruta, inicio, duracion, id_maquina, route_payload_updates } = req.body || {};
        if (!id_ruta) {
            return res.status(400).json({ ok: false, error: 'Debes indicar id_ruta.' });
        }
        await pgQuery(`
            UPDATE production_order_routes
            SET start_turn_hour = COALESCE($1, start_turn_hour),
                duration_hours = COALESCE($2, duration_hours),
                machine_profile_id = COALESCE($3::uuid, machine_profile_id),
                route_payload = CASE
                    WHEN $4::jsonb IS NULL THEN route_payload
                    ELSE COALESCE(route_payload, '{}'::jsonb) || $4::jsonb
                END,
                updated_at = NOW()
            WHERE id = $5::uuid
        `, [
            inicio !== undefined ? Number(inicio) : null,
            duracion !== undefined ? Number(duracion) : null,
            id_maquina || null,
            route_payload_updates ? JSON.stringify(route_payload_updates) : null,
            id_ruta
        ]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible mover la ruta.' });
    }
});

app.patch('/api/planificacion/gantt/estado', async (req, res) => {
    try {
        const { codigo_op, estado } = req.body || {};
        if (!codigo_op || !estado) {
            return res.status(400).json({ ok: false, error: 'Debes indicar codigo_op y estado.' });
        }
        await pgQuery(`
            UPDATE production_order_routes
            SET route_status = $1,
                updated_at = NOW()
            WHERE order_code = $2
        `, [estado, codigo_op]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible actualizar el estado de la ruta.' });
    }
});

app.get('/api/planificacion/preturno', async (req, res) => {
    try {
        await ensurePlanningRoutesForLiveOrders();
        const [routesResult, materialRows, troquelRows, machineRows] = await Promise.all([
            pgQuery(`
                SELECT
                    r.id,
                    r.order_code,
                    r.process_name,
                    r.route_status,
                    r.sequence_order,
                    mp.machine_name,
                    o.material_code,
                    o.die_code,
                    o.raw_data->>'customer_name' AS customer_name,
                    COALESCE(o.raw_data->'line_summary'->>'job_name', o.raw_data->'line_summary'->>'product_name', o.product_code) AS job_name,
                    o.raw_data
                FROM production_order_routes r
                JOIN flexo_orders o ON o.order_code = r.order_code
                LEFT JOIN production_machine_profiles mp ON mp.id = r.machine_profile_id
                ORDER BY r.order_code, r.sequence_order
            `),
            listInventory('materiales', { limit: 5000 }),
            listInventory('troqueles', { limit: 5000 }),
            listInventory('maquinas', { limit: 5000 })
        ]);

        const grouped = new Map();
        const normalizePlanningKey = (value) => String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
        const normalizedLookup = (value) => normalizePlanningKey(value);
        const hasValue = (value) => {
            const raw = String(value ?? '').trim();
            if (!raw) return false;
            const lowered = raw.toLowerCase();
            return lowered !== 'seleccionar...' && lowered !== 'seleccionar' && lowered !== 'pendiente' && lowered !== 'sin definir';
        };
        const materialCatalog = new Map();
        materialRows.forEach((item) => {
            const keys = [item.codigo, item.nombre].filter(Boolean).map(normalizedLookup);
            keys.forEach((key) => { if (key) materialCatalog.set(key, item); });
        });
        const troquelCatalog = new Map();
        troquelRows.forEach((item) => {
            const keys = [item.codigo, item.descripcion, item.descripcion_cotizaciones].filter(Boolean).map(normalizedLookup);
            keys.forEach((key) => { if (key) troquelCatalog.set(key, item); });
        });
        const machineCatalog = new Map();
        machineRows.forEach((item) => {
            const keys = [item.nombre, item.codigo, item.marca, item.modelo].filter(Boolean).map(normalizedLookup);
            keys.forEach((key) => { if (key) machineCatalog.set(key, item); });
        });

        routesResult.rows.forEach((row) => {
            const raw = row.raw_data || {};
            const lineSnapshot = raw.line_snapshot || {};
            const lineSummary = raw.line_summary || {};
            const snapshotRaw = lineSnapshot.raw_data || {};
            const uiState = snapshotRaw.Estado_UI || lineSnapshot.uiState || {};
            const headerState = uiState.header || {};
            const processKey = normalizePlanningKey(row.process_name);
            const materialCode = row.material_code || lineSnapshot.materialCode || snapshotRaw['GENERAL | MATERIAL'] || '';
            const dieCode = row.die_code || lineSnapshot.dieCode || snapshotRaw['GENERAL | TROQUEL | ID'] || '';
            const machineName = row.machine_name || lineSummary.machine_name || lineSnapshot.quotedMachine || snapshotRaw['CONV | MAQUINA'] || '';
            const materialName = lineSnapshot.materialName || lineSummary.material_name || snapshotRaw['GENERAL | MATERIAL'] || '';
            const tintCount = Number(lineSnapshot.tintCount || lineSnapshot.pantoneCount || snapshotRaw['CANTIDAD TINTAS'] || 0);
            const attachments = Array.isArray(raw.attachments) ? raw.attachments : [];
            const additional = Array.isArray(uiState.additional) ? uiState.additional : [];
            const finishRows = Array.isArray(uiState.finishes) ? uiState.finishes : [];
            const missingItems = [];
            const readyItems = [];
            const materialRecord = materialCatalog.get(normalizedLookup(materialCode)) || materialCatalog.get(normalizedLookup(materialName)) || null;
            const troquelRecord = troquelCatalog.get(normalizedLookup(dieCode)) || null;
            const machineRecord = machineCatalog.get(normalizedLookup(machineName)) || null;

            const machineRequired = !['preprensa', 'planchas', 'diseno'].includes(processKey);
            const materialRequired = ['impresion', 'barnizado', 'laminado', 'rebobinado', 'empaque'].includes(processKey);
            const dieRequired = ['preprensa', 'planchas', 'impresion', 'troquelado', 'estampado', 'embosado'].includes(processKey);
            const tintRequired = processKey === 'impresion';
            const accessoryRequired = ['estampado', 'embosado'].includes(processKey);

            if (machineRequired) {
                if (!hasValue(machineName)) missingItems.push('Máquina');
                else if (!machineRecord) missingItems.push('Máquina no registrada');
                else readyItems.push('Máquina');
            }

            if (materialRequired) {
                if (!hasValue(materialCode) && !hasValue(materialName)) missingItems.push('Sustrato');
                else if (!materialRecord) missingItems.push('Sustrato no registrado');
                else readyItems.push('Sustrato');
            }

            if (dieRequired) {
                if (!hasValue(dieCode)) missingItems.push('Troquel / plancha');
                else if (!troquelRecord) missingItems.push('Troquel / plancha no registrado');
                else readyItems.push('Troquel / plancha');
            }

            if (tintRequired) {
                if (tintCount > 0) readyItems.push('Tintas');
                else missingItems.push('Tintas');
            }

            if (accessoryRequired) {
                const hasAccessory = additional.length > 0
                    || attachments.length > 0
                    || finishRows.some((finish) => String(finish.slotKey || '').trim().length > 0);
                if (hasAccessory) readyItems.push('Accesorios');
                else missingItems.push('Accesorios');
            }

            if (!grouped.has(row.order_code)) {
                grouped.set(row.order_code, {
                    orderCode: row.order_code,
                    customerName: row.customer_name || '',
                    jobName: row.job_name || lineSnapshot.jobName || '',
                    quantityProducts: Number(lineSnapshot.quantityProducts || raw.totals?.quantity || 0),
                    materialCode: materialCode || materialName || '',
                    dieCode,
                    salespersonName: raw.salesperson_name || lineSnapshot.salespersonName || headerState.salespersonName || '',
                    processes: []
                });
            }
            grouped.get(row.order_code).processes.push({
                routeId: row.id,
                processName: row.process_name,
                routeStatus: row.route_status,
                machineName,
                materialReady: materialRequired ? hasValue(materialCode) : true,
                dieReady: dieRequired ? hasValue(dieCode) : true,
                accessoriesReady: accessoryRequired ? missingItems.includes('Accesorios') === false : true,
                tintReady: tintRequired ? tintCount > 0 : true,
                missingItems,
                readyItems,
                tintCount,
                materialLabel: materialCode || materialName || '',
                materialRegistered: Boolean(materialRecord),
                materialCatalogName: materialRecord?.nombre || '',
                dieLabel: dieCode || '',
                dieRegistered: Boolean(troquelRecord),
                dieCatalogName: troquelRecord?.descripcion || troquelRecord?.descripcion_cotizaciones || '',
                machineLabel: machineName || '',
                machineRegistered: Boolean(machineRecord),
                attachmentCount: attachments.length,
                additionalCount: additional.length,
                raw: row.raw_data
            });
        });

        res.json({ ok: true, items: Array.from(grouped.values()) });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar el preturno.' });
    }
});

app.get('/api/planificacion/resumen', async (req, res) => {
    try {
        await ensurePlanningRoutesForLiveOrders();
        const [orders, routes, events, waste] = await Promise.all([
            pgQuery(`SELECT COUNT(*)::int AS total FROM flexo_orders WHERE delivered_on IS NULL`),
            pgQuery(`SELECT COUNT(*)::int AS total FROM production_order_routes`),
            pgQuery(`SELECT COUNT(*)::int AS total FROM production_route_events WHERE created_at::date = CURRENT_DATE`),
            pgQuery(`SELECT COALESCE(SUM(useful_feet),0)::numeric AS useful_feet FROM production_waste_logs WHERE created_at::date = CURRENT_DATE`)
        ]);
        res.json({
            ok: true,
            data: {
                liveOrders: orders.rows[0]?.total || 0,
                activeRoutes: routes.rows[0]?.total || 0,
                dayEvents: events.rows[0]?.total || 0,
                usefulFeetToday: Number(waste.rows[0]?.useful_feet || 0)
            }
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar el resumen de planificación.' });
    }
});

app.get('/api/mes/motivos-paro', async (req, res) => {
    try {
        const result = await pgQuery(`
            SELECT id, reason_group, reason_code, description
            FROM production_stop_reasons
            WHERE is_active = TRUE
            ORDER BY reason_group, description
        `);
        res.json({ ok: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar los motivos de paro.' });
    }
});

app.get('/api/produccion/flujo', async (req, res) => {
    try {
        await ensurePlanningRoutesForLiveOrders();
        const result = await pgQuery(`
            SELECT
                r.id::text AS route_id,
                r.order_code,
                r.quote_code,
                r.line_code,
                r.process_key,
                r.process_name,
                r.route_status,
                r.sequence_order,
                r.planned_start_at,
                r.duration_hours,
                r.actual_start_at,
                r.actual_end_at,
                dep.route_status AS dependency_status,
                mp.id::text AS machine_profile_id,
                COALESCE(mp.machine_name, o.machine_name, '') AS machine_name,
                o.product_code,
                o.material_code,
                o.die_code,
                o.ordered_quantity,
                o.raw_data,
                o.created_at AS order_created_at
            FROM production_order_routes r
            JOIN flexo_orders o ON o.order_code = r.order_code
            LEFT JOIN production_order_routes dep ON dep.id = r.dependency_route_id
            LEFT JOIN production_machine_profiles mp ON mp.id = r.machine_profile_id
            WHERE r.route_status <> 'COMPLETADO'
              AND (r.dependency_route_id IS NULL OR dep.route_status = 'COMPLETADO')
              AND NOT (
                o.delivered_on IS NOT NULL
                OR lower(COALESCE(o.raw_data->>'status','')) IN ('entregada','completada','cerrada','cancelada')
              )
            ORDER BY r.sequence_order, r.updated_at, r.order_code
        `);

        const processOrder = new Map(PRODUCTION_FLOW_SEQUENCE.map((key, index) => [key, index + 1]));
        const routes = [];
        const machinesByProcess = {};
        result.rows.forEach((row) => {
            const processKey = canonicalProductionFlowKey(row.process_key || row.process_name);
            if (!PRODUCTION_FLOW_SEQUENCE.includes(processKey)) return;
            const raw = row.raw_data || {};
            const lineSummary = raw.line_summary || {};
            const lineSnapshot = raw.line_snapshot || {};
            const route = {
                routeId: row.route_id,
                orderCode: row.order_code,
                quoteCode: row.quote_code || '',
                lineCode: row.line_code || '',
                processKey,
                processName: PRODUCTION_FLOW_LABELS[processKey] || row.process_name || processKey,
                routeStatus: row.route_status || 'PENDIENTE',
                sequenceOrder: Number(row.sequence_order || processOrder.get(processKey) || 999),
                plannedStartAt: row.planned_start_at || null,
                durationHours: Number(row.duration_hours || 0),
                machineName: row.machine_name || '',
                customerName: raw.customer_name || raw.quote_snapshot?.customer_name || '',
                productName: lineSummary.job_name || lineSummary.product_name || lineSnapshot.jobName || row.product_code || row.order_code,
                materialCode: row.material_code || lineSnapshot.materialCode || '',
                dieCode: row.die_code || lineSnapshot.dieCode || '',
                quantity: Number(row.ordered_quantity || raw.totals?.quantity || lineSnapshot.quantityProducts || 0),
                plannedFeet: Number(lineSnapshot.materialFeet || raw.totals?.total_feet || 0),
                createdAt: row.order_created_at
            };
            routes.push(route);
            if (route.machineName) {
                if (!machinesByProcess[processKey]) machinesByProcess[processKey] = new Set();
                machinesByProcess[processKey].add(route.machineName);
            }
        });

        const counts = {};
        routes.forEach((route) => {
            counts[route.processKey] = (counts[route.processKey] || 0) + 1;
        });

        res.json({
            ok: true,
            user: getRequestUserName(req),
            processes: PRODUCTION_FLOW_SEQUENCE.map((key, index) => ({
                key,
                label: PRODUCTION_FLOW_LABELS[key],
                order: index + 1,
                activeCount: counts[key] || 0,
                machines: Array.from(machinesByProcess[key] || [])
            })),
            routes
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar el flujo de producción.' });
    }
});

function normalizeReportDate(value, fallback = null) {
    const text = String(value || '').trim();
    if (!text) return fallback;
    const date = new Date(`${text}T00:00:00`);
    return Number.isNaN(date.getTime()) ? fallback : text;
}

function normalizeConsumptionFamily(value) {
    const text = String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
    if (text.includes('barniz')) return 'barniz';
    if (text.includes('laminad')) return 'laminado';
    if (text.includes('foil') || text.includes('estamp')) return 'foil';
    if (text.includes('tinta') || text.includes('ink') || text.includes('pantone') || text.includes('cmyk')) return 'tinta';
    if (text.includes('sustrat') || text.includes('film') || text.includes('papel') || text.includes('bopp') || text.includes('pet') || text.includes('opp')) return 'sustrato';
    return text.trim() || 'material';
}

function processAllowsConsumption(processKey, family) {
    const process = canonicalProductionFlowKey(processKey);
    const itemFamily = normalizeConsumptionFamily(family);
    if (process === 'impresion') return ['sustrato', 'tinta', 'barniz', 'laminado', 'foil'].includes(itemFamily);
    if (process === 'barnizado') return itemFamily === 'barniz';
    if (process === 'laminado') return itemFamily === 'laminado';
    if (process === 'estampado') return itemFamily === 'foil';
    if (process === 'rebobinado' || process === 'empaque') return ['sustrato', 'material'].includes(itemFamily);
    return false;
}

function addConsumptionMaterial(list, item = {}) {
    const sapItemCode = sanitizeAdminUserText(item.sapItemCode || item.itemCode || item.materialCode || item.code);
    const materialName = sanitizeAdminUserText(item.materialName || item.itemName || item.name || item.description || sapItemCode);
    if (!sapItemCode && !materialName) return;
    const family = normalizeConsumptionFamily(item.family || item.materialFamily || materialName || sapItemCode);
    const key = `${sapItemCode || materialName}|${family}`;
    if (list.some((row) => row.key === key)) return;
    list.push({
        key,
        sapItemCode,
        materialName,
        materialFamily: family,
        plannedQuantity: Number(item.plannedQuantity || item.quantity || item.qty || 0),
        unitCode: sanitizeAdminUserText(item.unitCode || item.unit || item.unitHint || ''),
        source: sanitizeAdminUserText(item.source || '')
    });
}

function collectOrderConsumptionMaterials(orderRow, processKey = 'impresion') {
    const raw = orderRow?.raw_data || {};
    const materials = [];
    const printing = raw.printing || {};
    const lineSnapshot = raw.line_snapshot || raw.lineSnapshot || {};
    addConsumptionMaterial(materials, {
        sapItemCode: orderRow.material_code || lineSnapshot.materialCode || printing.materialCode,
        materialName: lineSnapshot.materialName || printing.materialName || orderRow.material_code,
        family: 'sustrato',
        plannedQuantity: printing.materialFeet || lineSnapshot.materialFeet || raw.totals?.total_feet,
        unitCode: 'ft',
        source: 'orden'
    });
    (Array.isArray(printing.inks) ? printing.inks : []).forEach((ink) => addConsumptionMaterial(materials, {
        sapItemCode: ink.sapItemCode || ink.materialCode || ink.code,
        materialName: ink.materialName || ink.name,
        family: 'tinta',
        plannedQuantity: ink.quantity || ink.consumptionLb || ink.consumptionKg,
        unitCode: ink.unit || 'lb',
        source: 'tintas'
    }));
    (Array.isArray(printing.inkNames) ? printing.inkNames : []).forEach((name) => addConsumptionMaterial(materials, {
        materialName: name,
        family: 'tinta',
        unitCode: 'lb',
        source: 'tintas'
    }));
    const addFinish = (finish) => {
        const family = normalizeConsumptionFamily(finish.key || finish.processKey || finish.label || finish.materialName);
        if (!['barniz', 'laminado', 'foil'].includes(family)) return;
        addConsumptionMaterial(materials, {
            sapItemCode: finish.sapItemCode || finish.materialCode || finish.materialId || finish.itemCode,
            materialName: finish.materialName || finish.label || finish.processName,
            family,
            plannedQuantity: finish.materialConsumptionLb || finish.materialConsumptionKg || finish.materialFeet || finish.quantity,
            unitCode: finish.unit || (family === 'barniz' ? 'lb' : 'ft'),
            source: 'acabados'
        });
    };
    (Array.isArray(printing.finishes) ? printing.finishes : []).forEach(addFinish);
    const calcResult = raw.calculation_result || raw.result || raw.calculationResult || {};
    (Array.isArray(calcResult.finishes?.items) ? calcResult.finishes.items : []).forEach(addFinish);
    return materials.filter((item) => processAllowsConsumption(processKey, item.materialFamily));
}

app.get('/api/reporterias/gerencial', async (req, res) => {
    try {
        await ensurePlanningRoutesForLiveOrders();
        const dateFrom = normalizeReportDate(req.query.dateFrom);
        const dateTo = normalizeReportDate(req.query.dateTo);
        const scopedDateFilter = (alias, field = 'created_at') => {
            const params = [];
            const parts = [];
            if (dateFrom) {
                params.push(dateFrom);
                parts.push(`${alias}.${field} >= $${params.length}::date`);
            }
            if (dateTo) {
                params.push(dateTo);
                parts.push(`${alias}.${field} < ($${params.length}::date + INTERVAL '1 day')`);
            }
            return { where: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
        };
        const withCondition = (filter, condition) => ({
            where: filter.where ? `${filter.where} AND ${condition}` : `WHERE ${condition}`,
            params: filter.params
        });
        const quoteFilter = scopedDateFilter('q');
        const orderFilter = scopedDateFilter('o');
        const costFilter = scopedDateFilter('fc');
        const consumptionFilter = scopedDateFilter('pmcr', 'requested_at');
        const yieldFilter = scopedDateFilter('wl');
        const auditFilter = scopedDateFilter('al', 'changed_at');
        const routeFilter = scopedDateFilter('r');
        const dieFilter = withCondition(costFilter, `COALESCE(NULLIF(fc.die_code,''), NULLIF(fc.raw_data->>'TROQUEL',''), NULLIF(fc.raw_data->>'CODIGO TROQUEL','')) IS NOT NULL`);
        const inkFilter = withCondition(consumptionFilter, `(LOWER(COALESCE(pmcr.material_family,'')) LIKE '%tinta%' OR LOWER(COALESCE(pmcr.material_name,'')) LIKE '%tinta%' OR LOWER(COALESCE(pmcr.material_name,'')) LIKE '%ink%')`);
        const [
            quotesResult,
            productionResult,
            costsResult,
            consumptionResult,
            yieldResult,
            auditResult,
            quoteTrendResult,
            quoteStatusResult,
            processLoadResult,
            machineLoadResult,
            dieUsageResult,
            inkConsumptionResult,
            materialFamilyResult
        ] = await Promise.all([
            pgQuery(`
                SELECT
                    COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE LOWER(COALESCE(status,'')) IN ('aprobada','aprobado','cerrada','cerrado'))::int AS approved,
                    COUNT(*) FILTER (WHERE LOWER(COALESCE(status,'')) IN ('rechazada','rechazado'))::int AS rejected,
                    COUNT(*) FILTER (WHERE COALESCE(status,'') = '')::int AS without_status
                FROM quotes q
                ${quoteFilter.where}
            `, quoteFilter.params),
            pgQuery(`
                SELECT
                    COUNT(*)::int AS total_orders,
                    COUNT(*) FILTER (WHERE EXISTS (
                        SELECT 1 FROM production_order_routes r WHERE r.order_code = o.order_code AND r.route_status = 'COMPLETADO'
                    ))::int AS with_completed_process,
                    COUNT(*) FILTER (WHERE EXISTS (
                        SELECT 1 FROM production_order_routes r WHERE r.order_code = o.order_code AND r.route_status IN ('RUN','SETUP','PARO')
                    ))::int AS active_orders
                FROM flexo_orders o
                ${orderFilter.where}
            `, orderFilter.params),
            pgQuery(`
                SELECT
                    COUNT(*)::int AS calculations,
                    COALESCE(SUM(total_cost),0) AS total_cost,
                    COALESCE(AVG(unit_price),0) AS avg_unit_price
                FROM flexo_calculations fc
                ${costFilter.where}
            `, costFilter.params),
            pgQuery(`
                SELECT
                    COUNT(*)::int AS total_requests,
                    COUNT(*) FILTER (WHERE sap_status = 'PENDIENTE')::int AS pending,
                    COUNT(*) FILTER (WHERE sap_status = 'ENVIADO')::int AS sent,
                    COUNT(*) FILTER (WHERE sap_status = 'ERROR')::int AS errors,
                    COALESCE(SUM(quantity),0) AS quantity
                FROM production_material_consumption_requests pmcr
                ${consumptionFilter.where}
            `, consumptionFilter.params),
            pgQuery(`
                SELECT
                    COALESCE(SUM(feet_consumed),0) AS feet_consumed,
                    COALESCE(SUM(useful_feet),0) AS useful_feet,
                    COALESCE(SUM(setup_waste_feet + run_waste_feet),0) AS waste_feet
                FROM production_waste_logs wl
                ${yieldFilter.where}
            `, yieldFilter.params),
            pgQuery(`
                SELECT
                    module_key,
                    COUNT(*)::int AS total
                FROM audit_log al
                ${auditFilter.where}
                GROUP BY module_key
                ORDER BY total DESC
                LIMIT 10
            `, auditFilter.params),
            pgQuery(`
                SELECT TO_CHAR(q.created_at::date, 'DD/MM') AS label, COUNT(*)::int AS total
                FROM quotes q
                ${quoteFilter.where}
                GROUP BY q.created_at::date
                ORDER BY q.created_at::date DESC
                LIMIT 14
            `, quoteFilter.params),
            pgQuery(`
                SELECT COALESCE(NULLIF(status,''), 'Sin estado') AS label, COUNT(*)::int AS total
                FROM quotes q
                ${quoteFilter.where}
                GROUP BY COALESCE(NULLIF(status,''), 'Sin estado')
                ORDER BY total DESC
                LIMIT 8
            `, quoteFilter.params),
            pgQuery(`
                SELECT r.process_name AS label, COUNT(*)::int AS orders, COALESCE(SUM(r.duration_hours),0) AS hours
                FROM production_order_routes r
                ${routeFilter.where}
                GROUP BY r.process_name
                ORDER BY hours DESC, orders DESC
                LIMIT 10
            `, routeFilter.params),
            pgQuery(`
                SELECT
                    COALESCE(NULLIF(o.machine_name,''), NULLIF(r.route_payload->>'machineName',''), NULLIF(r.route_payload->>'machine_name',''), r.process_name, 'Sin máquina') AS label,
                    COUNT(*)::int AS orders,
                    COALESCE(SUM(r.duration_hours),0) AS hours
                FROM production_order_routes r
                LEFT JOIN flexo_orders o ON o.order_code = r.order_code
                ${routeFilter.where}
                GROUP BY COALESCE(NULLIF(o.machine_name,''), NULLIF(r.route_payload->>'machineName',''), NULLIF(r.route_payload->>'machine_name',''), r.process_name, 'Sin máquina')
                ORDER BY hours DESC, orders DESC
                LIMIT 10
            `, routeFilter.params),
            pgQuery(`
                SELECT COALESCE(NULLIF(fc.die_code,''), NULLIF(fc.raw_data->>'TROQUEL',''), NULLIF(fc.raw_data->>'CODIGO TROQUEL',''), 'Sin troquel') AS label,
                       COUNT(*)::int AS total,
                       COALESCE(SUM(fc.total_cost),0) AS cost
                FROM flexo_calculations fc
                ${dieFilter.where}
                GROUP BY COALESCE(NULLIF(fc.die_code,''), NULLIF(fc.raw_data->>'TROQUEL',''), NULLIF(fc.raw_data->>'CODIGO TROQUEL',''), 'Sin troquel')
                ORDER BY total DESC
                LIMIT 10
            `, dieFilter.params),
            pgQuery(`
                SELECT COALESCE(NULLIF(pmcr.material_name,''), 'Tintas') AS label,
                       COALESCE(SUM(pmcr.quantity),0) AS quantity,
                       COUNT(*)::int AS requests
                FROM production_material_consumption_requests pmcr
                ${inkFilter.where}
                GROUP BY COALESCE(NULLIF(pmcr.material_name,''), 'Tintas')
                ORDER BY quantity DESC, requests DESC
                LIMIT 10
            `, inkFilter.params),
            pgQuery(`
                SELECT COALESCE(NULLIF(pmcr.material_family,''), 'Sin familia') AS label,
                       COALESCE(SUM(pmcr.quantity),0) AS quantity,
                       COUNT(*)::int AS requests
                FROM production_material_consumption_requests pmcr
                ${consumptionFilter.where}
                GROUP BY COALESCE(NULLIF(pmcr.material_family,''), 'Sin familia')
                ORDER BY quantity DESC, requests DESC
                LIMIT 10
            `, consumptionFilter.params)
        ]);
        const quoteSummary = quotesResult.rows[0] || {};
        const productionSummary = productionResult.rows[0] || {};
        const costSummary = costsResult.rows[0] || {};
        const consumptionSummary = consumptionResult.rows[0] || {};
        const yieldSummary = yieldResult.rows[0] || {};
        const feetConsumed = Number(yieldSummary.feet_consumed || 0);
        res.json({
            ok: true,
            filters: { dateFrom: dateFrom || '', dateTo: dateTo || '' },
            reports: {
                initial: {
                    quotes: Number(quoteSummary.total || 0),
                    orders: Number(productionSummary.total_orders || 0),
                    activeOrders: Number(productionSummary.active_orders || 0),
                    pendingSapConsumptions: Number(consumptionSummary.pending || 0)
                },
                quotations: quoteSummary,
                production: productionSummary,
                costs: costSummary,
                consumptions: consumptionSummary,
                yields: {
                    ...yieldSummary,
                    yieldPct: feetConsumed > 0 ? Number(((Number(yieldSummary.useful_feet || 0) / feetConsumed) * 100).toFixed(2)) : 0
                },
                orderStatus: await buildOrderStatusReport(),
                audit: auditResult.rows || [],
                quoteTrend: (quoteTrendResult.rows || []).reverse(),
                quoteStatus: quoteStatusResult.rows || [],
                processLoad: processLoadResult.rows || [],
                machineLoad: machineLoadResult.rows || [],
                dieUsage: dieUsageResult.rows || [],
                inkConsumption: inkConsumptionResult.rows || [],
                materialFamily: materialFamilyResult.rows || []
            }
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar la reportería gerencial.' });
    }
});

async function buildOrderStatusReport() {
    const result = await pgQuery(`
        SELECT
            process_key,
            process_name,
            route_status,
            COUNT(*)::int AS total
        FROM production_order_routes
        GROUP BY process_key, process_name, route_status
        ORDER BY process_name, route_status
    `);
    return result.rows || [];
}

app.get('/api/ordenes-produccion/:codigo/seguimiento', async (req, res) => {
    try {
        const orderResult = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [req.params.codigo]);
        if (!orderResult.rows.length) {
            return res.status(404).json({ ok: false, error: 'Orden de producción no encontrada.' });
        }
        const orderRow = orderResult.rows[0];
        if (orderRow.raw_data) normalizeCalculationKeys(orderRow.raw_data);
        const costsConfig = await loadCostsConfig();
        await ensurePlanningRoutesForOrder(orderRow, null, { costsConfig });
        const routeResult = await pgQuery(`
            SELECT
                r.id::text AS route_id,
                r.process_key,
                r.process_name,
                r.route_status,
                r.sequence_order,
                r.duration_hours,
                r.machine_profile_id::text AS machine_profile_id,
                r.route_payload,
                r.actual_start_at,
                r.actual_end_at,
                e.operator_name,
                e.event_type,
                e.notes,
                e.created_at AS event_created_at,
                w.feet_consumed,
                w.setup_waste_feet,
                w.run_waste_feet,
                w.useful_feet,
                w.final_speed_fpm,
                w.created_at AS waste_created_at
            FROM production_order_routes r
            LEFT JOIN LATERAL (
                SELECT *
                FROM production_route_events ev
                WHERE ev.route_id = r.id
                ORDER BY ev.created_at DESC
                LIMIT 1
            ) e ON TRUE
            LEFT JOIN LATERAL (
                SELECT *
                FROM production_waste_logs wl
                WHERE wl.route_id = r.id
                ORDER BY wl.created_at DESC
                LIMIT 1
            ) w ON TRUE
            WHERE r.order_code = $1
            ORDER BY r.sequence_order, r.created_at
        `, [req.params.codigo]);
        const raw = orderRow.raw_data || {};
        const snapshot = raw.planning_snapshot || raw.planningSnapshot || {};
        const processKeys = resolveOrderTrackingProcessKeys(orderRow, costsConfig, routeResult.rows);
        const control = getOrderPlanningControl(raw);
        const trackingMarks = getOrderTrackingMarks(raw);
        const session = readErpSessionFromRequest(req) || {};
        const actorIdentities = [];
        const addActorIdentity = (value) => {
            const cleaned = sanitizeAdminUserText(value).toLowerCase();
            if (cleaned) actorIdentities.push(cleaned);
        };
        [
            raw.traceability?.created_by,
            raw.traceability?.createdBy,
            raw['TRAZABILIDAD | USUARIO'],
            raw.created_by,
            raw.createdBy,
            raw.usuario_creacion,
            control.salesReleasedBy,
            control.launchedBy,
            control.processSelectionUpdatedBy,
            ...routeResult.rows.map((row) => row.operator_name),
            ...Object.values(trackingMarks).flatMap((mark) => [mark?.markedBy, mark?.clearedBy, mark?.userName, mark?.user])
        ].forEach(addActorIdentity);
        const actorDisplayNames = new Map();
        const actorPhotoUrls = new Map();
        const registerActorAlias = (key, displayName, photoUrl = '', prefer = false) => {
            const normalized = sanitizeAdminUserText(key).toLowerCase();
            const cleanName = sanitizeAdminUserText(displayName);
            const cleanPhoto = sanitizeAdminUserText(photoUrl);
            if (!normalized) return;
            if (cleanName && (prefer || !actorDisplayNames.has(normalized))) actorDisplayNames.set(normalized, cleanName);
            if (cleanPhoto && (prefer || !actorPhotoUrls.has(normalized))) actorPhotoUrls.set(normalized, cleanPhoto);
        };
        const sessionDisplayName = pickFirstValue(
            sanitizeAdminUserText(session?.fullName),
            sanitizeAdminUserText(session?.name),
            sanitizeAdminUserText(session?.displayName),
            sanitizeAdminUserText(session?.user),
            sanitizeAdminUserText(session?.username),
            sanitizeAdminUserText(session?.email)
        );
        const sessionPhotoUrl = pickFirstValue(
            sanitizeAdminUserText(session?.photoUrl),
            sanitizeAdminUserText(session?.photo_url),
            sanitizeAdminUserText(session?.avatarUrl),
            sanitizeAdminUserText(session?.avatar_url)
        );
        [session?.username, session?.user, session?.name, session?.fullName, session?.displayName, session?.email]
            .forEach((value) => registerActorAlias(value, sessionDisplayName, sessionPhotoUrl, true));
        if (actorIdentities.length) {
            const userResult = await pgQuery(
                `SELECT full_name, username, photo_url
                   FROM admin_users
                  WHERE LOWER(TRIM(username)) = ANY($1::text[])
                     OR LOWER(TRIM(full_name)) = ANY($1::text[])`,
                [Array.from(new Set(actorIdentities))]
            );
            userResult.rows.forEach((row) => {
                const displayName = sanitizeAdminUserText(row.full_name, row.username);
                const photoUrl = sanitizeAdminUserText(row.photo_url);
                [row.username, row.full_name].forEach((key) => {
                    registerActorAlias(key, displayName, photoUrl);
                });
            });
        }
        const resolveActorInfo = (value) => {
            const cleaned = sanitizeAdminUserText(value);
            if (!cleaned) return { name: '', photoUrl: '' };
            const normalized = cleaned.toLowerCase();
            const name = actorDisplayNames.get(normalized) || cleaned;
            const photoUrl = actorPhotoUrls.get(normalized) || actorPhotoUrls.get(sanitizeAdminUserText(name).toLowerCase()) || '';
            return { name, photoUrl };
        };
        const snapshotByKey = new Map((Array.isArray(snapshot.processes) ? snapshot.processes : []).map((process) => [
            canonicalProductionFlowKey(process.processKey || process.processName),
            process
        ]));
        const grouped = new Map();
        routeResult.rows.forEach((row) => {
            const key = canonicalProductionFlowKey(row.process_key || row.process_name);
            if (!processKeys.includes(key)) return;
            const current = grouped.get(key) || {
                processKey: key,
                processName: PRODUCTION_FLOW_LABELS[key],
                routeStatus: 'PENDIENTE',
                routeId: row.route_id,
                durationHours: Number(row.duration_hours || 0),
                completedBy: '',
                completedByPhoto: '',
                completedAt: null,
                startedAt: null,
                notes: '',
                realMinutes: 0,
                feetConsumed: 0,
                usefulFeet: 0,
                finalSpeedFpm: 0
            };
            current.routeId = current.routeId || row.route_id;
            current.durationHours = Math.max(current.durationHours, Number(row.duration_hours || 0));
            const routePayload = row.route_payload && typeof row.route_payload === 'object' ? row.route_payload : {};
            current.durationSource = routePayload.source || current.durationSource || '';
            if (row.route_status === 'COMPLETADO' || current.routeStatus !== 'COMPLETADO') {
                const routeActor = resolveActorInfo(row.operator_name);
                current.routeStatus = row.route_status || current.routeStatus;
                current.completedBy = row.route_status === 'COMPLETADO' ? (routeActor.name || current.completedBy) : current.completedBy;
                current.completedByPhoto = row.route_status === 'COMPLETADO' ? (routeActor.photoUrl || current.completedByPhoto) : current.completedByPhoto;
                current.completedAt = row.actual_end_at || (row.event_type === 'completado' ? row.event_created_at : current.completedAt);
                current.startedAt = row.actual_start_at || current.startedAt;
                current.notes = row.notes || current.notes;
            }
            const startAt = row.actual_start_at ? new Date(row.actual_start_at) : null;
            const endAt = row.actual_end_at ? new Date(row.actual_end_at) : null;
            if (startAt && !Number.isNaN(startAt.getTime())) {
                const end = endAt && !Number.isNaN(endAt.getTime()) ? endAt : new Date();
                current.realMinutes = Math.max(current.realMinutes, Math.round((end.getTime() - startAt.getTime()) / 60000));
            }
            current.feetConsumed = Math.max(current.feetConsumed, Number(row.feet_consumed || 0));
            current.usefulFeet = Math.max(current.usefulFeet, Number(row.useful_feet || 0));
            current.finalSpeedFpm = Math.max(current.finalSpeedFpm, Number(row.final_speed_fpm || 0));
            grouped.set(key, current);
        });
        const createdActor = resolveActorInfo(pickFirstValue(
            raw.traceability?.created_by,
            raw.traceability?.createdBy,
            raw['TRAZABILIDAD | USUARIO'],
            raw.created_by,
            raw.createdBy,
            raw.usuario_creacion,
            ''
        ));
        const salesActor = resolveActorInfo(control.salesReleasedBy || raw.salesperson_name || raw.quote_snapshot?.salesperson_name || '');
        const planningActor = resolveActorInfo(control.launchedBy || control.processSelectionUpdatedBy || '');
        const fixedSteps = [
            {
                processKey: 'orden_creada',
                processName: 'Creación de Orden',
                sequenceOrder: 1,
                routeStatus: 'COMPLETADO',
                completedBy: createdActor.name,
                completedByPhoto: createdActor.photoUrl,
                completedAt: pickFirstValue(raw.traceability?.created_at, raw.traceability?.createdAt, raw['TRAZABILIDAD | FECHA'], raw.created_at, orderRow.created_at) || null,
                startedAt: pickFirstValue(raw.traceability?.created_at, raw.traceability?.createdAt, raw['TRAZABILIDAD | FECHA'], raw.created_at, orderRow.created_at) || null,
                notes: ''
            },
            {
                processKey: 'solicitud_vendedor',
                processName: 'Solicitud de Vendedor',
                sequenceOrder: 2,
                routeStatus: control.salesReleased ? 'COMPLETADO' : 'PENDIENTE',
                completedBy: salesActor.name,
                completedByPhoto: salesActor.photoUrl,
                completedAt: control.salesReleasedAt || null,
                startedAt: control.salesReleasedAt || null,
                notes: control.returnReason || ''
            },
            {
                processKey: 'planeacion',
                processName: 'Seguimiento',
                sequenceOrder: 3,
                routeStatus: control.launchedToGantt ? 'COMPLETADO' : (control.planningStatus === 'PENDIENTE_PLANIFICACION' ? 'RUN' : 'PENDIENTE'),
                completedBy: planningActor.name,
                completedByPhoto: planningActor.photoUrl,
                completedAt: control.launchedAt || null,
                startedAt: control.processSelectionUpdatedAt || control.salesReleasedAt || null,
                notes: control.returnReason || ''
            }
        ];
        const machineProcessKeys = new Set(['planchas', 'impresion', 'acabados', 'barnizado', 'laminado', 'troquelado', 'estampado', 'embosado', 'numeracion', 'rebobinado']);
        const processSteps = processKeys.map((key, index) => {
            const item = grouped.get(key) || {};
            const planned = snapshotByKey.get(key) || {};
            const quotedMinutes = quotedProcessDurationMinutes(orderRow, key);
            const plannedSource = String(planned.source || '').toLowerCase();
            const itemSource = String(item.durationSource || '').toLowerCase();
            const plannedDurationMinutes = Number(planned.durationHours || 0) * 60;
            const routeDurationMinutes = Number(item.durationHours || 0) * 60;
            const plannedMinutes = firstPositivePlanningNumber(
                quotedMinutes,
                plannedSource === 'fallback-estimate' || plannedSource === 'missing-duration' ? 0 : plannedDurationMinutes,
                itemSource === 'fallback-estimate' || itemSource === 'missing-duration' ? 0 : routeDurationMinutes
            );
            return {
                processKey: key,
                processName: PRODUCTION_FLOW_LABELS[key] || planned.processName || item.processName,
                sequenceOrder: index + 4,
                routeStatus: item.routeStatus || 'PENDIENTE',
                completedBy: item.completedBy || '',
                completedByPhoto: item.completedByPhoto || '',
                completedAt: item.completedAt || null,
                startedAt: item.startedAt || null,
                notes: item.notes || '',
                planned: {
                    minutes: plannedMinutes,
                    setupMinutes: Number(planned.setupMinutes || 0),
                    machineName: machineProcessKeys.has(key) ? (planned.machineName || '') : '',
                    quantity: Number(planned.baseFeet || snapshot.baseFeet || 0),
                    unit: 'ft'
                },
                real: {
                    minutes: Number(item.realMinutes || 0),
                    quantity: Number(item.feetConsumed || 0),
                    usefulQuantity: Number(item.usefulFeet || 0),
                    speedFpm: Number(item.finalSpeedFpm || 0),
                    unit: 'ft'
                }
            };
        });
        const live = processSteps.some((step) => ['RUN', 'SETUP', 'PARO'].includes(String(step.routeStatus || '').toUpperCase()));
        const steps = applyOrderTrackingMarks([...fixedSteps, ...processSteps], raw, resolveActorInfo);
        res.json({
            ok: true,
            order: orderRow,
            live,
            steps,
            comparisons: processSteps
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar el seguimiento de la orden.' });
    }
});

app.get('/api/ordenes-produccion/:codigo/materiales-consumo', async (req, res) => {
    try {
        const processKey = canonicalProductionFlowKey(req.query.process || 'impresion') || 'impresion';
        const orderResult = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [req.params.codigo]);
        if (!orderResult.rows.length) return res.status(404).json({ ok: false, error: 'Orden de producción no encontrada.' });
        const routeResult = await pgQuery(
            `SELECT id::text AS route_id, process_key, process_name, route_status
               FROM production_order_routes
              WHERE order_code = $1 AND process_key = $2
              ORDER BY sequence_order
              LIMIT 1`,
            [req.params.codigo, processKey]
        );
        const historyResult = await pgQuery(
            `SELECT id::text, process_key, sap_item_code, material_name, material_family, quantity, unit_code,
                    reason, sap_status, requested_by, requested_at, sent_at, sap_response
               FROM production_material_consumption_requests
              WHERE order_code = $1
              ORDER BY requested_at DESC
              LIMIT 100`,
            [req.params.codigo]
        );
        res.json({
            ok: true,
            orderCode: req.params.codigo,
            processKey,
            route: routeResult.rows[0] || null,
            materials: collectOrderConsumptionMaterials(orderResult.rows[0], processKey),
            history: historyResult.rows || []
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar materiales de consumo.' });
    }
});

app.post('/api/ordenes-produccion/:codigo/materiales-consumo', async (req, res) => {
    try {
        const processKey = canonicalProductionFlowKey(req.body?.processKey || 'impresion') || 'impresion';
        const sapItemCode = sanitizeAdminUserText(req.body?.sapItemCode || req.body?.materialCode || '');
        const materialName = sanitizeAdminUserText(req.body?.materialName || sapItemCode);
        const materialFamily = normalizeConsumptionFamily(req.body?.materialFamily || materialName || sapItemCode);
        const quantity = Number(req.body?.quantity || 0);
        const unitCode = sanitizeAdminUserText(req.body?.unitCode || '');
        const reason = sanitizeAdminUserText(req.body?.reason || '');
        if (!sapItemCode && !materialName) return res.status(400).json({ ok: false, error: 'Debes seleccionar un material.' });
        if (!Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ ok: false, error: 'Debes indicar una cantidad mayor a cero.' });
        if (!processAllowsConsumption(processKey, materialFamily)) {
            return res.status(400).json({ ok: false, error: 'Ese material no está autorizado para descarga en este proceso.' });
        }
        const orderResult = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [req.params.codigo]);
        if (!orderResult.rows.length) return res.status(404).json({ ok: false, error: 'Orden de producción no encontrada.' });
        const allowed = collectOrderConsumptionMaterials(orderResult.rows[0], processKey);
        const existsInOrder = allowed.some((item) => {
            const sameCode = sapItemCode && item.sapItemCode && item.sapItemCode === sapItemCode;
            const sameName = materialName && item.materialName && item.materialName.toLowerCase() === materialName.toLowerCase();
            return sameCode || sameName;
        });
        if (!existsInOrder) {
            return res.status(400).json({ ok: false, error: 'El material no pertenece a esta orden/cotización para el proceso seleccionado.' });
        }
        const routeResult = await pgQuery(
            `SELECT id::text FROM production_order_routes WHERE order_code = $1 AND process_key = $2 ORDER BY sequence_order LIMIT 1`,
            [req.params.codigo, processKey]
        );
        const order = orderResult.rows[0];
        const sapPayload = {
            kind: 'inventory-discharge',
            sapObject: 'InventoryGenExit',
            orderCode: order.order_code,
            quoteCode: order.quote_code || '',
            lineCode: order.line_code || '',
            processKey,
            lines: [{ itemCode: sapItemCode, itemName: materialName, quantity, unitCode, family: materialFamily }],
            reason
        };
        const insertResult = await pgQuery(
            `INSERT INTO production_material_consumption_requests (
                order_code, quote_code, line_code, route_id, process_key,
                sap_item_code, material_name, material_family, quantity, unit_code,
                reason, sap_status, sap_payload, requested_by
            ) VALUES ($1,$2,$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,'PENDIENTE',$12::jsonb,$13)
            RETURNING id::text, requested_at`,
            [
                order.order_code,
                order.quote_code || '',
                order.line_code || '',
                routeResult.rows[0]?.id || null,
                processKey,
                sapItemCode,
                materialName,
                materialFamily,
                quantity,
                unitCode,
                reason,
                JSON.stringify(sapPayload),
                getRequestUserName(req)
            ]
        );
        res.json({ ok: true, request: { id: insertResult.rows[0]?.id, requestedAt: insertResult.rows[0]?.requested_at, sapStatus: 'PENDIENTE', sapPayload } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible registrar la solicitud de material.' });
    }
});

app.post('/api/ordenes-produccion/:codigo/seguimiento/marca', async (req, res) => {
    try {
        const codigo = req.params.codigo;
        const processKey = normalizeOrderTrackingStepKey(req.body?.processKey);
        const marked = req.body?.marked !== false;
        if (!processKey) return res.status(400).json({ ok: false, error: 'Se requiere processKey.' });

        const orderResult = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [codigo]);
        if (!orderResult.rows.length) return res.status(404).json({ ok: false, error: 'Orden no encontrada.' });

        const rawData = orderResult.rows[0].raw_data || {};
        const actor = getRequestUserName(req);
        const actorPhoto = getRequestUserPhotoUrl(req);
        const now = new Date().toISOString();
        const mark = marked
            ? { marked: true, markedAt: now, markedBy: actor, markedByPhoto: actorPhoto }
            : { marked: false, clearedAt: now, clearedBy: actor, clearedByPhoto: actorPhoto };
        const nextRawData = withUpdatedOrderTrackingMark(rawData, processKey, mark);

        await pgQuery(`UPDATE flexo_orders SET raw_data = $2::jsonb WHERE order_code = $1`, [codigo, JSON.stringify(nextRawData)]);
        res.json({ ok: true, processKey, marked, mark });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible actualizar la marca.' });
    }
});

app.post('/api/ordenes-produccion/:codigo/seguimiento/completar', async (req, res) => {
    try {
        const codigo = req.params.codigo;
        const processKey = String(req.body?.processKey || '').trim();
        const notes = String(req.body?.notes || '').trim();
        if (!processKey) return res.status(400).json({ ok: false, error: 'Se requiere processKey.' });

        // Map special process keys to planning actions
        if (processKey === 'solicitud_vendedor') {
            // Trigger release-sales
            const orderResult = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [codigo]);
            if (!orderResult.rows.length) return res.status(404).json({ ok: false, error: 'Orden no encontrada.' });
            const rawData = orderResult.rows[0].raw_data || {};
            const actor = getRequestUserName(req);
            const nextRawData = withUpdatedOrderPlanningControl(rawData, {
                salesReleased: true,
                salesReleasedAt: new Date().toISOString(),
                salesReleasedBy: actor,
                planningStatus: 'PENDIENTE_PLANIFICACION',
                launchedToGantt: false,
                launchedAt: null, launchedBy: '',
                returnedAt: null, returnedBy: '', returnReason: ''
            });
            await pgQuery(`UPDATE flexo_orders SET raw_data = $2::jsonb WHERE order_code = $1`, [codigo, JSON.stringify(nextRawData)]);
            return res.json({ ok: true, message: 'Solicitud registrada. Orden enviada a planificación.', processKey });
        }

        if (processKey === 'planeacion') {
            // Trigger launch-gantt
            const orderResult = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [codigo]);
            if (!orderResult.rows.length) return res.status(404).json({ ok: false, error: 'Orden no encontrada.' });
            const rawData = orderResult.rows[0].raw_data || {};
            const control = getOrderPlanningControl(rawData);
            if (control.planningStatus !== 'PENDIENTE_PLANIFICACION' && control.planningStatus !== 'EN_GANTT') {
                return res.status(400).json({ ok: false, error: 'La orden debe estar pendiente de planificación.' });
            }
            const actor = getRequestUserName(req);
            const nextRawData = withUpdatedOrderPlanningControl(rawData, {
                salesReleased: true, planningStatus: 'EN_GANTT',
                launchedToGantt: true, launchedAt: new Date().toISOString(), launchedBy: actor,
                returnReason: ''
            });
            await pgQuery(`UPDATE flexo_orders SET raw_data = $2::jsonb WHERE order_code = $1`, [codigo, JSON.stringify(nextRawData)]);
            const refreshedOrder = { ...orderResult.rows[0], raw_data: nextRawData };
            try { await ensurePlanningRoutesForOrder(refreshedOrder, null, { replaceExisting: true }); } catch (e) { /* non-critical */ }
            return res.json({ ok: true, message: 'Orden lanzada a Gantt.', processKey });
        }

        // Generic route step completion — record event on matching route
        const routeResult = await pgQuery(
            `SELECT id FROM production_order_routes WHERE order_code = $1 AND process_key = $2 ORDER BY sequence_order LIMIT 1`,
            [codigo, processKey]
        );
        if (routeResult.rows.length) {
            const routeId = routeResult.rows[0].id;
            await pgQuery(
                `INSERT INTO production_route_events (route_id, operator_name, event_type, notes, event_payload, created_at)
                 VALUES ($1, $2, 'completado', $3, '{}'::jsonb, NOW())`,
                [routeId, getRequestUserName(req), notes]
            );
            await pgQuery(
                `UPDATE production_order_routes SET route_status = 'COMPLETADO', actual_end_at = NOW() WHERE id = $1`,
                [routeId]
            );
        }
        res.json({ ok: true, message: 'Paso completado.', processKey });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible completar el paso.' });
    }
});

app.post('/api/ordenes-produccion/:codigo/seguimiento/vb-revert', async (req, res) => {
    try {
        const codigo = req.params.codigo;
        const targetKey = String(req.body?.targetKey || '').trim();
        const reason = String(req.body?.reason || '').trim();
        if (!targetKey || !reason) return res.status(400).json({ ok: false, error: 'Se requiere targetKey y motivo.' });

        // Find and reset the target route
        const routeResult = await pgQuery(
            `SELECT id FROM production_order_routes WHERE order_code = $1 AND process_key = $2 ORDER BY sequence_order LIMIT 1`,
            [codigo, targetKey]
        );
        if (routeResult.rows.length) {
            const routeId = routeResult.rows[0].id;
            await pgQuery(
                `INSERT INTO production_route_events (route_id, operator_name, event_type, notes, event_payload, created_at)
                 VALUES ($1, $2, 'revertido', $3, '{}'::jsonb, NOW())`,
                [routeId, getRequestUserName(req), 'VB solicitó correcciones: ' + reason]
            );
            await pgQuery(
                `UPDATE production_order_routes SET route_status = 'PENDIENTE', actual_end_at = NULL WHERE id = $1`,
                [routeId]
            );
        }
        res.json({ ok: true, message: 'Paso revertido para correcciones.' });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible revertir el paso.' });
    }
});
app.get('/api/mes/contexto', async (req, res) => {
    try {
        await ensurePlanningRoutesForLiveOrders();
        const area = String(req.query.area || 'operario').trim().toLowerCase();
        const routeId = String(req.query.routeId || '').trim();
        const orderCode = String(req.query.orderCode || '').trim();
        const processFilter = canonicalProductionFlowKey(req.query.process || '');
        const plateKeys = ['planchas', 'preprensa', 'diseno', 'visto_bueno'];
        const targetPlateArea = area === 'planchas';
        const productionPriority = ['tintas', 'impresion', 'acabados', 'rebobinado', 'empaque'];
        const platePriority = ['diseno', 'preprensa', 'visto_bueno', 'planchas'];
        const filters = [];
        const values = [];

        if (routeId) {
            values.push(routeId);
            filters.push(`r.id = $${values.length}::uuid`);
        } else if (orderCode) {
            values.push(orderCode);
            filters.push(`r.order_code = $${values.length}`);
        }

        if (targetPlateArea) {
            values.push(plateKeys);
            filters.push(`r.process_key = ANY($${values.length}::text[])`);
        } else {
            values.push(plateKeys);
            filters.push(`NOT (r.process_key = ANY($${values.length}::text[]))`);
        }
        if (processFilter) {
            const aliases = processFilter === 'acabados'
                ? ['acabados', 'barnizado', 'laminado', 'estampado', 'embosado', 'troquelado', 'numeracion']
                : [processFilter];
            values.push(aliases);
            filters.push(`r.process_key = ANY($${values.length}::text[])`);
        }
        filters.push(`r.route_status <> 'COMPLETADO'`);
        filters.push(`(r.dependency_route_id IS NULL OR dep.route_status = 'COMPLETADO')`);

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
        const priorityList = targetPlateArea ? platePriority : productionPriority;
        const priorityCase = priorityList
            .map((key, index) => `WHEN '${key}' THEN ${index}`)
            .join(' ');
        const routeResult = await pgQuery(`
            SELECT
                r.id::text AS route_id,
                r.order_code,
                r.quote_code,
                r.line_code,
                r.process_key,
                r.process_name,
                r.route_status,
                r.sequence_order,
                r.transition_cost_min,
                r.start_turn_hour,
                r.duration_hours,
                r.actual_start_at,
                r.actual_end_at,
                mp.id::text AS machine_profile_id,
                mp.machine_name,
                mp.nominal_speed_fpm,
                mp.oee_target,
                mp.setup_minutes,
                mp.hourly_machine_cost,
                mp.hourly_operator_cost,
                o.material_code,
                o.die_code,
                o.ordered_quantity,
                o.machine_name AS quoted_machine_name,
                o.raw_data,
                o.created_at AS order_created_at
            FROM production_order_routes r
            JOIN flexo_orders o ON o.order_code = r.order_code
            LEFT JOIN production_order_routes dep ON dep.id = r.dependency_route_id
            LEFT JOIN production_machine_profiles mp ON mp.id = r.machine_profile_id
            ${whereClause}
            ORDER BY
                CASE lower(coalesce(r.process_key, ''))
                    ${priorityCase}
                    ELSE 99
                END,
                CASE
                    WHEN coalesce(mp.machine_name, '') <> '' OR coalesce(o.machine_name, '') <> '' THEN 0
                    ELSE 1
                END,
                CASE r.route_status
                    WHEN 'RUN' THEN 0
                    WHEN 'SETUP' THEN 1
                    WHEN 'PARO' THEN 2
                    WHEN 'PENDIENTE' THEN 3
                    WHEN 'COMPLETADO' THEN 4
                    ELSE 5
                END,
                r.updated_at DESC,
                r.order_code,
                r.sequence_order
            LIMIT 1
        `, values);

        const route = routeResult.rows[0];
        if (!route) {
            return res.status(404).json({ ok: false, error: 'No se encontró una ruta activa para el MES solicitado.' });
        }

        const [eventsResult, wasteResult] = await Promise.all([
            pgQuery(`
                SELECT
                    e.id::text AS id,
                    e.route_id::text AS route_id,
                    e.operator_name,
                    e.event_type,
                    e.notes,
                    e.created_at,
                    sr.id::text AS stop_reason_id,
                    sr.reason_group,
                    sr.reason_code,
                    sr.description AS stop_reason_description
                FROM production_route_events e
                LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
                WHERE e.route_id = $1::uuid
                ORDER BY e.created_at DESC
                LIMIT 50
            `, [route.route_id]),
            pgQuery(`
                SELECT
                    id::text AS id,
                    route_id::text AS route_id,
                    feet_consumed,
                    setup_waste_feet,
                    run_waste_feet,
                    useful_feet,
                    final_speed_fpm,
                    anilox_line,
                    cylinder_pressure,
                    notes,
                    created_at
                FROM production_waste_logs
                WHERE route_id = $1::uuid
                ORDER BY created_at DESC
                LIMIT 1
            `, [route.route_id])
        ]);

        const raw = route.raw_data || {};
        const lineSummary = raw.line_summary || {};
        const lineSnapshot = raw.line_snapshot || {};
        const customerName = raw.customer_name || '';
        const productName = lineSummary.job_name || lineSummary.product_name || route.order_code;
        const tintCount = Number(lineSnapshot.pantoneCount || lineSnapshot.tintCount || 0);
        const materialFeet = Number(lineSnapshot.materialFeet || route.ordered_quantity || 0);

        const firstSetup = eventsResult.rows.find((event) => String(event.event_type || '').toLowerCase() === 'setup');
        const firstRun = eventsResult.rows.find((event) => String(event.event_type || '').toLowerCase() === 'run');
        const firstCompleted = eventsResult.rows.find((event) => String(event.event_type || '').toLowerCase() === 'completado');

        res.json({
            ok: true,
            data: {
                routeId: route.route_id,
                orderCode: route.order_code,
                quoteCode: route.quote_code || '',
                lineCode: route.line_code || '',
                processKey: route.process_key,
                processName: route.process_name,
                routeStatus: route.route_status,
                sequenceOrder: route.sequence_order,
                customerName,
                productName,
                tintCount,
                plannedFeet: materialFeet,
                materialCode: route.material_code || '',
                dieCode: route.die_code || '',
                machineName: route.machine_name || route.quoted_machine_name || '',
                nominalSpeedFpm: Number(route.nominal_speed_fpm || 0),
                oeeTarget: Number(route.oee_target || 0),
                setupMinutes: Number(route.setup_minutes || 0),
                hourlyMachineCost: Number(route.hourly_machine_cost || 0),
                hourlyOperatorCost: Number(route.hourly_operator_cost || 0),
                createdAt: route.order_created_at,
                requestedAt: raw.requested_at || raw.updated_at || route.order_created_at,
                events: eventsResult.rows,
                latestWaste: wasteResult.rows[0] || null,
                timestamps: {
                    setupAt: firstSetup?.created_at || null,
                    runAt: firstRun?.created_at || null,
                    completedAt: firstCompleted?.created_at || route.actual_end_at || null
                },
                raw
            }
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar el contexto MES.' });
    }
});

app.get('/api/planificacion/dashboard-kpi', async (req, res) => {
    try {
        await ensurePlanningRoutesForLiveOrders();
        const [summaryResult, machineResult, varianceResult, stopResult] = await Promise.all([
            pgQuery(`
                WITH live_routes AS (
                    SELECT *
                    FROM production_order_routes
                ),
                waste AS (
                    SELECT
                        SUM(feet_consumed) AS feet_consumed,
                        SUM(useful_feet) AS useful_feet
                    FROM production_waste_logs
                )
                SELECT
                    COUNT(*)::int AS total_routes,
                    COUNT(*) FILTER (WHERE route_status = 'COMPLETADO')::int AS completed_routes,
                    COUNT(*) FILTER (WHERE route_status = 'RUN')::int AS running_routes,
                    COUNT(*) FILTER (WHERE route_status = 'PARO')::int AS stopped_routes,
                    COALESCE((SELECT feet_consumed FROM waste), 0) AS feet_consumed,
                    COALESCE((SELECT useful_feet FROM waste), 0) AS useful_feet
                FROM live_routes
            `),
            pgQuery(`
                WITH machine_base AS (
                    SELECT
                        mp.id,
                        mp.machine_name,
                        mp.nominal_speed_fpm,
                        COUNT(r.id) AS total_routes,
                        COUNT(*) FILTER (WHERE r.route_status = 'RUN') AS running_routes,
                        COUNT(*) FILTER (WHERE r.route_status = 'PARO') AS stopped_routes,
                        COUNT(*) FILTER (WHERE r.route_status = 'COMPLETADO') AS completed_routes,
                        AVG(CASE
                            WHEN COALESCE(w.final_speed_fpm, 0) > 0 AND COALESCE(mp.nominal_speed_fpm, 0) > 0
                                THEN LEAST(1, w.final_speed_fpm / NULLIF(mp.nominal_speed_fpm, 0))
                            ELSE NULL
                        END) AS performance_ratio,
                        SUM(COALESCE(w.feet_consumed, 0)) AS feet_consumed,
                        SUM(COALESCE(w.useful_feet, 0)) AS useful_feet
                    FROM production_machine_profiles mp
                    LEFT JOIN production_order_routes r ON r.machine_profile_id = mp.id
                    LEFT JOIN LATERAL (
                        SELECT *
                        FROM production_waste_logs w
                        WHERE w.route_id = r.id
                        ORDER BY w.created_at DESC
                        LIMIT 1
                    ) w ON TRUE
                    WHERE mp.is_active = TRUE
                    GROUP BY mp.id, mp.machine_name, mp.nominal_speed_fpm
                )
                SELECT
                    id::text AS machine_id,
                    machine_name,
                    total_routes,
                    running_routes,
                    stopped_routes,
                    completed_routes,
                    ROUND(
                        GREATEST(
                            0,
                            CASE
                                WHEN total_routes > 0 THEN 1 - (stopped_routes::numeric / total_routes::numeric)
                                ELSE 0.85
                            END
                        ) * 100, 2
                    ) AS availability_pct,
                    ROUND(COALESCE(performance_ratio, 0.8) * 100, 2) AS performance_pct,
                    ROUND(
                        CASE
                            WHEN COALESCE(feet_consumed, 0) > 0 THEN (useful_feet / NULLIF(feet_consumed, 0)) * 100
                            ELSE 95
                        END
                    , 2) AS quality_pct
                FROM machine_base
                ORDER BY machine_name
            `),
            pgQuery(`
                SELECT
                    process_name,
                    ROUND(AVG(COALESCE(duration_hours, 0) * 60), 2) AS plan_minutes,
                    ROUND(AVG(
                        CASE
                            WHEN actual_start_at IS NOT NULL AND actual_end_at IS NOT NULL
                                THEN EXTRACT(EPOCH FROM (actual_end_at - actual_start_at)) / 60
                            ELSE NULL
                        END
                    ), 2) AS real_minutes
                FROM production_order_routes
                GROUP BY process_name
                ORDER BY process_name
            `),
            pgQuery(`
                SELECT
                    COALESCE(sr.reason_group, 'Sin grupo') AS reason_group,
                    COALESCE(sr.description, 'Sin motivo') AS reason_description,
                    COUNT(*)::int AS total
                FROM production_route_events e
                LEFT JOIN production_stop_reasons sr ON sr.id = e.stop_reason_id
                WHERE lower(COALESCE(e.event_type, '')) = 'paro'
                GROUP BY COALESCE(sr.reason_group, 'Sin grupo'), COALESCE(sr.description, 'Sin motivo')
                ORDER BY total DESC, reason_group, reason_description
                LIMIT 12
            `)
        ]);

        const summary = summaryResult.rows[0] || {};
        const machineMetrics = (machineResult.rows || []).map((row) => {
            const availability = Number(row.availability_pct || 0);
            const performance = Number(row.performance_pct || 0);
            const quality = Number(row.quality_pct || 0);
            const oee = Number(((availability * performance * quality) / 10000).toFixed(2));
            return {
                machineId: row.machine_id,
                machineName: row.machine_name,
                totalRoutes: Number(row.total_routes || 0),
                runningRoutes: Number(row.running_routes || 0),
                stoppedRoutes: Number(row.stopped_routes || 0),
                completedRoutes: Number(row.completed_routes || 0),
                availabilityPct: availability,
                performancePct: performance,
                qualityPct: quality,
                oeePct: oee
            };
        });

        const average = (items, key, fallback = 0) => {
            if (!items.length) return fallback;
            return Number((items.reduce((acc, item) => acc + Number(item[key] || 0), 0) / items.length).toFixed(2));
        };

        const deliveredOnTime = Number(summary.completed_routes || 0);
        const delayedRoutes = Number(summary.stopped_routes || 0);
        const qualityGlobal = Number(
            Number(summary.feet_consumed || 0) > 0
                ? ((Number(summary.useful_feet || 0) / Number(summary.feet_consumed || 0)) * 100).toFixed(2)
                : 95
        );

        res.json({
            ok: true,
            data: {
                summary: {
                    totalRoutes: Number(summary.total_routes || 0),
                    completedRoutes: deliveredOnTime,
                    runningRoutes: Number(summary.running_routes || 0),
                    stoppedRoutes: delayedRoutes,
                    oeeAverage: average(machineMetrics, 'oeePct', 0),
                    availabilityAverage: average(machineMetrics, 'availabilityPct', 0),
                    performanceAverage: average(machineMetrics, 'performancePct', 0),
                    qualityAverage: qualityGlobal
                },
                machines: machineMetrics,
                otd: {
                    deliveredOnTime,
                    delayedRoutes,
                    weeklyOtdPct: Number(
                        (deliveredOnTime + delayedRoutes) > 0
                            ? ((deliveredOnTime / (deliveredOnTime + delayedRoutes)) * 100).toFixed(2)
                            : 0
                    ),
                    delayedItems: machineMetrics
                        .filter((item) => item.stoppedRoutes > 0)
                        .slice(0, 6)
                        .map((item) => ({
                            code: item.machineName,
                            customer: 'Planificación',
                            delay: `+${item.stoppedRoutes}`,
                            cause: 'Paros activos en rutas'
                        }))
                },
                variance: (varianceResult.rows || [])
                    .filter((row) => Number(row.plan_minutes || 0) > 0 || Number(row.real_minutes || 0) > 0)
                    .map((row) => ({
                        processName: row.process_name,
                        planMinutes: Number(row.plan_minutes || 0),
                        realMinutes: Number(row.real_minutes || 0),
                        variancePct: Number(row.plan_minutes || 0) > 0
                            ? Number((((Number(row.real_minutes || 0) - Number(row.plan_minutes || 0)) / Number(row.plan_minutes || 0)) * 100).toFixed(2))
                            : 0
                    })),
                stops: (stopResult.rows || []).map((row) => ({
                    group: row.reason_group,
                    reason: row.reason_description,
                    total: Number(row.total || 0)
                }))
            }
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible cargar el dashboard KPI.' });
    }
});

app.post('/api/mes/evento', async (req, res) => {
    try {
        const { routeId, operatorName, eventType, stopReasonId, notes } = req.body || {};
        if (!routeId || !eventType) {
            return res.status(400).json({ ok: false, error: 'Debes indicar routeId y eventType.' });
        }

        const activeOperator = pickFirstValue(sanitizeAdminUserText(operatorName), getRequestUserName(req));

        await pgQuery(`
            INSERT INTO production_route_events (
                route_id, operator_name, event_type, stop_reason_id, notes
            ) VALUES ($1,$2,$3,$4,$5)
        `, [routeId, activeOperator || null, eventType, stopReasonId || null, notes || null]);

        const statusMap = {
            setup: 'SETUP',
            run: 'RUN',
            paro: 'PARO',
            completado: 'COMPLETADO'
        };
        const nextStatus = statusMap[String(eventType).trim().toLowerCase()];
        if (nextStatus) {
            const timestampField = nextStatus === 'RUN'
                ? 'actual_start_at'
                : nextStatus === 'COMPLETADO'
                    ? 'actual_end_at'
                    : null;
            if (timestampField) {
                await pgQuery(`
                    UPDATE production_order_routes
                    SET route_status = $1,
                        ${timestampField} = COALESCE(${timestampField}, NOW()),
                        updated_at = NOW()
                    WHERE id = $2
                `, [nextStatus, routeId]);
            } else {
                await pgQuery(`
                    UPDATE production_order_routes
                    SET route_status = $1,
                        updated_at = NOW()
                    WHERE id = $2
                `, [nextStatus, routeId]);
            }
        }

        res.json({ ok: true, event: { routeId, eventType, operatorName: activeOperator, createdAt: new Date().toISOString() } });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible guardar el evento MES.' });
    }
});

app.post('/api/mes/mermas', async (req, res) => {
    try {
        const {
            routeId,
            feetConsumed,
            setupWasteFeet,
            runWasteFeet,
            finalSpeedFpm,
            aniloxLine,
            cylinderPressure,
            notes
        } = req.body || {};
        if (!routeId) {
            return res.status(400).json({ ok: false, error: 'Debes indicar routeId.' });
        }
        await pgQuery(`
            INSERT INTO production_waste_logs (
                route_id, feet_consumed, setup_waste_feet, run_waste_feet,
                final_speed_fpm, anilox_line, cylinder_pressure, notes
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [
            routeId,
            Number(feetConsumed || 0),
            Number(setupWasteFeet || 0),
            Number(runWasteFeet || 0),
            Number(finalSpeedFpm || 0),
            aniloxLine || null,
            cylinderPressure || null,
            notes || null
        ]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message || 'No fue posible guardar la declaración de merma.' });
    }
});

app.get('/api/flexo/calculo', async (req, res) => {
    try {
        const quoteId = String(req.query.quoteId || '').trim();
        const lineId = String(req.query.lineId || '').trim();

        if (!quoteId && !lineId) {
            return res.status(400).json({ error: 'Debes indicar quoteId o lineId.' });
        }

        const where = [];
        const values = [];

        if (quoteId) {
            values.push(quoteId);
            where.push(`fc.quote_code = $${values.length}`);
        }

        if (lineId) {
            values.push(lineId);
            where.push(`fc.line_code = $${values.length}`);
        }

        const currentResult = await pgQuery(
            `SELECT fc.calculation_code, fc.quote_code, fc.line_code, fc.product_code, fc.customer_code, fc.process_type, fc.machine_name, fc.die_code, fc.material_code,
                    fc.quantity, fc.subtotal_cost, fc.total_cost, fc.unit_price, fc.raw_data
               FROM flexo_calculations fc
               LEFT JOIN quotes q ON q.quote_code = fc.quote_code
              WHERE ${where.join(' AND ')}
                AND ${quoteOwnedCalculationPredicate('fc', 'q')}
              ORDER BY fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
              LIMIT 1`,
            values
        );

        if (!currentResult.rows.length) {
            return res.status(404).json({ error: 'Cálculo flexográfico no encontrado.' });
        }

        const current = currentResult.rows[0];
        const detail = mapFlexoCalculationDetail(current);
        const lineResult = await pgQuery(
            `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                    quantity, subtotal_cost, total_cost, unit_price, raw_data
               FROM (
                    SELECT DISTINCT ON (line_code)
                           fc.calculation_code, fc.quote_code, fc.line_code, fc.product_code, fc.customer_code, fc.process_type, fc.machine_name, fc.die_code, fc.material_code,
                           fc.quantity, fc.subtotal_cost, fc.total_cost, fc.unit_price, fc.raw_data, fc.created_at
                      FROM flexo_calculations fc
                      LEFT JOIN quotes q ON q.quote_code = fc.quote_code
                     WHERE fc.quote_code = $1
                       AND ${quoteOwnedCalculationPredicate('fc', 'q')}
                     ORDER BY fc.line_code NULLS LAST, fc.created_at DESC NULLS LAST, fc.calculation_code DESC NULLS LAST
               ) latest_lines
              ORDER BY
                    CASE
                        WHEN COALESCE(latest_lines.raw_data->>'Orden_Linea', '') ~ '^[0-9]+$'
                            THEN (latest_lines.raw_data->>'Orden_Linea')::integer
                        ELSE NULL
                    END NULLS LAST,
                    line_code NULLS LAST`,
            [current.quote_code]
        );
        const quoteResult = await pgQuery(
            `SELECT quote_code, customer_code, customer_name, contact_name, email, salesperson_name, phone, status, created_on, due_on, raw_data
               FROM quotes
              WHERE quote_code = $1`,
            [current.quote_code]
        );

        res.json({
            calculo: detail,
            cotizacion: quoteResult.rows.length
                ? mapQuoteHeader(quoteResult.rows[0])
                : {
                    quote_code: detail.quoteCode,
                    customer_code: detail.customerCode,
                    customer_name: detail.customerName,
                    salesperson_name: detail.salespersonName,
                    status: detail.lineStatus,
                    created_on: detail.raw_data?.['FECHA CREACION'] || '',
                    due_on: detail.raw_data?.['FECHA VENCIMIENTO'] || '',
                    raw_data: detail.raw_data
                },
            lineasRelacionadas: lineResult.rows.map(mapCalculationLine)
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el cálculo flexográfico.' });
    }
});

app.post('/api/flexo/sap-export/:quoteCode/:lineCode', async (req, res) => {
    try {
        const quoteCode = String(req.params.quoteCode || '').trim();
        const lineCode = String(req.params.lineCode || '').trim();
        if (!quoteCode || !lineCode) {
            return res.status(400).json({ error: 'Debes indicar quoteCode y lineCode.' });
        }
        const context = await getQuoteLineContext(quoteCode, lineCode);
        if (!context.line) {
            return res.status(404).json({ error: 'No se encontró la línea origen.' });
        }
        if (!Boolean(context.line.finalized_for_order ?? context.line.raw_data?.['Finalizado_Para_Orden'])) {
            return res.status(400).json({ error: 'La línea debe estar finalizada antes de preparar la salida SAP.' });
        }
        const accountingContext = await loadSapSalesOrderAccountingContext(pgQuery, {
            quoteRow: context.quote,
            lineRow: context.line
        });
        const groupContext = await loadFrontBackGroupContext(quoteCode, context.line);
        const payloads = buildSapExportPayloadsFromQuoteLine({
            quoteRow: context.quote,
            lineRow: groupContext.groupLine || context.line,
            accountingContext,
            groupMembers: groupContext.members,
            groupLine: groupContext.groupLine
        });
        const staged = await stageSapExportsForQuoteLine({
            quoteRow: context.quote,
            lineRow: context.line
        });
        res.json({
            ok: true,
            quoteCode,
            lineCode,
            targets: {
                order: {
                    internalEndpoint: '/api/sap/mirror/export-order',
                    sapObject: 'oOrders',
                    sapTables: 'ORDR / RDR1'
                },
                bom: {
                    internalEndpoint: '/api/sap/mirror/export-bom',
                    sapObject: 'oProductTrees',
                    sapTables: 'OITT / ITT1'
                },
                productionOrder: {
                    sapObject: 'oProductionOrders',
                    sapTables: 'OWOR'
                }
            },
            payloads,
            staged
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible preparar la salida SAP.' });
    }
});

app.get('/api/flexo/catalogos', async (req, res) => {
    try {
        res.json(await loadFlexoCatalogsFromDb());
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los catálogos de flexografía.' });
    }
});

app.get('/api/flexo/notificaciones', async (req, res) => {
    try {
        const quoteCode = pickFirstValue(req.query.quoteCode, req.query.quote_code);
        const lineCode = pickFirstValue(req.query.lineCode, req.query.line_code);
        if (!quoteCode || !lineCode) {
            return res.status(400).json({ error: 'Debes indicar quoteCode y lineCode.' });
        }
        const result = await pgQuery(
            `SELECT id, quote_code, line_code, seller_name, customer_name, job_name, issue_text, target_user, created_by, snapshot, created_at
               FROM quote_line_notifications
              WHERE quote_code = $1 AND line_code = $2
              ORDER BY created_at DESC`,
            [quoteCode, lineCode]
        );
        res.json({
            items: result.rows.map((row) => ({
                id: row.id,
                quoteCode: row.quote_code,
                lineCode: row.line_code,
                sellerName: row.seller_name,
                customerName: row.customer_name,
                jobName: row.job_name,
                issueText: row.issue_text,
                targetUser: row.target_user,
                createdBy: row.created_by,
                snapshot: row.snapshot || {},
                createdAt: row.created_at
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar las notificaciones.' });
    }
});

app.post('/api/flexo/notificaciones', async (req, res) => {
    try {
        const payload = req.body || {};
        const quoteCode = pickFirstValue(payload.quoteCode, payload.quote_code);
        const lineCode = pickFirstValue(payload.lineCode, payload.line_code);
        const issueText = String(payload.issueText || payload.issue_text || '').trim();
        if (!quoteCode || !lineCode || !issueText) {
            return res.status(400).json({ error: 'Debes indicar quoteCode, lineCode y el problema detectado.' });
        }
        const actor = await resolveNotificationRequestActor(req);
        const saved = await withTransaction(async (client) => {
            const result = await client.query(
                `INSERT INTO quote_line_notifications (
                    quote_code, line_code, seller_name, customer_name, job_name, issue_text, target_user, created_by, snapshot
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
                 RETURNING id, created_at`,
                [
                    quoteCode,
                    lineCode,
                    pickFirstValue(payload.sellerName, payload.seller_name),
                    pickFirstValue(payload.customerName, payload.customer_name),
                    pickFirstValue(payload.jobName, payload.job_name),
                    issueText,
                    pickFirstValue(payload.targetUser, payload.target_user),
                    pickFirstValue(actor?.user?.username, actor?.user?.name, actor?.identity, payload.actor, getConfiguredCurrentUser()),
                    JSON.stringify(payload.snapshot || {})
                ]
            );
            const thread = await ensureNotificationCenterThreadForQuoteLine({
                quoteCode,
                lineCode,
                payload,
                actor,
                client
            });
            const sender = actor?.user || {
                id: null,
                name: sanitizeAdminUserText(actor?.identity, payload.actor, getConfiguredCurrentUser()),
                email: '',
                phone: '',
                phoneSecondary: ''
            };
            const explicitTarget = pickFirstValue(payload.targetUser, payload.target_user);
            let recipient = explicitTarget ? await findAdminUserByIdentity(explicitTarget, client) : null;
            if (!recipient && thread.seller_user_id && sender.id === thread.seller_user_id) {
                recipient = await findAdminUserByIdentity(thread.created_by_name || thread.target_user_name, client);
            }
            if (!recipient) {
                recipient = await findAdminUserByIdentity(thread.seller_name || payload.sellerName, client);
            }
            const message = await createNotificationCenterMessage({
                thread,
                payload: {
                    bodyText: issueText,
                    messageType: 'texto',
                    metadata: {
                        source: 'flexo-notificacion',
                        quoteCode,
                        lineCode,
                        eventType: String(payload.eventType || '').trim()
                    }
                },
                sender,
                recipient,
                attachments: [],
                client
            });
            return {
                id: result.rows[0]?.id,
                createdAt: result.rows[0]?.created_at,
                thread: normalizeNotificationCenterThreadRow(thread),
                message
            };
        });
        res.json({ ok: true, ...saved });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible guardar la notificación.' });
    }
});

app.get('/api/notification-center/overview', async (req, res) => {
    try {
        const [threadsCount, messagesCount, attachmentsCount, activeChannelsCount, recentThreads, keysResult] = await Promise.all([
            pgQuery(`SELECT COUNT(*)::int AS total FROM notification_center_threads`),
            pgQuery(`SELECT COUNT(*)::int AS total FROM notification_center_messages`),
            pgQuery(`SELECT COUNT(*)::int AS total FROM notification_center_message_attachments`),
            pgQuery(`SELECT COUNT(*)::int AS total FROM notification_channel_keys WHERE is_enabled = TRUE`),
            pgQuery(
                `SELECT thread_code, conversation_type, document_code, quote_code, line_code, customer_name, product_name, product_summary,
                        seller_name, target_user_name, status, last_message_at, created_at
                   FROM notification_center_threads
                  ORDER BY COALESCE(last_message_at, created_at) DESC, created_at DESC
                  LIMIT 12`
            ),
            pgQuery(
                `SELECT channel_key, display_name, provider_name, is_enabled, last_validated_at, updated_at
                   FROM notification_channel_keys
                  ORDER BY CASE channel_key
                    WHEN 'whatsapp' THEN 1
                    WHEN 'correo' THEN 2
                    WHEN 'sms' THEN 3
                    WHEN 'interno' THEN 4
                    ELSE 9
                  END, channel_key`
            )
        ]);
        res.json({
            counts: {
                threads: Number(threadsCount.rows[0]?.total || 0),
                messages: Number(messagesCount.rows[0]?.total || 0),
                attachments: Number(attachmentsCount.rows[0]?.total || 0),
                activeChannels: Number(activeChannelsCount.rows[0]?.total || 0)
            },
            channels: keysResult.rows.map((row) => ({
                channelKey: String(row.channel_key || '').trim(),
                displayName: String(row.display_name || '').trim(),
                providerName: String(row.provider_name || '').trim(),
                enabled: row.is_enabled === true,
                lastValidatedAt: row.last_validated_at || null,
                updatedAt: row.updated_at || null
            })),
            threads: recentThreads.rows.map((row) => ({
                threadCode: String(row.thread_code || '').trim(),
                conversationType: String(row.conversation_type || '').trim(),
                documentCode: String(row.document_code || '').trim(),
                quoteCode: String(row.quote_code || '').trim(),
                lineCode: String(row.line_code || '').trim(),
                customerName: String(row.customer_name || '').trim(),
                productName: String(row.product_name || '').trim(),
                productSummary: String(row.product_summary || '').trim(),
                sellerName: String(row.seller_name || '').trim(),
                targetUserName: String(row.target_user_name || '').trim(),
                status: String(row.status || '').trim(),
                lastMessageAt: row.last_message_at || null,
                createdAt: row.created_at || null
            }))
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el centro de notificaciones.' });
    }
});

app.get('/api/notification-center/threads', async (req, res) => {
    try {
        const actor = await resolveNotificationRequestActor(req);
        if (!actor?.canManageAll && !actor?.user?.id) {
            return res.status(401).json({ error: 'Sesión no válida para cargar conversaciones.' });
        }
        const limit = Math.min(Math.max(Number(req.query.limit || 24) || 24, 1), 80);
        const result = await pgQuery(
            `SELECT t.*,
                    COALESCE(NULLIF(seller.full_name, ''), NULLIF(t.seller_name, '')) AS seller_display_name,
                    COALESCE(NULLIF(created_by.full_name, ''), NULLIF(t.created_by_name, '')) AS created_by_display_name,
                    COALESCE(NULLIF(target_user.full_name, ''), NULLIF(t.target_user_name, '')) AS target_display_name,
                    COALESCE(last_message.body_text, '') AS last_message_preview,
                    COALESCE(stats.message_count, 0) AS message_count,
                    COALESCE(stats.attachment_count, 0) AS attachment_count,
                    COALESCE(stats.unread_count, 0) AS unread_count
               FROM notification_center_threads t
          LEFT JOIN admin_users seller
                 ON seller.id = t.seller_user_id
          LEFT JOIN admin_users created_by
                 ON created_by.id = t.created_by_user_id
          LEFT JOIN admin_users target_user
                 ON target_user.id = t.target_user_id
          LEFT JOIN LATERAL (
                    SELECT m.body_text
                      FROM notification_center_messages m
                     WHERE m.thread_id = t.id
                     ORDER BY m.sent_at DESC
                     LIMIT 1
                ) last_message ON TRUE
          LEFT JOIN LATERAL (
                    SELECT COUNT(*)::int AS message_count,
                           COALESCE((
                               SELECT COUNT(*)::int
                                 FROM notification_center_message_attachments a
                                WHERE EXISTS (
                                    SELECT 1 FROM notification_center_messages m2
                                     WHERE m2.id = a.message_id AND m2.thread_id = t.id
                                )
                           ), 0) AS attachment_count,
                           COALESCE(SUM(CASE WHEN m.read_at IS NULL AND $2::bigint IS NOT NULL AND m.recipient_user_id = $2 THEN 1 ELSE 0 END), 0)::int AS unread_count
                      FROM notification_center_messages m
                     WHERE m.thread_id = t.id
                ) stats ON TRUE
              WHERE (
                    $1::boolean = TRUE
                    OR t.seller_user_id = $2
                    OR t.created_by_user_id = $2
                    OR t.target_user_id = $2
                    OR EXISTS (
                        SELECT 1
                          FROM notification_center_participants p
                         WHERE p.thread_id = t.id
                           AND p.user_id = $2
                    )
              )
           ORDER BY COALESCE(t.last_message_at, t.created_at) DESC, t.created_at DESC
              LIMIT $3`,
            [actor.canManageAll === true, actor.user?.id ?? null, limit]
        );
        res.json({ items: result.rows.map(normalizeNotificationCenterThreadRow) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar las conversaciones.' });
    }
});

app.get('/api/notification-center/unread-count', async (req, res) => {
    try {
        const actor = await resolveNotificationRequestActor(req);
        if (!actor?.user?.id) {
            return res.json({ unreadCount: 0 });
        }
        const result = await pgQuery(
            `SELECT COUNT(*)::int AS unread_count
               FROM notification_center_messages m
               JOIN notification_center_threads t
                 ON t.id = m.thread_id
              WHERE m.read_at IS NULL
                AND m.recipient_user_id = $1
                AND (
                    $2::boolean = TRUE
                    OR t.seller_user_id = $1
                    OR t.created_by_user_id = $1
                    OR t.target_user_id = $1
                    OR EXISTS (
                        SELECT 1
                          FROM notification_center_participants p
                         WHERE p.thread_id = t.id
                           AND p.user_id = $1
                    )
                )`,
            [actor.user.id, actor.canManageAll === true]
        );
        res.json({ unreadCount: Number(result.rows[0]?.unread_count || 0) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el contador de notificaciones.' });
    }
});

app.post('/api/notification-center/direct-thread', async (req, res) => {
    try {
        const actor = await resolveNotificationRequestActor(req);
        if (!actor?.user?.id) return res.status(401).json({ error: 'Sesión no válida para iniciar conversación.' });
        const targetName = sanitizeAdminUserText(req.body?.targetName, req.body?.targetUser, req.body?.name);
        const target = targetName ? await findAdminUserByIdentity(targetName) : null;
        if (!target?.id) return res.status(400).json({ error: 'No fue posible localizar el usuario destino.' });
        const leftId = Math.min(Number(actor.user.id), Number(target.id));
        const rightId = Math.max(Number(actor.user.id), Number(target.id));
        const threadCode = `NT-DIRECT-${leftId}-${rightId}`;
        const result = await pgQuery(
            `INSERT INTO notification_center_threads (
                thread_code, conversation_type, source_module, document_type, document_code,
                seller_user_id, seller_name, seller_email, seller_whatsapp, seller_sms,
                created_by_user_id, created_by_name, target_user_id, target_user_name, snapshot
             ) VALUES ($1,'directa','notificaciones','general',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
             ON CONFLICT (thread_code) DO UPDATE
                SET updated_at = NOW()
             RETURNING *`,
            [
                threadCode,
                `DIRECT-${leftId}-${rightId}`,
                target.id,
                target.name,
                target.email,
                target.phone,
                target.phoneSecondary || target.phone,
                actor.user.id,
                actor.user.name || actor.identity,
                target.id,
                target.name,
                JSON.stringify({ conversationType: 'directa' })
            ]
        );
        const thread = result.rows[0];
        await upsertNotificationCenterParticipant(null, thread.id, { userId: actor.user.id, displayName: actor.user.name || actor.identity, roleKey: 'creador' });
        await upsertNotificationCenterParticipant(null, thread.id, { userId: target.id, displayName: target.name, roleKey: 'destino' });
        res.json(normalizeNotificationCenterThreadRow({
            ...thread,
            seller_display_name: target.name,
            created_by_display_name: actor.user.name || actor.identity,
            target_display_name: target.name
        }));
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible iniciar la conversación.' });
    }
});

app.get('/api/notification-center/threads/:threadCode', async (req, res) => {
    try {
        const actor = await resolveNotificationRequestActor(req);
        const threadCode = String(req.params.threadCode || '').trim();
        if (!threadCode) {
            return res.status(400).json({ error: 'Debes indicar el código del hilo.' });
        }
        const thread = await getAccessibleNotificationThreadByCode(threadCode, actor);
        if (!thread) {
            return res.status(404).json({ error: 'No fue posible localizar la conversación.' });
        }
        const [participantsResult, statsResult] = await Promise.all([
            pgQuery(
                `SELECT id, thread_id, user_id, role_key, display_name, email, whatsapp_phone, sms_phone, can_manage, created_at
                   FROM notification_center_participants
                  WHERE thread_id = $1
                  ORDER BY created_at, role_key`,
                [thread.id]
            ),
            pgQuery(
                `SELECT COUNT(*)::int AS message_count,
                        COALESCE((
                            SELECT COUNT(*)::int
                              FROM notification_center_message_attachments a
                              JOIN notification_center_messages am
                                ON am.id = a.message_id
                             WHERE am.thread_id = $1
                        ), 0) AS attachment_count,
                        COALESCE(SUM(CASE WHEN read_at IS NULL AND $2::bigint IS NOT NULL AND recipient_user_id = $2 THEN 1 ELSE 0 END), 0)::int AS unread_count
                   FROM notification_center_messages
                  WHERE thread_id = $1`,
                [thread.id, actor.user?.id ?? null]
            )
        ]);
        const displayResult = await pgQuery(
            `SELECT COALESCE(NULLIF(seller.full_name, ''), NULLIF($2, '')) AS seller_display_name,
                    COALESCE(NULLIF(created_by.full_name, ''), NULLIF($3, '')) AS created_by_display_name,
                    COALESCE(NULLIF(target_user.full_name, ''), NULLIF($4, '')) AS target_display_name
               FROM notification_center_threads t
          LEFT JOIN admin_users seller ON seller.id = t.seller_user_id
          LEFT JOIN admin_users created_by ON created_by.id = t.created_by_user_id
          LEFT JOIN admin_users target_user ON target_user.id = t.target_user_id
              WHERE t.id = $1
              LIMIT 1`,
            [thread.id, thread.seller_name || '', thread.created_by_name || '', thread.target_user_name || '']
        );
        const normalizedThread = normalizeNotificationCenterThreadRow({
            ...thread,
            ...(displayResult.rows[0] || {}),
            message_count: statsResult.rows[0]?.message_count || 0,
            attachment_count: statsResult.rows[0]?.attachment_count || 0,
            unread_count: statsResult.rows[0]?.unread_count || 0
        });
        res.json({
            ...normalizedThread,
            participants: participantsResult.rows.map(normalizeNotificationCenterParticipantRow)
        });
    } catch (error) {
        const status = /identificar al usuario/i.test(error.message || '') ? 401 : /localizar la conversación/i.test(error.message || '') ? 404 : 500;
        res.status(status).json({ error: error.message || 'No fue posible cargar el detalle de la conversación.' });
    }
});

app.patch('/api/notification-center/threads/:threadCode/read', async (req, res) => {
    try {
        const actor = await resolveNotificationRequestActor(req);
        const threadCode = String(req.params.threadCode || '').trim();
        if (!threadCode) {
            return res.status(400).json({ error: 'Debes indicar el código del hilo.' });
        }
        const thread = await getAccessibleNotificationThreadByCode(threadCode, actor);
        if (!thread) {
            return res.status(404).json({ error: 'No fue posible localizar la conversación.' });
        }
        if (!actor.user?.id) {
            return res.status(401).json({ error: 'Sesión no válida para marcar la conversación.' });
        }
        const result = await pgQuery(
            `UPDATE notification_center_messages
                SET delivered_at = COALESCE(delivered_at, NOW()),
                    received_at = COALESCE(received_at, NOW()),
                    read_at = COALESCE(read_at, NOW()),
                    external_status = CASE WHEN channel_key = 'interno' THEN 'leido' ELSE external_status END
              WHERE thread_id = $1
                AND recipient_user_id = $2
                AND read_at IS NULL`,
            [thread.id, actor.user.id]
        );
        res.json({ ok: true, marked: Number(result.rowCount || 0) });
    } catch (error) {
        const status = /identificar al usuario|sesión no válida/i.test(error.message || '') ? 401 : /localizar la conversación/i.test(error.message || '') ? 404 : 500;
        res.status(status).json({ error: error.message || 'No fue posible marcar la conversación como vista.' });
    }
});

app.delete('/api/notification-center/threads/:threadCode', async (req, res) => {
    try {
        const actor = await resolveNotificationRequestActor(req);
        const threadCode = String(req.params.threadCode || '').trim();
        if (!threadCode) {
            return res.status(400).json({ error: 'Debes indicar el código del hilo.' });
        }
        const deleted = await withTransaction(async (client) => {
            const thread = await getAccessibleNotificationThreadByCode(threadCode, actor, client);
            if (!thread) {
                const error = new Error('No fue posible localizar la conversación.');
                error.statusCode = 404;
                throw error;
            }
            const filesResult = await client.query(
                `SELECT a.storage_path
                   FROM notification_center_message_attachments a
                   JOIN notification_center_messages m
                     ON m.id = a.message_id
                  WHERE m.thread_id = $1
                    AND COALESCE(a.storage_path, '') <> ''`,
                [thread.id]
            );
            const deleteResult = await client.query(
                `DELETE FROM notification_center_threads
                  WHERE id = $1
                  RETURNING thread_code`,
                [thread.id]
            );
            return {
                threadCode: deleteResult.rows[0]?.thread_code || threadCode,
                deletedThreads: Number(deleteResult.rowCount || 0),
                deletedAttachmentFiles: filesResult.rows
            };
        });
        deleteNotificationAttachmentFiles(deleted.deletedAttachmentFiles);
        delete deleted.deletedAttachmentFiles;
        res.json({ ok: true, ...deleted });
    } catch (error) {
        const status = Number(error.statusCode) || (/identificar al usuario/i.test(error.message || '') ? 401 : /localizar la conversación/i.test(error.message || '') ? 404 : 500);
        res.status(status).json({ error: error.message || 'No fue posible eliminar la conversación.' });
    }
});

app.get('/api/notification-center/threads/:threadCode/messages', async (req, res) => {
    try {
        const actor = await resolveNotificationRequestActor(req);
        const threadCode = String(req.params.threadCode || '').trim();
        if (!threadCode) {
            return res.status(400).json({ error: 'Debes indicar el código del hilo.' });
        }
        const thread = await getAccessibleNotificationThreadByCode(threadCode, actor);
        if (!thread) {
            return res.status(404).json({ error: 'No fue posible localizar la conversación.' });
        }
        if (actor.user?.id) {
            await pgQuery(
                `UPDATE notification_center_messages
                    SET delivered_at = COALESCE(delivered_at, NOW()),
                        received_at = COALESCE(received_at, NOW()),
                        read_at = COALESCE(read_at, NOW()),
                        external_status = CASE WHEN channel_key = 'interno' THEN 'leido' ELSE external_status END
                  WHERE thread_id = $1
                    AND recipient_user_id = $2
                    AND read_at IS NULL`,
                [thread.id, actor.user.id]
            );
        }
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
        const offset = Math.max(Number(req.query.offset) || 0, 0);
        const [messagesResult, attachmentsResult, countResult] = await Promise.all([
            pgQuery(
                `SELECT id, message_code, thread_id, message_type, channel_key, body_text,
                        sender_user_id, sender_name, sender_email, sender_whatsapp, sender_sms,
                        recipient_user_id, recipient_name, recipient_email, recipient_whatsapp, recipient_sms,
                        is_inbound, external_status, delivered_at, received_at, read_at, failed_at, sent_at, metadata
                   FROM notification_center_messages
                  WHERE thread_id = $1
                  ORDER BY sent_at DESC, id DESC
                  LIMIT $2 OFFSET $3`,
                [thread.id, limit, offset]
            ),
            pgQuery(
                `SELECT a.id, a.message_id, a.attachment_kind, a.file_name, a.mime_type, a.file_ext, a.content_base64, a.preview_base64, a.size_bytes, a.notes, a.uploaded_by, a.created_at
                   FROM notification_center_message_attachments a
                   JOIN notification_center_messages m
                     ON m.id = a.message_id
                  WHERE m.thread_id = $1
                  ORDER BY a.created_at ASC, a.id ASC`,
                [thread.id]
            ),
            pgQuery(
                `SELECT COUNT(*)::int AS total FROM notification_center_messages WHERE thread_id = $1`,
                [thread.id]
            )
        ]);
        const totalMessages = countResult.rows[0]?.total || 0;
        messagesResult.rows.reverse();
        const attachmentsMap = new Map();
        for (const row of attachmentsResult.rows) {
            const messageId = String(row.message_id || '').trim();
            if (!attachmentsMap.has(messageId)) attachmentsMap.set(messageId, []);
            attachmentsMap.get(messageId).push({
                id: String(row.id || '').trim(),
                attachmentKind: String(row.attachment_kind || '').trim(),
                fileName: String(row.file_name || '').trim(),
                mimeType: String(row.mime_type || '').trim(),
                fileExt: String(row.file_ext || '').trim(),
                contentBase64: String(row.content_base64 || '').trim(),
                previewBase64: String(row.preview_base64 || '').trim(),
                sizeBytes: Number(row.size_bytes || 0),
                notes: String(row.notes || '').trim(),
                uploadedBy: String(row.uploaded_by || '').trim(),
                downloadUrl: `/api/notification-center/attachments/${row.id}/download`,
                createdAt: row.created_at || null
            });
        }
        res.json({
            items: messagesResult.rows.map((row) => normalizeNotificationCenterMessageRow(row, attachmentsMap.get(String(row.id || '').trim()) || [])),
            hasMore: (offset + limit) < totalMessages,
            total: totalMessages
        });
    } catch (error) {
        const status = /identificar al usuario/i.test(error.message || '') ? 401 : /localizar la conversación/i.test(error.message || '') ? 404 : 500;
        res.status(status).json({ error: error.message || 'No fue posible cargar los mensajes.' });
    }
});

app.post('/api/notification-center/threads/:threadCode/messages', async (req, res) => {
    try {
        const actor = await resolveNotificationRequestActor(req);
        const threadCode = String(req.params.threadCode || '').trim();
        if (!threadCode) {
            return res.status(400).json({ error: 'Debes indicar el código del hilo.' });
        }
        const thread = await getAccessibleNotificationThreadByCode(threadCode, actor);
        if (!thread) {
            return res.status(404).json({ error: 'No fue posible localizar la conversación.' });
        }
        const payload = req.body || {};
        const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
        const sender = actor.user || {
            id: null,
            name: sanitizeAdminUserText(payload.actor, actor.identity, getConfiguredCurrentUser()),
            email: '',
            phone: '',
            phoneSecondary: ''
        };
        let recipient = null;
        if (payload.recipientUserId || payload.recipientName) {
            recipient = await findAdminUserByIdentity(payload.recipientName || payload.recipientUserId, null);
        }
        if (!recipient) {
            const senderId = sender.id ?? null;
            if (senderId && thread.seller_user_id && senderId === thread.seller_user_id) {
                recipient = await findAdminUserByIdentity(thread.created_by_name || thread.target_user_name, null);
            } else {
                recipient = await findAdminUserByIdentity(thread.seller_name || thread.target_user_name, null);
            }
        }
        const generalConfig = await loadGeneralConfig();
        const general = generalConfig?.general || {};
        const maxUploadMb = Number(general.maxUploadMb) || 10;
        const message = await createNotificationCenterMessage({
            thread,
            payload: { ...payload, maxUploadMb },
            sender,
            recipient,
            attachments
        });
        res.json(message);
    } catch (error) {
        const status = /indicar un mensaje/i.test(error.message || '') ? 400 : /identificar al usuario/i.test(error.message || '') ? 401 : /localizar la conversación/i.test(error.message || '') ? 404 : 500;
        res.status(status).json({ error: error.message || 'No fue posible enviar el mensaje.' });
    }
});

app.get('/api/notification-center/attachments/:id/download', async (req, res) => {
    try {
        const actor = await resolveNotificationRequestActor(req);
        const result = await pgQuery(
            `SELECT a.file_name, a.mime_type, a.content_base64, a.storage_path, m.thread_id
               FROM notification_center_message_attachments a
               JOIN notification_center_messages m
                 ON m.id = a.message_id
              WHERE a.id = $1
              LIMIT 1`,
            [req.params.id]
        );
        if (!result.rows.length) return res.status(404).send('Adjunto no encontrado.');
        const attachment = result.rows[0];
        const access = await pgQuery(
            `SELECT 1
               FROM notification_center_threads t
              WHERE t.id = $1
                AND (
                    $3::boolean = TRUE
                    OR t.seller_user_id = $2
                    OR t.created_by_user_id = $2
                    OR t.target_user_id = $2
                    OR EXISTS (
                        SELECT 1
                          FROM notification_center_participants p
                         WHERE p.thread_id = t.id
                           AND p.user_id = $2
                    )
                )
              LIMIT 1`,
            [attachment.thread_id, actor.user?.id ?? null, actor.canManageAll === true]
        );
        if (!access.rows.length) return res.status(404).send('Adjunto no encontrado.');
        res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
        const absolutePath = resolveNotificationAttachmentStoragePath(attachment.storage_path);
        if (absolutePath && fs.existsSync(absolutePath)) return res.sendFile(absolutePath);
        const buffer = Buffer.from(String(attachment.content_base64 || ''), 'base64');
        if (!buffer.length) return res.status(404).send('Archivo adjunto no encontrado en disco.');
        res.send(buffer);
    } catch (error) {
        const status = /identificar al usuario/i.test(error.message || '') ? 401 : 500;
        res.status(status).send(error.message || 'No fue posible descargar el adjunto.');
    }
});

app.get('/api/notification-center/keys', async (req, res) => {
    try {
        const result = await pgQuery(
            `SELECT channel_key, display_name, provider_name, api_url, account_identifier, access_key, access_secret,
                    is_enabled, is_test_mode, advanced_config, last_validated_at, updated_at
               FROM notification_channel_keys
              ORDER BY CASE channel_key
                WHEN 'whatsapp' THEN 1
                WHEN 'correo' THEN 2
                WHEN 'sms' THEN 3
                WHEN 'interno' THEN 4
                ELSE 9
              END, channel_key`
        );
        res.json({ items: result.rows.map(normalizeNotificationChannelKeyRecord) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar las llaves de notificación.' });
    }
});

app.patch('/api/notification-center/keys/:channelKey', async (req, res) => {
    try {
        const channelKey = String(req.params.channelKey || '').trim().toLowerCase();
        if (!channelKey) {
            return res.status(400).json({ error: 'Canal no válido.' });
        }
        const result = await pgQuery(
            `UPDATE notification_channel_keys
                SET display_name = $2,
                    provider_name = $3,
                    api_url = $4,
                    account_identifier = $5,
                    access_key = $6,
                    access_secret = $7,
                    is_enabled = $8,
                    is_test_mode = $9,
                    advanced_config = $10::jsonb,
                    updated_at = NOW()
              WHERE channel_key = $1
          RETURNING channel_key, display_name, provider_name, api_url, account_identifier, access_key, access_secret,
                    is_enabled, is_test_mode, advanced_config, last_validated_at, updated_at`,
            [
                channelKey,
                pickFirstValue(req.body?.displayName, req.body?.display_name, channelKey),
                pickFirstValue(req.body?.providerName, req.body?.provider_name),
                pickFirstValue(req.body?.apiUrl, req.body?.api_url),
                pickFirstValue(req.body?.accountIdentifier, req.body?.account_identifier),
                pickFirstValue(req.body?.accessKey, req.body?.access_key),
                pickFirstValue(req.body?.accessSecret, req.body?.access_secret),
                req.body?.enabled === true,
                req.body?.testMode !== false,
                JSON.stringify(req.body?.advancedConfig || req.body?.advanced_config || {})
            ]
        );
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Llave de notificación no encontrada.' });
        }
        res.json(normalizeNotificationChannelKeyRecord(result.rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible guardar la llave de notificación.' });
    }
});

app.get('/api/notification-alert-contacts', async (req, res) => {
    try {
        const result = await pgQuery(
            `SELECT id, full_name, email, phone, severity_low, severity_medium, severity_high, is_active, created_at, updated_at
               FROM notification_alert_contacts
              ORDER BY is_active DESC, LOWER(full_name), created_at DESC`
        );
        res.json({ items: result.rows.map(normalizeNotificationAlertContactRow) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los contactos de alerta.' });
    }
});

app.post('/api/notification-alert-contacts', async (req, res) => {
    try {
        const fullName = sanitizeAdminUserText(req.body?.fullName, req.body?.full_name);
        if (!fullName) {
            return res.status(400).json({ error: 'Debes indicar el nombre del contacto.' });
        }
        const severityLow = req.body?.severityLow === true || req.body?.severity_low === true;
        const severityMedium = req.body?.severityMedium === true || req.body?.severity_medium === true;
        const severityHigh = req.body?.severityHigh === true || req.body?.severity_high === true;
        if (!severityLow && !severityMedium && !severityHigh) {
            return res.status(400).json({ error: 'Debes activar al menos un nivel de severidad.' });
        }
        const result = await pgQuery(
            `INSERT INTO notification_alert_contacts (
                full_name, email, phone, severity_low, severity_medium, severity_high, is_active
             ) VALUES ($1,$2,$3,$4,$5,$6,$7)
             RETURNING id, full_name, email, phone, severity_low, severity_medium, severity_high, is_active, created_at, updated_at`,
            [
                fullName,
                sanitizeAdminUserText(req.body?.email),
                sanitizeAdminUserText(req.body?.phone),
                severityLow,
                severityMedium,
                severityHigh,
                req.body?.isActive !== false && req.body?.is_active !== false
            ]
        );
        res.status(201).json(normalizeNotificationAlertContactRow(result.rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible crear el contacto de alerta.' });
    }
});

app.patch('/api/notification-alert-contacts/:id', async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        if (!id) {
            return res.status(400).json({ error: 'Identificador no válido.' });
        }
        const existing = await pgQuery(
            `SELECT id
               FROM notification_alert_contacts
              WHERE id = $1
              LIMIT 1`,
            [id]
        );
        if (!existing.rows.length) {
            return res.status(404).json({ error: 'Contacto de alerta no encontrado.' });
        }
        const fullName = sanitizeAdminUserText(req.body?.fullName, req.body?.full_name);
        if (!fullName) {
            return res.status(400).json({ error: 'Debes indicar el nombre del contacto.' });
        }
        const severityLow = req.body?.severityLow === true || req.body?.severity_low === true;
        const severityMedium = req.body?.severityMedium === true || req.body?.severity_medium === true;
        const severityHigh = req.body?.severityHigh === true || req.body?.severity_high === true;
        if (!severityLow && !severityMedium && !severityHigh) {
            return res.status(400).json({ error: 'Debes activar al menos un nivel de severidad.' });
        }
        const result = await pgQuery(
            `UPDATE notification_alert_contacts
                SET full_name = $2,
                    email = $3,
                    phone = $4,
                    severity_low = $5,
                    severity_medium = $6,
                    severity_high = $7,
                    is_active = $8,
                    updated_at = NOW()
              WHERE id = $1
          RETURNING id, full_name, email, phone, severity_low, severity_medium, severity_high, is_active, created_at, updated_at`,
            [
                id,
                fullName,
                sanitizeAdminUserText(req.body?.email),
                sanitizeAdminUserText(req.body?.phone),
                severityLow,
                severityMedium,
                severityHigh,
                req.body?.isActive !== false && req.body?.is_active !== false
            ]
        );
        res.json(normalizeNotificationAlertContactRow(result.rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible actualizar el contacto de alerta.' });
    }
});

app.get('/api/notification-alert-routing-preview', async (req, res) => {
    try {
        const [low, medium, high] = await Promise.all([
            listNotificationAlertContactsBySeverity('low'),
            listNotificationAlertContactsBySeverity('medium'),
            listNotificationAlertContactsBySeverity('high')
        ]);
        res.json({
            low,
            medium,
            high,
            counts: {
                low: low.length,
                medium: medium.length,
                high: high.length
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar la vista previa de alertas.' });
    }
});

app.get('/api/inventory-classification-mappings', async (req, res) => {
    try {
        const result = await pgQuery(`
            SELECT id, source_value, flexo_category, display_label, notes, is_active, created_at, updated_at
              FROM inventory_classification_mappings
          ORDER BY is_active DESC, LOWER(source_value), created_at DESC
        `);
        res.json({ items: result.rows.map(normalizeInventoryClassificationMappingRow) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el mapeo de clasificación de inventario.' });
    }
});

app.post('/api/inventory-classification-mappings', async (req, res) => {
    try {
        const sourceValue = sanitizeAdminUserText(req.body?.sourceValue, req.body?.source_value);
        const flexoCategory = sanitizeAdminUserText(req.body?.flexoCategory, req.body?.flexo_category);
        if (!sourceValue) {
            return res.status(400).json({ error: 'Debes indicar el valor origen del campo SAP.' });
        }
        if (!flexoCategory) {
            return res.status(400).json({ error: 'Debes indicar la categoría flexográfica.' });
        }
        const result = await pgQuery(`
            INSERT INTO inventory_classification_mappings (
                source_value, flexo_category, display_label, notes, is_active
            ) VALUES ($1,$2,$3,$4,$5)
            RETURNING id, source_value, flexo_category, display_label, notes, is_active, created_at, updated_at
        `, [
            sourceValue,
            flexoCategory,
            sanitizeAdminUserText(req.body?.displayLabel, req.body?.display_label),
            sanitizeAdminUserText(req.body?.notes),
            req.body?.isActive !== false && req.body?.is_active !== false
        ]);
        res.status(201).json(normalizeInventoryClassificationMappingRow(result.rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible crear el mapeo de clasificación.' });
    }
});

app.patch('/api/inventory-classification-mappings/:id', async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        if (!id) {
            return res.status(400).json({ error: 'Identificador no válido.' });
        }
        const sourceValue = sanitizeAdminUserText(req.body?.sourceValue, req.body?.source_value);
        const flexoCategory = sanitizeAdminUserText(req.body?.flexoCategory, req.body?.flexo_category);
        if (!sourceValue) {
            return res.status(400).json({ error: 'Debes indicar el valor origen del campo SAP.' });
        }
        if (!flexoCategory) {
            return res.status(400).json({ error: 'Debes indicar la categoría flexográfica.' });
        }
        const result = await pgQuery(`
            UPDATE inventory_classification_mappings
               SET source_value = $2,
                   flexo_category = $3,
                   display_label = $4,
                   notes = $5,
                   is_active = $6,
                   updated_at = NOW()
             WHERE id = $1
         RETURNING id, source_value, flexo_category, display_label, notes, is_active, created_at, updated_at
        `, [
            id,
            sourceValue,
            flexoCategory,
            sanitizeAdminUserText(req.body?.displayLabel, req.body?.display_label),
            sanitizeAdminUserText(req.body?.notes),
            req.body?.isActive !== false && req.body?.is_active !== false
        ]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Mapeo de clasificación no encontrado.' });
        }
        res.json(normalizeInventoryClassificationMappingRow(result.rows[0]));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible actualizar el mapeo de clasificación.' });
    }
});

app.delete('/api/inventory-classification-mappings/:id', async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        if (!id) {
            return res.status(400).json({ error: 'Identificador no válido.' });
        }
        const result = await pgQuery(`
            DELETE FROM inventory_classification_mappings
             WHERE id = $1
         RETURNING id
        `, [id]);
        if (!result.rows.length) {
            return res.status(404).json({ error: 'Mapeo de clasificación no encontrado.' });
        }
        res.json({ ok: true, id });
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible eliminar el mapeo de clasificación.' });
    }
});

app.post('/api/flexo/calculo/guardar', async (req, res) => {
    try {
        const incomingPayload = req.body || {};
        const payload = { ...incomingPayload };
        const quoteCode = pickFirstValue(payload.quoteCode, payload.quote_code);
        const currentLineCode = pickFirstValue(payload.originalLineCode, payload.lineCode, payload.line_code);
        if (!quoteCode || !currentLineCode) {
            return res.status(400).json({ error: 'Debes indicar quoteCode y lineCode.' });
        }

        const existing = await pgQuery(
            `SELECT calculation_code, raw_data
               FROM flexo_calculations
              WHERE quote_code = $1 AND line_code = $2
              ORDER BY created_at DESC NULLS LAST
              LIMIT 1`,
            [quoteCode, currentLineCode]
        );

        if (!existing.rows.length) {
            return res.status(404).json({ error: 'No se encontró la línea a guardar.' });
        }
        const existingGroup = normalizeFrontBackGroup(existing.rows[0].raw_data || {});
        if (existingGroup && existingGroup.role === 'elemento') {
            const groupContext = await loadFrontBackGroupContext(quoteCode, { quote_code: quoteCode, line_code: currentLineCode, raw_data: existing.rows[0].raw_data });
            const groupQuantity = frontBackLineQuantity(groupContext.groupLine);
            payload.quantityProducts = groupQuantity;
        }

        const lineCode = pickFirstValue(payload.lineCode, payload.line_code, currentLineCode);
        const machineName = await resolveSingleInventoryMachineName(payload.machineName);
        const rawData = buildCalculationRawData({
            quote_code: quoteCode,
            line_code: lineCode,
            customer_code: payload.customerCode,
            customer_name: payload.customerName,
            salesperson_name: payload.salespersonName,
            process_type: payload.processType,
            material_code: payload.materialId,
            material_name: payload.materialName,
            die_code: payload.dieId,
            machine_name: machineName,
            quantityProducts: payload.quantityProducts,
            quantityTypes: payload.quantityTypes,
            quantityChanges: payload.quantityChanges,
            widthInches: payload.widthInches,
            lengthInches: payload.lengthInches,
            stationCount: payload.stationCount,
            labelsPerRoll: payload.labelsPerRoll,
            coreWidth: payload.uiState?.coreWidth ?? payload.coreWidth,
            coreDiameter: payload.uiState?.coreDiameter ?? payload.coreDiameter,
            applicationType: payload.applicationType,
            applicationEnvironment: payload.applicationEnvironment,
            surfaceType: payload.surfaceType,
            outputType: payload.outputType,
            cmyk: payload.cmyk,
            uiState: payload.uiState,
            total_cost: payload.finalTotal,
            unit_price: payload.unitPrice,
            status: payload.lineStatus,
            job_name: payload.jobName,
            department: payload.department,
            processResult: payload.processResult
        }, existing.rows[0].raw_data || {});
        const validationMessages = Array.isArray(payload.validationMessages)
            ? payload.validationMessages.map((item) => sanitizeAdminUserText(item)).filter(Boolean)
            : [];
        const validationSummary = sanitizeAdminUserText(payload.validationSummary, validationMessages.join(' '));
        const validationBlocked = Boolean(payload.validationBlocking || validationSummary);
        rawData['ANALISIS CAMPOS SOLICITUD'] = validationBlocked ? validationSummary : '';
        rawData['ANALISIS CAMPOS FINALIZAR'] = validationBlocked ? validationSummary : '';
        rawData['ANALISIS CAMPOS CREAR ORDEN'] = validationBlocked ? validationSummary : '';
        rawData['ANALISIS CAMPOS PDF'] = validationBlocked ? validationSummary : '';
        rawData['Mensajes_Validacion'] = validationMessages;
        rawData['Validacion_Bloqueada'] = validationBlocked;
        if (Object.prototype.hasOwnProperty.call(payload, 'trackingClosure')) {
            rawData['Cierre_Cotizacion'] = payload.trackingClosure || null;
        }
        applyCurrencyFieldsToRawData(rawData, payload.exchangeRate ?? payload.exchange_rate);
        if (Object.prototype.hasOwnProperty.call(payload, 'finalized_for_order') || Object.prototype.hasOwnProperty.call(payload, 'finalizedForOrder')) {
            rawData['Finalizado_Para_Orden'] = Boolean(Object.prototype.hasOwnProperty.call(payload, 'finalized_for_order')
                ? payload.finalized_for_order
                : payload.finalizedForOrder);
        }
        const finalizeValidation = proformaBlockingMessagesFromRaw(rawData).join(' ');
        if (Boolean(rawData['Finalizado_Para_Orden']) && finalizeValidation) {
            throw new Error(finalizeValidation);
        }
        const normalizedGroup = normalizeFrontBackGroup(rawData);
        if (normalizedGroup) {
            applyFrontBackQuantityToRawData(rawData, parseLegacyNumber(payload.quantityProducts) ?? 0);
        }
        applyCalculationLineSummary(rawData, {
            quote_code: quoteCode,
            line_code: lineCode,
            product_code: payload.productCode,
            customer_code: payload.customerCode,
            process_type: payload.processType,
            machine_name: machineName,
            die_code: payload.dieId,
            material_code: payload.materialId,
            quantity: parseLegacyNumber(payload.quantityProducts),
            total_cost: parseLegacyNumber(payload.finalTotal),
            unit_price: parseLegacyNumber(payload.unitPrice)
        });

        await pgQuery(
            `UPDATE flexo_calculations
                SET line_code = $3,
                    process_type = $4,
                    machine_name = $5,
                    die_code = $6,
                    material_code = $7,
                    quantity = $8,
                    total_cost = $9,
                    unit_price = $10,
                    raw_data = $11::jsonb
              WHERE calculation_code = $1 AND quote_code = $2`,
            [
                existing.rows[0].calculation_code,
                quoteCode,
                lineCode,
                pickFirstValue(payload.processType, 'Convencional'),
                machineName || null,
                pickFirstValue(payload.dieId),
                pickFirstValue(payload.materialId),
                parseLegacyNumber(payload.quantityProducts),
                parseLegacyNumber(payload.finalTotal),
                parseLegacyNumber(payload.unitPrice),
                JSON.stringify(rawData)
            ]
        );

        if (normalizedGroup && normalizedGroup.role === 'grupo') {
            await syncFrontBackGroupQuantity({
                quoteCode,
                group: normalizedGroup,
                quantity: parseLegacyNumber(payload.quantityProducts) ?? 0,
                excludeCalculationCode: existing.rows[0].calculation_code
            });
        }

        const detail = await pgQuery(
            `SELECT calculation_code, quote_code, line_code, product_code, customer_code, process_type, machine_name, die_code, material_code,
                    quantity, subtotal_cost, total_cost, unit_price, raw_data
               FROM flexo_calculations
              WHERE calculation_code = $1`,
            [existing.rows[0].calculation_code]
        );
        res.json({ calculo: mapFlexoCalculationDetail(detail.rows[0]) });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible guardar el cálculo.' });
    }
});

app.get('/api/inventario/:kind', async (req, res) => {
    try {
        const items = await listInventory(req.params.kind, {
            q: req.query.q || '',
            limit: req.query.limit || 300
        });
        res.json({ items, total: items.length });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el inventario.' });
    }
});

app.get('/api/inventario/troqueles/:codigo', async (req, res) => {
    try {
        const item = await getTroquelByCode(req.params.codigo);
        if (!item) {
            return res.status(404).json({ error: 'Troquel no encontrado.' });
        }
        res.json(item);
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar el troquel.' });
    }
});

app.post('/api/inventario/:kind', async (req, res) => {
    try {
        const id = await saveInventory(req.params.kind, req.body || {});
        const items = await listInventory(req.params.kind, { limit: 5000 });
        const record = items.find((item) => item.id === id) || null;
        res.json({ ok: true, id, item: record });
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible guardar el registro.' });
    }
});

app.delete('/api/inventario/:kind/:id', async (req, res) => {
    try {
        const deleted = await deleteInventory(req.params.kind, req.params.id);
        res.json({ ok: true, deleted });
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible eliminar el registro.' });
    }
});

app.post('/api/inventario/:kind/import', async (req, res) => {
    try {
        const base64 = String(req.body?.contentBase64 || '').trim();
        if (!base64) {
            throw new Error('No se recibió el archivo a importar.');
        }
        const buffer = Buffer.from(base64, 'base64');
        const result = await importInventory(req.params.kind, buffer);
        res.json({ ok: true, ...result });
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible importar el inventario.' });
    }
});

app.get('/api/inventario/:kind/export', async (req, res) => {
    try {
        const buffer = await exportInventoryWorkbook(req.params.kind);
        const safeKind = String(req.params.kind || 'inventario').replace(/[^a-z0-9_-]+/gi, '-');
        const fileName = `${safeKind}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible exportar el inventario.' });
    }
});

app.get('/api/catalogs', async (req, res) => {
    try {
        const scope = String(req.query.scope || '').trim();
        const catalogs = {};
        const materialRows = !scope || scope === 'all' ? await listInventory('materiales', { limit: 5000 }) : [];
        const machineRows = !scope || scope === 'all' ? await listInventory('maquinas', { limit: 5000 }) : [];
        const troquelRows = !scope || scope === 'all' ? await listInventory('troqueles', { limit: 5000 }) : [];
        const processes = !scope || scope === 'all' ? await listInventory('procesos', { limit: 2000 }) : [];
        const outputTypes = await listInventory('tipos-salida', { limit: 500 });
        if (scope === 'output-types') {
            return res.json({ outputTypes });
        }
        const materials = await loadFlexoMaterialsCatalog({ localRows: materialRows });
        const machines = machineRows.map((item) => {
            const capacities = Array.isArray(item.capacidades) ? item.capacidades : [];
            const primary = capacities.find((entry) => entry && entry.activa !== false) || capacities[0] || null;
            return {
                id: item.id,
                nombre: item.nombre,
                name: item.nombre,
                machineName: item.nombre,
                marca: item.marca || '',
                modelo: item.modelo || '',
                tipo: item.tipo,
                type: item.tipo,
                speedUnit: item.unidad_velocidad_produccion || 'ft/min',
                activa: item.activa,
                active: item.activa,
                observaciones: item.observaciones,
                category: primary?.clasificacion || '',
                clasificacion: primary?.clasificacion || '',
                process: primary?.proceso || '',
                proceso: primary?.proceso || '',
                subprocess: primary?.subproceso || '',
                subproceso: primary?.subproceso || '',
                setupBaseMinutes: primary?.tiempo_preparacion_general ?? 0,
                setupPerStationMinutes: primary?.tiempo_por_estacion ?? item.factor_montaje_estacion ?? 0,
                anchoMaxIn: primary?.ancho_max_in ?? item.ancho_max_in ?? 0,
                ancho_max_in: primary?.ancho_max_in ?? item.ancho_max_in ?? 0,
                productionSpeed: primary?.velocidad_produccion ?? 0,
                unidad_velocidad_produccion: item.unidad_velocidad_produccion || 'ft/min',
                hourlyMachineCost: primary?.costo_hora_maquina ?? 0,
                hourlyOperatorCost: primary?.costo_hora_operario ?? 0,
                availableColors: /digital/i.test(String(item.tipo || '')) ? 0 : 8,
                capacities
            };
        });
        const machineCategories = machines.reduce((accumulator, machine) => {
            const key = String(machine.category || machine.process || 'general').toLowerCase();
            if (!accumulator[key]) accumulator[key] = [];
            accumulator[key].push(machine);
            return accumulator;
        }, {});
        const troqueles = troquelRows.map((item) => ({
            id: item.id,
            codigo: item.codigo,
            codigoTroquel: item.codigo,
            descripcion: item.descripcion,
            description: item.descripcion,
            descripcionCotizaciones: item.descripcion_cotizaciones,
            clasificacion: item.clasificacion,
            ancho_mm: item.ancho_mm,
            largo_mm: item.largo_mm,
            ancho_total_troquel_in: item.ancho_total_troquel_in,
            largo_total_troquel_in: item.largo_total_troquel_in,
            anchoEtiquetaIn: item.ancho_etiqueta_in,
            largoEtiquetaIn: item.largo_etiqueta_in,
            anchoEtiqueta: item.ancho_etiqueta_in,
            largoEtiqueta: item.largo_etiqueta_in,
            anchoTroquel: item.ancho_total_troquel_in,
            largoTroquel: item.largo_total_troquel_in,
            desarrolloIn: item.desarrollo_in,
            elongacionPct: item.elongacion_pct,
            elongacion_pct: item.elongacion_pct,
            filas: item.cantidad_filas,
            rows: item.cantidad_filas,
            dientes: item.dientes,
            teeth: item.dientes,
            repeticiones: item.repeticiones,
            repetitions: item.repeticiones,
            areaTroquel: item.area_troquel_in2,
            areaTroquelIn2: item.area_troquel_in2,
            imageUrl: item.image_url,
            image_url: item.image_url,
            activo: item.activo
        }));
        res.json({ ...catalogs, materials, machines, machineCategories, troqueles, processes, outputTypes });
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los catálogos integrados.' });
    }
});

app.get('/api/inventories', async (req, res) => {
    try {
        const helpers = await loadFlexoEngineHelpers();
        const inventories = await helpers.loadInventoryViews();
        const processRows = await listInventory('procesos', { limit: 2000 });
        inventories.processes = {
            columns: ['codigo', 'nombre', 'categoria', 'machine_name', 'es_inline', 'costo_hora_maquina', 'costo_hora_operario'],
            rows: processRows
        };
        res.json(inventories);
    } catch (error) {
        res.status(500).json({ error: error.message || 'No fue posible cargar los inventarios integrados.' });
    }
});

app.post('/api/flexo-regular/calculate', async (req, res) => {
    try {
        const helpers = await loadFlexoEngineHelpers();
        res.json(await helpers.calculateFlexoRegularFromRequest(req.body || {}));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible calcular en el cotizador integrado.' });
    }
});

app.post('/api/cotizador-pro/preview', async (req, res) => {
    try {
        res.json(await calculateProcessQuote(req.body || {}));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible calcular la cotización del cotizador Pro.' });
    }
});

app.post('/api/flexo/calcular-preview', async (req, res) => {
    try {
        const catalogs = await loadFlexoCatalogsFromDb();
        res.json(calculateFlexoPreview(req.body || {}, catalogs));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible generar la vista previa del cálculo flexográfico.' });
    }
});

app.post('/api/cotizador/flexografia/calcular', (req, res) => {
    try {
        res.json(calcularCotizacionFlexografia(req.body || {}));
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible calcular la cotización.' });
    }
});

app.get('/flexo-calculo', (req, res) => {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(`/calculo-flexografia${query}`);
});

app.get('/configuracion-general', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'configuracion-general.html'));
});

app.get('/proforma', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'proforma.html'));
});

app.get('/socios', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'socios.html'));
});

app.get('/socios/documento', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'socios-documento.html'));
});

app.get('/inventario-materiales', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'catalogo.html'));
});

app.get('/inventario-troqueles', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'inventario-troqueles.html'));
});

app.get('/inventario-troqueles/documento', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'troquel-documento.html'));
});

app.get('/inventario-maquinas', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'catalogo.html'));
});

app.get('/inventario-procesos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'catalogo.html'));
});

app.get('/inventario-tipos-salida', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'catalogo.html'));
});

app.get('/costos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'costos.html'));
});

app.get('/calculo-flexografia', (req, res) => {
    try {
        res.type('html').send(renderIntegratedFlexoHtml());
    } catch (error) {
        res.status(500).send(error.message || 'No fue posible abrir el cotizador integrado.');
    }
});

app.get('/cotizador-flexografia-pro', (req, res) => {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(`/calculo-flexografia${query}`);
});

app.get('/productos', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'productos.html'));
});

app.get('/producto-documento', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'producto-documento.html'));
});

app.get('/orden-produccion/:codigo', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'orden-produccion.html'));
});

app.get('/ordenes-produccion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ordenes-produccion.html'));
});

app.get('/planificacion/gantt', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planificacion', 'gantt.html'));
});

app.get('/planificacion/lanzamiento', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planificacion', 'lanzamiento.html'));
});

app.get('/planificacion', (req, res) => {
    res.redirect('/planificacion/lanzamiento');
});

app.get('/planificacion/configuracion', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planificacion', 'configuracion.html'));
});

app.get('/planificacion/preturno', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planificacion', 'preturno.html'));
});

app.get('/planificacion/mes-operario', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planificacion', 'mes-operario.html'));
});

app.get('/planificacion/mes-planchas', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planificacion', 'mes-planchas.html'));
});

app.get('/planificacion/dashboard-kpi', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'planificacion', 'dashboard-kpi.html'));
});

app.get('/reporteria', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reporteria.html'));
});

app.get('/cotizaciones/documento', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/cotizaciones', (req, res) => {
    shouldServeSellerMobile(req)
        .then((useMobile) => {
            if (useMobile) {
                res.type('html').send(renderSellerMobileHtml());
                return;
            }
            res.sendFile(path.join(__dirname, 'public', 'cotizaciones.html'));
        })
        .catch((error) => {
            res.status(500).send(error.message || 'No fue posible abrir cotizaciones.');
        });
});

app.get('/vendedores', (req, res) => {
    try {
        res.type('html').send(renderSellerMobileHtml());
    } catch (error) {
        res.status(500).send(error.message || 'No fue posible abrir la vista móvil de vendedores.');
    }
});

app.post('/api/inventario/materiales/importar-sap', async (req, res) => {
    try {
        const summary = await importMaterialesFromSap({ limit: req.body?.limit });
        res.json({
            ok: true,
            summary,
            message: `Importación completada. ${summary.inserted || 0} materiales nuevos cargados.`
        });
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible importar materiales desde SAP.' });
    }
});

app.post('/api/inventario/materiales/importar-sap/diagnostico', async (req, res) => {
    try {
        const diagnosis = await diagnoseMaterialesImportFromSap();
        res.json({ ok: true, summary: diagnosis.summary });
    } catch (error) {
        res.status(400).json({ error: error.message || 'No fue posible diagnosticar la importación de materiales desde SAP.' });
    }
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

registerSapRoutes({ app, pgQuery, withTransaction });
startSapScheduler({ pgQuery, withTransaction });
registerExchangeRateRoutes({ app, pgQuery });
ensureExchangeRateSchema(pgQuery).catch(() => {});
startExchangeRateScheduler({ pgQuery });

function writeStartupErrorLog(message, error) {
    try {
        const logPath = path.join(APP_ROOT, 'logs', 'server-startup.err.log');
        const detail = error?.stack || error?.message || String(error || '');
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n${detail}\n\n`, 'utf8');
        console.error(`Detalle guardado en ${logPath}`);
    } catch (logError) {
        console.error('No fue posible escribir el log de arranque:', logError.message);
    }
}

function handleServerStartupError(error) {
    if (error?.code === 'EADDRINUSE') {
        const message = `No se pudo iniciar el servidor: el puerto ${PORT} ya está en uso.`;
        console.error(message);
        console.error('Cierra la otra instancia de Node o define PORT con otro valor antes de iniciar.');
        writeStartupErrorLog(message, error);
        process.exitCode = 1;
        return;
    }

    const message = 'No se pudo iniciar el servidor.';
    console.error(message, error?.message || error);
    writeStartupErrorLog(message, error);
    process.exitCode = 1;
}

const server = app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

server.on('error', handleServerStartupError);

module.exports = app;
