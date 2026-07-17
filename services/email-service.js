const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { query: pgQuery } = require('../db/postgres');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getMasterKey() {
    const key = process.env.PRINTLAB_MASTER_KEY;
    if (!key || key.length < 32) {
        throw new Error('PRINTLAB_MASTER_KEY no configurada o muy corta (mínimo 32 caracteres).');
    }
    return crypto.scryptSync(key, 'printlab-salt', 32);
}

function encrypt(text) {
    if (!text) return '';
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

function decrypt(encoded) {
    if (!encoded) return '';
    try {
        const key = getMasterKey();
        const parts = encoded.split(':');
        if (parts.length !== 3) return '';
        const iv = Buffer.from(parts[0], 'hex');
        const tag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error('Error descifrando contraseña SMTP:', e.message);
        return '';
    }
}

const PROVIDER_PRESETS = {
    'gmail.com': { host: 'smtp.gmail.com', port: 587, secure: false },
    'googlemail.com': { host: 'smtp.gmail.com', port: 587, secure: false },
    'outlook.com': { host: 'smtp.office365.com', port: 587, secure: false },
    'hotmail.com': { host: 'smtp.office365.com', port: 587, secure: false },
    'live.com': { host: 'smtp.office365.com', port: 587, secure: false },
    'office365.com': { host: 'smtp.office365.com', port: 587, secure: false },
    'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    'yahoo.com.mx': { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    'zoho.com': { host: 'smtp.zoho.com', port: 587, secure: false },
    'zohomail.com': { host: 'smtp.zoho.com', port: 587, secure: false },
    'mail.com': { host: 'smtp.mail.com', port: 587, secure: false },
    'icloud.com': { host: 'smtp.mail.me.com', port: 587, secure: false },
    'me.com': { host: 'smtp.mail.me.com', port: 587, secure: false },
    'protonmail.com': { host: '127.0.0.1', port: 1025, secure: false },
    'yandex.com': { host: 'smtp.yandex.com', port: 587, secure: false },
    'gmx.com': { host: 'smtp.gmx.com', port: 587, secure: false }
};

function detectProvider(email) {
    const domain = (email || '').split('@')[1]?.toLowerCase().trim();
    if (!domain) return null;
    return PROVIDER_PRESETS[domain] || null;
}

async function ensureEmailSchema() {
    await pgQuery(`CREATE TABLE IF NOT EXISTS email_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        host TEXT NOT NULL DEFAULT '',
        port INTEGER NOT NULL DEFAULT 587,
        secure BOOLEAN NOT NULL DEFAULT FALSE,
        "user" TEXT NOT NULL DEFAULT '',
        password_enc TEXT NOT NULL DEFAULT '',
        from_name TEXT NOT NULL DEFAULT '',
        from_email TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
    const exists = await pgQuery(`SELECT id FROM email_config WHERE id = 1`);
    if (!exists.rows.length) {
        await pgQuery(`INSERT INTO email_config (id) VALUES (1)`);
    }
    await pgQuery(`CREATE TABLE IF NOT EXISTS email_log (
        id SERIAL PRIMARY KEY,
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL DEFAULT '',
        body_preview TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        error_message TEXT,
        smtp_response TEXT,
        sent_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);
}

async function loadSmtpConfig() {
    const result = await pgQuery(`SELECT * FROM email_config WHERE id = 1`);
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
        host: row.host || '',
        port: Number(row.port) || 587,
        secure: Boolean(row.secure),
        user: row.user || '',
        password: decrypt(row.password_enc || ''),
        fromName: row.from_name || '',
        fromEmail: row.from_email || ''
    };
}

async function saveSmtpConfig({ host, port, secure, user, password, fromName, fromEmail }) {
    const passwordEnc = encrypt(password || '');
    await pgQuery(`UPDATE email_config SET host = $1, port = $2, secure = $3, "user" = $4, password_enc = $5, from_name = $6, from_email = $7, updated_at = NOW() WHERE id = 1`,
        [host, port, secure, user, passwordEnc, fromName, fromEmail]);
}

async function buildTransporter() {
    const cfg = await loadSmtpConfig();
    if (!cfg || !cfg.host || !cfg.user || !cfg.password) {
        throw new Error('Correo electrónico no configurado. Configura el servidor SMTP en Configuración > Seguridad.');
    }
    return nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.password }
    });
}

