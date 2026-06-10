const http = require('http');
const https = require('https');

const DEFAULT_SAP_CONFIG = Object.freeze({
    mode: 'demo',
    sapHost: '',
    sapPort: 50000,
    sapProtocol: 'https',
    sapUser: 'manager',
    sapPassword: '',
    sapCompany: 'SBO_pruebas',
    autoSyncEnabled: false,
    syncIntervalMinutes: 30,
    allowSelfSigned: true,
    keepDemoEnabled: true,
    lastSyncStatus: 'idle',
    lastSyncMessage: '',
    lastSyncStartedAt: null,
    lastSyncFinishedAt: null
});

const DEMO_DATA_SEED = Object.freeze({
    BusinessPartners: [
        {
            CardCode: 'C001',
            CardName: 'Troqueladoras del Pacifico S.A.',
            CardType: 'C',
            Balance: -125000,
            Currency: 'CRC',
            Phone1: '2222-1111',
            Email: 'compras@tropac.cr',
            ContactPerson: 'Luis Mora',
            PriceListNum: 1,
            BPAddresses: [
                { AddressName: 'Principal', AddressType: 'bo_BillTo', Street: 'Zona Industrial La Uruca, Bodega 4', City: 'San Jose', County: 'San Jose', State: 'SJ', Country: 'CR', ZipCode: '10107' },
                { AddressName: 'Planta', AddressType: 'bo_ShipTo', Street: 'Parque Logistico Belen', City: 'Heredia', County: 'Belen', State: 'HE', Country: 'CR', ZipCode: '40701' }
            ]
        },
        {
            CardCode: 'C002',
            CardName: 'Metalmecanica Herrera Ltda',
            CardType: 'C',
            Balance: 0,
            Currency: 'CRC',
            Phone1: '2233-4455',
            Email: 'admin@herrera.cr',
            ContactPerson: 'Ana Herrera',
            PriceListNum: 1,
            BPAddresses: [
                { AddressName: 'Central', AddressType: 'bo_BillTo', Street: '200 oeste del parque central', City: 'Cartago', County: 'Central', State: 'CA', Country: 'CR', ZipCode: '30101' }
            ]
        },
        {
            CardCode: 'C003',
            CardName: 'Distribuidora CR Tools',
            CardType: 'C',
            Balance: -48200,
            Currency: 'USD',
            Phone1: '4001-2233',
            Email: 'ventas@crtools.com',
            ContactPerson: 'Marco Salas',
            PriceListNum: 2,
            BPAddresses: [
                { AddressName: 'Facturacion', AddressType: 'bo_BillTo', Street: 'Oficentro Escazu, Torre 2', City: 'San Jose', County: 'Escazu', State: 'SJ', Country: 'CR', ZipCode: '10203' },
                { AddressName: 'Despacho', AddressType: 'bo_ShipTo', Street: 'Bodega 18, Coyol', City: 'Alajuela', County: 'Alajuela', State: 'AL', Country: 'CR', ZipCode: '20109' }
            ]
        },
        {
            CardCode: 'S001',
            CardName: 'Proveedor Aceros del Sur',
            CardType: 'S',
            Balance: 320000,
            Currency: 'CRC',
            Phone1: '2266-7788',
            Email: 'facturas@acerosdelsur.com',
            ContactPerson: 'Carlos Vega',
            PriceListNum: 1,
            BPAddresses: [
                { AddressName: 'Principal', AddressType: 'bo_BillTo', Street: 'Ruta 27, km 18', City: 'Santa Ana', County: 'Santa Ana', State: 'SJ', Country: 'CR', ZipCode: '10901' }
            ]
        },
        {
            CardCode: 'S002',
            CardName: 'Importadora Metales MX',
            CardType: 'S',
            Balance: 0,
            Currency: 'USD',
            Phone1: '+52 55 1234 5678',
            Email: 'ventas@metalesmx.com',
            ContactPerson: 'Rosa Perez',
            PriceListNum: 2,
            BPAddresses: [
                { AddressName: 'Monterrey', AddressType: 'bo_BillTo', Street: 'Av. Industria 450', City: 'Monterrey', County: 'Nuevo Leon', State: 'NL', Country: 'MX', ZipCode: '64000' }
            ]
        }
    ],
    Items: [
        { ItemCode: 'TRQ-001', ItemName: 'Troquel circular 50mm acero D2', ItemGroup: 'Troqueles', ItemsGroupCode: 'Troqueles', OnHand: 14, CommitedQty: 2, AvailableQty: 12, AvailableQuantity: 12, Price: 89500, Currency: 'CRC', BuyUnitMsr: 'UN', SalesUnitMsr: 'UN' },
        { ItemCode: 'TRQ-002', ItemName: 'Troquel rectangular 80x40mm', ItemGroup: 'Troqueles', ItemsGroupCode: 'Troqueles', OnHand: 7, CommitedQty: 0, AvailableQty: 7, AvailableQuantity: 7, Price: 112000, Currency: 'CRC', BuyUnitMsr: 'UN', SalesUnitMsr: 'UN' },
        { ItemCode: 'INS-010', ItemName: 'Acero D2 lamina 6mm 1000x500', ItemGroup: 'Insumos', ItemsGroupCode: 'Insumos', OnHand: 42, CommitedQty: 10, AvailableQty: 32, AvailableQuantity: 32, Price: 18400, Currency: 'CRC', BuyUnitMsr: 'M2', SalesUnitMsr: 'M2' },
        { ItemCode: 'INS-020', ItemName: 'Tinta UV negra litro', ItemGroup: 'Insumos', ItemsGroupCode: 'Insumos', OnHand: 55, CommitedQty: 8, AvailableQty: 47, AvailableQuantity: 47, Price: 12500, Currency: 'CRC', BuyUnitMsr: 'LT', SalesUnitMsr: 'LT' },
        { ItemCode: 'INS-021', ItemName: 'Barniz UV brillante litro', ItemGroup: 'Insumos', ItemsGroupCode: 'Insumos', OnHand: 30, CommitedQty: 5, AvailableQty: 25, AvailableQuantity: 25, Price: 9800, Currency: 'CRC', BuyUnitMsr: 'LT', SalesUnitMsr: 'LT' },
        { ItemCode: 'INS-030', ItemName: 'Sustrato couche 250gr 70x100', ItemGroup: 'Insumos', ItemsGroupCode: 'Insumos', OnHand: 800, CommitedQty: 200, AvailableQty: 600, AvailableQuantity: 600, Price: 850, Currency: 'CRC', BuyUnitMsr: 'UN', SalesUnitMsr: 'UN' },
        { ItemCode: 'SRV-001', ItemName: 'Servicio troquelado por hora', ItemGroup: 'Servicios', ItemsGroupCode: 'Servicios', OnHand: 0, CommitedQty: 0, AvailableQty: 0, AvailableQuantity: 0, Price: 12000, Currency: 'CRC', BuyUnitMsr: 'HR', SalesUnitMsr: 'HR' }
    ],
    Orders: [
        {
            DocNum: 10041,
            DocEntry: 1041,
            CardCode: 'C001',
            CardName: 'Troqueladoras del Pacifico S.A.',
            DocDate: '2025-04-01',
            DocDueDate: '2025-04-15',
            DocTotal: 485000,
            Currency: 'CRC',
            DocumentStatus: 'bost_Open',
            Comments: 'OV generada desde ERP',
            DocumentLines: [
                { ItemCode: 'TRQ-001', ItemDescription: 'Troquel circular 50mm', Quantity: 4, Price: 89500, LineTotal: 358000 },
                { ItemCode: 'SRV-001', ItemDescription: 'Servicio troquelado', Quantity: 10.5, Price: 12000, LineTotal: 126000 }
            ]
        }
    ],
    Invoices: [
        { DocNum: 5021, DocEntry: 5021, CardCode: 'C001', CardName: 'Troqueladoras del Pacifico S.A.', DocDate: '2025-03-15', DocTotal: 125000, Currency: 'CRC', DocumentStatus: 'bost_Open' }
    ],
    Warehouses: [
        { WarehouseCode: '01', WarehouseName: 'Bodega Principal San Jose', Location: 'San Jose, CR', Active: 'tYES' },
        { WarehouseCode: '02', WarehouseName: 'Bodega Alajuela - Troqueles', Location: 'Alajuela, CR', Active: 'tYES' }
    ]
});

const SYNC_ENTITY_DEFS = Object.freeze({
    BusinessPartners: {
        pageSize: 200,
        query: '$select=CardCode,CardName,CardType,Balance,Currency,Phone1,Phone2,Email,EmailAddress,ContactPerson,PriceListNum,FederalTaxID,LicTradNum,Cellular,BPAddresses,ContactEmployees&$expand=BPAddresses,ContactEmployees'
    },
    Items: {
        pageSize: 500,
        query: '$select=ItemCode,ItemName,ItemsGroupCode,OnHand,AvailableQuantity,Price,Currency,BuyUnitMsr,SalesUnitMsr'
    },
    Orders: {
        pageSize: 200,
        query: ''
    },
    Invoices: {
        pageSize: 200,
        query: ''
    },
    Warehouses: {
        pageSize: 100,
        query: '$select=WarehouseCode,WarehouseName,Location'
    }
});

const SESSION_STATE = {
    cacheKey: '',
    cookie: '',
    expiresAt: 0
};

let demoState = deepClone(DEMO_DATA_SEED);
let schedulerHandle = null;
let syncInFlight = false;

function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}

function normalizeText(value, fallback = '') {
    const normalized = String(value == null ? '' : value).trim();
    return normalized || fallback;
}

function normalizeMode(value, fallback = 'demo') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'live') return 'live';
    if (normalized === 'demo') return 'demo';
    return fallback;
}

function normalizeBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true;
        if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return fallback;
}

function normalizePositiveInt(value, fallback, min = 1, max = 1440) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.round(numeric)));
}

