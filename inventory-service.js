const XLSX = require('xlsx');
const { query: pgQuery, withTransaction } = require('./db/postgres');
const fs = require('fs');
const path = require('path');

const INVENTORY_TYPES = {
    materiales: 'materiales',
    troqueles: 'troqueles',
    maquinas: 'maquinas',
    procesos: 'procesos',
    tiposSalida: 'tipos-salida'
};
const TROQUEL_IMAGE_SOURCE_DIR = 'C:\\Users\\jesqu\\Desktop\\Imagenes';
const TROQUEL_IMAGE_PUBLIC_DIR = path.join(__dirname, 'public', 'uploads', 'troqueles');

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

const FT2_PER_M2 = 10.7639104167;

function gsmToGPerFt2(value) {
    const numeric = asNumber(value, 0);
    return numeric > 0 ? Number((numeric / FT2_PER_M2).toFixed(6)) : null;
}

function gPerFt2ToGsm(value) {
    const numeric = asNumber(value, 0);
    return numeric > 0 ? Number((numeric * FT2_PER_M2).toFixed(6)) : null;
}

function asText(value, fallback = '') {
    if (value === null || typeof value === 'undefined') return fallback;
    const text = String(value).trim();
    return text || fallback;
}

function asNumber(value, fallback = 0) {
    if (value === '' || value === null || typeof value === 'undefined') {
        return fallback;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : fallback;
    }

    const normalized = String(value)
        .trim()
        .replace(/\s+/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function asNullableNumber(value) {
    if (value === '' || value === null || typeof value === 'undefined') {
        return null;
    }
    return asNumber(value, null);
}

function asBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = normalizeText(value);
    if (!normalized) return fallback;
    if (['si', 'sí', 'true', '1', 'x', 'yes', 'activo', 'activa'].includes(normalized)) return true;
    if (['no', 'false', '0', 'inactive', 'inactivo', 'inactiva'].includes(normalized)) return false;
    return fallback;
}

function slugifyOutputTypeCode(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

function buildUniqueOutputTypeCode(currentItems, payload) {
    const current = Array.isArray(currentItems) ? currentItems : [];
    const currentId = asText(payload.id);
    const preferred = asText(payload.codigo || payload.id);
    const fallback = slugifyOutputTypeCode(
        payload.descripcion || payload.nombre || payload.image_url || 'SALIDA'
    ) || 'SALIDA';
    const baseCode = slugifyOutputTypeCode(preferred) || fallback;
    const used = new Set(
        current
            .filter((item) => asText(item.id) !== currentId)
            .map((item) => slugifyOutputTypeCode(item.codigo || item.id))
            .filter(Boolean)
    );

    if (!used.has(baseCode)) {
        return baseCode;
    }

    let suffix = 2;
    while (used.has(`${baseCode}-${suffix}`)) {
        suffix += 1;
    }
    return `${baseCode}-${suffix}`;
}

function slugifyOutputTypeCode(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

function buildUniqueOutputTypeCode(currentItems, payload) {
    const current = Array.isArray(currentItems) ? currentItems : [];
    const currentId = asText(payload.id);
    const preferred = asText(payload.codigo || payload.id);
    const fallback = slugifyOutputTypeCode(
        payload.descripcion || payload.nombre || payload.image_url || 'SALIDA'
    ) || 'SALIDA';
    const baseCode = slugifyOutputTypeCode(preferred) || fallback;
    const used = new Set(
        current
            .filter((item) => asText(item.id) !== currentId)
            .map((item) => slugifyOutputTypeCode(item.codigo || item.id))
            .filter(Boolean)
    );

    if (!used.has(baseCode)) {
        return baseCode;
    }

    let suffix = 2;
    while (used.has(`${baseCode}-${suffix}`)) {
        suffix += 1;
    }
    return `${baseCode}-${suffix}`;
}

function parseTroquelDimensionsIn(value) {
    const text = asText(value);
    if (!text) return { width: null, length: null };
    const matches = text.match(/(\d+(?:[.,]\d+)?)/g) || [];
    if (matches.length < 2) return { width: null, length: null };
    return {
        width: asNullableNumber(matches[0]),
        length: asNullableNumber(matches[1])
    };
}

function buildRowIndex(row) {
    const map = new Map();
    Object.entries(row || {}).forEach(([key, value]) => {
        map.set(normalizeText(key), value);
    });
    return map;
}

function pickValue(index, ...aliases) {
    for (const alias of aliases) {
        const value = index.get(normalizeText(alias));
        if (value !== null && typeof value !== 'undefined' && value !== '') {
            return value;
        }
    }
    return null;
}

function normalizeMachineType(value) {
    const normalized = normalizeText(value);
    if (!normalized) return '';
    if (normalized.includes('digital') || normalized.includes('hp')) return 'Digital';
    if (normalized.includes('hibr')) return 'Hibrido';
    return 'Convencional';
}

function normalizeMaterialFamily(value) {
    const normalized = normalizeText(value);
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

function inferMaterialFamily(row = {}) {
    const haystack = normalizeText([
        row.codigo,
        row.nombre,
        row.tipo_proforma,
        row.familia_proceso
    ].filter(Boolean).join(' '));
    return normalizeMaterialFamily(haystack);
}

function mapMachineProcessProfile(value) {
    const raw = asText(value);
    const normalized = normalizeText(raw);

    if (normalized.includes('convencional')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'impresion',
            proceso: 'Impresion',
            subproceso: 'Convencional'
        };
    }

    if (normalized.includes('digital')) {
        return {
            tipo: 'Digital',
            clasificacion: 'impresion',
            proceso: 'Impresion',
            subproceso: 'Digital'
        };
    }

    if (normalized.includes('hibr')) {
        return {
            tipo: 'Hibrido',
            clasificacion: 'impresion',
            proceso: 'Impresion',
            subproceso: 'Hibrida'
        };
    }

    if (normalized.includes('barniz') || normalized.includes('barnizado')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'acabados',
            proceso: 'Barnizado',
            subproceso: normalized.includes('offline') || normalized.includes('off line') ? 'Off-line' : ''
        };
    }

    if (normalized.includes('lamin')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'acabados',
            proceso: 'Laminado',
            subproceso: ''
        };
    }

    if (normalized.includes('hot foil') || normalized.includes('estamp')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'acabados',
            proceso: 'Estampado',
            subproceso: normalized.includes('hot foil') ? 'Hot Foil' : ''
        };
    }

    if (normalized.includes('emboss') || normalized.includes('relieve')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'acabados',
            proceso: 'Embosado',
            subproceso: normalized.includes('inline') ? 'En Linea' : ''
        };
    }

    if (normalized.includes('troquelado laser')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'acabados',
            proceso: 'Troquelado',
            subproceso: 'Laser'
        };
    }

    if (normalized.includes('troquelado plano')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'acabados',
            proceso: 'Troquelado',
            subproceso: 'Plano'
        };
    }

    if (normalized.includes('rebobinado')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'acabados',
            proceso: 'Rebobinado',
            subproceso: normalized.includes('corte') ? 'Corte' : ''
        };
    }

    if (normalized.includes('inspeccion')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'calidad',
            proceso: 'Control de Calidad',
            subproceso: 'Inspeccion 100%'
        };
    }

    if (normalized.includes('montadora') || normalized.includes('cliche')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'planchas',
            proceso: 'Planchas',
            subproceso: 'Montaje de Cliches'
        };
    }

    if (normalized.includes('anilox')) {
        return {
            tipo: 'Convencional',
            clasificacion: 'soporte',
            proceso: 'Limpieza Anilox',
            subproceso: 'Laser'
        };
    }

    return {
        tipo: normalizeMachineType(raw),
        clasificacion: 'produccion',
        proceso: 'Produccion',
        subproceso: ''
    };
}

function getPrimaryCapacity(capacities = []) {
    if (!Array.isArray(capacities) || !capacities.length) return null;
    return capacities.find((item) => item && item.activa !== false) || capacities[0] || null;
}

function ensureTroquelImageDir() {
    if (!fs.existsSync(TROQUEL_IMAGE_PUBLIC_DIR)) {
        fs.mkdirSync(TROQUEL_IMAGE_PUBLIC_DIR, { recursive: true });
    }
}

function copyTroquelImage(codigo) {
    const safeCode = asText(codigo);
    if (!safeCode || !fs.existsSync(TROQUEL_IMAGE_SOURCE_DIR)) return '';
    const files = ['.jpg', '.jpeg', '.png', '.webp'].map((ext) => path.join(TROQUEL_IMAGE_SOURCE_DIR, `${safeCode}${ext}`));
    const sourceFile = files.find((filePath) => fs.existsSync(filePath));
    if (!sourceFile) return '';
    ensureTroquelImageDir();
    const ext = path.extname(sourceFile).toLowerCase();
    const fileName = `${safeCode}${ext}`;
    const targetFile = path.join(TROQUEL_IMAGE_PUBLIC_DIR, fileName);
    fs.copyFileSync(sourceFile, targetFile);
    return `/uploads/troqueles/${fileName}`;
}

async function getPrimaryTenantId(client = null) {
    const executor = client || { query: pgQuery };
    const result = await executor.query(
        `SELECT id
           FROM tenant
          WHERE activo = true
          ORDER BY creado_en ASC
          LIMIT 1`
    );

    if (!result.rows.length) {
        throw new Error('No existe un tenant activo para gestionar inventarios.');
    }

    return result.rows[0].id;
}

async function loadOutputTypesConfig() {
    try {
        const result = await pgQuery(
            `SELECT config_value
               FROM app_config
              WHERE config_key = $1
              LIMIT 1`,
            ['outputTypes']
        );
        const value = result.rows[0]?.config_value;
        return Array.isArray(value) ? value : [];
    } catch (error) {
        return [];
    }
}

async function saveOutputTypesConfig(items) {
    const normalized = Array.isArray(items) ? items : [];
    await pgQuery(
        `INSERT INTO app_config (config_key, config_value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (config_key)
         DO UPDATE SET
            config_value = EXCLUDED.config_value,
            updated_at = NOW()`,
        ['outputTypes', JSON.stringify(normalized)]
    );
    return normalized;
}

