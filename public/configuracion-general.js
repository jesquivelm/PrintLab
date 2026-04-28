const CONFIG_ENDPOINT = '/api/config/general';
const form = document.getElementById('generalConfigForm');
const saveStatus = document.getElementById('saveStatus');
const logoUrlField = document.getElementById('logoUrlField');
const logoUploadField = document.getElementById('logoUploadField');
const logoDropzone = document.getElementById('logoDropzone');
const previewLogoBox = document.getElementById('previewLogoBox');
const previewHeaderBrand = document.getElementById('previewHeaderBrand');
const previewHeaderTitle = document.getElementById('previewHeaderTitle');
const presentationKeyField = document.getElementById('presentationKey');
const presentationLogoUploadField = document.getElementById('presentationLogoUploadField');
const presentationBrandLogoUrl = document.getElementById('presentationBrandLogoUrl');
const presentationLogoDropzone = document.getElementById('presentationLogoDropzone');
const previewHeaderBrandContainer = document.getElementById('previewHeaderBrandContainer');
const previewHeaderLogoImage = document.getElementById('previewHeaderLogoImage');
const root = document.documentElement;

const PRESENTATION_DEFAULTS = {
    cotizaciones: { moduleTitle: 'Cotizaciones', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
    socios: { moduleTitle: 'Socios', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
    inventario: { moduleTitle: 'Inventario', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 },
    flexo: { moduleTitle: 'Flexo | Cálculo', brandWidth: 116, brandFontFamily: 'Georgia, Times New Roman, serif', brandFontSize: 22, brandMarginTop: 0, brandMarginRight: 0, brandMarginBottom: 0, brandMarginLeft: 0, titleMarginLeft: 30, titleFontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', titleFontSize: 16, titleVerticalAlign: 'center', brandLogoUrl: '', logoPosition: 'left', headerBgStart: '', headerBgEnd: '', headerBorderColor: '', fieldHeight: 18, fieldFontSize: 12, labelAlign: 'left', mediumInputWidth: 0, largeInputWidth: 0, footerMarginTop: 0, footerMarginBottom: 0 }
};

const presentationFieldMap = {
    moduleTitle: document.getElementById('presentationModuleTitle'),
    brandWidth: document.getElementById('presentationBrandWidth'),
    brandFontFamily: document.getElementById('presentationBrandFontFamily'),
    brandFontSize: document.getElementById('presentationBrandFontSize'),
    titleFontFamily: document.getElementById('presentationTitleFontFamily'),
    titleFontSize: document.getElementById('presentationTitleFontSize'),
    titleVerticalAlign: document.getElementById('presentationTitleVerticalAlign'),
    titleMarginLeft: document.getElementById('presentationTitleMarginLeft'),
    brandMarginTop: document.getElementById('presentationBrandMarginTop'),
    brandMarginRight: document.getElementById('presentationBrandMarginRight'),
    brandMarginBottom: document.getElementById('presentationBrandMarginBottom'),
    brandMarginLeft: document.getElementById('presentationBrandMarginLeft'),
    brandLogoUrl: document.getElementById('presentationBrandLogoUrl'),
    logoPosition: document.getElementById('presentationLogoPosition'),
    headerBgStart: document.getElementById('presentationHeaderBgStart'),
    headerBgEnd: document.getElementById('presentationHeaderBgEnd'),
    headerBorderColor: document.getElementById('presentationHeaderBorderColor'),
    footerMarginTop: document.getElementById('presentationFooterMarginTop'),
    footerMarginBottom: document.getElementById('presentationFooterMarginBottom'),
    fieldHeight: document.getElementById('presentationFieldHeight'),
    fieldFontSize: document.getElementById('presentationFieldFontSize'),
    labelAlign: document.getElementById('presentationLabelAlign'),
    mediumInputWidth: document.getElementById('presentationMediumInputWidth'),
    largeInputWidth: document.getElementById('presentationLargeInputWidth')
};

const iconPreviewMap = {
    'icons.topUser': document.getElementById('preview-icons.topUser'),
    'icons.tableMove': document.getElementById('preview-icons.tableMove'),
    'icons.tableOpen': document.getElementById('preview-icons.tableOpen'),
    'icons.tableAdd': document.getElementById('preview-icons.tableAdd'),
    'icons.quantity.add': document.getElementById('preview-icons.quantity.add'),
    'icons.quantity.delete': document.getElementById('preview-icons.quantity.delete'),
    'icons.quoteRequestSubmit': document.getElementById('preview-icons.quoteRequestSubmit'),
    'icons.quoteRequestAdvanced': document.getElementById('preview-icons.quoteRequestAdvanced'),
    'icons.quoteRequestAttachment': document.getElementById('preview-icons.quoteRequestAttachment'),
    'icons.quoteRequestRecord': document.getElementById('preview-icons.quoteRequestRecord'),
    'icons.quoteRequestRecordStop': document.getElementById('preview-icons.quoteRequestRecordStop'),
    'icons.quoteRequestAttachmentDelete': document.getElementById('preview-icons.quoteRequestAttachmentDelete')
};

let presentationState = JSON.parse(JSON.stringify(PRESENTATION_DEFAULTS));
let configState = {};

function getSelectedPresentationKey() {
    return presentationKeyField?.value || 'cotizaciones';
}

function normalizePresentationConfig(key, config) {
    return { ...PRESENTATION_DEFAULTS[key], ...config };
}

function getSelectedPresentationConfig() {
    const key = getSelectedPresentationKey();
    return normalizePresentationConfig(key, presentationState[key]);
}

function getValue(path, fallback = '') {
    const keys = path.split('.');
    let value = configState;
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return fallback;
        }
    }
    return value ?? fallback;
}

function populateFields() {
    form?.querySelectorAll('input, select').forEach(field => {
        const name = field.name || field.id;
        if (!name) return;
        
        let value = getValue(name);
        
        if (field.type === 'checkbox') {
            field.checked = value;
        } else if (field.tagName === 'SELECT') {
            field.value = value || '';
        } else {
            field.value = value ?? '';
        }
    });

    populatePresentationFields();
    applySharedPreview();
    applyIconPreviews();
}

function populatePresentationFields() {
    const key = getSelectedPresentationKey();
    const config = normalizePresentationConfig(key, presentationState[key]);

    Object.keys(presentationFieldMap).forEach(fieldKey => {
        const field = presentationFieldMap[fieldKey];
        if (field) {
            const value = config[fieldKey];
            if (field.tagName === 'SELECT') {
                field.value = value || '';
            } else {
                field.value = value ?? '';
            }
        }
    });
}

function syncPresentationStateFromInputs() {
    const key = getSelectedPresentationKey();
    const current = normalizePresentationConfig(key, presentationState[key]);
    presentationState[key] = {
        ...current,
        moduleTitle: presentationFieldMap.moduleTitle?.value || current.moduleTitle,
        brandWidth: presentationFieldMap.brandWidth?.value !== '' ? Number(presentationFieldMap.brandWidth.value) : current.brandWidth,
        brandFontFamily: presentationFieldMap.brandFontFamily?.value || current.brandFontFamily,
        brandFontSize: presentationFieldMap.brandFontSize?.value !== '' ? Number(presentationFieldMap.brandFontSize.value) : current.brandFontSize,
        titleFontFamily: presentationFieldMap.titleFontFamily?.value || current.titleFontFamily,
        titleFontSize: presentationFieldMap.titleFontSize?.value !== '' ? Number(presentationFieldMap.titleFontSize.value) : current.titleFontSize,
        titleVerticalAlign: presentationFieldMap.titleVerticalAlign?.value || current.titleVerticalAlign,
        titleMarginLeft: presentationFieldMap.titleMarginLeft?.value !== '' ? Number(presentationFieldMap.titleMarginLeft.value) : current.titleMarginLeft,
        brandMarginTop: presentationFieldMap.brandMarginTop?.value !== '' ? Number(presentationFieldMap.brandMarginTop.value) : current.brandMarginTop,
        brandMarginRight: presentationFieldMap.brandMarginRight?.value !== '' ? Number(presentationFieldMap.brandMarginRight.value) : current.brandMarginRight,
        brandMarginBottom: presentationFieldMap.brandMarginBottom?.value !== '' ? Number(presentationFieldMap.brandMarginBottom.value) : current.brandMarginBottom,
        brandMarginLeft: presentationFieldMap.brandMarginLeft?.value !== '' ? Number(presentationFieldMap.brandMarginLeft.value) : current.brandMarginLeft,
        brandLogoUrl: presentationFieldMap.brandLogoUrl?.value || current.brandLogoUrl,
        logoPosition: presentationFieldMap.logoPosition?.value || current.logoPosition,
        headerBgStart: presentationFieldMap.headerBgStart?.value || current.headerBgStart,
        headerBgEnd: presentationFieldMap.headerBgEnd?.value || current.headerBgEnd,
        headerBorderColor: presentationFieldMap.headerBorderColor?.value || current.headerBorderColor,
        footerMarginTop: presentationFieldMap.footerMarginTop?.value !== '' ? Number(presentationFieldMap.footerMarginTop.value) : current.footerMarginTop,
        footerMarginBottom: presentationFieldMap.footerMarginBottom?.value !== '' ? Number(presentationFieldMap.footerMarginBottom.value) : current.footerMarginBottom,
        fieldHeight: presentationFieldMap.fieldHeight?.value !== '' ? Number(presentationFieldMap.fieldHeight.value) : current.fieldHeight,
        fieldFontSize: presentationFieldMap.fieldFontSize?.value !== '' ? Number(presentationFieldMap.fieldFontSize.value) : current.fieldFontSize,
        labelAlign: presentationFieldMap.labelAlign?.value || current.labelAlign,
        mediumInputWidth: presentationFieldMap.mediumInputWidth?.value !== '' ? Number(presentationFieldMap.mediumInputWidth.value) : current.mediumInputWidth,
        largeInputWidth: presentationFieldMap.largeInputWidth?.value !== '' ? Number(presentationFieldMap.largeInputWidth.value) : current.largeInputWidth
    };
}

function applySharedPreview() {
    const companyName = getValue('branding.companyName', 'PrintLab');
    const logoUrl = getValue('branding.logoUrl').trim();
    const presentation = getSelectedPresentationConfig();
    
    // Get logoWidth directly from input field to reflect real-time changes
    const logoWidthInput = form?.querySelector('[name="layout.logoWidth"]');
    console.log('[Config Preview] logoWidthInput found:', !!logoWidthInput, 'value:', logoWidthInput?.value);
    const logoWidth = logoWidthInput ? Number(logoWidthInput.value) || 60 : Number(getValue('layout.logoWidth', 60));
    console.log('[Config Preview] Using logoWidth:', logoWidth);

    previewLogoBox.textContent = companyName;
    previewLogoBox.style.backgroundImage = logoUrl ? `url(${logoUrl})` : 'none';
    previewLogoBox.style.width = logoWidth + 'px';
    previewLogoBox.style.height = logoWidth + 'px';
    previewLogoBox.classList.toggle('has-image', Boolean(logoUrl));

    // Apply logo size to the logo dropzone input area too
    if (logoDropzone) {
        logoDropzone.style.width = logoWidth + 'px';
        logoDropzone.style.height = logoWidth + 'px';
    }

    previewHeaderBrand.textContent = companyName;
    previewHeaderBrand.style.width = `${presentation.brandWidth}px`;
    previewHeaderBrand.style.fontFamily = presentation.brandFontFamily;
    previewHeaderBrand.style.fontSize = `${presentation.brandFontSize}px`;
    previewHeaderBrand.style.paddingTop = `${6 + Number(presentation.brandMarginTop || 0)}px`;
    previewHeaderBrand.style.paddingRight = `${14 + Number(presentation.brandMarginRight || 0)}px`;
    previewHeaderBrand.style.paddingBottom = `${10 + Number(presentation.brandMarginBottom || 0)}px`;
    previewHeaderBrand.style.paddingLeft = `${14 + Number(presentation.brandMarginLeft || 0)}px`;

    if (presentation.brandLogoUrl) {
        previewHeaderLogoImage.style.display = 'block';
        previewHeaderLogoImage.src = presentation.brandLogoUrl;
    } else {
        previewHeaderLogoImage.style.display = 'none';
    }

    previewHeaderBrandContainer.style.flexDirection = presentation.logoPosition === 'right' ? 'row-reverse' : 'row';
    
    const shouldHideBrand = presentation.logoPosition === 'hide_text';
    previewHeaderBrand.style.display = shouldHideBrand ? 'none' : 'flex';
    previewHeaderLogoImage.style.display = (presentation.brandLogoUrl && !shouldHideBrand) ? 'block' : 'none';

    previewHeaderTitle.textContent = presentation.moduleTitle;
    
    const headerBgStart = presentation.headerBgStart || getValue('layout.headerBgStart', '#0b81b8');
    const headerBgEnd = presentation.headerBgEnd || getValue('layout.headerBgEnd', '#17abdf');
    document.getElementById('previewHeaderBg').style.background = `linear-gradient(135deg, ${headerBgStart}, ${headerBgEnd})`;

    const fieldHeight = presentation.fieldHeight || getValue('layout.fieldHeight', 18);
    const fieldFontSize = presentation.fieldFontSize || getValue('layout.fieldFontSize', 12);
    document.getElementById('previewFormInput').style.height = `${fieldHeight}px`;
    document.getElementById('previewFormInput').style.fontSize = `${fieldFontSize}px`;
    
    const labelAlign = presentation.labelAlign || getValue('layout.labelAlign', 'left');
    document.getElementById('previewFormLabel').style.textAlign = labelAlign;
    document.getElementById('previewFormLabel').style.width = getValue('layout.headerLabelWidth', 58) + 'px';
}

function applyIconPreviews() {
    const iconKeys = ['topUser', 'tableMove', 'tableOpen', 'tableAdd', 'quantity.add', 'quantity.delete', 'quoteRequestSubmit', 'quoteRequestAdvanced', 'quoteRequestAttachment', 'quoteRequestRecord', 'quoteRequestRecordStop', 'quoteRequestAttachmentDelete'];
    iconKeys.forEach(key => {
        const iconValue = getValue(`icons.${key}`);
        const previewEl = iconPreviewMap[`icons.${key}`];
        if (previewEl) {
            if (iconValue && iconValue.startsWith('data:image')) {
                previewEl.style.backgroundImage = `url(${iconValue})`;
                previewEl.style.backgroundSize = 'contain';
                previewEl.style.backgroundRepeat = 'no-repeat';
                previewEl.style.backgroundPosition = 'center';
                previewEl.textContent = '';
            } else {
                previewEl.style.backgroundImage = 'none';
                previewEl.textContent = iconValue || '';
            }
        }
    });
}

function buildConfigPayload() {
    const formData = new FormData(form);
    const payload = {};
    
    for (const [key, value] of formData.entries()) {
        const keys = key.split('.');
        let obj = payload;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
    }

    syncPresentationStateFromInputs();
    payload.presentations = presentationState;
    payload.general = { ...(configState.general || {}), ...(payload.general || {}) };

    return payload;
}

async function saveConfig() {
    const payload = buildConfigPayload();
    console.log('Payload to save:', JSON.stringify(payload).substring(0, 500));
    console.log('logoUrl length:', payload.branding?.logoUrl?.length);
    console.log('logoWidth:', payload.layout?.logoWidth);
    saveStatus.textContent = 'Guardando...';
    
    try {
        const response = await fetch(CONFIG_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Error al guardar');
        
        configState = payload;
        saveStatus.textContent = 'Guardado correctamente.';
        setTimeout(() => { saveStatus.textContent = 'Listo para editar.'; }, 2000);
    } catch (error) {
        saveStatus.textContent = 'Error al guardar: ' + error.message;
    }
}

async function loadConfig() {
    try {
        const response = await fetch(CONFIG_ENDPOINT);
        if (!response.ok) throw new Error('Error al cargar');
        
        const config = await response.json();
        console.log('Loaded config - layout:', config.layout);
        console.log('Loaded config - branding:', config.branding);
        configState = config;
        
        if (config.presentations) {
            Object.keys(config.presentations).forEach(key => {
                if (presentationState[key]) {
                    presentationState[key] = normalizePresentationConfig(key, config.presentations[key]);
                }
            });
        }
        
        populateFields();
    } catch (error) {
        console.error('Error cargando config:', error);
        saveStatus.textContent = 'Error al cargar configuración.';
    }
}

form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveConfig();
});

