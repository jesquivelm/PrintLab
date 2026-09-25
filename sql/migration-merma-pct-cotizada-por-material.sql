-- Migración: merma % COTIZADA explícita por material (sustrato, foil, laminado, tinta).
-- ---------------------------------------------------------------------------------------------
-- Contexto: el modelo de costeo consume sustrato, barniz, laminado, estampado (foil) y tinta
-- sobre la MISMA "longitud con merma" (ver public/calculo-flexografia/app.js: inkMermaRatio y
-- comentarios en calcMotivoInkStationRow). Por lo tanto el % de merma cotizado es el mismo para
-- los cuatro y equivale a:  (pies_totales_sustrato / pies_sustrato_neto - 1) * 100
-- (merma total: montaje + arranque + tiraje, no solo la parte porcentual de merma_tiraje_pct).
--
-- En vez de recalcularlo cada vez, se materializa en columnas tipadas y un trigger BEFORE
-- INSERT/UPDATE las mantiene sincronizadas con las longitudes del cálculo. Mismo patrón que
-- flexo_dies.area_cm2 y flexo_*.departamento_codigo.
--
-- Alineado en flexo_calculations, flexo_products y flexo_orders (Column Alignment).
-- Contraparte producida: merma_{sustrato? -> tiraje}_pct_vigente / merma_foil_pct_vigente /
-- merma_laminado_pct_vigente / merma_tinta_pct_vigente (ya existentes).

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_products', 'flexo_orders']
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS merma_sustrato_pct_cotizada NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS merma_foil_pct_cotizada     NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS merma_laminado_pct_cotizada NUMERIC(10,4)', tbl);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS merma_tinta_pct_cotizada    NUMERIC(10,4)', tbl);
    END LOOP;
END $$;

-- Función: calcula la merma % cotizada a partir de las longitudes del cálculo.
-- Si no hay longitudes válidas, no toca los valores (deja lo que haya).
CREATE OR REPLACE FUNCTION flexo_set_merma_pct_cotizada() RETURNS trigger AS $func$
DECLARE
    pct NUMERIC(10,4);
BEGIN
    IF NEW.pies_sustrato_neto IS NOT NULL AND NEW.pies_sustrato_neto > 0
       AND NEW.pies_totales_sustrato IS NOT NULL AND NEW.pies_totales_sustrato > 0 THEN
        pct := ROUND((NEW.pies_totales_sustrato / NEW.pies_sustrato_neto - 1) * 100, 4);
        NEW.merma_sustrato_pct_cotizada := pct;
        NEW.merma_foil_pct_cotizada     := pct;
        NEW.merma_laminado_pct_cotizada := pct;
        NEW.merma_tinta_pct_cotizada    := pct;
    END IF;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_products', 'flexo_orders']
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_merma_pct_cotizada ON %I', tbl, tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_merma_pct_cotizada
             BEFORE INSERT OR UPDATE OF pies_sustrato_neto, pies_totales_sustrato ON %I
             FOR EACH ROW EXECUTE FUNCTION flexo_set_merma_pct_cotizada()', tbl, tbl);
    END LOOP;
END $$;

-- Backfill de filas existentes.
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['flexo_calculations', 'flexo_products', 'flexo_orders']
    LOOP
        EXECUTE format($sql$
            UPDATE %I
               SET merma_sustrato_pct_cotizada = ROUND((pies_totales_sustrato / pies_sustrato_neto - 1) * 100, 4),
                   merma_foil_pct_cotizada     = ROUND((pies_totales_sustrato / pies_sustrato_neto - 1) * 100, 4),
                   merma_laminado_pct_cotizada = ROUND((pies_totales_sustrato / pies_sustrato_neto - 1) * 100, 4),
                   merma_tinta_pct_cotizada    = ROUND((pies_totales_sustrato / pies_sustrato_neto - 1) * 100, 4)
             WHERE pies_sustrato_neto > 0 AND pies_totales_sustrato > 0
        $sql$, tbl);
    END LOOP;
END $$;
