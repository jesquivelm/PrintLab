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
let mapInstance = null;
let currentSocioContacts = [];

const fields = {
  partnerCode: document.getElementById('partnerCode'),
  partnerNameHero: document.getElementById('partnerNameHero'),
  salesperson: document.getElementById('salesperson'),
  salespersonSap: document.getElementById('salespersonSap'),
  currencyCode: document.getElementById('currencyCode'),
  paymentTerms: document.getElementById('paymentTerms'),
  taxId: document.getElementById('taxId'),
  sapCardCode: document.getElementById('sapCardCode'),
  invoiceEmail: document.getElementById('invoiceEmail'),
  generalEmail: document.getElementById('generalEmail'),
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
  tipoIdentificacion: document.getElementById('tipoIdentificacion'),
  nombreComercial: document.getElementById('nombreComercial'),
  estadoActivo: document.getElementById('estadoActivo'),
  contactIdentificationType: document.getElementById('contactIdentificationType'),
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
  usarCartilla: document.getElementById('usarCartilla')
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const sociosAddContactButton = document.getElementById('sociosAddContactButton');
const sociosAddAddressButton = document.getElementById('sociosAddAddressButton');

let salespeopleByFullName = {};
let currentSalespersonCodes = { userCode: '', sapCode: '' };
let mainContactId = null;
let mainAddressId = null;

async function loadSalespeople() {
  try {
    const [permRes, usersRes] = await Promise.all([
      fetch('/api/admin-permissions'),
      fetch('/api/admin-users')
    ]);
    if (!permRes.ok || !usersRes.ok) return;
    const permissions = await permRes.json();
    const vendorPermissionIds = new Set(
      (Array.isArray(permissions) ? permissions : [])
        .filter((p) => p.showInVendorList === true)
        .map((p) => p.id)
    );
    const users = await usersRes.json();
    const vendors = (Array.isArray(users) ? users : [])
      .filter((user) => user.active !== false && vendorPermissionIds.has(user.permissionId));
    salespeopleByFullName = {};
    const options = vendors.map((user) => {
      const label = user.name || user.username || '';
      salespeopleByFullName[label] = {
        username: user.username || '',
        sapCode: user.sapSalespersonCode != null ? String(user.sapSalespersonCode) : ''
      };
      return `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
    });
    fields.salesperson.innerHTML = '<option value=""></option>' + options.join('');
  } catch (e) {
    console.error('Error cargando vendedores:', e);
  }
}

function getSocioIconHtml(iconKey, fallbackText, fallbackColor, fallbackSize) {
  const config = loadedConfig || {};
  const value = config.icons?.[iconKey] || fallbackText;
  const suffix = String(iconKey || '').split(/[.\s_-]+/).filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  const color = config.general?.[`iconColor${suffix}`] || fallbackColor;
  const size = Number(config.general?.[`iconSize${suffix}`]) || fallbackSize;
  if (value && String(value).startsWith('data:image/svg')) {
    return `<img src="${escapeHtml(value)}" style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;" alt="">`;
  }
  if (value && String(value).startsWith('data:image')) {
    return `<img src="${escapeHtml(value)}" style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;">`;
  }
  if (value && /^\/|https?:\/\//i.test(String(value))) {
    return `<img src="${escapeHtml(value)}" style="width:${size}px;height:${size}px;vertical-align:middle;object-fit:contain;">`;
  }
  return `<span style="color:${color};font-size:${size}px;vertical-align:middle;display:inline-block;line-height:1;font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif;">${escapeHtml(value)}&#xFE0F;</span>`;
}

function renderSocioTableButtons() {
  const addHtml = getSocioIconHtml('proformaCurrencyAdd', '+', '#738196', 20);
  if (sociosAddContactButton) sociosAddContactButton.innerHTML = addHtml;
  if (sociosAddAddressButton) sociosAddAddressButton.innerHTML = addHtml;
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

function syncPercentDisplayMask(key, displayId) {
  const input = fields[key];
  const mask = document.getElementById(displayId);
  if (!input || !mask) return;
  const numeric = Number(input.value);
  mask.textContent = (input.value !== '' && Number.isFinite(numeric)) ? `${numeric.toFixed(2)} %` : '';
}

function syncAllPercentDisplayMasks() {
  syncPercentDisplayMask('allowedPercentage', 'allowedPercentageDisplay');
  syncPercentDisplayMask('adelantosPorcentaje', 'adelantosPorcentajeDisplay');
  syncPercentDisplayMask('faltantesPorcentaje', 'faltantesPorcentajeDisplay');
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

function getValue(key) {
  if (!fields[key]) return null;
  if (fields[key].type === 'checkbox') {
    return fields[key].checked;
  }
  if (fields[key].tagName === 'SELECT') {
    return fields[key].value;
  }
  return fields[key].value;
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

function parseConfigJsonObjects(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
  } catch (e) {
    return [];
  }
}

// ── Catálogo geográfico por país (tabla divisiones_geograficas) ──────────
// La cascada y las etiquetas las maneja direccion-pais.js; aquí solo se
// inicializan los bloques y se cargan las opciones al abrir la pantalla.
let geoPaises = [];
async function cargarPaisesGeo() {
  if (geoPaises.length) return geoPaises;
  try {
    const respuesta = await fetch('/api/geografia/paises');
    if (!respuesta.ok) return [];
    const datos = await respuesta.json();
    geoPaises = (datos.paises || []).filter((p) => p.cargado);
  } catch (e) { geoPaises = []; }
  return geoPaises;
}
async function cargarDivisiones(codigoPais, idPadre) {
  if (!codigoPais) return [];
  try {
    const url = idPadre
      ? `/api/geografia/${encodeURIComponent(codigoPais)}/hijos/${encodeURIComponent(idPadre)}`
      : `/api/geografia/${encodeURIComponent(codigoPais)}/primer-nivel`;
    const respuesta = await fetch(url);
    if (!respuesta.ok) return [];
    const datos = await respuesta.json();
    return datos.divisiones || [];
  } catch (e) { return []; }
}
function llenarDivisionesSelect(select, divisiones, nombreSeleccionado) {
  if (!select) return;
  const actual = nombreSeleccionado != null ? nombreSeleccionado : select.value;
  select.innerHTML = '<option value=""></option>' + divisiones.map((d) =>
    `<option value="${escapeHtml(d.nombre)}" data-id-origen="${escapeHtml(d.id_origen)}"${d.nombre === actual ? ' selected' : ''}>${escapeHtml(d.nombre)}</option>`
  ).join('');
  select.value = actual && divisiones.some((d) => d.nombre === actual) ? actual : '';
}
function idOrigenSeleccionado(select) {
  if (!select || !select.value) return '';
  return select.selectedOptions[0]?.dataset?.idOrigen || '';
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

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  if (!hasCoords && !query) {
    contactMapLink.href = 'https://maps.google.com/';
    contactMapSummary.textContent = 'No hay suficiente información de dirección para ubicar este socio en el mapa.';
    return;
  }

  const center = hasCoords ? [lat, lng] : [10, -84];
  const zoom = hasCoords ? 15 : 6;

  mapInstance = L.map('contactMapFrame', {
    center,
    zoom,
    zoomControl: true,
    scrollWheelZoom: true,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(mapInstance);

  if (hasCoords) {
    L.marker([lat, lng]).addTo(mapInstance)
      .bindPopup(query || 'Ubicación del socio');
    contactMapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || `${lat},${lng}`)}`;
    contactMapSummary.textContent = query ? `Punto de referencia encontrado para: ${query}` : 'Punto de referencia encontrado por coordenadas.';
  } else {
    contactMapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    contactMapSummary.textContent = `Búsqueda automática por nombre y dirección: ${query}`;
  }

  requestAnimationFrame(() => {
    mapInstance?.invalidateSize();
  });
}

function contactRowHtml(contact, isMain) {
  const id = contact.id;
  const deleteIconHtml = getSocioIconHtml('proformaCurrencyDelete', '\uD83D\uDDD1', '#b94848', 18);
  return `
    <tr data-contact-id="${escapeHtml(String(id))}">
      <td><input class="socios-cell-input" data-contact-field="contactName" value="${escapeHtml(contact.contact_name || '')}"></td>
      <td><input class="socios-cell-input" data-contact-field="position" value="${escapeHtml(contact.position || '')}"></td>
      <td><input class="socios-cell-input" data-contact-field="email" value="${escapeHtml(contact.email || '')}"></td>
      <td><input class="socios-cell-input" data-contact-field="phone" value="${escapeHtml(contact.phone || '')}"></td>
      <td><input class="socios-cell-input" data-contact-field="mobile" value="${escapeHtml(contact.mobile || '')}"></td>
      <td><label class="costs-process-default-check socios-cell-check" aria-label="Rep. Legal"><input type="checkbox" data-contact-field="isLegalRepresentative"${legalRepresentativeFlag(contact) ? ' checked' : ''}></label></td>
      <td class="socios-actions-cell">${isMain ? '' : `<button type="button" class="socios-row-remove" data-contact-remove="${escapeHtml(String(id))}" aria-label="Eliminar contacto" title="Eliminar">${deleteIconHtml}</button>`}</td>
    </tr>`;
}

function renderContacts(contacts) {
  clearRowSaves();
  if (!contacts.length) {
    contactsTableBody.innerHTML = '<tr><td colspan="7">Sin contactos asociados.</td></tr>';
    return;
  }
  mainContactId = contacts[0]?.id ?? null;
  contactsTableBody.innerHTML = contacts.map((contact, index) =>
    contactRowHtml(contact, mainContactId != null ? String(contact.id) === String(mainContactId) : index === 0)
  ).join('');
}

function addContactRow() {
  const id = `nuevo-${Date.now()}`;
  const row = document.createElement('tr');
  row.dataset.contactId = id;
  row.innerHTML = contactRowHtml({ id, contact_name: '', position: '', email: '', phone: '', mobile: '', is_legal_representative: false, state_province: '' }, false);
  contactsTableBody.appendChild(row);
  row.querySelector('input[data-contact-field="contactName"]')?.focus();
}

function readContactRow(row) {
  const fieldsList = ['contactName', 'position', 'email', 'phone', 'mobile'];
  const payload = {};
  fieldsList.forEach((key) => {
    payload[key] = row.querySelector(`[data-contact-field="${key}"]`)?.value || '';
  });
  const check = row.querySelector('[data-contact-field="isLegalRepresentative"]');
  payload.isLegalRepresentative = check ? check.checked : false;
  return payload;
}

function saveContactRow(row) {
  const id = String(row.dataset.contactId || '').trim();
  if (!id || !currentSocioCode) return;
  const isNew = id.startsWith('nuevo-');
  const payload = readContactRow(row);
  const url = isNew
    ? `${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}/contactos`
    : `${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}/contactos/${encodeURIComponent(id)}`;
  fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    })
    .then((result) => {
      if (isNew && result.contacto?.id) {
        row.dataset.contactId = String(result.contacto.id);
      }
    })
    .catch((error) => console.error('Error guardando contacto:', error));
}

function deleteContactRow(id) {
  if (!currentSocioCode) return;
  if (!window.confirm('¿Eliminar este contacto del socio?')) return;
  fetch(`${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}/contactos/${encodeURIComponent(id)}`, { method: 'DELETE' })
    .then(async (response) => {
      if (!response.ok) {
        let message = 'No fue posible eliminar el contacto.';
        try {
          const errorPayload = await response.json();
          message = errorPayload?.error || message;
        } catch (e) {}
        throw new Error(message);
      }
      document.querySelector(`tr[data-contact-id="${CSS.escape(id)}"]`)?.remove();
    })
    .catch((error) => window.alert(error.message || 'No fue posible eliminar el contacto.'));
}

function addressRowHtml(address, isMain) {
  const id = address.id;
  const deleteIconHtml = getSocioIconHtml('proformaCurrencyDelete', '\uD83D\uDDD1', '#b94848', 18);
  // País de la fila: si la dirección no trae país se asume Guatemala (catálogo por defecto).
  const nombrePaisFila = normalizarNombrePais(address.country || 'Guatemala');
  const codigoPaisFila = codigoPaisPorNombre(nombrePaisFila);
  return `
    <tr data-address-id="${escapeHtml(String(id))}" data-pais="${escapeHtml(nombrePaisFila)}">
      <td><input class="socios-cell-input" data-address-field="addressName" value="${escapeHtml(address.address_name || '')}"></td>
      <td><input class="socios-cell-input" data-address-field="addressType" value="${escapeHtml(address.address_type || '')}"></td>
      <td><select class="socios-cell-input" data-address-field="country">${opcionesPaisesHtml(nombrePaisFila)}</select></td>
      <td><select class="socios-cell-input" data-address-field="stateProvince"></select></td>
      <td><select class="socios-cell-input" data-address-field="district"></select></td>
      <td><input class="socios-cell-input" data-address-field="addressLine" value="${escapeHtml(address.address_line || '')}"></td>
      <td class="socios-actions-cell">${isMain ? '' : `<button type="button" class="socios-row-remove" data-address-remove="${escapeHtml(String(id))}" aria-label="Eliminar dirección" title="Eliminar">${deleteIconHtml}</button>`}</td>
    </tr>`;
}

// Después de pintar las filas, se llena la cascada de cada una (async).
async function hidratarFilasDirecciones() {
  await cargarPaisesGeo();
  for (const fila of addressesTableBody.querySelectorAll('tr[data-address-id]')) {
    await hidratarFilaDireccion(fila);
  }
}
async function hidratarFilaDireccion(fila) {
  const codigoPais = codigoPaisPorNombre(fila.dataset.pais || 'Guatemala');
  const nombreGuardadoN1 = fila.dataset.valorN1 || '';
  const nombreGuardadoN2 = fila.dataset.valorN2 || '';
  fila.dataset.valorN1 = '';
  fila.dataset.valorN2 = '';
  const n1 = fila.querySelector('[data-address-field="stateProvince"]');
  const n2 = fila.querySelector('[data-address-field="district"]');
  if (!codigoPais) { llenarDivisionesSelect(n1, []); llenarDivisionesSelect(n2, []); return; }
  const primerNivel = await cargarDivisiones(codigoPais, null);
  llenarDivisionesSelect(n1, primerNivel, nombreGuardadoN1);
  const idPadre = idOrigenSeleccionado(n1);
  const hijos = idPadre ? await cargarDivisiones(codigoPais, idPadre) : [];
  llenarDivisionesSelect(n2, hijos, nombreGuardadoN2);
  const etiquetaN1 = etiquetaNivelGeo(fila, 'stateProvince');
  const etiquetaN2 = etiquetaNivelGeo(fila, 'district');
  if (etiquetaN1) etiquetaN1.textContent = etiquetasNiveles(codigoPais)[0] || 'Departamento';
  if (etiquetaN2) etiquetaN2.textContent = etiquetasNiveles(codigoPais)[1] || 'Municipio';
}
function etiquetaNivelGeo(fila, campo) {
  const th = fila.closest('table')?.querySelector(`thead th:nth-child(${campo === 'stateProvince' ? 4 : 5})`);
  return th ? th.querySelector('span[data-dir-etiqueta]') : null;
}
function etiquetasNiveles(codigoPais) {
  const pais = geoPaises.find((p) => p.codigo === codigoPais);
  return pais ? pais.niveles.map((n) => n.nombreNivel) : ['Departamento', 'Municipio'];
}
const NOMBRES_PAIS_GEO = [
  { codigo: 'GT', nombre: 'Guatemala', siglas: ['GT'] },
  { codigo: 'SV', nombre: 'El Salvador', siglas: ['SV'] },
  { codigo: 'HN', nombre: 'Honduras', siglas: ['HN'] },
  { codigo: 'BZ', nombre: 'Belice', siglas: ['BZ'] },
  { codigo: 'NI', nombre: 'Nicaragua', siglas: ['NI'] },
  { codigo: 'CR', nombre: 'Costa Rica', siglas: ['CR'] },
  { codigo: 'PA', nombre: 'Panamá', siglas: ['PA'] },
  { codigo: 'MX', nombre: 'México', siglas: ['MX'] }
];
function normalizarNombrePais(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  const porSigla = NOMBRES_PAIS_GEO.find((p) => p.siglas.includes(texto.toUpperCase()));
  return porSigla ? porSigla.nombre : texto;
}
function codigoPaisPorNombre(nombre) {
  const texto = normalizarNombrePais(nombre);
  const pais = NOMBRES_PAIS_GEO.find((p) => p.nombre.toLowerCase() === (texto || '').toLowerCase());
  return pais ? pais.codigo : '';
}
function opcionesPaisesHtml(seleccionado) {
  return NOMBRES_PAIS_GEO.map((p) =>
    `<option value="${escapeHtml(p.nombre)}"${p.nombre === seleccionado ? ' selected' : ''}>${escapeHtml(p.nombre)}</option>`
  ).join('');
}

function renderAddresses(addresses) {
  clearRowSaves();
  if (!addresses.length) {
    addressesTableBody.innerHTML = '<tr><td colspan="7">Sin direcciones asociadas.</td></tr>';
    return;
  }
  mainAddressId = addresses[0]?.id ?? null;
  addressesTableBody.innerHTML = addresses.map((address, index) =>
    addressRowHtml(address, mainAddressId != null ? String(address.id) === String(mainAddressId) : index === 0)
  ).join('');
  // Guardar los valores de la cascada en la fila para hidratarla después.
  const filas = Array.from(addressesTableBody.querySelectorAll('tr[data-address-id]'));
  filas.forEach((fila, indice) => {
    const address = addresses[indice] || {};
    fila.dataset.valorN1 = address.state_province || '';
    fila.dataset.valorN2 = address.district || '';
  });
  hidratarFilasDirecciones();
}

function addAddressRow() {
  const id = `nuevo-${Date.now()}`;
  const row = document.createElement('tr');
  row.dataset.addressId = id;
  row.dataset.pais = 'Guatemala';
  row.innerHTML = addressRowHtml({ id, address_name: '', address_type: '', country: 'Guatemala', state_province: '', district: '', address_line: '' }, false);
  addressesTableBody.appendChild(row);
  hidratarFilaDireccion(row).catch(() => null);
  row.querySelector('input[data-address-field="addressName"]')?.focus();
}

function readAddressRow(row) {
  // El país también se guarda (columna country de business_partner_addresses).
  const fieldsList = ['addressName', 'addressType', 'country', 'stateProvince', 'district', 'addressLine'];
  const payload = {};
  fieldsList.forEach((key) => {
    payload[key] = row.querySelector(`[data-address-field="${key}"]`)?.value || '';
  });
  return payload;
}

function saveAddressRow(row) {
  const chain = rowSaveChains.get(row) || Promise.resolve();
  const next = chain
    .then(() => {
      const id = String(row.dataset.addressId || '').trim();
      if (!id || !currentSocioCode) return;
      const isNew = id.startsWith('nuevo-');
      const payload = readAddressRow(row);
      const url = isNew
        ? `${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}/direcciones`
        : `${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}/direcciones/${encodeURIComponent(id)}`;
      return fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(await response.text());
          return response.json();
        })
        .then((result) => {
          if (isNew && result.direccion?.id) {
            row.dataset.addressId = String(result.direccion.id);
          }
        });
    })
    .catch((error) => console.error('Error guardando dirección:', error));
  rowSaveChains.set(row, next);
  return next;
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
  renderSocioTableButtons();
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
  populateSelect(fields.entregaMuestras, sampleModes);
}

function populateContactosDatalist(contacts) {
  const datalist = document.getElementById('socioContactosDatalist');
  if (!datalist) return;
  datalist.innerHTML = (contacts || [])
    .map((c) => c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' '))
    .filter(Boolean)
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join('');
}

function contactoExisteEnSocio(nombre) {
  const target = String(nombre || '').trim().toLowerCase();
  if (!target) return true;
  return currentSocioContacts.some((c) => {
    const nombreContacto = (c.contact_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '').trim().toLowerCase();
    return nombreContacto === target;
  });
}

async function guardarContactoDigitadoSiHaceFalta(inputElement) {
  if (!currentSocioCode || !inputElement) return;
  const nombre = String(inputElement.value || '').trim();
  if (!nombre || contactoExisteEnSocio(nombre)) return;
  if (!window.confirm(`"${nombre}" no está entre los contactos de este socio. ¿Deseas guardarlo como un nuevo contacto?`)) return;
  try {
    const response = await fetch(`${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}/contactos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactName: nombre })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No fue posible guardar el contacto.');
    currentSocioContacts.push({ id: result.contacto?.id, contact_name: nombre });
    populateContactosDatalist(currentSocioContacts);
  } catch (error) {
    window.alert(error.message || 'No fue posible guardar el contacto.');
  }
}

function setSelectedValue(selectElement, value) {
  if (!selectElement || selectElement.tagName !== 'SELECT') return;
  const options = [...selectElement.options];
  const target = String(value || '').trim();
  const match = options.find(opt => opt.value === target);
  selectElement.value = match ? target : '';
}

function renderSapContacts(contacts) {
  const tbody = document.getElementById('sapContactsBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!contacts.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#6B8CA8;">Sin contactos</td></tr>';
    return;
  }
  for (const c of contacts) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(c.contact_name || c.first_name)}</td>
      <td>${escapeHtml(c.position)}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.phone2)}</td>
      <td>${escapeHtml(c.phone3)}</td>
      <td>${escapeHtml(c.mobile)}</td>
      <td>${escapeHtml(c.fax)}</td>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.website)}</td>
      <td>${escapeHtml(c.notes)}</td>`;
    tbody.appendChild(tr);
  }
}

function renderSapAddresses(addresses) {
  const tbody = document.getElementById('sapAddressesBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!addresses.length) {
    tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;color:#6B8CA8;">Sin direcciones</td></tr>';
    return;
  }
  for (const a of addresses) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(a.address_name)}</td>
      <td>${escapeHtml(a.address_type)}</td>
      <td>${escapeHtml(a.address_line)}</td>
      <td>${escapeHtml(a.block)}</td>
      <td>${escapeHtml(a.city)}</td>
      <td>${escapeHtml(a.county)}</td>
      <td>${escapeHtml(a.country)}</td>
      <td>${escapeHtml(a.state_province)}</td>
      <td>${escapeHtml(a.zip_code)}</td>
      <td>${escapeHtml(a.building)}</td>
      <td>${escapeHtml(a.floor)}</td>
      <td>${escapeHtml(a.room)}</td>
      <td>${escapeHtml(a.street_number)}</td>`;
    tbody.appendChild(tr);
  }
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
  currentSocioContacts = contacts;
  populateContactosDatalist(contacts);
  const addresses = payload.direcciones || [];
  const raw = socio.raw_data?.socio || {};
  const mainContact = contacts[0] || {};
  const mainAddress = addresses[0] || {};
  const mainContactRaw = mainContact.raw_data || {};
  const mainAddressRaw = mainAddress.raw_data || {};

  currentSocioCode = socio.partner_code || code;
  fields.partnerCode.textContent = socio.partner_code || '-';
  fields.partnerNameHero.textContent = socio.partner_name || '-';
  const spName = socio.salesperson_name || raw['Vendedor Asignado'] || '';
  if (spName && ![...fields.salesperson.options].some((option) => option.value === spName)) {
    const legacyOption = document.createElement('option');
    legacyOption.value = spName;
    legacyOption.textContent = spName;
    fields.salesperson.appendChild(legacyOption);
  }
  setValue('salesperson', spName);
  currentSalespersonCodes = {
    userCode: socio.salesperson_user_code || '',
    sapCode: socio.salesperson_sap_code || ''
  };
  const sapVendCode = String(socio.salesperson_sap_code || '').trim();
  const sapVendName = String(socio.salesperson_sap_name || '').trim();
  let sapVendLabel = '';
  if (sapVendCode && sapVendCode !== '-1') {
    sapVendLabel = sapVendName ? `${sapVendCode} — ${sapVendName}` : sapVendCode;
  } else if (sapVendCode === '-1') {
    sapVendLabel = 'Sin asignar en SAP';
  }
  setValue('salespersonSap', sapVendLabel);
  setValue('currencyCode', raw.GROUPCODE_NOMBRE || socio.currency_code);
  setValue('paymentTerms', raw['RANGO CREDITO'] || socio.payment_terms);
  setValue('taxId', socio.tax_id);
  setValue('sapCardCode', socio.sap_card_code);
  setValue('invoiceEmail', socio.email_facturacion || raw['Correo Facturacion 1']);
  setValue('generalEmail', socio.email || raw.EmailAddress);
  setValue('taxExempt', firstFilled(raw['CLIENTE EXENTO MOSTRAR'], raw['CLIENTE EXCENTO MOSTRAR'], raw['CLIENTE EXENTO'], socio.is_tax_exempt));
  setValue('creationDate', formatDate(raw['Creacion Fecha'] || socio.creation_date));

  setValue('tipoSocio', socio.tipo_socio);
  setValue('tipoIdentificacion', socio.tipo_identificacion);
  setValue('nombreComercial', socio.nombre_comercial);
  setValue('estadoActivo', socio.valid_for !== 'N');

  setValue('contactFirstName', mainContact.first_name || raw['CONTACTO NOMBRE']);
  setValue('contactLastName', mainContact.last_name || raw['CONTACTO APELLIDO']);
  setValue('contactId', mainContact.raw_data?.IDENTIFICACION || raw['CONTACTO IDENTIFICACION']);
  setValue('contactIdentificationType', mainContact.identification_type);
  setValue('contactMobile', mainContact.mobile);
  setValue('contactEmail', mainContact.email);
  setValue('contactFax', mainContact.fax);
  setValue('contactPhone', mainContact.phone || raw.PHONE1);
  setValue('contactLegalRepresentative', legalRepresentativeFlag(mainContact));
  const mainContactState = mainContact.state_province || raw['STATE NAME'] || '';
  const mainContactCounty = mainContact.county || raw['CONTACTO CANTON'] || '';
  // Cascada del contacto principal: país → nivel 1 → nivel 2 (según el país).
  const contactoPais = normalizarNombrePais(mainContact.country) || 'Guatemala';
  if (fields.contactCountry) fields.contactCountry.value = contactoPais;
  hidratarCascadaContactoPrincipal(contactoPais, mainContactState, mainContactCounty).catch(() => null);
  setValue('contactAddress', buildContactAddress(mainContact) || raw.STREET);

  setValue('manejoExcedentes', firstFilled(socio.manejo_excedentes, raw['MANEJO EXCEDENTES']));
  setValue('allowedPercentage', firstFilled(socio.allowed_percentage, raw['MANEJO EXCEDENTES | PORCENTAJE']));
  setValue('manejoAdelantos', firstFilled(socio.manejo_adelantos, raw['MANEJO ADELANTOS']));
  setValue('adelantosPorcentaje', socio.porcentaje_adelantos);
  setValue('manejoFaltantes', firstFilled(socio.manejo_faltantes, raw['MANEJO FALTANTES']));
  setValue('faltantesPorcentaje', firstFilled(socio.porcentaje_faltantes, raw['MANEJO FALTANTES | PORCENTAJE']));
  setValue('entregaMuestras', firstFilled(socio.entrega_muestras, raw['FORMA ENTREGA | MUESTRAS']));
  setValue('contactoVB', firstFilled(socio.contacto_vb_tipo, raw['FORMA ENTREGA | CONTACTO VB']));
  setValue('contactoProducto', firstFilled(socio.contacto_producto_tipo, raw['FORMA ENTREGA | CONTACTO PRODUCTO']));
  setValue('indicacionesEntrega', firstFilled(socio.entrega_indicaciones, raw['FORMA ENTREGA | INDICACIONES']));
  const vbContact = socio.contacto_vb_tipo ? null : findContactByName(contacts, raw['FORMA ENTREGA | CONTACTO VB']);
  const productContact = socio.contacto_producto_tipo ? null : findContactByName(contacts, raw['FORMA ENTREGA | CONTACTO PRODUCTO']);
  setValue('contactoVBTelefono', firstFilled(socio.contacto_vb_telefono, vbContact?.phone, vbContact?.mobile));
  setValue('contactoVBCorreo', firstFilled(socio.contacto_vb_correo, vbContact?.email));
  setValue('contactoProductoTelefono', firstFilled(socio.contacto_producto_telefono, productContact?.phone, productContact?.mobile));
  setValue('contactoProductoCorreo', firstFilled(socio.contacto_producto_correo, productContact?.email));
  setValue('indicacionesVB', firstFilled(socio.contacto_vb_detalle, raw['FORMA ENTREGA | INDICACIONES VB'], raw['FORMA ENTREGA | INDICACIONES VISTO BUENO']));
  setValue('indicacionesProducto', firstFilled(socio.contacto_producto_detalle, raw['FORMA ENTREGA | INDICACIONES PRODUCTO'], raw['FORMA ENTREGA | INDICACIONES PRODUCTO FINAL']));

  setValue('requiereCartilla', raw['CALIDAD | REQUIERE CARTILLA COLOR | CHECK']);
  setValue('requiereCertificado', raw['CALIDAD | REQUIERE CERTIFICADO CALIDAD | CHECK']);
  setValue('usarCartilla', raw['CALIDAD | USAR CARTILLA COLOR | CHECK']);

  // SAP Information Tab
  setValue('sapPhone1', socio.phone1);
  setValue('sapPhone2', socio.phone2);
  setValue('sapCellular', socio.cellular);
  setValue('sapFax', socio.fax);
  setValue('sapWebsite', socio.website);
  setValue('sapContactPerson', socio.contact_person);
  setValue('sapNotes', socio.notes);
  setValue('sapVatGroup', socio.vat_group);
  setValue('sapTerritory', socio.territory);
  setValue('sapOwnerCode', socio.owner_code);
  setValue('sapGroupCode', socio.group_code);
  setValue('sapValidFor', socio.valid_for === 'Y' ? 'Sí' : 'No');
  setValue('sapFrozenFor', socio.frozen_for === 'Y' ? 'Sí' : 'No');
  setValue('sapValidFrom', socio.valid_from);
  setValue('sapValidTo', socio.valid_to);
  setValue('sapFrozenFrom', socio.frozen_from);
  setValue('sapFrozenTo', socio.frozen_to);
  setValue('sapBillingAddress', socio.billing_address);
  setValue('sapBillingBlock', socio.billing_block);
  setValue('sapBillingCity', socio.billing_city);
  setValue('sapBillingCounty', socio.billing_county);
  setValue('sapBillingCountry', socio.billing_country);
  setValue('sapBillingState', socio.billing_state);
  setValue('sapBillingZipCode', socio.billing_zip_code);
  setValue('sapBillingBuilding', socio.billing_building);
  setValue('sapBillToDefault', socio.bill_to_default);
  setValue('sapShippingAddress', socio.shipping_address);
  setValue('sapShippingBlock', socio.shipping_block);
  setValue('sapShippingCity', socio.shipping_city);
  setValue('sapShippingCounty', socio.shipping_county);
  setValue('sapShippingCountry', socio.shipping_country);
  setValue('sapShippingState', socio.shipping_state);
  setValue('sapShippingZipCode', socio.shipping_zip_code);
  setValue('sapShippingBuilding', socio.shipping_building);
  setValue('sapShipToDefault', socio.ship_to_default);
  renderSapContacts(contacts);
  renderSapAddresses(addresses);

  syncAllPercentDisplayMasks();
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
  setupAutoSave();
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