function mapSapAddressType(value) {
    const normalized = normalizeText(value).toLowerCase();
    if (['b', 'bo_billto', 'billto', 'bill to', 'facturacion', 'facturación'].includes(normalized)) return 'Facturación';
    if (['s', 'bo_shipto', 'shipto', 'ship to', 'envio', 'envío'].includes(normalized)) return 'Envío';
    return 'Facturación';
}

function buildSapAddressLine(address = {}) {
    const parts = [
        normalizeText(address.Street),
        normalizeText(address.Block),
        normalizeText(address.City)
    ].filter(Boolean);
    return parts.join(', ');
}

function extractSapAddresses(row = {}) {
    const addresses = Array.isArray(row.BPAddresses)
        ? row.BPAddresses
        : (Array.isArray(row.Addresses) ? row.Addresses : []);
    return addresses
        .map((address, index) => ({
            addressName: normalizeText(address.AddressName, `SAP-${index + 1}`),
            addressTypeCode: normalizeText(address.AddressType),
            addressTypeLabel: mapSapAddressType(address.AddressType),
            country: normalizeText(address.Country),
            stateProvince: normalizeText(address.State || address.StateProvince),
            county: normalizeText(address.County),
            district: normalizeText(address.Block),
            addressLine: buildSapAddressLine(address),
            zipCode: normalizeText(address.ZipCode),
            payload: address || {}
        }))
        .filter((address) => address.addressName || address.addressLine);
}

function normalizeTimestamp(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeSapConfigRecord(source = {}) {
    const normalizedCompany = normalizeText(
        source.sapCompany != null ? source.sapCompany : source.sap_company,
        ''
    );
    const normalized = {
        mode: normalizeMode(source.mode, DEFAULT_SAP_CONFIG.mode),
        sapHost: normalizeText(source.sapHost || source.sap_host),
        sapPort: normalizePositiveInt(source.sapPort || source.sap_port, DEFAULT_SAP_CONFIG.sapPort, 1, 65535),
        sapProtocol: normalizeText(source.sapProtocol || source.sap_protocol || DEFAULT_SAP_CONFIG.sapProtocol).toLowerCase() === 'http' ? 'http' : 'https',
        sapUser: normalizeText(
            source.sapUser != null ? source.sapUser : source.sap_user,
            ''
        ),
        sapPassword: String(source.sapPassword != null ? source.sapPassword : (source.sap_password != null ? source.sap_password : DEFAULT_SAP_CONFIG.sapPassword)),
        sapCompany: normalizedCompany === 'SBO_DEMO' ? '' : normalizedCompany,
        autoSyncEnabled: normalizeBoolean(source.autoSyncEnabled != null ? source.autoSyncEnabled : source.auto_sync_enabled, DEFAULT_SAP_CONFIG.autoSyncEnabled),
        syncIntervalMinutes: normalizePositiveInt(source.syncIntervalMinutes || source.sync_interval_minutes, DEFAULT_SAP_CONFIG.syncIntervalMinutes, 5, 1440),
        allowSelfSigned: normalizeBoolean(source.allowSelfSigned != null ? source.allowSelfSigned : source.allow_self_signed, DEFAULT_SAP_CONFIG.allowSelfSigned),
        keepDemoEnabled: normalizeBoolean(source.keepDemoEnabled != null ? source.keepDemoEnabled : source.keep_demo_enabled, DEFAULT_SAP_CONFIG.keepDemoEnabled),
        lastSyncStatus: normalizeText(source.lastSyncStatus || source.last_sync_status, DEFAULT_SAP_CONFIG.lastSyncStatus),
        lastSyncMessage: normalizeText(source.lastSyncMessage || source.last_sync_message, DEFAULT_SAP_CONFIG.lastSyncMessage),
        lastSyncStartedAt: normalizeTimestamp(source.lastSyncStartedAt || source.last_sync_started_at),
        lastSyncFinishedAt: normalizeTimestamp(source.lastSyncFinishedAt || source.last_sync_finished_at)
    };
    if (normalized.mode === 'live' && !normalized.keepDemoEnabled && !normalized.sapHost) {
        normalized.mode = 'demo';
    }
    return normalized;
}

function buildPublicConfig(config) {
    const normalized = normalizeSapConfigRecord(config);
    const hasPassword = Boolean(normalized.sapPassword);
    const isLiveReady = Boolean(normalized.sapHost && normalized.sapUser && normalized.sapCompany && hasPassword);
    return {
        ...normalized,
        sapPassword: '',
        hasPassword,
        isLiveReady
    };
}

function resolveOperatingMode(config) {
    const normalized = normalizeSapConfigRecord(config);
    const canUseLive = Boolean(normalized.sapHost && normalized.sapUser && normalized.sapCompany && normalized.sapPassword);
    if (normalized.mode === 'live' && canUseLive) return 'live';
    return 'demo';
}

function getSessionCacheKey(config) {
    return [
        normalizeText(config.sapProtocol),
        normalizeText(config.sapHost),
        normalizeText(config.sapPort),
        normalizeText(config.sapCompany),
        normalizeText(config.sapUser)
    ].join('|');
}

function httpJsonRequest(rawUrl, options = {}) {
    const { method = 'GET', headers = {}, body = null, allowSelfSigned = true } = options;
    return new Promise((resolve, reject) => {
        const target = new URL(rawUrl);
        const transport = target.protocol === 'https:' ? https : http;
        const request = transport.request(target, {
            method,
            headers,
            rejectUnauthorized: target.protocol === 'https:' ? !allowSelfSigned : undefined
        }, (response) => {
            let raw = '';
            response.setEncoding('utf8');
            response.on('data', (chunk) => {
                raw += chunk;
            });
            response.on('end', () => {
                let payload = {};
                if (raw) {
                    try {
                        payload = JSON.parse(raw);
                    } catch (error) {
                        payload = { raw };
                    }
                }
                resolve({
                    statusCode: Number(response.statusCode || 0),
                    headers: response.headers || {},
                    payload
                });
            });
        });
        request.on('error', reject);
        if (body != null) {
            request.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        request.end();
    });
}

function getSapErrorMessage(payload, fallback) {
    return payload?.error?.message?.value || payload?.message || payload?.raw || fallback;
}

async function sapLogin(config) {
    const url = `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Login`;
    const response = await httpJsonRequest(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
            CompanyDB: config.sapCompany,
            UserName: config.sapUser,
            Password: config.sapPassword
        },
        allowSelfSigned: normalizeBoolean(config.allowSelfSigned, true)
    });
    const payload = response.payload || {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(getSapErrorMessage(payload, `SAP Login fallo: ${response.statusCode}`));
    }
    const cookieHeader = response.headers['set-cookie'];
    const cookie = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
    if (!cookie) {
        throw new Error('SAP no devolvio cookie de sesion.');
    }
    SESSION_STATE.cacheKey = getSessionCacheKey(config);
    SESSION_STATE.cookie = cookie;
    SESSION_STATE.expiresAt = Date.now() + (25 * 60 * 1000);
    return cookie;
}

async function getSapCookie(config) {
    const cacheKey = getSessionCacheKey(config);
    if (!SESSION_STATE.cookie || SESSION_STATE.cacheKey !== cacheKey || Date.now() >= SESSION_STATE.expiresAt) {
        return sapLogin(config);
    }
    return SESSION_STATE.cookie;
}

async function sapRequest(config, endpoint, options = {}) {
    const { method = 'GET', body = null, headers = {}, skipAuth = false } = options;
    const url = `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/${endpoint}`;
    const requestHeaders = {
        Accept: 'application/json',
        ...headers
    };
    if (body != null) {
        requestHeaders['Content-Type'] = 'application/json';
    }
    if (!skipAuth) {
        requestHeaders.Cookie = await getSapCookie(config);
    }
    const response = await httpJsonRequest(url, {
        method,
        headers: requestHeaders,
        body,
        allowSelfSigned: normalizeBoolean(config.allowSelfSigned, true)
    });
    const payload = response.payload || {};
    if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(getSapErrorMessage(payload, `SAP ${method} ${endpoint} fallo: ${response.statusCode}`));
    }
    return payload;
}