async function ensureInventorySchema() {
    await withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(82461001)');
    await client.query(`
        CREATE TABLE IF NOT EXISTS proceso_catalogo (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
            codigo VARCHAR(60),
            nombre VARCHAR(160) NOT NULL,
            descripcion VARCHAR(250),
            categoria VARCHAR(40) NOT NULL DEFAULT 'soporte',
            subcategoria VARCHAR(80),
            machine_id UUID REFERENCES maquina(id),
            proceso_productivo VARCHAR(40),
            modo_recurso VARCHAR(20) NOT NULL DEFAULT 'mixto',
            es_inline BOOLEAN NOT NULL DEFAULT FALSE,
            comparte_tiempo_linea BOOLEAN NOT NULL DEFAULT FALSE,
            comparte_operario BOOLEAN NOT NULL DEFAULT FALSE,
            requiere_troquel BOOLEAN NOT NULL DEFAULT FALSE,
            cantidad_personas DECIMAL(10,4) NOT NULL DEFAULT 1,
            tiempo_preparacion_general DECIMAL(12,4) NOT NULL DEFAULT 0,
            tiempo_por_estacion DECIMAL(12,4) NOT NULL DEFAULT 0,
            tiempo_fijo_min DECIMAL(12,4) NOT NULL DEFAULT 0,
            velocidad_produccion DECIMAL(12,4) NOT NULL DEFAULT 0,
            unidad_trabajo VARCHAR(40) DEFAULT 'pies',
            costo_hora_maquina DECIMAL(12,4) NOT NULL DEFAULT 0,
            costo_hora_operario DECIMAL(12,4) NOT NULL DEFAULT 0,
            costo_fijo DECIMAL(12,4) NOT NULL DEFAULT 0,
            costo_x_msi DECIMAL(12,6) NOT NULL DEFAULT 0,
            costo_x_kg DECIMAL(12,6) NOT NULL DEFAULT 0,
            costo_x_pie DECIMAL(12,6) NOT NULL DEFAULT 0,
            costo_x_millar DECIMAL(12,6) NOT NULL DEFAULT 0,
            formula_tiempo TEXT,
            formula_costo TEXT,
            orden_base INT NOT NULL DEFAULT 100,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (tenant_id, nombre, categoria)
        )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_proceso_catalogo_tenant ON proceso_catalogo(tenant_id, categoria, activo)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS descripcion_cotizaciones VARCHAR(200)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS clasificacion VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS codigo_cliente VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS codigo_preprensa VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS codigo_proveedor VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS desarrollo_cm DECIMAL(10,3)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS desarrollo_in DECIMAL(10,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS elongacion_pct DECIMAL(10,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS elongado DECIMAL(10,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS ancho_total_troquel_in DECIMAL(10,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS largo_total_troquel_in DECIMAL(10,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS dimensiones_troquel_in VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS ancho_etiqueta_in DECIMAL(10,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS largo_etiqueta_in DECIMAL(10,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS ancho_material_in DECIMAL(10,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS area_etiqueta_excesos_in DECIMAL(12,6)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS area_etiqueta_in DECIMAL(12,6)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS area_troquel_in2 DECIMAL(12,6)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS estructura_troquel VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS formato VARCHAR(40)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS gap_in DECIMAL(10,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS montaje_troquel VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS observaciones TEXT`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS proveedor_troquel VARCHAR(120)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS tension VARCHAR(40)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS tipo_troquel VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS tipo_troquel_2 VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS uso_convencional BOOLEAN`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS uso_digital BOOLEAN`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS usuario_creacion VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS vida_util_golpes_restantes DECIMAL(14,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS vida_util_golpes_usados DECIMAL(14,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS vida_util_golpes_total DECIMAL(14,4)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS reemplaza_a VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS reemplazado_por VARCHAR(80)`);
    await client.query(`ALTER TABLE troquel ADD COLUMN IF NOT EXISTS image_url TEXT`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS observaciones TEXT`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS comentario_setup TEXT`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS comentario_montaje TEXT`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS marca VARCHAR(120)`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS modelo VARCHAR(120)`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS unidad_velocidad_produccion VARCHAR(20) DEFAULT 'ft/min'`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_tipo_cobro VARCHAR(20) DEFAULT 'consumo'`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_costo_kg_tinta DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_costo_kg_tinta_blanco DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_costo_kg_tinta_especial DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_tarifa_click DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_modo_click VARCHAR(20) DEFAULT 'por_estacion'`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_velocidad_cmyk_mpm DECIMAL(12,4) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_velocidad_extendida_mpm DECIMAL(12,4) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_gramaje_cmyk_g_m2 DECIMAL(12,6) DEFAULT 1.5`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_gramaje_blanco_g_m2 DECIMAL(12,6) DEFAULT 4`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_factor_merma DECIMAL(12,6) DEFAULT 1.1`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_costo_lavado_especial DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_premier_modo VARCHAR(20) DEFAULT 'offline'`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_premier_setup_min DECIMAL(12,4) DEFAULT 20`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_premier_costo_mantenimiento DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS digital_premier_costo_offline_m DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS sustrato_consumo_unidad VARCHAR(20) DEFAULT 'pies'`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS sustrato_setup_merma_cantidad DECIMAL(12,4) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS sustrato_setup_merma_unidad VARCHAR(20) DEFAULT 'pies'`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS sustrato_setup_merma_base VARCHAR(20) DEFAULT 'trabajo'`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS sustrato_montaje_merma_cantidad DECIMAL(12,4) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS sustrato_montaje_merma_unidad VARCHAR(20) DEFAULT 'pies'`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS sustrato_montaje_merma_base VARCHAR(20) DEFAULT 'trabajo'`);
  await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS largo_mm DECIMAL(12,4)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS costo_x_lamina DECIMAL(12,6)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS costo_x_libra DECIMAL(12,6)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS peso_capa_gsm DECIMAL(10,4)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS familia_proceso VARCHAR(60)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS clasificacion VARCHAR(60)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS costo_x_unidad DECIMAL(12,6)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS merma_pct DECIMAL(10,4)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS rendimiento_g_ft2 DECIMAL(12,6)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS temperatura_aplicacion_c DECIMAL(10,4)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS tipo_transferencia VARCHAR(120)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS tipo_superficie VARCHAR(40)`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS requiere_premier BOOLEAN DEFAULT FALSE`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS premier_preaplicado BOOLEAN DEFAULT FALSE`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS premier_consumo_g_m2 DECIMAL(12,6) DEFAULT 0.65`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS premier_costo_x_kg DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS premier_costo_x_m2 DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS costo_x_pie DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS costo_x_metro DECIMAL(12,6) DEFAULT 0`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_ancho_mm TEXT`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_largo_mm TEXT`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_gramaje_g_m2 TEXT`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_calibre_micras TEXT`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_costo_x_lamina TEXT`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_costo_x_msi TEXT`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_costo_x_m2 TEXT`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_costo_x_kg TEXT`);
  await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_costo_x_libra TEXT`);
  await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_peso_capa_gsm TEXT`);
  await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_rendimiento_g_ft2 TEXT`);
  await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_compatible_convencional TEXT`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_compatible_digital TEXT`);
await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS comentario_tipo_proforma TEXT`);
await client.query(`ALTER TABLE maquina_capacidad ADD COLUMN IF NOT EXISTS ancho_max_in DECIMAL(10,4)`);

    const tenantId = await getPrimaryTenantId(client);
    await client.query(
        `INSERT INTO material (
            tenant_id, codigo, nombre, ancho_mm, largo_mm, costo_x_lamina, tipo_proforma,
            compatible_convencional, compatible_digital, activo
         ) VALUES
            ($1, 'PL-CYREL-3040', 'Plancha DuPont Cyrel 1000 30 x 40 in', 762, 1016, 50, 'Planchas', true, false, true),
            ($1, 'PL-CYREL-4260', 'Plancha DuPont Cyrel 1000 42 x 60 in', 1066.8, 1524, 95, 'Planchas', true, false, true)
         ON CONFLICT (tenant_id, codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            ancho_mm = EXCLUDED.ancho_mm,
            largo_mm = EXCLUDED.largo_mm,
            costo_x_lamina = EXCLUDED.costo_x_lamina,
            tipo_proforma = EXCLUDED.tipo_proforma,
            compatible_convencional = EXCLUDED.compatible_convencional,
            compatible_digital = EXCLUDED.compatible_digital,
            activo = EXCLUDED.activo,
            actualizado_en = NOW()`,
        [tenantId]
    );
    const countResult = await client.query(
        `SELECT COUNT(*)::int AS total
           FROM proceso_catalogo
          WHERE tenant_id = $1`,
        [tenantId]
    );

    if (countResult.rows[0].total > 0) {
        return;
    }

    const machineRows = await client.query(
        `SELECT id::text, nombre, tipo::text
           FROM maquina
          WHERE tenant_id = $1
            AND activa = true
          ORDER BY nombre`,
        [tenantId]
    );

    const conventionalMachine = machineRows.rows.find((row) => normalizeText(row.tipo).includes('conv')) || machineRows.rows[0];
    const digitalMachine = machineRows.rows.find((row) => normalizeText(row.tipo).includes('digit'));

    const defaults = [
        {
            codigo: 'DIS-ARTE',
            nombre: 'Diseno de Arte',
            categoria: 'diseno',
            descripcion: 'Preparacion de arte base',
            modo_recurso: 'persona',
            cantidad_personas: 1,
            tiempo_fijo_min: 30,
            costo_hora_operario: 15,
            orden_base: 10
        },
        {
            codigo: 'PRE-PRENSA',
            nombre: 'Preprensa',
            categoria: 'preprensa',
            descripcion: 'Revision y alistamiento preprensa',
            modo_recurso: 'persona',
            cantidad_personas: 1,
            tiempo_fijo_min: 20,
            costo_hora_operario: 15,
            orden_base: 20
        },
        {
            codigo: 'PLANCHAS',
            nombre: 'Planchas',
            categoria: 'planchas',
            descripcion: 'Grabado o exposicion de planchas',
            modo_recurso: 'mixto',
            cantidad_personas: 1,
            tiempo_fijo_min: 10,
            costo_hora_operario: 15,
            orden_base: 30
        },
        {
            codigo: 'IMP-CONV',
            nombre: 'Impresion Convencional',
            categoria: 'impresion',
            machine_id: conventionalMachine?.id || null,
            proceso_productivo: 'convencional',
            modo_recurso: 'mixto',
            tiempo_preparacion_general: 20,
            tiempo_por_estacion: 6,
            velocidad_produccion: 180,
            unidad_trabajo: 'pies',
            costo_hora_maquina: 20,
            costo_hora_operario: 12,
            orden_base: 40
        },
        {
            codigo: 'IMP-DIG',
            nombre: 'Impresion Digital',
            categoria: 'impresion',
            machine_id: digitalMachine?.id || null,
            proceso_productivo: 'digital',
            modo_recurso: 'mixto',
            tiempo_preparacion_general: 10,
            velocidad_produccion: 270,
            unidad_trabajo: 'pies',
            costo_hora_maquina: 18,
            costo_hora_operario: 8,
            orden_base: 45
        },
        {
            codigo: 'BARNIZ-INL',
            nombre: 'Barniz Inline',
            categoria: 'acabados',
            machine_id: conventionalMachine?.id || null,
            proceso_productivo: 'convencional',
            modo_recurso: 'maquina',
            es_inline: true,
            comparte_tiempo_linea: true,
            comparte_operario: true,
            costo_x_msi: 0,
            orden_base: 50
        },
        {
            codigo: 'LAM-INL',
            nombre: 'Laminado Inline',
            categoria: 'acabados',
            machine_id: conventionalMachine?.id || null,
            proceso_productivo: 'convencional',
            modo_recurso: 'maquina',
            es_inline: true,
            comparte_tiempo_linea: true,
            comparte_operario: true,
            costo_x_msi: 0,
            orden_base: 55
        },
        {
            codigo: 'TROQ-INL',
            nombre: 'Troquelado Inline',
            categoria: 'acabados',
            machine_id: conventionalMachine?.id || null,
            proceso_productivo: 'convencional',
            modo_recurso: 'maquina',
            es_inline: true,
            comparte_tiempo_linea: true,
            comparte_operario: true,
            requiere_troquel: true,
            orden_base: 60
        },
        {
            codigo: 'FOIL-INL',
            nombre: 'Estampado Inline',
            categoria: 'acabados',
            machine_id: conventionalMachine?.id || null,
            proceso_productivo: 'convencional',
            modo_recurso: 'maquina',
            es_inline: true,
            comparte_tiempo_linea: true,
            comparte_operario: true,
            orden_base: 65
        },
        {
            codigo: 'REBOB',
            nombre: 'Rebobinado',
            categoria: 'acabados',
            machine_id: conventionalMachine?.id || null,
            proceso_productivo: 'convencional',
            modo_recurso: 'maquina',
            tiempo_fijo_min: 8,
            velocidad_produccion: 350,
            unidad_trabajo: 'pies',
            costo_hora_maquina: 12,
            costo_hora_operario: 6,
            orden_base: 68
        },
        {
            codigo: 'CALIDAD',
            nombre: 'Control de Calidad',
            categoria: 'calidad',
            modo_recurso: 'persona',
            cantidad_personas: 1,
            tiempo_fijo_min: 10,
            costo_hora_operario: 10,
            orden_base: 70
        },
        {
            codigo: 'EMPAQUE',
            nombre: 'Empaque',
            categoria: 'empaque',
            modo_recurso: 'persona',
            cantidad_personas: 2,
            tiempo_fijo_min: 15,
            costo_hora_operario: 8,
            orden_base: 80
        },
        {
            codigo: 'EXTERNO',
            nombre: 'Proceso Externo',
            categoria: 'proceso externo',
            modo_recurso: 'externo',
            costo_fijo: 0,
            orden_base: 90
        }
    ];

    for (const process of defaults) {
        await client.query(
            `INSERT INTO proceso_catalogo (
                tenant_id, codigo, nombre, descripcion, categoria, subcategoria, machine_id,
                proceso_productivo, modo_recurso, es_inline, comparte_tiempo_linea,
                comparte_operario, requiere_troquel, cantidad_personas,
                tiempo_preparacion_general, tiempo_por_estacion, tiempo_fijo_min,
                velocidad_produccion, unidad_trabajo, costo_hora_maquina,
                costo_hora_operario, costo_fijo, costo_x_msi, costo_x_kg,
                costo_x_pie, costo_x_millar, formula_tiempo, formula_costo,
                orden_base, activo
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7::uuid,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,true
             )`,
            [
                tenantId,
                process.codigo || null,
                process.nombre,
                process.descripcion || null,
                process.categoria,
                process.subcategoria || null,
                process.machine_id || null,
                process.proceso_productivo || null,
                process.modo_recurso || 'mixto',
                Boolean(process.es_inline),
                Boolean(process.comparte_tiempo_linea),
                Boolean(process.comparte_operario),
                Boolean(process.requiere_troquel),
                asNumber(process.cantidad_personas, 1),
                asNumber(process.tiempo_preparacion_general, 0),
                asNumber(process.tiempo_por_estacion, 0),
                asNumber(process.tiempo_fijo_min, 0),
                asNumber(process.velocidad_produccion, 0),
                process.unidad_trabajo || 'pies',
                asNumber(process.costo_hora_maquina, 0),
                asNumber(process.costo_hora_operario, 0),
                asNumber(process.costo_fijo, 0),
                asNumber(process.costo_x_msi, 0),
                asNumber(process.costo_x_kg, 0),
                asNumber(process.costo_x_pie, 0),
                asNumber(process.costo_x_millar, 0),
                process.formula_tiempo || null,
                process.formula_costo || null,
                asNumber(process.orden_base, 100)
            ]
        );
    }
    });
}

