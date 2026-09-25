const http = require('http');
const https = require('https');
const diApiBridge = require('./sap-di-api');
// Misma clasificación de errores que usa la cola de envíos a SAP (sap-envios-service.js),
// reutilizada aquí para que un "error definitivo" signifique lo mismo en ambos mecanismos.
const { clasificarError: clasificarErrorSap, CLASES_ERROR_DEFINITIVO, encolarEnvioSap } = require('./sap-envios-service');

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
    providerNotes: '',
    autoSyncEnabled: false,
    syncIntervalMinutes: 30,
    allowSelfSigned: true,
    keepDemoEnabled: false,
    lastSyncStatus: 'idle',
    lastSyncMessage: '',
    lastSyncStartedAt: null,
    lastSyncFinishedAt: null,
    maxImportPartners: 2000,
    maxImportItems: 2000,
    productionReservationWarehouseCode: '',
    // Valores de documentos SAP (definidos por el equipo SAP del cliente).
    sapItemGroupCode: '',
    sapFinishedGoodsWarehouseCode: '',
    sapMaterialsWarehouseCode: '',
    sapFinishedGoodsUomCode: '',
    sapSalesOrderSeries: '',
    sapProductionOrderSeries: '',
    sapInvoiceSeries: '',
    sapInventoryExitSeries: '',
    sapInventoryEntrySeries: '',
    sapSalesTaxCode: '',
    sapPartnerGroupCode: '',
    sapPaymentTermsCode: '',
    sapPriceListNum: '',
    sapProductionRequiresBom: false,
    sapFacturaAutomatica: false,
    // Los campos de usuario PL_* del artículo (anexo del correo) solo se envían
    // cuando el equipo SAP ya los creó en OITM. Mientras tanto, apagado.
    sapUdfPlActivos: false
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
        query: '$select=CardCode,CardName,CardType,Balance,Currency,Phone1,Phone2,Email,EmailAddress,ContactPerson,PriceListNum,FederalTaxID,LicTradNum,Cellular,SalesPersonCode,BPAddresses,ContactEmployees&$expand=BPAddresses,ContactEmployees'
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
        columns: ['CardCode', 'CardName', 'CardType', 'Currency', 'LicTradNum', 'FederalTaxID', 'Phone1', 'E_Mail', 'CntctPrsn', 'ListNum', 'validFor', 'Balance', 'GroupCode', 'VatGroup', 'Territory']
    },
    CRD1: {
        label: 'Direcciones de socios',
        group: 'socios',
        direction: 'import',
        key: 'CardCode',
        columns: ['CardCode', 'Address', 'AdresType', 'Street', 'Block', 'ZipCode', 'City', 'County', 'State', 'Country', 'Building']
    },
    OCPR: {
        label: 'Contactos de socios',
        group: 'socios',
        direction: 'import',
        key: 'CardCode',
        columns: ['CardCode', 'CntctCode', 'Name', 'Position', 'Tel1', 'Tel2', 'Cellolar', 'Fax']
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
    },
    OSLP: {
        label: 'Vendedores',
        group: 'socios',
        direction: 'import',
        key: 'sales_person_code',
        pgTable: 'sap_salesperson_profit_centers',
        columns: ['sales_person_code', 'salesperson_name', 'nombre_local', 'profit_center_code', 'is_active']
    },
    HISTORIAL_ENVIOS: {
        label: 'Historial de cada envío a SAP (qué se mandó, qué contestó, cuándo)',
        group: 'historial',
        direction: 'export',
        key: 'id',
        pgTable: 'sap_write_log',
        columns: ['id', 'entity_name', 'mode', 'status', 'request_payload', 'response_payload', 'error_message', 'created_at']
    },
    HISTORIAL_LLAMADAS: {
        label: 'Historial de cada llamada a SAP, lectura o escritura (quién, qué pidió, qué contestó, cuándo)',
        group: 'historial',
        direction: 'both',
        key: 'id',
        pgTable: 'sap_activity_log',
        columns: ['id', 'action_type', 'entity_name', 'actor', 'status', 'internal_url', 'service_url', 'request_vars', 'response_summary', 'error_message', 'started_at', 'finished_at']
    },
    HISTORIAL_PREGUNTAS: {
        label: 'Preguntas hechas al conector DIAPI (consulta pedida, si ya contestó, cuándo)',
        group: 'historial',
        direction: 'import',
        key: 'id',
        pgTable: 'sap_inbox_requests',
        columns: ['id', 'entity_type', 'status', 'parameters', 'result_payload', 'last_error', 'provider_error_sql', 'created_at', 'answered_at', 'applied_at']
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
            'SELECT CardCode, CardName, CardType, Currency, LicTradNum, FederalTaxID, Phone1, E_Mail, CntctPrsn, ListNum, validFor, Balance, SlpCode',
            '  FROM OCRD',
            " WHERE validFor = 'Y'",
            "   AND CardType = 'C'",
            "   AND CardCode LIKE 'C%'",
            ' ORDER BY CardCode ASC'
        ].join('\n'),
        relatedSql: [
            'SELECT CardCode, Address, AdresType, Street, City, County, Country FROM CRD1 WHERE CardCode IN (:CardCode)',
            'SELECT CardCode, CntctCode, Name, Tel1 FROM OCPR WHERE CardCode IN (:CardCode)'
        ],
        note: "Solo clientes activos (CardType 'C') cuyo código inicia con 'C'; direcciones y contactos se guardan en tablas separadas."
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
    },
    'sap-import-salespeople': {
        jobCode: 'sap-import-salespeople',
        label: 'Vendedores',
        entityLabel: 'OSLP',
        internalUrl: '/api/sap/salesperson-profit-centers/sync',
        serviceUrl: 'sap-mirror://SalesPersons',
        defaultFilters: {
            enabled: false,
            intervalMinutes: 60,
            limit: 500,
            search: '',
            type: ''
        }
    },
    'sap-import-contacts': {
        jobCode: 'sap-import-contacts',
        label: 'Contactos',
        entityLabel: 'OCPR',
        internalUrl: '/api/sap/mirror/import-contacts',
        serviceUrl: 'sap-mirror://Contacts',
        defaultFilters: {
            enabled: false,
            intervalMinutes: 30,
            limit: 2000,
            search: ''
        }
    },
    'sap-import-addresses': {
        jobCode: 'sap-import-addresses',
        label: 'Direcciones',
        entityLabel: 'CRD1',
        internalUrl: '/api/sap/mirror/import-addresses',
        serviceUrl: 'sap-mirror://Addresses',
        defaultFilters: {
            enabled: false,
            intervalMinutes: 30,
            limit: 2000,
            search: ''
        }
    },
    'sap-import-batches': {
        jobCode: 'sap-import-batches',
        label: 'Lotes (tintas)',
        entityLabel: 'OBTN',
        internalUrl: '/api/sap/mirror/import-batches',
        serviceUrl: 'sap-mirror://Batches',
        defaultFilters: {
            enabled: false,
            intervalMinutes: 30,
            limit: 2000,
            search: ''
        }
    },
    // Único flujo de "push" en esta lista (todos los demás son "pull", importan
    // desde SAP hacia PrintLab): envía la tasa del dólar del día hacia SAP.
    // No usa límite ni filtro (siempre es un solo valor: el tipo de cambio de hoy).
    'sap-envio-tipo-cambio': {
        jobCode: 'sap-envio-tipo-cambio',
        label: 'Tipo de cambio del dólar (USD→GTQ)',
        entityLabel: 'ExchangeRates',
        internalUrl: '/api/exchange-rates/enviar-sap',
        serviceUrl: 'sap-push://ExchangeRate',
        direction: 'push',
        defaultFilters: {
            enabled: false,
            intervalMinutes: 1440
        }
    }
});

// jobCode de Automatización → entity_type usado al preguntarle a DIAPI (sap_inbox_requests.entity_type).
const SAP_IMPORT_JOB_INBOX_ENTITY = Object.freeze({
    'sap-import-business-partners': 'business-partners',
    'sap-import-items': 'items',
    'sap-import-salespeople': 'salespersons',
    'sap-import-contacts': 'business-partner-contacts',
    'sap-import-addresses': 'business-partner-addresses',
    'sap-import-batches': 'item-batches'
});

// Catálogo completo de tablas que usa la integración con SAP: para qué sirve
// cada una, quién la llena y quién la lee. Es documentación fija, no datos —
// sirve para responder "¿qué tabla se está tocando?" sin tener que leer el
// código cada vez. Si se agrega una tabla nueva relacionada con SAP, agregarla
// aquí también.
const CATALOGO_TABLAS_SAP = Object.freeze([
    {
        grupo: 'Copia exacta de SAP (mismos nombres y campos que SAP)',
        nota: '',
        tablas: [
            { tabla: 'OCRD', paraQueSirve: 'Encabezado de cada socio de negocio traído de SAP.', quienLaLlena: 'La importación automática de Socios (conector DIAPI).', quienLaLee: 'Pestaña Tablas, para auditoría.' },
            { tabla: 'CRD1', paraQueSirve: 'Direcciones de cada socio.', quienLaLlena: 'La importación automática de Socios (conector DIAPI).', quienLaLee: 'Pestaña Tablas, para auditoría.' },
            { tabla: 'OCPR', paraQueSirve: 'Contactos de cada socio.', quienLaLlena: 'La importación automática de Socios (conector DIAPI).', quienLaLee: 'Pestaña Tablas, para auditoría.' },
            { tabla: 'OITM', paraQueSirve: 'Encabezado de cada artículo traído de SAP.', quienLaLlena: 'La importación automática de Inventario (conector DIAPI).', quienLaLee: 'Pestaña Tablas, para auditoría.' },
            { tabla: 'OITW', paraQueSirve: 'Existencia de cada artículo, por bodega.', quienLaLlena: 'La importación automática de Inventario (conector DIAPI).', quienLaLee: 'Pestaña Tablas, para auditoría.' },
            { tabla: 'ITM1', paraQueSirve: 'Precio de cada artículo, por lista de precios.', quienLaLlena: 'La importación automática de Inventario (conector DIAPI).', quienLaLee: 'Pestaña Tablas, para auditoría.' },
            { tabla: 'OWHS', paraQueSirve: 'Catálogo de bodegas.', quienLaLlena: 'La importación automática de Inventario (conector DIAPI).', quienLaLee: 'Pestaña Tablas, para auditoría.' },
            { tabla: 'ORDR', paraQueSirve: 'Encabezado de cada orden de venta que PrintLab mandó a SAP.', quienLaLlena: 'El envío de Orden de Venta (conector DIAPI).', quienLaLee: 'Pestaña Tablas y pantalla de Automatización, para auditoría.' },
            { tabla: 'RDR1', paraQueSirve: 'Líneas (productos) de cada orden de venta enviada.', quienLaLlena: 'El envío de Orden de Venta (conector DIAPI).', quienLaLee: 'Pestaña Tablas y pantalla de Automatización, para auditoría.' },
            { tabla: 'OWOR', paraQueSirve: 'Encabezado de cada orden de producción enviada.', quienLaLlena: 'El envío de BOM / Producción (conector DIAPI).', quienLaLee: 'Pestaña Tablas y pantalla de Automatización, para auditoría.' },
            { tabla: 'WOR1', paraQueSirve: 'Componentes de cada orden de producción enviada.', quienLaLlena: 'El envío de BOM / Producción (conector DIAPI).', quienLaLee: 'Pestaña Tablas y pantalla de Automatización, para auditoría.' },
            { tabla: 'OITT', paraQueSirve: 'Receta (BOM) enviada a SAP.', quienLaLlena: 'El envío de BOM / Producción (conector DIAPI).', quienLaLee: 'Pestaña Tablas y pantalla de Automatización, para auditoría.' },
            { tabla: 'ITT1', paraQueSirve: 'Componentes de cada receta (BOM) enviada.', quienLaLlena: 'El envío de BOM / Producción (conector DIAPI).', quienLaLee: 'Pestaña Tablas y pantalla de Automatización, para auditoría.' }
        ]
    },
    {
        grupo: 'Copia que usan las pantallas de PrintLab (mismos datos, en otro formato)',
        nota: '',
        tablas: [
            { tabla: 'sap_business_partners', paraQueSirve: 'Copia de los socios, lista para las pantallas de Socios y Cotizaciones.', quienLaLlena: 'Se llena junto con OCRD/CRD1/OCPR, en la misma importación.', quienLaLee: 'Pantallas de Socios, Cotizaciones y buscador de clientes.' },
            { tabla: 'sap_items', paraQueSirve: 'Copia de los artículos, con campos que PrintLab agrega encima (ancho, gramaje, calibre, proveedor, marca, clasificación). Es la tabla que hoy alimenta Costos → Inventarios SAP.', quienLaLlena: 'Se llena junto con OITM/OITW/ITM1, en la misma importación.', quienLaLee: 'Costos → Inventarios SAP, el catálogo de materiales del cálculo, y el mapeo de clasificación por categoría.' },
            { tabla: 'sap_warehouses', paraQueSirve: 'Copia de las bodegas.', quienLaLlena: 'Se llena junto con OWHS.', quienLaLee: 'Pantallas donde se elige bodega.' },
            { tabla: 'sap_orders', paraQueSirve: 'Copia de las órdenes de venta enviadas, en el formato que usa la aplicación.', quienLaLlena: 'Se llena junto con ORDR/RDR1.', quienLaLee: 'Pantallas de seguimiento de órdenes hacia SAP.' },
            { tabla: 'sap_invoices', paraQueSirve: 'Copia de las facturas enviadas.', quienLaLlena: 'Al enviar una factura a SAP.', quienLaLee: 'Pantallas de facturación y seguimiento.' },
            { tabla: 'sap_item_links', paraQueSirve: 'Relaciona un material o insumo local (de una receta o el cálculo) con su código de artículo real en SAP.', quienLaLlena: 'Al vincular un material del cálculo con su artículo de SAP.', quienLaLee: 'El cálculo y las recetas, para saber a qué artículo de SAP corresponde cada material.' },
            { tabla: 'sap_inventory_snapshot', paraQueSirve: 'Una foto de las existencias de cada artículo, tomada de sap_items en un momento dado.', quienLaLlena: 'Procesos que guardan una foto de inventario para historial.', quienLaLee: 'Reportes que necesitan ver existencias de una fecha pasada.' }
        ]
    },
    {
        grupo: 'Cola de envíos hacia SAP (lo que se ve en Monitoreo → Envíos)',
        nota: '',
        tablas: [
            { tabla: 'sap_envios_pendientes', paraQueSirve: 'Cada documento que PrintLab debe mandar a SAP (socio, artículo, orden de venta, factura, BOM, orden de producción, salida de materiales), con su estado y cuántas veces se ha intentado. Es la tabla detrás de la pantalla de Envíos.', quienLaLlena: 'Se crea una fila cada vez que se guarda algo que debe subir a SAP.', quienLaLee: 'Configuración → Seguridad → SAP → Envíos.' },
            { tabla: 'sap_envios_intentos', paraQueSirve: 'El detalle de cada intento de un envío: qué se mandó, qué contestó SAP, si falló y por qué.', quienLaLlena: 'El proceso que reintenta los envíos pendientes, en cada intento.', quienLaLee: 'La misma pantalla de Envíos, al abrir el detalle de un documento.' },
            { tabla: 'sap_envios_config', paraQueSirve: 'Cuántas veces reintentar un envío y cuánto esperar entre intentos.', quienLaLlena: 'Se edita desde la pantalla de Envíos.', quienLaLee: 'El proceso que reintenta los envíos pendientes.' },
            { tabla: 'sap_outbox', paraQueSirve: 'El buzón real donde queda cada documento esperando a que el conector DIAPI lo recoja y lo cree o actualice en SAP. Cada envío de sap_envios_pendientes termina escribiendo aquí adentro.', quienLaLlena: 'PrintLab, al armar el documento que se va a enviar.', quienLaLee: 'El conector DIAPI, cuando revisa si hay algo pendiente; luego PrintLab, cuando lee la respuesta.' },
            { tabla: 'sap_outbox_attempts', paraQueSirve: 'El detalle técnico de cada vez que el conector intentó procesar un documento del buzón.', quienLaLlena: 'El conector DIAPI, al contestar.', quienLaLee: 'Diagnóstico técnico interno.' }
        ]
    },
    {
        grupo: 'Preguntas hacia SAP (lecturas bajo demanda)',
        nota: '',
        tablas: [
            { tabla: 'sap_inbox_requests', paraQueSirve: 'Una pregunta que PrintLab le hizo al conector (por ejemplo "tráeme los vendedores") y que espera respuesta.', quienLaLlena: 'PrintLab, al pedir una importación o una consulta.', quienLaLee: 'El conector DIAPI, para saber qué le preguntan; luego PrintLab, para leer la respuesta.' },
            { tabla: 'sap_sync_jobs', paraQueSirve: 'La configuración de cada carga automática (socios, inventario, vendedores, contactos, direcciones, lotes): cada cuánto correr, con qué filtro, cuándo corrió por última vez.', quienLaLlena: 'Configuración → Seguridad → SAP → Automatización.', quienLaLee: 'La misma pantalla de Automatización.' },
            { tabla: 'sap_diapi_heartbeat', paraQueSirve: 'La última vez que el conector DIAPI vino a preguntar algo, para saber si sigue conectado.', quienLaLlena: 'El conector, cada vez que se conecta.', quienLaLee: 'El indicador de conexión en la pantalla de Automatización.' }
        ]
    },
    {
        grupo: 'Configuración y bitácoras',
        nota: '',
        tablas: [
            { tabla: 'sap_integration_config', paraQueSirve: 'Los datos de conexión a SAP: servidor, usuario, modo de trabajo.', quienLaLlena: 'Configuración → Seguridad → SAP → Configuración.', quienLaLee: 'Toda la integración, para saber a dónde conectarse.' },
            { tabla: 'sap_sync_log', paraQueSirve: 'Historial de cada sincronización: cuántos registros trajo, si hubo error.', quienLaLlena: 'Cada sincronización, al terminar.', quienLaLee: 'Diagnóstico técnico interno.' },
            { tabla: 'sap_write_log', paraQueSirve: 'Historial de escrituras hacia SAP (registro más antiguo, junto a sap_envios_intentos).', quienLaLlena: 'Cada escritura hacia SAP, al terminar.', quienLaLee: 'Diagnóstico técnico interno.' },
            { tabla: 'sap_activity_log', paraQueSirve: 'Historial detallado de cada llamada hacia SAP, sea lectura o escritura: qué se pidió y qué contestó.', quienLaLlena: 'Cada llamada hacia SAP, al terminar.', quienLaLee: 'Configuración → Seguridad → SAP → Importación.' },
            { tabla: 'sap_salesperson_profit_centers', paraQueSirve: 'La lista de vendedores traída de SAP, con el centro de beneficio que se le asigna a mano a cada uno.', quienLaLlena: 'La importación de vendedores; el centro de beneficio se llena a mano.', quienLaLee: 'Configuración → Seguridad → Vendedor SAP; el envío de órdenes a SAP.' },
            { tabla: 'sap_production_cost_center_settings', paraQueSirve: 'El centro de costo que se usa por defecto para producción.', quienLaLlena: 'Configuración SAP.', quienLaLee: 'El envío de órdenes de producción.' },
            { tabla: 'sap_bom_local', paraQueSirve: 'Copia local de la receta (BOM) que se envió a SAP, para comparar contra lo que en verdad se está gastando.', quienLaLlena: 'Al crear o actualizar una receta en SAP.', quienLaLee: 'La Consola de Pruebas SAP, al avisar "esto no está en el BOM".' },
            { tabla: 'sap_salidas_materiales', paraQueSirve: 'Cada descarga de materiales que se le mandó a SAP para una orden.', quienLaLlena: 'Al descontar materiales de una orden contra SAP.', quienLaLee: 'La Consola de Pruebas SAP.' },
            { tabla: 'official_queries', paraQueSirve: 'Las 8 consultas oficiales de inventario que se definieron, más las consultas de referencia de las cargas automáticas. Es texto de referencia, editable desde la pantalla.', quienLaLlena: 'Se edita desde Consultas Oficiales.', quienLaLee: 'La pantalla de Consultas Oficiales y Costos → Inventarios SAP (como referencia; ver nota de auditoría).' }
        ]
    }
]);