async function ensureSapSchema(pgQuery) {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_integration_config (
            id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            mode TEXT NOT NULL DEFAULT 'demo',
            sap_host TEXT NOT NULL DEFAULT '',
            sap_port INTEGER NOT NULL DEFAULT 50000,
            sap_protocol TEXT NOT NULL DEFAULT 'https',
            sap_user TEXT NOT NULL DEFAULT 'manager',
            sap_password TEXT NOT NULL DEFAULT '',
            sap_company TEXT NOT NULL DEFAULT 'SBO_pruebas',
            auto_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            sync_interval_minutes INTEGER NOT NULL DEFAULT 30,
            allow_self_signed BOOLEAN NOT NULL DEFAULT TRUE,
            keep_demo_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            last_sync_status TEXT NOT NULL DEFAULT 'idle',
            last_sync_message TEXT NOT NULL DEFAULT '',
            last_sync_started_at TIMESTAMPTZ NULL,
            last_sync_finished_at TIMESTAMPTZ NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        INSERT INTO sap_integration_config (
            id,
            mode,
            sap_host,
            sap_port,
            sap_protocol,
            sap_user,
            sap_password,
            sap_company,
            auto_sync_enabled,
            sync_interval_minutes,
            allow_self_signed,
            keep_demo_enabled
        )
        VALUES (
            1,
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11
        )
        ON CONFLICT (id) DO NOTHING
    `, [
        DEFAULT_SAP_CONFIG.mode,
        DEFAULT_SAP_CONFIG.sapHost,
        DEFAULT_SAP_CONFIG.sapPort,
        DEFAULT_SAP_CONFIG.sapProtocol,
        DEFAULT_SAP_CONFIG.sapUser,
        DEFAULT_SAP_CONFIG.sapPassword,
        DEFAULT_SAP_CONFIG.sapCompany,
        DEFAULT_SAP_CONFIG.autoSyncEnabled,
        DEFAULT_SAP_CONFIG.syncIntervalMinutes,
        DEFAULT_SAP_CONFIG.allowSelfSigned,
        DEFAULT_SAP_CONFIG.keepDemoEnabled
    ]);
    await pgQuery(`
        UPDATE sap_integration_config
           SET sap_company = $1
         WHERE id = 1
           AND (sap_company IS NULL OR sap_company = '' OR sap_company = 'SBO_DEMO')
    `, [DEFAULT_SAP_CONFIG.sapCompany]);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_business_partners (
            card_code TEXT PRIMARY KEY,
            card_name TEXT NOT NULL DEFAULT '',
            card_type TEXT NOT NULL DEFAULT '',
            balance NUMERIC NULL,
            currency TEXT NOT NULL DEFAULT '',
            phone1 TEXT NOT NULL DEFAULT '',
            email TEXT NOT NULL DEFAULT '',
            contact_person TEXT NOT NULL DEFAULT '',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_business_partners_name_idx ON sap_business_partners (card_name)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_items (
            item_code TEXT PRIMARY KEY,
            item_name TEXT NOT NULL DEFAULT '',
            item_group_code TEXT NOT NULL DEFAULT '',
            on_hand NUMERIC NULL,
            available_quantity NUMERIC NULL,
            price NUMERIC NULL,
            currency TEXT NOT NULL DEFAULT '',
            buy_unit_msr TEXT NOT NULL DEFAULT '',
            sales_unit_msr TEXT NOT NULL DEFAULT '',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_items_name_idx ON sap_items (item_name)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_warehouses (
            warehouse_code TEXT PRIMARY KEY,
            warehouse_name TEXT NOT NULL DEFAULT '',
            location TEXT NOT NULL DEFAULT '',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_orders (
            doc_entry BIGINT PRIMARY KEY,
            doc_num TEXT NOT NULL DEFAULT '',
            card_code TEXT NOT NULL DEFAULT '',
            card_name TEXT NOT NULL DEFAULT '',
            doc_date TEXT NOT NULL DEFAULT '',
            doc_due_date TEXT NOT NULL DEFAULT '',
            doc_total NUMERIC NULL,
            currency TEXT NOT NULL DEFAULT '',
            document_status TEXT NOT NULL DEFAULT '',
            comments TEXT NOT NULL DEFAULT '',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_orders_card_code_idx ON sap_orders (card_code)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_invoices (
            doc_entry BIGINT PRIMARY KEY,
            doc_num TEXT NOT NULL DEFAULT '',
            card_code TEXT NOT NULL DEFAULT '',
            card_name TEXT NOT NULL DEFAULT '',
            doc_date TEXT NOT NULL DEFAULT '',
            doc_total NUMERIC NULL,
            currency TEXT NOT NULL DEFAULT '',
            document_status TEXT NOT NULL DEFAULT '',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_sync_log (
            id BIGSERIAL PRIMARY KEY,
            entity_name TEXT NOT NULL,
            mode TEXT NOT NULL,
            status TEXT NOT NULL,
            records_count INTEGER NOT NULL DEFAULT 0,
            message TEXT NOT NULL DEFAULT '',
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMPTZ NULL
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_sync_log_started_at_idx ON sap_sync_log (started_at DESC)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_write_log (
            id BIGSERIAL PRIMARY KEY,
            entity_name TEXT NOT NULL,
            mode TEXT NOT NULL,
            status TEXT NOT NULL,
            request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            error_message TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_write_log_created_at_idx ON sap_write_log (created_at DESC)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_activity_log (
            id BIGSERIAL PRIMARY KEY,
            action_type TEXT NOT NULL,
            entity_name TEXT NOT NULL DEFAULT '',
            module_name TEXT NOT NULL DEFAULT 'sap',
            actor TEXT NOT NULL DEFAULT 'admin',
            mode TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT '',
            internal_method TEXT NOT NULL DEFAULT 'GET',
            internal_url TEXT NOT NULL DEFAULT '',
            service_method TEXT NOT NULL DEFAULT 'GET',
            service_url TEXT NOT NULL DEFAULT '',
            request_vars JSONB NOT NULL DEFAULT '{}'::jsonb,
            response_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
            error_message TEXT NOT NULL DEFAULT '',
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_activity_log_started_at_idx ON sap_activity_log (started_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_activity_log_action_type_idx ON sap_activity_log (action_type)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_activity_log_status_idx ON sap_activity_log (status)`);
    const currentConfig = await loadSapConfig(pgQuery);
    await saveSapConfigSnapshotToAppConfig(pgQuery, currentConfig);
}

async function loadSapConfigFromAppConfig(pgQuery) {
    try {
        const result = await pgQuery(`
            SELECT config_value
              FROM app_config
             WHERE config_key = 'sap'
             LIMIT 1
        `);
        if (!result.rows.length) return null;
        return normalizeSapConfigRecord(result.rows[0].config_value || {});
    } catch (error) {
        console.error('[sap] No fue posible leer app_config.sap:', error.message || error);
        return null;
    }
}

async function saveSapConfigSnapshotToAppConfig(pgQuery, config) {
    await pgQuery(`
        INSERT INTO app_config (config_key, config_value)
        VALUES ('sap', $1::jsonb)
        ON CONFLICT (config_key)
        DO UPDATE SET
            config_value = EXCLUDED.config_value,
            updated_at = NOW()
    `, [JSON.stringify(normalizeSapConfigRecord(config || {}))]);
    return true;
}

async function loadSapConfig(pgQuery) {
    const result = await pgQuery(`SELECT * FROM sap_integration_config WHERE id = 1 LIMIT 1`);
    if (!result.rows.length) {
        return (await loadSapConfigFromAppConfig(pgQuery)) || normalizeSapConfigRecord(DEFAULT_SAP_CONFIG);
    }
    return normalizeSapConfigRecord(result.rows[0]);
}

async function saveSapConfig(pgQuery, input) {
    const previous = await loadSapConfig(pgQuery);
    const wantsToClearPassword = normalizeBoolean(input?.clearPassword, false);
    const nextPassword = Object.prototype.hasOwnProperty.call(input || {}, 'sapPassword')
        ? (String(input.sapPassword || '') || (wantsToClearPassword ? '' : previous.sapPassword))
        : previous.sapPassword;
    const merged = normalizeSapConfigRecord({
        ...previous,
        ...input,
        sapPassword: nextPassword
    });
    await pgQuery(`
        UPDATE sap_integration_config
           SET mode = $1,
               sap_host = $2,
               sap_port = $3,
               sap_protocol = $4,
               sap_user = $5,
               sap_password = $6,
               sap_company = $7,
               auto_sync_enabled = $8,
               sync_interval_minutes = $9,
               allow_self_signed = $10,
               keep_demo_enabled = $11,
               updated_at = NOW()
         WHERE id = 1
    `, [
        merged.mode,
        merged.sapHost,
        merged.sapPort,
        merged.sapProtocol,
        merged.sapUser,
        merged.sapPassword,
        merged.sapCompany,
        merged.autoSyncEnabled,
        merged.syncIntervalMinutes,
        merged.allowSelfSigned,
        merged.keepDemoEnabled
    ]);
    const saved = await loadSapConfig(pgQuery);
    await saveSapConfigSnapshotToAppConfig(pgQuery, saved);
    return saved;
}

async function updateSyncState(pgQuery, patch = {}) {
    const current = await loadSapConfig(pgQuery);
    const next = normalizeSapConfigRecord({
        ...current,
        ...patch,
        sapPassword: current.sapPassword
    });
    await pgQuery(`
        UPDATE sap_integration_config
           SET last_sync_status = $1,
               last_sync_message = $2,
               last_sync_started_at = $3,
               last_sync_finished_at = $4,
               updated_at = NOW()
         WHERE id = 1
    `, [
        next.lastSyncStatus,
        next.lastSyncMessage,
        next.lastSyncStartedAt,
        next.lastSyncFinishedAt
    ]);
    await saveSapConfigSnapshotToAppConfig(pgQuery, next);
}

async function logSyncStart(pgQuery, entityName, mode) {
    const result = await pgQuery(`
        INSERT INTO sap_sync_log (entity_name, mode, status, started_at)
        VALUES ($1, $2, 'running', NOW())
        RETURNING id
    `, [entityName, mode]);
    return Number(result.rows[0]?.id || 0);
}

async function logSyncFinish(pgQuery, logId, status, recordsCount, message) {
    await pgQuery(`
        UPDATE sap_sync_log
           SET status = $2,
               records_count = $3,
               message = $4,
               finished_at = NOW()
         WHERE id = $1
    `, [logId, status, recordsCount, normalizeText(message)]);
}

async function logWrite(pgQuery, entry) {
    await pgQuery(`
        INSERT INTO sap_write_log (
            entity_name,
            mode,
            status,
            request_payload,
            response_payload,
            error_message
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
    `, [
        entry.entityName,
        entry.mode,
        entry.status,
        JSON.stringify(entry.requestPayload || {}),
        JSON.stringify(entry.responsePayload || {}),
        normalizeText(entry.errorMessage)
    ]);
}

function summarizeSapValue(value) {
    if (Array.isArray(value)) {
        return { type: 'array', count: value.length };
    }
    if (value && typeof value === 'object') {
        const summary = {
            type: 'object',
            keys: Object.keys(value).slice(0, 20)
        };
        ['DocEntry', 'DocNum', 'CardCode', 'CardName', 'ItemCode', 'ItemName', 'SessionId', 'source', 'mode', 'ok', 'message'].forEach((key) => {
            if (value[key] != null && summary[key] == null) summary[key] = value[key];
        });
        if (Array.isArray(value.value)) summary.records = value.value.length;
        if (value.entities && typeof value.entities === 'object') summary.entities = value.entities;
        return summary;
    }
    return value;
}

