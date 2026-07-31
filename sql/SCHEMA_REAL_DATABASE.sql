--
-- PostgreSQL database dump
--

\restrict Pt6mn5AJHNocYdiTabywtLl5T4hOjhiJkYcjYhbReP7VSSF8K6dHnGW62lVa2gh

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: tintas; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA tintas;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: estado_cotizacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_cotizacion AS ENUM (
    'borrador',
    'enviada',
    'aprobada',
    'vencida',
    'convertida'
);


--
-- Name: formato_cotizacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.formato_cotizacion AS ENUM (
    'simple',
    'frente_dorso'
);


--
-- Name: idioma_codigo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.idioma_codigo AS ENUM (
    'es',
    'en',
    'fr',
    'de'
);


--
-- Name: moneda_codigo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.moneda_codigo AS ENUM (
    'USD',
    'CRC',
    'GTQ',
    'EUR'
);


--
-- Name: proceso_productivo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proceso_productivo AS ENUM (
    'P5',
    'Convencional',
    'Digital',
    'HP6000',
    'Hibrido',
    'ABG'
);


--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_usuario AS ENUM (
    'admin_tenant',
    'vendedor',
    'cotizador',
    'cotizador_avanzado',
    'seguimiento',
    'arte',
    'preprensa',
    'operario',
    'calidad',
    'administracion',
    'soporte'
);


--
-- Name: tipo_cotizacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_cotizacion AS ENUM (
    'regular',
    'licitacion',
    'repeticion'
);


--
-- Name: tipo_etiquetado; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_etiquetado AS ENUM (
    'Automatico',
    'Manual'
);


--
-- Name: tipo_orden_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_orden_enum AS ENUM (
    'Nuevo',
    'Repeticion',
    'RepeticionCambio',
    'Pruebas',
    'Muestras',
    'Regalias'
);


--
-- Name: tipo_salida_rollo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_salida_rollo AS ENUM (
    'D',
    'A',
    'Indistinto'
);


--
-- Name: estado_consumo; Type: TYPE; Schema: tintas; Owner: -
--

CREATE TYPE tintas.estado_consumo AS ENUM (
    'PENDIENTE',
    'PROCESADO',
    'ANULADO'
);


--
-- Name: estado_producto; Type: TYPE; Schema: tintas; Owner: -
--

CREATE TYPE tintas.estado_producto AS ENUM (
    'ACTIVO',
    'INACTIVO',
    'VENCIDO',
    'BLOQUEADO',
    'DESCONTINUADO'
);


--
-- Name: estado_receta; Type: TYPE; Schema: tintas; Owner: -
--

CREATE TYPE tintas.estado_receta AS ENUM (
    'BORRADOR',
    'VIGENTE',
    'ARCHIVADO',
    'OBSOLETO'
);


--
-- Name: origen_inventario; Type: TYPE; Schema: tintas; Owner: -
--

CREATE TYPE tintas.origen_inventario AS ENUM (
    'SAP',
    'ERP_LOCAL'
);


--
-- Name: tipo_asociacion_producto; Type: TYPE; Schema: tintas; Owner: -
--

CREATE TYPE tintas.tipo_asociacion_producto AS ENUM (
    'RECOMENDADO',
    'OBLIGATORIO'
);


--
-- Name: tipo_movimiento; Type: TYPE; Schema: tintas; Owner: -
--

CREATE TYPE tintas.tipo_movimiento AS ENUM (
    'ENTRADA',
    'SALIDA',
    'AJUSTE_POSITIVO',
    'AJUSTE_NEGATIVO',
    'TRANSFERENCIA',
    'CONSUMO_PRODUCCION',
    'DEVOLUCION',
    'MERMA'
);


--
-- Name: tipo_producto; Type: TYPE; Schema: tintas; Owner: -
--

CREATE TYPE tintas.tipo_producto AS ENUM (
    'TINTA_UV',
    'BARNIZ',
    'PRIMER',
    'ADHESIVO',
    'BASE',
    'BLANCO',
    'TRANSPARENTE',
    'EXTENDER',
    'DILUYENTE',
    'SOLVENTE',
    'LIMPIADOR',
    'ADITIVO',
    'RETARDANTE',
    'ACELERANTE',
    'OTRO'
);


--
-- Name: unidad_medida; Type: TYPE; Schema: tintas; Owner: -
--

CREATE TYPE tintas.unidad_medida AS ENUM (
    'KG',
    'G',
    'LB',
    'OZ',
    'L',
    'ML',
    'GAL'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: CRD1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CRD1" (
    id bigint NOT NULL,
    "CardCode" text NOT NULL,
    "Address" text DEFAULT ''::text NOT NULL,
    "AdresType" text DEFAULT ''::text NOT NULL,
    "Street" text DEFAULT ''::text NOT NULL,
    "Block" text DEFAULT ''::text NOT NULL,
    "City" text DEFAULT ''::text NOT NULL,
    "County" text DEFAULT ''::text NOT NULL,
    "State" text DEFAULT ''::text NOT NULL,
    "Country" text DEFAULT ''::text NOT NULL,
    "ZipCode" text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: CRD1_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CRD1_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CRD1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CRD1_id_seq" OWNED BY public."CRD1".id;


--
-- Name: ITM1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ITM1" (
    id bigint NOT NULL,
    "ItemCode" text NOT NULL,
    "PriceList" integer DEFAULT 1 NOT NULL,
    "Price" numeric,
    "Currency" text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ITM1_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ITM1_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ITM1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ITM1_id_seq" OWNED BY public."ITM1".id;


--
-- Name: ITT1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ITT1" (
    id bigint NOT NULL,
    "Father" text NOT NULL,
    "Code" text DEFAULT ''::text NOT NULL,
    "Quantity" numeric,
    "Warehouse" text DEFAULT ''::text NOT NULL,
    "PriceList" integer,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    exported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ITT1_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ITT1_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ITT1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ITT1_id_seq" OWNED BY public."ITT1".id;


--
-- Name: OCPR; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OCPR" (
    id bigint NOT NULL,
    "CardCode" text NOT NULL,
    "Name" text DEFAULT ''::text NOT NULL,
    "FirstName" text DEFAULT ''::text NOT NULL,
    "LastName" text DEFAULT ''::text NOT NULL,
    "E_MailL" text DEFAULT ''::text NOT NULL,
    "Tel1" text DEFAULT ''::text NOT NULL,
    "Cellolar" text DEFAULT ''::text NOT NULL,
    "Position" text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: OCPR_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."OCPR_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OCPR_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."OCPR_id_seq" OWNED BY public."OCPR".id;


--
-- Name: OCRD; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OCRD" (
    "CardCode" text NOT NULL,
    "CardName" text DEFAULT ''::text NOT NULL,
    "CardType" text DEFAULT ''::text NOT NULL,
    "Currency" text DEFAULT ''::text NOT NULL,
    "LicTradNum" text DEFAULT ''::text NOT NULL,
    "FederalTaxID" text DEFAULT ''::text NOT NULL,
    "Phone1" text DEFAULT ''::text NOT NULL,
    "E_Mail" text DEFAULT ''::text NOT NULL,
    "CntctPrsn" text DEFAULT ''::text NOT NULL,
    "ListNum" integer,
    "validFor" text DEFAULT 'Y'::text NOT NULL,
    "frozenFor" text DEFAULT 'N'::text NOT NULL,
    "Balance" numeric,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: OITM; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OITM" (
    "ItemCode" text NOT NULL,
    "ItemName" text DEFAULT ''::text NOT NULL,
    "ItmsGrpCod" text DEFAULT ''::text NOT NULL,
    "InvntryUom" text DEFAULT ''::text NOT NULL,
    "BuyUnitMsr" text DEFAULT ''::text NOT NULL,
    "SalUnitMsr" text DEFAULT ''::text NOT NULL,
    "validFor" text DEFAULT 'Y'::text NOT NULL,
    "frozenFor" text DEFAULT 'N'::text NOT NULL,
    "OnHand" numeric,
    "IsCommited" numeric,
    "OnOrder" numeric,
    "AvgPrice" numeric,
    "LastPurPrc" numeric,
    "Price" numeric,
    "Currency" text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    "U_ClasificacionERP" text DEFAULT ''::text NOT NULL
);


--
-- Name: OITT; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OITT" (
    "Code" text NOT NULL,
    "Name" text DEFAULT ''::text NOT NULL,
    "Qauntity" numeric,
    "TreeType" text DEFAULT 'P'::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    exported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: OITW; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OITW" (
    id bigint NOT NULL,
    "ItemCode" text NOT NULL,
    "WhsCode" text DEFAULT ''::text NOT NULL,
    "OnHand" numeric,
    "IsCommited" numeric,
    "OnOrder" numeric,
    "AvailableQuantity" numeric,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: OITW_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."OITW_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: OITW_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."OITW_id_seq" OWNED BY public."OITW".id;


--
-- Name: ORDR; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ORDR" (
    "DocEntry" bigint NOT NULL,
    "DocNum" text DEFAULT ''::text NOT NULL,
    "CardCode" text DEFAULT ''::text NOT NULL,
    "CardName" text DEFAULT ''::text NOT NULL,
    "DocDate" text DEFAULT ''::text NOT NULL,
    "DocDueDate" text DEFAULT ''::text NOT NULL,
    "DocTotal" numeric,
    "Currency" text DEFAULT ''::text NOT NULL,
    "DocStatus" text DEFAULT ''::text NOT NULL,
    "Comments" text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    exported_at timestamp with time zone DEFAULT now() NOT NULL,
    "SlpCode" integer
);


--
-- Name: OWHS; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OWHS" (
    "WhsCode" text NOT NULL,
    "WhsName" text DEFAULT ''::text NOT NULL,
    "Location" text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: OWOR; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OWOR" (
    "DocEntry" bigint NOT NULL,
    "DocNum" text DEFAULT ''::text NOT NULL,
    "ItemCode" text DEFAULT ''::text NOT NULL,
    "ProdName" text DEFAULT ''::text NOT NULL,
    "PlannedQty" numeric,
    "CmpltQty" numeric,
    "PostDate" text DEFAULT ''::text NOT NULL,
    "DueDate" text DEFAULT ''::text NOT NULL,
    "Status" text DEFAULT ''::text NOT NULL,
    "OriginNum" text DEFAULT ''::text NOT NULL,
    "Comments" text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    exported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: RDR1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RDR1" (
    id bigint NOT NULL,
    "DocEntry" bigint NOT NULL,
    "LineNum" integer DEFAULT 0 NOT NULL,
    "ItemCode" text DEFAULT ''::text NOT NULL,
    "Dscription" text DEFAULT ''::text NOT NULL,
    "Quantity" numeric,
    "Price" numeric,
    "LineTotal" numeric,
    "WhsCode" text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    exported_at timestamp with time zone DEFAULT now() NOT NULL,
    "OcrCode" text DEFAULT ''::text NOT NULL
);


--
-- Name: RDR1_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RDR1_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RDR1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RDR1_id_seq" OWNED BY public."RDR1".id;


