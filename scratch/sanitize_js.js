const fs = require('fs');
const path = 'c:/ERP Impresion/Codexv13/public/cotizaciones.js';

let content = fs.readFileSync(path, 'utf8');

// Buscamos la primera ocurrencia de la constante inicial para identificar el bloque principal
const startMarker = "const CONFIG_ENDPOINT";
const parts = content.split(startMarker);

// Reconstruimos el archivo usando solo la primera parte común y la estructura básica
// En este caso, como se duplicó, vamos a tomar el contenido hasta donde empieza la duplicación
// El punto de corte ideal es justo antes de que se repita la función 'uploadPendingAttachments' o las constantes iniciales

const cleanupMarker = "async function uploadPendingAttachments";
const mainParts = content.split(cleanupMarker);

// Tomamos todo lo que está antes de la primera función uploadPendingAttachments
// Añadimos la función limpia y el resto del archivo original SÓLO una vez.

// Dado que el archivo está muy mezclado, la forma más segura es buscar el final de bindEvents 
// y cortar todo lo que venga después que sea repetido.

const bindEventsEnd = "window.addEventListener('beforeunload'";
const finalSectors = content.split(bindEventsEnd);

// La estructura correcta termina después del bloque de init y la llamada final.
// Vamos a reconstruir el contenido base.

let sanitized = finalSectors[0] + bindEventsEnd + finalSectors[1].split("}")[0] + "}\n}\n" + // Cierre de listener y de bindEvents
`
async function init() {
    renderAttachments();
    bindEvents();
    syncToggleChipState();
    await Promise.all([loadConfig(), loadQuotes()]);

    const savedPos = localStorage.getItem(LAUNCHER_POSITION_KEY);
    if (savedPos && launcherWrap) {
        try {
            const pos = JSON.parse(savedPos);
            if (typeof pos.x === 'number' && typeof pos.y === 'number') {
                launcherWrap.style.left = \`\${pos.x}px\`;
                launcherWrap.style.top = \`\${pos.y}px\`;
                launcherWrap.style.right = 'auto';
                launcherWrap.style.bottom = 'auto';
            }
        } catch (e) {
            console.error('No fue posible restaurar posicion del launcher.', e);
        }
    }

    if (new URLSearchParams(window.location.search).get('openModal') === '1') {
        openPopover();
    }
}

init().catch((error) => {
    console.error(error);
    setStatus(error.message || 'No fue posible inicializar cotizaciones.', 'error');
});
`;

fs.writeFileSync(path, sanitized, 'utf8');
console.log("Saneamiento completado.");