async function listMaterials({ q = '', limit = 300 } = {}) {
    const search = `%${String(q || '').trim()}%`;
    const cappedLimit = Math.min(Math.max(Number(limit) || 300, 1), 5000);
    const result = await pgQuery(
        `SELECT
            id::text,
            codigo,
            nombre,
            ancho_mm,
            largo_mm,
            gramaje_g_m2,
            calibre_micras,
            costo_x_lamina,
            costo_x_msi,
            costo_x_m2,
            costo_x_kg,
            costo_x_libra,
            peso_capa_gsm,
            familia_proceso,
            clasificacion,
            costo_x_unidad,
            costo_x_pie,
            costo_x_metro,
            merma_pct,
            rendimiento_g_ft2,
            temperatura_aplicacion_c,
            tipo_transferencia,
            tipo_superficie,
            requiere_premier,
            premier_preaplicado,
            premier_consumo_g_m2,
            premier_costo_x_kg,
            premier_costo_x_m2,
            comentario_ancho_mm,
            comentario_largo_mm,
            comentario_gramaje_g_m2,
            comentario_calibre_micras,
            comentario_costo_x_lamina,
            comentario_costo_x_msi,
            comentario_costo_x_m2,
            comentario_costo_x_kg,
            comentario_costo_x_libra,
            comentario_peso_capa_gsm,
            comentario_rendimiento_g_ft2,
            comentario_compatible_convencional,
            comentario_compatible_digital,
            comentario_tipo_proforma,
            compatible_convencional,
            compatible_digital,
            tipo_proforma,
            activo
         FROM material
         WHERE $1 = '%%'
            OR codigo ILIKE $1
            OR nombre ILIKE $1
            OR COALESCE(clasificacion, '') ILIKE $1
            OR COALESCE(familia_proceso, '') ILIKE $1
            OR COALESCE(tipo_proforma, '') ILIKE $1
         ORDER BY nombre, codigo
         LIMIT $2`,
        [search, cappedLimit]
    );
    return result.rows;
}

async function listTroqueles({ q = '', limit = 300 } = {}) {
    const search = `%${String(q || '').trim()}%`;
    const cappedLimit = Math.min(Math.max(Number(limit) || 300, 1), 5000);
    const result = await pgQuery(
        `SELECT
            id::text,
            codigo,
            descripcion,
            descripcion_cotizaciones,
            clasificacion,
            codigo_cliente,
            codigo_preprensa,
            codigo_proveedor,
            ancho_mm,
            largo_mm,
            desarrollo_cm,
            desarrollo_in,
            elongacion_pct,
            elongado,
            ancho_total_troquel_in,
            largo_total_troquel_in,
            dimensiones_troquel_in,
            ancho_etiqueta_in,
            largo_etiqueta_in,
            ancho_material_in,
            area_etiqueta_excesos_in,
            area_etiqueta_in,
            area_troquel_in2,
            estructura_troquel,
            formato,
            gap_in,
            montaje_troquel,
            observaciones,
            proveedor_troquel,
            tension,
            tipo_troquel,
            tipo_troquel_2,
            uso_convencional,
            uso_digital,
            usuario_creacion,
            vida_util_golpes_restantes,
            vida_util_golpes_usados,
            vida_util_golpes_total,
            reemplaza_a,
            reemplazado_por,
            image_url,
            cantidad_filas,
            dientes,
            repeticiones,
            estado,
            activo
         FROM troquel
         WHERE $1 = '%%'
            OR codigo ILIKE $1
            OR COALESCE(descripcion, '') ILIKE $1
            OR COALESCE(estado, '') ILIKE $1
         ORDER BY codigo
         LIMIT $2`,
        [search, cappedLimit]
    );
    return result.rows;
}

async function getTroquelByCode(codigo) {
    const key = asText(codigo);
    if (!key) return null;
    const result = await pgQuery(
        `SELECT
            id::text,
            codigo,
            descripcion,
            descripcion_cotizaciones,
            clasificacion,
            codigo_cliente,
            codigo_preprensa,
            codigo_proveedor,
            ancho_mm,
            largo_mm,
            desarrollo_cm,
            desarrollo_in,
            elongacion_pct,
            elongado,
            ancho_total_troquel_in,
            largo_total_troquel_in,
            dimensiones_troquel_in,
            ancho_etiqueta_in,
            largo_etiqueta_in,
            ancho_material_in,
            area_etiqueta_excesos_in,
            area_etiqueta_in,
            area_troquel_in2,
            estructura_troquel,
            formato,
            gap_in,
            montaje_troquel,
            observaciones,
            proveedor_troquel,
            tension,
            tipo_troquel,
            tipo_troquel_2,
            uso_convencional,
            uso_digital,
            usuario_creacion,
            vida_util_golpes_restantes,
            vida_util_golpes_usados,
            vida_util_golpes_total,
            reemplaza_a,
            reemplazado_por,
            image_url,
            cantidad_filas,
            dientes,
            repeticiones,
            estado,
            activo
         FROM troquel
         WHERE codigo = $1
         LIMIT 1`,
        [key]
    );
    return result.rows[0] || null;
}

async function listMaquinas({ q = '', limit = 300 } = {}) {
    const search = `%${String(q || '').trim()}%`;
    const cappedLimit = Math.min(Math.max(Number(limit) || 300, 1), 5000);
    const result = await pgQuery(
        `SELECT
            m.id::text,
            m.nombre,
            m.marca,
            m.modelo,
            m.tipo::text AS tipo,
            m.unidad_velocidad_produccion,
            m.activa,
            m.observaciones,
            m.comentario_setup,
            m.comentario_montaje,
            m.unidad_velocidad_produccion,
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
            m.sustrato_consumo_unidad,
            m.sustrato_setup_merma_cantidad,
            m.sustrato_setup_merma_unidad,
            m.sustrato_setup_merma_base,
            m.sustrato_montaje_merma_cantidad,
            m.sustrato_montaje_merma_unidad,
            m.sustrato_montaje_merma_base,
            COALESCE(m.especificaciones, '{}'::jsonb) AS especificaciones,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', mc.id::text,
                        'clasificacion', mc.clasificacion,
                        'proceso', mc.proceso,
                        'subproceso', mc.subproceso,
                        'unidad_trabajo', mc.unidad_trabajo,
                        'tiempo_preparacion_general', mc.tiempo_preparacion_general,
                        'tiempo_adicional_preparacion', mc.tiempo_adicional_preparacion,
                        'tiempo_por_estacion', mc.tiempo_por_estacion,
                        'factor_proceso_por_area', mc.factor_proceso_por_area,
                        'velocidad_produccion', mc.velocidad_produccion,
                        'costo_hora_maquina', mc.costo_hora_maquina,
                        'costo_hora_operario', mc.costo_hora_operario,
                        'formula_tiempo', mc.formula_tiempo,
                        'formula_costo', mc.formula_costo,
                        'ancho_max_in', mc.ancho_max_in,
                        'activa', mc.activa
                    )
                    ORDER BY mc.proceso, mc.subproceso NULLS FIRST
                ) FILTER (WHERE mc.id IS NOT NULL),
                '[]'::json
            ) AS capacidades
         FROM maquina m
         LEFT JOIN maquina_capacidad mc ON mc.maquina_id = m.id
         WHERE $1 = '%%'
            OR m.nombre ILIKE $1
            OR m.tipo::text ILIKE $1
            OR COALESCE(mc.proceso, '') ILIKE $1
            OR COALESCE(mc.subproceso, '') ILIKE $1
         GROUP BY m.id
         ORDER BY m.nombre
         LIMIT $2`,
        [search, cappedLimit]
    );

    return result.rows.map((row) => {
        const capacidades = Array.isArray(row.capacidades) ? row.capacidades : [];
        const primary = getPrimaryCapacity(capacidades);
        const espec = row.especificaciones && typeof row.especificaciones === 'object' ? row.especificaciones : {};
        return {
            ...row,
            capacidades,
            capacidad_count: capacidades.length,
            unidad_velocidad_produccion: row.unidad_velocidad_produccion || 'ft/min',
            proceso: primary?.proceso || '',
            subproceso: primary?.subproceso || '',
            ancho_max_in: primary?.ancho_max_in ?? 0,
            velocidad_produccion: primary?.velocidad_produccion ?? 0,
            costo_hora_maquina: primary?.costo_hora_maquina ?? 0,
            costo_hora_operario: primary?.costo_hora_operario ?? 0,
            espec_ancho_max_mm: espec.ancho_max_mm ?? '',
            espec_largo_max_mm: espec.largo_max_mm ?? '',
            espec_altura_max_mm: espec.altura_max_mm ?? '',
            espec_peso_kg: espec.peso_kg ?? '',
            espec_num_estaciones: espec.num_estaciones ?? '',
            espec_num_cabezales: espec.num_cabezales ?? '',
            espec_tinta_base: espec.tinta_base ?? '',
            espec_resolucion_dpi: espec.resolucion_dpi ?? '',
            espec_velocidad_max_fpm: espec.velocidad_max_fpm ?? '',
            espec_ancho_banda_max_mm: espec.ancho_banda_max_mm ?? '',
            espec_troquel: espec.troquel ?? '',
            espec_uv: espec.uv ?? '',
            espec_laminado: espec.laminado ?? '',
            espec_barniz: espec.barniz ?? '',
            espec_tension_entrada: espec.tension_entrada ?? '',
            espec_potencia_kw: espec.potencia_kw ?? '',
            espec_tension_electrica: espec.tension_electrica ?? '',
            espec_fase: espec.fase ?? '',
            espec_corriente_max_a: espec.corriente_max_a ?? '',
            espec_consumo_aire: espec.consumo_aire ?? '',
            espec_temperatura_op: espec.temperatura_op ?? ''
        };
    });
}

async function listProcesos({ q = '', limit = 300 } = {}) {
    const search = `%${String(q || '').trim()}%`;
    const cappedLimit = Math.min(Math.max(Number(limit) || 300, 1), 5000);
    const result = await pgQuery(
        `SELECT
            p.id::text,
            p.codigo,
            p.nombre,
            p.descripcion,
            p.categoria,
            p.subcategoria,
            p.machine_id::text,
            m.nombre AS machine_name,
            p.proceso_productivo,
            p.modo_recurso,
            p.es_inline,
            p.comparte_tiempo_linea,
            p.comparte_operario,
            p.requiere_troquel,
            p.cantidad_personas,
            p.tiempo_preparacion_general,
            p.tiempo_por_estacion,
            p.tiempo_fijo_min,
            p.velocidad_produccion,
            p.unidad_trabajo,
            p.costo_hora_maquina,
            p.costo_hora_operario,
            p.costo_fijo,
            p.costo_x_msi,
            p.costo_x_kg,
            p.costo_x_pie,
            p.costo_x_millar,
            p.formula_tiempo,
            p.formula_costo,
            p.orden_base,
            p.activo
         FROM proceso_catalogo p
         LEFT JOIN maquina m ON m.id = p.machine_id
         WHERE $1 = '%%'
            OR COALESCE(p.codigo, '') ILIKE $1
            OR p.nombre ILIKE $1
            OR COALESCE(p.descripcion, '') ILIKE $1
            OR COALESCE(p.categoria, '') ILIKE $1
            OR COALESCE(m.nombre, '') ILIKE $1
         ORDER BY p.orden_base, p.categoria, p.nombre
         LIMIT $2`,
        [search, cappedLimit]
    );
    return result.rows;
}

