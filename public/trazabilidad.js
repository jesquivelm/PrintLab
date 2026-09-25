// ============================================================================
// Mapa de Trazabilidad del Producto — flujo horizontal de tarjetas.
// Datos reales desde /api/trazabilidad/:entityType/:entityId (server.js).
// Solo dos tarjetas principales: Cotización y Orden. Solicitud y Aprobación
// viven DENTRO de Cotización; Producto/Producción/Calidad/Inventario/Despacho
// se quitaron del flujo principal — el desglose real de producción vive
// dentro de la explosión de Orden.
// ============================================================================

const params = new URLSearchParams(window.location.search);
const focusEntityType = params.get('entityType') || 'product';
const focusEntityId = params.get('entityId') || '';

const STAGE_META = {
    cotizacion: { label: 'Cotización', icon: '📄' },
    producto: { label: 'Producto', icon: '🏷️' },
    orden: { label: 'Orden', icon: '🧾' }
};

// Procesos reales de production_order_routes.process_key (ya existen en la BD).
const ORDEN_PROCESS_META = {
    orden_creada: { icon: '🆕', label: 'Creación de Orden' },
    solicitud_vendedor: { icon: '📨', label: 'Solicitud del Vendedor' },
    seguimiento: { icon: '🔎', label: 'Seguimiento' },
    diseno: { icon: '🎨', label: 'Diseño' },
    preprensa: { icon: '🗂️', label: 'Preprensa' },
    visto_bueno: { icon: '✅', label: 'Aprobaciones' },
    programacion: { icon: '🗓️', label: 'Planeación' },
    tintas: { icon: '💧', label: 'Tintas' },
    impresion: { icon: '🖨️', label: 'Impresión' },
    sellos: { icon: '🧱', label: 'Sellos' },
    laminado: { icon: '📄', label: 'Laminado' },
    barnizado: { icon: '✨', label: 'Barniz' },
    troquelado: { icon: '✂️', label: 'Troquelado' },
    estampado: { icon: '⭐', label: 'Estampado' },
    rebobinado: { icon: '🌀', label: 'Rebobinado' },
    empaque: { icon: '📦', label: 'Empaque' },
    acabados: { icon: '🔢', label: 'Numerado' },
    inventario_salida: { icon: '🏬', label: 'Salida de inventario' }
};

// Orden REAL del flujo de producción (aclarado por el usuario): Diseño,
// Preprensa, Sellos, Tintas, Impresión, los acabados internos de la
// máquina, y al final Rebobinado y Empaque. Visto bueno/Planeación/Salida de
// inventario no son "cotizables" pero sí son pasos reales del flujo, así que
// tienen un lugar fijo en la secuencia. Esto reemplaza el `sequence_order` de
// la BD para mostrar Y para la cadena de tiempo real — ese campo no siempre
// refleja el flujo real (caso detectado: tintas/sellos guardadas al final).
const PRODUCTION_ORDER_SEQUENCE = [
    'orden_creada', 'solicitud_vendedor', 'seguimiento',
    'diseno', 'preprensa', 'visto_bueno', 'programacion',
    'sellos', 'tintas', 'impresion',
    'laminado', 'barnizado', 'troquelado', 'estampado', 'acabados',
    'rebobinado', 'empaque', 'inventario_salida'
];
// Procesos "de oficina": su resumen SIEMPRE es foto + nombre + fecha de la
// marca + duración (nunca datos cotizados) — aclaración real del usuario.
// El detalle sí prioriza dato real sobre cotizado (ver PROCESO_DEFS y el
// caso especial de Visto Bueno en renderOrdenGroups).
const OFICINA_PROCESS_KEYS = new Set(['orden_creada', 'solicitud_vendedor', 'seguimiento', 'diseno', 'preprensa', 'visto_bueno']);
function productionOrderRank(processKey) {
    const idx = PRODUCTION_ORDER_SEQUENCE.indexOf(processKey);
    return idx === -1 ? PRODUCTION_ORDER_SEQUENCE.length : idx;
}

// "Sin Barniz" y "No" son valores REALES guardados en barniz_tipo/embosado_tipo
// cuando el usuario explícitamente NO seleccionó el acabado — pero siguen
// siendo strings no vacíos, así que un Boolean(tipo) ingenuo los cuenta como
// "activos". Bug real detectado con datos reales: Estampado aparecía activo
// con embosado_tipo="No". Estas dos funciones son la fuente de verdad de
// "¿de verdad se cotizó esto?" para Barniz y Estampado.
function isBarnizActive(c) {
    if (!c?.barniz_material_id) return false;
    return String(c.barniz_tipo || '').trim().toLowerCase() !== 'sin barniz';
}
function isEstampadoActive(c) {
    if (Number(c?.embosado_costo_cliche) > 0) return true;
    return String(c?.embosado_tipo || '').trim().toLowerCase() === 'si';
}

