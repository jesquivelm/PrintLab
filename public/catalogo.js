const catalogTitle = document.getElementById('catalogTitle');
const catalogSubtitle = document.getElementById('catalogSubtitle');
const catalogHead = document.getElementById('catalogHead');
const catalogBody = document.getElementById('catalogBody');
const catalogSearch = document.getElementById('catalogSearch');
const catalogSearchButton = document.getElementById('catalogSearchButton');
const catalogStatus = document.getElementById('catalogStatus');
const companyLogo = document.getElementById('companyLogo');
const brandFallback = document.getElementById('brandFallback');
const catalogForm = document.getElementById('catalogForm');
const editorTitle = document.getElementById('editorTitle');
const catalogNewButton = document.getElementById('catalogNewButton');
const catalogSaveButton = document.getElementById('catalogSaveButton');
const catalogImportSapButton = document.getElementById('catalogImportSapButton');
const catalogRefreshButton = document.getElementById('catalogRefreshButton');
const catalogImportSapStatus = document.getElementById('catalogImportSapStatus');
const catalogImportButton = document.getElementById('catalogImportButton');
const catalogExportButton = document.getElementById('catalogExportButton');
const catalogBackButton = document.getElementById('catalogBackButton');
const catalogImportInput = document.getElementById('catalogImportInput');
const catalogHeaderSearchButton = document.getElementById('catalogHeaderSearchButton');
const catalogMenuToggle = document.getElementById('catalogMenuToggle');
const catalogMenuPanel = document.getElementById('catalogMenuPanel');
const catalogDetailPreview = document.getElementById('catalogDetailPreview');
const catalogTableWrap = document.querySelector('.inventory-table-wrap');
const catalogScrollBottomIndicator = document.getElementById('catalogScrollBottomIndicator');
const inventoryToolbarShell = document.querySelector('.inventory-toolbar-shell');
const inventoryActions = document.querySelector('.inventory-actions');
const inventoryPanelHead = document.querySelector('.inventory-panel-head');
const inventoryEditorPanel = document.querySelector('.inventory-editor-panel');
const catalogImportSapPopover = document.getElementById('catalogImportSapPopover');
const cerrarCatalogImportSapPopoverButton = document.getElementById('cerrarCatalogImportSapPopoverButton');
const cancelarCatalogImportSapPopoverButton = document.getElementById('cancelarCatalogImportSapPopoverButton');
const ejecutarCatalogImportSapButton = document.getElementById('ejecutarCatalogImportSapButton');
const catalogImportSapPopoverSummary = document.getElementById('catalogImportSapPopoverSummary');
const catalogImportSapLimitInput = document.getElementById('catalogImportSapLimitInput');
const catalogImportSapPopoverStatus = document.getElementById('catalogImportSapPopoverStatus');
let companyConfig = null;
let catalogSapImportDiagnosis = null;
let catalogVisibleCount = 0;

function formatVisibleCountLabel(count, noun) {
    const total = Math.max(0, Number(count) || 0);
    return `${total} ${noun}${total === 1 ? '' : 's'} mostrados`;
}

function updateCatalogScrollBottomIndicator() {
    if (!catalogTableWrap || !catalogScrollBottomIndicator) return;
    const hasScrollableContent = catalogTableWrap.scrollHeight - catalogTableWrap.clientHeight > 6;
    const distanceToBottom = catalogTableWrap.scrollHeight - catalogTableWrap.scrollTop - catalogTableWrap.clientHeight;
    const shouldShow = catalogVisibleCount > 0 && (!hasScrollableContent || distanceToBottom <= 8);
    catalogScrollBottomIndicator.textContent = formatVisibleCountLabel(catalogVisibleCount, 'registro');
    catalogScrollBottomIndicator.classList.toggle('is-visible', shouldShow);
}

