const http = require('http');
const https = require('https');
const diApiBridge = require('./sap-di-api');

const DEFAULT_SAP_CONFIG = Object.freeze({
    mode: 'demo',
    provider: 'service-layer',
    sapHost: '',
    sapPort: 50000,
    sapProtocol: 'https',
    sapUser: 'manager',
    sapPassword: '',
    sapCompany: 'SBO_pruebas',
    diApiBaseUrl: '',
    diApiTimeoutMs: 30000,
    autoSyncEnabled: false,
    syncIntervalMinutes: 30,
    allowSelfSigned: true,
    keepDemoEnabled: false,
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
        query: '$select=CardCode,CardName,CardType,Balance,Currency,Phone1,Email,ContactPerson,PriceListNum,FederalTaxID,LicTradNum,BPAddresses&$expand=BPAddresses'
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

const SAP_MIRROR_TABLES = Object.freeze({
    OCRD: {
        label: 'Importación de socios',
        group: 'socios',
        direction: 'import',
        key: 'CardCode',
        columns: ['CardCode', 'CardName', 'CardType', 'Currency', 'LicTradNum', 'FederalTaxID', 'Phone1', 'E_Mail', 'CntctPrsn', 'ListNum', 'validFor', 'Balance']
    },
    CRD1: {
        label: 'Direcciones de socios',
        group: 'socios',
        direction: 'import',
        key: 'CardCode',
        columns: ['CardCode', 'Address', 'AdresType', 'Street', 'Block', 'City', 'County', 'State', 'Country', 'ZipCode']
    },
    OCPR: {
        label: 'Contactos de socios',
        group: 'socios',
        direction: 'import',
        key: 'CardCode',
        columns: ['CardCode', 'Name', 'FirstName', 'LastName', 'E_MailL', 'Tel1', 'Cellolar', 'Position']
    },
    OITM: {
        label: 'Importación de artículos',
        group: 'inventario',
        direction: 'import',
        key: 'ItemCode',
        columns: ['ItemCode', 'ItemName', 'ItmsGrpCod', 'U_ClasificacionERP', 'InvntryUom', 'BuyUnitMsr', 'SalUnitMsr', 'validFor', 'OnHand', 'IsCommited', 'OnOrder', 'AvgPrice', 'LastPurPrc', 'Price', 'Currency']
    },
    OITW: {
        label: 'Inventario por bodega',
        group: 'inventario',
        direction: 'import',
        key: 'ItemCode',
        columns: ['ItemCode', 'WhsCode', 'OnHand', 'IsCommited', 'OnOrder', 'AvailableQuantity']
    },
    ITM1: {
        label: 'Precios por lista',
        group: 'inventario',
        direction: 'import',
        key: 'ItemCode',
        columns: ['ItemCode', 'PriceList', 'Price', 'Currency']
    },
    OWHS: {
        label: 'Bodegas',
        group: 'inventario',
        direction: 'import',
        key: 'WhsCode',
        columns: ['WhsCode', 'WhsName', 'Location']
    },
    ORDR: {
        label: 'Exportación de órdenes',
        group: 'ordenes',
        direction: 'export',
        key: 'DocEntry',
        columns: ['DocEntry', 'DocNum', 'CardCode', 'CardName', 'DocDate', 'DocDueDate', 'DocTotal', 'Currency', 'DocStatus', 'Comments']
    },
    RDR1: {
        label: 'Líneas de órdenes',
        group: 'ordenes',
        direction: 'export',
        key: 'DocEntry',
        columns: ['DocEntry', 'LineNum', 'ItemCode', 'Dscription', 'Quantity', 'Price', 'LineTotal', 'WhsCode']
    },
    OWOR: {
        label: 'Exportación de órdenes de producción',
        group: 'bom',
        direction: 'export',
        key: 'DocEntry',
        columns: ['DocEntry', 'DocNum', 'ItemCode', 'ProdName', 'PlannedQty', 'CmpltQty', 'PostDate', 'DueDate', 'Status', 'OriginNum', 'Comments']
    },
    WOR1: {
        label: 'Componentes de producción',
        group: 'bom',
        direction: 'export',
        key: 'DocEntry',
        columns: ['DocEntry', 'LineNum', 'ItemCode', 'ItemName', 'PlannedQty', 'IssuedQty', 'warehous']
    },
    OITT: {
        label: 'BOM / árbol de producto',
        group: 'bom',
        direction: 'export',
        key: 'Code',
        columns: ['Code', 'Name', 'Qauntity', 'TreeType']
    },
    ITT1: {
        label: 'Componentes BOM',
        group: 'bom',
        direction: 'export',
        key: 'Father',
        columns: ['Father', 'Code', 'Quantity', 'Warehouse', 'PriceList']
    }
});

const SAP_MIRROR_PROCESS_DEFS = Object.freeze({
    'import-business-partners': {
        key: 'import-business-partners',
        label: 'Importar Socios',
        direction: 'import',
        entity: 'BusinessPartners',
        targetTables: ['OCRD', 'CRD1', 'OCPR'],
        endpoint: '/api/sap/mirror/import-business-partners',
        previewEndpoint: '/api/sap/mirror/preview',
        diApiRoute: '/business-partners',
        serviceLayerRoute: 'BusinessPartners',
        sql: [
            'SELECT CardCode, CardName, CardType, Currency, LicTradNum, FederalTaxID, Phone1, E_Mail, CntctPrsn, ListNum, validFor, Balance',
            '  FROM OCRD',
            " WHERE validFor = 'Y'",
            "   AND CardType IN ('C', 'L')",
            ' ORDER BY CardCode ASC'
        ].join('\n'),
        relatedSql: [
            'SELECT CardCode, Address, AdresType, Street, City, County, Country FROM CRD1 WHERE CardCode IN (:CardCode)',
            'SELECT CardCode, CntctCode, Name, Tel1, E_MailL FROM OCPR WHERE CardCode IN (:CardCode)'
        ],
        note: 'Socios activos. Incluye clientes y prospectos; direcciones y contactos se guardan en tablas separadas.'
    },
    'import-items': {
        key: 'import-items',
        label: 'Importar Inventario',
        direction: 'import',
        entity: 'Items',
        targetTables: ['OITM', 'OITW', 'ITM1', 'OWHS'],
        endpoint: '/api/sap/mirror/import-items',
        previewEndpoint: '/api/sap/mirror/preview',
        diApiRoute: '/items',
        serviceLayerRoute: 'Items',
        sql: [
            'SELECT ItemCode, ItemName, ItemsGroupCode, OnHand, AvailableQuantity, Price, Currency, BuyUnitMsr, SalesUnitMsr, validFor',
            '  FROM OITM',
            " WHERE validFor = 'Y'",
            ' ORDER BY ItemCode ASC'
        ].join('\n'),
        relatedSql: [
            'SELECT ItemCode, WhsCode, OnHand, IsCommited, OnOrder, Counted FROM OITW WHERE ItemCode IN (:ItemCode)',
            'SELECT ItemCode, PriceList, Price, Currency FROM ITM1 WHERE ItemCode IN (:ItemCode)',
            'SELECT WhsCode, WhsName, Locked FROM OWHS'
        ],
        note: 'Artículos activos, existencias por bodega y precios por lista. ITM1 alimenta listas de precio sin mezclar costo con precio comercial.'
    },
    'export-order': {
        key: 'export-order',
        label: 'Enviar Orden de Venta',
        direction: 'export',
        entity: 'Orders',
        targetTables: ['ORDR', 'RDR1'],
        endpoint: '/api/sap/mirror/export-order',
        previewEndpoint: '/api/sap/mirror/preview',
        diApiRoute: '/orders',
        diApiMethod: 'POST',
        serviceLayerRoute: 'POST Orders',
        sql: [
            'INSERT INTO ORDR (DocEntry, DocNum, CardCode, CardName, DocDate, DocDueDate, DocTotal, Currency, DocStatus, Comments)',
            'INSERT INTO RDR1 (DocEntry, LineNum, ItemCode, Dscription, Quantity, Price, LineTotal, WhsCode)'
        ].join('\n'),
        note: 'Prepara el encabezado y las líneas de la orden con la misma estructura que SAP B1 usa para ORDR/RDR1.'
    },
    'export-bom': {
        key: 'export-bom',
        label: 'Enviar BOM / Producción',
        direction: 'export',
        entity: 'ProductionOrders',
        targetTables: ['OWOR', 'WOR1', 'OITT', 'ITT1'],
        endpoint: '/api/sap/mirror/export-bom',
        previewEndpoint: '/api/sap/mirror/preview',
        diApiRoute: '/production-orders',
        diApiMethod: 'POST',
        serviceLayerRoute: 'POST ProductionOrders / ProductTrees',
        sql: [
            'INSERT INTO OWOR (DocEntry, DocNum, ItemCode, ProdName, PlannedQty, PostDate, DueDate, Status, OriginNum)',
            'INSERT INTO WOR1 (DocEntry, LineNum, ItemCode, ItemName, PlannedQty, warehous)',
            'INSERT INTO OITT (Code, Name, Qauntity, TreeType)',
            'INSERT INTO ITT1 (Father, Code, Quantity, Warehouse, PriceList)'
        ].join('\n'),
        note: 'Mantiene visible la orden de producción y el árbol de materiales. SAP debe confirmar si el cierre final se hará por OWOR/WOR1, OITT/ITT1 o ambos.'
    }
});

const SAP_IMPORT_JOB_DEFS = Object.freeze({
    'sap-import-business-partners': {
        jobCode: 'sap-import-business-partners',
        label: 'Socios, contactos y direcciones',
        entityLabel: 'OCRD/CRD1/OCPR',
        internalUrl: '/api/sap/mirror/import-business-partners',
        serviceUrl: 'sap-mirror://BusinessPartners',
        defaultFilters: {
            enabled: false,
            intervalMinutes: 30,
            limit: 200,
            search: '',
            type: ''
        }
    },
    'sap-import-items': {
        jobCode: 'sap-import-items',
        label: 'Inventario, stock, precios y bodegas',
        entityLabel: 'OITM/OITW/ITM1/OWHS',
        internalUrl: '/api/sap/mirror/import-items',
        serviceUrl: 'sap-mirror://Items',
        defaultFilters: {
            enabled: false,
            intervalMinutes: 30,
            limit: 500,
            search: '',
            group: ''
        }
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

function sapNumber(value, fallback = null) {
    if (value == null || value === '') return fallback;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function sapText(value, fallback = '') {
    return normalizeText(value, fallback);
}

function getSapItemPrice(row = {}) {
    if (row.Price != null) return row.Price;
    if (row.LastPurPrc != null) return row.LastPurPrc;
    if (row.AvgPrice != null) return row.AvgPrice;
    const prices = Array.isArray(row.ItemPrices) ? row.ItemPrices : [];
    const firstPrice = prices.find((price) => price && price.Price != null);
    return firstPrice?.Price;
}

function getSapItemPriceRows(row = {}) {
    const itemCode = sapText(row.ItemCode);
    const currency = sapText(row.Currency);
    const prices = Array.isArray(row.ItemPrices) ? row.ItemPrices : [];
    if (prices.length) {
        return prices.map((price, index) => ({
            ItemCode: itemCode,
            PriceList: sapNumber(price.PriceList || price.PriceListNum, index + 1),
            Price: sapNumber(price.Price, 0),
            Currency: sapText(price.Currency || currency),
            raw_data: price || {}
        }));
    }
    return [{
        ItemCode: itemCode,
        PriceList: sapNumber(row.PriceListNum, 1),
        Price: sapNumber(getSapItemPrice(row), 0),
        Currency: currency,
        raw_data: row || {}
    }];
}

function normalizeSapProvider(value, fallback = DEFAULT_SAP_CONFIG.provider) {
    const normalized = normalizeText(value, fallback).toLowerCase();
    return normalized === 'di-api' ? 'di-api' : 'service-layer';
}

function isDiApiProvider(config = {}) {
    return normalizeSapProvider(config.provider || config.sapProvider) === 'di-api';
}

function isLiveProviderReady(config = {}) {
    const provider = normalizeSapProvider(config.provider || config.sapProvider || config.sap_provider);
    const sapUser = normalizeText(config.sapUser != null ? config.sapUser : config.sap_user);
    const sapCompany = normalizeText(config.sapCompany != null ? config.sapCompany : config.sap_company);
    const sapPassword = String(config.sapPassword != null ? config.sapPassword : (config.sap_password != null ? config.sap_password : ''));
    if (provider === 'di-api') {
        const diApiBaseUrl = normalizeText(config.diApiBaseUrl || config.di_api_base_url);
        return Boolean(diApiBaseUrl);
    }
    const sapHost = normalizeText(config.sapHost || config.sap_host);
    return Boolean(sapHost && sapUser && sapCompany && sapPassword);
}

function buildSapServiceUrl(config = {}, entityPath = '') {
    const normalized = normalizeSapConfigRecord(config);
    if (isDiApiProvider(normalized)) {
        const baseUrl = diApiBridge.buildDiApiBaseUrl(normalized);
        if (!baseUrl) return '';
        if (!entityPath) return baseUrl;
        return `${baseUrl}${entityPath.startsWith('/') ? entityPath : `/${entityPath}`}`;
    }
    const host = normalizeText(normalized.sapHost);
    if (!host) return '';
    const protocol = normalized.sapProtocol === 'http' ? 'http' : 'https';
    const port = normalized.sapPort ? `:${normalized.sapPort}` : '';
    const route = entityPath
        ? (entityPath.startsWith('/') ? entityPath : `/${entityPath}`)
        : '/b1s/v1';
    return `${protocol}://${host}${port}${route}`;
}

function normalizeSapConfigRecord(source = {}) {
    const normalizedCompany = normalizeText(
        source.sapCompany != null ? source.sapCompany : source.sap_company,
        ''
    );
    const normalized = {
        mode: normalizeMode(source.mode, DEFAULT_SAP_CONFIG.mode),
        provider: normalizeSapProvider(source.provider || source.sapProvider || source.sap_provider, DEFAULT_SAP_CONFIG.provider),
        sapHost: normalizeText(source.sapHost || source.sap_host),
        sapPort: normalizePositiveInt(source.sapPort || source.sap_port, DEFAULT_SAP_CONFIG.sapPort, 1, 65535),
        sapProtocol: normalizeText(source.sapProtocol || source.sap_protocol || DEFAULT_SAP_CONFIG.sapProtocol).toLowerCase() === 'http' ? 'http' : 'https',
        sapUser: normalizeText(
            source.sapUser != null ? source.sapUser : source.sap_user,
            ''
        ),
        sapPassword: String(source.sapPassword != null ? source.sapPassword : (source.sap_password != null ? source.sap_password : DEFAULT_SAP_CONFIG.sapPassword)),
        sapCompany: normalizedCompany === 'SBO_DEMO' ? '' : normalizedCompany,
        diApiBaseUrl: normalizeText(source.diApiBaseUrl || source.di_api_base_url),
        diApiTimeoutMs: normalizePositiveInt(source.diApiTimeoutMs || source.di_api_timeout_ms, DEFAULT_SAP_CONFIG.diApiTimeoutMs, 1000, 120000),
        autoSyncEnabled: normalizeBoolean(source.autoSyncEnabled != null ? source.autoSyncEnabled : source.auto_sync_enabled, DEFAULT_SAP_CONFIG.autoSyncEnabled),
        syncIntervalMinutes: normalizePositiveInt(source.syncIntervalMinutes || source.sync_interval_minutes, DEFAULT_SAP_CONFIG.syncIntervalMinutes, 5, 1440),
        allowSelfSigned: normalizeBoolean(source.allowSelfSigned != null ? source.allowSelfSigned : source.allow_self_signed, DEFAULT_SAP_CONFIG.allowSelfSigned),
        keepDemoEnabled: normalizeBoolean(source.keepDemoEnabled != null ? source.keepDemoEnabled : source.keep_demo_enabled, DEFAULT_SAP_CONFIG.keepDemoEnabled),
        lastSyncStatus: normalizeText(source.lastSyncStatus || source.last_sync_status, DEFAULT_SAP_CONFIG.lastSyncStatus),
        lastSyncMessage: normalizeText(source.lastSyncMessage || source.last_sync_message, DEFAULT_SAP_CONFIG.lastSyncMessage),
        lastSyncStartedAt: normalizeTimestamp(source.lastSyncStartedAt || source.last_sync_started_at),
        lastSyncFinishedAt: normalizeTimestamp(source.lastSyncFinishedAt || source.last_sync_finished_at)
    };
    return normalized;
}

function buildPublicConfig(config) {
    const normalized = normalizeSapConfigRecord(config);
    const hasPassword = Boolean(normalized.sapPassword);
    const isLiveReady = isLiveProviderReady(normalized);
    return {
        ...normalized,
        sapPassword: '',
        hasPassword,
        isLiveReady
    };
}

function resolveOperatingMode(config) {
    const normalized = normalizeSapConfigRecord(config);
    return normalized.mode === 'demo' ? 'demo' : 'live';
}

function getSapProviderLoginUrl(config = {}) {
    const normalized = normalizeSapConfigRecord(config);
    if (isDiApiProvider(normalized)) {
        const baseUrl = diApiBridge.buildDiApiBaseUrl(normalized);
        return baseUrl ? `${baseUrl}/test` : '';
    }
    return normalized.sapHost
        ? `${normalized.sapProtocol}://${normalized.sapHost}:${normalized.sapPort}/b1s/v1/Login`
        : '';
}

function assertLiveSapConfigReady(config = {}, context = 'La operación') {
    const normalized = normalizeSapConfigRecord(config);
    if (normalized.mode !== 'live') {
        throw new Error(`${context} requiere modo en vivo. No se consultó SAP ni DI API.`);
    }
    if (isLiveProviderReady(normalized)) {
        return normalized;
    }
    if (isDiApiProvider(normalized)) {
        if (!normalizeText(normalized.diApiBaseUrl)) {
            throw new Error('DI API no tiene URL base configurada. Ejemplo: http://localhost:4100');
        }
        throw new Error('DI API no está listo para probar la conexión real.');
    }
    if (!normalizeText(normalized.sapHost)) {
        throw new Error('Service Layer no tiene host configurado.');
    }
    throw new Error('Service Layer no tiene credenciales completas para probar la conexión real.');
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
            provider TEXT NOT NULL DEFAULT 'service-layer',
            sap_host TEXT NOT NULL DEFAULT '',
            sap_port INTEGER NOT NULL DEFAULT 50000,
            sap_protocol TEXT NOT NULL DEFAULT 'https',
            sap_user TEXT NOT NULL DEFAULT 'manager',
            sap_password TEXT NOT NULL DEFAULT '',
            sap_company TEXT NOT NULL DEFAULT 'SBO_pruebas',
            di_api_base_url TEXT NOT NULL DEFAULT '',
            di_api_timeout_ms INTEGER NOT NULL DEFAULT 30000,
            auto_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            sync_interval_minutes INTEGER NOT NULL DEFAULT 30,
            allow_self_signed BOOLEAN NOT NULL DEFAULT TRUE,
            keep_demo_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            last_sync_status TEXT NOT NULL DEFAULT 'idle',
            last_sync_message TEXT NOT NULL DEFAULT '',
            last_sync_started_at TIMESTAMPTZ NULL,
            last_sync_finished_at TIMESTAMPTZ NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'demo'`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'service-layer'`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_host TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_port INTEGER NOT NULL DEFAULT 50000`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_protocol TEXT NOT NULL DEFAULT 'https'`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_user TEXT NOT NULL DEFAULT 'manager'`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_password TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_company TEXT NOT NULL DEFAULT 'SBO_pruebas'`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS di_api_base_url TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS di_api_timeout_ms INTEGER NOT NULL DEFAULT 30000`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER NOT NULL DEFAULT 30`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS allow_self_signed BOOLEAN NOT NULL DEFAULT TRUE`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS keep_demo_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS last_sync_status TEXT NOT NULL DEFAULT 'idle'`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS last_sync_message TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS last_sync_started_at TIMESTAMPTZ NULL`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS last_sync_finished_at TIMESTAMPTZ NULL`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await pgQuery(`
        INSERT INTO sap_integration_config (
            id,
            mode,
            provider,
            sap_host,
            sap_port,
            sap_protocol,
            sap_user,
            sap_password,
            sap_company,
            di_api_base_url,
            di_api_timeout_ms,
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
            $11,
            $12,
            $13,
            $14
        )
        ON CONFLICT (id) DO NOTHING
    `, [
        DEFAULT_SAP_CONFIG.mode,
        DEFAULT_SAP_CONFIG.provider,
        DEFAULT_SAP_CONFIG.sapHost,
        DEFAULT_SAP_CONFIG.sapPort,
        DEFAULT_SAP_CONFIG.sapProtocol,
        DEFAULT_SAP_CONFIG.sapUser,
        DEFAULT_SAP_CONFIG.sapPassword,
        DEFAULT_SAP_CONFIG.sapCompany,
        DEFAULT_SAP_CONFIG.diApiBaseUrl,
        DEFAULT_SAP_CONFIG.diApiTimeoutMs,
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
        CREATE TABLE IF NOT EXISTS "OCRD" (
            "CardCode" TEXT PRIMARY KEY,
            "CardName" TEXT NOT NULL DEFAULT '',
            "CardType" TEXT NOT NULL DEFAULT '',
            "Currency" TEXT NOT NULL DEFAULT '',
            "LicTradNum" TEXT NOT NULL DEFAULT '',
            "FederalTaxID" TEXT NOT NULL DEFAULT '',
            "Phone1" TEXT NOT NULL DEFAULT '',
            "E_Mail" TEXT NOT NULL DEFAULT '',
            "CntctPrsn" TEXT NOT NULL DEFAULT '',
            "ListNum" INTEGER NULL,
            "validFor" TEXT NOT NULL DEFAULT 'Y',
            "frozenFor" TEXT NOT NULL DEFAULT 'N',
            "Balance" NUMERIC NULL,
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "OCRD_CardName_idx" ON "OCRD" ("CardName")`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "CRD1" (
            id BIGSERIAL PRIMARY KEY,
            "CardCode" TEXT NOT NULL,
            "Address" TEXT NOT NULL DEFAULT '',
            "AdresType" TEXT NOT NULL DEFAULT '',
            "Street" TEXT NOT NULL DEFAULT '',
            "Block" TEXT NOT NULL DEFAULT '',
            "City" TEXT NOT NULL DEFAULT '',
            "County" TEXT NOT NULL DEFAULT '',
            "State" TEXT NOT NULL DEFAULT '',
            "Country" TEXT NOT NULL DEFAULT '',
            "ZipCode" TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE ("CardCode", "Address", "AdresType")
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "CRD1_CardCode_idx" ON "CRD1" ("CardCode")`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "OCPR" (
            id BIGSERIAL PRIMARY KEY,
            "CardCode" TEXT NOT NULL,
            "Name" TEXT NOT NULL DEFAULT '',
            "FirstName" TEXT NOT NULL DEFAULT '',
            "LastName" TEXT NOT NULL DEFAULT '',
            "E_MailL" TEXT NOT NULL DEFAULT '',
            "Tel1" TEXT NOT NULL DEFAULT '',
            "Cellolar" TEXT NOT NULL DEFAULT '',
            "Position" TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE ("CardCode", "Name")
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "OCPR_CardCode_idx" ON "OCPR" ("CardCode")`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "OITM" (
            "ItemCode" TEXT PRIMARY KEY,
            "ItemName" TEXT NOT NULL DEFAULT '',
            "ItmsGrpCod" TEXT NOT NULL DEFAULT '',
            "U_ClasificacionERP" TEXT NOT NULL DEFAULT '',
            "InvntryUom" TEXT NOT NULL DEFAULT '',
            "BuyUnitMsr" TEXT NOT NULL DEFAULT '',
            "SalUnitMsr" TEXT NOT NULL DEFAULT '',
            "validFor" TEXT NOT NULL DEFAULT 'Y',
            "frozenFor" TEXT NOT NULL DEFAULT 'N',
            "OnHand" NUMERIC NULL,
            "IsCommited" NUMERIC NULL,
            "OnOrder" NUMERIC NULL,
            "AvgPrice" NUMERIC NULL,
            "LastPurPrc" NUMERIC NULL,
            "Price" NUMERIC NULL,
            "Currency" TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "OITM_ItemName_idx" ON "OITM" ("ItemName")`);
    await pgQuery(`ALTER TABLE "OITM" ADD COLUMN IF NOT EXISTS "U_ClasificacionERP" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "OITW" (
            id BIGSERIAL PRIMARY KEY,
            "ItemCode" TEXT NOT NULL,
            "WhsCode" TEXT NOT NULL DEFAULT '',
            "OnHand" NUMERIC NULL,
            "IsCommited" NUMERIC NULL,
            "OnOrder" NUMERIC NULL,
            "AvailableQuantity" NUMERIC NULL,
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE ("ItemCode", "WhsCode")
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "OITW_ItemCode_idx" ON "OITW" ("ItemCode")`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "ITM1" (
            id BIGSERIAL PRIMARY KEY,
            "ItemCode" TEXT NOT NULL,
            "PriceList" INTEGER NOT NULL DEFAULT 1,
            "Price" NUMERIC NULL,
            "Currency" TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE ("ItemCode", "PriceList")
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "ITM1_ItemCode_idx" ON "ITM1" ("ItemCode")`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "OWHS" (
            "WhsCode" TEXT PRIMARY KEY,
            "WhsName" TEXT NOT NULL DEFAULT '',
            "Location" TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "ORDR" (
            "DocEntry" BIGINT PRIMARY KEY,
            "DocNum" TEXT NOT NULL DEFAULT '',
            "CardCode" TEXT NOT NULL DEFAULT '',
            "CardName" TEXT NOT NULL DEFAULT '',
            "DocDate" TEXT NOT NULL DEFAULT '',
            "DocDueDate" TEXT NOT NULL DEFAULT '',
            "DocTotal" NUMERIC NULL,
            "Currency" TEXT NOT NULL DEFAULT '',
            "SlpCode" INTEGER NULL,
            "DocStatus" TEXT NOT NULL DEFAULT '',
            "Comments" TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "ORDR_CardCode_idx" ON "ORDR" ("CardCode")`);
    await pgQuery(`ALTER TABLE "ORDR" ADD COLUMN IF NOT EXISTS "SlpCode" INTEGER NULL`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "RDR1" (
            id BIGSERIAL PRIMARY KEY,
            "DocEntry" BIGINT NOT NULL,
            "LineNum" INTEGER NOT NULL DEFAULT 0,
            "ItemCode" TEXT NOT NULL DEFAULT '',
            "Dscription" TEXT NOT NULL DEFAULT '',
            "Quantity" NUMERIC NULL,
            "Price" NUMERIC NULL,
            "LineTotal" NUMERIC NULL,
            "WhsCode" TEXT NOT NULL DEFAULT '',
            "OcrCode" TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE ("DocEntry", "LineNum")
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "RDR1_DocEntry_idx" ON "RDR1" ("DocEntry")`);
    await pgQuery(`ALTER TABLE "RDR1" ADD COLUMN IF NOT EXISTS "OcrCode" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "OWOR" (
            "DocEntry" BIGINT PRIMARY KEY,
            "DocNum" TEXT NOT NULL DEFAULT '',
            "ItemCode" TEXT NOT NULL DEFAULT '',
            "ProdName" TEXT NOT NULL DEFAULT '',
            "PlannedQty" NUMERIC NULL,
            "CmpltQty" NUMERIC NULL,
            "PostDate" TEXT NOT NULL DEFAULT '',
            "DueDate" TEXT NOT NULL DEFAULT '',
            "Status" TEXT NOT NULL DEFAULT '',
            "OriginNum" TEXT NOT NULL DEFAULT '',
            "Comments" TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "OWOR_ItemCode_idx" ON "OWOR" ("ItemCode")`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "WOR1" (
            id BIGSERIAL PRIMARY KEY,
            "DocEntry" BIGINT NOT NULL,
            "LineNum" INTEGER NOT NULL DEFAULT 0,
            "ItemCode" TEXT NOT NULL DEFAULT '',
            "ItemName" TEXT NOT NULL DEFAULT '',
            "PlannedQty" NUMERIC NULL,
            "IssuedQty" NUMERIC NULL,
            "warehous" TEXT NOT NULL DEFAULT '',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE ("DocEntry", "LineNum")
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "WOR1_DocEntry_idx" ON "WOR1" ("DocEntry")`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "OITT" (
            "Code" TEXT PRIMARY KEY,
            "Name" TEXT NOT NULL DEFAULT '',
            "Qauntity" NUMERIC NULL,
            "TreeType" TEXT NOT NULL DEFAULT 'P',
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS "ITT1" (
            id BIGSERIAL PRIMARY KEY,
            "Father" TEXT NOT NULL,
            "Code" TEXT NOT NULL DEFAULT '',
            "Quantity" NUMERIC NULL,
            "Warehouse" TEXT NOT NULL DEFAULT '',
            "PriceList" INTEGER NULL,
            raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE ("Father", "Code", "Warehouse")
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS "ITT1_Father_idx" ON "ITT1" ("Father")`);
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
            classification_source_value TEXT NOT NULL DEFAULT '',
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
    await pgQuery(`ALTER TABLE sap_items ADD COLUMN IF NOT EXISTS classification_source_value TEXT NOT NULL DEFAULT ''`);
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
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_item_links (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            local_kind TEXT NOT NULL,
            local_id TEXT NOT NULL DEFAULT '',
            local_code TEXT NOT NULL DEFAULT '',
            local_name TEXT NOT NULL DEFAULT '',
            sap_item_code TEXT NOT NULL,
            sap_item_name TEXT NOT NULL DEFAULT '',
            warehouse_code TEXT NOT NULL DEFAULT '',
            provider TEXT NOT NULL DEFAULT 'service-layer',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            notes TEXT NOT NULL DEFAULT '',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (local_kind, local_code, sap_item_code, warehouse_code)
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_item_links_local_idx ON sap_item_links (local_kind, local_code)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_item_links_sap_idx ON sap_item_links (sap_item_code, warehouse_code)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_inventory_snapshot (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sap_item_code TEXT NOT NULL,
            warehouse_code TEXT NOT NULL DEFAULT '',
            item_name TEXT NOT NULL DEFAULT '',
            item_group_code TEXT NOT NULL DEFAULT '',
            on_hand NUMERIC NULL,
            committed_quantity NUMERIC NULL,
            available_quantity NUMERIC NULL,
            uom TEXT NOT NULL DEFAULT '',
            snapshot_source TEXT NOT NULL DEFAULT 'sap_items',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (sap_item_code, warehouse_code)
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_inventory_snapshot_item_idx ON sap_inventory_snapshot (sap_item_code)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_inventory_snapshot_group_idx ON sap_inventory_snapshot (item_group_code)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS production_material_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            request_code TEXT NOT NULL UNIQUE,
            order_code TEXT REFERENCES flexo_orders(order_code) ON DELETE SET NULL,
            quote_code TEXT NOT NULL DEFAULT '',
            line_code TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pendiente_revision',
            source_context TEXT NOT NULL DEFAULT 'produccion',
            requested_by TEXT NOT NULL DEFAULT 'sistema',
            approved_by TEXT NOT NULL DEFAULT '',
            sent_to_sap_at TIMESTAMPTZ NULL,
            approved_at TIMESTAMPTZ NULL,
            last_error TEXT NOT NULL DEFAULT '',
            sap_doc_entry TEXT NOT NULL DEFAULT '',
            summary JSONB NOT NULL DEFAULT '{}'::jsonb,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS production_material_requests_order_idx ON production_material_requests (order_code, created_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS production_material_requests_status_idx ON production_material_requests (status, created_at DESC)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS production_material_request_lines (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            request_id UUID NOT NULL REFERENCES production_material_requests(id) ON DELETE CASCADE,
            line_number INTEGER NOT NULL DEFAULT 1,
            local_kind TEXT NOT NULL DEFAULT 'materiales',
            local_id TEXT NOT NULL DEFAULT '',
            local_code TEXT NOT NULL DEFAULT '',
            local_name TEXT NOT NULL DEFAULT '',
            sap_item_code TEXT NOT NULL DEFAULT '',
            sap_item_name TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            required_qty NUMERIC NOT NULL DEFAULT 0,
            issued_qty NUMERIC NOT NULL DEFAULT 0,
            uom TEXT NOT NULL DEFAULT '',
            warehouse_code TEXT NOT NULL DEFAULT '',
            line_status TEXT NOT NULL DEFAULT 'pendiente',
            source_type TEXT NOT NULL DEFAULT 'material_principal',
            source_ref TEXT NOT NULL DEFAULT '',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (request_id, line_number)
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS production_material_request_lines_request_idx ON production_material_request_lines (request_id, line_status)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_outbox (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            queue_code TEXT NOT NULL UNIQUE,
            module_name TEXT NOT NULL DEFAULT 'sap',
            entity_type TEXT NOT NULL,
            action_type TEXT NOT NULL,
            provider TEXT NOT NULL DEFAULT 'service-layer',
            reference_id TEXT NOT NULL DEFAULT '',
            reference_code TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            priority INTEGER NOT NULL DEFAULT 100,
            attempt_count INTEGER NOT NULL DEFAULT 0,
            next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            processed_at TIMESTAMPTZ NULL,
            last_error TEXT NOT NULL DEFAULT '',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_outbox_status_idx ON sap_outbox (status, next_attempt_at, priority, created_at)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_outbox_reference_idx ON sap_outbox (entity_type, reference_code)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_outbox_attempts (
            id BIGSERIAL PRIMARY KEY,
            outbox_id UUID NOT NULL REFERENCES sap_outbox(id) ON DELETE CASCADE,
            attempt_number INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT '',
            error_message TEXT NOT NULL DEFAULT '',
            request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_outbox_attempts_outbox_idx ON sap_outbox_attempts (outbox_id, created_at DESC)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_salesperson_profit_centers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            salesperson_name TEXT NOT NULL,
            sales_person_code INTEGER NULL,
            profit_center_code TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (salesperson_name)
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_salesperson_profit_centers_active_idx ON sap_salesperson_profit_centers (is_active, salesperson_name)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_production_cost_center_settings (
            id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            default_cost_center_code TEXT NOT NULL DEFAULT '',
            notes TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        INSERT INTO sap_production_cost_center_settings (id, default_cost_center_code, notes)
        VALUES (1, '', '')
        ON CONFLICT (id) DO NOTHING
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_sync_jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            job_code TEXT NOT NULL UNIQUE,
            entity_name TEXT NOT NULL,
            direction TEXT NOT NULL DEFAULT 'pull',
            status TEXT NOT NULL DEFAULT 'pending',
            filters JSONB NOT NULL DEFAULT '{}'::jsonb,
            records_count INTEGER NOT NULL DEFAULT 0,
            message TEXT NOT NULL DEFAULT '',
            started_at TIMESTAMPTZ NULL,
            finished_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_sync_jobs_status_idx ON sap_sync_jobs (status, created_at DESC)`);
    for (const definition of Object.values(SAP_IMPORT_JOB_DEFS)) {
        await pgQuery(`
            INSERT INTO sap_sync_jobs (job_code, entity_name, direction, status, filters, message)
            VALUES ($1, $2, 'pull', 'idle', $3::jsonb, 'Pendiente de configurar automatización.')
            ON CONFLICT (job_code) DO NOTHING
        `, [
            definition.jobCode,
            definition.entityLabel,
            JSON.stringify(definition.defaultFilters)
        ]);
    }
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
               provider = $2,
               sap_host = $3,
               sap_port = $4,
               sap_protocol = $5,
               sap_user = $6,
               sap_password = $7,
               sap_company = $8,
               di_api_base_url = $9,
               di_api_timeout_ms = $10,
               auto_sync_enabled = $11,
               sync_interval_minutes = $12,
               allow_self_signed = $13,
               keep_demo_enabled = $14,
               updated_at = NOW()
         WHERE id = 1
    `, [
        merged.mode,
        merged.provider,
        merged.sapHost,
        merged.sapPort,
        merged.sapProtocol,
        merged.sapUser,
        merged.sapPassword,
        merged.sapCompany,
        merged.diApiBaseUrl,
        merged.diApiTimeoutMs,
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
    const liveConfig = assertLiveSapConfigReady(config, 'La sincronización');
    if (isDiApiProvider(liveConfig)) {
        return diApiBridge.fetchSyncRecords(liveConfig, entityName);
    }
    const definition = SYNC_ENTITY_DEFS[entityName];
    if (!definition) {
        throw new Error(`La entidad SAP ${entityName} no esta soportada para sincronizacion.`);
    }
    return fetchPagedFromSap(liveConfig, entityName, definition.query, definition.pageSize);
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
            source: 'sap',
            provider: isDiApiProvider({ provider: row.provider || row.__sapProvider }) ? 'di-api' : 'service-layer',
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

        if (partnerCode) {
            await client.query(`
                INSERT INTO "OCRD" (
                    "CardCode", "CardName", "CardType", "Currency", "LicTradNum", "FederalTaxID",
                    "Phone1", "E_Mail", "CntctPrsn", "ListNum", "validFor", "frozenFor", "Balance",
                    raw_data, synced_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,NOW())
                ON CONFLICT ("CardCode")
                DO UPDATE SET
                    "CardName" = EXCLUDED."CardName",
                    "CardType" = EXCLUDED."CardType",
                    "Currency" = EXCLUDED."Currency",
                    "LicTradNum" = EXCLUDED."LicTradNum",
                    "FederalTaxID" = EXCLUDED."FederalTaxID",
                    "Phone1" = EXCLUDED."Phone1",
                    "E_Mail" = EXCLUDED."E_Mail",
                    "CntctPrsn" = EXCLUDED."CntctPrsn",
                    "ListNum" = EXCLUDED."ListNum",
                    "validFor" = EXCLUDED."validFor",
                    "frozenFor" = EXCLUDED."frozenFor",
                    "Balance" = EXCLUDED."Balance",
                    raw_data = EXCLUDED.raw_data,
                    synced_at = NOW()
            `, [
                partnerCode,
                partnerName,
                cardType,
                currency,
                sapText(row.LicTradNum || taxId),
                sapText(row.FederalTaxID || taxId),
                phone,
                email,
                contactPerson,
                sapNumber(row.PriceListNum || row.ListNum),
                sapText(row.validFor || row.ValidFor || 'Y', 'Y'),
                sapText(row.frozenFor || row.FrozenFor || 'N', 'N'),
                balance,
                JSON.stringify(row || {})
            ]);
            await client.query(`DELETE FROM "CRD1" WHERE "CardCode" = $1`, [partnerCode]);
            for (const address of (Array.isArray(row.BPAddresses) ? row.BPAddresses : [])) {
                await client.query(`
                    INSERT INTO "CRD1" (
                        "CardCode", "Address", "AdresType", "Street", "Block", "City",
                        "County", "State", "Country", "ZipCode", raw_data, synced_at
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW())
                    ON CONFLICT ("CardCode", "Address", "AdresType")
                    DO UPDATE SET
                        "Street" = EXCLUDED."Street",
                        "Block" = EXCLUDED."Block",
                        "City" = EXCLUDED."City",
                        "County" = EXCLUDED."County",
                        "State" = EXCLUDED."State",
                        "Country" = EXCLUDED."Country",
                        "ZipCode" = EXCLUDED."ZipCode",
                        raw_data = EXCLUDED.raw_data,
                        synced_at = NOW()
                `, [
                    partnerCode,
                    sapText(address.AddressName || address.Address),
                    sapText(address.AddressType || address.AdresType),
                    sapText(address.Street),
                    sapText(address.Block),
                    sapText(address.City),
                    sapText(address.County),
                    sapText(address.State),
                    sapText(address.Country),
                    sapText(address.ZipCode),
                    JSON.stringify(address || {})
                ]);
            }
            const contacts = Array.isArray(row.ContactEmployees) ? row.ContactEmployees : [];
            const contactRows = contacts.length ? contacts : (contactPerson ? [{ Name: contactPerson, FirstName: contactPerson, E_MailL: email, Tel1: phone, Position: 'Principal' }] : []);
            for (const contact of contactRows) {
                const name = sapText(contact.Name || contact.ContactName || contactPerson);
                if (!name) continue;
                await client.query(`
                    INSERT INTO "OCPR" (
                        "CardCode", "Name", "FirstName", "LastName", "E_MailL",
                        "Tel1", "Cellolar", "Position", raw_data, synced_at
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW())
                    ON CONFLICT ("CardCode", "Name")
                    DO UPDATE SET
                        "FirstName" = EXCLUDED."FirstName",
                        "LastName" = EXCLUDED."LastName",
                        "E_MailL" = EXCLUDED."E_MailL",
                        "Tel1" = EXCLUDED."Tel1",
                        "Cellolar" = EXCLUDED."Cellolar",
                        "Position" = EXCLUDED."Position",
                        raw_data = EXCLUDED.raw_data,
                        synced_at = NOW()
                `, [
                    partnerCode,
                    name,
                    sapText(contact.FirstName || name),
                    sapText(contact.LastName),
                    sapText(contact.E_MailL || contact.Email || email),
                    sapText(contact.Tel1 || contact.Phone1 || phone),
                    sapText(contact.Cellolar || contact.MobilePhone),
                    sapText(contact.Position),
                    JSON.stringify(contact || {})
                ]);
            }
        }

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
        const itemCode = normalizeText(row.ItemCode);
        const itemName = normalizeText(row.ItemName);
        const itemGroupCode = normalizeText(row.ItemsGroupCode || row.ItemGroup);
        const classificationSourceValue = normalizeText(
            row.U_ClasificacionERP
            || row.U_CategoriaFlexo
            || row.U_ClasificacionFlexo
            || row.ClassificationSourceValue
        );
        const onHand = row.OnHand == null ? null : Number(row.OnHand);
        const committedQty = row.CommitedQty == null && row.CommittedQty == null ? null : Number(row.CommitedQty != null ? row.CommitedQty : row.CommittedQty);
        const availableQty = row.AvailableQuantity == null && row.AvailableQty == null ? null : Number(row.AvailableQuantity != null ? row.AvailableQuantity : row.AvailableQty);
        const buyUnit = normalizeText(row.BuyUnitMsr);
        if (itemCode) {
            await client.query(`
                INSERT INTO "OITM" (
                    "ItemCode", "ItemName", "ItmsGrpCod", "U_ClasificacionERP", "InvntryUom", "BuyUnitMsr", "SalUnitMsr",
                    "validFor", "frozenFor", "OnHand", "IsCommited", "OnOrder", "AvgPrice",
                    "LastPurPrc", "Price", "Currency", raw_data, synced_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,NOW())
                ON CONFLICT ("ItemCode")
                DO UPDATE SET
                    "ItemName" = EXCLUDED."ItemName",
                    "ItmsGrpCod" = EXCLUDED."ItmsGrpCod",
                    "U_ClasificacionERP" = COALESCE(NULLIF(EXCLUDED."U_ClasificacionERP", ''), "OITM"."U_ClasificacionERP"),
                    "InvntryUom" = EXCLUDED."InvntryUom",
                    "BuyUnitMsr" = EXCLUDED."BuyUnitMsr",
                    "SalUnitMsr" = EXCLUDED."SalUnitMsr",
                    "validFor" = EXCLUDED."validFor",
                    "frozenFor" = EXCLUDED."frozenFor",
                    "OnHand" = EXCLUDED."OnHand",
                    "IsCommited" = EXCLUDED."IsCommited",
                    "OnOrder" = EXCLUDED."OnOrder",
                    "AvgPrice" = EXCLUDED."AvgPrice",
                    "LastPurPrc" = EXCLUDED."LastPurPrc",
                    "Price" = EXCLUDED."Price",
                    "Currency" = EXCLUDED."Currency",
                    raw_data = EXCLUDED.raw_data,
                    synced_at = NOW()
            `, [
                itemCode,
                itemName,
                itemGroupCode,
                classificationSourceValue,
                sapText(row.InvntryUom || buyUnit),
                buyUnit,
                sapText(row.SalesUnitMsr || row.SalUnitMsr),
                sapText(row.validFor || row.ValidFor || 'Y', 'Y'),
                sapText(row.frozenFor || row.FrozenFor || 'N', 'N'),
                onHand,
                committedQty,
                sapNumber(row.OnOrder),
                sapNumber(row.AvgPrice),
                sapNumber(row.LastPurPrc),
                sapNumber(getSapItemPrice(row)),
                sapText(row.Currency),
                JSON.stringify(row || {})
            ]);
            const warehouseRows = Array.isArray(row.ItemWarehouseInfoCollection) ? row.ItemWarehouseInfoCollection : [];
            const normalizedWarehouses = warehouseRows.length ? warehouseRows : [{
                WarehouseCode: row.WarehouseCode || row.WhsCode || '',
                InStock: onHand,
                Committed: committedQty,
                Ordered: row.OnOrder,
                AvailableQuantity: availableQty
            }];
            for (const warehouseRow of normalizedWarehouses) {
                await client.query(`
                    INSERT INTO "OITW" (
                        "ItemCode", "WhsCode", "OnHand", "IsCommited", "OnOrder",
                        "AvailableQuantity", raw_data, synced_at
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())
                    ON CONFLICT ("ItemCode", "WhsCode")
                    DO UPDATE SET
                        "OnHand" = EXCLUDED."OnHand",
                        "IsCommited" = EXCLUDED."IsCommited",
                        "OnOrder" = EXCLUDED."OnOrder",
                        "AvailableQuantity" = EXCLUDED."AvailableQuantity",
                        raw_data = EXCLUDED.raw_data,
                        synced_at = NOW()
                `, [
                    itemCode,
                    sapText(warehouseRow.WarehouseCode || warehouseRow.WhsCode),
                    sapNumber(warehouseRow.InStock ?? warehouseRow.OnHand ?? onHand),
                    sapNumber(warehouseRow.Committed ?? warehouseRow.IsCommited ?? committedQty),
                    sapNumber(warehouseRow.Ordered ?? warehouseRow.OnOrder),
                    sapNumber(warehouseRow.AvailableQuantity ?? warehouseRow.AvailableQty ?? availableQty),
                    JSON.stringify(warehouseRow || {})
                ]);
            }
            for (const priceRow of getSapItemPriceRows(row)) {
                await client.query(`
                    INSERT INTO "ITM1" (
                        "ItemCode", "PriceList", "Price", "Currency", raw_data, synced_at
                    )
                    VALUES ($1,$2,$3,$4,$5::jsonb,NOW())
                    ON CONFLICT ("ItemCode", "PriceList")
                    DO UPDATE SET
                        "Price" = EXCLUDED."Price",
                        "Currency" = EXCLUDED."Currency",
                        raw_data = EXCLUDED.raw_data,
                        synced_at = NOW()
                `, [
                    itemCode,
                    priceRow.PriceList || 1,
                    priceRow.Price,
                    priceRow.Currency,
                    JSON.stringify(priceRow.raw_data || {})
                ]);
            }
        }
        await client.query(`
            INSERT INTO sap_items (
                item_code,
                item_name,
                item_group_code,
                classification_source_value,
                on_hand,
                available_quantity,
                price,
                currency,
                buy_unit_msr,
                sales_unit_msr,
                payload,
                synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
            ON CONFLICT (item_code)
            DO UPDATE SET
                item_name = EXCLUDED.item_name,
                item_group_code = EXCLUDED.item_group_code,
                classification_source_value = COALESCE(NULLIF(EXCLUDED.classification_source_value, ''), sap_items.classification_source_value),
                on_hand = EXCLUDED.on_hand,
                available_quantity = EXCLUDED.available_quantity,
                price = EXCLUDED.price,
                currency = EXCLUDED.currency,
                buy_unit_msr = EXCLUDED.buy_unit_msr,
                sales_unit_msr = EXCLUDED.sales_unit_msr,
                payload = EXCLUDED.payload,
                synced_at = NOW()
        `, [
            itemCode,
            itemName,
            itemGroupCode,
            classificationSourceValue,
            onHand,
            availableQty,
            row.Price == null ? null : Number(row.Price),
            normalizeText(row.Currency),
            buyUnit,
            normalizeText(row.SalesUnitMsr),
            JSON.stringify(row || {})
        ]);
        await client.query(`
            INSERT INTO sap_inventory_snapshot (
                sap_item_code,
                warehouse_code,
                item_name,
                item_group_code,
                on_hand,
                committed_quantity,
                available_quantity,
                uom,
                snapshot_source,
                payload,
                snapshot_at,
                updated_at
            )
            VALUES ($1, '', $2, $3, $4, $5, $6, $7, 'sap_items', $8::jsonb, NOW(), NOW())
            ON CONFLICT (sap_item_code, warehouse_code)
            DO UPDATE SET
                item_name = EXCLUDED.item_name,
                item_group_code = EXCLUDED.item_group_code,
                on_hand = EXCLUDED.on_hand,
                committed_quantity = EXCLUDED.committed_quantity,
                available_quantity = EXCLUDED.available_quantity,
                uom = EXCLUDED.uom,
                payload = EXCLUDED.payload,
                snapshot_source = EXCLUDED.snapshot_source,
                snapshot_at = NOW(),
                updated_at = NOW()
        `, [
            itemCode,
            itemName,
            itemGroupCode,
            onHand,
            committedQty,
            availableQty,
            buyUnit,
            JSON.stringify(row || {})
        ]);
    }
}

async function upsertWarehouses(client, records) {
    for (const row of records) {
        await client.query(`
            INSERT INTO "OWHS" ("WhsCode", "WhsName", "Location", raw_data, synced_at)
            VALUES ($1,$2,$3,$4::jsonb,NOW())
            ON CONFLICT ("WhsCode")
            DO UPDATE SET
                "WhsName" = EXCLUDED."WhsName",
                "Location" = EXCLUDED."Location",
                raw_data = EXCLUDED.raw_data,
                synced_at = NOW()
        `, [
            normalizeText(row.WarehouseCode || row.WhsCode),
            normalizeText(row.WarehouseName || row.WhsName),
            normalizeText(row.Location),
            JSON.stringify(row || {})
        ]);
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
        const docEntry = Number(row.DocEntry);
        if (Number.isFinite(docEntry)) {
            await client.query(`
                INSERT INTO "ORDR" (
                    "DocEntry", "DocNum", "CardCode", "CardName", "DocDate", "DocDueDate",
                    "DocTotal", "Currency", "DocStatus", "Comments", raw_data, exported_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW())
                ON CONFLICT ("DocEntry")
                DO UPDATE SET
                    "DocNum" = EXCLUDED."DocNum",
                    "CardCode" = EXCLUDED."CardCode",
                    "CardName" = EXCLUDED."CardName",
                    "DocDate" = EXCLUDED."DocDate",
                    "DocDueDate" = EXCLUDED."DocDueDate",
                    "DocTotal" = EXCLUDED."DocTotal",
                    "Currency" = EXCLUDED."Currency",
                    "DocStatus" = EXCLUDED."DocStatus",
                    "Comments" = EXCLUDED."Comments",
                    raw_data = EXCLUDED.raw_data,
                    exported_at = NOW()
            `, [
                docEntry,
                normalizeText(row.DocNum),
                normalizeText(row.CardCode),
                normalizeText(row.CardName),
                normalizeText(row.DocDate),
                normalizeText(row.DocDueDate),
                row.DocTotal == null ? null : Number(row.DocTotal),
                normalizeText(row.Currency),
                normalizeText(row.DocumentStatus || row.DocStatus),
                normalizeText(row.Comments),
                JSON.stringify(row || {})
            ]);
            const lines = Array.isArray(row.DocumentLines) ? row.DocumentLines : [];
            for (let index = 0; index < lines.length; index += 1) {
                const line = lines[index] || {};
                await client.query(`
                    INSERT INTO "RDR1" (
                        "DocEntry", "LineNum", "ItemCode", "Dscription", "Quantity",
                        "Price", "LineTotal", "WhsCode", raw_data, exported_at
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW())
                    ON CONFLICT ("DocEntry", "LineNum")
                    DO UPDATE SET
                        "ItemCode" = EXCLUDED."ItemCode",
                        "Dscription" = EXCLUDED."Dscription",
                        "Quantity" = EXCLUDED."Quantity",
                        "Price" = EXCLUDED."Price",
                        "LineTotal" = EXCLUDED."LineTotal",
                        "WhsCode" = EXCLUDED."WhsCode",
                        raw_data = EXCLUDED.raw_data,
                        exported_at = NOW()
                `, [
                    docEntry,
                    sapNumber(line.LineNum, index),
                    sapText(line.ItemCode),
                    sapText(line.ItemDescription || line.Dscription || line.Description),
                    sapNumber(line.Quantity),
                    sapNumber(line.Price),
                    sapNumber(line.LineTotal),
                    sapText(line.WarehouseCode || line.WhsCode),
                    JSON.stringify(line || {})
                ]);
            }
        }
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
        ['invoices', 'sap_invoices'],
        ['salespersons', 'sap_salesperson_profit_centers']
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
    const salespersons = await listSapSalespersonProfitCenters(pgQuery);
    const productionCostCenter = await loadSapProductionCostCenterSettings(pgQuery);
    return {
        counts,
        recentSync: syncResult.rows,
        salespersons: salespersons.slice(0, 12),
        productionCostCenter
    };
}

function getSapMirrorTableConfig(tableName) {
    const normalized = String(tableName || '').trim().toUpperCase();
    const config = SAP_MIRROR_TABLES[normalized];
    if (!config) throw new Error('Tabla SAP no soportada.');
    return { tableName: normalized, ...config };
}

async function loadSapMirrorSummary(pgQuery) {
    const tables = [];
    for (const tableName of Object.keys(SAP_MIRROR_TABLES)) {
        const config = SAP_MIRROR_TABLES[tableName];
        const countResult = await pgQuery(`SELECT COUNT(*)::int AS total FROM "${tableName}"`);
        tables.push({
            tableName,
            ...config,
            total: Number(countResult.rows[0]?.total || 0)
        });
    }
    return {
        ok: true,
        groups: {
            socios: 'Importación de socios',
            inventario: 'Importación de artículos de inventario',
            ordenes: 'Exportación de órdenes',
            bom: 'Envío de BOM / producción'
        },
        tables
    };
}

async function listSapMirrorTable(pgQuery, tableName, query = {}) {
    const config = getSapMirrorTableConfig(tableName);
    const limit = normalizePositiveInt(query.limit, 50, 1, 300);
    const search = normalizeText(query.search).toLowerCase();
    const values = [];
    const where = [];
    if (search) {
        values.push(`%${search}%`);
        const searchClauses = config.columns
            .slice(0, 6)
            .map((column) => `LOWER(COALESCE("${column}"::text, '')) LIKE $${values.length}`);
        where.push(`(${searchClauses.join(' OR ')})`);
    }
    values.push(limit);
    const orderColumn = config.columns.includes(config.key) ? config.key : config.columns[0];
    const selectColumns = config.columns.map((column) => `"${column}"`).join(', ');
    const result = await pgQuery(`
        SELECT ${selectColumns}
          FROM "${config.tableName}"
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY "${orderColumn}" ASC
         LIMIT $${values.length}
    `, values);
    return {
        ok: true,
        table: config,
        rows: result.rows
    };
}

function getSapMirrorProcessDefinition(processKey) {
    const key = normalizeText(processKey || 'import-business-partners');
    return SAP_MIRROR_PROCESS_DEFS[key] || SAP_MIRROR_PROCESS_DEFS['import-business-partners'];
}

function getSapImportJobDefinition(jobCode = '') {
    const key = normalizeText(jobCode);
    const definition = SAP_IMPORT_JOB_DEFS[key];
    if (!definition) throw new Error('Trabajo de importación SAP no soportado.');
    return definition;
}

function normalizeSapImportJobFilters(jobCode, input = {}) {
    const definition = getSapImportJobDefinition(jobCode);
    const source = { ...definition.defaultFilters, ...(input || {}) };
    const normalized = {
        enabled: normalizeBoolean(source.enabled, definition.defaultFilters.enabled),
        intervalMinutes: normalizePositiveInt(source.intervalMinutes, definition.defaultFilters.intervalMinutes, 5, 1440),
        limit: normalizePositiveInt(source.limit, definition.defaultFilters.limit, 1, 1000),
        search: normalizeText(source.search)
    };
    if (Object.prototype.hasOwnProperty.call(definition.defaultFilters, 'type')) normalized.type = normalizeText(source.type);
    if (Object.prototype.hasOwnProperty.call(definition.defaultFilters, 'group')) normalized.group = normalizeText(source.group);
    return normalized;
}

function buildSapImportJobPublicRow(row = {}) {
    const definition = getSapImportJobDefinition(row.job_code || row.jobCode);
    const filters = normalizeSapImportJobFilters(definition.jobCode, row.filters || {});
    const finishedAt = row.finished_at || row.finishedAt || null;
    const nextRunAt = filters.enabled && finishedAt
        ? new Date(new Date(finishedAt).getTime() + (filters.intervalMinutes * 60 * 1000)).toISOString()
        : (filters.enabled ? new Date().toISOString() : null);
    return {
        id: row.id,
        jobCode: definition.jobCode,
        label: definition.label,
        entityLabel: definition.entityLabel,
        filters,
        status: normalizeText(row.status || 'idle') || 'idle',
        recordsCount: Number(row.records_count || row.recordsCount || 0),
        message: normalizeText(row.message),
        startedAt: row.started_at || row.startedAt || null,
        finishedAt,
        nextRunAt
    };
}

function normalizeSapSalespersonProfitCenterRow(row = {}) {
    return {
        id: normalizeText(row.id),
        salespersonName: normalizeText(row.salesperson_name),
        salesPersonCode: row.sales_person_code == null ? null : Number(row.sales_person_code),
        profitCenterCode: normalizeText(row.profit_center_code),
        notes: normalizeText(row.notes),
        isActive: row.is_active !== false,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null
    };
}

function normalizeSapProductionCostCenterSettingsRow(row = {}) {
    return {
        defaultCostCenterCode: normalizeText(row.default_cost_center_code),
        notes: normalizeText(row.notes),
        updatedAt: row.updated_at || null
    };
}

async function listSapSalespersonProfitCenters(pgQuery) {
    const result = await pgQuery(`
        SELECT id, salesperson_name, sales_person_code, profit_center_code, notes, is_active, created_at, updated_at
          FROM sap_salesperson_profit_centers
      ORDER BY is_active DESC, LOWER(salesperson_name), created_at DESC
    `);
    return result.rows.map(normalizeSapSalespersonProfitCenterRow);
}

async function saveSapSalespersonProfitCenter(pgQuery, payload = {}) {
    const salespersonName = normalizeText(payload.salespersonName || payload.salesperson_name);
    const profitCenterCode = normalizeText(payload.profitCenterCode || payload.profit_center_code);
    const rawSalesPersonCode = payload.salesPersonCode ?? payload.sales_person_code;
    const salesPersonCode = rawSalesPersonCode == null || rawSalesPersonCode === '' ? null : Number(rawSalesPersonCode);
    if (!salespersonName) {
        throw new Error('Debes indicar el nombre del ejecutivo de ventas.');
    }
    if (!profitCenterCode) {
        throw new Error('Debes indicar el centro de beneficio.');
    }
    if (salesPersonCode != null && !Number.isFinite(salesPersonCode)) {
        throw new Error('El código de vendedor SAP no es válido.');
    }
    const result = await pgQuery(`
        INSERT INTO sap_salesperson_profit_centers (
            salesperson_name, sales_person_code, profit_center_code, notes, is_active, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,NOW())
        ON CONFLICT (salesperson_name)
        DO UPDATE SET
            sales_person_code = EXCLUDED.sales_person_code,
            profit_center_code = EXCLUDED.profit_center_code,
            notes = EXCLUDED.notes,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING id, salesperson_name, sales_person_code, profit_center_code, notes, is_active, created_at, updated_at
    `, [
        salespersonName,
        salesPersonCode,
        profitCenterCode,
        normalizeText(payload.notes),
        payload.isActive !== false && payload.is_active !== false
    ]);
    return normalizeSapSalespersonProfitCenterRow(result.rows[0]);
}

async function deleteSapSalespersonProfitCenter(pgQuery, id) {
    const result = await pgQuery(`
        DELETE FROM sap_salesperson_profit_centers
         WHERE id = $1::uuid
     RETURNING id
    `, [id]);
    if (!result.rows.length) {
        throw new Error('Configuración por ejecutivo no encontrada.');
    }
    return { ok: true, id: normalizeText(result.rows[0].id) };
}

async function loadSapProductionCostCenterSettings(pgQuery) {
    const result = await pgQuery(`
        SELECT default_cost_center_code, notes, updated_at
          FROM sap_production_cost_center_settings
         WHERE id = 1
         LIMIT 1
    `);
    return normalizeSapProductionCostCenterSettingsRow(result.rows[0] || {});
}

async function saveSapProductionCostCenterSettings(pgQuery, payload = {}) {
    const defaultCostCenterCode = normalizeText(payload.defaultCostCenterCode || payload.default_cost_center_code);
    const result = await pgQuery(`
        UPDATE sap_production_cost_center_settings
           SET default_cost_center_code = $1,
               notes = $2,
               updated_at = NOW()
         WHERE id = 1
     RETURNING default_cost_center_code, notes, updated_at
    `, [
        defaultCostCenterCode,
        normalizeText(payload.notes)
    ]);
    return normalizeSapProductionCostCenterSettingsRow(result.rows[0] || {});
}

async function findSapSalespersonProfitCenter(pgQuery, payload = {}) {
    const rawSalesPersonCode = payload.salesPersonCode ?? payload.sales_person_code ?? payload.SalesPersonCode;
    const salesPersonCode = rawSalesPersonCode == null || rawSalesPersonCode === '' ? null : sapNumber(rawSalesPersonCode, null);
    const normalizedSalesPersonCode = salesPersonCode != null && Number.isFinite(salesPersonCode) && salesPersonCode >= 0
        ? Number(salesPersonCode)
        : null;
    const salespersonName = normalizeText(payload.salespersonName || payload.salesperson_name || payload.SalesPersonName);
    if (normalizedSalesPersonCode != null) {
        const result = await pgQuery(`
            SELECT id, salesperson_name, sales_person_code, profit_center_code, notes, is_active, created_at, updated_at
              FROM sap_salesperson_profit_centers
             WHERE is_active = TRUE
               AND sales_person_code = $1
             LIMIT 1
        `, [normalizedSalesPersonCode]);
        if (result.rows.length) return normalizeSapSalespersonProfitCenterRow(result.rows[0]);
    }
    if (!salespersonName) return null;
    const result = await pgQuery(`
        SELECT id, salesperson_name, sales_person_code, profit_center_code, notes, is_active, created_at, updated_at
          FROM sap_salesperson_profit_centers
         WHERE is_active = TRUE
           AND LOWER(salesperson_name) = LOWER($1)
         LIMIT 1
    `, [salespersonName]);
    return result.rows.length ? normalizeSapSalespersonProfitCenterRow(result.rows[0]) : null;
}

async function enrichOrderPayloadWithProfitCenter(pgQuery, body = {}, requestPayload = {}) {
    const rawSalesPersonCode = requestPayload.SalesPersonCode ?? body.salesPersonCode ?? body.sales_person_code;
    const salesPersonCode = rawSalesPersonCode == null || rawSalesPersonCode === '' ? null : sapNumber(rawSalesPersonCode, null);
    const normalizedSalesPersonCode = salesPersonCode != null && Number.isFinite(salesPersonCode) && salesPersonCode >= 0
        ? Number(salesPersonCode)
        : null;
    const salespersonName = normalizeText(body.salespersonName || body.salesperson_name || body.SalesPersonName);
    if (normalizedSalesPersonCode == null && !salespersonName) {
        return requestPayload;
    }
    const salespersonConfig = await findSapSalespersonProfitCenter(pgQuery, {
        salesPersonCode: normalizedSalesPersonCode,
        salespersonName
    });
    if (!salespersonConfig) {
        throw new Error('No existe configuración de centro de beneficio para el ejecutivo de ventas indicado.');
    }
    const profitCenterCode = normalizeText(salespersonConfig.profitCenterCode);
    if (!profitCenterCode) {
        throw new Error('El ejecutivo de ventas indicado no tiene centro de beneficio configurado.');
    }
    return {
        ...requestPayload,
        ...(salespersonConfig.salesPersonCode != null ? { SalesPersonCode: salespersonConfig.salesPersonCode } : {}),
        DocumentLines: (Array.isArray(requestPayload.DocumentLines) ? requestPayload.DocumentLines : []).map((line) => ({
            ...line,
            CostingCode: profitCenterCode
        }))
    };
}

function applyProductionCostCenterToPayload(requestPayload = {}, defaultCostCenterCode = '', contextLabel = 'la transacción de producción') {
    const lines = Array.isArray(requestPayload.DocumentLines) ? requestPayload.DocumentLines : [];
    if (!lines.length) return requestPayload;
    if (defaultCostCenterCode) {
        return {
            ...requestPayload,
            DocumentLines: lines.map((line) => ({
                ...line,
                CostingCode: defaultCostCenterCode
            }))
        };
    }
    const hasMissingCostCenter = lines.some((line) => !normalizeText(line.CostingCode));
    if (hasMissingCostCenter) {
        throw new Error(`Debes configurar el centro de costo de producción antes de enviar ${contextLabel}.`);
    }
    return requestPayload;
}

async function listSapImportJobs(pgQuery) {
    const result = await pgQuery(`
        SELECT *
          FROM sap_sync_jobs
         WHERE job_code = ANY($1::text[])
      ORDER BY created_at ASC
    `, [Object.keys(SAP_IMPORT_JOB_DEFS)]);
    return result.rows.map(buildSapImportJobPublicRow);
}

async function saveSapImportJob(pgQuery, jobCode, input = {}) {
    const definition = getSapImportJobDefinition(jobCode);
    const result = await pgQuery(`
        SELECT *
          FROM sap_sync_jobs
         WHERE job_code = $1
         LIMIT 1
    `, [definition.jobCode]);
    if (!result.rows.length) throw new Error('No se encontró el trabajo de importación SAP.');
    const current = result.rows[0];
    const filters = normalizeSapImportJobFilters(definition.jobCode, {
        ...(current.filters || {}),
        ...(input || {})
    });
    const status = filters.enabled ? (normalizeText(current.status) || 'idle') : 'paused';
    const update = await pgQuery(`
        UPDATE sap_sync_jobs
           SET filters = $2::jsonb,
               status = $3,
               updated_at = NOW()
         WHERE job_code = $1
     RETURNING *
    `, [
        definition.jobCode,
        JSON.stringify(filters),
        status
    ]);
    return buildSapImportJobPublicRow(update.rows[0]);
}

async function getSapConnectorHealth(config = {}) {
    if (!isDiApiProvider(config)) {
        return { ok: true, provider: normalizeSapProvider(config.provider), message: 'Proveedor Service Layer configurado.' };
    }
    try {
        return await diApiBridge.testConnection(config);
    } catch (error) {
        return {
            ok: false,
            provider: 'di-api',
            message: error.message || 'No fue posible validar el conector DI API.'
        };
    }
}

function isMockSapConnectorHealth(health = {}) {
    const dataSource = normalizeText(health.dataSource || health.raw?.dataSource || health.raw?.DataSource).toLowerCase();
    return dataSource.endsWith('.json') || dataSource.includes('db.json') || dataSource.includes('datos internos');
}

function buildMockConnectorError(health = {}) {
    const dataSource = normalizeText(health.dataSource || health.raw?.dataSource || health.raw?.DataSource, 'datos internos');
    const partnerCount = health.businessPartners ?? health.raw?.businessPartners ?? '';
    const itemCount = health.items ?? health.raw?.items ?? '';
    return [
        'El conector DI API no está consultando SAP real.',
        `Fuente actual: ${dataSource}.`,
        `El propio conector reporta ${partnerCount || 0} socios y ${itemCount || 0} artículos en esa fuente.`,
        'Configura el conector con SAPServer, Database, SAPUser, contraseña SAP, SQL y LicenseServer antes de importar.'
    ].join(' ');
}

function buildSapMirrorOrderTemplate() {
    return {
        CardCode: 'C001',
        CardName: 'Cliente SAP',
        DocDate: new Date().toISOString().slice(0, 10),
        DocDueDate: new Date().toISOString().slice(0, 10),
        Currency: 'CRC',
        Comments: 'Orden preparada desde ERP',
        DocumentLines: [
            { ItemCode: 'SRV-001', ItemDescription: 'Servicio de impresión', Quantity: 1, Price: 0, WarehouseCode: '01' }
        ]
    };
}

function buildSapMirrorBomTemplate() {
    return {
        ItemCode: 'PROD-SAP',
        ProdName: 'Producto preparado desde cotización',
        PlannedQty: 1,
        TreeType: 'P',
        Comments: 'BOM preparado desde ERP',
        components: [
            { ItemCode: 'INS-030', ItemName: 'Sustrato', Quantity: 1, Warehouse: '01' },
            { ItemCode: 'INS-020', ItemName: 'Tinta', Quantity: 1, Warehouse: '01' }
        ]
    };
}

function buildSapMirrorImportQuery(processKey, input = {}) {
    const limit = normalizePositiveInt(input.limit || input.top, processKey === 'import-items' ? 50 : 20, 1, 1000);
    const search = normalizeText(input.search);
    const query = {
        top: limit,
        validFor: 'Y'
    };
    if (search) query.search = search;
    if (processKey === 'import-business-partners') {
        query.cardTypes = 'C,L';
        if (normalizeText(input.type)) query.type = normalizeText(input.type);
    }
    if (processKey === 'import-items' && normalizeText(input.group)) {
        query.group = normalizeText(input.group);
    }
    return query;
}

function filterDemoSapRows(rows = [], processKey, query = {}) {
    const search = normalizeText(query.search).toLowerCase();
    const type = normalizeText(query.type);
    const limit = normalizePositiveInt(query.top, rows.length || 1, 1, 1000);
    return rows.filter((row) => {
        if (processKey === 'import-business-partners') {
            const cardType = normalizeText(row.CardType);
            const allowedTypes = type ? [type] : ['C', 'L'];
            if (cardType && !allowedTypes.includes(cardType)) return false;
        }
        if (!search) return true;
        return Object.values(row || {}).some((value) => normalizeText(value).toLowerCase().includes(search));
    }).slice(0, limit);
}

function buildSapMirrorProcedure(config = {}, processKey = 'import-business-partners', input = {}, connectorHealth = null) {
    const definition = getSapMirrorProcessDefinition(processKey);
    const mode = resolveOperatingMode(config);
    const provider = normalizeSapProvider(config.provider || config.sapProvider);
    const importQuery = definition.direction === 'import' ? buildSapMirrorImportQuery(processKey, input) : null;
    const exportInput = { ...(input || {}) };
    delete exportInput.processKey;
    delete exportInput.limit;
    delete exportInput.search;
    delete exportInput.demo;
    const hasExportPayload = Object.keys(exportInput).length > 0;
    const payload = processKey === 'export-order'
        ? buildOrderPayload(hasExportPayload ? exportInput : buildSapMirrorOrderTemplate())
        : (processKey === 'export-bom' ? (hasExportPayload ? exportInput : buildSapMirrorBomTemplate()) : null);
    const serviceUrl = provider === 'di-api'
        ? `${normalizeText(config.diApiBaseUrl || config.di_api_base_url).replace(/\/+$/, '')}${definition.diApiRoute.startsWith('/') ? definition.diApiRoute : `/${definition.diApiRoute}`}`
        : `${normalizeText(config.sapServiceUrl || config.sap_service_url).replace(/\/+$/, '')}/${definition.serviceLayerRoute}`;
    return {
        ...definition,
        mode,
        provider,
        connector: connectorHealth,
        connectorUsesLocalSource: connectorHealth ? isMockSapConnectorHealth(connectorHealth) : false,
        connectorWarning: connectorHealth && isMockSapConnectorHealth(connectorHealth) ? buildMockConnectorError(connectorHealth) : '',
        request: definition.direction === 'import'
            ? { method: 'GET', url: serviceUrl, query: importQuery }
            : { method: definition.diApiMethod || 'POST', url: serviceUrl, payload },
        queryText: definition.direction === 'import'
            ? `${definition.sql}\nLIMIT ${importQuery.top};`
            : definition.sql,
        relatedSql: definition.relatedSql || [],
        targetTables: definition.targetTables
    };
}

async function fetchSapMirrorBusinessPartners({ pgQuery, config, limit, search, type, demo = false }) {
    if (!demo && resolveOperatingMode(config) !== 'demo') {
        const health = await getSapConnectorHealth(config);
        if (isMockSapConnectorHealth(health)) {
            throw new Error(buildMockConnectorError(health));
        }
    }
    const query = buildSapMirrorImportQuery('import-business-partners', { limit, search, type });
    if (demo || resolveOperatingMode(config) === 'demo') {
        return filterDemoSapRows(deepClone(demoState.BusinessPartners), 'import-business-partners', query);
    }
    const payload = await queryBusinessPartners({ pgQuery, config, query });
    return (Array.isArray(payload.value) ? payload.value : []).slice(0, query.top);
}

async function fetchSapMirrorItems({ pgQuery, config, limit, search, group, demo = false }) {
    if (!demo && resolveOperatingMode(config) !== 'demo') {
        const health = await getSapConnectorHealth(config);
        if (isMockSapConnectorHealth(health)) {
            throw new Error(buildMockConnectorError(health));
        }
    }
    const query = buildSapMirrorImportQuery('import-items', { limit, search, group });
    if (demo || resolveOperatingMode(config) === 'demo') {
        return filterDemoSapRows(deepClone(demoState.Items), 'import-items', query);
    }
    const payload = await queryItems({ pgQuery, config, query });
    return (Array.isArray(payload.value) ? payload.value : []).slice(0, query.top);
}

async function previewSapMirrorProcess({ pgQuery, processKey, input = {} }) {
    const config = await loadSapConfig(pgQuery);
    const definition = getSapMirrorProcessDefinition(processKey);
    const connectorHealth = await getSapConnectorHealth(config);
    const procedure = buildSapMirrorProcedure(config, definition.key, input, connectorHealth);
    if (!normalizeBoolean(input.demo, false) && resolveOperatingMode(config) !== 'demo' && isMockSapConnectorHealth(connectorHealth)) {
        return {
            ok: false,
            blocked: true,
            error: buildMockConnectorError(connectorHealth),
            procedure,
            rows: [],
            records: 0
        };
    }
    if (definition.key === 'import-business-partners') {
        const rows = await fetchSapMirrorBusinessPartners({
            pgQuery,
            config,
            limit: input.limit,
            search: input.search,
            type: input.type,
            demo: normalizeBoolean(input.demo, false)
        });
        return { ok: true, procedure, rows, records: rows.length };
    }
    if (definition.key === 'import-items') {
        const rows = await fetchSapMirrorItems({
            pgQuery,
            config,
            limit: input.limit,
            search: input.search,
            group: input.group,
            demo: normalizeBoolean(input.demo, false)
        });
        return { ok: true, procedure, rows, records: rows.length };
    }
    return {
        ok: true,
        procedure,
        payload: procedure.request.payload,
        records: Array.isArray(procedure.request.payload?.DocumentLines)
            ? procedure.request.payload.DocumentLines.length
            : (Array.isArray(procedure.request.payload?.components) ? procedure.request.payload.components.length : 1)
    };
}

async function importSapMirrorBusinessPartners({ pgQuery, withTransaction, limit, search, type, demo = false }) {
    const config = await loadSapConfig(pgQuery);
    const records = await fetchSapMirrorBusinessPartners({ pgQuery, config, limit, search, type, demo });
    await withTransaction(async (client) => {
        await upsertBusinessPartners(client, records);
    });
    return {
        ok: true,
        entity: 'BusinessPartners',
        procedure: buildSapMirrorProcedure(config, 'import-business-partners', { limit, search, type }),
        records: records.length,
        tables: ['OCRD', 'CRD1', 'OCPR']
    };
}

async function importSapMirrorItems({ pgQuery, withTransaction, limit, search, group, demo = false }) {
    const config = await loadSapConfig(pgQuery);
    const itemRecords = await fetchSapMirrorItems({ pgQuery, config, limit, search, group, demo });
    let warehouseRecords = [];
    try {
        warehouseRecords = demo || resolveOperatingMode(config) === 'demo'
            ? deepClone(demoState.Warehouses)
            : await fetchSyncRecords(config, 'Warehouses');
    } catch (error) {
        warehouseRecords = [];
    }
    await withTransaction(async (client) => {
        await upsertItems(client, itemRecords);
        if (warehouseRecords.length) await upsertWarehouses(client, warehouseRecords);
    });
    return {
        ok: true,
        entity: 'Items',
        procedure: buildSapMirrorProcedure(config, 'import-items', { limit, search, group }),
        records: itemRecords.length,
        warehouses: warehouseRecords.length,
        tables: ['OITM', 'OITW', 'ITM1', 'OWHS']
    };
}

async function executeSapImportJob({ pgQuery, withTransaction, jobCode, actor = 'scheduler', automated = true }) {
    const definition = getSapImportJobDefinition(jobCode);
    const jobRow = await pgQuery(`
        UPDATE sap_sync_jobs
           SET status = 'running',
               started_at = NOW(),
               updated_at = NOW(),
               message = 'Ejecutando carga automática SAP...'
         WHERE job_code = $1
     RETURNING *
    `, [definition.jobCode]);
    if (!jobRow.rows.length) throw new Error('No se encontró el trabajo de importación SAP.');
    const currentJob = jobRow.rows[0];
    const filters = normalizeSapImportJobFilters(definition.jobCode, currentJob.filters || {});
    const config = await loadSapConfig(pgQuery).catch(() => ({}));
    const startedAt = new Date().toISOString();
    try {
        const payload = definition.jobCode === 'sap-import-business-partners'
            ? await importSapMirrorBusinessPartners({
                pgQuery,
                withTransaction,
                limit: filters.limit,
                search: filters.search,
                type: filters.type,
                demo: false
            })
            : await importSapMirrorItems({
                pgQuery,
                withTransaction,
                limit: filters.limit,
                search: filters.search,
                group: filters.group,
                demo: false
            });
        await pgQuery(`
            UPDATE sap_sync_jobs
               SET status = 'success',
                   records_count = $2,
                   message = $3,
                   finished_at = NOW(),
                   updated_at = NOW()
             WHERE job_code = $1
        `, [
            definition.jobCode,
            Number(payload.records || 0),
            `Carga completada correctamente.`
        ]);
        await logSapActivity(pgQuery, {
            actionType: 'import',
            entityName: definition.entityLabel,
            actor,
            mode: resolveOperatingMode(config),
            status: 'success',
            internalMethod: 'POST',
            internalUrl: definition.internalUrl,
            serviceMethod: 'IMPORT',
            serviceUrl: definition.serviceUrl,
            requestVars: {
                ...filters,
                automated,
                jobCode: definition.jobCode
            },
            responseSummary: summarizeSapPayload(payload),
            startedAt,
            finishedAt: new Date().toISOString()
        });
        return payload;
    } catch (error) {
        await pgQuery(`
            UPDATE sap_sync_jobs
               SET status = 'error',
                   records_count = 0,
                   message = $2,
                   finished_at = NOW(),
                   updated_at = NOW()
             WHERE job_code = $1
        `, [
            definition.jobCode,
            error.message || 'No fue posible ejecutar la carga SAP.'
        ]);
        await logSapRouteFailure(pgQuery, {
            actionType: 'import',
            entityName: definition.entityLabel,
            actor,
            mode: resolveOperatingMode(config),
            internalMethod: 'POST',
            internalUrl: definition.internalUrl,
            serviceMethod: 'IMPORT',
            serviceUrl: definition.serviceUrl,
            requestVars: {
                ...filters,
                automated,
                jobCode: definition.jobCode
            },
            errorMessage: error.message
        });
        throw error;
    }
}

async function stageSapMirrorOrder(pgQuery, input = {}) {
    const payload = await enrichOrderPayloadWithProfitCenter(pgQuery, input || {}, buildOrderPayload(input || {}));
    const docEntry = sapNumber(input.DocEntry || input.docEntry, Date.now());
    const docNum = sapText(input.DocNum || input.docNum || docEntry);
    const docDate = sapText(payload.DocDate || new Date().toISOString().slice(0, 10));
    const dueDate = sapText(payload.DocDueDate || docDate);
    const salesPersonCode = payload.SalesPersonCode == null || payload.SalesPersonCode === '' ? null : sapNumber(payload.SalesPersonCode, null);
    const lines = Array.isArray(payload.DocumentLines) ? payload.DocumentLines : [];
    const total = lines.reduce((acc, line) => acc + (sapNumber(line.LineTotal, sapNumber(line.Price, 0) * sapNumber(line.Quantity, 0)) || 0), 0);
    await pgQuery(`
        INSERT INTO "ORDR" (
            "DocEntry", "DocNum", "CardCode", "CardName", "DocDate", "DocDueDate",
            "DocTotal", "Currency", "SlpCode", "DocStatus", "Comments", raw_data, exported_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,NOW())
        ON CONFLICT ("DocEntry")
        DO UPDATE SET
            "DocNum" = EXCLUDED."DocNum",
            "CardCode" = EXCLUDED."CardCode",
            "CardName" = EXCLUDED."CardName",
            "DocDate" = EXCLUDED."DocDate",
            "DocDueDate" = EXCLUDED."DocDueDate",
            "DocTotal" = EXCLUDED."DocTotal",
            "Currency" = EXCLUDED."Currency",
            "SlpCode" = EXCLUDED."SlpCode",
            "DocStatus" = EXCLUDED."DocStatus",
            "Comments" = EXCLUDED."Comments",
            raw_data = EXCLUDED.raw_data,
            exported_at = NOW()
    `, [
        docEntry,
        docNum,
        sapText(payload.CardCode),
        sapText(input.CardName || input.cardName || payload.CardCode),
        docDate,
        dueDate,
        total,
        sapText(input.Currency || input.currency || 'CRC'),
        salesPersonCode,
        sapText(input.DocStatus || input.DocumentStatus || 'Pendiente'),
        sapText(payload.Comments),
        JSON.stringify(payload)
    ]);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] || {};
        const quantity = sapNumber(line.Quantity, 0);
        const price = sapNumber(line.Price, 0);
        await pgQuery(`
            INSERT INTO "RDR1" (
                "DocEntry", "LineNum", "ItemCode", "Dscription", "Quantity", "Price",
                "LineTotal", "WhsCode", "OcrCode", raw_data, exported_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())
            ON CONFLICT ("DocEntry", "LineNum")
            DO UPDATE SET
                "ItemCode" = EXCLUDED."ItemCode",
                "Dscription" = EXCLUDED."Dscription",
                "Quantity" = EXCLUDED."Quantity",
                "Price" = EXCLUDED."Price",
                "LineTotal" = EXCLUDED."LineTotal",
                "WhsCode" = EXCLUDED."WhsCode",
                "OcrCode" = EXCLUDED."OcrCode",
                raw_data = EXCLUDED.raw_data,
                exported_at = NOW()
        `, [
            docEntry,
            sapNumber(line.LineNum, index),
            sapText(line.ItemCode),
            sapText(line.ItemDescription || line.Dscription || line.Description),
            quantity,
            price,
            sapNumber(line.LineTotal, quantity * price),
            sapText(line.WarehouseCode || line.WhsCode || '01'),
            sapText(line.CostingCode || line.OcrCode),
            JSON.stringify(line)
        ]);
    }
    return { ok: true, DocEntry: docEntry, DocNum: docNum, lines: lines.length, tables: ['ORDR', 'RDR1'] };
}

async function stageSapMirrorBom(pgQuery, input = {}) {
    const docEntry = sapNumber(input.DocEntry || input.docEntry, Date.now());
    const docNum = sapText(input.DocNum || input.docNum || docEntry);
    const productCode = sapText(input.ItemCode || input.productCode || input.itemCode || `PROD-${docEntry}`);
    const productName = sapText(input.ProdName || input.productName || input.name || productCode);
    const plannedQty = sapNumber(input.PlannedQty || input.quantity || input.plannedQty, 1);
    const postDate = sapText(input.PostDate || input.postDate || new Date().toISOString().slice(0, 10));
    const dueDate = sapText(input.DueDate || input.dueDate || postDate);
    const components = Array.isArray(input.DocumentLines)
        ? input.DocumentLines
        : (Array.isArray(input.components) ? input.components : (Array.isArray(input.lines) ? input.lines : []));
    await pgQuery(`
        INSERT INTO "OWOR" (
            "DocEntry", "DocNum", "ItemCode", "ProdName", "PlannedQty", "CmpltQty",
            "PostDate", "DueDate", "Status", "OriginNum", "Comments", raw_data, exported_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,NOW())
        ON CONFLICT ("DocEntry")
        DO UPDATE SET
            "DocNum" = EXCLUDED."DocNum",
            "ItemCode" = EXCLUDED."ItemCode",
            "ProdName" = EXCLUDED."ProdName",
            "PlannedQty" = EXCLUDED."PlannedQty",
            "CmpltQty" = EXCLUDED."CmpltQty",
            "PostDate" = EXCLUDED."PostDate",
            "DueDate" = EXCLUDED."DueDate",
            "Status" = EXCLUDED."Status",
            "OriginNum" = EXCLUDED."OriginNum",
            "Comments" = EXCLUDED."Comments",
            raw_data = EXCLUDED.raw_data,
            exported_at = NOW()
    `, [
        docEntry,
        docNum,
        productCode,
        productName,
        plannedQty,
        sapNumber(input.CmpltQty || input.completedQty, 0),
        postDate,
        dueDate,
        sapText(input.Status || input.status || 'P'),
        sapText(input.OriginNum || input.originNum || input.quoteCode || ''),
        sapText(input.Comments || input.comments || 'BOM generado desde ERP'),
        JSON.stringify(input || {})
    ]);
    await pgQuery(`
        INSERT INTO "OITT" ("Code", "Name", "Qauntity", "TreeType", raw_data, exported_at)
        VALUES ($1,$2,$3,$4,$5::jsonb,NOW())
        ON CONFLICT ("Code")
        DO UPDATE SET
            "Name" = EXCLUDED."Name",
            "Qauntity" = EXCLUDED."Qauntity",
            "TreeType" = EXCLUDED."TreeType",
            raw_data = EXCLUDED.raw_data,
            exported_at = NOW()
    `, [
        productCode,
        productName,
        plannedQty,
        sapText(input.TreeType || input.treeType || 'P', 'P'),
        JSON.stringify(input || {})
    ]);
    for (let index = 0; index < components.length; index += 1) {
        const component = components[index] || {};
        const itemCode = sapText(component.ItemCode || component.Code || component.itemCode || component.sapItemCode);
        const itemName = sapText(component.ItemName || component.ItemDescription || component.itemName || component.description);
        const qty = sapNumber(component.PlannedQty || component.Quantity || component.quantity || component.requiredQty, 0);
        const whs = sapText(component.WarehouseCode || component.Warehouse || component.WhsCode || component.warehouse || '01');
        await pgQuery(`
            INSERT INTO "WOR1" (
                "DocEntry", "LineNum", "ItemCode", "ItemName", "PlannedQty",
                "IssuedQty", "warehous", raw_data, exported_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW())
            ON CONFLICT ("DocEntry", "LineNum")
            DO UPDATE SET
                "ItemCode" = EXCLUDED."ItemCode",
                "ItemName" = EXCLUDED."ItemName",
                "PlannedQty" = EXCLUDED."PlannedQty",
                "IssuedQty" = EXCLUDED."IssuedQty",
                "warehous" = EXCLUDED."warehous",
                raw_data = EXCLUDED.raw_data,
                exported_at = NOW()
        `, [
            docEntry,
            sapNumber(component.LineNum, index),
            itemCode,
            itemName,
            qty,
            sapNumber(component.IssuedQty || component.issuedQty, 0),
            whs,
            JSON.stringify(component)
        ]);
        if (itemCode) {
            await pgQuery(`
                INSERT INTO "ITT1" ("Father", "Code", "Quantity", "Warehouse", "PriceList", raw_data, exported_at)
                VALUES ($1,$2,$3,$4,$5,$6::jsonb,NOW())
                ON CONFLICT ("Father", "Code", "Warehouse")
                DO UPDATE SET
                    "Quantity" = EXCLUDED."Quantity",
                    "PriceList" = EXCLUDED."PriceList",
                    raw_data = EXCLUDED.raw_data,
                    exported_at = NOW()
            `, [
                productCode,
                itemCode,
                qty,
                whs,
                sapNumber(component.PriceList),
                JSON.stringify(component)
            ]);
        }
    }
    return { ok: true, DocEntry: docEntry, DocNum: docNum, ItemCode: productCode, components: components.length, tables: ['OWOR', 'WOR1', 'OITT', 'ITT1'] };
}

function buildSequenceCode(prefix = 'SAP') {
    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${stamp}-${random}`;
}

function safeNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function extractOrderMaterialNeed(orderRow = {}) {
    const rawData = orderRow.raw_data || {};
    const lineSnapshot = rawData.line_snapshot || {};
    const lineSummary = rawData.line_summary || {};
    const snapshotRaw = lineSnapshot.raw_data || {};
    const materialCode = normalizeText(
        orderRow.material_code
        || lineSnapshot.materialCode
        || lineSummary.material_code
        || snapshotRaw['GENERAL | MATERIAL']
    );
    const materialName = normalizeText(
        lineSnapshot.materialName
        || lineSummary.material_name
        || snapshotRaw['GENERAL | MATERIAL']
        || materialCode
    );
    const primaryQty = safeNumber(
        lineSnapshot.materialFeet
        || snapshotRaw['GENERAL | SUSTRATO | CONSUMO PIES']
        || orderRow.ordered_quantity,
        0
    );
    const tintCount = safeNumber(
        lineSnapshot.tintCount
        || lineSnapshot.pantoneCount
        || snapshotRaw['CANTIDAD TINTAS'],
        0
    );
    const dieCode = normalizeText(orderRow.die_code || lineSnapshot.dieCode || snapshotRaw['GENERAL | TROQUEL | ID']);
    return {
        materialCode,
        materialName,
        requiredQty: primaryQty > 0 ? primaryQty : safeNumber(orderRow.ordered_quantity, 1),
        uom: primaryQty > 0 ? 'pies' : 'unidad',
        tintCount,
        dieCode,
        productName: normalizeText(lineSnapshot.productName || lineSummary.product_name || orderRow.product_code),
        customerName: normalizeText(rawData.customer_name || lineSummary.customer_name)
    };
}

async function resolveSapItemLink(pgQuery, { localKind = 'materiales', localCode = '', localId = '' } = {}) {
    const normalizedCode = normalizeText(localCode);
    const normalizedId = normalizeText(localId);
    if (!normalizedCode && !normalizedId) return null;
    const result = await pgQuery(`
        SELECT
            sil.*,
            si.item_name AS resolved_item_name,
            COALESCE(NULLIF(si.buy_unit_msr, ''), NULLIF(si.sales_unit_msr, ''), '') AS resolved_uom
          FROM sap_item_links sil
     LEFT JOIN sap_items si
            ON si.item_code = sil.sap_item_code
         WHERE sil.is_active = TRUE
           AND sil.local_kind = $1
           AND (
                ($2 <> '' AND sil.local_code = $2)
             OR ($3 <> '' AND sil.local_id = $3)
           )
      ORDER BY
            CASE WHEN sil.warehouse_code <> '' THEN 0 ELSE 1 END,
            sil.updated_at DESC
         LIMIT 1
    `, [localKind, normalizedCode, normalizedId]);
    if (result.rows.length) return result.rows[0];
    if (!normalizedCode) return null;
    const directSapItem = await pgQuery(`
        SELECT item_code, item_name, buy_unit_msr, sales_unit_msr
          FROM sap_items
         WHERE item_code = $1
         LIMIT 1
    `, [normalizedCode]);
    if (!directSapItem.rows.length) return null;
    return {
        local_kind: localKind,
        local_id: normalizedId,
        local_code: normalizedCode,
        sap_item_code: directSapItem.rows[0].item_code,
        sap_item_name: directSapItem.rows[0].item_name,
        warehouse_code: '',
        resolved_item_name: directSapItem.rows[0].item_name,
        resolved_uom: normalizeText(directSapItem.rows[0].buy_unit_msr || directSapItem.rows[0].sales_unit_msr)
    };
}

async function loadMaterialCatalogRow(pgQuery, materialCode = '') {
    if (!materialCode) return null;
    const result = await pgQuery(`
        SELECT id::text, codigo, nombre, familia_proceso
          FROM material
         WHERE codigo = $1
         LIMIT 1
    `, [materialCode]);
    return result.rows[0] || null;
}

async function createMaterialRequestFromOrder(pgQuery, orderCode, options = {}) {
    const orderResult = await pgQuery(`SELECT * FROM flexo_orders WHERE order_code = $1 LIMIT 1`, [orderCode]);
    if (!orderResult.rows.length) {
        throw new Error('No se encontró la orden de producción para generar la necesidad.');
    }
    const orderRow = orderResult.rows[0];
    const existingRequest = await pgQuery(`
        SELECT id, request_code, status
          FROM production_material_requests
         WHERE order_code = $1
           AND status NOT IN ('cancelada', 'archivada')
      ORDER BY created_at DESC
         LIMIT 1
    `, [orderCode]);
    if (existingRequest.rows.length && !options.forceNew) {
        return {
            reused: true,
            request: existingRequest.rows[0]
        };
    }

    const need = extractOrderMaterialNeed(orderRow);
    const materialRow = await loadMaterialCatalogRow(pgQuery, need.materialCode);
    const sapLink = await resolveSapItemLink(pgQuery, {
        localKind: 'materiales',
        localCode: need.materialCode,
        localId: materialRow?.id || ''
    });
    const requestCode = buildSequenceCode('SMR');
    const requestPayload = {
        orderCode: orderRow.order_code,
        quoteCode: orderRow.quote_code || '',
        lineCode: orderRow.line_code || '',
        materialCode: need.materialCode,
        materialName: need.materialName,
        productName: need.productName,
        customerName: need.customerName,
        pendingComponents: {
            tintCount: need.tintCount,
            dieCode: need.dieCode
        },
        generatedFrom: 'flexo_orders'
    };
    const headerResult = await pgQuery(`
        INSERT INTO production_material_requests (
            request_code,
            order_code,
            quote_code,
            line_code,
            status,
            source_context,
            requested_by,
            summary,
            payload
        )
        VALUES ($1, $2, $3, $4, 'pendiente_revision', 'produccion', $5, $6::jsonb, $7::jsonb)
        RETURNING *
    `, [
        requestCode,
        orderRow.order_code,
        orderRow.quote_code || '',
        orderRow.line_code || '',
        normalizeText(options.actor, 'sistema'),
        JSON.stringify({
            productName: need.productName,
            customerName: need.customerName,
            totalLines: 1,
            linkedLines: sapLink ? 1 : 0,
            pendingComponents: requestPayload.pendingComponents
        }),
        JSON.stringify(requestPayload)
    ]);
    const request = headerResult.rows[0];
    await pgQuery(`
        INSERT INTO production_material_request_lines (
            request_id,
            line_number,
            local_kind,
            local_id,
            local_code,
            local_name,
            sap_item_code,
            sap_item_name,
            description,
            required_qty,
            uom,
            warehouse_code,
            line_status,
            source_type,
            source_ref,
            payload
        )
        VALUES (
            $1::uuid, 1, 'materiales', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'material_principal', $12, $13::jsonb
        )
    `, [
        request.id,
        materialRow?.id || '',
        need.materialCode,
        materialRow?.nombre || need.materialName,
        normalizeText(sapLink?.sap_item_code),
        normalizeText(sapLink?.sap_item_name || sapLink?.resolved_item_name),
        need.materialName || materialRow?.nombre || need.materialCode,
        need.requiredQty,
        normalizeText(sapLink?.resolved_uom, need.uom),
        normalizeText(sapLink?.warehouse_code),
        sapLink ? 'lista_para_envio' : 'pendiente_link',
        need.materialCode,
        JSON.stringify({
            sourceOrderCode: orderRow.order_code,
            tintCount: need.tintCount,
            dieCode: need.dieCode
        })
    ]);
    return {
        reused: false,
        request
    };
}

async function listMaterialRequests(pgQuery, query = {}) {
    const status = normalizeText(query.status);
    const search = normalizeText(query.q);
    const values = [];
    const filters = [];
    if (status) {
        values.push(status);
        filters.push(`r.status = $${values.length}`);
    }
    if (search) {
        values.push(`%${search}%`);
        filters.push(`(
            r.request_code ILIKE $${values.length}
            OR COALESCE(r.order_code, '') ILIKE $${values.length}
            OR COALESCE(r.quote_code, '') ILIKE $${values.length}
            OR COALESCE(r.line_code, '') ILIKE $${values.length}
            OR COALESCE(r.summary->>'productName', '') ILIKE $${values.length}
            OR COALESCE(r.summary->>'customerName', '') ILIKE $${values.length}
        )`);
    }
    values.push(Math.min(Math.max(Number(query.limit) || 100, 1), 300));
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pgQuery(`
        SELECT
            r.*,
            COUNT(l.id)::int AS total_lines,
            COUNT(*) FILTER (WHERE COALESCE(l.sap_item_code, '') <> '')::int AS linked_lines,
            COALESCE(SUM(l.required_qty), 0)::numeric AS total_required_qty
          FROM production_material_requests r
     LEFT JOIN production_material_request_lines l
            ON l.request_id = r.id
        ${whereClause}
      GROUP BY r.id
      ORDER BY r.created_at DESC
         LIMIT $${values.length}
    `, values);
    return result.rows;
}

async function loadMaterialRequestDetail(pgQuery, requestId) {
    const header = await pgQuery(`SELECT * FROM production_material_requests WHERE id = $1::uuid LIMIT 1`, [requestId]);
    if (!header.rows.length) return null;
    const lines = await pgQuery(`
        SELECT *
          FROM production_material_request_lines
         WHERE request_id = $1::uuid
      ORDER BY line_number
    `, [requestId]);
    return {
        request: header.rows[0],
        lines: lines.rows
    };
}

async function saveSapItemLink(pgQuery, payload = {}) {
    const localKind = normalizeText(payload.localKind || payload.local_kind, 'materiales');
    const localCode = normalizeText(payload.localCode || payload.local_code);
    const sapItemCode = normalizeText(payload.sapItemCode || payload.sap_item_code);
    if (!localCode) {
        throw new Error('Debes indicar el código local para vincular el ítem.');
    }
    if (!sapItemCode) {
        throw new Error('Debes indicar el ItemCode de SAP para vincular el ítem.');
    }
    const sapItemResult = await pgQuery(`SELECT item_code, item_name FROM sap_items WHERE item_code = $1 LIMIT 1`, [sapItemCode]);
    const sapItemName = normalizeText(payload.sapItemName || payload.sap_item_name || sapItemResult.rows[0]?.item_name);
    const result = await pgQuery(`
        INSERT INTO sap_item_links (
            local_kind,
            local_id,
            local_code,
            local_name,
            sap_item_code,
            sap_item_name,
            warehouse_code,
            provider,
            is_active,
            notes,
            payload,
            updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,NOW())
        ON CONFLICT (local_kind, local_code, sap_item_code, warehouse_code)
        DO UPDATE SET
            local_id = EXCLUDED.local_id,
            local_name = EXCLUDED.local_name,
            sap_item_name = EXCLUDED.sap_item_name,
            provider = EXCLUDED.provider,
            is_active = EXCLUDED.is_active,
            notes = EXCLUDED.notes,
            payload = EXCLUDED.payload,
            updated_at = NOW()
        RETURNING *
    `, [
        localKind,
        normalizeText(payload.localId || payload.local_id),
        localCode,
        normalizeText(payload.localName || payload.local_name),
        sapItemCode,
        sapItemName,
        normalizeText(payload.warehouseCode || payload.warehouse_code),
        normalizeSapProvider(payload.provider, 'service-layer'),
        Object.prototype.hasOwnProperty.call(payload, 'isActive') ? Boolean(payload.isActive) : true,
        normalizeText(payload.notes),
        JSON.stringify(payload.payload || {})
    ]);
    return result.rows[0];
}

async function listSapItemLinks(pgQuery, query = {}) {
    const localKind = normalizeText(query.localKind || query.local_kind);
    const search = normalizeText(query.q);
    const values = [];
    const filters = [];
    if (localKind) {
        values.push(localKind);
        filters.push(`sil.local_kind = $${values.length}`);
    }
    if (search) {
        values.push(`%${search}%`);
        filters.push(`(
            sil.local_code ILIKE $${values.length}
            OR sil.local_name ILIKE $${values.length}
            OR sil.sap_item_code ILIKE $${values.length}
            OR sil.sap_item_name ILIKE $${values.length}
        )`);
    }
    values.push(Math.min(Math.max(Number(query.limit) || 200, 1), 500));
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pgQuery(`
        SELECT sil.*
          FROM sap_item_links sil
        ${whereClause}
      ORDER BY sil.updated_at DESC, sil.local_kind, sil.local_code
         LIMIT $${values.length}
    `, values);
    return result.rows;
}

async function listInventorySnapshot(pgQuery, query = {}) {
    const warehouseCode = normalizeText(query.warehouseCode || query.warehouse_code);
    const search = normalizeText(query.q);
    const values = [];
    const filters = [];
    if (warehouseCode) {
        values.push(warehouseCode);
        filters.push(`warehouse_code = $${values.length}`);
    }
    if (search) {
        values.push(`%${search}%`);
        filters.push(`(
            sap_item_code ILIKE $${values.length}
            OR item_name ILIKE $${values.length}
            OR item_group_code ILIKE $${values.length}
        )`);
    }
    values.push(Math.min(Math.max(Number(query.limit) || 200, 1), 500));
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pgQuery(`
        SELECT *
          FROM sap_inventory_snapshot
        ${whereClause}
      ORDER BY snapshot_at DESC, item_name, sap_item_code
         LIMIT $${values.length}
    `, values);
    return result.rows;
}

async function enqueueMaterialRequest(pgQuery, requestId) {
    const detail = await loadMaterialRequestDetail(pgQuery, requestId);
    if (!detail) {
        throw new Error('No se encontró la solicitud de materiales.');
    }
    const request = detail.request;
    const eligibleLines = detail.lines.filter((line) => normalizeText(line.sap_item_code));
    if (!eligibleLines.length) {
        throw new Error('La solicitud no tiene líneas ligadas a ItemCode de SAP.');
    }
    const existing = await pgQuery(`
        SELECT id, queue_code, status
          FROM sap_outbox
         WHERE entity_type = 'material-request'
           AND reference_id = $1
           AND status IN ('pending', 'processing')
         LIMIT 1
    `, [requestId]);
    if (existing.rows.length) {
        return {
            reused: true,
            outbox: existing.rows[0]
        };
    }
    const config = await loadSapConfig(pgQuery);
    const payload = {
        requestId,
        requestCode: request.request_code,
        orderCode: request.order_code || '',
        quoteCode: request.quote_code || '',
        lineCode: request.line_code || '',
        action: 'inventory-need-list',
        lines: eligibleLines.map((line) => ({
            lineNumber: line.line_number,
            ItemCode: line.sap_item_code,
            ItemName: line.sap_item_name || line.description,
            Quantity: safeNumber(line.required_qty),
            WarehouseCode: normalizeText(line.warehouse_code),
            Uom: normalizeText(line.uom),
            LocalCode: normalizeText(line.local_code)
        }))
    };
    const queueCode = buildSequenceCode('SOUT');
    const result = await pgQuery(`
        INSERT INTO sap_outbox (
            queue_code,
            module_name,
            entity_type,
            action_type,
            provider,
            reference_id,
            reference_code,
            status,
            priority,
            payload
        )
        VALUES ($1, 'produccion', 'material-request', 'inventory-need-list', $2, $3, $4, 'pending', 80, $5::jsonb)
        RETURNING *
    `, [
        queueCode,
        config.provider || 'service-layer',
        requestId,
        request.request_code,
        JSON.stringify(payload)
    ]);
    await pgQuery(`
        UPDATE production_material_requests
           SET status = 'lista_para_envio',
               updated_at = NOW()
         WHERE id = $1::uuid
    `, [requestId]);
    return {
        reused: false,
        outbox: result.rows[0]
    };
}

async function listSapOutbox(pgQuery, query = {}) {
    const status = normalizeText(query.status);
    const entityType = normalizeText(query.entityType || query.entity_type);
    const values = [];
    const filters = [];
    if (status) {
        values.push(status);
        filters.push(`status = $${values.length}`);
    }
    if (entityType) {
        values.push(entityType);
        filters.push(`entity_type = $${values.length}`);
    }
    values.push(Math.min(Math.max(Number(query.limit) || 100, 1), 300));
    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const result = await pgQuery(`
        SELECT *
          FROM sap_outbox
        ${whereClause}
      ORDER BY created_at DESC
         LIMIT $${values.length}
    `, values);
    return result.rows;
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
               classification_source_value AS "ClassificationSourceValue",
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
    return { value: rows.slice(0, top), source: 'local' };
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
    return { value: rows.slice(0, top), source: 'local' };
}

function filterDemoOrders(query) {
    let rows = deepClone(demoState.Orders);
    const status = normalizeText(query?.status);
    const top = normalizePositiveInt(query?.top, 20, 1, 200);
    if (status) rows = rows.filter((row) => String(row.DocumentStatus || '').trim() === status);
    return { value: rows.slice(0, top), source: 'local' };
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
            WarehouseCode: normalizeText(line.warehouse || line.WarehouseCode || '01'),
            CostingCode: normalizeText(line.costingCode || line.CostingCode)
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

function buildInventoryEntryPayload(input = {}) {
    if (Array.isArray(input.DocumentLines)) {
        return input;
    }
    return {
        DocDate: normalizeText(input.date || input.DocDate),
        Comments: normalizeText(input.comments || input.Comments || `Terminación OP ${normalizeText(input.productionOrderId || input.production_order_id)}`),
        DocumentLines: Array.isArray(input.items) ? input.items.map((row) => ({
            ItemCode: normalizeText(row.itemCode || row.ItemCode),
            Quantity: Number(row.quantity != null ? row.quantity : row.Quantity),
            WarehouseCode: normalizeText(row.warehouse || row.WarehouseCode || '01'),
            CostingCode: normalizeText(row.costingCode || row.CostingCode)
        })) : []
    };
}

function buildProductTreePayload(input = {}) {
    if (Array.isArray(input.DocumentLines) && normalizeText(input.TreeCode || input.ItemCode || input.itemCode || input.productCode)) {
        return input;
    }
    const componentSource = Array.isArray(input.DocumentLines)
        ? input.DocumentLines
        : (Array.isArray(input.Components)
            ? input.Components
            : (Array.isArray(input.components)
                ? input.components
                : (Array.isArray(input.lines) ? input.lines : [])));
    return {
        TreeCode: normalizeText(input.TreeCode || input.ItemCode || input.itemCode || input.productCode),
        ItemCode: normalizeText(input.ItemCode || input.itemCode || input.TreeCode || input.productCode),
        ProdName: normalizeText(input.ProdName || input.productName || input.name),
        TreeType: normalizeText(input.TreeType || input.treeType || 'P'),
        PlannedQty: Number(input.PlannedQty != null ? input.PlannedQty : (input.quantity != null ? input.quantity : (input.Quantity != null ? input.Quantity : 1))),
        WarehouseCode: normalizeText(input.WarehouseCode || input.warehouse || '01'),
        Comments: normalizeText(input.Comments || input.comments || 'BOM preparado desde ERP'),
        DocumentLines: componentSource.map((line) => ({
            ItemCode: normalizeText(line.itemCode || line.ItemCode || line.Code || line.sapItemCode),
            ItemName: normalizeText(line.itemName || line.ItemName || line.ItemDescription || line.description),
            Quantity: Number(line.qty != null ? line.qty : (line.quantity != null ? line.quantity : (line.Quantity != null ? line.Quantity : (line.PlannedQty != null ? line.PlannedQty : 0)))),
            WarehouseCode: normalizeText(line.warehouse || line.WarehouseCode || line.Warehouse || line.WhsCode || '01'),
            PriceList: line.priceList == null ? 0 : Number(line.priceList),
            Source: normalizeText(line.Source || line.source),
            UnitHint: normalizeText(line.UnitHint || line.unitHint)
        }))
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
        _local: true
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
        _local: true
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
        _local: true
    };
}

function buildMockInventoryEntryResponse(input = {}) {
    const payload = buildInventoryEntryPayload(input);
    for (const line of payload.DocumentLines) {
        const item = demoState.Items.find((current) => current.ItemCode === line.ItemCode);
        if (!item) continue;
        const quantity = Number(line.Quantity || 0);
        item.OnHand = Number(item.OnHand || 0) + quantity;
        item.AvailableQty = Number(item.AvailableQty || item.AvailableQuantity || 0) + quantity;
        item.AvailableQuantity = item.AvailableQty;
    }
    return {
        DocNum: Date.now(),
        ...payload,
        _local: true
    };
}

async function queryBusinessPartners({ pgQuery, config, query }) {
    if (String(query?.source || '').trim().toLowerCase() === 'local') {
        return loadLocalBusinessPartners(pgQuery, query);
    }
    const liveConfig = assertLiveSapConfigReady(config, 'La consulta de socios');
    if (isDiApiProvider(liveConfig)) {
        return diApiBridge.queryBusinessPartners(liveConfig, query);
    }
    const type = normalizeText(query?.type);
    const cardTypes = normalizeText(query?.cardTypes || (type ? '' : 'C,L'))
        .split(',')
        .map((value) => normalizeText(value))
        .filter(Boolean);
    const search = normalizeText(query?.search);
    const top = normalizePositiveInt(query?.top, 20, 1, 200);
    const filters = [];
    if (cardTypes.length) {
        filters.push(`(${cardTypes.map((cardType) => `CardType eq '${cardType.replace(/'/g, "''")}'`).join(' or ')})`);
    } else if (type) {
        filters.push(`CardType eq '${type.replace(/'/g, "''")}'`);
    }
    if (search) {
        const escaped = search.replace(/'/g, "''");
        filters.push(`(contains(CardName,'${escaped}') or contains(CardCode,'${escaped}'))`);
    }
    const params = new URLSearchParams();
    params.set('$top', String(top));
    if (filters.length) params.set('$filter', filters.join(' and '));
    const payload = await sapRequest(liveConfig, `BusinessPartners?${params.toString()}`);
    return { value: Array.isArray(payload.value) ? payload.value : [], source: 'sap', provider: 'service-layer' };
}

async function queryItems({ pgQuery, config, query }) {
    if (String(query?.source || '').trim().toLowerCase() === 'local') {
        return loadLocalItems(pgQuery, query);
    }
    const liveConfig = assertLiveSapConfigReady(config, 'La consulta de inventario');
    if (isDiApiProvider(liveConfig)) {
        return diApiBridge.queryItems(liveConfig, query);
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
    const payload = await sapRequest(liveConfig, `Items?${params.toString()}`);
    return { value: Array.isArray(payload.value) ? payload.value : [], source: 'sap', provider: 'service-layer' };
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
    const liveConfig = assertLiveSapConfigReady(config, 'La consulta de existencias');
    if (isDiApiProvider(liveConfig)) {
        const payload = await diApiBridge.queryItemStock(liveConfig, normalizedCode);
        return {
            ...payload,
            source: payload?.source || 'sap',
            provider: payload?.provider || 'di-api'
        };
    }
    const payload = await sapRequest(liveConfig, `Items('${encodeURIComponent(normalizedCode)}')?$select=ItemCode,ItemName,QuantityOnStock,AvailableQuantity`);
    return {
        ItemCode: payload.ItemCode,
        ItemName: payload.ItemName,
        OnHand: payload.QuantityOnStock,
        AvailableQuantity: payload.AvailableQuantity,
        source: 'sap',
        provider: 'service-layer'
    };
}

async function queryOrders({ pgQuery, config, query }) {
    if (String(query?.source || '').trim().toLowerCase() === 'local') {
        return loadLocalOrders(pgQuery, query);
    }
    const liveConfig = assertLiveSapConfigReady(config, 'La consulta de órdenes');
    if (isDiApiProvider(liveConfig)) {
        return diApiBridge.queryOrders(liveConfig, query);
    }
    const status = normalizeText(query?.status);
    const top = normalizePositiveInt(query?.top, 20, 1, 200);
    const params = new URLSearchParams();
    params.set('$top', String(top));
    if (status) params.set('$filter', `DocumentStatus eq '${status.replace(/'/g, "''")}'`);
    const payload = await sapRequest(liveConfig, `Orders?${params.toString()}`);
    return { value: Array.isArray(payload.value) ? payload.value : [], source: 'sap', provider: 'service-layer' };
}

async function createOrder({ pgQuery, config, body }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La creación de órdenes');
    const requestPayload = await enrichOrderPayloadWithProfitCenter(pgQuery, body || {}, buildOrderPayload(body || {}));
    try {
        const responsePayload = isDiApiProvider(liveConfig)
            ? await diApiBridge.createOrder(liveConfig, requestPayload)
            : await sapRequest(liveConfig, 'Orders', {
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

async function createProductTree({ pgQuery, config, body }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La creación del BOM');
    const requestPayload = buildProductTreePayload(body || {});
    try {
        const responsePayload = isDiApiProvider(liveConfig)
            ? await diApiBridge.createProductTree(liveConfig, requestPayload)
            : await sapRequest(liveConfig, 'ProductTrees', {
                method: 'POST',
                body: requestPayload
            });
        await logWrite(pgQuery, {
            entityName: 'ProductTrees',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, {
            entityName: 'ProductTrees',
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
    const liveConfig = assertLiveSapConfigReady(config, 'La creación de facturas');
    const requestPayload = buildInvoicePayload(body || {});
    try {
        const responsePayload = isDiApiProvider(liveConfig)
            ? await diApiBridge.createInvoice(liveConfig, requestPayload)
            : await sapRequest(liveConfig, 'Invoices', {
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
    const liveConfig = assertLiveSapConfigReady(config, 'La salida de inventario');
    const settings = await loadSapProductionCostCenterSettings(pgQuery);
    const defaultCostCenterCode = normalizeText(settings.defaultCostCenterCode);
    const requestPayload = applyProductionCostCenterToPayload(
        buildInventoryExitPayload(body || {}),
        defaultCostCenterCode,
        'la salida de componentes'
    );
    try {
        const responsePayload = isDiApiProvider(liveConfig)
            ? await diApiBridge.createInventoryExit(liveConfig, requestPayload)
            : await sapRequest(liveConfig, 'InventoryGenExits', {
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

async function createInventoryEntry({ pgQuery, config, body }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La entrada de inventario');
    const settings = await loadSapProductionCostCenterSettings(pgQuery);
    const defaultCostCenterCode = normalizeText(settings.defaultCostCenterCode);
    const requestPayload = applyProductionCostCenterToPayload(
        buildInventoryEntryPayload(body || {}),
        defaultCostCenterCode,
        'la terminación de producción'
    );
    try {
        const responsePayload = isDiApiProvider(liveConfig)
            ? await diApiBridge.createInventoryEntry(liveConfig, requestPayload)
            : await sapRequest(liveConfig, 'InventoryGenEntries', {
                method: 'POST',
                body: requestPayload
            });
        await logWrite(pgQuery, {
            entityName: 'InventoryGenEntries',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, {
            entityName: 'InventoryGenEntries',
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
    const liveConfig = assertLiveSapConfigReady(config);
    if (isDiApiProvider(liveConfig)) {
        return diApiBridge.testConnection(liveConfig);
    }
    await sapLogin(liveConfig);
    return {
        ok: true,
        mode: 'live',
        provider: 'service-layer',
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

    app.get('/api/sap/import-jobs', async (req, res) => {
        try {
            res.json({ rows: await listSapImportJobs(pgQuery) });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar los trabajos de importación SAP.' });
        }
    });

    app.patch('/api/sap/import-jobs/:jobCode', async (req, res) => {
        try {
            const row = await saveSapImportJob(pgQuery, req.params.jobCode, req.body || {});
            res.json({ ok: true, row });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible guardar la automatización SAP.' });
        }
    });

    app.post('/api/sap/import-jobs/:jobCode/run', async (req, res) => {
        try {
            const payload = await executeSapImportJob({
                pgQuery,
                withTransaction,
                jobCode: req.params.jobCode,
                actor: await getSapActor(pgQuery),
                automated: normalizeBoolean(req.body?.automated, true)
            });
            res.json({ ok: true, payload });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible ejecutar la carga SAP.' });
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
                serviceUrl: getSapProviderLoginUrl(config),
                requestVars: {
                    provider: normalizeSapProvider(config.provider),
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
                serviceUrl: getSapProviderLoginUrl(config),
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

    app.get('/api/sap/mirror/summary', async (req, res) => {
        try {
            res.json(await loadSapMirrorSummary(pgQuery));
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar las tablas espejo SAP.' });
        }
    });

    app.get('/api/sap/mirror/processes', async (req, res) => {
        try {
            const config = await loadSapConfig(pgQuery);
            res.json({
                ok: true,
                processes: Object.keys(SAP_MIRROR_PROCESS_DEFS).map((key) => buildSapMirrorProcedure(config, key, req.query || {}))
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar los procesos SAP.' });
        }
    });

    app.post('/api/sap/mirror/preview', async (req, res) => {
        try {
            const payload = await previewSapMirrorProcess({
                pgQuery,
                processKey: req.body?.processKey,
                input: req.body || {}
            });
            res.json(payload);
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible previsualizar el proceso SAP.' });
        }
    });

    app.get('/api/sap/mirror/tables/:tableName', async (req, res) => {
        try {
            res.json(await listSapMirrorTable(pgQuery, req.params.tableName, req.query || {}));
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible cargar la tabla SAP.' });
        }
    });

    app.post('/api/sap/mirror/import-business-partners', async (req, res) => {
        const startedAt = new Date().toISOString();
        const config = await loadSapConfig(pgQuery).catch(() => ({}));
        try {
            const actor = await getSapActor(pgQuery);
            const payload = await importSapMirrorBusinessPartners({
                pgQuery,
                withTransaction,
                limit: req.body?.limit,
                search: req.body?.search,
                type: req.body?.type,
                demo: normalizeBoolean(req.body?.demo, false)
            });
            await logSapActivity(pgQuery, {
                actionType: 'import',
                entityName: 'OCRD/CRD1/OCPR',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'POST',
                internalUrl: '/api/sap/mirror/import-business-partners',
                serviceMethod: 'IMPORT',
                serviceUrl: 'sap-mirror://BusinessPartners',
                requestVars: { limit: req.body?.limit || '', search: req.body?.search || '', type: req.body?.type || '', demo: normalizeBoolean(req.body?.demo, false) },
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.json(payload);
        } catch (error) {
            await logSapRouteFailure(pgQuery, {
                actionType: 'import',
                entityName: 'OCRD/CRD1/OCPR',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'POST',
                internalUrl: '/api/sap/mirror/import-business-partners',
                serviceMethod: 'IMPORT',
                serviceUrl: 'sap-mirror://BusinessPartners',
                requestVars: { limit: req.body?.limit || '', search: req.body?.search || '', type: req.body?.type || '', demo: normalizeBoolean(req.body?.demo, false) },
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible importar socios SAP.' });
        }
    });

    app.post('/api/sap/mirror/import-items', async (req, res) => {
        const startedAt = new Date().toISOString();
        const config = await loadSapConfig(pgQuery).catch(() => ({}));
        try {
            const actor = await getSapActor(pgQuery);
            const payload = await importSapMirrorItems({
                pgQuery,
                withTransaction,
                limit: req.body?.limit,
                search: req.body?.search,
                group: req.body?.group,
                demo: normalizeBoolean(req.body?.demo, false)
            });
            await logSapActivity(pgQuery, {
                actionType: 'import',
                entityName: 'OITM/OITW/ITM1',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'POST',
                internalUrl: '/api/sap/mirror/import-items',
                serviceMethod: 'IMPORT',
                serviceUrl: 'sap-mirror://Items',
                requestVars: { limit: req.body?.limit || '', search: req.body?.search || '', group: req.body?.group || '', demo: normalizeBoolean(req.body?.demo, false) },
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.json(payload);
        } catch (error) {
            await logSapRouteFailure(pgQuery, {
                actionType: 'import',
                entityName: 'OITM/OITW/ITM1',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'POST',
                internalUrl: '/api/sap/mirror/import-items',
                serviceMethod: 'IMPORT',
                serviceUrl: 'sap-mirror://Items',
                requestVars: { limit: req.body?.limit || '', search: req.body?.search || '', group: req.body?.group || '', demo: normalizeBoolean(req.body?.demo, false) },
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible importar artículos SAP.' });
        }
    });

    app.post('/api/sap/mirror/export-order', async (req, res) => {
        try {
            res.status(201).json(await stageSapMirrorOrder(pgQuery, req.body || {}));
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible preparar la exportación de orden SAP.' });
        }
    });

    app.post('/api/sap/mirror/export-bom', async (req, res) => {
        try {
            res.status(201).json(await stageSapMirrorBom(pgQuery, req.body || {}));
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible preparar el BOM SAP.' });
        }
    });

    app.post('/api/sap/reset-demo', async (req, res) => {
        try {
            resetDemoState();
            res.json({ ok: true });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible reiniciar el entorno SAP.' });
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

    app.patch('/api/sap/items/:code/classification', async (req, res) => {
        try {
            const itemCode = normalizeText(req.params.code);
            if (!itemCode) {
                return res.status(400).json({ error: 'Debe indicar el codigo del articulo.' });
            }
            const classificationSourceValue = normalizeText(
                req.body?.classificationSourceValue
                || req.body?.classification_source_value
                || req.body?.value
            );
            const itemResult = await pgQuery(
                `SELECT item_code FROM sap_items WHERE item_code = $1`,
                [itemCode]
            );
            if (!itemResult.rows.length) {
                return res.status(404).json({ error: 'No se encontro el articulo en el espejo local.' });
            }
            await pgQuery(
                `UPDATE sap_items SET classification_source_value = $2, synced_at = NOW() WHERE item_code = $1`,
                [itemCode, classificationSourceValue]
            );
            await pgQuery(
                `UPDATE "OITM" SET "U_ClasificacionERP" = $2, synced_at = NOW() WHERE "ItemCode" = $1`,
                [itemCode, classificationSourceValue]
            );
            res.json({
                ok: true,
                itemCode,
                classificationSourceValue
            });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible actualizar la clasificacion local del articulo.' });
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

    app.post('/api/sap/product-trees', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await createProductTree({ pgQuery, config, body: req.body || {} });
            const serviceUrl = isDiApiProvider(config)
                ? `${normalizeText(config.diApiBaseUrl || config.di_api_base_url).replace(/\/+$/, '')}/product-trees`
                : `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/ProductTrees`;
            await logSapActivity(pgQuery, {
                actionType: 'write',
                entityName: 'ProductTrees',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'POST',
                internalUrl: '/api/sap/product-trees',
                serviceMethod: 'POST',
                serviceUrl,
                requestVars: summarizeSapPayload(req.body || {}),
                responseSummary: summarizeSapPayload(payload),
                startedAt,
                finishedAt: new Date().toISOString()
            });
            res.status(201).json(payload);
        } catch (error) {
            const config = await loadSapConfig(pgQuery).catch(() => ({}));
            const serviceUrl = isDiApiProvider(config)
                ? `${normalizeText(config.diApiBaseUrl || config.di_api_base_url).replace(/\/+$/, '')}/product-trees`
                : (config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/ProductTrees` : '');
            await logSapRouteFailure(pgQuery, {
                actionType: 'write',
                entityName: 'ProductTrees',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'POST',
                internalUrl: '/api/sap/product-trees',
                serviceMethod: 'POST',
                serviceUrl,
                requestVars: summarizeSapPayload(req.body || {}),
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible crear el BOM SAP.' });
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

    app.post('/api/sap/inventory/entry', async (req, res) => {
        try {
            const actor = await getSapActor(pgQuery);
            const config = await loadSapConfig(pgQuery);
            const startedAt = new Date().toISOString();
            const payload = await createInventoryEntry({ pgQuery, config, body: req.body || {} });
            await logSapActivity(pgQuery, {
                actionType: 'write',
                entityName: 'InventoryGenEntries',
                actor,
                mode: resolveOperatingMode(config),
                status: 'success',
                internalMethod: 'POST',
                internalUrl: '/api/sap/inventory/entry',
                serviceMethod: 'POST',
                serviceUrl: `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/InventoryGenEntries`,
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
                entityName: 'InventoryGenEntries',
                actor: await getSapActor(pgQuery),
                mode: resolveOperatingMode(config),
                internalMethod: 'POST',
                internalUrl: '/api/sap/inventory/entry',
                serviceMethod: 'POST',
                serviceUrl: config.sapHost ? `${config.sapProtocol}://${config.sapHost}:${config.sapPort}/b1s/v1/InventoryGenEntries` : '',
                requestVars: summarizeSapPayload(req.body || {}),
                errorMessage: error.message
            });
            res.status(400).json({ error: error.message || 'No fue posible crear la entrada de inventario SAP.' });
        }
    });

    app.get('/api/sap/salesperson-profit-centers', async (req, res) => {
        try {
            res.json({ items: await listSapSalespersonProfitCenters(pgQuery) });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar la configuración por ejecutivo.' });
        }
    });

    app.post('/api/sap/salesperson-profit-centers', async (req, res) => {
        try {
            res.status(201).json(await saveSapSalespersonProfitCenter(pgQuery, req.body || {}));
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible guardar la configuración por ejecutivo.' });
        }
    });

    app.delete('/api/sap/salesperson-profit-centers/:id', async (req, res) => {
        try {
            res.json(await deleteSapSalespersonProfitCenter(pgQuery, normalizeText(req.params.id)));
        } catch (error) {
            const status = /no encontrada/i.test(error.message || '') ? 404 : 400;
            res.status(status).json({ error: error.message || 'No fue posible eliminar la configuración por ejecutivo.' });
        }
    });

    app.get('/api/sap/production-cost-center', async (req, res) => {
        try {
            res.json(await loadSapProductionCostCenterSettings(pgQuery));
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el centro de costo de producción.' });
        }
    });

    app.post('/api/sap/production-cost-center', async (req, res) => {
        try {
            res.json(await saveSapProductionCostCenterSettings(pgQuery, req.body || {}));
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible guardar el centro de costo de producción.' });
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

    app.get('/api/sap/item-links', async (req, res) => {
        try {
            res.json({ rows: await listSapItemLinks(pgQuery, req.query || {}) });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar las vinculaciones de inventario SAP.' });
        }
    });

    app.post('/api/sap/item-links', async (req, res) => {
        try {
            const row = await saveSapItemLink(pgQuery, req.body || {});
            res.status(201).json({ ok: true, row });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible guardar la vinculación del ítem SAP.' });
        }
    });

    app.get('/api/sap/inventory-snapshot', async (req, res) => {
        try {
            res.json({ rows: await listInventorySnapshot(pgQuery, req.query || {}) });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el snapshot local del inventario SAP.' });
        }
    });

    app.get('/api/sap/material-requests', async (req, res) => {
        try {
            res.json({ rows: await listMaterialRequests(pgQuery, req.query || {}) });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar las necesidades de materiales.' });
        }
    });

    app.get('/api/sap/material-requests/:id', async (req, res) => {
        try {
            const detail = await loadMaterialRequestDetail(pgQuery, req.params.id);
            if (!detail) {
                return res.status(404).json({ error: 'No se encontró la solicitud de materiales.' });
            }
            res.json(detail);
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el detalle de la necesidad.' });
        }
    });

    app.post('/api/sap/material-requests/from-order/:orderCode', async (req, res) => {
        try {
            const result = await createMaterialRequestFromOrder(pgQuery, req.params.orderCode, {
                actor: req.body?.actor || ''
            });
            res.status(result.reused ? 200 : 201).json({ ok: true, ...result });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible generar la necesidad de materiales.' });
        }
    });

    app.post('/api/sap/material-requests/:id/enqueue', async (req, res) => {
        try {
            const result = await enqueueMaterialRequest(pgQuery, req.params.id);
            res.status(result.reused ? 200 : 201).json({ ok: true, ...result });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible enviar la solicitud a la cola SAP.' });
        }
    });

    app.get('/api/sap/outbox', async (req, res) => {
        try {
            res.json({ rows: await listSapOutbox(pgQuery, req.query || {}) });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar la cola de integración SAP.' });
        }
    });

}

function startSapScheduler({ pgQuery, withTransaction, intervalMs = 60_000 }) {
    if (schedulerHandle) return;
    schedulerHandle = setInterval(async () => {
        if (syncInFlight) return;
        try {
            syncInFlight = true;
            const jobs = await listSapImportJobs(pgQuery);
            for (const job of jobs) {
                if (!job.filters?.enabled) continue;
                const lastFinished = job.finishedAt ? new Date(job.finishedAt).getTime() : 0;
                const due = !lastFinished || (Date.now() - lastFinished) >= ((job.filters.intervalMinutes || 30) * 60 * 1000);
                if (!due) continue;
                await executeSapImportJob({
                    pgQuery,
                    withTransaction,
                    jobCode: job.jobCode,
                    actor: 'scheduler',
                    automated: true
                });
            }
            const config = await loadSapConfig(pgQuery);
            if (!config.autoSyncEnabled) return;
            const lastFinished = config.lastSyncFinishedAt ? new Date(config.lastSyncFinishedAt).getTime() : 0;
            const enoughTimeElapsed = !lastFinished || (Date.now() - lastFinished) >= (config.syncIntervalMinutes * 60 * 1000);
            if (!enoughTimeElapsed) return;
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
    fetchSapItemsForImport,
    stageSapMirrorOrder,
    stageSapMirrorBom
};