const SESSION_STATE = {
    cacheKey: '',
    cookie: '',
    expiresAt: 0
};

let demoState = deepClone(DEMO_DATA_SEED);
let schedulerHandle = null;
let syncInFlight = false;
let limpiezaInboxHandle = null;
let limpiezaInboxEnCurso = false;

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
            addressName: normalizeText(address.AddressName || address.Address, `SAP-${index + 1}`),
            addressTypeCode: normalizeText(address.AddressType || address.AdresType),
            addressTypeLabel: mapSapAddressType(address.AddressType || address.AdresType),
            country: normalizeText(address.Country),
            stateProvince: normalizeText(address.State || address.StateProvince),
            county: normalizeText(address.County),
            district: normalizeText(address.Block),
            addressLine: buildSapAddressLine(address),
            zipCode: normalizeText(address.ZipCode),
            block: normalizeText(address.Block),
            city: normalizeText(address.City),
            building: normalizeText(address.Building),
            floor: normalizeText(address.Floor),
            room: normalizeText(address.Room),
            streetNumber: normalizeText(address.StreetNo),
            payload: address || {}
        }))
        .filter((address) => address.addressName || address.addressLine);
}

function pickSapPartnerField(source = {}, keys = [], fallback = '') {
    for (const key of keys) {
        const value = source?.[key];
        if (value != null && String(value).trim() !== '') return String(value).trim();
    }
    return fallback;
}

