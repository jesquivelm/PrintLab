const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { query: pgQuery } = require('../db/postgres');

const BCRYPT_COST = 12;
const PIN_LENGTH = 6;
const PIN_EXPIRY_MINUTES = 15;
const PIN_MAX_ATTEMPTS = 3;

// PIN de acceso diario (acceso_pin_*): forma corta de entrar, distinta del PIN de
// restablecimiento (pin_hash) de arriba, que es de un solo uso y expira en 15 minutos.
// Este PIN es permanente hasta que se cambie, como el PIN de Windows: convive con la
// contraseña, no la reemplaza, salvo en el login solo-PIN que ven las tablets en /login.
const ACCESO_PIN_LENGTH = 4;
const ACCESO_PIN_MAX_ATTEMPTS = 5;
const ACCESO_PIN_LOCK_MINUTES = 15;

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
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS acceso_pin_hash TEXT`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS acceso_pin_intentos INTEGER NOT NULL DEFAULT 0`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS acceso_pin_bloqueado_hasta TIMESTAMP`);
    await pgQuery(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS acceso_pin_actualizado_en TIMESTAMP`);
    await pgQuery(`CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_acceso_pin_hash ON admin_users(acceso_pin_hash) WHERE acceso_pin_hash IS NOT NULL`);

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

function hashAccesoPin(pin) {
    return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

// Asigna o cambia el PIN de acceso diario de un usuario. Rechaza un PIN que ya esté en
// uso por otra cuenta activa (el índice único en la base también lo garantiza, esto solo
// da un mensaje claro en vez de un error de base de datos).
async function setAccesoPin(userId, pin) {
    if (!/^\d{4}$/.test(String(pin || ''))) {
        return { ok: false, error: `El PIN debe tener exactamente ${ACCESO_PIN_LENGTH} dígitos.` };
    }
    const hash = hashAccesoPin(pin);
    const enUso = await pgQuery(
        `SELECT id FROM admin_users WHERE acceso_pin_hash = $1 AND id <> $2 AND is_active = TRUE`,
        [hash, userId]
    );
    if (enUso.rows.length) {
        return { ok: false, error: 'Ese PIN ya lo tiene asignado otro usuario. Elige uno distinto.' };
    }
    await pgQuery(
        `UPDATE admin_users SET acceso_pin_hash = $1, acceso_pin_intentos = 0, acceso_pin_bloqueado_hasta = NULL, acceso_pin_actualizado_en = NOW() WHERE id = $2`,
        [hash, userId]
    );
    return { ok: true };
}

async function clearAccesoPin(userId) {
    await pgQuery(
        `UPDATE admin_users SET acceso_pin_hash = NULL, acceso_pin_intentos = 0, acceso_pin_bloqueado_hasta = NULL, acceso_pin_actualizado_en = NOW() WHERE id = $1`,
        [userId]
    );
}

// Usuarios activos con PIN configurado. Sin datos sensibles — ni el hash del PIN ni el
// usuario/contraseña. (Ya no se usa desde que /login identifica el PIN sin necesitar
// una lista de nombres, se deja por si se vuelve a necesitar un listado de PINs activos.)
async function listUsuariosConPinActivo() {
    const result = await pgQuery(
        `SELECT id, full_name, department, process, photo_url
           FROM admin_users
          WHERE is_active = TRUE AND acceso_pin_hash IS NOT NULL
          ORDER BY full_name`
    );
    return result.rows;
}

// Encuentra al dueño de un PIN sin saber de antemano quién es (login solo-PIN en tablet).
// setAccesoPin ya garantiza que el PIN es único entre usuarios activos, así que el hash
// alcanza para identificar a una sola persona.
async function findUserIdByAccesoPin(pin) {
    const hash = hashAccesoPin(pin);
    const result = await pgQuery(
        `SELECT id FROM admin_users WHERE acceso_pin_hash = $1 AND is_active = TRUE`,
        [hash]
    );
    return result.rows[0]?.id || null;
}

// Verifica el PIN de un usuario ya identificado (por username, por haber tocado su nombre,
// o por findUserIdByAccesoPin). Bloquea la cuenta por intentos fallidos como ya se hace
// con la contraseña — un PIN de 4 dígitos sin ese bloqueo sería fácil de adivinar.
async function verifyAccesoPin(userId, pin) {
    const result = await pgQuery(
        `SELECT acceso_pin_hash, acceso_pin_intentos, acceso_pin_bloqueado_hasta FROM admin_users WHERE id = $1`,
        [userId]
    );
    if (!result.rows.length) return { valid: false, error: 'Usuario no encontrado.' };
    const u = result.rows[0];
    if (!u.acceso_pin_hash) return { valid: false, error: 'Este usuario no tiene un PIN de acceso configurado.' };
    if (u.acceso_pin_bloqueado_hasta && new Date(u.acceso_pin_bloqueado_hasta).getTime() > Date.now()) {
        const restanteSeg = Math.ceil((new Date(u.acceso_pin_bloqueado_hasta).getTime() - Date.now()) / 1000);
        return { valid: false, error: `PIN bloqueado por demasiados intentos. Intenta de nuevo en ${Math.ceil(restanteSeg / 60)} minuto(s).` };
    }
    if (hashAccesoPin(pin) !== u.acceso_pin_hash) {
        const intentos = (u.acceso_pin_intentos || 0) + 1;
        if (intentos >= ACCESO_PIN_MAX_ATTEMPTS) {
            const hasta = new Date(Date.now() + ACCESO_PIN_LOCK_MINUTES * 60000).toISOString();
            await pgQuery(`UPDATE admin_users SET acceso_pin_bloqueado_hasta = $1, acceso_pin_intentos = 0 WHERE id = $2`, [hasta, userId]);
            return { valid: false, error: 'PIN incorrecto. El PIN quedó bloqueado por 15 minutos.' };
        }
        await pgQuery(`UPDATE admin_users SET acceso_pin_intentos = $1 WHERE id = $2`, [intentos, userId]);
        return { valid: false, error: `PIN incorrecto. Quedan ${ACCESO_PIN_MAX_ATTEMPTS - intentos} intento(s).` };
    }
    await pgQuery(`UPDATE admin_users SET acceso_pin_intentos = 0, acceso_pin_bloqueado_hasta = NULL WHERE id = $1`, [userId]);
    return { valid: true };
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
    findRecoveryResponsables,
    ACCESO_PIN_LENGTH,
    hashAccesoPin,
    setAccesoPin,
    clearAccesoPin,
    listUsuariosConPinActivo,
    findUserIdByAccesoPin,
    verifyAccesoPin
};