--
-- Name: WOR1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."WOR1" (
    id bigint NOT NULL,
    "DocEntry" bigint NOT NULL,
    "LineNum" integer DEFAULT 0 NOT NULL,
    "ItemCode" text DEFAULT ''::text NOT NULL,
    "ItemName" text DEFAULT ''::text NOT NULL,
    "PlannedQty" numeric,
    "IssuedQty" numeric,
    warehous text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    exported_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: WOR1_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."WOR1_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: WOR1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."WOR1_id_seq" OWNED BY public."WOR1".id;


--
-- Name: admin_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_permissions (
    id bigint NOT NULL,
    permission_name text NOT NULL,
    default_landing text DEFAULT 'dashboard'::text NOT NULL,
    module_permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_permissions_id_seq OWNED BY public.admin_permissions.id;


--
-- Name: admin_user_channel_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_user_channel_settings (
    user_id bigint NOT NULL,
    outbound_email text DEFAULT ''::text NOT NULL,
    provider_type text DEFAULT 'smtp'::text NOT NULL,
    smtp_host text DEFAULT ''::text NOT NULL,
    smtp_port integer DEFAULT 587 NOT NULL,
    smtp_secure boolean DEFAULT true NOT NULL,
    smtp_username text DEFAULT ''::text NOT NULL,
    smtp_password text DEFAULT ''::text NOT NULL,
    sender_display_name text DEFAULT ''::text NOT NULL,
    last_tested_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id bigint NOT NULL,
    full_name text NOT NULL,
    username text DEFAULT ''::text NOT NULL,
    password text DEFAULT ''::text NOT NULL,
    department text DEFAULT ''::text NOT NULL,
    process text DEFAULT ''::text NOT NULL,
    photo_url text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    permission_id bigint,
    signature_url text DEFAULT ''::text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    phone_secondary text DEFAULT ''::text NOT NULL,
    notify_email boolean DEFAULT false NOT NULL,
    notify_whatsapp boolean DEFAULT false NOT NULL,
    notify_sms boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    floating_button_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    sap_salesperson_code bigint,
    sap_salesperson_name text DEFAULT ''::text NOT NULL,
    default_landing text DEFAULT ''::text NOT NULL,
    login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp without time zone,
    pin_hash text DEFAULT ''::text NOT NULL,
    pin_created_at timestamp without time zone,
    pin_attempts integer DEFAULT 0 NOT NULL,
    recovery_responsible_departments text[] DEFAULT '{}'::text[] NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL
);


--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.admin_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
-- Name: app_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    config_value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    module_key text NOT NULL,
    entity_type text NOT NULL,
    entity_key text NOT NULL,
    presentation_key text,
    presentation_label text,
    section_key text,
    section_label text,
    row_key text,
    row_label text,
    field_key text NOT NULL,
    field_label text,
    old_value jsonb,
    new_value jsonb,
    old_value_display text,
    new_value_display text,
    changed_by text,
    route text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: business_partner_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_partner_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_code text,
    address_name text,
    address_type text,
    country text,
    state_province text,
    county text,
    district text,
    address_line text,
    zip_code text,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_partner_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_partner_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_code text,
    contact_name text,
    first_name text,
    last_name text,
    email text,
    phone text,
    mobile text,
    fax text,
    "position" text,
    is_legal_representative boolean,
    country text,
    state_province text,
    county text,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: business_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_code text,
    prospect_code text,
    partner_name text,
    salesperson_name text,
    tax_id text,
    email text,
    email_facturacion text,
    currency_code text,
    payment_terms text,
    sector text,
    sub_sector text,
    is_tax_exempt boolean,
    allowed_percentage numeric(12,4),
    client_type text,
    creation_date date,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calculo_flexo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calculo_flexo (
    id character varying(20) NOT NULL,
    tenant_id uuid NOT NULL,
    cotizacion_id character varying(20) NOT NULL,
    nombre_trabajo character varying(300) NOT NULL,
    tipo_producto character varying(100),
    codigo_producto character varying(50),
    version_producto character varying(50),
    formato public.formato_cotizacion DEFAULT 'simple'::public.formato_cotizacion NOT NULL,
    proceso_productivo public.proceso_productivo DEFAULT 'Digital'::public.proceso_productivo NOT NULL,
    dim_ancho_mm numeric(10,4),
    dim_largo_mm numeric(10,4),
    cantidad_tintas smallint DEFAULT 0,
    cantidad_pantones smallint DEFAULT 0,
    cmyk_check boolean DEFAULT false NOT NULL,
    tinta_blanca_check boolean DEFAULT false NOT NULL,
    doble_pasada_check boolean DEFAULT false NOT NULL,
    sin_impresion boolean DEFAULT false NOT NULL,
    tipo_orden public.tipo_orden_enum,
    cantidad_tipos smallint DEFAULT 1,
    cantidad_cambios smallint DEFAULT 0,
    maquina_digital_id uuid,
    material_conv_id uuid,
    material_digital_id uuid,
    troquel_conv_id uuid,
    troquel_digital_id uuid,
    troquelado_check boolean DEFAULT false NOT NULL,
    barniz_check boolean DEFAULT false NOT NULL,
    barniz_tipo character varying(100),
    laminado_check boolean DEFAULT false NOT NULL,
    laminado_tipo character varying(100),
    estampado_check boolean DEFAULT false NOT NULL,
    estampado_tipo character varying(100),
    estampado_ancho_mm numeric(10,4),
    tipo_etiquetado public.tipo_etiquetado,
    tipo_salida public.tipo_salida_rollo,
    ancho_core_mm numeric(10,4),
    diametro_core character varying(30),
    etiquetas_x_rollo integer,
    requiere_sri boolean DEFAULT false NOT NULL,
    requiere_prueba_color boolean DEFAULT false NOT NULL,
    macula_conv_pies_override integer,
    macula_digital_pies_override integer,
    cyrel_check character varying(20) DEFAULT 'No'::character varying,
    costo_arte_interno numeric(12,4) DEFAULT 0,
    costo_troquel_interno numeric(12,4) DEFAULT 0,
    costo_flete_interno numeric(12,4) DEFAULT 0,
    costo_maquila_interno numeric(12,4) DEFAULT 0,
    costo_envio numeric(12,4) DEFAULT 0,
    pct_comision_agencia numeric(6,4) DEFAULT 0,
    elemento_padre_id character varying(20),
    facturar_en_juegos boolean DEFAULT false NOT NULL,
    linea_opcional_check boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    creado_por uuid,
    modificado_por uuid
);


--
-- Name: calculo_flexo_proceso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calculo_flexo_proceso (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    calculo_id character varying(20) NOT NULL,
    numero_secuencia smallint NOT NULL,
    bloque_tipo character varying(40) NOT NULL,
    bloque_nombre character varying(120) NOT NULL,
    proceso character varying(120),
    subproceso character varying(120),
    maquina_id uuid,
    es_inline boolean DEFAULT false NOT NULL,
    preset_clave character varying(80),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calculo_flexo_proceso_variable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calculo_flexo_proceso_variable (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proceso_id uuid NOT NULL,
    nombre character varying(120) NOT NULL,
    tipo_valor character varying(20) DEFAULT 'number'::character varying NOT NULL,
    valor_numero numeric(18,6),
    valor_texto text,
    valor_booleano boolean,
    unidad character varying(30),
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calculo_flexo_secuencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calculo_flexo_secuencia (
    tenant_id uuid NOT NULL,
    ultimo_id bigint DEFAULT 500000 NOT NULL
);


--
-- Name: cantidad_calculo_flexo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cantidad_calculo_flexo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    calculo_id character varying(20) NOT NULL,
    posicion smallint NOT NULL,
    cantidad_productos integer NOT NULL,
    proceso_productivo public.proceso_productivo,
    maquina_id uuid,
    conv_pies_total numeric(14,4),
    conv_msi_total numeric(14,4),
    conv_area_m2 numeric(14,6),
    digital_pies_total numeric(14,4),
    digital_msi_total numeric(14,4),
    digital_area_m2 numeric(14,6),
    costo_material numeric(14,4) DEFAULT 0,
    costo_preprensa numeric(14,4) DEFAULT 0,
    costo_montaje numeric(14,4) DEFAULT 0,
    costo_tiraje numeric(14,4) DEFAULT 0,
    costo_tintas numeric(14,4) DEFAULT 0,
    costo_impresion numeric(14,4) DEFAULT 0,
    costo_troquelado numeric(14,4) DEFAULT 0,
    costo_barniz numeric(14,4) DEFAULT 0,
    costo_laminado numeric(14,4) DEFAULT 0,
    costo_estampado numeric(14,4) DEFAULT 0,
    costo_rebobinado numeric(14,4) DEFAULT 0,
    costo_empaque numeric(14,4) DEFAULT 0,
    costo_cyrel numeric(14,4) DEFAULT 0,
    subtotal_costos numeric(14,4) DEFAULT 0,
    subtotal_antes_iv_usd numeric(14,4),
    impuestos_usd numeric(14,4),
    total_con_iv_usd numeric(14,4),
    precio_millar_usd numeric(14,6),
    precio_unitario_usd numeric(14,8),
    tipo_cambio_snap numeric(10,4),
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: costo_acabado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.costo_acabado (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    tipo character varying(50) NOT NULL,
    subtipo character varying(100),
    costo_x_msi numeric(12,6) DEFAULT 0,
    costo_x_m2 numeric(12,6) DEFAULT 0,
    costo_x_pie numeric(12,6) DEFAULT 0,
    costo_fijo numeric(12,4) DEFAULT 0,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: costo_general; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.costo_general (
    tenant_id uuid NOT NULL,
    pct_imprevistos numeric(6,4) DEFAULT 0.03 NOT NULL,
    pct_financieros numeric(6,4) DEFAULT 0.02 NOT NULL,
    pct_vendedor numeric(6,4) DEFAULT 0.05 NOT NULL,
    pct_departamento_conv numeric(6,4) DEFAULT 0.04 NOT NULL,
    pct_departamento_digital numeric(6,4) DEFAULT 0.04 NOT NULL,
    costo_minimo numeric(10,2) DEFAULT 150.00 NOT NULL,
    pct_iva numeric(6,4) DEFAULT 0.13 NOT NULL,
    cyrel_costo_cm2 numeric(12,6) DEFAULT 0 NOT NULL,
    cyrel_cantidad_minima_cm2 numeric(10,2) DEFAULT 0 NOT NULL,
    cyrel_rendimiento numeric(6,4) DEFAULT 0 NOT NULL,
    preprensa_costo_hora_conv numeric(10,4) DEFAULT 0 NOT NULL,
    preprensa_factor_min_tipo_conv numeric(10,4) DEFAULT 0 NOT NULL,
    preprensa_costo_hora_digital numeric(10,4) DEFAULT 0 NOT NULL,
    preprensa_factor_min_tipo_digital numeric(10,4) DEFAULT 0 NOT NULL,
    empaque_cantidad_x_minuto numeric(10,4) DEFAULT 0,
    empaque_minuto_hombre numeric(10,4) DEFAULT 0,
    empaque_tiempo_movilizacion numeric(10,4) DEFAULT 0,
    empaque_tiempo_confeccion numeric(10,4) DEFAULT 0,
    dias_habiles_nuevo integer DEFAULT 10 NOT NULL,
    dias_habiles_repeticion integer DEFAULT 8 NOT NULL,
    dias_habiles_pruebas integer DEFAULT 5 NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    preprensa_artes numeric(10,4) DEFAULT 0 NOT NULL,
    diseno_artes numeric(10,4) DEFAULT 0 NOT NULL,
    diseno_costo_hora numeric(10,4) DEFAULT 0 NOT NULL,
    tinta_bcm_generico numeric(10,4) DEFAULT 2 NOT NULL,
    tinta_cobertura_pct numeric(10,4) DEFAULT 30 NOT NULL,
    tinta_densidad numeric(10,4) DEFAULT 1.5 NOT NULL,
    tinta_costo_lb_cmyk numeric(12,4) DEFAULT 25 NOT NULL,
    tinta_costo_lb_blanco numeric(12,4) DEFAULT 30 NOT NULL,
    tinta_costo_lb_pantone numeric(12,4) DEFAULT 35 NOT NULL,
    rebobinado_tiempo_montaje numeric(10,4) DEFAULT 10 NOT NULL,
    rebobinado_waste_feet numeric(10,4) DEFAULT 30 NOT NULL,
    rebobinado_waste_pct numeric(10,4) DEFAULT 0.5 NOT NULL
);


--
-- Name: cotizacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotizacion (
    id character varying(20) NOT NULL,
    tenant_id uuid NOT NULL,
    socio_id uuid,
    vendedor_id uuid NOT NULL,
    cotizador_id uuid,
    tipo public.tipo_cotizacion DEFAULT 'regular'::public.tipo_cotizacion NOT NULL,
    estado public.estado_cotizacion DEFAULT 'borrador'::public.estado_cotizacion NOT NULL,
    contacto_nombre character varying(200),
    contacto_apellidos character varying(200),
    contacto_email character varying(255),
    contacto_telefono character varying(30),
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_vencimiento date,
    opcion_vencimiento character varying(20) DEFAULT '15 dias'::character varying,
    moneda public.moneda_codigo DEFAULT 'USD'::public.moneda_codigo NOT NULL,
    idioma public.idioma_codigo DEFAULT 'es'::public.idioma_codigo NOT NULL,
    cantidad_decimales smallint DEFAULT 2 NOT NULL,
    condicion_pago character varying(150),
    tiempo_entrega character varying(100),
    pct_adelanto numeric(6,4) DEFAULT 0,
    pie_pagina text,
    titulo_cotizacion character varying(300),
    version_costos_id uuid,
    enviada_check boolean DEFAULT false NOT NULL,
    enviada_timestamp timestamp with time zone,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    creado_por uuid
);


--
-- Name: cotizacion_secuencia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cotizacion_secuencia (
    tenant_id uuid NOT NULL,
    ultimo_id bigint DEFAULT 100000 NOT NULL
);


--
-- Name: credential_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credential_audit_log (
    id integer NOT NULL,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL,
    user_responsible text DEFAULT ''::text NOT NULL,
    user_affected text DEFAULT ''::text NOT NULL,
    ip_address text DEFAULT ''::text NOT NULL,
    hostname text DEFAULT ''::text NOT NULL,
    department text DEFAULT ''::text NOT NULL,
    action text NOT NULL,
    result text DEFAULT 'success'::text NOT NULL,
    observations text DEFAULT ''::text NOT NULL
);


--
-- Name: credential_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credential_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credential_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credential_audit_log_id_seq OWNED BY public.credential_audit_log.id;


--
-- Name: email_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_config (
    id integer DEFAULT 1 NOT NULL,
    host text DEFAULT ''::text NOT NULL,
    port integer DEFAULT 587 NOT NULL,
    secure boolean DEFAULT false NOT NULL,
    "user" text DEFAULT ''::text NOT NULL,
    password_enc text DEFAULT ''::text NOT NULL,
    from_name text DEFAULT ''::text NOT NULL,
    from_email text DEFAULT ''::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: email_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_log (
    id integer NOT NULL,
    recipient text NOT NULL,
    subject text DEFAULT ''::text NOT NULL,
    body_preview text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    smtp_response text,
    sent_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: email_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_log_id_seq OWNED BY public.email_log.id;


--
-- Name: exchange_rate_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rate_config (
    id integer NOT NULL,
    provider_name text DEFAULT 'fawaz-currency-api'::text NOT NULL,
    provider_url_template text DEFAULT 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/{base}.json'::text NOT NULL,
    base_currency text DEFAULT 'USD'::text NOT NULL,
    default_currency text DEFAULT 'CRC'::text NOT NULL,
    enabled_currencies jsonb DEFAULT '[]'::jsonb NOT NULL,
    auto_update_enabled boolean DEFAULT true NOT NULL,
    update_time text DEFAULT '00:00'::text NOT NULL,
    update_days jsonb DEFAULT '[]'::jsonb NOT NULL,
    timezone text DEFAULT 'America/Costa_Rica'::text NOT NULL,
    last_sync_status text DEFAULT 'idle'::text NOT NULL,
    last_sync_message text DEFAULT ''::text NOT NULL,
    last_sync_started_at timestamp with time zone,
    last_sync_finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_rate_current; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rate_current (
    base_currency text NOT NULL,
    currency_code text NOT NULL,
    rate_value numeric(18,8) NOT NULL,
    rate_date date NOT NULL,
    provider_name text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_rate_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rate_history (
    id bigint NOT NULL,
    batch_key text NOT NULL,
    base_currency text NOT NULL,
    currency_code text NOT NULL,
    rate_value numeric(18,8) NOT NULL,
    rate_date date NOT NULL,
    provider_name text DEFAULT ''::text NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_rate_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exchange_rate_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exchange_rate_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exchange_rate_history_id_seq OWNED BY public.exchange_rate_history.id;


--
-- Name: exchange_rate_update_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rate_update_log (
    id bigint NOT NULL,
    trigger_type text NOT NULL,
    actor text DEFAULT 'admin'::text NOT NULL,
    base_currency text NOT NULL,
    status text NOT NULL,
    rate_date date,
    currencies_count integer DEFAULT 0 NOT NULL,
    request_vars jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text DEFAULT ''::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone
);


--
-- Name: exchange_rate_update_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exchange_rate_update_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exchange_rate_update_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exchange_rate_update_log_id_seq OWNED BY public.exchange_rate_update_log.id;


--
-- Name: flexo_calculations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flexo_calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calculation_code text,
    quote_code text,
    line_code text,
    product_code text,
    customer_code text,
    process_type text,
    machine_name text,
    die_code text,
    material_code text,
    quantity numeric(14,4),
    subtotal_cost numeric(14,4),
    total_cost numeric(14,4),
    unit_price numeric(14,6),
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_name text,
    salesperson_name text,
    job_name text,
    department text DEFAULT 'Flexografia'::text,
    line_status text,
    width_inches numeric(12,4),
    length_inches numeric(12,4),
    labels_per_roll numeric(14,4),
    quantity_types numeric(14,4),
    quantity_changes numeric(14,4),
    core_width numeric(12,4),
    core_diameter text,
    cmyk_enabled boolean DEFAULT false,
    application_type text,
    surface_type text,
    output_type text,
    industrial_subtotal numeric(14,4),
    overhead_cost numeric(14,4),
    margin_amount numeric(14,4),
    prepress_cost numeric(14,4),
    packaging_cost numeric(14,4),
    design_cost numeric(14,4),
    additional_cost numeric(14,4),
    discount_amount numeric(14,4),
    tax_percent numeric(8,4),
    tax_amount numeric(14,4),
    ui_state jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    consumo_tinta_por_color_lb numeric(14,6),
    consumo_tinta_total_lb numeric(14,6),
    costo_tinta_por_libra numeric(14,6),
    material_tinta_id text,
    cobertura_tinta_pct numeric(8,4),
    bcm_anilox numeric(12,4),
    factor_transferencia numeric(8,6),
    densidad_tinta numeric(8,4),
    costo_libra_cmyk numeric(14,6),
    costo_libra_blanco numeric(14,6),
    costo_libra_pantone numeric(14,6),
    subtotal_tinta numeric(14,6),
    merma_arranque_pies numeric(14,4),
    merma_tiraje_pies numeric(14,4),
    merma_tiraje_pct numeric(8,4),
    costo_merma numeric(14,6),
    costo_sustrato numeric(14,6),
    pies_totales_sustrato numeric(14,4),
    pies_sustrato_neto numeric(14,4),
    velocidad_maquina_m_min numeric(12,4),
    tiempo_setup_min numeric(12,4),
    tiempo_montaje_min numeric(12,4),
    tiempo_limpieza_min numeric(12,4),
    costo_hora_maquina numeric(14,6),
    costo_hora_operador numeric(14,6),
    subtotal_maquina numeric(14,6),
    subtotal_operador numeric(14,6),
    tiempo_corrida_min numeric(12,4),
    tiempo_total_impresion_min numeric(12,4),
    barniz_material_id text,
    barniz_bcm numeric(12,4),
    barniz_cobertura_pct numeric(8,4),
    barniz_costo_por_kg numeric(14,6),
    barniz_zonificado boolean DEFAULT false,
    barniz_comentario text,
    barniz_costo_total numeric(14,6),
    barniz_consumo_kg numeric(14,6),
    barniz_consumo_lb numeric(14,6),
    barniz_tiempo_montaje_min numeric(12,4),
    laminado_material_id text,
    laminado_costo_por_pie_lineal numeric(14,6),
    laminado_tiempo_montaje_min numeric(12,4),
    laminado_comentario text,
    laminado_costo_total numeric(14,6),
    embosado_tiempo_montaje_min numeric(12,4),
    embosado_ancho_cliche numeric(12,4),
    embosado_largo_cliche numeric(12,4),
    embosado_costo_cliche numeric(14,6),
    embosado_comentario text,
    troquelado_tiempo_montaje_min numeric(12,4),
    troquelado_merma_ajuste_pies numeric(14,4),
    troquelado_comentario text,
    numerado_tipo text,
    numerado_tiempo_montaje_min numeric(12,4),
    numerado_costo_fijo numeric(14,6),
    numerado_comentario text,
    numerado_adjunto text,
    rebobinado_maquina text,
    rebobinado_tiempo_montaje_min numeric(12,4),
    rebobinado_costo_hora_maquina numeric(14,6),
    rebobinado_costo_operador numeric(14,6),
    rebobinado_velocidad numeric(12,4),
    rebobinado_merma_ajuste_pies numeric(14,4),
    rebobinado_merma_operacion_pct numeric(8,4),
    rebobinado_comentario text,
    rebobinado_tiempo_total_min numeric(12,4),
    rebobinado_costo_total numeric(14,6),
    empaque_cantidad_rollos numeric(14,4),
    empaque_rendimiento_por_hora numeric(14,4),
    empaque_operarios numeric(8,4),
    empaque_costo_por_operador numeric(14,6),
    empaque_costo_externo numeric(14,6),
    empaque_comentario text,
    empaque_adjunto text,
    empaque_horas numeric(12,4),
    empaque_costo_total numeric(14,6),
    merma_total_pies numeric(14,4),
    merma_total_costo numeric(14,6),
    subtotal_financiero numeric(14,6),
    subtotal_rendimiento numeric(14,6),
    precio_millar numeric(14,6),
    total_colones numeric(14,6),
    tipo_cambio_venta numeric(14,6),
    tipo_cambio_compra numeric(14,6),
    costo_minimo numeric(14,6),
    porcentaje_imprevistos numeric(8,4),
    porcentaje_financiero numeric(8,4),
    porcentaje_iva numeric(8,4),
    porcentaje_adicional numeric(8,4),
    tiempo_diseno_horas numeric(12,4),
    tiempo_preprensa_horas numeric(12,4),
    tiempo_acabados_min numeric(12,4),
    tiempo_total_min numeric(12,4),
    material_m2 numeric(14,4),
    material_msi numeric(14,4),
    material_pies_macula numeric(14,4),
    material_ancho numeric(12,4),
    cantidad_tintas numeric(8,4),
    cantidad_pantones numeric(8,4),
    tinta_blanca boolean DEFAULT false,
    doble_blanca boolean DEFAULT false,
    analisis_solicitud text,
    analisis_finalizar text,
    analisis_crear_orden text,
    resumen_cotizacion text,
    info_impresion text,
    observaciones text,
    estado_creacion text,
    condicion_pago text,
    tiempo_entrega text,
    moneda text,
    metodo_envio text,
    tipo_orden text,
    laminado_pies_lineales numeric(14,4),
    barniz_tipo text,
    laminado_tipo text,
    estampado_tipo text,
    embosado_tipo text,
    troquel_forma text,
    ruta_calculada text,
    montaje_resumen text,
    sin_impresion boolean DEFAULT false,
    medida_fija text,
    material_nombre text,
    fecha_vencimiento date,
    seleccion_automatica jsonb,
    precio_automatico jsonb,
    line_order integer
);


--
-- Name: flexo_cost_profiles_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flexo_cost_profiles_old (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT flexo_cost_profiles_id_not_null NOT NULL,
    profile_name text DEFAULT 'default'::text CONSTRAINT flexo_cost_profiles_profile_name_not_null NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb CONSTRAINT flexo_cost_profiles_raw_data_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT flexo_cost_profiles_created_at_not_null NOT NULL
);


--
-- Name: flexo_dies_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flexo_dies_old (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT flexo_dies_id_not_null NOT NULL,
    die_code text,
    description text,
    category text,
    dimensions text,
    teeth numeric(12,4),
    rows_count numeric(12,4),
    repetitions numeric(12,4),
    material_width numeric(12,4),
    status text,
    use_digital boolean,
    use_conventional boolean,
    raw_data jsonb DEFAULT '{}'::jsonb CONSTRAINT flexo_dies_raw_data_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT flexo_dies_created_at_not_null NOT NULL
);


--
-- Name: flexo_machines_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flexo_machines_old (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT flexo_machines_id_not_null NOT NULL,
    machine_key text,
    machine_name text,
    brand text,
    model text,
    process text,
    subprocess text,
    category text,
    work_unit text,
    setup_base_minutes numeric(12,4),
    setup_per_station_minutes numeric(12,4),
    setup_extra_minutes numeric(12,4),
    production_speed numeric(12,4),
    hourly_machine_cost numeric(12,4),
    hourly_operator_cost numeric(12,4),
    raw_data jsonb DEFAULT '{}'::jsonb CONSTRAINT flexo_machines_raw_data_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT flexo_machines_created_at_not_null NOT NULL
);


--
-- Name: flexo_materials_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flexo_materials_old (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT flexo_materials_id_not_null NOT NULL,
    material_code text,
    material_name text,
    display_name text,
    presentation_type text,
    provider text,
    width_inches numeric(12,4),
    length_value numeric(12,4),
    cost_per_kg_usd numeric(12,4),
    cost_per_linear_meter_usd numeric(12,4),
    cost_per_unit_usd numeric(12,4),
    active boolean,
    digital_enabled boolean,
    conventional_enabled boolean,
    raw_data jsonb DEFAULT '{}'::jsonb CONSTRAINT flexo_materials_raw_data_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT flexo_materials_created_at_not_null NOT NULL
);


--
-- Name: flexo_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flexo_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_code text,
    quote_code text,
    line_code text,
    product_code text,
    machine_name text,
    material_code text,
    die_code text,
    ordered_quantity numeric(14,4),
    delivered_on date,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    consumo_tinta_por_color_lb numeric(14,6),
    consumo_tinta_total_lb numeric(14,6),
    costo_tinta_por_libra numeric(14,6),
    material_tinta_id text,
    cobertura_tinta_pct numeric(8,4),
    bcm_anilox numeric(12,4),
    factor_transferencia numeric(8,6),
    densidad_tinta numeric(8,4),
    costo_libra_cmyk numeric(14,6),
    costo_libra_blanco numeric(14,6),
    costo_libra_pantone numeric(14,6),
    subtotal_tinta numeric(14,6),
    merma_arranque_pies numeric(14,4),
    merma_tiraje_pies numeric(14,4),
    merma_tiraje_pct numeric(8,4),
    costo_merma numeric(14,6),
    costo_sustrato numeric(14,6),
    pies_totales_sustrato numeric(14,4),
    pies_sustrato_neto numeric(14,4),
    velocidad_maquina_m_min numeric(12,4),
    tiempo_setup_min numeric(12,4),
    tiempo_montaje_min numeric(12,4),
    tiempo_limpieza_min numeric(12,4),
    costo_hora_maquina numeric(14,6),
    costo_hora_operador numeric(14,6),
    subtotal_maquina numeric(14,6),
    subtotal_operador numeric(14,6),
    tiempo_corrida_min numeric(12,4),
    tiempo_total_impresion_min numeric(12,4),
    barniz_material_id text,
    barniz_bcm numeric(12,4),
    barniz_cobertura_pct numeric(8,4),
    barniz_costo_por_kg numeric(14,6),
    barniz_zonificado boolean DEFAULT false,
    barniz_comentario text,
    barniz_costo_total numeric(14,6),
    barniz_consumo_kg numeric(14,6),
    barniz_consumo_lb numeric(14,6),
    barniz_tiempo_montaje_min numeric(12,4),
    laminado_material_id text,
    laminado_costo_por_pie_lineal numeric(14,6),
    laminado_tiempo_montaje_min numeric(12,4),
    laminado_comentario text,
    laminado_costo_total numeric(14,6),
    embosado_tiempo_montaje_min numeric(12,4),
    embosado_ancho_cliche numeric(12,4),
    embosado_largo_cliche numeric(12,4),
    embosado_costo_cliche numeric(14,6),
    embosado_comentario text,
    troquelado_tiempo_montaje_min numeric(12,4),
    troquelado_merma_ajuste_pies numeric(14,4),
    troquelado_comentario text,
    numerado_tipo text,
    numerado_tiempo_montaje_min numeric(12,4),
    numerado_costo_fijo numeric(14,6),
    numerado_comentario text,
    numerado_adjunto text,
    rebobinado_maquina text,
    rebobinado_tiempo_montaje_min numeric(12,4),
    rebobinado_costo_hora_maquina numeric(14,6),
    rebobinado_costo_operador numeric(14,6),
    rebobinado_velocidad numeric(12,4),
    rebobinado_merma_ajuste_pies numeric(14,4),
    rebobinado_merma_operacion_pct numeric(8,4),
    rebobinado_comentario text,
    rebobinado_tiempo_total_min numeric(12,4),
    rebobinado_costo_total numeric(14,6),
    empaque_cantidad_rollos numeric(14,4),
    empaque_rendimiento_por_hora numeric(14,4),
    empaque_operarios numeric(8,4),
    empaque_costo_por_operador numeric(14,6),
    empaque_costo_externo numeric(14,6),
    empaque_comentario text,
    empaque_adjunto text,
    empaque_horas numeric(12,4),
    empaque_costo_total numeric(14,6),
    merma_total_pies numeric(14,4),
    merma_total_costo numeric(14,6),
    width_inches numeric(12,4),
    length_inches numeric(12,4),
    labels_per_roll numeric(14,4),
    quantity_types numeric(14,4),
    quantity_changes numeric(14,4),
    core_width numeric(12,4),
    core_diameter text,
    cmyk_enabled boolean DEFAULT false,
    application_type text,
    output_type text,
    die_teeth numeric(12,4),
    die_rows numeric(12,4),
    die_repeats numeric(12,4),
    customer_name text,
    salesperson_name text,
    job_name text,
    process_type text,
    line_status text,
    subtotal_cost numeric(14,4),
    total_cost numeric(14,4),
    unit_price numeric(14,6),
    material_feet numeric(14,4),
    material_msi numeric(14,4),
    material_m2 numeric(14,4),
    subtotal_financiero numeric(14,6),
    subtotal_rendimiento numeric(14,6),
    precio_millar numeric(14,6),
    total_colones numeric(14,6),
    tipo_cambio_venta numeric(14,6),
    tipo_cambio_compra numeric(14,6),
    costo_minimo numeric(14,6),
    porcentaje_imprevistos numeric(8,4),
    porcentaje_financiero numeric(8,4),
    porcentaje_iva numeric(8,4),
    porcentaje_adicional numeric(8,4),
    tiempo_diseno_horas numeric(12,4),
    tiempo_preprensa_horas numeric(12,4),
    tiempo_acabados_min numeric(12,4),
    tiempo_total_min numeric(12,4),
    material_pies_macula numeric(14,4),
    material_ancho numeric(12,4),
    cantidad_tintas numeric(8,4),
    cantidad_pantones numeric(8,4),
    tinta_blanca boolean DEFAULT false,
    doble_blanca boolean DEFAULT false,
    analisis_solicitud text,
    analisis_finalizar text,
    analisis_crear_orden text,
    resumen_cotizacion text,
    info_impresion text,
    observaciones text,
    estado_creacion text,
    condicion_pago text,
    tiempo_entrega text,
    moneda text,
    metodo_envio text,
    tipo_orden text,
    laminado_pies_lineales numeric(14,4),
    barniz_tipo text,
    laminado_tipo text,
    estampado_tipo text,
    embosado_tipo text,
    troquel_forma text,
    ruta_calculada text,
    montaje_resumen text,
    sin_impresion boolean DEFAULT false,
    medida_fija text,
    material_nombre text,
    fecha_vencimiento date,
    seleccion_automatica jsonb,
    precio_automatico jsonb,
    order_status character varying(100),
    contact_name character varying(300),
    phone character varying(100),
    email character varying(300)
);


--
-- Name: flexo_product_quote_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flexo_product_quote_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_code text NOT NULL,
    quote_code text NOT NULL,
    line_code text,
    action text DEFAULT 'quote'::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flexo_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flexo_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_code text,
    line_code text,
    quote_code text,
    client_code text,
    client_name text,
    product_name text,
    product_type text,
    department text,
    material_name text,
    quoted_machine text,
    die_code text,
    quantity_products numeric(14,4),
    quantity_types numeric(14,4),
    tint_count numeric(14,4),
    width_inches numeric(12,4),
    length_inches numeric(12,4),
    price_unit numeric(14,4),
    total_price numeric(14,4),
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source_calculation_code text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: import_audit_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_audit_old (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT import_audit_id_not_null NOT NULL,
    source_name text CONSTRAINT import_audit_source_name_not_null NOT NULL,
    source_path text CONSTRAINT import_audit_source_path_not_null NOT NULL,
    records_imported integer DEFAULT 0 CONSTRAINT import_audit_records_imported_not_null NOT NULL,
    imported_at timestamp with time zone DEFAULT now() CONSTRAINT import_audit_imported_at_not_null NOT NULL,
    notes text
);


--
-- Name: inventory_classification_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_classification_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_value text NOT NULL,
    flexo_category text DEFAULT ''::text NOT NULL,
    display_label text DEFAULT ''::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: maquina; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maquina (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    nombre character varying(100) NOT NULL,
    tipo public.proceso_productivo NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    minuto_hombre numeric(10,4) DEFAULT 0 NOT NULL,
    factor_tiraje numeric(10,4) DEFAULT 1 NOT NULL,
    factor_montaje_estacion numeric(10,4) DEFAULT 0 NOT NULL,
    factor_preparacion numeric(10,4) DEFAULT 10 NOT NULL,
    macula_default_pies integer DEFAULT 100 NOT NULL,
    factor_tiraje_digital numeric(10,4),
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    observaciones text,
    comentario_setup text,
    comentario_montaje text,
    marca character varying(120),
    modelo character varying(120),
    unidad_velocidad_produccion character varying(20) DEFAULT 'ft/min'::character varying,
    digital_tipo_cobro character varying(20) DEFAULT 'consumo'::character varying,
    digital_costo_kg_tinta numeric(12,6) DEFAULT 0,
    digital_tarifa_click numeric(12,6) DEFAULT 0,
    digital_modo_click character varying(20) DEFAULT 'por_estacion'::character varying,
    digital_velocidad_cmyk_mpm numeric(12,4) DEFAULT 0,
    digital_velocidad_extendida_mpm numeric(12,4) DEFAULT 0,
    digital_gramaje_cmyk_g_m2 numeric(12,6) DEFAULT 1.5,
    digital_gramaje_blanco_g_m2 numeric(12,6) DEFAULT 4,
    digital_factor_merma numeric(12,6) DEFAULT 1.1,
    digital_costo_lavado_especial numeric(12,6) DEFAULT 0,
    digital_premier_modo character varying(20) DEFAULT 'offline'::character varying,
    digital_premier_setup_min numeric(12,4) DEFAULT 20,
    digital_premier_costo_mantenimiento numeric(12,6) DEFAULT 0,
    digital_premier_costo_offline_m numeric(12,6) DEFAULT 0,
    digital_costo_kg_tinta_blanco numeric(12,6) DEFAULT 0,
    digital_costo_kg_tinta_especial numeric(12,6) DEFAULT 0,
    sustrato_consumo_unidad character varying(20) DEFAULT 'pies'::character varying,
    sustrato_setup_merma_cantidad numeric(12,4) DEFAULT 0,
    sustrato_setup_merma_unidad character varying(20) DEFAULT 'pies'::character varying,
    sustrato_setup_merma_base character varying(20) DEFAULT 'trabajo'::character varying,
    especificaciones jsonb DEFAULT '{}'::jsonb,
    sustrato_montaje_merma_cantidad numeric(12,4) DEFAULT 0,
    sustrato_montaje_merma_unidad character varying(20) DEFAULT 'pies'::character varying,
    sustrato_montaje_merma_base character varying(20) DEFAULT 'trabajo'::character varying
);


--
-- Name: maquina_capacidad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maquina_capacidad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    maquina_id uuid NOT NULL,
    clasificacion character varying(50) NOT NULL,
    proceso character varying(100) NOT NULL,
    subproceso character varying(100),
    unidad_trabajo character varying(50),
    tiempo_preparacion_general numeric(10,4) DEFAULT 0,
    tiempo_adicional_preparacion numeric(10,4) DEFAULT 0,
    tiempo_por_estacion numeric(10,4) DEFAULT 0,
    factor_proceso_por_area numeric(10,4) DEFAULT 0,
    velocidad_produccion numeric(10,4) DEFAULT 0,
    costo_hora_maquina numeric(12,4) DEFAULT 0,
    costo_hora_operario numeric(12,4) DEFAULT 0,
    formula_tiempo text,
    formula_costo text,
    activa boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    ancho_max_in numeric(10,4)
);


--
-- Name: material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    ancho_mm numeric(10,3) NOT NULL,
    gramaje_g_m2 numeric(10,3),
    calibre_micras numeric(10,3),
    costo_x_msi numeric(12,6) DEFAULT 0,
    costo_x_m2 numeric(12,6) DEFAULT 0,
    costo_x_kg numeric(12,6) DEFAULT 0,
    compatible_convencional boolean DEFAULT true NOT NULL,
    compatible_digital boolean DEFAULT true NOT NULL,
    tipo_proforma character varying(100),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    costo_x_libra numeric(12,6),
    peso_capa_gsm numeric(10,4),
    largo_mm numeric(12,4),
    costo_x_lamina numeric(12,6),
    comentario_ancho_mm text,
    comentario_largo_mm text,
    comentario_gramaje_g_m2 text,
    comentario_calibre_micras text,
    comentario_costo_x_lamina text,
    comentario_costo_x_msi text,
    comentario_costo_x_m2 text,
    comentario_costo_x_kg text,
    comentario_costo_x_libra text,
    comentario_peso_capa_gsm text,
    comentario_compatible_convencional text,
    comentario_compatible_digital text,
    comentario_tipo_proforma text,
    familia_proceso character varying(60),
    costo_x_unidad numeric(12,6),
    merma_pct numeric(10,4),
    rendimiento_g_ft2 numeric(12,6),
    temperatura_aplicacion_c numeric(10,4),
    tipo_transferencia character varying(120),
    comentario_rendimiento_g_ft2 text,
    tipo_superficie character varying(40),
    requiere_premier boolean DEFAULT false,
    premier_preaplicado boolean DEFAULT false,
    premier_consumo_g_m2 numeric(12,6) DEFAULT 0.65,
    premier_costo_x_kg numeric(12,6) DEFAULT 0,
    premier_costo_x_m2 numeric(12,6) DEFAULT 0,
    clasificacion character varying(60),
    costo_x_pie numeric(12,6) DEFAULT 0,
    costo_x_metro numeric(12,6) DEFAULT 0
);


--
-- Name: notification_alert_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_alert_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    phone text DEFAULT ''::text NOT NULL,
    severity_low boolean DEFAULT false NOT NULL,
    severity_medium boolean DEFAULT false NOT NULL,
    severity_high boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_center_message_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_center_message_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    attachment_kind text DEFAULT 'archivo'::text CONSTRAINT notification_center_message_attachment_attachment_kind_not_null NOT NULL,
    file_name text NOT NULL,
    mime_type text DEFAULT 'application/octet-stream'::text NOT NULL,
    file_ext text DEFAULT ''::text NOT NULL,
    content_base64 text DEFAULT ''::text NOT NULL,
    size_bytes bigint DEFAULT 0 NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    uploaded_by text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    storage_path text DEFAULT ''::text NOT NULL,
    content_sha256 text DEFAULT ''::text NOT NULL,
    preview_base64 text DEFAULT ''::text NOT NULL
);


--
-- Name: notification_center_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_center_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_code text NOT NULL,
    thread_id uuid NOT NULL,
    message_type text DEFAULT 'texto'::text NOT NULL,
    channel_key text DEFAULT 'interno'::text NOT NULL,
    body_text text DEFAULT ''::text NOT NULL,
    sender_user_id bigint,
    sender_name text DEFAULT ''::text NOT NULL,
    sender_email text DEFAULT ''::text NOT NULL,
    sender_whatsapp text DEFAULT ''::text NOT NULL,
    sender_sms text DEFAULT ''::text NOT NULL,
    recipient_user_id bigint,
    recipient_name text DEFAULT ''::text NOT NULL,
    recipient_email text DEFAULT ''::text NOT NULL,
    recipient_whatsapp text DEFAULT ''::text NOT NULL,
    recipient_sms text DEFAULT ''::text NOT NULL,
    is_inbound boolean DEFAULT false NOT NULL,
    external_status text DEFAULT 'pendiente'::text NOT NULL,
    delivered_at timestamp with time zone,
    received_at timestamp with time zone,
    read_at timestamp with time zone,
    failed_at timestamp with time zone,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: notification_center_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_center_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    user_id bigint,
    role_key text DEFAULT 'participante'::text NOT NULL,
    display_name text DEFAULT ''::text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    whatsapp_phone text DEFAULT ''::text NOT NULL,
    sms_phone text DEFAULT ''::text NOT NULL,
    can_manage boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_center_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_center_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_code text NOT NULL,
    conversation_type text DEFAULT 'quote-line'::text NOT NULL,
    source_module text DEFAULT 'cotizaciones'::text NOT NULL,
    document_type text DEFAULT 'cotizacion'::text NOT NULL,
    document_code text DEFAULT ''::text NOT NULL,
    quote_code text DEFAULT ''::text NOT NULL,
    line_code text DEFAULT ''::text NOT NULL,
    customer_name text DEFAULT ''::text NOT NULL,
    product_name text DEFAULT ''::text NOT NULL,
    product_summary text DEFAULT ''::text NOT NULL,
    seller_user_id bigint,
    seller_name text DEFAULT ''::text NOT NULL,
    seller_email text DEFAULT ''::text NOT NULL,
    seller_whatsapp text DEFAULT ''::text NOT NULL,
    seller_sms text DEFAULT ''::text NOT NULL,
    created_by_user_id bigint,
    created_by_name text DEFAULT ''::text NOT NULL,
    target_user_id bigint,
    target_user_name text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'abierta'::text NOT NULL,
    last_message_at timestamp with time zone,
    snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_channel_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_channel_keys (
    channel_key text NOT NULL,
    display_name text DEFAULT ''::text NOT NULL,
    provider_name text DEFAULT ''::text NOT NULL,
    api_url text DEFAULT ''::text NOT NULL,
    account_identifier text DEFAULT ''::text NOT NULL,
    access_key text DEFAULT ''::text NOT NULL,
    access_secret text DEFAULT ''::text NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    is_test_mode boolean DEFAULT true NOT NULL,
    advanced_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    last_validated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plancha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plancha (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    codigo character varying(60) NOT NULL,
    descripcion text,
    cliente character varying(200),
    producto character varying(200),
    trabajo character varying(200),
    orden character varying(80),
    cotizacion character varying(80),
    tipo character varying(80),
    marca character varying(120),
    modelo character varying(120),
    proveedor character varying(200),
    ancho_mm numeric(10,2) DEFAULT 0 NOT NULL,
    alto_mm numeric(10,2) DEFAULT 0 NOT NULL,
    espesor_mm numeric(10,4) DEFAULT 0 NOT NULL,
    espesor_in character varying(20),
    costo numeric(12,4) DEFAULT 0 NOT NULL,
    estado character varying(40) DEFAULT 'Disponible'::character varying NOT NULL,
    usos integer DEFAULT 0 NOT NULL,
    vida_util integer DEFAULT 40 NOT NULL,
    ubicacion character varying(120),
    responsable character varying(120),
    fecha_creacion date,
    fecha_ultimo_uso character varying(20) DEFAULT 'ÔÇö'::character varying,
    troquel_ref character varying(200),
    notas text,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proceso_catalogo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proceso_catalogo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    codigo character varying(60),
    nombre character varying(160) NOT NULL,
    descripcion character varying(250),
    categoria character varying(40) DEFAULT 'soporte'::character varying NOT NULL,
    subcategoria character varying(80),
    machine_id uuid,
    proceso_productivo character varying(40),
    modo_recurso character varying(20) DEFAULT 'mixto'::character varying NOT NULL,
    es_inline boolean DEFAULT false NOT NULL,
    comparte_tiempo_linea boolean DEFAULT false NOT NULL,
    comparte_operario boolean DEFAULT false NOT NULL,
    requiere_troquel boolean DEFAULT false NOT NULL,
    cantidad_personas numeric(10,4) DEFAULT 1 NOT NULL,
    tiempo_preparacion_general numeric(12,4) DEFAULT 0 NOT NULL,
    tiempo_por_estacion numeric(12,4) DEFAULT 0 NOT NULL,
    tiempo_fijo_min numeric(12,4) DEFAULT 0 NOT NULL,
    velocidad_produccion numeric(12,4) DEFAULT 0 NOT NULL,
    unidad_trabajo character varying(40) DEFAULT 'pies'::character varying,
    costo_hora_maquina numeric(12,4) DEFAULT 0 NOT NULL,
    costo_hora_operario numeric(12,4) DEFAULT 0 NOT NULL,
    costo_fijo numeric(12,4) DEFAULT 0 NOT NULL,
    costo_x_msi numeric(12,6) DEFAULT 0 NOT NULL,
    costo_x_kg numeric(12,6) DEFAULT 0 NOT NULL,
    costo_x_pie numeric(12,6) DEFAULT 0 NOT NULL,
    costo_x_millar numeric(12,6) DEFAULT 0 NOT NULL,
    formula_tiempo text,
    formula_costo text,
    orden_base integer DEFAULT 100 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_capacity_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_capacity_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scenario_name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    adjustments jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_capacity_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_capacity_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_type text DEFAULT 'automatic'::text NOT NULL,
    scenario_id uuid,
    from_date date NOT NULL,
    to_date date NOT NULL,
    input_hash text DEFAULT ''::text NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    result_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_machine_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_machine_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    machine_id uuid,
    machine_capacity_id uuid,
    machine_name text NOT NULL,
    brand text,
    model text,
    process_key text NOT NULL,
    process_name text NOT NULL,
    nominal_speed_fpm numeric(12,4) DEFAULT 0 NOT NULL,
    setup_minutes numeric(12,4) DEFAULT 0 NOT NULL,
    setup_per_station_minutes numeric(12,4) DEFAULT 0 NOT NULL,
    hourly_machine_cost numeric(12,4) DEFAULT 0 NOT NULL,
    hourly_operator_cost numeric(12,4) DEFAULT 0 NOT NULL,
    oee_target numeric(8,4) DEFAULT 0.85 NOT NULL,
    max_web_width_in numeric(12,4),
    min_web_width_in numeric(12,4),
    supports_die_cut boolean DEFAULT false NOT NULL,
    supports_varnish_uv boolean DEFAULT false NOT NULL,
    supports_lamination boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    source_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_material_consumption_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_material_consumption_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_code text NOT NULL,
    quote_code text,
    line_code text,
    route_id uuid,
    process_key text DEFAULT ''::text NOT NULL,
    sap_item_code text DEFAULT ''::text NOT NULL,
    material_name text DEFAULT ''::text NOT NULL,
    material_family text DEFAULT ''::text CONSTRAINT production_material_consumption_reques_material_family_not_null NOT NULL,
    quantity numeric(14,4) DEFAULT 0 NOT NULL,
    unit_code text DEFAULT ''::text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    sap_status text DEFAULT 'PENDIENTE'::text NOT NULL,
    sap_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    sap_response jsonb DEFAULT '{}'::jsonb NOT NULL,
    requested_by text DEFAULT ''::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_material_request_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_material_request_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    line_number integer DEFAULT 1 NOT NULL,
    local_kind text DEFAULT 'materiales'::text NOT NULL,
    local_id text DEFAULT ''::text NOT NULL,
    local_code text DEFAULT ''::text NOT NULL,
    local_name text DEFAULT ''::text NOT NULL,
    sap_item_code text DEFAULT ''::text NOT NULL,
    sap_item_name text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    required_qty numeric DEFAULT 0 NOT NULL,
    issued_qty numeric DEFAULT 0 NOT NULL,
    uom text DEFAULT ''::text NOT NULL,
    warehouse_code text DEFAULT ''::text NOT NULL,
    line_status text DEFAULT 'pendiente'::text NOT NULL,
    source_type text DEFAULT 'material_principal'::text NOT NULL,
    source_ref text DEFAULT ''::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_material_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_material_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_code text NOT NULL,
    order_code text,
    quote_code text DEFAULT ''::text NOT NULL,
    line_code text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'pendiente_revision'::text NOT NULL,
    source_context text DEFAULT 'produccion'::text NOT NULL,
    requested_by text DEFAULT 'sistema'::text NOT NULL,
    approved_by text DEFAULT ''::text NOT NULL,
    sent_to_sap_at timestamp with time zone,
    approved_at timestamp with time zone,
    last_error text DEFAULT ''::text NOT NULL,
    sap_doc_entry text DEFAULT ''::text NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_order_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_order_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_code text NOT NULL,
    quote_code text,
    line_code text,
    sequence_order integer DEFAULT 1 NOT NULL,
    process_key text NOT NULL,
    process_name text NOT NULL,
    machine_profile_id uuid,
    planned_start_at timestamp with time zone,
    planned_end_at timestamp with time zone,
    start_turn_hour numeric(8,4),
    duration_hours numeric(8,4),
    actual_start_at timestamp with time zone,
    actual_end_at timestamp with time zone,
    dependency_route_id uuid,
    transition_cost_min integer DEFAULT 0 NOT NULL,
    route_status text DEFAULT 'PENDIENTE'::text NOT NULL,
    source_mode text DEFAULT 'auto'::text NOT NULL,
    route_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_process_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_process_definitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    process_key text NOT NULL,
    process_name text NOT NULL,
    sequence_order integer DEFAULT 1 NOT NULL,
    color_hex text DEFAULT '#378ADD'::text NOT NULL,
    icon_key text,
    is_parallel boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    source_context text DEFAULT 'erp'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_resource_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_resource_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_id uuid NOT NULL,
    process_key text NOT NULL,
    proficiency numeric(8,4) DEFAULT 1 NOT NULL,
    max_parallel_jobs integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_resources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_code text NOT NULL,
    resource_name text NOT NULL,
    resource_type text DEFAULT 'process'::text NOT NULL,
    process_key text DEFAULT ''::text NOT NULL,
    machine_profile_id uuid,
    calendar_id uuid,
    capacity_units numeric(8,2) DEFAULT 1 NOT NULL,
    efficiency_factor numeric(8,4) DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    source_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_route_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_route_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_id uuid NOT NULL,
    operator_name text,
    event_type text NOT NULL,
    stop_reason_id uuid,
    notes text,
    event_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_stop_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_stop_reasons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reason_group text NOT NULL,
    reason_code text NOT NULL,
    description text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: production_waste_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_waste_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    route_id uuid NOT NULL,
    feet_consumed numeric(14,4) DEFAULT 0,
    setup_waste_feet numeric(14,4) DEFAULT 0,
    run_waste_feet numeric(14,4) DEFAULT 0,
    useful_feet numeric(14,4) GENERATED ALWAYS AS (((COALESCE(feet_consumed, (0)::numeric) - COALESCE(setup_waste_feet, (0)::numeric)) - COALESCE(run_waste_feet, (0)::numeric))) STORED,
    final_speed_fpm numeric(12,4),
    anilox_line text,
    cylinder_pressure text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_line_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_line_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_code text NOT NULL,
    line_code text NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    file_ext text,
    content_base64 text,
    notes text,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    storage_path text,
    size_bytes bigint,
    content_sha256 text
);


--
-- Name: quote_line_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_line_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_code text NOT NULL,
    line_code text NOT NULL,
    seller_name text,
    customer_name text,
    job_name text,
    issue_text text NOT NULL,
    target_user text,
    created_by text,
    snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_lines_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_lines_old (
    id uuid DEFAULT gen_random_uuid() CONSTRAINT quote_lines_id_not_null NOT NULL,
    quote_code text,
    line_code text,
    department text,
    job_name text,
    material_name text,
    status text,
    subtotal_1 numeric(14,4),
    subtotal_2 numeric(14,4),
    subtotal_3 numeric(14,4),
    subtotal_4 numeric(14,4),
    hidden_flag boolean,
    optional_flag boolean,
    proof_flag boolean,
    raw_data jsonb DEFAULT '{}'::jsonb CONSTRAINT quote_lines_raw_data_not_null NOT NULL,
    created_at timestamp with time zone DEFAULT now() CONSTRAINT quote_lines_created_at_not_null NOT NULL
);


--
-- Name: quote_proformas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_proformas (
    id bigint NOT NULL,
    quote_code text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    issue_date_fixed timestamp with time zone,
    closed_at timestamp with time zone,
    closed_reason text DEFAULT ''::text NOT NULL,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_proformas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_proformas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_proformas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_proformas_id_seq OWNED BY public.quote_proformas.id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_code text,
    customer_code text,
    customer_name text,
    contact_name text,
    email text,
    salesperson_name text,
    phone text,
    status text,
    created_on date,
    due_on date,
    raw_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resource_calendar_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_calendar_exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_id uuid NOT NULL,
    exception_date date NOT NULL,
    exception_type text DEFAULT 'closure'::text NOT NULL,
    description text,
    override_start_hour numeric(5,2),
    override_end_hour numeric(5,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resource_calendars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_calendars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_name text NOT NULL,
    description text,
    resource_type text DEFAULT 'machine'::text NOT NULL,
    resource_id uuid,
    resource_name text NOT NULL,
    timezone text DEFAULT 'America/Costa_Rica'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resource_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_id uuid NOT NULL,
    shift_name text NOT NULL,
    day_of_week integer NOT NULL,
    start_hour numeric(5,2) NOT NULL,
    end_hour numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT resource_shifts_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT resource_shifts_end_hour_check CHECK (((end_hour > (0)::numeric) AND (end_hour <= (24)::numeric))),
    CONSTRAINT resource_shifts_start_hour_check CHECK (((start_hour >= (0)::numeric) AND (start_hour < (24)::numeric)))
);


--
-- Name: sap_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_activity_log (
    id bigint NOT NULL,
    action_type text NOT NULL,
    entity_name text DEFAULT ''::text NOT NULL,
    module_name text DEFAULT 'sap'::text NOT NULL,
    actor text DEFAULT 'admin'::text NOT NULL,
    mode text DEFAULT ''::text NOT NULL,
    status text DEFAULT ''::text NOT NULL,
    internal_method text DEFAULT 'GET'::text NOT NULL,
    internal_url text DEFAULT ''::text NOT NULL,
    service_method text DEFAULT 'GET'::text NOT NULL,
    service_url text DEFAULT ''::text NOT NULL,
    request_vars jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text DEFAULT ''::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sap_activity_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sap_activity_log_id_seq OWNED BY public.sap_activity_log.id;


--
-- Name: sap_business_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_business_partners (
    card_code text NOT NULL,
    card_name text DEFAULT ''::text NOT NULL,
    card_type text DEFAULT ''::text NOT NULL,
    balance numeric,
    currency text DEFAULT ''::text NOT NULL,
    phone1 text DEFAULT ''::text NOT NULL,
    email text DEFAULT ''::text NOT NULL,
    contact_person text DEFAULT ''::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_integration_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_integration_config (
    id smallint DEFAULT 1 NOT NULL,
    mode text DEFAULT 'demo'::text NOT NULL,
    sap_host text DEFAULT ''::text NOT NULL,
    sap_port integer DEFAULT 50000 NOT NULL,
    sap_protocol text DEFAULT 'https'::text NOT NULL,
    sap_user text DEFAULT 'manager'::text NOT NULL,
    sap_password text DEFAULT ''::text NOT NULL,
    sap_company text DEFAULT 'SBO_DEMO'::text NOT NULL,
    auto_sync_enabled boolean DEFAULT false NOT NULL,
    sync_interval_minutes integer DEFAULT 30 NOT NULL,
    allow_self_signed boolean DEFAULT true NOT NULL,
    keep_demo_enabled boolean DEFAULT true NOT NULL,
    last_sync_status text DEFAULT 'idle'::text NOT NULL,
    last_sync_message text DEFAULT ''::text NOT NULL,
    last_sync_started_at timestamp with time zone,
    last_sync_finished_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider text DEFAULT 'service-layer'::text NOT NULL,
    di_api_base_url text DEFAULT ''::text NOT NULL,
    di_api_timeout_ms integer DEFAULT 30000 NOT NULL,
    CONSTRAINT sap_integration_config_id_check CHECK ((id = 1))
);


--
-- Name: sap_inventory_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_inventory_snapshot (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sap_item_code text NOT NULL,
    warehouse_code text DEFAULT ''::text NOT NULL,
    item_name text DEFAULT ''::text NOT NULL,
    item_group_code text DEFAULT ''::text NOT NULL,
    on_hand numeric,
    committed_quantity numeric,
    available_quantity numeric,
    uom text DEFAULT ''::text NOT NULL,
    snapshot_source text DEFAULT 'sap_items'::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_invoices (
    doc_entry bigint NOT NULL,
    doc_num text DEFAULT ''::text NOT NULL,
    card_code text DEFAULT ''::text NOT NULL,
    card_name text DEFAULT ''::text NOT NULL,
    doc_date text DEFAULT ''::text NOT NULL,
    doc_total numeric,
    currency text DEFAULT ''::text NOT NULL,
    document_status text DEFAULT ''::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_item_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_item_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    local_kind text NOT NULL,
    local_id text DEFAULT ''::text NOT NULL,
    local_code text DEFAULT ''::text NOT NULL,
    local_name text DEFAULT ''::text NOT NULL,
    sap_item_code text NOT NULL,
    sap_item_name text DEFAULT ''::text NOT NULL,
    warehouse_code text DEFAULT ''::text NOT NULL,
    provider text DEFAULT 'service-layer'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_items (
    item_code text NOT NULL,
    item_name text DEFAULT ''::text NOT NULL,
    item_group_code text DEFAULT ''::text NOT NULL,
    on_hand numeric,
    available_quantity numeric,
    price numeric,
    currency text DEFAULT ''::text NOT NULL,
    buy_unit_msr text DEFAULT ''::text NOT NULL,
    sales_unit_msr text DEFAULT ''::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    classification_source_value text DEFAULT ''::text NOT NULL
);


--
-- Name: sap_mock_business_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_mock_business_partners (
    card_code text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_mock_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_mock_invoices (
    doc_entry text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_mock_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_mock_items (
    item_code text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_mock_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_mock_orders (
    doc_entry text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_mock_warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_mock_warehouses (
    warehouse_code text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_orders (
    doc_entry bigint NOT NULL,
    doc_num text DEFAULT ''::text NOT NULL,
    card_code text DEFAULT ''::text NOT NULL,
    card_name text DEFAULT ''::text NOT NULL,
    doc_date text DEFAULT ''::text NOT NULL,
    doc_due_date text DEFAULT ''::text NOT NULL,
    doc_total numeric,
    currency text DEFAULT ''::text NOT NULL,
    document_status text DEFAULT ''::text NOT NULL,
    comments text DEFAULT ''::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queue_code text NOT NULL,
    module_name text DEFAULT 'sap'::text NOT NULL,
    entity_type text NOT NULL,
    action_type text NOT NULL,
    provider text DEFAULT 'service-layer'::text NOT NULL,
    reference_id text DEFAULT ''::text NOT NULL,
    reference_code text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    last_error text DEFAULT ''::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    result_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_outbox_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_outbox_attempts (
    id bigint NOT NULL,
    outbox_id uuid NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    status text DEFAULT ''::text NOT NULL,
    error_message text DEFAULT ''::text NOT NULL,
    request_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_outbox_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sap_outbox_attempts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_outbox_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sap_outbox_attempts_id_seq OWNED BY public.sap_outbox_attempts.id;


--
-- Name: sap_production_cost_center_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_production_cost_center_settings (
    id smallint DEFAULT 1 NOT NULL,
    default_cost_center_code text DEFAULT ''::text CONSTRAINT sap_production_cost_center_se_default_cost_center_code_not_null NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sap_production_cost_center_settings_id_check CHECK ((id = 1))
);


--
-- Name: sap_salesperson_profit_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_salesperson_profit_centers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    salesperson_name text NOT NULL,
    sales_person_code integer,
    profit_center_code text DEFAULT ''::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_sync_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_sync_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_code text NOT NULL,
    entity_name text NOT NULL,
    direction text DEFAULT 'pull'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    records_count integer DEFAULT 0 NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_sync_log (
    id bigint NOT NULL,
    entity_name text NOT NULL,
    mode text NOT NULL,
    status text NOT NULL,
    records_count integer DEFAULT 0 NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone
);


--
-- Name: sap_sync_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sap_sync_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_sync_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sap_sync_log_id_seq OWNED BY public.sap_sync_log.id;


--
-- Name: sap_warehouses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_warehouses (
    warehouse_code text NOT NULL,
    warehouse_name text DEFAULT ''::text NOT NULL,
    location text DEFAULT ''::text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_write_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sap_write_log (
    id bigint NOT NULL,
    entity_name text NOT NULL,
    mode text NOT NULL,
    status text NOT NULL,
    request_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    response_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_write_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sap_write_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_write_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sap_write_log_id_seq OWNED BY public.sap_write_log.id;


--
-- Name: security_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_config (
    id integer DEFAULT 1 NOT NULL,
    password_min_length integer DEFAULT 10 NOT NULL,
    require_upper boolean DEFAULT true NOT NULL,
    require_lower boolean DEFAULT true NOT NULL,
    require_digit boolean DEFAULT true NOT NULL,
    require_special boolean DEFAULT true NOT NULL,
    pin_length integer DEFAULT 6 NOT NULL,
    pin_expiry_minutes integer DEFAULT 15 NOT NULL,
    pin_max_attempts integer DEFAULT 3 NOT NULL,
    login_max_attempts integer DEFAULT 5 NOT NULL,
    login_window_seconds integer DEFAULT 30 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: socio_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.socio_old (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(300) NOT NULL,
    nombre_comercial character varying(300),
    cedula_juridica character varying(30),
    condicion_pago character varying(100) DEFAULT 'Contado'::character varying,
    limite_credito numeric(14,2) DEFAULT 0,
    tiene_credito_aprobado boolean DEFAULT false NOT NULL,
    pct_descuento numeric(6,4) DEFAULT 0,
    idioma_defecto public.idioma_codigo DEFAULT 'es'::public.idioma_codigo NOT NULL,
    moneda_defecto public.moneda_codigo DEFAULT 'USD'::public.moneda_codigo NOT NULL,
    codigo_sap character varying(30),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(200) NOT NULL,
    subdominio character varying(100) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    pais character varying(10) DEFAULT 'CR'::character varying NOT NULL,
    zona_horaria character varying(60) DEFAULT 'America/Costa_Rica'::character varying NOT NULL,
    moneda_defecto public.moneda_codigo DEFAULT 'USD'::public.moneda_codigo NOT NULL,
    idioma_defecto public.idioma_codigo DEFAULT 'es'::public.idioma_codigo NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: troquel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.troquel (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    codigo character varying(20) NOT NULL,
    descripcion character varying(200),
    ancho_mm numeric(10,3) NOT NULL,
    largo_mm numeric(10,3) NOT NULL,
    cantidad_filas integer DEFAULT 1 NOT NULL,
    dientes integer DEFAULT 0 NOT NULL,
    repeticiones integer DEFAULT 1 NOT NULL,
    estado character varying(30) DEFAULT 'Bueno'::character varying,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    descripcion_cotizaciones character varying(200),
    clasificacion character varying(80),
    codigo_cliente character varying(80),
    codigo_preprensa character varying(80),
    codigo_proveedor character varying(80),
    desarrollo_cm numeric(10,3),
    desarrollo_in numeric(10,4),
    elongacion_pct numeric(10,4),
    elongado numeric(10,4),
    ancho_total_troquel_in numeric(10,4),
    largo_total_troquel_in numeric(10,4),
    dimensiones_troquel_in character varying(80),
    ancho_etiqueta_in numeric(10,4),
    largo_etiqueta_in numeric(10,4),
    ancho_material_in numeric(10,4),
    area_etiqueta_excesos_in numeric(12,6),
    area_etiqueta_in numeric(12,6),
    area_troquel_in2 numeric(12,6),
    estructura_troquel character varying(80),
    formato character varying(40),
    gap_in numeric(10,4),
    montaje_troquel character varying(80),
    observaciones text,
    proveedor_troquel character varying(120),
    tension character varying(40),
    tipo_troquel character varying(80),
    tipo_troquel_2 character varying(80),
    uso_convencional boolean,
    uso_digital boolean,
    usuario_creacion character varying(80),
    vida_util_golpes_restantes numeric(14,4),
    vida_util_golpes_usados numeric(14,4),
    vida_util_golpes_total numeric(14,4),
    reemplaza_a character varying(80),
    reemplazado_por character varying(80),
    image_url text
);


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombre character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    rol public.rol_usuario NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    puede_ajustar_macula boolean DEFAULT false NOT NULL,
    puede_ajustar_costos boolean DEFAULT false NOT NULL,
    puede_modificar_precio_venta boolean DEFAULT false NOT NULL,
    puede_aprobar_cotizacion boolean DEFAULT false NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: version_costos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.version_costos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    codigo character varying(30) NOT NULL,
    descripcion character varying(200),
    fecha_inicio date DEFAULT CURRENT_DATE NOT NULL,
    activa boolean DEFAULT true NOT NULL,
    snapshot_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auditoria; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.auditoria (
    id bigint NOT NULL,
    tabla character varying(80) NOT NULL,
    registro_id uuid NOT NULL,
    accion character varying(10) NOT NULL,
    campo character varying(80),
    valor_anterior text,
    valor_nuevo text,
    usuario_id bigint,
    fecha timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auditoria_id_seq; Type: SEQUENCE; Schema: tintas; Owner: -
--

CREATE SEQUENCE tintas.auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: tintas; Owner: -
--

ALTER SEQUENCE tintas.auditoria_id_seq OWNED BY tintas.auditoria.id;


--
-- Name: consumo_detalle; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.consumo_detalle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consumo_id uuid NOT NULL,
    producto_tinta_id uuid NOT NULL,
    lote_id uuid,
    cantidad_calculada numeric(14,4) NOT NULL,
    cantidad_real_consumida numeric(14,4),
    unidad_medida tintas.unidad_medida DEFAULT 'KG'::tintas.unidad_medida NOT NULL,
    costo_unitario numeric(14,4) DEFAULT 0 NOT NULL,
    costo_total numeric(14,4) DEFAULT 0 NOT NULL,
    movimiento_id uuid,
    operador_id bigint,
    fecha_hora timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: consumo_orden; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.consumo_orden (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    orden_produccion_id uuid NOT NULL,
    receta_id uuid,
    cantidad_producida numeric(14,4) NOT NULL,
    unidad_medida tintas.unidad_medida DEFAULT 'KG'::tintas.unidad_medida NOT NULL,
    fecha_cierre timestamp with time zone,
    usuario_id bigint,
    costo_total_consumido numeric(14,4) DEFAULT 0 NOT NULL,
    costo_por_kg numeric(14,4),
    costo_por_metro numeric(14,4),
    costo_por_pie_lineal numeric(14,4),
    costo_por_etiqueta numeric(14,4),
    costo_por_trabajo numeric(14,4),
    estado tintas.estado_consumo DEFAULT 'PENDIENTE'::tintas.estado_consumo NOT NULL,
    observaciones text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fabricantes; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.fabricantes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(160) NOT NULL,
    pais character varying(80),
    contacto character varying(160),
    telefono character varying(40),
    email character varying(160),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: familias; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.familias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(120) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lotes; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.lotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id uuid NOT NULL,
    lote character varying(60) NOT NULL,
    sap_codigo_lote character varying(60),
    fecha_fabricacion date,
    fecha_vencimiento date,
    peso_neto numeric(14,4) NOT NULL,
    peso_disponible numeric(14,4) NOT NULL,
    unidad_medida tintas.unidad_medida DEFAULT 'KG'::tintas.unidad_medida NOT NULL,
    costo_lote numeric(14,4) DEFAULT 0 NOT NULL,
    ubicacion_id uuid,
    origen_inventario tintas.origen_inventario DEFAULT 'ERP_LOCAL'::tintas.origen_inventario NOT NULL,
    estado tintas.estado_producto DEFAULT 'ACTIVO'::tintas.estado_producto NOT NULL,
    observaciones text,
    creado_por bigint,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_por bigint,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_peso_disponible_no_excede CHECK ((peso_disponible <= peso_neto)),
    CONSTRAINT ck_peso_disponible_no_negativo CHECK ((peso_disponible >= (0)::numeric))
);


--
-- Name: marcas; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.marcas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre character varying(120) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: movimientos; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.movimientos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id uuid NOT NULL,
    lote_id uuid,
    tipo tintas.tipo_movimiento NOT NULL,
    cantidad numeric(14,4) NOT NULL,
    unidad_medida tintas.unidad_medida NOT NULL,
    costo_unitario numeric(14,4) DEFAULT 0 NOT NULL,
    costo_total numeric(14,4) DEFAULT 0 NOT NULL,
    ubicacion_origen_id uuid,
    ubicacion_destino_id uuid,
    orden_produccion_id uuid,
    referencia_documento character varying(80),
    origen_sistema character varying(20) DEFAULT 'ERP'::character varying NOT NULL,
    usuario_id bigint,
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    observaciones text
);


--
-- Name: pantones_biblioteca; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.pantones_biblioteca (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo_pantone character varying(40) NOT NULL,
    nombre character varying(160),
    color_hex character varying(9),
    descripcion text,
    frecuencia_uso integer DEFAULT 0 NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_por bigint,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_por bigint,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pantones_clientes; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.pantones_clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    pantone_id uuid NOT NULL,
    exclusivo boolean DEFAULT false NOT NULL,
    notas text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pantones_productos; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.pantones_productos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    producto_id uuid NOT NULL,
    pantone_id uuid NOT NULL,
    tipo_asociacion tintas.tipo_asociacion_producto DEFAULT 'RECOMENDADO'::tintas.tipo_asociacion_producto NOT NULL,
    vigente_desde date DEFAULT CURRENT_DATE NOT NULL,
    vigente_hasta date
);


--
-- Name: pantones_receta_componentes; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.pantones_receta_componentes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receta_id uuid NOT NULL,
    producto_tinta_id uuid NOT NULL,
    porcentaje numeric(6,3) NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    observaciones text,
    CONSTRAINT ck_porcentaje_valido CHECK (((porcentaje > (0)::numeric) AND (porcentaje <= (100)::numeric)))
);


--
-- Name: pantones_recetas; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.pantones_recetas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo_interno character varying(40) NOT NULL,
    nombre character varying(160) NOT NULL,
    pantone_id uuid,
    cliente_id uuid,
    producto_id uuid,
    orden_produccion_id uuid,
    version integer DEFAULT 1 NOT NULL,
    receta_padre_id uuid,
    es_vigente boolean DEFAULT false NOT NULL,
    estado tintas.estado_receta DEFAULT 'BORRADOR'::tintas.estado_receta NOT NULL,
    fecha date DEFAULT CURRENT_DATE NOT NULL,
    usuario_creador_id bigint,
    observaciones text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_por bigint,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: productos; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.productos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo_sap character varying(40),
    codigo_interno character varying(40) NOT NULL,
    origen_inventario tintas.origen_inventario DEFAULT 'ERP_LOCAL'::tintas.origen_inventario NOT NULL,
    sap_ultima_sincronizacion timestamp with time zone,
    sap_hash_version character varying(64),
    nombre character varying(200) NOT NULL,
    tipo tintas.tipo_producto NOT NULL,
    familia_id uuid,
    fabricante_id uuid,
    marca_id uuid,
    proveedor_id uuid,
    color character varying(80),
    pantone_base_id uuid,
    unidad_medida_base tintas.unidad_medida DEFAULT 'KG'::tintas.unidad_medida NOT NULL,
    peso_por_envase numeric(14,4),
    vida_util_dias integer,
    costo_promedio numeric(14,4) DEFAULT 0 NOT NULL,
    costo_ultimo numeric(14,4) DEFAULT 0 NOT NULL,
    ubicacion_defecto_id uuid,
    equivalencias jsonb,
    configuraciones jsonb,
    observaciones text,
    estado tintas.estado_producto DEFAULT 'ACTIVO'::tintas.estado_producto NOT NULL,
    creado_por bigint,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_por bigint,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_sincronizacion_log; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.sap_sincronizacion_log (
    id bigint NOT NULL,
    entidad character varying(40) NOT NULL,
    registro_id uuid NOT NULL,
    direccion character varying(20) NOT NULL,
    estado character varying(20) NOT NULL,
    payload jsonb,
    mensaje_error text,
    fecha timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sap_sincronizacion_log_id_seq; Type: SEQUENCE; Schema: tintas; Owner: -
--

CREATE SEQUENCE tintas.sap_sincronizacion_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sap_sincronizacion_log_id_seq; Type: SEQUENCE OWNED BY; Schema: tintas; Owner: -
--

ALTER SEQUENCE tintas.sap_sincronizacion_log_id_seq OWNED BY tintas.sap_sincronizacion_log.id;


--
-- Name: ubicaciones; Type: TABLE; Schema: tintas; Owner: -
--

CREATE TABLE tintas.ubicaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo character varying(40) NOT NULL,
    descripcion character varying(160) NOT NULL,
    bodega character varying(80),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: vw_consumo_mensual; Type: VIEW; Schema: tintas; Owner: -
--

CREATE VIEW tintas.vw_consumo_mensual AS
 SELECT date_trunc('month'::text, cd.fecha_hora) AS mes,
    cd.producto_tinta_id,
    p.nombre AS producto_nombre,
    sum(cd.cantidad_real_consumida) AS cantidad_total,
    sum(cd.costo_total) AS costo_total
   FROM (tintas.consumo_detalle cd
     JOIN tintas.productos p ON ((p.id = cd.producto_tinta_id)))
  GROUP BY (date_trunc('month'::text, cd.fecha_hora)), cd.producto_tinta_id, p.nombre;


--
-- Name: vw_existencias_actuales; Type: VIEW; Schema: tintas; Owner: -
--

CREATE VIEW tintas.vw_existencias_actuales AS
 SELECT p.id AS producto_id,
    p.codigo_interno,
    p.nombre,
    p.tipo,
    p.unidad_medida_base,
    COALESCE(sum(l.peso_disponible), (0)::numeric) AS existencia_total,
    count(l.id) FILTER (WHERE (l.estado = 'ACTIVO'::tintas.estado_producto)) AS lotes_activos
   FROM (tintas.productos p
     LEFT JOIN tintas.lotes l ON (((l.producto_id = p.id) AND (l.estado = 'ACTIVO'::tintas.estado_producto))))
  GROUP BY p.id, p.codigo_interno, p.nombre, p.tipo, p.unidad_medida_base;


--
-- Name: vw_lotes_proximos_vencer; Type: VIEW; Schema: tintas; Owner: -
--

CREATE VIEW tintas.vw_lotes_proximos_vencer AS
 SELECT l.id,
    l.producto_id,
    l.lote,
    l.sap_codigo_lote,
    l.fecha_fabricacion,
    l.fecha_vencimiento,
    l.peso_neto,
    l.peso_disponible,
    l.unidad_medida,
    l.costo_lote,
    l.ubicacion_id,
    l.origen_inventario,
    l.estado,
    l.observaciones,
    l.creado_por,
    l.creado_en,
    l.actualizado_por,
    l.actualizado_en,
    p.nombre AS producto_nombre,
    p.codigo_interno
   FROM (tintas.lotes l
     JOIN tintas.productos p ON ((p.id = l.producto_id)))
  WHERE ((l.estado = 'ACTIVO'::tintas.estado_producto) AND (l.fecha_vencimiento IS NOT NULL) AND (l.fecha_vencimiento <= (CURRENT_DATE + '30 days'::interval)));


--
-- Name: vw_tintas_mas_utilizadas; Type: VIEW; Schema: tintas; Owner: -
--

CREATE VIEW tintas.vw_tintas_mas_utilizadas AS
 SELECT p.id AS producto_id,
    p.nombre,
    count(cd.id) AS veces_utilizada,
    sum(cd.cantidad_real_consumida) AS cantidad_total_consumida
   FROM (tintas.consumo_detalle cd
     JOIN tintas.productos p ON ((p.id = cd.producto_tinta_id)))
  GROUP BY p.id, p.nombre
  ORDER BY (count(cd.id)) DESC;


--
-- Name: CRD1 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CRD1" ALTER COLUMN id SET DEFAULT nextval('public."CRD1_id_seq"'::regclass);


--
-- Name: ITM1 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ITM1" ALTER COLUMN id SET DEFAULT nextval('public."ITM1_id_seq"'::regclass);


--
-- Name: ITT1 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ITT1" ALTER COLUMN id SET DEFAULT nextval('public."ITT1_id_seq"'::regclass);


--
-- Name: OCPR id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCPR" ALTER COLUMN id SET DEFAULT nextval('public."OCPR_id_seq"'::regclass);


--
-- Name: OITW id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OITW" ALTER COLUMN id SET DEFAULT nextval('public."OITW_id_seq"'::regclass);


--
-- Name: RDR1 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RDR1" ALTER COLUMN id SET DEFAULT nextval('public."RDR1_id_seq"'::regclass);


--
-- Name: WOR1 id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WOR1" ALTER COLUMN id SET DEFAULT nextval('public."WOR1_id_seq"'::regclass);


--
-- Name: admin_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions ALTER COLUMN id SET DEFAULT nextval('public.admin_permissions_id_seq'::regclass);


--
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: credential_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential_audit_log ALTER COLUMN id SET DEFAULT nextval('public.credential_audit_log_id_seq'::regclass);


--
-- Name: email_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log ALTER COLUMN id SET DEFAULT nextval('public.email_log_id_seq'::regclass);


--
-- Name: exchange_rate_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rate_history ALTER COLUMN id SET DEFAULT nextval('public.exchange_rate_history_id_seq'::regclass);


--
-- Name: exchange_rate_update_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rate_update_log ALTER COLUMN id SET DEFAULT nextval('public.exchange_rate_update_log_id_seq'::regclass);


--
-- Name: quote_proformas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_proformas ALTER COLUMN id SET DEFAULT nextval('public.quote_proformas_id_seq'::regclass);


--
-- Name: sap_activity_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_activity_log ALTER COLUMN id SET DEFAULT nextval('public.sap_activity_log_id_seq'::regclass);


--
-- Name: sap_outbox_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_outbox_attempts ALTER COLUMN id SET DEFAULT nextval('public.sap_outbox_attempts_id_seq'::regclass);


--
-- Name: sap_sync_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_sync_log ALTER COLUMN id SET DEFAULT nextval('public.sap_sync_log_id_seq'::regclass);


--
-- Name: sap_write_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_write_log ALTER COLUMN id SET DEFAULT nextval('public.sap_write_log_id_seq'::regclass);


--
-- Name: auditoria id; Type: DEFAULT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.auditoria ALTER COLUMN id SET DEFAULT nextval('tintas.auditoria_id_seq'::regclass);


--
-- Name: sap_sincronizacion_log id; Type: DEFAULT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.sap_sincronizacion_log ALTER COLUMN id SET DEFAULT nextval('tintas.sap_sincronizacion_log_id_seq'::regclass);


--
-- Name: CRD1 CRD1_CardCode_Address_AdresType_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CRD1"
    ADD CONSTRAINT "CRD1_CardCode_Address_AdresType_key" UNIQUE ("CardCode", "Address", "AdresType");


--
-- Name: CRD1 CRD1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CRD1"
    ADD CONSTRAINT "CRD1_pkey" PRIMARY KEY (id);


--
-- Name: ITM1 ITM1_ItemCode_PriceList_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ITM1"
    ADD CONSTRAINT "ITM1_ItemCode_PriceList_key" UNIQUE ("ItemCode", "PriceList");


--
-- Name: ITM1 ITM1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ITM1"
    ADD CONSTRAINT "ITM1_pkey" PRIMARY KEY (id);


--
-- Name: ITT1 ITT1_Father_Code_Warehouse_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ITT1"
    ADD CONSTRAINT "ITT1_Father_Code_Warehouse_key" UNIQUE ("Father", "Code", "Warehouse");


--
-- Name: ITT1 ITT1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ITT1"
    ADD CONSTRAINT "ITT1_pkey" PRIMARY KEY (id);


--
-- Name: OCPR OCPR_CardCode_Name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCPR"
    ADD CONSTRAINT "OCPR_CardCode_Name_key" UNIQUE ("CardCode", "Name");


--
-- Name: OCPR OCPR_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCPR"
    ADD CONSTRAINT "OCPR_pkey" PRIMARY KEY (id);


--
-- Name: OCRD OCRD_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OCRD"
    ADD CONSTRAINT "OCRD_pkey" PRIMARY KEY ("CardCode");


--
-- Name: OITM OITM_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OITM"
    ADD CONSTRAINT "OITM_pkey" PRIMARY KEY ("ItemCode");


--
-- Name: OITT OITT_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OITT"
    ADD CONSTRAINT "OITT_pkey" PRIMARY KEY ("Code");


--
-- Name: OITW OITW_ItemCode_WhsCode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OITW"
    ADD CONSTRAINT "OITW_ItemCode_WhsCode_key" UNIQUE ("ItemCode", "WhsCode");


--
-- Name: OITW OITW_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OITW"
    ADD CONSTRAINT "OITW_pkey" PRIMARY KEY (id);


--
-- Name: ORDR ORDR_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ORDR"
    ADD CONSTRAINT "ORDR_pkey" PRIMARY KEY ("DocEntry");


--
-- Name: OWHS OWHS_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OWHS"
    ADD CONSTRAINT "OWHS_pkey" PRIMARY KEY ("WhsCode");


--
-- Name: OWOR OWOR_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OWOR"
    ADD CONSTRAINT "OWOR_pkey" PRIMARY KEY ("DocEntry");


--
-- Name: RDR1 RDR1_DocEntry_LineNum_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RDR1"
    ADD CONSTRAINT "RDR1_DocEntry_LineNum_key" UNIQUE ("DocEntry", "LineNum");


--
-- Name: RDR1 RDR1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RDR1"
    ADD CONSTRAINT "RDR1_pkey" PRIMARY KEY (id);


--
-- Name: WOR1 WOR1_DocEntry_LineNum_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WOR1"
    ADD CONSTRAINT "WOR1_DocEntry_LineNum_key" UNIQUE ("DocEntry", "LineNum");


--
-- Name: WOR1 WOR1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."WOR1"
    ADD CONSTRAINT "WOR1_pkey" PRIMARY KEY (id);


--
-- Name: admin_permissions admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_permissions
    ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: admin_user_channel_settings admin_user_channel_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_user_channel_settings
    ADD CONSTRAINT admin_user_channel_settings_pkey PRIMARY KEY (user_id);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: app_config app_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_config_key_key UNIQUE (config_key);


--
-- Name: app_config app_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_config
    ADD CONSTRAINT app_config_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: business_partner_addresses business_partner_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_partner_addresses
    ADD CONSTRAINT business_partner_addresses_pkey PRIMARY KEY (id);


--
-- Name: business_partner_contacts business_partner_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_partner_contacts
    ADD CONSTRAINT business_partner_contacts_pkey PRIMARY KEY (id);


--
-- Name: business_partners business_partners_partner_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_partners
    ADD CONSTRAINT business_partners_partner_code_key UNIQUE (partner_code);


--
-- Name: business_partners business_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_partners
    ADD CONSTRAINT business_partners_pkey PRIMARY KEY (id);


--
-- Name: calculo_flexo calculo_flexo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_pkey PRIMARY KEY (id);


--
-- Name: calculo_flexo_proceso calculo_flexo_proceso_calculo_id_numero_secuencia_bloque_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo_proceso
    ADD CONSTRAINT calculo_flexo_proceso_calculo_id_numero_secuencia_bloque_no_key UNIQUE (calculo_id, numero_secuencia, bloque_nombre);


--
-- Name: calculo_flexo_proceso calculo_flexo_proceso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo_proceso
    ADD CONSTRAINT calculo_flexo_proceso_pkey PRIMARY KEY (id);


--
-- Name: calculo_flexo_proceso_variable calculo_flexo_proceso_variable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo_proceso_variable
    ADD CONSTRAINT calculo_flexo_proceso_variable_pkey PRIMARY KEY (id);


--
-- Name: calculo_flexo_secuencia calculo_flexo_secuencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo_secuencia
    ADD CONSTRAINT calculo_flexo_secuencia_pkey PRIMARY KEY (tenant_id);


--
-- Name: cantidad_calculo_flexo cantidad_calculo_flexo_calculo_id_posicion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cantidad_calculo_flexo
    ADD CONSTRAINT cantidad_calculo_flexo_calculo_id_posicion_key UNIQUE (calculo_id, posicion);


--
-- Name: cantidad_calculo_flexo cantidad_calculo_flexo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cantidad_calculo_flexo
    ADD CONSTRAINT cantidad_calculo_flexo_pkey PRIMARY KEY (id);


--
-- Name: costo_acabado costo_acabado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.costo_acabado
    ADD CONSTRAINT costo_acabado_pkey PRIMARY KEY (id);


--
-- Name: costo_acabado costo_acabado_tenant_id_tipo_subtipo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.costo_acabado
    ADD CONSTRAINT costo_acabado_tenant_id_tipo_subtipo_key UNIQUE (tenant_id, tipo, subtipo);


--
-- Name: costo_general costo_general_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.costo_general
    ADD CONSTRAINT costo_general_pkey PRIMARY KEY (tenant_id);


--
-- Name: cotizacion cotizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_pkey PRIMARY KEY (id);


--
-- Name: cotizacion_secuencia cotizacion_secuencia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_secuencia
    ADD CONSTRAINT cotizacion_secuencia_pkey PRIMARY KEY (tenant_id);


--
-- Name: credential_audit_log credential_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credential_audit_log
    ADD CONSTRAINT credential_audit_log_pkey PRIMARY KEY (id);


--
-- Name: email_config email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_pkey PRIMARY KEY (id);


--
-- Name: email_log email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_log
    ADD CONSTRAINT email_log_pkey PRIMARY KEY (id);


--
-- Name: exchange_rate_config exchange_rate_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rate_config
    ADD CONSTRAINT exchange_rate_config_pkey PRIMARY KEY (id);


--
-- Name: exchange_rate_current exchange_rate_current_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rate_current
    ADD CONSTRAINT exchange_rate_current_pkey PRIMARY KEY (base_currency, currency_code);


--
-- Name: exchange_rate_history exchange_rate_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rate_history
    ADD CONSTRAINT exchange_rate_history_pkey PRIMARY KEY (id);


--
-- Name: exchange_rate_update_log exchange_rate_update_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rate_update_log
    ADD CONSTRAINT exchange_rate_update_log_pkey PRIMARY KEY (id);


--
-- Name: flexo_calculations flexo_calculations_calculation_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_calculations
    ADD CONSTRAINT flexo_calculations_calculation_code_key UNIQUE (calculation_code);


--
-- Name: flexo_calculations flexo_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_calculations
    ADD CONSTRAINT flexo_calculations_pkey PRIMARY KEY (id);


--
-- Name: flexo_cost_profiles_old flexo_cost_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_cost_profiles_old
    ADD CONSTRAINT flexo_cost_profiles_pkey PRIMARY KEY (id);


--
-- Name: flexo_dies_old flexo_dies_die_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_dies_old
    ADD CONSTRAINT flexo_dies_die_code_key UNIQUE (die_code);


--
-- Name: flexo_dies_old flexo_dies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_dies_old
    ADD CONSTRAINT flexo_dies_pkey PRIMARY KEY (id);


--
-- Name: flexo_machines_old flexo_machines_machine_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_machines_old
    ADD CONSTRAINT flexo_machines_machine_key_key UNIQUE (machine_key);


--
-- Name: flexo_machines_old flexo_machines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_machines_old
    ADD CONSTRAINT flexo_machines_pkey PRIMARY KEY (id);


--
-- Name: flexo_materials_old flexo_materials_material_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_materials_old
    ADD CONSTRAINT flexo_materials_material_code_key UNIQUE (material_code);


--
-- Name: flexo_materials_old flexo_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_materials_old
    ADD CONSTRAINT flexo_materials_pkey PRIMARY KEY (id);


--
-- Name: flexo_orders flexo_orders_order_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_orders
    ADD CONSTRAINT flexo_orders_order_code_key UNIQUE (order_code);


--
-- Name: flexo_orders flexo_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_orders
    ADD CONSTRAINT flexo_orders_pkey PRIMARY KEY (id);


--
-- Name: flexo_product_quote_history flexo_product_quote_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_product_quote_history
    ADD CONSTRAINT flexo_product_quote_history_pkey PRIMARY KEY (id);


--
-- Name: flexo_products flexo_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_products
    ADD CONSTRAINT flexo_products_pkey PRIMARY KEY (id);


--
-- Name: flexo_products flexo_products_product_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flexo_products
    ADD CONSTRAINT flexo_products_product_code_key UNIQUE (product_code);


--
-- Name: import_audit_old import_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_audit_old
    ADD CONSTRAINT import_audit_pkey PRIMARY KEY (id);


--
-- Name: inventory_classification_mappings inventory_classification_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_classification_mappings
    ADD CONSTRAINT inventory_classification_mappings_pkey PRIMARY KEY (id);


--
-- Name: inventory_classification_mappings inventory_classification_mappings_source_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_classification_mappings
    ADD CONSTRAINT inventory_classification_mappings_source_value_key UNIQUE (source_value);


--
-- Name: maquina_capacidad maquina_capacidad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maquina_capacidad
    ADD CONSTRAINT maquina_capacidad_pkey PRIMARY KEY (id);


--
-- Name: maquina maquina_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maquina
    ADD CONSTRAINT maquina_pkey PRIMARY KEY (id);


--
-- Name: maquina maquina_tenant_id_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maquina
    ADD CONSTRAINT maquina_tenant_id_nombre_key UNIQUE (tenant_id, nombre);


--
-- Name: material material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_pkey PRIMARY KEY (id);


--
-- Name: material material_tenant_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_tenant_id_codigo_key UNIQUE (tenant_id, codigo);


--
-- Name: notification_alert_contacts notification_alert_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_alert_contacts
    ADD CONSTRAINT notification_alert_contacts_pkey PRIMARY KEY (id);


--
-- Name: notification_center_message_attachments notification_center_message_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_message_attachments
    ADD CONSTRAINT notification_center_message_attachments_pkey PRIMARY KEY (id);


--
-- Name: notification_center_messages notification_center_messages_message_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_messages
    ADD CONSTRAINT notification_center_messages_message_code_key UNIQUE (message_code);


--
-- Name: notification_center_messages notification_center_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_messages
    ADD CONSTRAINT notification_center_messages_pkey PRIMARY KEY (id);


--
-- Name: notification_center_participants notification_center_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_participants
    ADD CONSTRAINT notification_center_participants_pkey PRIMARY KEY (id);


--
-- Name: notification_center_threads notification_center_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_threads
    ADD CONSTRAINT notification_center_threads_pkey PRIMARY KEY (id);


--
-- Name: notification_center_threads notification_center_threads_thread_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_threads
    ADD CONSTRAINT notification_center_threads_thread_code_key UNIQUE (thread_code);


--
-- Name: notification_channel_keys notification_channel_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_channel_keys
    ADD CONSTRAINT notification_channel_keys_pkey PRIMARY KEY (channel_key);


--
-- Name: plancha plancha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plancha
    ADD CONSTRAINT plancha_pkey PRIMARY KEY (id);


--
-- Name: plancha plancha_tenant_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plancha
    ADD CONSTRAINT plancha_tenant_id_codigo_key UNIQUE (tenant_id, codigo);


--
-- Name: proceso_catalogo proceso_catalogo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proceso_catalogo
    ADD CONSTRAINT proceso_catalogo_pkey PRIMARY KEY (id);


--
-- Name: proceso_catalogo proceso_catalogo_tenant_id_nombre_categoria_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proceso_catalogo
    ADD CONSTRAINT proceso_catalogo_tenant_id_nombre_categoria_key UNIQUE (tenant_id, nombre, categoria);


--
-- Name: production_capacity_scenarios production_capacity_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_capacity_scenarios
    ADD CONSTRAINT production_capacity_scenarios_pkey PRIMARY KEY (id);


--
-- Name: production_capacity_snapshots production_capacity_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_capacity_snapshots
    ADD CONSTRAINT production_capacity_snapshots_pkey PRIMARY KEY (id);


--
-- Name: production_machine_profiles production_machine_profiles_machine_capacity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_machine_profiles
    ADD CONSTRAINT production_machine_profiles_machine_capacity_id_key UNIQUE (machine_capacity_id);


--
-- Name: production_machine_profiles production_machine_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_machine_profiles
    ADD CONSTRAINT production_machine_profiles_pkey PRIMARY KEY (id);


--
-- Name: production_material_consumption_requests production_material_consumption_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_consumption_requests
    ADD CONSTRAINT production_material_consumption_requests_pkey PRIMARY KEY (id);


--
-- Name: production_material_request_lines production_material_request_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_request_lines
    ADD CONSTRAINT production_material_request_lines_pkey PRIMARY KEY (id);


--
-- Name: production_material_request_lines production_material_request_lines_request_id_line_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_request_lines
    ADD CONSTRAINT production_material_request_lines_request_id_line_number_key UNIQUE (request_id, line_number);


--
-- Name: production_material_requests production_material_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_requests
    ADD CONSTRAINT production_material_requests_pkey PRIMARY KEY (id);


--
-- Name: production_material_requests production_material_requests_request_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_requests
    ADD CONSTRAINT production_material_requests_request_code_key UNIQUE (request_code);


--
-- Name: production_order_routes production_order_routes_order_code_sequence_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_routes
    ADD CONSTRAINT production_order_routes_order_code_sequence_order_key UNIQUE (order_code, sequence_order);


--
-- Name: production_order_routes production_order_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_routes
    ADD CONSTRAINT production_order_routes_pkey PRIMARY KEY (id);


--
-- Name: production_process_definitions production_process_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_process_definitions
    ADD CONSTRAINT production_process_definitions_pkey PRIMARY KEY (id);


--
-- Name: production_process_definitions production_process_definitions_process_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_process_definitions
    ADD CONSTRAINT production_process_definitions_process_key_key UNIQUE (process_key);


--
-- Name: production_resource_skills production_resource_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_resource_skills
    ADD CONSTRAINT production_resource_skills_pkey PRIMARY KEY (id);


--
-- Name: production_resource_skills production_resource_skills_resource_id_process_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_resource_skills
    ADD CONSTRAINT production_resource_skills_resource_id_process_key_key UNIQUE (resource_id, process_key);


--
-- Name: production_resources production_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_resources
    ADD CONSTRAINT production_resources_pkey PRIMARY KEY (id);


--
-- Name: production_resources production_resources_resource_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_resources
    ADD CONSTRAINT production_resources_resource_code_key UNIQUE (resource_code);


--
-- Name: production_route_events production_route_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_route_events
    ADD CONSTRAINT production_route_events_pkey PRIMARY KEY (id);


--
-- Name: production_stop_reasons production_stop_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stop_reasons
    ADD CONSTRAINT production_stop_reasons_pkey PRIMARY KEY (id);


--
-- Name: production_stop_reasons production_stop_reasons_reason_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_stop_reasons
    ADD CONSTRAINT production_stop_reasons_reason_code_key UNIQUE (reason_code);


--
-- Name: production_waste_logs production_waste_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_waste_logs
    ADD CONSTRAINT production_waste_logs_pkey PRIMARY KEY (id);


--
-- Name: quote_line_attachments quote_line_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_line_attachments
    ADD CONSTRAINT quote_line_attachments_pkey PRIMARY KEY (id);


--
-- Name: quote_line_notifications quote_line_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_line_notifications
    ADD CONSTRAINT quote_line_notifications_pkey PRIMARY KEY (id);


--
-- Name: quote_lines_old quote_lines_line_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_lines_old
    ADD CONSTRAINT quote_lines_line_code_key UNIQUE (line_code);


--
-- Name: quote_lines_old quote_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_lines_old
    ADD CONSTRAINT quote_lines_pkey PRIMARY KEY (id);


--
-- Name: quote_proformas quote_proformas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_proformas
    ADD CONSTRAINT quote_proformas_pkey PRIMARY KEY (id);


--
-- Name: quote_proformas quote_proformas_quote_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_proformas
    ADD CONSTRAINT quote_proformas_quote_code_key UNIQUE (quote_code);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_quote_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_quote_code_key UNIQUE (quote_code);


--
-- Name: resource_calendar_exceptions resource_calendar_exceptions_calendar_id_exception_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_calendar_exceptions
    ADD CONSTRAINT resource_calendar_exceptions_calendar_id_exception_date_key UNIQUE (calendar_id, exception_date);


--
-- Name: resource_calendar_exceptions resource_calendar_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_calendar_exceptions
    ADD CONSTRAINT resource_calendar_exceptions_pkey PRIMARY KEY (id);


--
-- Name: resource_calendars resource_calendars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_calendars
    ADD CONSTRAINT resource_calendars_pkey PRIMARY KEY (id);


--
-- Name: resource_shifts resource_shifts_calendar_id_shift_name_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_shifts
    ADD CONSTRAINT resource_shifts_calendar_id_shift_name_day_of_week_key UNIQUE (calendar_id, shift_name, day_of_week);


--
-- Name: resource_shifts resource_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_shifts
    ADD CONSTRAINT resource_shifts_pkey PRIMARY KEY (id);


--
-- Name: sap_activity_log sap_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_activity_log
    ADD CONSTRAINT sap_activity_log_pkey PRIMARY KEY (id);


--
-- Name: sap_business_partners sap_business_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_business_partners
    ADD CONSTRAINT sap_business_partners_pkey PRIMARY KEY (card_code);


--
-- Name: sap_integration_config sap_integration_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_integration_config
    ADD CONSTRAINT sap_integration_config_pkey PRIMARY KEY (id);


--
-- Name: sap_inventory_snapshot sap_inventory_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_inventory_snapshot
    ADD CONSTRAINT sap_inventory_snapshot_pkey PRIMARY KEY (id);


--
-- Name: sap_inventory_snapshot sap_inventory_snapshot_sap_item_code_warehouse_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_inventory_snapshot
    ADD CONSTRAINT sap_inventory_snapshot_sap_item_code_warehouse_code_key UNIQUE (sap_item_code, warehouse_code);


--
-- Name: sap_invoices sap_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_invoices
    ADD CONSTRAINT sap_invoices_pkey PRIMARY KEY (doc_entry);


--
-- Name: sap_item_links sap_item_links_local_kind_local_code_sap_item_code_warehous_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_item_links
    ADD CONSTRAINT sap_item_links_local_kind_local_code_sap_item_code_warehous_key UNIQUE (local_kind, local_code, sap_item_code, warehouse_code);


--
-- Name: sap_item_links sap_item_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_item_links
    ADD CONSTRAINT sap_item_links_pkey PRIMARY KEY (id);


--
-- Name: sap_items sap_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_items
    ADD CONSTRAINT sap_items_pkey PRIMARY KEY (item_code);


--
-- Name: sap_mock_business_partners sap_mock_business_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_mock_business_partners
    ADD CONSTRAINT sap_mock_business_partners_pkey PRIMARY KEY (card_code);


--
-- Name: sap_mock_invoices sap_mock_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_mock_invoices
    ADD CONSTRAINT sap_mock_invoices_pkey PRIMARY KEY (doc_entry);


--
-- Name: sap_mock_items sap_mock_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_mock_items
    ADD CONSTRAINT sap_mock_items_pkey PRIMARY KEY (item_code);


--
-- Name: sap_mock_orders sap_mock_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_mock_orders
    ADD CONSTRAINT sap_mock_orders_pkey PRIMARY KEY (doc_entry);


--
-- Name: sap_mock_warehouses sap_mock_warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_mock_warehouses
    ADD CONSTRAINT sap_mock_warehouses_pkey PRIMARY KEY (warehouse_code);


--
-- Name: sap_orders sap_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_orders
    ADD CONSTRAINT sap_orders_pkey PRIMARY KEY (doc_entry);


--
-- Name: sap_outbox_attempts sap_outbox_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_outbox_attempts
    ADD CONSTRAINT sap_outbox_attempts_pkey PRIMARY KEY (id);


--
-- Name: sap_outbox sap_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_outbox
    ADD CONSTRAINT sap_outbox_pkey PRIMARY KEY (id);


--
-- Name: sap_outbox sap_outbox_queue_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_outbox
    ADD CONSTRAINT sap_outbox_queue_code_key UNIQUE (queue_code);


--
-- Name: sap_production_cost_center_settings sap_production_cost_center_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_production_cost_center_settings
    ADD CONSTRAINT sap_production_cost_center_settings_pkey PRIMARY KEY (id);


--
-- Name: sap_salesperson_profit_centers sap_salesperson_profit_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_salesperson_profit_centers
    ADD CONSTRAINT sap_salesperson_profit_centers_pkey PRIMARY KEY (id);


--
-- Name: sap_salesperson_profit_centers sap_salesperson_profit_centers_salesperson_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_salesperson_profit_centers
    ADD CONSTRAINT sap_salesperson_profit_centers_salesperson_name_key UNIQUE (salesperson_name);


--
-- Name: sap_sync_jobs sap_sync_jobs_job_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_sync_jobs
    ADD CONSTRAINT sap_sync_jobs_job_code_key UNIQUE (job_code);


--
-- Name: sap_sync_jobs sap_sync_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_sync_jobs
    ADD CONSTRAINT sap_sync_jobs_pkey PRIMARY KEY (id);


--
-- Name: sap_sync_log sap_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_sync_log
    ADD CONSTRAINT sap_sync_log_pkey PRIMARY KEY (id);


--
-- Name: sap_warehouses sap_warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_warehouses
    ADD CONSTRAINT sap_warehouses_pkey PRIMARY KEY (warehouse_code);


--
-- Name: sap_write_log sap_write_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_write_log
    ADD CONSTRAINT sap_write_log_pkey PRIMARY KEY (id);


--
-- Name: security_config security_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_config
    ADD CONSTRAINT security_config_pkey PRIMARY KEY (id);


--
-- Name: socio_old socio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.socio_old
    ADD CONSTRAINT socio_pkey PRIMARY KEY (id);


--
-- Name: socio_old socio_tenant_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.socio_old
    ADD CONSTRAINT socio_tenant_id_codigo_key UNIQUE (tenant_id, codigo);


--
-- Name: tenant tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant
    ADD CONSTRAINT tenant_pkey PRIMARY KEY (id);


--
-- Name: tenant tenant_subdominio_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant
    ADD CONSTRAINT tenant_subdominio_key UNIQUE (subdominio);


--
-- Name: troquel troquel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.troquel
    ADD CONSTRAINT troquel_pkey PRIMARY KEY (id);


--
-- Name: troquel troquel_tenant_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.troquel
    ADD CONSTRAINT troquel_tenant_id_codigo_key UNIQUE (tenant_id, codigo);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


--
-- Name: usuario usuario_tenant_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_tenant_id_email_key UNIQUE (tenant_id, email);


--
-- Name: version_costos version_costos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.version_costos
    ADD CONSTRAINT version_costos_pkey PRIMARY KEY (id);


--
-- Name: version_costos version_costos_tenant_id_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.version_costos
    ADD CONSTRAINT version_costos_tenant_id_codigo_key UNIQUE (tenant_id, codigo);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: consumo_detalle consumo_detalle_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_detalle
    ADD CONSTRAINT consumo_detalle_pkey PRIMARY KEY (id);


--
-- Name: consumo_orden consumo_orden_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_orden
    ADD CONSTRAINT consumo_orden_pkey PRIMARY KEY (id);


--
-- Name: fabricantes fabricantes_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.fabricantes
    ADD CONSTRAINT fabricantes_pkey PRIMARY KEY (id);


--
-- Name: familias familias_nombre_key; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.familias
    ADD CONSTRAINT familias_nombre_key UNIQUE (nombre);


--
-- Name: familias familias_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.familias
    ADD CONSTRAINT familias_pkey PRIMARY KEY (id);


--
-- Name: lotes lotes_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.lotes
    ADD CONSTRAINT lotes_pkey PRIMARY KEY (id);


--
-- Name: marcas marcas_nombre_key; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.marcas
    ADD CONSTRAINT marcas_nombre_key UNIQUE (nombre);


--
-- Name: marcas marcas_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.marcas
    ADD CONSTRAINT marcas_pkey PRIMARY KEY (id);


--
-- Name: movimientos movimientos_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.movimientos
    ADD CONSTRAINT movimientos_pkey PRIMARY KEY (id);


--
-- Name: pantones_biblioteca pantones_biblioteca_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_biblioteca
    ADD CONSTRAINT pantones_biblioteca_pkey PRIMARY KEY (id);


--
-- Name: pantones_clientes pantones_clientes_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_clientes
    ADD CONSTRAINT pantones_clientes_pkey PRIMARY KEY (id);


--
-- Name: pantones_productos pantones_productos_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_productos
    ADD CONSTRAINT pantones_productos_pkey PRIMARY KEY (id);


--
-- Name: pantones_receta_componentes pantones_receta_componentes_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_receta_componentes
    ADD CONSTRAINT pantones_receta_componentes_pkey PRIMARY KEY (id);


--
-- Name: pantones_recetas pantones_recetas_codigo_interno_key; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_recetas
    ADD CONSTRAINT pantones_recetas_codigo_interno_key UNIQUE (codigo_interno);


--
-- Name: pantones_recetas pantones_recetas_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_recetas
    ADD CONSTRAINT pantones_recetas_pkey PRIMARY KEY (id);


--
-- Name: productos productos_codigo_interno_key; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_codigo_interno_key UNIQUE (codigo_interno);


--
-- Name: productos productos_codigo_sap_key; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_codigo_sap_key UNIQUE (codigo_sap);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: sap_sincronizacion_log sap_sincronizacion_log_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.sap_sincronizacion_log
    ADD CONSTRAINT sap_sincronizacion_log_pkey PRIMARY KEY (id);


--
-- Name: ubicaciones ubicaciones_codigo_key; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.ubicaciones
    ADD CONSTRAINT ubicaciones_codigo_key UNIQUE (codigo);


--
-- Name: ubicaciones ubicaciones_pkey; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.ubicaciones
    ADD CONSTRAINT ubicaciones_pkey PRIMARY KEY (id);


--
-- Name: consumo_orden uq_consumo_por_orden; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_orden
    ADD CONSTRAINT uq_consumo_por_orden UNIQUE (orden_produccion_id);


--
-- Name: lotes uq_lote_por_producto; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.lotes
    ADD CONSTRAINT uq_lote_por_producto UNIQUE (producto_id, lote);


--
-- Name: pantones_clientes uq_pantone_cliente; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_clientes
    ADD CONSTRAINT uq_pantone_cliente UNIQUE (cliente_id, pantone_id);


--
-- Name: pantones_biblioteca uq_pantone_codigo; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_biblioteca
    ADD CONSTRAINT uq_pantone_codigo UNIQUE (codigo_pantone);


--
-- Name: pantones_productos uq_pantone_producto; Type: CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_productos
    ADD CONSTRAINT uq_pantone_producto UNIQUE (producto_id, pantone_id, vigente_desde);


--
-- Name: CRD1_CardCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CRD1_CardCode_idx" ON public."CRD1" USING btree ("CardCode");


--
-- Name: ITM1_ItemCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ITM1_ItemCode_idx" ON public."ITM1" USING btree ("ItemCode");


--
-- Name: ITT1_Father_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ITT1_Father_idx" ON public."ITT1" USING btree ("Father");


--
-- Name: OCPR_CardCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OCPR_CardCode_idx" ON public."OCPR" USING btree ("CardCode");


--
-- Name: OCRD_CardName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OCRD_CardName_idx" ON public."OCRD" USING btree ("CardName");


--
-- Name: OITM_ItemName_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OITM_ItemName_idx" ON public."OITM" USING btree ("ItemName");


--
-- Name: OITW_ItemCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OITW_ItemCode_idx" ON public."OITW" USING btree ("ItemCode");


--
-- Name: ORDR_CardCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ORDR_CardCode_idx" ON public."ORDR" USING btree ("CardCode");


--
-- Name: OWOR_ItemCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OWOR_ItemCode_idx" ON public."OWOR" USING btree ("ItemCode");


--
-- Name: RDR1_DocEntry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RDR1_DocEntry_idx" ON public."RDR1" USING btree ("DocEntry");


--
-- Name: WOR1_DocEntry_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "WOR1_DocEntry_idx" ON public."WOR1" USING btree ("DocEntry");


--
-- Name: admin_permissions_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_permissions_name_idx ON public.admin_permissions USING btree (permission_name);


--
-- Name: admin_users_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX admin_users_name_idx ON public.admin_users USING btree (full_name);


--
-- Name: audit_log_module_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_module_idx ON public.audit_log USING btree (module_key, changed_at DESC);


--
-- Name: audit_log_presentation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_presentation_idx ON public.audit_log USING btree (presentation_key, changed_at DESC);


--
-- Name: audit_log_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_user_idx ON public.audit_log USING btree (changed_by, changed_at DESC);


--
-- Name: credential_audit_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credential_audit_action_idx ON public.credential_audit_log USING btree (action);


--
-- Name: credential_audit_occurred_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credential_audit_occurred_at_idx ON public.credential_audit_log USING btree (occurred_at);


--
-- Name: exchange_rate_history_batch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exchange_rate_history_batch_idx ON public.exchange_rate_history USING btree (batch_key, fetched_at DESC);


--
-- Name: exchange_rate_history_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exchange_rate_history_date_idx ON public.exchange_rate_history USING btree (rate_date DESC, base_currency);


--
-- Name: exchange_rate_update_log_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exchange_rate_update_log_started_idx ON public.exchange_rate_update_log USING btree (started_at DESC);


--
-- Name: exchange_rate_update_log_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exchange_rate_update_log_status_idx ON public.exchange_rate_update_log USING btree (status);


--
-- Name: idx_business_partners_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_partners_name ON public.business_partners USING btree (partner_name);


--
-- Name: idx_calculo_flexo_cotizacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculo_flexo_cotizacion ON public.calculo_flexo USING btree (cotizacion_id);


--
-- Name: idx_calculo_flexo_proceso_calculo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculo_flexo_proceso_calculo ON public.calculo_flexo_proceso USING btree (calculo_id, numero_secuencia);


--
-- Name: idx_calculo_flexo_proceso_variable_proceso; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculo_flexo_proceso_variable_proceso ON public.calculo_flexo_proceso_variable USING btree (proceso_id);


--
-- Name: idx_calculo_flexo_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calculo_flexo_tenant ON public.calculo_flexo USING btree (tenant_id);


--
-- Name: idx_cantidad_calculo_flexo_calculo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cantidad_calculo_flexo_calculo ON public.cantidad_calculo_flexo USING btree (calculo_id);


--
-- Name: idx_capacity_snapshots_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacity_snapshots_created ON public.production_capacity_snapshots USING btree (created_at DESC);


--
-- Name: idx_capacity_snapshots_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capacity_snapshots_period ON public.production_capacity_snapshots USING btree (from_date, to_date);


--
-- Name: idx_cotizacion_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizacion_fecha ON public.cotizacion USING btree (tenant_id, fecha_creacion DESC);


--
-- Name: idx_cotizacion_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cotizacion_tenant ON public.cotizacion USING btree (tenant_id);


--
-- Name: idx_fc_customer_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fc_customer_name ON public.flexo_calculations USING btree (customer_name);


--
-- Name: idx_fc_job_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fc_job_name ON public.flexo_calculations USING btree (job_name);


--
-- Name: idx_fc_line_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fc_line_status ON public.flexo_calculations USING btree (line_status);


--
-- Name: idx_flexo_calculations_quote_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_calculations_quote_code ON public.flexo_calculations USING btree (quote_code);


--
-- Name: idx_flexo_calculations_quote_line_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_calculations_quote_line_created ON public.flexo_calculations USING btree (quote_code, line_code, created_at DESC);


--
-- Name: idx_flexo_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_orders_created_at ON public.flexo_orders USING btree (created_at DESC);


--
-- Name: idx_flexo_orders_line_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_orders_line_code ON public.flexo_orders USING btree (line_code);


--
-- Name: idx_flexo_orders_quote_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_orders_quote_code ON public.flexo_orders USING btree (quote_code);


--
-- Name: idx_flexo_orders_quote_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_orders_quote_line ON public.flexo_orders USING btree (quote_code, line_code);


--
-- Name: idx_flexo_product_history_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_product_history_product ON public.flexo_product_quote_history USING btree (product_code, created_at DESC);


--
-- Name: idx_flexo_product_history_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_product_history_quote ON public.flexo_product_quote_history USING btree (quote_code, line_code);


--
-- Name: idx_flexo_products_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_products_client ON public.flexo_products USING btree (client_code, client_name);


--
-- Name: idx_flexo_products_quote_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flexo_products_quote_line ON public.flexo_products USING btree (quote_code, line_code);


--
-- Name: idx_maquina_capacidad_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maquina_capacidad_tenant ON public.maquina_capacidad USING btree (tenant_id);


--
-- Name: idx_maquina_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maquina_tenant ON public.maquina USING btree (tenant_id);


--
-- Name: idx_material_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_material_tenant ON public.material USING btree (tenant_id);


--
-- Name: idx_notification_messages_recipient_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_messages_recipient_read ON public.notification_center_messages USING btree (recipient_user_id, read_at);


--
-- Name: idx_notification_participants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_participants_user ON public.notification_center_participants USING btree (user_id);


--
-- Name: idx_plancha_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plancha_tenant ON public.plancha USING btree (tenant_id, activo);


--
-- Name: idx_pmcr_order_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pmcr_order_process ON public.production_material_consumption_requests USING btree (order_code, process_key, requested_at DESC);


--
-- Name: idx_pmcr_sap_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pmcr_sap_status ON public.production_material_consumption_requests USING btree (sap_status, requested_at DESC);


--
-- Name: idx_proceso_catalogo_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proceso_catalogo_tenant ON public.proceso_catalogo USING btree (tenant_id, categoria, activo);


--
-- Name: idx_production_order_routes_capacity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_order_routes_capacity ON public.production_order_routes USING btree (route_status, process_key, machine_profile_id);


--
-- Name: idx_production_order_routes_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_order_routes_order ON public.production_order_routes USING btree (order_code, sequence_order);


--
-- Name: idx_production_resource_skills_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_resource_skills_process ON public.production_resource_skills USING btree (process_key, is_active);


--
-- Name: idx_production_resources_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_resources_process ON public.production_resources USING btree (process_key, is_active);


--
-- Name: idx_production_route_events_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_route_events_route ON public.production_route_events USING btree (route_id, created_at DESC);


--
-- Name: idx_production_waste_logs_route; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_production_waste_logs_route ON public.production_waste_logs USING btree (route_id, created_at DESC);


--
-- Name: idx_quote_line_attachments_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_line_attachments_line ON public.quote_line_attachments USING btree (quote_code, line_code);


--
-- Name: idx_quote_line_notifications_line; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_line_notifications_line ON public.quote_line_notifications USING btree (quote_code, line_code, created_at DESC);


--
-- Name: idx_quote_lines_quote_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_lines_quote_code ON public.quote_lines_old USING btree (quote_code);


--
-- Name: idx_quotes_customer_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_customer_code ON public.quotes USING btree (customer_code);


--
-- Name: idx_resource_calendar_exceptions_calendar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_calendar_exceptions_calendar ON public.resource_calendar_exceptions USING btree (calendar_id, exception_date);


--
-- Name: idx_resource_shifts_calendar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resource_shifts_calendar ON public.resource_shifts USING btree (calendar_id, day_of_week);


--
-- Name: idx_socio_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_socio_tenant ON public.socio_old USING btree (tenant_id);


--
-- Name: idx_troquel_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_troquel_tenant ON public.troquel USING btree (tenant_id);


--
-- Name: idx_usuario_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuario_tenant ON public.usuario USING btree (tenant_id);


--
-- Name: inventory_classification_mappings_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inventory_classification_mappings_active_idx ON public.inventory_classification_mappings USING btree (is_active, updated_at DESC);


--
-- Name: notification_alert_contacts_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_alert_contacts_active_idx ON public.notification_alert_contacts USING btree (is_active, updated_at DESC);


--
-- Name: notification_center_message_attachments_message_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_center_message_attachments_message_idx ON public.notification_center_message_attachments USING btree (message_id, created_at DESC);


--
-- Name: notification_center_messages_channel_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_center_messages_channel_idx ON public.notification_center_messages USING btree (channel_key, external_status, sent_at DESC);


--
-- Name: notification_center_messages_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_center_messages_thread_idx ON public.notification_center_messages USING btree (thread_id, sent_at DESC);


--
-- Name: notification_center_participants_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_center_participants_thread_idx ON public.notification_center_participants USING btree (thread_id, role_key);


--
-- Name: notification_center_threads_document_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_center_threads_document_idx ON public.notification_center_threads USING btree (document_code, quote_code, line_code);


--
-- Name: notification_center_threads_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notification_center_threads_target_idx ON public.notification_center_threads USING btree (target_user_id, status, updated_at DESC);


--
-- Name: production_material_request_lines_request_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_material_request_lines_request_idx ON public.production_material_request_lines USING btree (request_id, line_status);


--
-- Name: production_material_requests_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_material_requests_order_idx ON public.production_material_requests USING btree (order_code, created_at DESC);


--
-- Name: production_material_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX production_material_requests_status_idx ON public.production_material_requests USING btree (status, created_at DESC);


--
-- Name: quote_proformas_quote_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quote_proformas_quote_code_idx ON public.quote_proformas USING btree (quote_code);


--
-- Name: sap_activity_log_action_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_activity_log_action_type_idx ON public.sap_activity_log USING btree (action_type);


--
-- Name: sap_activity_log_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_activity_log_started_at_idx ON public.sap_activity_log USING btree (started_at DESC);


--
-- Name: sap_activity_log_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_activity_log_status_idx ON public.sap_activity_log USING btree (status);


--
-- Name: sap_business_partners_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_business_partners_name_idx ON public.sap_business_partners USING btree (card_name);


--
-- Name: sap_inventory_snapshot_group_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_inventory_snapshot_group_idx ON public.sap_inventory_snapshot USING btree (item_group_code);


--
-- Name: sap_inventory_snapshot_item_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_inventory_snapshot_item_idx ON public.sap_inventory_snapshot USING btree (sap_item_code);


--
-- Name: sap_item_links_local_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_item_links_local_idx ON public.sap_item_links USING btree (local_kind, local_code);


--
-- Name: sap_item_links_sap_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_item_links_sap_idx ON public.sap_item_links USING btree (sap_item_code, warehouse_code);


--
-- Name: sap_items_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_items_name_idx ON public.sap_items USING btree (item_name);


--
-- Name: sap_orders_card_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_orders_card_code_idx ON public.sap_orders USING btree (card_code);


--
-- Name: sap_outbox_attempts_outbox_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_outbox_attempts_outbox_idx ON public.sap_outbox_attempts USING btree (outbox_id, created_at DESC);


--
-- Name: sap_outbox_reference_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_outbox_reference_idx ON public.sap_outbox USING btree (entity_type, reference_code);


--
-- Name: sap_outbox_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_outbox_status_idx ON public.sap_outbox USING btree (status, next_attempt_at, priority, created_at);


--
-- Name: sap_salesperson_profit_centers_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_salesperson_profit_centers_active_idx ON public.sap_salesperson_profit_centers USING btree (is_active, salesperson_name);


--
-- Name: sap_sync_jobs_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_sync_jobs_status_idx ON public.sap_sync_jobs USING btree (status, created_at DESC);


--
-- Name: sap_sync_log_started_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_sync_log_started_at_idx ON public.sap_sync_log USING btree (started_at DESC);


--
-- Name: sap_write_log_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sap_write_log_created_at_idx ON public.sap_write_log USING btree (created_at DESC);


--
-- Name: idx_auditoria_fecha; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_auditoria_fecha ON tintas.auditoria USING btree (fecha);


--
-- Name: idx_auditoria_tabla_registro; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_auditoria_tabla_registro ON tintas.auditoria USING btree (tabla, registro_id);


--
-- Name: idx_consumo_det_consumo; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_consumo_det_consumo ON tintas.consumo_detalle USING btree (consumo_id);


--
-- Name: idx_consumo_det_lote; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_consumo_det_lote ON tintas.consumo_detalle USING btree (lote_id);


--
-- Name: idx_consumo_det_producto; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_consumo_det_producto ON tintas.consumo_detalle USING btree (producto_tinta_id);


--
-- Name: idx_consumo_orden_estado; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_consumo_orden_estado ON tintas.consumo_orden USING btree (estado);


--
-- Name: idx_consumo_orden_orden; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_consumo_orden_orden ON tintas.consumo_orden USING btree (orden_produccion_id);


--
-- Name: idx_consumo_orden_receta; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_consumo_orden_receta ON tintas.consumo_orden USING btree (receta_id);


--
-- Name: idx_pantones_bib_codigo; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_pantones_bib_codigo ON tintas.pantones_biblioteca USING btree (codigo_pantone);


--
-- Name: idx_receta_comp_producto; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_receta_comp_producto ON tintas.pantones_receta_componentes USING btree (producto_tinta_id);


--
-- Name: idx_receta_comp_receta; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_receta_comp_receta ON tintas.pantones_receta_componentes USING btree (receta_id);


--
-- Name: idx_recetas_cliente; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_recetas_cliente ON tintas.pantones_recetas USING btree (cliente_id);


--
-- Name: idx_recetas_pantone; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_recetas_pantone ON tintas.pantones_recetas USING btree (pantone_id);


--
-- Name: idx_recetas_producto; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_recetas_producto ON tintas.pantones_recetas USING btree (producto_id);


--
-- Name: idx_recetas_vigente; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_recetas_vigente ON tintas.pantones_recetas USING btree (pantone_id, es_vigente) WHERE es_vigente;


--
-- Name: idx_sap_log_entidad_registro; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_sap_log_entidad_registro ON tintas.sap_sincronizacion_log USING btree (entidad, registro_id);


--
-- Name: idx_sap_log_estado; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_sap_log_estado ON tintas.sap_sincronizacion_log USING btree (estado);


--
-- Name: idx_tintas_lotes_estado; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_lotes_estado ON tintas.lotes USING btree (estado);


--
-- Name: idx_tintas_lotes_producto; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_lotes_producto ON tintas.lotes USING btree (producto_id);


--
-- Name: idx_tintas_lotes_vencimiento; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_lotes_vencimiento ON tintas.lotes USING btree (fecha_vencimiento);


--
-- Name: idx_tintas_mov_lote; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_mov_lote ON tintas.movimientos USING btree (lote_id);


--
-- Name: idx_tintas_mov_orden; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_mov_orden ON tintas.movimientos USING btree (orden_produccion_id);


--
-- Name: idx_tintas_mov_producto_fecha; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_mov_producto_fecha ON tintas.movimientos USING btree (producto_id, fecha);


--
-- Name: idx_tintas_mov_tipo; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_mov_tipo ON tintas.movimientos USING btree (tipo);


--
-- Name: idx_tintas_productos_codigo_sap; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_productos_codigo_sap ON tintas.productos USING btree (codigo_sap);


--
-- Name: idx_tintas_productos_estado; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_productos_estado ON tintas.productos USING btree (estado);


--
-- Name: idx_tintas_productos_tipo; Type: INDEX; Schema: tintas; Owner: -
--

CREATE INDEX idx_tintas_productos_tipo ON tintas.productos USING btree (tipo);


--
-- Name: admin_user_channel_settings admin_user_channel_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_user_channel_settings
    ADD CONSTRAINT admin_user_channel_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: admin_users admin_users_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.admin_permissions(id) ON DELETE SET NULL;


--
-- Name: calculo_flexo calculo_flexo_cotizacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_cotizacion_id_fkey FOREIGN KEY (cotizacion_id) REFERENCES public.cotizacion(id) ON DELETE CASCADE;


--
-- Name: calculo_flexo calculo_flexo_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: calculo_flexo calculo_flexo_elemento_padre_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_elemento_padre_id_fkey FOREIGN KEY (elemento_padre_id) REFERENCES public.calculo_flexo(id);


--
-- Name: calculo_flexo calculo_flexo_maquina_digital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_maquina_digital_id_fkey FOREIGN KEY (maquina_digital_id) REFERENCES public.maquina(id);


--
-- Name: calculo_flexo calculo_flexo_material_conv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_material_conv_id_fkey FOREIGN KEY (material_conv_id) REFERENCES public.material(id);


--
-- Name: calculo_flexo calculo_flexo_material_digital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_material_digital_id_fkey FOREIGN KEY (material_digital_id) REFERENCES public.material(id);


--
-- Name: calculo_flexo calculo_flexo_modificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES public.usuario(id);


--
-- Name: calculo_flexo_proceso calculo_flexo_proceso_calculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo_proceso
    ADD CONSTRAINT calculo_flexo_proceso_calculo_id_fkey FOREIGN KEY (calculo_id) REFERENCES public.calculo_flexo(id) ON DELETE CASCADE;


--
-- Name: calculo_flexo_proceso calculo_flexo_proceso_maquina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo_proceso
    ADD CONSTRAINT calculo_flexo_proceso_maquina_id_fkey FOREIGN KEY (maquina_id) REFERENCES public.maquina(id);


--
-- Name: calculo_flexo_proceso calculo_flexo_proceso_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo_proceso
    ADD CONSTRAINT calculo_flexo_proceso_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: calculo_flexo_proceso_variable calculo_flexo_proceso_variable_proceso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo_proceso_variable
    ADD CONSTRAINT calculo_flexo_proceso_variable_proceso_id_fkey FOREIGN KEY (proceso_id) REFERENCES public.calculo_flexo_proceso(id) ON DELETE CASCADE;


--
-- Name: calculo_flexo_secuencia calculo_flexo_secuencia_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo_secuencia
    ADD CONSTRAINT calculo_flexo_secuencia_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: calculo_flexo calculo_flexo_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: calculo_flexo calculo_flexo_troquel_conv_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_troquel_conv_id_fkey FOREIGN KEY (troquel_conv_id) REFERENCES public.troquel(id);


--
-- Name: calculo_flexo calculo_flexo_troquel_digital_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculo_flexo
    ADD CONSTRAINT calculo_flexo_troquel_digital_id_fkey FOREIGN KEY (troquel_digital_id) REFERENCES public.troquel(id);


--
-- Name: cantidad_calculo_flexo cantidad_calculo_flexo_calculo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cantidad_calculo_flexo
    ADD CONSTRAINT cantidad_calculo_flexo_calculo_id_fkey FOREIGN KEY (calculo_id) REFERENCES public.calculo_flexo(id) ON DELETE CASCADE;


--
-- Name: cantidad_calculo_flexo cantidad_calculo_flexo_maquina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cantidad_calculo_flexo
    ADD CONSTRAINT cantidad_calculo_flexo_maquina_id_fkey FOREIGN KEY (maquina_id) REFERENCES public.maquina(id);


--
-- Name: cantidad_calculo_flexo cantidad_calculo_flexo_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cantidad_calculo_flexo
    ADD CONSTRAINT cantidad_calculo_flexo_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: costo_acabado costo_acabado_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.costo_acabado
    ADD CONSTRAINT costo_acabado_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: costo_general costo_general_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.costo_general
    ADD CONSTRAINT costo_general_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: cotizacion cotizacion_cotizador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_cotizador_id_fkey FOREIGN KEY (cotizador_id) REFERENCES public.usuario(id);


--
-- Name: cotizacion cotizacion_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id);


--
-- Name: cotizacion_secuencia cotizacion_secuencia_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion_secuencia
    ADD CONSTRAINT cotizacion_secuencia_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: cotizacion cotizacion_socio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_socio_id_fkey FOREIGN KEY (socio_id) REFERENCES public.socio_old(id);


--
-- Name: cotizacion cotizacion_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: cotizacion cotizacion_vendedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_vendedor_id_fkey FOREIGN KEY (vendedor_id) REFERENCES public.usuario(id);


--
-- Name: cotizacion cotizacion_version_costos_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cotizacion
    ADD CONSTRAINT cotizacion_version_costos_id_fkey FOREIGN KEY (version_costos_id) REFERENCES public.version_costos(id);


--
-- Name: maquina_capacidad maquina_capacidad_maquina_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maquina_capacidad
    ADD CONSTRAINT maquina_capacidad_maquina_id_fkey FOREIGN KEY (maquina_id) REFERENCES public.maquina(id) ON DELETE CASCADE;


--
-- Name: maquina_capacidad maquina_capacidad_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maquina_capacidad
    ADD CONSTRAINT maquina_capacidad_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: maquina maquina_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maquina
    ADD CONSTRAINT maquina_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: material material_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material
    ADD CONSTRAINT material_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: notification_center_message_attachments notification_center_message_attachments_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_message_attachments
    ADD CONSTRAINT notification_center_message_attachments_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.notification_center_messages(id) ON DELETE CASCADE;


--
-- Name: notification_center_messages notification_center_messages_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_messages
    ADD CONSTRAINT notification_center_messages_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: notification_center_messages notification_center_messages_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_messages
    ADD CONSTRAINT notification_center_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: notification_center_messages notification_center_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_messages
    ADD CONSTRAINT notification_center_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.notification_center_threads(id) ON DELETE CASCADE;


--
-- Name: notification_center_participants notification_center_participants_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_participants
    ADD CONSTRAINT notification_center_participants_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.notification_center_threads(id) ON DELETE CASCADE;


--
-- Name: notification_center_participants notification_center_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_participants
    ADD CONSTRAINT notification_center_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: notification_center_threads notification_center_threads_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_threads
    ADD CONSTRAINT notification_center_threads_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: notification_center_threads notification_center_threads_seller_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_threads
    ADD CONSTRAINT notification_center_threads_seller_user_id_fkey FOREIGN KEY (seller_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: notification_center_threads notification_center_threads_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_center_threads
    ADD CONSTRAINT notification_center_threads_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: plancha plancha_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plancha
    ADD CONSTRAINT plancha_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: proceso_catalogo proceso_catalogo_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proceso_catalogo
    ADD CONSTRAINT proceso_catalogo_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.maquina(id);


--
-- Name: proceso_catalogo proceso_catalogo_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proceso_catalogo
    ADD CONSTRAINT proceso_catalogo_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: production_capacity_snapshots production_capacity_snapshots_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_capacity_snapshots
    ADD CONSTRAINT production_capacity_snapshots_scenario_id_fkey FOREIGN KEY (scenario_id) REFERENCES public.production_capacity_scenarios(id) ON DELETE SET NULL;


--
-- Name: production_machine_profiles production_machine_profiles_machine_capacity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_machine_profiles
    ADD CONSTRAINT production_machine_profiles_machine_capacity_id_fkey FOREIGN KEY (machine_capacity_id) REFERENCES public.maquina_capacidad(id) ON DELETE CASCADE;


--
-- Name: production_machine_profiles production_machine_profiles_machine_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_machine_profiles
    ADD CONSTRAINT production_machine_profiles_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES public.maquina(id) ON DELETE CASCADE;


--
-- Name: production_material_consumption_requests production_material_consumption_requests_order_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_consumption_requests
    ADD CONSTRAINT production_material_consumption_requests_order_code_fkey FOREIGN KEY (order_code) REFERENCES public.flexo_orders(order_code) ON DELETE CASCADE;


--
-- Name: production_material_consumption_requests production_material_consumption_requests_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_consumption_requests
    ADD CONSTRAINT production_material_consumption_requests_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.production_order_routes(id) ON DELETE SET NULL;


--
-- Name: production_material_request_lines production_material_request_lines_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_request_lines
    ADD CONSTRAINT production_material_request_lines_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.production_material_requests(id) ON DELETE CASCADE;


--
-- Name: production_material_requests production_material_requests_order_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_material_requests
    ADD CONSTRAINT production_material_requests_order_code_fkey FOREIGN KEY (order_code) REFERENCES public.flexo_orders(order_code) ON DELETE SET NULL;


--
-- Name: production_order_routes production_order_routes_dependency_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_routes
    ADD CONSTRAINT production_order_routes_dependency_route_id_fkey FOREIGN KEY (dependency_route_id) REFERENCES public.production_order_routes(id) ON DELETE SET NULL;


--
-- Name: production_order_routes production_order_routes_machine_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_routes
    ADD CONSTRAINT production_order_routes_machine_profile_id_fkey FOREIGN KEY (machine_profile_id) REFERENCES public.production_machine_profiles(id) ON DELETE SET NULL;


--
-- Name: production_order_routes production_order_routes_order_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_order_routes
    ADD CONSTRAINT production_order_routes_order_code_fkey FOREIGN KEY (order_code) REFERENCES public.flexo_orders(order_code) ON DELETE CASCADE;


--
-- Name: production_resource_skills production_resource_skills_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_resource_skills
    ADD CONSTRAINT production_resource_skills_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.production_resources(id) ON DELETE CASCADE;


--
-- Name: production_resources production_resources_calendar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_resources
    ADD CONSTRAINT production_resources_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.resource_calendars(id) ON DELETE SET NULL;


--
-- Name: production_resources production_resources_machine_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_resources
    ADD CONSTRAINT production_resources_machine_profile_id_fkey FOREIGN KEY (machine_profile_id) REFERENCES public.production_machine_profiles(id) ON DELETE SET NULL;


--
-- Name: production_route_events production_route_events_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_route_events
    ADD CONSTRAINT production_route_events_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.production_order_routes(id) ON DELETE CASCADE;


--
-- Name: production_route_events production_route_events_stop_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_route_events
    ADD CONSTRAINT production_route_events_stop_reason_id_fkey FOREIGN KEY (stop_reason_id) REFERENCES public.production_stop_reasons(id) ON DELETE SET NULL;


--
-- Name: production_waste_logs production_waste_logs_route_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_waste_logs
    ADD CONSTRAINT production_waste_logs_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.production_order_routes(id) ON DELETE CASCADE;


--
-- Name: quote_lines_old quote_lines_quote_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_lines_old
    ADD CONSTRAINT quote_lines_quote_code_fkey FOREIGN KEY (quote_code) REFERENCES public.quotes(quote_code) ON DELETE CASCADE;


--
-- Name: resource_calendar_exceptions resource_calendar_exceptions_calendar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_calendar_exceptions
    ADD CONSTRAINT resource_calendar_exceptions_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.resource_calendars(id) ON DELETE CASCADE;


--
-- Name: resource_shifts resource_shifts_calendar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_shifts
    ADD CONSTRAINT resource_shifts_calendar_id_fkey FOREIGN KEY (calendar_id) REFERENCES public.resource_calendars(id) ON DELETE CASCADE;


--
-- Name: sap_outbox_attempts sap_outbox_attempts_outbox_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sap_outbox_attempts
    ADD CONSTRAINT sap_outbox_attempts_outbox_id_fkey FOREIGN KEY (outbox_id) REFERENCES public.sap_outbox(id) ON DELETE CASCADE;


--
-- Name: socio_old socio_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.socio_old
    ADD CONSTRAINT socio_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: troquel troquel_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.troquel
    ADD CONSTRAINT troquel_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: usuario usuario_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: version_costos version_costos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.version_costos
    ADD CONSTRAINT version_costos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenant(id) ON DELETE CASCADE;


--
-- Name: auditoria auditoria_usuario_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.auditoria
    ADD CONSTRAINT auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.admin_users(id);


--
-- Name: consumo_detalle consumo_detalle_consumo_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_detalle
    ADD CONSTRAINT consumo_detalle_consumo_id_fkey FOREIGN KEY (consumo_id) REFERENCES tintas.consumo_orden(id) ON DELETE CASCADE;


--
-- Name: consumo_detalle consumo_detalle_lote_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_detalle
    ADD CONSTRAINT consumo_detalle_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES tintas.lotes(id);


--
-- Name: consumo_detalle consumo_detalle_movimiento_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_detalle
    ADD CONSTRAINT consumo_detalle_movimiento_id_fkey FOREIGN KEY (movimiento_id) REFERENCES tintas.movimientos(id);


--
-- Name: consumo_detalle consumo_detalle_operador_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_detalle
    ADD CONSTRAINT consumo_detalle_operador_id_fkey FOREIGN KEY (operador_id) REFERENCES public.admin_users(id);


--
-- Name: consumo_detalle consumo_detalle_producto_tinta_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_detalle
    ADD CONSTRAINT consumo_detalle_producto_tinta_id_fkey FOREIGN KEY (producto_tinta_id) REFERENCES tintas.productos(id);


--
-- Name: consumo_orden consumo_orden_orden_produccion_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_orden
    ADD CONSTRAINT consumo_orden_orden_produccion_id_fkey FOREIGN KEY (orden_produccion_id) REFERENCES public.flexo_orders(id);


--
-- Name: consumo_orden consumo_orden_receta_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_orden
    ADD CONSTRAINT consumo_orden_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES tintas.pantones_recetas(id);


--
-- Name: consumo_orden consumo_orden_usuario_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.consumo_orden
    ADD CONSTRAINT consumo_orden_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.admin_users(id);


--
-- Name: productos fk_productos_pantone_base; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT fk_productos_pantone_base FOREIGN KEY (pantone_base_id) REFERENCES tintas.pantones_biblioteca(id);


--
-- Name: lotes lotes_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.lotes
    ADD CONSTRAINT lotes_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.admin_users(id);


--
-- Name: lotes lotes_creado_por_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.lotes
    ADD CONSTRAINT lotes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.admin_users(id);


--
-- Name: lotes lotes_producto_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.lotes
    ADD CONSTRAINT lotes_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES tintas.productos(id);


--
-- Name: lotes lotes_ubicacion_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.lotes
    ADD CONSTRAINT lotes_ubicacion_id_fkey FOREIGN KEY (ubicacion_id) REFERENCES tintas.ubicaciones(id);


--
-- Name: movimientos movimientos_lote_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.movimientos
    ADD CONSTRAINT movimientos_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES tintas.lotes(id);


--
-- Name: movimientos movimientos_orden_produccion_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.movimientos
    ADD CONSTRAINT movimientos_orden_produccion_id_fkey FOREIGN KEY (orden_produccion_id) REFERENCES public.flexo_orders(id);


--
-- Name: movimientos movimientos_producto_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.movimientos
    ADD CONSTRAINT movimientos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES tintas.productos(id);


--
-- Name: movimientos movimientos_ubicacion_destino_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.movimientos
    ADD CONSTRAINT movimientos_ubicacion_destino_id_fkey FOREIGN KEY (ubicacion_destino_id) REFERENCES tintas.ubicaciones(id);


--
-- Name: movimientos movimientos_ubicacion_origen_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.movimientos
    ADD CONSTRAINT movimientos_ubicacion_origen_id_fkey FOREIGN KEY (ubicacion_origen_id) REFERENCES tintas.ubicaciones(id);


--
-- Name: movimientos movimientos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.movimientos
    ADD CONSTRAINT movimientos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.admin_users(id);


--
-- Name: pantones_biblioteca pantones_biblioteca_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_biblioteca
    ADD CONSTRAINT pantones_biblioteca_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.admin_users(id);


--
-- Name: pantones_biblioteca pantones_biblioteca_creado_por_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_biblioteca
    ADD CONSTRAINT pantones_biblioteca_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.admin_users(id);


--
-- Name: pantones_clientes pantones_clientes_cliente_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_clientes
    ADD CONSTRAINT pantones_clientes_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.business_partners(id);


--
-- Name: pantones_clientes pantones_clientes_pantone_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_clientes
    ADD CONSTRAINT pantones_clientes_pantone_id_fkey FOREIGN KEY (pantone_id) REFERENCES tintas.pantones_biblioteca(id);


--
-- Name: pantones_productos pantones_productos_pantone_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_productos
    ADD CONSTRAINT pantones_productos_pantone_id_fkey FOREIGN KEY (pantone_id) REFERENCES tintas.pantones_biblioteca(id);


--
-- Name: pantones_productos pantones_productos_producto_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_productos
    ADD CONSTRAINT pantones_productos_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.flexo_products(id);


--
-- Name: pantones_receta_componentes pantones_receta_componentes_producto_tinta_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_receta_componentes
    ADD CONSTRAINT pantones_receta_componentes_producto_tinta_id_fkey FOREIGN KEY (producto_tinta_id) REFERENCES tintas.productos(id);


--
-- Name: pantones_receta_componentes pantones_receta_componentes_receta_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_receta_componentes
    ADD CONSTRAINT pantones_receta_componentes_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES tintas.pantones_recetas(id) ON DELETE CASCADE;


--
-- Name: pantones_recetas pantones_recetas_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_recetas
    ADD CONSTRAINT pantones_recetas_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.admin_users(id);


--
-- Name: pantones_recetas pantones_recetas_cliente_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_recetas
    ADD CONSTRAINT pantones_recetas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.business_partners(id);


--
-- Name: pantones_recetas pantones_recetas_orden_produccion_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_recetas
    ADD CONSTRAINT pantones_recetas_orden_produccion_id_fkey FOREIGN KEY (orden_produccion_id) REFERENCES public.flexo_orders(id);


--
-- Name: pantones_recetas pantones_recetas_pantone_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_recetas
    ADD CONSTRAINT pantones_recetas_pantone_id_fkey FOREIGN KEY (pantone_id) REFERENCES tintas.pantones_biblioteca(id);


--
-- Name: pantones_recetas pantones_recetas_producto_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_recetas
    ADD CONSTRAINT pantones_recetas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.flexo_products(id);


--
-- Name: pantones_recetas pantones_recetas_receta_padre_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_recetas
    ADD CONSTRAINT pantones_recetas_receta_padre_id_fkey FOREIGN KEY (receta_padre_id) REFERENCES tintas.pantones_recetas(id);


--
-- Name: pantones_recetas pantones_recetas_usuario_creador_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.pantones_recetas
    ADD CONSTRAINT pantones_recetas_usuario_creador_id_fkey FOREIGN KEY (usuario_creador_id) REFERENCES public.admin_users(id);


--
-- Name: productos productos_actualizado_por_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_actualizado_por_fkey FOREIGN KEY (actualizado_por) REFERENCES public.admin_users(id);


--
-- Name: productos productos_creado_por_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.admin_users(id);


--
-- Name: productos productos_fabricante_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_fabricante_id_fkey FOREIGN KEY (fabricante_id) REFERENCES tintas.fabricantes(id);


--
-- Name: productos productos_familia_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_familia_id_fkey FOREIGN KEY (familia_id) REFERENCES tintas.familias(id);


--
-- Name: productos productos_marca_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_marca_id_fkey FOREIGN KEY (marca_id) REFERENCES tintas.marcas(id);


--
-- Name: productos productos_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.business_partners(id);


--
-- Name: productos productos_ubicacion_defecto_id_fkey; Type: FK CONSTRAINT; Schema: tintas; Owner: -
--

ALTER TABLE ONLY tintas.productos
    ADD CONSTRAINT productos_ubicacion_defecto_id_fkey FOREIGN KEY (ubicacion_defecto_id) REFERENCES tintas.ubicaciones(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Pt6mn5AJHNocYdiTabywtLl5T4hOjhiJkYcjYhbReP7VSSF8K6dHnGW62lVa2gh

