const CONFIG_ENDPOINT = '/api/config/shell';
const GENERAL_CONFIG_ENDPOINT = '/api/config/general';
const SOCIOS_ENDPOINT = '/api/socios';
const PRESENTATION_KEY = 'socios';

const prevSocioButton = document.getElementById('prevSocioButton');
const nextSocioButton = document.getElementById('nextSocioButton');
const contactsTableBody = document.getElementById('contactsTableBody');
const addressesTableBody = document.getElementById('addressesTableBody');
const contactMapFrame = document.getElementById('contactMapFrame');
const contactMapLink = document.getElementById('contactMapLink');
const contactMapSummary = document.getElementById('contactMapSummary');
const socioTabButtons = [...document.querySelectorAll('[data-socio-tab]')];
const socioTabPanels = [...document.querySelectorAll('[data-socio-panel]')];

let loadedConfig = null;
let sociosList = [];
let currentSocioCode = '';

const fields = {
  partnerCode: document.getElementById('partnerCode'),
  partnerNameHero: document.getElementById('partnerNameHero'),
  salesperson: document.getElementById('salesperson'),
  currencyCode: document.getElementById('currencyCode'),
  paymentTerms: document.getElementById('paymentTerms'),
  taxId: document.getElementById('taxId'),
  invoiceEmail: document.getElementById('invoiceEmail'),
  generalEmail: document.getElementById('generalEmail'),
  sector: document.getElementById('sector'),
  subSector: document.getElementById('subSector'),
  taxExempt: document.getElementById('taxExempt'),
  creationDate: document.getElementById('creationDate'),
  contactFirstName: document.getElementById('contactFirstName'),
  contactLastName: document.getElementById('contactLastName'),
  contactId: document.getElementById('contactId'),
  contactMobile: document.getElementById('contactMobile'),
  contactEmail: document.getElementById('contactEmail'),
  contactFax: document.getElementById('contactFax'),
  contactPhone: document.getElementById('contactPhone'),
  contactLegalRepresentative: document.getElementById('contactLegalRepresentative'),
  contactCountry: document.getElementById('contactCountry'),
  contactState: document.getElementById('contactState'),
  contactCounty: document.getElementById('contactCounty'),
  contactAddress: document.getElementById('contactAddress'),
  manejoExcedentes: document.getElementById('manejoExcedentes'),
  allowedPercentage: document.getElementById('allowedPercentage'),
  manejoAdelantos: document.getElementById('manejoAdelantos'),
  adelantosPorcentaje: document.getElementById('adelantosPorcentaje'),
  tipoSocio: document.getElementById('tipoSocio'),
  manejoFaltantes: document.getElementById('manejoFaltantes'),
  faltantesPorcentaje: document.getElementById('faltantesPorcentaje'),
  entregaMuestras: document.getElementById('entregaMuestras'),
  entregaVB: document.getElementById('entregaVB'),
  contactoVB: document.getElementById('contactoVB'),
  contactoVBTelefono: document.getElementById('contactoVBTelefono'),
  contactoVBCorreo: document.getElementById('contactoVBCorreo'),
  entregaProducto: document.getElementById('entregaProducto'),
  contactoProducto: document.getElementById('contactoProducto'),
  contactoProductoTelefono: document.getElementById('contactoProductoTelefono'),
  contactoProductoCorreo: document.getElementById('contactoProductoCorreo'),
  indicacionesVB: document.getElementById('indicacionesVB'),
  indicacionesProducto: document.getElementById('indicacionesProducto'),
  indicacionesEntrega: document.getElementById('indicacionesEntrega'),
  requiereCartilla: document.getElementById('requiereCartilla'),
  requiereCertificado: document.getElementById('requiereCertificado'),
  usarCartilla: document.getElementById('usarCartilla'),
  unidadDefecto: document.getElementById('unidadDefecto')
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isImageValue(value) {
  const source = String(value || '').trim().toLowerCase();
  return source.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)(\?|#|$)/i.test(source);
}

function isSvgValue(value) {
  const source = String(value || '').trim().toLowerCase();
  return source.startsWith('data:image/svg+xml') || /\.svg(\?|#|$)/i.test(source);
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

function pxSize(value, fallback = 20) {
  const size = Number(value);
  return Number.isFinite(size) && size > 0 ? size : fallback;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function setValue(key, value) {
  if (!fields[key]) return;
  if (fields[key].type === 'checkbox') {
    const normalized = String(value || '').trim().toLowerCase();
    fields[key].checked = value === true || normalized === 'sí' || normalized === 'si' || normalized === 'true' || normalized === '1' || normalized === 'yes';
    return;
  }
  if (fields[key].tagName === 'SELECT') {
    setSelectedValue(fields[key], value);
    return;
  }
  fields[key].value = value || '';
}

function booleanText(value) {
  if (value === true) return 'Sí';
  if (value === false) return 'No';
  if (value === 'SI' || value === 'Sí' || value === 'Si') return 'Sí';
  if (value === 'NO' || value === 'No') return 'No';
  return value || '';
}

function firstFilled(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function isTruthyFlag(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return value === true || ['sí', 'si', 'true', '1', 'yes', 'y'].includes(normalized);
}

function parseJsonStringArray(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string' && item.trim() !== '');
    }
  } catch (e) {}
  return [];
}

function populateSelect(selectElement, options, selectedValue) {
  if (!selectElement) return;
  const currentValue = selectedValue || '';
  selectElement.innerHTML = '<option value=""></option>' + options.map(opt => 
    `<option value="${opt.replace(/"/g, '&quot;')}"${opt === currentValue ? ' selected' : ''}>${opt}</option>`
  ).join('');
}

function legalRepresentativeFlag(contact = {}) {
  const raw = contact.raw_data || {};
  return isTruthyFlag(firstFilled(
    contact.is_legal_representative,
    raw.is_legal_representative,
    raw.representante_legal,
    raw['REPRESENTANTE LEGAL'],
    raw['Representante Legal'],
    raw.U_RepresentanteLegal,
    raw.U_REPRESENTANTE_LEGAL
  ));
}

function findContactByName(contacts = [], name = '') {
  const target = String(name || '').trim().toLowerCase();
  if (!target) return null;
  return contacts.find((contact) => {
    const names = [
      contact.contact_name,
      [contact.first_name, contact.last_name].filter(Boolean).join(' ')
    ].map((item) => String(item || '').trim().toLowerCase());
    return names.includes(target);
  }) || null;
}

function buildContactAddress(contact) {
  const raw = contact?.raw_data || {};
  return raw.ADDRESS || '';
}

function parseCoordinate(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function pickCoordinate(source = {}) {
  const candidates = [
    source.latitude,
    source.lat,
    source.LATITUDE,
    source.LAT,
    source.Longitude,
    source.Latitude
  ];
  for (const candidate of candidates) {
    const parsed = parseCoordinate(candidate);
    if (parsed !== null) return parsed;
  }
  return null;
}

function pickLongitude(source = {}) {
  const candidates = [
    source.longitude,
    source.lng,
    source.lon,
    source.LONGITUDE,
    source.LNG,
    source.LON,
    source.Longitude
  ];
  for (const candidate of candidates) {
    const parsed = parseCoordinate(candidate);
    if (parsed !== null) return parsed;
  }
  return null;
}

function updateContactMap({ partnerName = '', address = '', county = '', state = '', country = '', lat = null, lng = null } = {}) {
  const parts = [partnerName, address, county, state, country].map((item) => String(item || '').trim()).filter(Boolean);
  const query = parts.join(', ');
  const hasCoords = lat !== null && lng !== null;

  if (hasCoords) {
    const coordQuery = `loc:${lat},${lng}`;
    contactMapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(coordQuery)}&z=16&output=embed`;
    contactMapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordQuery)}`;
    contactMapSummary.textContent = query ? `Punto de referencia encontrado para: ${query}` : `Punto de referencia encontrado por coordenadas.`;
    return;
  }

  if (query) {
    contactMapFrame.src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
    contactMapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    contactMapSummary.textContent = `Búsqueda automática por nombre y dirección: ${query}`;
    return;
  }

  contactMapFrame.src = 'about:blank';
  contactMapLink.href = 'https://maps.google.com/';
  contactMapSummary.textContent = 'No hay suficiente información de dirección para ubicar este socio en el mapa.';
}

function renderContacts(contacts) {
  if (!contacts.length) {
    contactsTableBody.innerHTML = '<tr><td colspan="7">Sin contactos asociados.</td></tr>';
    return;
  }
  contactsTableBody.innerHTML = contacts.map((contact) => `
    <tr>
      <td>${escapeHtml(contact.contact_name || [contact.first_name, contact.last_name].filter(Boolean).join(' '))}</td>
      <td>${escapeHtml(contact.position)}</td>
      <td>${escapeHtml(contact.email)}</td>
      <td>${escapeHtml(contact.phone)}</td>
      <td>${escapeHtml(contact.mobile)}</td>
      <td><span class="socios-table-check"><input type="checkbox" disabled${legalRepresentativeFlag(contact) ? ' checked' : ''}></span></td>
      <td>${escapeHtml(contact.state_province)}</td>
    </tr>
  `).join('');
}

function renderAddresses(addresses) {
  if (!addresses.length) {
    addressesTableBody.innerHTML = '<tr><td colspan="6">Sin direcciones asociadas.</td></tr>';
    return;
  }
  addressesTableBody.innerHTML = addresses.map((address) => `
    <tr>
      <td>${escapeHtml(address.address_name)}</td>
      <td>${escapeHtml(address.address_type)}</td>
      <td>${escapeHtml(address.country)}</td>
      <td>${escapeHtml(address.state_province)}</td>
      <td>${escapeHtml(address.county)}</td>
      <td>${escapeHtml(address.address_line)}</td>
    </tr>
  `).join('');
}

function getCurrentIndex() {
  return sociosList.findIndex((item) => item.partner_code === currentSocioCode);
}

function updateSocioNavigation() {
  if (!prevSocioButton || !nextSocioButton) return;
  const index = getCurrentIndex();
  prevSocioButton.disabled = index <= 0;
  nextSocioButton.disabled = index < 0 || index >= sociosList.length - 1;
}

function activateSocioTab(tabKey = 'cliente') {
  const key = String(tabKey || 'cliente').trim() || 'cliente';
  socioTabButtons.forEach((button) => {
    const active = button.dataset.socioTab === key;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  socioTabPanels.forEach((panel) => {
    const active = panel.dataset.socioPanel === key;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
}

function styleNavButton(button, iconValue, palette) {
  if (!button) return;
  button.innerHTML = iconMarkup(iconValue, button.getAttribute('aria-label') || '', 'table-icon-media');
  button.style.color = palette.primary;
  button.style.setProperty('--icon-hover-color', palette.hover);
  button.style.setProperty('--config-icon-size', `${palette.size}px`);
  button.style.width = `${Math.max(32, palette.size + 10)}px`;
  button.style.height = `${Math.max(32, palette.size + 10)}px`;
}

function applyConfig(config) {
  loadedConfig = config || {};
  const presentation = loadedConfig.presentations?.[PRESENTATION_KEY] || {};
  const general = loadedConfig.general || {};
  const layout = loadedConfig.layout || {};
  const root = document.documentElement;
  root.style.setProperty('--tab-color', presentation.tabColor || general.tabColor || '#7f7f7f');
  root.style.setProperty('--field-font-family', presentation.fieldFontFamily || general.fieldFontFamily || loadedConfig.appearance?.fontFamily || 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif');

  const prevPalette = {
    primary: general.iconColorQuotePrev || '#9ba2ab',
    hover: general.iconColorHoverQuotePrev || '#0b81b8',
    size: pxSize(general.iconSizeQuotePrev, Number(presentation.iconSize) || Number(general.iconSize) || Number(layout.iconSize) || 20)
  };
  const nextPalette = {
    primary: general.iconColorQuoteNext || '#9ba2ab',
    hover: general.iconColorHoverQuoteNext || '#0b81b8',
    size: pxSize(general.iconSizeQuoteNext, Number(presentation.iconSize) || Number(general.iconSize) || Number(layout.iconSize) || 20)
  };
  styleNavButton(prevSocioButton, loadedConfig.icons?.quotePrev || '‹', prevPalette);
  styleNavButton(nextSocioButton, loadedConfig.icons?.quoteNext || '›', nextPalette);
}

let generalConfig = null;

async function loadConfig() {
  const response = await fetch(CONFIG_ENDPOINT);
  if (!response.ok) throw new Error('No se pudo cargar la configuración.');
  applyConfig(await response.json());
}

async function loadGeneralConfig() {
  try {
    const response = await fetch(GENERAL_CONFIG_ENDPOINT);
    if (!response.ok) return;
    const config = await response.json();
    generalConfig = config?.general || config || {};
    populateHandlingSelects();
    populateDeliverySelects();
  } catch (e) {
    console.error('Error loading general config:', e);
  }
}

function populateHandlingSelects() {
  if (!generalConfig) return;
  const excessOptions = parseJsonStringArray(generalConfig.handlingExcessOptionsJson);
  const advanceOptions = parseJsonStringArray(generalConfig.handlingAdvanceOptionsJson);
  const shortageOptions = parseJsonStringArray(generalConfig.handlingShortageOptionsJson);
  populateSelect(fields.manejoExcedentes, excessOptions);
  populateSelect(fields.manejoAdelantos, advanceOptions);
  populateSelect(fields.manejoFaltantes, shortageOptions);
}

function populateDeliverySelects() {
  if (!generalConfig) return;
  const sampleModes = parseJsonStringArray(generalConfig.deliverySampleModesJson);
  const approvalRecipients = parseJsonStringArray(generalConfig.deliveryApprovalRecipientsJson);
  const deliveryMethods = parseJsonStringArray(generalConfig.deliveryMethodsJson);
  populateSelect(fields.entregaMuestras, sampleModes);
  populateSelect(fields.contactoVB, approvalRecipients);
  populateSelect(fields.contactoProducto, deliveryMethods);
}

function setSelectedValue(selectElement, value) {
  if (!selectElement || selectElement.tagName !== 'SELECT') return;
  const options = [...selectElement.options];
  const target = String(value || '').trim();
  const match = options.find(opt => opt.value === target);
  selectElement.value = match ? target : '';
}

async function loadSociosList() {
  const response = await fetch('/api/socios?limit=200');
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el listado de socios.');
  sociosList = payload.socios || [];
  updateSocioNavigation();
}

async function loadSocio(code, pushState = true) {
  const response = await fetch(`${SOCIOS_ENDPOINT}/${encodeURIComponent(code)}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'No se pudo cargar el socio.');

  const socio = payload.socio || {};
  const contacts = payload.contactos || [];
  const addresses = payload.direcciones || [];
  const raw = socio.raw_data?.socio || {};
  const mainContact = contacts[0] || {};
  const mainAddress = addresses[0] || {};
  const mainContactRaw = mainContact.raw_data || {};
  const mainAddressRaw = mainAddress.raw_data || {};

  currentSocioCode = socio.partner_code || code;
  fields.partnerCode.textContent = socio.partner_code || '-';
  fields.partnerNameHero.textContent = socio.partner_name || '-';
  setValue('salesperson', socio.salesperson_name || raw['Vendedor Asignado']);
  setValue('currencyCode', raw.GROUPCODE_NOMBRE || socio.currency_code);
  setValue('paymentTerms', raw['RANGO CREDITO'] || socio.payment_terms);
  setValue('taxId', socio.tax_id);
  setValue('invoiceEmail', socio.email_facturacion || raw['Correo Facturacion 1']);
  setValue('generalEmail', socio.email || raw.EmailAddress);
  setValue('sector', socio.sector || raw['Sector Comercial']);
  setValue('subSector', socio.sub_sector || raw['Nicho Comercial']);
  setValue('taxExempt', firstFilled(raw['CLIENTE EXENTO MOSTRAR'], raw['CLIENTE EXCENTO MOSTRAR'], raw['CLIENTE EXENTO'], socio.is_tax_exempt));
  setValue('creationDate', formatDate(raw['Creacion Fecha'] || socio.creation_date));

  setValue('contactFirstName', mainContact.first_name || raw['CONTACTO NOMBRE']);
  setValue('contactLastName', mainContact.last_name || raw['CONTACTO APELLIDO']);
  setValue('contactId', mainContact.raw_data?.IDENTIFICACION || raw['CONTACTO IDENTIFICACION']);
  setValue('contactMobile', mainContact.mobile);
  setValue('contactEmail', mainContact.email);
  setValue('contactFax', mainContact.fax);
  setValue('contactPhone', mainContact.phone || raw.PHONE1);
  setValue('contactLegalRepresentative', legalRepresentativeFlag(mainContact));
  setValue('contactCountry', mainContact.country || raw['Country Name']);
  setValue('contactState', mainContact.state_province || raw['STATE NAME']);
  setValue('contactCounty', mainContact.county || raw['CONTACTO CANTON']);
  setValue('contactAddress', buildContactAddress(mainContact) || raw.STREET);

  setValue('manejoExcedentes', raw['MANEJO EXCEDENTES']);
  setValue('allowedPercentage', raw['MANEJO EXCEDENTES | PORCENTAJE'] || socio.allowed_percentage);
  setValue('manejoAdelantos', raw['MANEJO ADELANTOS']);
  setValue('manejoFaltantes', raw['MANEJO FALTANTES']);
  setValue('faltantesPorcentaje', raw['MANEJO FALTANTES | PORCENTAJE']);
  setValue('entregaMuestras', raw['FORMA ENTREGA | MUESTRAS']);
  setValue('entregaVB', raw['FORMA ENTREGA | VB']);
  setValue('contactoVB', raw['FORMA ENTREGA | CONTACTO VB']);
  setValue('entregaProducto', raw['FORMA ENTREGA | PRODUCTO']);
  setValue('contactoProducto', raw['FORMA ENTREGA | CONTACTO PRODUCTO']);
  setValue('indicacionesEntrega', raw['FORMA ENTREGA | INDICACIONES']);
  const vbContact = findContactByName(contacts, raw['FORMA ENTREGA | CONTACTO VB']);
  const productContact = findContactByName(contacts, raw['FORMA ENTREGA | CONTACTO PRODUCTO']);
  setValue('contactoVBTelefono', firstFilled(vbContact?.phone, vbContact?.mobile));
  setValue('contactoVBCorreo', vbContact?.email);
  setValue('contactoProductoTelefono', firstFilled(productContact?.phone, productContact?.mobile));
  setValue('contactoProductoCorreo', productContact?.email);
  setValue('indicacionesVB', firstFilled(raw['FORMA ENTREGA | INDICACIONES VB'], raw['FORMA ENTREGA | INDICACIONES VISTO BUENO']));
  setValue('indicacionesProducto', firstFilled(raw['FORMA ENTREGA | INDICACIONES PRODUCTO'], raw['FORMA ENTREGA | INDICACIONES PRODUCTO FINAL']));

  setValue('requiereCartilla', raw['CALIDAD | REQUIERE CARTILLA COLOR | CHECK']);
  setValue('requiereCertificado', raw['CALIDAD | REQUIERE CERTIFICADO CALIDAD | CHECK']);
  setValue('usarCartilla', raw['CALIDAD | USAR CARTILLA COLOR | CHECK']);
  setValue('unidadDefecto', raw['UNIDAD POR DEFECTO']);

  renderContacts(contacts);
  renderAddresses(addresses);
  updateContactMap({
    partnerName: socio.partner_name || '',
    address: buildContactAddress(mainContact) || mainAddress.address_line || raw.STREET || '',
    county: mainContact.county || mainAddress.county || raw['CONTACTO CANTON'] || '',
    state: mainContact.state_province || mainAddress.state_province || raw['STATE NAME'] || '',
    country: mainContact.country || mainAddress.country || raw['Country Name'] || '',
    lat: pickCoordinate(mainContactRaw) ?? pickCoordinate(mainAddressRaw) ?? pickCoordinate(raw),
    lng: pickLongitude(mainContactRaw) ?? pickLongitude(mainAddressRaw) ?? pickLongitude(raw)
  });
  updateSocioNavigation();

  if (pushState) {
    const url = new URL(window.location.href);
    url.searchParams.set('codigo', currentSocioCode);
    window.history.replaceState({}, '', url);
  }
}

function moveSocio(step) {
  const index = getCurrentIndex();
  const nextIndex = index + step;
  if (nextIndex < 0 || nextIndex >= sociosList.length) return;
  loadSocio(sociosList[nextIndex].partner_code).catch(console.error);
}

prevSocioButton?.addEventListener('click', () => moveSocio(-1));
nextSocioButton?.addEventListener('click', () => moveSocio(1));
socioTabButtons.forEach((button) => {
  button.addEventListener('click', () => activateSocioTab(button.dataset.socioTab || 'cliente'));
});

async function init() {
  const codigo = new URLSearchParams(window.location.search).get('codigo');
  if (!codigo) throw new Error('No se indicó el código del socio.');
  await loadConfig();
  await loadGeneralConfig();
  await loadSociosList();
  await loadSocio(codigo, false);
  activateSocioTab('cliente');
}

init().catch((error) => {
  console.error(error);
});