function resolveRouteConfig() {
    const routeMap = {
        '/inventario-materiales': 'materiales',
        '/inventario-troqueles': 'troqueles',
        '/inventario-maquinas': 'maquinas',
        '/inventario-procesos': 'procesos',
        '/inventario-tipos-salida': 'tipos-salida'
    };

    const pageConfig = {
        materiales: {
            presentationKey: 'inventario-mp',
            title: 'Inventario | Materia Prima',
            subtitle: 'Materia prima para cálculos y cotizaciones',
            endpoint: '/api/inventario/materiales',
            exportEndpoint: '/api/inventario/materiales/export',
            importEndpoint: '/api/inventario/materiales/import',
            columns: [
                { key: 'codigo', label: 'Código', width: '148px', className: 'inventory-col-code inventory-col-code-material' },
                { key: 'nombre', label: 'Nombre', className: 'inventory-col-name inventory-col-name-material' },
                { key: 'familia_proceso', label: 'Proceso', width: '180px', className: 'inventory-col-process inventory-col-process-material' },
                { key: 'clasificacion', label: 'Clasificación', width: '180px', className: 'inventory-col-process inventory-col-classification-material' },
                { key: 'precio_unitario', label: 'Precio Unitario', width: '130px', className: 'inventory-col-number', format: (v, item) => { const p = parseFloat(item?.costo_x_pie); if (Number.isFinite(p) && p > 0) return '$' + p.toFixed(6).replace(/\.?0+$/, ''); return ''; }, tooltip: (v, item) => { const p = parseFloat(item?.costo_x_pie); if (Number.isFinite(p) && p > 0) return '$' + p.toFixed(6).replace(/\.?0+$/, '') + ' /pie'; return ''; } },
                { key: 'costo_x_pie', label: 'Costo / Pie', width: '130px', className: 'inventory-col-number', format: (v, item) => { const p = parseFloat(v); if (Number.isFinite(p) && p > 0) return '$' + p.toFixed(6).replace(/\.?0+$/, ''); const m2 = parseFloat(item?.costo_x_m2); const a = parseFloat(item?.ancho_mm); if (Number.isFinite(m2) && m2 > 0 && Number.isFinite(a) && a > 0) { const calc = m2 * (a / 1000); return '$' + calc.toFixed(6).replace(/\.?0+$/, '') } return ''; }, tooltip: (v, item) => { const p = parseFloat(v); if (Number.isFinite(p) && p > 0) return '$' + p.toFixed(6).replace(/\.?0+$/, '') + ' /pie'; const m2 = parseFloat(item?.costo_x_m2); const a = parseFloat(item?.ancho_mm); if (Number.isFinite(m2) && m2 > 0 && Number.isFinite(a) && a > 0) { const calc = m2 * (a / 1000); return '$' + calc.toFixed(6).replace(/\.?0+$/, '') + ' /pie (calculado)' } return ''; } },
                { key: 'costo_x_metro', label: 'Costo / Metro', width: '130px', className: 'inventory-col-number', format: (v, item) => { const m = parseFloat(v); if (Number.isFinite(m) && m > 0) return '$' + m.toFixed(6).replace(/\.?0+$/, ''); const p = parseFloat(item?.costo_x_pie); if (Number.isFinite(p) && p > 0) { const calc = p / 0.3048; return '$' + calc.toFixed(6).replace(/\.?0+$/, '') } return ''; }, tooltip: (v, item) => { const m = parseFloat(v); if (Number.isFinite(m) && m > 0) return '$' + m.toFixed(6).replace(/\.?0+$/, '') + ' /m'; const p = parseFloat(item?.costo_x_pie); if (Number.isFinite(p) && p > 0) { const calc = p / 0.3048; return '$' + calc.toFixed(6).replace(/\.?0+$/, '') + ' /m (calculado)' } return ''; } }
            ],
            formFields: [
                { key: 'id', type: 'hidden' },
                { key: 'codigo', label: 'Código', type: 'text' },
                { key: 'nombre', label: 'Nombre', type: 'text' }
            ],
            createEmptyItem() {
                return {
                    codigo: '',
                    nombre: '',
                    nombre_comercial: '',
                    ancho_mm: 0,
                    largo_mm: '',
                    gramaje_g_m2: '',
                    calibre_micras: '',
                    costo_x_lamina: '',
                    costo_x_msi: 0,
                    costo_x_m2: 0,
                    costo_x_kg: 0,
                    costo_x_libra: '',
                    peso_capa_gsm: '',
                    comentario_ancho_mm: '',
                    comentario_largo_mm: '',
                    comentario_gramaje_g_m2: '',
                    comentario_calibre_micras: '',
                    comentario_costo_x_lamina: '',
                    comentario_costo_x_msi: '',
                    comentario_costo_x_m2: '',
                    comentario_costo_x_kg: '',
                    comentario_costo_x_libra: '',
                    comentario_peso_capa_gsm: '',
                    comentario_rendimiento_g_ft2: '',
                    comentario_compatible_convencional: '',
                    comentario_compatible_digital: '',
                    comentario_tipo_proforma: '',
                    familia_proceso: '',
                    clasificacion: '',
                    costo_x_unidad: '',
                    costo_x_pie: 0,
                    costo_x_metro: 0,
                    merma_pct: '',
                    rendimiento_g_ft2: '',
                    temperatura_aplicacion_c: '',
                    tipo_transferencia: '',
                    tipo_superficie: '',
                    requiere_premier: false,
                    premier_preaplicado: false,
                    premier_consumo_g_m2: 0.65,
                    premier_costo_x_kg: 0,
                    premier_costo_x_m2: 0,
                    tipo_proforma: '',
                    compatible_convencional: true,
                    compatible_digital: true,
                    activo: true
                };
            }
        },
        troqueles: {
            presentationKey: 'inventario-troqueles',
            title: 'Inventario | Troqueles',
            subtitle: '',
            endpoint: '/api/inventario/troqueles',
            exportEndpoint: '/api/inventario/troqueles/export',
            importEndpoint: '/api/inventario/troqueles/import',
            columns: [
                ['codigo', 'Código'],
                ['descripcion', 'Descripción'],
                ['ancho_etiqueta_in', 'Ancho in'],
                ['largo_etiqueta_in', 'Largo in'],
                ['desarrollo_in', 'Desarrollo'],
                ['elongacion_pct', 'Elongación %'],
                ['ancho_total_troquel_in', 'Ancho Total Troquel'],
                ['largo_total_troquel_in', 'Largo Total Troquel'],
                ['dientes', 'Dientes'],
                ['cantidad_filas', 'Filas'],
                ['repeticiones', 'Repeticiones'],
                ['activo', 'Activo']
            ],
            formFields: [
                { key: 'id', type: 'hidden' },
                { type: 'section', label: 'Identificación', span: 2 },
                { key: 'codigo', label: 'Código', type: 'text' },
                { key: 'descripcion', label: 'Descripción', type: 'text' },
                { key: 'descripcion_cotizaciones', label: 'Descripción Cotizaciones', type: 'text', span: 2 },
                { key: 'clasificacion', label: 'Clasificación', type: 'text' },
                { key: 'estado', label: 'Estado', type: 'text' },
                { key: 'activo', label: 'Activo', type: 'checkbox' },
                { key: 'tipo_troquel', label: 'Tipo Troquel', type: 'text' },
                { key: 'tipo_troquel_2', label: 'Tipo Troquel 2', type: 'text' },
                { key: 'estructura_troquel', label: 'Estructura de Troquel', type: 'text', span: 2 },
                { type: 'section', label: 'Montaje y Distorsión', span: 2 },
                { key: 'ancho_mm', label: 'Ancho Montaje mm', type: 'number', step: '0.01' },
                { key: 'largo_mm', label: 'Largo Montaje mm', type: 'number', step: '0.01' },
                { key: 'desarrollo_in', label: 'Desarrollo in', type: 'number', step: '0.01' },
                { key: 'desarrollo_cm', label: 'Desarrollo cm', type: 'number', step: '0.01' },
                { key: 'elongacion_pct', label: 'Elongación %', type: 'number', step: '0.01' },
                { key: 'elongado', label: 'Elongado', type: 'number', step: '0.01' },
                { key: 'ancho_total_troquel_in', label: 'Ancho Total Troquel in', type: 'number', step: '0.01' },
                { key: 'largo_total_troquel_in', label: 'Largo Total Troquel in', type: 'number', step: '0.01' },
                { key: 'dimensiones_troquel_in', label: 'Dimensiones Troquel in', type: 'text', span: 2 },
                { key: 'ancho_etiqueta_in', label: 'Ancho Etiqueta in', type: 'number', step: '0.01' },
                { key: 'largo_etiqueta_in', label: 'Largo Etiqueta in', type: 'number', step: '0.01' },
                { key: 'ancho_material_in', label: 'Ancho Material in', type: 'number', step: '0.01' },
                { key: 'gap_in', label: 'Gap in', type: 'number', step: '0.01' },
                { key: 'montaje_troquel', label: 'Montaje Troquel', type: 'text' },
                { key: 'formato', label: 'Formato', type: 'text' },
                { key: 'tension', label: 'Tensión', type: 'text' },
                { type: 'section', label: 'Producción', span: 2 },
                { key: 'cantidad_filas', label: 'Filas', type: 'number', step: '1' },
                { key: 'dientes', label: 'Dientes', type: 'number', step: '1' },
                { key: 'repeticiones', label: 'Repeticiones', type: 'number', step: '1' },
                { key: 'area_etiqueta_excesos_in', label: 'Área Etiqueta c/Excesos in²', type: 'number', step: '0.01' },
                { key: 'area_etiqueta_in', label: 'Área Etiqueta in²', type: 'number', step: '0.01' },
                { key: 'area_troquel_in2', label: 'Área Troquel in²', type: 'number', step: '0.01' },
                { key: 'uso_convencional', label: 'Uso Convencional', type: 'checkbox' },
                { key: 'uso_digital', label: 'Uso Digital', type: 'checkbox' },
                { type: 'section', label: 'Control e Historial', span: 2 },
                { key: 'codigo_cliente', label: 'Código Cliente', type: 'text' },
                { key: 'codigo_preprensa', label: 'Código Preprensa', type: 'text' },
                { key: 'codigo_proveedor', label: 'Código Proveedor', type: 'text' },
                { key: 'proveedor_troquel', label: 'Proveedor Troquel', type: 'text' },
                { key: 'usuario_creacion', label: 'Usuario Creación', type: 'text' },
                { key: 'vida_util_golpes_restantes', label: 'Vida Útil Golpes Restantes', type: 'number', step: '0.01' },
                { key: 'vida_util_golpes_usados', label: 'Vida Útil Golpes Usados', type: 'number', step: '0.01' },
                { key: 'vida_util_golpes_total', label: 'Vida Útil Golpes Total', type: 'number', step: '0.01' },
                { key: 'reemplaza_a', label: 'Reemplaza a', type: 'text' },
                { key: 'reemplazado_por', label: 'Reemplazado por', type: 'text' },
                { key: 'observaciones', label: 'Observaciones', type: 'text', span: 2 },
                { key: 'image_url', label: 'Imagen', type: 'text', span: 2 }
            ],
            createEmptyItem() {
                return {
                    codigo: '',
                    descripcion: '',
                    descripcion_cotizaciones: '',
                    clasificacion: '',
                    codigo_cliente: '',
                    codigo_preprensa: '',
                    codigo_proveedor: '',
                    ancho_mm: 0,
                    largo_mm: 0,
                    desarrollo_cm: '',
                    desarrollo_in: '',
                    elongacion_pct: '',
                    elongado: '',
                    ancho_total_troquel_in: '',
                    largo_total_troquel_in: '',
                    dimensiones_troquel_in: '',
                    ancho_etiqueta_in: '',
                    largo_etiqueta_in: '',
                    ancho_material_in: '',
                    area_etiqueta_excesos_in: '',
                    area_etiqueta_in: '',
                    area_troquel_in2: '',
                    estructura_troquel: '',
                    formato: '',
                    gap_in: '',
                    montaje_troquel: '',
                    observaciones: '',
                    proveedor_troquel: '',
                    tension: '',
                    tipo_troquel: '',
                    tipo_troquel_2: '',
                    uso_convencional: false,
                    uso_digital: false,
                    usuario_creacion: '',
                    vida_util_golpes_restantes: '',
                    vida_util_golpes_usados: '',
                    vida_util_golpes_total: '',
                    reemplaza_a: '',
                    reemplazado_por: '',
                    image_url: '',
                    cantidad_filas: 1,
                    dientes: 0,
                    repeticiones: 1,
                    estado: 'Bueno',
                    activo: true
                };
            }
        },
        maquinas: {
            presentationKey: 'inventario-maquinaria',
            title: 'Inventario | Máquinas',
            subtitle: 'Máquinas y procesos operativos para el cotizador',
            endpoint: '/api/inventario/maquinas',
            exportEndpoint: '/api/inventario/maquinas/export',
            importEndpoint: '/api/inventario/maquinas/import',
            columns: [
                ['nombre', 'Nombre'],
                ['proceso', 'Proceso'],
                ['velocidad_produccion', 'Velocidad'],
                ['unidad_velocidad_produccion', 'Unidad Velocidad'],
                ['costo_hora_maquina', 'Hora Máquina'],
                ['costo_hora_operario', 'Hora Hombre']
            ],
            formFields: [
                { key: 'id', type: 'hidden' },
                { type: 'section', label: 'Información General', span: 2, tabKey: 'general' },
                { key: 'nombre', label: 'Nombre', type: 'text' },
                { key: 'marca', label: 'Marca', type: 'text' },
                { key: 'modelo', label: 'Modelo', type: 'text' },
                { key: 'tipo', label: 'Tipo', type: 'select', options: [['', 'Sin Definir'], ['Convencional', 'Convencional'], ['Digital', 'Digital'], ['Hibrido', 'Híbrido']] },
                { key: 'proceso_principal', label: 'Proceso Principal', type: 'text' },
                { key: 'subproceso', label: 'Subproceso', type: 'text' },
                { key: 'factor_preparacion', label: 'Setup', type: 'number', step: '0.01', suffix: 'min' },
                { key: 'factor_montaje_estacion', label: 'Montaje', type: 'number', step: '0.01', suffix: 'min' },
                { key: 'comentario_setup', label: 'Comentario Setup', type: 'textarea', rows: 2, span: 2 },
                { key: 'comentario_montaje', label: 'Comentario Montaje', type: 'textarea', rows: 2, span: 2 },
                { key: 'ancho_max_in', label: 'Ancho Máximo', type: 'number', step: '0.01', suffix: 'in' },
                { key: 'velocidad_produccion', label: 'Velocidad Producción', type: 'number', step: '0.01', suffixSourceKey: 'unidad_velocidad_produccion' },
                { key: 'unidad_velocidad_produccion', label: 'Unidad Velocidad', type: 'select', options: [['ft/min', 'ft/min'], ['m/min', 'm/min']] },
                { key: 'costo_hora_maquina', label: 'Costo Hora Máquina', type: 'number', step: '0.01', suffix: '$/h' },
                { key: 'costo_hora_operario', label: 'Costo Hora Hombre', type: 'number', step: '0.01', suffix: '$/h' },
                { key: 'sustrato_consumo_unidad', label: 'Unidad Sustrato', type: 'select', options: [['pies', 'Pies'], ['metros', 'Metros']] },
                { key: 'sustrato_setup_merma_cantidad', label: 'Merma Sustrato Setup', type: 'number', step: '0.01', suffixSourceKey: 'sustrato_setup_merma_unidad' },
                { key: 'sustrato_setup_merma_unidad', label: 'Unidad Merma Setup', type: 'select', options: [['pies', 'Pies'], ['metros', 'Metros']] },
                { key: 'sustrato_setup_merma_base', label: 'Base Merma Setup', type: 'select', options: [['trabajo', 'Por Trabajo'], ['color', 'Por Color'], ['estacion', 'Por Estación'], ['cabezal', 'Por Cabezal']] },
                { key: 'sustrato_montaje_merma_cantidad', label: 'Merma Sustrato Montaje', type: 'number', step: '0.01', suffixSourceKey: 'sustrato_montaje_merma_unidad' },
                { key: 'sustrato_montaje_merma_unidad', label: 'Unidad Merma Montaje', type: 'select', options: [['pies', 'Pies'], ['metros', 'Metros']] },
                { key: 'sustrato_montaje_merma_base', label: 'Base Merma Montaje', type: 'select', options: [['trabajo', 'Por Trabajo'], ['color', 'Por Color'], ['estacion', 'Por Estación'], ['cabezal', 'Por Cabezal']] },
                { key: 'activa', label: 'Activa', type: 'checkbox', tab: 'general', span: 2 },
                { type: 'section', label: 'Impresión Digital', span: 2, tabKey: 'digital' },
                { key: 'digital_tipo_cobro', label: 'Tipo Cobro Digital', type: 'select', options: [['consumo', 'Consumo'], ['clic', 'Clic']] },
                { key: 'digital_costo_kg_tinta', label: 'Costo Kg Tinta', type: 'number', step: '0.01', suffix: '$/kg' },
                { key: 'digital_costo_kg_tinta_blanco', label: 'Costo Kg Blanco', type: 'number', step: '0.01', suffix: '$/kg' },
                { key: 'digital_costo_kg_tinta_especial', label: 'Costo Kg Especial', type: 'number', step: '0.01', suffix: '$/kg' },
                { key: 'digital_tarifa_click', label: 'Tarifa Clic', type: 'number', step: '0.01', suffix: '$' },
                { key: 'digital_modo_click', label: 'Modo Clic', type: 'select', options: [['por_estacion', 'Por Estación'], ['por_vuelta', 'Por Vuelta']] },
                { key: 'digital_velocidad_cmyk_mpm', label: 'Velocidad CMYK', type: 'number', step: '0.01', suffix: 'm/min' },
                { key: 'digital_velocidad_extendida_mpm', label: 'Velocidad Extendida', type: 'number', step: '0.01', suffix: 'm/min' },
                { key: 'digital_gramaje_cmyk_g_m2', label: 'Gramaje CMYK', type: 'number', step: '0.01', suffix: 'g/m2' },
                { key: 'digital_gramaje_blanco_g_m2', label: 'Gramaje Blanco', type: 'number', step: '0.01', suffix: 'g/m2' },
                { key: 'digital_factor_merma', label: 'Factor Merma Tinta', type: 'number', step: '0.01' },
                { key: 'digital_costo_lavado_especial', label: 'Costo Lavado Especial', type: 'number', step: '0.01', suffix: '$' },
                { type: 'section', label: 'Premier Digital', span: 2, tabKey: 'premier' },
                { key: 'digital_premier_modo', label: 'Modo Premier', type: 'select', options: [['offline', 'Offline'], ['inline', 'In-line']] },
                { key: 'digital_premier_setup_min', label: 'Setup Premier', type: 'number', step: '0.01', suffix: 'min' },
                { key: 'digital_premier_costo_mantenimiento', label: 'Mantenimiento Premier', type: 'number', step: '0.01', suffix: '$' },
                { key: 'digital_premier_costo_offline_m', label: 'Costo Offline', type: 'number', step: '0.01', suffix: '$/m' },
                { type: 'section', label: 'Dimensiones y Capacidad', span: 2, tab: 'especificaciones' },
                { key: 'espec_ancho_max_mm', label: 'Ancho Máximo (mm)', type: 'number', step: '0.01', suffix: 'mm', tab: 'especificaciones' },
                { key: 'espec_largo_max_mm', label: 'Largo Máximo (mm)', type: 'number', step: '0.01', suffix: 'mm', tab: 'especificaciones' },
                { key: 'espec_altura_max_mm', label: 'Altura Máxima (mm)', type: 'number', step: '0.01', suffix: 'mm', tab: 'especificaciones' },
                { key: 'espec_peso_kg', label: 'Peso (kg)', type: 'number', step: '0.01', suffix: 'kg', tab: 'especificaciones' },
                { key: 'espec_ancho_banda_max_mm', label: 'Ancho Banda Máximo (mm)', type: 'number', step: '0.01', suffix: 'mm', tab: 'especificaciones' },
                { type: 'section', label: 'Tecnología', span: 2, tab: 'especificaciones' },
                { key: 'espec_num_estaciones', label: 'Número Estaciones', type: 'number', step: '1', tab: 'especificaciones' },
                { key: 'espec_num_cabezales', label: 'Número Cabezales', type: 'number', step: '1', tab: 'especificaciones' },
                { key: 'espec_tinta_base', label: 'Tipo Tinta Base', type: 'select', options: [['', 'Sin Definir'], ['solvente', 'Solvente'], ['agua', 'Agua'], ['uv', 'UV'], ['híbrida', 'Híbrida']], tab: 'especificaciones' },
                { key: 'espec_resolucion_dpi', label: 'Resolución (DPI)', type: 'number', step: '1', suffix: 'DPI', tab: 'especificaciones' },
                { key: 'espec_velocidad_max_fpm', label: 'Velocidad Máxima', type: 'number', step: '0.01', suffixSourceKey: 'unidad_velocidad_produccion', tab: 'especificaciones' },
                { key: 'espec_troquel', label: 'Troquel', type: 'checkbox', span: 1, tab: 'especificaciones' },
                { key: 'espec_uv', label: 'UV', type: 'checkbox', span: 1, tab: 'especificaciones' },
                { key: 'espec_laminado', label: 'Laminado', type: 'checkbox', span: 1, tab: 'especificaciones' },
                { key: 'espec_barniz', label: 'Barniz', type: 'checkbox', span: 1, tab: 'especificaciones' },
                { type: 'section', label: 'Eléctrico', span: 2, tab: 'especificaciones' },
                { key: 'espec_tension_entrada', label: 'Tensión Entrada', type: 'select', options: [['', 'Sin Definir'], ['110V', '110V'], ['220V', '220V'], ['380V', '380V'], ['440V', '440V']], tab: 'especificaciones' },
                { key: 'espec_potencia_kw', label: 'Potencia (kW)', type: 'number', step: '0.01', suffix: 'kW', tab: 'especificaciones' },
                { key: 'espec_tension_electrica', label: 'Tensión Eléctrica', type: 'text', tab: 'especificaciones' },
                { key: 'espec_fase', label: 'Fase', type: 'select', options: [['', 'Sin Definir'], ['1', '1'], ['3', '3']], tab: 'especificaciones' },
                { key: 'espec_corriente_max_a', label: 'Corriente Máxima (A)', type: 'number', step: '0.01', suffix: 'A', tab: 'especificaciones' },
                { key: 'espec_consumo_aire', label: 'Consumo Aire', type: 'text', tab: 'especificaciones' },
                { key: 'espec_temperatura_op', label: 'Temperatura Operación', type: 'text', tab: 'especificaciones' }
            ],
            createEmptyItem() {
                return {
                    nombre: '',
                    marca: '',
                    modelo: '',
                    tipo: '',
                    proceso_principal: '',
                    subproceso: '',
                    ancho_max_in: 0,
                    velocidad_produccion: 0,
                    unidad_velocidad_produccion: 'ft/min',
                    costo_hora_maquina: 0,
                    costo_hora_operario: 0,
                    activa: true,
                    minuto_hombre: 0,
                    factor_tiraje: 0,
                    factor_tiraje_digital: '',
                    digital_tipo_cobro: 'consumo',
                    digital_costo_kg_tinta: 0,
                    digital_costo_kg_tinta_blanco: 0,
                    digital_costo_kg_tinta_especial: 0,
                    digital_tarifa_click: 0.09,
                    digital_modo_click: 'por_estacion',
                    digital_velocidad_cmyk_mpm: 42,
                    digital_velocidad_extendida_mpm: 26,
                    digital_gramaje_cmyk_g_m2: 1.5,
                    digital_gramaje_blanco_g_m2: 4,
                    digital_factor_merma: 1.1,
                    digital_costo_lavado_especial: 18,
                    digital_premier_modo: 'offline',
                    digital_premier_setup_min: 20,
                    digital_premier_costo_mantenimiento: 14,
                    digital_premier_costo_offline_m: 0,
                    sustrato_consumo_unidad: 'pies',
                    sustrato_setup_merma_cantidad: 0,
                    sustrato_setup_merma_unidad: 'pies',
                    sustrato_setup_merma_base: 'trabajo',
                    sustrato_montaje_merma_cantidad: 0,
                    sustrato_montaje_merma_unidad: 'pies',
                    sustrato_montaje_merma_base: 'trabajo',
                    factor_montaje_estacion: 0,
                    factor_preparacion: 0,
                    comentario_setup: '',
                    comentario_montaje: '',
                    macula_default_pies: 0,
                    capacidades: [],
                    espec_ancho_max_mm: '',
                    espec_largo_max_mm: '',
                    espec_altura_max_mm: '',
                    espec_peso_kg: '',
                    espec_num_estaciones: '',
                    espec_num_cabezales: '',
                    espec_tinta_base: '',
                    espec_resolucion_dpi: '',
                    espec_velocidad_max_fpm: '',
                    espec_ancho_banda_max_mm: '',
                    espec_troquel: '',
                    espec_uv: '',
                    espec_laminado: '',
                    espec_barniz: '',
                    espec_tension_entrada: '',
                    espec_potencia_kw: '',
                    espec_tension_electrica: '',
                    espec_fase: '',
                    espec_corriente_max_a: '',
                    espec_consumo_aire: '',
                    espec_temperatura_op: ''
                };
            }
        },
        procesos: {
            presentationKey: 'calculos',
            title: 'Inventario | Procesos',
            subtitle: 'Procesos operativos para el cotizador Pro',
            endpoint: '/api/inventario/procesos',
            exportEndpoint: '/api/inventario/procesos/export',
            importEndpoint: '/api/inventario/procesos/import',
            columns: [
                ['nombre', 'Proceso'],
                ['categoria', 'Categoría'],
                ['machine_name', 'Máquina'],
                ['es_inline', 'Inline'],
                ['costo_hora_maquina', 'Hora máquina'],
                ['costo_hora_operario', 'Hora operario'],
                ['activo', 'Activo']
            ],
            formFields: [
                { key: 'id', type: 'hidden' },
                { key: 'codigo', label: 'Código', type: 'text' },
                { key: 'nombre', label: 'Nombre', type: 'text' },
                { key: 'descripcion', label: 'Descripción', type: 'text' },
                { key: 'categoria', label: 'Categoría', type: 'select', options: [['diseno', 'Diseño'], ['preprensa', 'Preprensa'], ['planchas', 'Planchas'], ['impresion', 'Impresión'], ['acabados', 'Acabados'], ['soporte', 'Soporte']] },
                { key: 'subcategoria', label: 'Subcategoría', type: 'text' },
                { key: 'machine_id', label: 'Máquina asociada', type: 'select', options: [['', 'Sin máquina']] },
                { key: 'proceso_productivo', label: 'Proceso productivo', type: 'select', options: [['', 'Indistinto'], ['convencional', 'Convencional'], ['digital', 'Digital'], ['hibrido', 'Híbrido']] },
                { key: 'modo_recurso', label: 'Modo recurso', type: 'select', options: [['mixto', 'Mixto'], ['maquina', 'Máquina'], ['persona', 'Persona'], ['externo', 'Externo']] },
                { key: 'cantidad_personas', label: 'Cantidad personas', type: 'number', step: '0.0001' },
                { key: 'tiempo_preparacion_general', label: 'Setup', type: 'number', step: '0.0001' },
                { key: 'tiempo_por_estacion', label: 'Montaje', type: 'number', step: '0.0001' },
                { key: 'tiempo_fijo_min', label: 'Tiempo fijo min', type: 'number', step: '0.0001' },
                { key: 'velocidad_produccion', label: 'Velocidad producción', type: 'number', step: '0.0001' },
                { key: 'unidad_trabajo', label: 'Unidad trabajo', type: 'text' },
                { key: 'costo_hora_maquina', label: 'Costo hora máquina', type: 'number', step: '0.0001' },
                { key: 'costo_hora_operario', label: 'Costo hora operario', type: 'number', step: '0.0001' },
                { key: 'costo_fijo', label: 'Costo fijo', type: 'number', step: '0.0001' },
                { key: 'costo_x_msi', label: 'Costo x MSI', type: 'number', step: '0.000001' },
                { key: 'costo_x_kg', label: 'Costo x KG', type: 'number', step: '0.000001' },
                { key: 'costo_x_pie', label: 'Costo x Pie', type: 'number', step: '0.000001' },
                { key: 'costo_x_millar', label: 'Costo x Millar', type: 'number', step: '0.000001' },
                { key: 'formula_tiempo', label: 'Fórmula tiempo', type: 'text' },
                { key: 'formula_costo', label: 'Fórmula costo', type: 'text' },
                { key: 'orden_base', label: 'Orden base', type: 'number', step: '1' },
                { key: 'es_inline', label: 'Es inline', type: 'checkbox' },
                { key: 'comparte_tiempo_linea', label: 'Comparte tiempo de línea', type: 'checkbox' },
                { key: 'comparte_operario', label: 'Comparte operario', type: 'checkbox' },
                { key: 'requiere_troquel', label: 'Requiere troquel', type: 'checkbox' },
                { key: 'activo', label: 'Activo', type: 'checkbox' }
            ],
            createEmptyItem() {
                return {
                    codigo: '',
                    nombre: '',
                    descripcion: '',
                    categoria: 'soporte',
                    subcategoria: '',
                    machine_id: '',
                    proceso_productivo: '',
                    modo_recurso: 'mixto',
                    cantidad_personas: 1,
                    tiempo_preparacion_general: 0,
                    tiempo_por_estacion: 0,
                    tiempo_fijo_min: 0,
                    velocidad_produccion: 0,
                    unidad_trabajo: 'pies',
                    costo_hora_maquina: 0,
                    costo_hora_operario: 0,
                    costo_fijo: 0,
                    costo_x_msi: 0,
                    costo_x_kg: 0,
                    costo_x_pie: 0,
                    costo_x_millar: 0,
                    formula_tiempo: '',
                    formula_costo: '',
                    orden_base: 100,
                    es_inline: false,
                    comparte_tiempo_linea: false,
                    comparte_operario: false,
                    requiere_troquel: false,
                    activo: true
                };
            }
        },
        'tipos-salida': {
            presentationKey: 'calculos',
            title: 'Inventario | Tipos de Salida',
            subtitle: 'Códigos e imágenes para el selector de tipo de salida',
            endpoint: '/api/inventario/tipos-salida',
            exportEndpoint: '/api/inventario/tipos-salida/export',
            importEndpoint: '/api/inventario/tipos-salida/import',
            columns: [
                ['codigo', 'Código'],
                ['nombre', 'Nombre'],
                ['descripcion', 'Descripción'],
                ['image_url', 'Imagen'],
                ['activo', 'Activo']
            ],
            formFields: [
                { key: 'id', type: 'hidden' },
                { key: 'codigo', label: 'Código', type: 'text' },
                { key: 'nombre', label: 'Nombre', type: 'text' },
                { key: 'descripcion', label: 'Descripción', type: 'text' },
                { key: 'image_url', label: 'Imagen URL / Data URL', type: 'text' },
                { key: 'activo', label: 'Activo', type: 'checkbox' }
            ],
            createEmptyItem() {
                return {
                    codigo: '',
                    nombre: '',
                    descripcion: '',
                    image_url: '',
                    activo: true
                };
            }
        }
    };

    const inventoryKey = routeMap[window.location.pathname] || 'materiales';
    return { inventoryKey, ...pageConfig[inventoryKey] };
}

