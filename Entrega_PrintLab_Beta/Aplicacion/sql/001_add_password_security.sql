-- 001_add_password_security.sql
-- Agrega columna must_change_password y actualiza contraseñas existentes a bcrypt

BEGIN;

ALTER TABLE admin_users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;

COMMIT;