async function sendEmail({ to, subject, html, text }) {
    const cfg = await loadSmtpConfig();
    if (!cfg || !cfg.fromEmail) {
        throw new Error('Correo remitente no configurado.');
    }
    const transporter = await buildTransporter();
    const info = await transporter.sendMail({
        from: `"${cfg.fromName || 'PrintLab'}" <${cfg.fromEmail}>`,
        to,
        subject: subject || 'Notificación PrintLab',
        html,
        text: text || ''
    });
    await pgQuery(`INSERT INTO email_log (recipient, subject, body_preview, status, smtp_response, sent_at)
        VALUES ($1, $2, LEFT($3, 200), 'sent', $4, NOW())`,
        [to, subject || '', html || text || '', info.response || '']);
    return info;
}

async function sendPasswordResetPin(user, pin) {
    if (!user.email) {
        throw new Error('El usuario no tiene correo electrónico registrado.');
    }
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/cambiar-contrasena?pin=${pin}`;
    await sendEmail({
        to: user.email,
        subject: 'Código de recuperación - PrintLab',
        html: `<p>Hola <strong>${user.full_name}</strong>,</p>
<p>Has solicitado restablecer tu contraseña de PrintLab.</p>
<p>Tu código de recuperación es:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:700;text-align:center;padding:16px;background:#f0f4f8;border-radius:12px;font-family:monospace;">${pin}</p>
<p>Este código expira en 15 minutos y solo puede usarse una vez.</p>
<p>Puedes cambiar tu contraseña directamente haciendo clic aquí:</p>
<p style="text-align:center;margin:24px 0;">
    <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#118fc6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Cambiar contraseña</a>
</p>
<p><small>O copia este enlace en tu navegador: <a href="${resetLink}">${resetLink}</a></small></p>
<p>Si no solicitaste este cambio, ignora este mensaje.</p>
<p>Saludos,<br>Equipo PrintLab</p>`,
        text: `Hola ${user.full_name},\n\nHas solicitado restablecer tu contraseña.\n\nTu código de recuperación es: ${pin}\n\nEste código expira en 15 minutos.\n\nPuedes cambiar tu contraseña directamente en: ${resetLink}\n\nSi no solicitaste este cambio, ignora este mensaje.\n\nSaludos,\nEquipo PrintLab`
    });
}

async function sendPasswordChangedNotification(user) {
    if (!user.email) return;
    try {
        await sendEmail({
            to: user.email,
            subject: 'Contraseña actualizada - PrintLab',
            html: `<p>Hola <strong>${user.full_name}</strong>,</p>
<p>Tu contraseña de PrintLab ha sido actualizada exitosamente.</p>
<p>Si no realizaste este cambio, contacta al administrador de inmediato.</p>
<p>Saludos,<br>Equipo PrintLab</p>`,
            text: `Hola ${user.full_name},\n\nTu contraseña de PrintLab ha sido actualizada.\n\nSi no realizaste este cambio, contacta al administrador.\n\nSaludos,\nEquipo PrintLab`
        });
    } catch (e) {
        console.error('Error notificando cambio de contraseña:', e.message);
    }
}

async function sendAccountBlockedNotification(user) {
    if (!user.email) return;
    try {
        await sendEmail({
            to: user.email,
            subject: 'Cuenta bloqueada - PrintLab',
            html: `<p>Hola <strong>${user.full_name}</strong>,</p>
<p>Tu cuenta de PrintLab ha sido bloqueada por seguridad debido a múltiples intentos fallidos de inicio de sesión.</p>
<p>Contacta al administrador para recuperar el acceso.</p>
<p>Saludos,<br>Equipo PrintLab</p>`,
            text: `Hola ${user.full_name},\n\nTu cuenta de PrintLab ha sido bloqueada por seguridad.\n\nContacta al administrador.\n\nSaludos,\nEquipo PrintLab`
        });
    } catch (e) {
        console.error('Error notificando bloqueo:', e.message);
    }
}

module.exports = {
    ensureEmailSchema,
    loadSmtpConfig,
    saveSmtpConfig,
    sendEmail,
    sendPasswordResetPin,
    sendPasswordChangedNotification,
    sendAccountBlockedNotification,
    detectProvider,
    PROVIDER_PRESETS,
    decrypt
};