function isMaterialsInventory() {
    return page.inventoryKey === 'materiales';
}

function isMachinesInventory() {
    return page.inventoryKey === 'maquinas';
}

function setSapImportStatus(message = '', tone = '') {
    if (!catalogImportSapStatus) return;
    catalogImportSapStatus.hidden = !message;
    catalogImportSapStatus.textContent = message;
    catalogImportSapStatus.classList.remove('is-error', 'is-success');
    if (tone === 'error') {
        catalogImportSapStatus.classList.add('is-error');
    } else if (tone === 'success') {
        catalogImportSapStatus.classList.add('is-success');
    }
}

function setCatalogSapImportPopoverStatus(message = '', tone = '') {
    if (!catalogImportSapPopoverStatus) return;
    catalogImportSapPopoverStatus.hidden = !message;
    catalogImportSapPopoverStatus.textContent = message;
    catalogImportSapPopoverStatus.classList.remove('is-error', 'is-success');
    if (tone === 'error') {
        catalogImportSapPopoverStatus.classList.add('is-error');
    } else if (tone === 'success') {
        catalogImportSapPopoverStatus.classList.add('is-success');
    }
}

function buildSapImportSummaryText(summary = {}) {
    const parts = [];
    parts.push(`${summary.inserted || 0} nuevos`);
    if (summary.duplicateByCode) parts.push(`${summary.duplicateByCode} duplicados`);
    if (summary.skippedWithoutCode) parts.push(`${summary.skippedWithoutCode} sin código`);
    if (summary.skippedWithoutName) parts.push(`${summary.skippedWithoutName} sin nombre`);
    return `SAP: ${parts.join(' · ')}`;
}

function renderCatalogSapImportDiagnosis(summary = {}) {
    if (!catalogImportSapPopoverSummary) return;
    const cards = [
        ['Disponibles', Number(summary.importable || 0)],
        ['Total leídos', Number(summary.total || 0)],
        ['Duplicados', Number(summary.duplicateByCode || 0)],
        ['Sin código', Number(summary.skippedWithoutCode || 0)],
        ['Sin nombre', Number(summary.skippedWithoutName || 0)]
    ];
    catalogImportSapPopoverSummary.innerHTML = cards.map(([label, value]) => `
        <div class="socios-import-diagnosis-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(String(value))}</strong>
        </div>
    `).join('');
}

const page = resolveRouteConfig();
const PRESENTATION_KEY = page.presentationKey;
let currentItems = [];
const routeState = new URLSearchParams(window.location.search);
let selectedId = routeState.get('id') || '';
let capabilitiesState = [];
let machineCatalogOptions = [];
let currentView = routeState.get('view') === 'detail' ? 'detail' : 'list';
let searchTimer = null;
let catalogAutosaveTimer = null;
let catalogAutosaveRunning = false;

function isShellEmbedded() {
    return new URLSearchParams(window.location.search).get('shell') === '1' || window !== window.parent;
}

function buildBdfgContext() {
    const selectedItem = currentItems.find((item) => item.id === selectedId) || null;
    if (!selectedItem) return {
        kind: 'inventory-browser',
        title: page.title || 'Inventario',
        subtitle: `Contexto activo: ${page.title || 'Inventario'}`,
        documentRoute: buildInventoryUrl(currentView, ''),
        documentLabel: page.title || 'Inventario'
    };
    const label = selectedItem.codigo || selectedItem.nombre || selectedItem.descripcion || 'Registro';
    return {
        kind: 'inventory-record',
        title: String(label),
        subtitle: page.title || 'Inventario',
        documentRoute: buildInventoryUrl(currentView, selectedId),
        documentLabel: String(page.title || 'Inventario'),
        recordId: String(selectedId || ''),
        dates: {
            updatedAt: selectedItem.updated_at || '',
            createdAt: selectedItem.created_at || ''
        }
    };
}

function publishBdfgContext() {
    if (!isShellEmbedded()) return;
    window.parent.postMessage({ type: 'erp-bdfg-context', context: buildBdfgContext() }, window.location.origin);
}

function canCreateInventoryRecords() {
    if (!window.ErpAccess?.canCreateModule) return true;
    const moduleKeyMap = {
        materiales: 'inventario-mp',
        troqueles: 'inventario-troqueles',
        maquinas: 'inventario-maquinaria',
        procesos: 'inventario-maquinaria',
        'tipos-salida': 'configuracion-general'
    };
    return window.ErpAccess.canCreateModule(moduleKeyMap[page.inventoryKey] || PRESENTATION_KEY);
}

function isTroquelesInventory() {
    return page.inventoryKey === 'troqueles';
}

function isOutputTypesInventory() {
    return page.inventoryKey === 'tipos-salida';
}

function supportsDeleteInventory() {
    return page.inventoryKey === 'materiales' || page.inventoryKey === 'maquinas';
}

function supportsImagePreviewInventory() {
    return isTroquelesInventory() || isOutputTypesInventory();
}

function hasOutputTypeContent(item) {
    return Boolean(item && (item.id || item.codigo || item.nombre || item.descripcion || item.image_url));
}

function ensureOutputTypeDraftRow(items = []) {
    const rows = Array.isArray(items) ? [...items] : [];
    if (!rows.length || hasOutputTypeContent(rows[rows.length - 1])) {
        rows.push(page.createEmptyItem());
    }
    return rows;
}

function focusOutputTypeRow(index) {
    const targetInput = catalogBody.querySelector(`tr[data-output-row="${index}"] input[data-field="codigo"]`);
    if (!targetInput) return;
    requestAnimationFrame(() => {
        targetInput.focus();
        targetInput.select?.();
        targetInput.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
}

function buildOutputTypeTableRows(items = []) {
    const rows = ensureOutputTypeDraftRow(items);
    return rows.map((item, index) => {
        const preview = item.image_url
            ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.codigo || item.descripcion || `Salida ${index + 1}`)}" class="inventory-output-image">`
            : '<span class="inventory-output-image-empty">Sin imagen</span>';
        return `
            <tr data-output-row="${index}">
                <td class="inventory-output-code-cell">
                    <input type="text" class="inventory-inline-input" data-field="codigo" value="${escapeHtml(item.codigo || '')}">
                </td>
                <td class="inventory-output-image-cell">
                    <button type="button" class="inventory-output-image-button" data-action="upload-output-image" data-row-index="${index}" aria-label="Cargar imagen">
                        <div class="inventory-output-image-shell">${preview}</div>
                    </button>
                    <input type="file" accept="image/*" hidden data-output-file="${index}">
                    <input type="hidden" data-field="image_url" value="${escapeHtml(item.image_url || '')}">
                    <input type="hidden" data-field="id" value="${escapeHtml(item.id || '')}">
                    <input type="hidden" data-field="activo" value="${item.activo !== false ? 'true' : 'false'}">
                    <input type="hidden" data-field="nombre" value="${escapeHtml(item.nombre || '')}">
                </td>
                <td class="inventory-output-description-cell">
                    <input type="text" class="inventory-inline-input" data-field="descripcion" value="${escapeHtml(item.descripcion || '')}">
                </td>
            </tr>
        `;
    }).join('');
}

function collectOutputTypeRows() {
    return Array.from(catalogBody.querySelectorAll('tr[data-output-row]')).map((row, index) => {
        const readValue = (field) => row.querySelector(`[data-field="${field}"]`)?.value || '';
        const codigo = readValue('codigo').trim();
        const descripcion = readValue('descripcion').trim();
        const nombre = readValue('nombre').trim() || descripcion || codigo;
        return {
            id: readValue('id').trim(),
            codigo,
            nombre,
            descripcion,
            image_url: readValue('image_url').trim(),
            activo: readValue('activo') !== 'false',
            __rowIndex: index
        };
    });
}

function toggleHeaderMenu(forceState) {
    if (!catalogMenuPanel || !catalogMenuToggle) return;
    const shouldOpen = typeof forceState === 'boolean' ? forceState : catalogMenuPanel.hidden;
    catalogMenuPanel.hidden = !shouldOpen;
    catalogMenuToggle.setAttribute('aria-expanded', String(shouldOpen));
}

function setHeaderIcon(button, value, altText) {
    if (!button) return;
    button.innerHTML = iconMarkup(value, altText, 'top-icon-media');
    button.setAttribute('aria-label', altText);
}

function isSvgValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(source);
}

