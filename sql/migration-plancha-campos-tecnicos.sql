-- Migración: campos técnicos del cliché flexográfico en el inventario de Planchas.
-- Origen: especificación técnica §9 (Cliché / placa flexográfica). La tabla `plancha` ya tiene
-- identificación, dimensiones, costo y control de uso; faltan los parámetros que definen su
-- comportamiento en prensa (dureza, relieve, lineatura, punto, distorsión, stickyback).
-- Aditivo, idempotente. No se toca nada existente.

ALTER TABLE plancha ADD COLUMN IF NOT EXISTS tecnologia            VARCHAR(80);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS dureza_shore          NUMERIC(6,2);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS relieve_mm            NUMERIC(8,4);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS lineatura_lpi         NUMERIC(8,2);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS resolucion_dpi        NUMERIC(10,2);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS punto_minimo_pct      NUMERIC(6,2);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS tipo_punto            VARCHAR(40);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS factor_distorsion     NUMERIC(10,6);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS undercut_mm           NUMERIC(8,4);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS stickyback_espesor_mm NUMERIC(8,4);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS stickyback_tipo       VARCHAR(80);
ALTER TABLE plancha ADD COLUMN IF NOT EXISTS stickyback_dureza     VARCHAR(60);

COMMENT ON COLUMN plancha.tecnologia        IS 'Tecnología de la plancha (ej. LAMS, térmica, plano relieve).';
COMMENT ON COLUMN plancha.dureza_shore      IS 'Dureza Shore A de la plancha.';
COMMENT ON COLUMN plancha.relieve_mm        IS 'Profundidad de relieve en mm.';
COMMENT ON COLUMN plancha.lineatura_lpi     IS 'Lineatura de trama en LPI.';
COMMENT ON COLUMN plancha.punto_minimo_pct  IS 'Mínimo punto reproducible en %.';
COMMENT ON COLUMN plancha.tipo_punto        IS 'Forma del punto: flat-top / convencional / redondo.';
COMMENT ON COLUMN plancha.factor_distorsion IS 'Factor de distorsión / K factor aplicado al montaje.';
COMMENT ON COLUMN plancha.undercut_mm       IS 'Undercut del cilindro/manga en mm.';
