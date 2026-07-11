const http = require('http');
const https = require('https');

function normalizeText(value, fallback = '') {
    const normalized = String(value == null ? '' : value).trim();
    return normalized || fallback;
}

function normalizePositiveInt(value, fallback, min = 1, max = 120000) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, Math.round(numeric)));
}

function normalizeDiApiBaseUrl(value) {
    return normalizeText(value).replace(/\/+$/, '');
}

function buildDiApiBaseUrl(config = {}) {
    return normalizeDiApiBaseUrl(config.diApiBaseUrl || config.di_api_base_url);
}

function ensureDiApiConfig(config = {}) {
    const baseUrl = buildDiApiBaseUrl(config);
    if (!baseUrl) {
        throw new Error('Debes configurar la URL base del conector DI API.');
    }
    return {
        baseUrl,
        timeoutMs: normalizePositiveInt(config.diApiTimeoutMs || config.di_api_timeout_ms, 30000, 1000, 120000),
        sapCompany: normalizeText(config.sapCompany || config.sap_company),
        sapUser: normalizeText(config.sapUser || config.sap_user),
        sapPassword: String(config.sapPassword != null ? config.sapPassword : (config.sap_password || ''))
    };
}

function buildUrl(config, routePath, query = null) {
    const resolved = ensureDiApiConfig(config);
    const url = new URL(`${resolved.baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`);
    if (query && typeof query === 'object') {
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        });
    }
    return { url, resolved };
}

function describeNetworkError(error, url) {
    const target = url ? `${url.protocol}//${url.host}` : 'el conector DI API';
    const code = error?.code || error?.errors?.[0]?.code || '';
    if (code === 'ECONNREFUSED') {
        return `El conector DI API no responde en ${target}. Verifica que el servicio esté iniciado y que el puerto sea correcto.`;
    }
    if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
        return `Tiempo de espera agotado conectando con ${target}.`;
    }
    if (code === 'ENOTFOUND') {
        return `No se pudo resolver el host del conector DI API: ${target}.`;
    }
    return error?.message || `No fue posible conectar con ${target}.`;
}

function httpJsonRequest(url, options = {}) {
    const { method = 'GET', headers = {}, body = null, timeoutMs = 30000 } = options;
    return new Promise((resolve, reject) => {
        const transport = url.protocol === 'https:' ? https : http;
        const request = transport.request(url, {
            method,
            headers
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
                    payload
                });
            });
        });
        request.setTimeout(timeoutMs, () => {
            request.destroy(new Error('Tiempo de espera agotado al conectar con DI API.'));
        });
        request.on('error', reject);
        if (body) {
            request.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        request.end();
    });
}

async function requestJson(config, routePath, { method = 'GET', query = null, body = null } = {}) {
    const { url, resolved } = buildUrl(config, routePath, query);
    const serializedBody = body == null ? null : JSON.stringify(body);
    let response;
    try {
        response = await httpJsonRequest(url, {
            method,
            headers: serializedBody ? { 'Content-Type': 'application/json' } : {},
            body: serializedBody,
            timeoutMs: resolved.timeoutMs
        });
    } catch (error) {
        throw new Error(describeNetworkError(error, url));
    }
    if (response.statusCode >= 400) {
        throw new Error(response.payload?.error || response.payload?.message || `El conector DI API respondió ${response.statusCode}.`);
    }
    return response.payload || {};
}

function normalizeCollectionPayload(payload) {
    const value = Array.isArray(payload?.value)
        ? payload.value
        : (Array.isArray(payload?.records) ? payload.records : (Array.isArray(payload) ? payload : []));
    return {
        value,
        source: 'sap',
        provider: 'di-api'
    };
}