function pickSapPartnerTaxId(row = {}) {
    return pickSapPartnerField(row, [
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

function pickSapPartnerEmail(row = {}) {
    return pickSapPartnerField(row, ['Email', 'EmailAddress', 'E_Mail', 'E_MailL', 'MailAddress', 'U_Email']);
}

function pickSapPartnerPhone(row = {}) {
    return pickSapPartnerField(row, ['Phone1', 'Phone2', 'Tel1', 'Telephone1', 'U_Telefono']);
}

function pickSapPartnerMobile(row = {}) {
    return pickSapPartnerField(row, ['Cellular', 'CellularPhone', 'Cellolar', 'MobilePhone', 'Mobile', 'U_Celular']);
}

function splitSapContactName(value = '') {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { firstName: '', lastName: '' };
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
    };
}

function pickSapContactIdentification(contact = {}, fallback = '') {
    return pickSapPartnerField(contact, [
        'FederalTaxID',
        'LicTradNum',
        'TaxId',
        'TaxID',
        'U_IDFiscal',
        'U_Identificacion',
        'U_Cedula',
        'Identification'
    ], fallback);
}

function extractSapContacts(row = {}, primaryAddress = {}) {
    const contacts = Array.isArray(row.ContactEmployees)
        ? row.ContactEmployees
        : (Array.isArray(row.Contacts) ? row.Contacts : []);
    const fallbackName = pickSapPartnerField(row, ['ContactPerson', 'CntctPrsn']);
    const sourceRows = contacts.length ? contacts : (fallbackName ? [{
        Name: fallbackName,
        FirstName: fallbackName,
        E_Mail: pickSapPartnerEmail(row),
        Tel1: pickSapPartnerPhone(row),
        Cellolar: pickSapPartnerMobile(row),
        Position: 'Principal'
    }] : []);
    return sourceRows.map((contact) => {
        const name = pickSapPartnerField(contact, ['Name', 'ContactName', 'FirstName'], fallbackName);
        const parts = splitSapContactName(name);
        return {
            contactName: name,
            firstName: pickSapPartnerField(contact, ['FirstName'], parts.firstName),
            lastName: pickSapPartnerField(contact, ['LastName'], parts.lastName),
            email: pickSapPartnerField(contact, ['E_Mail', 'E_MailL', 'Email', 'EmailAddress'], pickSapPartnerEmail(row)),
            phone: pickSapPartnerField(contact, ['Tel1', 'Phone1', 'Telephone1'], pickSapPartnerPhone(row)),
            mobile: pickSapPartnerField(contact, ['Cellolar', 'Cellular', 'MobilePhone', 'Mobile'], pickSapPartnerMobile(row)),
            fax: pickSapPartnerField(contact, ['Fax', 'Fax1']),
            position: pickSapPartnerField(contact, ['Position', 'Title'], 'Principal'),
            country: pickSapPartnerField(contact, ['Country'], primaryAddress.country || ''),
            stateProvince: pickSapPartnerField(contact, ['State', 'StateProvince'], primaryAddress.stateProvince || ''),
            county: pickSapPartnerField(contact, ['County'], primaryAddress.county || ''),
            addressLine: pickSapPartnerField(contact, ['Address'], primaryAddress.addressLine || ''),
            identification: pickSapContactIdentification(contact, pickSapPartnerTaxId(row)),
            sapContactCode: pickSapPartnerField(contact, ['CntctCode']),
            phone2: pickSapPartnerField(contact, ['Tel2']),
            phone3: pickSapPartnerField(contact, ['Tel3']),
            website: pickSapPartnerField(contact, ['HomePage']),
            notes: pickSapPartnerField(contact, ['Notes1']),
            notes2: pickSapPartnerField(contact, ['Notes2']),
            street: pickSapPartnerField(contact, ['Street']),
            block: pickSapPartnerField(contact, ['Block']),
            zipCode: pickSapPartnerField(contact, ['ZipCode']),
            city: pickSapPartnerField(contact, ['City']),
            payload: contact || {}
        };
    }).filter((contact) => contact.contactName || contact.email || contact.phone || contact.mobile);
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
    if (normalized === 'di-api') return 'di-api';
    if (normalized === 'di-api-middleware') return 'di-api-middleware';
    return 'service-layer';
}

function isDiApiProvider(config = {}) {
    return normalizeSapProvider(config.provider || config.sapProvider) === 'di-api';
}

function isDiApiMiddlewareProvider(config = {}) {
    return normalizeSapProvider(config.provider || config.sapProvider || config.sap_provider) === 'di-api-middleware';
}

function isLiveProviderReady(config = {}) {
    const provider = normalizeSapProvider(config.provider || config.sapProvider || config.sap_provider);
    if (provider === 'di-api-middleware') {
        // No requiere datos de conexión: PrintLab solo encola la necesidad y el
        // conector DIAPI (que sí tiene los datos de SAP) la resuelve por su cuenta.
        return true;
    }
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
        providerNotes: normalizeText(source.providerNotes || source.provider_notes),
        autoSyncEnabled: normalizeBoolean(source.autoSyncEnabled != null ? source.autoSyncEnabled : source.auto_sync_enabled, DEFAULT_SAP_CONFIG.autoSyncEnabled),
        syncIntervalMinutes: normalizePositiveInt(source.syncIntervalMinutes || source.sync_interval_minutes, DEFAULT_SAP_CONFIG.syncIntervalMinutes, 5, 1440),
        allowSelfSigned: normalizeBoolean(source.allowSelfSigned != null ? source.allowSelfSigned : source.allow_self_signed, DEFAULT_SAP_CONFIG.allowSelfSigned),
        keepDemoEnabled: normalizeBoolean(source.keepDemoEnabled != null ? source.keepDemoEnabled : source.keep_demo_enabled, DEFAULT_SAP_CONFIG.keepDemoEnabled),
        lastSyncStatus: normalizeText(source.lastSyncStatus || source.last_sync_status, DEFAULT_SAP_CONFIG.lastSyncStatus),
        lastSyncMessage: normalizeText(source.lastSyncMessage || source.last_sync_message, DEFAULT_SAP_CONFIG.lastSyncMessage),
        lastSyncStartedAt: normalizeTimestamp(source.lastSyncStartedAt || source.last_sync_started_at),
        lastSyncFinishedAt: normalizeTimestamp(source.lastSyncFinishedAt || source.last_sync_finished_at),
        maxImportPartners: normalizePositiveInt(source.maxImportPartners || source.max_import_partners, DEFAULT_SAP_CONFIG.maxImportPartners, 1, 100000),
        maxImportItems: normalizePositiveInt(source.maxImportItems || source.max_import_items, DEFAULT_SAP_CONFIG.maxImportItems, 1, 100000),
        productionReservationWarehouseCode: normalizeText(source.productionReservationWarehouseCode || source.production_reservation_warehouse_code),
        sapItemGroupCode: normalizeText(source.sapItemGroupCode || source.sap_item_group_code),
        sapFinishedGoodsWarehouseCode: normalizeText(source.sapFinishedGoodsWarehouseCode || source.sap_finished_goods_warehouse_code),
        sapMaterialsWarehouseCode: normalizeText(source.sapMaterialsWarehouseCode || source.sap_materials_warehouse_code),
        sapFinishedGoodsUomCode: normalizeText(source.sapFinishedGoodsUomCode || source.sap_finished_goods_uom_code),
        sapSalesOrderSeries: normalizeText(source.sapSalesOrderSeries || source.sap_sales_order_series),
        sapProductionOrderSeries: normalizeText(source.sapProductionOrderSeries || source.sap_production_order_series),
        sapInvoiceSeries: normalizeText(source.sapInvoiceSeries || source.sap_invoice_series),
        sapInventoryExitSeries: normalizeText(source.sapInventoryExitSeries || source.sap_inventory_exit_series),
        sapInventoryEntrySeries: normalizeText(source.sapInventoryEntrySeries || source.sap_inventory_entry_series),
        sapSalesTaxCode: normalizeText(source.sapSalesTaxCode || source.sap_sales_tax_code),
        sapPartnerGroupCode: normalizeText(source.sapPartnerGroupCode || source.sap_partner_group_code),
        sapPaymentTermsCode: normalizeText(source.sapPaymentTermsCode || source.sap_payment_terms_code),
        sapPriceListNum: normalizeText(source.sapPriceListNum || source.sap_price_list_num),
        sapProductionRequiresBom: normalizeBoolean(
            source.sapProductionRequiresBom != null ? source.sapProductionRequiresBom : source.sap_production_requires_bom,
            DEFAULT_SAP_CONFIG.sapProductionRequiresBom
        ),
        sapFacturaAutomatica: normalizeBoolean(
            source.sapFacturaAutomatica != null ? source.sapFacturaAutomatica : source.sap_factura_automatica,
            DEFAULT_SAP_CONFIG.sapFacturaAutomatica
        ),
        sapUdfPlActivos: normalizeBoolean(
            source.sapUdfPlActivos != null ? source.sapUdfPlActivos : source.sap_udf_pl_activos,
            DEFAULT_SAP_CONFIG.sapUdfPlActivos
        )
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
            max_import_partners INTEGER NOT NULL DEFAULT 2000,
            max_import_items INTEGER NOT NULL DEFAULT 2000,
            provider_notes TEXT NOT NULL DEFAULT '',
            production_reservation_warehouse_code TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS provider_notes TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS production_reservation_warehouse_code TEXT NOT NULL DEFAULT ''`);
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
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS max_import_partners INTEGER NOT NULL DEFAULT 2000`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS max_import_items INTEGER NOT NULL DEFAULT 2000`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    // Valores de documentos SAP (Configuración → SAP → Valores SAP).
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_item_group_code TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_finished_goods_warehouse_code TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_materials_warehouse_code TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_finished_goods_uom_code TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_sales_order_series TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_production_order_series TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_invoice_series TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_inventory_exit_series TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_inventory_entry_series TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_sales_tax_code TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_partner_group_code TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_payment_terms_code TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_price_list_num TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_production_requires_bom BOOLEAN NOT NULL DEFAULT FALSE`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_factura_automatica BOOLEAN NOT NULL DEFAULT FALSE`);
    await pgQuery(`ALTER TABLE sap_integration_config ADD COLUMN IF NOT EXISTS sap_udf_pl_activos BOOLEAN NOT NULL DEFAULT FALSE`);
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
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "Phone2" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "Cellular" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "Fax" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "IntrntSite" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "Notes" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "VatGroup" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "GroupCode" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "Territory" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "OwnerCode" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "ValidFrom" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "ValidTo" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "FrozenFrom" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "FrozenTo" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "Address" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "Block" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "ZipCode" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "City" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "County" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "Country" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "State1" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "Building" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "MailAddres" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "MailBlock" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "MailZipCod" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "MailCity" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "MailCounty" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "MailCountr" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "State2" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "MailBuildi" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "BillToDef" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCRD" ADD COLUMN IF NOT EXISTS "ShipToDef" TEXT NOT NULL DEFAULT ''`);
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
    await pgQuery(`ALTER TABLE "CRD1" ADD COLUMN IF NOT EXISTS "Building" TEXT NOT NULL DEFAULT ''`);
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
    await pgQuery(`ALTER TABLE "OCPR" ADD COLUMN IF NOT EXISTS "CntctCode" INTEGER`);
    await pgQuery(`ALTER TABLE "OCPR" ADD COLUMN IF NOT EXISTS "Tel2" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCPR" ADD COLUMN IF NOT EXISTS "Fax" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE "OCPR" ADD COLUMN IF NOT EXISTS "E_Mail" TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCPR' AND column_name = 'E_MailL') AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCPR' AND column_name = 'E_Mail') THEN ALTER TABLE "OCPR" RENAME COLUMN "E_MailL" TO "E_Mail"; END IF; END $$`);
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
    // Datos técnicos del material tomados de los campos de usuario del maestro de artículos de SAP
    // (U_Ancho / U_Gramaje / U_Calibre / U_Proveedor / U_Marca). El sistema solo los lee; nunca los
    // edita. Si SAP no los trae, el material queda incompleto y se bloquea en el cálculo.
    await pgQuery(`ALTER TABLE sap_items ADD COLUMN IF NOT EXISTS ancho_mm NUMERIC NULL`);
    await pgQuery(`ALTER TABLE sap_items ADD COLUMN IF NOT EXISTS gramaje_g_m2 NUMERIC NULL`);
    await pgQuery(`ALTER TABLE sap_items ADD COLUMN IF NOT EXISTS calibre_micras NUMERIC NULL`);
    await pgQuery(`ALTER TABLE sap_items ADD COLUMN IF NOT EXISTS proveedor TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_items ADD COLUMN IF NOT EXISTS marca TEXT NOT NULL DEFAULT ''`);
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
        CREATE TABLE IF NOT EXISTS sap_inbox_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            request_code TEXT NOT NULL UNIQUE,
            module_name TEXT NOT NULL DEFAULT 'sap',
            entity_type TEXT NOT NULL,
            reference_id TEXT NOT NULL DEFAULT '',
            reference_code TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
            result_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            last_error TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            answered_at TIMESTAMPTZ NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_inbox_requests_status_idx ON sap_inbox_requests (status, created_at)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_inbox_requests_reference_idx ON sap_inbox_requests (entity_type, reference_code)`);
    // Marca cuándo la respuesta del conector realmente quedó aplicada en las tablas locales
    // (no solo contestada) — para poder mostrarle al usuario "sí llegó y sí se guardó",
    // no solo "sí contestó".
    await pgQuery(`ALTER TABLE sap_inbox_requests ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ NULL`);
    await pgQuery(`ALTER TABLE sap_inbox_requests ADD COLUMN IF NOT EXISTS records_applied INTEGER NULL`);
    // Detalle crudo del error reportado por el conector DIAPI cuando una consulta falla:
    // el SQL exacto que se ejecutó contra SAP y el mensaje original de SAP/HANA (sin el
    // envoltorio "No fue posible consultar…"). Sirve para diagnosticar desde PrintLab sin
    // pedir los logs del conector.
    await pgQuery(`ALTER TABLE sap_inbox_requests ADD COLUMN IF NOT EXISTS provider_error_sql TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE sap_inbox_requests ADD COLUMN IF NOT EXISTS provider_error_detail TEXT NOT NULL DEFAULT ''`);
    // Clasificación del error (misma función que sap-envios-service.js) para distinguir
    // una falla definitiva (p.ej. la referencia ya no existe: nunca se va a resolver sola,
    // necesita que una persona la revise) de una falla temporal (p.ej. sin conexión: el
    // siguiente intento puede funcionar solo). Se usa para protegerla del borrado automático.
    await pgQuery(`ALTER TABLE sap_inbox_requests ADD COLUMN IF NOT EXISTS error_clase TEXT NOT NULL DEFAULT ''`);

    // ── Cola local de envíos a SAP (push desde PrintLab, sin middleware) ──────
    // Registra cada documento que hay que enviar a SAP (socio, orden de venta,
    // producto terminado, factura), lo reintenta en cada corrida del scheduler
    // hasta 'max_intentos', y guarda el detalle de cada intento (incluida la
    // respuesta cruda de SAP) para diagnóstico de Finanzas.
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_envios_pendientes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            codigo TEXT NOT NULL UNIQUE,
            tipo TEXT NOT NULL,
            referencia TEXT NOT NULL DEFAULT '',
            estado TEXT NOT NULL DEFAULT 'pendiente',
            intentos INTEGER NOT NULL DEFAULT 0,
            max_intentos INTEGER NOT NULL DEFAULT 10,
            proximo_intento_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ultimo_error TEXT NOT NULL DEFAULT '',
            ultimo_error_clase TEXT NOT NULL DEFAULT '',
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            resultado JSONB NOT NULL DEFAULT '{}'::jsonb,
            creado_por TEXT NOT NULL DEFAULT '',
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            enviado_en TIMESTAMPTZ NULL,
            fallido_en TIMESTAMPTZ NULL,
            notificado_en TIMESTAMPTZ NULL
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_envios_pendientes_estado_idx ON sap_envios_pendientes (estado, proximo_intento_en)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_envios_pendientes_ref_idx ON sap_envios_pendientes (tipo, referencia)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_envios_intentos (
            id BIGSERIAL PRIMARY KEY,
            envio_id UUID NOT NULL REFERENCES sap_envios_pendientes(id) ON DELETE CASCADE,
            numero INTEGER NOT NULL DEFAULT 1,
            estado TEXT NOT NULL DEFAULT '',
            error TEXT NOT NULL DEFAULT '',
            error_clase TEXT NOT NULL DEFAULT '',
            request JSONB NOT NULL DEFAULT '{}'::jsonb,
            response JSONB NOT NULL DEFAULT '{}'::jsonb,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_envios_intentos_envio_idx ON sap_envios_intentos (envio_id, creado_en DESC)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_envios_config (
            id INTEGER PRIMARY KEY DEFAULT 1,
            max_intentos INTEGER NOT NULL DEFAULT 10,
            backoff_base_segundos INTEGER NOT NULL DEFAULT 60,
            actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT sap_envios_config_singleton CHECK (id = 1)
        )
    `);
    await pgQuery(`INSERT INTO sap_envios_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
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
    await pgQuery(`ALTER TABLE sap_salesperson_profit_centers ADD COLUMN IF NOT EXISTS nombre_local TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS salesperson_sap_code TEXT`);
    await pgQuery(`ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS salesperson_user_code TEXT`);
    await pgQuery(`ALTER TABLE business_partners ADD COLUMN IF NOT EXISTS sap_modified_date TIMESTAMPTZ`);
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
    // Amarra una corrida de Automatización a la solicitud sap_inbox_requests que está
    // esperando contestar el conector, para no perder la pregunta ni reenviarla en cada
    // ciclo del scheduler: se sigue revisando la MISMA solicitud hasta que responda.
    await pgQuery(`ALTER TABLE sap_sync_jobs ADD COLUMN IF NOT EXISTS pending_inbox_request_id UUID NULL`);
    for (const definition of Object.values(SAP_IMPORT_JOB_DEFS)) {
        await pgQuery(`
            INSERT INTO sap_sync_jobs (job_code, entity_name, direction, status, filters, message)
            VALUES ($1, $2, $3, 'idle', $4::jsonb, 'Pendiente de configurar automatización.')
            ON CONFLICT (job_code) DO NOTHING
        `, [
            definition.jobCode,
            definition.entityLabel,
            definition.direction || 'pull',
            JSON.stringify(definition.defaultFilters)
        ]);
    }
    // Si el servidor se reinició (o se cayó) mientras un trabajo estaba a medias,
    // ese trabajo se queda escrito como "running" para siempre — nadie puede volver a
    // intentarlo porque el candado atómico de executeSapImportJob nunca lo suelta. Un
    // proceso recién arrancado no puede tener nada realmente en curso todavía, así que
    // cualquier "running" que exista en este momento es basura de una corrida anterior
    // que nunca terminó de escribir su resultado. Se libera aquí, en cada arranque.
    await pgQuery(`
        UPDATE sap_sync_jobs
           SET status = 'error',
               message = 'Se reinició automáticamente: el servidor se reinició (o se cayó) mientras esta carga seguía en curso y nunca terminó.',
               finished_at = NOW(),
               updated_at = NOW()
         WHERE status = 'running'
    `);
    // Marca de vida del conector DIAPI: se actualiza cada vez que el conector viene a
    // preguntar algo (aunque no haya nada pendiente), para poder mostrar "sí está
    // llegando hasta acá" en vez de tener que adivinarlo por los trabajos.
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_diapi_heartbeat (
            id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
            last_seen_at TIMESTAMPTZ NULL,
            last_seen_endpoint TEXT NOT NULL DEFAULT ''
        )
    `);
    await pgQuery(`
        INSERT INTO sap_diapi_heartbeat (id, last_seen_at, last_seen_endpoint)
        VALUES (1, NULL, '')
        ON CONFLICT (id) DO NOTHING
    `);
    // Consola de Pruebas SAP: copia local del BOM enviado + historial de descargas.
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_bom_local (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sku TEXT NOT NULL,
            order_code TEXT NOT NULL DEFAULT '',
            sap_item_code TEXT NOT NULL DEFAULT '',
            item_name TEXT NOT NULL DEFAULT '',
            cantidad NUMERIC(14,4) NOT NULL DEFAULT 0,
            unidad TEXT NOT NULL DEFAULT '',
            enviado_por TEXT NOT NULL DEFAULT '',
            enviado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (sku, sap_item_code)
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_bom_local_sku_idx ON sap_bom_local (sku)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS sap_salidas_materiales (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            order_code TEXT NOT NULL,
            sku TEXT NOT NULL DEFAULT '',
            doc_entry TEXT NOT NULL DEFAULT '',
            queue_code TEXT NOT NULL DEFAULT '',
            lineas JSONB NOT NULL DEFAULT '[]'::jsonb,
            fuera_de_bom JSONB NOT NULL DEFAULT '[]'::jsonb,
            origen TEXT NOT NULL DEFAULT 'consola',
            estado TEXT NOT NULL DEFAULT 'enviado',
            error TEXT NOT NULL DEFAULT '',
            creado_por TEXT NOT NULL DEFAULT '',
            creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS sap_salidas_materiales_order_idx ON sap_salidas_materiales (order_code, creado_en DESC)`);

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
               max_import_partners = $15,
               max_import_items = $16,
               provider_notes = $17,
               production_reservation_warehouse_code = $18,
               sap_item_group_code = $19,
               sap_finished_goods_warehouse_code = $20,
               sap_materials_warehouse_code = $21,
               sap_finished_goods_uom_code = $22,
               sap_sales_order_series = $23,
               sap_production_order_series = $24,
               sap_invoice_series = $25,
               sap_inventory_exit_series = $26,
               sap_inventory_entry_series = $27,
               sap_sales_tax_code = $28,
               sap_partner_group_code = $29,
               sap_payment_terms_code = $30,
               sap_price_list_num = $31,
               sap_production_requires_bom = $32,
               sap_factura_automatica = $33,
               sap_udf_pl_activos = $34,
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
        merged.keepDemoEnabled,
        merged.maxImportPartners,
        merged.maxImportItems,
        merged.providerNotes,
        merged.productionReservationWarehouseCode,
        merged.sapItemGroupCode,
        merged.sapFinishedGoodsWarehouseCode,
        merged.sapMaterialsWarehouseCode,
        merged.sapFinishedGoodsUomCode,
        merged.sapSalesOrderSeries,
        merged.sapProductionOrderSeries,
        merged.sapInvoiceSeries,
        merged.sapInventoryExitSeries,
        merged.sapInventoryEntrySeries,
        merged.sapSalesTaxCode,
        merged.sapPartnerGroupCode,
        merged.sapPaymentTermsCode,
        merged.sapPriceListNum,
        merged.sapProductionRequiresBom,
        merged.sapFacturaAutomatica,
        merged.sapUdfPlActivos
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

// Nomenclatura de socios que entran al módulo local (business_partners y sus
// contactos/direcciones): solo los clasificados como clientes (SAP CardType 'C')
// cuyo CardCode inicia con 'C' seguido de un número (p.ej. "C0001"). El espejo
// crudo de SAP (OCRD/CRD1/OCPR/sap_business_partners) se guarda completo igual;
// este filtro solo decide qué llega a las tablas que consume la aplicación.
// Debe coincidir con el filtro del import manual en services/socios-service.js.
const PREFIJO_CODIGO_CLIENTE_SAP = 'C';
const TIPOS_TARJETA_CLIENTE_SAP = ['C'];

function socioCumpleNomenclaturaClienteSap(cardCode, cardType) {
    const codigo = normalizeText(cardCode).toUpperCase();
    const tipo = normalizeText(cardType).toUpperCase();
    return /^C\d/.test(codigo) && TIPOS_TARJETA_CLIENTE_SAP.includes(tipo);
}

async function upsertBusinessPartners(client, records) {
    for (const row of records) {
        const partnerCode = normalizeText(row.CardCode);
        const partnerName = normalizeText(row.CardName);
        const cardType = normalizeText(row.CardType);
        const balance = row.Balance == null ? null : Number(row.Balance);
        const currency = normalizeText(row.Currency);
        const phone = normalizeText(pickSapPartnerPhone(row));
        const email = normalizeText(pickSapPartnerEmail(row));
        const contactPerson = normalizeText(pickSapPartnerField(row, ['ContactPerson', 'CntctPrsn']));
        const taxId = normalizeText(pickSapPartnerTaxId(row));
        const clientType = cardType === 'C' ? 'CL' : (cardType === 'S' ? 'PR' : '');
        const sapAddresses = extractSapAddresses(row);
        const primaryAddress = sapAddresses.find((address) => String(address.addressTypeLabel || '').toLowerCase() === 'facturación')
            || sapAddresses[0]
            || {};
        const sapContacts = extractSapContacts(row, primaryAddress);
        const salespersonName = pickSapPartnerField(row, ['SalesPersonName', 'SALESPERSONNAME', 'SlpName', 'SLPNAME']);
        const rawSalespersonSapCode = pickSapPartnerField(row, ['SlpCode', 'SLPCODE', 'SalesPersonCode', 'SALESPERSONCODE']);
        const salespersonSapCode = Number(rawSalespersonSapCode) > 0 ? rawSalespersonSapCode : '';
        const sapCreationDate = normalizeTimestamp(pickSapPartnerField(row, ['CreateDate']));
        const sapModifiedDate = normalizeTimestamp(pickSapPartnerField(row, ['UpdateDate']));
        const paymentTermsName = pickSapPartnerField(row, ['PaymentTermsName', 'PymntGroup']);
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

        if (partnerCode) {
            await client.query(`
                INSERT INTO "OCRD" (
                    "CardCode", "CardName", "CardType", "Currency", "LicTradNum", "FederalTaxID",
                    "Phone1", "Phone2", "Cellular", "Fax", "E_Mail", "IntrntSite", "CntctPrsn", "Notes",
                    "VatGroup", "GroupCode", "Territory", "OwnerCode",
                    "ListNum", "validFor", "frozenFor", "Balance",
                    "ValidFrom", "ValidTo", "FrozenFrom", "FrozenTo",
                    "Address", "Block", "ZipCode", "City", "County", "Country", "State1", "Building",
                    "MailAddres", "MailBlock", "MailZipCod", "MailCity", "MailCounty", "MailCountr", "State2", "MailBuildi",
                    "BillToDef", "ShipToDef",
                    raw_data, synced_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,$45::jsonb,NOW())
                ON CONFLICT ("CardCode")
                DO UPDATE SET
                    "CardName" = EXCLUDED."CardName",
                    "CardType" = EXCLUDED."CardType",
                    "Currency" = EXCLUDED."Currency",
                    "LicTradNum" = EXCLUDED."LicTradNum",
                    "FederalTaxID" = EXCLUDED."FederalTaxID",
                    "Phone1" = EXCLUDED."Phone1",
                    "Phone2" = EXCLUDED."Phone2",
                    "Cellular" = EXCLUDED."Cellular",
                    "Fax" = EXCLUDED."Fax",
                    "E_Mail" = EXCLUDED."E_Mail",
                    "IntrntSite" = EXCLUDED."IntrntSite",
                    "CntctPrsn" = EXCLUDED."CntctPrsn",
                    "Notes" = EXCLUDED."Notes",
                    "VatGroup" = EXCLUDED."VatGroup",
                    "GroupCode" = EXCLUDED."GroupCode",
                    "Territory" = EXCLUDED."Territory",
                    "OwnerCode" = EXCLUDED."OwnerCode",
                    "ListNum" = EXCLUDED."ListNum",
                    "validFor" = EXCLUDED."validFor",
                    "frozenFor" = EXCLUDED."frozenFor",
                    "Balance" = EXCLUDED."Balance",
                    "ValidFrom" = EXCLUDED."ValidFrom",
                    "ValidTo" = EXCLUDED."ValidTo",
                    "FrozenFrom" = EXCLUDED."FrozenFrom",
                    "FrozenTo" = EXCLUDED."FrozenTo",
                    "Address" = EXCLUDED."Address",
                    "Block" = EXCLUDED."Block",
                    "ZipCode" = EXCLUDED."ZipCode",
                    "City" = EXCLUDED."City",
                    "County" = EXCLUDED."County",
                    "Country" = EXCLUDED."Country",
                    "State1" = EXCLUDED."State1",
                    "Building" = EXCLUDED."Building",
                    "MailAddres" = EXCLUDED."MailAddres",
                    "MailBlock" = EXCLUDED."MailBlock",
                    "MailZipCod" = EXCLUDED."MailZipCod",
                    "MailCity" = EXCLUDED."MailCity",
                    "MailCounty" = EXCLUDED."MailCounty",
                    "MailCountr" = EXCLUDED."MailCountr",
                    "State2" = EXCLUDED."State2",
                    "MailBuildi" = EXCLUDED."MailBuildi",
                    "BillToDef" = EXCLUDED."BillToDef",
                    "ShipToDef" = EXCLUDED."ShipToDef",
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
                sapText(row.Phone2),
                sapText(row.Cellular),
                sapText(row.Fax),
                email,
                sapText(row.IntrntSite || row.Website),
                contactPerson,
                sapText(row.Notes),
                sapText(row.VatGroup),
                sapText(row.GroupCode),
                sapText(row.Territory),
                sapText(row.OwnerCode),
                sapNumber(row.PriceListNum || row.ListNum),
                sapText(row.validFor || row.ValidFor || 'Y', 'Y'),
                sapText(row.frozenFor || row.FrozenFor || 'N', 'N'),
                balance,
                sapText(row.ValidFrom),
                sapText(row.ValidTo),
                sapText(row.FrozenFrom),
                sapText(row.FrozenTo),
                sapText(row.Address || row.BillingAddress),
                sapText(row.Block || row.BillingBlock),
                sapText(row.ZipCode || row.BillingZipCode),
                sapText(row.City || row.BillingCity),
                sapText(row.County || row.BillingCounty),
                sapText(row.Country || row.BillingCountry),
                sapText(row.State || row.BillingState),
                sapText(row.Building || row.BillingBuilding),
                sapText(row.MailAddres || row.ShippingAddress),
                sapText(row.MailBlock || row.ShippingBlock),
                sapText(row.MailZipCod || row.ShippingZipCode),
                sapText(row.MailCity || row.ShippingCity),
                sapText(row.MailCounty || row.ShippingCounty),
                sapText(row.MailCountr || row.ShippingCountry),
                sapText(row.State2 || row.ShippingState),
                sapText(row.MailBuildi || row.ShippingBuilding),
                sapText(row.BillToDef),
                sapText(row.ShipToDef),
                JSON.stringify(row || {})
            ]);
            await client.query(`DELETE FROM "CRD1" WHERE "CardCode" = $1`, [partnerCode]);
            for (const address of (Array.isArray(row.BPAddresses) ? row.BPAddresses : [])) {
                await client.query(`
                    INSERT INTO "CRD1" (
                        "CardCode", "Address", "AdresType", "Street", "Block", "City",
                        "County", "State", "Country", "ZipCode", "Building",
                        raw_data, synced_at
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,NOW())
                    ON CONFLICT ("CardCode", "Address", "AdresType")
                    DO UPDATE SET
                        "Street" = EXCLUDED."Street",
                        "Block" = EXCLUDED."Block",
                        "City" = EXCLUDED."City",
                        "County" = EXCLUDED."County",
                        "State" = EXCLUDED."State",
                        "Country" = EXCLUDED."Country",
                        "ZipCode" = EXCLUDED."ZipCode",
                        "Building" = EXCLUDED."Building",
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
                    sapText(address.Building),
                    JSON.stringify(address || {})
                ]);
            }
            const contacts = Array.isArray(row.ContactEmployees) ? row.ContactEmployees : [];
            const contactRows = contacts.length ? contacts : (contactPerson ? [{ Name: contactPerson, FirstName: contactPerson, E_Mail: email, Tel1: phone, Cellolar: pickSapPartnerMobile(row), Position: 'Principal' }] : []);
            for (const contact of contactRows) {
                const name = sapText(contact.Name || contact.ContactName || contactPerson);
                if (!name) continue;
                await client.query(`
                    INSERT INTO "OCPR" (
                        "CardCode", "CntctCode", "Name", "Position",
                        "Tel1", "Tel2", "Cellolar", "Fax", "E_Mail",
                        raw_data, synced_at
                    )
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())
                    ON CONFLICT ("CardCode", "Name")
                    DO UPDATE SET
                        "CntctCode" = EXCLUDED."CntctCode",
                        "Position" = EXCLUDED."Position",
                        "Tel1" = EXCLUDED."Tel1",
                        "Tel2" = EXCLUDED."Tel2",
                        "Cellolar" = EXCLUDED."Cellolar",
                        "Fax" = EXCLUDED."Fax",
                        "E_Mail" = EXCLUDED."E_Mail",
                        raw_data = EXCLUDED.raw_data,
                        synced_at = NOW()
                `, [
                    partnerCode,
                    sapNumber(contact.CntctCode),
                    name,
                    sapText(contact.Position),
                    sapText(contact.Tel1 || contact.Phone1 || phone),
                    sapText(contact.Tel2),
                    sapText(contact.Cellolar || contact.MobilePhone || contact.Mobile || pickSapPartnerMobile(row)),
                    sapText(contact.Fax),
                    sapText(contact.E_Mail || contact.E_MailL || contact.Email || email),
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

        // Nomenclatura: solo clientes (CardType 'C') con CardCode que inicia en 'C'
        // llegan a business_partners y sus contactos/direcciones. El espejo crudo de
        // arriba (OCRD/CRD1/OCPR/sap_business_partners) ya quedó guardado completo.
        if (!socioCumpleNomenclaturaClienteSap(partnerCode, cardType)) {
            continue;
        }

        let skippedByDuplicateTaxId = false;
        try {
            await client.query('SAVEPOINT sp_business_partner_upsert');
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
                    updated_at,
                    salesperson_sap_code,
                    sap_modified_date,
                    phone1, phone2, cellular, fax, website, contact_person, notes,
                    vat_group, territory, owner_code, group_code,
                    valid_for, frozen_for,
                    balance,
                    billing_address, billing_block, billing_zip_code, billing_city,
                    billing_county, billing_country, billing_state, billing_building,
                    shipping_address, shipping_block, shipping_zip_code, shipping_city,
                    shipping_county, shipping_country, shipping_state, shipping_building,
                    bill_to_default, ship_to_default
                ) VALUES (
                    $1, $2, $8, $3, $4, $5, $6, $9, '', '', false, NULL, $7,
                    COALESCE($10::date, CURRENT_DATE), NOW(), $11, $12,
                    $13, $14, $15, $16, $17, $18, $19,
                    $20, $21, $22, $23,
                    $24, $25,
                    $26,
                    $27, $28, $29, $30, $31, $32, $33, $34,
                    $35, $36, $37, $38, $39, $40, $41, $42,
                    $43, $44
                )
                ON CONFLICT (partner_code)
                DO UPDATE SET
                    partner_name = COALESCE(NULLIF(EXCLUDED.partner_name, ''), business_partners.partner_name),
                    salesperson_name = CASE
                        WHEN COALESCE(NULLIF(EXCLUDED.salesperson_name, ''), '') <> '' THEN EXCLUDED.salesperson_name
                        ELSE business_partners.salesperson_name
                    END,
                    salesperson_sap_code = CASE
                        WHEN COALESCE(NULLIF(EXCLUDED.salesperson_sap_code, ''), '') <> '' THEN EXCLUDED.salesperson_sap_code
                        ELSE business_partners.salesperson_sap_code
                    END,
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
                    payment_terms = CASE
                        WHEN COALESCE(NULLIF(business_partners.payment_terms, ''), '') = '' THEN EXCLUDED.payment_terms
                        ELSE business_partners.payment_terms
                    END,
                    client_type = CASE
                        WHEN COALESCE(NULLIF(business_partners.client_type, ''), '') = '' THEN EXCLUDED.client_type
                        ELSE business_partners.client_type
                    END,
                    sap_modified_date = COALESCE(EXCLUDED.sap_modified_date, business_partners.sap_modified_date),
                    updated_at = NOW(),
                    phone1 = CASE
                        WHEN COALESCE(NULLIF(business_partners.phone1, ''), '') = '' THEN EXCLUDED.phone1
                        ELSE business_partners.phone1
                    END,
                    phone2 = CASE
                        WHEN COALESCE(NULLIF(business_partners.phone2, ''), '') = '' THEN EXCLUDED.phone2
                        ELSE business_partners.phone2
                    END,
                    cellular = CASE
                        WHEN COALESCE(NULLIF(business_partners.cellular, ''), '') = '' THEN EXCLUDED.cellular
                        ELSE business_partners.cellular
                    END,
                    fax = CASE
                        WHEN COALESCE(NULLIF(business_partners.fax, ''), '') = '' THEN EXCLUDED.fax
                        ELSE business_partners.fax
                    END,
                    website = CASE
                        WHEN COALESCE(NULLIF(business_partners.website, ''), '') = '' THEN EXCLUDED.website
                        ELSE business_partners.website
                    END,
                    contact_person = COALESCE(NULLIF(EXCLUDED.contact_person, ''), business_partners.contact_person),
                    notes = COALESCE(NULLIF(EXCLUDED.notes, ''), business_partners.notes),
                    vat_group = COALESCE(NULLIF(EXCLUDED.vat_group, ''), business_partners.vat_group),
                    territory = COALESCE(NULLIF(EXCLUDED.territory, ''), business_partners.territory),
                    owner_code = COALESCE(NULLIF(EXCLUDED.owner_code, ''), business_partners.owner_code),
                    group_code = COALESCE(NULLIF(EXCLUDED.group_code, ''), business_partners.group_code),
                    valid_for = EXCLUDED.valid_for,
                    frozen_for = EXCLUDED.frozen_for,
                    balance = EXCLUDED.balance,
                    billing_address = COALESCE(NULLIF(EXCLUDED.billing_address, ''), business_partners.billing_address),
                    billing_block = COALESCE(NULLIF(EXCLUDED.billing_block, ''), business_partners.billing_block),
                    billing_zip_code = COALESCE(NULLIF(EXCLUDED.billing_zip_code, ''), business_partners.billing_zip_code),
                    billing_city = COALESCE(NULLIF(EXCLUDED.billing_city, ''), business_partners.billing_city),
                    billing_county = COALESCE(NULLIF(EXCLUDED.billing_county, ''), business_partners.billing_county),
                    billing_country = COALESCE(NULLIF(EXCLUDED.billing_country, ''), business_partners.billing_country),
                    billing_state = COALESCE(NULLIF(EXCLUDED.billing_state, ''), business_partners.billing_state),
                    billing_building = COALESCE(NULLIF(EXCLUDED.billing_building, ''), business_partners.billing_building),
                    shipping_address = COALESCE(NULLIF(EXCLUDED.shipping_address, ''), business_partners.shipping_address),
                    shipping_block = COALESCE(NULLIF(EXCLUDED.shipping_block, ''), business_partners.shipping_block),
                    shipping_zip_code = COALESCE(NULLIF(EXCLUDED.shipping_zip_code, ''), business_partners.shipping_zip_code),
                    shipping_city = COALESCE(NULLIF(EXCLUDED.shipping_city, ''), business_partners.shipping_city),
                    shipping_county = COALESCE(NULLIF(EXCLUDED.shipping_county, ''), business_partners.shipping_county),
                    shipping_country = COALESCE(NULLIF(EXCLUDED.shipping_country, ''), business_partners.shipping_country),
                    shipping_state = COALESCE(NULLIF(EXCLUDED.shipping_state, ''), business_partners.shipping_state),
                    shipping_building = COALESCE(NULLIF(EXCLUDED.shipping_building, ''), business_partners.shipping_building),
                    bill_to_default = COALESCE(NULLIF(EXCLUDED.bill_to_default, ''), business_partners.bill_to_default),
                    ship_to_default = COALESCE(NULLIF(EXCLUDED.ship_to_default, ''), business_partners.ship_to_default)
            `, [
                partnerCode,
                partnerName,
                taxId || null,
                email || null,
                email || null,
                currency || null,
                clientType || null,
                salespersonName || '',
                paymentTermsName || '',
                sapCreationDate,
                salespersonSapCode || null,
                sapModifiedDate,
                sapText(row.Phone1 || phone),
                sapText(row.Phone2),
                sapText(row.Cellular),
                sapText(row.Fax),
                sapText(row.IntrntSite || row.Website),
                contactPerson,
                sapText(row.Notes),
                sapText(row.VatGroup),
                sapText(row.Territory),
                sapText(row.OwnerCode),
                sapText(row.GroupCode),
                sapText(row.ValidFor || 'Y'),
                sapText(row.FrozenFor || 'N'),
                balance,
                sapText(row.Address || row.BillingAddress),
                sapText(row.Block || row.BillingBlock),
                sapText(row.ZipCode || row.BillingZipCode),
                sapText(row.City || row.BillingCity),
                sapText(row.County || row.BillingCounty),
                sapText(row.Country || row.BillingCountry),
                sapText(row.State || row.BillingState),
                sapText(row.Building || row.BillingBuilding),
                sapText(row.MailAddres || row.ShippingAddress),
                sapText(row.MailBlock || row.ShippingBlock),
                sapText(row.MailZipCod || row.ShippingZipCode),
                sapText(row.MailCity || row.ShippingCity),
                sapText(row.MailCounty || row.ShippingCounty),
                sapText(row.MailCountr || row.ShippingCountry),
                sapText(row.State2 || row.ShippingState),
                sapText(row.MailBuildi || row.ShippingBuilding),
                sapText(row.BillToDef),
                sapText(row.ShipToDef)
            ]);
            await client.query('RELEASE SAVEPOINT sp_business_partner_upsert');
        } catch (error) {
            // La cédula/tax_id ya pertenece a otro partner_code (sucursal o cuenta
            // hermana en SAP bajo la misma entidad legal): no se duplica el registro
            // en business_partners, se omite y se sigue con el resto del lote. El
            // espejo sap_business_partners de arriba sí queda guardado igual, porque
            // ese no tiene esta restricción.
            if (error.code === '23505' && error.constraint === 'idx_business_partners_tax_id_unique') {
                await client.query('ROLLBACK TO SAVEPOINT sp_business_partner_upsert');
                console.warn(`[sap] business_partners: se omitió ${partnerCode} porque su tax_id ya pertenece a otro socio.`);
                skippedByDuplicateTaxId = true;
            } else {
                throw error;
            }
        }

        if (skippedByDuplicateTaxId) {
            continue;
        }

        await client.query(`
            DELETE FROM business_partner_contacts
             WHERE partner_code = $1
               AND COALESCE(source, '') = 'sap'
        `, [partnerCode]);

        for (const contact of sapContacts) {
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
                    source,
                    sap_contact_code,
                    phone2,
                    phone3,
                    website,
                    notes,
                    notes2,
                    street,
                    block,
                    zip_code,
                    city
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12, 'sap',
                    $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
                )
            `, [
                partnerCode,
                contact.contactName,
                contact.firstName || splitSapContactName(contact.contactName).firstName,
                contact.lastName || splitSapContactName(contact.contactName).lastName,
                contact.email || null,
                contact.phone || null,
                contact.mobile || null,
                contact.fax || '',
                contact.position || 'Principal',
                contact.country || '',
                contact.stateProvince || '',
                contact.county || '',
                contact.sapContactCode || null,
                contact.phone2 || null,
                contact.phone3 || null,
                contact.website || null,
                contact.notes || null,
                contact.notes2 || null,
                contact.street || null,
                contact.block || null,
                contact.zipCode || null,
                contact.city || null
            ]);
        }

        await client.query(`
            DELETE FROM business_partner_addresses
             WHERE partner_code = $1
               AND COALESCE(source, '') = 'sap'
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
                    source,
                    block,
                    city,
                    building,
                    floor,
                    room,
                    street_number
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, 'sap',
                    $10, $11, $12, $13, $14, $15
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
                address.block || null,
                address.city || null,
                address.building || null,
                address.floor || null,
                address.room || null,
                address.streetNumber || null
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
        const sapNumOrNull = (value) => {
            if (value == null || value === '') return null;
            const n = Number(value);
            return Number.isFinite(n) ? n : null;
        };
        const anchoMm = sapNumOrNull(row.U_Ancho != null ? row.U_Ancho : row.U_ANCHO);
        const gramajeGM2 = sapNumOrNull(row.U_Gramaje != null ? row.U_Gramaje : row.U_GRAMAJE);
        const calibreMicras = sapNumOrNull(row.U_Calibre != null ? row.U_Calibre : row.U_CALIBRE);
        const proveedorSap = normalizeText(row.U_Proveedor || row.U_PROVEEDOR);
        const marcaSap = normalizeText(row.U_Marca || row.U_MARCA);
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
                ancho_mm,
                gramaje_g_m2,
                calibre_micras,
                proveedor,
                marca,
                payload,
                synced_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb, NOW())
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
                ancho_mm = EXCLUDED.ancho_mm,
                gramaje_g_m2 = EXCLUDED.gramaje_g_m2,
                calibre_micras = EXCLUDED.calibre_micras,
                proveedor = EXCLUDED.proveedor,
                marca = EXCLUDED.marca,
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
            anchoMm,
            gramajeGM2,
            calibreMicras,
            proveedorSap,
            marcaSap,
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
    return { tableName: normalized, ...config, pgTable: config.pgTable || normalized };
}

