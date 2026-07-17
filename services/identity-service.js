const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { query: pgQuery } = require('../db/postgres');

const BCRYPT_COST = 12;
const PIN_LENGTH = 6;
const PIN_EXPIRY_MINUTES = 15;
const PIN_MAX_ATTEMPTS = 3;

function generatePin() {
    const max = Math.pow(10, PIN_LENGTH);
    const pin = crypto.randomInt(0, max).toString().padStart(PIN_LENGTH, '0');
    const hash = crypto.createHash('sha256').update(pin).digest('hex');
    return { pin, hash };
}

function validatePassword(password, config) {
    const errors = [];
    const minLen = (config && Number(config.passwordMinLength) > 0) ? Number(config.passwordMinLength) : 4;
    if (!password || password.length < minLen) {
        errors.push(`Debe tener al menos ${minLen} caracteres.`);
    }
    if (config) {
        if (config.requireUpper && !/[A-Z]/.test(password)) {
            errors.push('Debe contener al menos una mayúscula.');
        }
        if (config.requireLower && !/[a-z]/.test(password)) {
            errors.push('Debe contener al menos una minúscula.');
        }
        if (config.requireDigit && !/\d/.test(password)) {
            errors.push('Debe contener al menos un dígito.');
        }
        if (config.requireSpecial && !/[^a-zA-Z0-9]/.test(password)) {
            errors.push('Debe contener al menos un carácter especial.');
        }
    }
    return errors;
}

function isPinExpired(pinCreatedAt) {
    if (!pinCreatedAt) return true;
    const elapsed = (Date.now() - new Date(pinCreatedAt).getTime()) / 60000;
    return elapsed > PIN_EXPIRY_MINUTES;
}

async function ensureIdentitySchema() {
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS login_attempts INTEGER NOT NULL DEFAULT 0`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS pin_hash TEXT NOT NULL DEFAULT ''`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS pin_created_at TIMESTAMP`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS pin_attempts INTEGER NOT NULL DEFAULT 0`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS recovery_responsible_departments TEXT[] NOT NULL DEFAULT '{}'`);

    await pgQuery(`CREATE TABLE IF NOT EXISTS security_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        password_min_length INTEGER NOT NULL DEFAULT 10,
        require_upper BOOLEAN NOT NULL DEFAULT TRUE,
        require_lower BOOLEAN NOT NULL DEFAULT TRUE,
        require_digit BOOLEAN NOT NULL DEFAULT TRUE,
        require_special BOOLEAN NOT NULL DEFAULT TRUE,
        pin_length INTEGER NOT NULL DEFAULT 6,
        pin_expiry_minutes INTEGER NOT NULL DEFAULT 15,
        pin_max_attempts INTEGER NOT NULL DEFAULT 3,
        login_max_attempts INTEGER NOT NULL DEFAULT 5,
        login_window_seconds INTEGER NOT NULL DEFAULT 30,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    const exists = await pgQuery(`SELECT id FROM security_config WHERE id = 1`);
    if (!exists.rows.length) {
        await pgQuery(`INSERT INTO security_config (id) VALUES (1)`);
    }
}

async function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_COST);
}

async function verifyPassword(password, hash) {
    if (!hash || !hash.startsWith('$2')) {
        return password === hash;
    }
    return bcrypt.compare(password, hash);
}

async function findUserByUsername(username) {
    const result = await pgQuery(
        `SELECT u.id, u.full_name, u.username, u.password, u.department, u.process, u.photo_url, u.is_active,
                u.permission_id, u.default_landing, u.floating_button_config,
                u.must_change_password, u.email, u.login_attempts, u.locked_until,
                u.pin_hash, u.pin_created_at, u.pin_attempts, u.recovery_responsible_departments,
                p.permission_name,
                p.default_landing AS permission_default_landing, p.module_permissions
           FROM admin_users u
      LEFT JOIN admin_permissions p ON p.id = u.permission_id
          WHERE LOWER(TRIM(u.username)) = LOWER(TRIM($1))
          LIMIT 1`,
        [username]
    );
    return result.rows[0] || null;
}