async function listOutputTypes({ q = '', limit = 300 } = {}) {
    const search = normalizeText(q);
    const cappedLimit = Math.min(Math.max(Number(limit) || 300, 1), 5000);
    const items = await loadOutputTypesConfig();
    return items
        .map((item, index) => ({
            id: asText(item.id || item.codigo || `output-type-${index + 1}`),
            codigo: asText(item.codigo || item.id || `OT-${index + 1}`),
            nombre: asText(item.nombre || item.name || item.codigo || item.id),
            descripcion: asText(item.descripcion || item.description),
            image_url: asText(item.image_url || item.imageUrl),
            activo: asBoolean(item.activo ?? item.active, true)
        }))
        .filter((item) => {
            if (!search) return true;
            return normalizeText(`${item.codigo} ${item.nombre} ${item.descripcion}`).includes(search);
        })
        .slice(0, cappedLimit);
}

async function listInventory(kind, options = {}) {
    if (kind === INVENTORY_TYPES.materiales) return listMaterials(options);
    if (kind === INVENTORY_TYPES.troqueles) return listTroqueles(options);
    if (kind === INVENTORY_TYPES.maquinas) return listMaquinas(options);
    if (kind === INVENTORY_TYPES.procesos) return listProcesos(options);
    if (kind === INVENTORY_TYPES.tiposSalida) return listOutputTypes(options);
    throw new Error('Tipo de inventario no soportado.');
}

async function saveMaterial(payload) {
    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);
        const values = [
            tenantId,
            asText(payload.codigo),
            asText(payload.nombre),
            asNumber(payload.ancho_mm, 0),
            asNullableNumber(payload.largo_mm),
            asNullableNumber(payload.gramaje_g_m2),
            asNullableNumber(payload.calibre_micras),
            asNullableNumber(payload.costo_x_lamina),
            asNumber(payload.costo_x_msi, 0),
            asNumber(payload.costo_x_m2, 0),
            asNumber(payload.costo_x_kg, 0),
            asNullableNumber(payload.costo_x_libra),
            asNullableNumber(payload.peso_capa_gsm),
            normalizeMaterialFamily(payload.familia_proceso || inferMaterialFamily(payload)),
            asText(payload.clasificacion),
            asNullableNumber(payload.costo_x_unidad),
            asNumber(payload.costo_x_pie, 0),
            asNumber(payload.costo_x_metro, 0),
            asNullableNumber(payload.merma_pct),
            asNullableNumber(payload.rendimiento_g_ft2) ?? gsmToGPerFt2(payload.peso_capa_gsm),
            asNullableNumber(payload.temperatura_aplicacion_c),
            asText(payload.tipo_transferencia),
            asText(payload.tipo_superficie),
            asBoolean(payload.requiere_premier, false),
            asBoolean(payload.premier_preaplicado, false),
            asNullableNumber(payload.premier_consumo_g_m2) ?? 0.65,
            asNullableNumber(payload.premier_costo_x_kg),
            asNullableNumber(payload.premier_costo_x_m2),
            asText(payload.comentario_ancho_mm),
            asText(payload.comentario_largo_mm),
            asText(payload.comentario_gramaje_g_m2),
            asText(payload.comentario_calibre_micras),
            asText(payload.comentario_costo_x_lamina),
            asText(payload.comentario_costo_x_msi),
            asText(payload.comentario_costo_x_m2),
            asText(payload.comentario_costo_x_kg),
            asText(payload.comentario_costo_x_libra),
            asText(payload.comentario_peso_capa_gsm),
            asText(payload.comentario_rendimiento_g_ft2),
            asText(payload.comentario_compatible_convencional),
            asText(payload.comentario_compatible_digital),
            asText(payload.comentario_tipo_proforma),
            asBoolean(payload.compatible_convencional, true),
            asBoolean(payload.compatible_digital, true),
            asText(payload.tipo_proforma),
            asBoolean(payload.activo, true)
        ];

        if (!values[1] || !values[2]) {
            throw new Error('Código y nombre son obligatorios en materia prima.');
        }

        if (payload.id) {
            const result = await client.query(
                `UPDATE material
                    SET codigo = $2,
                        nombre = $3,
                        ancho_mm = $4,
                        largo_mm = $5,
                        gramaje_g_m2 = $6,
                        calibre_micras = $7,
                        costo_x_lamina = $8,
                        costo_x_msi = $9,
                        costo_x_m2 = $10,
                        costo_x_kg = $11,
                        costo_x_libra = $12,
                        peso_capa_gsm = $13,
                        familia_proceso = $14,
                        clasificacion = $15,
                        costo_x_unidad = $16,
                        costo_x_pie = $17,
                        costo_x_metro = $18,
                        merma_pct = $19,
                        rendimiento_g_ft2 = $20,
                        temperatura_aplicacion_c = $21,
                        tipo_transferencia = $22,
                        tipo_superficie = $23,
                        requiere_premier = $24,
                        premier_preaplicado = $25,
                        premier_consumo_g_m2 = $26,
                        premier_costo_x_kg = $27,
                        premier_costo_x_m2 = $28,
                        comentario_ancho_mm = $29,
                        comentario_largo_mm = $30,
                        comentario_gramaje_g_m2 = $31,
                        comentario_calibre_micras = $32,
                        comentario_costo_x_lamina = $33,
                        comentario_costo_x_msi = $34,
                        comentario_costo_x_m2 = $35,
                        comentario_costo_x_kg = $36,
                        comentario_costo_x_libra = $37,
                        comentario_peso_capa_gsm = $38,
                        comentario_rendimiento_g_ft2 = $39,
                        comentario_compatible_convencional = $40,
                        comentario_compatible_digital = $41,
                        comentario_tipo_proforma = $42,
                        compatible_convencional = $43,
                        compatible_digital = $44,
                        tipo_proforma = $45,
                        activo = $46,
                        actualizado_en = NOW()
                  WHERE id = $1::uuid
                  RETURNING id::text`,
                [payload.id, ...values.slice(1)]
            );

            if (!result.rows.length) {
                throw new Error('No se encontró el material a actualizar.');
            }
            return result.rows[0].id;
        }

        const result = await client.query(
            `INSERT INTO material (
                tenant_id, codigo, nombre, ancho_mm, largo_mm, gramaje_g_m2, calibre_micras, costo_x_lamina, costo_x_msi,
                costo_x_m2, costo_x_kg, costo_x_libra, peso_capa_gsm, familia_proceso, clasificacion, costo_x_unidad,
                costo_x_pie, costo_x_metro, merma_pct,
                rendimiento_g_ft2, temperatura_aplicacion_c, tipo_transferencia,
                tipo_superficie, requiere_premier, premier_preaplicado, premier_consumo_g_m2, premier_costo_x_kg,
                premier_costo_x_m2, comentario_ancho_mm, comentario_largo_mm, comentario_gramaje_g_m2, comentario_calibre_micras,
                comentario_costo_x_lamina, comentario_costo_x_msi, comentario_costo_x_m2, comentario_costo_x_kg,
                comentario_costo_x_libra, comentario_peso_capa_gsm, comentario_rendimiento_g_ft2,
                comentario_compatible_convencional, comentario_compatible_digital, comentario_tipo_proforma,
                compatible_convencional, compatible_digital, tipo_proforma, activo
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46
             )
             ON CONFLICT (tenant_id, codigo) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                ancho_mm = EXCLUDED.ancho_mm,
                largo_mm = EXCLUDED.largo_mm,
                gramaje_g_m2 = EXCLUDED.gramaje_g_m2,
                calibre_micras = EXCLUDED.calibre_micras,
                costo_x_lamina = EXCLUDED.costo_x_lamina,
                costo_x_msi = EXCLUDED.costo_x_msi,
                costo_x_m2 = EXCLUDED.costo_x_m2,
                costo_x_kg = EXCLUDED.costo_x_kg,
                costo_x_libra = EXCLUDED.costo_x_libra,
                peso_capa_gsm = EXCLUDED.peso_capa_gsm,
                familia_proceso = EXCLUDED.familia_proceso,
                clasificacion = EXCLUDED.clasificacion,
                costo_x_unidad = EXCLUDED.costo_x_unidad,
                costo_x_pie = EXCLUDED.costo_x_pie,
                costo_x_metro = EXCLUDED.costo_x_metro,
                merma_pct = EXCLUDED.merma_pct,
                rendimiento_g_ft2 = EXCLUDED.rendimiento_g_ft2,
                temperatura_aplicacion_c = EXCLUDED.temperatura_aplicacion_c,
                tipo_transferencia = EXCLUDED.tipo_transferencia,
                tipo_superficie = EXCLUDED.tipo_superficie,
                requiere_premier = EXCLUDED.requiere_premier,
                premier_preaplicado = EXCLUDED.premier_preaplicado,
                premier_consumo_g_m2 = EXCLUDED.premier_consumo_g_m2,
                premier_costo_x_kg = EXCLUDED.premier_costo_x_kg,
                premier_costo_x_m2 = EXCLUDED.premier_costo_x_m2,
                comentario_ancho_mm = EXCLUDED.comentario_ancho_mm,
                comentario_largo_mm = EXCLUDED.comentario_largo_mm,
                comentario_gramaje_g_m2 = EXCLUDED.comentario_gramaje_g_m2,
                comentario_calibre_micras = EXCLUDED.comentario_calibre_micras,
                comentario_costo_x_lamina = EXCLUDED.comentario_costo_x_lamina,
                comentario_costo_x_msi = EXCLUDED.comentario_costo_x_msi,
                comentario_costo_x_m2 = EXCLUDED.comentario_costo_x_m2,
                comentario_costo_x_kg = EXCLUDED.comentario_costo_x_kg,
                comentario_costo_x_libra = EXCLUDED.comentario_costo_x_libra,
                comentario_peso_capa_gsm = EXCLUDED.peso_capa_gsm,
                comentario_rendimiento_g_ft2 = EXCLUDED.rendimiento_g_ft2,
                comentario_compatible_convencional = EXCLUDED.comentario_compatible_convencional,
                comentario_compatible_digital = EXCLUDED.comentario_compatible_digital,
                comentario_tipo_proforma = EXCLUDED.comentario_tipo_proforma,
                compatible_convencional = EXCLUDED.compatible_convencional,
                compatible_digital = EXCLUDED.compatible_digital,
                tipo_proforma = EXCLUDED.tipo_proforma,
                activo = EXCLUDED.activo,
                actualizado_en = NOW()
             RETURNING id::text`,
            values
        );
        return result.rows[0].id;
    });
}