function isImageValue(value) {
    const source = String(value || '').trim().toLowerCase();
    return source.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(source);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function iconMarkup(value, altText, extraClass = '') {
    if (isSvgValue(value)) {
        const safeUrl = escapeHtml(value);
        return `<span class="icon-svg-mask ${extraClass}" role="img" aria-label="${escapeHtml(altText)}" style="-webkit-mask-image:url('${safeUrl}');mask-image:url('${safeUrl}');"></span>`;
    }
    if (isImageValue(value)) {
        return `<img src="${escapeHtml(value)}" alt="${escapeHtml(altText)}" class="icon-image ${extraClass}">`;
    }
    return `<span class="icon-glyph ${extraClass}">${escapeHtml(value || '')}</span>`;
}

function getOpenIconConfig() {
    const general = companyConfig?.general || {};
    const presentation = getPresentationConfig(companyConfig || {}, PRESENTATION_KEY);
    return {
        value: companyConfig?.icons?.browserOpen || companyConfig?.icons?.tableOpen || '↗',
        color: firstFilled(general.iconColorBrowserOpen, general.iconColorTableOpen, general.iconColor, '#0b81b8'),
        hover: firstFilled(general.iconColorHoverBrowserOpen, general.iconColorHoverTableOpen, '#07638c'),
        size: Number(firstFilled(general.iconSizeBrowserOpen, general.iconSizeTableOpen, presentation.iconSize, 18)) || 18
    };
}

function getDeleteIconConfig() {
    const general = companyConfig?.general || {};
    const presentation = getPresentationConfig(companyConfig || {}, PRESENTATION_KEY);
    return {
        value: companyConfig?.icons?.lineDelete || companyConfig?.icons?.loginRepositoryDelete || companyConfig?.icons?.adminUserDelete || 'X',
        color: firstFilled(general.iconColorLineDelete, general.iconColor, '#a74343'),
        hover: firstFilled(general.iconColorHoverLineDelete, '#d03535'),
        size: Number(firstFilled(general.iconSizeLineDelete, presentation.iconSize, 18)) || 18
    };
}

function setActionButtonIcon(button, iconValue, label, color, size) {
    if (!button) return;
    const iconMarkupValue = iconMarkup(iconValue, label, 'table-icon-media');
    button.innerHTML = `${iconMarkupValue}<span class="quote-browser-action-label">${escapeHtml(label)}</span>`;
    button.style.setProperty('--icon-color', color || '#178fc7');
    button.style.setProperty('--config-icon-size', `${Number(size) || 18}px`);
    button.setAttribute('aria-label', label);
}

function applyMaterialsActionIcons() {
    if (!isMaterialsInventory()) return;
    const general = companyConfig?.general || {};
    const presentation = getPresentationConfig(companyConfig || {}, PRESENTATION_KEY);
    const addValue = companyConfig?.icons?.tableAdd || companyConfig?.icons?.quantityAdd || '+';
    const refreshValue = companyConfig?.icons?.refreshCosts || companyConfig?.icons?.mobileRefresh || '↻';
    const addColor = firstFilled(general.iconColorTableAdd, general.iconColorQuantityAdd, general.iconColor, '#178fc7');
    const refreshColor = firstFilled(general.iconColorRefreshCosts, general.iconColorMobileRefresh, general.iconColor, '#178fc7');
    const addSize = Number(firstFilled(general.iconSizeTableAdd, general.iconSizeQuantityAdd, presentation.iconSize, 16)) || 16;
    const refreshSize = Number(firstFilled(general.iconSizeRefreshCosts, general.iconSizeMobileRefresh, presentation.iconSize, 16)) || 16;

    setActionButtonIcon(catalogNewButton, addValue, 'Nuevo', addColor, addSize);
    setActionButtonIcon(catalogImportSapButton, refreshValue, 'Actualizar desde SAP', refreshColor, refreshSize);
    setActionButtonIcon(catalogRefreshButton, refreshValue, 'Refrescar', refreshColor, refreshSize);
}

function applyMachinesActionIcons() {
    if (!isMachinesInventory()) return;
    const general = companyConfig?.general || {};
    const presentation = getPresentationConfig(companyConfig || {}, PRESENTATION_KEY);
    const addValue = companyConfig?.icons?.tableAdd || companyConfig?.icons?.quantityAdd || '+';
    const saveValue = companyConfig?.icons?.floatingSave || '💾';
    const addColor = firstFilled(general.iconColorTableAdd, general.iconColorQuantityAdd, general.iconColor, '#178fc7');
    const saveColor = firstFilled(general.iconColorFloatingSave, general.iconColor, '#178fc7');
    const addSize = Number(firstFilled(general.iconSizeTableAdd, general.iconSizeQuantityAdd, presentation.iconSize, 16)) || 16;
    const saveSize = Number(firstFilled(general.iconSizeFloatingSave, presentation.iconSize, 16)) || 16;

    setActionButtonIcon(catalogNewButton, addValue, 'Nuevo', addColor, addSize);
    setActionButtonIcon(catalogSaveButton, saveValue, 'Guardar', saveColor, saveSize);
}

function buildInventoryUrl(view = 'list', id = '') {
    const params = new URLSearchParams(window.location.search);
    if (view === 'detail' && id) {
        params.set('view', 'detail');
        params.set('id', id);
    } else {
        params.delete('view');
        params.delete('id');
    }
    const query = params.toString();
    return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

function updateInventoryRoute(view = 'list', id = '') {
    const nextUrl = buildInventoryUrl(view, id);
    window.history.replaceState({}, '', nextUrl);
}

function getTableColumns() {
    const actionColumn = supportsDeleteInventory()
        ? { key: 'actions', label: '', width: '92px', className: 'inventory-col-open inventory-col-actions', isAction: true }
        : { key: 'open', label: '', width: '56px', className: 'inventory-col-open', isAction: true };
    if (!isTroquelesInventory()) {
        const baseColumns = page.columns.map((column) => Array.isArray(column)
            ? { key: column[0], label: column[1] }
            : column);
        if (page.inventoryKey === 'socios') {
            return baseColumns;
        }
        return [
            ...baseColumns,
            actionColumn
        ];
    }

    return [
        actionColumn,
        { key: 'codigo', label: 'Código', width: '92px', className: 'inventory-col-code' },
        { key: 'descripcion', label: 'Descripción', width: '240px', className: 'inventory-col-description' },
        { key: 'ancho_etiqueta_in', label: 'Ancho in', width: '92px', className: 'inventory-col-number' },
        { key: 'largo_etiqueta_in', label: 'Largo in', width: '92px', className: 'inventory-col-number' },
        { key: 'desarrollo_in', label: 'Desarrollo', width: '92px', className: 'inventory-col-number' },
        { key: 'elongacion_pct', label: 'Elongación', width: '96px', className: 'inventory-col-number' },
        { key: 'dientes', label: 'Dientes', width: '74px', className: 'inventory-col-number' },
        { key: 'cantidad_filas', label: 'Filas', width: '66px', className: 'inventory-col-number' },
        { key: 'repeticiones', label: 'Repeticiones', width: '96px', className: 'inventory-col-number' },
        { key: 'estado', label: 'Estado', width: '90px', className: 'inventory-col-status' }
    ];
}

function getFormFields() {
    if (page.inventoryKey === 'materiales') return [
        { key: 'id', type: 'hidden' },
        { type: 'section', label: 'Datos del Material', span: 2, tabKey: 'datos' },
        { key: 'codigo', label: 'Código', type: 'text' },
        { key: 'nombre', label: 'Nombre', type: 'text' },
        { key: 'nombre_comercial', label: 'Nombre Comercial', type: 'text', className: 'inventory-material-field' },
        { key: 'familia_proceso', label: 'Proceso', type: 'select', options: [['', 'Sin definir'], ['sustrato', 'Sustrato'], ['tinta', 'Tinta'], ['barniz', 'Barniz'], ['laminado', 'Laminado'], ['foil', 'Foil'], ['core', 'Core'], ['plancha', 'Plancha']] },
        { key: 'clasificacion', label: 'Clasificación', type: 'select', options: [['', 'Sin definir'], ['sustrato', 'Sustrato'], ['tinta', 'Tinta'], ['barniz', 'Barniz'], ['laminado', 'Laminado'], ['foil', 'Foil'], ['core', 'Core'], ['plancha', 'Plancha'], ['otro', 'Otro']] },
        { key: 'tipo_proforma', label: 'Familia Comercial', type: 'text', className: 'inventory-material-field' },
        { key: 'comentario_tipo_proforma', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'activo', label: 'Activo', type: 'checkbox', className: 'inventory-material-field' },
        { type: 'section', label: 'Parámetros Generales', span: 2, tabKey: 'parametros' },
        { key: 'ancho_mm', label: 'Ancho mm', type: 'number', step: '0.01', className: 'inventory-material-field', maskOverlay: true, suffix: 'mm' },
        { key: 'largo_mm', label: 'Largo mm', type: 'number', step: '0.01', className: 'inventory-material-field', maskOverlay: true, suffix: 'mm' },
        { key: 'gramaje_g_m2', label: 'Gramaje g/m²', type: 'number', step: '0.001', className: 'inventory-material-field', maskOverlay: true, suffix: 'g/m²' },
        { key: 'calibre_micras', label: 'Calibre micras', type: 'number', step: '0.01', className: 'inventory-material-field', maskOverlay: true, suffix: 'micras' },
        { key: 'peso_capa_gsm', label: 'GSM Tinta', type: 'number', step: '0.0001', className: 'inventory-material-field', maskOverlay: true, suffix: 'gsm' },
        { key: 'rendimiento_g_ft2', label: 'Rendimiento g/ft²', type: 'number', step: '0.0001', className: 'inventory-material-field', maskOverlay: true, suffix: 'g/ft²' },
        { key: 'compatible_convencional', label: 'Compatible Convencional', type: 'checkbox', className: 'inventory-material-field' },
        { key: 'compatible_digital', label: 'Compatible Digital', type: 'checkbox', className: 'inventory-material-field' },
        { type: 'section', label: 'Tratamiento Digital de Sustrato', span: 2, tabKey: 'digital' },
        { key: 'tipo_superficie', label: 'Tipo Superficie', type: 'select', options: [['', 'Sin definir'], ['poroso', 'Poroso'], ['no_poroso', 'No poroso']] },
        { key: 'premier_consumo_g_m2', label: 'Premier g/m²', type: 'number', step: '0.0001', className: 'inventory-material-field', maskOverlay: true, suffix: 'g/m²' },
        { key: 'premier_costo_x_kg', label: 'Premier Costo kg', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' },
        { key: 'premier_costo_x_m2', label: 'Premier Costo m²', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' },
        { key: 'premier_preaplicado', label: 'Premier Preaplicado', type: 'checkbox', className: 'inventory-material-field' },
        { key: 'requiere_premier', label: 'Requiere Premier', type: 'checkbox', className: 'inventory-material-field' },
        { type: 'section', label: 'Costos', span: 2, tabKey: 'costos' },
        { key: 'costo_x_pie', label: 'Costo x Pie Lineal', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' },
        { key: 'costo_x_metro', label: 'Costo x Metro Lineal', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' },
        { key: 'costo_x_lamina', label: 'Costo Lámina', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' },
        { key: 'costo_x_libra', label: 'Costo Libra', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' },
        { key: 'costo_x_unidad', label: 'Costo Unidad', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' },
        { key: 'costo_x_msi', label: 'Costo MSI', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' },
        { key: 'costo_x_m2', label: 'Costo m²', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' },
        { key: 'costo_x_kg', label: 'Costo kg', type: 'number', step: '0.000001', className: 'inventory-material-field', maskOverlay: true, prefix: '$' }
    ];
    if (!isTroquelesInventory()) return page.formFields;
    return [
        { key: 'id', type: 'hidden' },
        { type: 'section', label: 'Información General', span: 3 },
        { key: 'codigo', label: 'Id Troquel', type: 'text' },
        { key: 'clasificacion', label: 'Clasificación', type: 'text' },
        { key: 'activo', label: 'Activo', type: 'checkbox' },
        { key: 'descripcion', label: 'Descripción Troquel', type: 'text', span: 2 },
        { key: 'descripcion_cotizaciones', label: 'Descripción Cotización', type: 'text' },
        { key: 'estado', label: 'Estado Troquel', type: 'text' },
        { key: 'tipo_troquel', label: 'Tipo Troquel', type: 'text' },
        { key: 'tipo_troquel_2', label: 'Tipo Troquel 2', type: 'text' },
        { key: 'estructura_troquel', label: 'Estructura', type: 'text' },
        { key: 'codigo_cliente', label: 'Código Cliente', type: 'text' },
        { key: 'codigo_preprensa', label: 'Código Preprensa', type: 'text' },
        { key: 'usuario_creacion', label: 'Usuario Creación', type: 'text' },
        { type: 'section', label: 'Producción y Montaje', span: 3 },
        { key: 'desarrollo_in', label: 'Desarrollo in', type: 'number', step: '0.01' },
        { key: 'desarrollo_cm', label: 'Desarrollo cm', type: 'number', step: '0.01' },
        { key: 'elongacion_pct', label: 'Elongación %', type: 'number', step: '0.01' },
        { key: 'montaje_troquel', label: 'Montaje Troquel', type: 'text' },
        { key: 'dientes', label: 'Dientes', type: 'number', step: '1' },
        { key: 'cantidad_filas', label: 'Filas', type: 'number', step: '1' },
        { key: 'repeticiones', label: 'Repeticiones', type: 'number', step: '1' },
        { key: 'formato', label: 'Formato', type: 'text' },
        { key: 'ancho_etiqueta_in', label: 'Ancho Etiqueta in', type: 'number', step: '0.01' },
        { key: 'largo_etiqueta_in', label: 'Largo Etiqueta in', type: 'number', step: '0.01' },
        { key: 'ancho_total_troquel_in', label: 'Ancho Total Troquel in', type: 'number', step: '0.01' },
        { key: 'largo_total_troquel_in', label: 'Largo Total Troquel in', type: 'number', step: '0.01' },
        { key: 'ancho_material_in', label: 'Ancho Material in', type: 'number', step: '0.01' },
        { key: 'gap_in', label: 'Gap in', type: 'number', step: '0.01' },
        { key: 'tension', label: 'Tensión', type: 'text' },
        { key: 'dimensiones_troquel_in', label: 'Dimensiones Troquel in', type: 'text', span: 3 },
        { type: 'section', label: 'Medidas y Control', span: 3 },
        { key: 'area_etiqueta_excesos_in', label: 'Área Etiqueta c/Excesos in²', type: 'number', step: '0.01' },
        { key: 'area_etiqueta_in', label: 'Área Etiqueta in²', type: 'number', step: '0.01' },
        { key: 'area_troquel_in2', label: 'Área Troquel in²', type: 'number', step: '0.01' },
        { key: 'uso_convencional', label: 'Uso Convencional', type: 'checkbox' },
        { key: 'uso_digital', label: 'Uso Digital', type: 'checkbox' },
        { key: 'codigo_proveedor', label: 'Código Proveedor', type: 'text' },
        { key: 'proveedor_troquel', label: 'Proveedor Troquel', type: 'text' },
        { key: 'vida_util_golpes_restantes', label: 'Vida Útil Golpes Restantes', type: 'number', step: '0.01' },
        { key: 'vida_util_golpes_usados', label: 'Vida Útil Golpes Usados', type: 'number', step: '0.01' },
        { key: 'vida_util_golpes_total', label: 'Vida Útil Golpes Total', type: 'number', step: '0.01' },
        { type: 'section', label: 'Relaciones y Notas', span: 3 },
        { key: 'reemplaza_a', label: 'Reemplaza a', type: 'text' },
        { key: 'reemplazado_por', label: 'Reemplazado por', type: 'text' },
        { key: 'elongado', label: 'Elongado', type: 'number', step: '0.01' },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea', rows: 3, span: 2 },
        { key: 'image_url', label: 'Imagen', type: 'text' }
    ];
}

function formatCellValue(value) {
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'number' && Number.isFinite(value)) {
        return new Intl.NumberFormat('es-CR', { maximumFractionDigits: 2 }).format(value);
    }
    if (value === null || typeof value === 'undefined' || value === '') return '';
    return value;
}

function renderDetailPreview(item) {
    if (!catalogDetailPreview) return;
    if (page.inventoryKey !== 'troqueles') {
        catalogDetailPreview.hidden = true;
        catalogDetailPreview.innerHTML = '';
        return;
    }

    const code = escapeHtml(item.codigo || 'Nuevo');
    const description = escapeHtml(item.descripcion || 'Sin descripción');
    const quoteDescription = escapeHtml(item.descripcion_cotizaciones || 'Sin descripción para cotización');
    const imageUrl = escapeHtml(item.image_url || '');

    catalogDetailPreview.hidden = false;
    catalogDetailPreview.innerHTML = `
        <div class="inventory-detail-copy">
            <strong>${code}</strong>
            <span>${description}</span>
            <small>${quoteDescription}</small>
        </div>
        ${imageUrl ? `<div class="inventory-detail-image-shell"><img src="${imageUrl}" alt="${code}" class="inventory-detail-image"></div>` : ''}
    `;
}

function getFlexAlign(value, fallback = 'flex-start') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'center') return 'center';
    if (normalized === 'right' || normalized === 'end' || normalized === 'flex-end') return 'flex-end';
    if (normalized === 'left' || normalized === 'start' || normalized === 'flex-start') return 'flex-start';
    return fallback;
}

function getTextAlign(value, fallback = 'left') {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'center') return 'center';
    if (normalized === 'right' || normalized === 'end' || normalized === 'flex-end') return 'right';
    if (normalized === 'left' || normalized === 'start' || normalized === 'flex-start') return 'left';
    return fallback;
}

function firstFilled(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== '') {
            return value;
        }
    }
    return '';
}

function preferCompanySetting(presentationValue, generalValue, defaultValue) {
    if (generalValue === undefined || generalValue === null || generalValue === '') {
        return presentationValue ?? defaultValue;
    }
    if (presentationValue === undefined || presentationValue === null || presentationValue === '' || presentationValue === defaultValue) {
        return generalValue;
    }
    return presentationValue;
}

function hasCustomizedPresentation(presentation = {}) {
    const defaults = {
        brandWidth: 116,
        brandFontFamily: 'Georgia, Times New Roman, serif',
        brandFontSize: 22,
        titleFontSize: 16,
        titleMarginLeft: 30,
        logoPosition: 'left',
        headerBgStart: '',
        headerBgEnd: '',
        headerBorderColor: '',
        footerBorderColor: '',
        fieldHeight: 18,
        fieldFontSize: 12,
        labelAlign: '',
        mediumInputWidth: 0,
        largeInputWidth: 0,
        footerMarginTop: 0,
        footerMarginBottom: 0
    };

    return Object.entries(defaults).some(([key, defaultValue]) => {
        const value = presentation[key];
        return value !== undefined && value !== null && value !== defaultValue;
    });
}

function preferCompanyMarginSetting(presentationValue, generalValue, defaultValue, presentation) {
    if (generalValue === undefined || generalValue === null || generalValue === '') {
        return presentationValue ?? defaultValue;
    }
    if (presentationValue === undefined || presentationValue === null || presentationValue === '') {
        return generalValue;
    }
    if (presentationValue === defaultValue) {
        return hasCustomizedPresentation(presentation) ? presentationValue : generalValue;
    }
    return presentationValue;
}

function getPresentationConfig(config, key) {
    const fallbackTitles = {
        cotizaciones: 'Cotizaciones',
        solicitudes: 'Solicitudes',
        calculos: 'Cálculos',
        socios: 'Socios',
        'inventario-mp': 'Inventario Materia Prima',
        'inventario-troqueles': 'Inventario Troqueles',
        'inventario-maquinaria': 'Inventario Maquinaria'
    };
    const presentation = config.presentations?.[key] || {};
    const general = config.general || {};
    const layout = config.layout || {};

    return {
        moduleTitle: firstFilled(presentation.moduleTitle, fallbackTitles[key], general.moduleTitle),
        brandWidth: preferCompanySetting(presentation.brandWidth, general.brandWidth, 116),
        brandFontFamily: preferCompanySetting(presentation.brandFontFamily, general.brandFontFamily, 'Georgia, Times New Roman, serif'),
        brandFontSize: preferCompanySetting(presentation.brandFontSize, general.brandFontSize, 22),
        brandColor: preferCompanySetting(presentation.brandColor, general.brandColor, '#ffffff'),
        brandVerticalAlign: preferCompanySetting(presentation.brandVerticalAlign, general.brandVerticalAlign, 'center'),
        brandHorizontalAlign: preferCompanySetting(presentation.brandHorizontalAlign, general.brandHorizontalAlign, 'left'),
        brandMarginTop: presentation.brandMarginTop ?? 0,
        brandMarginRight: presentation.brandMarginRight ?? 0,
        brandMarginBottom: presentation.brandMarginBottom ?? 0,
        brandMarginLeft: presentation.brandMarginLeft ?? 0,
        titleMarginLeft: presentation.titleMarginLeft ?? 30,
        titleFontFamily: preferCompanySetting(presentation.titleFontFamily, general.titleFontFamily || config.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'),
        titleFontSize: presentation.titleFontSize ?? general.titleFontSize ?? 16,
        titleColor: presentation.titleColor || general.titleColor || '#ffffff',
        titleVerticalAlign: preferCompanySetting(presentation.titleVerticalAlign, general.titleVerticalAlign, 'center'),
        titleHorizontalAlign: preferCompanySetting(presentation.titleHorizontalAlign, general.titleHorizontalAlign, 'left'),
        titleWidth: preferCompanySetting(presentation.titleWidth, general.titleWidth, 0),
        brandLogoUrl: firstFilled(presentation.brandLogoUrl, config.branding?.logoUrl),
        logoPosition: preferCompanySetting(presentation.logoPosition, general.brandLogoPosition, 'left'),
        headerBgStart: firstFilled(presentation.headerBgStart, general.headerBgStart, layout.headerBgStart, '#0b81b8'),
        headerBgEnd: firstFilled(presentation.headerBgEnd, general.headerBgEnd, layout.headerBgEnd, '#17abdf'),
        headerBorderColor: firstFilled(presentation.headerBorderColor, general.headerBorderColor, '#11a3dd'),
        footerBorderColor: firstFilled(presentation.footerBorderColor, general.footerBorderColor, '#11a3dd'),
        footerFontFamily: preferCompanySetting(presentation.footerFontFamily, general.footerFontFamily, 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'),
        footerFontSize: preferCompanySetting(presentation.footerFontSize, general.footerFontSize, 12),
        footerColor: preferCompanySetting(presentation.footerColor, general.footerColor, '#2f3740'),
        fieldFontFamily: presentation.fieldFontFamily || general.fieldFontFamily || config.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        fieldHeight: presentation.fieldHeight ?? general.fieldHeight ?? 18,
        fieldFontSize: presentation.fieldFontSize ?? general.fieldFontSize ?? 12,
        labelAlign: presentation.labelAlign || general.labelAlign || '',
        mediumInputWidth: presentation.mediumInputWidth ?? general.mediumInputWidth ?? 0,
        largeInputWidth: presentation.largeInputWidth ?? general.largeInputWidth ?? 0,
        footerMarginTop: preferCompanyMarginSetting(presentation.footerMarginTop, general.footerMarginTop, 0, presentation),
        footerMarginBottom: preferCompanyMarginSetting(presentation.footerMarginBottom, general.footerMarginBottom, 0, presentation),
        tableHeaderFontFamily: presentation.tableHeaderFontFamily || general.tableHeaderFontFamily || config.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        tableHeaderFontSize: presentation.tableHeaderFontSize ?? general.tableHeaderFontSize ?? layout.tableHeaderFontSize ?? 11,
        tableRowHeight: presentation.tableRowHeight ?? general.tableRowHeight ?? layout.tableRowHeight ?? 22,
        iconSize: preferCompanySetting(presentation.iconSize, layout.iconSize ?? general.iconSize, 20),
        pageMarginTop: preferCompanySetting(presentation.pageMarginTop, layout.pageMarginTop ?? general.pageMarginTop, 14),
        pageMarginRight: preferCompanySetting(presentation.pageMarginRight, layout.pageMarginRight ?? general.pageMarginRight, 16),
        pageMarginBottom: preferCompanySetting(presentation.pageMarginBottom, layout.pageMarginBottom ?? general.pageMarginBottom, 8),
        pageMarginLeft: preferCompanySetting(presentation.pageMarginLeft, layout.pageMarginLeft ?? general.pageMarginLeft, 16)
    };
}

function applyConfig(config) {
    companyConfig = config || {};
    const presentation = getPresentationConfig(config, PRESENTATION_KEY);
    if (catalogTitle) {
        catalogTitle.textContent = presentation.moduleTitle;
        catalogTitle.style.alignSelf = presentation.titleVerticalAlign || 'center';
    }

    const globalLogoUrl = (config.branding?.logoUrl || '').trim();
    const logoUrl = presentation.brandLogoUrl || globalLogoUrl;
    const companyName = config.branding?.companyName || 'PrintLab';

    if (companyLogo) {
        companyLogo.style.display = logoUrl ? 'block' : 'none';
        companyLogo.src = logoUrl;
        companyLogo.alt = companyName;
    }

    if (brandFallback) {
        brandFallback.textContent = companyName;
        const wrap = document.querySelector('.brand-logo-wrap') || companyLogo?.parentElement;
        if (wrap) {
            wrap.style.display = 'flex';
            wrap.style.alignItems = 'center';
            wrap.style.gap = '8px';
            const defaultHide = !presentation.brandLogoUrl && Boolean(globalLogoUrl) && presentation.logoPosition !== 'left' && presentation.logoPosition !== 'right';
            const shouldHide = presentation.logoPosition === 'hide_text' || defaultHide;
            brandFallback.style.display = shouldHide ? 'none' : 'flex';
            wrap.style.flexDirection = presentation.logoPosition === 'right' ? 'row-reverse' : 'row';
        }
    }

    const root = document.documentElement;
    root.style.setProperty('--field-font-family', presentation.fieldFontFamily);
    root.style.setProperty('--field-height', `${presentation.fieldHeight}px`);
    root.style.setProperty('--field-font-size', `${presentation.fieldFontSize}px`);
    if (presentation.labelAlign) root.style.setProperty('--form-label-align', presentation.labelAlign);
    root.style.setProperty('--form-input-medium', presentation.mediumInputWidth ? `${presentation.mediumInputWidth}px` : '100%');
    root.style.setProperty('--form-input-large', presentation.largeInputWidth ? `${presentation.largeInputWidth}px` : '100%');
    root.style.setProperty('--config-icon-size', `${presentation.iconSize}px`);
    root.style.setProperty('--table-header-font-family', presentation.tableHeaderFontFamily);
    root.style.setProperty('--table-header-font-size', `${presentation.tableHeaderFontSize}px`);
    root.style.setProperty('--table-row-height', `${presentation.tableRowHeight}px`);
    root.style.setProperty('--page-margin-top', `${presentation.pageMarginTop}px`);
    root.style.setProperty('--page-margin-right', `${presentation.pageMarginRight}px`);
    root.style.setProperty('--page-margin-bottom', `${presentation.pageMarginBottom}px`);
    root.style.setProperty('--page-margin-left', `${presentation.pageMarginLeft}px`);
    root.style.setProperty('--brand-width', `${presentation.brandWidth}px`);
    root.style.setProperty('--brand-color', presentation.brandColor || '#ffffff');
    root.style.setProperty('--brand-font-family', presentation.brandFontFamily);
    root.style.setProperty('--brand-font-size', `${presentation.brandFontSize}px`);
    root.style.setProperty('--brand-vertical-align', getFlexAlign(presentation.brandVerticalAlign, 'center'));
    root.style.setProperty('--brand-horizontal-align', getFlexAlign(presentation.brandHorizontalAlign, 'center'));
    root.style.setProperty('--brand-text-align', getTextAlign(presentation.brandHorizontalAlign, 'center'));
    root.style.setProperty('--brand-margin-top', `${presentation.brandMarginTop}px`);
    root.style.setProperty('--brand-margin-right', `${presentation.brandMarginRight}px`);
    root.style.setProperty('--brand-margin-bottom', `${presentation.brandMarginBottom}px`);
    root.style.setProperty('--brand-margin-left', `${presentation.brandMarginLeft}px`);
    root.style.setProperty('--title-margin-left', `${presentation.titleMarginLeft ?? 30}px`);
    root.style.setProperty('--module-title-font-family', presentation.titleFontFamily);
    root.style.setProperty('--module-title-font-size', `${presentation.titleFontSize}px`);
    root.style.setProperty('--module-title-color', presentation.titleColor || '#ffffff');
    root.style.setProperty('--header-bg-start', presentation.headerBgStart);
    root.style.setProperty('--header-bg-end', presentation.headerBgEnd);
    root.style.setProperty('--header-border-color', presentation.headerBorderColor);
    root.style.setProperty('--footer-border-color', presentation.footerBorderColor || '#11a3dd');
    root.style.setProperty('--footer-font-family', presentation.footerFontFamily);
    root.style.setProperty('--footer-font-size', `${presentation.footerFontSize || 12}px`);
    root.style.setProperty('--footer-color', presentation.footerColor || '#2f3740');
    root.style.setProperty('--footer-margin-top', `${presentation.footerMarginTop ?? 0}px`);
    root.style.setProperty('--footer-margin-bottom', `${presentation.footerMarginBottom ?? 0}px`);

    setHeaderIcon(catalogHeaderSearchButton, config.icons?.topSearch || '\u2315', 'Buscar');
    setHeaderIcon(catalogMenuToggle, config.icons?.topMenu || '\u2261', 'Menú');
    if (catalogHeaderSearchButton) {
        const size = Number(config.general?.iconSizeTopSearch) || presentation.iconSize || 20;
        catalogHeaderSearchButton.style.color = config.general?.iconColorTopSearch || config.general?.iconColor || '#9ba2ab';
        catalogHeaderSearchButton.style.width = `${size}px`;
        catalogHeaderSearchButton.style.height = `${size}px`;
    }
    if (catalogMenuToggle) {
        const size = Number(config.general?.iconSizeTopMenu) || presentation.iconSize || 20;
        catalogMenuToggle.style.color = config.general?.iconColorTopMenu || config.general?.iconColor || '#9ba2ab';
        catalogMenuToggle.style.width = `${size}px`;
        catalogMenuToggle.style.height = `${size}px`;
    }

    applyMaterialsActionIcons();
    applyMachinesActionIcons();
}

async function loadHeaderConfig() {
    const response = await fetch('/api/config/shell');
    if (!response.ok) throw new Error('No se pudo cargar la configuración.');
    applyConfig(await response.json());
    if (isMaterialsInventory() && Array.isArray(currentItems) && currentItems.length) {
        renderTable(currentItems);
    }
}

function formatFieldValue(field, value) {
    if (value === null || value === undefined) return '';
    if (field.type !== 'number') return value ?? '';
    const raw = String(value).trim();
    if (!raw) return '';
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return raw;
    const stepText = String(field.step || 'any');
    const decimals = stepText.includes('.') ? stepText.split('.')[1].length : 0;
    return decimals ? numeric.toFixed(decimals).replace(/\.?0+$/, '') : String(Math.round(numeric));
}

function formatMaskValue(field, rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === '') return '';
    const num = Number(String(rawValue).trim());
    if (!Number.isFinite(num)) return String(rawValue);
    const stepText = String(field.step || 'any');
    const decimals = stepText.includes('.') ? stepText.split('.')[1].length : 2;
    const formatted = num.toFixed(decimals).replace(/\.?0+$/, '');
    const localeFormatted = formatted.replace('.', ',');
    return (field.prefix || '') + localeFormatted + (field.suffix ? ' ' + field.suffix : '');
}

function createInput(field, value) {
    if (field.type === 'section') {
        const section = document.createElement('div');
        section.className = `inventory-form-section${field.span ? ` inventory-span-${field.span}` : ''}`;
        section.innerHTML = `<strong>${escapeHtml(field.label || '')}</strong>`;
        return section;
    }

    if (field.type === 'hidden') {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = field.key;
        input.value = value || '';
        return input;
    }

    const label = document.createElement('label');
    if (field.span) {
        label.classList.add(`inventory-span-${field.span}`);
    }
    if (field.className) {
        label.classList.add(field.className);
    }
    const span = document.createElement('span');
    span.textContent = field.label || field.key;
    label.appendChild(span);

    if (field.type === 'select') {
        const select = document.createElement('select');
        select.name = field.key;
        const options = field.key === 'machine_id'
            ? [['', 'Sin máquina'], ...machineCatalogOptions.map((item) => [item.id, item.nombre])]
            : (field.options || []);
        options.forEach(([optionValue, optionLabel]) => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionLabel;
            select.appendChild(option);
        });
        select.value = value ?? field.options?.[0]?.[0] ?? '';
        label.appendChild(select);
        return label;
    }

    if (field.type === 'checkbox') {
        label.classList.add('inventory-checkbox-field');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = field.key;
        checkbox.checked = Boolean(value);
        label.appendChild(checkbox);
        return label;
    }

    if (field.type === 'textarea') {
        const textarea = document.createElement('textarea');
        textarea.name = field.key;
        textarea.rows = field.rows || 3;
        if (field.placeholder) textarea.placeholder = field.placeholder;
        textarea.value = value ?? '';
        if (field.inputClass) textarea.classList.add(field.inputClass);
        label.appendChild(textarea);
        return label;
    }

    if (field.key === 'image_url') {
        const wrapper = document.createElement('div');
        wrapper.className = 'inventory-image-field';

        const preview = document.createElement('div');
        preview.className = 'inventory-image-inline-preview';

        const input = document.createElement('input');
        input.type = 'text';
        input.name = field.key;
        input.step = field.step || 'any';
        if (field.placeholder) input.placeholder = field.placeholder;
        input.value = value ?? '';
        if (field.inputClass) input.classList.add(field.inputClass);
        input.classList.add('inventory-image-url-input');
        wrapper.appendChild(input);

        const tools = document.createElement('div');
        tools.className = 'inventory-image-tools';

        const uploadButton = document.createElement('button');
        uploadButton.type = 'button';
        uploadButton.className = 'action-btn';
        uploadButton.textContent = 'Cargar imagen';

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'action-btn action-btn-light';
        clearButton.textContent = 'Limpiar';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.hidden = true;

        const syncPreview = () => {
            const source = String(input.value || '').trim();
            preview.innerHTML = source
                ? `<img src="${escapeHtml(source)}" alt="Vista previa" class="inventory-image-inline-preview-media">`
                : '<span class="inventory-image-inline-preview-empty">Sin imagen cargada</span>';
        };

        uploadButton.addEventListener('click', () => fileInput.click());
        clearButton.addEventListener('click', () => {
            input.value = '';
            fileInput.value = '';
            syncPreview();
            renderDetailPreview(buildPayloadFromForm());
        });
        fileInput.addEventListener('change', async () => {
            const [file] = Array.from(fileInput.files || []);
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                input.value = typeof reader.result === 'string' ? reader.result : '';
                syncPreview();
                renderDetailPreview(buildPayloadFromForm());
            };
            reader.readAsDataURL(file);
        });
        input.addEventListener('input', () => {
            syncPreview();
            renderDetailPreview(buildPayloadFromForm());
        });

        tools.appendChild(uploadButton);
        tools.appendChild(clearButton);
        tools.appendChild(fileInput);
        wrapper.appendChild(preview);
        wrapper.appendChild(tools);
        syncPreview();
        label.appendChild(wrapper);
        return label;
    }

    const input = document.createElement('input');
    input.type = field.type || 'text';
    input.name = field.key;
    input.step = field.step || 'any';
    if (field.min !== undefined) input.min = field.min;
    if (field.placeholder) input.placeholder = field.placeholder;
    input.value = formatFieldValue(field, value);
    if (field.inputClass) input.classList.add(field.inputClass);

    if (field.maskOverlay) {
        const wrap = document.createElement('div');
        wrap.className = 'inventory-input-wrap inventory-mask-wrap';
        if (field.prefix) wrap.classList.add('has-mask-prefix');
        if (field.suffix) wrap.classList.add('has-mask-suffix');
        input.classList.add('inventory-mask-input');

        const mask = document.createElement('span');
        mask.className = 'inventory-mask-display';
        const updateMask = () => {
            mask.textContent = formatMaskValue(field, input.value);
        };
        updateMask();

        const showInput = () => {
            mask.style.display = 'none';
            input.style.color = '';
        };
        const showMask = () => {
            mask.style.display = '';
            input.style.color = 'transparent';
            updateMask();
        };

        input.addEventListener('focus', showInput);
        input.addEventListener('blur', showMask);
        input.addEventListener('input', updateMask);

        wrap.appendChild(input);
        wrap.appendChild(mask);
        label.appendChild(wrap);
        return label;
    }

    if (field.suffix || field.suffixSourceKey) {
        const wrap = document.createElement('div');
        wrap.className = 'inventory-input-wrap';
        if (field.suffixSourceKey) wrap.dataset.suffixSource = field.suffixSourceKey;
        const suffix = document.createElement('span');
        suffix.className = 'inventory-input-suffix';
        suffix.textContent = field.suffix || '';
        wrap.appendChild(input);
        wrap.appendChild(suffix);
        label.appendChild(wrap);
        return label;
    }
    label.appendChild(input);
    return label;
}

function syncInventorySuffixes(scope = catalogForm) {
    Array.from(scope.querySelectorAll('.inventory-input-wrap[data-suffix-source]')).forEach((wrap) => {
        const sourceName = wrap.dataset.suffixSource || '';
        const source = sourceName ? scope.elements.namedItem(sourceName) : null;
        const suffix = wrap.querySelector('.inventory-input-suffix');
        if (!suffix) return;
        suffix.textContent = source?.value || '';
    });
}

function buildMachineTabbedForm(viewItem) {
    const tabs = [
        { key: 'general', label: 'Información General' },
        { key: 'digital', label: 'Impresión Digital' },
        { key: 'premier', label: 'Premier Digital' },
        { key: 'especificaciones', label: 'Especificaciones' }
    ];
    const tabBar = document.createElement('div');
    tabBar.className = 'standard-module-tabs inventory-machine-tabs';
    const panels = document.createElement('div');
    panels.className = 'inventory-machine-tab-panels';
    const panelMap = new Map();

    tabs.forEach((tab) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'standard-module-tab inventory-machine-tab';
        button.dataset.machineTab = tab.key;
        button.textContent = tab.label;
        tabBar.appendChild(button);

        const panel = document.createElement('div');
        panel.className = 'inventory-machine-tab-panel';
        panel.dataset.machineTab = tab.key;
        panels.appendChild(panel);
        panelMap.set(tab.key, panel);
    });

    let currentTab = 'general';
    getFormFields().forEach((field) => {
        const control = createInput(field, viewItem[field.key]);
        if (field.type === 'section' && field.tabKey) {
            currentTab = field.tabKey;
        }
        const targetTab = field.tab || currentTab || 'general';
        panelMap.get(targetTab)?.appendChild(control);
    });

    catalogForm.appendChild(tabBar);
    catalogForm.appendChild(panels);

    const setActiveTab = (tabKey) => {
        Array.from(tabBar.querySelectorAll('.inventory-machine-tab')).forEach((button) => {
            button.classList.toggle('is-active', button.dataset.machineTab === tabKey);
        });
        Array.from(panels.querySelectorAll('.inventory-machine-tab-panel')).forEach((panel) => {
            panel.hidden = panel.dataset.machineTab !== tabKey;
        });
    };

    const getActiveTab = () => {
        const active = tabBar.querySelector('.inventory-machine-tab.is-active');
        return active ? active.dataset.machineTab : 'general';
    };

    const syncTabsByType = () => {
        const typeSelect = catalogForm.elements.namedItem('tipo');
        const isDigital = String(typeSelect?.value || '').trim() === 'Digital';
        Array.from(tabBar.querySelectorAll('.inventory-machine-tab')).forEach((button) => {
            const tab = button.dataset.machineTab;
            const extraTab = tab !== 'general' && tab !== 'especificaciones';
            button.hidden = extraTab && !isDigital;
        });
        const activeTab = getActiveTab();
        const activeButton = tabBar.querySelector(`[data-machine-tab="${activeTab}"]`);
        if (activeButton && activeButton.hidden) {
            setActiveTab('general');
        }
        syncInventorySuffixes(catalogForm);
    };

    tabBar.addEventListener('click', (event) => {
        const button = event.target.closest('.inventory-machine-tab');
        if (!button || button.hidden) return;
        setActiveTab(button.dataset.machineTab || 'general');
    });

    catalogForm.elements.namedItem('tipo')?.addEventListener('change', syncTabsByType);
    catalogForm.elements.namedItem('unidad_velocidad_produccion')?.addEventListener('change', () => syncInventorySuffixes(catalogForm));
    catalogForm.elements.namedItem('sustrato_setup_merma_unidad')?.addEventListener('change', () => syncInventorySuffixes(catalogForm));
    catalogForm.elements.namedItem('sustrato_montaje_merma_unidad')?.addEventListener('change', () => syncInventorySuffixes(catalogForm));
    setActiveTab('general');
    syncTabsByType();
}

let materialModalEl = null;
let catalogFormOriginalParent = null;

function ensureMaterialModal() {
    if (materialModalEl) return materialModalEl;
    materialModalEl = document.createElement('div');
    materialModalEl.className = 'material-modal';
    materialModalEl.innerHTML = `
        <div class="material-modal-backdrop" data-mm-close="true"></div>
        <div class="material-modal-panel" role="dialog" aria-modal="true" aria-label="Editar material">
            <div class="material-modal-header">
                <h2 id="materialModalTitle">Material</h2>
                <button type="button" class="material-modal-close" data-mm-close="true" aria-label="Cerrar">&times;</button>
            </div>
            <div class="material-modal-body" id="materialModalBody"></div>
            <div class="material-modal-footer">
                <button type="button" class="material-footer-btn" data-mm-close="true">Cancelar</button>
                <button type="button" class="material-footer-btn" id="materialSaveBtn">Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(materialModalEl);

    materialModalEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-mm-close]')) {
            closeMaterialModal();
        }
    });

    document.getElementById('materialSaveBtn').addEventListener('click', async () => {
        try {
            if (isMaterialsInventory()) {
                const classification = normalizeKey(catalogForm.elements.namedItem('clasificacion')?.value || catalogForm.elements.namedItem('familia_proceso')?.value || '');
                if (classification === 'sustrato') {
                    const missing = [];
                    ['codigo', 'nombre', 'ancho_mm', 'costo_x_pie'].forEach((key) => {
                        const el = catalogForm.elements.namedItem(key);
                        const val = el ? el.value : '';
                        if (!val || String(val).trim() === '' || Number(val) === 0) {
                            missing.push(key);
                        }
                    });
                    if (missing.length) {
                        catalogStatus.textContent = 'Completa todos los campos requeridos antes de guardar.';
                        return;
                    }
                }
            }
            await saveCurrentRecord();
            closeMaterialModal();
        } catch (error) {
            catalogStatus.textContent = error.message;
        }
    });

    return materialModalEl;
}

function openMaterialModal(item) {
    const modal = ensureMaterialModal();
    catalogFormOriginalParent = catalogForm.parentNode;
    const title = item.id ? (item.nombre || item.codigo || 'Material') : 'Nuevo material';
    document.getElementById('materialModalTitle').textContent = title;

    const body = modal.querySelector('#materialModalBody');
    body.appendChild(catalogForm);

    modal.classList.add('open');
    document.body.classList.add('popover-open');
}

function closeMaterialModal() {
    if (!materialModalEl) return;
    materialModalEl.classList.remove('open');
    document.body.classList.remove('popover-open');
    if (catalogFormOriginalParent) {
        catalogFormOriginalParent.appendChild(catalogForm);
    }
    if (isMaterialsInventory()) {
        selectedId = '';
        updateInventoryView('list');
    }
}

function buildMaterialTabbedForm(viewItem) {
    const tabs = [
        { key: 'generales', label: 'Datos Generales' },
        { key: 'digital', label: 'Tratamiento Digital de Sustrato' }
    ];
    const tabBar = document.createElement('div');
    tabBar.className = 'standard-module-tabs inventory-material-tabs';
    const panels = document.createElement('div');
    panels.className = 'inventory-material-tab-panels';
    const panelMap = new Map();

    tabs.forEach((tab) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'standard-module-tab inventory-material-tab';
        button.dataset.materialTab = tab.key;
        button.textContent = tab.label;
        tabBar.appendChild(button);

        const panel = document.createElement('div');
        panel.className = 'inventory-material-tab-panel';
        panel.dataset.materialTab = tab.key;
        panels.appendChild(panel);
        panelMap.set(tab.key, panel);
    });

    const generalesPanel = panelMap.get('generales');
    const digitalPanel = panelMap.get('digital');

    const fields = getFormFields();

    function addSectionHeading(panel, label) {
        const div = document.createElement('div');
        div.className = 'inventory-form-section';
        div.innerHTML = '<strong>' + label + '</strong>';
        panel.appendChild(div);
    }

    function addFieldToPanel(field, panel) {
        const control = createInput(field, viewItem[field.key]);
        panel.appendChild(control);
    }

    const codeRow = document.createElement('div');
    codeRow.className = 'material-code-name-row';

    const codigoField = fields.find((f) => f.key === 'codigo');
    const nombreField = fields.find((f) => f.key === 'nombre');
    if (codigoField) codeRow.appendChild(createInput(codigoField, viewItem.codigo));
    if (nombreField) codeRow.appendChild(createInput(nombreField, viewItem.nombre));
    generalesPanel.appendChild(codeRow);

    const hiddenFields = ['id'];
    const datosKeys = ['familia_proceso', 'clasificacion', 'tipo_proforma', 'comentario_tipo_proforma', 'activo'];
    const paramKeys = ['ancho_mm', 'largo_mm', 'gramaje_g_m2', 'calibre_micras', 'peso_capa_gsm', 'rendimiento_g_ft2', 'compatible_convencional', 'compatible_digital'];
    const costKeys = ['costo_x_pie', 'costo_x_metro', 'costo_x_lamina', 'costo_x_libra', 'costo_x_unidad', 'costo_x_msi', 'costo_x_m2', 'costo_x_kg'];
    const digitKeys = ['tipo_superficie', 'premier_consumo_g_m2', 'premier_costo_x_kg', 'premier_costo_x_m2', 'premier_preaplicado', 'requiere_premier'];

    fields.forEach((field) => {
        if (field.type === 'hidden' && hiddenFields.includes(field.key)) {
            generalesPanel.appendChild(createInput(field, viewItem[field.key]));
        }
    });

    datosKeys.forEach((key) => {
        const field = fields.find((f) => f.key === key);
        if (field) addFieldToPanel(field, generalesPanel);
    });

    addSectionHeading(generalesPanel, 'Parámetros Generales');

    paramKeys.forEach((key) => {
        const field = fields.find((f) => f.key === key);
        if (field) addFieldToPanel(field, generalesPanel);
    });

    const costSourceBox = document.createElement('div');
    costSourceBox.className = 'inventory-cost-source-box';
    costSourceBox.hidden = true;
    generalesPanel.appendChild(costSourceBox);

    addSectionHeading(generalesPanel, 'Costos');

    costKeys.forEach((key) => {
        const field = fields.find((f) => f.key === key);
        if (field) addFieldToPanel(field, generalesPanel);
    });

    digitKeys.forEach((key) => {
        const field = fields.find((f) => f.key === key);
        if (field) addFieldToPanel(field, digitalPanel);
    });

    const substrateRequiredFields = ['codigo', 'nombre', 'ancho_mm', 'costo_x_pie'];
    const requiredLabels = new Set();

    const evaluateRequiredFields = (isSubstrate) => {
        requiredLabels.forEach((label) => label.classList.remove('is-required'));
        requiredLabels.clear();
        if (!isSubstrate) return;
        substrateRequiredFields.forEach((key) => {
            const el = catalogForm.elements.namedItem(key);
            if (!el) return;
            const val = el.value;
            const isEmpty = !val || String(val).trim() === '' || Number(val) === 0;
            if (!isEmpty) return;
            const label = el.closest('label');
            if (label) {
                label.classList.add('is-required');
                requiredLabels.add(label);
            }
        });
    };
    substrateRequiredFields.forEach((key) => {
        const el = catalogForm.elements.namedItem(key);
        if (el) {
            el.addEventListener('input', () => {
                const isSubstrate = String(inputByName('clasificacion')?.value || '').trim() === 'sustrato';
                evaluateRequiredFields(isSubstrate);
            });
        }
    });

    catalogForm.appendChild(tabBar);
    catalogForm.appendChild(panels);

    const inputByName = (name) => catalogForm.querySelector(`[name="${name}"]`);

    const pieInput = inputByName('costo_x_pie');
    const metroInput = inputByName('costo_x_metro');
    const triggerInput = (el) => el.dispatchEvent(new Event('input', {bubbles: true}));
    const syncPieToMetro = () => {
        const val = parseFloat(pieInput.value);
        if (!isNaN(val) && val > 0) {
            metroInput.value = (val / 0.3048).toFixed(6);
            triggerInput(metroInput);
        } else if (pieInput.value === '' || parseFloat(pieInput.value) === 0) {
            metroInput.value = '';
            triggerInput(metroInput);
        }
    };
    const syncMetroToPie = () => {
        const val = parseFloat(metroInput.value);
        if (!isNaN(val) && val > 0) {
            pieInput.value = (val * 0.3048).toFixed(6);
            triggerInput(pieInput);
        } else if (metroInput.value === '' || parseFloat(metroInput.value) === 0) {
            pieInput.value = '';
            triggerInput(pieInput);
        }
    };
    if (pieInput && metroInput) {
        pieInput.addEventListener('input', syncPieToMetro);
        metroInput.addEventListener('input', syncMetroToPie);
        syncPieToMetro();
    }

    const updateCostSource = () => {
        const viewClass = normalizeKey(viewItem.clasificacion || viewItem.familia_proceso || '');
        const formClass = normalizeKey(inputByName('clasificacion')?.value || inputByName('familia_proceso')?.value || '');
        const classification = formClass || viewClass;
        const isSubstrate = classification === 'sustrato';
        if (!isSubstrate) {
            costSourceBox.hidden = true;
            return;
        }
        costSourceBox.hidden = false;
        const isOpen = costSourceBox.classList.contains('is-open');
        const pieVal = parseFloat(inputByName('costo_x_pie')?.value);
        const m2Val = parseFloat(inputByName('costo_x_m2')?.value);
        const anchoVal = parseFloat(inputByName('ancho_mm')?.value);
        let displayAmount = '';
        let leyenda = '';
        let formulaHtml = '';
        if (Number.isFinite(pieVal) && pieVal > 0) {
            displayAmount = ' $' + pieVal.toFixed(6).replace('.', ',') + '/pie';
            leyenda = 'Costo de Pie Lineal Directo';
            formulaHtml = '';
        } else if (Number.isFinite(m2Val) && m2Val > 0 && Number.isFinite(anchoVal) && anchoVal > 0) {
            const anchoM = anchoVal / 1000;
            const calculated = m2Val * anchoM;
            displayAmount = ' $' + calculated.toFixed(6).replace('.', ',') + '/pie';
            leyenda = 'Convertir Costo de Metro Cuadrado a Costo de Pie Lineal';
            formulaHtml = '<div class="cost-source-line"><span class="cost-source-label">F\u00f3rmula:</span><span>' +
                '$' + m2Val.toFixed(6).replace('.', ',') + '/m² x ' +
                anchoM.toFixed(4).replace('.', ',') + 'm = ' +
                '<strong>$' + calculated.toFixed(6).replace('.', ',') + '/pie</strong></span></div>';
        } else if (Number.isFinite(m2Val) && m2Val > 0) {
            displayAmount = ' Costo m² disponible (falta ancho)';
            leyenda = '';
            formulaHtml = '';
        } else {
            displayAmount = ' Ingrese al menos un campo de costo';
            leyenda = '';
            formulaHtml = '';
        }
        const arrowChar = isOpen ? '\u25BC' : '\u25B6';
        costSourceBox.innerHTML =
            '<div class="cost-source-head" data-toggle-source>' +
                '<span class="cost-source-title">Costo para C\u00e1lculo:</span>' +
                '<span class="cost-source-head-amount">' + displayAmount + '</span>' +
                '<span class="cost-source-arrow">' + arrowChar + '</span>' +
            '</div>' +
            '<div class="cost-source-body"' + (isOpen ? '' : ' style="display:none"') + '>' +
                (leyenda ? '<div class="cost-source-leyenda">' + leyenda + '</div>' : '') +
                formulaHtml +
            '</div>';
    };
    costSourceBox.addEventListener('click', (e) => {
        const head = e.target.closest('[data-toggle-source]');
        if (!head) return;
        costSourceBox.classList.toggle('is-open');
        const body = costSourceBox.querySelector('.cost-source-body');
        if (body) body.style.display = costSourceBox.classList.contains('is-open') ? '' : 'none';
        updateCostSource();
    });
    costKeys.forEach((key) => {
        const el = inputByName(key);
        if (el) el.addEventListener('input', updateCostSource);
    });
    inputByName('clasificacion')?.addEventListener('change', updateCostSource);
    inputByName('familia_proceso')?.addEventListener('change', updateCostSource);
    updateCostSource();

    const setActiveTab = (tabKey) => {
        Array.from(tabBar.querySelectorAll('.inventory-material-tab')).forEach((button) => {
            button.classList.toggle('is-active', button.dataset.materialTab === tabKey);
        });
        Array.from(panels.querySelectorAll('.inventory-material-tab-panel')).forEach((panel) => {
            panel.hidden = panel.dataset.materialTab !== tabKey;
        });
    };

    const syncTabsByClassification = () => {
        const classification = normalizeKey(catalogForm.elements.namedItem('clasificacion')?.value || catalogForm.elements.namedItem('familia_proceso')?.value || '');
        const isSubstrate = classification === 'sustrato';
        const digitalButton = tabBar.querySelector('[data-material-tab="digital"]');
        if (digitalButton) digitalButton.hidden = !isSubstrate;
        const active = tabBar.querySelector('.inventory-material-tab.is-active');
        if (!isSubstrate && active?.dataset.materialTab === 'digital') setActiveTab('generales');
        evaluateRequiredFields(isSubstrate);
    };

    tabBar.addEventListener('click', (event) => {
        const button = event.target.closest('.inventory-material-tab');
        if (!button || button.hidden) return;
        setActiveTab(button.dataset.materialTab || 'generales');
    });

    catalogForm.elements.namedItem('clasificacion')?.addEventListener('change', syncTabsByClassification);
    catalogForm.elements.namedItem('familia_proceso')?.addEventListener('change', syncTabsByClassification);
    setActiveTab('generales');
    syncTabsByClassification();
}

function ensureMachinePrimaryCapability() {
    if (!Array.isArray(capabilitiesState)) capabilitiesState = [];
    if (!capabilitiesState.length) {
        capabilitiesState.push({
            clasificacion: 'produccion',
            proceso: '',
            subproceso: '',
            unidad_trabajo: 'pies',
            tiempo_preparacion_general: 0,
            tiempo_adicional_preparacion: 0,
            tiempo_por_estacion: 0,
            factor_proceso_por_area: 0,
            velocidad_produccion: 0,
              costo_hora_maquina: 0,
              costo_hora_operario: 0,
              formula_tiempo: '',
              formula_costo: '',
              ancho_max_in: 0,
              activa: true
        });
    }
    return capabilitiesState[0];
}

function updateInventoryView(nextView = 'list', itemId = '') {
    currentView = nextView;
    const isTroqueles = isTroquelesInventory();
    const isMateriales = page.inventoryKey === 'materiales';
    const isMaquinas = page.inventoryKey === 'maquinas';
    const isOutputTypes = isOutputTypesInventory();
    const hasSelection = Boolean(itemId || selectedId || nextView === 'detail');
    document.body.classList.toggle('inventory-route-troqueles', isTroqueles);
    document.body.classList.toggle('inventory-route-materiales', isMateriales);
    document.body.classList.toggle('inventory-route-maquinas', isMaquinas);
    document.body.classList.toggle('inventory-route-tipos-salida', isOutputTypes);
    document.body.classList.toggle('inventory-has-selection', (isMateriales || isMaquinas) && hasSelection);
    document.body.classList.toggle('inventory-view-detail', isTroqueles && currentView === 'detail');
    document.body.classList.toggle('inventory-view-list', !isTroqueles || currentView !== 'detail');

    if (catalogBackButton) {
        catalogBackButton.hidden = !(isTroqueles && currentView === 'detail');
    }
    if (catalogSearchButton) {
        catalogSearchButton.hidden = true;
    }
    syncMachineActions();
    updateInventoryRoute(isTroqueles ? currentView : 'list', itemId || selectedId || '');
}

function syncMachineActions() {
    if (!inventoryActions) return;
    if (catalogNewButton && catalogNewButton.parentElement !== inventoryActions) {
        inventoryActions.appendChild(catalogNewButton);
    }
    if (catalogSaveButton && catalogSaveButton.parentElement !== inventoryActions) {
        inventoryActions.appendChild(catalogSaveButton);
    }
    if (catalogSaveButton) {
        catalogSaveButton.hidden = isMaterialsInventory();
    }
    if (catalogNewButton) {
        catalogNewButton.hidden = !canCreateInventoryRecords();
    }
    if (catalogRefreshButton) {
        catalogRefreshButton.hidden = !isMaterialsInventory();
    }
    if (catalogImportButton) catalogImportButton.hidden = true;
    if (catalogExportButton) catalogExportButton.hidden = true;
    if (inventoryToolbarShell) inventoryToolbarShell.hidden = false;
}

function renderDetailPreview(item) {
    if (!catalogDetailPreview) return;
    if (!supportsImagePreviewInventory()) {
        catalogDetailPreview.hidden = true;
        catalogDetailPreview.innerHTML = '';
        return;
    }

    const fallbackTitle = isOutputTypesInventory() ? 'Nuevo tipo de salida' : 'Nuevo troquel';
    const code = escapeHtml(item.codigo || fallbackTitle);
    const description = item.descripcion ? `<span>${escapeHtml(item.descripcion)}</span>` : '';
    const quoteDescription = item.descripcion_cotizaciones
        ? `<small>${escapeHtml(item.descripcion_cotizaciones)}</small>`
        : (item.nombre && isOutputTypesInventory() ? `<small>${escapeHtml(item.nombre)}</small>` : '');
    const imageUrl = escapeHtml(item.image_url || '');
    const state = item.estado ? `<em class="inventory-detail-chip">${escapeHtml(item.estado)}</em>` : '';
    const active = item.activo !== false ? '<em class="inventory-detail-chip is-active">Activo</em>' : '<em class="inventory-detail-chip">Inactivo</em>';

    catalogDetailPreview.hidden = false;
    catalogDetailPreview.innerHTML = `
        <div class="inventory-detail-copy">
            <div class="inventory-detail-heading">
                <strong>${code}</strong>
                <div class="inventory-detail-tags">${state}${active}</div>
            </div>
            ${description}
            ${quoteDescription}
        </div>
        ${imageUrl ? `<div class="inventory-detail-image-shell"><img src="${imageUrl}" alt="${code}" class="inventory-detail-image"></div>` : ''}
    `;
}

function renderForm(item) {
    if (isOutputTypesInventory()) {
        editorTitle.hidden = true;
        catalogForm.innerHTML = '';
        capabilitiesState = [];
        renderDetailPreview(page.createEmptyItem());
        return;
    }
    catalogForm.innerHTML = '';
    let viewItem = { ...item };
    if (page.inventoryKey === 'maquinas') {
        const primary = Array.isArray(item.capacidades) && item.capacidades.length ? (item.capacidades.find((capacity) => capacity.activa !== false) || item.capacidades[0]) : null;
        viewItem = {
            ...item,
            marca: item.marca || '',
            modelo: item.modelo || '',
            proceso_principal: primary?.proceso || '',
            subproceso: primary?.subproceso || '',
            ancho_max_in: primary?.ancho_max_in ?? 0,
            velocidad_produccion: primary?.velocidad_produccion ?? 0,
            unidad_velocidad_produccion: item.unidad_velocidad_produccion || 'ft/min',
            costo_hora_maquina: primary?.costo_hora_maquina ?? 0,
            costo_hora_operario: primary?.costo_hora_operario ?? 0
        };
    }
    if (page.inventoryKey === 'maquinas') {
        buildMachineTabbedForm(viewItem);
    } else if (page.inventoryKey === 'materiales') {
        buildMaterialTabbedForm(viewItem);
        catalogForm.classList.add('inventory-form-materiales');
        openMaterialModal(item);
        return;
    } else {
        getFormFields().forEach((field) => {
            const control = createInput(field, viewItem[field.key]);
            catalogForm.appendChild(control);
        });
    }
    editorTitle.textContent = page.inventoryKey === 'troqueles'
        ? (item.codigo || 'Nuevo troquel')
        : (item.id ? (item.nombre || item.codigo || item.descripcion || 'Registro') : 'Nuevo registro');
    editorTitle.hidden = page.inventoryKey === 'maquinas';
    catalogForm.classList.toggle('inventory-form-troqueles', page.inventoryKey === 'troqueles');
    catalogForm.classList.toggle('inventory-form-materiales', page.inventoryKey === 'materiales');
    catalogForm.classList.toggle('inventory-form-maquinas', page.inventoryKey === 'maquinas');
    renderDetailPreview(viewItem);

    if (page.inventoryKey === 'maquinas') {
        capabilitiesState = Array.isArray(item.capacidades) ? item.capacidades.map((capacity) => ({ ...capacity })) : [];
    } else {
        capabilitiesState = [];
    }
}

function getFormValue(field) {
    const element = catalogForm.elements.namedItem(field.key);
    if (!element) return '';
    if (field.type === 'checkbox') return element.checked;
    return element.value;
}

function buildPayloadFromForm() {
    const payload = {};
    getFormFields().forEach((field) => {
        if (field.type === 'section' || !field.key) {
            return;
        }
        if (field.type === 'hidden') {
            payload[field.key] = getFormValue(field);
            return;
        }
        if (field.type === 'checkbox') {
            payload[field.key] = Boolean(getFormValue(field));
            return;
        }
        payload[field.key] = getFormValue(field);
    });

    if (page.inventoryKey === 'maquinas') {
        const primary = ensureMachinePrimaryCapability();
        primary.proceso = payload.proceso_principal || primary.proceso || '';
        primary.subproceso = payload.subproceso || primary.subproceso || '';
        primary.ancho_max_in = payload.ancho_max_in;
        primary.velocidad_produccion = payload.velocidad_produccion;
        primary.costo_hora_maquina = payload.costo_hora_maquina;
        primary.costo_hora_operario = payload.costo_hora_operario;
        payload.capacidades = capabilitiesState.map((capacity) => ({ ...capacity }));

        payload.especificaciones = {};
        const especKeys = Object.keys(payload).filter(k => k.startsWith('espec_'));
        especKeys.forEach(k => {
            const specKey = k.replace('espec_', '');
            payload.especificaciones[specKey] = payload[k];
            delete payload[k];
        });

        delete payload.proceso_principal;
        delete payload.subproceso;
        delete payload.ancho_max_in;
        delete payload.velocidad_produccion;
        delete payload.costo_hora_maquina;
        delete payload.costo_hora_operario;
    }

    return payload;
}

function renderTable(items) {
    catalogVisibleCount = Array.isArray(items) ? items.length : 0;
    if (isOutputTypesInventory()) {
        catalogHead.innerHTML = `
            <th class="inventory-output-col-code">Codigo</th>
            <th class="inventory-output-col-image">Imagen</th>
            <th class="inventory-output-col-description">Descripcion</th>
        `;
        catalogBody.innerHTML = buildOutputTypeTableRows(items);
        return;
    }
    const columns = getTableColumns();
    catalogHead.innerHTML = columns.map((column) => {
        const width = column.width ? ` style="width:${escapeHtml(column.width)};min-width:${escapeHtml(column.width)};max-width:${escapeHtml(column.width)};"` : '';
        const className = column.className ? ` class="${escapeHtml(column.className)}"` : '';
        return `<th${className}${width}>${column.label || ''}</th>`;
    }).join('');
    if (!items.length) {
        catalogBody.innerHTML = `<tr><td colspan="${columns.length}">Sin resultados.</td></tr>`;
        requestAnimationFrame(updateCatalogScrollBottomIndicator);
        return;
    }
    const openIcon = getOpenIconConfig();
    const deleteIcon = getDeleteIconConfig();
    catalogBody.innerHTML = items.map((item) => `
        <tr class="${item.id === selectedId ? 'is-active' : ''}" data-id="${escapeHtml(item.id)}">
            ${columns.map((column) => {
                const className = column.className ? ` class="${escapeHtml(column.className)}"` : '';
                if (column.isAction) {
                    if (!isTroquelesInventory()) {
                        const label = escapeHtml(item.codigo || item.nombre || item.descripcion || 'registro');
                        if (supportsDeleteInventory()) {
                            const entityLabel = page.inventoryKey === 'maquinas' ? 'máquina' : 'material';
                            return `<td${className}>
                                <div class="quote-browser-actions">
                                    <button type="button" class="browser-open-link" data-select-item="${escapeHtml(item.id)}" aria-label="Abrir ${entityLabel} ${label}" title="Abrir ${entityLabel} ${label}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, `Abrir ${entityLabel}`, 'table-icon-media')}</button>
                                    <button type="button" class="browser-open-link browser-open-link-danger" data-delete-item="${escapeHtml(item.id)}" data-delete-label="${label}" aria-label="Eliminar ${entityLabel} ${label}" title="Eliminar ${entityLabel} ${label}" style="--icon-color:${escapeHtml(deleteIcon.color)};--icon-hover-color:${escapeHtml(deleteIcon.hover)};--config-icon-size:${escapeHtml(String(deleteIcon.size))}px;">${iconMarkup(deleteIcon.value, `Eliminar ${entityLabel}`, 'table-icon-media')}</button>
                                </div>
                            </td>`;
                        }
                        return `<td${className}><button type="button" class="browser-open-link inventory-edit-link" data-select-item="${escapeHtml(item.id)}" aria-label="Editar ${label}"></button></td>`;
                    }
                    const href = escapeHtml(buildInventoryUrl('detail', item.id));
                    const label = escapeHtml(item.codigo || item.nombre || item.descripcion || 'registro');
                    return `<td${className}><a class="browser-open-link" href="${href}" data-open-detail="${escapeHtml(item.id)}" aria-label="Abrir troquel ${label}" title="Abrir troquel ${label}" style="--icon-color:${escapeHtml(openIcon.color)};--icon-hover-color:${escapeHtml(openIcon.hover)};--config-icon-size:${escapeHtml(String(openIcon.size))}px;">${iconMarkup(openIcon.value, 'Abrir troquel', 'table-icon-media')}</a></td>`;
                }
                const cellValue = column.format ? column.format(item[column.key], item) : formatCellValue(item[column.key]);
                const cellTitle = column.tooltip ? column.tooltip(item[column.key], item) : cellValue;
                return `<td${className} title="${escapeHtml(cellTitle)}">${escapeHtml(cellValue)}</td>`;
            }).join('')}
        </tr>
    `).join('');
    requestAnimationFrame(updateCatalogScrollBottomIndicator);
}

async function loadCatalog(selectId = '') {
    catalogSubtitle.textContent = page.subtitle;
    catalogSubtitle.hidden = !page.subtitle;
    catalogStatus.textContent = 'Cargando inventario...';

    const params = new URLSearchParams({ limit: '500' });
    const term = catalogSearch.value.trim();
    if (term) params.set('q', term);

    const response = await fetch(`${page.endpoint}?${params.toString()}`);
    if (!response.ok) throw new Error('No fue posible cargar el inventario.');

    const payload = await response.json();
    currentItems = payload.items || [];
    if (isOutputTypesInventory() && !currentItems.length) {
        currentItems = [page.createEmptyItem()];
    }

    if (selectId) {
        selectedId = selectId;
    } else if (selectedId && !currentItems.some((item) => item.id === selectedId)) {
        selectedId = '';
    }

    renderTable(currentItems);
    const selectedItem = currentItems.find((item) => item.id === selectedId);
    const modalOpen = materialModalEl?.classList.contains('open');
    if (isMaterialsInventory() && modalOpen) {
        // modal is open, skip form re-render to avoid disruption
    } else if (isMaterialsInventory() && selectedItem) {
        renderForm(selectedItem);
    } else if (isMaterialsInventory() && !selectId) {
        updateInventoryView('list');
    } else {
        renderForm(selectedItem || page.createEmptyItem());
        updateInventoryView(currentView === 'detail' && selectedItem && isTroquelesInventory() ? 'detail' : 'list', selectedItem?.id || '');
    }
    catalogStatus.textContent = isOutputTypesInventory()
        ? ''
        : (isMaterialsInventory() ? '' : `${currentItems.length} registros cargados.`);
    publishBdfgContext();
}

async function loadMachineOptions() {
    const response = await fetch('/api/inventario/maquinas?limit=1000');
    if (!response.ok) {
        machineCatalogOptions = [];
        return;
    }
    const payload = await response.json();
    machineCatalogOptions = payload.items || [];
}

function resetEditor() {
    if (isOutputTypesInventory()) {
        currentItems = collectOutputTypeRows().filter((item) => hasOutputTypeContent(item));
        currentItems = [...currentItems, page.createEmptyItem()];
        renderTable(currentItems);
        catalogStatus.textContent = 'Fila nueva lista para capturar.';
        focusOutputTypeRow(currentItems.length - 1);
        return;
    }
    selectedId = '';
    renderTable(currentItems);
    renderForm(page.createEmptyItem());
    if (!isMaterialsInventory()) {
        updateInventoryView(isOutputTypesInventory() ? 'list' : 'detail');
        catalogStatus.textContent = 'Formulario listo para un nuevo registro.';
    }
    publishBdfgContext();
}

async function deleteCurrentMaterial(id, label) {
    const recordId = String(id || '').trim();
    if (!recordId) return;
    const entityName = page.inventoryKey === 'maquinas' ? 'esta máquina' : 'este material';
    const recordLabel = String(label || entityName).trim() || entityName;
    const confirmed = window.confirm(`Se va a eliminar ${recordLabel}. Esta acción no se puede deshacer.\n\n¿Deseas continuar?`);
    if (!confirmed) return;

    catalogStatus.textContent = `Eliminando ${recordLabel}...`;
    const response = await fetch(`${page.endpoint}/${encodeURIComponent(recordId)}`, {
        method: 'DELETE'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || `No fue posible eliminar ${entityName}.`);
    }

    if (selectedId === recordId) {
        selectedId = '';
        if (isMaterialsInventory()) {
            closeMaterialModal();
        } else {
            renderForm(page.createEmptyItem());
            updateInventoryView('list');
        }
    }

    await loadCatalog();
    catalogStatus.textContent = '';
}

async function saveCurrentRecord() {
    if (isOutputTypesInventory()) {
        const rows = collectOutputTypeRows().filter((item) => item.codigo || item.descripcion || item.image_url);
        if (!rows.length) {
            catalogStatus.textContent = 'No hay filas con datos para guardar.';
            return;
        }
        catalogStatus.textContent = 'Guardando tipos de salida...';
        for (const item of rows) {
            const response = await fetch(page.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: item.id || undefined,
                    codigo: item.codigo,
                    nombre: item.nombre,
                    descripcion: item.descripcion,
                    image_url: item.image_url,
                    activo: item.activo
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `No fue posible guardar la fila ${item.__rowIndex + 1}.`);
            }
        }
        await loadCatalog();
        catalogStatus.textContent = 'Tipos de salida guardados. Puedes seguir agregando nuevas filas.';
        focusOutputTypeRow(currentItems.length);
        return;
    }
    const payload = buildPayloadFromForm();
    catalogStatus.textContent = 'Guardando registro...';

    const response = await fetch(page.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'No fue posible guardar el registro.');
    }

    selectedId = result.id;
    await loadCatalog(result.id);
    catalogStatus.textContent = 'Registro guardado correctamente.';
    publishBdfgContext();
}

function scheduleCatalogAutosave(reason = '') {
    if (isOutputTypesInventory() || !selectedId) return;
    window.clearTimeout(catalogAutosaveTimer);
    catalogStatus.textContent = 'Guardando cambios...';
    catalogAutosaveTimer = window.setTimeout(async () => {
        if (catalogAutosaveRunning) {
            scheduleCatalogAutosave(reason);
            return;
        }
        catalogAutosaveRunning = true;
        try {
            await saveCurrentRecord();
            catalogStatus.textContent = 'Cambios guardados automáticamente.';
        } catch (error) {
            catalogStatus.textContent = error.message || 'No fue posible guardar automáticamente.';
        } finally {
            catalogAutosaveRunning = false;
        }
    }, 1200);
}

async function exportCurrentInventory() {
    catalogStatus.textContent = 'Preparando exportación...';
    const response = await fetch(page.exportEndpoint);
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'No fue posible exportar el inventario.');
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/i);
    const fileName = match?.[1] || `${page.inventoryKey}.xlsx`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    catalogStatus.textContent = 'Exportación lista.';
}

async function importInventoryFile(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }

    catalogStatus.textContent = 'Importando archivo...';
    const response = await fetch(page.importEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: file.name,
            contentBase64: btoa(binary)
        })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'No fue posible importar el archivo.');
    }

    await loadCatalog();
    catalogStatus.textContent = `Importación completada. ${result.imported || 0} registros procesados.`;
}

async function importMaterialsFromSap() {
    if (!isMaterialsInventory()) return;
    const importable = Number(catalogSapImportDiagnosis?.importable || 0);
    if (importable <= 0) {
        throw new Error('No hay materiales nuevos para importar.');
    }

    const requested = Number(catalogImportSapLimitInput?.value || importable);
    const safeLimit = Math.min(importable, Math.max(1, Math.floor(requested || importable)));

    setCatalogSapImportPopoverStatus(`Importando ${safeLimit} materiales desde SAP...`);
    setSapImportStatus('Importando materiales desde SAP...', '');
    catalogStatus.textContent = 'Importando materiales desde SAP...';
    if (ejecutarCatalogImportSapButton) ejecutarCatalogImportSapButton.disabled = true;

    const response = await fetch('/api/inventario/materiales/importar-sap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: safeLimit })
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'No fue posible importar materiales desde SAP.');
    }

    await loadCatalog();
    setSapImportStatus(buildSapImportSummaryText(result.summary || {}), 'success');
    catalogStatus.textContent = result.message || 'Materiales importados correctamente.';
    setCatalogSapImportPopoverStatus(result.message || 'Materiales importados correctamente.', 'success');
    if (ejecutarCatalogImportSapButton) ejecutarCatalogImportSapButton.disabled = false;
    window.clearTimeout(importMaterialsFromSap._timer);
    importMaterialsFromSap._timer = window.setTimeout(() => setSapImportStatus('', ''), 7000);
}

async function runCatalogSapImportDiagnosis() {
    if (!isMaterialsInventory()) return;
    setCatalogSapImportPopoverStatus('Consultando y diagnosticando materiales en SAP...');
    if (catalogImportSapPopoverSummary) catalogImportSapPopoverSummary.innerHTML = '';
    if (ejecutarCatalogImportSapButton) ejecutarCatalogImportSapButton.disabled = true;

    const response = await fetch('/api/inventario/materiales/importar-sap/diagnostico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.error || 'No fue posible diagnosticar materiales desde SAP.');
    }

    catalogSapImportDiagnosis = payload.summary || {};
    renderCatalogSapImportDiagnosis(catalogSapImportDiagnosis);
    const importable = Number(catalogSapImportDiagnosis.importable || 0);
    if (catalogImportSapLimitInput) {
        catalogImportSapLimitInput.max = String(Math.max(importable, 1));
        catalogImportSapLimitInput.value = importable ? String(importable) : '';
    }
    if (ejecutarCatalogImportSapButton) ejecutarCatalogImportSapButton.disabled = importable <= 0;
    setCatalogSapImportPopoverStatus(importable > 0 ? 'Diagnóstico listo. Indica cuántos quieres importar.' : 'No hay materiales nuevos disponibles para importar.', importable <= 0 ? 'error' : '');
}

function openCatalogSapImportPopover() {
    if (!catalogImportSapPopover || !isMaterialsInventory()) return;
    catalogImportSapPopover.hidden = false;
    document.body.classList.add('popover-open');
    catalogSapImportDiagnosis = null;
    if (catalogImportSapLimitInput) {
        catalogImportSapLimitInput.value = '';
        catalogImportSapLimitInput.removeAttribute('max');
    }
    runCatalogSapImportDiagnosis().catch((error) => {
        setCatalogSapImportPopoverStatus(error.message || 'No fue posible diagnosticar materiales desde SAP.', 'error');
    });
}

function closeCatalogSapImportPopover() {
    if (!catalogImportSapPopover) return;
    catalogImportSapPopover.hidden = true;
    document.body.classList.remove('popover-open');
    catalogSapImportDiagnosis = null;
    setCatalogSapImportPopoverStatus('', '');
}

function handleCatalogTouchAction(event, element, action) {
    if (!element || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) return false;
    event.preventDefault();
    event.stopPropagation();
    element.dataset.pointerHandled = 'true';
    action();
    return true;
}

function consumeCatalogTouchAction(element) {
    if (!element || element.dataset.pointerHandled !== 'true') return false;
    delete element.dataset.pointerHandled;
    return true;
}

catalogBody.addEventListener('pointerdown', (event) => {
    if (isOutputTypesInventory()) return;

    const openLink = event.target.closest('[data-open-detail]');
    if (openLink) {
        handleCatalogTouchAction(event, openLink, () => {
            selectedId = openLink.dataset.openDetail || '';
            const selectedItem = currentItems.find((item) => item.id === selectedId);
            renderTable(currentItems);
            if (selectedItem) {
                renderForm(selectedItem);
                updateInventoryView('detail', selectedId);
                catalogStatus.textContent = 'Troquel abierto.';
                publishBdfgContext();
            }
        });
        return;
    }

    const editButton = event.target.closest('[data-select-item]');
    if (editButton) {
        handleCatalogTouchAction(event, editButton, () => {
            selectedId = editButton.dataset.selectItem || '';
            renderTable(currentItems);
            const selectedItem = currentItems.find((item) => item.id === selectedId);
            if (selectedItem) {
                renderForm(selectedItem);
                if (!isMaterialsInventory()) {
                    updateInventoryView('list', selectedId);
                    catalogStatus.textContent = 'Registro cargado en el editor.';
                }
                publishBdfgContext();
            }
        });
    }
});

catalogBody.addEventListener('click', (event) => {
    if (isOutputTypesInventory()) {
        const uploadButton = event.target.closest('[data-action="upload-output-image"]');
        if (uploadButton) {
            const index = uploadButton.dataset.rowIndex;
            catalogBody.querySelector(`[data-output-file="${index}"]`)?.click();
            return;
        }
        return;
    }
    const openLink = event.target.closest('[data-open-detail]');
    if (openLink) {
        event.preventDefault();
        event.stopPropagation();
        if (consumeCatalogTouchAction(openLink)) return;
        selectedId = openLink.dataset.openDetail || '';
        const selectedItem = currentItems.find((item) => item.id === selectedId);
        renderTable(currentItems);
        if (selectedItem) {
            renderForm(selectedItem);
            updateInventoryView('detail', selectedId);
            catalogStatus.textContent = 'Troquel abierto.';
            publishBdfgContext();
        }
        return;
    }
    const editButton = event.target.closest('[data-select-item]');
    if (editButton) {
        event.preventDefault();
        event.stopPropagation();
        if (consumeCatalogTouchAction(editButton)) return;
        selectedId = editButton.dataset.selectItem || '';
        renderTable(currentItems);
        const selectedItem = currentItems.find((item) => item.id === selectedId);
        if (selectedItem) {
            renderForm(selectedItem);
            if (!isMaterialsInventory()) {
                updateInventoryView('list', selectedId);
                catalogStatus.textContent = 'Registro cargado en el editor.';
            }
            publishBdfgContext();
        }
        return;
    }
    const deleteButton = event.target.closest('[data-delete-item]');
    if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();
        if (consumeCatalogTouchAction(deleteButton)) return;
        deleteCurrentMaterial(deleteButton.dataset.deleteItem, deleteButton.dataset.deleteLabel).catch((error) => {
            catalogStatus.textContent = error.message;
        });
        return;
    }
    const row = event.target.closest('tr[data-id]');
    if (!row) return;
    selectedId = row.dataset.id || '';
    renderTable(currentItems);
    const selectedItem = currentItems.find((item) => item.id === selectedId);
    if (selectedItem) {
        renderForm(selectedItem);
        if (isMaterialsInventory()) {
            publishBdfgContext();
        } else if (isTroquelesInventory()) {
            updateInventoryView('list', selectedId);
            catalogStatus.textContent = 'Troquel seleccionado.';
            publishBdfgContext();
        } else {
            updateInventoryView('list', selectedId);
            catalogStatus.textContent = 'Registro cargado en el editor.';
            publishBdfgContext();
        }
    }
});

catalogBody.addEventListener('change', (event) => {
    if (!isOutputTypesInventory()) return;
    const fileInput = event.target.closest('[data-output-file]');
    if (!fileInput) return;
    const row = fileInput.closest('tr[data-output-row]');
    const shell = row?.querySelector('.inventory-output-image-shell');
    const hidden = row?.querySelector('[data-field="image_url"]');
    const [file] = Array.from(fileInput.files || []);
    if (!row || !shell || !hidden || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        hidden.value = result;
        const label = row.querySelector('[data-field="codigo"]')?.value || row.querySelector('[data-field="descripcion"]')?.value || 'Salida';
        shell.innerHTML = `<img src="${escapeHtml(result)}" alt="${escapeHtml(label)}" class="inventory-output-image">`;
    };
    reader.readAsDataURL(file);
});

catalogSearchButton.addEventListener('click', () => {
loadCatalog().catch((error) => {
    catalogStatus.textContent = error.message;
});
});

catalogSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        loadCatalog().catch((error) => {
            catalogStatus.textContent = error.message;
        });
    }, 220);
});

catalogSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        loadCatalog().catch((error) => {
            catalogStatus.textContent = error.message;
        });
    }
});

catalogNewButton.addEventListener('click', resetEditor);
catalogBackButton?.addEventListener('click', () => {
    updateInventoryView('list');
    catalogStatus.textContent = 'Listado de troqueles listo.';
});
catalogSaveButton.addEventListener('click', () => {
    saveCurrentRecord().catch((error) => {
        catalogStatus.textContent = error.message;
    });
});
catalogForm.addEventListener('input', (event) => {
    if (!event.target?.name) return;
    renderDetailPreview(buildPayloadFromForm());
    scheduleCatalogAutosave('form-input');
});
catalogForm.addEventListener('change', (event) => {
    if (!event.target?.name) return;
    renderDetailPreview(buildPayloadFromForm());
    scheduleCatalogAutosave('form-change');
});
catalogRefreshButton?.addEventListener('click', () => {
    loadCatalog(selectedId).catch((error) => {
        catalogStatus.textContent = error.message;
    });
});
catalogExportButton.addEventListener('click', () => {
    exportCurrentInventory().catch((error) => {
        catalogStatus.textContent = error.message;
    });
});
catalogImportButton.addEventListener('click', () => catalogImportInput.click());
catalogHeaderSearchButton?.addEventListener('click', () => {
    catalogSearch.focus();
    catalogSearch.select?.();
});
catalogMenuToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleHeaderMenu();
});
catalogImportInput.addEventListener('change', () => {
    const file = catalogImportInput.files?.[0];
    if (!file) return;
    importInventoryFile(file).catch((error) => {
        catalogStatus.textContent = error.message;
    }).finally(() => {
        catalogImportInput.value = '';
    });
});

document.addEventListener('click', (event) => {
    if (!catalogMenuPanel?.hidden && !catalogMenuPanel.contains(event.target) && !catalogMenuToggle?.contains(event.target)) {
        toggleHeaderMenu(false);
    }
});
catalogTableWrap?.addEventListener('scroll', updateCatalogScrollBottomIndicator, { passive: true });
window.addEventListener('resize', updateCatalogScrollBottomIndicator);
catalogImportSapPopover?.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-catalog-import-popover="true"]')) {
        closeCatalogSapImportPopover();
    }
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && catalogImportSapPopover && !catalogImportSapPopover.hidden) {
        closeCatalogSapImportPopover();
    }
});

if (isOutputTypesInventory()) {
    catalogNewButton.textContent = 'Agregar fila';
    catalogSaveButton.textContent = 'Guardar cambios';
    catalogSearch.placeholder = 'Buscar por codigo o descripcion';
}

if (isMaterialsInventory()) {
    catalogSearch.placeholder = 'Buscar por código o nombre';
}

if (catalogImportSapButton) {
    catalogImportSapButton.hidden = !isMaterialsInventory();
    if (isMaterialsInventory()) {
        catalogImportSapButton.addEventListener('click', openCatalogSapImportPopover);
    }
}

cerrarCatalogImportSapPopoverButton?.addEventListener('click', closeCatalogSapImportPopover);
cancelarCatalogImportSapPopoverButton?.addEventListener('click', closeCatalogSapImportPopover);
ejecutarCatalogImportSapButton?.addEventListener('click', () => {
    importMaterialsFromSap().catch((error) => {
        if (ejecutarCatalogImportSapButton) ejecutarCatalogImportSapButton.disabled = false;
        setCatalogSapImportPopoverStatus(error.message, 'error');
        setSapImportStatus(error.message, 'error');
        catalogStatus.textContent = error.message;
    });
});

Promise.all([loadHeaderConfig(), loadMachineOptions(), loadCatalog()]).catch((error) => {
    catalogStatus.textContent = error.message;
});