async function recordLoginAttempt(userId, success, ip) {
    if (success) {
        await pgQuery(`UPDATE admin_users SET login_attempts = 0, locked_until = NULL WHERE id = $1`, [userId]);
    } else {
        await pgQuery(`UPDATE admin_users SET login_attempts = COALESCE(login_attempts, 0) + 1 WHERE id = $1`, [userId]);
    }
}

async function isUserLocked(user) {
    if (!user.locked_until) return false;
    return new Date(user.locked_until).getTime() > Date.now();
}

async function lockUser(userId, durationMinutes = 15) {
    const until = new Date(Date.now() + durationMinutes * 60000).toISOString();
    await pgQuery(`UPDATE admin_users SET locked_until = $1, login_attempts = 0 WHERE id = $2`, [until, userId]);
}

async function unlockUser(userId) {
    await pgQuery(`UPDATE admin_users SET locked_until = NULL, login_attempts = 0 WHERE id = $1`, [userId]);
}

async function setResetPin(userId) {
    const { pin, hash } = generatePin();
    await pgQuery(`UPDATE admin_users SET pin_hash = $1, pin_created_at = NOW(), pin_attempts = 0, must_change_password = TRUE WHERE id = $2`,
        [hash, userId]);
    return pin;
}

async function verifyResetPin(userId, pin) {
    const user = await pgQuery(`SELECT pin_hash, pin_created_at, pin_attempts FROM admin_users WHERE id = $1`, [userId]);
    if (!user.rows.length) return { valid: false, reason: 'Usuario no encontrado.' };
    const u = user.rows[0];
    if (!u.pin_hash) return { valid: false, reason: 'No hay un PIN pendiente.' };
    if (isPinExpired(u.pin_created_at)) {
        await pgQuery(`UPDATE admin_users SET pin_hash = '', pin_created_at = NULL, pin_attempts = 0 WHERE id = $1`, [userId]);
        return { valid: false, reason: 'El PIN ha expirado.' };
    }
    if ((u.pin_attempts || 0) >= PIN_MAX_ATTEMPTS) {
        await pgQuery(`UPDATE admin_users SET pin_hash = '', pin_created_at = NULL, pin_attempts = 0 WHERE id = $1`, [userId]);
        return { valid: false, reason: 'Demasiados intentos fallidos con el PIN.' };
    }
    const hash = crypto.createHash('sha256').update(String(pin)).digest('hex');
    if (hash !== u.pin_hash) {
        await pgQuery(`UPDATE admin_users SET pin_attempts = COALESCE(pin_attempts, 0) + 1 WHERE id = $1`, [userId]);
        const remaining = PIN_MAX_ATTEMPTS - (u.pin_attempts + 1);
        return { valid: false, reason: `PIN incorrecto. ${remaining > 0 ? `Quedan ${remaining} intento(s).` : 'El PIN ha sido invalidado.'}` };
    }
    await pgQuery(`UPDATE admin_users SET pin_hash = '', pin_created_at = NULL, pin_attempts = 0 WHERE id = $1`, [userId]);
    return { valid: true };
}

async function setUserPassword(userId, newPassword) {
    const hashed = await hashPassword(newPassword);
    await pgQuery(`UPDATE admin_users SET password = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2`,
        [hashed, userId]);
}

async function findRecoveryResponsables(department) {
    if (!department) return [];
    const result = await pgQuery(
        `SELECT id, full_name, email, phone FROM admin_users
          WHERE $1 = ANY(recovery_responsible_departments) AND is_active = TRUE`,
        [department]
    );
    return result.rows;
}

module.exports = {
    BCRYPT_COST,
    PIN_LENGTH,
    PIN_EXPIRY_MINUTES,
    PIN_MAX_ATTEMPTS,
    generatePin,
    validatePassword,
    isPinExpired,
    ensureIdentitySchema,
    hashPassword,
    verifyPassword,
    findUserByUsername,
    recordLoginAttempt,
    isUserLocked,
    lockUser,
    unlockUser,
    setResetPin,
    verifyResetPin,
    setUserPassword,
    findRecoveryResponsables
};