async function saveTroquel(payload) {
    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);
        const values = [
            tenantId,
            asText(payload.codigo),
            asText(payload.descripcion),
            asText(payload.descripcion_cotizaciones),
            asText(payload.clasificacion),
            asText(payload.codigo_cliente),
            asText(payload.codigo_preprensa),
            asText(payload.codigo_proveedor),
            asNumber(payload.ancho_mm, 0),
            asNumber(payload.largo_mm, 0),
            asNullableNumber(payload.desarrollo_cm),
            asNullableNumber(payload.desarrollo_in),
            asNullableNumber(payload.elongacion_pct),
            asNullableNumber(payload.elongado),
            asNullableNumber(payload.ancho_total_troquel_in),
            asNullableNumber(payload.largo_total_troquel_in),
            asText(payload.dimensiones_troquel_in),
            asNullableNumber(payload.ancho_etiqueta_in),
            asNullableNumber(payload.largo_etiqueta_in),
            asNullableNumber(payload.ancho_material_in),
            asNullableNumber(payload.area_etiqueta_excesos_in),
            asNullableNumber(payload.area_etiqueta_in),
            asNullableNumber(payload.area_troquel_in2),
            asText(payload.estructura_troquel),
            asText(payload.formato),
            asNullableNumber(payload.gap_in),
            asText(payload.montaje_troquel),
            asText(payload.observaciones),
            asText(payload.proveedor_troquel),
            asText(payload.tension),
            asText(payload.tipo_troquel),
            asText(payload.tipo_troquel_2),
            asBoolean(payload.uso_convencional, false),
            asBoolean(payload.uso_digital, false),
            asText(payload.usuario_creacion),
            asNullableNumber(payload.vida_util_golpes_restantes),
            asNullableNumber(payload.vida_util_golpes_usados),
            asNullableNumber(payload.vida_util_golpes_total),
            asText(payload.reemplaza_a),
            asText(payload.reemplazado_por),
            asText(payload.image_url),
            Math.max(1, Math.round(asNumber(payload.cantidad_filas, 1))),
            Math.max(0, Math.round(asNumber(payload.dientes, 0))),
            Math.max(1, Math.round(asNumber(payload.repeticiones, 1))),
            asText(payload.estado || 'Bueno'),
            asBoolean(payload.activo, true)
        ];

        if (!values[1]) {
            throw new Error('El código del troquel es obligatorio.');
        }

        if (payload.id) {
            const result = await client.query(
                `UPDATE troquel
                    SET codigo = $2,
                        descripcion = $3,
                        descripcion_cotizaciones = $4,
                        clasificacion = $5,
                        codigo_cliente = $6,
                        codigo_preprensa = $7,
                        codigo_proveedor = $8,
                        ancho_mm = $9,
                        largo_mm = $10,
                        desarrollo_cm = $11,
                        desarrollo_in = $12,
                        elongacion_pct = $13,
                        elongado = $14,
                        ancho_total_troquel_in = $15,
                        largo_total_troquel_in = $16,
                        dimensiones_troquel_in = $17,
                        ancho_etiqueta_in = $18,
                        largo_etiqueta_in = $19,
                        ancho_material_in = $20,
                        area_etiqueta_excesos_in = $21,
                        area_etiqueta_in = $22,
                        area_troquel_in2 = $23,
                        estructura_troquel = $24,
                        formato = $25,
                        gap_in = $26,
                        montaje_troquel = $27,
                        observaciones = $28,
                        proveedor_troquel = $29,
                        tension = $30,
                        tipo_troquel = $31,
                        tipo_troquel_2 = $32,
                        uso_convencional = $33,
                        uso_digital = $34,
                        usuario_creacion = $35,
                        vida_util_golpes_restantes = $36,
                        vida_util_golpes_usados = $37,
                        vida_util_golpes_total = $38,
                        reemplaza_a = $39,
                        reemplazado_por = $40,
                        image_url = $41,
                        cantidad_filas = $42,
                        dientes = $43,
                        repeticiones = $44,
                        estado = $45,
                        activo = $46
                  WHERE id = $1::uuid
                  RETURNING id::text`,
                [payload.id, ...values.slice(1)]
            );

            if (!result.rows.length) {
                throw new Error('No se encontró el troquel a actualizar.');
            }
            return result.rows[0].id;
        }

        const result = await client.query(
            `INSERT INTO troquel (
                tenant_id, codigo, descripcion, descripcion_cotizaciones, clasificacion, codigo_cliente, codigo_preprensa,
                codigo_proveedor, ancho_mm, largo_mm, desarrollo_cm, desarrollo_in, elongacion_pct, elongado,
                ancho_total_troquel_in, largo_total_troquel_in, dimensiones_troquel_in, ancho_etiqueta_in,
                largo_etiqueta_in, ancho_material_in, area_etiqueta_excesos_in, area_etiqueta_in, area_troquel_in2,
                estructura_troquel, formato, gap_in, montaje_troquel, observaciones, proveedor_troquel, tension,
                tipo_troquel, tipo_troquel_2, uso_convencional, uso_digital, usuario_creacion,
                vida_util_golpes_restantes, vida_util_golpes_usados, vida_util_golpes_total, reemplaza_a,
                reemplazado_por, image_url, cantidad_filas, dientes, repeticiones, estado, activo
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46
             )
             ON CONFLICT (tenant_id, codigo) DO UPDATE SET
                descripcion = EXCLUDED.descripcion,
                descripcion_cotizaciones = EXCLUDED.descripcion_cotizaciones,
                clasificacion = EXCLUDED.clasificacion,
                codigo_cliente = EXCLUDED.codigo_cliente,
                codigo_preprensa = EXCLUDED.codigo_preprensa,
                codigo_proveedor = EXCLUDED.codigo_proveedor,
                ancho_mm = EXCLUDED.ancho_mm,
                largo_mm = EXCLUDED.largo_mm,
                desarrollo_cm = EXCLUDED.desarrollo_cm,
                desarrollo_in = EXCLUDED.desarrollo_in,
                elongacion_pct = EXCLUDED.elongacion_pct,
                elongado = EXCLUDED.elongado,
                ancho_total_troquel_in = EXCLUDED.ancho_total_troquel_in,
                largo_total_troquel_in = EXCLUDED.largo_total_troquel_in,
                dimensiones_troquel_in = EXCLUDED.dimensiones_troquel_in,
                ancho_etiqueta_in = EXCLUDED.ancho_etiqueta_in,
                largo_etiqueta_in = EXCLUDED.largo_etiqueta_in,
                ancho_material_in = EXCLUDED.ancho_material_in,
                area_etiqueta_excesos_in = EXCLUDED.area_etiqueta_excesos_in,
                area_etiqueta_in = EXCLUDED.area_etiqueta_in,
                area_troquel_in2 = EXCLUDED.area_troquel_in2,
                estructura_troquel = EXCLUDED.estructura_troquel,
                formato = EXCLUDED.formato,
                gap_in = EXCLUDED.gap_in,
                montaje_troquel = EXCLUDED.montaje_troquel,
                observaciones = EXCLUDED.observaciones,
                proveedor_troquel = EXCLUDED.proveedor_troquel,
                tension = EXCLUDED.tension,
                tipo_troquel = EXCLUDED.tipo_troquel,
                tipo_troquel_2 = EXCLUDED.tipo_troquel_2,
                uso_convencional = EXCLUDED.uso_convencional,
                uso_digital = EXCLUDED.uso_digital,
                usuario_creacion = EXCLUDED.usuario_creacion,
                vida_util_golpes_restantes = EXCLUDED.vida_util_golpes_restantes,
                vida_util_golpes_usados = EXCLUDED.vida_util_golpes_usados,
                vida_util_golpes_total = EXCLUDED.vida_util_golpes_total,
                reemplaza_a = EXCLUDED.reemplaza_a,
                reemplazado_por = EXCLUDED.reemplazado_por,
                image_url = EXCLUDED.image_url,
                cantidad_filas = EXCLUDED.cantidad_filas,
                dientes = EXCLUDED.dientes,
                repeticiones = EXCLUDED.repeticiones,
                estado = EXCLUDED.estado,
                activo = EXCLUDED.activo
             RETURNING id::text`,
            values
        );
        return result.rows[0].id;
    });
}

function sanitizeMachineCapacity(capacity = {}) {
    return {
        clasificacion: asText(capacity.clasificacion || 'produccion'),
        proceso: asText(capacity.proceso || 'Produccion'),
        subproceso: asText(capacity.subproceso),
        unidad_trabajo: asText(capacity.unidad_trabajo || 'pies'),
        tiempo_preparacion_general: asNumber(capacity.tiempo_preparacion_general, 0),
        tiempo_adicional_preparacion: asNumber(capacity.tiempo_adicional_preparacion, 0),
        tiempo_por_estacion: asNumber(capacity.tiempo_por_estacion, 0),
        factor_proceso_por_area: asNumber(capacity.factor_proceso_por_area, 0),
        velocidad_produccion: asNumber(capacity.velocidad_produccion, 0),
        costo_hora_maquina: asNumber(capacity.costo_hora_maquina, 0),
        costo_hora_operario: asNumber(capacity.costo_hora_operario, 0),
        formula_tiempo: asText(capacity.formula_tiempo),
        formula_costo: asText(capacity.formula_costo),
        ancho_max_in: asNumber(capacity.ancho_max_in, 0),
        activa: asBoolean(capacity.activa, true)
    };
}

async function saveMachine(payload) {
    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);
        const machineType = normalizeMachineType(payload.tipo) || null;
        const machineValues = [
            tenantId,
            asText(payload.nombre),
            asText(payload.marca),
            asText(payload.modelo),
            machineType,
            asBoolean(payload.activa, true),
            asText(payload.observaciones),
            asText(payload.comentario_setup),
            asText(payload.comentario_montaje),
            asText(payload.unidad_velocidad_produccion || 'ft/min'),
            asNumber(payload.minuto_hombre, 0),
            asNumber(payload.factor_tiraje, 0),
            asNumber(payload.factor_montaje_estacion, 0),
            asNumber(payload.factor_preparacion, 0),
            Math.max(0, Math.round(asNumber(payload.macula_default_pies, 0))),
            asNullableNumber(payload.factor_tiraje_digital),
            asText(payload.digital_tipo_cobro || 'consumo').toLowerCase() === 'clic' ? 'clic' : 'consumo',
            asNumber(payload.digital_costo_kg_tinta, 0),
            asNumber(payload.digital_costo_kg_tinta_blanco, 0),
            asNumber(payload.digital_costo_kg_tinta_especial, 0),
            asNumber(payload.digital_tarifa_click, 0),
            asText(payload.digital_modo_click || 'por_estacion').toLowerCase() === 'por_vuelta' ? 'por_vuelta' : 'por_estacion',
            asNumber(payload.digital_velocidad_cmyk_mpm, 0),
            asNumber(payload.digital_velocidad_extendida_mpm, 0),
            asNumber(payload.digital_gramaje_cmyk_g_m2, 1.5),
            asNumber(payload.digital_gramaje_blanco_g_m2, 4),
            asNumber(payload.digital_factor_merma, 1.1),
            asNumber(payload.digital_costo_lavado_especial, 0),
            ['inline', 'offline'].includes(asText(payload.digital_premier_modo || 'offline').toLowerCase()) ? asText(payload.digital_premier_modo || 'offline').toLowerCase() : 'offline',
            asNumber(payload.digital_premier_setup_min, 20),
            asNumber(payload.digital_premier_costo_mantenimiento, 0),
            asNumber(payload.digital_premier_costo_offline_m, 0),
            asText(payload.sustrato_consumo_unidad || 'pies'),
            asNumber(payload.sustrato_setup_merma_cantidad, 0),
            asText(payload.sustrato_setup_merma_unidad || 'pies'),
            asText(payload.sustrato_setup_merma_base || 'trabajo'),
            asNumber(payload.sustrato_montaje_merma_cantidad, 0),
            asText(payload.sustrato_montaje_merma_unidad || 'pies'),
            asText(payload.sustrato_montaje_merma_base || 'trabajo'),
            payload.especificaciones || {}
        ];

        if (!machineValues[1]) {
            throw new Error('El nombre de la máquina es obligatorio.');
        }

        let machineId = payload.id;

        if (!machineId) {
            const existing = await client.query(
                `SELECT id::text
                   FROM maquina
                  WHERE tenant_id = $1
                    AND nombre = $2
                  LIMIT 1`,
                [tenantId, machineValues[1]]
            );
            if (existing.rows.length) {
                machineId = existing.rows[0].id;
            }
        }

        if (machineId) {
            const updateResult = await client.query(
                `UPDATE maquina
                    SET nombre = $2,
                        marca = $3,
                        modelo = $4,
                        tipo = $5::proceso_productivo,
                        activa = $6,
                        observaciones = $7,
                        comentario_setup = $8,
                        comentario_montaje = $9,
                        unidad_velocidad_produccion = $10,
                        minuto_hombre = $11,
                        factor_tiraje = $12,
                        factor_montaje_estacion = $13,
                        factor_preparacion = $14,
                        macula_default_pies = $15,
                        factor_tiraje_digital = $16,
                        digital_tipo_cobro = $17,
                        digital_costo_kg_tinta = $18,
                        digital_costo_kg_tinta_blanco = $19,
                        digital_costo_kg_tinta_especial = $20,
                        digital_tarifa_click = $21,
                        digital_modo_click = $22,
                        digital_velocidad_cmyk_mpm = $23,
                        digital_velocidad_extendida_mpm = $24,
                        digital_gramaje_cmyk_g_m2 = $25,
                        digital_gramaje_blanco_g_m2 = $26,
                        digital_factor_merma = $27,
                        digital_costo_lavado_especial = $28,
                        digital_premier_modo = $29,
                        digital_premier_setup_min = $30,
                        digital_premier_costo_mantenimiento = $31,
                        digital_premier_costo_offline_m = $32,
                        sustrato_consumo_unidad = $33,
                        sustrato_setup_merma_cantidad = $34,
                        sustrato_setup_merma_unidad = $35,
                        sustrato_setup_merma_base = $36,
                        sustrato_montaje_merma_cantidad = $37,
                        sustrato_montaje_merma_unidad = $38,
                        sustrato_montaje_merma_base = $39,
                        especificaciones = $40::jsonb,
                        actualizado_en = NOW()
                  WHERE id = $1::uuid
                  RETURNING id::text`,
                [machineId, ...machineValues.slice(1)]
            );

            if (!updateResult.rows.length) {
                throw new Error('No se encontró la máquina a actualizar.');
            }
            machineId = updateResult.rows[0].id;
        } else {
            const insertResult = await client.query(
                `INSERT INTO maquina (
                    tenant_id, nombre, marca, modelo, tipo, activa, observaciones, minuto_hombre, factor_tiraje,
                    factor_montaje_estacion, factor_preparacion, macula_default_pies, factor_tiraje_digital,
                    comentario_setup, comentario_montaje, unidad_velocidad_produccion, digital_tipo_cobro,
                    digital_costo_kg_tinta, digital_costo_kg_tinta_blanco, digital_costo_kg_tinta_especial, digital_tarifa_click, digital_modo_click, digital_velocidad_cmyk_mpm,
                    digital_velocidad_extendida_mpm, digital_gramaje_cmyk_g_m2, digital_gramaje_blanco_g_m2,
                    digital_factor_merma, digital_costo_lavado_especial, digital_premier_modo, digital_premier_setup_min,
                    digital_premier_costo_mantenimiento, digital_premier_costo_offline_m, sustrato_consumo_unidad,
                    sustrato_setup_merma_cantidad, sustrato_setup_merma_unidad, sustrato_setup_merma_base,
                    sustrato_montaje_merma_cantidad, sustrato_montaje_merma_unidad, sustrato_montaje_merma_base, especificaciones
                 ) VALUES (
                    $1,$2,$3,$4,$5::proceso_productivo,$6,$7,$11,$12,$13,$14,$15,$16,$8,$9,$10,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40::jsonb
                 )
                 RETURNING id::text`,
                machineValues
            );
            machineId = insertResult.rows[0].id;
        }

        await client.query('DELETE FROM maquina_capacidad WHERE maquina_id = $1::uuid', [machineId]);

        const capacities = Array.isArray(payload.capacidades) ? payload.capacidades : [];
        for (const rawCapacity of capacities) {
            const capacity = sanitizeMachineCapacity(rawCapacity);
            await client.query(
                `INSERT INTO maquina_capacidad (
                    tenant_id, maquina_id, clasificacion, proceso, subproceso, unidad_trabajo,
                    tiempo_preparacion_general, tiempo_adicional_preparacion, tiempo_por_estacion,
                    factor_proceso_por_area, velocidad_produccion, costo_hora_maquina,
                    costo_hora_operario, formula_tiempo, formula_costo, ancho_max_in, activa
                 ) VALUES (
                    $1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
                 )`,
                [
                    tenantId,
                    machineId,
                    capacity.clasificacion,
                    capacity.proceso,
                    capacity.subproceso || null,
                    capacity.unidad_trabajo || null,
                    capacity.tiempo_preparacion_general,
                    capacity.tiempo_adicional_preparacion,
                    capacity.tiempo_por_estacion,
                    capacity.factor_proceso_por_area,
                    capacity.velocidad_produccion,
                    capacity.costo_hora_maquina,
                    capacity.costo_hora_operario,
                    capacity.formula_tiempo || null,
                    capacity.formula_costo || null,
                    capacity.ancho_max_in,
                    capacity.activa
                ]
            );
        }

        return machineId;
    });
}

