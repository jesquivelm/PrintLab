function tokenFromUrl() {
    const match = window.location.pathname.match(/\/finanzas\/solicitud\/([^/]+)/);
    return match ? match[1] : '';
}

const token = tokenFromUrl();
const loadingEl = document.getElementById('finanzasSolicitudLoading');
const errorEl = document.getElementById('finanzasSolicitudError');
const contentEl = document.getElementById('finanzasSolicitudContent');
const accionesEl = document.getElementById('finanzasSolicitudAccionesPendiente');
const resueltoEl = document.getElementById('finanzasSolicitudResuelto');
const motivoField = document.getElementById('finanzasSolicitudMotivoField');
const motivoInput = document.getElementById('finanzasSolicitudMotivo');
const resueltoPorInput = document.getElementById('finanzasSolicitudResueltoPor');
const aprobarBtn = document.getElementById('finanzasSolicitudAprobarBtn');
const rechazarBtn = document.getElementById('finanzasSolicitudRechazarBtn');
const accionStatus = document.getElementById('finanzasSolicitudAccionStatus');

function formatBytes(bytes) {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

function mostrarError(mensaje) {
    loadingEl.hidden = true;
    contentEl.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = mensaje;
}

async function cargarSolicitud() {
    if (!token) {
        mostrarError('Enlace inválido.');
        return;
    }
    try {
        const response = await fetch(`/api/finanzas/solicitud/${encodeURIComponent(token)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No fue posible cargar la solicitud.');
        renderSolicitud(data);
    } catch (error) {
        mostrarError(error.message || 'No fue posible cargar la solicitud.');
    }
}

function renderSolicitud(data) {
    loadingEl.hidden = true;
    contentEl.hidden = false;

    const socio = data.socio || {};
    document.getElementById('finanzasSolicitudPartnerName').textContent = socio.nombre_comercial || socio.partner_name || '';
    document.getElementById('finanzasSolicitudPartnerCode').textContent = socio.partner_code || '';
    document.getElementById('finanzasSolicitudTaxId').textContent = `${socio.tipo_identificacion || ''} ${socio.tax_id || ''}`.trim() || '-';

    const contacto = data.contacto || {};
    document.getElementById('finanzasSolicitudContacto').textContent = contacto.contact_name || '-';
    document.getElementById('finanzasSolicitudCorreoTelefono').textContent = [contacto.email || socio.email_facturacion || socio.email, contacto.mobile || contacto.phone].filter(Boolean).join(' / ') || '-';

    const direccion = data.direccion || {};
    document.getElementById('finanzasSolicitudDireccion').textContent = [direccion.address_line, direccion.county, direccion.state_province, direccion.country].filter(Boolean).join(', ') || '-';

    const pill = document.getElementById('finanzasSolicitudEstadoPill');
    const estado = data.solicitud?.estado || 'PENDIENTE';
    pill.textContent = estado === 'PENDIENTE' ? 'Pendiente de revisión' : (estado === 'APROBADA' ? 'Aprobada' : 'Rechazada');
    pill.className = `finanzas-solicitud-pill ${estado.toLowerCase()}`;

    const docsList = document.getElementById('finanzasSolicitudDocsList');
    docsList.innerHTML = '';
    (data.documentos || []).forEach((doc) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${doc.etiqueta}</span><a href="${doc.url}" target="_blank" rel="noopener">Descargar${doc.tamanoBytes ? ' (' + formatBytes(doc.tamanoBytes) + ')' : ''}</a>`;
        docsList.appendChild(li);
    });

    if (estado === 'PENDIENTE') {
        accionesEl.hidden = false;
        resueltoEl.hidden = true;
    } else {
        accionesEl.hidden = true;
        resueltoEl.hidden = false;
        const cuando = data.solicitud?.resueltoEn ? new Date(data.solicitud.resueltoEn).toLocaleString('es-GT') : '';
        resueltoEl.textContent = estado === 'APROBADA'
            ? `Aprobada por ${data.solicitud?.resueltoPor || ''} el ${cuando}.`
            : `Rechazada por ${data.solicitud?.resueltoPor || ''} el ${cuando}. Motivo: ${data.solicitud?.motivoRechazo || ''}`;
    }
}

rechazarBtn?.addEventListener('click', () => {
    if (motivoField.hidden) {
        motivoField.hidden = false;
        motivoInput.focus();
        rechazarBtn.textContent = 'Confirmar rechazo';
        return;
    }
    confirmarRechazo();
});

aprobarBtn?.addEventListener('click', async () => {
    const resueltoPor = resueltoPorInput.value.trim();
    if (!resueltoPor) {
        accionStatus.textContent = 'Indica tu nombre para continuar.';
        return;
    }
    if (!window.confirm('¿Confirmas aprobar esta solicitud y crear el cliente en SAP?')) return;
    aprobarBtn.disabled = true;
    rechazarBtn.disabled = true;
    accionStatus.textContent = 'Procesando...';
    try {
        const response = await fetch(`/api/finanzas/solicitud/${encodeURIComponent(token)}/aprobar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resueltoPor })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No fue posible aprobar la solicitud.');
        accionStatus.textContent = `Aprobada. CardCode: ${data.cardCode || '(sin CardCode)'}`;
        window.setTimeout(cargarSolicitud, 800);
    } catch (error) {
        accionStatus.textContent = error.message || 'No fue posible aprobar la solicitud.';
        aprobarBtn.disabled = false;
        rechazarBtn.disabled = false;
    }
});

async function confirmarRechazo() {
    const resueltoPor = resueltoPorInput.value.trim();
    const motivo = motivoInput.value.trim();
    if (!resueltoPor) {
        accionStatus.textContent = 'Indica tu nombre para continuar.';
        return;
    }
    if (!motivo) {
        accionStatus.textContent = 'Indica el motivo del rechazo.';
        return;
    }
    aprobarBtn.disabled = true;
    rechazarBtn.disabled = true;
    accionStatus.textContent = 'Procesando...';
    try {
        const response = await fetch(`/api/finanzas/solicitud/${encodeURIComponent(token)}/rechazar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resueltoPor, motivo })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No fue posible rechazar la solicitud.');
        accionStatus.textContent = 'Solicitud rechazada.';
        window.setTimeout(cargarSolicitud, 800);
    } catch (error) {
        accionStatus.textContent = error.message || 'No fue posible rechazar la solicitud.';
        aprobarBtn.disabled = false;
        rechazarBtn.disabled = false;
    }
}

cargarSolicitud();
