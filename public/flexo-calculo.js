/*
 * DEPRECATED ENTRYPOINT
 *
 * Esta pantalla legacy de flexografia ya no controla la ruta real
 * /calculo-flexografia. La interfaz activa se renderiza desde:
 * public/calculo-flexografia/index.html
 * public/calculo-flexografia/app.js
 * public/calculo-flexografia/styles.css
 *
 * Este archivo se deja unicamente para que cualquier carga accidental
 * exponga una advertencia explicita en consola en lugar de volver a
 * crear una segunda fuente de verdad.
 */

(() => {
    const target = '/calculo-flexografia';
    const message = [
        '[flexo-calculo legacy] Esta ruta ya no es la pantalla activa.',
        `Usa ${target}.`,
        'Fuente real: public/calculo-flexografia/app.js + styles.css'
    ].join(' ');

    try {
        console.warn(message);
    } catch (error) {
        // no-op
    }

    if (window.location.pathname === '/flexo-calculo.html' || window.location.pathname === '/flexo-calculo') {
        window.location.replace(target);
    }
})();