sociosAddContactButton?.addEventListener('click', addContactRow);
sociosAddAddressButton?.addEventListener('click', addAddressRow);

fields.contactState?.addEventListener('change', async () => {
  const codigoPais = codigoPaisPorNombre(fields.contactCountry?.value || 'Guatemala');
  llenarDivisionesSelect(fields.contactCounty, await cargarDivisiones(codigoPais, idOrigenSeleccionado(fields.contactState)), '');
});
fields.contactCountry?.addEventListener('change', async () => {
  const codigoPais = codigoPaisPorNombre(fields.contactCountry?.value || '');
  const primerNivel = await cargarDivisiones(codigoPais, null);
  llenarDivisionesSelect(fields.contactState, primerNivel, '');
  llenarDivisionesSelect(fields.contactCounty, [], '');
  actualizarEtiquetasContacto(codigoPais);
  scheduleAutoSave();
});
function actualizarEtiquetasContacto(codigoPais) {
  const etiquetas = etiquetasNiveles(codigoPais);
  const spanN1 = document.querySelector('label:has(#contactState) [data-dir-etiqueta]');
  const spanN2 = document.querySelector('label:has(#contactCounty) [data-dir-etiqueta]');
  if (spanN1) spanN1.textContent = etiquetas[0] || 'Departamento';
  if (spanN2) spanN2.textContent = etiquetas[1] || 'Municipio';
}
async function hidratarCascadaContactoPrincipal(codigoPaisNombre, nombreN1, nombreN2) {
  await cargarPaisesGeo();
  const codigoPais = codigoPaisPorNombre(codigoPaisNombre);
  const primerNivel = await cargarDivisiones(codigoPais, null);
  llenarDivisionesSelect(fields.contactState, primerNivel, nombreN1);
  const hijos = await cargarDivisiones(codigoPais, idOrigenSeleccionado(fields.contactState));
  llenarDivisionesSelect(fields.contactCounty, hijos, nombreN2);
  actualizarEtiquetasContacto(codigoPais);
}

