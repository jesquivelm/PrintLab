-- ============================================================
-- BACKFILL: Convertir costo_x_pie / costo_x_msi existentes en material
-- a costo_x_metro / costo_x_m2, ya que la materia prima ahora se
-- calcula por metro lineal o metro cuadrado (no por pie ni por MSI).
-- No elimina columnas ni datos existentes, solo completa los campos
-- nuevos cuando estén vacíos.
-- ============================================================

UPDATE material
   SET costo_x_metro = ROUND(costo_x_pie / 0.3048, 6)
 WHERE COALESCE(costo_x_metro, 0) = 0
   AND COALESCE(costo_x_pie, 0) > 0;

UPDATE material
   SET costo_x_m2 = ROUND(costo_x_msi * 1.5500031, 6)
 WHERE COALESCE(costo_x_m2, 0) = 0
   AND COALESCE(costo_x_msi, 0) > 0;
