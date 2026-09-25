// Formato numérico por país (Centroamérica y Norteamérica).
// Compartido por costos, cálculo flexografía y configuración general.
// Los valores siempre se guardan canónicos con punto; esto controla solo la presentación.
const FORMATO_NUMERO_PAISES = [
    { codigo: "es-CR", pais: "Costa Rica" },
    { codigo: "es-NI", pais: "Nicaragua" },
    { codigo: "es-HN", pais: "Honduras" },
    { codigo: "es-SV", pais: "El Salvador" },
    { codigo: "es-GT", pais: "Guatemala" },
    { codigo: "es-PA", pais: "Panamá" },
    { codigo: "es-MX", pais: "México" },
    { codigo: "en-US", pais: "Estados Unidos" },
    { codigo: "en-CA", pais: "Canadá" }
];

let formatoNumeroPaisActual = "es-CR";

function aplicarFormatoNumeroPais(codigo) {
    const elegido = String(codigo || "").trim();
    formatoNumeroPaisActual = FORMATO_NUMERO_PAISES.some((item) => item.codigo === elegido) ? elegido : "es-CR";
    return formatoNumeroPaisActual;
}

function formatoNumeroApp(valor, decimales = 2, opciones = {}) {
    const numeric = Number(valor);
    if (!Number.isFinite(numeric)) return String(valor ?? "");
    const minimo = opciones.minimoDecimales != null ? opciones.minimoDecimales : decimales;
    const maximo = opciones.maximoDecimales != null ? opciones.maximoDecimales : decimales;
    return new Intl.NumberFormat(formatoNumeroPaisActual, {
        minimumFractionDigits: Math.min(minimo, maximo),
        maximumFractionDigits: Math.max(minimo, maximo)
    }).format(numeric);
}