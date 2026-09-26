// Funciones auxiliares (extraidas de server.js) para el modulo de Socios (business_partners)

// Dependencias inyectadas por registerSociosRoutes() -- ver nota en apply-socios-server.js.
let pgQuery, withTransaction, loadGeneralConfig, loadSapConfig, fetchSapBusinessPartnersForImport, createBusinessPartnerInSap, queryBusinessPartners, enqueueInboxRequest, getInboxRequestById, pickFirstValue;

function toBool(v) {
    return v === true || v === 'true' || v === 'sí' || v === 'si' || v === '1' || v === 'yes';
}

// Nomenclatura de socios que se importan desde SAP: solo se traen los registros
// clasificados como clientes (SAP CardType 'C') cuyo CardCode inicia con "C"
// seguido de un número (p.ej. "C0001"). Los socios con código tipo nombre
// (p.ej. "Carmen", "ABCLTDA") o de otro tipo de tarjeta (proveedores 'S',
// leads 'L', etc.) quedan fuera del import.
const PREFIJO_CODIGO_CLIENTE_SAP = 'C';
const TIPOS_TARJETA_CLIENTE_SAP = ['C'];

function esTipoTarjetaClienteSap(cardType) {
    return TIPOS_TARJETA_CLIENTE_SAP.includes(String(cardType || '').trim().toUpperCase());
}

function codigoCumpleNomenclaturaClienteSap(codigo) {
    return /^C\d/.test(String(codigo || '').trim().toUpperCase());
}

function splitContactName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
        return { firstName: '', lastName: '' };
    }
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' ')
    };
}