async function saveProceso(payload) {
    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);
        const values = [
            tenantId,
            asText(payload.codigo),
            asText(payload.nombre),
            asText(payload.descripcion),
            asText(payload.categoria || 'soporte'),
            asText(payload.subcategoria),
            payload.machine_id || null,
            asText(payload.proceso_productivo),
            asText(payload.modo_recurso || 'mixto'),
            asBoolean(payload.es_inline, false),
            asBoolean(payload.comparte_tiempo_linea, false),
            asBoolean(payload.comparte_operario, false),
            asBoolean(payload.requiere_troquel, false),
            asNumber(payload.cantidad_personas, 1),
            asNumber(payload.tiempo_preparacion_general, 0),
            asNumber(payload.tiempo_por_estacion, 0),
            asNumber(payload.tiempo_fijo_min, 0),
            asNumber(payload.velocidad_produccion, 0),
            asText(payload.unidad_trabajo || 'pies'),
            asNumber(payload.costo_hora_maquina, 0),
            asNumber(payload.costo_hora_operario, 0),
            asNumber(payload.costo_fijo, 0),
            asNumber(payload.costo_x_msi, 0),
            asNumber(payload.costo_x_kg, 0),
            asNumber(payload.costo_x_pie, 0),
            asNumber(payload.costo_x_millar, 0),
            asText(payload.formula_tiempo),
            asText(payload.formula_costo),
            Math.round(asNumber(payload.orden_base, 100)),
            asBoolean(payload.activo, true)
        ];

        if (!values[2]) {
            throw new Error('El nombre del proceso es obligatorio.');
        }

        if (payload.id) {
            const result = await client.query(
                `UPDATE proceso_catalogo
                    SET codigo = $2,
                        nombre = $3,
                        descripcion = $4,
                        categoria = $5,
                        subcategoria = $6,
                        machine_id = $7::uuid,
                        proceso_productivo = $8,
                        modo_recurso = $9,
                        es_inline = $10,
                        comparte_tiempo_linea = $11,
                        comparte_operario = $12,
                        requiere_troquel = $13,
                        cantidad_personas = $14,
                        tiempo_preparacion_general = $15,
                        tiempo_por_estacion = $16,
                        tiempo_fijo_min = $17,
                        velocidad_produccion = $18,
                        unidad_trabajo = $19,
                        costo_hora_maquina = $20,
                        costo_hora_operario = $21,
                        costo_fijo = $22,
                        costo_x_msi = $23,
                        costo_x_kg = $24,
                        costo_x_pie = $25,
                        costo_x_millar = $26,
                        formula_tiempo = $27,
                        formula_costo = $28,
                        orden_base = $29,
                        activo = $30,
                        actualizado_en = NOW()
                  WHERE id = $1::uuid
                  RETURNING id::text`,
                [payload.id, ...values.slice(1)]
            );

            if (!result.rows.length) {
                throw new Error('No se encontró el proceso a actualizar.');
            }
            return result.rows[0].id;
        }

        const result = await client.query(
            `INSERT INTO proceso_catalogo (
                tenant_id, codigo, nombre, descripcion, categoria, subcategoria, machine_id,
                proceso_productivo, modo_recurso, es_inline, comparte_tiempo_linea,
                comparte_operario, requiere_troquel, cantidad_personas, tiempo_preparacion_general,
                tiempo_por_estacion, tiempo_fijo_min, velocidad_produccion, unidad_trabajo,
                costo_hora_maquina, costo_hora_operario, costo_fijo, costo_x_msi, costo_x_kg,
                costo_x_pie, costo_x_millar, formula_tiempo, formula_costo, orden_base, activo
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7::uuid,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30
             )
             ON CONFLICT (tenant_id, nombre, categoria) DO UPDATE SET
                codigo = EXCLUDED.codigo,
                descripcion = EXCLUDED.descripcion,
                subcategoria = EXCLUDED.subcategoria,
                machine_id = EXCLUDED.machine_id,
                proceso_productivo = EXCLUDED.proceso_productivo,
                modo_recurso = EXCLUDED.modo_recurso,
                es_inline = EXCLUDED.es_inline,
                comparte_tiempo_linea = EXCLUDED.comparte_tiempo_linea,
                comparte_operario = EXCLUDED.comparte_operario,
                requiere_troquel = EXCLUDED.requiere_troquel,
                cantidad_personas = EXCLUDED.cantidad_personas,
                tiempo_preparacion_general = EXCLUDED.tiempo_preparacion_general,
                tiempo_por_estacion = EXCLUDED.tiempo_por_estacion,
                tiempo_fijo_min = EXCLUDED.tiempo_fijo_min,
                velocidad_produccion = EXCLUDED.velocidad_produccion,
                unidad_trabajo = EXCLUDED.unidad_trabajo,
                costo_hora_maquina = EXCLUDED.costo_hora_maquina,
                costo_hora_operario = EXCLUDED.costo_hora_operario,
                costo_fijo = EXCLUDED.costo_fijo,
                costo_x_msi = EXCLUDED.costo_x_msi,
                costo_x_kg = EXCLUDED.costo_x_kg,
                costo_x_pie = EXCLUDED.costo_x_pie,
                costo_x_millar = EXCLUDED.costo_x_millar,
                formula_tiempo = EXCLUDED.formula_tiempo,
                formula_costo = EXCLUDED.formula_costo,
                orden_base = EXCLUDED.orden_base,
                activo = EXCLUDED.activo,
                actualizado_en = NOW()
             RETURNING id::text`,
            values
        );
        return result.rows[0].id;
    });
}

async function saveInventory(kind, payload) {
    if (kind === INVENTORY_TYPES.materiales) return saveMaterial(payload);
    if (kind === INVENTORY_TYPES.troqueles) return saveTroquel(payload);
    if (kind === INVENTORY_TYPES.maquinas) return saveMachine(payload);
    if (kind === INVENTORY_TYPES.procesos) return saveProceso(payload);
    if (kind === INVENTORY_TYPES.tiposSalida) return saveOutputType(payload);
    throw new Error('Tipo de inventario no soportado.');
}

async function deleteMaterial(id) {
    const materialId = asText(id);
    if (!materialId) {
        throw new Error('Debes indicar el material a eliminar.');
    }

    return withTransaction(async (client) => {
        const result = await client.query(
            `DELETE FROM material
              WHERE id = $1::uuid
              RETURNING id::text, codigo, nombre`,
            [materialId]
        );

        if (!result.rows.length) {
            throw new Error('No se encontró el material a eliminar.');
        }

        return result.rows[0];
    });
}

async function deleteMachine(id) {
    const machineId = asText(id);
    if (!machineId) {
        throw new Error('Debes indicar la máquina a eliminar.');
    }

    return withTransaction(async (client) => {
        const machineResult = await client.query(
            `SELECT id::text, nombre
               FROM maquina
              WHERE id = $1::uuid
              LIMIT 1`,
            [machineId]
        );

        if (!machineResult.rows.length) {
            throw new Error('No se encontró la máquina a eliminar.');
        }

        await client.query(`UPDATE proceso_catalogo SET machine_id = NULL WHERE machine_id = $1::uuid`, [machineId]);
        await client.query(`UPDATE calculo_flexo SET maquina_digital_id = NULL WHERE maquina_digital_id = $1::uuid`, [machineId]);
        await client.query(`UPDATE cantidad_calculo_flexo SET maquina_id = NULL WHERE maquina_id = $1::uuid`, [machineId]);
        await client.query(`UPDATE calculo_flexo_proceso SET maquina_id = NULL WHERE maquina_id = $1::uuid`, [machineId]);

        const result = await client.query(
            `DELETE FROM maquina
              WHERE id = $1::uuid
              RETURNING id::text, nombre`,
            [machineId]
        );

        if (!result.rows.length) {
            throw new Error('No se encontró la máquina a eliminar.');
        }

        return result.rows[0];
    });
}

async function deleteInventory(kind, id) {
    if (kind === INVENTORY_TYPES.materiales) return deleteMaterial(id);
    if (kind === INVENTORY_TYPES.maquinas) return deleteMachine(id);
    throw new Error('El borrado no está disponible para este tipo de inventario.');
}

async function saveOutputType(payload) {
    const current = await loadOutputTypesConfig();
    const codigo = buildUniqueOutputTypeCode(current, payload);
    const normalizedId = asText(payload.id, codigo);

    const normalized = {
        id: normalizedId,
        codigo,
        nombre: asText(payload.nombre, codigo),
        descripcion: asText(payload.descripcion),
        image_url: asText(payload.image_url),
        activo: asBoolean(payload.activo, true)
    };

    const next = current.filter((item) => {
        const itemId = asText(item.id || item.codigo);
        const itemCode = asText(item.codigo || item.id);
        return itemId !== normalizedId && itemCode !== codigo;
    });
    next.push(normalized);
    await saveOutputTypesConfig(next);
    return normalized.id;
}

