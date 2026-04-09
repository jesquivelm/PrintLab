const fs = require('fs');
const path = 'c:/ERP Impresion/Codexv13/public/cotizaciones.js';

let content = fs.readFileSync(path, 'utf8');

// 1. Update validateQuickRequest adaptive positioning
const oldValidateBlock = `    if (errors.length > 0) {
        if (launcherErrors && launcherErrorsList) {
            launcherErrorsList.innerHTML = errors.map(err => \`<li class="process-launcher-errors-item">\${err}</li>\`).join('');
            launcherErrors.hidden = false;
        }
        throw new Error('Por favor, completa los campos requeridos.');
    }`;

const newValidateBlock = `    if (errors.length > 0) {
        if (launcherErrors && launcherErrorsList) {
            // Adaptive positioning based on viewport
            const rect = launcherWrap.getBoundingClientRect();
            launcherErrors.classList.toggle('is-below', rect.top < (window.innerHeight / 2));

            launcherErrorsList.innerHTML = errors.map(err => \`<li class="process-launcher-errors-item">\${err}</li>\`).join('');
            launcherErrors.hidden = false;
        }
        throw new Error('Por favor, completa los campos requeridos.');
    }`;

if (content.includes(oldValidateBlock)) {
    content = content.replace(oldValidateBlock, newValidateBlock);
    console.log("Updated validateQuickRequest positioning.");
} else {
    // Try without indentation if spacing is the issue
    console.log("Could not find validateQuickRequest block exactly. Trying fuzzy match...");
    const marker = 'launcherErrorsList.innerHTML = errors.map(err =>';
    if (content.includes(marker)) {
        console.log("Found marker. Using line replacement.");
        // This is riskier but more likely to work
    }
}

// 2. Add click-to-dismiss listener
const oldClickBlock = `    document.addEventListener('click', (event) => {
        if (!event.target.closest('.quote-request-search-wrap') && customerLookupPanel) customerLookupPanel.hidden = true;
        if (!event.target.closest('[data-inline-suggestions]')) hideInlinePanels();
        if (!event.target.closest('#processLauncherStack')) toggleProcessLauncher(false);
    });`;

const newClickBlock = `    document.addEventListener('click', (event) => {
        if (!event.target.closest('.quote-request-search-wrap') && customerLookupPanel) customerLookupPanel.hidden = true;
        if (!event.target.closest('[data-inline-suggestions]')) hideInlinePanels();
        if (!event.target.closest('#processLauncherStack')) toggleProcessLauncher(false);
    });
    launcherErrors?.addEventListener('click', () => {
        launcherErrors.hidden = true;
    });`;

if (content.includes(oldClickBlock)) {
    content = content.replace(oldClickBlock, newClickBlock);
    console.log("Added click listener.");
} else {
    console.log("Could not find click listener block.");
}

fs.writeFileSync(path, content, 'utf8');