async function testConnection(config) {
    const payload = await requestJson(config, '/test', {
        method: 'POST',
        body: {
            sapCompany: config.sapCompany || '',
            sapUser: config.sapUser || '',
            sapPassword: config.sapPassword || ''
        }
    });
    return {
        ok: payload.ok !== false,
        mode: 'live',
        provider: 'di-api',
        message: payload.message || 'Conexión DI API válida.',
        dataSource: payload.dataSource || payload.DataSource || '',
        businessPartners: payload.businessPartners,
        items: payload.items,
        orders: payload.orders,
        raw: payload
    };
}

async function queryBusinessPartners(config, query = {}) {
    const cardTypes = String(query.cardTypes || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    if (!query.type && cardTypes.length > 1) {
        const top = normalizePositiveInt(query.top, 200, 1, 5000);
        const rows = [];
        for (const type of cardTypes) {
            const payload = await requestJson(config, '/business-partners', {
                query: {
                    ...query,
                    cardTypes: undefined,
                    type,
                    top
                }
            });
            rows.push(...normalizeCollectionPayload(payload).value);
        }
        return {
            value: rows.slice(0, top),
            source: 'sap',
            provider: 'di-api'
        };
    }
    const payload = await requestJson(config, '/business-partners', { query });
    return normalizeCollectionPayload(payload);
}

async function queryItems(config, query = {}) {
    const payload = await requestJson(config, '/items', { query });
    return normalizeCollectionPayload(payload);
}

async function queryOrders(config, query = {}) {
    const payload = await requestJson(config, '/orders', { query });
    return normalizeCollectionPayload(payload);
}

async function querySalespersons(config, query = {}) {
    const payload = await requestJson(config, '/salespersons', { query });
    return normalizeCollectionPayload(payload);
}

async function queryItemStock(config, code) {
    return requestJson(config, `/items/${encodeURIComponent(code)}/stock`);
}

async function createOrder(config, body = {}) {
    const payload = await requestJson(config, '/orders', { method: 'POST', body });
    return { ...payload, source: 'sap', provider: 'di-api' };
}

async function createProductTree(config, body = {}) {
    const payload = await requestJson(config, '/product-trees', { method: 'POST', body });
    return { ...payload, source: 'sap', provider: 'di-api' };
}

async function createInvoice(config, body = {}) {
    const payload = await requestJson(config, '/invoices', { method: 'POST', body });
    return { ...payload, source: 'sap', provider: 'di-api' };
}

async function createInventoryExit(config, body = {}) {
    const payload = await requestJson(config, '/inventory/exit', { method: 'POST', body });
    return { ...payload, source: 'sap', provider: 'di-api' };
}

async function createInventoryEntry(config, body = {}) {
    const payload = await requestJson(config, '/inventory/entry', { method: 'POST', body });
    return { ...payload, source: 'sap', provider: 'di-api' };
}

async function createBusinessPartner(config, body = {}) {
    const payload = await requestJson(config, '/business-partners', { method: 'POST', body });
    return { ...payload, source: 'sap', provider: 'di-api' };
}

async function fetchSyncRecords(config, entityName) {
    const routeMap = {
        BusinessPartners: { path: '/business-partners', query: { top: 2000 } },
        Items: { path: '/items', query: { top: 5000 } },
        Orders: { path: '/orders', query: { top: 1000 } },
        Invoices: { path: '/invoices', query: { top: 1000 } },
        Warehouses: { path: '/warehouses', query: { top: 500 } }
    };
    const definition = routeMap[entityName];
    if (!definition) {
        throw new Error(`La entidad SAP ${entityName} no está soportada para DI API.`);
    }
    const payload = await requestJson(config, definition.path, { query: definition.query });
    return normalizeCollectionPayload(payload).value;
}

module.exports = {
    buildDiApiBaseUrl,
    testConnection,
    queryBusinessPartners,
    queryItems,
    queryOrders,
    querySalespersons,
    queryItemStock,
    createOrder,
    createProductTree,
    createInvoice,
    createInventoryExit,
    createInventoryEntry,
    createBusinessPartner,
    fetchSyncRecords
};
