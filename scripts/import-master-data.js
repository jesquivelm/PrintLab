require('dotenv').config();
const path = require('path');
const XLSX = require('xlsx');
const { withTransaction, pool } = require('../db/postgres');

const SOURCE_ROOT = 'C:\\Users\\jesqu\\Desktop\\Archivos de Proyecto ERP';
const TENANT_SUBDOMAIN = 'printlab';
const TENANT_NAME = 'PrintLab';
const ADMIN_EMAIL = 'admin@printlab.local';
const ADMIN_PASSWORD_HASH = 'local-dev-pending';

function normalizeKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .toLowerCase();
}

function slugify(value, fallback = 'registro') {
    const normalized = normalizeKey(value).replace(/\s+/g, '-');
    return normalized || fallback;
}

function sourcePath(fileName) {
    return path.join(SOURCE_ROOT, fileName);
}

function readRows(fileName) {
    const workbook = XLSX.readFile(sourcePath(fileName), { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function buildRowIndex(row) {
    const map = new Map();
    for (const [key, value] of Object.entries(row)) {
        map.set(normalizeKey(key), value);
    }
    return map;
}

function pickValue(index, ...aliases) {
    for (const alias of aliases) {
        const value = index.get(normalizeKey(alias));
        if (value !== '' && value !== null && typeof value !== 'undefined') {
            return value;
        }
    }
    return null;
}

function asText(value) {
    return value === null || typeof value === 'undefined' ? null : String(value).trim() || null;
}

function asBool(value) {
    const normalized = normalizeKey(value);
    if (!normalized) return null;
    return ['si', 'true', '1', 'x', 'yes'].includes(normalized);
}

function asNumber(value) {
    if (value === '' || value === null || typeof value === 'undefined') return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const normalized = String(value)
        .replace(/\s+/g, '')
        .replace(/\.(?=\d{3}(\D|$))/g, '')
        .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function asDate(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function splitName(fullName) {
    const clean = asText(fullName) || 'Sistema';
    const parts = clean.split(/\s+/).filter(Boolean);
    return {
        nombre: parts.shift() || 'Sistema',
        apellidos: parts.join(' ') || 'ERP'
    };
}

function ensureEmail(value, fallbackSeed) {
    const email = asText(value);
    if (email && email.includes('@')) {
        return email.toLowerCase();
    }
    return `${slugify(fallbackSeed, 'usuario')}@impresioneselite.local`;
}

function inchesToMm(value) {
    const numeric = asNumber(value);
    return numeric === null ? null : Number((numeric * 25.4).toFixed(3));
}

function parseMoneda(value) {
    const normalized = normalizeKey(value);
    if (normalized.includes('crc') || normalized.includes('colon')) return 'CRC';
    if (normalized.includes('usd') || normalized.includes('dolar')) return 'USD';
    return 'USD';
}

function parseProcesoEnum(value) {
    const normalized = normalizeKey(value);
    if (normalized.includes('digital') || normalized.includes('hp')) return 'Digital';
    if (normalized.includes('hibrido')) return 'Hibrido';
    return 'Convencional';
}

function parseProcessLower(value) {
    const normalized = normalizeKey(value);
    if (normalized.includes('digital') || normalized.includes('hp')) return 'digital';
    if (normalized.includes('hibrido')) return 'hibrido';
    return 'convencional';
}

function parseTipoEtiquetadoEnum(value) {
    return normalizeKey(value).includes('automatic') ? 'Automatico' : 'Manual';
}

function parseTipoOrdenEnum(value) {
    const normalized = normalizeKey(value);
    if (normalized.includes('repeticion con cambio')) return 'RepeticionCambio';
    if (normalized.includes('repeticion')) return 'Repeticion';
    if (normalized.includes('pruebas')) return 'Pruebas';
    if (normalized.includes('muestras')) return 'Muestras';
    if (normalized.includes('regalias')) return 'Regalias';
    return 'Nuevo';
}

function parseTipoSalidaEnum(value) {
    const text = asText(value);
    if (text === 'D') return 'D';
    if (text === 'A') return 'A';
    return 'Indistinto';
}

async function recordAudit(client, sourceName, sourcePathValue, recordsImported, notes = '') {
    await client.query(
        `INSERT INTO import_audit (source_name, source_path, records_imported, notes)
         VALUES ($1, $2, $3, $4)`,
        [sourceName, sourcePathValue, recordsImported, notes]
    );
}

async function ensureBaseContext(client) {
    const tenantResult = await client.query(
        `INSERT INTO tenant (nombre, subdominio)
         VALUES ($1, $2)
         ON CONFLICT (subdominio) DO UPDATE SET nombre = EXCLUDED.nombre, actualizado_en = NOW()
         RETURNING id`,
        [TENANT_NAME, TENANT_SUBDOMAIN]
    );
    const tenantId = tenantResult.rows[0].id;

    const adminName = splitName('Admin Sistema');
    const adminResult = await client.query(
        `INSERT INTO usuario (
            tenant_id, email, password_hash, nombre, apellidos, rol,
            puede_ajustar_macula, puede_ajustar_costos, puede_modificar_precio_venta, puede_aprobar_cotizacion
         ) VALUES ($1,$2,$3,$4,$5,'admin_tenant',true,true,true,true)
         ON CONFLICT (tenant_id, email) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            apellidos = EXCLUDED.apellidos,
            actualizado_en = NOW()
         RETURNING id`,
        [tenantId, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, adminName.nombre, adminName.apellidos]
    );

    await client.query(`INSERT INTO costo_general (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`, [tenantId]);
    await client.query(`INSERT INTO cotizacion_secuencia (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`, [tenantId]);
    await client.query(`INSERT INTO calculo_flexo_secuencia (tenant_id) VALUES ($1) ON CONFLICT (tenant_id) DO NOTHING`, [tenantId]);

    return { tenantId, adminUserId: adminResult.rows[0].id, sellerCache: new Map() };
}

async function ensureSalesUser(client, context, { email, nombreCompleto, rol = 'vendedor' }) {
    const safeEmail = ensureEmail(email, nombreCompleto);
    if (context.sellerCache.has(safeEmail)) {
        return context.sellerCache.get(safeEmail);
    }

    const parsedName = splitName(nombreCompleto);
    const result = await client.query(
        `INSERT INTO usuario (tenant_id, email, password_hash, nombre, apellidos, rol)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (tenant_id, email) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            apellidos = EXCLUDED.apellidos,
            actualizado_en = NOW()
         RETURNING id`,
        [context.tenantId, safeEmail, ADMIN_PASSWORD_HASH, parsedName.nombre, parsedName.apellidos, rol]
    );

    const userId = result.rows[0].id;
    context.sellerCache.set(safeEmail, userId);
    return userId;
}

async function importBusinessPartners(client, context) {
    const fileName = 'Registros Socios Negocios Desde Mayo 2025.xlsx';
    const rows = readRows(fileName);

    await client.query('TRUNCATE TABLE business_partner_contacts, business_partner_addresses, business_partners RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM socio WHERE tenant_id = $1', [context.tenantId]);

    let imported = 0;
    for (const row of rows) {
        const index = buildRowIndex(row);
        const partnerCode = asText(pickValue(index, 'CARDCODE', 'Codigo', 'ID CLIENTE'));
        const partnerName = asText(pickValue(index, 'CARDNAME', 'Cliente Nombre', 'Nombre', 'Alias | Nombre'));
        if (!partnerCode || !partnerName) {
            continue;
        }

        const email = asText(pickValue(index, 'EmailAddress'));
        const emailFacturacion = [pickValue(index, 'Correo Facturacion 1'), pickValue(index, 'Correo Facturacion 2')]
            .map(asText)
            .filter(Boolean)
            .join(' | ') || null;
        const salespersonName = asText(pickValue(index, 'Vendedor Asignado', 'Vendedor Asignado | Codigo'));
        const isActive = !asBool(pickValue(index, 'Desactivado | Check'));
        const hasCredit = (asNumber(pickValue(index, 'CreditLimit')) || 0) > 0;
        const currency = parseMoneda(pickValue(index, 'Currency'));

        await client.query(
            `INSERT INTO business_partners (
                partner_code, prospect_code, partner_name, salesperson_name, tax_id, email, email_facturacion,
                currency_code, payment_terms, sector, sub_sector, is_tax_exempt, allowed_percentage,
                client_type, creation_date, raw_data
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb
             )
             ON CONFLICT (partner_code) DO UPDATE SET
                prospect_code = EXCLUDED.prospect_code,
                partner_name = EXCLUDED.partner_name,
                salesperson_name = EXCLUDED.salesperson_name,
                tax_id = EXCLUDED.tax_id,
                email = EXCLUDED.email,
                email_facturacion = EXCLUDED.email_facturacion,
                currency_code = EXCLUDED.currency_code,
                payment_terms = EXCLUDED.payment_terms,
                sector = EXCLUDED.sector,
                sub_sector = EXCLUDED.sub_sector,
                is_tax_exempt = EXCLUDED.is_tax_exempt,
                allowed_percentage = EXCLUDED.allowed_percentage,
                client_type = EXCLUDED.client_type,
                creation_date = EXCLUDED.creation_date,
                raw_data = EXCLUDED.raw_data,
                updated_at = NOW()`,
            [
                partnerCode,
                asText(pickValue(index, 'ID PROSPECTO', 'Id Prospecto')),
                partnerName,
                salespersonName,
                asText(pickValue(index, 'FEDERALTAXID', 'IDENTIFICACION EMPRESA', 'CLIENTE ID FISCAL')),
                email,
                emailFacturacion,
                currency,
                asText(pickValue(index, 'GROUPNUM NOMBRE', 'GROUPNUM_NOMBRE', 'CONDICION PAGO')),
                asText(pickValue(index, 'Sector Comercial')),
                asText(pickValue(index, 'Nicho Comercial', 'U SubFamCl', 'U_SubFamCl')),
                asBool(pickValue(index, 'CLIENTE EXCENTO | CHECK')) || false,
                asNumber(pickValue(index, 'MANEJO EXCEDENTES')),
                asText(pickValue(index, 'U TIPOCLIENTE', 'U_TIPOCLIENTE', 'Tipo Socio')),
                asDate(pickValue(index, 'U INIDATE', 'U_INIDATE')),
                JSON.stringify(row)
            ]
        );

        await client.query(
            `INSERT INTO socio (
                tenant_id, codigo, nombre, nombre_comercial, cedula_juridica, condicion_pago, limite_credito,
                tiene_credito_aprobado, pct_descuento, moneda_defecto, codigo_sap, activo
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (tenant_id, codigo) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                nombre_comercial = EXCLUDED.nombre_comercial,
                cedula_juridica = EXCLUDED.cedula_juridica,
                condicion_pago = EXCLUDED.condicion_pago,
                limite_credito = EXCLUDED.limite_credito,
                tiene_credito_aprobado = EXCLUDED.tiene_credito_aprobado,
                pct_descuento = EXCLUDED.pct_descuento,
                moneda_defecto = EXCLUDED.moneda_defecto,
                codigo_sap = EXCLUDED.codigo_sap,
                activo = EXCLUDED.activo,
                actualizado_en = NOW()`,
            [
                context.tenantId,
                partnerCode,
                partnerName,
                asText(pickValue(index, 'Alias | Nombre')),
                asText(pickValue(index, 'FEDERALTAXID', 'IDENTIFICACION EMPRESA')),
                asText(pickValue(index, 'CONDICION PAGO', 'GROUPNUM_NOMBRE')) || 'Contado',
                asNumber(pickValue(index, 'CreditLimit')) || 0,
                hasCredit,
                asNumber(pickValue(index, 'Porcentaje Cotizaciones Cliente', 'RANGO CREDITO')) || 0,
                currency,
                partnerCode,
                isActive
            ]
        );

        imported += 1;
    }

    await recordAudit(client, 'business_partners', sourcePath(fileName), imported, 'Socios cargados a staging y tabla socio.');
}

async function importContacts(client) {
    const fileName = 'Socios Negocios-Contactos.xlsx';
    const rows = readRows(fileName);
    await client.query('TRUNCATE TABLE business_partner_contacts RESTART IDENTITY');

    let imported = 0;
    for (const row of rows) {
        const index = buildRowIndex(row);
        const partnerCode = asText(pickValue(index, 'ID CLIENTE', 'ParentKey'));
        if (!partnerCode) {
            continue;
        }

        await client.query(
            `INSERT INTO business_partner_contacts (
                partner_code, contact_name, first_name, last_name, email, phone, mobile, fax,
                position, is_legal_representative, country, state_province, county, raw_data
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)`,
            [
                partnerCode,
                asText(pickValue(index, 'NOMBRE CONCATENADO', 'NAME')),
                asText(pickValue(index, 'NAME')),
                asText(pickValue(index, 'LASTNAME')),
                asText(pickValue(index, 'E_MAIL')),
                asText(pickValue(index, 'Phone1')),
                asText(pickValue(index, 'MobilePhone')),
                asText(pickValue(index, 'FAX')),
                asText(pickValue(index, 'POSITION')),
                asBool(pickValue(index, 'REPRESENTANTE LEGAR CHECK')) || false,
                asText(pickValue(index, 'ADDRESS')),
                asText(pickValue(index, 'PROVINCIA')),
                asText(pickValue(index, 'CANTON')),
                JSON.stringify(row)
            ]
        );

        imported += 1;
    }

    await recordAudit(client, 'business_partner_contacts', sourcePath(fileName), imported);
}

async function importAddresses(client) {
    const fileName = 'Socios Negocios-Direccion.xlsx';
    const rows = readRows(fileName);
    await client.query('TRUNCATE TABLE business_partner_addresses RESTART IDENTITY');

    let imported = 0;
    for (const row of rows) {
        const index = buildRowIndex(row);
        const partnerCode = asText(pickValue(index, 'ParentKey'));
        if (!partnerCode) {
            continue;
        }

        await client.query(
            `INSERT INTO business_partner_addresses (
                partner_code, address_name, address_type, country, state_province, county, district,
                address_line, zip_code, raw_data
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
            [
                partnerCode,
                asText(pickValue(index, 'AddressName')),
                asText(pickValue(index, 'ADDRESSTYPE')),
                asText(pickValue(index, 'COUNTRY NAME', 'COUNTRY')),
                asText(pickValue(index, 'STATE NAME')),
                asText(pickValue(index, 'COUNTY')),
                asText(pickValue(index, 'BuildingFloorRoom')),
                asText(pickValue(index, 'STREET')),
                asText(pickValue(index, 'TAXCODE')),
                JSON.stringify(row)
            ]
        );

        imported += 1;
    }

    await recordAudit(client, 'business_partner_addresses', sourcePath(fileName), imported);
}

async function importMaterials(client, context) {
    const fileName = 'Inventario Materia Prima.xlsx';
    const rows = readRows(fileName);
    await client.query('TRUNCATE TABLE material, flexo_materials RESTART IDENTITY CASCADE');

    let imported = 0;
    for (const row of rows) {
        const index = buildRowIndex(row);
        const code = asText(pickValue(index, 'Id Material'));
        if (!code) {
            continue;
        }

        const displayName = asText(pickValue(index, 'Descripcion con Medidas', 'Descripcion para Proforma', 'Nombre'));
        const widthInches = asNumber(pickValue(index, 'Dimensiones | Ancho Pulgadas', 'Dimensiones | Ancho', 'Ancho in'));
        const lengthValue = asNumber(pickValue(index, 'Dimensiones | Largo Pulgadas', 'Dimensiones | Largo'));
        const widthMm = widthInches !== null ? inchesToMm(widthInches) : asNumber(pickValue(index, 'Dimensiones | Ancho Centimetros'));

        await client.query(
            `INSERT INTO flexo_materials (
                material_code, material_name, display_name, presentation_type, provider, width_inches,
                length_value, cost_per_kg_usd, cost_per_linear_meter_usd, cost_per_unit_usd,
                active, digital_enabled, conventional_enabled, raw_data
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)`,
            [
                code,
                asText(pickValue(index, 'Nombre', 'Nombre Tecnico', 'Descripcion con Medidas')),
                displayName,
                asText(pickValue(index, 'Tipo Presentacion')),
                asText(pickValue(index, 'Proveedor')),
                widthInches,
                lengthValue,
                asNumber(pickValue(index, 'Precio por KG | Cotizacion | Dol')),
                asNumber(pickValue(index, 'Precio por Metro Lineal | Cotizacion | Dol')),
                asNumber(pickValue(index, 'Precio Unitario | Cotizacion | Dol')),
                asBool(pickValue(index, 'Material Activo | Check')) ?? true,
                asBool(pickValue(index, 'Material Flexo Digital | Check')) ?? true,
                asBool(pickValue(index, 'Material Flexo Conv | Check')) ?? true,
                JSON.stringify(row)
            ]
        );

        await client.query(
            `INSERT INTO material (
                tenant_id, codigo, nombre, ancho_mm, gramaje_g_m2, calibre_micras, costo_x_msi, costo_x_m2,
                costo_x_kg, compatible_convencional, compatible_digital, tipo_proforma, activo
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
            [
                context.tenantId,
                code,
                displayName || asText(pickValue(index, 'Nombre')) || code,
                widthMm || 0,
                asNumber(pickValue(index, 'Gramaje por M2', 'Gramaje')),
                asNumber(pickValue(index, 'Calibre')),
                asNumber(pickValue(index, 'Precio por MSI | Cotizacion | Dol')),
                asNumber(pickValue(index, 'Precio por M2 | Cotizacion | Dol')),
                asNumber(pickValue(index, 'Precio por KG | Cotizacion | Dol')),
                asBool(pickValue(index, 'Material Flexo Conv | Check')) ?? true,
                asBool(pickValue(index, 'Material Flexo Digital | Check')) ?? true,
                asText(pickValue(index, 'Descripcion para Proforma', 'Tipo Presentacion')),
                asBool(pickValue(index, 'Material Activo | Check')) ?? true
            ]
        );

        imported += 1;
    }

    await recordAudit(client, 'materials', sourcePath(fileName), imported, 'Materiales cargados a staging y tabla material.');
}

async function importTroqueles(client, context) {
    const fileName = 'Inventario Troqueles.xlsx';
    const rows = readRows(fileName);
    await client.query('TRUNCATE TABLE troquel, flexo_dies RESTART IDENTITY CASCADE');

    let imported = 0;
    for (const row of rows) {
        const index = buildRowIndex(row);
        const code = asText(pickValue(index, 'Id Troquel'));
        if (!code) {
            continue;
        }

        const widthIn = asNumber(pickValue(index, 'Ancho Decimal'));
        const lengthIn = asNumber(pickValue(index, 'Largo Decimal'));

        await client.query(
            `INSERT INTO flexo_dies (
                die_code, description, category, dimensions, teeth, rows_count, repetitions,
                material_width, status, use_digital, use_conventional, raw_data
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
             ON CONFLICT (die_code) DO UPDATE SET
                description = EXCLUDED.description,
                category = EXCLUDED.category,
                dimensions = EXCLUDED.dimensions,
                teeth = EXCLUDED.teeth,
                rows_count = EXCLUDED.rows_count,
                repetitions = EXCLUDED.repetitions,
                material_width = EXCLUDED.material_width,
                status = EXCLUDED.status,
                use_digital = EXCLUDED.use_digital,
                use_conventional = EXCLUDED.use_conventional,
                raw_data = EXCLUDED.raw_data`,
            [
                code,
                asText(pickValue(index, 'Descripcion Troquel', 'Descripcion Troquel COTIZACIONES')),
                asText(pickValue(index, 'Clasificacion', 'TIPO TROQUEL')),
                asText(pickValue(index, 'Dimensiones Troquel')),
                asNumber(pickValue(index, 'Dientes')),
                asNumber(pickValue(index, 'Filas')) || 1,
                asNumber(pickValue(index, 'Repeticiones')) || 1,
                asNumber(pickValue(index, 'Ancho Material')),
                asText(pickValue(index, 'Estado Troquel')),
                asBool(pickValue(index, 'USO DIGITAL', 'VERICUT')) ?? false,
                asBool(pickValue(index, 'USO CONVENCIONAL')) ?? false,
                JSON.stringify(row)
            ]
        );

        await client.query(
            `INSERT INTO troquel (
                tenant_id, codigo, descripcion, ancho_mm, largo_mm, cantidad_filas, dientes,
                repeticiones, estado, activo
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT (tenant_id, codigo) DO UPDATE SET
                descripcion = EXCLUDED.descripcion,
                ancho_mm = EXCLUDED.ancho_mm,
                largo_mm = EXCLUDED.largo_mm,
                cantidad_filas = EXCLUDED.cantidad_filas,
                dientes = EXCLUDED.dientes,
                repeticiones = EXCLUDED.repeticiones,
                estado = EXCLUDED.estado,
                activo = EXCLUDED.activo`,
            [
                context.tenantId,
                code,
                asText(pickValue(index, 'Descripcion Troquel', 'Descripcion Troquel COTIZACIONES')),
                inchesToMm(widthIn) || 0,
                inchesToMm(lengthIn) || 0,
                asNumber(pickValue(index, 'Filas')) || 1,
                asNumber(pickValue(index, 'Dientes')) || 0,
                asNumber(pickValue(index, 'Repeticiones')) || 1,
                asText(pickValue(index, 'Estado Troquel')) || 'Bueno',
                true
            ]
        );

        imported += 1;
    }

    await recordAudit(client, 'troqueles', sourcePath(fileName), imported, 'Troqueles cargados a staging y tabla troquel.');
}

async function importMachinesFromCalculations(client, context) {
    const fileName = 'Registros Calculos Flexografia Setiembre 2025.xlsx';
    const rows = readRows(fileName);
    await client.query('TRUNCATE TABLE maquina_capacidad, maquina, flexo_machines RESTART IDENTITY CASCADE');

    const machineMap = new Map();
    for (const row of rows) {
        const index = buildRowIndex(row);
        const machineName = asText(pickValue(index, 'DIGITAL | MAQUINA', 'CONV | MAQUINA', 'MAQUINA COTIZADA', 'Maquina Cotizada'));
        if (!machineName || machineMap.has(machineName)) {
            continue;
        }
        machineMap.set(machineName, {
            process: parseProcesoEnum(pickValue(index, 'Proceso Productivo')),
            minuteCost: asNumber(pickValue(index, 'COSTOS | SRI | MINUTO MAQUINA', 'COSTOS | DIGITAL | ABG VERICUT | MINUTO MAQUINA')),
            hourCost: asNumber(pickValue(index, 'COSTOS | SRI | HORA MAQUINA', 'COSTOS | DIGITAL | INDIGO 6000 | HORA MAQUINA')),
            speed: asNumber(pickValue(index, 'COSTOS | CONV | MAQUINA P5 | FACTOR TIRAJE')),
            setup: asNumber(pickValue(index, 'COSTOS | CONV | MAQUINA P5 | FACTOR MONTAJE ESTACION'))
        });
    }

    let imported = 0;
    for (const [machineName, info] of machineMap.entries()) {
        const maquinaResult = await client.query(
            `INSERT INTO maquina (
                tenant_id, nombre, tipo, activa, minuto_hombre, factor_tiraje, factor_montaje_estacion,
                factor_preparacion, macula_default_pies
             ) VALUES ($1,$2,$3,true,$4,$5,$6,$7,100)
             RETURNING id`,
            [context.tenantId, machineName, info.process, info.minuteCost || 0, info.speed || 0, info.setup || 0, info.setup || 10]
        );

        await client.query(
            `INSERT INTO maquina_capacidad (
                tenant_id, maquina_id, clasificacion, proceso, subproceso, unidad_trabajo,
                tiempo_preparacion_general, tiempo_por_estacion, velocidad_produccion,
                costo_hora_maquina, costo_hora_operario, activa
             ) VALUES ($1,$2,$3,$4,'Produccion','pies',$5,$6,$7,$8,$9,true)`,
            [
                context.tenantId,
                maquinaResult.rows[0].id,
                normalizeKey(machineName).includes('hp') ? 'impresion' : 'produccion',
                info.process,
                info.setup || 0,
                info.setup || 0,
                info.speed || 0,
                info.hourCost || 0,
                0
            ]
        );

        await client.query(
            `INSERT INTO flexo_machines (
                machine_key, machine_name, process, category, setup_per_station_minutes,
                production_speed, hourly_machine_cost, raw_data
             ) VALUES ($1,$2,$3,'impresion',$4,$5,$6,$7::jsonb)`,
            [slugify(machineName), machineName, info.process, info.setup, info.speed, info.hourCost, JSON.stringify(info)]
        );

        imported += 1;
    }

    await recordAudit(client, 'machines', sourcePath(fileName), imported, 'Maquinas derivadas de calculos por ausencia de catalogo maestro dedicado.');
}

async function loadLookupMaps(client, context) {
    const socioRows = await client.query('SELECT id, codigo FROM socio WHERE tenant_id = $1', [context.tenantId]);
    const materialRows = await client.query('SELECT id, codigo FROM material WHERE tenant_id = $1', [context.tenantId]);
    const troquelRows = await client.query('SELECT id, codigo FROM troquel WHERE tenant_id = $1', [context.tenantId]);
    const maquinaRows = await client.query('SELECT id, nombre FROM maquina WHERE tenant_id = $1', [context.tenantId]);

    return {
        socios: new Map(socioRows.rows.map((row) => [row.codigo, row.id])),
        materiales: new Map(materialRows.rows.map((row) => [row.codigo, row.id])),
        troqueles: new Map(troquelRows.rows.map((row) => [row.codigo, row.id])),
        maquinas: new Map(maquinaRows.rows.map((row) => [row.nombre, row.id]))
    };
}

async function importQuotes(client, context, maps) {
    const fileName = 'Registros Cotizaciones Setiembre 2025.xlsx';
    const rows = readRows(fileName);
    await client.query('TRUNCATE TABLE quote_lines, quotes RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM cotizacion WHERE tenant_id = $1', [context.tenantId]);

    let imported = 0;
    for (const row of rows) {
        const index = buildRowIndex(row);
        const quoteCode = asText(pickValue(index, 'ID COTIZACION'));
        if (!quoteCode) {
            continue;
        }

        const customerCode = asText(pickValue(index, 'ID CLIENTE'));
        const salespersonName = asText(pickValue(index, 'VENDEDOR', 'VENDEDOR | USUARIO')) || 'Sistema';
        const salespersonEmail = asText(pickValue(index, 'VENDEDOR | EMAIL'));
        const vendedorId = await ensureSalesUser(client, context, {
            email: salespersonEmail,
            nombreCompleto: salespersonName
        });

        await client.query(
            `INSERT INTO quotes (
                quote_code, customer_code, customer_name, contact_name, email, salesperson_name,
                phone, status, created_on, due_on, raw_data
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
            [
                quoteCode,
                customerCode,
                asText(pickValue(index, 'CLIENTE NOMBRE')),
                asText(pickValue(index, 'CLIENTE | CONTACTO NOMBRE COMPLETO')),
                asText(pickValue(index, 'CLIENTE | CONTACTO EMAIL')),
                salespersonName,
                asText(pickValue(index, 'CLIENTE | CONTACTO TELEFONO')),
                asText(pickValue(index, 'Estado Cotizacion')) || 'Activa',
                asDate(pickValue(index, 'FECHA CREACION DATE', 'FECHA CREACION')),
                asDate(pickValue(index, 'FECHA VENCIMIENTO', 'FECHA CADUCIDAD')),
                JSON.stringify(row)
            ]
        );

        await client.query(
            `INSERT INTO cotizacion (
                id, tenant_id, socio_id, vendedor_id, cotizador_id, tipo, estado, contacto_nombre,
                contacto_apellidos, contacto_email, contacto_telefono, fecha_creacion, fecha_vencimiento,
                opcion_vencimiento, moneda, condicion_pago, tiempo_entrega, titulo_cotizacion, creado_por
             ) VALUES (
                $1,$2,$3,$4,$5,'regular','borrador',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
             )`,
            [
                quoteCode,
                context.tenantId,
                maps.socios.get(customerCode) || null,
                vendedorId,
                context.adminUserId,
                asText(pickValue(index, 'CLIENTE | CONTACTO NOMBRE')),
                asText(pickValue(index, 'CLIENTE | CONTACTO APELLIDO')),
                asText(pickValue(index, 'CLIENTE | CONTACTO EMAIL')),
                asText(pickValue(index, 'CLIENTE | CONTACTO TELEFONO')),
                pickValue(index, 'FECHA CREACION') || new Date(),
                asDate(pickValue(index, 'FECHA VENCIMIENTO', 'FECHA CADUCIDAD')),
                asText(pickValue(index, 'FECHA CADUCIDAD | TEXTO')) || '15 dias',
                parseMoneda(pickValue(index, 'MONEDA')),
                asText(pickValue(index, 'CONDICION PAGO')) || 'Contado',
                asText(pickValue(index, 'TIEMPO ENTREGA')),
                asText(pickValue(index, 'Titulo Cotizacion')) || `Cotizacion ${quoteCode}`,
                context.adminUserId
            ]
        );

        imported += 1;
    }

    await recordAudit(client, 'quotes', sourcePath(fileName), imported, 'Cotizaciones cargadas a quotes y cotizacion.');
}

function buildScaleEntries(index) {
    const scales = [];
    for (let position = 1; position <= 35; position += 1) {
        const quantity = asNumber(pickValue(index, `CANTIDAD PRODUCTOS ${position}`));
        const unitPrice = asNumber(pickValue(index, `PRECIO UNITARIO COSTOS SIN IMPUESTOS ${position}`));
        const thousandPrice = asNumber(pickValue(index, `PRECIO MILLAR COSTOS SIN IMPUESTOS ${position}`));
        if (!quantity || !unitPrice) {
            continue;
        }
        const subtotal = Number((quantity * unitPrice).toFixed(4));
        const taxes = Number((subtotal * 0.13).toFixed(4));
        scales.push({
            position,
            quantity,
            unitPrice,
            thousandPrice,
            subtotal,
            taxes,
            total: Number((subtotal + taxes).toFixed(4))
        });
    }
    return scales;
}

async function importCalculations(client, context, maps) {
    const fileName = 'Registros Calculos Flexografia Setiembre 2025.xlsx';
    const rows = readRows(fileName);

    await client.query('TRUNCATE TABLE flexo_calculations RESTART IDENTITY CASCADE');
    await client.query('DELETE FROM cantidad_calculo_flexo WHERE tenant_id = $1', [context.tenantId]);
    await client.query('DELETE FROM calculo_flexo WHERE tenant_id = $1', [context.tenantId]);

    let imported = 0;
    let scalesImported = 0;

    for (const row of rows) {
        const index = buildRowIndex(row);
        const quoteCode = asText(pickValue(index, 'ID COTIZACION'));
        const lineCode = asText(pickValue(index, 'ID LINEA'));
        if (!quoteCode || !lineCode) {
            continue;
        }

        const processEnum = parseProcesoEnum(pickValue(index, 'Proceso Productivo'));
        const processLower = parseProcessLower(pickValue(index, 'Proceso Productivo'));
        const machineName = asText(pickValue(index, 'DIGITAL | MAQUINA', 'CONV | MAQUINA', 'MAQUINA COTIZADA'));
        const digitalMaterialCode = asText(pickValue(index, 'Material Digital | Id Material'));
        const convMaterialCode = asText(pickValue(index, 'Material Convencional | Id Material'));
        const troquelCode = asText(pickValue(index, 'GENERAL | TROQUEL | ID', 'DIGITAL | TROQUEL | ID', 'CONV | TROQUEL | ID'));
        const scales = buildScaleEntries(index);
        const mainScale = scales[0];

        await client.query(
            `INSERT INTO cotizacion (
                id, tenant_id, vendedor_id, cotizador_id, tipo, estado, fecha_creacion,
                moneda, condicion_pago, tiempo_entrega, titulo_cotizacion, creado_por
             ) VALUES (
                $1,$2,$3,$4,'regular','borrador',NOW(),'USD','Contado','Pendiente',$5,$6
             )
             ON CONFLICT (id) DO NOTHING`,
            [
                quoteCode,
                context.tenantId,
                context.adminUserId,
                context.adminUserId,
                `Cotizacion ${quoteCode}`,
                context.adminUserId
            ]
        );

        await client.query(
            `INSERT INTO flexo_calculations (
                calculation_code, quote_code, line_code, product_code, customer_code, process_type,
                machine_name, die_code, material_code, quantity, subtotal_cost, total_cost, unit_price, raw_data
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)`,
            [
                lineCode,
                quoteCode,
                lineCode,
                asText(pickValue(index, 'CREAR ORDEN | FRENTE | ID PRODUCTO', 'CODIGO PRODUCTO 1')),
                asText(pickValue(index, 'ID CLIENTE')),
                processLower,
                machineName,
                troquelCode,
                processLower === 'digital' ? digitalMaterialCode : convMaterialCode,
                asNumber(pickValue(index, 'Cantidad Productos')),
                asNumber(pickValue(index, 'GENERAL | 1 | SUBTOTAL COSTOS | DOL | CALCULO', 'GENERAL | Subtotal con SRI')),
                asNumber(pickValue(index, 'PRECIO TOTAL AL FINALIZAR', 'GENERAL | 9 | TOTAL INCLUYE IV | DOL')),
                mainScale ? mainScale.unitPrice : asNumber(pickValue(index, 'PRECIO UNITARIO COSTOS SIN IMPUESTOS 1')),
                JSON.stringify(row)
            ]
        );

        await client.query(
            `INSERT INTO calculo_flexo (
                id, tenant_id, cotizacion_id, nombre_trabajo, tipo_producto, codigo_producto, version_producto,
                proceso_productivo, dim_ancho_mm, dim_largo_mm, cantidad_tintas, cantidad_pantones, cmyk_check,
                tinta_blanca_check, doble_pasada_check, sin_impresion, tipo_orden, cantidad_tipos, cantidad_cambios,
                maquina_digital_id, material_conv_id, material_digital_id, troquel_conv_id, troquel_digital_id,
                troquelado_check, barniz_check, barniz_tipo, laminado_check, laminado_tipo, estampado_check,
                estampado_tipo, estampado_ancho_mm, tipo_etiquetado, tipo_salida, ancho_core_mm, diametro_core,
                etiquetas_x_rollo, cyrel_check, costo_arte_interno, costo_troquel_interno, costo_flete_interno,
                costo_maquila_interno, costo_envio, facturar_en_juegos, linea_opcional_check, creado_por, modificado_por
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
                $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45,$46,$47
             )`,
            [
                lineCode,
                context.tenantId,
                quoteCode,
                asText(pickValue(index, 'NOMBRE TRABAJO')),
                asText(pickValue(index, 'TIPO PRODUCTO')),
                asText(pickValue(index, 'CODIGO PRODUCTO 1', 'CREAR ORDEN | FRENTE | ID PRODUCTO')),
                asText(pickValue(index, 'VERSION PRODUCTO 1')),
                processEnum,
                inchesToMm(pickValue(index, 'DIMENSIONES ETIQUETA | ANCHO')),
                inchesToMm(pickValue(index, 'DIMENSIONES ETIQUETA | LARGO')),
                asNumber(pickValue(index, 'CANTIDAD TINTAS')) || 0,
                asNumber(pickValue(index, 'CANTIDAD PANTONES')) || 0,
                asBool(pickValue(index, 'CMYK | CHECK')) || false,
                asBool(pickValue(index, 'CANTIDAD TINTAS | TINTA BLANCA | CHECK')) || false,
                asBool(pickValue(index, 'CANTIDAD TINTAS | DOBLE PASADA | CHECK')) || false,
                asBool(pickValue(index, 'SIN IMPRESION | CHECK')) || false,
                parseTipoOrdenEnum(pickValue(index, 'TIPO ORDEN')),
                asNumber(pickValue(index, 'CANTIDAD TIPOS')) || 1,
                asNumber(pickValue(index, 'CANTIDAD CAMBIOS')) || 1,
                maps.maquinas.get(machineName) || null,
                maps.materiales.get(convMaterialCode) || null,
                maps.materiales.get(digitalMaterialCode) || null,
                troquelCode && troquelCode !== '# NUEVO' ? maps.troqueles.get(troquelCode) || null : null,
                troquelCode && troquelCode !== '# NUEVO' ? maps.troqueles.get(troquelCode) || null : null,
                Boolean(troquelCode),
                normalizeKey(asText(pickValue(index, 'Resumen Cotización'))).includes('barniz uv'),
                asText(pickValue(index, 'BARNIZ | TIPO')),
                normalizeKey(asText(pickValue(index, 'Resumen Cotización'))).includes('laminado'),
                asText(pickValue(index, 'LAMINADO | TIPO')),
                asBool(pickValue(index, 'ESTAMPADO CHECK')) || false,
                asText(pickValue(index, 'ESTAMPADO TIPO')),
                inchesToMm(pickValue(index, 'ACABADOS | ESTAMPADO | ANCHO ESTAMPADO')),
                parseTipoEtiquetadoEnum(pickValue(index, 'TIPO ETIQUETADO')),
                parseTipoSalidaEnum(pickValue(index, 'TIPO SALIDA')),
                inchesToMm(pickValue(index, 'ANCHO CORE')),
                asText(pickValue(index, 'DIAMETRO CORE')),
                asNumber(pickValue(index, 'CANTIDAD ETIQUETAS X ROLLO')),
                asText(pickValue(index, 'CYREL | CHECK')) || 'No',
                asNumber(pickValue(index, 'ID ADICIONAL | ARTE')) || 0,
                asNumber(pickValue(index, 'ID ADICIONAL | TROQUEL')) || 0,
                asNumber(pickValue(index, 'ID ADICIONAL | FLETE')) || 0,
                asNumber(pickValue(index, 'ID ADICIONAL | MAQUILA')) || 0,
                0,
                false,
                false,
                context.adminUserId,
                context.adminUserId
            ]
        );

        for (const scale of scales) {
            await client.query(
                `INSERT INTO cantidad_calculo_flexo (
                    tenant_id, calculo_id, posicion, cantidad_productos, proceso_productivo, maquina_id,
                    subtotal_costos, subtotal_antes_iv_usd, impuestos_usd, total_con_iv_usd,
                    precio_millar_usd, precio_unitario_usd
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
                [
                    context.tenantId,
                    lineCode,
                    scale.position,
                    scale.quantity,
                    processEnum,
                    maps.maquinas.get(machineName) || null,
                    scale.subtotal,
                    scale.subtotal,
                    scale.taxes,
                    scale.total,
                    scale.thousandPrice,
                    scale.unitPrice
                ]
            );
            scalesImported += 1;
        }

        imported += 1;
    }

    await recordAudit(client, 'calculations', sourcePath(fileName), imported, `Calculos cargados. Escalas importadas: ${scalesImported}.`);
}

async function main() {
    await withTransaction(async (client) => {
        const context = await ensureBaseContext(client);
        await importBusinessPartners(client, context);
        await importContacts(client);
        await importAddresses(client);
        await importMaterials(client, context);
        await importTroqueles(client, context);
        await importMachinesFromCalculations(client, context);
        const maps = await loadLookupMaps(client, context);
        await importQuotes(client, context, maps);
        await importCalculations(client, context, maps);
    });

    console.log('Importacion maestra completada.');
}

main()
    .catch((error) => {
        console.error('Error importando datos:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
