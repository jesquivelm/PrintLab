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
const catalogImportButton = document.getElementById('catalogImportButton');
const catalogExportButton = document.getElementById('catalogExportButton');
const catalogBackButton = document.getElementById('catalogBackButton');
const catalogImportInput = document.getElementById('catalogImportInput');
const machineCapabilitiesSection = document.getElementById('machineCapabilitiesSection');
const machineCapabilitiesList = document.getElementById('machineCapabilitiesList');
const addCapabilityButton = document.getElementById('addCapabilityButton');
const catalogHeaderSearchButton = document.getElementById('catalogHeaderSearchButton');
const catalogMenuToggle = document.getElementById('catalogMenuToggle');
const catalogMenuPanel = document.getElementById('catalogMenuPanel');
const catalogDetailPreview = document.getElementById('catalogDetailPreview');
const inventoryToolbarShell = document.querySelector('.inventory-toolbar-shell');
const inventoryActions = document.querySelector('.inventory-actions');
const inventoryPanelHead = document.querySelector('.inventory-panel-head');
const inventoryEditorPanel = document.querySelector('.inventory-editor-panel');

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
                ['codigo', 'Código'],
                ['nombre', 'Nombre'],
                ['familia_proceso', 'Proceso'],
                ['tipo_proforma', 'Familia Comercial'],
                ['costo_x_libra', 'Costo Libra'],
                ['peso_capa_gsm', 'GSM Tinta'],
                ['ancho_mm', 'Ancho mm'],
                ['gramaje_g_m2', 'Gramaje'],
                ['activo', 'Activo']
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
                    costo_x_unidad: '',
                    merma_pct: '',
                    rendimiento_g_ft2: '',
                    temperatura_aplicacion_c: '',
                    tipo_transferencia: '',
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
                { type: 'section', label: 'Informacion General', span: 2 },
                { key: 'nombre', label: 'Nombre', type: 'text' },
                { key: 'marca', label: 'Marca', type: 'text' },
                { key: 'modelo', label: 'Modelo', type: 'text' },
                { key: 'tipo', label: 'Tipo', type: 'select', options: [['', 'Sin definir'], ['Convencional', 'Convencional'], ['Digital', 'Digital'], ['Hibrido', 'Híbrido'], ['ABG', 'ABG'], ['P5', 'P5']] },
                { key: 'proceso_principal', label: 'Proceso Principal', type: 'text' },
                { key: 'subproceso', label: 'Subproceso', type: 'text' },
                { key: 'factor_preparacion', label: 'Setup', type: 'number', step: '0.01' },
                { key: 'factor_montaje_estacion', label: 'Montaje', type: 'number', step: '0.01' },
                { key: 'comentario_setup', label: 'Comentario Setup', type: 'textarea', rows: 2 },
                { key: 'comentario_montaje', label: 'Comentario Montaje', type: 'textarea', rows: 2 },
                { key: 'ancho_max_in', label: 'Ancho Max in', type: 'number', step: '0.01' },
                { key: 'velocidad_produccion', label: 'Velocidad Produccion', type: 'number', step: '0.01' },
                { key: 'unidad_velocidad_produccion', label: 'Unidad Velocidad', type: 'select', options: [['ft/min', 'ft/min'], ['m/min', 'm/min']] },
                { key: 'costo_hora_maquina', label: 'Costo Hora Maquina', type: 'number', step: '0.01' },
                { key: 'costo_hora_operario', label: 'Costo Hora Hombre', type: 'number', step: '0.01' },
                { key: 'activa', label: 'Activa', type: 'checkbox' }
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
                    factor_montaje_estacion: 0,
                    factor_preparacion: 0,
                    comentario_setup: '',
                    comentario_montaje: '',
                    macula_default_pies: 0,
                    capacidades: []
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

