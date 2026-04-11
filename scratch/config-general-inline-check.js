
        const PRESENTATION_KEYS = ['cotizaciones','solicitudes','calculos','socios','inventario-mp','inventario-troqueles','inventario-maquinaria','costos','vendedores','ordenes','seguimiento'];
        const PRESENTATION_LABELS = {
            general: 'General',
            'configuracion-general': 'ConfiguraciÃ³n General',
            dashboard: 'Dashboard',
            cotizaciones: 'Cotizaciones',
            solicitudes: 'Solicitudes',
            calculos: 'CÃ¡lculos',
            socios: 'Socios',
            'inventario-mp': 'Inventario Materia Prima',
            'inventario-troqueles': 'Inventario Troqueles',
            'inventario-maquinaria': 'Inventario Maquinaria',
            costos: 'Costos',
            vendedores: 'Vendedores',
            ordenes: 'Ã“rdenes',
            planificacion: 'PlanificaciÃ³n',
            seguimiento: 'Seguimiento'
        };
        const PERMISSION_PRESENTATION_KEYS = ['dashboard', 'socios', 'cotizaciones', 'ordenes', 'planificacion', 'calculos', 'costos', 'inventario-mp', 'inventario-troqueles', 'inventario-maquinaria', 'configuracion-general', 'vendedores', 'seguimiento', 'solicitudes'];
        
        let loadedConfig = {};
        let presentationsData = {};
        let auditLoadedOnce = false;
        let configSaveTimer = null;
        let configSaveInFlight = false;
        let configSaveQueued = false;
        let adminUsers = [];
        let selectedAdminUserId = null;
        let adminUserSaveTimer = null;
        let adminUsersLoadedOnce = false;
        let userAdminPasswordVisible = false;
        let adminPermissions = [];
        let selectedAdminPermissionId = null;
        let adminPermissionSaveTimer = null;
        let adminPermissionsLoadedOnce = false;
        let proformaCurrencyRows = [];
        const configCompanyLogo = document.getElementById('configCompanyLogo');
        const configBrandFallback = document.getElementById('configBrandFallback');
        const configPageTitle = document.getElementById('configPageTitle');
        const configSearchButton = document.getElementById('configSearchButton');
        const configMenuToggle = document.getElementById('configMenuToggle');
        const configMenuPanel = document.getElementById('configMenuPanel');
        const auditModuleFilter = document.getElementById('auditModuleFilter');
        const auditPresentationFilter = document.getElementById('auditPresentationFilter');
        const auditUserFilter = document.getElementById('auditUserFilter');
        const auditDateFromFilter = document.getElementById('auditDateFromFilter');
        const auditDateToFilter = document.getElementById('auditDateToFilter');
        const auditFieldFilter = document.getElementById('auditFieldFilter');
        const auditApplyButton = document.getElementById('auditApplyButton');
        const auditResetButton = document.getElementById('auditResetButton');
        const auditTableBody = document.getElementById('auditTableBody');
        const userAdminTableBody = document.getElementById('userAdminTableBody');
        const userAdminCreateButton = document.getElementById('userAdminCreateButton');
        const userAdminDetailEmpty = document.getElementById('userAdminDetailEmpty');
        const userAdminDetailShell = document.getElementById('userAdminDetailShell');
        const userAdminPhotoDropzone = document.getElementById('userAdminPhotoDropzone');
        const userAdminPhotoUpload = document.getElementById('userAdminPhotoUpload');
        const userAdminSignatureDropzone = document.getElementById('userAdminSignatureDropzone');
        const userAdminSignatureUpload = document.getElementById('userAdminSignatureUpload');
        const userAdminDetailName = document.getElementById('userAdminDetailName');
        const userAdminDetailSubline = document.getElementById('userAdminDetailSubline');
        const userAdminSummaryUsername = document.getElementById('userAdminSummaryUsername');
        const userAdminSummaryDepartment = document.getElementById('userAdminSummaryDepartment');
        const userAdminSummaryProcess = document.getElementById('userAdminSummaryProcess');
        const userAdminSummaryPermission = document.getElementById('userAdminSummaryPermission');
        const userAdminFieldName = document.getElementById('userAdminFieldName');
        const userAdminFieldUsername = document.getElementById('userAdminFieldUsername');
        const userAdminFieldPassword = document.getElementById('userAdminFieldPassword');
        const userAdminPasswordToggle = document.getElementById('userAdminPasswordToggle');
        const userAdminFieldDepartment = document.getElementById('userAdminFieldDepartment');
        const userAdminFieldProcess = document.getElementById('userAdminFieldProcess');
        const userAdminFieldPermission = document.getElementById('userAdminFieldPermission');
        const userAdminCreatePopover = document.getElementById('userAdminCreatePopover');
        const userAdminCreateNameField = document.getElementById('userAdminCreateNameField');
        const userAdminCreateCancel = document.getElementById('userAdminCreateCancel');
        const userAdminCreateConfirm = document.getElementById('userAdminCreateConfirm');
        const permissionAdminTableBody = document.getElementById('permissionAdminTableBody');
        const permissionAdminCreateButton = document.getElementById('permissionAdminCreateButton');
        const permissionAdminDetailEmpty = document.getElementById('permissionAdminDetailEmpty');
        const permissionAdminDetailShell = document.getElementById('permissionAdminDetailShell');
        const permissionAdminDeleteButton = document.getElementById('permissionAdminDeleteButton');
        const permissionAdminDetailName = document.getElementById('permissionAdminDetailName');
        const permissionAdminDetailSubline = document.getElementById('permissionAdminDetailSubline');
        const permissionAdminSummaryEdit = document.getElementById('permissionAdminSummaryEdit');
        const permissionAdminSummaryView = document.getElementById('permissionAdminSummaryView');
        const permissionAdminSummaryLanding = document.getElementById('permissionAdminSummaryLanding');
        const permissionAdminFieldName = document.getElementById('permissionAdminFieldName');
        const permissionAdminFieldLanding = document.getElementById('permissionAdminFieldLanding');
        const permissionAdminMatrixBody = document.getElementById('permissionAdminMatrixBody');
        const permissionAdminCreatePopover = document.getElementById('permissionAdminCreatePopover');
        const permissionAdminCreateNameField = document.getElementById('permissionAdminCreateNameField');
        const permissionAdminCreateCancel = document.getElementById('permissionAdminCreateCancel');
        const permissionAdminCreateConfirm = document.getElementById('permissionAdminCreateConfirm');
        const proformaLogoDropzone = document.getElementById('proformaLogoDropzone');
        const proformaLogoUpload = document.getElementById('proformaLogoUpload');
        const proformaLogoUrlField = document.getElementById('proformaLogoUrlField');
        const proformaCompanyNameField = document.getElementById('proformaCompanyNameField');
        const proformaSloganField = document.getElementById('proformaSloganField');
        const proformaHeaderColorField = document.getElementById('proformaHeaderColorField');
        const proformaCompanyNameColorField = document.getElementById('proformaCompanyNameColorField');
        const proformaCompanyFontFamilyField = document.getElementById('proformaCompanyFontFamilyField');
        const proformaCompanyFontUploadButton = document.getElementById('proformaCompanyFontUploadButton');
        const proformaCompanyFontUpload = document.getElementById('proformaCompanyFontUpload');
        const proformaCompanyFontUrlField = document.getElementById('proformaCompanyFontUrlField');
        const proformaShowCompanyNameField = document.querySelector('input[name="general.proformaShowCompanyName"]');
        const proformaShowCompanyNameSelector = document.getElementById('proformaShowCompanyNameSelector');
        const proformaPhoneField = document.getElementById('proformaPhoneField');
        const proformaWebsiteField = document.getElementById('proformaWebsiteField');
        const proformaEmailField = document.getElementById('proformaEmailField');
        const proformaLogoWidthField = document.getElementById('proformaLogoWidthField');
        const proformaLogoHeightField = document.getElementById('proformaLogoHeightField');
        const proformaLogoAspectLockButton = document.getElementById('proformaLogoAspectLockButton');
        const proformaLogoAspectLockedField = document.getElementById('proformaLogoAspectLockedField');
        const proformaLogoMarginTopField = document.getElementById('proformaLogoMarginTopField');
        const proformaLogoMarginLeftField = document.getElementById('proformaLogoMarginLeftField');
        const proformaCurrenciesJsonField = document.getElementById('proformaCurrenciesJsonField');
        const proformaCurrenciesTable = document.getElementById('proformaCurrenciesTable');
        const proformaCurrencyAddButton = document.getElementById('proformaCurrencyAddButton');
        const proformaDefaultCurrencyField = document.getElementById('proformaDefaultCurrencyField');
        const proformaValidityField = document.getElementById('proformaValidityField');
        const proformaIntroField = document.getElementById('proformaIntroField');
        const proformaIntroFontFamilyField = document.getElementById('proformaIntroFontFamilyField');
        const proformaIntroFontSizeField = document.getElementById('proformaIntroFontSizeField');
        const proformaIntroColorField = document.getElementById('proformaIntroColorField');
        const proformaTermsField = document.getElementById('proformaTermsField');
        const proformaPaymentTermsField = document.getElementById('proformaPaymentTermsField');
        const proformaDeliveryTimeField = document.getElementById('proformaDeliveryTimeField');
        const proformaTechnicalSpecsField = document.getElementById('proformaTechnicalSpecsField');
        const proformaQualityPoliciesField = document.getElementById('proformaQualityPoliciesField');
        const proformaPriceDisplayField = document.getElementById('proformaPriceDisplayField');
        const proformaSellerSignatureField = document.querySelector('input[name="general.proformaSellerSignatureEnabled"]');
        const proformaSellerSignatureSelector = document.getElementById('proformaSellerSignatureSelector');
        const proformaPreviewHeader = document.getElementById('proformaPreviewHeader');
        const proformaPreviewLogo = document.getElementById('proformaPreviewLogo');
        const proformaPreviewCompany = document.getElementById('proformaPreviewCompany');
        const proformaPreviewSlogan = document.getElementById('proformaPreviewSlogan');
        const proformaPreviewBranding = document.querySelector('#proformaPreviewHeader .proforma-preview-branding');
        const proformaPreviewFontStyle = document.createElement('style');
        proformaPreviewFontStyle.id = 'proformaPreviewFontStyle';
        document.head.appendChild(proformaPreviewFontStyle);
        const proformaPreviewIntro = document.getElementById('proformaPreviewIntro');
        const proformaPreviewCurrency = document.getElementById('proformaPreviewCurrency');
        const proformaPreviewValidity = document.getElementById('proformaPreviewValidity');
        const proformaPreviewPriceMode = document.getElementById('proformaPreviewPriceMode');
        const proformaPreviewSignature = document.getElementById('proformaPreviewSignature');
        const proformaPreviewTerms = document.getElementById('proformaPreviewTerms');
        const proformaPreviewPaymentTerms = document.getElementById('proformaPreviewPaymentTerms');
        const proformaPreviewDeliveryTime = document.getElementById('proformaPreviewDeliveryTime');
        const proformaPreviewTechnicalSpecs = document.getElementById('proformaPreviewTechnicalSpecs');
        const proformaPreviewQualityPolicies = document.getElementById('proformaPreviewQualityPolicies');
        const loginRepositoryUpload = document.getElementById('loginRepositoryUpload');
        const loginRepositoryDropzone = document.getElementById('loginRepositoryDropzone');
        const loginRepositoryUploadPreview = document.getElementById('loginRepositoryUploadPreview');
        const loginRepositoryCount = document.getElementById('loginRepositoryCount');
        const loginRepositoryState = document.getElementById('loginRepositoryState');
        const loginRepositoryStage = document.getElementById('loginRepositoryStage');
        const loginRepositoryStagePlaceholder = document.getElementById('loginRepositoryStagePlaceholder');
        const loginRepositoryStageCaption = document.getElementById('loginRepositoryStageCaption');
        const loginRepositoryGallery = document.getElementById('loginRepositoryGallery');
        const loginScreensaverMotionSeconds = document.getElementById('loginScreensaverMotionSeconds');
        const loginScreensaverMotionSecondsValue = document.getElementById('loginScreensaverMotionSecondsValue');
        const loginScreensaverSlideSeconds = document.getElementById('loginScreensaverSlideSeconds');
        const loginScreensaverSlideSecondsValue = document.getElementById('loginScreensaverSlideSecondsValue');
        const securitySubtabs = [...document.querySelectorAll('.security-subtab')];
        const securitySubpanels = [...document.querySelectorAll('.security-subpanel')];
        const sapAdvancedToggle = document.getElementById('sapAdvancedToggle');
        const sapAdvancedCheckbox = document.getElementById('sapAdvancedCheckbox');
        const sapCompanyInput = document.getElementById('sapCompanyInput');
        const sapHostInput = document.getElementById('sapHostInput');
        const sapPortInput = document.getElementById('sapPortInput');
        const sapProtocolSelect = document.getElementById('sapProtocolSelect');
        const sapUserInput = document.getElementById('sapUserInput');
        const sapPasswordInput = document.getElementById('sapPasswordInput');
        const sapSyncIntervalInput = document.getElementById('sapSyncIntervalInput');
        const sapAllowSelfSignedSelect = document.getElementById('sapAllowSelfSignedSelect');
        const sapAutoSyncSelect = document.getElementById('sapAutoSyncSelect');
        const sapSaveButton = document.getElementById('sapSaveButton');
        const sapTestButton = document.getElementById('sapTestButton');
        const sapSyncButton = document.getElementById('sapSyncButton');
        const sapResetDemoButton = document.getElementById('sapResetDemoButton');
        const sapConfigStatus = document.getElementById('sapConfigStatus');
        const sapQueryEntity = document.getElementById('sapQueryEntity');
        const sapQuerySource = document.getElementById('sapQuerySource');
        const sapQueryFilterInput = document.getElementById('sapQueryFilterInput');
        const sapQuerySearchInput = document.getElementById('sapQuerySearchInput');
        const sapQueryTopInput = document.getElementById('sapQueryTopInput');
        const sapRunQueryButton = document.getElementById('sapRunQueryButton');
        const sapRefreshLogsButton = document.getElementById('sapRefreshLogsButton');
        const sapQueryResult = document.getElementById('sapQueryResult');
        const sapWriteEntity = document.getElementById('sapWriteEntity');
        const sapLoadTemplateButton = document.getElementById('sapLoadTemplateButton');
        const sapSendPayloadButton = document.getElementById('sapSendPayloadButton');
        const sapPayloadInput = document.getElementById('sapPayloadInput');
        const sapWriteResult = document.getElementById('sapWriteResult');
        const sapStatusRow = document.getElementById('sapStatusRow');
        const sapStatusNote = document.getElementById('sapStatusNote');
        const sapLocalCounts = document.getElementById('sapLocalCounts');
        const sapLogList = document.getElementById('sapLogList');
        const LOGIN_REPOSITORY_ENDPOINT = '/api/login-repository';
        let loginRepositoryImages = [];
        let loginRepositoryLoadedOnce = false;
        let loginRepositoryPreviewTimer = null;
        let loginRepositoryPreviewCurrentIndex = 0;
        let loginRepositoryPreviewCurrentSlide = null;
        let loginRepositoryPreviewPrevSlide = null;
        let sapConnectorLoadedOnce = false;
        const LOGIN_SCREENSAVER_ANIM_VARIANTS = ['anim-0', 'anim-1', 'anim-2'];
        const ICON_LIBRARY = [
            { key: 'topBack', label: 'Volver Superior', group: 'Barra Superior', placeholder: '\u2190', color: '#9ba2ab', size: 20 },
            { key: 'topMenu', label: 'Menu Superior', group: 'Barra Superior', placeholder: '\u2261', color: '#9ba2ab', size: 20 },
            { key: 'topSearch', label: 'Busqueda Superior', group: 'Barra Superior', placeholder: '\u2315', color: '#9ba2ab', size: 20 },
            { key: 'topUser', label: 'Usuario Superior', group: 'Barra Superior', placeholder: '\u25D4', color: '#9ba2ab', size: 20 },
            { key: 'dashboardBusinessPartners', label: 'Dashboard Socios', group: 'Dashboard', placeholder: '\u25A6', color: '#0b81b8', size: 38 },
            { key: 'dashboardQuotes', label: 'Dashboard Cotizaciones', group: 'Dashboard', placeholder: '\u25A4', color: '#0b81b8', size: 38 },
            { key: 'dashboardInventory', label: 'Dashboard Inventarios', group: 'Dashboard', placeholder: '\u25A5', color: '#0b81b8', size: 38 },
{ key: 'dashboardOrders', label: 'Dashboard Ã“rdenes', group: 'Dashboard', placeholder: '\u2699', color: '#0b81b8', size: 38 },
{ key: 'dashboardPlanning', label: 'Dashboard PlanificaciÃ³n', group: 'Dashboard', placeholder: '\u25F3', color: '#0b81b8', size: 38 },
{ key: 'dashboardCosts', label: 'Dashboard Costos', group: 'Dashboard', placeholder: '\u25A7', color: '#0b81b8', size: 38 },
            { key: 'dashboardSettings', label: 'Dashboard ConfiguraciÃ³n', group: 'Dashboard', placeholder: '\u2692', color: '#0b81b8', size: 38 },
            { key: 'mobileQuotes', label: 'MÃ³vil Cotizaciones', group: 'Modulo Movil', placeholder: '\u25A4', color: '#0fb9b1', size: 24 },
            { key: 'mobileOrders', label: 'MÃ³vil Ã“rdenes', group: 'Modulo Movil', placeholder: '\u2699', color: '#7c3aed', size: 24 },
            { key: 'mobilePartners', label: 'MÃ³vil Socios', group: 'Modulo Movil', placeholder: '\u25A6', color: '#0fb9b1', size: 24 },
            { key: 'mobileAlerts', label: 'MÃ³vil Alertas', group: 'Modulo Movil', placeholder: '\u25CE', color: '#7c3aed', size: 24 },
            { key: 'mobileTheme', label: 'MÃ³vil Cambiar Tema', group: 'Modulo Movil', placeholder: '\u263C', color: '#0fb9b1', size: 18 },
            { key: 'mobileRefresh', label: 'MÃ³vil Refrescar', group: 'Modulo Movil', placeholder: '\u21BB', color: '#7c3aed', size: 18 },
            { key: 'mobileMenu', label: 'MÃ³vil MenÃº', group: 'Modulo Movil', placeholder: '\u22EF', color: '#6b7280', size: 18 },
            { key: 'dashboardTabClose', label: 'Cerrar Tab Dashboard', group: 'Dashboard', placeholder: '\u2715', color: '#8c97a2', size: 14 },
            { key: 'quotePrev', label: 'Registro Anterior', group: 'Navegacion', placeholder: '\u2039', color: '#9ba2ab', size: 18 },
            { key: 'quoteNext', label: 'Registro Siguiente', group: 'Navegacion', placeholder: '\u203A', color: '#9ba2ab', size: 18 },
            { key: 'quoteLookup', label: 'Buscar Cotizacion', group: 'Navegacion', placeholder: '\u2315', color: '#9ba2ab', size: 18 },
            { key: 'quoteNumberBoldOn', label: 'Numeracion Negrita Activa', group: 'Navegacion', placeholder: 'B', color: '#0b81b8', size: 16 },
            { key: 'quoteNumberBoldOff', label: 'Numeracion Negrita Inactiva', group: 'Navegacion', placeholder: 'b', color: '#8c97a2', size: 16 },
            { key: 'popoverClose', label: 'Cerrar Popover', group: 'Navegacion', placeholder: '\u2715', color: '#6b7580', size: 18 },
            { key: 'browserOpen', label: 'Abrir Listado', group: 'Tablas y Listados', placeholder: '\u2197', color: '#0b81b8', size: 18 },
            { key: 'tableMove', label: 'Mover Fila', group: 'Tablas y Listados', placeholder: '\u22EE\u22EE', color: '#9ba2ab', size: 20 },
            { key: 'tableOpen', label: 'Abrir Detalle Tabla', group: 'Tablas y Listados', placeholder: '\u2699', color: '#9ba2ab', size: 20 },
            { key: 'tableAdd', label: 'Agregar Fila', group: 'Tablas y Listados', placeholder: '+', color: '#9ba2ab', size: 20 },
            { key: 'tableActions', label: 'Acciones Fila', group: 'Tablas y Listados', placeholder: '\u22EF', color: '#9ba2ab', size: 20 },
            { key: 'lineDuplicate', label: 'Duplicar Linea', group: 'Acciones Documento', placeholder: '\u2398', color: '#46515d', size: 18 },
            { key: 'lineCopy', label: 'Copiar Linea', group: 'Acciones Documento', placeholder: '\u2398', color: '#46515d', size: 18 },
            { key: 'lineCreateQuote', label: 'Nueva Cotizacion', group: 'Acciones Documento', placeholder: '\u25A3', color: '#46515d', size: 18 },
            { key: 'lineExport', label: 'Exportar Linea', group: 'Acciones Documento', placeholder: '\u2B73', color: '#46515d', size: 18 },
            { key: 'lineAttachments', label: 'Adjuntos Linea', group: 'Acciones Documento', placeholder: '\uD83D\uDCCE', color: '#46515d', size: 18 },
            { key: 'lineCreateOrder', label: 'Orden Produccion', group: 'Acciones Documento', placeholder: '\u2692', color: '#46515d', size: 18 },
            { key: 'lineCreateProductionOrder', label: 'Crear Orden Produccion', group: 'Acciones Documento', placeholder: '\u21E2', color: '#0b81b8', size: 18 },
            { key: 'lineDelete', label: 'Eliminar Linea', group: 'Acciones Documento', placeholder: '\u2715', color: '#a74343', size: 18 },
            { key: 'copyQuoteSend', label: 'Enviar a Cotizacion', group: 'Acciones Documento', placeholder: '\u27A4', color: '#0b81b8', size: 16 },
            { key: 'attachmentUpload', label: 'Cargar Adjunto', group: 'Acciones Documento', placeholder: '\u21E7', color: '#0b81b8', size: 18 },
            { key: 'attachmentDownload', label: 'Descargar Adjunto', group: 'Acciones Documento', placeholder: '\u21E9', color: '#0b81b8', size: 18 },
            { key: 'attachmentReplace', label: 'Actualizar Adjunto', group: 'Acciones Documento', placeholder: '\u21BB', color: '#0b81b8', size: 18 },
            { key: 'quantityAdd', label: 'Agregar Cantidad', group: 'Calculo y Procesos', placeholder: '+', color: '#738196', size: 20 },
            { key: 'fieldInfo', label: 'Informacion de Campo', group: 'Calculo y Procesos', placeholder: 'i', color: '#4f6f8f', size: 12 },
            { key: 'processLauncher', label: 'Procesos Flotante', group: 'Calculo y Procesos', placeholder: '\u25CE', color: '#0b81b8', size: 24 },
            { key: 'favoriteDocumentOff', label: 'Favorito Inactivo', group: 'Calculo y Procesos', placeholder: '\u2606', color: '#a2aab5', size: 20 },
            { key: 'favoriteDocumentOn', label: 'Favorito Activo', group: 'Calculo y Procesos', placeholder: '\u2605', color: '#c79b18', size: 20 },
            { key: 'refreshCosts', label: 'Actualizar Costos', group: 'Calculo y Procesos', placeholder: '\u21BB', color: '#5b7896', size: 20 },
            { key: 'timelineLauncher', label: 'Timeline Flotante', group: 'Calculo y Procesos', placeholder: '\u25F4', color: '#5f7392', size: 20 },
            { key: 'floatingSave', label: 'Guardar Flotante', group: 'Acciones Flotantes', placeholder: 'ðŸ’¾', color: '#ffffff', size: 20 },
            { key: 'quoteRequestSubmit', label: 'Solicitud de CotizaciÃ³n', group: 'Acciones Flotantes', placeholder: '\u27A4', color: '#ffffff', size: 18 },
            { key: 'quoteRequestAdvanced', label: 'Proceso Avanzado', group: 'Acciones Flotantes', placeholder: '\u2699', color: '#5f7288', size: 18 },
            { key: 'adminUserCreate', label: 'Crear Usuario', group: 'Acciones Administrativas', placeholder: '+', color: '#118fc6', size: 22 },
            { key: 'adminUserDelete', label: 'Eliminar Usuario', group: 'Acciones Administrativas', placeholder: '\uD83D\uDDD1', color: '#b94848', size: 18 },
            { key: 'adminPermissionCreate', label: 'Crear Permiso', group: 'Acciones Administrativas', placeholder: '+', color: '#118fc6', size: 22 },
            { key: 'adminPermissionDelete', label: 'Eliminar Permiso', group: 'Acciones Administrativas', placeholder: '\uD83D\uDDD1', color: '#b94848', size: 18 },
            { key: 'loginRepositoryUpload', label: 'Cargar Imagen de Repositorio', group: 'Acciones Administrativas', placeholder: '\u21E7', color: '#118fc6', size: 18 },
            { key: 'loginRepositoryDelete', label: 'Eliminar Imagen de Repositorio', group: 'Acciones Administrativas', placeholder: '\uD83D\uDDD1', color: '#b94848', size: 18 },
            { key: 'proformaCurrencyAdd', label: 'Agregar Moneda de Proforma', group: 'Acciones Administrativas', placeholder: '+', color: '#118fc6', size: 18 },
            { key: 'proformaCurrencyDelete', label: 'Eliminar Moneda de Proforma', group: 'Acciones Administrativas', placeholder: '\uD83D\uDDD1', color: '#b94848', size: 18 },
            { key: 'proformaView', label: 'Ver Proforma', group: 'Acciones Documento', placeholder: '\uD83D\uDC41', color: '#1e516d', size: 18 },
            { key: 'proformaClose', label: 'Cerrar Proforma', group: 'Acciones Documento', placeholder: '\u2713', color: '#1e516d', size: 18 },
            { key: 'quoteRequestAttachment', label: 'Adjuntar Archivos Solicitud', group: 'Acciones Documento', placeholder: '\uD83D\uDCCE', color: '#1e516d', size: 18 },
            { key: 'quoteRequestRecord', label: 'Grabar Audio Solicitud', group: 'Acciones Documento', placeholder: '\uD83C\uDFA4', color: '#1e516d', size: 18 },
            { key: 'quoteRequestRecordStop', label: 'Detener Grabacion Solicitud', group: 'Acciones Documento', placeholder: '\u25A0', color: '#1e516d', size: 18 },
            { key: 'quoteRequestAttachmentDelete', label: 'Eliminar Adjunto Solicitud', group: 'Acciones Documento', placeholder: '\u2573', color: '#b94848', size: 18 }
        ];

        function firstFilled(...values) {
            for (const value of values) {
                if (value !== undefined && value !== null && value !== '') {
                    return value;
                }
            }
            return '';
        }

        function repairUtf8Text(value) {
            if (typeof value !== 'string' || !value) return value;
            let repaired = value;
            for (let index = 0; index < 2; index += 1) {
                try {
                    const nextValue = decodeURIComponent(escape(repaired));
                    if (!nextValue || nextValue === repaired) break;
                    repaired = nextValue;
                } catch (error) {
                    break;
                }
            }
            return repaired;
        }

        function fixCommonTextArtifacts(value) {
            if (typeof value !== 'string') return value;
            return repairUtf8Text(value)
                .replace(/Configuracion/g, 'ConfiguraciÃ³n')
                .replace(/Titulo General/g, 'TÃ­tulo General')
                .replace(/Pie de pagina/g, 'Pie de pÃ¡gina')
                .replace(/Tamano/g, 'TamaÃ±o')
                .replace(/Linea/g, 'LÃ­nea')
                .replace(/Busqueda/g, 'BÃºsqueda')
                .replace(/Menu/g, 'MenÃº');
        }

        function normalizeUiTextArtifacts(root = document) {
            const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
            const textNodes = [];
            while (walker.nextNode()) {
                textNodes.push(walker.currentNode);
            }
            textNodes.forEach((node) => {
                const fixed = fixCommonTextArtifacts(node.nodeValue);
                if (fixed !== node.nodeValue) node.nodeValue = fixed;
            });

            root.querySelectorAll('[title],[placeholder],[aria-label],[data-icons]').forEach((el) => {
                ['title', 'placeholder', 'aria-label', 'data-icons'].forEach((attr) => {
                    if (!el.hasAttribute(attr)) return;
                    const current = el.getAttribute(attr);
                    const fixed = fixCommonTextArtifacts(current);
                    if (fixed !== current) el.setAttribute(attr, fixed);
                });
            });

            root.querySelectorAll('input[type="text"], input[type="search"], input[type="button"], button, option, select').forEach((el) => {
                if ('value' in el && typeof el.value === 'string') {
                    const fixedValue = fixCommonTextArtifacts(el.value);
                    if (fixedValue !== el.value) el.value = fixedValue;
                }
                if (el.textContent) {
                    const fixedText = fixCommonTextArtifacts(el.textContent);
                    if (fixedText !== el.textContent) el.textContent = fixedText;
                }
            });

            const titleEl = document.querySelector('title');
            if (titleEl) titleEl.textContent = fixCommonTextArtifacts(titleEl.textContent);
        }

        function toIconSuffix(key) {
            return key.charAt(0).toUpperCase() + key.slice(1);
        }

        function ensureDieShapeConfigFields() {
            const mount = document.getElementById('dieShapeConfigGrid');
            if (!mount) return;
            const defaults = [
                { index: 1, label: 'Circular' },
                { index: 2, label: 'Cuadrado' },
                { index: 3, label: 'Rectangular' },
                { index: 4, label: 'Ovalado' },
                { index: 5, label: 'Especial' }
            ];

            defaults.forEach((item) => {
                let block = mount.querySelector(`[data-die-shape-item="${item.index}"]`);
                if (block) return;
                block = document.createElement('div');
                block.className = 'die-shape-config-item';
                block.dataset.dieShapeItem = String(item.index);
                block.innerHTML = `
                    <div id="dieShapePreview${item.index}" class="die-shape-preview">Subir imagen</div>
                    <label>
                        <span>Nombre</span>
                        <input name="general.dieShapeLabel${item.index}" type="text" value="${item.label}">
                    </label>
                    <input name="general.dieShapeImage${item.index}" type="hidden" value="">
                    <input data-die-shape-upload="general.dieShapeImage${item.index}" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" hidden>
                `;
                mount.appendChild(block);
            });
        }

        function applyDieShapePreviews() {
            const defaults = [
                { index: 1, label: 'Circular' },
                { index: 2, label: 'Cuadrado' },
                { index: 3, label: 'Rectangular' },
                { index: 4, label: 'Ovalado' },
                { index: 5, label: 'Especial' }
            ];

            defaults.forEach((item) => {
                const preview = document.getElementById(`dieShapePreview${item.index}`);
                const imageValue = loadedConfig.general?.[`dieShapeImage${item.index}`] || document.querySelector(`[name="general.dieShapeImage${item.index}"]`)?.value || '';
                const labelValue = loadedConfig.general?.[`dieShapeLabel${item.index}`] || document.querySelector(`[name="general.dieShapeLabel${item.index}"]`)?.value || item.label;
                if (!preview) return;
                if (imageValue) {
                    preview.innerHTML = `<img src="${imageValue}" alt="${labelValue}">`;
                } else {
                    preview.textContent = labelValue || 'Subir imagen';
                }
            });
        }

        function bindDieShapeUploadHandlers() {
            document.querySelectorAll('[data-die-shape-upload]').forEach((uploadInput) => {
                if (uploadInput.dataset.dieShapeUploadBound === 'true') return;
                const targetName = uploadInput.dataset.dieShapeUpload;
                const textInput = document.querySelector(`[name="${targetName}"]`);
                const preview = uploadInput.closest('.die-shape-config-item')?.querySelector('.die-shape-preview');

                uploadInput.addEventListener('change', (event) => {
                    const file = event.target.files?.[0];
                    if (!file || !textInput) return;
                    const reader = new FileReader();
                    reader.onload = (loadEvent) => {
                        const dataUrl = loadEvent.target?.result || '';
                        textInput.value = dataUrl;
                        if (preview) {
                            preview.innerHTML = `<img src="${dataUrl}" alt="Forma de troquel">`;
                        }
                        queueConfigSave();
                    };
                    reader.readAsDataURL(file);
                });

                preview?.addEventListener('click', () => uploadInput.click());
                uploadInput.dataset.dieShapeUploadBound = 'true';
            });
        }

        function getOrCreateIconGroup(row, groupName) {
            let group = row.querySelector(`[data-icon-group="${groupName}"]`);
            if (group) return group.querySelector('.icon-group-grid');
            group = document.createElement('section');
            group.className = 'icon-group';
            group.dataset.iconGroup = groupName;
            group.innerHTML = `
                <h3 class="icon-group-title">${groupName}</h3>
                <div class="icon-group-grid"></div>
            `;
            row.appendChild(group);
            return group.querySelector('.icon-group-grid');
        }

        function ensureIconLibraryShell(row) {
            const host = document.getElementById('generalIconsSection') || document.getElementById('iconsTabMount');
            if (!host) return row;
            let shell = host.querySelector('.icon-library-shell');
            let tabs = host.querySelector('.icon-library-tabs');
            let panels = host.querySelector('.icon-library-panels');
            if (!shell) {
                shell = document.createElement('div');
                shell.className = 'icon-library-shell';
                tabs = document.createElement('div');
                tabs.className = 'icon-library-tabs';
                panels = document.createElement('div');
                panels.className = 'icon-library-panels';
                shell.appendChild(tabs);
                shell.appendChild(panels);
                host.appendChild(shell);
            }
            if (row.parentElement !== panels) {
                panels.appendChild(row);
            }
            row.dataset.iconRow = 'true';
            return row;
        }

        function syncIconLibraryTabs(row) {
            const host = document.getElementById('generalIconsSection') || document.getElementById('iconsTabMount');
            const tabsHost = host?.querySelector('.icon-library-tabs');
            if (!row || !tabsHost) return;
            const groups = [...row.querySelectorAll('.icon-group')];
            if (!groups.length) return;

            const availableGroups = groups.map((group) => group.dataset.iconGroup).filter(Boolean);
            let activeGroup = row.dataset.activeIconGroup;
            if (!availableGroups.includes(activeGroup)) {
                activeGroup = availableGroups[0];
                row.dataset.activeIconGroup = activeGroup;
            }

            tabsHost.innerHTML = '';
            availableGroups.forEach((groupName) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `icon-library-tab${groupName === activeGroup ? ' active' : ''}`;
                button.textContent = groupName;
                button.addEventListener('click', () => {
                    row.dataset.activeIconGroup = groupName;
                    syncIconLibraryTabs(row);
                });
                tabsHost.appendChild(button);
            });

            groups.forEach((group) => {
                group.hidden = group.dataset.iconGroup !== activeGroup;
            });
        }

        function ensureIconLibraryFields() {
            const row = document.querySelector('#generalIconsSection .icon-row');
            if (!row) return;
            const iconsTabMount = document.getElementById('iconsTabMount');
            if (iconsTabMount && !iconsTabMount.contains(document.getElementById('generalIconsSection'))) {
                iconsTabMount.appendChild(document.getElementById('generalIconsSection'));
            }
            ensureIconLibraryShell(row);

            ICON_LIBRARY.forEach((icon) => {
                const groupGrid = getOrCreateIconGroup(row, icon.group || 'Otros');
                const suffix = toIconSuffix(icon.key);
                let item = row.querySelector(`input[name="icons.${icon.key}"]`)?.closest('.icon-item');

                if (!item) {
                    item = document.createElement('div');
                    item.className = 'icon-item';
                    item.innerHTML = `
                        <input name="icons.${icon.key}" type="text" placeholder="${icon.placeholder}" style="width:50px; text-align:center;">
                        <div class="icon-preview" id="preview-icons.${icon.key}">${icon.placeholder}</div>
                        <div class="icon-item-meta">
                            <span class="icon-item-name">${icon.label}</span>
                            <span class="icon-item-key">icons.${icon.key}</span>
                            <div class="icon-item-controls"></div>
                        </div>
                        <input data-icon-upload="icons.${icon.key}" type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" hidden>
                    `;
                    groupGrid.appendChild(item);
                } else if (item.parentElement !== groupGrid) {
                    groupGrid.appendChild(item);
                }

                const labelEl = item.querySelector('.icon-item-name');
                if (labelEl) labelEl.textContent = icon.label;
                const keyEl = item.querySelector('.icon-item-key');
                if (keyEl) keyEl.textContent = `icons.${icon.key}`;
                const textInput = item.querySelector(`input[name="icons.${icon.key}"]`);
                if (textInput) textInput.placeholder = icon.placeholder;
                const previewEl = item.querySelector('.icon-preview');
                if (previewEl && !previewEl.textContent.trim()) previewEl.textContent = icon.placeholder;
                const controls = item.querySelector('.icon-item-controls');
                if (!controls) return;

                controls.querySelectorAll('label').forEach((label) => {
                    const input = label.querySelector('input');
                    if (!input) return;
                    if (input.name === `general.iconColor${suffix}`) label.querySelector('span').textContent = 'Color 1';
                });

                const fieldDefs = [
                    { name: `general.iconColor${suffix}`, label: 'Color 1', type: 'color', value: icon.color, className: 'color-field' },
                    { name: `general.iconColor2${suffix}`, label: 'Color 2', type: 'color', value: '#ffffff', className: 'color-field' },
                    { name: `general.iconColorHover${suffix}`, label: 'Color al pasar', type: 'color', value: '#0b81b8', className: 'color-field' },
                    { name: `general.iconSize${suffix}`, label: 'Tamano', type: 'number', value: String(icon.size), style: 'width:65px;' }
                ];

                fieldDefs.forEach((field) => {
                    if (controls.querySelector(`[name="${field.name}"]`)) return;
                    const label = document.createElement('label');
                    label.innerHTML = `<span>${field.label}</span><input name="${field.name}" type="${field.type}" value="${field.value}" ${field.className ? `class="${field.className}"` : ''} ${field.style ? `style="${field.style}"` : ''}>`;
                    controls.appendChild(label);
                });
            });

            syncIconLibraryTabs(row);
        }

        function applyFloatingSaveButtonPreview() {
            const button = document.getElementById('floatingSaveButton');
            if (!button) return;
            const iconValue = loadedConfig.icons?.floatingSave || 'ðŸ’¾';
            const color = loadedConfig.general?.iconColorFloatingSave || '#ffffff';
            const hover = loadedConfig.general?.iconColorHoverFloatingSave || '#ffffff';
            const size = Number(loadedConfig.general?.iconSizeFloatingSave) || 20;
            applyIconButtonPreview(button, iconValue, size, 'ðŸ’¾');
            button.style.color = color;
            button.style.fontSize = `${size}px`;
            button.dataset.iconHoverColor = hover;
        }

        function syncConfigTabHeights() {
            const source = document.getElementById('tab-datos-generales');
            const tabs = [...document.querySelectorAll('.config-tab-content')];
            if (!source || !tabs.length) return;
            const previous = source.style.minHeight;
            source.style.minHeight = '0px';
            const height = source.offsetHeight;
            source.style.minHeight = previous;
            if (!height) return;
            document.documentElement.style.setProperty('--config-tabs-min-height', `${height}px`);
        }

        let activeColorField = null;
        let colorPopover = null;
        let colorPopoverNative = null;
        let colorPopoverHex = null;
        let colorPopoverSwatch = null;

        function normalizeHexColor(value) {
            const rawValue = String(value || '').trim();
            if (!rawValue) return '';
            const normalized = rawValue.startsWith('#') ? rawValue : `#${rawValue}`;
            return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : '';
        }

        function setHexFieldState(hexInput, isValid) {
            if (!hexInput) return;
            hexInput.classList.toggle('is-invalid', !isValid && hexInput.value.trim() !== '');
        }

        function syncColorTrigger(colorInput) {
            if (!colorInput) return;
            const trigger = colorInput.parentElement?.querySelector('.color-field-trigger');
            if (trigger) {
                const colorValue = String(colorInput.value || '#FFFFFF').toUpperCase();
                trigger.style.setProperty('--color-value', colorValue);
                trigger.setAttribute('aria-label', `Seleccionar color ${colorValue}`);
                trigger.title = colorValue;
            }
        }

        function syncTabColorSwatches() {
            document.querySelectorAll('[data-color-preview]').forEach((swatch) => {
                const fieldName = swatch.dataset.colorPreview;
                const input = document.querySelector(`input[name="${fieldName}"]`);
                const colorValue = String(input?.value || '#D8DDE3').toUpperCase();
                swatch.style.setProperty('--swatch-color', colorValue);
            });
        }

        function closeColorPopover() {
            if (colorPopover) colorPopover.hidden = true;
            activeColorField = null;
        }

        function positionColorPopover(trigger) {
            if (!colorPopover || !trigger) return;
            const rect = trigger.getBoundingClientRect();
            const popoverWidth = 220;
            const popoverHeight = 170;
            const left = Math.min(window.innerWidth - popoverWidth - 12, Math.max(12, rect.left));
            let top = rect.bottom + 10;
            if (top + popoverHeight > window.innerHeight - 12) {
                top = Math.max(12, rect.top - popoverHeight - 10);
            }
            colorPopover.style.left = `${left}px`;
            colorPopover.style.top = `${top}px`;
        }

        function applyColorValue(colorInput, value, commit = false) {
            if (!colorInput) return;
            const normalized = normalizeHexColor(value);
            if (!normalized) return false;
            colorInput.value = normalized;
            syncColorTrigger(colorInput);
            if (activeColorField === colorInput && colorPopoverNative && colorPopoverHex && colorPopoverSwatch) {
                colorPopoverNative.value = normalized;
                colorPopoverHex.value = normalized;
                colorPopoverSwatch.style.background = normalized;
                setHexFieldState(colorPopoverHex, true);
            }
            if (commit) {
                colorInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            return true;
        }

        function ensureColorPopover() {
            if (colorPopover) return;

            colorPopover = document.createElement('div');
            colorPopover.className = 'color-popover';
            colorPopover.hidden = true;
            colorPopover.innerHTML = `
                <div class="color-popover-swatch"></div>
                <input type="color" class="color-popover-native" value="#FFFFFF">
                <input type="text" class="color-popover-hex" placeholder="#RRGGBB" autocomplete="off" spellcheck="false">
                <div class="color-popover-hint">Puedes pegar o escribir el hexadecimal aquÃ­.</div>
            `;
            document.body.appendChild(colorPopover);

            colorPopoverSwatch = colorPopover.querySelector('.color-popover-swatch');
            colorPopoverNative = colorPopover.querySelector('.color-popover-native');
            colorPopoverHex = colorPopover.querySelector('.color-popover-hex');

            colorPopoverNative.addEventListener('input', () => {
                if (!activeColorField) return;
                applyColorValue(activeColorField, colorPopoverNative.value, false);
            });

            colorPopoverNative.addEventListener('change', () => {
                if (!activeColorField) return;
                applyColorValue(activeColorField, colorPopoverNative.value, true);
            });

            colorPopoverHex.addEventListener('input', () => {
                const normalized = normalizeHexColor(colorPopoverHex.value);
                setHexFieldState(colorPopoverHex, Boolean(normalized));
                if (!activeColorField || !normalized) return;
                applyColorValue(activeColorField, normalized, false);
            });

            colorPopoverHex.addEventListener('blur', () => {
                const normalized = normalizeHexColor(colorPopoverHex.value);
                if (!normalized) {
                    setHexFieldState(colorPopoverHex, false);
                    return;
                }
                colorPopoverHex.value = normalized;
                setHexFieldState(colorPopoverHex, true);
                if (activeColorField) applyColorValue(activeColorField, normalized, true);
            });

            document.addEventListener('pointerdown', (event) => {
                if (colorPopover?.hidden) return;
                if (colorPopover.contains(event.target)) return;
                if (event.target.closest('.color-field-trigger')) return;
                closeColorPopover();
            });

            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && !colorPopover?.hidden) {
                    closeColorPopover();
                }
            });

            window.addEventListener('resize', () => {
                if (!activeColorField) return;
                const trigger = activeColorField.parentElement?.querySelector('.color-field-trigger');
                positionColorPopover(trigger);
            });

            window.addEventListener('scroll', () => {
                if (!activeColorField) return;
                const trigger = activeColorField.parentElement?.querySelector('.color-field-trigger');
                positionColorPopover(trigger);
            }, true);
        }

        function openColorPopover(colorInput) {
            ensureColorPopover();
            activeColorField = colorInput;
            const normalized = normalizeHexColor(colorInput.value) || '#FFFFFF';
            colorPopoverNative.value = normalized;
            colorPopoverHex.value = normalized;
            colorPopoverSwatch.style.background = normalized;
            setHexFieldState(colorPopoverHex, true);
            const trigger = colorInput.parentElement?.querySelector('.color-field-trigger');
            positionColorPopover(trigger);
            colorPopover.hidden = false;
            requestAnimationFrame(() => colorPopoverHex.focus());
        }

        function enhanceColorInputs() {
            document.querySelectorAll('input.color-field[type="color"]').forEach((colorInput) => {
                if (colorInput.dataset.colorEnhanced === 'true') {
                    syncColorTrigger(colorInput);
                    return;
                }

                const trigger = document.createElement('button');
                trigger.type = 'button';
                trigger.className = 'color-field-trigger';
                trigger.addEventListener('click', () => openColorPopover(colorInput));

                colorInput.insertAdjacentElement('afterend', trigger);
                syncColorTrigger(colorInput);

                colorInput.addEventListener('input', () => syncColorTrigger(colorInput));
                colorInput.addEventListener('change', () => syncColorTrigger(colorInput));

                colorInput.dataset.colorEnhanced = 'true';
            });
        }

        function setHeaderIcon(button, value, altText) {
            if (!button) return;
            if (!value) {
                button.textContent = '';
                button.innerHTML = '';
                return;
            }
            if (String(value).startsWith('data:image')) {
                button.innerHTML = `<img src="${value}" alt="${altText}" style="width:100%;height:100%;object-fit:contain;">`;
                return;
            }
            button.textContent = value;
        }

        function toggleConfigMenu(forceState) {
            if (!configMenuPanel) return;
            const open = typeof forceState === 'boolean' ? forceState : configMenuPanel.hidden;
            configMenuPanel.hidden = !open;
            if (configMenuToggle) configMenuToggle.setAttribute('aria-expanded', String(open));
        }

        function applyHeaderConfig(config) {
            const general = config.general || {};
            const layout = config.layout || {};
            const branding = config.branding || {};
            const root = document.documentElement;
            const logoUrl = firstFilled(branding.logoUrl, branding.companyLogoUrl);
            const companyName = firstFilled(branding.companyName, general.companyName, 'PrintLab');

            root.style.setProperty('--header-bg-start', firstFilled(general.headerBgStart, layout.headerBgStart, '#0b81b8'));
            root.style.setProperty('--header-bg-end', firstFilled(general.headerBgEnd, layout.headerBgEnd, '#17abdf'));
            root.style.setProperty('--header-border-color', firstFilled(general.headerBorderColor, general.footerBorderColor, '#11a3dd'));
            root.style.setProperty('--module-title-color', firstFilled(general.titleColor, '#ffffff'));
            root.style.setProperty('--module-title-font-family', firstFilled(general.titleFontFamily, 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'));
            root.style.setProperty('--module-title-font-size', `${Number(general.titleFontSize) || 16}px`);
            root.style.setProperty('--brand-color', firstFilled(general.brandColor, '#ffffff'));
            root.style.setProperty('--brand-font-family', firstFilled(general.brandFontFamily, 'Georgia, Times New Roman, serif'));
            root.style.setProperty('--brand-font-size', `${Number(general.brandFontSize) || 22}px`);
            root.style.setProperty('--brand-width', `${Number(general.brandWidth) || 116}px`);
            root.style.setProperty('--config-icon-size', `${Number(general.iconSize) || Number(layout.iconSize) || 20}px`);

            if (configCompanyLogo) {
                configCompanyLogo.style.display = logoUrl ? 'block' : 'none';
                configCompanyLogo.src = logoUrl || '';
                configCompanyLogo.alt = companyName;
            }
            if (configBrandFallback) {
                configBrandFallback.textContent = companyName;
            }
            if (configPageTitle) {
                configPageTitle.textContent = 'Configuracion general';
            }

            setHeaderIcon(configSearchButton, config.icons?.topSearch || '\u2315', 'Buscar');
            setHeaderIcon(configMenuToggle, config.icons?.topMenu || '\u2261', 'Menu');
            if (configSearchButton) {
                const size = Number(general.iconSizeTopSearch) || Number(general.iconSize) || Number(layout.iconSize) || 20;
                configSearchButton.style.width = `${size}px`;
                configSearchButton.style.height = `${size}px`;
                configSearchButton.style.color = firstFilled(general.iconColorTopSearch, general.iconColor, '#ffffff');
            }
            if (configMenuToggle) {
                const size = Number(general.iconSizeTopMenu) || Number(general.iconSize) || Number(layout.iconSize) || 20;
                configMenuToggle.style.width = `${size}px`;
                configMenuToggle.style.height = `${size}px`;
                configMenuToggle.style.color = firstFilled(general.iconColorTopMenu, general.iconColor, '#ffffff');
            }
        }

        function createEmptyPresentationState() {
            return PRESENTATION_KEYS.reduce((acc, key) => {
                acc[key] = {};
                return acc;
            }, {});
        }

        presentationsData = createEmptyPresentationState();
        const PRESENTATION_COLOR_FIELDS = ['titleColor', 'headerBgStart', 'headerBgEnd', 'footerBorderColor', 'footerColor'];

        function markColorFieldEmpty(input, isEmpty) {
            if (!input) return;
            input.dataset.empty = isEmpty ? 'true' : 'false';
            input.classList.toggle('is-empty', isEmpty);
        }
        
        const PRESENTATION_FIELDS = [
            'moduleTitle', 'brandFontFamily', 'brandWidth', 'brandFontSize', 'brandVerticalAlign',
            'titleFontFamily', 'titleFontSize', 'titleWidth', 'titleColor', 'titleVerticalAlign', 'titleHorizontalAlign', 'titleMarginLeft',
            'logoPosition', 'brandLogoUrl',
            'headerBgStart', 'headerBgEnd', 'footerBorderColor', 'footerFontFamily', 'footerFontSize',
            'footerColor', 'footerMarginTop', 'footerMarginBottom', 'fieldHeight', 'fieldFontSize',
            'labelAlign', 'mediumInputWidth', 'largeInputWidth', 'tableHeaderFontFamily',
            'tableHeaderFontSize', 'tableRowHeight', 'iconSize',
            'pageMarginTop', 'pageMarginBottom', 'pageMarginRight', 'pageMarginLeft'
        ];

        const GLOBAL_TAB_LAYOUT_FIELDS = ['tabHeight', 'tabWidth'];

        const PRESENTATION_DEFAULTS = {
            cotizaciones: { moduleTitle: 'Cotizaciones', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            solicitudes: { moduleTitle: 'Solicitudes', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            calculos: { moduleTitle: 'CÃ¡lculos', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            socios: { moduleTitle: 'Socios', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            'inventario-mp': { moduleTitle: 'Inventario Materia Prima', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            'inventario-troqueles': { moduleTitle: 'Inventario Troqueles', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            'inventario-maquinaria': { moduleTitle: 'Inventario Maquinaria', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            costos: { moduleTitle: 'Costos', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            vendedores: { moduleTitle: 'Vendedores', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            ordenes: { moduleTitle: 'Ordenes', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
            seguimiento: { moduleTitle: 'Seguimiento', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 }
        };

        function getCurrentPresentationKey() {
            return document.getElementById('presentationKey')?.value || 'cotizaciones';
        }

        function getPresentationData(key) {
            return {
                moduleTitle: presentationsData[key]?.moduleTitle ?? (PRESENTATION_DEFAULTS[key]?.moduleTitle || ''),
                ...(presentationsData[key] || {})
            };
        }

        function populateGeneralFields() {
            console.log('=== POPULATE FIELDS ===');
            Object.keys(loadedConfig).forEach(key => {
                if (typeof loadedConfig[key] === 'object' && loadedConfig[key] !== null) {
                    Object.keys(loadedConfig[key]).forEach(subKey => {
                        const input = document.querySelector(`[name="${key}.${subKey}"]`);
                        if (input) {
                            input.value = loadedConfig[key][subKey];
                            console.log(`Set ${key}.${subKey} = ${loadedConfig[key][subKey]}`);
                        } else {
                            console.log(`NOT FOUND: ${key}.${subKey}`);
                        }
                    });
                }
            });
            syncToggleButtons();
            syncTabColorSwatches();
            syncPresentationTabLayoutFields();
        }

        function syncPresentationTabLayoutFields() {
            GLOBAL_TAB_LAYOUT_FIELDS.forEach((field) => {
                const generalInput = document.querySelector(`[name="layout.${field}"]`);
                const presentationInput = document.getElementById('presentation' + field.charAt(0).toUpperCase() + field.slice(1));
                if (!presentationInput) return;
                const fallbackValue = field === 'tabWidth' ? '88' : '18';
                presentationInput.value = generalInput?.value || fallbackValue;
                presentationInput.readOnly = true;
                presentationInput.title = 'Este valor se controla desde Datos Generales.';
                presentationInput.dataset.inherited = 'true';
            });
        }

        function getFlexAlign(value, fallback = 'center') {
            const normalized = String(value || '').trim().toLowerCase();
            if (normalized === 'center') return 'center';
            if (normalized === 'right' || normalized === 'end' || normalized === 'flex-end') return 'flex-end';
            if (normalized === 'left' || normalized === 'start' || normalized === 'flex-start') return 'flex-start';
            return fallback;
        }

        function isSvgValue(value) {
            const normalized = String(value || '').trim().toLowerCase();
            return normalized.startsWith('data:image/svg+xml') || normalized.endsWith('.svg');
        }

        function getContrastingPreviewBackground(color) {
            const value = String(color || '').trim();
            const match = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
            if (!match) {
                return 'linear-gradient(135deg, #ffffff 0%, #eef2f6 50%, #4b5563 50%, #2f3740 100%)';
            }
            let hex = match[1];
            if (hex.length === 3) {
                hex = hex.split('').map((char) => char + char).join('');
            }
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            if (luminance > 0.72) {
                return 'linear-gradient(135deg, #46515d 0%, #2f3740 100%)';
            }
            if (luminance < 0.28) {
                return 'linear-gradient(135deg, #ffffff 0%, #eef2f6 100%)';
            }
            return 'linear-gradient(135deg, #ffffff 0%, #eef2f6 50%, #4b5563 50%, #2f3740 100%)';
        }

        function renderIconPreview(previewEl, iconValue, color, size) {
            if (!previewEl) return;
            previewEl.style.backgroundImage = 'none';
            previewEl.textContent = '';
            previewEl.innerHTML = '';
            previewEl.style.color = color || '#9ba2ab';
            previewEl.style.background = getContrastingPreviewBackground(color);
            const resolvedSize = Number(size) || 20;
            const tileSize = Math.max(56, resolvedSize + 20);
            previewEl.style.width = `${tileSize}px`;
            previewEl.style.height = `${tileSize}px`;
            previewEl.style.flexBasis = `${tileSize}px`;
            if (!iconValue) return;
            if (isSvgValue(iconValue)) {
                previewEl.innerHTML = `<span class="icon-svg-mask" style="-webkit-mask-image:url('${iconValue}');mask-image:url('${iconValue}');"></span>`;
                return;
            }
            if (String(iconValue).startsWith('data:image')) {
                previewEl.style.backgroundImage = `url(${iconValue})`;
                previewEl.style.backgroundSize = 'contain';
                previewEl.style.backgroundRepeat = 'no-repeat';
                previewEl.style.backgroundPosition = 'center';
                return;
            }
            previewEl.textContent = iconValue;
        }

        function renderButtonIcon(button, iconValue, color, size, fallbackText) {
            if (!button) return;
            button.innerHTML = '';
            button.style.color = color || '#0b81b8';
            const resolvedSize = Number(size) || 16;
            if (!iconValue) {
                button.textContent = fallbackText || '';
                return;
            }
            if (isSvgValue(iconValue)) {
                button.innerHTML = `<span class="icon-svg-mask" style="-webkit-mask-image:url('${iconValue}');mask-image:url('${iconValue}');width:${resolvedSize}px;height:${resolvedSize}px;"></span>`;
                return;
            }
            if (String(iconValue).startsWith('data:image')) {
                button.innerHTML = `<img src="${iconValue}" alt="" class="icon-image" style="width:${resolvedSize}px;height:${resolvedSize}px;">`;
                return;
            }
            button.innerHTML = `<span class="icon-glyph">${iconValue}</span>`;
        }

        function setConfigStatus(message, isError = false) {
            const statusNode = document.getElementById('saveStatus');
            if (!statusNode) return;
            statusNode.hidden = false;
            statusNode.textContent = message || '';
            statusNode.style.color = isError ? '#b94848' : '';
        }

        function setSapConfigStatus(message, isError = false) {
            if (!sapConfigStatus) return;
            sapConfigStatus.textContent = message || 'Listo para configurar.';
            sapConfigStatus.style.color = isError ? '#b94848' : '';
        }

        function setSapResult(node, payload) {
            if (!node) return;
            node.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
        }

        function getSapPayloadTemplate(entity) {
            if (entity === 'invoices') {
                return { docEntry: 1041, baseLine: 0 };
            }
            if (entity === 'inventory-exit') {
                return {
                    date: new Date().toISOString().slice(0, 10),
                    productionOrderId: 'OP-2041',
                    comments: 'Consumo de materiales',
                    materials: [
                        { itemCode: 'INS-030', quantity: 120, warehouse: '01' },
                        { itemCode: 'INS-020', quantity: 2.5, warehouse: '01' }
                    ]
                };
            }
            return {
                clientCode: 'C001',
                date: new Date().toISOString().slice(0, 10),
                dueDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
                notes: 'Generado desde ConfiguraciÃ³n',
                lines: [
                    { itemCode: 'TRQ-001', qty: 2, price: 89500, warehouse: '01' },
                    { itemCode: 'SRV-001', qty: 4, price: 12000, warehouse: '01' }
                ]
            };
        }

        function syncSapAdvancedToggle() {
            if (!sapAdvancedToggle || !sapAdvancedCheckbox) return;
            const active = !!sapAdvancedCheckbox.checked;
            sapAdvancedToggle.classList.toggle('is-active', active);
        }

        function applySapConfigToForm(config = {}) {
            const baseName = !config.sapCompany || config.sapCompany === 'SBO_DEMO' ? 'SBO_pruebas' : config.sapCompany;
            if (sapAdvancedCheckbox) sapAdvancedCheckbox.checked = String(config.mode || 'demo').trim().toLowerCase() !== 'live';
            if (sapCompanyInput) sapCompanyInput.value = baseName;
            if (sapHostInput) sapHostInput.value = config.sapHost || '';
            if (sapPortInput) sapPortInput.value = config.sapPort || 50000;
            if (sapProtocolSelect) sapProtocolSelect.value = config.sapProtocol || 'https';
            if (sapUserInput) sapUserInput.value = config.sapUser || 'manager';
            if (sapPasswordInput) {
                sapPasswordInput.value = '';
                sapPasswordInput.placeholder = config.hasPassword ? 'Se conserva la clave actual si lo dejas vacÃ­o' : 'Ingresa la clave SAP';
            }
            if (sapSyncIntervalInput) sapSyncIntervalInput.value = config.syncIntervalMinutes || 30;
            if (sapAllowSelfSignedSelect) sapAllowSelfSignedSelect.value = String(config.allowSelfSigned !== false);
            if (sapAutoSyncSelect) sapAutoSyncSelect.value = String(config.autoSyncEnabled === true);
            syncSapAdvancedToggle();
        }

        function renderSapStatus(payload = {}) {
            const config = payload.config || {};
            if (sapStatusRow) {
                const pills = [];
                if (String(config.mode || '').toLowerCase() === 'live') {
                    pills.push('<span class="sap-security-pill">ConexiÃ³n real</span>');
                } else {
                    pills.push('<span class="sap-security-pill">Avanzado activo</span>');
                }
                pills.push(`<span class="sap-security-pill">${config.hasPassword ? 'Clave guardada' : 'Sin clave'}</span>`);
                if (config.lastSyncStatus) {
                    const tone = config.lastSyncStatus === 'error' ? 'error' : (config.lastSyncStatus === 'success' ? 'ok' : '');
                    const label = config.lastSyncStatus === 'success' ? 'Sync listo' : (config.lastSyncStatus === 'error' ? 'Sync con error' : 'Sync pendiente');
                    pills.push(`<span class="sap-security-pill" data-tone="${tone}">${label}</span>`);
                }
                sapStatusRow.innerHTML = pills.join('');
            }
            if (sapStatusNote) {
                const lastSync = config.lastSyncFinishedAt ? new Date(config.lastSyncFinishedAt).toLocaleString('es-CR') : 'Sin sincronizaciÃ³n';
                sapStatusNote.textContent = config.lastSyncMessage ? `${config.lastSyncMessage} | ${lastSync}` : lastSync;
            }
            if (sapLocalCounts) {
                const counts = payload.localSummary?.counts || {};
                sapLocalCounts.innerHTML = [
                    ['Socios', counts.businessPartners || 0],
                    ['ArtÃ­culos', counts.items || 0],
                    ['Bodegas', counts.warehouses || 0],
                    ['Ã“rdenes', counts.orders || 0],
                    ['Facturas', counts.invoices || 0]
                ].map(([label, value]) => `
                    <div class="sap-security-count">
                        <strong>${escapeHtml(String(value))}</strong>
                        <span>${escapeHtml(label)}</span>
                    </div>
                `).join('');
            }
            applySapConfigToForm(config);
        }

        function renderSapLogs(payload = {}) {
            if (!sapLogList) return;
            const syncLog = Array.isArray(payload.syncLog) ? payload.syncLog : [];
            const writeLog = Array.isArray(payload.writeLog) ? payload.writeLog : [];
            const rows = [
                ...syncLog.map((entry) => ({
                    title: `${entry.entity_name} | ${entry.status}`,
                    meta: `${entry.mode} | ${entry.records_count || 0} registros`,
                    detail: entry.started_at ? new Date(entry.started_at).toLocaleString('es-CR') : ''
                })),
                ...writeLog.map((entry) => ({
                    title: `${entry.entity_name} | ${entry.status}`,
                    meta: entry.mode,
                    detail: entry.error_message || (entry.created_at ? new Date(entry.created_at).toLocaleString('es-CR') : '')
                }))
            ].slice(0, 20);
            if (!rows.length) {
                sapLogList.innerHTML = '<div class="sap-security-empty">Sin actividad reciente.</div>';
                return;
            }
            sapLogList.innerHTML = rows.map((entry) => `
                <div class="sap-security-log-item">
                    <strong>${escapeHtml(entry.title)}</strong>
                    <span>${escapeHtml(entry.meta)}</span>
                    <span>${escapeHtml(entry.detail)}</span>
                </div>
            `).join('');
        }

        async function loadSapConnectorState(force = false) {
            if (!force && sapConnectorLoadedOnce) return;
            const [configResponse, logsResponse] = await Promise.all([
                fetch('/api/sap/config'),
                fetch('/api/sap/logs')
            ]);
            if (!configResponse.ok) throw new Error('No fue posible cargar la configuraciÃ³n SAP.');
            if (!logsResponse.ok) throw new Error('No fue posible cargar la actividad SAP.');
            const configPayload = await configResponse.json();
            const logsPayload = await logsResponse.json();
            renderSapStatus(configPayload);
            renderSapLogs(logsPayload);
            sapConnectorLoadedOnce = true;
        }

        function collectSapConfigPayload() {
            return {
                mode: sapAdvancedCheckbox?.checked ? 'demo' : 'live',
                sapCompany: (sapCompanyInput?.value || '').trim() || 'SBO_pruebas',
                sapHost: (sapHostInput?.value || '').trim(),
                sapPort: Number(sapPortInput?.value || 50000),
                sapProtocol: sapProtocolSelect?.value || 'https',
                sapUser: (sapUserInput?.value || '').trim() || 'manager',
                sapPassword: sapPasswordInput?.value || '',
                autoSyncEnabled: sapAutoSyncSelect?.value === 'true',
                allowSelfSigned: sapAllowSelfSignedSelect?.value !== 'false',
                keepDemoEnabled: true,
                syncIntervalMinutes: Number(sapSyncIntervalInput?.value || 30)
            };
        }

        async function saveSapConnectorConfig() {
            setSapConfigStatus('Guardando...', false);
            const response = await fetch('/api/sap/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(collectSapConfigPayload())
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'No fue posible guardar la configuraciÃ³n SAP.');
            setSapConfigStatus('Guardado correctamente.', false);
            await loadSapConnectorState(true);
        }

        async function testSapConnector() {
            await saveSapConnectorConfig();
            setSapConfigStatus('Probando conexiÃ³n...', false);
            const response = await fetch('/api/sap/test', { method: 'POST' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'No fue posible validar la conexiÃ³n SAP.');
            setSapConfigStatus(payload.message || 'ConexiÃ³n validada.', false);
            await loadSapConnectorState(true);
        }

        async function syncSapConnector() {
            await saveSapConnectorConfig();
            setSapConfigStatus('Sincronizando...', false);
            const response = await fetch('/api/sap/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entityName: 'all' })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'No fue posible sincronizar SAP.');
            setSapResult(sapQueryResult, payload);
            setSapConfigStatus(payload.ok ? 'SincronizaciÃ³n completada.' : 'SincronizaciÃ³n parcial.', !payload.ok);
            await loadSapConnectorState(true);
        }

        async function resetSapConnectorDemo() {
            setSapConfigStatus('Reiniciando...', false);
            const response = await fetch('/api/sap/reset-demo', { method: 'POST' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'No fue posible reiniciar el entorno SAP.');
            setSapConfigStatus('Entorno reiniciado.', false);
        }

        function buildSapQueryUrl() {
            const entity = sapQueryEntity?.value || 'business-partners';
            const params = new URLSearchParams();
            const source = (sapQuerySource?.value || '').trim();
            const filter = (sapQueryFilterInput?.value || '').trim();
            const search = (sapQuerySearchInput?.value || '').trim();
            const top = (sapQueryTopInput?.value || '').trim();
            if (source) params.set('source', source);
            if (search) params.set('search', search);
            if (top) params.set('top', top);
            if (filter) {
                if (entity === 'business-partners') params.set('type', filter);
                if (entity === 'items') params.set('group', filter);
                if (entity === 'orders') params.set('status', filter);
            }
            return `/api/sap/${entity}${params.toString() ? `?${params.toString()}` : ''}`;
        }

        async function runSapConnectorQuery() {
            await saveSapConnectorConfig();
            setSapConfigStatus('Consultando...', false);
            const response = await fetch(buildSapQueryUrl());
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'No fue posible consultar SAP.');
            setSapResult(sapQueryResult, payload);
            setSapConfigStatus('Consulta completada.', false);
        }

        function loadSapPayloadTemplate() {
            if (!sapPayloadInput) return;
            sapPayloadInput.value = JSON.stringify(getSapPayloadTemplate(sapWriteEntity?.value || 'orders'), null, 2);
        }

        async function sendSapPayload() {
            let parsed;
            try {
                parsed = JSON.parse(sapPayloadInput?.value || '{}');
            } catch (error) {
                throw new Error('El JSON no es vÃ¡lido.');
            }
            await saveSapConnectorConfig();
            const entity = sapWriteEntity?.value || 'orders';
            const route = entity === 'inventory-exit' ? '/api/sap/inventory/exit' : `/api/sap/${entity}`;
            setSapConfigStatus('Enviando...', false);
            const response = await fetch(route, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed)
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload.error || 'No fue posible enviar a SAP.');
            setSapResult(sapWriteResult, payload);
            setSapConfigStatus('EnvÃ­o completado.', false);
            await loadSapConnectorState(true);
        }

        function activateSecurityTab(tabKey = 'usuarios') {
            securitySubtabs.forEach((tab) => {
                tab.classList.toggle('active', tab.dataset.securityTab === tabKey);
            });
            securitySubpanels.forEach((panel) => {
                panel.hidden = panel.id !== `security-panel-${tabKey}`;
            });
            if (tabKey === 'usuarios' && !adminUsersLoadedOnce) {
                loadAdminUsers();
            }
            if (tabKey === 'permisos' && !adminPermissionsLoadedOnce) {
                loadAdminPermissions();
            }
            if (tabKey === 'sap') {
                loadSapConnectorState().catch((error) => {
                    setSapConfigStatus(error.message || 'No fue posible cargar SAP.', true);
                });
            }
        }

        function getAdminUserIconConfig(key, fallbackColor, fallbackSize, fallbackText) {
            const suffix = key.charAt(0).toUpperCase() + key.slice(1);
            return {
                value: document.querySelector(`input[name="icons.${key}"]`)?.value || loadedConfig.icons?.[key] || fallbackText,
                color: document.querySelector(`input[name="general.iconColor${suffix}"]`)?.value || loadedConfig.general?.[`iconColor${suffix}`] || fallbackColor,
                size: Number(document.querySelector(`input[name="general.iconSize${suffix}"]`)?.value) || Number(loadedConfig.general?.[`iconSize${suffix}`]) || fallbackSize
            };
        }

        function getAdminUserInitials(name) {
            const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
            if (!parts.length) return 'U';
            return parts.slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function renderAdminUserAvatar(container, user, className = '') {
            if (!container) return;
            const image = String(user?.photoUrl || '').trim();
            if (image) {
                container.innerHTML = `<img src="${image}" alt="${user?.name || 'Usuario'}">`;
                return;
            }
            container.className = className || container.className;
            container.textContent = getAdminUserInitials(user?.name);
        }

        function getSelectedAdminUser() {
            return adminUsers.find((user) => Number(user.id) === Number(selectedAdminUserId)) || null;
        }

        function populateUserPermissionOptions() {
            if (!userAdminFieldPermission) return;
            const current = String(userAdminFieldPermission.value || '');
            const options = ['<option value="">Sin permiso asignado</option>']
                .concat(adminPermissions.map((permission) => `<option value="${permission.id}">${escapeHtml(permission.name || 'Permiso')}</option>`));
            userAdminFieldPermission.innerHTML = options.join('');
            if ([...userAdminFieldPermission.options].some((option) => option.value === current)) {
                userAdminFieldPermission.value = current;
            }
        }

        function renderAdminUserList() {
            if (!userAdminTableBody) return;
            const deleteIcon = getAdminUserIconConfig('adminUserDelete', '#b94848', 18, 'ðŸ—‘');
            if (!adminUsers.length) {
                userAdminTableBody.innerHTML = '<tr><td class="user-admin-empty">TodavÃ­a no hay usuarios creados.</td></tr>';
                return;
            }
            userAdminTableBody.innerHTML = adminUsers.map((user) => `
                <tr class="${Number(user.id) === Number(selectedAdminUserId) ? 'is-selected' : ''}" data-user-id="${user.id}">
                    <td>
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                            <div class="user-admin-row-main">
                                <div class="user-admin-avatar" data-user-avatar="${user.id}">${getAdminUserInitials(user.name)}</div>
                                <div class="user-admin-row-text">
                                    <span class="user-admin-row-name">${escapeHtml(user.name || 'Sin nombre')}</span>
                                    <span class="user-admin-row-department">${escapeHtml(user.department || 'Sin departamento')}</span>
                                </div>
                            </div>
                            <button type="button" class="user-admin-delete-button" data-user-delete="${user.id}" aria-label="Eliminar usuario" title="Eliminar usuario"></button>
                        </div>
                    </td>
                </tr>
            `).join('');
            adminUsers.forEach((user) => {
                const avatar = userAdminTableBody.querySelector(`[data-user-avatar="${user.id}"]`);
                if (avatar) {
                    renderAdminUserAvatar(avatar, user, 'user-admin-avatar');
                }
                const deleteButton = userAdminTableBody.querySelector(`[data-user-delete="${user.id}"]`);
                if (deleteButton) {
                    renderButtonIcon(deleteButton, deleteIcon.value, deleteIcon.color, deleteIcon.size, 'ðŸ—‘');
                }
            });
        }

        function renderAdminUserCreateButton() {
            if (!userAdminCreateButton) return;
            const createIcon = getAdminUserIconConfig('adminUserCreate', '#118fc6', 22, '+');
            renderButtonIcon(userAdminCreateButton, createIcon.value, createIcon.color, createIcon.size, '+');
        }

        function updateAdminUserDetail() {
            const user = getSelectedAdminUser();
            if (!user) {
                if (userAdminDetailEmpty) userAdminDetailEmpty.hidden = false;
                if (userAdminDetailShell) userAdminDetailShell.hidden = true;
                return;
            }
            if (userAdminDetailEmpty) userAdminDetailEmpty.hidden = true;
            if (userAdminDetailShell) userAdminDetailShell.hidden = false;

            if (userAdminFieldName) userAdminFieldName.value = user.name || '';
            if (userAdminFieldUsername) userAdminFieldUsername.value = user.username || '';
            if (userAdminFieldPassword) userAdminFieldPassword.value = user.password || '';
            if (userAdminFieldPassword) userAdminFieldPassword.type = userAdminPasswordVisible ? 'text' : 'password';
            if (userAdminFieldDepartment) userAdminFieldDepartment.value = user.department || '';
            if (userAdminFieldProcess) userAdminFieldProcess.value = user.process || '';
            populateUserPermissionOptions();
            if (userAdminFieldPermission) userAdminFieldPermission.value = user.permissionId == null ? '' : String(user.permissionId);

            if (userAdminDetailName) userAdminDetailName.textContent = user.name || 'Usuario';
            if (userAdminDetailSubline) userAdminDetailSubline.textContent = `${user.department || 'Sin departamento'} Â· ${user.process || 'Sin proceso'}`;
            if (userAdminSummaryUsername) userAdminSummaryUsername.textContent = user.username || 'Pendiente';
            if (userAdminSummaryDepartment) userAdminSummaryDepartment.textContent = user.department || 'Pendiente';
            if (userAdminSummaryProcess) userAdminSummaryProcess.textContent = user.process || 'Pendiente';
            if (userAdminSummaryPermission) userAdminSummaryPermission.textContent = user.permissionName || 'Pendiente';
            if (userAdminPhotoDropzone) {
                renderAdminUserAvatar(userAdminPhotoDropzone, user, 'user-admin-detail-avatar');
            }
            if (userAdminSignatureDropzone) {
                userAdminSignatureDropzone.innerHTML = user.signatureUrl
                    ? `<img src="${escapeHtml(user.signatureUrl)}" alt="Firma de ${escapeHtml(user.name || 'usuario')}">`
                    : 'Firma';
            }
            renderPasswordToggleButton(userAdminPasswordToggle, userAdminPasswordVisible);
        }

        function selectAdminUser(id) {
            selectedAdminUserId = Number(id) || null;
            renderAdminUserList();
            updateAdminUserDetail();
        }

        function upsertAdminUser(user) {
            const index = adminUsers.findIndex((item) => Number(item.id) === Number(user.id));
            if (index >= 0) {
                adminUsers[index] = user;
            } else {
                adminUsers.push(user);
                adminUsers.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' }));
            }
        }

        async function loadAdminUsers(options = {}) {
            try {
                const response = await fetch('/api/admin-users');
                if (!response.ok) throw new Error('No fue posible cargar usuarios.');
                adminUsers = await response.json();
                adminUsersLoadedOnce = true;
                const targetId = options.selectedId || selectedAdminUserId || adminUsers[0]?.id || null;
                selectedAdminUserId = adminUsers.some((user) => Number(user.id) === Number(targetId)) ? Number(targetId) : (adminUsers[0]?.id || null);
                renderAdminUserCreateButton();
                populateUserPermissionOptions();
                renderAdminUserList();
                updateAdminUserDetail();
            } catch (error) {
                setConfigStatus(error.message || 'No fue posible cargar los usuarios.', true);
                if (userAdminTableBody) {
                    userAdminTableBody.innerHTML = `<tr><td class="user-admin-empty">${escapeHtml(error.message || 'No fue posible cargar los usuarios.')}</td></tr>`;
                }
            }
        }

        function collectAdminUserPayload() {
            const user = getSelectedAdminUser();
            if (!user) return null;
            return {
                name: userAdminFieldName?.value?.trim() || '',
                username: userAdminFieldUsername?.value?.trim() || '',
                password: userAdminFieldPassword?.value || '',
                department: userAdminFieldDepartment?.value?.trim() || '',
                process: userAdminFieldProcess?.value?.trim() || '',
                photoUrl: user.photoUrl || '',
                signatureUrl: user.signatureUrl || '',
                permissionId: userAdminFieldPermission?.value ? Number(userAdminFieldPermission.value) : null
            };
        }

        function syncSelectedAdminUserFromInputs() {
            const user = getSelectedAdminUser();
            const payload = collectAdminUserPayload();
            if (!user || !payload) return;
            user.name = payload.name;
            user.username = payload.username;
            user.password = payload.password;
            user.department = payload.department;
            user.process = payload.process;
            user.permissionId = payload.permissionId;
            user.permissionName = adminPermissions.find((item) => Number(item.id) === Number(payload.permissionId))?.name || '';
            renderAdminUserList();
            if (userAdminDetailName) userAdminDetailName.textContent = user.name || 'Usuario';
            if (userAdminDetailSubline) userAdminDetailSubline.textContent = `${user.department || 'Sin departamento'} Â· ${user.process || 'Sin proceso'}`;
            if (userAdminSummaryUsername) userAdminSummaryUsername.textContent = user.username || 'Pendiente';
            if (userAdminSummaryDepartment) userAdminSummaryDepartment.textContent = user.department || 'Pendiente';
            if (userAdminSummaryProcess) userAdminSummaryProcess.textContent = user.process || 'Pendiente';
            if (userAdminSummaryPermission) userAdminSummaryPermission.textContent = user.permissionName || 'Pendiente';
        }

        async function persistSelectedAdminUser() {
            const user = getSelectedAdminUser();
            const payload = collectAdminUserPayload();
            if (!user || !payload || !payload.name) return;
            const response = await fetch(`/api/admin-users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error('No fue posible guardar el usuario.');
            }
            const saved = await response.json();
            upsertAdminUser(saved);
            renderAdminUserList();
            updateAdminUserDetail();
        }

        function queueAdminUserSave() {
            clearTimeout(adminUserSaveTimer);
            const user = getSelectedAdminUser();
            if (!user) return;
            syncSelectedAdminUserFromInputs();
            adminUserSaveTimer = setTimeout(async () => {
                try {
                    await persistSelectedAdminUser();
                } catch (error) {
                    console.error(error);
                    setConfigStatus(error.message || 'No fue posible guardar el usuario.', true);
                }
            }, 350);
        }

        function openAdminUserCreatePopover() {
            if (!userAdminCreatePopover || !userAdminCreateButton) return;
            const rect = userAdminCreateButton.getBoundingClientRect();
            const popoverWidth = 320;
            const left = Math.min(window.innerWidth - popoverWidth - 12, Math.max(12, rect.right - popoverWidth));
            const top = rect.bottom + 10;
            userAdminCreatePopover.style.left = `${left}px`;
            userAdminCreatePopover.style.top = `${top}px`;
            userAdminCreatePopover.hidden = false;
            if (userAdminCreateNameField) {
                userAdminCreateNameField.value = '';
                requestAnimationFrame(() => userAdminCreateNameField.focus());
            }
        }

        function closeAdminUserCreatePopover() {
            if (userAdminCreatePopover) userAdminCreatePopover.hidden = true;
        }

        async function createAdminUser() {
            const name = userAdminCreateNameField?.value?.trim() || '';
            if (!name) {
                userAdminCreateNameField?.focus();
                return;
            }
            const response = await fetch('/api/admin-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('La API de usuarios no estÃ¡ disponible en este servidor. Reinicia la instancia activa para cargar el backend nuevo.');
                }
                throw new Error('No fue posible crear el usuario.');
            }
            const created = await response.json();
            upsertAdminUser(created);
            closeAdminUserCreatePopover();
            selectAdminUser(created.id);
            setConfigStatus('Usuario creado correctamente.');
        }

        async function deleteAdminUser(id) {
            const user = adminUsers.find((item) => Number(item.id) === Number(id));
            if (!user) return;
            const accepted = window.confirm(`Â¿Deseas eliminar a ${user.name || 'este usuario'}?`);
            if (!accepted) return;
            const response = await fetch(`/api/admin-users/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                throw new Error('No fue posible eliminar el usuario.');
            }
            adminUsers = adminUsers.filter((item) => Number(item.id) !== Number(id));
            if (Number(selectedAdminUserId) === Number(id)) {
                selectedAdminUserId = adminUsers[0]?.id || null;
            }
            renderAdminUserList();
            updateAdminUserDetail();
            setConfigStatus('Usuario eliminado correctamente.');
        }

        async function updateAdminUserPhoto(file) {
            const user = getSelectedAdminUser();
            if (!user || !file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                user.photoUrl = event.target?.result || '';
                updateAdminUserDetail();
                renderAdminUserList();
                try {
                    await persistSelectedAdminUser();
                } catch (error) {
                    console.error(error);
                }
            };
            reader.readAsDataURL(file);
        }

        async function updateAdminUserSignature(file) {
            const user = getSelectedAdminUser();
            if (!user || !file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                user.signatureUrl = event.target?.result || '';
                updateAdminUserDetail();
                renderAdminUserList();
                try {
                    await persistSelectedAdminUser();
                } catch (error) {
                    console.error(error);
                }
            };
            reader.readAsDataURL(file);
        }

        function bindAdminUserEvents() {
            userAdminCreateButton?.addEventListener('click', openAdminUserCreatePopover);
            userAdminCreateCancel?.addEventListener('click', closeAdminUserCreatePopover);
            userAdminCreateConfirm?.addEventListener('click', async () => {
                try {
                    await createAdminUser();
                } catch (error) {
                    console.error(error);
                    setConfigStatus(error.message || 'No fue posible crear el usuario.', true);
                }
            });
            userAdminCreateNameField?.addEventListener('keydown', async (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    try {
                        await createAdminUser();
                    } catch (error) {
                        console.error(error);
                        setConfigStatus(error.message || 'No fue posible crear el usuario.', true);
                    }
                }
            });
            document.addEventListener('pointerdown', (event) => {
                if (userAdminCreatePopover?.hidden) return;
                if (userAdminCreatePopover.contains(event.target)) return;
                if (event.target.closest('#userAdminCreateButton')) return;
                closeAdminUserCreatePopover();
            });
            userAdminTableBody?.addEventListener('click', async (event) => {
                const deleteButton = event.target.closest('[data-user-delete]');
                if (deleteButton) {
                    event.stopPropagation();
                    try {
                        await deleteAdminUser(deleteButton.dataset.userDelete);
                    } catch (error) {
                        console.error(error);
                        setConfigStatus(error.message || 'No fue posible eliminar el usuario.', true);
                    }
                    return;
                }
                const row = event.target.closest('[data-user-id]');
                if (row) {
                    selectAdminUser(row.dataset.userId);
                }
            });
            [userAdminFieldName, userAdminFieldUsername, userAdminFieldPassword, userAdminFieldDepartment, userAdminFieldProcess, userAdminFieldPermission].forEach((field) => {
                field?.addEventListener('input', queueAdminUserSave);
                field?.addEventListener('change', queueAdminUserSave);
            });
            userAdminPhotoDropzone?.addEventListener('click', () => userAdminPhotoUpload?.click());
            userAdminPhotoUpload?.addEventListener('change', async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                await updateAdminUserPhoto(file);
                event.target.value = '';
            });
            userAdminSignatureDropzone?.addEventListener('click', () => userAdminSignatureUpload?.click());
            userAdminSignatureUpload?.addEventListener('change', async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                await updateAdminUserSignature(file);
                event.target.value = '';
            });
            userAdminPasswordToggle?.addEventListener('click', () => {
                if (!userAdminFieldPassword) return;
                userAdminPasswordVisible = !userAdminPasswordVisible;
                userAdminFieldPassword.type = userAdminPasswordVisible ? 'text' : 'password';
                renderPasswordToggleButton(userAdminPasswordToggle, userAdminPasswordVisible);
            });
        }

        function getPermissionPresentationLabel(key) {
            return PRESENTATION_LABELS[key] || key;
        }

        function createEmptyPermissionModules(source = {}) {
            const output = {};
            PERMISSION_PRESENTATION_KEYS.forEach((key) => {
                const current = String(source?.[key] || '').trim().toLowerCase();
                output[key] = current === 'view' || current === 'edit' ? current : 'none';
            });
            return output;
        }

        function getSelectedAdminPermission() {
            return adminPermissions.find((item) => Number(item.id) === Number(selectedAdminPermissionId)) || null;
        }

        function getPermissionIconConfig(key, fallbackColor, fallbackSize, fallbackText) {
            const suffix = key.charAt(0).toUpperCase() + key.slice(1);
            return {
                value: document.querySelector(`input[name="icons.${key}"]`)?.value || loadedConfig.icons?.[key] || fallbackText,
                color: document.querySelector(`input[name="general.iconColor${suffix}"]`)?.value || loadedConfig.general?.[`iconColor${suffix}`] || fallbackColor,
                size: Number(document.querySelector(`input[name="general.iconSize${suffix}"]`)?.value) || Number(loadedConfig.general?.[`iconSize${suffix}`]) || fallbackSize
            };
        }

        function renderPermissionAdminCreateButton() {
            if (!permissionAdminCreateButton) return;
            const createIcon = getPermissionIconConfig('adminPermissionCreate', '#118fc6', 22, '+');
            renderButtonIcon(permissionAdminCreateButton, createIcon.value, createIcon.color, createIcon.size, '+');
        }

        function renderPermissionAdminDeleteButton() {
            if (!permissionAdminDeleteButton) return;
            const deleteIcon = getPermissionIconConfig('adminPermissionDelete', '#b94848', 18, 'ðŸ—‘');
            renderButtonIcon(permissionAdminDeleteButton, deleteIcon.value, deleteIcon.color, deleteIcon.size, 'ðŸ—‘');
        }

        function renderPasswordToggleButton(button, visible) {
            if (!button) return;
            const eyeOpen = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjkiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTEyIDVjNS41IDAgOS4xIDQuNiAxMCA3Yy0uOSAyLjQtNC41IDctMTAgN3MtOS4xLTQuNi0xMC03Yy45LTIuNCA0LjUtNyAxMC03Wm0wIDlhMiAyIDAgMSAwIDAtNCAyIDIgMCAwIDAgMCA0WiIvPjwvc3ZnPg==';
            const eyeClosed = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIxLjkiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTMgM2wxOCAxOE0xMC41OCAxMC41OGEyIDIgMCAwIDAgMi44NCAyLjg0TTkuODggNS4wOGExMC45NCAxMC45NCAwIDAgMSAyLjEyLS4wOGM1LjUgMCA5LjEgNC42IDEwIDdjLS40MyAxLjE2LTEuNDQgMi43OC0zLjI1IDQuMDZNNi42MSA2LjYxQzQuOTIgOC4wMiAzLjk5IDkuNzUgMiAxMmMuOSAyLjQgNC41IDcgMTAgN2ExMC4zNSAxMC4zNSAwIDAgMCA0LjI0LS44OSIvPjwvc3ZnPg==';
            renderButtonIcon(button, visible ? eyeClosed : eyeOpen, '#60707f', 18, '');
            button.setAttribute('aria-label', visible ? 'Ocultar contraseÃ±a' : 'Mostrar contraseÃ±a');
            button.title = visible ? 'Ocultar contraseÃ±a' : 'Mostrar contraseÃ±a';
        }

        function normalizeProformaCurrencies(value) {
            const fallback = [
                { code: 'CRC', label: 'Colones', symbol: 'â‚¡', exchangeRate: 1 },
                { code: 'USD', label: 'DÃ³lares', symbol: '$', exchangeRate: 0.0019 }
            ];
            try {
                const source = typeof value === 'string' ? JSON.parse(value || '[]') : value;
                const rows = Array.isArray(source) ? source : [];
                const cleaned = rows.map((row) => ({
                    code: String(row?.code || '').trim().toUpperCase().slice(0, 10),
                    label: String(row?.label || '').trim().slice(0, 80),
                    symbol: String(row?.symbol || '').trim().slice(0, 10),
                    exchangeRate: Number(row?.exchangeRate || 0)
                })).filter((row) => row.code && row.label && Number.isFinite(row.exchangeRate) && row.exchangeRate > 0);
                return cleaned.length ? cleaned : fallback;
            } catch (error) {
                return fallback;
            }
        }

        function getProformaPriceDisplayLabel(value) {
            return {
                unit: 'Mostrar precio unitario',
                thousand: 'Mostrar precio por millar',
                both: 'Mostrar ambos',
                product_totals: 'Mostrar totales por producto',
                global_totals: 'Mostrar totales globales'
            }[String(value || '').trim()] || 'Mostrar ambos';
        }

        function updateProformaCurrenciesField() {
            if (proformaCurrenciesJsonField) {
                proformaCurrenciesJsonField.value = JSON.stringify(proformaCurrencyRows);
            }
        }

        function populateProformaDefaultCurrencyOptions() {
            if (!proformaDefaultCurrencyField) return;
            const current = proformaDefaultCurrencyField.value || loadedConfig?.general?.proformaDefaultCurrency || proformaCurrencyRows[0]?.code || 'CRC';
            proformaDefaultCurrencyField.innerHTML = proformaCurrencyRows
                .map((row) => `<option value="${escapeHtml(row.code)}">${escapeHtml(`${row.code} Â· ${row.label}`)}</option>`)
                .join('');
            if ([...proformaDefaultCurrencyField.options].some((option) => option.value === current)) {
                proformaDefaultCurrencyField.value = current;
            }
        }

        function renderProformaCurrencyButton() {
            if (!proformaCurrencyAddButton) return;
            const addIcon = getPermissionIconConfig('proformaCurrencyAdd', '#118fc6', 18, '+');
            renderButtonIcon(proformaCurrencyAddButton, addIcon.value, addIcon.color, addIcon.size, '+');
        }

        function renderProformaCurrencies() {
            if (!proformaCurrenciesTable) return;
            const deleteIcon = getPermissionIconConfig('proformaCurrencyDelete', '#b94848', 18, 'ðŸ—‘');
            proformaCurrenciesTable.innerHTML = proformaCurrencyRows.map((row, index) => `
                <div class="proforma-currency-row" data-proforma-currency-index="${index}">
                    <label>
                        <span>CÃ³digo</span>
                        <input type="text" value="${escapeHtml(row.code || '')}" data-proforma-currency-field="code" maxlength="10">
                    </label>
                    <label>
                        <span>Nombre</span>
                        <input type="text" value="${escapeHtml(row.label || '')}" data-proforma-currency-field="label" maxlength="80">
                    </label>
                    <label>
                        <span>SÃ­mbolo</span>
                        <input type="text" value="${escapeHtml(row.symbol || '')}" data-proforma-currency-field="symbol" maxlength="10">
                    </label>
                    <label>
                        <span>Tipo de Cambio</span>
                        <input type="number" value="${escapeHtml(String(row.exchangeRate || 1))}" min="0.000001" step="0.000001" data-proforma-currency-field="exchangeRate">
                    </label>
                    <button type="button" class="proforma-currency-delete-button" data-proforma-currency-delete="${index}" aria-label="Eliminar moneda" title="Eliminar moneda"></button>
                </div>
            `).join('');
            proformaCurrenciesTable.querySelectorAll('[data-proforma-currency-delete]').forEach((button) => {
                renderButtonIcon(button, deleteIcon.value, deleteIcon.color, deleteIcon.size, 'ðŸ—‘');
            });
            updateProformaCurrenciesField();
            populateProformaDefaultCurrencyOptions();
            updateProformaPreview();
        }

        function normalizeProformaHeaderColor(value, fallback = '#203852') {
            const normalized = String(value || '').trim();
            return /^#([0-9a-fA-F]{6})$/.test(normalized) ? normalized : fallback;
        }

        function isProformaHeaderColorLight(value) {
            const normalized = normalizeProformaHeaderColor(value);
            const red = Number.parseInt(normalized.slice(1, 3), 16);
            const green = Number.parseInt(normalized.slice(3, 5), 16);
            const blue = Number.parseInt(normalized.slice(5, 7), 16);
            const luminance = (red * 0.299) + (green * 0.587) + (blue * 0.114);
            return luminance > 160;
        }

        function normalizeProformaLogoMetric(value, fallback) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        }

        function getProformaCompanyFontConfig() {
            const selected = (proformaCompanyFontFamilyField?.value || loadedConfig?.general?.proformaCompanyFontFamily || 'Cormorant Garamond').trim();
            const customLabel = (loadedConfig?.general?.proformaCompanyFontLabel || 'ProformaCompanyCustom').trim() || 'ProformaCompanyCustom';
            const customUrl = proformaCompanyFontUrlField?.value || loadedConfig?.general?.proformaCompanyFontUrl || '';
            if (selected === '__custom__' && customUrl) {
                return {
                    family: customLabel,
                    custom: true,
                    url: customUrl
                };
            }
            return {
                family: selected === '__custom__' ? 'Cormorant Garamond' : selected,
                custom: false,
                url: ''
            };
        }

        function applyProformaPreviewCompanyFont() {
            const fontConfig = getProformaCompanyFontConfig();
            const nameColor = normalizeProformaHeaderColor(proformaCompanyNameColorField?.value || loadedConfig?.general?.proformaCompanyNameColor || '#ffffff');
            if (proformaPreviewFontStyle) {
                proformaPreviewFontStyle.textContent = fontConfig.custom
                    ? `@font-face { font-family: "${fontConfig.family}"; src: url("${fontConfig.url}") format("woff2"); font-display: swap; }`
                    : '';
            }
            if (proformaPreviewCompany) {
                proformaPreviewCompany.style.fontFamily = `"${fontConfig.family}", serif`;
                proformaPreviewCompany.style.color = nameColor;
            }
            renderProformaCompanyFontUploadButton(fontConfig);
        }

        function renderProformaCompanyFontUploadButton(fontConfig = getProformaCompanyFontConfig()) {
            if (!proformaCompanyFontUploadButton) return;
            const iconConf = getAdminUserIconConfig('attachmentUpload', fontConfig.custom ? '#199767' : '#0b81b8', 18, '+');
            renderButtonIcon(proformaCompanyFontUploadButton, iconConf.value, fontConfig.custom ? '#199767' : iconConf.color, iconConf.size || 18, '+');
            proformaCompanyFontUploadButton.classList.toggle('has-font', Boolean(fontConfig.custom));
            proformaCompanyFontUploadButton.title = fontConfig.custom ? 'Fuente WOFF2 cargada' : 'Cargar fuente WOFF2';
            proformaCompanyFontUploadButton.setAttribute('aria-label', proformaCompanyFontUploadButton.title);
        }

        function applyProformaPreviewHeaderColor() {
            if (!proformaPreviewHeader) return;
            const headerColor = normalizeProformaHeaderColor(proformaHeaderColorField?.value || loadedConfig?.general?.proformaHeaderColor || '#203852');
            proformaPreviewHeader.style.background = headerColor;
            if (proformaLogoDropzone) {
                const hasLogo = Boolean(proformaLogoUrlField?.value || loadedConfig?.general?.proformaLogoUrl);
                proformaLogoDropzone.style.background = hasLogo
                    ? headerColor
                    : 'linear-gradient(180deg, #fafdff 0%, #f0f8fd 100%)';
            }
            proformaPreviewHeader.classList.toggle('is-light', isProformaHeaderColorLight(headerColor));
        }

        function applyProformaPreviewLogoLayout() {
            if (!proformaPreviewLogo) return;
            const showCompanyName = (proformaShowCompanyNameField?.value || loadedConfig?.general?.proformaShowCompanyName || 'true') === 'true';
            const logoWidth = normalizeProformaLogoMetric(proformaLogoWidthField?.value || loadedConfig?.general?.proformaLogoWidth, 82);
            const logoHeight = normalizeProformaLogoMetric(proformaLogoHeightField?.value || loadedConfig?.general?.proformaLogoHeight, 64);
            const marginTop = normalizeProformaLogoMetric(proformaLogoMarginTopField?.value || loadedConfig?.general?.proformaLogoMarginTop, 0);
            const marginLeft = normalizeProformaLogoMetric(proformaLogoMarginLeftField?.value || loadedConfig?.general?.proformaLogoMarginLeft, 0);
            proformaPreviewLogo.style.width = showCompanyName ? `${Math.max(40, logoWidth)}px` : '100%';
            proformaPreviewLogo.style.height = `${Math.max(24, logoHeight)}px`;
            proformaPreviewLogo.style.marginTop = `${marginTop}px`;
            proformaPreviewLogo.style.marginLeft = `${marginLeft}px`;
            proformaPreviewLogo.style.flex = showCompanyName ? '0 0 auto' : '1 1 auto';
            if (proformaPreviewBranding) {
                proformaPreviewBranding.hidden = !showCompanyName;
            }
        }

        function syncProformaShowCompanyNameSelector() {
            const value = (proformaShowCompanyNameField?.value || loadedConfig?.general?.proformaShowCompanyName || 'true') === 'false' ? 'false' : 'true';
            proformaShowCompanyNameSelector?.querySelectorAll('.proforma-toggle-chip').forEach((chip) => {
                const input = chip.querySelector('input');
                const selected = input?.value === value;
                chip.classList.toggle('is-selected', selected);
                if (input) input.checked = selected;
            });
        }

        function syncProformaSellerSignatureSelector() {
            const value = (proformaSellerSignatureField?.value || loadedConfig?.general?.proformaSellerSignatureEnabled || 'true') === 'false' ? 'false' : 'true';
            proformaSellerSignatureSelector?.querySelectorAll('.proforma-toggle-chip').forEach((chip) => {
                const input = chip.querySelector('input');
                const selected = input?.value === value;
                chip.classList.toggle('is-selected', selected);
                if (input) input.checked = selected;
            });
        }

        function applyProformaPreviewIntroStyle() {
            if (!proformaPreviewIntro) return;
            const family = proformaIntroFontFamilyField?.value || loadedConfig?.general?.proformaIntroFontFamily || 'inherit';
            const size = Number(proformaIntroFontSizeField?.value || loadedConfig?.general?.proformaIntroFontSize || 15) || 15;
            const color = normalizeProformaHeaderColor(proformaIntroColorField?.value || loadedConfig?.general?.proformaIntroColor || '#2f3c46', '#2f3c46');
            proformaPreviewIntro.style.fontFamily = family === 'inherit' ? '' : family;
            proformaPreviewIntro.style.fontSize = `${Math.max(10, Math.min(30, size))}px`;
            proformaPreviewIntro.style.color = color;
        }

        function getProformaLogoAspectRatio() {
            const width = Number(proformaLogoWidthField?.value || loadedConfig?.general?.proformaLogoWidth || 120) || 120;
            const height = Number(proformaLogoHeightField?.value || loadedConfig?.general?.proformaLogoHeight || 74) || 74;
            return height ? width / height : 120 / 74;
        }

        let proformaLogoAspectRatio = 120 / 74;
        let proformaLogoAspectSyncing = false;

        function syncProformaLogoAspectLock() {
            const locked = (proformaLogoAspectLockedField?.value || loadedConfig?.general?.proformaLogoAspectLocked || 'true') !== 'false';
            if (proformaLogoAspectLockedField) {
                proformaLogoAspectLockedField.value = locked ? 'true' : 'false';
            }
            proformaLogoAspectLockButton?.classList.toggle('is-active', locked);
            proformaLogoAspectLockButton?.setAttribute('aria-pressed', String(locked));
        }

        function updateProformaLogoLinkedSize(source) {
            if (proformaLogoAspectSyncing || !proformaLogoAspectLockedField || proformaLogoAspectLockedField.value === 'false') return;
            proformaLogoAspectSyncing = true;
            if (source === 'width' && proformaLogoWidthField && proformaLogoHeightField) {
                const width = Number(proformaLogoWidthField.value);
                if (Number.isFinite(width) && width > 0) {
                    proformaLogoHeightField.value = String(Math.max(24, Math.round(width / proformaLogoAspectRatio)));
                }
            }
            if (source === 'height' && proformaLogoWidthField && proformaLogoHeightField) {
                const height = Number(proformaLogoHeightField.value);
                if (Number.isFinite(height) && height > 0) {
                    proformaLogoWidthField.value = String(Math.max(40, Math.round(height * proformaLogoAspectRatio)));
                }
            }
            proformaLogoAspectSyncing = false;
        }

        function commitProformaLogoLinkedSize(source) {
            if (!proformaLogoAspectLockedField || proformaLogoAspectLockedField.value === 'false') {
                return;
            }
            updateProformaLogoLinkedSize(source);
            updateProformaPreview();
        }

        function updateProformaPreview() {
            const logoUrl = proformaLogoUrlField?.value || loadedConfig?.general?.proformaLogoUrl || '';
            if (proformaPreviewLogo) {
                proformaPreviewLogo.innerHTML = logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo de proforma">` : 'Logo';
            }
            if (proformaPreviewCompany) proformaPreviewCompany.textContent = proformaCompanyNameField?.value?.trim() || 'PrintLab';
            if (proformaPreviewSlogan) proformaPreviewSlogan.textContent = proformaSloganField?.value?.trim() || 'Proforma comercial';
            if (proformaPreviewIntro) proformaPreviewIntro.textContent = proformaIntroField?.value?.trim() || 'La introducciÃ³n aparecerÃ¡ aquÃ­.';
            applyProformaPreviewIntroStyle();
            const selectedCurrencyCode = proformaDefaultCurrencyField?.value || proformaCurrencyRows[0]?.code || 'CRC';
            const selectedCurrency = proformaCurrencyRows.find((row) => row.code === selectedCurrencyCode) || proformaCurrencyRows[0];
            if (proformaPreviewCurrency) {
                proformaPreviewCurrency.textContent = selectedCurrency ? `${selectedCurrency.code} Â· ${selectedCurrency.exchangeRate}` : selectedCurrencyCode;
            }
            if (proformaPreviewValidity) proformaPreviewValidity.textContent = proformaValidityField?.value?.trim() || '15 dÃ­as';
            if (proformaPreviewPriceMode) proformaPreviewPriceMode.textContent = getProformaPriceDisplayLabel(proformaPriceDisplayField?.value || 'both');
            const signatureEnabled = (proformaSellerSignatureField?.value || 'true') === 'true';
            if (proformaPreviewSignature) proformaPreviewSignature.textContent = signatureEnabled ? 'Firma activa' : 'Sin firma';
            if (proformaPreviewTerms) proformaPreviewTerms.textContent = proformaTermsField?.value?.trim() || 'Pendiente de definir.';
            if (proformaPreviewPaymentTerms) proformaPreviewPaymentTerms.textContent = proformaPaymentTermsField?.value?.trim() || 'Pendiente de definir.';
            if (proformaPreviewDeliveryTime) proformaPreviewDeliveryTime.textContent = proformaDeliveryTimeField?.value?.trim() || 'Pendiente de definir.';
            if (proformaPreviewTechnicalSpecs) proformaPreviewTechnicalSpecs.textContent = proformaTechnicalSpecsField?.value?.trim() || 'Pendiente de definir.';
            if (proformaPreviewQualityPolicies) proformaPreviewQualityPolicies.textContent = proformaQualityPoliciesField?.value?.trim() || 'Pendiente de definir.';
            applyProformaPreviewHeaderColor();
            applyProformaPreviewLogoLayout();
            applyProformaPreviewCompanyFont();
            syncProformaShowCompanyNameSelector();
            syncProformaSellerSignatureSelector();
            syncProformaLogoAspectLock();
        }

        function applyProformaLogoPreview() {
            if (!proformaLogoDropzone) return;
            const value = proformaLogoUrlField?.value || loadedConfig?.general?.proformaLogoUrl || '';
            if (value) {
                proformaLogoDropzone.innerHTML = `<img src="${escapeHtml(value)}" alt="Logo de proforma">`;
            } else {
                proformaLogoDropzone.textContent = 'Logo';
            }
            updateProformaPreview();
        }

        function applyProformaCompanyFontPreview() {
            const fontConfig = getProformaCompanyFontConfig();
            renderProformaCompanyFontUploadButton(fontConfig);
            updateProformaPreview();
        }

        function populateProformaConfigFields() {
            const general = loadedConfig.general || {};
            proformaCurrencyRows = normalizeProformaCurrencies(general.proformaCurrenciesJson);
            if (proformaLogoUrlField) proformaLogoUrlField.value = general.proformaLogoUrl || '';
            if (proformaCompanyFontUrlField) proformaCompanyFontUrlField.value = general.proformaCompanyFontUrl || '';
            renderProformaCurrencies();
            applyProformaLogoPreview();
            applyProformaCompanyFontPreview();
            updateProformaPreview();
        }

        function formatRepositoryDate(value) {
            if (!value) return 'Sin fecha';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return 'Sin fecha';
            return date.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        function formatRepositoryFileLabel(fileName) {
            const raw = String(fileName || '').trim();
            if (!raw) return 'Imagen';
            return raw.replace(/^\d+\-/, '');
        }

        function getLoginScreensaverMotionSeconds() {
            return Math.max(8, Number(loginScreensaverMotionSeconds?.value) || Number(loadedConfig.general?.loginScreensaverMotionSeconds) || 16);
        }

        function getLoginScreensaverSlideSeconds() {
            return Math.max(4, Number(loginScreensaverSlideSeconds?.value) || Number(loadedConfig.general?.loginScreensaverSlideSeconds) || 10);
        }

        function updateLoginRepositorySettingsLabels() {
            if (loginScreensaverMotionSecondsValue) {
                loginScreensaverMotionSecondsValue.textContent = `${getLoginScreensaverMotionSeconds()}s`;
            }
            if (loginScreensaverSlideSecondsValue) {
                loginScreensaverSlideSecondsValue.textContent = `${getLoginScreensaverSlideSeconds()}s`;
            }
        }

        function stopLoginRepositoryPreview() {
            if (loginRepositoryPreviewTimer) {
                window.clearInterval(loginRepositoryPreviewTimer);
                loginRepositoryPreviewTimer = null;
            }
        }

        function clearLoginRepositoryPreviewSlides() {
            if (!loginRepositoryStage) return;
            loginRepositoryStage.querySelectorAll('.repository-saver-slide').forEach((slide) => slide.remove());
            loginRepositoryPreviewCurrentSlide = null;
            loginRepositoryPreviewPrevSlide = null;
        }

        function showLoginRepositoryPreviewSlide(index) {
            if (!loginRepositoryStage || !loginRepositoryImages.length) return;
            loginRepositoryPreviewCurrentIndex = ((index % loginRepositoryImages.length) + loginRepositoryImages.length) % loginRepositoryImages.length;
            const image = loginRepositoryImages[loginRepositoryPreviewCurrentIndex];
            const motionSeconds = getLoginScreensaverMotionSeconds();
            const transitionMs = Math.max(800, Math.round(Math.min(motionSeconds * 1000 * 0.28, 3000)));
            if (loginRepositoryStagePlaceholder) {
                loginRepositoryStagePlaceholder.hidden = true;
            }
            const slide = document.createElement('div');
            slide.className = `repository-saver-slide ${LOGIN_SCREENSAVER_ANIM_VARIANTS[loginRepositoryPreviewCurrentIndex % LOGIN_SCREENSAVER_ANIM_VARIANTS.length]}`;
            slide.style.backgroundImage = `url(${image.url})`;
            slide.style.transition = `opacity ${transitionMs / 1000}s ease-in-out`;
            slide.style.animationDuration = `${motionSeconds}s`;
            loginRepositoryStage.appendChild(slide);

            if (loginRepositoryPreviewPrevSlide) {
                loginRepositoryPreviewPrevSlide.remove();
                loginRepositoryPreviewPrevSlide = null;
            }

            if (loginRepositoryPreviewCurrentSlide) {
                const old = loginRepositoryPreviewCurrentSlide;
                old.style.opacity = '0';
                old.classList.add('leaving');
                loginRepositoryPreviewPrevSlide = old;
                window.setTimeout(() => {
                    if (loginRepositoryPreviewPrevSlide === old) {
                        old.remove();
                        loginRepositoryPreviewPrevSlide = null;
                    }
                }, transitionMs + 120);
            }

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    slide.classList.add('active');
                });
            });

            loginRepositoryPreviewCurrentSlide = slide;
        }

        function restartLoginRepositoryPreview() {
            stopLoginRepositoryPreview();
            clearLoginRepositoryPreviewSlides();
            updateLoginRepositorySettingsLabels();
            if (!loginRepositoryImages.length) {
                if (loginRepositoryStagePlaceholder) loginRepositoryStagePlaceholder.hidden = false;
                return;
            }
            showLoginRepositoryPreviewSlide(0);
            if (loginRepositoryImages.length > 1) {
                loginRepositoryPreviewTimer = window.setInterval(() => {
                    showLoginRepositoryPreviewSlide(loginRepositoryPreviewCurrentIndex + 1);
                }, getLoginScreensaverSlideSeconds() * 1000);
            }
        }

        function renderLoginRepositoryControls() {
            const uploadIcon = getPermissionIconConfig('loginRepositoryUpload', '#118fc6', 18, 'â‡§');
            const deleteIcon = getPermissionIconConfig('loginRepositoryDelete', '#b94848', 18, 'ðŸ—‘');
            if (loginRepositoryUploadPreview) {
                renderButtonIcon(loginRepositoryUploadPreview, uploadIcon.value, uploadIcon.color, uploadIcon.size, 'â‡§');
            }
            if (!loginRepositoryGallery) return;
            if (!loginRepositoryImages.length) {
                stopLoginRepositoryPreview();
                loginRepositoryGallery.innerHTML = '<div class="repository-empty">TodavÃ­a no hay imÃ¡genes en el repositorio.</div>';
                if (loginRepositoryCount) loginRepositoryCount.textContent = '0';
                if (loginRepositoryState) loginRepositoryState.textContent = 'VacÃ­o';
                if (loginRepositoryStagePlaceholder) loginRepositoryStagePlaceholder.hidden = false;
                clearLoginRepositoryPreviewSlides();
                if (loginRepositoryStageCaption) {
                    loginRepositoryStageCaption.textContent = 'El screensaver usarÃ¡ automÃ¡ticamente las imÃ¡genes disponibles.';
                }
                updateLoginRepositorySettingsLabels();
                return;
            }
            if (loginRepositoryCount) loginRepositoryCount.textContent = String(loginRepositoryImages.length);
            if (loginRepositoryState) loginRepositoryState.textContent = 'Activo';
            if (loginRepositoryStageCaption) {
                loginRepositoryStageCaption.textContent = `${loginRepositoryImages.length} imagen${loginRepositoryImages.length === 1 ? '' : 'es'} listas para rotaciÃ³n en el login.`;
            }
            restartLoginRepositoryPreview();
            loginRepositoryGallery.innerHTML = loginRepositoryImages.map((image) => `
                <article class="repository-card">
                    <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.fileName)}">
                    <button type="button" class="repository-card-delete" data-login-repository-delete="${escapeHtml(image.fileName)}" aria-label="Eliminar imagen" title="Eliminar imagen"></button>
                </article>
            `).join('');
            loginRepositoryGallery.querySelectorAll('[data-login-repository-delete]').forEach((button) => {
                renderButtonIcon(button, deleteIcon.value, deleteIcon.color, deleteIcon.size, 'ðŸ—‘');
            });
        }

        async function loadLoginRepositoryImages() {
            const response = await fetch(LOGIN_REPOSITORY_ENDPOINT);
            if (!response.ok) {
                throw new Error('No fue posible cargar el repositorio de imÃ¡genes.');
            }
            const data = await response.json();
            loginRepositoryImages = Array.isArray(data?.images) ? data.images : [];
            loginRepositoryLoadedOnce = true;
            renderLoginRepositoryControls();
        }

        async function uploadLoginRepositoryFiles(fileList) {
            const files = Array.from(fileList || []).filter((file) => {
                if (!file) return false;
                const type = String(file.type || '').toLowerCase();
                return ['image/jpeg', 'image/png', 'image/webp'].includes(type);
            });
            if (!files.length) return;
            setConfigStatus(`Cargando ${files.length} imagen${files.length === 1 ? '' : 'es'} al repositorio...`);
            for (const file of files) {
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target?.result || '');
                    reader.onerror = () => reject(new Error('No fue posible leer una de las imÃ¡genes.'));
                    reader.readAsDataURL(file);
                });
                const response = await fetch(LOGIN_REPOSITORY_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: file.name, dataUrl })
                });
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data?.error || 'No fue posible guardar una de las imÃ¡genes del repositorio.');
                }
            }
            await loadLoginRepositoryImages();
            setConfigStatus('Repositorio actualizado correctamente.');
        }

        async function deleteLoginRepositoryFile(fileName) {
            if (!fileName) return;
            const accepted = window.confirm('Â¿Deseas eliminar esta imagen del repositorio?');
            if (!accepted) return;
            const response = await fetch(`${LOGIN_REPOSITORY_ENDPOINT}/${encodeURIComponent(fileName)}`, { method: 'DELETE' });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data?.error || 'No fue posible eliminar la imagen del repositorio.');
            }
            await loadLoginRepositoryImages();
            setConfigStatus('Imagen eliminada del repositorio.');
        }

        function bindLoginRepositoryEvents() {
            const openRepositoryPicker = () => loginRepositoryUpload?.click();
            loginRepositoryDropzone?.addEventListener('click', (event) => {
                if (event.target.closest('[data-login-repository-delete]')) return;
                openRepositoryPicker();
            });
            loginRepositoryDropzone?.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                openRepositoryPicker();
            });
            ['dragenter', 'dragover'].forEach((eventName) => {
                loginRepositoryDropzone?.addEventListener(eventName, (event) => {
                    event.preventDefault();
                    loginRepositoryDropzone.classList.add('is-dragover');
                });
            });
            ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
                loginRepositoryDropzone?.addEventListener(eventName, (event) => {
                    event.preventDefault();
                    if (eventName !== 'dragleave' || event.target === loginRepositoryDropzone) {
                        loginRepositoryDropzone.classList.remove('is-dragover');
                    }
                });
            });
            loginRepositoryDropzone?.addEventListener('drop', async (event) => {
                const files = event.dataTransfer?.files;
                if (!files?.length) return;
                try {
                    await uploadLoginRepositoryFiles(files);
                } catch (error) {
                    console.error(error);
                    setConfigStatus(error.message || 'No fue posible cargar las imÃ¡genes del repositorio.', true);
                }
            });
            loginRepositoryUpload?.addEventListener('change', async (event) => {
                const files = event.target.files;
                if (!files?.length) return;
                try {
                    await uploadLoginRepositoryFiles(files);
                } catch (error) {
                    console.error(error);
                    setConfigStatus(error.message || 'No fue posible cargar las imÃ¡genes del repositorio.', true);
                } finally {
                    event.target.value = '';
                }
            });
            loginRepositoryGallery?.addEventListener('click', async (event) => {
                const deleteButton = event.target.closest('[data-login-repository-delete]');
                if (!deleteButton) return;
                try {
                    await deleteLoginRepositoryFile(deleteButton.dataset.loginRepositoryDelete);
                } catch (error) {
                    console.error(error);
                    setConfigStatus(error.message || 'No fue posible eliminar la imagen del repositorio.', true);
                }
            });
            [loginScreensaverMotionSeconds, loginScreensaverSlideSeconds].forEach((field) => {
                field?.addEventListener('input', () => {
                    updateLoginRepositorySettingsLabels();
                    restartLoginRepositoryPreview();
                });
                field?.addEventListener('change', () => {
                    updateLoginRepositorySettingsLabels();
                    restartLoginRepositoryPreview();
                    queueConfigSave();
                });
            });
        }

        function bindProformaConfigEvents() {
            renderProformaCurrencyButton();
            proformaLogoDropzone?.addEventListener('click', () => proformaLogoUpload?.click());
            proformaLogoUpload?.addEventListener('change', (event) => {
                const file = event.target.files?.[0];
                if (!file || !proformaLogoUrlField) return;
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    proformaLogoUrlField.value = loadEvent.target?.result || '';
                    applyProformaLogoPreview();
                    queueConfigSave();
                };
                reader.readAsDataURL(file);
                event.target.value = '';
            });
            proformaShowCompanyNameSelector?.addEventListener('change', (event) => {
                const input = event.target.closest('input[name="proformaShowCompanyNameChoice"]');
                if (!input || !proformaShowCompanyNameField) return;
                proformaShowCompanyNameField.value = input.value === 'false' ? 'false' : 'true';
                syncProformaShowCompanyNameSelector();
                updateProformaPreview();
                queueConfigSave();
            });
            proformaSellerSignatureSelector?.addEventListener('change', (event) => {
                const input = event.target.closest('input[name="proformaSellerSignatureChoice"]');
                if (!input || !proformaSellerSignatureField) return;
                proformaSellerSignatureField.value = input.value === 'false' ? 'false' : 'true';
                syncProformaSellerSignatureSelector();
                updateProformaPreview();
                queueConfigSave();
            });
            proformaLogoAspectLockButton?.addEventListener('click', () => {
                if (!proformaLogoAspectLockedField) return;
                const nextLocked = proformaLogoAspectLockedField.value === 'false';
                proformaLogoAspectLockedField.value = nextLocked ? 'true' : 'false';
                if (nextLocked) {
                    proformaLogoAspectRatio = getProformaLogoAspectRatio();
                    updateProformaLogoLinkedSize('width');
                }
                syncProformaLogoAspectLock();
                updateProformaPreview();
                queueConfigSave();
            });
            proformaLogoWidthField?.addEventListener('input', () => commitProformaLogoLinkedSize('width'));
            proformaLogoWidthField?.addEventListener('change', () => {
                commitProformaLogoLinkedSize('width');
                queueConfigSave();
            });
            proformaLogoHeightField?.addEventListener('input', () => commitProformaLogoLinkedSize('height'));
            proformaLogoHeightField?.addEventListener('change', () => {
                commitProformaLogoLinkedSize('height');
                queueConfigSave();
            });
            proformaCompanyFontUploadButton?.addEventListener('click', () => proformaCompanyFontUpload?.click());
            proformaCompanyFontUpload?.addEventListener('change', (event) => {
                const file = event.target.files?.[0];
                if (!file || !proformaCompanyFontUrlField) return;
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    proformaCompanyFontUrlField.value = loadEvent.target?.result || '';
                    if (proformaCompanyFontFamilyField) {
                        proformaCompanyFontFamilyField.value = '__custom__';
                    }
                    applyProformaCompanyFontPreview();
                    queueConfigSave();
                };
                reader.readAsDataURL(file);
                event.target.value = '';
            });
            proformaCurrencyAddButton?.addEventListener('click', () => {
                proformaCurrencyRows.push({ code: '', label: '', symbol: '', exchangeRate: 1 });
                renderProformaCurrencies();
                queueConfigSave();
            });
            proformaCurrenciesTable?.addEventListener('input', (event) => {
                const row = event.target.closest('[data-proforma-currency-index]');
                const field = event.target.dataset.proformaCurrencyField;
                if (!row || !field) return;
                const index = Number(row.dataset.proformaCurrencyIndex);
                if (!proformaCurrencyRows[index]) return;
                proformaCurrencyRows[index][field] = field === 'exchangeRate'
                    ? Number(event.target.value || 0)
                    : String(event.target.value || '');
                updateProformaCurrenciesField();
                populateProformaDefaultCurrencyOptions();
                updateProformaPreview();
            });
            proformaCurrenciesTable?.addEventListener('change', () => {
                proformaCurrencyRows = normalizeProformaCurrencies(proformaCurrencyRows);
                renderProformaCurrencies();
                queueConfigSave();
            });
            proformaCurrenciesTable?.addEventListener('click', (event) => {
                const deleteButton = event.target.closest('[data-proforma-currency-delete]');
                if (!deleteButton) return;
                const index = Number(deleteButton.dataset.proformaCurrencyDelete);
                proformaCurrencyRows = proformaCurrencyRows.filter((_, currentIndex) => currentIndex !== index);
                if (!proformaCurrencyRows.length) {
                    proformaCurrencyRows = normalizeProformaCurrencies([]);
                }
                renderProformaCurrencies();
                queueConfigSave();
            });
            [
                proformaCompanyNameField,
                proformaSloganField,
                proformaHeaderColorField,
                proformaCompanyNameColorField,
                proformaCompanyFontFamilyField,
                proformaShowCompanyNameField,
                proformaPhoneField,
                proformaWebsiteField,
                proformaEmailField,
                proformaLogoWidthField,
                proformaLogoHeightField,
                proformaLogoMarginTopField,
                proformaLogoMarginLeftField,
                proformaDefaultCurrencyField,
                proformaValidityField,
                proformaIntroField,
                proformaIntroFontFamilyField,
                proformaIntroFontSizeField,
                proformaIntroColorField,
                proformaTermsField,
                proformaPaymentTermsField,
                proformaDeliveryTimeField,
                proformaTechnicalSpecsField,
                proformaQualityPoliciesField,
                proformaPriceDisplayField
            ].forEach((field) => {
                field?.addEventListener('input', updateProformaPreview);
                field?.addEventListener('change', updateProformaPreview);
            });
        }

        function renderPermissionAdminList() {
            if (!permissionAdminTableBody) return;
            if (!adminPermissions.length) {
                permissionAdminTableBody.innerHTML = '<tr><td class="user-admin-empty">TodavÃ­a no hay permisos creados.</td></tr>';
                return;
            }
            permissionAdminTableBody.innerHTML = adminPermissions.map((permission) => {
                const modules = createEmptyPermissionModules(permission.modules);
                const editCount = Object.values(modules).filter((value) => value === 'edit').length;
                const viewCount = Object.values(modules).filter((value) => value === 'view').length;
                return `
                    <tr class="${Number(permission.id) === Number(selectedAdminPermissionId) ? 'is-selected' : ''}" data-permission-id="${permission.id}">
                        <td>
                            <div class="permission-admin-row-main">
                                <div class="permission-admin-row-text">
                                    <span class="permission-admin-row-name">${escapeHtml(permission.name || 'Sin nombre')}</span>
                                    <span class="permission-admin-row-subtitle">${editCount} editar Â· ${viewCount} ver Â· ${escapeHtml(getPermissionPresentationLabel(permission.defaultLanding || 'dashboard'))}</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function populatePermissionLandingOptions() {
            if (!permissionAdminFieldLanding) return;
            const current = permissionAdminFieldLanding.value || 'dashboard';
            permissionAdminFieldLanding.innerHTML = PERMISSION_PRESENTATION_KEYS.map((key) => `<option value="${key}">${escapeHtml(getPermissionPresentationLabel(key))}</option>`).join('');
            if ([...permissionAdminFieldLanding.options].some((option) => option.value === current)) {
                permissionAdminFieldLanding.value = current;
            }
        }

        function renderPermissionAdminMatrix() {
            if (!permissionAdminMatrixBody) return;
            const permission = getSelectedAdminPermission();
            if (!permission) {
                permissionAdminMatrixBody.innerHTML = '';
                return;
            }
            const modules = createEmptyPermissionModules(permission.modules);
            permissionAdminMatrixBody.innerHTML = PERMISSION_PRESENTATION_KEYS.map((key) => `
                <tr>
                    <td>
                        <div class="permission-admin-module-label">
                            <strong>${escapeHtml(getPermissionPresentationLabel(key))}</strong>
                            <span>${escapeHtml(key)}</span>
                        </div>
                    </td>
                    <td>
                        <div class="permission-admin-access">
                            <label><input type="radio" name="permission-access-${key}" value="none" ${modules[key] === 'none' ? 'checked' : ''}>Sin Acceso</label>
                            <label><input type="radio" name="permission-access-${key}" value="view" ${modules[key] === 'view' ? 'checked' : ''}>Ver</label>
                            <label><input type="radio" name="permission-access-${key}" value="edit" ${modules[key] === 'edit' ? 'checked' : ''}>Editar</label>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        function updatePermissionAdminSummary() {
            const permission = getSelectedAdminPermission();
            if (!permission) {
                if (permissionAdminDetailEmpty) permissionAdminDetailEmpty.hidden = false;
                if (permissionAdminDetailShell) permissionAdminDetailShell.hidden = true;
                return;
            }
            if (permissionAdminDetailEmpty) permissionAdminDetailEmpty.hidden = true;
            if (permissionAdminDetailShell) permissionAdminDetailShell.hidden = false;
            const modules = createEmptyPermissionModules(permission.modules);
            const editCount = Object.values(modules).filter((value) => value === 'edit').length;
            const viewCount = Object.values(modules).filter((value) => value === 'view').length;
            if (permissionAdminDetailName) permissionAdminDetailName.textContent = permission.name || 'Permiso';
            if (permissionAdminDetailSubline) permissionAdminDetailSubline.textContent = `${editCount} mÃ³dulos con ediciÃ³n Â· ${viewCount} mÃ³dulos en consulta`;
            if (permissionAdminSummaryEdit) permissionAdminSummaryEdit.textContent = `${editCount} mÃ³dulos`;
            if (permissionAdminSummaryView) permissionAdminSummaryView.textContent = `${viewCount} mÃ³dulos`;
            if (permissionAdminSummaryLanding) permissionAdminSummaryLanding.textContent = getPermissionPresentationLabel(permission.defaultLanding || 'dashboard');
            if (permissionAdminFieldName) permissionAdminFieldName.value = permission.name || '';
            if (permissionAdminFieldLanding) permissionAdminFieldLanding.value = permission.defaultLanding || 'dashboard';
            renderPermissionAdminDeleteButton();
            renderPermissionAdminMatrix();
        }

        function selectAdminPermission(id) {
            selectedAdminPermissionId = Number(id) || null;
            renderPermissionAdminList();
            updatePermissionAdminSummary();
        }

        function upsertAdminPermission(permission) {
            const normalized = {
                ...permission,
                modules: createEmptyPermissionModules(permission.modules)
            };
            const index = adminPermissions.findIndex((item) => Number(item.id) === Number(normalized.id));
            if (index >= 0) {
                adminPermissions[index] = normalized;
            } else {
                adminPermissions.push(normalized);
                adminPermissions.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' }));
            }
            adminUsers.forEach((user) => {
                if (Number(user.permissionId) === Number(normalized.id)) {
                    user.permissionName = normalized.name || '';
                }
            });
        }

        async function loadAdminPermissions(options = {}) {
            try {
                const response = await fetch('/api/admin-permissions');
                if (!response.ok) throw new Error('No fue posible cargar los permisos.');
                adminPermissions = (await response.json()).map((item) => ({ ...item, modules: createEmptyPermissionModules(item.modules) }));
                adminPermissionsLoadedOnce = true;
                populatePermissionLandingOptions();
                populateUserPermissionOptions();
                adminUsers.forEach((user) => {
                    user.permissionName = adminPermissions.find((item) => Number(item.id) === Number(user.permissionId))?.name || '';
                });
                renderPermissionAdminCreateButton();
                const targetId = options.selectedId || selectedAdminPermissionId || adminPermissions[0]?.id || null;
                selectedAdminPermissionId = adminPermissions.some((item) => Number(item.id) === Number(targetId)) ? Number(targetId) : (adminPermissions[0]?.id || null);
                renderPermissionAdminList();
                updatePermissionAdminSummary();
                updateAdminUserDetail();
            } catch (error) {
                setConfigStatus(error.message || 'No fue posible cargar los permisos.', true);
                if (permissionAdminTableBody) {
                    permissionAdminTableBody.innerHTML = `<tr><td class="user-admin-empty">${escapeHtml(error.message || 'No fue posible cargar los permisos.')}</td></tr>`;
                }
            }
        }

        function collectAdminPermissionPayload() {
            const permission = getSelectedAdminPermission();
            if (!permission) return null;
            const modules = createEmptyPermissionModules(permission.modules);
            PERMISSION_PRESENTATION_KEYS.forEach((key) => {
                const checked = permissionAdminMatrixBody?.querySelector(`input[name="permission-access-${key}"]:checked`);
                modules[key] = checked?.value || modules[key] || 'none';
            });
            return {
                name: permissionAdminFieldName?.value?.trim() || '',
                defaultLanding: permissionAdminFieldLanding?.value || 'dashboard',
                modules
            };
        }

        function syncSelectedPermissionFromInputs() {
            const permission = getSelectedAdminPermission();
            const payload = collectAdminPermissionPayload();
            if (!permission || !payload) return;
            permission.name = payload.name;
            permission.defaultLanding = payload.defaultLanding;
            permission.modules = createEmptyPermissionModules(payload.modules);
            renderPermissionAdminList();
            updatePermissionAdminSummary();
        }

        async function persistSelectedPermission() {
            const permission = getSelectedAdminPermission();
            const payload = collectAdminPermissionPayload();
            if (!permission || !payload || !payload.name) return;
            const response = await fetch(`/api/admin-permissions/${permission.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error('No fue posible guardar el permiso.');
            }
            const saved = await response.json();
            upsertAdminPermission(saved);
            renderPermissionAdminList();
            updatePermissionAdminSummary();
        }

        function queueAdminPermissionSave() {
            clearTimeout(adminPermissionSaveTimer);
            const permission = getSelectedAdminPermission();
            if (!permission) return;
            syncSelectedPermissionFromInputs();
            adminPermissionSaveTimer = setTimeout(async () => {
                try {
                    await persistSelectedPermission();
                } catch (error) {
                    console.error(error);
                    setConfigStatus(error.message || 'No fue posible guardar el permiso.', true);
                }
            }, 350);
        }

        function openPermissionAdminCreatePopover() {
            if (!permissionAdminCreatePopover || !permissionAdminCreateButton) return;
            const rect = permissionAdminCreateButton.getBoundingClientRect();
            const popoverWidth = 320;
            const left = Math.min(window.innerWidth - popoverWidth - 12, Math.max(12, rect.right - popoverWidth));
            const top = rect.bottom + 10;
            permissionAdminCreatePopover.style.left = `${left}px`;
            permissionAdminCreatePopover.style.top = `${top}px`;
            permissionAdminCreatePopover.hidden = false;
            if (permissionAdminCreateNameField) {
                permissionAdminCreateNameField.value = '';
                requestAnimationFrame(() => permissionAdminCreateNameField.focus());
            }
        }

        function closePermissionAdminCreatePopover() {
            if (permissionAdminCreatePopover) permissionAdminCreatePopover.hidden = true;
        }

        async function createAdminPermission() {
            const name = permissionAdminCreateNameField?.value?.trim() || '';
            if (!name) {
                permissionAdminCreateNameField?.focus();
                return;
            }
            const modules = createEmptyPermissionModules();
            const response = await fetch('/api/admin-permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, defaultLanding: 'dashboard', modules })
            });
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('La API de permisos no estÃ¡ disponible en este servidor. Reinicia la instancia activa para cargar el backend nuevo.');
                }
                throw new Error('No fue posible crear el permiso.');
            }
            const created = await response.json();
            upsertAdminPermission(created);
            closePermissionAdminCreatePopover();
            selectAdminPermission(created.id);
            setConfigStatus('Permiso creado correctamente.');
        }

        async function deleteAdminPermission(id) {
            const permission = adminPermissions.find((item) => Number(item.id) === Number(id));
            if (!permission) return;
            const accepted = window.confirm(`Â¿Deseas eliminar el permiso ${permission.name || 'seleccionado'}?`);
            if (!accepted) return;
            const response = await fetch(`/api/admin-permissions/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                throw new Error('No fue posible eliminar el permiso.');
            }
            adminPermissions = adminPermissions.filter((item) => Number(item.id) !== Number(id));
            adminUsers.forEach((user) => {
                if (Number(user.permissionId) === Number(id)) {
                    user.permissionId = null;
                    user.permissionName = '';
                }
            });
            populateUserPermissionOptions();
            if (Number(selectedAdminPermissionId) === Number(id)) {
                selectedAdminPermissionId = adminPermissions[0]?.id || null;
            }
            renderPermissionAdminList();
            updatePermissionAdminSummary();
            updateAdminUserDetail();
            setConfigStatus('Permiso eliminado correctamente.');
        }

        function bindAdminPermissionEvents() {
            permissionAdminCreateButton?.addEventListener('click', openPermissionAdminCreatePopover);
            permissionAdminCreateCancel?.addEventListener('click', closePermissionAdminCreatePopover);
            permissionAdminCreateConfirm?.addEventListener('click', async () => {
                try {
                    await createAdminPermission();
                } catch (error) {
                    console.error(error);
                    setConfigStatus(error.message || 'No fue posible crear el permiso.', true);
                }
            });
            permissionAdminCreateNameField?.addEventListener('keydown', async (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    try {
                        await createAdminPermission();
                    } catch (error) {
                        console.error(error);
                        setConfigStatus(error.message || 'No fue posible crear el permiso.', true);
                    }
                }
            });
            document.addEventListener('pointerdown', (event) => {
                if (permissionAdminCreatePopover?.hidden) return;
                if (permissionAdminCreatePopover.contains(event.target)) return;
                if (event.target.closest('#permissionAdminCreateButton')) return;
                closePermissionAdminCreatePopover();
            });
            permissionAdminTableBody?.addEventListener('click', (event) => {
                const row = event.target.closest('[data-permission-id]');
                if (row) {
                    selectAdminPermission(row.dataset.permissionId);
                }
            });
            permissionAdminDeleteButton?.addEventListener('click', async () => {
                const permission = getSelectedAdminPermission();
                if (!permission) return;
                try {
                    await deleteAdminPermission(permission.id);
                } catch (error) {
                    console.error(error);
                    setConfigStatus(error.message || 'No fue posible eliminar el permiso.', true);
                }
            });
            permissionAdminFieldName?.addEventListener('input', queueAdminPermissionSave);
            permissionAdminFieldLanding?.addEventListener('change', queueAdminPermissionSave);
            permissionAdminMatrixBody?.addEventListener('change', (event) => {
                if (event.target.matches('input[type="radio"]')) {
                    queueAdminPermissionSave();
                }
            });
        }

        function syncToggleButtons() {
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                const values = btn.dataset.values.split(',');
                const icons = btn.dataset.icons.split(',');
                const field = btn.dataset.field;
                const hiddenInput = btn.parentElement.querySelector('input[type="hidden"]') || document.getElementById(field.replace('.', ''));
                if (!hiddenInput) return;
                const currentIndex = values.indexOf(hiddenInput.value);
                if (btn.dataset.iconSet === 'quoteNumberBold') {
                    const stateOn = currentIndex === 1;
                    const key = stateOn ? 'quoteNumberBoldOn' : 'quoteNumberBoldOff';
                    const suffix = stateOn ? 'QuoteNumberBoldOn' : 'QuoteNumberBoldOff';
                    const iconValue = document.querySelector(`input[name="icons.${key}"]`)?.value || loadedConfig?.icons?.[key] || (stateOn ? 'B' : 'b');
                    const colorValue = document.querySelector(`input[name="general.iconColor${suffix}"]`)?.value || loadedConfig?.general?.[`iconColor${suffix}`] || (stateOn ? '#0b81b8' : '#8c97a2');
                    const sizeValue = Number(document.querySelector(`input[name="general.iconSize${suffix}"]`)?.value) || Number(loadedConfig?.general?.[`iconSize${suffix}`]) || 16;
                    renderButtonIcon(btn, iconValue, colorValue, sizeValue, icons[currentIndex >= 0 ? currentIndex : 0]);
                } else {
                    btn.textContent = icons[currentIndex >= 0 ? currentIndex : 0];
                }
                if (hiddenInput.value === '') {
                    btn.textContent = '?';
                }
            });
        }

        function populatePresentationFields() {
            const key = getCurrentPresentationKey();
            const data = getPresentationData(key);
            
            PRESENTATION_FIELDS.forEach(field => {
                const input = document.getElementById('presentation' + field.charAt(0).toUpperCase() + field.slice(1));
                if (input) {
                    if (PRESENTATION_COLOR_FIELDS.includes(field)) {
                        if (data[field]) {
                            input.value = data[field];
                            markColorFieldEmpty(input, false);
                        } else {
                            markColorFieldEmpty(input, true);
                        }
                    } else if (input.tagName === 'SELECT') {
                        input.value = data[field] || '';
                    } else if (input.type !== 'hidden') {
                        input.value = data[field] !== undefined ? data[field] : '';
                    } else {
                        input.value = data[field] || '';
                    }
                }
                
                if (['brandVerticalAlign', 'titleVerticalAlign', 'titleHorizontalAlign'].includes(field)) {
                    const hiddenInput = document.querySelector(`input[type="hidden"][id="presentation${field.charAt(0).toUpperCase() + field.slice(1)}"]`);
                    if (hiddenInput) hiddenInput.value = data[field] || '';
                }
            });
            syncPresentationTabLayoutFields();
            
            const logoPosInput = document.getElementById('presentationLogoPosition');
            if (logoPosInput) logoPosInput.value = data.logoPosition || '';
            const footerBorderInput = document.getElementById('presentationFooterBorderColor');
            if (footerBorderInput) {
                if (data.footerBorderColor) {
                    footerBorderInput.value = data.footerBorderColor;
                    markColorFieldEmpty(footerBorderInput, false);
                } else {
                    markColorFieldEmpty(footerBorderInput, true);
                }
            }
            syncToggleButtons();
        }

        function captureCurrentPresentationData() {
            const key = getCurrentPresentationKey();
            const currentData = {};
            
            const numericFields = ['brandWidth','brandFontSize','titleMarginLeft','titleFontSize','titleWidth','footerFontSize','footerMarginTop','footerMarginBottom','fieldHeight','fieldFontSize','mediumInputWidth','largeInputWidth','tableHeaderFontSize','tableRowHeight','iconSize','pageMarginTop','pageMarginBottom','pageMarginRight','pageMarginLeft'];
            
            PRESENTATION_FIELDS.forEach(field => {
                if (GLOBAL_TAB_LAYOUT_FIELDS.includes(field)) {
                    return;
                }
                const input = document.getElementById('presentation' + field.charAt(0).toUpperCase() + field.slice(1));
                if (input) {
                    if (PRESENTATION_COLOR_FIELDS.includes(field) && input.dataset.empty === 'true') {
                        return;
                    }
                    let value = input.value;
                    if (value === '') {
                        return;
                    }
                    if (numericFields.includes(field)) {
                        const parsedValue = Number(value);
                        if (Number.isNaN(parsedValue)) {
                            return;
                        }
                        value = parsedValue;
                    }
                    currentData[field] = value;
                }
            });
            
            const logoPosInput = document.getElementById('presentationLogoPosition');
            if (logoPosInput && logoPosInput.value) currentData.logoPosition = logoPosInput.value;
            const footerBorderInput = document.getElementById('presentationFooterBorderColor');
            if (footerBorderInput && footerBorderInput.value) {
                currentData.footerBorderColor = footerBorderInput.value;
            }
            
            presentationsData[key] = currentData;
        }

        function buildGeneralPayload() {
            const formData = new FormData(document.getElementById('generalConfigForm'));
            const payload = {};

            for (let [key, value] of formData.entries()) {
                const parts = key.split('.');
                let obj = payload;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!obj[parts[i]]) obj[parts[i]] = {};
                    obj = obj[parts[i]];
                }
                obj[parts[parts.length - 1]] = value;
            }

            payload.presentations = presentationsData;
            payload.general = payload.general || {};
            payload.appearance = payload.appearance || {};
            return payload;
        }

        function populateAuditPresentationFilter() {
            if (!auditPresentationFilter) return;
            const currentValue = auditPresentationFilter.value || '';
            auditPresentationFilter.innerHTML = '';

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Todas';
            auditPresentationFilter.appendChild(defaultOption);

            const seen = new Set();
            Object.entries(PRESENTATION_LABELS).forEach(([key, label]) => {
                if (!key || seen.has(key)) return;
                seen.add(key);
                const option = document.createElement('option');
                option.value = key;
                option.textContent = label;
                auditPresentationFilter.appendChild(option);
            });

            auditPresentationFilter.value = Array.from(auditPresentationFilter.options).some((option) => option.value === currentValue)
                ? currentValue
                : '';
        }

        function formatAuditTimestamp(value) {
            if (!value) return 'Sin fecha';
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return String(value);
            return date.toLocaleString('es-CR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        }

        function formatAuditValue(value, fallbackDisplay = '') {
            if (fallbackDisplay !== undefined && fallbackDisplay !== null && String(fallbackDisplay).trim() !== '') {
                return String(fallbackDisplay).trim();
            }
            if (value === undefined) return '';
            if (value === null) return 'VacÃ­o';
            if (typeof value === 'string') return value === '' ? 'VacÃ­o' : value;
            if (typeof value === 'number' || typeof value === 'boolean') return String(value);
            if (Array.isArray(value)) return value.length ? value.join(', ') : 'VacÃ­o';
            try {
                return JSON.stringify(value);
            } catch (error) {
                return String(value);
            }
        }

        function createAuditValueCell(text) {
            const wrapper = document.createElement('div');
            wrapper.className = 'audit-value';
            wrapper.textContent = text || 'VacÃ­o';
            return wrapper;
        }

        function renderAuditRows(items = []) {
            if (!auditTableBody) return;
            auditTableBody.innerHTML = '';

            if (!Array.isArray(items) || items.length === 0) {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 6;
                cell.className = 'audit-empty';
                cell.textContent = 'TodavÃ­a no hay cambios auditados para esos filtros.';
                row.appendChild(cell);
                auditTableBody.appendChild(row);
                return;
            }

            items.forEach((item) => {
                const row = document.createElement('tr');

                const whenCell = document.createElement('td');
                whenCell.className = 'audit-meta';
                whenCell.textContent = formatAuditTimestamp(item.changed_at);
                row.appendChild(whenCell);

                const userCell = document.createElement('td');
                userCell.textContent = item.changed_by || 'Sistema';
                row.appendChild(userCell);

                const presentationCell = document.createElement('td');
                const chip = document.createElement('span');
                chip.className = 'audit-chip';
                chip.textContent = item.presentation_label || PRESENTATION_LABELS[item.presentation_key] || item.module_key || 'General';
                presentationCell.appendChild(chip);
                if (item.section_label || item.row_label) {
                    const detail = document.createElement('div');
                    detail.className = 'audit-meta';
                    detail.textContent = [item.section_label, item.row_label].filter(Boolean).join(' / ');
                    presentationCell.appendChild(detail);
                }
                row.appendChild(presentationCell);

                const fieldCell = document.createElement('td');
                fieldCell.textContent = item.field_label || item.field_key || 'Campo';
                row.appendChild(fieldCell);

                const beforeCell = document.createElement('td');
                beforeCell.appendChild(createAuditValueCell(formatAuditValue(item.old_value, item.old_value_display)));
                row.appendChild(beforeCell);

                const afterCell = document.createElement('td');
                afterCell.appendChild(createAuditValueCell(formatAuditValue(item.new_value, item.new_value_display)));
                row.appendChild(afterCell);

                auditTableBody.appendChild(row);
            });
        }

        async function loadAuditEntries(forceReload = false) {
            if (!auditTableBody) return;
            if (!forceReload && auditLoadedOnce && !document.getElementById('tab-auditoria')?.classList.contains('active')) {
                return;
            }

            const params = new URLSearchParams();
            if (auditModuleFilter?.value) params.set('module', auditModuleFilter.value);
            if (auditPresentationFilter?.value) params.set('presentation', auditPresentationFilter.value);
            if (auditUserFilter?.value.trim()) params.set('user', auditUserFilter.value.trim());
            if (auditDateFromFilter?.value) params.set('dateFrom', auditDateFromFilter.value);
            if (auditDateToFilter?.value) params.set('dateTo', auditDateToFilter.value);
            if (auditFieldFilter?.value.trim()) params.set('field', auditFieldFilter.value.trim());
            params.set('limit', '300');

            auditTableBody.innerHTML = '<tr><td colspan="6" class="audit-empty">Cargando auditorÃ­a...</td></tr>';

            try {
                const response = await fetch(`/api/audit-log?${params.toString()}`);
                if (!response.ok) throw new Error('No fue posible cargar la auditorÃ­a.');
                const data = await response.json();
                renderAuditRows(data.items || []);
                auditLoadedOnce = true;
            } catch (error) {
                auditTableBody.innerHTML = '';
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 6;
                cell.className = 'audit-empty';
                cell.textContent = error.message || 'No fue posible cargar la auditorÃ­a.';
                row.appendChild(cell);
                auditTableBody.appendChild(row);
            }
        }

        function exportGeneralConfig() {
            captureCurrentPresentationData();
            const payload = buildGeneralPayload();
            delete payload.presentations;
            const json = JSON.stringify(payload, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            link.href = url;
            link.download = `config-general-${stamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            document.getElementById('saveStatus').textContent = 'JSON general exportado.';
            const floatingStatus = document.getElementById('saveStatusFloating');
            if (floatingStatus) floatingStatus.textContent = 'JSON general exportado.';
        }

        const FAVORITE_DRUM_SAMPLE_ITEMS = [
            'C-1045  |  Dos Pinos  |  Yogurt griego',
            'OP-339  |  Britt  |  Funda snack',
            'C-1048  |  Pozuelo  |  Empaque club social',
            'OP-341  |  Eva  |  Azucar promo',
            'C-1052  |  Saba Mas  |  Etiqueta numerada'
        ];

        function syncFavoriteDrumControlValues() {
            [
                'favoriteDrumSpacing',
                'favoriteDrumRadius',
                'favoriteDrumBlur',
                'favoriteDrumContrast',
                'favoriteDrumFontBoost',
                'favoriteDrumHeight',
                'favoriteDrumShadowOpacity',
                'favoriteDrumShadowBlur',
                'favoriteDrumShadowOffsetY',
                'favoriteDrumShadowColor'
            ].forEach((id) => {
                const input = document.getElementById(id);
                const valueNode = document.getElementById(id + 'Value');
                if (!input || !valueNode) return;
                valueNode.textContent = input.value;
            });
        }

        function drawFavoriteDrumPreview() {
            const canvas = document.getElementById('favoriteDrumPreviewCanvas');
            const viewport = document.getElementById('favoriteDrumPreviewViewport');
            if (!canvas || !viewport) return;

            const width = Math.max(viewport.clientWidth || 360, 360);
            const height = Math.max(Number(document.getElementById('favoriteDrumHeight')?.value) || 220, 180);
            canvas.width = width;
            canvas.height = height;
            canvas.style.height = `${height}px`;

            const ctx = canvas.getContext('2d');
            const offscreen = document.createElement('canvas');
            offscreen.width = width;
            offscreen.height = height;
            const octx = offscreen.getContext('2d');
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Number(document.getElementById('favoriteDrumRadius')?.value) || 88;
            const spacing = (Number(document.getElementById('favoriteDrumSpacing')?.value) || 19) / 100;
            const blurMax = Number(document.getElementById('favoriteDrumBlur')?.value) || 2.5;
            const contrast = Number(document.getElementById('favoriteDrumContrast')?.value) || 8;
            const fontBoost = Number(document.getElementById('favoriteDrumFontBoost')?.value) || 3;
            const shadowOpacity = (Number(document.getElementById('favoriteDrumShadowOpacity')?.value) || 45) / 100;
            const shadowBlur = Number(document.getElementById('favoriteDrumShadowBlur')?.value) || 5;
            const shadowOffsetY = Number(document.getElementById('favoriteDrumShadowOffsetY')?.value) || 2;
            const shadowColor = document.getElementById('favoriteDrumShadowColor')?.value || '#000000';
            const front = -Math.PI / 2;
            const activeIndex = 2;
            const rgb = /^#/.test(shadowColor) ? shadowColor : '#000000';

            ctx.clearRect(0, 0, width, height);
            FAVORITE_DRUM_SAMPLE_ITEMS
                .map((label, index) => {
                    const angle = front + ((index - activeIndex) * spacing);
                    const z = Math.cos(angle - front);
                    const y = centerY + (radius * Math.sin(angle - front));
                    return { label, index, z, y };
                })
                .sort((a, b) => a.z - b.z)
                .forEach(({ label, index, z, y }) => {
                    if (z <= 0.01) return;
                    const frontness = Math.max(0, Math.min(1, z));
                    const isActive = index === activeIndex;
                    const shaped = isActive ? 1 : Math.pow(frontness, contrast * 0.5);
                    const alpha = isActive ? 1 : shaped;
                    const blur = isActive ? 0 : blurMax * (1 - Math.pow(frontness, 2));
                    const fontSize = isActive ? 14 + fontBoost : 12 + (2 * frontness);
                    const tone = isActive ? 24 : Math.round(40 + (168 * (1 - shaped)));

                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = `${isActive ? '700' : '500'} ${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
                    ctx.fillStyle = `rgb(${tone}, ${tone + 8}, ${tone + 16})`;
                    if (isActive) {
                        ctx.shadowColor = rgb;
                        ctx.globalAlpha = 1;
                        ctx.shadowBlur = shadowBlur;
                        ctx.shadowOffsetY = shadowOffsetY;
                        ctx.filter = `opacity(${Math.max(0.01, shadowOpacity)})`;
                        ctx.fillText(label, centerX, y);
                        ctx.filter = 'none';
                    } else if (blur > 0.35) {
                        octx.clearRect(0, 0, width, height);
                        octx.textAlign = 'center';
                        octx.textBaseline = 'middle';
                        octx.font = `${isActive ? '700' : '500'} ${fontSize}px "Trebuchet MS", "Segoe UI", sans-serif`;
                        octx.fillStyle = `rgb(${tone}, ${tone + 8}, ${tone + 16})`;
                        octx.fillText(label, centerX, y);
                        ctx.filter = `blur(${blur.toFixed(1)}px)`;
                        ctx.drawImage(offscreen, 0, 0);
                        ctx.filter = 'none';
                    } else {
                        ctx.fillText(label, centerX, y);
                    }
                    ctx.restore();
                });
        }

        function updateFavoriteDrumPreview() {
            syncFavoriteDrumControlValues();
            drawFavoriteDrumPreview();
        }

        function updateMobilePreviewLink() {
            const previewLink = document.getElementById('mobileSellerPreviewLink');
            if (!previewLink) return;
            const theme = document.getElementById('mobileSellerTheme')?.value || 'light';
            previewLink.href = `/cotizaciones?mobilePreview=1&theme=${encodeURIComponent(theme)}`;
        }

        function updatePreviews() {
            syncTabColorSwatches();
            updateMobilePreviewLink();
            applyDieShapePreviews();
            updateProformaPreview();
            // Datos Empresa
            const companyName = document.querySelector('input[name="branding.companyName"]')?.value || 'PrintLab';
            const headerBgStart = document.querySelector('input[name="general.headerBgStart"]')?.value || '#0b81b8';
            const headerBgEnd = document.querySelector('input[name="general.headerBgEnd"]')?.value || '#17abdf';
            const footerBorderColor = document.querySelector('input[name="general.footerBorderColor"]')?.value || '#11a3dd';
            const footerColor = document.querySelector('input[name="general.footerColor"]')?.value || '#2f3740';
            const footerFontSize = document.querySelector('input[name="general.footerFontSize"]')?.value || 12;
            const brandColor = document.querySelector('input[name="general.brandColor"]')?.value || '#0b81b8';
            const brandFontSize = document.querySelector('input[name="general.brandFontSize"]')?.value || 22;
            const brandFontFamily = document.querySelector('select[name="general.brandFontFamily"]')?.value || 'Georgia, Times New Roman, serif';
            const brandVerticalAlign = document.querySelector('input[name="general.brandVerticalAlign"]')?.value || 'center';
            const brandHorizontalAlign = document.querySelector('input[name="general.brandHorizontalAlign"]')?.value || 'left';
            const brandLogoPosition = document.querySelector('select[name="general.brandLogoPosition"]')?.value || 'left';
            const logoUrl = document.querySelector('input[name="branding.logoUrl"]')?.value || '';
            const logoWidth = Number(document.querySelector('input[name="layout.logoWidth"]')?.value) || 60;
            const generalTitleFontFamily = document.querySelector('select[name="general.titleFontFamily"]')?.value || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
            const generalTitleFontSize = Number(document.querySelector('input[name="general.titleFontSize"]')?.value) || 16;
            const generalTitleColor = document.querySelector('input[name="general.titleColor"]')?.value || '#ffffff';
            const generalTitleVerticalAlign = document.querySelector('input[name="general.titleVerticalAlign"]')?.value || 'center';
            const generalTitleHorizontalAlign = document.querySelector('input[name="general.titleHorizontalAlign"]')?.value || 'left';
            const quoteNumberFontFamily = document.querySelector('select[name="general.quoteNumberFontFamily"]')?.value || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
            const quoteNumberFontSize = Number(document.querySelector('input[name="general.quoteNumberFontSize"]')?.value) || 16;
            const quoteNumberWidth = Number(document.querySelector('input[name="general.quoteNumberWidth"]')?.value) || 0;
            const quoteNumberAutoWidth = (document.querySelector('input[name="general.quoteNumberAutoWidth"]')?.value || 'true') === 'true';
            const quoteNumberBold = (document.querySelector('input[name="general.quoteNumberBold"]')?.value || 'false') === 'true';
            const quoteNumberVerticalAlign = document.querySelector('input[name="general.quoteNumberVerticalAlign"]')?.value || 'center';
            const quoteNumberHorizontalAlign = document.querySelector('input[name="general.quoteNumberHorizontalAlign"]')?.value || 'right';
            const quoteNumberPaddingTop = Number(document.querySelector('input[name="general.quoteNumberPaddingTop"]')?.value) || 0;
            const quoteNumberPaddingRight = Number(document.querySelector('input[name="general.quoteNumberPaddingRight"]')?.value) || 14;
            const quoteNumberPaddingBottom = Number(document.querySelector('input[name="general.quoteNumberPaddingBottom"]')?.value) || 0;
            const quoteNumberPaddingLeft = Number(document.querySelector('input[name="general.quoteNumberPaddingLeft"]')?.value) || 14;
            const fieldFontFamily = document.querySelector('select[name="general.fieldFontFamily"]')?.value || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
            const fieldFontSize = Number(document.querySelector('input[name="layout.fieldFontSize"]')?.value) || 12;
            const fieldHeight = Number(document.querySelector('input[name="layout.fieldHeight"]')?.value) || 18;
            const iconSettings = Object.fromEntries(ICON_LIBRARY.map((icon) => {
                const suffix = toIconSuffix(icon.key);
                return [icon.key, {
                    color: document.querySelector(`input[name="general.iconColor${suffix}"]`)?.value || icon.color,
                    size: Number(document.querySelector(`input[name="general.iconSize${suffix}"]`)?.value) || icon.size
                }];
            }));
            
            // Preview Info Empresa
            const previewInfo = document.getElementById('previewInfoEmpresa');
            const previewBrandContainer = document.getElementById('previewBrandContainer');
            const previewBrandLogo = document.getElementById('previewBrandLogo');
            const previewBrandName = document.getElementById('previewBrandName');
            
            if (previewInfo) {
                previewInfo.style.background = `linear-gradient(135deg, ${headerBgStart}, ${headerBgEnd})`;
                
                // Calculate header height based on logo and text size
                const calculatedHeight = Math.max(logoWidth + 20, Number(brandFontSize) + 30);
                previewInfo.style.minHeight = calculatedHeight + 'px';
                
                // Update logo
                if (logoUrl && previewBrandLogo) {
                    previewBrandLogo.src = logoUrl;
                    previewBrandLogo.style.display = 'block';
                    previewBrandLogo.style.width = logoWidth + 'px';
                    previewBrandLogo.style.maxHeight = logoWidth + 'px';
                    previewBrandLogo.style.background = 'transparent';
                    previewBrandLogo.style.objectFit = 'contain';
                } else if (previewBrandLogo) {
                    previewBrandLogo.style.display = 'none';
                }
                
                // Update brand name
                if (previewBrandName) {
                    previewBrandName.style.color = brandColor;
                    previewBrandName.style.fontSize = brandFontSize + 'px';
                    previewBrandName.style.fontFamily = brandFontFamily;
                    previewBrandName.textContent = companyName;
                }
                
                // Update logo position
                if (previewBrandContainer) {
                    previewBrandContainer.style.flexDirection = brandLogoPosition === 'right' ? 'row-reverse' : 'row';
                    previewBrandContainer.style.alignItems = getFlexAlign(brandVerticalAlign, 'center');
                    previewBrandContainer.style.justifyContent = brandHorizontalAlign === 'left' ? 'flex-start' : brandHorizontalAlign === 'right' ? 'flex-end' : 'center';
                }
            }
            
            // Preview Encabezado
            const previewEnc = document.getElementById('previewEncabezado');
            if (previewEnc) {
                previewEnc.style.background = `linear-gradient(135deg, ${headerBgStart}, ${headerBgEnd})`;
                const previewGeneralTitleWrap = document.getElementById('previewGeneralTitleWrap');
                const previewGeneralTitle = document.getElementById('previewGeneralTitle');
                const previewQuoteNumberWrap = document.getElementById('previewQuoteNumberWrap');
                const previewQuoteNumberField = document.getElementById('previewQuoteNumberField');
                if (previewGeneralTitleWrap) {
                    previewGeneralTitleWrap.style.alignItems = getFlexAlign(generalTitleVerticalAlign, 'center');
                    previewGeneralTitleWrap.style.justifyContent = getFlexAlign(generalTitleHorizontalAlign, 'flex-start');
                }
                if (previewGeneralTitle) {
                    previewGeneralTitle.style.fontFamily = generalTitleFontFamily;
                    previewGeneralTitle.style.fontSize = `${generalTitleFontSize}px`;
                    previewGeneralTitle.style.color = generalTitleColor;
                    previewGeneralTitle.style.textAlign = generalTitleHorizontalAlign === 'right' ? 'right' : generalTitleHorizontalAlign === 'center' ? 'center' : 'left';
                }
                if (previewQuoteNumberWrap) {
                    previewQuoteNumberWrap.style.alignItems = getFlexAlign(quoteNumberVerticalAlign, 'center');
                    previewQuoteNumberWrap.style.justifyContent = getFlexAlign(quoteNumberHorizontalAlign, 'flex-end');
                }
                if (previewQuoteNumberField) {
                    const quoteCode = 'C-190112';
                    const measurePreviewQuoteWidth = (text, fontFamily, fontSize, fontWeight) => {
                        const canvas = updatePreviews._measureCanvas || (updatePreviews._measureCanvas = document.createElement('canvas'));
                        const context = canvas.getContext('2d');
                        if (!context) return Math.max(112, (String(text || '').length + 4) * Math.max(fontSize * 0.66, 10));
                        context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                        return Math.max(112, Math.ceil(context.measureText(String(text || '')).width + quoteNumberPaddingLeft + quoteNumberPaddingRight + 6));
                    };
                    const resolvedWidth = quoteNumberAutoWidth
                        ? `${measurePreviewQuoteWidth(quoteCode, quoteNumberFontFamily, quoteNumberFontSize, quoteNumberBold ? 700 : 400)}px`
                        : `${Math.max(112, quoteNumberWidth || 112)}px`;
                    previewQuoteNumberField.style.fontFamily = quoteNumberFontFamily;
                    previewQuoteNumberField.style.fontSize = `${quoteNumberFontSize}px`;
                    previewQuoteNumberField.style.fontWeight = quoteNumberBold ? '700' : '400';
                    previewQuoteNumberField.style.textAlign = 'center';
                    previewQuoteNumberField.style.paddingTop = `${quoteNumberPaddingTop}px`;
                    previewQuoteNumberField.style.paddingRight = `${quoteNumberPaddingRight}px`;
                    previewQuoteNumberField.style.paddingBottom = `${quoteNumberPaddingBottom}px`;
                    previewQuoteNumberField.style.paddingLeft = `${quoteNumberPaddingLeft}px`;
                    previewQuoteNumberField.style.width = resolvedWidth;
                    previewQuoteNumberField.textContent = quoteCode;
                }
            }
            
            // Preview Pie
            const previewPie = document.getElementById('previewPie');
            if (previewPie) {
                previewPie.style.borderTopColor = footerBorderColor;
                previewPie.style.color = footerColor;
                previewPie.style.fontFamily = document.querySelector('select[name="general.footerFontFamily"]')?.value || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif';
                previewPie.style.fontSize = footerFontSize + 'px';
            }
            const previewFieldInput = document.querySelector('#camposGeneralSection .preview-panel input');
            if (previewFieldInput) {
                previewFieldInput.style.fontFamily = fieldFontFamily;
                previewFieldInput.style.fontSize = `${fieldFontSize}px`;
                previewFieldInput.style.height = `${fieldHeight}px`;
            }
            Object.entries(iconSettings).forEach(([key, settings]) => {
                const preview = document.getElementById(`preview-icons.${key}`);
                const iconValue = document.querySelector(`input[name="icons.${key}"]`)?.value || '';
                renderIconPreview(preview, iconValue, settings.color, settings.size);
            });
            
            // Presentation fields
            const key = getCurrentPresentationKey();
            const presData = getPresentationData(key);
            
            const presTitle = document.getElementById('previewPresTitle');
            if (presTitle) {
                presTitle.textContent = fixCommonTextArtifacts(presData.moduleTitle || presData.moduleTitle || 'TÃ­tulo');
                presTitle.style.color = presData.titleColor || '#ffffff';
                presTitle.style.fontFamily = presData.titleFontFamily || 'Segoe UI';
                presTitle.style.fontSize = (presData.titleFontSize || 16) + 'px';
            }
            
            // Preview header background for presentation
            const presHeaderBg = document.querySelector('.preview-header[id^="preview"]');
            if (presHeaderBg) {
                const pBgStart = presData.headerBgStart || headerBgStart;
                const pBgEnd = presData.headerBgEnd || headerBgEnd;
                presHeaderBg.style.background = `linear-gradient(135deg, ${pBgStart}, ${pBgEnd})`;
            }
            syncToggleButtons();
            normalizeUiTextArtifacts();
            applyFloatingSaveButtonPreview();
            updateFavoriteDrumPreview();
            syncConfigTabHeights();
        }

        function queueConfigSave() {
            if (configSaveInFlight) {
                configSaveQueued = true;
                return;
            }
            clearTimeout(configSaveTimer);
            const statusNode = document.getElementById('saveStatus');
            if (statusNode) {
                statusNode.hidden = false;
                statusNode.textContent = 'Guardando cambios...';
            }
            configSaveTimer = setTimeout(async () => {
                configSaveInFlight = true;
                try {
                    await saveConfig();
                } finally {
                    configSaveInFlight = false;
                    if (configSaveQueued) {
                        configSaveQueued = false;
                        queueConfigSave();
                    }
                }
            }, 650);
        }

        document.querySelectorAll('.config-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.dataset.tab === 'presentaciones') {
                    captureCurrentPresentationData();
                }
                document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.config-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
                if (tab.dataset.tab === 'presentaciones') {
                    populatePresentationFields();
                    updatePreviews();
                }
                if (tab.dataset.tab === 'auditoria') {
                    loadAuditEntries();
                }
                if (tab.dataset.tab === 'seguridad') {
                    const activeSecurityTab = document.querySelector('.security-subtab.active')?.dataset.securityTab || 'usuarios';
                    activateSecurityTab(activeSecurityTab);
                }
                if (tab.dataset.tab === 'repositorio' && !loginRepositoryLoadedOnce) {
                    loadLoginRepositoryImages().catch((error) => {
                        console.error(error);
                        setConfigStatus(error.message || 'No fue posible cargar el repositorio.', true);
                    });
                }
                syncConfigTabHeights();
            });
        });

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const values = btn.dataset.values.split(',');
                const icons = btn.dataset.icons.split(',');
                const field = btn.dataset.field;
                const hiddenInput = btn.parentElement.querySelector('input[type="hidden"]') || document.getElementById(field.replace('.', ''));
                if (!hiddenInput) return;
                let currentIndex = values.indexOf(hiddenInput.value);
                let nextIndex = (currentIndex + 1) % values.length;
                hiddenInput.value = values[nextIndex];
                btn.textContent = icons[nextIndex];
                updatePreviews();
            });
        });

        // Logo upload handlers
        const logoUploadField = document.getElementById('logoUploadField');
        const logoDropzone = document.getElementById('logoDropzone');
        
        if (logoUploadField) {
            logoUploadField.addEventListener('change', function(e) {
                const file = this.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const dataUrl = ev.target.result;
                    document.getElementById('logoUrlField').value = dataUrl;
                    if (logoDropzone) {
                        logoDropzone.style.backgroundImage = 'url(' + dataUrl + ')';
                        logoDropzone.textContent = '';
                        logoDropzone.classList.add('has-image');
                    }
                    updatePreviews();
                    queueConfigSave();
                };
                reader.readAsDataURL(file);
            });
        }

        const companyLogoUpload = document.getElementById('companyLogoUpload');
        const companyLogoDropzone = document.getElementById('companyLogoDropzone');
        
        if (companyLogoUpload) {
            companyLogoUpload.addEventListener('change', function(e) {
                const file = this.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const dataUrl = ev.target.result;
                    document.getElementById('companyLogoUrl').value = dataUrl;
                    if (companyLogoDropzone) {
                        companyLogoDropzone.style.backgroundImage = 'url(' + dataUrl + ')';
                        companyLogoDropzone.textContent = '';
                        companyLogoDropzone.classList.add('has-image');
                    }
                    updatePreviews();
                    queueConfigSave();
                };
                reader.readAsDataURL(file);
            });
        }

        function bindIconUploadHandlers() {
            document.querySelectorAll('[data-icon-upload]').forEach(uploadInput => {
                if (uploadInput.dataset.iconUploadBound === 'true') return;

                const iconKey = uploadInput.dataset.iconUpload;
                const textInput = document.querySelector(`[name="${iconKey}"]`);
                const previewEl = document.getElementById('preview-' + iconKey);

                uploadInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            if (textInput) textInput.value = ev.target.result;
                            const suffix = iconKey.charAt(0).toUpperCase() + iconKey.slice(1);
                            const colorInput = document.querySelector(`input[name="general.iconColor${suffix}"]`);
                            const sizeInput = document.querySelector(`input[name="general.iconSize${suffix}"]`);
                            renderIconPreview(previewEl, ev.target.result, colorInput?.value || '#9ba2ab', Number(sizeInput?.value) || 20);
                            renderAdminUserCreateButton();
                            renderAdminUserList();
                            renderPermissionAdminCreateButton();
                            renderPermissionAdminDeleteButton();
                            updatePreviews();
                            queueConfigSave();
                        };
                        reader.readAsDataURL(file);
                    }
                });

                if (previewEl) {
                    previewEl.style.cursor = 'pointer';
                    previewEl.addEventListener('click', () => uploadInput.click());
                }

                uploadInput.dataset.iconUploadBound = 'true';
            });
        }

        function applyLogoPreviews() {
            const logoUrl = loadedConfig.branding?.logoUrl;
            const logoDropzone = document.getElementById('logoDropzone');
            if (logoUrl && logoDropzone) {
                logoDropzone.style.backgroundImage = 'url(' + logoUrl + ')';
                logoDropzone.textContent = '';
            }
            
            const companyLogoUrl = loadedConfig.branding?.companyLogoUrl;
            const companyLogoDropzone = document.getElementById('companyLogoDropzone');
            if (companyLogoUrl && companyLogoDropzone) {
                companyLogoDropzone.style.backgroundImage = 'url(' + companyLogoUrl + ')';
                companyLogoDropzone.textContent = '';
            }
        }
        
        function applyIconPreviews() {
            ICON_LIBRARY.forEach((icon) => {
                const key = icon.key;
                const iconValue = loadedConfig.icons?.[key];
                const previewEl = document.getElementById('preview-icons.' + key);
                const suffix = toIconSuffix(key);
                const colorValue = loadedConfig.general?.[`iconColor${suffix}`] || icon.color;
                const sizeValue = Number(loadedConfig.general?.[`iconSize${suffix}`]) || icon.size;
                renderIconPreview(previewEl, iconValue, colorValue, sizeValue);
            });
            renderAdminUserCreateButton();
            renderAdminUserList();
            renderPermissionAdminCreateButton();
            renderPermissionAdminDeleteButton();
            renderPasswordToggleButton(userAdminPasswordToggle, userAdminFieldPassword?.type === 'text');
            renderLoginRepositoryControls();
            renderProformaCompanyFontUploadButton();
        }

        ensureIconLibraryFields();
        ensureDieShapeConfigFields();
        normalizeUiTextArtifacts();
        enhanceColorInputs();
        bindIconUploadHandlers();
        bindDieShapeUploadHandlers();
        bindLoginRepositoryEvents();
        bindProformaConfigEvents();

        document.querySelectorAll('#generalConfigForm input, #generalConfigForm select, #generalConfigForm textarea').forEach(field => {
            const isColorField = field.type === 'color';
            field.addEventListener('change', updatePreviews);
            if (!isColorField) field.addEventListener('input', updatePreviews);
            field.addEventListener('change', renderAdminUserCreateButton);
            if (!isColorField) field.addEventListener('input', renderAdminUserCreateButton);
            field.addEventListener('change', renderAdminUserList);
            if (!isColorField) field.addEventListener('input', renderAdminUserList);
            field.addEventListener('change', renderPermissionAdminCreateButton);
            if (!isColorField) field.addEventListener('input', renderPermissionAdminCreateButton);
            field.addEventListener('change', renderPermissionAdminDeleteButton);
            if (!isColorField) field.addEventListener('input', renderPermissionAdminDeleteButton);
            field.addEventListener('change', queueConfigSave);
            if (field.type !== 'file' && !isColorField) {
                field.addEventListener('input', queueConfigSave);
            }
            if (field.name === 'layout.tabWidth' || field.name === 'layout.tabHeight') {
                field.addEventListener('input', syncPresentationTabLayoutFields);
                field.addEventListener('change', syncPresentationTabLayoutFields);
            }
        });

        PRESENTATION_COLOR_FIELDS.forEach(field => {
            const input = document.getElementById('presentation' + field.charAt(0).toUpperCase() + field.slice(1));
            if (!input) return;
            input.addEventListener('input', () => markColorFieldEmpty(input, false));
            input.addEventListener('change', () => markColorFieldEmpty(input, false));
        });

        async function loadConfig() {
            try {
                const response = await fetch('/api/config/general');
                loadedConfig = await response.json();
                
                console.log('=== LOAD CONFIG ===');
                console.log('layout:', loadedConfig.layout);
                console.log('branding:', loadedConfig.branding);
                
                if (loadedConfig.presentations) {
                    presentationsData = {
                        ...createEmptyPresentationState(),
                        ...loadedConfig.presentations
                    };
                }
                
                populateGeneralFields();
                populateProformaConfigFields();
                normalizeUiTextArtifacts();
                enhanceColorInputs();
                applyLogoPreviews();
                populatePresentationFields();
                applyHeaderConfig(loadedConfig);
                applyIconPreviews();
                await loadLoginRepositoryImages();
                applyDieShapePreviews();
                syncTabColorSwatches();
                populateAuditPresentationFilter();
                updatePreviews();
                applyFloatingSaveButtonPreview();
                renderAdminUserCreateButton();
                if (!adminUsersLoadedOnce) {
                    await loadAdminUsers();
                } else {
                    renderAdminUserList();
                    updateAdminUserDetail();
                }
                populatePermissionLandingOptions();
                renderPermissionAdminCreateButton();
                if (!adminPermissionsLoadedOnce) {
                    await loadAdminPermissions();
                } else {
                    renderPermissionAdminList();
                    updatePermissionAdminSummary();
                }
                syncConfigTabHeights();
            } catch (error) {
                console.error('Error loading config:', error);
                document.getElementById('saveStatus').textContent = 'Error al cargar configuracion';
            }
        }

        async function saveConfig() {
            captureCurrentPresentationData();
            
            const payload = buildGeneralPayload();
            
            try {
                document.getElementById('saveStatus').textContent = 'Guardando...';
                const floatingStatus = document.getElementById('saveStatusFloating');
                if (floatingStatus) floatingStatus.textContent = 'Guardando...';
                const response = await fetch('/api/config/general', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error('Error al guardar');
                loadedConfig = await response.json();
                populateProformaConfigFields();
                applyHeaderConfig(loadedConfig);
                applyDieShapePreviews();
                renderAdminUserCreateButton();
                renderAdminUserList();
                renderPermissionAdminCreateButton();
                renderPermissionAdminDeleteButton();
                renderPermissionAdminList();
                document.getElementById('saveStatus').textContent = 'Guardado correctamente.';
                if (floatingStatus) floatingStatus.textContent = 'Guardado correctamente.';
                if (auditLoadedOnce) {
                    await loadAuditEntries(true);
                }
            } catch (error) {
                document.getElementById('saveStatus').textContent = 'Error al guardar: ' + error.message;
                const floatingStatus = document.getElementById('saveStatusFloating');
                if (floatingStatus) floatingStatus.textContent = 'Error al guardar: ' + error.message;
            }
        }

        window.addEventListener('resize', () => {
            syncConfigTabHeights();
        });

        auditApplyButton?.addEventListener('click', () => {
            loadAuditEntries(true);
        });

        auditResetButton?.addEventListener('click', () => {
            if (auditModuleFilter) auditModuleFilter.value = '';
            if (auditPresentationFilter) auditPresentationFilter.value = '';
            if (auditUserFilter) auditUserFilter.value = '';
            if (auditDateFromFilter) auditDateFromFilter.value = '';
            if (auditDateToFilter) auditDateToFilter.value = '';
            if (auditFieldFilter) auditFieldFilter.value = '';
            loadAuditEntries(true);
        });

        securitySubtabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                activateSecurityTab(tab.dataset.securityTab || 'usuarios');
            });
        });

        sapAdvancedCheckbox?.addEventListener('change', syncSapAdvancedToggle);
        sapSaveButton?.addEventListener('click', async () => {
            try {
                await saveSapConnectorConfig();
            } catch (error) {
                setSapConfigStatus(error.message || 'No fue posible guardar la configuraciÃ³n SAP.', true);
            }
        });
        sapTestButton?.addEventListener('click', async () => {
            try {
                await testSapConnector();
            } catch (error) {
                setSapConfigStatus(error.message || 'No fue posible validar la conexiÃ³n SAP.', true);
            }
        });
        sapSyncButton?.addEventListener('click', async () => {
            try {
                await syncSapConnector();
            } catch (error) {
                setSapConfigStatus(error.message || 'No fue posible sincronizar SAP.', true);
            }
        });
        sapResetDemoButton?.addEventListener('click', async () => {
            try {
                await resetSapConnectorDemo();
            } catch (error) {
                setSapConfigStatus(error.message || 'No fue posible reiniciar el entorno SAP.', true);
            }
        });
        sapRunQueryButton?.addEventListener('click', async () => {
            try {
                await runSapConnectorQuery();
            } catch (error) {
                setSapConfigStatus(error.message || 'No fue posible consultar SAP.', true);
            }
        });
        sapRefreshLogsButton?.addEventListener('click', async () => {
            try {
                await loadSapConnectorState(true);
            } catch (error) {
                setSapConfigStatus(error.message || 'No fue posible actualizar la actividad SAP.', true);
            }
        });
        sapLoadTemplateButton?.addEventListener('click', loadSapPayloadTemplate);
        sapWriteEntity?.addEventListener('change', loadSapPayloadTemplate);
        sapSendPayloadButton?.addEventListener('click', async () => {
            try {
                await sendSapPayload();
            } catch (error) {
                setSapConfigStatus(error.message || 'No fue posible enviar a SAP.', true);
            }
        });

        document.getElementById('presentationKey')?.addEventListener('change', () => {
            captureCurrentPresentationData();
            populatePresentationFields();
            updatePreviews();
        });

        configSearchButton?.addEventListener('click', () => {
            toggleConfigMenu(false);
            document.querySelector('#generalConfigForm input:not([type="hidden"]), #generalConfigForm select')?.focus();
        });

        configMenuToggle?.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleConfigMenu();
        });

        document.addEventListener('click', (event) => {
            if (!configMenuPanel || configMenuPanel.hidden) return;
            if (configMenuPanel.contains(event.target) || configMenuToggle?.contains(event.target)) return;
            if (event.target.closest('a[href]')) return;
            toggleConfigMenu(false);
        });

        bindAdminUserEvents();
        bindAdminPermissionEvents();
        syncSapAdvancedToggle();
        loadSapPayloadTemplate();
        activateSecurityTab('usuarios');
        loadConfig();
        document.getElementById('mobileSellerTheme')?.addEventListener('change', updateMobilePreviewLink);
    