function summarizeSapPayload(payload) {
    if (Array.isArray(payload?.value)) {
        return {
            records: payload.value.length,
            source: payload.source || '',
            preview: payload.value.slice(0, 3).map((entry) => summarizeSapValue(entry))
        };
    }
    return summarizeSapValue(payload || {});
}

async function getSapActor(pgQuery) {
    try {
        const result = await pgQuery(`
            SELECT config_value
              FROM app_config
             WHERE config_key = 'general'
             LIMIT 1
        `);
        const config = result.rows[0]?.config_value || {};
        return normalizeText(config?.session?.currentUser || config?.general?.currentUser, 'admin');
    } catch (error) {
        return 'admin';
    }
}

async function logSapActivity(pgQuery, entry = {}) {
    await pgQuery(`
        INSERT INTO sap_activity_log (
            action_type,
            entity_name,
            module_name,
            actor,
            mode,
            status,
            internal_method,
            internal_url,
            service_method,
            service_url,
            request_vars,
            response_summary,
            error_message,
            started_at,
            finished_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14, $15)
    `, [
        normalizeText(entry.actionType),
        normalizeText(entry.entityName),
        normalizeText(entry.moduleName, 'sap'),
        normalizeText(entry.actor, 'admin'),
        normalizeText(entry.mode),
        normalizeText(entry.status),
        normalizeText(entry.internalMethod, 'GET'),
        normalizeText(entry.internalUrl),
        normalizeText(entry.serviceMethod, 'GET'),
        normalizeText(entry.serviceUrl),
        JSON.stringify(entry.requestVars || {}),
        JSON.stringify(entry.responseSummary || {}),
        normalizeText(entry.errorMessage),
        entry.startedAt || new Date().toISOString(),
        entry.finishedAt || new Date().toISOString()
    ]);
}

async function logSapRouteFailure(pgQuery, entry = {}) {
    try {
        await logSapActivity(pgQuery, {
            status: 'error',
            finishedAt: new Date().toISOString(),
            ...entry
        });
    } catch (error) {
        // Best-effort logging; do not mask the original route failure.
    }
}

function buildActivityFilters(query = {}) {
    return {
        type: normalizeText(query?.type),
        status: normalizeText(query?.status),
        entity: normalizeText(query?.entity),
        actor: normalizeText(query?.actor),
        search: normalizeText(query?.search),
        from: normalizeText(query?.from),
        to: normalizeText(query?.to),
        limit: normalizePositiveInt(query?.limit, 100, 1, 300)
    };
}

async function loadSapActivityLog(pgQuery, query = {}) {
    const filters = buildActivityFilters(query);
    const values = [];
    const clauses = [];
    if (filters.type) {
        values.push(filters.type);
        clauses.push(`action_type = $${values.length}`);
    }
    if (filters.status) {
        values.push(filters.status);
        clauses.push(`status = $${values.length}`);
    }
    if (filters.entity) {
        values.push(filters.entity);
        clauses.push(`entity_name = $${values.length}`);
    }
    if (filters.actor) {
        values.push(`%${filters.actor}%`);
        clauses.push(`actor ILIKE $${values.length}`);
    }
    if (filters.search) {
        values.push(`%${filters.search}%`);
        clauses.push(`(
            entity_name ILIKE $${values.length}
            OR actor ILIKE $${values.length}
            OR internal_url ILIKE $${values.length}
            OR service_url ILIKE $${values.length}
            OR error_message ILIKE $${values.length}
        )`);
    }
    if (filters.from) {
        values.push(`${filters.from}T00:00:00`);
        clauses.push(`started_at >= $${values.length}::timestamptz`);
    }
    if (filters.to) {
        values.push(`${filters.to}T23:59:59.999`);
        clauses.push(`started_at <= $${values.length}::timestamptz`);
    }
    values.push(filters.limit);
    const result = await pgQuery(`
        SELECT id,
               action_type,
               entity_name,
               module_name,
               actor,
               mode,
               status,
               internal_method,
               internal_url,
               service_method,
               service_url,
               request_vars,
               response_summary,
               error_message,
               started_at,
               finished_at,
               created_at
          FROM sap_activity_log
          ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY started_at DESC
         LIMIT $${values.length}
    `, values);
    const catalog = await pgQuery(`
        SELECT
            ARRAY(SELECT DISTINCT action_type FROM sap_activity_log WHERE action_type <> '' ORDER BY action_type) AS types,
            ARRAY(SELECT DISTINCT status FROM sap_activity_log WHERE status <> '' ORDER BY status) AS statuses,
            ARRAY(SELECT DISTINCT entity_name FROM sap_activity_log WHERE entity_name <> '' ORDER BY entity_name) AS entities,
            ARRAY(SELECT DISTINCT actor FROM sap_activity_log WHERE actor <> '' ORDER BY actor) AS actors
    `);
    return {
        filters,
        rows: result.rows,
        catalog: catalog.rows[0] || { types: [], statuses: [], entities: [], actors: [] }
    };
}

async function fetchPagedFromSap(config, entityName, baseQuery, pageSize) {
    const records = [];
    let skip = 0;
    while (true) {
        const parts = [];
        if (baseQuery) parts.push(baseQuery);
        parts.push(`$top=${pageSize}`);
        parts.push(`$skip=${skip}`);
        const response = await sapRequest(config, `${entityName}?${parts.join('&')}`);
        const page = Array.isArray(response.value) ? response.value : [];
        records.push(...page);
        if (page.length < pageSize) break;
        skip += pageSize;
    }
    return records;
}

async function fetchSyncRecords(config, entityName) {
    if (resolveOperatingMode(config) === 'demo') {
        return deepClone(demoState[entityName] || []);
    }
    const definition = SYNC_ENTITY_DEFS[entityName];
    if (!definition) {
        throw new Error(`La entidad SAP ${entityName} no esta soportada para sincronizacion.`);
    }
    return fetchPagedFromSap(config, entityName, definition.query, definition.pageSize);
}

async function upsertBusinessPartners(client, records) {
    for (const row of records) {
        const partnerCode = normalizeText(row.CardCode);
        const partnerName = normalizeText(row.CardName);
        const cardType = normalizeText(row.CardType);
        const balance = row.Balance == null ? null : Number(row.Balance);
        const currency = normalizeText(row.Currency);
        const phone = normalizeText(row.Phone1);
        const email = normalizeText(row.Email || row.EmailAddress);
        const contactPerson = normalizeText(row.ContactPerson);
        const taxId = normalizeText(row.FederalTaxID || row.LicTradNum || row.FEDERALTAXID);
        const clientType = cardType === 'C' ? 'CL' : (cardType === 'S' ? 'PR' : '');
        const syncSnapshot = {
            synced_at: new Date().toISOString(),
            source: 'sap_service_layer',
            card_code: partnerCode,
            card_type: cardType,
            balance,
            currency,
            phone1: phone,
            email,
            contact_person: contactPerson
        };
        if (taxId) {
            syncSnapshot.tax_id = taxId;
        }
        const sapAddresses = extractSapAddresses(row);

        await client.query(`
            INSERT INTO sap_business_partners (
                card_code,
                card_name,
                card_type,
                balance,
                currency,
                phone1,
                email,
                contact_person,
                payload,
                synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
            ON CONFLICT (card_code)
            DO UPDATE SET
                card_name = EXCLUDED.card_name,
                card_type = EXCLUDED.card_type,
                balance = EXCLUDED.balance,
                currency = EXCLUDED.currency,
                phone1 = EXCLUDED.phone1,
                email = EXCLUDED.email,
                contact_person = EXCLUDED.contact_person,
                payload = EXCLUDED.payload,
                synced_at = NOW()
        `, [
            partnerCode,
            partnerName,
            cardType,
            balance,
            currency,
            phone,
            email,
            contactPerson,
            JSON.stringify(row || {})
        ]);

        await client.query(`
            INSERT INTO business_partners (
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
                $1, $2, '', $3, $4, $5, $6, '', '', '', false, NULL, $7, CURRENT_DATE, $8::jsonb, NOW()
            )
            ON CONFLICT (partner_code)
            DO UPDATE SET
                partner_name = COALESCE(NULLIF(EXCLUDED.partner_name, ''), business_partners.partner_name),
                tax_id = CASE
                    WHEN COALESCE(NULLIF(business_partners.tax_id, ''), '') = '' THEN EXCLUDED.tax_id
                    ELSE business_partners.tax_id
                END,
                email = CASE
                    WHEN COALESCE(NULLIF(business_partners.email, ''), '') = '' THEN EXCLUDED.email
                    ELSE business_partners.email
                END,
                email_facturacion = CASE
                    WHEN COALESCE(NULLIF(business_partners.email_facturacion, ''), '') = '' THEN EXCLUDED.email_facturacion
                    ELSE business_partners.email_facturacion
                END,
                currency_code = CASE
                    WHEN COALESCE(NULLIF(business_partners.currency_code, ''), '') = '' THEN EXCLUDED.currency_code
                    ELSE business_partners.currency_code
                END,
                client_type = CASE
                    WHEN COALESCE(NULLIF(business_partners.client_type, ''), '') = '' THEN EXCLUDED.client_type
                    ELSE business_partners.client_type
                END,
                raw_data = COALESCE(business_partners.raw_data, '{}'::jsonb) || EXCLUDED.raw_data,
                updated_at = NOW()
        `, [
            partnerCode,
            partnerName,
            taxId || null,
            email || null,
            email || null,
            currency || null,
            clientType || null,
            JSON.stringify({
                SAP_SERVICE_LAYER: syncSnapshot
            })
        ]);

        if (contactPerson) {
            const [firstName, ...lastNameParts] = contactPerson.split(/\s+/).filter(Boolean);
            await client.query(`
                INSERT INTO business_partner_contacts (
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
                )
                SELECT
                    $1, $2, $3, $4, $5, $6, '', '', 'Principal', false, '', '', '', $7::jsonb
                WHERE NOT EXISTS (
                    SELECT 1
                      FROM business_partner_contacts
                     WHERE partner_code = $1
                       AND LOWER(TRIM(COALESCE(contact_name, ''))) = LOWER(TRIM($2))
                )
            `, [
                partnerCode,
                contactPerson,
                firstName || contactPerson,
                lastNameParts.join(' '),
                email || null,
                phone || null,
                JSON.stringify({
                    SAP_SERVICE_LAYER: syncSnapshot
                })
            ]);
        }

        await client.query(`
            DELETE FROM business_partner_addresses
             WHERE partner_code = $1
               AND raw_data ? 'SAP_SERVICE_LAYER'
        `, [partnerCode]);

        for (const address of sapAddresses) {
            await client.query(`
                INSERT INTO business_partner_addresses (
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
                )
            `, [
                partnerCode,
                address.addressName,
                address.addressTypeLabel,
                address.country || null,
                address.stateProvince || null,
                address.county || null,
                address.district || null,
                address.addressLine || null,
                address.zipCode || null,
                JSON.stringify({
                    SAP_SERVICE_LAYER: {
                        ...syncSnapshot,
                        address_name: address.addressName,
                        address_type_code: address.addressTypeCode
                    },
                    sap_address: address.payload
                })
            ]);
        }
    }
}

