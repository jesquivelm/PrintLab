import os

file_path = r'c:\ERP Impresion\Codexv13\public\cotizaciones.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Update validateQuickRequest adaptive positioning
old_validate_block = """    if (errors.length > 0) {
        if (launcherErrors && launcherErrorsList) {
            launcherErrorsList.innerHTML = errors.map(err => `<li class="process-launcher-errors-item">${err}</li>`).join('');
            launcherErrors.hidden = false;
        }
        throw new Error('Por favor, completa los campos requeridos.');
    }"""

new_validate_block = """    if (errors.length > 0) {
        if (launcherErrors && launcherErrorsList) {
            // Adaptive positioning based on viewport
            const rect = launcherWrap.getBoundingClientRect();
            launcherErrors.classList.toggle('is-below', rect.top < (window.innerHeight / 2));

            launcherErrorsList.innerHTML = errors.map(err => `<li class="process-launcher-errors-item">${err}</li>`).join('');
            launcherErrors.hidden = false;
        }
        throw new Error('Por favor, completa los campos requeridos.');
    }"""

if old_validate_block in content:
    content = content.replace(old_validate_block, new_validate_block)
    print("Updated validateQuickRequest positioning.")
else:
    # Try with CRLF just in case
    old_crlf = old_validate_block.replace('\\n', '\\r\\n')
    if old_crlf in content:
        content = content.replace(old_crlf, new_validate_block.replace('\\n', '\\r\\n'))
        print("Updated validateQuickRequest positioning (CRLF).")
    else:
        print("Could not find validateQuickRequest block.")

# 2. Add click-to-dismiss listener
old_click_block = """    document.addEventListener('click', (event) => {
        if (!event.target.closest('.quote-request-search-wrap') && customerLookupPanel) customerLookupPanel.hidden = true;
        if (!event.target.closest('[data-inline-suggestions]')) hideInlinePanels();
        if (!event.target.closest('#processLauncherStack')) toggleProcessLauncher(false);
    });"""

new_click_block = """    document.addEventListener('click', (event) => {
        if (!event.target.closest('.quote-request-search-wrap') && customerLookupPanel) customerLookupPanel.hidden = true;
        if (!event.target.closest('[data-inline-suggestions]')) hideInlinePanels();
        if (!event.target.closest('#processLauncherStack')) toggleProcessLauncher(false);
    });
    launcherErrors?.addEventListener('click', () => {
        launcherErrors.hidden = true;
    });"""

if old_click_block in content:
    content = content.replace(old_click_block, new_click_block)
    print("Added click listener.")
else:
    old_crlf = old_click_block.replace('\\n', '\\r\\n')
    if old_crlf in content:
        content = content.replace(old_crlf, new_click_block.replace('\\n', '\\r\\n'))
        print("Added click listener (CRLF).")
    else:
        print("Could not find click listener block.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