const page = resolveRouteConfig();
const PRESENTATION_KEY = page.presentationKey;
let currentItems = [];
const routeState = new URLSearchParams(window.location.search);
let selectedId = routeState.get('id') || '';
let capabilitiesState = [];
let machineCatalogOptions = [];
let currentView = routeState.get('view') === 'detail' ? 'detail' : 'list';
let searchTimer = null;

function isTroquelesInventory() {
    return page.inventoryKey === 'troqueles';
}

function isOutputTypesInventory() {
    return page.inventoryKey === 'tipos-salida';
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
    button.innerHTML = `<span class="icon-glyph" aria-hidden="true">${value}</span>`;
    button.setAttribute('aria-label', altText);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
    const actionColumn = { key: 'open', label: '', width: '56px', className: 'inventory-col-open', isAction: true };
    if (!isTroquelesInventory()) {
        return [
            ...page.columns.map((column) => Array.isArray(column)
                ? { key: column[0], label: column[1] }
                : column),
            actionColumn
        ];
    }

    return [
        actionColumn,
        { key: 'codigo', label: 'CÃ³digo', width: '92px', className: 'inventory-col-code' },
        { key: 'descripcion', label: 'DescripciÃ³n', width: '240px', className: 'inventory-col-description' },
        { key: 'ancho_etiqueta_in', label: 'Ancho in', width: '92px', className: 'inventory-col-number' },
        { key: 'largo_etiqueta_in', label: 'Largo in', width: '92px', className: 'inventory-col-number' },
        { key: 'desarrollo_in', label: 'Desarrollo', width: '92px', className: 'inventory-col-number' },
        { key: 'elongacion_pct', label: 'ElongaciÃ³n', width: '96px', className: 'inventory-col-number' },
        { key: 'dientes', label: 'Dientes', width: '74px', className: 'inventory-col-number' },
        { key: 'cantidad_filas', label: 'Filas', width: '66px', className: 'inventory-col-number' },
        { key: 'repeticiones', label: 'Repeticiones', width: '96px', className: 'inventory-col-number' },
        { key: 'estado', label: 'Estado', width: '90px', className: 'inventory-col-status' }
    ];
}