async function upsertItems(client, records) {
    for (const row of records) {
        await client.query(`
            INSERT INTO sap_items (
                item_code,
                item_name,
                item_group_code,
                on_hand,
                available_quantity,
                price,
                currency,
                buy_unit_msr,
                sales_unit_msr,
                payload,
                synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW())
            ON CONFLICT (item_code)
            DO UPDATE SET
                item_name = EXCLUDED.item_name,
                item_group_code = EXCLUDED.item_group_code,
                on_hand = EXCLUDED.on_hand,
                available_quantity = EXCLUDED.available_quantity,
                price = EXCLUDED.price,
                currency = EXCLUDED.currency,
                buy_unit_msr = EXCLUDED.buy_unit_msr,
                sales_unit_msr = EXCLUDED.sales_unit_msr,
                payload = EXCLUDED.payload,
                synced_at = NOW()
        `, [
            normalizeText(row.ItemCode),
            normalizeText(row.ItemName),
            normalizeText(row.ItemsGroupCode || row.ItemGroup),
            row.OnHand == null ? null : Number(row.OnHand),
            row.AvailableQuantity == null && row.AvailableQty == null ? null : Number(row.AvailableQuantity != null ? row.AvailableQuantity : row.AvailableQty),
            row.Price == null ? null : Number(row.Price),
            normalizeText(row.Currency),
            normalizeText(row.BuyUnitMsr),
            normalizeText(row.SalesUnitMsr),
            JSON.stringify(row || {})
        ]);
    }
}

async function upsertWarehouses(client, records) {
    for (const row of records) {
        await client.query(`
            INSERT INTO sap_warehouses (
                warehouse_code,
                warehouse_name,
                location,
                payload,
                synced_at
            )
            VALUES ($1, $2, $3, $4::jsonb, NOW())
            ON CONFLICT (warehouse_code)
            DO UPDATE SET
                warehouse_name = EXCLUDED.warehouse_name,
                location = EXCLUDED.location,
                payload = EXCLUDED.payload,
                synced_at = NOW()
        `, [
            normalizeText(row.WarehouseCode),
            normalizeText(row.WarehouseName),
            normalizeText(row.Location),
            JSON.stringify(row || {})
        ]);
    }
}

async function upsertOrders(client, records) {
    for (const row of records) {
        await client.query(`
            INSERT INTO sap_orders (
                doc_entry,
                doc_num,
                card_code,
                card_name,
                doc_date,
                doc_due_date,
                doc_total,
                currency,
                document_status,
                comments,
                payload,
                synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
            ON CONFLICT (doc_entry)
            DO UPDATE SET
                doc_num = EXCLUDED.doc_num,
                card_code = EXCLUDED.card_code,
                card_name = EXCLUDED.card_name,
                doc_date = EXCLUDED.doc_date,
                doc_due_date = EXCLUDED.doc_due_date,
                doc_total = EXCLUDED.doc_total,
                currency = EXCLUDED.currency,
                document_status = EXCLUDED.document_status,
                comments = EXCLUDED.comments,
                payload = EXCLUDED.payload,
                synced_at = NOW()
        `, [
            Number(row.DocEntry),
            normalizeText(row.DocNum),
            normalizeText(row.CardCode),
            normalizeText(row.CardName),
            normalizeText(row.DocDate),
            normalizeText(row.DocDueDate),
            row.DocTotal == null ? null : Number(row.DocTotal),
            normalizeText(row.Currency),
            normalizeText(row.DocumentStatus),
            normalizeText(row.Comments),
            JSON.stringify(row || {})
        ]);
    }
}

async function upsertInvoices(client, records) {
    for (const row of records) {
        await client.query(`
            INSERT INTO sap_invoices (
                doc_entry,
                doc_num,
                card_code,
                card_name,
                doc_date,
                doc_total,
                currency,
                document_status,
                payload,
                synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
            ON CONFLICT (doc_entry)
            DO UPDATE SET
                doc_num = EXCLUDED.doc_num,
                card_code = EXCLUDED.card_code,
                card_name = EXCLUDED.card_name,
                doc_date = EXCLUDED.doc_date,
                doc_total = EXCLUDED.doc_total,
                currency = EXCLUDED.currency,
                document_status = EXCLUDED.document_status,
                payload = EXCLUDED.payload,
                synced_at = NOW()
        `, [
            Number(row.DocEntry),
            normalizeText(row.DocNum),
            normalizeText(row.CardCode),
            normalizeText(row.CardName),
            normalizeText(row.DocDate),
            row.DocTotal == null ? null : Number(row.DocTotal),
            normalizeText(row.Currency),
            normalizeText(row.DocumentStatus),
            JSON.stringify(row || {})
        ]);
    }
}

async function upsertEntity(client, entityName, records) {
    if (entityName === 'BusinessPartners') return upsertBusinessPartners(client, records);
    if (entityName === 'Items') return upsertItems(client, records);
    if (entityName === 'Warehouses') return upsertWarehouses(client, records);
    if (entityName === 'Orders') return upsertOrders(client, records);
    if (entityName === 'Invoices') return upsertInvoices(client, records);
    throw new Error(`No existe un upsert para ${entityName}.`);
}

function resetDemoState() {
    demoState = deepClone(DEMO_DATA_SEED);
}

async function runSapSync({ pgQuery, withTransaction, entityName = 'all' }) {
    const config = await loadSapConfig(pgQuery);
    const mode = resolveOperatingMode(config);
    const entities = entityName === 'all'
        ? Object.keys(SYNC_ENTITY_DEFS)
        : [entityName];
    const startedAt = new Date().toISOString();
    const summary = {
        ok: true,
        mode,
        entities: {}
    };
    await updateSyncState(pgQuery, {
        lastSyncStatus: 'running',
        lastSyncMessage: 'Sincronizando con SAP...',
        lastSyncStartedAt: startedAt,
        lastSyncFinishedAt: null
    });
    for (const currentEntity of entities) {
        const logId = await logSyncStart(pgQuery, currentEntity, mode);
        try {
            const records = await fetchSyncRecords(config, currentEntity);
            await withTransaction(async (client) => {
                await upsertEntity(client, currentEntity, records);
            });
            summary.entities[currentEntity] = records.length;
            await logSyncFinish(pgQuery, logId, 'success', records.length, '');
        } catch (error) {
            summary.ok = false;
            summary.entities[currentEntity] = 0;
            summary.error = error.message;
            await logSyncFinish(pgQuery, logId, 'error', 0, error.message);
            if (entityName !== 'all') {
                await updateSyncState(pgQuery, {
                    lastSyncStatus: 'error',
                    lastSyncMessage: error.message,
                    lastSyncStartedAt: startedAt,
                    lastSyncFinishedAt: new Date().toISOString()
                });
                throw error;
            }
        }
    }
    const message = summary.ok ? 'Sincronizacion completada.' : (summary.error || 'Sincronizacion parcial con errores.');
    await updateSyncState(pgQuery, {
        lastSyncStatus: summary.ok ? 'success' : 'error',
        lastSyncMessage: message,
        lastSyncStartedAt: startedAt,
        lastSyncFinishedAt: new Date().toISOString()
    });
    return summary;
}

async function loadLocalSummary(pgQuery) {
    const tables = [
        ['businessPartners', 'sap_business_partners'],
        ['items', 'sap_items'],
        ['warehouses', 'sap_warehouses'],
        ['orders', 'sap_orders'],
        ['invoices', 'sap_invoices']
    ];
    const counts = {};
    for (const [key, tableName] of tables) {
        const result = await pgQuery(`SELECT COUNT(*)::int AS total FROM ${tableName}`);
        counts[key] = Number(result.rows[0]?.total || 0);
    }
    const syncResult = await pgQuery(`
        SELECT entity_name, mode, status, records_count, message, started_at, finished_at
          FROM sap_sync_log
      ORDER BY started_at DESC
         LIMIT 8
    `);
    return {
        counts,
        recentSync: syncResult.rows
    };
}