function normalizeSapTimestamp(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeFiscalId(value) {
    return String(value || '')
        .trim()
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase();
}

function sanitizePartnerCodePrefix(value) {
    const cleaned = String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
    return cleaned || 'CL';
}

function buildPartnerCodeRegex(prefix) {
    return `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`;
}

async function generateNextPartnerCode(client, prefix) {
    const safePrefix = sanitizePartnerCodePrefix(prefix);
    const regex = buildPartnerCodeRegex(safePrefix);
    const result = await client.query(
        `SELECT partner_code
           FROM business_partners
          WHERE partner_code ~* $1`,
        [regex]
    );

    let maxValue = 0;
    let padLength = 5;
    for (const row of result.rows) {
        const match = String(row.partner_code || '').toUpperCase().match(new RegExp(regex, 'i'));
        if (!match) continue;
        const numeric = Number(match[1]);
        if (Number.isFinite(numeric)) {
            maxValue = Math.max(maxValue, numeric);
            padLength = Math.max(padLength, match[1].length);
        }
    }

    return `${safePrefix}${String(maxValue + 1).padStart(padLength, '0')}`;
}

async function findExistingPartnerDuplicate(client, { partnerName, taxId }) {
    const normalizedName = String(partnerName || '').trim();
    const normalizedTaxId = normalizeFiscalId(taxId);
    if (!normalizedName && !normalizedTaxId) {
        return null;
    }

    const conditions = [];
    const values = [];

    if (normalizedName) {
        values.push(normalizedName);
        conditions.push(`LOWER(TRIM(partner_name)) = LOWER(TRIM($${values.length}))`);
    }

    if (normalizedTaxId) {
        values.push(normalizedTaxId);
        conditions.push(`regexp_replace(UPPER(COALESCE(tax_id, '')), '[^A-Z0-9]', '', 'g') = $${values.length}`);
    }

    const result = await client.query(
        `SELECT partner_code, partner_name, tax_id
           FROM business_partners
          WHERE ${conditions.join(' OR ')}
          ORDER BY partner_code NULLS LAST
          LIMIT 1`,
        values
    );

    return result.rows[0] || null;
}

async function findSapMirrorPartnersByTaxId(taxId) {
    const normalizedTaxId = normalizeFiscalId(taxId);
    if (!normalizedTaxId) {
        return [];
    }
    // Solo se comparan clientes (CardType 'C') con código que inicia en 'C': un
    // proveedor o registro fuera de nomenclatura con la misma cédula no debe
    // contar como "ya existe este socio en SAP".
    const result = await pgQuery(`
        SELECT "CardCode", "CardName", "CardType", "LicTradNum", "FederalTaxID", "validFor", synced_at
          FROM "OCRD"
         WHERE (
                regexp_replace(UPPER(COALESCE("LicTradNum", '')), '[^A-Z0-9]', '', 'g') = $1
             OR regexp_replace(UPPER(COALESCE("FederalTaxID", '')), '[^A-Z0-9]', '', 'g') = $1
               )
           AND UPPER(COALESCE("CardType", '')) = ANY($2)
           AND UPPER(COALESCE("CardCode", '')) ~ '^C[0-9]'
         ORDER BY "CardCode" ASC
    `, [normalizedTaxId, TIPOS_TARJETA_CLIENTE_SAP]);
    return result.rows;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForInboxRequest(id, { timeoutMs = 20000, intervalMs = 1000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let last = await getInboxRequestById(pgQuery, id);
    while (last && last.status !== 'answered' && last.status !== 'error' && Date.now() < deadline) {
        await sleep(intervalMs);
        last = await getInboxRequestById(pgQuery, id);
    }
    return last;
}

async function requestSapBusinessPartnersViaInbox({ search = '', type = '', top = 20, referenceCode = '' } = {}) {
    const request = await enqueueInboxRequest(pgQuery, {
        entityType: 'business-partners',
        referenceCode,
        parameters: { search, type, top },
        moduleName: 'socios'
    });
    return request;
}

function buildNewPartnerRawData(payload, partnerCode) {
    return {
        socio: {
            codigo: partnerCode,
            nombre: payload.partner_name,
            identificacionFiscal: payload.tax_id,
            correoFacturacion: payload.email_facturacion,
            moneda: payload.currency_code,
            diasCredito: payload.payment_terms,
            contactoPrincipal: {
                nombre: payload.contact_name,
                identificacion: payload.contact_identification,
                celular: payload.contact_mobile,
                correo: payload.contact_email,
                telefono: payload.contact_phone
            },
            direccion: {
                pais: payload.address_country,
                departamento: payload.address_state_province,
                zona: payload.address_zone,
                canton: payload.address_county,
                detalle: payload.address_line
            }
        },
        'CONTACTO NOMBRE': payload.contact_name,
        'CONTACTO IDENTIFICACION': payload.contact_identification,
        'Country Name': payload.address_country,
        'STATE NAME': payload.address_state_province,
        'CONTACTO CANTON': payload.address_county,
        STREET: payload.address_line,
        'Correo Facturacion 1': payload.email_facturacion,
        'RANGO CREDITO': payload.payment_terms,
        GROUPCODE_NOMBRE: payload.currency_code
    };
}

function normalizePartnerCode(value) {
    return String(value || '').trim().toUpperCase();
}

function pickFirstSapValue(source = {}, keys = []) {
    for (const key of keys) {
        const value = source?.[key];
        if (value != null && String(value).trim() !== '') return String(value).trim();
    }
    return '';
}

function pickSapFiscalId(row = {}) {
    return pickFirstSapValue(row, [
        'FederalTaxID',
        'FederalTaxId',
        'FEDERALTAXID',
        'LicTradNum',
        'TaxId',
        'TaxID',
        'VatId',
        'VATRegNum',
        'U_IDFiscal',
        'U_Identificacion',
        'U_Cedula',
        'U_Nit'
    ]);
}

function pickSapEmail(row = {}) {
    return pickFirstSapValue(row, ['Email', 'EmailAddress', 'E_Mail', 'E_MailL', 'MailAddress', 'U_Email']);
}

function pickSapPhone(row = {}) {
    return pickFirstSapValue(row, ['Phone1', 'Phone2', 'Tel1', 'Telephone1', 'U_Telefono']);
}

function pickSapMobile(row = {}) {
    return pickFirstSapValue(row, ['Cellular', 'CellularPhone', 'Cellolar', 'MobilePhone', 'Mobile', 'U_Celular']);
}

function pickSapPrimaryAddress(row = {}) {
    const addresses = Array.isArray(row.BPAddresses) ? row.BPAddresses : (Array.isArray(row.Addresses) ? row.Addresses : []);
    if (!addresses.length) return null;
    return addresses.find((address) => String(address?.AddressType || '').trim().toLowerCase() === 'bo_billto')
        || addresses[0]
        || null;
}

function mapSapPartnerAddressType(value = '') {
    const normalized = String(value || '').trim().toLowerCase();
    if (['s', 'bo_shipto', 'shipto', 'ship to', 'envio', 'envío'].includes(normalized)) return 'Envío';
    return 'Facturación';
}

function buildSapPartnerAddressLine(address = {}) {
    return [
        pickFirstSapValue(address, ['Street', 'AddressLine1']),
        pickFirstSapValue(address, ['Block', 'District', 'County']),
        pickFirstSapValue(address, ['City'])
    ].filter(Boolean).join(', ');
}

function normalizeSapPartnerAddress(address = {}, index = 0) {
    const addressName = pickFirstSapValue(address, ['AddressName', 'Address']) || `SAP-${index + 1}`;
    const addressType = pickFirstSapValue(address, ['AddressType', 'AdresType']);
    return {
        addressName,
        addressType: mapSapPartnerAddressType(addressType),
        addressTypeCode: addressType,
        country: pickFirstSapValue(address, ['Country']),
        stateProvince: pickFirstSapValue(address, ['State', 'StateProvince']),
        county: pickFirstSapValue(address, ['County']),
        district: pickFirstSapValue(address, ['Block', 'District']),
        addressLine: buildSapPartnerAddressLine(address),
        zipCode: pickFirstSapValue(address, ['ZipCode', 'Zip']),
        block: pickFirstSapValue(address, ['Block']),
        city: pickFirstSapValue(address, ['City']),
        building: pickFirstSapValue(address, ['Building']),
        floor: pickFirstSapValue(address, ['Floor']),
        room: pickFirstSapValue(address, ['Room']),
        streetNumber: pickFirstSapValue(address, ['StreetNo']),
        rawData: address || {}
    };
}

function pickSapContactIdentification(contact = {}, fallback = '') {
    return pickFirstSapValue(contact, [
        'FederalTaxID',
        'LicTradNum',
        'TaxId',
        'TaxID',
        'U_IDFiscal',
        'U_Identificacion',
        'U_Cedula',
        'Identification'
    ]) || fallback;
}

function pickSapContactRows(row = {}) {
    const contacts = Array.isArray(row.ContactEmployees)
        ? row.ContactEmployees
        : (Array.isArray(row.Contacts) ? row.Contacts : []);
    if (contacts.length) return contacts;
    const name = pickFirstSapValue(row, ['ContactPerson', 'CntctPrsn']);
    return name ? [{
        Name: name,
        FirstName: name,
        E_Mail: pickSapEmail(row),
        Tel1: pickSapPhone(row),
        Cellolar: pickSapMobile(row),
        Position: 'Principal'
    }] : [];
}

function normalizeSapPartnerContact(contact = {}, row = {}, primaryAddress = {}) {
    const name = pickFirstSapValue(contact, ['Name', 'ContactName', 'FirstName']) || pickFirstSapValue(row, ['ContactPerson', 'CardName']);
    const parts = splitContactName(name);
    return {
        contactName: name,
        firstName: pickFirstSapValue(contact, ['FirstName']) || parts.firstName,
        lastName: pickFirstSapValue(contact, ['LastName']) || parts.lastName,
        email: pickFirstSapValue(contact, ['E_Mail', 'E_MailL', 'Email', 'EmailAddress']) || pickSapEmail(row),
        phone: pickFirstSapValue(contact, ['Tel1', 'Phone1', 'Telephone1']) || pickSapPhone(row),
        mobile: pickFirstSapValue(contact, ['Cellular', 'MobilePhone', 'Mobile']) || pickSapMobile(row),
        fax: pickFirstSapValue(contact, ['Fax', 'Fax1']),
        position: pickFirstSapValue(contact, ['Position', 'Title']) || 'Principal',
        country: pickFirstSapValue(contact, ['Country']) || primaryAddress.country || '',
        stateProvince: pickFirstSapValue(contact, ['State', 'StateProvince']) || primaryAddress.stateProvince || '',
        county: pickFirstSapValue(contact, ['County']) || primaryAddress.county || '',
        addressLine: pickFirstSapValue(contact, ['Address']) || primaryAddress.addressLine || '',
        identification: pickSapContactIdentification(contact, pickSapFiscalId(row)),
        rawData: contact || {}
    };
}

function buildSapPartnerImportPayload(row = {}) {
    const partnerCode = normalizePartnerCode(row.CardCode);
    const partnerName = String(row.CardName || '').trim();
    const taxId = pickSapFiscalId(row);
    const email = pickSapEmail(row);
    const addresses = (Array.isArray(row.BPAddresses) ? row.BPAddresses : (Array.isArray(row.Addresses) ? row.Addresses : []))
        .map((address, index) => normalizeSapPartnerAddress(address, index))
        .filter((address) => address.addressName || address.addressLine || address.country || address.stateProvince || address.county);
    const primaryAddress = addresses.find((address) => String(address.addressTypeCode || '').trim().toLowerCase() === 'bo_billto')
        || addresses[0]
        || normalizeSapPartnerAddress(pickSapPrimaryAddress(row) || {}, 0);
    const contacts = pickSapContactRows(row)
        .map((contact) => normalizeSapPartnerContact(contact, row, primaryAddress))
        .filter((contact) => contact.contactName || contact.email || contact.phone || contact.mobile);
    if (!contacts.length && (partnerName || email)) {
        contacts.push(normalizeSapPartnerContact({
            Name: pickFirstSapValue(row, ['ContactPerson']) || partnerName,
            E_Mail: email,
            Tel1: pickSapPhone(row),
            Cellolar: pickSapMobile(row),
            Position: 'Principal'
        }, row, primaryAddress));
    }
    const mainContact = contacts[0] || {};

    const provider = String(row.__sapProvider || row.provider || '').trim() || 'service-layer';
    return {
        partnerCode,
        partnerName,
        taxId,
        email,
        currencyCode: String(row.Currency || 'USD').trim() || 'USD',
        paymentTerms: 'Contado',
        sapCreationDate: normalizeSapTimestamp(pickFirstSapValue(row, ['CreateDate'])),
        contacts,
        addresses,
        contactName: mainContact.contactName || pickFirstSapValue(row, ['ContactPerson']) || partnerName,
        contactIdentification: mainContact.identification || taxId,
        contactMobile: mainContact.mobile || pickSapMobile(row),
        contactEmail: mainContact.email || email,
        contactPhone: mainContact.phone || pickSapPhone(row),
        addressCountry: primaryAddress.country || '',
        addressStateProvince: primaryAddress.stateProvince || '',
        addressCounty: primaryAddress.county || '',
        addressLine: primaryAddress.addressLine || '',
        rawData: {
            source: 'sap',
            sapProvider: provider,
            imported_at: new Date().toISOString(),
            sap: row
        }
    };
}

async function diagnoseSociosImportFromSap() {
    const config = await loadSapConfig(pgQuery);
    const top = config.maxImportPartners || 2000;
    const sapResponse = await fetchSapBusinessPartnersForImport(pgQuery, { top, type: 'C' });
    const sapRows = Array.isArray(sapResponse?.value)
        ? sapResponse.value.map((row) => ({
            ...row,
            __sapProvider: sapResponse?.provider || row?.provider || 'service-layer'
        }))
        : [];

    const existingResult = await pgQuery(
        `SELECT partner_code, tax_id
           FROM business_partners`
    );

    const existingCodes = new Set();
    const existingTaxIds = new Set();
    for (const row of existingResult.rows) {
        const code = normalizePartnerCode(row.partner_code);
        const taxId = normalizeFiscalId(row.tax_id);
        if (code) existingCodes.add(code);
        if (taxId) existingTaxIds.add(taxId);
    }

    const summary = {
        source: sapResponse?.source || 'sap',
        total: sapRows.length,
        importable: 0,
        duplicateByCode: 0,
        duplicateByTaxId: 0,
        duplicateByBoth: 0,
        skippedWithoutCode: 0,
        skippedWithoutTaxId: 0,
        skippedFueraNomenclatura: 0
    };

    const importablePartners = [];

    for (const row of sapRows) {
        const partner = buildSapPartnerImportPayload(row);
        const normalizedCode = normalizePartnerCode(partner.partnerCode);
        const normalizedTaxId = normalizeFiscalId(partner.taxId);

        if (!normalizedCode) {
            summary.skippedWithoutCode += 1;
            continue;
        }

        const cardType = row.CardType || partner.rawData?.sap?.CardType || '';
        if (!esTipoTarjetaClienteSap(cardType) || !codigoCumpleNomenclaturaClienteSap(normalizedCode)) {
            summary.skippedFueraNomenclatura += 1;
            continue;
        }

        if (!normalizedTaxId) {
            summary.skippedWithoutTaxId += 1;
            continue;
        }

        const duplicateCode = existingCodes.has(normalizedCode);
        const duplicateTaxId = existingTaxIds.has(normalizedTaxId);

        if (duplicateCode && duplicateTaxId) {
            summary.duplicateByBoth += 1;
            continue;
        }
        if (duplicateCode) {
            summary.duplicateByCode += 1;
            continue;
        }
        if (duplicateTaxId) {
            summary.duplicateByTaxId += 1;
            continue;
        }

        importablePartners.push(partner);
        existingCodes.add(normalizedCode);
        existingTaxIds.add(normalizedTaxId);
        summary.importable += 1;
    }

    return { summary, importablePartners };
}

async function importSociosFromSap(options = {}) {
    const diagnosis = await diagnoseSociosImportFromSap();
    const limitValue = Number(options.limit);
    const requestedLimit = Number.isFinite(limitValue) && limitValue > 0 ? Math.max(1, Math.floor(limitValue)) : null;
    const importablePartners = requestedLimit
        ? diagnosis.importablePartners.slice(0, requestedLimit)
        : diagnosis.importablePartners;

    return withTransaction(async (client) => {
        const summary = {
            ...diagnosis.summary,
            requestedLimit,
            selectedForImport: importablePartners.length,
            inserted: 0
        };

        for (const partner of importablePartners) {
            await client.query(
                `INSERT INTO business_partners (
                    partner_code,
                    partner_name,
                    salesperson_name,
                    tax_id,
                    email,
                    email_facturacion,
                    currency_code,
                    payment_terms,
                    sector,
                    sub_sector,
                    is_tax_exempt,
                    allowed_percentage,
                    client_type,
                    creation_date,
                    updated_at
                ) VALUES (
                    $1, $2, '', $3, $4, $5, $6, $7, '', '', false, NULL, $8, COALESCE($9::date, CURRENT_DATE), NOW()
                )`,
                [
                    partner.partnerCode,
                    partner.partnerName,
                    partner.taxId,
                    partner.contactEmail,
                    partner.email,
                    sanitizePartnerCodePrefix(partner.currencyCode).slice(0, 10) || 'USD',
                    partner.paymentTerms,
                    String(partner.rawData?.sap?.CardType || '').trim() === 'S' ? 'PR' : 'CL',
                    partner.sapCreationDate
                ]
            );

            const partnerContacts = Array.isArray(partner.contacts) && partner.contacts.length
                ? partner.contacts
                : [{
                    contactName: partner.contactName || partner.partnerName,
                    firstName: splitContactName(partner.contactName || partner.partnerName).firstName,
                    lastName: splitContactName(partner.contactName || partner.partnerName).lastName,
                    email: partner.contactEmail,
                    phone: partner.contactPhone,
                    mobile: partner.contactMobile,
                    fax: '',
                    position: 'Principal',
                    country: partner.addressCountry,
                    stateProvince: partner.addressStateProvince,
                    county: partner.addressCounty,
                    addressLine: partner.addressLine,
                    identification: partner.contactIdentification,
                    rawData: {}
                }];

            for (const contact of partnerContacts) {
                if (!contact.contactName && !contact.email && !contact.phone && !contact.mobile) continue;
                await client.query(
                    `INSERT INTO business_partner_contacts (
                        partner_code,
                        contact_name,
                        first_name,
                        last_name,
                        email,
                        phone,
                        mobile,
                        fax,
                        position,
                        is_legal_representative,
                        country,
                        state_province,
                        county,
                        source
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12, 'sap'
                    )`,
                    [
                        partner.partnerCode,
                        contact.contactName || partner.partnerName,
                        contact.firstName || splitContactName(contact.contactName).firstName,
                        contact.lastName || splitContactName(contact.contactName).lastName,
                        contact.email || null,
                        contact.phone || null,
                        contact.mobile || null,
                        contact.fax || '',
                        contact.position || 'Principal',
                        contact.country || '',
                        contact.stateProvince || '',
                        contact.county || ''
                    ]
                );
            }

            const partnerAddresses = Array.isArray(partner.addresses) && partner.addresses.length
                ? partner.addresses
                : (partner.addressLine || partner.addressCountry || partner.addressStateProvince || partner.addressCounty ? [{
                    addressName: 'Principal',
                    addressType: 'Facturación',
                    country: partner.addressCountry,
                    stateProvince: partner.addressStateProvince,
                    county: partner.addressCounty,
                    district: '',
                    addressLine: partner.addressLine,
                    zipCode: '',
                    rawData: {}
                }] : []);

            for (const address of partnerAddresses) {
                if (address.addressLine || address.country || address.stateProvince || address.county) {
                await client.query(
                    `INSERT INTO business_partner_addresses (
                        partner_code,
                        address_name,
                        address_type,
                        country,
                        state_province,
                        county,
                        district,
                        address_line,
                        zip_code,
                        source
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'sap'
                    )`,
                    [
                        partner.partnerCode,
                        address.addressName || 'Principal',
                        address.addressType || 'Facturación',
                        address.country || '',
                        address.stateProvince || '',
                        address.county || '',
                        address.district || '',
                        address.addressLine || '',
                        address.zipCode || ''
                    ]
                );
                }
            }
            summary.inserted += 1;
        }

        return summary;
    });
}

function buildSyntheticAddressFromPartner(partner) {
    const line = partner?.direccion || '';
    if (!line) {
        return [];
    }
    return [{
        id: 'raw-address',
        partner_code: partner.partner_code,
        address_name: partner.partner_name || 'Principal',
        address_type: 'B',
        country: '',
        state_province: '',
        county: '',
        district: '',
        address_line: line,
        zip_code: ''
    }];
}

// ─── POTENCIAL COMERCIAL ────────────────────────────────────────────────────

const FRECUENCIAS_ANUALES = { SEMANAL: 52, MENSUAL: 12, TRIMESTRAL: 4, SEMESTRAL: 2, ANUAL: 1 };
const ESTADOS_PROSPECTO = ['PROSPECTO', 'PENDIENTE_INFORMACION', 'SOLICITUD_CLIENTE', 'PENDIENTE_APROBACION', 'ERROR_SINCRONIZACION'];
const ESTADOS_CLIENTE = ['CLIENTE_APROBADO', 'CLIENTE_CREADO_SAP'];

function leerSesionRequest(req) {
    const raw = String(req.get?.('x-erp-session') || '').trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
        return null;
    }
}

function nombreUsuarioRequest(req, fallback = '') {
    const session = leerSesionRequest(req);
    return pickFirstValue(session?.fullName, session?.name, session?.username, session?.user, fallback);
}

function esVendedorScoped(session) {
    const permissionName = String(session?.permissionName || '').trim().toLowerCase();
    if (!permissionName) return false;
    if (/administrador(?:es)?|implementador(?:es)?|emergencia|gerente/i.test(permissionName)) return false;
    return /vendedor/i.test(permissionName);
}

async function resolverNombreVendedorSesion(req) {
    const session = leerSesionRequest(req);
    const userName = pickFirstValue(session?.username, session?.user, session?.name, '');
    if (!userName) return '';
    const result = await pgQuery(
        `SELECT sap_salesperson_name
           FROM admin_users
          WHERE username = $1 OR full_name = $1
          ORDER BY sap_salesperson_name NULLS LAST
          LIMIT 1`,
        [userName]
    );
    return result.rows[0]?.sap_salesperson_name || '';
}

async function buildScopeSql(req, alias, startIndex) {
    const session = leerSesionRequest(req);
    if (!esVendedorScoped(session)) return { text: '', values: [] };
    const vendedor = await resolverNombreVendedorSesion(req);
    const usuario = nombreUsuarioRequest(req, '');
    return {
        text: ` AND (${alias}.salesperson_name = $${startIndex}
            OR EXISTS (
                SELECT 1 FROM potencial_comercial pc
                WHERE pc.partner_id = ${alias}.id AND pc.usuario_creacion = $${startIndex + 1}
            ))`,
        values: [vendedor, usuario]
    };
}

function calcularValoresLinea(linea) {
    const volumen = Math.max(0, Number(linea.volumen_estimado) || 0);
    const precio = Math.max(0, Number(linea.precio_estimado) || 0);
    const frecuencia = String(linea.frecuencia || 'MENSUAL').trim().toUpperCase();
    const frecuenciaAnual = Number(FRECUENCIAS_ANUALES[frecuencia]) || 12;
    const valorCompra = Math.round(volumen * precio * 1000000) / 1000000;
    const valorAnual = Math.round(valorCompra * frecuenciaAnual * 10000) / 10000;
    const valorMensual = Math.round(valorAnual * 100) / 1200;
    return { volumen, precio, frecuencia, frecuenciaAnual, valorCompra, valorMensual, valorAnual };
}

function validarLineaPotencial(linea, errors) {
    const valores = calcularValoresLinea(linea);
    if (!String(linea.descripcion || '').trim()) errors.push('descripción de la línea');
    if (!Number.isFinite(valores.volumen) || valores.volumen < 0) errors.push('volumen no puede ser negativo');
    if (!Number.isFinite(valores.precio) || valores.precio < 0) errors.push('precio no puede ser negativo');
    if (!FRECUENCIAS_ANUALES[valores.frecuencia]) errors.push('frecuencia de compra inválida');
    return valores;
}

async function ensurePotencialComercialSchema() {
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS potencial_comercial (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID NOT NULL UNIQUE,
            moneda TEXT NOT NULL DEFAULT 'USD',
            potencial_anual_calculado NUMERIC(16,4) NOT NULL DEFAULT 0,
            probabilidad_conversion NUMERIC(5,2) NOT NULL DEFAULT 0,
            forecast_calculado NUMERIC(16,4) NOT NULL DEFAULT 0,
            potencial_inicial_total NUMERIC(16,4) NOT NULL DEFAULT 0,
            forecast_inicial NUMERIC(16,4) NOT NULL DEFAULT 0,
            fecha_estimacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            usuario_creacion TEXT NOT NULL DEFAULT '',
            metodo_calculo TEXT NOT NULL DEFAULT 'VOLUMEN_PRECIO_FRECUENCIA',
            ajuste_monto NUMERIC(16,4),
            ajuste_motivo TEXT,
            ajuste_usuario TEXT,
            ajuste_fecha TIMESTAMPTZ,
            fecha_conversion TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_potencial_comercial_socio FOREIGN KEY (partner_id)
                REFERENCES business_partners (id) ON DELETE CASCADE
        )
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS potencial_lineas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID NOT NULL,
            producto_nombre TEXT,
            descripcion TEXT NOT NULL DEFAULT '',
            unidad_medida TEXT NOT NULL DEFAULT 'unidades',
            volumen_estimado NUMERIC(16,4) NOT NULL DEFAULT 0,
            frecuencia TEXT NOT NULL DEFAULT 'MENSUAL',
            frecuencia_anual NUMERIC(6,2) NOT NULL DEFAULT 12,
            precio_estimado NUMERIC(16,6) NOT NULL DEFAULT 0,
            moneda TEXT NOT NULL DEFAULT 'COP',
            estacionalidad TEXT NOT NULL DEFAULT 'SIN_ESTACIONALIDAD',
            observaciones TEXT NOT NULL DEFAULT '',
            valor_estimado_compra NUMERIC(16,4) NOT NULL DEFAULT 0,
            valor_mensual_estimado NUMERIC(16,4) NOT NULL DEFAULT 0,
            valor_anual_estimado NUMERIC(16,4) NOT NULL DEFAULT 0,
            usuario_creacion TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_potencial_lineas_socio FOREIGN KEY (partner_id)
                REFERENCES business_partners (id) ON DELETE CASCADE
        )
    `);
    await pgQuery(`
        CREATE TABLE IF NOT EXISTS historial_ventas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            partner_id UUID NOT NULL,
            periodo_inicio DATE NOT NULL,
            periodo_fin DATE NOT NULL,
            monto_total NUMERIC(16,4) NOT NULL DEFAULT 0,
            moneda TEXT NOT NULL DEFAULT 'COP',
            fuente TEXT NOT NULL DEFAULT 'ERP',
            referencia TEXT NOT NULL DEFAULT '',
            observaciones TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT fk_historial_ventas_socio FOREIGN KEY (partner_id)
                REFERENCES business_partners (id) ON DELETE CASCADE
        )
    `);
    await pgQuery('CREATE UNIQUE INDEX IF NOT EXISTS idx_potencial_comercial_partner ON potencial_comercial (partner_id)');
    await pgQuery('CREATE INDEX IF NOT EXISTS idx_potencial_lineas_partner ON potencial_lineas (partner_id)');
    await pgQuery('CREATE INDEX IF NOT EXISTS idx_potencial_lineas_producto ON potencial_lineas (LOWER(producto_nombre))');
    await pgQuery('CREATE INDEX IF NOT EXISTS idx_historial_ventas_partner ON historial_ventas (partner_id, periodo_inicio DESC)');
}

let sapInvoicesDisponibleCache = null;
async function sapInvoicesDisponible() {
    if (sapInvoicesDisponibleCache !== null) return sapInvoicesDisponibleCache;
    try {
        const result = await pgQuery(`SELECT to_regclass('sap_invoices') AS tabla`);
        sapInvoicesDisponibleCache = Boolean(result.rows[0]?.tabla);
    } catch (error) {
        sapInvoicesDisponibleCache = false;
    }
    return sapInvoicesDisponibleCache;
}

function ventasJoinSql() {
    return `
        LEFT JOIN LATERAL (
            SELECT
                COALESCE(SUM(rev.doc_total), 0)::numeric AS ventas_total,
                COALESCE(SUM(rev.doc_total) FILTER (WHERE rev.es_ultimos_12), 0)::numeric AS ventas_ultimos_12,
                COALESCE(SUM(rev.doc_total) FILTER (WHERE rev.es_prev_12), 0)::numeric AS ventas_prev_12,
                COALESCE(SUM(rev.doc_total) FILTER (WHERE rev.es_anio_actual), 0)::numeric AS ventas_anio_actual,
                COALESCE(SUM(rev.doc_total) FILTER (WHERE rev.es_anio_anterior), 0)::numeric AS ventas_anio_anterior,
                COUNT(*)::int AS cantidad_facturas
            FROM (
                SELECT f.doc_total,
                    CASE WHEN (f.doc_date ~ '^[0-9]{4}-[0-9]{2}' AND f.doc_date >= to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM-DD'))
                          OR (f.doc_date ~ '^[0-9]{8}$' AND f.doc_date >= to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYYMMDD')) THEN TRUE ELSE FALSE END AS es_ultimos_12,
                    CASE WHEN (f.doc_date ~ '^[0-9]{4}-[0-9]{2}' AND f.doc_date < to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM-DD') AND f.doc_date >= to_char(CURRENT_DATE - INTERVAL '24 months', 'YYYY-MM-DD'))
                          OR (f.doc_date ~ '^[0-9]{8}$' AND f.doc_date < to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYYMMDD') AND f.doc_date >= to_char(CURRENT_DATE - INTERVAL '24 months', 'YYYYMMDD')) THEN TRUE ELSE FALSE END AS es_prev_12,
                    CASE WHEN (f.doc_date ~ '^[0-9]{4}-[0-9]{2}' AND substring(f.doc_date, 1, 4) = to_char(CURRENT_DATE, 'YYYY'))
                          OR (f.doc_date ~ '^[0-9]{8}$' AND substring(f.doc_date, 1, 4) = to_char(CURRENT_DATE, 'YYYY')) THEN TRUE ELSE FALSE END AS es_anio_actual,
                    CASE WHEN (f.doc_date ~ '^[0-9]{4}-[0-9]{2}' AND substring(f.doc_date, 1, 4) = to_char(CURRENT_DATE - INTERVAL '1 year', 'YYYY'))
                          OR (f.doc_date ~ '^[0-9]{8}$' AND substring(f.doc_date, 1, 4) = to_char(CURRENT_DATE - INTERVAL '1 year', 'YYYY')) THEN TRUE ELSE FALSE END AS es_anio_anterior
                FROM sap_invoices f
                WHERE UPPER(TRIM(f.card_code)) = UPPER(TRIM(bp.partner_code))
            ) rev
        ) ventas ON TRUE`;
}

const POTENCIAL_SORT_COLUMNS = {
    partner_name: 'bp.partner_name',
    partner_code: 'bp.partner_code',
    salesperson_name: 'bp.salesperson_name',
    potencial_anual_calculado: 'pc.potencial_anual_calculado',
    probabilidad_conversion: 'pc.probabilidad_conversion',
    forecast_calculado: 'pc.forecast_calculado',
    fecha_estimacion: 'pc.fecha_estimacion',
    ventas_total: 'ventas.ventas_total',
    diferencia: 'diferencia'
};

async function consultarListaPotencial(req, { limit = 50, offset = 0, sortKey = '', sortDir = 'desc', withVentas = true } = {}) {
    const q = String(req.query.q || '').trim();
    const vendedor = String(req.query.vendedor || '').trim();
    const estado = String(req.query.estado || '').trim();
    const moneda = String(req.query.moneda || '').trim().toUpperCase();
    const producto = String(req.query.producto || '').trim();
    const probMin = Number(req.query.probMin) || null;
    const probMax = Number(req.query.probMax) || null;
    const potMin = Number(req.query.potMin) || null;
    const potMax = Number(req.query.potMax) || null;
    const fechaDesde = String(req.query.fechaDesde || '').trim();
    const fechaHasta = String(req.query.fechaHasta || '').trim();
    const safeLimit = limit === 'all' ? 0 : Math.min(Math.max(Number(limit) || 50, 1), 10000);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const values = [];
    const conditions = [];
    const bind = (value) => {
        values.push(value);
        return `$${values.length}`;
    };

    if (q) {
        conditions.push(`(bp.partner_name ILIKE ${bind(`%${q}%`)} OR bp.partner_code ILIKE ${bind(`%${q}%`)})`);
    }
    if (vendedor) conditions.push(`bp.salesperson_name ILIKE ${bind(`%${vendedor}%`)}`);
    if (estado) conditions.push(`bp.estado_socio = ${bind(estado)}`);
    if (moneda) conditions.push(`pc.moneda = ${bind(moneda)}`);
    if (producto) {
        conditions.push(`EXISTS (SELECT 1 FROM potencial_lineas pl WHERE pl.partner_id = bp.id AND (pl.producto_nombre ILIKE ${bind(`%${producto}%`)} OR pl.descripcion ILIKE ${bind(`%${producto}%`)}))`);
    }
    if (probMin != null) conditions.push(`pc.probabilidad_conversion >= ${bind(probMin)}`);
    if (probMax != null) conditions.push(`pc.probabilidad_conversion <= ${bind(probMax)}`);
    if (potMin != null) conditions.push(`pc.potencial_anual_calculado >= ${bind(potMin)}`);
    if (potMax != null) conditions.push(`pc.potencial_anual_calculado <= ${bind(potMax)}`);
    if (fechaDesde) conditions.push(`pc.fecha_estimacion >= ${bind(`${fechaDesde} 00:00:00`)}::timestamptz`);
    if (fechaHasta) conditions.push(`pc.fecha_estimacion < (${bind(`${fechaHasta} 00:00:00`)}::timestamptz + INTERVAL '1 day')`);

    const scope = await buildScopeSql(req, 'bp', values.length + 1);
    if (scope.text) {
        conditions.push(scope.text);
        values.push(...scope.values);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderColumn = POTENCIAL_SORT_COLUMNS[String(sortKey) || ''] || 'pc.fecha_estimacion';
    const orderDir = String(sortDir || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const orderClause = `${orderColumn} ${orderDir} NULLS LAST, bp.partner_code ASC`;
    const ventasJoin = withVentas && (await sapInvoicesDisponible()) ? ventasJoinSql() : '';

    const countResult = await pgQuery(
        `SELECT COUNT(*)::int AS total
           FROM business_partners bp
           JOIN potencial_comercial pc ON pc.partner_id = bp.id
           ${whereClause}`,
        values
    );
    const total = countResult.rows[0]?.total || 0;

    const ventaCols = ventasJoin ? `
            COALESCE(ventas.ventas_total, 0) AS ventas_total,
            COALESCE(ventas.ventas_ultimos_12, 0) AS ventas_ultimos_12,
            COALESCE(ventas.ventas_anio_actual, 0) AS ventas_anio_actual,
            COALESCE(ventas.ventas_anio_anterior, 0) AS ventas_anio_anterior,
            (pc.potencial_anual_calculado - COALESCE(ventas.ventas_total, 0)) AS diferencia,
            COALESCE(ventas.cantidad_facturas, 0) AS cantidad_facturas` : `
            0 AS ventas_total,
            0 AS ventas_ultimos_12,
            0 AS ventas_anio_actual,
            0 AS ventas_anio_anterior,
            pc.potencial_anual_calculado AS diferencia,
            0 AS cantidad_facturas`;

    const limitClause = safeLimit > 0 ? ` LIMIT ${bind(safeLimit)}` : '';
    const offsetClause = safeOffset > 0 ? ` OFFSET ${bind(safeOffset)}` : '';

    const result = await pgQuery(
        `SELECT
            bp.id::text AS partner_id,
            bp.partner_code,
            bp.partner_name,
            bp.salesperson_name,
            bp.estado_socio,
            pc.moneda,
            pc.potencial_anual_calculado,
            pc.probabilidad_conversion,
            pc.forecast_calculado,
            pc.potencial_inicial_total,
            pc.forecast_inicial,
            pc.fecha_estimacion,
            pc.usuario_creacion,
            pc.ajuste_monto,
            pc.ajuste_motivo,
            pc.ajuste_usuario,
            pc.ajuste_fecha,
            (SELECT string_agg(DISTINCT COALESCE(NULLIF(pl.producto_nombre, ''), pl.descripcion), ' | ' ORDER BY COALESCE(NULLIF(pl.producto_nombre, ''), pl.descripcion))
               FROM potencial_lineas pl WHERE pl.partner_id = bp.id) AS productos,
            ${ventaCols}
         FROM business_partners bp
         JOIN potencial_comercial pc ON pc.partner_id = bp.id
         ${ventasJoin}
         ${whereClause}
         ORDER BY ${orderClause}
         ${limitClause} ${offsetClause}`,
        values
    );

    return { rows: result.rows, total, offset: safeOffset, limit: safeLimit };
}

async function recalcularTotalesPotencial(executor, partnerId, probabilidadActual = 0) {
    const run = (sql, params) => (typeof executor === 'function' ? executor(sql, params) : executor.query(sql, params));
    const result = await run(
        `SELECT COALESCE(SUM(valor_anual_estimado), 0)::numeric AS total
           FROM potencial_lineas
          WHERE partner_id = $1`,
        [partnerId]
    );
    const total = Math.round(Number(result.rows[0]?.total || 0) * 10000) / 10000;
    const forecast = Math.round(total * probabilidadActual) / 100;
    await run(
        `UPDATE potencial_comercial
            SET potencial_anual_calculado = $2, forecast_calculado = $3, updated_at = NOW()
          WHERE partner_id = $1`,
        [partnerId, total, forecast]
    );
    return total;
}

async function leerSociosConVentas(req, { limit = 50, offset = 0, sortKey = 'potencial_anual_calculado', sortDir = 'desc' } = {}) {
    return consultarListaPotencial(req, { limit, offset, sortKey, sortDir, withVentas: true });
}

// ─── REGISTRO DE RUTAS ─────────────────────────────────────────────────────

// Reúne los datos del socio (contacto + dirección principal) para armar el payload SAP.
async function reunirDatosSocioSap(codigo) {
    const partner = await pgQuery(
        `SELECT partner_code, partner_name, tax_id, email, email_facturacion, currency_code, sap_card_code
         FROM business_partners WHERE partner_code = $1`,
        [codigo]
    );
    if (!partner.rows.length) {
        throw new Error('Socio no encontrado.');
    }
    const socio = partner.rows[0];
    const contact = await pgQuery(
        `SELECT contact_name, email, phone, mobile
         FROM business_partner_contacts
         WHERE partner_code = $1
         ORDER BY id ASC LIMIT 1`,
        [codigo]
    );
    const address = await pgQuery(
        `SELECT country, state_province, county, address_line, zip_code
         FROM business_partner_addresses
         WHERE partner_code = $1
         ORDER BY id ASC LIMIT 1`,
        [codigo]
    );
    const contactRow = contact.rows[0] || {};
    const addressRow = address.rows[0] || {};
    const data = {
        partnerCode: socio.partner_code,
        partnerName: socio.partner_name,
        taxId: socio.tax_id,
        email: contactRow.email || socio.email_facturacion || socio.email,
        phone: contactRow.mobile || contactRow.phone,
        contactName: contactRow.contact_name,
        currency: socio.currency_code,
        addressLine: addressRow.address_line,
        country: addressRow.country,
        stateProvince: addressRow.state_province,
        county: addressRow.county,
        zipCode: addressRow.zip_code
    };
    return { socio, data };
}

async function crearSocioEnSapPorCodigo(codigoRaw, { dryRun = false } = {}) {
    const codigo = normalizePartnerCode(codigoRaw);
    if (!codigo) throw new Error('Código inválido.');

    const { socio, data } = await reunirDatosSocioSap(codigo);
    if (socio.sap_card_code && !dryRun) {
        const err = new Error(`Este socio ya tiene un CardCode de SAP asignado: ${socio.sap_card_code}.`);
        err.cardCode = socio.sap_card_code;
        err.yaExistia = true;
        throw err;
    }

    // Config SAP (modo/proveedor): necesaria para que createBusinessPartnerInSap
    // enrute por el proveedor real (di-api-middleware / di-api / service-layer).
    const config = await loadSapConfig(pgQuery);
    const response = await createBusinessPartnerInSap({ pgQuery, config, data, dryRun });
    if (dryRun) return { cardCode: socio.sap_card_code || '', preview: response };

    const cardCode = response?.CardCode || '';
    if (cardCode) {
        await pgQuery(
            `UPDATE business_partners
                SET sap_card_code = $2,
                    estado_socio = CASE WHEN estado_socio = ANY($3::text[]) THEN 'CLIENTE_CREADO_SAP' ELSE estado_socio END
              WHERE partner_code = $1`,
            [codigo, cardCode, [...ESTADOS_PROSPECTO, 'CLIENTE_APROBADO']]
        );
    }

    return { cardCode, response };
}

// Actualizar el socio (Business Partner / OCRD) en SAP. Requiere CardCode ya asignado.
async function actualizarSocioEnSapPorCodigo(codigoRaw, { dryRun = false } = {}) {
    const codigo = normalizePartnerCode(codigoRaw);
    if (!codigo) throw new Error('Código inválido.');

    const { socio, data } = await reunirDatosSocioSap(codigo);
    if (!socio.sap_card_code && !dryRun) {
        throw new Error('Este socio todavía no tiene CardCode de SAP. Créalo primero.');
    }
    data.cardCode = socio.sap_card_code || '';

    const config = await loadSapConfig(pgQuery);
    const response = await createBusinessPartnerInSap({ pgQuery, config, data, dryRun, actionType: 'update' });
    if (dryRun) return { cardCode: socio.sap_card_code || '', preview: response };
    return { cardCode: socio.sap_card_code || '', response };
}

function registerSociosRoutes(deps) {
    const { app } = deps;
    pgQuery = deps.pgQuery;
    withTransaction = deps.withTransaction;
    loadGeneralConfig = deps.loadGeneralConfig;
    pickFirstValue = deps.pickFirstValue;
    loadSapConfig = deps.sapLayer.loadSapConfig;
    fetchSapBusinessPartnersForImport = deps.sapLayer.fetchSapBusinessPartnersForImport;
    createBusinessPartnerInSap = deps.sapLayer.createBusinessPartnerInSap;
    queryBusinessPartners = deps.sapLayer.queryBusinessPartners;
    enqueueInboxRequest = deps.sapLayer.enqueueInboxRequest;
    getInboxRequestById = deps.sapLayer.getInboxRequestById;

    ensurePotencialComercialSchema().catch(() => {});

    app.get('/api/socios', async (req, res) => {
        try {
            const search = String(req.query.q || '').trim();
            const rawLimit = String(req.query.limit || '').trim().toLowerCase();
            const hasLimit = rawLimit !== 'all';
            const limit = hasLimit ? Math.min(Math.max(Number(req.query.limit) || 50, 1), 10000) : 0;
            const offset = Math.max(Number(req.query.offset) || 0, 0);
            const estadoParam = String(req.query.estado || '').trim();
            const values = [];
            const conditions = [];

            if (search) {
                const terms = search.split(/\s+/).filter(Boolean);
                const termConditions = [];
                for (const term of terms) {
                    values.push(`%${term}%`);
                    values.push(`%${term}%`);
                    values.push(`%${term}%`);
                    values.push(`%${term}%`);
                    values.push(`%${term}%`);
                    values.push(`%${term}%`);
                    termConditions.push(`(
                        p.partner_code ILIKE $${values.length - 5}
                        OR p.partner_name ILIKE $${values.length - 4}
                        OR p.tax_id ILIKE $${values.length - 3}
                        OR p.email ILIKE $${values.length - 2}
                        OR p.email_facturacion ILIKE $${values.length - 1}
                        OR c.contact_name ILIKE $${values.length}
                    )`);
                }
                conditions.push(`(${termConditions.join(' AND ')})`);
            }

            if (estadoParam === 'pendientes-sap') {
                values.push(['PENDIENTE_APROBACION', 'CLIENTE_APROBADO', 'ERROR_SINCRONIZACION']);
                conditions.push(`p.estado_socio = ANY($${values.length}::text[])`);
            } else if (estadoParam) {
                values.push(estadoParam);
                conditions.push(`p.estado_socio = $${values.length}`);
            }

            const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

            const countResult = await pgQuery(
                `SELECT COUNT(DISTINCT p.partner_code)::int AS total
                   FROM business_partners p
                   LEFT JOIN business_partner_contacts c ON c.partner_code = p.partner_code
                  ${whereClause}`,
                values
            );
            const totalCount = countResult.rows[0]?.total || 0;
    
            const limitClause = hasLimit ? `LIMIT $${values.length + 1}` : '';
            if (hasLimit) values.push(limit);
            const offsetClause = offset > 0 ? `OFFSET $${values.length + 1}` : '';
            if (offset > 0) values.push(offset);
    
            const SOCIOS_SORT_COLUMNS = {
                partner_code: 'partner_code',
                partner_name: 'partner_name',
                salesperson_name: 'salesperson_name',
                email: 'email',
                sector: 'sector',
                creation_date: 'created_at'
            };
            const sortColumn = SOCIOS_SORT_COLUMNS[String(req.query.sortKey || '')] || null;
            const sortDir = String(req.query.sortDir || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
            const orderClause = sortColumn
                ? `sub.${sortColumn} ${sortDir} NULLS LAST, sub.partner_code DESC`
                : `sub.created_at DESC NULLS LAST, sub.partner_code DESC`;

            const result = await pgQuery(
                `SELECT * FROM (
                    SELECT DISTINCT ON (p.partner_code)
                        p.partner_code,
                        p.prospect_code,
                        p.partner_name,
                        p.clase_cliente,
                        p.salesperson_name,
                        p.tax_id,
                        p.email,
                        p.email_facturacion,
                        p.currency_code,
                        p.payment_terms,
                        p.sector,
                        p.sub_sector,
                        p.is_tax_exempt,
                        p.allowed_percentage,
                        p.client_type,
                        p.estado_socio,
                        p.creation_date,
                        p.created_at
                     FROM business_partners p
                     LEFT JOIN business_partner_contacts c ON c.partner_code = p.partner_code
                     ${whereClause}
                     ORDER BY p.partner_code, p.partner_name NULLS LAST
                 ) sub
                 ORDER BY ${orderClause}
                 ${limitClause} ${offsetClause}`,
                values
            );
    
            res.json({ socios: result.rows, total: totalCount, offset, limit: hasLimit ? limit : totalCount });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar los socios.' });
        }
    });

    app.get('/api/socios/verificar-identificacion', async (req, res) => {
        try {
            const normalizedTaxId = normalizeFiscalId(req.query.tax_id);
            if (!normalizedTaxId || /^0+$/.test(normalizedTaxId)) {
                return res.json({ exists: false });
            }
            const result = await pgQuery(
                `SELECT partner_code, partner_name, tax_id
                   FROM business_partners
                  WHERE regexp_replace(UPPER(COALESCE(tax_id, '')), '[^A-Z0-9]', '', 'g') = $1
                  ORDER BY partner_code NULLS LAST
                  LIMIT 1`,
                [normalizedTaxId]
            );
            const existing = result.rows[0];
            const sapMatches = await findSapMirrorPartnersByTaxId(normalizedTaxId);
            res.json(existing
                ? { exists: true, existing, sapMatches }
                : { exists: false, sapMatches });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible verificar la identificación.' });
        }
    });

    app.post('/api/socios/prueba-diapi', async (req, res) => {
        try {
            const search = String(req.body?.search || '').trim();
            const type = String(req.body?.type || '').trim();
            const top = Math.min(Math.max(Number(req.body?.top) || 20, 1), 100);
            if (!search) {
                return res.status(400).json({ error: 'Indica un texto de búsqueda (nombre, código o identificación).' });
            }
            const request = await requestSapBusinessPartnersViaInbox({ search, type, top });
            const answered = await waitForInboxRequest(request.id, { timeoutMs: 20000, intervalMs: 1000 });
            if (!answered) {
                return res.json({ ok: false, pending: true, requestId: request.id, requestCode: request.request_code, message: 'DIAPI no respondió dentro del tiempo de espera.' });
            }
            if (answered.status === 'error') {
                return res.json({ ok: false, pending: false, requestId: request.id, requestCode: request.request_code, error: answered.last_error || 'DIAPI reportó un error al resolver la consulta.' });
            }
            if (answered.status !== 'answered') {
                return res.json({ ok: false, pending: true, requestId: request.id, requestCode: request.request_code, status: answered.status, message: 'La solicitud sigue pendiente.' });
            }
            res.json({ ok: true, pending: false, requestId: request.id, requestCode: request.request_code, result: answered.result_payload });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible ejecutar la prueba contra DIAPI.' });
        }
    });

    // Duplicado exacto de /api/socios/prueba-diapi: mismo mecanismo (encolar y esperar
    // en la misma llamada), unica diferencia es que pide una CANTIDAD de socios en vez
    // de un texto de busqueda.
    app.post('/api/socios/prueba-diapi-cantidad', async (req, res) => {
        const startedAt = Date.now();
        try {
            const top = Math.min(Math.max(Number(req.body?.top) || 100, 1), 5000);
            const timeoutMs = Math.min(Math.max(Number(req.body?.timeoutMs) || 20000, 1000), 180000);
            const request = await requestSapBusinessPartnersViaInbox({ search: '', type: 'C', top });
            const answered = await waitForInboxRequest(request.id, { timeoutMs, intervalMs: 1000 });
            const elapsedSec = Math.round((Date.now() - startedAt) / 100) / 10;
            if (!answered) {
                return res.json({ ok: false, pending: true, requestId: request.id, requestCode: request.request_code, elapsedSec, message: 'DIAPI no respondió dentro del tiempo de espera.' });
            }
            if (answered.status === 'error') {
                return res.json({ ok: false, pending: false, requestId: request.id, requestCode: request.request_code, elapsedSec, error: answered.last_error || 'DIAPI reportó un error al resolver la consulta.' });
            }
            if (answered.status !== 'answered') {
                return res.json({ ok: false, pending: true, requestId: request.id, requestCode: request.request_code, elapsedSec, status: answered.status, message: 'La solicitud sigue pendiente.' });
            }
            res.json({ ok: true, pending: false, requestId: request.id, requestCode: request.request_code, elapsedSec, result: answered.result_payload });
        } catch (error) {
            const elapsedSec = Math.round((Date.now() - startedAt) / 100) / 10;
            res.status(500).json({ error: error.message || 'No fue posible ejecutar la prueba contra DIAPI.', elapsedSec });
        }
    });

    app.get('/api/socios/prueba-diapi/:id', async (req, res) => {
        try {
            const item = await getInboxRequestById(pgQuery, req.params.id);
            if (!item) {
                return res.status(404).json({ error: 'Solicitud no encontrada.' });
            }
            res.json({
                ok: item.status === 'answered',
                pending: item.status === 'pending' || item.status === 'processing',
                status: item.status,
                result: item.result_payload,
                error: item.last_error || null
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible consultar el estado de la solicitud.' });
        }
    });

    app.post('/api/socios', async (req, res) => {
        try {
            const config = await loadGeneralConfig();
            const body = req.body || {};
            const usuarioCreacion = nombreUsuarioRequest(req, '');
            const vendedorCreacion = await resolverNombreVendedorSesion(req);
            const potentialBody = body.potencial_comercial || body.potencial || {};
            const potentialLines = Array.isArray(potentialBody.lineas) ? potentialBody.lineas : [];
            const potencialProbabilidad = Math.min(100, Math.max(0, Number(potentialBody.probabilidad_conversion) || 0));
            const potentialCurrency = sanitizePartnerCodePrefix(String(potentialBody.moneda || '').trim() || String(body.currency_code || '').trim() || 'USD').slice(0, 10) || 'USD';
            const trim = (v) => String(v || '').trim();
            const toBool = (v) => v === true || v === 'true' || v === 'sí' || v === 'si' || v === '1' || v === 'yes';
            const toNumberOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

            const payload = {
                tipo_socio: trim(body.tipo_socio).toUpperCase(),
                tipo_identificacion: trim(body.tipo_identificacion).toUpperCase(),
                tax_id: trim(body.tax_id),
                partner_name: trim(body.partner_name),
                nombre_comercial: trim(body.nombre_comercial),
                email_facturacion: trim(body.email_facturacion),
                sector: trim(body.sector),
                sub_sector: trim(body.sub_sector),
                contact_first_name: trim(body.contact_first_name),
                contact_last_name: trim(body.contact_last_name),
                contact_identification_type: trim(body.contact_identification_type).toUpperCase(),
                contact_identification: trim(body.contact_identification),
                contact_mobile: trim(body.contact_mobile),
                contact_phone: trim(body.contact_phone),
                contact_email: trim(body.contact_email),
                contact_position: trim(body.contact_position),
                contact_legal_representative: toBool(body.contact_legal_representative),
                address_country: trim(body.address_country),
                address_state_province: trim(body.address_state_province),
                address_zone: trim(body.address_zone),
                address_county: trim(body.address_county),
                address_line: trim(body.address_line),
                address_zip_code: trim(body.address_zip_code),
                currency_code: sanitizePartnerCodePrefix(trim(body.currency_code) || 'USD').slice(0, 10) || 'USD',
                payment_terms: trim(body.payment_terms) || 'Contado',
                is_tax_exempt: toBool(body.is_tax_exempt),
                manejo_excedentes: trim(body.manejo_excedentes),
                allowed_percentage: toNumberOrNull(body.allowed_percentage),
                manejo_adelantos: trim(body.manejo_adelantos),
                porcentaje_adelantos: toNumberOrNull(body.porcentaje_adelantos),
                manejo_faltantes: trim(body.manejo_faltantes),
                porcentaje_faltantes: toNumberOrNull(body.porcentaje_faltantes),
                entrega_muestras: trim(body.entrega_muestras),
                entrega_indicaciones: trim(body.entrega_indicaciones),
                contacto_vb_tipo: trim(body.contacto_vb_tipo),
                contacto_vb_telefono: trim(body.contacto_vb_telefono),
                contacto_vb_correo: trim(body.contacto_vb_correo),
                contacto_vb_detalle: trim(body.contacto_vb_detalle),
                contacto_producto_tipo: trim(body.contacto_producto_tipo),
                contacto_producto_telefono: trim(body.contacto_producto_telefono),
                contacto_producto_correo: trim(body.contacto_producto_correo),
                contacto_producto_detalle: trim(body.contacto_producto_detalle)
            };
            payload.contact_name = [payload.contact_first_name, payload.contact_last_name].filter(Boolean).join(' ');

            const errors = [];
            if (!payload.tipo_socio) errors.push('tipo de socio');
            if (!payload.tipo_identificacion) errors.push('tipo de identificación');
            if (!payload.tax_id) errors.push('número de identificación');
            if (!payload.partner_name) errors.push('nombre del socio');
            if (!payload.contact_first_name) errors.push('nombre del contacto principal');
            if (!payload.contact_mobile && !payload.contact_phone && !payload.contact_email) errors.push('celular, teléfono o correo del contacto principal');

            if (errors.length) {
                return res.status(400).json({ error: `Faltan campos obligatorios: ${errors.join(', ')}.` });
            }
            const excedentesNoAplica = /no facturar excedentes/i.test(payload.manejo_excedentes || '');
            if (excedentesNoAplica) payload.allowed_percentage = 0;

            const duplicate = await withTransaction(async (client) => {
                const existing = await findExistingPartnerDuplicate(client, {
                    partnerName: payload.partner_name,
                    taxId: payload.tax_id
                });
                if (existing) {
                    return { duplicate: existing };
                }

                const partnerCode = await generateNextPartnerCode(client, config?.general?.partnerCodePrefix || 'CL');

                await client.query(
                    `INSERT INTO business_partners (
                        partner_code,
                        partner_name,
                        salesperson_name,
                        tax_id,
                        email,
                        email_facturacion,
                        currency_code,
                        payment_terms,
                        sector,
                        sub_sector,
                        is_tax_exempt,
                        allowed_percentage,
                        client_type,
                        creation_date,
                        updated_at,
                        tipo_socio,
                        tipo_identificacion,
                        nombre_comercial,
                        estado_socio,
                        manejo_excedentes,
                        manejo_adelantos,
                        porcentaje_adelantos,
                        manejo_faltantes,
                        porcentaje_faltantes,
                        entrega_muestras,
                        entrega_indicaciones,
                        contacto_vb_tipo,
                        contacto_vb_telefono,
                        contacto_vb_correo,
                        contacto_vb_detalle,
                        contacto_producto_tipo,
                        contacto_producto_telefono,
                        contacto_producto_correo,
                        contacto_producto_detalle
                    ) VALUES (
                        $1, $2, $30, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PR', CURRENT_DATE, NOW(),
                        $12, $13, $14, 'PROSPECTO',
                        $15, $16, $17, $18, $19, $20, $21,
                        $22, $23, $24, $25,
                        $26, $27, $28, $29
                    ) RETURNING id`,
                    [
                        partnerCode,
                        payload.partner_name,
                        payload.tax_id,
                        payload.contact_email,
                        payload.email_facturacion,
                        payload.currency_code,
                        payload.payment_terms,
                        payload.sector,
                        payload.sub_sector,
                        payload.is_tax_exempt,
                        payload.allowed_percentage,
                        payload.tipo_socio,
                        payload.tipo_identificacion,
                        payload.nombre_comercial,
                        payload.manejo_excedentes,
                        payload.manejo_adelantos,
                        payload.porcentaje_adelantos,
                        payload.manejo_faltantes,
                        payload.porcentaje_faltantes,
                        payload.entrega_muestras,
                        payload.entrega_indicaciones,
                        payload.contacto_vb_tipo,
                        payload.contacto_vb_telefono,
                        payload.contacto_vb_correo,
                        payload.contacto_vb_detalle,
                        payload.contacto_producto_tipo,
                        payload.contacto_producto_telefono,
                        payload.contacto_producto_correo,
                        payload.contacto_producto_detalle,
                        vendedorCreacion
                    ]
                );

                await client.query(
                    `INSERT INTO business_partner_contacts (
                        partner_code,
                        contact_name,
                        first_name,
                        last_name,
                        email,
                        phone,
                        mobile,
                        fax,
                        position,
                        is_legal_representative,
                        country,
                        state_province,
                        county,
                        identification_type
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, '', $8, $9, $10, $11, $12, $13
                    )`,
                    [
                        partnerCode,
                        payload.contact_name,
                        payload.contact_first_name,
                        payload.contact_last_name,
                        payload.contact_email,
                        payload.contact_phone,
                        payload.contact_mobile,
                        payload.contact_position || 'Principal',
                        payload.contact_legal_representative,
                        payload.address_country,
                        payload.address_state_province,
                        payload.address_county,
                        payload.contact_identification_type || null
                    ]
                );

                await client.query(
                    `INSERT INTO business_partner_addresses (
                        partner_code,
                        address_name,
                        address_type,
                        country,
                        state_province,
                        county,
                        district,
                        address_line,
                        zip_code
                    ) VALUES (
                        $1, 'Principal', 'Facturación', $2, $3, $4, $5, $6, $7
                    )`,
                    [
                        partnerCode,
                        payload.address_country,
                        payload.address_state_province,
                        payload.address_county,
                        payload.address_zone,
                        payload.address_line,
                        payload.address_zip_code
                    ]
                );

                let partnerId = null;
                if (potentialLines.length) {
                    const partnerRow = await client.query(
                        `SELECT id FROM business_partners WHERE partner_code = $1 LIMIT 1`,
                        [partnerCode]
                    );
                    partnerId = partnerRow.rows[0]?.id || null;
                }

                if (partnerId) {
                    const errors = [];
                    const lineasCalculadas = [];
                    let totalAnual = 0;
                    for (const linea of potentialLines) {
                        const valores = validarLineaPotencial(linea, errors);
                        if (errors.length) break;
                        const monedaLinea = sanitizePartnerCodePrefix(String(linea.moneda || '').trim() || potentialCurrency).slice(0, 10) || potentialCurrency;
                        lineasCalculadas.push({
                            ...valores,
                            producto_nombre: String(linea.producto_nombre || '').trim().slice(0, 200),
                            descripcion: String(linea.descripcion || '').trim().slice(0, 400),
                            unidad_medida: String(linea.unidad_medida || 'unidades').trim().slice(0, 50),
                            moneda: monedaLinea,
                            estacionalidad: String(linea.estacionalidad || 'SIN_ESTACIONALIDAD').trim().toUpperCase().slice(0, 40) || 'SIN_ESTACIONALIDAD',
                            observaciones: String(linea.observaciones || '').trim().slice(0, 400)
                        });
                        totalAnual += valores.valorAnual;
                    }
                    if (errors.length) {
                        throw new Error(`Hay errores en el potencial comercial: ${errors.join(', ')}.`);
                    }
                    const totalAnualFinal = Math.round(totalAnual * 10000) / 10000;
                    const forecast = Math.round(totalAnualFinal * potencialProbabilidad) / 100;
                    await client.query(
                        `INSERT INTO potencial_comercial (
                            partner_id, moneda, potencial_anual_calculado, probabilidad_conversion,
                            forecast_calculado, potencial_inicial_total, forecast_inicial,
                            usuario_creacion, metodo_calculo
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'VOLUMEN_PRECIO_FRECUENCIA')
                        ON CONFLICT (partner_id) DO UPDATE SET
                            potencial_anual_calculado = EXCLUDED.potencial_anual_calculado,
                            probabilidad_conversion = EXCLUDED.probabilidad_conversion,
                            forecast_calculado = EXCLUDED.forecast_calculado,
                            moneda = EXCLUDED.moneda,
                            updated_at = NOW()`,
                        [partnerId, potentialCurrency, totalAnualFinal, potencialProbabilidad, forecast, totalAnualFinal, forecast, usuarioCreacion]
                    );
                    for (const linea of lineasCalculadas) {
                        await client.query(
                            `INSERT INTO potencial_lineas (
                                partner_id, producto_nombre, descripcion, unidad_medida,
                                volumen_estimado, frecuencia, frecuencia_anual, precio_estimado, moneda,
                                estacionalidad, observaciones,
                                valor_estimado_compra, valor_mensual_estimado, valor_anual_estimado,
                                usuario_creacion
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                            [
                                partnerId,
                                linea.producto_nombre,
                                linea.descripcion,
                                linea.unidad_medida,
                                linea.volumen,
                                linea.frecuencia,
                                linea.frecuenciaAnual,
                                linea.precio,
                                linea.moneda,
                                linea.estacionalidad,
                                linea.observaciones,
                                linea.valorCompra,
                                linea.valorMensual,
                                linea.valorAnual,
                                usuarioCreacion
                            ]
                        );
                    }
                }

                return { partnerCode, partnerId };
            });

            if (duplicate?.duplicate) {
                return res.status(409).json({
                    error: `Ya existe el socio ${duplicate.duplicate.partner_code} - ${duplicate.duplicate.partner_name}.`,
                    existing: duplicate.duplicate
                });
            }

            const created = await pgQuery(
                `SELECT
                    partner_code,
                    partner_name,
                    tax_id,
                    email,
                    email_facturacion,
                    currency_code,
                    payment_terms,
                    client_type,
                    estado_socio,
                    creation_date
                 FROM business_partners
                 WHERE partner_code = $1
                 LIMIT 1`,
                [duplicate.partnerCode]
            );

            const socioData = created.rows[0] || { partner_code: duplicate.partnerCode, partner_name: payload.partner_name };
            res.status(201).json({
                socio: socioData,
                message: 'Prospecto creado correctamente.'
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible crear el socio.' });
        }
    });

    app.get('/api/socios/potencial/lista', async (req, res) => {
        try {
            const { rows, total, offset, limit } = await consultarListaPotencial(req, {
                limit: req.query.limit,
                offset: req.query.offset,
                sortKey: req.query.sortKey,
                sortDir: req.query.sortDir,
                withVentas: true
            });
            res.json({ oportunidades: rows, total, offset, limit });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el listado de potencial comercial.' });
        }
    });