async function loadSapMirrorSummary(pgQuery) {
    const tables = [];
    for (const tableName of Object.keys(SAP_MIRROR_TABLES)) {
        const config = SAP_MIRROR_TABLES[tableName];
        const pgTable = config.pgTable || tableName;
        const countResult = await pgQuery(`SELECT COUNT(*)::int AS total FROM "${pgTable}"`);
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
          FROM "${config.pgTable}"
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

function getSapMirrorProcessDefinitions() {
    const flujosAutomatizacion = [
        { clave: 'sap-import-business-partners', etiqueta: 'Socios, contactos y direcciones', entidades: 'OCRD/CRD1/OCPR', origen: 'import-business-partners' },
        { clave: 'sap-import-items', etiqueta: 'Inventario, stock, precios y bodegas', entidades: 'OITM/OITW/ITM1/OWHS', origen: 'import-items' },
        { clave: 'sap-import-salespeople', etiqueta: 'Vendedores', entidades: 'OSLP', origen: '',
            sql: [
                'SELECT TOP 2000',
                '    SlpCode AS SalesPersonCode,',
                '    SlpName AS SalesPersonName,',
                '    Active AS IsActive',
                'FROM OSLP',
                'ORDER BY SlpCode ASC'
            ].join('\n'),
            nota: 'Catálogo simple de vendedores activos. El alias de las columnas es el nombre que espera el conector DIAPI.' },
        { clave: 'sap-import-contacts', etiqueta: 'Contactos', entidades: 'OCPR', origen: '',
            sql: [
                'SELECT TOP 2000',
                '    T0.CardCode,',
                '    T0.CntctCode,',
                '    T0.Name,',
                '    T0.Position,',
                '    T0.Tel1,',
                '    T0.Tel2,',
                '    T0.Cellolar,',
                '    T0.Fax,',
                '    T0.E_MailL AS E_Mail',
                'FROM OCPR T0',
                'ORDER BY T0.CardCode ASC, T0.CntctCode ASC'
            ].join('\n'),
            nota: 'Contactos de socios de negocio, ordenados por socio. Sin filtros: trae el catálogo completo.' },
        { clave: 'sap-import-addresses', etiqueta: 'Direcciones', entidades: 'CRD1', origen: '',
            sql: [
                'SELECT TOP 2000',
                '    T0.CardCode,',
                '    T0.Address,',
                '    T0.AdresType,',
                '    T0.Street,',
                '    T0.Block,',
                '    T0.City,',
                '    T0.County,',
                '    T0.State,',
                '    T0.Country,',
                '    T0.ZipCode,',
                '    T0.Building',
                'FROM CRD1 T0',
                'ORDER BY T0.CardCode ASC, T0.Address ASC'
            ].join('\n'),
            nota: 'Direcciones de facturación y envío de cada socio (AdresType distingue el tipo).' },
        { clave: 'sap-import-batches', etiqueta: 'Lotes (tintas)', entidades: 'OBTN', origen: '',
            sql: [
                'SELECT TOP 2000',
                '    T0.ItemCode,',
                '    T0.DistNumber,',
                '    T0.SysNumber,',
                '    T0.Quantity,',
                '    T0.MnfDate,',
                '    T0.ExpDate,',
                '    T0.Quantity,',
                '    T0.Balance,',
                '    T0.U_K_Bobina',
                'FROM OBTN T0',
                'WHERE T0.Quantity > 0',
                'ORDER BY T0.ItemCode ASC, T0.DistNumber ASC'
            ].join('\n'),
            nota: 'Lotes de inventario con existencia. U_K_Bobina es un campo de usuario del cliente; Balance viene en la misma tabla OBTN.' }
    ];
    return flujosAutomatizacion.map((flujo) => {
        const def = flujo.origen ? SAP_MIRROR_PROCESS_DEFS[flujo.origen] : null;
        return {
            clave: flujo.clave,
            etiqueta: flujo.etiqueta,
            entidades: flujo.entidades,
            sql: def?.sql || flujo.sql || '',
            sqlRelacionadas: Array.isArray(def?.relatedSql) ? def.relatedSql : (flujo.relatedSql || []),
            nota: def?.note || flujo.nota || ''
        };
    });
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
        limit: normalizePositiveInt(source.limit, definition.defaultFilters.limit, 1, 100000),
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
        nextRunAt,
        pendingInboxRequestId: row.pending_inbox_request_id || row.pendingInboxRequestId || null
    };
}

function normalizeSapSalespersonProfitCenterRow(row = {}) {
    return {
        id: normalizeText(row.id),
        salespersonName: normalizeText(row.salesperson_name),
        localName: normalizeText(row.nombre_local),
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
        SELECT id, salesperson_name, nombre_local, sales_person_code, profit_center_code, notes, is_active, created_at, updated_at
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
            salesperson_name, nombre_local, sales_person_code, profit_center_code, notes, is_active, updated_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,NOW())
        ON CONFLICT (salesperson_name)
        DO UPDATE SET
            nombre_local = EXCLUDED.nombre_local,
            sales_person_code = EXCLUDED.sales_person_code,
            profit_center_code = EXCLUDED.profit_center_code,
            notes = EXCLUDED.notes,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING id, salesperson_name, nombre_local, sales_person_code, profit_center_code, notes, is_active, created_at, updated_at
    `, [
        salespersonName,
        normalizeText(payload.localName || payload.local_name || payload.nombre_local),
        salesPersonCode,
        profitCenterCode,
        normalizeText(payload.notes),
        payload.isActive !== false && payload.is_active !== false
    ]);
    return normalizeSapSalespersonProfitCenterRow(result.rows[0]);
}

// Sincroniza el catálogo de vendedores desde SAP B1 Service Layer (entidad estándar SalesPersons).
// Usa upsert por sales_person_code (identificador estable de SAP) — nunca toca nombre_local, que es
// exclusivamente editable en este ERP y no debe perderse al re-sincronizar.
async function syncSapSalespersonsFromSap(pgQuery, config, { timeoutMs = 90000 } = {}) {
    let rows;
    if (isDiApiMiddlewareProvider(config)) {
        rows = await fetchViaSapMiddleware({
            pgQuery,
            entityType: 'salespersons',
            parameters: {},
            moduleName: 'sap-config',
            timeoutMs
        });
    } else {
        rows = (await sapRequest(config, "SalesPersons?$select=SalesEmployeeCode,SalesEmployeeName,Active")).value || [];
    }
    let inserted = 0;
    let updated = 0;
    let omitidas = 0;
    const omitidasMuestra = [];
    const errors = [];
    for (const row of rows) {
        // El conector (di-api-middleware) devuelve SalesPersonCode/SalesPersonName/IsActive;
        // Service Layer devuelve SalesEmployeeCode/SalesEmployeeName/Active. Además, cuando el
        // conector consulta un HANA que pliega los alias sin comillas a MAYÚSCULA, llegan como
        // SALESPERSONCODE/SALESPERSONNAME/ISACTIVE. Se normalizan las claves a minúscula para
        // tolerar las tres formas.
        const campos = {};
        for (const [clave, valor] of Object.entries(row || {})) campos[clave.toLowerCase()] = valor;
        const rawCode = campos.salespersoncode ?? campos.salesemployeecode ?? campos.slpcode;
        const salesPersonCode = rawCode == null || rawCode === '' ? null : Number(rawCode);
        const salespersonName = normalizeText(campos.salespersonname || campos.salesemployeename || campos.slpname);
        if (salesPersonCode == null || !Number.isFinite(salesPersonCode) || !salespersonName) {
            omitidas += 1;
            if (omitidasMuestra.length < 5) omitidasMuestra.push(row);
            continue;
        }
        const activeValue = campos.isactive ?? campos.active;
        const isActive = activeValue !== 'tNO' && activeValue !== false && activeValue !== 'N';
        try {
            const existing = await pgQuery(
                `SELECT id FROM sap_salesperson_profit_centers WHERE sales_person_code = $1 LIMIT 1`,
                [salesPersonCode]
            );
            if (existing.rows.length) {
                await pgQuery(
                    `UPDATE sap_salesperson_profit_centers
                        SET salesperson_name = $2, is_active = $3, updated_at = NOW()
                      WHERE sales_person_code = $1`,
                    [salesPersonCode, salespersonName, isActive]
                );
                updated += 1;
            } else {
                await pgQuery(
                    `INSERT INTO sap_salesperson_profit_centers
                        (salesperson_name, nombre_local, sales_person_code, profit_center_code, notes, is_active, updated_at)
                     VALUES ($1, '', $2, '', '', $3, NOW())`,
                    [salespersonName, salesPersonCode, isActive]
                );
                inserted += 1;
            }
        } catch (error) {
            errors.push({ salesPersonCode, salespersonName, message: error.message });
        }
    }
    return { total: rows.length, inserted, updated, omitidas, omitidasMuestra, errors };
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
    // Resolución SOLO por código de ejecutivo SAP. No se busca por nombre: el nombre del
    // usuario local de PrintLab no es el nombre del ejecutivo en SAP, y hacer match por
    // nombre mezcla dos identidades distintas (ya rompió el flujo antes). Si no llegó un
    // código válido, no hay ejecutivo SAP asociado.
    void salespersonName;
    return null;
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

// Aplica los "Valores SAP" del panel de configuración al payload de un documento:
// serie de numeración en el encabezado, código de impuesto y/o bodega en cada línea.
// Solo escribe cuando el valor de config existe y la línea no lo trae ya definido.
function applySapDocDefaults(requestPayload = {}, config = {}, { series = '', taxCode = '', warehouseCode = '' } = {}) {
    const payload = { ...requestPayload };
    const serieNum = normalizeText(series);
    if (serieNum && payload.Series == null && payload.series == null) {
        const asNumber = Number(serieNum);
        payload.Series = Number.isFinite(asNumber) && String(asNumber) === serieNum ? asNumber : serieNum;
    }
    const tax = normalizeText(taxCode);
    const whs = normalizeText(warehouseCode);
    if ((tax || whs) && Array.isArray(payload.DocumentLines)) {
        payload.DocumentLines = payload.DocumentLines.map((line) => {
            const next = { ...line };
            if (tax && !normalizeText(next.TaxCode)) next.TaxCode = tax;
            if (whs && !normalizeText(next.WarehouseCode)) next.WarehouseCode = whs;
            return next;
        });
    }
    return payload;
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
    if (isDiApiMiddlewareProvider(config)) {
        return { ok: true, provider: 'di-api-middleware', message: 'DI API Middleware: la salud se valida cuando el conector responde una solicitud encolada, no por conexión directa.' };
    }
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

function buildSapMirrorImportQuery(processKey, input = {}, config = null) {
    const maxLimit = processKey === 'import-items'
        ? (config?.maxImportItems || 2000)
        : (config?.maxImportPartners || 2000);
    const limit = normalizePositiveInt(input.limit || input.top, 20, 1, maxLimit);
    const search = normalizeText(input.search);
    const query = {
        top: limit,
        validFor: 'Y'
    };
    if (search) query.search = search;
    if (processKey === 'import-business-partners') {
        // Solo clientes (CardType = 'C'). Proveedores ('S') u otros tipos de SAP no
        // deben llegar a esta importación de socios.
        const requestedType = normalizeText(input.type) || 'C';
        query.type = requestedType;
        query.cardTypes = requestedType;
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
    const importQuery = definition.direction === 'import' ? buildSapMirrorImportQuery(processKey, input, config) : null;
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

async function fetchSapMirrorBusinessPartners({ pgQuery, config, limit, search, type, modifiedSince = '', demo = false, timeoutMs = 90000 }) {
    if (!demo && resolveOperatingMode(config) !== 'demo') {
        const health = await getSapConnectorHealth(config);
        if (isMockSapConnectorHealth(health)) {
            throw new Error(buildMockConnectorError(health));
        }
    }
    const query = buildSapMirrorImportQuery('import-business-partners', { limit, search, type }, config);
    if (demo || resolveOperatingMode(config) === 'demo') {
        return filterDemoSapRows(deepClone(demoState.BusinessPartners), 'import-business-partners', query);
    }
    if (isDiApiMiddlewareProvider(config)) {
        // Se pide de a páginas chicas (PAGE_SIZE) en vez de todo de una sola vez: una
        // consulta gigante contra SAP tumbaba la conexión. Cada página es una pregunta
        // corta e independiente al conector; si SAP entrega menos de PAGE_SIZE, ya no
        // hay más páginas y se para. Puede tardar varios minutos en total — está bien,
        // el límite de vida de la corrida (10 min) es el único límite real de tiempo.
        const PAGE_SIZE = 500;
        const rows = [];
        let offset = 0;
        while (rows.length < query.top) {
            const pageTop = Math.min(PAGE_SIZE, query.top - rows.length);
            const page = await fetchViaSapMiddleware({
                pgQuery,
                entityType: 'business-partners',
                moduleName: 'automatizacion-socios',
                // codePattern: filtro que SAP aplica ANTES de recortar a `top` — sin esto,
                // el límite se gastaba en socios que no siguen la numeración de cliente
                // real (p. ej. "100 MONTAD") antes de llegar a los que sí sirven (C0001...).
                parameters: { type: query.type || '', search: query.search || '', top: pageTop, offset, modifiedSince, codePattern: 'C%', sql: await consultaOficialFlujo(pgQuery, 'sap-import-business-partners') },
                timeoutMs
            });
            rows.push(...page);
            if (page.length < pageTop) break;
            offset += pageTop;
        }
        return rows.slice(0, query.top);
    }
    const payload = await queryBusinessPartners({ pgQuery, config, query });
    return (Array.isArray(payload.value) ? payload.value : []).slice(0, query.top);
}

// Lee la consulta oficial de un flujo desde la tabla oficial_queries (editable en
// Configuración). Si no existe o está vacía, devuelve '' y el pedido viaja sin SQL —
// el conector usará su rutina interna como hasta ahora.
async function consultaOficialFlujo(pgQuery, claveFlujo) {
    try {
        const r = await pgQuery(`SELECT sql_text FROM official_queries WHERE clave = $1 AND is_active = TRUE LIMIT 1`, [claveFlujo]);
        return (r.rows[0]?.sql_text || '').trim();
    } catch {
        return '';
    }
}

async function fetchSapMirrorContacts({ pgQuery, config, limit, modifiedSince = '', timeoutMs = 90000 }) {
    const top = normalizePositiveInt(limit, 2000, 1, 100000);
    if (resolveOperatingMode(config) === 'demo') return [];
    if (isDiApiMiddlewareProvider(config)) {
        const rows = await fetchViaSapMiddleware({
            pgQuery,
            entityType: 'business-partner-contacts',
            moduleName: 'automatizacion-contactos',
            parameters: { top, modifiedSince, sql: await consultaOficialFlujo(pgQuery, 'sap-import-contacts') },
            timeoutMs
        });
        return rows.slice(0, top);
    }
    return [];
}

async function fetchSapMirrorAddresses({ pgQuery, config, limit, modifiedSince = '', timeoutMs = 90000 }) {
    const top = normalizePositiveInt(limit, 2000, 1, 100000);
    if (resolveOperatingMode(config) === 'demo') return [];
    if (isDiApiMiddlewareProvider(config)) {
        const rows = await fetchViaSapMiddleware({
            pgQuery,
            entityType: 'business-partner-addresses',
            moduleName: 'automatizacion-direcciones',
            parameters: { top, modifiedSince, sql: await consultaOficialFlujo(pgQuery, 'sap-import-addresses') },
            timeoutMs
        });
        return rows.slice(0, top);
    }
    return [];
}

async function fetchSapMirrorBatches({ pgQuery, config, limit, modifiedSince = '', timeoutMs = 90000 }) {
    const top = normalizePositiveInt(limit, 2000, 1, 100000);
    if (resolveOperatingMode(config) === 'demo') return [];
    if (isDiApiMiddlewareProvider(config)) {
        const rows = await fetchViaSapMiddleware({
            pgQuery,
            entityType: 'item-batches',
            moduleName: 'automatizacion-lotes',
            parameters: { top, modifiedSince, sql: await consultaOficialFlujo(pgQuery, 'sap-import-batches') },
            timeoutMs
        });
        return rows.slice(0, top);
    }
    return [];
}

// SAP usa 1899-12-30 como "fecha nunca capturada" (epoch OLE Automation) en vez de NULL.
function sapDateOrNull(value) {
    const text = normalizeText(value);
    if (!text) return null;
    const year = Number(text.slice(0, 4));
    return year > 1900 ? text.slice(0, 10) : null;
}

async function upsertLotes(client, rows) {
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
        const itemCode = normalizeText(row.ItemCode);
        if (!itemCode) continue;
        const producto = await client.query(`SELECT id FROM tintas.productos WHERE codigo_sap = $1 LIMIT 1`, [itemCode]);
        if (!producto.rows.length) continue; // ItemCode de SAP que no es una tinta local conocida.
        const productoId = producto.rows[0].id;
        const lote = sapText(row.DistNumber) || sapText(row.LotNumber) || sapText(row.SysNumber);
        if (!lote) continue;
        const quantity = sapNumber(row.Quantity);
        const bobinaWeight = sapNumber(row.U_K_Bobina);
        const pesoNeto = (quantity != null && quantity !== 0) ? quantity : (bobinaWeight != null && bobinaWeight !== 0 ? bobinaWeight : 0);
        const balance = sapNumber(row.Balance);
        const pesoDisponible = balance != null ? balance : pesoNeto;
        await client.query(`
            INSERT INTO tintas.lotes (
                producto_id, lote, sap_codigo_lote, fecha_fabricacion, fecha_vencimiento,
                peso_neto, peso_disponible, unidad_medida, origen_inventario, estado
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,'KG','SAP','ACTIVO')
            ON CONFLICT (producto_id, lote)
            DO UPDATE SET
                sap_codigo_lote = EXCLUDED.sap_codigo_lote,
                fecha_fabricacion = EXCLUDED.fecha_fabricacion,
                fecha_vencimiento = EXCLUDED.fecha_vencimiento,
                peso_neto = EXCLUDED.peso_neto,
                peso_disponible = EXCLUDED.peso_disponible,
                actualizado_en = NOW()
        `, [
            productoId,
            lote,
            sapText(row.SysNumber),
            sapDateOrNull(row.MnfDate),
            sapDateOrNull(row.ExpDate),
            pesoNeto,
            pesoDisponible
        ]);
    }
}

async function importSapMirrorBatches({ pgQuery, withTransaction, limit, modifiedSince = '', timeoutMs = 90000 }) {
    const config = await loadSapConfig(pgQuery);
    const records = await fetchSapMirrorBatches({ pgQuery, config, limit, modifiedSince, timeoutMs });
    await withTransaction(async (client) => {
        await upsertLotes(client, records);
    });
    return {
        ok: true,
        entity: 'Batches',
        records: records.length,
        tables: ['tintas.lotes']
    };
}

async function fetchSapMirrorItems({ pgQuery, config, limit, search, group, modifiedSince = '', demo = false, timeoutMs = 90000 }) {
    if (!demo && resolveOperatingMode(config) !== 'demo') {
        const health = await getSapConnectorHealth(config);
        if (isMockSapConnectorHealth(health)) {
            throw new Error(buildMockConnectorError(health));
        }
    }
    const query = buildSapMirrorImportQuery('import-items', { limit, search, group }, config);
    if (demo || resolveOperatingMode(config) === 'demo') {
        return filterDemoSapRows(deepClone(demoState.Items), 'import-items', query);
    }
    if (isDiApiMiddlewareProvider(config)) {
        const rows = await fetchViaSapMiddleware({
            pgQuery,
            entityType: 'items',
            moduleName: 'automatizacion-items',
            parameters: { group: query.group || '', search: query.search || '', top: query.top, modifiedSince, sql: await consultaOficialFlujo(pgQuery, 'sap-import-items') },
            timeoutMs
        });
        return rows.slice(0, query.top);
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

async function importSapMirrorBusinessPartners({ pgQuery, withTransaction, limit, search, type, modifiedSince = '', demo = false, timeoutMs = 90000 }) {
    const config = await loadSapConfig(pgQuery);
    const records = await fetchSapMirrorBusinessPartners({ pgQuery, config, limit, search, type, modifiedSince, demo, timeoutMs });
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

async function upsertContacts(client, rows) {
    const list = Array.isArray(rows) ? rows : [];
    const cardCodes = [...new Set(list.map((row) => normalizeText(row.CardCode)).filter(Boolean))];
    if (cardCodes.length) {
        await client.query(`DELETE FROM business_partner_contacts WHERE source = 'sap' AND partner_code = ANY($1::text[])`, [cardCodes]);
    }
    for (const row of list) {
        const cardCode = normalizeText(row.CardCode);
        const name = sapText(row.Name);
        if (!cardCode || !name) continue;
        await client.query(`
            INSERT INTO "OCPR" (
                "CardCode", "CntctCode", "Name", "Position",
                "Tel1", "Tel2", "Cellolar", "Fax", "E_Mail",
                raw_data, synced_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW())
            ON CONFLICT ("CardCode", "Name")
            DO UPDATE SET
                "CntctCode" = EXCLUDED."CntctCode",
                "Position" = EXCLUDED."Position",
                "Tel1" = EXCLUDED."Tel1",
                "Tel2" = EXCLUDED."Tel2",
                "Cellolar" = EXCLUDED."Cellolar",
                "Fax" = EXCLUDED."Fax",
                "E_Mail" = EXCLUDED."E_Mail",
                raw_data = EXCLUDED.raw_data,
                synced_at = NOW()
        `, [
            cardCode,
            sapNumber(row.CntctCode),
            name,
            sapText(row.Position),
            sapText(row.Tel1),
            sapText(row.Tel2),
            sapText(row.Cellolar),
            sapText(row.Fax),
            sapText(row.E_Mail || row.E_MailL),
            JSON.stringify(row || {})
        ]);
        await client.query(`
            INSERT INTO business_partner_contacts (
                partner_code, contact_name, position, phone, mobile, fax, email, sap_contact_code, source, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'sap',NOW())
        `, [
            cardCode,
            name,
            sapText(row.Position),
            sapText(row.Tel1),
            sapText(row.Cellolar),
            sapText(row.Fax),
            sapText(row.E_Mail || row.E_MailL),
            sapText(row.CntctCode)
        ]);
    }
}

async function upsertAddresses(client, rows) {
    const list = Array.isArray(rows) ? rows : [];
    const cardCodes = [...new Set(list.map((row) => normalizeText(row.CardCode)).filter(Boolean))];
    if (cardCodes.length) {
        await client.query(`DELETE FROM business_partner_addresses WHERE source = 'sap' AND partner_code = ANY($1::text[])`, [cardCodes]);
    }
    for (const row of list) {
        const cardCode = normalizeText(row.CardCode);
        const addressName = sapText(row.Address);
        if (!cardCode || !addressName) continue;
        await client.query(`
            INSERT INTO "CRD1" (
                "CardCode", "Address", "AdresType", "Street", "Block", "City",
                "County", "State", "Country", "ZipCode", "Building",
                raw_data, synced_at
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,NOW())
            ON CONFLICT ("CardCode", "Address", "AdresType")
            DO UPDATE SET
                "Street" = EXCLUDED."Street",
                "Block" = EXCLUDED."Block",
                "City" = EXCLUDED."City",
                "County" = EXCLUDED."County",
                "State" = EXCLUDED."State",
                "Country" = EXCLUDED."Country",
                "ZipCode" = EXCLUDED."ZipCode",
                "Building" = EXCLUDED."Building",
                raw_data = EXCLUDED.raw_data,
                synced_at = NOW()
        `, [
            cardCode,
            addressName,
            sapText(row.AdresType),
            sapText(row.Street),
            sapText(row.Block),
            sapText(row.City),
            sapText(row.County),
            sapText(row.State),
            sapText(row.Country),
            sapText(row.ZipCode),
            sapText(row.Building),
            JSON.stringify(row || {})
        ]);
        await client.query(`
            INSERT INTO business_partner_addresses (
                partner_code, address_name, address_type, address_line, block, city,
                county, state_province, country, zip_code, building, source, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'sap',NOW())
        `, [
            cardCode,
            addressName,
            sapText(row.AdresType),
            sapText(row.Street),
            sapText(row.Block),
            sapText(row.City),
            sapText(row.County),
            sapText(row.State),
            sapText(row.Country),
            sapText(row.ZipCode),
            sapText(row.Building)
        ]);
    }
}

async function importSapMirrorContacts({ pgQuery, withTransaction, limit, modifiedSince = '', timeoutMs = 90000 }) {
    const config = await loadSapConfig(pgQuery);
    const records = await fetchSapMirrorContacts({ pgQuery, config, limit, modifiedSince, timeoutMs });
    await withTransaction(async (client) => {
        await upsertContacts(client, records);
    });
    return {
        ok: true,
        entity: 'Contacts',
        records: records.length,
        tables: ['OCPR', 'business_partner_contacts']
    };
}

async function importSapMirrorAddresses({ pgQuery, withTransaction, limit, modifiedSince = '', timeoutMs = 90000 }) {
    const config = await loadSapConfig(pgQuery);
    const records = await fetchSapMirrorAddresses({ pgQuery, config, limit, modifiedSince, timeoutMs });
    await withTransaction(async (client) => {
        await upsertAddresses(client, records);
    });
    return {
        ok: true,
        entity: 'Addresses',
        records: records.length,
        tables: ['CRD1', 'business_partner_addresses']
    };
}

async function importSapMirrorItems({ pgQuery, withTransaction, limit, search, group, modifiedSince = '', demo = false, timeoutMs = 90000 }) {
    const config = await loadSapConfig(pgQuery);
    const itemRecords = await fetchSapMirrorItems({ pgQuery, config, limit, search, group, modifiedSince, demo, timeoutMs });
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

// Cuánto puede durar como máximo una corrida antes de que se considere "colgada" y se
// pueda volver a intentar. El usuario pidió expresamente un límite de tiempo de vida:
// una consulta a SAP no debería tardar más de esto en resolverse (éxito o error).
const SAP_IMPORT_JOB_MAX_RUNTIME_MS = 10 * 60 * 1000;

async function executeSapImportJob({ pgQuery, withTransaction, jobCode, actor = 'scheduler', automated = true, timeoutMs = 120000 }) {
    const definition = getSapImportJobDefinition(jobCode);
    // Candado atómico: si otra corrida ya está en curso (running) para este mismo job,
    // esta UPDATE no afecta ninguna fila (Postgres serializa el UPDATE sobre la misma
    // fila) y salimos sin volver a preguntarle nada a SAP. Evita disparar consultas
    // duplicadas al conector si alguien le da varias veces seguidas a "Ejecutar ahora".
    // Excepción: si lleva "running" más de SAP_IMPORT_JOB_MAX_RUNTIME_MS, se considera
    // colgada (el proceso se cayó a medias, o algo se quedó esperando sin límite) y se
    // libera sola — si no, un solo trabajo trabado bloquea la automatización para
    // siempre, sin que nadie pueda reintentarlo.
    const jobRow = await pgQuery(`
        UPDATE sap_sync_jobs
           SET status = 'running',
               started_at = NOW(),
               updated_at = NOW(),
               message = 'Ejecutando carga automática SAP...'
         WHERE job_code = $1
           AND (status <> 'running' OR started_at < NOW() - INTERVAL '${SAP_IMPORT_JOB_MAX_RUNTIME_MS / 60000} minutes')
     RETURNING *
    `, [definition.jobCode]);
    if (!jobRow.rows.length) {
        const existing = await pgQuery(`SELECT status FROM sap_sync_jobs WHERE job_code = $1`, [definition.jobCode]);
        if (!existing.rows.length) throw new Error('No se encontró el trabajo de importación SAP.');
        return { ok: true, alreadyRunning: true, records: 0 };
    }
    const currentJob = jobRow.rows[0];
    const filters = normalizeSapImportJobFilters(definition.jobCode, currentJob.filters || {});
    const config = await loadSapConfig(pgQuery).catch(() => ({}));
    const startedAt = new Date().toISOString();
    // Primera corrida (finished_at nulo): carga completa. Corridas siguientes: solo lo
    // modificado en SAP desde la última corrida exitosa (carga incremental).
    const modifiedSince = currentJob.finished_at ? new Date(currentJob.finished_at).toISOString() : '';
    try {
        let payload;
        if (definition.jobCode === 'sap-import-business-partners') {
            payload = await importSapMirrorBusinessPartners({
                pgQuery,
                withTransaction,
                limit: filters.limit,
                search: filters.search,
                type: filters.type,
                modifiedSince,
                demo: false,
                timeoutMs
            });
        } else if (definition.jobCode === 'sap-import-salespeople') {
            const syncResult = await syncSapSalespersonsFromSap(pgQuery, config, { timeoutMs });
            payload = { ok: true, records: syncResult.total };
        } else if (definition.jobCode === 'sap-import-contacts') {
            payload = await importSapMirrorContacts({
                pgQuery,
                withTransaction,
                limit: filters.limit,
                modifiedSince,
                timeoutMs
            });
        } else if (definition.jobCode === 'sap-import-addresses') {
            payload = await importSapMirrorAddresses({
                pgQuery,
                withTransaction,
                limit: filters.limit,
                modifiedSince,
                timeoutMs
            });
        } else if (definition.jobCode === 'sap-import-batches') {
            payload = await importSapMirrorBatches({
                pgQuery,
                withTransaction,
                limit: filters.limit,
                modifiedSince,
                timeoutMs
            });
        } else if (definition.jobCode === 'sap-envio-tipo-cambio') {
            // Push, no pull: envía la tasa del día. Si falla, se respalda en la
            // misma cola sap_envios_pendientes que usan los demás documentos que
            // PrintLab empuja a SAP, para que quede visible en Configuración →
            // Seguridad → SAP → Envíos igual que cualquier otro envío.
            const { fecha } = await obtenerTipoCambioUsdGtqVigente(pgQuery);
            try {
                await enviarTipoCambioSap({ pgQuery });
                payload = { ok: true, records: 1 };
            } catch (error) {
                if (!error.yaExistia) {
                    try {
                        await encolarEnvioSap(pgQuery, { tipo: 'tipo_cambio', referencia: fecha, payload: {}, creadoPor: actor });
                    } catch (_) {}
                }
                throw error;
            }
        } else {
            payload = await importSapMirrorItems({
                pgQuery,
                withTransaction,
                limit: filters.limit,
                search: filters.search,
                group: filters.group,
                modifiedSince,
                demo: false,
                timeoutMs
            });
        }
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
        // Marca la solicitud de sap_inbox_requests que se acaba de aplicar (la más
        // reciente contestada y aún sin marcar para esta entidad) — así el historial
        // puede mostrar "sí se guardó en la base local", no solo "sí contestó".
        const inboxEntityType = SAP_IMPORT_JOB_INBOX_ENTITY[definition.jobCode];
        if (inboxEntityType) {
            await pgQuery(`
                UPDATE sap_inbox_requests
                   SET applied_at = NOW(),
                       records_applied = $2
                 WHERE id = (
                    SELECT id FROM sap_inbox_requests
                     WHERE entity_type = $1 AND status = 'answered' AND applied_at IS NULL
                  ORDER BY created_at DESC
                     LIMIT 1
                 )
            `, [inboxEntityType, Number(payload.records || 0)]);
        }
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
	            `Reintento automático activo: ${error.message || 'No fue posible ejecutar la carga SAP.'}`
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
    const startedAt = new Date().toISOString();
    try {
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
    } catch (error) {
        await logSapRouteFailure(pgQuery, {
            actionType: 'export',
            entityName: 'ORDR / RDR1',
            actor: await getSapActor(pgQuery),
            mode: 'mirror',
            internalMethod: 'POST',
            internalUrl: '/api/sap/mirror/export-order',
            serviceMethod: 'STAGE',
            serviceUrl: 'sap-mirror://ORDR/RDR1',
            requestVars: {
                DocNum: input.DocNum || input.docNum || '',
                CardCode: input.CardCode || input.cardCode || '',
                SalesPersonCode: input.SalesPersonCode ?? input.salesPersonCode ?? '',
                salespersonName: input.salespersonName || input.salesperson_name || input.SalesPersonName || ''
            },
            errorMessage: error.message,
            startedAt
        });
        throw error;
    }
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
    const primaryQtyMeters = safeNumber(lineSnapshot.materialMeters, 0);
    const primaryQtyLegacyFeet = safeNumber(
        lineSnapshot.materialFeet
        || snapshotRaw['GENERAL | SUSTRATO | CONSUMO PIES'],
        0
    );
    const primaryQty = primaryQtyMeters > 0 ? primaryQtyMeters : (primaryQtyLegacyFeet > 0 ? primaryQtyLegacyFeet : safeNumber(orderRow.ordered_quantity, 0));
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
        uom: primaryQtyMeters > 0 ? 'metros' : (primaryQtyLegacyFeet > 0 ? 'pies' : 'unidad'),
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

function isoToday() {
    return new Date().toISOString().slice(0, 10);
}

function buildOrderPayload(input = {}) {
    if (Array.isArray(input.DocumentLines)) {
        return input;
    }
    // SAP B1 exige DocDate y DocDueDate en el Pedido de Cliente; si no vienen,
    // se usa la fecha de hoy para no romper la creación.
    return {
        CardCode: normalizeText(input.clientCode || input.client_code || input.CardCode),
        DocDate: normalizeText(input.date || input.DocDate) || isoToday(),
        DocDueDate: normalizeText(input.dueDate || input.due_date || input.DocDueDate) || isoToday(),
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

async function enqueueInboxRequest(pgQuery, { entityType, referenceId = '', referenceCode = '', parameters = {}, moduleName = 'sap' }) {
    // Evita preguntarle al conector DIAPI dos veces la misma cosa al mismo tiempo:
    // si ya hay una solicitud viva (pendiente o en curso) para este mismo entity_type +
    // reference_code, se reutiliza esa en vez de insertar otra. Solo aplica cuando hay
    // un reference_code real — una consulta general (p.ej. "buscar socios que contengan
    // X") no tiene una referencia única que comparar y cada búsqueda es una pregunta
    // distinta, así que esas no se deduplican.
    const refCode = String(referenceCode || '').trim();
    if (refCode) {
        const vivo = await pgQuery(
            `SELECT * FROM sap_inbox_requests
              WHERE entity_type = $1 AND reference_code = $2 AND status IN ('pending', 'processing')
              ORDER BY created_at DESC LIMIT 1`,
            [entityType, refCode]
        );
        if (vivo.rows.length) {
            console.log(`Solicitud a DIAPI evitada (duplicada): ya hay una viva para ${entityType} / ${refCode} (${vivo.rows[0].request_code}).`);
            return vivo.rows[0];
        }
    }
    const requestCode = buildSequenceCode('SIN');
    const result = await pgQuery(`
        INSERT INTO sap_inbox_requests (
            request_code, module_name, entity_type, reference_id, reference_code, parameters
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING *
    `, [requestCode, moduleName, entityType, referenceId, referenceCode, JSON.stringify(parameters || {})]);
    return result.rows[0];
}

async function getInboxRequestById(pgQuery, id) {
    const result = await pgQuery(`
        SELECT id, request_code, entity_type, status, parameters, result_payload, last_error, created_at, answered_at
          FROM sap_inbox_requests
         WHERE id = $1::uuid
    `, [id]);
    return result.rows[0] || null;
}

function sleepMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForInboxRequestResult(pgQuery, id, { timeoutMs = 90000, intervalMs = 1500 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let item = await getInboxRequestById(pgQuery, id);
    while (item && item.status !== 'answered' && item.status !== 'error' && Date.now() < deadline) {
        await sleepMs(intervalMs);
        item = await getInboxRequestById(pgQuery, id);
    }
    return item;
}

async function fetchViaSapMiddleware({ pgQuery, entityType, parameters = {}, moduleName = 'sap', timeoutMs = 90000 }) {
    // Consulta oficial: se deja el SQL escrito dentro del pedido para que el conector
    // DIAPI lo lea y lo transmita tal cual a SAP (mismo idioma en ambos lados).
    const sqlOficial = typeof parameters.sql === 'string' && parameters.sql.trim() ? parameters.sql.trim() : null;
    const request = await enqueueInboxRequest(pgQuery, { entityType, parameters, moduleName });
    const answered = await waitForInboxRequestResult(pgQuery, request.id, { timeoutMs });
    if (!answered || answered.status === 'pending' || answered.status === 'processing') {
        throw new Error(`El conector DIAPI no respondió a tiempo la solicitud de ${entityType} (${request.request_code}).`);
    }
    if (answered.status === 'error') {
        throw new Error(answered.last_error || `El conector DIAPI reportó un error resolviendo ${entityType}.`);
    }
    const rows = Array.isArray(answered.result_payload) ? answered.result_payload : (Array.isArray(answered.result_payload?.value) ? answered.result_payload.value : []);
    return rows;
}

// Contraparte de enqueueInboxRequest/fetchViaSapMiddleware para escrituras: en vez de
// preguntar algo, se encola una acción (crear reserva, socio, orden, etc.) para que el
// conector DIAPI la ejecute contra SAP y devuelva el resultado por /api/sap/outbox/:id/result.
async function enqueueSapOutboxWrite(pgQuery, { entityType, actionType = 'create', payload = {}, referenceId = '', referenceCode = '', moduleName = 'sap', priority = 100 }) {
    // Evita encolar el mismo encargo dos veces mientras el anterior sigue vivo: si ya
    // hay una fila pendiente/en curso para el mismo entity_type + actionType + reference_code,
    // se reutiliza esa en vez de insertar otra (mismo criterio que enqueueInboxRequest).
    const refCode = String(referenceCode || '').trim();
    if (refCode) {
        const vivo = await pgQuery(
            `SELECT * FROM sap_outbox
              WHERE entity_type = $1 AND action_type = $2 AND reference_code = $3 AND status IN ('pending', 'processing')
              ORDER BY created_at DESC LIMIT 1`,
            [entityType, actionType, refCode]
        );
        if (vivo.rows.length) {
            console.log(`Envío a SAP evitado (duplicado): ya hay uno vivo para ${entityType}/${actionType} / ${refCode} (${vivo.rows[0].queue_code}).`);
            return vivo.rows[0];
        }
    }
    const queueCode = buildSequenceCode('SOUT');
    const result = await pgQuery(`
        INSERT INTO sap_outbox (
            queue_code, module_name, entity_type, action_type, provider,
            reference_id, reference_code, status, priority, payload
        ) VALUES ($1, $2, $3, $4, 'di-api-middleware', $5, $6, 'pending', $7, $8::jsonb)
        RETURNING *
    `, [queueCode, moduleName, entityType, actionType, referenceId, referenceCode, priority, JSON.stringify(payload || {})]);
    return result.rows[0];
}

async function getSapOutboxById(pgQuery, id) {
    const result = await pgQuery(`SELECT * FROM sap_outbox WHERE id = $1::uuid`, [id]);
    return result.rows[0] || null;
}

async function waitForSapOutboxResult(pgQuery, id, { timeoutMs = 90000, intervalMs = 1500 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let item = await getSapOutboxById(pgQuery, id);
    while (item && item.status !== 'done' && item.status !== 'error' && Date.now() < deadline) {
        await sleepMs(intervalMs);
        item = await getSapOutboxById(pgQuery, id);
    }
    return item;
}

async function submitViaSapMiddleware({ pgQuery, entityType, actionType = 'create', payload = {}, referenceCode = '', moduleName = 'sap', timeoutMs = 90000 }) {
    const outboxRow = await enqueueSapOutboxWrite(pgQuery, { entityType, actionType, payload, referenceCode, moduleName });
    const result = await waitForSapOutboxResult(pgQuery, outboxRow.id, { timeoutMs });
    if (!result || result.status === 'pending' || result.status === 'processing') {
        throw new Error(`El conector DIAPI no respondió a tiempo el envío de ${entityType} (${outboxRow.queue_code}).`);
    }
    if (result.status === 'error') {
        throw new Error(result.last_error || `El conector DIAPI reportó un error procesando ${entityType}.`);
    }
    return result.result_payload || {};
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

function buildBusinessPartnerPayload(data = {}, config = {}) {
    const cardType = normalizeText(data.cardType) || 'S';
    const cardCode = normalizeText(data.cardCode);
    const cardName = normalizeText(data.partnerName);
    const taxId = normalizeText(data.taxId);
    const email = normalizeText(data.email);
    const phone = normalizeText(data.phone);
    const contactName = normalizeText(data.contactName);
    const currency = normalizeText(data.currency) || 'USD';
    // Grupo / condición de pago / lista de precios: se toman de "Valores SAP" del
    // panel si están definidos; si no, la lista de precios cae a 1 (por defecto SAP).
    const grupoSocio = normalizeText(data.groupCode || config.sapPartnerGroupCode);
    const condPago = normalizeText(data.paymentTermsCode || config.sapPaymentTermsCode);
    const listaPrecios = normalizeText(data.priceListNum || config.sapPriceListNum);
    const payload = {
        CardName: cardName,
        CardType: cardType,
        Currency: currency,
        FederalTaxID: taxId,
        LicTradNum: taxId,
        EmailAddress: email,
        Phone1: phone,
        ContactPerson: contactName,
        PriceListNum: listaPrecios ? (Number(listaPrecios) || listaPrecios) : 1
    };
    if (grupoSocio) payload.GroupCode = Number(grupoSocio) || grupoSocio;
    if (condPago) payload.PayTermsGrpCode = Number(condPago) || condPago;
    if (cardCode) {
        payload.CardCode = cardCode;
    }
    const addresses = [];
    if (data.addressLine || data.country || data.stateProvince || data.county) {
        addresses.push({
            AddressName: 'Principal',
            AddressType: 'bo_BillTo',
            Street: normalizeText(data.addressLine),
            City: normalizeText(data.stateProvince),
            County: normalizeText(data.county),
            Country: normalizeText(data.country) || 'CR',
            State: normalizeText(data.stateProvince),
            ZipCode: normalizeText(data.zipCode)
        });
    }
    if (addresses.length) {
        payload.BPAddresses = addresses;
    }
    if (contactName || email || phone) {
        payload.ContactEmployees = [
            {
                Name: contactName,
                E_Mail: email,
                MobilePhone: phone,
                Tel1: phone
            }
        ];
    }
    return payload;
}

// Consola de Pruebas SAP: arma la "consulta que se enviaria" sin mandarla.
// Cada createXxxInSap acepta { dryRun }; con dryRun retorna esto y no encola nada.
function buildDryRunPreview(entityType, requestPayload, config = {}, actionType = 'create') {
    let connectorTarget = '';
    try { connectorTarget = diApiBridge.buildDiApiBaseUrl(config) || ''; } catch (_) {}
    return {
        __dryRun: true,
        transport: isDiApiMiddlewareProvider(config)
            ? 'di-api-middleware (cola sap_outbox)'
            : (isDiApiProvider(config) ? 'di-api (directo)' : 'service-layer'),
        entityType,
        actionType,
        method: 'POST',
        connectorTarget,
        body: requestPayload,
        source: 'sap'
    };
}

async function createBusinessPartnerInSap({ pgQuery, config, data, dryRun = false, actionType = 'create' }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La creación de socio');
    const requestPayload = buildBusinessPartnerPayload(data, liveConfig);
    if (actionType === 'update' && !dryRun && !normalizeText(requestPayload.CardCode)) {
        throw new Error('Para actualizar el socio en SAP se necesita su CardCode.');
    }
    if (dryRun) return buildDryRunPreview('business-partner', requestPayload, liveConfig, actionType);
    try {
        let responsePayload;
        if (isDiApiMiddlewareProvider(liveConfig)) {
            responsePayload = await submitViaSapMiddleware({
                pgQuery,
                entityType: 'business-partner',
                actionType,
                payload: requestPayload,
                referenceCode: normalizeText(data.partnerCode || data.partner_code || requestPayload.CardCode || requestPayload.CardName),
                moduleName: 'socios'
            });
        } else {
            responsePayload = isDiApiProvider(liveConfig)
                ? await diApiBridge.createBusinessPartner(liveConfig, requestPayload)
                : await sapRequest(liveConfig, 'BusinessPartners', {
                    method: 'POST',
                    body: requestPayload
                });
        }
        await logWrite(pgQuery, {
            entityName: 'BusinessPartners',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, {
            entityName: 'BusinessPartners',
            mode,
            status: 'error',
            requestPayload,
            responsePayload: {},
            errorMessage: error.message
        });
        throw error;
    }
}

async function createOrder({ pgQuery, config, body, dryRun = false, actionType = 'create' }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La creación de órdenes');
    let requestPayload = await enrichOrderPayloadWithProfitCenter(pgQuery, body || {}, buildOrderPayload(body || {}));
    requestPayload = applySapDocDefaults(requestPayload, liveConfig, {
        series: liveConfig.sapSalesOrderSeries,
        taxCode: liveConfig.sapSalesTaxCode
    });
    if (body && body.DocEntry != null && body.DocEntry !== '') {
        requestPayload.DocEntry = Number(body.DocEntry);
    }
    if (actionType === 'update' && !dryRun && !(Number(requestPayload.DocEntry) > 0)) {
        throw new Error('Para actualizar la Orden de Venta en SAP se necesita su DocEntry.');
    }
    if (dryRun) return buildDryRunPreview('sales-order', requestPayload, liveConfig, actionType);
    try {
        let responsePayload;
        if (isDiApiMiddlewareProvider(liveConfig)) {
            responsePayload = await submitViaSapMiddleware({
                pgQuery,
                entityType: 'sales-order',
                actionType,
                payload: requestPayload,
                referenceCode: requestPayload.CardCode,
                moduleName: 'ventas'
            });
        } else {
            responsePayload = isDiApiProvider(liveConfig)
                ? await diApiBridge.createOrder(liveConfig, requestPayload)
                : await sapRequest(liveConfig, 'Orders', {
                    method: 'POST',
                    body: requestPayload
                });
        }
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

async function createProductTree({ pgQuery, config, body, dryRun = false, actionType = 'create' }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La creación del BOM');
    const requestPayload = buildProductTreePayload(body || {});
    if (actionType === 'update' && !normalizeText(requestPayload.TreeCode || requestPayload.ItemCode)) {
        throw new Error('Para actualizar el BOM en SAP se necesita el código del SKU (TreeCode).');
    }
    if (dryRun) return buildDryRunPreview('product-tree', requestPayload, liveConfig, actionType);
    try {
        let responsePayload;
        if (isDiApiMiddlewareProvider(liveConfig)) {
            responsePayload = await submitViaSapMiddleware({
                pgQuery,
                entityType: 'product-tree',
                actionType,
                payload: requestPayload,
                referenceCode: normalizeText(requestPayload.TreeCode || requestPayload.ItemCode),
                moduleName: 'produccion'
            });
        } else {
            responsePayload = isDiApiProvider(liveConfig)
                ? await diApiBridge.createProductTree(liveConfig, requestPayload)
                : await sapRequest(liveConfig, 'ProductTrees', {
                    method: 'POST',
                    body: requestPayload
                });
        }
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

// ── Artículo terminado (OITM) ───────────────────────────────────────────────
// Construye el payload de la ficha de artículo con los campos de usuario PL_*
// del anexo del correo "Plan para conectar con SAP".
function buildItemPayload(input = {}, config = {}) {
    if (normalizeText(input.ItemCode) && Array.isArray(input.UserFields)) {
        return input;
    }
    const itemCode = normalizeText(input.itemCode || input.ItemCode || input.sku);
    const itemName = normalizeText(input.itemName || input.ItemName || input.nombre || itemCode);
    const grupo = normalizeText(input.itemGroupCode || config.sapItemGroupCode);
    const uom = normalizeText(input.uomCode || config.sapFinishedGoodsUomCode) || 'unidades';
    const udf = input.udf || input.pl || {};
    const userFields = [
        { Name: 'U_PL_ORIGEN', Value: 'PrintLab' },
        { Name: 'U_PL_COTIZ', Value: normalizeText(udf.PL_COTIZ).slice(0, 20) },
        { Name: 'U_PL_LINEA', Value: normalizeText(udf.PL_LINEA).slice(0, 20) },
        { Name: 'U_PL_ORDEN', Value: normalizeText(udf.PL_ORDEN).slice(0, 20) },
        { Name: 'U_PL_PRODUCTO', Value: normalizeText(udf.PL_PRODUCTO).slice(0, 20) },
        { Name: 'U_PL_CLIENTE', Value: normalizeText(udf.PL_CLIENTE).slice(0, 100) },
        { Name: 'U_PL_MONEDA', Value: normalizeText(udf.PL_MONEDA).slice(0, 3) },
        { Name: 'U_PL_ANCHO', Value: safeNumber(udf.PL_ANCHO) },
        { Name: 'U_PL_LARGO', Value: safeNumber(udf.PL_LARGO) },
        { Name: 'U_PL_SUSTRATO', Value: normalizeText(udf.PL_SUSTRATO).slice(0, 100) },
        { Name: 'U_PL_TINTAS', Value: typeof udf.PL_TINTAS === 'string' ? udf.PL_TINTAS : JSON.stringify(udf.PL_TINTAS || {}) },
        { Name: 'U_PL_LAMINADO', Value: normalizeText(udf.PL_LAMINADO).slice(0, 60) },
        { Name: 'U_PL_BARNIZ', Value: normalizeText(udf.PL_BARNIZ).slice(0, 60) },
        { Name: 'U_PL_ESTAMPADO', Value: normalizeText(udf.PL_ESTAMPADO).slice(0, 60) },
        { Name: 'U_PL_ADICIONALES', Value: typeof udf.PL_ADICIONALES === 'string' ? udf.PL_ADICIONALES : JSON.stringify(udf.PL_ADICIONALES || []) },
        { Name: 'U_PL_TROQUEL', Value: normalizeText(udf.PL_TROQUEL).slice(0, 40) }
    ];
    const payload = {
        ItemCode: itemCode,
        ItemName: itemName.slice(0, 100),
        ItemsGroupCode: grupo ? Number(grupo) || grupo : undefined,
        InventoryUOM: uom,
        SalesUnit: uom,
        InventoryItem: 'tYES',
        SalesItem: 'tYES',
        PurchaseItem: 'tNO',
        Valid: 'tYES'
    };
    // Los campos de usuario PL_* solo se envían si el switch del panel está
    // encendido (es decir, cuando el equipo SAP ya creó los UDF en OITM).
    if (config.sapUdfPlActivos || input.forzarUdf) {
        payload.UserFields = userFields;
    }
    return payload;
}

async function createItemInSap({ pgQuery, config, body, dryRun = false, actionType = 'create' }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La creación del artículo terminado');
    const requestPayload = buildItemPayload(body || {}, liveConfig);
    if (!normalizeText(requestPayload.ItemCode)) {
        throw new Error('El artículo terminado necesita un código (SKU) definido en la orden.');
    }
    if (dryRun) return buildDryRunPreview('item', requestPayload, liveConfig, actionType);
    try {
        let responsePayload;
        if (isDiApiMiddlewareProvider(liveConfig)) {
            responsePayload = await submitViaSapMiddleware({
                pgQuery,
                entityType: 'item',
                actionType,
                payload: requestPayload,
                referenceCode: normalizeText(requestPayload.ItemCode),
                moduleName: 'produccion'
            });
        } else {
            responsePayload = isDiApiProvider(liveConfig)
                ? await diApiBridge.createItem(liveConfig, requestPayload)
                : await sapRequest(liveConfig, 'Items', {
                    method: 'POST',
                    body: requestPayload
                });
        }
        await logWrite(pgQuery, { entityName: 'Items', mode, status: 'success', requestPayload, responsePayload });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, { entityName: 'Items', mode, status: 'error', requestPayload, responsePayload: {}, errorMessage: error.message });
        throw error;
    }
}

// ── Tipo de cambio del dólar (SBOBobService_SetExchangeRate) ──────────────
// Envío diario y manual del tipo de cambio USD→GTQ. Solo soporta el
// proveedor di-api-middleware (cola sap_outbox + conector DIAPI), que es el
// que este proyecto usa en producción para este tipo de documento.
async function createExchangeRateInSap({ pgQuery, config, body, dryRun = false, actionType = 'create' }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'El envío del tipo de cambio');
    const requestPayload = {
        Currency: normalizeText(body?.Currency, 'USD'),
        Rate: safeNumber(body?.Rate),
        RateDate: normalizeText(body?.RateDate)
    };
    if (!(requestPayload.Rate > 0)) {
        throw new Error('El tipo de cambio a enviar no es válido.');
    }
    if (dryRun) return buildDryRunPreview('exchange-rate', requestPayload, liveConfig, actionType);
    if (!isDiApiMiddlewareProvider(liveConfig)) {
        throw new Error('El envío del tipo de cambio a SAP todavía solo está implementado para el conector DIAPI.');
    }
    try {
        const responsePayload = await submitViaSapMiddleware({
            pgQuery,
            entityType: 'exchange-rate',
            actionType,
            payload: requestPayload,
            referenceCode: requestPayload.RateDate,
            moduleName: 'finanzas'
        });
        await logWrite(pgQuery, { entityName: 'ExchangeRates', mode, status: 'success', requestPayload, responsePayload });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, { entityName: 'ExchangeRates', mode, status: 'error', requestPayload, responsePayload: {}, errorMessage: error.message });
        throw error;
    }
}

// Lee la tasa USD→GTQ que ya calculó/guardó el módulo de Tipo de Cambio para
// hoy. Es la única fila que le interesa a SAP (rate_value = cuántos quetzales
// vale 1 dólar).
async function obtenerTipoCambioUsdGtqVigente(pgQuery) {
    const result = await pgQuery(
        `SELECT rate_value, rate_date FROM exchange_rate_current WHERE base_currency = 'USD' AND currency_code = 'GTQ' LIMIT 1`
    );
    if (!result.rows.length) {
        throw new Error('Todavía no hay tipo de cambio calculado para hoy.');
    }
    const row = result.rows[0];
    // Se usa la fecha de la tasa (rate_date), no la fecha de hoy: es la fecha
    // real a la que corresponde ese valor, y así la referencia de la cola
    // (una por día) queda ligada al dato que se está enviando.
    const fecha = new Date(row.rate_date).toISOString().slice(0, 10);
    return { rateValue: Number(row.rate_value) || 0, fecha };
}

// Envía a SAP el tipo de cambio del dólar del día (solo USD por ahora).
async function enviarTipoCambioSap({ pgQuery, dryRun = false } = {}) {
    const { rateValue, fecha } = await obtenerTipoCambioUsdGtqVigente(pgQuery);
    const payload = { Currency: 'USD', Rate: rateValue, RateDate: fecha };
    const sapConfig = await loadSapConfig(pgQuery);
    const response = await createExchangeRateInSap({ pgQuery, config: sapConfig, body: payload, dryRun });
    if (dryRun) return { fecha, payload, preview: response };
    return { fecha, payload, response };
}

// ── Orden de Producción (OWOR) ─────────────────────────────────────────────
function buildProductionOrderPayload(input = {}, config = {}) {
    if (normalizeText(input.ItemNo) && input.ProductionOrderStatus) {
        return input;
    }
    // SAP B1 exige PlannedQuantity > 0 en la Orden de Producción.
    const cantidadPlan = safeNumber(input.quantity ?? input.PlannedQuantity ?? input.plannedQuantity);
    const payload = {
        ItemNo: normalizeText(input.itemCode || input.ItemNo || input.sku),
        PlannedQuantity: cantidadPlan > 0 ? cantidadPlan : 1,
        Warehouse: normalizeText(input.warehouse || input.Warehouse || config.sapFinishedGoodsWarehouseCode),
        ProductionOrderType: normalizeText(input.type || input.ProductionOrderType) || 'bopotStandard',
        ProductionOrderOrigin: 'bopooManual',
        Comments: normalizeText(input.comments || input.Comments || `Orden de producción ${normalizeText(input.orderCode)}`),
        DueDate: normalizeText(input.dueDate || input.DueDate)
    };
    const serie = normalizeText(config.sapProductionOrderSeries);
    if (serie) {
        const n = Number(serie);
        payload.Series = Number.isFinite(n) && String(n) === serie ? n : serie;
    }
    return payload;
}

async function createProductionOrderInSap({ pgQuery, config, body, dryRun = false, actionType = 'create' }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La creación de la orden de producción');
    const requestPayload = buildProductionOrderPayload(body || {}, liveConfig);
    if (!normalizeText(requestPayload.ItemNo)) {
        throw new Error('La orden de producción necesita el código del artículo terminado (SKU).');
    }
    if (body && body.DocEntry != null && body.DocEntry !== '') {
        requestPayload.DocEntry = Number(body.DocEntry);
        requestPayload.AbsoluteEntry = Number(body.DocEntry);
    }
    if (actionType === 'update' && !dryRun && !(Number(requestPayload.DocEntry) > 0)) {
        throw new Error('Para actualizar la Orden de Producción en SAP se necesita su DocEntry.');
    }
    if (dryRun) return buildDryRunPreview('production-order', requestPayload, liveConfig, actionType);
    try {
        let responsePayload;
        if (isDiApiMiddlewareProvider(liveConfig)) {
            responsePayload = await submitViaSapMiddleware({
                pgQuery,
                entityType: 'production-order',
                actionType,
                payload: requestPayload,
                referenceCode: normalizeText(body?.orderCode || requestPayload.ItemNo),
                moduleName: 'produccion'
            });
        } else {
            responsePayload = isDiApiProvider(liveConfig)
                ? await diApiBridge.createProductionOrder(liveConfig, requestPayload)
                : await sapRequest(liveConfig, 'ProductionOrders', {
                    method: 'POST',
                    body: requestPayload
                });
        }
        await logWrite(pgQuery, { entityName: 'ProductionOrders', mode, status: 'success', requestPayload, responsePayload });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, { entityName: 'ProductionOrders', mode, status: 'error', requestPayload, responsePayload: {}, errorMessage: error.message });
        throw error;
    }
}

async function createInvoice({ pgQuery, config, body, dryRun = false, actionType = 'create' }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La creación de facturas');
    const requestPayload = applySapDocDefaults(buildInvoicePayload(body || {}), liveConfig, {
        series: liveConfig.sapInvoiceSeries
    });
    if (dryRun) return buildDryRunPreview('invoice', requestPayload, liveConfig, actionType);
    try {
        let responsePayload;
        if (isDiApiMiddlewareProvider(liveConfig)) {
            responsePayload = await submitViaSapMiddleware({
                pgQuery,
                entityType: 'invoice',
                payload: requestPayload,
                referenceCode: normalizeText(body?.orderCode || body?.order_code),
                moduleName: 'ventas'
            });
        } else {
            responsePayload = isDiApiProvider(liveConfig)
                ? await diApiBridge.createInvoice(liveConfig, requestPayload)
                : await sapRequest(liveConfig, 'Invoices', {
                    method: 'POST',
                    body: requestPayload
                });
        }
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

async function createInventoryExit({ pgQuery, config, body, dryRun = false, actionType = 'create' }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La salida de inventario');
    const settings = await loadSapProductionCostCenterSettings(pgQuery);
    const defaultCostCenterCode = normalizeText(settings.defaultCostCenterCode);
    const requestPayload = applySapDocDefaults(
        applyProductionCostCenterToPayload(
            buildInventoryExitPayload(body || {}),
            defaultCostCenterCode,
            'la salida de componentes'
        ),
        liveConfig,
        { series: liveConfig.sapInventoryExitSeries }
    );
    try {
        let responsePayload;
        if (isDiApiMiddlewareProvider(liveConfig)) {
            const warehouseCode = normalizeText(liveConfig.sapMaterialsWarehouseCode)
                || normalizeText(liveConfig.productionReservationWarehouseCode);
            if (!warehouseCode && !dryRun) {
                throw new Error('Configura la "Bodega de Materiales" (Configuración > SAP > Valores SAP) o la "Bodega Destino Reservas" antes de hacer descargas de inventario.');
            }
            requestPayload.DocumentLines = (requestPayload.DocumentLines || []).map((line) => ({
                ...line,
                WarehouseCode: line.WarehouseCode || warehouseCode
            }));
            if (dryRun) return buildDryRunPreview('inventory-exit', requestPayload, liveConfig, actionType);
            responsePayload = await submitViaSapMiddleware({
                pgQuery,
                entityType: 'inventory-exit',
                payload: requestPayload,
                referenceCode: normalizeText(body?.productionOrderId || body?.production_order_id),
                moduleName: 'produccion'
            });
        } else {
            responsePayload = isDiApiProvider(liveConfig)
                ? await diApiBridge.createInventoryExit(liveConfig, requestPayload)
                : await sapRequest(liveConfig, 'InventoryGenExits', {
                    method: 'POST',
                    body: requestPayload
                });
        }
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

async function createInventoryEntry({ pgQuery, config, body, dryRun = false, actionType = 'create' }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La entrada de inventario');
    const settings = await loadSapProductionCostCenterSettings(pgQuery);
    const defaultCostCenterCode = normalizeText(settings.defaultCostCenterCode);
    const requestPayload = applySapDocDefaults(
        applyProductionCostCenterToPayload(
            buildInventoryEntryPayload(body || {}),
            defaultCostCenterCode,
            'la terminación de producción'
        ),
        liveConfig,
        { series: liveConfig.sapInventoryEntrySeries }
    );
    try {
        let responsePayload;
        if (isDiApiMiddlewareProvider(liveConfig)) {
            const warehouseCode = normalizeText(liveConfig.sapFinishedGoodsWarehouseCode)
                || normalizeText(liveConfig.productionReservationWarehouseCode);
            if (!warehouseCode && !dryRun) {
                throw new Error('Configura la "Bodega de Producto Terminado" (Configuración > SAP > Valores SAP) o la "Bodega Destino Reservas" antes de registrar entradas de producto terminado.');
            }
            requestPayload.DocumentLines = (requestPayload.DocumentLines || []).map((line) => ({
                ...line,
                WarehouseCode: line.WarehouseCode || warehouseCode
            }));
            if (dryRun) return buildDryRunPreview('inventory-entry', requestPayload, liveConfig, actionType);
            responsePayload = await submitViaSapMiddleware({
                pgQuery,
                entityType: 'inventory-entry',
                payload: requestPayload,
                referenceCode: normalizeText(body?.productionOrderId || body?.production_order_id),
                moduleName: 'produccion'
            });
        } else {
            responsePayload = isDiApiProvider(liveConfig)
                ? await diApiBridge.createInventoryEntry(liveConfig, requestPayload)
                : await sapRequest(liveConfig, 'InventoryGenEntries', {
                    method: 'POST',
                    body: requestPayload
                });
        }
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

async function createInventoryReservation({ pgQuery, config, body }) {
    const mode = resolveOperatingMode(config);
    const liveConfig = assertLiveSapConfigReady(config, 'La reserva de inventario');
    const requestPayload = {
        ItemCode: normalizeText(body?.sapItemCode || body?.ItemCode),
        ItemName: normalizeText(body?.materialName || body?.ItemName),
        Quantity: safeNumber(body?.quantity ?? body?.Quantity),
        WarehouseCode: normalizeText(body?.warehouseCode || body?.WarehouseCode),
        BaseDocType: normalizeText(body?.baseDocType || body?.BaseDocType, 'ProductionOrder'),
        BaseEntry: normalizeText(body?.orderCode || body?.OrderCode),
        Comments: normalizeText(body?.reason || body?.Comments)
    };
    try {
        let responsePayload;
        if (isDiApiMiddlewareProvider(liveConfig)) {
            const toWarehouseCode = normalizeText(liveConfig.productionReservationWarehouseCode);
            if (!toWarehouseCode) {
                throw new Error('Configura la "Bodega Destino Reservas" en Configuración General > SAP antes de solicitar reservas de inventario.');
            }
            responsePayload = await submitViaSapMiddleware({
                pgQuery,
                entityType: 'inventory-reservation',
                payload: { ...requestPayload, ToWarehouseCode: toWarehouseCode },
                referenceCode: requestPayload.BaseEntry,
                moduleName: 'produccion'
            });
        } else {
            responsePayload = isDiApiProvider(liveConfig)
                ? await diApiBridge.createReservation(liveConfig, requestPayload)
                : await sapRequest(liveConfig, 'StockReservations', {
                    method: 'POST',
                    body: requestPayload
                });
        }
        await logWrite(pgQuery, {
            entityName: 'StockReservations',
            mode,
            status: 'success',
            requestPayload,
            responsePayload
        });
        return { ...responsePayload, source: 'sap' };
    } catch (error) {
        await logWrite(pgQuery, {
            entityName: 'StockReservations',
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
            const heartbeat = await pgQuery(`SELECT last_seen_at, last_seen_endpoint FROM sap_diapi_heartbeat WHERE id = 1`);
            res.json({
                rows: await listSapImportJobs(pgQuery),
                diapiHeartbeat: heartbeat.rows[0] || { last_seen_at: null, last_seen_endpoint: '' }
            });
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

    app.get('/api/sap/catalogo-tablas', async (req, res) => {
        res.json({ grupos: CATALOGO_TABLAS_SAP });
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

    app.get('/api/sap/items/last-sync', async (req, res) => {
        try {
            const result = await pgQuery(`SELECT MAX(synced_at) AS last_synced_at, COUNT(*)::int AS records_count FROM sap_items`);
            const row = result.rows[0] || {};
            res.json({
                ok: true,
                lastSyncedAt: row.last_synced_at || null,
                recordsCount: row.records_count || 0
            });
        } catch (error) {
            res.status(500).json({ ok: false, error: error.message || 'No fue posible consultar la última sincronización del inventario.' });
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

    app.post('/api/sap/salesperson-profit-centers/sync', async (req, res) => {
        try {
            const config = await loadSapConfig(pgQuery);
            const summary = await syncSapSalespersonsFromSap(pgQuery, config);
            res.json({ ok: true, summary, items: await listSapSalespersonProfitCenters(pgQuery) });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible sincronizar los vendedores desde SAP.' });
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

    // ── Endpoints para el middleware DIAPI ──────────────────────────────────
    // La red solo permite que el middleware (instalado en el servidor de SAP)
    // inicie la conexión hacia PrintLab, nunca al revés. Estos endpoints existen
    // para que el middleware, por su cuenta, venga a preguntar qué hay pendiente
    // (envíos y consultas) y a entregar los resultados. Protegidos con un token
    // compartido, mismo patrón que ya usa tintas-service.js con x-webhook-token.
    function checkDiapiToken(req, res) {
        const expected = process.env.DIAPI_SHARED_TOKEN;
        if (!expected) {
            registerDiapiHeartbeat(req.path);
            return true;
        }
        const provided = req.headers['x-diapi-token'];
        if (provided !== expected) {
            res.status(401).json({ error: 'Token de integración DIAPI inválido.' });
            return false;
        }
        registerDiapiHeartbeat(req.path);
        return true;
    }

    // Deja constancia de que el conector SÍ vino a preguntar, tenga o no algo pendiente
    // que darle. Sin esto, si no hay nada en las colas, no queda ningún rastro de que la
    // comunicación esté funcionando — y es exactamente lo que hace falta para poder
    // distinguir "el conector no se está conectando" de "se conecta pero no hay nada
    // pendiente". No se espera (fire-and-forget): nunca debe frenar ni romper la
    // respuesta real al conector.
    function registerDiapiHeartbeat(endpoint) {
        pgQuery(`
            UPDATE sap_diapi_heartbeat
               SET last_seen_at = NOW(),
                   last_seen_endpoint = $1
             WHERE id = 1
        `, [endpoint || '']).catch(() => null);
    }

    app.get('/api/sap/outbox/pending', async (req, res) => {
        if (!checkDiapiToken(req, res)) return;
        try {
            const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
            const result = await pgQuery(`
                SELECT id, entity_type, action_type, payload
                  FROM sap_outbox
                 WHERE status = 'pending'
                   AND next_attempt_at <= NOW()
              ORDER BY priority ASC, created_at ASC
                 LIMIT $1
            `, [limit]);
            const ids = result.rows.map((row) => row.id);
            if (ids.length) {
                await pgQuery(`UPDATE sap_outbox SET status = 'processing', updated_at = NOW() WHERE id = ANY($1::uuid[])`, [ids]);
            }
            res.json({
                value: result.rows.map((row) => ({
                    id: row.id,
                    entityType: row.entity_type,
                    actionType: row.action_type || 'create',
                    payload: row.payload
                }))
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible obtener los envíos pendientes.' });
        }
    });

    app.post('/api/sap/outbox/:id/result', async (req, res) => {
        if (!checkDiapiToken(req, res)) return;
        try {
            const { ok, result, error: errorMessage } = req.body || {};
            const status = ok ? 'done' : 'error';
            await pgQuery(`
                UPDATE sap_outbox
                   SET status = $2,
                       result_payload = $3::jsonb,
                       last_error = $4,
                       processed_at = NOW(),
                       updated_at = NOW(),
                       attempt_count = attempt_count + 1
                 WHERE id = $1::uuid
            `, [req.params.id, status, JSON.stringify(result || {}), errorMessage || '']);
            res.json({ ok: true });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible registrar el resultado del envío.' });
        }
    });

    app.get('/api/sap/inbox/pending', async (req, res) => {
        if (!checkDiapiToken(req, res)) return;
        try {
            const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
            const result = await pgQuery(`
                SELECT id, entity_type, parameters
                  FROM sap_inbox_requests
                 WHERE status = 'pending'
              ORDER BY created_at ASC
                 LIMIT $1
            `, [limit]);
            const ids = result.rows.map((row) => row.id);
            if (ids.length) {
                await pgQuery(`UPDATE sap_inbox_requests SET status = 'processing', updated_at = NOW() WHERE id = ANY($1::uuid[])`, [ids]);
            }
            res.json({
                value: result.rows.map((row) => ({ id: row.id, entityType: row.entity_type, parameters: row.parameters }))
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible obtener las consultas pendientes.' });
        }
    });

    app.post('/api/sap/inbox/:id/result', async (req, res) => {
        if (!checkDiapiToken(req, res)) return;
        try {
            const { ok, result, error: errorMessage, errorSql, errorDetail } = req.body || {};
            const status = ok ? 'answered' : 'error';
            const errorClase = ok ? '' : clasificarErrorSap({ message: errorMessage || '' });
            await pgQuery(`
                UPDATE sap_inbox_requests
                   SET status = $2,
                       result_payload = $3::jsonb,
                       last_error = $4,
                       provider_error_sql = $5,
                       provider_error_detail = $6,
                       error_clase = $7,
                       answered_at = NOW(),
                       updated_at = NOW()
                 WHERE id = $1::uuid
            `, [req.params.id, status, JSON.stringify(result || {}), errorMessage || '', errorSql || '', errorDetail || '', errorClase]);
            res.json({ ok: true });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible registrar la respuesta.' });
        }
    });

    // Historial de solicitudes reales enviadas al conector DIAPI para una entidad
    // (business-partners/items/salespersons): cuándo se preguntó, cuándo la leyó DIAPI,
    // cuándo contestó, con cuántos registros, y si esos registros ya quedaron guardados
    // en las tablas locales. Es el control que responde "¿sí está llegando o no?".
    app.get('/api/sap/inbox/history', async (req, res) => {
        try {
            const entityType = normalizeText(req.query.entityType);
            const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
            const result = await pgQuery(`
                SELECT request_code, status, parameters, created_at, updated_at, answered_at,
                       applied_at, records_applied, last_error, provider_error_sql, provider_error_detail
                  FROM sap_inbox_requests
                 WHERE ($1 = '' OR entity_type = $1)
              ORDER BY created_at DESC
                 LIMIT $2
            `, [entityType, limit]);
            res.json({
                ok: true,
                items: result.rows.map((row) => ({
                    requestCode: row.request_code,
                    status: row.status,
                    parameters: row.parameters,
                    createdAt: row.created_at,
                    readAt: row.status === 'pending' ? null : row.updated_at,
                    answeredAt: row.answered_at,
                    appliedAt: row.applied_at,
                    recordsApplied: row.records_applied,
                    lastError: row.last_error || '',
                    providerErrorSql: row.provider_error_sql || '',
                    providerErrorDetail: row.provider_error_detail || ''
                }))
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el historial de solicitudes.' });
        }
    });

    app.post('/api/sap/mirror/push', async (req, res) => {
        if (!checkDiapiToken(req, res)) return;
        try {
            const businessPartners = Array.isArray(req.body?.businessPartners) ? req.body.businessPartners : [];
            const items = Array.isArray(req.body?.items) ? req.body.items : [];
            await withTransaction(async (client) => {
                if (businessPartners.length) await upsertBusinessPartners(client, businessPartners);
                if (items.length) await upsertItems(client, items);
            });
            res.json({ ok: true, businessPartners: businessPartners.length, items: items.length });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible aplicar el refresco de SAP.' });
        }
    });

    app.post('/api/sap/limpiar-datos-prueba', async (req, res) => {
        try {
            const includeAll = normalizeBoolean(req.body?.includeAll, false);
            // scope permite limpiar/recargar solo una parte (ej. socios) sin tocar el
            // resto (ej. inventario) — por defecto 'all' preserva el comportamiento previo.
            const scope = normalizeText(req.body?.scope, 'all');
            const includePartners = scope === 'all' || scope === 'partners';
            const includeItems = scope === 'all' || scope === 'items';
            const jobCodes = Object.keys(SAP_IMPORT_JOB_DEFS).filter((code) => {
                if (scope === 'all') return true;
                if (scope === 'partners') return code === 'sap-import-business-partners';
                if (scope === 'items') return code === 'sap-import-items';
                return true;
            });
            const summary = await withTransaction(async (client) => {
                const result = {};
                if (includePartners) {
                    const businessPartners = includeAll
                        ? await client.query(`DELETE FROM business_partners`)
                        : await client.query(`DELETE FROM business_partners WHERE sap_card_code IS NOT NULL`);
                    const contacts = includeAll
                        ? await client.query(`DELETE FROM business_partner_contacts`)
                        : await client.query(`DELETE FROM business_partner_contacts WHERE COALESCE(source, '') = 'sap'`);
                    const addresses = includeAll
                        ? await client.query(`DELETE FROM business_partner_addresses`)
                        : await client.query(`DELETE FROM business_partner_addresses WHERE COALESCE(source, '') = 'sap'`);
                    const sapBusinessPartners = await client.query(`DELETE FROM sap_business_partners`);
                    const ocrd = await client.query(`DELETE FROM "OCRD"`);
                    const crd1 = await client.query(`DELETE FROM "CRD1"`);
                    result.businessPartners = businessPartners.rowCount;
                    result.contacts = contacts.rowCount;
                    result.addresses = addresses.rowCount;
                    result.sapBusinessPartners = sapBusinessPartners.rowCount;
                    result.ocrd = ocrd.rowCount;
                    result.crd1 = crd1.rowCount;
                }
                if (includeItems) {
                    const sapItems = await client.query(`DELETE FROM sap_items`);
                    const oitm = await client.query(`DELETE FROM "OITM"`);
                    const oitw = await client.query(`DELETE FROM "OITW"`);
                    const owhs = await client.query(`DELETE FROM "OWHS"`);
                    const sapWarehouses = await client.query(`DELETE FROM sap_warehouses`);
                    result.sapItems = sapItems.rowCount;
                    result.oitm = oitm.rowCount;
                    result.oitw = oitw.rowCount;
                    result.owhs = owhs.rowCount;
                    result.sapWarehouses = sapWarehouses.rowCount;
                }
                // Sin esto, la próxima corrida de la Automatización cree que ya sincronizó
                // hasta finished_at y solo pida "lo modificado desde entonces" (incremental),
                // trayendo 0 registros aunque la tabla local esté vacía.
                await client.query(`
                    UPDATE sap_sync_jobs
                       SET finished_at = NULL,
                           records_count = 0,
                           message = 'Datos locales vaciados: la próxima corrida sera una carga completa.'
                     WHERE job_code = ANY($1::text[])
                `, [jobCodes]);
                return result;
            });
            res.json({ ok: true, summary });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible limpiar los datos de prueba de SAP.' });
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

// Borra de sap_inbox_requests las filas con más de 30 días de antigüedad, para que
// esta tabla no crezca para siempre (cada consulta al conector DIAPI deja una fila).
// No toca ninguna otra tabla (sap_outbox, sap_write_log, sap_activity_log, etc.).
// Excepción: una fila en 'error' cuya causa se clasificó como definitiva (ver
// CLASES_ERROR_DEFINITIVO en sap-envios-service.js, p.ej. "referencia_no_encontrada")
// no se borra sola nunca, sin importar la antigüedad — necesita que una persona la
// revise primero. Una fila en 'error' por una causa temporal (sin conexión, timeout,
// etc.) sí se puede borrar pasados los 30 días: ya quedó superada.
async function limpiarInboxRequestsVencidos(pgQuery) {
    const clasesDefinitivas = Array.from(CLASES_ERROR_DEFINITIVO);
    const result = await pgQuery(
        `DELETE FROM sap_inbox_requests
          WHERE created_at < NOW() - INTERVAL '30 days'
            AND NOT (status = 'error' AND error_clase = ANY($1::text[]))`,
        [clasesDefinitivas]
    );
    const borradas = result?.rowCount || 0;
    console.log(`Limpieza de sap_inbox_requests: se borraron ${borradas} fila(s) con más de 30 días.`);
    return borradas;
}

function startSapInboxCleanupWorker({ pgQuery, intervalMs = 24 * 60 * 60 * 1000 }) {
    if (limpiezaInboxHandle) return limpiezaInboxHandle;
    limpiezaInboxHandle = setInterval(async () => {
        if (limpiezaInboxEnCurso) return;
        limpiezaInboxEnCurso = true;
        try {
            await limpiarInboxRequestsVencidos(pgQuery);
        } catch (error) {
            console.error('Limpieza de sap_inbox_requests:', error.message);
        } finally {
            limpiezaInboxEnCurso = false;
        }
    }, intervalMs);
    if (typeof limpiezaInboxHandle.unref === 'function') {
        limpiezaInboxHandle.unref();
    }
    return limpiezaInboxHandle;
}

module.exports = {
    ensureSapSchema,
    registerSapRoutes,
    startSapScheduler,
    startSapInboxCleanupWorker,
    limpiarInboxRequestsVencidos,
    executeSapImportJob,
    upsertBusinessPartners,
    fetchSapBusinessPartnersForImport,
    fetchSapItemsForImport,
    stageSapMirrorOrder,
    stageSapMirrorBom,
    createBusinessPartnerInSap,
    loadSapConfig,
    queryBusinessPartners,
    enqueueInboxRequest,
    getInboxRequestById,
    createInventoryExit,
    createInventoryEntry,
    createInventoryReservation,
    createOrder,
    createInvoice,
    createProductTree,
    createItemInSap,
    createExchangeRateInSap,
    obtenerTipoCambioUsdGtqVigente,
    enviarTipoCambioSap,
    createProductionOrderInSap,
    getSapMirrorProcessDefinitions
};
