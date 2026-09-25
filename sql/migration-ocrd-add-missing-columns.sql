-- Migracion: Agregar columnas faltantes a tablas espejo de SAP en PostgreSQL
-- La tablas fueron creadas con esquemas incompletos, pero el codigo espera mas columnas.
-- Esto causaba "ROLLBACK: no existe la columna X en la relacion Y"
--
-- Ejecutar: psql -U postgres -d printlab -h localhost -f sql/migration-ocrd-add-missing-columns.sql

DO $$
BEGIN
    -- Telefonos y contacto
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'Phone2') THEN
        ALTER TABLE "OCRD" ADD COLUMN "Phone2" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'Cellular') THEN
        ALTER TABLE "OCRD" ADD COLUMN "Cellular" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'Fax') THEN
        ALTER TABLE "OCRD" ADD COLUMN "Fax" text DEFAULT ''::text NOT NULL;
    END IF;

    -- Web y notas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'IntrntSite') THEN
        ALTER TABLE "OCRD" ADD COLUMN "IntrntSite" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'Notes') THEN
        ALTER TABLE "OCRD" ADD COLUMN "Notes" text DEFAULT ''::text NOT NULL;
    END IF;

    -- Clasificacion fiscal y grupo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'VatGroup') THEN
        ALTER TABLE "OCRD" ADD COLUMN "VatGroup" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'GroupCode') THEN
        ALTER TABLE "OCRD" ADD COLUMN "GroupCode" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'Territory') THEN
        ALTER TABLE "OCRD" ADD COLUMN "Territory" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'OwnerCode') THEN
        ALTER TABLE "OCRD" ADD COLUMN "OwnerCode" text DEFAULT ''::text NOT NULL;
    END IF;

    -- Fechas de validez y bloqueo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'ValidFrom') THEN
        ALTER TABLE "OCRD" ADD COLUMN "ValidFrom" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'ValidTo') THEN
        ALTER TABLE "OCRD" ADD COLUMN "ValidTo" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'FrozenFrom') THEN
        ALTER TABLE "OCRD" ADD COLUMN "FrozenFrom" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'FrozenTo') THEN
        ALTER TABLE "OCRD" ADD COLUMN "FrozenTo" text DEFAULT ''::text NOT NULL;
    END IF;

    -- Direccion de facturacion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'Address') THEN
        ALTER TABLE "OCRD" ADD COLUMN "Address" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'Block') THEN
        ALTER TABLE "OCRD" ADD COLUMN "Block" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'ZipCode') THEN
        ALTER TABLE "OCRD" ADD COLUMN "ZipCode" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'City') THEN
        ALTER TABLE "OCRD" ADD COLUMN "City" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'County') THEN
        ALTER TABLE "OCRD" ADD COLUMN "County" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'Country') THEN
        ALTER TABLE "OCRD" ADD COLUMN "Country" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'State1') THEN
        ALTER TABLE "OCRD" ADD COLUMN "State1" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'Building') THEN
        ALTER TABLE "OCRD" ADD COLUMN "Building" text DEFAULT ''::text NOT NULL;
    END IF;

    -- Direccion de envio
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'MailAddres') THEN
        ALTER TABLE "OCRD" ADD COLUMN "MailAddres" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'MailBlock') THEN
        ALTER TABLE "OCRD" ADD COLUMN "MailBlock" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'MailZipCod') THEN
        ALTER TABLE "OCRD" ADD COLUMN "MailZipCod" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'MailCity') THEN
        ALTER TABLE "OCRD" ADD COLUMN "MailCity" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'MailCounty') THEN
        ALTER TABLE "OCRD" ADD COLUMN "MailCounty" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'MailCountr') THEN
        ALTER TABLE "OCRD" ADD COLUMN "MailCountr" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'State2') THEN
        ALTER TABLE "OCRD" ADD COLUMN "State2" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'MailBuildi') THEN
        ALTER TABLE "OCRD" ADD COLUMN "MailBuildi" text DEFAULT ''::text NOT NULL;
    END IF;

    -- Defaults de direccion
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'BillToDef') THEN
        ALTER TABLE "OCRD" ADD COLUMN "BillToDef" text DEFAULT ''::text NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCRD' AND column_name = 'ShipToDef') THEN
        ALTER TABLE "OCRD" ADD COLUMN "ShipToDef" text DEFAULT ''::text NOT NULL;
    END IF;

    RAISE NOTICE 'Migracion OCRD completada.';
END $$;

-- ===================================================================
-- CRD1: Agregar columna Building
-- ===================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CRD1' AND column_name = 'Building') THEN
        ALTER TABLE "CRD1" ADD COLUMN "Building" text DEFAULT ''::text NOT NULL;
        RAISE NOTICE 'Migracion CRD1 completada: columna Building agregada.';
    ELSE
        RAISE NOTICE 'CRD1: columna Building ya existe.';
    END IF;
END $$;

-- ===================================================================
-- OCPR: Agregar columnas faltantes y renombrar E_MailL a E_Mail
-- ===================================================================
DO $$
BEGIN
    -- CntctCode (identificador del contacto)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCPR' AND column_name = 'CntctCode') THEN
        ALTER TABLE "OCPR" ADD COLUMN "CntctCode" integer;
        RAISE NOTICE 'OCPR: columna CntctCode agregada.';
    END IF;

    -- Tel2
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCPR' AND column_name = 'Tel2') THEN
        ALTER TABLE "OCPR" ADD COLUMN "Tel2" text DEFAULT ''::text NOT NULL;
        RAISE NOTICE 'OCPR: columna Tel2 agregada.';
    END IF;

    -- Fax
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCPR' AND column_name = 'Fax') THEN
        ALTER TABLE "OCPR" ADD COLUMN "Fax" text DEFAULT ''::text NOT NULL;
        RAISE NOTICE 'OCPR: columna Fax agregada.';
    END IF;

    -- E_Mail (el codigo usa E_Mail, pero la tabla tiene E_MailL con doble L)
    -- Si existe E_MailL pero no E_Mail, renombrar
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCPR' AND column_name = 'E_MailL')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCPR' AND column_name = 'E_Mail') THEN
        ALTER TABLE "OCPR" RENAME COLUMN "E_MailL" TO "E_Mail";
        RAISE NOTICE 'OCPR: columna E_MailL renombrada a E_Mail.';
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OCPR' AND column_name = 'E_Mail') THEN
        ALTER TABLE "OCPR" ADD COLUMN "E_Mail" text DEFAULT ''::text NOT NULL;
        RAISE NOTICE 'OCPR: columna E_Mail agregada.';
    ELSE
        RAISE NOTICE 'OCPR: columna E_Mail ya existe.';
    END IF;
END $$;