const rowSaveTimeouts = new Map();
const rowSaveChains = new Map();

function clearRowSaves() {
  rowSaveTimeouts.forEach((timeout) => clearTimeout(timeout));
  rowSaveTimeouts.clear();
  rowSaveChains.clear();
}

contactsTableBody?.addEventListener('change', (event) => {
  const row = event.target.closest('tr[data-contact-id]');
  if (!row) return;
  const id = row.dataset.contactId;
  if (rowSaveTimeouts.has(id)) clearTimeout(rowSaveTimeouts.get(id));
  rowSaveTimeouts.set(id, setTimeout(() => saveContactRow(row), 400));
});

contactsTableBody?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-contact-remove]');
  if (button) deleteContactRow(button.dataset.contactRemove);
});

addressesTableBody?.addEventListener('change', (event) => {
  const row = event.target.closest('tr[data-address-id]');
  if (!row) return;
  if (event.target.matches('[data-address-field="country"]')) {
    // Cambió el país: se reconstruye la cascada de la fila desde cero.
    row.dataset.pais = event.target.value;
    row.dataset.valorN1 = '';
    row.dataset.valorN2 = '';
    hidratarFilaDireccion(row).catch(() => null);
  } else if (event.target.matches('[data-address-field="stateProvince"]')) {
    const codigoPais = codigoPaisPorNombre(row.dataset.pais || 'Guatemala');
    const zonaSelect = row.querySelector('[data-address-field="district"]');
    if (zonaSelect) {
      zonaSelect.innerHTML = '<option value=""></option>';
      cargarDivisiones(codigoPais, idOrigenSeleccionado(event.target)).then((divisiones) => {
        llenarDivisionesSelect(zonaSelect, divisiones, '');
      }).catch(() => null);
    }
  }
  const id = row.dataset.addressId;
  if (rowSaveTimeouts.has(id)) clearTimeout(rowSaveTimeouts.get(id));
  rowSaveTimeouts.set(id, setTimeout(() => saveAddressRow(row), 400));
});