presentationKeyField?.addEventListener('change', () => {
    populatePresentationFields();
    applySharedPreview();
});

form?.querySelectorAll('input, select').forEach(field => {
    field.addEventListener('change', (e) => {
        console.log('[Config] Field changed:', e.target.name, 'value:', e.target.value);
        syncPresentationStateFromInputs();
        applySharedPreview();
    });
});

if (logoDropzone && logoUploadField) {
    logoDropzone.addEventListener('click', () => logoUploadField.click());
    logoUploadField.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                logoUrlField.value = ev.target.result;
                logoDropzone.textContent = file.name;
                applySharedPreview();
            };
            reader.readAsDataURL(file);
        }
    });
}

if (presentationLogoDropzone && presentationLogoUploadField) {
    presentationLogoDropzone.addEventListener('click', () => presentationLogoUploadField.click());
    presentationLogoUploadField.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                presentationBrandLogoUrl.value = ev.target.result;
                presentationLogoDropzone.textContent = file.name;
                applySharedPreview();
            };
            reader.readAsDataURL(file);
        }
    });
}

document.querySelectorAll('[data-icon-dropzone]').forEach(dropzone => {
    const iconKey = dropzone.dataset.iconDropzone;
    const uploadInput = document.querySelector(`[data-icon-upload="${iconKey}"]`);
    
    dropzone.addEventListener('click', () => uploadInput?.click());
    
    if (uploadInput) {
        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const input = form?.querySelector(`[name="${iconKey}"]`);
                    if (input) input.value = ev.target.result;
                    applyIconPreviews();
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

loadConfig();

