-- ============================================================================
-- MIGRACIÓN: Proceso de Visto Bueno con reloj (Bloque F)
-- ----------------------------------------------------------------------------
-- Antes de marcar una orden como "Enviado" al cliente, el encargado tiene que
-- correr el proceso de visto bueno (imprimir el arte, montarlo, dejarlo listo).
-- Ese proceso lleva tiempo — minutos, horas o días — y hay que dejar la traza.
--
-- vb_proceso: una fila por orden. Cronómetro con estados
--   sin_iniciar → en_curso ⇄ pausado → finalizado
-- El tiempo efectivo es acumulado_seg + (ahora - inicio_en) mientras está en curso.
-- Al registrar "cambios_cliente" (nueva ronda) el cronómetro se reinicia.
--
-- Idempotente. Ejecutar con:
--   $env:PGPASSWORD = "Calg.1984"
--   psql -U postgres -d printlab -h localhost -f sql/migration-vb-proceso.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS vb_proceso (
    order_code      TEXT PRIMARY KEY,
    quote_code      TEXT,
    line_code       TEXT,
    estado          TEXT NOT NULL DEFAULT 'sin_iniciar',
    inicio_en       TIMESTAMPTZ,
    acumulado_seg   INTEGER NOT NULL DEFAULT 0,
    pausado_desde   TIMESTAMPTZ,
    finalizado_en   TIMESTAMPTZ,
    operador        TEXT,
    actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
