const { query: pgQuery } = require('../db/postgres');

async function loadSecurityConfig() {
    const result = await pgQuery(`SELECT * FROM security_config WHERE id = 1`);
    if (!result.rows.length) {
        await pgQuery(`INSERT INTO security_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
        return getDefaults();
    }
    return normalizeConfig(result.rows[0]);
}

async function saveSecurityConfig(config) {
    await pgQuery(`UPDATE security_config SET
        password_min_length = $1,
        require_upper = $2,
        require_lower = $3,
        require_digit = $4,
        require_special = $5,
        pin_length = $6,
        pin_expiry_minutes = $7,
        pin_max_attempts = $8,
        login_max_attempts = $9,
        login_window_seconds = $10,
        updated_at = NOW()
        WHERE id = 1`,
        [
            Math.max(4, Number(config.passwordMinLength) || 10),
            config.requireUpper !== false,
            config.requireLower !== false,
            config.requireDigit !== false,
            config.requireSpecial !== false,
            Math.max(4, Number(config.pinLength) || 6),
            Math.max(1, Number(config.pinExpiryMinutes) || 15),
            Math.max(1, Number(config.pinMaxAttempts) || 3),
            Math.max(1, Number(config.loginMaxAttempts) || 5),
            Math.max(5, Number(config.loginWindowSeconds) || 30)
        ]
    );
}

function getDefaults() {
    return {
        passwordMinLength: 10, requireUpper: true, requireLower: true,
        requireDigit: true, requireSpecial: true,
        pinLength: 6, pinExpiryMinutes: 15, pinMaxAttempts: 3,
        loginMaxAttempts: 5, loginWindowSeconds: 30
    };
}

function normalizeConfig(row) {
    return {
        passwordMinLength: Number(row.password_min_length) || 10,
        requireUpper: row.require_upper !== false,
        requireLower: row.require_lower !== false,
        requireDigit: row.require_digit !== false,
        requireSpecial: row.require_special !== false,
        pinLength: Number(row.pin_length) || 6,
        pinExpiryMinutes: Number(row.pin_expiry_minutes) || 15,
        pinMaxAttempts: Number(row.pin_max_attempts) || 3,
        loginMaxAttempts: Number(row.login_max_attempts) || 5,
        loginWindowSeconds: Number(row.login_window_seconds) || 30
    };
}

module.exports = { loadSecurityConfig, saveSecurityConfig };