function getFormFields() {
    if (page.inventoryKey === 'materiales') return [
        { key: 'id', type: 'hidden' },
        { type: 'section', label: 'Datos del Material', span: 2 },
        { key: 'codigo', label: 'Código', type: 'text' },
        { key: 'nombre', label: 'Nombre', type: 'text' },
        { key: 'familia_proceso', label: 'Proceso', type: 'select', options: [['', 'Sin definir'], ['sustrato', 'Sustrato'], ['tinta', 'Tinta'], ['barniz', 'Barniz'], ['laminado', 'Laminado'], ['foil', 'Foil'], ['core', 'Core'], ['plancha', 'Plancha']] },
        { key: 'ancho_mm', label: 'Ancho mm', type: 'number', step: '0.001', className: 'inventory-material-field' },
        { key: 'comentario_ancho_mm', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'largo_mm', label: 'Largo mm', type: 'number', step: '0.001', className: 'inventory-material-field' },
        { key: 'comentario_largo_mm', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'gramaje_g_m2', label: 'Gramaje g/m²', type: 'number', step: '0.001', className: 'inventory-material-field' },
        { key: 'comentario_gramaje_g_m2', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'calibre_micras', label: 'Calibre micras', type: 'number', step: '0.001', className: 'inventory-material-field' },
        { key: 'comentario_calibre_micras', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'tipo_proforma', label: 'Familia Comercial', type: 'text', className: 'inventory-material-field' },
        { key: 'comentario_tipo_proforma', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'activo', label: 'Activo', type: 'checkbox', className: 'inventory-material-field' },
        { key: 'compatible_convencional', label: 'Compatible Convencional', type: 'checkbox', className: 'inventory-material-field' },
        { key: 'compatible_digital', label: 'Compatible Digital', type: 'checkbox', className: 'inventory-material-field' },
        { type: 'section', label: 'Datos para Cotización', span: 2 },
        { key: 'costo_x_lamina', label: 'Costo Lámina', type: 'number', step: '0.000001', className: 'inventory-material-field' },
        { key: 'comentario_costo_x_lamina', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'costo_x_libra', label: 'Costo Libra', type: 'number', step: '0.000001', className: 'inventory-material-field' },
        { key: 'comentario_costo_x_libra', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'peso_capa_gsm', label: 'GSM Tinta', type: 'number', step: '0.0001', className: 'inventory-material-field' },
        { key: 'comentario_peso_capa_gsm', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'rendimiento_g_ft2', label: 'Rendimiento g/ftÂ²', type: 'number', step: '0.0001', className: 'inventory-material-field' },
        { key: 'comentario_rendimiento_g_ft2', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'merma_pct', label: 'Merma %', type: 'number', step: '0.0001', className: 'inventory-material-field' },
        { key: 'costo_x_unidad', label: 'Costo Unidad', type: 'number', step: '0.000001', className: 'inventory-material-field' },
        { key: 'temperatura_aplicacion_c', label: 'Temperatura C', type: 'number', step: '0.0001', className: 'inventory-material-field' },
        { key: 'tipo_transferencia', label: 'Tipo Transferencia', type: 'text', className: 'inventory-material-field' },
        { type: 'section', label: 'Campos en Revisión', span: 2 },
        { key: 'costo_x_msi', label: 'Costo MSI', type: 'number', step: '0.000001', className: 'inventory-material-field' },
        { key: 'comentario_costo_x_msi', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'costo_x_m2', label: 'Costo m²', type: 'number', step: '0.000001', className: 'inventory-material-field' },
        { key: 'comentario_costo_x_m2', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' },
        { key: 'costo_x_kg', label: 'Costo kg', type: 'number', step: '0.000001', className: 'inventory-material-field' },
        { key: 'comentario_costo_x_kg', label: 'Comentario', type: 'textarea', rows: 2, className: 'inventory-material-comment' }
    ];
    if (!isTroquelesInventory()) return page.formFields;
    return [
        { key: 'id', type: 'hidden' },
        { type: 'section', label: 'InformaciÃ³n General', span: 3 },
        { key: 'codigo', label: 'Id Troquel', type: 'text' },
        { key: 'clasificacion', label: 'ClasificaciÃ³n', type: 'text' },
        { key: 'activo', label: 'Activo', type: 'checkbox' },
        { key: 'descripcion', label: 'DescripciÃ³n Troquel', type: 'text', span: 2 },
        { key: 'descripcion_cotizaciones', label: 'DescripciÃ³n CotizaciÃ³n', type: 'text' },
        { key: 'estado', label: 'Estado Troquel', type: 'text' },
        { key: 'tipo_troquel', label: 'Tipo Troquel', type: 'text' },
        { key: 'tipo_troquel_2', label: 'Tipo Troquel 2', type: 'text' },
        { key: 'estructura_troquel', label: 'Estructura', type: 'text' },
        { key: 'codigo_cliente', label: 'CÃ³digo Cliente', type: 'text' },
        { key: 'codigo_preprensa', label: 'CÃ³digo Preprensa', type: 'text' },
        { key: 'usuario_creacion', label: 'Usuario CreaciÃ³n', type: 'text' },
        { type: 'section', label: 'ProducciÃ³n y Montaje', span: 3 },
        { key: 'desarrollo_in', label: 'Desarrollo in', type: 'number', step: '0.01' },
        { key: 'desarrollo_cm', label: 'Desarrollo cm', type: 'number', step: '0.01' },
        { key: 'elongacion_pct', label: 'ElongaciÃ³n %', type: 'number', step: '0.01' },
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
        { key: 'tension', label: 'TensiÃ³n', type: 'text' },
        { key: 'dimensiones_troquel_in', label: 'Dimensiones Troquel in', type: 'text', span: 3 },
        { type: 'section', label: 'Medidas y Control', span: 3 },
        { key: 'area_etiqueta_excesos_in', label: 'Ãrea Etiqueta c/Excesos inÂ²', type: 'number', step: '0.01' },
        { key: 'area_etiqueta_in', label: 'Ãrea Etiqueta inÂ²', type: 'number', step: '0.01' },
        { key: 'area_troquel_in2', label: 'Ãrea Troquel inÂ²', type: 'number', step: '0.01' },
        { key: 'uso_convencional', label: 'Uso Convencional', type: 'checkbox' },
        { key: 'uso_digital', label: 'Uso Digital', type: 'checkbox' },
        { key: 'codigo_proveedor', label: 'CÃ³digo Proveedor', type: 'text' },
        { key: 'proveedor_troquel', label: 'Proveedor Troquel', type: 'text' },
        { key: 'vida_util_golpes_restantes', label: 'Vida Ãštil Golpes Restantes', type: 'number', step: '0.01' },
        { key: 'vida_util_golpes_usados', label: 'Vida Ãštil Golpes Usados', type: 'number', step: '0.01' },
        { key: 'vida_util_golpes_total', label: 'Vida Ãštil Golpes Total', type: 'number', step: '0.01' },
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
    if (value === null || typeof value === 'undefined' || value === '') return '—';
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
}

async function loadHeaderConfig() {
    const response = await fetch('/api/config/general');
    if (!response.ok) throw new Error('No se pudo cargar la configuración.');
    applyConfig(await response.json());
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
    input.value = value ?? '';
    if (field.inputClass) input.classList.add(field.inputClass);
    label.appendChild(input);
    return label;
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

function renderCapabilities() {
    machineCapabilitiesList.innerHTML = '';
    if (!capabilitiesState.length) {
        const empty = document.createElement('div');
        empty.className = 'inventory-empty-note';
        empty.textContent = 'Sin procesos definidos para esta máquina.';
        machineCapabilitiesList.appendChild(empty);
        return;
    }

    capabilitiesState.forEach((capacity, index) => {
        const card = document.createElement('div');
        card.className = 'machine-capability-card';
        card.innerHTML = `
            <div class="machine-capability-header">
                <strong>${index === 0 ? 'Capacidad principal' : `Proceso ${index + 1}`}</strong>
                <button type="button" class="action-btn" data-remove-capacity="${index}">Quitar</button>
            </div>
            <div class="config-form-grid config-form-grid-wide">
                <label><span>Clasificación</span><input type="text" data-capacity="${index}" data-key="clasificacion" value="${escapeHtml(capacity.clasificacion || '')}"></label>
                <label><span>Proceso</span><input type="text" data-capacity="${index}" data-key="proceso" value="${escapeHtml(capacity.proceso || '')}"></label>
                <label><span>Subproceso</span><input type="text" data-capacity="${index}" data-key="subproceso" value="${escapeHtml(capacity.subproceso || '')}"></label>
                <label><span>Unidad trabajo</span><input type="text" data-capacity="${index}" data-key="unidad_trabajo" value="${escapeHtml(capacity.unidad_trabajo || '')}"></label>
                <label><span>Setup</span><input type="number" step="0.01" data-capacity="${index}" data-key="tiempo_preparacion_general" value="${escapeHtml(capacity.tiempo_preparacion_general ?? 0)}"></label>
                <label><span>Prep. adicional</span><input type="number" step="0.01" data-capacity="${index}" data-key="tiempo_adicional_preparacion" value="${escapeHtml(capacity.tiempo_adicional_preparacion ?? 0)}"></label>
                <label><span>Montaje</span><input type="number" step="0.01" data-capacity="${index}" data-key="tiempo_por_estacion" value="${escapeHtml(capacity.tiempo_por_estacion ?? 0)}"></label>
                <label><span>Factor por área</span><input type="number" step="0.01" data-capacity="${index}" data-key="factor_proceso_por_area" value="${escapeHtml(capacity.factor_proceso_por_area ?? 0)}"></label>
                <label><span>Velocidad producción</span><input type="number" step="0.01" data-capacity="${index}" data-key="velocidad_produccion" value="${escapeHtml(capacity.velocidad_produccion ?? 0)}"></label>
                <label><span>Costo hora máquina</span><input type="number" step="0.01" data-capacity="${index}" data-key="costo_hora_maquina" value="${escapeHtml(capacity.costo_hora_maquina ?? 0)}"></label>
                <label><span>Costo hora operario</span><input type="number" step="0.01" data-capacity="${index}" data-key="costo_hora_operario" value="${escapeHtml(capacity.costo_hora_operario ?? 0)}"></label>
                <label><span>Fórmula tiempo</span><input type="text" data-capacity="${index}" data-key="formula_tiempo" value="${escapeHtml(capacity.formula_tiempo || '')}"></label>
                <label><span>Fórmula costo</span><input type="text" data-capacity="${index}" data-key="formula_costo" value="${escapeHtml(capacity.formula_costo || '')}"></label>
                <label class="inventory-checkbox-field"><span>Activa</span><input type="checkbox" data-capacity="${index}" data-key="activa" ${capacity.activa !== false ? 'checked' : ''}></label>
            </div>
        `;
        machineCapabilitiesList.appendChild(card);
    });
}

function renderForm(item) {
    if (isOutputTypesInventory()) {
        editorTitle.hidden = true;
        catalogForm.innerHTML = '';
        machineCapabilitiesSection.hidden = true;
        capabilitiesState = [];
        machineCapabilitiesList.innerHTML = '';
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
    getFormFields().forEach((field) => {
        const control = createInput(field, viewItem[field.key]);
        catalogForm.appendChild(control);
    });
    editorTitle.textContent = page.inventoryKey === 'troqueles'
        ? (item.codigo || 'Nuevo troquel')
        : (item.id ? `Editor | ${item.nombre || item.codigo || item.descripcion || 'Registro'}` : 'Editor | Nuevo registro');
    editorTitle.hidden = page.inventoryKey === 'maquinas';
    catalogForm.classList.toggle('inventory-form-troqueles', page.inventoryKey === 'troqueles');
    catalogForm.classList.toggle('inventory-form-materiales', page.inventoryKey === 'materiales');
    catalogForm.classList.toggle('inventory-form-maquinas', page.inventoryKey === 'maquinas');
    renderDetailPreview(viewItem);

    if (page.inventoryKey === 'maquinas') {
        machineCapabilitiesSection.hidden = false;
        capabilitiesState = Array.isArray(item.capacidades) ? item.capacidades.map((capacity) => ({ ...capacity })) : [];
        renderCapabilities();
    } else {
        machineCapabilitiesSection.hidden = true;
        capabilitiesState = [];
        machineCapabilitiesList.innerHTML = '';
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
        return;
    }
    catalogBody.innerHTML = items.map((item) => `
        <tr class="${item.id === selectedId ? 'is-active' : ''}" data-id="${escapeHtml(item.id)}">
            ${columns.map((column) => {
                const className = column.className ? ` class="${escapeHtml(column.className)}"` : '';
                if (column.isAction) {
                    if (!isTroquelesInventory()) {
                        const label = escapeHtml(item.codigo || item.nombre || item.descripcion || 'registro');
                        return `<td${className}><button type="button" class="browser-open-link inventory-edit-link" data-select-item="${escapeHtml(item.id)}" aria-label="Editar ${label}"></button></td>`;
                    }
                    const href = escapeHtml(buildInventoryUrl('detail', item.id));
                    const label = escapeHtml(item.codigo || item.nombre || item.descripcion || 'registro');
                    return `<td${className}><a class="browser-open-link" href="${href}" data-open-detail="${escapeHtml(item.id)}" aria-label="Abrir troquel ${label}">↗</a></td>`;
                }
                return `<td${className} title="${escapeHtml(formatCellValue(item[column.key]))}">${escapeHtml(formatCellValue(item[column.key]))}</td>`;
            }).join('')}
        </tr>
    `).join('');
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
    renderForm(selectedItem || page.createEmptyItem());
    updateInventoryView(currentView === 'detail' && selectedItem && isTroquelesInventory() ? 'detail' : 'list', selectedItem?.id || '');
    catalogStatus.textContent = isOutputTypesInventory()
        ? ''
        : `${currentItems.length} registros cargados.`;
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
    updateInventoryView(isOutputTypesInventory() ? 'list' : 'detail');
    catalogStatus.textContent = 'Formulario listo para un nuevo registro.';
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

function capacitiesStateSanity() {
    if (!Array.isArray(capabilitiesState)) {
        capabilitiesState = [];
    }
}

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
        selectedId = openLink.dataset.openDetail || '';
        const selectedItem = currentItems.find((item) => item.id === selectedId);
        renderTable(currentItems);
        if (selectedItem) {
            renderForm(selectedItem);
            updateInventoryView('detail', selectedId);
            catalogStatus.textContent = 'Troquel abierto.';
        }
        return;
    }
    const editButton = event.target.closest('[data-select-item]');
    if (editButton) {
        selectedId = editButton.dataset.selectItem || '';
        renderTable(currentItems);
        const selectedItem = currentItems.find((item) => item.id === selectedId);
        if (selectedItem) {
            renderForm(selectedItem);
            updateInventoryView('list', selectedId);
            catalogStatus.textContent = 'Registro cargado en el editor.';
        }
        return;
    }
    const row = event.target.closest('tr[data-id]');
    if (!row) return;
    selectedId = row.dataset.id || '';
    renderTable(currentItems);
    const selectedItem = currentItems.find((item) => item.id === selectedId);
    if (selectedItem) {
        renderForm(selectedItem);
        if (isTroquelesInventory()) {
            updateInventoryView('list', selectedId);
            catalogStatus.textContent = 'Troquel seleccionado.';
            return;
        }
        updateInventoryView('list', selectedId);
        catalogStatus.textContent = 'Registro cargado en el editor.';
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

addCapabilityButton?.addEventListener('click', () => {
    capabilitiesState.push({
        clasificacion: 'produccion',
        proceso: 'Produccion',
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
        activa: true
    });
    renderCapabilities();
});

machineCapabilitiesList?.addEventListener('input', (event) => {
    const input = event.target;
    const capacityIndex = Number(input.dataset.capacity);
    const key = input.dataset.key;
    if (!Number.isInteger(capacityIndex) || !key || !capabilitiesState[capacityIndex]) return;
    capacitiesStateSanity();
    capabilitiesState[capacityIndex][key] = input.type === 'checkbox' ? input.checked : input.value;
});

machineCapabilitiesList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-capacity]');
    if (!button) return;
    const index = Number(button.dataset.removeCapacity);
    if (!Number.isInteger(index)) return;
    capabilitiesState.splice(index, 1);
    renderCapabilities();
});

document.addEventListener('click', (event) => {
    if (!catalogMenuPanel?.hidden && !catalogMenuPanel.contains(event.target) && !catalogMenuToggle?.contains(event.target)) {
        toggleHeaderMenu(false);
    }
});

if (isOutputTypesInventory()) {
    catalogNewButton.textContent = 'Agregar fila';
    catalogSaveButton.textContent = 'Guardar cambios';
    catalogSearch.placeholder = 'Buscar por codigo o descripcion';
}

Promise.all([loadHeaderConfig(), loadMachineOptions(), loadCatalog()]).catch((error) => {
    catalogStatus.textContent = error.message;
});