function parseWorkbook(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheet];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function mapMaterialRow(row) {
    const index = buildRowIndex(row);
    return {
        codigo: asText(pickValue(index, 'codigo', 'codigo material', 'id material')),
        nombre: asText(pickValue(index, 'nombre', 'descripcion', 'descripcion con medidas', 'descripcion para proforma')),
        ancho_mm: asNumber(pickValue(index, 'ancho_mm', 'ancho mm', 'ancho')),
        largo_mm: asNullableNumber(pickValue(index, 'largo_mm', 'largo mm', 'largo')),
        gramaje_g_m2: asNullableNumber(pickValue(index, 'gramaje_g_m2', 'gramaje', 'gramaje g m2')),
        calibre_micras: asNullableNumber(pickValue(index, 'calibre_micras', 'calibre')),
        costo_x_lamina: asNullableNumber(pickValue(index, 'costo_x_lamina', 'costo lamina', 'costo por lamina', 'precio lamina', 'costo lamina plancha')),
        costo_x_msi: asNumber(pickValue(index, 'costo_x_msi', 'costo msi', 'precio por msi', 'precio msi')),
        costo_x_m2: asNumber(pickValue(index, 'costo_x_m2', 'costo m2', 'precio por m2')),
        costo_x_kg: asNumber(pickValue(index, 'costo_x_kg', 'costo kg', 'precio por kg')),
        costo_x_libra: asNullableNumber(pickValue(index, 'costo_x_libra', 'costo libra', 'costo por libra', 'precio por libra')),
        peso_capa_gsm: asNullableNumber(pickValue(index, 'peso_capa_gsm', 'gsm', 'peso capa gsm', 'peso de capa', 'peso capa')),
        familia_proceso: normalizeMaterialFamily(pickValue(index, 'familia_proceso', 'familia proceso', 'familia de proceso', 'clasificacion proceso', 'clasificacion')),
        clasificacion: asText(pickValue(index, 'clasificacion', 'tipo material', 'tipo de material')),
        costo_x_unidad: asNullableNumber(pickValue(index, 'costo_x_unidad', 'costo unidad', 'costo por unidad')),
        merma_pct: asNullableNumber(pickValue(index, 'merma_pct', 'merma %', 'merma', 'desperdicio %')),
        rendimiento_g_ft2: asNullableNumber(pickValue(index, 'rendimiento_g_ft2', 'rendimiento g/ft2', 'rendimiento g ft2', 'g/ft2', 'g ft2')),
        temperatura_aplicacion_c: asNullableNumber(pickValue(index, 'temperatura_aplicacion_c', 'temperatura c', 'temperatura', 'temperatura aplicacion c')),
        tipo_transferencia: asText(pickValue(index, 'tipo_transferencia', 'transferencia', 'tipo transferencia')),
        comentario_rendimiento_g_ft2: asText(pickValue(index, 'comentario_rendimiento_g_ft2', 'comentario rendimiento g/ft2', 'comentario rendimiento')),
        compatible_convencional: asBoolean(pickValue(index, 'compatible_convencional', 'convencional')),
        compatible_digital: asBoolean(pickValue(index, 'compatible_digital', 'digital')),
        tipo_proforma: asText(pickValue(index, 'tipo_proforma', 'tipo proforma', 'familia')),
        activo: asBoolean(pickValue(index, 'activo'))
    };
}

function mapTroquelRow(row) {
    const index = buildRowIndex(row);
    const codigo = asText(pickValue(index, 'codigo', 'codigo troquel', 'id troquel'));
    const dimensionesTroquelIn = asText(pickValue(index, 'dimensiones troquel in'));
    const parsedDimensions = parseTroquelDimensionsIn(dimensionesTroquelIn);
    return {
        codigo,
        descripcion: asText(pickValue(index, 'descripcion', 'descripcion troquel')),
        descripcion_cotizaciones: asText(pickValue(index, 'descripcion_cotizaciones', 'descripcion troquel cotizaciones')),
        clasificacion: asText(pickValue(index, 'clasificacion')),
        codigo_cliente: asText(pickValue(index, 'codigo cliente')),
        codigo_preprensa: asText(pickValue(index, 'codigo preprensa')),
        codigo_proveedor: asText(pickValue(index, 'codigo proveedor')),
        ancho_mm: asNumber(pickValue(index, 'ancho_mm', 'ancho montaje mm', 'ancho mm', 'ancho')),
        largo_mm: asNumber(pickValue(index, 'largo_mm', 'largo montaje mm', 'largo mm', 'largo')),
        desarrollo_cm: asNullableNumber(pickValue(index, 'desarrollo cm')),
        desarrollo_in: asNullableNumber(pickValue(index, 'desarrollo in')),
        elongacion_pct: asNullableNumber(pickValue(index, 'elongacion_pct', 'elongacion %', 'elongacion', 'distorsion %', 'distorsion')),
        elongado: asNullableNumber(pickValue(index, 'elongado')),
        ancho_total_troquel_in: asNullableNumber(pickValue(index, 'ancho_total_troquel_in', 'dimensiones troquel | ancho in')) ?? parsedDimensions.width,
        largo_total_troquel_in: asNullableNumber(pickValue(index, 'largo_total_troquel_in', 'dimensiones troquel | largo in')) ?? parsedDimensions.length,
        dimensiones_troquel_in: dimensionesTroquelIn,
        ancho_etiqueta_in: asNullableNumber(pickValue(index, 'ancho etiqueta in', 'ancho decimal in')),
        largo_etiqueta_in: asNullableNumber(pickValue(index, 'largo etiqueta in', 'largo decimal in')),
        ancho_material_in: asNullableNumber(pickValue(index, 'ancho material in')),
        area_etiqueta_excesos_in: asNullableNumber(pickValue(index, 'area etiqueta con excesos in')),
        area_etiqueta_in: asNullableNumber(pickValue(index, 'area etiqueta in')),
        area_troquel_in2: asNullableNumber(pickValue(index, 'area troquel in2')),
        estructura_troquel: asText(pickValue(index, 'estructura de troquel')),
        formato: asText(pickValue(index, 'formato')),
        gap_in: asNullableNumber(pickValue(index, 'gap in')),
        montaje_troquel: asText(pickValue(index, 'montaje troquel')),
        observaciones: asText(pickValue(index, 'observaciones')),
        proveedor_troquel: asText(pickValue(index, 'proveedor_troquel', 'proveedor troquel')),
        tension: asText(pickValue(index, 'tension', 'tensión')),
        tipo_troquel: asText(pickValue(index, 'tipo troquel')),
        tipo_troquel_2: asText(pickValue(index, 'tipo de troquel2', 'tipo troquel2')),
        uso_convencional: asBoolean(pickValue(index, 'uso convencional'), false),
        uso_digital: asBoolean(pickValue(index, 'uso digital'), false),
        usuario_creacion: asText(pickValue(index, 'usuario creacion')),
        vida_util_golpes_restantes: asNullableNumber(pickValue(index, 'vida util troque | cantidad golpes restantes')),
        vida_util_golpes_usados: asNullableNumber(pickValue(index, 'vida util troque | cantidad golpes usados')),
        vida_util_golpes_total: asNullableNumber(pickValue(index, 'vida util troque | cantidad golpes vida util')),
        reemplaza_a: asText(pickValue(index, 'reemplaza a')),
        reemplazado_por: asText(pickValue(index, 'reemplazado por')),
        image_url: copyTroquelImage(codigo),
        cantidad_filas: asNumber(pickValue(index, 'cantidad_filas', 'filas'), 1),
        dientes: asNumber(pickValue(index, 'dientes')),
        repeticiones: asNumber(pickValue(index, 'repeticiones')),
        estado: asText(pickValue(index, 'estado', 'estado troquel')),
        activo: asBoolean(pickValue(index, 'activo'), true)
    };
}

function mapMachineRow(row) {
    const index = buildRowIndex(row);
    const processProfile = mapMachineProcessProfile(
        pickValue(index, 'tipo de proceso', 'tipo', 'proceso productivo', 'proceso')
    );
    return {
        nombre: asText(pickValue(index, 'nombre', 'nombre maquina', 'nombre de la maquina')),
        marca: asText(pickValue(index, 'marca')),
        modelo: asText(pickValue(index, 'modelo')),
        tipo: processProfile.tipo,
        unidad_velocidad_produccion: asText(pickValue(index, 'unidad_velocidad_produccion', 'unidad velocidad produccion', 'unidad velocidad', 'unidad velocidad producción'), 'ft/min'),
        activa: asBoolean(pickValue(index, 'activa', 'activo'), true),
        observaciones: asText(pickValue(index, 'comentarios', 'observaciones')),
        minuto_hombre: asNumber(pickValue(index, 'minuto_hombre', 'minuto hombre', 'costo minuto maquina')),
        factor_tiraje: asNumber(pickValue(index, 'factor_tiraje', 'factor tiraje', 'pies por minuto', 'velocidad')),
        factor_montaje_estacion: asNumber(pickValue(index, 'factor_montaje_estacion', 'factor montaje estacion', 'factor montaje estación')),
        factor_preparacion: asNumber(pickValue(index, 'factor_preparacion', 'factor preparacion')),
        macula_default_pies: asNumber(pickValue(index, 'macula_default_pies', 'macula default pies'), 0),
        factor_tiraje_digital: asNullableNumber(pickValue(index, 'factor_tiraje_digital')),
        capacidad: sanitizeMachineCapacity({
            clasificacion: pickValue(index, 'clasificacion', 'categoria proceso') || processProfile.clasificacion,
            proceso: pickValue(index, 'proceso capacidad', 'proceso_principal', 'proceso', 'proceso operacion') || processProfile.proceso,
            subproceso: pickValue(index, 'subproceso') || processProfile.subproceso,
            unidad_trabajo: pickValue(index, 'unidad_trabajo', 'unidad trabajo'),
            tiempo_preparacion_general: pickValue(index, 'tiempo_preparacion_general', 'tiempo preparacion general', 'tiempo setup base'),
            tiempo_adicional_preparacion: pickValue(index, 'tiempo_adicional_preparacion', 'tiempo adicional preparacion'),
            tiempo_por_estacion: pickValue(index, 'tiempo_por_estacion', 'tiempo por estacion', 'tiempo montaje subproceso'),
            factor_proceso_por_area: pickValue(index, 'factor_proceso_por_area', 'factor proceso por area'),
            velocidad_produccion: pickValue(index, 'velocidad_produccion', 'velocidad produccion', 'velocidad'),
            ancho_max_in: pickValue(index, 'ancho_max_in', 'ancho max in', 'ancho max', 'ancho máximo', 'ancho'),
            costo_hora_maquina: pickValue(index, 'costo_hora_maquina', 'costo hora maquina'),
            costo_hora_operario: pickValue(index, 'costo_hora_operario', 'costo hora operario', 'costo hora hombre'),
            formula_tiempo: pickValue(index, 'formula_tiempo'),
            formula_costo: pickValue(index, 'formula_costo'),
            activa: pickValue(index, 'capacidad_activa', 'proceso_activo', 'activa')
        })
    };
}

function mapProcesoRow(row) {
    const index = buildRowIndex(row);
    return {
        codigo: asText(pickValue(index, 'codigo')),
        nombre: asText(pickValue(index, 'nombre', 'proceso')),
        descripcion: asText(pickValue(index, 'descripcion')),
        categoria: asText(pickValue(index, 'categoria'), 'soporte'),
        subcategoria: asText(pickValue(index, 'subcategoria')),
        machine_id: asText(pickValue(index, 'machine_id')),
        proceso_productivo: asText(pickValue(index, 'proceso_productivo')),
        modo_recurso: asText(pickValue(index, 'modo_recurso'), 'mixto'),
        es_inline: asBoolean(pickValue(index, 'es_inline')),
        comparte_tiempo_linea: asBoolean(pickValue(index, 'comparte_tiempo_linea')),
        comparte_operario: asBoolean(pickValue(index, 'comparte_operario')),
        requiere_troquel: asBoolean(pickValue(index, 'requiere_troquel')),
        cantidad_personas: asNumber(pickValue(index, 'cantidad_personas'), 1),
        tiempo_preparacion_general: asNumber(pickValue(index, 'tiempo_preparacion_general'), 0),
        tiempo_por_estacion: asNumber(pickValue(index, 'tiempo_por_estacion'), 0),
        tiempo_fijo_min: asNumber(pickValue(index, 'tiempo_fijo_min'), 0),
        velocidad_produccion: asNumber(pickValue(index, 'velocidad_produccion'), 0),
        unidad_trabajo: asText(pickValue(index, 'unidad_trabajo'), 'pies'),
        costo_hora_maquina: asNumber(pickValue(index, 'costo_hora_maquina'), 0),
        costo_hora_operario: asNumber(pickValue(index, 'costo_hora_operario'), 0),
        costo_fijo: asNumber(pickValue(index, 'costo_fijo'), 0),
        costo_x_msi: asNumber(pickValue(index, 'costo_x_msi'), 0),
        costo_x_kg: asNumber(pickValue(index, 'costo_x_kg'), 0),
        costo_x_pie: asNumber(pickValue(index, 'costo_x_pie'), 0),
        costo_x_millar: asNumber(pickValue(index, 'costo_x_millar'), 0),
        formula_tiempo: asText(pickValue(index, 'formula_tiempo')),
        formula_costo: asText(pickValue(index, 'formula_costo')),
        orden_base: Math.round(asNumber(pickValue(index, 'orden_base'), 100)),
        activo: asBoolean(pickValue(index, 'activo'), true)
    };
}