addressesTableBody?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-address-remove]');
  if (button) deleteAddressRow(button.dataset.addressRemove);
});

function saveContactRow(row) {
  const chain = rowSaveChains.get(row) || Promise.resolve();
  const next = chain
    .then(() => {
      const id = String(row.dataset.contactId || '').trim();
      if (!id || !currentSocioCode) return;
      const isNew = id.startsWith('nuevo-');
      const payload = readContactRow(row);
      const url = isNew
        ? `${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}/contactos`
        : `${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}/contactos/${encodeURIComponent(id)}`;
      return fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(async (response) => {
          if (!response.ok) throw new Error(await response.text());
          return response.json();
        })
        .then((result) => {
          if (isNew && result.contacto?.id) {
            row.dataset.contactId = String(result.contacto.id);
          }
        });
    })
    .catch((error) => console.error('Error guardando contacto:', error));
  rowSaveChains.set(row, next);
  return next;
}

function buildSavePayload() {
  const vendedorNombre = getValue('salesperson');
  const vendedorAsignado = salespeopleByFullName[vendedorNombre] || {};
  return {
    salesperson: vendedorNombre,
    salespersonUserCode: vendedorAsignado.username || currentSalespersonCodes.userCode || '',
    salespersonSapCode: vendedorAsignado.sapCode || currentSalespersonCodes.sapCode || '',
    activo: getValue('estadoActivo'),
    generalEmail: getValue('generalEmail'),
    taxId: getValue('taxId'),
    sapCardCode: getValue('sapCardCode'),
    invoiceEmail: getValue('invoiceEmail'),
    paymentTerms: getValue('paymentTerms'),
    currencyCode: getValue('currencyCode'),
    taxExempt: getValue('taxExempt'),
    requiereCartilla: getValue('requiereCartilla'),
    requiereCertificado: getValue('requiereCertificado'),
    usarCartilla: getValue('usarCartilla'),
    tipoSocio: getValue('tipoSocio'),
    tipoIdentificacion: getValue('tipoIdentificacion'),
    nombreComercial: getValue('nombreComercial'),
    contactFirstName: getValue('contactFirstName'),
    contactLastName: getValue('contactLastName'),
    contactId: getValue('contactId'),
    contactIdentificationType: getValue('contactIdentificationType'),
    contactMobile: getValue('contactMobile'),
    contactEmail: getValue('contactEmail'),
    contactFax: getValue('contactFax'),
    contactPhone: getValue('contactPhone'),
    contactLegalRepresentative: getValue('contactLegalRepresentative'),
    contactState: getValue('contactState'),
    contactCounty: getValue('contactCounty'),
    contactCountry: getValue('contactCountry'),
    contactAddress: getValue('contactAddress'),
    manejoExcedentes: getValue('manejoExcedentes'),
    allowedPercentage: getValue('allowedPercentage'),
    manejoAdelantos: getValue('manejoAdelantos'),
    adelantosPorcentaje: getValue('adelantosPorcentaje'),
    manejoFaltantes: getValue('manejoFaltantes'),
    faltantesPorcentaje: getValue('faltantesPorcentaje'),
    entregaMuestras: getValue('entregaMuestras'),
    contactoVB: getValue('contactoVB'),
    contactoVBTelefono: getValue('contactoVBTelefono'),
    contactoVBCorreo: getValue('contactoVBCorreo'),
    contactoProducto: getValue('contactoProducto'),
    contactoProductoTelefono: getValue('contactoProductoTelefono'),
    contactoProductoCorreo: getValue('contactoProductoCorreo'),
    indicacionesEntrega: getValue('indicacionesEntrega'),
    indicacionesVB: getValue('indicacionesVB'),
    indicacionesProducto: getValue('indicacionesProducto'),
  };
}