app.get('/api/socios/potencial/resumen', async (req, res) => {
        try {
            const scope = await buildScopeSql(req, 'bp', 1);
            const scopeValues = scope.values || [];
            const whereClause = scope.text ? `WHERE 1=1 ${scope.text}` : '';
            const ventasJoin = (await sapInvoicesDisponible()) ? ventasJoinSql() : '';

            const crearConsulta = () => {
                const valoresConsulta = [...scopeValues];
                const bind = (value) => {
                    valoresConsulta.push(value);
                    return `$${valoresConsulta.length}`;
                };
                return { valoresConsulta, bind };
            };

            const agrupadoRes = await (() => {
                const { valoresConsulta, bind } = crearConsulta();
                const sql = `SELECT
                    COUNT(*)::int AS total_oportunidades,
                    COUNT(*) FILTER (WHERE bp.estado_socio = ANY(${bind(ESTADOS_PROSPECTO)}::text[]))::int AS prospectos_activos,
                    COUNT(*) FILTER (WHERE bp.estado_socio = ANY(${bind(ESTADOS_CLIENTE)}::text[]))::int AS clientes_convertidos,
                    COALESCE(SUM(pc.potencial_anual_calculado), 0)::numeric AS potencial_total,
                    COALESCE(SUM(pc.forecast_calculado), 0)::numeric AS forecast_total,
                    COALESCE(SUM(ventas.ventas_total), 0)::numeric AS ventas_total,
                    COALESCE(SUM(ventas.ventas_ultimos_12), 0)::numeric AS ventas_ultimos_12
                 FROM business_partners bp
                 JOIN potencial_comercial pc ON pc.partner_id = bp.id
                 ${ventasJoin}
                 ${whereClause}`;
                return pgQuery(sql, valoresConsulta);
            })();
            const fila = agrupadoRes.rows[0] || {};
            const activos = Number(fila.prospectos_activos || 0);
            const convertidos = Number(fila.clientes_convertidos || 0);
            const baseConversion = activos + convertidos;

            const porMoneda = await (() => {
                const { valoresConsulta } = crearConsulta();
                return pgQuery(`SELECT pc.moneda,
                        COALESCE(SUM(pc.potencial_anual_calculado), 0)::numeric AS potencial,
                        COALESCE(SUM(pc.forecast_calculado), 0)::numeric AS forecast
                   FROM business_partners bp
                   JOIN potencial_comercial pc ON pc.partner_id = bp.id
                   ${whereClause}
                  GROUP BY pc.moneda
                  ORDER BY potencial DESC`, valoresConsulta);
            })();
            const ventasPorMoneda = ventasJoin
                ? (await (() => {
                    const { valoresConsulta } = crearConsulta();
                    return pgQuery(`SELECT pc.moneda,
                            COALESCE(SUM(ventas.ventas_total), 0)::numeric AS ventas,
                            COALESCE(SUM(ventas.ventas_ultimos_12), 0)::numeric AS ventas_ultimos_12
                       FROM business_partners bp
                       JOIN potencial_comercial pc ON pc.partner_id = bp.id
                       ${ventasJoin}
                       ${whereClause}
                      GROUP BY pc.moneda
                      ORDER BY ventas DESC`, valoresConsulta);
                })()).rows
                : [];

            const { rows: oportunidades } = await consultarListaPotencial(req, {
                limit: 15,
                offset: 0,
                sortKey: 'forecast_calculado',
                sortDir: 'desc',
                withVentas: true
            });

            res.json({
                resumen: {
                    totalOportunidades: Number(fila.total_oportunidades || 0),
                    prospectosActivos: activos,
                    clientesConvertidos: convertidos,
                    conversionPct: baseConversion ? Math.round((convertidos / baseConversion) * 1000) / 10 : 0,
                    potencialTotal: Number(fila.potencial_total || 0),
                    forecastTotal: Number(fila.forecast_total || 0),
                    ventasTotales: Number(fila.ventas_total || 0),
                    ventasUltimos12: Number(fila.ventas_ultimos_12 || 0)
                },
                porMoneda: porMoneda.rows,
                ventasPorMoneda,
                oportunidades
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el resumen comercial.' });
        }
    });

    app.get('/api/socios/potencial/reporte', async (req, res) => {
        try {
            const { rows, total } = await consultarListaPotencial(req, {
                limit: 'all',
                offset: 0,
                sortKey: req.query.sortKey || 'potencial_anual_calculado',
                sortDir: req.query.sortDir || 'desc',
                withVentas: true
            });
            res.json({ oportunidades: rows, total });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible generar el reporte de potencial comercial.' });
        }
    });

    app.post('/api/socios/importar-sap', async (req, res) => {
        try {
            const summary = await importSociosFromSap({ limit: req.body?.limit });
            res.json({
                ok: true,
                summary,
                message: `Importación completada. ${summary.inserted} socios nuevos cargados.`
            });
        } catch (error) {
            res.status(400).json({
                ok: false,
                error: error.message || 'No fue posible importar socios desde SAP.'
            });
        }
    });

    app.post('/api/socios/importar-sap/diagnostico', async (req, res) => {
        try {
            const diagnosis = await diagnoseSociosImportFromSap();
            res.json({ ok: true, summary: diagnosis.summary });
        } catch (error) {
            res.status(400).json({
                ok: false,
                error: error.message || 'No fue posible diagnosticar la importación de socios desde SAP.'
            });
        }
    });

    app.delete('/api/socios/:codigo', async (req, res) => {
        try {
            const codigo = String(req.params.codigo || '').trim();
            if (!codigo) {
                return res.status(400).json({ error: 'Codigo de socio invalido.' });
            }
    
            const deleted = await withTransaction(async (client) => {
                const existing = await client.query(
                    `SELECT partner_code, partner_name
                     FROM business_partners
                     WHERE partner_code = $1
                     LIMIT 1`,
                    [codigo]
                );
                if (!existing.rows.length) {
                    return null;
                }
    
                await client.query(`DELETE FROM business_partner_contacts WHERE partner_code = $1`, [codigo]);
                await client.query(`DELETE FROM business_partner_addresses WHERE partner_code = $1`, [codigo]);
                await client.query(`DELETE FROM business_partners WHERE partner_code = $1`, [codigo]);
    
                return existing.rows[0];
            });
    
            if (!deleted) {
                return res.status(404).json({ error: 'Socio no encontrado.' });
            }
    
            res.json({
                ok: true,
                socio: deleted,
                message: `Socio ${deleted.partner_code} eliminado correctamente.`
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible eliminar el socio.' });
        }
    });

    app.post('/api/socios/prune', async (req, res) => {
        try {
            const keepCount = Math.max(1, Math.min(Number(req.body?.keepCount) || 0, 500));
            if (!Number.isFinite(keepCount) || keepCount <= 0) {
                return res.status(400).json({ error: 'Debes indicar cuántos socios deseas conservar.' });
            }
    
            const summary = await withTransaction(async (client) => {
                const totalResult = await client.query(`SELECT COUNT(*)::int AS total FROM business_partners`);
                const totalBefore = Number(totalResult.rows[0]?.total || 0);
    
                const keepResult = await client.query(
                    `SELECT partner_code, partner_name
                       FROM business_partners
                      ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                      LIMIT $1`,
                    [keepCount]
                );
                const keepRows = keepResult.rows || [];
                const keepCodes = keepRows.map((row) => row.partner_code).filter(Boolean);
    
                if (!keepCodes.length && totalBefore > 0) {
                    throw new Error('No fue posible determinar los socios a conservar.');
                }
    
                let deletedContacts = 0;
                let deletedAddresses = 0;
                let deletedPartners = 0;
    
                if (totalBefore > keepCodes.length) {
                    const contactDelete = await client.query(
                        `DELETE FROM business_partner_contacts
                          WHERE partner_code NOT IN (
                            SELECT partner_code
                              FROM business_partners
                             ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                             LIMIT $1
                          )`,
                        [keepCodes.length]
                    );
                    deletedContacts = Number(contactDelete.rowCount || 0);
    
                    const addressDelete = await client.query(
                        `DELETE FROM business_partner_addresses
                          WHERE partner_code NOT IN (
                            SELECT partner_code
                              FROM business_partners
                             ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                             LIMIT $1
                          )`,
                        [keepCodes.length]
                    );
                    deletedAddresses = Number(addressDelete.rowCount || 0);
    
                    const partnerDelete = await client.query(
                        `DELETE FROM business_partners
                          WHERE partner_code NOT IN (
                            SELECT partner_code
                              FROM business_partners
                             ORDER BY partner_name NULLS LAST, partner_code NULLS LAST
                             LIMIT $1
                          )`,
                        [keepCodes.length]
                    );
                    deletedPartners = Number(partnerDelete.rowCount || 0);
                }
    
                return {
                    ok: true,
                    totalBefore,
                    kept: keepRows.length,
                    deleted: deletedPartners,
                    deletedContacts,
                    deletedAddresses,
                    keepCountRequested: keepCount,
                    keptPartners: keepRows
                };
            });
    
            res.json({
                ...summary,
                message: `Se conservaron ${summary.kept} socios y se eliminaron ${summary.deleted}.`
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible depurar los socios.' });
        }
    });

    app.get('/api/socios/:codigo', async (req, res) => {
        try {
            const { codigo } = req.params;
            const partner = await pgQuery(
                `SELECT
                    partner_code, prospect_code, partner_name, salesperson_name, salesperson_user_code, salesperson_sap_code,
                    (SELECT COALESCE(NULLIF(sp.nombre_local, ''), sp.salesperson_name)
                       FROM sap_salesperson_profit_centers sp
                      WHERE business_partners.salesperson_sap_code ~ '^[0-9]+$'
                        AND sp.sales_person_code = business_partners.salesperson_sap_code::int
                      LIMIT 1) AS salesperson_sap_name,
                    tax_id, email,
                    email_facturacion, currency_code, payment_terms, sector, sub_sector,
                    is_tax_exempt, allowed_percentage, client_type, creation_date, sap_modified_date, sap_card_code,
                    tipo_socio, tipo_identificacion, nombre_comercial, estado_socio, clase_cliente,
                    manejo_excedentes, manejo_adelantos, porcentaje_adelantos,
                    manejo_faltantes, porcentaje_faltantes,
                    entrega_muestras, entrega_indicaciones,
                    contacto_vb_tipo, contacto_vb_telefono, contacto_vb_correo, contacto_vb_detalle, contacto_vb_direccion,
                    contacto_producto_tipo, contacto_producto_telefono, contacto_producto_correo, contacto_producto_detalle, contacto_producto_direccion,
                    entrega_muestras_direccion,
                    phone1, phone2, cellular, fax, website, contact_person, notes,
                    vat_group, territory, owner_code, group_code,
                    valid_for, frozen_for, valid_from, valid_to, frozen_from, frozen_to,
                    balance,
                    billing_address, billing_block, billing_zip_code, billing_city,
                    billing_county, billing_country, billing_state, billing_building,
                    shipping_address, shipping_block, shipping_zip_code, shipping_city,
                    shipping_county, shipping_country, shipping_state, shipping_building,
                    bill_to_default, ship_to_default
                 FROM business_partners
                 WHERE partner_code = $1`,
                [codigo]
            );

            if (!partner.rows.length) {
                return res.status(404).json({ error: 'Socio no encontrado.' });
            }

            const contacts = await pgQuery(
                `SELECT id, partner_code, contact_name, first_name, last_name, email, phone, mobile, fax,
                        position, is_legal_representative, country, state_province, county,
                        identification_type,
                        sap_contact_code, phone2, phone3, website, notes, notes2,
                        street, block, zip_code, city
                 FROM business_partner_contacts
                 WHERE partner_code = $1
                 ORDER BY contact_name NULLS LAST, first_name NULLS LAST`,
                [codigo]
            );
    
            const addresses = await pgQuery(
                `SELECT id, partner_code, address_name, address_type, country, state_province, county,
                        district, address_line, zip_code,
                        block, city, building, floor, room, street_number
                 FROM business_partner_addresses
                 WHERE partner_code = $1
                 ORDER BY address_name NULLS LAST`,
                [codigo]
            );
    
            const addressRows = addresses.rows.length ? addresses.rows : buildSyntheticAddressFromPartner(partner.rows[0]);
            res.json({
                socio: partner.rows[0],
                contactos: contacts.rows,
                direcciones: addressRows
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el socio.' });
        }
    });

    app.post('/api/socios/:codigo/crear-sap', async (req, res) => {
        try {
            const codigo = normalizePartnerCode(req.params.codigo);
            if (!codigo) return res.status(400).json({ error: 'Código inválido.' });
            const result = await crearSocioEnSapPorCodigo(codigo);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible crear el socio en SAP.' });
        }
    });

    app.get('/api/socios/:codigo/potencial', async (req, res) => {
        try {
            const codigo = normalizePartnerCode(req.params.codigo);
            if (!codigo) return res.status(400).json({ error: 'Código inválido.' });

            const partner = await pgQuery(
                `SELECT id, partner_code, partner_name, salesperson_name, estado_socio
                   FROM business_partners
                  WHERE partner_code = $1
                  LIMIT 1`,
                [codigo]
            );
            if (!partner.rows.length) {
                return res.status(404).json({ error: 'Socio no encontrado.' });
            }
            const partnerId = partner.rows[0].id;

            const potencial = await pgQuery(
                `SELECT * FROM potencial_comercial WHERE partner_id = $1 LIMIT 1`,
                [partnerId]
            );
            const lineas = await pgQuery(
                `SELECT * FROM potencial_lineas WHERE partner_id = $1 ORDER BY created_at ASC`,
                [partnerId]
            );
            const historial = await pgQuery(
                `SELECT id::text, periodo_inicio, periodo_fin, monto_total, moneda, fuente, referencia, observaciones, created_at
                   FROM historial_ventas
                  WHERE partner_id = $1
                  ORDER BY periodo_inicio DESC`,
                [partnerId]
            );

            let ventas = null;
            if (await sapInvoicesDisponible()) {
                const resultado = await pgQuery(
                    `SELECT
                        COALESCE(SUM(rev.doc_total), 0)::numeric AS ventas_total,
                        COALESCE(SUM(rev.doc_total) FILTER (WHERE rev.es_ultimos_12), 0)::numeric AS ventas_ultimos_12,
                        COALESCE(SUM(rev.doc_total) FILTER (WHERE rev.es_prev_12), 0)::numeric AS ventas_prev_12,
                        COALESCE(SUM(rev.doc_total) FILTER (WHERE rev.es_anio_actual), 0)::numeric AS ventas_anio_actual,
                        COALESCE(SUM(rev.doc_total) FILTER (WHERE rev.es_anio_anterior), 0)::numeric AS ventas_anio_anterior,
                        COUNT(*)::int AS cantidad_facturas,
                        MIN(rev.doc_date) AS primera_factura,
                        MAX(rev.doc_date) AS ultima_factura
                     FROM (
                        SELECT f.doc_total, f.doc_date,
                            CASE WHEN (f.doc_date ~ '^[0-9]{4}-[0-9]{2}' AND f.doc_date >= to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM-DD'))
                                  OR (f.doc_date ~ '^[0-9]{8}$' AND f.doc_date >= to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYYMMDD')) THEN TRUE ELSE FALSE END AS es_ultimos_12,
                            CASE WHEN (f.doc_date ~ '^[0-9]{4}-[0-9]{2}' AND f.doc_date < to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM-DD') AND f.doc_date >= to_char(CURRENT_DATE - INTERVAL '24 months', 'YYYY-MM-DD'))
                                  OR (f.doc_date ~ '^[0-9]{8}$' AND f.doc_date < to_char(CURRENT_DATE - INTERVAL '12 months', 'YYYYMMDD') AND f.doc_date >= to_char(CURRENT_DATE - INTERVAL '24 months', 'YYYYMMDD')) THEN TRUE ELSE FALSE END AS es_prev_12,
                            CASE WHEN (f.doc_date ~ '^[0-9]{4}-[0-9]{2}' AND substring(f.doc_date, 1, 4) = to_char(CURRENT_DATE, 'YYYY'))
                                  OR (f.doc_date ~ '^[0-9]{8}$' AND substring(f.doc_date, 1, 4) = to_char(CURRENT_DATE, 'YYYY')) THEN TRUE ELSE FALSE END AS es_anio_actual,
                            CASE WHEN (f.doc_date ~ '^[0-9]{4}-[0-9]{2}' AND substring(f.doc_date, 1, 4) = to_char(CURRENT_DATE - INTERVAL '1 year', 'YYYY'))
                                  OR (f.doc_date ~ '^[0-9]{8}$' AND substring(f.doc_date, 1, 4) = to_char(CURRENT_DATE - INTERVAL '1 year', 'YYYY')) THEN TRUE ELSE FALSE END AS es_anio_anterior
                        FROM sap_invoices f
                        WHERE UPPER(TRIM(f.card_code)) = UPPER($1)
                     ) rev`,
                    [codigo]
                );
                const fila = resultado.rows[0] || {};
                const ultimos12 = Number(fila.ventas_ultimos_12 || 0);
                const prev12 = Number(fila.ventas_prev_12 || 0);
                ventas = {
                    total: Number(fila.ventas_total || 0),
                    ultimos12,
                    prev12,
                    anioActual: Number(fila.ventas_anio_actual || 0),
                    anioAnterior: Number(fila.ventas_anio_anterior || 0),
                    promedioMensual: Math.round((ultimos12 / 12) * 10000) / 10000,
                    tendencia: Math.round((ultimos12 - prev12) * 10000) / 10000,
                    cantidadFacturas: Number(fila.cantidad_facturas || 0),
                    primeraFactura: fila.primera_factura || '',
                    ultimaFactura: fila.ultima_factura || ''
                };
            }

            res.json({
                potencial: potencial.rows[0] || null,
                lineas: lineas.rows,
                ventas,
                historial: historial.rows,
                socio: {
                    partner_code: codigo,
                    partner_name: partner.rows[0].partner_name,
                    estado_socio: partner.rows[0].estado_socio
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar el potencial comercial del socio.' });
        }
    });

    app.put('/api/socios/:codigo/potencial', async (req, res) => {
        try {
            const codigo = normalizePartnerCode(req.params.codigo);
            const body = req.body || {};
            const toBoolLocal = (v) => v === true || v === 'true' || v === '1';
            if (!codigo) {
                return res.status(400).json({ error: 'Código inválido.' });
            }

            const partner = await pgQuery(
                `SELECT id, partner_code, estado_socio FROM business_partners WHERE partner_code = $1 LIMIT 1`,
                [codigo]
            );
            if (!partner.rows.length) {
                return res.status(404).json({ error: 'Socio no encontrado.' });
            }
            const partnerRow = partner.rows[0];

            const probabilidad = body.probabilidad_conversion !== undefined && body.probabilidad_conversion !== null && body.probabilidad_conversion !== ''
                ? Math.min(100, Math.max(0, Number(body.probabilidad_conversion) || 0))
                : null;
            const hayAjuste = !toBoolLocal(body.eliminar_ajuste) && body.ajuste_monto !== undefined && body.ajuste_monto !== null && body.ajuste_monto !== '';
            const ajusteMonto = hayAjuste ? Math.max(0, Number(body.ajuste_monto) || 0) : null;
            const ajusteMotivo = hayAjuste ? String(body.ajuste_motivo || '').trim().slice(0, 400) : null;
            const usuario = nombreUsuarioRequest(req, '');

            if (probabilidad === null && !hayAjuste && !toBoolLocal(body.eliminar_ajuste)) {
                return res.status(400).json({ error: 'No se recibió un cambio válido para el potencial comercial.' });
            }

            const pcActual = await pgQuery(
                `SELECT * FROM potencial_comercial WHERE partner_id = $1 LIMIT 1`,
                [partnerRow.id]
            );
            const pc = pcActual.rows[0] || null;
            const probFinal = probabilidad !== null ? probabilidad : Number(pc?.probabilidad_conversion || 0);
            const baseCalculado = Number(pc?.potencial_anual_calculado || 0);
            const valorFinal = toBoolLocal(body.eliminar_ajuste)
                ? baseCalculado
                : (ajusteMonto !== null ? ajusteMonto : (pc?.ajuste_monto !== null && pc?.ajuste_monto !== undefined ? Number(pc.ajuste_monto) : baseCalculado));
            const forecast = Math.round(valorFinal * probFinal) / 100;

            if (!pc) {
                await pgQuery(
                    `INSERT INTO potencial_comercial (
                        partner_id, moneda, potencial_anual_calculado, probabilidad_conversion,
                        forecast_calculado, potencial_inicial_total, forecast_inicial, usuario_creacion
                    ) VALUES ($1, $2, 0, $3, $4, 0, $4, $5)`,
                    [partnerRow.id, String(body.moneda || 'USD').slice(0, 10), probFinal, forecast, usuario]
                );
            } else {
                const estadoCliente = ESTADOS_CLIENTE.includes(String(partnerRow.estado_socio || ''));
                await pgQuery(
                    `UPDATE potencial_comercial
                        SET probabilidad_conversion = $2,
                            forecast_calculado = $3,
                            ajuste_monto = $4,
                            ajuste_motivo = $5,
                            ajuste_usuario = CASE WHEN $4::numeric IS NOT NULL THEN $6::text ELSE ajuste_usuario END,
                            ajuste_fecha = CASE WHEN $4::numeric IS NOT NULL THEN NOW() ELSE ajuste_fecha END,
                            fecha_conversion = CASE WHEN $7 AND fecha_conversion IS NULL THEN NOW() ELSE fecha_conversion END,
                            updated_at = NOW()
                      WHERE partner_id = $1`,
                    [partnerRow.id, probFinal, forecast, ajusteMonto, ajusteMotivo, usuario, estadoCliente]
                );
            }

            const actualizado = await pgQuery(
                `SELECT * FROM potencial_comercial WHERE partner_id = $1 LIMIT 1`,
                [partnerRow.id]
            );
            res.json({ potencial: actualizado.rows[0] || null });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible actualizar el potencial comercial.' });
        }
    });

    app.post('/api/socios/:codigo/potencial/lineas', async (req, res) => {
        try {
            const codigo = normalizePartnerCode(req.params.codigo);
            const body = req.body || {};
            const lineaBody = body.linea || body;
            const usuario = nombreUsuarioRequest(req, '');
            if (!codigo) {
                return res.status(400).json({ error: 'Código inválido.' });
            }

            const partner = await pgQuery(
                `SELECT id FROM business_partners WHERE partner_code = $1 LIMIT 1`,
                [codigo]
            );
            if (!partner.rows.length) {
                return res.status(404).json({ error: 'Socio no encontrado.' });
            }
            const partnerId = partner.rows[0].id;

            const errors = [];
            const valores = validarLineaPotencial(lineaBody, errors);
            if (errors.length) {
                return res.status(400).json({ error: `Hay errores en la línea potencial: ${errors.join(', ')}.` });
            }

            const creada = await pgQuery(
                `INSERT INTO potencial_lineas (
                    partner_id, producto_nombre, descripcion, unidad_medida,
                    volumen_estimado, frecuencia, frecuencia_anual, precio_estimado, moneda,
                    estacionalidad, observaciones,
                    valor_estimado_compra, valor_mensual_estimado, valor_anual_estimado,
                    usuario_creacion
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
                [
                    partnerId,
                    String(lineaBody.producto_nombre || '').trim().slice(0, 200),
                    String(lineaBody.descripcion || '').trim().slice(0, 400),
                    String(lineaBody.unidad_medida || 'unidades').trim().slice(0, 50),
                    valores.volumen,
                    valores.frecuencia,
                    valores.frecuenciaAnual,
                    valores.precio,
                    String(lineaBody.moneda || 'COP').trim().toUpperCase().slice(0, 10),
                    String(lineaBody.estacionalidad || 'SIN_ESTACIONALIDAD').trim().toUpperCase().slice(0, 40),
                    String(lineaBody.observaciones || '').trim().slice(0, 400),
                    valores.valorCompra,
                    valores.valorMensual,
                    valores.valorAnual,
                    usuario
                ]
            );

            await pgQuery(
                `INSERT INTO potencial_comercial (partner_id, moneda, usuario_creacion)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (partner_id) DO NOTHING`,
                [partnerId, String(lineaBody.moneda || 'COP').slice(0, 10), usuario]
            );
            const probabilidad = await pgQuery(
                `SELECT COALESCE(probabilidad_conversion, 0)::numeric AS prob FROM potencial_comercial WHERE partner_id = $1`,
                [partnerId]
            );
            await recalcularTotalesPotencial(pgQuery, partnerId, Number(probabilidad.rows[0]?.prob || 0));

            res.status(201).json({ linea: creada.rows[0] || null });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible agregar la línea de potencial.' });
        }
    });

    app.delete('/api/socios/:codigo/potencial/lineas/:lineaId', async (req, res) => {
        try {
            const codigo = normalizePartnerCode(req.params.codigo);
            const lineaId = String(req.params.lineaId || '').trim();
            if (!codigo || !lineaId) {
                return res.status(400).json({ error: 'Parámetros inválidos.' });
            }

            const partner = await pgQuery(
                `SELECT id FROM business_partners WHERE partner_code = $1 LIMIT 1`,
                [codigo]
            );
            if (!partner.rows.length) {
                return res.status(404).json({ error: 'Socio no encontrado.' });
            }
            const partnerId = partner.rows[0].id;

            const eliminada = await pgQuery(
                `DELETE FROM potencial_lineas WHERE id = $1 AND partner_id = $2 RETURNING id`,
                [lineaId, partnerId]
            );
            if (!eliminada.rows.length) {
                return res.status(404).json({ error: 'Línea de potencial no encontrada para este socio.' });
            }

            const probabilidad = await pgQuery(
                `SELECT COALESCE(probabilidad_conversion, 0)::numeric AS prob FROM potencial_comercial WHERE partner_id = $1`,
                [partnerId]
            );
            await recalcularTotalesPotencial(pgQuery, partnerId, Number(probabilidad.rows[0]?.prob || 0));

            res.json({ ok: true });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible eliminar la línea de potencial.' });
        }
    });

    app.put('/api/socios/:codigo', async (req, res) => {
        try {
            const { codigo } = req.params;
            const body = req.body || {};
    
            const partnerResult = await pgQuery(
                `SELECT partner_code, partner_name FROM business_partners WHERE partner_code = $1`,
                [codigo]
            );
    
            if (!partnerResult.rows.length) {
                return res.status(404).json({ error: 'Socio no encontrado.' });
            }
    
            function toBool(v) {
                return v === true || v === 'true' || v === 'sí' || v === 'si' || v === '1' || v === 'yes';
            }
    
            const allowedPct = 'allowedPercentage' in body ? (body.allowedPercentage !== '' ? Number(body.allowedPercentage) : null) : null;
            const adelantosPct = 'adelantosPorcentaje' in body ? (body.adelantosPorcentaje !== '' ? Number(body.adelantosPorcentaje) : null) : null;
            const faltantesPct = 'faltantesPorcentaje' in body ? (body.faltantesPorcentaje !== '' ? Number(body.faltantesPorcentaje) : null) : null;

            await pgQuery(
                `UPDATE business_partners
                 SET salesperson_name = $1,
                     email = $2,
                     email_facturacion = $3,
                     tax_id = $4,
                     currency_code = $5,
                     payment_terms = $6,
                     sector = $7,
                     sub_sector = $8,
                     is_tax_exempt = $9,
                     allowed_percentage = $10,
                     updated_at = NOW(),
                     tipo_socio = COALESCE($11, tipo_socio),
                     tipo_identificacion = COALESCE($12, tipo_identificacion),
                     nombre_comercial = CASE WHEN $13::boolean THEN $14 ELSE nombre_comercial END,
                     manejo_excedentes = CASE WHEN $15::boolean THEN $16 ELSE manejo_excedentes END,
                     manejo_adelantos = CASE WHEN $17::boolean THEN $18 ELSE manejo_adelantos END,
                     porcentaje_adelantos = CASE WHEN $19::boolean THEN $20 ELSE porcentaje_adelantos END,
                     manejo_faltantes = CASE WHEN $21::boolean THEN $22 ELSE manejo_faltantes END,
                     porcentaje_faltantes = CASE WHEN $23::boolean THEN $24 ELSE porcentaje_faltantes END,
                     entrega_muestras = CASE WHEN $25::boolean THEN $26 ELSE entrega_muestras END,
                     entrega_indicaciones = CASE WHEN $27::boolean THEN $28 ELSE entrega_indicaciones END,
                     contacto_vb_tipo = CASE WHEN $29::boolean THEN $30 ELSE contacto_vb_tipo END,
                     contacto_vb_telefono = CASE WHEN $31::boolean THEN $32 ELSE contacto_vb_telefono END,
                     contacto_vb_correo = CASE WHEN $33::boolean THEN $34 ELSE contacto_vb_correo END,
                     contacto_vb_detalle = CASE WHEN $35::boolean THEN $36 ELSE contacto_vb_detalle END,
                     contacto_producto_tipo = CASE WHEN $37::boolean THEN $38 ELSE contacto_producto_tipo END,
                     contacto_producto_telefono = CASE WHEN $39::boolean THEN $40 ELSE contacto_producto_telefono END,
                     contacto_producto_correo = CASE WHEN $41::boolean THEN $42 ELSE contacto_producto_correo END,
                     contacto_producto_detalle = CASE WHEN $43::boolean THEN $44 ELSE contacto_producto_detalle END,
                     salesperson_user_code = CASE WHEN $45::boolean THEN $46 ELSE salesperson_user_code END,
                     salesperson_sap_code = CASE WHEN $47::boolean THEN $48 ELSE salesperson_sap_code END,
                     valid_for = CASE WHEN $49::boolean THEN $50 ELSE valid_for END
                 WHERE partner_code = $51`,
                [
                    'salesperson' in body ? (body.salesperson || null) : null,
                    'generalEmail' in body ? (body.generalEmail || null) : null,
                    'invoiceEmail' in body ? (body.invoiceEmail || null) : null,
                    'taxId' in body ? (body.taxId || null) : null,
                    'currencyCode' in body ? (body.currencyCode || null) : null,
                    'paymentTerms' in body ? (body.paymentTerms || null) : null,
                    'sector' in body ? (body.sector || null) : null,
                    'subSector' in body ? (body.subSector || null) : null,
                    toBool(body.taxExempt),
                    allowedPct,
                    'tipoSocio' in body ? (body.tipoSocio || null) : null,
                    'tipoIdentificacion' in body ? (body.tipoIdentificacion || null) : null,
                    'nombreComercial' in body, 'nombreComercial' in body ? (body.nombreComercial || null) : null,
                    'manejoExcedentes' in body, 'manejoExcedentes' in body ? (body.manejoExcedentes || null) : null,
                    'manejoAdelantos' in body, 'manejoAdelantos' in body ? (body.manejoAdelantos || null) : null,
                    'adelantosPorcentaje' in body, adelantosPct,
                    'manejoFaltantes' in body, 'manejoFaltantes' in body ? (body.manejoFaltantes || null) : null,
                    'faltantesPorcentaje' in body, faltantesPct,
                    'entregaMuestras' in body, 'entregaMuestras' in body ? (body.entregaMuestras || null) : null,
                    'indicacionesEntrega' in body, 'indicacionesEntrega' in body ? (body.indicacionesEntrega || null) : null,
                    'contactoVB' in body, 'contactoVB' in body ? (body.contactoVB || null) : null,
                    'contactoVBTelefono' in body, 'contactoVBTelefono' in body ? (body.contactoVBTelefono || null) : null,
                    'contactoVBCorreo' in body, 'contactoVBCorreo' in body ? (body.contactoVBCorreo || null) : null,
                    'indicacionesVB' in body, 'indicacionesVB' in body ? (body.indicacionesVB || null) : null,
                    'contactoProducto' in body, 'contactoProducto' in body ? (body.contactoProducto || null) : null,
                    'contactoProductoTelefono' in body, 'contactoProductoTelefono' in body ? (body.contactoProductoTelefono || null) : null,
                    'contactoProductoCorreo' in body, 'contactoProductoCorreo' in body ? (body.contactoProductoCorreo || null) : null,
                    'indicacionesProducto' in body, 'indicacionesProducto' in body ? (body.indicacionesProducto || null) : null,
                    'salespersonUserCode' in body, 'salespersonUserCode' in body ? (body.salespersonUserCode || null) : null,
                    'salespersonSapCode' in body, 'salespersonSapCode' in body ? (body.salespersonSapCode || null) : null,
                    'activo' in body, 'activo' in body ? (toBool(body.activo) ? 'Y' : 'N') : null,
                    codigo
                ]
            );

            // Direcciones de entrega del socio (Visto Bueno / Producto / Muestras).
            // UPDATE dedicado para no reindexar la consulta posicional de arriba;
            // solo escribe la columna cuando la clave viene en el body.
            await pgQuery(
                `UPDATE business_partners
                    SET contacto_vb_direccion = CASE WHEN $2::boolean THEN $3 ELSE contacto_vb_direccion END,
                        contacto_producto_direccion = CASE WHEN $4::boolean THEN $5 ELSE contacto_producto_direccion END,
                        entrega_muestras_direccion = CASE WHEN $6::boolean THEN $7 ELSE entrega_muestras_direccion END,
                        sap_card_code = CASE WHEN $8::boolean THEN $9 ELSE sap_card_code END
                  WHERE partner_code = $1`,
                [
                    codigo,
                    'contactoVBDireccion' in body, 'contactoVBDireccion' in body ? (body.contactoVBDireccion || null) : null,
                    'contactoProductoDireccion' in body, 'contactoProductoDireccion' in body ? (body.contactoProductoDireccion || null) : null,
                    'entregaMuestrasDireccion' in body, 'entregaMuestrasDireccion' in body ? (body.entregaMuestrasDireccion || null) : null,
                    'sapCardCode' in body, 'sapCardCode' in body ? (String(body.sapCardCode || '').trim() || null) : null
                ]
            );

            const contactsResult = await pgQuery(
                `SELECT id FROM business_partner_contacts WHERE partner_code = $1 ORDER BY id LIMIT 1`,
                [codigo]
            );
    
            if (contactsResult.rows.length) {
                const contactId = contactsResult.rows[0].id;
    
                await pgQuery(
                    `UPDATE business_partner_contacts
                     SET first_name = $1,
                         last_name = $2,
                         email = $3,
                         phone = $4,
                         mobile = $5,
                         fax = $6,
                         is_legal_representative = $7,
                         country = $8,
                         state_province = $9,
                         county = $10,
                         identification_type = COALESCE($11, identification_type)
                     WHERE id = $12`,
                    [
                        'contactFirstName' in body ? (body.contactFirstName || null) : null,
                        'contactLastName' in body ? (body.contactLastName || null) : null,
                        'contactEmail' in body ? (body.contactEmail || null) : null,
                        'contactPhone' in body ? (body.contactPhone || null) : null,
                        'contactMobile' in body ? (body.contactMobile || null) : null,
                        'contactFax' in body ? (body.contactFax || null) : null,
                        toBool(body.contactLegalRepresentative),
                        'contactCountry' in body ? (body.contactCountry || null) : null,
                        'contactState' in body ? (body.contactState || null) : null,
                        'contactCounty' in body ? (body.contactCounty || null) : null,
                        'contactIdentificationType' in body ? (body.contactIdentificationType || null) : null,
                        contactId
                    ]
                );
            }

            const updated = await pgQuery(
                `SELECT partner_code, partner_name, salesperson_name, salesperson_user_code, salesperson_sap_code, tax_id, email, email_facturacion,
                        currency_code, payment_terms, sector, sub_sector, is_tax_exempt, allowed_percentage,
                        client_type, creation_date,
                        tipo_socio, tipo_identificacion, nombre_comercial, estado_socio,
                        manejo_excedentes, manejo_adelantos, porcentaje_adelantos,
                        manejo_faltantes, porcentaje_faltantes,
                        entrega_muestras, entrega_indicaciones,
                        contacto_vb_tipo, contacto_vb_telefono, contacto_vb_correo, contacto_vb_detalle,
                        contacto_producto_tipo, contacto_producto_telefono, contacto_producto_correo, contacto_producto_detalle
                 FROM business_partners WHERE partner_code = $1`,
                [codigo]
            );
    
            res.json({ socio: updated.rows[0], message: 'Socio actualizado correctamente.' });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible actualizar el socio.' });
        }
    });

    app.get('/api/socios/:codigo/contactos', async (req, res) => {
        try {
            const result = await pgQuery(
                `SELECT id, partner_code, contact_name, first_name, last_name, email, phone, mobile, fax,
                        position, is_legal_representative, country, state_province, county
                 FROM business_partner_contacts
                 WHERE partner_code = $1
                 ORDER BY contact_name NULLS LAST, first_name NULLS LAST`,
                [req.params.codigo]
            );
    
            res.json({ contactos: result.rows, total: result.rows.length });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar los contactos del socio.' });
        }
    });

    app.post('/api/socios/:codigo/contactos', async (req, res) => {
        try {
            const { codigo } = req.params;
            const body = req.body || {};
            const exists = await pgQuery(`SELECT 1 FROM business_partners WHERE partner_code = $1`, [codigo]);
            if (!exists.rows.length) {
                return res.status(404).json({ error: 'Socio no encontrado.' });
            }
            const result = await pgQuery(
                `INSERT INTO business_partner_contacts
                    (partner_code, contact_name, first_name, last_name, email, phone, mobile, fax,
                     position, is_legal_representative, country, state_province, county, identification_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 RETURNING id`,
                [
                    codigo,
                    body.contactName || null,
                    body.firstName || null,
                    body.lastName || null,
                    body.email || null,
                    body.phone || null,
                    body.mobile || null,
                    body.fax || null,
                    body.position || null,
                    toBool(body.isLegalRepresentative),
                    body.country || null,
                    body.stateProvince || null,
                    body.county || null,
                    body.identificationType || null
                ]
            );
            if (toBool(body.guardarComoPrincipal)) {
                const mainContact = await pgQuery(
                    `SELECT id FROM business_partner_contacts WHERE partner_code = $1 ORDER BY contact_name NULLS LAST, first_name NULLS LAST LIMIT 1`,
                    [codigo]
                );
                if (mainContact.rows.length) {
                    await pgQuery(
                        `UPDATE business_partner_contacts
                         SET contact_name = $1, first_name = $2, last_name = $3, email = $4, phone = $5
                         WHERE id = $6`,
                        [
                            body.contactName || null,
                            body.contactName || null,
                            null,
                            body.email || null,
                            body.phone || null,
                            mainContact.rows[0].id
                        ]
                    );
                }
            }
            res.json({ contacto: { id: result.rows[0].id }, message: 'Contacto creado correctamente.' });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible crear el contacto.' });
        }
    });

    app.put('/api/socios/:codigo/contactos/:contactoId', async (req, res) => {
        try {
            const { codigo, contactoId } = req.params;
            const body = req.body || {};
            const exists = await pgQuery(`SELECT 1 FROM business_partner_contacts WHERE id = $1 AND partner_code = $2`, [contactoId, codigo]);
            if (!exists.rows.length) {
                return res.status(404).json({ error: 'Contacto no encontrado.' });
            }
            await pgQuery(
                `UPDATE business_partner_contacts
                 SET contact_name = COALESCE($1, contact_name),
                     first_name = COALESCE($2, first_name),
                     last_name = COALESCE($3, last_name),
                     email = COALESCE($4, email),
                     phone = COALESCE($5, phone),
                     mobile = COALESCE($6, mobile),
                     fax = COALESCE($7, fax),
                     position = COALESCE($8, position),
                     is_legal_representative = COALESCE($9, is_legal_representative),
                     country = COALESCE($10, country),
                     state_province = COALESCE($11, state_province),
                     county = COALESCE($12, county),
                     identification_type = COALESCE($13, identification_type)
                 WHERE id = $14`,
                [
                    body.contactName ?? null,
                    body.firstName ?? null,
                    body.lastName ?? null,
                    body.email ?? null,
                    body.phone ?? null,
                    body.mobile ?? null,
                    body.fax ?? null,
                    body.position ?? null,
                    body.isLegalRepresentative == null ? null : toBool(body.isLegalRepresentative),
                    body.country ?? null,
                    body.stateProvince ?? null,
                    body.county ?? null,
                    body.identificationType ?? null,
                    contactoId
                ]
            );
            res.json({ message: 'Contacto actualizado correctamente.' });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible actualizar el contacto.' });
        }
    });

    app.delete('/api/socios/:codigo/contactos/:contactoId', async (req, res) => {
        try {
            const { codigo, contactoId } = req.params;
            const firstRow = await pgQuery(
                `SELECT id FROM business_partner_contacts
                 WHERE partner_code = $1
                 ORDER BY contact_name NULLS LAST, first_name NULLS LAST
                 LIMIT 1`,
                [codigo]
            );
            if (firstRow.rows.length && String(firstRow.rows[0].id) === String(contactoId)) {
                return res.status(400).json({ error: 'El contacto principal no puede eliminarse.' });
            }
            const result = await pgQuery(
                `DELETE FROM business_partner_contacts WHERE id = $1 AND partner_code = $2 RETURNING id`,
                [contactoId, codigo]
            );
            if (!result.rows.length) {
                return res.status(404).json({ error: 'Contacto no encontrado.' });
            }
            res.json({ message: 'Contacto eliminado correctamente.' });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible eliminar el contacto.' });
        }
    });

    app.get('/api/socios/:codigo/direcciones', async (req, res) => {
        try {
            const result = await pgQuery(
                `SELECT id, partner_code, address_name, address_type, country, state_province, county,
                        district, address_line, zip_code
                 FROM business_partner_addresses
                 WHERE partner_code = $1
                 ORDER BY address_name NULLS LAST`,
                [req.params.codigo]
            );
    
            const partner = await pgQuery(`SELECT partner_code, partner_name, direccion FROM business_partners WHERE partner_code = $1`, [req.params.codigo]);
            const addressRows = result.rows.length ? result.rows : (partner.rows.length ? buildSyntheticAddressFromPartner(partner.rows[0]) : []);
            res.json({ direcciones: addressRows, total: addressRows.length });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible cargar las direcciones del socio.' });
        }
    });

    app.post('/api/socios/:codigo/direcciones', async (req, res) => {
        try {
            const { codigo } = req.params;
            const body = req.body || {};
            const exists = await pgQuery(`SELECT 1 FROM business_partners WHERE partner_code = $1`, [codigo]);
            if (!exists.rows.length) {
                return res.status(404).json({ error: 'Socio no encontrado.' });
            }
            const result = await pgQuery(
                `INSERT INTO business_partner_addresses
                    (partner_code, address_name, address_type, country, state_province, county, district, address_line, zip_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id`,
                [
                    codigo,
                    body.addressName || null,
                    body.addressType || null,
                    body.country || null,
                    body.stateProvince || null,
                    body.county || null,
                    body.district || null,
                    body.addressLine || null,
                    body.zipCode || null
                ]
            );
            res.json({ direccion: { id: result.rows[0].id }, message: 'Dirección creada correctamente.' });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible crear la dirección.' });
        }
    });

    app.put('/api/socios/:codigo/direcciones/:direccionId', async (req, res) => {
        try {
            const { codigo, direccionId } = req.params;
            const body = req.body || {};
            const exists = await pgQuery(`SELECT 1 FROM business_partner_addresses WHERE id = $1 AND partner_code = $2`, [direccionId, codigo]);
            if (!exists.rows.length) {
                return res.status(404).json({ error: 'Dirección no encontrada.' });
            }
            await pgQuery(
                `UPDATE business_partner_addresses
                 SET address_name = COALESCE($1, address_name),
                     address_type = COALESCE($2, address_type),
                     country = COALESCE($3, country),
                     state_province = COALESCE($4, state_province),
                     county = COALESCE($5, county),
                     district = COALESCE($6, district),
                     address_line = COALESCE($7, address_line),
                     zip_code = COALESCE($8, zip_code)
                 WHERE id = $9`,
                [
                    body.addressName ?? null,
                    body.addressType ?? null,
                    body.country ?? null,
                    body.stateProvince ?? null,
                    body.county ?? null,
                    body.district ?? null,
                    body.addressLine ?? null,
                    body.zipCode ?? null,
                    direccionId
                ]
            );
            res.json({ message: 'Dirección actualizada correctamente.' });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible actualizar la dirección.' });
        }
    });

    app.delete('/api/socios/:codigo/direcciones/:direccionId', async (req, res) => {
        try {
            const { codigo, direccionId } = req.params;
            const firstRow = await pgQuery(
                `SELECT id FROM business_partner_addresses
                 WHERE partner_code = $1
                 ORDER BY address_name NULLS LAST
                 LIMIT 1`,
                [codigo]
            );
            if (firstRow.rows.length && String(firstRow.rows[0].id) === String(direccionId)) {
                return res.status(400).json({ error: 'La dirección principal no puede eliminarse.' });
            }
            const result = await pgQuery(
                `DELETE FROM business_partner_addresses WHERE id = $1 AND partner_code = $2 RETURNING id`,
                [direccionId, codigo]
            );
            if (!result.rows.length) {
                return res.status(404).json({ error: 'Dirección no encontrada.' });
            }
            res.json({ message: 'Dirección eliminada correctamente.' });
        } catch (error) {
            res.status(500).json({ error: error.message || 'No fue posible eliminar la dirección.' });
        }
    });

}

module.exports = { registerSociosRoutes, crearSocioEnSapPorCodigo, actualizarSocioEnSapPorCodigo, normalizePartnerCode, nombreUsuarioRequest };
