const EXCHANGE_RATE_CURRENCIES = Object.freeze([
    { code: 'USD', name: 'Dolar estadounidense', symbol: '$', flag: 'US' },
    { code: 'EUR', name: 'Euro', symbol: 'EUR', flag: 'EU' },
    { code: 'GTQ', name: 'Quetzal guatemalteco', symbol: 'Q', flag: 'GT' },
    { code: 'HNL', name: 'Lempira hondureno', symbol: 'L', flag: 'HN' },
    { code: 'CRC', name: 'Colon costarricense', symbol: 'CRC', flag: 'CR' },
    { code: 'NIO', name: 'Cordoba nicaraguense', symbol: 'C$', flag: 'NI' },
    { code: 'BZD', name: 'Dolar beliceno', symbol: 'BZ$', flag: 'BZ' },
    { code: 'PAB', name: 'Balboa panameno', symbol: 'B/.', flag: 'PA' },
    { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$', flag: 'DO' },
    { code: 'MXN', name: 'Peso mexicano', symbol: 'MX$', flag: 'MX' },
    { code: 'GBP', name: 'Libra esterlina', symbol: 'GBP', flag: 'GB' },
    { code: 'CAD', name: 'Dolar canadiense', symbol: 'CA$', flag: 'CA' },
    { code: 'JPY', name: 'Yen japones', symbol: 'JPY', flag: 'JP' },
    { code: 'CNY', name: 'Yuan chino', symbol: 'CNY', flag: 'CN' },
    { code: 'CHF', name: 'Franco suizo', symbol: 'CHF', flag: 'CH' },
    { code: 'BRL', name: 'Real brasileno', symbol: 'R$', flag: 'BR' },
    { code: 'COP', name: 'Peso colombiano', symbol: 'COP', flag: 'CO' },
    { code: 'ARS', name: 'Peso argentino', symbol: 'ARS', flag: 'AR' },
    { code: 'CLP', name: 'Peso chileno', symbol: 'CLP', flag: 'CL' },
    { code: 'PEN', name: 'Sol peruano', symbol: 'S/', flag: 'PE' },
    { code: 'PYG', name: 'Guarani paraguayo', symbol: 'PYG', flag: 'PY' },
    { code: 'BOB', name: 'Boliviano', symbol: 'BOB', flag: 'BO' },
    { code: 'UYU', name: 'Peso uruguayo', symbol: 'UYU', flag: 'UY' },
    { code: 'VES', name: 'Bolivar venezolano', symbol: 'VES', flag: 'VE' }
]);

const DEFAULT_EXCHANGE_RATE_CONFIG = Object.freeze({
    providerName: 'fawaz-currency-api',
    providerUrlTemplate: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{base}.json',
    baseCurrency: 'USD',
    defaultCurrency: 'CRC',
    enabledCurrencies: ['USD', 'CRC', 'EUR', 'GTQ', 'HNL', 'NIO', 'BZD', 'PAB', 'DOP', 'MXN', 'JPY', 'CNY'],
    autoUpdateEnabled: true,
    updateTime: '00:00',
    updateDays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    timezone: 'America/Costa_Rica',
    lastSyncStatus: 'idle',
    lastSyncMessage: '',
    lastSyncStartedAt: null,
    lastSyncFinishedAt: null
});

const DAY_KEYS = Object.freeze(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
let schedulerHandle = null;
let refreshInFlight = false;

function normalizeText(value, fallback = '') {
    const normalized = String(value == null ? '' : value).trim();
    return normalized || fallback;
}

function normalizeBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = String(value || '').trim().toLowerCase();
    if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function normalizeCurrencyCode(value, fallback = 'USD') {
    const normalized = String(value || fallback).trim().toUpperCase().slice(0, 10);
    return normalized || fallback;
}

function normalizeTimeValue(value, fallback = '00:00') {
    const normalized = String(value || fallback).trim();
    return /^\d{2}:\d{2}$/.test(normalized) ? normalized : fallback;
}

function normalizeDayList(value, fallback = DEFAULT_EXCHANGE_RATE_CONFIG.updateDays) {
    const rows = Array.isArray(value) ? value : String(value || '').split(',');
    const normalized = rows
        .map((item) => String(item || '').trim().toLowerCase())
        .filter((item, index, source) => DAY_KEYS.includes(item) && source.indexOf(item) === index);
    return normalized.length ? normalized : [...fallback];
}

function normalizeEnabledCurrencies(value, baseCurrency = 'USD') {
    const rows = Array.isArray(value) ? value : String(value || '').split(',');
    const catalogCodes = new Set(EXCHANGE_RATE_CURRENCIES.map((item) => item.code));
    const normalized = rows
        .map((item) => normalizeCurrencyCode(item, ''))
        .filter((item, index, source) => item && source.indexOf(item) === index && catalogCodes.has(item));
    if (!normalized.includes(baseCurrency)) normalized.unshift(baseCurrency);
    return normalized.length ? normalized : [baseCurrency];
}

function getCurrencyMeta(code) {
    return EXCHANGE_RATE_CURRENCIES.find((item) => item.code === normalizeCurrencyCode(code, '')) || {
        code: normalizeCurrencyCode(code, 'USD'),
        name: normalizeCurrencyCode(code, 'USD'),
        symbol: normalizeCurrencyCode(code, 'USD'),
        flag: ''
    };
}

function formatRateValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
}

function normalizeConfigRow(row = {}) {
    const baseCurrency = normalizeCurrencyCode(row.base_currency || row.baseCurrency, DEFAULT_EXCHANGE_RATE_CONFIG.baseCurrency);
    const enabledCurrencies = normalizeEnabledCurrencies(row.enabled_currencies || row.enabledCurrencies, baseCurrency);
    const requestedDefault = normalizeCurrencyCode(row.default_currency || row.defaultCurrency, DEFAULT_EXCHANGE_RATE_CONFIG.defaultCurrency);
    const defaultCurrency = enabledCurrencies.includes(requestedDefault)
        ? requestedDefault
        : (enabledCurrencies[1] || enabledCurrencies[0] || baseCurrency);
    return {
        providerName: normalizeText(row.provider_name || row.providerName, DEFAULT_EXCHANGE_RATE_CONFIG.providerName),
        providerUrlTemplate: normalizeText(row.provider_url_template || row.providerUrlTemplate, DEFAULT_EXCHANGE_RATE_CONFIG.providerUrlTemplate),
        baseCurrency,
        defaultCurrency,
        enabledCurrencies,
        autoUpdateEnabled: normalizeBoolean(row.auto_update_enabled ?? row.autoUpdateEnabled, DEFAULT_EXCHANGE_RATE_CONFIG.autoUpdateEnabled),
        updateTime: normalizeTimeValue(row.update_time || row.updateTime, DEFAULT_EXCHANGE_RATE_CONFIG.updateTime),
        updateDays: normalizeDayList(row.update_days || row.updateDays, DEFAULT_EXCHANGE_RATE_CONFIG.updateDays),
        timezone: normalizeText(row.timezone || row.timezoneName, DEFAULT_EXCHANGE_RATE_CONFIG.timezone),
        lastSyncStatus: normalizeText(row.last_sync_status || row.lastSyncStatus, DEFAULT_EXCHANGE_RATE_CONFIG.lastSyncStatus),
        lastSyncMessage: normalizeText(row.last_sync_message || row.lastSyncMessage),
        lastSyncStartedAt: row.last_sync_started_at || row.lastSyncStartedAt || null,
        lastSyncFinishedAt: row.last_sync_finished_at || row.lastSyncFinishedAt || null
    };
}

async function ensureExchangeRateSchema(pgQuery) {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS exchange_rate_config (
            id INTEGER PRIMARY KEY,
            provider_name TEXT NOT NULL DEFAULT '${DEFAULT_EXCHANGE_RATE_CONFIG.providerName}',
            provider_url_template TEXT NOT NULL DEFAULT '${DEFAULT_EXCHANGE_RATE_CONFIG.providerUrlTemplate}',
            base_currency TEXT NOT NULL DEFAULT '${DEFAULT_EXCHANGE_RATE_CONFIG.baseCurrency}',
            default_currency TEXT NOT NULL DEFAULT '${DEFAULT_EXCHANGE_RATE_CONFIG.defaultCurrency}',
            enabled_currencies JSONB NOT NULL DEFAULT '[]'::jsonb,
            auto_update_enabled BOOLEAN NOT NULL DEFAULT true,
            update_time TEXT NOT NULL DEFAULT '00:00',
            update_days JSONB NOT NULL DEFAULT '[]'::jsonb,
            timezone TEXT NOT NULL DEFAULT '${DEFAULT_EXCHANGE_RATE_CONFIG.timezone}',
            last_sync_status TEXT NOT NULL DEFAULT 'idle',
            last_sync_message TEXT NOT NULL DEFAULT '',
            last_sync_started_at TIMESTAMPTZ NULL,
            last_sync_finished_at TIMESTAMPTZ NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`
        INSERT INTO exchange_rate_config (
            id, provider_name, provider_url_template, base_currency, default_currency,
            enabled_currencies, auto_update_enabled, update_time, update_days, timezone
        )
        VALUES (1, $1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, $9)
        ON CONFLICT (id) DO NOTHING
    `, [
        DEFAULT_EXCHANGE_RATE_CONFIG.providerName,
        DEFAULT_EXCHANGE_RATE_CONFIG.providerUrlTemplate,
        DEFAULT_EXCHANGE_RATE_CONFIG.baseCurrency,
        DEFAULT_EXCHANGE_RATE_CONFIG.defaultCurrency,
        JSON.stringify(DEFAULT_EXCHANGE_RATE_CONFIG.enabledCurrencies),
        DEFAULT_EXCHANGE_RATE_CONFIG.autoUpdateEnabled,
        DEFAULT_EXCHANGE_RATE_CONFIG.updateTime,
        JSON.stringify(DEFAULT_EXCHANGE_RATE_CONFIG.updateDays),
        DEFAULT_EXCHANGE_RATE_CONFIG.timezone
    ]);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS exchange_rate_current (
            base_currency TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            rate_value NUMERIC(18, 8) NOT NULL,
            rate_date DATE NOT NULL,
            provider_name TEXT NOT NULL DEFAULT '',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (base_currency, currency_code)
        )
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS exchange_rate_history (
            id BIGSERIAL PRIMARY KEY,
            batch_key TEXT NOT NULL,
            base_currency TEXT NOT NULL,
            currency_code TEXT NOT NULL,
            rate_value NUMERIC(18, 8) NOT NULL,
            rate_date DATE NOT NULL,
            provider_name TEXT NOT NULL DEFAULT '',
            fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS exchange_rate_history_batch_idx ON exchange_rate_history (batch_key, fetched_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS exchange_rate_history_date_idx ON exchange_rate_history (rate_date DESC, base_currency)`);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS exchange_rate_update_log (
            id BIGSERIAL PRIMARY KEY,
            trigger_type TEXT NOT NULL,
            actor TEXT NOT NULL DEFAULT 'admin',
            base_currency TEXT NOT NULL,
            status TEXT NOT NULL,
            rate_date DATE NULL,
            currencies_count INTEGER NOT NULL DEFAULT 0,
            request_vars JSONB NOT NULL DEFAULT '{}'::jsonb,
            response_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
            error_message TEXT NOT NULL DEFAULT '',
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMPTZ NULL
        )
    `);
    await pgQuery(`CREATE INDEX IF NOT EXISTS exchange_rate_update_log_started_idx ON exchange_rate_update_log (started_at DESC)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS exchange_rate_update_log_status_idx ON exchange_rate_update_log (status)`);
}

async function loadExchangeRateConfig(pgQuery) {
    await ensureExchangeRateSchema(pgQuery);
    const result = await pgQuery(`
        SELECT provider_name, provider_url_template, base_currency, default_currency, enabled_currencies,
               auto_update_enabled, update_time, update_days, timezone,
               last_sync_status, last_sync_message, last_sync_started_at, last_sync_finished_at
          FROM exchange_rate_config
         WHERE id = 1
         LIMIT 1
    `);
    return normalizeConfigRow(result.rows[0] || DEFAULT_EXCHANGE_RATE_CONFIG);
}

async function saveExchangeRateConfig(pgQuery, patch = {}) {
    const previous = await loadExchangeRateConfig(pgQuery);
    const next = normalizeConfigRow({
        ...previous,
        ...patch,
        base_currency: patch.baseCurrency ?? patch.base_currency ?? previous.baseCurrency,
        enabled_currencies: patch.enabledCurrencies ?? patch.enabled_currencies ?? previous.enabledCurrencies,
        default_currency: patch.defaultCurrency ?? patch.default_currency ?? previous.defaultCurrency
    });
    await pgQuery(`
        UPDATE exchange_rate_config
           SET provider_name = $1,
               provider_url_template = $2,
               base_currency = $3,
               default_currency = $4,
               enabled_currencies = $5::jsonb,
               auto_update_enabled = $6,
               update_time = $7,
               update_days = $8::jsonb,
               timezone = $9,
               updated_at = NOW()
         WHERE id = 1
    `, [
        next.providerName,
        next.providerUrlTemplate,
        next.baseCurrency,
        next.defaultCurrency,
        JSON.stringify(next.enabledCurrencies),
        next.autoUpdateEnabled,
        next.updateTime,
        JSON.stringify(next.updateDays),
        next.timezone
    ]);
    return loadExchangeRateConfig(pgQuery);
}

async function updateExchangeRateSyncState(pgQuery, patch = {}) {
    const current = await loadExchangeRateConfig(pgQuery);
    const next = normalizeConfigRow({
        ...current,
        ...patch
    });
    await pgQuery(`
        UPDATE exchange_rate_config
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
}

async function logExchangeRateUpdateStart(pgQuery, entry = {}) {
    const result = await pgQuery(`
        INSERT INTO exchange_rate_update_log (
            trigger_type,
            actor,
            base_currency,
            status,
            request_vars,
            started_at
        )
        VALUES ($1, $2, $3, 'running', $4::jsonb, $5)
        RETURNING id
    `, [
        normalizeText(entry.triggerType, 'manual'),
        normalizeText(entry.actor, 'admin'),
        normalizeCurrencyCode(entry.baseCurrency, 'USD'),
        JSON.stringify(entry.requestVars || {}),
        entry.startedAt || new Date().toISOString()
    ]);
    return Number(result.rows[0]?.id || 0);
}

async function logExchangeRateUpdateFinish(pgQuery, logId, entry = {}) {
    await pgQuery(`
        UPDATE exchange_rate_update_log
           SET status = $2,
               rate_date = $3,
               currencies_count = $4,
               response_summary = $5::jsonb,
               error_message = $6,
               finished_at = $7
         WHERE id = $1
    `, [
        logId,
        normalizeText(entry.status, 'success'),
        entry.rateDate || null,
        Number(entry.currenciesCount || 0) || 0,
        JSON.stringify(entry.responseSummary || {}),
        normalizeText(entry.errorMessage),
        entry.finishedAt || new Date().toISOString()
    ]);
}

function buildProviderUrl(config) {
    return normalizeText(config.providerUrlTemplate, DEFAULT_EXCHANGE_RATE_CONFIG.providerUrlTemplate)
        .replace('{base}', normalizeCurrencyCode(config.baseCurrency, 'USD').toLowerCase());
}

async function fetchExchangeRatesFromProvider(config) {
    const baseCurrency = normalizeCurrencyCode(config.baseCurrency, 'USD');
    const url = buildProviderUrl(config);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, {
        signal: controller.signal,
        headers: {
            accept: 'application/json'
        }
    }).finally(() => clearTimeout(timeout));
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.error || `No fue posible consultar el proveedor de tipo de cambio (${response.status}).`);
    }
    const ratesBlock = payload?.[baseCurrency.toLowerCase()];
    if (!ratesBlock || typeof ratesBlock !== 'object') {
        throw new Error('El proveedor no devolvio tasas validas para la moneda base.');
    }
    const rateDate = normalizeText(payload?.date, new Date().toISOString().slice(0, 10));
    const rows = Object.entries(ratesBlock)
        .map(([currencyCode, rateValue]) => ({
            baseCurrency,
            currencyCode: normalizeCurrencyCode(currencyCode, ''),
            rateValue: formatRateValue(rateValue)
        }))
        .filter((row) => row.currencyCode && row.rateValue != null);
    if (!rows.some((row) => row.currencyCode === baseCurrency)) {
        rows.push({ baseCurrency, currencyCode: baseCurrency, rateValue: 1 });
    }
    return {
        providerUrl: url,
        providerName: config.providerName,
        baseCurrency,
        rateDate,
        rows
    };
}

async function loadCurrentExchangeRates(pgQuery, baseCurrency = 'USD') {
    const normalizedBase = normalizeCurrencyCode(baseCurrency, 'USD');
    const result = await pgQuery(`
        SELECT base_currency, currency_code, rate_value::float8 AS rate_value, rate_date, provider_name, updated_at
          FROM exchange_rate_current
         WHERE base_currency = $1
         ORDER BY currency_code
    `, [normalizedBase]);
    return result.rows.map((row) => ({
        baseCurrency: normalizeCurrencyCode(row.base_currency, normalizedBase),
        currencyCode: normalizeCurrencyCode(row.currency_code, ''),
        rateValue: Number(row.rate_value || 0) || 0,
        rateDate: row.rate_date,
        providerName: normalizeText(row.provider_name),
        updatedAt: row.updated_at
    }));
}

async function loadExchangeRateHistory(pgQuery, limit = 30) {
    const result = await pgQuery(`
        SELECT batch_key,
               MIN(base_currency) AS base_currency,
               MIN(rate_date) AS rate_date,
               MIN(provider_name) AS provider_name,
               MIN(fetched_at) AS fetched_at,
               JSONB_OBJECT_AGG(currency_code, rate_value::float8 ORDER BY currency_code) AS rates
          FROM exchange_rate_history
      GROUP BY batch_key
      ORDER BY MIN(fetched_at) DESC
         LIMIT $1
    `, [Math.max(1, Math.min(Number(limit || 30) || 30, 120))]);
    return result.rows.map((row) => ({
        batchKey: normalizeText(row.batch_key),
        baseCurrency: normalizeCurrencyCode(row.base_currency, 'USD'),
        rateDate: row.rate_date,
        providerName: normalizeText(row.provider_name),
        fetchedAt: row.fetched_at,
        rates: row.rates || {}
    }));
}

async function loadExchangeRateLogs(pgQuery, limit = 40) {
    const result = await pgQuery(`
        SELECT id, trigger_type, actor, base_currency, status, rate_date, currencies_count,
               request_vars, response_summary, error_message, started_at, finished_at
          FROM exchange_rate_update_log
      ORDER BY started_at DESC
         LIMIT $1
    `, [Math.max(1, Math.min(Number(limit || 40) || 40, 150))]);
    return result.rows;
}

function mapRateRowsToDisplay(rows = [], config) {
    const enabled = new Set(normalizeEnabledCurrencies(config.enabledCurrencies, config.baseCurrency));
    return rows
        .filter((row) => enabled.has(row.currencyCode))
        .map((row) => {
            const meta = getCurrencyMeta(row.currencyCode);
            return {
                code: meta.code,
                name: meta.name,
                symbol: meta.symbol,
                flag: meta.flag,
                rate: Number(row.rateValue || 0) || 0,
                isBase: meta.code === normalizeCurrencyCode(config.baseCurrency, 'USD')
            };
        })
        .sort((a, b) => {
            if (a.isBase) return -1;
            if (b.isBase) return 1;
            return a.code.localeCompare(b.code);
        });
}

async function loadExchangeRateState(pgQuery) {
    const config = await loadExchangeRateConfig(pgQuery);
    const currentRows = await loadCurrentExchangeRates(pgQuery, config.baseCurrency);
    const history = await loadExchangeRateHistory(pgQuery, 30);
    const logs = await loadExchangeRateLogs(pgQuery, 40);
    const displayRows = mapRateRowsToDisplay(currentRows, config);
    const latestRow = currentRows[0] || null;
    return {
        config,
        catalog: EXCHANGE_RATE_CURRENCIES,
        today: {
            baseCurrency: config.baseCurrency,
            defaultCurrency: config.defaultCurrency,
            rateDate: latestRow?.rateDate || null,
            updatedAt: latestRow?.updatedAt || config.lastSyncFinishedAt || null,
            items: displayRows
        },
        history,
        logs
    };
}

function summarizeRefreshResult(result = {}) {
    return {
        providerName: normalizeText(result.providerName),
        providerUrl: normalizeText(result.providerUrl),
        baseCurrency: normalizeCurrencyCode(result.baseCurrency, 'USD'),
        rateDate: result.rateDate || null,
        currenciesCount: Array.isArray(result.rows) ? result.rows.length : 0
    };
}

async function refreshExchangeRates(pgQuery, options = {}) {
    if (refreshInFlight) {
        throw new Error('Ya hay una actualizacion de tipo de cambio en proceso.');
    }
    refreshInFlight = true;
    const startedAt = new Date().toISOString();
    const config = await loadExchangeRateConfig(pgQuery);
    const logId = await logExchangeRateUpdateStart(pgQuery, {
        triggerType: options.triggerType || 'manual',
        actor: options.actor || 'admin',
        baseCurrency: config.baseCurrency,
        requestVars: {
            providerName: config.providerName,
            providerUrl: buildProviderUrl(config),
            enabledCurrencies: config.enabledCurrencies
        },
        startedAt
    });
    await updateExchangeRateSyncState(pgQuery, {
        lastSyncStatus: 'running',
        lastSyncMessage: 'Actualizando tasas...',
        lastSyncStartedAt: startedAt,
        lastSyncFinishedAt: null
    });
    try {
        const providerResult = await fetchExchangeRatesFromProvider(config);
        const batchKey = `${providerResult.rateDate}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const enabledCurrencies = new Set(normalizeEnabledCurrencies(config.enabledCurrencies, providerResult.baseCurrency));
        const rows = providerResult.rows.filter((row) => enabledCurrencies.has(row.currencyCode));
        if (!rows.some((row) => row.currencyCode === providerResult.baseCurrency)) {
            rows.unshift({ baseCurrency: providerResult.baseCurrency, currencyCode: providerResult.baseCurrency, rateValue: 1 });
        }
        await pgQuery(`DELETE FROM exchange_rate_current WHERE base_currency = $1`, [providerResult.baseCurrency]);
        for (const row of rows) {
            await pgQuery(`
                INSERT INTO exchange_rate_current (
                    base_currency, currency_code, rate_value, rate_date, provider_name, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, NOW())
                ON CONFLICT (base_currency, currency_code)
                DO UPDATE SET
                    rate_value = EXCLUDED.rate_value,
                    rate_date = EXCLUDED.rate_date,
                    provider_name = EXCLUDED.provider_name,
                    updated_at = NOW()
            `, [
                row.baseCurrency,
                row.currencyCode,
                row.rateValue,
                providerResult.rateDate,
                providerResult.providerName
            ]);
            await pgQuery(`
                INSERT INTO exchange_rate_history (
                    batch_key, base_currency, currency_code, rate_value, rate_date, provider_name, fetched_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
                batchKey,
                row.baseCurrency,
                row.currencyCode,
                row.rateValue,
                providerResult.rateDate,
                providerResult.providerName
            ]);
        }
        const finishedAt = new Date().toISOString();
        const summary = {
            ...summarizeRefreshResult(providerResult),
            currenciesCount: rows.length
        };
        await updateExchangeRateSyncState(pgQuery, {
            lastSyncStatus: 'success',
            lastSyncMessage: `${summary.currenciesCount} tasas recibidas correctamente.`,
            lastSyncStartedAt: startedAt,
            lastSyncFinishedAt: finishedAt
        });
        await logExchangeRateUpdateFinish(pgQuery, logId, {
            status: 'success',
            rateDate: providerResult.rateDate,
            currenciesCount: rows.length,
            responseSummary: summary,
            finishedAt
        });
        return {
            ok: true,
            ...summary
        };
    } catch (error) {
        const finishedAt = new Date().toISOString();
        await updateExchangeRateSyncState(pgQuery, {
            lastSyncStatus: 'error',
            lastSyncMessage: error.message || 'No fue posible actualizar las tasas.',
            lastSyncStartedAt: startedAt,
            lastSyncFinishedAt: finishedAt
        });
        await logExchangeRateUpdateFinish(pgQuery, logId, {
            status: 'error',
            currenciesCount: 0,
            responseSummary: {},
            errorMessage: error.message || 'No fue posible actualizar las tasas.',
            finishedAt
        });
        throw error;
    } finally {
        refreshInFlight = false;
    }
}

function getTimeParts(timezone = DEFAULT_EXCHANGE_RATE_CONFIG.timezone, dateValue = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: normalizeText(timezone, DEFAULT_EXCHANGE_RATE_CONFIG.timezone),
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        weekday: 'short'
    });
    const parts = formatter.formatToParts(dateValue);
    const lookup = Object.fromEntries(parts.map((item) => [item.type, item.value]));
    const weekdayMap = { Sun: 'sun', Mon: 'mon', Tue: 'tue', Wed: 'wed', Thu: 'thu', Fri: 'fri', Sat: 'sat' };
    return {
        date: `${lookup.year}-${lookup.month}-${lookup.day}`,
        time: `${lookup.hour}:${lookup.minute}`,
        weekday: weekdayMap[lookup.weekday] || 'sun'
    };
}

function shouldRunScheduledRefresh(config) {
    if (!config.autoUpdateEnabled) return false;
    const now = getTimeParts(config.timezone);
    if (!config.updateDays.includes(now.weekday)) return false;
    if (now.time < config.updateTime) return false;
    if (!config.lastSyncFinishedAt) return true;
    const last = getTimeParts(config.timezone, new Date(config.lastSyncFinishedAt));
    return last.date !== now.date;
}

async function buildProformaExchangeContext(pgQuery, generalConfig = {}) {
    const config = await loadExchangeRateConfig(pgQuery);
    const currentRows = await loadCurrentExchangeRates(pgQuery, config.baseCurrency);
    const rateMap = new Map(currentRows.map((row) => [normalizeCurrencyCode(row.currencyCode, ''), Number(row.rateValue || 0) || 0]));
    const legacyRows = (() => {
        try {
            const parsed = JSON.parse(generalConfig?.proformaCurrenciesJson || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    })();
    const legacyMap = new Map(
        legacyRows.map((row) => [
            normalizeCurrencyCode(row?.code, ''),
            {
                label: normalizeText(row?.label),
                symbol: normalizeText(row?.symbol),
                exchangeRate: Number(row?.exchangeRate || 0) || 0
            }
        ]).filter(([code]) => code)
    );
    const currencies = normalizeEnabledCurrencies(config.enabledCurrencies, config.baseCurrency).map((code) => {
        const meta = getCurrencyMeta(code);
        const legacy = legacyMap.get(code) || {};
        const exchangeRate = code === config.baseCurrency
            ? 1
            : (rateMap.get(code) || legacy.exchangeRate || 0);
        return {
            code,
            label: legacy.label || meta.name,
            symbol: legacy.symbol || meta.symbol,
            exchangeRate: exchangeRate > 0 ? exchangeRate : 1,
            flag: meta.flag
        };
    });
    const defaultCurrency = currencies.find((item) => item.code === config.defaultCurrency)
        || currencies.find((item) => item.code === normalizeCurrencyCode(generalConfig?.proformaDefaultCurrency, ''))
        || currencies[0]
        || { code: config.baseCurrency, label: config.baseCurrency, symbol: config.baseCurrency, exchangeRate: 1 };
    return {
        currencies,
        defaultCurrency: defaultCurrency.code,
        defaultCurrencyMeta: defaultCurrency,
        baseCurrency: config.baseCurrency,
        rateDate: currentRows[0]?.rateDate || null
    };
}

function convertAmount(amount, fromCode, toCode, ratesMap = new Map(), baseCurrency = 'USD') {
    const base = normalizeCurrencyCode(baseCurrency, 'USD');
    const from = normalizeCurrencyCode(fromCode, base);
    const to = normalizeCurrencyCode(toCode, base);
    const numericAmount = Number(amount || 0) || 0;
    const fromRate = from === base ? 1 : Number(ratesMap.get(from) || 0) || 0;
    const toRate = to === base ? 1 : Number(ratesMap.get(to) || 0) || 0;
    if (from !== base && fromRate <= 0) return null;
    if (to !== base && toRate <= 0) return null;
    const amountInBase = from === base ? numericAmount : (numericAmount / fromRate);
    return to === base ? amountInBase : (amountInBase * toRate);
}

function registerExchangeRateRoutes({ app, pgQuery }) {
    app.get('/api/exchange-rates/state', async (req, res) => {
        try {
            res.json(await loadExchangeRateState(pgQuery));
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el modulo de tipo de cambio.' });
        }
    });

    app.post('/api/exchange-rates/config', async (req, res) => {
        try {
            const saved = await saveExchangeRateConfig(pgQuery, req.body || {});
            res.json({ ok: true, config: saved });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible guardar la configuracion de tipo de cambio.' });
        }
    });

    app.post('/api/exchange-rates/refresh', async (req, res) => {
        try {
            const actor = normalizeText(req.body?.actor, 'admin');
            const result = await refreshExchangeRates(pgQuery, {
                triggerType: normalizeText(req.body?.triggerType, 'manual'),
                actor
            });
            res.json({
                ok: true,
                result,
                state: await loadExchangeRateState(pgQuery)
            });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible actualizar las tasas.' });
        }
    });

    app.get('/api/exchange-rates/calculate', async (req, res) => {
        try {
            const state = await loadExchangeRateState(pgQuery);
            const map = new Map((state.today?.items || []).map((item) => [item.code, item.rate]));
            const from = normalizeCurrencyCode(req.query?.from, state.config.baseCurrency);
            const to = normalizeCurrencyCode(req.query?.to, state.config.defaultCurrency);
            const amount = Number(req.query?.amount || 0) || 0;
            const result = convertAmount(amount, from, to, map, state.config.baseCurrency);
            if (result == null) {
                return res.status(400).json({ error: 'No fue posible convertir con las tasas disponibles.' });
            }
            res.json({
                ok: true,
                amount,
                from,
                to,
                result,
                rateDate: state.today?.rateDate || null
            });
        } catch (error) {
            res.status(400).json({ error: error.message || 'No fue posible calcular la conversion.' });
        }
    });
}

function startExchangeRateScheduler({ pgQuery, intervalMs = 60_000 }) {
    if (schedulerHandle) return;
    schedulerHandle = setInterval(async () => {
        try {
            const config = await loadExchangeRateConfig(pgQuery);
            if (!shouldRunScheduledRefresh(config)) return;
            await refreshExchangeRates(pgQuery, {
                triggerType: 'scheduled',
                actor: 'scheduler'
            });
        } catch (error) {
            // Scheduler is best-effort on purpose.
        }
    }, Math.max(30_000, Number(intervalMs || 60_000) || 60_000));
    if (typeof schedulerHandle.unref === 'function') {
        schedulerHandle.unref();
    }
}

module.exports = {
    EXCHANGE_RATE_CURRENCIES,
    ensureExchangeRateSchema,
    loadExchangeRateConfig,
    loadExchangeRateState,
    refreshExchangeRates,
    registerExchangeRateRoutes,
    startExchangeRateScheduler,
    buildProformaExchangeContext
};
