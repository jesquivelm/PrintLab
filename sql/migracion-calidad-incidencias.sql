-- sql/migracion-calidad-incidencias.sql
-- Incidencias de Calidad: documento de entrada temprana, separado de calidad_ordenes (No Conformidad).
-- Ver relación bidireccional al final (ALTER TABLE calidad_ordenes).

CREATE TABLE IF NOT EXISTS calidad_incidencia_origenes (
    codigo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    orden_visual INTEGER NOT NULL DEFAULT 0
);

INSERT INTO calidad_incidencia_origenes (codigo, nombre, orden_visual) VALUES
    ('cliente', 'Cliente', 10),
    ('produccion', 'Producción', 20),
    ('inspeccion_calidad', 'Inspección de Calidad', 30),
    ('materia_prima', 'Materia Prima', 40),
    ('inventario', 'Inventario', 50),
    ('proveedor', 'Proveedor', 60),
    ('producto_terminado', 'Producto Terminado', 70),
    ('ventas', 'Ventas', 80),
    ('preprensa', 'Preprensa', 90),
    ('rebobinado', 'Rebobinado', 100),
    ('empaque', 'Empaque', 110),
    ('despacho', 'Despacho', 120),
    ('auditoria', 'Auditoría', 130),
    ('administracion', 'Administración', 140),
    ('otro', 'Otro', 999)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS calidad_incidencia_medios_recepcion (
    codigo TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    orden_visual INTEGER NOT NULL DEFAULT 0
);

INSERT INTO calidad_incidencia_medios_recepcion (codigo, nombre, orden_visual) VALUES
    ('telefono', 'Teléfono', 10),
    ('whatsapp', 'WhatsApp', 20),
    ('correo', 'Correo Electrónico', 30),
    ('presencial', 'Presencial', 40),
    ('vendedor', 'Vendedor', 50),
    ('servicio_cliente', 'Servicio al Cliente', 60),
    ('devolucion', 'Devolución', 70),
    ('reclamo_formal', 'Reclamo Formal', 80),
    ('otro', 'Otro', 999)
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS calidad_incidencias (
    id SERIAL PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    creado_por_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    creado_por_nombre TEXT,
    departamento_origen TEXT,
    origen TEXT NOT NULL REFERENCES calidad_incidencia_origenes(codigo),
    medio_recepcion TEXT REFERENCES calidad_incidencia_medios_recepcion(codigo),
    prioridad TEXT NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta','critica')),
    estado TEXT NOT NULL DEFAULT 'nueva' CHECK (estado IN ('nueva','pendiente_revision','en_revision','cerrada','convertida_nc')),
    fecha_evento TIMESTAMPTZ,
    descripcion TEXT NOT NULL,
    observaciones_iniciales TEXT,
    responsable_inicial_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,

    -- Relación con el ERP (solo lo que ya existe como entidad real; ver punto materia_prima_ref/proveedor_ref)
    cliente_codigo TEXT REFERENCES business_partners(partner_code) ON DELETE SET NULL,
    cliente_nombre TEXT,
    contacto_cliente TEXT,
    cotizacion_codigo TEXT REFERENCES quotes(quote_code) ON DELETE SET NULL,
    linea_cotizacion_codigo TEXT,
    producto_codigo TEXT REFERENCES flexo_products(product_code) ON DELETE SET NULL,
    orden_produccion_codigo TEXT REFERENCES flexo_orders(order_code) ON DELETE SET NULL,
    ruta_produccion_id UUID REFERENCES production_order_routes(id) ON DELETE SET NULL,
    evento_produccion_id UUID REFERENCES production_route_events(id) ON DELETE SET NULL,
    genero_paro BOOLEAN NOT NULL DEFAULT false,
    maquina TEXT,
    proceso TEXT,
    operador TEXT,

    -- Fuera de alcance funcional actual (D3): sin FK hasta que exista módulo de materia prima/proveedores.
    -- Documentado explícitamente como placeholder para integración futura.
    materia_prima_ref TEXT,
    proveedor_ref TEXT,

    -- Clasificación por Calidad
    clasificacion TEXT CHECK (clasificacion IN ('no_procede','observacion','correccion','no_conformidad','otro')),
    clasificado_por_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    fecha_clasificacion TIMESTAMPTZ,
    comentario_clasificacion TEXT,

    -- Conversión a No Conformidad (Fase 2, columnas ya preparadas)
    orden_calidad_codigo TEXT REFERENCES calidad_ordenes(codigo) ON DELETE SET NULL,
    fecha_conversion_nc TIMESTAMPTZ,
    convertido_por_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,

    -- Costos de calidad (captura manual, D4)
    costo_material_desperdiciado NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_reproceso NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_horas_maquina NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_mano_obra NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_materia_prima_adicional NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_reposicion NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_transporte NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_devolucion NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_nota_credito NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_otros NUMERIC(14,2) NOT NULL DEFAULT 0,
    costo_total NUMERIC(14,2) GENERATED ALWAYS AS (
        costo_material_desperdiciado + costo_reproceso + costo_horas_maquina + costo_mano_obra +
        costo_materia_prima_adicional + costo_reposicion + costo_transporte + costo_devolucion +
        costo_nota_credito + costo_otros
    ) STORED,

    caso_critico BOOLEAN NOT NULL DEFAULT false,
    criterio_critico TEXT,

    fecha_cierre TIMESTAMPTZ,
    cerrado_por_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calidad_incidencias_estado ON calidad_incidencias(estado);
CREATE INDEX IF NOT EXISTS idx_calidad_incidencias_origen ON calidad_incidencias(origen);
CREATE INDEX IF NOT EXISTS idx_calidad_incidencias_cliente ON calidad_incidencias(cliente_codigo);
CREATE INDEX IF NOT EXISTS idx_calidad_incidencias_orden_produccion ON calidad_incidencias(orden_produccion_codigo);
CREATE INDEX IF NOT EXISTS idx_calidad_incidencias_producto ON calidad_incidencias(producto_codigo);
CREATE INDEX IF NOT EXISTS idx_calidad_incidencias_orden_calidad ON calidad_incidencias(orden_calidad_codigo);
CREATE INDEX IF NOT EXISTS idx_calidad_incidencias_fecha_creacion ON calidad_incidencias(fecha_creacion);

CREATE TABLE IF NOT EXISTS calidad_incidencia_adjuntos (
    id SERIAL PRIMARY KEY,
    incidencia_codigo TEXT NOT NULL REFERENCES calidad_incidencias(codigo) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    size_bytes BIGINT,
    content_sha256 TEXT,
    tipo_evidencia TEXT CHECK (tipo_evidencia IN ('foto','video','pdf','correo','captura','documento','audio','otro')),
    subido_por_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
    fecha_subida TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calidad_incidencia_adjuntos_incidencia ON calidad_incidencia_adjuntos(incidencia_codigo);

-- Relación bidireccional con No Conformidad (no fusiona ni modifica el flujo existente de calidad_ordenes).
ALTER TABLE calidad_ordenes ADD COLUMN IF NOT EXISTS incidencia_origen_codigo TEXT REFERENCES calidad_incidencias(codigo) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_calidad_ordenes_incidencia_origen ON calidad_ordenes(incidencia_origen_codigo);