async function loadLocalBusinessPartners(pgQuery, query) {
    const values = [];
    const filters = [];
    const type = normalizeText(query?.type);
    const search = normalizeText(query?.search);
    const top = normalizePositiveInt(query?.top, 20, 1, 200);
    if (type) {
        values.push(type);
        filters.push(`sbp.card_type = $${values.length}`);
    }
    if (search) {
        values.push(`%${search}%`);
        filters.push(`(bp.partner_name ILIKE $${values.length} OR bp.partner_code ILIKE $${values.length})`);
    }
    values.push(top);
    const sql = `
        SELECT bp.partner_code AS "CardCode",
               bp.partner_name AS "CardName",
               sbp.card_type AS "CardType",
               sbp.balance AS "Balance",
               COALESCE(NULLIF(bp.currency_code, ''), sbp.currency) AS "Currency",
               COALESCE(NULLIF(contact.phone, ''), sbp.phone1) AS "Phone1",
               COALESCE(NULLIF(bp.email_facturacion, ''), NULLIF(bp.email, ''), sbp.email) AS "Email",
               COALESCE(NULLIF(contact.contact_name, ''), sbp.contact_person) AS "ContactPerson"
          FROM sap_business_partners sbp
          JOIN business_partners bp
            ON bp.partner_code = sbp.card_code
          LEFT JOIN LATERAL (
              SELECT c.contact_name, c.phone
                FROM business_partner_contacts c
               WHERE c.partner_code = bp.partner_code
            ORDER BY c.created_at ASC NULLS LAST
               LIMIT 1
          ) contact ON TRUE
         ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY bp.partner_name ASC
         LIMIT $${values.length}
    `;
    const result = await pgQuery(sql, values);
    return { value: result.rows, source: 'local' };
}

async function loadLocalItems(pgQuery, query) {
    const values = [];
    const filters = [];
    const group = normalizeText(query?.group);
    const search = normalizeText(query?.search);
    const top = normalizePositiveInt(query?.top, 50, 1, 500);
    if (group) {
        values.push(group);
        filters.push(`item_group_code ILIKE $${values.length}`);
    }
    if (search) {
        values.push(`%${search}%`);
        filters.push(`(item_name ILIKE $${values.length} OR item_code ILIKE $${values.length})`);
    }
    values.push(top);
    const sql = `
        SELECT item_code AS "ItemCode",
               item_name AS "ItemName",
               item_group_code AS "ItemsGroupCode",
               on_hand AS "OnHand",
               available_quantity AS "AvailableQuantity",
               price AS "Price",
               currency AS "Currency",
               buy_unit_msr AS "BuyUnitMsr",
               sales_unit_msr AS "SalesUnitMsr"
          FROM sap_items
         ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY item_name ASC
         LIMIT $${values.length}
    `;
    const result = await pgQuery(sql, values);
    return { value: result.rows, source: 'local' };
}

async function loadLocalOrders(pgQuery, query) {
    const values = [];
    const filters = [];
    const status = normalizeText(query?.status);
    const top = normalizePositiveInt(query?.top, 20, 1, 200);
    if (status) {
        values.push(status);
        filters.push(`document_status = $${values.length}`);
    }
    values.push(top);
    const sql = `
        SELECT doc_entry AS "DocEntry",
               doc_num AS "DocNum",
               card_code AS "CardCode",
               card_name AS "CardName",
               doc_date AS "DocDate",
               doc_due_date AS "DocDueDate",
               doc_total AS "DocTotal",
               currency AS "Currency",
               document_status AS "DocumentStatus",
               comments AS "Comments",
               payload->'DocumentLines' AS "DocumentLines"
          FROM sap_orders
         ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY doc_entry DESC
         LIMIT $${values.length}
    `;
    const result = await pgQuery(sql, values);
    return { value: result.rows, source: 'local' };
}

function filterDemoBusinessPartners(query) {
    let rows = deepClone(demoState.BusinessPartners);
    const type = normalizeText(query?.type);
    const search = normalizeText(query?.search).toLowerCase();
    const top = normalizePositiveInt(query?.top, 20, 1, 200);
    if (type) rows = rows.filter((row) => String(row.CardType || '').trim() === type);
    if (search) {
        rows = rows.filter((row) => String(row.CardName || '').toLowerCase().includes(search) || String(row.CardCode || '').toLowerCase().includes(search));
    }
    return { value: rows.slice(0, top), source: 'mock' };
}

function filterDemoItems(query) {
    let rows = deepClone(demoState.Items);
    const group = normalizeText(query?.group).toLowerCase();
    const search = normalizeText(query?.search).toLowerCase();
    const top = normalizePositiveInt(query?.top, 50, 1, 500);
    if (group) rows = rows.filter((row) => String(row.ItemGroup || row.ItemsGroupCode || '').toLowerCase().includes(group));
    if (search) {
        rows = rows.filter((row) => String(row.ItemName || '').toLowerCase().includes(search) || String(row.ItemCode || '').toLowerCase().includes(search));
    }
    return { value: rows.slice(0, top), source: 'mock' };
}

function filterDemoOrders(query) {
    let rows = deepClone(demoState.Orders);
    const status = normalizeText(query?.status);
    const top = normalizePositiveInt(query?.top, 20, 1, 200);
    if (status) rows = rows.filter((row) => String(row.DocumentStatus || '').trim() === status);
    return { value: rows.slice(0, top), source: 'mock' };
}

function buildOrderPayload(input = {}) {
    if (Array.isArray(input.DocumentLines)) {
        return input;
    }
    return {
        CardCode: normalizeText(input.clientCode || input.client_code || input.CardCode),
        DocDate: normalizeText(input.date || input.DocDate),
        DocDueDate: normalizeText(input.dueDate || input.due_date || input.DocDueDate),
        Comments: normalizeText(input.notes || input.Comments),
        SalesPersonCode: input.salesPersonCode == null ? -1 : Number(input.salesPersonCode),
        DocumentLines: Array.isArray(input.lines) ? input.lines.map((line) => ({
            ItemCode: normalizeText(line.itemCode || line.ItemCode),
            Quantity: Number(line.qty != null ? line.qty : line.Quantity),
            Price: line.price == null ? 0 : Number(line.price != null ? line.price : line.Price),
            DiscountPercent: line.discount == null ? 0 : Number(line.discount != null ? line.discount : line.DiscountPercent),
            WarehouseCode: normalizeText(line.warehouse || line.WarehouseCode || '01')
        })) : []
    };
}

function buildInvoicePayload(input = {}) {
    if (Array.isArray(input.DocumentLines)) {
        return input;
    }
    const docEntry = Number(input.docEntry != null ? input.docEntry : input.DocEntry);
    return {
        DocumentLines: [{
            BaseType: 17,
            BaseEntry: docEntry,
            BaseLine: Number(input.baseLine != null ? input.baseLine : 0)
        }]
    };
}

function buildInventoryExitPayload(input = {}) {
    if (Array.isArray(input.DocumentLines)) {
        return input;
    }
    return {
        DocDate: normalizeText(input.date || input.DocDate),
        Comments: normalizeText(input.comments || input.Comments || `Consumo OP ${normalizeText(input.productionOrderId || input.production_order_id)}`),
        DocumentLines: Array.isArray(input.materials) ? input.materials.map((row) => ({
            ItemCode: normalizeText(row.itemCode || row.ItemCode),
            Quantity: Number(row.quantity != null ? row.quantity : row.Quantity),
            WarehouseCode: normalizeText(row.warehouse || row.WarehouseCode || '01'),
            CostingCode: normalizeText(row.costingCode || row.CostingCode)
        })) : []
    };
}

function buildMockOrderResponse(input = {}) {
    const payload = buildOrderPayload(input);
    const nextDocEntry = Math.max(1042, ...demoState.Orders.map((row) => Number(row.DocEntry || 0))) + 1;
    const nextDocNum = Math.max(10042, ...demoState.Orders.map((row) => Number(row.DocNum || 0))) + 1;
    const response = {
        DocEntry: nextDocEntry,
        DocNum: nextDocNum,
        CardCode: payload.CardCode,
        CardName: payload.CardCode,
        DocDate: payload.DocDate,
        DocDueDate: payload.DocDueDate,
        DocTotal: payload.DocumentLines.reduce((acc, row) => acc + (Number(row.Price || 0) * Number(row.Quantity || 0)), 0),
        Currency: 'CRC',
        DocumentStatus: 'bost_Open',
        Comments: payload.Comments,
        DocumentLines: payload.DocumentLines.map((row) => ({
            ItemCode: row.ItemCode,
            Quantity: row.Quantity,
            Price: row.Price,
            LineTotal: Number(row.Price || 0) * Number(row.Quantity || 0)
        })),
        _mock: true
    };
    demoState.Orders.unshift(response);
    return response;
}

function buildMockInvoiceResponse(input = {}) {
    const payload = buildInvoicePayload(input);
    const nextDocEntry = Math.max(5021, ...demoState.Invoices.map((row) => Number(row.DocEntry || 0))) + 1;
    const nextDocNum = Math.max(5021, ...demoState.Invoices.map((row) => Number(row.DocNum || 0))) + 1;
    const response = {
        DocEntry: nextDocEntry,
        DocNum: nextDocNum,
        DocumentLines: payload.DocumentLines,
        DocumentStatus: 'bost_Open',
        _mock: true
    };
    demoState.Invoices.unshift(response);
    return response;
}

function buildMockInventoryExitResponse(input = {}) {
    const payload = buildInventoryExitPayload(input);
    for (const line of payload.DocumentLines) {
        const item = demoState.Items.find((current) => current.ItemCode === line.ItemCode);
        if (!item) continue;
        const quantity = Number(line.Quantity || 0);
        item.OnHand = Math.max(0, Number(item.OnHand || 0) - quantity);
        item.AvailableQty = Math.max(0, Number(item.AvailableQty || item.AvailableQuantity || 0) - quantity);
        item.AvailableQuantity = item.AvailableQty;
    }
    return {
        DocNum: Date.now(),
        ...payload,
        _mock: true
    };
}

