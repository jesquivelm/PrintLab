const XLSX = require('xlsx');
const { query: pgQuery, withTransaction } = require('./db/postgres');
const fs = require('fs');
const path = require('path');

const INVENTORY_TYPES = {
    materiales: 'materiales',
    troqueles: 'troqueles',
    maquinas: 'maquinas',
    procesos: 'procesos',
    tiposSalida: 'tipos-salida',
    tiposTrabajo: 'tipos-trabajo',
    sellos: 'sellos',
    cilindros: 'cilindros',
    anilox: 'anilox'
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

    let normalized = String(value).trim().replace(/\s+/g, '');
    if (normalized.includes(',')) {
        // Formato europeo (ej. "1.234,56"): el punto es separador de miles, la coma es el decimal.
        // Solo se aplica cuando hay coma; un número con punto decimal solo (ej. "0.125") no se debe tocar.
        normalized = normalized.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    }
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
    if (normalized.includes('sello') || normalized.includes('cliche') || normalized.includes('cliché') || normalized.includes('fotopol')) return 'sello';
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
            clasificacion: 'sellos',
            proceso: 'Sellos',
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
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS lavado_por_estacion DECIMAL(12,4) DEFAULT 0`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS volteadora BOOLEAN DEFAULT FALSE`);
await client.query(`ALTER TABLE maquina ADD COLUMN IF NOT EXISTS volteadora_setup_min DECIMAL(12,4) DEFAULT 30`);
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
    // Ficha técnica de la goma para estampado (materia prima clasificada "adicionales").
    // Mismos números que el barniz, pero viven solo en la línea de inventario.
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_cobertura_pct DECIMAL(10,4)`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_bcm_anilox DECIMAL(10,4)`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_lineatura_anilox DECIMAL(10,4)`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_factor_transferencia DECIMAL(10,4)`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_densidad DECIMAL(10,4)`);
    await client.query(`ALTER TABLE material ADD COLUMN IF NOT EXISTS goma_carga_minima_kg DECIMAL(12,6)`);
    await client.query(`ALTER TABLE maquina_capacidad ADD COLUMN IF NOT EXISTS ancho_max_in DECIMAL(10,4)`);
    await client.query(`
        CREATE TABLE IF NOT EXISTS maquina_mantenimiento (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            maquina_id UUID NOT NULL REFERENCES maquina(id) ON DELETE CASCADE,
            frecuencia VARCHAR(20) NOT NULL DEFAULT 'bisemanal',
            dia_semana INTEGER NOT NULL DEFAULT 1,
            semana_mes INTEGER NOT NULL DEFAULT 1,
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE,
            duracion_horas NUMERIC(8,2) NOT NULL DEFAULT 5,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_maquina_mantenimiento UNIQUE (maquina_id),
            CONSTRAINT ck_maquina_mantenimiento_frecuencia CHECK (frecuencia IN ('semanal', 'bisemanal', 'mensual')),
            CONSTRAINT ck_maquina_mantenimiento_dia CHECK (dia_semana BETWEEN 1 AND 7),
            CONSTRAINT ck_maquina_mantenimiento_semana CHECK (semana_mes BETWEEN 1 AND 5)
        )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_maquina_mantenimiento_maquina ON maquina_mantenimiento(maquina_id)`);
    await client.query(`
        CREATE TABLE IF NOT EXISTS maquina_mantenimiento_excepcion (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            maquina_id UUID NOT NULL REFERENCES maquina(id) ON DELETE CASCADE,
            fecha_original DATE NOT NULL,
            tipo VARCHAR(20) NOT NULL DEFAULT 'desactivar',
            fecha_nueva DATE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_maquina_mantenimiento_excepcion UNIQUE (maquina_id, fecha_original),
            CONSTRAINT ck_maquina_mantenimiento_excepcion_tipo CHECK (tipo IN ('desactivar', 'mover'))
        )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_maquina_mantenimiento_excepcion_maquina ON maquina_mantenimiento_excepcion(maquina_id, fecha_original)`);
    await client.query(`
        CREATE TABLE IF NOT EXISTS sello (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
            codigo VARCHAR(60) NOT NULL,
            descripcion TEXT,
            cliente VARCHAR(200),
            producto VARCHAR(200),
            trabajo VARCHAR(200),
            orden VARCHAR(80),
            cotizacion VARCHAR(80),
            tipo VARCHAR(80),
            marca VARCHAR(120),
            modelo VARCHAR(120),
            proveedor VARCHAR(200),
            ancho_mm DECIMAL(10,2) NOT NULL DEFAULT 0,
            alto_mm DECIMAL(10,2) NOT NULL DEFAULT 0,
            espesor_mm DECIMAL(10,4) NOT NULL DEFAULT 0,
            espesor_in VARCHAR(20),
            costo DECIMAL(12,4) NOT NULL DEFAULT 0,
            estado VARCHAR(40) NOT NULL DEFAULT 'Disponible',
            usos INT NOT NULL DEFAULT 0,
            vida_util INT NOT NULL DEFAULT 40,
            ubicacion VARCHAR(120),
            responsable VARCHAR(120),
            fecha_creacion DATE,
            fecha_ultimo_uso VARCHAR(20) DEFAULT '—',
            troquel_ref VARCHAR(200),
            notas TEXT,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (tenant_id, codigo)
        )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sello_tenant ON sello(tenant_id, activo)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS cliente VARCHAR(200)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS producto VARCHAR(200)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS trabajo VARCHAR(200)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS orden VARCHAR(80)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS cotizacion VARCHAR(80)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS tipo VARCHAR(80)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS marca VARCHAR(120)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS modelo VARCHAR(120)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS proveedor VARCHAR(200)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS alto_mm DECIMAL(10,2) DEFAULT 0`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS espesor_mm DECIMAL(10,4) DEFAULT 0`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS espesor_in VARCHAR(20)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS costo DECIMAL(12,4) DEFAULT 0`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS estado VARCHAR(40) DEFAULT 'Disponible'`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS usos INT DEFAULT 0`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS vida_util INT DEFAULT 40`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(120)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS responsable VARCHAR(120)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS fecha_creacion DATE`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS fecha_ultimo_uso VARCHAR(20) DEFAULT '—'`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS troquel_ref VARCHAR(200)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS notas TEXT`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS codigo VARCHAR(60) NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS tecnologia VARCHAR(80)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS dureza_shore NUMERIC(6,2)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS relieve_mm NUMERIC(8,4)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS lineatura_lpi NUMERIC(8,2)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS resolucion_dpi NUMERIC(10,2)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS punto_minimo_pct NUMERIC(6,2)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS tipo_punto VARCHAR(40)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS factor_distorsion NUMERIC(10,6)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS undercut_mm NUMERIC(8,4)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS stickyback_espesor_mm NUMERIC(8,4)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS stickyback_tipo VARCHAR(80)`);
    await client.query(`ALTER TABLE sello ADD COLUMN IF NOT EXISTS stickyback_dureza VARCHAR(60)`);

    await client.query(`
        CREATE TABLE IF NOT EXISTS cilindro (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
            codigo VARCHAR(60) NOT NULL,
            nombre VARCHAR(200),
            tipo VARCHAR(80),
            dientes INT NOT NULL DEFAULT 0,
            paso_in DECIMAL(10,4) NOT NULL DEFAULT 0,
            paso_mm DECIMAL(10,3) NOT NULL DEFAULT 0,
            circunferencia_in DECIMAL(10,4) NOT NULL DEFAULT 0,
            desarrollo_mm DECIMAL(10,2) NOT NULL DEFAULT 0,
            ancho_util_mm DECIMAL(10,2) NOT NULL DEFAULT 0,
            ancho_total_mm DECIMAL(10,2) NOT NULL DEFAULT 0,
            fabricante VARCHAR(120),
            modelo VARCHAR(120),
            numero_serie VARCHAR(120),
            estado VARCHAR(40) NOT NULL DEFAULT 'Disponible',
            ubicacion VARCHAR(120),
            fecha_adquisicion DATE,
            ultimo_mantenimiento VARCHAR(20) DEFAULT '—',
            notas TEXT,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (tenant_id, codigo)
        )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cilindro_tenant ON cilindro(tenant_id, activo)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS nombre VARCHAR(200)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS tipo VARCHAR(80)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS dientes INT DEFAULT 0`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS paso_in DECIMAL(10,4) DEFAULT 0`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS paso_mm DECIMAL(10,3) DEFAULT 0`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS circunferencia_in DECIMAL(10,4) DEFAULT 0`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS desarrollo_mm DECIMAL(10,2) DEFAULT 0`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS ancho_util_mm DECIMAL(10,2) DEFAULT 0`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS ancho_total_mm DECIMAL(10,2) DEFAULT 0`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS fabricante VARCHAR(120)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS modelo VARCHAR(120)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(120)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS estado VARCHAR(40) DEFAULT 'Disponible'`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(120)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS fecha_adquisicion DATE`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS ultimo_mantenimiento VARCHAR(20) DEFAULT '—'`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS notas TEXT`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS codigo VARCHAR(60) NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS cantidad_cilindros_regulares NUMERIC(10,2) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS cantidad_cilindros_magneticos NUMERIC(10,2) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS cantidad_recibida NUMERIC(10,2)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS elongacion_pct_config_a NUMERIC(6,2)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS encogimiento_config_a NUMERIC(10,4)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS elongacion_pct_config_b NUMERIC(6,2)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS encogimiento_config_b NUMERIC(10,4)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS configuracion_a_nombre VARCHAR(120)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS configuracion_b_nombre VARCHAR(120)`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS sin_existencia BOOLEAN NOT NULL DEFAULT false`);
    await client.query(`ALTER TABLE cilindro ADD COLUMN IF NOT EXISTS encogimiento DECIMAL(10,4)`);

    await client.query(`
        CREATE TABLE IF NOT EXISTS cilindro_uso (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
            cilindro_id UUID NOT NULL REFERENCES cilindro(id) ON DELETE CASCADE,
            orden_produccion_id UUID,
            orden_codigo TEXT,
            producto_id UUID,
            producto_codigo TEXT,
            motivo_version TEXT,
            fecha_uso DATE,
            maquina_id UUID,
            maquina_nombre TEXT,
            estacion_numero INTEGER,
            desarrollo_utilizado_in DECIMAL(12,4),
            metros_producidos DECIMAL(18,4),
            metros_procesados DECIMAL(18,4),
            cantidad_producida DECIMAL(18,4),
            observaciones TEXT,
            creado_por BIGINT,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cilindro_uso_cilindro ON cilindro_uso(cilindro_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cilindro_uso_tenant ON cilindro_uso(tenant_id, creado_en)`);

    await client.query(`
        CREATE TABLE IF NOT EXISTS anilox (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
            codigo VARCHAR(60) NOT NULL,
            lineatura INT NOT NULL DEFAULT 0,
            bcm DECIMAL(10,3) NOT NULL DEFAULT 0,
            ancho_util_mm DECIMAL(10,2),
            diametro_mm DECIMAL(10,2),
            longitud_mm DECIMAL(10,2),
            fabricante VARCHAR(120),
            tipo_recubrimiento VARCHAR(80),
            estado VARCHAR(40) NOT NULL DEFAULT 'Disponible',
            fecha_compra DATE,
            vida_util DECIMAL(14,2),
            desgaste DECIMAL(10,2),
            modelo VARCHAR(120),
            numero_serie VARCHAR(120),
            ubicacion VARCHAR(120),
            ultimo_mantenimiento VARCHAR(20) DEFAULT '—',
            notas TEXT,
            activo BOOLEAN NOT NULL DEFAULT TRUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (tenant_id, codigo)
        )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_anilox_tenant ON anilox(tenant_id, activo)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS lineatura INT NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS bcm DECIMAL(10,3) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS ancho_util_mm DECIMAL(10,2)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS diametro_mm DECIMAL(10,2)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS longitud_mm DECIMAL(10,2)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS fabricante VARCHAR(120)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS tipo_recubrimiento VARCHAR(80)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS estado VARCHAR(40) NOT NULL DEFAULT 'Disponible'`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS fecha_compra DATE`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS vida_util DECIMAL(14,2)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS desgaste DECIMAL(10,2)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS modelo VARCHAR(120)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS numero_serie VARCHAR(120)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS ubicacion VARCHAR(120)`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS ultimo_mantenimiento VARCHAR(20) DEFAULT '—'`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS notas TEXT`);
    await client.query(`ALTER TABLE anilox ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE`);

    await client.query(`
        CREATE TABLE IF NOT EXISTS anilox_uso (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
            anilox_id UUID NOT NULL REFERENCES anilox(id) ON DELETE CASCADE,
            orden_produccion_id UUID,
            orden_codigo TEXT,
            producto_id UUID,
            producto_codigo TEXT,
            motivo_version TEXT,
            fecha_uso DATE,
            maquina_id UUID,
            maquina_nombre TEXT,
            estacion_numero INTEGER,
            metros_producidos DECIMAL(18,4),
            metros_procesados DECIMAL(18,4),
            cantidad_producida DECIMAL(18,4),
            observaciones TEXT,
            creado_por BIGINT,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_anilox_uso_anilox ON anilox_uso(anilox_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_anilox_uso_tenant ON anilox_uso(tenant_id, creado_en)`);

    const tenantId = await getPrimaryTenantId(client);
    await client.query(
        `INSERT INTO material (
            tenant_id, codigo, nombre, ancho_mm, largo_mm, costo_x_lamina, tipo_proforma,
            compatible_convencional, compatible_digital, activo
         ) VALUES
            ($1, 'PL-CYREL-3040', 'Sello DuPont Cyrel 1000 30 x 40 in', 762, 1016, 50, 'Sellos', true, false, true),
            ($1, 'PL-CYREL-4260', 'Sello DuPont Cyrel 1000 42 x 60 in', 1066.8, 1524, 95, 'Sellos', true, false, true)
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
            codigo: 'SELLOS',
            nombre: 'Sellos',
            categoria: 'sellos',
            descripcion: 'Grabado o exposicion de sellos',
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

    const selloCount = await client.query(
        `SELECT COUNT(*)::int AS total FROM sello WHERE tenant_id = $1`,
        [tenantId]
    );

    if (selloCount.rows[0].total === 0) {
        const sellosDemo = [
            { codigo: 'PL-2026-0001', descripcion: 'Sello empaque flexible caja plegadiza cereal 500g, 4 tintas', cliente: 'Empaques del Valle S.A.', producto: 'Caja Cereal FrutiMax 500g', trabajo: 'OT-1145 Impresión Cajas FrutiMax', orden: 'OC-3321', cotizacion: 'COT-2201', tipo: 'Fotopolímero Digital', marca: 'DuPont', modelo: 'Cyrel DPR', proveedor: 'Flexo Insumos CR', ancho_mm: 1067, alto_mm: 762, espesor_mm: 1.70, espesor_in: '.067"', costo: 185.0, estado: 'En uso', usos: 12, vida_util: 40, ubicacion: 'Estante A-3', responsable: 'J. Salas', fecha_creacion: '2025-11-02', fecha_ultimo_uso: '2026-07-14', troquel_ref: 'TRQ-0456 · Caja plegadiza 500g', notas: 'Registrar recubrimiento anti-adherente cada 15 tirajes.' },
            { codigo: 'PL-2026-0002', descripcion: 'Sello etiqueta autoadhesiva sleeve, 2 tintas + barniz', cliente: 'Lácteos Monteverde', producto: 'Etiqueta Yogurt Griego 150g', trabajo: 'OT-1150 Etiquetas Línea Griego', orden: 'OC-3327', cotizacion: 'COT-2209', tipo: 'Sello Sleeve', marca: 'MacDermid', modelo: 'ITP60', proveedor: 'MacDermid Centroamérica', ancho_mm: 520, alto_mm: 340, espesor_mm: 1.14, espesor_in: '.045"', costo: 92.5, estado: 'Disponible', usos: 4, vida_util: 35, ubicacion: 'Estante B-1', responsable: 'M. Rojas', fecha_creacion: '2026-01-14', fecha_ultimo_uso: '2026-05-02', troquel_ref: 'TRQ-0512 · Sleeve 150g', notas: '' },
            { codigo: 'PL-2026-0003', descripcion: 'Sello bolsa café molido 340g, 6 tintas alta definición', cliente: 'Café Volcán Export', producto: 'Bolsa Café Molido 340g', trabajo: 'OT-1132 Bolsas Café Reserva', orden: 'OC-3298', cotizacion: 'COT-2154', tipo: 'Fotopolímero Digital', marca: 'Asahi Photoproducts', modelo: 'AWP DEW', proveedor: 'Flexo Insumos CR', ancho_mm: 1200, alto_mm: 900, espesor_mm: 2.84, espesor_in: '.112"', costo: 245.0, estado: 'Dañada', usos: 28, vida_util: 30, ubicacion: 'Estante A-1', responsable: 'J. Salas', fecha_creacion: '2025-08-19', fecha_ultimo_uso: '2026-06-30', troquel_ref: 'TRQ-0388 · Bolsa doypack 340g', notas: 'Corte superficial en zona de arrastre, evaluar reposición.' },
            { codigo: 'PL-2026-0004', descripcion: 'Sello caja display promocional, 3 tintas', cliente: 'Snacks La Cosecha', producto: 'Display Papas Artesanales', trabajo: 'OT-1160 Display Punto de Venta', orden: 'OC-3340', cotizacion: 'COT-2233', tipo: 'Fotopolímero Analógico', marca: 'Flint Group', modelo: 'nyloflex FTF', proveedor: 'Grupo Gráfico Andino', ancho_mm: 900, alto_mm: 600, espesor_mm: 1.70, espesor_in: '.067"', costo: 138.0, estado: 'En reparación', usos: 19, vida_util: 35, ubicacion: 'Taller de mantenimiento', responsable: 'M. Rojas', fecha_creacion: '2025-12-05', fecha_ultimo_uso: '2026-06-11', troquel_ref: 'TRQ-0470 · Display piso', notas: 'Pendiente reemplazo de cinta base.' },
            { codigo: 'PL-2026-0005', descripcion: 'Sello frasco etiqueta farmacéutica, 2 tintas + código', cliente: 'Farmacéutica BioSalud', producto: 'Etiqueta Jarabe BioTos 120ml', trabajo: 'OT-1170 Etiquetas Lote BioTos', orden: 'OC-3355', cotizacion: 'COT-2260', tipo: 'Fotopolímero Digital', marca: 'DuPont', modelo: 'Cyrel EASY', proveedor: 'Flexo Insumos CR', ancho_mm: 400, alto_mm: 260, espesor_mm: 1.14, espesor_in: '.045"', costo: 76.0, estado: 'Reservada', usos: 0, vida_util: 40, ubicacion: 'Estante B-4', responsable: 'J. Salas', fecha_creacion: '2026-07-02', fecha_ultimo_uso: '—', troquel_ref: 'TRQ-0540 · Etiqueta frasco 120ml', notas: 'Reservada para arranque de producción el 22/07.' },
            { codigo: 'PL-2026-0006', descripcion: 'Sello etiqueta botella agua 600ml, 1 tinta', cliente: 'Aguas Puras del Cerro', producto: 'Etiqueta Botella 600ml', trabajo: 'OT-1120 Etiquetas Línea Estándar', orden: 'OC-3270', cotizacion: 'COT-2098', tipo: 'Sello Sólida', marca: 'Toyobo', modelo: 'Cosmolight QH', proveedor: 'Preprensa Digital S.A.', ancho_mm: 300, alto_mm: 180, espesor_mm: 1.14, espesor_in: '.045"', costo: 48.0, estado: 'Descartada', usos: 62, vida_util: 50, ubicacion: 'Baja de inventario', responsable: 'M. Rojas', fecha_creacion: '2025-03-22', fecha_ultimo_uso: '2026-04-18', troquel_ref: 'TRQ-0290 · Etiqueta cilíndrica 600ml', notas: 'Vida útil superada, sustituida por PL-2026-0009.' },
            { codigo: 'PL-2026-0007', descripcion: 'Sello bolsa pan artesanal 400g, 2 tintas', cliente: 'Panificadora San José', producto: 'Bolsa Pan Artesanal 400g', trabajo: 'OT-1155 Bolsas Línea Artesanal', orden: 'OC-3332', cotizacion: 'COT-2219', tipo: 'Fotopolímero Analógico', marca: 'MacDermid', modelo: 'LUX FAH', proveedor: 'MacDermid Centroamérica', ancho_mm: 700, alto_mm: 500, espesor_mm: 1.70, espesor_in: '.067"', costo: 110.0, estado: 'Disponible', usos: 7, vida_util: 35, ubicacion: 'Estante A-2', responsable: 'J. Salas', fecha_creacion: '2026-02-27', fecha_ultimo_uso: '2026-06-20', troquel_ref: 'TRQ-0498 · Bolsa fuelle 400g', notas: '' },
            { codigo: 'PL-2026-0008', descripcion: 'Sello caja distribución tropical 1kg, 5 tintas', cliente: 'Distribuidora Tropical', producto: 'Caja Frutas Selectas 1kg', trabajo: 'OT-1140 Cajas Exportación', orden: 'OC-3315', cotizacion: 'COT-2190', tipo: 'Fotopolímero Digital', marca: 'Asahi Photoproducts', modelo: 'AWP DEW', proveedor: 'Grupo Gráfico Andino', ancho_mm: 1300, alto_mm: 950, espesor_mm: 2.84, espesor_in: '.112"', costo: 268.0, estado: 'En uso', usos: 15, vida_util: 30, ubicacion: 'Estante A-4', responsable: 'M. Rojas', fecha_creacion: '2025-10-08', fecha_ultimo_uso: '2026-07-16', troquel_ref: 'TRQ-0421 · Caja exportación 1kg', notas: '' },
        ];
        for (const p of sellosDemo) {
            await client.query(
                `INSERT INTO sello (tenant_id, codigo, descripcion, cliente, producto, trabajo, orden, cotizacion, tipo, marca, modelo, proveedor, ancho_mm, alto_mm, espesor_mm, espesor_in, costo, estado, usos, vida_util, ubicacion, responsable, fecha_creacion, fecha_ultimo_uso, troquel_ref, notas, activo)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,true)
                 ON CONFLICT (tenant_id, codigo) DO UPDATE SET actualizado_en = NOW()`,
                [tenantId, p.codigo, p.descripcion, p.cliente, p.producto, p.trabajo, p.orden, p.cotizacion, p.tipo, p.marca, p.modelo, p.proveedor, p.ancho_mm, p.alto_mm, p.espesor_mm, p.espesor_in, p.costo, p.estado, p.usos, p.vida_util, p.ubicacion, p.responsable, p.fecha_creacion, p.fecha_ultimo_uso, p.troquel_ref, p.notas]
            );
        }
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
            goma_cobertura_pct,
            goma_bcm_anilox,
            goma_lineatura_anilox,
            goma_factor_transferencia,
            goma_densidad,
            goma_carga_minima_kg,
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
            activo,
            creado_en AS created_at
         FROM material
         WHERE $1 = '%%'
            OR codigo ILIKE $1
            OR nombre ILIKE $1
            OR COALESCE(clasificacion, '') ILIKE $1
            OR COALESCE(familia_proceso, '') ILIKE $1
            OR COALESCE(tipo_proforma, '') ILIKE $1
            OR COALESCE(gramaje_g_m2::text, '') ILIKE $1
            OR COALESCE(ancho_mm::text, '') ILIKE $1
            OR COALESCE(largo_mm::text, '') ILIKE $1
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
            activo,
            creado_en AS created_at
         FROM troquel
          WHERE $1 = '%%'
             OR codigo ILIKE $1
             OR COALESCE(descripcion, '') ILIKE $1
             OR COALESCE(estado, '') ILIKE $1
             OR COALESCE(clasificacion, '') ILIKE $1
             OR COALESCE(ancho_mm::text, '') ILIKE $1
             OR COALESCE(largo_mm::text, '') ILIKE $1
             OR COALESCE(desarrollo_cm::text, '') ILIKE $1
             OR COALESCE(cantidad_filas::text, '') ILIKE $1
             OR COALESCE(dientes::text, '') ILIKE $1
             OR COALESCE(repeticiones::text, '') ILIKE $1
             OR COALESCE(proveedor_troquel, '') ILIKE $1
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
            activo,
            creado_en AS created_at
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
    m.lavado_por_estacion,
    m.volteadora,
    m.volteadora_setup_min,
    m.creado_en AS created_at,
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
            espec_lpi: espec.lpi ?? '',
            espec_velocidad_max_fpm: espec.velocidad_max_fpm ?? '',
            espec_velocidad_min_fpm: espec.velocidad_min_fpm ?? '',
            espec_paso_engranaje_troquel_in: espec.paso_engranaje_troquel_in ?? '',
            espec_paso_engranaje_troquel_mm: espec.paso_engranaje_troquel_mm ?? '',
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

async function listSellos({ q = '', limit = 300 } = {}) {
    const search = `%${String(q || '').trim()}%`;
    const cappedLimit = Math.min(Math.max(Number(limit) || 300, 1), 5000);
    const result = await pgQuery(
        `SELECT
            id::text,
            codigo,
            descripcion,
            cliente,
            producto,
            trabajo,
            orden,
            cotizacion,
            tipo,
            marca,
            modelo,
            proveedor,
            ancho_mm,
            alto_mm,
            espesor_mm,
            espesor_in,
            costo,
            estado,
            usos,
            vida_util,
            ubicacion,
            responsable,
            fecha_creacion,
            fecha_ultimo_uso,
            troquel_ref,
            notas,
            tecnologia,
            dureza_shore,
            relieve_mm,
            lineatura_lpi,
            resolucion_dpi,
            punto_minimo_pct,
            tipo_punto,
            factor_distorsion,
            undercut_mm,
            stickyback_espesor_mm,
            stickyback_tipo,
            stickyback_dureza,
            activo,
            creado_en AS created_at
         FROM sello
         WHERE $1 = '%%'
            OR codigo ILIKE $1
            OR COALESCE(cliente, '') ILIKE $1
            OR COALESCE(trabajo, '') ILIKE $1
            OR COALESCE(descripcion, '') ILIKE $1
            OR COALESCE(tipo, '') ILIKE $1
            OR COALESCE(marca, '') ILIKE $1
            OR COALESCE(estado, '') ILIKE $1
         ORDER BY codigo
         LIMIT $2`,
        [search, cappedLimit]
    );
    return result.rows;
}

async function listCilindros({ q = '', limit = 300 } = {}) {
    const search = `%${String(q || '').trim()}%`;
    const cappedLimit = Math.min(Math.max(Number(limit) || 300, 1), 5000);
    const result = await pgQuery(
        `SELECT
            id::text,
            codigo,
            nombre,
            tipo,
            dientes,
            paso_in,
            paso_mm,
            circunferencia_in,
            desarrollo_mm,
            ancho_util_mm,
            ancho_total_mm,
            fabricante,
            modelo,
            numero_serie,
            estado,
            ubicacion,
            fecha_adquisicion,
            ultimo_mantenimiento,
            notas,
            cantidad_cilindros_regulares,
            cantidad_cilindros_magneticos,
            cantidad_recibida,
            encogimiento,
            elongacion_pct_config_a,
            encogimiento_config_a,
            elongacion_pct_config_b,
            encogimiento_config_b,
            configuracion_a_nombre,
            configuracion_b_nombre,
            sin_existencia,
            activo,
            creado_en AS created_at
         FROM cilindro
         WHERE $1 = '%%'
            OR codigo ILIKE $1
            OR COALESCE(nombre, '') ILIKE $1
            OR COALESCE(tipo, '') ILIKE $1
            OR COALESCE(fabricante, '') ILIKE $1
            OR COALESCE(modelo, '') ILIKE $1
            OR COALESCE(numero_serie, '') ILIKE $1
            OR COALESCE(estado, '') ILIKE $1
         ORDER BY codigo
         LIMIT $2`,
        [search, cappedLimit]
    );
    return result.rows;
}

async function listAnilox({ q = '', limit = 300 } = {}) {
    const search = `%${String(q || '').trim()}%`;
    const cappedLimit = Math.min(Math.max(Number(limit) || 300, 1), 5000);
    const result = await pgQuery(
        `SELECT
            id::text,
            codigo,
            lineatura,
            bcm,
            ancho_util_mm,
            diametro_mm,
            longitud_mm,
            fabricante,
            tipo_recubrimiento,
            estado,
            fecha_compra,
            vida_util,
            desgaste,
            modelo,
            numero_serie,
            ubicacion,
            ultimo_mantenimiento,
            notas,
            activo,
            creado_en AS created_at
         FROM anilox
         WHERE $1 = '%%'
            OR codigo ILIKE $1
            OR COALESCE(fabricante, '') ILIKE $1
            OR COALESCE(modelo, '') ILIKE $1
            OR COALESCE(numero_serie, '') ILIKE $1
            OR COALESCE(tipo_recubrimiento, '') ILIKE $1
            OR COALESCE(estado, '') ILIKE $1
         ORDER BY lineatura, bcm, codigo
         LIMIT $2`,
        [search, cappedLimit]
    );
    return result.rows;
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
            p.activo,
            p.creado_en AS created_at
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
            activo: asBoolean(item.activo ?? item.active, true),
            created_at: item.created_at || ''
        }))
        .filter((item) => {
            if (!search) return true;
            return normalizeText(`${item.codigo} ${item.nombre} ${item.descripcion}`).includes(search);
        })
        .slice(0, cappedLimit);
}

async function listTiposTrabajo({ q = '', limit = 300 } = {}) {
    const search = normalizeText(q);
    const cappedLimit = Math.min(Math.max(Number(limit) || 300, 1), 5000);
    const result = await pgQuery(
        `SELECT id::text, codigo, nombre, descripcion, activo, created_at
           FROM tipotrabajo
          WHERE ($1 = '' OR LOWER(codigo) LIKE '%' || $1 || '%'
                     OR LOWER(nombre) LIKE '%' || $1 || '%'
                     OR LOWER(descripcion) LIKE '%' || $1 || '%')
          ORDER BY codigo
          LIMIT $2`,
        [search, cappedLimit]
    );
    return result.rows.map((row) => ({
        id: row.id,
        codigo: asText(row.codigo),
        nombre: asText(row.nombre),
        descripcion: asText(row.descripcion),
        activo: asBoolean(row.activo, true),
        created_at: row.created_at || ''
    }));
}

async function listInventory(kind, options = {}) {
    if (kind === INVENTORY_TYPES.materiales) return listMaterials(options);
    if (kind === INVENTORY_TYPES.troqueles) return listTroqueles(options);
    if (kind === INVENTORY_TYPES.maquinas) return listMaquinas(options);
    if (kind === INVENTORY_TYPES.procesos) return listProcesos(options);
    if (kind === INVENTORY_TYPES.tiposSalida) return listOutputTypes(options);
    if (kind === INVENTORY_TYPES.tiposTrabajo) return listTiposTrabajo(options);
    if (kind === INVENTORY_TYPES.sellos) return listSellos(options);
    if (kind === INVENTORY_TYPES.cilindros) return listCilindros(options);
    if (kind === INVENTORY_TYPES.anilox) return listAnilox(options);
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
            asBoolean(payload.activo, true),
            asNullableNumber(payload.goma_cobertura_pct),
            asNullableNumber(payload.goma_bcm_anilox),
            asNullableNumber(payload.goma_lineatura_anilox),
            asNullableNumber(payload.goma_factor_transferencia),
            asNullableNumber(payload.goma_densidad),
            asNullableNumber(payload.goma_carga_minima_kg)
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
                        goma_cobertura_pct = $47,
                        goma_bcm_anilox = $48,
                        goma_lineatura_anilox = $49,
                        goma_factor_transferencia = $50,
                        goma_densidad = $51,
                        goma_carga_minima_kg = $52,
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
                compatible_convencional, compatible_digital, tipo_proforma, activo,
                goma_cobertura_pct, goma_bcm_anilox, goma_lineatura_anilox, goma_factor_transferencia, goma_densidad, goma_carga_minima_kg
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52
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
                goma_cobertura_pct = EXCLUDED.goma_cobertura_pct,
                goma_bcm_anilox = EXCLUDED.goma_bcm_anilox,
                goma_lineatura_anilox = EXCLUDED.goma_lineatura_anilox,
                goma_factor_transferencia = EXCLUDED.goma_factor_transferencia,
                goma_densidad = EXCLUDED.goma_densidad,
                goma_carga_minima_kg = EXCLUDED.goma_carga_minima_kg,
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
            asNumber(payload.lavado_por_estacion, 0),
            asBoolean(payload.volteadora, false),
            asNumber(payload.volteadora_setup_min, 30),
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
                        lavado_por_estacion = $40,
                        volteadora = $41,
                        volteadora_setup_min = $42,
                        especificaciones = $43::jsonb,
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
                    sustrato_montaje_merma_cantidad, sustrato_montaje_merma_unidad, sustrato_montaje_merma_base, lavado_por_estacion, volteadora, volteadora_setup_min, especificaciones
                 ) VALUES (
                    $1,$2,$3,$4,$5::proceso_productivo,$6,$7,$11,$12,$13,$14,$15,$16,$8,$9,$10,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43::jsonb
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

async function saveSello(payload) {
    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);
        const values = [
            tenantId,
            asText(payload.codigo),
            asText(payload.descripcion),
            asText(payload.cliente),
            asText(payload.producto),
            asText(payload.trabajo),
            asText(payload.orden),
            asText(payload.cotizacion),
            asText(payload.tipo),
            asText(payload.marca),
            asText(payload.modelo),
            asText(payload.proveedor),
            asNumber(payload.ancho_mm, 0),
            asNumber(payload.alto_mm, 0),
            asNumber(payload.espesor_mm, 0),
            asText(payload.espesor_in),
            asNumber(payload.costo, 0),
            asText(payload.estado || 'Disponible'),
            Math.max(0, Math.round(asNumber(payload.usos, 0))),
            Math.max(0, Math.round(asNumber(payload.vida_util, 40))),
            asText(payload.ubicacion),
            asText(payload.responsable),
            payload.fecha_creacion || null,
            asText(payload.fecha_ultimo_uso || '—'),
            asText(payload.troquel_ref),
            asText(payload.notas),
            asBoolean(payload.activo, true),
            asText(payload.tecnologia),
            payload.dureza_shore === '' || payload.dureza_shore == null ? null : asNumber(payload.dureza_shore, 0),
            payload.relieve_mm === '' || payload.relieve_mm == null ? null : asNumber(payload.relieve_mm, 0),
            payload.lineatura_lpi === '' || payload.lineatura_lpi == null ? null : asNumber(payload.lineatura_lpi, 0),
            payload.resolucion_dpi === '' || payload.resolucion_dpi == null ? null : asNumber(payload.resolucion_dpi, 0),
            payload.punto_minimo_pct === '' || payload.punto_minimo_pct == null ? null : asNumber(payload.punto_minimo_pct, 0),
            asText(payload.tipo_punto),
            payload.factor_distorsion === '' || payload.factor_distorsion == null ? null : asNumber(payload.factor_distorsion, 0),
            payload.undercut_mm === '' || payload.undercut_mm == null ? null : asNumber(payload.undercut_mm, 0),
            payload.stickyback_espesor_mm === '' || payload.stickyback_espesor_mm == null ? null : asNumber(payload.stickyback_espesor_mm, 0),
            asText(payload.stickyback_tipo),
            asText(payload.stickyback_dureza)
        ];

        if (!values[1]) {
            throw new Error('El código de sello es obligatorio.');
        }

        if (payload.id) {
            const result = await client.query(
                `UPDATE sello
                    SET codigo = $2,
                        descripcion = $3,
                        cliente = $4,
                        producto = $5,
                        trabajo = $6,
                        orden = $7,
                        cotizacion = $8,
                        tipo = $9,
                        marca = $10,
                        modelo = $11,
                        proveedor = $12,
                        ancho_mm = $13,
                        alto_mm = $14,
                        espesor_mm = $15,
                        espesor_in = $16,
                        costo = $17,
                        estado = $18,
                        usos = $19,
                        vida_util = $20,
                        ubicacion = $21,
                        responsable = $22,
                        fecha_creacion = $23,
                        fecha_ultimo_uso = $24,
                        troquel_ref = $25,
                        notas = $26,
                        activo = $27,
                        tecnologia = $28,
                        dureza_shore = $29,
                        relieve_mm = $30,
                        lineatura_lpi = $31,
                        resolucion_dpi = $32,
                        punto_minimo_pct = $33,
                        tipo_punto = $34,
                        factor_distorsion = $35,
                        undercut_mm = $36,
                        stickyback_espesor_mm = $37,
                        stickyback_tipo = $38,
                        stickyback_dureza = $39,
                        actualizado_en = NOW()
                  WHERE id = $1::uuid
                  RETURNING id::text`,
                [payload.id, ...values.slice(1)]
            );
            if (!result.rows.length) {
                throw new Error('No se encontró el sello a actualizar.');
            }
            return result.rows[0].id;
        }

        const result = await client.query(
            `INSERT INTO sello (
                tenant_id, codigo, descripcion, cliente, producto, trabajo, orden, cotizacion,
                tipo, marca, modelo, proveedor, ancho_mm, alto_mm, espesor_mm, espesor_in,
                costo, estado, usos, vida_util, ubicacion, responsable,
                fecha_creacion, fecha_ultimo_uso, troquel_ref, notas, activo,
                tecnologia, dureza_shore, relieve_mm, lineatura_lpi, resolucion_dpi,
                punto_minimo_pct, tipo_punto, factor_distorsion, undercut_mm,
                stickyback_espesor_mm, stickyback_tipo, stickyback_dureza
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39
             )
             ON CONFLICT (tenant_id, codigo) DO UPDATE SET
                descripcion = EXCLUDED.descripcion,
                cliente = EXCLUDED.cliente,
                producto = EXCLUDED.producto,
                trabajo = EXCLUDED.trabajo,
                orden = EXCLUDED.orden,
                cotizacion = EXCLUDED.cotizacion,
                tipo = EXCLUDED.tipo,
                marca = EXCLUDED.marca,
                modelo = EXCLUDED.modelo,
                proveedor = EXCLUDED.proveedor,
                ancho_mm = EXCLUDED.ancho_mm,
                alto_mm = EXCLUDED.alto_mm,
                espesor_mm = EXCLUDED.espesor_mm,
                espesor_in = EXCLUDED.espesor_in,
                costo = EXCLUDED.costo,
                estado = EXCLUDED.estado,
                usos = EXCLUDED.usos,
                vida_util = EXCLUDED.vida_util,
                ubicacion = EXCLUDED.ubicacion,
                responsable = EXCLUDED.responsable,
                fecha_creacion = EXCLUDED.fecha_creacion,
                fecha_ultimo_uso = EXCLUDED.fecha_ultimo_uso,
                troquel_ref = EXCLUDED.troquel_ref,
                notas = EXCLUDED.notas,
                activo = EXCLUDED.activo,
                tecnologia = EXCLUDED.tecnologia,
                dureza_shore = EXCLUDED.dureza_shore,
                relieve_mm = EXCLUDED.relieve_mm,
                lineatura_lpi = EXCLUDED.lineatura_lpi,
                resolucion_dpi = EXCLUDED.resolucion_dpi,
                punto_minimo_pct = EXCLUDED.punto_minimo_pct,
                tipo_punto = EXCLUDED.tipo_punto,
                factor_distorsion = EXCLUDED.factor_distorsion,
                undercut_mm = EXCLUDED.undercut_mm,
                stickyback_espesor_mm = EXCLUDED.stickyback_espesor_mm,
                stickyback_tipo = EXCLUDED.stickyback_tipo,
                stickyback_dureza = EXCLUDED.stickyback_dureza,
                actualizado_en = NOW()
             RETURNING id::text`,
            values
        );
        return result.rows[0].id;
    });
}

async function saveCilindro(payload) {
    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);
        const values = [
            tenantId,
            asText(payload.codigo),
            asText(payload.nombre),
            asText(payload.tipo),
            Math.max(0, Math.round(asNumber(payload.dientes, 0))),
            asNumber(payload.paso_in, 0),
            asNumber(payload.paso_mm, 0),
            asNumber(payload.circunferencia_in, 0),
            asNumber(payload.desarrollo_mm, 0),
            asNumber(payload.ancho_util_mm, 0),
            asNumber(payload.ancho_total_mm, 0),
            asText(payload.fabricante),
            asText(payload.modelo),
            asText(payload.numero_serie),
            asText(payload.estado || 'Disponible'),
            asText(payload.ubicacion),
            payload.fecha_adquisicion || null,
            asText(payload.ultimo_mantenimiento || '—'),
            asText(payload.notas),
            asNumber(payload.cantidad_cilindros_regulares, 0),
            asNumber(payload.cantidad_cilindros_magneticos, 0),
            payload.cantidad_recibida === '' || payload.cantidad_recibida === undefined || payload.cantidad_recibida === null
                ? null
                : asNumber(payload.cantidad_recibida, 0),
            payload.elongacion_pct_config_a === '' || payload.elongacion_pct_config_a === undefined || payload.elongacion_pct_config_a === null
                ? null
                : asNumber(payload.elongacion_pct_config_a, 0),
            payload.encogimiento_config_a === '' || payload.encogimiento_config_a === undefined || payload.encogimiento_config_a === null
                ? null
                : asNumber(payload.encogimiento_config_a, 0),
            payload.elongacion_pct_config_b === '' || payload.elongacion_pct_config_b === undefined || payload.elongacion_pct_config_b === null
                ? null
                : asNumber(payload.elongacion_pct_config_b, 0),
            payload.encogimiento_config_b === '' || payload.encogimiento_config_b === undefined || payload.encogimiento_config_b === null
                ? null
                : asNumber(payload.encogimiento_config_b, 0),
            asText(payload.configuracion_a_nombre),
            asText(payload.configuracion_b_nombre),
            asBoolean(payload.sin_existencia, false),
            asBoolean(payload.activo, true),
            payload.encogimiento === '' || payload.encogimiento === undefined || payload.encogimiento === null
                ? null
                : asNumber(payload.encogimiento, 0)
        ];

        if (!values[1] && !payload.id) {
            values[1] = await generarCodigoCilindro(client, tenantId, values[3], values[4]);
        }
        if (!values[1]) {
            throw new Error('El código de cilindro es obligatorio.');
        }

        if (payload.id) {
            const result = await client.query(
                `UPDATE cilindro
                    SET codigo = $2,
                        nombre = $3,
                        tipo = $4,
                        dientes = $5,
                        paso_in = $6,
                        paso_mm = $7,
                        circunferencia_in = $8,
                        desarrollo_mm = $9,
                        ancho_util_mm = $10,
                        ancho_total_mm = $11,
                        fabricante = $12,
                        modelo = $13,
                        numero_serie = $14,
                        estado = $15,
                        ubicacion = $16,
                        fecha_adquisicion = $17,
                        ultimo_mantenimiento = $18,
                        notas = $19,
                        cantidad_cilindros_regulares = $20,
                        cantidad_cilindros_magneticos = $21,
                        cantidad_recibida = $22,
                        elongacion_pct_config_a = $23,
                        encogimiento_config_a = $24,
                        elongacion_pct_config_b = $25,
                        encogimiento_config_b = $26,
                        configuracion_a_nombre = $27,
                        configuracion_b_nombre = $28,
                        sin_existencia = $29,
                        activo = $30,
                        encogimiento = $31,
                        actualizado_en = NOW()
                  WHERE id = $1::uuid
                  RETURNING id::text`,
                [payload.id, ...values.slice(1)]
            );
            if (!result.rows.length) {
                throw new Error('No se encontró el cilindro a actualizar.');
            }
            return result.rows[0].id;
        }

        const result = await client.query(
            `INSERT INTO cilindro (
                tenant_id, codigo, nombre, tipo, dientes, paso_in, paso_mm, circunferencia_in,
                desarrollo_mm, ancho_util_mm, ancho_total_mm, fabricante, modelo, numero_serie,
                estado, ubicacion, fecha_adquisicion, ultimo_mantenimiento, notas,
                cantidad_cilindros_regulares, cantidad_cilindros_magneticos, cantidad_recibida,
                elongacion_pct_config_a, encogimiento_config_a, elongacion_pct_config_b, encogimiento_config_b,
                configuracion_a_nombre, configuracion_b_nombre, sin_existencia, activo, encogimiento
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
                $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
             )
             ON CONFLICT (tenant_id, codigo) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                tipo = EXCLUDED.tipo,
                dientes = EXCLUDED.dientes,
                paso_in = EXCLUDED.paso_in,
                paso_mm = EXCLUDED.paso_mm,
                circunferencia_in = EXCLUDED.circunferencia_in,
                desarrollo_mm = EXCLUDED.desarrollo_mm,
                ancho_util_mm = EXCLUDED.ancho_util_mm,
                ancho_total_mm = EXCLUDED.ancho_total_mm,
                fabricante = EXCLUDED.fabricante,
                modelo = EXCLUDED.modelo,
                numero_serie = EXCLUDED.numero_serie,
                estado = EXCLUDED.estado,
                ubicacion = EXCLUDED.ubicacion,
                fecha_adquisicion = EXCLUDED.fecha_adquisicion,
                ultimo_mantenimiento = EXCLUDED.ultimo_mantenimiento,
                notas = EXCLUDED.notas,
                cantidad_cilindros_regulares = EXCLUDED.cantidad_cilindros_regulares,
                cantidad_cilindros_magneticos = EXCLUDED.cantidad_cilindros_magneticos,
                cantidad_recibida = EXCLUDED.cantidad_recibida,
                elongacion_pct_config_a = EXCLUDED.elongacion_pct_config_a,
                encogimiento_config_a = EXCLUDED.encogimiento_config_a,
                elongacion_pct_config_b = EXCLUDED.elongacion_pct_config_b,
                encogimiento_config_b = EXCLUDED.encogimiento_config_b,
                configuracion_a_nombre = EXCLUDED.configuracion_a_nombre,
                configuracion_b_nombre = EXCLUDED.configuracion_b_nombre,
                sin_existencia = EXCLUDED.sin_existencia,
                activo = EXCLUDED.activo,
                encogimiento = EXCLUDED.encogimiento,
                actualizado_en = NOW()
             RETURNING id::text`,
            values
        );
        return result.rows[0].id;
    });
}

async function saveAnilox(payload) {
    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);
        const lineatura = Math.max(0, Math.round(asNumber(payload.lineatura, 0)));
        const bcm = asNumber(payload.bcm, 0);
        const values = [
            tenantId,
            asText(payload.codigo),
            lineatura,
            bcm,
            asNullableNumber(payload.ancho_util_mm),
            asNullableNumber(payload.diametro_mm),
            asNullableNumber(payload.longitud_mm),
            asText(payload.fabricante),
            asText(payload.tipo_recubrimiento),
            asText(payload.estado || 'Disponible'),
            payload.fecha_compra || null,
            asNullableNumber(payload.vida_util),
            asNullableNumber(payload.desgaste),
            asText(payload.modelo),
            asText(payload.numero_serie),
            asText(payload.ubicacion),
            asText(payload.ultimo_mantenimiento || '—'),
            asText(payload.notas),
            asBoolean(payload.activo, true)
        ];

        if (!values[1] && !payload.id) {
            values[1] = await generarCodigoAnilox(client, tenantId, lineatura, bcm);
        }
        if (!values[1]) {
            throw new Error('El código del anilox es obligatorio.');
        }

        if (payload.id) {
            const result = await client.query(
                `UPDATE anilox
                    SET codigo = $2,
                        lineatura = $3,
                        bcm = $4,
                        ancho_util_mm = $5,
                        diametro_mm = $6,
                        longitud_mm = $7,
                        fabricante = $8,
                        tipo_recubrimiento = $9,
                        estado = $10,
                        fecha_compra = $11,
                        vida_util = $12,
                        desgaste = $13,
                        modelo = $14,
                        numero_serie = $15,
                        ubicacion = $16,
                        ultimo_mantenimiento = $17,
                        notas = $18,
                        activo = $19,
                        actualizado_en = NOW()
                  WHERE id = $1::uuid
                  RETURNING id::text`,
                [payload.id, ...values.slice(1)]
            );
            if (!result.rows.length) {
                throw new Error('No se encontró el anilox a actualizar.');
            }
            return result.rows[0].id;
        }

        const result = await client.query(
            `INSERT INTO anilox (
                tenant_id, codigo, lineatura, bcm, ancho_util_mm, diametro_mm, longitud_mm,
                fabricante, tipo_recubrimiento, estado, fecha_compra, vida_util, desgaste,
                modelo, numero_serie, ubicacion, ultimo_mantenimiento, notas, activo
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
             )
             ON CONFLICT (tenant_id, codigo) DO UPDATE SET
                lineatura = EXCLUDED.lineatura,
                bcm = EXCLUDED.bcm,
                ancho_util_mm = EXCLUDED.ancho_util_mm,
                diametro_mm = EXCLUDED.diametro_mm,
                longitud_mm = EXCLUDED.longitud_mm,
                fabricante = EXCLUDED.fabricante,
                tipo_recubrimiento = EXCLUDED.tipo_recubrimiento,
                estado = EXCLUDED.estado,
                fecha_compra = EXCLUDED.fecha_compra,
                vida_util = EXCLUDED.vida_util,
                desgaste = EXCLUDED.desgaste,
                modelo = EXCLUDED.modelo,
                numero_serie = EXCLUDED.numero_serie,
                ubicacion = EXCLUDED.ubicacion,
                ultimo_mantenimiento = EXCLUDED.ultimo_mantenimiento,
                notas = EXCLUDED.notas,
                activo = EXCLUDED.activo,
                actualizado_en = NOW()
             RETURNING id::text`,
            values
        );
        return result.rows[0].id;
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
    if (kind === INVENTORY_TYPES.tiposTrabajo) return saveTipotrabajo(payload);
    if (kind === INVENTORY_TYPES.sellos) return saveSello(payload);
    if (kind === INVENTORY_TYPES.cilindros) return saveCilindro(payload);
    if (kind === INVENTORY_TYPES.anilox) return saveAnilox(payload);
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

async function deleteSello(id) {
    const selloId = asText(id);
    if (!selloId) {
        throw new Error('Debes indicar el sello a eliminar.');
    }
    return withTransaction(async (client) => {
        const result = await client.query(
            `DELETE FROM sello
              WHERE id = $1::uuid
              RETURNING id::text, codigo`,
            [selloId]
        );
        if (!result.rows.length) {
            throw new Error('No se encontró el sello a eliminar.');
        }
        return result.rows[0];
    });
}

async function deleteCilindro(id) {
    const cilindroId = asText(id);
    if (!cilindroId) {
        throw new Error('Debes indicar el cilindro a eliminar.');
    }
    return withTransaction(async (client) => {
        const result = await client.query(
            `DELETE FROM cilindro
              WHERE id = $1::uuid
              RETURNING id::text, codigo`,
            [cilindroId]
        );
        if (!result.rows.length) {
            throw new Error('No se encontró el cilindro a eliminar.');
        }
        return result.rows[0];
    });
}

async function deleteAnilox(id) {
    const aniloxId = asText(id);
    if (!aniloxId) {
        throw new Error('Debes indicar el anilox a eliminar.');
    }
    return withTransaction(async (client) => {
        const result = await client.query(
            `DELETE FROM anilox
              WHERE id = $1::uuid
              RETURNING id::text, codigo`,
            [aniloxId]
        );
        if (!result.rows.length) {
            throw new Error('No se encontró el anilox a eliminar.');
        }
        return result.rows[0];
    });
}

async function listAniloxUso(aniloxId) {
    const id = asText(aniloxId);
    if (!id) throw new Error('Debes indicar el anilox.');
    const result = await pgQuery(
        `SELECT
            u.id::text,
            u.anilox_id::text,
            u.orden_produccion_id::text,
            u.orden_codigo,
            u.producto_id::text,
            u.producto_codigo,
            u.motivo_version,
            u.fecha_uso,
            u.maquina_id::text,
            u.maquina_nombre,
            u.estacion_numero,
            u.metros_producidos,
            u.metros_procesados,
            u.cantidad_producida,
            u.observaciones,
            u.creado_por,
            u.creado_en
         FROM anilox_uso u
         WHERE u.anilox_id = $1::uuid
         ORDER BY COALESCE(u.fecha_uso, u.creado_en::date) DESC, u.creado_en DESC`,
        [id]
    );
    const totales = await pgQuery(
        `SELECT
            COUNT(*)::int AS trabajos,
            COALESCE(SUM(metros_producidos), 0) AS metros_producidos,
            COALESCE(SUM(metros_procesados), 0) AS metros_procesados,
            COALESCE(SUM(cantidad_producida), 0) AS cantidad_producida,
            MAX(COALESCE(fecha_uso, creado_en::date)) AS ultimo_uso
         FROM anilox_uso
         WHERE anilox_id = $1::uuid`,
        [id]
    );
    return { items: result.rows, totales: totales.rows[0] };
}

async function saveAniloxUso(aniloxId, payload = {}) {
    const id = asText(aniloxId);
    if (!id) throw new Error('Debes indicar el anilox.');
    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);
        const existe = await client.query(`SELECT id FROM anilox WHERE id = $1::uuid AND tenant_id = $2`, [id, tenantId]);
        if (!existe.rows.length) throw new Error('No se encontró el anilox.');
        const result = await client.query(
            `INSERT INTO anilox_uso (
                tenant_id, anilox_id, orden_produccion_id, orden_codigo, producto_id, producto_codigo,
                motivo_version, fecha_uso, maquina_id, maquina_nombre, estacion_numero,
                metros_producidos, metros_procesados, cantidad_producida,
                observaciones, creado_por
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
             RETURNING id::text`,
            [
                tenantId, id,
                payload.orden_produccion_id || null,
                asText(payload.orden_codigo) || null,
                payload.producto_id || null,
                asText(payload.producto_codigo) || null,
                asText(payload.motivo_version) || null,
                payload.fecha_uso || null,
                payload.maquina_id || null,
                asText(payload.maquina_nombre) || null,
                payload.estacion_numero === '' || payload.estacion_numero === undefined || payload.estacion_numero === null
                    ? null : Math.round(asNumber(payload.estacion_numero, 0)),
                asNullableNumber(payload.metros_producidos),
                asNullableNumber(payload.metros_procesados),
                asNullableNumber(payload.cantidad_producida),
                asText(payload.observaciones) || null,
                payload.creado_por || null
            ]
        );
        return result.rows[0];
    });
}

async function listCilindroUso(cilindroId) {
    const id = asText(cilindroId);
    if (!id) throw new Error('Debes indicar el cilindro.');
    const result = await pgQuery(
        `SELECT
            u.id::text,
            u.cilindro_id::text,
            u.orden_produccion_id::text,
            u.orden_codigo,
            u.producto_id::text,
            u.producto_codigo,
            u.motivo_version,
            u.fecha_uso,
            u.maquina_id::text,
            u.maquina_nombre,
            u.estacion_numero,
            u.desarrollo_utilizado_in,
            u.metros_producidos,
            u.metros_procesados,
            u.cantidad_producida,
            u.observaciones,
            u.creado_por,
            u.creado_en
         FROM cilindro_uso u
         WHERE u.cilindro_id = $1::uuid
         ORDER BY COALESCE(u.fecha_uso, u.creado_en::date) DESC, u.creado_en DESC`,
        [id]
    );
    const totales = await pgQuery(
        `SELECT
            COUNT(*)::int AS trabajos,
            COALESCE(SUM(metros_producidos), 0) AS metros_producidos,
            COALESCE(SUM(metros_procesados), 0) AS metros_procesados,
            COALESCE(SUM(cantidad_producida), 0) AS cantidad_producida,
            MAX(COALESCE(fecha_uso, creado_en::date)) AS ultimo_uso
         FROM cilindro_uso
         WHERE cilindro_id = $1::uuid`,
        [id]
    );
    return { items: result.rows, totales: totales.rows[0] };
}

async function saveCilindroUso(cilindroId, payload = {}) {
    const id = asText(cilindroId);
    if (!id) throw new Error('Debes indicar el cilindro.');
    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);
        const existe = await client.query(`SELECT id FROM cilindro WHERE id = $1::uuid AND tenant_id = $2`, [id, tenantId]);
        if (!existe.rows.length) throw new Error('No se encontró el cilindro.');
        const result = await client.query(
            `INSERT INTO cilindro_uso (
                tenant_id, cilindro_id, orden_produccion_id, orden_codigo, producto_id, producto_codigo,
                motivo_version, fecha_uso, maquina_id, maquina_nombre, estacion_numero,
                desarrollo_utilizado_in, metros_producidos, metros_procesados, cantidad_producida,
                observaciones, creado_por
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
             RETURNING id::text`,
            [
                tenantId, id,
                payload.orden_produccion_id || null,
                asText(payload.orden_codigo) || null,
                payload.producto_id || null,
                asText(payload.producto_codigo) || null,
                asText(payload.motivo_version) || null,
                payload.fecha_uso || null,
                payload.maquina_id || null,
                asText(payload.maquina_nombre) || null,
                payload.estacion_numero === '' || payload.estacion_numero === undefined || payload.estacion_numero === null
                    ? null : Math.round(asNumber(payload.estacion_numero, 0)),
                asNullableNumber(payload.desarrollo_utilizado_in),
                asNullableNumber(payload.metros_producidos),
                asNullableNumber(payload.metros_procesados),
                asNullableNumber(payload.cantidad_producida),
                asText(payload.observaciones) || null,
                payload.creado_por || null
            ]
        );
        return result.rows[0];
    });
}

async function deleteInventory(kind, id) {
    if (kind === INVENTORY_TYPES.materiales) return deleteMaterial(id);
    if (kind === INVENTORY_TYPES.maquinas) return deleteMachine(id);
    if (kind === INVENTORY_TYPES.sellos) return deleteSello(id);
    if (kind === INVENTORY_TYPES.cilindros) return deleteCilindro(id);
    if (kind === INVENTORY_TYPES.anilox) return deleteAnilox(id);
    if (kind === INVENTORY_TYPES.tiposTrabajo) return deleteTipotrabajo(id);
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

async function saveTipotrabajo(payload) {
    const codigo = asText(payload.codigo).trim();
    const nombre = asText(payload.nombre || codigo).trim();
    if (!codigo || !nombre) {
        throw new Error('Código y nombre son obligatorios en tipo de trabajo.');
    }

    return withTransaction(async (client) => {
        const tenantId = await getPrimaryTenantId(client);

        if (payload.id) {
            const result = await client.query(
                `UPDATE tipotrabajo
                    SET codigo = $3,
                        nombre = $4,
                        descripcion = $5,
                        activo = $6,
                        actualizado_en = NOW()
                  WHERE id = $1::uuid
                    AND tenant_id = $2
                  RETURNING id::text`,
                [payload.id, tenantId, codigo, nombre, asText(payload.descripcion), asBoolean(payload.activo, true)]
            );
            if (!result.rows.length) {
                throw new Error('No se encontró el tipo de trabajo a actualizar.');
            }
            return result.rows[0].id;
        }

        const result = await client.query(
            `INSERT INTO tipotrabajo (tenant_id, codigo, nombre, descripcion, activo)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (tenant_id, codigo) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                descripcion = EXCLUDED.descripcion,
                activo = EXCLUDED.activo,
                actualizado_en = NOW()
             RETURNING id::text`,
            [tenantId, codigo, nombre, asText(payload.descripcion), asBoolean(payload.activo, true)]
        );
        return result.rows[0].id;
    });
}

async function deleteTipotrabajo(id) {
    const trabajoId = asText(id);
    if (!trabajoId) {
        throw new Error('Debes indicar el tipo de trabajo a eliminar.');
    }
    return withTransaction(async (client) => {
        const result = await client.query(
            `DELETE FROM tipotrabajo
              WHERE id = $1::uuid
              RETURNING id::text, codigo, nombre`,
            [trabajoId]
        );
        if (!result.rows.length) {
            throw new Error('No se encontró el tipo de trabajo a eliminar.');
        }
        return result.rows[0];
    });
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
        costo_x_lamina: asNullableNumber(pickValue(index, 'costo_x_lamina', 'costo lamina', 'costo por lamina', 'precio lamina', 'costo lamina sello')),
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

function mapSelloRow(row) {
    const index = buildRowIndex(row);
    return {
        codigo: asText(pickValue(index, 'codigo', 'codigo sello', 'id sello')),
        descripcion: asText(pickValue(index, 'descripcion', 'descripcion sello')),
        cliente: asText(pickValue(index, 'cliente', 'cliente')),
        producto: asText(pickValue(index, 'producto')),
        trabajo: asText(pickValue(index, 'trabajo', 'ot', 'orden trabajo')),
        orden: asText(pickValue(index, 'orden', 'oc', 'orden compra')),
        cotizacion: asText(pickValue(index, 'cotizacion', 'cotización', 'cot')),
        tipo: asText(pickValue(index, 'tipo', 'tipo sello')),
        marca: asText(pickValue(index, 'marca')),
        modelo: asText(pickValue(index, 'modelo')),
        proveedor: asText(pickValue(index, 'proveedor')),
        ancho_mm: asNumber(pickValue(index, 'ancho_mm', 'ancho mm', 'ancho')),
        alto_mm: asNumber(pickValue(index, 'alto_mm', 'alto mm', 'alto')),
        espesor_mm: asNumber(pickValue(index, 'espesor_mm', 'espesor mm')),
        espesor_in: asText(pickValue(index, 'espesor_in', 'espesor in')),
        costo: asNumber(pickValue(index, 'costo', 'costo usd')),
        estado: asText(pickValue(index, 'estado', 'estado sello'), 'Disponible'),
        usos: Math.max(0, Math.round(asNumber(pickValue(index, 'usos', 'usos sello'), 0))),
        vida_util: Math.max(0, Math.round(asNumber(pickValue(index, 'vida_util', 'vida util'), 40))),
        ubicacion: asText(pickValue(index, 'ubicacion', 'ubicacion sello')),
        responsable: asText(pickValue(index, 'responsable')),
        fecha_creacion: asText(pickValue(index, 'fecha_creacion', 'fecha creacion')),
        fecha_ultimo_uso: asText(pickValue(index, 'fecha_ultimo_uso', 'fecha ultimo uso'), '—'),
        troquel_ref: asText(pickValue(index, 'troquel_ref', 'troquel referencia', 'troquel ref')),
        notas: asText(pickValue(index, 'notas', 'observaciones', 'notas sello')),
        tecnologia: asText(pickValue(index, 'tecnologia', 'tecnología')),
        dureza_shore: asNumber(pickValue(index, 'dureza_shore', 'dureza shore', 'shore')),
        relieve_mm: asNumber(pickValue(index, 'relieve_mm', 'relieve mm', 'relieve')),
        lineatura_lpi: asNumber(pickValue(index, 'lineatura_lpi', 'lineatura lpi', 'lineatura')),
        resolucion_dpi: asNumber(pickValue(index, 'resolucion_dpi', 'resolucion dpi', 'resolucion')),
        punto_minimo_pct: asNumber(pickValue(index, 'punto_minimo_pct', 'punto minimo', 'minimo punto', 'min dot')),
        tipo_punto: asText(pickValue(index, 'tipo_punto', 'tipo punto', 'forma punto', 'dot shape')),
        factor_distorsion: asNumber(pickValue(index, 'factor_distorsion', 'factor distorsion', 'distorsion', 'k factor')),
        undercut_mm: asNumber(pickValue(index, 'undercut_mm', 'undercut mm', 'undercut')),
        stickyback_espesor_mm: asNumber(pickValue(index, 'stickyback_espesor_mm', 'stickyback espesor', 'espesor stickyback')),
        stickyback_tipo: asText(pickValue(index, 'stickyback_tipo', 'stickyback tipo', 'tipo stickyback')),
        stickyback_dureza: asText(pickValue(index, 'stickyback_dureza', 'stickyback dureza', 'dureza stickyback', 'cushion')),
        activo: asBoolean(pickValue(index, 'activo'), true)
    };
}

function prefijoCilindro(tipo) {
    const t = normalizeText(tipo);
    if (t.startsWith('magnet') || t === 'm') return 'M';
    return 'R';
}

function formatoCodigoCilindro(prefijo, dientes, correlativo) {
    return `CIL-${prefijo}-${dientes}-${String(correlativo).padStart(3, '0')}`;
}

async function generarCodigoCilindro(client, tenantId, tipo, dientes) {
    const prefijo = prefijoCilindro(tipo);
    const dientesInt = Math.max(0, Math.round(asNumber(dientes, 0)));
    if (!dientesInt) {
        throw new Error('No se puede generar el código del cilindro sin la cantidad de dientes.');
    }
    const { rows } = await client.query(
        `SELECT codigo FROM cilindro WHERE tenant_id = $1 AND codigo LIKE $2`,
        [tenantId, `CIL-${prefijo}-${dientesInt}-%`]
    );
    let max = 0;
    for (const r of rows) {
        const m = /-(\d{3,})$/.exec(String(r.codigo || ''));
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return formatoCodigoCilindro(prefijo, dientesInt, max + 1);
}

function formatoBcmCodigo(bcm) {
    const n = asNumber(bcm, 0);
    const s = (Math.round(n * 1000) / 1000).toString();
    return s.replace('.', ',');
}

function formatoCodigoAnilox(lineatura, bcm, correlativo) {
    return `ANI-${lineatura}-${formatoBcmCodigo(bcm)}-${String(correlativo).padStart(2, '0')}`;
}

async function generarCodigoAnilox(client, tenantId, lineatura, bcm) {
    const lineaturaInt = Math.max(0, Math.round(asNumber(lineatura, 0)));
    if (!lineaturaInt) {
        throw new Error('No se puede generar el código del anilox sin la lineatura.');
    }
    const bcmStr = formatoBcmCodigo(bcm);
    const { rows } = await client.query(
        `SELECT codigo FROM anilox WHERE tenant_id = $1 AND codigo LIKE $2`,
        [tenantId, `ANI-${lineaturaInt}-${bcmStr}-%`]
    );
    let max = 0;
    for (const r of rows) {
        const m = /-(\d{2,})$/.exec(String(r.codigo || ''));
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return formatoCodigoAnilox(lineaturaInt, bcm, max + 1);
}

function mapAniloxRow(row) {
    const index = buildRowIndex(row);
    return {
        codigo: asText(pickValue(index, 'codigo', 'id', 'codigo anilox')),
        lineatura: Math.max(0, Math.round(asNumber(pickValue(index, 'lineatura', 'lineatura', 'lpi'), 0))),
        bcm: asNumber(pickValue(index, 'bcm', 'volumen', 'volumen bcm'), 0),
        ancho_util_mm: asNullableNumber(pickValue(index, 'ancho_util_mm', 'ancho util', 'ancho util mm', 'usable width')),
        diametro_mm: asNullableNumber(pickValue(index, 'diametro_mm', 'diametro', 'diameter')),
        longitud_mm: asNullableNumber(pickValue(index, 'longitud_mm', 'longitud', 'largo', 'length')),
        fabricante: asText(pickValue(index, 'fabricante', 'manufacturer')),
        tipo_recubrimiento: asText(pickValue(index, 'tipo_recubrimiento', 'tipo de recubrimiento', 'recubrimiento', 'coating')),
        estado: asText(pickValue(index, 'estado', 'status'), 'Disponible'),
        fecha_compra: asText(pickValue(index, 'fecha_compra', 'fecha de compra', 'purchase date')),
        vida_util: asNullableNumber(pickValue(index, 'vida_util', 'vida util', 'vida util anilox', 'life')),
        desgaste: asNullableNumber(pickValue(index, 'desgaste', 'wear')),
        modelo: asText(pickValue(index, 'modelo', 'model')),
        numero_serie: asText(pickValue(index, 'numero_serie', 'numero de serie', 'serial number')),
        ubicacion: asText(pickValue(index, 'ubicacion', 'location')),
        ultimo_mantenimiento: asText(pickValue(index, 'ultimo_mantenimiento', 'ultimo mantenimiento', 'last maintenance'), '—'),
        notas: asText(pickValue(index, 'notas', 'observaciones', 'notes')),
        activo: asBoolean(pickValue(index, 'activo'), true)
    };
}

// Valor de encogimiento fuera del rango físico razonable (mm) => en la fuente
// perdió el separador decimal (familia 123 dientes: 380635 -> 380.635).
function corregirEncogimientoImportado(value) {
    if (value === null || typeof value === 'undefined' || value === '') {
        return { valor: null, corregido: false, original: null };
    }
    const original = value;
    let num = asNumber(value, null);
    if (num === null) return { valor: null, corregido: false, original };
    let corregido = false;
    while (num >= 100000) {
        num = num / 1000;
        corregido = true;
    }
    return { valor: num, corregido, original };
}

function elongacionImportada(value) {
    if (value === null || typeof value === 'undefined' || value === '') return null;
    return asNumber(String(value).replace('%', ''), null);
}

function mapCilindroRow(row) {
    const index = buildRowIndex(row);
    const dientes = Math.max(0, Math.round(asNumber(pickValue(index, 'dientes', 'numero de dientes', 'teeth'), 0)));
    const encA = corregirEncogimientoImportado(pickValue(index, 'encogimiento_1', 'encogimiento_config_a', 'encogimiento a'));
    const encB = corregirEncogimientoImportado(pickValue(index, 'encogimiento_2', 'encogimiento_config_b', 'encogimiento b'));
    const avisos = [];
    if (encA.corregido) avisos.push(`ENCOGIMIENTO config A en la fuente venía sin separador decimal (${encA.original}); normalizado a ${encA.valor}.`);
    if (encB.corregido) avisos.push(`ENCOGIMIENTO config B en la fuente venía sin separador decimal (${encB.original}); normalizado a ${encB.valor}.`);
    const notasFuente = asText(pickValue(index, 'notas', 'observaciones', 'notes'));
    return {
        codigo: asText(pickValue(index, 'codigo', 'codigo cilindro', 'id')),
        nombre: asText(pickValue(index, 'nombre')),
        tipo: asText(pickValue(index, 'tipo', 'tipo de cilindro', 'tipo cilindro')),
        dientes,
        paso_in: asNullableNumber(pickValue(index, 'paso_in', 'paso', 'pitch')),
        paso_mm: asNullableNumber(pickValue(index, 'paso_mm', 'paso mm')),
        circunferencia_in: asNullableNumber(pickValue(index, 'circunferencia_in', 'circunferencia', 'circumference', 'pulgadas')),
        desarrollo_mm: asNullableNumber(pickValue(index, 'desarrollo_mm', 'desarrollo', 'repeat', 'mm')),
        ancho_util_mm: asNullableNumber(pickValue(index, 'ancho_util_mm', 'ancho util', 'usable width')),
        ancho_total_mm: asNullableNumber(pickValue(index, 'ancho_total_mm', 'ancho total', 'total width')),
        fabricante: asText(pickValue(index, 'fabricante', 'manufacturer')),
        modelo: asText(pickValue(index, 'modelo', 'model')),
        numero_serie: asText(pickValue(index, 'numero_serie', 'numero de serie', 'serial number')),
        estado: asText(pickValue(index, 'estado', 'status'), 'Disponible'),
        ubicacion: asText(pickValue(index, 'ubicacion', 'location')),
        fecha_adquisicion: asText(pickValue(index, 'fecha_adquisicion', 'fecha de adquisicion', 'acquisition date')),
        ultimo_mantenimiento: asText(pickValue(index, 'ultimo_mantenimiento', 'ultimo mantenimiento', 'last maintenance'), '—'),
        notas: [notasFuente, ...avisos].filter(Boolean).join(' '),
        encogimiento: asNullableNumber(pickValue(index, 'encogimiento', 'encogimiento suministrado', 'encogimiento base')),
        cantidad_cilindros_regulares: asNumber(pickValue(index, 'cantidad_cilindros_regulares', 'cantidad cilindros regulares', 'cantidad regulares'), 0),
        cantidad_cilindros_magneticos: asNumber(pickValue(index, 'cantidad_cilindros_magneticos', 'cantidad cilindros magneticos', 'cantidad magneticos'), 0),
        cantidad_recibida: asNullableNumber(pickValue(index, 'cantidad_recibida', 'cantidad recibida')),
        elongacion_pct_config_a: elongacionImportada(pickValue(index, 'elongacion_pct_config_a', 'elongacion config a', '% elongacion a', '% elongacion')),
        encogimiento_config_a: encA.valor,
        elongacion_pct_config_b: elongacionImportada(pickValue(index, 'elongacion_pct_config_b', 'elongacion config b', '% elongacion b', '% elongacion_1')),
        encogimiento_config_b: encB.valor,
        configuracion_a_nombre: asText(pickValue(index, 'configuracion_a_nombre', 'configuracion a')),
        configuracion_b_nombre: asText(pickValue(index, 'configuracion_b_nombre', 'configuracion b')),
        sin_existencia: asBoolean(pickValue(index, 'sin_existencia', 'no se solicito'), false),
        activo: asBoolean(pickValue(index, 'activo'), true),
        _avisos: avisos
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

    if (kind === INVENTORY_TYPES.sellos) {
        let imported = 0;
        for (const row of rows) {
            const payload = mapSelloRow(row);
            if (!payload.codigo) continue;
            await saveSello(payload);
            imported += 1;
        }
        return { imported };
    }

    if (kind === INVENTORY_TYPES.cilindros) {
        let imported = 0;
        const warnings = [];
        const secuencia = new Map();

        // Primera pasada: por familia (cantidad de dientes) recolectar el valor
        // conocido de cada dato técnico común, para rellenar celdas vacías de una
        // unidad con el de sus hermanas de familia (no con cero).
        const FAMILIA_CAMPOS = ['circunferencia_in', 'desarrollo_mm', 'paso_in', 'paso_mm', 'ancho_util_mm', 'ancho_total_mm',
            'encogimiento', 'encogimiento_config_a', 'encogimiento_config_b', 'elongacion_pct_config_a', 'elongacion_pct_config_b'];
        const familia = new Map();
        const parsed = rows.map(mapCilindroRow);
        for (const p of parsed) {
            if (!p.dientes) continue;
            const ref = familia.get(p.dientes) || {};
            for (const campo of FAMILIA_CAMPOS) {
                if ((ref[campo] === undefined || ref[campo] === null) && p[campo] !== null && p[campo] !== undefined && p[campo] !== '') {
                    ref[campo] = p[campo];
                }
            }
            familia.set(p.dientes, ref);
        }

        for (const payload of parsed) {
            if (!payload.dientes) {
                if (payload.codigo || payload.tipo) {
                    warnings.push(`Fila omitida (sin cantidad de dientes): ${payload.codigo || payload.tipo || 'desconocida'}.`);
                }
                continue;
            }
            const prefijo = prefijoCilindro(payload.tipo);
            const clave = `${prefijo}-${payload.dientes}`;
            const correlativo = (secuencia.get(clave) || 0) + 1;
            secuencia.set(clave, correlativo);
            const codigoOriginal = payload.codigo;
            payload.codigo = formatoCodigoCilindro(prefijo, payload.dientes, correlativo);
            if (codigoOriginal && codigoOriginal !== payload.codigo) {
                warnings.push(`Código regenerado: "${codigoOriginal}" -> "${payload.codigo}" (regla TIPO+DIENTES+correlativo).`);
            }

            // Rellenar celdas vacías de esta unidad con el dato de su familia (misma
            // cantidad de dientes). Si la familia entera no lo trae, queda vacío/NULL.
            const ref = familia.get(payload.dientes) || {};
            for (const campo of FAMILIA_CAMPOS) {
                if ((payload[campo] === null || payload[campo] === undefined || payload[campo] === '')
                    && ref[campo] !== undefined && ref[campo] !== null) {
                    payload[campo] = ref[campo];
                    warnings.push(`${payload.codigo}: "${campo}" sin valor en la fila; se toma el de la familia de ${payload.dientes} dientes (${ref[campo]}).`);
                }
            }
            if (payload.encogimiento === null || payload.encogimiento === undefined) {
                warnings.push(`${payload.codigo}: ENCOGIMIENTO base sin valor en la fuente ni en la familia; se guarda vacío.`);
            }
            (payload._avisos || []).forEach((a) => warnings.push(`${payload.codigo}: ${a}`));
            await saveCilindro(payload);
            imported += 1;
        }
        return { imported, warnings };
    }

    if (kind === INVENTORY_TYPES.anilox) {
        let imported = 0;
        const warnings = [];
        const secuencia = new Map();
        const parsed = rows.map(mapAniloxRow);
        for (const payload of parsed) {
            if (!payload.lineatura || !payload.bcm) {
                if (payload.codigo) {
                    warnings.push(`Fila omitida (sin lineatura o BCM): ${payload.codigo}.`);
                }
                continue;
            }
            const bcmStr = formatoBcmCodigo(payload.bcm);
            const clave = `${payload.lineatura}-${bcmStr}`;
            const correlativo = (secuencia.get(clave) || 0) + 1;
            secuencia.set(clave, correlativo);
            const codigoOriginal = payload.codigo;
            payload.codigo = formatoCodigoAnilox(payload.lineatura, payload.bcm, correlativo);
            if (codigoOriginal && codigoOriginal !== payload.codigo) {
                warnings.push(`Código regenerado: "${codigoOriginal}" -> "${payload.codigo}" (regla LINEATURA+BCM+correlativo).`);
            }
            await saveAnilox(payload);
            imported += 1;
        }
        return { imported, warnings };
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

    if (kind === INVENTORY_TYPES.sellos) {
        return items.map((item) => ({
            id: item.id,
            codigo: item.codigo,
            descripcion: item.descripcion,
            cliente: item.cliente,
            producto: item.producto,
            trabajo: item.trabajo,
            orden: item.orden,
            cotizacion: item.cotizacion,
            tipo: item.tipo,
            marca: item.marca,
            modelo: item.modelo,
            proveedor: item.proveedor,
            ancho_mm: item.ancho_mm,
            alto_mm: item.alto_mm,
            espesor_mm: item.espesor_mm,
            espesor_in: item.espesor_in,
            costo: item.costo,
            estado: item.estado,
            usos: item.usos,
            vida_util: item.vida_util,
            ubicacion: item.ubicacion,
            responsable: item.responsable,
            fecha_creacion: item.fecha_creacion,
            fecha_ultimo_uso: item.fecha_ultimo_uso,
            troquel_ref: item.troquel_ref,
            notas: item.notas,
            tecnologia: item.tecnologia,
            dureza_shore: item.dureza_shore,
            relieve_mm: item.relieve_mm,
            lineatura_lpi: item.lineatura_lpi,
            resolucion_dpi: item.resolucion_dpi,
            punto_minimo_pct: item.punto_minimo_pct,
            tipo_punto: item.tipo_punto,
            factor_distorsion: item.factor_distorsion,
            undercut_mm: item.undercut_mm,
            stickyback_espesor_mm: item.stickyback_espesor_mm,
            stickyback_tipo: item.stickyback_tipo,
            stickyback_dureza: item.stickyback_dureza,
            activo: item.activo
        }));
    }

    if (kind === INVENTORY_TYPES.cilindros) {
        return items.map((item) => ({
            id: item.id,
            codigo: item.codigo,
            nombre: item.nombre,
            tipo: item.tipo,
            dientes: item.dientes,
            paso_in: item.paso_in,
            paso_mm: item.paso_mm,
            circunferencia_in: item.circunferencia_in,
            desarrollo_mm: item.desarrollo_mm,
            ancho_util_mm: item.ancho_util_mm,
            ancho_total_mm: item.ancho_total_mm,
            fabricante: item.fabricante,
            modelo: item.modelo,
            numero_serie: item.numero_serie,
            estado: item.estado,
            ubicacion: item.ubicacion,
            fecha_adquisicion: item.fecha_adquisicion,
            ultimo_mantenimiento: item.ultimo_mantenimiento,
            notas: item.notas,
            cantidad_cilindros_regulares: item.cantidad_cilindros_regulares,
            cantidad_cilindros_magneticos: item.cantidad_cilindros_magneticos,
            cantidad_recibida: item.cantidad_recibida,
            encogimiento: item.encogimiento,
            elongacion_pct_config_a: item.elongacion_pct_config_a,
            encogimiento_config_a: item.encogimiento_config_a,
            elongacion_pct_config_b: item.elongacion_pct_config_b,
            encogimiento_config_b: item.encogimiento_config_b,
            configuracion_a_nombre: item.configuracion_a_nombre,
            configuracion_b_nombre: item.configuracion_b_nombre,
            sin_existencia: item.sin_existencia,
            activo: item.activo
        }));
    }

    if (kind === INVENTORY_TYPES.anilox) {
        return items.map((item) => ({
            id: item.id,
            codigo: item.codigo,
            lineatura: item.lineatura,
            bcm: item.bcm,
            ancho_util_mm: item.ancho_util_mm,
            diametro_mm: item.diametro_mm,
            longitud_mm: item.longitud_mm,
            fabricante: item.fabricante,
            tipo_recubrimiento: item.tipo_recubrimiento,
            estado: item.estado,
            fecha_compra: item.fecha_compra,
            vida_util: item.vida_util,
            desgaste: item.desgaste,
            modelo: item.modelo,
            numero_serie: item.numero_serie,
            ubicacion: item.ubicacion,
            ultimo_mantenimiento: item.ultimo_mantenimiento,
            notas: item.notas,
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
    exportInventoryWorkbook,
    listCilindroUso,
    saveCilindroUso,
    listAniloxUso,
    saveAniloxUso
};