function mapOutputTypeRow(row) {
    const index = buildRowIndex(row);
    const codigo = asText(pickValue(index, 'codigo', 'id'));
    return {
        id: asText(pickValue(index, 'id'), codigo),
        codigo,
        nombre: asText(pickValue(index, 'nombre', 'name'), codigo),
        descripcion: asText(pickValue(index, 'descripcion', 'description')),
        image_url: asText(pickValue(index, 'image_url', 'image url', 'imageurl')),
        activo: asBoolean(pickValue(index, 'activo', 'active'), true)
    };
}

async function importInventory(kind, buffer) {
    const rows = parseWorkbook(buffer);
    if (!rows.length) {
        return { imported: 0 };
    }

    if (kind === INVENTORY_TYPES.materiales) {
        let imported = 0;
        for (const row of rows) {
            const payload = mapMaterialRow(row);
            if (!payload.codigo) continue;
            await saveMaterial(payload);
            imported += 1;
        }
        return { imported };
    }

    if (kind === INVENTORY_TYPES.troqueles) {
        let imported = 0;
        for (const row of rows) {
            const payload = mapTroquelRow(row);
            if (!payload.codigo) continue;
            await saveTroquel(payload);
            imported += 1;
        }
        return { imported };
    }

    if (kind === INVENTORY_TYPES.maquinas) {
        const grouped = new Map();
        for (const row of rows) {
            const payload = mapMachineRow(row);
            if (!payload.nombre) continue;
            const key = `${payload.nombre}::${payload.tipo}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    nombre: payload.nombre,
                    marca: payload.marca,
                    modelo: payload.modelo,
                    tipo: payload.tipo,
                    activa: payload.activa,
                    observaciones: payload.observaciones,
                    minuto_hombre: payload.minuto_hombre,
                    factor_tiraje: payload.factor_tiraje,
                    factor_montaje_estacion: payload.factor_montaje_estacion,
                    factor_preparacion: payload.factor_preparacion,
                    macula_default_pies: payload.macula_default_pies,
                    factor_tiraje_digital: payload.factor_tiraje_digital,
                    capacidades: []
                });
            }

            const entry = grouped.get(key);
            entry.activa = payload.activa;
            entry.marca = payload.marca || entry.marca;
            entry.modelo = payload.modelo || entry.modelo;
            entry.observaciones = payload.observaciones || entry.observaciones;
            entry.minuto_hombre = payload.minuto_hombre;
            entry.factor_tiraje = payload.factor_tiraje;
            entry.factor_montaje_estacion = payload.factor_montaje_estacion;
            entry.factor_preparacion = payload.factor_preparacion;
            entry.macula_default_pies = payload.macula_default_pies;
            entry.factor_tiraje_digital = payload.factor_tiraje_digital;

            if (payload.capacidad.proceso || payload.capacidad.subproceso || payload.capacidad.clasificacion) {
                entry.capacidades.push(payload.capacidad);
            }
        }

        let imported = 0;
        for (const payload of grouped.values()) {
            await saveMachine(payload);
            imported += 1;
        }
        return { imported };
    }

    if (kind === INVENTORY_TYPES.procesos) {
        let imported = 0;
        for (const row of rows) {
            const payload = mapProcesoRow(row);
            if (!payload.nombre) continue;
            await saveProceso(payload);
            imported += 1;
        }
        return { imported };
    }

    if (kind === INVENTORY_TYPES.tiposSalida) {
        const items = [];
        for (const row of rows) {
            const payload = mapOutputTypeRow(row);
            if (!payload.codigo) continue;
            items.push(payload);
        }
        await saveOutputTypesConfig(items);
        return { imported: items.length };
    }

    throw new Error('Tipo de inventario no soportado.');
}

function flattenExportRows(kind, items) {
    if (kind === INVENTORY_TYPES.materiales) {
        return items.map((item) => ({
            id: item.id,
            codigo: item.codigo,
            nombre: item.nombre,
            ancho_mm: item.ancho_mm,
            largo_mm: item.largo_mm,
            gramaje_g_m2: item.gramaje_g_m2,
            calibre_micras: item.calibre_micras,
            costo_x_lamina: item.costo_x_lamina,
            costo_x_msi: item.costo_x_msi,
            costo_x_m2: item.costo_x_m2,
            costo_x_kg: item.costo_x_kg,
            costo_x_libra: item.costo_x_libra,
            peso_capa_gsm: item.peso_capa_gsm,
            familia_proceso: item.familia_proceso,
            clasificacion: item.clasificacion,
            comentario_ancho_mm: item.comentario_ancho_mm,
            comentario_largo_mm: item.comentario_largo_mm,
            comentario_gramaje_g_m2: item.comentario_gramaje_g_m2,
            comentario_calibre_micras: item.comentario_calibre_micras,
            comentario_costo_x_lamina: item.comentario_costo_x_lamina,
            comentario_costo_x_msi: item.comentario_costo_x_msi,
            comentario_costo_x_m2: item.comentario_costo_x_m2,
            comentario_costo_x_kg: item.comentario_costo_x_kg,
            comentario_costo_x_libra: item.comentario_costo_x_libra,
            comentario_peso_capa_gsm: item.comentario_peso_capa_gsm,
            comentario_compatible_convencional: item.comentario_compatible_convencional,
            comentario_compatible_digital: item.comentario_compatible_digital,
            comentario_tipo_proforma: item.comentario_tipo_proforma,
            compatible_convencional: item.compatible_convencional,
            compatible_digital: item.compatible_digital,
            tipo_proforma: item.tipo_proforma,
            activo: item.activo
        }));
    }

    if (kind === INVENTORY_TYPES.troqueles) {
        return items.map((item) => ({
            id: item.id,
            codigo: item.codigo,
            descripcion: item.descripcion,
            descripcion_cotizaciones: item.descripcion_cotizaciones,
            clasificacion: item.clasificacion,
            codigo_cliente: item.codigo_cliente,
            codigo_preprensa: item.codigo_preprensa,
            codigo_proveedor: item.codigo_proveedor,
            ancho_mm: item.ancho_mm,
            largo_mm: item.largo_mm,
            desarrollo_cm: item.desarrollo_cm,
            desarrollo_in: item.desarrollo_in,
            elongacion_pct: item.elongacion_pct,
            elongado: item.elongado,
            ancho_total_troquel_in: item.ancho_total_troquel_in,
            largo_total_troquel_in: item.largo_total_troquel_in,
            dimensiones_troquel_in: item.dimensiones_troquel_in,
            ancho_etiqueta_in: item.ancho_etiqueta_in,
            largo_etiqueta_in: item.largo_etiqueta_in,
            ancho_material_in: item.ancho_material_in,
            area_etiqueta_excesos_in: item.area_etiqueta_excesos_in,
            area_etiqueta_in: item.area_etiqueta_in,
            area_troquel_in2: item.area_troquel_in2,
            estructura_troquel: item.estructura_troquel,
            formato: item.formato,
            gap_in: item.gap_in,
            montaje_troquel: item.montaje_troquel,
            observaciones: item.observaciones,
            proveedor_troquel: item.proveedor_troquel,
            tension: item.tension,
            tipo_troquel: item.tipo_troquel,
            tipo_troquel_2: item.tipo_troquel_2,
            uso_convencional: item.uso_convencional,
            uso_digital: item.uso_digital,
            usuario_creacion: item.usuario_creacion,
            vida_util_golpes_restantes: item.vida_util_golpes_restantes,
            vida_util_golpes_usados: item.vida_util_golpes_usados,
            vida_util_golpes_total: item.vida_util_golpes_total,
            reemplaza_a: item.reemplaza_a,
            reemplazado_por: item.reemplazado_por,
            image_url: item.image_url,
            cantidad_filas: item.cantidad_filas,
            dientes: item.dientes,
            repeticiones: item.repeticiones,
            estado: item.estado,
            activo: item.activo
        }));
    }

    if (kind === INVENTORY_TYPES.procesos) {
        return items.map((item) => ({
            id: item.id,
            codigo: item.codigo,
            nombre: item.nombre,
            descripcion: item.descripcion,
            categoria: item.categoria,
            subcategoria: item.subcategoria,
            machine_id: item.machine_id,
            machine_name: item.machine_name,
            proceso_productivo: item.proceso_productivo,
            modo_recurso: item.modo_recurso,
            es_inline: item.es_inline,
            comparte_tiempo_linea: item.comparte_tiempo_linea,
            comparte_operario: item.comparte_operario,
            requiere_troquel: item.requiere_troquel,
            cantidad_personas: item.cantidad_personas,
            tiempo_preparacion_general: item.tiempo_preparacion_general,
            tiempo_por_estacion: item.tiempo_por_estacion,
            tiempo_fijo_min: item.tiempo_fijo_min,
            velocidad_produccion: item.velocidad_produccion,
            unidad_trabajo: item.unidad_trabajo,
            costo_hora_maquina: item.costo_hora_maquina,
            costo_hora_operario: item.costo_hora_operario,
            costo_fijo: item.costo_fijo,
            costo_x_msi: item.costo_x_msi,
            costo_x_kg: item.costo_x_kg,
            costo_x_pie: item.costo_x_pie,
            costo_x_millar: item.costo_x_millar,
            formula_tiempo: item.formula_tiempo,
            formula_costo: item.formula_costo,
            orden_base: item.orden_base,
            activo: item.activo
        }));
    }

    if (kind === INVENTORY_TYPES.tiposSalida) {
        return items.map((item) => ({
            id: item.id || item.codigo,
            codigo: item.codigo,
            nombre: item.nombre,
            descripcion: item.descripcion,
            image_url: item.image_url,
            activo: item.activo
        }));
    }

    return items.flatMap((item) => {
        const capacities = Array.isArray(item.capacidades) && item.capacidades.length ? item.capacidades : [null];
        return capacities.map((capacity) => ({
            id: item.id,
            nombre: item.nombre,
            tipo: item.tipo,
            unidad_velocidad_produccion: item.unidad_velocidad_produccion || 'ft/min',
            activa: item.activa,
            observaciones: item.observaciones || '',
            minuto_hombre: item.minuto_hombre,
            factor_tiraje: item.factor_tiraje,
            factor_montaje_estacion: item.factor_montaje_estacion,
            factor_preparacion: item.factor_preparacion,
            macula_default_pies: item.macula_default_pies,
            factor_tiraje_digital: item.factor_tiraje_digital,
            proceso_principal: item.proceso || capacity?.proceso || '',
            clasificacion: capacity?.clasificacion || '',
            proceso: capacity?.proceso || '',
            subproceso: capacity?.subproceso || '',
            unidad_trabajo: capacity?.unidad_trabajo || '',
            tiempo_preparacion_general: capacity?.tiempo_preparacion_general ?? '',
            tiempo_adicional_preparacion: capacity?.tiempo_adicional_preparacion ?? '',
            tiempo_por_estacion: capacity?.tiempo_por_estacion ?? '',
            factor_proceso_por_area: capacity?.factor_proceso_por_area ?? '',
            velocidad_produccion: capacity?.velocidad_produccion ?? '',
            costo_hora_maquina: capacity?.costo_hora_maquina ?? '',
            costo_hora_operario: capacity?.costo_hora_operario ?? '',
            formula_tiempo: capacity?.formula_tiempo || '',
            formula_costo: capacity?.formula_costo || '',
            capacidad_activa: capacity?.activa ?? ''
        }));
    });
}

async function exportInventoryWorkbook(kind) {
    const items = await listInventory(kind, { limit: 5000 });
    const rows = flattenExportRows(kind, items);
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, kind);
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
}

module.exports = {
    INVENTORY_TYPES,
    ensureInventorySchema,
    listInventory,
    getTroquelByCode,
    saveInventory,
    deleteInventory,
    importInventory,
    exportInventoryWorkbook
};