async function queryBusinessPartners({ pgQuery, config, query }) {
    if (String(query?.source || '').trim().toLowerCase() === 'local') {
        return loadLocalBusinessPartners(pgQuery, query);
    }
    if (resolveOperatingMode(config) === 'demo') {
        return filterDemoBusinessPartners(query);
    }
    const type = normalizeText(query?.type);
    const search = normalizeText(query?.search);
    const top = normalizePositiveInt(query?.top, 20, 1, 200);
    const filters = [];
    if (type) filters.push(`CardType eq '${type.replace(/'/g, "''")}'`);
    if (search) {
        const escaped = search.replace(/'/g, "''");
        filters.push(`(contains(CardName,'${escaped}') or contains(CardCode,'${escaped}'))`);
    }
    const params = new URLSearchParams();
    params.set('$top', String(top));
    if (filters.length) params.set('$filter', filters.join(' and '));
    const payload = await sapRequest(config, `BusinessPartners?${params.toString()}`);
    return { value: Array.isArray(payload.value) ? payload.value : [], source: 'sap' };
}

async function queryItems({ pgQuery, config, query }) {
    if (String(query?.source || '').trim().toLowerCase() === 'local') {
        return loadLocalItems(pgQuery, query);
    }
    if (resolveOperatingMode(config) === 'demo') {
        return filterDemoItems(query);
    }
    const group = normalizeText(query?.group);
    const search = normalizeText(query?.search);
    const top = normalizePositiveInt(query?.top, 50, 1, 500);
    const filters = [];
    if (group) filters.push(`contains(ItemsGroupCode,'${group.replace(/'/g, "''")}')`);
    if (search) {
        const escaped = search.replace(/'/g, "''");
        filters.push(`(contains(ItemName,'${escaped}') or contains(ItemCode,'${escaped}'))`);
    }
    const params = new URLSearchParams();
    params.set('$top', String(top));
    if (filters.length) params.set('$filter', filters.join(' and '));
    const payload = await sapRequest(config, `Items?${params.toString()}`);
    return { value: Array.isArray(payload.value) ? payload.value : [], source: 'sap' };
}

async function queryItemStock({ pgQuery, config, code, source }) {
    const normalizedCode = normalizeText(code);
    if (!normalizedCode) {
        throw new Error('Debes indicar un codigo de articulo.');
    }
    if (String(source || '').trim().toLowerCase() === 'local') {
        const result = await pgQuery(`
            SELECT item_code AS "ItemCode",
                   item_name AS "ItemName",
                   on_hand AS "OnHand",
                   available_quantity AS "AvailableQuantity"
              FROM sap_items
             WHERE item_code = $1
             LIMIT 1
        `, [normalizedCode]);
        if (!result.rows.length) {
            throw new Error('Articulo no encontrado en tablas locales.');
        }
        return { ...result.rows[0], source: 'local' };
    }
    if (resolveOperatingMode(config) === 'demo') {
        const item = demoState.Items.find((row) => row.ItemCode === normalizedCode);
        if (!item) throw new Error('Articulo no encontrado.');
        return {
            ItemCode: item.ItemCode,
            ItemName: item.ItemName,
            OnHand: item.OnHand,
            AvailableQuantity: item.AvailableQuantity != null ? item.AvailableQuantity : item.AvailableQty,
            source: 'mock'
        };
    }
    const payload = await sapRequest(config, `Items('${encodeURIComponent(normalizedCode)}')?$select=ItemCode,ItemName,QuantityOnStock,AvailableQuantity`);
    return {
        ItemCode: payload.ItemCode,
        ItemName: payload.ItemName,
        OnHand: payload.QuantityOnStock,
        AvailableQuantity: payload.AvailableQuantity,
        source: 'sap'
    };
}

async function queryOrders({ pgQuery, config, query }) {
    if (String(query?.source || '').trim().toLowerCase() === 'local') {
        return loadLocalOrders(pgQuery, query);
    }
    if (resolveOperatingMode(config) === 'demo') {
        return filterDemoOrders(query);
    }
    const status = normalizeText(query?.status);
    const top = normalizePositiveInt(query?.top, 20, 1, 200);
    const params = new URLSearchParams();
    params.set('$top', String(top));
    if (status) params.set('$filter', `DocumentStatus eq '${status.replace(/'/g, "''")}'`);
    const payload = await sapRequest(config, `Orders?${params.toString()}`);
    return { value: Array.isArray(payload.value) ? payload.value : [], source: 'sap' };
}

async function createOrder({ pgQuery, config, body }) {
    const mode = resolveOperatingMode(config);
    const requestPayload = buildOrderPayload(body || {});
    if (mode === 'demo') {
        const responsePayload = buildMockOrderResponse(requestPayload);
        await logWrite(pgQuery, {
            entityName: 'Orders',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'mock' };
    }
    try {
        const responsePayload = await sapRequest(config, 'Orders', {
            method: 'POST',
            body: requestPayload
        });
        await logWrite(pgQuery, {
            entityName: 'Orders',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, {
            entityName: 'Orders',
            mode,
            status: 'error',
            requestPayload,
            responsePayload: {},
            errorMessage: error.message
        });
        throw error;
    }
}

async function createInvoice({ pgQuery, config, body }) {
    const mode = resolveOperatingMode(config);
    const requestPayload = buildInvoicePayload(body || {});
    if (mode === 'demo') {
        const responsePayload = buildMockInvoiceResponse(requestPayload);
        await logWrite(pgQuery, {
            entityName: 'Invoices',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'mock' };
    }
    try {
        const responsePayload = await sapRequest(config, 'Invoices', {
            method: 'POST',
            body: requestPayload
        });
        await logWrite(pgQuery, {
            entityName: 'Invoices',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, {
            entityName: 'Invoices',
            mode,
            status: 'error',
            requestPayload,
            responsePayload: {},
            errorMessage: error.message
        });
        throw error;
    }
}

async function createInventoryExit({ pgQuery, config, body }) {
    const mode = resolveOperatingMode(config);
    const requestPayload = buildInventoryExitPayload(body || {});
    if (mode === 'demo') {
        const responsePayload = buildMockInventoryExitResponse(requestPayload);
        await logWrite(pgQuery, {
            entityName: 'InventoryGenExits',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'mock' };
    }
    try {
        const responsePayload = await sapRequest(config, 'InventoryGenExits', {
            method: 'POST',
            body: requestPayload
        });
        await logWrite(pgQuery, {
            entityName: 'InventoryGenExits',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, {
            entityName: 'InventoryGenExits',
            mode,
            status: 'error',
            requestPayload,
            responsePayload: {},
            errorMessage: error.message
        });
        throw error;
    }
}

async function testSapConnection(config) {
    const mode = resolveOperatingMode(config);
    if (mode === 'demo') {
        return {
            ok: true,
            mode: 'demo',
            message: 'Modo demo activo. El conector usa datos de prueba.'
        };
    }
    await sapLogin(config);
    return {
        ok: true,
        mode: 'live',
        message: 'Conexion SAP valida.'
    };
}

async function getSapStatus(pgQuery) {
    const config = await loadSapConfig(pgQuery);
    const publicConfig = buildPublicConfig(config);
    const localSummary = await loadLocalSummary(pgQuery);
    return {
        mode: resolveOperatingMode(config),
        config: publicConfig,
        localSummary
    };
}

async function fetchSapBusinessPartnersForImport(pgQuery, query = {}) {
    const config = await loadSapConfig(pgQuery);
    const normalizedQuery = {
        top: query.top || 500,
        type: query.type || '',
        search: query.search || ''
    };
    return queryBusinessPartners({ pgQuery, config, query: normalizedQuery });
}

async function fetchSapItemsForImport(pgQuery, query = {}) {
    const config = await loadSapConfig(pgQuery);
    const normalizedQuery = {
        top: query.top || 500,
        group: query.group || '',
        search: query.search || ''
    };
    return queryItems({ pgQuery, config, query: normalizedQuery });
}

function registerSapRoutes({ app, pgQuery, withTransaction }) {
    app.get('/api/sap/config', async (req, res) => {
        try {
            const status = await getSapStatus(pgQuery);
            res.json(status);
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar la configuracion SAP.' });
        }
    });

    app.post('/api/sap/config', async (req, res) => {
        try {
            const persist = withTransaction
                ? () => withTransaction((tx) => saveSapConfig(tx.query.bind(tx), req.body || {}))
                : () => saveSapConfig(pgQuery, req.body || {});
            const saved = await persist();
            res.json({
                config: buildPublicConfig(saved)
            });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible guardar la configuracion SAP.' });
        }
    });

    app.post('/api/sap/test', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await testSapConnection(config);
            await logSapActivity(pgQuery, {
                actionType: 'test',
                entityName: 'connection',
                actor,
                mode: resolveOperatingMode(config),
                status: payload.ok ? 'success' : 'error',
                internalMethod: 'POST',
                internalUrl: '/api/sap/test',
                serviceMethod: 'POST',
                serviceUrl: `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Login`,
                requestVars: {
                    sapCompany: config.sapCompany,
                    sapUser: config.sapUser
                },
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.json(payload);
        } catch (error) {
            const config = await loadSapConfig(pgQuery).catch(() => ({}));
            await logSapRouteFailure(pgQuery, {
                actionType: 'test',
                entityName: 'connection',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'POST',
                internalUrl: '/api/sap/test',
                serviceMethod: 'POST',
                serviceUrl: config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Login` : '',
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible validar la conexion SAP.' });
        }
    });

    app.post('/api/sap/sync', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const entityName = normalizeText(req.body?.entityName || req.body?.entity || 'all');
            const normalizedEntity = entityName === 'all' ? 'all' : (Object.keys(SYNC_ENTITY_DEFS).includes(entityName) ? entityName : 'all');
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await runSapSync({ pgQuery, withTransaction, entityName: normalizedEntity });
            await logSapActivity(pgQuery, {
                actionType: 'sync',
                entityName: normalizedEntity,
                actor,
                mode: resolveOperatingMode(config),
                status: payload.ok ? 'success' : 'error',
                internalMethod: 'POST',
                internalUrl: '/api/sap/sync',
                serviceMethod: 'SYNC',
                serviceUrl: `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1`,
                requestVars: { entityName: normalizedEntity },
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.json(payload);
        } catch (error) {
            const config = await loadSapConfig(pgQuery).catch(() => ({}));
            await logSapRouteFailure(pgQuery, {
                actionType: 'sync',
                entityName: normalizeText(req.body?.entityName || req.body?.entity || 'all'),
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'POST',
                internalUrl: '/api/sap/sync',
                serviceMethod: 'SYNC',
                serviceUrl: config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1` : '',
                requestVars: { entityName: normalizeText(req.body?.entityName || req.body?.entity || 'all') },
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible sincronizar SAP.' });
        }
    });

    app.post('/api/sap/reset-demo', async (req, res) => {
        try {
            resetDemoState();
            res.json({ ok: true });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible reiniciar el demo SAP.' });
        }
    });

    app.get('/api/sap/business-partners', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await queryBusinessPartners({ pgQuery, config, query: req.query || {} });
            await logSapActivity(pgQuery, {
                actionType: 'query',
                entityName: 'BusinessPartners',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'GET',
                internalUrl: req.originalUrl || '/api/sap/business-partners',
                serviceMethod: 'GET',
                serviceUrl: String(req.query?.source || '').trim().toLowerCase() === 'local'
                    ? 'tablas-locales://business-partners'
                    : `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/BusinessPartners`,
                requestVars: {
                    source: req.query?.source || '',
                    type: req.query?.type || '',
                    search: req.query?.search || '',
                    top: req.query?.top || 20
                },
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.json(payload);
        } catch (error) {
            const config = await loadSapConfig(pgQuery).catch(() => ({}));
            await logSapRouteFailure(pgQuery, {
                actionType: 'query',
                entityName: 'BusinessPartners',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'GET',
                internalUrl: req.originalUrl || '/api/sap/business-partners',
                serviceMethod: 'GET',
                serviceUrl: config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/BusinessPartners` : '',
                requestVars: {
                    source: req.query?.source || '',
                    type: req.query?.type || '',
                    search: req.query?.search || '',
                    top: req.query?.top || 20
                },
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible consultar socios SAP.' });
        }
    });

    app.get('/api/sap/items', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await queryItems({ pgQuery, config, query: req.query || {} });
            await logSapActivity(pgQuery, {
                actionType: 'query',
                entityName: 'Items',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'GET',
                internalUrl: req.originalUrl || '/api/sap/items',
                serviceMethod: 'GET',
                serviceUrl: String(req.query?.source || '').trim().toLowerCase() === 'local'
                    ? 'tablas-locales://items'
                    : `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Items`,
                requestVars: {
                    source: req.query?.source || '',
                    group: req.query?.group || '',
                    search: req.query?.search || '',
                    top: req.query?.top || 50
                },
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.json(payload);
        } catch (error) {
            const config = await loadSapConfig(pgQuery).catch(() => ({}));
            await logSapRouteFailure(pgQuery, {
                actionType: 'query',
                entityName: 'Items',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'GET',
                internalUrl: req.originalUrl || '/api/sap/items',
                serviceMethod: 'GET',
                serviceUrl: config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Items` : '',
                requestVars: {
                    source: req.query?.source || '',
                    group: req.query?.group || '',
                    search: req.query?.search || '',
                    top: req.query?.top || 50
                },
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible consultar articulos SAP.' });
        }
    });

    app.get('/api/sap/items/:code/stock', async (req, res) => {
        try {
            const config = await loadSapConfig(pgQuery);
            res.json(await queryItemStock({
                pgQuery,
                config,
                code: req.params.code,
                source: req.query?.source
            }));
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible consultar el stock SAP.' });
        }
    });

    app.get('/api/sap/orders', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await queryOrders({ pgQuery, config, query: req.query || {} });
            await logSapActivity(pgQuery, {
                actionType: 'query',
                entityName: 'Orders',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'GET',
                internalUrl: req.originalUrl || '/api/sap/orders',
                serviceMethod: 'GET',
                serviceUrl: String(req.query?.source || '').trim().toLowerCase() === 'local'
                    ? 'tablas-locales://orders'
                    : `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Orders`,
                requestVars: {
                    source: req.query?.source || '',
                    statusFilter: req.query?.status || '',
                    top: req.query?.top || 20
                },
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.json(payload);
        } catch (error) {
            const config = await loadSapConfig(pgQuery).catch(() => ({}));
            await logSapRouteFailure(pgQuery, {
                actionType: 'query',
                entityName: 'Orders',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'GET',
                internalUrl: req.originalUrl || '/api/sap/orders',
                serviceMethod: 'GET',
                serviceUrl: config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Orders` : '',
                requestVars: {
                    source: req.query?.source || '',
                    statusFilter: req.query?.status || '',
                    top: req.query?.top || 20
                },
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible consultar ordenes SAP.' });
        }
    });

    app.post('/api/sap/orders', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await createOrder({ pgQuery, config, body: req.body || {} });
            await logSapActivity(pgQuery, {
                actionType: 'write',
                entityName: 'Orders',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'POST',
                internalUrl: '/api/sap/orders',
                serviceMethod: 'POST',
                serviceUrl: `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Orders`,
                requestVars: summarizeSapPayload(req.body || {}),
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.status(201).json(payload);
        } catch (error) {
            const config = await loadSapConfig(pgQuery).catch(() => ({}));
            await logSapRouteFailure(pgQuery, {
                actionType: 'write',
                entityName: 'Orders',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'POST',
                internalUrl: '/api/sap/orders',
                serviceMethod: 'POST',
                serviceUrl: config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Orders` : '',
                requestVars: summarizeSapPayload(req.body || {}),
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible crear la orden SAP.' });
        }
    });

    app.post('/api/sap/invoices', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await createInvoice({ pgQuery, config, body: req.body || {} });
            await logSapActivity(pgQuery, {
                actionType: 'write',
                entityName: 'Invoices',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'POST',
                internalUrl: '/api/sap/invoices',
                serviceMethod: 'POST',
                serviceUrl: `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Invoices`,
                requestVars: summarizeSapPayload(req.body || {}),
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.status(201).json(payload);
        } catch (error) {
            const config = await loadSapConfig(pgQuery).catch(() => ({}));
            await logSapRouteFailure(pgQuery, {
                actionType: 'write',
                entityName: 'Invoices',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'POST',
                internalUrl: '/api/sap/invoices',
                serviceMethod: 'POST',
                serviceUrl: config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/Invoices` : '',
                requestVars: summarizeSapPayload(req.body || {}),
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible crear la factura SAP.' });
        }
    });

    app.post('/api/sap/inventory/exit', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await createInventoryExit({ pgQuery, config, body: req.body || {} });
            await logSapActivity(pgQuery, {
                actionType: 'write',
                entityName: 'InventoryGenExits',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'POST',
                internalUrl: '/api/sap/inventory/exit',
                serviceMethod: 'POST',
                serviceUrl: `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/InventoryGenExits`,
                requestVars: summarizeSapPayload(req.body || {}),
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.status(201).json(payload);
        } catch (error) {
            const config = await loadSapConfig(pgQuery).catch(() => ({}));
            await logSapRouteFailure(pgQuery, {
                actionType: 'write',
                entityName: 'InventoryGenExits',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'POST',
                internalUrl: '/api/sap/inventory/exit',
                serviceMethod: 'POST',
                serviceUrl: config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/InventoryGenExits` : '',
                requestVars: summarizeSapPayload(req.body || {}),
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible crear la salida de inventario SAP.' });
        }
    });

    app.get('/api/sap/logs', async (req, res) => {
        try {
            const syncLog = await pgQuery(`
                SELECT id, entity_name, mode, status, records_count, message, started_at, finished_at
                  FROM sap_sync_log
              ORDER BY started_at DESC
                 LIMIT 20
            `);
            const writeLog = await pgQuery(`
                SELECT id, entity_name, mode, status, error_message, created_at
                  FROM sap_write_log
              ORDER BY created_at DESC
                 LIMIT 20
            `);
            res.json({
                syncLog: syncLog.rows,
                writeLog: writeLog.rows
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar los logs SAP.' });
        }
    });

    app.get('/api/sap/activity', async (req, res) => {
        try {
            res.json(await loadSapActivityLog(pgQuery, req.query || {}));
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar los registros SAP.' });
        }
    });
}

function startSapScheduler({ pgQuery, withTransaction, intervalMs = 60_000 }) {
    if (schedulerHandle) return;
    schedulerHandle = setInterval(async () => {
        if (syncInFlight) return;
        try {
            const config = await loadSapConfig(pgQuery);
            if (!config.autoSyncEnabled) return;
            const lastFinished = config.lastSyncFinishedAt ? new Date(config.lastSyncFinishedAt).getTime() : 0;
            const enoughTimeElapsed = !lastFinished || (Date.now() - lastFinished) >= (config.syncIntervalMinutes * 60 * 1000);
            if (!enoughTimeElapsed) return;
            syncInFlight = true;
            await runSapSync({ pgQuery, withTransaction, entityName: 'all' });
        } catch (error) {
            await updateSyncState(pgQuery, {
                lastSyncStatus: 'error',
                lastSyncMessage: error.message,
                lastSyncFinishedAt: new Date().toISOString()
            }).catch(() => null);
        } finally {
            syncInFlight = false;
        }
    }, intervalMs);
    if (typeof schedulerHandle.unref === 'function') {
        schedulerHandle.unref();
    }
}

module.exports = {
    ensureSapSchema,
    registerSapRoutes,
    startSapScheduler,
    fetchSapBusinessPartnersForImport,
    fetchSapItemsForImport
};
