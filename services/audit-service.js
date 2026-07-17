const { query: pgQuery } = require('../db/postgres');

async function ensureAuditSchema() {
    await pgQuery(`CREATE TABLE IF NOT EXISTS credential_audit_log (
        id SERIAL PRIMARY KEY,
        occurred_at TIMESTAMP NOT NULL DEFAULT NOW(),
        user_responsible TEXT NOT NULL DEFAULT '',
        user_affected TEXT NOT NULL DEFAULT '',
        ip_address TEXT NOT NULL DEFAULT '',
        hostname TEXT NOT NULL DEFAULT '',
        department TEXT NOT NULL DEFAULT '',
        action TEXT NOT NULL,
        result TEXT NOT NULL DEFAULT 'success',
        observations TEXT NOT NULL DEFAULT ''
    )`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS credential_audit_action_idx ON credential_audit_log (action)`);
    await pgQuery(`CREATE INDEX IF NOT EXISTS credential_audit_occurred_at_idx ON credential_audit_log (occurred_at)`);
}

async function recordCredentialAudit({ userResponsible, userAffected, action, result, observations, ip, hostname, department }) {
    try {
        await pgQuery(
            `INSERT INTO credential_audit_log (user_responsible, user_affected, ip_address, hostname, department, action, result, observations, occurred_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
                String(userResponsible || '').slice(0, 200),
                String(userAffected || '').slice(0, 200),
                String(ip || '').slice(0, 45),
                String(hostname || '').slice(0, 100),
                String(department || '').slice(0, 100),
                String(action || '').slice(0, 100),
                String(result || 'success').slice(0, 20),
                String(observations || '').slice(0, 1000)
            ]
        );
    } catch (e) {
        console.error('Error registrando auditoría de credenciales:', e.message);
    }
}

function getAuditActor(req) {
    const session = req._erpSession || {};
    return {
        userResponsible: session.username || 'sistema',
        department: session.department || '',
        ip: req.ip || req.connection?.remoteAddress || '',
        hostname: req.hostname || ''
    };
}

async function getCredentialAuditLog({ limit = 100, offset = 0, action, userAffected }) {
    let query = `SELECT * FROM credential_audit_log WHERE 1=1`;
    const params = [];
    let paramIndex = 1;
    if (action) {
        query += ` AND action = $${paramIndex++}`;
        params.push(action);
    }
    if (userAffected) {
        query += ` AND LOWER(user_affected) LIKE LOWER($${paramIndex++})`;
        params.push(`%${userAffected}%`);
    }
    query += ` ORDER BY occurred_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    const result = await pgQuery(query, params);
    const countResult = await pgQuery(`SELECT COUNT(*)::int AS total FROM credential_audit_log`);
    return { rows: result.rows, total: countResult.rows[0]?.total || 0 };
}

const CREDENTIAL_ACTIONS = {
    LOGIN_SUCCESS: 'inicio_sesion_exitoso',
    LOGIN_FAILED: 'login_fallido',
    LOGOUT: 'cierre_sesion',
    USER_BLOCKED: 'usuario_bloqueado',
    USER_UNLOCKED: 'usuario_desbloqueado',
    PASSWORD_CHANGED: 'cambio_contrasena',
    PIN_GENERATED: 'generacion_pin',
    PIN_VERIFIED: 'verificacion_pin',
    PIN_EXPIRED: 'expiracion_pin',
    CREDENTIALS_RESET: 'restablecimiento_credenciales',
    EMAIL_CHANGED: 'cambio_correo',
    USER_CREATED: 'creacion_usuario',
    USER_DELETED: 'eliminacion_usuario',
    PERMISSION_CHANGED: 'cambio_permisos',
    DEPARTMENT_CHANGED: 'cambio_departamento',
    RECOVERY_RESPONSABLE_ASSIGNED: 'asignacion_responsable_recuperacion',
    SMTP_CONFIG_MODIFIED: 'modificacion_smtp',
    SMTP_TEST: 'prueba_smtp',
    EMAIL_SENT: 'envio_exitoso',
    EMAIL_FAILED: 'envio_fallido',
    SECURITY_POLICY_MODIFIED: 'modificacion_politicas_seguridad',
    USER_ACTIVATED: 'usuario_activado',
    USER_DEACTIVATED: 'usuario_desactivado',
    AUTH_CONFIG_MODIFIED: 'modificacion_config_autenticacion',
    MANUAL_UNLOCK: 'desbloqueo_manual',
    RECOVERY_RESPONSABLE_NOTIFIED: 'notificacion_responsable_recuperacion',
    TWO_FACTOR_CONFIGURED: 'configuracion_2fa',
    PASSWORD_RESET_BY_ADMIN: 'restablecimiento_por_admin',
    LOGIN_WITH_PIN: 'ingreso_con_pin_temporal'
};

module.exports = {
    ensureAuditSchema,
    recordCredentialAudit,
    getAuditActor,
    getCredentialAuditLog,
    CREDENTIAL_ACTIONS
};
