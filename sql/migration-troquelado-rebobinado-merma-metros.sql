-- Renombra troquelado_merma_ajuste_pies / rebobinado_merma_ajuste_pies a metros en
-- flexo_calculations, flexo_orders y flexo_products (deben coincidir entre las 3 tablas).
-- El valor guardado esta en pies (se verifico contra datos reales: 114.8294 pies = 35.00 m
-- exacto), asi que aqui se convierte multiplicando por 0.3048.

ALTER TABLE flexo_calculations RENAME COLUMN troquelado_merma_ajuste_pies TO troquelado_merma_ajuste_metros;
ALTER TABLE flexo_calculations RENAME COLUMN rebobinado_merma_ajuste_pies TO rebobinado_merma_ajuste_metros;
UPDATE flexo_calculations SET
  troquelado_merma_ajuste_metros = ROUND(troquelado_merma_ajuste_metros * 0.3048, 4),
  rebobinado_merma_ajuste_metros = ROUND(rebobinado_merma_ajuste_metros * 0.3048, 4)
WHERE troquelado_merma_ajuste_metros IS NOT NULL OR rebobinado_merma_ajuste_metros IS NOT NULL;

ALTER TABLE flexo_orders RENAME COLUMN troquelado_merma_ajuste_pies TO troquelado_merma_ajuste_metros;
ALTER TABLE flexo_orders RENAME COLUMN rebobinado_merma_ajuste_pies TO rebobinado_merma_ajuste_metros;
UPDATE flexo_orders SET
  troquelado_merma_ajuste_metros = ROUND(troquelado_merma_ajuste_metros * 0.3048, 4),
  rebobinado_merma_ajuste_metros = ROUND(rebobinado_merma_ajuste_metros * 0.3048, 4)
WHERE troquelado_merma_ajuste_metros IS NOT NULL OR rebobinado_merma_ajuste_metros IS NOT NULL;

ALTER TABLE flexo_products RENAME COLUMN troquelado_merma_ajuste_pies TO troquelado_merma_ajuste_metros;
ALTER TABLE flexo_products RENAME COLUMN rebobinado_merma_ajuste_pies TO rebobinado_merma_ajuste_metros;
UPDATE flexo_products SET
  troquelado_merma_ajuste_metros = ROUND(troquelado_merma_ajuste_metros * 0.3048, 4),
  rebobinado_merma_ajuste_metros = ROUND(rebobinado_merma_ajuste_metros * 0.3048, 4)
WHERE troquelado_merma_ajuste_metros IS NOT NULL OR rebobinado_merma_ajuste_metros IS NOT NULL;
