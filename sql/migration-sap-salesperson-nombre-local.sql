-- Migración: nombre local para vendedores SAP (Configuración → Seguridad → Vendedor SAP)
-- El nombre que llega de SAP (salesperson_name) puede no coincidir con la forma en que el
-- vendedor ya se identifica en cotizaciones/órdenes de este ERP. nombre_local es el que se usa
-- en el desplegable de asignación de vendedor a un usuario; si no se define, se usa salesperson_name.
ALTER TABLE sap_salesperson_profit_centers
  ADD COLUMN IF NOT EXISTS nombre_local TEXT NOT NULL DEFAULT '';

-- Necesario para poder actualizar (upsert) por código de vendedor SAP al sincronizar desde SAP,
-- sin depender del nombre (que es lo que puede cambiar entre sincronizaciones).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sap_salesperson_profit_centers_sales_person_code_key'
  ) THEN
    ALTER TABLE sap_salesperson_profit_centers
      ADD CONSTRAINT sap_salesperson_profit_centers_sales_person_code_key UNIQUE (sales_person_code);
  END IF;
END $$;