let saveTimeout = null;
function scheduleAutoSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => performAutoSave(), 400);
}

async function performAutoSave() {
  if (!currentSocioCode) return;
  try {
    const payload = buildSavePayload();
    const response = await fetch(`${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Error al guardar');
    const result = await response.json();
    if (result.socio && result.socio.partner_code && result.socio.partner_code !== currentSocioCode) {
      currentSocioCode = result.socio.partner_code;
    }
  } catch (e) {
    console.error('Auto-save failed:', e);
  }
}

function setupAutoSave() {
  const textInputs = [
    'generalEmail', 'taxId', 'sapCardCode', 'invoiceEmail', 'paymentTerms',
    'currencyCode', 'nombreComercial',
    'contactFirstName', 'contactLastName', 'contactId', 'contactMobile',
    'contactEmail', 'contactFax', 'contactPhone', 'contactAddress',
    'allowedPercentage', 'adelantosPorcentaje', 'faltantesPorcentaje',
    'contactoVBTelefono', 'contactoVBCorreo', 'contactoProductoTelefono', 'contactoProductoCorreo',
    'indicacionesEntrega', 'indicacionesVB', 'indicacionesProducto'
  ];

  textInputs.forEach(key => {
    const field = fields[key];
    if (field && !field.readOnly) {
      field.addEventListener('blur', scheduleAutoSave);
    }
  });

  ['allowedPercentage', 'adelantosPorcentaje', 'faltantesPorcentaje'].forEach((key) => {
    fields[key]?.addEventListener('input', syncAllPercentDisplayMasks);
  });

  const selectKeys = [
    'salesperson',
    'manejoExcedentes', 'manejoAdelantos', 'manejoFaltantes',
    'entregaMuestras', 'contactoVB', 'contactoProducto',
    'tipoSocio', 'tipoIdentificacion', 'contactIdentificationType',
    'contactState', 'contactCounty'
  ];

  selectKeys.forEach(key => {
    const field = fields[key];
    if (field) {
      field.addEventListener('change', scheduleAutoSave);
    }
  });

  const checkboxKeys = [
    'estadoActivo', 'taxExempt', 'requiereCartilla', 'requiereCertificado',
    'usarCartilla', 'contactLegalRepresentative'
  ];

  checkboxKeys.forEach(key => {
    const field = fields[key];
    if (field) {
      field.addEventListener('change', scheduleAutoSave);
    }
  });

  ['contactoVB', 'contactoProducto'].forEach((key) => {
    fields[key]?.addEventListener('blur', () => guardarContactoDigitadoSiHaceFalta(fields[key]));
  });
}

function deleteAddressRow(id) {
  if (!currentSocioCode) return;
  if (!window.confirm('¿Eliminar esta dirección del socio?')) return;
  fetch(`${SOCIOS_ENDPOINT}/${encodeURIComponent(currentSocioCode)}/direcciones/${encodeURIComponent(id)}`, { method: 'DELETE' })
    .then(async (response) => {
      if (!response.ok) {
        let message = 'No fue posible eliminar la dirección.';
        try {
          const errorPayload = await response.json();
          message = errorPayload?.error || message;
        } catch (e) {}
        throw new Error(message);
      }
      document.querySelector(`tr[data-address-id="${CSS.escape(id)}"]`)?.remove();
    })
    .catch((error) => window.alert(error.message || 'No fue posible eliminar la dirección.'));
}

async function init() {
  const codigo = new URLSearchParams(window.location.search).get('codigo');
  if (!codigo) throw new Error('No se indicó el código del socio.');
  await loadConfig();
  await loadGeneralConfig();
  await loadSalespeople();
  await loadSociosList();
  await loadSocio(codigo, false);
  activateSocioTab('cliente');
}

init().catch((error) => {
  console.error(error);
});