// Definición única de cada proceso cotizable — la misma fuente alimenta las
// tarjetas de proceso en Cotización (con subtotal, sin foto) y en Orden (con
// foto de quien lo marcó, sin subtotal). "active" decide si el proceso
// realmente se cotizó (mismo criterio que ya usaba acabadosSections).
const PROCESO_DEFS = [
    {
        key: 'diseno', icon: '🎨', label: 'Diseño',
        active: (c) => Boolean(c?.tiempo_diseno_horas || c?.design_cost),
        timeField: (c) => c?.tiempo_diseno_horas != null ? { value: c.tiempo_diseno_horas, suffix: ' h' } : null,
        costField: (c) => c?.design_cost,
        summary: (c) => [
            { label: 'Artes', value: c?.diseno_cantidad_artes },
            { label: 'Costo/hora', value: c?.diseno_costo_hora, prefix: '$' },
            { label: 'Horas', value: c?.tiempo_diseno_horas, suffix: ' h' }
        ],
        // Real primero: si ya se capturaron artes en producción (con duración
        // real), se muestra eso — cantidad de artes, artes/hora calculado, y el
        // costo REAL del proceso (tarifa cotizada × duración real; la tarifa en
        // sí queda oculta, solo se ve el total). Sin dato real (aún no corrió),
        // respaldo honesto: lo cotizado.
        sections: (c, stage, realMinutes) => {
            const artes = (stage?.produccionArtes || []).filter((a) => a.proceso_clave === 'diseno');
            if (artes.length && realMinutes != null) {
                const costoHora = Number(c?.diseno_costo_hora) || 0;
                const costoReal = costoHora > 0 ? (costoHora * realMinutes / 60) : null;
                const artesPorHora = realMinutes > 0 ? (artes.length / (realMinutes / 60)) : null;
                return [
                    { title: 'Real (esta orden)', items: [
                        { label: 'Artes realizados', value: artes.length, strong: true },
                        { label: 'Duración real', value: realMinutes, suffix: ' min' },
                        { label: 'Artes por hora', value: artesPorHora },
                        { label: 'Costo real del proceso', value: costoReal, prefix: '$', strong: true }
                    ]},
                    { title: 'Artes', html: renderArtesGallery(artes) }
                ];
            }
            return [{ title: 'Cotizado', items: [
                { label: 'Cantidad de artes', value: c?.diseno_cantidad_artes },
                { label: 'Costo por hora', value: c?.diseno_costo_hora, prefix: '$', suffix: '/h' },
                { label: 'Horas de diseño', value: c?.tiempo_diseno_horas, suffix: ' h' },
                { label: 'Costo de diseño', value: c?.design_cost, prefix: '$', strong: true }
            ]}];
        }
    },
    {
        key: 'preprensa', icon: '🗂️', label: 'Preprensa',
        active: (c) => Boolean(c?.tiempo_preprensa_horas || c?.prepress_cost),
        timeField: (c) => c?.tiempo_preprensa_horas != null ? { value: c.tiempo_preprensa_horas, suffix: ' h' } : null,
        costField: (c) => c?.prepress_cost,
        summary: (c) => [
            { label: 'Artes', value: c?.preprensa_cantidad_artes },
            { label: 'Artes/hora', value: c?.preprensa_artes_por_hora },
            { label: 'Costo/hora', value: c?.preprensa_costo_hora, prefix: '$' },
            { label: 'Horas', value: c?.tiempo_preprensa_horas, suffix: ' h' }
        ],
        sections: (c, stage, realMinutes) => {
            const artes = (stage?.produccionArtes || []).filter((a) => a.proceso_clave === 'preprensa');
            if (artes.length && realMinutes != null) {
                const costoHora = Number(c?.preprensa_costo_hora) || 0;
                const costoReal = costoHora > 0 ? (costoHora * realMinutes / 60) : null;
                const artesPorHora = realMinutes > 0 ? (artes.length / (realMinutes / 60)) : null;
                return [
                    { title: 'Real (esta orden)', items: [
                        { label: 'Artes realizados', value: artes.length, strong: true },
                        { label: 'Duración real', value: realMinutes, suffix: ' min' },
                        { label: 'Artes por hora', value: artesPorHora },
                        { label: 'Costo real del proceso', value: costoReal, prefix: '$', strong: true }
                    ]},
                    { title: 'Artes', html: renderArtesGallery(artes) }
                ];
            }
            return [{ title: 'Cotizado', items: [
                { label: 'Cantidad de artes', value: c?.preprensa_cantidad_artes },
                { label: 'Artes por hora', value: c?.preprensa_artes_por_hora, suffix: ' art/h' },
                { label: 'Costo por hora', value: c?.preprensa_costo_hora, prefix: '$', suffix: '/h' },
                { label: 'Horas de preprensa', value: c?.tiempo_preprensa_horas, suffix: ' h' },
                { label: 'Costo de preprensa', value: c?.prepress_cost, prefix: '$', strong: true }
            ]}];
        }
    },
    {
        key: 'sellos', icon: '🧱', label: 'Sellos',
        active: (c, stage) => (stage?.motivos || []).some((m) => Number(m.sellos) > 0),
        timeField: () => null,
        costField: () => null,
        summary: (c, stage) => {
            const b = sellosBreakdown(c, stage);
            return [
                { label: 'Total sellos', value: b.total },
                { label: 'De tintas', value: b.deTintas },
                { label: 'De barniz', value: b.deBarniz }
            ];
        },
        fields: (c, stage) => {
            const b = sellosBreakdown(c, stage);
            const rows = [{ label: 'De tintas (proceso)', value: b.deTintas }];
            if (b.deBarniz > 0) rows.push({ label: 'De barniz', value: b.deBarniz });
            if (b.otras > 0) rows.push({ label: 'Otros acabados (sin identificar)', value: b.otras });
            rows.push({ label: 'Total sellos', value: b.total, strong: true });
            rows.push({ label: 'Troquel (no usa sello)', value: c?.die_code });
            return rows;
        }
    },
    {
        key: 'tintas', icon: '💧', label: 'Tintas',
        active: (c) => Boolean(c?.cantidad_tintas),
        timeField: () => null,
        costField: (c) => c?.subtotal_tinta,
        summary: (c) => [
            { label: 'Tintas', value: c?.cantidad_tintas },
            { label: 'Pantones', value: c?.cantidad_pantones },
            { label: 'Cobertura', value: c?.cobertura_tinta_pct, suffix: '%' },
            { label: 'Consumo total', value: c?.consumo_tinta_total_kg, suffix: ' kg' }
        ],
        // Desplegable = TODO el dato real de tintas, agrupado lógicamente
        // (Resumen / Cobertura y consumo / Costos / Por estación) — no solo
        // el subconjunto que ya vive en el resumen colapsado.
        sections: (c, stage) => {
            const groups = [
                { title: 'Resumen', items: [
                    { label: 'Tintas', value: c?.cantidad_tintas },
                    { label: 'Pantones', value: c?.cantidad_pantones },
                    { label: 'CMYK habilitado', value: c?.cmyk_enabled != null ? (c.cmyk_enabled ? 'Sí' : 'No') : null },
                    { label: 'Tinta blanca', value: c?.tinta_blanca != null ? (c.tinta_blanca ? 'Sí' : 'No') : null }
                ]},
                { title: 'Cobertura y consumo', items: [
                    { label: 'Cobertura', value: c?.cobertura_tinta_pct, suffix: '%' },
                    { label: 'Consumo total', value: c?.consumo_tinta_total_kg, suffix: ' kg' },
                    { label: 'Consumo por color', value: c?.consumo_tinta_por_color_kg, suffix: ' kg' }
                ]},
                { title: 'Costos', items: [
                    { label: 'Costo por kg', value: c?.costo_tinta_por_kg, prefix: '$' },
                    { label: 'Costo kg CMYK', value: c?.costo_kg_cmyk, prefix: '$' },
                    { label: 'Costo kg blanco', value: c?.costo_kg_blanco, prefix: '$' },
                    { label: 'Costo kg pantone', value: c?.costo_kg_pantone, prefix: '$' },
                    { label: 'Subtotal tinta', value: c?.subtotal_tinta, prefix: '$', strong: true }
                ]}
            ];
            // Tabla motivo x tinta — cada motivo puede tener estaciones de
            // tinta DISTINTAS a las de otro (verificado con dato real: un
            // motivo con Pantone 3 y otro sin él), así que una lista plana
            // "M1 — Cian: 30%" se vuelve ilegible con varios motivos. La tabla
            // deja comparar de un vistazo qué tinta lleva cada motivo.
            const motivos = stage?.motivos || [];
            const tablaHtml = renderTintaMotivoTable(motivos);
            if (tablaHtml) groups.push({ title: 'Por estación (motivo x tinta)', html: tablaHtml });
            return groups;
        }
    },
    {
        key: 'impresion', icon: '🖨️', label: 'Impresión',
        active: (c) => Boolean(c?.machine_name),
        timeField: (c) => c?.tiempo_total_impresion_min != null ? { value: c.tiempo_total_impresion_min, suffix: ' min' } : null,
        costField: (c) => c?.subtotal_maquina,
        summary: (c) => [
            { label: 'Máquina', value: c?.machine_name, wide: true },
            { label: 'Dimensiones', value: (c?.width_inches || c?.length_inches) ? `${fmtNum(c?.width_inches)} x ${fmtNum(c?.length_inches)} in` : null },
            { label: 'Velocidad', value: c?.velocidad_maquina_m_min, suffix: ' m/min' },
            { label: 'Merma total', value: c?.merma_total_pies, suffix: ' pies' }
        ],
        // Desplegable = TODO el dato real de impresión, agrupado lógicamente.
        sections: (c) => [
            { title: 'Trabajo', items: [
                { label: 'Máquina', value: c?.machine_name, wide: true },
                { label: 'Tipo de proceso', value: c?.process_type },
                { label: 'Cantidad cotizada', value: c?.quantity, suffix: ' uds' },
                { label: 'Ancho', value: c?.width_inches, suffix: ' in' },
                { label: 'Largo', value: c?.length_inches, suffix: ' in' },
                { label: 'Aplicación', value: c?.application_type },
                { label: 'Salida', value: c?.output_type }
            ]},
            { title: 'Velocidad y tiempo', items: [
                { label: 'Velocidad', value: c?.velocidad_maquina_m_min, suffix: ' m/min' },
                { label: 'Tiempo de setup', value: c?.tiempo_setup_min, suffix: ' min' },
                { label: 'Tiempo de montaje', value: c?.tiempo_montaje_min, suffix: ' min' },
                { label: 'Tiempo de limpieza', value: c?.tiempo_limpieza_min, suffix: ' min' },
                { label: 'Tiempo de corrida', value: c?.tiempo_corrida_min, suffix: ' min' },
                { label: 'Tiempo total de impresión', value: c?.tiempo_total_impresion_min, suffix: ' min', strong: true }
            ]},
            { title: 'Transferencia y merma', items: [
                { label: 'BCM anilox', value: c?.bcm_anilox },
                { label: 'Factor transferencia', value: c?.factor_transferencia },
                { label: 'Densidad tinta', value: c?.densidad_tinta },
                { label: 'Merma arranque', value: c?.merma_arranque_pies, suffix: ' pies' },
                { label: 'Merma tiraje', value: c?.merma_tiraje_pies, suffix: ' pies' },
                { label: 'Merma tiraje %', value: c?.merma_tiraje_pct, suffix: '%' },
                { label: 'Merma total', value: c?.merma_total_pies, suffix: ' pies', strong: true },
                { label: 'Costo de merma', value: c?.merma_total_costo, prefix: '$' }
            ]},
            { title: 'Sustrato y core', items: [
                { label: 'Sustrato total', value: c?.pies_totales_sustrato, suffix: ' pies' },
                { label: 'Sustrato neto', value: c?.pies_sustrato_neto, suffix: ' pies' },
                { label: 'Material en mácula', value: c?.material_pies_macula, suffix: ' pies' },
                { label: 'Ancho material', value: c?.material_ancho, suffix: ' in' },
                { label: 'Ancho de core', value: c?.core_width },
                { label: 'Diámetro de core', value: c?.core_diameter },
                { label: 'Etiquetas por rollo', value: c?.labels_per_roll }
            ]},
            { title: 'Costos', items: [
                { label: 'Costo hora máquina', value: c?.costo_hora_maquina, prefix: '$' },
                { label: 'Costo hora operador', value: c?.costo_hora_operador, prefix: '$' },
                { label: 'Subtotal máquina', value: c?.subtotal_maquina, prefix: '$' },
                { label: 'Subtotal operador', value: c?.subtotal_operador, prefix: '$' }
            ]}
        ]
    },
    {
        key: 'laminado', icon: '📄', label: 'Laminado',
        active: (c) => Boolean(c?.laminado_material_id),
        timeField: (c) => c?.laminado_tiempo_montaje_min != null ? { value: c.laminado_tiempo_montaje_min, suffix: ' min' } : null,
        costField: (c) => c?.laminado_costo_total,
        summary: (c) => [
            { label: 'Tipo', value: c?.laminado_tipo },
            { label: 'Metros lineales', value: c?.laminado_metros_lineales, suffix: ' m' },
            { label: 'Tiempo montaje', value: c?.laminado_tiempo_montaje_min, suffix: ' min' }
        ],
        fields: (c) => [
            { label: 'Tipo', value: c?.laminado_tipo },
            { label: 'Metros lineales', value: c?.laminado_metros_lineales, suffix: ' m' },
            { label: 'Costo por metro', value: c?.laminado_costo_por_metro_lineal, prefix: '$' },
            { label: 'Tiempo de montaje', value: c?.laminado_tiempo_montaje_min, suffix: ' min' },
            { label: 'Costo total', value: c?.laminado_costo_total, prefix: '$', strong: true },
            { label: 'Comentario', value: c?.laminado_comentario, wide: true }
        ]
    },
    {
        key: 'barnizado', icon: '✨', label: 'Barniz',
        active: (c) => isBarnizActive(c),
        timeField: (c) => c?.barniz_tiempo_montaje_min != null ? { value: c.barniz_tiempo_montaje_min, suffix: ' min' } : null,
        costField: (c) => c?.barniz_costo_total,
        summary: (c) => [
            { label: 'Tipo', value: c?.barniz_tipo },
            { label: 'Cobertura', value: c?.barniz_cobertura_pct, suffix: '%' },
            { label: 'Consumo', value: c?.barniz_consumo_kg, suffix: ' kg' },
            { label: 'Tiempo montaje', value: c?.barniz_tiempo_montaje_min, suffix: ' min' }
        ],
        fields: (c) => [
            { label: 'Tipo', value: c?.barniz_tipo },
            { label: 'BCM', value: c?.barniz_bcm },
            { label: 'Cobertura', value: c?.barniz_cobertura_pct, suffix: '%' },
            { label: 'Costo por kg', value: c?.barniz_costo_por_kg, prefix: '$' },
            { label: 'Reservado', value: c?.barniz_zonificado != null ? (c.barniz_zonificado ? 'Sí' : 'No') : null },
            { label: 'Consumo', value: c?.barniz_consumo_kg, suffix: ' kg' },
            { label: 'Tiempo de montaje', value: c?.barniz_tiempo_montaje_min, suffix: ' min' },
            { label: 'Costo total', value: c?.barniz_costo_total, prefix: '$', strong: true },
            { label: 'Comentario', value: c?.barniz_comentario, wide: true }
        ]
    },
    {
        key: 'troquelado', icon: '✂️', label: 'Troquelado',
        active: (c) => Boolean(c?.troquelado_tiempo_montaje_min),
        timeField: (c) => c?.troquelado_tiempo_montaje_min != null ? { value: c.troquelado_tiempo_montaje_min, suffix: ' min' } : null,
        costField: () => null,
        summary: (c, stage) => [
            { label: 'Troquel', value: c?.die_code },
            { label: 'Forma', value: c?.troquel_forma },
            { label: 'Ancho sustrato', value: stage?.troquelCalculo?.ancho_material_in, suffix: ' in' },
            { label: 'Cavidades', value: stage?.troquelCalculo?.numero_cavidades }
        ],
        // Desplegable = TODO el dato real del troquel: lo cotizado en
        // flexo_calculations + el layout real de calculo_troquel (ancho de
        // sustrato que ESE troquel necesita, cavidades, paso, aprovechamiento)
        // + el troquel físico de inventario si ya está ligado (proveedor,
        // vida útil en golpes, estado, imagen).
        sections: (c, stage) => {
            const t = stage?.troquelCalculo;
            const f = stage?.troquelFisico;
            const groups = [
                { title: 'Cotizado', items: [
                    { label: 'Troquel', value: c?.die_code },
                    { label: 'Forma', value: c?.troquel_forma },
                    { label: 'Tiempo de montaje', value: c?.troquelado_tiempo_montaje_min, suffix: ' min' },
                    { label: 'Ajuste de merma', value: c?.troquelado_merma_ajuste_metros, suffix: ' m' },
                    { label: 'Comentario', value: c?.troquelado_comentario, wide: true }
                ]}
            ];
            if (t) {
                groups.push({ title: 'Layout del troquel', items: [
                    { label: 'Ancho de producto', value: t.ancho_producto_in, suffix: ' in' },
                    { label: 'Alto de producto', value: t.alto_producto_in, suffix: ' in' },
                    { label: 'Radio de esquina', value: t.radio_esquina_in, suffix: ' in' },
                    { label: 'Ancho de sustrato', value: t.ancho_material_in, suffix: ' in', strong: true },
                    { label: 'Dirección de avance', value: t.direccion_avance },
                    { label: 'Separación lateral', value: t.separacion_lateral_in, suffix: ' in' },
                    { label: 'Separación longitudinal', value: t.separacion_longitudinal_in, suffix: ' in' },
                    { label: 'Cavidades', value: t.numero_cavidades },
                    { label: 'Repeticiones', value: t.numero_repeticiones },
                    { label: 'Paso transversal', value: t.paso_transversal_in, suffix: ' in' },
                    { label: 'Paso longitudinal', value: t.paso_longitudinal_in, suffix: ' in' },
                    { label: 'Desarrollo', value: t.desarrollo_in, suffix: ' in' },
                    { label: 'Ancho total', value: t.ancho_total_in, suffix: ' in' },
                    { label: 'Alto total', value: t.alto_total_in, suffix: ' in' },
                    { label: 'Área útil', value: t.area_util_in2, suffix: ' in²' },
                    { label: 'Área total', value: t.area_total_in2, suffix: ' in²' },
                    { label: 'Aprovechamiento', value: t.aprovechamiento_pct, suffix: '%' }
                ]});
            }
            if (f) {
                groups.push({ title: 'Troquel físico (inventario)', items: [
                    { label: 'Código', value: f.codigo },
                    { label: 'Descripción', value: f.descripcion, wide: true },
                    { label: 'Dimensiones', value: (f.ancho_mm || f.largo_mm) ? `${fmtNum(f.ancho_mm)} x ${fmtNum(f.largo_mm)} mm` : null },
                    { label: 'Estado', value: f.estado },
                    { label: 'Proveedor', value: f.proveedor_troquel },
                    { label: 'Golpes usados', value: f.vida_util_golpes_usados },
                    { label: 'Golpes restantes', value: f.vida_util_golpes_restantes, strong: true },
                    { label: 'Golpes totales', value: f.vida_util_golpes_total },
                    { label: 'Ancho de etiqueta', value: f.ancho_etiqueta_in, suffix: ' in' },
                    { label: 'Largo de etiqueta', value: f.largo_etiqueta_in, suffix: ' in' }
                ]});
                if (f.image_url) {
                    groups.push({ title: 'Imagen', html: `<img src="${esc(f.image_url)}" alt="Troquel ${esc(f.codigo || '')}" style="max-width:140px;max-height:140px;border-radius:8px;border:1px solid var(--border);object-fit:cover">` });
                }
            }
            return groups;
        }
    },
    {
        key: 'estampado', icon: '⭐', label: 'Estampado',
        active: (c) => isEstampadoActive(c),
        timeField: (c) => c?.embosado_tiempo_montaje_min != null ? { value: c.embosado_tiempo_montaje_min, suffix: ' min' } : null,
        costField: (c) => c?.embosado_costo_cliche,
        summary: (c) => [
            { label: 'Tipo', value: c?.embosado_tipo },
            { label: 'Ancho cliché', value: c?.embosado_ancho_cliche, suffix: ' in' },
            { label: 'Largo cliché', value: c?.embosado_largo_cliche, suffix: ' in' }
        ],
        fields: (c) => [
            { label: 'Tipo', value: c?.embosado_tipo },
            { label: 'Ancho cliché', value: c?.embosado_ancho_cliche, suffix: ' in' },
            { label: 'Largo cliché', value: c?.embosado_largo_cliche, suffix: ' in' },
            { label: 'Tiempo de montaje', value: c?.embosado_tiempo_montaje_min, suffix: ' min' },
            { label: 'Costo de cliché', value: c?.embosado_costo_cliche, prefix: '$', strong: true },
            { label: 'Comentario', value: c?.embosado_comentario, wide: true }
        ]
    },
    {
        key: 'acabados', icon: '🔢', label: 'Numerado',
        active: (c) => Boolean(c?.numerado_tipo),
        timeField: (c) => c?.numerado_tiempo_montaje_min != null ? { value: c.numerado_tiempo_montaje_min, suffix: ' min' } : null,
        costField: (c) => c?.numerado_costo_fijo,
        summary: (c) => [
            { label: 'Tipo', value: c?.numerado_tipo },
            { label: 'Tiempo montaje', value: c?.numerado_tiempo_montaje_min, suffix: ' min' }
        ],
        fields: (c) => [
            { label: 'Tipo', value: c?.numerado_tipo },
            { label: 'Tiempo de montaje', value: c?.numerado_tiempo_montaje_min, suffix: ' min' },
            { label: 'Costo fijo', value: c?.numerado_costo_fijo, prefix: '$', strong: true },
            { label: 'Comentario', value: c?.numerado_comentario, wide: true }
        ]
    },
    {
        key: 'rebobinado', icon: '🌀', label: 'Rebobinado',
        active: (c) => Boolean(c?.rebobinado_maquina),
        timeField: (c) => {
            const v = c?.rebobinado_tiempo_total_min ?? c?.rebobinado_tiempo_montaje_min;
            return v != null ? { value: v, suffix: ' min' } : null;
        },
        costField: (c) => c?.rebobinado_costo_total,
        summary: (c) => [
            { label: 'Máquina', value: c?.rebobinado_maquina, wide: true },
            { label: 'Velocidad', value: c?.rebobinado_velocidad },
            { label: 'Tiempo total', value: c?.rebobinado_tiempo_total_min, suffix: ' min' }
        ],
        fields: (c) => [
            { label: 'Máquina', value: c?.rebobinado_maquina, wide: true },
            { label: 'Velocidad', value: c?.rebobinado_velocidad },
            { label: 'Tiempo de montaje', value: c?.rebobinado_tiempo_montaje_min, suffix: ' min' },
            { label: 'Tiempo total', value: c?.rebobinado_tiempo_total_min, suffix: ' min' },
            { label: 'Ajuste de merma', value: c?.rebobinado_merma_ajuste_metros, suffix: ' m' },
            { label: 'Merma operación', value: c?.rebobinado_merma_operacion_pct, suffix: '%' },
            { label: 'Costo hora máquina', value: c?.rebobinado_costo_hora_maquina, prefix: '$' },
            { label: 'Costo operador', value: c?.rebobinado_costo_operador, prefix: '$' },
            { label: 'Costo total', value: c?.rebobinado_costo_total, prefix: '$', strong: true },
            { label: 'Comentario', value: c?.rebobinado_comentario, wide: true }
        ]
    },
    {
        key: 'empaque', icon: '📦', label: 'Empaque',
        active: (c) => Boolean(c?.empaque_costo_total),
        timeField: (c) => c?.empaque_horas != null ? { value: c.empaque_horas, suffix: ' h' } : null,
        costField: (c) => c?.empaque_costo_total,
        summary: (c) => [
            { label: 'Rollos', value: c?.empaque_cantidad_rollos },
            { label: 'Operarios', value: c?.empaque_operarios },
            { label: 'Horas', value: c?.empaque_horas, suffix: ' h' },
            { label: 'Rendimiento', value: c?.empaque_rendimiento_por_hora, suffix: ' rollos/h' }
        ],
        fields: (c) => [
            { label: 'Cantidad de rollos', value: c?.empaque_cantidad_rollos, suffix: ' rollos' },
            { label: 'Rendimiento', value: c?.empaque_rendimiento_por_hora, suffix: ' rollos/h' },
            { label: 'Operarios', value: c?.empaque_operarios, suffix: ' operarios' },
            { label: 'Horas de proceso', value: c?.empaque_horas, suffix: ' h' },
            { label: 'Costo por operador', value: c?.empaque_costo_por_operador, prefix: '$', suffix: '/h' },
            { label: 'Costo externo', value: Number(c?.empaque_costo_externo) > 0 ? c.empaque_costo_externo : null, prefix: '$' },
            { label: 'Costo total', value: c?.empaque_costo_total, prefix: '$', strong: true },
            { label: 'Kilogramos por caja', value: c?.empaque_kg_por_caja, suffix: ' kg' },
            { label: 'Comentario', value: c?.empaque_comentario, wide: true }
        ]
    }
];

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmtDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function fmtTime(d) {
    if (!d) return '—';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
}
function fmtNum(n) {
    if (n === null || n === undefined || n === '') return '—';
    const num = Number(n);
    if (Number.isNaN(num)) return String(n);
    return num.toLocaleString('es-CR', { maximumFractionDigits: 2 });
}
function quoteIsApproved(status) { return /aprob/i.test(String(status || '')); }

