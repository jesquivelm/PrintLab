-- Reversa de migration-troquelado-rebobinado-merma-metros.sql.

UPDATE flexo_calculations SET
  troquelado_merma_ajuste_metros = ROUND(troquelado_merma_ajuste_metros / 0.3048, 4),
  rebobinado_merma_ajuste_metros = ROUND(rebobinado_merma_ajuste_metros / 0.3048, 4)
WHERE troquelado_merma_ajuste_metros IS NOT NULL OR rebobinado_merma_ajuste_metros IS NOT NULL;
ALTER TABLE flexo_calculations RENAME COLUMN troquelado_merma_ajuste_metros TO troquelado_merma_ajuste_pies;
ALTER TABLE flexo_calculations RENAME COLUMN rebobinado_merma_ajuste_metros TO rebobinado_merma_ajuste_pies;

UPDATE flexo_orders SET
  troquelado_merma_ajuste_metros = ROUND(troquelado_merma_ajuste_metros / 0.3048, 4),
  rebobinado_merma_ajuste_metros = ROUND(rebobinado_merma_ajuste_metros / 0.3048, 4)
WHERE troquelado_merma_ajuste_metros IS NOT NULL OR rebobinado_merma_ajuste_metros IS NOT NULL;
ALTER TABLE flexo_orders RENAME COLUMN troquelado_merma_ajuste_metros TO troquelado_merma_ajuste_pies;
ALTER TABLE flexo_orders RENAME COLUMN rebobinado_merma_ajuste_metros TO rebobinado_merma_ajuste_pies;

UPDATE flexo_products SET
  troquelado_merma_ajuste_metros = ROUND(troquelado_merma_ajuste_metros / 0.3048, 4),
  rebobinado_merma_ajuste_metros = ROUND(rebobinado_merma_ajuste_metros / 0.3048, 4)
WHERE troquelado_merma_ajuste_metros IS NOT NULL OR rebobinado_merma_ajuste_metros IS NOT NULL;
ALTER TABLE flexo_products RENAME COLUMN troquelado_merma_ajuste_metros TO troquelado_merma_ajuste_pies;
ALTER TABLE flexo_products RENAME COLUMN rebobinado_merma_ajuste_metros TO rebobinado_merma_ajuste_pies;
