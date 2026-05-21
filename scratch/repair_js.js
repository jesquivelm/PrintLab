const fs = require('fs');
const path = 'c:/ERP Impresion/Codexv13/public/cotizaciones.js';

let content = fs.readFileSync(path, 'utf8');

// Buscamos el último punto conocido antes del daño
const anchor = "'REQ | Medida Fija': normalizeText(fixedSizeSelect?.value),";
const part1 = content.split(anchor)[0] + anchor;

// Definimos lo que falta de collectRequestPayload y la nueva función validateQuickRequest
const middlePart = `
            'REQ | Numeracion Aviso': numbering ? 'Revisar proceso adicional de impresion para numerado.' : '',
            'Estado_UI': {
                productType: normalizeText(document.getElementById('requestProductType')?.value),
                dieShape: selectedShape,
                widthInches: Number(selectedSize?.dataset.width || 0) || null,
                lengthInches: Number(selectedSize?.dataset.length || 0) || null
            }
        }
    };
}

function validateQuickRequest(forAdvanced) {
    const payload = collectRequestPayload();
    const errors = [];
    
    form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    if (launcherErrors) launcherErrors.hidden = true;

    const check = (value, el, name) => {
        if (!value) {
            el?.classList.add('is-invalid');
            errors.push(name);
        }
    };

    check(payload.customer_name, customerNameInput, 'Nombre del socio');
    check(payload.job_name, document.getElementById('requestJobName'), 'Nombre del producto');
    check(payload.quantity, document.getElementById('requestQuantity'), 'Cantidad');

    if (!forAdvanced) {
        check(payload.process_type, document.getElementById('requestProcessType'), 'Proceso productivo');
        check(payload.material_name, materialInput, 'Material');
        check(payload.applicationType, surfaceInput, 'Superficie de aplicación');
        check(fixedSizeSelect?.value, fixedSizeSelect, 'Medida');
    }

    if (errors.length > 0) {
        if (launcherErrors && launcherErrorsList) {
            const rect = launcherWrap.getBoundingClientRect();
            launcherErrors.classList.toggle('is-below', rect.top < (window.innerHeight / 2));
            launcherErrorsList.innerHTML = errors.map(err => \`<li class="process-launcher-errors-item">\${err}</li>\`).join('');
            launcherErrors.hidden = false;
        }
        throw new Error('Por favor, completa los campos requeridos.');
    }
    return payload;
}
`;

// Buscamos el inicio de la siguiente función válida
const restAnchor = "async function uploadPendingAttachments";
const part2 = content.substring(content.indexOf(restAnchor));

// Reconstruimos el archivo completo
const finalContent = part1 + middlePart + "\n" + part2;

// También nos aseguramos de añadir el evento de clic si no está (limpiamos duplicados posibles)
let cleanedContent = finalContent;
const clickEvent = `
    launcherErrors?.addEventListener('click', () => {
        launcherErrors.hidden = true;
    });`;

if (!cleanedContent.includes(clickEvent)) {
    cleanedContent = cleanedContent.replace("if (!event.target.closest('#processLauncherStack')) toggleProcessLauncher(false);", 
        "if (!event.target.closest('#processLauncherStack')) toggleProcessLauncher(false);" + clickEvent);
}

fs.writeFileSync(path, cleanedContent, 'utf8');
console.log("Reconstrucción completada correctamente.");