async function fetchTrazabilidad() {
    const res = await fetch(`/api/trazabilidad/${encodeURIComponent(focusEntityType)}/${encodeURIComponent(focusEntityId)}`);
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok) throw new Error(payload.error || 'No fue posible cargar la trazabilidad.');
    return payload;
}

function pickCurrentOrder(orders) {
    if (!orders || !orders.length) return null;
    return orders.find((o) => /RUN|SETUP|PARO/i.test(o.line_status || '')) || orders[0];
}
function routeStatusClass(status) {
    const v = String(status || '').toUpperCase();
    if (v === 'COMPLETADO') return 'done';
    if (v === 'RUN' || v === 'SETUP') return 'in_progress';
    if (v === 'PARO') return 'incidencia';
    return 'pending';
}
function eventsForRoutes(data, routeIds) {
    return (data.productionEvents || []).filter((e) => routeIds.includes(e.route_id)).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

// ----------------------------------------------------------------------
// Construcción de las 7 tarjetas principales (siempre las 7, en orden fijo).
// Las que no tienen fuente real usan trazabilidad-mock.js e isMock=true.
// ----------------------------------------------------------------------
function buildStages(data) {
    const order = pickCurrentOrder(data.orders);
    const routesForOrder = order ? data.productionRoutes.filter((r) => r.order_code === order.order_code) : [];
    const stages = {};

    // COTIZACIÓN (incluye Solicitud y Aprobación como sub-estados). La Línea
    // es el dato que de verdad identifica qué se está produciendo, así que
    // es el código grande de la tarjeta; la Cotización pasa a segundo plano
    // (código pequeño debajo) pero se conserva — stage.quoteCode es la fuente
    // real para el link "Abrir documento", nunca stage.code.
    if (data.quote) {
        stages.cotizacion = {
            key: 'cotizacion', isMock: false,
            code: data.lineCode || data.quote.quote_code,
            quoteCode: data.quote.quote_code,
            secondaryLabel: data.lineCode ? `Cotización ${data.quote.quote_code}` : null,
            status: quoteIsApproved(data.quote.status) ? 'done' : 'in_progress',
            lines: [
                { label: 'Cliente', value: data.quote.customer_name },
                { label: 'Vendedor', value: data.quote.salesperson_name },
                { label: 'Estado', value: data.quote.status },
                { label: 'Creada', value: fmtDate(data.quote.created_on || data.quote.created_at) }
            ],
            subblock: {
                solicitud: { ok: true, label: 'Solicitud', value: 'Recibida', date: fmtDate(data.quote.created_on || data.quote.created_at) },
                aprobacion: quoteIsApproved(data.quote.status)
                    ? { ok: true, label: 'Aprobación', value: 'Aprobada' }
                    : { ok: false, label: 'Aprobación', value: 'Pendiente' }
            },
            motivos: buildMotivos(data),
            calculoLine: data.calculoLine || null,
            troquelCalculo: data.troquelCalculo || null,
            troquelFisico: data.troquelFisico || null
        };
    } else {
        stages.cotizacion = { key: 'cotizacion', isMock: true, code: null, status: 'pending', lines: [{ label: 'Estado', value: 'Sin cotización registrada' }], subblock: null, motivos: [], calculoLine: null, troquelCalculo: null, troquelFisico: null };
    }

    // ORDEN — necesita calculoLine/motivos (mismos datos que Cotización) para
    // que las tarjetas de proceso muestren el detalle cotizado, no solo el
    // estado de producción.
    if (order) {
        stages.orden = {
            key: 'orden', isMock: false, code: order.order_code, status: 'done',
            lines: [
                { label: 'Máquina', value: order.machine_name },
                { label: 'Estado', value: order.line_status },
                { label: 'Cantidad', value: fmtNum(order.ordered_quantity) },
                { label: 'Creada', value: fmtDate(order.created_at) }
            ],
            routes: routesForOrder,
            operatorPhotos: data.operatorPhotos || {},
            calculoLine: data.calculoLine || null,
            motivos: buildMotivos(data),
            troquelCalculo: data.troquelCalculo || null,
            troquelFisico: data.troquelFisico || null,
            produccionArtes: (data.produccionArtes || []).filter((a) => a.orden_codigo === order.order_code),
            vistoBueno: {
                destinatario: order.vb_destinatario || null,
                contacto: order.vb_contacto || null,
                telefono: order.vb_telefono || null,
                correo: order.vb_correo || null,
                direccion: order.vb_direccion || null
            }
        };
    } else {
        stages.orden = { key: 'orden', isMock: true, code: null, status: 'pending', lines: [{ label: 'Estado', value: 'Sin orden de producción' }], routes: [] };
    }

    // PRODUCTO — solo aparece si ya existe (flexo_products); si no existe, no
    // se muestra ni siquiera como pendiente. Es exactamente la misma
    // información que Cotización (motivos/calculoLine son los mismos datos),
    // por eso reutiliza el mismo renderCotizacionColumn.
    const stageOrder = ['cotizacion'];
    if (data.product) {
        stages.producto = {
            key: 'producto', isMock: false, code: data.product.product_code,
            status: 'done',
            lines: [
                { label: 'Cliente', value: data.product.client_name },
                { label: 'Producto', value: data.product.product_name },
                { label: 'Línea', value: data.product.line_code },
                { label: 'Cantidad', value: fmtNum(data.product.quantity_products) },
                { label: 'Creado', value: fmtDate(data.product.created_at) }
            ],
            motivos: buildMotivos(data),
            calculoLine: data.calculoLine || null,
            troquelCalculo: data.troquelCalculo || null,
            troquelFisico: data.troquelFisico || null
        };
        stageOrder.push('producto');
    }
    stageOrder.push('orden');

    return stageOrder.map((key) => ({ ...STAGE_META[key], ...stages[key] }));
}

// Motivos/versiones nacen en la cotización (calculo_motivos/calculo_versiones/
// calculo_motivo_tintas) — antes de que exista producto u orden. Cada versión
// se enlaza a su producto real si ya fue generado (flexo_products.motivo_indice
// / version_indice); si no, se marca honestamente como "aún no generado".
function buildMotivos(data) {
    return (data.motivos || []).map((m) => {
        const versiones = (data.versiones || [])
            .filter((v) => v.motivo_indice === m.motivo_indice)
            .map((v) => {
                const producto = (data.lineProducts || []).find((p) => p.motivo_indice === m.motivo_indice && p.version_indice === v.version_indice);
                return {
                    version_indice: v.version_indice,
                    nombre: v.nombre,
                    descripcion: v.descripcion,
                    cantidad: v.cantidad,
                    producto: producto || null
                };
            });
        const tintas = (data.motivoTintas || []).filter((t) => t.motivo_indice === m.motivo_indice);
        return { motivo_indice: m.motivo_indice, nombre: m.nombre, cantidad: m.cantidad, cantidad_tintas: m.cantidad_tintas, tinta_blanca: m.tinta_blanca, doble_blanca: m.doble_blanca, cantidad_pantones: m.cantidad_pantones, sellos: m.sellos, versiones, tintas };
    });
}

function focusStageKey() {
    if (focusEntityType === 'quote' || focusEntityType === 'line') return 'cotizacion';
    if (focusEntityType === 'product') return 'producto';
    return 'orden';
}

// ----------------------------------------------------------------------
// Render
// ----------------------------------------------------------------------
let __tzData = null;
let __tzOpenCards = new Set();
let __tzOpenMotivo = new Map();
let __tzOpenGroup = new Map();
let __tzOpenProceso = new Map();
let __tzOpenRoute = new Map();

function renderHeader(data, stages) {
    const product = data.product;
    // Sin producto todavía, la Línea es el dato que identifica qué se está
    // produciendo — la Cotización pasa a subtítulo (segundo plano).
    document.getElementById('tzProductName').textContent = product?.product_name
        || (data.quote ? (data.lineCode ? `Línea ${data.lineCode}` : `Cotización ${data.quote.quote_code}`) : (focusEntityId || 'Sin datos'));
    document.getElementById('tzProductSub').textContent = product?.product_code
        || (data.quote ? (data.lineCode ? `Cotización ${data.quote.quote_code}` : data.quote.quote_code) : focusEntityId);

    const fields = document.getElementById('tzFields');
    const fieldList = [
        ['Cliente', data.quote?.customer_name || product?.client_name || '—'],
        ['Vendedor', data.quote?.salesperson_name || '—'],
        ['Línea', data.lineCode || '—'],
        ['Cotización', data.quote?.quote_code || '—']
    ];
    fields.innerHTML = fieldList.map(([l, v]) => `<div class="tz-field"><span class="tz-field-lbl">${esc(l)}</span><span class="tz-field-val">${esc(v)}</span></div>`).join('');

    const doneCount = stages.filter((s) => s.status === 'done').length;
    const pct = Math.round((doneCount / stages.length) * 100);
    document.getElementById('tzProgressPct').textContent = `${pct}%`;
    document.getElementById('tzProgressFill').style.width = `${pct}%`;

    const current = [...stages].reverse().find((s) => s.status === 'in_progress' || s.status === 'incidencia') || [...stages].filter((s) => s.status === 'done').pop() || stages[0];
    const currentBox = document.getElementById('tzCurrent');
    currentBox.hidden = false;
    currentBox.innerHTML = `
        <span class="tz-current-lbl">Estado actual</span>
        <span class="tz-current-stage">${esc(current.icon)} ${esc(current.label)}</span>
        ${current.code ? `<span class="tz-current-chip"><b>${esc(current.code)}</b></span>` : ''}
    `;
}

function statusBadge(status) {
    const map = {
        done: { text: '✓ Completado', cls: 'st-done' },
        in_progress: { text: '● En proceso', cls: 'st-in_progress' },
        pending: { text: 'Pendiente', cls: 'st-pending' },
        incidencia: { text: '⚠ Incidencia', cls: 'st-incidencia' }
    };
    return map[status] || map.pending;
}

function renderStageCard(stage, isFocus, isOpen) {
    const badge = statusBadge(stage.status);
    const borderClass = stage.isMock ? 'st-mock-pending' : badge.cls;
    // Ambas tarjetas expanden hacia LA DERECHA como grupos hermanos en la
    // misma fila (ver renderCotizacionGroups / renderOrdenGroups) — el
    // chevron solo indica el estado, no cambia de dirección.
    const hasGroups = ((stage.key === 'cotizacion' || stage.key === 'producto') && Array.isArray(stage.motivos) && (stage.motivos.length > 0 || stage.calculoLine))
        || (stage.key === 'orden' && Array.isArray(stage.routes) && stage.routes.length > 0);
    const isExpandable = hasGroups;

    const subblockHtml = stage.subblock ? `
        <div class="tz-subblock">
            ${Object.values(stage.subblock).map((s) => `
                <div class="tz-subblock-row">
                    <span class="tz-subblock-lbl">${esc(s.label)}</span>
                    <span class="tz-subblock-val ${s.ok ? 'ok' : 'pending'}">${s.ok ? '✓' : '○'} ${esc(s.value)}${s.date ? ' · ' + esc(s.date) : ''}</span>
                </div>
            `).join('')}
        </div>
    ` : '';

    const incidenciaHtml = stage.incidencia ? `
        <div class="tz-incidencia-box">
            <div><b>Razón:</b> ${esc(stage.incidencia.motivo)}</div>
            <div><b>Desde:</b> ${esc(stage.incidencia.desde)}</div>
            <div><b>Proceso:</b> ${esc(stage.incidencia.proceso)}</div>
        </div>
    ` : '';

    const docUrl = stage.key === 'cotizacion' && stage.quoteCode ? `/cotizaciones/documento?codigo=${encodeURIComponent(stage.quoteCode)}`
        : stage.key === 'orden' && stage.code ? `/orden-produccion/${encodeURIComponent(stage.code)}` : null;
    const openDocHtml = docUrl ? `<a class="tz-stage-open" href="${esc(docUrl)}" target="_blank" title="Abrir documento" onclick="event.stopPropagation()">↗</a>` : '';

    return `
        <div class="tz-stage ${isFocus ? 'is-focus' : ''} ${borderClass}" data-stage="${stage.key}" id="tz-stage-${stage.key}">
            <div class="tz-stage-head" onclick="toggleCard('${stage.key}')">
                <span class="tz-stage-icon">${stage.icon}</span>
                <span class="tz-stage-title">${esc(stage.label)}</span>
                ${openDocHtml}
                ${isExpandable ? `<span class="tz-chevron ${isOpen ? 'open' : ''}">▾</span>` : ''}
            </div>
            <div class="tz-stage-body">
                ${stage.code ? `<div class="tz-stage-code">${esc(stage.code)}</div>` : ''}
                ${stage.secondaryLabel ? `<div class="tz-stage-secondary-code">${esc(stage.secondaryLabel)}</div>` : ''}
                <span class="tz-stage-status-badge ${stage.isMock ? 'st-mock-pending' : badge.cls}">${stage.isMock ? 'Pendiente' : badge.text}</span>
                ${stage.lines.map((l) => `<div class="tz-stage-line"><span>${esc(l.label)}</span><span>${esc(l.value ?? '—')}</span></div>`).join('')}
                ${subblockHtml}
                ${incidenciaHtml}
            </div>
        </div>
    `;
}

// ----------------------------------------------------------------------
// Grupos de Cotización — nacen a la DERECHA de la tarjeta (hermanos en el
// mismo tz-map-track), nunca debajo. Cada grupo resume 1 línea y, al
// tocarlo, abre su propio detalle también hacia la derecha. El estado de
// qué grupos están abiertos se conserva mientras la página siga cargada:
// si colapsás Cotización y la volvés a abrir, reaparecen como estaban.
// ----------------------------------------------------------------------
const COTIZACION_GROUPS = [
    {
        key: 'proceso', icon: '🎯', label: 'Proceso',
        summaryLines: (stage) => {
            if (!stage.motivos.length) return [{ label: 'Estado', value: 'Sin motivos registrados' }];
            const dims = (stage.calculoLine?.width_inches || stage.calculoLine?.length_inches)
                ? `${fmtNum(stage.calculoLine?.width_inches)} x ${fmtNum(stage.calculoLine?.length_inches)} in` : null;
            return [
                { label: 'Producto', value: stage.calculoLine?.job_name, wide: true },
                { label: 'Dimensiones', value: dims },
                { label: 'Motivos', value: stage.motivos.length },
                { label: 'Unidades totales', value: stage.motivos.reduce((s, m) => s + Number(m.cantidad || 0), 0) }
            ];
        },
        detail: (stage) => renderProcesoGroupDetail(stage)
    },
    {
        key: 'planeacion', icon: '🗓️', label: 'Planeación',
        summaryLines: (stage) => [
            { label: 'Procesos cotizados', value: PROCESO_DEFS.filter((d) => d.active(stage.calculoLine, stage)).length },
            { label: 'Tiempo de entrega pactado', value: stage.calculoLine?.tiempo_entrega, wide: true },
            { label: 'Total del proceso', value: stage.calculoLine?.tiempo_total_min, suffix: ' min', strong: true }
        ],
        // Los procesos individuales (Diseño, Tintas, Impresión, Sellos, Laminado,
        // Barniz, Troquelado, Estampado, Rebobinado, Empaque, Numerado) ya no
        // viven separados en "Impresión"/"Acabados" — cuelgan como su propia
        // rama conectada de Planeación (ver renderProcesoBranch), igual que los
        // procesos de Orden cuelgan de la tarjeta Orden.
        detail: (stage) => renderSections([{ title: 'Tiempo por proceso', items: procesoTimesSection(stage) }])
    },
    {
        key: 'finanzas', icon: '💰', label: 'Finanzas', singleColumn: true,
        summaryLines: (stage) => [
            { label: 'Subtotal máquina', value: stage.calculoLine?.subtotal_maquina, prefix: '$' },
            { label: 'Subtotal tinta', value: stage.calculoLine?.subtotal_tinta, prefix: '$' },
            { label: 'Impuesto', value: stage.calculoLine?.tax_amount, prefix: '$' },
            { label: 'Total', value: stage.calculoLine?.total_cost, prefix: '$', strong: true },
            { label: 'Precio unitario', value: stage.calculoLine?.unit_price, prefix: '$' }
        ],
        detail: (stage) => renderSections([
            { title: 'Subtotales de costo', items: [
                { label: 'Máquina', value: stage.calculoLine?.subtotal_maquina, prefix: '$' },
                { label: 'Operador', value: stage.calculoLine?.subtotal_operador, prefix: '$' },
                { label: 'Tinta', value: stage.calculoLine?.subtotal_tinta, prefix: '$' },
                { label: 'Sustrato', value: stage.calculoLine?.costo_sustrato, prefix: '$' },
                { label: 'Merma', value: stage.calculoLine?.costo_merma, prefix: '$' },
                { label: 'Diseño', value: stage.calculoLine?.design_cost, prefix: '$' },
                { label: 'Preprensa', value: stage.calculoLine?.prepress_cost, prefix: '$' },
                { label: 'Gastos generales', value: stage.calculoLine?.overhead_cost, prefix: '$' },
                { label: 'Empaque/caja', value: stage.calculoLine?.packaging_cost || stage.calculoLine?.costo_caja, prefix: '$' },
                { label: 'Costo adicional', value: stage.calculoLine?.additional_cost, prefix: '$' },
                { label: 'Subtotal financiero', value: stage.calculoLine?.subtotal_financiero, prefix: '$' },
                { label: 'Subtotal industrial', value: stage.calculoLine?.industrial_subtotal, prefix: '$' },
                { label: 'Subtotal costo', value: stage.calculoLine?.subtotal_cost, prefix: '$', strong: true }
            ]},
            { title: 'Cambios / setup adicional', items: [
                { label: 'Costo hora operador (cambio)', value: stage.calculoLine?.change_labor_hour_cost, prefix: '$' },
                { label: 'Costo hora máquina (cambio)', value: stage.calculoLine?.change_machine_hour_cost, prefix: '$' },
                { label: 'Prep. adicional', value: stage.calculoLine?.change_additional_prep_cost, prefix: '$' },
                { label: 'Operadores', value: stage.calculoLine?.change_operators },
                { label: 'Minutos de cambio', value: stage.calculoLine?.change_time_minutes, suffix: ' min' },
                { label: 'Costo de merma (cambio)', value: stage.calculoLine?.change_waste_cost, prefix: '$' }
            ]},
            { title: 'Precio y condiciones', items: [
                { label: 'Descuento', value: stage.calculoLine?.discount_amount, prefix: '$' },
                { label: 'Impuesto', value: stage.calculoLine?.tax_amount, prefix: '$' },
                { label: '% impuesto', value: stage.calculoLine?.tax_percent, suffix: '%' },
                { label: 'Margen', value: stage.calculoLine?.margin_amount, prefix: '$' },
                { label: 'Total', value: stage.calculoLine?.total_cost, prefix: '$', strong: true },
                { label: 'Total en colones', value: stage.calculoLine?.total_colones, prefix: '₡' },
                { label: 'Precio unitario', value: stage.calculoLine?.unit_price, prefix: '$' },
                { label: 'Precio por millar', value: stage.calculoLine?.precio_millar, prefix: '$' },
                { label: 'Tipo cambio venta', value: stage.calculoLine?.tipo_cambio_venta },
                { label: 'Tipo cambio compra', value: stage.calculoLine?.tipo_cambio_compra },
                { label: '% IVA', value: stage.calculoLine?.porcentaje_iva, suffix: '%' },
                { label: '% imprevistos', value: stage.calculoLine?.porcentaje_imprevistos, suffix: '%' },
                { label: '% financiero', value: stage.calculoLine?.porcentaje_financiero, suffix: '%' },
                { label: '% adicional', value: stage.calculoLine?.porcentaje_adicional, suffix: '%' },
                { label: 'Moneda', value: stage.calculoLine?.moneda },
                { label: 'Condición de pago', value: stage.calculoLine?.condicion_pago },
                { label: 'Costo mínimo', value: stage.calculoLine?.costo_minimo, prefix: '$' }
            ]}
        ], { singleColumn: true })
    }
];

// Un renglón de tiempo por cada proceso que sí se cotizó, en el mismo orden
// de PROCESO_DEFS (Diseño → Empaque), más el total general al final.
function procesoTimesSection(stage) {
    const calc = stage.calculoLine;
    const items = PROCESO_DEFS
        .filter((def) => def.active(calc, stage))
        .map((def) => {
            const t = def.timeField(calc, stage);
            return t ? { label: def.label, value: t.value, suffix: t.suffix } : null;
        })
        .filter(Boolean);
    items.push({ label: 'Total del proceso', value: calc?.tiempo_total_min, suffix: ' min', strong: true });
    return items;
}

function renderFieldsGrid(fields) {
    const rows = (fields || []).filter((i) => i.value !== null && i.value !== undefined && i.value !== '').map(renderFactRow).join('');
    return rows ? `<div class="tz-fact-grid">${rows}</div>` : `<div class="tz-group-empty">Sin datos</div>`;
}

// Detalle completo de un proceso al desplegarlo: si el def define secciones
// (Tintas, Impresión — demasiados campos para una sola grilla plana) se
// agrupan con título, igual que Finanzas; si no, grilla plana simple.
// Siempre el 100% del dato real cotizado para ese proceso, nunca un subconjunto.
function renderProcesoDetail(def, calc, stage, realMinutes) {
    if (typeof def.sections === 'function') return renderSections(def.sections(calc, stage, realMinutes));
    return renderFieldsGrid(def.fields(calc, stage, realMinutes));
}

// Destinatario de Visto Bueno — solo en el detalle, nunca en el resumen.
// Sin dato real (formulario de Muestras/Visto Bueno de la Orden aún vacío)
// se reporta honestamente en vez de inventar un destinatario.
function renderVistoBuenoDetail(vb) {
    if (!vb || !vb.destinatario) return `<div class="tz-group-empty">Sin destinatario de visto bueno registrado</div>`;
    return renderFieldsGrid([
        { label: 'Destinatario', value: vb.destinatario, wide: true },
        { label: 'Contacto', value: vb.contacto },
        { label: 'Teléfono', value: vb.telefono },
        { label: 'Correo', value: vb.correo },
        { label: 'Dirección', value: vb.direccion, wide: true }
    ]);
}

// Galería compacta de los artes reales capturados al completar Diseño/
// Preprensa — imagen de referencia (ya redimensionada por el servidor) + nombre.
function renderArtesGallery(artes) {
    if (!artes.length) return '';
    const items = artes.map((a) => `
        <div style="display:flex;align-items:center;gap:8px;padding:3px 0">
            ${a.imagen_url
                ? `<img src="${esc(a.imagen_url)}" alt="${esc(a.nombre_arte || 'Arte')}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;border:1px solid var(--border);flex-shrink:0">`
                : `<span style="width:40px;height:40px;border-radius:6px;background:var(--bg3);border:1px solid var(--border);flex-shrink:0;display:inline-block"></span>`}
            <span>${esc(a.nombre_arte || 'Sin nombre')}</span>
        </div>
    `).join('');
    return `<div>${items}</div>`;
}

// Rama de procesos del lado Cotización — mismo patrón visual y de conectores
// (tz-group-branch + paintConnectors) que la rama de Orden: cada proceso es
// su propia tarjeta conectada con línea al chip de Planeación, no una lista
// metida dentro del detalle. Mismos campos que en Orden, sin foto (nadie ha
// "marcado" nada todavía), pero con el subtotal de costo de ese proceso —
// dato que la copia de Orden no lleva.
function renderProcesoBranch(stage) {
    const calc = stage.calculoLine;
    const activeDefs = PROCESO_DEFS.filter((def) => def.active(calc, stage));
    if (!activeDefs.length) return '';
    const openKey = __tzOpenProceso.get(stage.key);
    const items = activeDefs.map((def, idx) => {
        const isOpen = openKey === def.key;
        const cost = def.costField(calc, stage);
        const hasCost = cost !== null && cost !== undefined && cost !== '' && Number(cost) !== 0;
        const summaryFields = (def.summary(calc, stage) || []).filter((i) => i.value !== null && i.value !== undefined && i.value !== '');
        const summaryRows = summaryFields.map(renderFactRow).join('');
        return `
            <div class="tz-group-item" style="animation:tz-pop-in .25s ease both;animation-delay:${idx * 60}ms">
                <div class="tz-node-card ${isOpen ? 'is-open' : ''}">
                    <div class="tz-node-head" onclick="toggleProceso('${stage.key}','${def.key}')">
                        <span class="tz-node-icon-wrap">${def.icon}</span>
                        <span class="tz-node-title">${esc(def.label)}</span>
                        ${hasCost ? `<span class="tz-node-badge cost">$${fmtNum(cost)}</span>` : ''}
                        <span class="tz-chevron ${isOpen ? 'open' : ''}">▾</span>
                    </div>
                    ${summaryRows ? `<div class="tz-node-summary">${summaryRows}</div>` : ''}
                    ${isOpen ? `<div class="tz-node-detail">${renderProcesoDetail(def, calc, stage)}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
    return `<div class="tz-group-branch procesos" data-anchor="tz-planeacion-${stage.key}">${items}</div>`;
}

function renderFactRow(i) {
    return `<div class="tz-stage-line${i.strong ? ' tz-fact-strong' : ''}${i.wide ? ' tz-fact-wide' : ''}"><span>${esc(i.label)}</span><span>${esc((i.prefix || '') + fmtNum(i.value) + (i.suffix || ''))}</span></div>`;
}

// Tabla motivo x tinta: una fila por cada tinta/pantone único que aparece en
// CUALQUIER motivo, una columna por motivo (mismo M1/M2/... que el resto de
// la página), celda = cobertura de esa tinta en ese motivo, o "—" si ese
// motivo no la usa (los motivos no siempre comparten las mismas estaciones).
function renderTintaMotivoTable(motivos) {
    if (!motivos.length) return '';
    const TIPO_LABELS = { cmyk: 'CMYK', blanco: 'Blanco', pantone: 'Pantone' };
    const rowKeys = [];
    const rowLabels = {};
    motivos.forEach((m) => {
        (m.tintas || []).filter((t) => t.activo !== false).forEach((t) => {
            const label = t.etiqueta || TIPO_LABELS[t.tipo_tinta] || t.tipo_tinta;
            const key = `${t.tipo_tinta}::${label}`;
            if (!rowLabels[key]) { rowLabels[key] = label; rowKeys.push(key); }
        });
    });
    if (!rowKeys.length) return '';
    const head = `<tr><th>Tinta</th>${motivos.map((m, idx) => `<th>M${idx + 1}</th>`).join('')}</tr>`;
    const body = rowKeys.map((key) => {
        const cells = motivos.map((m) => {
            const t = (m.tintas || []).find((x) => x.activo !== false && `${x.tipo_tinta}::${x.etiqueta || TIPO_LABELS[x.tipo_tinta] || x.tipo_tinta}` === key);
            return `<td>${t ? fmtNum(t.cobertura_pct) + '%' : '—'}</td>`;
        }).join('');
        return `<tr><td>${esc(rowLabels[key])}</td>${cells}</tr>`;
    }).join('');
    return `<div class="tz-table-scroll"><table class="tz-ink-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
}

function renderSections(sections, options = {}) {
    const gridClass = options.singleColumn ? 'tz-fact-grid single-col' : 'tz-fact-grid';
    return sections.map((sec) => {
        // Una sección puede traer HTML propio (p.ej. una tabla) en vez de
        // pares label/value — usado por Tintas para el cruce motivo x tinta.
        const body = sec.html != null ? sec.html : (sec.items || []).filter((i) => i.value !== null && i.value !== undefined && i.value !== '').map(renderFactRow).join('');
        if (!body) return '';
        const wrapped = sec.html != null ? sec.html : `<div class="${gridClass}">${body}</div>`;
        return `
            <div class="tz-group-section">
                <div class="tz-group-section-title">${esc(sec.title)}</div>
                ${wrapped}
            </div>
        `;
    }).filter(Boolean).join('') || `<div class="tz-group-empty">Sin datos</div>`;
}

// Solo un grupo de Cotización puede estar desplegado a la vez, para no
// volverlo voluminoso — abrir uno cierra cualquier otro que estuviera abierto.
// El "data-anchor" (en vez de depender de previousElementSibling) es lo que
// permite que la rama de procesos cuelgue de Planeación específicamente,
// incluso viviendo en una columna aparte — ver renderCotizacionColumn.
function renderCotizacionGroups(stage) {
    const openGroupKey = __tzOpenGroup.get(stage.key);
    const items = COTIZACION_GROUPS.map((group, idx) => {
        const isOpen = openGroupKey === group.key;
        const summaryRows = (group.summaryLines(stage) || []).filter((i) => i.value !== null && i.value !== undefined && i.value !== '').map(renderFactRow).join('');
        const anchorId = group.key === 'planeacion' ? ` id="tz-planeacion-${stage.key}"` : '';
        return `
            <div class="tz-group-item ${isOpen ? 'is-open' : ''}"${anchorId} style="animation:tz-pop-in .25s ease both;animation-delay:${idx * 60}ms">
                <div class="tz-group-row-chip ${isOpen ? 'is-open' : ''}" onclick="toggleGroup('${stage.key}','${group.key}')">
                    <div class="tz-group-row-head">
                        <span class="tz-group-row-icon">${group.icon}</span>
                        <span class="tz-group-row-label">${esc(group.label)}</span>
                    </div>
                    <div class="tz-fact-grid tz-group-row-facts${group.singleColumn ? ' single-col' : ''}">${summaryRows}</div>
                </div>
                ${isOpen ? `
                    <div class="tz-group-detail-inline">
                        ${group.detail(stage)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    return `<div class="tz-group-branch" data-anchor="tz-stage-${stage.key}">${items}</div>`;
}

// Columna de Cotización completa: la rama principal (Proceso/Planeación/
// Finanzas) y, si Planeación está abierta, la rama de procesos AL LADO
// (no metida adentro) — crecen hacia la derecha en una fila propia, para que
// nadie le robe espacio a nadie ni se encimen con lo que viene después
// (la tarjeta de Orden). Ver bug real: antes la rama de procesos vivía
// anidada dentro de la rama principal (padding-left de sobra) y se
// desbordaba encima de Orden.
function renderCotizacionColumn(stage) {
    const mainBranch = renderCotizacionGroups(stage);
    const procesosBranch = __tzOpenGroup.get(stage.key) === 'planeacion' ? renderProcesoBranch(stage) : '';
    if (!procesosBranch) return mainBranch;
    return `<div class="tz-branch-row">${mainBranch}${procesosBranch}</div>`;
}

// Rama de Orden — un punto por cada proceso real de producción
// (production_order_routes), en el mismo patrón que Cotización: resumen
// compacto, un solo proceso desplegado a la vez, línea "caminando" para el
// que está en curso ahora mismo.
function durationMinutes(startVal, endVal) {
    if (!startVal || !endVal) return null;
    const start = new Date(startVal), end = new Date(endVal);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.round((end.getTime() - start.getTime()) / 60000);
}

// Duración REAL de la cadena de procesos "en línea": el fin de un proceso ES
// el inicio del siguiente — no existe (ni se necesita) un timestamp de inicio
// propio por proceso. Aclaración real del usuario: esto revela cuellos de
// botella y tiempos muertos reales, por eso puede diferir mucho de lo
// cotizado — es intencional, no un error de datos. Tintas y Sellos corren
// en paralelo a la cadena y no cuentan (ni consumen ni proveen fin de cadena).
const PARALLEL_PROCESS_KEYS = new Set(['tintas', 'sellos']);
function computeRealDurations(routesSortedBySequence) {
    const chain = routesSortedBySequence.filter((r) => !PARALLEL_PROCESS_KEYS.has(r.process_key));
    const durations = new Map();
    let prevEnd = null;
    chain.forEach((r) => {
        if (r.actual_end_at && prevEnd) durations.set(r.route_id, durationMinutes(prevEnd, r.actual_end_at));
        if (r.actual_end_at) prevEnd = r.actual_end_at;
    });
    return durations;
}

// Fila comparativa cotizado vs. real de un proceso en la Orden. Sin dato
// cotizado (Visto bueno, Planeación, Salida de inventario no son procesos
// cotizables) solo se muestra el real. Tintas/Sellos no aplican (paralelos).
function renderTiempoComparativo(def, calc, stage, route, realMinutes) {
    if (PARALLEL_PROCESS_KEYS.has(route.process_key)) return '';
    const quoted = def ? def.timeField(calc, stage) : null;
    const quotedMinutes = quoted != null && quoted.value != null ? Number(quoted.value) * (quoted.suffix === ' h' ? 60 : 1) : null;
    if (quoted == null && realMinutes == null && !route.actual_end_at) return '';
    const rows = [];
    if (quoted) rows.push(`<div class="tz-stage-line"><span>Tiempo cotizado</span><span>${fmtNum(quoted.value)}${esc(quoted.suffix || '')}</span></div>`);
    if (realMinutes != null) {
        rows.push(`<div class="tz-stage-line tz-fact-strong"><span>Tiempo real</span><span>${fmtNum(realMinutes)} min</span></div>`);
    } else if (!route.actual_end_at) {
        rows.push(`<div class="tz-stage-line"><span>Tiempo real</span><span>Aún no completado</span></div>`);
    } else {
        rows.push(`<div class="tz-stage-line"><span>Tiempo real</span><span>Sin proceso anterior de la cadena para comparar</span></div>`);
    }
    if (quotedMinutes != null && quotedMinutes > 0 && realMinutes != null) {
        const deltaMin = realMinutes - quotedMinutes;
        const deltaPct = Math.round((deltaMin / quotedMinutes) * 100);
        const sign = deltaMin >= 0 ? '+' : '−';
        rows.push(`<div class="tz-stage-line tz-fact-strong"><span>Diferencia</span><span>${sign}${fmtNum(Math.abs(deltaMin))} min (${sign}${Math.abs(deltaPct)}%)</span></div>`);
    }
    return `<div class="tz-node-summary tz-tiempo-real">${rows.join('')}</div>`;
}

// Tarjeta-acordeón por proceso de la orden (mismo componente .tz-node-card
// que usan las tarjetas de proceso de Cotización): repleg­ada muestra
// icono + nombre + un resumen de 1-2 datos cotizados + estado corto. Al
// tocarla, si ya fue marcada aparece la foto del operario (mismo tamaño/
// borde que el avatar de detalle de usuario en Configuración → Seguridad →
// Usuarios) con quién y cuándo la marcó; y siempre aparece el detalle
// completo que se cotizó para ese proceso — igual, campo por campo, que en
// Cotización, pero sin subtotal (esto es informativo de producción).
function renderOrdenGroups(stage) {
    const calc = stage.calculoLine;
    // El orden de exhibición y el de la cadena de tiempo real usan
    // PRODUCTION_ORDER_SEQUENCE (el flujo real), no sequence_order de la BD.
    const sorted = [...stage.routes].sort((a, b) => productionOrderRank(a.process_key) - productionOrderRank(b.process_key));
    // Solo se muestran los procesos que sí fueron cotizados (def.active) —
    // un proceso cotizable sin check (p.ej. Laminado sin material) no debe
    // aparecer aunque exista su fila de tracking en production_order_routes.
    // Los pasos administrativos (Visto bueno, Planeación, Salida de
    // inventario) no son cotizables y siempre se muestran. La cadena de
    // tiempo real (computeRealDurations) sí usa TODAS las rutas — un proceso
    // no cotizado pero presente igual cuenta como referencia de fin/inicio.
    const visibleRoutes = sorted.filter((route) => {
        const def = PROCESO_DEFS.find((d) => d.key === route.process_key);
        return !def || def.active(calc, stage);
    });
    const photos = stage.operatorPhotos || {};
    const openRoute = __tzOpenRoute.get(stage.key);
    const realDurations = computeRealDurations(sorted);
    const items = visibleRoutes.map((route, idx) => {
        const meta = ORDEN_PROCESS_META[route.process_key] || { icon: '⚙️', label: route.process_name || route.process_key };
        const cls = routeStatusClass(route.route_status);
        const events = eventsForRoutes(__tzData, [route.route_id]);
        const lastEvent = events[events.length - 1];
        const responsable = lastEvent?.operator_name || null;
        const when = lastEvent?.created_at || route.actual_start_at || route.planned_start_at;
        const realMinutes = realDurations.has(route.route_id) ? realDurations.get(route.route_id) : null;
        const isOpen = openRoute === route.route_id;
        const def = PROCESO_DEFS.find((d) => d.key === route.process_key);

        const lines = [];
        if (when) lines.push(fmtDateTime(when));
        if (realMinutes !== null) lines.push(`Tiempo real: ${fmtNum(realMinutes)} min`);
        if (route.machine_name) lines.push(route.machine_name);

        const badge = cls === 'done' ? '✓' : (cls === 'incidencia' ? '!' : '');
        const badgeClass = cls === 'done' ? 'ok' : (cls === 'incidencia' ? 'bad' : '');
        const statusText = responsable ? esc(responsable) : (cls === 'incidencia' ? 'Incidencia' : (cls === 'in_progress' ? 'En proceso' : 'Pendiente'));

        // "De oficina" (Creación de Orden → Solicitud → Seguimiento → Diseño →
        // Preprensa → Visto Bueno): el resumen SIEMPRE es foto + nombre + fecha
        // de la marca + duración — nunca datos cotizados (aclaración real del
        // usuario). El resto de procesos conserva su resumen cotizado de siempre.
        const isOficina = OFICINA_PROCESS_KEYS.has(route.process_key);
        const summaryFields = (!isOficina && def) ? (def.summary(calc, stage) || []).filter((i) => i.value !== null && i.value !== undefined && i.value !== '') : [];
        const summaryRows = summaryFields.map(renderFactRow).join('');
        const personSummaryHtml = isOficina ? `
            <div class="tz-node-summary tz-orden-person-summary">
                <div class="tz-orden-card-body-top">
                    ${responsable
                        ? `<div class="tz-orden-avatar-wrap tz-orden-avatar-wrap-sm">${renderAvatar(responsable, photos[responsable], 40)}${badge ? `<span class="tz-orden-avatar-badge ${badgeClass}">${badge}</span>` : ''}</div>`
                        : `<div class="tz-orden-avatar-wrap tz-orden-avatar-wrap-sm"><span class="tz-avatar tz-avatar-fallback" style="width:40px;height:40px;font-size:15px">—</span></div>`}
                    <div class="tz-orden-lines">
                        <div class="tz-orden-name">${responsable ? esc(responsable) : (cls === 'done' ? 'Registro automático' : 'Sin marcar todavía')}</div>
                        <div class="tz-orden-line">${when ? esc(fmtDateTime(when)) : '—'}${realMinutes != null ? ' · ' + fmtNum(realMinutes) + ' min' : ''}</div>
                    </div>
                </div>
            </div>
        ` : '';
        // Cotizado vs. real solo tiene sentido cuando existe un dato cotizado
        // contra el cual comparar (def) — para los hitos administrativos sin
        // cotización la duración ya vive en el resumen de arriba.
        const tiempoComparativoHtml = def ? renderTiempoComparativo(def, calc, stage, route, realMinutes) : '';

        const vistoBuenoDetailHtml = route.process_key === 'visto_bueno' ? renderVistoBuenoDetail(stage.vistoBueno) : null;
        const detailHtml = def
            ? renderProcesoDetail(def, calc, stage, realMinutes)
            : (vistoBuenoDetailHtml || `<div class="tz-group-empty">Sin información para este proceso</div>`);

        const bodyHtml = isOpen ? `
            <div class="tz-node-detail">
                ${(responsable && !isOficina) ? `
                    <div class="tz-orden-card-body-top">
                        <div class="tz-orden-avatar-wrap">${renderAvatar(responsable, photos[responsable], 88)}${badge ? `<span class="tz-orden-avatar-badge ${badgeClass}">${badge}</span>` : ''}</div>
                        <div class="tz-orden-lines">
                            <div class="tz-orden-name">${esc(responsable)}</div>
                            ${lines.map((l) => `<div class="tz-orden-line">${esc(l)}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${detailHtml}
            </div>
        ` : '';

        return `
            <div class="tz-group-item ${cls === 'in_progress' ? 'is-marching' : ''}" style="animation:tz-pop-in .25s ease both;animation-delay:${idx * 60}ms">
                <div class="tz-node-card ${cls === 'in_progress' ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}">
                    <div class="tz-node-head" onclick="toggleRoute('${stage.key}','${route.route_id}')">
                        <span class="tz-node-icon-wrap">${meta.icon}</span>
                        <span class="tz-node-title">${esc(meta.label)}</span>
                        <span class="tz-node-badge st-${cls}">${statusText}</span>
                        <span class="tz-chevron ${isOpen ? 'open' : ''}">▾</span>
                    </div>
                    ${summaryRows ? `<div class="tz-node-summary">${summaryRows}</div>` : ''}
                    ${personSummaryHtml}
                    ${tiempoComparativoHtml}
                    ${bodyHtml}
                </div>
            </div>
        `;
    }).join('');
    const hasMarching = visibleRoutes.some((r) => routeStatusClass(r.route_status) === 'in_progress');
    return `<div class="tz-group-branch narrow${hasMarching ? ' has-marching' : ''}" data-anchor="tz-stage-${stage.key}">${items}</div>`;
}

// Tintas Proceso = estaciones CMYK activas del motivo; Tinta Directo = el
// resto (pantone/blanco activas). No hay desglose por versión en la BD —
// todas las versiones de un motivo comparten las mismas estaciones de tinta,
// así que se repite el mismo conteo bajo cada versión (fiel al dato real).
function motivoInkCounts(motivo) {
    const activos = (motivo.tintas || []).filter((t) => t.activo !== false);
    const proceso = activos.filter((t) => t.tipo_tinta === 'cmyk').length;
    const directo = activos.length - proceso;
    return { proceso, directo, total: activos.length };
}

// De dónde salen los sellos: el total (motivo.sellos) es un dato real
// guardado por motivo, pero no venía desglosado. Deducido y verificado contra
// datos reales: cada estación de tinta de proceso (CMYK) usa 1 sello, y si
// hay barniz activo se suma 1 sello más por motivo — lo que no se puede
// atribuir con certeza (troquelado NO usa sello, usa el troquel físico) se
// muestra como "otras" en vez de inventar a qué acabado pertenece.
function sellosBreakdown(calc, stage) {
    const motivos = stage?.motivos || [];
    const total = motivos.reduce((s, m) => s + Number(m.sellos || 0), 0);
    const deTintas = motivos.reduce((s, m) => s + motivoInkCounts(m).proceso, 0);
    const barnizActive = isBarnizActive(calc);
    const deBarniz = barnizActive ? Math.min(motivos.length, Math.max(0, total - deTintas)) : 0;
    const otras = Math.max(0, total - deTintas - deBarniz);
    return { total, deTintas, deBarniz, otras };
}

// Cada motivo es su propio acordeón (solo uno abierto a la vez, igual que el
// resto de la página): al tocarlo despliega sus versiones, y cada versión
// muestra su árbol de tintas/sellos + el espacio reservado para su imagen.
// El resumen total (tintas y sellos) solo aparece aquí, con el grupo
// Proceso ya desplegado — nunca en el resumen colapsado.
function renderProcesoGroupDetail(stage) {
    if (!stage.motivos.length) return `<div class="tz-group-empty">Sin motivos registrados</div>`;
    const openMotivo = __tzOpenMotivo.has(stage.key) ? __tzOpenMotivo.get(stage.key) : null;

    const items = stage.motivos.map((m, idx) => {
        const isOpen = m.motivo_indice === openMotivo;
        const ink = motivoInkCounts(m);
        return `
            <div class="tz-proceso-motivo ${isOpen ? 'is-open' : ''}">
                <div class="tz-proceso-motivo-head" onclick="toggleMotivo('${stage.key}',${m.motivo_indice})">
                    <span class="tz-chevron ${isOpen ? 'open' : ''}">▾</span>
                    <span class="tz-proceso-motivo-title">Motivo ${idx + 1} — ${esc(m.nombre || `Motivo ${idx + 1}`)} — ${fmtNum(m.cantidad)} Unidades — ${ink.total} Tintas</span>
                </div>
                ${isOpen ? renderMotivoVersiones(m, ink) : ''}
            </div>
        `;
    }).join('');

    const totals = stage.motivos.reduce((acc, m) => {
        const ink = motivoInkCounts(m);
        acc.proceso += ink.proceso;
        acc.directo += ink.directo;
        acc.sellos += Number(m.sellos || 0);
        return acc;
    }, { proceso: 0, directo: 0, sellos: 0 });

    const summaryHtml = `
        <div class="tz-proceso-summary">
            <div class="tz-stage-line tz-fact-strong"><span>Total Tintas</span><span>${totals.proceso + totals.directo} Tintas (${totals.proceso} Proceso - ${totals.directo} Directo)</span></div>
            <div class="tz-stage-line tz-fact-strong"><span>Total Sellos</span><span>${fmtNum(totals.sellos)} Sellos</span></div>
        </div>
    `;

    return `<div class="tz-proceso-motivos">${items}</div>${summaryHtml}`;
}

function renderMotivoVersiones(motivo, ink) {
    if (!motivo.versiones.length) return `<div class="tz-group-empty">Sin versiones registradas</div>`;
    return motivo.versiones.map((v) => `
        <div class="tz-proceso-version">
            <div class="tz-tree">
                <div class="tz-tree-root">
                    <span class="tz-tree-root-dot"></span>
                    <span>${esc(v.nombre || 'Versión')}</span>
                    ${v.cantidad != null ? `<span class="tz-tree-root-meta">${fmtNum(v.cantidad)} uds</span>` : ''}
                </div>
                <div class="tz-tree-branch">
                    <div class="tz-tree-row"><span class="tz-tree-value">${ink.proceso}</span><span class="tz-tree-tag">Tintas Proceso</span></div>
                    <div class="tz-tree-row"><span class="tz-tree-value">${ink.directo}</span><span class="tz-tree-tag">Tinta Directo</span></div>
                    <div class="tz-tree-row"><span class="tz-tree-value">${fmtNum(motivo.sellos)}</span><span class="tz-tree-tag">Sellos</span></div>
                </div>
            </div>
            <div class="tz-proceso-image-placeholder">Imagen</div>
        </div>
    `).join('');
}

function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase();
}
function renderAvatar(name, photoUrl, size) {
    const px = size || 20;
    if (photoUrl) return `<img class="tz-avatar" src="${esc(photoUrl)}" alt="${esc(name)}" style="width:${px}px;height:${px}px">`;
    return `<span class="tz-avatar tz-avatar-fallback" style="width:${px}px;height:${px}px;font-size:${Math.round(px * 0.4)}px">${esc(initials(name))}</span>`;
}

function renderEventRow(ev, photos) {
    const action = String(ev.event_type || '').toUpperCase();
    const label = { START: 'inició', RUN: 'inició', SETUP: 'preparó', PARO: 'reportó paro', RESUME: 'reanudó', COMPLETADO: 'completó', COMPLETE: 'completó' }[action] || action.toLowerCase();
    const who = ev.operator_name || 'Sistema';
    const extra = ev.stop_reason ? ` — ${esc(ev.stop_reason)}` : (ev.notes ? ` — ${esc(ev.notes)}` : '');
    const avatar = ev.operator_name && photos ? renderAvatar(who, photos[who], 18) : '';
    return `<div class="tz-event-row">${avatar}<span class="tz-event-time">${fmtTime(ev.created_at)}</span><span class="tz-event-msg"><b>${esc(who)}</b> ${label}${extra}</span></div>`;
}

function renderMap(stages) {
    const track = document.getElementById('tzMapTrack');
    const focusKey = focusStageKey();
    const parts = [];
    stages.forEach((stage, idx) => {
        if (idx > 0) parts.push(`<div class="tz-stage-connector"></div>`);
        parts.push(renderStageCard(stage, stage.key === focusKey, __tzOpenCards.has(stage.key)));
        if ((stage.key === 'cotizacion' || stage.key === 'producto') && __tzOpenCards.has(stage.key) && (stage.motivos.length || stage.calculoLine)) {
            parts.push(renderCotizacionColumn(stage));
        }
        if (stage.key === 'orden' && __tzOpenCards.has('orden') && stage.routes.length) {
            parts.push(renderOrdenGroups(stage));
        }
    });
    track.innerHTML = parts.join('');
    paintConnectors();
    centerMapScroll();
}

// El track se centra con flexbox (align-items/justify-content:center), pero
// eso solo centra dentro de su propia caja — cuando el contenido crece más
// alto/ancho que el viewport visible, el scroll (que .tz-map-scroll ya tenía
// de antes, p.ej. al abrir Planeación) se queda donde estaba y de golpe deja
// de coincidir con el centro real. Bug real reportado: "al abrir Planeación
// todo se va para arriba, al reducirla se vuelve a centrar". Se recalcula
// después de cada render para que el centro visual y el scroll siempre
// coincidan, crezca lo que crezca.
function centerMapScroll() {
    const scrollEl = document.querySelector('.tz-map-scroll');
    const trackEl = document.getElementById('tzMapTrack');
    if (!scrollEl || !trackEl) return;
    const trackRect = trackEl.getBoundingClientRect();
    if (trackRect.height > scrollEl.clientHeight) {
        scrollEl.scrollTop = (trackRect.height - scrollEl.clientHeight) / 2;
    }
    if (trackRect.width > scrollEl.clientWidth) {
        scrollEl.scrollLeft = (trackRect.width - scrollEl.clientWidth) / 2;
    }
}

// ----------------------------------------------------------------------
// Conectores — SVG real (no trucos de CSS), reutilizable para cualquier
// rama futura: tronco vertical + un codo redondeado por punto, terminado
// en punta de flecha. Se recalcula después de cada render porque las
// tarjetas tienen alturas variables (no se puede adivinar con CSS fijo).
// ----------------------------------------------------------------------
// Codo de una sola curva: sale horizontal desde (x1,y1) y termina justo
// SOBRE el tronco vertical (x=turnX, y=y2) — por eso no hay segmento final
// "de más": la curva desemboca directo en la línea del tronco.
function elbowToTrunk(x1, y1, turnX, y2, r) {
    if (Math.abs(y2 - y1) < 0.5) return `M${x1},${y1} L${turnX},${y2}`;
    const vSign = y2 > y1 ? 1 : -1;
    const rr = Math.max(0, Math.min(r, Math.abs(y2 - y1), Math.abs(turnX - x1) || r));
    return `M${x1},${y1} L${turnX - rr},${y1} Q${turnX},${y1} ${turnX},${y1 + vSign * rr} L${turnX},${y2}`;
}

let __tzSvgSeq = 0;
function markerDefs(seq) {
    return `<defs>
        <marker id="tzArrowDefault${seq}" class="tz-arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z"/></marker>
        <marker id="tzArrowActive${seq}" class="tz-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z"/></marker>
    </defs>`;
}
function makeSvg(width, height, innerHtml) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tz-connector-svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.innerHTML = innerHtml;
    return svg;
}

// Un solo sistema de conectores para TODO: la flecha entre Cotización y
// Orden (nivel principal) y las ramas dentro de cada una usan exactamente
// el mismo SVG punteado con la misma punta de flecha — nunca dos sistemas
// distintos conviviendo (esa mezcla fue el bug: una flecha de texto verde
// suelta al lado de las ramas ya migradas a SVG).
function paintConnectors() {
    document.querySelectorAll('.tz-group-branch').forEach((branchEl) => {
        const items = [...branchEl.children].filter((c) => c.classList.contains('tz-group-item'));
        if (!items.length) return;
        const seq = __tzSvgSeq++;
        const sourceEl = branchEl.dataset.anchor ? document.getElementById(branchEl.dataset.anchor) : branchEl.previousElementSibling;
        const branchRect = branchEl.getBoundingClientRect();
        const TRUNK_X = 24;
        const CARD_X = 68;

        const itemPoints = items.map((item) => ({
            y: item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2 - branchRect.top,
            marching: item.classList.contains('is-marching')
        }));

        // Entrada + tronco van en UN SOLO trazo (un solo "d"): si fueran dos
        // <path> separados, cada uno reinicia su propio patrón de puntos
        // desde cero, y justo donde se unen (a la altura del primer punto)
        // el punteado se ve apretado/doble. Con un solo trazo el punteado
        // es continuo de principio a fin.
        let paths = '';
        const trunkTail = itemPoints.length > 1 ? ` L${TRUNK_X},${itemPoints[itemPoints.length - 1].y}` : '';
        if (sourceEl) {
            const sRect = sourceEl.getBoundingClientRect();
            const sX = sRect.right - branchRect.left;
            const sY = sRect.top + sRect.height / 2 - branchRect.top;
            paths += `<path d="${elbowToTrunk(sX, sY, TRUNK_X, itemPoints[0].y, 6)}${trunkTail}"/>`;
        } else if (trunkTail) {
            paths += `<path d="M${TRUNK_X},${itemPoints[0].y}${trunkTail}"/>`;
        }
        itemPoints.forEach((p) => {
            const marker = p.marching ? `tzArrowActive${seq}` : `tzArrowDefault${seq}`;
            paths += `<path class="${p.marching ? 'is-marching' : ''}" marker-end="url(#${marker})" d="M${TRUNK_X},${p.y} L${CARD_X},${p.y}"/>`;
        });

        const svg = makeSvg(branchRect.width, branchRect.height, markerDefs(seq) + paths);
        branchEl.insertBefore(svg, branchEl.firstChild);
    });

    document.querySelectorAll('.tz-stage-connector').forEach((connEl) => {
        const prev = connEl.previousElementSibling;
        const next = connEl.nextElementSibling;
        if (!prev || !next) return;
        const seq = __tzSvgSeq++;
        const connRect = connEl.getBoundingClientRect();
        const pRect = prev.getBoundingClientRect();
        const nRect = next.getBoundingClientRect();
        const rawY1 = pRect.top + pRect.height / 2 - connRect.top;
        const rawY2 = nRect.top + nRect.height / 2 - connRect.top;
        const svgTop = Math.min(0, Math.min(rawY1, rawY2) - 10);
        const y1 = rawY1 - svgTop, y2 = rawY2 - svgTop;
        const marching = next.classList.contains('st-in_progress');
        const marker = marching ? `tzArrowActive${seq}` : `tzArrowDefault${seq}`;
        const path = `<path class="${marching ? 'is-marching' : ''}" marker-end="url(#${marker})" d="${elbowToTrunk(0, y1, connRect.width - 10, y2, 12)}"/>`;
        const svgHeight = Math.max(connRect.height, Math.abs(rawY2 - rawY1) + 20);
        const svg = makeSvg(connRect.width, svgHeight, markerDefs(seq) + path);
        svg.style.top = `${svgTop}px`;
        connEl.appendChild(svg);
    });
}

window.toggleCard = function (key) {
    if (__tzOpenCards.has(key)) __tzOpenCards.delete(key); else __tzOpenCards.add(key);
    renderMap(buildStages(__tzData));
};
window.toggleMotivo = function (stageKey, motivoIndice) {
    event?.stopPropagation?.();
    const current = __tzOpenMotivo.get(stageKey);
    if (current === motivoIndice) __tzOpenMotivo.delete(stageKey);
    else __tzOpenMotivo.set(stageKey, motivoIndice);
    renderMap(buildStages(__tzData));
};
window.toggleGroup = function (stageKey, groupKey) {
    event?.stopPropagation?.();
    const current = __tzOpenGroup.get(stageKey);
    if (current === groupKey) __tzOpenGroup.delete(stageKey);
    else __tzOpenGroup.set(stageKey, groupKey);
    renderMap(buildStages(__tzData));
};
window.toggleProceso = function (stageKey, procesoKey) {
    event?.stopPropagation?.();
    const current = __tzOpenProceso.get(stageKey);
    if (current === procesoKey) __tzOpenProceso.delete(stageKey);
    else __tzOpenProceso.set(stageKey, procesoKey);
    renderMap(buildStages(__tzData));
};
window.toggleRoute = function (stageKey, routeId) {
    event?.stopPropagation?.();
    const current = __tzOpenRoute.get(stageKey);
    if (current === routeId) __tzOpenRoute.delete(stageKey);
    else __tzOpenRoute.set(stageKey, routeId);
    renderMap(buildStages(__tzData));
};

async function init() {
    if (!focusEntityId) {
        document.getElementById('tzLoading').hidden = true;
        const empty = document.getElementById('tzEmptyState');
        empty.hidden = false;
        empty.innerHTML = `<div class="tz-empty-icon">🔍</div>No se especificó una entidad.<br>Usa: ?entityType=product&entityId=PT-00184`;
        return;
    }
    try {
        const data = await fetchTrazabilidad();
        __tzData = data;
        document.getElementById('tzLoading').hidden = true;

        if (!data.quote && !data.product && !data.orders.length) {
            const empty = document.getElementById('tzEmptyState');
            empty.hidden = false;
            empty.innerHTML = `<div class="tz-empty-icon">🔍</div>No se encontró información para esta entidad.`;
            return;
        }

        document.getElementById('tzMapWrap').hidden = false;
        const stages = buildStages(data);
        renderHeader(data, stages);
        renderMap(stages);
    } catch (e) {
        document.getElementById('tzLoading').hidden = true;
        const empty = document.getElementById('tzEmptyState');
        empty.hidden = false;
        empty.innerHTML = `<div class="tz-empty-icon">⚠️</div>${esc(e.message)}`;
    }
}

init();
