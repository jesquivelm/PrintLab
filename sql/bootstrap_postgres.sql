-- Ejecutar conectado como postgres
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_roles
        WHERE rolname = 'impresiones_elite_app'
    ) THEN
        CREATE ROLE impresiones_elite_app LOGIN PASSWORD 'cambia_esto';
    END IF;
END $$;

ALTER ROLE impresiones_elite_app CREATEDB;

SELECT 'CREATE DATABASE impresiones_elite_erp OWNER impresiones_elite_app'
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_database
    WHERE datname = 'impresiones_elite_erp'
)
\gexec

GRANT ALL PRIVILEGES ON DATABASE impresiones_elite_erp TO impresiones_elite_app;
